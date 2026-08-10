// Moteur TornaDices — simulation à événements datés.
//
// Le temps est virtuel (millisecondes). Chaque action de joueur est un événement
// planifié dans une file de priorité. La table de jeu fait avancer l'horloge au
// rythme réel ; le Laboratoire la fait avancer d'un trait. Mêmes règles, donc les
// statistiques décrivent bien la partie que l'on joue.

import { makeRng } from './rng.js';
import {
  CARTES_JOURNEE, COMBOS_TORNADE, PROFILS_IA, PROFIL_HUMAIN,
  placement, infosMiseEnPlace,
} from './config.js';

const CARTES_PAR_ID = Object.fromEntries(CARTES_JOURNEE.map((c) => [c.id, c]));

// ── File de priorité (tas binaire) ────────────────────────────────────────────
class FileEvenements {
  constructor() { this.a = []; this.seq = 0; }
  get taille() { return this.a.length; }
  pousser(t, ev) {
    ev._t = t; ev._s = this.seq++;
    const a = this.a;
    a.push(ev);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.avant(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break;
    }
  }
  avant(x, y) { return x._t !== y._t ? x._t < y._t : x._s < y._s; }
  get tete() { return this.a[0]; }
  retirer() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const g = 2 * i + 1, d = g + 1;
        let m = i;
        if (g < a.length && this.avant(a[g], a[m])) m = g;
        if (d < a.length && this.avant(a[d], a[m])) m = d;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function statsVides() {
  return {
    lancers: 0, passes: 0, combos: {}, collisionsTentees: 0, collisionsReussies: 0,
    foisTouche: 0, foisEndormi: 0, jetonsRetournes: 0, erreurs: 0,
    tempsAvecLot: 0, reveils: 0, jetonsParSource: {},
  };
}

export class Moteur {
  /**
   * @param {object} cfg  configuration complète (voir config.js)
   * @param {Array}  specJoueurs  [{nom, type:'humain'|'ia', profil:'equilibre', equipe?}]
   * @param {string|number} graine
   */
  constructor(cfg, specJoueurs, graine) {
    this.cfg = cfg;
    this.graine = graine;
    this.rng = makeRng(graine);
    this.now = 0;
    this.file = new FileEvenements();
    this.journal = [];
    this.termine = false;
    this.vainqueur = null;
    this.raisonFin = null;
    this.manche = 0;
    this.sens = 1; // +1 = horaire
    this.duel = null;
    this.compteurLot = 0;
    this.evenementsTraites = 0;
    this.onJournal = null;    // crochet UI
    this.onEtatChange = null;
    this.onMouvement = null;  // (idDepart, idArrivee, motif) — pour animer le lot
    this.onCombinaison = null; // (idJoueur, idCombo) — signalé dès que les dés la montrent

    this._initJoueurs(specJoueurs);
    this._initEquipes();
    this._initPioche();
    this.statsManches = [];
    this._demarrerManche(true);
  }

  // ── Mise en place ───────────────────────────────────────────────────────────
  _initJoueurs(spec) {
    const n = this.cfg.nbJoueurs;
    const sieges = placement(n);
    this.joueurs = [];
    for (let i = 0; i < n; i++) {
      const s = spec[i] || {};
      const base = s.type === 'humain'
        ? PROFIL_HUMAIN
        : (PROFILS_IA[s.profil] || PROFILS_IA.equilibre);
      const equipe = s.equipe || sieges[i];
      this.joueurs.push({
        id: i,
        nom: s.nom || `Joueur ${i + 1}`,
        siege: i,
        equipe,
        type: s.type === 'humain' ? 'humain' : 'ia',
        profil: { ...base },
        // Chaque joueur a sa propre vitesse et son adresse, tirées autour du profil.
        vitesse: Math.max(120, this.rng.normal(base.reflexe, base.ecartReflexe, 150)),
        adresse: Math.min(0.95, Math.max(0.05, base.adresse + this.rng.normal(0, 0.06))),
        esquive: Math.min(0.95, Math.max(0.05, base.esquive + this.rng.normal(0, 0.06))),
        eveille: false,
        lots: [],
        lancersLot: 0,
        patienceLot: 0,
        attente: null,       // état d'attente pour un joueur humain
        planifie: false,
        stats: statsVides(),
        _lotDepuis: 0,
      });
    }
  }

