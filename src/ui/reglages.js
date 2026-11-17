// Page Réglages : tout ce qui se règle, sur une seule page. Les règles vont dans
// le réglage actif (profils.js) ; les préférences de table — noms, effectifs,
// graine — valent pour tous les réglages.

import { h, remplacer, telecharger } from './dom.js?v=2.10';
import { store } from './store.js?v=2.10';
import { aller } from './app.js?v=2.10';
import { suiteSymboles } from './icons.js?v=2.10';
import { SONS, NOMS_SONS, sonsActifs, volumeSons, reglerSons, reglerVolume, jouerSon, eveillerSons } from './sons.js?v=2.10';
import { randomSeed } from '../core/rng.js?v=2.10';
import {
  SYMBOLES, ORDRE_SYMBOLES, COMBOS, CARTES, NOMBRES_JOUEURS, JOUEURS_MIN, JOUEURS_MAX, RYTHME,
  configDepuis, valeurTable, ecartsDeRegles, requisCarte, noteCarte, bornerJoueurs,
} from '../core/config.js?v=2.10';
import {
  reglagesCourants, enregistrerReglages, reglesOfficielles, barreProfils, idActif, ID_OFFICIELLES,
  officiellesLocales, retablirOfficielles, fichierReglesOfficielles, validerReglesOfficielles,
  selectionnerProfil, nomActif,
} from './profils.js?v=2.10';

// ── Préférences de table ─────────────────────────────────────────────────────
export const NOMS_ORIGINE = ['Valentin', 'Sylvain', 'Justine', 'Noël', 'Clément', 'Budi'];
export const prefsTable = () => store.get('table', {});
function ecrirePref(cle, valeur) { store.set('table', { ...prefsTable(), [cle]: valeur }); }

/** Le nom par défaut d'une place. */
export function nomParDefaut(i) {
  const n = (prefsTable().noms || [])[i];
  return (typeof n === 'string' && n.trim()) || NOMS_ORIGINE[i] || `Joueur ${i + 1}`;
}

/** Les effectifs proposés à l'accueil et au Laboratoire. */
export function nombresJoueursPermis() {
  const p = prefsTable();
  const min = bornerJoueurs(p.joueursMin ?? JOUEURS_MIN);
  const max = Math.max(min, bornerJoueurs(p.joueursMax ?? JOUEURS_MAX));
  return NOMBRES_JOUEURS.filter((n) => n >= min && n <= max);
}
export function joueursDansBornes(n) {
  const permis = nombresJoueursPermis();
  return Math.min(permis[permis.length - 1], Math.max(permis[0], bornerJoueurs(n)));
}

/** La graine de la prochaine partie : celle qu'on a fixée, ou une nouvelle. */
export function graineDePartie() {
  const p = prefsTable();
  return p.graineFixe && p.graine ? String(p.graine) : randomSeed();
}

/** La configuration de la partie à `nb` joueurs, selon le réglage actif. */
export const configPartie = (nb) => configDepuis(reglagesCourants(), nb);

/** Ce qui s'écarte des Règles officielles à `nb` joueurs. */
export const ecartsAuxOfficielles = (nb) => ecartsDeRegles(reglagesCourants(), reglesOfficielles().reglages, nb);

// ── La page ──────────────────────────────────────────────────────────────────
const LIGNES_MEP = [
  ['lots', 'Lots de dés en jeu'],
  ['jetons', 'Jetons Équipe sur la Tornade'],
  ['jetonsVert', '… pour le Cow-boy'],
  ['cartes', 'Cartes Tornade pour gagner'],
  ['cartesVert', '… pour le Cow-boy'],
];
const LIBELLES_RYTHME = {
  dureeLancer: 'Les dés roulent', dureeConstat: 'On constate le jet', dureePassage: 'Le lot traverse',
  dureeTransition: 'Entre deux manches', tempsReflexion: 'Réflexion des IA', ecartReflexion: '± d’un coup à l’autre',
};
const ETATS = { endormi: 'Endormi', eveille: 'Réveillé', tous: 'Les deux faces' };

