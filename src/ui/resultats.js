// La page de fin de partie : ce qui s'est passé, en chiffres.
//
// Le moteur compte déjà tout — lancers, combinaisons, attrapes tentées et
// subies, endormissements, jetons et leur origine, durée de chaque manche. Rien
// de tout cela n'était montré : la fin de partie tenait dans quatre colonnes sur
// un carton posé au milieu de la table. Cette page ouvre le carnet.
//
// Elle ne lit pas le moteur, mais un instantané enregistré à la fin de la partie
// (`dernierePartie`). Deux raisons : la page survit à un rechargement, et elle
// reste juste même si les réglages changent entre-temps — les noms de
// combinaisons et de cartes sont figés dans l'instantané, pas relus après coup.

import {
  h, remplacer, duree, dureeLongue, nombre, pourcent, telecharger,
} from './dom.js?v=1.67';
import { store } from './store.js?v=1.67';
import { aller } from './app.js?v=1.67';
import { emblemeEquipe, pastilleSymbole } from './icons.js?v=1.67';
import {
  COULEURS_EQUIPE, CARTES_PAR_ID, ORDRE_SYMBOLES, NOM_MODE, modeManche,
} from '../core/config.js?v=1.67';

/**
 * Le format de l'instantané. Il monte dès qu'une colonne apparaît : un résultat
 * produit par une version antérieure est écarté plutôt que lu de travers — la
 * leçon de la v1.36, où un champ absent emportait une page entière.
 */
export const SCHEMA_PARTIE = 2;

const CLE = 'dernierePartie';

/**
 * Fige la partie qui vient de finir. Tout ce dont la page a besoin est copié
 * ici, y compris les libellés : les Réglages peuvent changer ensuite sans que
 * le compte rendu se mette à mentir.
 */
export function enregistrerPartie(moteur) {
  const r = moteur.resultat();
  const cfg = moteur.cfg;
  store.set(CLE, {
    schema: SCHEMA_PARTIE,
    quand: new Date().toISOString().slice(0, 16).replace('T', ' '),
    resultat: r,
    contexte: {
      // La façon de jouer la manche : trois modes depuis la v1.50.
      mode: modeManche(cfg),
      nbJoueurs: moteur.joueurs.length,
      cartesPourGagner: cfg.cartesPourGagner,
      jetons: cfg.jetons,
      desParLot: cfg.desParLot,
      lots: cfg.lots,
      // Les libellés des combinaisons telles qu'elles étaient réglées.
      combos: cfg.combos.map((c) => ({ id: c.id, nom: c.nom, requis: { ...c.requis } })),
    },
  });
}

/** L'instantané, s'il est encore lisible. */
export function dernierePartie() {
  const p = store.get(CLE, null);
  if (!p || typeof p !== 'object' || p.schema !== SCHEMA_PARTIE) return null;
  if (!p.resultat || !Array.isArray(p.resultat.joueurs)) return null;
  return p;
}

// ── Petits calculs ───────────────────────────────────────────────────────────

/** Le total d'un compteur, tous joueurs confondus. */
const total = (joueurs, lire) => joueurs.reduce((s, j) => s + (lire(j) || 0), 0);

/**
 * Qui mène sur un compteur — à condition que le compteur dise quelque chose, et
 * en nommant tout le monde en cas d'égalité : désigner un seul joueur quand
 * trois sont à la même hauteur, c'est écrire un classement faux.
 */
function meilleur(joueurs, lire) {
  let max = 0;
  for (const j of joueurs) max = Math.max(max, lire(j) || 0);
  if (max <= 0) return null;
  const exaequo = joueurs.filter((j) => (lire(j) || 0) === max);
  const noms = exaequo.length <= 3
    ? exaequo.map((j) => j.nom).join(' · ')
    : `${exaequo.length} joueurs à égalité`;
  return { nom: noms, v: max, exaequo: exaequo.length };
}

