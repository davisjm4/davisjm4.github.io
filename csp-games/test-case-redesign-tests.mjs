import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as E from "./test-case-engine.js";
import * as S from "./session.js";
let seed = 5288;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let assertions = 0,
  generated = 0,
  executions = 0;
const ok = (x) => {
    assert.ok(x);
    assertions++;
  },
  eq = (a, b) => {
    assert.deepEqual(a, b);
    assertions++;
  };
// A separate test-only compiler evaluates the DISPLAYED pseudocode, not generator ASTs.
function independent(code, env) {
  let loop = 0;
  const predefined = [
    "value",
    "values",
    "text",
    "n",
    "index",
    "target",
    "limit",
  ];
  const names = [...code.matchAll(/\b(\w+) ←/g)]
    .map((m) => m[1])
    .filter((n) => !predefined.includes(n));
  let js = code
    .replace(/←/g, "§")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/≠/g, "!=")
    .replace(/(?<![<>=!])=(?!=)/g, "===")
    .replace(/§/g, "=")
    .replace(/\bAND\b/g, "&&")
    .replace(/\bOR\b/g, "||")
    .replace(/\bNOT\b/g, "!")
    .replace(/\bMOD\b/g, "%")
    .replace(/\bTRUE\b/g, "true")
    .replace(/\bFALSE\b/g, "false");
  js = js
    .replace(/(\w+)\[([^\]]+)\]/g, "GET($1,$2)")
    .replace(/PROCEDURE (\w+)\(([^)]*)\)/g, "function $1($2)")
    .replace(/REPEAT UNTIL \((.*)\) \{/g, "while (!($1)) {")
    .replace(
      /REPEAT (.*) TIMES \{/g,
      (_, n) => `for(let __r${loop}=0;__r${loop}<(${n});__r${loop++}++){`,
    )
    .replace(/FOR EACH (\w+) IN (\w+) \{/g, "for(const $1 of $2){")
    .replace(/\bIF\b/g, "if")
    .replace(/\bELSE\b/g, "else")
    .replace(/\bRETURN\(/g, "return (")
    .replace(/\bDISPLAY\(/g, "return (");
  const GET = (a, i) => {
    if (!Number.isInteger(i) || i < 1 || i > a.length) throw Error("index");
    return a[i - 1];
  };
  const SUBSTRING = (s, start, n) => {
    if (start < 1 || n < 0 || start + n > s.length + 1)
      throw Error("substring");
    return s.substring(start - 1, start + n - 1);
  };
  try {
    executions++;
    return new Function(
      "env",
      "GET",
      "LENGTH",
      "CHAR",
      "CONCAT",
      "SUBSTRING",
      `let {${predefined.join(",")}}=env;${names.length ? "let " + [...new Set(names)].join(",") + ";" : ""}\n${js}`,
    )(
      env,
      GET,
      (a) => a.length,
      GET,
      (a, b) => a + b,
      SUBSTRING,
    );
  } catch (err) {
    if (err instanceof SyntaxError)
      throw Error(
        "Invalid displayed code: " + code + "\n" + js + "\n" + err.message,
      );
    return "ERROR";
  }
}
function actual(q, input) {
  return independent(q.code, { ...q.env, [q.variable]: input });
}

function required(q, v) {
  const { k, lo, hi } = q.params;
  switch (q.structure) {
    case "lower-inclusive":
    case "wrong-constant":
      return v >= k;
    case "upper-inclusive":
      return v <= k;
    case "lower-exclusive":
      return v > k;
    case "upper-exclusive":
      return v < k;
    case "equality":
      return v === k;
    case "inequality":
      return v !== k;
    case "range-exclusive":
      return v > lo && v < hi;
    case "lower-shift":
    case "upper-shift":
      return v >= lo && v <= hi;
    case "range-branch":
      return v >= lo && v <= hi ? "OK" : "No";
    case "and-or":
      return v[0] < lo || v[1] > hi;
    case "missing-not":
      return v[0] % 2 === 0 && v[0] !== v[1];
    case "grouping":
      return (v[0] < lo || v[1] > hi) && v[0] % 2 === 0;
    case "compound-inclusive":
      return v[0] >= lo && v[1] <= hi;
    case "even-count":
      return Array.from({ length: v }, (_, i) => i + 1).filter(
        (i) => i % 2 === 0,
      ).length;
    case "loop-end":
    case "extra-iteration":
    case "counter-update":
      return Array.from({ length: v[0] }, (_, i) => i + 1).filter(
        (i) => i % v[1] === 0,
      ).length;
    case "skip-first":
      return v.reduce((n, x, i) => n + (i > 0 && x > v[i - 1] ? 1 : 0), 0);
    case "zero-iteration":
      return v <= 0
        ? 0
        : Array.from({ length: v }, (_, i) => i + 1).reduce((a, b) => a + b, 0);
    case "list-search":
      return v.some((x) => x === q.env.target);
    case "list-end":
      return v.reduce((a, b) => (a > b ? a : b));
    default:
      throw Error("Missing independent requirement " + q.structure);
  }
}
function goal(q, v) {
  if (q.task === "expose")
    return JSON.stringify(actual(q, v)) !== JSON.stringify(required(q, v));
  if (q.task === "output")
    return JSON.stringify(v) === JSON.stringify(actual(q, q.input));
  return actual(q, v) === q.goal;
}
const samples = [],
  benchmarks = {};
// A minimum of 100 per STRUCTURAL template, not merely 100 per category.
for (const [mode, shapes] of Object.entries(E.structures)) {
  let total = 0;
  const positions = [0, 0, 0, 0],
    signs = {};
  for (const shape of shapes) {
    const outcomes = new Set(),
      templatePositions = new Set();
    let copied = 0;
    for (let n = 0; n < 100; n++) {
      const q = E.generateTestCase(mode, shape);
      generated++;
      total++;
      eq(q.options.length, 4);
      eq(new Set(q.options.map((o) => JSON.stringify(o.value))).size, 4);
      eq(q.options.filter((o) => goal(q, o.value)).length, 1);
      ok(E.validateQuestion(q));
      eq(q.mode, mode);
      eq(q.structure, shape);
      ok(q.prompt.length < 90);
      ok(
        !/takes FALSE|then TRUE|above the range|below the range/i.test(
          q.prompt,
        ),
      );
      ok(q.code.split("\n").every((l) => l.length <= 36));
      ok(q.code.includes("\n") || q.code.startsWith("RETURN("));
      ok(q.explanation.length < 500);
      if (q.code.includes("CHAR(")) ok(/one-based/.test(q.docs));
      if (q.task === "expose") {
        ok(q.explanation.includes(E.format(q.expected(q.answer))));
        ok(q.explanation.includes(E.format(actual(q, q.answer))));
      }
      if (q.task === "output")
        ok(q.explanation.includes(E.format(actual(q, q.input))));
      ok(!/undefined|NaN/.test(q.context + q.explanation));
      for (const o of q.options) {
        eq(E.evaluateTestCase(q, { choice: o.id }).correct, goal(q, o.value));
        if (q.task !== "output")
          eq(E.run(q, o.value).result, actual(q, o.value));
        if (q.task === "expose") eq(q.expected(o.value), required(q, o.value));
      }
      if (q.task === "output") eq(E.run(q, q.input).result, actual(q, q.input));
      const key = q.options.find((o) => o.id === q.correctId),
        index = q.options.indexOf(key);
      positions[index]++;
      templatePositions.add(index);
      outcomes.add(JSON.stringify(key.value));
      if (q.task !== "output") {
        ok(
          E.appearanceSafe(
            q.options.map((o) => o.value),
            key.value,
          ),
        );
        const vals = q.options.map((o) => o.value);
        if (vals.every((v) => typeof v === "number")) {
          ok(key.value > Math.min(...vals) && key.value < Math.max(...vals));
          ok(!(vals.filter((v) => v > 0).length === 1 && key.value > 0));
          ok(!(vals.filter((v) => v < 0).length === 1 && key.value < 0));
          // Even within a comparison template, copying the stated threshold
          // must not identify every key. Boundary shifts create different keys.
          if (
            [
              "lower-inclusive",
              "upper-exclusive",
              "lower-exclusive",
              "upper-inclusive",
              "wrong-constant",
            ].includes(shape)
          ) {
            const copiedNumber = q.params.k;
            copied += key.value === copiedNumber ? 1 : 0;
          }
        }
        if (vals.every(Array.isArray))
          eq(new Set(vals.map((v) => v.length)).size, 1);
      }
      if (n === 0)
        samples.push({
          mode,
          shape,
          prompt: q.prompt,
          requirement: q.requirement,
          input: q.inputText,
          code: q.code,
          choices: q.options.map((o) => o.label),
          answer: key.label,
          explanation: q.explanation,
        });
    }
    eq(templatePositions.size, 4);
    if (
      [
        "lower-inclusive",
        "upper-exclusive",
        "lower-exclusive",
        "upper-inclusive",
        "wrong-constant",
      ].includes(shape)
    )
      ok(copied < 85);
    // Fixed-result empty-input identities are intentional; all other templates
    // must vary their answer, including valid/invalid character accesses.
    if (
      ![
        "empty-count",
        "empty-sum",
        "empty-product",
        "search-missing",
        "char-invalid",
        "zero-iteration",
      ].includes(shape)
    ) {
      if (outcomes.size <= 1) throw Error(`Fixed key ${mode}/${shape}`);
      ok(outcomes.size > 1);
    }
  }
  ok(positions.every((n) => n > total * 0.15 && n < total * 0.35));
  benchmarks[mode] = {
    questions: total,
    templates: shapes.length,
    answerPositions: positions,
  };
}
// Deliberately corrupt valid questions: the validator must reject every defect.
{
  const q = E.generateTestCase("bugs", "equality");
  const duplicate = {
    ...q,
    options: [q.options[0], q.options[0], ...q.options.slice(2)],
  };
  ok(!E.validateQuestion(duplicate));
  const allWrong = { ...q, qualify: () => false };
  ok(!E.validateQuestion(allWrong));
  const allRight = { ...q, qualify: () => true };
  ok(!E.validateQuestion(allRight));
  ok(!E.appearanceSafe([1, 4, 5, 6], 1));
  ok(!E.appearanceSafe([-1, 2, 3, 4], -1));
  ok(!E.appearanceSafe([[1], [1, 2], [2, 3], [3, 4]], [1]));
  ok(!E.appearanceSafe(["A", "AB", "CD", "EF"], "A"));
}
for (const mode of Object.keys(E.testModes)) {
  const deck = E.createTestDeck();
  let prev = "";
  for (let cycle = 0; cycle < 8; cycle++) {
    const seen = new Set();
    for (let i = 0; i < E.structures[mode].length; i++) {
      const q = deck.next(mode);
      eq(q.mode, mode);
      ok(q.structure !== prev);
      ok(E.reasonFamily(mode, q.structure) !== E.reasonFamily(mode, prev));
      prev = q.structure;
      seen.add(q.structure);
    }
    eq(seen.size, E.structures[mode].length);
  }
}
for (let trial = 0; trial < 30; trial++) {
  const deck = E.createTestDeck();
  let prev = "";
  for (let i = 0; i < 30; i += 5) {
    const modes = [];
    for (let j = 0; j < 5; j++) {
      const q = deck.next();
      modes.push(q.mode);
      ok(q.mode !== prev);
      prev = q.mode;
    }
    eq(new Set(modes).size, 5);
  }
}
const { parseHTML } = createRequire(import.meta.url)(
    process.env.CSP_DOM_LIBRARY || "linkedom",
  ),
  { document, window } = parseHTML(
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
const memory = new Map(),
  storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  },
  tracker = S.createSessionTracker({ storage });
let q;
const underlying = E.createTestDeck();
const context = {
  document,
  window,
  console,
  ...E,
  createTestDeck: () => ({ next: (mode) => (q = underlying.next(mode)) }),
  sessionTracker: () => tracker,
  addSessionNavigation: () => {},
  roundSummary: () => JSON.stringify(tracker.snapshot().totals),
};
vm.createContext(context);
vm.runInContext(
  fs
    .readFileSync(new URL("./test-case-ui.js", import.meta.url), "utf8")
    .replace(/import[^;]+;/g, "")
    .replace("export function", "function"),
  context,
);
const $ = (id) => document.getElementById(id),
  choose = (id) =>
    $("choices").querySelector(`[data-choice="${id}"]`).onclick();
eq($("mode").value, "mixed");
eq($("mode").querySelectorAll("option").length, 6);
eq(document.querySelectorAll("input,textarea").length, 0);
ok($("check").disabled);
for (const mode of Object.keys(E.testModes)) {
  $("mode").value = mode;
  $("mode").onchange();
  eq(q.mode, mode);
  let b = tracker.snapshot().totals;
  choose(q.options.find((o) => o.id !== q.correctId).id);
  ok($("feedback").hidden);
  $("check").onclick();
  eq(tracker.snapshot().totals.attempted, b.attempted + 1);
  eq(tracker.snapshot().totals.incorrect, b.incorrect + 1);
  eq(tracker.snapshot().totals.revealed, b.revealed + 1);
  ok($("check").disabled);
  eq($("choices").querySelectorAll(".answer").length, 1);
  $("check").onclick();
  eq(tracker.snapshot().totals.submissions, b.submissions + 1);
  $("next").onclick();
  b = tracker.snapshot().totals;
  choose(q.correctId);
  $("check").onclick();
  eq(tracker.snapshot().totals.firstTry, b.firstTry + 1);
  eq(tracker.snapshot().totals.afterRetry, 0);
  $("check").onclick();
  eq(tracker.snapshot().totals.submissions, b.submissions + 1);
  $("next").onclick();
  b = tracker.snapshot().totals;
  $("show").onclick();
  eq(tracker.snapshot().totals.revealed, b.revealed + 1);
  eq(tracker.snapshot().totals.attempted, b.attempted);
  $("check").onclick();
  eq(tracker.snapshot().totals.submissions, b.submissions);
  $("next").onclick();
  b = tracker.snapshot().totals;
  $("next").onclick();
  eq(tracker.snapshot().totals.skipped, b.skipped + 1);
}
eq(
  S.createSessionTracker({ storage }).snapshot().totals,
  tracker.snapshot().totals,
);
// Existing records, including old Test Case Builder topics, survive without a schema change.
const legacyId = tracker.begin(
  "test-case-builder",
  "Test Case Builder",
  "lists",
  "Empty & Single-element Lists",
);
tracker.submit(legacyId, true);
const before = tracker.snapshot();
const again = S.createSessionTracker({ storage });
eq(again.snapshot().games["test-case-builder"].topics.lists.firstTry, 1);
eq(again.snapshot().totals, before.totals);

fs.writeFileSync(
  "/tmp/tcb-spec-samples.json",
  JSON.stringify(samples, null, 2),
);
console.log(
  `Test Case Builder specification: ${generated} generated questions; ${assertions} assertions; ${executions} independent displayed-code executions. ${JSON.stringify(benchmarks)}`,
);
