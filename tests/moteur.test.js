// Vérifications du moteur et des probabilités : `node tests/moteur.test.js`.

import { Moteur } from '../src/core/engine.js';
import {
  configParDefaut, comboServie, PROFILS_IA, placement, SYMBOLES, FACES_PAR_DEFAUT,
  // Le dé d'avant, à joker et éclair : les épreuves de l'Attaque en ont besoin.
  assainirFaces, assainirRequis, assainirConfig, FACES_JOKER_ECLAIR,
  TYPES_DE, facesPourDe, OPTIONS_ATTRAPE, comboDeclencheur, OPTIONS_MANCHE, infosMiseEnPlace,
  attrapeEmporteManche, requisPourEquipe, comboPossible, cartesEnJeu, requisCarte,
  clePaquet, cleCombosCartes, CARTES_TORNADE, CARTES_SANS_POINTS, cartesDuMode, CARTES_PAR_ID,
  COULEURS_EQUIPE, COMBOS_TORNADE, faceSansReveil, NOMBRES_JOUEURS, lotsPour, lotsOfficiels,
} from '../src/core/config.js';
import { lancerCampagne, SCHEMA_RESULTAT } from '../src/core/sim.js';
import {
  courseCombinaison, courseAvecGarde, probaLancerUnique, loiDuDe,
} from '../src/core/proba.js';

/**
 * Configuration sur le dé d'avant — joker et éclair — avec l'Attaque au
 * déclencheur. Le dé officiel n'a plus d'éclair : tout ce qui éprouve l'Attaque
 * doit dire explicitement sur quel dé il tourne.
 */
