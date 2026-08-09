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

Le dépôt se publie tel quel sur GitHub Pages ou tout hébergement statique.

## Ce que contient le site

| Page | Contenu |
|---|---|
| **Accueil** | Composition de la table : 3 à 9 joueurs, siège par siège Humain ou IA, cartes Journée en jeu, graine. |
| **Table** | La partie en temps réel : table circulaire, lots de dés qui circulent, fenêtres de collision, journal. |
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

- nombre de dés par lot, nombre de faces, **symbole de chaque face** ;
- nombre de dés requis pour chaque combinaison, y compris celles des cartes Journée ;
- lots en jeu, jetons par équipe, jetons du joueur Vert, cartes Journée pour gagner ;
- temps moyen d’un lancer et son écart-type, adresse de base, taux d’erreur ;
- profil et vitesse de chaque IA (Prudent, Équilibré, Téméraire, Hasard).

Chaque campagne est reproductible : même graine, mêmes chiffres.

## Hypothèses de travail

Ces points ne figurent pas dans les documents V4.5 fournis et ont été comblés par
des valeurs par défaut explicites, toutes modifiables :

1. **Les faces des dés.** Le PnP ne contient pas le patron des dés. Défaut retenu :
   6 faces — 2 cloches, 2 vaches, 1 ZzZ, 1 étoile. Cinq modèles alternatifs sont
   proposés en un clic dans le Laboratoire.
2. **La ligne à 9 joueurs** du tableau de mise en place (le tableau officiel
   s’arrête à 8) : 5 lots, 5 jetons par équipe, 2 pour le Vert, 3 cartes.
3. **Les jetons repartent face cachée à chaque manche**, chaque manche étant une
   course indépendante.
4. **Un lot passé est relancé entièrement** par celui qui le reçoit : le verrou des
   étoiles ne vaut que pour la possession en cours, sans quoi un lot arrivant avec
   deux étoiles serait injouable.
5. **La collision est jouée avant tout**, sauf si la combinaison de la carte Journée
   du moment est servie au même lancer — sans cette priorité, « Journée de la
   chance » (quatre étoiles) serait inatteignable.
6. Les effets sans traduction mécanique (« Journée du silence », « Journée de la
   maladresse ») sont modélisés par un surcoût de temps et un taux d’erreur.

## Vérifications

- `node tests/moteur.test.js` — parties menées à terme de 3 à 9 joueurs, et
  confrontation des probabilités exactes à un Monte-Carlo.
