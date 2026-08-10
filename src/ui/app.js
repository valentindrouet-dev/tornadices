// Coquille de l'application : barre supérieure et routage par ancre.

import { h, remplacer } from './dom.js?v=1.13';
import { SVG_LOGO } from './icons.js?v=1.13';
import { VERSION } from '../version.js?v=1.13';
import { vueAccueil } from './accueil.js?v=1.13';
import { vueTable, partieEnCours } from './table.js?v=1.13';
import { vueLabo } from './labo.js?v=1.13';
import { vueVariables } from './variables.js?v=1.13';
import { vueHistorique } from './historique.js?v=1.13';
import { vueVersions } from './versions.js?v=1.13';
import { vueRegles } from './regles.js?v=1.13';

const ROUTES = {
  '': vueAccueil,
  '/': vueAccueil,
  '/table': vueTable,
  '/variables': vueVariables,
  '/labo': vueLabo,
  '/historique': vueHistorique,
  '/versions': vueVersions,
  '/regles': vueRegles,
};

function cheminCourant() {
  const brut = location.hash.replace(/^#/, '');
  return brut || '/';
}

export function aller(chemin) {
  if (cheminCourant() === chemin) { rendre(); return; }
  location.hash = chemin;
}

function barre() {
  const chemin = cheminCourant();
  const enCours = !!partieEnCours();
  const lien = (libelle, cible, options = {}) => h('button', {
    class: `lien-nav${chemin === cible ? ' actif' : ''}${options.classe ? ' ' + options.classe : ''}`,
    onclick: () => aller(cible),
  }, libelle);

  return h('header.barre',
    h('div.marque', { html: SVG_LOGO }),
    h('div.marque',
      h('span.nom', 'TORNADICES'),
      h('span.pastille-version', `v${VERSION}`),
    ),
    h('div.espace'),
    enCours && chemin !== '/table'
      ? h('button.lien-nav.actif', { onclick: () => aller('/table') }, '▸ Partie en cours')
      : null,
    chemin !== '/' ? lien('Accueil', '/') : null,
    lien('Variables', '/variables'),
    lien('Laboratoire', '/labo'),
    lien('Historique', '/historique'),
    lien('Règles', '/regles'),
    lien('Versions', '/versions'),
  );
}

let racine;

export function rendre() {
  const chemin = cheminCourant();
  const vue = ROUTES[chemin] || vueAccueil;
  remplacer(racine, barre(), vue());
  window.scrollTo({ top: 0 });
}

export function demarrer(el) {
  racine = el;
  window.addEventListener('hashchange', rendre);
  rendre();
}