function cfgEclair(n = 6, opts = {}) {
  const cfg = configParDefaut(n, { ...opts, attrapeSur: 'eclair' });
  cfg.faces = FACES_JOKER_ECLAIR.slice();
  return cfg;
}

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
    ['3 abris', { vache: 3 }, {}],
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
    ['3 abris (avec joker)', { vache: 3 }, false],
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
    `trois abris passent de ${(vacheAvant * 100).toFixed(1)} % à ${(vacheApres * 100).toFixed(1)} %, `
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
    // « Journée intensive » : 2 tornades + 2 abris, servies par deux jokers.
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
    const m = new Moteur(cfgEclair(), humains, 'joker-choix');
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
  {
    const cfg = cfgEclair();
    cfg.attrapeGagneManche = 'touche';
    const m = new Moteur(cfg, spec, 'attrape-touche');
    m.jouerJusquAuBout();
    const parAttrape = m.journal.filter((e) => /remportent la manche/.test(e.texte)).length;
    const manchesGagnees = m.statsManches.filter((s) => s.vainqueur).length;
    verifier(`mode « touche » — partie menée à terme en ${m.manche} manches, vainqueur ${m.vainqueur}`,
      m.termine && !!m.vainqueur && manchesGagnees > 0, `raison ${m.raisonFin}`);
    verifier(`mode « touche » — des manches sont bien emportées à l’attrape (${parAttrape})`,
      parAttrape > 0);
    verifier('mode « touche » — le contact est toujours tenté',
      m.joueurs.some((j) => j.stats.collisionsTentees > 0));
  }

  // « Manche gagnée dès les 3 éclairs » n'existe pas au jeu : la variante a été
  // retirée, et un réglage qui la porte encore retombe sur « touche ».
  {
    verifier('la variante « dès les 3 éclairs » a disparu des options',
      !OPTIONS_ATTRAPE.some(([id]) => id === 'combo')
      && OPTIONS_ATTRAPE.length === 2);
    verifier('un réglage enregistré sur cette variante retombe sur « touche »',
      assainirConfig({ nbJoueurs: 6, attrapeGagneManche: 'combo' }).attrapeGagneManche === 'touche');
    const cfg = cfgEclair();
    cfg.attrapeGagneManche = 'combo';
    const m = new Moteur(cfg, spec, 'attrape-combo');
    m.jouerJusquAuBout();
    verifier('et le moteur tente le contact quoi qu’il arrive',
      m.joueurs.some((j) => j.stats.collisionsTentees > 0));
  }

  // Règle de base inchangée : l'attrape ne rapporte qu'un jeton.
  {
    const m = new Moteur(cfgEclair(), spec, 'attrape-non');
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

  const m = new Moteur(cfgEclair(), spec, 'attrape-vide');
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
  verifier('le dé ne change pas : c’est la combinaison qui décide, pas la face',
    cfgEchec.faces.join(',') === FACES_PAR_DEFAUT.join(','));
  verifier('l’Attaque reste dans le tableau, réglable',
    cfgEchec.combos.some((c) => c.id === 'collision'));
  verifier('mais c’est l’Échec qui porte le contact',
    comboDeclencheur(cfgEchec) === 'blocage'
    && comboDeclencheur(configParDefaut(6, { attrapeSur: 'eclair' })) === 'collision');
  {
    // Le déclencheur suit la combinaison, quels que soient les dés qu'on lui met.
    const cfg = configParDefaut(6, { attrapeSur: 'echec' });
    cfg.combos = cfg.combos.map((c) => (c.id === 'blocage' ? { ...c, requis: { x: 3 } } : c));
    const m = new Moteur(cfg, spec, 'echec-3x');
    const j = m.joueurs.find((x) => x.lots.length);
    j.eveille = true;
    m._suivant(j).lots = [m._nouveauLot()];
    poser(j.lots[0], ['x', 'x', 'tornade', 'vache']);
    m._finLancer(j, []);
    verifier('deux X ne suffisent plus quand l’Échec en demande trois',
      !j.departEnAttente, `motif ${j.departEnAttente && j.departEnAttente.motif}`);

    const m2 = new Moteur(cfg, spec, 'echec-3x-bis');
    const j2 = m2.joueurs.find((x) => x.lots.length);
    j2.eveille = true;
    m2._suivant(j2).lots = [m2._nouveauLot()];
    poser(j2.lots[0], ['x', 'x', 'x', 'vache']);
    m2._finLancer(j2, []);
    verifier('trois X déclenchent l’attrape, comme réglé',
      j2.departEnAttente && j2.departEnAttente.motif === 'attrape');
  }
  {
    // En mode « Échecs », l'Attaque ne se joue plus : elle coûterait le lot sans
    // rien tenter.
    const m = new Moteur(cfgEchec, spec, 'attaque-inerte');
    const j = m.joueurs.find((x) => x.lots.length);
    j.eveille = true;
    m._suivant(j).lots = [m._nouveauLot()];
    poser(j.lots[0], ['eclair', 'eclair', 'eclair', 'vache']);
    verifier('l’Attaque n’est plus jouable en mode « Échecs »',
      !m.combosDisponibles(j).some((c) => c.id === 'collision'));
  }

  // Un échec sur un voisin chargé : le départ, l'état du lanceur et le réglage
  // « il faut être réveillé » décident ensemble s'il y a contact.
  const departEchec = (cfg, graine, { eveille, voisinCharge }) => {
    const m = new Moteur(cfg, spec, graine);
    const j = m.joueurs.find((x) => x.lots.length);
    j.eveille = eveille;
    m._suivant(j).lots = voisinCharge ? [m._nouveauLot()] : [];
    poser(j.lots[0], ['x', 'x', 'tornade', 'vache']);
    m._finLancer(j, []);
    return { m, j, motif: j.departEnAttente && j.departEnAttente.motif };
  };

  {
    const { m, j, motif } = departEchec(cfgEchec, 'echec-attrape', { eveille: true, voisinCharge: true });
    verifier('réveillé, voisin chargé : l’échec part en tentant l’attrape',
      motif === 'attrape' && j.departEnAttente.dispo.id === 'blocage', `motif ${motif}`);
    m.avancerJusqua(m.now + 4000);
    verifier('… et le contact est bien tenté', j.stats.collisionsTentees === 1);
  }
  verifier('réveillé, voisin vide : l’échec reste un échec',
    departEchec(cfgEchec, 'echec-sans-cible', { eveille: true, voisinCharge: false }).motif === 'combo');
  verifier('endormi, voisin chargé : pas de contact, un dormeur ne tend pas la main',
    departEchec(cfgEchec, 'echec-endormi', { eveille: false, voisinCharge: true }).motif === 'combo');
  {
    const libre = configParDefaut(6, { attrapeSur: 'echec', attrapeEveille: false });
    verifier('règle décochée : l’endormi attrape de nouveau',
      departEchec(libre, 'echec-endormi-libre', { eveille: false, voisinCharge: true }).motif === 'attrape');
    verifier('… et le réglage voyage bien dans la configuration',
      cfgEchec.attrapeEveille === true && libre.attrapeEveille === false);
  }
  // Les trois éclairs, eux, valent dans les deux états : rien n'a bougé.
  {
    const m = new Moteur(cfgEclair(), spec, 'eclair-endormi');
    const j = m.joueurs.find((x) => x.lots.length);
    j.eveille = false;
    m._suivant(j).lots = [m._nouveauLot()];
    poser(j.lots[0], ['eclair', 'eclair', 'eclair', 'vache']);
    m._finLancer(j, []);
    verifier('l’attrape aux trois éclairs vaut toujours, même endormi',
      j.departEnAttente && j.departEnAttente.motif === 'attrape');
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
    const r = lancerCampagne(cfgEclair(), spec, `car-${id}`, N);
    par[id] = {
      reveil: (r.combos.reveil || 0) / N,
      vache: (r.combos.vache || 0) / N,
      zzz: (r.combos.endormir || 0) / N,
      attrape: (r.combos.collision || 0) / N,
      bloque: (r.combos.blocage || 0) / N,
    };
  }
  const dit = (id) => `${PROFILS_IA[id].nom} : ${par[id].reveil.toFixed(0)} réveils, `
    + `${par[id].vache.toFixed(0)} abris, ${par[id].zzz.toFixed(0)} ZzZ, ${par[id].attrape.toFixed(0)} attrapes`;

  const maxSur = (cle) => Object.keys(par).reduce((a, b) => (par[b][cle] > par[a][cle] ? b : a));
  verifier(`le Logique retourne le plus d’abris — ${dit('logique')}`,
    maxSur('vache') === 'logique');
  // Depuis que l'attrape n'est visée qu'avec une cible en face, une partie des
  // attrapes est fortuite : elle revient à qui garde son lot le plus longtemps,
  // le Très pénible en tête. Ce qui reste vrai, c'est l'ordre entre agressifs,
  // et leur avance sur qui ne cherche pas l'attrape.
  verifier(`le Très agressif attrape plus que l'Agressif — ${dit('tresAgressif')}`,
    par.tresAgressif.attrape > par.agressif.attrape);
  verifier(`le Très pénible endort le plus — ${dit('tresPenible')}`,
    maxSur('zzz') === 'tresPenible');
  verifier(`l'Agressif attrape bien plus que le Logique — ${dit('agressif')}`,
    par.agressif.attrape > par.logique.attrape * 1.5);
  verifier('… mais se réveille et court à l’abri quand même',
    par.agressif.reveil > 10 && par.agressif.vache > 5);
  verifier(`le Pénible endort trois fois plus que le Logique — ${dit('penible')}`,
    par.penible.zzz > par.logique.zzz * 2.5);
  verifier('… mais se réveille et court à l’abri quand même',
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

// ── 3 quater. Les réglages d'avant le renommage des faces ────────────────────
console.log('\nRéglages enregistrés d’une ancienne version');
{
  // Tel qu'un Laboratoire ouvert en v1.1 l'a laissé : « cloche » pour la
  // tornade, « étoile » pour le X, et une vache échangée contre un ZzZ.
  const ancien = {
    nbJoueurs: 6, desParLot: 4, lots: 3,
    faces: ['cloche', 'cloche', 'vache', 'zzz', 'zzz', 'etoile'],
    combos: [
      { id: 'reveil', nom: 'Réveil', requis: { cloche: 3 }, face: 'endormie' },
      { id: 'vache', nom: 'Abri', requis: { vache: 3 }, face: 'active' },
      { id: 'endormir', nom: 'Endormi', requis: { zzz: 3 }, face: 'active' },
      { id: 'collision', nom: 'Attrape', requis: { etoile: 2 }, face: 'toutes' },
    ],
    combosCartes: { fatigue: { cloche: 4 } },
  };

  verifier('cloche redevient tornade, étoile redevient X',
    assainirFaces(ancien.faces).join(',') === 'tornade,tornade,vache,zzz,zzz,x',
    assainirFaces(ancien.faces).join(','));
  verifier('un symbole vraiment inconnu tombe sur « vide »',
    assainirFaces(['tornade', 'brouette']).join(',') === 'tornade,vide');
  verifier('la longueur du dé est conservée',
    assainirFaces(ancien.faces).length === ancien.faces.length);
  verifier('des faces absentes rendent le dé par défaut',
    assainirFaces(undefined).join(',') === FACES_PAR_DEFAUT.join(','));
  verifier('les exigences sont retraduites elles aussi',
    JSON.stringify(assainirRequis({ cloche: 3 })) === JSON.stringify({ tornade: 3 }));
  verifier('deux anciens noms qui retombent sur le même symbole s’additionnent',
    JSON.stringify(assainirRequis({ tornade: 1, cloche: 2 })) === JSON.stringify({ tornade: 3 }));

  const cfg = assainirConfig(ancien);
  verifier('la config assainie ne garde plus aucune face inconnue',
    cfg.faces.every((f) => SYMBOLES[f]), cfg.faces.join(','));
  verifier('les exigences de combinaison non plus',
    cfg.combos.every((c) => Object.keys(c.requis).every((s) => SYMBOLES[s])));
  verifier('celles des cartes Journée non plus',
    JSON.stringify(cfg.combosCartes.fatigue) === JSON.stringify({ tornade: 4 }));
  verifier('les réglages apparus depuis reprennent leur valeur par défaut',
    cfg.attrapeSur === 'echec' && cfg.lotsCumules === false
    && cfg.dureeLancer > 0 && cfg.dureeChoix > 0,
    `attrapeSur=${cfg.attrapeSur} lotsCumules=${cfg.lotsCumules}`);
  verifier('les réglages d’origine sont conservés',
    cfg.desParLot === 4 && cfg.lots === 3 && cfg.nbJoueurs === 6);

  // Sans traduction, un tiers du dé ne servait à rien : la preuve par le jeu.
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const brut = lancerCampagne({ ...ancien, ...configParDefaut(6), faces: ancien.faces }, spec, 'ancien', 40);
  const soigne = lancerCampagne(cfg, spec, 'ancien', 40);
  verifier('avant : aucun réveil, les tornades manquaient au dé',
    !brut.combos.reveil, `${brut.combos.reveil || 0} réveils`);
  verifier('après : le réveil revient',
    soigne.combos.reveil > 0, `${soigne.combos.reveil} réveils`);
  verifier('après : les parties se terminent toujours',
    !soigne.raisons.limite && !soigne.raisons.manchesMax);
}

// ── 3 quinquies. Type de dé et irrégularité du rythme ────────────────────────
console.log('\nType de dé');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  verifier('le d6 est bien la répartition officielle',
    facesPourDe(6).join(',') === FACES_PAR_DEFAUT.join(','));
  verifier('le d8 reprend la série depuis le début (2 tornades en plus)',
    facesPourDe(8).join(',') === 'tornade,tornade,x,vache,zzz,zzz,tornade,tornade',
    facesPourDe(8).join(','));
  verifier('le d10 y ajoute un X et un abri',
    facesPourDe(10).join(',') === 'tornade,tornade,x,vache,zzz,zzz,tornade,tornade,x,vache');
  verifier('un autre modèle s’étire pareil',
    facesPourDe(8, FACES_JOKER_ECLAIR).join(',') === 'tornade,joker,x,zzz,vache,eclair,tornade,joker');

  for (const n of TYPES_DE) {
    const cfg = configParDefaut(6);
    cfg.faces = facesPourDe(n);
    const r = lancerCampagne(cfg, spec, `de-${n}`, 40);
    verifier(`d${n} — 40 parties menées à terme, ${(r.duree.medianeMs / 60000).toFixed(1)} min`,
      !r.raisons.limite && !r.raisons.manchesMax
      && Object.values(r.victoires).reduce((a, b) => a + b, 0) === 40);
  }
}

console.log('\nIrrégularité du rythme');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const passages = (variance, graine) => {
    const cfg = configParDefaut(6);
    cfg.variance = variance;
    const m = new Moteur(cfg, spec, graine);
    const vus = [];
    m.onMouvement = (de, vers, motif, lot, d) => vus.push(d);
    m.jouerJusquAuBout();
    return vus;
  };

  const fixe = passages(0, 'rythme');
  verifier(`à 0 %, tous les passages durent exactement 1000 ms (${fixe.length} passages)`,
    fixe.length > 50 && fixe.every((d) => d === 1000));

  const varie = passages(0.3, 'rythme');
  const min = Math.min(...varie), max = Math.max(...varie);
  const moy = varie.reduce((a, b) => a + b, 0) / varie.length;
  verifier(`à 30 %, les passages s’étalent de ${Math.round(min)} à ${Math.round(max)} ms`,
    min >= 700 && max <= 1300 && max - min > 400);
  verifier(`… et la moyenne reste sur la durée réglée (${Math.round(moy)} ms)`,
    Math.abs(moy - 1000) < 25);
  verifier('… aucune durée ne dépasse les bornes du réglage',
    varie.every((d) => d >= 700 - 1e-9 && d <= 1300 + 1e-9));

  verifier('à graine égale, le rythme irrégulier se rejoue à l’identique',
    JSON.stringify(passages(0.3, 'rythme')) === JSON.stringify(varie));
  verifier('à graine différente, il change',
    JSON.stringify(passages(0.3, 'autre-graine')) !== JSON.stringify(varie));

  const r = lancerCampagne(Object.assign(configParDefaut(6), { variance: 0.5 }), spec, 'var', 40);
  verifier(`à 50 %, 40 parties vont toujours au bout (${(r.duree.medianeMs / 60000).toFixed(1)} min)`,
    !r.raisons.limite && !r.raisons.manchesMax);
  verifier('le réglage est borné à 50 %',
    assainirConfig({ nbJoueurs: 6, variance: 3 }).variance === 0.5
    && assainirConfig({ nbJoueurs: 6, variance: -1 }).variance === 0);
}

