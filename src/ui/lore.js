// Lore et images : l'histoire de TornaDice, ses personnages, et les visuels du jeu.
// Pour donner un portrait à un personnage, posez son image dans assets/lore/
// et inscrivez-la dans PORTRAITS, sous l'identifiant du personnage.

import { h } from './dom.js?v=2.16';
import { VERSION } from '../version.js?v=2.16';
import { plancheInspiration } from './planche.js?v=2.16';

const PORTRAITS = {};

const CAMPS = [
  {
    id: 'budies',
    nom: 'Les Budies',
    couleur: '#f08a1c',
    clair: '#fff1e2',
    accroche: 'Les rescapés',
    texte: [
      'Avant, les Budies habitaient Hamacapulco : trois îles, quatre hamacs et neuf cent mille bananes. '
      + 'Il ne s’y passait jamais rien, et c’était très bien comme ça.',
      'Un mardi, la première tornade du Docteur est arrivée sans prévenir. Elle a pris les bananes, puis les hamacs, '
      + 'puis les îles, et elle a tout rangé n’importe où, en l’air. Les Budies ont décollé avec ce qu’ils avaient '
      + 'sous la main : un avion, une armure, un paon.',
    ],
    motivation: 'Sortir de la tornade. Tous, les trois, et si possible avec les bananes.',
    membres: [
      {
        id: 'big-budi', nom: 'Big Budi', titre: 'Orang-outan, pilote du Bananavion',
        texte: 'Le meilleur pilote d’Hamacapulco, et aussi le seul, ce qui facilite les concours. Son Bananavion '
          + 'roule à la purée de banane. Chaque tornade lui en arrache un régime : il vole donc vite, '
          + 'et il compte beaucoup.',
        motivation: 'Sortir de la tornade, et ne laisser personne dedans. Une promesse de Budi, ça ne s’envole pas, '
          + 'même dans une tornade.',
      },
      {
        id: 'octavius', nom: 'Octavius', titre: 'Une pieuvre dans une pieuvre (dans une pieuvre, dans…)',
        texte: 'Pour ne pas être emporté, ce poulpe très savant s’est fabriqué une armure en forme de pieuvre. '
          + 'Puis une deuxième par-dessus, au cas où. Puis une troisième, au cas où le cas où. '
          + 'L’ensemble fait des bulles. Personne ne sait pourquoi, pas même lui, et il y pense souvent.',
        motivation: 'Sortir de la tornade en calculant. C’est lui qui a compris que la tornade était faite de dés, '
          + 'et depuis il compte les faces sur ses huit bras — qui sont tous à l’intérieur, ce qui le gêne pour lancer.',
      },
      {
        id: 'leon', nom: 'Léon Tournepaon', titre: 'Paon-hélicoptère',
        texte: 'Quand il fait la roue, il la fait si vite qu’il décolle. Il regarde droit devant lui avec des yeux '
          + 'où il n’y a rien du tout, ce qui ne l’empêche pas de couper une tornade en rondelles.',
        motivation: 'Sortir de la tornade, sans très bien savoir qu’il y est : il croit que tout ce vent, '
          + 'ce sont des applaudissements. Il suit les deux autres, en saluant.',
      },
    ],
  },
  {
    id: 'nadoes',
    nom: 'Les Nadoes',
    couleur: '#2f7fd1',
    clair: '#e3f0fc',
    accroche: 'Les petites mains du Doc',
    texte: [
      'Les Nadoes sont de petits bonshommes noirs, tous pareils, et toujours un de plus qu’on croyait. '
      + 'Ils naissent de la suie du Générateur : à chaque tornade, il en tousse une poignée. '
      + 'Un Nado tout neuf ouvre les yeux en plein ciel, et la première chose qu’il apprend, c’est tomber.',
      'Le Docteur les employait pour remplir le Générateur et ramasser les dés tombés. Quand la machine s’est '
      + 'emballée, ils étaient dessus, dedans et dessous. Ils ont attrapé tout ce qui pouvait voler, et même ce qui ne pouvait pas.',
    ],
    motivation: 'Sortir de la tornade, et ne plus jamais tomber. Ils n’ont rien contre les Budies, '
      + 'sauf qu’il n’y a pas de place pour tout le monde dans une trouée de nuages.',
    membres: [
      {
        id: 'savonnef', nom: 'Le Savonnef', titre: 'Baignoire propulsée à la bonde',
        texte: 'Elle avance comme un hors-bord, poussée par le jet de sa bonde. Quand elle se retourne, elle se vide, '
          + 'et un entonnoir à l’arrière recueille la pluie pour repartir.',
        motivation: 'C’était la baignoire du Docteur, d’où son nom : une nef, avec un savon dedans. Les Nadoes ne savent pas à quoi elle servait. '
          + 'Ils ont trouvé un savon dedans et s’en servent pour viser.',
      },
      {
        id: 'siegoteuil', nom: 'Le Siégoteuil Volant', titre: 'Assemblage baroque',
        texte: 'Des fauteuils, des chaises, des hélices, des ailes, des voiles et des volants : un volant par Nado, '
          + 'personne n’a voulu prêter le sien.',
        motivation: 'Chacun tourne son volant de son côté, et c’est ce qui le tient en l’air. '
          + 'Le jour où deux Nadoes tomberont d’accord, le Siégoteuil tombera tout court.',
      },
      {
        id: 'rien', nom: 'Rien', titre: 'Le seul engin qui porte le nom exact de ce qu’il est',
        texte: 'Une grappe de Nadoes qui se tiennent par les mains et par les pieds, sans aucun engin. '
          + 'Ils sont tellement nombreux qu’ils se sont persuadés de voler. Tant que personne ne leur dit le contraire, '
          + 'ça marche.',
        motivation: 'Quand on leur demande sur quoi ils volent, ils répondent « Rien », et c’est vrai. Ils veulent prouver qu’on peut sortir d’une tornade avec rien. Surtout, ne leur parlez pas de coup de vent.',
      },
    ],
  },
  {
    id: 'doc',
    nom: 'Le Docteur Viktor Nado',
    couleur: '#7a4fc4',
    clair: '#f0eafb',
    accroche: 'Joueur solitaire',
    texte: [
      'Il est assis à califourchon sur son Générateur, qui vole grâce aux tornades qui lui sortent des fe… '
      + 'du réacteur arrière. Du Générateur. On parle du Générateur.',
      'Il voulait seulement prévoir le temps. Il a fini au milieu du pire temps qui soit, et c’est lui qui l’a fabriqué.',
    ],
    motivation: 'Sortir de sa tornade, lui aussi, et le premier : il a toujours détesté arriver après les autres. '
      + 'Il joue seul parce qu’il ne fait confiance à personne — ni aux Budies, ni à ses Nadoes, ni surtout aux dés.',
    membres: [],
  },
];

