// Toute la matière réglable du jeu : symboles, dés, combinaisons, cartes Tornade,
// tableau de mise en place et profils de joueurs. Le moteur ne connaît rien d'autre.

export const SYMBOLES = {
  tornade: { id: 'tornade', nom: 'Tornade', couleur: '#a8dcf2', desc: 'Réveille votre Tornade' },
  vache: { id: 'vache', nom: 'Vache', couleur: '#82dc0a', desc: 'Retourne un jeton de votre équipe' },
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

// Trois façons de jouer une manche.
//
// « jeton » — la règle de base : chaque équipe retourne ses jetons Abri un à
// un, et la manche revient à celle qui les a tous retournés.
//
// « immediat » — on ne compte plus rien : il faut se réveiller puis sortir la
// combinaison Abri, et le premier qui y arrive arrête la manche sur-le-champ.
// Son équipe prend la carte Tornade, et l'on recommence. Une attrape réussie
// emporte la manche de la même façon — sans jeton à prendre, elle n'aurait plus
// rien à rapporter. C'est le nombre de cartes qui fait la partie.
//
// « compromis » — entre les deux. Chaque équipe a ses jetons, et la carte
// Tornade en cours dit combien il faut en mettre à l'Abri pour prendre la
// manche : de un à trois, carte par carte. Poser le dernier demandé l'emporte
// aussitôt — vos animaux sont à couvert. Une collision réussie l'emporte
// également : vous envoyez valser un adversaire dans la tornade.
export const MODES_MANCHE = ['jeton', 'immediat', 'compromis'];

export const OPTIONS_MANCHE = [
  ['jeton', 'Jeton'],
  ['immediat', 'Immédiat'],
  ['compromis', 'Compromis'],
];

/** Le nom d'un mode, pour l'écrire dans une phrase. */
export const NOM_MODE = Object.fromEntries(OPTIONS_MANCHE);

export const AIDE_MANCHE = {
  jeton: 'Règle de base : chaque Abri retourne un jeton de votre équipe, et la manche revient '
    + 'à la première équipe qui a retourné les siens. Le compteur de jetons est en jeu.',
  immediat: 'Immédiat : on se réveille aux tornades, puis on cherche l’Abri. Le '
    + 'premier joueur qui le sort arrête la manche sur-le-champ — son équipe prend la carte '
    + 'Tornade, et la manche suivante commence. Une attrape réussie emporte la manche de la '
    + 'même façon. Plus aucun jeton n’est compté ; c’est le nombre de cartes qui fait le '
    + 'vainqueur, quatre en général.',
  compromis: 'Compromis : chaque équipe a trois jetons de sa couleur, et la carte Tornade en '
    + 'cours dit combien il faut en mettre à l’Abri pour prendre la manche — de un à trois, '
    + 'réglable carte par carte. Chaque combinaison Abri en pose un ; poser le dernier demandé '
    + 'emporte la manche sur-le-champ. Une collision réussie l’emporte aussi : le jeton de '
    + 'l’adversaire part dans la tornade, et la manche est à vous. Cinq cartes pour gagner.',
};

// ── Le sens de rotation ──────────────────────────────────────────────────────
// Trois façons de décider dans quel sens tourne une manche.
export const OPTIONS_SENS = [
  ['alterne', 'Une manche sur l’autre'],
  ['carte', 'Au dos de la prochaine Tornade'],
  ['perdants', 'Carte de sens — les perdants décident'],
];

export const NOM_SENS = Object.fromEntries(OPTIONS_SENS);

export const AIDE_SENS = {
  alterne: 'Règle de base : le sens s’inverse à chaque manche, sans que personne n’ait à en '
    + 'décider. Une manche dans un sens, la suivante dans l’autre.',
  carte: 'Chaque Tornade porte une flèche à son dos. La manche se joue dans le sens qu’annonce '
    + 'la prochaine carte, encore face cachée sur la pioche — deux manches de suite peuvent donc '
    + 'tourner dans le même sens.',
  perdants: 'Une carte posée sur la table indique le sens. À la fin d’une manche, l’équipe '
    + 'perdante — celle qui reçoit les dés — peut la retourner pour inverser le sens, ou la '
    + 'laisser en place. C’est un choix, pas une obligation : celui qui subit décide de la façon '
    + 'dont il repart.',
};

/**
 * Comment se décide le sens d'une manche.
 *
 * Sans réglage, chaque mode garde ce qu'il faisait : la règle de base alterne,
 * les deux autres lisent le dos de la prochaine Tornade — c'est la pioche qui
 * l'annonce, et elle sert déjà à cela.
 */
export function sensRotation(cfg) {
  const s = cfg && cfg.sensRotation;
  if (OPTIONS_SENS.some(([id]) => id === s)) return s;
  return modeManche(cfg) === 'jeton' ? 'alterne' : 'carte';
}

/**
 * La façon de jouer une manche, en un seul mot.
 *
 * Le réglage a longtemps été un booléen `sansPoints`. À trois modes il lui faut
 * un nom : `modeManche`. Un réglage enregistré avant la v1.50 n'a que l'ancien
 * booléen — on le traduit ici, une fois pour toutes, plutôt que de laisser
 * chaque page en décider.
 */
export function modeManche(cfg) {
  const m = cfg && cfg.modeManche;
  if (MODES_MANCHE.includes(m)) return m;
  // Traduction de l'ancien booléen, et de son nom d'alors.
  if (m === 'sansPoints') return 'immediat';
  return cfg && cfg.sansPoints ? 'immediat' : 'jeton';
}

/** La manche se gagne d'un coup, sans compter les jetons. */
export const estImmediat = (cfg) => modeManche(cfg) === 'immediat';

/** La manche se gagne en mettant ses jetons à l'Abri. */
export const estCompromis = (cfg) => modeManche(cfg) === 'compromis';

/** La règle de base : retourner tous ses jetons. */
export const estJeton = (cfg) => modeManche(cfg) === 'jeton';

/**
 * Combien de jetons il faut mettre à l'Abri pour prendre la manche, sous la
 * carte Tornade en cours. Réglable carte par carte, de un à trois.
 */
export function refugePour(cfg, carte) {
  if (!carte) return 1;
  const regle = cfg && cfg.refugeCartes && Number(cfg.refugeCartes[carte.id]);
  const brut = Number.isFinite(regle) && regle >= 1 ? regle : carte.refuge;
  const max = (cfg && Number(cfg.jetonsRefuge)) || 3;
  return Math.min(max, Math.max(1, Math.round(Number(brut) || 1)));
}

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
    + 'à prendre, et l’attrape devient l’autre moyen de prendre une manche, avec l’Abri.',
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
  const m = modeManche(cfg);
  return m === 'immediat' ? 'cartesSansPoints' : m === 'compromis' ? 'cartesCompromis' : 'cartes';
}

