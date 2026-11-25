// Écran d'accueil : qui joue, et de quoi lancer la partie. Les réglages de la
// partie se font tous dans la page Réglages.

import { h, remplacer } from './dom.js?v=2.16';
import { store } from './store.js?v=2.16';
import { aller } from './app.js?v=2.16';
import { eveillerSons } from './sons.js?v=2.16';
import { lancerPartie, partieEnCours } from './table.js?v=2.16';
import {
  configPartie, nombresJoueursPermis, joueursDansBornes, ecartsAuxOfficielles, nomParDefaut, graineDePartie,
} from './reglages.js?v=2.16';
import { placement, PROFILS_IA, profilIA, EQUIPES } from '../core/config.js?v=2.16';
import { emblemeEquipe } from './icons.js?v=2.16';
import { ID_OFFICIELLES, selectionnerProfil } from './profils.js?v=2.16';
import { PERSONNAGES, personnage, themeActuel } from '../core/themes.js?v=2.16';

export function reglagesJoueurs(nb) {
  const enregistres = store.get('joueurs', null);
  const sieges = placement(nb);
  const out = [];
  for (let i = 0; i < nb; i++) {
    const s = (enregistres && enregistres[i]) || {};
    // Un nom changé ici reste le sien ; sinon la place prend le nom réglé.
    const defaut = nomParDefaut(i);
    const perso = s.nomPerso === true;
    out.push({
      nom: perso && s.nom ? s.nom : defaut,
      nomPerso: perso && !!s.nom,
      type: s.type || (i === 0 ? 'humain' : 'ia'),
      profil: profilIA(s.profil).id,
      equipe: sieges[i],
      perso: s.perso || null,
    });
  }
  return out;
}

export function vueAccueil() {
  let nb = joueursDansBornes(store.get('nbJoueurs', 6));
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
    lancerPartie(configPartie(nb), joueurs, graineDePartie());
    aller('/table');
  }

  function dessiner() {
    const sieges = placement(nb);
    joueurs.forEach((j, i) => { j.equipe = sieges[i]; });
    // Thème Engins : chacun incarne un personnage de son équipe. Sans choix (ou
    // après un changement d'équipe), il prend celui de son rang dans l'équipe.
    const rangs = {};
    for (const j of joueurs) {
      const rang = (rangs[j.equipe] = (rangs[j.equipe] ?? -1) + 1);
      if (!(PERSONNAGES[j.equipe] || []).some((p) => p.id === j.perso)) j.perso = personnage(j.equipe, null, rang).id;
    }
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
            + 'chacun lance depuis son propre panneau, en bas de la table (Espace, A et K au clavier).')
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
          title: 'Passer sur le réglage « Règles officielles »',
          onclick: () => { selectionnerProfil(ID_OFFICIELLES); dessiner(); },
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
    const cfg = configPartie(nb);
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
      h('div.lignes-joueurs',
        ...joueurs.map((j) => ligneJoueur(j)),
      ),
      h('div.encart', { style: { marginTop: '16px' } },
        `À ${nb} joueurs : ${cfg.lots} lots de ${cfg.desParLot} dés · `
        + `${cfg.jetons} Jetons Équipe par équipe sur la Tornade`
        + (nb % 2 && cfg.jetonsVert !== cfg.jetons ? ` (${EQUIPES.vert.un} : ${cfg.jetonsVert}) · ` : ' · ')
        + `${cfg.cartesPourGagner} cartes Tornade pour gagner`
        + (nb % 2 && cfg.cartesVert !== cfg.cartesPourGagner ? ` (${EQUIPES.vert.un} : ${cfg.cartesVert}).` : '.')),
    );
  }

  function ligneJoueur(j) {
    const eq = EQUIPES[j.equipe];
    const engins = themeActuel() === 'engins';
    // Une grille aux colonnes fixes : toutes les lignes s'alignent, quel que soit le choix fait.
    return h('div.ligne-joueur', { class: engins ? 'ligne-joueur--perso' : '', style: { '--couleur-eq': eq.hex } },
      // Le jeton de l'équipe dit à lui seul dans quel camp on joue.
      h('span.ligne-joueur-jeton', { title: eq.animal }, emblemeEquipe(eq.embleme, 30)),
      h('input', {
        type: 'text', value: j.nom, 'aria-label': 'Nom du joueur',
        oninput: (e) => {
          const i = joueurs.indexOf(j);
          const defaut = nomParDefaut(i);
          const x = e.target.value.trim();
          j.nom = x || defaut;
          j.nomPerso = !!x && x !== defaut;
        },
      }),
      h('select', {
        'aria-label': 'Qui joue cette place',
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
      engins ? choixPersonnage(j) : null,
    );
  }

  function choixPersonnage(j) {
    const liste = PERSONNAGES[j.equipe] || [];
    if (liste.length < 2) return h('span.perso-fixe', { title: liste[0] ? liste[0].titre : '' }, liste[0] ? liste[0].nom : '');
    const choisi = liste.find((p) => p.id === j.perso);
    return h('select.choix-perso', {
      'aria-label': 'Personnage incarné', title: choisi ? `${choisi.nom}, ${choisi.titre}` : '',
      onchange: (e) => { j.perso = e.target.value; sauver(); dessiner(); },
    }, ...liste.map((p) => h('option', { value: p.id, selected: p.id === j.perso }, p.nom)));
  }

  dessiner();
  return racine;
}
