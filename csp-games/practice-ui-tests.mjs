import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as P from "./practice-engine.js";
import * as X from "./concepts-expanded.js";
import * as F from "./concepts-feedback.js";
import * as S from "./session.js";
const require = createRequire(import.meta.url),
  { parseHTML } = require(process.env.CSP_DOM_LIBRARY || "linkedom");
let seed = 1024;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const memory = new Map(),
  storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  };
let checks = 0;
const eq = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  },
  ok = (v) => {
    assert.ok(v);
    checks++;
  };
function launch(slug, concept = false) {
  const { window, document } = parseHTML(
    fs.readFileSync(new URL(`./${slug}/index.html`, import.meta.url), "utf8"),
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
        if (o.value === String(v)) o.setAttribute("selected", "");
      }
    },
  });
  let q, forced;
  const tracker = S.createSessionTracker({ storage });
  const ctx = {
    window,
    document,
    console,
    Math,
    Set,
    Number,
    String,
    ...P,
    ...X,
    ...F,
    sessionTracker: () => tracker,
    addSessionNavigation: () => {},
    roundSummary: () => JSON.stringify(tracker.snapshot().totals),
    passageFollowup: (previous) => (q = P.passageFollowup(previous)),
    generatePractice: (game, mode, support) =>
      (q = P.generatePractice(game, forced || mode, support)),
    generateConcept: (mode) =>
      (q = X.generateConcept(
        forced?.category || mode,
        forced?.variant,
        forced?.direction,
      )),
  };
  vm.createContext(ctx);
  if (concept) {
    document.getElementById("main").innerHTML =
      '<div id="controls"></div><button id="new"></button><section id="stage"></section><div id="feedback" hidden></div><p id="stats"></p>';
    const src = fs
      .readFileSync(new URL("./concepts-ui.js", import.meta.url), "utf8")
      .replace(/import[\s\S]*?from ["'][^"']+["'];/g, "")
      .replace("export function", "function");
    vm.runInContext(src + "\nstartCodeConcepts();", ctx);
  } else {
    const src = fs
      .readFileSync(new URL("./practice-ui.js", import.meta.url), "utf8")
      .replace(/import[^;]+;/g, "")
      .replace("export function", "function");
    vm.runInContext(src, ctx);
  }
  const $ = (id) => document.getElementById(id),
    click = (id) => {
      $(id).onclick();
      checks++;
    };
  return {
    window,
    document,
    $,
    click,
    tracker,
    get q() {
      return q;
    },
    force(v) {
      forced = v;
    },
    set(id, v) {
      $(id).value = String(v);
    },
    mode(mode) {
      $(concept ? "concept-mode" : "practice-mode").value = mode;
      if (concept) $("concept-mode").dispatchEvent(new window.Event("change"));
      else $("practice-mode").onchange();
    },
    fill(r) {
      if (concept) {
        if (q.interaction === "term") {
          const el =
            $("term-bank").querySelectorAll("button")[q.choices.indexOf(r)];
          el.onclick();
        } else if (q.interaction === "count") {
          $("concept-count").value = String(r === "unknown" ? "" : r);
          if (r === "unknown") $("concept-unknown").checked = true;
        } else
          for (const id of r) {
            const el = $("concept-code").querySelector(
              `[data-component="${id}"]`,
            );
            el.onclick({ stopPropagation() {} });
          }
        return;
      }
      for (const f of q.fields || [])
        $("field-" + f.id).value = String(r[f.id]);
      if (q.kind === "order" || q.kind === "architect")
        for (const id of r.order) {
          $("block-bank").querySelector(`[data-add="${id}"]`).onclick();
        }
      if (q.kind === "multi")
        for (const id of r.selected)
          $("choice-bank").querySelector(`[data-choice="${id}"]`).onclick();
    },
  };
}
for (const [slug, g] of Object.entries(P.practiceGames)) {
  const t = launch(slug);
  eq(t.$("practice-mode").value, "mixed");
  if (slug === "response-builder") eq(t.$("support").value, "full");
  for (const mode of Object.keys(g.modes)) {
    t.mode(mode);
    eq(t.q.mode, mode);
    const q = t.q,
      before = t.tracker.snapshot().totals;
    t.fill(P.solutionPractice(q));
    t.click("practice-check");
    eq(t.tracker.snapshot().totals.firstTry, before.firstTry + 1);
    ok(t.$("practice-check").disabled);
    t.click("practice-check");
    eq(t.tracker.snapshot().totals.submissions, before.submissions + 1);
    t.click("new");
    const revealBefore = t.tracker.snapshot().totals;
    t.click("practice-reveal");
    ok(t.$("practice-check").disabled);
    t.click("practice-check");
    eq(t.tracker.snapshot().totals.attempted, revealBefore.attempted);
    eq(t.tracker.snapshot().totals.revealed, revealBefore.revealed + 1);
    t.click("new");
    const q2 = t.q,
      r = P.solutionPractice(q2);
    const wrong =
      q2.kind === "order"
        ? { order: ["bad1"] }
        : q2.kind === "multi"
          ? { selected: [q2.correct[0]] }
          : q2.kind === "architect"
            ? { ...r, order: [...r.order].reverse() }
            : q2.kind === "test"
              ? {
                  ...r,
                  input:
                    q2.mode === "lists"
                      ? q2.empty
                        ? "4"
                        : "4,5"
                      : q2.mode === "invalid"
                        ? 1
                        : -1000,
                }
              : q2.kind === "simulation"
                ? {
                    answer:
                      q2.fields[0].type === "number"
                        ? 9999
                        : q2.fields[0].options.find(
                            (o) => o.value !== String(q2.solution.answer),
                          ).value,
                  }
                : {
                    ...r,
                    [q2.fields[0].id]: q2.fields[0].options.find(
                      (o) => o.value !== q2.fields[0].correct,
                    ).value,
                  };
    const b = t.tracker.snapshot().totals;
    t.fill(wrong);
    t.click("practice-check");
    eq(t.tracker.snapshot().totals.incorrect, b.incorrect + 1);
    ok(!t.$("practice-check").disabled);
    ok(!t.$("feedback").textContent.includes(q2.explanation));
    // Clear and rebuild the order/selection while retaining the same challenge instance.
    if (q2.kind === "order" || q2.kind === "architect")
      while (t.$("construction").querySelector("[data-remove]"))
        t.$("construction").querySelector("[data-remove]").onclick();
    if (q2.kind === "multi")
      for (const el of t
        .$("choice-bank")
        .querySelectorAll('button[aria-pressed="true"]'))
        el.onclick();
    t.fill(r);
    t.click("practice-check");
    eq(t.tracker.snapshot().totals.afterRetry, b.afterRetry + 1);
    eq(t.tracker.snapshot().totals.attempted, b.attempted + 1);
    eq(t.tracker.snapshot().totals.submissions, b.submissions + 2);
  }
  if (slug === "simulation-lab") {
    t.click("new");
    const b = t.tracker.snapshot().totals;
    t.click("sim-run");
    ok(t.$("sim-chart").querySelector("svg"));
    eq(t.tracker.snapshot().totals.submissions, b.submissions);
    const text = t.$("sim-results").textContent;
    t.click("sim-run");
    eq(t.$("sim-results").textContent, text);
  }
  if (slug === "response-builder") {
    t.click("new");
    const b = t.tracker.snapshot().totals;
    t.set("support", "minimal");
    t.$("support").onchange();
    eq(t.tracker.snapshot().totals, b);
  }
}
// Actual expanded concept UI: every new scenario, both directions, retry then reveal locks.
const t = launch("code-concepts", true);
eq(t.$("concept-mode").value, "mixed");
eq(t.$("concept-mode").querySelectorAll("option").length, 9);
for (const [category, variant] of X.scenarios)
  for (const direction of ["forward", "reverse"]) {
    t.force({ category, variant, direction });
    t.click("new");
    eq(t.q.category, category);
    eq(t.q.direction, direction);
    const q = t.q,
      wrong =
        q.interaction === "term"
          ? q.choices.find((c) => c !== q.answer)
          : ["detail1"];
    const b = t.tracker.snapshot().totals;
    t.fill(wrong);
    t.click("concept-check");
    eq(t.tracker.snapshot().totals.incorrect, b.incorrect + 1);
    ok(!t.$("feedback").textContent.includes(q.explanation));
    t.fill(q.interaction === "term" ? q.answer : q.answerIds);
    t.click("concept-check");
    eq(t.tracker.snapshot().totals.afterRetry, b.afterRetry + 1);
    ok(t.$("concept-check").disabled);
    t.click("new");
    const b2 = t.tracker.snapshot().totals;
    t.click("concept-show");
    t.click("concept-check");
    eq(t.tracker.snapshot().totals.attempted, b2.attempted);
    eq(t.tracker.snapshot().totals.revealed, b2.revealed + 1);
  }
