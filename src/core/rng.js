// Générateur pseudo-aléatoire déterministe : une graine => une partie reproductible.

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function makeRng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
  if (a === 0) a = 0x9e3779b9;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (n) => Math.floor(rng() * n);
  rng.range = (lo, hi) => lo + rng() * (hi - lo);
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  // Loi normale tronquée, pour les temps de réaction.
  rng.normal = (mean, sd, min = 0) => {
    const u = Math.max(1e-9, rng());
    const v = rng();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(min, mean + z * sd);
  };
  return rng;
}

export function randomSeed() {
  const mots = [
    'tornade', 'vache', 'cloche', 'orage', 'grange', 'prairie', 'foin',
    'nuage', 'bourrasque', 'meuh', 'sieste', 'ouragan', 'zephyr', 'troupeau',
  ];
  const m = mots[Math.floor(Math.random() * mots.length)];
  return `${m}-${Math.floor(1000 + Math.random() * 9000)}`;
}
