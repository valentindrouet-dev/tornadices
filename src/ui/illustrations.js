// Les illustrations imprimées du jeu : cartes Tornade, cartes d'équipe…
//
// Chaque image dit ce qu'elle montre — la combinaison imprimée sur la carte, les
// combinaisons d'une carte d'équipe — et n'est affichée que tant que le jeu joue
// exactement cela. Qu'on règle autrement une combinaison dans les Réglages, et
// l'interface revient au dessin : une carte imprimée qui ne dirait plus la règle
// en vigueur tromperait la table.
//
// Ajouter une illustration, c'est poser le fichier dans `assets/` et le déclarer
// ici. Rien d'autre à toucher : la table, les Réglages et la révélation de la
// carte la trouvent d'eux-mêmes.

import { VERSION } from '../version.js?v=1.80';
import { requisCarte, requisPourEquipe, auxCochons } from '../core/config.js?v=1.80';

// ── Cartes Tornade ───────────────────────────────────────────────────────────
// Par identifiant de carte : l'image, ses dimensions, et la combinaison qu'elle
// imprime. Les dimensions servent à réserver la place avant le chargement : sans
// elles, la table calculerait le centre avec une image encore vide.
export const ILLUSTRATIONS_CARTES = {
  spSommeil: {
    src: 'assets/cartes/tornade-du-sommeil.webp', taille: [1432, 1948], requis: { zzz: 4 },
  },
};

// ── Cartes d'équipe ──────────────────────────────────────────────────────────
// Par équipe, une face par état de la Tornade — « endormie » ou « active » —
// avec les combinaisons qu'elle imprime. « Passe ou Rattrape », sur la face
// endormie des Poules, c'est l'Échec qui tente l'attrape : la carte ne vaut donc
// que si c'est bien l'Échec qui porte le contact.
export const ILLUSTRATIONS_EQUIPES = {
  jaune: {
    endormie: {
      src: 'assets/equipes/poules-endormie.webp',
      taille: [1434, 1948],
      nom: 'Poules — Tornade endormie',
      combos: { reveil: { tornade: 3 }, blocage: { x: 2 } },
      attrapeSur: 'echec',
    },
  },
};

/** Deux exigences identiques, dé pour dé : { zzz: 4 } et { zzz: 4, x: 0 } le sont. */
function memeRequis(a, b) {
  const propre = (r) => Object.entries(r || {}).filter(([, n]) => n > 0)
    .sort(([x], [y]) => x.localeCompare(y)).map(([s, n]) => `${s}${n}`).join(',');
  return propre(a) === propre(b);
}

/** L'adresse d'une image, marquée de la version pour que le cache la suive. */
const adresse = (src) => `${src}?v=${VERSION}`;

/**
 * L'illustration d'une carte Tornade, si elle existe et dit encore vrai : sa
 * combinaison imprimée doit être celle que le jeu réclame. Rend l'adresse et
 * les dimensions de l'image — `{ src, largeur, hauteur }` — ou rien.
 */
export function illustrationCarte(cfg, carte) {
  const illu = carte && ILLUSTRATIONS_CARTES[carte.id];
  if (!illu) return null;
  if (carte.combo && !memeRequis(requisCarte(cfg, carte.combo), illu.requis)) return null;
  return { src: adresse(illu.src), largeur: illu.taille[0], hauteur: illu.taille[1] };
}

/**
 * L'illustration de la carte d'une équipe dans un état donné, si elle dit
 * exactement ce que la table joue : les mêmes combinaisons, avec les mêmes dés,
 * et le même déclencheur d'attrape. `jouables` : les combinaisons de base que la
 * table affiche pour cet état.
 */
export function illustrationEquipe(cfg, equipe, etat, jouables) {
  // À trois joueurs, personne n'est plus une Poule ni une Vache : chacun est un
  // Cochon, et sa carte n'est pas celle de l'équipe.
  if (auxCochons(cfg)) return null;
  const illu = ILLUSTRATIONS_EQUIPES[equipe] && ILLUSTRATIONS_EQUIPES[equipe][etat];
  if (!illu) return null;
  if (illu.attrapeSur && cfg.attrapeSur !== illu.attrapeSur) return null;
  // L'Attaque n'est pas jouée quand c'est l'Échec qui porte l'attrape : la table
  // l'affiche « hors jeu », la carte imprimée n'a pas à la montrer.
  const enJeu = jouables.filter((c) => !(c.id === 'collision' && cfg.attrapeSur === 'echec'));
  const imprimees = Object.keys(illu.combos);
  if (enJeu.length !== imprimees.length) return null;
  const fideles = enJeu.every((c) => illu.combos[c.id]
    && memeRequis(requisPourEquipe(cfg, c.id, c.requis, equipe), illu.combos[c.id]));
  return fideles
    ? { src: adresse(illu.src), nom: illu.nom, largeur: illu.taille[0], hauteur: illu.taille[1] }
    : null;
}

// ── Les jetons imprimés ──────────────────────────────────────────────────────
// Un jeton par animal : la vache des Bleus, la poule des Jaunes, le cow-boy du
// Vert. À la table à trois, chacun joue un Cochon : ces jetons-là n'y sont pas,
// et l'on garde le jeton dessiné, aux couleurs des Cochons.
export const JETONS_IMPRIMES = {
  bleu: 'assets/jetons/vache.png',
  jaune: 'assets/jetons/poule.png',
  vert: 'assets/jetons/cowboy.png',
};

/** L'image du jeton d'une équipe, ou null quand il n'y en a pas à cette table. */
export function jetonImprime(cfg, equipe) {
  if (auxCochons(cfg)) return null;
  return JETONS_IMPRIMES[equipe] || null;
}

// ── La carte de sens imprimée ────────────────────────────────────────────────
// Ses deux faces : les flèches tournent dans le sens des aiguilles d'une montre
// sur l'une, dans l'autre sens sur l'autre. On la retourne pour changer de sens.
export const CARTES_SENS = {
  horaire: { src: 'assets/sens/horaire.webp', largeur: 1340, hauteur: 1852 },
  antihoraire: { src: 'assets/sens/antihoraire.webp', largeur: 1318, hauteur: 1828 },
};

/** La face de la carte de sens qui dit ce sens-là (1 : horaire, -1 : antihoraire). */
export function faceCarteSens(sens) {
  return sens > 0 ? CARTES_SENS.horaire : CARTES_SENS.antihoraire;
}
