// Table de jeu en temps réel.
//
// Le moteur avance à l'horloge du navigateur. L'affichage est repeint à chaque
// image, mais chaque bloc ne se reconstruit que si son contenu a changé : sans
// cela les boutons seraient remplacés entre l'appui et le relâchement du clic.

import { h, remplacer, duree, vider } from './dom.js';
import {
  faceDe, suiteSymboles, SVG_TORNADE_EVEILLEE, SVG_TORNADE_ENDORMIE, SVG_SYMBOLE,
} from './icons.js';
import { Moteur } from '../core/engine.js';
import { COULEURS_EQUIPE } from '../core/config.js';
import { ajouterHistorique } from './store.js';
import { aller } from './app.js';

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
  const zoneTable = h('div.table-zone', h('div.tapis'));
  const elSieges = moteur.joueurs.map((j) => {
    const el = h('div.siege', { class: `equipe-${j.equipe}${j.type === 'humain' ? ' siege--humain' : ''}` });
    zoneTable.appendChild(el);
    return el;
  });
  const elCentre = h('div.centre-table');
  zoneTable.appendChild(elCentre);

  const n = moteur.joueurs.length;
  elSieges.forEach((el, i) => {
    const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    el.style.left = `${50 + 40 * Math.cos(a)}%`;
    el.style.top = `${50 + 38 * Math.sin(a)}%`;
  });

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
              : null,
            c.obligatoire
              ? h('span', { style: { color: 'var(--rouge)', fontWeight: '800' } }, ' · obligatoire')
              : null),
        )),
      ),
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
      if (!j.attente) continue;
      const t = toucheDe.get(j.id);
      if (ev.code === t.lancer) { moteur.actionHumaine(j.id, { type: 'lancer' }); ev.preventDefault(); return; }
      if (ev.code === t.passer && j.attente.peutPasser) {
        moteur.actionHumaine(j.id, { type: 'passer' }); ev.preventDefault(); return;
      }
      const k = Number(ev.key);
      if (k >= 1 && k <= 9 && j.attente.combos[k - 1]) {
        moteur.actionHumaine(j.id, { type: 'combo', comboId: j.attente.combos[k - 1].id });
        ev.preventDefault(); return;
      }
    }
  }
  window.addEventListener('keydown', auClavier);

  const surveillant = new MutationObserver(() => {
    if (!document.body.contains(racine)) {
      actif = false;
      window.removeEventListener('keydown', auClavier);
      surveillant.disconnect();
    }
  });
  surveillant.observe(document.body, { childList: true, subtree: true });

  // ── Peinture ──────────────────────────────────────────────────────────────
  function peindre() {
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

      const des = lot && lot.lance ? lot.des.map((d) => `${d.sym}${d.verrou ? '*' : ''}`).join(',') : '';
      const sig = `${j.lots.length}|${j.eveille}|${des}`;
      siChange(el, sig, () => {
        const eq = COULEURS_EQUIPE[j.equipe];
        return [
          h('div.entete',
            h('span.puce', { style: { background: eq.hex } }),
            h('span', {
              style: { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            }, j.nom),
            j.lots.length > 1 ? h('span.badge-lots', `×${j.lots.length}`) : null,
          ),
          h('div.etat',
            h('span.tornade', {
              html: j.eveille ? SVG_TORNADE_EVEILLEE : SVG_TORNADE_ENDORMIE,
              style: { color: j.eveille ? eq.hex : 'var(--gris-clair)' },
            }),
            j.eveille ? 'éveillée' : 'endormie',
            j.type === 'humain' ? h('span.badge', { style: { marginLeft: 'auto' } }, 'vous') : null,
          ),
          h('div.des-mini',
            lot && lot.lance
              ? lot.des.map((d) => faceDe(d.sym, { verrou: d.verrou, taille: 'petit' }))
              : h('span.mini.muted', j.lots.length ? 'lot en main' : '—'),
          ),
        ];
      });
    });
  }

  function peindreCentre() {
    const jetons = Object.values(moteur.equipes)
      .map((e) => `${e.id}:${e.retournes}/${e.jetons}:${e.cartes.length}`).join('|');
    siChange(elCentre, `${moteur.carte?.id}|${jetons}`, () => [
      moteur.carte
        ? h('div.carte-journee',
            h('div.mini.muted', `Manche ${moteur.manche}`),
            h('div.nom-carte', moteur.carte.nom),
            h('div.texte-carte', moteur.carte.texte),
            moteur.carte.combo
              ? h('div.rangee.rangee--serree', {
                  style: { justifyContent: 'center', marginTop: '6px' },
                }, suiteSymboles(moteur.carte.combo.requis, 19))
              : null,
          )
        : null,
      h('div', { style: { marginTop: '12px', display: 'grid', gap: '7px' } },
        ...Object.values(moteur.equipes).map((e) => {
          const c = COULEURS_EQUIPE[e.id];
          return h('div', { class: `equipe-${e.id}` },
            h('div.mini', { style: { fontWeight: '800', color: c.hex } },
              `${c.nom} · ${e.cartes.length}/${moteur.cfg.cartesPourGagner} cartes`),
            h('div.suivi-jetons',
              ...Array.from({ length: e.jetons }, (_, k) => h('div', {
                class: `jeton${k < e.retournes ? ' on' : ''}`,
                html: k < e.retournes ? SVG_SYMBOLE.vache : '',
              })),
            ),
          );
        }),
      ),
    ]);
  }

  function peindreJournal() {
    if (moteur.journal.length === dernierJournal) return;
    dernierJournal = moteur.journal.length;
    vider(zoneJournal);
    for (const e of moteur.journal.slice(-60)) {
      zoneJournal.appendChild(h('div', { class: `ligne ligne--${e.type}` },
        h('span.t', duree(e.t)), e.texte));
    }
    zoneJournal.scrollTop = zoneJournal.scrollHeight;
  }

  function peindrePanneaux() {
    const actifs = humains.filter((j) => j.attente && j.lots.length);
    const sig = actifs.map((j) => {
      const lot = j.lots[0];
      const des = lot.lance ? lot.des.map((d) => `${d.sym}${d.verrou ? '*' : ''}`).join(',') : 'neuf';
      return `${j.id}:${j.lots.length}:${j.eveille}:${des}:${j.attente.combos.map((c) => c.id).join('+')}`;
    }).join('||');
    siChange(zonePanneaux, sig, () => actifs.map((j) => panneau(j)));
  }

  function panneau(j) {
    const t = toucheDe.get(j.id);
    const lot = j.lots[0];
    const eq = COULEURS_EQUIPE[j.equipe];
    return h('div.panneau-humain',
      h('div.rangee', { style: { marginBottom: '10px' } },
        h('span', {
          style: { width: '12px', height: '12px', borderRadius: '50%', background: eq.hex },
        }),
        h('strong', j.nom),
        h('span.petit.muted', j.eveille ? 'Tornade éveillée' : 'Tornade endormie'),
        j.lots.length > 1 ? h('span.badge', `${j.lots.length} lots en main`) : null,
        h('div', { style: { flex: '1' } }),
        h('span.mini.muted', `${t.libLancer} lancer · ${t.libPasser} passer · 1-9 combinaison`),
      ),
      h('div.rangee',
        h('div.rangee.rangee--serree',
          ...(lot.lance
            ? lot.des.map((d) => faceDe(d.sym, { verrou: d.verrou, taille: 'grand' }))
            : lot.des.map(() => faceDe(null, { taille: 'grand' }))),
        ),
        h('div', { style: { flex: '1' } }),
        h('button.btn.btn--primaire', {
          onclick: () => moteur.actionHumaine(j.id, { type: 'lancer' }),
        }, lot.lance ? `Relancer (${t.libLancer})` : `Lancer (${t.libLancer})`),
        h('button.btn', {
          disabled: !j.attente.peutPasser,
          onclick: () => moteur.actionHumaine(j.id, { type: 'passer' }),
        }, `Passer (${t.libPasser})`),
      ),
      j.attente.combos.length
        ? h('div.rangee', { style: { marginTop: '10px' } },
            ...j.attente.combos.map((c, i) => h('button', {
              class: `combo-btn${c.obligatoire ? ' combo-btn--obligatoire' : ''}`,
              onclick: () => moteur.actionHumaine(j.id, { type: 'combo', comboId: c.id }),
            },
              h('span.mini.muted', String(i + 1)),
              h('span', { style: { display: 'flex', gap: '2px' } }, suiteSymboles(c.combo.requis, 18)),
              nomCombo(c),
            )),
          )
        : h('div.mini.muted', { style: { marginTop: '8px' } },
            'Aucune combinaison — relancez ou passez le lot.'),
    );
  }

  function nomCombo(c) {
    if (c.source === 'journee') return moteur.carte.nom.replace(/^Journée /, '');
    const def = moteur.cfg.combos.find((x) => x.id === c.id);
    return def ? def.nom : c.id;
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
