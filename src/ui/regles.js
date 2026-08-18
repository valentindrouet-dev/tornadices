// Rappel des règles, tel qu'implémenté par le moteur.

import { h } from './dom.js?v=1.43';
import {
  pastilleSymbole, suiteSymboles, emblemeEquipe,
  SVG_TORNADE_EVEILLEE, SVG_TORNADE_ENDORMIE,
} from './icons.js?v=1.43';
import {
  COMBOS_TORNADE, CARTES_TORNADE, CARTES_SANS_POINTS, SYMBOLES, MISE_EN_PLACE,
  PROFILS_IA, COULEURS_EQUIPE,
} from '../core/config.js?v=1.43';
import { nomSymbole, nomAncien } from './apparence.js?v=1.43';

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
        + 'combinaison… ou jusqu’à ce que deux X figent ses dés et lui fassent rendre le lot. '
        + 'Trois éclairs, et il le passe en tentant d’attraper son voisin au passage.'),
      h('p.petit.muted', 'Une équipe remporte la manche en retournant tous ses jetons Abri. '
        + 'La première à réunir le nombre requis de cartes Tornade gagne la partie. '
        + 'Le sens de circulation s’inverse à chaque manche.'),
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

    h('div.carte',
      h('div.titre-section', 'Les symboles du dé'),
      h('div.grille.grille--3',
        ...['tornade', 'vache', 'zzz', 'x', 'eclair', 'joker'].map((s) => h('div.stat',
          h('div.rangee.rangee--serree', pastilleSymbole(s, 30),
            h('strong', nomSymbole(s))),
          h('div.sous', { style: { marginTop: '6px' } }, SYMBOLES[s].desc))),
      ),
      h('p.petit', { style: { marginTop: '12px' } },
        `Le dé officiel porte six faces : deux ${nomSymbole('tornade')}s, un X, `
        + `un ${nomSymbole('vache')} et deux ZzZ. `
        + 'L’éclair et le joker n’y sont plus — ils restent disponibles dans les Réglages, '
        + 'à poser soi-même sur une face pour les essayer.'),
      h('p.mini.muted',
        `Les deux faces de couleur portent l’habillage officiel : ${nomSymbole('tornade')} sur `
        + `le bleu, ${nomSymbole('vache')} sur le vert. Le moteur, lui, continue de parler de `
        + `« ${nomAncien('tornade')} » et de « ${nomAncien('vache')} » — les pouvoirs et les `
        + 'combinaisons n’ont pas bougé, et les Réglages permettent de reprendre l’ancien dessin.'),
      h('div.encart', { style: { marginTop: '14px' } },
        'Un dé peut être relancé autant de fois qu’on veut, un par un ou tous ensemble — '
        + 'sauf les X : dès qu’un X sort, le dé est figé sur cette face. Au deuxième X, il ne reste '
        + 'plus assez de dés libres pour former quoi que ce soit : le lot part aussitôt.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Le dé du jeu est et reste le d6. Les Réglages proposent un d8 et un d10 pour '
        + 'l’équilibrage : ils reprennent la même série de symboles depuis le début, et chaque '
        + 'face y reste modifiable une à une.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'Sans face éclair, la combinaison Attaque ne peut pas sortir : c’est donc l’Échec — '
        + 'le double X — qui porte l’attrape par défaut. Posez un éclair sur une face et '
        + 'repassez le déclencheur sur « Éclairs » pour retrouver l’attaque choisie.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Le joker'),
      h('div.rangee', { style: { marginBottom: '12px' } },
        pastilleSymbole('joker', 46),
        h('p.petit', { style: { flex: '1', margin: 0 } },
          'Le joker prend la face de n’importe quel symbole — tornade, abri, ZzZ ou éclair — '
          + 'jamais celle du X. Il valide donc n’importe quelle combinaison, et se garde d’un '
          + 'lancer à l’autre comme n’importe quel dé utile.'),
      ),
      h('p.petit', 'Quand un joker sert plusieurs combinaisons au même jet, c’est le joueur qui '
        + 'décide laquelle est jouée : la table lui laisse un instant pour trancher, puis joue '
        + 'la meilleure d’office s’il ne dit rien.'),
      h('div.encart.encart--info', { style: { marginTop: '12px' } },
        'Trois jokers d’un coup : c’est un échec, comme deux X. Le lot part sans rien tenter, '
        + 'et cet échec l’emporte sur tout ce que les jokers auraient pu servir — sans quoi le '
        + 'joker n’aurait aucun revers. Règle décochable dans les Réglages de partie.'),
      h('div.rangee', { style: { marginTop: '14px' } },
        pastilleSymbole('jokerDouble', 40),
        h('p.petit', { style: { flex: '1', margin: 0 } },
          h('strong', nomSymbole('jokerDouble')), ' — un joker limité à l’éclair et au ZzZ. '
          + 'Il n’est pas sur les dés au départ : ajoutez-le face par face dans les Réglages '
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
          + 'aux tornades avant de pouvoir retourner un jeton aux abris.'),
        h('span', { html: SVG_TORNADE_EVEILLEE, style: { width: '30px', color: 'var(--bleu)' } }),
      ),
      h('div.encart', { style: { marginTop: '14px' } },
        'Il faut être réveillé pour agir : les abris comme les ZzZ ne comptent que Tornade '
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
        ...[['rouge', 'Échec — deux X ou trois jokers, le lot part'], ['jaune', 'Trois éclairs — attrape'],
          ['bleu', 'Trois tornades — réveil'], ['vert', 'Trois abris — jeton'],
          ['violet', 'Trois ZzZ — endormi']].map(([c, texte]) =>
          h('span.badge', { 'data-alerte': c, style: { padding: '6px 12px' } }, texte)),
      ),
      h('p.petit', { style: { marginTop: '14px' } },
        'Les moments qui comptent s’annoncent en toutes lettres au centre de la table : '
        + 'un réveil, un endormissement, un Abri retourné, une attrape réussie. '
        + 'Et le journal garde la combinaison finale de chaque tour, avec son issue.'),
    ),

    h('div.carte',
      h('div.titre-section', 'L’attrape'),
      h('p.petit', 'Trois éclairs : passez le lot au joueur suivant et tentez de toucher ses dés '
        + 'ou la main qui les tient. Si vous le touchez, son tour est interrompu, il passe '
        + 'immédiatement son lot, et vous retournez un de vos jetons.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'On n’attrape que ce qui existe : si le joueur suivant a les mains vides, les trois '
        + 'éclairs ne valent rien. Il ne se passe rien, vous gardez votre lot et vous pouvez '
        + 'continuer à relancer.'),
      h('p.mini.muted', 'À la table virtuelle, l’attrape ouvre une fenêtre de réflexe : '
        + 'le toucheur appuie pour toucher, la cible pour retirer sa main. Entre IA, elle se '
        + 'résout à l’adresse et à l’esquive de chacun.'),
      h('div.encart.encart--info', { style: { marginTop: '12px' } },
        'Variante réglable dans les Réglages : un contact réussi peut emporter la manche '
        + 'entière. Elle devient alors une course à l’attrape plutôt qu’une course aux abris — '
        + 'mais il faut toujours toucher, les trois éclairs seuls ne suffisent jamais.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Qui porte l’attrape'),
      h('p.petit', 'Deux combinaisons peuvent tenter le contact, et les Réglages disent '
        + 'laquelle : « Éclairs » désigne l’Attaque — la règle de base — et « Échecs » désigne '
        + 'l’Échec. Ce sont bien les combinaisons qui décident des dés : réglez la ligne du '
        + 'tableau, et le déclencheur suit, qu’il demande trois éclairs, deux X ou trois X.'),
      h('p.petit.muted', 'En mode « Échecs », on ne choisit plus d’attaquer : on attaque à chaque '
        + 'fois que le hasard le permet, et l’échec cesse d’être une pure perte. L’Attaque, elle, '
        + 'reste réglable dans le tableau mais ne se joue plus — sans quoi elle coûterait le lot '
        + 'sans rien tenter. La liste des combinaisons de la table le rappelle.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Un dormeur ne tend pas la main : Tornade endormie, l’Échec reste un échec sec, on '
        + 'passe le lot sans tenter le contact. Il faut s’être réveillé pour attraper au '
        + 'passage — règle décochable dans les Réglages. Elle ne touche pas l’Attaque, '
        + 'qui vaut dans les deux états.'),
    ),

    h('div.carte',
      h('div.titre-section', 'Les cartes Tornade — avec les jetons'),
      h('table.tbl',
        h('thead', h('tr', h('th', 'Carte'), h('th', 'Combinaison'), h('th', 'Effet'))),
        h('tbody', ...CARTES_TORNADE.map((c) => h('tr',
          h('td', { style: { fontWeight: '700' } }, c.nom),
          h('td', c.combo
            ? h('div.rangee.rangee--serree', suiteSymboles(c.combo.requis, 18))
            : h('span.mini.muted', '—')),
          h('td.petit', c.texte),
        ))),
      ),
    ),

    // Le mode « sans les points » a son propre paquet, de bout en bout : sans
    // jeton à retourner, une carte ne joue plus que sur les cartes elles-mêmes.
    h('div.carte',
      h('div.titre-section', 'Les cartes Tornade — sans les points'),
      h('p.petit', 'Un paquet entièrement différent : plus de jeton à manipuler, les cartes '
        + 'jouent sur les cartes. Certaines doublent la mise pour une équipe, d’autres emportent '
        + 'la manche à la combinaison, une dernière vole son point à un adversaire.'),
      h('table.tbl',
        h('thead', h('tr', h('th', 'Carte'), h('th.num', 'Verso'),
          h('th', 'Combinaison'), h('th', 'Effet'))),
        h('tbody', ...CARTES_SANS_POINTS.map((c) => h('tr',
          h('td', { style: { fontWeight: '700' } }, c.nom),
          h('td.num', h('span.fleche-sens', {
            title: c.sens > 0 ? 'Sens horaire' : 'Sens antihoraire',
          }, c.sens > 0 ? '↻' : '↺')),
          h('td', c.combo
            ? h('div.rangee.rangee--serree', suiteSymboles(c.combo.requis, 18))
            : h('span.mini.muted', '—')),
          h('td.petit', c.texte),
        ))),
      ),
      h('div.encart', { style: { marginTop: '12px' } },
        'On révèle une Tornade et on la joue. Une équipe qui doit gagner deux cartes prend celle '
        + 'en cours et la première du dessus de la pioche, qu’elle garde face cachée dans sa '
        + 'pile : deux points d’un coup.'),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'La Tornade de feuille ouvre la partie sans pouvoir particulier, mais elle se gagne '
        + 'comme les autres : l’équipe qui prend la manche de chauffe la met dans sa pile.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Le sens de rotation ne s’inverse plus d’une manche à l’autre : chaque Tornade porte une '
        + 'flèche au dos, et l’on joue la manche dans le sens qu’annonce la prochaine carte, '
        + 'encore face cachée sur la pioche. Deux manches de suite peuvent tourner dans le même '
        + 'sens.'),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'Les combinaisons se règlent carte par carte dans les Réglages, sous « Cartes Tornade en '
        + 'jeu » — plus dans le tableau des combinaisons.'),
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
      h('p.petit', { style: { marginTop: '12px' } },
        'À la première manche, ce sont les Jaunes qui prennent les lots, et le Vert avec eux. '
        + 'Ensuite, les dés reviennent toujours aux perdants de la manche précédente — sauf sous '
        + '« Journée de la triche », où ce sont les gagnants qui repartent avec.'),
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
        'La table n’affiche que les combinaisons que le dé peut produire. Sans face joker, '
        + '« Trois jokers » n’est pas une règle en sommeil : c’est une ligne morte, et elle '
        + 'disparaît de la liste.'),
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

    h('div.carte',
      h('div.titre-section', 'La version sans les points'),
      h('p.petit', 'Une seconde façon de jouer une manche, à choisir dans les Réglages. Les '
        + 'jetons sortent du jeu : on se réveille aux trois tornades, puis on cherche les trois '
        + 'abris, et le premier joueur qui les sort arrête la manche sur-le-champ. Son équipe '
        + 'prend la carte Tornade, et la manche suivante commence.'),
      h('p.petit.muted', 'Tout le reste tient : le dé, les combinaisons, l’attrape, le rythme, '
        + 'les X qui figent. Seul le décompte change — c’est le nombre de cartes qui fait le '
        + 'vainqueur, quatre en général au lieu de trois.'),
      h('div.encart', { style: { marginTop: '10px' } },
        'L’attrape emporte la manche elle aussi : il n’y a plus de jeton à prendre, un contact '
        + 'réussi vaut donc la manche entière. C’est la base du mode — la course se gagne des '
        + 'deux mains, sortir l’Abri ou attraper celui qui allait le sortir. Le réglage « Ce '
        + 'que rapporte l’attrape » démarre donc sur « Manche gagnée », et reste modifiable.'),
      h('div.encart.encart--info', { style: { marginTop: '10px' } },
        'Certaines cartes Tornade manipulent les jetons : dans ce mode, elles ne font rien de '
        + 'plus qu’une carte ordinaire. Et à nombre impair, la manche devient une course où le '
        + 'Vert est seul contre tous — « Cartes du Vert » est là pour le remettre à niveau.'),
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
      h('table.tbl',
        h('thead', h('tr', h('th', 'Caractère'), h('th', 'Ce qu’il cherche'))),
        h('tbody', ...Object.values(PROFILS_IA).map((p) => h('tr',
          h('td', { style: { fontWeight: '700', whiteSpace: 'nowrap' } }, p.nom),
          h('td.petit', p.desc),
        ))),
      ),
    ),

    h('div.carte',
      h('div.titre-section', 'Les sons de la table'),
      h('p.petit', 'Quatre sons ponctuent la partie : la sonnerie quand vous vous réveillez, '
        + 'le ronflement quand on vous rendort, le meuglement d’un Abri retourné — le vôtre '
        + 'ou celui d’un autre — et l’alarme dès qu’une attrape est tentée, où que ce soit.'),
      h('p.petit.muted', 'Le réveil et le ronflement ne sonnent que pour vous : à six autour de '
        + 'la table, ils sonneraient sans arrêt. Le bouton 🔊 de l’en-tête les coupe en cours de '
        + 'manche ; les Réglages en donnent le volume et permettent de les écouter un par un.'),
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
