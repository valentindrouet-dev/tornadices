// Toute la matière réglable du jeu : symboles, dés, combinaisons, cartes Tornade,
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

// Laquelle des deux combinaisons porte l'attrape. Ce sont bien les combinaisons
// qui décident des dés : changez « Attaque » dans le tableau et le déclencheur
// suit, quel que soit le nombre d'éclairs ou de X qu'on y met.
export const COMBO_DECLENCHEUR = { eclair: 'collision', echec: 'blocage' };

export const OPTIONS_DECLENCHEUR = [
  ['eclair', 'Éclairs'],
  ['echec', 'Échecs'],
];

/** Identifiant de la combinaison qui tente le contact. */
export function comboDeclencheur(cfg) {
  return COMBO_DECLENCHEUR[(cfg && cfg.attrapeSur) === 'echec' ? 'echec' : 'eclair'];
}

export const AIDE_DECLENCHEUR = {
  eclair: 'Règle de base : c’est la combinaison « Attaque » qui passe le lot et tente le '
    + 'contact — trois éclairs au départ, mais réglez la ligne Attaque du tableau et le '
    + 'déclencheur suit. L’Échec, lui, fait partir le lot sans rien tenter.',
  echec: 'C’est la combinaison « Échec » qui tente le contact : elle fait partir le lot comme '
    + 'd’habitude, mais si le joueur suivant tient un lot, on l’attrape au passage. Deux X au '
    + 'départ, trois si vous le décidez dans le tableau. L’Attaque, elle, ne se joue plus.',
};

// Deux façons de jouer une manche.
//
// « jetons » — la règle de base : chaque équipe retourne ses jetons Vache un à
// un, et la manche revient à celle qui les a tous retournés.
//
// « sansPoints » — on ne compte plus rien : il faut se réveiller puis sortir la
// combinaison Vache, et le premier qui y arrive arrête la manche sur-le-champ.
// Son équipe prend la carte Tornade, et l'on recommence. Une attrape réussie
// emporte la manche de la même façon — sans jeton à prendre, elle n'aurait plus
// rien à rapporter. C'est le nombre de cartes qui fait la partie.
export const OPTIONS_MANCHE = [
  ['jetons', 'Retourner tous les jetons'],
  ['sansPoints', 'Sans les points'],
];

export const AIDE_MANCHE = {
  jetons: 'Règle de base : chaque Vache retourne un jeton de votre équipe, et la manche revient '
    + 'à la première équipe qui a retourné les siens. Le compteur de jetons est en jeu.',
  sansPoints: 'Sans les points : on se réveille aux tornades, puis on cherche la Vache. Le '
    + 'premier joueur qui la sort arrête la manche sur-le-champ — son équipe prend la carte '
    + 'Tornade, et la manche suivante commence. Une attrape réussie emporte la manche de la '
    + 'même façon. Plus aucun jeton n’est compté ; c’est le nombre de cartes qui fait le '
    + 'vainqueur, quatre en général.',
};

// Ce que rapporte l'attrape : la règle de base, ou l'une des deux variantes qui
// en font l'enjeu de la manche.
export const OPTIONS_ATTRAPE = [
  ['non', 'Un jeton'],
  ['touche', 'Manche gagnée si le contact réussit'],
];

export const AIDE_ATTRAPE = {
  non: 'Règle de base : un contact réussi interrompt le voisin et retourne un jeton de votre équipe.',
  touche: 'Vous passez le lot et tentez le contact — s’il réussit, votre équipe remporte la '
    + 'manche sur-le-champ. Sans les points, c’est le réglage de départ : il n’y a plus de jeton '
    + 'à prendre, et l’attrape devient l’autre moyen de prendre une manche, avec la Vache.',
};

/**
 * Ce que vaut un contact réussi. Un seul juge, moteur et menus : sans les points
 * le réglage vaut « touche » par défaut, mais il reste réglable — c'est là que
 * se décide si la manche se gagne aussi à l'attrape.
 */
export function attrapeEmporteManche(cfg) {
  return cfg.attrapeGagneManche === 'touche';
}

