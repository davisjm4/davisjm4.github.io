// Generator validation. Run: node csp-games/tcp-udp-lab/tests/generator.test.mjs
// Thresholds marked "measured" were set from observed results, with small margins
// for other seeds; they are not independent pedagogical benchmarks.
import assert from 'node:assert/strict';
import * as E from '../generator.js';
import * as S from '../tools/simulate.mjs';

let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const throws = (fn, m) => { assert.throws(fn, m); checks++; };
const SEEDS = [101, 202, 303, 404, 505];

// ── Core: 5 seeds × 6 filters × 500 rounds = 15,000 rounds ──
let core = 0; const agg = { TCP: 0, UDP: 0 }, minGap = {};
for (const seed of SEEDS) for (const f of S.FILTERS) {
  const seq = S.runFilter(seed, f, 500), m = S.measure(seq);
  core += seq.length; agg.TCP += m.answers.TCP; agg.UDP += m.answers.UDP;
  eq(m.exactViolations, 0, `${f}/${seed}: exact repeat within 50`);
  eq(m.familyViolations, 0, `${f}/${seed}: family within previous 3`);
  eq([m.exactRelaxed, m.cooldownRelaxed], [0, 0], `${f}/${seed}: no relaxation needed in published pools`);
  ok(Math.abs(m.tcpShare - 0.5) <= 0.03, `${f}/${seed}: TCP share ${m.tcpShare}`);
  ok(m.maxStreak <= E.MAX_STREAK, `${f}/${seed}: streak ${m.maxStreak}`);
  ok(m.predictability.accuracy <= 0.65, `${f}/${seed}: pattern guess ${m.predictability.best} ${m.predictability.accuracy}`); // noise-inclusive; fair coin worst-of-30 measured 0.569
  for (const q of seq) if (f !== 'mixed') ok(q.topic === f, `${f}: never silently broadened`);
  minGap[f] = Math.min(minGap[f] ?? Infinity, m.minSituationGap);
}
ok(core >= 15000, 'at least 15,000 simulated rounds');
ok(Math.abs(agg.TCP / core - 0.5) <= 0.01, `overall TCP share ${agg.TCP / core}`);
ok(minGap.mixed > 50, `mixed: same situation never within 50 (min gap ${minGap.mixed})`);
for (const f of S.FILTERS.slice(1)) ok(minGap[f] >= 18, `${f}: situation gap ${minGap[f]} (measured 20–30)`);

// ── Long run: answer pattern must stay close to chance ──
const long = S.measure(S.runFilter(9, 'mixed', 20000));
ok(Math.abs(long.tcpShare - 0.5) <= 0.01, 'long-run balance');
ok(long.predictability.accuracy <= 0.56, `long-run best pattern guess ${long.predictability.best} ${long.predictability.accuracy} (measured 0.54; fair coin 0.50)`);

// ── Filter switching with one shared history ──
let switched = 0;
for (const seed of [11, 22, 33]) {
  const seq = S.runSwitching(seed, 1000), m = S.measure(seq); switched += seq.length;
  eq(m.exactViolations, 0, `switching/${seed}: cross-filter exact repeat`);
  eq(m.familyViolations, 0, `switching/${seed}: cross-filter family cooldown`);
  ok(m.maxStreak <= E.MAX_STREAK);
  for (const q of seq) if (q.filter !== 'mixed') ok(q.topic === q.filter);
}
// ── Reloads restore history ──
for (const seed of [7, 8]) { const m = S.measure(S.runReloads(seed, 1000)); eq(m.exactViolations, 0); eq(m.familyViolations, 0); }
const narrowReload = S.measure(S.runReloads(9, 1000, 23, 'streaming')); eq(narrowReload.exactViolations, 0); eq(narrowReload.familyViolations, 0);

// ── Coverage and family fairness ──
const cov = S.runFilter(77, 'mixed', 6000);
eq(new Set(cov.map(q => q.id)).size, E.QUESTIONS.length, 'mixed practice reaches every instance');
const famCounts = Object.values(cov.reduce((m, q) => (m[q.family] = (m[q.family] || 0) + 1, m), {}));
ok(Math.max(...famCounts) - Math.min(...famCounts) <= 3, `family usage spread ${Math.min(...famCounts)}–${Math.max(...famCounts)}`);
for (const f of S.FILTERS.slice(1)) eq(new Set(S.runFilter(3, f, 500).map(q => q.id)).size, E.QUESTIONS.filter(q => q.topic === f).length, `${f}: all instances reached`);

// ── Determinism ──
eq(S.runFilter(42, 'mixed', 200).map(q => q.id), S.runFilter(42, 'mixed', 200).map(q => q.id), 'same seed, same sequence');
ok(S.runFilter(42, 'mixed', 50).map(q => q.id).join() !== S.runFilter(43, 'mixed', 50).map(q => q.id).join(), 'different seed, different sequence');

// ── History restore and cross-filter avoidance ──
const first = E.createGenerator({ seed: 5 }); for (let i = 0; i < 50; i++) first.next('mixed');
const saved = first.history(), resumed = E.createGenerator({ seed: 999, history: saved });
for (let i = 0; i < 30; i++) ok(!saved.slice(i + 1).includes(resumed.next('streaming').id), 'restored history spans filters');
eq(E.createGenerator({ history: ['nope', null, 42, { id: 'x' }] }).history(), [], 'ignores invalid history');

// ── Deadlock safety and relaxation order on injected tiny pools ──
const one = E.QUESTIONS.find(q => q.family === 'pr-quic');
const tiny1 = E.createGenerator({ seed: 1, bank: [one] });
for (let i = 0; i < 100; i++) eq(tiny1.next('mixed').id, one.id, 'single-item pool never deadlocks');
const sameFamily = E.QUESTIONS.filter(q => q.family === 'rel-hol');           // 6 items, 1 family
const g6 = E.createGenerator({ seed: 2, bank: sameFamily });
for (let i = 0; i < 6; i++) { const q = g6.next('mixed'); eq(q.exactRelaxed, false, 'exact kept while candidates remain'); eq(q.cooldownRelaxed, i > 0, 'cooldown relaxed first'); }
const seventh = g6.next('mixed'); eq(seventh.exactRelaxed, true, 'exact relaxed only when exhausted');
const twoFam = E.QUESTIONS.filter(q => ['rel-hol', 'pr-tls'].includes(q.family));   // 12 items, 2 families
const g2 = E.createGenerator({ seed: 3, bank: twoFam }), seq2 = [];
for (let i = 0; i < 500; i++) seq2.push(g2.next('mixed'));
eq(seq2.length, 500, 'small pool completes 500 rounds');
ok(seq2.every((q, i) => !i || q.exactRelaxed || !seq2.slice(Math.max(0, i - 11), i).some(p => p.id === q.id)), 'small pool still avoids exact repeats as long as possible');
throws(() => E.createGenerator({ bank: [] }), 'empty bank');
throws(() => E.createGenerator({ seed: 1 }).next('not-a-topic'), 'unknown filter');

console.log(`TCP/UDP generator: ${checks} assertions passed. ${core} core + ${switched} switching + 2000 reload + 20000 long-run + 6000 coverage rounds; 0 exact-50 / 0 family-3 violations; long-run TCP ${(long.tcpShare * 100).toFixed(1)}%, best pattern guess ${(long.predictability.accuracy * 100).toFixed(1)}%; min situation gap mixed ${minGap.mixed}, narrow ${Math.min(...S.FILTERS.slice(1).map(f => minGap[f]))}.`);
