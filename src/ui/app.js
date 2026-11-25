// Coquille de l'application : barre supérieure et routage par ancre.

import { h, remplacer } from './dom.js?v=2.14';
import { VERSION } from '../version.js?v=2.14';
import { vueAccueil } from './accueil.js?v=2.14';
import { vueTable, partieEnCours } from './table.js?v=2.14';
import { vueLabo } from './labo.js?v=2.14';
import { vueReglages } from './reglages.js?v=2.14';
import { vueHistorique } from './historique.js?v=2.14';
import { vueVersions } from './versions.js?v=2.14';
import { vueRegles } from './regles.js?v=2.14';
import { vueLore } from './lore.js?v=2.14';
import { store } from './store.js?v=2.14';
import { THEMES, appliquerTheme, themeActuel, renommerConfig } from '../core/themes.js?v=2.14';
import { vueResultats } from './resultats.js?v=2.14';

const ROUTES = {
  '': vueAccueil,
  '/': vueAccueil,
  '/table': vueTable,
  '/reglages': vueReglages,
  '/labo': vueLabo,
  '/historique': vueHistorique,
  '/versions': vueVersions,
  '/regles': vueRegles,
  '/lore': vueLore,
  // La page de fin de partie. Elle s'ouvre seule au coup de sifflet final, et
  // reste consultable ensuite : l'instantané vit dans le navigateur.
  '/resultats': vueResultats,
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
    lien('Réglages', '/reglages'),
    basculeTheme(),
    lien('Laboratoire', '/labo'),
    lien('Historique', '/historique'),
    lien('Règles', '/regles'),
    lien('Lore', '/lore'),
    lien('Versions', '/versions'),
  );

  const bascule = h('button.burger', {
    type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false',
  }, h('span'), h('span'), h('span'));

  // La marque ramène à l'accueil, le numéro mène au journal des versions :
  // ce sont les deux gestes que l'on tente d'instinct sur un en-tête.
  const entete = h('header.barre',
    h('button.marque.marque--lien', {
      type: 'button', title: 'Retour à l’accueil', onclick: () => aller('/'),
    },
      h('img.logo-titre', {
        src: 'assets/logo-tornadice.png', alt: 'TornaDice', width: 539, height: 376,
      }),
    ),
    h('button.pastille-version', {
      type: 'button', title: 'Journal des versions', onclick: () => aller('/versions'),
    }, `v${VERSION}`),
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

/** Passe le site sur un thème : les noms, les couleurs et les jetons changent partout, même en pleine partie. */
export function choisirTheme(id) {
  appliquerTheme(id);
  store.set('theme', themeActuel());
  document.body.dataset.theme = themeActuel();
  const partie = partieEnCours();
  if (partie) renommerConfig(partie.cfg);
}

// L'interrupteur Ranch / Engins, dans la barre du haut.
function basculeTheme() {
  return h('div.segment.bascule-theme', { title: 'Habillage du jeu' },
    ...Object.values(THEMES).map((t) => h('button', {
      class: t.id === themeActuel() ? 'on' : '',
      onclick: (e) => { e.stopPropagation(); choisirTheme(t.id); rendre(); },
    }, t.nom)));
}

export function rendre() {
  const chemin = cheminCourant();
  const vue = ROUTES[chemin] || vueAccueil;
  remplacer(racine, barre(), vue());
  window.scrollTo({ top: 0 });
}

export function demarrer(el) {
  racine = el;
  choisirTheme(store.get('theme', 'ranch'));
  window.addEventListener('hashchange', rendre);
  rendre();
}