/** La clé de réglage des exigences de cartes, selon le mode en cours. */
export function cleCombosCartes(cfg) {
  const m = modeManche(cfg);
  return m === 'immediat' ? 'combosCartesSansPoints'
    : m === 'compromis' ? 'combosCartesCompromis' : 'combosCartes';
}

/** Les cartes en jeu dans le mode en cours. */
export function cartesEnJeu(cfg) {
  const paquet = cartesDuMode(cfg);
  const connues = new Set(paquet.map((c) => c.id));
  const liste = cfg[clePaquet(cfg)];
  // Un paquet enregistré peut porter des cartes de l'autre mode — un réglage
  // d'avant la séparation des paquets : elles ne comptent pas ici.
  const retenues = Array.isArray(liste) ? liste.filter((id) => connues.has(id)) : [];
  return retenues.length ? retenues : paquet.map((c) => c.id);
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
  // Une carte qui désigne une équipe absente ne rejoint pas la pioche : autant
  // le dire ici, sans quoi on la croirait en jeu parce qu'elle est cochée.
  if (carte.equipeRequise && cfg.nbJoueurs % 2 === 0 && carte.equipeRequise === 'vert') {
    return 'Pas de joueur Vert à ce nombre de joueurs : cette carte n’est pas mise dans la pile.';
  }
  if (estJeton(cfg) || !carte.combo) return '';
  const mode = estCompromis(cfg) ? 'Compromis' : 'Immédiat';
  switch (carte.combo.effet) {
    case 'jeton1':
    case 'jeton2':
      return `${mode} : cette combinaison emporte la manche, comme l’Abri.`;
    case 'cacherJetonAdverse':
      return `${mode} : sans effet, il n’y a plus de jeton à recacher.`;
    case 'auChoix':
      return `${mode} : le choix se réduit au réveil ou à l’Abri.`;
    default:
      return '';
  }
}

