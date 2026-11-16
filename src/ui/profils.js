// Réglages enregistrés. Un réglage est un objet partiel posé sur les Règles V6
// (config.js, `configDepuis`). Il y a toujours « Règles officielles », et autant
// de réglages nommés qu'on veut ; les Réglages, la table et le Laboratoire
// lisent tous le réglage actif, ici.

import { h } from './dom.js?v=2.06';
import { store } from './store.js?v=2.06';
import { REGLES_OFFICIELLES } from '../core/regles-officielles.js?v=2.06';

export const ID_OFFICIELLES = 'officielles';
const copie = (x) => JSON.parse(JSON.stringify(x && typeof x === 'object' ? x : {}));

// ── Règles officielles ───────────────────────────────────────────────────────
/** Celles du site, ou celles validées dans ce navigateur si elles sont plus récentes. */
export function reglesOfficielles() {
  const locales = store.get('officielles', null);
  return locales && locales.reglages && String(locales.valideeLe) > String(REGLES_OFFICIELLES.valideeLe)
    ? locales : REGLES_OFFICIELLES;
}
export const officiellesLocales = () => reglesOfficielles() !== REGLES_OFFICIELLES;

/** Fait de ces réglages les Règles officielles, dans ce navigateur. */
export function validerReglesOfficielles(reglages) {
  store.set('officielles', { valideeLe: new Date().toISOString(), reglages: copie(reglages) });
}

/** Rend les Règles officielles du site. */
export function retablirOfficielles() { store.supprimer('officielles'); }

/** Le fichier qui les rend officielles pour tous les visiteurs du site. */
export function fichierReglesOfficielles() {
  const { valideeLe, reglages } = reglesOfficielles();
  return '// Les Règles officielles de TornaDice — fichier exporté depuis les Réglages.\n'
    + '// Il remplace src/core/regles-officielles.js.\n\n'
    + `export const REGLES_OFFICIELLES = ${JSON.stringify({ valideeLe, reglages }, null, 2)};\n`;
}

// ── Réglages nommés ──────────────────────────────────────────────────────────
export function profils() {
  const liste = store.get('profils', []);
  return Array.isArray(liste) ? liste.filter((p) => p && p.id && p.reglages) : [];
}

export function idActif() {
  const id = store.get('profilActif', ID_OFFICIELLES);
  return profils().some((p) => p.id === id) ? id : ID_OFFICIELLES;
}

const profilActif = () => profils().find((p) => p.id === idActif()) || null;
export const nomActif = () => (profilActif() || { nom: 'Règles officielles' }).nom;

/** Les réglages en vigueur. */
export function reglagesCourants() {
  const p = profilActif();
  return p ? p.reglages : reglesOfficielles().reglages;
}

/** Enregistre les réglages en vigueur. Sous « Règles officielles », cela les redéfinit. */
export function enregistrerReglages(reglages) {
  const p = profilActif();
  if (!p) { validerReglesOfficielles(reglages); return; }
  store.set('profils', profils().map((x) => (x.id === p.id ? { ...x, reglages: copie(reglages) } : x)));
}

function nomLibre(souhaite, sauf = null) {
  const pris = new Set(profils().filter((p) => p.id !== sauf).map((p) => p.nom));
  const base = String(souhaite || '').trim().slice(0, 40) || 'Réglage';
  let nom = base;
  for (let n = 2; pris.has(nom) || nom === 'Règles officielles'; n++) nom = `${base} ${n}`;
  return nom;
}

/** Copie les réglages en vigueur dans un nouveau réglage nommé, et y passe. */
export function creerProfil(nom) {
  const liste = profils();
  const id = `p${Date.now().toString(36)}${liste.length}`;
  liste.push({ id, nom: nomLibre(nom), reglages: copie(reglagesCourants()) });
  store.set('profils', liste);
  store.set('profilActif', id);
}

export function renommerProfil(id, nom) {
  store.set('profils', profils().map((p) => (p.id === id ? { ...p, nom: nomLibre(nom, id) } : p)));
}

export function supprimerProfil(id) {
  store.set('profils', profils().filter((p) => p.id !== id));
  if (store.get('profilActif') === id) store.set('profilActif', ID_OFFICIELLES);
}

export function selectionnerProfil(id) {
  store.set('profilActif', id || ID_OFFICIELLES);
}

// ── Le bandeau de sélection ──────────────────────────────────────────────────
let edition = false;

/** @param {function} apres  appelée après toute modification, pour redessiner la page. */
export function barreProfils(apres, extra = null) {
  const actif = idActif();
  const courant = profilActif();
  const puce = (id, nom) => h('button', {
    class: `chip chip--profil${id === actif ? ' on' : ''}`,
    onclick: () => { selectionnerProfil(id); edition = false; apres(); },
  }, nom);

  let supprimer = null;
  if (courant && edition) {
    supprimer = h('button.btn.btn--petit.btn--danger', 'Supprimer');
    let arme = false;
    supprimer.onclick = () => {
      if (!arme) {
        arme = true;
        supprimer.textContent = 'Supprimer ?';
        supprimer.classList.add('btn--arme');
        return;
      }
      supprimerProfil(courant.id);
      edition = false;
      apres();
    };
  }

  return h('div.carte.carte--profils',
    h('div.rangee.rangee--serree',
      h('div.titre-section', { style: { margin: '0 6px 0 0' } }, 'Réglage'),
      puce(ID_OFFICIELLES, 'Règles officielles'),
      ...profils().map((p) => puce(p.id, p.nom)),
      h('button.btn.btn--petit', {
        title: 'Copier les réglages en cours dans un nouveau réglage, pour essayer autre chose',
        onclick: () => { creerProfil(`Réglage ${profils().length + 1}`); edition = true; apres(); },
      }, '+ Nouveau'),
      h('div.pousse'),
      courant
        ? h('button.btn.btn--petit', { onclick: () => { edition = !edition; apres(); } }, edition ? 'Terminé' : 'Renommer…')
        : null,
    ),
    courant && edition
      ? h('div.rangee', { style: { marginTop: '10px' } },
          h('input', {
            type: 'text', value: courant.nom, maxLength: 40, style: { flex: '1 1 220px' },
            onchange: (e) => { renommerProfil(courant.id, e.target.value); apres(); },
          }),
          supprimer)
      : null,
    extra,
  );
}
