// Rappel des règles, tel qu'implémenté par le moteur.

import { h } from './dom.js';
import { pastilleSymbole, suiteSymboles, SVG_TORNADE_EVEILLEE, SVG_TORNADE_ENDORMIE } from './icons.js';
import { COMBOS_TORNADE, CARTES_JOURNEE, SYMBOLES, MISE_EN_PLACE } from '../core/config.js';

export function vueRegles() {
  return h('div.page',
    h('div.rangee', { style: { margin: '6px 0 18px' } }, h('h1', 'Règles — TornaDices V4.5')),

    h('div.carte',
      h('div.titre-section', 'Le principe'),
      h('p', 'Deux équipes, les Bleus et les Jaunes — et un joueur Vert en solo si le nombre '
        + 'est impair. Plusieurs lots de dés circulent en même temps autour de la table. Celui '
        + 'qui tient un lot le relance aussi vite et aussi souvent qu’il veut, jusqu’à sortir une '
        + 'combinaison… ou jusqu’à ce que deux X figent ses dés et lui fassent rendre le lot. '
        + 'Trois éclairs, et il le passe en tentant d’attraper son voisin au passage.'),
      h('p.petit.muted', 'Une équipe remporte la manche en retournant tous ses jetons Vache. '
        + 'La première à réunir le nombre requis de cartes Journée gagne la partie. '
        + 'Le sens de circulation s’inverse à chaque manche.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les cinq symboles'),
      h('div.grille.grille--3',
        ...['tornade', 'vache', 'zzz', 'eclair', 'x'].map((s) => h('div.stat',
          h('div.rangee.rangee--serree', pastilleSymbole(s, 30),
            h('strong', SYMBOLES[s].nom)),
          h('div.sous', { style: { marginTop: '6px' } }, SYMBOLES[s].desc))),
      ),
      h('div.encart', { style: { marginTop: '14px' } },
        'Un dé peut être relancé autant de fois qu’on veut, et on choisit lesquels relancer — '
        + 'sauf les X : dès qu’un X sort, le dé est figé sur cette face. Au deuxième X, il ne reste '
        + 'plus assez de dés libres pour former quoi que ce soit : le lot part aussitôt.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les combinaisons'),
      h('table.tbl',
        h('thead', h('tr', h('th', 'Combinaison'), h('th', 'Effet'), h('th', 'Condition'))),
        h('tbody', ...COMBOS_TORNADE.map((c) => h('tr',
          h('td', h('div.rangee.rangee--serree', suiteSymboles(c.requis, 20))),
          h('td', h('strong', c.nom), h('div.petit.muted', c.libelle)),
          h('td.petit',
            c.face === 'active' ? 'Tornade éveillée'
              : c.face === 'endormie' ? 'Tornade endormie'
                : c.obligatoire ? 'Obligatoire, quel que soit l’état' : 'Toujours'),
        ))),
      ),
      h('div.rangee', { style: { marginTop: '14px' } },
        h('span', { html: SVG_TORNADE_ENDORMIE, style: { width: '30px', color: 'var(--gris-clair)' } }),
        h('span.petit', 'Chaque manche commence Tornade endormie : il faut d’abord se réveiller '
          + 'aux tornades avant de pouvoir retourner un jeton aux vaches.'),
        h('span', { html: SVG_TORNADE_EVEILLEE, style: { width: '30px', color: 'var(--bleu)' } }),
      ),
      h('p.petit.muted', { style: { marginTop: '10px' } },
        'Jouer une combinaison commence toujours par passer son lot, puis appliquer l’effet.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les alertes de la table'),
      h('p.petit', 'Dès qu’une combinaison sort, la zone du joueur s’entoure d’un halo de couleur : '
        + 'on repère d’un coup d’œil ce qui se passe autour de la table, sans lire les dés.'),
      h('div.rangee',
        ...[['rouge', 'Deux X — le lot part'], ['jaune', 'Trois éclairs — attrape'],
          ['bleu', 'Trois tornades — réveil'], ['vert', 'Trois vaches — jeton'],
          ['violet', 'Trois ZzZ — endormi']].map(([c, texte]) =>
          h('span.badge', { 'data-alerte': c, style: { padding: '6px 12px' } }, texte)),
      ),
    ),

    h('div.carte',
      h('div.titre-section', 'L’attrape'),
      h('p.petit', 'Trois éclairs : passez le lot au joueur suivant et tentez de toucher ses dés '
        + 'ou la main qui les tient. S’il tient lui aussi un lot et que vous le touchez, son tour '
        + 'est interrompu, il passe immédiatement son lot, et vous retournez un de vos jetons.'),
      h('p.mini.muted', 'À la table virtuelle, l’attrape ouvre une fenêtre de réflexe : '
        + 'le toucheur appuie pour toucher, la cible pour retirer sa main. Entre IA, elle se '
        + 'résout à l’adresse et à l’esquive de chacun.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les cartes Journée'),
      h('table.tbl',
        h('thead', h('tr', h('th', 'Carte'), h('th', 'Combinaison'), h('th', 'Effet'))),
        h('tbody', ...CARTES_JOURNEE.map((c) => h('tr',
          h('td', { style: { fontWeight: '700' } }, c.nom),
          h('td', c.combo
            ? h('div.rangee.rangee--serree', suiteSymboles(c.combo.requis, 18))
            : h('span.mini.muted', '—')),
          h('td.petit', c.texte),
        ))),
      ),
    ),

    h('div.carte',
      h('div.titre-section', 'Mise en place'),
      h('table.tbl',
        h('thead', h('tr', h('th.num', 'Joueurs'), h('th.num', 'Lots de dés'),
          h('th.num', 'Jetons par équipe'), h('th.num', 'Jetons du Vert'),
          h('th.num', 'Cartes pour gagner'))),
        h('tbody', ...Object.entries(MISE_EN_PLACE).map(([n, m]) => h('tr',
          h('td.num', n, m.extrapole ? h('span.mini.muted', ' *') : null),
          h('td.num', m.lots), h('td.num', m.jetons),
          h('td.num', Number(n) % 2 ? m.jetonsVert : '—'), h('td.num', m.cartes),
        ))),
      ),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        '* Ligne extrapolée : le tableau officiel V4.5 s’arrête à 8 joueurs.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Incidents fâcheux'),
      h('ul.petit',
        h('li', 'Relancer un X par mégarde : le joueur passe son lot.'),
        h('li', 'Lancer les dés au lieu de les passer, ou ne pas passer après une attrape : '
          + 'les équipes adverses retournent un jeton.'),
        h('li', 'Un dé tombe, un imprévu survient : mettez le jeu en pause.'),
      ),
    ),
  );
}
