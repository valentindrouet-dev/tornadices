// Menu Variables : toutes les options d'une partie, en un seul endroit.
//
// La page ne stocke qu'un jeu de réglages partiels ; `construireConfig` les pose
// par-dessus la configuration par défaut du nombre de joueurs choisi.

import { h, remplacer } from './dom.js?v=1.27';
import { pastilleSymbole } from './icons.js?v=1.27';
import { store } from './store.js?v=1.27';
import { aller } from './app.js?v=1.27';
import { lancerPartie } from './table.js?v=1.27';
import {
  configParDefaut, infosMiseEnPlace, ORDRE_SYMBOLES, SYMBOLES, CARTES_JOURNEE,
  OPTIONS_ATTRAPE, AIDE_ATTRAPE,
  OPTIONS_DECLENCHEUR, AIDE_DECLENCHEUR, FACES_SANS_ECLAIR, FACES_PAR_DEFAUT,
  assainirFaces, assainirRequis, TYPES_DE, facesPourDe, PRESETS_FACES, aideVariance,
} from '../core/config.js?v=1.27';
import { tableauCombos } from './combos.js?v=1.27';
import { randomSeed } from '../core/rng.js?v=1.27';
import { reglagesJoueurs } from './accueil.js?v=1.27';

const CHAMPS_MISE_EN_PLACE = ['lots', 'jetons', 'jetonsVert', 'cartesPourGagner'];

export function variables() {
  return store.get('variables', {});
}

/** Configuration complète d'une partie : défauts du nombre de joueurs + réglages. */
export function construireConfig(nbJoueurs) {
  const v = variables();
  const cfg = configParDefaut(nbJoueurs, {
    echecJokers: v.echecJokers !== false,
    attrapeSur: v.attrapeSur,
    lotsCumules: v.lotsCumules,
  });
  for (const [cle, val] of Object.entries(v)) {
    if (val === undefined || val === null) continue;
    if (cle === 'suivreTableau') continue;
    // `combos` est stocké par identifiant, pas sous la forme d'une liste : il se
    // fusionne plus bas, sans quoi il écraserait les combinaisons du moteur.
    if (cle === 'combos') continue;
    if (v.suivreTableau !== false && CHAMPS_MISE_EN_PLACE.includes(cle)) continue;
    cfg[cle] = Array.isArray(val) ? val.slice() : val;
  }
  // Des réglages enregistrés avant le renommage des faces (v1.3) porteraient
  // encore « cloche » et « étoile » : on les retraduit plutôt que de laisser au
  // dé des symboles que plus rien ne reconnaît.
  cfg.faces = assainirFaces(cfg.faces);
  if (v.combos) {
    cfg.combos = cfg.combos.map((c) => ({
      ...c,
      requis: assainirRequis(v.combos[c.id] || c.requis),
    }));
  }
  if (cfg.combosCartes) {
    cfg.combosCartes = Object.fromEntries(Object.entries(cfg.combosCartes)
      .map(([id, requis]) => [id, assainirRequis(requis)]));
  }
  return cfg;
}

/**
 * Un point d'interrogation au bout d'un titre. Au survol : la première phrase en
 * infobulle. Au clic : toute la description s'installe sous le titre.
 *
 * Les pavés d'explication sous chaque champ finissaient par occuper plus de
 * place que les réglages eux-mêmes, et il fallait dérouler la page entière pour
 * retrouver un bouton. Le texte n'a pas disparu : il attend qu'on le demande.
 */
