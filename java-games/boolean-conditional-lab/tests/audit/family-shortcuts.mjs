// Targeted shortcut measurement for the four continuation families, on independent seed sets.
// usage: node family-shortcuts.mjs [N=2500] [--seeds train|validation|<int>] [--json out.json]
// Expected accuracy of each surface heuristic (random tie-break); chance for four options is 25%.
import fs from "node:fs";
import { generateCoverage } from "../../generators/coverage.js";
import { generateSwitch } from "../../generators/switch-if.js";
import { generate, makeRng, DIFFICULTIES } from "../../engine.js";
const a = process.argv.slice(2); const N = Number(a[0] && !a[0].startsWith("--") ? a[0] : 2500);
const seedArg = a.includes("--seeds") ? a[a.indexOf("--seeds") + 1] : "validation";
const base = seedArg === "train" ? 20240101 : seedArg === "validation" ? 77001731 : Number(seedArg);
const jsonOut = a.includes("--json") ? a[a.indexOf("--json") + 1] : null;
const toks = s => String(s).toLowerCase().match(/[a-z_]\w*|\d+|[^\s\w]+/g) || [];
const jac = (x, y) => { const A = new Set(toks(x)), B = new Set(toks(y)); let i = 0; for (const t of A) if (B.has(t)) i++; return i / (A.size + B.size - i || 1); };
const argmax = v => { const m = Math.max(...v); return v.flatMap((x, i) => x === m ? [i] : []); };
const credit = (picks, key) => picks.includes(key) ? 1 / picks.length : 0;
const H = {
  mostSimilar: o => argmax(o.map((x, i) => o.reduce((s, y, j) => s + (i === j ? 0 : jac(x, y)), 0))),
  leastSimilar: o => argmax(o.map((x, i) => -o.reduce((s, y, j) => s + (i === j ? 0 : jac(x, y)), 0))),
  longest: o => argmax(o.map(x => x.length)), shortest: o => argmax(o.map(x => -x.length)),
  promptOverlap: (o, ctx) => { const c = new Set(toks(ctx)); return argmax(o.map(x => toks(x).filter(t => c.has(t)).length)); },
};
const FAMILIES = [
  { id: "coverage/fix-boundary", gen: (r, L) => generateCoverage(r, L, "fix-boundary") },
  { id: "short/short-counter", gen: (r, L) => { const q = generate("short", r, L); return q.family === "short-counter" ? q : null; }, tries: 12 },
  { id: "coverage/equivalent-chain", gen: (r, L) => generateCoverage(r, L, "equivalent-chain") },
  { id: "switchIf/missing-break-fix", gen: (r, L) => generateSwitch(r, L, "missing-break-fix") },
];
const only = a.includes("--only") ? a[a.indexOf("--only") + 1] : null;
const out = [];
for (const F of FAMILIES.filter(f => !only || f.id.includes(only))) {
  const acc = Object.fromEntries(Object.keys(H).map(k => [k, 0])); let n = 0, opt3 = 0; const pos = [0, 0, 0, 0]; const dist = new Set();
  for (let i = 0; i < N; i++) for (const L of DIFFICULTIES) {
    let q = null; for (let t = 0; t < (F.tries || 1) && !q; t++) { try { q = F.gen(makeRng(base + i * 104729 + t * 7 + DIFFICULTIES.indexOf(L) * 1299709), L); } catch { q = null; } }
    if (!q || !q.choices || q.choices.length !== 4) { if (q?.choices?.length === 3) opt3++; continue; }
    n++; pos[q.answer]++; const ctx = q.question + " " + (q.code || ""); q.choices.forEach(c => dist.add(c));
    for (const k of Object.keys(H)) acc[k] += credit(H[k](q.choices, ctx), q.answer);
  }
  const e = n / 4;
  out.push({ family: F.id, seeds: seedArg, n, threeOptionItems: opt3, ...Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, n ? +(100 * v / n).toFixed(1) : null])), chi2pos: n ? +pos.reduce((s, x) => s + (x - e) ** 2 / e, 0).toFixed(1) : null });
}
console.log(`seeds=${seedArg} (base ${base}), up to ${N} draws x 3 difficulties per family`);
console.log("family                       n    3-opt  mostSim  leastSim  longest shortest promptOv  chi2pos");
for (const r of out) console.log(`${r.family.padEnd(26)} ${String(r.n).padStart(5)} ${String(r.threeOptionItems).padStart(5)} ${[r.mostSimilar, r.leastSimilar, r.longest, r.shortest, r.promptOverlap].map(v => String(v ?? "-").padStart(8)).join(" ")} ${String(r.chi2pos).padStart(8)}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ N, seeds: seedArg, base, rows: out }, null, 1));
