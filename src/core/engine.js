// Moteur TornaDice V6 — simulation à événements datés, en temps virtuel (ms).
// La table fait avancer l'horloge au rythme réel, le Laboratoire d'un trait :
// mêmes règles, donc les statistiques décrivent la partie que l'on joue.
//
// Cycle d'un lot : réflexion → les dés roulent (dureeLancer) → constat
// (dureeConstat) → le lot traverse vers le voisin (dureePassage).
// Une combinaison formée est jouée d'office, puis le lot part. On ne passe
// jamais son lot sans combinaison. Un lot qui arrive chez un joueur qui en
// tient déjà un le force à passer le sien : c'est le tourbillon.

import { makeRng } from './rng.js?v=2.18';
import {
  CARTES_PAR_ID, PROFILS_IA, PROFIL_HUMAIN, profilIA, placement, comboServie,
  requisCarte, nomDansPhrase, PRIORITE_COMBOS, SYMBOLE_FIGE,
} from './config.js?v=2.18';
import { MOTS, cri } from './themes.js?v=2.18';

// Le symbole qu'il faut garder pour viser chaque combinaison de base.
const SYMBOLE_DE_COMBO = { reveil: 'soleil', abri: 'grange', sommeil: 'lune', envol: 'tornade' };

// File de priorité (tas binaire), ordonnée par date puis par ordre d'entrée.
class File {
  constructor() { this.a = []; this.seq = 0; }
  get taille() { return this.a.length; }
  get tete() { return this.a[0]; }
  avant(x, y) { return x._t !== y._t ? x._t < y._t : x._s < y._s; }
  pousser(t, ev) {
    ev._t = t; ev._s = this.seq++;
    const a = this.a;
    let i = a.push(ev) - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.avant(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p;
    }
  }
  retirer() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const g = 2 * i + 1, d = g + 1;
        let m = i;
        if (g < a.length && this.avant(a[g], a[m])) m = g;
        if (d < a.length && this.avant(a[d], a[m])) m = d;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}

const statsVides = () => ({
  lancers: 0, combos: {}, combosCartes: {}, reveils: 0, foisEndormi: 0, abris: 0,
  pousses: 0, tempsAvecLot: 0,
});

export class Moteur {
  /**
   * @param {object} cfg          configuration complète (config.js, configDepuis)
   * @param {Array}  specJoueurs  [{ nom, type: 'humain'|'ia', profil }]
   * @param {string|number} graine
   * @param {object} [opts]       journal: false coupe le journal (campagnes)
   */
  constructor(cfg, specJoueurs, graine, opts = {}) {
    this.cfg = cfg;
    this.graine = graine;
    this.rng = makeRng(graine);
    this.avecJournal = opts.journal !== false;
    this.now = 0;
    this.file = new File();
    this.journal = [];
    this.termine = false;
    this.vainqueur = null;
    this.raisonFin = null;
    this.manche = 0;
    // « Placez la Carte Rotation sur une face aléatoire. » +1 = horaire.
    this.sens = this.rng() < 0.5 ? 1 : -1;
    this.transits = [];        // lots en train de traverser la table
    this.transition = null;    // entre deux manches
    this.choixSens = null;     // la Carte Rotation attend une réponse
    this.statsManches = [];
    this.compteurLot = 0;
    this.compteurTransit = 0;
    // Crochets de l'interface, tous facultatifs.
    this.onJournal = null;     // (entree)
    this.onEtatChange = null;
    this.onMouvement = null;   // (idDepart, idArrivee, motif, { des }, duree)
    this.onCombinaison = null; // (idJoueur, idCombo, couleur)
    this.onAnnonce = null;     // (texte, couleur, idJoueur, options)
    this.onJeton = null;       // (idJoueur, equipe) — un Jeton Équipe quitte la carte Tornade
    this.onFlash = null;       // (type, idJoueur) — reveil | abri | envol | endormi
    this.onFinManche = null;
    this.onDebutManche = null;
    this.onChoixSens = null;

    const sieges = placement(cfg.nbJoueurs);
    this.joueurs = sieges.map((equipe, i) => {
      const s = specJoueurs[i] || {};
      const humain = s.type === 'humain';
      const base = humain ? PROFIL_HUMAIN : profilIA(s.profil);
      return {
        id: i, siege: i, equipe, nom: s.nom || `Joueur ${i + 1}`, perso: s.perso || null,
        type: humain ? 'humain' : 'ia', profil: base,
        vitesse: Math.max(60, this.rng.normal(base.reflexe, base.ecart, 80)),
        eveille: false, lots: [], lancersLot: 0,
        attente: null,          // ce qu'un joueur humain peut faire
        departEnAttente: null,  // lot engagé vers le voisin, le temps du constat
        planifie: false, fige: false, objectif: null,
        stats: statsVides(), _lotDepuis: 0,
      };
    });
    this.equipes = {};
    for (const id of ['bleu', 'jaune', 'vert']) {
      if (sieges.includes(id)) this.equipes[id] = { id, cartes: [], abris: 0, objectif: 0 };
    }
    const cartes = cfg.cartes.map((id) => CARTES_PAR_ID[id])
      .filter(Boolean);
    const reste = cartes.filter((c) => !c.premiere);
    this.pioche = [...cartes.filter((c) => c.premiere),
      ...(cfg.melangerCartes ? this.rng.shuffle(reste) : reste)];
    if (!this.pioche.length) this.pioche = [CARTES_PAR_ID.chauffe];
    // L'équipe qui reçoit les lots : les Jaunes à la première manche.
    this.equipeDes = 'jaune';
    this._demarrerManche(true);
  }

