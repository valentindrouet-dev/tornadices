// Compteur de version — incrémenté à chaque modification livrée.
export const VERSION = '1.3';
export const BUILD_DATE = '2026-08-09';

// Journal des versions : le plus récent en premier.
export const CHANGELOG = [
  {
    version: '1.3',
    date: '09/08/2026',
    notes: [
      'Les cinq faces du dé sont dessinées d’après le matériel : tornade, vache, ZzZ, éclair et X, pastille de couleur et pictogramme noir.',
      'Répartition de base d’un dé : 2 tornades, 1 X, 1 ZzZ, 1 vache, 1 éclair — modifiable face par face dans les options de partie comme au Laboratoire.',
      'On choisit désormais quels dés relancer : cliquez un dé pour le garder, les autres repartent. Autant de fois qu’on veut.',
      'Un X fige son dé et clignote en rouge : il ne se relance jamais. Au deuxième X, le lot part sans rien tenter.',
      'L’attrape passe à trois éclairs — passer son lot et tenter de toucher le joueur suivant.',
      'La zone de chaque joueur s’entoure d’un halo dès que la combinaison sort : rouge à deux X, jaune clignotant orange à trois éclairs, bleu à trois tornades, vert à trois vaches, violet à trois ZzZ.',
      'Les lots traversent la table en vol d’un joueur à l’autre : on voit enfin les dés changer de main.',
      'Les symboles sont nettement plus gros sur la table et dans le panneau de jeu.',
      'Le Laboratoire compare deux stratégies : relancer tout (calcul exact) ou garder les dés utiles (estimation par tirages) — l’écart mesure ce que rapporte la relance choisie.',
      'Les IA gardent elles aussi leurs dés utiles au lieu de tout relancer.',
    ],
  },
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
