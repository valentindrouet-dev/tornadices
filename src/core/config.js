// Toute la matière réglable du jeu : symboles, dés, combinaisons, cartes Tornade,
// tableau de mise en place et profils de joueurs. Le moteur ne connaît rien d'autre.

export const SYMBOLES = {
  tornade: { id: 'tornade', nom: 'Tornade', couleur: '#a8dcf2', desc: 'Réveille votre Tornade' },
  vache: { id: 'vache', nom: 'Vache', couleur: '#82dc0a', desc: 'Met un jeton de votre équipe à couvert' },
  zzz: { id: 'zzz', nom: 'ZzZ', couleur: '#c28ef2', desc: 'Endort un de vos voisins' },
  x: { id: 'x', nom: 'X', couleur: '#e2000f', desc: 'Dé bloqué — il ne se relance jamais' },
  vide: { id: 'vide', nom: 'Vide', couleur: '#e6edf4', desc: 'Face neutre' },
};

export const ORDRE_SYMBOLES = ['tornade', 'vache', 'zzz', 'x', 'vide'];

/** Une exigence sans aucun dé requis ne vaut rien : elle serait toujours servie. */
export function exigenceVide(requis) {
  return !Object.values(requis || {}).some((n) => n > 0);
}

/**
 * La combinaison `requis` est-elle servie par le compte de dés `compte` ?
 *
 * Chaque face compte pour elle-même : il faut autant de dés de chaque symbole
 * que la combinaison en demande.
 */
export function comboServie(compte, requis) {
  for (const [sym, n] of Object.entries(requis || {})) {
    if (n > 0 && (compte[sym] || 0) < n) return false;
  }
  return true;
}

// Symbole qui fige le dé : une fois sorti, il ne peut plus être relancé.
export const SYMBOLE_BLOQUANT = 'x';

// Couleur d'alerte affichée autour de la zone d'un joueur quand la combinaison
// apparaît sur ses dés.
// Chaque combinaison a sa couleur, et c'est celle de sa face : l'or du soleil
// pour le réveil, la nuit de la lune pour l'endormissement, le vert de la grange
// pour l'abri. On les retrouve à l'identique au halo du joueur, dans le bandeau
// d'annonce et dans le journal — un même événement, une même couleur.
export const ALERTES = {
  blocage: 'rouge',
  reveil: 'or',
  vache: 'vert',
  endormir: 'nuit',
};

// La combinaison qui porte l'attrape : l'Échec, toujours. Le lot part, et si le
// joueur suivant tient un lot, on tente de l'attraper au passage. Ce sont bien
// les dés de l'Échec qui décident — deux X, ou ce qu'on a réglé au tableau.
export const COMBO_ATTRAPE = 'blocage';

/** Identifiant de la combinaison qui tente le contact. */
export function comboDeclencheur() {
  return COMBO_ATTRAPE;
}

// Trois façons de jouer une manche.
//
// « jeton » — la règle de base : chaque équipe met ses jetons Abri à couvert un
// à un, et la manche revient à celle qui les a tous sauvés. Où ils se trouvent
// en attendant — sur la carte Tornade, ou devant leur équipe — est un réglage à
// part : voyez « Où sont les jetons », plus bas.
//
// « immediat » — on ne compte plus rien : il faut se réveiller puis sortir la
// combinaison Abri, et le premier qui y arrive arrête la manche sur-le-champ.
// Son équipe prend la carte Tornade, et l'on recommence. Une attrape réussie
// emporte la manche de la même façon — sans jeton à prendre, elle n'aurait plus
// rien à rapporter. C'est le nombre de cartes qui fait la partie.
//
// « compromis » — entre les deux. Chaque équipe a ses jetons, et la carte
// Tornade en cours dit combien il faut en mettre à l'Abri pour prendre la
// manche : de un à trois, carte par carte. Le dernier l'emporte aussitôt — vos
// animaux sont à couvert. Une collision réussie l'emporte également : vous
// envoyez valser un adversaire dans la tornade.
export const MODES_MANCHE = ['jeton', 'immediat', 'compromis'];

export const OPTIONS_MANCHE = [
  ['jeton', 'Jeton'],
  ['immediat', 'Immédiat'],
  ['compromis', 'Compromis'],
];

/** Le nom d'un mode, pour l'écrire dans une phrase. */
export const NOM_MODE = Object.fromEntries(OPTIONS_MANCHE);

