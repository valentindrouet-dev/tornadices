// Menu Réglages : toutes les options d'une partie, en un seul endroit.
//
// La page ne stocke qu'un jeu de réglages partiels ; `construireConfig` les pose
// par-dessus la configuration par défaut du nombre de joueurs choisi.

import { h, remplacer } from './dom.js?v=1.44';
import { pastilleSymbole, suiteSymboles } from './icons.js?v=1.44';
import { store } from './store.js?v=1.44';
import { aller } from './app.js?v=1.44';
import { lancerPartie } from './table.js?v=1.44';
import {
  configParDefaut, infosMiseEnPlace, ORDRE_SYMBOLES, SYMBOLES,
  OPTIONS_ATTRAPE, AIDE_ATTRAPE,
  OPTIONS_DECLENCHEUR, AIDE_DECLENCHEUR,
  OPTIONS_MANCHE, AIDE_MANCHE, noteCarteMode,
  OPTIONS_EQUIPE_DEPART, AIDE_EQUIPE_DEPART,
  cleCombosCartes, clePaquet, cartesEnJeu, cartesDuMode, requisCarte, comboPossible,
  COULEURS_EQUIPE,
  assainirFaces, assainirRequis, TYPES_DE, facesPourDe, aideVariance,
} from '../core/config.js?v=1.44';
import { tableauCombos, editeurCases } from './combos.js?v=1.44';
import {
  FACES_PERSONNALISABLES, MODELES_FACE, NOM_MODELE, APPARENCE_OFFICIELLE,
  nomSymbole, nomAncien, imageSymbole, faceModifiee,
  reglerApparence, reinitialiserApparence, reinitialiserApparences,
} from './apparence.js?v=1.44';
import { eveillerSons, jouerSon, sonsActifs, reglerSons, volumeSons, reglerVolume, SONS, NOMS_SONS } from './sons.js?v=1.44';
import { randomSeed } from '../core/rng.js?v=1.44';
import { reglagesJoueurs } from './accueil.js?v=1.44';
import {
  barreProfils, reglagesCourants, enregistrerReglages,
} from './profils.js?v=1.44';

const CHAMPS_MISE_EN_PLACE = ['lots', 'jetons', 'jetonsVert', 'cartesPourGagner'];

export function variables() {
  return reglagesCourants();
}

