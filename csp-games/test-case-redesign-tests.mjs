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
function intended(q, x) {
  const nums = (q.requirement.match(/-?\d+/g) || []).map(Number),
    [a, b] = nums;
  switch (q.structure) {
    case "inclusive":
    case "threshold":
      return x >= a;
    case "direction":
    case "range-end":
      return x >= a && x <= b;
    case "and-or":
      return x < a || x > b;
    case "negation":
      return !(x >= a && x <= b);
    case "loop-count":
      return x * 3;
    case "loop-update":
      return x <= 0 ? 0 : (x * (x + 1)) / 2;
    case "sum-initial":
    case "omit-last":
      return x.reduce((a, b) => a + b, 0);
    case "minimum-zero":
      return Math.min(...x);
    case "search-value":
      return x.indexOf(q.env.target) < 0 ? -1 : x.indexOf(q.env.target) + 1;
    default:
      throw Error(q.structure);
  }
}
function goal(q, x) {
  if (q.mode === "bugs")
    return JSON.stringify(actual(q, x)) !== JSON.stringify(intended(q, x));
  if (q.mode === "predict")
    return JSON.stringify(x) === JSON.stringify(actual(q, q.input));
  if (q.mode === "branches") {
    const result = actual(q, x);
    return (
      result ===
      {
        else: "Retry",
        middle: "middle",
        "nested-true": "even",
        "nested-false": "odd",
        compound: "outside",
        negated: "same",
        "missing-test": "middle",
        "fall-through": "middle",
      }[q.structure]
    );
  }
  if (q.mode === "edge") {
    switch (q.structure) {
      case "empty-sum":
      case "empty-product":
      case "guard-first":
        return x.length === 0;
      case "singleton":
      case "last-access":
        return x.length === 1;
      case "missing-search":
        return !!x.length && !x.includes(q.env.target);
      case "zero-loop":
        return x === 0;
      case "empty-text":
        return x === "";
      case "short-text":
        return x.length === 1 && actual(q, x) === "ERROR";
      case "precondition":
        return x < 1 || x > q.env.values.length;
    }
  }
  const accepted = q.domain.filter((v) => actual(q, v) === true);
  let answer;
  switch (q.structure) {
    case "above-exclusive":
      answer = Math.min(...accepted);
      break;
    case "below-exclusive":
      answer = Math.max(...accepted) + 1;
      break;
    case "upper-range":
      answer = Math.max(...accepted) + 1;
      break;
    case "lower-range":
      answer = Math.min(...accepted) - 1;
      break;
    case "compound-transition":
      answer = Math.min(...q.domain.filter((v) => actual(q, v) === "inside"));
      break;
    case "upper-index":
      answer = q.env.values.length + 1;
      break;
    case "first-index":
      answer = 0;
      break;
    case "repeat-transition": {
      const step = actual(q, 1);
      answer = Math.min(...q.domain.filter((v) => actual(q, v) === step * 2));
      break;
    }
    case "zero-one":
      answer = 1;
      break;
    case "string-end":
      answer = q.env.text.length + 1;
      break;
    default:
      throw Error(q.structure);
  }
  return x === answer;
}
const benchmarks = {},
  samples = [];