/**
 * L'exigence d'une combinaison pour une équipe donnée. Le Vert joue seul contre
 * deux équipes : l'asymétrie permet de lui demander autre chose — plus, moins,
 * ou d'autres faces — sans toucher aux Bleus ni aux Jaunes. Décochée, la table
 * redevient strictement symétrique, ce qui reste la référence.
 */
export function requisPourEquipe(cfg, comboId, requisBase, equipe) {
  if (equipe !== 'vert' || !cfg.combosAsymetriques) return requisBase;
  const propre = cfg.combosVert && cfg.combosVert[comboId];
  return propre && Object.keys(propre).length ? propre : requisBase;
}

/**
 * Une combinaison ne peut sortir que si le dé porte les faces qu'elle demande —
 * jokers compris. Sans face joker, « Trois jokers » n'est pas une règle, c'est
 * une ligne morte : autant ne pas l'annoncer à la table.
 */
export function comboPossible(faces, requis) {
  if (!requis || !Object.keys(requis).length) return false;
  const dispo = new Set(faces || []);
  const jokers = [...dispo].filter((f) => SYMBOLES[f] && SYMBOLES[f].joker);
  return Object.keys(requis).every((sym) => dispo.has(sym)
    || jokers.some((j) => (SYMBOLES[j].joker || []).includes(sym)));
}

// ── Cartes Tornade : une version par mode de jeu ─────────────────────────────
// Le paquet et les exigences se règlent séparément pour « Retourner tous les
// jetons » et pour « Sans les points » : une carte qui manipule les jetons n'a
// pas le même sens dans les deux, et certaines n'y ont plus leur place.

/** La clé de réglage du paquet, selon le mode en cours. */
export function clePaquet(cfg) {
  return cfg.sansPoints ? 'cartesSansPoints' : 'cartes';
}

/** La clé de réglage des exigences de cartes, selon le mode en cours. */
export function cleCombosCartes(cfg) {
  return cfg.sansPoints ? 'combosCartesSansPoints' : 'combosCartes';
}

/** Les cartes en jeu dans le mode en cours. */
export function cartesEnJeu(cfg) {
  const liste = cfg[clePaquet(cfg)];
  return Array.isArray(liste) && liste.length ? liste : CARTES_TORNADE.map((c) => c.id);
}

/** L'exigence d'une combinaison de carte dans le mode en cours. */
export function requisCarte(cfg, combo) {
  const table = cfg[cleCombosCartes(cfg)];
  return (table && table[combo.id]) || combo.requis;
}

// Qui prend les dés à la première manche. La règle du jeu dit les Jaunes ; les
// deux autres entrées servent à voir ce que change le premier tour de table.
export const EQUIPES_DEPART = ['jaune', 'bleu', 'vert'];

export const OPTIONS_EQUIPE_DEPART = [
  ['jaune', 'Les Jaunes'],
  ['bleu', 'Les Bleus'],
  ['vert', 'Le Vert'],
];

export const AIDE_EQUIPE_DEPART = {
  jaune: 'Règle du jeu : les Jaunes prennent les lots à la première manche, et le Vert avec eux. '
    + 'Aux manches suivantes, ce sont toujours les perdants de la précédente qui reçoivent les dés.',
  bleu: 'Les Bleus ouvrent la première manche, le Vert avec eux. Rien d’autre ne change : les '
    + 'manches suivantes reviennent aux perdants de la précédente.',
  vert: 'Le Vert ouvre seul la première manche. S’il reste des lots à placer — il ne peut en tenir '
    + 'qu’un —, ils vont aux joueurs suivants autour de la table.',
};

/**
 * Ce que le mode de jeu fait — ou défait — à une carte Tornade. Sans les points,
 * celles qui manipulent les jetons n'ont plus le même sens : autant le dire sur
 * la carte, dans les Réglages comme au Laboratoire, plutôt que de laisser
 * découvrir en partie qu'elle ne sert à rien.
 */
export function noteCarteMode(carte, cfg) {
  if (!cfg.sansPoints || !carte.combo) return '';
  switch (carte.combo.effet) {
    case 'jeton1':
    case 'jeton2':
      return 'Sans les points : cette combinaison emporte la manche, comme la Vache.';
    case 'cacherJetonAdverse':
      return 'Sans les points : sans effet, il n’y a plus de jeton à recacher.';
    case 'auChoix':
      return 'Sans les points : le choix se réduit au réveil ou à la Vache, qui emporte la manche.';
    default:
      return '';
  }
}