export const AIDE_MANCHE = {
  jeton: 'Règle de base : chaque Abri met un jeton de votre équipe à couvert, et la manche '
    + 'revient à la première équipe qui a sauvé tous les siens. Le compteur de jetons est en jeu.',
  immediat: 'Immédiat : on se réveille aux tornades, puis on cherche l’Abri. Le '
    + 'premier joueur qui le sort arrête la manche sur-le-champ — son équipe prend la carte '
    + 'Tornade, et la manche suivante commence. Une attrape réussie emporte la manche de la '
    + 'même façon. Plus aucun jeton n’est compté ; c’est le nombre de cartes qui fait le '
    + 'vainqueur, quatre en général.',
  compromis: 'Compromis : chaque équipe a trois jetons de sa couleur, et la carte Tornade en '
    + 'cours dit combien il faut en mettre à l’Abri pour prendre la manche — de un à trois, '
    + 'réglable carte par carte. Chaque combinaison Abri en sauve un ; le dernier emporte la '
    + 'manche sur-le-champ. Une collision réussie l’emporte aussi : le jeton de l’adversaire '
    + 'part dans la tornade, et la manche est à vous. Cinq cartes pour gagner.',
};

// ── Où sont les jetons ───────────────────────────────────────────────────────
//
// Les jetons en jeu sont posés sur la carte Tornade elle-même : ce sont les
// animaux pris dedans. Chaque combinaison Abri en sort un, et l'équipe qui a
// sorti tous les siens emporte la manche — ils sont tous à couvert.
//
// Le compte ne change pas — autant d'Abris qu'il y a de jetons en jeu — mais le
// geste s'inverse : on vide la tornade au lieu de remplir son camp, et les trois
// équipes se lisent sur une même carte. L'ancienne place, devant chaque équipe,
// reste réglable : c'est à elle qu'on compare.
//
// « Immédiat » ne compte aucun jeton, le premier Abri prenant la manche : le
// réglage n'y change rien.
export const OPTIONS_PLACE_JETONS = [
  ['tornade', 'Sur la carte Tornade'],
  ['equipe', 'Devant chaque équipe'],
];

export const NOM_PLACE_JETONS = Object.fromEntries(OPTIONS_PLACE_JETONS);

export const AIDE_PLACE_JETONS = {
  tornade: 'Les jetons en jeu sont posés sur la carte Tornade : ce sont vos animaux pris dans la '
    + 'tornade. Chaque combinaison Abri en sort un de la carte, et l’équipe qui a sorti tous les '
    + 'siens emporte la manche — ils sont tous à couvert.',
  equipe: 'L’ancienne place : chaque équipe garde ses jetons devant elle, face cachée, et l’Abri '
    + 'les retourne un à un. La manche revient à la première équipe qui a retourné tous les '
    + 'siens. Le compte est le même ; la carte Tornade, elle, reste nue.',
};

/** Vrai si les jetons en jeu sont posés sur la carte Tornade — la règle du jeu. */
export function jetonsSurTornade(cfg) {
  return (cfg && cfg.placeJetons) !== 'equipe';
}

// ── Ce qu'on fait d'une combinaison servie ───────────────────────────────────
//
// La règle de base ne laisse pas le choix : dès qu'une combinaison sort, elle
// est jouée et le lot part. La variante rend la main au joueur — il peut
// relancer par-dessus et viser autre chose.
//
// Trois combinaisons échappent toujours au choix, quelle que soit l'option :
// l'Échec, parce que les dés sont figés et que le lot part de toute façon ;
// l'Abri, parce que c'est lui qui emporte la manche ; et le Réveil — un
// dormeur qui sort ses soleils se réveille, dans toutes les circonstances. La
// combinaison de la Tornade du jour non plus : elle vaut mieux que tout ce qu'on
// lui préférerait.
export const OPTIONS_COMBO_SERVIE = [
  ['auto', 'Elle s’applique d’office'],
  ['choix', 'On peut relancer par-dessus'],
];

export const AIDE_COMBO_SERVIE = {
  auto: 'Règle de base : une combinaison servie est jouée sur-le-champ. L’effet s’applique, puis '
    + 'le lot part vers le voisin — on ne relance jamais par-dessus.',
  choix: 'Vous gardez la main : une combinaison qui sort peut être laissée de côté pour relancer '
    + 'et viser autre chose. Trois exceptions, qui s’appliquent toujours — l’Échec, parce que les '
    + 'dés sont figés, l’Abri, parce qu’il emporte la manche, et le Réveil : un dormeur qui le '
    + 'sort se réveille. La combinaison de la Tornade du jour non plus ne se refuse pas.',
};

