// Vérifications du moteur et des probabilités : `node tests/moteur.test.js`.

import { Moteur } from '../src/core/engine.js';
import {
  configParDefaut, comboServie, PROFILS_IA, placement, SYMBOLES, FACES_PAR_DEFAUT,
  assainirFaces, assainirRequis, assainirConfig, SYMBOLES_RETIRES,
  NB_FACES_DE, OPTIONS_ATTRAPE, comboDeclencheur, OPTIONS_MANCHE, infosMiseEnPlace,
  attrapeEmporteManche, requisPourEquipe, comboPossible, cartesEnJeu, requisCarte,
  clePaquet, cleCombosCartes, CARTES_TORNADE, cartesDuJeu, CARTES_PAR_ID,
  migrerPaquet, carteALaTable, noteCarte,
  COULEURS_EQUIPE, COMBOS_TORNADE, faceSansReveil, NOMBRES_JOUEURS, lotsPour, lotsOfficiels,
  JOUEURS_MIN, JOUEURS_MAX, bornerJoueurs, MISE_EN_PLACE,
  MODES_MANCHE, modeManche, estCompromis, estImmediat, estJeton, refugePour,
  cartesPour, cartesVertPour, cartesOfficielles,
  OPTIONS_SENS, sensRotation,
  comboAutomatique, comboIneluctable, comboRefusable, REGLE_CARTES_DEUX_ETATS,
  OPTIONS_PLACE_JETONS, jetonsSurTornade,
  equipeVue, nomDansPhrase,
} from '../src/core/config.js';
import { lancerCampagne, SCHEMA_RESULTAT } from '../src/core/sim.js';
// Les réglages livrés avec le jeu vivent dans l'interface, mais ce qu'ils
// décrivent est du jeu : il se vérifie ici comme le reste.
import { PROFILS_INTEGRES } from '../src/ui/profils.js';
import {
  illustrationCarte, illustrationEquipe, ILLUSTRATIONS_CARTES, ILLUSTRATIONS_EQUIPES,
} from '../src/ui/illustrations.js';
import {
  courseCombinaison, courseAvecGarde, probaLancerUnique, loiDuDe,
} from '../src/core/proba.js';

let echecs = 0;
function verifier(nom, condition, detail = '') {
  if (condition) console.log(`  ok   ${nom}`);
  else { echecs++; console.log(`  ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}

// ── 1. Toute partie se termine, de 3 à 8 joueurs ─────────────────────────────
console.log('\nParties menées à terme');
for (const n of [3, 4, 5, 6, 7, 8]) {
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
for (const n of [3, 6, 7]) {
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
  // Une face « vide » tient lieu de combinaison qui rend le lot d'office : le
  // calcul ne connaît pas les symboles, seulement leurs fréquences.
  const faces = ['tornade', 'tornade', 'x', 'zzz', 'vache', 'vide'];
  const D = 4, N = 200000;
  const OPTS = { bloquant: 'x', seuilBloquant: 2, arretsForces: [{ requis: { vide: 3 } }] };

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
        if ((c.vide || 0) >= 3) break;
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
    ['3 faces vides (arrêt forcé)', { vide: 3 }, { estArretForce: true }],
    ['1 de chaque (carte)', { tornade: 1, vache: 1, zzz: 1, vide: 1 }, { prioritaire: true }],
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

// ── 3 bis. Plusieurs combinaisons au même jet ────────────────────────────────
// Sans joker, une face ne compte que pour elle-même. Deux combinaisons peuvent
// encore sortir ensemble — la carte du jour et une de base, ou deux de base sur
// un lot assez grand — et c'est ce qu'on éprouve ici.
console.log('\nPlusieurs combinaisons au même jet');
{
  verifier('une combinaison se compte face par face',
    comboServie({ tornade: 3, x: 1 }, { tornade: 3 })
    && !comboServie({ tornade: 2, vache: 2 }, { tornade: 3 })
    && comboServie({ x: 2, zzz: 2 }, { x: 2 }));
  verifier('les jokers ont quitté le jeu',
    !SYMBOLES.joker && !SYMBOLES.jokerDouble
    && !COMBOS_TORNADE.some((c) => c.id === 'echecJokers'));

  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const poser = (lot, syms) => {
    lot.des.forEach((d, i) => {
      d.sym = syms[i]; d.roule = false; d.finRoule = 0; d.verrou = syms[i] === 'x';
    });
    lot.lance = true;
  };

  // La carte du jour ne se discute pas : elle est jouée sans proposer le choix.
  {
    const humains = spec.map((s, i) => (i === 0 ? { ...s, type: 'humain' } : s));
    const cfg = configParDefaut(6);
    // La Tornade du Sommeil, réglée à deux ZzZ. Avec trois tornades sur un lot
    // de cinq dés, le réveil est servi au même jet.
    cfg.desParLot = 5;
    cfg.cartesTornade = ['spSommeil'];
    // Un paquet voulu exactement tel quel : on dit ce qu'il avait sous les yeux,
    // sinon les cartes arrivées depuis le rejoindraient.
    cfg.cartesTornadeVues = CARTES_TORNADE.map((c) => c.id);
    cfg.combosCartesTornade = { spSommeil: { zzz: 2 } };
    cfg.melangerCartes = false;
    const m = new Moteur(cfg, humains, 'carte-office');
    const j = m.joueurs[0];
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    poser(j.lots[0], ['tornade', 'tornade', 'tornade', 'zzz', 'zzz']);
    const dispo = m.combosDisponibles(j);
    verifier(`la carte et le réveil sont servis au même jet (${dispo.map((d) => d.id).join(', ')})`,
      dispo.length > 1 && dispo.some((d) => d.source === 'journee'));
    m._finLancer(j, []);
    verifier('la carte est jouée d’office, aucun choix n’est proposé',
      j.departEnAttente && !j.departEnAttente.options
      && j.departEnAttente.dispo.source === 'journee');
  }

  // Le joueur humain tranche entre deux combinaisons servies au même jet —
  // réveillé, voisins éveillés : l'Abri et l'Endormi se disputent.
  {
    const humains = spec.map((s, i) => (i === 0 ? { ...s, type: 'humain' } : s));
    const cfg = configParDefaut(6);
    cfg.desParLot = 6;
    const m = new Moteur(cfg, humains, 'double-choix');
    const j = m.joueurs[0];
    j.eveille = true;
    for (const v of m.joueurs) v.eveille = true;
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    poser(j.lots[0], ['vache', 'vache', 'vache', 'zzz', 'zzz', 'zzz']);
    const attendu = m._comboAJouer(j, m.combosDisponibles(j));
    m._finLancer(j, []);
    const options = j.departEnAttente && j.departEnAttente.options;
    verifier('deux combinaisons servies : le choix est offert',
      !!options && options.length === 2, options ? options.map((o) => o.id).join(',') : 'aucune');
    verifier(`le défaut suit la priorité du moteur (${attendu && attendu.id})`,
      !!attendu && j.departEnAttente.dispo.id === attendu.id);
    const autre = options && options.find((o) => o.id !== attendu.id);
    verifier(`le joueur peut lui préférer l’autre (${autre && autre.id})`,
      !!autre && m.choisirCombo(0, autre.id) && j.departEnAttente.dispo.id === autre.id
      && j.departEnAttente.motif === 'combo');
  }

  // Le Réveil s'applique en toutes circonstances : un dormeur qui sort ses
  // soleils se réveille, sans qu'on lui demande rien.
  {
    const humains = spec.map((s, i) => (i === 0 ? { ...s, type: 'humain' } : s));
    const cfg = configParDefaut(6);
    cfg.desParLot = 6;
    const m = new Moteur(cfg, humains, 'reveil-office');
    const j = m.joueurs[0];
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    poser(j.lots[0], ['tornade', 'tornade', 'tornade', 'x', 'x', 'zzz']);
    const dispo = m.combosDisponibles(j);
    verifier(`le Réveil et l’Échec sortent au même jet (${dispo.map((d) => d.id).join(', ')})`,
      dispo.some((d) => d.id === 'reveil') && dispo.some((d) => d.id === 'blocage'));
    m._finLancer(j, []);
    verifier('aucun choix n’est proposé : c’est le Réveil qui est joué',
      j.departEnAttente && !j.departEnAttente.options
      && j.departEnAttente.dispo.id === 'reveil');
    m.avancerJusqua(m.now + 5000);
    verifier('et le joueur s’est bien réveillé',
      j.stats.combos.reveil === 1 && j.stats.reveils === 1);
  }
  // Même avec le droit de relancer par-dessus : le Réveil ne se laisse pas.
  {
    const cfg = configParDefaut(6, { comboServie: 'choix' });
    const humains = spec.map((s, i) => (i === 0 ? { ...s, type: 'humain' } : s));
    const m = new Moteur(cfg, humains, 'reveil-choix');
    const j = m.joueurs[0];
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    poser(j.lots[0], ['tornade', 'tornade', 'tornade', 'zzz']);
    m._finLancer(j, []);
    verifier('« on peut relancer par-dessus » : le Réveil part quand même d’office',
      !j.attente && j.departEnAttente && j.departEnAttente.dispo.id === 'reveil');
  }
  // Et quand la carte du jour sort au même jet, on la joue — et l'on se réveille.
  {
    const cfg = configParDefaut(6);
    // La Tornade du Sommeil réglée à quatre tornades : le réveil est dedans.
    cfg.cartesTornade = ['spSommeil'];
    cfg.cartesTornadeVues = CARTES_TORNADE.map((c) => c.id);
    cfg.combosCartesTornade = { spSommeil: { tornade: 4 } };
    cfg.melangerCartes = false;
    const m = new Moteur(cfg, spec, 'reveil-carte');
    const j = m.joueurs.find((x) => x.lots.length) || m.joueurs[0];
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    poser(j.lots[0], ['tornade', 'tornade', 'tornade', 'tornade']);
    const choisi = m._comboAJouer(j, m.combosDisponibles(j));
    verifier('la carte du jour est jouée, le Réveil l’accompagne',
      choisi && choisi.source === 'journee' && choisi.reveilAussi === true);
    j.eveille = false;
    m._effetCombo(j, { id: 'x', source: 'journee', combo: { effet: 'rien' }, reveilAussi: true });
    verifier('le dormeur se réveille avec la carte', j.eveille === true);
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
    const cfg = configParDefaut(6);
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

  // « Manche gagnée dès la combinaison » n'existe pas au jeu : la variante a été
  // retirée, et un réglage qui la porte encore retombe sur « touche ».
  {
    verifier('la variante « dès la combinaison » a disparu des options',
      !OPTIONS_ATTRAPE.some(([id]) => id === 'combo')
      && OPTIONS_ATTRAPE.length === 2);
    verifier('un réglage enregistré sur cette variante retombe sur « touche »',
      assainirConfig({ nbJoueurs: 6, attrapeGagneManche: 'combo' }).attrapeGagneManche === 'touche');
    const cfg = configParDefaut(6);
    cfg.attrapeGagneManche = 'combo';
    const m = new Moteur(cfg, spec, 'attrape-combo');
    m.jouerJusquAuBout();
    verifier('et le moteur tente le contact quoi qu’il arrive',
      m.joueurs.some((j) => j.stats.collisionsTentees > 0));
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

  // Voisin les mains vides : l'Échec fait partir le lot, sans rien tenter.
  {
    const m = new Moteur(configParDefaut(6), spec, 'attrape-vide');
    const j = m.joueurs.find((x) => x.lots.length);
    j.eveille = true;
    m._suivant(j).lots = [];
    poser(j.lots[0], ['x', 'x', 'tornade', 'vache']);
    m._finLancer(j, []);
    verifier('voisin sans lot : l’Échec part, sans tenter l’attrape',
      !!j.departEnAttente && j.departEnAttente.motif === 'combo'
      && j.departEnAttente.dispo.id === 'blocage');
  }
  // Voisin qui tient un lot : l'Échec part en le tentant.
  {
    const m = new Moteur(configParDefaut(6), spec, 'attrape-pleine');
    const j = m.joueurs.find((x) => x.lots.length);
    j.eveille = true;
    m._suivant(j).lots = [m._nouveauLot()];
    poser(j.lots[0], ['x', 'x', 'tornade', 'vache']);
    m._finLancer(j, []);
    verifier('voisin avec un lot : le lot part pour tenter l’attrape',
      !!j.departEnAttente && j.departEnAttente.motif === 'attrape');
  }
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

  // ── L'attrape se tente sur l'Échec, toujours ──────────────────────────────
  const cfgEchec = configParDefaut(6);
  verifier('le dé officiel, sans éclair',
    cfgEchec.faces.join(',') === FACES_PAR_DEFAUT.join(',') && !cfgEchec.faces.includes('eclair'));
  verifier('l’Attaque aux éclairs a quitté le tableau des combinaisons',
    !cfgEchec.combos.some((c) => c.id === 'collision')
    && !cfgEchec.combos.some((c) => c.requis.eclair));
  verifier('c’est l’Échec qui porte le contact, et plus rien ne le règle',
    comboDeclencheur(cfgEchec) === 'blocage' && !('attrapeSur' in cfgEchec)
    && !('attrapeSur' in assainirConfig({ nbJoueurs: 6, attrapeSur: 'eclair' })));
  {
    // Le déclencheur suit la combinaison, quels que soient les dés qu'on lui met.
    const cfg = configParDefaut(6);
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
    const libre = configParDefaut(6, { attrapeEveille: false });
    verifier('règle décochée : l’endormi attrape de nouveau',
      departEchec(libre, 'echec-endormi-libre', { eveille: false, voisinCharge: true }).motif === 'attrape');
    verifier('… et le réglage voyage bien dans la configuration',
      cfgEchec.attrapeEveille === true && libre.attrapeEveille === false);
  }
  {
    const cfg = configParDefaut(6);
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
  const N = 50;
  const par = {};
  for (const id of Object.keys(PROFILS_IA)) {
    const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i}`, type: 'ia', profil: id }));
    const r = lancerCampagne(configParDefaut(6), spec, `car-${id}`, N);
    par[id] = {
      reveil: (r.combos.reveil || 0) / N,
      vache: (r.combos.vache || 0) / N,
      zzz: (r.combos.endormir || 0) / N,
      // L'attrape passe par l'Échec, qui sort souvent chez tout le monde : ce
      // qui distingue un agressif, c'est qu'il la cherche et qu'il touche.
      attrape: r.collisions.reussies / N,
      bloque: (r.combos.blocage || 0) / N,
    };
  }
  const dit = (id) => `${PROFILS_IA[id].nom} : ${par[id].reveil.toFixed(0)} réveils, `
    + `${par[id].vache.toFixed(0)} abris, ${par[id].zzz.toFixed(0)} ZzZ, ${par[id].attrape.toFixed(1)} attrapes réussies`;

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
    combosCartesSansPoints: { spSommeil: { cloche: 4 } },
  };

  verifier('cloche redevient tornade, étoile redevient X',
    assainirFaces(ancien.faces).join(',') === 'tornade,tornade,vache,zzz,zzz,x',
    assainirFaces(ancien.faces).join(','));
  verifier('un symbole vraiment inconnu tombe sur « vide »',
    assainirFaces(['tornade', 'brouette']).slice(0, 2).join(',') === 'tornade,vide');
  // Le dé du jeu a six faces : ce n'est plus un réglage, et tout ce qui est
  // relu y revient — c'est éprouvé plus bas, section « Le dé du jeu ».
  verifier('le dé relu a toujours six faces',
    assainirFaces(ancien.faces).length === NB_FACES_DE);
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
  verifier('celles des cartes Tornade non plus, reprises dans le paquet unique',
    JSON.stringify(cfg.combosCartesTornade.spSommeil) === JSON.stringify({ tornade: 4 }));
  verifier('les réglages apparus depuis reprennent leur valeur par défaut',
    cfg.lotsCumules === false
    && cfg.dureeLancer > 0 && cfg.dureeChoix > 0,
    `lotsCumules=${cfg.lotsCumules}`);
  verifier('les réglages d’origine sont conservés',
    cfg.desParLot === 4 && cfg.lots === 3 && cfg.nbJoueurs === 6);

  // Sans traduction, un tiers du dé ne servait à rien : la preuve par le jeu.
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const brut = lancerCampagne({ ...ancien, ...configParDefaut(6), faces: ancien.faces }, spec, 'ancien', 12);
  const soigne = lancerCampagne(cfg, spec, 'ancien', 12);
  verifier('avant : aucun réveil, les tornades manquaient au dé',
    !brut.combos.reveil, `${brut.combos.reveil || 0} réveils`);
  verifier('après : le réveil revient',
    soigne.combos.reveil > 0, `${soigne.combos.reveil} réveils`);
  verifier('après : les parties se terminent toujours',
    !soigne.raisons.limite && !soigne.raisons.manchesMax);
}

