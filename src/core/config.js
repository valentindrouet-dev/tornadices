// Règles TornaDice V6 : symboles, dés, combinaisons, cartes Tornade, mise en
// place et profils d'IA. Tout ce qui se règle passe par `configDepuis`.

// ── Dés ──────────────────────────────────────────────────────────────────────
export const SYMBOLES = {
  soleil: { id: 'soleil', nom: 'Réveil', couleur: '#f29816' },
  grange: { id: 'grange', nom: 'Abri', couleur: '#69b527' },
  lune: { id: 'lune', nom: 'Sommeil', couleur: '#89a2f7' },
  // La tornade rouge : un dé qui l'affiche ne se relance plus.
  tornade: { id: 'tornade', nom: 'Tornade', couleur: '#d30710' },
};
export const ORDRE_SYMBOLES = ['soleil', 'grange', 'lune', 'tornade'];
export const SYMBOLE_FIGE = 'tornade';
export const FACES_OFFICIELLES = ['soleil', 'soleil', 'lune', 'lune', 'grange', 'tornade'];
export const NB_FACES = 6;

// ── Combinaisons de la Carte Rôle ────────────────────────────────────────────
// `etat` : face de la Carte Rôle qui la porte — 'endormi', 'eveille' ou 'tous'.
export const COMBOS = [
  { id: 'reveil', nom: 'Réveil', requis: { soleil: 3 }, etat: 'endormi', couleur: 'or',
    effet: 'Retournez votre Carte Rôle sur sa face réveillée.' },
  { id: 'abri', nom: 'Abri', requis: { grange: 3 }, etat: 'eveille', couleur: 'vert',
    effet: 'Récupérez 1 Jeton Équipe sur la Carte Tornade. La première équipe à récupérer son dernier jeton gagne la manche.' },
  { id: 'sommeil', nom: 'Sommeil', requis: { lune: 3 }, etat: 'eveille', couleur: 'nuit',
    effet: 'Endormez un de vos voisins, s’il est réveillé.' },
  { id: 'envol', nom: 'Envol', requis: { tornade: 3 }, etat: 'tous', couleur: 'rouge',
    effet: 'Passez immédiatement votre lot au joueur suivant.' },
];
// Quand un même jet en sert plusieurs : la première de cette liste est jouée.
export const PRIORITE_COMBOS = ['reveil', 'abri', 'sommeil', 'envol'];

/** Vrai si le compte de faces `compte` sert l'exigence `requis` (non vide). */
export function comboServie(compte, requis) {
  let demande = 0;
  for (const sym in requis) {
    const n = requis[sym];
    if (n > 0) { demande += n; if ((compte[sym] || 0) < n) return false; }
  }
  return demande > 0;
}

/** Nombre de dés qu'une exigence réclame. */
export const tailleRequis = (requis) => Object.values(requis || {}).reduce((t, n) => t + (n > 0 ? n : 0), 0);

// ── Équipes ──────────────────────────────────────────────────────────────────
export const EQUIPES = {
  bleu: { id: 'bleu', nom: 'Bleus', animal: 'Vaches', un: 'Vache', embleme: 'vache', hex: '#3aa9f2', clair: '#e3f1fc' },
  jaune: { id: 'jaune', nom: 'Jaunes', animal: 'Poules', un: 'Poule', embleme: 'poule', hex: '#e8b21f', clair: '#fdf3d8' },
  vert: { id: 'vert', nom: 'Vert', animal: 'Cow-boy', un: 'Cow-boy', embleme: 'cowboy', hex: '#46b25e', clair: '#e4f5e9' },
};

/** Le nom d'une équipe dans une phrase : « les Bleus remportent », « le Vert remporte ». */
export function nomDansPhrase(id) {
  const nom = (EQUIPES[id] || { nom: String(id) }).nom;
  const seul = id === 'vert';
  return {
    nom, seul,
    le: `${seul ? 'le' : 'les'} ${nom}`,
    Le: `${seul ? 'Le' : 'Les'} ${nom}`,
    a: `${seul ? 'au' : 'aux'} ${nom}`,
    v: (singulier, pluriel) => (seul ? singulier : pluriel),
  };
}