/** Vrai si toute combinaison servie s'applique d'office — la règle de base. */
export function comboAutomatique(cfg) {
  return (cfg && cfg.comboServie) !== 'choix';
}

/** Les combinaisons qu'on ne peut jamais refuser, même avec le choix ouvert. */
export function comboIneluctable(dispo) {
  if (!dispo) return false;
  // Un échec n'est pas un coup qu'on joue : les dés sont figés, le lot part.
  if (dispo.combo && dispo.combo.echec) return true;
  if (dispo.id === 'blocage') return true;
  // L'Abri emporte la manche, la Tornade du jour vaut mieux que le reste.
  if (dispo.id === 'vache') return true;
  // Le Réveil s'applique d'office : un dormeur qui sort ses soleils se réveille,
  // quoi qu'il ait voulu viser et quel que soit le réglage.
  if (dispo.id === 'reveil') return true;
  return dispo.source === 'journee';
}

/** Peut-on relancer par-dessus cette combinaison-là ? */
export function comboRefusable(cfg, dispo) {
  return !comboAutomatique(cfg) && !comboIneluctable(dispo);
}

// ── Le sens de rotation ──────────────────────────────────────────────────────
// Trois façons de décider dans quel sens tourne une manche.
export const OPTIONS_SENS = [
  ['perdants', 'Carte de sens — les perdants décident'],
  ['alterne', 'Une manche sur l’autre'],
];

export const NOM_SENS = Object.fromEntries(OPTIONS_SENS);

export const AIDE_SENS = {
  perdants: 'La carte rotation, posée sur la table, indique le sens. À la fin d’une manche, '
    + 'l’équipe perdante — celle qui reçoit les dés — peut la retourner pour inverser le sens, ou '
    + 'la laisser en place. C’est un choix, pas une obligation : celui qui subit décide de la '
    + 'façon dont il repart.',
  alterne: 'Sans carte rotation : le sens s’inverse à chaque manche, sans que personne n’ait à en '
    + 'décider. Une manche dans un sens, la suivante dans l’autre.',
};

/**
 * Comment se décide le sens d'une manche.
 *
 * C'est la carte rotation qui le porte : les Tornades n'ont plus de flèche à
 * leur dos. Un réglage qui demandait encore de la lire — « carte », jusqu'à la
 * v1.64 — retombe donc sur elle.
 */
