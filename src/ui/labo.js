// Laboratoire d'équilibrage : campagnes simulées et probabilités exactes.

import { h, remplacer, pourcent, nombre, dureeLongue, telecharger } from './dom.js?v=1.36';
import { pastilleSymbole, suiteSymboles } from './icons.js?v=1.36';
import { store } from './store.js?v=1.36';
import { lancerCampagne, SCHEMA_RESULTAT } from '../core/sim.js?v=1.36';
import {
  configParDefaut, infosMiseEnPlace, placement, PROFILS_IA, COULEURS_EQUIPE,
  ORDRE_SYMBOLES, SYMBOLES, CARTES_TORNADE, profilIA,
  OPTIONS_ATTRAPE, AIDE_ATTRAPE, OPTIONS_DECLENCHEUR, AIDE_DECLENCHEUR,
  OPTIONS_MANCHE, AIDE_MANCHE, noteCarteMode,
  OPTIONS_EQUIPE_DEPART, AIDE_EQUIPE_DEPART,
  cleCombosCartes, clePaquet, cartesEnJeu, comboPossible,
  assainirConfig, TYPES_DE, facesPourDe, aideVariance,
} from '../core/config.js?v=1.36';
import { tableauCombos } from './combos.js?v=1.36';
import {
  loiDuDe, loiBinomiale, courseCombinaison, courseAvecGarde, esperanceAvantPerte,
} from '../core/proba.js?v=1.36';

const NOM_SYM = Object.fromEntries(Object.values(SYMBOLES).map((s) => [s.id, s.nom]));

/**
 * Le dernier résultat de campagne, s'il est encore lisible. Un résultat produit
 * par une version antérieure n'a pas les colonnes d'aujourd'hui : on l'écarte
 * plutôt que de laisser la page tomber sur un champ absent. Il suffit de
 * relancer la campagne — c'est l'affaire d'une seconde.
 */
function resultatEnregistre() {
  const r = store.get('dernierResultat', null);
  if (!r || typeof r !== 'object') return null;
  // Une erreur enregistrée n'a pas de format : elle reste affichable telle quelle.
  if (r.erreur) return r;
  return r.schema === SCHEMA_RESULTAT ? r : null;
}

function cfgLabo() {
  const enregistre = store.get('cfgLabo', null);
  // Un Laboratoire ouvert de longue date garde ses réglages tels quels : il faut
  // les retraduire, sinon les faces d'avant le renommage de la v1.3 restent au
  // dé sans que rien ne les reconnaisse.
  if (enregistre) return assainirConfig(enregistre);
  const c = configParDefaut(6);
  c.combosCartes = {};
  return c;
}

let etat = {
  onglet: 'simulation',
  cfg: cfgLabo(),
  profils: store.get('profilsLabo', null) || Array.from({ length: 9 }, () => 'equilibre'),
  nbParties: store.get('nbPartiesLabo', 200),
  graine: store.get('graineLabo', 'tornade-1000'),
  resultat: resultatEnregistre(),
  calcul: false,
};

function sauver() {
  store.set('cfgLabo', etat.cfg);
  store.set('profilsLabo', etat.profils);
  store.set('nbPartiesLabo', etat.nbParties);
  store.set('graineLabo', etat.graine);
}

export function vueLabo() {
  const racine = h('div.page.page--large');

  function dessiner() {
    remplacer(racine,
      h('div.rangee', { style: { margin: '6px 0 18px' } },
        h('h1', 'Laboratoire d’équilibrage'),
      ),
      h('div.onglets',
        ...[['simulation', 'Simulation'], ['probas', 'Probabilités'], ['regles', 'Règles chiffrées']]
          .map(([id, lib]) => h('button', {
            class: etat.onglet === id ? 'on' : '',
            onclick: () => { etat.onglet = id; dessiner(); },
          }, lib)),
      ),
      etat.onglet === 'simulation' ? ongletSimulation(dessiner)
        : etat.onglet === 'probas' ? ongletProbas(dessiner)
          : ongletRegles(dessiner),
    );
  }

  dessiner();
  return racine;
}

// ── Onglet Simulation ────────────────────────────────────────────────────────
function ongletSimulation(rafraichir) {
  return h('div.grille.grille--labo',
    panneauConfig(rafraichir),
    etat.calcul
      ? h('div.carte', { style: { textAlign: 'center', padding: '60px 20px' } },
          h('h3', 'Campagne en cours…'),
          h('p.muted', `${etat.nbParties} parties simulées, un instant.`))
      : (etat.resultat ? resultats(etat.resultat) : accueilLabo()),
  );
}

function accueilLabo() {
  return h('div.carte',
    h('p', 'Lancez une campagne pour obtenir la distribution des durées, le taux de victoire '
      + 'de chaque équipe, la fréquence de chaque combinaison, l’origine des jetons retournés '
      + 'et l’avantage éventuel de la place à table.'),
    h('p.petit.muted', 'Les IA jouent exactement les règles réglées à gauche : modifiez une '
      + 'valeur, relancez, comparez. La graine rend chaque campagne reproductible.'),
  );
}