// ── Dés ───────────────────────────────────────────────────────────────────────
// Le dé officiel : 2 tornades, 1 X, 1 abri, 2 ZzZ. Ni joker ni éclair — les
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
  // Le jeu se joue de trois à huit : une configuration enregistrée à neuf
  // joueurs date d'avant la v1.49 et doit revenir dans les bornes.
  sortie.nbJoueurs = bornerJoueurs(sortie.nbJoueurs);
  sortie.faces = assainirFaces(cfg.faces);
  // « Manche gagnée dès les 3 éclairs » n'existe pas dans le jeu : un réglage
  // qui la porte encore retombe sur la variante voisine, celle où il faut
  // toucher pour emporter la manche.
  if (cfg.attrapeGagneManche === 'combo') sortie.attrapeGagneManche = 'touche';
  // Une équipe de départ inconnue — ou aucune, avant la v1.34 — retombe sur la
  // règle du jeu plutôt que de laisser la manche sans porteur.
  if (!EQUIPES_DEPART.includes(cfg.equipeDepart)) sortie.equipeDepart = 'jaune';
  sortie.variance = Math.min(0.5, Math.max(0, Number(cfg.variance) || 0));
  // La façon de jouer une manche : un mot depuis la v1.50, un booléen avant.
  // Les deux restent écrits, `modeManche` faisant foi.
  sortie.modeManche = modeManche(cfg);
  sortie.sansPoints = sortie.modeManche === 'immediat';
  // Le sens de rotation : une valeur inconnue — ou absente, avant la v1.54 —
  // retombe sur ce que le mode faisait jusqu'ici.
  sortie.sensRotation = sensRotation(sortie);
  // Compromis : de un à trois jetons demandés, jamais zéro ni davantage.
  sortie.jetonsRefuge = Math.min(6, Math.max(1, Math.round(Number(cfg.jetonsRefuge) || 3)));
  if (cfg.refugeCartes && typeof cfg.refugeCartes === 'object') {
    sortie.refugeCartes = Object.fromEntries(Object.entries(cfg.refugeCartes)
      .map(([id, n]) => [id, Math.min(sortie.jetonsRefuge, Math.max(1, Math.round(Number(n) || 1)))]));
  }
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
  for (const cle of ['combosCartes', 'combosCartesSansPoints', 'combosCartesCompromis', 'combosVert']) {
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
    nom: 'Abri',
    libelle: 'Retournez un jeton Abri de votre équipe',
    requis: { vache: 3 },
    face: 'active',
    obligatoire: false,
  },
  {
    id: 'endormir',
    nom: 'Endormi',
    libelle: 'Endormez un de vos voisins',
    requis: { zzz: 3 },
    // Comme l'Abri : il faut être réveillé pour endormir quelqu'un d'autre.
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

/**
 * Ce que « Réveillé seulement » rend quand on la décoche.
 *
 * Décocher doit lever la condition — sinon la case ne se décoche pas. C'était
 * le cas de l'Abri et de l'Endormi, dont la condition d'origine est justement
 * « active » : on leur réécrivait la valeur qu'ils avaient déjà. Le repli est
 * donc « les deux états », sauf pour le Réveil, réservé au dormeur : sans lui,
 * un joueur endormi ne pourrait plus jamais se réveiller.
 */
export function faceSansReveil(comboId) {
  const ref = COMBOS_TORNADE.find((c) => c.id === comboId);
  return ref && ref.face === 'endormie' ? 'endormie' : 'toutes';
}

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

// ── Cartes Tornade du mode « sans les points » ────────────────────────────────
//
// Un paquet entièrement à part : sans jeton à retourner, une carte ne peut plus
// jouer sur les jetons, elle joue sur les cartes elles-mêmes. Trois façons :
//   · `doubleSi` — l'équipe désignée gagne deux cartes si elle prend la manche ;
//   · `gagnerManche2` — la combinaison emporte la manche et vaut deux cartes ;
//   · `volerCarte` — le vainqueur prend une carte à une autre équipe.
//
// `sens` est la flèche imprimée au dos : +1 horaire, -1 antihoraire. C'est le
// dos de la PROCHAINE carte, encore face cachée sur la pioche, qui donne le sens
// de la manche en cours — ce n'est donc pas un sens puis l'autre.
// `refuge` : en Compromis, combien de jetons de sa couleur il faut mettre à
// l'Abri pour prendre la manche sous cette Tornade. De un à trois, réglable
// carte par carte dans les Réglages. Sans effet dans les deux autres modes.
export const CARTES_SANS_POINTS = [
  {
    id: 'spFeuille',
    refuge: 1,
    court: 'Tornade de feuille',
    nom: 'Tornade de feuille',
    // La première Tornade n'a pas de pouvoir, mais elle se gagne comme les
    // autres : l'équipe qui prend la manche la met dans sa pile.
    texte: 'Aucun pouvoir — la manche de chauffe. Elle se gagne comme les autres.',
    combo: null,
    effetPassif: null,
    toujoursPremiere: true,
    sens: 1,
  },
  {
    id: 'spVaches',
    refuge: 2,
    court: 'Tornade de Vaches',
    nom: 'Tornade de Vaches',
    texte: 'Les Vaches (Bleus) gagnent 2 cartes Tornade si elles remportent cette manche.',
    combo: null,
    effetPassif: { doubleSi: 'bleu' },
    sens: -1,
  },
  {
    id: 'spPoules',
    refuge: 2,
    court: 'Tornade de Poules',
    nom: 'Tornade de Poules',
    texte: 'Les Poules (Jaunes) gagnent 2 cartes Tornade si elles remportent cette manche.',
    combo: null,
    effetPassif: { doubleSi: 'jaune' },
    sens: -1,
  },
  {
    id: 'spCowboy',
    refuge: 2,
    court: 'Tornade de Cow-boy',
    nom: 'Tornade de Cow-boy',
    texte: 'Le Cow-boy (Vert) gagne 2 cartes Tornade s’il remporte cette manche.',
    combo: null,
    effetPassif: { doubleSi: 'vert' },
    // Sans joueur Vert, la carte ne désignerait personne : elle sort du paquet.
    equipeRequise: 'vert',
    sens: 1,
  },
  {
    id: 'spSiecle',
    refuge: 3,
    court: 'Tornade du Siècle',
    nom: 'Tornade du Siècle',
    texte: 'Vous gagnez 2 cartes Tornade.',
    combo: { id: 'spSiecle', requis: { vache: 4 }, effet: 'gagnerManche2' },
    effetPassif: null,
    sens: 1,
  },
  {
    id: 'spSommeil',
    refuge: 2,
    court: 'Tornade de Sommeil',
    nom: 'Tornade de Sommeil',
    texte: 'Vous gagnez la manche.',
    combo: { id: 'spSommeil', requis: { zzz: 3 }, effet: 'gagnerManche' },
    effetPassif: null,
    sens: -1,
  },
  {
    id: 'spElectrique',
    refuge: 2,
    court: 'Tornade électrique',
    nom: 'Tornade électrique',
    texte: 'Vous gagnez 2 cartes Tornade si vous remportez cette manche en attrapant.',
    combo: null,
    effetPassif: { doubleSiAttrape: true },
    sens: 1,
  },
  // Trois Tornades qui ne donnent rien et ne demandent rien : elles gênent. La
  // manche se gagne comme d'habitude — l'Abri, ou le contact — mais tout le
  // monde joue avec un handicap, le même pour tous. C'est la contrepartie des
  // Tornades qui emportent la manche d'une combinaison : une pioche qui ne
  // ferait qu'accélérer n'aurait pas de respiration.
  {
    id: 'spPaisible',
    refuge: 1,
    court: 'Tornade paisible',
    nom: 'Tornade paisible',
    texte: 'Relancez les dés un par un.',
    combo: null,
    effetPassif: { unParUn: true },
    sens: -1,
  },
  {
    id: 'spMaladroite',
    // Les trois gênantes demandent le minimum à l'Abri : une Tornade qui vous
    // handicape n'a pas en plus à vous en demander davantage. Mesuré à six
    // joueurs, la Maladroite passe de 58 s à 37 s de manche — au milieu du
    // paquet, au lieu d'être la plus longue de toutes.
    refuge: 1,
    court: 'Tornade maladroite',
    nom: 'Tornade maladroite',
    texte: 'Lancez les dés de votre autre main.',
    combo: null,
    effetPassif: { lenteur: 1.35, erreur: 0.06 },
    sens: 1,
  },
  {
    id: 'spMini',
    refuge: 1,
    court: 'Mini-Tornade',
    nom: 'Mini-Tornade',
    texte: 'Jouez avec un lot de dés de moins.',
    combo: null,
    effetPassif: { lotsEnMoins: 1 },
    sens: -1,
  },
  {
    id: 'spFurieuse',
    refuge: 3,
    court: 'Tornade furieuse',
    nom: 'Tornade furieuse',
    texte: 'Vous gagnez la manche.',
    combo: { id: 'spFurieuse', requis: { x: 3 }, effet: 'gagnerManche' },
    effetPassif: null,
    sens: -1,
  },
  {
    id: 'spMega',
    refuge: 3,
    court: 'Mega-Tornade',
    nom: 'Mega-Tornade',
    texte: 'Vous gagnez la manche.',
    combo: { id: 'spMega', requis: { tornade: 1, vache: 1, zzz: 1, eclair: 1 }, effet: 'gagnerManche' },
    effetPassif: null,
    sens: -1,
  },
  {
    id: 'spF5',
    refuge: 2,
    court: 'Tornade F5',
    nom: 'Tornade F5',
    texte: 'Vous volez la carte Tornade d’une autre équipe à cette manche.',
    combo: null,
    effetPassif: { volerCarte: true },
    sens: 1,
  },
];

/** Le paquet du mode en cours : chaque mode a le sien, de bout en bout. */
export function cartesDuMode(cfg) {
  // « Compromis » joue les mêmes Tornades qu'« Immédiat » — ce sont les cartes
  // qui portent le nombre de jetons à mettre à l'Abri — mais son paquet et ses
  // exigences se règlent à part.
  return cfg && modeManche(cfg) !== 'jeton' ? CARTES_SANS_POINTS : CARTES_TORNADE;
}

/** Toutes les cartes des deux modes, par identifiant. */
export const CARTES_PAR_ID = Object.fromEntries(
  [...CARTES_TORNADE, ...CARTES_SANS_POINTS].map((c) => [c.id, c]),
);

// ── Tableau de mise en place (règles V4.5) ────────────────────────────────────
// Le tableau officiel V4.5, de trois à huit joueurs — huit est le maximum du jeu.
export const MISE_EN_PLACE = {
  3: { lots: 2, jetons: 2, jetonsVert: 2, cartes: 3 },
  4: { lots: 2, jetons: 3, jetonsVert: 2, cartes: 3 },
  5: { lots: 3, jetons: 3, jetonsVert: 2, cartes: 3 },
  6: { lots: 3, jetons: 4, jetonsVert: 2, cartes: 3 },
  7: { lots: 4, jetons: 4, jetonsVert: 2, cartes: 3 },
  8: { lots: 4, jetons: 4, jetonsVert: 2, cartes: 3 },
};

/** Les tables auxquelles le jeu se joue, du plus petit au plus grand. */
export const NOMBRES_JOUEURS = [3, 4, 5, 6, 7, 8];

/** Les bornes du jeu : jamais moins de trois joueurs, jamais plus de huit. */
export const JOUEURS_MIN = NOMBRES_JOUEURS[0];
export const JOUEURS_MAX = NOMBRES_JOUEURS[NOMBRES_JOUEURS.length - 1];

/** Ramène un nombre de joueurs dans les bornes — une valeur enregistree peut dater. */
export function bornerJoueurs(n) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 6;
  return Math.min(JOUEURS_MAX, Math.max(JOUEURS_MIN, x));
}

