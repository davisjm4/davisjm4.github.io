import {bigIdeaMetrics,networkMetrics} from './session-groups.js';
import {createProgressStore} from './exam-readiness/storage.js';
import {initializeFromSession,recordFirstSubmission} from './exam-readiness/bridge.js';
import { mountCollectionEditor } from "./collection-editor.js";
import { practiceGames } from "./practice-engine.js";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as E from "./engine.js";
import * as C from "./concepts-engine.js";
import * as F from "./concepts-feedback.js";
const { parseHTML } = createRequire(import.meta.url)(
  process.env.CSP_DOM_LIBRARY || "linkedom",
);
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8"),
  sessionSource = read("./session.js").replace(/import[^;]+;/g, "").replace(/export /g, ""),
  appSource = read("./app.js")
    .replace(/import[^;]+;/g, "")
    .replace("export const catalog", "const catalog"),
  conceptSource = read("./concepts-ui.js")
    .replace(/import[\s\S]*?from ["'][^"']+["'];/g, "")
    .replace("export function", "function");
const memory = new Map(),
  storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  };
let checks = 0;
const ok = (v, m) => {
    assert.ok(v, m);
    checks++;
  },
  eq = (a, b) => {
    assert.deepEqual(
      JSON.parse(JSON.stringify(a)),
      JSON.parse(JSON.stringify(b)),
    );
    checks++;
  };
