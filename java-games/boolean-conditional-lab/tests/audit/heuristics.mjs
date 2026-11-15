// Shared answer-selection heuristics (student-visible text only). Expected accuracy credits 1/k for k tied picks.
// Chance for four options is 25%. "exploit" folds in the complement strategy: a heuristic that is right far LESS than
// chance can be used by elimination, giving (100 - accuracy) / 3 on the remaining options.
export const toks = s => String(s).toLowerCase().match(/[a-z_]\w*|\d+|[^\s\w]+/g) || [];
export const jac = (x, y) => { const A = new Set(toks(x)), B = new Set(toks(y)); let i = 0; for (const t of A) if (B.has(t)) i++; return i / (A.size + B.size - i || 1); };
const argmax = v => { const m = Math.max(...v); return v.flatMap((x, i) => Math.abs(x - m) < 1e-9 ? [i] : []); };
export const HEURISTICS = {
  mostSimilar: o => argmax(o.map((x, i) => o.reduce((s, y, j) => s + (i === j ? 0 : jac(x, y)), 0))),
  leastSimilar: o => argmax(o.map((x, i) => -o.reduce((s, y, j) => s + (i === j ? 0 : jac(x, y)), 0))),
  longest: o => argmax(o.map(x => x.length)), shortest: o => argmax(o.map(x => -x.length)),
  promptOverlap: (o, ctx) => { const c = new Set(toks(ctx)); return argmax(o.map(x => toks(x).filter(t => c.has(t)).length)); },
};
/** sets: [{choices, answer, question?, code?}] -> {n, mostSimilar, ..., exploit:{...}, worst} in percent. */
export function measure(sets) {
  const acc = Object.fromEntries(Object.keys(HEURISTICS).map(k => [k, 0])); let n = 0;
  for (const q of sets) { if (!q.choices || q.choices.length !== 4) continue; n++; const ctx = `${q.question ?? ""} ${q.code ?? ""}`;
    for (const [k, h] of Object.entries(HEURISTICS)) { const picks = h(q.choices, ctx); acc[k] += picks.includes(q.answer) ? 1 / picks.length : 0; } }
  const pct = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, n ? 100 * v / n : NaN]));
  const exploit = Object.fromEntries(Object.entries(pct).map(([k, v]) => [k, Math.max(v, (100 - v) / 3)]));
  return { n, ...pct, exploit, worst: Math.max(...Object.values(exploit)) };
}
