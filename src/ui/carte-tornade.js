// La carte Tornade, dessinée comme le carton imprimé.
//
// Un cadre orange, un panneau crème ; en haut, le bandeau qui porte le titre —
// « TORNADE » en grand, le reste dessous — puis les dés de la combinaison, chacun
// dans sa case cerclée de noir, un filet orange noué d'une spirale, le texte en
// grandes capitales, et des nuages de tornade qui montent du bas. C'est la carte
// qu'on pose au centre de la table ; elle suit les réglages, là où l'image
// imprimée, elle, ne bouge pas.
//
// Toutes les mesures sont en `em` : la même carte sert au centre de la table et,
// plus grande, quand on la retourne en début de manche — il suffit de changer la
// taille de police du bloc.

import { h } from './dom.js?v=1.74';
import { pastilleSymbole } from './icons.js?v=1.74';

/**
 * Le titre sur deux lignes, comme sur le carton : « Tornade du Sommeil » donne
 * « Tornade » puis « du Sommeil ». Un titre en deux temps — « 1ère Journée —
 * Jour de chauffe » — se coupe au tiret. Le reste tient sur une ligne.
 */
export function titreEnDeuxLignes(nom) {
  const t = String(nom || '').trim();
  const tiret = t.split(/\s+—\s+/);
  if (tiret.length === 2) return tiret;
  const m = /^(Tornade|Journée)\s+(.+)$/i.exec(t);
  return m ? [m[1], m[2]] : [t, ''];
}

// La spirale du filet : des demi-cercles qui s'élargissent autour du centre.
const SPIRALE = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path d="M21 20a2 2 0 0 1 4 0a4 4 0 0 1-8 0a6 6 0 0 1 12 0a8 8 0 0 1-16 0a10 10 0 0 1 20 0"
    fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>`;

// Les nuages de tornade, en deux massifs qui montent des coins du bas — le
// milieu reste libre pour les jetons.
const NUAGES = `<svg viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
  <g fill="#f6a23c">
    <circle cx="6" cy="40" r="20"/><circle cx="28" cy="44" r="16"/><circle cx="46" cy="48" r="12"/>
    <circle cx="194" cy="40" r="20"/><circle cx="172" cy="44" r="16"/><circle cx="154" cy="48" r="12"/>
  </g>
  <g fill="#e8541f">
    <circle cx="0" cy="48" r="18"/><circle cx="22" cy="54" r="15"/>
    <circle cx="200" cy="48" r="18"/><circle cx="178" cy="54" r="15"/>
  </g>
</svg>`;

/**
 * La carte dessinée.
 *
 * @param {object} carte            la carte Tornade (nom, texte…)
 * @param {object} [options]
 *   requis   la combinaison à montrer — celle que réclame le jeu, réglages compris
 *   texte    le texte, déjà mis en forme ; le texte brut de la carte sinon
 *   jetons   ce qui se pose sur la carte : les jetons pris dans la tornade
 */
export function carteTornadeDessinee(carte, { requis = null, texte = null, jetons = null } = {}) {
  const [l1, l2] = titreEnDeuxLignes(carte.nom);
  const des = [];
  for (const [sym, n] of Object.entries(requis || {})) {
    for (let i = 0; i < n; i++) des.push(h('span.carte-tornade-de', pastilleSymbole(sym, 22)));
  }
  return h('div.carte-tornade',
    h('div.carte-tornade-panneau',
      // « TORNADE » tient en grand ; un premier mot plus long se resserre pour
      // rester dans le bandeau.
      h('div.carte-tornade-bandeau', {
        class: l1.length > 13 ? 'carte-tornade-bandeau--long'
          : l1.length > 8 ? 'carte-tornade-bandeau--moyen' : '',
      },
        h('span.l1', l1), l2 ? h('span.l2', l2) : null),
      des.length ? h('div.carte-tornade-des', ...des) : null,
      h('div.carte-tornade-filet', { html: SPIRALE }),
      h('div.carte-tornade-texte', texte || carte.texte),
      jetons ? h('div.carte-tornade-jetons', jetons) : null,
      h('div.carte-tornade-nuages', { html: NUAGES }),
    ),
  );
}
