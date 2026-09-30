// Compteur de version — incrémenté à chaque modification livrée.
export const VERSION = '1.90';
export const BUILD_DATE = '2026-09-30';

// Journal des versions : le plus récent en premier.
export const CHANGELOG = [
  {
    version: '1.90',
    date: '30/09/2026',
    notes: [
      'Laboratoire : chaque campagne tire une nouvelle graine, pour que relancer donne d’autres parties. La case « Nouvelle graine à chaque campagne », sous les paramètres de la campagne, se décoche pour garder la graine et rejouer exactement la même campagne — ce qu’il faut pour comparer deux réglages. Taper une graine à la main la garde, elle aussi.',
    ],
  },
  {
    version: '1.89',
    date: '30/09/2026',
    notes: [
      'Nouvelle variante : la table sans attrape. Dans les Réglages, « Ce que fait l’Échec » passe de « Tente l’attrape » à « Sans attrape : pousse le lot ». L’Échec fait alors partir le lot vers le voisin sans tenter de contact ; s’il tient déjà un lot, il doit s’arrêter et le passer au joueur suivant — la poussée peut faire le tour de la table.',
      'Sans attrape, les réglages qui la concernent (« Il faut être réveillé », « Ce que rapporte l’attrape ») s’estompent, les IA agressives cessent de chercher l’Échec, la carte de sens ne se retourne plus pour chasser un voisin, et la table rappelle « pousse le lot » à côté de l’Échec. La variante se règle aussi au Laboratoire, et s’écrit dans la Fiche et les Règles.',
    ],
  },
  {
    version: '1.88',
    date: '30/09/2026',
    notes: [
      'La carte de votre équipe s’affiche toujours à droite de la table, même quand vos réglages diffèrent de ce qu’elle imprime. Elle ne se montrait que si elle disait exactement les règles en cours : un Échec réglé à trois X suffisait à la remplacer par les listes. Désormais, ce que votre table joue autrement se lit sous la carte — « Échec : trois X au lieu de deux ».',
      'Les emblèmes d’équipe — la vache, la poule, le cow-boy — sont les jetons imprimés partout sur le site : l’accueil, les scores de la table, le tableau des combinaisons, les Règles et le compte rendu des parties.',
    ],
  },
  {
    version: '1.87',
    date: '30/09/2026',
    notes: [
      'La variante des Cochons à trois joueurs est annulée : à trois, on joue une Vache, une Poule et le Cow-Boy, avec les combinaisons de tout le monde — l’Échec à deux dés rouges. La carte Cochon, ses couleurs, ses réglages et la Tornade de Cochons quittent le jeu ; les Tornades de Vaches, de Poules et de Cow-Boy sortent aussi à trois joueurs.',
      'À droite de la table, la carte de votre équipe remplace les deux listes de combinaisons : pour l’instant les Poules, dont on a les deux faces imprimées. Quand votre Tornade se réveille ou s’endort, la carte se retourne. Les Vaches et le Cow-Boy gardent les listes en attendant leurs cartes.',
      'Le journal n’affiche plus le minutage.',
    ],
  },
  {
    version: '1.86',
    date: '29/09/2026',
    notes: [
      'Les noms par défaut des joueurs se règlent dans les Réglages, carte « Noms des joueurs » : un nom par place autour de la table, qu’un humain ou une IA l’occupe. Ils valent partout — accueil, table, Laboratoire. « Noms d’origine » les rend.',
      'Renommer un joueur sur l’accueil reste possible : ce nom-là est gardé, les autres places suivent le réglage.',
      'L’accueil n’affiche plus le bloc « Réglages de la partie » : tout se règle dans la page Réglages. Il ne reste que la composition de la table, centrée, et le bouton « Réglages ».',
    ],
  },
  {
    version: '1.85',
    date: '29/09/2026',
    notes: [
      'Les jetons par manche — ceux qu’on pose sur la carte Tornade — se règlent par nombre de joueurs, comme les lots et les cartes pour gagner : dans les Réglages, « Mise en place », un tableau « Jetons par manche » porte une colonne par effectif, une ligne pour une équipe et une pour le joueur Vert (aux effectifs impairs). « Tableau officiel » remet les valeurs de départ.',
      'La case « Suivre le tableau officiel » disparaît : elle ne servait qu’aux deux compteurs de jetons, que le tableau remplace. Un ancien réglage qui s’en était décroché retrouve sa valeur dans toutes les colonnes.',
      'Réglés depuis l’accueil, « Jetons par équipe » et « Jetons du Vert » valent pour tous les effectifs, comme les lots et les cartes.',
    ],
  },
  {
    version: '1.84',
    date: '29/09/2026',
    notes: [
      'Les éclairs quittent le jeu. C’est toujours l’Échec qui déclenche l’attrape : deux X figent les dés, le lot part, et si le joueur suivant tient un lot on tente de l’attraper au passage. La combinaison « Attaque » (trois éclairs), la face éclair et le réglage « Ce qui déclenche l’attrape » disparaissent des Réglages, du Laboratoire, de la table, de la Fiche et des Règles. Reste la case « Il faut être réveillé ».',
      'Un réglage enregistré avec une face éclair la voit reprendre la face officielle de sa place ; une exigence en éclairs les oublie.',
      'Les IA agressives cherchent désormais les X de l’Échec pour attraper — une fois réveillées, et seulement quand le voisin tient un lot.',
      'Dans les Réglages, « Mise en place » règle le nombre de joueurs au minimum et au maximum (de 3 à 8) : l’accueil ne propose que ces tables-là. Ces bornes font partie des Règles officielles.',
    ],
  },
  {
    version: '1.83',
    date: '29/09/2026',
    notes: [
      'Les Règles officielles : le corpus de référence de TornaDice — façon de jouer, dés et faces, lots, jetons, cartes pour gagner, combinaisons, paquet de Tornades et leurs combinaisons. Elles forment un réglage livré, en tête des Réglages enregistrés, et un visiteur qui n’a rien choisi joue avec elles.',
      'Dans les Réglages, « Valider comme Règles officielles » fait des réglages en cours les Règles officielles (un second clic confirme). Le bloc dit si les réglages en cours sont officiels, et sinon en quoi ils s’en écartent, règle par règle.',
      'Sur l’accueil, « Attention, vous ne jouez pas avec les règles officielles ! » s’affiche dès que la partie qu’on s’apprête à lancer s’en écarte, avec la liste des écarts et un bouton pour revenir aux Règles officielles. Le rythme de la table, le caractère des IA, les sons et l’apparence des faces n’en font pas partie : y toucher ne déclenche pas l’alerte.',
      'Valider rend les règles officielles dans le navigateur où l’on valide. Pour tous les visiteurs du site, le lien « téléchargez leur fichier » produit regles-officielles.js, à publier à la place de src/core/regles-officielles.js.',
    ],
  },
  {
    version: '1.82',
    date: '29/09/2026',
    notes: [
      'Changer le nombre de joueurs sur l’accueil ne défait plus les réglages de la partie. « Lots en jeu » et « Cartes pour gagner » s’écrivaient dans la seule ligne de l’effectif affiché : à un autre nombre de joueurs, on retrouvait l’ancienne valeur. Réglés depuis l’accueil, ils valent désormais pour tous les effectifs — le réglage ligne par ligne reste possible dans les Réglages. Les noms et rôles des joueurs déjà saisis sont gardés, eux aussi.',
      'Les boîtes « Joueurs » et « Réglages de la partie » de l’accueil sont alignées : même haut, même hauteur. La seconde prenait la marge d’une carte posée sous une autre, qui n’a pas lieu d’être dans une grille.',
    ],
  },
  {
    version: '1.81',
    date: '29/09/2026',
    notes: [
      'Les dés qui arrivent dans votre plateau de lancer entrent par le côté où est assis le joueur qui vous les passe, et ceux qui partent sortent du côté du voisin qui les reçoit — à gauche ou à droite selon la table, et non plus toujours dans le même sens.',
      'Les dés qui tournent ne sont plus coupés : la rangée masquait tout ce qui dépassait de sa hauteur, et un dé qui bascule déborde de sa case. Ils tournent désormais en entier dans le plateau, avec un peu plus d’écart entre eux.',
    ],
  },
  {
    version: '1.80',
    date: '29/09/2026',
    notes: [
      'Plus de long temps mort entre deux manches. La carte Tornade suivante était révélée après la transition, et la partie restait figée jusqu’à un appui sur Espace ou 5 secondes — plus de 8 secondes d’arrêt à chaque manche. Elle se révèle désormais pendant la transition, pendant que les dés reviennent au centre, sans arrêter le jeu, et se retire d’elle-même quand la manche commence.',
      'Quand le sens est à décider par vous, la carte suivante se révèle juste après votre choix, avec le sens retenu.',
      'La transition entre deux manches passe de 3,2 à 2,6 secondes par défaut (réglable dans les Réglages, « Transition de manche »). La toute première carte de la partie attend toujours qu’on l’ait vue, 4 secondes au plus.',
    ],
  },
  {
    version: '1.79',
    date: '29/09/2026',
    notes: [
      'Dans le journal, les dés d’un tour montrent d’abord ceux qui font la combinaison jouée — les trois soleils d’un Réveil, les deux X d’un Échec, attrape comprise —, puis les autres.',
      'Le bloc « Carte du jour » quitte le panneau de droite — la carte se lit au centre de la table — et le journal prend sa place, plus haut.',
    ],
  },
  {
    version: '1.78',
    date: '29/09/2026',
    notes: [
      'La carte de sens s’affiche plus grande à côté de la pioche, à la révélation des manches et dans la fenêtre du choix.',
      'La pioche a la forme d’une pile de cartes Tornade face cachée : au format de la carte, avec un dos rouge. Le nombre de cartes restantes est sur la pile.',
      'Sur l’accueil, les cartouches des trois Cochons — et ceux des autres équipes — ont tous la même largeur.',
      'Les jetons sauvés par un joueur sont bien plus gros et se posent au-dessus de son siège, à distance, sans toucher sa boîte. Quand un autre siège est trop près au-dessus — sur les côtés, à huit joueurs —, la pile passe sur le côté du siège. Celle du joueur du bas se pose sur le côté d’emblée, pour laisser la place à la carte Tornade.',
    ],
  },
  {
    version: '1.77',
    date: '29/09/2026',
    notes: [
      'La carte de sens imprimée remplace la flèche : posée à côté de la pioche sur la face du sens en cours — flèches dans le sens des aiguilles d’une montre, ou dans l’autre —, en petit à la révélation de chaque manche et entre deux manches.',
      'Quand c’est à vous de décider, la fenêtre montre la carte telle qu’elle est posée, et chaque bouton la face qu’elle aura : « Garder » la face actuelle, « Retourner » l’autre.',
    ],
  },
  {
    version: '1.76',
    date: '29/09/2026',
    notes: [
      'Les jetons imprimés remplacent les jetons dessinés : la vache pour les Bleus, la poule pour les Jaunes, le cow-boy pour le Vert. On les retrouve sur la carte Tornade, au-dessus du siège de qui les a sauvés, pendant leur vol, au score et au Refuge.',
      'Sur la carte Tornade, seuls les jetons sont posés : l’emblème ajouté en bout de rangée disparaît, le jeton suffit à dire l’équipe. Les jetons y sont aussi un peu plus gros.',
      'À la table à trois, où chacun joue un Cochon, les jetons restent dessinés aux couleurs des Cochons, en attendant leur image.',
    ],
  },
  {
    version: '1.75',
    date: '29/09/2026',
    notes: [
      'Le logo imprimé de TornaDice remplace le titre : en grand sur l’accueil, et dans l’en-tête de chaque page.',
      'Les cartes Tornade ont le format d’une carte : en portrait, aux proportions du carton imprimé — au centre de la table comme quand on la retourne.',
      'La police Heroes Legend ne déborde plus. Elle annonçait des lettres hautes de 0,84 em, mais ses capitales montent à 1,34 em et à 1,65 em avec un accent : les lignes se chevauchaient et les titres étaient rognés. Elle est désormais ramenée à la taille d’une police d’affiche ordinaire, avec la hauteur qu’elle occupe vraiment.',
      'Le texte d’une carte s’ajuste à sa carte : chaque ligne du titre se resserre pour tenir dans le bandeau, et le texte descend jusqu’à tenir dans la place libre, sans jamais couper un mot en deux (« supplémentaire », « immédiatement »).',
    ],
  },
  {
    version: '1.74',
    date: '29/09/2026',
    notes: [
      'La police du jeu, Heroes Legend — celle des cartes Tornade et des cartes d’équipe imprimées —, est dans l’interface : le titre, les cartes Tornade dessinées (bandeau et texte), les noms d’équipe au score, sur les sièges, au Refuge et dans les badges. Le texte courant reste en Inter, plus lisible en petit.',
      'La police est près de deux fois plus large qu’Arial Black : le texte des cartes se resserre pour que « supplémentaire » et « immédiatement » tiennent sur une ligne, et le caractère d’une IA passe sous son nom sur le siège.',
      'La suite de vérifications tourne en 20 s au lieu de 28 : les campagnes des caractères d’IA et des anciens réglages sont plus courtes, sans toucher aux duels qui ont besoin du nombre.',
    ],
  },
  {
    version: '1.73',
    date: '29/09/2026',
    notes: [
      'Un seul paquet de cartes Tornade pour toutes les façons de jouer. Le mode avec les jetons avait ses propres cartes « Journée » : elles quittent le jeu, et les trois modes piochent désormais dans les mêmes quinze Tornades. Les Réglages, le Laboratoire, la Fiche et les Règles ne montrent plus qu’un paquet.',
      'La Méga Tornade demande cinq symboles — cinq granges — et fait toujours gagner la manche sur-le-champ. Sur des lots de quatre dés, elle ne peut pas sortir : sa case le dit dans les Réglages et le Laboratoire.',
      'Nouvelle carte : la Tornade de Cochons, « Les Cochons gagnent 2 Cartes Tornade à cette manche ». Les Tornades de Vaches, de Poules et de Cochons sont trois cartes distinctes, chacune à la table où joue son animal : celle des Cochons à trois joueurs, celles des Vaches et des Poules ailleurs. Comme le Cow-Boy, une carte dont l’animal n’est pas à la table n’entre pas dans la pioche.',
      'La Tornade Électrique paie aussi avec les jetons : une manche prise en retournant son dernier jeton sur une attrape est une manche gagnée en rattrapant, et rapporte deux cartes.',
      'Un paquet composé avant cette version est repris tel quel : celui du mode Immédiat devient le paquet unique — à défaut, celui du Compromis —, avec les combinaisons qu’on y avait réglées.',
    ],
  },
  {
    version: '1.72',
    date: '29/09/2026',
    notes: [
      'La carte Tornade du centre de la table est dessinée comme le carton imprimé : le bandeau orange qui porte le titre — « TORNADE » en grand, le reste dessous —, les dés de la combinaison chacun dans sa case cerclée de noir, le filet noué d’une spirale, le texte en grandes capitales et les nuages qui montent des coins. Elle suit toujours les réglages. Quand on la retourne en début de manche, c’est la même carte, en grand — sauf si l’on a son image imprimée.',
      'Les jetons pris dans la tornade sont posés sur la carte elle-même, en grand. Quand un joueur en sauve un, le jeton s’envole de la carte et va se poser au-dessus de son siège, où il reste jusqu’à la fin de la manche : on voit d’un coup d’œil qui a mis quoi à couvert. Si la « Journée sans vent » en renvoie un dans la tornade, c’est la plus grosse pile de l’équipe qui le rend.',
      'La barre de lancer ne s’affiche plus quand on n’a pas de dés à jouer. Entre deux manches, les lots repartent au centre — le moteur ne les retirait des mains qu’au départ de la manche suivante, et la barre restait là avec les dés de la manche finie ; les sièges, eux aussi, les montraient encore. Elle s’efface aussi le temps que la carte se révèle ou que la carte de sens attende sa décision.',
      'Les lots de 5 dés tiennent sur une ligne dans les sièges. La taille des dés était calculée pour 176 px de large, le siège n’en offre que 173 : le cinquième passait à la ligne. Sur téléphone, les dés se partagent la largeur du siège.',
      'Sur téléphone, les bulles d’annonce au-dessus des sièges de droite ne dépassent plus de l’écran.',
    ],
  },
  {
    version: '1.71',
    date: '29/09/2026',
    notes: [
      'Les cartes imprimées arrivent dans l’interface. La Tornade du Sommeil se montre telle qu’elle est sur le carton : au centre de la table, avec les jetons pris dans la tornade posés dessous, en grand quand on la retourne en début de manche, et en vignette dans le paquet des Réglages — un clic l’ouvre en grand.',
      'La carte des Poules, face endormie, prend la place de la liste « Combinaisons (Endormi) » quand vous jouez les Poules : trois soleils pour le Réveil, deux tornades rouges pour « Passe ou Rattrape ».',
      'Une carte imprimée n’est montrée que tant qu’elle dit la règle en vigueur. Qu’on règle autrement sa combinaison dans les Réglages, que l’attrape passe aux éclairs, qu’on joue à trois où personne n’est plus une Poule — et l’interface revient au dessin, qui suit toujours les réglages.',
      'La Tornade du Sommeil reprend le texte de son carton : « Vous endormez vos 2 voisins ».',
    ],
  },
  {
    version: '1.70',
    date: '29/09/2026',
    notes: [
      'La carte Tornade est au centre de la table, comme sur un vrai plateau, avec la pioche et la carte de sens posées à côté d’elle. Les joueurs font cercle autour, et le cercle prend désormais toute la largeur : les sièges, qui se chevauchaient à six joueurs sur un écran moyen, ont chacun leur place. Quand elle manque — huit joueurs sur un petit écran — le centre rapetisse juste ce qu’il faut pour ne toucher personne. Les scores passent au-dessus du tapis.',
      'Le joueur humain est assis en bas de la table, face à l’écran, et non plus en haut. L’anneau tourne autour de lui sans changer d’ordre : ses voisins restent ses voisins, le sens horaire reste horaire. Sur téléphone, il ferme l’anneau par le bas.',
      'À trois joueurs, les Cochons ont chacun leur couleur : un rouge, un orange, un rose. Les Bleus, les Jaunes et le Vert disparaissent de la table, couleurs comprises — sur les sièges, les scores, la carte Tornade, le journal, le compte rendu, l’historique et le Laboratoire. Le cochon lui-même se peint de la couleur de son joueur.',
      'Le journal accorde enfin ses verbes : « les Bleus remportent la manche », mais « le Vert remporte » et « le Cochon rouge remporte » — un joueur seul n’est pas une équipe. Le Vert était jusqu’ici conjugué au pluriel.',
      'Le Réveil s’applique en toutes circonstances : un dormeur qui sort ses soleils se réveille. Avec « On peut relancer par-dessus », il ne se laissait pas de côté comme l’Échec et l’Abri — c’est désormais le cas. Quand un grand lot sert au même jet le Réveil et une autre combinaison de base, plus de choix à faire : c’est le Réveil. Et quand la carte du jour sort avec lui, on joue la carte et l’on se réveille avec.',
      'Les jokers quittent le jeu : les deux faces joker, la combinaison « Trois jokers », leur règle dans les Règles et leur réglage. Une face qui portait un joker dans un réglage enregistré reprend la face officielle de sa place ; une combinaison qui en demandait les oublie. Deux combinaisons peuvent toujours sortir au même jet — la carte du jour et une de base — et le choix reste au joueur.',
    ],
  },
  {
    version: '1.69',
    date: '29/09/2026',
    notes: [
      'La table à trois a sa variante : personne n’a d’équipier, alors chacun joue un Cochon. Les trois cartes portent la même règle — l’Échec y demande trois dés rouges au lieu de deux. À trois, chacun est le voisin de tout le monde : à deux rouges, le lot change de main sans arrêt et l’attrape tombe bien trop souvent.',
      'Mesuré sur 300 parties d’IA équilibrées : la manche passe de 1,86 à 0,71 attrape tentée et de 0,79 à 0,28 réussie. C’est moins qu’à quatre joueurs à deux dés rouges, qui en réussit 0,70 — la table à trois devient la plus calme au lieu d’être la plus agitée. La manche s’allonge à peine, de 67 à 73 secondes.',
      'La mise en place le dit partout : « 3 Cochons, chacun pour soi » dans le tableau des effectifs, et l’animal change sur les sièges, sur la carte Tornade, à l’Abri et dans le compte rendu de fin de partie. La couleur, elle, ne bouge jamais — c’est elle qui dit qui est qui.',
      'La ligne du Cochon se règle comme le reste : dans le tableau des combinaisons, elle remplace celle des équipes à cet effectif, et la carte se décoche d’un bouton dans la mise en place des Réglages comme au Laboratoire. La fiche imprimée marque les lignes qui viennent de la carte.',
    ],
  },
  {
    version: '1.68',
    date: '24/08/2026',
    notes: [
      'Les jetons en jeu ne restent plus devant leur équipe : ils sont posés sur la carte Tornade, au milieu de la table — ce sont vos animaux pris dedans. Chaque combinaison Abri en sort un, et l’équipe qui a sorti tous les siens remporte la manche. La table le montre sur la carte elle-même, une rangée par équipe, et le jeton sauvé s’envole de la carte vers celui qui vient de le sortir.',
      'Le compte ne bouge pas d’un chiffre : avec les jetons c’est toujours tout le stock de l’équipe, en Compromis toujours ce que la Tornade du jour retient, de un à trois carte par carte. Jouées à la même graine, 80 parties donnent exactement le même vainqueur, le même nombre de manches et la même durée aux deux places — ce qui change est le geste, et ce qu’on lit à la table.',
      'L’ancienne place reste réglable : « Où sont les jetons », dans la mise en place des Réglages et au Laboratoire, les laisse devant chaque équipe, face cachée, où l’Abri les retourne un à un. En Compromis, c’est alors la carte Refuge qui revient au centre du tapis. L’Immédiat, qui ne compte aucun jeton, est insensible au réglage.',
      'Tout ce qui parlait de jetons retournés se dit désormais du geste qu’on fait : le journal, le bandeau d’annonce, le compte rendu de fin de partie, les Règles et la fiche imprimée.',
      'Réparé au passage : une couleur d’équipe posée à même un élément ne prenait pas — les propriétés personnalisées ne s’écrivent pas comme les autres styles, et la nôtre se perdait sans bruit. La carte Refuge du Compromis montrait donc ses trois colonnes de la même couleur, et le compte rendu de fin de partie aussi. Les trois équipes s’y reconnaissent de nouveau.',
    ],
  },
  {
    version: '1.67',
    date: '24/08/2026',
    notes: [
      'La Tornade du Sommeil change de pouvoir : quatre lunes n’emportent plus la manche, elles endorment vos deux voisins. Elle passe ainsi de la manche la plus courte du paquet à une manche ordinaire — 46 s au lieu de 11 s en Compromis, 27 s en Immédiat — et devient une carte de gêne plutôt qu’un raccourci.',
      'Une règle jusqu’ici tacite est désormais écrite : la combinaison d’une carte Tornade, et le pouvoir qu’elle donne, valent dans les deux états. On n’a pas besoin d’être réveillé pour la réaliser, ni pour en profiter — c’est ce qui la distingue des combinaisons de base, dont la plupart demandent d’être réveillé. Elle figure dans les Règles, dans la fiche imprimée et dans l’aide des Réglages.',
    ],
  },
  {
    version: '1.66',
    date: '24/08/2026',
    notes: [
      'La fiche de règles n’explique plus sa propre typographie : la ligne qui annonçait le gras des réglages disparaît. Le gras reste — une feuille de règles se lit, elle ne se commente pas.',
      'La carte rotation se dit plus simplement : « l’équipe qui reçoit les dés peut choisir de la retourner ou non pour inverser le sens de rotation ».',
      'Et « Le tour de jeu » dit les choses dans le même ordre que le reste de la fiche : l’effet s’applique, puis le lot part vers le voisin.',
    ],
  },
  {
    version: '1.65',
    date: '24/08/2026',
    notes: [
      'Nouveau réglage — « Quand une combinaison sort » : elle s’applique d’office, la règle de base, ou l’on peut relancer par-dessus pour viser autre chose. Deux exceptions qui s’appliquent toujours, quoi qu’on règle : l’Abri, parce qu’il emporte la manche, et l’Échec, parce que les dés sont figés. La combinaison de la Tornade du jour non plus ne se refuse pas.',
      'À la table, le lot vous reste en main : relancez les dés que vous voulez, ou encaissez la combinaison d’un bouton. Les IA gardent ce qu’elles visaient et relancent le reste — une Pénible ne se réveille plus quand elle cherchait à endormir. Mesuré à six joueurs de caractères variés, elles relancent 28 % des combinaisons servies avec les jetons, 15 % en Immédiat, 19 % en Compromis, et les parties raccourcissent d’environ un dixième.',
      'Dans la fiche de règles, tout ce qui vient d’un réglage est désormais en gras, avec une ligne qui l’explique en tête de feuille : on distingue d’un coup d’œil ce qui tient du jeu de ce qui tient de la version qu’on a devant soi.',
      'La fiche dit maintenant les choses dans l’ordre où elles se produisent : « l’effet s’applique, puis le lot part vers le voisin ». Et elle ne signale plus les combinaisons que le dé ne peut pas produire — c’est une remarque d’équilibrage, elle n’a rien à faire sur une feuille de règles.',
    ],
  },
  {
    version: '1.64',
    date: '24/08/2026',
    notes: [
      'Les Tornades n’ont plus de flèche à leur dos : c’est la carte rotation, posée sur la table, qui porte le sens — et elle seule. Le réglage « Au dos de la prochaine Tornade » disparaît, et un réglage qui le demandait encore retombe sur la carte rotation. Restent deux façons d’en décider : la carte que les perdants peuvent retourner, ou l’alternance d’une manche à l’autre.',
      'Les Réglages se resserrent : « Comment se joue une manche » et « Le sens de rotation » partagent une carte, sur la même ligne. Le nombre de dés par lot n’occupe plus qu’une case étroite, avec la composition des six faces à côté de lui. Et les trois réglages de l’attrape — ce qui la déclenche, ce qu’elle rapporte, ce qui arrive quand deux lots se rencontrent — se lisent d’un seul coup d’œil, côte à côte.',
      'Les cartes Tornade des Réglages sont toutes à la même hauteur, celle de la plus haute du paquet : les rangées ne se décalent plus. Et leur texte ne vient plus toucher le cadre.',
    ],
  },
  {
    version: '1.63',
    date: '24/08/2026',
    notes: [
      'Le type de dé n’est plus un réglage : TornaDice se joue au d6, six faces, ni plus ni moins. Le choix d6/d8/d10 disparaît des Réglages et du Laboratoire. Ce que portent les faces, en revanche, se change toujours une à une — c’est là que se fait l’équilibrage.',
      'Un d8 ou un d10 enregistré du temps où l’on pouvait en changer revient à six faces, ses six premières conservées : sans cela il serait resté sans aucun moyen d’en sortir, puisque rien ne permet plus d’en retirer.',
      'Le réglage « Vichy » reçoit sa répartition de cartes pour gagner, effectif par effectif : 4 cartes à 3 joueurs, 5 de 4 à 6, 6 à 7 et 8. Le joueur Vert, seul contre deux équipes, en réunit 2 à 3 joueurs, 3 à 5 et 4 à 7.',
    ],
  },
  {
    version: '1.62',
    date: '24/08/2026',
    notes: [
      'Le paquet Tornade est désormais celui du carton imprimé, et rien d’autre : quatorze cartes, avec les titres et les textes exacts des cartes. « Tornade de Chauffe », « Tornade Paisible », « Tornade Maladroite », « Tornade Chargée », « Tornade des Tricheurs », « Tornade Chapardeuse », « Tornade de Cow-Boy », « Tornade du Siècle », « Méga Tornade », « Tornade du Sommeil », « Tornade Furieuse », « Tornade Électrique », « Tornade de Vaches », « Tornade de Poules ».',
      'Les deux Tornades qui n’étaient pas du paquet sortent du jeu : la « Tornade de feuille », que la Tornade de Chauffe remplace, et la « Mini-Tornade », dont la Chargée est l’inverse. Un paquet enregistré qui les contenait les perd sans bruit — elles n’existent plus.',
      'Les combinaisons sont celles dessinées sur les cartes : quatre abris pour la Méga Tornade, quatre lunes pour celle du Sommeil, trois tornades pour la Furieuse. Elles sont dans la définition des cartes, donc valables pour tout le monde et plus seulement dans le réglage Vichy.',
    ],
  },
  {
    version: '1.61',
    date: '24/08/2026',
    notes: [
      'Un premier réglage livré avec le jeu : « Vichy ». Il est écrit dans le code, donc le même pour tout le monde — rien à enregistrer, rien à partager. Il apparaît dans « Réglages enregistrés », aux Réglages comme au Laboratoire, et se choisit d’un clic. On peut le modifier chez soi : ces modifications ne valent que pour ce navigateur, et « Réglage d’origine » le rend tel qu’il est écrit. Il ne se renomme ni ne s’efface.',
      'Vichy joue en Immédiat, avec les quatorze Tornades du paquet imprimé et les combinaisons dessinées dessus : quatre abris pour la Méga, quatre lunes pour celle du Sommeil, trois tornades pour la Furieuse.',
      'Trois cartes manquaient et sont désormais codées : la « Tornade de chauffe », qui se joue mais ne rapporte pas de carte ; la « Tornade chargée », qui ajoute un lot de dés — l’inverse exact de la Mini-Tornade ; et la « Tornade des tricheurs », qui rend les dés à l’équipe gagnante au lieu de la perdante.',
      'Deux cartes s’alignent sur le carton : la « Tornade F5 » reprend son nom de « Tornade chapardeuse », et la « Tornade du Siècle » vaut double pour qui remporte la manche, sans combinaison à sortir — c’est la Méga Tornade qui porte les quatre abris.',
      'La carte Tornade de l’écran ressemble à celle qu’on a dans la main : cadre orange, panneau crème, titre en capitales penchées, et les mots que le carton met en couleur — « carte Tornade », le nom des équipes — repris en rouge. Aucune police n’est téléchargée pour autant : le site ne demande toujours rien à l’extérieur.',
      'Les tableaux de la page Règles défilent à l’horizontale sur téléphone au lieu de pousser la page de côté.',
    ],
  },
  {
    version: '1.60',
    date: '24/08/2026',
    notes: [
      'Le réveil et l’endormissement prennent la couleur de leur face : l’or du soleil pour l’un, la nuit bleu-violet de la lune pour l’autre. Ils étaient restés au bleu ciel et au violet clair d’avant le nouveau dé.',
      'La couleur suit partout le même événement : la ligne du journal, le halo autour du joueur, le bandeau d’annonce au centre de la table, l’éclat d’écran quand c’est vous qu’on endort, et la légende des alertes dans les Règles.',
    ],
  },
  {
    version: '1.59',
    date: '24/08/2026',
    notes: [
      'L’import d’une image de face est réparé. Quatre choses pouvaient l’empêcher, et chacune échouait en silence : le bouton cliquait le champ de fichier par du code, ce que certains navigateurs — Safari en tête — refusent d’exécuter ; le filtre de formats grisait dans le sélecteur les fichiers un peu inhabituels ; les images de plus de 400 ko étaient refusées ; et une écriture refusée par le navigateur n’était signalée nulle part.',
      'Le bouton est maintenant l’étiquette du champ lui-même : c’est le navigateur qui ouvre le sélecteur, sans code, et cela marche partout. Toute image est acceptée, quel que soit son format ou son poids — un fichier de plusieurs méga-octets est ramené à 256 px et ré-encodé en PNG à l’import, transparence comprise.',
      'Chaque échec se dit désormais en toutes lettres, à l’endroit où il se produit : fichier qui n’est pas une image, image indécodable, mémoire du navigateur pleine ou coupée en navigation privée.',
      'Une image ronde à fond transparent se pose exactement à la place des dessins du jeu : le blanc du dé reste à la charge de la page, et le rond garde le diamètre des autres faces. Une image opaque, elle, est toujours découpée en rond.',
      'Correction au passage : toutes les pastilles d’un même symbole partageaient un seul identifiant de découpe. Elles suivaient donc la première, et auraient disparu avec elle au premier redessin.',
    ],
  },
  {
    version: '1.58',
    date: '19/08/2026',
    notes: [
      'Le dé officiel change de visage : un soleil orange pour le Réveil, une grange verte pour l’Abri, une lune bleue pour le Sommeil, une tornade rouge pour la face qui fige le dé. Quatre images, quatre couleurs qu’on distingue d’un bout à l’autre de la table.',
      'Deux faces changent aussi de nom : le « ZzZ » devient le « Sommeil », et le « X » devient la « Tornade ». Le pouvoir, lui, ne bouge pas d’un iota — mêmes symboles pour le moteur, mêmes combinaisons, mêmes effets, et toutes les règles enregistrées restent valables.',
      'La face qui fige le dé rejoint les faces personnalisables : elles sont quatre désormais, chacune avec ses illustrations au choix et l’import de votre propre image. Tous les dessins d’avant restent proposés — le réveil, la maison, la tornade verte, la vache, le ZzZ violet, le ZzZ gris, la croix noire — et gardent la couleur qu’ils avaient.',
      'Les règles, les Réglages, le Laboratoire et la fiche PDF nomment les faces au lieu de les écrire en dur : « deux « Tornade » figent vos dés » suit désormais le nom que vous leur donnez, quel qu’il soit.',
      'Le joker gagne un filet blanc entre ses quatre quarts de couleur : avec l’orange du soleil à côté de celui de l’éclair, deux quarts voisins se lisaient comme une seule moitié.',
    ],
  },
  {
    version: '1.57',
    date: '19/08/2026',
    notes: [
      'Correction : les cartes ajoutées au jeu manquaient à qui avait composé son paquet à la main. Décocher une carte est un choix ; ne pas cocher une carte qui n’existait pas n’en est pas un — et rien ne distinguait les deux. Un paquet enregistré avant la v1.55 n’avait donc que dix Tornades au lieu de treize, aux Réglages comme dans la fiche PDF.',
      'Le paquet retient désormais ce qu’il avait sous les yeux au moment où on l’a composé : une carte arrivée depuis le rejoint, une carte décochée reste dehors. Les paquets d’avant sont datés par la plus récente des cartes qu’ils retiennent — ils récupèrent les trois Tornades de la v1.55 sans rien perdre de leurs autres choix.',
      'Le titre « Cartes Tornade en jeu » affiche le compte : 13/13 quand le paquet est complet. On voit d’un coup d’œil qu’il manque quelque chose.',
      'Correction d’impression : le cadre qui fait défiler les tableaux de la fiche sur téléphone restait actif sur papier, où il aurait coupé net ce qui dépassait d’une page. Et les longs tableaux se poursuivent maintenant d’une page à l’autre, en-tête repris, au lieu d’être poussés entiers sur la suivante — la fiche tient en trois pages au lieu de quatre.',
    ],
  },
  {
    version: '1.56',
    date: '19/08/2026',
    notes: [
      'Le ZzZ rejoint les faces personnalisables : « Apparence des faces » en compte trois au lieu de deux, et la face du sommeil se réhabille comme la bleue et la verte — un modèle fourni, ou votre propre image, découpée en rond.',
      'Un modèle est proposé d’emblée : « ZzZ gris ». Mêmes trois Z, même trait noir, sur une pastille grise plutôt que violette. Le gris est tenu à distance de celui de la face « ? » — deux faces grises qu’on confondrait à la table ne rendraient service à personne.',
      'Le violet reste l’officiel : c’est le dessin d’origine du jeu, et le bouton « Face officielle » y ramène. Comme pour les deux autres faces, le pouvoir ne bouge pas d’un iota — même symbole pour le moteur, mêmes combinaisons, même effet.',
    ],
  },
  {
    version: '1.55',
    date: '19/08/2026',
    notes: [
      'Trois Tornades entrent au paquet des modes Immédiat et Compromis, et la Tornade orageuse en sort. Les nouvelles ne donnent rien et ne demandent rien : elles gênent, et la manche se gagne comme d’habitude — l’Abri, ou le contact. C’est la respiration qui manquait à une pioche où presque toutes les cartes accélèrent.',
      '« Tornade paisible » — relancez les dés un par un : plus jamais deux dés en l’air à la fois, sauf le premier jet d’un lot neuf, qui part toujours en entier. « Tornade maladroite » — lancez les dés de votre autre main : tout est plus lent, et l’on relance un X par mégarde plus souvent. « Mini-Tornade » — jouez avec un lot de dés de moins, jamais moins d’un.',
      'Les trois demandent un seul jeton à l’Abri en Compromis : une Tornade qui vous handicape n’a pas en plus à vous en demander davantage. Mesuré à six joueurs, la Maladroite passe ainsi de 58 s à 37 s de manche — au milieu du paquet, au lieu d’en être la plus longue. En Immédiat, où rien ne compense, ce sont les trois manches les plus longues du paquet : 46 s pour la Mini-Tornade, 43 s pour la Paisible, 35 s pour la Maladroite, contre 28 s de moyenne.',
      'La Tornade orageuse demandait trois éclairs, un symbole que le dé officiel ne porte plus : elle ne pouvait plus rien faire et tenait la place d’une carte vivante.',
      'Si vous aviez déjà coché vos cartes à la main dans « Cartes Tornade en jeu », votre paquet reste le vôtre : les trois nouvelles y apparaissent décochées, à vous de les ajouter.',
    ],
  },
  {
    version: '1.54',
    date: '19/08/2026',
    notes: [
      'Une troisième façon de décider du sens de rotation : une carte de sens posée sur la table. Elle ne tourne pas toute seule — à la fin de chaque manche, l’équipe qui reçoit les dés, celle qui vient de perdre, la retourne pour inverser le sens ou la laisse en place. C’est un choix, jamais une obligation, et c’est le seul moment de la partie où l’on choisit ses voisins.',
      'Le sens de rotation se règle désormais à part de la façon de jouer une manche : « Une manche sur l’autre », « Au dos de la prochaine Tornade » ou « Carte de sens ». Les trois se marient avec les trois modes, dans les Réglages comme au Laboratoire. Un réglage enregistré avant cette version garde ce que son mode faisait — alternance avec les jetons, dos de carte ailleurs.',
      'Les IA savent y jouer : elles pèsent les deux sens — adresse de celui qui attrape, esquive de celui qu’on attrape, et goût de chacun pour le contact — et ne retournent la carte que si elles y gagnent. Sur 200 parties à six joueurs de caractères variés, elles la retournent 43 à 52 % du temps selon le mode ; sur une table de joueurs identiques, jamais : entre deux voisins interchangeables, il n’y a rien à gagner à bouger la carte.',
      'Quand un joueur humain reçoit les dés, la partie s’arrête le temps qu’il décide, comme à la révélation d’une Tornade. Sans réponse, la carte reste en place. La table montre la carte de sens à côté de la pioche, et la transition de fin de manche dit ce qu’elle est devenue.',
      'Les règles cessent d’être écrites pour une seule table : plus aucun nombre qui dépend de l’effectif n’apparaît en toutes lettres dans les phrases — les lots, les jetons, les cartes à réunir sont dans le tableau de mise en place, et le texte y renvoie. « 2 lots de 4 dés circulent » devient « plusieurs lots de 4 dés circulent — leur nombre dépend de l’effectif ». La page Règles gagne une section consacrée au sens de rotation, et la fiche imprimée décrit celui que vous avez réglé.',
    ],
  },
  {
    version: '1.53',
    date: '19/08/2026',
    notes: [
      'Les cartes pour gagner ne sont plus un nombre mais un tableau, comme les lots : une colonne par nombre de joueurs, de 3 à 8, et deux lignes — les équipes, puis le joueur Vert. Il joue seul contre deux équipes : il lui faut son propre objectif, et c’est le levier d’équilibrage le plus direct qu’il ait. Mesuré à 5 joueurs en Compromis, le Vert gagne 28 parties sur 60 à 2 cartes contre 2 sur 60 à 5.',
      'Le tableau est propre au mode de jeu : trois cartes avec les jetons, quatre en Immédiat, cinq en Compromis. Les manches n’ont pas la même durée d’un mode à l’autre — un objectif posé pour l’un n’a rien à faire dans l’autre, et changer de mode ne touche plus à ce qu’on avait réglé ailleurs. Un bouton « Valeurs de départ » remet le mode affiché d’aplomb.',
      'La ligne du Vert n’existe qu’aux effectifs impairs, les seuls où il est là ; ailleurs la case affiche un tiret. Laissée à la même valeur que les équipes, il gagne aux mêmes conditions.',
      'L’accueil suit : « Cartes pour gagner » et « Cartes du Vert » y écrivent dans la ligne de la table qu’on compose. Le Laboratoire lit les mêmes tableaux quand on change le nombre de joueurs ou le mode d’une campagne.',
      'La fiche de règles imprimée le montre à son tour : la colonne « Cartes pour gagner » de sa mise en place varie ligne par ligne et signale l’objectif du Vert quand il diffère, et la section du joueur Vert l’énumère effectif par effectif.',
      'Un réglage enregistré avant cette version repose son nombre unique sur la ligne de l’effectif d’alors, et dans le seul mode où il avait été posé.',
    ],
  },
  {
    version: '1.52',
    date: '19/08/2026',
    notes: [
      'La fiche de règles ne décrit plus une seule table : sa mise en place est un tableau de trois à huit joueurs — équipes, lots, dés par lot, jetons, cartes pour gagner — et la ligne de votre table est mise en relief. On sort la feuille une fois, elle sert quel que soit l’effectif du soir.',
      'Le joueur Vert a sa section : à quels effectifs il existe, ses jetons, son objectif en cartes, ses combinaisons propres si vous les avez réglées à part, et la carte Tornade qui le désigne — celle qui sort du paquet à nombre pair, faute de Vert à désigner. Quand ses exigences diffèrent, le tableau des combinaisons gagne une colonne « Dés du Vert » ; sinon elle n’apparaît pas, plutôt que de répéter la précédente.',
      'Les dés d’une combinaison tiennent désormais sur une seule ligne, quel qu’en soit le nombre : une exigence de quatre dés coupée en deux se lisait mal. Les en-têtes des colonnes étroites ne se coupent plus non plus.',
    ],
  },
  {
    version: '1.51',
    date: '19/08/2026',
    notes: [
      'Une fiche de règles, à imprimer ou à enregistrer en PDF : le bouton est en haut de la page Réglages. Elle écrit les règles de la partie que vous venez de régler — votre dé face par face, vos combinaisons avec leurs seuils, votre mise en place, vos cartes en jeu — et non les règles du jeu en général.',
      'Elle est faite pour une vraie table : rien de ce qui concerne les IA ni la table virtuelle n’y figure. Ni caractères, ni durées, ni adresse, ni graine — ces réglages n’existent que pour la simulation.',
      'Les textes ne sont pas recopiés de la référence, ils décrivent ce que la partie fera vraiment. L’Abri retourne un jeton, remporte la manche ou pose un jeton sur le Refuge selon le mode ; la combinaison qui porte l’attrape — l’Attaque ou l’Échec, selon votre réglage — annonce le contact et ce qu’il rapporte. Une combinaison que votre dé ne peut pas produire est signalée à part plutôt que listée comme jouable.',
      'Aucune bibliothèque n’est chargée pour cela : la fiche est un document que le navigateur imprime, et c’est lui qui écrit le PDF. Le site reste statique, sans dépendance.',
    ],
  },
  {
    version: '1.50',
    date: '19/08/2026',
    notes: [
      'Une troisième façon de jouer une manche : « Compromis ». Les deux premières se renomment au passage — « Retourner tous les jetons » devient « Jeton », « Sans les points » devient « Immédiat ».',
      'Compromis est un entre-deux : les jetons reviennent, mais ils ne se retournent plus, ils se posent. Une carte Refuge commune trône au milieu de la table, et la Tornade en cours dit combien de jetons de sa couleur il faut y mettre pour prendre la manche — de un à trois, indiqué sur la carte. Chaque combinaison Abri en pose un de plus.',
      'Deux façons de prendre la manche, et deux seulement : poser le dernier jeton demandé — vos animaux sont à couvert, la manche est à vous sur-le-champ — ou réussir une collision, qui envoie valser un jeton adverse dans la tornade et emporte la manche de la même façon. La partie se gagne à cinq cartes Tornade.',
      'Le nombre de jetons demandés se règle carte par carte, dans « Cartes Tornade en jeu » : c’est le levier d’équilibrage propre au mode. Une Tornade exigeante fait une manche longue, une Tornade légère une manche expédiée. Le paquet et les exigences de combinaisons sont eux aussi propres à ce mode : ce que vous réglez ici ne touche pas les deux autres.',
      'Les IA y jouent sans rien apprendre de nouveau : elles visent l’Abri une fois réveillées, comme dans les deux autres modes, et le Refuge se remplit tout seul. Mesuré sur 200 parties d’IA équilibrées à six joueurs : partie de 4 min 29 s en 6,4 manches, soit exactement entre les 8 min du mode Jeton et les 2 min 28 s de l’Immédiat. L’Abri emporte 43 % des manches, la collision 40 %, les combinaisons de cartes le reste.',
      'La collision y pèse deux fois plus que dans l’Immédiat : le chemin de l’Abri étant plus long, le raccourci vaut davantage. C’est le premier point à surveiller à l’essai, et les exigences par carte le règlent directement.',
      'Sous le capot, le mode de jeu n’est plus un oui-ou-non mais un nom — il en fallait trois. Un réglage, une campagne ou une partie enregistrés avant cette version se relisent au mot près.',
    ],
  },
  {
    version: '1.49',
    date: '19/08/2026',
    notes: [
      'TornaDice se joue désormais de trois à huit joueurs : la table de neuf disparaît partout — l’accueil, les Réglages, le Laboratoire, les Règles, le tableau des lots et celui de la mise en place. C’était la seule ligne extrapolée du jeu, le tableau officiel s’arrêtant à huit ; les mentions d’extrapolation s’en vont avec elle.',
      'Une table de neuf joueurs enregistrée avant cette version revient à huit d’elle-même, à l’ouverture comme au Laboratoire : rien ne reste bloqué sur un effectif qui n’existe plus.',
    ],
  },
  {
    version: '1.48',
    date: '19/08/2026',
    notes: [
      'Les lots en jeu ne sont plus un nombre mais un tableau : une colonne par nombre de joueurs, de 3 à 9, dans les Réglages. La partie lit la ligne de sa table, et la colonne de votre effectif est mise en relief. C’était un réglage unique dont on ne savait plus pour quel nombre de joueurs il avait été posé — trois lots à six joueurs n’ont rien à voir avec trois lots à trois.',
      'Le tableau part sur les valeurs officielles — 2 lots à 3 et 4 joueurs, 3 à 5 et 6, 4 à 7 et 8, 5 à 9 — et chaque ligne se règle à part. Un bouton « Tableau officiel » remet les sept d’aplomb, et n’apparaît que si l’une d’elles a bougé.',
      'Le champ « Lots en jeu » de l’accueil écrit maintenant dans la ligne de la table qu’on est en train de composer, et le Laboratoire lit la même : changer le nombre de joueurs d’une campagne y amène le bon nombre de lots. Un réglage enregistré avant cette version repose sa valeur sur la ligne de l’effectif d’alors.',
      'Les lots quittent du même coup la case « Suivre le tableau officiel » : ils ont leur propre tableau, la case ne gouverne plus que les jetons et les cartes.',
      'Correction : dans les Réglages, les menus qui posent un symbole sur une face du dé affichaient encore « Tornade » et « Vache » sous un réveil et une maison. Ils disent le nom affiché — « Réveil », « Abri » — comme partout ailleurs.',
    ],
  },
  {
    version: '1.47',
    date: '18/08/2026',
    notes: [
      'La fin de partie a sa page. Le carton de quatre colonnes posé au milieu de la table laisse la place à un vrai compte rendu, qui s’ouvre tout seul au coup de sifflet final. Le moteur comptait déjà tout : rien n’en était montré.',
      'En tête, le vainqueur à ses couleurs, avec les manches jouées, la durée, les lancers de dés, les attrapes tentées et réussies, et la graine pour rejouer la même partie. Puis le score des équipes — cartes remportées, jetons restants — et pourquoi la partie s’est arrêtée.',
      'Une ligne par joueur : manches conclues, jetons, lancers, combinaisons réalisées, attrapes réussies sur tentées, attrapes subies, réveils, endormissements, bourdes, et la part de la partie passée dés en main. De quoi voir d’un coup qui a porté son équipe et qui a subi la partie.',
      'Les faits marquants : la manche la plus longue et la plus expédiée, le meilleur attrapeur, le plus attrapé, le plus endormi, le plus gros lanceur, le plus maladroit. Les ex æquo sont nommés, plutôt que d’élire arbitrairement l’un des trois.',
      'Puis les combinaisons sorties avec leur exigence en dés et leur part, l’origine des jetons retournés, et le déroulé manche par manche : durée, barre de durée relative, qui l’a conclue et comment — l’Abri, le dernier jeton, une attrape et sa victime, la combinaison de la carte, ou la bourde d’un adversaire — avec la carte Tornade en jeu et le sens de rotation. Toute la partie s’exporte en CSV, joueurs et manches compris.',
      'Le compte rendu tient dans le navigateur : il survit à un rechargement et reste consultable depuis l’Historique jusqu’à la partie suivante.',
    ],
  },
  {
    version: '1.46',
    date: '18/08/2026',
    notes: [
      'Les dés d’un joueur ne débordent plus de sa zone, quel que soit le nombre par lot. Au-delà de quatre dés ils rapetissent, et à partir du moment où ils descendraient sous 26 px — en dessous, la face ne se lit plus — la rangée passe à la ligne : à douze dés, deux rangées de six, bien à l’intérieur de la carte. Sur téléphone le plafond descend à 30 px, les sièges y étant plus étroits.',
      'Au Laboratoire, la colonne de configuration ne passe plus sous les résultats. Elle s’élargissait au gré du nombre de dés — « Joker éclair/ZzZ » imposait à lui seul 466 px dans une piste qui en fait 420 — et le débordement était recouvert par la colonne de droite. Les menus déroulants se serrent maintenant comme le reste, et la colonne tient sa largeur.',
      'Contrôlé au navigateur à 4, 5, 6, 8 et 12 dés, sur la table, les Réglages et le Laboratoire, de 390 à 2000 pixels de large : aucun débordement, aucune zone masquée.',
    ],
  },
  {
    version: '1.45',
    date: '18/08/2026',
    notes: [
      'Le renommage et la suppression d’un réglage enregistré passent derrière un bouton « Éditer », à côté de « + Nouveau ». Le bandeau ne montre plus que ce qu’on vient y chercher : la liste des réglages et celui qui est en cours. « Terminé » referme, et le mode se referme aussi dès qu’on sélectionne un autre réglage — on clique une puce pour s’en servir, pas pour la renommer.',
      'Le bouton n’apparaît pas sous « Par défaut » : il n’a ni nom propre ni existence à supprimer, un bouton sans effet n’avait rien à faire là.',
    ],
  },
  {
    version: '1.44',
    date: '18/08/2026',
    notes: [
      'Les réglages s’enregistrent sous un nom, autant qu’on veut. Un bandeau coiffe désormais la page Réglages et le Laboratoire : « Par défaut », puis vos réglages nommés. Un clic sur l’un d’eux change tous les paramètres d’un coup — dans les Réglages, dans le Laboratoire, et pour la partie suivante. Comparer deux équilibrages ne demande plus de tout remodifier à la main puis de tout remettre.',
      '« + Nouveau » copie les réglages en cours dans un réglage nommé et s’y installe : tout ce que vous modifiez ensuite s’y enregistre, et les autres ne bougent pas. Le nom se change dans son champ, la suppression demande un second clic, et « Par défaut » n’est jamais effacé — ce ne sont pas des enregistrements mais les réglages libres du site, retrouvés tels qu’on les avait laissés.',
      'Le Laboratoire garde sa propre configuration de campagne, modifiable à part : elle est refaite au moment où le réglage sélectionné change, jamais autrement. Ce que vous y ajustez pour une campagne ne se perd pas en changeant de page.',
      'La face verte prend un vert bien plus clair et vif, celui de l’Abri. L’ancien vert forêt venait de la vache et sonnait terne sous une maison au trait noir.',
    ],
  },
  {
    version: '1.43',
    date: '18/08/2026',
    notes: [
      'La face verte porte désormais une maison : c’est l’Abri, et c’est le nouveau dé officiel du site. Elle est là dès l’ouverture, sur les dés comme dans tous les menus, sans rien à régler. Le dessin est au trait noir, comme le réveil de la face bleue, pour que les deux faces se répondent.',
      'La tornade verte, officielle depuis la 1.37, reste proposée dans « Apparence des faces » — comme la vache du tout premier dessin, et comme votre propre image importée. Le nom suit le dessin choisi, et « Face officielle » remet le dé d’aplomb.',
      'Rien ne change sous le capot : le moteur parle toujours de « vache », avec la même combinaison et le même effet. Une partie, une campagne, un réglage enregistrés restent valables au mot près.',
    ],
  },
  {
    version: '1.42',
    date: '18/08/2026',
    notes: [
      'La face verte s’appelle désormais l’Abri : la combinaison, le jeton qu’elle retourne, l’annonce à la table, les Règles, les profils d’IA et le Laboratoire suivent. Restent des vaches là où ce sont vraiment des vaches : les Bleus gardent leur emblème et leur « Tornade de Vaches ».',
      'Le dessin et le nom affiché de la face ne bougent pas — elle reste la Tornade verte du dé officiel, et l’ancien dessin de vache est toujours à un clic dans « Apparence des faces ». L’identifiant interne ne change pas non plus : toute partie, toute campagne et tout réglage enregistrés restent valables au mot près.',
      'Correction : les cases « Réveillé » de l’Abri et de l’Endormi ne se décochaient pas. Leur condition d’origine est justement « Tornade éveillée », et décocher réécrivait cette même valeur — la case revenait cochée aussitôt, sans qu’on puisse rendre ces deux combinaisons disponibles en dormant. Décocher lève désormais la condition ; seul le Réveil retombe sur « endormi », faute de quoi on ne pourrait plus jamais se réveiller.',
      'Une vérification garde la porte fermée : pour chaque combinaison, décocher doit changer la condition, et le moteur doit bien proposer un Abri décoché à un joueur endormi.',
    ],
  },
  {
    version: '1.41',
    date: '18/08/2026',
    notes: [
      'La durée moyenne d’une manche rejoint le bandeau de chiffres clés du Laboratoire, à côté de celle de la partie, avec sa médiane. C’est l’unité qu’on règle vraiment — la partie n’en est que la somme, et voir bouger l’une sans l’autre dit tout de suite si un changement raccourcit les manches ou en ajoute. Elle n’était donnée qu’en note sous l’histogramme des durées.',
      'La note sous l’histogramme ne répète donc plus la moyenne : elle donne la manche du décile haut, une manche sur dix la dépasse. Et l’export CSV emporte la médiane et ce décile en plus de la moyenne.',
      'Le bandeau s’ajuste au nombre de tuiles au lieu d’en imposer quatre : cinq chiffres tiennent sur une ligne à partir d’environ 940 pixels, deux par ligne sur téléphone.',
      'Mesuré sur 200 parties à six joueurs avec jetons : partie moyenne 7 min 59 s, manche moyenne 1 min 29 s, médiane 1 min 23 s, et une manche sur dix au-delà de 2 min 17 s.',
    ],
  },
  {
    version: '1.40',
    date: '18/08/2026',
    notes: [
      'La flèche de rotation est deux fois plus grosse et posée en plein milieu de la pioche, sur les cartes elles-mêmes. Elle était en pastille de 26 pixels dans le coin haut-gauche, où elle se confondait avec un badge : c’est l’information qu’on cherche du regard au coup d’envoi d’une manche, elle occupe désormais le centre du dos de carte.',
      'Sur téléphone elle reste centrée, à une taille adaptée à la pioche plus courte ; le message de fin de manche y passe aussi à une taille lisible sans déborder.',
    ],
  },
  {
    version: '1.39',
    date: '18/08/2026',
    notes: [
      'Correction, la plus importante de cette version : les combinaisons réglées sur les cartes Tornade n’arrivaient pas à la table. Le moteur lisait bien les vôtres, mais l’affichage — la carte du jour, le panneau de la carte en cours, le pop-up d’ouverture — montrait les exigences d’origine. On jouait donc une combinaison et on en lisait une autre. Les trois lectures passent maintenant par le réglage, et une vérification le tient fermé : quarante parties avec une exigence forcée, quarante réalisations.',
      'Les combinaisons par défaut des Tornades nommées sont enregistrées : Tornade du Siècle quatre Vaches, de Sommeil trois Zzz, orageuse trois éclairs, furieuse trois X, Mega-Tornade une de chaque — Réveil, Vache, Zzz, éclair. Les autres n’ont pas de combinaison, leur pouvoir joue tout seul.',
      'Deux d’entre elles ne peuvent pas sortir sur le dé officiel : la Tornade orageuse demande trois éclairs et la Mega-Tornade en demande un, alors que le dé n’en porte aucun. Les Réglages le signalent sous la carte, le Laboratoire affiche 0 % de sortie. Il faut poser un éclair sur une face pour les rendre jouables.',
      'À la fin d’une manche, un message central annonce qui l’emporte et pourquoi : « Louise fait gagner les Jaunes en sortant la Vache », « … en attrapant Marc », « … avec la combinaison de « Tornade furieuse » », « … en retournant le dernier jeton ». Il passe devant tout le reste et reste lisible plus longtemps qu’une annonce ordinaire.',
      'Au début de chaque manche, la Tornade du tour s’affiche en grand : son nom, son pouvoir écrit en toutes lettres, sa combinaison s’il y en a une, et le sens dans lequel la manche va tourner. Espace, Entrée ou un clic passe l’écran ; il s’efface seul au bout de quelques secondes, et d’autant plus vite que la vitesse de jeu est haute.',
      'La pioche porte la flèche du tour en cours — ↻ ou ↺, le sens qu’annonce la prochaine carte face cachée. Elle est au même endroit que le compte de tornades restantes, et elle s’accorde avec celle du pop-up.',
      'La Tornade de Cow-boy sort du paquet quand aucun joueur Vert n’est en jeu ; les Réglages l’écrivent désormais sous la carte, aux nombres pairs de joueurs, au lieu de la laisser cochée sans effet.',
      'Correction : la Tornade de feuille rapporte bien sa carte à l’équipe qui gagne la manche. Elle n’a simplement aucun pouvoir — c’est la manche de chauffe, elle se gagne et se compte comme les autres. Elle était comptée pour rien depuis la 1.38.',
      'Mesuré après ces réglages, sur 300 parties d’IA équilibrées : partie médiane 2:57 en 5 manches à quatre joueurs, 2:40 en 6 à cinq, 2:20 en 5 à six, 2:03 en 6 à neuf.',
    ],
  },
  {
    version: '1.38',
    date: '18/08/2026',
    notes: [
      'Le mode « sans les points » a son propre paquet de onze Tornades, sans rien de commun avec les cartes Journée : Tornade de Vaches, de Poules, de Cow-boy, du Siècle, de Sommeil, électrique, orageuse, furieuse, Mega-Tornade, de feuille et F5. Le mode avec les jetons garde ses douze cartes Journée, intactes.',
      'Sans jeton à retourner, une carte ne joue plus que sur les cartes elles-mêmes. Les trois premières doublent la mise d’une équipe donnée si elle remporte la manche ; quatre l’emportent à la combinaison ; la Tornade du Siècle l’emporte et vaut deux cartes ; l’électrique paie double une manche prise en attrapant ; la F5 vole sa carte à une autre équipe ; la Tornade de feuille est la manche de chauffe, elle ne rapporte rien.',
      'Deux cartes d’un coup se paient sur la pioche, comme à la table : l’équipe prend la carte en cours et celle du dessus, gardée face cachée dans sa pile. Rien ne s’invente — une vérification contrôle qu’aucune partie ne distribue plus de cartes que le paquet n’en contient.',
      'Le sens de rotation ne s’inverse plus d’une manche à l’autre. Chaque Tornade porte une flèche au dos, et la manche se joue dans le sens qu’annonce la prochaine carte, encore face cachée sur la pioche : deux manches de suite peuvent donc tourner dans le même sens. Les flèches sont montrées sur chaque carte, dans les Réglages comme dans les Règles.',
      'Les combinaisons des cartes se règlent désormais sur la carte elle-même, sous « Cartes Tornade en jeu » : chaque carte porte son texte, sa flèche et ses cases de dés au même endroit. Le tableau des combinaisons ne garde que les combinaisons de la Tornade, et renvoie vers les cartes.',
      'La Tornade de Cow-boy désigne le joueur Vert : à nombre pair de joueurs elle ne désignerait personne, elle sort donc du paquet toute seule.',
      'Mesuré sur 300 parties d’IA équilibrées à six joueurs : partie médiane 2:36 en six manches. Taux de sortie des combinaisons de cartes — Tornade furieuse 51 %, Mega-Tornade 48 %, du Siècle 40 %, orageuse 39 %, de Sommeil 26 %. Les exigences de départ sont à ajuster carte par carte, c’est à cela que sert le tableau.',
    ],
  },
  {
    version: '1.37',
    date: '18/08/2026',
    notes: [
      'Nouveau dé officiel : la face bleue porte le Réveil, la face verte porte la Tornade. C’est désormais l’habillage par défaut du site — inutile de le régler, il est là dès l’ouverture, sur les dés comme dans tous les menus et les Règles.',
      'Rien ne change sous le capot : le moteur continue de parler de « tornade » et de « vache », avec les mêmes combinaisons et les mêmes pouvoirs. Une configuration enregistrée, une règle réglée, une campagne du Laboratoire — tout reste valable au mot près.',
      'L’ancien dessin reste à portée de clic. Dans « Apparence des faces », chaque face propose son illustration officielle, l’ancienne, ou la vôtre importée ; le nom suit le dessin choisi, et « Face officielle » remet tout d’aplomb.',
    ],
  },
  {
    version: '1.36',
    date: '18/08/2026',
    notes: [
      'Correction : le Laboratoire ne s’ouvrait plus du tout depuis la 1.35 — écran blanc, en haut comme en bas. En cause, le dernier résultat de campagne gardé dans le navigateur : produit par une version antérieure, il n’avait pas les colonnes ajoutées en 1.35, et la première lecture d’un champ absent emportait la page entière. Les tests partaient d’un navigateur vierge et ne pouvaient pas le voir.',
      'Chaque résultat de campagne porte désormais le numéro du format qui l’a produit. Un résultat d’une version antérieure est simplement écarté — le Laboratoire s’ouvre sur son panneau d’accueil, il suffit de relancer la campagne. Les colonnes qui manqueraient malgré tout affichent zéro au lieu de faire tomber l’écran.',
      'Une vérification ajoutée à la suite de tests garde la porte fermée : elle contrôle que chaque campagne porte son format et que ce format couvre bien les champs que la page lit.',
    ],
  },
  {
    version: '1.35',
    date: '18/08/2026',
    notes: [
      'Les cartes Journée s’appellent désormais cartes Tornade, partout : les Réglages, la table, les Règles, le Laboratoire, le code. Les noms propres des cartes ne bougent pas — « Journée de la fatigue » reste « Journée de la fatigue ».',
      'Les équipes ont leur emblème : les Bleus sont les vaches, les Jaunes les poules, et le joueur Vert est le cowboy. Les trois pictogrammes sont dessinés au même trait que les faces de dés et accompagnent le nom de l’équipe sur l’accueil, à la table et dans les Règles.',
      'Le Vert peut avoir ses propres combinaisons. Cochez « Combinaisons du Vert à part » dans les Réglages et chaque ligne du tableau se dédouble : celle des Bleus et des Jaunes, celle du Vert. C’est le levier d’équilibrage le plus direct qu’il ait — sur 150 parties à 5 joueurs, un Réveil et une Vache à deux dés au lieu de trois le font passer de 41 % à 96 % de victoires ; à quatre dés, il retombe à 5 %. Décochée, la table redevient strictement symétrique, et c’est ainsi qu’elle part.',
      'Chaque mode de jeu a maintenant son propre paquet de cartes et ses propres exigences : ce que vous cochez dans « Cartes Tornade en jeu » ne vaut que pour le mode affiché, et l’autre garde le sien intact. « Jour sans vent » — qui recache un jeton adverse — quitte le paquet « sans les points » par défaut, puisqu’elle n’y ferait rien du tout.',
      'Nouvelle colonne « Réveillé » dans le tableau des combinaisons : cochée, la combinaison ne sort plus que Tornade éveillée. Décochée, elle reprend sa condition d’origine — le Réveil reste réservé au dormeur, sans quoi on ne pourrait plus jamais se réveiller.',
      'En partie, les combinaisons sont rangées en deux listes plutôt qu’une : « Combinaisons (Endormi) » et « Combinaisons (Réveillé) ». C’est la question qu’on se pose à la table, elle a désormais sa réponse sous les yeux.',
      'Et la table n’affiche plus les combinaisons que le dé ne peut pas produire. Sans face joker, « Trois jokers » n’était pas une règle en sommeil mais une ligne morte ; sans éclair, l’Attaque de même. Les Réglages signalent la même chose sous les cartes concernées.',
      'Deux faces se réhabillent quand vous voulez, dans les Réglages : la Tornade et la Vache. Un modèle fourni — un réveil sur fond bleu, une tornade sur fond vert — ou votre propre image, importée d’un clic et découpée en rond. Le nom affiché se change dans la foulée. Le pouvoir, lui, ne bouge pas d’un iota : même symbole pour le moteur, même combinaison, même effet.',
      'Les statistiques du Laboratoire séparent enfin les combinaisons de base de celles des cartes : les premières sont disponibles à chaque lancer, les secondes une manche sur douze, et les mélanger écrasait la fréquence réelle des deux. Le tableau des cartes gagne un taux de sortie — la part des manches où la carte était en jeu et où sa combinaison est effectivement tombée. Un taux à 0 % désigne une combinaison que le dé ne peut pas produire : sur le dé officiel, « Journée de la chance » demande quatre éclairs qui n’existent pas.',
      'L’accueil se suffit à lui-même pour lancer une partie : le mode de jeu s’y change d’un bouton, et les dés par lot, les lots en jeu, les jetons et les cartes pour gagner s’y modifient directement. La page Réglages garde tout le reste.',
      'Correction : au Laboratoire, la combinaison Attaque avait disparu du tableau des configurations enregistrées de longue date, sans le moindre signe. Une configuration repart désormais de la liste de référence et y repose les seuils réglés : une combinaison ajoutée depuis — ou perdue en route — revient à sa place.',
      'Les boutons « Modèles » de répartition des faces quittent le Laboratoire, avec la phrase de rappel qui les suivait. Le dé se règle face par face, c’est plus clair que sept modèles dont un seul servait.',
    ],
  },
  {
    version: '1.34',
    date: '17/08/2026',
    notes: [
      'Sans les points, « Ce que rapporte l’attrape » redevient un vrai réglage : il démarre sur « Manche gagnée si le contact réussit », parce que c’est la base du mode, mais il se modifie comme n’importe quel autre. Il était figé depuis la 1.32 — la case grisée se lisait comme un réglage inactif alors qu’elle était forcée.',
      'Ce que ça change à la table : sur 200 parties à six joueurs, 1,5 manche par partie est prise au contact, et la partie gagne près d’une minute (3:37 contre 4:10). Remis sur « Un jeton », l’attrape sans les points ne fait plus qu’interrompre le voisin — les menus le disent en toutes lettres au lieu de vous laisser le découvrir en jouant.',
      'Nouveau réglage, dans « Mise en place » : « Qui commence ». On choisit qui prend les dés à la première manche — les Jaunes selon la règle, les Bleus, ou le Vert seul. Le Vert accompagne l’équipe désignée dans les deux premiers cas ; désigné seul, il ouvre seul et les lots restants vont aux joueurs suivants. Les manches suivantes ne bougent pas : elles reviennent toujours aux perdants de la précédente.',
      'Mesuré avant de le livrer : le premier tour de table ne décide rien. Sur 300 parties par ligne, de 4 à 9 joueurs, dans les deux modes, les taux de victoire ne bougent pas au-delà du bruit d’échantillonnage. C’est un réglage de confort — ouvrir la partie du bon côté de la table — pas un levier d’équilibrage, et les Règles le disent.',
      'Le réglage est aussi au Laboratoire, avec le reste. Une configuration enregistrée avant cette version ouvre sur les Jaunes, comme avant.',
    ],
  },
  {
    version: '1.33',
    date: '17/08/2026',
    notes: [
      'Sur l’accueil, les deux noms passent en gras sous le titre : Sylvain Bonnafous et Big Budi Games. Ce sont eux que l’on vient lire, pas la mention qui les introduit.',
    ],
  },
  {
    version: '1.32',
    date: '17/08/2026',
    notes: [
      'Nouvelle façon de jouer une manche, à choisir en haut des Réglages : « Sans les points ». On se réveille aux trois tornades, puis on cherche les trois vaches — et le premier joueur qui les sort arrête la manche sur-le-champ. Son équipe prend la carte Journée, et la manche suivante commence aussitôt. Plus aucun jeton n’est compté : c’est le nombre de cartes qui fait le vainqueur, quatre par défaut au lieu de trois.',
      'Dans ce mode, l’attrape emporte la manche elle aussi : il n’y a plus de jeton à prendre, un contact réussi vaut donc la manche entière. La course se gagne des deux mains — sortir la Vache, ou attraper celui qui allait la sortir. Sur 60 parties à six joueurs, 105 manches sont prises à l’attrape contre 310 à la Vache. Le réglage « Ce que rapporte l’attrape » n’a plus de second terme à proposer : il s’affiche figé.',
      'La version de base ne bouge pas d’un pouce : le mode « Retourner tous les jetons » reste coché, et à graine égale la partie est rigoureusement la même qu’en 1.31 — c’est vérifié par les tests. Tout le reste des réglages continue de fonctionner dans les deux modes : le dé, les combinaisons, les X qui figent, le rythme de la table.',
      'Sans les points, la manche est trois fois plus courte et la partie deux fois : à six joueurs, 31 s par manche contre 95 s, et 3:34 la partie contre 7:54. Mesuré sur 200 parties d’IA équilibrées par ligne, de 3 à 9 joueurs.',
      'Les cartes Journée montrent enfin ce qu’elles font dans les Réglages : chacune porte son nom, sa combinaison en miniatures de dés et son effet, au lieu d’une simple pastille dont le texte se cachait dans une infobulle. Celles qui manipulent les jetons disent en plus ce que le mode leur fait — « Jour sans vent » n’a plus d’effet, « Élevage intensif » et « Troupeau » emportent la manche comme la Vache.',
      'À nombre impair, la manche devient une course où chacun joue pour soi, et le Vert, seul contre deux équipes, la perd presque toujours : 7 % de victoires à 5 joueurs, 1 % à 9. Le réglage « Cartes du Vert » est là pour ça — deux cartes au lieu de quatre le ramènent à 43 % (5 joueurs) et 18 % (9 joueurs). Les Réglages le rappellent dès que le mode est actif.',
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
