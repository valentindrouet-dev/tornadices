// Compteur de version — incrémenté à chaque modification livrée.
export const VERSION = '1.18';
export const BUILD_DATE = '2026-08-11';

// Journal des versions : le plus récent en premier.
export const CHANGELOG = [
  {
    version: '1.18',
    date: '11/08/2026',
    notes: [
      'La vignette d’un joueur réveillé prend la couleur de son équipe — bleu, jaune ou vert pleins — pendant que celle d’un dormeur reste grise. D’un coup d’œil sur la table, on sait qui est debout sans lire une pastille.',
      'Une combinaison de carte Journée est jouée d’office : plus de choix proposé quand elle sort en même temps qu’une autre. Quatre vaches valent mieux que trois, il n’y a pas à hésiter.',
      'Le double X s’appelle désormais Échec, partout : dans le journal, dans la liste des combinaisons, au Laboratoire et dans les règles.',
      'Les moments qui comptent éclatent à l’écran : la couleur de votre équipe et une secousse de la table quand vous vous réveillez, du vert dès qu’un joueur retourne une vache, du rouge sur votre échec, du gris quand on vous rendort. Le mouvement s’efface si le système demande à réduire les animations.',
      'Sur téléphone, les lots traversent enfin la table d’une zone de jeu à l’autre, comme sur grand écran : le vol se calcule maintenant en pixels sur les sièges eux-mêmes, et non plus sur des coordonnées qui n’existaient qu’en disposition circulaire.',
    ],
  },
  {
    version: '1.17',
    date: '11/08/2026',
    notes: [
      'Ajouté à l’écran d’accueil d’un iPhone, le site pose enfin son logo : la tornade sur fond bleu, en icône pleine. Sans image dédiée, Safari collait une capture de la page à la place — il lui faut un PNG, il ne sait pas encore lire un SVG pour cet usage.',
      'L’icône de l’onglet devient la même tornade que la marque du site, au lieu des quatre barres d’origine.',
      'Un manifeste accompagne le tout : nom court, couleurs, et les mêmes icônes pour Android. Le raccourci s’ouvre en plein écran, sans barre d’adresse.',
      'Le script de version estampille aussi les icônes et le manifeste, comme les modules et la feuille de style.',
    ],
  },
  {
    version: '1.16',
    date: '11/08/2026',
    notes: [
      'Règle : endormir un voisin demande d’être réveillé, comme retourner une vache. Les trois ZzZ rejoignent les trois vaches du côté « Tornade éveillée » ; les trois tornades restent réservées au dormeur ; l’attrape et les deux échecs valent dans les deux états.',
      'Ce que cela change, mesuré : les parties raccourcissent nettement — une table de Pénibles passe de 12,3 à 7,5 min, une table de Très pénibles de 15,5 à 8,8 min. Le cercle vicieux où tout le monde se rendormait est rompu, et les vaches remontent partout.',
      'Les caractères Pénible et Très pénible visent maintenant la tornade tant qu’ils dorment : sans réveil, ils ne pourraient plus endormir personne. Une fois debout, ils reprennent leur ZzZ.',
      'Mobile : le bouton « Commencer la partie » passe juste sous le choix des joueurs, avant le rappel des variables.',
      'Mobile : les combinaisons et le journal disparaissent de la table — ils repoussaient la partie hors de l’écran. Ils restent affichés sur grand écran.',
    ],
  },
  {
    version: '1.15',
    date: '11/08/2026',
    notes: [
      'Sept caractères d’IA remplacent les quatre anciens : Logique, Agressif, Très agressif, Pénible, Très pénible, Équilibré et Idiot. Chacun dit ce que l’IA cherche à faire de ses dés — l’objectif est tiré une fois par lot, selon les goûts du caractère, et repris quand la Tornade change d’état.',
      'Le Logique se réveille puis fait ses vaches, rien d’autre. L’Agressif cherche l’attrape trois lots sur quatre, le Pénible endort ses voisins autant, tous deux jouant le coup logique le reste du temps. Les deux « très » ne visent plus que leur symbole. L’Équilibré emprunte à chaque lot le style de l’un des trois. L’Idiot vise au hasard, y compris l’inutile, et garde le mauvais dé une fois sur trois.',
      'Quand deux combinaisons sortent au même jet, l’IA joue celle qui va dans son sens : le Pénible endort plutôt que de se réveiller, le Logique fait l’inverse.',
      'Ce que cela donne, six exemplaires du même caractère autour de la table : le Logique retourne 24 vaches par partie, le Très agressif tente 115 attrapes, le Très pénible endort 68 fois. Équipe contre équipe, l’ordre de force est net — Logique, Équilibré, Pénible, Agressif, Très pénible, Très agressif, Idiot : jouer pour gagner bat jouer pour gêner.',
      'Une combinaison servie reste jouée d’office : le caractère dit ce que l’IA cherche, pas ce qu’elle accepte. Un Très agressif qui sort trois tornades se réveille quand même.',
      'Les caractères sont décrits dans la page Règles, et les réglages déjà enregistrés sont repris : Prudent devient Logique, Téméraire devient Agressif, Hasard devient Idiot.',
    ],
  },
  {
    version: '1.14',
    date: '10/08/2026',
    notes: [
      'Refonte de l’affichage mobile, sans toucher à l’affichage bureau : tout passe par la règle « écran de moins de 860 px », et le bouton de menu reste invisible au-delà.',
      'La barre du haut tient sur une seule ligne : la marque, Accueil, et tout le reste derrière un bouton à trois traits qui déplie le menu.',
      'La carte Journée, la pioche et les compteurs ne recouvrent plus la zone de jeu : ils passent en colonne au-dessus des joueurs, chacun sa place.',
      'Les quatre dés du joueur occupent toute la largeur de l’écran, et les boutons gardent leur position : à largeur fixe, un libellé qui change — « Lancer » puis « Tout relancer » — ne les fait plus glisser sous le doigt. Les rappels de touches disparaissent, sans clavier ils n’ont rien à dire.',
      'Le panneau du joueur reste ancré en bas de l’écran : il se trouvait mille pixels sous la table, on ne voyait jamais ses dés en même temps que le jeu.',
      'L’entête de la partie tient sur deux lignes au lieu de quatre : les repères de manche défilent sur place, les commandes suivent en dessous.',
      'Plus rien ne déborde de l’écran, de 320 à 430 px de large : la ligne d’un joueur se replie, les cartes ne dépassent plus de leur colonne, et la barre se resserre sur les très petits écrans.',
      'Les annonces se posent sur le haut de la zone du joueur au lieu de déborder sur la barre du haut.',
      'Correction de fond : le bloc mobile de la feuille de style n’était jamais refermé, tout ce qui suivait s’y trouvait enfermé — dont le clignotement d’un joueur touché, qui ne marchait donc pas sur ordinateur.',
    ],
  },
  {
    version: '1.13',
    date: '10/08/2026',
    notes: [
      'Correction du jeton géant : la feuille de style n’était pas estampillée, elle. Le navigateur servait le JS de la nouvelle version avec le CSS de l’ancienne, où la règle du jeton en vol n’existait pas — sans taille ni position, la vache s’étalait sur toute la table. styles.css porte désormais son numéro de version comme les modules, et le jeton garde sa taille même sans feuille de style.',
      'Les annonces de réussite s’affichent au-dessus de la zone du joueur concerné, plus au milieu de la table : on voit tout de suite qui réveille, qui retourne une vache, qui attrape. Le nom disparaît du texte puisqu’il se lit juste dessous, et deux joueurs peuvent réussir en même temps.',
      'L’esquive se joue à la barre espace, comme le toucher : pendant une attrape on est toucheur ou cible, jamais les deux, une seule touche suffit.',
    ],
  },
  {
    version: '1.12',
    date: '10/08/2026',
    notes: [
      'On voit d’où vient un point : le jeton retourné quitte la zone du joueur, traverse la table et va se poser dans le compteur de son équipe — aux trois vaches comme sur une attrape réussie. Le compteur ne s’allume qu’à l’arrivée, et en pause le jeton reste en vol.',
      'Nouvelle variable de partie, « Ce que rapporte l’attrape » : la règle de base (un jeton), ou la manche emportée quand le contact réussit, ou la manche emportée dès les trois éclairs. Réglable dans les Variables comme au Laboratoire.',
      'Ce que valent les deux variantes, sur 300 parties à 6 joueurs : contact gagnant, la partie passe de 5,6 à 4,3 min et les jetons retournés de 27 à 18 ; trois éclairs gagnants, la partie tombe à 0,9 min et la course aux vaches disparaît — à réserver à une partie éclair.',
    ],
  },
  {
    version: '1.11',
    date: '10/08/2026',
    notes: [
      'Le joker entre dans le dé, à la place de la seconde tornade : il prend la face de n’importe quel symbole sauf le X, et valide donc n’importe quelle combinaison.',
      'Quand le joker sert plusieurs combinaisons au même jet, c’est le joueur qui tranche : les combinaisons s’affichent dans son panneau et il choisit la sienne. Sans réponse, la meilleure part d’office. Le délai est réglable dans Variables.',
      'Trois jokers d’un coup valent un échec, comme deux X : le lot part sans rien tenter, et cet échec l’emporte sur ce que les jokers auraient pu servir. Règle décochable dans les Variables comme au Laboratoire.',
      'Nouvelle face joker double, orange et violette : un joker limité à l’éclair et au ZzZ. Absente des dés au départ, elle s’ajoute face par face dans les Variables.',
      'Ce que le joker change, mesuré : trois vaches passent de 3,7 % à 16,2 % et les quatre symboles se retrouvent à égalité, tandis que le réveil descend de 22,6 % à 16,2 %. En partie, les attrapes doublent, les blocages reculent d’un tiers et la partie perd près de deux minutes.',
      'Les dés ne heurtent plus de paroi invisible : la rangée du panneau vit désormais dans un plateau qui lui laisse la place de tourner et de glisser, au lieu d’être tranchée sur les bords.',
      'Sous le titre : un jeu de Sylvain Bonnafous, édité par Big Budi Games.',
      'Correction : modifier une combinaison dans les Variables empêchait la partie de démarrer.',
      'Numérotation : on reste en 1.xx — la livraison précédente, publiée en 2.0, est renumérotée 1.10.',
    ],
  },
  {
    version: '1.10',
    date: '10/08/2026',
    notes: [
      'Chaque ligne du journal prend la teinte pastel de ce qu’elle a produit : bleu pour un réveil, vert pour une vache, violet pour un endormi, jaune pour une attrape, rouge pour un blocage, orangé pour une carte Journée. Gris clair quand le lot est simplement passé ou poussé.',
      'Plus d’annonce au centre quand un lot est seulement poussé : c’était trop fréquent pour rester lisible.',
      'Le message de changement de manche passe au violet — en bleu, on croyait que les Bleus l’emportaient. Seul le nom de l’équipe gagnante garde sa couleur.',
      'Le lot du joueur glisse hors du cadre et le suivant entre par l’autre côté, dans le sens de circulation de la manche.',
    ],
  },
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
