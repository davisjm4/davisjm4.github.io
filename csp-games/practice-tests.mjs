import assert from "node:assert/strict";
import * as P from "./practice-engine.js";
let seed = 745;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let generated = 0;
for (const [slug, g] of Object.entries(P.practiceGames)) {
  const seen = new Set();
  for (let n = 0; n < 1000; n++) seen.add(P.generatePractice(slug).mode);
  assert.deepEqual([...seen].sort(), Object.keys(g.modes).sort());
  for (const mode of Object.keys(g.modes))
    for (let n = 0; n < 160; n++) {
      const q = P.generatePractice(slug, mode);
      generated++;
      assert.equal(q.mode, mode);
      assert.equal(q.game, slug);
      assert.ok(q.prompt && q.context && q.explanation);
      assert.equal(q.hints.length, 3);
      const answer = P.solutionPractice(q);
      assert.ok(
        P.validatePractice(q, answer),
        `${slug}/${mode} model answer failed`,
      );
      for (const f of q.fields || [])
        if (f.type === "select") {
          assert.equal(
            new Set(f.options.map((o) => o.value)).size,
            f.options.length,
          );
          if (f.correct)
            assert.equal(
              f.options.filter((o) => o.value === f.correct).length,
              1,
            );
        }
      if (q.kind === "fields") {
        const r = { ...answer };
        r[q.fields[0].id] = "invalid choice";
        assert.equal(P.validatePractice(q, r), false);
      }
      if (q.kind === "response") {
        const wrong = {
          ...answer,
          claim: q.items.find((i) => i.role === "claim" && !i.correct).id,
          order: ["invalid"],
        };
        assert.equal(P.validatePractice(q, wrong), false);
      }
      if (q.kind === "multi") {
        assert.equal(new Set(q.items.map((x) => x.text)).size, q.items.length);
        assert.equal(
          P.validatePractice(q, { selected: [q.correct[0]] }),
          false,
        );
        assert.equal(
          P.validatePractice(q, { selected: q.items.map((x) => x.id) }),
          false,
        );
      }
      if (q.kind === "architect") {
        assert.equal(
          P.validatePractice(q, {
            ...answer,
            order: [...answer.order].reverse(),
          }),
          false,
        );
        assert.equal(
          P.validatePractice(q, {
            ...answer,
            order: answer.order.concat(answer.order[0]),
          }),
          false,
        );
        for (const input of P.algorithmTests(q))
          assert.ok(
            P.algorithmEquivalent(
              P.executeAlgorithm(q, answer, input).value,
              P.expectedAlgorithm(q, input),
            ),
          );
      }
      if (q.kind === "test") {
        assert.equal(q.fields.length, 0);
        assert.equal(P.validatePractice(q, { choice: "invalid" }), false);
        for (const o of q.options)
          assert.equal(
            P.validatePractice(q, { choice: o.id }),
            o.id === q.correctId,
          );
      }
    }
}
for (let seed = 0; seed < 100; seed++) {
  const a = P.runModel({ seed, probability: 4, trials: 100 }),
    b = P.runModel({ seed, probability: 4, trials: 100 });
  assert.deepEqual(a, b);
  assert.equal(a.success, a.outcomes.filter(Boolean).length);
  assert.equal(a.running.at(-1), a.rate);
  assert.equal(P.runModel({ seed, probability: 0, trials: 100 }).success, 0);
  assert.equal(P.runModel({ seed, probability: 10, trials: 100 }).success, 100);
}
assert.throws(() => P.runModel({ seed: -1, probability: 4, trials: 100 }));
console.log(
  `Practice engine: ${generated} seeded challenges passed; all modes, models, valid alternatives, edge cases, and incorrect responses verified.`,
);
const E = await import("./engine.js");
for (let i = 0; i < 4000; i++) {
  const bits = [4, 6, 8, 16][i % 4],
    q = E.binaryExtension("overflow", bits);
  assert.ok(
    q.a >= 0 && q.a <= 2 ** bits - 1 && q.b >= 0 && q.b <= 2 ** bits - 1,
  );
  assert.equal(q.overflow, q.a + q.b >= 2 ** bits);
  assert.equal(q.result, (q.a + q.b) % 2 ** bits);
  const pixel = E.binaryExtension("pixels", bits);
  assert.equal(pixel.size, 9 * bits);
  assert.equal(pixel.target, pixel.pixels[pixel.index]);
  const c = E.cleaningChallenge(),
    used = new Set(),
    rows = c.rows.map((r) => {
      const keep = r.meters !== "" && !used.has(r.id);
      if (keep) used.add(r.id);
      return {
        ...r,
        keep,
        category: r.category.trim().toLowerCase(),
        cm: Math.round(Number(r.meters) * 100),
      };
    });
  assert.ok(E.validateCleaning(c, rows));
  rows.find((r) => r.keep).cm++;
  assert.equal(E.validateCleaning(c, rows), false);
}
console.log(
  "Existing-game expansion: 4,000 randomized overflow, pixel, and cleaning challenges verified.",
);
let passageChecks = 0;
for (let n = 0; n < 2000; n++) {
  const q = P.generatePractice("mixed-ap-practice");
  if (!q.passage) continue;
  let next = q;
  for (let i = 0; i < 6; i++) {
    next = P.passageFollowup(next);
    assert.equal(next.context, q.context);
    assert.ok(P.validatePractice(next, P.solutionPractice(next)));
    assert.notEqual(next.prompt, "");
    passageChecks++;
  }
}
assert.ok(passageChecks > 500);
console.log(`${passageChecks} shared-passage follow-up answers verified.`);
