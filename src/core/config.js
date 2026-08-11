// Toute la matière réglable du jeu : symboles, dés, combinaisons, cartes Journée,
// tableau de mise en place et profils de joueurs. Le moteur ne connaît rien d'autre.

export const SYMBOLES = {
  tornade: { id: 'tornade', nom: 'Tornade', couleur: '#a8dcf2', desc: 'Réveille votre Tornade' },
  vache: { id: 'vache', nom: 'Vache', couleur: '#52a72e', desc: 'Retourne un jeton de votre équipe' },
  zzz: { id: 'zzz', nom: 'ZzZ', couleur: '#c28ef2', desc: 'Endort un de vos voisins' },
  eclair: { id: 'eclair', nom: 'Éclair', couleur: '#f9b115', desc: 'Passez le lot et tentez d’attraper' },
  // `joker` : liste des symboles que la face peut prendre. Jamais le X, qui fige.
  joker: {
    id: 'joker', nom: 'Joker', couleur: '#f4a11c',
    joker: ['tornade', 'vache', 'zzz', 'eclair'],
    desc: 'Prend la face de n’importe quel symbole, sauf le X',
  },
  jokerDouble: {
    id: 'jokerDouble', nom: 'Joker éclair/ZzZ', couleur: '#c28ef2',
    joker: ['eclair', 'zzz'],
    desc: 'Joker limité à l’éclair et au ZzZ',
  },
  x: { id: 'x', nom: 'X', couleur: '#e2000f', desc: 'Dé bloqué — il ne se relance jamais' },
  vide: { id: 'vide', nom: 'Vide', couleur: '#e6edf4', desc: 'Face neutre' },
};

export const ORDRE_SYMBOLES = [
  'tornade', 'vache', 'zzz', 'eclair', 'joker', 'jokerDouble', 'x', 'vide',
];

/** Un joker est une face qui peut en remplacer d'autres. */
export function estJoker(symbole) {
  return !!(SYMBOLES[symbole] && SYMBOLES[symbole].joker);
}

/** Ce qu'une face peut remplacer — rien pour une face ordinaire. */
export function remplacements(symbole) {
  return (SYMBOLES[symbole] && SYMBOLES[symbole].joker) || null;
}

/** Une exigence sans aucun dé requis ne vaut rien : elle serait toujours servie. */
export function exigenceVide(requis) {
  return !Object.values(requis || {}).some((n) => n > 0);
}

/**
 * La combinaison `requis` est-elle servie par le compte de dés `compte` ?
 *
 * Les faces ordinaires se comptent une par une ; les jokers viennent combler ce
 * qui manque, chacun selon ce qu'il peut prendre. Savoir si les jokers suffisent
 * est un problème d'affectation : on le tranche exactement par la condition de
 * Hall, l'exigence ne portant jamais que sur une poignée de symboles.
 */
export function comboServie(compte, requis) {
  const reste = { ...compte };
  const manques = [];

  for (const [sym, n] of Object.entries(requis || {})) {
    if (n <= 0) continue;
    const pris = Math.min(reste[sym] || 0, n);
    reste[sym] = (reste[sym] || 0) - pris;
    if (pris === n) continue;
    // Rien ne remplace un joker : une exigence en jokers se paie en jokers.
    if (estJoker(sym)) return false;
    manques.push({ sym, n: n - pris });
  }
  if (!manques.length) return true;

  const jokers = [];
  for (const [sym, n] of Object.entries(reste)) {
    if (n > 0 && estJoker(sym)) jokers.push({ n, peut: SYMBOLES[sym].joker });
  }
  if (!jokers.length) return false;

  // Condition de Hall : pour tout sous-ensemble de manques, assez de jokers
  // capables de les couvrir. Le sous-ensemble complet couvre le total.
  for (let masque = 1; masque < (1 << manques.length); masque++) {
    let besoin = 0;
    const vises = [];
    for (let i = 0; i < manques.length; i++) {
      if (masque & (1 << i)) { besoin += manques[i].n; vises.push(manques[i].sym); }
    }
    let offre = 0;
    for (const j of jokers) if (j.peut.some((s) => vises.includes(s))) offre += j.n;
    if (besoin > offre) return false;
  }
  return true;
}

