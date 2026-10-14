import assert from "node:assert/strict";
import * as J from "./engine.js";
import { createCollectionModel } from "../csp-games/collection-editor.js";
import * as JS from "./session.js";
import * as CS from "../csp-games/session.js";
let seed = 237;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let count = 0;
for (const game of Object.keys(J.games)) {
  const seen = new Set();
  for (let n = 0; n < 600; n++) seen.add(J.generate(game).mode);
  assert.deepEqual([...seen].sort(), Object.keys(J.games[game].modes).sort());
  for (const mode of Object.keys(J.games[game].modes))
    for (let n = 0; n < 600; n++) {
      const q = J.generate(game, mode);
      count++;
      assert.ok(q.prompt && q.code && q.explanation);
      assert.ok(J.assess(q, J.solution(q)), `${game}/${mode}/${q.topic}`);
      if (q.root) {
        const ids = J.nodes(q.root).map((n) => n.id);
        assert.equal(ids.length, new Set(ids).size, "Unique AST IDs");
        if (q.kind === "select")
          assert.equal(ids.filter((id) => id === q.answerId).length, 1);
      }
      if (q.kind === "value") {
        assert.equal(q.choices.length, new Set(q.choices).size);
        assert.equal(q.choices.filter((x) => x === String(q.answer)).length, 1);
        assert.equal(J.assess(q, { answer: "impossible" }), false);
      }
      if (q.kind === "debug") {
        assert.notEqual(q.brokenSource, q.fixedSource);
        assert.equal(q.fixes.length, new Set(q.fixes).size);
        assert.equal(J.assess(q, { location: "none", fix: q.fix }), false);
        assert.equal(J.assess(q, { location: q.location, fix: "none" }), false);
        assert.ok(
          q.location.startsWith("token-"),
        );
      }
      if (q.kind === "multi") {
        assert.equal(new Set(q.answerIds).size, q.answerIds.length);
        assert.ok(q.answerIds.every((id) => q.cells.some((c) => c.id === id)));
        assert.equal(J.assess(q, { ids: ["none"] }), false);
      }
      if (q.kind === "collection") {
        assert.equal(J.assess(q, { values: q.answer.concat(999) }), false);
        if (q.fixed) assert.equal(q.answer.length, q.initial.length);
        assert.ok(q.answer.every((v) => q.bank.includes(v)));
      }
    }
}
for (const step of [-3, -2, -1, 1, 2, 3])
  for (const op of step > 0 ? ["<", "<=", "!="] : [">", ">=", "!="])
    for (let start = -4; start <= 4; start++)
      for (let n = 1; n <= 8; n++) {
        const bound = start + n * step,
          actual = J.loopValues({ start, bound, step, op });
        const count = op === ">=" || op === "<=" ? n + 1 : n;
        assert.equal(actual.values.length, count);
        assert.equal(actual.after, start + count * step);
        assert.equal(actual.values.at(-1), start + (count - 1) * step);
      }
for (const fixed of [false, true]) {
  const m = createCollectionModel([2, 2, 3], { fixed });
  assert.ok(m.replace(0, 9));
  assert.deepEqual(m.values, [9, 2, 3]);
  m.undo();
  assert.deepEqual(m.values, [2, 2, 3]);
  assert.equal(m.insert(1, 2), !fixed);
  assert.equal(m.remove(0), !fixed);
  m.reset();
  assert.deepEqual(m.values, [2, 2, 3]);
  assert.ok(m.move(0, 2));
  assert.equal(m.values.length, 3);
  m.undo();
  m.load([8, 8, 8]);
  assert.deepEqual(m.values, [8, 8, 8]);
}
const memory = new Map(),
  storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  },
  csp = CS.createSessionTracker({ storage }),
  java = JS.createSessionTracker({ storage });
const id = csp.begin("test", "CSP", "topic");
csp.submit(id, true);
const cspBefore = csp.snapshot();
const j = java.begin("variable-lab", "Variable Lab", "type");
java.submit(j, false);
java.submit(j, true);
assert.deepEqual(csp.snapshot(), cspBefore);
assert.equal(java.snapshot().totals.firstTry, 0);
assert.equal(java.snapshot().totals.afterRetry, 1);
java.reset(true);
assert.deepEqual(csp.snapshot(), cspBefore);
assert.notEqual(JS.SESSION_KEY, CS.SESSION_KEY);
console.log(
  `Java engine: ${count} seeded challenges; unique metadata, loop mathematics, collection rules, and isolated sessions passed.`,
);
