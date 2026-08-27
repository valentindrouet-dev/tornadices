// Menu Réglages : toutes les options d'une partie, en un seul endroit.
//
// La page ne stocke qu'un jeu de réglages partiels ; `construireConfig` les pose
// par-dessus la configuration par défaut du nombre de joueurs choisi.

import { h, remplacer } from './dom.js?v=1.66';
import { pastilleSymbole, suiteSymboles } from './icons.js?v=1.66';
import { store } from './store.js?v=1.66';
import { aller } from './app.js?v=1.66';
import { lancerPartie } from './table.js?v=1.66';
import {
  configParDefaut, infosMiseEnPlace, ORDRE_SYMBOLES,
  OPTIONS_ATTRAPE, AIDE_ATTRAPE,
  OPTIONS_DECLENCHEUR, AIDE_DECLENCHEUR,
  OPTIONS_MANCHE, AIDE_MANCHE, noteCarteMode,
  OPTIONS_EQUIPE_DEPART, AIDE_EQUIPE_DEPART,
  cleCombosCartes, clePaquet, cleVues, cartesEnJeu, cartesDuMode, requisCarte, comboPossible,
  COULEURS_EQUIPE,
  assainirFaces, assainirRequis, aideVariance,
  NOMBRES_JOUEURS, lotsPour, lotsOfficiels,
  cartesPour, cartesVertPour, cartesOfficielles, cartesParDefaut,
  MODES_MANCHE, NOM_MODE, modeManche, estImmediat, estCompromis, estJeton, refugePour,
  OPTIONS_SENS, AIDE_SENS, sensRotation,
  OPTIONS_COMBO_SERVIE, AIDE_COMBO_SERVIE,
} from '../core/config.js?v=1.66';
import { tableauCombos, editeurCases } from './combos.js?v=1.66';
import {
  FACES_PERSONNALISABLES, MODELES_FACE, NOM_MODELE, APPARENCE_OFFICIELLE,
  nomSymbole, nomAncien, imageSymbole, faceModifiee,
  reglerApparence, reinitialiserApparence, reinitialiserApparences,
} from './apparence.js?v=1.66';
import { eveillerSons, jouerSon, sonsActifs, reglerSons, volumeSons, reglerVolume, SONS, NOMS_SONS } from './sons.js?v=1.66';
import { randomSeed } from '../core/rng.js?v=1.66';
import { reglagesJoueurs } from './accueil.js?v=1.66';
import {
  barreProfils, reglagesCourants, enregistrerReglages,
} from './profils.js?v=1.66';

// « lots » n'est plus de la partie : il a son propre tableau, une ligne par
// nombre de joueurs, et ne suit donc plus la case « Suivre le tableau officiel ».
const CHAMPS_MISE_EN_PLACE = ['jetons', 'jetonsVert'];

/**
 * Le tableau des lots en jeu, une ligne par nombre de joueurs.
 *
 * Avant la v1.48 le réglage ne portait qu'un seul nombre, celui du dernier
 * effectif réglé : on ne savait plus pour quelle table il avait été posé. Un
 * réglage ancien repose donc sa valeur sur la ligne de l'effectif d'alors, et
 * les autres lignes reprennent le tableau officiel.
 */
export function tableLots(v = variables()) {
  const table = lotsOfficiels();
  if (v.lotsParJoueurs && typeof v.lotsParJoueurs === 'object') {
    for (const n of NOMBRES_JOUEURS) {
      const x = Number(v.lotsParJoueurs[n]);
      if (Number.isFinite(x) && x >= 1) table[n] = Math.min(12, Math.round(x));
    }
    return table;
  }
  if (v.suivreTableau === false && Number(v.lots) >= 1) {
    const herite = store.get('nbJoueurs', 6);
    table[herite] = Math.min(12, Math.round(Number(v.lots)));
  }
  return table;
}

/** Écrit une ligne du tableau des lots. */
export function ecrireLots(nbJoueurs, valeur) {
  const table = tableLots();
  table[nbJoueurs] = Math.min(12, Math.max(1, Math.round(Number(valeur) || 1)));
  const v = variables();
  v.lotsParJoueurs = table;
  // L'ancien réglage unique ne doit pas ressurgir derrière le tableau.
  delete v.lots;
  enregistrerReglages(v);
}

/**
 * Les cartes pour gagner, une ligne par nombre de joueurs — et par mode.
 *
 * Deux raisons de garder ces tableaux par mode : la valeur de départ en dépend
 * (trois cartes avec les jetons, quatre en Immédiat, cinq en Compromis), et un
 * objectif posé pour un mode n'a aucune raison de suivre dans un autre, où les
 * manches n'ont pas du tout la même durée.
 *
 * Avant la v1.53, le réglage ne portait qu'un seul nombre — celui du dernier
 * effectif réglé : on le repose sur sa ligne, comme pour les lots.
 */
