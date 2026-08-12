// Vérifications du moteur et des probabilités : `node tests/moteur.test.js`.

import { Moteur } from '../src/core/engine.js';
import { configParDefaut, comboServie, PROFILS_IA, placement } from '../src/core/config.js';
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

// ── 1 bis. Un joueur ne tient jamais deux lots ───────────────────────────────
console.log('\nUn seul lot par joueur');
for (const n of [3, 6, 9]) {
  const cfg = configParDefaut(n);
  const spec = Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'temeraire' }));
  let fautes = 0, controles = 0, poussees = 0;
  for (let g = 0; g < 25; g++) {
    const m = new Moteur(cfg, spec, `pousse-${n}-${g}`);
    m.onEtatChange = () => {
      controles++;
      if (m.joueurs.some((j) => j.lots.length > 1)) fautes++;
    };
    const r = m.jouerJusquAuBout();
    poussees += r.joueurs.reduce((t, j) => t + (j.stats.combos.__pousse || 0), 0);
  }
  verifier(`${n} joueurs — ${controles} contrôles, aucun joueur à deux lots`, fautes === 0,
    `${fautes} occurrence(s)`);
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

// ── 3 bis. Le joker ──────────────────────────────────────────────────────────
console.log('\nJokers');
{
  const PEUT = { joker: ['tornade', 'vache', 'zzz', 'eclair'], jokerDouble: ['eclair', 'zzz'] };
  const FACES_J = ['tornade', 'joker', 'x', 'zzz', 'vache', 'eclair'];

  // Référence indépendante : on essaie toutes les affectations possibles des
  // jokers, sans aucune théorie — c'est lent, mais indiscutable.
  function servieForce(compte, requis) {
    const fixe = {};
    const des = [];
    for (const [s, n] of Object.entries(compte)) {
      for (let i = 0; i < n; i++) {
        if (PEUT[s]) des.push([s, ...PEUT[s]]);
        else fixe[s] = (fixe[s] || 0) + 1;
      }
    }
    const atteint = (etat) =>
      Object.entries(requis).every(([s, n]) => n <= 0 || (etat[s] || 0) >= n);
    const rec = (k, etat) => {
      if (k === des.length) return atteint(etat);
      for (const face of des[k]) {
        const suiv = { ...etat };
        suiv[face] = (suiv[face] || 0) + 1;
        if (rec(k + 1, suiv)) return true;
      }
      return false;
    };
    return rec(0, fixe);
  }

  // Toutes les mains de 4 dés sur un jeu de faces qui contient les deux jokers,
  // contre toutes les exigences du jeu.
  const SYMS = ['tornade', 'vache', 'zzz', 'eclair', 'joker', 'jokerDouble', 'x'];
  const EXIGENCES = [
    { tornade: 3 }, { vache: 3 }, { zzz: 3 }, { eclair: 3 }, { x: 2 }, { joker: 3 },
    { eclair: 4 }, { vache: 4 }, { tornade: 4 }, { zzz: 4 },
    { vache: 2, tornade: 2 }, { vache: 2, zzz: 2 },
    { tornade: 1, vache: 1, zzz: 1, eclair: 1 }, { joker: 2, eclair: 1 },
  ];
  let mains = 0, ecarts = 0;
  const mainsDe = (k, debut, courant) => {
    if (k === 0) {
      mains++;
      for (const requis of EXIGENCES) {
        if (comboServie(courant, requis) !== servieForce(courant, requis)) ecarts++;
      }
      return;
    }
    for (let i = debut; i < SYMS.length; i++) {
      const s = SYMS[i];
      courant[s] = (courant[s] || 0) + 1;
      mainsDe(k - 1, i, courant);
      courant[s]--;
    }
  };
  mainsDe(4, 0, {});
  verifier(`${mains} mains × ${EXIGENCES.length} exigences : les jokers sont placés au mieux`,
    ecarts === 0, `${ecarts} désaccord(s) avec l’énumération brute`);

  // Le calcul exact doit rester exact une fois les jokers dans le dé.
  const D = 4, N = 200000;
  const ARRETS = [{ requis: { eclair: 3 } }, { requis: { joker: 3 } }];
  const mcJoker = (requis, estArretForce = false) => {
    let succes = 0, lancers = 0;
    for (let g = 0; g < N; g++) {
      let figes = 0, n = 0;
      for (;;) {
        n++;
        const c = { x: figes };
        for (let i = 0; i < D - figes; i++) {
          const f = FACES_J[(Math.random() * FACES_J.length) | 0];
          c[f] = (c[f] || 0) + 1;
        }
        const nouveauxX = (c.x || 0) - figes;
        const cible = servieForce(c, requis);
        if (cible && estArretForce) { succes++; break; }
        if (figes + nouveauxX >= 2) break;
        if (ARRETS.some((a) => servieForce(c, a.requis))) break;
        if (cible) { succes++; break; }
        figes += nouveauxX;
        if (n > 300) break;
      }
      lancers += n;
    }
    return { reussite: succes / N, lancersMoyens: lancers / N };
  };

  for (const [nom, requis, estArretForce] of [
    ['3 tornades (avec joker)', { tornade: 3 }, false],
    ['3 vaches (avec joker)', { vache: 3 }, false],
    ['3 jokers — l’échec', { joker: 3 }, true],
  ]) {
    const e = courseCombinaison(FACES_J, D, requis, {
      bloquant: 'x', seuilBloquant: 2, arretsForces: ARRETS, estArretForce,
    });
    const m = mcJoker(requis, estArretForce);
    const dR = Math.abs(e.reussite - m.reussite);
    const dL = Math.abs(e.lancersMoyens - m.lancersMoyens);
    verifier(
      `${nom} — réussite ${(e.reussite * 100).toFixed(2)} % (MC ${(m.reussite * 100).toFixed(2)} %), `
      + `${e.lancersMoyens.toFixed(2)} lancers (MC ${m.lancersMoyens.toFixed(2)})`,
      dR < 0.01 && dL < 0.06,
      `écarts ${dR.toFixed(4)} / ${dL.toFixed(4)}`,
    );
  }

  // Ce que le joker change à l'équilibre : il met les quatre symboles à égalité,
  // et se paie sur le réveil, qui bénéficiait seul de la seconde tornade.
  const OPTS_J = { bloquant: 'x', seuilBloquant: 2, arretsForces: ARRETS };
  const OPTS_SANS = { bloquant: 'x', seuilBloquant: 2, arretsForces: [{ requis: { eclair: 3 } }] };
  const FACES_SANS = ['tornade', 'tornade', 'x', 'zzz', 'vache', 'eclair'];
  const p = (faces, requis, opts) => courseCombinaison(faces, D, requis, opts).reussite;

  const quatre = ['tornade', 'vache', 'zzz'].map((s) => p(FACES_J, { [s]: 3 }, OPTS_J));
  verifier(
    `le joker met les symboles à égalité : ${quatre.map((x) => (x * 100).toFixed(1)).join(' / ')} %`,
    Math.max(...quatre) - Math.min(...quatre) < 0.005,
  );
  const vacheAvant = p(FACES_SANS, { vache: 3 }, OPTS_SANS);
  const vacheApres = p(FACES_J, { vache: 3 }, OPTS_J);
  const reveilAvant = p(FACES_SANS, { tornade: 3 }, OPTS_SANS);
  const reveilApres = p(FACES_J, { tornade: 3 }, OPTS_J);
  verifier(
    `trois vaches passent de ${(vacheAvant * 100).toFixed(1)} % à ${(vacheApres * 100).toFixed(1)} %, `
    + `le réveil de ${(reveilAvant * 100).toFixed(1)} % à ${(reveilApres * 100).toFixed(1)} %`,
    vacheApres > vacheAvant * 3 && reveilApres < reveilAvant,
  );

  // À la table : trois jokers font partir le lot, et rien d'autre.
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const poser = (lot, syms) => {
    lot.des.forEach((d, i) => {
      d.sym = syms[i]; d.roule = false; d.finRoule = 0; d.verrou = syms[i] === 'x';
    });
    lot.lance = true;
  };

  {
    const m = new Moteur(configParDefaut(6), spec, 'joker-echec');
    const j = m.joueurs.find((x) => x.lots.length);
    poser(j.lots[0], ['joker', 'joker', 'joker', 'vache']);
    const dispo = m.combosDisponibles(j);
    verifier('trois jokers servent aussi d’autres combinaisons',
      dispo.length > 1, dispo.map((d) => d.id).join(','));
    verifier('… mais c’est l’échec qui est joué',
      m._comboAJouer(j, dispo).id === 'echecJokers');
  }
  {
    const m = new Moteur(configParDefaut(6, { echecJokers: false }), spec, 'joker-libre');
    const j = m.joueurs.find((x) => x.lots.length);
    poser(j.lots[0], ['joker', 'joker', 'joker', 'vache']);
    const choisi = m._comboAJouer(j, m.combosDisponibles(j));
    verifier('règle décochée : trois jokers servent la combinaison voulue',
      choisi && choisi.id !== 'echecJokers', choisi ? choisi.id : 'aucune');
  }

  // La carte du jour ne se discute pas : elle est jouée sans proposer le choix.
  {
    const humains = spec.map((s, i) => (i === 0 ? { ...s, type: 'humain' } : s));
    const cfg = configParDefaut(6);
    // « Journée intensive » : 2 tornades + 2 vaches, servies par deux jokers.
    cfg.cartes = ['intensive'];
    cfg.melangerCartes = false;
    const m = new Moteur(cfg, humains, 'carte-office');
    const j = m.joueurs[0];
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    poser(j.lots[0], ['tornade', 'tornade', 'joker', 'joker']);
    const dispo = m.combosDisponibles(j);
    verifier(`la carte et le réveil sont servis au même jet (${dispo.map((d) => d.id).join(', ')})`,
      dispo.length > 1 && dispo.some((d) => d.source === 'journee'));
    m._finLancer(j, []);
    verifier('la carte est jouée d’office, aucun choix n’est proposé',
      j.departEnAttente && !j.departEnAttente.options
      && j.departEnAttente.dispo.source === 'journee');
  }

  // Le joueur humain tranche entre les combinaisons que le joker lui sert.
  {
    const humains = spec.map((s, i) => (i === 0 ? { ...s, type: 'humain' } : s));
    const m = new Moteur(configParDefaut(6), humains, 'joker-choix');
    const j = m.joueurs[0];
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    poser(j.lots[0], ['joker', 'joker', 'eclair', 'tornade']);
    m._finLancer(j, []);
    const options = j.departEnAttente && j.departEnAttente.options;
    verifier('deux combinaisons servies : le choix est offert',
      !!options && options.length === 2, options ? options.map((o) => o.id).join(',') : 'aucune');
    verifier('le défaut suit la priorité du moteur',
      j.departEnAttente.dispo.id === 'collision');
    verifier('le joueur peut lui préférer le réveil',
      m.choisirCombo(0, 'reveil') && j.departEnAttente.dispo.id === 'reveil'
      && j.departEnAttente.motif === 'combo');
    m.avancerJusqua(m.now + 5000);
    // On mesure le réveil joué, pas l'état final : un voisin peut le rendormir
    // dans la seconde — les profils pénibles ne s'en privent pas.
    verifier('c’est bien le réveil qui a été joué',
      j.stats.combos.reveil === 1 && j.stats.reveils === 1 && !j.stats.combos.collision);
  }
}

