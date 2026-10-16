import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as R from "./response-engine.js";
import * as S from "./session.js";
let seed = 3283;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let checks = 0,
  generated = 0;
const ok = (v) => {
    assert.ok(v);
    checks++;
  },
  eq = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  };
function independent(p, args) {
  const a = args[0];
  switch (p.structure) {
    case "count": {
      let n = 0;
      for (const v of a) if (v >= args[1]) n++;
      return n;
    }
    case "sum": {
      let n = 0;
      for (const v of a) n += v;
      return n;
    }
    case "product": {
      let n = 1;
      for (const v of a) n *= v;
      return n;
    }
    case "first-index": {
      for (let i = 0; i < a.length; i++) if (a[i] === args[1]) return i + 1;
      return -1;
    }
    case "filter": {
      const r = [];
      for (const v of a) if (v > args[1]) r.push(v);
      return r;
    }
    case "maximum": {
      if (!a.length) return "NONE";
      let best = a[0];
      for (let i = 1; i < a.length; i++) if (a[i] > best) best = a[i];
      return best;
    }
    case "all": {
      for (const v of a) if (v <= 0) return false;
      return true;
    }
    case "range":
      return a < args[1] || a > args[2] ? "outside" : "inside";
    case "scale":
      return args[2] + args[1] * a;
    case "reverse": {
      let r = [];
      for (let i = a.length - 1; i >= 0; i--) r.push(a[i]);
      return r;
    }
  }
}
const samples = [],
  bench = {};
for (const mode of Object.keys(R.responseModes))
  for (const support of Object.keys(R.supportNames)) {
    const structures = new Set(),
      positions = new Set();
    let longest = 0,
      fixed = 0;
    for (let i = 0; i < 200; i++) {
      const q = R.generateResponse(mode, support),
        p = q.procedure;
      generated++;
      structures.add(q.structure);
      positions.add(q.items.findIndex((i) => i.id === q.correct.claim));
      const model = {
        ...q.solution,
        order:
          support === "minimal"
            ? [q.correct.claim, q.correct.reason]
            : q.solution.order,
      };
      ok(R.evaluateResponse(q, model).correct);
      eq(q.topic, mode + "." + support);
      eq(q.items.length, 9);
      eq(new Set(q.items.map((i) => i.id)).size, 9);
      eq(new Set(q.items.map((i) => i.text)).size, 9);
      ok(q.items.every((i) => !i.label && !/network|encrypt/i.test(i.text)));
      ok(p.validLines.length > 0);
      ok(q.evidencePrompt.startsWith("Select"));
      for (const line of p.validLines) ok(p.lines[line - 1].trim().length > 0);
      ok(JSON.stringify(p.run(p.sample)) !== JSON.stringify(p.run(p.other)));
      for (const args of [p.sample, p.other])
        eq(p.run(args), independent(p, args));
      const edge = p.params.includes("values")
        ? [
            [[], p.t],
            [[-2], p.t],
            [[0, 0, -1, 3], p.t],
          ]
        : p.structure === "range"
          ? [
              [0, 0, 2],
              [2, 0, 2],
              [-1, 0, 2],
              [3, 0, 2],
            ]
          : [
              [-1, 2, 0],
              [0, 3, 2],
              [3, 4, -1],
            ];
      for (const args of edge) eq(p.run(args), independent(p, args));
      if (support === "full") {
        for (const role of ["claim", "evidence", "reason"]) {
          const wrong = q.items.find((i) => i.role === role && !i.correct);
          ok(!R.evaluateResponse(q, { ...model, [role]: wrong.id }).correct);
        }
      } else {
        const alternative = {
          ...model,
          order:
            support === "minimal"
              ? model.order
              : [q.correct.evidence, q.correct.claim, q.correct.reason],
        };
        ok(R.evaluateResponse(q, alternative).correct);
        ok(
          !R.evaluateResponse(q, {
            ...model,
            order: [...model.order].reverse(),
          }).correct,
        );
        ok(
          !R.evaluateResponse(q, {
            ...model,
            order: [...model.order, model.order[0]],
          }).correct,
        );
      }
      if (support === "minimal") {
        ok(!R.evaluateResponse(q, { ...model, line: 1 }).correct);
        for (const line of p.validLines)
          ok(R.evaluateResponse(q, { ...model, line }).correct);
      }
      const byRole = Object.fromEntries(
        ["claim", "evidence", "reason"].map((role) => [
          role,
          q.items.filter((i) => i.role === role),
        ]),
      );
      const guess = (method) => {
        const ids = Object.fromEntries(
          Object.entries(byRole).map(([role, items]) => [
            role,
            method(items).id,
          ]),
        );
        return {
          ...ids,
          order:
            support === "minimal"
              ? [ids.claim, ids.reason]
              : Object.values(ids),
          line: p.validLines[0],
        };
      };
      // Give shortcut strategies perfect evidence and coherent order: they still must pick the content.
      longest += Number(
        R.evaluateResponse(
          q,
          guess(
            (items) =>
              [...items].sort((a, b) => b.text.length - a.text.length)[0],
          ),
        ).correct,
      );
      fixed += Number(
        R.evaluateResponse(
          q,
          guess((items) => items[0]),
        ).correct,
      );
      const wrong =
        q.layout === "sections"
          ? {
              ...model,
              claim: q.items.find((i) => i.role === "claim" && !i.correct).id,
            }
          : {
              ...model,
              order: [
                q.items.find((i) => i.role === "claim" && !i.correct).id,
                q.correct.reason,
              ],
            };
      const feedback = R.evaluateResponse(q, wrong);
      ok(!feedback.correct);
      ok(feedback.details.includes(p.call(p.sample)));
      ok(feedback.details.includes("Misconceptions"));
      ok(feedback.details.includes("Relevant code"));
      if (i === 0)
        samples.push({
          mode,
          support,
          structure: q.structure,
          prompt: q.prompt,
          code: q.code,
          candidates: q.items.map((i) => i.text),
          worked: R.evaluateResponse(q, model).details,
        });
    }
    eq(structures.size, 10);
    ok(positions.size >= 7);
    bench[mode + "." + support] = { longest, fixed, outOf: 200 };
    ok(longest < 150);
    ok(fixed < 100);
  }
