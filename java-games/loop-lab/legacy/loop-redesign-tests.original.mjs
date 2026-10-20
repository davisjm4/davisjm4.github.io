import assert from "node:assert/strict";
import { generateLoop, challengeFamilies, familyNames, assessLoop } from "./loop-engine.js";

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const seen = new Set(), variants = new Set(), concepts = new Set();
const familyCounts = Object.fromEntries(Object.keys(familyNames).map(k => [k, 0]));
const positions = new Set();

for (let i = 0; i < 1200; i++) {
  const q = generateLoop();
  seen.add(q.family); variants.add(q.variant); concepts.add(q.concept); familyCounts[q.family]++;
  ok(q.code.length > 10 && q.prompt.length > 10 && q.explanation.length > 15);
  ok(q.choices.length === 4 && new Set(q.choices).size === 4);
  ok(q.choices.includes(q.answer) && q.correctAnswer === q.answer);
  ok(assessLoop(q, {answer: q.answer}));
  ok(!q.code.includes("???") && !q.code.includes("<gap>"));
  positions.add(q.choices.indexOf(q.answer));
}
eq([...seen].sort(), Object.keys(familyNames).sort());
eq(positions.size, 4, "correct answer position should vary");
ok(Object.values(familyCounts).every(n => n >= 90), "mixed practice should cover every family");
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

const expected = {
  "iterations/inc-exclusive": 4, "iterations/dec-inclusive": 4, "iterations/zero-start": 0, "iterations/while-decrement": 3, "iterations/one-step": 1, "iterations/skip-step": 4,
  "final/sum-range": 17, "final/product": 24, "final/overwrite": 10, "final/count-even": 3, "final/continue-sum": 18, "final/break-sum": 12,
  "conditional/odd-count": 0, "conditional/greater-sum": 15, "conditional/continue-even": 4, "conditional/break-target": 3,
  "while/integer-half": 2, "while/increment-sentinel": 10, "while/zero-while": 4, "while/decrement": 3,
  "nested/rectangle": 6, "nested/diagonal": 2, "nested/triangular": 10, "nested/inner-step": 18, "nested/break-inner": 6,
};
for (const [key, answer] of Object.entries(expected)) {
  const [family, variant] = key.split("/");
  eq(Number(generateLoop(family, variant).answer), answer, `independent expected result ${key}`);
}

console.log(`Loop Lab redesign: ${checks} checks passed; ${variants.size} structural variants across ${seen.size} families; mixed distribution ${JSON.stringify(familyCounts)}.`);
