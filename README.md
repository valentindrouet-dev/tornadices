# TornaDice — table de jeu virtuelle et laboratoire d’équilibrage

Site statique, sans dépendance ni étape de compilation : du HTML, du CSS et des
modules JavaScript natifs. Il implémente les règles V4.5 de TornaDice pour 3 à
9 joueurs, chaque siège pouvant être tenu par un humain ou par une IA, et fournit
les outils d’analyse nécessaires à l’équilibrage.

## Lancer le site

Les modules ES imposent un vrai serveur — ouvrir `index.html` en `file://` ne
fonctionne pas.

```bash
python3 -m http.server 5173     # puis http://localhost:5173
# ou
npm start
```

Le dépôt se publie tel quel sur GitHub Pages ou tout hébergement statique. Un
workflow (`.github/workflows/pages.yml`) déploie automatiquement à chaque
poussée — à activer une fois dans *Settings → Pages → Source : GitHub Actions*.

## Changer de version

```bash
node scripts/version.mjs 1.20     # estampille tout le site
```

Chaque module est importé avec son numéro de version (`./dom.js?v=1.20`). Sans
cela, les navigateurs gardent les modules ES en cache sous leur URL et peuvent
continuer de servir une version périmée — un écran restait bloqué sur une
ancienne version sans qu'on le voie. Le script réécrit tous les imports, le
numéro embarqué, et dans le HTML le point d'entrée, la feuille de style, les
icônes et le manifeste. Il reste à rédiger les notes dans
`src/version.js`.

Au démarrage, le site relit sa version sur le serveur et propose de recharger
si l'écran est en retard.

## Ce que contient le site

| Page | Contenu |
|---|---|
| **Accueil** | Qui joue : 3 à 9 joueurs, siège par siège Humain ou IA. |
| **Réglages** | Toutes les options d'une partie : faces des dés (jokers compris), combinaisons requises, règle des trois jokers, rythme de la table, mise en place, adresse, cartes Tornade, graine. |
| **Table** | La partie en temps réel : table circulaire, dés qui roulent, lots qui traversent, fenêtres d'attrape, journal. Le siège d'un joueur réveillé prend la couleur de son équipe, celui d'un dormeur reste gris. |
| **Laboratoire** | Campagnes de parties simulées, probabilités exactes des dés, règles chiffrées. |
| **Historique** | Parties jouées, statistiques cumulées, export CSV. |
| **Règles** | Les règles telles que le moteur les applique. |
| **Versions** | Journal des versions, incrémenté à chaque modification livrée. |

## Les sons

Quatre sons — réveil, ronflement, meuglement, alarme d'attrape — **synthétisés à
la volée** dans `src/ui/sons.js` : oscillateurs et bruit brun filtrés, aucun
fichier audio, aucune licence, zéro octet à télécharger. Chaque son est une
fonction qui pose ses nœuds sur un contexte donné : la table lui passe le
contexte vivant, une épreuve lui passe un `OfflineAudioContext` et mesure ce qui
en sort. Les navigateurs refusant d'ouvrir le son sans geste préalable, le
contexte s'ouvre sur le bouton qui lance la partie.

## Bureau et mobile

Une seule feuille de style, deux dispositions. Tout ce qui est propre au
téléphone tient dans `@media (max-width: 860px)` : la table ronde devient une
colonne (carte, pioche, compteurs, puis les sièges deux par ligne, sans aucun
recouvrement, **rangés en anneau** — on descend à droite, on remonte à gauche,
si bien que deux voisins de table restent voisins à l'écran et que le dernier
rejoint le premier ; à nombre impair, le siège d'en face prend la largeur), la barre du haut se replie derrière un menu à trois traits, le
panneau du joueur s'ancre en bas de l'écran et ses dés prennent toute la
largeur. Au-dessus de cette largeur, ni le bouton de menu ni ces règles
n'existent : modifier le mobile ne touche pas au bureau.

## Sur l'écran d'accueil d'un téléphone

`assets/icone.svg` est la source de l'icône ; les PNG à côté en sont le rendu.
Safari ne sait pas encore prendre un SVG comme `apple-touch-icon` : sans le PNG
de 180 px, iOS colle une capture de la page à la place du logo. L'image est à
fond perdu et sans coins arrondis — iOS et Android découpent eux-mêmes la
silhouette, une icône déjà arrondie s'y retrouverait rognée deux fois.

`manifest.webmanifest` donne le nom court, les couleurs et les mêmes icônes à
Android. Le raccourci s'ouvre en plein écran (`display: standalone`, et
`apple-mobile-web-app-capable` pour iOS) : pour revenir à une fenêtre de
navigateur ordinaire, retirer ces deux déclarations.