/**
 * Combien de lots tournent, à ce nombre de joueurs.
 *
 * Ce n'est pas un réglage unique mais une ligne par table : trois lots à six
 * joueurs n'ont rien à voir avec trois lots à trois. Le réglage porte donc un
 * tableau complet, et la partie y lit sa ligne — au lieu d'un seul nombre dont
 * on ne savait plus pour quel effectif il avait été posé.
 *
 * Une ligne absente ou aberrante retombe sur le tableau officiel.
 */
export function lotsPour(table, nbJoueurs) {
  const n = table && Number(table[nbJoueurs]);
  if (Number.isFinite(n) && n >= 1) return Math.min(12, Math.round(n));
  return infosMiseEnPlace(nbJoueurs).lots;
}

/** Le tableau officiel des lots, prêt à être édité ligne par ligne. */
export function lotsOfficiels() {
  return Object.fromEntries(NOMBRES_JOUEURS.map((n) => [n, MISE_EN_PLACE[n].lots]));
}

/**
 * Combien de cartes Tornade il faut réunir pour gagner, sans rien de réglé.
 *
 * La valeur de départ dépend de la façon de jouer une manche : les manches sont
 * bien plus courtes hors de la règle de base, il en faut donc davantage. C'est
 * pourquoi le tableau des cartes se garde par mode — un réglage posé en
 * Compromis n'a aucune raison de suivre en mode Jeton.
 */
