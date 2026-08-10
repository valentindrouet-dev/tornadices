// Symboles des dés et pictogrammes, en SVG inline (aucune ressource externe).
//
// Chaque face reprend le dessin des dés physiques : une pastille de couleur et
// un pictogramme noir par-dessus.

const svg = (contenu, vb = '0 0 100 100') =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${contenu}</svg>`;

const NOIR = '#141414';

// Pastille de fond, puis le pictogramme.
const face = (couleur, glyphe) => svg(
  `<circle cx="50" cy="50" r="43" fill="${couleur}"/>${glyphe}`,
);

const GLYPHES = {
  // Tornade — réveille votre Tornade
  tornade: `<g fill="none" stroke="${NOIR}" stroke-width="8.4" stroke-linecap="round">
      <ellipse cx="50" cy="25" rx="30" ry="11.5"/>
      <path d="M19.5 32c8.5 8.4 29 11.5 47 7.5"/>
      <path d="M24 47c8.5 7.4 25 9.5 39 6"/>
      <path d="M31 61c7 5.6 18 7 26 4.2"/>
      <path d="M40 73.5c2 6.2 7.4 9.8 13.5 7.6"/>
      <path d="M44 86c3.2 4.2 9 4.4 12.5.8"/>
    </g>`,
  // Vache — retournez un jeton de votre équipe
  vache: `<g fill="${NOIR}">
      <path d="M30.5 24.5c-3.4-1-6 .6-7 4-1.1 3.9.6 8.4 4 11.8-1.6 2.6-2.6 5.5-2.9 8.6-3.3-1.6-6.6-1.5-9 .6-3 2.6-3 7 .2 10.3 2.6 2.7 6.3 3.8 9.6 3.1 3.5 8.5 12.9 14.4 24.6 14.4s21.1-5.9 24.6-14.4c3.3.7 7-.4 9.6-3.1 3.2-3.3 3.2-7.7.2-10.3-2.4-2.1-5.7-2.2-9-.6-.3-3.1-1.3-6-2.9-8.6 3.4-3.4 5.1-7.9 4-11.8-1-3.4-3.6-5-7-4-3.3 1-6.2 4-8 8.2-3.4-1.5-7.3-2.3-11.5-2.3s-8.1.8-11.5 2.3c-1.8-4.2-4.7-7.2-8-8.2z"/>
      <ellipse cx="38.5" cy="50" rx="4.4" ry="5.6" fill="#fff"/>
      <ellipse cx="61.5" cy="50" rx="4.4" ry="5.6" fill="#fff"/>
      <circle cx="38.5" cy="51" r="2.4"/>
      <circle cx="61.5" cy="51" r="2.4"/>
      <ellipse cx="50" cy="65" rx="14.5" ry="9" fill="#fff"/>
      <ellipse cx="44.5" cy="64" rx="2.4" ry="3.1"/>
      <ellipse cx="55.5" cy="64" rx="2.4" ry="3.1"/>
    </g>`,
  // ZzZ — endormez un de vos voisins
  zzz: `<g fill="none" stroke="${NOIR}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M25 25h27L25 55h27" stroke-width="10.5"/>
      <path d="M58 41h21L58 65h21" stroke-width="8.6"/>
      <path d="M44 70h17L44 87h17" stroke-width="7"/>
    </g>`,
  // Éclair — passez votre lot et tentez d'attraper le joueur suivant
  eclair: `<path d="M58 14 L28 55 H47 L41 87 L72 45 H53 Z"
      fill="${NOIR}" stroke="${NOIR}" stroke-width="7" stroke-linejoin="round"/>`,
  // X — ce dé est bloqué, il ne se relance jamais
  x: `<path d="M33 33 67 67M67 33 33 67" stroke="${NOIR}" stroke-width="13.5" stroke-linecap="round"/>`,
  // Face neutre
  vide: `<circle cx="50" cy="50" r="8" fill="${NOIR}" opacity=".3"/>`,
};

export const COULEUR_FACE = {
  tornade: '#a8dcf2',
  vache: '#52a72e',
  zzz: '#c28ef2',
  eclair: '#f9b115',
  x: '#e2000f',
  vide: '#e6edf4',
};

// Face « ? » : le lot vient d'arriver, aucun dé n'a encore été lancé.
export const SVG_INCONNU = svg(`
  <circle cx="50" cy="50" r="43" fill="#c9cbcd"/>
  <path fill="${NOIR}" d="M50 20c-10.5 0-18.8 6.6-21.3 15.4-.9 3.2 1.2 6.3 4.5 6.9 3 .5 5.8-1.3 6.8-4.2C41.4 34 45.3 31.4 50 31.4c5.9 0 10.3 3.9 10.3 9 0 4-1.9 6.4-6.6 9.7-5.3 3.7-8 7.4-8 13.6v1.6c0 3.3 2.7 6 6 6s6-2.7 6-6v-.8c0-3.6 1.5-5.6 6.1-8.8 5.9-4.1 9.4-9 9.4-15.9C73.2 28.7 63.4 20 50 20z"/>
  <circle cx="50" cy="79" r="7.4" fill="${NOIR}"/>`);

// Dé en rotation : aucune face lisible, juste le volume qui tourne.
export const SVG_ROULANT = svg(`
  <circle cx="50" cy="50" r="43" fill="#e7ebef"/>
  <circle cx="50" cy="50" r="43" fill="url(#lueur)" opacity=".9"/>
  <defs><radialGradient id="lueur" cx="38%" cy="32%" r="72%">
    <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c2ccd6"/>
  </radialGradient></defs>`);

export const SVG_SYMBOLE = Object.fromEntries(
  Object.entries(GLYPHES).map(([id, g]) => [id, face(COULEUR_FACE[id], g)]),
);

// Version sans pastille, pour les usages en aplat (pictogrammes de liste).
export const SVG_GLYPHE = Object.fromEntries(
  Object.entries(GLYPHES).map(([id, g]) => [id, svg(g)]),
);

export const SVG_TORNADE_EVEILLEE = svg(`
  <g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round">
    <ellipse cx="50" cy="27.5" rx="25" ry="9.5"/>
    <path d="M26.5 34.5c6.5 6.6 22 9 37 6.2"/>
    <path d="M30.5 47c6.8 6 20 7.8 31.5 5.2"/>
    <path d="M35.5 59c5.6 4.6 14.5 5.8 21 3.6"/>
    <path d="M43 70.5c1.6 5.4 6 8.4 11 6.8"/>
  </g>`);

export const SVG_TORNADE_ENDORMIE = svg(`
  <g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity=".42">
    <ellipse cx="50" cy="31" rx="25" ry="9.5"/>
    <path d="M26.5 38c6.5 6.6 22 9 37 6.2"/>
    <path d="M30.5 50.5c6.8 6 20 7.8 31.5 5.2"/>
    <path d="M35.5 62.5c5.6 4.6 14.5 5.8 21 3.6"/>
  </g>
  <path d="M60 8h20L60 30h20" fill="none" stroke="currentColor" stroke-width="7"
    stroke-linecap="round" stroke-linejoin="round"/>`);

export const SVG_LOGO = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="96" height="96" rx="24" fill="#fff"/>
    <circle cx="50" cy="50" r="40" fill="#a8dcf2"/>
    <g fill="none" stroke="#141414" stroke-width="7" stroke-linecap="round">
      <ellipse cx="50" cy="29" rx="23" ry="9"/>
      <path d="M28 35.5c6 6.2 20.5 8.4 34.5 5.8"/>
      <path d="M32 47c6.4 5.6 18.6 7.3 29.4 4.9"/>
      <path d="M37 58.5c5.2 4.3 13.5 5.4 19.6 3.4"/>
      <path d="M44 69.5c1.5 5 5.6 7.8 10.3 6.4"/>
    </g>
  </svg>`;

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
    if (verrou) div.title = 'X — ce dé est bloqué, il ne peut plus être relancé';
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
  s.style.width = s.style.height = `${taille}px`;
  s.innerHTML = SVG_SYMBOLE[symbole] || '';
  return s;
}

/** Rend une exigence { vache: 3 } sous forme de suite de pastilles. */
export function suiteSymboles(requis, taille = 22) {
  const frag = document.createDocumentFragment();
  for (const [sym, n] of Object.entries(requis)) {
    for (let i = 0; i < n; i++) frag.appendChild(pastilleSymbole(sym, taille));
  }
  return frag;
}
