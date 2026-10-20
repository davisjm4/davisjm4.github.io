import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import * as M from "./engine.js";
import * as S from "../session.js";
import * as X from "./expansion/generator.js";

let seed = 761234;
const rng = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let assertions = 0;
const eq = (a, b, message) => { assert.deepEqual(a, b, message); assertions++; };
const ok = (a, message) => { assert.ok(a, message); assertions++; };

// Hand-authored Java semantic anchors; these do not use the generator's key.
for (const [code, type, result] of [
  ["17 % 5", "int", 2], ["-17 % 5", "int", -2], ["17 % -5", "int", 2],
  ["-17 % -5", "int", -2], ["2 % 5", "int", 2], ["15 % 5", "int", 0],
  ["7 / 2", "int", 3], ["-7 / 2", "int", -3], ["7 / 2.0", "double", 3.5],
  ["7.0 / 2", "double", 3.5], ["7.0 / 2.0", "double", 3.5],
  ["(double) (7 / 2)", "double", 3], ["(double) 7 / 2", "double", 3.5],
  ["7 / (double) 2", "double", 3.5], ["(int) -8.9", "int", -8],
  ["(int) 8.9", "int", 8], ["(int) -0.9", "int", 0],
  ["7 + 5 / 2", "int", 9], ["(7 + 5) / 2", "int", 6],
  ["10 % 3 * 2", "int", 2], ["10 % (3 * 2)", "int", 4],
  ["7 / 2 * 2", "int", 6], ["(int) (7.0 / 2)", "int", 3],
]) eq(M.evaluate(code), { value: result, type }, code);
eq(M.format(M.store("7 / 2", "double")), "3.0");
eq(M.format(M.store("(double) (7 / 2)", "double")), "3.0");
eq(M.format(M.store("7 / 2.0", "double")), "3.5");
assert.throws(() => M.store("7 / 2.0", "int"), /Lossy/);
assert.throws(() => M.evaluate("7 / 0"), /ArithmeticException/);
assert.throws(() => M.evaluate("7 % 0"), /ArithmeticException/);
assert.throws(() => M.evaluate("Math.random()"), /Unsupported/);

const questions = [], checks = [], positions = {}, samples = [];
for (const [mode, shapes] of Object.entries(M.structures)) {
  positions[mode] = [0, 0, 0, 0];
  for (const shape of shapes) {
    const location = new Set();
    for (let i = 0; i < 100; i++) {
      const q = M.generate(mode, shape, rng);
      questions.push(q);
      ok(M.validateQuestion(q));
      eq(q.choices.length, 4);
      eq(q.choices.filter(c => M.assess(q, c)).length, 1);
      eq(q.choices.filter(c => c === q.answer).length, 1);
      ok(q.explanation.length < 350);
      ok(q.code.length < 70);
      ok(!/NaN|Infinity|undefined/.test(q.code + q.answer + q.explanation));
      if (q.kind === "value" && !Number.isInteger(Number(q.answer)))
        ok(q.choices.filter(c => !Number.isInteger(Number(c))).length >= 2, "Only decimal option gives away key");
      const index = q.choices.indexOf(q.answer); location.add(index); positions[mode][index]++;
      for (const c of q.choices) eq(M.assess(q, c), c === q.answer);
      for (const check of q.checks) checks.push({ ...check, question: q });
      if (i === 0) samples.push({ mode, shape, code: q.code, prompt: q.prompt, choices: q.choices, answer: q.answer, explanation: q.explanation });
    }
    eq(location.size, 4, mode + "/" + shape);
  }
  const n = shapes.length * 100;
  ok(positions[mode].every(count => count > n * .15 && count < n * .35));
}

// Independently COMPILE and RUN every generated implementation and every
// reverse option. Java's own arithmetic and implicit assignment conversion
// provide the oracle, rather than another copy of the expression evaluator.
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "math-lab-java-"));
try {
  const parts = [];
  for (let start = 0; start < checks.length; start += 100) {
    const body = checks.slice(start, start + 100).map((c, offset) => {
      const declaration = c.storageType ? `${c.storageType} result = ${c.expression};` : `var result = ${c.expression};`;
      return `{ ${declaration} System.out.println("${start + offset}\\t" + ((Object)result).getClass().getSimpleName() + "\\t" + result); }`;
    }).join("\n");
    parts.push(`static void part${parts.length}() {\n${body}\n}`);
  }
  const source = `class MathOracle { public static void main(String[] args) { ${parts.map((_, i) => `part${i}();`).join(" ")} }\n${parts.join("\n")} }`;
  const filename = path.join(folder, "MathOracle.java");
  fs.writeFileSync(filename, source);
  const lines = execFileSync(process.env.JAVA || "java", [filename], { encoding: "utf8", timeout: 120000, maxBuffer: 5 * 1024 * 1024 }).trim().split("\n");
  eq(lines.length, checks.length);
  for (const line of lines) {
    const [id, boxedType, printed] = line.split("\t"), c = checks[Number(id)];
    eq(boxedType, c.expected.type === "int" ? "Integer" : "Double", c.expression);
    eq(Number(printed), c.expected.value, c.expression);
    eq(printed, M.format(c.expected), c.expression);
    if (c.storageType) {
      // Count each visible numeric option against the independently obtained
      // Java result, including numerically equivalent spellings.
      const valid = c.question.choices.filter(option => Number(option) === Number(printed));
      eq(valid, [c.question.answer], c.question.code);
    }
  }
} finally { fs.rmSync(folder, { recursive: true, force: true }); }

