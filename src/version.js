// Compteur de version — incrémenté à chaque modification livrée.
export const VERSION = '1.32';
export const BUILD_DATE = '2026-08-17';

// Journal des versions : le plus récent en premier.
export const CHANGELOG = [
  {
    version: '1.32',
    date: '17/08/2026',
    notes: [
      'Nouvelle façon de jouer une manche, à choisir en haut des Réglages : « Sans les points ». On se réveille aux trois tornades, puis on cherche les trois vaches — et le premier joueur qui les sort arrête la manche sur-le-champ. Son équipe prend la carte Journée, et la manche suivante commence aussitôt. Plus aucun jeton n’est compté : c’est le nombre de cartes qui fait le vainqueur, quatre par défaut au lieu de trois.',
      'La version de base ne bouge pas d’un pouce : le mode « Retourner tous les jetons » reste coché, et à graine égale la partie est rigoureusement la même qu’en 1.31 — c’est vérifié par les tests. Tout le reste des réglages continue de fonctionner dans les deux modes : le dé, les combinaisons, l’attrape, les X qui figent, le rythme de la table.',
      'Sans les points, la manche est trois fois plus courte et la partie deux fois : à six joueurs, 27 s par manche contre 82 s, et 4:05 la partie contre 7:54. Mesuré sur 100 parties d’IA équilibrées par ligne, de 3 à 9 joueurs.',
      'L’attrape ne rapporte plus de jeton dans ce mode — il n’y en a plus à prendre — mais elle garde tout son intérêt : elle coupe le tour du voisin et lui fait lâcher son lot, ce qui suffit à le sortir de la course. Pour qu’un contact réussi emporte la manche, le réglage « Ce que rapporte l’attrape » est toujours là.',
      'Certaines cartes Journée manipulent les jetons : « Jour sans vent » ne fait plus rien de particulier, tandis que « Élevage intensif » et « Troupeau » emportent la manche comme la Vache. Rien de grave — c’est le prix d’un mode qui ne compte plus rien.',
      'À nombre impair, la manche devient une course où chacun joue pour soi, et le Vert, seul contre deux équipes, la perd presque toujours : 12 % de victoires à 5 joueurs, 1 % à 9. Le réglage « Cartes du Vert » est là pour ça — deux cartes au lieu de quatre le ramènent à 44 % (5 joueurs) et 20 % (9 joueurs). Les Réglages le rappellent dès que le mode est actif.',
      'Le mode se règle aussi au Laboratoire, pour comparer les deux décomptes sur la même graine. Sur la table, la ligne de jetons disparaît du coin des scores : seules les cartes font le score.',
    ],
  },
  {
    version: '1.31',
    date: '12/08/2026',
    notes: [
      'La table a quatre sons : la sonnerie du réveil, le ronflement de l’endormissement, le meuglement d’une vache retournée et l’alarme d’une attrape tentée. Aucun fichier n’est téléchargé — ils sont fabriqués par le navigateur au moment de les jouer, oscillateurs et bruit filtrés. Le site reste statique, sans dépendance et sans licence à traîner.',
      'Le réveil et le ronflement ne sonnent que pour vous : à six autour de la table, ils sonneraient sans arrêt. La vache se fête pour tout le monde, et l’alarme prévient la table entière. Un bouton 🔊 dans l’en-tête de la partie les coupe sans quitter la manche, et une section « Sons » des Réglages règle le volume et permet de les écouter un par un.',
      'Correction : « Quitter » ne quittait pas — la partie continuait en coulisse et « ▸ Partie en cours » restait dans la barre. Le bouton abandonne désormais pour de bon, en deux temps : un premier clic demande « Abandonner ? », un second confirme, et il se désarme seul au bout de quatre secondes.',
      'Correction : les valeurs de mise en place — lots en jeu, jetons, cartes pour gagner — étaient grisées tant qu’on n’avait pas décoché « Suivre le tableau officiel », ce que rien n’indiquait. Elles se modifient maintenant directement, et en toucher une décroche le tableau ; recocher la case remet tout d’aplomb.',
    ],
  },
  {
    version: '1.30',
    date: '12/08/2026',
    notes: [
      'Le menu « Variables » s’appelle désormais « Réglages », partout : le lien de la barre du haut, le bouton de l’accueil, le titre de la page, le rappel de l’accueil, les règles et l’adresse (#/reglages — l’ancienne reste valable pour les liens déjà posés). Sur la page elle-même, « Réglages d’origine » devient « Tout réinitialiser », deux « Réglages » côte à côte se lisant mal.',
      'Nouveau dé officiel : 2 tornades, 1 X, 1 vache, 2 ZzZ. Ni joker ni éclair — les deux faces restent disponibles dans les menus, à poser soi-même sur une face pour les essayer.',
      'Conséquence assumée : sans face éclair, la combinaison Attaque ne peut plus sortir. C’est donc l’Échec — le double X — qui porte l’attrape par défaut, sinon elle ne se produirait jamais et la partie s’allongeait du simple au double. Posez un éclair sur une face et repassez le déclencheur sur « Éclairs » pour retrouver l’attaque choisie.',
      'Les boutons « Modèles » quittent les Réglages : le dé s’y règle face par face. Ils restent au Laboratoire, dont c’est le métier de comparer des répartitions, avec « Officiel » remis à jour et deux nouvelles entrées, « Avec éclair » et « Avec joker ».',
      'Une IA ne vise plus jamais une face que son dé ne porte pas : avec le dé officiel, un Agressif aurait cherché l’éclair jusqu’à épuisement sans rien sortir. Elle retombe sur le coup utile du moment — la tornade si elle dort, la vache si elle est réveillée.',
      'En partie, le caractère de chaque IA s’affiche en petit à côté de son nom : (Agressif), (T. pénible), (Idiot). À six autour de la table, savoir qui cherche à vous attraper change la façon de jouer.',
    ],
  },
  {
    version: '1.29',
    date: '12/08/2026',
    notes: [
      'Le titre de l’accueil suit exactement la séquence voulue : bleu, jaune, bleu, jaune, VERT, jaune, bleu, jaune, bleu. Bleu et jaune alternent d’un bout à l’autre — les deux équipes — et le Vert prend la lettre du milieu, seul entre les deux, comme à la table.',
    ],
  },
  {
    version: '1.28',
    date: '12/08/2026',
    notes: [
      'Le N de TORNADICE repasse en jaune : les deux lettres vertes se recentrent sur le milieu du mot, A et D.',
      'Les IA agressives ne s’entêtent plus à chercher l’éclair quand le joueur suivant a les mains vides. L’objectif d’une IA est repris dès que le voisin prend ou lâche un lot : sans cible, le symbole de l’attrape sort de ses envies et elle retombe sur le reste de son caractère — ou, pour le Très agressif qui ne vise que ça, sur le coup utile du moment, la tornade s’il dort, la vache s’il est réveillé.',
      'Sur 300 parties à 6 joueurs, l’Agressif passe de 14,5 à 7,8 contacts tentés et de 14,6 à 20,6 vaches retournées ; le Très agressif de 20,5 à 9,3 contacts et de 9,6 à 19,7 vaches. La partie perd une bonne minute — 5:41 → 4:21 et 6:11 → 4:34 — puisqu’ils jouent enfin entre deux occasions.',
      'Nouveau réglage, à nombre impair de joueurs : « Cartes du Vert ». Le Vert joue seul contre deux équipes, son objectif se règle donc à part, dans les Réglages comme au Laboratoire. À 5 joueurs, une seule carte le fait passer de 33 % à 85 % de victoires, six le font retomber à 4 %.',
      'Le contrôle « jamais deux lots en main » passe désormais après chaque événement du moteur, et non plus seulement à chaque repeint : 36 parties et 38 000 contrôles, sur cinq modes de jeu, avec des humains qui esquivent, touchent et passent.',
    ],
  },
  {
    version: '1.27',
    date: '12/08/2026',
    notes: [
      'Le jeu s’appelle désormais TornaDice, sans S. Le nom change partout : le titre de l’accueil et son dégradé de lettres, la marque de l’en-tête, l’onglet du navigateur, le raccourci sur l’écran d’accueil des téléphones, le titre de la page Règles, la description du site, l’étiquette de l’icône, les fichiers exportés — historique et campagnes — et les commentaires du code.',
      'Une seule exception, invisible : la clé sous laquelle le navigateur enregistre vos réglages garde son ancien nom. La renommer aurait rendu introuvables les variables, l’historique et les configurations du Laboratoire déjà en place.',
    ],
  },
  {
    version: '1.26',
    date: '12/08/2026',
    notes: [
      'Le déclencheur de l’attrape ne parle plus de dés, mais de combinaisons : les deux boutons sont désormais « Éclairs » et « Échecs », et ils désignent laquelle des deux lignes du tableau — Attaque ou Échec — tente le contact. Réglez l’Échec sur trois X, cochez « Échecs », et ce sont bien trois X qui attrapent. Le dé, lui, ne change plus tout seul quand on bascule.',
      'La combinaison Attaque revient dans le tableau en toutes circonstances : elle avait disparu en mode « Échecs », alors qu’il faut pouvoir la régler. En mode « Échecs », elle reste réglable mais ne se joue plus — sans quoi elle coûterait le lot sans rien tenter — et la liste des combinaisons de la table le signale.',
      'La page Réglages est débarrassée de ses pavés d’explication : chaque titre porte un petit « ? » dans un rond. Au survol, l’infobulle donne la phrase essentielle ; au clic, toute la description s’installe sous le titre. La page perd 500 pixels de hauteur sur grand écran, et les réglages redeviennent lisibles d’un coup d’œil.',
      'Les textes n’ont pas été jetés, ils ont été rassemblés : ce qui traînait sous chaque champ — le temps que les dés roulent, la chance de toucher, les valeurs du tableau officiel — se retrouve dans le « ? » de la section correspondante.',
    ],
  },
  {
    version: '1.25',
    date: '12/08/2026',
    notes: [
      'La marque « TORNADICE » et son logo ramènent à l’accueil, et le numéro de version ouvre le journal des versions — les deux gestes que l’on tente d’instinct sur un en-tête.',
      'Nouvelle règle, cochée par défaut : un dormeur ne tend pas la main. Dans le mode « attrape sur échec », Tornade endormie, le double X reste un échec sec — on passe le lot sans tenter le contact. Il faut s’être réveillé pour attraper au passage. Décochable dans les Réglages et au Laboratoire.',
      'Sur 300 parties à 6 joueurs, la règle divise les contacts par deux — 4,7 → 2,4 chez le Logique, 7,4 → 3,2 chez l’Agressif — sans changer la durée d’une partie (3:09 → 3:12). Le réveil devient le passage obligé de tout ce qu’on peut entreprendre.',
      'Elle ne concerne que l’attrape sur échec : les trois éclairs continuent de valoir dans les deux états, comme la règle du jeu le veut.',
    ],
  },
  {
    version: '1.24',
    date: '12/08/2026',
    notes: [
      'Correction : la page remontait toute seule en haut dès qu’on cliquait un bouton ou une case des Réglages. En cause, le focus — Chrome ramène la page au sommet quand on retire l’élément qui l’a, et c’est le cas de tout bouton qu’on vient de cliquer. On lui retire le focus avant l’échange, et la page reste où elle est, dans les Réglages comme au Laboratoire.',
      '« Dés par lot », « Type de dé » et « Lots en jeu » retrouvent la même ligne : le texte d’aide sous le choix du dé est supprimé, et un champ à trois lignes ne décale plus son contrôle par rapport à ses voisins.',
      'Les menus déroulants des combinaisons sont deux fois moins larges (208 → 104 px) : six intitulés à afficher n’en demandaient pas davantage.',
      'Au Laboratoire, « Lancer la simulation » passe tout en haut du panneau, au-dessus de « Configuration testée » : c’est le geste qu’on répète, il ne demande plus de dérouler tout le formulaire.',
      'Toujours au Laboratoire, les menus et le choix du dé sortaient de leur colonne. Le tableau des combinaisons défile désormais dans son cadre au lieu d’élargir la carte, la pastille « Journée » passe sous le nom de la carte pour rendre de la place aux dés, et les trois boutons d6/d8/d10 se partagent la largeur de leur champ.',
    ],
  },
  {
    version: '1.23',
    date: '12/08/2026',
    notes: [
      'Le nombre de faces ne se règle plus à l’unité : on choisit un type de dé, d6, d8 ou d10. Le d6 reste le dé du jeu ; le d8 et le d10 reprennent la même série de symboles depuis le début — le d8 ajoute une tornade et un joker, le d10 y ajoute un X et un ZzZ — et chaque face reste modifiable une à une. Sur 300 parties à 6 joueurs : d8 4:39, d6 5:25, d10 7:29. Tout se joue sur la densité de X, un sur huit au d8 contre deux sur dix au d10.',
      'La variante « Manche gagnée dès les 3 éclairs » est retirée : elle n’existe pas au jeu. Il faut toujours toucher pour emporter la manche. Un réglage enregistré sur cette variante retombe sur « Manche gagnée si le contact réussit ».',
      'Le tableau des combinaisons se lit désormais comme un lot posé sur la table : un menu déroulant par dé du lot, avec la face choisie en miniature au-dessus, et « — » pour un dé qu’on ne demande pas. Fini la grille de compteurs où il fallait traduire « 3 » en trois dés. Sur téléphone, le tableau défile dans son propre cadre au lieu d’écraser les menus.',
      'Nouveau curseur « Irrégularité du rythme », de 0 à 50 % : chaque lancer, chaque constat et chaque passage est tiré autour de sa durée réglée. À 0 % un passage de 1000 ms en dure toujours 1000 ; à 30 % il va de 700 à 1300 ms. La moyenne ne bouge pas — la médiane d’une partie passe de 5:26 à 5:30 entre 0 et 50 % — et à graine égale le rythme se rejoue à l’identique.',
    ],
  },
  {
    version: '1.22',
    date: '12/08/2026',
    notes: [
      'Correction : dans le Laboratoire, certaines faces de dés s’affichaient vides, avec un menu déroulant retombé sur « Tornade ». Les faces avaient été renommées en v1.3 — la « cloche » est devenue la tornade, l’« étoile » est devenue le X — et un réglage enregistré avant ce renommage gardait les anciens noms, que plus rien ne reconnaissait.',
      'Le défaut ne touchait pas que l’affichage : ces faces ne valaient rien pour le moteur, donc un tiers du dé ne servait à rien et toutes les campagnes lancées depuis ces réglages tournaient sur un dé amputé — plus aucun réveil possible, par exemple.',
      'Les réglages enregistrés sont désormais retraduits à l’ouverture, au Laboratoire comme dans le menu Réglages : les anciens noms de faces retrouvent leur symbole, les exigences des combinaisons et des cartes Journée suivent, les réglages apparus depuis reprennent leur valeur par défaut, et un symbole devenu introuvable devient « vide » plutôt que de disparaître en silence.',
    ],
  },
  {
    version: '1.21',
    date: '12/08/2026',
    notes: [
      'Nouveau mode de jeu dans les Réglages, « Ce qui déclenche l’attrape » : la face éclair disparaît du dé — une seconde vache prend sa place — et c’est l’échec qui tente le contact. Deux X font partir le lot comme d’habitude, mais si le voisin à qui on le passe tient un lot, on essaie de le toucher au passage. La combinaison des trois éclairs est retirée avec la face, et le rappel des combinaisons signale que l’échec « tente l’attrape ».',
      'On ne choisit donc plus d’attaquer : on attaque chaque fois que le hasard le permet, et l’échec cesse d’être une pure perte. Sur 200 parties à 6 joueurs, la partie raccourcit d’une bonne minute — 4:24 → 3:11 pour des Logiques, 5:25 → 3:34 pour des Équilibrés — parce que la seconde vache double les chances de retourner un jeton. L’Agressif, privé de sa cible, retombe de 15,4 à 8,0 contacts par partie.',
      'Nouveau réglage « Quand deux lots se rencontrent » : les lots peuvent s’empiler au lieu de se pousser. Le lot qui arrive attend son tour derrière celui qu’on a en main, plus rien ne rebondit sur le voisin, et c’est le joueur lent qui accumule. Sur 60 parties, 1,9 % des mains portent alors deux lots ou plus — jamais plus de trois.',
      'Dans le tableau des combinaisons, les combinaisons de cartes Journée se distinguent enfin des universelles : deux intertitres séparent « toujours en jeu » de « seulement pendant la manche où la carte est en jeu », et les lignes de cartes passent en bleu, filet à gauche et pastille « Journée ». Même traitement au Laboratoire.',
    ],
  },
  {
    version: '1.20',
    date: '11/08/2026',
    notes: [
      'On n’attrape que ce qui existe : si le joueur suivant a les mains vides, les trois éclairs ne valent plus rien. Il ne se passe rien, le lot reste en main et l’on continue à relancer — au lieu de le perdre pour une attrape dans le vide.',
      'Ce que cela change, 200 parties à 6 joueurs : les attrapes tentées passent de 76 à 19 pour une table d’Agressifs, de 105 à 26 pour des Très agressifs, de 24 à 6 pour des Logiques. Le voisin n’a un lot qu’une fois sur quatre environ, à trois lots pour six joueurs — l’attrape devient une occasion à saisir plutôt qu’un automatisme.',
      'Le halo autour d’un joueur suit désormais ce qui va réellement se produire : plus de clignotement jaune quand les trois éclairs ne peuvent rien attraper.',
      'La secousse de l’écran est réservée au rendormissement — c’est le coup qui vous coupe les jambes. Le réveil, la vache et l’échec gardent leur éclat de couleur, sans tremblement.',
      'Les éclats de couleur durent deux fois plus longtemps : une seconde et quart au lieu d’une demi-seconde.',
    ],
  },
  {
    version: '1.19',
    date: '11/08/2026',
    notes: [
      'Sur téléphone, les joueurs sont disposés en anneau et non plus dans l’ordre de lecture : on descend la colonne de droite, on remonte celle de gauche. À quatre, cela donne 1-2 sur la première rangée et 4-3 sur la seconde — chaque joueur touche ses deux voisins de table, et le dernier rejoint le premier.',
      'À nombre impair, le siège qui ferme l’anneau prend toute la largeur en bas : c’est la place d’en face.',
      'Correction au passage : un siège dont le contenu dépassait sa demi-largeur refusait de partager sa rangée, ce qui cassait la disposition à sept et neuf joueurs. Les sièges peuvent maintenant se resserrer, et les dés des vignettes sont un peu plus petits.',
    ],
  },
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
      'Mobile : le bouton « Commencer la partie » passe juste sous le choix des joueurs, avant le rappel des réglages.',
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
      'Nouveau réglage de partie, « Ce que rapporte l’attrape » : la règle de base (un jeton), ou la manche emportée quand le contact réussit, ou la manche emportée dès les trois éclairs. Réglable dans les Réglages comme au Laboratoire.',
      'Ce que valent les deux variantes, sur 300 parties à 6 joueurs : contact gagnant, la partie passe de 5,6 à 4,3 min et les jetons retournés de 27 à 18 ; trois éclairs gagnants, la partie tombe à 0,9 min et la course aux vaches disparaît — à réserver à une partie éclair.',
    ],
  },
  {
    version: '1.11',
    date: '10/08/2026',
    notes: [
      'Le joker entre dans le dé, à la place de la seconde tornade : il prend la face de n’importe quel symbole sauf le X, et valide donc n’importe quelle combinaison.',
      'Quand le joker sert plusieurs combinaisons au même jet, c’est le joueur qui tranche : les combinaisons s’affichent dans son panneau et il choisit la sienne. Sans réponse, la meilleure part d’office. Le délai est réglable dans Réglages.',
      'Trois jokers d’un coup valent un échec, comme deux X : le lot part sans rien tenter, et cet échec l’emporte sur ce que les jokers auraient pu servir. Règle décochable dans les Réglages comme au Laboratoire.',
      'Nouvelle face joker double, orange et violette : un joker limité à l’éclair et au ZzZ. Absente des dés au départ, elle s’ajoute face par face dans les Réglages.',
      'Ce que le joker change, mesuré : trois vaches passent de 3,7 % à 16,2 % et les quatre symboles se retrouvent à égalité, tandis que le réveil descend de 22,6 % à 16,2 %. En partie, les attrapes doublent, les blocages reculent d’un tiers et la partie perd près de deux minutes.',
      'Les dés ne heurtent plus de paroi invisible : la rangée du panneau vit désormais dans un plateau qui lui laisse la place de tourner et de glisser, au lieu d’être tranchée sur les bords.',
      'Sous le titre : un jeu de Sylvain Bonnafous, édité par Big Budi Games.',
      'Correction : modifier une combinaison dans les Réglages empêchait la partie de démarrer.',
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
      'Vraie transition entre les manches : grand message central, les dés reviennent au centre puis repartent vers l’équipe qui a perdu, et la carte suivante glisse depuis la pioche par-dessus la précédente. Durée réglable dans Réglages.',
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
      'Nouveau menu Réglages, à côté de « Commencer la partie » : faces des dés, combinaisons requises, rythme de la table, mise en place, adresse, cartes Journée et graine — tout y est réuni.',
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
      'Première table de jeu virtuelle TornaDice : 3 à 9 joueurs, chaque siège au choix Humain ou IA, en temps réel autour d’une table circulaire.',
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