// ── Dés ───────────────────────────────────────────────────────────────────────
// Le dé officiel : 2 tornades, 1 X, 1 vache, 2 ZzZ. Ni joker ni éclair — les
// deux faces restent disponibles dans les menus, à poser soi-même.
// Modifiable face par face dans les réglages de partie et dans le Laboratoire.
export const FACES_PAR_DEFAUT = ['tornade', 'tornade', 'x', 'vache', 'zzz', 'zzz'];

// Le dé d'avant, avec joker et éclair : la combinaison Attaque n'est servie que
// par un dé qui porte des éclairs.
export const FACES_JOKER_ECLAIR = ['tornade', 'joker', 'x', 'zzz', 'vache', 'eclair'];

// Les faces ont été renommées en v1.3 : la « cloche » est devenue la tornade, et
// l'« étoile » — la face jamais relançable qui déclenchait la collision — est
// devenue le X. Un réglage enregistré avant ce renommage porte encore les
// anciens noms, et rien ne les traduisait : le dé gardait des faces que ni
// l'affichage ni le moteur ne reconnaissaient, muettes et sans effet.
export const SYMBOLES_ANCIENS = { cloche: 'tornade', etoile: 'x' };

/** Traduit une face enregistrée ; « vide » pour un symbole devenu inconnu. */
export function assainirSymbole(id) {
  if (SYMBOLES[id]) return id;
  return SYMBOLES_ANCIENS[id] || 'vide';
}

/** Traduit une liste de faces enregistrée, longueur conservée. */
export function assainirFaces(faces) {
  if (!Array.isArray(faces) || !faces.length) return FACES_PAR_DEFAUT.slice();
  return faces.map(assainirSymbole);
}

/** Traduit les clés d'une exigence { cloche: 3 } → { tornade: 3 }. */
export function assainirRequis(requis) {
  if (!requis || typeof requis !== 'object') return {};
  const sortie = {};
  for (const [sym, n] of Object.entries(requis)) {
    if (!n) continue;
    const cle = assainirSymbole(sym);
    sortie[cle] = (sortie[cle] || 0) + n;
  }
  return sortie;
}

/**
 * Remet une configuration enregistrée au goût du jour : les réglages apparus
 * depuis reprennent leur valeur par défaut, et les faces comme les exigences
 * sont retraduites. Sans quoi un Laboratoire ouvert de longue date simule des
 * règles que le moteur ne comprend plus.
 */
export function assainirConfig(cfg) {
  const base = configParDefaut(cfg && cfg.nbJoueurs ? cfg.nbJoueurs : 6, cfg || {});
  if (!cfg || typeof cfg !== 'object') return base;

  const sortie = { ...base, ...cfg };
  sortie.faces = assainirFaces(cfg.faces);
  // « Manche gagnée dès les 3 éclairs » n'existe pas dans le jeu : un réglage
  // qui la porte encore retombe sur la variante voisine, celle où il faut
  // toucher pour emporter la manche.
  if (cfg.attrapeGagneManche === 'combo') sortie.attrapeGagneManche = 'touche';
  // Une équipe de départ inconnue — ou aucune, avant la v1.34 — retombe sur la
  // règle du jeu plutôt que de laisser la manche sans porteur.
  if (!EQUIPES_DEPART.includes(cfg.equipeDepart)) sortie.equipeDepart = 'jaune';
  sortie.variance = Math.min(0.5, Math.max(0, Number(cfg.variance) || 0));
  // On repart de la liste de référence et l'on y pose les seuils enregistrés :
  // une combinaison apparue depuis — ou disparue d'une configuration ancienne,
  // comme l'Attaque au Laboratoire — revient au lieu de manquer sans bruit.
  const enregistrees = new Map(
    (Array.isArray(cfg.combos) ? cfg.combos : []).map((c) => [c.id, c]),
  );
  sortie.combos = base.combos.map((c) => {
    const garde = enregistrees.get(c.id);
    return {
      ...c,
      requis: assainirRequis(garde ? garde.requis : c.requis),
      // « Réveillé seulement » se règle à la main : on garde le choix enregistré.
      face: garde && garde.face ? garde.face : c.face,
    };
  });
  // Les trois tables d'exigences enregistrées — cartes par mode, et le Vert —
  // passent par la même retraduction que les combinaisons de la Tornade.
  for (const cle of ['combosCartes', 'combosCartesSansPoints', 'combosVert']) {
    if (cfg[cle] && typeof cfg[cle] === 'object') {
      sortie[cle] = Object.fromEntries(Object.entries(cfg[cle])
        .map(([id, requis]) => [id, assainirRequis(requis)]));
    }
  }
  return sortie;
}

