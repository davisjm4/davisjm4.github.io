// Run from either checkout. Pass an absolute loop-engine.js path to print a baseline.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { runJobs } from "./helpers/java-batch.mjs";

const baseline = process.argv[2];
const { generateChallenge } = await import(baseline ? pathToFileURL(baseline) : "../loop-engine.js");
const cells = [
  ["conditional", "beginner", 244],
  ["conditional", "intermediate", 283],
  ["conditional", "advanced", 266],
  ["iterations", "advanced", 277],
];
const jobs = [], questions = [], report = {};
for (const [mode, difficulty, previousHits] of cells) {
  const buckets = {};
  for (const [split, start] of [["training", 100000], ["validation", 900000]]) {
    for (let i = 0; i < 500; i++) {
      const input = { mode, difficulty, seed: start + i * 29 };
      const q = generateChallenge(input);
      assert.equal(q.choices.length, 4);
      if (!q.choices.every(choice => /^-?\d+$/.test(choice))) continue;
      const numbers = q.choices.map(Number);
      assert.equal(new Set(numbers).size, 4);
      const rank = numbers.sort((a, b) => a - b).indexOf(Number(q.answer));
      assert.notEqual(rank, -1);
      for (const key of ["all", q.variant]) {
        const bucket = buckets[key] ??= { training: [0, 0, 0, 0], validation: [0, 0, 0, 0], fallback: 0 };
        bucket[split][rank]++;
        if (split === "validation" && q.distractors.some(d => d.misconception === "fallback")) bucket.fallback++;
      }
      if (baseline || split !== "validation") continue;
      assert.deepEqual(q, generateChallenge(input));
      assert.ok(q.explanation.includes(q.answer));
      assert.ok(q.distractors.every(d => d.note && d.misconception !== "fallback"));
      let code = q.code;
      if (mode === "iterations") {
        assert.ok(numbers.every(n => n >= 0));
        assert.match(code, /\b(?:for|while)\s*\([^\n]+\)\s*\{/);
        code = code.replace(/(\b(?:for|while)\s*\([^\n]+\)\s*\{)/, "$1\n__bb++;");
        code += "\nSystem.out.println(__bb);";
      } else {
        const variable = q.prompt.match(/final value of (\w+)\?$/)?.[1];
        assert.ok(variable, q.prompt);
        code += "\nSystem.out.println(" + variable + ");";
      }
      jobs.push({ code });
      questions.push(q);
    }
  }
  for (const bucket of Object.values(buckets)) {
    bucket.rank = bucket.training.indexOf(Math.max(...bucket.training));
    bucket.hits = bucket.validation[bucket.rank];
    bucket.total = bucket.validation.reduce((a, b) => a + b, 0);
  }
  if (!baseline) {
    assert.equal(buckets.all.total, 500);
    assert.ok(buckets.all.hits < previousHits, mode + "/" + difficulty);
  }
  report[mode + "/" + difficulty] = buckets;
}
if (!baseline) {
  const zero = generateChallenge({ mode: "iterations", difficulty: "beginner", family: "zero-start", seed: 14 });
  assert.equal(zero.answer, "0");
  for (const [index, result] of runJobs(jobs).entries()) {
    const q = questions[index];
    const expected = result.out?.at(-1);
    assert.ok(result.ok && !result.exc, q.id + ": " + (result.compileError || result.exc));
    assert.equal(expected, q.answer, q.id);
    assert.equal(q.choices.filter(choice => choice === expected).length, 1, q.id);
  }
  console.error("JVM verified all " + jobs.length + " held-out displayed Java snippets.");
}
console.log(JSON.stringify(report, null, 2));
