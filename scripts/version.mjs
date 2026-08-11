#!/usr/bin/env node
// Passe le site à une nouvelle version : `node scripts/version.mjs 1.8`
//
// Les navigateurs mettent chaque module ES en cache sous son URL. Sans
// empreinte, une nouvelle livraison peut continuer de servir les anciens
// fichiers et l'écran reste bloqué sur une version périmée. On estampille donc
// chaque import — `./dom.js?v=1.8` — pour que toute livraison change les URL.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];

if (!version || !/^\d+\.\d+$/.test(version)) {
  console.error('Usage : node scripts/version.mjs <majeure.mineure>   (ex. 1.8)');
  process.exit(1);
}

/** Tous les fichiers .js sous src/, récursivement. */
function fichiersJs(dossier) {
  const out = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) out.push(...fichiersJs(chemin));
    else if (nom.endsWith('.js')) out.push(chemin);
  }
  return out;
}

// Les imports relatifs, avec ou sans empreinte déjà posée.
const IMPORT = /(\bfrom\s*['"]|\bimport\s*['"])(\.{1,2}\/[^'"?]+?\.js)(\?v=[^'"]*)?(['"])/g;

let touches = 0;
for (const chemin of fichiersJs(join(racine, 'src'))) {
  const avant = readFileSync(chemin, 'utf8');
  const apres = avant.replace(IMPORT, (_, tete, mod, __, fin) => `${tete}${mod}?v=${version}${fin}`);
  if (apres !== avant) { writeFileSync(chemin, apres); touches++; }
}

// Le numéro embarqué, lu par le site pour se comparer au fichier servi.
const cheminVersion = join(racine, 'src/version.js');
writeFileSync(cheminVersion, readFileSync(cheminVersion, 'utf8')
  .replace(/export const VERSION = '[^']*';/, `export const VERSION = '${version}';`)
  .replace(/export const BUILD_DATE = '[^']*';/,
    `export const BUILD_DATE = '${new Date().toISOString().slice(0, 10)}';`));

// Le point d'entrée, la feuille de style et les icônes : tout ce que le HTML
// charge directement porte l'empreinte de version, pour les mêmes raisons.
// La feuille compte autant que les modules : un écran a déjà tourné avec le JS
// d'une version et le CSS de la précédente, et l'affichage s'en trouvait cassé.
const cheminHtml = join(racine, 'index.html');
writeFileSync(cheminHtml, readFileSync(cheminHtml, 'utf8')
  .replace(/(src="\.\/src\/main\.js)(\?v=[^"]*)?"/, `$1?v=${version}"`)
  .replace(/(href="\.\/styles\.css)(\?v=[^"]*)?"/, `$1?v=${version}"`)
  .replace(/(href="\.\/(?:assets\/[^"?]+|manifest\.webmanifest))(\?v=[^"]*)?"/g, `$1?v=${version}"`));

console.log(`Version ${version} — ${touches} fichier(s) réestampillé(s), index.html mis à jour.`);
console.log('Pensez à ajouter les notes de version dans src/version.js.');
