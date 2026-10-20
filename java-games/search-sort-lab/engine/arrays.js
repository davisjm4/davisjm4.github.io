/* Procedural array generation: distributions, shapes, targets. */
import { randInt, pick, shuffle } from "./rng.js";

export function distinctValues(r, n, lo, hi) {
  const set = new Set();
  let guard = 0;
  while (set.size < n && guard++ < 5000) set.add(randInt(r, lo, hi));
  return [...set];
}
/* shape: random | sorted | reverse | nearly | partial | dups | dupsSorted */
export function makeArray(r, { n, lo = 1, hi = 60, shape = "random", dups = false, negatives = false }) {
  if (negatives) {
    lo = -Math.max(5, Math.floor(hi / 3));
  }
  let a;
  if (dups) {
    const pool = distinctValues(r, Math.max(2, Math.ceil(n * 0.6)), lo, hi);
    a = [];
    for (let i = 0; i < n; i++) a.push(i < pool.length ? pool[i] : pick(r, pool));
    a = shuffle(r, a);
    // ensure at least one duplicate
    if (new Set(a).size === a.length && n > 2) a[n - 1] = a[0];
  } else a = shuffle(r, distinctValues(r, n, lo, hi));
  const sortedAsc = [...a].sort((x, y) => x - y);
  switch (shape) {
    case "sorted":
      return sortedAsc;
    case "reverse":
      return sortedAsc.reverse();
    case "nearly": {
      const b = sortedAsc.slice();
      const swaps = Math.max(1, Math.floor(n / 6));
      for (let s = 0; s < swaps; s++) {
        const i = randInt(r, 0, n - 2);
        [b[i], b[i + 1]] = [b[i + 1], b[i]];
      }
      return b;
    }
    case "partial": {
      const k = Math.max(2, Math.floor(n / 2));
      return [...sortedAsc.slice(0, k), ...shuffle(r, sortedAsc.slice(k))];
    }
    default:
      return a;
  }
}
export function sortedArray(r, o) {
  return makeArray(r, { ...o, shape: "sorted" });
}
/* choose a search target. where: present | absent | first | last | middle | beforeAll | afterAll | gap */
export function chooseTarget(r, sorted, where) {
  const n = sorted.length;
  switch (where) {
    case "first": return sorted[0];
    case "last": return sorted[n - 1];
    case "middle": return sorted[Math.floor((n - 1) / 2)];
    case "present": return pick(r, sorted);
    case "beforeAll": return sorted[0] - randInt(r, 1, 5);
    case "afterAll": return sorted[n - 1] + randInt(r, 1, 5);
    case "gap": {
      for (let t = 0; t < 40; t++) {
        const i = randInt(r, 0, n - 2);
        if (sorted[i + 1] - sorted[i] > 1) return sorted[i] + randInt(r, 1, sorted[i + 1] - sorted[i] - 1);
      }
      return sorted[n - 1] + 1;
    }
    default: {
      // absent anywhere
      for (let t = 0; t < 60; t++) {
        const v = randInt(r, sorted[0] - 3, sorted[n - 1] + 3);
        if (!sorted.includes(v)) return v;
      }
      return sorted[n - 1] + 1;
    }
  }
}
export const fmt = (a) => "{" + a.join(", ") + "}";