function panneauConfig(rafraichir) {
  const cfg = etat.cfg;
  const mep = infosMiseEnPlace(cfg.nbJoueurs);
  const sieges = placement(cfg.nbJoueurs);

  const num = (libelle, valeur, onchange, opts = {}) => h('label.champ', libelle,
    h('input', {
      type: 'number', value: valeur, min: opts.min ?? 0, max: opts.max ?? 9999,
      step: opts.step ?? 1, disabled: opts.disabled,
      onchange: (e) => { onchange(Number(e.target.value)); rafraichir(); },
    }));

  function lancer() {
    sauver();
    etat.calcul = true;
    rafraichir();
    // On rend l'écran d'attente avant de bloquer le fil principal.
    setTimeout(() => {
      const spec = Array.from({ length: cfg.nbJoueurs }, (_, i) => ({
        nom: `J${i + 1}`, type: 'ia', profil: etat.profils[i] || 'equilibre',
      }));
      try {
        etat.resultat = lancerCampagne(cfg, spec, etat.graine, etat.nbParties);
        store.set('dernierResultat', etat.resultat);
      } catch (err) {
        etat.resultat = { erreur: String(err && err.message ? err.message : err) };
      }
      etat.calcul = false;
      rafraichir();
    }, 40);
  }

  return h('div.carte',
    h('div.rangee', { style: { marginBottom: '16px' } },
      h('button.btn.btn--primaire.btn--grand', {
        style: { flex: '1' }, onclick: lancer, disabled: etat.calcul,
      }, 'Lancer la simulation'),
      h('button.btn.btn--petit', {
        onclick: () => {
          const base = configParDefaut(cfg.nbJoueurs);
          base.combosCartes = {};
          etat.cfg = base;
          store.set('cfgLabo', base);
          rafraichir();
        },
      }, 'Réglages d’origine'),
    ),

    h('div.titre-section', 'Configuration testée'),

    h('div.grille.grille--3', { style: { gap: '10px' } },
      h('label.champ', 'Joueurs', h('select', {
        onchange: (e) => {
          const n = Number(e.target.value);
          // Le mode reste celui de la campagne en cours : sans les points, la
          // référence est quatre cartes, pas celle du tableau officiel.
          const base = configParDefaut(n, { sansPoints: cfg.sansPoints });
          Object.assign(cfg, {
            nbJoueurs: n, lots: base.lots, jetons: base.jetons,
            jetonsVert: base.jetonsVert, cartesPourGagner: base.cartesPourGagner,
          });
          rafraichir();
        },
      }, ...[3, 4, 5, 6, 7, 8, 9].map((n) => h('option', { value: n, selected: n === cfg.nbJoueurs }, n)))),
      h('label.champ', 'Parties', h('select', {
        onchange: (e) => { etat.nbParties = Number(e.target.value); },
      }, ...[25, 50, 100, 200, 500, 1000, 2000].map((n) =>
        h('option', { value: n, selected: n === etat.nbParties }, n)))),
      h('label.champ', 'Graine', h('input', {
        type: 'text', value: etat.graine, onchange: (e) => { etat.graine = e.target.value; },
      })),
    ),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Profils des joueurs'),
    h('div', { style: { display: 'grid', gap: '6px' } },
      ...Array.from({ length: cfg.nbJoueurs }, (_, i) => h('div.rangee.rangee--serree',
        h('span.badge', { class: `badge--${sieges[i]}`, style: { width: '54px', textAlign: 'center' } },
          `J${i + 1}`),
        h('select', {
          style: { flex: '1' },
          onchange: (e) => { etat.profils[i] = e.target.value; rafraichir(); },
        }, ...Object.values(PROFILS_IA).map((p) => h('option', {
          value: p.id, title: p.desc,
          selected: profilIA(etat.profils[i]).id === p.id,
        }, p.nom))),
      )),
    ),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Dés'),
    h('div.grille.grille--3', { style: { gap: '10px' } },
      num('Dés par lot', cfg.desParLot, (v) => { cfg.desParLot = Math.max(1, Math.min(12, v)); }, { min: 1, max: 12 }),
      h('label.champ', 'Type de dé',
        h('div.segment', ...TYPES_DE.map((n) => h('button', {
          class: cfg.faces.length === n ? 'on' : '',
          onclick: () => { cfg.faces = facesPourDe(n); rafraichir(); },
        }, `d${n}`))),
      ),
      num('Lots en jeu', cfg.lots, (v) => { cfg.lots = Math.max(1, v); }, { min: 1, max: 9 }),
    ),
    h('div.faces-edit', { style: { marginTop: '10px' } },
      ...cfg.faces.map((f, i) => h('div.face-case',
        pastilleSymbole(f, 30),
        h('select', {
          onchange: (e) => { cfg.faces[i] = e.target.value; rafraichir(); },
        }, ...ORDRE_SYMBOLES.map((s) => h('option', { value: s, selected: s === f }, NOM_SYM[s]))),
      )),
    ),
    h('div.rangee', { style: { marginTop: '18px', marginBottom: '10px' } },
      h('div.titre-section', { style: { margin: 0, flex: '1' } }, 'Combinaisons requises'),
      h('button', {
        class: `chip${cfg.combos.some((c) => c.id === 'echecJokers') ? ' on' : ''}`,
        title: 'Trois jokers d’un coup font partir le lot, comme deux X',
        onclick: () => {
          const actif = cfg.combos.some((c) => c.id === 'echecJokers');
          cfg.echecJokers = !actif;
          // On repart de la liste de référence en gardant les seuils déjà réglés.
          cfg.combos = configParDefaut(cfg.nbJoueurs, { echecJokers: !actif }).combos
            .map((c) => {
              const garde = cfg.combos.find((x) => x.id === c.id);
              return { ...c, requis: { ...((garde && garde.requis) || c.requis) } };
            });
          rafraichir();
        },
      }, h('span.case', '✓'), 'Trois jokers = échec'),
    ),
    tableauCombos(cfg, {
      ecrireCombo: (id, requis) => {
        const c = cfg.combos.find((x) => x.id === id);
        if (c) c.requis = requis;
      },
      ecrireCarte: (id, requis) => {
        const cle = cleCombosCartes(cfg);
        if (!cfg[cle]) cfg[cle] = {};
        cfg[cle][id] = requis;
      },
      ecrireVert: (id, requis) => {
        if (!cfg.combosVert) cfg.combosVert = {};
        cfg.combosVert[id] = requis;
      },
      ecrireFace: (id, face) => {
        const c = cfg.combos.find((x) => x.id === id);
        if (c) c.face = face;
      },
      rafraichir,
    }),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Comment se joue une manche'),
    h('div.segment',
      ...OPTIONS_MANCHE.map(([id, lib]) => h('button', {
        class: (cfg.sansPoints ? 'sansPoints' : 'jetons') === id ? 'on' : '',
        style: { fontSize: '12.5px' },
        onclick: () => {
          cfg.sansPoints = id === 'sansPoints';
          // Les deux modes n'ont ni le même nombre de cartes ni la même valeur
          // d'attrape : on repart de leurs références, quitte à les rerégler.
          const base = configParDefaut(cfg.nbJoueurs, { sansPoints: cfg.sansPoints });
          cfg.cartesPourGagner = base.cartesPourGagner;
          cfg.attrapeGagneManche = base.attrapeGagneManche;
          rafraichir();
        },
      }, lib)),
    ),
    h('div.mini.muted', { style: { marginTop: '6px' } },
      AIDE_MANCHE[cfg.sansPoints ? 'sansPoints' : 'jetons']),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Ce qui déclenche l’attrape'),
    h('div.segment',
      ...OPTIONS_DECLENCHEUR.map(([id, lib]) => h('button', {
        class: (cfg.attrapeSur || 'eclair') === id ? 'on' : '',
        style: { fontSize: '12.5px' },
        // Les deux combinaisons restent en place : le réglage ne fait que
        // désigner celle qui porte le contact.
        onclick: () => { cfg.attrapeSur = id; rafraichir(); },
      }, lib)),
    ),
    h('div.rangee.rangee--serree', { style: { marginTop: '8px' } },
      h('button', {
        class: `chip${cfg.attrapeEveille !== false ? ' on' : ''}`,
        title: 'Un dormeur ne tend pas la main — ne concerne que l’attrape sur échec',
        onclick: () => { cfg.attrapeEveille = cfg.attrapeEveille === false; rafraichir(); },
      }, h('span.case', '✓'), 'Il faut être réveillé'),
    ),
    h('div.mini.muted', { style: { marginTop: '6px' } }, AIDE_DECLENCHEUR[cfg.attrapeSur || 'eclair']),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Ce que rapporte l’attrape'),
    h('div.segment',
      ...OPTIONS_ATTRAPE.map(([id, lib]) => h('button', {
        class: (cfg.attrapeGagneManche || 'non') === id ? 'on' : '',
        style: { fontSize: '12.5px' },
        onclick: () => { cfg.attrapeGagneManche = id; rafraichir(); },
      }, lib)),
    ),
    h('div.mini.muted', { style: { marginTop: '6px' } },
      cfg.sansPoints && cfg.attrapeGagneManche !== 'touche'
        ? 'Sans les points, « Un jeton » ne rapporte rien : le contact interrompt le voisin, sans '
          + 'plus. C’est « Manche gagnée » qui fait de l’attrape le second moyen de prendre une manche.'
        : AIDE_ATTRAPE[cfg.attrapeGagneManche || 'non']),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Quand deux lots se rencontrent'),
    h('div.segment',
      ...[['pousse', 'Poussé'], ['cumul', 'Empilés']].map(([id, lib]) => h('button', {
        class: (cfg.lotsCumules ? 'cumul' : 'pousse') === id ? 'on' : '',
        style: { fontSize: '12.5px' },
        onclick: () => { cfg.lotsCumules = id === 'cumul'; rafraichir(); },
      }, lib)),
    ),
    h('div.mini.muted', { style: { marginTop: '6px' } },
      cfg.lotsCumules
        ? 'Les lots s’empilent dans la même main et attendent leur tour.'
        : 'Le lot en cours est poussé vers le voisin suivant, la poussée peut se propager.'),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Mise en place'),
    h('div.grille.grille--4', { style: { gap: '10px' } },
      num('Jetons Bleu/Jaune', cfg.jetons, (v) => { cfg.jetons = Math.max(1, v); },
        { min: 1, max: 12, disabled: cfg.sansPoints }),
      num('Jetons Vert', cfg.jetonsVert, (v) => { cfg.jetonsVert = Math.max(1, v); },
        { min: 1, max: 12, disabled: cfg.sansPoints }),
      num('Cartes pour gagner', cfg.cartesPourGagner, (v) => { cfg.cartesPourGagner = Math.max(1, v); }, { min: 1, max: 12 }),
      cfg.nbJoueurs % 2
        ? num('Cartes du Vert', cfg.cartesVert ?? cfg.cartesPourGagner,
            (v) => { cfg.cartesVert = Math.max(1, v); }, { min: 1, max: 12 })
        : null,
      num('Manches max.', cfg.manchesMax, (v) => { cfg.manchesMax = Math.max(1, v); }, { min: 1, max: 200 }),
    ),
    h('div.mini.muted', { style: { marginTop: '6px' } },
      `Référence officielle à ${cfg.nbJoueurs} joueurs : ${mep.lots} lots · ${mep.jetons} jetons `
      + `(Vert ${mep.jetonsVert}) · ${mep.cartes} cartes.`
      + (mep.extrapole ? ' Valeurs extrapolées au-delà de 8 joueurs.' : '')),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Qui commence'),
    h('div.segment',
      ...OPTIONS_EQUIPE_DEPART
        .filter(([id]) => id !== 'vert' || cfg.nbJoueurs % 2)
        .map(([id, lib]) => h('button', {
          class: (cfg.equipeDepart || 'jaune') === id ? 'on' : '',
          style: { fontSize: '12.5px' },
          onclick: () => { cfg.equipeDepart = id; rafraichir(); },
        }, lib)),
    ),
    h('div.mini.muted', { style: { marginTop: '6px' } },
      AIDE_EQUIPE_DEPART[cfg.equipeDepart || 'jaune']),

    h('div.titre-section', { style: { marginTop: '18px' } }, 'Rythme et adresse'),
    h('div.grille.grille--3', { style: { gap: '10px' } },
      num('Durée d’un lancer (ms)', cfg.dureeLancer, (v) => { cfg.dureeLancer = Math.max(0, v); }, { min: 0, max: 6000, step: 50 }),
      num('Temps de constat (ms)', cfg.dureeConstat, (v) => { cfg.dureeConstat = Math.max(0, v); }, { min: 0, max: 6000, step: 50 }),
      num('Durée du passage (ms)', cfg.dureePassage, (v) => { cfg.dureePassage = Math.max(0, v); }, { min: 0, max: 6000, step: 50 }),
    ),
    h('div.grille.grille--3', { style: { gap: '10px', marginTop: '10px' } },
      num('Réflexion IA (ms)', cfg.tempsReflexion, (v) => { cfg.tempsReflexion = Math.max(0, v); }, { min: 0, max: 4000, step: 50 }),
      num('Écart de réflexion (ms)', cfg.ecartReflexion, (v) => { cfg.ecartReflexion = Math.max(0, v); }, { min: 0, max: 2000, step: 10 }),
      num('Adresse de base', cfg.adresseBase, (v) => { cfg.adresseBase = Math.min(1, Math.max(0, v)); }, { min: 0, max: 1, step: 0.05 }),
    ),
    h('div.grille.grille--2', { style: { gap: '10px', marginTop: '10px' } },
      num('Irrégularité du rythme (%)', Math.round((cfg.variance || 0) * 100),
        (v) => { cfg.variance = Math.min(0.5, Math.max(0, v / 100)); }, { min: 0, max: 50, step: 5 }),
      h('div.mini.muted', { style: { alignSelf: 'end', paddingBottom: '6px' } },
        aideVariance(cfg.variance || 0, cfg)),
    ),
    h('div.grille.grille--2', { style: { gap: '10px', marginTop: '10px' } },
      num('Taux d’erreur', cfg.tauxErreur, (v) => { cfg.tauxErreur = Math.min(1, Math.max(0, v)); }, { min: 0, max: 1, step: 0.01 }),
      num('Erreur punie par l’adversaire', cfg.penaliteErreurAdverse, (v) => { cfg.penaliteErreurAdverse = Math.min(1, Math.max(0, v)); }, { min: 0, max: 1, step: 0.05 }),
    ),

  );
}