export function vueReglages() {
  const racine = h('div.page.page-reglages');

  function ecrire(cle, valeur) {
    enregistrerReglages({ ...reglagesCourants(), [cle]: valeur });
    dessiner();
  }

  /** Champ numérique ; il se colore quand la valeur n'est pas l'officielle. */
  const champNb = (valeur, { min = 1, max = 12, pas = 1, officiel, onchange, titre }) => h('input', {
    type: 'number', min, max, step: pas, value: valeur, title: titre,
    class: `saisie${officiel !== undefined && Number(valeur) !== Number(officiel) ? ' saisie--ecart' : ''}`,
    onchange: (e) => {
      const x = Number(e.target.value);
      onchange(Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : valeur);
    },
  });

  /** Une exigence « n fois tel symbole ». */
  function editeurRequis(requis, officiel, max, onchange) {
    const [sym, n] = Object.entries(requis)[0];
    const [symO, nO] = Object.entries(officiel)[0];
    return h('span.requis-edit',
      champNb(n, { max, officiel: nO, onchange: (v) => onchange({ [sym]: v }) }),
      '×',
      h('select', { class: sym !== symO ? 'saisie--ecart' : '', onchange: (e) => onchange({ [e.target.value]: n }) },
        ...ORDRE_SYMBOLES.map((s) => h('option', { value: s, selected: s === sym }, SYMBOLES[s].nom))),
      h('span.requis-apercu', suiteSymboles(requis, 18)));
  }

  function blocOfficielles(r, off) {
    if (idActif() === ID_OFFICIELLES) {
      return h('div.mini.muted.note-profil',
        'Ce que vous modifiez ici redéfinit les Règles officielles dans ce navigateur. ',
        officiellesLocales() ? [
          h('button.lien', { onclick: () => { retablirOfficielles(); dessiner(); } }, 'Revenir aux règles du site'),
          ' · ',
          h('button.lien', {
            title: 'Le fichier à publier pour que tous les visiteurs du site aient ces règles',
            onclick: () => telecharger('regles-officielles.js', fichierReglesOfficielles(), 'text/javascript;charset=utf-8'),
          }, 'Télécharger leur fichier'),
        ] : 'Elles sont, pour l’instant, les Règles V6 telles qu’elles sont écrites.');
    }
    // Les écarts, tous effectifs confondus.
    const ecarts = new Map();
    for (const nb of NOMBRES_JOUEURS) {
      for (const e of ecartsDeRegles(r, off, nb)) {
        const cle = `${e.libelle}|${e.jouee}|${e.officielle}`;
        if (!ecarts.has(cle)) ecarts.set(cle, { ...e, nbs: [] });
        ecarts.get(cle).nbs.push(nb);
      }
    }
    const liste = [...ecarts.values()];
    return h('div.note-profil',
      liste.length
        ? h('div.encart.encart--officielles',
            h('strong.encart-titre', `« ${nomActif()} » s’écarte des Règles officielles`),
            h('ul.ecarts-officielles', ...liste.map((e) => h('li',
              h('strong', e.libelle), e.nbs.length < NOMBRES_JOUEURS.length ? ` (à ${e.nbs.join(', ')} joueurs)` : '',
              ` : ${e.jouee} `, h('span.muted', `(officiel : ${e.officielle})`)))))
        : h('div.mini.muted', `« ${nomActif()} » suit les Règles officielles.`),
      h('div.rangee.rangee--serree', { style: { marginTop: '8px' } },
        liste.length ? h('button.btn.btn--petit', {
          title: 'Ce réglage devient les Règles officielles, dans ce navigateur',
          onclick: () => { validerReglesOfficielles(r); selectionnerProfil(ID_OFFICIELLES); dessiner(); },
        }, 'En faire les Règles officielles') : null,
        liste.length ? h('button.btn.btn--petit', {
          onclick: () => { enregistrerReglages(off); dessiner(); },
        }, 'Le remettre aux Règles officielles') : null));
  }

  function carteMiseEnPlace(r, off) {
    const equipes = (nb) => `${Math.floor(nb / 2)} + ${Math.floor(nb / 2)}${nb % 2 ? ' + Cow-boy' : ''}`;
    return h('div.carte',
      h('div.titre-section', 'Mise en place'),
      h('div.tbl-defile', h('table.tbl.tbl--reglages',
        h('thead', h('tr', h('th', 'Joueurs'), ...NOMBRES_JOUEURS.map((n) => h('th.num', String(n))))),
        h('tbody',
          h('tr', h('td', 'Vaches + Poules'), ...NOMBRES_JOUEURS.map((n) => h('td.num.mini.muted', equipes(n)))),
          ...LIGNES_MEP.map(([table, libelle]) => h('tr', h('td', libelle),
            ...NOMBRES_JOUEURS.map((n) => h('td.num', table.endsWith('Vert') && n % 2 === 0
              ? h('span.muted', '—')
              : champNb(valeurTable(r, table, n), {
                  officiel: valeurTable(off, table, n),
                  onchange: (v) => ecrire(table, { ...(r[table] || {}), [n]: v }),
                })))))),
      )),
      h('div.rangee', { style: { marginTop: '12px' } },
        h('label.champ-ligne', 'Dés par lot', champNb(configDepuis(r).desParLot, {
          officiel: configDepuis(off).desParLot, onchange: (v) => ecrire('desParLot', v),
        })),
        h('label.champ-ligne', { title: 'Garde-fou : la partie s’arrête là si personne n’a gagné' }, 'Manches au plus',
          champNb(configDepuis(r).manchesMax, { max: 200, onchange: (v) => ecrire('manchesMax', v) })),
        h('label.champ-ligne',
          h('input', { type: 'checkbox', checked: r.melangerCartes !== false, onchange: (e) => ecrire('melangerCartes', e.target.checked) }),
          'Pioche mélangée'),
      ),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        'Jetons Équipe : par équipe, posés sur la carte Tornade au début de chaque manche ; chaque Abri en récupère un, '
        + 'et l’équipe qui récupère son dernier gagne la manche. Les Jaunes reçoivent les lots à la première manche, '
        + 'puis l’équipe perdante ; le Cow-boy prend toujours le lot restant.'),
    );
  }

  function carteDes(r, off) {
    const cfg = configDepuis(r);
    const ref = configDepuis(off);
    return h('div.carte',
      h('div.titre-section', 'Dé et combinaisons'),
      h('div.rangee.rangee--serree.faces-de',
        h('span.petit', 'Les 6 faces'),
        ...cfg.faces.map((f, i) => h('select', {
          class: f !== ref.faces[i] ? 'saisie--ecart' : '',
          onchange: (e) => ecrire('faces', cfg.faces.map((x, k) => (k === i ? e.target.value : x))),
        }, ...ORDRE_SYMBOLES.map((s) => h('option', { value: s, selected: s === f }, SYMBOLES[s].nom)))),
        h('span.requis-apercu', ...cfg.faces.map((f) => suiteSymboles({ [f]: 1 }, 20))),
      ),
      h('div.tbl-defile', { style: { marginTop: '10px' } }, h('table.tbl.tbl--reglages',
        h('thead', h('tr', h('th', 'Combinaison'), h('th', 'Carte Rôle'), h('th', 'Dés demandés'))),
        h('tbody', ...cfg.combos.map((c, i) => h('tr',
          h('td', h('strong', c.nom), h('div.mini.muted', COMBOS[i].effet)),
          h('td.mini', ETATS[c.etat]),
          h('td', editeurRequis(c.requis, ref.combos[i].requis, cfg.desParLot,
            (requis) => ecrire('combos', { ...(r.combos || {}), [c.id]: requis })))))))),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        'Une tornade ne se relance plus. Une combinaison formée est jouée aussitôt, puis le lot passe au voisin.'),
    );
  }

  function carteCartes(r, off) {
    const cfg = configDepuis(r);
    const ref = configDepuis(off);
    const exclues = new Set(r.cartesExclues || []);
    const basculer = (id, dedans) => {
      const s = new Set(exclues);
      if (dedans) s.delete(id); else s.add(id);
      ecrire('cartesExclues', [...s]);
    };
    return h('div.carte',
      h('div.rangee',
        h('div.titre-section', { style: { margin: 0 } }, `Cartes Tornade — ${cfg.cartes.length} cochées sur ${CARTES.length}`),
        h('div.pousse'),
        h('button.btn.btn--petit', { onclick: () => ecrire('cartesExclues', []) }, 'Toutes'),
      ),
      h('div.liste-cartes', ...CARTES.map((carte) => {
        const dedans = !exclues.has(carte.id);
        const note = noteCarte(carte, cfg);
        return h('label.ligne-carte', { class: dedans ? '' : 'ligne-carte--hors' },
          h('input', { type: 'checkbox', checked: dedans, onchange: (e) => basculer(carte.id, e.target.checked) }),
          h('span.ligne-carte-nom', carte.nom),
          h('span.ligne-carte-texte',
            carte.combo ? editeurRequis(requisCarte(cfg, carte), requisCarte(ref, carte), cfg.desParLot,
              (requis) => ecrire('combosCartes', { ...(r.combosCartes || {}), [carte.id]: requis })) : null,
            carte.combo ? ' → ' : '', carte.texte,
            note ? h('span.mini.muted', ` — ${note}`) : null),
        );
      })),
    );
  }

  function carteTable() {
    const p = prefsTable();
    const permis = nombresJoueursPermis();
    const choix = (cle, valeur) => h('select', { onchange: (e) => { ecrirePref(cle, Number(e.target.value)); dessiner(); } },
      ...NOMBRES_JOUEURS.map((n) => h('option', { value: n, selected: n === valeur }, String(n))));
    return h('div.carte',
      h('div.titre-section', 'Table'),
      h('div.rangee',
        h('label.champ-ligne', 'Joueurs : de', choix('joueursMin', permis[0])),
        h('label.champ-ligne', 'à', choix('joueursMax', permis[permis.length - 1])),
      ),
      h('div.petit', { style: { margin: '12px 0 6px' } }, 'Noms par défaut des places'),
      h('div.grille-noms', ...NOMS_ORIGINE.map((origine, i) => h('input', {
        type: 'text', maxLength: 20, value: nomParDefaut(i), placeholder: origine,
        onchange: (e) => {
          const noms = NOMS_ORIGINE.map((_, k) => nomParDefaut(k));
          noms[i] = e.target.value.trim() || origine;
          ecrirePref('noms', noms);
          dessiner();
        },
      }))),
      h('div.rangee', { style: { marginTop: '12px' } },
        h('label.champ-ligne', { title: 'Une même graine rejoue la même partie, dé pour dé' },
          h('input', { type: 'checkbox', checked: !!p.graineFixe, onchange: (e) => { ecrirePref('graineFixe', e.target.checked); dessiner(); } }),
          'Graine fixée'),
        p.graineFixe ? h('input', {
          type: 'text', value: p.graine || '', placeholder: 'tornade-1234', style: { flex: '1 1 140px' },
          onchange: (e) => ecrirePref('graine', e.target.value.trim()),
        }) : h('span.mini.muted', 'Chaque partie tire la sienne.'),
      ),
      h('div.rangee', { style: { marginTop: '12px' } },
        h('label.champ-ligne',
          h('input', { type: 'checkbox', checked: sonsActifs(), onchange: (e) => { reglerSons(e.target.checked); dessiner(); } }),
          'Sons'),
        h('input', {
          type: 'range', min: 0, max: 1, step: 0.05, value: volumeSons(), title: 'Volume', style: { flex: '1 1 100px' },
          oninput: (e) => reglerVolume(e.target.value),
        }),
        ...SONS.map((s) => h('button.btn.btn--petit', {
          title: NOMS_SONS[s], onclick: () => { eveillerSons(); jouerSon(s); },
        }, `▸ ${NOMS_SONS[s].split(' — ')[0]}`)),
      ),
    );
  }

  function carteRythme(r) {
    const cfg = configDepuis(r);
    const modifie = Object.keys(RYTHME).some((k) => cfg[k] !== RYTHME[k]);
    return h('div.carte',
      h('div.rangee',
        h('div.titre-section', { style: { margin: 0 } }, 'Rythme de la table (millisecondes)'),
        h('div.pousse'),
        modifie ? h('button.btn.btn--petit', {
          onclick: () => {
            const net = { ...reglagesCourants() };
            for (const k of Object.keys(RYTHME)) delete net[k];
            enregistrerReglages(net);
            dessiner();
          },
        }, 'Rythme d’origine') : null,
      ),
      h('div.grille-rythme', { style: { marginTop: '10px' } },
        ...Object.entries(LIBELLES_RYTHME).map(([cle, libelle]) => h('label.champ-ligne', libelle,
          champNb(cfg[cle], { min: 0, max: 20000, pas: 50, officiel: RYTHME[cle], onchange: (v) => ecrire(cle, v) }))),
        h('label.champ-ligne', { title: 'De 0 (régulier) à 0,5 : chaque durée varie d’autant, en plus ou en moins' }, 'Irrégularité',
          champNb(cfg.variance, { min: 0, max: 0.5, pas: 0.05, officiel: RYTHME.variance, onchange: (v) => ecrire('variance', v) })),
      ),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        'Le rythme vaut pour la table comme pour le Laboratoire : il décide des durées de partie simulées. '
        + 'Il ne fait pas partie des Règles officielles.'),
    );
  }

  function dessiner() {
    const r = reglagesCourants();
    const off = reglesOfficielles().reglages;
    remplacer(racine,
      h('div.rangee', { style: { margin: '6px 0 14px' } },
        h('h1', 'Réglages'),
        h('div.pousse'),
        h('button.btn.btn--petit', { onclick: () => aller('/regles') }, 'Lire les règles'),
        h('button.btn.btn--petit', { onclick: () => aller('/labo') }, 'Tester au Laboratoire'),
      ),
      barreProfils(dessiner, blocOfficielles(r, off)),
      h('div.grille.grille--reglages', carteMiseEnPlace(r, off), carteDes(r, off)),
      carteCartes(r, off),
      h('div.grille.grille--reglages', carteTable(), carteRythme(r)),
    );
  }

  dessiner();
  return racine;
}
