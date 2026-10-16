import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as A from "./architect-engine.js";
import * as S from "./session.js";
let seed = 930;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let checks = 0,
  programs = 0,
  inputs = 0;
const ok = (v) => {
    assert.ok(v);
    checks++;
  },
  eq = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  };
const samples = [];
for (const mode of Object.keys(A.architectModes)) {
  const shapes = new Set(),
    positions = new Set();
  let shortcut = 0;
  for (let j = 0; j < 100; j++) {
    const q = A.generateArchitect(mode);
    shapes.add(q.structure);
    positions.add(q.bank.findIndex((b) => b.id === q.solution[0]));
    programs++;
    inputs += q.tests.length;
    ok(A.evaluateArchitect(q, q.solution).correct);
    ok(q.bank.length > q.solution.length);
    ok(q.solution.length >= 2);
    eq(q.bank.length, new Set(q.bank.map((b) => b.id)).size);
    ok(!q.bank.some((b) => /\d\.\d{7}/.test(b.text)));
    for (const b of q.bank.filter((b) =>
      ["if", "for", "repeat", "until"].includes(b.node.type),
    ))
      ok(!b.node.body);
    const fail = A.evaluateArchitect(q, [...q.solution].reverse());
    ok(!fail.correct);
    ok(/Failing input/.test(fail.details));
    ok(/Expected returned value/.test(fail.details));
    const fixed = q.bank
      .filter((b) => b.node.type === "assign")
      .slice(0, 1)
      .concat(
        q.bank.filter((b) => b.node.type === "for").slice(0, 1),
        q.bank.filter((b) => b.node.type === "return").slice(0, 1),
      )
      .map((b) => b.id);
    shortcut += Number(A.evaluateArchitect(q, fixed).correct);
    if (j < 2)
      samples.push({
        mode,
        structure: q.structure,
        goal: q.goal,
        bank: q.bank.map((b) => b.text),
        solution: q.solution.map((id) => q.bank.find((b) => b.id === id).text),
        failure: fail.details,
      });
  }
  eq(shapes.size, 5);
  ok(positions.size > 1);
  ok(shortcut < 20);
}
// Mathematically equivalent add-then-multiply constructions, including noninteger offsets.
let equivalents = 0;
for (let j = 0; j < 60; j++) {
  const q = A.generateArchitect("sequence", 0),
    alt = q.bank.find(
      (b) =>
        b.node.type === "assign" &&
        b.node.value?.op === "+" &&
        b.node.value.args[1]?.op === "/",
    );
  ok(alt);
  const order = [q.solution[0], alt.id, q.solution[1], q.solution[3]];
  ok(A.evaluateArchitect(q, order).correct);
  equivalents++;
}
for (const mode of ["iteration", "counter", "accumulator"]) {
  const q = A.generateArchitect(
      mode,
      mode === "iteration" ? 0 : mode === "counter" ? 2 : 4,
    ),
    r = [...q.solution];
  [r[0], r[1]] = [r[1], r[0]];
  ok(A.evaluateArchitect(q, r).correct);
}
// The denominator-zero edge must not be silently accepted as an undefined numeric value.
ok(!A.closeEnough(NaN, NaN));
ok(A.closeEnough(1.3333333333333333 * 6, 8));
eq(A.closeEnough(false, 0), false);
const { parseHTML } = createRequire(import.meta.url)(
  process.env.CSP_DOM_LIBRARY || "linkedom",
);
const memory = new Map(),
  storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  },
  tracker = S.createSessionTracker({ storage });
const { document, window } = parseHTML(
  fs.readFileSync(
    new URL("./algorithm-architect/index.html", import.meta.url),
    "utf8",
  ),
);
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get() {
    return (
      this.querySelector("option[selected]")?.value ||
      this.querySelector("option")?.value ||
      ""
    );
  },
  set(v) {
    for (const o of this.querySelectorAll("option")) {
      o.removeAttribute("selected");
      if (o.value === v) o.setAttribute("selected", "");
    }
  },
});
let q;
const ctx = {
  document,
  window,
  console,
  ...A,
  generateArchitect: (mode) => (q = A.generateArchitect(mode)),
  sessionTracker: () => tracker,
  addSessionNavigation: () => {},
  roundSummary: () => JSON.stringify(tracker.snapshot().totals),
};
vm.createContext(ctx);
vm.runInContext(
  fs
    .readFileSync(new URL("./architect-ui.js", import.meta.url), "utf8")
    .replace(/import[^;]+;/g, "")
    .replace("export function", "function"),
  ctx,
);
const $ = (id) => document.getElementById(id);
const fill = (order) => {
  while ($("construction").querySelector("[data-remove]"))
    $("construction").querySelector("[data-remove]").onclick();
  for (const id of order)
    $("bank").querySelector(`[data-add="${id}"]`).onclick();
};
eq($("mode").value, "mixed");
for (const mode of Object.keys(A.architectModes)) {
  $("mode").value = mode;
  $("mode").onchange();
  const b = tracker.snapshot().totals;
  fill([...q.solution].reverse());
  $("check").onclick();
  eq(tracker.snapshot().totals.incorrect, b.incorrect + 1);
  ok(!$("check").disabled);
  ok($("feedback").textContent.includes("Failing input"));
  fill(q.solution);
  $("check").onclick();
  eq(tracker.snapshot().totals.firstTry, b.firstTry);
  eq(tracker.snapshot().totals.afterRetry, b.afterRetry + 1);
  eq(tracker.snapshot().totals.submissions, b.submissions + 2);
  ok($("check").disabled);
  $("new").onclick();
  const c = tracker.snapshot().totals;
  $("show").onclick();
  eq(tracker.snapshot().totals.revealed, c.revealed + 1);
  eq(tracker.snapshot().totals.attempted, c.attempted);
  $("check").onclick();
  eq(tracker.snapshot().totals.submissions, c.submissions);
}
eq(
  S.createSessionTracker({ storage }).snapshot().totals,
  tracker.snapshot().totals,
);
fs.writeFileSync(
  "/tmp/architect-review-samples.json",
  JSON.stringify(samples, null, 2),
);
console.log(
  `Algorithm Architect: ${programs} randomized constructions across 45 structures; ${inputs} domain-input executions; ${checks} integrity/interaction assertions; ${equivalents} floating-point-equivalent alternatives accepted.`,
);
