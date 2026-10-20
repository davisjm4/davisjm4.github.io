import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import * as A from "./array-engine.js";
import * as S from "../session.js";

let seed = 9137;
Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let checks = 0, generated = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const samples = [];
const compilerSamples = [];

function independent(question) {
  if (question.kind === "cell" || question.kind === "cell-2d") return {cell: question.correctCell};
  if (question.kind === "apply" || question.kind === "swap") return {state: question.answerState};
  return {answer: question.answer};
}

for (const [format, variants] of Object.entries(A.formatFamilies)) {
  ok(variants.length >= 4, `${format} needs multiple structural variants`);
  for (const variant of variants) {
    for (let run = 0; run < 20; run++) {
      const question = A.generateArray(format, variant);
      generated++;
      eq(question.format, format);
      eq(question.variant, variant);
      ok(A.assessArray(question, independent(question)));
      eq(A.solutionArray(question), independent(question));
      ok(question.prompt.length > 10);
      ok(question.code.includes("int"));
      ok(question.explanation.length > 20);
      if (question.kind === "choice") {
        eq(question.choices.length, 4);
        eq(new Set(question.choices).size, 4);
        eq(question.choices.filter((choice) => choice === question.answer).length, 1);
      }
      if (format === "element") {
        const index = Number(question.correctCell);
        eq(question.values[index], Number(question.correctAnswer.match(/= (-?\d+)$/)[1]));
        ok(index >= 0 && index < question.values.length);
        ok(question.revealIndices);
      }
      if (format === "perform-update") {
        eq(question.answerState.length, question.values.length);
        if (variant === "swap") {
          eq(question.answerState.filter((value, index) => value !== question.values[index]).length, 2);
        } else {
          eq(question.answerState.filter((value, index) => value !== question.values[index]).length, 1);
        }
      }
      if (format === "search") {
        if (variant === "first") {
          const target = Number(question.code.match(/== (\d+)/)[1]);
          eq(Number(question.answer), question.values.indexOf(target));
        }
        if (variant === "last") {
          const target = Number(question.code.match(/== (\d+)/)[1]);
          eq(Number(question.answer), question.values.lastIndexOf(target));
        }
        if (variant === "count") {
          const target = Number(question.code.match(/== (\d+)/)[1]);
          eq(Number(question.answer), question.values.filter((value) => value === target).length);
        }
        if (variant === "missing") eq(question.answer, "-1");
        if (variant === "minimum") eq(Number(question.answer), Math.min(...question.values));
        if (variant === "maximum") eq(Number(question.answer), Math.max(...question.values));
        if (variant === "exists") ok(question.prompt.includes("found"));
      }
      if (format === "access-2d") {
        const [row, col] = question.correctCell.split(",").map(Number);
        ok(row >= 0 && row < question.rows && col >= 0 && col < question.columns);
        eq(question.grid[row][col], Number(question.correctAnswer.match(/= (-?\d+)$/)[1]));
        ok(question.rows !== undefined && question.columns !== undefined);
      }
      if (["update-2d", "nested"].includes(format)) {
        eq(question.grid.length, question.rows);
        ok(question.grid.every((row) => row.length === question.columns));
      }
      if (format === "update-2d" && variant === "assign") {
        const [row, col, assigned] = question.code.match(/grid\[(\d+)]\[(\d+)] = (\d+);/).slice(1).map(Number);
        ok(question.grid[row][col] !== assigned);
      }
      if (run === 0) {
        samples.push({
          format, variant, prompt: question.prompt, code: question.code,
          choices: question.choices, answer: question.correctAnswer,
        });
        if (!["create-references", "in-place", "trace-2d"].includes(format))
          compilerSamples.push(question.code);
      }
    }
  }
}

const seenFormats = new Set(), seenVariants = new Set(), positions = new Set();
const mixedFormatCounts = Object.fromEntries(Object.keys(A.formatNames).map((format) => [format, 0]));
let longestCorrect = 0, choiceQuestions = 0;
for (let index = 0; index < 1800; index++) {
  const question = A.generateArray();
  generated++;
  seenFormats.add(question.format);
  mixedFormatCounts[question.format]++;
  seenVariants.add(question.topic);
  if (question.kind === "choice") {
    choiceQuestions++;
    const position = question.choices.indexOf(question.answer);
    positions.add(position);
    const lengths = question.choices.map((choice) => choice.length);
    const longest = Math.max(...lengths);
    longestCorrect += Number(
      question.answer.length === longest &&
      lengths.filter((length) => length === longest).length === 1,
    );
  }
}
eq([...seenFormats].sort(), Object.keys(A.formatNames).sort());
eq(seenVariants.size, Object.values(A.formatFamilies).flat().length);
eq(positions.size, 4);
ok(Object.values(mixedFormatCounts).every((count) => count >= 100 && count <= 200), "no format dominates Mixed Practice");
ok(longestCorrect / choiceQuestions < 0.35, "answer length must not identify the correct choice");

