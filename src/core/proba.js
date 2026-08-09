// Probabilités exactes des dés TornaDices.
//
// Deux niveaux de lecture :
//  1. la loi d'un lancer isolé (multinomiale) ;
//  2. la course entre une combinaison recherchée et la collision forcée par les
//     étoiles, qui se verrouillent et ne se relancent jamais — chaîne de Markov
//     absorbante à deux issues : « réussi » ou « collision ».

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
  const c = new Array(t).fill(0);
  function* rec(i, reste) {
    if (i === t - 1) { c[i] = reste; yield c.slice(); return; }
    for (let v = 0; v <= reste; v++) { c[i] = v; yield* rec(i + 1, reste - v); }
  }
  if (t === 0) return;
  yield* rec(0, m);
}

function probaRepartition(c, probs, m) {
  let p = fact(m);
  for (let i = 0; i < c.length; i++) { p /= fact(c[i]); p *= Math.pow(probs[i], c[i]); }
  return p;
}

/** P(la combinaison `requis` est servie sur un lancer neuf de `nbDes` dés). */
export function probaLancerUnique(faces, nbDes, requis) {
  const loi = loiDuDe(faces);
  const symboles = Object.keys(loi);
  const probs = symboles.map((s) => loi[s]);
  let total = 0;
  for (const c of repartitions(symboles, nbDes)) {
    const compte = {};
    symboles.forEach((s, i) => { compte[s] = c[i]; });
    if (Object.entries(requis).every(([s, n]) => (compte[s] || 0) >= n)) {
      total += probaRepartition(c, probs, nbDes);
    }
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
 * Course « combinaison contre collision ».
 *
 * @param {string[]} faces        faces du dé
 * @param {number}   nbDes        dés par lot
 * @param {object}   requis       combinaison recherchée, ex. { vache: 3 }
 * @param {number}   seuilEtoile  nombre d'étoiles qui force la collision
 * @param {boolean}  prioritaire  vrai pour les combos de carte Journée, qui
 *                                l'emportent sur la collision au même lancer
 * @returns {{reussite:number, collision:number, lancersMoyens:number,
 *            lancersSiReussite:number, premierLancer:number, parLancer:number[]}}
 */
export function courseCombinaison(faces, nbDes, requis, seuilEtoile = 2, prioritaire = false) {
  const loi = loiDuDe(faces);
  const symboles = Object.keys(loi);
  const probs = symboles.map((s) => loi[s]);
  const iEtoile = symboles.indexOf('etoile');
  const nbEtats = Math.max(1, seuilEtoile); // étoiles déjà verrouillées : 0 .. seuil-1

  // transition[s] = { reussite, collision, versEtat: Float64Array }
  const T = [];
  for (let s = 0; s < nbEtats; s++) {
    const m = Math.max(0, nbDes - s);
    const tr = { reussite: 0, collision: 0, vers: new Float64Array(nbEtats) };
    if (m === 0) {
      // Plus un seul dé libre : la chasse s'arrête, le lot part sans la combinaison.
      tr.collision = 1;
      T.push(tr);
      continue;
    }
    for (const c of repartitions(symboles, m)) {
      const p = probaRepartition(c, probs, m);
      if (p === 0) continue;
      const compte = {};
      symboles.forEach((sy, i) => { compte[sy] = c[i]; });
      compte.etoile = (compte.etoile || 0) + s; // les étoiles verrouillées comptent
      const k = iEtoile >= 0 ? c[iEtoile] : 0;
      const collision = s + k >= seuilEtoile;
      const servie = Object.entries(requis).every(([sy, n]) => (compte[sy] || 0) >= n);
      if (servie && (prioritaire || !collision)) tr.reussite += p;
      else if (collision) tr.collision += p;
      else tr.vers[s + k] += p;
    }
    T.push(tr);
  }

  // Résolution directe : R[s] = P(réussir depuis s), E[s] = espérance de lancers.
  // Le système est triangulaire (les étoiles ne se déverrouillent jamais), donc
  // on remonte des états les plus chargés vers l'état neuf.
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

  // E[lancers | réussite] : obtenue par itération sur la distribution, plus
  // lisible que la forme close et le nombre d'états est minuscule.
  const lancersSiReussite = esperanceConditionnelle(T, nbEtats);

  const parLancer = [];
  {
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
  }

  return {
    reussite: R[0],
    collision: 1 - R[0],
    lancersMoyens: E[0],
    lancersSiReussite,
    premierLancer: T[0].reussite,
    parLancer,
  };
}

// E[nombre de lancers | réussite], par itération sur la distribution.
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
 * Tableau de synthèse : une ligne par combinaison, prête pour l'affichage.
 */
export function tableauCombinaisons(cfg, combos, seuilEtoile) {
  const seuil = seuilEtoile ?? (combos.find((c) => c.id === 'collision')?.requis?.etoile ?? 2);
  return combos.map((c) => {
    const prioritaire = c.source === 'journee';
    const course = courseCombinaison(cfg.faces, cfg.desParLot, c.requis, seuil, prioritaire);
    return {
      id: c.id,
      nom: c.nom || c.id,
      requis: c.requis,
      source: c.source || 'tornade',
      premierLancer: course.premierLancer,
      reussite: course.reussite,
      lancersMoyens: course.lancersMoyens,
      lancersSiReussite: course.lancersSiReussite,
      secondesSiReussite: course.lancersSiReussite * (cfg.tempsLancer || 800) / 1000,
    };
  });
}

/** Nombre moyen de lancers avant que les étoiles ne forcent le passage du lot. */
export function esperanceAvantCollision(faces, nbDes, seuilEtoile = 2) {
  const r = courseCombinaison(faces, nbDes, { __impossible: 99 }, seuilEtoile, false);
  return r.lancersMoyens;
}