function launch(slug) {
  const file =
      slug === "root-network"
        ? "../network-breaker.html"
        : slug === "summary"
          ? "./session-summary/index.html"
          : `./${slug}/index.html`,
    html = read(file),
    { document, window } = parseHTML(html),
    captures = {},
    engine = { ...E };
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
  for (let key of [
    "booleanChallenge",
    "listChallenge",
    "searchChallenge",
    "networkChallenge",
    "compressionChallenge",
    "dataChallenge",
    "raceChallenge",
    "phishingChallenge",
  ])
    engine[key] = (...args) => (captures[key] = E[key](...args));
  for (let key of ["optimalSchedule", "optimalDependent"])
    engine[key] = (...args) => (
      (captures.schedule = { times: args[0], p: args[1], deps: args[2] }),
      (captures[key] = E[key](...args))
    );
  const ctx = {
    createProgressStore, initializeFromSession, recordFirstSubmission,
    bigIdeaMetrics,networkMetrics,
    mountCollectionEditor,
    practiceGames,
    document,
    window,
    console,
    E: engine,
    ...C,
    ...F,
    generateConcept: (...args) =>
      (captures.concept = C.generateConcept(...args)),
    localStorage: storage,
    sessionStorage: storage,
    Math,
    Set,
    Date,
    setInterval: () => 1,
    clearInterval: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(sessionSource, ctx);
  if (slug === "summary") {
    let dialog = document.getElementById("reset-dialog");
    dialog.showModal = () => dialog.setAttribute("open", "");
    dialog.close = () => dialog.removeAttribute("open");
    window.print = () => (captures.printed = (captures.printed || 0) + 1);
    vm.runInContext(read("./summary.js").replace(/import[^;]+;/g, ""), ctx);
  } else if (slug === "network-breaker" || slug === "root-network") {
    let script = html
      .match(/<script type="module">([\s\S]*?)<\/script>/)[1]
      .replace(/import[^;]+;/g, "");
    vm.runInContext(script, ctx);
  } else {
    vm.runInContext(conceptSource, ctx);
    vm.runInContext(appSource, ctx);
  }
  const $ = (id) => document.getElementById(id),
    click = (id) => {
      let b = $(id);
      ok(b, "button " + id);
      if (b.onclick) b.onclick();
      else b.dispatchEvent(new window.Event("click"));
    },
    change = (id, value) => {
      $(id).value = String(value);
      $(id).dispatchEvent(new window.Event("change"));
    };
  return {
    practiceGames,
    document,
    window,
    ctx,
    captures,
    $,
    click,
    change,
    tracker: ctx.sessionTracker(),
  };
}
function correct(t, slug) {
  const c = t.captures;
  if (slug === "binary-builder") {
    if (t.$("mode").value !== "representation")
      t.change("mode", "representation");
    let n = +t.$("length").value,
      target = +t.document.querySelector(".big-number").textContent,
      bits = target.toString(2).padStart(n, "0");
    for (let i = 0; i < n; i++)
      if (t.$("bit" + i).textContent !== bits[i]) t.click("bit" + i);
    t.click("check");
  }
  if (slug === "boolean-gatekeeper") {
    t.change("mode", "evaluate");
    t.click(
      String(E.evaluate(c.booleanChallenge.e, c.booleanChallenge.values)),
    );
    t.click("check");
  }
  if (slug === "list-lab") {
    t.change("mode", "build");
    for (let o of c.listChallenge.ops) {
      t.$("operation").value = o.type;
      t.$("index").value = o.index;
      t.$("item").value = o.value;
      t.click("add");
    }
    t.click("check");
  }
  if (slug === "binary-search-hunt") {
    let g = c.searchChallenge;
    for (let i of E.searchTrace(g.values, g.target)) t.click("card" + i);
    t.click(g.present ? "found" : "absent");
  }
  if (slug === "packet-router") {
    let g = c.networkChallenge,
      q = [[g.start]],
      seen = new Set([g.start]);
    for (let r of q) {
      if (r.at(-1) === g.end) {
        for (let i of r.slice(1)) t.click("node" + i);
        break;
      }
      for (let [k, [a, b]] of g.edges.entries()) {
        let v = a === r.at(-1) ? b : b === r.at(-1) ? a : -1;
        if (v >= 0 && !seen.has(v) && !g.broken.has(k)) {
          seen.add(v);
          q.push([...r, v]);
        }
      }
    }
    t.click("send");
  }
  if (slug === "compression-challenge") {
    t.change("mode", "text");
    t.$("encoding").value = E.rleText(c.compressionChallenge.a);
    t.click("check");
  }
  if (slug === "data-detective") {
    t.change("mode", "table");
    let instruction = t.$("stage").querySelector("p").textContent,
      group = instruction.match(/every (\w+) record/)[1],
      threshold = +instruction.match(/least (\d+)/)[1];
    for (let d of c.dataChallenge.filter(
      (d) => d.group === group && d.score >= threshold,
    )) {
      let b = t.$("table").querySelector(`[data-record="${d.id}"]`);
      b.checked = true;
      b.onchange();
    }
    t.click("check");
  }
  if (slug === "algorithm-race") {
    let g = c.raceChallenge;
    t.click(
      g.steps[0] === g.steps[1] ? "tie" : g.steps[0] < g.steps[1] ? "a" : "b",
    );
    t.click("check");
  }
  if (slug === "cybersecurity-defender") {
    t.change("mode", "phishing");
    for (let f of c.phishingChallenge.bad)
      t.$("stage").querySelector(`[data-field="${f}"]`).onclick();
    t.click("check");
  }
  if (slug === "parallel-processing-race") {
    let o = c.optimalSchedule || c.optimalDependent;
    for (let [i, v] of o.assignment.entries()) t.change("assign" + i, v);
    t.click("check");
  }
  if (slug === "code-concepts") {
    let q = c.concept;
    if (q.interaction === "count") {
      if (q.answer === "unknown") {
        t.$("concept-unknown").checked = true;
        t.$("concept-unknown").onchange();
      } else t.$("concept-count").value = q.answer;
    } else
      for (let id of q.answerIds)
        t.$("concept-code")
          .querySelector(`[data-component="${id}"]`)
          .onclick({ stopPropagation() {} });
    t.click("concept-check");
  }
  if (slug === "network-breaker" || slug === "root-network") {
    let g = t.window.NetworkBreakerTest.state.graph;
    for (let key of g.cut)
      t.document
        .querySelector(`[data-edge-key="${key}"]`)
        .dispatchEvent(new t.window.Event("click"));
    t.click("check");
  }
}
const slugs = [
  "binary-builder",
  "boolean-gatekeeper",
  "list-lab",
  "binary-search-hunt",
  "packet-router",
  "compression-challenge",
  "data-detective",
  "algorithm-race",
  "cybersecurity-defender",
  "parallel-processing-race",
  "code-concepts",
  "network-breaker",
];
for (let slug of slugs) {
  let t = launch(slug),
    before = t.tracker.snapshot().totals.submissions;
  ok(t.document.querySelector("[data-session-link]"), "summary link " + slug);
  correct(t, slug);
  let data = t.tracker.snapshot();
  eq(data.totals.submissions, before + 1);
  eq(data.games[slug].firstTry, 1);
  ok(data.games[slug].topics && Object.keys(data.games[slug].topics).length);
  let totals = data.totals;
  let check =
    slug === "code-concepts"
      ? "concept-check"
      : slug === "packet-router"
        ? "send"
        : slug === "binary-search-hunt"
          ? t.captures.searchChallenge.present
            ? "found"
            : "absent"
          : "check";
  t.click(check);
  eq(t.tracker.snapshot().totals, totals);
  t.window.dispatchEvent(new t.window.Event("pagehide"));
}
let data = launch("binary-builder").tracker.snapshot();
eq(data.totals.firstTry, 12);
eq(data.totals.attempted, 12); // data shared across page visits.
let t = launch("binary-builder");
t.change("mode", "representation");
let target = +t.document.querySelector(".big-number").textContent;
if (target === 0) t.click("bit0");
t.click("check");
ok(t.$("feedback").classList.contains("bad"));
let before = t.tracker.snapshot().games["binary-builder"];
correct(t, "binary-builder");
let after = t.tracker.snapshot().games["binary-builder"];
eq(after.attempted, before.attempted);
eq(after.submissions, before.submissions + 1);
eq(after.afterRetry, before.afterRetry + 1);
eq(after.firstTry, before.firstTry);
let saved = t.tracker.snapshot().totals;
t.window.dispatchEvent(new t.window.Event("pagehide"));
let refreshed = launch("binary-builder");
eq(refreshed.tracker.snapshot().totals.attempted, saved.attempted);
eq(refreshed.tracker.snapshot().totals.firstTry, saved.firstTry);
// Show answer without submitting does not enter the first-try denominator.
t = launch("code-concepts");
before = t.tracker.snapshot().totals;
t.click("concept-show");
after = t.tracker.snapshot().totals;
eq(after.attempted, before.attempted);
eq(after.revealed, before.revealed + 1);
correct(t, "code-concepts");
eq(t.tracker.snapshot().totals, after);
t = launch("network-breaker");
before = t.tracker.snapshot().totals;
t.click("solution");
t.click("check");
after = t.tracker.snapshot().totals;
eq(after.attempted, before.attempted);
eq(after.revealed, before.revealed + 1);
eq(after.firstTry, before.firstTry);
// Incorrect race attempts must not expose counted results or animation.
t = launch("algorithm-race");
let r = t.captures.raceChallenge,
  wrong = r.steps[0] === r.steps[1] ? "a" : r.steps[0] < r.steps[1] ? "b" : "a";
t.click(wrong);
t.click("check");
ok(t.$("feedback").classList.contains("bad"));
eq(t.$("simulation").innerHTML, "");
ok(!t.$("feedback").textContent.includes(r.explain));
correct(t, "algorithm-race");
ok(t.$("simulation").innerHTML.includes("steps"));
// Legacy Network Breaker URL participates in the same session.
t = launch("root-network");
let old = t.tracker.snapshot().games["network-breaker"].firstTry;
correct(t, "root-network");
eq(t.tracker.snapshot().games["network-breaker"].firstTry, old + 1);
// Summary reflects saved identity and report totals, and escapes optional names.
t.tracker.student("<script>Alex</script>", "Period 4");
const modeSample = t.tracker.begin("algorithm-race", "Algorithm Race", "race/linear", "Linear search", "linear", "Linear search");
t.tracker.submit(modeSample, true);
let summary = launch("summary");
ok(summary.$("report").textContent.includes("<script>Alex</script>"));
ok(!summary.$("report").querySelector("script"));
ok(summary.$("report").textContent.includes("Period 4"));
ok(summary.$("report").textContent.includes("Inactive and away time are excluded"));
eq(
  summary.$("report").querySelectorAll("table").length,
  Object.keys(summary.tracker.snapshot().games).length + 1 + Object.values(summary.tracker.snapshot().games).filter((g) => Object.keys(g.modes || {}).length).length,
);
ok(summary.$("report").textContent.includes("By practice mode"));
ok(summary.$("report").textContent.includes("Session date"));
ok(summary.$("report").textContent.includes("Linear search"));
summary.click("print");
eq(summary.captures.printed, 1);
let snap = summary.tracker.snapshot();
summary.click("reset");
ok(summary.$("reset-dialog").hasAttribute("open"));
eq(summary.tracker.snapshot(), snap);
summary.click("cancel-reset");
eq(summary.tracker.snapshot(), snap);
summary.click("reset");
summary.click("confirm-reset");
ok(summary.tracker.snapshot().id !== snap.id);
eq(summary.tracker.snapshot().totals.attempted, 0);
eq(summary.tracker.snapshot().student, snap.student);
ok(summary.$("report").textContent.includes("—"));
ok(!summary.$("reset-dialog").hasAttribute("open"));
console.log(
  `PASS: ${checks} cross-game/session/report DOM assertions: all 12 games plus legacy link, retries, persistence, reveals, print action, escaped identity, reset confirmation/cancel/confirm, and topic tables. Rendered print/device QA remains unavailable.`,
);