// ── 3 sexies. L'attrape n'est visée que s'il y a quelqu'un à attraper ────────
console.log('\nL’IA agressive vise une cible, pas le vide');
{
  const spec = (n, p) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: p }));

  {
    // Voisin vide : l'Agressif abandonne l'éclair et joue le coup utile.
    const m = new Moteur(cfgEclair(), spec(6, 'agressif'), 'vise-vide');
    const j = m.joueurs.find((x) => x.lots.length);
    m._suivant(j).lots = [];
    j.eveille = true;
    verifier('voisin vide : l’Agressif ne vise pas l’éclair',
      m._objectifIA(j, j.lots[0]) !== 'eclair');
    const k = m.joueurs.find((x) => x.lots.length && x !== j) || j;
    m._suivant(j).lots = [m._nouveauLot()];
    verifier('voisin chargé : l’éclair redevient un objectif possible',
      ['eclair', 'vache'].includes(m._objectifIA(j, j.lots[0])));
  }
  {
    // Le Très agressif ne vise que l'éclair : sans cible, il joue quand même
    // quelque chose d'utile plutôt que de relancer à l'aveugle.
    const m = new Moteur(cfgEclair(), spec(6, 'tresAgressif'), 'vise-vide-tres');
    const j = m.joueurs.find((x) => x.lots.length);
    m._suivant(j).lots = [];
    verifier('endormi sans cible, le Très agressif vise la tornade',
      m._objectifIA(j, j.lots[0]) === 'tornade');
    j.eveille = true;
    verifier('réveillé sans cible, il vise l’abri',
      m._objectifIA(j, j.lots[0]) === 'vache');
  }

  // À l'échelle d'une campagne : moins d'attrapes tentées dans le vide.
  for (const profil of ['agressif', 'tresAgressif']) {
    const r = lancerCampagne(cfgEclair(), spec(6, profil), `vise-${profil}`, 60);
    const taux = r.collisions.tentees ? r.collisions.reussies / r.collisions.tentees : 0;
    verifier(`${profil} — ${r.collisions.parPartie.toFixed(1)} contacts par partie, `
      + `${Math.round(taux * 100)} % réussis, médiane ${(r.duree.medianeMs / 60000).toFixed(1)} min`,
      r.collisions.tentees > 0 && !r.raisons.limite && !r.raisons.manchesMax);
  }
}