export function cartesParDefaut(mode, nbJoueurs) {
  if (mode === 'immediat') return 4;
  if (mode === 'compromis') return 5;
  return infosMiseEnPlace(nbJoueurs).cartes;
}

/** Le tableau officiel des cartes pour gagner, dans un mode donné. */
export function cartesOfficielles(mode) {
  return Object.fromEntries(NOMBRES_JOUEURS.map((n) => [n, cartesParDefaut(mode, n)]));
}

/** Une ligne de tableau, bornée — une valeur enregistrée peut être aberrante. */
function ligneTableau(table, nbJoueurs, defaut, max = 12) {
  const n = table && Number(table[nbJoueurs]);
  if (Number.isFinite(n) && n >= 1) return Math.min(max, Math.round(n));
  return defaut;
}

/** Les cartes pour gagner à ce nombre de joueurs, dans ce mode. */
export function cartesPour(table, mode, nbJoueurs) {
  return ligneTableau(table, nbJoueurs, cartesParDefaut(mode, nbJoueurs));
}

/**
 * Et celles du joueur Vert. Il joue seul contre deux équipes : son objectif se
 * règle à part, ligne par ligne. Rien de réglé, il gagne aux mêmes conditions
 * que les équipes — et à nombre pair il n'existe pas.
 */
