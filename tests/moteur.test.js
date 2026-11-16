// Vérifications du moteur V6, des campagnes et des probabilités.
// `node tests/moteur.test.js` — quelques secondes.

import { Moteur } from '../src/core/engine.js';
import {
  configDepuis, configParDefaut, placement, MISE_EN_PLACE, NOMBRES_JOUEURS, CARTES, COMBOS,
  FACES_OFFICIELLES, ecartsDeRegles, comboServie, carteALaTable, CARTES_PAR_ID, PROFILS_IA,
} from '../src/core/config.js';
import { lancerCampagne, creerCampagne, wilson } from '../src/core/sim.js';
import { probaLancerUnique, courseCombinaison, courseAvecGarde } from '../src/core/proba.js';
import { makeRng } from '../src/core/rng.js';

let echecs = 0;
function verifier(nom, condition, detail = '') {
  if (condition) console.log(`  ok   ${nom}`);
  else { echecs++; console.log(`  ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const ia = (n, profil = 'equilibre') => Array.from({ length: n }, (_, i) => ({ nom: `J${i + 1}`, type: 'ia', profil }));
const proche = (a, b, tol) => Math.abs(a - b) <= tol;
// Une partie réduite à la Chauffe puis une seule carte : la manche 2 la joue.
const avecCarte = (id, nb, extra = {}) => ({
  ...configParDefaut(nb), cartes: ['chauffe', id], melangerCartes: false, ...extra,
});

// ── 1. Mise en place V6 ──────────────────────────────────────────────────────
console.log('\nMise en place');
verifier('3 à 6 joueurs', NOMBRES_JOUEURS.join() === '3,4,5,6');
verifier('équipes alternées, Cow-boy à effectif impair',
  placement(4).join() === 'bleu,jaune,bleu,jaune' && placement(5).join() === 'bleu,jaune,bleu,jaune,vert'
  && placement(3).join() === 'bleu,jaune,vert');
verifier('lots : 2, 2, 3, 3', [3, 4, 5, 6].map((n) => configParDefaut(n).lots).join() === '2,2,3,3');
verifier('2 Abris à 6 joueurs, 1 sinon', [3, 4, 5, 6].map((n) => configParDefaut(n).abris).join() === '1,1,1,2');
verifier('4 cartes pour gagner, 5 dés par lot',
  [3, 4, 5, 6].every((n) => configParDefaut(n).cartesPourGagner === 4 && configParDefaut(n).desParLot === 5));
verifier('faces : 2 Réveil, 2 Sommeil, 1 Abri, 1 Tornade',
  FACES_OFFICIELLES.slice().sort().join() === 'grange,lune,lune,soleil,soleil,tornade');
verifier('quatre combinaisons à 3 dés', COMBOS.map((c) => c.id).join() === 'reveil,abri,sommeil,envol'
  && COMBOS.every((c) => Object.values(c.requis).join() === '3'));
verifier('aucun écart sans réglage', NOMBRES_JOUEURS.every((n) => ecartsDeRegles({}, {}, n).length === 0));
verifier('un réglage se lit comme un écart',
  ecartsDeRegles({ abris: { 6: 1 } }, {}, 6).length === 1 && ecartsDeRegles({ abris: { 6: 1 } }, {}, 4).length === 0);
verifier('réglages hors bornes ramenés', configDepuis({ desParLot: 99, lots: { 4: -3 } }, 4).desParLot === 12
  && configDepuis({ lots: { 4: -3 } }, 4).lots === 1 && configDepuis({}, 9).nbJoueurs === 6);
verifier('Cow-Boy seulement à 3 joueurs', carteALaTable(CARTES_PAR_ID.cowboy, 3) && !carteALaTable(CARTES_PAR_ID.cowboy, 5));
verifier('combinaison vide jamais servie', !comboServie({ soleil: 5 }, {}) && comboServie({ soleil: 3 }, { soleil: 3 }));

// ── 2. Parties menées à terme, invariants ────────────────────────────────────
console.log('\nParties et invariants');
for (const n of NOMBRES_JOUEURS) {
  const cfg = configParDefaut(n);
  let ok = true, detail = '';
  const noter = (d) => { if (ok) { ok = false; detail = d; } };
  for (let g = 0; g < 40; g++) {
    const m = new Moteur(cfg, ia(n), `inv-${n}-${g}`);
    // Un Abri ne se joue qu'éveillé ; un dé figé ne roule plus.
    const depart = m._demanderDepart.bind(m);
    m._demanderDepart = (j, motif, dispo) => { if (dispo && dispo.id === 'abri' && !j.eveille) noter('Abri endormi'); depart(j, motif, dispo); };
    const poser = m._poserDes.bind(m);
    m._poserDes = (lot, indices) => {
      if (!m.passif.sansVerrou && indices.some((i) => lot.des[i].verrou)) noter('dé figé relancé');
      poser(lot, indices);
    };
    let t = 0;
    while (!m.termine && t < 4e6) {
      t += 700;
      m.avancerJusqua(t);
      if (m.termine || m.transition) continue;
      const lots = m.joueurs.reduce((s, j) => s + j.lots.length, 0) + m.transits.length;
      const attendu = Math.min(n, cfg.lots + (m.passif.lotsEnPlus || 0));
      if (lots !== attendu) noter(`${lots} lots au lieu de ${attendu}`);
      if (m.joueurs.some((j) => j.lots.length > 1)) noter('deux lots dans une main');
    }
    const r = m.resultat();
    if (!m.termine) noter('partie sans fin');
    if (r.raison === 'cartes' && r.equipes[r.vainqueur].cartes < m.cartesPourGagner(r.vainqueur)) noter('vainqueur sans ses cartes');
    if (m.statsManches[0].carte !== 'chauffe' || m.statsManches[0].compte) noter('Chauffe mal jouée');
    if (m.statsManches.some((s) => s.carte === 'cowboy') && n !== 3) noter('Cow-Boy hors de sa table');
  }
  verifier(`${n} joueurs : 40 parties conformes`, ok, detail);
}

const a = new Moteur(configParDefaut(5), ia(5), 'memes').jouerJusquAuBout();
const b = new Moteur(configParDefaut(5), ia(5), 'memes').jouerJusquAuBout();
const c = new Moteur(configParDefaut(5), ia(5), 'autres').jouerJusquAuBout();
verifier('même graine, même partie', JSON.stringify(a) === JSON.stringify(b));
verifier('autre graine, autre partie', JSON.stringify(a) !== JSON.stringify(c));
{
  const avec = new Moteur(configParDefaut(4), ia(4), 'journal');
  const sans = new Moteur(configParDefaut(4), ia(4), 'journal', { journal: false });
  verifier('le journal ne change pas la partie',
    JSON.stringify(avec.jouerJusquAuBout()) === JSON.stringify(sans.jouerJusquAuBout()) && avec.journal.length > 0 && !sans.journal.length);
}

// ── 3. Qui reçoit les dés ────────────────────────────────────────────────────
console.log('\nLots de départ');
{
  const porteurs = (m) => m.joueurs.filter((j) => j.lots.length).map((j) => j.equipe).sort().join();
  verifier('manche 1 : les Jaunes', porteurs(new Moteur(configParDefaut(4), ia(4), 'd4')) === 'jaune,jaune');
  verifier('le Cow-boy prend le lot restant', porteurs(new Moteur(configParDefaut(5), ia(5), 'd5')) === 'jaune,jaune,vert'
    && porteurs(new Moteur(configParDefaut(3), ia(3), 'd3')) === 'jaune,vert');
  let perdants = true, vert = true, tricheurs = true, sensVus = new Set();
  for (let g = 0; g < 60; g++) {
    const m = new Moteur(configParDefaut(g % 2 ? 5 : 4), ia(g % 2 ? 5 : 4), `des-${g}`);
    sensVus.add(m.sens);
    m.onDebutManche = ({ manche, porteurs: p }) => {
      const avant = m.statsManches[manche - 2];
      if (!avant || !avant.vainqueur) return;
      const equipes = p.map((id) => m.joueurs[id].equipe);
      if (m.equipes.vert && !equipes.includes('vert')) vert = false;
      if (avant.vainqueur === 'vert') return;
      const garde = avant.carte === 'tricheurs';
      const attendue = garde ? avant.vainqueur : (avant.vainqueur === 'bleu' ? 'jaune' : 'bleu');
      if (!equipes.includes(attendue) || m.equipeDes !== attendue) { if (garde) tricheurs = false; else perdants = false; }
    };
    m.jouerJusquAuBout();
  }
  verifier('les perdants reçoivent les lots', perdants);
  verifier('Tricheurs : les gagnants les gardent', tricheurs);
  verifier('le Cow-boy garde toujours un lot', vert);
  verifier('Carte Rotation posée au hasard', sensVus.size === 2);
}

// ── 4. Abris et tourbillon ───────────────────────────────────────────────────
console.log('\nAbris et tourbillon');
{
  const r6 = lancerCampagne(configParDefaut(6), ia(6), 'abris6', 60);
  const r4 = lancerCampagne(configParDefaut(4), ia(4), 'abris4', 60);
  const abris = (r) => r.parSiege.reduce((s, x) => s + x.abris, 0);
  const manchesAbri = (r) => r.totaux.manches - Object.values(r.combosCartes).reduce((s, x) => s + x, 0);
  verifier('4 joueurs : un Abri par manche gagnée', abris(r4) <= r4.totaux.manches && abris(r4) >= manchesAbri(r4) - 2);
  verifier('6 joueurs : il faut plusieurs Abris', abris(r6) > 1.5 * manchesAbri(r6));
  verifier('le tourbillon existe', r6.totaux.pousses > 0 && r4.totaux.pousses > 0);
  // Un lot qui arrive chez un porteur le force à passer le sien.
  const m = new Moteur(configParDefaut(4), ia(4), 'tourbillon');
  const de = m.joueurs.find((j) => j.lots.length);
  const vers = m._suivant(de);
  vers.lots = [m._nouveauLot()];
  const lot = de.lots[0];
  m._envoyerLot(de, lot, 'combo');
  m.avancerJusqua(m.now + m.cfg.dureePassage + 1);
  verifier('arrivée sur un porteur : son lot repart', vers.lots.length === 1 && vers.lots[0] === lot && vers.stats.pousses === 1);
}

// ── 5. Cartes Tornade ────────────────────────────────────────────────────────
console.log('\nCartes Tornade');
{
  const manche2 = (id, nb, extra) => {
    const m = new Moteur(avecCarte(id, nb, extra), ia(nb), `carte-${id}`);
    while (!m.termine && m.manche < 2) m.avancerJusqua(m.now + 500);
    return m;
  };
  // Paisible : un seul dé relancé à la fois, sauf le lot neuf.
  let m = manche2('paisible', 4);
  let unParUn = true;
  const lancer = m._demarrerLancer.bind(m);
  m._demarrerLancer = (j, i) => {
    const neuf = j.lots[0] && j.lots[0].des.some((d) => d.sym === null);
    const res = lancer(j, i);
    if (!neuf && j.lots[0] && j.lots[0].des.filter((d) => d.roule).length > 1) unParUn = false;
    return res;
  };
  m.jouerJusquAuBout();
  verifier('Paisible : un dé à la fois', unParUn && m.statsManches.length === 2);

  m = manche2('chaos', 4);
  let verrou = false;
  const poser = m._poserDes.bind(m);
  m._poserDes = (lot, i) => { poser(lot, i); if (lot.des.some((d) => d.verrou)) verrou = true; };
  m.jouerJusquAuBout();
  verifier('Chaos : aucune tornade figée', !verrou);

  m = manche2('chargee', 4);
  verifier('Chargée : un lot de plus', m.joueurs.reduce((s, j) => s + j.lots.length, 0) + m.transits.length === 3);

  let double = true, vole = false, jalouse = false, combos = { mega: 0, sommeil: 0, furieuse: 0 };
  for (let g = 0; g < 30; g++) {
    const r = new Moteur(avecCarte('siecle', 4), ia(4), `siecle-${g}`).jouerJusquAuBout();
    // Pioche de deux cartes : la seconde carte du Siècle n'existe pas, une seule est gagnée.
    if (r.equipes[r.statsManches[1].vainqueur].cartes !== 1) double = false;
    const s = new Moteur({ ...configParDefaut(4), cartes: ['chauffe', 'paisible', 'chapardeuse', 'siecle', 'chaos'], melangerCartes: false },
      ia(4), `vol-${g}`);
    s.jouerJusquAuBout();
    const [, p, ch] = s.statsManches;
    if (p.vainqueur && ch.vainqueur && p.vainqueur !== ch.vainqueur) {
      // Après le vol, le premier gagnant n'a plus rien pour la manche 4.
      vole = true;
    }
    const j = new Moteur({ ...configParDefaut(4), cartes: ['chauffe', 'paisible', 'jalouse'], melangerCartes: false }, ia(4), `jal-${g}`);
    while (!j.termine && j.manche < 3) j.avancerJusqua(j.now + 500);
    if (!j.termine) {
      const meneur = j.statsManches[1].vainqueur;
      const autre = meneur === 'bleu' ? 'jaune' : 'bleu';
      if (j.suiviAbris(meneur).total === 2 && j.suiviAbris(autre).total === 1) jalouse = true; else jalouse = jalouse && false;
    }
    for (const id of ['mega', 'sommeil', 'furieuse']) {
      const x = new Moteur(avecCarte(id, 4), ia(4), `combo-${id}-${g}`).jouerJusquAuBout();
      combos[id] += x.statsManches[1] ? x.statsManches[1].comboCarte : 0;
    }
  }
  verifier('Siècle : pas de seconde carte quand la pioche est vide', double);
  verifier('Chapardeuse : la partie va au bout avec un vol possible', vole);
  verifier('Jalouse : un Abri de plus pour l’équipe en tête', jalouse);
  verifier('les combinaisons de carte sortent (Sommeil, Furieuse)', combos.sommeil > 0 && combos.furieuse > 0,
    JSON.stringify(combos));
  // Siècle et cartes doubles avec une vraie pioche.
  const d = new Moteur({ ...configParDefaut(4), cartes: ['chauffe', 'siecle', 'paisible', 'chaos'], melangerCartes: false }, ia(4), 'double');
  while (!d.termine && d.manche < 3) d.avancerJusqua(d.now + 500);
  verifier('Siècle : deux cartes d’un coup', d.equipes[d.statsManches[1].vainqueur].cartes.length === 2);
  const v = new Moteur({ ...configParDefaut(4), cartes: ['chauffe', 'vaches', 'paisible', 'chaos'], melangerCartes: false }, ia(4), 'vaches');
  while (!v.termine && v.manche < 3) v.avancerJusqua(v.now + 500);
  verifier('Tornade de Vaches : double pour les Bleus seulement',
    v.equipes[v.statsManches[1].vainqueur].cartes.length === (v.statsManches[1].vainqueur === 'bleu' ? 2 : 1));
  verifier('toutes les cartes ont un nom et un texte', CARTES.every((x) => x.nom && x.texte) && CARTES.length === 16);
}

// ── 6. Probabilités : le calcul exact et le moteur disent la même chose ──────
console.log('\nProbabilités');
{
  const exact = probaLancerUnique(FACES_OFFICIELLES, 5, { soleil: 3 });
  verifier('Réveil au premier lancer : 51/243', proche(exact, 51 / 243, 1e-12));
  verifier('Abri au premier lancer : 276/7776', proche(probaLancerUnique(FACES_OFFICIELLES, 5, { grange: 3 }), 276 / 7776, 1e-12));
  // Fréquence observée dans le moteur, sur les premiers lancers de dormeurs.
  let essais = 0, reveils = 0;
  for (let g = 0; g < 400; g++) {
    const m = new Moteur(configParDefaut(4), ia(4, 'logique'), `proba-${g}`, { journal: false });
    const fin = m._finLancer.bind(m);
    m._finLancer = (j, indices) => {
      const premier = j.lancersLot === 1 && indices.length === 5;
      const dormait = !j.eveille;
      fin(j, indices);
      if (premier && dormait && m.carte && !m.carte.combo) {
        essais++;
        if (j.departEnAttente && j.departEnAttente.dispo && j.departEnAttente.dispo.id === 'reveil') reveils++;
      }
    };
    m.jouerJusquAuBout();
  }
  const obs = wilson(reveils, essais);
  verifier(`moteur : ${(obs.part * 100).toFixed(1)} % de Réveils au premier lancer (${essais} lancers)`,
    essais > 3000 && exact > obs.bas - 0.005 && exact < obs.haut + 0.005, `exact ${(exact * 100).toFixed(1)} %`);

  const sommeil = [{ requis: { lune: 3 } }];
  const tout = courseCombinaison(FACES_OFFICIELLES, 5, { grange: 3 }, { arretsForces: sommeil });
  const garde = courseAvecGarde(FACES_OFFICIELLES, 5, { grange: 3 }, { arretsForces: sommeil }, 20000, makeRng('garde'));
  verifier('course : réussite + perte = 1', proche(tout.reussite + tout.perdu, 1, 1e-9) && tout.reussite > 0 && tout.reussite < 1);
  verifier('garder les bons dés vaut mieux que tout relancer', garde.reussite > tout.reussite);
  const seul = courseCombinaison(FACES_OFFICIELLES, 5, { soleil: 3 });
  verifier('Réveil : premier lancer cohérent avec la course', proche(seul.premierLancer, exact, 1e-12) && seul.reussite > exact);
}

// ── 7. Campagnes du Laboratoire ──────────────────────────────────────────────
console.log('\nCampagnes');
{
  const cfg = configParDefaut(6);
  const r = lancerCampagne(cfg, ia(6), 'camp', 300);
  const total = Object.values(r.victoires).reduce((s, x) => s + x, 0);
  verifier('autant de résultats que de parties', total === 300 && r.nbParties === 300);
  verifier('parts de victoire bornées par leur intervalle',
    r.parts.every((p) => p.bas <= p.part && p.part <= p.haut && p.haut - p.bas < 0.13) && r.marge > 0 && r.marge < 0.07);
  verifier('parties concluantes', r.concluantes > 0.95, String(r.concluantes));
  const tranches = creerCampagne(cfg, ia(6), 'camp');
  tranches.jouer(120); tranches.jouer(180);
  const strip = (x) => JSON.stringify({ ...x, calculMs: 0 });
  verifier('par tranches ou d’un trait : même résultat', strip(tranches.resultat()) === strip(r));
  verifier('Wilson : 50/100 → 40,4 % à 59,6 %', proche(wilson(50, 100).bas, 0.4038, 5e-4) && proche(wilson(50, 100).haut, 0.5962, 5e-4));
  verifier('Wilson reste dans [0, 1]', wilson(0, 20).bas === 0 && wilson(20, 20).haut === 1 && wilson(0, 0).part === 0);
  // Les deux équipes jouent le même jeu : à effectif pair, aucune ne domine nettement.
  const p = lancerCampagne(configParDefaut(4), ia(4, 'logique'), 'equite', 600);
  const bleu = p.parts.find((x) => x.equipe === 'bleu');
  verifier(`4 joueurs logiques : Bleus à ${(bleu.part * 100).toFixed(0)} %`, bleu.part > 0.3 && bleu.part < 0.7);
  // Le caractère des IA se voit : le logique bat le très pénible, qui ne vise jamais l'Abri.
  const spec = ia(4).map((j, i) => ({ ...j, profil: i % 2 ? 'tresPenible' : 'logique' }));
  const duel = lancerCampagne(configParDefaut(4), spec, 'profils', 300);
  verifier('les Logiques battent les Très pénibles', duel.parts.find((x) => x.equipe === 'bleu').bas > 0.6);
  verifier('tous les profils jouent', Object.keys(PROFILS_IA).every((id) => lancerCampagne(configParDefaut(3), ia(3, id), `p-${id}`, 5).nbParties === 5));
}

// ── 8. Joueur humain ─────────────────────────────────────────────────────────
console.log('\nJoueur humain');
{
  const spec = ia(4);
  spec[1] = { nom: 'Moi', type: 'humain' };
  const m = new Moteur(configParDefaut(4), spec, 'humain');
  const moi = m.joueurs[1];
  verifier('l’humain attend son geste', moi.lots.length === 1 && moi.attente && moi.attente.indicesLibres.length === 5);
  verifier('il lance', m.lancerHumain(1) && moi.lots[0].des.every((d) => d.roule));
  m.avancerJusqua(m.cfg.dureeLancer + 1);
  verifier('les dés se posent', moi.lots.length === 0 || moi.lots[0].des.every((d) => d.sym));
  verifier('un autre joueur ne lance pas à sa place', !m.lancerHumain(0));
  // Une partie entière, l'humain relançant dès qu'il peut.
  let t = 0;
  while (!m.termine && t < 3e6) {
    t += 400;
    m.avancerJusqua(t);
    if (m.choixSens && !m.choixSens.decide) m.choisirSens(true);
    if (moi.attente && moi.lots.length) m.lancerHumain(1, moi.attente.indicesLibres.filter((i) => moi.lots[0].des[i].sym !== (moi.eveille ? 'grange' : 'soleil')));
  }
  verifier('partie avec humain menée à terme', m.termine && m.vainqueur);
}

console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nToutes les vérifications passent.');
process.exit(echecs ? 1 : 0);
