// Compte rendu de la dernière partie jouée à la table. L'instantané est figé au
// coup de sifflet final et gardé dans le navigateur.

import { h, duree, dureeLongue, telecharger } from './dom.js?v=2.13';
import { store } from './store.js?v=2.13';
import { aller } from './app.js?v=2.13';
import { emblemeEquipe, suiteSymboles } from './icons.js?v=2.13';
import { EQUIPES, CARTES_PAR_ID, PROFILS_IA, nomDansPhrase } from '../core/config.js?v=2.13';

/** Format de l'instantané : un compte rendu d'une autre version est écarté. */
export const SCHEMA_PARTIE = 5;

export function enregistrerPartie(moteur) {
  const cfg = moteur.cfg;
  store.set('dernierePartie', {
    schema: SCHEMA_PARTIE,
    quand: new Date().toISOString().slice(0, 16).replace('T', ' '),
    resultat: moteur.resultat(),
    contexte: {
      nbJoueurs: cfg.nbJoueurs, lots: cfg.lots, jetons: cfg.jetons, desParLot: cfg.desParLot,
      cartesPourGagner: cfg.cartesPourGagner, cartesVert: cfg.cartesVert,
      combos: cfg.combos.map((c) => ({ id: c.id, nom: c.nom, requis: c.requis })),
    },
  });
}

export function dernierePartie() {
  const p = store.get('dernierePartie', null);
  return p && p.schema === SCHEMA_PARTIE && p.resultat && Array.isArray(p.resultat.joueurs) ? p : null;
}

const RAISON_FIN = {
  cartes: 'Objectif atteint.',
  pioche: 'Pioche épuisée : l’équipe en tête l’emporte.',
  manchesMax: 'Nombre maximal de manches atteint : l’équipe en tête l’emporte.',
  limite: 'Partie arrêtée sur une limite de sécurité du moteur.',
};
const stat = (valeur, libelle) => h('div.stat', h('div.lib', libelle), h('div.val', valeur));
const nomEquipe = (id) => h('span.badge', { class: `badge--${id}` }, emblemeEquipe(EQUIPES[id].embleme, 18), ' ', EQUIPES[id].animal);

