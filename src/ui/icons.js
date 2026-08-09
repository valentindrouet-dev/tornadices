// Symboles des dés et pictogrammes, en SVG inline (aucune ressource externe).

const svg = (contenu, vb = '0 0 100 100') =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${contenu}</svg>`;

export const SVG_SYMBOLE = {
  // Cloche — réveille la Tornade
  cloche: svg(`
    <path fill="currentColor" d="M50 12c-3.6 0-6.5 2.6-6.9 6-9.8 2.9-16.6 12-16.6 22.5 0 12.4-1.7 19.5-5.4 24.2-1.6 2-2.4 3.2-2.4 4.9 0 2.4 1.9 4.1 4.5 4.1h53.6c2.6 0 4.5-1.7 4.5-4.1 0-1.7-.8-2.9-2.4-4.9-3.7-4.7-5.4-11.8-5.4-24.2 0-10.5-6.8-19.6-16.6-22.5-.4-3.4-3.3-6-6.9-6z"/>
    <path fill="currentColor" d="M41 79.5c.9 5 5.1 8.5 9 8.5s8.1-3.5 9-8.5z"/>`),
  // Vache — retourne un jeton
  vache: svg(`
    <path fill="currentColor" d="M22 26c-6 0-10 4.5-10 11 0 7 4.5 12.5 10.6 13.6C21 54.4 20 58.8 20 63.5 20 76.5 33.4 87 50 87s30-10.5 30-23.5c0-4.7-1-9.1-2.6-12.9C83.5 49.5 88 44 88 37c0-6.5-4-11-10-11-5.6 0-10.2 3.6-12.9 9.2C60.6 32.6 55.5 31.5 50 31.5s-10.6 1.1-15.1 3.1C32.2 29.6 27.6 26 22 26z"/>
    <ellipse cx="37" cy="57" rx="4.6" ry="6" fill="#fff"/>
    <ellipse cx="63" cy="57" rx="4.6" ry="6" fill="#fff"/>
    <ellipse cx="50" cy="74" rx="15" ry="10" fill="#fff" opacity=".92"/>
    <circle cx="43.5" cy="74" r="2.8" fill="currentColor"/>
    <circle cx="56.5" cy="74" r="2.8" fill="currentColor"/>`),
  // ZzZ — endort un voisin
  zzz: svg(`
    <path fill="currentColor" d="M52 16h30c1.7 0 3 1.4 3 3.1 0 .8-.3 1.6-.8 2.2L62.6 45.5H82c1.7 0 3 1.4 3 3.1s-1.3 3.1-3 3.1H52c-1.7 0-3-1.4-3-3.1 0-.8.3-1.6.8-2.2l21.6-24.2H52c-1.7 0-3-1.4-3-3.1s1.3-3.1 3-3.1z"/>
    <path fill="currentColor" d="M18 52h26c1.6 0 2.8 1.3 2.8 2.9 0 .7-.2 1.4-.7 2L28.6 78H44c1.6 0 2.8 1.3 2.8 2.9S45.6 84 44 84H18c-1.6 0-2.8-1.3-2.8-2.9 0-.7.2-1.4.7-2L33.4 58H18c-1.6 0-2.8-1.3-2.8-2.9S16.4 52 18 52z"/>`),
  // Étoile — collision, ne se relance jamais
  etoile: svg(`
    <path fill="currentColor" d="M50 6l9.6 22.2L82 18.4 72.2 40.8 94 50l-21.8 9.2L82 81.6l-22.4-9.8L50 94l-9.6-22.2L18 81.6l9.8-22.4L6 50l21.8-9.2L18 18.4l22.4 9.8z"/>
    <path fill="#fff" d="M50 34l4.6 10.6L65 40l-4.6 10.6L71 55l-10.6 4.4L65 70l-10.4-4.6L50 76l-4.6-10.6L35 70l4.6-10.6L29 55l10.6-4.4L35 40l10.4 4.6z" opacity=".55"/>`),
  vide: svg('<circle cx="50" cy="50" r="9" fill="currentColor" opacity=".35"/>'),
};

export const SVG_TORNADE_EVEILLEE = svg(`
  <path fill="currentColor" d="M14 16h72c2 0 3.5 1.6 3.5 3.5S88 23 86 23H14c-2 0-3.5-1.6-3.5-3.5S12 16 14 16zm6 14h60c2 0 3.5 1.6 3.5 3.5S82 37 80 37H20c-2 0-3.5-1.6-3.5-3.5S18 30 20 30zm6 14h48c2 0 3.5 1.6 3.5 3.5S76 51 74 51H26c-2 0-3.5-1.6-3.5-3.5S24 44 26 44zm7 14h34c2 0 3.5 1.6 3.5 3.5S69 65 67 65H33c-2 0-3.5-1.6-3.5-3.5S31 58 33 58zm8 14h18c2 0 3.5 1.6 3.5 3.5S65 79 63 79H41c-2 0-3.5-1.6-3.5-3.5S39 72 41 72z"/>
  <circle cx="38" cy="41" r="3.4" fill="#fff"/><circle cx="62" cy="41" r="3.4" fill="#fff"/>`);

export const SVG_TORNADE_ENDORMIE = svg(`
  <path fill="currentColor" opacity=".45" d="M14 16h72c2 0 3.5 1.6 3.5 3.5S88 23 86 23H14c-2 0-3.5-1.6-3.5-3.5S12 16 14 16zm6 14h60c2 0 3.5 1.6 3.5 3.5S82 37 80 37H20c-2 0-3.5-1.6-3.5-3.5S18 30 20 30zm6 14h48c2 0 3.5 1.6 3.5 3.5S76 51 74 51H26c-2 0-3.5-1.6-3.5-3.5S24 44 26 44zm7 14h34c2 0 3.5 1.6 3.5 3.5S69 65 67 65H33c-2 0-3.5-1.6-3.5-3.5S31 58 33 58zm8 14h18c2 0 3.5 1.6 3.5 3.5S65 79 63 79H41c-2 0-3.5-1.6-3.5-3.5S39 72 41 72z"/>
  <path fill="currentColor" d="M62 8h18c1.2 0 2 .9 2 2 0 .5-.2 1-.5 1.4L69.4 25H80c1.2 0 2 .9 2 2s-.8 2-2 2H62c-1.2 0-2-.9-2-2 0-.5.2-1 .5-1.4L72.6 12H62c-1.2 0-2-.9-2-2s.8-2 2-2z"/>`);

export const SVG_LOGO = `
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="1" y="1" width="46" height="46" rx="12" fill="#fff"/>
    <path fill="#2e9be6" d="M8 11h32a2.6 2.6 0 010 5.2H8A2.6 2.6 0 018 11z"/>
    <path fill="#e8b21f" d="M11 19h26a2.6 2.6 0 010 5.2H11A2.6 2.6 0 0111 19z"/>
    <path fill="#d4453f" d="M14 27h20a2.6 2.6 0 010 5.2H14A2.6 2.6 0 0114 27z"/>
    <path fill="#46b25e" d="M19 35h10a2.4 2.4 0 010 4.8H19A2.4 2.4 0 0119 35z"/>
  </svg>`;

/** Un dé rendu comme une face de dé physique. */
export function faceDe(symbole, { verrou = false, taille = 'moyen' } = {}) {
  const div = document.createElement('div');
  div.className = `de de--${taille}${verrou ? ' de--verrou' : ''}${symbole ? '' : ' de--vierge'}`;
  div.dataset.sym = symbole || '';
  if (symbole) div.innerHTML = SVG_SYMBOLE[symbole] || '';
  if (verrou) div.title = 'Étoile verrouillée — ce dé ne peut plus être relancé';
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
