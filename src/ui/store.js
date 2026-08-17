// Persistance locale : réglages, partie en cours, historique.

// Le jeu s'appelle TornaDice depuis la v1.27, mais cette clé garde son ancien
// nom : la renommer rendrait invisibles les réglages, l'historique et les
// configurations du Laboratoire déjà enregistrés dans les navigateurs.
const CLE = 'tornadices.v1';

function lire() {
  try { return JSON.parse(localStorage.getItem(CLE) || '{}'); } catch { return {}; }
}
function ecrire(o) {
  try { localStorage.setItem(CLE, JSON.stringify(o)); } catch { /* quota — sans gravité */ }
}

export const store = {
  get(cle, defaut) {
    const o = lire();
    return cle in o ? o[cle] : defaut;
  },
  set(cle, valeur) {
    const o = lire();
    o[cle] = valeur;
    ecrire(o);
  },
  supprimer(cle) {
    const o = lire();
    delete o[cle];
    ecrire(o);
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
  const h = historique();
  const cols = ['date', 'joueurs', 'vainqueur', 'manches', 'dureeSecondes', 'graine', 'raison'];
  const lignes = [cols.join(';')];
  for (const e of h) {
    lignes.push([
      e.date, e.joueurs, e.vainqueur || 'aucun', e.manches,
      Math.round((e.duree || 0) / 1000), e.graine, e.raison || '',
    ].join(';'));
  }
  return lignes.join('\n');
}