  _initEquipes() {
    const mep = infosMiseEnPlace(this.cfg.nbJoueurs);
    const presentes = new Set(this.joueurs.map((j) => j.equipe));
    this.equipes = {};
    for (const id of ['bleu', 'jaune', 'vert']) {
      if (!presentes.has(id)) continue;
      this.equipes[id] = {
        id,
        jetons: id === 'vert'
          ? (this.cfg.jetonsVert ?? mep.jetonsVert)
          : (this.cfg.jetons ?? mep.jetons),
        retournes: 0,
        cartes: [],
      };
    }
  }

  _initPioche() {
    const ids = this.cfg.cartes && this.cfg.cartes.length
      ? this.cfg.cartes.slice()
      : CARTES_JOURNEE.map((c) => c.id);
    let cartes = ids
      .map((id) => CARTES_PAR_ID[id])
      .filter(Boolean)
      .filter((c) => !c.minJoueurs || this.cfg.nbJoueurs >= c.minJoueurs);
    const chauffe = cartes.filter((c) => c.toujoursPremiere);
    let reste = cartes.filter((c) => !c.toujoursPremiere);
    if (this.cfg.melangerCartes !== false) reste = this.rng.shuffle(reste);
    this.pioche = [...chauffe, ...reste];
    if (!this.pioche.length) this.pioche = [CARTES_PAR_ID.chauffe];
  }

  // ── Manches ─────────────────────────────────────────────────────────────────
  _demarrerManche(premiere = false) {
    this.manche += 1;
    if (!premiere) this.sens = -this.sens;
    this.debutManche = this.now;
    this.carte = this.pioche[0] || null;
    this.passif = (this.carte && this.carte.effetPassif) || {};

    for (const j of this.joueurs) {
      j.eveille = false;
      j.lots = [];
      j.lancersLot = 0;
      j.attente = null;
      j.planifie = false;
    }
    for (const e of Object.values(this.equipes)) e.retournes = 0;

    const porteurs = this._porteursDeDepart();
    for (const pid of porteurs) {
      this.joueurs[pid]._lotDepuis = this.now;
      this.joueurs[pid].lots.push(this._nouveauLot());
    }

    this._log(
      `Manche ${this.manche} — ${this.carte ? this.carte.nom : 'sans carte'} · sens ${this.sens > 0 ? 'horaire' : 'antihoraire'}`,
      'manche',
    );

    for (const pid of porteurs) this._planifier(pid);

    // Garde-fou : une manche qui s'éternise est arrêtée d'office.
    this.file.pousser(this.now + (this.cfg.dureeMaxManche || 900000), {
      type: 'gardeManche', manche: this.manche,
    });
  }

  // Manche 1 : les Jaunes (et le Vert s'il existe) prennent les lots.
  // Manches suivantes : les perdants de la manche précédente — ou les gagnants
  // si la « Journée de la triche » était en jeu.
  _porteursDeDepart() {
    const nbLots = this.cfg.lots;
    let candidats;
    if (this._prochainsPorteurs && this._prochainsPorteurs.length) {
      candidats = this._prochainsPorteurs;
      this._prochainsPorteurs = null;
    } else {
      candidats = this.joueurs
        .filter((j) => j.equipe === 'jaune' || j.equipe === 'vert')
        .map((j) => j.id);
    }
    if (!candidats.length) candidats = this.joueurs.map((j) => j.id);
    // On répartit les lots le plus loin possible les uns des autres.
    const out = [];
    const pas = candidats.length / nbLots;
    for (let k = 0; k < nbLots; k++) out.push(candidats[Math.floor(k * pas) % candidats.length]);
    return out;
  }

  _nouveauLot() {
    return {
      id: ++this.compteurLot,
      des: Array.from({ length: this.cfg.desParLot }, () => ({ sym: null, verrou: false })),
      lance: false,
    };
  }

  // ── Boucle d'exécution ──────────────────────────────────────────────────────
  /** Avance jusqu'à l'instant t (table de jeu, temps réel). */
  avancerJusqua(t) {
    let garde = 0;
    while (!this.termine && this.file.taille && this.file.tete._t <= t) {
      if (++garde > 20000) break;
      const ev = this.file.retirer();
      this.now = ev._t;
      this._traiter(ev);
    }
    if (!this.termine) this.now = Math.max(this.now, t);
    return this.termine;
  }

  /** Déroule la partie jusqu'à son terme (Laboratoire). */
  jouerJusquAuBout(maxEvenements = 400000) {
    let n = 0;
    while (!this.termine && this.file.taille && n < maxEvenements) {
      const ev = this.file.retirer();
      this.now = ev._t;
      this._traiter(ev);
      n++;
    }
    if (!this.termine) this._finPartie(null, 'limite');
    return this.resultat();
  }

