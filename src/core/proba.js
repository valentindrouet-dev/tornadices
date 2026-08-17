// Probabilités exactes des dés TornaDice.
//
// Deux niveaux de lecture :
//  1. la loi d'un lancer isolé (multinomiale) ;
//  2. la course entre la combinaison recherchée et les deux façons de perdre le
//     lot : deux X — qui se figent et ne se relancent jamais — ou trois éclairs,
//     qui forcent la tentative d'attrape. Chaîne de Markov absorbante sur le
//     nombre de X déjà figés.

import { comboServie, remplacements } from './config.js?v=1.29';

const facto = [1];
function fact(n) {
  for (let i = facto.length; i <= n; i++) facto[i] = facto[i - 1] * i;
  return facto[n];
}

/** Probabilité de chaque symbole sur un dé, d'après la liste des faces. */
export function loiDuDe(faces) {
  const p = {};
  for (const f of faces) p[f] = (p[f] || 0) + 1;
  const n = faces.length || 1;
  for (const k of Object.keys(p)) p[k] /= n;
  return p;
}

/** Énumère toutes les répartitions possibles de `m` dés sur `symboles`. */
function* repartitions(symboles, m) {
  const t = symboles.length;
  if (t === 0) return;
  const c = new Array(t).fill(0);
  function* rec(i, reste) {
    if (i === t - 1) { c[i] = reste; yield c.slice(); return; }
    for (let v = 0; v <= reste; v++) { c[i] = v; yield* rec(i + 1, reste - v); }
  }
  yield* rec(0, m);
}

function probaRepartition(c, probs, m) {
  let p = fact(m);
  for (let i = 0; i < c.length; i++) { p /= fact(c[i]); p *= Math.pow(probs[i], c[i]); }
  return p;
}

// Les jokers comblent ce qui manque : le même arbitrage qu'à la table.
const servie = (compte, requis) => comboServie(compte, requis);

/** P(la combinaison `requis` est servie sur un lancer neuf de `nbDes` dés). */
export function probaLancerUnique(faces, nbDes, requis) {
  const loi = loiDuDe(faces);
  const symboles = Object.keys(loi);
  const probs = symboles.map((s) => loi[s]);
  let total = 0;
  for (const c of repartitions(symboles, nbDes)) {
    const compte = {};
    symboles.forEach((s, i) => { compte[s] = c[i]; });
    if (servie(compte, requis)) total += probaRepartition(c, probs, nbDes);
  }
  return total;
}

/** Loi binomiale : P(exactement k dés portent `symbole`). */
export function loiBinomiale(faces, nbDes, symbole) {
  const p = loiDuDe(faces)[symbole] || 0;
  const out = [];
  for (let k = 0; k <= nbDes; k++) {
    const c = fact(nbDes) / (fact(k) * fact(nbDes - k));
    out.push(c * Math.pow(p, k) * Math.pow(1 - p, nbDes - k));
  }
  return out;
}

/**
 * Course « combinaison contre perte du lot », en relançant tous les dés libres.
 *
 * @param {string[]} faces
 * @param {number}   nbDes
 * @param {object}   requis        combinaison recherchée, ex. { vache: 3 }
 * @param {object}   opts
 * @param {string}   opts.bloquant       symbole qui fige le dé (défaut « x »)
 * @param {number}   opts.seuilBloquant  nombre de symboles figés qui rendent le lot
 * @param {object[]} opts.arretsForces   autres combinaisons qui rendent le lot d'office
 * @param {boolean}  opts.prioritaire    combinaison de carte Journée : passe avant tout
 * @param {boolean}  opts.estArretForce  la combinaison recherchée est elle-même obligatoire
 */
export function courseCombinaison(faces, nbDes, requis, opts = {}) {
  const {
    bloquant = 'x', seuilBloquant = 2, arretsForces = [],
    prioritaire = false, estArretForce = false,
  } = opts;

  const loi = loiDuDe(faces);
  const symboles = Object.keys(loi);
  const probs = symboles.map((s) => loi[s]);
  const iBloquant = symboles.indexOf(bloquant);
  const nbEtats = Math.max(1, seuilBloquant);

  const T = [];
  for (let s = 0; s < nbEtats; s++) {
    const m = Math.max(0, nbDes - s);
    const tr = { reussite: 0, perdu: 0, vers: new Float64Array(nbEtats) };
    if (m === 0) { tr.perdu = 1; T.push(tr); continue; }
    for (const c of repartitions(symboles, m)) {
      const p = probaRepartition(c, probs, m);
      if (p === 0) continue;
      const compte = {};
      symboles.forEach((sy, i) => { compte[sy] = c[i]; });
      compte[bloquant] = (compte[bloquant] || 0) + s; // les dés figés comptent toujours
      const k = iBloquant >= 0 ? c[iBloquant] : 0;
      const bloque = s + k >= seuilBloquant;
      const cible = servie(compte, requis);

      if (cible && (prioritaire || estArretForce)) tr.reussite += p;
      else if (bloque) tr.perdu += p;
      else if (arretsForces.some((a) => servie(compte, a.requis))) tr.perdu += p;
      else if (cible) tr.reussite += p;
      else tr.vers[s + k] += p;
    }
    T.push(tr);
  }

  // Système triangulaire : les X ne se déverrouillent jamais.
  const R = new Float64Array(nbEtats);
  const E = new Float64Array(nbEtats);
  for (let s = nbEtats - 1; s >= 0; s--) {
    const tr = T[s];
    const boucle = tr.vers[s];
    let rSuite = 0, eSuite = 0;
    for (let u = s + 1; u < nbEtats; u++) {
      rSuite += tr.vers[u] * R[u];
      eSuite += tr.vers[u] * E[u];
    }
    const denom = 1 - boucle;
    if (denom <= 1e-12) { R[s] = 0; E[s] = Infinity; continue; }
    R[s] = (tr.reussite + rSuite) / denom;
    E[s] = (1 + eSuite) / denom;
  }

  const parLancer = [];
  let etat = new Float64Array(nbEtats);
  etat[0] = 1;
  for (let n = 0; n < 40; n++) {
    const suiv = new Float64Array(nbEtats);
    let reussiCeTour = 0;
    for (let s = 0; s < nbEtats; s++) {
      if (etat[s] === 0) continue;
      reussiCeTour += etat[s] * T[s].reussite;
      for (let u = s; u < nbEtats; u++) suiv[u] += etat[s] * T[s].vers[u];
    }
    parLancer.push(reussiCeTour);
    etat = suiv;
  }

  return {
    reussite: R[0],
    perdu: 1 - R[0],
    lancersMoyens: E[0],
    lancersSiReussite: esperanceConditionnelle(T, nbEtats),
    premierLancer: T[0].reussite,
    parLancer,
  };
}