const refreshed = S.createSessionTracker({ storage }).snapshot();
eq(refreshed.totals, t.tracker.snapshot().totals);
for (const game of Object.keys(P.practiceGames)) ok(refreshed.games[game]);
console.log(
  `Expansion DOM: ${checks} checks passed across six new games, expanded concepts, mode defaults, support, retries, reveals, simulations, and shared persistence.`,
);
// Shared code/data passages generate separate tracked questions with unchanged source.
const ap = launch("mixed-ap-practice");
ap.mode("data");
for (let n = 0; !ap.q.passage && n < 100; n++) ap.click("new");
ok(ap.q.passage);
for (let n = 0; n < 4; n++) {
  const context = ap.q.context,
    b = ap.tracker.snapshot().totals;
  ap.click("passage-next");
  eq(ap.q.context, context);
  eq(ap.tracker.snapshot().totals.generated, b.generated + 1);
  ap.fill(P.solutionPractice(ap.q));
  ap.click("practice-check");
  ok(ap.$("practice-check").disabled);
}
// All new game/topic results render in the same printable summary.
{
  const { window, document } = parseHTML(
    fs.readFileSync(
      new URL("./session-summary/index.html", import.meta.url),
      "utf8",
    ),
  );
  const tracker = S.createSessionTracker({ storage });
  tracker.student("Test Student", "3");
  const before = tracker.snapshot();
  const dialog = document.getElementById("reset-dialog");
  dialog.showModal = () => dialog.setAttribute("open", "");
  dialog.close = () => dialog.removeAttribute("open");
  let printed = false;
  window.print = () => (printed = true);
  const ctx = {
    window,
    document,
    console,
    Date,
    sessionTracker: () => tracker,
    accuracy: S.accuracy,
  };
  vm.createContext(ctx);
  vm.runInContext(
    fs
      .readFileSync(new URL("./summary.js", import.meta.url), "utf8")
      .replace(/import[^;]+;/g, ""),
    ctx,
  );
  const report = document.getElementById("report");
  ok(report.textContent.includes("Test Student"));
  for (const g of Object.values(P.practiceGames))
    ok(report.textContent.includes(g.title));
  const gameRows = report
    .querySelectorAll(".report-table")[0]
    .querySelectorAll("tbody tr");
  eq(gameRows.length, Object.keys(before.games).length);
  for (const row of gameRows) {
    const m = Object.values(before.games).find(
        (g) => g.title === row.querySelector("th").textContent,
      ),
      cells = row.querySelectorAll("td");
    eq(Number(cells[0].textContent), m.attempted);
    eq(Number(cells[1].textContent), m.firstTry);
    eq(
      cells[2].textContent,
      S.accuracy(m) === null ? "N/A" : S.accuracy(m).toFixed(1) + "%",
    );
  }
  document.getElementById("print").onclick();
  ok(printed);
  document.getElementById("reset").onclick();
  ok(dialog.hasAttribute("open"));
  document.getElementById("cancel-reset").onclick();
  eq(tracker.snapshot().totals, before.totals);
  document.getElementById("reset").onclick();
  document.getElementById("confirm-reset").onclick();
  eq(tracker.snapshot().totals.attempted, 0);
  eq(tracker.snapshot().student.name, "Test Student");
}
console.log(
  "Shared passages and expanded printable summary: accurate game/topic rows, print action, and reset cancel/confirm verified.",
);