  _traiter(ev) {
    this.evenementsTraites++;
    if (this.termine) return;
    if (ev.type === 'action') {
      const j = this.joueurs[ev.pid];
      j.planifie = false;
      if (!j.lots.length) return;
      if (j.type === 'humain') { this._attenteHumaine(j); return; }
      this._tourIA(j);
    } else if (ev.type === 'duel') {
      this._resoudreDuel(true);
    } else if (ev.type === 'gardeManche') {
      if (ev.manche === this.manche && !this.termine) {
        this._log('Manche interrompue : durée maximale atteinte.', 'systeme');
        this._finManche(null);
      }
    }
  }

  _planifier(pid) {
    const j = this.joueurs[pid];
    if (j.planifie || this.termine || !j.lots.length) return;
    if (j.type === 'humain') { this._attenteHumaine(j); return; }
    j.planifie = true;
    this.file.pousser(this.now + this._delaiAction(j), { type: 'action', pid });
  }

  _delaiAction(j) {
    const lent = this.passif.lenteur || 1;
    const base = this.cfg.tempsLancer * (j.vitesse / (j.profil.reflexe || 800));
    return Math.max(80, this.rng.normal(base * lent, this.cfg.ecartTempsLancer, 80));
  }

  // ── Dés ─────────────────────────────────────────────────────────────────────
  /**
   * Relance les dés désignés. `indices` vide ou absent = tous les dés libres.
   * Les dés portant le symbole bloquant restent sur leur face, toujours.
   */
  _lancerDes(lot, indices = null, unSeul = false) {
    const faces = this.cfg.faces;
    const bloquant = this.cfg.symboleBloquant || 'x';
    let cible = lot.des
      .map((d, i) => ({ d, i }))
      .filter(({ d, i }) => !d.verrou && (!indices || !indices.length || indices.includes(i)))
      .map(({ d }) => d);
    // « Journée de la tranquillité » : un seul dé à la fois.
    if (unSeul && lot.lance && cible.length > 1) cible = [this._pireDe(lot, cible)];
    for (const d of cible) d.sym = faces[this.rng.int(faces.length)];
    lot.lance = true;
    for (const d of lot.des) if (d.sym === bloquant) d.verrou = true;
    return cible.length;
  }

  // Dé le moins utile : celui dont le symbole est le plus isolé sur le lot.
  _pireDe(lot, parmi = null) {
    const libres = (parmi || lot.des.filter((d) => !d.verrou));
    const compte = this._compter(lot);
    let pire = libres[0], score = Infinity;
    for (const d of libres) {
      const s = d.sym ? compte[d.sym] || 0 : -1;
      if (s < score) { score = s; pire = d; }
    }
    return pire;
  }

  /**
   * Dés qu'une IA choisit de relancer : elle garde ceux qui servent son objectif
   * du moment et rejette les autres. Les dés bloqués ne sont jamais du lot.
   */
  _choixDesIA(j, lot) {
    const bloquant = this.cfg.symboleBloquant || 'x';
    const libres = lot.des.map((d, i) => ({ d, i })).filter(({ d }) => !d.verrou);
    if (!lot.lance || j.profil.id === 'hasard') return libres.map(({ i }) => i);

    // Poids de chaque symbole selon l'état de la Tornade du joueur.
    const poids = j.eveille
      ? { vache: 1, eclair: 0.62, zzz: 0.5, tornade: 0.12 }
      : { tornade: 1, eclair: 0.62, zzz: 0.5, vache: 0.15 };
    const compte = this._compter(lot);
    let objectif = null, meilleur = -1;
    for (const [sym, p] of Object.entries(poids)) {
      if (sym === bloquant) continue;
      const note = p * ((compte[sym] || 0) + 0.05);
      if (note > meilleur) { meilleur = note; objectif = sym; }
    }
    // On relance tout ce qui ne va pas dans le sens de l'objectif.
    const aRelancer = libres.filter(({ d }) => d.sym !== objectif).map(({ i }) => i);
    return aRelancer.length ? aRelancer : libres.map(({ i }) => i);
  }

  _compter(lot) {
    const c = {};
    for (const d of lot.des) if (d.sym) c[d.sym] = (c[d.sym] || 0) + 1;
    return c;
  }

