// Éditeur de combinaisons, partagé par le menu Variables et le Laboratoire.
//
// Une combinaison se lit ici comme un lot posé sur la table : un menu par dé du
// lot, avec la face choisie en miniature au-dessus. « — » laisse le dé libre.
// C'est plus proche du geste réel que la grille de compteurs d'avant, où il
// fallait traduire mentalement « 3 » en trois dés.

import { h } from './dom.js?v=1.23';
import { pastilleSymbole } from './icons.js?v=1.23';
import { ORDRE_SYMBOLES, SYMBOLES, CARTES_JOURNEE } from '../core/config.js?v=1.23';

/** { vache: 3 } → ['vache', 'vache', 'vache', ''] sur un lot de quatre dés. */
export function requisEnCases(requis, nbDes) {
  const cases = [];
  for (const [sym, n] of Object.entries(requis || {})) {
    for (let i = 0; i < n; i++) cases.push(sym);
  }
  cases.sort((a, b) => ORDRE_SYMBOLES.indexOf(a) - ORDRE_SYMBOLES.indexOf(b));
  // Une exigence plus longue que le lot garde ses cases : mieux vaut la montrer
  // en trop que la tronquer en douce.
  while (cases.length < nbDes) cases.push('');
  return cases;
}

/** L'inverse : ['vache', 'vache', '', ''] → { vache: 2 }. */
export function casesEnRequis(cases) {
  const requis = {};
  for (const s of cases) if (s) requis[s] = (requis[s] || 0) + 1;
  return requis;
}

/** Une case : la face en miniature, et le menu qui la choisit. */
function caseDe(sym, onchange) {
  return h('div.face-case',
    sym ? pastilleSymbole(sym, 26) : h('span.pastille-libre', { title: 'Aucun dé requis' }),
    h('select', {
      class: sym ? '' : 'select--libre',
      onchange: (e) => onchange(e.target.value),
    },
      h('option', { value: '', selected: !sym }, '—'),
      ...ORDRE_SYMBOLES.map((s) => h('option', { value: s, selected: s === sym }, SYMBOLES[s].nom)),
    ),
  );
}

/**
 * Tableau complet des combinaisons.
 *
 * @param {object}   cfg          configuration en cours (dés par lot, combos, cartes)
 * @param {function} ecrireCombo  (id, requis) pour une combinaison de la Tornade
 * @param {function} ecrireCarte  (id, requis) pour une combinaison de carte Journée
 * @param {function} rafraichir   à appeler après chaque changement
 */
export function tableauCombos(cfg, ecrireCombo, ecrireCarte, rafraichir) {
  const nbDes = Math.max(1, Math.min(12, cfg.desParLot || 4));

  const ligne = (nom, requis, ecrire, carte = false) => {
    const cases = requisEnCases(requis, nbDes);
    return h('tr', { class: carte ? 'ligne-carte' : '' },
      h('td', { style: { fontWeight: '700' } }, nom,
        carte ? h('span.badge.badge--carte', 'Journée') : null),
      ...cases.map((sym, i) => h('td', caseDe(sym, (val) => {
        const suite = cases.slice();
        suite[i] = val;
        ecrire(casesEnRequis(suite));
        rafraichir();
      }))),
    );
  };

  const colonnes = nbDes + 1;
  // Sur téléphone, une colonne par dé ne tient pas : le tableau défile dans son
  // propre cadre plutôt que d'écraser les menus jusqu'à l'illisible.
  return h('div.tbl-defile', h('table.tbl.tbl--combos', { style: { tableLayout: 'fixed' } },
    h('colgroup', h('col', { style: { width: '26%' } }), ...Array.from({ length: nbDes }, () => h('col'))),
    h('thead', h('tr',
      h('th', 'Combinaison'),
      ...Array.from({ length: nbDes }, (_, i) => h('th', `Dé ${i + 1}`)),
    )),
    h('tbody',
      h('tr.ligne-titre', h('td', { colspan: colonnes }, 'Toujours en jeu')),
      ...cfg.combos.map((c) => ligne(c.nom, c.requis, (requis) => ecrireCombo(c.id, requis))),
      h('tr.ligne-titre.ligne-titre--carte',
        h('td', { colspan: colonnes },
          'Cartes Journée — seulement pendant la manche où la carte est en jeu')),
      ...CARTES_JOURNEE.filter((c) => c.combo).map((carte) => {
        const requis = (cfg.combosCartes && cfg.combosCartes[carte.combo.id]) || carte.combo.requis;
        return ligne(carte.court, requis, (r) => ecrireCarte(carte.combo.id, r), true);
      }),
    ),
  ));
}