// Symbole qui fige le dé : une fois sorti, il ne peut plus être relancé.
export const SYMBOLE_BLOQUANT = 'x';

// Couleur d'alerte affichée autour de la zone d'un joueur quand la combinaison
// apparaît sur ses dés.
export const ALERTES = {
  blocage: 'rouge',
  echecJokers: 'rouge',
  collision: 'jaune',
  reveil: 'bleu',
  vache: 'vert',
  endormir: 'violet',
};

// Ce que rapporte l'attrape : la règle de base, ou l'une des deux variantes qui
// en font l'enjeu de la manche.
export const OPTIONS_ATTRAPE = [
  ['non', 'Un jeton'],
  ['touche', 'Manche gagnée si le contact réussit'],
  ['combo', 'Manche gagnée dès les 3 éclairs'],
];

export const AIDE_ATTRAPE = {
  non: 'Règle de base : un contact réussi interrompt le voisin et retourne un jeton de votre équipe.',
  touche: 'Trois éclairs, vous passez le lot et tentez le contact — s’il réussit, votre équipe '
    + 'remporte la manche sur-le-champ. Les jetons ne servent plus qu’à la course parallèle.',
  combo: 'Trois éclairs suffisent : la manche est remportée sans même tenter le contact. '
    + 'La manche devient une course à l’attrape, sans fenêtre de réflexe.',
};

// ── Dés ───────────────────────────────────────────────────────────────────────
// Répartition de base : 1 tornade, 1 joker, 1 X, 1 ZzZ, 1 vache, 1 éclair —
// le joker a pris la place de la seconde tornade.
// Modifiable face par face dans les options de partie et dans le Laboratoire.
export const FACES_PAR_DEFAUT = ['tornade', 'joker', 'x', 'zzz', 'vache', 'eclair'];

export const PRESETS_FACES = [
  { nom: 'Officiel', faces: ['tornade', 'joker', 'x', 'zzz', 'vache', 'eclair'] },
  { nom: 'Sans joker', faces: ['tornade', 'tornade', 'x', 'zzz', 'vache', 'eclair'] },
  { nom: 'Joker double', faces: ['tornade', 'joker', 'x', 'jokerDouble', 'vache', 'eclair'] },
  { nom: 'Deux jokers', faces: ['tornade', 'joker', 'joker', 'x', 'vache', 'eclair'] },
  { nom: 'Symétrique', faces: ['tornade', 'vache', 'zzz', 'eclair', 'x', 'vide'] },
  { nom: 'Orageux (2 X)', faces: ['tornade', 'joker', 'x', 'x', 'vache', 'eclair'] },
];

// ── Combinaisons de la carte Tornade ──────────────────────────────────────────
// `requis` : nombre de dés de chaque symbole. `face` : côté de la carte requis.
export const COMBOS_TORNADE = [
  {
    id: 'reveil',
    nom: 'Réveil',
    libelle: 'Réveillez votre Tornade',
    requis: { tornade: 3 },
    face: 'endormie',
    obligatoire: false,
  },
  {
    id: 'vache',
    nom: 'Vache',
    libelle: 'Retournez un jeton Vache de votre équipe',
    requis: { vache: 3 },
    face: 'active',
    obligatoire: false,
  },
  {
    id: 'endormir',
    nom: 'Endormi',
    libelle: 'Endormez un de vos voisins',
    requis: { zzz: 3 },
    face: 'toutes',
    obligatoire: false,
  },
  {
    id: 'collision',
    nom: 'Attrape',
    libelle: 'Passez votre lot et tentez d’attraper le joueur suivant',
    requis: { eclair: 3 },
    face: 'toutes',
    obligatoire: true,
  },
  {
    id: 'blocage',
    nom: 'Bloqué',
    libelle: 'Deux dés figés : le lot part sans rien tenter',
    requis: { x: 2 },
    face: 'toutes',
    obligatoire: true,
    echec: true,
  },
  {
    // Trop de jokers d'un coup et le lot part comme à deux X. C'est le
    // contrepoids du joker : sans lui, il n'aurait aucun revers.
    id: 'echecJokers',
    nom: 'Trois jokers',
    libelle: 'Trop de jokers : le lot part sans rien tenter',
    requis: { joker: 3 },
    face: 'toutes',
    obligatoire: true,
    echec: true,
    optionnelle: 'echecJokers',
  },
];

