/* Seeded RNG (mulberry32). No Math.random anywhere in generation. */
export function makeRng(seed) {
  let s = (Number(seed) >>> 0) || 0x9e3779b9;
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
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    shuffle(items) {
      const a = [...items];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    },
    sample(items, k) { return r.shuffle(items).slice(0, k); },
    weighted(pairs) { const total = pairs.reduce((s, [, w]) => s + w, 0); let x = next() * total; for (const [v, w] of pairs) { if ((x -= w) < 0) return v; } return pairs.at(-1)[0]; },
    seed: () => Math.floor(next() * 2 ** 31),
  };
  return r;
}
export function hashString(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