function esperanceConditionnelle(T, nbEtats, maxLancers = 400) {
  let etat = new Float64Array(nbEtats);
  etat[0] = 1;
  let masse = 0, somme = 0;
  for (let n = 1; n <= maxLancers; n++) {
    const suiv = new Float64Array(nbEtats);
    let reussi = 0;
    for (let s = 0; s < nbEtats; s++) {
      if (etat[s] === 0) continue;
      reussi += etat[s] * T[s].reussite;
      for (let u = s; u < nbEtats; u++) suiv[u] += etat[s] * T[s].vers[u];
    }
    masse += reussi;
    somme += reussi * n;
    etat = suiv;
    let reste = 0;
    for (let s = 0; s < nbEtats; s++) reste += etat[s];
    if (reste < 1e-12) break;
  }
  return masse > 0 ? somme / masse : Infinity;
}

/**
 * Même course, mais en gardant les dés utiles au lieu de tout relancer — c'est
 * ainsi qu'on joue réellement. Il n'y a pas de forme close simple : on l'estime
 * par tirages, avec un générateur passé en paramètre pour rester reproductible.
 */
export function courseAvecGarde(faces, nbDes, requis, opts = {}, tirages = 60000, alea = Math.random) {
  const {
    bloquant = 'x', seuilBloquant = 2, arretsForces = [],
    prioritaire = false, estArretForce = false,
  } = opts;
  let succes = 0, lancersTot = 0, lancersSucces = 0;

  for (let g = 0; g < tirages; g++) {
    const des = new Array(nbDes).fill(null);
    const fige = new Array(nbDes).fill(false);
    let n = 0, gagne = false;
    for (;;) {
      n++;
      // On garde les dés qui servent la combinaison, dans la limite du requis :
      // d'abord ceux qui portent le symbole voulu, puis les jokers, qui prennent
      // la place de ce qui manque encore.
      const besoin = { ...requis };
      const garder = new Array(nbDes).fill(false);
      for (let i = 0; i < nbDes; i++) {
        const s = des[i];
        if (fige[i]) { garder[i] = true; if (besoin[s] > 0) besoin[s]--; continue; }
        if (s && besoin[s] > 0) { besoin[s]--; garder[i] = true; }
      }
      for (let i = 0; i < nbDes; i++) {
        if (garder[i] || !des[i]) continue;
        const peut = remplacements(des[i]);
        const cible = peut && peut.find((sy) => besoin[sy] > 0);
        if (cible) { besoin[cible]--; garder[i] = true; }
      }
      for (let i = 0; i < nbDes; i++) if (!garder[i]) des[i] = null;
      for (let i = 0; i < nbDes; i++) {
        if (fige[i] || des[i] !== null) continue;
        des[i] = faces[(alea() * faces.length) | 0];
        if (des[i] === bloquant) fige[i] = true;
      }
      const compte = {};
      for (const s of des) compte[s] = (compte[s] || 0) + 1;
      const bloque = (compte[bloquant] || 0) >= seuilBloquant;
      const cible = servie(compte, requis);

      if (cible && (prioritaire || estArretForce)) { gagne = true; break; }
      if (bloque) break;
      if (arretsForces.some((a) => servie(compte, a.requis))) break;
      if (cible) { gagne = true; break; }
      if (n > 300) break;
    }
    lancersTot += n;
    if (gagne) { succes++; lancersSucces += n; }
  }

  return {
    reussite: succes / tirages,
    lancersMoyens: lancersTot / tirages,
    lancersSiReussite: succes ? lancersSucces / succes : Infinity,
  };
}

/** Nombre moyen de lancers avant de perdre le lot, sans rien chercher. */
export function esperanceAvantPerte(faces, nbDes, opts = {}) {
  return courseCombinaison(faces, nbDes, { __introuvable: 99 }, opts).lancersMoyens;
}
