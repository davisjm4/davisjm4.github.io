import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as A from "./architect-engine.js";
import * as S from "./session.js";

let seed = 930;
Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let checks = 0, generated = 0, missing = 0, arranged = 0;
const ok = (value) => { assert.ok(value); checks++; },
  eq = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const signature = (q, option) => JSON.stringify(q.tests.map((input) => {
  const bank = [...q.bank, { id: "test-choice", text: option.text, node: option.node }],
    order = q.solution.map((id, i) => i === q.missingIndex ? "test-choice" : id),
    result = A.runConstruction({ ...q, bank }, order, input);
  return result.error ? `error:${result.error}` : result.returned ? ["return", result.value] : ["no-return"];
}));
const structures = new Set(), positions = new Set(), components = new Set(), families = new Set(), samples = [];
for (const mode of Object.keys(A.architectModes)) {
  const modes = { missing: 0, arrange: 0 };
  for (let i = 0; i < 100; i++) {
    const q = A.generateArchitect(mode);
    generated++;
    modes[q.format]++;
    structures.add(q.structure);
    families.add(mode);
    if (q.format === "missing") {
      missing++;
      components.add(q.component);
      eq(q.options.length, 4);
      eq(new Set(q.options.map((option) => option.text)).size, 4);
      eq(q.options.filter((option) => option.correct).length, 1);
      ok(q.missingText.includes("???"));
      ok(q.tests.length <= 49);
      ok(q.tests.length > 1);
      ok(!q.goal.includes(q.options.find((option) => option.correct).text));
      const behaviors = new Set(q.options.map((option) => signature(q, option)));
      eq(behaviors.size, 4);
      for (const option of q.options)
        eq(A.evaluateMissing(q, option.id).correct, Boolean(option.correct));
      const correct = q.options.find((option) => option.correct);
      ok(A.evaluateArchitect(q, q.solution).correct);
      positions.add(q.missingIndex);
      if (i < 2) samples.push({ mode, format: q.format, goal: q.goal, component: q.component, shown: q.missingText, choices: q.options.map((o) => o.text) });
    } else {
      arranged++;
      ok(q.solution.length >= 3 && q.solution.length <= 5);
      ok(q.mode === "sequence" || q.mode === "procedure");
      ok(q.bank.length > q.solution.length);
      ok(A.evaluateArchitect(q, q.solution).correct);
      const fail = A.evaluateArchitect(q, [...q.solution].reverse());
      ok(!fail.correct);
      ok(/Failing input/.test(fail.details));
      ok(/Expected returned value/.test(fail.details));
      if (i < 2) samples.push({ mode, format: q.format, goal: q.goal, solution: q.solution.map((id) => q.bank.find((b) => b.id === id).text) });
    }
    ok(!q.bank.some((block) => /\d\.\d{7}/.test(block.text)));
  }
  ok(modes.missing >= 75);
}
ok(generated >= 500);
ok(missing > arranged * 3);
ok(positions.size > 2);
for (const needed of ["initialization", "condition", "update", "return", "loop boundary", "procedure call"]) ok(components.has(needed));
eq(families.size, 9);
ok(structures.size >= 70);

// Equivalent floating-point constructions remain accepted, and one-based indexing is preserved.
ok(A.closeEnough(1.3333333333333333 * 6, 8));
ok(!A.closeEnough(NaN, NaN));
eq(A.closeEnough(false, 0), false);
const arrangedQ = A.generateArchitect("sequence", 1);
arrangedQ.format = "arrange";
const model = A.evaluateArchitect(arrangedQ, arrangedQ.solution);
ok(model.correct);
const reversed = A.evaluateArchitect(arrangedQ, [...arrangedQ.solution].reverse());
ok(!reversed.correct);
ok(/Failing input/.test(reversed.details) && /Expected returned value/.test(reversed.details) && /Your algorithm:/.test(reversed.details));

// Exercise the actual UI in every mode, one-answer feedback, revisions, reveal, and tracking.
const { parseHTML } = createRequire(import.meta.url)(process.env.CSP_DOM_LIBRARY || "linkedom"),
  memory = new Map(), storage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) },
  tracker = S.createSessionTracker({ storage });
