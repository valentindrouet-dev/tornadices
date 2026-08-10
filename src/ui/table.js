// Table de jeu en temps réel.
//
// Le moteur avance à l'horloge du navigateur. L'affichage est repeint à chaque
// image, mais chaque bloc ne se reconstruit que si son contenu a changé : sans
// cela les boutons seraient remplacés entre l'appui et le relâchement du clic.

import { h, remplacer, duree, vider } from './dom.js?v=1.12';
import {
  faceDe, suiteSymboles, SVG_TORNADE_EVEILLEE, SVG_TORNADE_ENDORMIE, SVG_SYMBOLE,
} from './icons.js?v=1.12';
import { Moteur } from '../core/engine.js?v=1.12';
import {
  COULEURS_EQUIPE, ALERTES, comboServie, exigenceVide,
} from '../core/config.js?v=1.12';
import { ajouterHistorique } from './store.js?v=1.12';
import { aller } from './app.js?v=1.12';

let moteur = null;
let vitesse = 1;
let enPause = false;
let ancrage = 0;
let partieArchivee = false;

export function partieEnCours() { return moteur && !moteur.termine ? moteur : null; }

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

/**
 * Couleur d'alerte à afficher autour de la zone d'un joueur, déduite des seuls
 * dés visibles : rouge à deux X, jaune à trois éclairs, puis bleu, vert, violet.
 */
