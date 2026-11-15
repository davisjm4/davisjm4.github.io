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

/* Option-set balancing (audit repair BC-01). When every distractor is a single mutation of the
 * correct answer, the keyed option is the one most similar to all the others (and often the
 * shortest), so a student can pick it without reasoning. For 4-option challenges with a surplus
 * of candidate distractors, the three that are shown are chosen so the keyed option's similarity
 * rank and length rank are each uniformly random instead of always "hub" / "shortest".
 * Deterministic: only the supplied rng is used. */
const _tok = s => String(s).toLowerCase().match(/[a-z_]\w*|\d+|[^\s\w]+/g) || [];
export function optionSimilarity(a, b) { const A = new Set(_tok(a)), B = new Set(_tok(b)); let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i || 1); }
/** Possible ranks [lo, hi] of values[idx] when sorted descending (0 = largest); ties widen the range. */
function rankRange(values, idx = 0) { let g = 0, e = 0; values.forEach((v, i) => { if (i === idx) return; if (v > values[idx] + 1e-9) g++; else if (Math.abs(v - values[idx]) <= 1e-9) e++; }); return [g, g + e]; }
const simScores = texts => texts.map((t, i) => texts.reduce((s, u, j) => s + (i === j ? 0 : optionSimilarity(t, u)), 0));
/** Possible similarity ranks [lo, hi] of texts[0] (0 = most similar to the others). Exported for tests. */
export const similarityRankRange = texts => rankRange(simScores(texts), 0);
/** Choose the distractors to show. Each surface cue (numeric value when every option is a number; otherwise
 * similarity to the other options, then text length) gets a target rank drawn uniformly from the ranks the pool
 * can actually produce, and the candidate combinations are filtered cue by cue, so the keyed option's rank is
 * uniform over what is attainable rather than always hub / shortest / middle-valued. */
function balancedDistractors(correct, pool, rng, need) {
  const cands = pool.slice(0, 9);
  const combos = []; const rec = (start, acc) => { if (acc.length === need) { combos.push(acc); return; } for (let i = start; i < cands.length; i++) rec(i + 1, [...acc, cands[i]]); }; rec(0, []);
  const numeric = [correct, ...cands].every(c => /^-?\d+(\.\d+)?(\s|$)/.test(String(c.text)));
  const cues = numeric ? [t => t.map(parseFloat)] : [simScores, t => t.map(x => x.length)];
  let live = combos.map(c => ({ c, texts: [correct.text, ...c.map(x => x.text)] }));
  for (const cue of cues) {
    const rr = live.map(x => rankRange(cue(x.texts)));
    const attainable = [...new Set(rr.flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, k) => lo + k)))].sort((x, y) => x - y);
    const t = attainable[Math.floor(rng() * attainable.length)];
    live = live.filter((_, i) => rr[i][0] <= t && t <= rr[i][1]);
  }
  return live[0].c;
}
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
  const picked = count === 4 && ds.length > 3 ? balancedDistractors(correct, ds, rng, 3) : ds.slice(0, count - 1);
  const chosen = [correct, ...picked];
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
