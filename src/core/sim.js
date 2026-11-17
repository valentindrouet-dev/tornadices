// Campagnes de parties simulées (Laboratoire) et agrégation des résultats.
// Chaque partie a sa graine, `${graine}#${numéro}` : une campagne se rejoue à
// l'identique, d'un trait ou par tranches.

import { Moteur } from './engine.js?v=2.07';
import { CARTES_PAR_ID, COMBOS } from './config.js?v=2.07';

/** Format de l'agrégat. À incrémenter dès qu'un champ change : le Laboratoire écarte les résultats d'avant. */
export const SCHEMA_RESULTAT = 3;

/**
 * Intervalle de confiance de Wilson à 95 % d'une proportion k/n. Il reste juste
 * pour les petits échantillons et les parts proches de 0 ou de 1.
 */
export function wilson(k, n, z = 1.96) {
  if (!n) return { part: 0, bas: 0, haut: 0, marge: 0 };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const demi = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { part: p, bas: Math.max(0, centre - demi), haut: Math.min(1, centre + demi), marge: demi };
}

function quantile(tri, q) {
  if (!tri.length) return 0;
  const i = (tri.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? tri[lo] : tri[lo] + (tri[hi] - tri[lo]) * (i - lo);
}

function histogramme(valeurs, nbClasses) {
  if (!valeurs.length) return [];
  let min = Infinity, max = -Infinity;
  for (const v of valeurs) { if (v < min) min = v; if (v > max) max = v; }
  const largeur = (max - min) / nbClasses || 1;
  const classes = Array.from({ length: nbClasses }, (_, i) => ({ min: min + i * largeur, max: min + (i + 1) * largeur, n: 0 }));
  for (const v of valeurs) classes[Math.min(nbClasses - 1, Math.max(0, Math.floor((v - min) / largeur)))].n++;
  return classes;
}

function histogrammeEntier(valeurs) {
  const m = {};
  for (const v of valeurs) m[v] = (m[v] || 0) + 1;
  return Object.entries(m).map(([k, n]) => ({ valeur: Number(k), n })).sort((a, b) => a.valeur - b.valeur);
}

const moyenne = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const ajouter = (objet, cle, n = 1) => { objet[cle] = (objet[cle] || 0) + n; };

/**
 * Prépare une campagne. `jouer(n)` déroule n parties de plus, `resultat()` rend
 * l'agrégat de celles déjà jouées : l'interface avance par tranches sans figer
 * la page, et le résultat ne dépend pas du découpage.
 */
export function creerCampagne(cfg, specJoueurs, graine) {
  const t0 = Date.now();
  let fait = 0;
  const victoires = {}, raisons = {}, combos = {}, combosCartes = {}, parCarte = {}, parProfil = {};
  const durees = [], manches = [], dureesManche = [];
  const parSiege = Array.from({ length: cfg.nbJoueurs }, (_, siege) => ({
    siege, equipe: null, profil: null, victoires: 0, lancers: 0, abris: 0, reveils: 0, endormi: 0, pousses: 0,
  }));
  const des = { manches: 0, gagnees: 0 };          // l'équipe qui reçoit les dés gagne-t-elle la manche ?
  const premierGain = { parties: 0, confirmees: 0 }; // la première carte annonce-t-elle la victoire ?
  const sens = { 1: {}, '-1': {} };                 // manches gagnées selon le sens de rotation
  let lancers = 0, endormis = 0, pousses = 0, nbManches = 0;

  function compter(r) {
    ajouter(victoires, r.vainqueur || 'aucun');
    ajouter(raisons, r.raison);
    durees.push(r.duree);
    manches.push(r.manches);
    let premier = null;
    for (const sm of r.statsManches) {
      nbManches++;
      dureesManche.push(sm.duree);
      const id = sm.carte || 'aucune';
      const c = parCarte[id] || (parCarte[id] = {
        id, nom: (CARTES_PAR_ID[id] || { nom: id }).nom, jouee: 0, dureeTotale: 0, vainqueurs: {},
        realisations: 0, manchesRealisee: 0,
      });
      c.jouee++;
      c.dureeTotale += sm.duree;
      c.realisations += sm.comboCarte;
      if (sm.comboCarte) c.manchesRealisee++;
      ajouter(c.vainqueurs, sm.vainqueur || 'aucun');
      if (sm.vainqueur) {
        ajouter(sens[sm.sens], sm.vainqueur);
        // Le Cow-boy tient toujours un lot : seules les deux équipes se comparent.
        if (sm.vainqueur !== 'vert') { des.manches++; if (sm.vainqueur === sm.equipeDes) des.gagnees++; }
        if (sm.compte && !premier) premier = sm.vainqueur;
      }
    }
    if (premier && r.vainqueur) { premierGain.parties++; if (premier === r.vainqueur) premierGain.confirmees++; }
    for (const j of r.joueurs) {
      const s = parSiege[j.siege];
      const gagne = j.equipe === r.vainqueur;
      s.equipe = j.equipe; s.profil = j.profil;
      s.lancers += j.stats.lancers; s.abris += j.stats.abris; s.reveils += j.stats.reveils;
      s.endormi += j.stats.foisEndormi; s.pousses += j.stats.pousses;
      if (gagne) s.victoires++;
      const p = parProfil[j.profil] || (parProfil[j.profil] = { profil: j.profil, parties: 0, victoires: 0, lancers: 0, abris: 0 });
      p.parties++; p.lancers += j.stats.lancers; p.abris += j.stats.abris;
      if (gagne) p.victoires++;
      for (const k in j.stats.combos) ajouter(combos, k, j.stats.combos[k]);
      for (const k in j.stats.combosCartes) ajouter(combosCartes, k, j.stats.combosCartes[k]);
      lancers += j.stats.lancers; endormis += j.stats.foisEndormi; pousses += j.stats.pousses;
    }
  }

  return {
    get fait() { return fait; },
    jouer(n) {
      for (let i = 0; i < n; i++, fait++) {
        compter(new Moteur(cfg, specJoueurs, `${graine}#${fait}`, { journal: false }).jouerJusquAuBout());
      }
      return fait;
    },
    resultat() {
      const n = fait || 1;
      const dTri = durees.slice().sort((a, b) => a - b);
      const mTri = manches.slice().sort((a, b) => a - b);
      const mancheTri = dureesManche.slice().sort((a, b) => a - b);
      const equipes = [...new Set(parSiege.map((s) => s.equipe).filter(Boolean))];
      const parts = equipes.map((equipe) => ({ equipe, n: victoires[equipe] || 0, ...wilson(victoires[equipe] || 0, fait) }));
      return {
        schema: SCHEMA_RESULTAT,
        table: { nbJoueurs: cfg.nbJoueurs },
        nbParties: fait, graine, calculMs: Date.now() - t0,
        victoires, parts, raisons,
        // La plus large des marges à 95 % sur les parts de victoire.
        marge: Math.max(0, ...parts.map((p) => p.marge)),
        // Parties allées au bout de la règle (assez de cartes), le reste s'arrêtant sur un garde-fou.
        concluantes: (raisons.cartes || 0) / n,
        duree: {
          moyenneMs: moyenne(durees), medianeMs: quantile(dTri, 0.5), p10Ms: quantile(dTri, 0.1),
          p90Ms: quantile(dTri, 0.9), minMs: dTri[0] || 0, maxMs: dTri[dTri.length - 1] || 0,
          histogramme: histogramme(durees.map((x) => x / 60000), 12),
        },
        manches: {
          moyenne: moyenne(manches), mediane: quantile(mTri, 0.5), min: mTri[0] || 0,
          max: mTri[mTri.length - 1] || 0, histogramme: histogrammeEntier(manches),
        },
        dureeManche: { moyenneMs: moyenne(dureesManche), medianeMs: quantile(mancheTri, 0.5), p90Ms: quantile(mancheTri, 0.9) },
        parSiege: parSiege.map((s) => ({ ...s, ...wilson(s.victoires, fait) })),
        parProfil: Object.values(parProfil).map((p) => ({ ...p, ...wilson(p.victoires, p.parties) })),
        combos: COMBOS.map((c) => ({ id: c.id, nom: c.nom, n: combos[c.id] || 0, parManche: (combos[c.id] || 0) / (nbManches || 1) })),
        combosCartes,
        parCarte: Object.values(parCarte).sort((a, b) => b.jouee - a.jouee),
        des: { ...des, ...wilson(des.gagnees, des.manches) },
        premierGain: { ...premierGain, ...wilson(premierGain.confirmees, premierGain.parties) },
        sens,
        totaux: { manches: nbManches, lancers, lancersParPartie: lancers / n, endormis, pousses, poussesParPartie: pousses / n },
      };
    },
  };
}

/** Joue `nbParties` parties d'un trait et rend l'agrégat. */
export function lancerCampagne(cfg, specJoueurs, graine, nbParties) {
  const c = creerCampagne(cfg, specJoueurs, graine);
  c.jouer(nbParties);
  return c.resultat();
}