// ── Résultats ────────────────────────────────────────────────────────────────
function resultats(r) {
  if (r.erreur) {
    return h('div.carte', h('h3', 'La campagne a échoué'), h('p.petit', r.erreur));
  }
  const total = r.nbParties;
  const equipes = Object.entries(r.victoires).sort((a, b) => b[1] - a[1]);

  return h('div', { style: { display: 'grid', gap: '16px' } },
    h('div.grille.grille--4',
      stat(String(total), 'parties', `calculées en ${r.calculMs} ms`),
      stat(dureeLongue(r.duree.moyenneMs), 'durée moyenne',
        `médiane ${dureeLongue(r.duree.medianeMs)}`),
      stat(nombre(r.manches.moyenne, 1), 'manches par partie',
        `de ${r.manches.min} à ${r.manches.max}`),
      stat(nombre(r.collisions.parPartie, 1), 'contacts tentés par partie',
        `${pourcent(r.collisions.taux, 0)} de touchés`),
    ),

    h('div.carte',
      h('div.titre-section', 'Victoires par équipe'),
      ...equipes.map(([id, n]) => {
        const c = COULEURS_EQUIPE[id] || { nom: 'Aucune', hex: '#b8b0a5' };
        return h('div', { style: { marginBottom: '10px' } },
          h('div.rangee', { style: { justifyContent: 'space-between', marginBottom: '4px' } },
            h('strong', c.nom),
            h('span.petit.muted', `${n} · ${pourcent(n / total)}`)),
          h('div.barre-fond', h('div', {
            style: { width: `${(n / total) * 100}%`, background: c.hex },
          })));
      }),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'À nombre impair de joueurs, le Vert joue seul avec moins de jetons : '
        + 'c’est l’asymétrie la plus sensible du jeu.'),
    ),

    h('div.grille.grille--2',
      h('div.carte',
        h('div.titre-section', 'Durée des parties (minutes)'),
        histogramme(r.duree.histogramme.map((c) => ({ n: c.n, min: c.min, max: c.max })), 1),
        h('p.mini.muted',
          `10 % des parties sous ${dureeLongue(r.duree.p10Ms)}, 10 % au-delà de ${dureeLongue(r.duree.p90Ms)}. `
          + `Manche moyenne : ${dureeLongue(r.dureeManche.moyenneMs)}.`),
      ),
      h('div.carte',
        h('div.titre-section', 'Nombre de manches'),
        histogrammeEntier(r.manches.histogramme),
      ),
    ),

    h('div.grille.grille--2',
      h('div.carte',
        h('div.titre-section', 'Avantage de la place à table'),
        h('table.tbl',
          h('thead', h('tr', h('th', 'Siège'), h('th', 'Équipe'), h('th.num', 'Victoires'),
            h('th.num', 'Jetons'), h('th.num', 'Touchés'), h('th.num', 'Subis'))),
          h('tbody', ...r.parSiege.map((s) => h('tr',
            h('td', `Siège ${s.siege + 1}`),
            h('td', h('span.badge', { class: `badge--${s.equipe}` },
              (COULEURS_EQUIPE[s.equipe] || {}).nom || '—')),
            h('td.num', pourcent(s.victoires / total, 0)),
            h('td.num', nombre(s.jetons / total, 2)),
            h('td.num', nombre(s.touches / total, 2)),
            h('td.num', nombre(s.subis / total, 2)),
          ))),
        ),
        h('p.mini.muted', 'Jetons, touchés et subis sont donnés par partie.'),
      ),
      h('div.carte',
        h('div.titre-section', 'Profils d’IA'),
        h('table.tbl',
          h('thead', h('tr', h('th', 'Profil'), h('th.num', 'Sièges'), h('th.num', 'Victoires'),
            h('th.num', 'Jetons/partie'), h('th.num', 'Lancers/partie'))),
          h('tbody', ...r.parProfil.map((p) => h('tr',
            h('td', profilIA(p.profil).nom),
            h('td.num', p.parties),
            h('td.num', pourcent(p.victoires / p.parties, 0)),
            h('td.num', nombre(p.jetons / p.parties, 2)),
            h('td.num', nombre(p.lancers / p.parties, 1)),
          ))),
        ),
        h('p.mini.muted', 'Un profil présent sur plus de sièges gagne mécaniquement plus souvent : '
          + 'comparez à effectifs égaux.'),
      ),
    ),

    h('div.grille.grille--2',
      h('div.carte',
        h('div.titre-section', 'Combinaisons de base'),
        tableauFrequences(r.combosBase, total, 'par partie'),
        h('p.mini.muted', 'Les combinaisons de la Tornade, disponibles à chaque lancer. Celles '
          + 'des cartes sont comptées à part : elles n’existent qu’une manche durant, et les '
          + 'mélanger écraserait leur fréquence réelle.'),
      ),
      h('div.carte',
        h('div.titre-section', 'Origine des jetons retournés'),
        tableauFrequences(r.jetonsParSource, total, 'par partie'),
        h('p.mini.muted', 'Si les collisions dominent, la course aux vaches perd son rôle moteur.'),
      ),
    ),

    // Le taux de sortie d'une carte n'a de sens que rapporté aux manches où
    // elle était en jeu : c'est une combinaison sur une manche, pas sur la
    // partie. D'où une colonne « réalisée » à côté de « jouée ».
    h('div.carte',
      h('div.titre-section', 'Cartes Tornade — sortie de leur combinaison'),
      h('table.tbl',
        h('thead', h('tr', h('th', 'Carte'), h('th', 'Combinaison'),
          h('th.num', 'Manches jouées'), h('th.num', 'Manches où elle sort'),
          h('th.num', 'Taux de sortie'), h('th.num', 'Réalisations'),
          h('th.num', 'Durée moyenne'), h('th', 'Vainqueurs'))),
        h('tbody', ...r.parCarte.map((c) => {
          const carte = CARTES_TORNADE.find((x) => x.id === c.id);
          const combo = carte && carte.combo;
          return h('tr',
            h('td', c.nom),
            h('td', combo
              ? h('div.rangee.rangee--serree', suiteSymboles(combo.requis, 16))
              : h('span.mini.muted', 'aucune')),
            h('td.num', c.jouee),
            h('td.num', combo ? (c.manchesRealisee ?? 0) : '—'),
            h('td.num', combo ? pourcent((c.manchesRealisee ?? 0) / Math.max(1, c.jouee), 0) : '—'),
            h('td.num', combo ? nombre((c.realisations ?? 0) / Math.max(1, c.jouee), 2) : '—'),
            h('td.num', dureeLongue(c.dureeTotale / Math.max(1, c.jouee))),
            h('td', Object.entries(c.vainqueurs)
              .sort((a, b) => b[1] - a[1])
              .map(([id, n]) => h('span.badge', {
                class: `badge--${id}`, style: { marginRight: '4px' },
              }, `${(COULEURS_EQUIPE[id] || {}).nom || 'aucun'} ${n}`))),
          );
        })),
      ),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        '« Taux de sortie » : la part des manches où la carte était en jeu et où sa combinaison '
        + 'est effectivement tombée. « Réalisations » : combien de fois par manche jouée. Un taux '
        + 'à 0 % signale une combinaison que le dé ne peut pas produire — vérifiez ses faces.'),
    ),

    h('div.carte',
      h('div.rangee',
        h('div.titre-section', { style: { margin: '0', flex: '1' } }, 'Export'),
        h('button.btn.btn--petit', {
          onclick: () => telecharger(`tornadice-campagne-${etat.graine}.csv`, campagneCSV(r)),
        }, 'Exporter en CSV'),
        h('button.btn.btn--petit', {
          onclick: () => telecharger(`tornadice-campagne-${etat.graine}.json`,
            JSON.stringify({ config: etat.cfg, profils: etat.profils, resultat: r }, null, 2),
            'application/json'),
        }, 'Exporter le réglage complet (JSON)'),
      ),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        `Graine « ${r.graine} » — relancer la même campagne avec la même graine redonne exactement ces chiffres.`),
    ),
  );
}

