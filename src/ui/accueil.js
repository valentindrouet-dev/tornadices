// Écran d'accueil : qui joue, et rien d'autre. Tout le reste est dans Variables.

import { h, remplacer } from './dom.js?v=1.24';
import { store } from './store.js?v=1.24';
import { aller } from './app.js?v=1.24';
import { lancerPartie, partieEnCours } from './table.js?v=1.24';
import { construireConfig, variables } from './variables.js?v=1.24';
import {
  infosMiseEnPlace, placement, PROFILS_IA, profilIA, COULEURS_EQUIPE, SYMBOLES,
} from '../core/config.js?v=1.24';
import { pastilleSymbole } from './icons.js?v=1.24';
import { randomSeed } from '../core/rng.js?v=1.24';

const NOMS = [
  'Alex', 'Camille', 'Sacha', 'Louise', 'Noé', 'Jade', 'Tom', 'Anna', 'Milo',
];

// Les couleurs du titre sont celles des équipes : bleu et jaune en alternance,
// et les deux lettres du centre en vert, comme le joueur solo au milieu de la table.
function titreColore(mot) {
  const lettres = mot.split('');
  const gauche = Math.floor((lettres.length - 2) / 2);
  return lettres.map((c, i) => {
    const vert = i === gauche || i === gauche + 1;
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
      h('h1.titre-jeu', ...titreColore('TORNADICES')),
      h('p', { style: { textAlign: 'center', color: 'var(--gris)', marginBottom: '2px' } },
        'Un jeu de Sylvain Bonnafous'),
      h('p', { style: { textAlign: 'center', color: 'var(--gris)', marginBottom: '22px' } },
        'Édité par Big Budi Games'),

      partieEnCours()
        ? h('div', { style: { textAlign: 'center', marginBottom: '24px' } },
            h('button.btn.btn--primaire.btn--grand', { onclick: () => aller('/table') },
              '▸ Reprendre la partie en cours'))
        : null,

      h('div.grille.grille--2', carteJoueurs(), carteApercu()),

      h('div.rangee.actions-accueil', { style: { justifyContent: 'center', marginTop: '26px' } },
        h('button.btn.btn--primaire.btn--grand', { onclick: demarrer }, 'Commencer la partie'),
        h('button.btn.btn--grand', { onclick: () => { sauver(); aller('/variables'); } },
          'Variables'),
        h('button.btn.btn--grand', { onclick: () => { sauver(); aller('/labo'); } },
          'Laboratoire d’équilibrage'),
      ),

      nbHumains > 1
        ? h('div.encart.encart--info', { style: { marginTop: '18px' } },
            `${nbHumains} joueurs humains partagent le même écran. TornaDices se joue en simultané : `
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
        + `${mep.cartes} cartes Journée pour gagner.`
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
      h('span.badge', { class: `badge--${j.equipe}` }, eq.nom),
    );
  }

  /** Aperçu en lecture seule de ce qui est réglé dans Variables. */
  function carteApercu() {
    const cfg = construireConfig(nb);
    const compte = {};
    for (const f of cfg.faces) compte[f] = (compte[f] || 0) + 1;

    return h('div.carte.carte-apercu',
      h('div.rangee', { style: { marginBottom: '14px' } },
        h('div.titre-section', { style: { margin: 0, flex: '1' } }, 'Variables de la partie'),
        h('button.btn.btn--petit', { onclick: () => { sauver(); aller('/variables'); } }, 'Modifier'),
      ),
      h('div.rangee.rangee--serree', { style: { marginBottom: '12px' } },
        ...cfg.faces.map((f) => pastilleSymbole(f, 34)),
      ),
      h('div.petit.muted', { style: { marginBottom: '14px' } },
        Object.entries(compte)
          .map(([sym, n]) => `${n} ${SYMBOLES[sym]?.nom || sym}`)
          .join(' · ')
        + ` — ${cfg.desParLot} dés par lot`),
      h('table.tbl',
        h('tbody',
          ligneApercu('Lancer / constat / passage',
            `${cfg.dureeLancer} · ${cfg.dureeConstat} · ${cfg.dureePassage} ms`),
          ligneApercu('Lots en jeu', cfg.lots),
          ligneApercu('Jetons par équipe',
            `${cfg.jetons}${nb % 2 ? ` (Vert ${cfg.jetonsVert})` : ''}`),
          ligneApercu('Cartes pour gagner', cfg.cartesPourGagner),
          ligneApercu('Cartes Journée en jeu', `${cfg.cartes.length} sur 12`),
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
