// Éditeur de combinaisons, partagé par le menu Réglages et le Laboratoire.
//
// Une combinaison se lit ici comme un lot posé sur la table : un menu par dé du
// lot, avec la face choisie en miniature au-dessus. « — » laisse le dé libre.
// C'est plus proche du geste réel que la grille de compteurs d'avant, où il
// fallait traduire mentalement « 3 » en trois dés.
//
// Trois réglages passent par ce tableau :
//   · l'exigence de chaque combinaison, dé par dé ;
//   · « Réveillé » — la combinaison ne sort que Tornade éveillée ;
//   · l'asymétrie du Vert, qui lui donne ses propres exigences.
// Les cartes affichées sont celles du mode en cours : chaque mode a son paquet.

import { h } from './dom.js?v=1.37';
import { pastilleSymbole, emblemeEquipe } from './icons.js?v=1.37';
import { nomSymbole } from './apparence.js?v=1.37';
import {
  ORDRE_SYMBOLES, CARTES_TORNADE, COMBOS_TORNADE, COULEURS_EQUIPE,
  cartesEnJeu, requisCarte, requisPourEquipe,
} from '../core/config.js?v=1.37';

const FACE_REFERENCE = Object.fromEntries(COMBOS_TORNADE.map((c) => [c.id, c.face]));

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
      ...ORDRE_SYMBOLES.map((s) => h('option', { value: s, selected: s === sym }, nomSymbole(s))),
    ),
  );
}

/**
 * Tableau complet des combinaisons.
 *
 * @param {object} cfg  configuration en cours (dés par lot, combos, cartes)
 * @param {object} api  les écritures et le rafraîchissement :
 *   ecrireCombo(id, requis)  une combinaison de la Tornade
 *   ecrireCarte(id, requis)  une combinaison de carte, dans le mode en cours
 *   ecrireVert(id, requis)   l'exigence propre au Vert
 *   ecrireFace(id, face)     « active » (réveillé seulement) ou la face d'origine
 *   rafraichir()             après chaque changement
 */
export function tableauCombos(cfg, api) {
  const { ecrireCombo, ecrireCarte, ecrireVert, ecrireFace, rafraichir } = api;
  const nbDes = Math.max(1, Math.min(12, cfg.desParLot || 4));
  const asym = !!cfg.combosAsymetriques;
  const enJeu = new Set(cartesEnJeu(cfg));

  // Une rangée de cases, quelle que soit la combinaison qu'elle sert.
  const cases = (requis, ecrire) => {
    const suite = requisEnCases(requis, nbDes);
    return suite.map((sym, i) => h('td', caseDe(sym, (val) => {
      const copie = suite.slice();
      copie[i] = val;
      ecrire(casesEnRequis(copie));
      rafraichir();
    })));
  };

  // La case « Réveillé » : cochée, la combinaison ne sort que Tornade éveillée.
  // Décochée, elle reprend sa condition d'origine — le Réveil reste réservé au
  // dormeur, sans quoi on ne pourrait plus jamais se réveiller.
  const caseReveille = (combo) => {
    const actif = combo.face === 'active';
    return h('td.cellule-reveil',
      h('button', {
        class: `chip chip--case${actif ? ' on' : ''}`,
        title: actif
          ? 'Ne sort que Tornade éveillée — décochez pour revenir à la condition d’origine'
          : `Condition actuelle : ${combo.face === 'endormie' ? 'Tornade endormie' : 'les deux états'}`,
        onclick: () => {
          ecrireFace(combo.id, actif ? (FACE_REFERENCE[combo.id] || 'toutes') : 'active');
          rafraichir();
        },
      }, h('span.case', '✓')),
    );
  };

  const ligneCombo = (combo) => {
    const lignes = [h('tr',
      h('td.cellule-nom', h('div.nom-combo', combo.nom),
        asym ? h('span.mini.muted', 'Bleus · Jaunes') : null),
      caseReveille(combo),
      ...cases(combo.requis, (requis) => ecrireCombo(combo.id, requis)),
    )];
    if (asym) {
      const propre = requisPourEquipe(cfg, combo.id, combo.requis, 'vert');
      lignes.push(h('tr.ligne-vert',
        h('td.cellule-nom',
          h('div.rangee.rangee--serree',
            emblemeEquipe(COULEURS_EQUIPE.vert.embleme, 18),
            h('span.mini', 'Vert')),
        ),
        h('td.cellule-reveil', h('span.mini.muted', '·')),
        ...cases(propre, (requis) => ecrireVert(combo.id, requis)),
      ));
    }
    return lignes;
  };

  const ligneCarte = (carte) => h('tr.ligne-carte',
    h('td.cellule-nom', h('div.nom-combo', carte.court),
      h('span.badge.badge--carte', 'Tornade')),
    h('td.cellule-reveil', h('span.mini.muted', '·')),
    ...cases(requisCarte(cfg, carte.combo), (r) => ecrireCarte(carte.combo.id, r)),
  );

  const colonnes = nbDes + 2;
  const cartes = CARTES_TORNADE.filter((c) => c.combo && enJeu.has(c.id));
  // Sur téléphone, une colonne par dé ne tient pas : le tableau défile dans son
  // propre cadre plutôt que d'écraser les menus jusqu'à l'illisible.
  return h('div.tbl-defile', h('table.tbl.tbl--combos', { style: { tableLayout: 'fixed' } },
    h('colgroup', h('col.col-nom'), h('col.col-reveil'),
      ...Array.from({ length: nbDes }, () => h('col'))),
    h('thead', h('tr',
      h('th', 'Combinaison'),
      h('th.cellule-reveil', { title: 'Ne sort que Tornade éveillée' }, 'Réveillé'),
      ...Array.from({ length: nbDes }, (_, i) => h('th', `Dé ${i + 1}`)),
    )),
    h('tbody',
      h('tr.ligne-titre', h('td', { colspan: colonnes }, 'Toujours en jeu')),
      ...cfg.combos.flatMap(ligneCombo),
      h('tr.ligne-titre.ligne-titre--carte',
        h('td', { colspan: colonnes },
          'Cartes Tornade — seulement pendant la manche où la carte est en jeu'
          + (cfg.sansPoints ? ' · paquet « sans les points »' : ''))),
      ...(cartes.length
        ? cartes.map(ligneCarte)
        : [h('tr', h('td.mini.muted', { colspan: colonnes },
            'Aucune carte à combinaison dans le paquet de ce mode.'))]),
    ),
  ));
}