// ── Cartes Journée ────────────────────────────────────────────────────────────
// `combo` : combinaison supplémentaire ouverte pour la manche.
// `effetPassif` : modificateur appliqué à tous les joueurs pendant la manche.
export const CARTES_JOURNEE = [
  {
    id: 'chauffe',
    court: 'Jour de chauffe',
    nom: '1ère Journée — Jour de chauffe',
    texte: 'Défaussez cette carte à la fin de la manche. Elle ne compte pas pour la victoire !',
    combo: null,
    effetPassif: null,
    neCompted: true,
    toujoursPremiere: true,
  },
  {
    id: 'fatigue',
    court: 'Fatigue',
    nom: 'Journée de la fatigue',
    texte: 'Vos voisins s’endorment',
    combo: { id: 'fatigue', requis: { zzz: 4 }, effet: 'endormirVoisins' },
    effetPassif: null,
  },
  {
    id: 'intensive',
    court: 'Intensive',
    nom: 'Journée intensive',
    texte: 'Retournez un de vos jetons',
    combo: { id: 'intensive', requis: { vache: 2, tornade: 2 }, effet: 'jeton1' },
    effetPassif: null,
  },
  {
    id: 'sansVent',
    court: 'Sans vent',
    nom: 'Journée sans vent',
    texte: 'Replacez un jeton adverse face cachée',
    combo: { id: 'sansVent', requis: { vache: 2, zzz: 2 }, effet: 'cacherJetonAdverse' },
    effetPassif: null,
  },
  {
    id: 'maladresse',
    court: 'Maladresse',
    nom: 'Journée de la maladresse',
    texte: 'Lancez vos dés de votre autre main pour cette manche',
    combo: null,
    effetPassif: { lenteur: 1.35, erreur: 0.06 },
  },
  {
    id: 'chance',
    court: 'Chance',
    nom: 'Journée de la chance',
    texte: 'Remportez la manche immédiatement',
    combo: { id: 'chance', requis: { eclair: 4 }, effet: 'gagnerManche' },
    effetPassif: null,
  },
  {
    id: 'troupeau',
    court: 'Troupeau',
    nom: 'Journée du troupeau',
    texte: 'Retournez deux de vos jetons',
    combo: { id: 'troupeau', requis: { vache: 4 }, effet: 'jeton2' },
    effetPassif: null,
  },
  {
    id: 'difference',
    court: 'Différence',
    nom: 'Journée de la différence',
    texte: 'Jouez l’effet d’une des combinaisons visibles de votre carte',
    combo: {
      id: 'difference',
      requis: { tornade: 1, vache: 1, zzz: 1, eclair: 1 },
      effet: 'auChoix',
    },
    effetPassif: null,
  },
  {
    id: 'vaillants',
    court: 'Vaillants',
    nom: 'Journée des vaillants',
    texte: 'Toute votre équipe se réveille (à 3 joueurs, passez cette carte)',
    combo: { id: 'vaillants', requis: { tornade: 4 }, effet: 'reveilEquipe' },
    effetPassif: null,
    minJoueurs: 4,
  },
  {
    id: 'triche',
    court: 'Triche',
    nom: 'Journée de la triche',
    texte: 'À la manche suivante, l’équipe gagnante commence avec les lots de dés',
    combo: null,
    effetPassif: { gagnantPrendLesDes: true },
  },
  {
    id: 'tranquillite',
    court: 'Tranquillité',
    nom: 'Journée de la tranquillité',
    texte: 'Relancez les dés un par un',
    combo: null,
    effetPassif: { unParUn: true },
  },
  {
    id: 'silence',
    court: 'Silence',
    nom: 'Journée du silence',
    texte: 'Seuls les mots « touché » et « endormi » sont autorisés durant cette journée',
    combo: null,
    effetPassif: { erreur: 0.03 },
  },
];