export function sensRotation(cfg) {
  const s = cfg && cfg.sensRotation;
  if (OPTIONS_SENS.some(([id]) => id === s)) return s;
  return 'perdants';
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
  non: 'Règle de base : un contact réussi interrompt le voisin et met un jeton de votre équipe à '
    + 'couvert, comme un Abri.',
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
 * L'équipe telle qu'elle se présente à la table : les Bleus et leurs Vaches, les
 * Jaunes et leurs Poules, le Vert et son Cow-Boy — à trois joueurs comme à huit.
 */
export function equipeVue(equipeId) {
  return COULEURS_EQUIPE[equipeId] || null;
}

/**
 * Le nom d'une équipe dans une phrase, et l'accord qui va avec.
 *
 * Les Bleus et les Jaunes sont plusieurs : « les Bleus remportent ». Le Vert
 * joue seul : « le Vert remporte ». `v('remporte', 'remportent')` choisit la
 * bonne forme.
 */
export function nomDansPhrase(equipeId) {
  const e = equipeVue(equipeId) || { nom: String(equipeId) };
  const seul = equipeId === 'vert';
  const nom = e.nom;
  return {
    nom,
    seul,
    le: `${seul ? 'le' : 'les'} ${nom}`,
    Le: `${seul ? 'Le' : 'Les'} ${nom}`,
    de: `${seul ? 'du' : 'des'} ${nom}`,
    a: `${seul ? 'au' : 'aux'} ${nom}`,
    v: (singulier, pluriel) => (seul ? singulier : pluriel),
  };
}

/**
 * L'exigence d'une combinaison pour une équipe donnée.
 *
 * Le Vert joue seul contre deux équipes : on peut lui demander autre chose —
 * plus, moins, ou d'autres faces — sans toucher aux Bleus ni aux Jaunes. Sans
 * cette asymétrie, la table est strictement symétrique, ce qui reste la
 * référence.
 */
export function requisPourEquipe(cfg, comboId, requisBase, equipe) {
  if (equipe !== 'vert' || !cfg.combosAsymetriques) return requisBase;
  const propre = cfg.combosVert && cfg.combosVert[comboId];
  return propre && Object.keys(propre).length ? propre : requisBase;
}

/**
 * Une combinaison ne peut sortir que si le dé porte les faces qu'elle demande :
 * une ligne qui réclame une face absente du dé est une ligne morte, et la table
 * ne l'annonce pas.
 */
export function comboPossible(faces, requis) {
  if (!requis || !Object.keys(requis).length) return false;
  const dispo = new Set(faces || []);
  return Object.keys(requis).every((sym) => dispo.has(sym));
}

// ── Le paquet de cartes Tornade, et ce qu'on en règle ────────────────────────
// Un seul paquet pour les trois façons de jouer, et une seule table des
// combinaisons de cartes : une carte n'a pas de variante d'un mode à l'autre.
// Seul le nombre de jetons qu'elle retient en Compromis — `refugeCartes` — ne
// vaut que dans ce mode-là.

/** La clé de réglage du paquet. */
export function clePaquet() {
  return 'cartesTornade';
}

/** La clé de réglage des combinaisons de cartes. */
export function cleCombosCartes() {
  return 'combosCartesTornade';
}

// Jusqu'à la v1.72, chaque mode avait son paquet, sous sa clé. Un réglage
// enregistré d'alors garde ses choix : celui d'Immédiat d'abord — le paquet des
// cartons imprimés — puis celui de Compromis. Celui du mode Jeton, fait de
// cartes « Journée » qui n'existent plus, ne dit rien du paquet d'aujourd'hui.
const PAQUETS_ANCIENS = [
  ['cartesSansPoints', 'combosCartesSansPoints'],
  ['cartesCompromis', 'combosCartesCompromis'],
];

/**
 * Un réglage enregistré, avec son paquet sous la clé d'aujourd'hui. Rend une
 * copie ; un réglage qui l'a déjà — ou qui n'a jamais touché au paquet — revient
 * tel quel.
 */
export function migrerPaquet(reglages) {
  if (!reglages || typeof reglages !== 'object') return reglages;
  const sortie = { ...reglages };
  if (!Array.isArray(sortie.cartesTornade)) {
    const source = PAQUETS_ANCIENS.find(([cle]) => Array.isArray(reglages[cle]));
    if (source) {
      sortie.cartesTornade = reglages[source[0]].slice();
      if (Array.isArray(reglages[`${source[0]}Vues`])) {
        sortie.cartesTornadeVues = reglages[`${source[0]}Vues`].slice();
      }
    }
  }
  if (!sortie.combosCartesTornade || typeof sortie.combosCartesTornade !== 'object') {
    const source = PAQUETS_ANCIENS.find(([, cle]) => reglages[cle] && typeof reglages[cle] === 'object');
    if (source) sortie.combosCartesTornade = { ...reglages[source[1]] };
  }
  return sortie;
}

/**
 * La clé qui retient ce que le paquet enregistré avait sous les yeux.
 *
 * Décocher une carte est un choix ; ne pas cocher une carte qui n'existait pas
 * n'en est pas un. Sans mémoire de ce qui était proposé au moment où l'on a
 * composé le paquet, les deux se ressemblent — et une carte ajoutée au jeu
 * manquerait sans bruit à qui a touché ses cases une fois.
 */
export const cleVues = (cfg) => `${clePaquet(cfg)}Vues`;

/** Les cartes cochées dans le paquet. */
export function cartesEnJeu(cfg) {
  const paquet = cartesDuJeu().map((c) => c.id);
  const connues = new Set(paquet);
  const liste = cfg[clePaquet(cfg)];
  // Un paquet enregistré peut porter des cartes qui n'existent plus — les
  // « Journée » du mode Jeton, retirées en v1.73 : elles ne comptent pas.
  const retenues = Array.isArray(liste) ? liste.filter((id) => connues.has(id)) : [];
  // Un paquet vide n'existe pas : sans choix enregistré, le jeu est complet.
  if (!retenues.length) return paquet;
  const gardees = new Set(retenues);

  const vues = cfg[cleVues(cfg)];
  if (Array.isArray(vues) && vues.length) {
    const avaitVu = new Set(vues);
    return paquet.filter((id) => gardees.has(id) || !avaitVu.has(id));
  }

  // Pas de trace — un paquet composé avant la v1.57. On le date alors par la
  // plus récente des cartes qu'il retient : un paquet qui contient une carte
  // arrivée en v1.55 a forcément été composé après, et ce qu'il ne retient pas
  // a bien été décoché. Seules les cartes plus récentes que cette date le
  // rejoignent — le reste de ses choix tient.
  let vuJusqua = '0';
  for (const id of retenues) {
    const c = CARTES_PAR_ID[id];
    if (c && apresVersion(c.depuis, vuJusqua)) vuJusqua = c.depuis;
  }
  return paquet.filter((id) => gardees.has(id)
    || apresVersion((CARTES_PAR_ID[id] || {}).depuis, vuJusqua));
}

/** `a` est-elle une version postérieure à `b` ? « 1.55 » > « 1.9 ». */
function apresVersion(a, b) {
  if (!a) return false;
  const x = String(a).split('.').map((n) => Number(n) || 0);
  const y = String(b || '0').split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d > 0;
  }
  return false;
}

