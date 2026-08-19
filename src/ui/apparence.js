// Apparence des faces : illustration et nom, changeables à tout moment.
//
// Deux faces se personnalisent — la Tornade bleue, qui porte le Réveil, et
// l'Abri vert. Le pouvoir ne bouge pas : c'est le même symbole pour le moteur,
// avec la même combinaison et le même effet. Seuls le dessin et le nom affiché
// changent, pour essayer une autre direction artistique sans toucher aux règles.
//
// Trois états possibles pour chaque face :
//   · rien d'enregistré        → l'apparence officielle ci-dessous ;
//   · une entrée enregistrée   → ce qu'elle dit, y compris `image: ''` qui
//                                redemande explicitement le dessin d'avant ;
//   · l'entrée effacée         → retour à l'officielle.
//
// Ce module ne dessine rien : il ne fait que retenir le choix. `icons.js`
// résout l'identifiant en image — un modèle fourni, ou le fichier importé.

import { store } from './store.js?v=1.52';
import { SYMBOLES } from '../core/config.js?v=1.52';

/** Les seules faces personnalisables : les deux que le jeu met en avant. */
export const FACES_PERSONNALISABLES = ['tornade', 'vache'];

/**
 * L'apparence officielle du jeu — ce que le site montre sans aucun réglage.
 * La face bleue est un réveil, la face verte un abri — une maison. Les
 * identifiants de symbole, eux, ne changent pas : le moteur continue de parler
 * de « tornade » et de « vache », et toutes les règles enregistrées restent
 * valables.
 */
export const APPARENCE_OFFICIELLE = {
  tornade: { nom: 'Réveil', image: 'reveil' },
  vache: { nom: 'Abri', image: 'abri' },
};

/**
 * Illustrations proposées, par face. `''` reprend le dessin d'avant — celui qui
 * portait le nom du symbole. Une image importée est stockée telle quelle, en
 * `data:`, et n'apparaît pas dans cette liste.
 */
export const MODELES_FACE = {
  tornade: [
    ['reveil', 'Réveil (officiel)'],
    ['', 'Tornade (ancien dessin)'],
  ],
  vache: [
    ['abri', 'Abri (officiel)'],
    ['tornadeVerte', 'Tornade verte'],
    ['', 'Vache (premier dessin)'],
  ],
};

/** Nom proposé avec chaque illustration : le dessin et le nom vont ensemble. */
export const NOM_MODELE = {
  reveil: 'Réveil',
  abri: 'Abri',
  tornadeVerte: 'Tornade',
  '': null, // le dessin d'avant reprend le nom du symbole
};

const CLE = 'apparenceFaces';

/** Toutes les personnalisations enregistrées, par symbole. */
export function apparences() {
  const brut = store.get(CLE, {});
  return brut && typeof brut === 'object' ? brut : {};
}

/** Le nom du symbole tel que le jeu le nommait avant l'habillage officiel. */
export function nomAncien(sym) {
  return (SYMBOLES[sym] && SYMBOLES[sym].nom) || sym;
}

/** L'apparence effective d'une face : l'enregistrée, sinon l'officielle. */
function apparenceDe(sym) {
  const officielle = APPARENCE_OFFICIELLE[sym] || {};
  const a = apparences()[sym];
  if (!a) return { nom: officielle.nom || nomAncien(sym), image: officielle.image || '' };
  return {
    // Un nom vidé reprend celui de l'officielle : le champ ne reste jamais muet.
    nom: a.nom || officielle.nom || nomAncien(sym),
    // `image: ''` est un choix, pas une absence : c'est le dessin d'avant.
    image: a.image === undefined ? (officielle.image || '') : a.image,
  };
}

/**
 * Règle l'apparence d'une face. Contrairement au nom, l'illustration retient un
 * `''` explicite — c'est ainsi qu'on redemande le dessin d'avant.
 */
export function reglerApparence(sym, { nom, image } = {}) {
  if (!FACES_PERSONNALISABLES.includes(sym)) return;
  const tout = apparences();
  const avant = tout[sym] || {};
  tout[sym] = {
    nom: nom === undefined ? (avant.nom || '') : String(nom || ''),
    image: image === undefined ? (avant.image ?? '') : String(image || ''),
  };
  store.set(CLE, tout);
}

/** Remet une face au dé officiel. */
export function reinitialiserApparence(sym) {
  const tout = apparences();
  delete tout[sym];
  store.set(CLE, tout);
}

/** Remet les deux faces au dé officiel. */
export function reinitialiserApparences() {
  store.set(CLE, {});
}

/** Le nom affiché d'un symbole. */
export function nomSymbole(sym) {
  if (!APPARENCE_OFFICIELLE[sym] && !apparences()[sym]) return nomAncien(sym);
  return apparenceDe(sym).nom;
}

/** L'illustration choisie : identifiant de modèle, `data:` importé, ou `''`. */
export function imageSymbole(sym) {
  return apparenceDe(sym).image;
}

/** Vrai si la face s'écarte de l'apparence officielle. */
export function faceModifiee(sym) {
  const a = apparences()[sym];
  if (!a) return false;
  const officielle = APPARENCE_OFFICIELLE[sym] || {};
  return apparenceDe(sym).nom !== (officielle.nom || nomAncien(sym))
    || apparenceDe(sym).image !== (officielle.image || '');
}