  // ── Combinaisons disponibles ────────────────────────────────────────────────
  combosDisponibles(j) {
    const lot = j.lots[0];
    if (!lot || !lot.lance) return [];
    const c = this._compter(lot);
    const out = [];
    const satisfait = (requis) => Object.entries(requis).every(([s, n]) => (c[s] || 0) >= n);

    for (const combo of this.cfg.combos) {
      if (!satisfait(combo.requis)) continue;
      if (combo.face === 'endormie' && j.eveille) continue;
      if (combo.face === 'active' && !j.eveille) continue;
      if (combo.id === 'endormir' && !this._voisinsEveilles(j).length) continue;
      out.push({ id: combo.id, source: 'tornade', combo, obligatoire: !!combo.obligatoire });
    }
    if (this.carte && this.carte.combo) {
      // Le Laboratoire peut redéfinir l'exigence d'une carte sans toucher au reste.
      const requis = (this.cfg.combosCartes && this.cfg.combosCartes[this.carte.combo.id])
        || this.carte.combo.requis;
      if (satisfait(requis)) {
        out.push({
          id: this.carte.combo.id, source: 'journee',
          combo: { ...this.carte.combo, requis }, obligatoire: false,
        });
      }
    }
    return out;
  }

  _voisinsEveilles(j) {
    return this._voisinsDirects(j).filter((v) => v.eveille);
  }

  _voisinsDirects(j) {
    const n = this.joueurs.length;
    return [this.joueurs[(j.siege + 1) % n], this.joueurs[(j.siege - 1 + n) % n]];
  }

  _suivant(j) {
    const n = this.joueurs.length;
    return this.joueurs[(j.siege + this.sens + n) % n];
  }

  _precedent(j) {
    const n = this.joueurs.length;
    return this.joueurs[(j.siege - this.sens + n) % n];
  }

  // ── Tour d'une IA ───────────────────────────────────────────────────────────
  // Un événement = un lancer. La décision qui suit est instantanée : c'est le
  // jet de dés qui coûte du temps, pas le fait de regarder le résultat.
  _tourIA(j) {
    this._effectuerLancer(j);
  }

  _effectuerLancer(j, indices = null) {
    const lot = j.lots[0];
    const premier = !lot.lance;
    // Garde-fou : plus aucun dé libre et aucune combinaison obligatoire — on rend le lot.
    if (!premier && lot.des.every((d) => d.verrou)) { this._passerLot(j); return; }
    const tauxErreur = (this.passif.erreur ?? 0) + (this.cfg.tauxErreur ?? 0) + (j.profil.erreur ?? 0) * 0.5;

    // Incident fâcheux : relancer un X par mégarde coûte le lot.
    if (!premier && lot.des.some((d) => d.verrou) && this.rng() < tauxErreur) {
      j.stats.erreurs++;
      this._log(`${j.nom} relance un X par mégarde — il passe son lot.`, 'incident', j.id);
      if (this.rng() < (this.cfg.penaliteErreurAdverse ?? 0)) this._jetonAuxAdverses(j);
      this._passerLot(j);
      return;
    }

    const choixDes = indices || (j.type === 'humain' ? null : this._choixDesIA(j, lot));
    this._lancerDes(lot, choixDes, !!this.passif.unParUn);
    j.lancersLot++;
    j.stats.lancers++;

    // On signale toute combinaison visible sur les dés, même celle que le joueur
    // ne peut pas jouer : c'est ce qui allume les alertes de la table. Les
    // combinaisons obligatoires se résolvent aussitôt, sans cela on ne les
    // verrait jamais passer.
    if (this.onCombinaison) {
      const compte = this._compter(lot);
      for (const combo of this.cfg.combos) {
        if (Object.entries(combo.requis).every(([sy, n]) => (compte[sy] || 0) >= n)) {
          this.onCombinaison(j.id, combo.id);
        }
      }
    }

    const dispo = this.combosDisponibles(j);
    // Une combinaison de carte Journée l'emporte sur une combinaison obligatoire :
    // c'est le seul moyen de voir quatre éclairs avant d'être forcé de passer à trois.
    const carteCombo = dispo.find((d) => d.source === 'journee');
    // Entre « Attrape » et « Bloqué », on préfère celle qui laisse agir le joueur.
    const obligatoires = dispo.filter((d) => d.obligatoire);
    const obligatoire = obligatoires.find((d) => d.id !== 'blocage') || obligatoires[0];
    if (carteCombo && obligatoire) {
      this._appliquerChoix(j, { type: 'combo', comboId: carteCombo.id });
      return;
    }
    if (obligatoire) {
      this._appliquerChoix(j, { type: 'combo', comboId: obligatoire.id });
      return;
    }

    if (j.type === 'humain') { this._attenteHumaine(j); return; }

    const choix = this._politiqueIA(j);
    // Relancer coûte un nouvel événement ; jouer ou passer est immédiat.
    if (choix.type === 'lancer') this._planifier(j.id);
    else this._appliquerChoix(j, choix);
  }