const {parseHTML} = createRequire(import.meta.url)(
  process.env.JAVA_DOM_LIBRARY || process.env.CSP_DOM_LIBRARY || "linkedom",
);
const {document, window} = parseHTML(
  fs.readFileSync(new URL("./index.html", import.meta.url), "utf8"),
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
const tracker = S.createSessionTracker({storage});
let current, forcedVariant;
const context = {
  document, window, console,
  ...A,
  generateArray: (format) => (current = A.generateArray(format, forcedVariant)),
  sessionTracker: () => tracker,
  addSessionNavigation: () => {},
  roundSummary: () => JSON.stringify(tracker.snapshot().totals),
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(new URL("./array-ui.js", import.meta.url), "utf8")
    .replace(/import[^;]+;/g, "")
    .replace("export function", "function"),
  context,
);
const $ = (id) => document.getElementById(id);
eq($("mode").value, "mixed");
eq($("mode").querySelectorAll("option").length, Object.keys(A.formatNames).length + 1);
ok($("difficulty"), "difficulty selector is available");

function load(format, variant) {
  forcedVariant = variant;
  $("mode").value = format;
  $("mode").onchange();
  eq(current.format, format);
  eq(current.variant, variant);
}
function chooseCorrect() {
  if (current.kind === "choice") {
    $("choices").querySelectorAll("button")[current.choices.indexOf(current.answer)].onclick();
  } else if (current.kind === "cell" || current.kind === "cell-2d") {
    $("stage").querySelector(`[data-cell="${current.correctCell}"]`).onclick();
  } else {
    for (const cell of current.correctCells)
      $("stage").querySelector(`[data-cell="${cell}"]`).onclick();
  }
}

for (const [format, variants] of Object.entries(A.formatFamilies)) {
  load(format, variants[0]);
  eq($("stage").querySelectorAll("[data-index-label]:not([hidden])").length, 0);
  if (current.kind === "choice") eq($("choices").querySelectorAll("button").length, 4);
  chooseCorrect();
  const before = tracker.snapshot().totals;
  $("submit").onclick();
  eq(tracker.snapshot().totals.firstTry, before.firstTry + 1);
  eq(tracker.snapshot().totals.submissions, before.submissions + 1);
  if (["create-references", "in-place", "trace-2d"].includes(format)) {
    const record = Object.values(tracker.snapshot().records).at(-1);
    eq(record.details.mode, A.formatNames[format]);
    eq(record.details.difficulty, current.difficulty);
    eq(record.details.skill, current.skill);
    eq(record.details.family, current.family);
    eq(record.details.seed, current.seed);
  }
  ok($("submit").disabled);
  ok($("feedback").textContent.includes("Correct answer:"));
  if (current.revealIndices)
    ok($("stage").querySelectorAll("[data-index-label]:not([hidden])").length > 0);
}

load("element", "literal");
const wrongCell = [...$("stage").querySelectorAll("[data-cell]")]
  .find((button) => button.dataset.cell !== current.correctCell);
wrongCell.onclick();
const wrongBefore = tracker.snapshot().totals;
$("submit").onclick();
eq(tracker.snapshot().totals.incorrect, wrongBefore.incorrect + 1);
eq(tracker.snapshot().totals.revealed, wrongBefore.revealed + 1);
eq(tracker.snapshot().totals.firstTry, wrongBefore.firstTry);
ok($("feedback").textContent.startsWith("Not quite."));
const afterWrong = tracker.snapshot().totals;
$("submit").onclick();
eq(tracker.snapshot().totals, afterWrong);

load("perform-update", "swap");
const resetBefore = tracker.snapshot().totals;
$("stage").querySelector("[data-cell]").onclick();
$("reset-array").onclick();
eq(tracker.snapshot().totals, resetBefore);
ok($("submit").disabled);

const css = fs.readFileSync(new URL("./array.css", import.meta.url), "utf8");
ok(css.includes("@media (max-width: 600px)"));
ok(css.includes("overflow-x: auto"));
ok(css.includes("min-height: 3"));

const compilerDirectory = `/tmp/java-array-redesign-${process.pid}`;
fs.mkdirSync(compilerDirectory, {recursive: true});
const compilerManifest = [];
for (const [index, code] of compilerSamples.entries()) {
  const path = `${compilerDirectory}/sample-${index}.java`;
  fs.writeFileSync(
    path,
    `public class Practice { public static void main(String[] args) {\n${code}\n} }`,
  );
  compilerManifest.push(`${path}\ttrue`);
}
const compilerManifestPath = `${compilerDirectory}/manifest.tsv`;
fs.writeFileSync(compilerManifestPath, compilerManifest.join("\n"));
const java = process.env.JAVA_BIN || [
  "/usr/lib/jvm/java-17-openjdk-amd64/bin/java",
  "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
].find((path) => fs.existsSync(path)) || "java";
execFileSync(
  java,
  [new URL("../compiler-harness.java", import.meta.url).pathname, compilerManifestPath],
  {encoding: "utf8", timeout: 120000},
);
ok(compilerSamples.length === Object.entries(A.formatFamilies)
  .filter(([format]) => !["create-references", "in-place", "trace-2d"].includes(format))
  .reduce((count, [, variants]) => count + variants.length, 0));

fs.mkdirSync("/tmp/java-quality", {recursive: true});
fs.writeFileSync("/tmp/java-quality/array-redesign-samples.json", JSON.stringify(samples, null, 2));
console.log(
  `Array Lab redesign: ${generated} generated challenges across ${seenFormats.size} formats and ` +
  `${seenVariants.size} structural variants; ${checks} generator, interaction, session, answer-position, and responsive assertions passed. ` +
  `Mixed distribution: ${JSON.stringify(mixedFormatCounts)}. ` +
  `Longest-choice shortcut: ${longestCorrect}/${choiceQuestions}. ` +
  `${compilerSamples.length} representative Java snippets compiled with javac.`,
);
