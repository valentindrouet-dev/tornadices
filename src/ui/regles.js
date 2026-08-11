// Rappel des règles, tel qu'implémenté par le moteur.

import { h } from './dom.js?v=1.16';
import { pastilleSymbole, suiteSymboles, SVG_TORNADE_EVEILLEE, SVG_TORNADE_ENDORMIE } from './icons.js?v=1.16';
import {
  COMBOS_TORNADE, CARTES_JOURNEE, SYMBOLES, MISE_EN_PLACE, PROFILS_IA,
} from '../core/config.js?v=1.16';

export function vueRegles() {
  return h('div.page',
    h('div.rangee', { style: { margin: '6px 0 18px' } }, h('h1', 'Règles — TornaDices V4.5')),

    h('div.carte',
      h('div.titre-section', 'Le rythme d’un lot'),
      h('p.petit', 'Un lot qui arrive porte la face « ? » : rien n’est encore lancé. Les dés '
        + 'roulent une seconde, on lit le résultat, on a le temps de le voir, puis le lot met une '
        + 'seconde à rejoindre le voisin. Ces trois durées se règlent dans le menu Variables — '
        + 'elles font le tempo du jeu et comptent dans la durée d’une partie.'),
      h('p.petit.muted', 'Chaque dé roule pour son propre compte : on peut en relancer un pendant '
        + 'qu’un autre tourne encore, un clic par dé, la barre espace pour tous.'),
      h('p.petit', 'On ne tient jamais deux lots. Quand deux se rencontrent, celui qu’on avait '
        + 'en main est poussé aussitôt vers le voisin suivant — quitte à le pousser à son tour — '
        + 'et on enchaîne sur le nouveau, faces « ? », à lancer.'),
      h('p.petit.muted', 'Entre deux manches, les dés reviennent au centre de la table puis '
        + 'repartent vers l’équipe qui vient de perdre, pendant que la carte Journée suivante '
        + 'recouvre la précédente.'),
    ),

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
      h('div.titre-section', 'Les symboles du dé'),
      h('div.grille.grille--3',
        ...['tornade', 'vache', 'zzz', 'eclair', 'joker', 'x'].map((s) => h('div.stat',
          h('div.rangee.rangee--serree', pastilleSymbole(s, 30),
            h('strong', SYMBOLES[s].nom)),
          h('div.sous', { style: { marginTop: '6px' } }, SYMBOLES[s].desc))),
      ),
      h('p.petit', { style: { marginTop: '12px' } },
        'Un dé porte six faces : une tornade, un joker, un X, un ZzZ, une vache et un éclair. '
        + 'Le joker occupe la place de la seconde tornade.'),
      h('div.encart', { style: { marginTop: '14px' } },
        'Un dé peut être relancé autant de fois qu’on veut, un par un ou tous ensemble — '
        + 'sauf les X : dès qu’un X sort, le dé est figé sur cette face. Au deuxième X, il ne reste '
        + 'plus assez de dés libres pour former quoi que ce soit : le lot part aussitôt.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Le joker'),
      h('div.rangee', { style: { marginBottom: '12px' } },
        pastilleSymbole('joker', 46),
        h('p.petit', { style: { flex: '1', margin: 0 } },
          'Le joker prend la face de n’importe quel symbole — tornade, vache, ZzZ ou éclair — '
          + 'jamais celle du X. Il valide donc n’importe quelle combinaison, et se garde d’un '
          + 'lancer à l’autre comme n’importe quel dé utile.'),
      ),
      h('p.petit', 'Quand un joker sert plusieurs combinaisons au même jet, c’est le joueur qui '
        + 'décide laquelle est jouée : la table lui laisse un instant pour trancher, puis joue '
        + 'la meilleure d’office s’il ne dit rien.'),
      h('div.encart.encart--info', { style: { marginTop: '12px' } },
        'Trois jokers d’un coup : c’est un échec, comme deux X. Le lot part sans rien tenter, '
        + 'et cet échec l’emporte sur tout ce que les jokers auraient pu servir — sans quoi le '
        + 'joker n’aurait aucun revers. Règle décochable dans les Variables de partie.'),
      h('div.rangee', { style: { marginTop: '14px' } },
        pastilleSymbole('jokerDouble', 40),
        h('p.petit', { style: { flex: '1', margin: 0 } },
          h('strong', SYMBOLES.jokerDouble.nom), ' — un joker limité à l’éclair et au ZzZ. '
          + 'Il n’est pas sur les dés au départ : ajoutez-le face par face dans les Variables '
          + 'pour l’essayer. Il ne compte pas dans les trois jokers de l’échec.'),
      ),
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
                : 'Quel que soit l’état'),
        ))),
      ),
      h('div.rangee', { style: { marginTop: '14px' } },
        h('span', { html: SVG_TORNADE_ENDORMIE, style: { width: '30px', color: 'var(--gris-clair)' } }),
        h('span.petit', 'Chaque manche commence Tornade endormie : il faut d’abord se réveiller '
          + 'aux tornades avant de pouvoir retourner un jeton aux vaches.'),
        h('span', { html: SVG_TORNADE_EVEILLEE, style: { width: '30px', color: 'var(--bleu)' } }),
      ),
      h('div.encart', { style: { marginTop: '14px' } },
        'Il faut être réveillé pour agir : les vaches comme les ZzZ ne comptent que Tornade '
        + 'éveillée, et les tornades ne comptent que si l’on dort encore. Seuls l’attrape et '
        + 'les deux échecs valent dans les deux états.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'Une combinaison servie est jouée d’office : on ne relance pas par-dessus. Le lot part '
        + 'vers le voisin, puis l’effet s’applique.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les alertes de la table'),
      h('p.petit', 'Dès qu’une combinaison sort, la zone du joueur s’entoure d’un halo de couleur : '
        + 'on repère d’un coup d’œil ce qui se passe autour de la table, sans lire les dés.'),
      h('div.rangee',
        ...[['rouge', 'Deux X ou trois jokers — le lot part'], ['jaune', 'Trois éclairs — attrape'],
          ['bleu', 'Trois tornades — réveil'], ['vert', 'Trois vaches — jeton'],
          ['violet', 'Trois ZzZ — endormi']].map(([c, texte]) =>
          h('span.badge', { 'data-alerte': c, style: { padding: '6px 12px' } }, texte)),
      ),
      h('p.petit', { style: { marginTop: '14px' } },
        'Les moments qui comptent s’annoncent en toutes lettres au centre de la table : '
        + 'un réveil, un endormissement, une vache retournée, une attrape réussie. '
        + 'Et le journal garde la combinaison finale de chaque tour, avec son issue.'),
    ),

    h('div.carte',
      h('div.titre-section', 'L’attrape'),
      h('p.petit', 'Trois éclairs : passez le lot au joueur suivant et tentez de toucher ses dés '
        + 'ou la main qui les tient. S’il tient lui aussi un lot et que vous le touchez, son tour '
        + 'est interrompu, il passe immédiatement son lot, et vous retournez un de vos jetons.'),
      h('p.mini.muted', 'À la table virtuelle, l’attrape ouvre une fenêtre de réflexe : '
        + 'le toucheur appuie pour toucher, la cible pour retirer sa main. Entre IA, elle se '
        + 'résout à l’adresse et à l’esquive de chacun.'),
      h('div.encart.encart--info', { style: { marginTop: '12px' } },
        'Variante réglable dans les Variables : l’attrape peut emporter la manche entière, '
        + 'soit quand le contact réussit, soit dès les trois éclairs. La manche devient alors '
        + 'une course à l’attrape plutôt qu’une course aux vaches.'),
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
      h('div.titre-section', 'Les caractères des IA'),
      h('p.petit', 'Chaque siège tenu par une IA reçoit un caractère, choisi sur l’accueil. '
        + 'Il dit ce que cette IA cherche à faire de ses dés — pas ce qu’elle accepte : '
        + 'une combinaison servie reste jouée d’office, même par un joueur qui ne la visait pas.'),
      h('table.tbl',
        h('thead', h('tr', h('th', 'Caractère'), h('th', 'Ce qu’il cherche'))),
        h('tbody', ...Object.values(PROFILS_IA).map((p) => h('tr',
          h('td', { style: { fontWeight: '700', whiteSpace: 'nowrap' } }, p.nom),
          h('td.petit', p.desc),
        ))),
      ),
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