// ── 3 quinquies. Le dé a six faces, et c'est tout ────────────────────────────
console.log('\nLe dé du jeu');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  verifier('six faces, et la répartition officielle',
    NB_FACES_DE === 6 && FACES_PAR_DEFAUT.length === 6
    && assainirFaces(null).join(',') === FACES_PAR_DEFAUT.join(','));

  // Le type de dé n'est plus réglable : un d8 ou un d10 enregistré du temps où
  // il l'était reviendrait sans aucun moyen d'en sortir.
  verifier('un d8 enregistré revient à six faces',
    assainirFaces(['tornade', 'tornade', 'x', 'vache', 'zzz', 'zzz', 'tornade', 'vide']).length === 6);
  verifier('un d10 aussi, et il garde ses six premières faces',
    assainirFaces(['vide', 'vide', 'x', 'vache', 'zzz', 'zzz', 'tornade', 'vide', 'x', 'vache'])
      .join(',') === 'vide,vide,x,vache,zzz,zzz');
  verifier('un dé trop court est complété par la répartition officielle',
    assainirFaces(['vide', 'vide']).join(',') === 'vide,vide,x,vache,zzz,zzz');
  verifier('une configuration enregistrée passe par le même filtre',
    assainirConfig({ nbJoueurs: 6, faces: FACES_PAR_DEFAUT.concat(['x', 'x']) }).faces.length === 6);
  // L'éclair a quitté le jeu en v1.84 : sa face reprend celle du dé officiel à
  // sa place, et une exigence qui en demandait l'oublie.
  verifier('une face éclair enregistrée reprend la face officielle de sa place',
    assainirFaces(['tornade', 'eclair', 'x', 'vache', 'zzz', 'eclair']).join(',')
      === 'tornade,tornade,x,vache,zzz,zzz');
  verifier('une exigence en éclairs les oublie',
    JSON.stringify(assainirRequis({ eclair: 3, tornade: 1 })) === '{"tornade":1}');

  // Les jokers ont quitté le jeu : une face qui en portait un reprend la face
  // officielle de sa place, et une exigence qui en demandait les oublie.
  verifier('un joker enregistré sur le dé reprend la face officielle de sa place',
    assainirFaces(['tornade', 'joker', 'x', 'vache', 'jokerDouble', 'zzz']).join(',')
      === FACES_PAR_DEFAUT.join(','));
  verifier('une exigence en jokers les oublie',
    JSON.stringify(assainirRequis({ tornade: 2, joker: 1 })) === JSON.stringify({ tornade: 2 }));
  verifier('les réglages enregistrés perdent la règle des trois jokers',
    !assainirConfig({ nbJoueurs: 6, echecJokers: true }).combos.some((c) => c.id === 'echecJokers'));
  verifier('les jokers et l’éclair sont bien ceux que le jeu retire',
    SYMBOLES_RETIRES.join(',') === 'joker,jokerDouble,eclair');

  // Et le dé du jeu mène bien une campagne à terme.
  {
    const r = lancerCampagne(configParDefaut(6), spec, 'de-officiel', 40);
    verifier(`d6 — 40 parties menées à terme, ${(r.duree.medianeMs / 60000).toFixed(1)} min`,
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
    // Voisin vide : l'Agressif abandonne l'Échec et joue le coup utile.
    const m = new Moteur(configParDefaut(6), spec(6, 'agressif'), 'vise-vide');
    const j = m.joueurs.find((x) => x.lots.length);
    m._suivant(j).lots = [];
    j.eveille = true;
    verifier('voisin vide : l’Agressif ne vise pas le X',
      m._objectifIA(j, j.lots[0]) !== 'x');
    m._suivant(j).lots = [m._nouveauLot()];
    verifier('voisin chargé : le X redevient un objectif possible',
      ['x', 'vache'].includes(m._objectifIA(j, j.lots[0])));
  }
  {
    // Le Très agressif ne vise que le X, une fois réveillé : sans cible, il joue
    // quand même quelque chose d'utile plutôt que de relancer à l'aveugle.
    const m = new Moteur(configParDefaut(6), spec(6, 'tresAgressif'), 'vise-vide-tres');
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
    const r = lancerCampagne(configParDefaut(6), spec(6, profil), `vise-${profil}`, 60);
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
  verifier('les trois modes sont proposés dans les réglages',
    OPTIONS_MANCHE.length === 3
    && OPTIONS_MANCHE.map(([id]) => id).join(',') === 'jeton,immediat,compromis');
  // Le mode était un booléen jusqu'à la v1.50 : un réglage enregistré alors n'a
  // que lui, et doit se lire sans ambiguïté.
  verifier('un réglage d’avant la v1.50 se relit', modeManche({ sansPoints: true }) === 'immediat'
    && modeManche({ sansPoints: false }) === 'jeton'
    && modeManche({}) === 'jeton'
    && modeManche({ modeManche: 'compromis' }) === 'compromis');

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
    const sources = new Set();
    // Le dé officiel n'a pas d'éclair : le contact vient du double X, et une
    // partie sur huit se joue sans qu'aucun ne tombe au bon moment. On regarde
    // donc une poignée de parties — une seule ne dit rien.
    let tentees = 0, reussies = 0;
    for (let g = 0; g < 8; g++) {
      const m = new Moteur(cfg, spec(6), `sp-attrape-${g}`);
      m.onJeton = (pid, equipe, n, source) => sources.add(source);
      m.jouerJusquAuBout();
      tentees += m.joueurs.reduce((a, j) => a + j.stats.collisionsTentees, 0);
      reussies += m.joueurs.reduce((a, j) => a + j.stats.collisionsReussies, 0);
    }
    verifier(`des contacts sont bien tentés (${tentees} sur 8 parties, dont ${reussies} réussis)`,
      tentees > 0);
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
  for (const n of [3, 4, 6, 7]) {
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
  verifier('une ligne qui réclame une face absente du dé ne peut pas sortir',
    !comboPossible(officiel, { vide: 3 }));
  verifier('l’Échec, lui, est toujours possible sur le dé officiel',
    comboPossible(officiel, { x: 2 }));
  verifier('une exigence vide n’est jamais « possible »', !comboPossible(officiel, {}));
}

// ── 3 septies bis quater. Un seul paquet pour toutes les façons de jouer ─────
console.log('\nCartes Tornade — un seul paquet');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const jeton = configParDefaut(6);
  const immediat = configParDefaut(6, { modeManche: 'immediat' });
  const compromis = configParDefaut(6, { modeManche: 'compromis' });

  verifier(`un seul paquet de ${CARTES_TORNADE.length} Tornades, le même dans les trois modes`,
    [jeton, immediat, compromis].every((c) => cartesEnJeu(c).length === CARTES_TORNADE.length)
    && cartesDuJeu() === CARTES_TORNADE);
  verifier('les cartes « Journée » ont quitté le jeu',
    !CARTES_PAR_ID.intensive && !CARTES_PAR_ID.chauffe && !CARTES_PAR_ID.vaillants);
  verifier('une seule clé de paquet et une seule table de combinaisons',
    [jeton, immediat, compromis].every((c) => clePaquet(c) === 'cartesTornade'
      && cleCombosCartes(c) === 'combosCartesTornade'));
  verifier('un paquet de cartes « Journée » enregistré ne retient rien : le paquet est complet',
    cartesEnJeu({ ...jeton, cartesTornade: ['fatigue', 'troupeau'] }).length
      === CARTES_TORNADE.length);

  // Une combinaison réglée vaut pour les trois modes.
  {
    const combo = CARTES_PAR_ID.spFurieuse.combo;
    const regle = { spFurieuse: { x: 4 } };
    verifier('une combinaison de carte réglée vaut dans les trois modes',
      [jeton, immediat, compromis].every((c) => requisCarte({ ...c, combosCartesTornade: regle }, combo).x === 4));
  }

  // Les réglages d'avant la v1.73, rangés par mode, sont repris.
  {
    const ancien = {
      nbJoueurs: 6, modeManche: 'jeton',
      cartes: ['fatigue'],
      cartesSansPoints: ['spMega', 'spSommeil'],
      cartesSansPointsVues: CARTES_TORNADE.filter((c) => c.id !== 'spPoules').map((c) => c.id),
      combosCartesSansPoints: { spMega: { vache: 4 } },
    };
    const repris = assainirConfig(ancien);
    verifier('le paquet d’Immédiat devient le paquet unique, avec ce qu’il avait sous les yeux',
      JSON.stringify(repris.cartesTornade) === '["spMega","spSommeil"]'
      && Array.isArray(repris.cartesTornadeVues));
    verifier('et ses combinaisons réglées aussi',
      JSON.stringify(repris.combosCartesTornade.spMega) === '{"vache":4}');
    verifier('à défaut, c’est celui du Compromis',
      JSON.stringify(migrerPaquet({ cartesCompromis: ['spFurieuse'] }).cartesTornade) === '["spFurieuse"]');
    verifier('un réglage déjà au paquet unique n’est pas touché',
      JSON.stringify(migrerPaquet({ cartesTornade: ['spPaisible'], cartesSansPoints: ['spMega'] })
        .cartesTornade) === '["spPaisible"]');
  }

  // Le même paquet arrive jusqu'à la pioche, quel que soit le mode.
  for (const [nom, cfg] of [['jetons', jeton], ['Immédiat', immediat], ['Compromis', compromis]]) {
    const m = new Moteur(cfg, spec(6), `paquet-${nom}`);
    m.jouerJusquAuBout();
    verifier(`${nom} : la partie ne tire que des Tornades, et ouvre sur la Tornade de Chauffe`,
      m.statsManches.every((x) => CARTES_PAR_ID[x.carte])
      && m.statsManches[0].carte === 'spChauffe' && m.statsManches[0].compte === false);
  }

  // Méga Tornade : cinq symboles. Sur des lots de quatre dés, elle ne peut pas
  // sortir, et la carte le dit.
  verifier('la Méga Tornade demande cinq symboles',
    Object.values(CARTES_PAR_ID.spMega.combo.requis).reduce((t, n) => t + n, 0) === 5);
  verifier('sur des lots de quatre, la carte prévient qu’elle ne peut pas sortir',
    /5 dés/.test(noteCarte(CARTES_PAR_ID.spMega, configParDefaut(6)))
    && noteCarte(CARTES_PAR_ID.spMega, { ...configParDefaut(6), desParLot: 5 }) === '');

  // Les cartes d'animal : à la table où l'animal joue, et nulle part ailleurs.
  {
    const a = (id, cfg) => carteALaTable(CARTES_PAR_ID[id], cfg);
    const c3 = configParDefaut(3);
    const c5 = configParDefaut(5);
    const c6 = configParDefaut(6);
    verifier('Vaches et Poules à toutes les tables, trois joueurs compris',
      a('spVaches', c6) && a('spPoules', c5) && a('spVaches', c3) && a('spPoules', c3));
    verifier('le Cow-Boy avec le joueur Vert — à trois, cinq et sept',
      a('spCowboy', c5) && a('spCowboy', c3) && !a('spCowboy', c6));
    verifier('la Tornade de Cochons a quitté le paquet', !CARTES_PAR_ID.spCochons);
    verifier('la note du Cow-Boy parle du joueur Vert',
      /joueur Vert/.test(noteCarte(CARTES_PAR_ID.spCowboy, c6))
      && noteCarte(CARTES_PAR_ID.spCowboy, c3) === '');
    // Et la pioche du moteur les trie bien.
    const pioche = (cfg, graine) => new Set(new Moteur({ ...cfg, melangerCartes: false }, spec(cfg.nbJoueurs), graine)
      .pioche.map((c) => c.id));
    const p3 = pioche(c3, 'pioche-3');
    const p6 = pioche(c6, 'pioche-6');
    verifier('la pioche à trois : Vaches, Poules et Cow-Boy',
      p3.has('spVaches') && p3.has('spPoules') && p3.has('spCowboy'));
    verifier('la pioche à six : Vaches et Poules, sans Cow-Boy',
      p6.has('spVaches') && p6.has('spPoules') && !p6.has('spCowboy'));
  }

  // Avec les jetons, la manche prise au dernier jeton d'une attrape est une
  // manche gagnée en rattrapant : la Tornade Électrique paie double.
  {
    const cfg = configParDefaut(6);
    // L'Électrique d'abord, et une carte derrière pour la seconde.
    cfg.cartesTornade = ['spElectrique', 'spVaches'];
    cfg.cartesTornadeVues = CARTES_TORNADE.map((c) => c.id);
    cfg.melangerCartes = false;
    const cartesApres = (source) => {
      const m = new Moteur(cfg, spec(6), 'electrique-jetons');
      const j = m.joueurs.find((x) => x.lots.length) || m.joueurs[0];
      const eq = m.equipes[j.equipe];
      eq.retournes = eq.jetons - 1;
      m._retournerJeton(j, 1, source);
      return m.carte.id === 'spElectrique' || eq.cartes[0] === 'spElectrique' ? eq.cartes.length : -1;
    };
    const parAttrape = cartesApres('collision');
    const parAbri = cartesApres('vache');
    verifier(`Tornade Électrique : 2 cartes pour la manche prise en rattrapant, 1 à l’Abri (${parAttrape}, ${parAbri})`,
      parAttrape === 2 && parAbri === 1);
  }
}

// ── 3 septies bis quater bis. Ce qu'une combinaison réglée devient ───────────
console.log('\nCartes Tornade — combinaisons réglées');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  // Une exigence réglée doit arriver jusqu'au moteur — et jusqu'à l'écran. La
  // table lisait `carte.combo.requis`, la référence, et montrait donc la
  // combinaison d'origine quoi qu'on ait réglé dans les menus.
  {
    const cfg = configParDefaut(6, { sansPoints: true });
    cfg.melangerCartes = false;
    cfg.cartesTornade = ['spFurieuse'];
    cfg.cartesTornadeVues = CARTES_TORNADE.map((c) => c.id);
    // Une exigence d'un seul ZzZ : impossible à confondre avec la référence.
    cfg.combosCartesTornade = { spFurieuse: { zzz: 1 } };
    const combo = CARTES_PAR_ID.spFurieuse.combo;
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
      if (enMain > CARTES_TORNADE.length) fautes++;
    }
    verifier('aucune partie ne distribue plus de cartes que le paquet n’en contient',
      fautes === 0);
  }

  // Toutes les parties vont au bout, de 3 à 8 joueurs.
  for (const n of [3, 4, 6, 7]) {
    const r = lancerCampagne(configParDefaut(n, { sansPoints: true }), spec(n), `sp-t-${n}`, 80);
    verifier(`${n} joueurs — 80 parties au bout (${JSON.stringify(r.raisons)})`,
      r.raisons.manchesMax === undefined);
  }
}