/** Les manches gagnées par chaque joueur — c'est lui qui les a conclues. */
function manchesParJoueur(manches) {
  const par = {};
  // `!= null` et non la simple vérité : le premier joueur porte l'identifiant 0,
  // et il disparaissait du compte.
  for (const m of manches) if (m.joueur != null) par[m.joueur] = (par[m.joueur] || 0) + 1;
  return par;
}

/** Pourquoi la partie s'arrête — le moteur ne rend qu'un mot-clé. */
const RAISON_FIN = {
  cartes: 'La partie s’arrête sur l’objectif atteint.',
  pioche: 'La partie s’arrête faute de cartes : c’est l’équipe en tête qui l’emporte.',
  manchesMax: 'La partie s’arrête au nombre maximal de manches ; l’équipe en tête l’emporte.',
  limite: 'La partie s’est arrêtée sur une limite de sécurité du moteur.',
};

const RAISON = {
  vache: 'en sortant l’Abri',
  refuge: 'en mettant ses animaux à l’Abri',
  jetons: 'en retournant le dernier jeton',
  attrape: 'à l’attrape',
  carte: 'à la combinaison de la carte',
  // Personne n'a rien réussi : c'est la bourde d'en face qui a fini la manche.
  incident: 'sur la bourde d’un adversaire',
};

function raisonManche(m, mode) {
  if (!m.raison) return '—';
  if (m.raison === 'attrape') {
    if (!m.cible) return 'à la collision';
    // En Compromis, la collision envoie un jeton adverse dans la tornade : ce
    // n'est pas une attrape parmi d'autres, c'est l'un des deux chemins.
    return mode === 'compromis'
      ? `en envoyant ${m.cible} dans la tornade`
      : `en attrapant ${m.cible}`;
  }
  if (m.raison === 'incident' && m.cible) return `sur la bourde de ${m.cible}`;
  return RAISON[m.raison] || '—';
}

// ── La page ──────────────────────────────────────────────────────────────────

export function vueResultats() {
  const racine = h('div.page.page--large');
  const p = dernierePartie();

  if (!p) {
    remplacer(racine,
      h('div.rangee', { style: { margin: '6px 0 18px' } }, h('h1', 'Résultats')),
      h('div.carte',
        h('p', 'Aucune partie terminée à afficher.'),
        h('p.petit.muted', 'Le compte rendu s’ouvre tout seul à la fin d’une partie, '
          + 'et reste consultable ici jusqu’à la partie suivante.'),
        h('div.rangee', { style: { marginTop: '14px' } },
          h('button.btn.btn--primaire', { onclick: () => aller('/') }, 'Lancer une partie'),
          h('button.btn', { onclick: () => aller('/historique') }, 'Historique'))),
    );
    return racine;
  }

  const r = p.resultat;
  const ctx = p.contexte || {};
  const joueurs = r.joueurs;
  const manches = Array.isArray(r.statsManches) ? r.statsManches : [];
  const parJoueur = manchesParJoueur(manches);
  const eqGagnante = r.vainqueur ? COULEURS_EQUIPE[r.vainqueur] : null;

  remplacer(racine,
    enteteVictoire(r, ctx, eqGagnante, p.quand),
    equipes(r, ctx),
    // Onze colonnes : le tableau des joueurs prend toute la largeur, sinon il
    // défile de côté et l'on perd les dernières colonnes de vue.
    tableauJoueurs(joueurs, ctx, parJoueur, r.duree),
    h('div.grille.grille--2', { style: { alignItems: 'start' } },
      faitsMarquants(joueurs, manches, ctx),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '16px' } },
        combinaisons(joueurs, ctx),
        origineJetons(joueurs, ctx),
      ),
    ),
    dérouléManches(manches, ctx),
    actions(r, p),
  );
  return racine;
}

