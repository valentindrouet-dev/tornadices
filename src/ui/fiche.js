// La fiche de règles : les règles de VOTRE partie, prêtes à imprimer.
//
// La page Règles décrit le jeu en général. Celle-ci décrit la partie réglée —
// le dé que vous avez composé, vos combinaisons, vos cartes, votre mise en
// place — et rien d'autre. Elle est faite pour être posée sur une vraie table :
// tout ce qui touche aux IA, au rythme simulé, à l'adresse ou à la graine en est
// donc absent, ces réglages n'existant que pour la table virtuelle.
//
// Aucune bibliothèque n'est chargée pour fabriquer un PDF : le site est statique
// et le reste. On compose un document propre, on cache le reste de l'écran à
// l'impression, et le navigateur écrit le PDF lui-même — « Enregistrer au format
// PDF » dans sa boîte d'impression. C'est le seul chemin sans dépendance, et
// c'est aussi celui qui donne le meilleur résultat.

import { h, remplacer } from './dom.js?v=1.64';
import { store } from './store.js?v=1.64';
import { aller } from './app.js?v=1.64';
import { pastilleSymbole, suiteSymboles, emblemeEquipe } from './icons.js?v=1.64';
import { nomSymbole } from './apparence.js?v=1.64';
import { construireConfig } from './variables.js?v=1.64';
import { nomActif } from './profils.js?v=1.64';
import { VERSION } from '../version.js?v=1.64';
import {
  COULEURS_EQUIPE, NOM_MODE, modeManche, estJeton, estCompromis, estImmediat,
  cartesEnJeu, cartesDuMode, requisCarte, comboPossible, refugePour,
  comboDeclencheur, attrapeEmporteManche, bornerJoueurs, placement,
  infosMiseEnPlace, NOMBRES_JOUEURS, requisPourEquipe, sensRotation,
} from '../core/config.js?v=1.64';

/** Les dés d'une exigence, en ligne et sans retour à la ligne possible. */
const desRequis = (requis, taille = 21) =>
  h('span.fiche-des', suiteSymboles(requis, taille));

/** Vrai s'il y a un joueur Vert à cette table : il n'existe qu'à nombre impair. */
const avecVert = (nb) => nb % 2 === 1;

/** Une section de la fiche : un titre, puis ce qu'il y a à dire. */
const section = (titre, ...contenu) => h('section.fiche-bloc',
  h('h2.fiche-titre', titre), ...contenu.filter(Boolean));

/** Une ligne « libellé — valeur » du tableau de mise en place. */
const ligne = (libelle, valeur) => h('tr', h('td', libelle), h('td.num', valeur));

/**
 * Un tableau de la fiche, dans un cadre qui défile.
 *
 * La feuille est faite pour du papier : ses tableaux ont le nombre de colonnes
 * qu'il faut, pas celui qui tiendrait sur un téléphone. Plutôt que de les
 * réduire — on ne lit plus rien — on les laisse défiler à l'horizontale à
 * l'écran. À l'impression, le cadre s'efface et le tableau reprend sa place.
 */
const tableau = (...enfants) => h('div.fiche-defile', h(...enfants));

