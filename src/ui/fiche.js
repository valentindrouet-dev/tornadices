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

import { h, remplacer } from './dom.js?v=1.51';
import { store } from './store.js?v=1.51';
import { aller } from './app.js?v=1.51';
import { pastilleSymbole, suiteSymboles, emblemeEquipe } from './icons.js?v=1.51';
import { nomSymbole } from './apparence.js?v=1.51';
import { construireConfig } from './variables.js?v=1.51';
import { nomActif } from './profils.js?v=1.51';
import { VERSION } from '../version.js?v=1.51';
import {
  COULEURS_EQUIPE, NOM_MODE, modeManche, estJeton, estCompromis, estImmediat,
  cartesEnJeu, cartesDuMode, requisCarte, comboPossible, refugePour,
  comboDeclencheur, attrapeEmporteManche, bornerJoueurs, placement,
  infosMiseEnPlace,
} from '../core/config.js?v=1.51';

/** Une section de la fiche : un titre, puis ce qu'il y a à dire. */
const section = (titre, ...contenu) => h('section.fiche-bloc',
  h('h2.fiche-titre', titre), ...contenu.filter(Boolean));

/** Une ligne « libellé — valeur » du tableau de mise en place. */
const ligne = (libelle, valeur) => h('tr', h('td', libelle), h('td.num', valeur));

export function vueFiche() {
  const racine = h('div.page');
  const nb = bornerJoueurs(store.get('nbJoueurs', 6));
  const cfg = construireConfig(nb);
  const mode = modeManche(cfg);
  const sieges = placement(nb);
  const equipes = [...new Set(sieges)];

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
      enTete(cfg, nb, mode),
      miseEnPlace(cfg, nb, equipes),
      leDe(cfg),
      lesCombinaisons(cfg),
      leTour(cfg),
      gagnerLaManche(cfg, mode),
      lAttrape(cfg, mode),
      lesCartes(cfg, mode),
      finDePartie(cfg, mode),
      h('p.fiche-pied',
        `TornaDice — jeu de Sylvain Bonnafous, édité par Big Budi Games. `
        + `Fiche produite par la table virtuelle, version ${VERSION}, `
        + `réglage « ${nomActif()} ».`),
    ),
  );
  return racine;
}

function enTete(cfg, nb, mode) {
  return h('header.fiche-entete',
    h('h1.fiche-jeu', 'TORNADICE'),
    h('p.fiche-sous',
      `Règles de la partie · ${nb} joueurs · façon de jouer une manche : ${NOM_MODE[mode]}`),
  );
}

function miseEnPlace(cfg, nb, equipes) {
  const mep = infosMiseEnPlace(nb);
  const depart = COULEURS_EQUIPE[cfg.equipeDepart] || COULEURS_EQUIPE.jaune;
  const vert = equipes.includes('vert');
  return section('Mise en place',
    h('table.tbl.fiche-tbl',
      h('tbody',
        ligne('Joueurs', `${nb} — ${equipes.map((id) => {
          const n = COULEURS_EQUIPE[id];
          const combien = nb === 3 && id !== 'vert' ? 1 : Math.floor((nb - (vert ? 1 : 0)) / 2);
          return id === 'vert' ? `${n.emblemeUn} (1)` : `${n.emblemeNom} (${combien})`;
        }).join(', ')}`),
        ligne('Lots de dés en jeu', cfg.lots),
        ligne('Dés par lot', cfg.desParLot),
        estJeton(cfg) ? ligne('Jetons par équipe', cfg.jetons) : null,
        estJeton(cfg) && vert ? ligne('Jetons du joueur Vert', cfg.jetonsVert) : null,
        estCompromis(cfg) ? ligne('Jetons de sa couleur, par équipe', cfg.jetonsRefuge) : null,
        ligne('Cartes Tornade pour gagner', cfg.cartesPourGagner),
        vert && cfg.cartesVert ? ligne('Cartes pour le joueur Vert', cfg.cartesVert) : null,
        ligne('Qui prend les lots à la première manche', depart.nom),
      )),
    h('p.fiche-note',
      'Aux manches suivantes, les dés reviennent toujours aux perdants de la manche '
      + 'précédente. Chaque joueur ne tient qu’un lot à la fois'
      + (cfg.lotsCumules ? ', sauf quand deux lots se rejoignent — ils s’empilent alors dans la même main.' : ' ; deux lots qui se rejoignent se poussent l’un l’autre.')),
    cfg.lots !== mep.lots
      ? h('p.fiche-note', `Le tableau officiel prévoit ${mep.lots} lots à ${nb} joueurs.`)
      : null,
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
      + `sauf le ${nomSymbole('x')} : dès qu’il sort, ce dé est figé et ne se relance plus.`),
  );
}