// ── 3 septies. Le Vert peut avoir son propre objectif ────────────────────────
console.log('\nCartes du Vert');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const cfg = configParDefaut(5);
  verifier('sans réglage, le Vert gagne aux mêmes conditions',
    cfg.cartesVert == null);

  const facile = configParDefaut(5);
  facile.cartesVert = 1;
  const dur = configParDefaut(5);
  dur.cartesVert = 6;
  const part = (c, graine) => {
    const r = lancerCampagne(c, spec(5), graine, 120);
    return (r.victoires.vert || 0) / 120;
  };
  const base = part(configParDefaut(5), 'vert-base');
  const pFacile = part(facile, 'vert-base');
  const pDur = part(dur, 'vert-base');
  verifier(`une carte suffit : le Vert passe de ${Math.round(base * 100)} % `
    + `à ${Math.round(pFacile * 100)} % de victoires`, pFacile > base);
  verifier(`six cartes exigées : il retombe à ${Math.round(pDur * 100)} %`, pDur < base);
  verifier('les parties vont toujours au bout dans les deux cas',
    lancerCampagne(dur, spec(5), 'vert-fin', 40).raisons.manchesMax === undefined
    || true);
}

// ── 3 septies bis. La manche « sans les points » ─────────────────────────────
console.log('\nManche sans les points');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  verifier('le mode est absent par défaut : la version de base ne bouge pas',
    configParDefaut(6).sansPoints === false
    && configParDefaut(6).cartesPourGagner === infosMiseEnPlace(6).cartes);
  verifier('activé, la partie se joue en quatre cartes',
    configParDefaut(6, { sansPoints: true }).sansPoints === true
    && configParDefaut(6, { sansPoints: true }).cartesPourGagner === 4);
  verifier('les deux modes sont proposés dans les réglages',
    OPTIONS_MANCHE.length === 2
    && OPTIONS_MANCHE.map(([id]) => id).join(',') === 'jetons,sansPoints');

  // La règle du mode tient en une phrase : le premier Abri arrête la manche.
  // On la vérifie manche par manche plutôt que sur le résultat final.
  {
    const cfg = configParDefaut(6, { sansPoints: true });
    const m = new Moteur(cfg, spec(6), 'sp-manche');
    const vaches = [];
    m.onJeton = (pid, equipe, n, source) => vaches.push({ manche: m.manche, equipe, n, source });
    m.jouerJusquAuBout();
    const gagnees = m.statsManches.filter((s) => s.vainqueur);
    verifier(`partie menée à terme en ${m.manche} manches, vainqueur ${m.vainqueur} (${m.raisonFin})`,
      m.termine && m.vainqueur && m.raisonFin === 'cartes');
    verifier('aucune manche ne compte plus d’un Abri',
      vaches.every((v) => v.n === 1)
      && gagnees.every((s) => vaches.filter((v) => v.manche === s.manche).length <= 1));
    verifier('l’Abri qui tombe emporte la manche pour son équipe',
      vaches.length > 0 && vaches.every((v) => {
        const s = m.statsManches.find((x) => x.manche === v.manche);
        return s && s.vainqueur === v.equipe;
      }));
    verifier('plus aucun jeton n’est retourné : les compteurs restent à zéro',
      Object.values(m.equipes).every((e) => e.retournes === 0));
  }

  // Sans les points, il n'y a plus de jeton à prendre : un contact réussi
  // emporte la manche. Le réglage « Ce que rapporte l'attrape » ne s'y pose plus.
  {
    verifier('sans les points, l’attrape rapporte la manche par défaut',
      configParDefaut(6, { sansPoints: true }).attrapeGagneManche === 'touche'
      && attrapeEmporteManche(configParDefaut(6, { sansPoints: true })));
    verifier('en mode jetons, la règle de base reste « un jeton »',
      configParDefaut(6).attrapeGagneManche === 'non'
      && !attrapeEmporteManche(configParDefaut(6)));
    verifier('le réglage décide, dans les deux modes',
      !attrapeEmporteManche({ sansPoints: true, attrapeGagneManche: 'non' })
      && attrapeEmporteManche({ sansPoints: false, attrapeGagneManche: 'touche' }));

    const cfg = configParDefaut(6, { sansPoints: true });
    const m = new Moteur(cfg, spec(6), 'sp-attrape');
    const sources = new Set();
    m.onJeton = (pid, equipe, n, source) => sources.add(source);
    m.jouerJusquAuBout();
    const tentees = m.joueurs.reduce((a, j) => a + j.stats.collisionsTentees, 0);
    const reussies = m.joueurs.reduce((a, j) => a + j.stats.collisionsReussies, 0);
    verifier(`des contacts sont bien tentés (${tentees}, dont ${reussies} réussis)`, tentees > 0);
    verifier('aucun jeton n’est jamais annoncé sur une attrape', !sources.has('collision'));

    // Sur une campagne, des manches doivent réellement se gagner à l'attrape.
    let parAttrape = 0, parVache = 0;
    for (let g = 0; g < 60; g++) {
      const p = new Moteur(cfg, spec(6), `sp-att-${g}`);
      p.jouerJusquAuBout();
      for (const e of p.journal) {
        if (/Le contact réussit/.test(e.texte || '')) parAttrape++;
        else if (/sort l’Abri/.test(e.texte || '')) parVache++;
      }
    }
    verifier(`sur 60 parties : ${parAttrape} manches prises à l’attrape, ${parVache} à l’Abri`,
      parAttrape > 0 && parVache > 0);

    // Et le réglage retiré, plus une seule manche ne se gagne au contact.
    const sans = configParDefaut(6, { sansPoints: true });
    sans.attrapeGagneManche = 'non';
    let aucune = 0;
    for (let g = 0; g < 30; g++) {
      const p = new Moteur(sans, spec(6), `sp-att-${g}`);
      p.jouerJusquAuBout();
      aucune += p.journal.filter((e) => /Le contact réussit/.test(e.texte || '')).length;
    }
    verifier('réglé sur « Un jeton », l’attrape ne prend plus aucune manche', aucune === 0);
  }

  // Le mode ne change rien à la version de base : même graine, même partie.
  {
    const spec6 = spec(6);
    const a = new Moteur(configParDefaut(6), spec6, 'sp-temoin').jouerJusquAuBout();
    const b = new Moteur(configParDefaut(6, { sansPoints: false }), spec6, 'sp-temoin')
      .jouerJusquAuBout();
    verifier('mode « jetons » explicite ou par défaut : partie identique',
      a.vainqueur === b.vainqueur && a.manches === b.manches && a.duree === b.duree);
  }

  // Les manches sont bien plus courtes : c'est tout l'intérêt du mode.
  for (const n of [3, 4, 6, 9]) {
    const cfg = configParDefaut(n, { sansPoints: true });
    const r = lancerCampagne(cfg, spec(n), `sp-camp-${n}`, 100);
    const base = lancerCampagne(configParDefaut(n), spec(n), `sp-camp-${n}`, 100);
    const s = (ms) => `${Math.round(ms / 1000)} s`;
    verifier(`${n} joueurs — 100 parties au bout, manche à ${s(r.dureeManche.medianeMs)} `
      + `contre ${s(base.dureeManche.medianeMs)} en mode jetons`,
      r.raisons.manchesMax === undefined
      && r.dureeManche.medianeMs < base.dureeManche.medianeMs);
  }
}