/** L'exigence d'une combinaison de carte, telle que réglée. */
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
 * Ce qu'il faut savoir d'une carte à cette table, s'il y a quelque chose à en
 * dire : qu'elle ne va pas dans la pioche faute de l'animal qu'elle désigne, ou
 * que sa combinaison demande plus de dés qu'un lot n'en compte — la Méga
 * Tornade et ses cinq symboles, sur des lots de quatre.
 */
export function noteCarte(carte, cfg) {
  if (!carteALaTable(carte, cfg)) {
    if (carte.animal === 'cowboy') {
      return 'Pas de joueur Vert à ce nombre de joueurs : cette carte n’est pas mise dans la pioche.';
    }
    return 'Cette carte n’est pas mise dans la pioche à ce nombre de joueurs.';
  }
  const requis = carte.combo ? requisCarte(cfg, carte.combo) : null;
  const des = requis ? Object.values(requis).reduce((t, n) => t + (n > 0 ? n : 0), 0) : 0;
  const lot = (cfg && cfg.desParLot) || 4;
  if (des > lot) {
    return `Sa combinaison demande ${des} dés : avec des lots de ${lot}, elle ne peut pas sortir.`;
  }
  return '';
}

// ── Dés ───────────────────────────────────────────────────────────────────────
// Le dé officiel : 2 tornades, 1 X, 1 abri, 2 ZzZ.
// Modifiable face par face dans les réglages de partie et dans le Laboratoire.
export const FACES_PAR_DEFAUT = ['tornade', 'tornade', 'x', 'vache', 'zzz', 'zzz'];

/** Le dé de TornaDice a six faces, et ce n'est pas un réglage. */
export const NB_FACES_DE = FACES_PAR_DEFAUT.length;


// Les faces ont été renommées en v1.3 : la « cloche » est devenue la tornade, et
// l'« étoile » — la face jamais relançable qui déclenchait la collision — est
// devenue le X. Un réglage enregistré avant ce renommage porte encore les
// anciens noms, et rien ne les traduisait : le dé gardait des faces que ni
// l'affichage ni le moteur ne reconnaissaient, muettes et sans effet.
export const SYMBOLES_ANCIENS = { cloche: 'tornade', etoile: 'x' };

// Les jokers ont quitté le jeu en v1.70, l'éclair en v1.84. Une face qui en
// portait un ne devient pas « vide » — le dé y perdrait une face utile : elle
// reprend la face officielle de sa place. Une exigence qui en demandait les oublie.
export const SYMBOLES_RETIRES = ['joker', 'jokerDouble', 'eclair'];

/** Traduit une face enregistrée ; « vide » pour un symbole devenu inconnu. */
export function assainirSymbole(id) {
  if (SYMBOLES[id]) return id;
  return SYMBOLES_ANCIENS[id] || 'vide';
}

/**
 * Traduit une liste de faces enregistrée, et la ramène au dé du jeu.
 *
 * Le dé de TornaDice a six faces, et ce n'est plus un réglage : un dé à huit ou
 * dix faces enregistré du temps où on pouvait en changer reviendrait sinon sans
 * aucun moyen d'en sortir, puisque rien ne permet plus d'en retirer. Les faces
 * en trop tombent, celles qui manquent reprennent la répartition officielle.
 */
export function assainirFaces(faces) {
  if (!Array.isArray(faces) || !faces.length) return FACES_PAR_DEFAUT.slice();
  const propres = faces.map((f) => (SYMBOLES_RETIRES.includes(f) ? null : assainirSymbole(f)));
  return Array.from({ length: NB_FACES_DE },
    (_, i) => propres[i] || FACES_PAR_DEFAUT[i % FACES_PAR_DEFAUT.length]);
}

