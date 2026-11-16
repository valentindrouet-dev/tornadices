// Faces des dés et emblèmes d'équipe, en SVG inline (aucune ressource externe).
// Chaque face reprend le dé imprimé : une pastille de couleur, un dessin noir.

import { SYMBOLES } from '../core/config.js?v=2.02';

const svg = (contenu, vb = '0 0 100 100') =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${contenu}</svg>`;

const NOIR = '#141414';
const face = (couleur, glyphe) => svg(`<circle cx="50" cy="50" r="43" fill="${couleur}"/>${glyphe}`);

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


// Le soleil : votre Tornade se réveille. Un disque plein, huit longs rayons et
// huit courts entre eux — la même alternance que sur le dé imprimé.
const FACE_SOLEIL = face(SYMBOLES.soleil.couleur, `
  <circle cx="50" cy="50" r="15" fill="${NOIR}"/>
  <g stroke="${NOIR}" stroke-width="4.2" stroke-linecap="round">
    ${Array.from({ length: 16 }, (_, k) => {
    const a = (k * Math.PI) / 8;
    // Un rayon sur deux est court : c'est ce qui donne au soleil son relief.
    const r1 = 23;
    const r2 = k % 2 === 0 ? 41 : 32;
    const [cx, cy] = [Math.sin(a), -Math.cos(a)];
    return `<path d="M${(50 + cx * r1).toFixed(1)} ${(50 + cy * r1).toFixed(1)}`
        + `L${(50 + cx * r2).toFixed(1)} ${(50 + cy * r2).toFixed(1)}"/>`;
  }).join('\n    ')}
  </g>`);

// La grange : l'abri où l'on met les bêtes à couvert. Toit à deux pentes, grande
// porte, lucarne, bardage à droite et une barrière croisée à gauche.
const FACE_GRANGE = face(SYMBOLES.grange.couleur, `
  <g fill="none" stroke="${NOIR}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 50 34 33 50 26 66 33 78 50" stroke-width="8.6"/>
    <path d="M28 48v36h44V48" stroke-width="5.6"/>
    <path d="M76 55v29M84 60v24M69 84h20" stroke-width="4.4"/>
    <path d="M13 60h16v24H13zM13 60l16 24M29 60 13 84" stroke-width="4"/>
  </g>
  <g fill="${NOIR}">
    <rect x="45.5" y="42" width="9" height="8" rx="1"/>
    <path d="M38 60h24v24H38z"/>
  </g>`);

// La lune et ses ZzZ : le sommeil, sur un bleu de nuit clair.
const FACE_LUNE = face(SYMBOLES.lune.couleur, `
  <path fill="${NOIR}" d="M43 18A32 32 0 1 0 60 78 26 26 0 1 1 43 18Z"/>
  <g fill="none" stroke="${NOIR}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M62 26h18L62 45h18" stroke-width="8"/>
    <path d="M73 50h13L73 66h13" stroke-width="6.6"/>
    <path d="M64 70h10L64 82h10" stroke-width="5.4"/>
  </g>`);

// La tornade, sur le rouge du dé bloqué : ce dé est pris dans la tornade, il ne
// se relance plus. Des bandes pleines qui se resserrent, et la queue qui serpente.
const FACE_TORNADE_ROUGE = face(SYMBOLES.tornade.couleur, `
  <g fill="none" stroke="${NOIR}" stroke-linecap="round" stroke-linejoin="round">
    <g stroke-width="6.8">
      <ellipse cx="50" cy="27" rx="23" ry="8"/>
      <path d="M29 37c8.5 6 26 7.4 39 3"/>
      <path d="M34 48c7 5.2 19 6.2 29 2.6"/>
      <path d="M39 59c5.6 4 13 4.8 18.6 2.2"/>
    </g>
    <g stroke-width="5.8">
      <path d="M44 69c2.2 4.4 7 6 11.2 4"/>
      <path d="M47 79c2.2 3.2 6.4 3.6 9.2 1.2"/>
    </g>
    <g stroke-width="4.4">
      <path d="M21 38c-2.4-2.6-2.8-6-1-8.8"/>
      <path d="M79 38c2.4-2.6 2.8-6 1-8.8"/>
      <path d="M28 55c-1.8-2-2.2-4.8-.8-7"/>
      <path d="M72 55c1.8-2 2.2-4.8.8-7"/>
    </g>
  </g>`);


export const SVG_SYMBOLE = { soleil: FACE_SOLEIL, grange: FACE_GRANGE, lune: FACE_LUNE, tornade: FACE_TORNADE_ROUGE };

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