function enteteVictoire(r, ctx, eq, quand) {
  return h('div.carte.carte--victoire', {
    style: eq ? { '--couleur-eq': eq.hex } : null,
  },
    h('div.rangee',
      eq && eq.embleme ? emblemeEquipe(eq.embleme, 46) : null,
      h('div', { style: { flex: '1 1 260px', minWidth: 0 } },
        h('div.titre-section', { style: { margin: 0 } }, 'Fin de partie'),
        h('h1', { style: { marginTop: '4px' } },
          eq ? `${eq.nom} — victoire !` : 'Partie terminée'),
        h('p.petit.muted', { style: { marginTop: '6px', marginBottom: 0 } },
          `${r.manches} manches · ${dureeLongue(r.duree)} de jeu · `
          + `${ctx.nbJoueurs || r.joueurs.length} joueurs · `
          + `mode ${NOM_MODE[ctx.mode] || ctx.mode || 'Jeton'} · ${quand}`),
        h('p.mini.muted', { style: { margin: 0 } }, `Graine ${r.graine}`),
      ),
      h('div.grille.grille--stats', { style: { flex: '2 1 420px' } },
        stat(String(r.manches), 'manches jouées',
          `la plus longue ${duree(Math.max(0, ...(r.statsManches || []).map((m) => m.duree)))}`),
        stat(dureeLongue(r.duree), 'durée de la partie',
          `manche moyenne ${duree(r.manches ? r.duree / r.manches : 0)}`),
        stat(String(total(r.joueurs, (j) => j.stats.lancers)), 'lancers de dés',
          `${nombre(total(r.joueurs, (j) => j.stats.lancers) / Math.max(1, r.manches), 0)} par manche`),
        stat(String(total(r.joueurs, (j) => j.stats.collisionsTentees)), 'attrapes tentées',
          `${total(r.joueurs, (j) => j.stats.collisionsReussies)} réussies`),
      ),
    ),
  );
}

function stat(valeur, libelle, sous) {
  return h('div.stat', h('div.lib', libelle), h('div.val', valeur),
    sous ? h('div.sous', sous) : null);
}

function equipes(r, ctx) {
  const entrees = Object.entries(r.equipes || {});
  if (!entrees.length) return null;
  const max = Math.max(1, ...entrees.map(([, e]) => e.cartes));
  return h('div.carte',
    h('div.titre-section', ctx.mode === 'jeton' ? 'Score des équipes' : 'Cartes Tornade remportées'),
    ...entrees.map(([id, e]) => {
      const c = COULEURS_EQUIPE[id] || { nom: id, hex: '#b8b0a5', embleme: null };
      return h('div', { style: { marginBottom: '10px' } },
        h('div.rangee', { style: { justifyContent: 'space-between', marginBottom: '4px' } },
          h('span.rangee.rangee--serree',
            c.embleme ? emblemeEquipe(c.embleme, 18) : null,
            h('strong', c.nom),
            id === r.vainqueur ? h('span.badge', 'vainqueur') : null),
          h('span.petit.muted',
            `${e.cartes} carte${e.cartes > 1 ? 's' : ''}`
            + (ctx.mode === 'jeton' ? ` · ${e.jetons} jeton${e.jetons > 1 ? 's' : ''} restant${e.jetons > 1 ? 's' : ''}` : ''))),
        h('div.barre-fond', h('div', {
          style: { width: `${(e.cartes / max) * 100}%`, background: c.hex },
        })));
    }),
    h('p.mini.muted', { style: { marginTop: '8px' } },
      `Il fallait ${ctx.cartesPourGagner || '?'} cartes pour gagner. ${RAISON_FIN[r.raison] || ''}`),
  );
}