export function tableCartes(mode, v = variables()) {
  const table = cartesOfficielles(mode);
  const enregistre = (v.cartesParMode || {})[mode];
  if (enregistre && typeof enregistre === 'object') {
    for (const n of NOMBRES_JOUEURS) {
      const x = Number(enregistre[n]);
      if (Number.isFinite(x) && x >= 1) table[n] = Math.min(12, Math.round(x));
    }
    return table;
  }
  // Un réglage d'avant la v1.53 : son nombre unique tenait pour l'effectif
  // d'alors, et seulement pour le mode où il avait été posé.
  if (Number(v.cartesPourGagner) >= 1 && modeManche(v) === mode) {
    table[store.get('nbJoueurs', 6)] = Math.min(12, Math.round(Number(v.cartesPourGagner)));
  }
  return table;
}

/** Et celles du joueur Vert, qui joue seul contre deux équipes. */
export function tableCartesVert(mode, v = variables()) {
  const equipes = tableCartes(mode, v);
  const table = Object.fromEntries(NOMBRES_JOUEURS.map((n) => [n, equipes[n]]));
  const enregistre = (v.cartesVertParMode || {})[mode];
  if (enregistre && typeof enregistre === 'object') {
    for (const n of NOMBRES_JOUEURS) {
      const x = Number(enregistre[n]);
      if (Number.isFinite(x) && x >= 1) table[n] = Math.min(12, Math.round(x));
    }
    return table;
  }
  if (Number(v.cartesVert) >= 1 && modeManche(v) === mode) {
    table[store.get('nbJoueurs', 6)] = Math.min(12, Math.round(Number(v.cartesVert)));
  }
  return table;
}

/** Écrit une ligne de l'un des deux tableaux de cartes. */
export function ecrireCartes(mode, nbJoueurs, valeur, vert = false) {
  const cle = vert ? 'cartesVertParMode' : 'cartesParMode';
  const table = vert ? tableCartesVert(mode) : tableCartes(mode);
  table[nbJoueurs] = Math.min(12, Math.max(1, Math.round(Number(valeur) || 1)));
  const v = variables();
  v[cle] = { ...(v[cle] || {}), [mode]: table };
  // Les anciens réglages uniques ne doivent pas ressurgir derrière le tableau.
  delete v[vert ? 'cartesVert' : 'cartesPourGagner'];
  enregistrerReglages(v);
}

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
    // La façon de jouer une manche décide de plusieurs valeurs de départ.
    modeManche: modeManche(v),
  });
  for (const [cle, val] of Object.entries(v)) {
    if (val === undefined || val === null) continue;
    if (cle === 'suivreTableau') continue;
    // `combos` est stocké par identifiant, pas sous la forme d'une liste : il se
    // fusionne plus bas, sans quoi il écraserait les combinaisons du moteur.
    if (cle === 'combos') continue;
    // Le tableau des lots se lit par ligne, plus bas : ni l'ancien nombre unique
    // ni le tableau lui-même n'ont à être recopiés tels quels dans la config.
    if (cle === 'lots' || cle === 'lotsParJoueurs') continue;
    // Même chose pour les cartes : elles se lisent par ligne, plus bas.
    if (cle === 'cartesPourGagner' || cle === 'cartesVert') continue;
    if (cle === 'cartesParMode' || cle === 'cartesVertParMode') continue;
    if (v.suivreTableau !== false && CHAMPS_MISE_EN_PLACE.includes(cle)) continue;
    cfg[cle] = Array.isArray(val) ? val.slice() : val;
  }
  // Combien de lots tournent, à cet effectif-là : la ligne du tableau.
  cfg.lots = lotsPour(tableLots(v), nbJoueurs);
  // Et combien de cartes il faut pour gagner — le Vert ayant la sienne, il joue
  // seul contre deux équipes.
  const mode = modeManche(cfg);
  cfg.cartesPourGagner = cartesPour(tableCartes(mode, v), mode, nbJoueurs);
  cfg.cartesVert = cartesVertPour(tableCartesVert(mode, v), mode, nbJoueurs);
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

/**
 * Le côté auquel une image importée est ramenée. Une face de dé ne dépasse
 * jamais quelques dizaines de pixels à l'écran : 256 suffit largement, et le
 * stockage du navigateur ne déborde pas.
 */
const COTE_IMAGE = 256;

/**
 * Prépare une image importée : on la ramène à la taille d'une face, on la
 * ré-encode en PNG, et l'on rend une adresse `data:` — la page reste autonome,
 * sans requête vers l'extérieur.
 *
 * Le fond reste transparent : c'est l'application qui pose le blanc derrière la
 * face. Une image ronde à fond transparent se pose donc exactement comme les
 * dessins du jeu.
 *
 * Aucune image n'est refusée pour son poids : un fichier de plusieurs méga-
 * octets ressort à quelques dizaines de kilo-octets, ce qui était jusqu'ici le
 * premier motif d'échec de l'import.
 */
