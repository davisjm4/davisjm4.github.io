/* Deterministic seeded random source (mulberry32) for the compositional generator.
 * Every generated challenge is a pure function of (mode, difficulty, seed). */
export function makeRng(seed = 1) {
  let s = (seed >>> 0) || 0x9e3779b9;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (a) => a[Math.floor(next() * a.length)],
    chance: (p) => next() < p,
    shuffle(a) {
      const x = [...a];
      for (let i = x.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [x[i], x[j]] = [x[j], x[i]];
      }
      return x;
    },
    sample(a, n) { return r.shuffle(a).slice(0, n); },
    weighted(entries) { // [[value, weight], ...]
      const total = entries.reduce((s2, e) => s2 + e[1], 0);
      let x = next() * total;
      for (const [v, w] of entries) { if ((x -= w) < 0) return v; }
      return entries[entries.length - 1][0];
    },
    fork(salt) { return makeRng((Math.floor(next() * 4294967296) ^ hashString(String(salt))) >>> 0); },
  };
  return r;
}

/* Stable 32-bit FNV-1a hash, used for signatures and seed derivation. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
export function hashHex(str) {
  // two independent 32-bit hashes -> 16 hex digits (collision risk negligible at our scale)
  const a = hashString(str), b = hashString("~" + str + "#" + str.length);
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}