function tableauFrequences(objet, total, unite) {
  // Un agrégat absent vaut « aucune occurrence » : une colonne qui manque ne
  // doit jamais emporter la page entière.
  const lignes = Object.entries(objet || {}).sort((a, b) => b[1] - a[1]);
  if (!lignes.length) return h('p.petit.muted', 'Aucune occurrence.');
  const max = lignes[0][1];
  return h('table.tbl',
    h('thead', h('tr', h('th', 'Effet'), h('th.num', 'Total'), h('th.num', unite), h('th', ''))),
    h('tbody', ...lignes.map(([id, n]) => h('tr',
      h('td', libelleEffet(id)),
      h('td.num', n),
      h('td.num', nombre(n / total, 2)),
      h('td', { style: { width: '35%' } },
        h('div.barre-fond', h('div', {
          style: { width: `${(n / max) * 100}%`, background: 'var(--accent)' },
        }))),
    ))),
  );
}

const LIBELLES = {
  reveil: 'Réveil (3 tornades)', vache: 'Vache', endormir: 'Endormir un voisin',
  collision: 'Attrape (3 éclairs)', blocage: 'Échec (2 X)',
  echecJokers: 'Échec (3 jokers)', fatigue: 'Fatigue', intensive: 'Intensive',
  sansVent: 'Sans vent', chance: 'Chance', troupeau: 'Troupeau',
  difference: 'Différence', vaillants: 'Vaillants',
};
function libelleEffet(id) { return LIBELLES[id] || id; }

