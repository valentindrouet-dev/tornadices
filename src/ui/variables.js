// Menu Variables : toutes les options d'une partie, en un seul endroit.
//
// La page ne stocke qu'un jeu de réglages partiels ; `construireConfig` les pose
// par-dessus la configuration par défaut du nombre de joueurs choisi.

import { h, remplacer } from './dom.js?v=1.9';
import { pastilleSymbole } from './icons.js?v=1.9';
import { store } from './store.js?v=1.9';
import { aller } from './app.js?v=1.9';
import { lancerPartie } from './table.js?v=1.9';
import {
  configParDefaut, infosMiseEnPlace, ORDRE_SYMBOLES, SYMBOLES, CARTES_JOURNEE,
} from '../core/config.js?v=1.9';
import { randomSeed } from '../core/rng.js?v=1.9';
import { reglagesJoueurs } from './accueil.js?v=1.9';

const CHAMPS_MISE_EN_PLACE = ['lots', 'jetons', 'jetonsVert', 'cartesPourGagner'];

export function variables() {
  return store.get('variables', {});
}

/** Configuration complète d'une partie : défauts du nombre de joueurs + réglages. */
export function construireConfig(nbJoueurs) {
  const v = variables();
  const cfg = configParDefaut(nbJoueurs);
  for (const [cle, val] of Object.entries(v)) {
    if (val === undefined || val === null) continue;
    if (cle === 'suivreTableau') continue;
    if (v.suivreTableau !== false && CHAMPS_MISE_EN_PLACE.includes(cle)) continue;
    cfg[cle] = Array.isArray(val) ? val.slice() : val;
  }
  if (v.combos) {
    cfg.combos = cfg.combos.map((c) => ({
      ...c,
      requis: { ...(v.combos[c.id] || c.requis) },
    }));
  }
  return cfg;
}

function ecrire(cle, valeur) {
  const v = variables();
  v[cle] = valeur;
  store.set('variables', v);
}

