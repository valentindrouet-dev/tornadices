// Sons de la table, synthétisés à la volée.
//
// Aucun fichier audio : tout est fabriqué au Web Audio, oscillateurs et bruit
// filtrés. Le site reste ce qu'il est — statique, sans dépendance, sans licence
// à traîner — et un son coûte zéro octet à télécharger.
//
// Chaque son est une fonction qui pose ses nœuds sur un contexte donné. La table
// lui passe le contexte vivant ; une épreuve peut lui passer un contexte hors
// ligne et mesurer ce qui en sort.

import { store } from './store.js?v=1.52';

export const SONS = ['reveil', 'endormi', 'vache', 'attrape'];

export const NOMS_SONS = {
  reveil: 'Réveil — la sonnerie',
  endormi: 'Endormissement — le ronflement',
  vache: 'Abri — le meuglement',
  attrape: 'Attrape — l’alarme',
};

// ── Briques ───────────────────────────────────────────────────────────────────

/** Un souffle blanc d'une seconde, fabriqué une fois par contexte. */
const souffles = new WeakMap();
function souffle(ctx) {
  let buf = souffles.get(ctx);
  if (buf) return buf;
  buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let dernier = 0;
  for (let i = 0; i < d.length; i++) {
    // Bruit brun : plus sourd que le blanc, plus proche d'un souffle.
    dernier = (dernier + (Math.random() * 2 - 1) * 0.08) * 0.985;
    d[i] = dernier * 3.2;
  }
  souffles.set(ctx, buf);
  return buf;
}

/**
 * Une note : un oscillateur, une enveloppe, et de quoi la faire glisser.
 * `points` donne la trajectoire de hauteur — [[instant, hertz], …].
 */
function note(ctx, sortie, {
  type = 'sine', points, t0, duree, gain = 0.2,
  attaque = 0.01, chute = 0.08, filtre = null,
}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(points[0][1], t0);
  for (const [dt, hz] of points.slice(1)) {
    o.frequency.exponentialRampToValueAtTime(Math.max(20, hz), t0 + dt);
  }

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attaque);
  g.gain.setValueAtTime(gain, t0 + Math.max(attaque, duree - chute));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);

  let fin = g;
  if (filtre) {
    const f = ctx.createBiquadFilter();
    f.type = filtre.type || 'lowpass';
    f.Q.value = filtre.q ?? 1;
    f.frequency.setValueAtTime(filtre.points[0][1], t0);
    for (const [dt, hz] of filtre.points.slice(1)) {
      f.frequency.exponentialRampToValueAtTime(Math.max(30, hz), t0 + dt);
    }
    g.connect(f);
    fin = f;
  }
  fin.connect(sortie);
  o.connect(g);
  o.start(t0);
  o.stop(t0 + duree + 0.05);
  return o;
}

/** Un souffle filtré, pour tout ce qui est air : ronflement, sifflement. */
function bruit(ctx, sortie, { t0, duree, gain = 0.2, coupure = 700, q = 1, enveloppe = null }) {
  const s = ctx.createBufferSource();
  s.buffer = souffle(ctx);
  s.loop = true;

  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = coupure;
  f.Q.value = q;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  if (enveloppe) {
    for (const [dt, v] of enveloppe) {
      g.gain.linearRampToValueAtTime(Math.max(0.0001, v * gain), t0 + dt);
    }
  } else {
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
  }

  s.connect(f); f.connect(g); g.connect(sortie);
  s.start(t0);
  s.stop(t0 + duree + 0.05);
  return s;
}

// ── Les quatre sons ───────────────────────────────────────────────────────────

