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
node scripts/version.mjs 1.9      # estampille tout le site
```

Chaque module est importé avec son numéro de version (`./dom.js?v=1.9`). Sans
cela, les navigateurs gardent les modules ES en cache sous leur URL et peuvent
continuer de servir une version périmée — un écran restait bloqué sur une
ancienne version sans qu'on le voie. Le script réécrit tous les imports, le
numéro embarqué et le point d'entrée du HTML. Il reste à rédiger les notes dans
`src/version.js`.

Au démarrage, le site relit sa version sur le serveur et propose de recharger
si l'écran est en retard.

## Ce que contient le site

| Page | Contenu |
|---|---|
| **Accueil** | Qui joue : 3 à 9 joueurs, siège par siège Humain ou IA. |
| **Variables** | Toutes les options d'une partie : faces des dés, combinaisons requises, rythme de la table, mise en place, adresse, cartes Journée, graine. |
| **Table** | La partie en temps réel : table circulaire, dés qui roulent, lots qui traversent, fenêtres d'attrape, journal. |
| **Laboratoire** | Campagnes de parties simulées, probabilités exactes des dés, règles chiffrées. |
| **Historique** | Parties jouées, statistiques cumulées, export CSV. |
| **Règles** | Les règles telles que le moteur les applique. |
| **Versions** | Journal des versions, incrémenté à chaque modification livrée. |

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
- lots en jeu, jetons par équipe, jetons du joueur Vert, cartes Journée pour gagner ;
- durée du lancer, du constat, du passage, réflexion des IA, fenêtre de réflexe ;
- adresse de base, taux d’erreur, sanction des erreurs ;
- profil et vitesse de chaque IA (Prudent, Équilibré, Téméraire, Hasard).

Chaque campagne est reproductible : même graine, mêmes chiffres.

## Le dé

Cinq symboles, six faces : **2 tornades, 1 X, 1 ZzZ, 1 vache, 1 éclair**.

| Symbole | Combinaison | Effet | Alerte |
|---|---|---|---|
| Tornade | 3 | Réveille votre Tornade | bleu |
| Vache | 3 | Retourne un jeton de votre équipe | vert |
| ZzZ | 3 | Endort un voisin | violet |
| Éclair | 3 | Passe le lot et tente d’attraper le suivant | jaune clignotant orange |
| X | 2 | Le lot part sans rien tenter | rouge |

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

## Le rythme d’un lot

Trois durées, réglables dans Variables, font le tempo — et comptent dans la durée
d’une partie, à la table comme au Laboratoire :

| Étape | Défaut | Ce qu’on voit |
|---|---|---|
| `dureeLancer` | 1000 ms | les dés tournent, blancs, face illisible |
| `dureeConstat` | 900 ms | le résultat reste affiché avant que le lot ne parte |
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
5. **Quand plusieurs combinaisons sortent au même jet**, la carte Journée passe
   avant tout, puis l’attrape, puis les combinaisons de gain, et « Bloqué » en
   dernier — sans cette priorité, « Journée de la chance » (quatre éclairs)
   serait inatteignable.
6. Les effets sans traduction mécanique (« Journée du silence », « Journée de la
   maladresse ») sont modélisés par un surcoût de temps et un taux d’erreur.

## Vérifications

- `node tests/moteur.test.js` — parties menées à terme de 3 à 9 joueurs, et
  confrontation des probabilités exactes à un Monte-Carlo.