// ── 3 ter. L'attrape peut emporter la manche ─────────────────────────────────
console.log('\nAttrape gagnante');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  // Le signal du jeton part bien du joueur qui vient de le retourner.
  {
    const m = new Moteur(configParDefaut(6), spec, 'jeton-signal');
    const recus = [];
    m.onJeton = (pid, equipe, n, source) => recus.push({ pid, equipe, n, source });
    m.jouerJusquAuBout();
    const total = m.joueurs.reduce((a, j) => a + j.stats.jetonsRetournes, 0);
    verifier(`${recus.length} jetons annoncés, autant que de jetons retournés`,
      recus.reduce((a, r) => a + r.n, 0) === total && total > 0);
    verifier('chaque annonce porte l’équipe du joueur qui l’a gagné',
      recus.every((r) => m.joueurs[r.pid].equipe === r.equipe));
  }

  // Variante « le contact réussi emporte la manche ».
  for (const mode of ['touche', 'combo']) {
    const cfg = configParDefaut(6);
    cfg.attrapeGagneManche = mode;
    const m = new Moteur(cfg, spec, `attrape-${mode}`);
    m.jouerJusquAuBout();
    const parAttrape = m.journal.filter((e) => /remportent la manche/.test(e.texte)).length;
    const manchesGagnees = m.statsManches.filter((s) => s.vainqueur).length;
    verifier(`mode « ${mode} » — partie menée à terme en ${m.manche} manches, vainqueur ${m.vainqueur}`,
      m.termine && !!m.vainqueur && manchesGagnees > 0, `raison ${m.raisonFin}`);
    verifier(`mode « ${mode} » — des manches sont bien emportées à l’attrape (${parAttrape})`,
      parAttrape > 0);
    if (mode === 'combo') {
      verifier('mode « combo » — plus aucune tentative de contact',
        m.joueurs.every((j) => j.stats.collisionsTentees === 0));
    } else {
      verifier('mode « touche » — le contact est toujours tenté',
        m.joueurs.some((j) => j.stats.collisionsTentees > 0));
    }
  }

  // Règle de base inchangée : l'attrape ne rapporte qu'un jeton.
  {
    const m = new Moteur(configParDefaut(6), spec, 'attrape-non');
    m.jouerJusquAuBout();
    verifier('sans la variante, aucune manche n’est emportée à l’attrape',
      !m.journal.some((e) => /attrape/i.test(e.texte) && /remportent la manche/.test(e.texte)));
  }
}