// ── Mise en place ────────────────────────────────────────────────────────────
// `jetons` : Jetons Équipe posés sur la carte Tornade en début de manche — autant
// que de joueurs dans l'équipe, 2 par joueur à trois. Chaque Abri en récupère un.
export const NOMBRES_JOUEURS = [3, 4, 5, 6];
export const JOUEURS_MIN = 3;
export const JOUEURS_MAX = 6;
export const MISE_EN_PLACE = {
  3: { lots: 2, jetons: 2, jetonsVert: 2, cartes: 4 },
  4: { lots: 2, jetons: 2, cartes: 4 },
  5: { lots: 3, jetons: 2, jetonsVert: 1, cartes: 4 },
  6: { lots: 3, jetons: 3, cartes: 4 },
};
export const bornerJoueurs = (n) => Math.min(JOUEURS_MAX, Math.max(JOUEURS_MIN, Math.round(Number(n)) || JOUEURS_MAX));

/** Les sièges autour de la table : couleurs alternées, le Vert ferme la ronde. */
export function placement(nb) {
  const vert = nb % 2;
  const sieges = [];
  for (let i = 0; i < nb - vert; i++) sieges.push(i % 2 === 0 ? 'bleu' : 'jaune');
  if (vert) sieges.push('vert');
  return sieges;
}

// ── Cartes Tornade ───────────────────────────────────────────────────────────
// `combo` : combinaison ouverte pendant la manche, jouable endormi comme éveillé.
// `passif` : ce que la carte change pour tous pendant la manche.
// `table` : effectifs où la carte entre dans la pioche (absent = tous).
export const CARTES = [
  // Toujours la première de la partie. Elle se gagne comme les autres.
  { id: 'chauffe', nom: 'Tornade de Chauffe', texte: 'La première tornade de la partie : aucun effet particulier',
    premiere: true },
  { id: 'paisible', nom: 'Tornade Paisible', texte: 'Vous ne pouvez relancer les dés que un par un',
    passif: { unParUn: true } },
  { id: 'maladroite', nom: 'Tornade Maladroite', texte: 'Vous lancez les dés de votre autre main',
    passif: { lenteur: 1.35 } },
  { id: 'chargee', nom: 'Tornade Chargée', texte: 'Vous jouez avec un lot de dés supplémentaire',
    passif: { lotsEnPlus: 1 } },
  { id: 'tricheurs', nom: 'Tornade des Tricheurs',
    texte: 'L’équipe gagnante commence la manche suivante avec les lots de dés',
    passif: { gagnantsGardentLesDes: true } },
  { id: 'chapardeuse', nom: 'Tornade Chapardeuse',
    texte: 'L’équipe gagnante vole une Carte Tornade à l’équipe adverse', passif: { volerCarte: true } },
  { id: 'cowboy', nom: 'Tornade de Cow-Boy', texte: 'Le Cow-Boy gagne 2 Cartes Tornade à cette manche',
    passif: { doublePour: 'vert' }, table: [3] },
  { id: 'siecle', nom: 'Tornade du Siècle', texte: 'Vous gagnez 2 Cartes Tornade à cette manche',
    passif: { double: true } },
  { id: 'mega', nom: 'Méga Tornade', texte: 'Vous gagnez immédiatement la Manche',
    combo: { requis: { grange: 5 }, effet: 'gagnerManche' } },
  { id: 'sommeil', nom: 'Tornade du Sommeil', texte: 'Vous endormez vos 2 voisins',
    combo: { requis: { lune: 4 }, effet: 'endormirVoisins' } },
  // Mêmes dés que l'Envol : la carte passe d'abord, l'Envol gagne donc la manche.
  { id: 'furieuse', nom: 'Tornade Furieuse', texte: 'Vous gagnez immédiatement la Manche',
    combo: { requis: { tornade: 3 }, effet: 'gagnerManche' } },
  { id: 'vaches', nom: 'Tornade de Vaches', texte: 'Les Vaches gagnent 2 Cartes Tornade à cette manche',
    passif: { doublePour: 'bleu' } },
  { id: 'poules', nom: 'Tornade de Poules', texte: 'Les Poules gagnent 2 Cartes Tornade à cette manche',
    passif: { doublePour: 'jaune' } },
  // Carte de table : le site ne peut pas l'arbitrer, la manche se joue normalement.
  { id: 'silencieuse', nom: 'Tornade Silencieuse',
    texte: 'Interdit de parler : un joueur qui parle passe immédiatement son lot', physique: true },
  { id: 'jalouse', nom: 'Tornade Jalouse', texte: 'L’équipe qui mène doit réussir 1 Abri de plus',
    passif: { abriMeneur: 1 } },
  { id: 'chaos', nom: 'Tornade du Chaos', texte: 'Tous les dés peuvent être relancés, même les tornades',
    passif: { sansVerrou: true } },
];
export const CARTES_PAR_ID = Object.fromEntries(CARTES.map((c) => [c.id, c]));

/** La carte entre-t-elle dans la pioche à cet effectif ? */
export const carteALaTable = (carte, nb) => !carte.table || carte.table.includes(Number(nb));