// ── Tableau de mise en place (règles V4.5) ────────────────────────────────────
// 9 joueurs : extrapolé, le tableau officiel s'arrête à 8.
export const MISE_EN_PLACE = {
  3: { lots: 2, jetons: 2, jetonsVert: 2, cartes: 3 },
  4: { lots: 2, jetons: 3, jetonsVert: 2, cartes: 3 },
  5: { lots: 3, jetons: 3, jetonsVert: 2, cartes: 3 },
  6: { lots: 3, jetons: 4, jetonsVert: 2, cartes: 3 },
  7: { lots: 4, jetons: 4, jetonsVert: 2, cartes: 3 },
  8: { lots: 4, jetons: 4, jetonsVert: 2, cartes: 3 },
  9: { lots: 5, jetons: 5, jetonsVert: 2, cartes: 3, extrapole: true },
};

// ── Profils d'IA ──────────────────────────────────────────────────────────────
// `lancersAvantPasse` : nombre de relances tolérées avant de rendre le lot.
// `peur` : sensibilité au danger quand le joueur précédent tient aussi un lot.
// `reflexe` : millisecondes moyennes entre deux actions. `adresse` : chance de toucher.
/**
 * Profils d'IA.
 *
 * `vise` dit ce que le joueur cherche, selon que sa Tornade dort ou veille :
 * des poids relatifs, tirés au sort à chaque nouveau lot. Un symbole absent vaut
 * zéro — ce profil ne le cherche jamais. Le reste décrit son tempérament :
 * combien de fois il relance avant de rendre le lot, sa peur du voisin, son
 * adresse à l'attrape et sa vitesse de décision.
 *
 * Une combinaison servie reste jouée d'office, c'est la règle du jeu : le profil
 * dit ce que l'IA cherche, pas ce qu'elle accepte. Un « Très agressif » qui sort
 * trois tornades par accident se réveille quand même.
 */
