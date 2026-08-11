# TornaDices — table de jeu virtuelle et laboratoire d’équilibrage

Site statique, sans dépendance ni étape de compilation : du HTML, du CSS et des
modules JavaScript natifs. Il implémente les règles V4.5 de TornaDices pour 3 à
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
node scripts/version.mjs 1.17     # estampille tout le site
```

Chaque module est importé avec son numéro de version (`./dom.js?v=1.17`). Sans
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
| **Variables** | Toutes les options d'une partie : faces des dés (jokers compris), combinaisons requises, règle des trois jokers, rythme de la table, mise en place, adresse, cartes Journée, graine. |
| **Table** | La partie en temps réel : table circulaire, dés qui roulent, lots qui traversent, fenêtres d'attrape, journal. |
| **Laboratoire** | Campagnes de parties simulées, probabilités exactes des dés, règles chiffrées. |
| **Historique** | Parties jouées, statistiques cumulées, export CSV. |
| **Règles** | Les règles telles que le moteur les applique. |
| **Versions** | Journal des versions, incrémenté à chaque modification livrée. |

## Bureau et mobile

Une seule feuille de style, deux dispositions. Tout ce qui est propre au
téléphone tient dans `@media (max-width: 860px)` : la table ronde devient une
colonne (carte, pioche, compteurs, puis les sièges deux par ligne, sans aucun
recouvrement), la barre du haut se replie derrière un menu à trois traits, le
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
  config.js     symboles, faces, combinaisons, cartes Journée, mise en place, profils d'IA
  engine.js     moteur de jeu à événements datés
  proba.js      probabilités exactes (multinomiale + chaîne de Markov absorbante)
  sim.js        campagnes de parties et agrégation
src/ui/       interface
src/version.js  numéro de version et journal des modifications
```

Le point clé : **le moteur est le même pour la partie jouée et pour la
simulation**. Le temps y est virtuel et chaque action de joueur est un événement
daté dans une file de priorité. La table de jeu fait avancer cette horloge au
rythme du navigateur ; le Laboratoire la déroule d’un trait, à quelque
1,5 ms par partie. Les statistiques décrivent donc bien le jeu tel qu’il se joue,
et non un modèle parallèle qui aurait dérivé.

## Ce qui est réglable

Tout passe par l’objet de configuration, entièrement exposé dans le Laboratoire :

- nombre de dés par lot, nombre de faces, **symbole de chaque face** — depuis les
  options de partie comme depuis le Laboratoire ;
- nombre de dés requis pour chaque combinaison, y compris celles des cartes Journée ;
- règle des trois jokers : active ou non, et à partir de combien de jokers ;
- ce que rapporte l'attrape : un jeton, la manche si le contact réussit, ou la
  manche dès les trois éclairs ;
- lots en jeu, jetons par équipe, jetons du joueur Vert, cartes Journée pour gagner ;
- durée du lancer, du constat, du choix de combinaison, du passage, réflexion des
  IA, fenêtre de réflexe ;
- adresse de base, taux d’erreur, sanction des erreurs ;
- caractère et vitesse de chaque IA (voir plus bas).

Chaque campagne est reproductible : même graine, mêmes chiffres.

## Le dé

Six faces : **1 tornade, 1 joker, 1 X, 1 ZzZ, 1 vache, 1 éclair**.

| Symbole | Combinaison | Effet | Possible quand | Alerte |
|---|---|---|---|---|
| Tornade | 3 | Réveille votre Tornade | Tornade **endormie** | bleu |
| Vache | 3 | Retourne un jeton de votre équipe | Tornade **éveillée** | vert |
| ZzZ | 3 | Endort un voisin | Tornade **éveillée** | violet |
| Éclair | 3 | Passe le lot et tente d’attraper le suivant | toujours | jaune clignotant orange |
| Joker | 3 | Le lot part sans rien tenter (règle décochable) | toujours | rouge |
| X | 2 | Le lot part sans rien tenter | toujours | rouge |

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

**On ne tient jamais deux lots** : quand deux se rencontrent, celui qu’on avait
en main est poussé vers le voisin suivant — la poussée peut se propager — et on
enchaîne sur le nouveau.

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
Variables comme au Laboratoire.

Une seconde face joker, **le joker double** (orange et violet), ne remplace que
l’éclair et le ZzZ et ne compte pas dans les trois jokers de l’échec. Elle n’est
pas sur les dés au départ : on l’ajoute face par face dans les Variables.