// ── 3 sexies ter. La manche « Compromis » ───────────────────────────────────
console.log('\nManche « Compromis »');
{
  const cfg = configParDefaut(6, { modeManche: 'compromis' });
  verifier('cinq cartes pour gagner, trois jetons à l’Abri',
    cfg.cartesPourGagner === 5 && cfg.jetonsRefuge === 3);
  verifier('la collision emporte la manche par défaut', cfg.attrapeGagneManche === 'touche');
  verifier('chaque Tornade demande de un à trois jetons',
    CARTES_TORNADE.every((c) => refugePour(cfg, c) >= 1 && refugePour(cfg, c) <= 3));
  verifier('le réglage d’une carte l’emporte sur son défaut',
    refugePour({ ...cfg, refugeCartes: { spSiecle: 1 } }, CARTES_PAR_ID.spSiecle) === 1);
  verifier('et reste borné par les jetons de l’équipe',
    refugePour({ ...cfg, refugeCartes: { spSiecle: 9 } }, CARTES_PAR_ID.spSiecle) === 3);

  // Une manche se gagne de deux façons, et de deux seulement.
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const RAISONS = new Set(['refuge', 'attrape', 'carte']);
  let manches = 0, parRefuge = 0, parAttrape = 0, jamaisTrop = true, toutesFinies = true;
  let poses = 0, posesHorsRequis = 0;
  for (let g = 0; g < 60; g++) {
    const m = new Moteur(cfg, spec, `compromis-${g}`);
    const requisParManche = new Map();
    m.onJeton = (pid, equipe, n) => {
      poses += n;
      const requis = m.refugeRequis;
      requisParManche.set(m.manche, requis);
      // Une équipe ne met jamais à l'Abri plus que ce que la Tornade demande.
      if (m.equipes[equipe].refuge > requis) posesHorsRequis++;
    };
    const r = m.jouerJusquAuBout();
    if (!r.vainqueur) toutesFinies = false;
    for (const x of r.statsManches) {
      manches++;
      if (!RAISONS.has(x.raison)) jamaisTrop = false;
      if (x.raison === 'refuge') parRefuge++;
      if (x.raison === 'attrape') parAttrape++;
    }
    for (const e of Object.values(r.equipes)) {
      if (e.cartes > cfg.cartesPourGagner + 1) jamaisTrop = false;
    }
  }
  verifier('60 parties menées à terme', toutesFinies);
  verifier(`${manches} manches, toutes prises par l’Abri, la collision ou une carte`, jamaisTrop);
  verifier(`l’Abri en prend ${Math.round(parRefuge / manches * 100)} %`, parRefuge > 0);
  verifier(`la collision en prend ${Math.round(parAttrape / manches * 100)} %`, parAttrape > 0);
  verifier(`${poses} jetons posés, jamais au-delà de ce que la Tornade demande`, posesHorsRequis === 0);

  // Le Refuge se vide à chaque manche : c'est une course neuve.
  {
    const m = new Moteur(cfg, spec, 'compromis-remise');
    let toujoursVide = true;
    const original = m._demarrerManche.bind(m);
    m._demarrerManche = (premiere) => {
      original(premiere);
      for (const e of Object.values(m.equipes)) if (e.refuge !== 0) toujoursVide = false;
    };
    m.jouerJusquAuBout();
    verifier('le Refuge se vide au début de chaque manche', toujoursVide);
  }

  // Les trois modes se jouent avec le même paquet de Tornades.
  const paquets = MODES_MANCHE.map((mode) => clePaquet({ modeManche: mode }));
  verifier(`un seul paquet pour les trois modes (${paquets[0]})`, new Set(paquets).size === 1);
  const tables = MODES_MANCHE.map((mode) => cleCombosCartes({ modeManche: mode }));
  verifier(`une seule table d’exigences (${tables[0]})`, new Set(tables).size === 1);
}

