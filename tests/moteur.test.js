// Vérifications du moteur et des probabilités : `node tests/moteur.test.js`.

import { Moteur } from '../src/core/engine.js';
import { configParDefaut } from '../src/core/config.js';
import { lancerCampagne } from '../src/core/sim.js';
import {
  courseCombinaison, courseAvecGarde, probaLancerUnique, loiDuDe,
} from '../src/core/proba.js';

let echecs = 0;
function verifier(nom, condition, detail = '') {
  if (condition) console.log(`  ok   ${nom}`);
  else { echecs++; console.log(`  ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}

// ── 1. Toute partie se termine, de 3 à 9 joueurs ─────────────────────────────
console.log('\nParties menées à terme');
for (const n of [3, 4, 5, 6, 7, 8, 9]) {
  const cfg = configParDefaut(n);
  const spec = Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  let parCartes = 0, manches = 0, duree = 0;
  const N = 60;
  for (let g = 0; g < N; g++) {
    const r = new Moteur(cfg, spec, `test-${n}-${g}`).jouerJusquAuBout();
    if (r.raison === 'cartes') parCartes++;
    manches += r.manches;
    duree += r.duree;
  }
  verifier(
    `${n} joueurs — ${parCartes}/${N} parties gagnées aux cartes, `
    + `${(manches / N).toFixed(1)} manches, ${(duree / N / 60000).toFixed(1)} min`,
    parCartes === N,
  );
}

// ── 2. Déterminisme : même graine, même résultat ─────────────────────────────
console.log('\nReproductibilité');
{
  const cfg = configParDefaut(6);
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'temeraire' }));
  const a = new Moteur(cfg, spec, 'graine-fixe').jouerJusquAuBout();
  const b = new Moteur(cfg, spec, 'graine-fixe').jouerJusquAuBout();
  verifier('deux parties de même graine sont identiques',
    JSON.stringify(a) === JSON.stringify(b));
  const c = new Moteur(cfg, spec, 'autre-graine').jouerJusquAuBout();
  verifier('une graine différente donne une autre partie',
    JSON.stringify(a) !== JSON.stringify(c));
}

// ── 3. Probabilités exactes contre Monte-Carlo ───────────────────────────────
console.log('\nProbabilités exactes');
{
  const faces = ['tornade', 'tornade', 'x', 'zzz', 'vache', 'eclair'];
  const D = 4, N = 200000;
  const OPTS = { bloquant: 'x', seuilBloquant: 2, arretsForces: [{ requis: { eclair: 3 } }] };

  // Référence indépendante : on rejoue la course à la main.
  const mc = (requis, opts) => {
    const { prioritaire = false, estArretForce = false } = opts;
    let succes = 0, lancers = 0;
    for (let g = 0; g < N; g++) {
      let s = 0, n = 0;
      for (;;) {
        n++;
        const c = { x: s };
        for (let i = 0; i < D - s; i++) {
          const f = faces[(Math.random() * faces.length) | 0];
          c[f] = (c[f] || 0) + 1;
        }
        const k = (c.x || 0) - s;
        const bloque = s + k >= 2;
        const cible = Object.entries(requis).every(([sy, q]) => (c[sy] || 0) >= q);
        if (cible && (prioritaire || estArretForce)) { succes++; break; }
        if (bloque) break;
        if ((c.eclair || 0) >= 3) break;
        if (cible) { succes++; break; }
        s += k;
        if (n > 300) break;
      }
      lancers += n;
    }
    return { reussite: succes / N, lancersMoyens: lancers / N };
  };

  const loi = loiDuDe(faces);
  verifier('loi du dé : tornade à 1/3', Math.abs(loi.tornade - 1 / 3) < 1e-9);
  verifier('loi du dé : X à 1/6', Math.abs(loi.x - 1 / 6) < 1e-9);
  verifier('3 tornades au premier lancer = 1/9',
    Math.abs(probaLancerUnique(faces, D, { tornade: 3 }) - 1 / 9) < 1e-9);

  for (const [nom, requis, opts] of [
    ['3 tornades', { tornade: 3 }, {}],
    ['3 vaches', { vache: 3 }, {}],
    ['3 éclairs (obligatoire)', { eclair: 3 }, { estArretForce: true }],
    ['1 de chaque (carte)', { tornade: 1, vache: 1, zzz: 1, eclair: 1 }, { prioritaire: true }],
  ]) {
    const e = courseCombinaison(faces, D, requis, { ...OPTS, ...opts });
    const m = mc(requis, opts);
    const dR = Math.abs(e.reussite - m.reussite);
    const dL = Math.abs(e.lancersMoyens - m.lancersMoyens);
    verifier(
      `${nom} — réussite ${(e.reussite * 100).toFixed(2)} % (MC ${(m.reussite * 100).toFixed(2)} %), `
      + `${e.lancersMoyens.toFixed(2)} lancers (MC ${m.lancersMoyens.toFixed(2)})`,
      dR < 0.01 && dL < 0.06,
      `écarts ${dR.toFixed(4)} / ${dL.toFixed(4)}`,
    );
  }

  // Garder ses dés utiles doit faire nettement mieux que tout relancer.
  const tout = courseCombinaison(faces, D, { vache: 3 }, OPTS);
  const garde = courseAvecGarde(faces, D, { vache: 3 }, OPTS, 40000);
  verifier(
    `garder les dés utiles paie : ${(garde.reussite * 100).toFixed(1)} % contre `
    + `${(tout.reussite * 100).toFixed(1)} % en relançant tout`,
    garde.reussite > tout.reussite * 2,
  );
}

// ── 4. Une campagne produit un agrégat cohérent ──────────────────────────────
console.log('\nCampagne du Laboratoire');
{
  const cfg = configParDefaut(6);
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const r = lancerCampagne(cfg, spec, 'campagne-test', 120);
  const totalVictoires = Object.values(r.victoires).reduce((a, b) => a + b, 0);
  verifier('toutes les parties ont un vainqueur comptabilisé', totalVictoires === 120);
  verifier('aucune partie interrompue par une limite', !r.raisons.limite && !r.raisons.manchesMax);
  verifier('des collisions ont été tentées', r.collisions.tentees > 0);
  verifier('des jetons viennent des vaches et des collisions',
    r.jetonsParSource.vache > 0 && r.jetonsParSource.collision > 0);
  verifier('la durée médiane est plausible (10 s – 30 min)',
    r.duree.medianeMs > 10000 && r.duree.medianeMs < 1800000,
    `${(r.duree.medianeMs / 60000).toFixed(1)} min`);
}

console.log(echecs ? `\n${echecs} vérification(s) en échec.\n` : '\nToutes les vérifications passent.\n');
process.exit(echecs ? 1 : 0);
