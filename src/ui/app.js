// Coquille de l'application : barre supérieure et routage par ancre.

import { h, remplacer } from './dom.js';
import { SVG_LOGO } from './icons.js';
import { VERSION } from '../version.js';
import { vueAccueil } from './accueil.js';
import { vueTable, partieEnCours } from './table.js';
import { vueLabo } from './labo.js';
import { vueHistorique } from './historique.js';
import { vueVersions } from './versions.js';
import { vueRegles } from './regles.js';

const ROUTES = {
  '': vueAccueil,
  '/': vueAccueil,
  '/table': vueTable,
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
