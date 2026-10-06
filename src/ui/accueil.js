// Écran d'accueil : qui joue, et de quoi lancer la partie. Les réglages de la
// partie se font tous dans la page Réglages.

import { h, remplacer } from './dom.js?v=1.91';
import { store } from './store.js?v=1.91';
import { aller } from './app.js?v=1.91';
import { eveillerSons } from './sons.js?v=1.91';
import { lancerPartie, partieEnCours } from './table.js?v=1.91';
import {
  construireConfig, variables, nombresJoueursPermis, joueursDansBornes,
  ecartsAuxOfficielles, nomParDefaut, NOMS_ORIGINE,
} from './variables.js?v=1.91';
import {
  infosMiseEnPlace, placement, PROFILS_IA, profilIA, COULEURS_EQUIPE,
  bornerJoueurs,
} from '../core/config.js?v=1.91';
import { emblemeEquipe } from './icons.js?v=1.91';
import { randomSeed } from '../core/rng.js?v=1.91';
import { ID_OFFICIELLES, selectionnerProfil, retablirIntegre } from './profils.js?v=1.91';

export function reglagesJoueurs(nb) {
  const enregistres = store.get('joueurs', null);
  const sieges = placement(nb);
  const out = [];
  for (let i = 0; i < nb; i++) {
    const s = (enregistres && enregistres[i]) || {};
    // Un nom changé ici reste le sien ; sinon la place prend le nom réglé. Un
    // enregistrement d'avant la v1.86 n'a pas la marque : un nom qui n'est pas
    // celui d'origine de sa place a forcément été choisi.
    const defaut = nomParDefaut(i);
    const perso = s.nomPerso === true
      || (s.nomPerso === undefined && !!s.nom && s.nom !== NOMS_ORIGINE[i]);
    out.push({
      nom: perso && s.nom ? s.nom : defaut,
      nomPerso: perso && !!s.nom,
      type: s.type || (i === 0 ? 'humain' : 'ia'),
      profil: profilIA(s.profil).id,
      equipe: sieges[i],
    });
  }
  return out;
}

export function vueAccueil() {
  // Une table enregistree a neuf joueurs date d'avant la v1.49 : on la ramene
  // dans les bornes plutot que de proposer un effectif qui n'existe plus.
  // Et la ramène dans les bornes réglées : de combien à combien de joueurs.
  let nb = joueursDansBornes(bornerJoueurs(store.get('nbJoueurs', 6)));
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
      h('h1.titre-jeu', h('img', {
        src: 'assets/logo-tornadice.png', alt: 'TornaDice', width: 539, height: 376,
      })),
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

      bandeauOfficielles(),

      // Les réglages de la partie se font tous dans la page Réglages : l'accueil
      // ne compose plus que la table.
      h('div.accueil-joueurs', carteJoueurs()),

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

  // Le bandeau des Règles officielles : il ne se montre que quand la partie
  // qu'on s'apprête à lancer s'en écarte, et dit en quoi.
  function bandeauOfficielles() {
    const ecarts = ecartsAuxOfficielles(nb);
    if (!ecarts.length) return null;
    const montres = ecarts.slice(0, 6);
    return h('div.encart.encart--officielles',
      h('div.rangee',
        h('strong.encart-titre', 'Attention, vous ne jouez pas avec les règles officielles !'),
        h('div.pousse'),
        h('button.btn.btn--petit', {
          title: 'Passer sur le réglage « Règles officielles », tel qu’il a été validé',
          onclick: () => { retablirIntegre(ID_OFFICIELLES); selectionnerProfil(ID_OFFICIELLES); dessiner(); },
        }, 'Jouer avec les règles officielles'),
      ),
      h('ul.ecarts-officielles', ...montres.map((e) => h('li',
        h('strong', e.libelle), ` : ${e.jouee} `, h('span.muted', `(officiel : ${e.officielle})`)))),
      ecarts.length > montres.length
        ? h('div.mini.muted', `… et ${ecarts.length - montres.length} autre${ecarts.length - montres.length > 1 ? 's' : ''} écart${ecarts.length - montres.length > 1 ? 's' : ''}, détaillés dans les Réglages.`)
        : null,
    );
  }

  function carteJoueurs() {
    const mep = infosMiseEnPlace(nb);
    return h('div.carte.carte-joueurs',
      h('div.titre-section', 'Joueurs'),
      h('div.rangee', { style: { marginBottom: '16px' } },
        h('div.segment', ...nombresJoueursPermis().map((n) => h('button', {
          class: n === nb ? 'on' : '',
          // Les noms et les rôles déjà saisis sont gardés : on les enregistre
          // avant de recomposer la table à son nouvel effectif.
          onclick: () => { sauver(); nb = n; joueurs = reglagesJoueurs(n); dessiner(); },
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
),
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
        oninput: (e) => {
          const i = joueurs.indexOf(j);
          const defaut = nomParDefaut(i);
          const x = e.target.value.trim();
          j.nom = x || defaut;
          j.nomPerso = !!x && x !== defaut;
        },
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
      h('span.badge.badge--joueur', { class: `badge--${j.equipe}` },
        emblemeEquipe(eq.embleme, 20), eq.emblemeNom),
    );
  }

  /**
   * Les réglages de la partie, modifiables ici même. Ce qui décide de la forme
   * d'une partie — le mode, les lots, les cartes — n'a pas à faire changer de
   * page : on le règle, on lance. La page Réglages garde le reste.
   */


  dessiner();
  return racine;
}
