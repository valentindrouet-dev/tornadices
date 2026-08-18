// Écran d'accueil : qui joue, et de quoi lancer une partie sans changer de page —
// le mode de jeu, les lots, les cartes. Les réglages fins restent dans Réglages.

import { h, remplacer } from './dom.js?v=1.40';
import { store } from './store.js?v=1.40';
import { aller } from './app.js?v=1.40';
import { eveillerSons } from './sons.js?v=1.40';
import { lancerPartie, partieEnCours } from './table.js?v=1.40';
import { construireConfig, variables } from './variables.js?v=1.40';
import {
  infosMiseEnPlace, placement, PROFILS_IA, profilIA, COULEURS_EQUIPE,
  OPTIONS_MANCHE, cartesDuMode, cartesEnJeu,
} from '../core/config.js?v=1.40';
import { nomSymbole } from './apparence.js?v=1.40';
import { pastilleSymbole, emblemeEquipe } from './icons.js?v=1.40';
import { randomSeed } from '../core/rng.js?v=1.40';

const NOMS = [
  'Alex', 'Camille', 'Sacha', 'Louise', 'Noé', 'Jade', 'Tom', 'Anna', 'Milo',
];

/** Les valeurs qui décrochent du tableau officiel dès qu'on y touche. */
const CHAMPS_TABLEAU = ['lots', 'jetons', 'jetonsVert', 'cartesPourGagner'];

/** Écrit un réglage de partie, comme le ferait la page Réglages. */
function ecrireReglage(cle, valeur) {
  const v = store.get('variables', {});
  v[cle] = valeur;
  store.set('variables', v);
}

// Les couleurs du titre sont celles des équipes : bleu et jaune en alternance,
// et les deux lettres du centre en vert, comme le joueur solo au milieu de la table.
// Bleu et jaune alternent d'un bout à l'autre — les deux équipes — et le centre
// du mot revient au Vert, seul au milieu : une lettre quand le mot en compte un
// nombre impair, deux quand il en compte un nombre pair.
function titreColore(mot) {
  const lettres = mot.split('');
  const milieu = (lettres.length - 1) / 2;
  return lettres.map((c, i) => {
    const vert = Math.abs(i - milieu) < 0.6;
    const classe = vert ? 'l-vert' : (i % 2 === 0 ? 'l-bleu' : 'l-jaune');
    return h('span', { class: classe }, c);
  });
}

export function reglagesJoueurs(nb) {
  const enregistres = store.get('joueurs', null);
  const sieges = placement(nb);
  const out = [];
  for (let i = 0; i < nb; i++) {
    const s = (enregistres && enregistres[i]) || {};
    out.push({
      nom: s.nom || NOMS[i] || `Joueur ${i + 1}`,
      type: s.type || (i === 0 ? 'humain' : 'ia'),
      profil: profilIA(s.profil).id,
      equipe: sieges[i],
    });
  }
  return out;
}