function titreAide(titre, texte, ...suite) {
  const lignes = Array.isArray(texte) ? texte.filter(Boolean) : [texte];
  const panneau = h('div.aide-texte', ...lignes.map((t) => h('p', t)));
  const bouton = h('button.aide-btn', {
    type: 'button', 'aria-label': `Aide : ${titre}`, 'aria-expanded': 'false',
  }, '?', h('span.aide-bulle', lignes[0]));
  bouton.onclick = () => {
    const ouvert = panneau.classList.toggle('ouvert');
    bouton.classList.toggle('on', ouvert);
    bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  };
  return h('div.entete-reglage',
    h('div.rangee.rangee--serree',
      h('div.titre-section', { style: { margin: 0 } }, titre),
      bouton,
      suite.length ? h('div.pousse') : null,
      ...suite,
    ),
    panneau,
  );
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
        titreAide('Dés', [
          `Le lot compte ${cfg.desParLot} dés, et ${cfg.lots} lots tournent autour de la table`
          + `${suivreTableau ? ` — le tableau officiel en prévoit ${mep.lots} à ${nb} joueurs` : ''}.`,
          'Le d6 est le dé du jeu : 1 tornade, 1 joker, 1 X, 1 ZzZ, 1 vache, 1 éclair. Le X fige '
          + 'son dé — il ne se relance jamais. Le d8 et le d10 reprennent la même série depuis le '
          + 'début, et chaque face reste modifiable une à une.',
          'Le joker prend la face de n’importe quel symbole sauf le X, et valide donc n’importe '
          + 'quelle combinaison. Le joker double, absent des dés au départ, ne remplace que '
          + 'l’éclair et le ZzZ : ajoutez-le ici pour l’essayer.',
        ]),
        h('div.grille.grille--3', { style: { gap: '12px' } },
          num('Dés par lot', cfg.desParLot, 'desParLot', { min: 1, max: 12 }),
          h('label.champ', 'Type de dé',
            h('div.segment', ...TYPES_DE.map((n) => h('button', {
              class: cfg.faces.length === n ? 'on' : '',
              // Changer de dé repart de la répartition officielle étirée sur le
              // nouveau nombre de faces : garder les anciennes en tronquant
              // ferait disparaître des symboles sans le dire.
              onclick: () => { ecrire('faces', facesPourDe(n)); dessiner(); },
            }, `d${n}`))),
          ),
          num('Lots en jeu', cfg.lots, 'lots', { min: 1, max: 9, disabled: suivreTableau }),
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
          h('span.mini.muted', 'Modèles :'),
          ...PRESETS_FACES.map((p) => h('button.btn.btn--petit', {
            onclick: () => { ecrire('faces', facesPourDe(cfg.faces.length, p.faces)); dessiner(); },
          }, p.nom)),
        ),
      ),

      // ── Combinaisons ──────────────────────────────────────────────────────
      h('div.carte',
        titreAide('Combinaisons requises', [
          'Chaque combinaison se lit comme un lot posé sur la table : un menu par dé, « — » pour '
          + 'un dé qu’on ne demande pas.',
          'Toute combinaison servie est jouée d’office : on ne relance jamais par-dessus. Quand '
          + 'le joker en sert plusieurs à la fois, le joueur choisit laquelle.',
          cfg.echecJokers !== false
            ? 'Trois jokers d’un coup valent un échec : le lot part sans rien tenter, et cet '
              + 'échec l’emporte sur les combinaisons que les jokers auraient pu servir. C’est le '
              + 'seul revers du joker — décochez la règle pour jouer sans.'
            : 'Règle des trois jokers désactivée : les jokers n’ont plus aucun revers.',
          'Les lignes bleues sont les combinaisons des cartes Journée : elles ne valent que le '
          + 'temps de la manche où la carte est en jeu.',
        ],
          h('button', {
            class: `chip${cfg.echecJokers !== false ? ' on' : ''}`,
            title: 'Trois jokers d’un coup font partir le lot, comme deux X',
            onclick: () => { ecrire('echecJokers', cfg.echecJokers === false); dessiner(); },
          }, h('span.case', '✓'), 'Trois jokers = échec'),
        ),
        tableauCombos(cfg,
          (id, requis) => ecrire('combos', { ...(v.combos || {}), [id]: requis }),
          (id, requis) => ecrire('combosCartes', { ...(v.combosCartes || {}), [id]: requis }),
          dessiner),

        titreAide('Ce qui déclenche l’attrape', [
          AIDE_DECLENCHEUR[cfg.attrapeSur || 'eclair'],
          cfg.attrapeSur === 'echec'
            ? (cfg.attrapeEveille !== false
              ? 'Tornade endormie, l’Échec reste un échec sec : on passe le lot sans tenter le '
                + 'contact. Il faut s’être réveillé pour attraper au passage.'
              : 'L’attrape sur Échec vaut même endormi : chaque Échec tente le contact, dès que '
                + 'le voisin a un lot.')
            : 'La case « Il faut être réveillé » ne concerne que l’attrape sur Échec — '
              + 'l’Attaque vaut dans les deux états.',
          'Dans les deux cas, on n’attrape que ce qui existe : si le joueur suivant a les mains '
          + 'vides, il ne se passe rien.',
        ]),
        h('div.rangee.rangee--serree',
          h('div.segment',
            ...OPTIONS_DECLENCHEUR.map(([id, lib]) => h('button', {
              class: (cfg.attrapeSur || 'eclair') === id ? 'on' : '',
              // Le dé ne bouge plus : les deux combinaisons restent réglables
              // dans le tableau, et c'est là qu'on décide de leurs dés.
              onclick: () => { ecrire('attrapeSur', id); dessiner(); },
            }, lib)),
          ),
          h('button', {
            class: `chip${cfg.attrapeEveille !== false ? ' on' : ''}`,
            title: 'Un dormeur ne tend pas la main pour attraper son voisin',
            onclick: () => { ecrire('attrapeEveille', cfg.attrapeEveille === false); dessiner(); },
          }, h('span.case', '✓'), 'Il faut être réveillé'),
        ),

        titreAide('Ce que rapporte l’attrape', AIDE_ATTRAPE[cfg.attrapeGagneManche || 'non']),
        h('div.rangee.rangee--serree',
          h('div.segment',
            ...OPTIONS_ATTRAPE.map(([id, lib]) => h('button', {
              class: (cfg.attrapeGagneManche || 'non') === id ? 'on' : '',
              onclick: () => { ecrire('attrapeGagneManche', id); dessiner(); },
            }, lib)),
          ),
        ),

        titreAide('Quand deux lots se rencontrent',
          cfg.lotsCumules
            ? 'Les lots s’accumulent dans la même main : on joue le premier arrivé, les autres '
              + 'attendent leur tour. Un joueur lent peut se retrouver avec toute la table sur les bras.'
            : 'Règle de base : le lot que l’on tenait part aussitôt vers le voisin suivant — la '
              + 'poussée peut se propager — et l’on enchaîne sur celui qui vient d’arriver.'),
        h('div.rangee.rangee--serree',
          h('div.segment',
            ...[['pousse', 'Le lot en cours est poussé'], ['cumul', 'Les lots s’empilent']]
              .map(([id, lib]) => h('button', {
                class: (cfg.lotsCumules ? 'cumul' : 'pousse') === id ? 'on' : '',
                onclick: () => { ecrire('lotsCumules', id === 'cumul'); dessiner(); },
              }, lib)),
          ),
        ),
      ),

      // ── Rythme ────────────────────────────────────────────────────────────
      h('div.carte',
        titreAide('Rythme de la table', [
          'Ces durées comptent dans le temps de partie : les allonger ralentit le jeu et rallonge '
          + 'les manches, exactement comme sur une vraie table.',
          'Lancer : le temps que les dés roulent. Constat : pour voir le résultat avant que le lot '
          + 'parte. Passage : le lot traverse jusqu’au voisin. Transition : les dés reviennent au '
          + 'centre entre deux manches. Choix : le délai laissé quand plusieurs combinaisons '
          + 'sortent d’un coup. Réflexe : la fenêtre pour toucher ou retirer sa main.',
          cfg.variance
            ? 'Irrégularité : chaque lancer, chaque constat et chaque passage est tiré au sort '
              + 'autour de sa durée réglée. Aucun geste ne dure exactement pareil, comme à une '
              + 'vraie table — et à graine égale, le rythme reste pourtant reproductible.'
            : 'Irrégularité à 0 % : le tempo est mécanique, un passage réglé à 1000 ms dure '
              + 'toujours 1000 ms. Montez le curseur pour que chaque geste varie autour de sa durée.',
        ]),
        h('div.grille.grille--3', { style: { gap: '12px' } },
          num('Durée d’un lancer (ms)', cfg.dureeLancer, 'dureeLancer',
            { min: 0, max: 6000, step: 50 }),
          num('Temps de constat (ms)', cfg.dureeConstat, 'dureeConstat',
            { min: 0, max: 6000, step: 50 }),
          num('Durée du passage (ms)', cfg.dureePassage, 'dureePassage',
            { min: 0, max: 6000, step: 50 }),
        ),
        h('div.grille.grille--3', { style: { gap: '12px', marginTop: '12px' } },
          num('Transition de manche (ms)', cfg.dureeTransition, 'dureeTransition',
            { min: 0, max: 12000, step: 100 }),
          num('Choix de combinaison (ms)', cfg.dureeChoix, 'dureeChoix',
            { min: 0, max: 12000, step: 100 }),
        ),
        h('div.grille.grille--3', { style: { gap: '12px', marginTop: '12px' } },
          num('Réflexion d’une IA (ms)', cfg.tempsReflexion, 'tempsReflexion',
            { min: 0, max: 4000, step: 50 }),
          num('Écart de réflexion (ms)', cfg.ecartReflexion, 'ecartReflexion',
            { min: 0, max: 2000, step: 10 }),
          num('Fenêtre de réflexe (ms)', cfg.fenetreReflexe, 'fenetreReflexe',
            { min: 100, max: 4000, step: 50 }),
        ),
        h('label.champ', { style: { marginTop: '14px' } }, 'Irrégularité du rythme',
          h('div.rangee.rangee--serree',
            h('input.curseur', {
              type: 'range', min: 0, max: 50, step: 5,
              value: Math.round((cfg.variance || 0) * 100),
              oninput: (e) => {
                ecrire('variance', Number(e.target.value) / 100);
                const cible = e.target.parentNode.querySelector('.valeur-curseur');
                if (cible) cible.textContent = aideVariance(Number(e.target.value) / 100, cfg);
              },
              onchange: () => dessiner(),
            }),
            h('span.valeur-curseur', aideVariance(cfg.variance || 0, cfg)),
          ),
        ),
      ),

      // ── Mise en place ─────────────────────────────────────────────────────
      h('div.carte',
        titreAide('Mise en place', [
          `Tableau officiel à ${nb} joueurs : ${mep.lots} lots · ${mep.jetons} jetons par équipe`
          + `${nb % 2 ? ` · ${mep.jetonsVert} pour le Vert` : ''} · ${mep.cartes} cartes pour gagner.`,
          'Décochez « Suivre le tableau officiel » pour régler ces valeurs à la main.',
          mep.extrapole
            ? 'À 9 joueurs, le tableau officiel s’arrête : ces valeurs sont extrapolées.'
            : '',
          'Manches maximum est un garde-fou : une partie qui l’atteint est comptée comme '
          + 'interrompue, jamais comme gagnée.',
        ],
          h('button', {
            class: `chip${suivreTableau ? ' on' : ''}`,
            onclick: () => { ecrire('suivreTableau', !suivreTableau); dessiner(); },
          }, h('span.case', '✓'), 'Suivre le tableau officiel'),
        ),
        h('div.grille.grille--4', { style: { gap: '12px' } },
          num('Jetons Bleu / Jaune', cfg.jetons, 'jetons',
            { min: 1, max: 12, disabled: suivreTableau }),
          num('Jetons du Vert', cfg.jetonsVert, 'jetonsVert',
            { min: 1, max: 12, disabled: suivreTableau }),
          num('Cartes pour gagner', cfg.cartesPourGagner, 'cartesPourGagner',
            { min: 1, max: 12, disabled: suivreTableau }),
          num('Manches maximum', cfg.manchesMax, 'manchesMax', { min: 1, max: 200 }),
        ),
      ),

      // ── Adresse et incidents ──────────────────────────────────────────────
      h('div.carte',
        titreAide('Adresse et incidents', [
          'Adresse de base : la chance de toucher, de 0 à 1, avant l’écart propre à chaque joueur.',
          'Taux d’erreur : la part des gestes où l’on relance un X par mégarde — ce qui fait '
          + 'partir le lot. Erreur punie : la part de ces bourdes assez graves pour offrir un '
          + 'jeton aux équipes adverses.',
        ]),
        h('div.grille.grille--3', { style: { gap: '12px' } },
          num('Adresse de base', cfg.adresseBase, 'adresseBase',
            { min: 0, max: 1, step: 0.05 }),
          num('Taux d’erreur', cfg.tauxErreur, 'tauxErreur',
            { min: 0, max: 1, step: 0.01 }),
          num('Erreur punie', cfg.penaliteErreurAdverse, 'penaliteErreurAdverse',
            { min: 0, max: 1, step: 0.05 }),
        ),
      ),

      // ── Cartes Journée ────────────────────────────────────────────────────
      h('div.carte',
        titreAide('Cartes Journée en jeu', [
          'Une carte par manche, dans l’ordre de la pile. Décochez celles que vous ne voulez pas '
          + 'voir sortir.',
          'La pile démarre par « Jour de chauffe » s’il est coché ; le reste suit, mélangé ou non.',
        ],
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
      ),

      // ── Graine ────────────────────────────────────────────────────────────
      h('div.carte',
        titreAide('Graine',
          'À graine fixée, deux parties aux mêmes réglages se déroulent exactement pareil — '
          + 'même dés, même rythme, même issue. Sans graine manuelle, chaque partie en tire une '
          + 'au hasard.'),
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

