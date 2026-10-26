import { practiceGames } from "./practice-engine.js";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as E from "./engine.js";
import * as C from "./concepts-engine.js";
import * as F from "./concepts-feedback.js";
import * as S from "./session.js";
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
    .replace(/import[\s\S]*?from ["'][^"']+["'];/g, "")
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
  const memory = new Map(),
    sharedTracker = S.createSessionTracker({
      storage: {
        getItem: (k) => memory.get(k) || null,
        setItem: (k, v) => memory.set(k, v),
      },
    });
  const ctx = {
    sessionTracker: () => sharedTracker,
    addSessionNavigation: () => {},
    roundSummary: (game) => {
      const m = sharedTracker.snapshot().games[game];
      return `First-try accuracy: ${S.accuracy(m) === null ? "N/A" : Math.round(S.accuracy(m)) + "%"} (${m.firstTry}/${m.attempted}) · Solved after retry: ${m.afterRetry} · Revealed: ${m.revealed} · Submissions: ${m.submissions}`;
    },
    practiceGames,
    document,
    window,
    console,
    practiceGames,
    E,
    ...C,
    ...F,
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
    practiceGames,
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
ok(t.document.querySelector('header a[href="/cs-games/csp/"]').getAttribute("href") === "/cs-games/csp/");
function wrong(t) {
  if (t.q.interaction === "count")
    t.$("concept-count").value = t.q.answer === "unknown" ? 1 : t.q.answer + 1;
  else {
    t.click("clear-selection");
    let n = C.components(t.q.root).find(
      (n) => n.id !== "snippet" && !t.q.answerIds.includes(n.id),
    );
    t.choose(n.id);
  }
  t.click("concept-check");
}
function right(t) {
  if (t.q.interaction === "count") {
    if (t.q.answer === "unknown") {
      t.$("concept-unknown").checked = true;
      t.$("concept-unknown").onchange();
    } else t.$("concept-count").value = t.q.answer;
  } else {
    t.click("clear-selection");
    for (let id of t.q.answerIds) t.choose(id);
  }
  t.click("concept-check");
}
function noSpoiler(t, attempt) {
  ok(t.$("feedback").classList.contains("bad"));
  ok(!t.$("concept-code").querySelector(".answer"));
  ok(
    !/Highlighted answer:|Correct answer:|Answer:/.test(
      t.$("feedback").textContent,
    ),
  );
  ok(t.$("feedback").textContent.includes(F.conceptHint(t.q, attempt)));
  ok(!t.$("concept-check").disabled);
}
let seen = new Set();
for (let i = 0; i < 1000; i++) {
  seen.add(t.q.category);
  t.click("new");
}
same([...seen].sort(), [...C.categories].sort());
for (let category of C.categories) {
  t.force(undefined);
  t.change(category);
  for (let i = 0; i < 40; i++) {
    same(t.q.category, category);
    t.click("concept-next");
  }
  for (let variant of C.variants[category])
    for (let i = 0; i < 5; i++) {
      t.force(variant);
      t.click("new");
      ok(t.$("feedback").hidden);
      same(t.q.variant, variant);
      right(t);
      ok(t.$("feedback").classList.contains("good"));
      ok(t.$("feedback").textContent.includes("first try"));
      ok(t.$("concept-check").disabled);
      ok(t.$("concept-show").disabled);
      let stats = t.$("stats").textContent;
      t.click("concept-check");
      t.click("concept-show");
      same(t.$("stats").textContent, stats);
      t.click("new");
      for (let a = 1; a <= 4; a++) {
        wrong(t);
        noSpoiler(t, a);
      }
      stats = t.$("stats").textContent;
      let accuracy = stats.split(" · ")[0];
      right(t);
      ok(t.$("feedback").textContent.includes("independently after retry"));
      same(t.$("stats").textContent.split(" · ")[0], accuracy);
      ok(t.$("concept-check").disabled);
      t.click("new");
      wrong(t);
      noSpoiler(t, 1);
      t.click("concept-show");
      ok(!t.$("feedback").classList.contains("good"));
      ok(t.$("feedback").textContent.includes("not independently solved"));
      ok(t.$("feedback").textContent.includes(t.q.explanation));
      ok(t.$("concept-check").disabled);
      stats = t.$("stats").textContent;
      for (let id of t.q.answerIds)
        ok(
          t
            .$("concept-code")
            .querySelector(`[data-component="${id}"]`)
            .classList.contains("answer"),
        );
      right(t);
      t.click("concept-show");
      same(t.$("stats").textContent, stats);
      ok(t.$("feedback").textContent.includes("not independently solved"));
      t.click("concept-next");
      ok(t.$("feedback").hidden);
      ok(!t.$("concept-check").disabled);
      t.click("concept-show");
      stats = t.$("stats").textContent;
      right(t);
      same(t.$("stats").textContent, stats);
      ok(!t.$("feedback").classList.contains("good"));
      t.click("new");
    }
}
// Exact statistics: first try, independent retry, and reveal are separate outcomes.
t = launch();
t.force("variable");
t.change("variables");
right(t);
ok(t.$("stats").textContent.startsWith("First-try accuracy: 100% (1/1)"));
t.click("new");
wrong(t);
right(t);
ok(
  t
    .$("stats")
    .textContent.includes(
      "First-try accuracy: 50% (1/2) · Solved after retry: 1 · Revealed: 0",
    ),
);
t.click("new");
t.click("concept-show");
ok(
  t
    .$("stats")
    .textContent.includes(
      "First-try accuracy: 50% (1/2) · Solved after retry: 1 · Revealed: 1",
    ),
);
let before = t.$("stats").textContent;
right(t);
same(before, t.$("stats").textContent);
// The screenshot failure: a condition must not appear as the answer after a wrong variable selection.
t.force("condition");
t.change("selection");
t.choose("condition-variable");
t.click("concept-check");
noSpoiler(t, 1);
ok(!t.$("feedback").textContent.includes(C.answerText(t.q)));
t.choose("condition");
t.click("concept-check");
ok(t.$("feedback").textContent.includes("independently after retry"));
t.force("statement");
t.change("selection");
let leaf = t
  .$("concept-code")
  .querySelector('[data-component="condition-variable"]');
leaf.onkeydown({ key: "Enter", preventDefault() {}, stopPropagation() {} });
while (!t.$("expand").disabled) t.click("expand");
t.click("concept-check");
ok(t.$("feedback").classList.contains("good"));
t.force("repeat-count");
t.change("iteration");
before = t.$("stats").textContent;
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
  "First-try accuracy: N/A (0/0) · Solved after retry: 0 · Revealed: 0 · Submissions: 0",
);
console.log(
  `PASS: ${checks} Code Concepts interaction assertions covering spoiler-free errors, progressive hints, independent retries, permanently unscored reveals, repeated clicks, mode defaults, and statistics.`,
);