  _politiqueIA(j) {
    const dispo = this.combosDisponibles(j);
    const p = j.profil;

    if (p.id === 'hasard') {
      const options = [...dispo.map((d) => ({ type: 'combo', comboId: d.id })),
        { type: 'lancer' }, { type: 'passer' }];
      return this.rng.pick(options);
    }

    let meilleur = null, meilleureNote = 0;
    for (const d of dispo) {
      const note = this._noterCombo(j, d);
      if (note > meilleureNote) { meilleureNote = note; meilleur = d; }
    }
    if (meilleur) return { type: 'combo', comboId: meilleur.id };

    // Stop ou encore : le danger vient du joueur précédent s'il tient un lot.
    const prec = this._precedent(j);
    const menace = prec.lots.length > 0 ? p.peur : 0;
    const seuil = Math.max(1, this.rng.normal(p.lancersAvantPasse, p.ecartLancers, 1));
    const tension = j.lancersLot / seuil + menace * 0.35 * (j.lancersLot / Math.max(1, seuil));
    if (tension >= 1) return { type: 'passer' };
    return { type: 'lancer' };
  }

  _noterCombo(j, d) {
    const eq = this.equipes[j.equipe];
    const restants = Math.max(0, eq.jetons - eq.retournes);
    switch (d.id) {
      case 'chance': return 1000;
      case 'troupeau': return 200 + (restants <= 2 ? 100 : 0);
      case 'vache': return 120 + (restants <= 1 ? 200 : 0);
      case 'intensive': return 115 + (restants <= 1 ? 200 : 0);
      case 'reveil': return 90;
      case 'vaillants': return 60 + this._coequipiers(j).filter((c) => !c.eveille).length * 25;
      case 'sansVent': return this._meilleureCible(j) ? 80 : 0;
      case 'fatigue': return this._voisinsEveilles(j).length * 45;
      case 'endormir': {
        const cibles = this._voisinsEveilles(j).filter((v) => v.equipe !== j.equipe);
        return cibles.length ? 70 : 20;
      }
      case 'difference': return 85;
      case 'collision': return 50;
      case 'blocage': return 5;
      default: return 10;
    }
  }

  _coequipiers(j) { return this.joueurs.filter((x) => x.equipe === j.equipe && x.id !== j.id); }

  _meilleureCible(j) {
    let best = null;
    for (const e of Object.values(this.equipes)) {
      if (e.id === j.equipe) continue;
      if (e.retournes > 0 && (!best || e.retournes > best.retournes)) best = e;
    }
    return best;
  }

  // ── Application d'un choix (IA ou humain) ───────────────────────────────────
  _appliquerChoix(j, choix) {
    if (!choix || !j.lots.length) return;
    if (choix.type === 'lancer') { this._effectuerLancer(j, choix.indices || null); return; }
    if (choix.type === 'passer') { this._passerLot(j); return; }
    if (choix.type === 'combo') {
      const dispo = this.combosDisponibles(j).find((d) => d.id === choix.comboId);
      if (!dispo) { this._planifier(j.id); return; }
      j.stats.combos[dispo.id] = (j.stats.combos[dispo.id] || 0) + 1;
      // Règle : on passe d'abord son lot, puis on joue l'effet.
      if (dispo.id === 'collision') { this._collision(j); return; }
      if (dispo.id === 'blocage') {
        this._log(`${j.nom} est bloqué sur deux X — il rend son lot.`, 'blocage', j.id);
        this._passerLot(j, true);
        return;
      }
      this._passerLot(j, true);
      this._effetCombo(j, dispo, choix);
    }
  }

