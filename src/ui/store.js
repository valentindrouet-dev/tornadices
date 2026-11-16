// Persistance locale : réglages, joueurs, historique, résultats du Laboratoire.
// Tout tient dans une seule entrée du navigateur, lue une fois puis gardée en
// mémoire : une lecture ne coûte plus un décodage complet.

const CLE = 'tornadice.v2';
// Avant la V6 : on en reprend la table, l'historique et le son — pas les règles.
const CLE_AVANT = 'tornadices.v1';
const REPRIS = ['joueurs', 'nbJoueurs', 'historique', 'sons', 'volumeSons'];

let cache = null;

function lire() {
  if (cache) return cache;
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) cache = JSON.parse(brut);
    else {
      const avant = JSON.parse(localStorage.getItem(CLE_AVANT) || '{}');
      cache = {};
      for (const cle of REPRIS) if (cle in avant) cache[cle] = avant[cle];
    }
  } catch { cache = {}; }
  if (!cache || typeof cache !== 'object') cache = {};
  return cache;
}

/** Écrit, et dit si cela a pris : le navigateur refuse quand sa mémoire est pleine ou coupée. */
function ecrire() {
  try { localStorage.setItem(CLE, JSON.stringify(cache)); return true; } catch { return false; }
}

export const store = {
  get(cle, defaut) {
    const o = lire();
    return cle in o ? o[cle] : defaut;
  },
  /** @returns {boolean} faux si le navigateur a refusé d'enregistrer. */
  set(cle, valeur) {
    lire()[cle] = valeur;
    return ecrire();
  },
  supprimer(cle) {
    delete lire()[cle];
    ecrire();
  },
};

// ── Historique des parties jouées ─────────────────────────────────────────────
export function ajouterHistorique(entree) {
  const h = store.get('historique', []);
  h.unshift(entree);
  store.set('historique', h.slice(0, 200));
}

export function historique() { return store.get('historique', []); }

export function viderHistorique() { store.set('historique', []); }

export function historiqueCSV() {
  const cols = ['date', 'joueurs', 'vainqueur', 'manches', 'dureeSecondes', 'graine', 'raison'];
  const lignes = [cols.join(';')];
  for (const e of historique()) {
    lignes.push([
      e.date, e.joueurs, e.vainqueur || 'aucun', e.manches,
      Math.round((e.duree || 0) / 1000), e.graine, e.raison || '',
    ].join(';'));
  }
  return lignes.join('\n');
}