/** Configuration complète d'une partie : défauts du nombre de joueurs + réglages. */
export function construireConfig(nbJoueurs) {
  const v = variables();
  const cfg = configParDefaut(nbJoueurs, {
    echecJokers: v.echecJokers !== false,
    attrapeSur: v.attrapeSur,
    lotsCumules: v.lotsCumules,
    // Le mode change la mise en place par défaut (quatre cartes) : il doit être
    // connu avant que les valeurs du tableau officiel ne soient posées.
    sansPoints: v.sansPoints,
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
  if (v.combos || v.combosFaces) {
    cfg.combos = cfg.combos.map((c) => ({
      ...c,
      requis: assainirRequis((v.combos && v.combos[c.id]) || c.requis),
      // « Réveillé seulement » : réglé combinaison par combinaison dans le
      // tableau, il se range à part des exigences.
      face: (v.combosFaces && v.combosFaces[c.id]) || c.face,
    }));
  }
  // Les trois tables d'exigences enregistrées passent par la même retraduction.
  for (const cle of ['combosCartes', 'combosCartesSansPoints', 'combosVert']) {
    if (cfg[cle]) {
      cfg[cle] = Object.fromEntries(Object.entries(cfg[cle])
        .map(([id, requis]) => [id, assainirRequis(requis)]));
    }
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
  enregistrerReglages(v);
}

/** Limite de l'image importée : au-delà, le stockage du navigateur déborde. */
const POIDS_MAX_IMAGE = 400 * 1024;

/**
 * Le bloc qui réhabille une face : l'aperçu, le nom, l'illustration, et le
 * bouton d'import. Tout est réversible — « Face officielle » remet le dé du jeu.
 */
function carteApparence(sym, rafraichir) {
  const officielle = APPARENCE_OFFICIELLE[sym] || {};
  const nomOfficiel = officielle.nom || nomAncien(sym);
  const choix = imageSymbole(sym);
  const message = h('div.mini.muted', { style: { marginTop: '6px' } },
    faceModifiee(sym)
      ? `Face officielle : ${nomOfficiel}. Ancien dessin : ${nomAncien(sym)}.`
      : `Face officielle — l’ancien dessin s’appelait « ${nomAncien(sym)} ».`);

  const fichier = h('input', {
    type: 'file', accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
    style: { display: 'none' },
    onchange: (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > POIDS_MAX_IMAGE) {
        message.textContent = `Image trop lourde (${Math.round(f.size / 1024)} ko) — `
          + `${Math.round(POIDS_MAX_IMAGE / 1024)} ko au maximum.`;
        return;
      }
      const lecteur = new FileReader();
      lecteur.onload = () => {
        reglerApparence(sym, { image: String(lecteur.result) });
        rafraichir();
      };
      lecteur.onerror = () => { message.textContent = 'Lecture impossible : essayez un autre fichier.'; };
      // En `data:` : la page reste autonome, sans requête vers l'extérieur.
      lecteur.readAsDataURL(f);
    },
  });

  return h('div.carte-face',
    h('div.rangee',
      pastilleSymbole(sym, 54),
      h('div', { style: { flex: '1', minWidth: '0' } },
        h('div.titre-section', { style: { margin: '0 0 6px' } }, nomSymbole(sym)),
        h('div.mini.muted', `Symbole « ${sym} » — pouvoir inchangé`),
      ),
    ),
    h('label.champ', { style: { marginTop: '10px' } }, 'Nom affiché',
      h('input', {
        type: 'text', value: nomSymbole(sym), placeholder: nomOfficiel,
        onchange: (e) => { reglerApparence(sym, { nom: e.target.value }); rafraichir(); },
      }),
    ),
    h('label.champ', { style: { marginTop: '10px' } }, 'Illustration',
      h('select', {
        onchange: (e) => {
          const val = e.target.value;
          // Le dessin choisi propose son nom : un réveil qui s'appelle encore
          // « Tornade » n'aide personne, et l'ancien dessin reprend le sien.
          const suggere = NOM_MODELE[val] || (val === '' ? nomAncien(sym) : null);
          reglerApparence(sym, suggere ? { image: val, nom: suggere } : { image: val });
          rafraichir();
        },
      },
        ...MODELES_FACE[sym].map(([id, lib]) => h('option', {
          value: id, selected: id === choix,
        }, lib)),
        // Une image importée n'est pas dans la liste : on lui donne sa ligne.
        /^data:/.test(choix) ? h('option', { value: choix, selected: true }, 'Image importée') : null,
      ),
    ),
    h('div.rangee.rangee--serree', { style: { marginTop: '10px' } },
      fichier,
      h('button.btn.btn--petit', { onclick: () => fichier.click() }, 'Importer une image…'),
      faceModifiee(sym)
        ? h('button.btn.btn--petit', {
            onclick: () => { reinitialiserApparence(sym); rafraichir(); },
          }, 'Face officielle')
        : null,
    ),
    message,
  );
}

/**
 * Le Laboratoire garde sa propre copie de configuration, complète et modifiable
 * à part. Changer de réglage enregistré doit donc la refaire, sans quoi les deux
 * pages parleraient de deux jeux de règles différents. Le nombre de joueurs de
 * la campagne, lui, ne bouge pas : c'est un choix de campagne, pas un réglage.
 */
export function reporterAuLabo() {
  const ancienne = store.get('cfgLabo', null);
  const n = (ancienne && ancienne.nbJoueurs) || store.get('nbJoueurs', 6);
  store.set('cfgLabo', construireConfig(n));
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
          // Toucher une valeur du tableau officiel, c'est le quitter : inutile
          // d'exiger de décocher la case d'abord, personne ne le devinait.
          if (CHAMPS_MISE_EN_PLACE.includes(cle)) ecrire('suivreTableau', false);
          dessiner();
        },
      }),
    );

    remplacer(racine,
      h('div.rangee', { style: { margin: '6px 0 6px' } },
        h('h1', 'Réglages de la partie'),
        h('div', { style: { flex: '1' } }),
        h('button.btn.btn--petit', {
          onclick: () => { enregistrerReglages({}); dessiner(); },
        }, 'Tout réinitialiser'),
        h('button.btn.btn--petit', { onclick: () => aller('/') }, '← Accueil'),
      ),
      h('p.petit.muted', { style: { marginBottom: '20px' } },
        `Tout ce qui suit s’applique à la prochaine partie, à ${nb} joueurs. `
        + 'Le Laboratoire dispose des mêmes réglages pour ses campagnes simulées.'),

      // Au-dessus de tout le reste : de quels réglages parle la page. Changer
      // de réglage enregistré change tout d'un coup, ici et au Laboratoire.
      barreProfils(() => { reporterAuLabo(); dessiner(); }),

      // ── Mode de jeu ───────────────────────────────────────────────────────
      // Le premier réglage de la page, parce qu'il change la forme d'une manche
      // et donc la lecture de tous les autres.
      h('div.carte',
        titreAide('Comment se joue une manche', [
          AIDE_MANCHE[cfg.sansPoints ? 'sansPoints' : 'jetons'],
          cfg.sansPoints
            ? 'Deux façons de prendre la manche, donc : sortir l’Abri, ou attraper son voisin. '
              + 'Le reste des réglages tient — les dés, les combinaisons, le rythme. Seuls les '
              + 'jetons sortent du jeu, avec les cartes Tornade qui les manipulent.'
            : '',
        ]),
        h('div.rangee.rangee--serree',
          h('div.segment',
            ...OPTIONS_MANCHE.map(([id, lib]) => h('button', {
              class: (cfg.sansPoints ? 'sansPoints' : 'jetons') === id ? 'on' : '',
              onclick: () => { ecrire('sansPoints', id === 'sansPoints'); dessiner(); },
            }, lib)),
          ),
        ),
      ),

      // ── Dés ───────────────────────────────────────────────────────────────
      h('div.carte',
        titreAide('Dés', [
          `Le lot compte ${cfg.desParLot} dés, et ${cfg.lots} lots tournent autour de la table`
          + `${suivreTableau ? ` — le tableau officiel en prévoit ${mep.lots} à ${nb} joueurs` : ''}.`,
          'Le d6 est le dé du jeu : 2 tornades, 1 X, 1 abri, 2 ZzZ. Le X fige son dé — il ne se '
          + 'relance jamais. Le d8 et le d10 reprennent la même série depuis le début, et chaque '
          + 'face se change une à une dans les menus ci-dessous.',
          'Ni joker ni éclair au départ : posez-les vous-même sur une face pour les essayer. Le '
          + 'joker prend la face de n’importe quel symbole sauf le X ; le joker double ne remplace '
          + 'que l’éclair et le ZzZ. Sans face éclair, la combinaison Attaque ne peut pas sortir — '
          + 'passez le déclencheur sur « Échecs » pour garder une attrape.',
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
          num('Lots en jeu', cfg.lots, 'lots', { min: 1, max: 9 }),
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
          'Les lignes bleues sont les combinaisons des cartes Tornade : elles ne valent que le '
          + 'temps de la manche où la carte est en jeu, et le paquet affiché est celui du mode '
          + 'de jeu en cours.',
          'La colonne « Réveillé » réserve une combinaison à la Tornade éveillée. Décochée, elle '
          + 'reprend sa condition d’origine — le Réveil reste réservé au dormeur, sans quoi on ne '
          + 'pourrait plus jamais se réveiller.',
          cfg.combosAsymetriques
            ? 'Asymétrie en jeu : chaque combinaison a deux lignes, celle des Bleus et des Jaunes '
              + 'et celle du Vert. Laissez la ligne du Vert identique pour qu’il joue les mêmes '
              + 'règles ; décochez l’asymétrie pour revenir à une table strictement symétrique.'
            : 'Le Vert joue exactement les mêmes combinaisons que les deux équipes. Cochez '
              + '« Combinaisons du Vert à part » pour lui en donner d’autres.',
        ],
          h('button', {
            class: `chip${cfg.combosAsymetriques ? ' on' : ''}`,
            title: 'Donner au joueur Vert ses propres exigences',
            onclick: () => { ecrire('combosAsymetriques', !cfg.combosAsymetriques); dessiner(); },
          }, h('span.case', '✓'), 'Combinaisons du Vert à part'),
          h('button', {
            class: `chip${cfg.echecJokers !== false ? ' on' : ''}`,
            title: 'Trois jokers d’un coup font partir le lot, comme deux X',
            onclick: () => { ecrire('echecJokers', cfg.echecJokers === false); dessiner(); },
          }, h('span.case', '✓'), 'Trois jokers = échec'),
        ),
        tableauCombos(cfg, {
          ecrireCombo: (id, requis) => ecrire('combos', { ...(v.combos || {}), [id]: requis }),
          ecrireVert: (id, requis) => ecrire('combosVert', { ...(v.combosVert || {}), [id]: requis }),
          ecrireFace: (id, face) => ecrire('combosFaces', { ...(v.combosFaces || {}), [id]: face }),
          rafraichir: dessiner,
        }),

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

        // Réglable dans les deux modes. Sans les points, « touche » est la
        // valeur de départ : c'est la base du mode, l'attrape y étant le second
        // moyen de prendre une manche.
        titreAide('Ce que rapporte l’attrape', [
          AIDE_ATTRAPE[cfg.attrapeGagneManche || 'non'],
          cfg.sansPoints && cfg.attrapeGagneManche !== 'touche'
            ? 'Attention : sans les points, « Un jeton » ne rapporte rien — il n’y a plus de jeton '
              + 'à retourner. Le contact interrompt son voisin, et c’est tout. Reprenez « Manche '
              + 'gagnée si le contact réussit » pour rendre l’attrape payante.'
            : '',
        ]),
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
          cfg.sansPoints
            ? 'Sans les points, les jetons ne servent plus : leurs champs restent grisés. Une '
              + 'manche vaut une carte, et l’on joue en quatre par défaut.'
            : '',
          'Toutes ces valeurs se règlent à la main : en modifier une décroche le tableau '
          + 'officiel. Recocher « Suivre le tableau officiel » les remet toutes d’aplomb.',
          mep.extrapole
            ? 'À 9 joueurs, le tableau officiel s’arrête : ces valeurs sont extrapolées.'
            : '',
          nb % 2
            ? 'Le Vert joue seul contre deux équipes : « Cartes du Vert » règle son objectif à '
              + 'part, pour l’alléger ou l’alourdir sans toucher aux Bleus ni aux Jaunes. Laissez '
              + `la même valeur (${cfg.cartesPourGagner}) pour qu’il gagne aux mêmes conditions.`
            : '',
          // Sans les points, la manche est une course où chacun joue pour soi :
          // le Vert, seul contre deux équipes, la perd presque toujours. Mesuré
          // sur 300 parties d'IA équilibrées.
          nb % 2 && cfg.sansPoints
            ? 'Sans les points, la manche est une course : à un contre tous, le Vert ne gagne '
              + `guère plus d’une partie sur dix à ${nb} joueurs. Deux cartes au lieu de quatre le `
              + 'ramènent dans la course.'
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
          // Sans les points, plus rien ne se retourne : les deux compteurs de
          // jetons n'ont plus d'effet, autant le montrer.
          num('Jetons Bleu / Jaune', cfg.jetons, 'jetons',
            { min: 1, max: 12, disabled: cfg.sansPoints }),
          num('Jetons du Vert', cfg.jetonsVert, 'jetonsVert',
            { min: 1, max: 12, disabled: cfg.sansPoints }),
          num('Cartes pour gagner', cfg.cartesPourGagner, 'cartesPourGagner',
            { min: 1, max: 12 }),
          // Le Vert n'existe qu'à nombre impair : ailleurs, le champ n'aurait
          // personne à qui s'appliquer.
          nb % 2
            ? num('Cartes du Vert', cfg.cartesVert ?? cfg.cartesPourGagner, 'cartesVert',
                { min: 1, max: 12 })
            : null,
          num('Manches maximum', cfg.manchesMax, 'manchesMax', { min: 1, max: 200 }),
        ),

        // Qui ouvre la partie. Seule la première manche est concernée : les
        // suivantes reviennent toujours aux perdants de la précédente.
        titreAide('Qui commence', AIDE_EQUIPE_DEPART[cfg.equipeDepart || 'jaune']),
        h('div.rangee.rangee--serree',
          h('div.segment',
            ...OPTIONS_EQUIPE_DEPART
              // Le Vert n'existe qu'à nombre impair : ailleurs, l'entrée
              // désignerait une équipe vide.
              .filter(([id]) => id !== 'vert' || nb % 2)
              .map(([id, lib]) => h('button', {
                class: (cfg.equipeDepart || 'jaune') === id ? 'on' : '',
                onclick: () => { ecrire('equipeDepart', id); dessiner(); },
              }, lib)),
          ),
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

      // ── Cartes Tornade ────────────────────────────────────────────────────
      // Un paquet par mode de jeu : ce qu'on coche ici ne vaut que pour le mode
      // en cours, et l'autre garde le sien intact.
      h('div.carte',
        titreAide(`Cartes Tornade en jeu — ${cfg.sansPoints ? 'sans les points' : 'avec les jetons'}`, [
          'Une carte par manche, dans l’ordre de la pile. Décochez celles que vous ne voulez pas '
          + 'voir sortir.',
          'Chaque mode de jeu a son propre paquet : ce que vous cochez ici ne vaut que pour '
          + `« ${cfg.sansPoints ? 'Sans les points' : 'Retourner tous les jetons'} ». Changez de `
          + 'mode en haut de la page et vous retrouverez l’autre paquet, intact.',
          cfg.sansPoints
            ? 'La pile démarre par « Tornade de feuille » — la manche de chauffe — puis le reste '
              + 'suit. On révèle une Tornade, on la joue ; le dos de la suivante, encore face '
              + 'cachée, donne le sens de rotation de la manche en cours.'
            : 'La pile démarre par « Jour de chauffe » s’il est coché ; le reste suit, mélangé ou non.',
          cfg.sansPoints
            ? 'Une carte qui vaut deux points se paie sur la pioche : l’équipe prend la carte en '
              + 'cours et celle du dessus, gardée face cachée dans sa pile.'
            : '',
        ],
          h('button', {
            class: `chip${cfg.melangerCartes !== false ? ' on' : ''}`,
            onclick: () => { ecrire('melangerCartes', cfg.melangerCartes === false); dessiner(); },
          }, h('span.case', '✓'), 'Mélanger la pile'),
        ),
        // Une carte porte tout ce qui la concerne : son effet, son sens de
        // rotation, et sa combinaison — qui se règle ici plutôt que dans le
        // tableau des combinaisons, où on la cherchait loin de son texte.
        h('div.grille.grille--3.grille--cartes',
          ...cartesDuMode(cfg).map((c) => {
            const paquet = cartesEnJeu(cfg);
            const dedans = paquet.includes(c.id);
            const requis = c.combo ? requisCarte(cfg, c.combo) : null;
            const note = noteCarteMode(c, cfg);
            return h('div.carte-journee', { class: dedans ? '' : 'hors-jeu' },
              h('div.rangee.rangee--serree',
                h('button', {
                  class: `chip${dedans ? ' on' : ''}`,
                  onclick: () => {
                    const liste = dedans ? paquet.filter((x) => x !== c.id) : [...paquet, c.id];
                    ecrire(clePaquet(cfg), liste);
                    dessiner();
                  },
                }, h('span.case', '✓'), c.court),
                h('div.pousse'),
                // La flèche du verso : c'est elle qui donne le sens de la manche
                // précédente, quand la carte est encore sur la pioche.
                c.sens
                  ? h('span.fleche-sens', {
                      title: c.sens > 0 ? 'Verso : sens horaire' : 'Verso : sens antihoraire',
                    }, c.sens > 0 ? '↻' : '↺')
                  : null,
              ),
              h('div.petit', { style: { marginTop: '8px' } }, c.texte),
              note ? h('div.mini.muted', { style: { marginTop: '6px' } }, note) : null,
              requis
                ? h('div', { style: { marginTop: '10px' } },
                    h('div.mini.muted', { style: { marginBottom: '4px' } }, 'Combinaison'),
                    editeurCases(requis, Math.max(1, Math.min(12, cfg.desParLot || 4)),
                      (r) => {
                        const cle = cleCombosCartes(cfg);
                        ecrire(cle, { ...(v[cle] || {}), [c.combo.id]: r });
                        dessiner();
                      }),
                  )
                : h('div.mini.muted', { style: { marginTop: '10px' } },
                    'Aucune combinaison — la carte agit d’elle-même.'),
              // Une combinaison dont le dé ne porte pas les faces ne sortira
              // jamais : autant le dire ici plutôt qu'après trois campagnes.
              requis && !comboPossible(cfg.faces, requis)
                ? h('div.mini.muted', { style: { marginTop: '6px' } },
                    'Le dé ne porte pas les faces demandées : cette combinaison ne peut pas sortir.')
                : null,
            );
          }),
        ),
      ),

      // ── Apparence des faces ───────────────────────────────────────────────
      // Le pouvoir ne bouge pas : c'est le même symbole pour le moteur, avec la
      // même combinaison et le même effet. Seuls le dessin et le nom changent.
      h('div.carte',
        titreAide('Apparence des faces', [
          'Le dé officiel porte un réveil sur la face bleue et une tornade sur la verte. Les deux '
          + 'se réhabillent quand vous voulez : reprenez l’ancien dessin, ou importez votre propre '
          + 'image — elle est découpée en rond, comme une face de dé.',
          'Le pouvoir ne change pas d’un iota : même symbole pour le moteur, même combinaison, '
          + 'même effet. Seuls le dessin et le nom affiché changent, partout sur le site.',
          'L’image est enregistrée dans ce navigateur, en clair dans la page : pas de fichier à '
          + 'héberger, rien qui parte vers l’extérieur. Un PNG carré de 256 px suffit largement.',
        ],
          h('button.btn.btn--petit', {
            onclick: () => { reinitialiserApparences(); dessiner(); },
          }, 'Faces officielles'),
        ),
        h('div.grille.grille--2', { style: { gap: '14px' } },
          ...FACES_PERSONNALISABLES.map((sym) => carteApparence(sym, dessiner)),
        ),
      ),

      // ── Sons ──────────────────────────────────────────────────────────────
      h('div.carte',
        titreAide('Sons', [
          'Quatre sons ponctuent la partie : la sonnerie du réveil, le ronflement de '
          + 'l’endormissement, le meuglement d’un Abri retourné et l’alarme d’une attrape.',
          'Le réveil et le ronflement ne sonnent que pour vous — à six autour de la table, ils '
          + 'sonneraient sans arrêt. L’Abri se fête pour tout le monde, et l’alarme prévient la '
          + 'table entière.',
          'Aucun fichier n’est téléchargé : les sons sont fabriqués par le navigateur au moment '
          + 'de les jouer. Le bouton 🔊 de la table les coupe sans quitter la partie.',
        ],
          h('button', {
            class: `chip${sonsActifs() ? ' on' : ''}`,
            onclick: () => { reglerSons(!sonsActifs()); eveillerSons(); dessiner(); },
          }, h('span.case', '✓'), 'Sons de la partie'),
        ),
        sonsActifs()
          ? h('div',
              h('label.champ', 'Volume',
                h('div.rangee.rangee--serree',
                  h('input.curseur', {
                    type: 'range', min: 0, max: 100, step: 5,
                    value: Math.round(volumeSons() * 100),
                    oninput: (e) => {
                      reglerVolume(Number(e.target.value) / 100);
                      const cible = e.target.parentNode.querySelector('.valeur-curseur');
                      if (cible) cible.textContent = `${e.target.value} %`;
                    },
                  }),
                  h('span.valeur-curseur', `${Math.round(volumeSons() * 100)} %`),
                ),
              ),
              h('div.rangee.rangee--serree', { style: { marginTop: '12px' } },
                h('span.mini.muted', 'Écouter :'),
                ...SONS.map((nom) => h('button.btn.btn--petit', {
                  title: NOMS_SONS[nom],
                  onclick: () => { eveillerSons(); jouerSon(nom); },
                }, NOMS_SONS[nom].split(' — ')[0])),
              ),
            )
          : h('p.mini.muted', 'La partie se joue en silence.'),
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
    eveillerSons();
    const v = variables();
    const cfg = construireConfig(nb);
    lancerPartie(cfg, reglagesJoueurs(nb), v.graineManuelle ? (v.graine || randomSeed()) : randomSeed());
    aller('/table');
  }

  dessiner();
  return racine;
}