  _effetCombo(j, dispo, choix = {}) {
    const effet = dispo.source === 'journee' ? dispo.combo.effet : dispo.id;
    switch (effet) {
      case 'reveil':
        j.eveille = true; j.stats.reveils++;
        this._log(`${j.nom} réveille sa Tornade.`, 'combo', j.id);
        break;
      case 'vache':
        this._retournerJeton(j, 1, 'vache');
        break;
      case 'jeton1':
        this._retournerJeton(j, 1, dispo.id === 'difference' ? 'difference' : 'intensive');
        break;
      case 'jeton2':
        this._retournerJeton(j, 2, 'troupeau');
        break;
      case 'endormir': {
        const cible = choix.cibleId != null
          ? this.joueurs[choix.cibleId]
          : this._choisirEndormi(j);
        if (cible && cible.eveille) {
          cible.eveille = false;
          cible.stats.foisEndormi++;
          this._log(`${j.nom} endort ${cible.nom}.`, 'combo', j.id);
        }
        break;
      }
      case 'endormirVoisins': {
        const noms = [];
        for (const v of this._voisinsDirects(j)) {
          if (v.eveille) { v.eveille = false; v.stats.foisEndormi++; noms.push(v.nom); }
        }
        this._log(`${j.nom} endort ses voisins${noms.length ? ' : ' + noms.join(' et ') : ''}.`, 'combo', j.id);
        break;
      }
      case 'cacherJetonAdverse': {
        const cible = this._meilleureCible(j);
        if (cible) {
          cible.retournes = Math.max(0, cible.retournes - 1);
          this._log(`${j.nom} recache un jeton des ${this._nomEquipe(cible.id)}.`, 'combo', j.id);
        }
        break;
      }
      case 'gagnerManche':
        this._log(`${j.nom} sort la combinaison de la carte — la manche est remportée sur-le-champ !`, 'combo', j.id);
        this._finManche(j.equipe);
        return;
      case 'reveilEquipe': {
        let n = 0;
        for (const c of this.joueurs) if (c.equipe === j.equipe && !c.eveille) { c.eveille = true; n++; }
        this._log(`${j.nom} réveille toute son équipe (${n} Tornade${n > 1 ? 's' : ''}).`, 'combo', j.id);
        break;
      }
      case 'auChoix': {
        // « Journée de la différence » : on rejoue l'effet le plus utile du moment.
        const options = [];
        if (!j.eveille) options.push('reveil');
        else options.push('vache');
        if (this._voisinsEveilles(j).filter((v) => v.equipe !== j.equipe).length) options.push('endormir');
        const pref = choix.effetChoisi && options.includes(choix.effetChoisi)
          ? choix.effetChoisi
          : (j.eveille ? 'vache' : 'reveil');
        this._effetCombo(j, { id: pref, source: 'tornade', combo: { id: pref } }, choix);
        break;
      }
      default:
        break;
    }
    if (!this.termine) this._planifier(j.id);
  }

  _choisirEndormi(j) {
    const eveilles = this._voisinsEveilles(j);
    const adverses = eveilles.filter((v) => v.equipe !== j.equipe);
    const pool = adverses.length ? adverses : eveilles;
    if (!pool.length) return null;
    // On vise l'équipe la plus avancée.
    pool.sort((a, b) => (this.equipes[b.equipe]?.retournes || 0) - (this.equipes[a.equipe]?.retournes || 0));
    return pool[0];
  }

  _nomEquipe(id) {
    return { bleu: 'Bleus', jaune: 'Jaunes', vert: 'Vert' }[id] || id;
  }

  _retournerJeton(j, n = 1, source = 'vache') {
    const eq = this.equipes[j.equipe];
    const avant = eq.retournes;
    eq.retournes = Math.min(eq.jetons, eq.retournes + n);
    const gagnes = eq.retournes - avant;
    j.stats.jetonsRetournes += gagnes;
    if (gagnes > 0) {
      j.stats.jetonsParSource[source] = (j.stats.jetonsParSource[source] || 0) + gagnes;
      this._log(
        `${j.nom} retourne ${gagnes} jeton${gagnes > 1 ? 's' : ''} — ${this._nomEquipe(j.equipe)} ${eq.retournes}/${eq.jetons}.`,
        'jeton', j.id,
      );
    }
    if (eq.retournes >= eq.jetons) this._finManche(j.equipe);
  }

  _jetonAuxAdverses(j) {
    for (const e of Object.values(this.equipes)) {
      if (e.id === j.equipe) continue;
      e.retournes = Math.min(e.jetons, e.retournes + 1);
      if (e.retournes >= e.jetons) { this._finManche(e.id); return; }
    }
    this._log(`Incident : les équipes adverses de ${j.nom} retournent un jeton.`, 'incident', j.id);
  }