// ── 3 ter. L'attrape suppose quelqu'un à attraper ────────────────────────────
console.log('\nAttrape à vide');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const poser = (lot, syms) => {
    lot.des.forEach((d, i) => {
      d.sym = syms[i]; d.roule = false; d.finRoule = 0; d.verrou = syms[i] === 'x';
    });
    lot.lance = true;
  };

  const m = new Moteur(configParDefaut(6), spec, 'attrape-vide');
  const j = m.joueurs.find((x) => x.lots.length);
  const suivant = m._suivant(j);
  const lot = j.lots[0];

  // Voisin les mains vides : les trois éclairs ne valent rien.
  suivant.lots = [];
  poser(lot, ['eclair', 'eclair', 'eclair', 'tornade']);
  verifier('voisin sans lot : l’attrape n’est pas servie',
    !m.combosDisponibles(j).some((d) => d.id === 'collision'));
  m._finLancer(j, []);
  verifier('… le lot reste en main, on peut relancer',
    j.lots[0] === lot && !j.fige && !j.departEnAttente);

  // Voisin qui tient un lot : l'attrape redevient possible.
  suivant.lots = [m._nouveauLot()];
  poser(lot, ['eclair', 'eclair', 'eclair', 'tornade']);
  verifier('voisin avec un lot : l’attrape est servie',
    m.combosDisponibles(j).some((d) => d.id === 'collision'));
  m._finLancer(j, []);
  verifier('… et le lot part pour la tenter',
    !!j.departEnAttente && j.departEnAttente.motif === 'attrape');
}