  // ── Manches ─────────────────────────────────────────────────────────────────
  _demarrerManche(premiere = false) {
    this.manche += 1;
    this._comboCarteManche = 0;
    if (this.choixSens && !this.choixSens.decide) this.choisirSens(false);
    this.choixSens = null;
    this.debutManche = this.now;
    this.carte = this.pioche[0] || null;
    this.passif = (this.carte && this.carte.passif) || {};
    for (const j of this.joueurs) {
      j.eveille = false; j.lots = []; j.lancersLot = 0; j.attente = null;
      j.planifie = false; j.fige = false; j.departEnAttente = null; j.objectif = null;
    }
    // Les Jetons Équipe reviennent sur la carte Tornade. Tornade Jalouse :
    // l'équipe seule en tête en a un de plus à récupérer.
    const meneur = this.passif.abriMeneur ? this._seulEnTete() : null;
    for (const e of Object.values(this.equipes)) {
      e.abris = 0;
      e.objectif = (e.id === 'vert' ? this.cfg.jetonsVert : this.cfg.jetons) + (e === meneur ? this.passif.abriMeneur : 0);
    }
    const porteurs = this._porteursDeDepart();
    for (const pid of porteurs) {
      this.joueurs[pid]._lotDepuis = this.now;
      this.joueurs[pid].lots.push(this._nouveauLot());
    }
    this._log(`Manche ${this.manche} — ${this.carte ? this.carte.nom : 'sans carte'} · sens `
      + (this.sens > 0 ? 'horaire' : 'antihoraire'), 'manche');
    if (meneur) {
      this._log(`${nomDansPhrase(meneur.id).Le} ${nomDansPhrase(meneur.id).v('mène', 'mènent')} : `
        + 'un Jeton Équipe de plus à récupérer.', 'manche');
    }
    if (this.onDebutManche) this.onDebutManche({ manche: this.manche, carte: this.carte, porteurs, premiere });
    for (const pid of porteurs) this._planifier(pid);
    // Garde-fou : une manche qui s'éternise est arrêtée d'office.
    this.file.pousser(this.now + this.cfg.dureeMaxManche, { type: 'gardeManche', manche: this.manche });
  }

  /**
   * Qui tient un lot au début de la manche : chaque joueur de l'équipe qui
   * reçoit les dés, puis le Cow-boy — il récupère toujours le lot restant —,
   * puis les autres s'il reste des lots (réglages).
   */
  _porteursDeDepart() {
    const nbLots = Math.max(1, Math.min(this.joueurs.length, this.cfg.lots));
    const rang = (j) => (j.equipe === this.equipeDes ? 0 : j.equipe === 'vert' ? 1 : 2);
    return this.joueurs.slice().sort((a, b) => rang(a) - rang(b) || a.id - b.id)
      .slice(0, nbLots).map((j) => j.id);
  }

  /** L'équipe seule en tête aux cartes, ou rien en cas d'égalité. */
  _seulEnTete() {
    const equipes = Object.values(this.equipes);
    const max = Math.max(...equipes.map((e) => e.cartes.length));
    const tete = equipes.filter((e) => e.cartes.length === max);
    return max > 0 && tete.length === 1 ? tete[0] : null;
  }