Ce que le joker change, calculé sur le dé courant (4 dés, relance de tout) :

| | Sans joker (2 tornades) | Avec joker |
|---|---|---|
| 3 tornades | 22,6 % | 16,2 % |
| 3 vaches / 3 ZzZ / 3 éclairs | 3,7 % | 16,2 % |
| 3 jokers (échec) | — | 3,3 % |

Les quatre symboles passent à égalité ; le réveil, seul à profiter de la seconde
tornade, y perd. En partie à 6 joueurs, les attrapes doublent (21 → 43 par
partie), les blocages reculent d’un tiers (91 → 57) et la partie perd près de
deux minutes (7,5 → 5,6 min).

### Ce que rapporte l’attrape

Trois éclairs font passer le lot et tenter le contact. Ce que vaut un contact
réussi se règle dans les Variables :

| Réglage | Effet | Partie à 6 | Jetons retournés |
|---|---|---|---|
| `non` (défaut) | le voisin est interrompu, un jeton retourné | 5,6 min | 27 |
| `touche` | l’équipe qui touche remporte la manche | 4,3 min | 18 |
| `combo` | les trois éclairs emportent la manche, sans contact | 0,9 min | 1 |

Mesuré sur 300 parties simulées. En `combo` la fenêtre de réflexe disparaît et
la course aux vaches avec elle : c’est une partie éclair, pas un équilibrage.

## Les caractères des IA

Chaque siège tenu par une IA reçoit un caractère. Il dit **ce que l’IA cherche**
à faire de ses dés — pas ce qu’elle accepte : une combinaison servie reste jouée
d’office, donc un « Très agressif » qui sort trois tornades se réveille quand
même. L’objectif est tiré au sort une fois par lot, selon les poids du
caractère, et repris quand la Tornade change d’état.

| Caractère | Ce qu’il vise |
|---|---|
| **Logique** | tornades tant qu’il dort, vaches une fois réveillé. Rien d’autre. |
| **Agressif** | éclairs trois lots sur quatre, sinon le coup logique |
| **Très agressif** | éclairs, uniquement — en dormant s’il le faut, l’attrape ne demande rien |
| **Pénible** | la tornade pour se réveiller, puis ZzZ trois lots sur quatre |
| **Très pénible** | la tornade pour se réveiller, puis ZzZ, uniquement |
| **Équilibré** | emprunte à chaque lot le style du Logique, de l’Agressif ou du Pénible |
| **Idiot** | vise au hasard, même l’inutile, et garde le mauvais dé une fois sur trois |

Ce que chacun produit, six exemplaires du même caractère autour de la table,
200 parties à 6 joueurs :

| Caractère | Durée | Réveils | Vaches | ZzZ | Attrapes |
|---|---|---|---|---|---|
| Logique | 4,6 min | 30 | **24** | 7 | 24 |
| Agressif | 7,0 min | 27 | 17 | 8 | 76 |
| Très agressif | 7,8 min | 24 | 12 | 7 | **105** |
| Pénible | 7,5 min | 48 | 21 | 28 | 40 |
| Très pénible | 8,8 min | 58 | 17 | **40** | 48 |
| Équilibré | 5,9 min | 33 | 21 | 13 | 44 |
| Idiot | 7,9 min | 28 | 18 | 11 | 51 |

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

## Le rythme d’un lot

Quatre durées, réglables dans Variables, font le tempo — et comptent dans la durée
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
   choisit ; à défaut de réponse, et pour les IA, la carte Journée passe avant
   tout, puis l’attrape, puis les combinaisons de gain, et « Bloqué » en
   dernier — sans cette priorité, « Journée de la chance » (quatre éclairs)
   serait inatteignable.
6. **Trois jokers l’emportent sur tout le reste.** Les règles disent que trois
   jokers valent un échec, sans trancher le cas où ces mêmes jokers servent une
   combinaison. Le moteur fait passer l’échec devant : autrement la règle ne se
   déclencherait presque jamais, et le joker n’aurait aucun revers. Le seuil est
   réglable et la règle se décoche.
7. **Le joker double ne compte pas dans les trois jokers** : c’est une autre
   face, qui ne remplace que l’éclair et le ZzZ.
6. Les effets sans traduction mécanique (« Journée du silence », « Journée de la
   maladresse ») sont modélisés par un surcoût de temps et un taux d’erreur.

## Vérifications

- `node tests/moteur.test.js` — parties menées à terme de 3 à 9 joueurs, et
  confrontation des probabilités exactes à un Monte-Carlo.