// L'inspiration : Claude Ponti. Ses images sont protégées : on renvoie vers
// elles (éditeur, lieux, expositions) au lieu de les recopier sur le site.
const PONTI = [
  {
    theme: 'Les poussins par milliers',
    pourquoi: 'La foule de petits bonshommes qui grouillent, se ressemblent tous et ont chacun leur idée : les Nadoes.',
    liens: [
      ['Pétronille et ses 120 petits', 'https://www.ecoledesloisirs.fr/livre/petronille-ses-120-petits', 'Une mère, cent vingt petits, et une forêt de plantes carnivores.'],
      ['Mille secrets de poussins', 'https://www.ecoledesloisirs.fr/livre/mille-secrets-poussins', 'L’encyclopédie des poussins : leurs inventions, leurs manies.'],
      ['Pouss’Poussins', 'https://www.ecoledesloisirs.fr/livre/pousspoussins', ''],
      ['Tromboline et Foulbazar : Dans rien', 'https://www.ecoledesloisirs.fr/livre/tromboline-foulbazar-rien', 'Deux poussins qui font des expériences — et un titre qui va bien aux Nadoes de « Rien ».'],
    ],
  },
  {
    theme: 'Blaise, tempêtes et catastrophes',
    pourquoi: 'Blaise le poussin masqué et sa bande débouchent une « tempêteuse », font des courses de chaises et '
      + 'voient arriver le « Kontrôleur de Kastatroffe » après l’orage : la tornade comme terrain de jeu.',
    liens: [
      ['À l’aise, Blaise !', 'https://www.ecoledesloisirs.fr/livre/a-laise-blaise', ''],
      ['Blaise 3 en 1', 'https://www.ecoledesloisirs.fr/livre/blaise-3-1', 'Trois aventures réunies.'],
      ['Blaise dompteur de tache', 'https://www.ecoledesloisirs.fr/livre/blaise-dompteur-tache', 'Une tache d’encre au sale caractère.'],
    ],
  },
  {
    theme: 'Monstres improbables',
    pourquoi: 'Des monstres plus étranges qu’effrayants, avec des noms qu’on invente en les disant : le modèle du Docteur Nado et de son Générateur.',
    liens: [
      ['Le jour du Mange-poussin', 'https://www.ecoledesloisirs.fr/livre/jour-du-mange-poussin', ''],
      ['Ma vallée', 'https://www.ecoledesloisirs.fr/livre/ma-vallee', 'Le pays des Touims, et un Tue-Planète qui voyage dans l’univers.'],
      ['L’Arbre sans fin', 'https://www.ecoledesloisirs.fr/livre/arbre-fin', ''],
    ],
  },
  {
    theme: 'Mondes à explorer',
    pourquoi: 'Des cartes, des pays entiers, des machines et des mots-valises — « Siégoteuil » est déjà un mot de Ponti.',
    liens: [
      ['L’Avie d’Isée', 'https://www.ecoledesloisirs.fr/livre/avie-disee', ''],
      ['La Venture d’Isée', 'https://www.ecoledesloisirs.fr/livre/venture-disee', ''],
      ['Au fond du jardin', 'https://www.ecoledesloisirs.fr/livre/au-fond-du-jardin', ''],
    ],
  },
  {
    theme: 'Pour tout voir',
    pourquoi: 'L’œuvre entière, ses poussins en vrai et une grande exposition à venir.',
    liens: [
      ['Claude Ponti chez l’école des loisirs', 'https://www.ecoledesloisirs.fr/auteur/claude-ponti', 'La bibliographie complète, plus de soixante-dix albums.'],
      ['Le livret Ponti de l’éditeur (PDF)', 'https://www.ecoledesloisirs.fr/sites/default/files/auteurs_pdf/livret_ponti_bd.pdf', ''],
      ['Le Poussin endormi, Jardin des Plantes de Nantes', 'https://mymodernmet.com/fr/claude-ponti-poussin-endormi-topiaire/', 'Ses poussins géants en buis, installés avec le Voyage à Nantes.'],
      ['Les installations des jardins de Nantes', 'https://metropole.nantes.fr/que-faire-nantes/balade-autour-des-installations-artistiques-dans-les-parcs-et-jardins', ''],
      ['« Claude Ponti et l’enfance », Musée de l’Homme', 'https://75.agendaculturel.fr/exposition/claude-ponti-et-l-enfance.html', 'Paris, du 3 février 2027 au 2 janvier 2028.'],
      ['Claude Ponti sur Wikipédia', 'https://fr.wikipedia.org/wiki/Claude_Ponti', ''],
    ],
  },
];

