// Micro-utilitaires DOM — assez pour bâtir l'interface sans dépendance.

// Le second argument n'est un objet d'attributs que si c'est un objet nu :
// un nœud, un tableau ou du texte est un enfant comme un autre.
function estAttributs(x) {
  return x != null && typeof x === 'object' && !(x instanceof Node)
    && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
}

export function h(tag, ...reste) {
  const attrs = estAttributs(reste[0]) ? reste.shift() : {};
  const enfants = reste;
  const parts = tag.split(/(?=[.#])/);
  const el = document.createElement(parts[0] || 'div');
  for (const p of parts.slice(1)) {
    if (p[0] === '.') el.classList.add(p.slice(1));
    else if (p[0] === '#') el.id = p.slice(1);
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') { for (const c of String(v).split(/\s+/)) if (c) el.classList.add(c); }
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'data' && typeof v === 'object') { for (const [d, dv] of Object.entries(v)) el.dataset[d] = dv; }
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  ajouter(el, enfants);
  return el;
}

function ajouter(el, enfants) {
  for (const c of enfants) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) ajouter(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function vider(el) { while (el.firstChild) el.removeChild(el.firstChild); }

export function remplacer(el, ...enfants) { vider(el); ajouter(el, enfants); return el; }

// ── Formats ───────────────────────────────────────────────────────────────────
export const pourcent = (x, dec = 1) => `${(x * 100).toFixed(dec)} %`;

export function duree(ms) {
  if (!isFinite(ms)) return '—';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function dureeLongue(ms) {
  if (!isFinite(ms)) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(s % 60).padStart(2, '0')} s`;
}

export const nombre = (x, dec = 1) => (isFinite(x) ? x.toFixed(dec) : '—');

export function telecharger(nomFichier, contenu, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nomFichier });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
