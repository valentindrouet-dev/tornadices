// Laboratoire d'équilibrage : des milliers de parties jouées par le moteur de
// la table, avec les règles du réglage actif, et ce qu'on peut en conclure.

import { h, remplacer, pourcent, nombre, dureeLongue, telecharger } from './dom.js?v=2.05';
import { emblemeEquipe, suiteSymboles } from './icons.js?v=2.05';
import { store } from './store.js?v=2.05';
import { aller } from './app.js?v=2.05';
import { randomSeed, makeRng } from '../core/rng.js?v=2.05';
import { creerCampagne, SCHEMA_RESULTAT } from '../core/sim.js?v=2.05';
import { probaLancerUnique, courseAvecGarde, loiDuDe } from '../core/proba.js?v=2.05';
import {
  EQUIPES, PROFILS_IA, CARTES_PAR_ID, SYMBOLES, ORDRE_SYMBOLES, configDepuis, placement, requisCarte,
  tailleRequis,
} from '../core/config.js?v=2.05';
import { barreProfils, reglagesCourants, nomActif } from './profils.js?v=2.05';
import { nombresJoueursPermis, joueursDansBornes, nomParDefaut, ecartsAuxOfficielles } from './reglages.js?v=2.05';

const PARTIES = [200, 1000, 5000, 20000];
const etat = { onglet: 'simulation', enCours: null };

function params() {
  const p = store.get('labo', {});
  const nb = joueursDansBornes(p.nb ?? 6);
  return {
    nb,
    parties: Math.min(100000, Math.max(10, Math.round(Number(p.parties)) || 1000)),
    graine: p.graine || 'labo-1',
    nouvelleGraine: p.nouvelleGraine !== false,
    profils: Array.from({ length: nb }, (_, i) => (PROFILS_IA[(p.profils || [])[i]] ? p.profils[i] : 'equilibre')),
  };
}
const ecrireParams = (modif) => store.set('labo', { ...params(), ...modif });

function resultatGarde() {
  const g = store.get('laboResultat', null);
  return g && g.resultat && g.resultat.schema === SCHEMA_RESULTAT ? g : null;
}

const stat = (valeur, libelle, sous) => h('div.stat', h('div.lib', libelle), h('div.val', valeur), sous ? h('div.sous', sous) : null);
const pts = (x) => `${nombre(x * 100, 1).replace('.', ',')}`;
const part = (w) => `${pts(w.part)} %`;
const intervalle = (w) => `${pts(w.bas)} – ${pts(w.haut)} %`;