export function vueFiche() {
  const racine = h('div.page');
  const nb = bornerJoueurs(store.get('nbJoueurs', 6));
  const cfg = construireConfig(nb);
  const mode = modeManche(cfg);
  // La fiche vaut pour toutes les tables, pas seulement celle de ce soir : on
  // construit la configuration de chaque effectif, de trois à huit.
  const parEffectif = Object.fromEntries(NOMBRES_JOUEURS.map((n) => [n, construireConfig(n)]));

  remplacer(racine,
    // Les commandes : elles ne s'impriment pas.
    h('div.rangee.fiche-commandes', { style: { margin: '6px 0 18px' } },
      h('h1', 'Fiche de règles'),
      h('div.pousse'),
      h('button.btn.btn--primaire', { onclick: () => window.print() },
        'Imprimer / Enregistrer en PDF'),
      h('button.btn', { onclick: () => aller('/reglages') }, '← Réglages'),
    ),
    h('p.petit.muted.fiche-commandes',
      'Les règles de la partie telle qu’elle est réglée — le dé, les combinaisons, les cartes, '
      + 'la mise en place. Rien de ce qui concerne les IA ni la table virtuelle n’y figure : '
      + 'cette feuille est faite pour une vraie table. Dans la boîte d’impression, choisissez '
      + '« Enregistrer au format PDF ».'),

    h('article.fiche',
      enTete(cfg, mode),
      miseEnPlace(cfg, nb, parEffectif),
      leDe(cfg),
      lesCombinaisons(cfg),
      leTour(cfg),
      gagnerLaManche(cfg, mode),
      lAttrape(cfg, mode),
      leJoueurVert(cfg, parEffectif),
      lesCartes(cfg, mode),
      finDePartie(cfg, mode, parEffectif),
      h('p.fiche-pied',
        `TornaDice — jeu de Sylvain Bonnafous, édité par Big Budi Games. `
        + `Fiche produite par la table virtuelle, version ${VERSION}, `
        + `réglage « ${nomActif()} ».`),
    ),
  );
  return racine;
}

function enTete(cfg, mode) {
  return h('header.fiche-entete',
    h('h1.fiche-jeu', 'TORNADICE'),
    h('p.fiche-sous',
      `Règles de la partie · de 3 à 8 joueurs · façon de jouer une manche : ${NOM_MODE[mode]}`),
  );
}

/**
 * La mise en place, de trois à huit joueurs.
 *
 * La fiche ne décrit pas une table mais le jeu réglé : on la sort une fois, et
 * elle doit servir quel que soit le nombre de joueurs du soir. Chaque ligne est
 * construite avec la configuration de son effectif — les lots viennent du
 * tableau réglé, les jetons et les cartes de la mise en place.
 */
function miseEnPlace(cfg, nb, parEffectif) {
  const depart = COULEURS_EQUIPE[cfg.equipeDepart] || COULEURS_EQUIPE.jaune;
  return section('Mise en place',
    tableau('table.tbl.fiche-tbl.fiche-tbl--mep',
      h('thead', h('tr',
        h('th.num', 'Joueurs'),
        h('th', 'Équipes'),
        h('th.num', 'Lots'),
        h('th.num', 'Dés par lot'),
        estJeton(cfg) ? h('th.num', 'Jetons par équipe') : null,
        estJeton(cfg) ? h('th.num', 'Jetons du Vert') : null,
        estCompromis(cfg) ? h('th.num', 'Jetons de sa couleur') : null,
        h('th.num', 'Cartes pour gagner'))),
      h('tbody', ...NOMBRES_JOUEURS.map((n) => {
        const c = parEffectif[n];
        const vert = avecVert(n);
        const parEquipe = Math.floor((n - (vert ? 1 : 0)) / 2);
        return h('tr', { class: n === nb ? 'fiche-ligne-courante' : '' },
          h('td.num', h('strong', String(n))),
          h('td.petit', vert
            ? `${parEquipe} + ${parEquipe} + le Vert`
            : `${parEquipe} + ${parEquipe}`),
          h('td.num', c.lots),
          h('td.num', c.desParLot),
          estJeton(cfg) ? h('td.num', c.jetons) : null,
          estJeton(cfg) ? h('td.num', vert ? c.jetonsVert : '—') : null,
          estCompromis(cfg) ? h('td.num', c.jetonsRefuge) : null,
          h('td.num', vert && c.cartesVert && c.cartesVert !== c.cartesPourGagner
            ? `${c.cartesPourGagner} · Vert ${c.cartesVert}`
            : c.cartesPourGagner));
      }))),
    h('p.fiche-note',
      `Les Bleus sont les ${COULEURS_EQUIPE.bleu.emblemeNom}, les Jaunes les `
      + `${COULEURS_EQUIPE.jaune.emblemeNom}. À nombre impair, un joueur reste seul : `
      + `le ${COULEURS_EQUIPE.vert.emblemeUn}, en vert, qui forme une équipe à lui tout seul.`),
    h('p.fiche-note',
      `${depart.nom} prennent les lots à la première manche`
      + (cfg.equipeDepart === 'vert' ? '.' : ', et le Vert avec eux.')
      + ' Aux manches suivantes, les dés reviennent toujours aux perdants de la manche '
      + 'précédente. Chaque joueur ne tient qu’un lot à la fois'
      + (cfg.lotsCumules
        ? ', sauf quand deux lots se rejoignent — ils s’empilent alors dans la même main.'
        : ' ; deux lots qui se rejoignent se poussent l’un l’autre.')),
  );
}