const IMAGES_JEU = [
  { titre: 'Logo', src: 'assets/logo-tornadice.png', large: true },
  { titre: 'Dé — Réveil', src: 'assets/des/soleil.webp' },
  { titre: 'Dé — Abri', src: 'assets/des/grange.webp' },
  { titre: 'Dé — Sommeil', src: 'assets/des/lune.webp' },
  { titre: 'Dé — Tornade', src: 'assets/des/tornade.webp' },
  { titre: 'Jeton Vache', src: 'assets/jetons/vache.png' },
  { titre: 'Jeton Poule', src: 'assets/jetons/poule.png' },
  { titre: 'Jeton Cow-boy', src: 'assets/jetons/cowboy.png' },
  { titre: 'Carte Rotation — horaire', src: 'assets/sens/horaire.webp', carte: true },
  { titre: 'Carte Rotation — antihoraire', src: 'assets/sens/antihoraire.webp', carte: true },
  { titre: 'Tornade du Sommeil', src: 'assets/cartes/tornade-du-sommeil.webp', carte: true },
];

const adresse = (src) => `${src}?v=${VERSION}`;

/** Le portrait d'un personnage, ou sa place réservée tant qu'il n'en a pas. */
function portrait(p, camp) {
  const src = PORTRAITS[p.id];
  return src
    ? h('img.lore-portrait', { src: adresse(src), alt: p.nom, loading: 'lazy' })
    : h('div.lore-portrait.lore-portrait--vide', { style: { '--couleur-camp': camp.couleur }, title: 'Illustration à venir' },
      p.nom.replace(/^(Le |La )/, '').charAt(0));
}