// ── 3 ter ter. Les deux nouveaux modes de partie ─────────────────────────────
console.log('\nModes de partie');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const poser = (lot, syms) => {
    lot.des.forEach((d, i) => {
      d.sym = syms[i]; d.roule = false; d.finRoule = 0; d.verrou = syms[i] === 'x';
    });
    lot.lance = true;
  };

  // ── Attrape sur échec : plus de face éclair, le double X tente le contact ──
  const cfgEchec = configParDefaut(6, { attrapeSur: 'echec' });
  verifier(`le dé perd sa face éclair (${cfgEchec.faces.join(', ')})`,
    !cfgEchec.faces.includes('eclair'));
  verifier('et la combinaison des trois éclairs disparaît',
    !cfgEchec.combos.some((c) => c.id === 'collision'));

  {
    const m = new Moteur(cfgEchec, spec, 'echec-attrape');
    const j = m.joueurs.find((x) => x.lots.length);
    const suivant = m._suivant(j);
    suivant.lots = [m._nouveauLot()];
    poser(j.lots[0], ['x', 'x', 'tornade', 'vache']);
    m._finLancer(j, []);
    verifier('voisin chargé : l’échec part en tentant l’attrape',
      j.departEnAttente && j.departEnAttente.motif === 'attrape'
      && j.departEnAttente.dispo.id === 'blocage');
    m.avancerJusqua(m.now + 4000);
    verifier('… et le contact est bien tenté', j.stats.collisionsTentees === 1);
  }
  {
    const m = new Moteur(cfgEchec, spec, 'echec-sans-cible');
    const j = m.joueurs.find((x) => x.lots.length);
    m._suivant(j).lots = [];
    poser(j.lots[0], ['x', 'x', 'tornade', 'vache']);
    m._finLancer(j, []);
    verifier('voisin vide : l’échec reste un échec',
      j.departEnAttente && j.departEnAttente.motif === 'combo');
  }
  {
    const cfg = configParDefaut(6, { attrapeSur: 'echec' });
    let contacts = 0, parties = 0;
    for (let g = 0; g < 20; g++) {
      const r = new Moteur(cfg, spec, `echec-partie-${g}`).jouerJusquAuBout();
      if (r.raison === 'cartes') parties++;
      contacts += r.joueurs.reduce((a, j) => a + j.stats.collisionsTentees, 0);
    }
    verifier(`mode « attrape sur échec » — 20 parties menées à terme, ${(contacts / 20).toFixed(1)} contacts par partie`,
      parties === 20 && contacts > 0);
  }

  // ── Lots empilés : plus de poussée, les lots attendent leur tour ──────────
  {
    const cfg = configParDefaut(6, { lotsCumules: true });
    let maxEnMain = 0, poussees = 0, finies = 0;
    for (let g = 0; g < 20; g++) {
      const m = new Moteur(cfg, spec, `cumul-${g}`);
      m.onEtatChange = () => {
        maxEnMain = Math.max(maxEnMain, ...m.joueurs.map((j) => j.lots.length));
      };
      m.onJournal = (e) => { if (e.issue === 'Poussé') poussees++; };
      const r = m.jouerJusquAuBout();
      if (r.raison === 'cartes') finies++;
    }
    verifier(`lots empilés — jusqu’à ${maxEnMain} lots dans la même main`, maxEnMain >= 2);
    verifier('… et plus aucune poussée', poussees === 0);
    verifier('… 20 parties menées à terme', finies === 20, `${finies}/20`);
  }
  {
    // Règle de base : la poussée reprend, et personne ne tient deux lots.
    const cfg = configParDefaut(6);
    let maxEnMain = 0;
    const m = new Moteur(cfg, spec, 'sans-cumul');
    m.onEtatChange = () => {
      maxEnMain = Math.max(maxEnMain, ...m.joueurs.map((j) => j.lots.length));
    };
    m.jouerJusquAuBout();
    verifier('sans l’option, un joueur ne tient toujours qu’un lot', maxEnMain === 1);
  }
}