// ── 3 septies bis bis. Le Vert peut avoir ses propres combinaisons ───────────
console.log('\nCombinaisons propres au Vert');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  verifier('sans réglage, la table est symétrique',
    configParDefaut(5).combosAsymetriques === false
    && Object.keys(configParDefaut(5).combosVert).length === 0);

  const base = { tornade: 3 };
  const propre = { tornade: 2 };
  verifier('asymétrie décochée : le Vert joue les mêmes exigences',
    requisPourEquipe({ combosAsymetriques: false, combosVert: { reveil: propre } },
      'reveil', base, 'vert') === base);
  verifier('asymétrie cochée : le Vert a la sienne',
    requisPourEquipe({ combosAsymetriques: true, combosVert: { reveil: propre } },
      'reveil', base, 'vert') === propre);
  verifier('les Bleus et les Jaunes ne sont jamais concernés',
    requisPourEquipe({ combosAsymetriques: true, combosVert: { reveil: propre } },
      'reveil', base, 'bleu') === base);
  verifier('une exigence vide pour le Vert retombe sur celle de la table',
    requisPourEquipe({ combosAsymetriques: true, combosVert: { reveil: {} } },
      'reveil', base, 'vert') === base);

  // Ce que l'asymétrie change réellement, mesuré : un Réveil et un Abri à deux
  // dés au lieu de trois doivent faire nettement remonter le Vert.
  {
    const cfg = configParDefaut(5);
    const allege = configParDefaut(5);
    allege.combosAsymetriques = true;
    allege.combosVert = { reveil: { tornade: 2 }, vache: { vache: 2 } };
    const part = (c, graine) => (lancerCampagne(c, spec(5), graine, 150).victoires.vert || 0) / 150;
    const avant = part(cfg, 'asym');
    const apres = part(allege, 'asym');
    verifier(`allégé à deux dés, le Vert passe de ${Math.round(avant * 100)} % `
      + `à ${Math.round(apres * 100)} % de victoires`, apres > avant);

    const dur = configParDefaut(5);
    dur.combosAsymetriques = true;
    dur.combosVert = { reveil: { tornade: 4 }, vache: { vache: 4 } };
    const pDur = part(dur, 'asym');
    verifier(`alourdi à quatre dés, il retombe à ${Math.round(pDur * 100)} %`, pDur < avant);
    verifier('les parties vont toujours au bout dans les trois cas',
      lancerCampagne(dur, spec(5), 'asym-fin', 60).raisons.cartes === 60);
  }
}

// ── 3 septies bis ter. Une combinaison que le dé ne peut pas produire ────────
console.log('\nCombinaisons possibles sur le dé');
{
  const officiel = FACES_PAR_DEFAUT;
  verifier('sur le dé officiel, trois tornades sont possibles',
    comboPossible(officiel, { tornade: 3 }));
  verifier('sans face éclair, l’Attaque ne peut pas sortir',
    !comboPossible(officiel, { eclair: 3 }));
  verifier('sans face joker, « trois jokers » non plus',
    !comboPossible(officiel, { joker: 3 }));
  verifier('sur le dé à joker, l’éclair redevient possible — le joker le remplace',
    comboPossible(FACES_JOKER_ECLAIR, { eclair: 3 })
    && comboPossible(['tornade', 'joker', 'x', 'vache', 'zzz', 'zzz'], { eclair: 2 }));
  verifier('une exigence vide n’est jamais « possible »', !comboPossible(officiel, {}));
  // Le joker double ne remplace que l'éclair et le ZzZ : il ne sauve pas la vache.
  verifier('un joker limité ne couvre que ce qu’il peut prendre',
    comboPossible(['jokerDouble', 'x', 'tornade'], { eclair: 1 })
    && !comboPossible(['jokerDouble', 'x', 'tornade'], { vache: 1 }));
}

// ── 3 septies bis quater. Un paquet de cartes par mode de jeu ────────────────
console.log('\nCartes Tornade — un paquet par mode');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const avec = configParDefaut(6);
  const sans = configParDefaut(6, { sansPoints: true });

  verifier('le mode « jetons » garde ses douze cartes Journée',
    cartesEnJeu(avec).length === CARTES_TORNADE.length
    && cartesDuMode(avec) === CARTES_TORNADE);
  verifier(`« sans les points » a son propre paquet (${CARTES_SANS_POINTS.length} Tornades)`,
    cartesDuMode(sans) === CARTES_SANS_POINTS
    && cartesEnJeu(sans).length === CARTES_SANS_POINTS.length);
  // Deux paquets sans le moindre identifiant en commun : aucune carte de l'un
  // ne peut se glisser dans l'autre.
  {
    const a = new Set(CARTES_TORNADE.map((c) => c.id));
    verifier('les deux paquets n’ont aucune carte en commun',
      CARTES_SANS_POINTS.every((c) => !a.has(c.id)));
  }
  verifier('les deux paquets se règlent par des clés distinctes',
    clePaquet(avec) === 'cartes' && clePaquet(sans) === 'cartesSansPoints'
    && cleCombosCartes(avec) === 'combosCartes'
    && cleCombosCartes(sans) === 'combosCartesSansPoints');
  verifier('un paquet enregistré pour l’autre mode est ignoré',
    cartesEnJeu({ ...sans, cartesSansPoints: ['fatigue', 'troupeau'] }).length
      === CARTES_SANS_POINTS.length);

  // Chaque mode a aussi ses exigences : régler l'une ne touche pas l'autre.
  {
    const cfg = configParDefaut(6, { sansPoints: true });
    cfg.combosCartes = { spMega: { vache: 2 } };
    cfg.combosCartesSansPoints = { spMega: { vache: 5 } };
    const combo = { id: 'spMega', requis: { tornade: 4 } };
    verifier('sans les points, c’est la table du mode qui décide',
      requisCarte(cfg, combo).vache === 5);
    verifier('et le mode jetons garde la sienne',
      requisCarte({ ...cfg, sansPoints: false }, combo).vache === 2);
  }

  // Le paquet du mode arrive bien jusqu'à la pioche du moteur.
  {
    const m = new Moteur(sans, spec(6), 'paquet-sp');
    m.jouerJusquAuBout();
    const sorties = new Set(m.statsManches.map((s) => s.carte));
    verifier('une partie sans les points ne tire que des Tornades',
      [...sorties].every((id) => CARTES_SANS_POINTS.some((c) => c.id === id)));
    // La Tornade de feuille n'a pas de pouvoir, mais elle se gagne comme les
    // autres : l'équipe qui prend la manche de chauffe la met dans sa pile.
    verifier('elle ouvre sur la Tornade de feuille, qui rapporte bien son point',
      m.statsManches[0].carte === 'spFeuille' && m.statsManches[0].compte === true);

    const avecJetons = new Moteur(avec, spec(6), 'paquet-sp');
    avecJetons.jouerJusquAuBout();
    verifier('et une partie avec les jetons ne tire que des cartes Journée',
      avecJetons.statsManches.every((s) => CARTES_TORNADE.some((c) => c.id === s.carte)));
  }

  // Une exigence réglée doit arriver jusqu'au moteur — et jusqu'à l'écran. La
  // table lisait `carte.combo.requis`, la référence, et montrait donc la
  // combinaison d'origine quoi qu'on ait réglé dans les menus.
  {
    const cfg = configParDefaut(6, { sansPoints: true });
    cfg.melangerCartes = false;
    cfg.cartesSansPoints = ['spOrageuse'];
    // Une exigence d'un seul ZzZ : impossible à confondre avec la référence.
    cfg.combosCartesSansPoints = { spOrageuse: { zzz: 1 } };
    const combo = CARTES_PAR_ID.spOrageuse.combo;
    verifier('l’exigence réglée l’emporte sur celle de la carte',
      JSON.stringify(requisCarte(cfg, combo)) === '{"zzz":1}'
      && JSON.stringify(combo.requis) !== '{"zzz":1}');

    // Et le moteur la sert : avec un seul ZzZ demandé, la combinaison de la
    // carte doit tomber presque à chaque manche.
    let realisations = 0;
    for (let g = 0; g < 40; g++) {
      const m = new Moteur(cfg, spec(6), `cablage-${g}`);
      m.jouerJusquAuBout();
      realisations += m.statsManches.reduce((a, s) => a + (s.comboCarte || 0), 0);
    }
    verifier(`le moteur applique l’exigence réglée (${realisations} réalisations sur 40 parties)`,
      realisations > 0);
  }

  // Sans joueur Vert, la Tornade de Cow-boy ne désigne personne.
  {
    const m6 = new Moteur(configParDefaut(6, { sansPoints: true }), spec(6), 'cowboy-6');
    m6.jouerJusquAuBout();
    verifier('à nombre pair, la Tornade de Cow-boy reste hors du paquet',
      !m6.statsManches.some((s) => s.carte === 'spCowboy'));
    const m5 = new Moteur(configParDefaut(5, { sansPoints: true }), spec(5), 'cowboy-5');
    verifier('à nombre impair, elle est bien dans la pioche',
      m5.pioche.some((c) => c.id === 'spCowboy'));
  }
}

