# TornaDice

Table de jeu virtuelle et laboratoire d'équilibrage pour **TornaDice**, jeu de dés en temps réel de Sylvain Bonnafous, édité par Big Budi Games. Règles V6, de 3 à 6 joueurs ; chaque place peut être tenue par une IA.

Site statique, sans compilation ni dépendance : ouvrez `index.html` derrière n'importe quel serveur de fichiers (`npm start`), ou publiez le dépôt tel quel sur GitHub Pages.

## Pages
- **Accueil** — composer la table et lancer la partie.
- **Table** — la partie en temps réel : dés, Carte Rôle, cartes Tornade, Carte Rotation, journal.
- **Réglages** — tout ce qui s'ajuste : mise en place par effectif, dé et combinaisons, cartes Tornade, rythme. Les « Règles officielles » servent de référence ; d'autres réglages se créent à côté pour essayer.
- **Laboratoire** — des milliers de parties jouées par le même moteur que la table, avec parts de victoire et intervalles de confiance à 95 %, plus les probabilités exactes des combinaisons.
- **Règles** — les règles V6 telles que le réglage actif les fait jouer, imprimables.

## Développer
```
npm test                 # moteur, campagnes, probabilités (≈ 2 s)
node scripts/fumee.mjs   # toutes les pages dans un navigateur (Playwright)
node scripts/version.mjs 2.02 "Ce qui change"
```
L'organisation du code et les conventions sont dans `CLAUDE.md`.
