// Historique des parties réellement jouées à la table.

import { h, remplacer, dureeLongue, nombre, telecharger } from './dom.js?v=1.49';
import { historique, viderHistorique, historiqueCSV } from './store.js?v=1.49';
import { COULEURS_EQUIPE } from '../core/config.js?v=1.49';
import { aller } from './app.js?v=1.49';
import { dernierePartie } from './resultats.js?v=1.49';

export function vueHistorique() {
  const racine = h('div.page');

  function dessiner() {
    const parties = historique();
    const total = parties.length;
    const victoires = {};
    let dureeTotale = 0, manchesTotal = 0;
    for (const p of parties) {
      victoires[p.vainqueur || 'aucun'] = (victoires[p.vainqueur || 'aucun'] || 0) + 1;
      dureeTotale += p.duree || 0;
      manchesTotal += p.manches || 0;
    }

    remplacer(racine,
      h('div.rangee', { style: { margin: '6px 0 18px' } },
        h('h1', 'Historique des parties'),
        h('div.pousse'),
        // Le compte rendu détaillé de la dernière partie reste à portée : il ne
        // s'ouvre de lui-même qu'une fois, au coup de sifflet final.
        dernierePartie()
          ? h('button.btn.btn--petit', { onclick: () => aller('/resultats') },
              'Compte rendu de la dernière partie')
          : null),

      total === 0
        ? h('div.carte', { style: { textAlign: 'center', padding: '48px 20px' } },
            h('h3', 'Aucune partie enregistrée'),
            h('p.muted', 'Les parties jouées à la table apparaîtront ici, avec leur durée et leur graine.'))
        : h('div',
            h('div.grille.grille--4',
              stat(String(total), 'parties jouées'),
              stat(dureeLongue(dureeTotale / total), 'durée moyenne'),
              stat(nombre(manchesTotal / total, 1), 'manches par partie'),
              stat(dureeLongue(dureeTotale), 'temps de jeu total'),
            ),
            h('div.carte', { style: { marginTop: '16px' } },
              h('div.rangee', { style: { marginBottom: '12px' } },
                h('div.titre-section', { style: { margin: 0, flex: '1' } }, 'Parties'),
                h('button.btn.btn--petit', {
                  onclick: () => telecharger('tornadice-historique.csv', historiqueCSV()),
                }, 'Exporter en CSV'),
                h('button.btn.btn--petit.btn--danger', {
                  onclick: () => { if (confirm('Effacer tout l’historique ?')) { viderHistorique(); dessiner(); } },
                }, 'Effacer'),
              ),
              h('table.tbl',
                h('thead', h('tr', h('th', 'Date'), h('th.num', 'Joueurs'), h('th', 'Vainqueur'),
                  h('th.num', 'Manches'), h('th.num', 'Durée'), h('th', 'Graine'))),
                h('tbody', ...parties.map((p) => h('tr',
                  h('td.petit', p.date),
                  h('td.num', p.joueurs),
                  h('td', p.vainqueur
                    ? h('span.badge', { class: `badge--${p.vainqueur}` },
                        (COULEURS_EQUIPE[p.vainqueur] || {}).nom || p.vainqueur)
                    : h('span.mini.muted', '—')),
                  h('td.num', p.manches),
                  h('td.num', dureeLongue(p.duree)),
                  h('td.mini.muted', p.graine),
                ))),
              ),
            ),
          ),
    );
  }

  dessiner();
  return racine;
}

function stat(valeur, libelle) {
  return h('div.stat', h('div.lib', libelle), h('div.val', valeur));
}
