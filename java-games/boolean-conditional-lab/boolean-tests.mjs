import assert from "node:assert/strict";
import { booleanGame, generate, assess, makeRng, signature } from "./engine.js";

let checks = 0;
const modes = Object.keys(booleanGame.modes);
const positions = Object.fromEntries(modes.map(m => [m, [0, 0, 0, 0]]));
const variants = new Set();
for (const mode of modes) {
  const rng = makeRng(7000 + mode.length);
  for (let i = 0; i < 150; i++) {
    const q = generate(mode, rng);
    assert.equal(q.mode, mode); checks++;
    assert.ok(q.question && q.explanation && q.code); checks += 2;
    if (q.kind === "select") {
      assert.ok(q.tokens.length >= 4); checks++;
      assert.equal(q.tokens.filter(t => t.correct).length, 1); checks++;
      assert.equal(q.answer, q.tokens.findIndex(t => t.correct)); checks++;
      assert.equal(assess(q, q.answer), true); checks++;
      assert.equal(assess(q, (q.answer + 1) % q.tokens.length), false); checks++;
    } else {
      assert.ok(q.choices.length === 2 || q.choices.length === 4); checks++;
      assert.equal(new Set(q.choices).size, q.choices.length); checks++;
      assert.ok(q.answer >= 0 && q.answer < q.choices.length); checks++;
      assert.equal(assess(q, q.answer), true); checks++;
      assert.equal(assess(q, (q.answer + 1) % q.choices.length), false); checks++;
    }
    variants.add(signature(q)); positions[mode][q.answer]++;
  }
}
assert.ok(variants.size >= 20); checks++;
for (const mode of modes) {
  const seen = positions[mode].filter(x => x > 0).length;
  assert.ok(seen >= 2, `${mode} answer positions are predictable`); checks++;
}
const mixed = makeRng(9911), mixedModes = new Set();
for (let i = 0; i < 1050; i++) mixedModes.add(generate("mixed", mixed).mode);
assert.deepEqual([...mixedModes].sort(), [...modes].sort()); checks++;
assert.equal(booleanGame.modes.evaluate, "Evaluate Expressions"); checks++;
console.log(`Boolean & Conditional Lab: ${checks} checks passed; ${variants.size} distinct generated signatures across ${modes.length} modes and 1,050 mixed challenges.`);