for (const [mode, shapes] of Object.entries(E.structures)) {
  let first = 0,
    longest = 0,
    copy = 0;
  const positions = new Set(),
    seen = new Set();
  for (let i = 0; i < 300; i++) {
    const q = E.generateTestCase(mode, shapes[i % shapes.length]);
    generated++;
    seen.add(q.structure);
    eq(q.mode, mode);
    eq(q.fields.length, 0);
    ok(q.options.length >= 3 && q.options.length <= 4);
    eq(new Set(q.options.map((o) => o.label)).size, q.options.length);
    eq(q.options.filter((o) => goal(q, o.value)).length, 1);
    eq(q.options.find((o) => goal(q, o.value)).id, q.correctId);
    ok(E.evaluateTestCase(q, q.example).correct);
    ok(q.code.split("\n").length <= 13);
    ok(q.prompt.length < 140);
    ok(q.explanation.length < 330);
    ok(q.options.every((o) => !("correct" in o) && !("role" in o)));
    positions.add(q.options.findIndex((o) => o.id === q.correctId));
    if (q.mode === "bugs")
      for (const input of q.domain) {
        eq(E.run(q, input).result, actual(q, input));
        eq(E.run(q, input, q.intended).result, intended(q, input));
      }
    else if (q.mode === "predict")
      eq(E.run(q, q.input).result, actual(q, q.input));
    else
      for (const o of q.options)
        eq(E.run(q, o.value).result, actual(q, o.value));
    for (const o of q.options) {
      const r = E.evaluateTestCase(q, { choice: o.id });
      eq(r.correct, o.id === q.correctId);
      ok(r.details.toLowerCase().includes(q.explanation.toLowerCase()));
      if (!r.correct) ok(r.details.includes(o.label));
    }
    first += Number(q.options[0].id === q.correctId);
    longest += Number(
      [...q.options].sort((a, b) => b.label.length - a.label.length)[0].id ===
        q.correctId,
    );
    const number = q.requirement.match(/-?\d+/)?.[0];
    copy += Number(
      number !== undefined &&
        q.options.find((o) => o.label === number)?.id === q.correctId,
    );
    if (i < shapes.length)
      samples.push({
        mode,
        structure: q.structure,
        prompt: q.prompt,
        requirement: q.requirement,
        docs: q.docs,
        input: q.inputText,
        code: q.code,
        options: q.options.map((o) => o.label),
        answer: q.options.find((o) => o.id === q.correctId).label,
        explanation: q.explanation,
      });
  }
  eq(seen.size, shapes.length);
  eq(positions.size, 4);
  ok(first < 115);
  ok(longest < 190);
  ok(copy < 180);
  benchmarks[mode] = {
    questions: 300,
    structures: seen.size,
    first,
    longest,
    copyFirstRequirementNumber: copy,
  };
}
// Balanced bags: each five mixed challenges contain every category, each targeted
// cycle contains every authored structure, and adjacent cycles never duplicate a shape.
for (const mode of Object.keys(E.testModes)) {
  // Every fresh 30-question Mixed run must avoid identical cross-mode algorithm families.
  for (let trial = 0; trial < 100; trial++) {
    const mixed = E.createTestDeck();
    let previous = "";
    for (let i = 0; i < 30; i++) {
      const q = mixed.next();
      ok(E.displayFamily(q.mode, q.structure) !== previous);
      previous = E.displayFamily(q.mode, q.structure);
    }
  }
  const deck = E.createTestDeck();
  let prev = "";
  for (let cycle = 0; cycle < 10; cycle++) {
    const seen = new Set();
    for (let i = 0; i < E.structures[mode].length; i++) {
      const q = deck.next(mode);
      ok(q.structure !== prev);
      ok(E.reasonFamily(mode, q.structure) !== E.reasonFamily(mode, prev));
      seen.add(q.structure);
      prev = q.structure;
    }
    eq(seen.size, E.structures[mode].length);
  }
}
// Every fresh 30-question Mixed run must avoid identical cross-mode algorithm families.
for (let trial = 0; trial < 100; trial++) {
  const mixed = E.createTestDeck();
  let previous = "";
  for (let i = 0; i < 30; i++) {
    const q = mixed.next();
    ok(E.displayFamily(q.mode, q.structure) !== previous);
    previous = E.displayFamily(q.mode, q.structure);
  }
}
const deck = E.createTestDeck();
let prev = "";
for (let cycle = 0; cycle < 20; cycle++) {
  const modes = [];
  for (let i = 0; i < 5; i++) {
    const q = deck.next();
    ok(q.mode !== prev);
    prev = q.mode;
    modes.push(q.mode);
  }
  eq(new Set(modes).size, 5);
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
  "/tmp/tcb-fast-samples.json",
  JSON.stringify(samples, null, 2),
);
fs.writeFileSync(
  "/tmp/tcb-fast-shortcuts.json",
  JSON.stringify(benchmarks, null, 2),
);
console.log(
  `Test Case Builder fast practice: ${generated} generated challenges; ${assertions} assertions; ${executions} independent displayed-code executions. ${JSON.stringify(benchmarks)}`,
);
