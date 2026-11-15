// Student-visible answer-selection heuristics, every mode x difficulty.
// usage: node choice-shortcuts.mjs [N=1000] [seedBase=31337] [--json out.json]
// Each heuristic names the option(s) it prefers; expected accuracy credits 1/k when the key is among k tied
// picks (random tie-break). Baseline for 4 options is 25%. Only student-visible text is used.
import fs from "node:fs";
import { generate, makeRng, booleanGame, DIFFICULTIES } from "../../engine.js";
const a = process.argv.slice(2); const N = Number(a[0] || 1000), base = Number(a[1] || 31337);
const jsonOut = a.includes("--json") ? a[a.indexOf("--json") + 1] : null;
const toks = s => String(s).toLowerCase().match(/[a-z_]\w*|\d+|[^\s\w]+/g) || [];
const jac = (x, y) => { const A = new Set(toks(x)), B = new Set(toks(y)); let i = 0; for (const t of A) if (B.has(t)) i++; return i / (A.size + B.size - i || 1); };
const argmax = v => { const m = Math.max(...v); return v.flatMap((x, i) => x === m ? [i] : []); };
const credit = (picks, key) => picks.includes(key) ? 1 / picks.length : 0;
const H = {
  longest: (o) => argmax(o.map(x => x.length)),
  shortest: (o) => argmax(o.map(x => -x.length)),
  centroid: (o) => argmax(o.map((x, i) => o.reduce((s, y, j) => s + (i === j ? 0 : jac(x, y)), 0))),
  outlier: (o) => argmax(o.map((x, i) => -o.reduce((s, y, j) => s + (i === j ? 0 : jac(x, y)), 0))),
  promptOverlap: (o, ctx) => { const c = new Set(toks(ctx)); return argmax(o.map(x => toks(x).filter(t => c.has(t)).length)); },
};
const out = [];
for (const mode of Object.keys(booleanGame.modes)) for (const L of DIFFICULTIES) {
  const acc = Object.fromEntries(Object.keys(H).map(k => [k, 0])); let n = 0, fail = 0; const pos = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    let q; try { q = generate(mode, makeRng(base + (i * 15485863) % 2147483000), L); } catch { fail++; continue; }
    const o = q.kind === "select" ? q.tokens.map(t => t.text) : q.choices; if (o.length !== 4 || q.kind === "select") continue;
    n++; pos[q.answer]++; const ctx = q.question + " " + (q.code || "");
    for (const k of Object.keys(H)) acc[k] += credit(H[k](o, ctx), q.answer);
  }
  const e = n / 4; out.push({ mode, L, n, fail, ...Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, n ? +(100 * v / n).toFixed(1) : null])), chi2pos: n ? +pos.reduce((s, x) => s + (x - e) ** 2 / e, 0).toFixed(1) : null });
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ N, base, rows: out }, null, 1));
console.log("mode        L            n   longest shortest centroid outlier promptOv chi2");
for (const r of out) console.log(`${r.mode.padEnd(11)} ${r.L.padEnd(12)} ${String(r.n).padStart(4)} ${[r.longest, r.shortest, r.centroid, r.outlier, r.promptOverlap].map(v => String(v ?? "-").padStart(8)).join("")} ${String(r.chi2pos ?? "-").padStart(6)}`);