export const PROFILS_IA = {
  logique: {
    id: 'logique', nom: 'Logique',
    vise: { endormi: { tornade: 1 }, eveille: { vache: 1 } },
    lancersAvantPasse: 7, ecartLancers: 2, peur: 0.55,
    reflexe: 780, ecartReflexe: 200, adresse: 0.52, esquive: 0.58, erreur: 0.02,
    desc: 'Joue pour gagner : d’abord les tornades pour se réveiller, ensuite les vaches.',
  },
  agressif: {
    id: 'agressif', nom: 'Agressif',
    vise: { endormi: { eclair: 3, tornade: 1 }, eveille: { eclair: 3, vache: 1 } },
    lancersAvantPasse: 9, ecartLancers: 3, peur: 0.3,
    reflexe: 690, ecartReflexe: 180, adresse: 0.68, esquive: 0.55, erreur: 0.04,
    desc: 'Cherche l’attrape trois lots sur quatre ; se réveille et fait la vache le reste du temps.',
  },
  tresAgressif: {
    id: 'tresAgressif', nom: 'Très agressif',
    vise: { endormi: { eclair: 1 }, eveille: { eclair: 1 } },
    lancersAvantPasse: 14, ecartLancers: 4, peur: 0.12,
    reflexe: 620, ecartReflexe: 160, adresse: 0.74, esquive: 0.5, erreur: 0.06,
    desc: 'Ne cherche que les éclairs, et garde le lot jusqu’à les avoir.',
  },
  penible: {
    id: 'penible', nom: 'Pénible',
    vise: { endormi: { zzz: 3, tornade: 1 }, eveille: { zzz: 3, vache: 1 } },
    lancersAvantPasse: 8, ecartLancers: 2.5, peur: 0.45,
    reflexe: 760, ecartReflexe: 200, adresse: 0.5, esquive: 0.6, erreur: 0.03,
    desc: 'Endort ses voisins trois lots sur quatre ; se réveille et fait la vache le reste du temps.',
  },
  tresPenible: {
    id: 'tresPenible', nom: 'Très pénible',
    vise: { endormi: { zzz: 1 }, eveille: { zzz: 1 } },
    lancersAvantPasse: 13, ecartLancers: 4, peur: 0.2,
    reflexe: 700, ecartReflexe: 180, adresse: 0.48, esquive: 0.6, erreur: 0.05,
    desc: 'Ne cherche que les ZzZ : il ne joue pas pour gagner, il joue pour gêner.',
  },
  equilibre: {
    id: 'equilibre', nom: 'Équilibré',
    // Emprunte le style d'un autre profil, et en change à chaque lot.
    styles: ['logique', 'agressif', 'penible'],
    lancersAvantPasse: 8, ecartLancers: 2.5, peur: 0.5,
    reflexe: 760, ecartReflexe: 220, adresse: 0.57, esquive: 0.57, erreur: 0.03,
    desc: 'Varie : d’un lot à l’autre il se fait logique, agressif ou pénible.',
  },
  idiot: {
    id: 'idiot', nom: 'Idiot',
    // Vise n'importe lequel des quatre symboles, y compris celui qui ne lui sert
    // à rien — la vache en dormant, la tornade une fois réveillé.
    vise: {
      endormi: { tornade: 1, vache: 1, zzz: 1, eclair: 1 },
      eveille: { tornade: 1, vache: 1, zzz: 1, eclair: 1 },
    },
    bevue: 0.35,   // et une fois sur trois, il garde le mauvais dé
    lancersAvantPasse: 6, ecartLancers: 5, peur: 0.5,
    reflexe: 900, ecartReflexe: 420, adresse: 0.42, esquive: 0.42, erreur: 0.08,
    desc: 'Pas de stratégie : vise au hasard, même l’inutile, et se trompe souvent de dés.',
  },
};

// Les anciens profils, pour les réglages déjà enregistrés dans le navigateur.
const PROFILS_ANCIENS = {
  prudent: 'logique', temeraire: 'agressif', hasard: 'idiot',
};

/** Profil d'IA par identifiant, anciens noms compris. */
export function profilIA(id) {
  return PROFILS_IA[id] || PROFILS_IA[PROFILS_ANCIENS[id]] || PROFILS_IA.equilibre;
}

export const PROFIL_HUMAIN = {
  id: 'humain', nom: 'Humain',
  lancersAvantPasse: 7, ecartLancers: 2.5, peur: 0.5,
  reflexe: 800, ecartReflexe: 250, adresse: 0.55, esquive: 0.55, erreur: 0.04,
};

export const COULEURS_EQUIPE = {
  bleu: { id: 'bleu', nom: 'Bleus', hex: '#3aa9f2', clair: '#e3f1fc' },
  jaune: { id: 'jaune', nom: 'Jaunes', hex: '#e8b21f', clair: '#fdf3d8' },
  vert: { id: 'vert', nom: 'Vert', hex: '#46b25e', clair: '#e4f5e9' },
};

