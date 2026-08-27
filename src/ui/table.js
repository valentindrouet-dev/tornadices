// Table de jeu en temps réel.
//
// Le moteur avance à l'horloge du navigateur. L'affichage est repeint à chaque
// image, mais chaque bloc ne se reconstruit que si son contenu a changé : sans
// cela les boutons seraient remplacés entre l'appui et le relâchement du clic.

import { h, remplacer, duree, vider } from './dom.js?v=1.65';
import {
  faceDe, suiteSymboles, emblemeEquipe,
  SVG_TORNADE_EVEILLEE, SVG_TORNADE_ENDORMIE, SVG_SYMBOLE,
} from './icons.js?v=1.65';
import { Moteur } from '../core/engine.js?v=1.65';
import {
  COULEURS_EQUIPE, ALERTES, comboServie, exigenceVide, comboPossible, requisCarte,
  estJeton, estCompromis, sensRotation, comboAutomatique,
} from '../core/config.js?v=1.65';
import { ajouterHistorique } from './store.js?v=1.65';
import { enregistrerPartie } from './resultats.js?v=1.65';
import { aller } from './app.js?v=1.65';
import { jouerSon, eveillerSons, sonsActifs, reglerSons } from './sons.js?v=1.65';
import { nomSymbole } from './apparence.js?v=1.65';

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

// Touches attribuées aux joueurs humains, dans l'ordre des sièges.
const TOUCHES = [
  { lancer: 'Space', passer: 'KeyP', libLancer: 'Espace', libPasser: 'P' },
  { lancer: 'KeyA', passer: 'KeyE', libLancer: 'A', libPasser: 'E' },
  { lancer: 'KeyK', passer: 'KeyM', libLancer: 'K', libPasser: 'M' },
];

// Couleurs des éclats d'écran : la vache pour tous, l'échec et le sommeil pour soi.
/** Le côté d'un dé de siège, en pixels, pour un lot de `n` dés. */
function tailleDeSiege(n) {
  const utile = 176;   // largeur intérieure d'un siège
  const ecart = 4;     // l'espace entre deux dés
  const mini = 26;     // en dessous, la face ne se lit plus
  const nb = Math.max(1, Math.min(12, n || 4));
  const colonnes = Math.min(nb, Math.max(1, Math.floor((utile + ecart) / (mini + ecart))));
  return Math.min(36, Math.floor((utile - (colonnes - 1) * ecart) / colonnes));
}

// L'éclat d'écran reprend la couleur de l'événement : la nuit de la lune
// quand on s'endort, le rouge de l'échec, le vert de l'abri.
const COULEUR_ECLAT = { vache: '#6cb800', echec: '#e2000f', endormi: '#4b5bc7' };

/** Sous cette largeur, la table passe en disposition verticale. */
const surMobile = () => window.innerWidth <= 860;

/**
 * Couleur d'alerte à afficher autour de la zone d'un joueur. Elle suit ce que le
 * moteur juge jouable : trois éclairs sans voisin à attraper n'annoncent rien.
 */
