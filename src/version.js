// Compteur de version — incrémenté à chaque modification livrée.
export const VERSION = '1.2';
export const BUILD_DATE = '2026-08-09';

// Journal des versions : le plus récent en premier.
export const CHANGELOG = [
  {
    version: '1.2',
    date: '09/08/2026',
    notes: [
      'Le titre reprend les couleurs des équipes : lettres bleues et jaunes en alternance, et les deux lettres du centre en vert, comme le joueur solo au milieu de la table.',
      'Toute l’interface passe au bleu ciel — fond dégradé bleuté, boutons et pastilles bleus, gris froids — pour se distinguer nettement de Camino.',
      'Le logo et la favicone deviennent une tornade bleue à pointe jaune et verte.',
      'Les couleurs d’équipe restent celles du jeu ; le bleu des Bleus a été légèrement éclairci pour ne pas se confondre avec le bleu d’interface.',
    ],
  },
  {
    version: '1.1',
    date: '09/08/2026',
    notes: [
      'Première table de jeu virtuelle TornaDices : 3 à 9 joueurs, chaque siège au choix Humain ou IA, en temps réel autour d’une table circulaire.',
      'Moteur de jeu à événements datés — les mêmes règles servent la partie jouée et la simulation, donc les statistiques décrivent bien le jeu réel.',
      'Les quatre symboles (cloche, vache, ZzZ, étoile), les combinaisons, les 12 cartes Journée et le tableau de mise en place sont implémentés d’après les règles V4.5.',
      'Laboratoire d’équilibrage : campagnes de parties simulées, taux de victoire par équipe, durées, collisions, fréquence de chaque combinaison et avantage de la place à table.',
      'Onglet Probabilités : calcul exact (multinomial + chaîne de Markov absorbante) des chances de réussir chaque combinaison avant la collision forcée à 2 étoiles.',
      'Tout est réglable : nombre de dés, nombre et contenu des faces, seuils des combinaisons, jetons, lots, cartes à gagner, adresse et vitesse des joueurs.',
      'Quatre profils d’IA (Prudent, Équilibré, Téméraire, Hasard) avec vitesse de lancer et adresse propres à chaque joueur.',
      'Historique des parties avec export CSV, et réglages conservés d’une session à l’autre.',
    ],
  },
];