// ── Configuration complète par défaut ─────────────────────────────────────────
export function configParDefaut(nbJoueurs = 6, opts = {}) {
  const mep = MISE_EN_PLACE[nbJoueurs] || MISE_EN_PLACE[6];
  // Règle optionnelle : trois jokers valent un échec. Décochée, la combinaison
  // disparaît purement et simplement du jeu.
  const echecJokers = opts.echecJokers !== false;
  return {
    nbJoueurs,
    desParLot: 4,
    faces: FACES_PAR_DEFAUT.slice(),
    symboleBloquant: SYMBOLE_BLOQUANT,
    echecJokers,
    // Variante d'attrape : 'non' (un jeton retourné, la règle de base),
    // 'touche' (le contact réussi emporte la manche) ou 'combo' (les trois
    // éclairs l'emportent sans même tenter le contact).
    attrapeGagneManche: 'non',
    combos: COMBOS_TORNADE
      .filter((c) => !c.optionnelle || opts[c.optionnelle] !== false)
      .map((c) => ({ ...c, requis: { ...c.requis } })),
    cartes: CARTES_JOURNEE.map((c) => c.id),
    lots: mep.lots,
    jetons: mep.jetons,
    jetonsVert: mep.jetonsVert,
    cartesPourGagner: mep.cartes,
    melangerCartes: true,

    // ── Rythme physique de la table ──────────────────────────────────────────
    // Ces quatre durées font le tempo du jeu : elles comptent dans le temps de
    // partie, à la table comme au Laboratoire.
    dureeLancer: 1000,         // les dés roulent
    dureeConstat: 900,         // on regarde le résultat avant que le lot ne parte
    dureeChoix: 2400,          // délai laissé au joueur quand plusieurs combinaisons sortent
    dureePassage: 1000,        // le lot traverse jusqu'au voisin
    dureeTransition: 3200,     // entre deux manches : les dés reviennent au centre
    tempsReflexion: 300,       // temps de décision d'une IA entre deux gestes
    ecartReflexion: 120,       // écart-type de cette décision
    fenetreReflexe: 900,       // fenêtre pour toucher ou retirer sa main

    adresseBase: 0.55,         // chance de toucher, avant écart d'adresse
    tauxErreur: 0.03,          // chance de relancer un X par mégarde
    penaliteErreurAdverse: 0.35, // part des erreurs assez graves pour offrir un jeton aux adverses
    dureeMaxManche: 1_800_000, // garde-fou : 30 min de temps de jeu simulé
    manchesMax: 40,
  };
}

/**
 * Les symboles qui méritent une colonne dans un tableau de combinaisons : ceux
 * qui sont sur les dés, et ceux qu'une combinaison réclame. Inutile d'afficher
 * le joker double tant que personne ne l'a mis sur une face.
 */
export function symbolesPertinents(cfg) {
  const vus = new Set((cfg.faces || []).filter((s) => s && s !== 'vide'));
  const ajouter = (requis) => {
    for (const [s, n] of Object.entries(requis || {})) if (n > 0) vus.add(s);
  };
  for (const c of cfg.combos || []) ajouter(c.requis);
  for (const carte of CARTES_JOURNEE) {
    if (!carte.combo) continue;
    ajouter((cfg.combosCartes && cfg.combosCartes[carte.combo.id]) || carte.combo.requis);
  }
  return ORDRE_SYMBOLES.filter((s) => vus.has(s));
}

export function infosMiseEnPlace(nbJoueurs) {
  return MISE_EN_PLACE[nbJoueurs] || MISE_EN_PLACE[6];
}

// Répartition des équipes : effectifs égaux, un joueur Vert si le nombre est impair.
export function repartitionEquipes(nbJoueurs) {
  const vert = nbJoueurs % 2 === 1 ? 1 : 0;
  const parEquipe = (nbJoueurs - vert) / 2;
  return { bleu: parEquipe, jaune: parEquipe, vert };
}

// Placement autour de la table : jamais deux joueurs de la même couleur côte à côte.
export function placement(nbJoueurs) {
  const { vert } = repartitionEquipes(nbJoueurs);
  const sieges = [];
  for (let i = 0; i < nbJoueurs - vert; i++) sieges.push(i % 2 === 0 ? 'bleu' : 'jaune');
  if (vert) sieges.push('vert'); // le Vert ferme la ronde, entre un jaune et un bleu
  return sieges;
}