function preparerImage(fichier) {
  return new Promise((resolve, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error('lecture'));
    lecteur.onload = () => {
      const source = String(lecteur.result || '');
      // Un SVG est déjà léger, et le redessiner le pixelliserait : on le garde.
      if (/^data:image\/svg\+xml/.test(source)) { resolve(source); return; }
      const img = new Image();
      img.onerror = () => rejeter(new Error('decodage'));
      img.onload = () => {
        try {
          const e = Math.min(COTE_IMAGE / img.width, COTE_IMAGE / img.height, 1);
          const l = Math.max(1, Math.round(img.width * e));
          const ht = Math.max(1, Math.round(img.height * e));
          const toile = document.createElement('canvas');
          toile.width = l;
          toile.height = ht;
          toile.getContext('2d').drawImage(img, 0, 0, l, ht);
          // Toujours en PNG : le JPEG perdrait la transparence en la noircissant.
          resolve(toile.toDataURL('image/png'));
        } catch { rejeter(new Error('decodage')); }
      };
      img.src = source;
    };
    lecteur.readAsDataURL(fichier);
  });
}

/**
 * Le bloc qui réhabille une face : l'aperçu, le nom, l'illustration, et le
 * bouton d'import. Tout est réversible — « Face officielle » remet le dé du jeu.
 */