/** Traduit les clés d'une exigence { cloche: 3 } → { tornade: 3 }. */
export function assainirRequis(requis) {
  if (!requis || typeof requis !== 'object') return {};
  const sortie = {};
  for (const [sym, n] of Object.entries(requis)) {
    if (!n || SYMBOLES_RETIRES.includes(sym)) continue;
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
export function assainirConfig(brut) {
  const base = configParDefaut(brut && brut.nbJoueurs ? brut.nbJoueurs : 6, brut || {});
  if (!brut || typeof brut !== 'object') return base;
  // Le paquet d'avant la v1.73, rangé sous la clé d'un mode, passe sous la clé
  // d'aujourd'hui avant tout le reste.
  const cfg = migrerPaquet(brut);

  const sortie = { ...base, ...cfg };
  // Le jeu se joue de trois à huit : une configuration enregistrée à neuf
  // joueurs date d'avant la v1.49 et doit revenir dans les bornes.
  sortie.nbJoueurs = bornerJoueurs(sortie.nbJoueurs);
  sortie.faces = assainirFaces(cfg.faces);
  // « Manche gagnée dès la combinaison » n'existe pas dans le jeu : un réglage
  // qui la porte encore retombe sur la variante voisine, celle où il faut
  // toucher pour emporter la manche.
  if (cfg.attrapeGagneManche === 'combo') sortie.attrapeGagneManche = 'touche';
  // Le déclencheur de l'attrape n'est plus un réglage depuis la v1.84 : c'est
  // toujours l'Échec. Et la variante des Cochons à trois joueurs a quitté le jeu
  // en v1.87 : à trois, on joue une Vache, une Poule et le Cow-Boy.
  delete sortie.attrapeSur;
  delete sortie.cochons;
  delete sortie.combosCochon;
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
  sortie.comboServie = comboAutomatique(sortie) ? 'auto' : 'choix';
  // Où sont les jetons en jeu : sur la carte Tornade — la règle du jeu, et ce
  // que lit un réglage enregistré avant la v1.68 — ou devant chaque équipe.
  sortie.placeJetons = jetonsSurTornade(sortie) ? 'tornade' : 'equipe';
  // Compromis : de un à trois jetons demandés, jamais zéro ni davantage.
  sortie.jetonsRefuge = Math.min(6, Math.max(1, Math.round(Number(cfg.jetonsRefuge) || 3)));
  if (cfg.refugeCartes && typeof cfg.refugeCartes === 'object') {
    sortie.refugeCartes = Object.fromEntries(Object.entries(cfg.refugeCartes)
      .map(([id, n]) => [id, Math.min(sortie.jetonsRefuge, Math.max(1, Math.round(Number(n) || 1)))]));
  }
  // On repart de la liste de référence et l'on y pose les seuils enregistrés :
  // une combinaison apparue depuis — ou disparue d'une configuration ancienne,
  // d'une configuration ancienne — revient au lieu de manquer sans bruit ; une
  // combinaison retirée du jeu, comme l'Attaque aux éclairs, n'y revient pas.
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
  // Les tables d'exigences enregistrées — cartes, Vert — passent par la même
  // retraduction que les combinaisons de la Tornade.
  for (const cle of ['combosCartesTornade', 'combosVert']) {
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
    id: 'blocage',
    nom: 'Échec',
    libelle: 'Deux dés figés : le lot part, et l’on tente d’attraper le joueur suivant',
    requis: { x: 2 },
    face: 'toutes',
    obligatoire: true,
    echec: true,
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
// Un seul paquet, pour les trois façons de jouer une manche. Il n'y a pas de
// variantes : une carte a un titre, un texte et un pouvoir, les mêmes avec les
// jetons, en Immédiat ou en Compromis. Titres et textes sont ceux des cartons
// imprimés — ce que la table affiche doit se lire à l'identique de ce qu'on a
// dans la main.
//
// `combo` : combinaison supplémentaire ouverte pour la manche.
// `effetPassif` : modificateur appliqué à tous les joueurs pendant la manche.
//   · `doubleSi` — l'équipe désignée gagne deux cartes si elle prend la manche ;
//   · `doubleTous` — la manche vaut deux cartes, pour qui la prend ;
//   · `volerCarte` — le vainqueur prend une carte à une autre équipe.
// `animal` : la carte désigne un animal — vaches, poules, cow-boy — et ne va
// dans la pioche que s'il est à la table : le Cow-Boy, avec le joueur Vert.
// `refuge` : en Compromis, combien de jetons de sa couleur la Tornade retient.
// De un à trois, réglable carte par carte dans les Réglages. Sans effet dans les
// deux autres modes.
export const CARTES_TORNADE = [
  {
    id: 'spChauffe',
    refuge: 1,
    court: 'Tornade de Chauffe',
    nom: 'Tornade de Chauffe',
    texte: 'Cette tornade ne rapporte pas de Carte Tornade',
    combo: null,
    effetPassif: null,
    // La manche se joue comme les autres, mais la carte est défaussée.
    neCompted: true,
    toujoursPremiere: true,
  },
  {
    id: 'spPaisible',
    refuge: 1,
    court: 'Tornade Paisible',
    nom: 'Tornade Paisible',
    texte: 'Vous ne pouvez relancer les dés que un par un',
    combo: null,
    effetPassif: { unParUn: true },
  },
  {
    id: 'spMaladroite',
    refuge: 1,
    court: 'Tornade Maladroite',
    nom: 'Tornade Maladroite',
    texte: 'Vous lancez les dés de votre autre main',
    combo: null,
    effetPassif: { lenteur: 1.35, erreur: 0.06 },
  },
  {
    id: 'spChargee',
    refuge: 2,
    court: 'Tornade Chargée',
    nom: 'Tornade Chargée',
    texte: 'Vous jouez avec un lot de dés supplémentaire',
    combo: null,
    effetPassif: { lotsEnPlus: 1 },
  },
  {
    id: 'spTricheurs',
    refuge: 2,
    court: 'Tornade des Tricheurs',
    nom: 'Tornade des Tricheurs',
    texte: 'L’équipe gagnante commence la manche suivante avec les lots de dés',
    combo: null,
    effetPassif: { gagnantPrendLesDes: true },
  },
  {
    id: 'spF5',
    refuge: 2,
    court: 'Tornade Chapardeuse',
    nom: 'Tornade Chapardeuse',
    texte: 'L’équipe gagnante vole une Carte Tornade à l’équipe adverse',
    combo: null,
    effetPassif: { volerCarte: true },
  },
  {
    id: 'spCowboy',
    refuge: 2,
    court: 'Tornade de Cow-Boy',
    nom: 'Tornade de Cow-Boy',
    texte: 'Le Cow-Boy gagne 2 Cartes Tornade à cette manche',
    combo: null,
    effetPassif: { doubleSi: 'vert' },
    // Sans joueur Vert, la carte ne désignerait personne : elle sort du paquet.
    animal: 'cowboy',
  },
  {
    id: 'spSiecle',
    refuge: 3,
    court: 'Tornade du Siècle',
    nom: 'Tornade du Siècle',
    texte: 'Vous gagnez 2 Cartes Tornade à cette manche',
    combo: null,
    // Elle vaut double pour qui la remporte, quelle que soit l'équipe.
    effetPassif: { doubleTous: true },
  },
  {
    id: 'spMega',
    refuge: 3,
    court: 'Méga Tornade',
    nom: 'Méga Tornade',
    texte: 'Vous gagnez immédiatement la Manche',
    // Cinq symboles : il faut un lot d'au moins cinq dés pour la réaliser.
    combo: { id: 'spMega', requis: { vache: 5 }, effet: 'gagnerManche' },
    effetPassif: null,
  },
  {
    id: 'spSommeil',
    refuge: 2,
    court: 'Tornade du Sommeil',
    nom: 'Tornade du Sommeil',
    texte: 'Vous endormez vos 2 voisins',
    combo: { id: 'spSommeil', requis: { zzz: 4 }, effet: 'endormirVoisins' },
    effetPassif: null,
  },
  {
    id: 'spFurieuse',
    refuge: 3,
    court: 'Tornade Furieuse',
    nom: 'Tornade Furieuse',
    texte: 'Vous gagnez immédiatement la Manche',
    combo: { id: 'spFurieuse', requis: { x: 3 }, effet: 'gagnerManche' },
    effetPassif: null,
  },
  {
    id: 'spElectrique',
    refuge: 2,
    court: 'Tornade Électrique',
    nom: 'Tornade Électrique',
    texte: 'Vous gagnez 2 Cartes Tornade si vous gagnez la manche en rattrapant',
    combo: null,
    effetPassif: { doubleSiAttrape: true },
  },
  {
    id: 'spVaches',
    refuge: 2,
    court: 'Tornade de Vaches',
    nom: 'Tornade de Vaches',
    texte: 'Les Vaches gagnent 2 Cartes Tornade à cette manche',
    combo: null,
    effetPassif: { doubleSi: 'bleu' },
    animal: 'vache',
  },
  {
    id: 'spPoules',
    refuge: 2,
    court: 'Tornade de Poules',
    nom: 'Tornade de Poules',
    texte: 'Les Poules gagnent 2 Cartes Tornade à cette manche',
    combo: null,
    effetPassif: { doubleSi: 'jaune' },
    animal: 'poule',
  },

];

/**
 * La règle qui vaut pour toutes les cartes Tornade, quel que soit le mode : leur
 * combinaison et leur pouvoir s'obtiennent dans les deux états, Tornade
 * endormie comme réveillée. C'est ce qui les distingue des combinaisons de base,
 * dont la plupart demandent d'être réveillé — la carte du jour, elle, est à la
 * portée de tout le monde du premier lancer au dernier.
 */
export const REGLE_CARTES_DEUX_ETATS = 'La combinaison d’une carte Tornade, et le pouvoir qu’elle '
  + 'donne, valent dans les deux états : on n’a pas besoin d’être réveillé pour la réaliser, ni '
  + 'pour en profiter.';

/** Le paquet du jeu : le même pour les trois façons de jouer une manche. */
export function cartesDuJeu() {
  return CARTES_TORNADE;
}

/** Les cartes Tornade, par identifiant. */
export const CARTES_PAR_ID = Object.fromEntries(CARTES_TORNADE.map((c) => [c.id, c]));

/**
 * La carte va-t-elle dans la pioche, à cette table ? Une carte qui désigne un
 * animal absent ne désignerait personne : la Tornade de Cow-Boy sans joueur
 * Vert. Les Vaches et les Poules sont à toutes les tables.
 */
export function carteALaTable(carte, cfg) {
  if (!carte || !carte.animal) return true;
  if (carte.animal === 'cowboy') return Number(cfg && cfg.nbJoueurs) % 2 === 1;
  return true;
}

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
    // L'attrape passe par l'Échec, qui demande d'être réveillé : endormi, il
    // se réveille ; réveillé, il cherche les X trois lots sur quatre.
    vise: { endormi: { tornade: 1 }, eveille: { x: 3, vache: 1 } },
    lancersAvantPasse: 9, ecartLancers: 3, peur: 0.3,
    reflexe: 690, ecartReflexe: 180, adresse: 0.68, esquive: 0.55, erreur: 0.04,
    desc: 'Cherche l’attrape trois lots sur quatre ; se réveille et court à l’abri le reste du temps.',
  },
  tresAgressif: {
    id: 'tresAgressif', nom: 'Très agressif', court: 'T. agressif',
    vise: { endormi: { tornade: 1 }, eveille: { x: 1 } },
    lancersAvantPasse: 14, ecartLancers: 4, peur: 0.12,
    reflexe: 620, ecartReflexe: 160, adresse: 0.74, esquive: 0.5, erreur: 0.06,
    desc: 'Se réveille, puis ne cherche plus que les X de l’Échec pour attraper.',
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
      endormi: { tornade: 1, vache: 1, zzz: 1, x: 1 },
      eveille: { tornade: 1, vache: 1, zzz: 1, x: 1 },
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
  return {
    nbJoueurs,
    desParLot: 4,
    faces: FACES_PAR_DEFAUT.slice(),
    symboleBloquant: SYMBOLE_BLOQUANT,
    // Un dormeur ne tend pas la main : l'attrape sur échec demande d'être
    // réveillé. Décochable dans les Réglages.
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
    combos: COMBOS_TORNADE.map((c) => ({ ...c, requis: { ...c.requis } })),
    // Un seul paquet pour les trois façons de jouer, et une seule table des
    // combinaisons de cartes. En Compromis, chaque carte dit en plus combien de
    // jetons elle retient.
    cartesTornade: CARTES_TORNADE.map((c) => c.id),
    combosCartesTornade: {},
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
      : 'perdants',
    // Une combinaison servie est jouée d'office : c'est la règle de base.
    comboServie: opts.comboServie === 'choix' ? 'choix' : 'auto',
    // Les jetons en jeu sont posés sur la carte Tornade, et chaque Abri en sort
    // un. L'ancienne place — devant chaque équipe, face cachée — reste réglable.
    placeJetons: opts.placeJetons === 'equipe' ? 'equipe' : 'tornade',
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
    dureeTransition: 2600,     // entre deux manches : les dés reviennent au centre
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
 * qui sont sur les dés, et ceux qu'une combinaison réclame.
 */
export function symbolesPertinents(cfg) {
  const vus = new Set((cfg.faces || []).filter((s) => s && s !== 'vide'));
  const ajouter = (requis) => {
    for (const [s, n] of Object.entries(requis || {})) if (n > 0) vus.add(s);
  };
  for (const c of cfg.combos || []) ajouter(c.requis);
  for (const carte of CARTES_TORNADE) {
    if (carte.combo) ajouter(requisCarte(cfg, carte.combo));
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