function tableauJoueurs(joueurs, ctx, parJoueur, dureePartie) {
  const manchesDe = (j) => parJoueur[j.id] || 0;
  // Sans les points il n'y a plus de jeton à compter : la colonne disparaît
  // plutôt que d'aligner des zéros.
  // Compromis compte aussi ses jetons — ceux mis à l'Abri. Seul « Immédiat »
  // n'en a aucun à montrer.
  const avecJetons = ctx.mode !== 'immediat';
  const tri = joueurs.slice().sort((a, b) =>
    manchesDe(b) - manchesDe(a) || b.stats.jetonsRetournes - a.stats.jetonsRetournes);
  const combosDe = (j) => Object.values(j.stats.combos || {}).reduce((s, n) => s + n, 0);
  return h('div.carte',
    h('div.titre-section', 'Chaque joueur'),
    h('div.tbl-defile', h('table.tbl.tbl--resultats',
      h('thead', h('tr',
        h('th', 'Joueur'),
        h('th.num', { title: 'Manches conclues par ce joueur' }, 'Manches'),
        avecJetons
          ? h('th.num', { title: ctx.mode === 'compromis' ? 'Jetons mis à l’Abri' : 'Jetons retournés' },
              ctx.mode === 'compromis' ? 'À l’Abri' : 'Jetons')
          : null,
        h('th.num', 'Lancers'),
        h('th.num', { title: 'Combinaisons réalisées' }, 'Combis'),
        h('th.num', 'Attrapes'), h('th.num', 'Subies'),
        h('th.num', 'Réveils'), h('th.num', 'Endormi'), h('th.num', 'Erreurs'),
        h('th.num', { title: 'Part de la partie passée dés en main' }, 'Lot'))),
      h('tbody', ...tri.map((j) => h('tr',
        h('td', h('span.rangee.rangee--serree',
          h('span.badge', { class: `badge--${j.equipe}` }, j.nom),
          j.type === 'humain' ? h('span.mini.muted', 'vous') : null)),
        h('td.num', h('strong', String(manchesDe(j)))),
        avecJetons ? h('td.num', h('strong', String(j.stats.jetonsRetournes))) : null,
        h('td.num', String(j.stats.lancers)),
        h('td.num', String(combosDe(j))),
        h('td.num', `${j.stats.collisionsReussies}/${j.stats.collisionsTentees}`),
        h('td.num', String(j.stats.foisTouche)),
        h('td.num', String(j.stats.reveils)),
        h('td.num', String(j.stats.foisEndormi)),
        h('td.num', String(j.stats.erreurs)),
        h('td.num', dureePartie ? pourcent(j.stats.tempsAvecLot / dureePartie, 0) : '—'),
      ))))),
    h('p.mini.muted', { style: { marginTop: '10px' } },
      '« Manches » : celles que ce joueur a conclues, en sortant la combinaison ou '
      + 'en attrapant. « Attrapes » : contacts réussis sur contacts tentés. '
      + '« Subies » : les fois où l’on s’est fait attraper. '
      + '« Lot » : la part de la partie passée dés en main.'),
  );
}

function faitsMarquants(joueurs, manches, ctx) {
  const lignes = [];
  const ajouter = (titre, best, suffixe) => {
    if (best) lignes.push([titre, best.nom, suffixe(best.v)]);
  };

  const longue = manches.reduce((a, m) => (!a || m.duree > a.duree ? m : a), null);
  const courte = manches.reduce((a, m) => (!a || m.duree < a.duree ? m : a), null);
  if (longue) lignes.push(['La manche la plus longue', `Manche ${longue.manche}`, duree(longue.duree)]);
  if (courte && courte !== longue) {
    lignes.push(['La plus expédiée', `Manche ${courte.manche}`, duree(courte.duree)]);
  }

  const parJoueur = manchesParJoueur(manches);
  ajouter('Le plus de manches', meilleur(joueurs, (j) => parJoueur[j.id] || 0),
    (v) => `${v} manche${v > 1 ? 's' : ''} conclue${v > 1 ? 's' : ''}`);
  ajouter('Le meilleur attrapeur', meilleur(joueurs, (j) => j.stats.collisionsReussies),
    (v) => `${v} contact${v > 1 ? 's' : ''}`);
  ajouter('Le plus attrapé', meilleur(joueurs, (j) => j.stats.foisTouche),
    (v) => `${v} fois`);
  ajouter('Le plus endormi', meilleur(joueurs, (j) => j.stats.foisEndormi),
    (v) => `${v} fois`);
  ajouter('Le plus gros lanceur', meilleur(joueurs, (j) => j.stats.lancers),
    (v) => `${v} lancers`);
  if (ctx.mode !== 'immediat') {
    ajouter('Le plus de jetons', meilleur(joueurs, (j) => j.stats.jetonsRetournes),
      (v) => `${v} jeton${v > 1 ? 's' : ''}`);
  }
  ajouter('Le plus maladroit', meilleur(joueurs, (j) => j.stats.erreurs),
    (v) => `${v} bourde${v > 1 ? 's' : ''}`);

  if (!lignes.length) return null;
  return h('div.carte',
    h('div.titre-section', 'Les faits marquants'),
    h('div.faits', ...lignes.map(([titre, qui, quoi]) => h('div.fait',
      h('div.mini.muted', titre),
      h('div.rangee', { style: { justifyContent: 'space-between', gap: '8px' } },
        h('strong', qui), h('span.petit.muted', quoi))))),
  );
}