// ── 3 ter bis. Les moments à souligner sont signalés ─────────────────────────
console.log('\nÉclats d\u2019écran');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const poser = (lot, syms) => {
    lot.des.forEach((d, i) => {
      d.sym = syms[i]; d.roule = false; d.finRoule = 0; d.verrou = syms[i] === 'x';
    });
    lot.lance = true;
  };

  // Réveil et échec : signalés pour celui qui les vit.
  {
    const m = new Moteur(configParDefaut(6), spec, 'flash-1');
    const vus = [];
    m.onFlash = (type, pid) => vus.push(`${type}:${pid}`);
    const j = m.joueurs.find((x) => x.lots.length);
    poser(j.lots[0], ['tornade', 'tornade', 'tornade', 'vache']);
    m._finLancer(j, []);
    m.avancerJusqua(m.now + 2000);
    verifier(`le réveil est signalé (${vus.join(', ') || 'rien'})`, vus.includes(`reveil:${j.id}`));
  }
  {
    const m = new Moteur(configParDefaut(6), spec, 'flash-2');
    const vus = [];
    m.onFlash = (type, pid) => vus.push(`${type}:${pid}`);
    const j = m.joueurs.find((x) => x.lots.length);
    poser(j.lots[0], ['x', 'x', 'tornade', 'vache']);
    m._finLancer(j, []);
    verifier(`l’échec est signalé (${vus.join(', ') || 'rien'})`, vus.includes(`echec:${j.id}`));
  }
  // Endormissement : signalé pour la victime, pas pour l'endormeur.
  {
    const m = new Moteur(configParDefaut(6), spec, 'flash-3');
    const vus = [];
    m.onFlash = (type, pid) => vus.push(`${type}:${pid}`);
    const j = m.joueurs.find((x) => x.lots.length);
    j.eveille = true;
    const voisins = m._voisinsDirects(j);
    voisins.forEach((v) => { v.eveille = true; });
    poser(j.lots[0], ['zzz', 'zzz', 'zzz', 'vache']);
    m._finLancer(j, []);
    m.avancerJusqua(m.now + 2000);
    const dormeur = vus.find((x) => x.startsWith('endormi:'));
    verifier(`l’endormissement est signalé pour la victime (${vus.join(', ') || 'rien'})`,
      !!dormeur && dormeur !== `endormi:${j.id}`
      && voisins.some((v) => dormeur === `endormi:${v.id}`));
  }
}

