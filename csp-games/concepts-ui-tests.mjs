import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as E from "./engine.js";
import * as C from "./concepts-engine.js";
const require = createRequire(import.meta.url),
  { parseHTML } = require(process.env.CSP_DOM_LIBRARY || "linkedom");
let seed = 314159;
Math.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
let checks = 0;
const ok = (v, m) => {
  assert.ok(v, m);
  checks++;
};
const same = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const html = fs.readFileSync(
    new URL("./code-concepts/index.html", import.meta.url),
    "utf8",
  ),
  ui = fs
    .readFileSync(new URL("./concepts-ui.js", import.meta.url), "utf8")
    .replace(/import[\s\S]*?from ["']\.\/concepts-engine\.js["'];/, "")
    .replace("export function", "function"),
  app = fs
    .readFileSync(new URL("./app.js", import.meta.url), "utf8")
    .replace(/import[^;]+;/g, "")
    .replace("export const catalog", "const catalog");
function launch() {
  let { document, window } = parseHTML(html),
    current,
    forced;
  Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
    configurable: true,
    get() {
      return (
        this.querySelector("option[selected]")?.getAttribute("value") ||
        this.querySelector("option")?.getAttribute("value") ||
        ""
      );
    },
    set(v) {
      for (let o of this.querySelectorAll("option")) {
        o.removeAttribute("selected");
        if (o.getAttribute("value") === String(v))
          o.setAttribute("selected", "");
      }
    },
  });
  const ctx = {
    document,
    window,
    console,
    E,
    ...C,
    generateConcept: (mode) => (current = C.generateConcept(mode, forced)),
    Set,
    Math,
  };
  vm.createContext(ctx);
  vm.runInContext(ui, ctx);
  vm.runInContext(app, ctx);
  const $ = (id) => document.getElementById(id),
    click = (id) => {
      $(id).onclick();
      checks++;
    },
    change = (mode) => {
      $("concept-mode").value = mode;
      $("concept-mode").dispatchEvent(new window.Event("change"));
      checks++;
    },
    choose = (id) => {
      let el = $("concept-code").querySelector(`[data-component="${id}"]`);
      ok(el, "component exists");
      el.onclick({ stopPropagation() {} });
    };
  return {
    document,
    window,
    $,
    click,
    change,
    choose,
    get q() {
      return current;
    },
    force(v) {
      forced = v;
    },
    ctx,
  };
}
let t = launch();
same(t.$("concept-mode").value, "mixed");
same(t.$("new").textContent, "Next Challenge");
ok(t.document.querySelector("header a").getAttribute("href") === "../");
let seen = new Set();
for (let i = 0; i < 1000; i++) {
  seen.add(t.q.category);
  t.click("new");
}
same([...seen].sort(), [...C.categories].sort());
for (let category of C.categories) {
  t.force(undefined);
  t.change(category);
  for (let i = 0; i < 100; i++) {
    same(t.q.category, category);
    t.click("concept-next");
  }
  for (let variant of C.variants[category]) {
    for (let repetition = 0; repetition < 10; repetition++) {
      t.force(variant);
      t.click("new");
      same(t.q.variant, variant);
      same(t.q.category, category);
      ok(t.$("feedback").hidden);
      ok(
        !t.$("concept-code").querySelector(".answer"),
        "no correctness before Check",
      );
      if (t.q.interaction === "count") {
        t.$("concept-count").value =
          t.q.answer === "unknown" ? 1 : t.q.answer + 1;
      } else {
        let wrong = C.components(t.q.root).find(
          (n) => n.id !== "snippet" && !t.q.answerIds.includes(n.id),
        );
        t.choose(wrong.id);
      }
      ok(t.$("feedback").hidden);
      t.click("concept-check");
      ok(t.$("feedback").classList.contains("bad"));
      ok(t.$("feedback").textContent.includes(t.q.explanation));
      if (!C.answerText(t.q).includes("\n"))
        ok(t.$("feedback").textContent.includes(C.answerText(t.q)));
      if (t.q.interaction === "select") {
        for (let id of t.q.answerIds)
          ok(
            t
              .$("concept-code")
              .querySelector(`[data-component="${id}"]`)
              .classList.contains("answer"),
          );
        t.click("clear-selection");
        for (let id of t.q.answerIds) t.choose(id);
      } else if (t.q.answer === "unknown") {
        t.$("concept-unknown").checked = true;
        t.$("concept-unknown").onchange();
        ok(t.$("concept-count").disabled);
      } else t.$("concept-count").value = t.q.answer;
      t.click("concept-check");
      ok(t.$("feedback").classList.contains("good"));
      ok(t.$("feedback").textContent.includes("Correct on retry"));
      let stats = t.$("stats").textContent;
      t.click("concept-check");
      same(t.$("stats").textContent, stats);
      t.click("concept-next");
      ok(t.$("feedback").hidden);
    }
  }
}
// Expand selection follows tree parents without scoring; keyboard selects code too.
t.force("statement");
t.change("selection");
let leaf = t
  .$("concept-code")
  .querySelector('[data-component="condition-variable"]');
leaf.onkeydown({ key: "Enter", preventDefault() {}, stopPropagation() {} });
while (!t.$("expand").disabled) {
  t.click("expand");
}
t.click("concept-check");
ok(t.$("feedback").classList.contains("good"));
ok(t.$("feedback").textContent.includes("entire IF structure"));
t.click("new");
t.choose("condition");
t.click("concept-check");
ok(
  t
    .$("feedback")
    .textContent.includes("Your selection is a Boolean expression"),
);
t.force("parameters");
t.change("procedures");
t.choose("p1");
t.choose("p2");
t.click("concept-check");
ok(t.$("feedback").classList.contains("good"));
t.click("new");
t.choose("a1");
t.click("concept-check");
ok(t.$("feedback").textContent.includes("Those are arguments"));
// Count fields reject blanks and invalid values without recording a challenge attempt.
t.force("repeat-count");
t.change("iteration");
let before = t.$("stats").textContent;
t.$("concept-count").value = "";
t.click("concept-check");
same(before, t.$("stats").textContent);
t.$("concept-count").value = "2.5";
t.click("concept-check");
same(before, t.$("stats").textContent);
t.force(undefined);
t.change("mixed");
same(t.$("concept-mode").value, "mixed");
let fresh = launch();
same(
  fresh.$("stats").textContent,
  "Challenges attempted: 0 · First-check correct: 0 · First-check streak: 0",
);
// The homepage contains one playable replacement card, with no old roadmap name.
const { document, window } = parseHTML(
    fs.readFileSync(new URL("./index.html", import.meta.url), "utf8"),
  ),
  context = { document, window, E, startCodeConcepts: () => {}, console };
vm.createContext(context);
vm.runInContext(app, context);
same(document.querySelectorAll('a[href="code-concepts/"]').length, 1);
ok(document.body.textContent.includes("Code Concepts is now playable"));
same(document.querySelectorAll(".card").length, 12);
console.log(
  `PASS: ${checks} Code Concepts DOM checks: every variant, defaults, restricted modes, mouse/keyboard event handlers, answers, retries, feedback, statistics, and navigation. Rendered-device QA unavailable.`,
);