export function vueVariables() {
  const racine = h('div.page');
  const nb = store.get('nbJoueurs', 6);

  function dessiner() {
    const v = variables();
    const cfg = construireConfig(nb);
    const mep = infosMiseEnPlace(nb);
    const suivreTableau = v.suivreTableau !== false;

    const num = (libelle, valeur, cle, opts = {}) => h('label.champ', libelle,
      h('input', {
        type: 'number', value: valeur,
        min: opts.min ?? 0, max: opts.max ?? 99999, step: opts.step ?? 1,
        disabled: opts.disabled,
        onchange: (e) => {
          let x = Number(e.target.value);
          if (!isFinite(x)) return;
          x = Math.min(opts.max ?? 99999, Math.max(opts.min ?? 0, x));
          ecrire(cle, x);
          dessiner();
        },
      }),
      opts.aide ? h('span.mini.muted', { style: { fontWeight: '400' } }, opts.aide) : null,
    );

    remplacer(racine,
      h('div.rangee', { style: { margin: '6px 0 6px' } },
        h('h1', 'Variables de partie'),
        h('div', { style: { flex: '1' } }),
        h('button.btn.btn--petit', {
          onclick: () => { store.set('variables', {}); dessiner(); },
        }, 'Réglages d’origine'),
        h('button.btn.btn--petit', { onclick: () => aller('/') }, '← Accueil'),
      ),
      h('p.petit.muted', { style: { marginBottom: '20px' } },
        `Tout ce qui suit s’applique à la prochaine partie, à ${nb} joueurs. `
        + 'Le Laboratoire dispose des mêmes réglages pour ses campagnes simulées.'),

      // ── Dés ───────────────────────────────────────────────────────────────
      h('div.carte',
        h('div.titre-section', 'Dés'),
        h('div.grille.grille--3', { style: { gap: '12px' } },
          num('Dés par lot', cfg.desParLot, 'desParLot', { min: 1, max: 12 }),
          num('Faces par dé', cfg.faces.length, '__faces', {
            min: 2, max: 12, disabled: true, aide: 'utilisez + et − ci-dessous',
          }),
          num('Lots en jeu', cfg.lots, 'lots', {
            min: 1, max: 9, disabled: suivreTableau,
            aide: suivreTableau ? `tableau officiel : ${mep.lots}` : '',
          }),
        ),
        h('div.faces-edit', { style: { marginTop: '14px' } },
          ...cfg.faces.map((f, i) => h('div.face-case',
            pastilleSymbole(f, 38),
            h('select', {
              onchange: (e) => {
                const faces = cfg.faces.slice();
                faces[i] = e.target.value;
                ecrire('faces', faces);
                dessiner();
              },
            }, ...ORDRE_SYMBOLES.map((sy) => h('option', {
              value: sy, selected: sy === f,
            }, SYMBOLES[sy].nom))),
          )),
        ),
        h('div.rangee.rangee--serree', { style: { marginTop: '12px' } },
          h('button.btn.btn--petit', {
            onclick: () => { ecrire('faces', [...cfg.faces, 'vide'].slice(0, 12)); dessiner(); },
          }, '+ une face'),
          h('button.btn.btn--petit', {
            disabled: cfg.faces.length <= 2,
            onclick: () => { ecrire('faces', cfg.faces.slice(0, -1)); dessiner(); },
          }, '− une face'),
          h('span.mini.muted',
            'Base : 2 tornades, 1 X, 1 ZzZ, 1 vache, 1 éclair. '
            + 'Le X fige son dé — il ne se relance jamais.'),
        ),
      ),

      // ── Combinaisons ──────────────────────────────────────────────────────
      h('div.carte',
        h('div.titre-section', 'Combinaisons requises'),
        tableauCombos(cfg, dessiner),
        h('p.mini.muted', { style: { marginTop: '10px' } },
          'Toute combinaison servie est jouée d’office : on ne relance jamais par-dessus.'),
      ),

      // ── Rythme ────────────────────────────────────────────────────────────
      h('div.carte',
        h('div.titre-section', 'Rythme de la table'),
        h('div.grille.grille--3', { style: { gap: '12px' } },
          num('Durée d’un lancer (ms)', cfg.dureeLancer, 'dureeLancer',
            { min: 0, max: 6000, step: 50, aide: 'le temps que les dés roulent' }),
          num('Temps de constat (ms)', cfg.dureeConstat, 'dureeConstat',
            { min: 0, max: 6000, step: 50, aide: 'pour voir le résultat avant que le lot parte' }),
          num('Durée du passage (ms)', cfg.dureePassage, 'dureePassage',
            { min: 0, max: 6000, step: 50, aide: 'le lot traverse jusqu’au voisin' }),
        ),
        h('div.grille.grille--3', { style: { gap: '12px', marginTop: '12px' } },
          num('Transition de manche (ms)', cfg.dureeTransition, 'dureeTransition',
            { min: 0, max: 12000, step: 100, aide: 'les dés reviennent au centre et repartent' }),
        ),
        h('div.grille.grille--3', { style: { gap: '12px', marginTop: '12px' } },
          num('Réflexion d’une IA (ms)', cfg.tempsReflexion, 'tempsReflexion',
            { min: 0, max: 4000, step: 50 }),
          num('Écart de réflexion (ms)', cfg.ecartReflexion, 'ecartReflexion',
            { min: 0, max: 2000, step: 10 }),
          num('Fenêtre de réflexe (ms)', cfg.fenetreReflexe, 'fenetreReflexe',
            { min: 100, max: 4000, step: 50, aide: 'pour toucher ou retirer sa main' }),
        ),
        h('div.encart', { style: { marginTop: '12px' } },
          'Ces durées comptent dans le temps de partie : les allonger ralentit le jeu et rallonge '
          + 'les manches, exactement comme sur une vraie table.'),
      ),

      // ── Mise en place ─────────────────────────────────────────────────────
      h('div.carte',
        h('div.rangee', { style: { marginBottom: '14px' } },
          h('div.titre-section', { style: { margin: 0, flex: '1' } }, 'Mise en place'),
          h('button', {
            class: `chip${suivreTableau ? ' on' : ''}`,
            onclick: () => { ecrire('suivreTableau', !suivreTableau); dessiner(); },
          }, h('span.case', '✓'), 'Suivre le tableau officiel'),
        ),
        h('div.grille.grille--4', { style: { gap: '12px' } },
          num('Jetons Bleu / Jaune', cfg.jetons, 'jetons',
            { min: 1, max: 12, disabled: suivreTableau, aide: suivreTableau ? `officiel : ${mep.jetons}` : '' }),
          num('Jetons du Vert', cfg.jetonsVert, 'jetonsVert',
            { min: 1, max: 12, disabled: suivreTableau, aide: suivreTableau ? `officiel : ${mep.jetonsVert}` : '' }),
          num('Cartes pour gagner', cfg.cartesPourGagner, 'cartesPourGagner',
            { min: 1, max: 12, disabled: suivreTableau, aide: suivreTableau ? `officiel : ${mep.cartes}` : '' }),
          num('Manches maximum', cfg.manchesMax, 'manchesMax', { min: 1, max: 200 }),
        ),
        mep.extrapole
          ? h('p.mini.muted', { style: { marginTop: '8px' } },
              'À 9 joueurs, le tableau officiel s’arrête : ces valeurs sont extrapolées.')
          : null,
      ),

      // ── Adresse et incidents ──────────────────────────────────────────────
      h('div.carte',
        h('div.titre-section', 'Adresse et incidents'),
        h('div.grille.grille--3', { style: { gap: '12px' } },
          num('Adresse de base', cfg.adresseBase, 'adresseBase',
            { min: 0, max: 1, step: 0.05, aide: 'chance de toucher, de 0 à 1' }),
          num('Taux d’erreur', cfg.tauxErreur, 'tauxErreur',
            { min: 0, max: 1, step: 0.01, aide: 'relancer un X par mégarde' }),
          num('Erreur punie', cfg.penaliteErreurAdverse, 'penaliteErreurAdverse',
            { min: 0, max: 1, step: 0.05, aide: 'part des erreurs qui offrent un jeton' }),
        ),
      ),

      // ── Cartes Journée ────────────────────────────────────────────────────
      h('div.carte',
        h('div.rangee', { style: { marginBottom: '12px' } },
          h('div.titre-section', { style: { margin: 0, flex: '1' } }, 'Cartes Journée en jeu'),
          h('button', {
            class: `chip${cfg.melangerCartes !== false ? ' on' : ''}`,
            onclick: () => { ecrire('melangerCartes', cfg.melangerCartes === false); dessiner(); },
          }, h('span.case', '✓'), 'Mélanger la pile'),
        ),
        h('div.rangee.rangee--serree',
          ...CARTES_JOURNEE.map((c) => {
            const dedans = cfg.cartes.includes(c.id);
            return h('button', {
              class: `chip${dedans ? ' on' : ''}`, title: c.texte,
              onclick: () => {
                const liste = dedans ? cfg.cartes.filter((x) => x !== c.id) : [...cfg.cartes, c.id];
                ecrire('cartes', liste);
                dessiner();
              },
            }, h('span.case', '✓'), c.court);
          }),
        ),
        h('p.mini.muted', { style: { marginTop: '10px' } },
          'La pile démarre par « Jour de chauffe » s’il est coché ; le reste suit.'),
      ),

      // ── Graine ────────────────────────────────────────────────────────────
      h('div.carte',
        h('div.titre-section', 'Graine'),
        h('div.rangee',
          h('button', {
            class: `chip${v.graineManuelle ? ' on' : ''}`,
            onclick: () => { ecrire('graineManuelle', !v.graineManuelle); dessiner(); },
          }, h('span.case', '✓'), 'Graine manuelle'),
          v.graineManuelle
            ? h('input', {
                type: 'text', value: v.graine || randomSeed(), style: { width: '180px' },
                onchange: (e) => ecrire('graine', e.target.value),
              })
            : h('span.petit.muted', 'Chaque partie tire une graine au hasard.'),
        ),
        h('p.mini.muted', { style: { marginTop: '8px' } },
          'À graine fixée, deux parties aux mêmes réglages se déroulent exactement pareil.'),
      ),

      h('div.rangee', { style: { justifyContent: 'center', marginTop: '26px' } },
        h('button.btn.btn--primaire.btn--grand', { onclick: commencer }, 'Commencer la partie'),
        h('button.btn.btn--grand', { onclick: () => aller('/labo') }, 'Laboratoire d’équilibrage'),
      ),
    );
  }

  function commencer() {
    const v = variables();
    const cfg = construireConfig(nb);
    lancerPartie(cfg, reglagesJoueurs(nb), v.graineManuelle ? (v.graine || randomSeed()) : randomSeed());
    aller('/table');
  }

  dessiner();
  return racine;
}