export function vueResultats() {
  const p = dernierePartie();
  if (!p) {
    return h('div.page', h('div.carte', { style: { textAlign: 'center', padding: '48px 20px' } },
      h('h2', 'Aucun compte rendu'),
      h('p.muted', 'Il apparaît ici à la fin d’une partie jouée à la table.'),
      h('button.btn.btn--primaire', { onclick: () => aller('/') }, 'Aller à l’accueil')));
  }
  const r = p.resultat;
  const ctx = p.contexte;
  const eq = r.vainqueur ? EQUIPES[r.vainqueur] : null;
  const nom = r.vainqueur ? nomDansPhrase(r.vainqueur) : null;
  const gagnees = {};
  for (const m of r.statsManches) if (m.joueur != null) gagnees[m.joueur] = (gagnees[m.joueur] || 0) + 1;
  const objectif = (id) => (id === 'vert' ? ctx.cartesVert : ctx.cartesPourGagner);

  const csv = () => {
    const lignes = ['joueur;equipe;profil;lancers;reveils;abris;endormi;tourbillons;manches_gagnees'];
    for (const j of r.joueurs) {
      lignes.push([j.nom, j.equipe, j.profil, j.stats.lancers, j.stats.reveils, j.stats.abris,
        j.stats.foisEndormi, j.stats.pousses, gagnees[j.id] || 0].join(';'));
    }
    lignes.push('', 'manche;carte;vainqueur;joueur;raison;duree_s');
    for (const m of r.statsManches) {
      lignes.push([m.manche, (CARTES_PAR_ID[m.carte] || {}).nom || '', m.vainqueur || '', m.nomJoueur || '',
        m.raison || '', Math.round(m.duree / 1000)].join(';'));
    }
    return lignes.join('\n');
  };

  return h('div.page',
    h('div.carte.carte--victoire', { style: { '--couleur-eq': eq ? eq.hex : 'var(--accent)' } },
      eq ? emblemeEquipe(eq.embleme, 72) : null,
      h('div',
        h('h1', { style: { color: eq ? eq.hex : null, margin: 0 } },
          eq ? `${nom.Le} ${nom.v('l’emporte', 'l’emportent')} !` : 'Partie sans vainqueur'),
        h('p.muted', { style: { margin: '4px 0 0' } },
          `${RAISON_FIN[r.raison] || ''} ${p.quand} · ${ctx.nbJoueurs} joueurs · graine ${r.graine}`)),
    ),
    h('div.grille.grille--stats', { style: { marginTop: '16px' } },
      ...Object.keys(r.equipes).map((id) => stat(`${r.equipes[id].cartes} / ${objectif(id)}`, `cartes — ${EQUIPES[id].animal}`)),
      stat(String(r.manches), 'manches'),
      stat(dureeLongue(r.duree), 'durée'),
      stat(String(r.joueurs.reduce((s, j) => s + j.stats.lancers, 0)), 'lancers'),
    ),
    h('div.carte', { style: { marginTop: '16px' } },
      h('div.titre-section', 'Joueurs'),
      h('div.tbl-defile', h('table.tbl',
        h('thead', h('tr', h('th', 'Joueur'), h('th', 'Équipe'), h('th.num', 'Lancers'), h('th.num', 'Réveils'),
          h('th.num', 'Abris'), h('th.num', 'Endormi'), h('th.num', { title: 'Lots passés de force, poussés par un lot qui arrivait' }, 'Tourbillons'),
          h('th.num', 'Manches gagnées'), h('th.num', 'Temps avec un lot'))),
        h('tbody', ...r.joueurs.map((j) => h('tr',
          h('td', h('strong', j.nom), j.type === 'ia' ? h('span.mini.muted', ` IA ${(PROFILS_IA[j.profil] || {}).nom || ''}`) : null),
          h('td', nomEquipe(j.equipe)),
          h('td.num', j.stats.lancers), h('td.num', j.stats.reveils), h('td.num', j.stats.abris),
          h('td.num', j.stats.foisEndormi), h('td.num', j.stats.pousses), h('td.num', gagnees[j.id] || 0),
          h('td.num', duree(j.stats.tempsAvecLot))))))),
    ),
    h('div.grille.grille--2', { style: { marginTop: '16px' } },
      h('div.carte',
        h('div.titre-section', 'Manches'),
        h('div.tbl-defile', h('table.tbl',
          h('thead', h('tr', h('th.num', 'N°'), h('th', 'Carte Tornade'), h('th', 'Gagnée par'), h('th', 'Comment'), h('th.num', 'Durée'))),
          h('tbody', ...r.statsManches.map((m) => h('tr',
            h('td.num', m.manche),
            h('td', (CARTES_PAR_ID[m.carte] || { nom: '—' }).nom, m.compte ? null : h('span.mini.muted', ' (sans gain)')),
            h('td', m.vainqueur ? [nomEquipe(m.vainqueur), m.nomJoueur ? h('span.mini.muted', ` ${m.nomJoueur}`) : null] : '—'),
            h('td.mini', m.raison === 'carte' ? 'combinaison de la carte' : m.raison === 'abri' ? 'Abri' : '—'),
            h('td.num', duree(m.duree)))))))),
      h('div.carte',
        h('div.titre-section', 'Combinaisons jouées'),
        h('table.tbl',
          h('tbody', ...ctx.combos.map((c) => h('tr',
            h('td', h('span.rangee.rangee--serree', suiteSymboles(c.requis, 18))),
            h('td', c.nom),
            h('td.num', h('strong', r.joueurs.reduce((s, j) => s + (j.stats.combos[c.id] || 0), 0))))),
          ...Object.entries(r.joueurs.reduce((t, j) => {
            for (const [id, n] of Object.entries(j.stats.combosCartes)) t[id] = (t[id] || 0) + n;
            return t;
          }, {})).map(([id, n]) => h('tr', h('td', ''), h('td', (CARTES_PAR_ID[id] || { nom: id }).nom), h('td.num', h('strong', n)))))),
      ),
    ),
    h('div.rangee', { style: { justifyContent: 'center', marginTop: '22px' } },
      h('button.btn.btn--primaire', { onclick: () => aller('/') }, 'Nouvelle partie'),
      h('button.btn', { onclick: () => telecharger('tornadice-partie.csv', csv()) }, 'Exporter en CSV'),
      h('button.btn', { onclick: () => aller('/historique') }, 'Historique'),
    ),
  );
}
