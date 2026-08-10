// Compteur de version — incrémenté à chaque modification livrée.
export const VERSION = '1.9';
export const BUILD_DATE = '2026-08-10';

// Journal des versions : le plus récent en premier.
export const CHANGELOG = [
  {
    version: '1.9',
    date: '10/08/2026',
    notes: [
      'Un joueur ne tient plus jamais deux lots : quand deux se rencontrent, celui qu’il avait en main est aussitôt poussé vers son voisin, et il enchaîne sur le nouveau. Le journal affiche « Poussé ».',
      'Deux causes du double lot corrigées : un même joueur pouvait recevoir plusieurs lots en début de manche, et un lot en vol pouvait atterrir après la fin de la manche.',
      'Les scores, la carte et la pioche ne recouvrent plus ni un joueur ni la surface de jeu : les sièges et le tapis sont calculés dans l’espace qui reste une fois ces trois panneaux réservés, à chaque changement de taille de fenêtre.',
      'En pause, plus rien ne bouge — les dés cessent de tourner et les halos de battre.',
    ],
  },
  {
    version: '1.8',
    date: '09/08/2026',
    notes: [
      'Correction de fond du cache navigateur : chaque module porte maintenant le numéro de version dans son adresse, donc une nouvelle livraison change toutes les URL et rien ne peut rester périmé.',
      'Un script de version (scripts/version.mjs) réestampille tout le site en une commande, pour que le problème ne revienne pas.',
      'Le site se déploie tout seul sur GitHub Pages à chaque poussée de la branche.',
    ],
  },
  {
    version: '1.7',
    date: '09/08/2026',
    notes: [
      'Détection des versions périmées : le navigateur garde les modules en cache et pouvait faire tourner un écran en retard sans qu’on le voie. Le site relit maintenant sa version sur le serveur et propose de recharger si l’écran n’est pas à jour.',
    ],
  },
  {
    version: '1.6',
    date: '09/08/2026',
    notes: [
      'Un lot qui arrive chez un joueur qui en tient déjà un passe devant : le lot en cours est poussé de côté et se reprend après.',
      'La table est réorganisée : carte de la manche en haut à gauche, pioche des Journées restantes en haut à droite, points des équipes en bas à gauche et bien plus gros.',
      'Vraie transition entre les manches : grand message central, les dés reviennent au centre puis repartent vers l’équipe qui a perdu, et la carte suivante glisse depuis la pioche par-dessus la précédente. Durée réglable dans Variables.',
      'Le statut de la Tornade saute aux yeux : pastille ÉVEILLÉE aux couleurs de l’équipe ou ENDORMIE en gris, et le siège entier change de teinte.',
      'Correction : un joueur humain ne relance plus un X « par mégarde ». Cet incident des règles suppose une vraie table — à l’écran l’interface interdit de toucher un dé figé. Il ne concerne plus que les IA.',
      'Chaque issue de tour est nommée dans le journal : Passé, Mégarde, Bloqué, Réveil !, Vache !, Attrape ! — on lit exactement pourquoi le lot est parti.',
    ],
  },
  {
    version: '1.5',
    date: '09/08/2026',
    notes: [
      'Chaque dé roule pour son propre compte : on peut en relancer un pendant qu’un autre tourne encore, et cliquer frénétiquement de l’un à l’autre.',
      'Un dé qui roule n’affiche plus de faces qui défilent — illisible — mais un dé blanc-gris qui tourne sur lui-même.',
      'Un lot qui arrive en main porte la face « ? » : aucun symbole tant qu’il n’a pas été lancé.',
      'Un bandeau annonce au centre de la table les moments qui comptent : un joueur se réveille, en endort un autre, retourne une vache, ou en attrape un.',
      'Le journal de droite montre la combinaison finale de chaque tour : les quatre dés du joueur et son issue — Réveil !, Vache !, Attrape !, Bloqué ou Échec.',
      'On voit ainsi pourquoi un lot part : ce n’est pas seulement à deux X, mais dès qu’une combinaison sort, puisqu’elle est jouée d’office.',
    ],
  },
  {
    version: '1.4',
    date: '09/08/2026',
    notes: [
      'Toute combinaison servie est désormais jouée d’office : on ne relance plus par-dessus, le lot part et l’effet s’applique.',
      'Un clic sur un dé le relance aussitôt ; la barre espace relance tous les dés libres d’un coup.',
      'Les dés roulent une seconde à l’écran, faces qui défilent : le résultat n’apparaît qu’une fois posés.',
      'Un temps de constat laisse voir le résultat avant que le lot ne quitte la main — sans lui, on ne comprenait pas ce qui venait de se passer.',
      'Le passage au voisin dure une seconde et se voit traverser la table, à la durée exacte réglée.',
      'Nouveau menu Variables, à côté de « Commencer la partie » : faces des dés, combinaisons requises, rythme de la table, mise en place, adresse, cartes Journée et graine — tout y est réuni.',
      'Ces trois durées comptent dans le temps de jeu : les parties passent de 2-3 min à 5-7 min, au plus près des 10 min annoncées sur la boîte.',
    ],
  },
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
