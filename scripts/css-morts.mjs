#!/usr/bin/env node
// Cherche dans styles.css les règles dont aucune classe n'est plus écrite par le
// site : `node scripts/css-morts.mjs` les liste, `--retirer` les supprime.
// Une classe vit si le code de src/ ou index.html l'écrit, ou si elle commence
// par un préfixe construit à la volée (`badge--${id}`).

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const fichiers = (d) => readdirSync(d).flatMap((n) => {
  const c = join(d, n);
  return statSync(c).isDirectory() ? fichiers(c) : n.endsWith('.js') ? [c] : [];
});
// Le code sans ses commentaires : un mot dans une phrase n'est pas une classe.
const source = [...fichiers(join(racine, 'src')), join(racine, 'index.html')]
  .map((f) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '')).join('\n');
// Une classe s'écrit après un point ou une apostrophe (`h('div.carte')`,
// `class: 'on'`), ou plus loin dans une liste (`'chip chip--profil'`).
const ecrites = new Set([
  ...[...source.matchAll(/[.'"`]([A-Za-z][\w-]*)/g)].map((m) => m[1]),
  ...[...source.matchAll(/\s([A-Za-z][\w-]*)(?=['"`$])/g)].map((m) => m[1]),
  ...[...source.matchAll(/\s([A-Za-z][\w]*-[\w-]+)(?=\s)/g)].map((m) => m[1]),
]);
const prefixes = [...new Set([...source.matchAll(/([A-Za-z][\w-]*-)\$\{/g)].map((m) => m[1]))];
const vivante = (classe) => ecrites.has(classe) || prefixes.some((p) => classe.startsWith(p));

const css = readFileSync(join(racine, 'styles.css'), 'utf8');
const mortes = new Set();
let retirees = 0;

/** Réécrit un bloc de règles ; les blocs @media sont traités récursivement. */
function nettoyer(texte) {
  let out = '';
  let i = 0;
  while (i < texte.length) {
    const acc = texte.indexOf('{', i);
    if (acc < 0) { out += texte.slice(i); break; }
    let fin = acc + 1;
    for (let prof = 1; prof > 0 && fin < texte.length; fin++) {
      if (texte[fin] === '{') prof++; else if (texte[fin] === '}') prof--;
    }
    const tete = texte.slice(i, acc);
    const corps = texte.slice(acc + 1, fin - 1);
    // Le sélecteur commence après le dernier commentaire qui le précède.
    const debut = tete.includes('*/') ? tete.lastIndexOf('*/') + 2 : 0;
    const avant = tete.slice(0, debut);
    const selecteur = tete.slice(debut);
    if (/^\s*@(media|supports)/.test(selecteur)) {
      const dedans = nettoyer(corps);
      out += dedans.trim() ? `${tete}{${dedans}}` : avant;
    } else if (/^\s*@/.test(selecteur)) out += texte.slice(i, fin);
    else {
      const gardes = selecteur.split(',').filter((s) => {
        const classes = [...s.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]);
        const perdues = classes.filter((c) => !vivante(c));
        perdues.forEach((c) => mortes.add(c));
        return !perdues.length;
      });
      if (!gardes.length) { retirees++; out += avant; }
      else out += `${avant}${gardes.join(',').replace(/^\s*\n?/, selecteur.match(/^\s*/)[0])}{${corps}}`;
    }
    i = fin;
  }
  return out;
}

// Les accolades écrites dans un commentaire ne délimitent rien : on les masque.
const masque = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/\{/g, '\u0001').replace(/\}/g, '\u0002'));
const propre = nettoyer(masque).replace(/\u0001/g, '{').replace(/\u0002/g, '}').replace(/\n{3,}/g, '\n\n');
console.log(`${mortes.size} classe(s) sans usage, ${retirees} règle(s) entièrement mortes.`);
if (mortes.size) console.log([...mortes].sort().join(' '));
if (process.argv.includes('--retirer')) {
  writeFileSync(join(racine, 'styles.css'), propre);
  console.log(`styles.css : ${css.length} → ${propre.length} caractères.`);
}
if (process.argv.includes('--detail')) {
  console.log('Préfixes construits :', prefixes.join(' '));
  const toutes = new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
  console.log('Vivantes par préfixe seul :', [...toutes].filter((c) => !ecrites.has(c) && vivante(c)).join(' '));
}
