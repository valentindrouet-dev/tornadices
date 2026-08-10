// Moteur TornaDices — simulation à événements datés.
//
// Le temps est virtuel (millisecondes). Chaque étape d'un joueur est un événement
// planifié dans une file de priorité. La table de jeu fait avancer l'horloge au
// rythme réel ; le Laboratoire la fait avancer d'un trait. Mêmes règles, donc les
// statistiques décrivent bien la partie que l'on joue.
//
// Un tour de lot suit toujours le même cycle physique :
//   réflexion → les dés roulent (dureeLancer) → on regarde le résultat
//   (dureeConstat) → le lot traverse jusqu'au voisin (dureePassage).
// Toute combinaison servie est jouée d'office : on ne relance pas par-dessus.

import { makeRng } from './rng.js';
import {
  CARTES_JOURNEE, PROFILS_IA, PROFIL_HUMAIN,
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
    this.transits = [];        // lots en train de traverser la table
    this.compteurLot = 0;
    this.compteurTransit = 0;
    this.evenementsTraites = 0;
    this.onJournal = null;     // crochet UI
    this.onEtatChange = null;
    this.onMouvement = null;   // (idDepart, idArrivee, motif, lot, duree)
    this.onCombinaison = null; // (idJoueur, idCombo) — dès que les dés la montrent

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
        vitesse: Math.max(60, this.rng.normal(base.reflexe, base.ecartReflexe, 80)),
        adresse: Math.min(0.95, Math.max(0.05, base.adresse + this.rng.normal(0, 0.06))),
        esquive: Math.min(0.95, Math.max(0.05, base.esquive + this.rng.normal(0, 0.06))),
        eveille: false,
        lots: [],
        lancersLot: 0,
        attente: null,       // état d'attente pour un joueur humain
        planifie: false,
        fige: false,         // une étape est en cours, le joueur ne peut rien faire
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
    const cartes = ids
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
      j.fige = false;
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
      des: Array.from({ length: this.cfg.desParLot }, () => ({ sym: null, verrou: false, roule: false })),
      lance: false,
      roulantJusqua: 0,
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
  jouerJusquAuBout(maxEvenements = 600000) {
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
    switch (ev.type) {
      case 'action': {
        const j = this.joueurs[ev.pid];
        j.planifie = false;
        if (!j.lots.length || j.fige) return;
        if (j.type === 'humain') { this._attenteHumaine(j); return; }
        this._decisionIA(j);
        return;
      }
      case 'finLancer': {
        const j = this.joueurs[ev.pid];
        if (!j.lots.length || j.lots[0].id !== ev.lotId) return;
        this._finLancer(j);
        return;
      }
      case 'depart': {
        const j = this.joueurs[ev.pid];
        if (!j.lots.length || j.lots[0].id !== ev.lotId) { j.fige = false; return; }
        this._depart(j, ev.motif, ev.dispo, ev.choix);
        return;
      }
      case 'arrivee':
        this._arrivee(ev.transitId);
        return;
      case 'duel':
        this._resoudreDuel();
        return;
      case 'gardeManche':
        if (ev.manche === this.manche) {
          this._log('Manche interrompue : durée maximale atteinte.', 'systeme');
          this._finManche(null);
        }
        return;
      default:
    }
  }

  /** Rend la main au joueur : l'IA réfléchit, l'humain attend son geste. */
  _planifier(pid) {
    const j = this.joueurs[pid];
    if (j.planifie || j.fige || this.termine || !j.lots.length) return;
    if (j.type === 'humain') { this._attenteHumaine(j); return; }
    j.planifie = true;
    this.file.pousser(this.now + this._tempsReflexion(j), { type: 'action', pid });
  }

  _tempsReflexion(j) {
    const lent = this.passif.lenteur || 1;
    const base = (this.cfg.tempsReflexion ?? 300) * (j.vitesse / (j.profil.reflexe || 800));
    return Math.max(40, this.rng.normal(base * lent, this.cfg.ecartReflexion ?? 120, 40));
  }

  _dureeLancer() {
    const lent = this.passif.lenteur || 1;
    return Math.max(60, (this.cfg.dureeLancer ?? 1000) * lent);
  }

  // ── Dés ─────────────────────────────────────────────────────────────────────
  /** Tire les faces des dés désignés. Les dés bloqués gardent la leur, toujours. */
  _tirerFaces(lot, indices) {
    const faces = this.cfg.faces;
    const bloquant = this.cfg.symboleBloquant || 'x';
    for (let i = 0; i < lot.des.length; i++) {
      const d = lot.des[i];
      if (!d.roule) continue;
      d.sym = faces[this.rng.int(faces.length)];
      d.roule = false;
      if (d.sym === bloquant) d.verrou = true;
    }
    lot.lance = true;
    lot.roulantJusqua = 0;
    void indices;
  }

  _compter(lot) {
    const c = {};
    for (const d of lot.des) if (d.sym && !d.roule) c[d.sym] = (c[d.sym] || 0) + 1;
    return c;
  }

  /** Indices des dés qu'une IA choisit de relancer : elle garde ceux qui servent. */
  _choixDesIA(j, lot) {
    const bloquant = this.cfg.symboleBloquant || 'x';
    const libres = lot.des.map((d, i) => ({ d, i })).filter(({ d }) => !d.verrou);
    if (!lot.lance || j.profil.id === 'hasard') return libres.map(({ i }) => i);

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
    const aRelancer = libres.filter(({ d }) => d.sym !== objectif).map(({ i }) => i);
    return aRelancer.length ? aRelancer : libres.map(({ i }) => i);
  }

  // ── Combinaisons ────────────────────────────────────────────────────────────
  combosDisponibles(j) {
    const lot = j.lots[0];
    if (!lot || !lot.lance || lot.roulantJusqua) return [];
    const c = this._compter(lot);
    const out = [];
    const servie = (requis) => Object.entries(requis).every(([s, n]) => (c[s] || 0) >= n);

    for (const combo of this.cfg.combos) {
      if (!servie(combo.requis)) continue;
      if (combo.face === 'endormie' && j.eveille) continue;
      if (combo.face === 'active' && !j.eveille) continue;
      if (combo.id === 'endormir' && !this._voisinsEveilles(j).length) continue;
      out.push({ id: combo.id, source: 'tornade', combo, obligatoire: !!combo.obligatoire });
    }
    if (this.carte && this.carte.combo) {
      const requis = (this.cfg.combosCartes && this.cfg.combosCartes[this.carte.combo.id])
        || this.carte.combo.requis;
      if (servie(requis)) {
        out.push({
          id: this.carte.combo.id, source: 'journee',
          combo: { ...this.carte.combo, requis }, obligatoire: true,
        });
      }
    }
    return out;
  }

  /**
   * Toute combinaison servie est jouée : on ne relance jamais par-dessus.
   * Reste à savoir laquelle, quand plusieurs sortent au même jet.
   */
  _comboAJouer(dispo) {
    if (!dispo.length) return null;
    const carte = dispo.find((d) => d.source === 'journee');
    if (carte) return carte;                                   // la carte du jour prime
    const attrape = dispo.find((d) => d.obligatoire && d.id !== 'blocage');
    if (attrape) return attrape;                               // puis l'attrape
    const autres = dispo.filter((d) => d.id !== 'blocage');
    if (autres.length) {
      autres.sort((a, b) => this._noterCombo(b) - this._noterCombo(a));
      return autres[0];
    }
    return dispo.find((d) => d.id === 'blocage') || null;       // bloqué en dernier
  }

  _noterCombo(d) {
    return { vache: 100, reveil: 90, endormir: 70 }[d.id] ?? 10;
  }

  _voisinsEveilles(j) { return this._voisinsDirects(j).filter((v) => v.eveille); }

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

  // ── Cycle d'un lancer ───────────────────────────────────────────────────────
  /** L'IA décide : relancer une partie des dés, ou rendre le lot. */
  _decisionIA(j) {
    const lot = j.lots[0];
    const p = j.profil;
    if (lot.lance) {
      // Stop ou encore : le danger vient du joueur précédent s'il tient un lot.
      const menace = this._precedent(j).lots.length > 0 ? p.peur : 0;
      const seuil = Math.max(1, this.rng.normal(p.lancersAvantPasse, p.ecartLancers, 1));
      const tension = (j.lancersLot / seuil) * (1 + menace * 0.35);
      if (tension >= 1) { this._demanderDepart(j, 'passe'); return; }
      if (lot.des.every((d) => d.verrou)) { this._demanderDepart(j, 'passe'); return; }
    }
    this._demarrerLancer(j, this._choixDesIA(j, lot));
  }

  /** Met les dés désignés en rotation ; le résultat tombera plus tard. */
  _demarrerLancer(j, indices) {
    const lot = j.lots[0];
    if (!lot || j.fige || lot.roulantJusqua) return false;
    const premier = !lot.lance;
    const libres = lot.des
      .map((d, i) => i)
      .filter((i) => !lot.des[i].verrou && (premier || !indices || !indices.length || indices.includes(i)));
    if (!libres.length) { this._demanderDepart(j, 'passe'); return false; }

    const tauxErreur = (this.passif.erreur ?? 0) + (this.cfg.tauxErreur ?? 0) + (j.profil.erreur ?? 0) * 0.5;
    if (!premier && lot.des.some((d) => d.verrou) && this.rng() < tauxErreur) {
      j.stats.erreurs++;
      this._log(`${j.nom} relance un X par mégarde — il passe son lot.`, 'incident', j.id);
      if (this.rng() < (this.cfg.penaliteErreurAdverse ?? 0)) this._jetonAuxAdverses(j);
      this._demanderDepart(j, 'passe');
      return false;
    }

    // « Journée de la tranquillité » : un seul dé à la fois.
    let cible = libres;
    if (this.passif.unParUn && lot.lance && cible.length > 1) cible = [cible[0]];
    for (const i of cible) lot.des[i].roule = true;

    const duree = this._dureeLancer();
    lot.roulantJusqua = this.now + duree;
    j.attente = null;
    j.lancersLot++;
    j.stats.lancers++;
    this.file.pousser(lot.roulantJusqua, { type: 'finLancer', pid: j.id, lotId: lot.id });
    if (this.onEtatChange) this.onEtatChange();
    return true;
  }

  /** Les dés se posent : on lit le résultat. */
  _finLancer(j) {
    const lot = j.lots[0];
    this._tirerFaces(lot);

    // On signale toute combinaison visible, même injouable : c'est ce qui allume
    // les alertes autour de la table.
    if (this.onCombinaison) {
      const compte = this._compter(lot);
      for (const combo of this.cfg.combos) {
        if (Object.entries(combo.requis).every(([sy, n]) => (compte[sy] || 0) >= n)) {
          this.onCombinaison(j.id, combo.id);
        }
      }
    }

    const choisi = this._comboAJouer(this.combosDisponibles(j));
    if (choisi) {
      j.stats.combos[choisi.id] = (j.stats.combos[choisi.id] || 0) + 1;
      this._demanderDepart(j, choisi.id === 'collision' ? 'attrape' : 'combo', choisi);
      return;
    }
    this._planifier(j.id);
  }

  /**
   * Le lot va partir. On laisse d'abord le temps de voir le résultat : sans cette
   * pause, les dés changent de main avant qu'on ait compris ce qui s'est passé.
   */
  _demanderDepart(j, motif, dispo = null, choix = null) {
    const lot = j.lots[0];
    if (!lot || j.fige) return;
    j.fige = true;
    j.attente = null;
    const constat = motif === 'interruption' ? 0 : (this.cfg.dureeConstat ?? 900);
    this.file.pousser(this.now + constat, {
      type: 'depart', pid: j.id, lotId: lot.id, motif, dispo, choix,
    });
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Le lot quitte la main du joueur et traverse la table. */
  _depart(j, motif, dispo, choix) {
    const lot = j.lots.shift();
    j.fige = false;
    j.lancersLot = 0;
    j.attente = null;
    if (!j.lots.length) j.stats.tempsAvecLot += this.now - j._lotDepuis;
    if (motif !== 'combo') j.stats.passes++;

    for (const d of lot.des) { d.verrou = false; d.roule = false; }
    lot.lance = false;
    lot.roulantJusqua = 0;

    const q = this._suivant(j);
    const duree = Math.max(0, this.cfg.dureePassage ?? 1000);
    const transit = {
      id: ++this.compteurTransit, lot, de: j.id, vers: q.id, motif,
      depart: this.now, arrivee: this.now + duree,
    };
    this.transits.push(transit);
    this.file.pousser(transit.arrivee, { type: 'arrivee', transitId: transit.id });
    if (this.onMouvement) this.onMouvement(j.id, q.id, motif, lot, duree);

    if (motif === 'passe') this._log(`${j.nom} passe son lot à ${q.nom}.`, 'passe', j.id);
    else if (motif === 'attrape') this._tenterAttrape(j, q);
    else if (motif === 'combo' && dispo) this._effetCombo(j, dispo, choix || {});

    if (!this.termine && j.lots.length) this._planifier(j.id);
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Le lot atteint son destinataire. */
  _arrivee(transitId) {
    const k = this.transits.findIndex((t) => t.id === transitId);
    if (k < 0) return;
    const t = this.transits.splice(k, 1)[0];
    const q = this.joueurs[t.vers];
    if (!q.lots.length) q._lotDepuis = this.now;
    q.lots.push(t.lot);
    this._planifier(q.id);
    if (this.onEtatChange) this.onEtatChange();
  }

  // ── Attrape ─────────────────────────────────────────────────────────────────
  _tenterAttrape(j, q) {
    if (!q.lots.length) {
      this._log(`${j.nom} lance son lot vers ${q.nom} — les mains sont vides, pas de contact.`,
        'collision', j.id);
      return;
    }
    j.stats.collisionsTentees++;
    this._log(`${j.nom} tente d’attraper ${q.nom} !`, 'collision', j.id);

    if (j.type === 'humain' || q.type === 'humain') {
      const fenetre = this.cfg.fenetreReflexe ?? 900;
      this.duel = {
        toucheurId: j.id, cibleId: q.id, ouvertA: this.now, fenetre,
        actionToucheur: null, actionCible: null,
      };
      this.file.pousser(this.now + fenetre, { type: 'duel' });
      return;
    }
    this._resoudreAttrape(j, q, null, null);
  }

  _resoudreDuel() {
    if (!this.duel) return;
    const { toucheurId, cibleId, actionToucheur, actionCible } = this.duel;
    this.duel = null;
    this._resoudreAttrape(
      this.joueurs[toucheurId], this.joueurs[cibleId], actionToucheur, actionCible,
    );
  }

  /** Réflexe d'un joueur humain pendant la fenêtre d'attrape. */
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

  _resoudreAttrape(j, q, dtToucheur, dtCible) {
    const fenetre = this.cfg.fenetreReflexe ?? 900;
    let p = j.adresse * (1 - 0.5 * q.esquive) * ((this.cfg.adresseBase ?? 0.55) / 0.55);
    if (dtToucheur != null) p += Math.max(0, 0.45 * (1 - dtToucheur / fenetre));
    else if (j.type === 'humain') p -= 0.35;
    if (dtCible != null) p -= Math.max(0, 0.4 * (1 - dtCible / fenetre));
    p = Math.min(0.97, Math.max(0.02, p));

    if (this.rng() < p) {
      j.stats.collisionsReussies++;
      q.stats.foisTouche++;
      this._log(`Touché ! ${j.nom} accroche ${q.nom}.`, 'touche', j.id);
      // La cible lâche aussitôt le lot qu'elle jouait, sans temps de constat.
      if (q.lots.length) this._demanderDepart(q, 'interruption');
      this._retournerJeton(j, 1, 'collision');
    } else {
      this._log(`Raté — ${q.nom} s’en sort.`, 'collision', q.id);
    }
    if (!this.termine) this._planifier(q.id);
  }

  // ── Effets des combinaisons ─────────────────────────────────────────────────
  _effetCombo(j, dispo, choix = {}) {
    const effet = dispo.source === 'journee' ? dispo.combo.effet : dispo.id;
    switch (effet) {
      case 'reveil':
        j.eveille = true; j.stats.reveils++;
        this._log(`${j.nom} réveille sa Tornade.`, 'combo', j.id);
        break;
      case 'blocage':
        this._log(`${j.nom} est bloqué sur deux X — il rend son lot.`, 'blocage', j.id);
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
        const pref = choix.effetChoisi || (j.eveille ? 'vache' : 'reveil');
        this._effetCombo(j, { id: pref, source: 'tornade', combo: { id: pref } }, choix);
        break;
      }
      default:
        break;
    }
  }

  _choisirEndormi(j) {
    const eveilles = this._voisinsEveilles(j);
    const adverses = eveilles.filter((v) => v.equipe !== j.equipe);
    const pool = adverses.length ? adverses : eveilles;
    if (!pool.length) return null;
    pool.sort((a, b) => (this.equipes[b.equipe]?.retournes || 0) - (this.equipes[a.equipe]?.retournes || 0));
    return pool[0];
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
        `${this._nomEquipe(equipeId)} remporte la manche ${this.manche}`
        + (compte ? ` et prend « ${carte.nom} ».` : ` (${carte ? carte.nom : 'carte'} défaussée).`),
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
    this.transits = [];
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
    this.transits = [];
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
    if (!lot || j.fige || lot.roulantJusqua) { j.attente = null; return; }
    j.attente = {
      peutLancer: true,
      peutPasser: !!lot.lance,
      indicesLibres: lot.des.map((d, i) => i).filter((i) => !lot.des[i].verrou),
    };
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Relance les dés désignés (tous si `indices` est absent). */
  lancerHumain(pid, indices = null) {
    const j = this.joueurs[pid];
    if (this.termine || j.type !== 'humain' || !j.lots.length || j.fige) return false;
    if (j.lots[0].roulantJusqua) return false;
    return this._demarrerLancer(j, indices);
  }

  /** Rend le lot au voisin. */
  passerHumain(pid) {
    const j = this.joueurs[pid];
    if (this.termine || j.type !== 'humain' || !j.lots.length || j.fige) return false;
    if (j.lots[0].roulantJusqua || !j.lots[0].lance) return false;
    this._demanderDepart(j, 'passe');
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
