import { demarrer } from './ui/app.js?v=1.61';
import { VERSION } from './version.js?v=1.61';

demarrer(document.getElementById('app'));

// Les navigateurs gardent les modules ES en cache : on peut donc faire tourner
// une version périmée sans s'en apercevoir. On relit le fichier de version sur
// le serveur, sans cache, et on prévient si l'écran est en retard.
verifierVersionServeur();

async function verifierVersionServeur() {
  try {
    const url = new URL('./version.js', import.meta.url);
    url.searchParams.set('t', String(Math.floor(Date.now() / 1000)));
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return;
    const m = (await r.text()).match(/VERSION\s*=\s*'([^']+)'/);
    if (!m || m[1] === VERSION) return;
    banniereVersion(m[1]);
  } catch {
    // Hors ligne ou fichier inaccessible : sans conséquence, on ne dit rien.
  }
}

function banniereVersion(disponible) {
  const el = document.createElement('div');
  el.className = 'banniere-version';
  el.innerHTML = `<strong>Version ${disponible} disponible</strong>`
    + `<span>Cet écran fait encore tourner la ${VERSION}, gardée en cache par le navigateur.</span>`;
  const btn = document.createElement('button');
  btn.className = 'btn btn--primaire btn--petit';
  btn.textContent = 'Recharger';
  btn.onclick = () => window.location.reload();
  const fermer = document.createElement('button');
  fermer.className = 'btn btn--petit';
  fermer.textContent = 'Plus tard';
  fermer.onclick = () => el.remove();
  el.append(btn, fermer);
  document.body.appendChild(el);
}