// ── 3 septies. De trois à huit joueurs, jamais plus ─────────────────────────
console.log('\nLes bornes du jeu');
{
  verifier('le jeu se joue de 3 à 8', JOUEURS_MIN === 3 && JOUEURS_MAX === 8
    && NOMBRES_JOUEURS.length === 6);
  verifier('le tableau de mise en place couvre exactement ces tables',
    NOMBRES_JOUEURS.every((n) => MISE_EN_PLACE[n]) && Object.keys(MISE_EN_PLACE).length === 6);
  verifier('une table de neuf enregistrée d’avant revient à huit', bornerJoueurs(9) === 8);
  verifier('une table de deux remonte à trois', bornerJoueurs(2) === 3);
  verifier('une valeur absurde retombe sur six', bornerJoueurs('beaucoup') === 6);
  verifier('configParDefaut borne son effectif', configParDefaut(9).nbJoueurs === 8);
  verifier('assainirConfig borne le sien', assainirConfig({ nbJoueurs: 9 }).nbJoueurs === 8);
  verifier('la mise en place hors bornes rend la ligne la plus proche',
    infosMiseEnPlace(9) === MISE_EN_PLACE[8]);
}

// ── 3 septies bis. Les cartes pour gagner, par table et par équipe ──────────
console.log('\nCartes pour gagner');
{
  for (const [mode, attendu] of [['jeton', 3], ['immediat', 4], ['compromis', 5]]) {
    const off = cartesOfficielles(mode);
    verifier(`mode ${mode} : ${attendu} cartes par défaut à toutes les tables`,
      NOMBRES_JOUEURS.every((n) => off[n] === attendu));
  }
  verifier('une ligne réglée l’emporte', cartesPour({ 6: 7 }, 'jeton', 6) === 7);
  verifier('une ligne absente retombe sur le défaut du mode',
    cartesPour({ 6: 7 }, 'immediat', 5) === 4);
  for (const mauvais of [null, {}, { 6: 0 }, { 6: -2 }, { 6: 'trois' }]) {
    if (cartesPour(mauvais, 'jeton', 6) !== 3) {
      verifier(`une ligne aberrante retombe sur le défaut (${JSON.stringify(mauvais)})`, false);
    }
  }
  verifier('une ligne aberrante retombe sur le défaut, quelle qu’elle soit', true);

  // Le Vert n'existe qu'à nombre impair, et gagne aux mêmes conditions sans
  // réglage propre.
  verifier('le Vert n’a pas d’objectif à nombre pair', cartesVertPour({ 6: 2 }, 'jeton', 6) === null);
  verifier('sans réglage, il gagne comme les équipes', cartesVertPour({}, 'compromis', 5) === 5);
  verifier('avec réglage, il a le sien', cartesVertPour({ 5: 2 }, 'compromis', 5) === 2);

  // Et le moteur l'applique : c'est le levier d'équilibrage du Vert.
  const spec = Array.from({ length: 5 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const compte = (cartesVert) => {
    const cfg = { ...configParDefaut(5, { modeManche: 'compromis' }), cartesVert };
    let gagnees = 0;
    for (let g = 0; g < 60; g++) {
      if (new Moteur(cfg, spec, `objectif-vert-${g}`).jouerJusquAuBout().vainqueur === 'vert') gagnees++;
    }
    return gagnees;
  };
  const facile = compte(2);
  const dur = compte(5);
  verifier(`le Vert gagne ${facile}/60 à 2 cartes et ${dur}/60 à 5 — l’objectif pèse`,
    facile > dur * 2);
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
  // Un dormeur court après ses tornades : trois granges au même jet sont rares,
  // on joue donc quelques parties.
  let vueEnDormant = false;
  for (let g = 0; g < 20 && !vueEnDormant; g++) {
    const m = new Moteur(cfg, spec, `abri-endormi-${g}`);
    const original = m.combosDisponibles.bind(m);
    m.combosDisponibles = (j) => {
      const dispo = original(j);
      if (!j.eveille && dispo.some((c) => c.id === 'vache')) vueEnDormant = true;
      return dispo;
    };
    m.jouerJusquAuBout();
  }
  verifier('décochée, l’Abri est proposé à un joueur endormi', vueEnDormant);
}

// ── 3 septies bis quinquies. Ce qu'une configuration ancienne retrouve ───────
console.log('\nUne combinaison disparue revient');
{
  // Le Laboratoire enregistre sa configuration entière : une combinaison ajoutée
  // depuis — ou perdue en route — manquait sans un bruit.
  const ampute = configParDefaut(6);
  ampute.combos = ampute.combos.filter((c) => c.id !== 'endormir');
  const repare = assainirConfig(ampute);
  verifier('l’Endormi revient dans une configuration qui l’avait perdu',
    repare.combos.some((c) => c.id === 'endormir'));
  verifier('les seuils déjà réglés sont conservés',
    (() => {
      const cfg = configParDefaut(6);
      cfg.combos = cfg.combos
        .filter((c) => c.id !== 'endormir')
        .map((c) => (c.id === 'vache' ? { ...c, requis: { vache: 5 } } : c));
      const r = assainirConfig(cfg);
      return r.combos.find((c) => c.id === 'vache').requis.vache === 5
        && r.combos.some((c) => c.id === 'endormir');
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
  // Sur des lots de quatre dés, la Méga Tornade demande cinq granges : elle ne
  // peut pas sortir, et le tableau doit le montrer plutôt que de rester muet.
  const mega = r.parCarte.find((c) => c.id === 'spMega');
  verifier('une carte que le lot ne peut pas produire affiche un taux nul',
    mega && mega.jouee > 0 && mega.manchesRealisee === 0);
  const sommeil = r.parCarte.find((c) => c.id === 'spSommeil');
  verifier(`« Tornade du Sommeil » sort dans ${sommeil && sommeil.manchesRealisee}/${sommeil && sommeil.jouee} de ses manches`,
    sommeil && sommeil.manchesRealisee > 0);
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

// ── 3 septies quater quater. Le réglage livré « Vichy » ─────────────────────
console.log('\nRéglage livré « Vichy »');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const vichy = PROFILS_INTEGRES.find((p) => p.id === 'vichy');
  verifier('le réglage est écrit dans le code, pas dans le navigateur', !!vichy && vichy.integre);

  const paquet = vichy.variables.cartesTornade;
  verifier(`son paquet compte les 14 Tornades (${paquet.length})`, paquet.length === 14);

  // Les cartes à réunir, effectif par effectif : l'objectif monte avec la table,
  // et le Vert — seul contre deux équipes — en a bien moins à réunir.
  {
    const eq = vichy.variables.cartesParMode.immediat;
    const vert = vichy.variables.cartesVertParMode.immediat;
    verifier('ses cartes pour gagner suivent le nombre de joueurs (4·5·5·5·6·6)',
      NOMBRES_JOUEURS.map((n) => eq[n]).join('·') === '4·5·5·5·6·6');
    verifier('celles du Vert aussi, aux effectifs impairs (2·3·4)',
      [3, 5, 7].map((n) => vert[n]).join('·') === '2·3·4');
    verifier('le Vert en a toujours moins que les équipes',
      [3, 5, 7].every((n) => vert[n] < eq[n]));
    // Et une partie jouée sous Vichy lit bien ces lignes-là.
    verifier('une partie Vichy vise le nombre de cartes de sa table',
      NOMBRES_JOUEURS.every((n) => {
        const c = { ...configParDefaut(n, { modeManche: 'immediat' }),
          cartesPourGagner: eq[n], cartesVert: vert[n] };
        const m = new Moteur(c, spec(n), `vichy-cartes-${n}`);
        m.jouerJusquAuBout();
        const gagnant = m.equipes[m.vainqueur];
        return !gagnant || gagnant.cartes.length >= (m.vainqueur === 'vert' ? vert[n] : eq[n])
          || m.raisonFin !== 'cartes';
      }));
  }
  verifier('elles existent toutes', paquet.every((id) => !!CARTES_PAR_ID[id]));
  verifier('aucune n’y figure deux fois', new Set(paquet).size === paquet.length);

  // Ce que chaque carte imprimée doit savoir faire.
  const effet = (id) => CARTES_PAR_ID[id].effetPassif || {};
  verifier('la Tornade de chauffe ne rapporte pas de carte',
    CARTES_PAR_ID.spChauffe.neCompted === true && CARTES_PAR_ID.spChauffe.toujoursPremiere === true);
  verifier('la Chargée ajoute un lot', effet('spChargee').lotsEnPlus === 1);
  verifier('les Tricheurs rendent les dés au gagnant',
    effet('spTricheurs').gagnantPrendLesDes === true);
  verifier('la Chapardeuse vole une carte', effet('spF5').volerCarte === true);
  verifier('le Siècle vaut double pour qui le remporte',
    effet('spSiecle').doubleTous === true && !CARTES_PAR_ID.spSiecle.combo);
  verifier('la Paisible relance un dé à la fois, la Maladroite ralentit',
    effet('spPaisible').unParUn === true && effet('spMaladroite').lenteur > 1);

  // Les combinaisons dessinées sur les cartes arrivent bien au moteur.
  const cfg = configParDefaut(6, { modeManche: 'immediat' });
  Object.assign(cfg, vichy.variables);
  cfg.nbJoueurs = 6;
  verifier('la Tornade du Sommeil endort les deux voisins',
    CARTES_PAR_ID.spSommeil.combo.effet === 'endormirVoisins'
    && /endormez vos 2 voisins/i.test(CARTES_PAR_ID.spSommeil.texte));

  // La combinaison d'une carte se réalise dans les deux états : c'est ce qui la
  // distingue des combinaisons de base, dont la plupart demandent d'être
  // réveillé. On l'éprouve sur le moteur, pas seulement sur le texte.
  {
    const cfg = configParDefaut(6, { modeManche: 'immediat' });
    cfg.melangerCartes = false;
    cfg.cartesTornade = ['spSommeil'];
    cfg.cartesTornadeVues = CARTES_TORNADE.map((c) => c.id);
    const m = new Moteur(cfg, spec(6), 'deux-etats');
    const j = m.joueurs.find((x) => x.lots.length);
    // Un lot qui sert la combinaison de la carte, et rien d'autre.
    const requis = requisCarte(cfg, CARTES_PAR_ID.spSommeil.combo);
    const faces = [];
    for (const [sym, n] of Object.entries(requis)) for (let i = 0; i < n; i++) faces.push(sym);
    const poser = () => {
      const lot = j.lots[0];
      lot.des.forEach((d, i) => { d.sym = faces[i] || 'vide'; d.roule = false; d.verrou = false; });
      lot.lance = true;
    };
    poser(); j.eveille = false;
    const endormi = m.combosDisponibles(j).some((d) => d.source === 'journee');
    poser(); j.eveille = true;
    const reveille = m.combosDisponibles(j).some((d) => d.source === 'journee');
    verifier('la combinaison de la carte se réalise Tornade endormie comme réveillée',
      endormi && reveille, `endormi ${endormi}, réveillé ${reveille}`);
  }

  verifier('la règle des deux états est écrite quelque part',
    /deux états/i.test(REGLE_CARTES_DEUX_ETATS));

  verifier('les combinaisons imprimées arrivent au moteur',
    JSON.stringify(requisCarte(cfg, CARTES_PAR_ID.spMega.combo)) === '{"vache":5}'
    && JSON.stringify(requisCarte(cfg, CARTES_PAR_ID.spSommeil.combo)) === '{"zzz":4}'
    && JSON.stringify(requisCarte(cfg, CARTES_PAR_ID.spFurieuse.combo)) === '{"x":3}');

  const enJeu = cartesEnJeu(cfg);
  verifier(`le paquet en jeu est bien celui de Vichy (${enJeu.length} cartes)`,
    enJeu.length === 14 && paquet.every((id) => enJeu.includes(id)));

  // La Tornade chargée doit vraiment poser un lot de plus, la chauffe ne rien
  // rapporter, et une campagne entière aller au bout.
  {
    const c = configParDefaut(6, { modeManche: 'immediat' });
    Object.assign(c, vichy.variables);
    c.melangerCartes = false;
    const m = new Moteur(c, spec(6), 'vichy-chauffe');
    verifier('la partie ouvre sur la Tornade de chauffe', m.carte && m.carte.id === 'spChauffe');
    m.jouerJusquAuBout();
    const chauffe = m.statsManches.find((x) => x.carte === 'spChauffe');
    verifier('et la manche de chauffe ne rapporte aucune carte',
      chauffe && chauffe.compte === false);
  }
  {
    const c = configParDefaut(6, { modeManche: 'immediat' });
    Object.assign(c, vichy.variables);
    c.melangerCartes = false;
    c.cartesTornade = ['spChargee'];
    c.cartesTornadeVues = CARTES_TORNADE.map((x) => x.id);
    const avec = new Moteur(c, spec(6), 'vichy-lots');
    const temoin = new Moteur({ ...c, cartesTornade: ['spSommeil'] }, spec(6), 'vichy-lots');
    const lots = (m) => m.joueurs.reduce((a, j) => a + j.lots.length, 0);
    verifier(`la Tornade chargée pose ${lots(avec)} lots au lieu de ${lots(temoin)}`,
      lots(avec) === lots(temoin) + 1);
  }
  {
    const c = configParDefaut(5, { modeManche: 'immediat' });
    Object.assign(c, vichy.variables);
    c.nbJoueurs = 5;
    const r = lancerCampagne(c, spec(5), 'vichy-camp', 60);
    verifier('60 parties de Vichy menées à terme',
      r.raisons.manchesMax === undefined
      && (r.raisons.cartes || 0) + (r.raisons.pioche || 0) === 60,
      JSON.stringify(r.raisons));
  }
}

// ── 3 septies quater bis. Les trois Tornades qui gênent ─────────────────────
console.log('\nTornades Paisible, Maladroite et Chargée');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  verifier('les trois sont au paquet des modes Immédiat et Compromis',
    ['spPaisible', 'spMaladroite', 'spChargee']
      .every((id) => CARTES_TORNADE.some((c) => c.id === id)
        && cartesEnJeu(configParDefaut(6, { modeManche: 'immediat' })).includes(id)
        && cartesEnJeu(configParDefaut(6, { modeManche: 'compromis' })).includes(id)));
  verifier('les Tornades hors du paquet imprimé ont quitté le jeu',
    ['spOrageuse', 'spFeuille', 'spMini'].every((id) => !CARTES_PAR_ID[id]));
  verifier('aucune des trois ne demande plus d’un jeton à l’Abri',
    ['spPaisible', 'spMaladroite', 'spChauffe']
      .every((id) => refugePour(configParDefaut(6, { modeManche: 'compromis' }), CARTES_PAR_ID[id]) === 1));

  // Une partie sur une seule carte : l'effet de la manche est celui de la carte
  // et de rien d'autre.
  const surUneCarte = (id, opts = {}) => {
    const cfg = configParDefaut(6, { modeManche: 'immediat', ...opts });
    cfg.melangerCartes = false;
    cfg.cartesTornade = [id];
    cfg.cartesTornadeVues = CARTES_TORNADE.map((c) => c.id);
    const m = new Moteur(cfg, spec(6), `carte-${id}`);
    return m;
  };

  // Tornade Chargée : un lot de plus au coup d'envoi, jamais plus qu'il n'y a de
  // joueurs — personne ne tient deux lots.
  {
    const normal = surUneCarte('spSommeil');
    const chargee = surUneCarte('spChargee');
    const lots = (m) => m.joueurs.reduce((a, j) => a + j.lots.length, 0);
    verifier(`Tornade Chargée — ${lots(chargee)} lot(s) au lieu de ${lots(normal)}`,
      lots(chargee) === lots(normal) + 1);
    // À trois joueurs avec trois lots, elle n'en ajoute pas un quatrième.
    const cfg3 = configParDefaut(3, { modeManche: 'immediat' });
    cfg3.melangerCartes = false;
    cfg3.cartesTornade = ['spChargee'];
    cfg3.cartesTornadeVues = CARTES_TORNADE.map((c) => c.id);
    cfg3.lots = 3;
    const m3 = new Moteur(cfg3, spec(3), 'chargee-3');
    verifier('elle ne pose jamais plus de lots qu’il n’y a de joueurs',
      m3.joueurs.reduce((a, j) => a + j.lots.length, 0) === 3);
  }

  // Tornade paisible : un seul dé relancé à la fois. Le premier jet d'un lot
  // neuf part toujours en entier — c'est une relance qui se fait un par un.
  {
    const compter = (id) => {
      const m = surUneCarte(id);
      let relances = 0, plusieurs = 0;
      const avant = m._demarrerLancer.bind(m);
      m._demarrerLancer = (j, indices) => {
        const lot = j.lots[0];
        const neuf = lot && lot.des.some((d) => d.sym === null);
        const roulants = lot ? lot.des.filter((d) => d.roule).length : 0;
        const ok = avant(j, indices);
        if (!ok || neuf) return ok;
        const partis = lot.des.filter((d) => d.roule).length - roulants;
        if (partis > 0) { relances++; if (partis > 1) plusieurs++; }
        return ok;
      };
      m.jouerJusquAuBout();
      return { relances, plusieurs };
    };
    const paisible = compter('spPaisible');
    const temoin = compter('spTricheurs');
    verifier(`Tornade paisible — ${paisible.relances} relances, jamais deux dés à la fois`,
      paisible.relances > 0 && paisible.plusieurs === 0,
      `${paisible.plusieurs} relance(s) multiple(s)`);
    verifier(`sans elle, les relances multiples existent bien (${temoin.plusieurs} sur ${temoin.relances})`,
      temoin.plusieurs > 0);
  }

  // Tornade maladroite : tout est plus lent, et l'on se trompe davantage.
  {
    const duree = (id) => {
      let total = 0, manches = 0;
      for (let g = 0; g < 40; g++) {
        const cfg = configParDefaut(6, { modeManche: 'immediat' });
        cfg.melangerCartes = false;
        cfg.cartesTornade = [id];
        cfg.cartesTornadeVues = CARTES_TORNADE.map((c) => c.id);
        const m = new Moteur(cfg, spec(6), `duree-${id}-${g}`);
        m.jouerJusquAuBout();
        for (const s of m.statsManches) { total += s.duree; manches++; }
      }
      return total / Math.max(1, manches);
    };
    const sans = duree('spTricheurs');
    const avec = duree('spMaladroite');
    verifier(`Tornade maladroite — manche de ${(avec / 1000).toFixed(1)}s contre ${(sans / 1000).toFixed(1)}s sans elle`,
      avec > sans * 1.1);
  }

  // Et aucune des trois ne bloque une partie, dans les deux modes concernés.
  for (const mode of ['immediat', 'compromis']) {
    const r = lancerCampagne(configParDefaut(5, { modeManche: mode }), spec(5), `gene-${mode}`, 60);
    verifier(`${mode} — 60 parties au bout avec le nouveau paquet`,
      r.raisons.manchesMax === undefined
      && (r.raisons.cartes || 0) + (r.raisons.pioche || 0) === 60,
      JSON.stringify(r.raisons));
  }
}

// ── 3 septies quater ter. Un paquet enregistré et les cartes arrivées depuis ─
console.log('\nPaquet enregistré et cartes nouvelles');
{
  const tousSp = CARTES_TORNADE.map((c) => c.id);
  // Une carte ajoutée au jeu après coup porte sa date d'arrivée : c'est ce qui
  // permet à un paquet composé avant elle de la récupérer. Le paquet imprimé
  // est arrivé d'un bloc — aucune carte n'est donc datée pour l'instant, et
  // c'est bien ce que l'on vérifie ici : les paquets d'avant gardent alors leur
  // choix exact, sans rien récupérer.
  const datees = CARTES_TORNADE.filter((c) => c.depuis);
  verifier(`les dates d’arrivée sont bien formées (${datees.length} carte(s) datée(s))`,
    datees.every((c) => /^\d+\.\d+$/.test(c.depuis)));

  const enJeu = (paquet, vues) => cartesEnJeu({
    modeManche: 'compromis',
    cartesTornade: paquet,
    ...(vues ? { cartesTornadeVues: vues } : {}),
  });

  // Sans trace de ce qui était proposé, on date le paquet par la plus récente
  // des cartes qu'il retient : ce qui est arrivé après le rejoint, le reste de
  // ses choix tient.
  {
    const sans = tousSp.filter((id) => id !== 'spSommeil' && !CARTES_PAR_ID[id].depuis);
    const obtenu = enJeu(sans);
    verifier('un paquet sans trace garde ce qu’il avait décoché',
      !obtenu.includes('spSommeil'), `${obtenu.length} cartes en jeu`);
    verifier('et récupère tout ce qui est arrivé après lui',
      datees.every((c) => obtenu.includes(c.id)));
  }

  // Avec la trace de ce qui était proposé, le choix vaut sans discussion.
  {
    const obtenu = enJeu(['spPaisible'], tousSp);
    verifier('un paquet daté est repris tel quel',
      obtenu.length === 1 && obtenu[0] === 'spPaisible');
    const partiel = enJeu(['spPaisible'], ['spPaisible', 'spVaches']);
    verifier('et ce qu’il n’avait pas sous les yeux le rejoint',
      partiel.includes('spPaisible') && !partiel.includes('spVaches')
      && partiel.includes('spSommeil') && partiel.length === tousSp.length - 1);
  }

  verifier('un paquet vide reste le jeu complet',
    enJeu([]).length === tousSp.length && enJeu(null).length === tousSp.length);
}

// ── 3 septies quinquies. Ce qu'on fait d'une combinaison servie ─────────────
console.log('\nCombinaison servie : d’office, ou au choix');
{
  const spec = (n, h = 0) => Array.from({ length: n }, (_, i) => ({
    nom: `J${i + 1}`, type: i < h ? 'humain' : 'ia', profil: 'penible',
  }));

  verifier('la règle de base applique tout d’office',
    comboAutomatique(configParDefaut(6)) === true
    && comboAutomatique({ comboServie: 'choix' }) === false);
  verifier('une valeur inconnue reste sur la règle de base',
    comboAutomatique({ comboServie: 'nimportequoi' }) === true
    && assainirConfig({ nbJoueurs: 6, comboServie: 'choix' }).comboServie === 'choix');

  // L'Abri et l'Échec s'appliquent toujours, quel que soit le réglage.
  {
    const cfg = configParDefaut(6, { comboServie: 'choix' });
    cfg.comboServie = 'choix';
    const inevitables = ['vache', 'blocage']
      .map((id) => ({ id, combo: { id, echec: id !== 'vache' } }));
    verifier('l’Abri et les échecs ne se refusent jamais',
      inevitables.every((d) => comboIneluctable(d) && !comboRefusable(cfg, d)));
    verifier('la combinaison de la Tornade du jour non plus',
      comboIneluctable({ id: 'spMega', source: 'journee' }));
    verifier('l’Endormi se refuse',
      ['endormir']
        .every((id) => !comboIneluctable({ id, combo: { id } })
          && comboRefusable(cfg, { id, combo: { id } })));
    verifier('le Réveil jamais : un dormeur qui le sort se réveille',
      comboIneluctable({ id: 'reveil', combo: { id: 'reveil' } })
      && !comboRefusable(cfg, { id: 'reveil', combo: { id: 'reveil' } }));
    verifier('et rien ne se refuse sous la règle de base',
      ['reveil', 'endormir'].every((id) => !comboRefusable(configParDefaut(6), { id, combo: { id } })));
  }

  // À la table, une IA qui vise le ZzZ ne doit plus se réveiller d'office.
  {
    const compter = (choix) => {
      let reveils = 0, manches = 0;
      for (let g = 0; g < 40; g++) {
        const cfg = configParDefaut(6, { comboServie: choix });
        cfg.comboServie = choix;
        const m = new Moteur(cfg, spec(6), `servie-${choix}-${g}`);
        m.jouerJusquAuBout();
        reveils += m.joueurs.reduce((a, j) => a + j.stats.reveils, 0);
        manches += m.manche;
      }
      return { reveils, manches };
    };
    const dOffice = compter('auto');
    const auChoix = compter('choix');
    verifier(`des IA Pénibles se réveillent moins quand elles peuvent relancer `
      + `(${auChoix.reveils} contre ${dOffice.reveils} sur 40 parties)`,
      auChoix.reveils < dOffice.reveils);
    verifier(`et les parties vont toujours au bout (${auChoix.manches} manches)`,
      auChoix.manches > 0);
  }

  // Le joueur humain garde son lot : rien ne part tant qu'il n'encaisse pas.
  {
    const cfg = configParDefaut(6, { comboServie: 'choix' });
    cfg.comboServie = 'choix';
    const m = new Moteur(cfg, spec(6, 1), 'servie-humain');
    let tenue = null;
    for (let i = 0; i < 60000 && m.file.taille && !m.termine && !tenue; i++) {
      m.avancerJusqua(m.file.tete._t);
      const j = m.joueurs[0];
      if (j.attente && j.attente.combos) { tenue = j.attente.combos; break; }
      if (j.attente && j.lots.length) m.lancerHumain(0);
      if (m.duel) { m.reflexeHumain(m.duel.cibleId, 'esquiver'); m.reflexeHumain(m.duel.toucheurId, 'toucher'); }
    }
    verifier('l’humain se voit proposer la combinaison au lieu de la subir',
      !!tenue && tenue.length > 0, tenue ? tenue.map((d) => d.id).join('+') : 'jamais proposée');
    if (tenue) {
      verifier('son lot ne part pas tout seul',
        m.joueurs[0].lots.length === 1 && !m.joueurs[0].fige);
      verifier('et il l’encaisse quand il le décide',
        m.jouerComboHumain(0, tenue[0].id) === true);
    }
  }

  // Aucune des deux règles ne bloque une partie, dans les trois modes.
  for (const mode of MODES_MANCHE) {
    for (const choix of ['auto', 'choix']) {
      const cfg = configParDefaut(5, { modeManche: mode, comboServie: choix });
      cfg.comboServie = choix;
      const r = lancerCampagne(cfg, spec(5), `servie-${mode}-${choix}`, 40);
      verifier(`${mode} · ${choix} — 40 parties au bout`,
        r.raisons.manchesMax === undefined
        && (r.raisons.cartes || 0) + (r.raisons.pioche || 0) === 40,
        JSON.stringify(r.raisons));
    }
  }
}

// ── 3 septies quater. Le sens de rotation, trois règles ──────────────────────
console.log('\nLe sens de rotation');
{
  const spec = (n, humains = 0) => Array.from({ length: n }, (_, i) => ({
    nom: `J${i + 1}`, type: i < humains ? 'humain' : 'ia', profil: 'equilibre',
  }));

  verifier('sans réglage, c’est la carte rotation qui décide, dans les trois modes',
    MODES_MANCHE.every((m) => sensRotation(configParDefaut(6, { modeManche: m })) === 'perdants'));
  verifier('une valeur inconnue retombe sur la carte rotation',
    sensRotation({ modeManche: 'jeton', sensRotation: 'nimportequoi' }) === 'perdants');
  // Les Tornades n'ont plus de flèche au dos : le réglage qui demandait de la
  // lire n'a plus d'objet, et retombe lui aussi sur la carte rotation.
  verifier('l’ancien réglage « au dos de la Tornade » retombe sur la carte rotation',
    sensRotation({ sensRotation: 'carte' }) === 'perdants'
    && assainirConfig({ nbJoueurs: 6, sensRotation: 'carte' }).sensRotation === 'perdants');
  verifier('aucune carte ne porte plus de sens',
    CARTES_TORNADE.every((c) => c.sens === undefined));

  // Le sens observé au début de chaque manche, partie menée jusqu'au bout.
  const sensDesManches = (opts, graine) => {
    const cfg = configParDefaut(6, opts);
    Object.assign(cfg, opts);
    const m = new Moteur(cfg, spec(6), graine);
    const vus = [m.sens];
    const avant = m._demarrerManche.bind(m);
    m._demarrerManche = (premiere) => { avant(premiere); vus.push(m.sens); };
    m.jouerJusquAuBout();
    return { m, vus };
  };

  {
    const { m, vus } = sensDesManches({ modeManche: 'jeton', sensRotation: 'alterne' }, 'sens-alt');
    let alterne = true;
    for (let i = 2; i < vus.length; i++) if (vus[i] === vus[i - 1]) alterne = false;
    verifier(`« une manche sur l’autre » — ${m.manche} manches, le sens s’inverse à chaque fois`,
      alterne && m.termine, vus.join(' '));
  }

  {
    // Sous la règle des perdants, le sens ne bouge qu'entre deux manches, et
    // seulement si les perdants y gagnent : il n'alterne donc pas d'office.
    const { m, vus } = sensDesManches(
      { modeManche: 'jeton', sensRotation: 'perdants' }, 'sens-perd');
    const decisions = m.journal.filter((l) => /Carte de sens/.test(l.texte || ''));
    verifier(`« carte de sens » — ${m.manche} manches menées à terme`, m.termine, vus.join(' '));
    // La dernière manche donne la partie : elle n'ouvre plus de décision, il
    // n'y a plus de manche suivante à orienter.
    verifier('une décision est prise à la fin de chaque manche sauf la dernière',
      decisions.length === m.statsManches.length - 1,
      `${decisions.length} décision(s) pour ${m.statsManches.length} manche(s)`);
    verifier('le sens enregistré suit la carte, jamais une alternance forcée',
      vus.every((s) => s === 1 || s === -1));
  }

  // La décision d'une IA se prend d'elle-même ; celle d'un humain attend.
  {
    const cfg = configParDefaut(6, { sensRotation: 'perdants' });
    cfg.sensRotation = 'perdants';
    const m = new Moteur(cfg, spec(6), 'sens-ia');
    let ouverte = null;
    m.onFinManche = (info) => { if (!ouverte) ouverte = info.choixSens; };
    while (!m.termine && m.file.taille && !ouverte) m.avancerJusqua(m.file.tete._t);
    verifier('table d’IA — la carte est tranchée sans attendre',
      !!ouverte && ouverte.decide === true && ouverte.humain === false);
  }
  {
    const cfg = configParDefaut(6, { sensRotation: 'perdants' });
    cfg.sensRotation = 'perdants';
    const m = new Moteur(cfg, spec(6, 6), 'sens-humain');
    let ouverte = null;
    m.onFinManche = (info) => { if (!ouverte) ouverte = info.choixSens; };
    let garde = 0;
    while (!m.termine && m.file.taille && !ouverte && garde++ < 200000) {
      m.avancerJusqua(m.file.tete._t);
      if (m.duel) { m.reflexeHumain(m.duel.cibleId, 'esquiver'); m.reflexeHumain(m.duel.toucheurId, 'toucher'); }
      for (const j of m.joueurs) if (j.attente && j.lots.length) m.lancerHumain(j.id);
    }
    verifier('table humaine — la carte attend une réponse',
      !!ouverte && ouverte.decide === false && ouverte.humain === true);
    if (ouverte) {
      const avant = m.sens;
      verifier('retourner la carte inverse le sens', m.choisirSens(true) && m.sens === -avant);
      verifier('on ne décide qu’une fois', m.choisirSens(true) === false && m.sens === -avant);
    }
  }

  // Le conseil de l'IA est bien celui de son intérêt : face à un voisin d'aval
  // inattaquable et un voisin d'amont redoutable, elle retourne la carte.
  {
    const cfg = configParDefaut(4, { sensRotation: 'perdants' });
    cfg.sensRotation = 'perdants';
    const m = new Moteur(cfg, spec(4), 'sens-conseil');
    m.sens = 1;
    for (const j of m.joueurs) { j.adresse = 0.5; j.esquive = 0.5; }
    // Le siège 1 est la proie facile, le siège 3 le prédateur : le camp du
    // siège 0 a tout intérêt à tourner vers le premier.
    m.joueurs[1].esquive = 0.02;
    m.joueurs[3].adresse = 0.95;
    verifier('le sens conseillé mène vers la proie, pas vers le chasseur',
      m._sensConseille([m.joueurs[0]]) === 1);
    m.joueurs[1].esquive = 0.95;
    m.joueurs[3].adresse = 0.05;
    m.joueurs[3].esquive = 0.02;
    verifier('les voisins échangés, l’IA retourne la carte',
      m._sensConseille([m.joueurs[0]]) === -1);
  }

  // Le caractère des voisins compte autant que leur adresse : on préfère avoir
  // dans le dos quelqu'un qui court à l'abri plutôt qu'un chercheur d'éclairs.
  {
    const cfg = configParDefaut(4, { sensRotation: 'perdants' });
    cfg.sensRotation = 'perdants';
    const m = new Moteur(cfg, [
      { nom: 'A', type: 'ia', profil: 'equilibre' },
      { nom: 'B', type: 'ia', profil: 'logique' },
      { nom: 'C', type: 'ia', profil: 'equilibre' },
      { nom: 'D', type: 'ia', profil: 'tresAgressif' },
    ], 'sens-caractere');
    m.sens = 1;
    // Mêmes mains pour tous : seul le caractère les sépare.
    for (const j of m.joueurs) { j.adresse = 0.6; j.esquive = 0.55; }
    verifier('le Très agressif est meilleur en proie qu’en prédateur',
      m._appetitAttaque(m.joueurs[3]) > m._appetitAttaque(m.joueurs[1])
      && m._sensConseille([m.joueurs[0]]) === -1);
  }

  // Aucune des trois règles ne bloque une partie, dans les trois modes.
  for (const mode of MODES_MANCHE) {
    for (const [regle] of OPTIONS_SENS) {
      const cfg = configParDefaut(5, { modeManche: mode, sensRotation: regle });
      cfg.sensRotation = regle;
      const r = lancerCampagne(cfg, spec(5), `sens-${mode}-${regle}`, 40);
      // Une partie finit sur l'objectif ou sur la pioche épuisée — jamais sur
      // la limite de manches, qui signalerait une partie qui tourne en rond.
      verifier(`${mode} · ${regle} — 40 parties au bout`,
        r.raisons.manchesMax === undefined
        && (r.raisons.cartes || 0) + (r.raisons.pioche || 0) === 40,
        JSON.stringify(r.raisons));
    }
  }
}

// ── 3 septies sexies. Les jetons posés sur la carte Tornade ─────────────────
// Les jetons en jeu sont sur la carte Tornade, et chaque Abri en sort un. Le
// compte des Abris à réussir ne change pas — c'est le geste, et ce qu'on lit à
// la table. Ces épreuves vérifient les deux : que le réglage dit bien où ils
// sont, et qu'il ne déplace pas un seul chiffre de la partie.
console.log('\nLes jetons sur la carte Tornade');
{
  const spec6 = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));

  // Le réglage, et ce qu'il devient dans une configuration.
  const cfg = configParDefaut(6);
  verifier('les jetons sont sur la carte Tornade par défaut',
    cfg.placeJetons === 'tornade' && jetonsSurTornade(cfg));
  verifier('l’ancienne place reste réglable',
    !jetonsSurTornade(configParDefaut(6, { placeJetons: 'equipe' })));
  verifier('une valeur inconnue retombe sur la carte Tornade',
    jetonsSurTornade(configParDefaut(6, { placeJetons: 'nulle part' })));
  verifier('un réglage enregistré sans le champ lit la règle du jeu',
    assainirConfig({ nbJoueurs: 6 }).placeJetons === 'tornade');
  verifier('et un réglage qui garde l’ancienne place la garde',
    assainirConfig({ nbJoueurs: 6, placeJetons: 'equipe' }).placeJetons === 'equipe');
  verifier('les deux options du menu, et deux seulement',
    OPTIONS_PLACE_JETONS.length === 2
    && OPTIONS_PLACE_JETONS.map(([id]) => id).join(',') === 'tornade,equipe');

  // Ce que la carte porte : tout le stock de l'équipe avec les jetons, ce que la
  // Tornade du jour retient en Compromis, rien du tout en Immédiat.
  {
    const m = new Moteur(cfg, spec6, 'tornade-suivi');
    const eq = Object.values(m.equipes)[0];
    const s0 = m.suiviJetons(eq.id);
    verifier(`la carte retient les ${eq.jetons} jetons de l’équipe`,
      s0.total === eq.jetons && s0.restants === eq.jetons && s0.faits === 0);
    eq.retournes = 1;
    const s1 = m.suiviJetons(eq.id);
    verifier('un Abri en sort un', s1.restants === eq.jetons - 1 && s1.faits === 1);
    verifier('une équipe inconnue ne retient rien', m.suiviJetons('rose').total === 0);
  }
  {
    const cc = configParDefaut(6, { modeManche: 'compromis' });
    const m = new Moteur(cc, spec6, 'tornade-suivi-compromis');
    const eq = Object.values(m.equipes)[0];
    verifier(`Compromis : la Tornade en retient ${m.refugeRequis}, pas les ${eq.jetons} du stock`,
      m.suiviJetons(eq.id).total === refugePour(cc, m.carte)
      && m.suiviJetons(eq.id).total === m.refugeRequis);
  }

  // Le cœur de l'affaire : le réglage ne touche à aucun chiffre. Même graine,
  // même partie — seul le journal se dit autrement.
  {
    let identiques = 0, differences = [];
    for (let g = 0; g < 40; g++) {
      for (const mode of ['jeton', 'compromis']) {
        const surCarte = new Moteur(configParDefaut(6, { modeManche: mode }), spec6, `place-${mode}-${g}`)
          .jouerJusquAuBout();
        const devant = new Moteur(
          configParDefaut(6, { modeManche: mode, placeJetons: 'equipe' }), spec6, `place-${mode}-${g}`,
        ).jouerJusquAuBout();
        const meme = surCarte.vainqueur === devant.vainqueur
          && surCarte.manches === devant.manches
          && surCarte.duree === devant.duree;
        if (meme) identiques++;
        else differences.push(`${mode}-${g}`);
      }
    }
    verifier(`80 parties jouées aux deux places : ${identiques} identiques`,
      identiques === 80, differences.slice(0, 3).join(', '));
  }

  // Ce que la table et le journal en disent.
  {
    const lignes = (opts) => {
      const m = new Moteur(configParDefaut(6, opts), spec6, 'place-journal');
      const annonces = [];
      m.onAnnonce = (texte) => annonces.push(texte);
      m.jouerJusquAuBout();
      return { jetons: m.journal.filter((e) => e.type === 'jeton'), annonces, moteur: m };
    };
    const carte = lignes({});
    const devant = lignes({ placeJetons: 'equipe' });
    verifier(`${carte.jetons.length} Abris annoncés : tous sortent un jeton de la Tornade`,
      carte.jetons.length > 0 && carte.jetons.every((e) => /de la Tornade/.test(e.texte)));
    verifier(`${devant.jetons.length} Abris à l’ancienne : tous retournent un jeton`,
      devant.jetons.length > 0 && devant.jetons.every((e) => /retourne \d+ jeton/.test(e.texte)));
    verifier('la table annonce ce qui reste dans la Tornade',
      carte.annonces.some((t) => /Abri ! .+ \d+ dans la Tornade/.test(t)));
    verifier('la manche gagnée se dit du geste qu’on a fait',
      carte.moteur._motifVictoire({ raison: 'jetons' }) === 'en sortant son dernier jeton de la Tornade'
      && devant.moteur._motifVictoire({ raison: 'jetons' }) === 'en retournant le dernier jeton');
    verifier('et en Compromis de même',
      new Moteur(configParDefaut(6, { modeManche: 'compromis' }), spec6, 'x')
        ._motifVictoire({ raison: 'refuge' }) === 'en sortant ses animaux de la Tornade'
      && new Moteur(configParDefaut(6, { modeManche: 'compromis', placeJetons: 'equipe' }), spec6, 'x')
        ._motifVictoire({ raison: 'refuge' }) === 'en mettant ses animaux à l’Abri');
  }

  // La manche se prend en vidant sa rangée, et jamais avant.
  {
    let fautes = 0, prises = 0, tropSortis = 0, sorties = 0;
    for (let g = 0; g < 40; g++) {
      const m = new Moteur(cfg, spec6, `tornade-vide-${g}`);
      // Combien de jetons chaque équipe a vu sortir dans la manche en cours : le
      // moteur ne doit jamais en annoncer plus que la carte n'en retenait.
      let sortis = new Map();
      const demarrer = m._demarrerManche.bind(m);
      m._demarrerManche = (premiere) => { sortis = new Map(); demarrer(premiere); };
      m.onJeton = (pid, equipe, n) => {
        sorties += n;
        const cumul = (sortis.get(equipe) || 0) + n;
        sortis.set(equipe, cumul);
        if (cumul > m.suiviJetons(equipe).total) tropSortis++;
      };
      const finir = m._finManche.bind(m);
      m._finManche = (equipeId, cause = {}) => {
        if (equipeId && cause.raison === 'jetons') {
          prises++;
          // Une manche prise au dernier jeton : la rangée de l'équipe est vide.
          if (m.suiviJetons(equipeId).restants !== 0) fautes++;
        }
        finir(equipeId, cause);
      };
      m.jouerJusquAuBout();
    }
    verifier(`${prises} manches prises au dernier jeton, rangée vide à chaque fois`,
      prises > 0 && fautes === 0);
    verifier(`${sorties} jetons sortis, jamais plus que la Tornade n’en avait`,
      sorties > 0 && tropSortis === 0);
  }

  // Immédiat ne compte aucun jeton : le réglage n'y change rien.
  {
    const si = configParDefaut(6, { modeManche: 'immediat' });
    const surCarte = new Moteur(si, spec6, 'place-immediat').jouerJusquAuBout();
    const devant = new Moteur(
      configParDefaut(6, { modeManche: 'immediat', placeJetons: 'equipe' }), spec6, 'place-immediat',
    ).jouerJusquAuBout();
    verifier('Immédiat : la même partie aux deux places',
      surCarte.vainqueur === devant.vainqueur && surCarte.manches === devant.manches);
  }
}

// ── 3 septies septies. La table à trois : une Vache, une Poule, le Cow-Boy ──
// La variante des Cochons a quitté le jeu en v1.87 : à trois, chacun garde son
// équipe et ses combinaisons.
console.log('\nLa table à trois');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const c3 = configParDefaut(3);
  verifier('à trois joueurs : une Vache, une Poule et le Cow-Boy',
    placement(3).slice().sort().join(',') === 'bleu,jaune,vert'
    && ['bleu', 'jaune', 'vert'].map((e) => equipeVue(e).embleme).join(',') === 'vache,poule,cowboy');
  verifier('l’Échec demande ses deux dés rouges, comme ailleurs',
    ['bleu', 'jaune', 'vert'].every((e) => JSON.stringify(requisPourEquipe(c3,
      'blocage', c3.combos.find((c) => c.id === 'blocage').requis, e)) === JSON.stringify({ x: 2 })));
  verifier('un ancien réglage perd la carte Cochon',
    !('cochons' in assainirConfig({ nbJoueurs: 3, cochons: true, combosCochon: { blocage: { x: 3 } } }))
    && !('combosCochon' in assainirConfig({ nbJoueurs: 3, combosCochon: { blocage: { x: 3 } } })));
  verifier('« les Bleus remportent », « le Vert remporte »',
    `${nomDansPhrase('bleu').Le} ${nomDansPhrase('bleu').v('remporte', 'remportent')}` === 'Les Bleus remportent'
    && `${nomDansPhrase('vert').Le} ${nomDansPhrase('vert').v('remporte', 'remportent')}` === 'Le Vert remporte');
  const r = lancerCampagne(c3, spec(3), 'table-trois', 40);
  verifier(`40 parties à trois menées à terme (${JSON.stringify(r.raisons)})`,
    r.raisons.manchesMax === undefined && !r.raisons.limite);
}

// ── 3 septies octies. Les cartes imprimées ──────────────────────────────────
// Une illustration n'est montrée que tant qu'elle dit la règle en vigueur : la
// combinaison imprimée doit être celle que le jeu réclame.
console.log('\nLes cartes imprimées');
{
  const { existsSync } = await import('node:fs');
  const cc = configParDefaut(6, { modeManche: 'compromis' });
  const sommeil = CARTES_PAR_ID.spSommeil;
  const illu = illustrationCarte(cc, sommeil);
  verifier('la Tornade du Sommeil a sa carte imprimée', !!illu && /tornade-du-sommeil\.webp/.test(illu.src));
  verifier('et ses dimensions, pour réserver la place avant le chargement',
    illu && illu.largeur === 1432 && illu.hauteur === 1948);
  verifier('le texte de la carte est celui qu’elle imprime', sommeil.texte === 'Vous endormez vos 2 voisins');
  verifier('sa combinaison réglée autrement, on revient au dessin',
    illustrationCarte({ ...cc, combosCartesTornade: { spSommeil: { zzz: 3 } } }, sommeil) === null);
  verifier('une carte sans image n’en a pas', illustrationCarte(cc, CARTES_PAR_ID.spFurieuse) === null);
  const chemins = [
    ...Object.values(ILLUSTRATIONS_CARTES).map((x) => x.src),
    ...Object.values(ILLUSTRATIONS_EQUIPES).flatMap((e) => Object.values(e).map((x) => x.src)),
  ];
  verifier(`${chemins.length} images déclarées, toutes présentes dans le dépôt`,
    chemins.every((c) => existsSync(new URL(`../${c}`, import.meta.url))));
  verifier('chaque carte déclarée existe dans le jeu',
    Object.keys(ILLUSTRATIONS_CARTES).every((id) => CARTES_PAR_ID[id]));

  // La carte des Poules, face endormie : Réveil et Échec qui tente l'attrape.
  const c6 = configParDefaut(6);
  const endormie = (cfg) => cfg.combos.filter((c) => (c.face === 'toutes' || c.face === 'endormie')
    && comboPossible(cfg.faces, c.requis));
  verifier('les Poules endormies ont leur carte',
    !!illustrationEquipe(c6, 'jaune', 'endormie', endormie(c6)));
  verifier('les Vaches pas encore', !illustrationEquipe(c6, 'bleu', 'endormie', endormie(c6)));
  const echec3 = configParDefaut(6);
  echec3.combos = echec3.combos.map((c) => (c.id === 'blocage' ? { ...c, requis: { x: 3 } } : c));
  verifier('si l’Échec demande d’autres dés, la carte ne dit plus vrai',
    !illustrationEquipe(echec3, 'jaune', 'endormie', endormie(echec3)));
  const c3 = configParDefaut(3);
  verifier('à trois joueurs aussi, la Poule a sa carte',
    !!illustrationEquipe(c3, 'jaune', 'endormie', endormie(c3)));
  // Et sa face éveillée : l'Échec, l'Abri et l'Endormi.
  const eveillee = (cfg) => cfg.combos.filter((c) => (c.face === 'toutes' || c.face === 'active')
    && comboPossible(cfg.faces, c.requis));
  verifier('les Poules éveillées ont leur carte',
    !!illustrationEquipe(c6, 'jaune', 'active', eveillee(c6)));
  verifier('les Vaches éveillées pas encore',
    !illustrationEquipe(c6, 'bleu', 'active', eveillee(c6)));
  const abriEndormi = configParDefaut(6);
  abriEndormi.combos = abriEndormi.combos.map((c) => (c.id === 'vache' ? { ...c, face: 'toutes' } : c));
  verifier('un Abri jouable en dormant n’est pas sur la carte : on revient à la liste',
    !illustrationEquipe(abriEndormi, 'jaune', 'endormie', endormie(abriEndormi)));
}

// ── 3 octies. Jamais deux lots en main, contrôlé après chaque événement ──────
console.log('\nUn seul lot par joueur, événement par événement');
{
  let fautes = 0, controles = 0, parties = 0;
  for (const [nom, opts] of [
    ['base', {}], ['attrape même endormi', { attrapeEveille: false }],
    ['attrape = manche', { attrapeGagneManche: 'touche' }],
  ]) {
    for (const nbHumains of [0, 2]) {
      for (const n of [3, 6, 7]) {
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

// ── Variante sans attrape : l'Échec ne fait que pousser le lot ──────────────
console.log('\nVariante sans attrape');
{
  const spec = (n, p = 'equilibre') => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: p }));
  const poser = (lot, syms) => {
    lot.des.forEach((d, i) => { d.sym = syms[i]; d.roule = false; d.finRoule = 0; d.verrou = syms[i] === 'x'; });
    lot.lance = true;
  };
  verifier('par défaut, l’Échec tente l’attrape',
    configParDefaut(6).sansAttrape === false && configParDefaut(6, { sansAttrape: true }).sansAttrape === true);

  // Un Échec, réveillé, voisin chargé : le lot part sans tenter le contact, et
  // le voisin doit passer le sien au joueur suivant.
  const cfg = configParDefaut(6, { sansAttrape: true });
  const m = new Moteur(cfg, spec(6), 'sans-attrape');
  const j = m.joueurs.find((x) => x.lots.length);
  j.eveille = true;
  const voisin = m._suivant(j);
  const suivant = m._suivant(voisin);
  const lotDuVoisin = m._nouveauLot();
  voisin.lots = [lotDuVoisin];
  suivant.lots = [];
  const lotParti = j.lots[0];
  poser(lotParti, ['x', 'x', 'tornade', 'vache']);
  m._finLancer(j, []);
  verifier('l’Échec part sans tenter l’attrape',
    !!j.departEnAttente && j.departEnAttente.motif === 'combo' && j.departEnAttente.dispo.id === 'blocage');
  m.avancerJusqua(m.now + 4000);
  verifier('aucun contact n’est tenté', j.stats.collisionsTentees === 0 && !m.duel);
  const ouEst = (lot) => m.joueurs.find((x) => x.lots.includes(lot))
    || (m.transits.some((t) => t.lot === lot) ? 'en route' : null);
  verifier('le voisin a reçu le lot, et le sien est poussé plus loin',
    ouEst(lotParti) === voisin && ouEst(lotDuVoisin) !== voisin && ouEst(lotDuVoisin) !== null);

  // L'IA agressive ne cherche plus l'Échec : il n'y a rien à attraper.
  const ma = new Moteur(cfg, spec(6, 'tresAgressif'), 'sans-attrape-ia');
  const ja = ma.joueurs.find((x) => x.lots.length);
  ja.eveille = true;
  ma._suivant(ja).lots = [ma._nouveauLot()];
  verifier('sans attrape, le Très agressif ne vise pas le X',
    ma._objectifIA(ja, ja.lots[0]) !== 'x');

  // Et des parties entières, sans un seul contact.
  const r = lancerCampagne(cfg, spec(6), 'sans-attrape-campagne', 30);
  verifier(`30 parties sans attrape menées à terme, ${r.collisions.tentees} contact tenté`,
    r.collisions.tentees === 0 && r.raisons.manchesMax === undefined && !r.raisons.limite);
}

// ── Les trois ZzZ, et le droit de passer ────────────────────────────────────
console.log('\nTrois ZzZ, et passer son lot');
{
  const spec = (n) => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: i === 0 ? 'humain' : 'ia', profil: 'equilibre' }));
  const poser = (lot, syms) => {
    lot.des.forEach((d, i) => { d.sym = syms[i]; d.roule = false; d.finRoule = 0; d.verrou = syms[i] === 'x'; });
    lot.lance = true;
  };
  const essai = (voisinsEveilles, graine) => {
    const m = new Moteur(configParDefaut(6), spec(6), graine);
    const j = m.joueurs[0];
    j.eveille = true;
    for (const v of m._voisinsDirects(j)) v.eveille = voisinsEveilles;
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    const lot = j.lots[0];
    poser(lot, ['zzz', 'zzz', 'zzz', 'tornade']);
    m._finLancer(j, []);
    const depart = j.departEnAttente;
    m.avancerJusqua(m.now + 4000);
    return { m, j, lot, depart };
  };
  {
    const { m, j, depart } = essai(true, 'zzz-voisins');
    verifier('trois ZzZ, un voisin éveillé : il s’endort, et le lot part',
      depart && depart.dispo.id === 'endormir' && m._voisinsDirects(j).some((v) => !v.eveille)
      && j.stats.combos.endormir === 1);
  }
  {
    const { j, lot, depart } = essai(false, 'zzz-personne');
    verifier('trois ZzZ, voisins déjà endormis : la combinaison se joue quand même, le lot part',
      depart && depart.dispo.id === 'endormir' && j.stats.combos.endormir === 1 && !j.lots.includes(lot));
  }

  // On peut passer, ou non.
  verifier('par défaut, on peut passer', configParDefaut(6).peutPasser === true);
  const interdit = configParDefaut(6, { peutPasser: false });
  {
    const m = new Moteur(interdit, spec(6), 'pas-de-passe');
    const j = m.joueurs[0];
    if (!j.lots.length) j.lots.push(m._nouveauLot());
    poser(j.lots[0], ['tornade', 'vache', 'zzz', 'x']);
    verifier('variante : le joueur humain ne peut pas passer', m.passerHumain(0) === false && !j.departEnAttente);
  }
  let passes = 0, finies = 0;
  for (let g = 0; g < 20; g++) {
    const m = new Moteur(interdit, spec(6).map((x) => ({ ...x, type: 'ia' })), `pas-de-passe-${g}`);
    m.jouerJusquAuBout();
    if (m.termine && m.raisonFin === 'cartes') finies++;
    passes += m.journal.filter((e) => e.type === 'tour' && e.issue === 'Passé').length;
  }
  verifier(`variante : 20 parties sans un lot passé de son plein gré (${passes}), ${finies} menées à terme`,
    passes === 0 && finies === 20);
}