function leDe(cfg) {
  const compte = {};
  for (const f of cfg.faces) compte[f] = (compte[f] || 0) + 1;
  return section(`Le dé — ${cfg.faces.length} faces`,
    h('div.fiche-faces',
      ...Object.entries(compte).map(([sym, n]) => h('div.fiche-face',
        pastilleSymbole(sym, 42),
        h('div.fiche-face-nom', nomSymbole(sym)),
        h('div.fiche-face-n', `×${n}`))),
    ),
    h('p.fiche-note',
      'Un dé se relance autant de fois qu’on veut, seul ou avec les autres du lot — '
      + `sauf « ${nomSymbole('x')} » : dès que ce symbole sort, le dé est figé et ne se relance `
      + 'plus.'),
  );
}

function lesCombinaisons(cfg) {
  const ETAT = {
    endormie: 'Tornade endormie',
    active: 'Tornade éveillée',
    toutes: 'les deux états',
  };
  const asym = !!cfg.combosAsymetriques && cfg.combos.some((c) => difference(cfg, c));
  const lignes = cfg.combos
    .filter((c) => comboPossible(cfg.faces, c.requis))
    .map((c) => h('tr',
      h('td.fiche-combo-nom', c.nom),
      h('td.fiche-col-des', desRequis(c.requis)),
      asym
        ? h('td.fiche-col-des', difference(cfg, c)
            ? desRequis(requisPourEquipe(cfg, c.id, c.requis, 'vert'))
            : h('span.mini.muted', 'les mêmes'))
        : null,
      h('td.petit', ETAT[c.face] || ETAT.toutes),
      h('td.petit', effetCombo(cfg, c))));
  const mortes = cfg.combos.filter((c) => !comboPossible(cfg.faces, c.requis));
  return section('Les combinaisons',
    tableau('table.tbl.fiche-tbl',
      h('thead', h('tr',
        h('th', 'Combinaison'),
        h('th', 'Dés requis'),
        asym ? h('th', 'Dés du Vert') : null,
        h('th', 'Possible quand'), h('th', 'Effet'))),
      h('tbody', ...lignes)),
    asym
      ? h('p.fiche-note',
          `Le joueur Vert joue seul contre deux équipes : certaines combinaisons lui demandent `
          + 'autre chose. La colonne « Dés du Vert » ne vaut que pour lui ; « les mêmes » veut '
          + 'dire qu’il joue l’exigence des deux équipes.')
      : null,
    h('p.fiche-note',
      'Une combinaison servie est jouée d’office : on ne relance pas par-dessus. Le lot part '
      + 'ensuite vers le voisin, puis l’effet s’applique. Quand plusieurs combinaisons sortent '
      + 'au même jet, c’est au joueur de choisir laquelle il joue.'),
    mortes.length
      ? h('p.fiche-note',
          `Ce dé ne peut pas produire ${mortes.map((c) => `« ${c.nom} »`).join(', ')} : `
          + 'la combinaison demande des faces qu’il ne porte pas.')
      : null,
  );
}

