// Regression tests for the Boolean & Conditional quality repairs (BC-01, ID-01, SH-01/02, EV-01, TT-01, CN-01).
// Deterministic: fixed seeds only. usage: node tests/audit/repair-regression.mjs
import assert from "node:assert/strict";
import { generate, makeRng, DIFFICULTIES } from "../../engine.js";
import { buildChoices, optionSimilarity, similarityRankRange } from "../../generators/core.js";
import { sensitivity } from "../../generators/legacy.js";
import * as B from "../../generators/bool.js";
const toks = s => String(s).toLowerCase().match(/[a-z_]\w*|\d+|[^\s\w]+/g) || [];
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const sample = (mode, L, n, seed0 = 90001) => Array.from({ length: n }, (_, i) => generate(mode, makeRng(seed0 + i * 7919), L));

// BC-01: the keyed option must not be the most-similar ("hub") option by a wide margin.
for (const mode of ["conditions", "construct", "equivalent"]) for (const L of DIFFICULTIES) {
  let credit = 0, n = 0;
  for (const q of sample(mode, L, 1200)) { const o = q.choices; const sc = o.map((x, i) => o.reduce((s, y, j) => s + (i === j ? 0 : optionSimilarity(x, y)), 0)); const mx = Math.max(...sc); const top = sc.flatMap((v, i) => v === mx ? [i] : []); credit += top.includes(q.answer) ? 1 / top.length : 0; n++; }
  ok(credit / n < 0.36, `${mode}/${L}: hub heuristic wins ${(100 * credit / n).toFixed(1)}% (limit 36%, chance 25%)`);
}
// BC-01 unit: with a surplus of distractors the keyed rank must vary; options stay unique and 4 long.
{ const correct = { text: "x >= 5 && y < 3", tag: "correct" };
  const wrong = ["x > 5 && y < 3", "x >= 5 || y < 3", "x >= 5 && y <= 3", "x > 5 || y < 3", "x >= 5 || y <= 3", "x > 5 && y <= 3"].map(t => ({ text: t, tag: "w" }));   // single-slip and two-slip variants
  let credit = 0; for (let s = 1; s <= 200; s++) { const r = buildChoices(correct, wrong, makeRng(1 + s * 2654435)); ok(new Set(r.choices).size === 4 && r.choices[r.answer] === correct.text, "buildChoices keeps 4 unique options with the key");
    const sc = r.choices.map((x, i) => r.choices.reduce((t, y, j) => t + (i === j ? 0 : optionSimilarity(x, y)), 0)); const mx = Math.max(...sc); const top = sc.flatMap((v, i) => Math.abs(v - mx) < 1e-9 ? [i] : []); credit += top.includes(r.answer) ? 1 / top.length : 0; }
  ok(credit / 200 < 0.4, `hub heuristic wins ${(100 * credit / 2).toFixed(0)}% on the unit pool (chance 25%)`);
  const a = buildChoices(correct, wrong, makeRng(42)), b = buildChoices(correct, wrong, makeRng(42)); assert.deepEqual(a, b); checks++; }
// BC-01 numeric cue: keyed value must not always sit in the same numeric rank.
{ const ranks = [0, 0, 0, 0]; const correct = { text: "2 rows", tag: "correct" }; const wrong = [0, 1, 3, 4].map(n => ({ text: `${n} rows`, tag: "w" }));
  for (let s = 1; s <= 400; s++) { const r = buildChoices(correct, wrong, makeRng(1 + s * 2654435)); const v = r.choices.map(parseFloat); ranks[[...v].sort((x, y) => x - y).indexOf(2)]++; }
  ok(ranks.every(x => x > 0 === (x > 0)) && ranks.filter(x => x > 0).length >= 2 && Math.min(...ranks.filter(x => x > 0)) > 60, `numeric rank spread ${ranks}`); }
