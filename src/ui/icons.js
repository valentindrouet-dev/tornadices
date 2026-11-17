// Faces des dés et emblèmes d'équipe. Les quatre faces sont les dés imprimés
// (assets/des) ; le dé pas encore lancé et le dé qui roule sont dessinés ici,
// dans le même cadre.

import { SYMBOLES } from '../core/config.js?v=2.13';
import { VERSION } from '../version.js?v=2.13';

// Le corps du dé, comme sur les images : carré arrondi blanc, cerné de noir.
const de = (contenu) => '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
  + `<rect x="3.5" y="3.5" width="93" height="93" rx="21" fill="#f6f6f6" stroke="#000" stroke-width="7"/>${contenu}</svg>`;

// Face « ? » : le lot vient d'arriver, aucun dé n'a encore été lancé.
export const SVG_INCONNU = de(`
  <circle cx="50" cy="50" r="37" fill="#c9cbcd"/>
  <g transform="translate(50 50) scale(.8) translate(-50 -50)">
    <path fill="#141414" d="M50 20c-10.5 0-18.8 6.6-21.3 15.4-.9 3.2 1.2 6.3 4.5 6.9 3 .5 5.8-1.3 6.8-4.2C41.4 34 45.3 31.4 50 31.4c5.9 0 10.3 3.9 10.3 9 0 4-1.9 6.4-6.6 9.7-5.3 3.7-8 7.4-8 13.6v1.6c0 3.3 2.7 6 6 6s6-2.7 6-6v-.8c0-3.6 1.5-5.6 6.1-8.8 5.9-4.1 9.4-9 9.4-15.9C73.2 28.7 63.4 20 50 20z"/>
    <circle cx="50" cy="79" r="7.4" fill="#141414"/>
  </g>`);

// Dé en rotation : aucune face lisible, juste le volume qui tourne.
export const SVG_ROULANT = de(`
  <defs><radialGradient id="lueur" cx="38%" cy="32%" r="72%">
    <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b9c4cf"/>
  </radialGradient></defs>
  <circle cx="50" cy="50" r="37" fill="url(#lueur)"/>`);

/** Le dessin d'une face : l'image du dé imprimé. */
export const SVG_SYMBOLE = Object.fromEntries(Object.keys(SYMBOLES).map((sym) => [sym,
  `<img class="face-img" src="assets/des/${sym}.webp?v=${VERSION}" alt="${SYMBOLES[sym].nom}" draggable="false" width="256" height="256">`]));

// ── Emblèmes d'équipe : le jeton imprimé de l'animal ─────────────────────────
export const JETONS_EMBLEME = {
  vache: 'assets/jetons/vache.png',
  poule: 'assets/jetons/poule.png',
  cowboy: 'assets/jetons/cowboy.png',
};

/** Emblème d'équipe, à poser à côté d'un nom. */
export function emblemeEquipe(nom, taille = 20) {
  const s = document.createElement('span');
  s.className = 'embleme';
  s.style.width = s.style.height = `${taille}px`;
  const src = JETONS_EMBLEME[nom];
  if (src) {
    const img = document.createElement('img');
    img.src = src; img.alt = ''; img.draggable = false;
    img.width = img.height = 74;
    s.appendChild(img);
  }
  return s;
}

// La Carte Rotation imprimée : une face par sens, on la retourne pour en changer.
export const CARTES_SENS = {
  horaire: { src: 'assets/sens/horaire.webp', largeur: 1340, hauteur: 1852 },
  antihoraire: { src: 'assets/sens/antihoraire.webp', largeur: 1318, hauteur: 1828 },
};
/** La face de la Carte Rotation pour ce sens (1 : horaire, -1 : antihoraire). */
export const faceCarteSens = (sens) => (sens > 0 ? CARTES_SENS.horaire : CARTES_SENS.antihoraire);

/** Un dé rendu comme une face de dé physique. */
export function faceDe(symbole, options = {}) {
  const { verrou = false, taille = 'moyen', roule = false } = options;
  const div = document.createElement('div');
  div.className = 'de'
    + ` de--${taille}`
    + (verrou && !roule ? ' de--verrou' : '')
    + (roule ? ' de--roule' : '')
    + (!symbole && !roule ? ' de--inconnu' : '');
  div.dataset.sym = roule ? '' : (symbole || '');
  if (roule) {
    div.innerHTML = SVG_ROULANT;
    div.title = 'Le dé roule…';
  } else if (symbole) {
    div.innerHTML = SVG_SYMBOLE[symbole] || '';
    if (verrou) div.title = 'Tornade — ce dé ne peut plus être relancé';
  } else {
    div.innerHTML = SVG_INCONNU;
    div.title = 'Ce dé n’a pas encore été lancé';
  }
  return div;
}

/** Petit symbole isolé, pour les listes de combinaisons. */
export function pastilleSymbole(symbole, taille = 22) {
  const s = document.createElement('span');
  s.className = 'pastille-sym';
  s.dataset.sym = symbole;
  s.title = (SYMBOLES[symbole] || {}).nom || '';
  s.style.width = s.style.height = `${taille}px`;
  s.innerHTML = SVG_SYMBOLE[symbole] || '';
  return s;
}

/** Rend une exigence { grange: 3 } sous forme de suite de pastilles. */
export function suiteSymboles(requis, taille = 22) {
  const frag = document.createDocumentFragment();
  for (const [sym, n] of Object.entries(requis || {})) {
    for (let i = 0; i < n; i++) frag.appendChild(pastilleSymbole(sym, taille));
  }
  return frag;
}