function combinaisons(joueurs, ctx) {
  const compte = {};
  for (const j of joueurs) {
    for (const [id, n] of Object.entries(j.stats.combos || {})) compte[id] = (compte[id] || 0) + n;
  }
  const nomDe = (id) => {
    const c = (ctx.combos || []).find((x) => x.id === id);
    if (c) return { nom: c.nom, requis: c.requis };
    const carte = CARTES_PAR_ID[id];
    return { nom: carte ? carte.court || carte.nom : id, requis: carte && carte.combo ? carte.combo.requis : null };
  };
  const lignes = Object.entries(compte).sort((a, b) => b[1] - a[1]);
  if (!lignes.length) return null;
  const somme = lignes.reduce((s, [, n]) => s + n, 0);
  return h('div.carte',
    h('div.titre-section', 'Combinaisons sorties'),
    h('table.tbl',
      h('thead', h('tr', h('th', 'Combinaison'), h('th', 'Exigée'), h('th.num', 'Sorties'), h('th.num', 'Part'))),
      h('tbody', ...lignes.map(([id, n]) => {
        const { nom, requis } = nomDe(id);
        return h('tr',
          h('td', nom),
          h('td', requis ? suite(requis) : h('span.mini.muted', '—')),
          h('td.num', String(n)),
          h('td.num', pourcent(n / somme, 0)));
      }))),
  );
}

/** Une exigence en miniatures de dés, dans l'ordre des symboles. */
function suite(requis) {
  const el = h('span.rangee.rangee--serree');
  for (const sym of ORDRE_SYMBOLES) {
    for (let i = 0; i < (requis[sym] || 0); i++) el.appendChild(pastilleSymbole(sym, 18));
  }
  return el;
}

/** Les cinq façons de retourner un jeton, telles que le moteur les nomme. */
const NOM_SOURCE = {
  vache: 'L’Abri',
  collision: 'Une attrape réussie',
  intensive: 'La carte « Élevage intensif »',
  troupeau: 'La carte « Troupeau »',
  difference: 'La carte « Faire la différence »',
};

function origineJetons(joueurs, ctx) {
  if (ctx.mode === 'immediat') return null;
  const compte = {};
  for (const j of joueurs) {
    for (const [src, n] of Object.entries(j.stats.jetonsParSource || {})) {
      compte[src] = (compte[src] || 0) + n;
    }
  }
  const lignes = Object.entries(compte).sort((a, b) => b[1] - a[1]);
  if (!lignes.length) return null;
  const somme = lignes.reduce((s, [, n]) => s + n, 0);
  return h('div.carte',
    h('div.titre-section', 'D’où viennent les jetons'),
    h('table.tbl',
      h('thead', h('tr', h('th', 'Origine'), h('th.num', 'Jetons'), h('th.num', 'Part'))),
      h('tbody', ...lignes.map(([src, n]) => h('tr',
        h('td', NOM_SOURCE[src] || src),
        h('td.num', String(n)),
        h('td.num', pourcent(n / somme, 0)))))),
  );
}