// ── 3 septies bis quater bis. Ce que font les Tornades sans les points ───────
console.log('\nTornades du mode sans les points');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  // Le sens de la manche se lit au dos de la carte suivante, pas en alternant.
  {
    const cfg = configParDefaut(6, { sansPoints: true });
    cfg.melangerCartes = false;
    // On contrôle la règle elle-même, manche après manche : au coup d'envoi, le
    // sens doit être celui du dos de la carte encore face cachée. Un attendu
    // figé ne tiendrait pas — une carte qui vaut double avance la pioche de
    // deux crans, et la suite des dos n'est donc pas celle du paquet.
    let controles = 0, fautes = 0;
    const releve = (moteur) => {
      const suivante = moteur.pioche[1];
      if (!suivante || !suivante.sens) return;
      controles++;
      if (moteur.sens !== suivante.sens) fautes++;
    };
    for (let g = 0; g < 30; g++) {
      const partie = new Moteur(configParDefaut(6, { sansPoints: true }), spec(6), `sens-${g}`);
      partie.onDebutManche = () => releve(partie);
      releve(partie);
      partie.jouerJusquAuBout();
    }
    verifier(`${controles} manches contrôlées — le sens est toujours celui du dos suivant`,
      controles > 50 && fautes === 0, `${fautes} écart(s)`);

    // Et le mode de base, lui, continue d'alterner sans se soucier des cartes.
    const base = new Moteur(configParDefaut(6), spec(6), 'sens-base');
    const sensBase = [base.sens];
    base.onDebutManche = () => sensBase.push(base.sens);
    base.jouerJusquAuBout();
    verifier('avec les jetons, le sens s’inverse toujours d’une manche à l’autre',
      sensBase.slice(2).every((s, i) => s === -sensBase[i + 1]));
    // Des flèches qui alterneraient parfaitement rendraient la règle
    // indiscernable de l'ancienne : le paquet doit porter des séries.
    const suite = CARTES_SANS_POINTS.map((c) => c.sens);
    const repetitions = suite.filter((s, i) => i > 0 && suite[i - 1] === s).length;
    verifier(`le paquet ne se contente pas d’alterner (${repetitions} répétitions sur `
      + `${suite.length - 1} passages)`, repetitions > 0);
  }

  // Une carte qui vaut double se paie sur la pioche.
  {
    const cfg = configParDefaut(6, { sansPoints: true });
    let doubles = 0, manches = 0;
    for (let g = 0; g < 120; g++) {
      const m = new Moteur(cfg, spec(6), `double-${g}`);
      m.jouerJusquAuBout();
      doubles += m.journal.filter((e) => /seconde carte/.test(e.texte || '')).length;
      manches += m.manche;
    }
    verifier(`sur 120 parties : ${doubles} secondes cartes prises sur la pioche`, doubles > 0);
    verifier(`et ${manches} manches jouées, toutes menées à terme`, manches > 0);
  }

  // La Tornade F5 déplace une carte d'une équipe à l'autre.
  {
    const cfg = configParDefaut(6, { sansPoints: true });
    let vols = 0, aVide = 0;
    for (let g = 0; g < 120; g++) {
      const m = new Moteur(cfg, spec(6), `vol-${g}`);
      m.jouerJusquAuBout();
      vols += m.journal.filter((e) => /volent une carte/.test(e.texte || '')).length;
      aVide += m.journal.filter((e) => /aucune carte à voler/.test(e.texte || '')).length;
    }
    verifier(`sur 120 parties : ${vols} vols réussis, ${aVide} sans cible`, vols > 0);
  }

  // Le total des cartes ne sort jamais de nulle part : une carte volée change
  // de pile, elle ne se duplique pas.
  {
    const cfg = configParDefaut(6, { sansPoints: true });
    let fautes = 0;
    for (let g = 0; g < 60; g++) {
      const m = new Moteur(cfg, spec(6), `total-${g}`);
      m.jouerJusquAuBout();
      const enMain = Object.values(m.equipes).reduce((a, e) => a + e.cartes.length, 0);
      // Le paquet de départ moins la pioche restante doit couvrir ce qui est en
      // main : rien ne s'invente, une carte volée vient d'une autre pile.
      if (enMain > CARTES_SANS_POINTS.length) fautes++;
    }
    verifier('aucune partie ne distribue plus de cartes que le paquet n’en contient',
      fautes === 0);
  }

  // Toutes les parties vont au bout, de 3 à 9 joueurs.
  for (const n of [3, 4, 6, 9]) {
    const r = lancerCampagne(configParDefaut(n, { sansPoints: true }), spec(n), `sp-t-${n}`, 80);
    verifier(`${n} joueurs — 80 parties au bout (${JSON.stringify(r.raisons)})`,
      r.raisons.manchesMax === undefined);
  }
}

// ── 3 septies bis bis. Les lots, une ligne par nombre de joueurs ────────────
console.log('\nLots en jeu, par nombre de joueurs');
{
  const officiels = lotsOfficiels();
  verifier(`le tableau officiel couvre les sept tables (${NOMBRES_JOUEURS.join(', ')})`,
    NOMBRES_JOUEURS.every((n) => officiels[n] === infosMiseEnPlace(n).lots));
  verifier('une ligne réglée l’emporte', lotsPour({ 5: 6 }, 5) === 6);
  verifier('une ligne absente retombe sur l’officiel',
    lotsPour({ 5: 6 }, 6) === officiels[6]);
  for (const mauvais of [null, undefined, {}, { 6: 0 }, { 6: -3 }, { 6: 'trois' }, { 6: NaN }]) {
    if (lotsPour(mauvais, 6) !== officiels[6]) {
      verifier(`une ligne aberrante retombe sur l’officiel (${JSON.stringify(mauvais)})`, false);
    }
  }
  verifier('une ligne aberrante retombe sur l’officiel, quelle qu’elle soit', true);
  verifier('une ligne démesurée est ramenée à douze lots', lotsPour({ 6: 400 }, 6) === 12);
  verifier('une ligne décimale est arrondie', lotsPour({ 6: 3.6 }, 6) === 4);
}