function stat(valeur, libelle, sous) {
  return h('div.stat',
    h('div.lib', libelle),
    h('div.val', valeur),
    sous ? h('div.sous', sous) : null,
  );
}

function histogramme(classes, dec) {
  if (!classes.length) return h('p.petit.muted', '—');
  const max = Math.max(...classes.map((c) => c.n));
  return h('div',
    h('div.histo', ...classes.map((c) => h('div.col', {
      style: { height: `${max ? (c.n / max) * 100 : 0}%` },
      title: `${nombre(c.min, dec)} – ${nombre(c.max, dec)} min : ${c.n} parties`,
    }))),
    h('div.histo-legende',
      h('span', `${nombre(classes[0].min, dec)} min`),
      h('span', `${nombre(classes[classes.length - 1].max, dec)} min`)),
  );
}

function histogrammeEntier(classes) {
  if (!classes.length) return h('p.petit.muted', '—');
  const max = Math.max(...classes.map((c) => c.n));
  return h('div',
    h('div.histo', ...classes.map((c) => h('div.col', {
      style: { height: `${(c.n / max) * 100}%` },
      title: `${c.valeur} manches : ${c.n} parties`,
    }, h('span', String(c.valeur))))),
    h('div.histo-legende', h('span', 'manches'), h('span', '')),
  );
}

