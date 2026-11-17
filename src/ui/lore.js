// Lore et images : l'histoire de TornaDice, ses personnages, et les visuels du jeu.
// Pour donner un portrait à un personnage, posez son image dans assets/lore/
// et inscrivez-la dans PORTRAITS, sous l'identifiant du personnage.

import { h } from './dom.js?v=2.08';
import { VERSION } from '../version.js?v=2.08';

const PORTRAITS = {};

const CAMPS = [
  {
    id: 'budies',
    nom: 'Les Budies',
    couleur: '#f08a1c',
    clair: '#fff1e2',
    accroche: 'Les rescapés',
    texte: [
      'Ils viennent de l’archipel de Budi, une poignée d’îles à bananes où il ne se passait jamais rien. '
      + 'La première tornade du Doc a emporté la récolte, les hamacs et la moitié du paysage. Les Budies ont '
      + 'décollé avec ce qu’ils avaient sous la main, et ils comptent bien atterrir ailleurs que dans le générateur.',
    ],
    motivation: 'S’arracher au maelstrom, ramener tout le monde à l’Abri — et, si possible, récupérer les bananes en route.',
    membres: [
      {
        id: 'big-budi', nom: 'Big Budi', titre: 'Orang-outan, pilote du Bananavion',
        texte: 'Le meilleur pilote de l’archipel — et le seul. Son Bananavion carbure à la purée de banane : '
          + 'chaque tornade qui passe lui arrache un régime de carburant, et il pilote au millilitre près, comme un chef.',
        motivation: 'Il ne fuit pas pour lui. Il a promis de ramener tout le monde, et un Budi tient ses promesses — '
          + 'surtout quand il tient le manche.',
      },
      {
        id: 'octavius', nom: 'Octavius', titre: 'Une pieuvre dans une pieuvre (dans une pieuvre, dans…)',
        texte: 'Pour survivre à la tempête, ce poulpe de génie s’est construit une armure de métal à sa propre image, '
          + 'puis une autre par-dessus, au cas où, puis une autre. L’ensemble fait des bulles. Personne ne sait pourquoi, '
          + 'pas même lui.',
        motivation: 'Comprendre le Générateur pour l’éteindre. Il a déjà repéré le bouton d’arrêt ; il ne lui manque '
          + 'qu’un bras pour l’atteindre. Il en a huit, mais ils sont tous à l’intérieur.',
      },
      {
        id: 'helipaon', nom: 'Hélipaon', titre: 'Paon-hélicoptère',
        texte: 'Il fait tourner ses plumes à toute vitesse et s’envole, le regard parfaitement vide. '
          + 'Ne le sous-estimez pas : un paon qui fait la roue à trois mille tours par minute découpe une tornade en rondelles.',
        motivation: 'Il n’a pas vraiment compris qu’il y avait une tempête. Il croit qu’on l’applaudit, '
          + 'et il compte bien saluer jusqu’au dernier rang.',
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
      'De petites créatures humanoïdes, toutes noires, toutes pareilles, et toujours beaucoup trop nombreuses. '
      + 'Les Nadoes naissent de la suie du Générateur : chaque tornade en recrache une poignée. Ils volent en '
      + 'myriades, à bord d’engins qui ne sont pas du tout conçus pour tenir en l’air.',
      'Le Doc leur a promis une place dans l’Abri le jour où le monde entier ne sera plus que tornade. '
      + 'Personne ne lui a demandé combien de places il y a dans l’Abri.',
    ],
    motivation: 'Semer la destruction pour le Doc, et décrocher leur place à l’Abri avant la retombée — '
      + 'car une tornade finit toujours par retomber, et personne n’a envie d’être dessous à ce moment-là.',
    membres: [
      {
        id: 'baignoire', nom: 'La Baignoire', titre: 'Propulsée à la bonde',
        texte: 'Elle file comme un hors-bord, poussée par le jet de sa bonde. Quand elle se retourne, elle se vide ; '
          + 'un entonnoir monté à l’arrière récupère l’eau de pluie pour repartir.',
        motivation: 'C’était la baignoire du Doc. Les Nadoes ignorent à quoi elle servait avant ; '
          + 'ils soupçonnent un rapport avec le savon, qu’ils utilisent comme projectile.',
      },
      {
        id: 'siegoteuil', nom: 'Le Siégoteuil Volant', titre: 'Assemblage baroque',
        texte: 'Des fauteuils, des chaises, des hélices, des ailes, des voiles et des volants — au pluriel : '
          + 'aucun Nado n’a voulu laisser le sien. Ils s’y entassent et tentent, tant bien que mal, de voler.',
        motivation: 'Chacun pilote dans une direction différente, et c’est précisément ce qui le maintient en l’air. '
          + 'Le premier qui se met d’accord avec un autre fait tout tomber.',
      },
      {
        id: 'rien', nom: 'Rien', titre: 'Littéralement rien',
        texte: 'Une grappe de Nadoes accrochés les uns aux autres, persuadés que, nombreux comme ils sont, ils volent. '
          + 'Tant que personne ne leur dit le contraire, ça marche.',
        motivation: 'Prouver qu’on n’a besoin de rien pour voler. Au premier coup de vent, par contre…',
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
      'À califourchon sur son propre Générateur, il file dans le ciel, porté par les tornades qui lui sortent des fe… '
      + 'du réacteur arrière. Du Générateur. On parle du Générateur.',
    ],
    motivation: 'Avoir raison. Toujours. Pour cela, le Générateur ne doit jamais s’arrêter — et le bouton d’arrêt '
      + 'est de l’autre côté de la machine, dont il n’a jamais réussi à faire le tour. Il joue seul contre tous : '
      + 'les Budies le contredisent, et les Nadoes lui coûtent une fortune en suie.',
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
      h('p.lore-motivation', h('strong', 'Pourquoi il vole : '), p.motivation)));
}

export function vueLore() {
  return h('div.page.page-lore',
    h('div.rangee', { style: { margin: '6px 0 14px' } }, h('h1', 'Lore et images')),

    h('div.carte.lore-intro',
      h('div.titre-section', 'L’histoire'),
      h('p', 'L’infâme docteur ', h('strong', 'Viktor Nado'), ' a mis tout son génie maléfique — et passablement '
        + 'dérangé — dans une invention sans pareille : le ', h('strong', 'Générateur à Tornades'),
        ', qui lui permet de répandre des tornades sur le monde entier.'),
      h('p', 'Pourquoi ? Pendant vingt ans, Viktor a présenté la météo à la télévision régionale. Vingt ans de '
        + '« grand soleil » sous des trombes d’eau, vingt ans de « nuit calme » emportée par l’orage, vingt ans de '
        + 'courrier des téléspectateurs. Le jour où on l’a remplacé par un pigeon voyageur qui se trompait moins '
        + 'souvent, il a juré que plus jamais le ciel ne le contredirait : puisque le temps refuse d’obéir à ses '
        + 'prévisions, ce sont ses prévisions qui feront le temps. Désormais, chaque matin, il annonce « Tornade ». '
        + 'Et il a toujours raison.'),
      h('p', 'Pris dans la tempête, les malheureux ', h('strong', { style: { color: CAMPS[0].couleur } }, 'Budies'),
        ' n’ont qu’une idée : s’arracher au maelstrom et rejoindre l’Abri, le seul endroit du monde où le vent ne '
        + 'souffle jamais. Les ', h('strong', { style: { color: CAMPS[1].couleur } }, 'Nadoes'),
        ', eux, sont en quête de destruction. Les deux équipes se disputent la domination des cieux — et leur survie, '
        + 'car au fond, tous veulent la même chose : être encore là quand la tempête retombera.'),
    ),

    ...CAMPS.map((camp) => h('section.carte.lore-camp', { style: { '--couleur-camp': camp.couleur, '--clair-camp': camp.clair } },
      h('div.lore-camp-tete',
        h('h2', camp.nom),
        h('span.lore-accroche', camp.accroche)),
      ...camp.texte.map((t) => h('p', t)),
      h('p.lore-motivation.lore-motivation--camp', h('strong', 'Ce qui les fait voler : '), camp.motivation),
      camp.membres.length ? h('div.lore-persos', ...camp.membres.map((p) => personnage(p, camp))) : null,
    )),

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