export function vueLabo() {
  const racine = h('div.page.page--large');

  function dessiner() {
    remplacer(racine,
      h('div.rangee', { style: { margin: '6px 0 14px' } },
        h('h1', 'Laboratoire d’équilibrage'),
        h('div.pousse'),
        h('div.onglets', { style: { margin: 0 } },
          ...[['simulation', 'Simulation'], ['probas', 'Probabilités']].map(([id, lib]) => h('button', {
            class: etat.onglet === id ? 'on' : '', onclick: () => { etat.onglet = id; dessiner(); },
          }, lib))),
      ),
      barreProfils(dessiner, noteRegles()),
      etat.onglet === 'simulation' ? ongletSimulation() : ongletProbas(),
    );
  }

  function noteRegles() {
    const p = params();
    const ecarts = ecartsAuxOfficielles(p.nb);
    return h('div.mini.muted.note-profil',
      `Les campagnes jouent « ${nomActif()} », le réglage de la page Réglages`,
      ecarts.length ? ` — ${ecarts.length} écart${ecarts.length > 1 ? 's' : ''} aux Règles officielles à ${p.nb} joueurs. ` : '. ',
      h('button.lien', { onclick: () => aller('/reglages') }, 'Modifier les règles'));
  }

  // ── Simulation ─────────────────────────────────────────────────────────────
  function lancer() {
    let p = params();
    if (p.nouvelleGraine && resultatGarde()) { ecrireParams({ graine: randomSeed() }); p = params(); }
    const cfg = configDepuis(reglagesCourants(), p.nb);
    const spec = p.profils.map((profil, i) => ({ nom: nomParDefaut(i), type: 'ia', profil }));
    const campagne = creerCampagne(cfg, spec, p.graine);
    const course = { campagne, total: p.parties, arret: false };
    etat.enCours = course;
    dessiner();
    // Par tranches de 40 ms : la page reste vivante et la barre avance. Le
    // résultat ne dépend pas du découpage.
    const tranche = () => {
      if (etat.enCours !== course) return;
      const t0 = performance.now();
      while (!course.arret && campagne.fait < course.total && performance.now() - t0 < 40) {
        campagne.jouer(Math.min(5, course.total - campagne.fait));
      }
      if (!course.arret && campagne.fait < course.total) {
        const barre = racine.querySelector('.jauge-progres > div');
        const texte = racine.querySelector('.progres-texte');
        if (barre) barre.style.width = `${(campagne.fait / course.total) * 100}%`;
        if (texte) texte.textContent = `${campagne.fait} / ${course.total} parties`;
        setTimeout(tranche, 0);
        return;
      }
      etat.enCours = null;
      if (campagne.fait) {
        store.set('laboResultat', {
          resultat: campagne.resultat(), reglage: nomActif(), profils: p.profils, interrompue: course.arret,
        });
      }
      if (document.body.contains(racine)) dessiner();
    };
    setTimeout(tranche, 0);
  }

  function panneauCampagne() {
    const p = params();
    const cfg = configDepuis(reglagesCourants(), p.nb);
    const sieges = placement(p.nb);
    const optionsProfil = (choisi) => Object.values(PROFILS_IA).map((x) => h('option', { value: x.id, selected: x.id === choisi }, x.nom));
    const tous = p.profils.every((x) => x === p.profils[0]) ? p.profils[0] : '';
    return h('div.carte',
      h('div.titre-section', 'Campagne'),
      h('div.rangee',
        h('span.petit', 'Joueurs'),
        h('div.segment', ...nombresJoueursPermis().map((n) => h('button', {
          class: n === p.nb ? 'on' : '', onclick: () => { ecrireParams({ nb: n }); dessiner(); },
        }, String(n)))),
      ),
      h('p.mini.muted', { style: { margin: '8px 0 12px' } },
        `${cfg.lots} lots de ${cfg.desParLot} dés · ${cfg.jetons} Jetons Équipe par équipe`
        + (p.nb % 2 && cfg.jetonsVert !== cfg.jetons ? ` (Cow-boy : ${cfg.jetonsVert}) · ` : ' · ')
        + `${cfg.cartesPourGagner} cartes pour gagner`
        + (p.nb % 2 && cfg.cartesVert !== cfg.cartesPourGagner ? ` (Cow-boy : ${cfg.cartesVert})` : '')
        + ` · ${cfg.cartes.length} cartes dans la pioche`),
      h('div.rangee.rangee--serree', { style: { marginBottom: '6px' } },
        h('span.petit', { style: { flex: '1' } }, 'Caractère des IA'),
        h('select', {
          title: 'Donner le même caractère à toutes les places',
          onchange: (e) => { if (e.target.value) { ecrireParams({ profils: p.profils.map(() => e.target.value) }); dessiner(); } },
        }, h('option', { value: '', selected: !tous }, 'Tous : …'), ...optionsProfil(tous))),
      h('div.places-labo', ...p.profils.map((profil, i) => h('label.place-labo',
        emblemeEquipe(EQUIPES[sieges[i]].embleme, 20),
        h('span', nomParDefaut(i)),
        h('select', {
          title: PROFILS_IA[profil].desc,
          onchange: (e) => { ecrireParams({ profils: p.profils.map((x, k) => (k === i ? e.target.value : x)) }); dessiner(); },
        }, ...optionsProfil(profil))))),
      h('div.rangee', { style: { marginTop: '14px' } },
        h('span.petit', 'Parties'),
        h('div.segment', ...PARTIES.map((n) => h('button', {
          class: n === p.parties ? 'on' : '', onclick: () => { ecrireParams({ parties: n }); dessiner(); },
        }, n >= 1000 ? `${n / 1000} k` : String(n)))),
        h('input', {
          type: 'number', min: 10, max: 100000, step: 10, value: p.parties, style: { width: '92px' },
          onchange: (e) => { ecrireParams({ parties: Number(e.target.value) }); dessiner(); },
        }),
      ),
      h('div.rangee', { style: { marginTop: '10px' } },
        h('span.petit', 'Graine'),
        h('input', {
          type: 'text', value: p.graine, style: { flex: '1 1 120px' },
          onchange: (e) => { ecrireParams({ graine: e.target.value.trim() || randomSeed() }); dessiner(); },
        }),
        h('label.champ-ligne', { title: 'Décoché, la même campagne se rejoue à l’identique : utile pour comparer deux réglages sur les mêmes tirages' },
          h('input', {
            type: 'checkbox', checked: p.nouvelleGraine,
            onchange: (e) => { ecrireParams({ nouvelleGraine: e.target.checked }); dessiner(); },
          }), 'nouvelle à chaque campagne'),
      ),
      etat.enCours
        ? h('div', { style: { marginTop: '16px' } },
            h('div.jauge-progres', h('div', { style: { width: '0%' } })),
            h('div.rangee', { style: { marginTop: '8px' } },
              h('span.mini.muted.progres-texte', `0 / ${etat.enCours.total} parties`),
              h('div.pousse'),
              h('button.btn.btn--petit', { onclick: () => { etat.enCours.arret = true; } }, 'Arrêter là')))
        : h('button.btn.btn--primaire', { style: { marginTop: '16px', width: '100%' }, onclick: lancer }, 'Lancer la campagne'),
    );
  }

  function ongletSimulation() {
    const garde = resultatGarde();
    return h('div.grille.grille--labo', { style: { marginTop: '16px' } },
      panneauCampagne(),
      garde ? resultats(garde) : h('div.carte', { style: { textAlign: 'center', padding: '48px 20px' } },
        h('h3', 'Aucune campagne pour l’instant'),
        h('p.muted', 'Chaque partie simulée est jouée par le même moteur que la table, dé par dé, avec les règles du réglage actif.')),
    );
  }

  function resultats(garde) {
    const r = garde.resultat;
    const n = r.nbParties;
    const autres = n - r.parts.reduce((s, x) => s + x.n, 0);
    // Pour ± 1 point, il faut (marge / 1 pt)² fois plus de parties.
    const pourUnPoint = Math.ceil((n * (r.marge / 0.01) ** 2) / 100) * 100;
    const gardeFous = Object.entries(r.raisons).filter(([k]) => k !== 'cartes');
    const nomRaison = { pioche: 'pioche épuisée', manchesMax: 'manches maximum', limite: 'limite du moteur' };
    const deuxEquipes = r.parts.length === 2;
    const ecartNet = deuxEquipes && (r.parts[0].bas > 0.5 || r.parts[0].haut < 0.5);
    const profilsVus = r.parProfil.length > 1;

    return h('div.pile',
      h('div.grille.grille--stats.grille--stats-labo',
        stat(String(n), 'parties', `« ${garde.reglage} » · graine ${r.graine} · ${nombre(r.calculMs / 1000, 1)} s`),
        stat(`± ${pts(r.marge)} pt`, 'marge d’erreur à 95 %', r.marge > 0.0105 ? `± 1 pt vers ${pourUnPoint} parties` : 'résultat fin'),
        stat(dureeLongue(r.duree.moyenneMs), 'durée d’une partie', `8 sur 10 entre ${dureeLongue(r.duree.p10Ms)} et ${dureeLongue(r.duree.p90Ms)}`),
        stat(dureeLongue(r.dureeManche.moyenneMs), 'durée d’une manche', `médiane ${dureeLongue(r.dureeManche.medianeMs)}`),
        stat(nombre(r.manches.moyenne, 1), 'manches par partie', `de ${r.manches.min} à ${r.manches.max}`),
        stat(nombre(r.totaux.poussesParPartie, 1), 'tourbillons par partie', `${nombre(r.totaux.lancersParPartie, 0)} lancers`),
      ),
      garde.interrompue || gardeFous.length
        ? h('div.encart.encart--info',
            garde.interrompue ? `Campagne arrêtée en route : ${n} parties jouées. ` : '',
            gardeFous.length
              ? `${pourcent(1 - r.concluantes)} des parties ne vont pas jusqu’aux cartes demandées (`
                + gardeFous.map(([k, v]) => `${nomRaison[k] || k} : ${v}`).join(', ')
                + ') — l’équipe en tête est alors déclarée gagnante.'
              : '')
        : null,

      h('div.carte',
        h('div.titre-section', 'Victoires par équipe'),
        ...r.parts.slice().sort((a, b) => b.part - a.part).map((w) => {
          const c = EQUIPES[w.equipe];
          return h('div', { style: { marginBottom: '10px' } },
            h('div.rangee', { style: { justifyContent: 'space-between', marginBottom: '4px' } },
              h('strong.rangee.rangee--serree', emblemeEquipe(c.embleme, 22), c.animal),
              h('span.petit', h('strong', part(w)), h('span.muted', ` · entre ${intervalle(w)} · ${w.n} parties`))),
            h('div.barre-fond.barre-ic',
              h('div', { style: { width: `${w.part * 100}%`, background: c.hex } }),
              // La bande : là où se trouve la vraie part, 95 fois sur 100.
              h('span.ic', { style: { left: `${w.bas * 100}%`, width: `${(w.haut - w.bas) * 100}%` } })));
        }),
        autres ? h('p.mini.muted', `${autres} partie${autres > 1 ? 's' : ''} sans vainqueur (égalité à l’arrêt).`) : null,
        h('p.mini', { style: { marginTop: '8px' } },
          deuxEquipes
            ? (ecartNet
              ? h('strong', 'L’écart entre les deux équipes est réel : 50 % est hors de l’intervalle.')
              : 'Aucun écart démontré entre les deux équipes : 50 % est dans l’intervalle.')
            : 'Le Cow-boy joue seul contre deux équipes : sa part se règle avec ses cartes à gagner.'),
      ),

      h('div.grille.grille--2',
        h('div.carte',
          h('div.titre-section', 'Ce qui pèse sur l’équilibre'),
          h('table.tbl', h('tbody',
            h('tr', h('td', 'Manches gagnées par l’équipe qui reçoit les dés'),
              h('td.num', h('strong', part(r.des)), h('div.mini.muted', intervalle(r.des)))),
            h('tr', h('td', 'Parties gagnées par l’équipe qui prend la première carte'),
              h('td.num', h('strong', part(r.premierGain)), h('div.mini.muted', intervalle(r.premierGain)))),
            ...r.combos.map((c) => h('tr', h('td', `${c.nom} — par manche`), h('td.num', h('strong', nombre(c.parManche, 2))))),
            h('tr', h('td', 'Joueurs endormis par manche'), h('td.num', h('strong', nombre(r.totaux.endormis / (r.totaux.manches || 1), 2)))),
          )),
        ),
        h('div.carte',
          h('div.titre-section', 'Durée des parties (minutes) · manches par partie'),
          histogramme(r.duree.histogramme),
          h('div', { style: { height: '14px' } }),
          histogrammeEntier(r.manches.histogramme),
        ),
      ),

      h('div.carte',
        h('div.titre-section', 'Par place'),
        h('div.tbl-defile', h('table.tbl',
          h('thead', h('tr', h('th', 'Place'), h('th', 'IA'), h('th.num', 'Victoires'), h('th.num', 'Lancers'),
            h('th.num', 'Réveils'), h('th.num', 'Abris'), h('th.num', 'Endormi'), h('th.num', 'Tourbillons'))),
          h('tbody', ...r.parSiege.map((s) => h('tr',
            h('td', h('span.rangee.rangee--serree', emblemeEquipe(EQUIPES[s.equipe].embleme, 18), nomParDefaut(s.siege))),
            h('td.mini', (PROFILS_IA[s.profil] || {}).nom || s.profil),
            h('td.num', part(s)),
            ...['lancers', 'reveils', 'abris', 'endormi', 'pousses'].map((k) => h('td.num', nombre(s[k] / n, 1)))))))),
        h('p.mini.muted', { style: { marginTop: '6px' } }, 'Moyennes par partie.'),
        profilsVus ? h('div', { style: { marginTop: '12px' } },
          h('div.titre-section', 'Par caractère d’IA'),
          h('table.tbl', h('tbody', ...r.parProfil.map((x) => h('tr',
            h('td', (PROFILS_IA[x.profil] || {}).nom || x.profil),
            h('td.num', h('strong', part(x)), h('span.mini.muted', ` de victoires · ${intervalle(x)}`)),
            h('td.num', `${nombre(x.abris / x.parties, 2)} Abris par partie`)))))) : null,
      ),

      h('div.carte',
        h('div.titre-section', 'Par carte Tornade'),
        h('div.tbl-defile', h('table.tbl',
          h('thead', h('tr', h('th', 'Carte'), h('th.num', 'Manches'), h('th.num', 'Durée moyenne'),
            ...r.parts.map((w) => h('th.num', EQUIPES[w.equipe].animal)), h('th.num', 'Sa combinaison'))),
          h('tbody', ...r.parCarte.map((c) => h('tr',
            h('td', c.nom),
            h('td.num', c.jouee),
            h('td.num', dureeLongue(c.dureeTotale / c.jouee)),
            ...r.parts.map((w) => h('td.num', pourcent((c.vainqueurs[w.equipe] || 0) / c.jouee, 0))),
            h('td.num', CARTES_PAR_ID[c.id] && CARTES_PAR_ID[c.id].combo
              ? `${pourcent(c.manchesRealisee / c.jouee, 0)} des manches` : h('span.muted', '—'))))))),
        h('p.mini.muted', { style: { marginTop: '6px' } },
          'Part des manches gagnées par chaque équipe sous cette carte. Sous 300 manches, lisez ces parts à ± 6 points près.'),
      ),
      h('div.rangee', h('div.pousse'),
        h('button.btn.btn--petit', { onclick: () => telecharger('tornadice-campagne.csv', campagneCSV(garde)) }, 'Exporter en CSV')),
    );
  }

  // ── Probabilités ───────────────────────────────────────────────────────────
  function ongletProbas() {
    const p = params();
    const cfg = configDepuis(reglagesCourants(), p.nb);
    const loi = loiDuDe(cfg.faces);
    const envol = cfg.combos.find((c) => c.id === 'envol');
    const seuil = envol.requis.tornade || 99;
    const lignes = [
      ...cfg.combos.map((c) => ({ ...c, source: 'role' })),
      ...cfg.cartes.map((id) => CARTES_PAR_ID[id]).filter((c) => c.combo)
        .map((c) => ({ id: c.id, nom: c.nom, requis: requisCarte(cfg, c), etat: 'tous', source: 'carte' })),
    ];
    const rng = makeRng('probas');
    return h('div.pile', { style: { marginTop: '16px' } },
      h('div.carte',
        h('div.titre-section', `Le dé — ${cfg.desParLot} dés par lot`),
        h('div.rangee', ...ORDRE_SYMBOLES.filter((s) => loi[s]).map((s) => h('span.rangee.rangee--serree',
          suiteSymboles({ [s]: 1 }, 26), h('strong', SYMBOLES[s].nom), h('span.muted', `${Math.round(loi[s] * cfg.faces.length)} face${loi[s] * cfg.faces.length > 1 ? 's' : ''} sur ${cfg.faces.length} · ${pourcent(loi[s])}`)))),
      ),
      h('div.carte',
        h('div.titre-section', 'Combinaisons'),
        h('div.tbl-defile', h('table.tbl',
          h('thead', h('tr', h('th', 'Combinaison'), h('th', 'Dés'), h('th.num', 'Au premier lancer'),
            h('th.num', 'Avant de perdre le lot'), h('th.num', 'Lancers pour y arriver'))),
          h('tbody', ...lignes.map((l) => {
            const possible = tailleRequis(l.requis) <= cfg.desParLot;
            const premier = possible ? probaLancerUnique(cfg.faces, cfg.desParLot, l.requis) : 0;
            // On garde les bons dés, comme à la table ; le lot se perd sur un
            // Envol ou sur une autre combinaison du même état, jouée d'office.
            const rivales = cfg.combos.filter((c) => c.id !== l.id && c.id !== 'envol'
              && l.etat !== 'tous' && (c.etat === l.etat || c.etat === 'tous'));
            const course = possible && l.id !== 'envol'
              ? courseAvecGarde(cfg.faces, cfg.desParLot, l.requis,
                  { seuilBloquant: seuil, arretsForces: rivales, prioritaire: l.source === 'carte' }, 20000, rng)
              : null;
            return h('tr',
              h('td', h('strong', l.nom), l.source === 'carte' ? h('span.mini.muted', ' carte') : null),
              h('td', h('span.rangee.rangee--serree', suiteSymboles(l.requis, 18))),
              h('td.num', possible ? pourcent(premier) : 'impossible'),
              h('td.num', course ? pourcent(course.reussite, 0) : h('span.muted', '—')),
              h('td.num', course && course.reussite ? nombre(course.lancersSiReussite, 1) : h('span.muted', '—')));
          })))),
        h('p.mini.muted', { style: { marginTop: '8px' } },
          '« Au premier lancer » est un calcul exact. « Avant de perdre le lot » suppose qu’on garde les dés utiles et qu’on relance '
          + 'les autres, sans être poussé par un voisin : c’est une estimation sur 20 000 tirages, à ± 1 point.'),
      ),
    );
  }

  dessiner();
  return racine;
}

