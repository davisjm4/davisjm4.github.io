import assert from "node:assert/strict";
import * as X from "./concepts-expanded.js";
import { assess, components } from "./concepts-engine.js";
import { createConceptSession } from "./concepts-feedback.js";
import { createSessionTracker } from "./session.js";
let seed = 41;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const seen = new Set();
let reverse = 0,
  forward = 0;
for (let i = 0; i < 16000; i++) {
  const q = X.generateConcept();
  seen.add(q.category);
  q.direction === "reverse" ? reverse++ : forward++;
  assert.ok(q.code && q.explanation && q.prompt);
  const answer =
    q.interaction === "count" || q.interaction === "term"
      ? q.answer
      : q.answerIds;
  assert.ok(assess(q, answer));
  if (q.interaction === "term") {
    assert.equal(new Set(q.choices).size, q.choices.length);
    assert.ok(q.choices.length >= 3 && q.choices.length <= 5);
    assert.equal(q.choices.filter((c) => c === q.answer).length, 1);
    assert.ok(
      q.highlightIds.every((id) => components(q.root).some((n) => n.id === id)),
    );
  }
  const tracker = createSessionTracker({
    storage: { getItem: () => null, setItem: () => {} },
  });
  const s = createConceptSession({ tracker });
  s.begin(q);
  const wrong =
    q.interaction === "count"
      ? 9999
      : q.interaction === "term"
        ? q.choices.find((c) => c !== q.answer)
        : ["snippet"];
  for (let n = 0; n < 3; n++) {
    const r = s.submit(wrong);
    assert.equal(r.correct, false);
    assert.ok(r.hint);
    assert.equal(s.round.status, "active");
  }
  assert.ok(s.submit(answer).correct);
  assert.equal(s.round.status, "solved");
  assert.equal(s.submit(answer).scored, false);
  s.begin(q);
  assert.ok(s.reveal());
  assert.equal(s.submit(answer).scored, false);
}
assert.deepEqual([...seen].sort(), Object.keys(X.categoryLabels).sort());
assert.ok(reverse > 4000 && forward > 4000);
for (const category of Object.keys(X.categoryLabels))
  for (let i = 0; i < 100; i++)
    assert.equal(X.generateConcept(category).category, category);
console.log(
  `Expanded concepts: 16,000 valid challenges; ${reverse} reverse / ${forward} forward; all eight categories, retries and reveal verified.`,
);
for (let i = 0; i < 2000; i++) {
  const q = X.generateConcept(
    "variables",
    i % 2 ? "comparison" : "boolean-expression",
    "reverse",
  );
  assert.equal(
    q.choices.includes("Comparison") &&
      q.choices.includes("Boolean expression"),
    false,
    "Overlapping correct terminology excluded",
  );
}