// ── 3 quater. Les caractères des IA font ce qu'ils annoncent ─────────────────
console.log('\nCaractères des IA');
{
  const N = 100;
  const par = {};
  for (const id of Object.keys(PROFILS_IA)) {
    const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i}`, type: 'ia', profil: id }));
    const r = lancerCampagne(configParDefaut(6), spec, `car-${id}`, N);
    par[id] = {
      reveil: (r.combos.reveil || 0) / N,
      vache: (r.combos.vache || 0) / N,
      zzz: (r.combos.endormir || 0) / N,
      attrape: (r.combos.collision || 0) / N,
      bloque: (r.combos.blocage || 0) / N,
    };
  }
  const dit = (id) => `${PROFILS_IA[id].nom} : ${par[id].reveil.toFixed(0)} réveils, `
    + `${par[id].vache.toFixed(0)} vaches, ${par[id].zzz.toFixed(0)} ZzZ, ${par[id].attrape.toFixed(0)} attrapes`;

  const maxSur = (cle) => Object.keys(par).reduce((a, b) => (par[b][cle] > par[a][cle] ? b : a));
  verifier(`le Logique retourne le plus de vaches — ${dit('logique')}`,
    maxSur('vache') === 'logique');
  verifier(`le Très agressif attrape le plus — ${dit('tresAgressif')}`,
    maxSur('attrape') === 'tresAgressif');
  verifier(`le Très pénible endort le plus — ${dit('tresPenible')}`,
    maxSur('zzz') === 'tresPenible');
  verifier(`l'Agressif attrape trois fois plus que le Logique — ${dit('agressif')}`,
    par.agressif.attrape > par.logique.attrape * 2.5);
  verifier('… mais se réveille et fait la vache quand même',
    par.agressif.reveil > 10 && par.agressif.vache > 5);
  verifier(`le Pénible endort trois fois plus que le Logique — ${dit('penible')}`,
    par.penible.zzz > par.logique.zzz * 2.5);
  verifier('… mais se réveille et fait la vache quand même',
    par.penible.reveil > 10 && par.penible.vache > 5);
  verifier(`l'Équilibré tient le milieu sur les deux axes — ${dit('equilibre')}`,
    par.equilibre.attrape > par.logique.attrape && par.equilibre.attrape < par.agressif.attrape
    && par.equilibre.zzz > par.logique.zzz && par.equilibre.zzz < par.penible.zzz);
  verifier(`l'Idiot gâche plus de lots que le Logique — ${dit('idiot')}`,
    par.idiot.bloque > par.logique.bloque * 1.4);

  // Le classement compte autant que les intentions : jouer pour gagner doit gagner.
  const duel = (a, b) => {
    const sieges = placement(6);
    const spec = sieges.map((eq, i) => ({ nom: `J${i}`, type: 'ia', profil: eq === 'bleu' ? a : b }));
    const r = lancerCampagne(configParDefaut(6), spec, `duel-${a}-${b}`, 200);
    return (r.victoires.bleu || 0) / 200;
  };
  const miroir = duel('equilibre', 'equilibre');
  verifier(`deux équipes identiques font jeu égal (${(miroir * 100).toFixed(0)} % pour les Bleus)`,
    Math.abs(miroir - 0.5) < 0.12);
  const logiqueVsIdiot = duel('logique', 'idiot');
  verifier(`le Logique écrase l'Idiot (${(logiqueVsIdiot * 100).toFixed(0)} %)`, logiqueVsIdiot > 0.8);
  const logiqueVsPenible = duel('logique', 'penible');
  verifier(`le Logique l'emporte sur le Pénible (${(logiqueVsPenible * 100).toFixed(0)} %)`,
    logiqueVsPenible > 0.6);
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