function lesCombinaisons(cfg) {
  const ETAT = {
    endormie: 'Tornade endormie',
    active: 'Tornade éveillée',
    toutes: 'les deux états',
  };
  const lignes = cfg.combos
    .filter((c) => comboPossible(cfg.faces, c.requis))
    .map((c) => h('tr',
      h('td.fiche-combo-nom', c.nom),
      h('td', h('span.rangee.rangee--serree', suiteSymboles(c.requis, 22))),
      h('td.petit', ETAT[c.face] || ETAT.toutes),
      h('td.petit', effetCombo(cfg, c))));
  const mortes = cfg.combos.filter((c) => !comboPossible(cfg.faces, c.requis));
  return section('Les combinaisons',
    h('table.tbl.fiche-tbl',
      h('thead', h('tr',
        h('th', 'Combinaison'), h('th', 'Dés requis'),
        h('th', 'Possible quand'), h('th', 'Effet'))),
      h('tbody', ...lignes)),
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

function leTour(cfg) {
  return section('Le tour de jeu',
    h('ol.fiche-liste',
      h('li', `Chacun joue en même temps : ${cfg.lots} lots de ${cfg.desParLot} dés circulent `
        + 'autour de la table, et celui qui tient un lot le relance aussi vite et aussi souvent '
        + 'qu’il veut.'),
      h('li', 'Dès qu’une combinaison sort, elle est jouée : le lot part vers le voisin, et '
        + 'l’effet s’applique.'),
      h('li', `Chaque manche commence Tornade endormie. Il faut d’abord se réveiller — la `
        + `combinaison « ${nomCombo(cfg, 'reveil')} » — avant de pouvoir agir sur les autres.`),
      h('li', `Le sens de circulation ${estJeton(cfg)
        ? 's’inverse à chaque manche.'
        : 'est celui qu’annonce la flèche au dos de la prochaine carte Tornade, encore face cachée sur la pioche : deux manches de suite peuvent tourner dans le même sens.'}`),
    ),
  );
}

function nomCombo(cfg, id) {
  const c = cfg.combos.find((x) => x.id === id);
  return c ? c.nom : id;
}

function gagnerLaManche(cfg, mode) {
  const abri = nomCombo(cfg, 'vache');
  if (estJeton(cfg)) {
    return section('Gagner une manche',
      h('p', `Chaque combinaison « ${abri} » retourne un jeton de votre équipe. La manche revient `
        + `à la première équipe qui a retourné ses ${cfg.jetons} jetons.`),
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
    h('table.tbl.fiche-tbl',
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
          h('td', requis
            ? h('span.rangee.rangee--serree', suiteSymboles(requis, 20))
            : h('span.mini.muted', '—')),
          h('td.petit', c.texte));
      }))),
  );
}

function finDePartie(cfg, mode) {
  return section('Fin de partie',
    h('p', estJeton(cfg)
      ? `L’équipe qui remporte une manche prend une carte Tornade. La première à en réunir `
        + `${cfg.cartesPourGagner} gagne la partie.`
      : `L’équipe qui remporte une manche prend la carte Tornade en cours. La première à en `
        + `réunir ${cfg.cartesPourGagner} gagne la partie.`),
    cfg.cartesVert
      ? h('p.fiche-note',
          `Le joueur Vert joue seul contre deux équipes : il lui en faut ${cfg.cartesVert}.`)
      : null,
  );
}