/** « 20 % — un passage de 1000 ms dure de 800 à 1200 ms ». */
export function aideVariance(v, cfg) {
  const pct = Math.round(v * 100);
  if (!pct) return '0 % — durées fixes';
  const base = (cfg && cfg.dureePassage) || 1000;
  return `${pct} % — un passage de ${base} ms dure de `
    + `${Math.round(base * (1 - v))} à ${Math.round(base * (1 + v))} ms`;
}

// Le dé de base est toujours le d6 ; le d8 et le d10 sont là pour l'équilibrage.
export const TYPES_DE = [6, 8, 10];

/**
 * Étire une répartition de six faces sur un dé plus grand en reprenant la série
 * depuis le début : le d8 ajoute une tornade et un joker, le d10 y ajoute un X
 * et un ZzZ. C'est la façon la plus régulière de garder les proportions du d6,
 * et chaque face reste modifiable une à une.
 */
export function facesPourDe(nbFaces, base = FACES_PAR_DEFAUT) {
  const modele = base.length ? base : FACES_PAR_DEFAUT;
  return Array.from({ length: nbFaces }, (_, i) => modele[i % modele.length]);
}


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
    // Comme la vache : il faut être réveillé pour endormir quelqu'un d'autre.
    face: 'active',
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
    nom: 'Échec',
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