function dérouléManches(manches, ctx) {
  if (!manches.length) return null;
  const max = Math.max(...manches.map((m) => m.duree)) || 1;
  return h('div.carte',
    h('div.titre-section', 'Manche par manche'),
    h('div.tbl-defile', h('table.tbl.tbl--manches',
      h('thead', h('tr',
        h('th', 'Manche'), h('th', 'Durée'), h('th', ''), h('th', 'Remportée par'),
        h('th', 'Comment'), h('th', 'Carte Tornade'), h('th', 'Sens'))),
      h('tbody', ...manches.map((m) => {
        const eq = m.vainqueur ? COULEURS_EQUIPE[m.vainqueur] : null;
        const carte = m.carte ? CARTES_PAR_ID[m.carte] : null;
        return h('tr',
          h('td', h('strong', String(m.manche))),
          h('td', duree(m.duree)),
          h('td', { style: { width: '34%', minWidth: '90px' } },
            h('div.barre-fond', h('div', {
              style: { width: `${(m.duree / max) * 100}%`, background: eq ? eq.hex : 'var(--gris-clair)' },
            }))),
          h('td', m.nomJoueur
            ? h('span.rangee.rangee--serree',
                h('span.badge', { class: `badge--${m.vainqueur}` }, m.nomJoueur))
            : h('span.mini.muted', eq ? eq.nom : '—')),
          h('td.petit', raisonManche(m, ctx.mode)),
          h('td.petit', carte
            ? h('span', carte.court || carte.nom, m.compte ? null : h('span.mini.muted', ' · défaussée'))
            : h('span.mini.muted', '—')),
          h('td', { title: m.sens > 0 ? 'sens horaire' : 'sens antihoraire' },
            h('span.fleche-sens', m.sens > 0 ? '↻' : '↺')));
      }))),
    ),
    h('p.mini.muted', { style: { marginTop: '10px' } },
      ctx.mode === 'jeton'
        ? 'La barre donne la durée relative de chaque manche.'
        : 'Chaque manche vaut une carte Tornade — sauf celles défaussées.'),
  );
}

function actions(r, p) {
  return h('div.rangee', { style: { marginTop: '18px', justifyContent: 'center' } },
    h('button.btn.btn--primaire.btn--grand', { onclick: () => aller('/') }, 'Nouvelle partie'),
    h('button.btn', { onclick: () => aller('/historique') }, 'Historique'),
    h('button.btn', {
      onclick: () => telecharger(`tornadice-partie-${String(r.graine).slice(0, 24)}.csv`, csv(r, p.contexte || {})),
    }, 'Exporter en CSV'),
  );
}

function csv(r, ctx) {
  const l = [];
  l.push('indicateur;valeur');
  l.push(`graine;${r.graine}`);
  l.push(`vainqueur;${r.vainqueur || 'aucun'}`);
  l.push(`manches;${r.manches}`);
  l.push(`duree_s;${Math.round((r.duree || 0) / 1000)}`);
  l.push(`mode;${ctx.mode || 'jeton'}`);
  l.push('');
  l.push('joueur;equipe;siege;type;profil;jetons;lancers;combinaisons;attrapes_tentees;'
    + 'attrapes_reussies;subies;reveils;endormi;erreurs;temps_avec_lot_s');
  for (const j of r.joueurs) {
    const combos = Object.values(j.stats.combos || {}).reduce((s, n) => s + n, 0);
    l.push([
      j.nom, j.equipe, j.siege, j.type, j.profil, j.stats.jetonsRetournes, j.stats.lancers,
      combos, j.stats.collisionsTentees, j.stats.collisionsReussies, j.stats.foisTouche,
      j.stats.reveils, j.stats.foisEndormi, j.stats.erreurs,
      Math.round((j.stats.tempsAvecLot || 0) / 1000),
    ].join(';'));
  }
  l.push('');
  l.push('manche;duree_s;vainqueur;joueur;raison;carte;comptee;sens');
  for (const m of r.statsManches || []) {
    l.push([
      m.manche, Math.round((m.duree || 0) / 1000), m.vainqueur || '', m.nomJoueur || '',
      m.raison || '', m.carte || '', m.compte ? 1 : 0, m.sens > 0 ? 'horaire' : 'antihoraire',
    ].join(';'));
  }
  return l.join('\n');
}