  /** L'équipe « perdante » que désigne le Cow-boy : celle qui a le moins de cartes. */
  _designeeParLeVert() {
    const { bleu, jaune } = this.equipes;
    if (bleu.cartes.length !== jaune.cartes.length) {
      return bleu.cartes.length < jaune.cartes.length ? 'bleu' : 'jaune';
    }
    return this.rng() < 0.5 ? 'bleu' : 'jaune';
  }

  // ── La Carte Rotation ───────────────────────────────────────────────────────
  // L'équipe qui reçoit les dés peut la retourner entre deux manches. Une table
  // sans humain dans cette équipe tranche aussitôt, à pile ou face : aucun sens
  // n'avantage un camp, et le Laboratoire doit voir passer les deux.
  _ouvrirChoixSens() {
    const joueurs = this.joueurs.filter((j) => j.equipe === this.equipeDes);
    this.choixSens = {
      joueurs: joueurs.map((j) => j.id), equipes: [this.equipeDes], sens: this.sens,
      humain: joueurs.some((j) => j.type === 'humain'), decide: false, inverse: false,
    };
    if (!this.choixSens.humain) this.choisirSens(this.rng() < 0.5);
    else if (this.onChoixSens) this.onChoixSens(this.choixSens);
  }

  /** Retourne la Carte Rotation, ou la laisse. Rend vrai si la décision est prise ici. */
  choisirSens(inverser) {
    const c = this.choixSens;
    if (!c || c.decide) return false;
    c.decide = true;
    c.inverse = !!inverser;
    if (c.inverse) this.sens = -this.sens;
    this._log(c.inverse
      ? `Carte Rotation retournée : sens ${this.sens > 0 ? 'horaire' : 'antihoraire'}.`
      : 'Carte Rotation laissée en place.', 'manche');
    if (this.onChoixSens) this.onChoixSens(c);
    if (this.onEtatChange) this.onEtatChange();
    return true;
  }

  _nouveauLot() {
    return {
      id: ++this.compteurLot,
      // sym null = face « ? » ; verrou = tornade figée ; roule = dé en l'air.
      des: Array.from({ length: this.cfg.desParLot }, () => ({ sym: null, verrou: false, roule: false, finRoule: 0 })),
      lance: false,
    };
  }