function personnage(p, camp) {
  return h('article.lore-perso',
    portrait(p, camp),
    h('div',
      h('h3', p.nom),
      h('div.lore-titre', p.titre),
      h('p', p.texte),
      h('p.lore-motivation', h('strong', 'Ce qu’il veut : '), p.motivation)));
}

export function vueLore() {
  return h('div.page.page-lore',
    h('div.rangee', { style: { margin: '6px 0 14px' } }, h('h1', 'Lore et images')),

    h('div.carte.lore-intro',
      h('div.titre-section', 'L’histoire'),
      h('p', 'Le docteur ', h('strong', 'Viktor Nado'), ' était un savant reconnu, spécialiste de la météo. Il avait '
        + 'tout lu, tout mesuré, tout calculé. Et il se trompait tout le temps : il annonçait du soleil, il pleuvait ; '
        + 'il annonçait une nuit calme, l’orage arrachait les volets.'),
      h('p', 'Puisque son savoir ne servait à rien, il a essayé autre chose : ', h('strong', 'jouer la météo aux dés'),
        '. Un dé avec du soleil, de la nuit, des éclaircies et des tornades ; il le lançait chaque matin, et il annonçait '
        + 'ce qui sortait. Ce n’était pas beaucoup mieux.'),
      h('p', 'Alors il a lancé deux dés, pour être plus précis. Puis dix. Puis cent. Plus il y avait de dés, se disait-il, '
        + 'plus la prévision serait fine. Pour les lancer tous à la fois, il a construit une machine : le ',
        h('strong', 'Générateur de dés'), '.'),
      h('p', 'Il en a mis tellement dedans qu’un matin, la machine s’est emballée. Des milliers de dés se sont mis à '
        + 'tourner ensemble, de plus en plus vite, de plus en plus haut, jusqu’à former une tornade. Le Générateur de dés '
        + 'était devenu un ', h('strong', 'Générateur de tornades de dés'), ', et il emportait tout.'),
      h('p', 'Il a avalé les îles des ', h('strong', { style: { color: CAMPS[0].couleur } }, 'Budies'), ', les ',
        h('strong', { style: { color: CAMPS[1].couleur } }, 'Nadoes'), ' qui travaillaient sur la machine, et le Docteur '
        + 'lui-même. Maintenant, tout le monde tourne dedans, et ', h('strong', 'tout le monde veut en sortir'), '.'),
    ),

    ...CAMPS.map((camp) => h('section.carte.lore-camp', { style: { '--couleur-camp': camp.couleur, '--clair-camp': camp.clair } },
      h('div.lore-camp-tete',
        h('h2', camp.nom),
        h('span.lore-accroche', camp.accroche)),
      ...camp.texte.map((t) => h('p', t)),
      h('p.lore-motivation.lore-motivation--camp', h('strong', camp.membres.length ? 'Ce qu’ils veulent : ' : 'Ce qu’il veut : '), camp.motivation),
      camp.membres.length ? h('div.lore-persos', ...camp.membres.map((p) => personnage(p, camp))) : null,
    )),

    plancheInspiration(),

    h('div.carte.lore-ponti',
      h('div.titre-section', 'Inspiration : Claude Ponti'),
      h('p', 'La référence de TornaDice : les engins volants bricolés, les petits bonshommes par milliers, les poussins, '
        + 'les monstres improbables et les mots inventés. Ses images sont protégées par le droit d’auteur : '
        + 'plutôt que de les recopier ici, cette page renvoie vers les endroits où les regarder.'),
      h('div.lore-refs', ...PONTI.map((g) => h('div.lore-ref',
        h('h3', g.theme),
        h('p.mini.muted', g.pourquoi),
        h('ul', ...g.liens.map(([titre, url, note]) => h('li',
          h('a', { href: url, target: '_blank', rel: 'noopener' }, titre),
          note ? h('span.mini.muted', ` — ${note}`) : null))))))),

    h('div.carte',
      h('div.titre-section', 'Images du jeu'),
      h('div.lore-galerie', ...IMAGES_JEU.map((img) => h('a.lore-image', {
        href: adresse(img.src), target: '_blank', rel: 'noopener', title: `${img.titre} — ouvrir en grand`,
        class: img.large ? 'lore-image--large' : img.carte ? 'lore-image--carte' : '',
      },
        h('img', { src: adresse(img.src), alt: img.titre, loading: 'lazy' }),
        h('span', img.titre)))),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'Les portraits des Budies, des Nadoes et du Docteur prendront leur place ci-dessus dès qu’ils existeront.'),
    ),
  );
}
