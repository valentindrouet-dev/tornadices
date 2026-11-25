// Coquille de l'application : barre supérieure et routage par ancre.

import { h, remplacer } from './dom.js?v=2.17';
import { VERSION } from '../version.js?v=2.17';
import { vueAccueil } from './accueil.js?v=2.17';
import { vueTable, partieEnCours } from './table.js?v=2.17';
import { vueLabo } from './labo.js?v=2.17';
import { vueReglages } from './reglages.js?v=2.17';
import { vueHistorique } from './historique.js?v=2.17';
import { vueVersions } from './versions.js?v=2.17';
import { vueRegles } from './regles.js?v=2.17';
import { vueLore } from './lore.js?v=2.17';
import { store } from './store.js?v=2.17';
import { THEMES, appliquerTheme, themeActuel, renommerConfig } from '../core/themes.js?v=2.17';
import { vueResultats } from './resultats.js?v=2.17';

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
    // Le visuel 3.0 se coupe d'un clic : l'habillage d'avant reste intact.
    h('button.bascule-visuel', {
      type: 'button',
      title: visuel30() ? 'Revenir au visuel classique' : 'Passer au visuel 3.0',
      onclick: () => { choisirVisuel(visuel30() ? 'classique' : '30'); rendre(); },
    }, visuel30() ? '✦ Visuel 3.0' : 'Visuel classique'),
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

// ── Visuel 3.0 ou classique ───────────────────────────────────────────────────
// Le visuel 3.0 n'est qu'un habillage : styles-30.css, actif quand le corps de la
// page porte data-visuel="30", et un ciel décoratif posé derrière tout le reste.
const visuel30 = () => document.body.dataset.visuel === '30';

function choisirVisuel(v) {
  const actif = v !== 'classique';
  store.set('visuel', actif ? '30' : 'classique');
  document.body.dataset.visuel = actif ? '30' : 'classique';
  if (actif && !document.querySelector('.ciel-30')) document.body.prepend(cielDecoratif());
}

/** Nuages et souffles qui dérivent lentement, derrière la page. Purement décoratif. */
function cielDecoratif() {
  const deco = (src, cls) => h('img', { src: `assets/decor/${src}.webp`, alt: '', class: cls, draggable: 'false' });
  return h('div.ciel-30', { 'aria-hidden': 'true' },
    deco('nuage-1', 'ciel-el ciel-el--1'), deco('nuage-volute', 'ciel-el ciel-el--2'),
    deco('nuage-3', 'ciel-el ciel-el--3'), deco('nuage-large', 'ciel-el ciel-el--4'),
    deco('nuage-petit', 'ciel-el ciel-el--5'), deco('souffle-arc', 'ciel-el ciel-el--6'),
    deco('souffle-vague', 'ciel-el ciel-el--7'), deco('nuage-vent', 'ciel-el ciel-el--8'));
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
  // Chaque écran a son habillage (visuel 3.0) : la feuille de style le lit ici.
  document.body.dataset.page = (ROUTES[chemin] ? chemin : '/').replace(/^\//, '') || 'accueil';
  remplacer(racine, barre(), vue());
  window.scrollTo({ top: 0 });
}

export function demarrer(el) {
  racine = el;
  choisirTheme(store.get('theme', 'ranch'));
  choisirVisuel(store.get('visuel', '30'));
  window.addEventListener('hashchange', rendre);
  rendre();
}