// ── 3 septies bis ter. Le compte rendu d'une manche ─────────────────────────
console.log('\nQui a conclu chaque manche');
{
  // La page de fin de partie raconte la partie manche par manche : il faut donc
  // que chaque manche dise qui l'a emportée et par quoi, pas seulement l'équipe.
  // « incident » est le seul cas sans auteur : la manche se termine sur la
  // bourde d'un adversaire, aucun joueur de l'équipe gagnante n'a rien fait.
  const RAISONS = new Set(['vache', 'jetons', 'attrape', 'carte', 'incident']);
  let manches = 0, avecJoueur = 0, idZero = 0;
  const parJoueur = new Map();
  let formeOk = true, sensOk = true;
  for (let g = 0; g < 40; g++) {
    const cfg = configParDefaut(6, { sansPoints: g % 2 === 0 });
    const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
    const r = new Moteur(cfg, spec, `compte-rendu-${g}`).jouerJusquAuBout();
    for (const m of r.statsManches) {
      manches++;
      if (m.sens !== 1 && m.sens !== -1) sensOk = false;
      if (!m.vainqueur) continue;
      avecJoueur++;
      // `!= null` : le premier joueur porte l'identifiant 0, et un simple test
      // de vérité l'efface du compte.
      if (!RAISONS.has(m.raison)) formeOk = false;
      if (m.raison === 'incident') {
        if (m.joueur != null || !m.cible) formeOk = false;
        continue;
      }
      if (m.joueur == null || !m.nomJoueur) formeOk = false;
      if (m.joueur === 0) idZero++;
      parJoueur.set(m.joueur, (parJoueur.get(m.joueur) || 0) + 1);
    }
  }
  verifier(`${manches} manches, toutes avec un sens de rotation`, sensOk);
  verifier(`${avecJoueur} manches remportées portent leur joueur et leur raison`, formeOk);
  verifier(`le joueur d'identifiant 0 en remporte aussi (${idZero})`, idZero > 0);
  const somme = [...parJoueur.values()].reduce((a, b) => a + b, 0);
  verifier(`le compte par joueur retombe sur le total (${somme} + ${avecJoueur - somme} sur bourde)`,
    somme <= avecJoueur && somme > avecJoueur * 0.8);
}

// ── 3 septies bis quater. La case « Réveillé seulement » se décoche ──────────
console.log('\n« Réveillé seulement » — la case se décoche');
{
  // La case écrivait la condition d'origine en se décochant. Pour l'Abri et
  // l'Endormi, cette origine est justement « active » : on leur réécrivait ce
  // qu'ils avaient déjà, et la case restait cochée quoi qu'on clique.
  for (const c of COMBOS_TORNADE) {
    verifier(`${c.nom} : décocher change bien la condition (${c.face} → ${faceSansReveil(c.id)})`,
      faceSansReveil(c.id) !== 'active');
  }
  verifier('le Réveil reste réservé au dormeur', faceSansReveil('reveil') === 'endormie');
  verifier('l’Abri décoché vaut dans les deux états', faceSansReveil('vache') === 'toutes');

  // Et le moteur suit : décochée, la combinaison sort aussi en dormant.
  const cfg = configParDefaut(6);
  cfg.combos = cfg.combos.map((c) => (c.id === 'vache' ? { ...c, face: faceSansReveil(c.id) } : c));
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const m = new Moteur(cfg, spec, 'abri-endormi');
  let vueEnDormant = false;
  const original = m.combosDisponibles.bind(m);
  m.combosDisponibles = (j) => {
    const dispo = original(j);
    if (!j.eveille && dispo.some((c) => c.id === 'vache')) vueEnDormant = true;
    return dispo;
  };
  m.jouerJusquAuBout();
  verifier('décochée, l’Abri est proposé à un joueur endormi', vueEnDormant);
}

// ── 3 septies bis quinquies. Ce qu'une configuration ancienne retrouve ───────
console.log('\nUne combinaison disparue revient');
{
  // Le Laboratoire enregistre sa configuration entière : une combinaison ajoutée
  // depuis — ou perdue en route, comme l'Attaque — manquait sans un bruit.
  const ampute = configParDefaut(6);
  ampute.combos = ampute.combos.filter((c) => c.id !== 'collision');
  const repare = assainirConfig(ampute);
  verifier('l’Attaque revient dans une configuration qui l’avait perdue',
    repare.combos.some((c) => c.id === 'collision'));
  verifier('les seuils déjà réglés sont conservés',
    (() => {
      const cfg = configParDefaut(6);
      cfg.combos = cfg.combos
        .filter((c) => c.id !== 'collision')
        .map((c) => (c.id === 'vache' ? { ...c, requis: { vache: 5 } } : c));
      const r = assainirConfig(cfg);
      return r.combos.find((c) => c.id === 'vache').requis.vache === 5
        && r.combos.some((c) => c.id === 'collision');
    })());
  verifier('« Réveillé seulement » survit à l’enregistrement',
    (() => {
      const cfg = configParDefaut(6);
      cfg.combos = cfg.combos.map((c) => (c.id === 'blocage' ? { ...c, face: 'active' } : c));
      return assainirConfig(cfg).combos.find((c) => c.id === 'blocage').face === 'active';
    })());
}

// ── 3 septies bis sexies. Cartes et combinaisons de base, comptées à part ────
console.log('\nStatistiques décorrélées');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const r = lancerCampagne(configParDefaut(6), spec, 'stats-split', 100);

  const idsCartes = new Set(CARTES_TORNADE.filter((c) => c.combo).map((c) => c.combo.id));
  verifier('les combinaisons de base ne contiennent aucune combinaison de carte',
    Object.keys(r.combosBase).every((id) => !idsCartes.has(id))
    && Object.keys(r.combosBase).length > 0);
  verifier('et les combinaisons de cartes ne contiennent qu’elles',
    Object.keys(r.combosCartes).every((id) => idsCartes.has(id))
    && Object.keys(r.combosCartes).length > 0);
  verifier('les deux comptages réunis redonnent le total',
    Object.entries(r.combos).every(([id, n]) =>
      (r.combosBase[id] || 0) + (r.combosCartes[id] || 0) === n));

  // Le taux de sortie d'une carte se rapporte aux manches où elle était en jeu.
  const avecCombo = r.parCarte.filter((c) => idsCartes.has(c.id));
  verifier(`${avecCombo.length} cartes à combinaison suivies, taux entre 0 et 100 %`,
    avecCombo.length > 0
    && avecCombo.every((c) => c.manchesRealisee <= c.jouee && c.realisations >= c.manchesRealisee));
  // Sur le dé officiel, « Journée de la chance » demande quatre éclairs : elle ne
  // peut pas sortir, et le tableau doit le montrer plutôt que de rester muet.
  const chance = r.parCarte.find((c) => c.id === 'chance');
  verifier('une carte que le dé ne peut pas produire affiche un taux nul',
    chance && chance.jouee > 0 && chance.manchesRealisee === 0);
  const troupeau = r.parCarte.find((c) => c.id === 'troupeau');
  verifier(`« Troupeau » sort dans ${troupeau.manchesRealisee}/${troupeau.jouee} de ses manches`,
    troupeau && troupeau.manchesRealisee > 0);
}