const RECETTES = {
  // Le réveil à deux marteaux : deux cloches aiguës qui se répondent vite, et
  // s'éteignent ensemble. C'est le battement qui fait reconnaître la sonnerie,
  // pas la hauteur.
  reveil(ctx, sortie, t0) {
    const coup = 0.052;
    for (let i = 0; i < 14; i++) {
      const t = t0 + i * coup;
      const hz = i % 2 === 0 ? 1720 : 2130;
      const declin = 1 - (i / 16);
      note(ctx, sortie, {
        type: 'triangle', points: [[0, hz], [coup, hz * 0.995]],
        t0: t, duree: coup * 0.92, gain: 0.26 * declin, attaque: 0.004, chute: 0.03,
      });
      note(ctx, sortie, {
        type: 'square', points: [[0, hz * 2.01], [coup, hz * 2]],
        t0: t, duree: coup * 0.7, gain: 0.045 * declin, attaque: 0.003, chute: 0.02,
      });
    }
    return 14 * coup + 0.1;
  },

  // Le ronflement : une longue inspiration qui râcle, un temps, puis une
  // expiration plus courte et plus douce. Le râle vient d'une scie très grave
  // sous un souffle passé au grave.
  endormi(ctx, sortie, t0) {
    // Inspiration.
    bruit(ctx, sortie, {
      t0, duree: 0.62, gain: 0.13, coupure: 430, q: 2.5,
      enveloppe: [[0.05, 0.15], [0.34, 1], [0.55, 0.75], [0.62, 0]],
    });
    note(ctx, sortie, {
      type: 'sawtooth', points: [[0, 62], [0.34, 88], [0.62, 70]],
      t0, duree: 0.62, gain: 0.055, attaque: 0.07, chute: 0.16,
      filtre: { type: 'lowpass', q: 6, points: [[0, 220], [0.34, 620], [0.62, 260]] },
    });
    // Expiration, plus loin et plus molle.
    const t1 = t0 + 0.78;
    bruit(ctx, sortie, {
      t0: t1, duree: 0.42, gain: 0.075, coupure: 330, q: 1.5,
      enveloppe: [[0.06, 1], [0.42, 0]],
    });
    note(ctx, sortie, {
      type: 'sawtooth', points: [[0, 74], [0.42, 52]],
      t0: t1, duree: 0.42, gain: 0.028, attaque: 0.05, chute: 0.2,
      filtre: { type: 'lowpass', q: 4, points: [[0, 380], [0.42, 180]] },
    });
    return 1.28;
  },

  // Le meuglement : une scie grave qui monte puis retombe, sous un filtre qui
  // s'ouvre et se referme — c'est l'ouverture de la bouche qui fait le « eu »
  // entre les deux « m ».
  vache(ctx, sortie, t0) {
    const d = 1.05;
    note(ctx, sortie, {
      type: 'sawtooth',
      points: [[0, 124], [0.20, 168], [0.52, 158], [d, 96]],
      t0, duree: d, gain: 0.15, attaque: 0.11, chute: 0.30,
      filtre: { type: 'lowpass', q: 7, points: [[0, 340], [0.26, 1500], [0.62, 1150], [d, 300]] },
    });
    // Une octave dessous, pour le coffre.
    note(ctx, sortie, {
      type: 'sine',
      points: [[0, 62], [0.20, 84], [0.52, 79], [d, 48]],
      t0, duree: d, gain: 0.07, attaque: 0.12, chute: 0.32,
    });
    // Le souffle de la bête, juste derrière.
    bruit(ctx, sortie, {
      t0, duree: d, gain: 0.030, coupure: 900, q: 0.8,
      enveloppe: [[0.15, 0.5], [0.45, 1], [d, 0]],
    });
    return d + 0.1;
  },

  // L'alarme : deux tons qui alternent, secs et pressants. On n'a pas besoin de
  // comprendre, on a besoin de lever la tête.
  attrape(ctx, sortie, t0) {
    const pas = 0.135;
    for (let i = 0; i < 6; i++) {
      const hz = i % 2 === 0 ? 990 : 1320;
      note(ctx, sortie, {
        type: 'square', points: [[0, hz], [pas * 0.9, hz]],
        t0: t0 + i * pas, duree: pas * 0.86, gain: 0.13,
        attaque: 0.008, chute: 0.03,
        filtre: { type: 'lowpass', q: 1, points: [[0, 3200], [pas, 2600]] },
      });
      note(ctx, sortie, {
        type: 'sawtooth', points: [[0, hz / 2], [pas * 0.9, hz / 2]],
        t0: t0 + i * pas, duree: pas * 0.86, gain: 0.065, attaque: 0.008, chute: 0.03,
      });
    }
    return 6 * pas + 0.1;
  },
};

/**
 * Pose un son sur un contexte, à l'instant voulu. Renvoie sa durée.
 * Utilisable sur un contexte hors ligne : c'est ainsi qu'on l'éprouve.
 */
export function rendreSon(ctx, nom, sortie = null, t0 = 0) {
  const recette = RECETTES[nom];
  if (!recette) return 0;
  return recette(ctx, sortie || ctx.destination, t0);
}

// ── Le contexte vivant ────────────────────────────────────────────────────────

let ctx = null;
let maitre = null;

export function sonsActifs() { return store.get('sons', true) !== false; }
export function volumeSons() {
  const v = Number(store.get('volumeSons', 0.7));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.7;
}
export function reglerSons(actifs) { store.set('sons', !!actifs); }
export function reglerVolume(v) {
  store.set('volumeSons', Math.min(1, Math.max(0, Number(v) || 0)));
  if (maitre) maitre.gain.value = volumeSons();
}

/**
 * Ouvre le contexte audio. Les navigateurs le refusent tant que l'on n'a rien
 * cliqué : on l'appelle donc depuis un geste — le bouton qui lance la partie,
 * ou la première touche.
 */
export function eveillerSons() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    maitre = ctx.createGain();
    maitre.gain.value = volumeSons();
    maitre.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Joue un son, si le joueur les a laissés allumés. */
export function jouerSon(nom) {
  if (!sonsActifs()) return;
  const c = eveillerSons();
  if (!c || c.state !== 'running') return;
  maitre.gain.value = volumeSons();
  try {
    rendreSon(c, nom, maitre, c.currentTime + 0.02);
  } catch {
    // Un son qui ne sort pas ne doit jamais interrompre une partie.
  }
}
