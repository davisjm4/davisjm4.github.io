import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as R from "./response-engine.js";
import * as S from "./session.js";

let seed = 3283;
Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };

const samples = [];
let generated = 0;
let longestCorrect = 0;
let firstCorrect = 0;

for (const [mode, pool] of Object.entries(R.responsePools)) {
  ok(pool.length >= 6, `${mode} needs several distinct structures`);
  eq(new Set(pool.map((item) => item.structure)).size, pool.length);
  for (const source of pool) {
    for (const support of Object.keys(R.supportNames)) {
      const question = R.generateResponse(mode, support, source.structure);
      generated++;
      eq(question.mode, mode);
      eq(question.support, support);
      eq(question.structure, source.structure);
      eq(question.choices.length, 4);
      eq(question.choices.filter((choice) => choice.correct).length, 1);
      eq(new Set(question.choices.map((choice) => choice.text)).size, 4);
      ok(question.code.length > 20);
      ok(question.prompt.endsWith("?") || question.prompt.endsWith("..."));
      ok(question.choices.every((choice) => !/^(answer|evidence|explain)\s*:/i.test(choice.text)));
      ok(question.choices.every((choice) => choice.text.length >= 20));
      eq(Boolean(question.reminder), support === "full");
      const correct = R.evaluateResponse(question, question.correctId);
      ok(correct.complete && correct.correct);
      ok(correct.details.includes(question.answer));
      for (const choice of question.choices.filter((choice) => !choice.correct)) {
        const wrong = R.evaluateResponse(question, choice.id);
        ok(wrong.complete && !wrong.correct);
        ok(wrong.details.includes("Why your choice is inaccurate:"));
      }
      ok(!R.evaluateResponse(question, "missing").complete);
    }
  }
  samples.push(R.generateResponse(mode, "full"));
}

// Generate well over the requested 500 questions and exercise choice shuffling.
const modeCounts = Object.fromEntries(Object.keys(R.responseModes).map((mode) => [mode, 0]));
const structureCounts = Object.fromEntries(Object.keys(R.responseModes).map((mode) => [mode, new Set()]));
const answerPositions = new Set();
for (let i = 0; i < 1000; i++) {
  const question = R.generateResponse("mixed", i % 2 ? "full" : "minimal");
  generated++;
  modeCounts[question.mode]++;
  structureCounts[question.mode].add(question.structure);
  const correctIndex = question.choices.findIndex((choice) => choice.correct);
  answerPositions.add(correctIndex);
  firstCorrect += Number(correctIndex === 0);
  const max = Math.max(...question.choices.map((choice) => choice.text.length));
  longestCorrect += Number(question.choices[correctIndex].text.length === max);
}
for (const mode of Object.keys(R.responseModes)) {
  ok(modeCounts[mode] > 140, `${mode} should appear regularly`);
  eq(structureCounts[mode].size, R.responsePools[mode].length);
}
eq(answerPositions.size, 4);
ok(firstCorrect < 330, "first-position guessing must not dominate");
ok(longestCorrect < 600, "longest-answer guessing must not dominate");

const { parseHTML } = createRequire(import.meta.url)(
  process.env.CSP_DOM_LIBRARY || "linkedom",
);
const { document, window } = parseHTML(
  fs.readFileSync(new URL("./response-builder/index.html", import.meta.url), "utf8"),
);
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get() {
    return this.querySelector("option[selected]")?.value || this.querySelector("option")?.value || "";
  },
  set(value) {
    for (const option of this.querySelectorAll("option")) {
      option.removeAttribute("selected");
      if (option.value === value) option.setAttribute("selected", "");
    }
  },
});

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
};
const tracker = S.createSessionTracker({ storage });
let current;
const context = {
  document,
  window,
  console,
  ...R,
  generateResponse: (mode, support) => (current = R.generateResponse(mode, support)),
  sessionTracker: () => tracker,
  addSessionNavigation: () => {},
  roundSummary: () => JSON.stringify(tracker.snapshot().totals),
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(new URL("./response-ui.js", import.meta.url), "utf8")
    .replace(/import[^;]+;/g, "")
    .replace("export function", "function"),
  context,
);
const $ = (id) => document.getElementById(id);
eq($("mode").value, "mixed");
eq($("support").value, "full");
eq($("choices").querySelectorAll("button").length, 4);
ok(Boolean(document.querySelector(".support-reminder")));
ok($("submit").disabled);

const before = tracker.snapshot().totals;
const wrongButton = [...$("choices").querySelectorAll("button")]
  .find((button) => !current.choices.find((choice) => choice.id === button.dataset.choice).correct);
wrongButton.onclick();
ok(!$("submit").disabled);
$("submit").onclick();
eq(tracker.snapshot().totals.attempted, before.attempted + 1);
eq(tracker.snapshot().totals.incorrect, before.incorrect + 1);
eq(tracker.snapshot().totals.revealed, before.revealed + 1);
ok($("submit").disabled);
ok($("feedback").textContent.includes("Correct answer:"));
ok($("feedback").textContent.includes("Why your choice is inaccurate:"));

$("next").onclick();
const beforeCorrect = tracker.snapshot().totals;
const correctButton = [...$("choices").querySelectorAll("button")]
  .find((button) => current.choices.find((choice) => choice.id === button.dataset.choice).correct);
correctButton.onclick();
$("submit").onclick();
eq(tracker.snapshot().totals.firstTry, beforeCorrect.firstTry + 1);
eq(tracker.snapshot().totals.submissions, beforeCorrect.submissions + 1);
ok($("feedback").textContent.startsWith("Correct."));

$("support").value = "minimal";
$("support").onchange();
eq(current.support, "minimal");
ok(!document.querySelector(".support-reminder"));
eq(Object.keys(tracker.snapshot().games["response-builder"].topics).length >= 2, true);

fs.writeFileSync("/tmp/response-builder-samples.json", JSON.stringify(samples, null, 2));
console.log(
  `Response Builder: ${generated} generated questions, ${checks} assertions, ` +
  `${Object.values(R.responsePools).reduce((sum, pool) => sum + pool.length, 0)} distinct structures; ` +
  `longest-choice shortcut ${longestCorrect}/1000, first-choice shortcut ${firstCorrect}/1000.`,
);
