#!/usr/bin/env node
// Test de fumée dans un vrai navigateur : `node scripts/fumee.mjs [dossier-captures]`
// Sert le site lui-même, ouvre chaque page en grand écran et en téléphone, joue
// une partie d'IA en accéléré et lance une campagne au Laboratoire. Signale les
// erreurs JavaScript et les pages qui débordent en largeur. Sortie 1 si échec.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const captures = process.argv[2] || null;
if (captures) mkdirSync(captures, { recursive: true });

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};
const serveur = createServer(async (req, res) => {
  const chemin = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try {
    const corps = await readFile(join(racine, chemin));
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' });
    res.end(corps);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${serveur.address().port}/`;

// Playwright : celui du projet s'il y en a un, sinon l'installation globale.
const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.js'));
const { chromium } = pw.default || pw;
const chrome = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(existsSync);
const navigateur = await chromium.launch(chrome && !chrome.endsWith('chromium') ? { executablePath: chrome } : {});

const echecs = [];
const PAGES = ['/', '/reglages', '/labo', '/regles', '/historique', '/versions', '/resultats'];
const ECRANS = { bureau: { width: 1440, height: 900 }, telephone: { width: 390, height: 844 } };

for (const [nom, viewport] of Object.entries(ECRANS)) {
  const page = await navigateur.newPage({ viewport });
  // Les polices distantes sont hors de portée du test : leur absence n'est pas une panne du site.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => echecs.push(`${nom} : ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) echecs.push(`${nom} console : ${m.text()}`); });
  const verifier = async (etape) => {
    const deborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (deborde > 1) echecs.push(`${nom} ${etape} : déborde de ${deborde} px en largeur`);
    if (captures) await page.screenshot({ path: join(captures, `${nom}-${etape.replace(/\W+/g, '-')}.png`), fullPage: true });
  };
  for (const chemin of PAGES) {
    await page.goto(`${base}#${chemin}`);
    await page.waitForTimeout(250);
    if (!(await page.locator('#app header').count())) echecs.push(`${nom} ${chemin} : page vide`);
    await verifier(chemin === '/' ? 'accueil' : chemin.slice(1));
  }
  // Une partie entre IA, en accéléré, jusqu'aux résultats.
  await page.goto(`${base}#/`);
  for (const select of await page.locator('.ligne-joueur select').all()) await select.selectOption('logique');
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: '×4' }).click();
  await page.waitForTimeout(2500);
  if (!(await page.locator('.siege').count())) echecs.push(`${nom} table : aucun siège`);
  if (!(await page.locator('.journal .ligne').count())) echecs.push(`${nom} table : journal vide après 10 s de jeu`);
  await verifier('table');
  const fini = await page.waitForURL(/#\/resultats/, { timeout: 150000 }).then(() => true, () => false);
  if (!fini) echecs.push(`${nom} table : la partie ne va pas jusqu’aux résultats`);
  else if (!(await page.locator('.carte--victoire').count())) echecs.push(`${nom} résultats : pas de compte rendu`);
  await verifier('resultats-partie');
  // Une campagne au Laboratoire.
  await page.goto(`${base}#/labo`);
  await page.getByRole('button', { name: '200', exact: true }).click();
  await page.getByRole('button', { name: 'Lancer la campagne' }).click();
  const calcule = await page.locator('.barre-ic').first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  if (!calcule) echecs.push(`${nom} labo : la campagne ne rend rien`);
  await verifier('labo-campagne');
  await page.getByRole('button', { name: 'Probabilités' }).click();
  if (!(await page.locator('table.tbl tbody tr').count())) echecs.push(`${nom} labo : onglet Probabilités vide`);
  await verifier('labo-probas');
  await page.close();
}

await navigateur.close();
serveur.close();
console.log(echecs.length ? `ÉCHEC :\n- ${[...new Set(echecs)].join('\n- ')}` : 'Fumée : toutes les pages répondent, sans erreur ni débordement.');
process.exit(echecs.length ? 1 : 0);