/** L'exigence de la combinaison d'une carte, réglages compris. */
export function requisCarte(cfg, carte) {
  if (!carte || !carte.combo) return null;
  const regle = cfg.combosCartes && cfg.combosCartes[carte.id];
  return regle && tailleRequis(regle) ? regle : carte.combo.requis;
}

/** Ce qu'il faut savoir d'une carte à cette table, ou ''. */
export function noteCarte(carte, cfg) {
  if (carte.physique) return 'Carte de table : à l’écran, la manche se joue normalement.';
  if (carte.table) return `Dans la pioche à ${carte.table.join(', ')} joueurs seulement.`;
  const des = tailleRequis(requisCarte(cfg, carte));
  return des > cfg.desParLot ? `Demande ${des} dés : impossible avec des lots de ${cfg.desParLot}.` : '';
}

// ── Profils d'IA ─────────────────────────────────────────────────────────────
// `vise` : le symbole cherché selon l'état, pondéré. `reflexe` : temps de
// réaction moyen (ms) et son écart. `bevue` : chance de garder le mauvais dé.
export const PROFILS_IA = {
  logique: { id: 'logique', nom: 'Logique', reflexe: 780, ecart: 200,
    vise: { endormi: { soleil: 1 }, eveille: { grange: 1 } },
    desc: 'Se réveille, puis court à l’Abri.' },
  penible: { id: 'penible', nom: 'Pénible', reflexe: 760, ecart: 200,
    vise: { endormi: { soleil: 1 }, eveille: { lune: 3, grange: 1 } },
    desc: 'Endort ses voisins trois lots sur quatre, vise l’Abri le reste du temps.' },
  tresPenible: { id: 'tresPenible', nom: 'Très pénible', reflexe: 700, ecart: 180,
    vise: { endormi: { soleil: 1 }, eveille: { lune: 1 } },
    desc: 'Ne cherche qu’à endormir : il joue pour gêner.' },
  equilibre: { id: 'equilibre', nom: 'Équilibré', reflexe: 760, ecart: 220,
    styles: ['logique', 'logique', 'penible'],
    desc: 'Le plus souvent logique, parfois pénible.' },
  idiot: { id: 'idiot', nom: 'Idiot', reflexe: 900, ecart: 420, bevue: 0.35,
    vise: { endormi: { soleil: 1, grange: 1, lune: 1 }, eveille: { soleil: 1, grange: 1, lune: 1 } },
    desc: 'Vise au hasard, même l’inutile, et se trompe souvent de dés.' },
};
export const profilIA = (id) => PROFILS_IA[id] || PROFILS_IA.equilibre;
export const PROFIL_HUMAIN = { id: 'humain', nom: 'Humain', reflexe: 800, ecart: 250 };

// ── Réglages → configuration de partie ───────────────────────────────────────
// Les réglages sont un objet partiel, enregistré par le site ; tout ce qui
// manque prend la valeur V6. Les tables se lisent par nombre de joueurs.
export const RYTHME = {
  dureeLancer: 1000, dureeConstat: 900, dureePassage: 1000, dureeTransition: 2600,
  tempsReflexion: 300, ecartReflexion: 120, variance: 0,
};
export const TABLES = ['lots', 'jetons', 'jetonsVert', 'cartes', 'cartesVert'];
// Les lignes du Cow-boy, et celle des équipes dont elles héritent.
const TABLE_DES_EQUIPES = { jetonsVert: 'jetons', cartesVert: 'cartes' };

const entier = (x, min, max, defaut) => {
  const n = Math.round(Number(x));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};

/** La valeur d'une table de mise en place à cet effectif, réglage ou V6. */
export function valeurTable(reglages, table, nb) {
  const equipes = TABLE_DES_EQUIPES[table];
  const v6 = MISE_EN_PLACE[nb][table];
  // Sans valeur V6 propre au Cow-boy, il suit ce qui est réglé pour les équipes.
  const repli = v6 ?? valeurTable(reglages, equipes, nb);
  const t = reglages && reglages[table];
  return entier(t && t[nb], 1, 12, repli);
}

function requisPropre(requis, defaut) {
  const out = {};
  for (const [sym, n] of Object.entries(requis || {})) {
    if (SYMBOLES[sym] && n > 0) out[sym] = entier(n, 1, 12, 1);
  }
  return tailleRequis(out) ? out : { ...defaut };
}

