import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as J from "./engine.js";
import { mathGame } from "./math-lab/engine.js";
import { robotGame } from "./robot-algorithms/engine.js";
import { classObjectGame } from "./class-object-lab/class-engine.js";
import { methodLabGame } from "./method-constructor-lab/engine.js";
import { booleanGame } from "./boolean-conditional-lab/engine.js";
import { recursionGame } from "./recursion-lab/engine.js";
import { arrayListGame } from "./arraylist-lab/engine.js";
import { docLabGame } from "./documentation-lab/engine.js";
import { linkedListGame } from "./linkedlist-lab/engine.js";
import { diagnostics } from "./diagnostics.js";
import * as S from "./session.js";
import { mountCollectionEditor } from "../csp-games/collection-editor.js";
const require = createRequire(import.meta.url),
  { parseHTML } = require(process.env.CSP_DOM_LIBRARY || "linkedom");
let seed = 4096;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let checks = 0;
const eq = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  },
  ok = (v) => {
    assert.ok(v);
    checks++;
  };
const memory = new Map(),
  storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  };
function launch(slug) {
  const { window, document } = parseHTML(
    fs.readFileSync(
      new URL(`./${slug ? slug + "/" : ""}index.html`, import.meta.url),
      "utf8",
    ),
  );
  let q,
    forced,
    confirm = true;
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
      for (const o of this.querySelectorAll("option")) {
        o.removeAttribute("selected");
        if (o.getAttribute("value") === String(v))
          o.setAttribute("selected", "");
      }
    },
  });
  window.confirm = () => confirm;
  const tracker = S.createSessionTracker({ storage });
  const ctx = {
    window,
    document,
    console,
    Math,
    Set,
    clearTimeout,
    setTimeout,
    diagnostics,
    mathGame,
    robotGame,
    classObjectGame,
    methodLabGame,
    booleanGame,
    recursionGame,
    arrayListGame,
    docLabGame,
    linkedListGame,
    J: { ...J, generate: (game, mode) => (q = J.generate(game, mode, forced)) },
    sessionTracker: () => tracker,
    roundSummary: () => JSON.stringify(tracker.snapshot().totals),
    addSessionNavigation: () => {},
    mountCollectionEditor: (host, opts) => {
      globalThis.document = document;
      return mountCollectionEditor(host, opts);
    },
  };
  vm.createContext(ctx);
  vm.runInContext(
    fs
      .readFileSync(new URL("./app.js", import.meta.url), "utf8")
      .replace(/import[^;]+;/g, ""),
    ctx,
  );
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
    confirm(v) {
      confirm = v;
    },
    mode(v) {
      $("mode").value = v;
      $("mode").onchange();
    },
    fill(r) {
      if (q.kind === "debug") {
        $("java-code")
          .querySelector(`[data-location="${r.location}"]`)
          .onclick();
        $("fix-bank")
          .querySelectorAll("button")
          [q.fixes.indexOf(r.fix)].onclick();
      }
      if (q.kind === "select")
        $("java-code")
          .querySelector(`[data-node="${r.id}"]`)
          .onclick({ stopPropagation() {} });
      if (q.kind === "value")
        $("value-bank")
          .querySelectorAll("button")
          [q.choices.indexOf(String(r.answer))].onclick();
      if (q.kind === "multi")
        for (const id of r.ids)
          $("grid").querySelector(`[data-cell="${id}"]`).onclick();
      if (q.kind === "assemble")
        for (const f of q.fields) {
          $("piece-" + f.id).value = r[f.id];
          $("piece-" + f.id).onchange();
        }
      if (q.kind === "collection") {
        const e = $("collection-editor").javaEditor;
        if (q.fixed) {
          for (const [index, value] of r.values.entries())
            e.drop({ kind: "bank", value }, { kind: "slot", index });
        } else {
          while (e.values.length)
            e.drop({ kind: "item", index: 0 }, { kind: "trash" });
          for (const value of r.values)
            e.drop(
              { kind: "bank", value },
              { kind: "gap", index: e.values.length },
            );
        }
      }
    },
  };
}
const home = launch("");
eq(home.document.querySelectorAll(".card").length, 13);
ok(home.document.querySelector('a[href="method-constructor-lab/"]'));
ok(home.document.querySelector('a[href="boolean-conditional-lab/"]'));
ok(home.document.querySelector('a[href="robot-algorithms/"]'));
ok(home.document.querySelector('a[href="class-object-lab/"]'));
ok(home.document.querySelector('a[href="math-lab/"]'));
for (const [slug, g] of Object.entries(J.games)) {
  const t = launch(slug);
  eq(t.$("mode").value, "mixed");
  for (const mode of Object.keys(g.modes))
    for (let n = 0; n < 15; n++) {
      t.mode(mode);
      const q = t.q,
        b = t.tracker.snapshot().totals;
      t.fill(J.solution(q));
      t.click("check");
      eq(t.tracker.snapshot().totals.firstTry, b.firstTry + 1);
      ok(t.$("check").disabled);
      t.click("check");
      eq(t.tracker.snapshot().totals.submissions, b.submissions + 1);
      t.click("new");
      const b2 = t.tracker.snapshot().totals;
      t.click("show");
      eq(t.tracker.snapshot().totals.revealed, b2.revealed + 1);
      eq(t.tracker.snapshot().totals.attempted, b2.attempted);
      t.click("check");
      eq(t.tracker.snapshot().totals.attempted, b2.attempted);
      t.click("new");
      const current = t.q,
        answer = J.solution(current),
        wrong =
          current.kind === "debug"
            ? {
                location: current.location,
                fix: current.fixes.find((f) => f !== current.fix),
              }
            : current.kind === "select"
              ? {
                  id: J.nodes(current.root).find(
                    (n) => n.id !== current.answerId && n.id !== "snippet",
                  ).id,
                }
              : current.kind === "value"
                ? {
                    answer: current.choices.find(
                      (v) => v !== String(current.answer),
                    ),
                  }
                : current.kind === "multi"
                  ? {
                      ids: [
                        current.cells.find(
                          (c) => !current.answerIds.includes(c.id),
                        )?.id || current.cells[0].id,
                      ],
                    }
                  : current.kind === "assemble"
                    ? {
                        ...answer,
                        type: current.fields[0].choices.find(
                          (v) => v !== answer.type,
                        ),
                      }
                    : {
                        values: current.fixed
                          ? current.initial.map(() => 20)
                          : [],
                      };
      // Empty final lists can be valid; construct an unmistakably wrong extra element in that case.
      if (
        current.kind === "collection" &&
        !current.fixed &&
        current.answer.length === 0
      )
        wrong.values = [20];
      const b3 = t.tracker.snapshot().totals;
      t.fill(wrong);
      t.click("check");
      eq(t.tracker.snapshot().totals.incorrect, b3.incorrect + 1);
      ok(!t.$("check").disabled);
      ok(!t.$("feedback").textContent.includes(current.explanation));
      if (current.kind === "multi")
        for (const el of t.$("grid").querySelectorAll('[aria-pressed="true"]'))
          el.onclick();
      t.fill(answer);
      t.click("check");
      eq(t.tracker.snapshot().totals.afterRetry, b3.afterRetry + 1);
      eq(t.tracker.snapshot().totals.submissions, b3.submissions + 2);
    }
}
// Token selection alone never scores or reveals the correct location.
for (const [variant,mode] of J.debugTemplates) {
  const t=launch("debugger-lab"); t.force(variant); t.mode(mode);
  const q=t.q, before=t.tracker.snapshot().totals;
  eq(t.$("java-code").querySelectorAll(".java-line,.insertion-boundary").length,0);
  const target=t.$("java-code").querySelector(`[data-location="${q.location}"]`);
  eq(target.tagName,"BUTTON"); ok(target.getAttribute("aria-label"));
  target.onclick(); eq(target.getAttribute("aria-pressed"),"true");
  eq(t.tracker.snapshot().totals,before);
  t.click("check"); eq(t.tracker.snapshot().totals,before);
  for(let attempt=0;attempt<3;attempt++) {
    t.fill({location:q.location,fix:q.fixes.find(f=>f!==q.fix)}); t.click("check");
    ok(!t.$("feedback").textContent.includes(q.explanation));
    eq(t.$("java-code").querySelectorAll(".answer").length,0);
  }
  t.click("show"); eq(t.tracker.snapshot().totals.revealed,before.revealed+1);
  t.click("check"); eq(t.tracker.snapshot().totals.firstTry,before.firstTry);
}
// Watch Execution is an intentional reveal, with cancellation preserving scoring.
const loop = launch("loop-lab");
loop.mode("execution");
ok(loop.$("watch").hidden);
ok(loop.$("watch").disabled);
const beforeWatch=loop.tracker.snapshot().totals;
loop.click("watch");
eq(loop.tracker.snapshot().totals,beforeWatch);
ok(loop.$("execution").hidden);
loop.click("check");
ok(loop.$("watch").hidden);
const wrong = loop.q.choices.find((x) => x !== String(loop.q.answer));
loop.fill({ answer: wrong });
loop.click("check");
const b = loop.tracker.snapshot().totals;
loop.confirm(false);
loop.click("watch");
eq(loop.tracker.snapshot().totals, b);
loop.confirm(true);
loop.click("watch");
eq(loop.tracker.snapshot().totals.revealed, b.revealed + 1);
ok(loop.$("check").disabled);
ok(!loop.$("execution").hidden);
loop.click("execution-step");
ok(loop.$("execution-state").textContent.includes("Step"));
const reload = S.createSessionTracker({ storage });
eq(reload.snapshot().totals, loop.tracker.snapshot().totals);
for (const slug of Object.keys(J.games)) ok(reload.snapshot().games[slug]);
console.log(
  `Java DOM: ${checks} checks passed across all four games and modes, complete two-part debugging, retries/reveals, collection edits, loop walkthroughs, defaults, and persistence.`,
);
// Java's report, print action, and reset UI remain separate from CSP results.
{
  const CS = await import("../csp-games/session.js");
  const csp = CS.createSessionTracker({ storage });
  const id = csp.begin("binary-builder", "Binary Builder", "representation");
  csp.submit(id, true);
  const cspBefore = csp.snapshot();
  const tracker = S.createSessionTracker({ storage });
  tracker.student("Java Student", "4");
  const before = tracker.snapshot();
  const { window, document } = parseHTML(
    fs.readFileSync(
      new URL("./session-summary/index.html", import.meta.url),
      "utf8",
    ),
  );
  const dialog = document.getElementById("reset-dialog");
  dialog.showModal = () => dialog.setAttribute("open", "");
  dialog.close = () => dialog.removeAttribute("open");
  let printed = false;
  window.print = () => (printed = true);
  const ctx = {
    window,
    document,
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
  ok(report.textContent.includes("Java Student"));
  for (const g of Object.values(J.games))
    ok(report.textContent.includes(g.name));
  eq(
    report.querySelectorAll(".report-table")[0].querySelectorAll("tbody tr")
      .length,
    4,
  );
  ok(!report.textContent.includes("Binary Builder"));
  document.getElementById("print").onclick();
  ok(printed);
  document.getElementById("reset").onclick();
  ok(dialog.hasAttribute("open"));
  document.getElementById("cancel-reset").onclick();
  eq(tracker.snapshot().totals, before.totals);
  document.getElementById("reset").onclick();
  document.getElementById("confirm-reset").onclick();
  eq(tracker.snapshot().totals.attempted, 0);
  eq(tracker.snapshot().student.name, "Java Student");
  assert.deepEqual(csp.snapshot(), cspBefore);
}
console.log(
  "Java summary: all four games, identity, print, confirmed reset/cancel, and CSP data preservation verified.",
);