function campagneCSV(r) {
  const l = [];
  l.push('indicateur;valeur');
  l.push(`parties;${r.nbParties}`);
  l.push(`graine;${r.graine}`);
  l.push(`duree_moyenne_s;${Math.round(r.duree.moyenneMs / 1000)}`);
  l.push(`duree_mediane_s;${Math.round(r.duree.medianeMs / 1000)}`);
  l.push(`manches_moyennes;${r.manches.moyenne.toFixed(2)}`);
  l.push(`duree_manche_moyenne_s;${Math.round(r.dureeManche.moyenneMs / 1000)}`);
  l.push(`collisions_par_partie;${r.collisions.parPartie.toFixed(2)}`);
  l.push(`collisions_taux_reussite;${r.collisions.taux.toFixed(3)}`);
  l.push(`lancers_par_partie;${r.totaux.lancersParPartie.toFixed(1)}`);
  l.push('');
  l.push('equipe;victoires;taux');
  for (const [id, n] of Object.entries(r.victoires)) l.push(`${id};${n};${(n / r.nbParties).toFixed(3)}`);
  l.push('');
  l.push('siege;equipe;victoires;jetons_par_partie;touches_par_partie');
  for (const s of r.parSiege) {
    l.push(`${s.siege + 1};${s.equipe};${(s.victoires / r.nbParties).toFixed(3)};`
      + `${(s.jetons / r.nbParties).toFixed(2)};${(s.touches / r.nbParties).toFixed(2)}`);
  }
  l.push('');
  l.push('combinaison;total;par_partie');
  for (const [id, n] of Object.entries(r.combos)) l.push(`${id};${n};${(n / r.nbParties).toFixed(2)}`);
  l.push('');
  l.push('carte;manches;duree_moyenne_s');
  for (const c of r.parCarte) {
    l.push(`${c.nom};${c.jouee};${Math.round(c.dureeTotale / Math.max(1, c.jouee) / 1000)}`);
  }
  return l.join('\n');
}