// ── Cartes Tornade ────────────────────────────────────────────────────────────
// `combo` : combinaison supplémentaire ouverte pour la manche.
// `effetPassif` : modificateur appliqué à tous les joueurs pendant la manche.
export const CARTES_TORNADE = [
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
    // Sans les points il n'y a plus de jeton à recacher : la carte ne ferait
    // rien du tout. Elle sort du paquet de ce mode, réactivable à la main.
    inerteSansPoints: true,
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
    id: 'tresAgressif', nom: 'Très agressif', court: 'T. agressif',
    vise: { endormi: { eclair: 1 }, eveille: { eclair: 1 } },
    lancersAvantPasse: 14, ecartLancers: 4, peur: 0.12,
    reflexe: 620, ecartReflexe: 160, adresse: 0.74, esquive: 0.5, erreur: 0.06,
    desc: 'Ne cherche que les éclairs, et garde le lot jusqu’à les avoir.',
  },
  penible: {
    id: 'penible', nom: 'Pénible',
    // Endormir demande d'être réveillé : tant qu'il dort, il vise la tornade.
    vise: { endormi: { tornade: 1 }, eveille: { zzz: 3, vache: 1 } },
    lancersAvantPasse: 8, ecartLancers: 2.5, peur: 0.45,
    reflexe: 760, ecartReflexe: 200, adresse: 0.5, esquive: 0.6, erreur: 0.03,
    desc: 'Endort ses voisins trois lots sur quatre ; se réveille et fait la vache le reste du temps.',
  },
  tresPenible: {
    id: 'tresPenible', nom: 'Très pénible', court: 'T. pénible',
    // Il se réveille parce qu'il le faut, puis ne joue plus que le ZzZ.
    vise: { endormi: { tornade: 1 }, eveille: { zzz: 1 } },
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

// Chaque équipe a son emblème : les Bleus sont les vaches, les Jaunes les
// poules, et le Vert — seul contre les deux — est le cowboy.
export const COULEURS_EQUIPE = {
  bleu: {
    id: 'bleu', nom: 'Bleus', hex: '#3aa9f2', clair: '#e3f1fc',
    embleme: 'vache', emblemeNom: 'Vaches', emblemeUn: 'Vache',
  },
  jaune: {
    id: 'jaune', nom: 'Jaunes', hex: '#e8b21f', clair: '#fdf3d8',
    embleme: 'poule', emblemeNom: 'Poules', emblemeUn: 'Poule',
  },
  vert: {
    id: 'vert', nom: 'Vert', hex: '#46b25e', clair: '#e4f5e9',
    embleme: 'cowboy', emblemeNom: 'Cowboy', emblemeUn: 'Cowboy',
  },
};

// ── Configuration complète par défaut ─────────────────────────────────────────
export function configParDefaut(nbJoueurs = 6, opts = {}) {
  const mep = MISE_EN_PLACE[nbJoueurs] || MISE_EN_PLACE[6];
  // Règle optionnelle : trois jokers valent un échec. Décochée, la combinaison
  // disparaît purement et simplement du jeu.
  const echecJokers = opts.echecJokers !== false;
  // Le dé officiel ne porte pas d'éclair : c'est donc l'Échec qui tente le
  // contact par défaut, sinon l'attrape ne se produirait jamais. Repassez sur
  // « Éclairs » après avoir posé une face éclair sur le dé.
  const attrapeSur = opts.attrapeSur === 'eclair' ? 'eclair' : 'echec';
  return {
    nbJoueurs,
    desParLot: 4,
    faces: FACES_PAR_DEFAUT.slice(),
    symboleBloquant: SYMBOLE_BLOQUANT,
    echecJokers,
    attrapeSur,
    // Un dormeur ne tend pas la main : l'attrape sur échec demande d'être
    // réveillé. Ne concerne pas les trois éclairs, qui valent dans les deux
    // états. Décochable dans les Réglages.
    attrapeEveille: opts.attrapeEveille !== false,
    // Deux lots qui se rencontrent : le premier est poussé plus loin, ou bien ils
    // s'empilent dans la même main.
    lotsCumules: !!opts.lotsCumules,
    // Ce que vaut un contact réussi : 'non' (un jeton retourné, la règle de
    // base) ou 'touche' (le contact emporte la manche). Sans les points, il n'y
    // a plus de jeton à prendre : c'est « touche » qui vaut par défaut — l'un
    // des deux moyens de prendre une manche, avec la Vache. Réglable dans les
    // deux modes.
    attrapeGagneManche: opts.sansPoints ? 'touche' : 'non',
    // Qui prend les dés à la première manche : les Jaunes (la règle), les Bleus,
    // ou le Vert seul. Le Vert accompagne l'équipe désignée dans les deux
    // premiers cas, comme au jeu.
    equipeDepart: EQUIPES_DEPART.includes(opts.equipeDepart) ? opts.equipeDepart : 'jaune',
    combos: COMBOS_TORNADE
      .filter((c) => !c.optionnelle || opts[c.optionnelle] !== false)
      .map((c) => ({ ...c, requis: { ...c.requis } })),
    // Le paquet et les exigences des cartes se règlent par mode : « Jour sans
    // vent » n'a plus d'effet sans les points, autant ne pas l'y laisser.
    cartes: CARTES_TORNADE.map((c) => c.id),
    cartesSansPoints: CARTES_TORNADE
      .filter((c) => !c.inerteSansPoints)
      .map((c) => c.id),
    combosCartesSansPoints: {},
    // Le Vert joue seul contre deux équipes : on peut lui demander autre chose.
    // Décochée, la table est strictement symétrique — c'est la référence.
    combosAsymetriques: false,
    combosVert: {},
    lots: mep.lots,
    jetons: mep.jetons,
    jetonsVert: mep.jetonsVert,
    // « Sans les points » se joue en général en quatre cartes : les manches y
    // sont bien plus courtes, il en faut davantage pour faire une partie.
    cartesPourGagner: opts.sansPoints ? 4 : mep.cartes,
    // Manche « sans les points » : la première Vache arrête tout.
    sansPoints: !!opts.sansPoints,
    // Le Vert joue seul contre deux équipes : son objectif se règle à part.
    // `null` = même exigence que les Bleus et les Jaunes.
    cartesVert: null,
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
    variance: 0,               // 0 à 0,5 : irrégularité du rythme, coup par coup

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
  for (const carte of CARTES_TORNADE) {
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