const { document, window } = parseHTML(fs.readFileSync(new URL("./algorithm-architect/index.html", import.meta.url), "utf8"));
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get() { return this.querySelector("option[selected]")?.value || this.querySelector("option")?.value || ""; },
  set(value) { for (const option of this.querySelectorAll("option")) { option.removeAttribute("selected"); if (option.value === value) option.setAttribute("selected", ""); } },
});
let currentQ, queuedQ = null;
const ctx = {
  document, window, console, ...A,
  generateArchitect: (mode) => (currentQ = queuedQ || A.generateArchitect(mode), queuedQ = null, currentQ),
  sessionTracker: () => tracker,
  addSessionNavigation: () => {},
  roundSummary: () => JSON.stringify(tracker.snapshot().totals),
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("./architect-ui.js", import.meta.url), "utf8").replace(/import[^;]+;/g, "").replace("export function", "function"), ctx);
const $ = (id) => document.getElementById(id),
  clickChoice = (button) => button.onclick(),
  getButtons = (selector) => [...$("stage").querySelectorAll(selector)];
eq($("mode").value, "mixed");
for (const [mode] of Object.entries(A.architectModes)) {
  const nextMissing = () => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const question = A.generateArchitect(mode);
      if (question.format === "missing") return question;
    }
    throw Error(`No missing-component item generated for ${mode}`);
  };
  queuedQ = nextMissing();
  $("mode").value = mode;
  $("mode").onchange();
  const correct = currentQ.options.find((option) => option.correct), wrong = currentQ.options.find((option) => !option.correct), before = tracker.snapshot().totals;
  ok(getButtons("[data-choice]").length === 4);
  ok(!$("stage").querySelector("input, textarea, [contenteditable=true]"));
  clickChoice($("stage").querySelector(`[data-choice="${wrong.id}"]`));
  $("check").onclick();
  eq(tracker.snapshot().totals.incorrect, before.incorrect + 1);
  ok($("feedback").textContent.includes("Not quite."));
  ok($("feedback").textContent.includes(correct.text));
  ok($("check").disabled);
  clickChoice($("stage").querySelector(`[data-choice="${correct.id}"]`));
  $("check").onclick();
  eq(tracker.snapshot().totals.submissions, before.submissions + 1);
  $("next").onclick();
}

// Arrange mode records the first failure, names a concrete counterexample, then permits revision.
arrangedQ.format = "arrange";
queuedQ = arrangedQ;
$("mode").value = "sequence"; $("mode").onchange();
function fill(order) {
  while ($("construction").querySelector("[data-remove]")) $("construction").querySelector("[data-remove]").onclick();
  for (const id of order) $("bank").querySelector(`[data-add="${id}"]`).onclick();
}
const arrangeBefore = tracker.snapshot().totals;
fill([...currentQ.solution].reverse());
$("check").onclick();
eq(tracker.snapshot().totals.incorrect, arrangeBefore.incorrect + 1);
ok($("feedback").textContent.includes("Failing input"));
ok($("feedback").textContent.includes("Expected returned value"));
fill(currentQ.solution);
$("check").onclick();
eq(tracker.snapshot().totals.afterRetry, arrangeBefore.afterRetry + 1);
eq(tracker.snapshot().totals.submissions, arrangeBefore.submissions + 2);
ok($("check").disabled);
queuedQ = arrangedQ;
$("new").onclick();
const revealBefore = tracker.snapshot().totals;
$("show").onclick();
eq(tracker.snapshot().totals.revealed, revealBefore.revealed + 1);
eq(tracker.snapshot().totals.attempted, revealBefore.attempted);
eq(S.createSessionTracker({ storage }).snapshot().totals, tracker.snapshot().totals);

const css = fs.readFileSync(new URL("./redesign.css", import.meta.url), "utf8");
ok(/\.choice\s*\{[^}]*min-height:\s*3\.25rem/s.test(css));
ok(/@media\s*\(max-width:\s*600px\)[^{]*\{\s*\.choice-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/s.test(css));
fs.writeFileSync("/tmp/architect-review-samples.json", JSON.stringify(samples, null, 2));
console.log(`Algorithm Architect: ${generated} generated challenges across ${families.size} modes (${missing} missing-component, ${arranged} arrange); ${checks} generator, semantic, UI, feedback, session, and responsive checks passed.`);