function tableauCombos(cfg, rafraichir) {
  const symboles = ORDRE_SYMBOLES.filter((s) => s !== 'vide');
  const v = variables();

  const ligne = (nom, requis, ecrireLigne) => h('tr',
    h('td', { style: { fontWeight: '700' } }, nom),
    ...symboles.map((s) => h('td.num', h('input', {
      type: 'number', min: 0, max: 12, value: requis[s] || 0,
      style: { width: '100%', minWidth: '0', padding: '4px', textAlign: 'right' },
      onchange: (e) => { ecrireLigne(s, Math.max(0, Number(e.target.value) || 0)); rafraichir(); },
    }))),
  );

  return h('table.tbl.tbl--compacte', { style: { tableLayout: 'fixed' } },
    h('colgroup', h('col', { style: { width: '34%' } }), ...symboles.map(() => h('col'))),
    h('thead', h('tr',
      h('th', 'Combinaison'),
      ...symboles.map((s) => h('th.num', pastilleSymbole(s, 20))),
    )),
    h('tbody',
      ...cfg.combos.map((c) => ligne(c.nom, c.requis, (sym, n) => {
        const combos = { ...(v.combos || {}) };
        const cur = { ...(combos[c.id] || c.requis) };
        if (n > 0) cur[sym] = n; else delete cur[sym];
        combos[c.id] = cur;
        ecrire('combos', combos);
      })),
      ...CARTES_JOURNEE.filter((c) => c.combo).map((carte) => {
        const requis = (cfg.combosCartes && cfg.combosCartes[carte.combo.id]) || carte.combo.requis;
        return ligne(carte.court, requis, (sym, n) => {
          const cartes = { ...(v.combosCartes || {}) };
          const cur = { ...(cartes[carte.combo.id] || carte.combo.requis) };
          if (n > 0) cur[sym] = n; else delete cur[sym];
          cartes[carte.combo.id] = cur;
          ecrire('combosCartes', cartes);
        });
      }),
    ),
  );
}
