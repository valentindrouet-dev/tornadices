// Écran d'accueil : composition de la table et lancement d'une partie.

import { h, remplacer } from './dom.js';
import { store } from './store.js';
import { aller } from './app.js';
import { lancerPartie, partieEnCours } from './table.js';
import {
  configParDefaut, infosMiseEnPlace, placement, PROFILS_IA, COULEURS_EQUIPE,
  CARTES_JOURNEE, ORDRE_SYMBOLES, SYMBOLES, PRESETS_FACES, FACES_PAR_DEFAUT,
} from '../core/config.js';
import { pastilleSymbole } from './icons.js';
import { randomSeed } from '../core/rng.js';

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
      profil: s.profil || 'equilibre',
      equipe: sieges[i],
    });
  }
  return out;
}

export function vueAccueil() {
  let nb = store.get('nbJoueurs', 6);
  let joueurs = reglagesJoueurs(nb);
  let graineManuelle = store.get('graineManuelle', false);
  let graine = store.get('graine', randomSeed());
  let cartes = store.get('cartes', CARTES_JOURNEE.map((c) => c.id));
  let melanger = store.get('melangerCartes', true);
  let faces = store.get('faces', null) || FACES_PAR_DEFAUT.slice();

  const racine = h('div.page');

  function sauver() {
    store.set('nbJoueurs', nb);
    store.set('joueurs', joueurs);
    store.set('graineManuelle', graineManuelle);
    store.set('graine', graine);
    store.set('cartes', cartes);
    store.set('melangerCartes', melanger);
    store.set('faces', faces);
  }

  function demarrer() {
    sauver();
    const cfg = configParDefaut(nb);
    cfg.cartes = cartes;
    cfg.melangerCartes = melanger;
    cfg.faces = faces.slice();
    lancerPartie(cfg, joueurs, graineManuelle ? graine : randomSeed());
    aller('/table');
  }

  function dessiner() {
    const mep = infosMiseEnPlace(nb);
    const sieges = placement(nb);
    joueurs.forEach((j, i) => { j.equipe = sieges[i]; });
    const nbHumains = joueurs.filter((j) => j.type === 'humain').length;

    remplacer(racine,
      h('h1.titre-jeu', ...titreColore('TORNADICES')),
      h('p', { style: { textAlign: 'center', color: 'var(--gris)', marginBottom: '4px' } },
        'Jeu de dés, de rapidité et de stop ou encore — 3 à 9 joueurs'),
      h('p.petit', { style: { textAlign: 'center', color: 'var(--gris-clair)', marginBottom: '22px' } },
        'Table de jeu virtuelle et laboratoire d’équilibrage'),

      partieEnCours()
        ? h('div', { style: { textAlign: 'center', marginBottom: '24px' } },
            h('button.btn.btn--primaire.btn--grand', { onclick: () => aller('/table') },
              '▸ Reprendre la partie en cours'))
        : null,

      h('div.grille.grille--2',
        carteJoueurs(),
        carteOptions(),
      ),

      h('div', { style: { textAlign: 'center', marginTop: '26px' }, class: 'rangee', },
        h('div', { style: { flex: '1' } }),
        h('button.btn.btn--primaire.btn--grand', { onclick: demarrer }, 'Commencer la partie'),
        h('button.btn.btn--grand', { onclick: () => { sauver(); aller('/labo'); } },
          'Laboratoire d’équilibrage'),
        h('div', { style: { flex: '1' } }),
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
    return h('div.carte',
      h('div.titre-section', 'Joueurs'),
      h('div.rangee', { style: { marginBottom: '16px' } },
        h('div.segment', ...[3, 4, 5, 6, 7, 8, 9].map((n) => h('button', {
          class: n === nb ? 'on' : '',
          onclick: () => { nb = n; joueurs = reglagesJoueurs(n); dessiner(); },
        }, String(n)))),
        h('span.petit.muted', `${nb} joueurs`),
      ),

      h('div', { style: { display: 'grid', gap: '8px' } },
        ...joueurs.map((j, i) => ligneJoueur(j, i)),
      ),

      h('div.encart', { style: { marginTop: '16px' } },
        `Mise en place à ${nb} : ${mep.lots} lots de ${configParDefaut(nb).desParLot} dés · `
        + `${mep.jetons} jetons par équipe${nb % 2 ? ` (Vert : ${mep.jetonsVert})` : ''} · `
        + `${mep.cartes} cartes Journée pour gagner.`
        + (mep.extrapole ? ' — valeurs extrapolées, le tableau officiel s’arrête à 8 joueurs.' : '')),
    );
  }

  function ligneJoueur(j, i) {
    const eq = COULEURS_EQUIPE[j.equipe];
    return h('div.rangee.rangee--serree', { style: { flexWrap: 'nowrap' } },
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

  function carteOptions() {
    return h('div.carte',
      h('div.titre-section', 'Options de partie'),

      h('div.rangee', { style: { marginBottom: '14px' } },
        chip('Graine manuelle', graineManuelle, () => { graineManuelle = !graineManuelle; dessiner(); }),
        graineManuelle
          ? h('input', {
              type: 'text', value: graine, style: { width: '150px' },
              oninput: (e) => { graine = e.target.value; },
            })
          : h('span.petit.muted', 'Chaque partie tire une graine au hasard.'),
        chip('Mélanger les cartes', melanger, () => { melanger = !melanger; dessiner(); }),
      ),

      h('div.titre-section', { style: { marginTop: '16px' } }, 'Faces des dés'),
      h('div.faces-edit',
        ...faces.map((f, i) => h('div.face-case',
          pastilleSymbole(f, 34),
          h('select', {
            onchange: (e) => { faces[i] = e.target.value; dessiner(); },
          }, ...ORDRE_SYMBOLES.map((sy) => h('option', {
            value: sy, selected: sy === f,
          }, SYMBOLES[sy].nom))),
        )),
      ),
      h('div.rangee.rangee--serree', { style: { marginTop: '10px' } },
        h('span.mini.muted', 'Modèles :'),
        ...PRESETS_FACES.map((p) => h('button.btn.btn--petit', {
          onclick: () => { faces = p.faces.slice(); dessiner(); },
        }, p.nom)),
        h('button.btn.btn--petit', {
          onclick: () => {
            faces = [...faces, 'vide'].slice(0, 12);
            dessiner();
          },
        }, '+ face'),
        faces.length > 2
          ? h('button.btn.btn--petit', {
              onclick: () => { faces = faces.slice(0, -1); dessiner(); },
            }, '− face')
          : null,
      ),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        'Un dé porte 2 tornades, 1 X, 1 ZzZ, 1 vache et 1 éclair. '
        + 'Le X fige le dé : il ne se relance jamais.'),

      h('div.titre-section', { style: { marginTop: '16px' } }, 'Cartes Journée en jeu'),
      h('div.rangee.rangee--serree',
        ...CARTES_JOURNEE.map((c) => chip(
          c.court,
          cartes.includes(c.id),
          () => {
            cartes = cartes.includes(c.id) ? cartes.filter((x) => x !== c.id) : [...cartes, c.id];
            dessiner();
          },
          c.texte,
        )),
      ),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'La pile démarre toujours par « Jour de chauffe » si elle est cochée ; le reste est mélangé. '
        + 'Une partie s’arrête quand une équipe a remporté le nombre de cartes requis.'),
    );
  }

  function chip(libelle, actif, onclick, titre) {
    return h('button', {
      class: `chip${actif ? ' on' : ''}`, onclick, title: titre || '',
    }, h('span.case', '✓'), libelle);
  }

  dessiner();
  return racine;
}