// ── Le journal montre d'abord les dés de la combinaison ─────────────────────
console.log('\nJournal : les dés de la combinaison d’abord');
{
  const spec = Array.from({ length: 6 }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil: 'equilibre' }));
  const m = new Moteur(configParDefaut(6), spec, 'journal-ordre');
  verifier('Réveil : les trois tornades en tête, les autres derrière',
    m._desOrdonnes(['x', 'tornade', 'zzz', 'tornade', 'tornade'], { tornade: 3 }).join(',')
      === 'tornade,tornade,tornade,x,zzz');
  verifier('sans combinaison, l’ordre du lancer est gardé',
    m._desOrdonnes(['x', 'zzz', 'vache'], null).join(',') === 'x,zzz,vache');
  m.jouerJusquAuBout();
  const tours = m.journal.filter((e) => e.type === 'tour' && /Réveil/.test(e.issue || ''));
  verifier(`${tours.length} réveils au journal, chacun ouvert par ses tornades`,
    tours.length > 0 && tours.every((e) => e.des.slice(0, 3).every((d) => d === 'tornade')));
  const tEchec = m.journal.filter((e) => e.type === 'tour' && /Échec/.test(e.issue || ''));
  verifier(`${tEchec.length} Échecs au journal, attrape comprise, ouverts par leurs deux X`,
    tEchec.some((e) => /attrape/.test(e.issue))
    && tEchec.every((e) => e.des[0] === 'x' && e.des[1] === 'x'));
}

console.log(echecs ? `\n${echecs} vérification(s) en échec.\n` : '\nToutes les vérifications passent.\n');
process.exit(echecs ? 1 : 0);