function histogramme(classes) {
  if (!classes.length) return h('p.petit.muted', '—');
  const max = Math.max(...classes.map((c) => c.n));
  return h('div',
    h('div.histo', ...classes.map((c) => h('div.col', {
      style: { height: `${max ? (c.n / max) * 100 : 0}%` },
      title: `${nombre(c.min, 1)} – ${nombre(c.max, 1)} min : ${c.n} parties`,
    }))),
    h('div.histo-legende', h('span', `${nombre(classes[0].min, 1)} min`), h('span', `${nombre(classes[classes.length - 1].max, 1)} min`)));
}

function histogrammeEntier(classes) {
  if (!classes.length) return h('p.petit.muted', '—');
  const max = Math.max(...classes.map((c) => c.n));
  return h('div',
    h('div.histo', ...classes.map((c) => h('div.col', {
      style: { height: `${(c.n / max) * 100}%` }, title: `${c.valeur} manches : ${c.n} parties`,
    }, h('span', String(c.valeur))))),
    h('div.histo-legende', h('span', 'manches'), h('span', '')));
}

function campagneCSV(garde) {
  const r = garde.resultat;
  const fr = (x) => String(Math.round(x * 10000) / 10000).replace('.', ',');
  const lignes = [
    `reglage;${garde.reglage}`, `joueurs;${r.table.nbJoueurs}`, `parties;${r.nbParties}`, `graine;${r.graine}`,
    `marge_95;${fr(r.marge)}`, '', 'equipe;victoires;part;bas_95;haut_95',
    ...r.parts.map((w) => [w.equipe, w.n, fr(w.part), fr(w.bas), fr(w.haut)].join(';')),
    '', `duree_moyenne_s;${Math.round(r.duree.moyenneMs / 1000)}`, `duree_mediane_s;${Math.round(r.duree.medianeMs / 1000)}`,
    `manches_moyenne;${fr(r.manches.moyenne)}`, `avantage_des;${fr(r.des.part)}`, `premiere_carte;${fr(r.premierGain.part)}`,
    '', 'place;equipe;profil;victoires;lancers;reveils;abris;endormi;tourbillons',
    ...r.parSiege.map((s) => [s.siege + 1, s.equipe, s.profil, s.victoires, s.lancers, s.reveils, s.abris, s.endormi, s.pousses].join(';')),
    '', 'carte;manches;duree_moyenne_s;combinaison_sortie;' + r.parts.map((w) => w.equipe).join(';'),
    ...r.parCarte.map((c) => [c.nom, c.jouee, Math.round(c.dureeTotale / c.jouee / 1000), c.manchesRealisee,
      ...r.parts.map((w) => c.vainqueurs[w.equipe] || 0)].join(';')),
  ];
  return lignes.join('\n');
}