  // ── Passage du lot et collisions ────────────────────────────────────────────
  _passerLot(j, silencieux = false) {
    if (!j.lots.length) return;
    const lot = j.lots.shift();
    if (!j.lots.length) j.stats.tempsAvecLot += this.now - j._lotDepuis;
    j.stats.passes++;
    j.lancersLot = 0;
    j.attente = null;
    for (const d of lot.des) { d.verrou = false; }
    lot.lance = false;
    const q = this._suivant(j);
    if (!q.lots.length) q._lotDepuis = this.now;
    q.lots.push(lot);
    if (this.onMouvement) this.onMouvement(j.id, q.id, 'passe', lot);
    if (!silencieux) this._log(`${j.nom} passe son lot à ${q.nom}.`, 'passe', j.id);
    this._planifier(q.id);
    if (j.lots.length) this._planifier(j.id);
  }

  _collision(j) {
    const q = this._suivant(j);
    j.stats.combos.collision = j.stats.combos.collision || 0;
    const lot = j.lots.shift();
    if (!j.lots.length) j.stats.tempsAvecLot += this.now - j._lotDepuis;
    for (const d of lot.des) d.verrou = false;
    lot.lance = false;
    if (!q.lots.length) q._lotDepuis = this.now;
    q.lots.push(lot);
    if (this.onMouvement) this.onMouvement(j.id, q.id, 'attrape', lot);
    j.lancersLot = 0;
    j.attente = null;

    if (q.lots.length <= 1) {
      // q ne tenait rien avant de recevoir : pas de collision possible.
      this._log(`${j.nom} passe son lot à ${q.nom} — pas de contact.`, 'collision', j.id);
      this._planifier(q.id);
      if (j.lots.length) this._planifier(j.id);
      return;
    }

    j.stats.collisionsTentees++;
    this._log(`${j.nom} tente de toucher ${q.nom} !`, 'collision', j.id);

    if (j.type === 'humain' || q.type === 'humain') {
      this.duel = {
        toucheurId: j.id, cibleId: q.id, ouvertA: this.now,
        fenetre: 900, toucheurPret: j.type !== 'humain', ciblePrete: q.type !== 'humain',
        actionToucheur: null, actionCible: null,
      };
      this.file.pousser(this.now + 900, { type: 'duel' });
      return;
    }
    this._resoudreCollision(j, q, null, null);
  }

  _resoudreDuel(expire = false) {
    if (!this.duel) return;
    const { toucheurId, cibleId, actionToucheur, actionCible } = this.duel;
    this.duel = null;
    this._resoudreCollision(
      this.joueurs[toucheurId], this.joueurs[cibleId], actionToucheur, actionCible,
    );
  }

  /** Réflexe d'un joueur humain pendant la fenêtre de collision. */
  reflexeHumain(pid, action) {
    if (!this.duel) return false;
    const d = this.duel;
    const dt = this.now - d.ouvertA;
    if (pid === d.toucheurId && action === 'toucher' && d.actionToucheur == null) {
      d.actionToucheur = dt; return true;
    }
    if (pid === d.cibleId && action === 'esquiver' && d.actionCible == null) {
      d.actionCible = dt; return true;
    }
    return false;
  }

  _resoudreCollision(j, q, dtToucheur, dtCible) {
    let p = j.adresse * (1 - 0.5 * q.esquive) * (this.cfg.adresseBase / 0.55);
    // Réflexes humains : plus le geste est rapide, plus il pèse.
    if (dtToucheur != null) p += Math.max(0, 0.45 * (1 - dtToucheur / 900));
    else if (j.type === 'humain') p -= 0.35;
    if (dtCible != null) p -= Math.max(0, 0.4 * (1 - dtCible / 900));
    p = Math.min(0.97, Math.max(0.02, p));

    if (this.rng() < p) {
      j.stats.collisionsReussies++;
      q.stats.foisTouche++;
      this._log(`Touché ! ${j.nom} accroche ${q.nom}.`, 'touche', j.id);
      // La cible passe immédiatement le lot qu'elle jouait.
      if (q.lots.length > 1) {
        const enJeu = q.lots.shift();
        for (const d of enJeu.des) d.verrou = false;
        enJeu.lance = false;
        const suiv = this._suivant(q);
        if (!suiv.lots.length) suiv._lotDepuis = this.now;
        suiv.lots.push(enJeu);
        if (this.onMouvement) this.onMouvement(q.id, suiv.id, 'touche', enJeu);
        q.lancersLot = 0;
        q.attente = null;
        this._planifier(suiv.id);
      }
      this._retournerJeton(j, 1, 'collision');
    } else {
      this._log(`Raté — ${q.nom} s’en sort.`, 'collision', q.id);
    }
    if (!this.termine) {
      this._planifier(q.id);
      if (j.lots.length) this._planifier(j.id);
    }
  }

