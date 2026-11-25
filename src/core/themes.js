// Les habillages du jeu. « Ranch » : Vaches, Poules et Cow-boy. « Engins » :
// Budies, Nadoes et le Docteur Nado. Seuls les noms, les couleurs et les jetons
// changent : les identifiants (bleu, jaune, vert ; reveil, abri…) et les règles
// restent les mêmes. `appliquerTheme` réécrit en place les objets de config.js,
// que toutes les pages lisent déjà.

import { EQUIPES, COMBOS, CARTES_PAR_ID } from './config.js?v=2.17';

export const THEMES = {
  ranch: { id: 'ranch', nom: 'Ranch' },
  engins: { id: 'engins', nom: 'Engins' },
};

/** Les mots que l'interface emploie et qui changent avec le thème. */
export const MOTS = {};

const VALEURS = {
  ranch: {
    equipes: {
      bleu: { nom: 'Bleus', animal: 'Vaches', un: 'Vache', embleme: 'vache', hex: '#3aa9f2', clair: '#e3f1fc', couleur: 'bleus', jetons: 'Jetons Vache' },
      jaune: { nom: 'Jaunes', animal: 'Poules', un: 'Poule', embleme: 'poule', hex: '#e8b21f', clair: '#fdf3d8', couleur: 'jaunes', jetons: 'Jetons Poule' },
      vert: { nom: 'Vert', animal: 'Cow-boy', un: 'Cow-boy', embleme: 'cowboy', hex: '#46b25e', clair: '#e4f5e9', couleur: 'vert', jetons: 'Jetons Cow-boy' },
    },
    combos: {
      reveil: { nom: 'Réveil', effet: 'Retournez votre Carte Rôle sur sa face réveillée.' },
      abri: { nom: 'Abri', effet: 'Récupérez 1 Jeton Équipe sur la Carte Tornade. La première équipe à récupérer son dernier jeton gagne la manche.' },
      sommeil: { nom: 'Sommeil', effet: 'Endormez un de vos voisins, s’il est réveillé.' },
      envol: { nom: 'Envol', effet: 'Passez immédiatement votre lot au joueur suivant.' },
    },
    cartes: {
      vaches: { nom: 'Tornade de Vaches', texte: 'Les Vaches gagnent 2 Cartes Tornade à cette manche' },
      poules: { nom: 'Tornade de Poules', texte: 'Les Poules gagnent 2 Cartes Tornade à cette manche' },
    },
    mots: {
      endormi: 'Endormi', eveille: 'Réveillé', endort: 'Endort', dejaEndormis: 'Voisins déjà endormis',
      reveilleEquipe: 'Réveille son équipe', equipeEveillee: 'Équipe déjà réveillée',
      gagneParAbri: 'en récupérant le dernier jeton', faceDepart: 'face endormie',
    },
  },
  engins: {
    equipes: {
      bleu: { nom: 'Nadoes', animal: 'Nadoes', un: 'Nado', embleme: 'nado', hex: '#2386d1', clair: '#d9edff', couleur: 'bleus', jetons: 'Jetons Nadoes' },
      jaune: { nom: 'Budies', animal: 'Budies', un: 'Budie', embleme: 'banane', hex: '#f58b2a', clair: '#ffe7c7', couleur: 'orange', jetons: 'Jetons Bananes' },
      vert: { nom: 'Docteur', animal: 'Docteur Nado', un: 'Docteur', embleme: 'de', hex: '#9254cb', clair: '#ede0fa', couleur: 'violet', jetons: 'Jetons Dés' },
    },
    combos: {
      reveil: { nom: 'Redresse !', effet: 'Votre engin se redresse dans la tornade : retournez votre Carte Rôle face redressée.' },
      abri: { nom: 'Sauvé !', effet: 'Récupérez 1 jeton de votre équipe au milieu de la tornade. La première équipe à récupérer son dernier jeton gagne la manche.' },
      sommeil: { nom: 'Retourne !', effet: 'Retournez l’engin d’un voisin à l’envers, s’il est redressé.' },
      envol: { nom: 'Pousse !', effet: 'La tornade pousse votre lot au joueur suivant.' },
    },
    cartes: {
      vaches: { nom: 'Tornade des Nadoes', texte: 'Les Nadoes gagnent 2 Cartes Tornade à cette manche' },
      poules: { nom: 'Tornade des Budies', texte: 'Les Budies gagnent 2 Cartes Tornade à cette manche' },
    },
    mots: {
      endormi: 'À l’envers', eveille: 'Redressé', endort: 'Retourne', dejaEndormis: 'Voisins déjà à l’envers',
      reveilleEquipe: 'Redresse son équipe', equipeEveillee: 'Équipe déjà redressée',
      gagneParAbri: 'en récupérant son dernier jeton', faceDepart: 'face « à l’envers »',
    },
  },
};

/** Les personnages qu'un joueur peut incarner, par équipe (thème Engins). */
export const PERSONNAGES = {
  jaune: [
    { id: 'bigbudi', nom: 'Big Budi', titre: 'l’Orang-Outan Pilote' },
    { id: 'octavius', nom: 'Octavius', titre: 'le Poulpe Savant' },
    { id: 'leon', nom: 'Léon Tournepaon', titre: 'le Paon Volant' },
  ],
  bleu: [
    { id: 'baignoire', nom: 'La Baignoire', titre: 'propulsée à la bonde' },
    { id: 'assemblage', nom: 'L’Assemblage', titre: 'fauteuils, hélices et volants' },
    { id: 'volants', nom: 'Les Nadoes volants', titre: 'accrochés les uns aux autres' },
  ],
  vert: [
    { id: 'docteur', nom: 'Docteur Viktor Nado', titre: 'à cheval sur son Dé-Générateur' },
  ],
};
const PERSO_PAR_ID = Object.fromEntries(Object.values(PERSONNAGES).flat().map((p) => [p.id, p]));

/** Le personnage d'un joueur : celui qu'il a choisi, sinon celui de son rang dans l'équipe. */
export function personnage(equipe, choisi, rang = 0) {
  const liste = PERSONNAGES[equipe] || [];
  return (choisi && liste.find((p) => p.id === choisi)) || liste[rang % liste.length] || null;
}
export const personnageParId = (id) => PERSO_PAR_ID[id] || null;

let actuel = 'ranch';
export const themeActuel = () => actuel;

/** Passe tout le site sur un thème. Rend vrai s'il a changé. */
export function appliquerTheme(id) {
  const t = VALEURS[id] ? id : 'ranch';
  const v = VALEURS[t];
  for (const [eq, champs] of Object.entries(v.equipes)) Object.assign(EQUIPES[eq], champs);
  for (const c of COMBOS) Object.assign(c, v.combos[c.id]);
  for (const [carte, champs] of Object.entries(v.cartes)) Object.assign(CARTES_PAR_ID[carte], champs);
  Object.assign(MOTS, v.mots);
  const change = t !== actuel;
  actuel = t;
  return change;
}

/** Recopie les noms du thème dans une configuration déjà faite (partie en cours). */
export function renommerConfig(cfg) {
  for (const c of cfg.combos || []) {
    const def = COMBOS.find((x) => x.id === c.id);
    if (def) { c.nom = def.nom; c.effet = def.effet; }
  }
}

/** Le nom d'une combinaison, prêt à crier : « Réveil ! », « Redresse ! ». */
export const cri = (nom) => (/!\s*$/.test(nom) ? nom : `${nom} !`);

appliquerTheme('ranch');
