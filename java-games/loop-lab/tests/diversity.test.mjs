/* Loop Lab — diversity measurement. Exact and structural variation are reported separately.
 * Usage: node tests/diversity.test.mjs [newSamples=1000] [originalSamples=300] [sessions=5]
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import * as E from "../loop-engine.js";

const NEW = Number(process.argv[2] || 1000), OLD = Number(process.argv[3] || 300), SESSIONS = Number(process.argv[4] || 5);
const isNew = (m) => m === "algorithms" || m === "executions";
const report = { samples: {}, sessions: {}, legacyBaseline: null };
let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; };

for (const mode of E.MODES) for (const d of E.DIFFICULTIES) {
  const n = isNew(mode) ? NEW : OLD;
  const exact = new Map(), structural = new Map(), fam = {}, tpl = new Set(), tags = {}, distractorSets = new Set(), answerDistribution = {};
  let fallback = 0, distractors = 0; const meta = { score: 0, loopIterations: 0, changingVariables: 0, nestingDepth: 0, conditions: 0, dependentBounds: 0, earlyExits: 0, stateTransitions: 0, tracedOperations: 0, accumulatorUpdates: 0 };
  for (let i = 1; i <= n; i++) {
    const q = E.generateChallenge({ mode, difficulty: d, seed: (i * 40503 + 17) >>> 0 });
    exact.set(q.signature.exact, (exact.get(q.signature.exact) || 0) + 1);
    structural.set(q.signature.structural, (structural.get(q.signature.structural) || 0) + 1);
    fam[q.variant] = (fam[q.variant] || 0) + 1; tpl.add(q.template);
    answerDistribution[q.answer] = (answerDistribution[q.answer] || 0) + 1;
    for (const x of q.distractors) { tags[x.misconception] = (tags[x.misconception] || 0) + 1; distractors++; if (x.misconception === "fallback") fallback++; }
    distractorSets.add(q.distractors.map((x) => x.misconception).sort().join("+"));
    for (const k of Object.keys(meta)) meta[k] += q.metadata[k];
  }
  for (const k of Object.keys(meta)) meta[k] = Math.round((100 * meta[k]) / n) / 100;
  const dupItems = [...exact.values()].reduce((s, c) => s + (c - 1), 0);
  report.samples[`${mode}/${d}`] = {
    n, exactDuplicateRate: dupItems / n, distinctExact: exact.size, structuralPatterns: structural.size, templates: tpl.size,
    reasoningFamilies: Object.keys(fam).length, familyDistribution: fam, misconceptionTags: Object.keys(tags).length, tagDistribution: tags,
    distractorCombinations: distractorSets.size, answerDistribution, distinctAnswers: Object.keys(answerDistribution).length, fallbackShare: fallback / distractors, meanComplexity: meta,
  };
}

// console.error("samples done", (performance.now()/1000).toFixed(1));
// session simulation: 100 consecutive challenges per mode × difficulty, several sessions
for (const mode of [...E.MODES, "mixed"]) for (const d of E.DIFFICULTIES) {
  const agg = { sessions: SESSIONS, length: 100, exactRepeats: 0, structuralRepeats: 0, minStructuralGap: Infinity, consecutiveSameFamily: 0, families: new Set() };
  for (let s = 1; s <= SESSIONS; s++) {
    const sess = E.createLoopSession({ seed: s * 7777 + d.length });
    const exact = new Set(), lastSeen = new Map(); let prevFam = null;
    for (let i = 0; i < 100; i++) {
      const q = sess.next({ mode, difficulty: d });
      if (exact.has(q.signature.exact)) agg.exactRepeats++;
      exact.add(q.signature.exact);
      if (lastSeen.has(q.signature.structural)) { agg.structuralRepeats++; agg.minStructuralGap = Math.min(agg.minStructuralGap, i - lastSeen.get(q.signature.structural)); }
      lastSeen.set(q.signature.structural, i);
      if (prevFam === q.reasoningFamily) agg.consecutiveSameFamily++;
      prevFam = q.reasoningFamily; agg.families.add(q.reasoningFamily);
    }
  }
  agg.families = agg.families.size;
  if (agg.minStructuralGap === Infinity) agg.minStructuralGap = null;
  report.sessions[`${mode}/${d}`] = agg; // console.error("session", mode, d, (performance.now()/1000).toFixed(1));

}

// Baseline: the original static engine, for comparison (if present alongside).
try {
  const legacyPath = new URL("../legacy/loop-engine.original.js", import.meta.url);
  if (fs.existsSync(legacyPath)) {
    const L = await import(legacyPath.href);
    const exact = new Set(); for (let i = 0; i < 2000; i++) { const q = L.generateLoop(); exact.add(q.code + "|" + q.prompt); }
    report.legacyBaseline = { distinctQuestionsIn2000Draws: exact.size, structuralVariants: Object.values(L.challengeFamilies).flat().length };
  }
} catch (e) { report.legacyBaseline = { error: String(e.message) }; }

fs.mkdirSync(new URL("../reports/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../reports/diversity.json", import.meta.url), JSON.stringify(report, null, 1));
for (const mode of ["algorithms", "executions"]) for (const d of E.DIFFICULTIES) {
  const r = report.samples[`${mode}/${d}`];
  ok(r.reasoningFamilies >= 8, `${mode}/${d}: ≥ 8 reasoning families`);
  ok(r.exactDuplicateRate < 0.1, `${mode}/${d}: exact duplicate rate ${r.exactDuplicateRate}`);
  ok(r.fallbackShare < 0.1, `${mode}/${d}: fallback distractors are a small minority (${r.fallbackShare.toFixed(3)})`);
}
for (const [k, agg] of Object.entries(report.sessions)) {
  ok(agg.exactRepeats === 0, `${k}: no exact repeat inside a 100-challenge session`);
  const pool = report.samples[k]?.structuralPatterns ?? Infinity; // mixed has no single pool
  const need = pool >= 20 ? 4 : Math.min(3, pool - 1);
  agg.requiredMinGap = need;
  if (agg.minStructuralGap !== null) ok(agg.minStructuralGap >= need, `${k}: identical structure never recurs within ${need} challenges (gap ${agg.minStructuralGap}, pool ${pool})`);
}

for (const [k, sample] of Object.entries(report.samples)) {
  ok(sample.exactDuplicateRate < 0.1, `${k}: exact duplicate rate stays below 10% in ${sample.n} independent samples (${(sample.exactDuplicateRate * 100).toFixed(1)}%)`);
  ok(sample.reasoningFamilies >= 3, `${k}: at least three reasoning families are represented`);
}

const all = Object.values(report.samples);
console.log(`Loop Lab diversity: ${checks} checks passed; ${all.reduce((s, r) => s + r.n, 0).toLocaleString()} sampled challenges; ${Object.keys(report.sessions).length} session cells × ${SESSIONS} × 100 simulated; overall fallback share ${(all.reduce((s, r) => s + r.fallbackShare * r.n, 0) / all.reduce((s, r) => s + r.n, 0)).toFixed(3)}.`);
