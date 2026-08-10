// Campagnes de parties simulées et agrégation des résultats.

import { Moteur } from './engine.js?v=1.11';
import { CARTES_JOURNEE } from './config.js?v=1.11';

const NOM_CARTE = Object.fromEntries(CARTES_JOURNEE.map((c) => [c.id, c.nom]));

function quantile(tri, q) {
  if (!tri.length) return 0;
  const i = (tri.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? tri[lo] : tri[lo] + (tri[hi] - tri[lo]) * (i - lo);
}

/**
 * Joue `nbParties` parties et renvoie l'agrégat.
 * @param {object} cfg
 * @param {Array}  specJoueurs
 * @param {string} graine
 * @param {number} nbParties
 * @param {(fait:number, total:number)=>void} [onProgres]
 */
export function lancerCampagne(cfg, specJoueurs, graine, nbParties, onProgres) {
  const t0 = Date.now();
  const victoires = {};
  const dureesMs = [];
  const manches = [];
  const dureesManche = [];
  const parSiege = [];
  const parProfil = {};
  const combos = {};
  const jetonsParSource = {};
  const parCarte = {};
  let collisionsTentees = 0, collisionsReussies = 0, lancersTotal = 0;
  let passesTotal = 0, erreursTotal = 0, endormisTotal = 0;
  const raisons = {};

  for (let i = 0; i < cfg.nbJoueurs; i++) {
    parSiege.push({ siege: i, equipe: null, victoires: 0, jetons: 0, lancers: 0, touches: 0, subis: 0 });
  }

  for (let g = 0; g < nbParties; g++) {
    const m = new Moteur(cfg, specJoueurs, `${graine}#${g}`);
    const r = m.jouerJusquAuBout();

    victoires[r.vainqueur || 'aucun'] = (victoires[r.vainqueur || 'aucun'] || 0) + 1;
    raisons[r.raison] = (raisons[r.raison] || 0) + 1;
    dureesMs.push(r.duree);
    manches.push(r.manches);

    for (const sm of r.statsManches) {
      dureesManche.push(sm.duree);
      const c = sm.carte || 'aucune';
      const e = parCarte[c] || (parCarte[c] = { id: c, nom: NOM_CARTE[c] || c, jouee: 0, dureeTotale: 0, vainqueurs: {} });
      e.jouee++;
      e.dureeTotale += sm.duree;
      e.vainqueurs[sm.vainqueur || 'aucun'] = (e.vainqueurs[sm.vainqueur || 'aucun'] || 0) + 1;
    }

    for (const j of r.joueurs) {
      const s = parSiege[j.siege];
      s.equipe = j.equipe;
      s.jetons += j.stats.jetonsRetournes;
      s.lancers += j.stats.lancers;
      s.touches += j.stats.collisionsReussies;
      s.subis += j.stats.foisTouche;
      if (j.equipe === r.vainqueur) s.victoires++;

      const p = parProfil[j.profil] || (parProfil[j.profil] = {
        profil: j.profil, parties: 0, victoires: 0, jetons: 0, lancers: 0, touches: 0,
      });
      p.parties++;
      if (j.equipe === r.vainqueur) p.victoires++;
      p.jetons += j.stats.jetonsRetournes;
      p.lancers += j.stats.lancers;
      p.touches += j.stats.collisionsReussies;

      for (const [k, v] of Object.entries(j.stats.combos)) combos[k] = (combos[k] || 0) + v;
      for (const [k, v] of Object.entries(j.stats.jetonsParSource)) {
        jetonsParSource[k] = (jetonsParSource[k] || 0) + v;
      }
      collisionsTentees += j.stats.collisionsTentees;
      collisionsReussies += j.stats.collisionsReussies;
      lancersTotal += j.stats.lancers;
      passesTotal += j.stats.passes;
      erreursTotal += j.stats.erreurs;
      endormisTotal += j.stats.foisEndormi;
    }

    if (onProgres && (g % 10 === 9 || g === nbParties - 1)) onProgres(g + 1, nbParties);
  }

  const dTri = dureesMs.slice().sort((a, b) => a - b);
  const mTri = manches.slice().sort((a, b) => a - b);
  const mancheTri = dureesManche.slice().sort((a, b) => a - b);
  const moy = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  return {
    nbParties,
    graine,
    calculMs: Date.now() - t0,
    victoires,
    raisons,
    duree: {
      moyenneMs: moy(dureesMs),
      medianeMs: quantile(dTri, 0.5),
      p10Ms: quantile(dTri, 0.1),
      p90Ms: quantile(dTri, 0.9),
      minMs: dTri[0] || 0,
      maxMs: dTri[dTri.length - 1] || 0,
      histogramme: histogramme(dureesMs.map((x) => x / 60000), 12),
    },
    manches: {
      moyenne: moy(manches),
      mediane: quantile(mTri, 0.5),
      min: mTri[0] || 0,
      max: mTri[mTri.length - 1] || 0,
      histogramme: histogrammeEntier(manches),
    },
    dureeManche: {
      moyenneMs: moy(dureesManche),
      medianeMs: quantile(mancheTri, 0.5),
      p90Ms: quantile(mancheTri, 0.9),
    },
    parSiege,
    parProfil: Object.values(parProfil),
    combos,
    jetonsParSource,
    parCarte: Object.values(parCarte).sort((a, b) => b.jouee - a.jouee),
    collisions: {
      tentees: collisionsTentees,
      reussies: collisionsReussies,
      taux: collisionsTentees ? collisionsReussies / collisionsTentees : 0,
      parPartie: collisionsTentees / nbParties,
    },
    totaux: {
      lancers: lancersTotal,
      lancersParPartie: lancersTotal / nbParties,
      passes: passesTotal,
      erreurs: erreursTotal,
      endormis: endormisTotal,
    },
  };
}

function histogramme(valeurs, nbClasses) {
  if (!valeurs.length) return [];
  const min = Math.min(...valeurs), max = Math.max(...valeurs);
  const largeur = (max - min) / nbClasses || 1;
  const classes = Array.from({ length: nbClasses }, (_, i) => ({
    min: min + i * largeur, max: min + (i + 1) * largeur, n: 0,
  }));
  for (const v of valeurs) {
    let i = Math.floor((v - min) / largeur);
    if (i >= nbClasses) i = nbClasses - 1;
    if (i < 0) i = 0;
    classes[i].n++;
  }
  return classes;
}

function histogrammeEntier(valeurs) {
  const m = {};
  for (const v of valeurs) m[v] = (m[v] || 0) + 1;
  return Object.entries(m)
    .map(([k, n]) => ({ valeur: Number(k), n }))
    .sort((a, b) => a.valeur - b.valeur);
}