function alerteDesDes(lot, combos) {
  if (!lot || !lot.lance) return null;
  const c = {};
  for (const d of lot.des) if (d.sym) c[d.sym] = (c[d.sym] || 0) + 1;
  for (const id of ['echecJokers', 'blocage', 'collision', 'reveil', 'vache', 'endormir']) {
    const combo = combos.find((x) => x.id === id);
    if (!combo || exigenceVide(combo.requis)) continue;
    if (comboServie(c, combo.requis)) return ALERTES[id];
  }
  return null;
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

  // ── Entête : badges variables à gauche, contrôles fixes à droite ──────────
  const zoneBadges = h('div.rangee.rangee--serree');
  const zoneEntete = h('div.rangee', { style: { marginBottom: '10px' } },
    zoneBadges,
    h('div', { style: { flex: '1' } }),
    h('div.segment', ...[0.5, 1, 2, 4].map((v) => {
      const b = h('button', { class: v === vitesse ? 'on' : '' }, `×${v}`);
      b.onclick = () => {
        vitesse = v;
        [...b.parentNode.children].forEach((x) => x.classList.toggle('on', x === b));
      };
      return b;
    })),
    (() => {
      const b = h('button.btn.btn--petit', '⏸ Pause');
      b.onclick = () => { enPause = !enPause; b.textContent = enPause ? '▶ Reprendre' : '⏸ Pause'; };
      return b;
    })(),
    h('button.btn.btn--petit', { onclick: () => aller('/') }, 'Quitter'),
  );

  // ── Table ─────────────────────────────────────────────────────────────────
  const elCarte = h('div.coin.coin--carte');
  const elPioche = h('div.coin.coin--pioche');
  const elScores = h('div.coin.coin--scores');
  const zoneTable = h('div.table-zone', h('div.tapis'), elCarte, elPioche, elScores);
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
    if (!zw || !zh || window.innerWidth <= 860) return;

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

  placerSieges();
  const suiviTaille = new ResizeObserver(() => placerSieges());
  suiviTaille.observe(zoneTable);
  window.addEventListener('resize', placerSieges);

  // Le lot traverse la table : sans cela on ne voit pas les dés changer de main.
  const enVol = [];
  function animerPassage(de, vers, motif, lot, dureeJeu) {
    const a = typeof de === 'number' ? positions[de] : de;
    const b = typeof vers === 'number' ? positions[vers] : vers;
    volLot(a, b, motif, lot ? lot.des : [], dureeJeu);
  }

  function volLot(a, b, motif, des, dureeJeu) {
    if (window.innerWidth <= 860) return;   // en disposition verticale, sans objet
    if (!a || !b) return;
    // Le vol dure exactement le temps de jeu du passage, à la vitesse d'affichage.
    const duree = Math.max(80, (dureeJeu ?? 1000) / vitesse);
    const el = h('div', { class: `lot-vol lot-vol--${motif}` },
      ...des.slice(0, 4).map((d) => faceDe(d.sym, { taille: 'petit' })));
    el.style.transitionDuration = `${duree}ms, ${duree}ms, 160ms`;
    el.style.left = `${a.x}%`;
    el.style.top = `${a.y}%`;
    zoneTable.appendChild(el);
    enVol.push(el);
    while (enVol.length > 6) enVol.shift().remove();
    requestAnimationFrame(() => {
      el.style.left = `${b.x}%`;
      el.style.top = `${b.y}%`;
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

  const zonePanneaux = h('div', { style: { display: 'grid', gap: '10px', marginTop: '10px' } });
  const zoneJournal = h('div.journal');

  const zoneCote = h('div', { style: { display: 'grid', gap: '16px', alignContent: 'start' } },
    h('div.carte',
      h('div.titre-section', 'Combinaisons'),
      h('div', { style: { display: 'grid', gap: '8px' } },
        ...moteur.cfg.combos.map((c) => h('div.rangee.rangee--serree',
          h('div', { style: { display: 'flex', gap: '2px', width: '84px', flex: 'none' } },
            suiteSymboles(c.requis, 20)),
          h('div.mini', { style: { flex: '1' } }, c.nom,
            c.face !== 'toutes'
              ? h('span.muted', ` · carte ${c.face === 'active' ? 'éveillée' : 'endormie'}`)
              : null),
        )),
        moteur.carte && moteur.carte.combo
          ? h('div.rangee.rangee--serree',
              h('div', { style: { display: 'flex', gap: '2px', width: '84px', flex: 'none' } },
                suiteSymboles(moteur.carte.combo.requis, 20)),
              h('div.mini', { style: { flex: '1' } }, moteur.carte.court,
                h('span.muted', ' · carte du jour')))
          : null,
      ),
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
  moteur.onJeton = (pid, equipe, nombre) => volJeton(pid, equipe, nombre);

  // Les moments qui comptent s'affichent en toutes lettres au centre de la table.
  let annonceCourante = null;
  let enTransition = false;
  function effacerAnnonce() {
    if (annonceCourante) { annonceCourante.remove(); annonceCourante = null; }
    zoneTable.classList.remove('table-zone--annonce');
  }
  moteur.onAnnonce = (texte, couleur) => {
    if (enTransition) return;   // la transition de manche occupe déjà le centre
    if (annonceCourante) annonceCourante.remove();
    const el = h('div', { class: `annonce annonce--${couleur}` }, texte);
    el.style.left = `${CENTRE.x}%`;
    el.style.top = `${CENTRE.y}%`;
    annonceCourante = el;
    zoneTable.appendChild(el);
    zoneTable.classList.add('table-zone--annonce');
    const vie = Math.max(500, 1700 / vitesse);
    setTimeout(() => el.classList.add('annonce--sortie'), vie);
    setTimeout(() => {
      el.remove();
      if (annonceCourante === el) {
        annonceCourante = null;
        zoneTable.classList.remove('table-zone--annonce');
      }
    }, vie + 320);
  };

  // Les combinaisons obligatoires sont jouées dans la foulée du lancer : sans
  // rémanence, leur alerte clignoterait le temps d'une image. On la retient.
  const PRIORITE_ALERTE = ['rouge', 'jaune', 'bleu', 'vert', 'violet'];
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
    );
    panneauTransition.style.left = `${CENTRE.x}%`;
    panneauTransition.style.top = `${CENTRE.y}%`;
    zoneTable.appendChild(panneauTransition);
    zoneTable.classList.add('table-zone--transition');

    // Les lots regagnent le centre de la table.
    for (const pid of info.porteursAvant) {
      volLot(positions[pid], CENTRE, 'retour', desVides(), d * 0.34);
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
    if (info.premiere) return;
    elCarte.classList.remove('coin--echange');
    // Les lots repartent du centre vers leurs nouveaux porteurs.
    const d = Math.max(260, 700 / vitesse);
    for (const pid of info.porteurs) volLot(CENTRE, positions[pid], 'retour', desVides(), d);
  };

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
    return alerteDesDes(j.lots[0], moteur.cfg.combos);
  }

  // ── Boucle ────────────────────────────────────────────────────────────────
  let actif = true;
  function boucle() {
    if (!actif || moteur !== maPartie) return;
    if (!enPause && !moteur.termine) {
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
    if (moteur.duel) {
      for (const j of humains) {
        const t = toucheDe.get(j.id);
        if (ev.code === t.lancer && moteur.duel.toucheurId === j.id) {
          moteur.reflexeHumain(j.id, 'toucher'); ev.preventDefault(); return;
        }
        if (ev.code === t.passer && moteur.duel.cibleId === j.id) {
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

  window.addEventListener('keydown', auClavier);

  const surveillant = new MutationObserver(() => {
    if (!document.body.contains(racine)) {
      actif = false;
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
            h('div.texte-carte', moteur.carte.texte),
            moteur.carte.combo
              ? h('div.rangee.rangee--serree', { style: { marginTop: '7px' } },
                  suiteSymboles(moteur.carte.combo.requis, 21))
              : null,
          )
        : null
    ));

    const reste = Math.max(0, moteur.pioche.length - 1);
    siChange(elPioche, `pioche-${reste}`, () => h('div.pioche',
      h('div.pioche-pile',
        ...Array.from({ length: Math.min(4, Math.max(1, reste)) }, (_, k) =>
          h('div.dos-carte', { style: { transform: `translate(${k * 3}px, ${-k * 3}px)` } })),
        reste ? h('div.pioche-nb', reste) : h('div.pioche-nb.pioche-nb--vide', '0'),
      ),
      h('div.mini.muted', { style: { marginTop: '8px', textAlign: 'center' } },
        reste > 1 ? `${reste} journées restantes` : reste === 1 ? '1 journée restante' : 'pile épuisée'),
    ));

    const jetons = Object.values(moteur.equipes)
      .map((e) => `${e.id}:${jetonsAffiches(e)}/${e.jetons}:${e.cartes.length}`).join('|');
    if (siChange(elScores, jetons, () => Object.values(moteur.equipes).map((e) => {
      const c = COULEURS_EQUIPE[e.id];
      const acquis = jetonsAffiches(e);
      return h('div.score-equipe', { class: `equipe-${e.id}` },
        h('span.score-nom', { style: { color: c.hex } }, c.nom),
        h('span.score-cartes', { title: 'cartes Journée gagnées' },
          `${e.cartes.length}/${moteur.cfg.cartesPourGagner}`),
        h('div.suivi-jetons',
          ...Array.from({ length: e.jetons }, (_, k) => h('div', {
            class: `jeton${k < acquis ? ' on' : ''}${k === acquis - 1 ? ' jeton--arrive' : ''}`,
            html: k < acquis ? SVG_SYMBOLE.vache : '',
          })),
        ),
      );
    }))) placerSieges();
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
      return `${j.id}:${j.lots.length}:${j.eveille}:${j.fige}:${lot.lance}:${des}`
        + `:${alerteDe(j) || ''}:${options ? options.map((o) => o.id).join('+') : ''}`;
    }).join('||');
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

    return h('div.panneau-humain', { data: alerte ? { alerte } : {} },
      h('div.rangee', { style: { marginBottom: '10px' } },
        h('span', {
          style: { width: '12px', height: '12px', borderRadius: '50%', background: eq.hex },
        }),
        h('strong', j.nom),
        h('span.petit.muted', j.eveille ? 'Tornade éveillée' : 'Tornade endormie'),
        j.lots.length > 1 ? h('span.badge', `${j.lots.length} lots en main`) : null,
        h('div', { style: { flex: '1' } }),
        h('span.mini.muted',
          `clic sur un dé : le relancer · ${t.libLancer} : tout relancer · ${t.libPasser} : passer`),
      ),
      h('div.rangee',
        zoneDesPanneau(j, lot, peutAgir),
        h('div', { style: { flex: '1' } }),
        h('button.btn.btn--primaire', {
          disabled: !peutAgir || !libres.length,
          onclick: () => moteur.lancerHumain(j.id, null),
        }, lot.lance ? `Tout relancer (${t.libLancer})` : `Lancer (${t.libLancer})`),
        h('button.btn', {
          disabled: !peutAgir || !pose,
          onclick: () => moteur.passerHumain(j.id),
        }, `Passer (${t.libPasser})`),
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

      h('div.mini', { style: { marginTop: '8px' }, class: j.fige ? 'etat-depart' : 'muted' },
        options ? 'Sans réponse de votre part, la meilleure combinaison est jouée d’office.'
          : j.fige ? 'Le lot part vers votre voisin…'
            : roule && !libres.length ? 'Les dés roulent…'
              : pose || libres.length < lot.des.length
                ? 'Cliquez un dé pour le relancer, même pendant qu’un autre tourne. '
                  + 'Les X sont figés, et toute combinaison servie part toute seule.'
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
            }, d.actionCible != null ? '✓ Main retirée' : `ESQUIVER ! (${toucheDe.get(cible.id).libPasser})`)
          : null,
      ),
      h('div.jauge-duel', h('div', { style: { width: '100%' } })),
    );
  }

  function peindreFin() {
    if (!partieArchivee) {
      partieArchivee = true;
      const r = moteur.resultat();
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
    siChange(couche, `fin-${moteur.vainqueur}`, () => {
      const eq = moteur.vainqueur ? COULEURS_EQUIPE[moteur.vainqueur] : null;
      return h('div.boite', { style: { borderColor: eq ? eq.hex : 'var(--bord)' } },
        h('div.gros', { style: { color: eq ? eq.hex : 'var(--encre)' } },
          eq ? `${eq.nom} — victoire !` : 'Fin de partie'),
        h('p.petit.muted',
          `${moteur.manche} manches · ${duree(moteur.now)} de jeu · graine ${moteur.graine}`),
        h('table.tbl', { style: { marginTop: '10px', textAlign: 'left' } },
          h('thead', h('tr',
            h('th', 'Joueur'), h('th.num', 'Jetons'), h('th.num', 'Lancers'), h('th.num', 'Touchés'))),
          h('tbody', ...moteur.joueurs.map((j) => h('tr',
            h('td', h('span.badge', { class: `badge--${j.equipe}` }, j.nom)),
            h('td.num', j.stats.jetonsRetournes),
            h('td.num', j.stats.lancers),
            h('td.num', j.stats.collisionsReussies),
          ))),
        ),
        h('div.rangee', { style: { justifyContent: 'center', marginTop: '16px' } },
          h('button.btn.btn--primaire', { onclick: () => { moteur = null; aller('/'); } }, 'Nouvelle partie'),
          h('button.btn', { onclick: () => aller('/historique') }, 'Historique'),
        ),
      );
    });
  }

  peindre();
  return racine;
}
