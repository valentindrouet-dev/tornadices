// Apparence des faces : illustration et nom, changeables à tout moment.
//
// Deux faces se personnalisent — la Tornade (bleue, combinaison « Réveil ») et
// la Vache (verte). Le pouvoir ne bouge pas : c'est le même symbole pour le
// moteur, avec la même combinaison et le même effet. Seuls le dessin et le nom
// affiché changent, pour essayer une autre direction artistique sans toucher
// aux règles.
//
// Ce module ne dessine rien : il ne fait que retenir le choix. `icons.js`
// résout l'identifiant en image — un modèle fourni, ou le fichier importé.

import { store } from './store.js?v=1.36';
import { SYMBOLES } from '../core/config.js?v=1.36';

/** Les seules faces personnalisables : les deux que le jeu met en avant. */
export const FACES_PERSONNALISABLES = ['tornade', 'vache'];

/**
 * Modèles d'illustration fournis. `''` garde le dessin d'origine ; les autres
 * identifiants sont résolus par `icons.js`. Une image importée est stockée
 * telle quelle, en `data:`.
 */
export const MODELES_FACE = {
  tornade: [
    ['', 'Tornade (d’origine)'],
    ['reveil', 'Réveil'],
  ],
  vache: [
    ['', 'Vache (d’origine)'],
    ['tornadeVerte', 'Tornade verte'],
  ],
};

/** Nom proposé avec chaque modèle : changer le dessin sans le nom n'a pas de sens. */
export const NOM_MODELE = {
  reveil: 'Réveil',
  tornadeVerte: 'Tornade',
};

const CLE = 'apparenceFaces';

/** Toutes les personnalisations en cours, par symbole. */
export function apparences() {
  const brut = store.get(CLE, {});
  return brut && typeof brut === 'object' ? brut : {};
}

/**
 * Règle l'apparence d'une face. `nom` vide reprend le nom d'origine, `image`
 * vide reprend le dessin d'origine.
 */
export function reglerApparence(sym, { nom, image } = {}) {
  if (!FACES_PERSONNALISABLES.includes(sym)) return;
  const tout = apparences();
  const avant = tout[sym] || {};
  const suivant = {
    nom: nom === undefined ? (avant.nom || '') : String(nom || ''),
    image: image === undefined ? (avant.image || '') : String(image || ''),
  };
  // Une face revenue à son état d'origine ne laisse pas d'entrée derrière elle :
  // les réglages enregistrés restent lisibles.
  if (!suivant.nom && !suivant.image) delete tout[sym];
  else tout[sym] = suivant;
  store.set(CLE, tout);
}

/** Remet les deux faces dans leur état d'origine. */
export function reinitialiserApparences() {
  store.set(CLE, {});
}

/** Le nom affiché d'un symbole : celui qu'on lui a donné, sinon le sien. */
export function nomSymbole(sym) {
  const a = apparences()[sym];
  if (a && a.nom) return a.nom;
  return (SYMBOLES[sym] && SYMBOLES[sym].nom) || sym;
}

/** L'illustration choisie : identifiant de modèle, `data:` importé, ou `''`. */
export function imageSymbole(sym) {
  const a = apparences()[sym];
  return (a && a.image) || '';
}

/** Vrai si la face a été personnalisée d'une façon ou d'une autre. */
export function faceModifiee(sym) {
  const a = apparences()[sym];
  return !!(a && (a.nom || a.image));
}
