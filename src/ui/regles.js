// Rappel des règles, tel qu'implémenté par le moteur.

import { h } from './dom.js?v=1.87';
import {
  pastilleSymbole, suiteSymboles, emblemeEquipe,
  SVG_TORNADE_EVEILLEE, SVG_TORNADE_ENDORMIE,
} from './icons.js?v=1.87';
import {
  COMBOS_TORNADE, CARTES_TORNADE, SYMBOLES, MISE_EN_PLACE,
  PROFILS_IA, COULEURS_EQUIPE, OPTIONS_SENS, AIDE_SENS, REGLE_CARTES_DEUX_ETATS,
} from '../core/config.js?v=1.87';
import { nomSymbole, nomAncien } from './apparence.js?v=1.87';

/** Où sort une carte d'animal. */
const TABLES_ANIMAL = {
  cowboy: 'À trois, cinq et sept joueurs, avec le joueur Vert.',
};

export function vueRegles() {
  return h('div.page',
    h('div.rangee', { style: { margin: '6px 0 18px' } }, h('h1', 'Règles — TornaDice V4.5')),

    h('div.carte',
      h('div.titre-section', 'Le rythme d’un lot'),
      h('p.petit', 'Un lot qui arrive porte la face « ? » : rien n’est encore lancé. Les dés '
        + 'roulent une seconde, on lit le résultat, on a le temps de le voir, puis le lot met une '
        + 'seconde à rejoindre le voisin. Ces trois durées se règlent dans le menu Réglages — '
        + 'elles font le tempo du jeu et comptent dans la durée d’une partie.'),
      h('p.petit.muted', 'Chaque dé roule pour son propre compte : on peut en relancer un pendant '
        + 'qu’un autre tourne encore, un clic par dé, la barre espace pour tous.'),
      h('p.petit.muted', 'Un curseur d’irrégularité, dans les Réglages, fait varier ces durées '
        + 'd’un geste à l’autre : à 0 % le tempo est mécanique, à 30 % un passage réglé à '
        + '1000 ms dure entre 700 et 1300 ms. La table respire, sans que la moyenne bouge.'),
      h('p.petit', 'On ne tient jamais deux lots. Quand deux se rencontrent, celui qu’on avait '
        + 'en main est poussé aussitôt vers le voisin suivant — quitte à le pousser à son tour — '
        + 'et on enchaîne sur le nouveau, faces « ? », à lancer.'),
      h('div.encart.encart--info', { style: { margin: '10px 0' } },
        'Variante des Réglages : les lots s’empilent au lieu de se pousser. Le lot qui arrive '
        + 'attend son tour derrière celui qu’on a en main, et l’on s’en occupe une fois le '
        + 'premier parti. Rien ne rebondit plus sur le voisin — c’est le joueur lent qui '
        + 'accumule, et il peut se retrouver avec toute la table sur les bras.'),
      h('p.petit.muted', 'Entre deux manches, les dés reviennent au centre de la table puis '
        + 'repartent vers l’équipe qui vient de perdre, pendant que la carte Tornade suivante '
        + 'recouvre la précédente.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Le principe'),
      h('p', 'Deux équipes, les Bleus et les Jaunes — et un joueur Vert en solo si le nombre '
        + 'est impair. Plusieurs lots de dés circulent en même temps autour de la table. Celui '
        + 'qui tient un lot le relance aussi vite et aussi souvent qu’il veut, jusqu’à sortir une '
        + `combinaison… ou jusqu’à ce que deux « ${nomSymbole('x')} » figent ses dés et lui `
        + 'fassent rendre le lot — l’Échec : il le passe alors en tentant d’attraper son '
        + 'voisin au passage.'),
      h('p.petit.muted', 'Une équipe remporte la manche en sortant de la tornade tous ses jetons. '
        + 'La première à réunir le nombre requis de cartes Tornade gagne la partie. '
        + 'Le sens de circulation s’inverse à chaque manche — deux autres façons d’en décider '
        + 'sont décrites plus bas.'),
      h('p.petit.muted', 'Les Réglages proposent une seconde façon de compter, « sans les '
        + 'points » : le premier Abri arrête la manche. Elle est décrite plus bas.'),
      // Chaque équipe a son emblème : c'est ainsi qu'on les nomme à la table.
      h('div.grille.grille--3', { style: { marginTop: '14px' } },
        ...Object.values(COULEURS_EQUIPE).map((e) => h('div.stat',
          h('div.rangee.rangee--serree',
            emblemeEquipe(e.embleme, 30),
            h('strong', { style: { color: e.hex } }, e.emblemeNom)),
          h('div.sous', { style: { marginTop: '6px' } },
            e.id === 'vert'
              ? 'Le joueur Vert, seul contre les deux équipes.'
              : `L’équipe ${e.nom.toLowerCase()}.`),
        )),
      ),
    ),

    // Où sont les jetons pendant la manche : sur la carte Tornade. C'est la
    // première chose qu'on voit de la table, et le sens de tout le reste.
    h('div.carte',
      h('div.titre-section', 'Les jetons, pris dans la tornade'),
      h('p', 'Les jetons en jeu ne restent pas devant leur équipe : ils sont posés sur la carte '
        + 'Tornade, au milieu de la table. Ce sont vos animaux pris dedans, et les trois équipes '
        + 'y ont les leurs, chacune de sa couleur.'),
      h('p', 'Chaque combinaison Abri en sort un de la carte : un animal de plus à couvert. '
        + 'L’équipe qui a sorti tous les siens remporte la manche sur-le-champ — la tornade n’a '
        + 'plus rien à elle.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'Combien de jetons sont en jeu dépend de la façon de jouer : avec les jetons, c’est tout '
        + 'le stock de l’équipe — de deux à quatre selon l’effectif ; en Compromis, c’est ce que '
        + 'la Tornade du jour retient, de un à trois. L’Immédiat, lui, n’en met aucun : le premier '
        + 'Abri prend la manche.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Variante des Réglages : les jetons restent devant chaque équipe, face cachée, et l’Abri '
        + 'les retourne un à un — l’ancienne place. Le nombre d’Abris à réussir est le même, la '
        + 'carte Tornade reste nue, et chacun suit son propre compteur au lieu de lire la même '
        + 'carte.'),
      h('p.petit.muted', { style: { marginTop: '10px' } },
        'Les jetons reviennent sur la carte au début de chaque manche : une manche est une course '
        + 'indépendante, jamais un cumul de la précédente.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les symboles du dé'),
      h('div.grille.grille--3',
        ...['tornade', 'vache', 'zzz', 'x'].map((s) => h('div.stat',
          h('div.rangee.rangee--serree', pastilleSymbole(s, 30),
            h('strong', nomSymbole(s))),
          h('div.sous', { style: { marginTop: '6px' } }, SYMBOLES[s].desc))),
      ),
      h('p.petit', { style: { marginTop: '12px' } },
        `Le dé officiel porte six faces : deux « ${nomSymbole('tornade')} », un `
        + `« ${nomSymbole('x')} », un « ${nomSymbole('vache')} » et deux « ${nomSymbole('zzz')} ».`),
      h('p.mini.muted',
        'Les quatre faces du jeu portent l’habillage officiel : le soleil qui réveille, la grange '
        + 'où l’on s’abrite, la lune du sommeil, la tornade rouge qui fige le dé. Le moteur, lui, '
        + `continue de parler de « ${nomAncien('tornade')} », « ${nomAncien('vache')} », `
        + `« ${nomAncien('zzz')} » et « ${nomAncien('x')} » — les pouvoirs et les combinaisons `
        + 'n’ont pas bougé, et les Réglages permettent de reprendre chaque ancien dessin.'),
      h('div.encart', { style: { marginTop: '14px' } },
        'Un dé peut être relancé autant de fois qu’on veut, un par un ou tous ensemble — '
        + `sauf « ${nomSymbole('x')} » : dès que ce symbole sort, le dé est figé sur cette face. `
        + 'Au deuxième, il ne reste plus assez de dés libres pour former quoi que ce soit : le '
        + 'lot part aussitôt.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Le dé du jeu est et reste le d6 : six faces, ni plus ni moins. Ce qu’elles portent, en '
        + 'revanche, se change une à une dans les Réglages — c’est là que se fait l’équilibrage.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les combinaisons'),
      h('div.tbl-defile', h('table.tbl',
        h('thead', h('tr', h('th', 'Combinaison'), h('th', 'Effet'), h('th', 'Condition'))),
        h('tbody', ...COMBOS_TORNADE.map((c) => h('tr',
          h('td', h('div.rangee.rangee--serree', suiteSymboles(c.requis, 20))),
          h('td', h('strong', c.nom), h('div.petit.muted', c.libelle)),
          h('td.petit',
            c.face === 'active' ? 'Tornade éveillée'
              : c.face === 'endormie' ? 'Tornade endormie'
                : 'Quel que soit l’état'),
        ))),
      )),
      h('div.rangee', { style: { marginTop: '14px' } },
        h('span', { html: SVG_TORNADE_ENDORMIE, style: { width: '30px', color: 'var(--gris-clair)' } }),
        h('span.petit', 'Chaque manche commence Tornade endormie : il faut d’abord se réveiller '
          + 'aux tornades avant de pouvoir sortir un jeton de la tornade.'),
        h('span', { html: SVG_TORNADE_EVEILLEE, style: { width: '30px', color: 'var(--bleu)' } }),
      ),
      h('div.encart', { style: { marginTop: '14px' } },
        'Il faut être réveillé pour agir : les abris comme les sommeils ne comptent que Tornade '
        + 'éveillée, et les réveils ne comptent que si l’on dort encore. Seuls l’attrape et '
        + 'les deux échecs valent dans les deux états.'),
      h('div.encart', { style: { marginTop: '10px' } }, REGLE_CARTES_DEUX_ETATS),
      h('div.encart', { style: { marginTop: '10px' } },
        'Une combinaison servie est jouée d’office : on ne relance pas par-dessus. Le lot part '
        + 'vers le voisin, puis l’effet s’applique.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'Le Réveil s’applique en toutes circonstances : un dormeur qui sort ses soleils se '
        + 'réveille, même quand les Réglages permettent de relancer par-dessus une combinaison, et '
        + 'même quand la carte du jour sort au même jet — il joue la carte, et se réveille avec.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les alertes de la table'),
      h('p.petit', 'Dès qu’une combinaison sort, la zone du joueur s’entoure d’un halo de couleur : '
        + 'on repère d’un coup d’œil ce qui se passe autour de la table, sans lire les dés.'),
      h('div.rangee',
        ...[[`rouge`, `Échec — deux « ${nomSymbole('x')} », le lot part`],
          ['or', `Trois « ${nomSymbole('tornade')} » — réveil`],
          ['vert', `Trois « ${nomSymbole('vache')} » — jeton`],
          ['nuit', `Trois « ${nomSymbole('zzz')} » — endormi`]].map(([c, texte]) =>
          h('span.badge', { 'data-alerte': c, style: { padding: '6px 12px' } }, texte)),
      ),
      h('p.petit', { style: { marginTop: '14px' } },
        'Les moments qui comptent s’annoncent en toutes lettres au centre de la table : '
        + 'un réveil, un endormissement, un jeton sorti de la tornade, une attrape réussie. '
        + 'Et le journal garde la combinaison finale de chaque tour, avec son issue.'),
    ),

    h('div.carte',
      h('div.titre-section', 'L’attrape'),
      h('p.petit', `C’est l’Échec qui la déclenche : deux « ${nomSymbole('x')} » figent vos dés, `
        + 'votre lot part vers le joueur suivant — et vous tentez au passage de toucher ses dés '
        + 'ou la main qui les tient. Si vous le touchez, son tour est interrompu, il passe '
        + 'immédiatement son lot, et vous sortez un de vos jetons de la tornade.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'On n’attrape que ce qui existe : si le joueur suivant a les mains vides, l’Échec reste '
        + 'un échec sec — votre lot part, sans rien tenter.'),
      h('p.mini.muted', 'À la table virtuelle, l’attrape ouvre une fenêtre de réflexe : '
        + 'le toucheur appuie pour toucher, la cible pour retirer sa main. Entre IA, elle se '
        + 'résout à l’adresse et à l’esquive de chacun.'),
      h('div.encart.encart--info', { style: { marginTop: '12px' } },
        'Variante réglable dans les Réglages : un contact réussi peut emporter la manche '
        + 'entière. Elle devient alors une course à l’attrape plutôt qu’une course aux abris — '
        + 'mais il faut toujours toucher, l’Échec seul ne suffit jamais.'),
    ),

    h('div.carte',
      h('div.titre-section', 'L’Échec porte l’attrape'),
      h('p.petit', 'On ne choisit pas d’attaquer : on attaque chaque fois que le hasard le '
        + 'permet, et l’échec cesse d’être une pure perte. Ce sont les dés de l’Échec qui '
        + `décident — deux « ${nomSymbole('x')} » au départ, ou ce que la ligne Échec du tableau `
        + 'demande dans les Réglages.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Un dormeur ne tend pas la main : Tornade endormie, l’Échec reste un échec sec, on '
        + 'passe le lot sans tenter le contact. Il faut s’être réveillé pour attraper au '
        + 'passage — règle décochable dans les Réglages.'),
    ),

    // Un seul paquet pour les trois façons de jouer : une carte n'a pas de
    // variante d'un mode à l'autre.
    h('div.carte',
      h('div.titre-section', 'Les cartes Tornade'),
      h('p.petit', 'Un seul paquet, pour les trois façons de jouer une manche : une carte a le même '
        + 'titre, le même texte et le même pouvoir avec les jetons, en Immédiat ou en Compromis. '
        + 'Certaines ouvrent une combinaison pour la manche, d’autres changent la façon de jouer, '
        + 'd’autres encore doublent la mise ou volent son point à un adversaire.'),
      h('div.tbl-defile', h('table.tbl',
        h('thead', h('tr', h('th', 'Carte'), h('th', 'Combinaison'), h('th', 'Effet'))),
        h('tbody', ...CARTES_TORNADE.map((c) => h('tr',
          h('td', { style: { fontWeight: '700' } }, c.nom),
          h('td', c.combo
            ? h('div.rangee.rangee--serree', suiteSymboles(c.combo.requis, 18))
            : h('span.mini.muted', '—')),
          h('td.petit', c.texte,
            TABLES_ANIMAL[c.animal] ? h('div.mini.muted', TABLES_ANIMAL[c.animal]) : null),
        ))),
      )),
      h('div.encart', { style: { marginTop: '12px' } },
        'On révèle une Tornade et on la joue. Une équipe qui doit gagner deux cartes prend celle '
        + 'en cours et la première du dessus de la pioche, qu’elle garde face cachée dans sa '
        + 'pile : deux points d’un coup.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'Les cartes d’animal ne sortent que si l’animal est à la table : la Tornade de Cow-Boy '
        + 'avec le joueur Vert, celles des Vaches et des Poules à toutes les tables.'),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'La Tornade de Chauffe ouvre la partie : la manche se joue comme les autres, mais la '
        + 'carte ne rapporte rien — elle est défaussée. La Méga Tornade demande cinq symboles : '
        + 'il faut des lots d’au moins cinq dés pour la réaliser.'),

      h('div.encart', { style: { marginTop: '10px' } }, REGLE_CARTES_DEUX_ETATS),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'Les combinaisons se règlent carte par carte dans les Réglages, sous « Cartes Tornade en '
        + 'jeu » — plus dans le tableau des combinaisons.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Mise en place'),
      h('div.tbl-defile', h('table.tbl',
        h('thead', h('tr', h('th.num', 'Joueurs'), h('th.num', 'Lots de dés'),
          h('th.num', 'Jetons par équipe'), h('th.num', 'Jetons du Vert'),
          h('th.num', 'Cartes pour gagner'))),
        h('tbody', ...Object.entries(MISE_EN_PLACE).map(([n, m]) => h('tr',
          h('td.num', n),
          h('td.num', m.lots), h('td.num', m.jetons),
          h('td.num', Number(n) % 2 ? m.jetonsVert : '—'), h('td.num', m.cartes),
        ))),
      )),
      h('p.mini.muted', { style: { marginTop: '8px' } },
        'TornaDice se joue de trois à huit joueurs. À trois, une Vache, une Poule et le Cow-Boy '
        + 'jouent chacun pour son camp.'),
      h('p.petit', { style: { marginTop: '12px' } },
        'À la première manche, ce sont les Jaunes qui prennent les lots, et le Vert avec eux. '
        + 'Ensuite, les dés reviennent toujours aux perdants de la manche précédente — sauf sous '
        + 'la Tornade des Tricheurs, où ce sont les gagnants qui repartent avec.'),
      h('p.mini.muted', 'Les Réglages permettent d’ouvrir sur les Bleus, ou sur le Vert seul : '
        + 'utile pour voir ce que change le premier tour de table. Sur 300 parties simulées, '
        + 'aucun écart mesurable sur les victoires — c’est un réglage de confort, pas '
        + 'd’équilibrage.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Des combinaisons propres au Vert'),
      h('p.petit', 'Le Vert joue seul contre deux équipes. Les Réglages permettent de lui donner '
        + 'ses propres exigences : cochez « Combinaisons du Vert à part » et chaque ligne du '
        + 'tableau se dédouble — celle des Bleus et des Jaunes, puis celle du Vert.'),
      h('p.petit.muted', 'Deux tornades au lieu de trois pour se réveiller plus vite, deux abris '
        + 'au lieu de trois pour prendre la manche plus tôt, quatre pour l’alourdir : tout est réglable ligne par ligne, cartes comprises. Décochez la case et '
        + 'la table redevient strictement symétrique — c’est la référence, et le réglage part '
        + 'décoché.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Une ligne du Vert laissée identique à celle des deux équipes ne change rien : c’est '
        + 'l’écart qui compte. Le Laboratoire mesure l’effet en une campagne.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Réveillé seulement'),
      h('p.petit', 'Le tableau des combinaisons porte une colonne « Réveillé ». Cochée, la '
        + 'combinaison ne sort plus que Tornade éveillée — et la table le montre : les '
        + 'combinaisons y sont rangées en deux listes, celles qu’on peut jouer en dormant et '
        + 'celles qui demandent d’être réveillé.'),
      h('p.petit.muted', 'Décochée, la combinaison reprend sa condition d’origine. Le Réveil '
        + 'reste donc réservé au dormeur : sans quoi on ne pourrait plus jamais se réveiller.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'La table n’affiche que les combinaisons que le dé peut produire : une ligne qui '
        + 'réclame une face absente du dé est une ligne morte, et elle disparaît de la liste.'),
    ),

    h('div.carte',
      h('div.titre-section', 'L’apparence des faces'),
      h('p.petit', `La face bleue du dé officiel porte ${nomSymbole('tornade')}, la face verte `
        + `${nomSymbole('vache')} — une maison. Les deux se réhabillent quand on veut, dans les `
        + 'Réglages : reprenez l’ancien dessin, ou importez le vôtre, et changez le nom affiché '
        + 'dans la foulée.'),
      h('p.petit.muted', 'Le pouvoir ne bouge pas : même symbole pour le moteur, même '
        + 'combinaison, même effet. Seuls l’illustration et le nom changent, partout sur le '
        + 'site — dans les menus, sur les dés, dans les listes de combinaisons. Une règle '
        + 'enregistrée sous l’ancien nom reste donc valable.'),
    ),

    // Le sens de rotation se règle à part de la façon de jouer une manche : les
    // trois façons de tourner se marient avec les trois façons de compter.
    h('div.carte',
      h('div.titre-section', 'Le sens de rotation'),
      h('p.petit', 'Le sens décide de tout ce qui se passe entre voisins : on ne passe son lot '
        + 'qu’à son voisin d’aval, on ne peut attraper que lui, et l’on n’est attrapé que par son '
        + 'voisin d’amont. Trois façons d’en décider, au choix dans les Réglages.'),
      h('div.tbl-defile', h('table.tbl',
        h('thead', h('tr', h('th', 'Règle'), h('th', 'Comment le sens se décide'))),
        // Pas de `nowrap` ici : « Au dos de la prochaine Tornade » ne tient pas
        // sur une ligne de téléphone, et forcerait la page à déborder.
        h('tbody', ...OPTIONS_SENS.map(([id, lib]) => h('tr',
          h('td', { style: { fontWeight: '700' } }, lib),
          h('td.petit', AIDE_SENS[id]),
        ))),
      )),
      h('div.encart', { style: { marginTop: '12px' } },
        'La carte de sens fait de la défaite une décision. L’équipe qui reçoit les dés regarde qui '
        + 'elle aura devant elle et qui elle aura derrière : retourner la carte lui change sa '
        + 'proie et son prédateur d’un même geste. C’est le seul moment de la partie où l’on '
        + 'choisit ses voisins — et il revient à celui qui vient de perdre.'),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'À la table virtuelle, les équipes menées par l’ordinateur pèsent les deux sens — adresse '
        + 'des uns, esquive des autres — et ne retournent la carte que si elles y gagnent. Quand '
        + 'un joueur humain reçoit les dés, la partie s’arrête le temps qu’il décide ; sans '
        + 'réponse, la carte reste en place.'),
    ),

    h('div.carte',
      h('div.titre-section', 'La version « Immédiat »'),
      h('p.petit', 'La deuxième des trois façons de jouer une manche, à choisir dans les '
        + 'Réglages. Les '
        + 'jetons sortent du jeu : on se réveille aux trois tornades, puis on cherche les trois '
        + 'abris, et le premier joueur qui les sort arrête la manche sur-le-champ. Son équipe '
        + 'prend la carte Tornade, et la manche suivante commence.'),
      h('p.petit.muted', 'Tout le reste tient : le dé, les combinaisons, l’attrape, le rythme, '
        + `les « ${nomSymbole('x')} » qui figent. Seul le décompte change — c’est le nombre de cartes qui fait le `
        + 'vainqueur, quatre en général au lieu de trois.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'L’attrape emporte la manche elle aussi : il n’y a plus de jeton à prendre, un contact '
        + 'réussi vaut donc la manche entière. C’est la base du mode — la course se gagne des '
        + 'deux mains, sortir l’Abri ou attraper celui qui allait le sortir. Le réglage « Ce '
        + 'que rapporte l’attrape » démarre donc sur « Manche gagnée », et reste modifiable.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'À nombre impair, la manche devient une course où le Vert est seul contre tous — '
        + '« Cartes du Vert » est là pour le remettre à niveau.'),
    ),

    // Le troisième mode : entre les jetons de la règle de base et l'Immédiat.
    h('div.carte',
      h('div.titre-section', 'La version « Compromis »'),
      h('p.petit', 'La troisième façon de jouer une manche, et un entre-deux : les jetons '
        + 'reviennent, mais ce n’est plus tout le stock de l’équipe qui est en jeu — c’est la '
        + 'Tornade du jour qui dit combien elle en retient.'),
      h('p.petit', 'Chaque équipe a trois jetons de sa couleur. La Tornade en cours en retient de '
        + 'un à trois, indiqué sur la carte, et il faut les sortir tous pour prendre la manche. '
        + 'Chaque combinaison Abri en sort un.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'Deux façons de prendre la manche, et deux seulement : sortir le dernier jeton demandé — '
        + 'vos animaux sont à couvert, la manche est à vous sur-le-champ — ou réussir une '
        + 'collision, qui renvoie un jeton adverse dans la tornade et emporte la manche de '
        + 'la même façon.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Avec les jetons laissés devant les équipes — la variante de « Où sont les jetons » — ce '
        + 'mode se joue à l’envers : une carte Refuge est posée au milieu de la table, et chaque '
        + 'Abri y pose un jeton au lieu d’en sortir un de la Tornade. Le compte est le même.'),
      h('p.petit.muted', { style: { marginTop: '10px' } },
        `Le reste tient sans changer : le dé, les combinaisons, le rythme, les « ${nomSymbole('x')} » qui figent, la `
        + 'façon dont se décide le sens de rotation. C’est le nombre de cartes qui fait '
        + 'le vainqueur, cinq par défaut — les manches y sont plus longues que dans l’Immédiat, '
        + 'plus courtes que dans le mode Jeton.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Le nombre de jetons demandés se règle carte par carte, dans « Cartes Tornade en jeu ». '
        + 'C’est le levier d’équilibrage propre au mode : une Tornade exigeante fait une manche '
        + 'longue, une Tornade légère une manche expédiée. Sur 200 parties d’IA équilibrées à six '
        + 'joueurs, la partie dure 4 min 29 s en 6,4 manches — l’Abri en emporte 43 %, la '
        + 'collision 40 %, les combinaisons de cartes le reste.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les caractères des IA'),
      h('p.petit', 'Chaque siège tenu par une IA reçoit un caractère, choisi sur l’accueil. '
        + 'Il dit ce que cette IA cherche à faire de ses dés — pas ce qu’elle accepte : '
        + 'une combinaison servie reste jouée d’office, même par un joueur qui ne la visait pas.'),
      h('div.encart', { style: { marginBottom: '14px' } },
        'Aucune IA ne vise l’attrape dans le vide : tant que le joueur suivant a les mains '
        + 'libres, même l’Agressif joue le coup utile — la tornade s’il dort, l’abri s’il est '
        + 'réveillé. L’envie d’attraper revient dès que le voisin reprend un lot.'),
      h('div.tbl-defile', h('table.tbl',
        h('thead', h('tr', h('th', 'Caractère'), h('th', 'Ce qu’il cherche'))),
        h('tbody', ...Object.values(PROFILS_IA).map((p) => h('tr',
          h('td', { style: { fontWeight: '700', whiteSpace: 'nowrap' } }, p.nom),
          h('td.petit', p.desc),
        ))),
      )),
    ),

    h('div.carte',
      h('div.titre-section', 'Les sons de la table'),
      h('p.petit', 'Quatre sons ponctuent la partie : la sonnerie quand vous vous réveillez, '
        + 'le ronflement quand on vous rendort, le meuglement d’un Abri réussi — le vôtre '
        + 'ou celui d’un autre — et l’alarme dès qu’une attrape est tentée, où que ce soit.'),
      h('p.petit.muted', 'Le réveil et le ronflement ne sonnent que pour vous : à six autour de '
        + 'la table, ils sonneraient sans arrêt. Le bouton 🔊 de l’en-tête les coupe en cours de '
        + 'manche ; les Réglages en donnent le volume et permettent de les écouter un par un.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Incidents fâcheux'),
      h('ul.petit',
        h('li', `Relancer un « ${nomSymbole('x')} » par mégarde : le joueur passe son lot.`),
        h('li', 'Lancer les dés au lieu de les passer, ou ne pas passer après une attrape : '
          + 'les équipes adverses sortent un jeton de la tornade.'),
        h('li', 'Un dé tombe, un imprévu survient : mettez le jeu en pause.'),
      ),
    ),
  );
}
