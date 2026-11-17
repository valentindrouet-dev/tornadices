// Planche d'inspiration privée : les images que l'on dépose ici restent dans
// ce navigateur (IndexedDB). Elles ne sont ni envoyées, ni publiées avec le
// site — c'est la place des scans et des références sous droits.

import { h, remplacer } from './dom.js?v=2.09';

const BASE = 'tornadice-planche';
const TABLE = 'images';
const COTE_MAX = 1600;   // les scans sont réduits : un navigateur n'a pas la place de tout garder

function ouvrir() {
  return new Promise((ok, ko) => {
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TABLE, { keyPath: 'id' });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => ko(req.error);
  });
}

async function operation(mode, faire) {
  const db = await ouvrir();
  return new Promise((ok, ko) => {
    const tx = db.transaction(TABLE, mode);
    const req = faire(tx.objectStore(TABLE));
    tx.oncomplete = () => { db.close(); ok(req && req.result); };
    tx.onerror = () => { db.close(); ko(tx.error); };
  });
}

const lister = () => operation('readonly', (t) => t.getAll());
const ajouter = (img) => operation('readwrite', (t) => t.put(img));
const retirer = (id) => operation('readwrite', (t) => t.delete(id));
const toutRetirer = () => operation('readwrite', (t) => t.clear());

/** Réduit une image à COTE_MAX px de côté, en JPEG. */
async function reduire(fichier) {
  const bitmap = await createImageBitmap(fichier);
  const k = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height));
  const toile = document.createElement('canvas');
  toile.width = Math.round(bitmap.width * k);
  toile.height = Math.round(bitmap.height * k);
  const ctx = toile.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.drawImage(bitmap, 0, 0, toile.width, toile.height);
  bitmap.close();
  return new Promise((ok) => toile.toBlob(ok, 'image/jpeg', 0.85));
}

/** La planche, à poser dans une page. */
export function plancheInspiration() {
  const corps = h('div', h('p.mini.muted', 'Ouverture de la planche…'));
  const urls = [];
  let agrandie = null;

  const message = (texte) => remplacer(corps, h('p.mini.muted', texte));

  async function deposer(fichiers) {
    const images = [...fichiers].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    message(`Ajout de ${images.length} image${images.length > 1 ? 's' : ''}…`);
    let refusees = 0;
    for (const f of images) {
      try {
        await ajouter({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, nom: f.name.replace(/\.[^.]+$/, ''), quand: Date.now(), blob: await reduire(f) });
      } catch { refusees++; }
    }
    await dessiner(refusees ? `${refusees} image${refusees > 1 ? 's' : ''} n’ont pas pu être gardées (place insuffisante dans ce navigateur ?).` : '');
  }

  function fermer() { if (agrandie) { agrandie.remove(); agrandie = null; } }
  function agrandir(url, nom) {
    fermer();
    agrandie = h('div.planche-voile', { onclick: fermer, title: 'Cliquer pour fermer' },
      h('img', { src: url, alt: nom }), h('div.planche-legende', nom));
    document.body.appendChild(agrandie);
  }

  async function dessiner(avertissement = '') {
    for (const u of urls.splice(0)) URL.revokeObjectURL(u);
    let images;
    try { images = (await lister()).sort((a, b) => a.quand - b.quand); } catch {
      message('Ce navigateur refuse de garder des images (navigation privée ?) : la planche n’est pas disponible ici.');
      return;
    }
    const choix = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => deposer(e.target.files) });
    const zone = h('label.planche-depot', {
      ondragover: (e) => { e.preventDefault(); zone.classList.add('planche-depot--survol'); },
      ondragleave: () => zone.classList.remove('planche-depot--survol'),
      ondrop: (e) => { e.preventDefault(); zone.classList.remove('planche-depot--survol'); deposer(e.dataTransfer.files); },
    }, choix, h('strong', 'Déposez vos images ici'), h('span', 'ou cliquez pour les choisir — plusieurs à la fois'));
    remplacer(corps,
      zone,
      avertissement ? h('p.mini', { style: { color: 'var(--rouge)' } }, avertissement) : null,
      images.length ? h('div.planche-grille', ...images.map((img) => {
        const url = URL.createObjectURL(img.blob);
        urls.push(url);
        return h('figure.planche-image',
          h('img', { src: url, alt: img.nom, loading: 'lazy', onclick: () => agrandir(url, img.nom) }),
          h('figcaption', img.nom),
          h('button.planche-retirer', { title: 'Retirer de la planche', onclick: async () => { await retirer(img.id); dessiner(); } }, '×'));
      })) : null,
      images.length ? h('div.rangee', { style: { marginTop: '10px' } },
        h('span.mini.muted', `${images.length} image${images.length > 1 ? 's' : ''} dans ce navigateur`),
        h('div.pousse'),
        (() => {
          const b = h('button.btn.btn--petit.btn--danger', 'Tout retirer');
          let arme = false;
          b.onclick = async () => {
            if (!arme) { arme = true; b.textContent = 'Tout retirer ?'; b.classList.add('btn--arme'); return; }
            await toutRetirer(); dessiner();
          };
          return b;
        })()) : null,
    );
  }

  dessiner();
  return h('div.carte.planche',
    h('div.titre-section', 'Ma planche d’inspiration'),
    h('p.mini.muted', 'Privée : les images restent dans ce navigateur, sur cet appareil. Elles ne sont ni envoyées, '
      + 'ni publiées avec le site, et les autres visiteurs ne les voient pas. C’est la place de vos scans et références personnelles.'),
    corps);
}