  // ── Boucle ──────────────────────────────────────────────────────────────────
  /** Avance jusqu'à l'instant t (table de jeu, temps réel). */
  avancerJusqua(t) {
    let garde = 0;
    while (!this.termine && this.file.taille && this.file.tete._t <= t && ++garde < 20000) {
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
    while (!this.termine && this.file.taille && n++ < maxEvenements) {
      const ev = this.file.retirer();
      this.now = ev._t;
      this._traiter(ev);
    }
    if (!this.termine) this._finPartie(null, 'limite');
    return this.resultat();
  }

  _traiter(ev) {
    if (this.termine) return;
    const j = ev.pid != null ? this.joueurs[ev.pid] : null;
    switch (ev.type) {
      case 'action':
        j.planifie = false;
        if (!j.lots.length || j.fige) return;
        if (j.type === 'humain') this._attenteHumaine(j);
        else if (!this._desEnLAir(j.lots[0])) this._demarrerLancer(j, this._choixDesIA(j, j.lots[0]));
        return;
      case 'finLancer':
        // Si le lot a été poussé entre-temps, ce jet ne compte plus.
        if (j.lots[0] === ev.lot) this._finLancer(j, ev.des);
        return;
      case 'depart':
        if (!j.lots.includes(ev.lot)) {
          if (j.departEnAttente && j.departEnAttente.lot === ev.lot) j.departEnAttente = null;
          if (!j.departEnAttente) j.fige = false;
          return;
        }
        this._depart(j, ev.lot, ev.motif, ev.dispo);
        return;
      case 'arrivee': this._arrivee(ev.transitId); return;
      case 'nouvelleManche':
        this.transition = null;
        this._demarrerManche(false);
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
    const base = this.cfg.tempsReflexion * (j.vitesse / j.profil.reflexe) * (this.passif.lenteur || 1);
    this.file.pousser(this.now + Math.max(40, this.rng.normal(base, this.cfg.ecartReflexion, 40)),
      { type: 'action', pid });
  }

  /** Rythme irrégulier : `variance` étire ou raccourcit chaque durée. */
  _varier(ms) {
    const v = this.cfg.variance;
    return v && ms > 0 ? Math.max(0, ms * (1 + (this.rng() * 2 - 1) * v)) : ms;
  }

  // ── Dés ─────────────────────────────────────────────────────────────────────
  _lotPose(lot) { return lot.des.every((d) => d.sym && !d.roule); }
  _desEnLAir(lot) { return lot.des.some((d) => d.roule); }

  _poserDes(lot, indices) {
    const faces = this.cfg.faces;
    for (const i of indices) {
      const d = lot.des[i];
      if (!d || !d.roule) continue;
      d.sym = faces[this.rng.int(faces.length)];
      d.roule = false;
      d.finRoule = 0;
      // Une tornade se fige : ce dé ne se relance plus.
      if (d.sym === SYMBOLE_FIGE) d.verrou = true;
    }
    lot.lance = this._lotPose(lot);
  }

  /**
   * Le symbole que l'IA cherche avec ce lot. Le tirage vaut pour toute la
   * possession, et il est repris quand la Tornade change d'état.
   */
  _objectifIA(j, lot) {
    const etat = j.eveille ? 'eveille' : 'endormi';
    const cle = `${lot.id}:${etat}`;
    if (j.objectif && j.objectif.cle === cle) return j.objectif.sym;
    const p = j.profil;
    const style = p.styles ? PROFILS_IA[this.rng.pick(p.styles)] : p;
    const poids = Object.entries(style.vise[etat]).filter(([s]) => this.cfg.faces.includes(s));
    let sym = j.eveille ? 'grange' : 'soleil';
    let x = this.rng() * poids.reduce((t, [, n]) => t + n, 0);
    for (const [s, n] of poids) { x -= n; if (x <= 0) { sym = s; break; } }
    j.objectif = { cle, sym };
    return sym;
  }

  /** Les dés qu'une IA relance : elle garde ceux qui servent son objectif. */
  _choixDesIA(j, lot) {
    const libres = [];
    for (let i = 0; i < lot.des.length; i++) if (!lot.des[i].verrou) libres.push(i);
    if (!lot.lance) return libres;
    const objectif = this._objectifIA(j, lot);
    const garde = libres.filter((i) => lot.des[i].sym === objectif);
    let relance = libres.filter((i) => lot.des[i].sym !== objectif);
    // La bévue de l'Idiot : relancer un dé utile, ou garder un dé inutile.
    if (j.profil.bevue && this.rng() < j.profil.bevue) {
      if (garde.length && this.rng() < 0.5) relance.push(this.rng.pick(garde));
      else if (relance.length) relance = relance.filter((_, k) => k !== this.rng.int(relance.length));
    }
    return relance.length ? relance : libres;
  }

  // ── Combinaisons ────────────────────────────────────────────────────────────
  /** Les combinaisons que les dés posés du joueur servent, jouables dans son état. */
  combosDisponibles(j) {
    const lot = j.lots[0];
    if (!lot || !this._lotPose(lot)) return [];
    const compte = {};
    for (const d of lot.des) compte[d.sym] = (compte[d.sym] || 0) + 1;
    const out = [];
    const etat = j.eveille ? 'eveille' : 'endormi';
    for (const c of this.cfg.combos) {
      if ((c.etat === 'tous' || c.etat === etat) && comboServie(compte, c.requis)) {
        out.push({ id: c.id, source: 'role', nom: c.nom, requis: c.requis, couleur: c.couleur });
      }
    }
    const carte = this.carte;
    if (carte && carte.combo) {
      const requis = requisCarte(this.cfg, carte);
      if (comboServie(compte, requis)) {
        out.push({ id: carte.id, source: 'carte', nom: carte.nom, requis, couleur: 'carte', effet: carte.combo.effet });
      }
    }
    return out;
  }

  /** Celle qu'on joue : la carte Tornade d'abord, puis l'ordre de PRIORITE_COMBOS. */
  _comboAJouer(dispo) {
    if (!dispo.length) return null;
    const carte = dispo.find((d) => d.source === 'carte');
    // Le dormeur qui sort ses soleils au même jet se réveille quand même.
    if (carte) return dispo.some((d) => d.id === 'reveil') ? { ...carte, reveilAussi: true } : carte;
    for (const id of PRIORITE_COMBOS) {
      const d = dispo.find((x) => x.id === id);
      if (d) return d;
    }
    return dispo[0];
  }

  _voisins(j) {
    const n = this.joueurs.length;
    return [this.joueurs[(j.siege + 1) % n], this.joueurs[(j.siege - 1 + n) % n]];
  }

  _suivant(j) {
    const n = this.joueurs.length;
    return this.joueurs[(j.siege + this.sens + n) % n];
  }

  // ── Cycle d'un lancer ───────────────────────────────────────────────────────
  /** Met en rotation les dés désignés (tous les dés libres si `indices` est vide). */
  _demarrerLancer(j, indices) {
    const lot = j.lots[0];
    if (!lot || j.fige) return false;
    const premier = lot.des.some((d) => d.sym === null);
    let cible = [];
    lot.des.forEach((d, i) => {
      if (d.verrou || d.roule) return;
      // Un lot neuf part en entier.
      if ((premier && d.sym === null) || !indices || !indices.length || indices.includes(i)) cible.push(i);
    });
    if (!cible.length) return false;
    // Tornade Paisible : un seul dé à la fois.
    if (this.passif.unParUn && !premier) cible = [cible[0]];
    const duree = Math.max(60, this._varier(this.cfg.dureeLancer * (this.passif.lenteur || 1)));
    for (const i of cible) { lot.des[i].roule = true; lot.des[i].finRoule = this.now + duree; }
    lot.lance = false;
    j.attente = null;
    j.lancersLot++;
    j.stats.lancers++;
    this.file.pousser(this.now + duree, { type: 'finLancer', pid: j.id, lot, des: cible });
    if (this.onEtatChange) this.onEtatChange();
    return true;
  }

  /** Un jet se pose. Tant qu'un dé tourne encore, rien n'est décidé. */
  _finLancer(j, indices) {
    const lot = j.lots[0];
    this._poserDes(lot, indices);
    if (!this._lotPose(lot)) {
      if (j.type === 'humain') this._attenteHumaine(j);
      return;
    }
    const dispo = this.combosDisponibles(j);
    if (this.onCombinaison) for (const d of dispo) this.onCombinaison(j.id, d.id, d.couleur);
    const choisi = this._comboAJouer(dispo);
    if (choisi) {
      if (choisi.id === 'envol') this._flash('envol', j.id);
      this._demanderDepart(j, 'combo', choisi);
    } else if (lot.des.every((d) => d.verrou)) {
      // Plus aucun dé à relancer et rien de formé : le lot ne peut que partir.
      this._demanderDepart(j, 'bloque');
    } else this._planifier(j.id);
  }

  /** Le lot va partir : on laisse le temps de voir le résultat (constat). */
  _demanderDepart(j, motif, dispo = null) {
    const lot = j.lots[0];
    if (!lot || j.fige) return;
    j.fige = true;
    j.attente = null;
    const constat = this._varier(this.cfg.dureeConstat);
    j.departEnAttente = { lot, motif, dispo, ouvertA: this.now, expire: this.now + constat };
    this.file.pousser(this.now + constat, { type: 'depart', pid: j.id, lot, motif, dispo });
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Le lot quitte la main du joueur ; l'effet de la combinaison s'applique. */
  _depart(j, lot, motif, dispo) {
    j.departEnAttente = null;
    j.fige = false;
    if (dispo) {
      const compteur = dispo.source === 'carte' ? j.stats.combosCartes : j.stats.combos;
      compteur[dispo.id] = (compteur[dispo.id] || 0) + 1;
      if (dispo.source === 'carte') this._comboCarteManche += 1;
    }
    this._envoyerLot(j, lot, motif, dispo);
    if (dispo) this._effet(j, dispo);
    if (!this.termine && j.lots.length) this._planifier(j.id);
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Retire le lot de la main du joueur et l'envoie vers son voisin. */
  _envoyerLot(j, lot, motif, dispo = null) {
    const k = j.lots.indexOf(lot);
    if (k >= 0) j.lots.splice(k, 1);
    j.lancersLot = 0;
    j.attente = null;
    if (motif === 'pousse') j.stats.pousses++;
    if (!j.lots.length) j.stats.tempsAvecLot += this.now - j._lotDepuis;
    const montrer = this.avecJournal || this.onMouvement;
    const desFinaux = montrer ? lot.des.map((d) => d.sym) : null;
    // Le lot repart vierge : le voisin le reçoit faces « ? », à lancer.
    for (const d of lot.des) { d.verrou = false; d.roule = false; d.sym = null; d.finRoule = 0; }
    lot.lance = false;
    const q = this._suivant(j);
    const duree = Math.max(0, this._varier(this.cfg.dureePassage));
    const transit = { id: ++this.compteurTransit, lot, de: j.id, vers: q.id, motif, depart: this.now, arrivee: this.now + duree };
    this.transits.push(transit);
    this.file.pousser(transit.arrivee, { type: 'arrivee', transitId: transit.id });
    if (this.onMouvement) this.onMouvement(j.id, q.id, motif, { des: desFinaux.map((sym) => ({ sym })) }, duree);
    if (this.avecJournal) {
      this._log(j.nom, 'tour', j.id, {
        des: this._desOrdonnes(desFinaux, dispo && dispo.requis),
        issue: dispo ? cri(dispo.nom) : motif === 'pousse' ? 'Tourbillon' : 'Bloqué',
        couleur: dispo ? dispo.couleur : 'gris',
      });
    }
  }

  /** Les dés d'un tour, ceux de la combinaison jouée d'abord. */
  _desOrdonnes(des, requis) {
    if (!requis) return des;
    const autres = des.slice();
    const servent = [];
    for (const [sym, n] of Object.entries(requis)) {
      for (let k = 0; k < n; k++) {
        const i = autres.indexOf(sym);
        if (i >= 0) servent.push(autres.splice(i, 1)[0]);
      }
    }
    return [...servent, ...autres];
  }

  /** Le lot atteint son destinataire — qui passe le sien s'il en tenait un. */
  _arrivee(transitId) {
    const k = this.transits.findIndex((t) => t.id === transitId);
    if (k < 0) return;
    const t = this.transits.splice(k, 1)[0];
    t.lot.venuDe = t.de;
    if (this.termine || this.transition) return;
    const q = this.joueurs[t.vers];
    if (q.departEnAttente) {
      // Sa combinaison était formée : elle est jouée tout de suite.
      const d = q.departEnAttente;
      this._depart(q, d.lot, d.motif, d.dispo);
      if (this.termine || this.transition) return;
    }
    if (q.lots.length) {
      const pousse = q.lots[0];
      for (const d of pousse.des) { d.roule = false; d.finRoule = 0; }
      this._envoyerLot(q, pousse, 'pousse');
    }
    q._lotDepuis = this.now;
    q.lots.push(t.lot);
    q.fige = false;
    q.planifie = false;
    this._planifier(q.id);
    if (this.onEtatChange) this.onEtatChange();
  }

  // ── Effets ──────────────────────────────────────────────────────────────────
  _effet(j, dispo) {
    if (dispo.reveilAussi && !j.eveille) this._reveiller(j);
    switch (dispo.source === 'carte' ? dispo.effet : dispo.id) {
      case 'reveil': this._reveiller(j); break;
      case 'abri': this._abri(j); break;
      case 'sommeil': {
        const cible = this._choisirEndormi(j);
        if (cible) this._endormir(cible, j);
        else this._annoncer(MOTS.dejaEndormis, 'nuit', j.id);
        break;
      }
      case 'endormirVoisins': {
        const noms = this._voisins(j).filter((v) => v.eveille).map((v) => { this._endormir(v, null); return v.nom; });
        this._annoncer(noms.length ? `${MOTS.endort} ${noms.join(' et ')}` : MOTS.dejaEndormis, 'nuit', j.id);
        break;
      }
      case 'reveillerEquipe': {
        const dormeurs = this.joueurs.filter((x) => x.equipe === j.equipe && !x.eveille);
        for (const x of dormeurs) this._reveiller(x);
        this._annoncer(dormeurs.some((x) => x !== j) ? MOTS.reveilleEquipe : MOTS.equipeEveillee, 'or', j.id);
        break;
      }
      case 'gagnerManche':
        this._finManche(j.equipe, { joueur: j, raison: 'carte' });
        break;
      default: // envol : le lot est parti, rien d'autre
    }
  }

  /** Le nom d'une combinaison de base, tel que le thème le donne. */
  _nomCombo(id) {
    const c = this.cfg.combos.find((x) => x.id === id);
    return c ? c.nom : id;
  }

  _reveiller(j) {
    j.eveille = true;
    j.stats.reveils++;
    this._flash('reveil', j.id);
    this._annoncer(cri(this._nomCombo('reveil')), 'or', j.id);
  }

  _endormir(cible, auteur) {
    cible.eveille = false;
    cible.stats.foisEndormi++;
    this._flash('endormi', cible.id);
    if (auteur) this._annoncer(`${MOTS.endort} ${cible.nom}`, 'nuit', auteur.id);
  }

  /** Le voisin réveillé qu'on endort : un adversaire d'abord, le mieux placé. */
  _choisirEndormi(j) {
    const note = (v) => (v.equipe !== j.equipe ? 100 : 0) + this.equipes[v.equipe].cartes.length * 10
      + this.equipes[v.equipe].abris * 5 + (v.lots.length ? 1 : 0);
    return this._voisins(j).filter((v) => v.eveille).sort((a, b) => note(b) - note(a))[0] || null;
  }

  /** Un Abri : un Jeton Équipe quitte la carte Tornade ; au dernier, l'équipe gagne la manche. */
  _abri(j) {
    const eq = this.equipes[j.equipe];
    eq.abris++;
    j.stats.abris++;
    this._flash('abri', j.id);
    if (this.onJeton) this.onJeton(j.id, j.equipe);
    const reste = eq.objectif - eq.abris;
    if (reste <= 0) { this._finManche(j.equipe, { joueur: j, raison: 'abri' }); return; }
    this._annoncer(`${cri(this._nomCombo('abri'))} Encore ${reste}`, 'vert', j.id);
    this._log(`${j.nom} récupère un Jeton Équipe — ${nomDansPhrase(j.equipe).nom} : `
      + `encore ${reste} sur la Tornade.`, 'jeton', j.id);
  }

  /** Les Abris d'une équipe dans la manche : { total, faits }. */
  suiviAbris(equipeId) {
    const e = this.equipes[equipeId];
    return e ? { total: e.objectif, faits: e.abris } : { total: 0, faits: 0 };
  }

  cartesPourGagner(equipeId) {
    return equipeId === 'vert' ? this.cfg.cartesVert : this.cfg.cartesPourGagner;
  }

  // ── Fin de manche, fin de partie ────────────────────────────────────────────
  _finManche(equipeId, cause = {}) {
    if (this.termine) return;
    const carte = this.carte;
    const eq = equipeId ? this.equipes[equipeId] : null;
    const nom = equipeId ? nomDansPhrase(equipeId) : null;
    if (eq && cause.joueur) {
      this._annoncer(`${cause.joueur.nom} fait gagner ${nom.le} `
        + (cause.raison === 'carte' ? `avec « ${carte.nom} »` : MOTS.gagneParAbri),
      equipeId, null, { manche: true });
    }
    const compte = !!(eq && carte);
    if (compte) eq.cartes.push(carte.id);
    this.statsManches.push({
      manche: this.manche, carte: carte ? carte.id : null, comboCarte: this._comboCarteManche,
      vainqueur: equipeId, joueur: cause.joueur ? cause.joueur.id : null,
      nomJoueur: cause.joueur ? cause.joueur.nom : null, raison: cause.raison || null,
      sens: this.sens, duree: this.now - this.debutManche, compte, equipeDes: this.equipeDes,
    });
    if (eq) {
      this._log(`${nom.Le} ${nom.v('remporte', 'remportent')} la manche ${this.manche}`
        + ` et ${nom.v('prend', 'prennent')} « ${carte.nom} ».`, 'manche');
    }
    this.pioche.shift();
    if (compte) {
      // Les cartes qui valent double se servent sur le dessus de la pioche.
      const p = this.passif;
      if ((p.double || p.doublePour === equipeId) && this.pioche.length) {
        eq.cartes.push(this.pioche.shift().id);
        this._log(`${nom.Le} ${nom.v('prend', 'prennent')} une seconde carte, face cachée.`, 'manche');
      }
      if (p.volerCarte) {
        const victime = Object.values(this.equipes).filter((e) => e !== eq && e.cartes.length)
          .sort((a, b) => b.cartes.length - a.cartes.length)[0];
        if (victime) {
          eq.cartes.push(victime.cartes.pop());
          this._log(`${nom.Le} ${nom.v('vole', 'volent')} une carte ${nomDansPhrase(victime.id).a}.`, 'manche');
        }
      }
    }
    if (eq && eq.cartes.length >= this.cartesPourGagner(equipeId)) { this._finPartie(equipeId, 'cartes'); return; }
    if (!this.pioche.length) { this._finPartie(this._meneur(), 'pioche'); return; }
    if (this.manche >= this.cfg.manchesMax) { this._finPartie(this._meneur(), 'manchesMax'); return; }

    // Qui reçoit les dés : les perdants — les gagnants sous la Tornade des
    // Tricheurs. Si le Cow-boy gagne, c'est lui qui désigne l'équipe « perdante ».
    if (equipeId === 'vert') this.equipeDes = this._designeeParLeVert();
    else if (equipeId) {
      this.equipeDes = this.passif.gagnantsGardentLesDes ? equipeId : (equipeId === 'bleu' ? 'jaune' : 'bleu');
    }
    const porteursAvant = this.joueurs.filter((j) => j.lots.length).map((j) => j.id);
    this.file = new File();
    this.transits = [];
    for (const j of this.joueurs) {
      j.lots = []; j.fige = false; j.planifie = false; j.attente = null;
      j.lancersLot = 0; j.departEnAttente = null;
    }
    const duree = this.cfg.dureeTransition;
    this.transition = { vainqueur: equipeId, manche: this.manche, debut: this.now, fin: this.now + duree, carteSuivante: this.pioche[0] };
    this._ouvrirChoixSens();
    if (this.onFinManche) {
      this.onFinManche({
        vainqueur: equipeId, porteursAvant, manche: this.manche, duree,
        carteSuivante: this.pioche[0], choixSens: this.choixSens,
      });
    }
    this.file.pousser(this.now + duree, { type: 'nouvelleManche' });
    if (this.onEtatChange) this.onEtatChange();
  }

  _meneur() {
    const tri = Object.values(this.equipes).sort((a, b) => b.cartes.length - a.cartes.length);
    // Une égalité en tête ne désigne personne.
    return tri.length > 1 && tri[0].cartes.length === tri[1].cartes.length ? null : tri[0].id;
  }

  _finPartie(equipeId, raison) {
    this.termine = true;
    this.vainqueur = equipeId;
    this.raisonFin = raison;
    this.duree = this.now;
    this.transits = [];
    this._log(equipeId
      ? `Fin de partie — ${nomDansPhrase(equipeId).le} ${nomDansPhrase(equipeId).v('l’emporte', 'l’emportent')} `
        + `avec ${this.equipes[equipeId].cartes.length} cartes Tornade.`
      : 'Fin de partie sans vainqueur.', 'fin');
    if (this.onEtatChange) this.onEtatChange();
  }

  // ── Joueur humain ───────────────────────────────────────────────────────────
  _attenteHumaine(j) {
    const lot = j.lots[0];
    if (!lot || j.fige) { j.attente = null; return; }
    // On peut relancer tout dé libre, même pendant qu'un autre tourne.
    j.attente = { indicesLibres: lot.des.map((d, i) => i).filter((i) => !lot.des[i].verrou && !lot.des[i].roule) };
    if (this.onEtatChange) this.onEtatChange();
  }

  /** Relance les dés désignés (tous les dés libres si `indices` est absent). */
  lancerHumain(pid, indices = null) {
    const j = this.joueurs[pid];
    if (this.termine || j.type !== 'humain' || !j.lots.length || j.fige) return false;
    const lance = this._demarrerLancer(j, indices);
    if (lance) this._attenteHumaine(j);
    return lance;
  }

  // ── Journal et résultat ─────────────────────────────────────────────────────
  _annoncer(texte, couleur, pid = null, options = null) {
    if (this.onAnnonce) this.onAnnonce(texte, couleur, pid, options);
  }

  _flash(type, pid) { if (this.onFlash) this.onFlash(type, pid); }

  _log(texte, type = 'info', pid = null, extra = null) {
    if (!this.avecJournal) return;
    const e = { t: this.now, texte, type, pid, manche: this.manche, ...extra };
    this.journal.push(e);
    if (this.journal.length > 400) this.journal.splice(0, this.journal.length - 400);
    if (this.onJournal) this.onJournal(e);
  }

  resultat() {
    return {
      graine: this.graine, vainqueur: this.vainqueur, raison: this.raisonFin,
      manches: this.manche, duree: this.duree ?? this.now,
      equipes: Object.fromEntries(Object.values(this.equipes).map((e) => [e.id, { cartes: e.cartes.length }])),
      joueurs: this.joueurs.map((j) => ({
        id: j.id, nom: j.nom, equipe: j.equipe, siege: j.siege, type: j.type, profil: j.profil.id, stats: j.stats,
      })),
      statsManches: this.statsManches,
    };
  }
}