const mixed = new Set();
for (let i = 0; i < 500; i++) mixed.add(R.generateResponse().mode);
eq([...mixed].sort(), Object.keys(R.responseModes).sort());
const { parseHTML } = createRequire(import.meta.url)(
  process.env.CSP_DOM_LIBRARY || "linkedom",
);
const { document, window } = parseHTML(
  fs.readFileSync(
    new URL("./response-builder/index.html", import.meta.url),
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
const context = {
  document,
  window,
  console,
  ...R,
  generateResponse: (mode, support) => (q = R.generateResponse(mode, support)),
  sessionTracker: () => tracker,
  addSessionNavigation: () => {},
  roundSummary: () => JSON.stringify(tracker.snapshot().totals),
};
vm.createContext(context);
vm.runInContext(
  fs
    .readFileSync(new URL("./response-ui.js", import.meta.url), "utf8")
    .replace(/import[^;]+;/g, "")
    .replace("export function", "function"),
  context,
);
const $ = (id) => document.getElementById(id);
eq($("mode").value, "mixed");
eq($("support").value, "full");
function fill(correct = true, alt = false) {
  if (q.layout === "sections")
    for (const role of ["claim", "evidence", "reason"])
      $(role).value = correct
        ? q.correct[role]
        : q.items.find((i) => i.role === role && !i.correct).id;
  else {
    const ids = correct
      ? q.support === "minimal"
        ? [q.correct.claim, q.correct.reason]
        : alt
          ? [q.correct.evidence, q.correct.claim, q.correct.reason]
          : q.solution.order
      : [
          q.items.find((i) => i.role === "claim" && !i.correct).id,
          q.correct.reason,
        ];
    for (const id of ids)
      $("bank").querySelector(`[data-add="${id}"]`).onclick();
    if (q.support === "minimal")
      $("code").querySelector(`[data-line="${q.solution.line}"]`).onclick();
  }
}
for (const mode of Object.keys(R.responseModes))
  for (const support of Object.keys(R.supportNames)) {
    $("mode").value = mode;
    $("mode").onchange();
    $("support").value = support;
    $("support").onchange();
    eq(q.mode, mode);
    eq(q.support, support);
    eq(
      q.layout,
      support === "full"
        ? "sections"
        : support === "partial"
          ? "order"
          : "code",
    );
    if ($("bank")) ok(!$("bank").textContent.includes("Possible sentence"));
    let b = tracker.snapshot().totals;
    fill(false);
    $("check").onclick();
    eq(tracker.snapshot().totals.attempted, b.attempted + 1);
    eq(tracker.snapshot().totals.incorrect, b.incorrect + 1);
    eq(tracker.snapshot().totals.revealed, b.revealed + 1);
    eq(tracker.snapshot().totals.firstTry, b.firstTry);
    ok($("check").disabled);
    $("check").onclick();
    eq(tracker.snapshot().totals.submissions, b.submissions + 1);
    ok($("feedback").textContent.includes("Relevant code"));
    $("new").onclick();
    b = tracker.snapshot().totals;
    fill(true, true);
    $("check").onclick();
    eq(tracker.snapshot().totals.firstTry, b.firstTry + 1);
    ok($("check").disabled);
    $("check").onclick();
    eq(tracker.snapshot().totals.submissions, b.submissions + 1);
    $("new").onclick();
    b = tracker.snapshot().totals;
    $("show").onclick();
    eq(tracker.snapshot().totals.revealed, b.revealed + 1);
    eq(tracker.snapshot().totals.attempted, b.attempted);
    $("check").onclick();
    eq(tracker.snapshot().totals.submissions, b.submissions);
  }
const snapshot = tracker.snapshot();
eq(S.createSessionTracker({ storage }).snapshot().totals, snapshot.totals);
eq(Object.keys(snapshot.games["response-builder"].topics).length, 15);
for (const t of Object.values(snapshot.games["response-builder"].topics))
  ok(/Support/.test(t.title));
fs.writeFileSync(
  "/tmp/response-review-samples.json",
  JSON.stringify(samples, null, 2),
);
fs.writeFileSync(
  "/tmp/response-shortcut-results.json",
  JSON.stringify(bench, null, 2),
);
console.log(
  `Response Builder: ${generated} randomized questions (200 per mode/support), ten structures per mode, ${checks} integrity/behavior/UI assertions; shortcuts: ${JSON.stringify(bench)}`,
);
