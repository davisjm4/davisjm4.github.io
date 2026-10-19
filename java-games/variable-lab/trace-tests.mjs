import assert from "node:assert/strict";
import { generate, assess } from "../engine.js";
import { generateTrace } from "./trace-adapter.js";
import { generateTraceChallenge, getPostSubmissionView, verifyChallengeModel, RecentHistory } from "./trace-generator/src/index.js";

const counts = { beginner: 20, intermediate: 20, advanced: 30 };
for (const [difficulty, count] of Object.entries(counts)) {
  const history = new RecentHistory();
  const seen = new Set();
  for (let i = 0; i < count; i++) {
    const native = generateTraceChallenge({ difficulty, seed: i + 10000 });
    history.record(native);
    assert.equal(verifyChallengeModel(native).ok, true);
    assert.equal(native.difficultyMetrics.validated, true);
    assert.equal(new Set(native.choices.map(c => c.text)).size, native.choices.length);
    assert.equal(native.distractors.length, native.choices.length - 1);
    assert.ok(native.distractors.every(d => d.misconceptionId && d.explanation && d.text !== native.correct.text));
    assert.ok(!seen.has(native.signatures.exact));
    seen.add(native.signatures.exact);
    if (difficulty === "advanced") {
      assert.ok(native.difficultyMetrics.relevantChanges >= 3);
      assert.ok(native.difficultyMetrics.dependencyDepth >= 4);
      assert.ok(native.difficultyMetrics.variablesInSlice >= 2);
      assert.ok(native.coreReasoningFamilies.length >= 2);
    }
    const q = generateTrace({ difficulty, seed: i + 10000 });
    assert.equal(q.answer, native.correct.text);
    assert.deepEqual(q.choices, native.choices.map(c => c.text));
    assert.equal(q.traceRows.length, native.codeLines.length);
    assert.equal(assess(q, { answer: q.answer }), true);
    for (const wrong of q.choices.filter(choice => choice !== q.answer)) {
      assert.equal(assess(q, { answer: wrong }), false);
      const id = native.choices.find(choice => choice.text === wrong).id;
      assert.equal(getPostSubmissionView(native, id).correct, false);
    }
    if (native.format === "checkpoint") assert.match(q.code, new RegExp(`^${native.question.line}\\. `, "m"));
  }
  console.log(`${difficulty}: ${count} generated, model verified, choices and adapter checked`);
}
for (const mode of ["identify", "assemble", "trace"]) {
  const q = generate("variable-lab", mode, undefined, { difficulty: "beginner", seed: 777 });
  assert.equal(q.mode, mode);
  assert.ok(q.prompt);
}
console.log("Variable Lab mode generation passed.");