for (const mode of ["mixed", ...Object.keys(M.structures)]) {
  const deck = M.createDeck(rng), history = [], seen = new Set(), modes = [];
  for (let i = 0; i < 150; i++) {
    const q = deck.next(mode); modes.push(q.mode); seen.add(q.shape);
    ok(M.family(q.mode, q.shape) !== M.family(history.at(-1)?.mode, history.at(-1)?.shape));
    if (["after-division", "before-division", "denominator-cast"].includes(q.shape))
      ok(!history.slice(-2).some(p => M.family(p.mode, p.shape) === "division-cast"));
    history.push(q);
  }
  if (mode === "mixed") for (let i = 0; i < 150; i += 5) eq(new Set(modes.slice(i, i + 5)).size, 5);
  else for (const shape of M.structures[mode]) ok(seen.has(shape), `unvisited ${mode}/${shape}`);
}

// Exercise actual UI handlers against the existing Java session tracker.
const { parseHTML } = createRequire(import.meta.url)(process.env.CSP_DOM_LIBRARY || "linkedom");
const memory = new Map(), storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, v) };
const tracker = S.createSessionTracker({ storage });
const legacy = tracker.begin("variable-lab", "Variable Lab", "existing", "Existing");
tracker.submit(legacy, true);
const { document, window } = parseHTML(fs.readFileSync(new URL("./index.html", import.meta.url), "utf8"));
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get() { return this.querySelector("option[selected]")?.getAttribute("value") || "mixed"; },
  set(v) { for (const o of this.querySelectorAll("option")) { o.removeAttribute("selected"); if (o.getAttribute("value") === v) o.setAttribute("selected", ""); } },
});
let q;
const listeners = {}, context = {
  document, window: { addEventListener: (event, handler) => { listeners[event] = handler; } },
  mathGame: M.mathGame, createDeck: () => {
    const d = M.createDeck(rng); return { next: mode => (q = d.next(mode)) };
  }, assess: M.assess, sessionTracker: () => tracker, addSessionNavigation: () => {},
  // Expansion bindings (app.js imports these); legacy assertions below are unchanged.
  EXPANSION_MODES: X.EXPANSION_MODES, DIFFICULTIES: X.DIFFICULTIES, DIFFICULTY_TITLES: X.DIFFICULTY_TITLES,
  createExpansionDeck: () => X.createExpansionDeck({ seed: 7 }), assessExpansion: X.assessExpansion,
  roundSummary: () => JSON.stringify(tracker.snapshot().games["math-lab"]),
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("./app.js", import.meta.url), "utf8").replace(/import[^;]+;/g, "").replace("export function", "function"), context);
const $ = id => document.getElementById(id);
eq($("mode").value, "mixed");
for (const mode of Object.keys(M.structures)) {
  $("mode").value = mode; $("mode").onchange();
  for (let i = 0; i < 8; i++) {
    eq(q.mode, mode); eq($("choices").querySelectorAll("button").length, 4);
    ok($("check").disabled); ok($("feedback").hidden);
    const before = tracker.snapshot().games["math-lab"];
    $("check").onclick(); eq(tracker.snapshot().games["math-lab"].submissions, before.submissions);
    const correct = i % 2 === 0;
    const index = q.choices.findIndex(c => (c === q.answer) === correct);
    $("choices").querySelectorAll("button")[index].onclick();
    ok(!$("check").disabled); ok($("feedback").hidden);
    $("check").onclick(); const after = tracker.snapshot().games["math-lab"];
    eq(after.submissions, before.submissions + 1); eq(after.firstTry, before.firstTry + Number(correct));
    eq(after.revealed, before.revealed + Number(!correct));
    ok(!$("feedback").hidden); ok($("feedback").textContent.includes(q.answer));
    ok($("feedback").textContent.includes(q.explanation)); ok($("check").disabled);
    for (const b of $("choices").querySelectorAll("button")) { ok(b.disabled); b.onclick(); }
    $("check").onclick(); eq(tracker.snapshot().games["math-lab"].submissions, after.submissions);
    $("next").onclick();
  }
}
const beforeSkip = tracker.snapshot().games["math-lab"].skipped;
$("next").onclick(); eq(tracker.snapshot().games["math-lab"].skipped, beforeSkip + 1);
listeners.pagehide(); ok(tracker.snapshot().games["math-lab"].skipped > beforeSkip);
listeners.pageshow({ persisted: true }); ok($("check").disabled);
const snapshot = S.createSessionTracker({ storage }).snapshot();
eq(snapshot.games["math-lab"].attempted, 40); eq(snapshot.games["math-lab"].firstTry, 20);
eq(snapshot.games["math-lab"].afterRetry, 0); eq(snapshot.games["variable-lab"].firstTry, 1);
eq(S.accuracy(snapshot.games["math-lab"]), 50);
ok(!tracker.reset(false)); eq(tracker.snapshot().totals, snapshot.totals);

// Registration stays isolated: no modifications to existing generators,
// sessions, or shared styles are necessary for the new game.
const home = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
ok(home.includes('"math-lab": mathGame'));
ok(document.querySelector('a[href="/cs-games/advanced/"]'));
eq(document.querySelectorAll("input,textarea").length, 0);
fs.writeFileSync(path.join(os.tmpdir(), "math-lab-samples.json"), JSON.stringify(samples, null, 2));
console.log(`Math Lab: ${questions.length} generated questions across 31 structures; ${checks.length} actual Java evaluations; ${assertions} assertions; all choices, 40 UI submissions, scoring locks, skips, persistence, legacy sessions, and Mixed rotation passed. Answer positions: ${JSON.stringify(positions)}`);
