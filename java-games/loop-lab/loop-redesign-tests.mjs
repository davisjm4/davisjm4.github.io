import assert from "node:assert/strict";
import { generateLoop, challengeFamilies, familyNames, assessLoop } from "./loop-engine.js";

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const seen = new Set(), variants = new Set(), concepts = new Set();
const familyCounts = Object.fromEntries(Object.keys(familyNames).map(k => [k, 0]));
const positions = new Set();

for (let i = 0; i < 6000; i++) {
  const q = generateLoop();
  seen.add(q.family); variants.add(`${q.family}/${q.variant}`); concepts.add(q.concept); familyCounts[q.family]++;
  ok(q.code.length > 10 && q.prompt.length > 10 && q.explanation.length > 15);
  ok(q.choices.length === 4 && new Set(q.choices).size === 4);
  ok(q.choices.includes(q.answer) && q.correctAnswer === q.answer);
  ok(assessLoop(q, {answer: q.answer}));
  ok(!q.code.includes("???") && !q.code.includes("<gap>"));
  positions.add(q.choices.indexOf(q.answer));
}
eq([...seen].sort(), Object.keys(familyNames).sort());
eq(positions.size, 4, "correct answer position should vary");
ok(Object.values(familyCounts).every(n => n >= 450), "mixed practice should cover every family");
eq(variants.size, Object.values(challengeFamilies).flat().length, "all structural variants should appear");
ok(concepts.size >= 18, "concept labels should vary beyond iteration-count wording");

for (const [family, names] of Object.entries(challengeFamilies)) {
  for (const variant of names) {
    const q = generateLoop(family, variant);
    eq(q.variant, variant, `forced variant ${family}/${variant}`);
    eq(q.choices.length, 4);
    ok(assessLoop(q, {answer: q.answer}));
  }
}

// The original pinned table (25 literal answers from the static bank) cannot apply to generated
// questions. It is replaced by seeded regression fixtures: the legacy variants at fixed seeds must keep
// producing these answers. Regenerate with: node tools/make-fixtures.mjs (only after an intended change).
import fixtures from "./tests/legacy-fixtures.json" with { type: "json" };
import { generateChallenge } from "./loop-engine.js";
for (const f of fixtures) {
  const q = generateChallenge({ mode: f.mode, difficulty: f.difficulty, seed: f.seed, family: f.variant });
  eq(q.variant, f.variant, `fixture variant ${f.mode}/${f.variant}`);
  eq(q.answer, f.answer, `fixture answer ${f.mode}/${f.variant} seed ${f.seed}`);
}
console.log(`Loop Lab redesign (updated for expansion): ${checks} checks passed; ${fixtures.length} seeded legacy fixtures; ${variants.size} structural variants across ${seen.size} families; mixed distribution ${JSON.stringify(familyCounts)}.`);