// ID-01: identify honours difficulty.
{ const sig = L => sample("identify", L, 200).map(q => JSON.stringify([q.question, q.code]));
  ok(JSON.stringify(sig("Beginner")) !== JSON.stringify(sig("Advanced")), "identify differs between Beginner and Advanced");
  ok(sample("identify", "Beginner", 300).every(q => q.family !== "identify-first-evaluated"), "identify Beginner never asks the evaluation-order question");
  ok(sample("identify", "Advanced", 300).some(q => /\|\||&&/.test(q.code) && /!/.test(q.code) || q.code.split(/&&|\|\|/).length > 2), "identify Advanced uses multi-part conditions"); }
// SH-01: short-mode options must all be outputs the program could plausibly produce (no bare "true" or numbers for print programs).
for (const L of DIFFICULTIES) for (const q of sample("short", L, 600)) { if (/println\("/.test(q.code)) for (const c of q.choices) ok(c !== "true" && !/^\d+$/.test(c), `short/${q.family}: implausible option "${c}"`); }
// SH-02: short Advanced is a different distribution from Intermediate and excludes the basic recall families.
{ const fams = L => new Set(sample("short", L, 1500).map(q => q.family)); const A = fams("Advanced"), I = fams("Intermediate"); ok(!A.has("short-equals") && !A.has("short-length"), "Advanced short excludes equals/length"); ok(I.has("short-equals") && I.has("short-length"), "Intermediate short keeps them"); }
// EV-01: Intermediate/Advanced evaluate items are not decided by the first operand and depend on enough atoms.
for (const [L, need] of [["Intermediate", 1], ["Advanced", 1]]) for (const q of sample("evaluate", L, 800)) {
  const lines = q.code.trim().split("\n"); const node = B.parse(lines.pop().match(/^boolean \w+ = (.*);$/)[1]); const env = {};
  for (const l of lines) { const m = l.match(/^(int|boolean) (\w+) = (-?\w+);/); env[m[2]] = m[1] === "int" ? Number(m[3]) : m[3] === "true"; }
  if (node.k === "and") ok(B.evaluate(node.xs[0], env), `${L}: first operand of && decides the result`); if (node.k === "or") ok(!B.evaluate(node.xs[0], env), `${L}: first operand of || decides the result`);
  ok(sensitivity(node, env) >= need, `${L}: only ${sensitivity(node, env)} atoms influence the result (need ${need}): ${lines.join(" ")} ${q.code.split("\n").pop()}`); }
// EV-01b: the top-level operator must not predict the answer (guards against over-filtering AND/OR asymmetrically).
for (const L of DIFFICULTIES) { const t = {}; for (const q of sample("evaluate", L, 2000, 7001)) { const top = B.parse(q.code.trim().split("\n").pop().match(/^boolean \w+ = (.*);$/)[1]).k; t[top] ??= [0, 0]; t[top][0]++; if (q.choices[q.answer] === "true") t[top][1]++; }
  for (const [k, [n, tr]] of Object.entries(t)) ok(n < 100 || Math.abs(tr / n - 0.5) < 0.1, `evaluate/${L}: top operator ${k} predicts true in ${(100 * tr / n).toFixed(0)}% of ${n}`); }
// TT-01: always-true / always-false are balanced between the constant and non-constant case.
for (const mode of ["truthTable"]) { let yes = 0, n = 0; for (const L of DIFFICULTIES) for (const q of sample(mode, L, 900, 4242)) if (q.family === "always-true" || q.family === "always-false") { n++; if (q.choices[q.answer].startsWith("Yes")) yes++; }
  ok(yes / n > 0.42 && yes / n < 0.58, `constant case share ${(100 * yes / n).toFixed(1)}% (must be near 50%)`); }
// CN-01: denial prompt wording.
for (const L of DIFFICULTIES) for (const q of sample("conditions", L, 600)) ok(!/exactly when access is denied when/.test(q.question), "conditions denial prompt has the doubled 'when'");
// Same seed, same challenge (determinism across all modes).
for (const m of Object.keys((await import("../../engine.js")).booleanGame.modes)) for (const L of DIFFICULTIES) { const s = 123457; assert.deepEqual(JSON.parse(JSON.stringify(generate(m, makeRng(s), L))), JSON.parse(JSON.stringify(generate(m, makeRng(s), L)))); checks++; }
console.log(`Boolean & Conditional repair regression: ${checks} checks passed.`);