function alerteDesCombos(dispo) {
  for (const id of ['echecJokers', 'blocage', 'collision', 'reveil', 'vache', 'endormir']) {
    if (dispo.some((d) => d.id === id)) return ALERTES[id];
  }
  return null;
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
        if (sonsActifs()) { eveillerSons(); jouerSon('vache'); }
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
  const elScores = h('div.coin.coin--scores');
  // Compromis : la carte Refuge, au centre du tapis. C'est là que chaque
  // équipe met ses animaux à couvert, et c'est ce qu'on regarde pour savoir
  // où en est la manche.
  const elRefuge = h('div.refuge');
  const zoneTable = h('div.table-zone', h('div.tapis'), elRefuge, elCarte, elPioche, elScores);
  const elSieges = moteur.joueurs.map((j) => {
    const el = h('div.siege', { class: `equipe-${j.equipe}${j.type === 'humain' ? ' siege--humain' : ''}` });
    zoneTable.appendChild(el);
    return el;
  });
  const n = moteur.joueurs.length;
  const CENTRE = { x: 50, y: 50 };
  const positions = elSieges.map(() => ({ x: 50, y: 50 }));
  const elTapis = zoneTable.querySelector('.tapis');

  // Les sièges tiennent dans le rectangle qui reste une fois les trois coins
  // réservés : la carte et les scores à gauche, la pioche à droite. Ainsi aucun
  // panneau ne recouvre un joueur ni la surface de jeu, quelle que soit la
  // taille de la fenêtre ou le nombre de joueurs.
  function placerSieges() {
    const zw = zoneTable.clientWidth;
    const zh = zoneTable.clientHeight;
    if (!zw || !zh || surMobile()) return;

    const marge = 20;
    const bandeGauche = Math.max(elCarte.offsetWidth, elScores.offsetWidth) + marge;
    const bandeDroite = elPioche.offsetWidth + marge;
    const larg = elSieges[0]?.offsetWidth || 196;
    const haut = elSieges[0]?.offsetHeight || 130;

    const libre = Math.max(240, zw - bandeGauche - bandeDroite);
    const cx = bandeGauche + libre / 2;
    const cy = zh / 2;
    const rx = Math.max(60, libre / 2 - larg / 2);
    const ry = Math.max(60, zh / 2 - haut / 2 - 6);

    CENTRE.x = (cx / zw) * 100;
    CENTRE.y = (cy / zh) * 100;

    elSieges.forEach((el, i) => {
      const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
      positions[i].x = ((cx + rx * Math.cos(a)) / zw) * 100;
      positions[i].y = ((cy + ry * Math.sin(a)) / zh) * 100;
      el.style.left = `${positions[i].x}%`;
      el.style.top = `${positions[i].y}%`;
    });

    if (elTapis) {
      elTapis.style.left = `${((cx - rx) / zw) * 100}%`;
      elTapis.style.top = `${((cy - ry) / zh) * 100}%`;
      elTapis.style.width = `${((2 * rx) / zw) * 100}%`;
      elTapis.style.height = `${((2 * ry) / zh) * 100}%`;
    }
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

    elSieges.forEach((el, i) => {
      const c = cellules[i];
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

  // Un jeton retourné quitte la zone du joueur et rejoint le compteur de son
  // équipe : c'est le seul moment où l'on voit d'où vient un point. Le compteur
  // n'affiche le jeton qu'à l'arrivée, sinon le vol n'aurait plus rien à porter.
  const jetonsEnVol = new Map();
  const jetonsAffiches = (e) => Math.max(0, e.retournes - (jetonsEnVol.get(e.id) || 0));

  function volJeton(pid, equipeId, nombre = 1) {
    const siege = elSieges[pid];
    if (!siege) return;
    const zone = zoneTable.getBoundingClientRect();
    const depart = siege.getBoundingClientRect();
    const bloc = elScores.querySelector(`.score-equipe.equipe-${equipeId}`);
    const libres = elScores.querySelectorAll(`.score-equipe.equipe-${equipeId} .jeton:not(.on)`);
    const x0 = depart.left + depart.width / 2;
    const y0 = depart.top + depart.height / 2;

    for (let k = 0; k < nombre; k++) {
      const cible = (libres[k] || bloc || elScores).getBoundingClientRect();
      const el = h('div.jeton-vol', { html: SVG_SYMBOLE.vache });
      // Taille et position posées en dur : un jeton sans feuille de style ne doit
      // pas pouvoir s'étaler sur toute la table.
      Object.assign(el.style, { position: 'absolute', width: '32px', height: '32px' });
      el.style.left = `${x0 - zone.left}px`;
      el.style.top = `${y0 - zone.top}px`;
      el.style.setProperty('--dx', `${cible.left + cible.width / 2 - x0}px`);
      el.style.setProperty('--dy', `${cible.top + cible.height / 2 - y0}px`);
      el.style.setProperty('--duree', `${Math.max(220, 850 / vitesse)}ms`);
      el.style.animationDelay = `${(k * 200) / vitesse}ms`;
      jetonsEnVol.set(equipeId, (jetonsEnVol.get(equipeId) || 0) + 1);
      zoneTable.appendChild(el);
      // On écoute la fin réelle de l'animation, pas une minuterie : en pause le
      // vol se fige, et le compteur doit se figer avec lui.
      el.addEventListener('animationend', () => {
        el.remove();
        jetonsEnVol.set(equipeId, Math.max(0, (jetonsEnVol.get(equipeId) || 0) - 1));
      }, { once: true });
    }
  }

  function viderJetonsEnVol() {
    jetonsEnVol.clear();
    for (const el of zoneTable.querySelectorAll('.jeton-vol')) el.remove();
  }

  const zonePanneaux = h('div.zone-panneaux', { style: { display: 'grid', gap: '10px', marginTop: '10px' } });
  const zoneJournal = h('div.journal');

  // Une ligne de la liste : les dés demandés, le nom, et ce qu'il faut savoir.
  const ligneCombo = (c) => h('div.rangee.rangee--serree',
    h('div', { style: { display: 'flex', gap: '2px', width: '84px', flex: 'none' } },
      suiteSymboles(c.requis, 20)),
    h('div.mini', { style: { flex: '1' } }, c.nom,
      // Le rappel dit laquelle des deux combinaisons porte le contact —
      // et que l'autre, en mode « Échecs », ne se joue plus.
      moteur.cfg.attrapeSur === 'echec' && c.id === 'blocage'
        ? h('span.muted', ' · tente l’attrape')
        : null,
      moteur.cfg.attrapeSur === 'echec' && c.id === 'collision'
        ? h('span.muted', ' · hors jeu dans ce mode')
        : null),
  );

  // Une combinaison que le dé ne peut pas produire n'est pas une règle, c'est
  // une ligne morte : sans face joker, « Trois jokers » n'a rien à faire là.
  const jouables = moteur.cfg.combos.filter((c) => comboPossible(moteur.cfg.faces, c.requis));
  const listeCombos = (titre, etat) => {
    const dedans = jouables.filter((c) => c.face === 'toutes' || c.face === etat);
    if (!dedans.length) return null;
    return h('div.carte',
      h('div.titre-section', titre),
      h('div', { style: { display: 'grid', gap: '8px' } }, ...dedans.map(ligneCombo)),
    );
  };

  const zoneCote = h('div.colonne-cote',
    // Deux listes plutôt qu'une : ce qu'on peut faire en dormant, et ce qu'on
    // peut faire réveillé. À la table, c'est la question qu'on se pose.
    listeCombos('Combinaisons (Endormi)', 'endormie'),
    listeCombos('Combinaisons (Réveillé)', 'active'),
    h('div.carte',
      h('div.titre-section', 'Carte du jour'),
      moteur.carte && moteur.carte.combo
        // L'exigence affichée est celle que le moteur applique — celle des
        // Réglages, pas la référence de la carte. Lire `combo.requis` en direct
        // montrait la combinaison d'origine quoi qu'on ait réglé.
        ? ligneCombo({
            ...moteur.carte.combo,
            requis: requisCarte(moteur.cfg, moteur.carte.combo),
            nom: moteur.carte.court,
          })
        : h('div.mini.muted', 'Cette carte n’ouvre aucune combinaison.'),
      h('p.mini.muted', { style: { marginTop: '10px' } },
        'Dès qu’une combinaison sort, elle est jouée : le lot part et l’effet s’applique.'),
    ),
    h('div.carte', h('div.titre-section', 'Journal'), zoneJournal),
  );

  racine.appendChild(zoneEntete);
  racine.appendChild(h('div.grille.grille--jeu',
    h('div', zoneTable, zonePanneaux), zoneCote));

  let couche = null;
  let dernierJournal = -1;
  const touchesRecentes = new Map();
  moteur.onJournal = (e) => {
    if (e.type === 'touche' && e.pid != null) touchesRecentes.set(e.pid, moteur.now);
  };
  moteur.onMouvement = (de, vers, motif, lot, duree) => animerPassage(de, vers, motif, lot, duree);
  moteur.onJeton = (pid, equipe, nombre, source) => {
    volJeton(pid, equipe, nombre);
    eclat(COULEUR_ECLAT.vache);      // n'importe quel joueur : la vache se fête
    if (source === 'vache') jouerSon('vache');
  };

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
    // L'alarme de l'attrape sonne pour toute la table : c'est l'avertissement.
    if (type === 'attrape') { jouerSon('attrape'); return; }
    // Réveil, échec et endormissement ne concernent que celui qui les subit.
    if (j.type !== 'humain') return;
    if (type === 'reveil') { eclat(COULEURS_EQUIPE[j.equipe].hex); jouerSon('reveil'); }
    else if (type === 'echec') eclat(COULEUR_ECLAT.echec);
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

  // Les combinaisons obligatoires sont jouées dans la foulée du lancer : sans
  // rémanence, leur alerte clignoterait le temps d'une image. On la retient.
  const PRIORITE_ALERTE = ['rouge', 'jaune', 'or', 'vert', 'nuit'];
  const alertesRetenues = new Map();
  moteur.onCombinaison = (pid, comboId) => {
    const couleur = ALERTES[comboId];
    if (!couleur) return;
    const duree = Math.max(320, 950 / vitesse);
    const cur = alertesRetenues.get(pid);
    const remplace = !cur || moteur.now >= cur.fin
      || PRIORITE_ALERTE.indexOf(couleur) < PRIORITE_ALERTE.indexOf(cur.couleur);
    if (remplace) alertesRetenues.set(pid, { couleur, fin: moteur.now + duree });
  };
  const FLECHE = (s) => (s > 0 ? '↻' : '↺');
  const NOM_TOUR = (s) => (s > 0 ? 'horaire' : 'antihoraire');

  /**
   * Ce que la table dit du sens, une fois la carte tranchée. Quand ceux qui
   * reçoivent les dés sont tous menés par l'ordinateur, la décision est déjà
   * prise à l'ouverture de la transition : le panneau n'a plus qu'à la dire.
   */
  function blocChoixSens(choix) {
    if (!choix || !choix.decide) return null;
    return h('div.transition-sens',
      h('span.transition-sens-fleche', FLECHE(moteur.sens)),
      h('span', choix.inverse
        ? `Carte de sens retournée — manche suivante en sens ${NOM_TOUR(moteur.sens)}`
        : `Carte de sens laissée — manche suivante en sens ${NOM_TOUR(moteur.sens)}`),
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
  }

  function montrerChoixSens(choix) {
    if (!choix || choix.decide || !choix.humain) return;
    attenteSens = true;
    // « Les Bleus », « Le Vert » : le nom d'équipe s'écrit sans article, et une
    // phrase en manque. Le Vert est un joueur, les autres sont des équipes.
    const camps = choix.equipes
      .map((e) => (e === 'vert' ? 'le Vert' : `les ${COULEURS_EQUIPE[e].nom}`))
      .join(' et ');
    const titre = `${camps.charAt(0).toUpperCase()}${camps.slice(1)} `
      + `${choix.equipes.length === 1 && choix.equipes[0] === 'vert' ? 'reçoit' : 'reçoivent'} les dés`;
    panneauSens = h('div.voile-carte',
      h('div.carte-annonce',
        h('div.mini.muted', 'Carte de sens'),
        h('h2', { style: { margin: '6px 0 10px' } }, titre),
        h('div.texte-carte-grand',
          'Gardez le sens de circulation, ou retournez la carte pour l’inverser. '
          + 'On n’attrape que son voisin d’aval — changer de sens, c’est changer '
          + 'de proie et de voisin dangereux.'),
        h('div.rangee.rangee--serree', {
          style: { justifyContent: 'center', marginTop: '16px' },
        },
          h('button.btn', { onclick: () => fermerSens(false) },
            `Garder ${FLECHE(choix.sens)} ${NOM_TOUR(choix.sens)}`),
          h('button.btn.btn--primaire', { onclick: () => fermerSens(true) },
            `Retourner ${FLECHE(-choix.sens)} ${NOM_TOUR(-choix.sens)}`),
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
  moteur.onFinManche = (info) => {
    const d = Math.max(300, info.duree / vitesse);
    const eq = info.vainqueur ? COULEURS_EQUIPE[info.vainqueur] : null;
    enTransition = true;
    effacerAnnonce();
    if (panneauTransition) panneauTransition.remove();
    panneauTransition = h('div.transition',
      h('div.transition-titre',
        eq ? h('span', { style: { color: eq.hex } }, eq.nom) : null,
        eq ? ` remportent la manche ${info.manche}` : `Manche ${info.manche} terminée`),
      h('div.transition-suite', 'Manche suivante !'),
      info.carteSuivante
        ? h('div.transition-carte', `Journée à venir : ${info.carteSuivante.nom}`)
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
    montrerCarte(info.carte, info.manche);
    if (info.premiere) return;
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

  function montrerCarte(carte, manche) {
    if (!carte) return;
    fermerCarte();
    carteEnAttente = carte;
    // Le sens annoncé est celui de la manche qui commence — sous la règle des
    // dos de cartes, il vient du dos de la carte SUIVANTE, pas de celle qu'on
    // retourne. Montrer la flèche de la carte révélée dirait le contraire.
    const fleche = FLECHE(moteur.sens);
    panneauCarte = h('div.voile-carte', { onclick: fermerCarte },
      h('div.carte-annonce.carte-annonce--tornade',
        h('div.mini.muted', `Manche ${manche}`),
        h('h2', { style: { margin: '6px 0 10px' } }, carte.nom),
        h('div.texte-carte-grand', texteCarte(carte.texte)),
        carte.combo
          ? h('div', { style: { marginTop: '14px' } },
              h('div.mini.muted', { style: { marginBottom: '6px' } }, 'Combinaison de la carte'),
              h('div.rangee.rangee--serree', { style: { justifyContent: 'center' } },
                suiteSymboles(requisCarte(moteur.cfg, carte.combo), 34)))
          : h('div.mini.muted', { style: { marginTop: '14px' } },
              'Aucune combinaison — la carte agit d’elle-même.'),
        h('div.rangee.rangee--serree', {
          style: { justifyContent: 'center', marginTop: '14px' },
        },
          h('span.fleche-sens', fleche),
          h('span.mini.muted', `Manche jouée en sens ${NOM_TOUR(moteur.sens)}`)),
        h('div.mini.muted', { style: { marginTop: '16px' } }, 'Espace ou clic pour continuer'),
      ),
    );
    racine.appendChild(panneauCarte);
    // Personne pour appuyer — une table d'IA, un écran qu'on regarde de loin :
    // la carte se retire d'elle-même plutôt que de bloquer la partie.
    minuterieCarte = setTimeout(fermerCarte, Math.max(1200, 5200 / vitesse));
  }

  function desVides() {
    return Array.from({ length: Math.min(4, moteur.cfg.desParLot) }, () => ({ sym: null }));
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
      // Le lot précédent sort du côté où il part, le nouveau entre de l'autre.
      const vers = moteur.sens > 0 ? 'droite' : 'gauche';
      zone.classList.add(`zone-des--${vers}`);
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
    if (carteEnAttente) {
      if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'Escape') {
        fermerCarte();
        ev.preventDefault();
      }
      return;
    }
    if (moteur.duel) {
      // Un réflexe, une touche : pendant l'attrape on est toucheur ou cible,
      // jamais les deux — la même touche sert donc aux deux gestes.
      for (const j of humains) {
        if (ev.code !== toucheDe.get(j.id).lancer) continue;
        if (moteur.duel.toucheurId === j.id) {
          moteur.reflexeHumain(j.id, 'toucher'); ev.preventDefault(); return;
        }
        if (moteur.duel.cibleId === j.id) {
          moteur.reflexeHumain(j.id, 'esquiver'); ev.preventDefault(); return;
        }
      }
      return;
    }
    if (ev.code === 'Escape') { enPause = !enPause; ev.preventDefault(); return; }
    for (const j of humains) {
      if (!j.lots.length) continue;
      const t = toucheDe.get(j.id);
      if (ev.code === t.lancer) { moteur.lancerHumain(j.id, null); ev.preventDefault(); return; }
      if (ev.code === t.passer) { moteur.passerHumain(j.id); ev.preventDefault(); return; }
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
      const lot = j.lots[0];
      const recent = touchesRecentes.get(j.id);
      const secoue = recent != null && moteur.now - recent < 600;
      el.classList.toggle('siege--porteur', j.lots.length > 0);
      el.classList.toggle('siege--touche', secoue);
      el.classList.toggle('siege--endormi', !j.eveille);
      el.classList.toggle('siege--eveille', j.eveille);

      const alerte = alerteDe(j);
      if (alerte) el.dataset.alerte = alerte; else delete el.dataset.alerte;

      const des = lot
        ? lot.des.map((d) => `${d.roule ? 'R' : d.sym}${d.verrou ? '*' : ''}`).join(',')
        : '';
      const sig = `${j.lots.length}|${j.eveille}|${j.fige}|${des}`;
      siChange(el, sig, () => {
        const eq = COULEURS_EQUIPE[j.equipe];
        return [
          h('div.entete',
            h('span.puce', { style: { background: eq.hex } }),
            h('span', {
              style: { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            }, j.nom),
            // Le caractère de l'IA, en petit : à six autour de la table, savoir
            // qui cherche à vous attraper change la façon de jouer.
            j.type === 'ia'
              ? h('span.profil-siege', `(${j.profil.court || j.profil.nom})`)
              : null,
            j.lots.length > 1 ? h('span.badge-lots', `×${j.lots.length}`) : null,
            j.type === 'humain' ? h('span.badge', 'vous') : null,
          ),
          h('div.etat-tornade', { class: j.eveille ? 'etat--eveille' : 'etat--endormi' },
            h('span.tornade', {
              html: j.eveille ? SVG_TORNADE_EVEILLEE : SVG_TORNADE_ENDORMIE,
              style: j.eveille ? { color: eq.hex } : null,
            }),
            j.eveille ? 'Éveillée' : 'Endormie',
          ),
          h('div.des-mini',
            lot
              ? lot.des.map((d) => faceDe(d.sym, {
                  verrou: d.verrou, taille: 'petit', roule: d.roule,
                }))
              : h('span.mini.muted', '—'),
          ),
        ];
      });
    });
  }

  function peindreCentre() {
    siChange(elCarte, `${moteur.carte?.id}|${moteur.manche}`, () => (
      moteur.carte
        ? h('div.carte-journee',
            h('div.mini.muted', `Manche ${moteur.manche}`),
            h('div.nom-carte', moteur.carte.nom),
            h('div.texte-carte', texteCarte(moteur.carte.texte)),
            moteur.carte.combo
              ? h('div.rangee.rangee--serree', { style: { marginTop: '7px' } },
                  suiteSymboles(requisCarte(moteur.cfg, moteur.carte.combo), 21))
              : null,
          )
        : null
    ));

    peindreRefuge();

    const reste = Math.max(0, moteur.pioche.length - 1);
    // Le sens ne se lit plus au dos des Tornades : c'est la carte rotation qui
    // le porte, posée à côté de la pioche. Sous la règle qui alterne d'une
    // manche à l'autre, personne ne la retourne — le bandeau du haut suffit.
    const regleSens = sensRotation(moteur.cfg);
    // La carte rotation est posée sur la table dès qu'elle décide du sens.
    const carteDeSens = regleSens === 'perdants';
    const sensPioche = FLECHE(moteur.sens);
    siChange(elPioche, `pioche-${reste}-${moteur.sens}-${regleSens}`, () => h('div.pioche',
      h('div.pioche-pile',
        ...Array.from({ length: Math.min(4, Math.max(1, reste)) }, (_, k) =>
          h('div.dos-carte', { style: { transform: `translate(${k * 3}px, ${-k * 3}px)` } })),
        reste ? h('div.pioche-nb', reste) : h('div.pioche-nb.pioche-nb--vide', '0'),
      ),
      h('div.mini.muted', { style: { marginTop: '8px', textAlign: 'center' } },
        reste > 1 ? `${reste} tornades restantes` : reste === 1 ? '1 tornade restante' : 'pile épuisée'),
      carteDeSens
        ? h('div.carte-sens', {
            title: `Carte de sens : ${NOM_TOUR(moteur.sens)}. Les perdants de la manche `
              + 'peuvent la retourner.',
          },
            h('div.carte-sens-fleche', sensPioche),
            h('div.carte-sens-nom', 'Carte de sens'))
        : null,
    ));

    const jetons = Object.values(moteur.equipes)
      .map((e) => `${e.id}:${jetonsAffiches(e)}/${e.jetons}:${e.cartes.length}`).join('|');
    if (siChange(elScores, jetons, () => Object.values(moteur.equipes).map((e) => {
      const c = COULEURS_EQUIPE[e.id];
      const acquis = jetonsAffiches(e);
      return h('div.score-equipe', { class: `equipe-${e.id}` },
        // Chaque équipe a son emblème : les Bleus sont les vaches, les Jaunes
        // les poules, le Vert est le cowboy.
        h('span.score-nom', { style: { color: c.hex } },
          emblemeEquipe(c.embleme, 18), ' ', c.nom),
        h('span.score-cartes', { title: 'cartes Tornade gagnées' },
          `${e.cartes.length}/${moteur.cfg.cartesPourGagner}`),
        // Hors de la règle de base, il n'y a plus de jetons à retourner : la
        // ligne de pastilles disparaît, seules les cartes font le score. En
        // Compromis, c'est l'Abri qui la remplace, au centre de la table.
        estJeton(moteur.cfg) ? h('div.suivi-jetons',
          ...Array.from({ length: e.jetons }, (_, k) => h('div', {
            class: `jeton${k < acquis ? ' on' : ''}${k === acquis - 1 ? ' jeton--arrive' : ''}`,
            html: k < acquis ? SVG_SYMBOLE.vache : '',
          })),
        ) : null,
      );
    }))) placerSieges();
  }

  /**
   * La carte Refuge : une colonne par équipe, un jeton par animal mis à couvert,
   * et le compte de ce que la Tornade du jour demande. Elle ne s'affiche qu'en
   * Compromis, seul mode où le Refuge existe.
   */
  function peindreRefuge() {
    if (!estCompromis(moteur.cfg)) {
      if (elRefuge.childNodes.length) vider(elRefuge);
      return;
    }
    const requis = moteur.refugeRequis || 1;
    const equipes = Object.values(moteur.equipes);
    const sig = `refuge-${requis}-${equipes.map((e) => `${e.id}:${e.refuge}:${e.emportes || 0}`).join('|')}`;
    siChange(elRefuge, sig, () => [
      h('div.refuge-titre', 'Refuge'),
      h('div.refuge-equipes', ...equipes.map((e) => {
        const c = COULEURS_EQUIPE[e.id];
        return h('div.refuge-equipe', { style: { '--couleur-eq': c.hex } },
          h('div.refuge-jetons',
            ...Array.from({ length: requis }, (_, k) => h('div', {
              class: `refuge-jeton${k < e.refuge ? ' on' : ''}`,
              html: k < e.refuge ? SVG_SYMBOLE.vache : '',
            }))),
          h('div.refuge-nom', c.emblemeNom));
      })),
      h('div.refuge-sous', `${requis} jeton${requis > 1 ? 's' : ''} à mettre à l’Abri`),
    ]);
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
          h('span.t', duree(e.t)),
          h('span.nom-joueur', e.texte),
          h('span.des-tour', ...(e.des || []).map((sym) => faceDe(sym, { taille: 'mini' }))),
          h('span.issue', e.issue),
        ));
      } else {
        zoneJournal.appendChild(h('div', { class: `ligne ligne--${e.type}` },
          h('span.t', duree(e.t)), e.texte));
      }
    }
    zoneJournal.scrollTop = zoneJournal.scrollHeight;
  }

  function peindrePanneaux() {
    const actifs = humains.filter((j) => j.lots.length);
    const sig = actifs.map((j) => {
      const lot = j.lots[0];
      const des = lot.des.map((d) => `${d.roule ? 'R' : d.sym}${d.verrou ? '*' : ''}`).join(',');
      const options = j.departEnAttente && j.departEnAttente.options;
      const enMain = j.attente && j.attente.combos;
      return `${j.id}:${j.lots.length}:${j.eveille}:${j.fige}:${lot.lance}:${des}`
        + `:${alerteDe(j) || ''}:${options ? options.map((o) => o.id).join('+') : ''}`
        + `:${enMain ? enMain.map((o) => o.id).join('+') : ''}`;
    }).join('||') + (surMobile() ? '|m' : '|d');
    siChange(zonePanneaux, sig, () => actifs.map((j) => panneau(j)));
  }

  // Mémoire du lot affiché pour chaque humain : quand il change, on fait glisser
  // l'ancien hors du cadre et entrer le nouveau, dans le sens de circulation.
  const dernierLot = new Map();

  function panneau(j) {
    const t = toucheDe.get(j.id);
    const lot = j.lots[0];
    const eq = COULEURS_EQUIPE[j.equipe];
    const alerte = alerteDe(j);
    const roule = lot.des.some((d) => d.roule);
    const libres = lot.des.map((d, i) => i).filter((i) => !lot.des[i].verrou && !lot.des[i].roule);
    const pose = lot.des.every((d) => d.sym && !d.roule);
    const peutAgir = !j.fige && !moteur.duel;
    // Plusieurs combinaisons sortent au même jet — grâce au joker le plus souvent :
    // c'est au joueur de dire laquelle il joue, pendant le temps de constat.
    const options = (j.departEnAttente && j.departEnAttente.options) || null;
    const enMain = (j.attente && j.attente.combos) || null;

    return h('div.panneau-humain', { data: alerte ? { alerte } : {} },
      h('div.rangee', { style: { marginBottom: '10px' } },
        h('span', {
          style: { width: '12px', height: '12px', borderRadius: '50%', background: eq.hex },
        }),
        h('strong', j.nom),
        h('span.petit.muted', j.eveille ? 'Tornade éveillée' : 'Tornade endormie'),
        j.lots.length > 1 ? h('span.badge', `${j.lots.length} lots en main`) : null,
        h('div.pousse'),
        h('span.mini.muted.aide-clavier',
          `clic sur un dé : le relancer · ${t.libLancer} : tout relancer · ${t.libPasser} : passer`),
      ),
      h('div.rangee',
        zoneDesPanneau(j, lot, peutAgir),
        h('div.pousse'),
        // Sans clavier, la touche n'a rien à faire sur le bouton : au doigt, le
        // libellé doit rester court et surtout ne pas changer de largeur.
        h('button.btn.btn--primaire', {
          disabled: !peutAgir || !libres.length,
          onclick: () => moteur.lancerHumain(j.id, null),
        }, surMobile()
          ? (lot.lance ? 'Tout relancer' : 'Lancer')
          : (lot.lance ? `Tout relancer (${t.libLancer})` : `Lancer (${t.libLancer})`)),
        h('button.btn', {
          disabled: !peutAgir || !pose,
          onclick: () => moteur.passerHumain(j.id),
        }, surMobile() ? 'Passer' : `Passer (${t.libPasser})`),
      ),
      options
        ? h('div.choix-combo',
            h('span.choix-titre', 'Plusieurs combinaisons sont servies — laquelle jouez-vous ?'),
            ...options.map((o) => {
              const def = moteur.cfg.combos.find((c) => c.id === o.id);
              const nom = o.source === 'journee'
                ? `${moteur.carte.court} (carte)`
                : (def ? def.nom : o.id);
              return h('button.combo-btn', {
                onclick: () => moteur.choisirCombo(j.id, o.id),
              }, h('span.rangee.rangee--serree', suiteSymboles(o.combo.requis, 17)), nom);
            }))
        : null,

      // Réglage « on peut relancer par-dessus » : la combinaison est là, mais
      // rien ne part tant qu'on ne l'encaisse pas. Relancer reste possible.
      enMain
        ? h('div.combo-choix',
            h('div.mini', 'Vous la tenez — encaissez-la, ou relancez pour viser autre chose.'),
            ...enMain.map((o) => {
              const def = moteur.cfg.combos.find((c) => c.id === o.id);
              return h('button.combo-btn', {
                onclick: () => moteur.jouerComboHumain(j.id, o.id),
              }, h('span.rangee.rangee--serree', suiteSymboles(o.combo.requis, 17)),
              def ? def.nom : o.id);
            }))
        : null,

      h('div.mini', { style: { marginTop: '8px' }, class: j.fige ? 'etat-depart' : 'muted' },
        options ? 'Sans réponse de votre part, la meilleure combinaison est jouée d’office.'
          : j.fige ? 'Le lot part vers votre voisin…'
            : roule && !libres.length ? 'Les dés roulent…'
              : pose || libres.length < lot.des.length
                ? 'Cliquez un dé pour le relancer, même pendant qu’un autre tourne. '
                  + `Les ${nomSymbole('x')} sont figés, et `
                  + (comboAutomatique(moteur.cfg)
                    ? 'toute combinaison servie part toute seule.'
                    : 'seuls l’Abri et l’Échec partent tout seuls.')
                : 'Lancez le lot pour commencer.'),
    );
  }

  // ── Superpositions ────────────────────────────────────────────────────────
  let jaugeDuel = null;
  function peindreCouche() {
    if (!moteur.duel && !moteur.termine) {
      if (couche) { couche.remove(); couche = null; jaugeDuel = null; }
      return;
    }
    if (!couche) { couche = h('div.duel'); racine.appendChild(couche); }
    if (moteur.termine) { peindreFin(); return; }

    const d = moteur.duel;
    const sig = `${d.toucheurId}-${d.cibleId}-${d.ouvertA}-${d.actionToucheur}-${d.actionCible}`;
    if (siChange(couche, sig, () => boiteDuel(d))) jaugeDuel = couche.querySelector('.jauge-duel > div');
    if (jaugeDuel) {
      const reste = Math.max(0, 1 - (moteur.now - d.ouvertA) / d.fenetre);
      jaugeDuel.style.width = `${reste * 100}%`;
    }
  }

  function boiteDuel(d) {
    const toucheur = moteur.joueurs[d.toucheurId];
    const cible = moteur.joueurs[d.cibleId];
    return h('div.boite',
      h('div.gros', { style: { color: 'var(--rouge)' } }, 'COLLISION !'),
      h('p.petit', `${toucheur.nom} tente de toucher ${cible.nom}`),
      h('div.rangee', { style: { justifyContent: 'center', marginTop: '10px' } },
        toucheur.type === 'humain'
          ? h('button.btn.btn--primaire.btn--grand', {
              disabled: d.actionToucheur != null,
              onclick: () => moteur.reflexeHumain(toucheur.id, 'toucher'),
            }, d.actionToucheur != null ? '✓ Geste parti' : `TOUCHER ! (${toucheDe.get(toucheur.id).libLancer})`)
          : null,
        cible.type === 'humain'
          ? h('button.btn.btn--grand', {
              disabled: d.actionCible != null,
              onclick: () => moteur.reflexeHumain(cible.id, 'esquiver'),
            }, d.actionCible != null ? '✓ Main retirée' : `ESQUIVER ! (${toucheDe.get(cible.id).libLancer})`)
          : null,
      ),
      h('div.jauge-duel', h('div', { style: { width: '100%' } })),
    );
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
          nom: j.nom, equipe: j.equipe, jetons: j.stats.jetonsRetournes,
          lancers: j.stats.lancers, touches: j.stats.collisionsReussies,
        })),
      });
    }
    // Le carton de fin de partie laisse la place à la page de résultats : elle
    // s'ouvre d'elle-même, sur le coup de sifflet final. Un temps d'arrêt court
    // pour lire le nom du vainqueur à la table, puis on tourne la page.
    siChange(couche, `fin-${moteur.vainqueur}`, () => {
      const eq = moteur.vainqueur ? COULEURS_EQUIPE[moteur.vainqueur] : null;
      return h('div.boite', { style: { borderColor: eq ? eq.hex : 'var(--bord)' } },
        h('div.gros', { style: { color: eq ? eq.hex : 'var(--encre)' } },
          eq ? `${eq.nom} — victoire !` : 'Fin de partie'),
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