// ── Onglet Probabilités ──────────────────────────────────────────────────────
function ongletProbas(rafraichir) {
  const cfg = etat.cfg;
  const loi = loiDuDe(cfg.faces);
  const bloquant = cfg.symboleBloquant || 'x';
  const seuil = cfg.combos.find((c) => c.id === 'blocage')?.requis?.[bloquant] ?? 2;
  // Les combinaisons obligatoires mettent aussi fin à la possession du lot.
  const arretsForces = cfg.combos
    .filter((c) => c.obligatoire && c.id !== 'blocage')
    .map((c) => ({ id: c.id, requis: c.requis }));
  const optsBase = { bloquant, seuilBloquant: seuil, arretsForces };
  const symbolesPresents = ORDRE_SYMBOLES.filter((s) => loi[s]);

  const lignes = [
    ...cfg.combos.filter((c) => c.id !== 'blocage').map((c) => ({
      nom: c.nom, requis: c.requis, source: 'tornade', estArretForce: !!c.obligatoire,
    })),
    ...CARTES_TORNADE.filter((c) => c.combo).map((c) => ({
      nom: c.court,
      requis: (cfg.combosCartes && cfg.combosCartes[c.combo.id]) || c.combo.requis,
      source: 'journee',
    })),
  ].map((l) => {
    const opts = {
      ...optsBase,
      prioritaire: l.source === 'journee',
      estArretForce: !!l.estArretForce,
    };
    const exact = courseCombinaison(cfg.faces, cfg.desParLot, l.requis, opts);
    const garde = courseAvecGarde(cfg.faces, cfg.desParLot, l.requis, opts, 20000);
    return { ...l, ...exact, garde };
  });

  const ePerte = esperanceAvantPerte(cfg.faces, cfg.desParLot, optsBase);
  // Lot perdu d'emblée : assez de symboles bloquants dès le premier jet.
  const binBloquant = loiBinomiale(cfg.faces, cfg.desParLot, bloquant);
  const pPerte1 = binBloquant.slice(seuil).reduce((a, b) => a + b, 0);

  return h('div',
    h('div.carte',
      h('div.rangee',
        h('div', { style: { flex: '1' } },
          h('div.titre-section', { style: { margin: 0 } }, 'Dé courant'),
          h('div.petit.muted', `${cfg.faces.length} faces · ${cfg.desParLot} dés par lot · `
            + `lot perdu à ${seuil} ${(SYMBOLES[bloquant] || {}).nom || bloquant}`
            + (arretsForces.length
              ? ` · ${arretsForces.map((a) => Object.entries(a.requis)
                  .map(([sy, n]) => `${n} ${(SYMBOLES[sy] || {}).nom || sy}`).join(' + ')).join(', ')} force le passage`
              : ''))),
        h('button.btn.btn--petit', { onclick: () => { etat.onglet = 'simulation'; rafraichir(); } },
          'Modifier les dés'),
      ),
      h('div.faces-edit', { style: { marginTop: '14px' } },
        ...cfg.faces.map((f) => h('div.face-case', pastilleSymbole(f, 34),
          h('span.mini.muted', NOM_SYM[f]))),
      ),
      h('table.tbl', { style: { marginTop: '16px' } },
        h('thead', h('tr', h('th', 'Symbole'), h('th.num', 'Faces'), h('th.num', 'P(un dé)'),
          ...Array.from({ length: cfg.desParLot + 1 }, (_, k) => h('th.num', `exactement ${k}`)))),
        h('tbody', ...symbolesPresents.map((s) => {
          const bin = loiBinomiale(cfg.faces, cfg.desParLot, s);
          return h('tr',
            h('td', h('div.rangee.rangee--serree', pastilleSymbole(s, 18), NOM_SYM[s])),
            h('td.num', cfg.faces.filter((f) => f === s).length),
            h('td.num', pourcent(loi[s], 1)),
            ...bin.map((p) => h('td.num', pourcent(p, 1))),
          );
        })),
      ),
    ),

    h('div.grille.grille--3', { style: { marginTop: '16px' } },
      stat(nombre(ePerte, 2), 'lancers avant de perdre le lot',
        'en relançant tout, sans jamais s’arrêter'),
      stat(pourcent(pPerte1, 1), 'lot perdu dès le 1er lancer',
        `${seuil} ${(SYMBOLES[bloquant] || {}).nom || bloquant} d’un coup`),
      stat(nombre(ePerte * ((cfg.dureeLancer + cfg.tempsReflexion) / 1000), 1) + ' s', 'temps moyen avec un lot',
        `à ${cfg.dureeLancer + cfg.tempsReflexion} ms par cycle de lancer`),
    ),

    h('div.carte', { style: { marginTop: '16px' } },
      h('div.titre-section', 'Chances de chaque combinaison'),
      h('table.tbl',
        h('thead', h('tr',
          h('th', 'Combinaison'), h('th', 'Exigence'),
          h('th.num', 'Au 1er lancer'), h('th.num', 'En relançant tout'),
          h('th.num', 'En gardant les dés'), h('th.num', 'Lancers si réussie'),
          h('th.num', 'Temps si réussie'))),
        h('tbody', ...lignes.map((l) => h('tr',
          h('td', l.nom, l.source === 'journee'
            ? h('span.badge', { style: { marginLeft: '6px' } }, 'carte') : null),
          h('td', h('div.rangee.rangee--serree', suiteSymboles(l.requis, 17))),
          h('td.num', pourcent(l.premierLancer, 2)),
          h('td.num', pourcent(l.reussite, 1)),
          h('td.num', h('strong', pourcent(l.garde.reussite, 1))),
          h('td.num', nombre(l.garde.lancersSiReussite, 2)),
          h('td.num', `${nombre(l.garde.lancersSiReussite * (cfg.dureeLancer + cfg.tempsReflexion) / 1000, 1)} s`),
        ))),
      ),
      h('div.encart', { style: { marginTop: '14px' } },
        'Ces deux colonnes donnent la probabilité de servir la combinaison avant de perdre le lot — '
        + `${seuil} ${(SYMBOLES[bloquant] || {}).nom || bloquant} qui se figent, ou une combinaison `
        + 'obligatoire qui force le passage. « En relançant tout » est le calcul exact ; '
        + '« en gardant les dés » estime par tirages la vraie façon de jouer, en conservant les dés '
        + 'utiles d’un jet à l’autre. L’écart entre les deux mesure ce que rapporte la relance choisie.'),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'Les combinaisons de cartes Tornade l’emportent sur les combinaisons obligatoires au même '
        + 'lancer : c’est ce qui rend « Journée de la chance » (quatre éclairs) atteignable.'),
    ),

    h('div.carte', { style: { marginTop: '16px' } },
      h('div.titre-section', 'Réussite au fil des lancers'),
      h('p.petit.muted', 'Probabilité cumulée de servir la combinaison après n lancers en relançant '
        + 'tout, en tenant compte du risque de perdre le lot.'),
      h('table.tbl',
        h('thead', h('tr', h('th', 'Combinaison'),
          ...[1, 2, 3, 4, 5, 6, 8, 10].map((n) => h('th.num', `${n}`)))),
        h('tbody', ...lignes.map((l) => {
          const cum = [];
          let s = 0;
          for (let i = 0; i < 12; i++) { s += l.parLancer[i] || 0; cum.push(s); }
          return h('tr', h('td', l.nom),
            ...[1, 2, 3, 4, 5, 6, 8, 10].map((n) => h('td.num', pourcent(cum[n - 1] || 0, 1))));
        })),
      ),
    ),
  );
}

