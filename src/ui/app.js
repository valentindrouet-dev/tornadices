// Coquille de l'application : barre supérieure et routage par ancre.

import { h, remplacer } from './dom.js?v=1.17';
import { SVG_LOGO } from './icons.js?v=1.17';
import { VERSION } from '../version.js?v=1.17';
import { vueAccueil } from './accueil.js?v=1.17';
import { vueTable, partieEnCours } from './table.js?v=1.17';
import { vueLabo } from './labo.js?v=1.17';
import { vueVariables } from './variables.js?v=1.17';
import { vueHistorique } from './historique.js?v=1.17';
import { vueVersions } from './versions.js?v=1.17';
import { vueRegles } from './regles.js?v=1.17';

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

  // Sur petit écran, tout tient sur une ligne : marque, Accueil, et le reste
  // derrière trois traits. Au-delà de 860 px le bouton et l'Accueil isolé sont
  // masqués par la feuille de style, et la barre retrouve exactement sa rangée.
  const liens = h('nav.liens',
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

  const bascule = h('button.burger', {
    type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false',
  }, h('span'), h('span'), h('span'));

  const entete = h('header.barre',
    h('div.marque', { html: SVG_LOGO }),
    h('div.marque',
      h('span.nom', 'TORNADICES'),
      h('span.pastille-version', `v${VERSION}`),
    ),
    h('div.espace'),
    lien('Accueil', '/', { classe: 'lien-accueil' }),
    bascule,
    liens,
  );

  bascule.onclick = () => {
    const ouvert = entete.classList.toggle('barre--ouverte');
    bascule.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  };
  // Naviguer referme le menu ; changer de page reconstruit la barre de toute façon.
  liens.addEventListener('click', () => entete.classList.remove('barre--ouverte'));

  return entete;
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