export function vueAccueil() {
  let nb = store.get('nbJoueurs', 6);
  let joueurs = reglagesJoueurs(nb);

  const racine = h('div.page.page-accueil');

  function sauver() {
    store.set('nbJoueurs', nb);
    store.set('joueurs', joueurs);
  }

  function demarrer() {
    sauver();
    // Les navigateurs refusent d'ouvrir le son tant qu'on n'a rien cliqué : ce
    // bouton est le geste qu'il leur faut.
    eveillerSons();
    const v = variables();
    lancerPartie(
      construireConfig(nb), joueurs,
      v.graineManuelle ? (v.graine || randomSeed()) : randomSeed(),
    );
    aller('/table');
  }

  function dessiner() {
    const sieges = placement(nb);
    joueurs.forEach((j, i) => { j.equipe = sieges[i]; });
    const nbHumains = joueurs.filter((j) => j.type === 'humain').length;

    remplacer(racine,
      h('h1.titre-jeu', ...titreColore('TORNADICE')),
      // Les deux noms en gras : ce sont eux que l'on vient lire, pas la mention.
      h('p', { style: { textAlign: 'center', color: 'var(--gris)', marginBottom: '2px' } },
        'Un jeu de ', h('strong', 'Sylvain Bonnafous')),
      h('p', { style: { textAlign: 'center', color: 'var(--gris)', marginBottom: '22px' } },
        'Édité par ', h('strong', 'Big Budi Games')),

      partieEnCours()
        ? h('div', { style: { textAlign: 'center', marginBottom: '24px' } },
            h('button.btn.btn--primaire.btn--grand', { onclick: () => aller('/table') },
              '▸ Reprendre la partie en cours'))
        : null,

      h('div.grille.grille--2', carteJoueurs(), carteApercu()),

      h('div.rangee.actions-accueil', { style: { justifyContent: 'center', marginTop: '26px' } },
        h('button.btn.btn--primaire.btn--grand', { onclick: demarrer }, 'Commencer la partie'),
        h('button.btn.btn--grand', { onclick: () => { sauver(); aller('/reglages'); } },
          'Réglages'),
        h('button.btn.btn--grand', { onclick: () => { sauver(); aller('/labo'); } },
          'Laboratoire d’équilibrage'),
      ),

      nbHumains > 1
        ? h('div.encart.encart--info', { style: { marginTop: '18px' } },
            `${nbHumains} joueurs humains partagent le même écran. TornaDice se joue en simultané : `
            + 'chacun agit depuis son propre panneau, en bas de la table. À deux mains sur un clavier '
            + 'cela reste jouable, au-delà mieux vaut confier les autres sièges à des IA.')
        : null,
    );
  }

  function carteJoueurs() {
    const mep = infosMiseEnPlace(nb);
    return h('div.carte.carte-joueurs',
      h('div.titre-section', 'Joueurs'),
      h('div.rangee', { style: { marginBottom: '16px' } },
        h('div.segment', ...[3, 4, 5, 6, 7, 8, 9].map((n) => h('button', {
          class: n === nb ? 'on' : '',
          onclick: () => { nb = n; joueurs = reglagesJoueurs(n); dessiner(); },
        }, String(n)))),
        h('span.petit.muted', `${nb} joueurs`),
      ),
      h('div', { style: { display: 'grid', gap: '8px' } },
        ...joueurs.map((j) => ligneJoueur(j)),
      ),
      h('div.encart', { style: { marginTop: '16px' } },
        `Mise en place à ${nb} : ${mep.lots} lots · `
        + `${mep.jetons} jetons par équipe${nb % 2 ? ` (Vert : ${mep.jetonsVert})` : ''} · `
        + `${mep.cartes} cartes Tornade pour gagner.`
        + (mep.extrapole ? ' — valeurs extrapolées, le tableau officiel s’arrête à 8 joueurs.' : '')),
    );
  }

  function ligneJoueur(j) {
    const eq = COULEURS_EQUIPE[j.equipe];
    return h('div.rangee.rangee--serree.ligne-joueur',
      h('span', {
        title: eq.nom,
        style: {
          width: '13px', height: '13px', borderRadius: '50%', flex: 'none',
          background: eq.hex, boxShadow: `0 0 0 3px ${eq.clair}`,
        },
      }),
      h('input', {
        type: 'text', value: j.nom, style: { flex: '1 1 auto', minWidth: '80px' },
        oninput: (e) => { j.nom = e.target.value; },
      }),
      h('select', {
        onchange: (e) => {
          const v = e.target.value;
          if (v === 'humain') j.type = 'humain';
          else { j.type = 'ia'; j.profil = v; }
          dessiner();
        },
      },
        h('option', { value: 'humain', selected: j.type === 'humain' }, 'Humain'),
        ...Object.values(PROFILS_IA).map((p) => h('option', {
          value: p.id, selected: j.type === 'ia' && j.profil === p.id,
        }, `IA ${p.nom}`)),
      ),
      // L'emblème de l'équipe : les vaches, les poules, le cowboy.
      h('span.badge', { class: `badge--${j.equipe}` },
        emblemeEquipe(eq.embleme, 14), ' ', eq.emblemeNom),
    );
  }

  /**
   * Les réglages de la partie, modifiables ici même. Ce qui décide de la forme
   * d'une partie — le mode, les lots, les cartes — n'a pas à faire changer de
   * page : on le règle, on lance. La page Réglages garde le reste.
   */
  function carteApercu() {
    const cfg = construireConfig(nb);
    const compte = {};
    for (const f of cfg.faces) compte[f] = (compte[f] || 0) + 1;

    const champ = (libelle, valeur, cle, opts = {}) => h('tr',
      h('td.petit', libelle),
      h('td.num', h('input.champ-mini', {
        type: 'number', value: valeur,
        min: opts.min ?? 1, max: opts.max ?? 99, step: 1,
        onchange: (e) => {
          let x = Number(e.target.value);
          if (!isFinite(x)) return;
          x = Math.min(opts.max ?? 99, Math.max(opts.min ?? 1, x));
          ecrireReglage(cle, x);
          // Toucher une valeur de mise en place, c'est quitter le tableau
          // officiel — comme dans les Réglages, sans case à décocher d'abord.
          if (CHAMPS_TABLEAU.includes(cle)) ecrireReglage('suivreTableau', false);
          dessiner();
        },
      })),
    );

    return h('div.carte.carte-apercu',
      h('div.rangee', { style: { marginBottom: '14px' } },
        h('div.titre-section', { style: { margin: 0, flex: '1' } }, 'Réglages de la partie'),
        h('button.btn.btn--petit', { onclick: () => { sauver(); aller('/reglages'); } },
          'Tous les réglages'),
      ),

      // Le mode de jeu se change ici : c'est le réglage qui change le plus la
      // partie, et le plus souvent essayé d'une partie à l'autre.
      h('div.segment', { style: { marginBottom: '14px', width: '100%' } },
        ...OPTIONS_MANCHE.map(([id, lib]) => h('button', {
          class: (cfg.sansPoints ? 'sansPoints' : 'jetons') === id ? 'on' : '',
          style: { flex: '1 1 0', minWidth: '0', fontSize: '12.5px' },
          onclick: () => { ecrireReglage('sansPoints', id === 'sansPoints'); dessiner(); },
        }, lib)),
      ),

      h('div.rangee.rangee--serree', { style: { marginBottom: '12px' } },
        ...cfg.faces.map((f) => pastilleSymbole(f, 34)),
      ),
      h('div.petit.muted', { style: { marginBottom: '14px' } },
        Object.entries(compte)
          .map(([sym, n]) => `${n} ${nomSymbole(sym)}`)
          .join(' · ')
        + ` — ${cfg.desParLot} dés par lot`),
      h('table.tbl',
        h('tbody',
          champ('Dés par lot', cfg.desParLot, 'desParLot', { min: 1, max: 12 }),
          champ('Lots en jeu', cfg.lots, 'lots', { min: 1, max: 9 }),
          cfg.sansPoints
            ? null
            : champ('Jetons par équipe', cfg.jetons, 'jetons', { min: 1, max: 12 }),
          nb % 2 && !cfg.sansPoints
            ? champ('Jetons du Vert', cfg.jetonsVert, 'jetonsVert', { min: 1, max: 12 })
            : null,
          champ('Cartes pour gagner', cfg.cartesPourGagner, 'cartesPourGagner', { min: 1, max: 12 }),
          ligneApercu('Cartes Tornade en jeu',
            `${cartesEnJeu(cfg).length} sur ${cartesDuMode(cfg).length}`),
          ligneApercu('Lancer / constat / passage',
            `${cfg.dureeLancer} · ${cfg.dureeConstat} · ${cfg.dureePassage} ms`),
        ),
      ),
    );
  }

  function ligneApercu(libelle, valeur) {
    return h('tr', h('td.petit', libelle), h('td.num.petit', { style: { fontWeight: '700' } }, valeur));
  }

  dessiner();
  return racine;
}
