// Math Lab expansion: deterministic seeded RNG (mulberry32, xmur3 string hashing).
// DOM-free; runs in browsers and Node.

function xmur3(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function seedOf(seed) {
  return typeof seed === "number" && Number.isFinite(seed) ? seed >>> 0 : xmur3(String(seed));
}

export class Rng {
  constructor(seed) {
    this.seed = seed;
    this.state = seedOf(seed) || 0x9e3779b9;
  }
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Integer in [lo, hi], inclusive. */
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  chance(p) { return this.next() < p; }
  pick(items) { return items[Math.floor(this.next() * items.length)]; }
  /** Weighted pick from [[item, weight], ...]. */
  weighted(pairs) {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [item, w] of pairs) { if ((r -= w) < 0) return item; }
    return pairs[pairs.length - 1][0];
  }
  shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** Distinct items, in random order. */
  sample(items, n) { return this.shuffle(items).slice(0, n); }
  /** Independent child stream; stable for a given label. */
  fork(label) { return new Rng(seedOf(`${this.state}:${label}`)); }
}