  // ── Fin de manche / de partie ───────────────────────────────────────────────
  _finManche(equipeId) {
    if (this.termine) return;
    const duree = this.now - this.debutManche;
    const carte = this.carte;
    let compte = false;
    if (equipeId && carte && !carte.neCompted) {
      this.equipes[equipeId].cartes.push(carte.id);
      compte = true;
    }
    this.statsManches.push({
      manche: this.manche,
      carte: carte ? carte.id : null,
      vainqueur: equipeId,
      duree,
      compte,
    });
    if (equipeId) {
      this._log(
        `${this._nomEquipe(equipeId)} remporte la manche ${this.manche}` +
        (compte ? ` et prend « ${carte.nom} ».` : ` (${carte ? carte.nom : 'carte'} défaussée).`),
        'manche',
      );
    }

    if (this.pioche.length) this.pioche.shift();

    if (equipeId) {
      const eq = this.equipes[equipeId];
      if (eq.cartes.length >= this.cfg.cartesPourGagner) {
        this._finPartie(equipeId, 'cartes');
        return;
      }
    }
    if (!this.pioche.length) { this._finPartie(this._meneur(), 'pioche'); return; }
    if (this.manche >= (this.cfg.manchesMax || 40)) { this._finPartie(this._meneur(), 'manchesMax'); return; }

    // Répartition des lots pour la manche suivante.
    const triche = carte && carte.effetPassif && carte.effetPassif.gagnantPrendLesDes;
    if (equipeId) {
      this._prochainsPorteurs = triche
        ? this.joueurs.filter((j) => j.equipe === equipeId).map((j) => j.id)
        : this.joueurs.filter((j) => j.equipe !== equipeId).map((j) => j.id);
    } else {
      this._prochainsPorteurs = null;
    }

    // On vide la file : la manche précédente ne doit rien laisser traîner.
    this.file = new FileEvenements();
    this.duel = null;
    this._demarrerManche(false);
  }

  _meneur() {
    let best = null;
    for (const e of Object.values(this.equipes)) {
      if (!best || e.cartes.length > best.cartes.length) best = e;
    }
    return best ? best.id : null;
  }

  _finPartie(equipeId, raison) {
    this.termine = true;
    this.vainqueur = equipeId;
    this.raisonFin = raison;
    this.duree = this.now;
    this._log(
      equipeId
        ? `Fin de partie — ${this._nomEquipe(equipeId)} l’emportent avec ${this.equipes[equipeId].cartes.length} cartes Journée.`
        : 'Fin de partie sans vainqueur.',
      'fin',
    );
    if (this.onEtatChange) this.onEtatChange();
  }

  // ── Interface joueur humain ─────────────────────────────────────────────────
  _attenteHumaine(j) {
    const lot = j.lots[0];
    j.attente = {
      peutLancer: true,
      peutPasser: !!lot.lance,
      combos: lot.lance ? this.combosDisponibles(j) : [],
    };
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Action déclenchée par un joueur humain depuis la table. */
  actionHumaine(pid, choix) {
    const j = this.joueurs[pid];
    if (this.termine || j.type !== 'humain' || !j.lots.length) return false;
    if (this.duel) return false;
    j.attente = null;
    this._appliquerChoix(j, choix);
    if (this.onEtatChange) this.onEtatChange();
    return true;
  }

  // ── Journal & résultat ──────────────────────────────────────────────────────
  _log(texte, type = 'info', pid = null) {
    const e = { t: this.now, texte, type, pid, manche: this.manche };
    this.journal.push(e);
    if (this.journal.length > 400) this.journal.splice(0, this.journal.length - 400);
    if (this.onJournal) this.onJournal(e);
  }

  resultat() {
    return {
      graine: this.graine,
      vainqueur: this.vainqueur,
      raison: this.raisonFin,
      manches: this.manche,
      duree: this.duree ?? this.now,
      equipes: Object.fromEntries(
        Object.entries(this.equipes).map(([k, e]) => [k, { cartes: e.cartes.length, jetons: e.jetons }]),
      ),
      joueurs: this.joueurs.map((j) => ({
        id: j.id, nom: j.nom, equipe: j.equipe, siege: j.siege, type: j.type,
        profil: j.profil.id, stats: j.stats,
      })),
      statsManches: this.statsManches,
    };
  }
}

export function creerMoteur(cfg, specJoueurs, graine) {
  return new Moteur(cfg, specJoueurs, graine);
}
