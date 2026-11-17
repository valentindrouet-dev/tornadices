// Table de jeu en temps réel.
//
// Le moteur avance à l'horloge du navigateur. L'affichage est repeint à chaque
// image, mais chaque bloc ne se reconstruit que si son contenu a changé : sans
// cela les boutons seraient remplacés entre l'appui et le relâchement du clic.

import { h, remplacer, duree, vider } from './dom.js?v=2.11';
import {
  faceDe, suiteSymboles, emblemeEquipe, pastilleSymbole, JETONS_EMBLEME, faceCarteSens,
} from './icons.js?v=2.11';
import { Moteur } from '../core/engine.js?v=2.11';
import { EQUIPES, PRIORITE_COMBOS, requisCarte, nomDansPhrase } from '../core/config.js?v=2.11';
import { ajouterHistorique, store } from './store.js?v=2.11';
import { enregistrerPartie } from './resultats.js?v=2.11';
import { aller } from './app.js?v=2.11';
import { jouerSon, eveillerSons, sonsActifs, reglerSons } from './sons.js?v=2.11';
import { carteTornadeDessinee } from './carte-tornade.js?v=2.11';

let moteur = null;
let vitesse = 1;
let enPause = false;
let ancrage = 0;
let partieArchivee = false;
// La page de résultats ne s'ouvre qu'une fois, même si la table se redessine.
let finAnnoncee = false;

export function partieEnCours() { return moteur && !moteur.termine ? moteur : null; }

/** Abandonne la partie en cours : la table est libre, l'accueil redevient net. */
export function quitterPartie() {
  moteur = null;
  enPause = false;
}

export function lancerPartie(cfg, joueurs, graine) {
  moteur = new Moteur(cfg, joueurs, graine);
  vitesse = 1;
  enPause = false;
  partieArchivee = false;
  ancrage = performance.now();
  return moteur;
}

// Touche de lancer des joueurs humains, dans l'ordre des sièges.
const TOUCHES = [
  { lancer: 'Space', libLancer: 'Espace' },
  { lancer: 'KeyA', libLancer: 'A' },
  { lancer: 'KeyK', libLancer: 'K' },
];

/** Le côté d'un dé de siège, en pixels, pour un lot de `n` dés. */
function tailleDeSiege(n) {
  // Largeur intérieure d'un siège : 196 px, moins 2 × 10 px de marge et 2 × 1,5 px
  // de bordure — 173 px. On en garde une de côté : à 176, cinq dés de 32 px
  // passaient à la ligne.
  const utile = 172;
  const ecart = 4;     // l'espace entre deux dés
  const mini = 26;     // en dessous, la face ne se lit plus
  const nb = Math.max(1, Math.min(12, n || 4));
  const colonnes = Math.min(nb, Math.max(1, Math.floor((utile + ecart) / (mini + ecart))));
  return Math.min(36, Math.floor((utile - (colonnes - 1) * ecart) / colonnes));
}

// L'éclat d'écran reprend la couleur de l'événement : le vert de l'Abri, le
// rouge de l'Envol, la nuit quand on s'endort.
const COULEUR_ECLAT = { abri: '#6cb800', envol: '#e2000f', endormi: '#4b5bc7' };

/** Sous cette largeur, la table passe en disposition verticale. */
const surMobile = () => window.innerWidth <= 860;

/** Couleur d'alerte autour de la zone d'un joueur : celle de la combinaison formée. */
const COULEUR_ALERTE = { carte: 'or' };
function alerteDesCombos(dispo) {
  const c = dispo.find((d) => d.source === 'carte')
    || PRIORITE_COMBOS.map((id) => dispo.find((d) => d.id === id)).find(Boolean);
  return c ? (COULEUR_ALERTE[c.couleur] || c.couleur) : null;
}

/**
 * Le texte d'une carte Tornade, avec ses mots en avant.
 *
 * Le carton imprimé met « carte Tornade » et le nom des équipes en couleur :
 * c'est ce qu'on lit en premier quand la carte est posée au milieu de la table.
 * On reprend la même mise en avant, sans toucher au texte de la carte — il
 * reste une simple phrase dans la configuration.
 */
const MOTS_EN_AVANT = /(cartes? Tornade|Cow-?boy|Vaches|Poules|manche suivante)/gi;

/** Le Jeton Équipe imprimé. */
function dessinJeton(equipe) {
  const src = JETONS_EMBLEME[EQUIPES[equipe].embleme];
  return `<img class="jeton-img" src="${src}" alt="" draggable="false" width="74" height="74">`;
}

function texteCarte(txt) {
  const frag = document.createDocumentFragment();
  let reste = String(txt || '');
  let dernier = 0;
  for (const m of reste.matchAll(MOTS_EN_AVANT)) {
    if (m.index > dernier) frag.appendChild(document.createTextNode(reste.slice(dernier, m.index)));
    frag.appendChild(h('span.accent', m[0]));
    dernier = m.index + m[0].length;
  }
  if (dernier < reste.length) frag.appendChild(document.createTextNode(reste.slice(dernier)));
  return frag;
}

/** Ne reconstruit `hote` que si la signature a changé. */
function siChange(hote, signature, construire) {
  if (hote.dataset.sig === signature) return false;
  hote.dataset.sig = signature;
  remplacer(hote, construire());
  return true;
}