/** Les cartes cochées : toutes, sauf celles que les réglages excluent. */
export function cartesEnJeu(reglages) {
  const exclues = new Set((reglages && reglages.cartesExclues) || []);
  const ids = CARTES.filter((c) => !exclues.has(c.id)).map((c) => c.id);
  return ids.length ? ids : CARTES.map((c) => c.id);
}

/** Configuration complète d'une partie à `nb` joueurs. */
export function configDepuis(reglages = {}, nb = 6) {
  const r = reglages || {};
  const nbJoueurs = bornerJoueurs(nb);
  const faces = Array.from({ length: NB_FACES },
    (_, i) => (SYMBOLES[(r.faces || [])[i]] ? r.faces[i] : FACES_OFFICIELLES[i]));
  const cfg = {
    nbJoueurs,
    desParLot: entier(r.desParLot, 1, 12, 5),
    faces,
    combos: COMBOS.map((c) => ({ ...c, requis: requisPropre(r.combos && r.combos[c.id], c.requis) })),
    lots: valeurTable(r, 'lots', nbJoueurs),
    jetons: valeurTable(r, 'jetons', nbJoueurs),
    jetonsVert: valeurTable(r, 'jetonsVert', nbJoueurs),
    cartesPourGagner: valeurTable(r, 'cartes', nbJoueurs),
    cartesVert: valeurTable(r, 'cartesVert', nbJoueurs),
    cartes: cartesEnJeu(r),
    combosCartes: {},
    melangerCartes: r.melangerCartes !== false,
    dureeMaxManche: 1_800_000,
    manchesMax: entier(r.manchesMax, 1, 200, 40),
  };
  for (const c of CARTES) {
    if (c.combo && r.combosCartes && r.combosCartes[c.id]) {
      cfg.combosCartes[c.id] = requisPropre(r.combosCartes[c.id], c.combo.requis);
    }
  }
  for (const [cle, defaut] of Object.entries(RYTHME)) {
    const x = Number(r[cle]);
    cfg[cle] = Number.isFinite(x) && x >= 0 ? x : defaut;
  }
  cfg.variance = Math.min(0.5, cfg.variance);
  return cfg;
}

/** La configuration V6, sans aucun réglage. */
export const configParDefaut = (nb = 6) => configDepuis({}, nb);

// ── Écarts entre deux jeux de réglages ───────────────────────────────────────
// Ce qui fait la règle du jeu. Le rythme de la table n'en est pas.
const REGLES = [
  ['desParLot', 'Dés par lot'],
  ['faces', 'Faces du dé', (c) => c.faces.map((f) => SYMBOLES[f].nom).join(' · ')],
  ['lots', 'Lots en jeu'],
  ['jetons', 'Jetons Équipe sur la Tornade'],
  ['jetonsVert', 'Jetons Équipe sur la Tornade (Cow-boy)', (c) => (c.nbJoueurs % 2 ? c.jetonsVert : null)],
  ['cartesPourGagner', 'Cartes pour gagner'],
  ['cartesVert', 'Cartes pour gagner (Cow-boy)', (c) => (c.nbJoueurs % 2 ? c.cartesVert : null)],
  ['cartes', 'Cartes Tornade en jeu', (c) => `${c.cartes.length} cartes`, (c) => c.cartes.join()],
  ['melangerCartes', 'Pioche mélangée', (c) => (c.melangerCartes ? 'oui' : 'non')],
];
const texteRequis = (r) => Object.entries(r).map(([s, n]) => `${n} ${SYMBOLES[s].nom}`).join(' + ');

/** Les règles où `reglages` s'écarte de `reference`, à `nb` joueurs. */
export function ecartsDeRegles(reglages, reference, nb) {
  const a = configDepuis(reglages, nb);
  const o = configDepuis(reference, nb);
  const ecarts = [];
  for (const [cle, libelle, lire = (c) => c[cle], comparer = lire] of REGLES) {
    if (String(comparer(a)) !== String(comparer(o))) {
      ecarts.push({ libelle, jouee: String(lire(a)), officielle: String(lire(o)) });
    }
  }
  a.combos.forEach((c, i) => {
    if (texteRequis(c.requis) !== texteRequis(o.combos[i].requis)) {
      ecarts.push({ libelle: `Combinaison « ${c.nom} »`, jouee: texteRequis(c.requis), officielle: texteRequis(o.combos[i].requis) });
    }
  });
  for (const carte of CARTES) {
    if (!carte.combo) continue;
    const ra = texteRequis(requisCarte(a, carte));
    const ro = texteRequis(requisCarte(o, carte));
    if (ra !== ro) ecarts.push({ libelle: `Combinaison de « ${carte.nom} »`, jouee: ra, officielle: ro });
  }
  return ecarts;
}