/** L'exigence du Vert diffère-t-elle de celle des deux équipes ? */
function difference(cfg, combo) {
  const propre = requisPourEquipe(cfg, combo.id, combo.requis, 'vert');
  return JSON.stringify(propre) !== JSON.stringify(combo.requis);
}

/**
 * Ce que fait une combinaison, dans CETTE partie.
 *
 * Le libellé de référence décrit la règle de base. Deux choses le changent : la
 * façon de jouer une manche — l'Abri ne retourne plus rien en Immédiat, il pose
 * un jeton en Compromis — et le réglage du déclencheur, qui donne à l'Échec ou
 * à l'Attaque la tentative de contact. Une fiche qui recopierait le libellé
 * d'origine décrirait une autre partie que celle qu'on va jouer.
 */
function effetCombo(cfg, c) {
  if (c.id === 'vache') {
    if (estImmediat(cfg)) return 'Vous remportez la manche sur-le-champ';
    if (estCompromis(cfg)) return 'Posez un jeton de votre couleur sur le Refuge';
    return 'Retournez un jeton de votre équipe';
  }
  const declencheur = comboDeclencheur(cfg);
  if (c.id === declencheur) {
    const gain = attrapeEmporteManche(cfg)
      ? (estCompromis(cfg)
        ? 'un jeton adverse part dans la tornade et vous remportez la manche'
        : 'vous remportez la manche')
      : 'vous retournez un jeton de votre équipe';
    const base = c.echec
      ? 'Le lot part, et vous tentez d’attraper le joueur suivant'
      : 'Passez votre lot et tentez d’attraper le joueur suivant';
    return `${base} — s’il est touché, ${gain}`;
  }
  return c.libelle;
}

/**
 * Le tour de jeu.
 *
 * La fiche vaut pour toutes les tables : elle ne nomme donc jamais un nombre qui
 * dépend de l'effectif — les lots, les jetons, les cartes à réunir sont dans le
 * tableau de mise en place, et le texte y renvoie. Seuls les nombres qui valent
 * pour toute table, comme les dés d'un lot, s'écrivent en toutes lettres.
 */
function leTour(cfg) {
  return section('Le tour de jeu',
    h('ol.fiche-liste',
      h('li', `Chacun joue en même temps : plusieurs lots de ${cfg.desParLot} dés circulent `
        + 'autour de la table — leur nombre dépend de l’effectif, voir la mise en place — et '
        + 'celui qui tient un lot le relance aussi vite et aussi souvent qu’il veut.'),
      h('li', 'Dès qu’une combinaison sort, elle est jouée : le lot part vers le voisin, et '
        + 'l’effet s’applique.'),
      h('li', `Chaque manche commence Tornade endormie. Il faut d’abord se réveiller — la `
        + `combinaison « ${nomCombo(cfg, 'reveil')} » — avant de pouvoir agir sur les autres.`),
      h('li', `Le sens de circulation ${TOUR_SENS[sensRotation(cfg)]}`),
    ),
    sensRotation(cfg) === 'perdants'
      ? h('p.fiche-note',
          'La carte rotation ne se retourne qu’à ce moment-là : une fois la manche commencée, le '
          + 'sens ne change plus. On n’attrape que son voisin d’aval et l’on n’est attrapé que '
          + 'par son voisin d’amont — la retourner, c’est changer de proie et de danger d’un '
          + 'même geste.')
      : null,
  );
}

/** Ce que la fiche dit du sens, selon la règle retenue. */
const TOUR_SENS = {
  alterne: 's’inverse à chaque manche.',
  perdants: 'est indiqué par la carte rotation, posée sur la table. À la fin de chaque manche, '
    + 'l’équipe qui reçoit les dés — celle qui vient de perdre — la retourne pour inverser le '
    + 'sens, ou la laisse en place. C’est un choix, jamais une obligation.',
};

function nomCombo(cfg, id) {
  const c = cfg.combos.find((x) => x.id === id);
  return c ? c.nom : id;
}

