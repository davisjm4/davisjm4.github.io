import assert from "node:assert/strict";
import {
  categories,
  variants,
  generateConcept,
  components,
} from "./concepts-engine.js";
import { conceptHint, createConceptSession } from "./concepts-feedback.js";
let checks = 0;
const ok = (v) => {
    assert.ok(v);
    checks++;
  },
  same = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  };
for (let category of categories)
  for (let variant of variants[category])
    for (let i = 0; i < 50; i++) {
      let q = generateConcept(category, variant),
        other = generateConcept(category, variant),
        s = createConceptSession(),
        correct = q.interaction === "count" ? q.answer : q.answerIds,
        wrong =
          q.interaction === "count"
            ? q.answer === "unknown"
              ? 1
              : q.answer + 1
            : [
                components(q.root).find(
                  (n) => n.id !== "snippet" && !q.answerIds.includes(n.id),
                ).id,
              ];
      for (let a = 1; a <= 3; a++) {
        same(conceptHint(q, a), conceptHint(other, a));
        ok(conceptHint(q, a) !== conceptHint(q, a + 1) || a === 3);
      }
      same(conceptHint(q, 3), conceptHint(q, 100));
      s.begin(q);
      for (let a = 1; a <= 4; a++) {
        let r = s.submit(wrong);
        same(r.status, "active");
        ok(!r.correct);
        same(r.hint, conceptHint(q, a));
      }
      let r = s.submit(correct);
      ok(r.correct);
      ok(!r.firstTry);
      same(s.totals, {
        attempted: 1,
        firstTry: 0,
        retry: 1,
        revealed: 0,
        streak: 0,
      });
      s.submit(correct);
      same(s.totals.retry, 1);
      ok(!s.reveal());
      s.begin(q);
      s.reveal();
      same(s.round.status, "revealed");
      r = s.submit(correct);
      ok(!r.scored);
      same(s.totals, {
        attempted: 2,
        firstTry: 0,
        retry: 1,
        revealed: 1,
        streak: 0,
      });
      ok(!s.reveal());
      s.begin(q);
      s.submit(wrong);
      s.reveal();
      s.submit(correct);
      same(s.totals, {
        attempted: 3,
        firstTry: 0,
        retry: 1,
        revealed: 2,
        streak: 0,
      });
      s.begin(q);
      r = s.submit(correct);
      ok(r.firstTry);
      same(s.totals, {
        attempted: 4,
        firstTry: 1,
        retry: 1,
        revealed: 2,
        streak: 1,
      });
    }
console.log(
  `PASS: ${checks} hint and scoring-state assertions across every Code Concepts variant.`,
);
