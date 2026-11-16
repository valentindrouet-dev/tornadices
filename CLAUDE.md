# TornaDice — repères pour travailler vite

Table de jeu virtuelle et laboratoire d'équilibrage du jeu de dés TornaDice (Sylvain Bonnafous, Big Budi Games).
Site statique : modules ES sans compilation, déployé tel quel sur GitHub Pages. Interface, commentaires et journal en français.

## Où est quoi
- `src/core/config.js` — les Règles V6 : symboles, combinaisons, cartes Tornade, mise en place, profils d'IA, `configDepuis(reglages, nb)`.
- `src/core/engine.js` — le moteur (événements datés, temps virtuel, graine). Le même pour la table et le Laboratoire.
- `src/core/sim.js` — campagnes (`creerCampagne`, `lancerCampagne`), intervalles de Wilson. `src/core/proba.js` — calculs exacts.
- `src/core/regles-officielles.js` — le réglage tenu pour officiel (vide = V6).
- `src/ui/` — une page par fichier : `accueil`, `table`, `reglages`, `labo`, `regles`, `resultats`, `historique`, `versions`.
  `profils.js` = réglages enregistrés (source unique lue par toutes les pages), `store.js` = stockage local, `dom.js` = `h()`.
- `styles.css` — feuille unique. `src/journal.js` — journal des versions (long : ne pas le lire, le script y écrit).

## Commandes
- `node tests/moteur.test.js` — moteur, campagnes, probabilités (≈ 2 s).
- `node scripts/fumee.mjs [dossier-captures]` — toutes les pages dans un vrai navigateur, une partie et une campagne (≈ 1 min).
- `node scripts/css-morts.mjs [--retirer]` — règles CSS que plus rien n'utilise.
- `node scripts/version.mjs 2.02 "note" "note"` — estampille les imports (`?v=`), `index.html`, la version, et ajoute les notes au journal.

## Livrer
1. Modifier. 2. Tests + fumée, une fois, en parallèle. 3. `version.mjs` avec les notes. 4. Un commit, un push.
Chaque livraison monte la version d'un cran et a ses notes. Ne pas relancer la suite après le simple estampillage.

## Conventions
- Tout import relatif porte `?v=<version>` (le script s'en charge) ; ne jamais l'écrire à la main ailleurs.
- Une règle chiffrée ne s'écrit qu'à un endroit : `config.js`. Les pages lisent `configDepuis(reglagesCourants(), nb)`.
- Une valeur qui vient des Réglages s'affiche en gras dans les Règles.
- Titres et textes des cartes Tornade : ceux des cartes imprimées.
- Changer la forme d'un résultat enregistré → incrémenter `SCHEMA_RESULTAT` (sim.js) ou `SCHEMA_PARTIE` (resultats.js).
- Commentaires courts : le pourquoi, pas l'historique (il est dans le journal).
