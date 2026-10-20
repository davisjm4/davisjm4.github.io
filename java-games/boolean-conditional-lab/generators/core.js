/* Shared deterministic helpers. No Math.random: every challenge is reproducible from its seed. */
export function makeRng(seed = 1) {
  // Same LCG as the original engine so the exported API keeps its behaviour.
  let s = (seed >>> 0) || 1; const start = s;
  const next = () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; };
  next.seed = start; return next;
}
export const pick = (a, rng) => a[Math.floor(rng() * a.length)];
export const int = (lo, hi, rng) => lo + Math.floor(rng() * (hi - lo + 1));
export const chance = (p, rng) => rng() < p;
export function shuffle(a, rng) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function sample(a, k, rng) { return shuffle(a, rng).slice(0, k); }
export function weighted(entries, rng) { const t = entries.reduce((s, [, w]) => s + w, 0); let r = rng() * t; for (const [v, w] of entries) { if ((r -= w) < 0) return v; } return entries[entries.length - 1][0]; }
export const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
export class Reject extends Error { constructor(why) { super(why); this.reject = true; if (globalThis.__rej) globalThis.__rej.set(why.replace(/[0-9]+/g,"#"), (globalThis.__rej.get(why.replace(/[0-9]+/g,"#"))||0)+1); } }
export const reject = why => { throw new Reject(why); };

/**
 * Build a single-select option list. `correct` is one {text, tag}; `wrong` are
 * modeled misconceptions {text, tag}. Duplicate texts and any distractor equal
 * to the answer are dropped; if fewer than `need` distinct distractors remain the
 * candidate challenge is rejected (never padded with filler like "Option 3").
 */
export function buildChoices(correct, wrong, rng, count = 4) {
  const seen = new Set([correct.text]); const ds = [];
  for (const w of wrong) { if (w && w.text != null && !seen.has(w.text)) { seen.add(w.text); ds.push(w); } }
  if (ds.length < count - 1) reject(`only ${ds.length} distinct distractors`);
  const chosen = [correct, ...ds.slice(0, count - 1)];
  const order = shuffle(chosen, rng);
  return { choices: order.map(c => c.text), answer: order.indexOf(correct), choiceTags: order.map(c => c.tag) };
}
export function retry(fn, tries = 400) {
  let last;
  for (let i = 0; i < tries; i++) { try { return fn(i); } catch (e) { if (!e.reject) throw e; last = e; } }
  throw new Reject(`exhausted after ${tries} attempts: ${last?.message}`);
}
export const join = (xs, last = "and") => xs.length <= 1 ? xs.join("") : xs.length === 2 ? `${xs[0]} ${last} ${xs[1]}` : `${xs.slice(0, -1).join(", ")}, ${last} ${xs[xs.length - 1]}`;
export const quote = s => `"${s}"`;