function carteApparence(sym, rafraichir) {
  const officielle = APPARENCE_OFFICIELLE[sym] || {};
  const nomOfficiel = officielle.nom || nomAncien(sym);
  const choix = imageSymbole(sym);
  // Une face jamais réhabillée n'a pas d'« ancien dessin » : son dessin
  // d'origine est l'officiel, et le dire deux fois n'apprendrait rien.
  const reskinnee = !!APPARENCE_OFFICIELLE[sym];
  const message = h('div.mini.muted', { style: { marginTop: '6px' } },
    faceModifiee(sym)
      ? (reskinnee
        ? `Face officielle : ${nomOfficiel}. Ancien dessin : ${nomAncien(sym)}.`
        : `Face officielle : ${nomOfficiel}, le dessin d’origine du jeu.`)
      : (reskinnee
        ? `Face officielle — l’ancien dessin s’appelait « ${nomAncien(sym)} ».`
        : 'Dessin d’origine du jeu — celui de la règle papier.'));

  // `accept` reste large : un filtre trop étroit grise le fichier dans le
  // sélecteur, et l'import a alors l'air cassé alors qu'il attend seulement un
  // autre format. On accepte donc toute image, et l'on explique ensuite.
  const fichier = h('input', {
    type: 'file', accept: 'image/*',
    // Pas `display: none` : sur certains navigateurs — Safari en tête — un champ
    // ainsi masqué n'ouvre jamais le sélecteur. Il reste donc affiché, mais
    // réduit à rien et posé derrière son étiquette.
    class: 'champ-fichier',
    onchange: (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.type && !/^image\//.test(f.type)) {
        message.textContent = `« ${f.name} » n’est pas une image. PNG, JPEG, WebP ou SVG.`;
        return;
      }
      message.textContent = 'Lecture de l’image…';
      preparerImage(f).then((image) => {
        // Une écriture refusée — mémoire locale pleine, ou coupée en navigation
        // privée — ne doit pas passer inaperçue : sans ce mot, l'import aurait
        // l'air de ne rien faire du tout.
        if (!reglerApparence(sym, { image })) {
          message.textContent = 'Le navigateur a refusé d’enregistrer l’image : sa mémoire '
            + 'locale est pleine, ou désactivée en navigation privée. Remettez une face au dé '
            + 'officiel pour faire de la place, puis réessayez.';
          return;
        }
        rafraichir();
      }).catch((err) => {
        message.textContent = err && err.message === 'decodage'
          ? `« ${f.name} » n’a pas pu être décodée : essayez un PNG.`
          : `« ${f.name} » n’a pas pu être lue : essayez un autre fichier.`;
      });
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
      // Une étiquette, pas un bouton qui cliquerait le champ à votre place :
      // c'est le navigateur lui-même qui ouvre le sélecteur, et cela marche
      // partout — y compris là où un `click()` programmé reste sans effet.
      h('label.btn.btn--petit.btn--fichier', fichier, 'Importer une image…'),
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
 * Le tableau des cartes pour gagner : une colonne par nombre de joueurs, et
 * deux lignes — les équipes, puis le joueur Vert, qui joue seul contre elles.
 *
 * Le tableau est propre au mode de jeu affiché : les manches n'ont pas la même
 * durée d'un mode à l'autre, un objectif posé pour l'un n'a rien à faire dans
 * l'autre.
 */
function tableauCartes(nbCourant, mode, rafraichir) {
  const equipes = tableCartes(mode);
  const vert = tableCartesVert(mode);
  const officielles = cartesOfficielles(mode);
  const surMesure = NOMBRES_JOUEURS.some((n) => equipes[n] !== officielles[n]
    || (n % 2 === 1 && vert[n] !== equipes[n]));
  const champ = (n, valeur, estVert) => h('input.champ-mini', {
    type: 'number', value: valeur, min: 1, max: 12, step: 1,
    title: estVert
      ? `Cartes que le joueur Vert doit réunir à ${n} joueurs`
      : `Cartes qu’une équipe doit réunir à ${n} joueurs — par défaut ${officielles[n]}`,
    onchange: (e) => { ecrireCartes(mode, n, e.target.value, estVert); rafraichir(); },
  });
  return h('div', { style: { marginTop: '16px' } },
    h('div.rangee', { style: { marginBottom: '8px' } },
      h('div.titre-section', { style: { margin: 0 } }, 'Cartes pour gagner, par nombre de joueurs'),
      h('div.pousse'),
      surMesure
        ? h('button.btn.btn--petit', {
            title: `Remettre les valeurs de départ du mode ${NOM_MODE[mode]}`,
            onclick: () => {
              const v = variables();
              if (v.cartesParMode) delete v.cartesParMode[mode];
              if (v.cartesVertParMode) delete v.cartesVertParMode[mode];
              delete v.cartesPourGagner;
              delete v.cartesVert;
              enregistrerReglages(v);
              rafraichir();
            },
          }, 'Valeurs de départ')
        : null,
    ),
    h('div.tbl-defile', h('table.tbl.tbl--lots',
      h('thead', h('tr',
        h('th', 'Joueurs'),
        ...NOMBRES_JOUEURS.map((n) => h('th.num', { class: n === nbCourant ? 'col-courante' : '' },
          String(n))))),
      h('tbody',
        h('tr',
          h('td', 'Une équipe'),
          ...NOMBRES_JOUEURS.map((n) => h('td.num', { class: n === nbCourant ? 'col-courante' : '' },
            champ(n, equipes[n], false)))),
        h('tr',
          h('td', 'Le joueur Vert'),
          // Le Vert n'existe qu'à nombre impair : ailleurs, la case n'aurait
          // personne à qui s'appliquer.
          ...NOMBRES_JOUEURS.map((n) => h('td.num', { class: n === nbCourant ? 'col-courante' : '' },
            n % 2 === 1 ? champ(n, vert[n], true) : h('span.mini.muted', '—')))),
      ))),
    h('p.mini.muted', { style: { marginTop: '8px' } },
      `Mode ${NOM_MODE[mode]} : ${officielles[3]} cartes par défaut, quel que soit l’effectif. `
      + 'À nombre impair le Vert joue seul contre deux équipes — c’est l’asymétrie la plus '
      + 'sensible du jeu, et cette ligne est là pour la corriger. La même valeur que les '
      + 'équipes le fait gagner aux mêmes conditions.'),
  );
}

/**
 * Le tableau des lots : une ligne par nombre de joueurs, éditable.
 *
 * @param {number} nbCourant  l'effectif choisi sur l'accueil — sa ligne est
 *   mise en avant, pour qu'on voie laquelle s'appliquera à la prochaine partie.
 */
function tableauLots(nbCourant, rafraichir) {
  const table = tableLots();
  const officiels = lotsOfficiels();
  const surMesure = NOMBRES_JOUEURS.some((n) => table[n] !== officiels[n]);
  return h('div', { style: { marginTop: '14px' } },
    h('div.rangee', { style: { marginBottom: '8px' } },
      h('div.titre-section', { style: { margin: 0 } }, 'Lots en jeu, par nombre de joueurs'),
      h('div.pousse'),
      surMesure
        ? h('button.btn.btn--petit', {
            title: 'Remettre les sept lignes aux valeurs du tableau officiel',
            onclick: () => {
              const v = variables();
              delete v.lotsParJoueurs;
              delete v.lots;
              enregistrerReglages(v);
              rafraichir();
            },
          }, 'Tableau officiel')
        : null,
    ),
    h('div.tbl-defile', h('table.tbl.tbl--lots',
      h('thead', h('tr',
        h('th', 'Joueurs'),
        ...NOMBRES_JOUEURS.map((n) => h('th.num', { class: n === nbCourant ? 'col-courante' : '' }, String(n))))),
      h('tbody', h('tr',
        h('td', 'Lots'),
        ...NOMBRES_JOUEURS.map((n) => h('td.num', { class: n === nbCourant ? 'col-courante' : '' },
          h('input.champ-mini', {
            type: 'number', value: table[n], min: 1, max: 12, step: 1,
            title: `Lots en jeu à ${n} joueurs — officiel : ${officiels[n]}`,
            onchange: (e) => { ecrireLots(n, e.target.value); rafraichir(); },
          }))))),
    )),
    h('p.mini.muted', { style: { marginTop: '8px' } },
      `Le tableau officiel prévoit ${NOMBRES_JOUEURS.map((n) => `${officiels[n]} à ${n}`).join(', ')}. `
      + `La colonne en relief est celle de votre table — ${nbCourant} joueurs.`),
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
        // La fiche de règles : ce qui est réglé ici, mis en forme pour une
        // vraie table. C'est de la page Réglages qu'on la demande, parce que
        // c'est elle qu'on vient de remplir.
        h('button.btn.btn--primaire.btn--petit', {
          onclick: () => aller('/fiche'),
          title: 'Les règles de cette partie, prêtes à imprimer ou à enregistrer en PDF',
        }, 'Fiche de règles (PDF)'),
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

      // ── Mode de jeu et sens de rotation ───────────────────────────────────
      // Les deux premiers réglages de la page, côte à côte : ils changent la
      // forme d'une manche, et donc la lecture de tous les autres. Ils se
      // règlent à part l'un de l'autre — les trois façons de jouer se marient
      // avec les deux façons de tourner.
      h('div.carte',
        h('div.grille.grille--2', { style: { gap: '18px' } },
          h('div',
            titreAide('Comment se joue une manche', [
              AIDE_MANCHE[modeManche(cfg)],
              estImmediat(cfg)
                ? 'Deux façons de prendre la manche, donc : sortir l’Abri, ou attraper son '
                  + 'voisin. Le reste des réglages tient — les dés, les combinaisons, le rythme. '
                  + 'Seuls les jetons sortent du jeu, avec les cartes Tornade qui les manipulent.'
                : '',
              estCompromis(cfg)
                ? 'Deux façons de prendre la manche, là aussi : mettre à l’Abri tous les jetons '
                  + 'que la Tornade du jour demande, ou envoyer un adversaire valser dans la '
                  + 'tornade d’une collision réussie. Le nombre de jetons demandés se règle carte '
                  + 'par carte, plus bas, dans « Cartes Tornade en jeu ».'
                : '',
            ]),
            h('div.segment.segment--plein',
              ...OPTIONS_MANCHE.map(([id, lib]) => h('button', {
                class: modeManche(cfg) === id ? 'on' : '',
                onclick: () => { ecrire('modeManche', id); dessiner(); },
              }, lib)),
            ),
          ),
          h('div',
            titreAide('Le sens de rotation', [
              AIDE_SENS[sensRotation(cfg)],
              sensRotation(cfg) === 'perdants'
                ? 'Un sens vaut ce que valent ses voisins : on n’attrape que son voisin d’aval, '
                  + 'et seul son voisin d’amont peut vous attraper. Retourner la carte, c’est '
                  + 'donc changer de proie et de prédateur d’un même geste. Les équipes menées '
                  + 'par l’ordinateur pèsent les deux sens et ne retournent la carte que si elles '
                  + 'y gagnent. Quand vous recevez les dés, la partie s’arrête le temps que vous '
                  + 'décidiez ; sans réponse, la carte reste en place.'
                : '',
            ]),
            h('div.segment.segment--plein',
              ...OPTIONS_SENS.map(([id, lib]) => h('button', {
                class: sensRotation(cfg) === id ? 'on' : '',
                onclick: () => { ecrire('sensRotation', id); dessiner(); },
              }, lib)),
            ),
          ),
        ),
      ),

      // ── Dés ───────────────────────────────────────────────────────────────
      h('div.carte',
        titreAide('Dés', [
          `Le lot compte ${cfg.desParLot} dés. Combien de lots tournent autour de la table `
          + `dépend du nombre de joueurs : le tableau ci-dessous en donne un par effectif, et la `
          + `partie lit sa ligne. À ${nb} joueurs, ce sera ${cfg.lots} lot${cfg.lots > 1 ? 's' : ''}`
          + `${cfg.lots === mep.lots ? ' — la valeur officielle' : ` au lieu des ${mep.lots} officiels`}.`,
          `Le d6 est le dé du jeu : 2 « ${nomSymbole('tornade')} », 1 « ${nomSymbole('x')} », `
          + `1 « ${nomSymbole('vache')} », 2 « ${nomSymbole('zzz')} ». Le symbole qui fige le dé `
          + 'ne se relance jamais. Le dé a six faces, et c’est un réglage du jeu qui ne bouge '
          + 'plus ; chaque face, elle, se change une à une dans les menus ci-dessous.',
          'Ni joker ni éclair au départ : posez-les vous-même sur une face pour les essayer. Le '
          + 'joker prend la face de n’importe quel symbole sauf celui qui fige le dé ; le joker '
          + `double ne remplace que l’éclair et le « ${nomSymbole('zzz')} ». Sans face éclair, la `
          + 'combinaison Attaque ne peut pas sortir — '
          + 'passez le déclencheur sur « Échecs » pour garder une attrape.',
        ]),
        // Le nombre de dés d'un lot tient en deux chiffres : il n'a pas besoin
        // d'une ligne à lui. Les six faces du dé se posent à côté, sur la même,
        // puisque c'est la composition du même lot qu'on lit.
        h('div.rangee.rangee--des',
          num('Dés par lot', cfg.desParLot, 'desParLot', { min: 1, max: 12 }),
          h('div.faces-edit',
            ...cfg.faces.map((f, i) => h('div.face-case',
              pastilleSymbole(f, 34),
              h('select', {
                onchange: (e) => {
                  const faces = cfg.faces.slice();
                  faces[i] = e.target.value;
                  ecrire('faces', faces);
                  dessiner();
                },
              }, ...ORDRE_SYMBOLES.map((sy) => h('option', {
                value: sy, selected: sy === f,
              // Le nom affiché, pas celui du moteur : la pastille montre un
              // réveil, le menu doit dire « Réveil ».
              }, nomSymbole(sy)))),
            )),
          ),
        ),

        // Les lots en jeu ne sont pas un nombre mais un tableau : trois lots à
        // six joueurs n'ont rien à voir avec trois lots à trois. Chaque ligne se
        // règle à part, et la partie lit celle de son effectif.
        tableauLots(nb, dessiner),
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
            title: `Trois jokers d’un coup font partir le lot, comme deux « ${nomSymbole('x')} »`,
            onclick: () => { ecrire('echecJokers', cfg.echecJokers === false); dessiner(); },
          }, h('span.case', '✓'), 'Trois jokers = échec'),
        ),
        tableauCombos(cfg, {
          ecrireCombo: (id, requis) => ecrire('combos', { ...(v.combos || {}), [id]: requis }),
          ecrireVert: (id, requis) => ecrire('combosVert', { ...(v.combosVert || {}), [id]: requis }),
          ecrireFace: (id, face) => ecrire('combosFaces', { ...(v.combosFaces || {}), [id]: face }),
          rafraichir: dessiner,
        }),

        // Les trois réglages de l'attrape se lisent ensemble : ce qui la
        // déclenche, ce qu'elle rapporte, et ce que devient le lot qu'on tenait.
        // Les séparer en trois cartes obligeait à faire l'aller-retour.
        h('div.grille.grille--4', { style: { gap: '18px', marginTop: '18px' } },
          h('div',
            titreAide('Ce qui déclenche l’attrape', [
              AIDE_DECLENCHEUR[cfg.attrapeSur || 'eclair'],
              cfg.attrapeSur === 'echec'
                ? (cfg.attrapeEveille !== false
                  ? 'Tornade endormie, l’Échec reste un échec sec : on passe le lot sans tenter '
                    + 'le contact. Il faut s’être réveillé pour attraper au passage.'
                  : 'L’attrape sur Échec vaut même endormi : chaque Échec tente le contact, dès '
                    + 'que le voisin a un lot.')
                : 'La case « Il faut être réveillé » ne concerne que l’attrape sur Échec — '
                  + 'l’Attaque vaut dans les deux états.',
              'Dans les deux cas, on n’attrape que ce qui existe : si le joueur suivant a les '
              + 'mains vides, il ne se passe rien.',
            ]),
            h('div.segment.segment--plein',
              ...OPTIONS_DECLENCHEUR.map(([id, lib]) => h('button', {
                class: (cfg.attrapeSur || 'eclair') === id ? 'on' : '',
                // Le dé ne bouge plus : les deux combinaisons restent réglables
                // dans le tableau, et c'est là qu'on décide de leurs dés.
                onclick: () => { ecrire('attrapeSur', id); dessiner(); },
              }, lib)),
            ),
            h('div.rangee.rangee--serree', { style: { marginTop: '8px' } },
              h('button', {
                class: `chip${cfg.attrapeEveille !== false ? ' on' : ''}`,
                title: 'Un dormeur ne tend pas la main pour attraper son voisin',
                onclick: () => { ecrire('attrapeEveille', cfg.attrapeEveille === false); dessiner(); },
              }, h('span.case', '✓'), 'Il faut être réveillé'),
            ),
          ),

          // Réglable dans les trois modes. Sans les points, « touche » est la
          // valeur de départ : c'est la base du mode, l'attrape y étant le
          // second moyen de prendre une manche.
          h('div',
            titreAide('Ce que rapporte l’attrape', [
              AIDE_ATTRAPE[cfg.attrapeGagneManche || 'non'],
              !estJeton(cfg) && cfg.attrapeGagneManche !== 'touche'
                ? 'Attention : sans les points, « Un jeton » ne rapporte rien — il n’y a plus de '
                  + 'jeton à retourner. Le contact interrompt son voisin, et c’est tout. Reprenez '
                  + '« Manche gagnée si le contact réussit » pour rendre l’attrape payante.'
                : '',
            ]),
            h('div.segment.segment--plein',
              ...OPTIONS_ATTRAPE.map(([id, lib]) => h('button', {
                class: (cfg.attrapeGagneManche || 'non') === id ? 'on' : '',
                onclick: () => { ecrire('attrapeGagneManche', id); dessiner(); },
              }, lib)),
            ),
          ),

          h('div',
            titreAide('Quand une combinaison sort', [
              AIDE_COMBO_SERVIE[cfg.comboServie === 'choix' ? 'choix' : 'auto'],
              cfg.comboServie === 'choix'
                ? 'À la table, le lot vous reste en main : relancez les dés que vous voulez, ou '
                  + 'encaissez la combinaison d’un bouton. Les IA gardent ce qu’elles visaient et '
                  + 'relancent le reste — une Pénible ne se réveille plus quand elle cherchait à '
                  + 'endormir.'
                : '',
            ]),
            h('div.segment.segment--plein',
              ...OPTIONS_COMBO_SERVIE.map(([id, lib]) => h('button', {
                class: (cfg.comboServie === 'choix' ? 'choix' : 'auto') === id ? 'on' : '',
                onclick: () => { ecrire('comboServie', id); dessiner(); },
              }, lib)),
            ),
          ),

          h('div',
            titreAide('Quand deux lots se rencontrent',
              cfg.lotsCumules
                ? 'Les lots s’accumulent dans la même main : on joue le premier arrivé, les '
                  + 'autres attendent leur tour. Un joueur lent peut se retrouver avec toute la '
                  + 'table sur les bras.'
                : 'Règle de base : le lot que l’on tenait part aussitôt vers le voisin suivant — '
                  + 'la poussée peut se propager — et l’on enchaîne sur celui qui vient '
                  + 'd’arriver.'),
            h('div.segment.segment--plein',
              ...[['pousse', 'Le lot en cours est poussé'], ['cumul', 'Les lots s’empilent']]
                .map(([id, lib]) => h('button', {
                  class: (cfg.lotsCumules ? 'cumul' : 'pousse') === id ? 'on' : '',
                  onclick: () => { ecrire('lotsCumules', id === 'cumul'); dessiner(); },
                }, lib)),
            ),
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
          estImmediat(cfg)
            ? 'Immédiat : les jetons ne servent plus, leurs champs restent grisés. Une manche '
              + 'vaut une carte, et l’on joue en quatre par défaut.'
            : '',
          estCompromis(cfg)
            ? `Compromis : chaque équipe a ${cfg.jetonsRefuge || 3} jetons de sa couleur à mettre `
              + 'à l’Abri. Les compteurs de jetons de la règle de base ne servent plus, leurs '
              + 'champs restent grisés ; on joue en cinq cartes par défaut.'
            : '',
          'Toutes ces valeurs se règlent à la main : en modifier une décroche le tableau '
          + 'officiel. Recocher « Suivre le tableau officiel » les remet toutes d’aplomb.',
          nb % 2
            ? 'Le Vert joue seul contre deux équipes : « Cartes du Vert » règle son objectif à '
              + 'part, pour l’alléger ou l’alourdir sans toucher aux Bleus ni aux Jaunes. Laissez '
              + `la même valeur (${cfg.cartesPourGagner}) pour qu’il gagne aux mêmes conditions.`
            : '',
          // Sans les points, la manche est une course où chacun joue pour soi :
          // le Vert, seul contre deux équipes, la perd presque toujours. Mesuré
          // sur 300 parties d'IA équilibrées.
          nb % 2 && !estJeton(cfg)
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
            { min: 1, max: 12, disabled: !estJeton(cfg) }),
          num('Jetons du Vert', cfg.jetonsVert, 'jetonsVert',
            { min: 1, max: 12, disabled: !estJeton(cfg) }),
          // Compromis : les jetons de sa couleur qu'une équipe peut mettre à
          // l'Abri — le plafond de ce qu'une Tornade peut demander.
          estCompromis(cfg)
            ? num('Jetons à l’Abri', cfg.jetonsRefuge, 'jetonsRefuge', { min: 1, max: 6 })
            : null,
          num('Manches maximum', cfg.manchesMax, 'manchesMax', { min: 1, max: 200 }),
        ),

        // Les cartes pour gagner ne sont pas un nombre : elles dépendent du
        // nombre de joueurs, et le Vert — seul contre deux équipes — a le sien.
        tableauCartes(nb, modeManche(cfg), dessiner),

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
          `Taux d’erreur : la part des gestes où l’on relance par mégarde un « ${nomSymbole('x')} » — ce qui fait `
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
        titreAide(
          `Cartes Tornade en jeu — ${NOM_MODE[modeManche(cfg)]} · `
          + `${cartesEnJeu(cfg).length}/${cartesDuMode(cfg).length}`, [
          'Une carte par manche, dans l’ordre de la pile. Décochez celles que vous ne voulez pas '
          + 'voir sortir — le compte du titre dit combien sont en jeu sur le total du mode.',
          'Chaque mode de jeu a son propre paquet : ce que vous cochez ici ne vaut que pour '
          + `« ${NOM_MODE[modeManche(cfg)]} ». Changez de `
          + 'mode en haut de la page et vous retrouverez l’autre paquet, intact.',
          estJeton(cfg)
            ? 'La pile démarre par « Jour de chauffe » s’il est coché ; le reste suit, mélangé ou non.'
            : 'La pile démarre par « Tornade de feuille » — la manche de chauffe — puis le reste '
              + 'suit. On révèle une Tornade, on la joue ; le dos de la suivante, encore face '
              + 'cachée, donne le sens de rotation de la manche en cours.',
          estJeton(cfg)
            ? ''
            : 'Une carte qui vaut deux points se paie sur la pioche : l’équipe prend la carte en '
              + 'cours et celle du dessus, gardée face cachée dans sa pile.',
          estCompromis(cfg)
            ? 'Chaque carte porte en plus le nombre de jetons à mettre à l’Abri pour prendre la '
              + 'manche sous elle — de un à trois. C’est le levier d’équilibrage propre à ce '
              + 'mode : une Tornade exigeante fait une manche longue, une Tornade légère une '
              + 'manche expédiée.'
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
                    // Et ce qui était proposé au moment du choix : une carte
                    // ajoutée au jeu plus tard n'aura pas été décochée, elle
                    // n'existait pas. Sans cette trace, elle manquerait.
                    ecrire(cleVues(cfg), cartesDuMode(cfg).map((x) => x.id));
                    dessiner();
                  },
                }, h('span.case', '✓'), c.court),
                h('div.pousse'),
              ),
              h('div.petit', { style: { marginTop: '8px' } }, c.texte),
              note ? h('div.mini.muted', { style: { marginTop: '6px' } }, note) : null,
              // Compromis : combien de jetons cette Tornade demande de mettre à
              // l'Abri. C'est le réglage propre au mode, sur la carte elle-même.
              estCompromis(cfg)
                ? h('div.rangee.rangee--serree', { style: { marginTop: '10px' } },
                    h('span.mini.muted', 'Jetons à l’Abri'),
                    h('div.pousse'),
                    h('input.champ-mini', {
                      type: 'number', value: refugePour(cfg, c),
                      min: 1, max: cfg.jetonsRefuge || 3, step: 1,
                      title: `Sous « ${c.court} », il faut mettre ce nombre de jetons de sa `
                        + 'couleur à l’Abri pour prendre la manche.',
                      onchange: (e) => {
                        ecrire('refugeCartes', {
                          ...(v.refugeCartes || {}),
                          [c.id]: Math.max(1, Math.round(Number(e.target.value) || 1)),
                        });
                        dessiner();
                      },
                    }))
                : null,
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
          'Les quatre faces du jeu se réhabillent quand vous voulez : le soleil qui réveille, la '
          + 'grange où l’on s’abrite, la lune du sommeil et la tornade rouge qui fige le dé. '
          + 'Reprenez un dessin d’avant, choisissez une autre pastille, ou importez votre propre '
          + 'image — elle est découpée en rond, comme une face de dé.',
          'Le pouvoir ne change pas d’un iota : même symbole pour le moteur, même combinaison, '
          + 'même effet. Seuls le dessin et le nom affiché changent, partout sur le site.',
          'Le mieux est un PNG carré avec un rond au centre et de la transparence autour : le '
          + 'fond blanc du dé reste à la charge de la page, et votre rond se pose exactement à la '
          + 'place des dessins du jeu. Une image opaque marche aussi — elle est alors découpée en '
          + 'rond.',
          'La taille n’a pas d’importance : l’image est ramenée à 256 px et ré-encodée en PNG au '
          + 'moment de l’import, transparence comprise. Elle est ensuite enregistrée dans ce '
          + 'navigateur, en clair dans la page : pas de fichier à héberger, rien qui parte vers '
          + 'l’extérieur.',
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