function gagnerLaManche(cfg, mode) {
  const abri = nomCombo(cfg, 'vache');
  if (estJeton(cfg)) {
    return section('Gagner une manche',
      h('p', `Chaque combinaison « ${abri} » retourne un jeton de votre équipe. La manche revient `
        + 'à la première équipe qui a retourné tous les siens — leur nombre dépend de '
        + 'l’effectif, voir la mise en place.'),
      h('p.fiche-note', 'Les jetons repartent face cachée à chaque manche : chaque manche est une '
        + 'course indépendante.'),
    );
  }
  if (estImmediat(cfg)) {
    return section('Gagner une manche',
      h('p', `Le premier joueur qui sort « ${abri} », réveillé, arrête la manche sur-le-champ : `
        + 'son équipe prend la carte Tornade en cours. Aucun jeton n’est compté.'),
    );
  }
  return section('Gagner une manche',
    h('p', 'Une carte Refuge est posée au milieu de la table, commune à tout le monde. '
      + `Chaque équipe a ${cfg.jetonsRefuge} jetons de sa couleur.`),
    h('p', `La carte Tornade en cours indique combien de jetons de votre couleur il faut poser `
      + `sur le Refuge — de 1 à ${cfg.jetonsRefuge}. Chaque combinaison « ${abri} » en pose un.`),
    h('p', h('strong', 'Deux façons de prendre la manche :')),
    h('ul.fiche-liste',
      h('li', 'poser le dernier jeton demandé — vos animaux sont à l’abri, la manche est à vous '
        + 'sur-le-champ ;'),
      h('li', 'réussir une collision — vous posez un jeton de l’adversaire sur la tornade, et la '
        + 'manche est à vous de la même façon.'),
    ),
    h('p.fiche-note', 'Le Refuge se vide au début de chaque manche.'),
  );
}

function lAttrape(cfg, mode) {
  const decl = cfg.combos.find((c) => c.id === comboDeclencheur(cfg));
  const emporte = attrapeEmporteManche(cfg);
  return section(estCompromis(cfg) ? 'La collision' : 'L’attrape',
    h('p', `C’est la combinaison « ${decl ? decl.nom : 'Attaque'} » qui la déclenche : le lot part `
      + 'vers le voisin, et vous tentez de toucher sa main au passage. Il peut retirer la sienne '
      + 'à temps.'
      + (cfg.attrapeSur === 'echec' && cfg.attrapeEveille !== false
        ? ' Il faut être réveillé pour tenter le contact.' : '')),
    h('p', 'Le contact ne se tente que si le joueur suivant tient un lot : sur une main vide, il '
      + 'n’y a rien à attraper.'),
    h('p', h('strong', emporte
      ? (estCompromis(cfg)
        ? 'Un contact réussi envoie un jeton adverse dans la tornade et emporte la manche.'
        : 'Un contact réussi emporte la manche entière.')
      : 'Un contact réussi interrompt le voisin et retourne un jeton de votre équipe.')),
  );
}

function lesCartes(cfg, mode) {
  const enJeu = new Set(cartesEnJeu(cfg));
  const cartes = cartesDuMode(cfg).filter((c) => enJeu.has(c.id));
  if (!cartes.length) return null;
  return section(`Les cartes Tornade — ${cartes.length} en jeu`,
    h('p.fiche-note',
      estJeton(cfg)
        ? 'Une carte par manche, retournée au début. Elle change la manche qui commence.'
        : 'Une carte par manche : on la révèle, on la joue. L’équipe qui remporte la manche la '
          + 'prend dans sa pile — c’est ainsi qu’on gagne la partie.'),
    tableau('table.tbl.fiche-tbl',
      h('thead', h('tr',
        h('th', 'Carte'),
        estCompromis(cfg) ? h('th.num', 'Au Refuge') : null,
        h('th', 'Combinaison'),
        h('th', 'Effet'))),
      h('tbody', ...cartes.map((c) => {
        const requis = c.combo ? requisCarte(cfg, c.combo) : null;
        return h('tr',
          h('td.fiche-combo-nom', c.court || c.nom),
          estCompromis(cfg) ? h('td.num', String(refugePour(cfg, c))) : null,
          h('td.fiche-col-des', requis ? desRequis(requis, 19) : h('span.mini.muted', '—')),
          h('td.petit', c.texte));
      }))),
  );
}