export function vueTable() {
  if (!moteur) {
    return h('div.page',
      h('div.carte', { style: { textAlign: 'center', padding: '60px 20px' } },
        h('h2', 'Aucune partie en cours'),
        h('p.muted', 'Composez une table depuis l’accueil pour commencer.'),
        h('button.btn.btn--primaire', { onclick: () => aller('/') }, 'Aller à l’accueil')),
    );
  }

  // La boucle et le clavier sont attachés à CETTE partie : si elle est remplacée
  // ou abandonnée, ils s'arrêtent d'eux-mêmes.
  const maPartie = moteur;
  const humains = moteur.joueurs.filter((j) => j.type === 'humain');
  const toucheDe = new Map();
  humains.forEach((j, i) => toucheDe.set(j.id, TOUCHES[i] || TOUCHES[TOUCHES.length - 1]));

  const racine = h('div.page.page--large');
  // La taille des dés d'un siège se calcule, elle ne se devine pas : la carte
  // fait 176 px utiles, et un lot peut en compter jusqu'à douze. On en met le
  // plus possible par ligne sans descendre sous 26 px — en dessous la face n'est
  // plus lisible — et la rangée passe à la ligne pour le reste.
  racine.style.setProperty('--de-siege', `${tailleDeSiege(moteur.cfg.desParLot)}px`);

  // ── Entête : badges variables à gauche, contrôles fixes à droite ──────────
  const zoneBadges = h('div.rangee.rangee--serree.badges-jeu');
  const zoneEntete = h('div.rangee.entete-jeu', { style: { marginBottom: '10px' } },
    zoneBadges,
    h('div.pousse'),
    h('div.segment', ...[0.5, 1, 2, 4].map((v) => {
      const b = h('button', { class: v === vitesse ? 'on' : '' }, `×${v}`);
      b.onclick = () => {
        vitesse = v;
        [...b.parentNode.children].forEach((x) => x.classList.toggle('on', x === b));
      };
      return b;
    })),
    (() => {
      // Couper le son doit se faire sans quitter la table : c'est le genre de
      // réglage qu'on change au milieu d'une manche, pas avant la partie.
      const b = h('button.btn.btn--petit', { title: 'Sons de la partie' },
        sonsActifs() ? '🔊' : '🔇');
      b.onclick = () => {
        reglerSons(!sonsActifs());
        b.textContent = sonsActifs() ? '🔊' : '🔇';
        if (sonsActifs()) { eveillerSons(); jouerSon('abri'); }
      };
      return b;
    })(),
    (() => {
      const b = h('button.btn.btn--petit', '⏸ Pause');
      b.onclick = () => { enPause = !enPause; b.textContent = enPause ? '▶ Reprendre' : '⏸ Pause'; };
      return b;
    })(),
    (() => {
      // Quitter abandonne vraiment la partie — mais pas sur un doigt qui glisse :
      // il faut confirmer, et le bouton se désarme seul au bout de quatre secondes.
      const b = h('button.btn.btn--petit.btn--danger', 'Quitter');
      let arme = false;
      const desarmer = () => { arme = false; b.textContent = 'Quitter'; b.classList.remove('btn--arme'); };
      b.onclick = () => {
        if (!arme && maPartie && !maPartie.termine) {
          arme = true;
          b.textContent = 'Abandonner ?';
          b.classList.add('btn--arme');
          setTimeout(desarmer, 4000);
          return;
        }
        quitterPartie();
        aller('/');
      };
      return b;
    })(),
  );

  // ── Table ─────────────────────────────────────────────────────────────────
  const elCarte = h('div.coin.coin--carte');
  const elPioche = h('div.coin.coin--pioche');
  // Les scores se lisent au-dessus du tapis, pas dessus : le centre de la table
  // est à la carte Tornade, et le cercle des joueurs a besoin de toute la largeur.
  const elScores = h('div.scores-table');
  // Le centre de la table, comme sur un vrai plateau : la carte Tornade en
  // cours, la pioche et la Carte Rotation. Les joueurs font cercle autour.
  const elCentre = h('div.centre-table', h('div.centre-carte', elCarte), elPioche);
  const zoneTable = h('div.table-zone', h('div.tapis'), elCentre);
  const elSieges = moteur.joueurs.map((j) => {
    // La couleur vient de l'équipe du joueur.
    const el = h('div.siege', {
      class: `equipe-${j.equipe}${j.type === 'humain' ? ' siege--humain' : ''}`,
      style: { '--couleur-eq': EQUIPES[j.equipe].hex },
    });
    zoneTable.appendChild(el);
    return el;
  });
  const n = moteur.joueurs.length;
  // Le joueur humain est assis en bas de la table, face à l'écran — comme on
  // s'assoit devant un vrai plateau. L'anneau tourne autour de lui sans changer
  // d'ordre : ses voisins restent ses voisins, le sens horaire reste horaire.
  // Sans humain à la table, c'est le premier siège qui prend cette place.
  const siegeBas = Math.max(0, moteur.joueurs.findIndex((j) => j.type === 'humain'));
  const CENTRE = { x: 50, y: 50 };
  const positions = elSieges.map(() => ({ x: 50, y: 50 }));
  const elTapis = zoneTable.querySelector('.tapis');

  // Les sièges font cercle sur toute la table : plus aucun panneau n'en borde
  // les côtés, la carte Tornade est au centre et les scores au-dessus. Le centre
  // se pose au milieu du cercle et rapetisse juste assez pour ne toucher aucun
  // siège — sur un écran étroit, à huit joueurs, la place vient à manquer.
  function placerSieges() {
    const zw = zoneTable.clientWidth;
    const zh = zoneTable.clientHeight;
    if (!zw || !zh || surMobile()) {
      elCentre.style.removeProperty('--echelle-centre');
      for (const el of elSieges) delete el.dataset.pile;
      return;
    }

    const marge = 12;
    const larg = elSieges[0]?.offsetWidth || 196;
    const haut = elSieges[0]?.offsetHeight || 130;
    // Au-dessus de chaque siège, la place des jetons qu'il a récupérés : le cercle
    // descend d'autant, pour que la pile du siège du haut reste sur la table.
    const pile = 60;
    const cx = zw / 2;
    const cy = zh / 2 + pile / 2;
    const rx = Math.max(60, zw / 2 - larg / 2 - marge);
    const ry = Math.max(60, zh / 2 - haut / 2 - 6 - pile / 2);

    CENTRE.x = 50;
    CENTRE.y = (cy / zh) * 100;

    const sieges = elSieges.map((el, i) => {
      const a = (Math.PI / 2) + ((i - siegeBas) * 2 * Math.PI) / n;
      const x = cx + rx * Math.cos(a);
      const y = cy + ry * Math.sin(a);
      positions[i].x = (x / zw) * 100;
      positions[i].y = (y / zh) * 100;
      el.style.left = `${positions[i].x}%`;
      el.style.top = `${positions[i].y}%`;
      const l = el.offsetWidth || larg;
      const t = el.offsetHeight || haut;
      return { x, x0: x - l / 2, x1: x + l / 2, y0: y - t / 2, y1: y + t / 2 };
    });

    // La pile se pose au-dessus du siège, sans le toucher ; faute de place, sur
    // le côté. Le siège du bas la met de côté d'emblée : au-dessus de lui, c'est
    // la place de la carte Tornade.
    const cadres = sieges.map((s) => ({ ...s }));
    const libre = (r, soi) => r.x0 >= 0 && r.x1 <= zw && r.y0 >= 0 && r.y1 <= zh
      && sieges.every((s) => s === soi || r.x1 <= s.x0 || s.x1 <= r.x0 || r.y1 <= s.y0 || s.y1 <= r.y0);
    sieges.forEach((s, i) => {
      const mi = (s.y0 + s.y1) / 2;
      const zones = {
        haut: { x0: s.x - 75, x1: s.x + 75, y0: s.y0 - pile, y1: s.y0 },
        droite: { x0: s.x1, x1: s.x1 + 60, y0: mi - 58, y1: mi + 58 },
        gauche: { x0: s.x0 - 60, x1: s.x0, y0: mi - 58, y1: mi + 58 },
      };
      const dehors = s.x >= cx ? 'droite' : 'gauche';
      const dedans = dehors === 'droite' ? 'gauche' : 'droite';
      const ordre = i === siegeBas ? ['droite', 'gauche', 'haut'] : ['haut', dehors, dedans];
      const choix = ordre.find((o) => libre(zones[o], s)) || 'haut';
      elSieges[i].dataset.pile = choix;
      cadres.push(zones[choix]);
    });

    if (elTapis) {
      elTapis.style.left = `${((cx - rx) / zw) * 100}%`;
      elTapis.style.top = `${((cy - ry) / zh) * 100}%`;
      elTapis.style.width = `${((2 * rx) / zw) * 100}%`;
      elTapis.style.height = `${((2 * ry) / zh) * 100}%`;
    }

    // La taille naturelle du centre : `offsetWidth` ignore l'échelle appliquée.
    const w = elCentre.offsetWidth;
    const hc = elCentre.offsetHeight;
    const jeu = 8;
    const degage = (k, dy) => cadres.every((c) => {
      const x0 = cx - (w * k) / 2 - jeu;
      const x1 = cx + (w * k) / 2 + jeu;
      const y0 = cy + dy - (hc * k) / 2 - jeu;
      const y1 = cy + dy + (hc * k) / 2 + jeu;
      return x1 <= c.x0 || c.x1 <= x0 || y1 <= c.y0 || c.y1 <= y0;
    });
    // La plus grande échelle qui passe, à une hauteur donnée.
    const plusGrande = (dy) => {
      if (degage(1, dy)) return 1;
      let bas = 0.5;
      let haut2 = 1;
      for (let t = 0; t < 12; t++) {
        const milieu = (bas + haut2) / 2;
        if (degage(milieu, dy)) bas = milieu; else haut2 = milieu;
      }
      return bas;
    };
    // Le centre n'est pas tenu au milieu exact : la pile de jetons du siège du bas
    // mord sur la place, et quelques pixels plus haut la carte peut rester plus
    // grande. On essaie de petits décalages et l'on garde le meilleur.
    let echelle = plusGrande(0);
    let decalage = 0;
    for (let dy = -48; dy <= 48 && echelle < 1; dy += 4) {
      const k = plusGrande(dy);
      if (k > echelle + 0.004) { echelle = k; decalage = dy; }
    }
    CENTRE.y = ((cy + decalage) / zh) * 100;
    elCentre.style.top = `${CENTRE.y}%`;
    elCentre.style.setProperty('--echelle-centre', echelle.toFixed(3));
  }

  // En colonne, les sièges suivraient l'ordre de lecture — 1-2 puis 3-4 — et deux
  // voisins de table se retrouveraient dos à dos. On les dispose donc en anneau :
  // on descend la colonne de droite, on remonte celle de gauche, si bien que
  // chaque joueur touche ses deux voisins et que le dernier rejoint le premier.
  // Sur grand écran les sièges sont hors flux, l'ordre n'y change rien.
  function ordonnerEnAnneau() {
    const impair = n % 2 === 1;
    const rangees = impair ? (n + 1) / 2 : n / 2;
    const cellules = new Array(n);
    cellules[0] = [0, 0];
    const aDroite = impair ? rangees - 1 : rangees;
    for (let k = 1; k <= aDroite && k < n; k++) cellules[k] = [k - 1, 1];
    let k = aDroite + 1;
    // Nombre impair : le siège du bas prend toute la largeur et ferme l'anneau.
    if (impair && k < n) { cellules[k] = [rangees - 1, 'large']; k++; }
    for (let r = impair ? rangees - 2 : rangees - 1; k < n; r--, k++) cellules[k] = [r, 0];

    // Le joueur humain prend la case du bas de l'anneau : la grande case à
    // nombre impair, celle de gauche de la dernière rangée sinon.
    const caseBas = Math.min(n - 1, aDroite + 1);
    elSieges.forEach((el, i) => {
      const c = cellules[(i - siegeBas + caseBas + n) % n];
      if (!c) return;
      const large = c[1] === 'large';
      el.classList.toggle('siege--large', large);
      el.style.order = large ? c[0] * 2 : c[0] * 2 + c[1];
    });
  }

  ordonnerEnAnneau();
  placerSieges();
  const suiviTaille = new ResizeObserver(() => placerSieges());
  suiviTaille.observe(zoneTable);
  // Un siège grandit quand un lot lui arrive : la place de sa pile se recalcule.
  for (const el of elSieges) suiviTaille.observe(el);
  window.addEventListener('resize', placerSieges);

  // Le lot traverse la table : sans cela on ne voit pas les dés changer de main.
  // Les points sont pris sur les sièges eux-mêmes, en pixels : la disposition en
  // colonne du téléphone n'a pas de coordonnées en pourcentage, et le vol doit
  // s'y voir comme sur grand écran.
  const enVol = [];

  function pointDe(cible) {
    const z = zoneTable.getBoundingClientRect();
    const el = cible === 'centre'
      ? (!surMobile() && elTapis ? elTapis : zoneTable)
      : elSieges[cible];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - z.left, y: r.top + r.height / 2 - z.top };
  }

  function animerPassage(de, vers, motif, lot, dureeJeu) {
    volLot(de, vers, motif, lot ? lot.des : [], dureeJeu);
  }

  function volLot(de, vers, motif, des, dureeJeu) {
    const a = pointDe(de);
    const b = pointDe(vers);
    if (!a || !b) return;
    // Le vol dure exactement le temps de jeu du passage, à la vitesse d'affichage.
    const duree = Math.max(80, (dureeJeu ?? 1000) / vitesse);
    const el = h('div', { class: `lot-vol lot-vol--${motif}` },
      ...des.slice(0, 4).map((d) => faceDe(d.sym, { taille: 'petit' })));
    el.style.transitionDuration = `${duree}ms, ${duree}ms, 160ms`;
    el.style.left = `${a.x}px`;
    el.style.top = `${a.y}px`;
    zoneTable.appendChild(el);
    enVol.push(el);
    while (enVol.length > 6) enVol.shift().remove();
    requestAnimationFrame(() => {
      el.style.left = `${b.x}px`;
      el.style.top = `${b.y}px`;
    });
    setTimeout(() => { el.style.opacity = '0'; }, duree);
    setTimeout(() => {
      el.remove();
      const k = enVol.indexOf(el);
      if (k >= 0) enVol.splice(k, 1);
    }, duree + 180);
  }

  // Les Jetons Équipe sont posés sur la carte Tornade ; chaque Abri en fait
  // sortir un, qui vole jusqu'au siège du joueur et s'y pose pour le reste de la
  // manche. La case se vide au départ, la pile ne grossit qu'à l'arrivée.
  const jetonsSauves = new Map();   // pid → jetons récupérés, posés ou en route
  const volsVersSiege = new Map();  // pid → jetons encore en l'air
  const pilesVues = new Map();      // pid → pile montrée au dernier affichage
  const cartesVues = new Map();     // équipe → cartes gagnées au dernier affichage
  const jetonsSurCarte = (e) => Math.max(0, e.objectif - e.abris);
  const jetonsAuSiege = (pid) => Math.max(0, (jetonsSauves.get(pid) || 0) - (volsVersSiege.get(pid) || 0));

  function volJeton(pid, equipeId) {
    const siege = elSieges[pid];
    if (!siege) return;
    jetonsSauves.set(pid, (jetonsSauves.get(pid) || 0) + 1);
    // Le dernier jeton de la rangée : c'est lui qui part.
    const cases = elCarte.querySelectorAll(`.tornade-jeton--${equipeId}.on`);
    const zone = zoneTable.getBoundingClientRect();
    const a = (cases[cases.length - 1] || elCarte).getBoundingClientRect();
    const b = (siege.querySelector('.siege-jetons') || siege).getBoundingClientRect();
    const x0 = a.left + a.width / 2;
    const y0 = a.top + a.height / 2;
    const el = h('div.jeton-vol', { html: dessinJeton(equipeId) });
    Object.assign(el.style, {
      position: 'absolute', width: '32px', height: '32px',
      left: `${x0 - zone.left}px`, top: `${y0 - zone.top}px`,
    });
    el.style.setProperty('--dx', `${b.left + b.width / 2 - x0}px`);
    el.style.setProperty('--dy', `${b.top + b.height / 2 - y0}px`);
    el.style.setProperty('--duree', `${Math.max(220, 850 / vitesse)}ms`);
    volsVersSiege.set(pid, (volsVersSiege.get(pid) || 0) + 1);
    zoneTable.appendChild(el);
    // La fin réelle de l'animation, pas une minuterie : en pause le vol se fige.
    el.addEventListener('animationend', () => {
      el.remove();
      volsVersSiege.set(pid, Math.max(0, (volsVersSiege.get(pid) || 0) - 1));
    }, { once: true });
  }

  // Nouvelle manche : tous les jetons retournent sur la carte Tornade.
  function viderJetonsEnVol() {
    jetonsSauves.clear();
    volsVersSiege.clear();
    for (const el of zoneTable.querySelectorAll('.jeton-vol')) el.remove();
  }

  const zonePanneaux = h('div.zone-panneaux', { style: { display: 'grid', gap: '10px', marginTop: '10px' } });
  const zoneJournal = h('div.journal');

  // La Carte Rôle du joueur, comme sur la table : une face endormie, une face
  // réveillée, et la carte se retourne quand il se réveille ou s'endort.
  const joueurLu = moteur.joueurs.find((j) => j.type === 'humain') || moteur.joueurs[0];
  const eqLue = EQUIPES[joueurLu.equipe];
  const faceRole = (etat) => h(`div.carte-equipe-face.carte-equipe-face--${etat === 'endormi' ? 'endormie' : 'eveillee'}`,
    h('div.carte-role', { class: `carte-role--${etat}`, style: { '--couleur-eq': eqLue.hex } },
      h('div.carte-role-tete', emblemeEquipe(eqLue.embleme, 44),
        h('div', h('div.carte-role-nom', eqLue.animal),
          h('div.carte-role-etat', etat === 'endormi' ? 'Endormi' : 'Réveillé'))),
      ...moteur.cfg.combos.filter((c) => c.etat === 'tous' || c.etat === etat).map((c) => h('div.carte-role-combo',
        h('div.carte-role-des', suiteSymboles(c.requis, 24)),
        h('div', h('strong', c.nom), h('div.mini', c.effet))))));
  const carteEquipe = h('div.carte-equipe-retournable', { class: joueurLu.eveille ? 'carte-equipe--eveillee' : '' },
    h('div.carte-equipe-interieur', faceRole('endormi'), faceRole('eveille')));
  let carteRetournee = joueurLu.eveille;
  function peindreCarteEquipe() {
    if (carteRetournee === joueurLu.eveille) return;
    carteRetournee = joueurLu.eveille;
    carteEquipe.classList.toggle('carte-equipe--eveillee', carteRetournee);
  }

  // « Tout relancer » peut épargner les dés qu'on cherche : les soleils tant
  // qu'on dort, les Abris une fois réveillé. On martèle alors la touche sans
  // défaire ce qui est acquis. Le choix est gardé d'une partie à l'autre.
  const aide = { soleils: false, abris: false, ...store.get('aideLancer', {}) };
  const caseAide = (cle, texte) => h('label.option-lancer',
    h('input', {
      type: 'checkbox', checked: aide[cle],
      onchange: (e) => {
        aide[cle] = e.target.checked;
        store.set('aideLancer', aide);
        // La case ne garde pas le focus : Espace doit lancer les dés, pas la décocher.
        e.target.blur();
      },
    }),
    h('span', h('span.touche', 'Barre ESPACE'), ` ${texte}`));

  /** Relance tous les dés libres — sauf ceux que les cases demandent de garder. */
  function toutRelancer(j) {
    const lot = j.lots[0];
    if (!lot) return false;
    const garde = j.eveille ? (aide.abris && 'grange') : (aide.soleils && 'soleil');
    if (!garde || lot.des.some((d) => d.sym === null)) return moteur.lancerHumain(j.id, null);
    const autres = lot.des.map((d, i) => i).filter((i) => !lot.des[i].verrou && !lot.des[i].roule && lot.des[i].sym !== garde);
    if (autres.length) return moteur.lancerHumain(j.id, autres);
    // Il ne reste que des dés à garder : on attend ceux qui roulent. Si plus
    // rien ne roule, le lot serait bloqué — on relance tout.
    return lot.des.some((d) => d.roule) ? false : moteur.lancerHumain(j.id, null);
  }

  const zoneCote = h('div.colonne-cote',
    h('div.carte.carte--equipe', carteEquipe),
    h('div.carte', h('div.titre-section', 'Journal'), zoneJournal,
      humains.length ? h('div.options-lancer',
        caseAide('soleils', 'Ne pas relancer les Soleils quand je suis endormi'),
        caseAide('abris', 'Ne pas relancer les Abris quand je suis réveillé')) : null),
  );

  racine.appendChild(zoneEntete);
  racine.appendChild(h('div.grille.grille--jeu',
    h('div', elScores, zoneTable, zonePanneaux), zoneCote));

  let couche = null;
  let dernierJournal = -1;
  moteur.onMouvement = (de, vers, motif, lot, duree) => animerPassage(de, vers, motif, lot, duree);
  moteur.onJeton = (pid, equipe) => volJeton(pid, equipe);

  // Les moments qui comptent se voient sans rien lire : la couleur envahit
  // l'écran une seconde et quart. Seul le rendormissement secoue la table — on
  // vous a coupé les jambes, l'écran le dit.
  let eclatCourant = null;
  function eclat(couleur, { secousse = false } = {}) {
    if (eclatCourant) eclatCourant.remove();
    const el = h('div.flash');
    el.style.setProperty('--c-flash', couleur);
    document.body.appendChild(el);
    eclatCourant = el;
    setTimeout(() => {
      el.remove();
      if (eclatCourant === el) eclatCourant = null;
    }, 1280);
    // La secousse porte sur la table seule : le panneau du joueur y est fixé au
    // bas de l'écran, et un ancêtre transformé le décrocherait.
    if (secousse) {
      zoneTable.classList.add('table-zone--secousse');
      setTimeout(() => zoneTable.classList.remove('table-zone--secousse'), 440);
    }
  }

  moteur.onFlash = (type, pid) => {
    const j = moteur.joueurs[pid];
    if (!j) return;
    // L'Abri et l'Envol s'entendent de toute la table.
    if (type === 'abri') { eclat(COULEUR_ECLAT.abri); jouerSon('abri'); return; }
    if (type === 'envol') { jouerSon('envol'); if (j.type === 'humain') eclat(COULEUR_ECLAT.envol); return; }
    // Réveil et endormissement ne concernent que celui qui les vit.
    if (j.type !== 'humain') return;
    if (type === 'reveil') { eclat(EQUIPES[j.equipe].hex); jouerSon('reveil'); }
    else if (type === 'endormi') {
      eclat(COULEUR_ECLAT.endormi, { secousse: true });
      jouerSon('endormi');
    }
  };

  // Les moments qui comptent s'affichent au-dessus de la zone du joueur concerné :
  // au centre, on ne savait pas de qui l'on parlait, et deux joueurs ne pouvaient
  // pas réussir en même temps. Une annonce par joueur, la dernière chasse l'autre.
  const annonces = new Map();
  let enTransition = false;

  function effacerAnnonce() {
    for (const el of annonces.values()) el.remove();
    annonces.clear();
  }

  moteur.onAnnonce = (texte, couleur, pid = null, options = null) => {
    // La victoire de manche passe outre la transition : c'est justement elle
    // qui l'ouvre, et c'est le message qu'on attend.
    if (enTransition && !(options && options.manche)) return;
    const cle = pid == null ? '__centre' : pid;
    const ancienne = annonces.get(cle);
    if (ancienne) ancienne.remove();

    const surSiege = pid != null && elSieges[pid];
    const el = h('div', {
      class: `annonce annonce--${couleur}${surSiege ? ' annonce--siege' : ''}`
        + (options && options.manche ? ' annonce--manche' : ''),
    }, texte);
    if (surSiege) {
      const z = zoneTable.getBoundingClientRect();
      const r = elSieges[pid].getBoundingClientRect();
      el.style.left = `${r.left + r.width / 2 - z.left}px`;
      el.style.top = `${r.top - z.top - 8}px`;
    } else {
      el.style.left = `${CENTRE.x}%`;
      el.style.top = `${CENTRE.y}%`;
    }
    annonces.set(cle, el);
    zoneTable.appendChild(el);
    // Au-dessus d'un siège du bord, la bulle dépasserait de l'écran : on la
    // ramène dedans, à 6 px du bord, sans la décoller de son siège plus que
    // nécessaire.
    // On mesure la boîte elle-même, pas son dessin : l'animation d'entrée la
    // tient encore rétrécie au moment où l'on regarde.
    if (surSiege) {
      const zoneG = zoneTable.getBoundingClientRect().left;
      const x = parseFloat(el.style.left);
      const gauche = zoneG + x - el.offsetWidth / 2;
      const droite = gauche + el.offsetWidth;
      const bord = document.documentElement.clientWidth - 6;
      const decale = droite > bord ? bord - droite : (gauche < 6 ? 6 - gauche : 0);
      if (decale) el.style.left = `${x + decale}px`;
    }

    // Une victoire de manche reste plus longtemps : c'est une phrase à lire,
    // pas un éclat à apercevoir.
    const vie = options && options.manche
      ? Math.max(1400, 3200 / vitesse)
      : Math.max(500, 1700 / vitesse);
    setTimeout(() => el.classList.add('annonce--sortie'), vie);
    setTimeout(() => {
      el.remove();
      if (annonces.get(cle) === el) annonces.delete(cle);
    }, vie + 320);
  };

  // Une combinaison formée est jouée dans la foulée du lancer : sans rémanence,
  // son alerte clignoterait le temps d'une image. On la retient.
  const PRIORITE_ALERTE = ['rouge', 'or', 'vert', 'nuit'];
  const alertesRetenues = new Map();
  moteur.onCombinaison = (pid, comboId, couleurCombo) => {
    const couleur = COULEUR_ALERTE[couleurCombo] || couleurCombo;
    const duree = Math.max(320, 950 / vitesse);
    const cur = alertesRetenues.get(pid);
    const remplace = !cur || moteur.now >= cur.fin
      || PRIORITE_ALERTE.indexOf(couleur) < PRIORITE_ALERTE.indexOf(cur.couleur);
    if (remplace) alertesRetenues.set(pid, { couleur, fin: moteur.now + duree });
  };
  const NOM_TOUR = (s) => (s > 0 ? 'horaire' : 'antihoraire');
  // La carte de sens imprimée, sur la face qui dit ce sens-là.
  const imageSens = (s, classe = 'img.carte-sens-img') => {
    const f = faceCarteSens(s);
    return h(classe, {
      src: f.src, width: f.largeur, height: f.hauteur, draggable: 'false',
      alt: `Carte Rotation : sens ${NOM_TOUR(s)}`,
    });
  };

  /**
   * Ce que la table dit du sens, une fois la carte tranchée. Quand ceux qui
   * reçoivent les dés sont tous menés par l'ordinateur, la décision est déjà
   * prise à l'ouverture de la transition : le panneau n'a plus qu'à la dire.
   */
  function blocChoixSens(choix) {
    if (!choix || !choix.decide) return null;
    return h('div.transition-sens',
      imageSens(moteur.sens, 'img.carte-sens-mini'),
      h('span', choix.inverse
        ? `Carte Rotation retournée — manche suivante en sens ${NOM_TOUR(moteur.sens)}`
        : `Carte Rotation laissée — manche suivante en sens ${NOM_TOUR(moteur.sens)}`),
    );
  }

  // ── La carte de sens, quand c'est à un humain de trancher ──────────────────
  // Même traitement que la Tornade révélée : la partie attend. Une décision de
  // fin de manche ne se prend pas en trois secondes pendant que les dés volent.
  // Sans réponse, la carte reste où elle est — ne rien faire est une réponse.
  let panneauSens = null;
  let minuterieSens = null;
  let attenteSens = false;

  function fermerSens(inverser) {
    if (minuterieSens) { clearTimeout(minuterieSens); minuterieSens = null; }
    if (panneauSens) { panneauSens.remove(); panneauSens = null; }
    attenteSens = false;
    if (moteur.choixSens && !moteur.choixSens.decide) moteur.choisirSens(!!inverser);
    ancrage = performance.now();
    // La carte suivante attendait que le sens soit tranché — sa révélation
    // montre le sens de la manche qui vient.
    if (carteDifferee && moteur.transition && actif) {
      const { carte, manche } = carteDifferee;
      carteDifferee = null;
      montrerCarte(carte, manche, { bloquante: false });
    }
    carteDifferee = null;
  }

  function montrerChoixSens(choix) {
    if (!choix || choix.decide || !choix.humain) return;
    attenteSens = true;
    // « Les Bleus », « le Vert » : un nom d'équipe a besoin
    // de son article dans une phrase, et le verbe suit — un joueur seul reçoit,
    // une équipe reçoivent.
    const noms = choix.equipes.map((e) => nomDansPhrase(e));
    const camps = noms.map((n) => n.le).join(' et ');
    const titre = `${camps.charAt(0).toUpperCase()}${camps.slice(1)} `
      + `${noms.length === 1 && noms[0].seul ? 'reçoit' : 'reçoivent'} les dés`;
    panneauSens = h('div.voile-carte',
      h('div.carte-annonce',
        h('div.mini.muted', 'Carte Rotation'),
        h('h2', { style: { margin: '6px 0 10px' } }, titre),
        imageSens(choix.sens, 'img.carte-sens-grande'),
        h('div.texte-carte-grand',
          'Gardez le sens de rotation, ou retournez la carte pour l’inverser : '
          + 'les lots passeront alors par l’autre voisin.'),
        h('div.rangee.rangee--serree', {
          style: { justifyContent: 'center', marginTop: '16px' },
        },
          h('button.btn.btn--sens', { onclick: () => fermerSens(false) },
            imageSens(choix.sens, 'img.carte-sens-mini'), `Garder : ${NOM_TOUR(choix.sens)}`),
          h('button.btn.btn--primaire.btn--sens', { onclick: () => fermerSens(true) },
            imageSens(-choix.sens, 'img.carte-sens-mini'), `Retourner : ${NOM_TOUR(-choix.sens)}`),
        ),
        h('div.mini.muted', { style: { marginTop: '16px' } },
          'Espace pour garder le sens — sans réponse, la carte reste en place.'),
      ),
    );
    racine.appendChild(panneauSens);
    minuterieSens = setTimeout(() => fermerSens(false), Math.max(2000, 9000 / vitesse));
  }

  // Fin de manche : les dés reviennent au centre, la carte suivante recouvre
  // la précédente, puis les lots repartent vers l'équipe qui vient de perdre.
  let panneauTransition = null;
  let minuterieRevelation = null;
  let carteDifferee = null;
  moteur.onFinManche = (info) => {
    const d = Math.max(300, info.duree / vitesse);
    const eq = info.vainqueur ? EQUIPES[info.vainqueur] : null;
    const nom = info.vainqueur ? nomDansPhrase(info.vainqueur) : null;
    enTransition = true;
    effacerAnnonce();
    if (panneauTransition) panneauTransition.remove();
    panneauTransition = h('div.transition',
      h('div.transition-titre',
        eq ? h('span', { style: { color: eq.hex } }, nom.Le) : null,
        eq ? ` ${nom.v('remporte', 'remportent')} la manche ${info.manche}` : `Manche ${info.manche} terminée`),
      h('div.transition-suite', 'Manche suivante !'),
      info.carteSuivante
        ? h('div.transition-carte', `Tornade à venir : ${info.carteSuivante.nom}`)
        : h('div.transition-carte', 'Dernière carte jouée'),
      blocChoixSens(info.choixSens),
    );
    montrerChoixSens(info.choixSens);
    panneauTransition.style.left = `${CENTRE.x}%`;
    panneauTransition.style.top = `${CENTRE.y}%`;
    zoneTable.appendChild(panneauTransition);
    zoneTable.classList.add('table-zone--transition');

    // Les lots regagnent le centre de la table.
    for (const pid of info.porteursAvant) {
      volLot(pid, 'centre', 'retour', desVides(), d * 0.34);
    }
    // La carte suivante glisse depuis la pioche.
    setTimeout(() => elCarte.classList.add('coin--echange'), d * 0.45);
    // Et on la révèle pendant la transition, plutôt qu'après : le temps de la
    // lire est pris sur celui où les dés reviennent au centre, et la manche
    // suivante s'ouvre sans attendre. Le jeu ne s'arrête pas pour autant —
    // la révélation se retire d'elle-même quand la manche commence. Si le sens
    // reste à trancher, elle attend la décision.
    if (minuterieRevelation) clearTimeout(minuterieRevelation);
    carteDifferee = null;
    if (info.carteSuivante) {
      minuterieRevelation = setTimeout(() => {
        minuterieRevelation = null;
        if (!actif || !moteur.transition) return;
        if (attenteSens) carteDifferee = { carte: info.carteSuivante, manche: info.manche + 1 };
        else montrerCarte(info.carteSuivante, info.manche + 1, { bloquante: false });
      }, d * 0.35);
    }
    setTimeout(() => {
      panneauTransition.classList.add('transition--sortie');
    }, d - 260);
    setTimeout(() => {
      if (panneauTransition) { panneauTransition.remove(); panneauTransition = null; }
      zoneTable.classList.remove('table-zone--transition');
      enTransition = false;
    }, d);
  };

  moteur.onDebutManche = (info) => {
    viderJetonsEnVol();   // les jetons repartent à zéro : plus rien à faire voler
    if (info.premiere) { montrerCarte(info.carte, info.manche); return; }
    // La carte a été révélée pendant la transition : la manche démarre tout de
    // suite, la révélation se retire.
    if (minuterieRevelation) { clearTimeout(minuterieRevelation); minuterieRevelation = null; }
    carteDifferee = null;
    fermerCarte();
    elCarte.classList.remove('coin--echange');
    // Les lots repartent du centre vers leurs nouveaux porteurs.
    const d = Math.max(260, 700 / vitesse);
    for (const pid of info.porteurs) volLot('centre', pid, 'retour', desVides(), d);
  };

  // ── La carte du tour, en grand ────────────────────────────────────────────
  // On révèle la Tornade avant de jouer : son pouvoir doit être lu, pas deviné.
  // La partie attend — c'est le moment où l'on regarde la carte à la table —
  // et repart à l'espace, au clic, ou d'elle-même si personne ne réagit.
  let carteEnAttente = null;
  let panneauCarte = null;
  let minuterieCarte = null;

  function fermerCarte() {
    if (minuterieCarte) { clearTimeout(minuterieCarte); minuterieCarte = null; }
    if (panneauCarte) { panneauCarte.remove(); panneauCarte = null; }
    carteEnAttente = null;
    // L'horloge repart d'ici : sans cela le temps d'affichage serait rattrapé
    // d'un coup et la manche démarrerait déjà commencée.
    ancrage = performance.now();
  }

  function montrerCarte(carte, manche, { bloquante = true } = {}) {
    if (!carte) return;
    fermerCarte();
    // Bloquante, la partie attend qu'on l'ait vue ; en passant — entre deux
    // manches —, l'horloge continue et la carte se retire à l'ouverture.
    if (bloquante) carteEnAttente = carte;
    const consigne = bloquante ? 'Espace ou clic pour continuer' : 'La manche commence…';
    // La carte dessinée comme le carton, en grand : le même dessin qu'au centre.
    panneauCarte = h('div.voile-carte', { onclick: fermerCarte },
      h('div.carte-annonce.carte-annonce--imprimee.carte-annonce--dessinee',
        h('div.mini.muted', `Manche ${manche}`),
        carteTornadeDessinee(carte, { requis: requisCarte(moteur.cfg, carte), texte: texteCarte(carte.texte) }),
        h('div.rangee.rangee--serree', { style: { justifyContent: 'center', marginTop: '12px' } },
          imageSens(moteur.sens, 'img.carte-sens-mini'),
          h('span.mini.muted', `Manche jouée en sens ${NOM_TOUR(moteur.sens)}`)),
        h('div.mini.muted', { style: { marginTop: '10px' } }, consigne),
      ),
    );
    racine.appendChild(panneauCarte);
    // Personne pour appuyer — une table d'IA, un écran qu'on regarde de loin :
    // la carte se retire d'elle-même plutôt que de bloquer la partie.
    if (bloquante) minuterieCarte = setTimeout(fermerCarte, Math.max(1200, 4000 / vitesse));
  }

  function desVides() {
    return Array.from({ length: Math.min(4, moteur.cfg.desParLot) }, () => ({ sym: null }));
  }

  /**
   * De quel côté de l'écran est assis un autre joueur, vu depuis le siège de
   * `j` : « gauche » ou « droite ». Deux sièges l'un au-dessus de l'autre — au
   * téléphone, en colonne — rendent le côté par défaut.
   */
  function coteDe(j, autreId, defaut) {
    const a = elSieges[j.id];
    const b = elSieges[autreId];
    if (!a || !b || a === b) return defaut;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const dx = (rb.left + rb.width / 2) - (ra.left + ra.width / 2);
    const dy = (rb.top + rb.height / 2) - (ra.top + ra.height / 2);
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 0.5) return defaut;
    return dx < 0 ? 'gauche' : 'droite';
  }

  /** Les dés du joueur, avec la glissade quand le lot vient d'être remplacé. */
  function zoneDesPanneau(j, lot, peutAgir) {
    const rangee = h('div.des-panneau',
      ...lot.des.map((d, i) => {
        const de = faceDe(d.sym, { verrou: d.verrou, taille: 'grand', roule: d.roule });
        if (peutAgir && !d.verrou && !d.roule) {
          de.classList.add('de--cliquable');
          de.title = 'Relancer ce dé';
          de.onclick = () => moteur.lancerHumain(j.id, [i]);
        }
        return de;
      }),
    );

    const zone = h('div.zone-des', rangee);
    const avant = dernierLot.get(j.id);
    dernierLot.set(j.id, { id: lot.id, des: lot.des.map((d) => d.sym) });

    if (avant && avant.id !== lot.id) {
      // Le lot précédent sort du côté du voisin qui le reçoit ; le nouveau entre
      // par le côté de celui qui l'a passé — à l'écran, là où il est assis.
      const sortie = coteDe(j, moteur._suivant(j).id, moteur.sens > 0 ? 'droite' : 'gauche');
      const entree = lot.venuDe != null
        ? coteDe(j, lot.venuDe, sortie === 'droite' ? 'gauche' : 'droite')
        : (sortie === 'droite' ? 'gauche' : 'droite');
      zone.classList.add(`zone-des--sort-${sortie}`, `zone-des--entre-${entree}`);
      rangee.classList.add('des-panneau--entree');
      const fantome = h('div.des-panneau.des-panneau--fantome',
        ...avant.des.map((sym) => faceDe(sym, { taille: 'grand' })));
      zone.appendChild(fantome);
      setTimeout(() => fantome.remove(), 520);
    }
    return zone;
  }

  function alerteDe(j) {
    const retenue = alertesRetenues.get(j.id);
    if (retenue && moteur.now < retenue.fin) return retenue.couleur;
    return alerteDesCombos(moteur.combosDisponibles(j));
  }

  // ── Boucle ────────────────────────────────────────────────────────────────
  let actif = true;
  function boucle() {
    if (!actif || moteur !== maPartie) return;
    if (!enPause && !carteEnAttente && !attenteSens && !moteur.termine) {
      const cible = moteur.now + (performance.now() - ancrage) * vitesse;
      ancrage = performance.now();
      moteur.avancerJusqua(cible);
    } else {
      ancrage = performance.now();
    }
    peindre();
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);

  function auClavier(ev) {
    if (!actif || moteur !== maPartie || moteur.termine) return;
    if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
    // La carte de sens attend une réponse : elle passe avant tout le reste, et
    // l'espace fait le geste neutre — on la laisse en place.
    if (attenteSens) {
      if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'Escape') {
        fermerSens(false);
        ev.preventDefault();
      }
      return;
    }
    // La carte du tour passe avant tout : sans cela l'espace lancerait les dés
    // derrière le voile, sur une manche qu'on n'a pas encore vue commencer.
    if (carteEnAttente || panneauCarte) {
      if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'Escape') {
        fermerCarte();
        ev.preventDefault();
      }
      return;
    }
    if (ev.code === 'Escape') { enPause = !enPause; ev.preventDefault(); return; }
    for (const j of humains) {
      if (!j.lots.length) continue;
      const t = toucheDe.get(j.id);
      if (ev.code === t.lancer) { toutRelancer(j); ev.preventDefault(); return; }
    }
  }

  // La première manche est ouverte par le constructeur, avant que le crochet ne
  // soit posé : sa carte se montre donc ici, à la main.
  montrerCarte(moteur.carte, moteur.manche);

  window.addEventListener('keydown', auClavier);

  const surveillant = new MutationObserver(() => {
    if (!document.body.contains(racine)) {
      actif = false;
      fermerCarte();
      fermerSens(false);
      window.removeEventListener('keydown', auClavier);
      window.removeEventListener('resize', placerSieges);
      suiviTaille.disconnect();
      surveillant.disconnect();
    }
  });
  surveillant.observe(document.body, { childList: true, subtree: true });

  // ── Peinture ──────────────────────────────────────────────────────────────
  function peindre() {
    racine.classList.toggle('en-pause', enPause);
    peindreBadges();
    peindreSieges();
    peindreCentre();
    peindreJournal();
    peindreCarteEquipe();
    peindrePanneaux();
    peindreCouche();
  }

  function peindreBadges() {
    const sig = `${moteur.manche}|${moteur.carte?.id}|${moteur.sens}|${duree(moteur.now)}`;
    siChange(zoneBadges, sig, () => [
      h('span.badge', `Manche ${moteur.manche}`),
      h('span.badge', moteur.carte ? moteur.carte.nom : '—'),
      h('span.badge', `Sens ${moteur.sens > 0 ? 'horaire ↻' : 'antihoraire ↺'}`),
      h('span.badge', `⏱ ${duree(moteur.now)}`),
    ]);
  }

  function peindreSieges() {
    moteur.joueurs.forEach((j, i) => {
      const el = elSieges[i];
      // Entre deux manches, les dés sont repartis au centre : le siège n'en
      // montre plus, même si le moteur ne les a pas encore retirés des mains.
      const lot = enTransition ? null : j.lots[0];
      // Les jetons qu'il a récupérés, posés au-dessus de son siège.
      const pile = jetonsAuSiege(j.id);
      const vientDeSePoser = pile > (pilesVues.get(j.id) || 0);
      pilesVues.set(j.id, pile);
      el.classList.toggle('siege--porteur', !!lot);
      el.classList.toggle('siege--endormi', !j.eveille);
      el.classList.toggle('siege--eveille', j.eveille);

      const alerte = alerteDe(j);
      if (alerte) el.dataset.alerte = alerte; else delete el.dataset.alerte;

      const des = lot
        ? lot.des.map((d) => `${d.roule ? 'R' : d.sym}${d.verrou ? '*' : ''}`).join(',')
        : '';
      siChange(el, `${j.eveille}|${j.fige}|${des}|${pile}`, () => [
        h('div.siege-jetons', { title: pile ? `${pile} Jeton${pile > 1 ? 's' : ''} Équipe récupéré${pile > 1 ? 's' : ''}` : '' },
          ...Array.from({ length: pile }, (_, k) => h('span.siege-jeton', {
            class: vientDeSePoser && k === pile - 1 ? 'siege-jeton--arrive' : '',
            html: dessinJeton(j.equipe),
          }))),
        h('div.entete',
          emblemeEquipe(EQUIPES[j.equipe].embleme, 22),
          h('span', {
            style: { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          }, j.nom),
          j.type === 'ia' ? h('span.profil-siege', `(${j.profil.nom})`) : h('span.badge', 'vous'),
        ),
        h('div.etat-tornade', { class: j.eveille ? 'etat--eveille' : 'etat--endormi' },
          h('span.tornade', pastilleSymbole(j.eveille ? 'soleil' : 'lune', 20)),
          j.eveille ? 'Réveillé' : 'Endormi',
        ),
        h('div.des-mini',
          lot
            ? lot.des.map((d) => faceDe(d.sym, { verrou: d.verrou, taille: 'petit', roule: d.roule }))
            : h('span.mini.muted', '—'),
        ),
      ]);
    });
  }

  function peindreCentre() {
    // Les Jetons Équipe posés sur la carte en font partie : elle se repeint
    // quand l'un d'eux la quitte.
    const equipes = Object.values(moteur.equipes);
    const sigJetons = equipes.map((e) => `${e.id}:${jetonsSurCarte(e)}/${e.objectif}`).join();
    let centreChange = siChange(elCarte, `${moteur.carte?.id}|${moteur.manche}|${sigJetons}`, () => (
      moteur.carte
        ? carteTornadeDessinee(moteur.carte, {
            requis: requisCarte(moteur.cfg, moteur.carte),
            texte: texteCarte(moteur.carte.texte),
            jetons: blocJetonsCarte(),
          })
        : null
    ));

    const reste = Math.max(0, moteur.pioche.length - 1);
    centreChange = siChange(elPioche, `pioche-${reste}-${moteur.sens}`, () => h('div.pioche',
      h('div.pioche-pile', {
        title: reste > 1 ? `${reste} tornades restantes` : reste === 1 ? '1 tornade restante' : 'pile épuisée',
      },
        ...Array.from({ length: Math.min(4, Math.max(1, reste)) }, (_, k) =>
          h('div.dos-carte', { style: { transform: `translate(${k * 3}px, ${-k * 3}px)` } })),
        reste ? h('div.pioche-nb', reste) : h('div.pioche-nb.pioche-nb--vide', '0'),
      ),
      h('div.carte-sens', {
        title: `Carte Rotation : sens ${NOM_TOUR(moteur.sens)}. L’équipe qui reçoit les dés peut la retourner.`,
      },
        imageSens(moteur.sens),
        h('div.carte-sens-nom', 'Carte Rotation')),
    )) || centreChange;
    if (centreChange) placerSieges();

    siChange(elScores, equipes.map((e) => `${e.id}:${e.cartes.length}`).join('|'), () => equipes.map((e) => {
      const c = EQUIPES[e.id];
      // Les cartes à réunir pour gagner : une case vide par carte qui manque, un
      // dos rouge par carte gagnée. Celles qui arrivent se posent l'une après l'autre.
      const objectif = moteur.cartesPourGagner(e.id);
      const gagnees = e.cartes.length;
      const avant = cartesVues.get(e.id) ?? gagnees;
      cartesVues.set(e.id, gagnees);
      const cases = Array.from({ length: Math.max(objectif, gagnees) }, (_, k) => {
        const pleine = k < gagnees;
        const arrive = pleine && k >= avant;
        return h('span.carte-score', {
          class: `${pleine ? 'carte-score--pleine' : ''}${arrive ? ' carte-score--arrive' : ''}`,
          style: arrive ? { animationDelay: `${(k - avant) * 220}ms` } : null,
        });
      });
      return h('div.score-equipe', { class: `equipe-${e.id}`, style: { '--couleur-eq': c.hex } },
        h('span.score-nom', { style: { color: c.hex } }, emblemeEquipe(c.embleme, 26), ' ', c.animal),
        h('span.score-cartes', {
          title: `${gagnees} carte${gagnees > 1 ? 's' : ''} Tornade sur ${objectif} pour gagner`,
          'aria-label': `${gagnees} sur ${objectif}`,
        }, ...cases),
      );
    }));
  }

  /** Les Jetons Équipe sur la carte Tornade : une rangée par équipe, un jeton par Abri encore à réussir. */
  function blocJetonsCarte() {
    return h('div.tornade-jetons',
      ...Object.values(moteur.equipes).map((e) => {
        // Ils sortent par la fin : la case vidée se voit à sa place.
        const poses = jetonsSurCarte(e);
        return h('div.tornade-jetons-eq', { style: { '--couleur-eq': EQUIPES[e.id].hex } },
          ...Array.from({ length: e.objectif }, (_, k) => h('div', {
            class: `tornade-jeton tornade-jeton--${e.id}${k < poses ? ' on' : ''}`,
            html: k < poses ? dessinJeton(e.id) : '',
            title: `${EQUIPES[e.id].animal} : encore ${poses} jeton${poses > 1 ? 's' : ''} sur ${e.objectif}`,
          })),
        );
      }),
    );
  }

  function peindreJournal() {
    if (moteur.journal.length === dernierJournal) return;
    dernierJournal = moteur.journal.length;
    vider(zoneJournal);
    for (const e of moteur.journal.slice(-60)) {
      if (e.type === 'tour') {
        zoneJournal.appendChild(h('div.ligne.ligne--tour', {
          data: { couleur: e.couleur || 'gris' },
        },
          h('span.nom-joueur', e.texte),
          h('span.des-tour', ...(e.des || []).map((sym) => faceDe(sym, { taille: 'mini' }))),
          h('span.issue', e.issue),
        ));
      } else {
        zoneJournal.appendChild(h('div', { class: `ligne ligne--${e.type}` }, e.texte));
      }
    }
    zoneJournal.scrollTop = zoneJournal.scrollHeight;
  }

  function peindrePanneaux() {
    // La barre de lancer n'a lieu d'être que si l'on a des dés à jouer : entre
    // deux manches, pendant qu'une carte se révèle ou que la Carte Rotation
    // attend sa décision, elle s'efface.
    const horsJeu = enTransition || !!carteEnAttente || attenteSens || moteur.termine;
    const actifs = horsJeu ? [] : humains.filter((j) => j.lots.length);
    const sig = actifs.map((j) => {
      const lot = j.lots[0];
      const des = lot.des.map((d) => `${d.roule ? 'R' : d.sym}${d.verrou ? '*' : ''}`).join(',');
      return `${j.id}:${j.eveille}:${j.fige}:${lot.lance}:${des}:${alerteDe(j) || ''}`;
    }).join('||') + (surMobile() ? '|m' : '|d');
    siChange(zonePanneaux, sig, () => actifs.map((j) => panneau(j)));
  }

  // Mémoire du lot affiché pour chaque humain : quand il change, on fait glisser
  // l'ancien hors du cadre et entrer le nouveau, dans le sens de rotation.
  const dernierLot = new Map();

  function panneau(j) {
    const t = toucheDe.get(j.id);
    const lot = j.lots[0];
    const alerte = alerteDe(j);
    const roule = lot.des.some((d) => d.roule);
    const libres = lot.des.map((d, i) => i).filter((i) => !lot.des[i].verrou && !lot.des[i].roule);
    const pose = lot.des.every((d) => d.sym && !d.roule);
    const peutAgir = !j.fige;
    const combo = j.departEnAttente && j.departEnAttente.dispo;

    return h('div.panneau-humain', { data: alerte ? { alerte } : {} },
      h('div.rangee', { style: { marginBottom: '10px' } },
        emblemeEquipe(EQUIPES[j.equipe].embleme, 24),
        h('strong', j.nom),
        h('span.petit.muted', j.eveille ? 'Réveillé' : 'Endormi'),
        h('div.pousse'),
        h('span.mini.muted.aide-clavier', `clic sur un dé : le relancer · ${t.libLancer} : tout relancer`),
      ),
      h('div.rangee',
        zoneDesPanneau(j, lot, peutAgir),
        h('div.pousse'),
        // Au doigt, le libellé reste court et ne change pas de largeur.
        h('button.btn.btn--primaire', {
          disabled: !peutAgir || !libres.length,
          onclick: () => toutRelancer(j),
        }, surMobile()
          ? (lot.lance ? 'Tout relancer' : 'Lancer')
          : (lot.lance ? `Tout relancer (${t.libLancer})` : `Lancer (${t.libLancer})`)),
      ),
      h('div.mini', { style: { marginTop: '8px' }, class: j.fige ? 'etat-depart' : 'muted' },
        j.fige ? `${combo ? `${combo.nom} ! ` : ''}Le lot part vers votre voisin…`
          : roule && !libres.length ? 'Les dés roulent…'
            : pose || libres.length < lot.des.length
              ? 'Cliquez un dé pour le relancer, même pendant qu’un autre tourne. '
                + 'Les tornades restent figées. '
                + 'Une combinaison formée est jouée aussitôt, puis le lot passe.'
              : 'Lancez le lot pour commencer.'),
    );
  }

  // ── Fin de partie ─────────────────────────────────────────────────────────
  function peindreCouche() {
    if (!moteur.termine) return;
    if (!couche) { couche = h('div.duel'); racine.appendChild(couche); }
    peindreFin();
  }

  function peindreFin() {
    if (!partieArchivee) {
      partieArchivee = true;
      const r = moteur.resultat();
      // Le compte rendu complet est figé ici, puis la page de résultats s'ouvre
      // d'elle-même : c'est le moment où l'on veut savoir ce qui s'est passé,
      // pas au terme d'un clic sur un carton de quatre colonnes.
      enregistrerPartie(moteur);
      ajouterHistorique({
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        joueurs: moteur.joueurs.length,
        vainqueur: r.vainqueur,
        manches: r.manches,
        duree: r.duree,
        graine: String(r.graine),
        raison: r.raison,
        detail: r.joueurs.map((j) => ({
          nom: j.nom, equipe: j.equipe, abris: j.stats.abris, lancers: j.stats.lancers,
        })),
      });
    }
    // Le carton de fin de partie laisse la place à la page de résultats : elle
    // s'ouvre d'elle-même, sur le coup de sifflet final. Un temps d'arrêt court
    // pour lire le nom du vainqueur à la table, puis on tourne la page.
    siChange(couche, `fin-${moteur.vainqueur}`, () => {
      const eq = moteur.vainqueur ? EQUIPES[moteur.vainqueur] : null;
      return h('div.boite', { style: { borderColor: eq ? eq.hex : 'var(--bord)' } },
        h('div.gros', { style: { color: eq ? eq.hex : 'var(--encre)' } },
          eq ? `${eq.animal} — victoire !` : 'Fin de partie'),
        h('p.petit.muted',
          `${moteur.manche} manches · ${duree(moteur.now)} de jeu · graine ${moteur.graine}`),
        h('p.petit.muted', 'Compte rendu de la partie…'),
        h('div.rangee', { style: { justifyContent: 'center', marginTop: '16px' } },
          h('button.btn.btn--primaire', { onclick: () => aller('/resultats') }, 'Voir les résultats'),
          h('button.btn', { onclick: () => { moteur = null; aller('/'); } }, 'Nouvelle partie'),
        ),
      );
    });
    if (!finAnnoncee) {
      finAnnoncee = true;
      // Hors du rendu : on ne change pas de page au milieu du dessin de celle
      // qu'on quitte. Assez long pour lire le vainqueur, assez court pour ne
      // pas donner l'impression d'un écran resté en plan.
      setTimeout(() => { if (moteur && moteur.termine) aller('/resultats'); }, 1600);
    }
  }

  peindre();
  return racine;
}
