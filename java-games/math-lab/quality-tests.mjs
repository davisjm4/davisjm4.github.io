// Math Lab answer-rank leakage regression (original five modes).
// Before the repair the key's value rank was a function of the template (e.g. the nested-group key was the
// smallest choice 100% of the time; modulus smaller/negative-divisor/both-negative key was always the third smallest).
// Seeds here are disjoint from the audit discovery/validation seeds. Run: node math-lab/quality-tests.mjs
import assert from "node:assert/strict";
import { structures, generate } from "./engine.js";
const lcg = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const N = 400, BOUND = 0.65;
const RESIDUAL = { "modulus:divisible": 0.72 }; // The deliberate mixture still includes exact multiples.
const heuristics = {
  rank0: (v, a) => [...v].sort((x, y) => x - y).indexOf(a) === 0,
  rank1: (v, a) => [...v].sort((x, y) => x - y).indexOf(a) === 1,
  rank2: (v, a) => [...v].sort((x, y) => x - y).indexOf(a) === 2,
  rank3: (v, a) => [...v].sort((x, y) => x - y).indexOf(a) === 3,
  minAbs: (v, a) => Math.abs(a) === Math.min(...v.map(Math.abs)),
  closestMean: (v, a) => { const m = v.reduce((x, y) => x + y) / 4, d = v.map(x => Math.abs(x - m)); return v[d.indexOf(Math.min(...d))] === a; },
};
// Vanishing terms: the key must rarely be just a number written in the code (e.g. 14 + 4 / 5 is 14). The base engine: 30-42%.
const writtenKey = q => (q.expression.match(/\d+(\.\d+)?/g) || []).some(t => Number(t) === Number(q.answer));
for (const shape of structures.expressions) {
  let hit = 0;
  for (let i = 0; i < N; i++) if (writtenKey(generate("expressions", shape, lcg(950001 + i * 104729 + shape.length * 31)))) hit++;
  assert.ok(hit / N <= 0.2, `expressions:${shape}: key written in the code ${(100 * hit / N).toFixed(1)}% (> 20%)`);
}
let checked = 0;
for (const [mode, shapes] of Object.entries(structures)) for (const shape of shapes) {
  if (mode === "reverse") continue;
  const hits = Object.fromEntries(Object.keys(heuristics).map(k => [k, 0]));
  for (let i = 0; i < N; i++) {
    const seed = 900001 + i * 104729 + shape.length * 31;
    const q = generate(mode, shape, lcg(seed)), again = generate(mode, shape, lcg(seed));
    assert.deepEqual(q, again, `deterministic ${mode}:${shape} seed ${seed}`);
    assert.equal(new Set(q.choices.map(Number)).size, 4);
    const v = q.choices.map(Number), a = Number(q.answer);
    for (const [k, f] of Object.entries(heuristics)) if (f(v, a)) hits[k]++;
    checked++;
  }
  const [best, count] = Object.entries(hits).sort((x, y) => y[1] - x[1])[0];
  const bound = RESIDUAL[`${mode}:${shape}`] ?? BOUND;
  assert.ok(count / N <= bound, `${mode}:${shape}: shortcut '${best}' picks the key ${(100 * count / N).toFixed(1)}% (> ${bound * 100}%)`);
}
console.log(`Math Lab quality: ${checked} questions across ${Object.values(structures).flat().length - structures.reverse.length} value structures; no answer-rank shortcut above ${BOUND * 100}% (divisibility uses its documented bound); deterministic.`);