/**
 * Le joueur Vert : il n'existe qu'à nombre impair, et tout ce qui le distingue
 * tient ici plutôt que dispersé en notes de bas de tableau.
 */
function leJoueurVert(cfg, parEffectif) {
  const vert = COULEURS_EQUIPE.vert;
  const impairs = NOMBRES_JOUEURS.filter(avecVert);
  const combosPropres = cfg.combos.filter((c) => cfg.combosAsymetriques && difference(cfg, c));
  const cowboy = cartesDuMode(cfg)
    .find((c) => c.equipeRequise === 'vert' && cartesEnJeu(cfg).includes(c.id));
  // « Un autre nombre » ne se dit que s'il est vraiment autre : régler l'objectif
  // du Vert à la même valeur que les équipes ne change rien.
  const cartesVert = impairs.filter((n) => parEffectif[n].cartesVert
    && parEffectif[n].cartesVert !== parEffectif[n].cartesPourGagner);
  return section(`Le joueur Vert — le ${vert.emblemeUn}`,
    h('p', `À ${impairs.join(', ')} joueurs, la table ne se partage pas en deux : un joueur `
      + 'reste seul et forme une équipe à lui tout seul, en vert. Il ferme la ronde, entre un '
      + 'Jaune et un Bleu.'),
    h('p', 'Il joue exactement comme les autres — mêmes dés, mêmes combinaisons, même façon de '
      + 'prendre une manche — mais il les joue seul contre deux équipes. C’est l’asymétrie la '
      + 'plus sensible du jeu, et les réglages ci-dessous sont là pour la corriger.'),
    h('ul.fiche-liste',
      estJeton(cfg)
        ? h('li', `Il a ses propres jetons : ${impairs.map((n) => `${parEffectif[n].jetonsVert} à ${n} joueurs`).join(', ')}.`)
        : null,
      cartesVert.length
        ? h('li', 'Il lui faut un autre nombre de cartes pour gagner : '
            + `${cartesVert.map((n) => `${parEffectif[n].cartesVert} à ${n} joueurs`).join(', ')}.`)
        : h('li', 'Il lui faut le même nombre de cartes que les deux équipes pour gagner.'),
      combosPropres.length
        ? h('li', 'Certaines combinaisons lui demandent autre chose — voir la colonne qui lui '
            + `est réservée dans le tableau des combinaisons : ${combosPropres.map((c) => c.nom).join(', ')}.`)
        : h('li', 'Ses combinaisons sont celles de tout le monde.'),
      cowboy
        ? h('li', `La carte « ${cowboy.court || cowboy.nom} » le désigne : ${cowboy.texte} `
            + 'À nombre pair, elle sort du paquet — elle ne désignerait personne.')
        : null,
      cfg.equipeDepart === 'vert'
        ? h('li', 'C’est lui qui ouvre la première manche.')
        : h('li', 'Il prend les dés avec l’équipe qui ouvre la première manche.'),
    ),
  );
}

function finDePartie(cfg, mode, parEffectif) {
  const cartes = [...new Set(NOMBRES_JOUEURS.map((n) => parEffectif[n].cartesPourGagner))];
  return section('Fin de partie',
    h('p', estJeton(cfg)
      ? 'L’équipe qui remporte une manche prend une carte Tornade.'
      : 'L’équipe qui remporte une manche prend la carte Tornade en cours.'),
    h('p', cartes.length === 1
      ? `La première à en réunir ${cartes[0]} gagne la partie, quel que soit le nombre de joueurs.`
      : 'La première à réunir le nombre de cartes de sa table — voir la mise en place — gagne '
        + 'la partie.'),
  );
}