export function cartesVertPour(table, mode, nbJoueurs) {
  if (nbJoueurs % 2 === 0) return null;
  return ligneTableau(table, nbJoueurs, cartesPour(null, mode, nbJoueurs));
}

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
    desc: 'Joue pour gagner : d’abord les tornades pour se réveiller, ensuite les abris.',
  },
  agressif: {
    id: 'agressif', nom: 'Agressif',
    vise: { endormi: { eclair: 3, tornade: 1 }, eveille: { eclair: 3, vache: 1 } },
    lancersAvantPasse: 9, ecartLancers: 3, peur: 0.3,
    reflexe: 690, ecartReflexe: 180, adresse: 0.68, esquive: 0.55, erreur: 0.04,
    desc: 'Cherche l’attrape trois lots sur quatre ; se réveille et court à l’abri le reste du temps.',
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
    desc: 'Endort ses voisins trois lots sur quatre ; se réveille et court à l’abri le reste du temps.',
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
    // à rien — l'abri en dormant, la tornade une fois réveillé.
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
  nbJoueurs = bornerJoueurs(nbJoueurs);
  // La façon de jouer une manche décide de plusieurs valeurs de départ : elle
  // se lit avant tout le reste.
  const mode = modeManche(opts);
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
    // des deux moyens de prendre une manche, avec l'Abri. Réglable dans les
    // deux modes.
    // Immédiat et Compromis : le contact emporte la manche, c'est la base des
    // deux modes. Avec les jetons, il en retourne un.
    attrapeGagneManche: mode === 'jeton' ? 'non' : 'touche',
    // Qui prend les dés à la première manche : les Jaunes (la règle), les Bleus,
    // ou le Vert seul. Le Vert accompagne l'équipe désignée dans les deux
    // premiers cas, comme au jeu.
    equipeDepart: EQUIPES_DEPART.includes(opts.equipeDepart) ? opts.equipeDepart : 'jaune',
    combos: COMBOS_TORNADE
      .filter((c) => !c.optionnelle || opts[c.optionnelle] !== false)
      .map((c) => ({ ...c, requis: { ...c.requis } })),
    // Chaque mode a son paquet, et ce sont deux paquets différents : les cartes
    // Journée d'un côté, les Tornades de l'autre. Rien de commun entre les deux.
    cartes: CARTES_TORNADE.map((c) => c.id),
    cartesSansPoints: CARTES_SANS_POINTS.map((c) => c.id),
    combosCartesSansPoints: {},
    // Compromis joue les mêmes Tornades qu'Immédiat, mais son paquet, ses
    // exigences et le nombre de jetons demandés par carte se règlent à part.
    cartesCompromis: CARTES_SANS_POINTS.map((c) => c.id),
    combosCartesCompromis: {},
    refugeCartes: {},
    // Le Vert joue seul contre deux équipes : on peut lui demander autre chose.
    // Décochée, la table est strictement symétrique — c'est la référence.
    combosAsymetriques: false,
    combosVert: {},
    lots: mep.lots,
    jetons: mep.jetons,
    jetonsVert: mep.jetonsVert,
    // Les manches sont bien plus courtes hors de la règle de base : il faut
    // donc davantage de cartes pour faire une partie. Cinq en Compromis, où
    // chaque manche demande de un à trois Abris.
    cartesPourGagner: mode === 'immediat' ? 4 : mode === 'compromis' ? 5 : mep.cartes,
    // La façon de jouer une manche. `sansPoints` reste écrit à côté pour les
    // réglages et les parties enregistrés avant la v1.50 ; c'est `modeManche`
    // qui fait foi, et `modeManche(cfg)` sait lire l'un comme l'autre.
    modeManche: mode,
    sansPoints: mode === 'immediat',
    // Comment se décide le sens d'une manche. `null` = ce que le mode fait
    // naturellement : la règle de base alterne, les deux autres lisent le dos
    // de la prochaine Tornade.
    sensRotation: OPTIONS_SENS.some(([id]) => id === opts.sensRotation)
      ? opts.sensRotation
      : (mode === 'jeton' ? 'alterne' : 'carte'),
    // Compromis : les jetons de sa couleur qu'une équipe peut mettre à l'Abri.
    jetonsRefuge: 3,
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
  // Hors bornes, on rend la ligne la plus proche plutôt qu'une ligne au hasard :
  // une table de neuf enregistrée d'avant la v1.49 se lit comme une table de huit.
  return MISE_EN_PLACE[bornerJoueurs(nbJoueurs)] || MISE_EN_PLACE[6];
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
