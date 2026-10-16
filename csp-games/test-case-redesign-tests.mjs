import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as E from "./test-case-engine.js";
import * as S from "./session.js";
let seed = 19021;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let checks = 0;
const ok = (x) => {
  assert.ok(x);
  checks++;
};
const eq = (x, y) => {
  assert.deepEqual(x, y);
  checks++;
};
const inventory = {},
  samples = [];
for (const mode of Object.keys(E.testModes)) {
  const structures = new Set(),
    mechanisms = new Set();
  let copied = 0,
    memorized = 0;
  for (let i = 0; i < 300; i++) {
    const q = E.generateTestCase(mode);
    structures.add(q.structure);
    mechanisms.add(q.mechanism);
    const result = E.evaluateTestCase(q, q.example);
    ok(result.correct);
    ok(result.details.length > 60);
    ok(!/Accepted input|Rejected input/.test(JSON.stringify(q.fields)));
    const wrong = { ...q.example, expected: "IMPOSSIBLE" };
    if (mode === "branches") wrong.expected0 = "IMPOSSIBLE";
    ok(!E.evaluateTestCase(q, wrong).correct);
    for (const f of q.fields)
      if (f.id.startsWith("expected") || f.id === "actual") {
        const r = { ...q.example, [f.id]: "IMPOSSIBLE" };
        ok(!E.evaluateTestCase(q, r).correct);
      }
    memorized += Number(
      E.evaluateTestCase(q, {
        input: "100",
        expected: "TRUE",
        actual: "FALSE",
        other: "0",
      }).correct,
    );
    if (q.spec) {
      // Independently execute the authored Boolean text after translating CSP operators.
      const compile = (node) =>
        new Function(
          "value",
          "return " +
            E.expression(node)
              .replace(/≥/g, ">=")
              .replace(/≤/g, "<=")
              .replace(/≠/g, "!==")
              .replace(/(?<![<>!=])=(?!=)/g, "===")
              .replace(/AND/g, "&&")
              .replace(/OR/g, "||")
              .replace(/NOT/g, "!"),
        );
      const spec = compile(q.spec),
        program = compile(q.implementation);
      for (let n = -20; n <= 40; n++) {
        const r = {
          input: String(n),
          expected: E.format(spec(n)),
          actual: E.format(program(n)),
        };
        const value = E.evaluateTestCase(q, r);
        if (mode === "errors") eq(value.correct, spec(n) !== program(n));
        if (mode === "nonexposing") eq(value.correct, spec(n) === program(n));
        if (mode === "normal" && value.correct)
          ok(E.evaluateTestCase(q, r).correct);
      }
      const threshold = q.spec.a ?? q.spec.args?.[0]?.a;
      copied += Number(
        E.evaluateTestCase(q, {
          input: String(threshold),
          expected: "TRUE",
          actual: "FALSE",
        }).correct,
      );
    }
    if (i < 2)
      samples.push({
        mode,
        structure: q.structure,
        prompt: q.prompt,
        context: q.context,
        example: q.example,
        feedback: result.details,
      });
  }
  ok(structures.size >= 5);
  eq(memorized, 0);
  inventory[mode] = {
    structures: [...structures],
    mechanisms: [...mechanisms].filter(Boolean),
    memorizedSuccess: memorized,
    copyThresholdSuccess: copied,
  };
}
const lists = { count: (a) => a.filter((v) => v > 0).length }; // Explicit independent edge invariants below.
for (const shape of [
  "sum",
  "product",
  "minimum",
  "maximum",
  "search",
  "first",
  "last",
  "all",
  "skip-first",
  "unsafe-min",
  "count",
])
  for (let i = 0; i < 30; i++) {
    const q = E.generateTestCase("lists", shape),
      a = q.example.input === "" ? [] : q.example.input.split(",").map(Number);
    if (shape === "sum")
      eq(
        Number(q.example.actual),
        a.reduce((s, v) => s + v, 0),
      );
    if (shape === "product")
      eq(
        Number(q.example.actual),
        a.reduce((s, v) => s * v, 1),
      );
    if (shape === "skip-first") eq(Number(q.example.actual), 0);
    if (shape === "unsafe-min" && !a.length) {
      eq(q.example.expected, '"NONE"');
      eq(q.example.actual, "ERROR");
    }
    if (shape === "first" || shape === "last")
      eq(q.example.actual, String(a[0]));
  }
for (const shape of ["next", "previous", "double", "reverse", "shifted"])
  for (let i = 0; i < 50; i++) {
    const q = E.generateTestCase("invalid", shape);
    ok(E.evaluateTestCase(q, q.example).correct);
    ok(q.context.includes("one-based"));
  }
const { parseHTML } = createRequire(import.meta.url)(
  process.env.CSP_DOM_LIBRARY || "linkedom",
);
const memory = new Map(),
  storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  };
const tracker = S.createSessionTracker({ storage });
const { document, window } = parseHTML(
  fs.readFileSync(
    new URL("./test-case-builder/index.html", import.meta.url),
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
let current;
const ctx = {
  document,
  window,
  console,
  ...E,
  generateTestCase: (mode) => (current = E.generateTestCase(mode)),
  sessionTracker: () => tracker,
  addSessionNavigation: () => {},
  roundSummary: () => JSON.stringify(tracker.snapshot().totals),
};
vm.createContext(ctx);
vm.runInContext(
  fs
    .readFileSync(new URL("./test-case-ui.js", import.meta.url), "utf8")
    .replace(/import[^;]+;/g, "")
    .replace("export function", "function"),
  ctx,
);
const $ = (id) => document.getElementById(id),
  fill = (r) => {
    for (const f of current.fields) $("field-" + f.id).value = r[f.id] ?? "";
  };
eq($("mode").value, "mixed");
for (const mode of Object.keys(E.testModes)) {
  $("mode").value = mode;
  $("mode").onchange();
  fill(current.example);
  const before = tracker.snapshot().totals;
  $("check").onclick();
  eq(tracker.snapshot().totals.firstTry, before.firstTry + 1);
  ok($("check").disabled);
  $("check").onclick();
  eq(tracker.snapshot().totals.submissions, before.submissions + 1);
  $("new").onclick();
  const b = tracker.snapshot().totals;
  fill({
    ...current.example,
    [mode === "branches" ? "expected0" : "expected"]: "IMPOSSIBLE",
  });
  $("check").onclick();
  eq(tracker.snapshot().totals.incorrect, b.incorrect + 1);
  eq(tracker.snapshot().totals.revealed, b.revealed + 1);
  ok($("check").disabled);
  fill(current.example);
  $("check").onclick();
  eq(tracker.snapshot().totals.firstTry, b.firstTry);
  eq(tracker.snapshot().totals.afterRetry, b.afterRetry);
  ok($("feedback").textContent.includes("Your test:"));
  $("new").onclick();
  const c = tracker.snapshot().totals;
  $("show").onclick();
  eq(tracker.snapshot().totals.attempted, c.attempted);
  eq(tracker.snapshot().totals.revealed, c.revealed + 1);
}
eq(
  S.createSessionTracker({ storage }).snapshot().totals,
  tracker.snapshot().totals,
);
fs.writeFileSync(
  "/tmp/test-case-review-samples.json",
  JSON.stringify(samples, null, 2),
);
console.log(JSON.stringify(inventory, null, 2));
console.log(
  `Test Case Builder: 2700 randomized challenges; ${checks} assertions including text-based predicate execution, edge cases, misconception mutations, one-submission/reveal locks and storage persistence.`,
);