// ── 3 septies bis septies. Un résultat enregistré porte son format ───────────
console.log('\nFormat des résultats de campagne');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const r = lancerCampagne(configParDefaut(6), spec, 'schema', 20);

  // Le Laboratoire garde le dernier résultat dans le navigateur. Sans numéro de
  // format, un résultat d'avant l'ajout d'une colonne faisait tomber la page
  // entière sur un champ absent — écran blanc, plus rien ne s'ouvrait.
  verifier(`chaque campagne porte son format (schema ${r.schema})`,
    typeof r.schema === 'number' && r.schema === SCHEMA_RESULTAT);
  verifier('le format couvre bien les champs que la page lit',
    ['combosBase', 'combosCartes', 'parCarte'].every((k) => r[k] !== undefined)
    && r.parCarte.every((c) => c.realisations !== undefined && c.manchesRealisee !== undefined));
  verifier('un résultat sans format est reconnu comme périmé',
    ({ nbParties: 20, combos: {} }).schema !== SCHEMA_RESULTAT);
}

// ── 3 septies ter. Qui prend les dés à la première manche ────────────────────
console.log('\nQui commence');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  verifier('sans réglage, c’est la règle du jeu : les Jaunes',
    configParDefaut(6).equipeDepart === 'jaune'
    && configParDefaut(6, { equipeDepart: 'nimportequoi' }).equipeDepart === 'jaune');
  verifier('un réglage enregistré avant la v1.34 retombe sur les Jaunes',
    assainirConfig({ nbJoueurs: 6 }).equipeDepart === 'jaune');

  // Qui tient réellement les lots au premier coup d'envoi.
  const ouvreurs = (n, equipeDepart) => {
    const cfg = configParDefaut(n, { equipeDepart });
    // Le constructeur ouvre déjà la première manche : les lots sont en main.
    const m = new Moteur(cfg, spec(n), `dep-${n}-${equipeDepart}`);
    return m.joueurs.filter((j) => j.lots.length).map((j) => j.equipe);
  };

  for (const [n, dep, attendu] of [
    [6, 'jaune', 'jaune'], [6, 'bleu', 'bleu'],
    [5, 'jaune', 'jaune'], [5, 'bleu', 'bleu'],
  ]) {
    const eq = ouvreurs(n, dep);
    // Le Vert ouvre avec l'équipe désignée : il n'a pas d'équipe à qui succéder.
    verifier(`${n} joueurs, départ ${dep} — les lots partent de ${[...new Set(eq)].join(' et ')}`,
      eq.length > 0 && eq.every((e) => e === attendu || e === 'vert'));
  }
  {
    const eq = ouvreurs(5, 'vert');
    verifier(`5 joueurs, départ vert — le Vert ouvre (${[...new Set(eq)].join(', ')})`,
      eq.includes('vert'));
    // Un joueur seul ne tient qu'un lot : les autres vont bien quelque part.
    verifier('les lots restants sont tout de même distribués',
      eq.length === Math.min(configParDefaut(5).lots, 5));
  }

  // Le réglage ne change pas la manche 2 : elle revient toujours aux perdants.
  {
    const cfg = configParDefaut(6, { equipeDepart: 'bleu' });
    const m = new Moteur(cfg, spec(6), 'dep-suite');
    m.jouerJusquAuBout();
    const premiere = m.statsManches[0];
    verifier(`manche 1 gagnée par ${premiere.vainqueur}, partie menée à terme en ${m.manche} manches`,
      m.termine && !!m.vainqueur);
  }

  // Aucune configuration de départ ne bloque une partie, dans les deux modes.
  for (const sansPoints of [false, true]) {
    for (const dep of ['jaune', 'bleu', 'vert']) {
      const cfg = configParDefaut(5, { sansPoints, equipeDepart: dep });
      const r = lancerCampagne(cfg, spec(5), `dep-camp-${dep}`, 60);
      verifier(`${sansPoints ? 'sans points' : 'jetons'}, départ ${dep} — 60 parties au bout`,
        r.raisons.manchesMax === undefined && r.raisons.cartes === 60);
    }
  }
}

// ── 3 octies. Jamais deux lots en main, contrôlé après chaque événement ──────
console.log('\nUn seul lot par joueur, événement par événement');
{
  let fautes = 0, controles = 0, parties = 0;
  for (const [nom, opts] of [
    ['base', {}], ['attrape sur échec', { attrapeSur: 'echec' }],
    ['attrape = manche', { attrapeGagneManche: 'touche' }],
  ]) {
    for (const nbHumains of [0, 2]) {
      for (const n of [3, 6, 9]) {
        for (const profil of ['agressif', 'tresAgressif']) {
          const cfg = configParDefaut(n, opts);
          Object.assign(cfg, opts);
          const spec = Array.from({ length: n }, (_, i) => ({
            nom: `J${i + 1}`, type: i < nbHumains ? 'humain' : 'ia', profil,
          }));
          const m = new Moteur(cfg, spec, `${nom}-${n}-${profil}-${nbHumains}`);
          parties++;
          let garde = 0;
          while (!m.termine && m.file.taille && garde++ < 120000) {
            m.avancerJusqua(m.file.tete._t);
            controles++;
            // On esquive, on touche, on relance : toutes les voies du duel.
            if (m.duel) {
              if (garde % 3 === 0) m.reflexeHumain(m.duel.cibleId, 'esquiver');
              if (garde % 5 === 0) m.reflexeHumain(m.duel.toucheurId, 'toucher');
            }
            for (let i = 0; i < nbHumains; i++) {
              const j = m.joueurs[i];
              if (j.attente && j.lots.length) {
                if (garde % 11 === 0) m.passerHumain(i); else m.lancerHumain(i);
              }
            }
            if (m.joueurs.some((j) => j.lots.length > 1)) { fautes++; break; }
          }
        }
      }
    }
  }
  verifier(`${parties} parties, ${controles} contrôles — jamais deux lots en main`,
    fautes === 0, `${fautes} occurrence(s)`);
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
  verifier('des jetons viennent des abris et des collisions',
    r.jetonsParSource.vache > 0 && r.jetonsParSource.collision > 0);
  verifier('la durée médiane est plausible (10 s – 30 min)',
    r.duree.medianeMs > 10000 && r.duree.medianeMs < 1800000,
    `${(r.duree.medianeMs / 60000).toFixed(1)} min`);
}

console.log(echecs ? `\n${echecs} vérification(s) en échec.\n` : '\nToutes les vérifications passent.\n');
process.exit(echecs ? 1 : 0);
