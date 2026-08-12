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

import { makeRng } from './rng.js?v=1.21';
import {
  CARTES_JOURNEE, PROFILS_IA, PROFIL_HUMAIN, ALERTES, profilIA,
  placement, infosMiseEnPlace, comboServie, exigenceVide, estJoker, remplacements,
} from './config.js?v=1.21';

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
    this.onAnnonce = null;     // (texte, couleur) — bandeau au centre de la table
    this.onJeton = null;       // (idJoueur, equipe, nombre, source) — un jeton est retourné
    this.onFlash = null;       // (type, idJoueur) — reveil | echec | endormi, à souligner
    this.onFinManche = null;   // ({vainqueur, porteursAvant, manche, duree})
    this.onDebutManche = null; // ({manche, carte, porteurs})
    this.transition = null;    // entre deux manches : les dés reviennent au centre

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
      const base = s.type === 'humain' ? PROFIL_HUMAIN : profilIA(s.profil);
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
        departEnAttente: null, // lot déjà engagé vers le voisin
        planifie: false,
        fige: false,         // une étape est en cours, le joueur ne peut rien faire
        stats: statsVides(),
        objectif: null,      // ce que l'IA cherche avec le lot qu'elle tient
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
      j.departEnAttente = null;
      j.objectif = null;
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

    if (this.onDebutManche) {
      this.onDebutManche({ manche: this.manche, carte: this.carte, porteurs, premiere });
    }
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

    // Un joueur ne commence jamais avec deux lots : on prend des porteurs
    // distincts, répartis le plus loin possible les uns des autres.
    const out = [];
    const m = candidats.length;
    const pris = Math.min(nbLots, m);
    for (let k = 0; k < pris; k++) {
      const id = candidats[Math.round((k * m) / pris) % m];
      if (!out.includes(id)) out.push(id);
    }
    // S'il reste des lots à placer, on complète avec les autres joueurs.
    if (out.length < Math.min(nbLots, this.joueurs.length)) {
      for (const j of this.joueurs) {
        if (out.length >= Math.min(nbLots, this.joueurs.length)) break;
        if (!out.includes(j.id)) out.push(j.id);
      }
    }
    return out;
  }

  _nouveauLot() {
    return {
      id: ++this.compteurLot,
      des: Array.from({ length: this.cfg.desParLot }, () => ({
        sym: null,        // null = face « ? », le dé n'a pas encore été lancé
        verrou: false,    // un X ne se relance jamais
        roule: false,     // ce dé est en train de tourner
        finRoule: 0,
      })),
      lance: false,       // tous les dés ont une face et aucun ne tourne
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
        // Si le lot a été poussé de côté entre-temps, ce jet ne compte plus.
        if (j.lots[0] !== ev.lot) return;
        this._finLancer(j, ev.des);
        return;
      }
      case 'depart': {
        const j = this.joueurs[ev.pid];
        if (!j.lots.includes(ev.lot)) {
          // Le lot est déjà parti — poussé, ou envoyé d'avance à l'arrivée d'un
          // autre. On ne dégèle que si rien d'autre n'attend de partir.
          if (j.departEnAttente && j.departEnAttente.lot === ev.lot) j.departEnAttente = null;
          if (!j.departEnAttente) j.fige = false;
          return;
        }
        // Le joueur a pu changer de combinaison pendant le temps de constat :
        // c'est l'attente en cours qui fait foi, pas ce qui était planifié.
        const d = (j.departEnAttente && j.departEnAttente.lot === ev.lot) ? j.departEnAttente : ev;
        this._depart(j, ev.lot, d.motif, d.dispo, d.choix);
        return;
      }
      case 'nouvelleManche':
        this.transition = null;
        this._demarrerManche(false);
        return;
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
  /** Vrai quand tous les dés sont posés : aucune face vide, aucun dé en l'air. */
  _lotPose(lot) { return lot.des.every((d) => d.sym && !d.roule); }

  _desEnLAir(lot) { return lot.des.some((d) => d.roule); }

  /** Pose les dés d'un jet. Les dés bloqués gardent leur face, toujours. */
  _poserDes(lot, indices) {
    const faces = this.cfg.faces;
    const bloquant = this.cfg.symboleBloquant || 'x';
    for (const i of indices) {
      const d = lot.des[i];
      if (!d || !d.roule) continue;
      d.sym = faces[this.rng.int(faces.length)];
      d.roule = false;
      d.finRoule = 0;
      if (d.sym === bloquant) d.verrou = true;
    }
    lot.lance = this._lotPose(lot);
  }

  _compter(lot) {
    const c = {};
    for (const d of lot.des) if (d.sym && !d.roule) c[d.sym] = (c[d.sym] || 0) + 1;
    return c;
  }

  /** Combien de jokers du lot peuvent prendre la place de `sym`. */
  _jokersPour(compte, sym) {
    let n = 0;
    for (const [s, k] of Object.entries(compte)) {
      if (s === sym || !k) continue;
      const peut = remplacements(s);
      if (peut && peut.includes(sym)) n += k;
    }
    return n;
  }

  /** Tirage pondéré parmi des symboles ; un poids nul ne sort jamais. */
  _tirerPondere(poids) {
    const entrees = Object.entries(poids || {}).filter(([, p]) => p > 0);
    if (!entrees.length) return null;
    const total = entrees.reduce((a, [, p]) => a + p, 0);
    let x = this.rng() * total;
    for (const [sym, p] of entrees) { x -= p; if (x <= 0) return sym; }
    return entrees[entrees.length - 1][0];
  }

  /**
   * Ce que l'IA cherche avec ce lot. Le tirage vaut pour toute la possession :
   * changer d'objectif à chaque jet reviendrait à ne rien poursuivre. Il est
   * repris quand la Tornade change d'état, car les objectifs ne sont plus les
   * mêmes une fois réveillé.
   */
  _objectifIA(j, lot) {
    const etat = j.eveille ? 'eveille' : 'endormi';
    const cle = `${lot.id}:${etat}`;
    if (j.objectif && j.objectif.cle === cle) return j.objectif.sym;
    // « Équilibré » emprunte le style d'un autre profil, le temps d'un lot.
    const source = j.profil.styles
      ? (PROFILS_IA[this.rng.pick(j.profil.styles)] || j.profil)
      : j.profil;
    const sym = this._tirerPondere(source.vise && source.vise[etat]);
    j.objectif = { cle, sym, style: source.id };
    return sym;
  }

  /** Le profil qui gouverne le lot en cours — celui emprunté, le cas échéant. */
  _styleCourant(j) {
    const s = j.objectif && j.objectif.style;
    return (s && PROFILS_IA[s]) || j.profil;
  }

  /** Indices des dés qu'une IA choisit de relancer : elle garde ceux qui servent. */
  _choixDesIA(j, lot) {
    const libres = lot.des.map((d, i) => ({ d, i })).filter(({ d }) => !d.verrou);
    if (!lot.lance) return libres.map(({ i }) => i);
    const objectif = this._objectifIA(j, lot);
    if (!objectif) return libres.map(({ i }) => i);

    // Sert l'objectif : le symbole visé, et tout joker capable de le prendre.
    const sert = (d) => d.sym === objectif
      || (estJoker(d.sym) && (remplacements(d.sym) || []).includes(objectif));
    const garde = libres.filter(({ d }) => sert(d));
    const aRelancer = libres.filter(({ d }) => !sert(d));

    // La bévue de l'Idiot : relancer un dé utile, ou garder un dé qui ne l'est pas.
    const bevue = j.profil.bevue || 0;
    if (bevue && this.rng() < bevue) {
      if (garde.length && this.rng() < 0.5) aRelancer.push(this.rng.pick(garde));
      else if (aRelancer.length) aRelancer.splice(this.rng.int(aRelancer.length), 1);
    }

    // Tout garder n'est pas une option : sans relance, le joueur resterait figé.
    return aRelancer.length ? aRelancer.map(({ i }) => i) : libres.map(({ i }) => i);
  }

  // ── Combinaisons ────────────────────────────────────────────────────────────
  combosDisponibles(j) {
    const lot = j.lots[0];
    if (!lot || !this._lotPose(lot)) return [];
    const c = this._compter(lot);
    const out = [];
    // Les jokers prennent la place qui manque ; une exigence vide ne compte pas.
    const servie = (requis) => !exigenceVide(requis) && comboServie(c, requis);

    for (const combo of this.cfg.combos) {
      if (!servie(combo.requis)) continue;
      if (combo.face === 'endormie' && j.eveille) continue;
      if (combo.face === 'active' && !j.eveille) continue;
      if (combo.id === 'endormir' && !this._voisinsEveilles(j).length) continue;
      // On n'attrape que ce qui existe : si le voisin a les mains vides, les
      // trois éclairs ne valent rien et le lot reste en main.
      if (combo.id === 'collision' && !this._suivant(j).lots.length) continue;
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
  _comboAJouer(j, dispo) {
    if (!dispo.length) return null;
    const estEchec = (d) => !!(d.combo && d.combo.echec);
    // Trois jokers passent avant tout : sans cela, le joker n'aurait aucun revers
    // puisqu'il servirait au même jet la combinaison de son choix.
    const bust = dispo.find((d) => estEchec(d) && d.id !== 'blocage');
    if (bust) return bust;
    const carte = dispo.find((d) => d.source === 'journee');
    if (carte) return carte;                                   // la carte du jour prime
    const attrape = dispo.find((d) => d.obligatoire && !estEchec(d));
    if (attrape) return attrape;                               // puis l'attrape
    const autres = dispo.filter((d) => !estEchec(d));
    if (autres.length) {
      autres.sort((a, b) => this._noterCombo(j, b) - this._noterCombo(j, a));
      return autres[0];
    }
    return dispo.find((d) => d.id === 'blocage') || null;       // bloqué en dernier
  }

  /**
   * Entre quelles combinaisons un joueur humain peut trancher. Le joker en sert
   * volontiers plusieurs au même jet : c'est à lui de dire laquelle il joue.
   * Un échec ne se choisit pas, et l'Échec ne se choisit jamais contre mieux.
   */
  _optionsDeChoix(j, dispo) {
    if (j.type !== 'humain' || dispo.length < 2) return null;
    if (dispo.some((d) => d.combo && d.combo.echec)) return null;
    // La combinaison de la carte du jour est jouée d'office : elle vaut mieux que
    // tout ce qu'on pourrait lui préférer, il n'y a pas à hésiter.
    if (dispo.some((d) => d.source === 'journee')) return null;
    const options = dispo.filter((d) => d.id !== 'blocage');
    return options.length > 1 ? options : null;
  }

  /** Le joueur tranche pendant le temps de constat. Sans réponse, le défaut tient. */
  choisirCombo(pid, comboId) {
    const j = this.joueurs[pid];
    const d = j && j.departEnAttente;
    if (!d || !d.options) return false;
    const opt = d.options.find((o) => o.id === comboId);
    if (!opt) return false;
    d.dispo = opt;
    d.motif = opt.id === 'collision' ? 'attrape' : 'combo';
    d.options = null;
    if (this.onEtatChange) this.onEtatChange();
    return true;
  }

  /**
   * Entre deux combinaisons servies au même jet, l'IA joue celle qui va dans son
   * sens : le Pénible endort plutôt que de se réveiller, le Logique fait l'inverse.
   */
  _noterCombo(j, d) {
    const base = { vache: 100, reveil: 90, endormir: 70 }[d.id] ?? 10;
    const sym = { reveil: 'tornade', vache: 'vache', endormir: 'zzz', collision: 'eclair' }[d.id];
    if (!sym || j.type === 'humain') return base;
    const source = this._styleCourant(j);
    const etat = j.eveille ? 'eveille' : 'endormi';
    const gout = (source.vise && source.vise[etat] && source.vise[etat][sym]) || 0;
    return base + gout * 120;
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
    if (this._desEnLAir(lot)) return;      // des dés tournent encore
    if (this._lotPose(lot)) {
      // Stop ou encore : le danger vient du joueur précédent s'il tient un lot.
      const menace = this._precedent(j).lots.length > 0 ? p.peur : 0;
      const seuil = Math.max(1, this.rng.normal(p.lancersAvantPasse, p.ecartLancers, 1));
      const tension = (j.lancersLot / seuil) * (1 + menace * 0.35);
      if (tension >= 1) { this._demanderDepart(j, 'passe'); return; }
      if (lot.des.every((d) => d.verrou)) { this._demanderDepart(j, 'passe'); return; }
    }
    this._demarrerLancer(j, this._choixDesIA(j, lot));
  }

  /**
   * Met en rotation les dés désignés. Chaque dé roule pour son propre compte :
   * on peut en relancer un pendant qu'un autre tourne encore.
   */
  _demarrerLancer(j, indices) {
    const lot = j.lots[0];
    if (!lot || j.fige) return false;
    const premier = lot.des.some((d) => d.sym === null);
    const cible = lot.des
      .map((d, i) => i)
      .filter((i) => {
        const d = lot.des[i];
        if (d.verrou || d.roule) return false;
        if (premier && d.sym === null) return true;   // un lot neuf part en entier
        return !indices || !indices.length || indices.includes(i);
      });
    if (!cible.length) return false;

    // Incident fâcheux : à une vraie table on relance parfois un X sans le vouloir.
    // Impossible à l'écran — l'interface ne laisse pas cliquer un dé figé — donc
    // la mégarde ne concerne que les IA.
    const tauxErreur = (this.passif.erreur ?? 0) + (this.cfg.tauxErreur ?? 0) + (j.profil.erreur ?? 0) * 0.5;
    if (j.type !== 'humain' && !premier && lot.des.some((d) => d.verrou) && this.rng() < tauxErreur) {
      j.stats.erreurs++;
      this._log(`${j.nom} relance un X par mégarde — il passe son lot.`, 'incident', j.id);
      if (this.rng() < (this.cfg.penaliteErreurAdverse ?? 0)) this._jetonAuxAdverses(j);
      this._demanderDepart(j, 'megarde');
      return false;
    }

    // « Journée de la tranquillité » : un seul dé à la fois.
    const lances = (this.passif.unParUn && !premier && cible.length > 1) ? [cible[0]] : cible;
    const duree = this._dureeLancer();
    for (const i of lances) {
      lot.des[i].roule = true;
      lot.des[i].finRoule = this.now + duree;
    }
    lot.lance = false;
    j.attente = null;
    j.lancersLot++;
    j.stats.lancers++;
    this.file.pousser(this.now + duree, {
      type: 'finLancer', pid: j.id, lot, des: lances,
    });
    if (this.onEtatChange) this.onEtatChange();
    return true;
  }

  /** Un jet se pose. Tant qu'un dé tourne encore, rien n'est décidé. */
  _finLancer(j, indices) {
    const lot = j.lots[0];
    this._poserDes(lot, indices);
    if (!this._lotPose(lot)) {
      // D'autres dés sont encore en l'air : on attend qu'ils retombent.
      if (j.type === 'humain') this._attenteHumaine(j);
      return;
    }

    // On signale toute combinaison visible, même injouable : c'est ce qui allume
    // les alertes autour de la table.
    // Le halo autour du joueur annonce ce qui va se produire — donc seulement
    // les combinaisons réellement jouables, pas celles que les dés montrent sans
    // qu'elles puissent servir.
    const dispo = this.combosDisponibles(j);
    if (this.onCombinaison) for (const d of dispo) this.onCombinaison(j.id, d.id);
    const choisi = this._comboAJouer(j, dispo);
    if (choisi) {
      if (choisi.combo && choisi.combo.echec) this._flash('echec', j.id);
      this._demanderDepart(
        j, this._attrapeAuDepart(j, choisi) ? 'attrape' : 'combo', choisi, null,
        this._optionsDeChoix(j, dispo),
      );
      return;
    }
    this._planifier(j.id);
  }

  /**
   * Le lot part-il en tentant d'attraper ? Les trois éclairs, toujours ; et dans
   * le mode sans face éclair, l'échec lui-même — le lot est perdu de toute façon,
   * autant s'en servir pour toucher le voisin, s'il a un lot à se faire prendre.
   */
  _attrapeAuDepart(j, choisi) {
    if (choisi.id === 'collision') return true;
    return this.cfg.attrapeSur === 'echec'
      && choisi.id === 'blocage'
      && this._suivant(j).lots.length > 0;
  }

  /**
   * Le lot va partir. On laisse d'abord le temps de voir le résultat : sans cette
   * pause, les dés changent de main avant qu'on ait compris ce qui s'est passé.
   */
  _demanderDepart(j, motif, dispo = null, choix = null, options = null) {
    const lot = j.lots[0];
    if (!lot || j.fige) return;
    j.fige = true;
    j.attente = null;
    j.departEnAttente = { lot, motif, dispo, choix, options, ouvertA: this.now };
    // Le temps de constat suffit à lire le résultat ; trancher entre plusieurs
    // combinaisons demande un peu plus — ce délai est du temps de jeu lui aussi.
    const constat = motif === 'interruption' ? 0
      : options ? (this.cfg.dureeChoix ?? this.cfg.dureeConstat ?? 900)
        : (this.cfg.dureeConstat ?? 900);
    j.departEnAttente.expire = this.now + constat;
    this.file.pousser(this.now + constat, {
      type: 'depart', pid: j.id, lot, motif, dispo, choix,
    });
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Le lot quitte la main du joueur et traverse la table. */
  _depart(j, lot, motif, dispo, choix) {
    j.departEnAttente = null;
    j.fige = false;
    if (dispo) j.stats.combos[dispo.id] = (j.stats.combos[dispo.id] || 0) + 1;
    const q = this._envoyerLot(j, lot, motif, dispo);
    if (motif === 'combo') j.stats.passes--;   // jouer une combinaison n'est pas rendre le lot

    if (motif === 'attrape') {
      // Variante : les trois éclairs emportent la manche sans même tenter le
      // contact. La partie se joue alors sur la course à l'attrape.
      if (this.cfg.attrapeGagneManche === 'combo') {
        this._log(
          `${j.nom} sort l’attrape — ${this._nomEquipe(j.equipe)} remportent la manche.`,
          'combo', j.id,
        );
        this._annoncer(
          `Attrape — ${this._nomEquipe(j.equipe)} gagnent la manche !`, 'jaune', j.id,
        );
        this._finManche(j.equipe);
      } else {
        this._tenterAttrape(j, q);
      }
    } else if (motif === 'combo' && dispo) this._effetCombo(j, dispo, choix || {});

    if (!this.termine && j.lots.length) this._planifier(j.id);
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Retire le lot de la main du joueur et l'envoie traverser vers son voisin. */
  _envoyerLot(j, lot, motif, dispo = null) {
    const k = j.lots.indexOf(lot);
    if (k >= 0) j.lots.splice(k, 1);
    j.lancersLot = 0;
    j.attente = null;
    j.stats.passes++;
    if (!j.lots.length) j.stats.tempsAvecLot += this.now - j._lotDepuis;

    // Le lot repart vierge : le voisin le recevra faces « ? », à lancer.
    const desFinaux = lot.des.map((d) => d.sym);
    for (const d of lot.des) { d.verrou = false; d.roule = false; d.sym = null; d.finRoule = 0; }
    lot.lance = false;

    const q = this._suivant(j);
    const duree = Math.max(0, this.cfg.dureePassage ?? 1000);
    const transit = {
      id: ++this.compteurTransit, lot, de: j.id, vers: q.id, motif,
      depart: this.now, arrivee: this.now + duree,
    };
    this.transits.push(transit);
    this.file.pousser(transit.arrivee, { type: 'arrivee', transitId: transit.id });
    if (this.onMouvement) {
      this.onMouvement(j.id, q.id, motif, { des: desFinaux.map((sym) => ({ sym })) }, duree);
    }

    this._log(j.nom, 'tour', j.id, {
      des: desFinaux,
      issue: this._issueDuTour(motif, dispo),
      couleur: this._couleurDuTour(motif, dispo),
      reussi: motif === 'combo' && dispo && dispo.id !== 'blocage',
    });
    return q;
  }

  /** Ce que le joueur a obtenu au moment où le lot lui échappe. */
  _issueDuTour(motif, dispo) {
    if (motif === 'interruption') return 'Touché !';
    if (motif === 'attrape' && dispo && dispo.id === 'blocage') return 'Échec — attrape !';
    if (motif === 'passe') return 'Passé';
    if (motif === 'pousse') return 'Poussé';
    if (motif === 'megarde') return 'Mégarde';
    if (motif === 'attrape') return 'Attrape !';
    if (motif === 'combo' && dispo) {
      if (dispo.id === 'blocage') return 'Échec';
      if (dispo.id === 'echecJokers') return 'Trois jokers';
      if (dispo.source === 'journee') return `${this.carte.court} !`;
      const def = this.cfg.combos.find((c) => c.id === dispo.id);
      return `${def ? def.nom : dispo.id} !`;
    }
    return '—';
  }

  /** Couleur de la ligne de journal : celle de la combinaison réalisée. */
  _couleurDuTour(motif, dispo) {
    if (motif === 'interruption') return 'jaune';   // conséquence d'une attrape
    if (motif === 'attrape') return 'jaune';
    if (motif === 'combo' && dispo) {
      if (dispo.source === 'journee') return 'carte';
      return ALERTES[dispo.id] || 'gris';
    }
    return 'gris';                                   // passé, poussé, mégarde
  }

  /** Le lot atteint son destinataire. */
  _arrivee(transitId) {
    const k = this.transits.findIndex((t) => t.id === transitId);
    if (k < 0) return;
    const t = this.transits.splice(k, 1)[0];
    // La manche s'est terminée pendant le vol : le lot n'a plus de raison d'être.
    if (this.termine || this.transition) return;
    const q = this.joueurs[t.vers];

    // Un joueur ne tient jamais deux lots : quand deux se rencontrent, celui
    // qu'il avait en main est poussé aussitôt vers le voisin suivant. Sauf en
    // mode cumulé, où les lots s'empilent et attendent leur tour.
    if (!this.cfg.lotsCumules) {
      if (q.departEnAttente) {
        // Son lot était déjà sur le départ : on le fait partir tout de suite.
        const d = q.departEnAttente;
        this._depart(q, d.lot, d.motif, d.dispo, d.choix);
        if (this.termine || this.transition) return;
      }
      if (q.lots.length) {
        const pousse = q.lots[0];
        for (const d of pousse.des) { d.roule = false; d.finRoule = 0; }
        this._envoyerLot(q, pousse, 'pousse');
      }
    }

    const premier = !q.lots.length;
    if (premier) q._lotDepuis = this.now;
    q.lots.push(t.lot);
    if (premier || !this.cfg.lotsCumules) {
      q.fige = false;
      q.planifie = false;
    }
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
      // Variante : un contact réussi emporte la manche au lieu d'un seul jeton.
      if (this.cfg.attrapeGagneManche === 'touche') {
        this._log(
          `Le contact réussit — ${this._nomEquipe(j.equipe)} remportent la manche.`, 'combo', j.id,
        );
        this._annoncer(
          `Attrape ${q.nom} — ${this._nomEquipe(j.equipe)} gagnent la manche !`, 'jaune', j.id,
        );
        this._finManche(j.equipe);
        return;
      }
      this._annoncer(`Attrape ${q.nom} !`, 'jaune', j.id);
      // La cible lâche aussitôt le lot qu'elle jouait, sans temps de constat.
      if (q.lots.length && !q.fige) this._demanderDepart(q, 'interruption');
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
        this._flash('reveil', j.id);
        this._annoncer('Réveil !', 'bleu', j.id);
        break;
      case 'blocage':
      case 'echecJokers':
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
          this._flash('endormi', cible.id);
          this._annoncer(`Endort ${cible.nom}`, 'violet', j.id);
        }
        break;
      }
      case 'endormirVoisins': {
        const noms = [];
        for (const v of this._voisinsDirects(j)) {
          if (v.eveille) {
            v.eveille = false; v.stats.foisEndormi++; noms.push(v.nom);
            this._flash('endormi', v.id);
          }
        }
        this._annoncer(
          noms.length ? `Endort ${noms.join(' et ')}` : 'Endort ses voisins', 'violet', j.id,
        );
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
      // Le jeton part de la zone du joueur et rejoint le compteur de son équipe.
      if (this.onJeton) this.onJeton(j.id, j.equipe, gagnes, source);
      this._log(
        `${j.nom} retourne ${gagnes} jeton${gagnes > 1 ? 's' : ''} — ${this._nomEquipe(j.equipe)} ${eq.retournes}/${eq.jetons}.`,
        'jeton', j.id,
      );
      this._annoncer(
        `${gagnes > 1 ? gagnes + ' vaches' : 'Vache'} ! `
        + `${this._nomEquipe(j.equipe)} ${eq.retournes}/${eq.jetons}`,
        'vert', j.id,
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
    const porteursAvant = this.joueurs.filter((j) => j.lots.length).map((j) => j.id);
    this.file = new FileEvenements();
    this.duel = null;
    this.transits = [];
    for (const j of this.joueurs) {
      j.lots = []; j.fige = false; j.planifie = false; j.attente = null;
      j.lancersLot = 0; j.departEnAttente = null;
    }

    // Les dés reviennent au centre, puis repartent vers les perdants : ce
    // temps mort est du temps de jeu, comme à une vraie table.
    const dureeTransition = Math.max(0, this.cfg.dureeTransition ?? 3000);
    this.transition = {
      vainqueur: equipeId,
      manche: this.manche,
      prochaine: this.manche + 1,
      debut: this.now,
      fin: this.now + dureeTransition,
      carteSuivante: this.pioche[0] || null,
    };
    if (this.onFinManche) {
      this.onFinManche({
        vainqueur: equipeId, porteursAvant, manche: this.manche,
        duree: dureeTransition, carteSuivante: this.pioche[0] || null,
      });
    }
    this.file.pousser(this.now + dureeTransition, { type: 'nouvelleManche' });
    if (this.onEtatChange) this.onEtatChange();
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
    if (!lot || j.fige) { j.attente = null; return; }
    j.attente = {
      // On peut relancer tout dé libre, y compris pendant qu'un autre tourne.
      indicesLibres: lot.des.map((d, i) => i).filter((i) => !lot.des[i].verrou && !lot.des[i].roule),
      peutPasser: !this._desEnLAir(lot) && this._lotPose(lot),
    };
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Relance les dés désignés (tous si `indices` est absent). */
  lancerHumain(pid, indices = null) {
    const j = this.joueurs[pid];
    if (this.termine || j.type !== 'humain' || !j.lots.length || j.fige) return false;
    const lance = this._demarrerLancer(j, indices);
    if (lance) this._attenteHumaine(j);
    return lance;
  }

  /** Rend le lot au voisin. */
  passerHumain(pid) {
    const j = this.joueurs[pid];
    if (this.termine || j.type !== 'humain' || !j.lots.length || j.fige) return false;
    const lot = j.lots[0];
    if (this._desEnLAir(lot) || !this._lotPose(lot)) return false;
    this._demanderDepart(j, 'passe');
    return true;
  }

  // ── Journal & résultat ──────────────────────────────────────────────────────
  /**
   * Un moment qui compte. `pid` désigne le joueur concerné : l'annonce s'affiche
   * au-dessus de sa zone de jeu, d'où le texte sans son nom — on le lit dessous.
   */
  _annoncer(texte, couleur = 'bleu', pid = null) {
    if (this.onAnnonce) this.onAnnonce(texte, couleur, pid);
  }

  /** Un moment à souligner d'un éclat de couleur. L'affichage décide du reste. */
  _flash(type, pid) {
    if (this.onFlash) this.onFlash(type, pid);
  }

  _log(texte, type = 'info', pid = null, extra = null) {
    const e = { t: this.now, texte, type, pid, manche: this.manche, ...(extra || {}) };
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