// ── Onglet Règles chiffrées ──────────────────────────────────────────────────
function ongletRegles() {
  const cfg = etat.cfg;
  return h('div',
    h('div.carte',
      h('div.titre-section', 'Tableau de mise en place'),
      h('table.tbl',
        h('thead', h('tr', h('th.num', 'Joueurs'), h('th.num', 'Lots de dés'),
          h('th.num', 'Jetons par équipe'), h('th.num', 'Jetons du Vert'),
          h('th.num', 'Cartes pour gagner'), h('th', ''))),
        h('tbody', ...[3, 4, 5, 6, 7, 8, 9].map((n) => {
          const m = infosMiseEnPlace(n);
          return h('tr',
            h('td.num', n), h('td.num', m.lots), h('td.num', m.jetons),
            h('td.num', n % 2 ? m.jetonsVert : '—'), h('td.num', m.cartes),
            h('td.mini.muted', m.extrapole ? 'extrapolé' : ''));
        })),
      ),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        'Le tableau des règles V4.5 s’arrête à 8 joueurs ; la ligne à 9 est une extrapolation, '
        + 'modifiable dans l’onglet Simulation.'),
    ),

    h('div.carte', { style: { marginTop: '16px' } },
      h('div.titre-section', 'Cartes Tornade'),
      h('table.tbl',
        h('thead', h('tr', h('th', 'Carte'), h('th', 'Combinaison'), h('th', 'Effet'))),
        h('tbody', ...CARTES_TORNADE.map((c) => h('tr',
          h('td', { style: { fontWeight: '700' } }, c.nom),
          h('td', c.combo
            ? h('div.rangee.rangee--serree',
                suiteSymboles((cfg.combosCartes && cfg.combosCartes[c.combo.id]) || c.combo.requis, 18))
            : h('span.mini.muted', 'effet permanent')),
          h('td.petit', c.texte,
            noteCarteMode(c, cfg) ? h('div.mini.muted', noteCarteMode(c, cfg)) : null),
        ))),
      ),
    ),
  );
}