Pour refaire les PNG après une retouche du SVG, les rendre à 180, 192 et 512 px
(n'importe quel outil convient ; ils ont été produits au navigateur).

## Architecture

```
src/core/     moteur, sans aucune dépendance à l'affichage
  rng.js        générateur pseudo-aléatoire déterministe (graine reproductible)
  config.js     symboles, faces, combinaisons, cartes Tornade, mise en place, profils d'IA
  engine.js     moteur de jeu à événements datés
  proba.js      probabilités exactes (multinomiale + chaîne de Markov absorbante)
  sim.js        campagnes de parties et agrégation
src/ui/       interface
  profils.js    réglages enregistrés : la liste, la sélection, le bandeau
src/version.js  numéro de version et journal des modifications
```

Le point clé : **le moteur est le même pour la partie jouée et pour la
simulation**. Le temps y est virtuel et chaque action de joueur est un événement
daté dans une file de priorité. La table de jeu fait avancer cette horloge au
rythme du navigateur ; le Laboratoire la déroule d’un trait, à quelque
1,5 ms par partie. Les statistiques décrivent donc bien le jeu tel qu’il se joue,
et non un modèle parallèle qui aurait dérivé.

## Les réglages enregistrés

Équilibrer, c’est comparer des versions entre elles. Un bandeau coiffe les
Réglages **et** le Laboratoire : « Par défaut », puis autant de réglages nommés
qu’on veut. Un clic sur l’un d’eux change **tous** les paramètres d’un coup, dans
les deux pages — et la partie suivante part avec.

`src/ui/profils.js` tient la liste (`profilsReglages`) et la sélection
(`profilActif`). Le point clé : **une seule lecture et une seule écriture**,
`reglagesCourants()` / `enregistrerReglages()`. Selon la sélection elles portent
sur le réglage enregistré ou sur la clé historique `variables`, et le reste du
site n’a pas à savoir lequel des deux — la page Réglages, l’accueil et le
lancement de partie passent tous par là sans changer d’un mot.

- **« Par défaut » n’est pas un enregistrement** mais son absence : les réglages
  libres du site, sous leur clé d’origine. Le sélectionner les retrouve tels
  qu’on les avait laissés, il n’efface rien ;
- **+ Nouveau** copie les réglages en cours dans un réglage nommé et le
  sélectionne. Tout ce qu’on modifie ensuite s’y enregistre, aux Réglages comme
  au Laboratoire ;
- renommer se fait dans le champ, supprimer demande un second clic. Un nom vide
  devient « Sans titre », un doublon prend un numéro ;
- le Laboratoire garde sa propre copie de configuration : elle est refaite quand
  le réglage sélectionné change, jamais autrement — ce qu’on y règle pour une
  campagne ne se perd pas en changeant de page.

## Ce qui est réglable

Tout passe par l’objet de configuration, entièrement exposé dans le Laboratoire :

- **la façon de jouer une manche** : retourner tous ses jetons Abri (la règle de
  base) ou la version **sans les points** ;
- nombre de dés par lot, **type de dé** (d6, d8, d10) et **symbole de chaque
  face** — depuis les options de partie comme depuis le Laboratoire ;
- nombre de dés requis pour chaque combinaison, y compris celles des cartes Tornade ;
- règle des trois jokers : active ou non, et à partir de combien de jokers ;
- laquelle des deux combinaisons porte l'attrape — l'Attaque ou l'Échec — et,
  pour l'Échec, s'il faut être réveillé pour tenter le contact ;
- ce que rapporte l'attrape : un jeton, ou la manche si le contact réussit ;
- ce qui arrive quand deux lots se rencontrent : le lot en cours est poussé, ou
  les lots s'empilent dans la même main ;
- lots en jeu, jetons par équipe, jetons du joueur Vert, cartes Tornade pour
  gagner — et, à nombre impair, un objectif distinct pour le Vert (`cartesVert`),
  qui joue seul contre deux équipes ;
- **qui prend les dés à la première manche** (`equipeDepart`) : les Jaunes selon
  la règle, les Bleus, ou le Vert seul ;
- **des combinaisons propres au Vert** (`combosAsymetriques`, `combosVert`) :
  chaque ligne du tableau se dédouble, celle des deux équipes et celle du Vert ;
- **« Réveillé seulement »** par combinaison : cochée, elle ne sort plus que
  Tornade éveillée ;
- **un paquet de cartes par mode de jeu**, avec ses propres exigences ;
- **l'illustration et le nom** de la Tornade et de l'Abri ;
- durée du lancer, du constat, du choix de combinaison, du passage, réflexion des
  IA, fenêtre de réflexe, et **irrégularité du rythme** de 0 à 50 % ;
- adresse de base, taux d’erreur, sanction des erreurs ;
- caractère et vitesse de chaque IA (voir plus bas).

Chaque campagne est reproductible : même graine, mêmes chiffres.

## Deux façons de jouer une manche

Le réglage `sansPoints` (Réglages → « Comment se joue une manche ») choisit entre
deux décomptes. **Il vaut `false` par défaut : la version de base ne bouge pas**
— même graine, même partie, aux mêmes chiffres.

| Mode | La manche se gagne | Ce qui fait la partie |
|---|---|---|
| `jetons` (défaut) | quand une équipe a retourné **tous** ses jetons Abri | 3 cartes Tornade |
| `sansPoints` | dès qu’un joueur sort **un** abri, réveillé — ou attrape son voisin | 4 cartes Tornade |

Sans les points, on se réveille aux trois tornades, puis on cherche les trois
abris ; le premier qui les sort arrête la manche sur-le-champ et son équipe
prend la carte. **Une attrape réussie emporte la manche de la même façon** : il
n’y a plus de jeton à prendre, un contact vaut donc la manche entière. C’est la
base du mode, donc sa valeur de départ — `attrapeGagneManche` vaut `'touche'`
dès que `sansPoints` est activé, et `attrapeEmporteManche(cfg)` en est l’unique
juge, moteur et menus. Le réglage reste modifiable dans les deux modes ; le
remettre sur `'non'` sans les points fait de l’attrape une simple interruption,
et les menus le signalent. Sur 60 parties à six joueurs, **105 manches sont
prises à l’attrape contre 310 à l’Abri**, et la partie gagne 35 à 50 secondes :
la course se gagne des deux mains.

Tout le reste tient — le dé, les combinaisons, les X qui figent, le rythme. Deux
effets de bord assumés :

- **les cartes Tornade qui manipulent les jetons** changent de sens : « Jour sans
  vent » (`cacherJetonAdverse`) ne fait plus rien, tandis que « Élevage
  intensif » et « Troupeau » (`jeton1`, `jeton2`) emportent la manche comme
  l’Abri. Chaque carte le dit sur elle-même dans les Réglages ;
- une bourde punie (`penaliteErreurAdverse`) ne donne rien aux adversaires.

La manche est trois fois plus courte, la partie deux fois — sur 200 parties
d’IA équilibrées par ligne :

| Joueurs | Manche `jetons` | Manche `sansPoints` | Partie `jetons` | Partie `sansPoints` |
|---|---|---|---|---|
| 4 | 102 s | 38 s | 8:30 | 4:27 |
| 6 | 95 s | 31 s | 7:54 | 3:34 |
| 9 | 56 s | 23 s | 5:37 | 3:02 |

À nombre impair, la manche devient une course où **chacun joue pour soi** : le
Vert, seul contre deux équipes, la perd presque toujours. Mesuré sur 300 parties
sans les points, `cartesVert` le remet à niveau :

| Joueurs | 4 cartes (défaut) | 2 cartes | 1 carte |
|---|---|---|---|
| 5 | 7 % | 43 % | 74 % |
| 7 | 2 % | 30 % | 64 % |
| 9 | 1 % | 18 % | 59 % |

## Le dé

Le dé officiel : **2 tornades, 1 X, 1 vache, 2 ZzZ**. Ni joker ni éclair — les
deux faces restent disponibles dans les Réglages, à poser soi-même. Le **d6 est
et reste le dé du jeu** ; le d8 et le d10 sont là pour l’équilibrage.

Sans face éclair, la combinaison Attaque ne peut pas sortir : `attrapeSur` vaut
donc `'echec'` par défaut, et c’est le double X qui porte l’attrape. Une IA ne
vise jamais une face que son dé ne porte pas — sans quoi un Agressif chercherait
l’éclair jusqu’à épuisement — et retombe sur le coup utile du moment.

| Symbole | Combinaison | Effet | Possible quand | Alerte |
|---|---|---|---|---|
| Tornade | 3 | Réveille votre Tornade | Tornade **endormie** | bleu |
| Abri | 3 | Retourne un jeton de votre équipe | Tornade **éveillée** | vert |
| ZzZ | 3 | Endort un voisin | Tornade **éveillée** | violet |
| Éclair | 3 | Passe le lot et tente d’attraper le suivant | le suivant tient un lot | jaune clignotant orange |
| Joker | 3 | Échec : le lot part sans rien tenter (règle décochable) | toujours | rouge |
| X | 2 | Échec : le lot part sans rien tenter | toujours | rouge |

Il faut donc être réveillé pour agir, aussi bien sur ses propres jetons que sur
le sommeil des autres : seuls l’attrape et les deux échecs valent dans les deux
états.

On relance qui l’on veut, autant de fois qu’on veut — un clic sur un dé le
relance, la barre espace les relance tous — **sauf les X**, qui restent figés sur
leur face et clignotent en rouge. Au deuxième X il ne reste plus assez de dés
libres pour former quoi que ce soit : le lot part.

Chaque dé roule pour son propre compte : on peut en relancer un pendant qu’un
autre tourne encore. Un lot qui arrive en main porte la face « ? » tant qu’il
n’a pas été lancé.

### d6, d8, d10

`facesPourDe(n)` étire la répartition officielle sur un dé plus grand en
reprenant la série depuis le début : le d8 ajoute une tornade et un joker, le
d10 y ajoute un X et un ZzZ. C’est la façon la plus régulière de garder les
proportions du d6, et chaque face reste modifiable une à une.

Ce que ça change, sur 300 parties d’Équilibrés à 6 joueurs :

| Dé | Partie | Lancers | Réveils | Échecs |
|---|---|---|---|---|
| **d6** | 5:25 | 463 | 32,8 | 66,9 |
| d8 | 4:39 | 367 | 40,3 | 32,9 |
| d10 | 7:29 | 606 | 52,0 | 113,7 |

Tout se joue sur la densité de X : un sur huit au d8, deux sur dix au d10. Le d8
casse deux fois moins de tours et raccourcit la partie ; le d10 en casse presque
le double et l’allonge de deux minutes. C’est le d6 qui tient le milieu.

**On ne tient jamais deux lots** : quand deux se rencontrent, celui qu’on avait
en main est poussé vers le voisin suivant — la poussée peut se propager — et on
enchaîne sur le nouveau. L’option `lotsCumules` remplace cette poussée par une
pile : le lot qui arrive attend son tour, plus rien ne rebondit sur le voisin.
Sur 60 parties à 6 joueurs, 1,9 % des mains portent alors deux lots ou plus,
jamais plus de trois — assez pour se sentir débordé, trop rare pour bloquer la
table.

### Le rythme irrégulier

`variance`, de 0 à 0,5, étire ou raccourcit chaque lancer, chaque constat et
chaque passage, coup par coup. À 0 le tempo est mécanique — un passage réglé à
1000 ms dure toujours 1000 ms ; à 0,3 il va de 700 à 1300 ms. Le tirage passe par
le générateur de la partie : à graine égale, le rythme se rejoue à l’identique.

C’est un réglage de sensation, pas d’équilibrage — la moyenne ne bouge pas. Sur
300 parties à 6 joueurs, la médiane passe de 5:26 (0 %) à 5:30 (50 %), et le
nombre de manches de 5,15 à 5,25.

**Une combinaison servie est jouée d’office** : on ne relance pas par-dessus.
Quand il y en a plusieurs — c’est le joker qui les sert, le plus souvent — le
joueur désigne la sienne pendant le temps de constat.

### Le joker

**Le joker** prend la face de n’importe quel symbole — tornade, vache, ZzZ ou
éclair — jamais celle du X, et valide donc n’importe quelle combinaison. Quand il
en sert plusieurs au même jet, **c’est le joueur qui tranche** : les combinaisons
s’affichent dans son panneau, il choisit la sienne, et faute de réponse la
meilleure part d’office au bout de `dureeChoix`.

**Trois jokers d’un coup valent un échec**, comme deux X : le lot part sans rien
tenter, et cet échec l’emporte sur les combinaisons que les jokers auraient pu
servir — sans quoi le joker n’aurait aucun revers. Règle décochable dans les
Réglages comme au Laboratoire.

Une seconde face joker, **le joker double** (orange et violet), ne remplace que
l’éclair et le ZzZ et ne compte pas dans les trois jokers de l’échec. Elle n’est
pas sur les dés au départ : on l’ajoute face par face dans les Réglages.

Ce que le joker change, calculé sur le dé courant (4 dés, relance de tout) :

| | Sans joker (2 tornades) | Avec joker |
|---|---|---|
| 3 tornades | 22,6 % | 16,2 % |
| 3 abris / 3 ZzZ / 3 éclairs | 3,7 % | 16,2 % |
| 3 jokers (échec) | — | 3,3 % |

Les quatre symboles passent à égalité ; le réveil, seul à profiter de la seconde
tornade, y perd. En partie à 6 joueurs, les attrapes doublent (21 → 43 par
partie), les blocages reculent d’un tiers (91 → 57) et la partie perd près de
deux minutes (7,5 → 5,6 min).

### Ce que rapporte l’attrape

**On n’attrape que ce qui existe** : si le joueur suivant a les mains vides, les
trois éclairs ne valent rien — il ne se passe rien, on garde son lot et on peut
continuer à relancer. C’est ce qui rend l’attrape rare : à six joueurs pour trois
lots, le voisin n’a un lot qu’une fois sur quatre environ, et les attrapes
tentées tombent de 76 à 19 par partie pour une table d’Agressifs.

Trois éclairs font passer le lot et tenter le contact. Ce que vaut un contact
réussi se règle dans les Réglages :

| Réglage | Effet | Partie à 6 | Jetons retournés |
|---|---|---|---|
| `non` (défaut) | le voisin est interrompu, un jeton retourné | 5,6 min | 27 |
| `touche` | l’équipe qui touche remporte la manche | 4,3 min | 18 |

Mesuré sur 300 parties simulées. Il faut toujours **toucher** : les trois éclairs
seuls n’emportent jamais rien.

### Qui porte l’attrape

`attrapeSur` désigne **laquelle des deux combinaisons tente le contact** :
`'eclair'` l’Attaque (règle de base), `'echec'` l’Échec. Ce sont les
combinaisons qui décident des dés, pas l’inverse — `comboDeclencheur(cfg)` rend
l’identifiant, et l’exigence réglée dans le tableau suit, qu’elle demande trois
éclairs, deux X ou trois X. Le dé, lui, ne change pas avec le mode.

En `'echec'`, deux X font partir le lot comme d’habitude, mais **si le voisin à
qui on le passe tient un lot, on tente de le toucher au passage**. L’Attaque
reste dans le tableau, réglable, mais n’est plus jouable : elle coûterait le lot
sans rien tenter.

**Il faut être réveillé** (`attrapeEveille`, actif par défaut) : Tornade
endormie, l’échec reste un échec sec. Sur 300 parties à 6 joueurs, la règle
divise les contacts par deux — 4,7 → 2,4 chez le Logique, 7,4 → 3,2 chez
l’Agressif — sans toucher la durée (3:09 → 3:12). Elle ne concerne que l’attrape
sur échec ; les trois éclairs valent dans les deux états.

On ne choisit donc plus d’attaquer : on attaque chaque fois que le hasard le
permet, et l’échec cesse d’être une pure perte. Sur 200 parties à 6 joueurs :

| Caractère | Base | Sans éclair |
|---|---|---|
| Logique | 4:24, 4,7 contacts | 3:11, 4,7 contacts |
| Équilibré | 5:25, 9,2 contacts | 3:34, 6,3 contacts |
| Agressif | 5:56, 15,4 contacts | 3:42, 8,0 contacts |

La partie raccourcit d’une bonne minute partout : le second abri double les
chances de retourner un jeton, et c’est la course aux abris qui décide la
manche. Le Logique attrape autant qu’avant — il ne visait déjà pas l’éclair —
tandis que l’Agressif, privé de sa cible, retombe à moitié moins de contacts.

## Les caractères des IA

Chaque siège tenu par une IA reçoit un caractère. Il dit **ce que l’IA cherche**
à faire de ses dés — pas ce qu’elle accepte : une combinaison servie reste jouée
d’office, donc un « Très agressif » qui sort trois tornades se réveille quand
même. L’objectif est tiré au sort une fois par lot, selon les poids du
caractère, et repris quand la Tornade change d’état.

| Caractère | Ce qu’il vise |
|---|---|
| **Logique** | tornades tant qu’il dort, abris une fois réveillé. Rien d’autre. |
| **Agressif** | éclairs trois lots sur quatre, sinon le coup logique |
| **Très agressif** | éclairs, uniquement — en dormant s’il le faut, l’attrape ne demande rien |
| **Pénible** | la tornade pour se réveiller, puis ZzZ trois lots sur quatre |
| **Très pénible** | la tornade pour se réveiller, puis ZzZ, uniquement |
| **Équilibré** | emprunte à chaque lot le style du Logique, de l’Agressif ou du Pénible |
| **Idiot** | vise au hasard, même l’inutile, et garde le mauvais dé une fois sur trois |

Ce que chacun produit, six exemplaires du même caractère autour de la table,
200 parties à 6 joueurs :

| Caractère | Durée | Réveils | Abris | ZzZ | Attrapes |
|---|---|---|---|---|---|
| Logique | 4,6 min | 30 | **24** | 7 | 24 |
| Agressif | 7,0 min | 27 | 17 | 8 | 76 |
| Très agressif | 7,8 min | 24 | 12 | 7 | **105** |
| Pénible | 7,5 min | 48 | 21 | 28 | 40 |
| Très pénible | 8,8 min | 58 | 17 | **40** | 48 |
| Équilibré | 5,9 min | 33 | 21 | 13 | 44 |
| Idiot | 7,9 min | 28 | 18 | 11 | 51 |

**Aucune IA ne vise l'attrape dans le vide.** L'objectif d'une IA est repris dès
que le joueur suivant prend ou lâche un lot : sans cible, le symbole de l'attrape
sort des envies et l'on retombe sur le reste du caractère — ou, pour qui ne
visait que ça, sur le coup utile du moment. Sur 300 parties à 6 joueurs :

| Caractère | Avant | Après |
|---|---|---|
| Agressif | 5:41 · 14,5 contacts · 14,6 abris | 4:21 · 7,8 contacts · 20,6 abris |
| Très agressif | 6:11 · 20,5 contacts · 9,6 abris | 4:34 · 9,3 contacts · 19,7 abris |
| Équilibré | 5:31 · 8,9 contacts | 4:50 · 7,1 contacts |

Les agressifs cessent de s'entêter sur un voisin désarmé : ils se réveillent et
retournent des jetons entre deux occasions, et la partie perd une bonne minute.
Une partie des attrapes restantes est fortuite — trois éclairs qui tombent sans
qu'on les cherche — si bien que ce sont les profils qui gardent leur lot le plus
longtemps, Très pénible en tête, qui en accumulent le plus.

Les attrapes ne tombent jamais à zéro, même chez le Logique : trois éclairs
forcent le passage, qu’on les ait cherchés ou non.

Et leur force réelle, équipe contre équipe, 300 parties à 6 joueurs — Logique >
Pénible ≈ Équilibré > Très pénible > Agressif > Très agressif ≈ Idiot :

| Bleus \ Jaunes | Logique | Agressif | Très agr. | Pénible | Très pén. | Équilibré | Idiot |
|---|---|---|---|---|---|---|---|
| **Logique** | 54 % | 93 % | 99 % | 72 % | 82 % | 78 % | 98 % |
| **Agressif** | 5 % | 49 % | 78 % | 17 % | 35 % | 18 % | 78 % |
| **Très agressif** | 2 % | 26 % | 50 % | 9 % | 21 % | 9 % | 54 % |
| **Pénible** | 28 % | 80 % | 91 % | 52 % | 64 % | 56 % | 93 % |
| **Très pénible** | 18 % | 70 % | 80 % | 35 % | 51 % | 41 % | 90 % |
| **Équilibré** | 28 % | 82 % | 92 % | 49 % | 58 % | 57 % | 94 % |
| **Idiot** | 2 % | 26 % | 49 % | 5 % | 12 % | 8 % | 52 % |

La diagonale à ~50 % vérifie que rien ne penche du côté des Bleus : deux équipes
du même caractère font jeu égal.

## Les emblèmes d’équipe

Les Bleus sont les **vaches**, les Jaunes les **poules**, le joueur Vert est le
**cowboy**. Les emblèmes sont dessinés en SVG dans `src/ui/icons.js`, au même
trait que les faces de dés, et accompagnent le nom de l’équipe partout où il
apparaît : accueil, table, règles.

## Des combinaisons propres au Vert

Le Vert joue seul contre deux équipes. `combosAsymetriques` ouvre une seconde
exigence par combinaison, rangée dans `combosVert` — cartes comprises. Le tableau
des Réglages se dédouble alors : une ligne « Bleus · Jaunes », une ligne « Vert ».
`requisPourEquipe(cfg, id, requisBase, equipe)` est le seul juge, moteur et
menus ; une ligne du Vert laissée vide retombe sur celle de la table.

**Décochée, la table est strictement symétrique** — c’est la référence, et le
réglage part décoché. L’effet est massif, mesuré sur 150 parties à 5 joueurs :

| Exigences du Vert | Victoires du Vert |
|---|---|
| identiques (défaut) | 41 % |
| Réveil et Abri à 2 dés | 96 % |
| Réveil et Abri à 4 dés | 5 % |

C’est donc le levier d’équilibrage du Vert le plus direct — bien plus que
`cartesVert`, qui ne change que la ligne d’arrivée.

## Réveillé seulement

Chaque combinaison porte une condition : `face` vaut `'endormie'`, `'active'`
(réveillé) ou `'toutes'`. La colonne « Réveillé » du tableau la bascule entre
`'active'` et la valeur d’origine de `COMBOS_TORNADE` — décocher ne transforme
donc pas le Réveil en combinaison universelle, il retrouve `'endormie'`.

La table range les combinaisons en deux listes, **Endormi** et **Réveillé**, et
n’affiche que celles que le dé peut produire : `comboPossible(faces, requis)`
tient compte des jokers. Sans face joker, « Trois jokers » n’est pas une règle en
sommeil, c’est une ligne morte — elle disparaît.

## Un paquet de cartes par mode

Les deux modes n’ont **aucune carte en commun** : `CARTES_TORNADE` (les douze
Journées, mode jetons) et `CARTES_SANS_POINTS` (les onze Tornades). `cartesDuMode(cfg)`
choisit la liste, `clePaquet(cfg)` et `cleCombosCartes(cfg)` les clés de réglage
(`cartes`/`combosCartes` d’un côté, `cartesSansPoints`/`combosCartesSansPoints`
de l’autre), `cartesEnJeu(cfg)` et `requisCarte(cfg, combo)` font le reste. Le
moteur ne lit rien d’autre, et une carte enregistrée pour l’autre mode est
ignorée.

### Les Tornades du mode sans les points

Sans jeton à retourner, une carte ne joue plus que sur les cartes elles-mêmes.
Trois leviers, plus la manche de chauffe :

| Carte | Verso | Combinaison | Effet |
|---|---|---|---|
| Tornade de feuille | ↻ | — | aucun pouvoir — mais elle se gagne comme les autres |
| Tornade de Vaches | ↺ | — | les Bleus gagnent 2 cartes s’ils prennent la manche |
| Tornade de Poules | ↺ | — | idem pour les Jaunes |
| Tornade de Cow-boy | ↻ | — | idem pour le Vert (hors paquet à nombre pair) |
| Tornade du Siècle | ↻ | 4 Tornades vertes | emporte la manche, et elle vaut 2 cartes |
| Tornade de Sommeil | ↺ | 3 ZzZ | emporte la manche |
| Tornade électrique | ↻ | — | 2 cartes si la manche est prise **en attrapant** |
| Tornade orageuse | ↻ | 3 éclairs | emporte la manche |
| Tornade furieuse | ↺ | 3 X | emporte la manche |
| Mega-Tornade | ↺ | Réveil + Tornade + ZzZ + éclair | emporte la manche |
| Tornade F5 | ↻ | — | le vainqueur vole une carte à une autre équipe |

**Deux cartes d’un coup** se paient sur la pioche : l’équipe prend la carte en
cours et celle du dessus, gardée face cachée. Le total distribué ne peut donc
pas dépasser le paquet — une vérification le contrôle.

**Le sens de rotation ne s’inverse plus.** Chaque Tornade porte une flèche au
dos (`sens`), et la manche se joue dans le sens qu’annonce la **prochaine**
carte, encore face cachée sur la pioche. Les flèches par défaut ne se contentent
pas d’alterner — sans quoi la règle serait indiscernable de l’ancienne : elles
comptent 4 répétitions sur 10 passages. L’invariant `sens === pioche[1].sens` est
contrôlé à chaque coup d’envoi, sur 178 manches.

Mesuré sur 300 parties d’IA équilibrées : partie médiane 2:20 à six joueurs,
5 manches.

**Deux de ces combinaisons demandent une face que le dé officiel ne porte
pas** — l’éclair, pour l’orageuse et la Mega-Tornade. Elles ne peuvent donc pas
sortir tant qu’aucune face éclair n’est posée ; les Réglages le signalent sous la
carte, et le taux de sortie du Laboratoire tombe à 0 %.

**Les exigences se règlent carte par carte**, dans « Cartes Tornade en jeu » :
chaque carte porte son texte, sa flèche et ses cases de dés au même endroit. Le
tableau des combinaisons ne contient plus que les combinaisons de la Tornade.

### À la table

- **la carte du tour s’annonce en grand** avant de jouer : nom, pouvoir,
  combinaison et sens de rotation. Espace ou clic pour passer ; sans réaction,
  elle se retire seule après quelques secondes — une table d’IA ne doit pas
  rester bloquée ;
- **la pioche porte la flèche du sens en cours**, lue au dos de sa carte du
  dessus ;
- **la fin de manche s’annonce au centre**, aux couleurs de l’équipe :
  « Louise fait gagner Jaunes en sortant l’Abri ». La raison est explicite —
  l’Abri, le dernier jeton, l’attrape (avec le nom de la victime), ou la
  combinaison de la carte.

## L’apparence des faces

Le dé officiel porte un **réveil** sur la face bleue et un **abri** — une maison
— sur la face verte : c’est l’habillage par défaut du site, défini par
`APPARENCE_OFFICIELLE` dans `src/ui/apparence.js` :

| Symbole (moteur) | Nom affiché | Illustration | Autres modèles |
|---|---|---|---|
| `tornade` | Réveil | `reveil` | `''` — la tornade bleue d’avant |
| `vache` | Abri | `abri` | `tornadeVerte`, puis `''` — la vache d’avant |

Les **identifiants de symbole ne changent pas** : le moteur continue de parler de
`tornade` et de `vache`, et toute règle ou configuration enregistrée sous
l’ancien nom reste valable. `core/` ignore complètement ce module.

`apparence.js` retient le choix, `icons.js` le résout en dessin (`dessinFace`).
Trois états par face :

- **rien d’enregistré** → l’apparence officielle ;
- **une entrée enregistrée** → ce qu’elle dit, `image: ''` redemandant
  explicitement l’ancien dessin ;
- **l’entrée effacée** (bouton « Face officielle ») → retour à l’officielle.

L’illustration est soit un modèle fourni (`reveil`, `abri`, `tornadeVerte`), soit une
image importée, stockée en `data:` dans le navigateur — le site reste autonome,
aucune requête vers l’extérieur. Limite : 400 ko par image.

## Les statistiques, décorrélées

Les combinaisons de base et celles des cartes ne se comparent pas : les premières
sont disponibles à chaque lancer, les secondes une manche sur douze. La campagne
les compte séparément — `combosBase`, `combosCartes` — et suit, par carte, le
nombre de manches où sa combinaison est **effectivement sortie** :

| Colonne | Ce qu’elle dit |
|---|---|
| Manches jouées | manches où la carte était en jeu |
| Manches où elle sort | manches où sa combinaison est tombée au moins une fois |
| Taux de sortie | le rapport des deux |
| Réalisations | combien de fois par manche jouée |

Un taux à 0 % désigne une combinaison que le dé ne peut pas produire — sur le dé
officiel, « Journée de la chance » demande quatre éclairs et n’en a aucun.

## Qui prend les dés en premier

`equipeDepart` désigne qui ouvre la **première** manche : `'jaune'` (la règle du
jeu, défaut), `'bleu'` ou `'vert'`. Le Vert accompagne l’équipe désignée dans les
deux premiers cas — il n’a pas d’équipe à qui succéder ; désigné seul, il ouvre
seul et les lots restants vont aux joueurs suivants autour de la table, un
joueur ne pouvant en tenir qu’un. Les manches suivantes ne sont pas concernées :
elles reviennent toujours aux perdants de la précédente, ou aux gagnants sous
« Journée de la triche ».

**Le premier tour de table ne décide rien.** Sur 300 parties d’IA équilibrées par
ligne, les victoires ne bougent pas au-delà du bruit d’échantillonnage (±3 pts) :

| Joueurs | Mode | Départ Jaunes | Départ Bleus | Départ Vert |
|---|---|---|---|---|
| 4 | jetons | bleu 53 % | bleu 53 % | — |
| 6 | jetons | jaune 54 % | jaune 52 % | — |
| 5 | jetons | vert 40 % | vert 44 % | vert 41 % |
| 9 | jetons | vert 73 % | vert 78 % | vert 75 % |
| 5 | sans points | vert 8 % | vert 9 % | vert 9 % |

C’est donc un réglage de confort — ouvrir la partie du bon côté de la table —
pas un levier d’équilibrage.

## Le rythme d’un lot

Quatre durées, réglables dans Réglages, font le tempo — et comptent dans la durée
d’une partie, à la table comme au Laboratoire :

| Étape | Défaut | Ce qu’on voit |
|---|---|---|
| `dureeLancer` | 1000 ms | les dés tournent, blancs, face illisible |
| `dureeConstat` | 900 ms | le résultat reste affiché avant que le lot ne parte |
| `dureeChoix` | 2400 ms | le joueur tranche entre les combinaisons servies |
| `dureePassage` | 1000 ms | le lot traverse la table jusqu’au voisin |

Avec ces valeurs, une partie dure 5 à 7 minutes selon le nombre de joueurs.

## Hypothèses de travail

Ces points ne figurent pas dans les documents V4.5 fournis et ont été comblés par
des valeurs par défaut explicites, toutes modifiables :

1. **Ce que fait le deuxième X.** Les règles disent qu’un X ne se relance jamais,
   sans préciser la sanction. Le moteur fait partir le lot, sans tentative
   d’attrape : à deux X il ne reste que deux dés libres, aucune combinaison de
   trois n’est plus possible. Le seuil est réglable.
2. **La ligne à 9 joueurs** du tableau de mise en place (le tableau officiel
   s’arrête à 8) : 5 lots, 5 jetons par équipe, 2 pour le Vert, 3 cartes.
3. **Les jetons repartent face cachée à chaque manche**, chaque manche étant une
   course indépendante.
4. **Un lot passé est relancé entièrement** par celui qui le reçoit : le verrou des
   X ne vaut que pour la possession en cours, sans quoi un lot arrivant bloqué
   serait injouable.
5. **Quand plusieurs combinaisons sortent au même jet**, un joueur humain
   choisit — sauf si la carte Tornade est de la partie, elle est alors jouée
   d’office, sans hésitation possible ; à défaut de réponse, et pour les IA, la carte Tornade passe avant
   tout, puis l’attrape, puis les combinaisons de gain, et l’Échec en
   dernier — sans cette priorité, « Journée de la chance » (quatre éclairs)
   serait inatteignable.
6. **Trois jokers l’emportent sur tout le reste.** Les règles disent que trois
   jokers valent un échec, sans trancher le cas où ces mêmes jokers servent une
   combinaison. Le moteur fait passer l’échec devant : autrement la règle ne se
   déclencherait presque jamais, et le joker n’aurait aucun revers. Le seuil est
   réglable et la règle se décoche.
7. **Le joker double ne compte pas dans les trois jokers** : c’est une autre
   face, qui ne remplace que l’éclair et le ZzZ.
8. **Les réglages enregistrés sont traduits, jamais jetés.** Les faces ont été
   renommées en v1.3 (`cloche` → tornade, `etoile` → X) ; `assainirConfig`
   retraduit les anciens noms, complète les réglages apparus depuis et remplace
   par « vide » un symbole devenu introuvable. Sans cela, un Laboratoire ouvert
   de longue date simulait avec des faces que le moteur ne reconnaissait plus.
6. Les effets sans traduction mécanique (« Journée du silence », « Journée de la
   maladresse ») sont modélisés par un surcoût de temps et un taux d’erreur.

## Vérifications

- `node tests/moteur.test.js` — parties menées à terme de 3 à 9 joueurs, et
  confrontation des probabilités exactes à un Monte-Carlo.
