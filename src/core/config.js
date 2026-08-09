// Toute la matière réglable du jeu : symboles, dés, combinaisons, cartes Journée,
// tableau de mise en place et profils de joueurs. Le moteur ne connaît rien d'autre.

export const SYMBOLES = {
  cloche: { id: 'cloche', nom: 'Cloche', couleur: '#e0932a', desc: 'Réveille votre Tornade' },
  vache: { id: 'vache', nom: 'Vache', couleur: '#3f8f52', desc: 'Retourne un jeton de votre équipe' },
  zzz: { id: 'zzz', nom: 'ZzZ', couleur: '#5b73c4', desc: 'Endort un de vos voisins' },
  etoile: { id: 'etoile', nom: 'Étoile', couleur: '#d4453f', desc: 'Collision — jamais relançable' },
  vide: { id: 'vide', nom: 'Vide', couleur: '#c8bfb2', desc: 'Face neutre' },
};

export const ORDRE_SYMBOLES = ['cloche', 'vache', 'zzz', 'etoile', 'vide'];

// ── Dés ───────────────────────────────────────────────────────────────────────
// Les faces des dés ne figurent pas dans le PnP V4.5 transmis : cette répartition
// est une hypothèse de travail, modifiable face par face dans le Laboratoire.
export const FACES_PAR_DEFAUT = ['cloche', 'cloche', 'vache', 'vache', 'zzz', 'etoile'];

export const PRESETS_FACES = [
  { nom: 'Équilibré (défaut)', faces: ['cloche', 'cloche', 'vache', 'vache', 'zzz', 'etoile'] },
  { nom: 'Symétrique', faces: ['cloche', 'vache', 'zzz', 'etoile', 'cloche', 'vache'] },
  { nom: 'Orageux (2 étoiles)', faces: ['cloche', 'cloche', 'vache', 'vache', 'etoile', 'etoile'] },
  { nom: 'Sommeil (2 ZzZ)', faces: ['cloche', 'cloche', 'vache', 'zzz', 'zzz', 'etoile'] },
  { nom: 'Avec faces vides', faces: ['cloche', 'vache', 'zzz', 'etoile', 'vide', 'vide'] },
];

// ── Combinaisons de la carte Tornade ──────────────────────────────────────────
// `requis` : nombre de dés de chaque symbole. `face` : côté de la carte requis.
export const COMBOS_TORNADE = [
  {
    id: 'reveil',
    nom: 'Réveil',
    libelle: 'Réveillez votre Tornade',
    requis: { cloche: 3 },
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
    nom: 'Collision',
    libelle: 'Passez votre lot et touchez le joueur suivant',
    requis: { etoile: 2 },
    face: 'toutes',
    obligatoire: true,
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
    combo: { id: 'intensive', requis: { vache: 2, cloche: 2 }, effet: 'jeton1' },
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
    combo: { id: 'chance', requis: { etoile: 4 }, effet: 'gagnerManche' },
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
      requis: { etoile: 1, vache: 1, cloche: 1, zzz: 1 },
      effet: 'auChoix',
    },
    effetPassif: null,
  },
  {
    id: 'vaillants',
    court: 'Vaillants',
    nom: 'Journée des vaillants',
    texte: 'Toute votre équipe se réveille (à 3 joueurs, passez cette carte)',
    combo: { id: 'vaillants', requis: { cloche: 4 }, effet: 'reveilEquipe' },
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
export const PROFILS_IA = {
  prudent: {
    id: 'prudent', nom: 'Prudent',
    lancersAvantPasse: 4, ecartLancers: 1.5, peur: 0.85,
    reflexe: 950, ecartReflexe: 260, adresse: 0.5, esquive: 0.5, erreur: 0.02,
    desc: 'Rend le lot vite, joue la sécurité.',
  },
  equilibre: {
    id: 'equilibre', nom: 'Équilibré',
    lancersAvantPasse: 7, ecartLancers: 2.5, peur: 0.5,
    reflexe: 800, ecartReflexe: 220, adresse: 0.55, esquive: 0.55, erreur: 0.03,
    desc: 'Pèse le gain et le risque de collision.',
  },
  temeraire: {
    id: 'temeraire', nom: 'Téméraire',
    lancersAvantPasse: 12, ecartLancers: 4, peur: 0.2,
    reflexe: 640, ecartReflexe: 180, adresse: 0.62, esquive: 0.6, erreur: 0.05,
    desc: 'Garde le lot jusqu’au bout, quitte à se faire toucher.',
  },
  hasard: {
    id: 'hasard', nom: 'Hasard',
    lancersAvantPasse: 6, ecartLancers: 5, peur: 0.5,
    reflexe: 820, ecartReflexe: 400, adresse: 0.5, esquive: 0.5, erreur: 0.05,
    desc: 'Choisit au hasard parmi les coups possibles — étalon de comparaison.',
  },
};

export const PROFIL_HUMAIN = {
  id: 'humain', nom: 'Humain',
  lancersAvantPasse: 7, ecartLancers: 2.5, peur: 0.5,
  reflexe: 800, ecartReflexe: 250, adresse: 0.55, esquive: 0.55, erreur: 0.04,
};

export const COULEURS_EQUIPE = {
  bleu: { id: 'bleu', nom: 'Bleus', hex: '#2e9be6', clair: '#e3f1fc' },
  jaune: { id: 'jaune', nom: 'Jaunes', hex: '#e8b21f', clair: '#fdf3d8' },
  vert: { id: 'vert', nom: 'Vert', hex: '#46b25e', clair: '#e4f5e9' },
};

// ── Configuration complète par défaut ─────────────────────────────────────────
export function configParDefaut(nbJoueurs = 6) {
  const mep = MISE_EN_PLACE[nbJoueurs] || MISE_EN_PLACE[6];
  return {
    nbJoueurs,
    desParLot: 4,
    faces: FACES_PAR_DEFAUT.slice(),
    combos: COMBOS_TORNADE.map((c) => ({ ...c, requis: { ...c.requis } })),
    cartes: CARTES_JOURNEE.map((c) => c.id),
    lots: mep.lots,
    jetons: mep.jetons,
    jetonsVert: mep.jetonsVert,
    cartesPourGagner: mep.cartes,
    melangerCartes: true,
    // Modèle temps réel
    tempsLancer: 800,          // ms moyens pour relancer un lot
    ecartTempsLancer: 220,     // écart-type
    tempsPasse: 350,           // ms pour tendre le lot au voisin
    adresseBase: 0.55,         // chance de toucher, avant écart d'adresse
    tauxErreur: 0.03,          // chance de relancer une étoile par mégarde
    penaliteErreurAdverse: 0.35, // part des erreurs assez graves pour offrir un jeton aux adverses
    dureeMaxManche: 900_000,   // garde-fou : 15 min de temps de jeu simulé
    manchesMax: 40,
  };
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
