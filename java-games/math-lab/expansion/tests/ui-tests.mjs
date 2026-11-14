// Math Lab expansion — interface test. Drives the REAL math-lab/app.js handlers in a
// simulated DOM (linkedom), with the real shared session tracker. This is a DOM
// simulation, not a browser: layout, touch, and rendering need a real-device check.
//   node math-lab/expansion/tests/ui-tests.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as M from "../../engine.js";
import * as S from "../../../session.js";
import * as X from "../generator.js";
import * as MX from "../../mixed.js";

let assertions = 0;
const eq = (a, b, m) => { assert.deepEqual(a, b, m); assertions++; };
const ok = (a, m) => { assert.ok(a, m); assertions++; };

const { parseHTML } = createRequire(import.meta.url)(process.env.CSP_DOM_LIBRARY || "linkedom");
const memory = new Map(), storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, v) };
const tracker = S.createSessionTracker({ storage });
const { document, window } = parseHTML(fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8"));
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get() { return this.querySelector("option[selected]")?.getAttribute("value") || this.querySelector("option")?.getAttribute("value"); },
  set(v) { for (const o of this.querySelectorAll("option")) { o.removeAttribute("selected"); if (o.getAttribute("value") === v) o.setAttribute("selected", ""); } },
});
let q;
const listeners = {};
const context = {
  document, window: { addEventListener: (e, h) => { listeners[e] = h; } },
  mathGame: M.mathGame, createDeck: () => { const d = M.createDeck(); return { next: m => (q = d.next(m)) }; }, assess: M.assess,
  sessionTracker: () => tracker, addSessionNavigation: () => {}, roundSummary: () => "",
  EXPANSION_MODES: X.EXPANSION_MODES, DIFFICULTIES: X.DIFFICULTIES, DIFFICULTY_TITLES: X.DIFFICULTY_TITLES,
  createExpansionDeck: () => { const d = X.createExpansionDeck({ seed: 2026 }); return { next: (m, diff) => (q = d.next(m, diff)) }; },
  assessExpansion: X.assessExpansion,
  createMixedDeck: MX.createMixedDeck, mathEvidence: MX.mathEvidence,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../../app.js", import.meta.url), "utf8").replace(/import[^;]+;/g, "").replace("export function", "function"), context);
const $ = id => document.getElementById(id);
const game = () => tracker.snapshot().games["math-lab"];

// Default stays Mixed Practice. Mixed now rotates every mode, so the difficulty control (for the expansion-mode questions) is visible, defaulting to Beginner.
eq($("mode").value, "mixed"); ok(!$("difficulty-group").hidden, "difficulty control visible in Mixed"); eq($("difficulty").value, "beginner");
for (const id of Object.keys(X.EXPANSION_MODES)) ok($("mode").querySelector(`option[value="${id}"]`), "mode option " + id);
for (const legacy of Object.keys(M.mathGame.modes)) ok($("mode").querySelector(`option[value="${legacy}"]`), "legacy option " + legacy);
eq(document.querySelectorAll("input,textarea").length, 0);

let submitted = 0;
for (const mode of Object.keys(X.EXPANSION_MODES)) {
  for (const difficulty of X.DIFFICULTIES) {
    $("mode").value = mode; $("difficulty").value = difficulty; $("difficulty").onchange();
    for (let i = 0; i < 10; i++) {
      eq(q.mode, mode); eq(q.difficulty, difficulty); ok(!$("difficulty-group").hidden);
      ok($("stage").textContent.includes(X.DIFFICULTY_TITLES[difficulty]), "difficulty shown");
      const buttons = $("choices").querySelectorAll("button");
      eq(buttons.length, 4); ok($("check").disabled); ok($("feedback").hidden);
      ok(!$("stage").innerHTML.includes(q.explanation.split("\n")[0].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").slice(0, 40)) || q.explanation.length < 40, "explanation hidden before submit");
      if (q.code) ok($("math-code").textContent === q.code, "code rendered verbatim with indentation");
      for (const [index, b] of [...buttons].entries()) if (q.choices[index].includes("\n")) ok(b.classList.contains("multiline"));
      const before = game() || { submissions: 0, firstTry: 0, revealed: 0 };
      $("check").onclick(); eq((game() || before).submissions, before.submissions, "no submit without a choice");
      const correct = i % 2 === 0;
      const index = q.choices.findIndex(c => (c === q.answer) === correct);
      buttons[index].onclick(); ok(!$("check").disabled);
      $("check").onclick(); submitted++;
      const after = game();
      eq(after.submissions, before.submissions + 1); eq(after.firstTry, before.firstTry + Number(correct)); eq(after.revealed, before.revealed + Number(!correct));
      ok(!$("feedback").hidden); ok($("feedback").textContent.includes(q.answer)); ok($("feedback").textContent.includes(q.explanation));
      if (!correct) ok($("feedback").textContent.includes(q.choiceDetails[index].why), "misconception note on wrong answer");
      // One submission = one scored attempt: further clicks and checks do nothing.
      for (const b of $("choices").querySelectorAll("button")) { ok(b.disabled); b.onclick(); }
      $("check").onclick(); eq(game().submissions, after.submissions);
      ok($("choices").querySelector(".answer"), "correct choice highlighted");
      const record = Object.values(tracker.snapshot().records).at(-1);
      eq(record.topic, mode); eq(record.details.difficulty, difficulty); eq(record.details.reasoningFamily, q.family);
      $("next").onclick();
    }
  }
}
// Session Summary data: per-mode topics with the mode titles.
const topics = game().topics;
for (const [id, title] of Object.entries(X.EXPANSION_MODES)) { eq(topics[id].title, title); eq(topics[id].attempted, 30); eq(topics[id].firstTry, 15); }
eq(S.accuracy(game()), 50);
// Switching back to a legacy mode hides difficulty and still uses the legacy engine.
$("mode").value = "casting"; $("mode").onchange();
ok($("difficulty-group").hidden); eq(q.mode, "casting"); ok(!("kind" in q && q.kind === "expansion"));
// Persistence across a reload of the tracker.
eq(S.createSessionTracker({ storage }).snapshot().games["math-lab"].attempted, submitted);
// ---- Mixed Practice rotates all seven modes, at the difficulty actually shown ----
$("mode").value = "mixed"; $("difficulty").value = "intermediate"; $("mode").onchange();
ok(!$("difficulty-group").hidden && !$("difficulty-note").hidden, "difficulty control and note visible in Mixed");
eq($("difficulty-label").textContent, "Methods & limits difficulty");
const ALL = [...Object.keys(M.structures), ...Object.keys(X.EXPANSION_MODES)], drawn = [];
for (let i = 0; i < ALL.length * 12; i++) {
  drawn.push(q.mode);
  const record = Object.values(tracker.snapshot().records).at(-1);
  eq(record.mode, q.mode); eq(record.details.practiceMode, q.mode);
  if (X.EXPANSION_MODES[q.mode]) {
    eq(q.difficulty, "intermediate"); eq(record.details.difficulty, "intermediate"); eq(record.details.reasoningFamily, q.family);
    ok($("stage").textContent.includes("Intermediate"), "difficulty shown for expansion question in Mixed");
  } else {
    eq(record.details.difficulty, undefined, "original modes have no difficulty level"); eq(record.details.reasoningFamily, `${q.mode}:${q.shape}`);
    ok(!$("stage").textContent.includes("Intermediate"));
  }
  $("next").onclick();
}
// The deck already drew before this loop, so rounds are not aligned to index 0; balance over 12 rounds is exact to within one round.
for (const m of ALL) { const n = drawn.filter(x => x === m).length; ok(n >= 11 && n <= 13, `${m} drawn ${n} times in 12 rounds`); }
// A fresh deck covers each mode exactly once per round, with stand-in generators that report only the mode asked for.
{ const fresh = MX.createMixedDeck({ deck: { next: m => ({ mode: m }) }, expansionDeck: { next: m => ({ mode: m }) }, rng: Math.random });
  const seq = Array.from({ length: ALL.length * 30 }, () => fresh.next("beginner").mode);
  for (let r = 0; r < 30; r++) eq([...seq.slice(r * ALL.length, (r + 1) * ALL.length)].sort(), [...ALL].sort(), "fresh deck: each round covers every mode once");
  for (let i = 1; i < seq.length; i++) ok(seq[i] !== seq[i - 1], "fresh deck: no immediate repeat across round boundaries"); }
for (let i = 1; i < drawn.length; i++) ok(drawn[i] !== drawn[i - 1], "never the same mode twice in a row");
// Changing the difficulty in Mixed changes the expansion questions only.
$("difficulty").value = "advanced"; $("difficulty").onchange();
let sawExpansion = 0;
for (let i = 0; i < ALL.length * 2; i++) { if (X.EXPANSION_MODES[q.mode]) { eq(q.difficulty, "advanced"); sawExpansion++; } $("next").onclick(); }
ok(sawExpansion >= 2, "expansion questions appear in Mixed");
$("mode").value = "casting"; $("mode").onchange(); ok($("difficulty-group").hidden && $("difficulty-note").hidden, "control hidden again in an original mode");
// Narrow-viewport CSS rules exist for the new control (static check, not a rendered layout).
const css = fs.readFileSync(new URL("../../game.css", import.meta.url), "utf8");
ok(/@media \(max-width: 540px\)[\s\S]*#difficulty/.test(css), "difficulty select full-width on narrow screens");
ok(/\.choice\.multiline code \{ white-space: pre-line; \}/.test(css));
console.log(`Math Lab expansion UI: ${submitted} scored submissions across 2 modes x 3 difficulties; ${assertions} assertions passed (simulated DOM, not a real browser).`);
