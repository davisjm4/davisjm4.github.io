import { practiceGames } from "./practice-engine.js";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as logic from "./engine.js";
import * as S from "./session.js";
const require = createRequire(import.meta.url),
  { parseHTML } = require(process.env.CSP_DOM_LIBRARY || "linkedom");
const src = fs
  .readFileSync(new URL("./app.js", import.meta.url), "utf8")
  .replace(/import[^;]+;/g, "")
  .replace("export const catalog", "const catalog");
let seed = 123456789;
Math.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
let checks = 0;
function launch(slug) {
  const { document, window } = parseHTML(
    fs.readFileSync(
      new URL(`./${slug ? slug + "/" : ""}index.html`, import.meta.url),
      "utf8",
    ),
  );
  // LinkeDOM omits browser select defaults. Supply standard select-value behavior for tests.
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
  let captures = {},
    E = { ...logic };
  for (let k of [
    "binaryExtension",
    "cleaningChallenge",
    "booleanChallenge",
    "listChallenge",
    "searchChallenge",
    "networkChallenge",
    "compressionChallenge",
    "dataChallenge",
    "raceChallenge",
    "phishingChallenge",
  ])
    E[k] = (...a) => (captures[k] = logic[k](...a));
  for (let k of ["optimalSchedule", "optimalDependent"])
    E[k] = (...a) => {
      captures.schedule = { times: a[0], p: a[1], deps: a[2] };
      return (captures[k] = logic[k](...a));
    };
  const memory = new Map(),
    sharedTracker = S.createSessionTracker({
      storage: {
        getItem: (k) => memory.get(k) || null,
        setItem: (k, v) => memory.set(k, v),
      },
    });
  let context = {
    sessionTracker: () => sharedTracker,
    addSessionNavigation: () => {},
    roundSummary: () => "Shared session results",
    startCodeConcepts: () => {},
    practiceGames,
    document,
    window,
    practiceGames,
    E,
    console,
    Event: window.Event,
    Set,
    Math,
  };
  vm.createContext(context);
  vm.runInContext(src, context);
  const $ = (id) => document.getElementById(id);
  const click = (id) => {
    assert.ok($(id), id);
    $(id).onclick();
    checks++;
  };
  const change = (id, v) => {
    $(id).value = String(v);
    $(id).dispatchEvent(new window.Event("change"));
    checks++;
  };
  const good = () => {
    assert.ok(
      $("feedback").classList.contains("good"),
      $("feedback").textContent,
    );
    checks++;
  };
  const bad = () => {
    assert.ok(
      $("feedback").classList.contains("bad") ||
        $("feedback").textContent.includes("already complete"),
      $("feedback").textContent,
    );
    checks++;
  };
  return { $, click, change, good, bad, captures, document, context };
}
for (let repetition = 0; repetition < 20; repetition++) {
  let t = launch("binary-builder");
  t.change("mode", "representation");
  for (let n of [4, 6, 8, 16]) {
    t.change("length", n);
    let target = +t.document.querySelector(".big-number").textContent,
      bits = target.toString(2).padStart(n, "0");
    for (let i = 0; i < n; i++) if (bits[i] === "1") t.click("bit" + i);
    t.click("check");
    t.good();
    t.click("bit" + (n - 1));
    t.click("check");
    t.bad();
    t.click("new");
    assert.ok(t.$("feedback").hidden);
  }
  t = launch("boolean-gatekeeper");
  for (let mode of ["make", "evaluate"]) {
    t.change("mode", mode);
    let c = t.captures.booleanChallenge;
    if (mode === "make") {
      let v = c.solutions[0];
      t.$("x").value = v.x;
      t.$("y").value = v.y;
    } else t.click(String(logic.evaluate(c.e, c.values)));
    t.click("check");
    t.good();
    if (mode === "make") {
      outer: for (let x = 0; x <= 12; x++)
        for (let y = 0; y <= 12; y++)
          if (!logic.evaluate(c.e, { x, y })) {
            t.$("x").value = x;
            t.$("y").value = y;
            break outer;
          }
    } else t.click(String(!logic.evaluate(c.e, c.values)));
    t.click("check");
    t.bad();
    t.click("new");
  }
  t = launch("list-lab");
  for (let mode of ["execute", "build"]) {
    t.change("mode", mode);
    let c = t.captures.listChallenge;
    if (mode === "execute") {
      while (t.$("list").querySelector("[data-remove]"))
        t.$("list").querySelector("[data-remove]").onclick();
      for (let v of c.target) {
        t.$("operation").value = "APPEND";
        t.$("item").value = v;
        t.click("add");
      }
    } else
      for (let o of c.ops) {
        t.$("operation").value = o.type;
        t.$("index").value = o.index;
        t.$("item").value = o.value;
        t.click("add");
      }
    t.click("check");
    t.good();
    t.click("reset");
    t.click("check");
    t.bad();
    t.click("new");
  }
  t = launch("binary-search-hunt");
  for (let presence of ["present", "absent"]) {
    t.change("presence", presence);
    for (let n of [7, 15, 31]) {
      t.change("size", n);
      let c = t.captures.searchChallenge;
      for (let i of logic.searchTrace(c.values, c.target)) t.click("card" + i);
      t.click(c.present ? "found" : "absent");
      t.good();
      t.click("retry");
      t.click("card0");
      t.click("found");
      t.bad();
    }
  }
  t = launch("packet-router");
  for (let failure = 0; failure < 3; failure++) {
    let g = t.captures.networkChallenge,
      q = [[g.start]],
      seen = new Set([g.start]),
      route;
    for (let r of q) {
      if (r.at(-1) === g.end) {
        route = r;
        break;
      }
      for (let [k, [a, b]] of g.edges.entries()) {
        let last = r.at(-1),
          v = a === last ? b : b === last ? a : -1;
        if (v >= 0 && !seen.has(v) && !g.broken.has(k)) {
          seen.add(v);
          q.push([...r, v]);
        }
      }
    }
    t.click("reset");
    for (let i of route.slice(1)) t.click("node" + i);
    t.click("send");
    t.good();
    t.click("fail");
  }
  t.click("reset");
  t.click("node0");
  t.click("send");
  t.bad();
  t.click("new");
  t = launch("compression-challenge");
  for (let mode of ["text", "image", "optimize"]) {
    t.change("mode", mode);
    let c = t.captures.compressionChallenge,
      options = logic
        .compressionOptions(c)
        .filter((o) => mode === "optimize" || o.method === "rle"),
      o = options.sort((a, b) => a.size - b.size)[0];
    if (c.image) t.$("order").value = o.order;
    if (mode === "optimize") t.$("method").value = o.method;
    let seq = c.image
      ? logic.flattenGrid(c.grid, o.method === "raw" ? "rows" : o.order)
      : c.a;
    t.$("encoding").value =
      o.method === "raw" ? seq.join("") : logic.rleText(seq);
    t.click("check");
    t.good();
    t.$("encoding").value = "1:Z";
    t.click("check");
    t.bad();
    t.click("new");
  }
  t = launch("algorithm-race");
  for (let mode of ["search", "duplicates", "sum"]) {
    t.change("mode", mode);
    let c = t.captures.raceChallenge,
      a =
        c.steps[0] === c.steps[1] ? "tie" : c.steps[0] < c.steps[1] ? "a" : "b";
    t.click(a);
    t.click("check");
    t.good();
    t.click(a === "a" ? "b" : "a");
    t.click("check");
    t.bad();
    t.click("new");
  }
  t = launch("cybersecurity-defender");
  t.change("mode", "phishing");
  for (let field of t.captures.phishingChallenge.bad)
    t.$("stage").querySelector(`[data-field="${field}"]`).onclick();
  t.click("check");
  t.good();
  t.$("stage").querySelector('[data-field="urgency"]').onclick();
  t.click("check");
  t.bad();
  t.change("mode", "password");
  t.$("password").value = "Comet Willow Harbor Velvet 738!";
  t.$("reuse").value = "unique";
  t.$("mfa").value = "app";
  t.click("check");
  t.good();
  t.$("mfa").value = "none";
  t.click("check");
  t.bad();
  t.click("new");
  t = launch("parallel-processing-race");
  for (let mode of ["independent", "dependent"])
    for (let p of [2, 3]) {
      t.change("dependencies", mode);
      t.change("processors", p);
      let o =
        t.captures[
          mode === "independent" ? "optimalSchedule" : "optimalDependent"
        ];
      o.assignment.forEach((v, i) => t.change("assign" + i, v));
      t.click("check");
      t.good();
      for (let i = 0; i < 6; i++) t.change("assign" + i, 0);
      t.click("check");
      t.bad();
      t.click("new");
    }
  t = launch("data-detective");
  t.change("mode", "table");
  let instruction = t.$("stage").querySelector("p").textContent,
    group = instruction.match(/every (\w+) record/)[1],
    threshold = +instruction.match(/least (\d+)/)[1];
  for (let d of t.captures.dataChallenge.filter(
    (d) => d.group === group && d.score >= threshold,
  )) {
    let b = t.$("table").querySelector(`[data-record="${d.id}"]`);
    b.checked = true;
    b.onchange();
  }
  t.click("check");
  t.good();
  t.click("clear");
  t.click("check");
  t.bad();
  t.change("mode", "graph");
  for (let j = 0; j < 8; j++) {
    let svg = t.$("chart").innerHTML;
    if (t.$("trend")) {
      let data = t.captures.dataChallenge; // scatter generation changes copies; read numeric SVG coordinates instead.
      let circles = [...t.$("chart").querySelectorAll("circle")].map((c) => [
          +c.getAttribute("cx"),
          -c.getAttribute("cy"),
        ]),
        r = logic.correlation(circles);
      t.$("trend").value = r > 0.5 ? 1 : r < -0.5 ? -1 : 0;
    } else {
      let d = t.captures.dataChallenge;
      if (svg.includes("<polyline")) d = d.slice(0, 7);
      let expected = svg.includes("<polyline")
        ? d
            .map((x, i) => (i && x.score > d[i - 1].score ? i : -1))
            .filter((i) => i >= 0)
        : d
            .map((x, i) =>
              x.score === Math.max(...d.map((v) => v.score)) ? i : -1,
            )
            .filter((i) => i >= 0);
      for (let i of expected)
        t.$("point-buttons").querySelector(`[data-p="${i}"]`).onclick();
    }
    t.click("check");
    t.good();
    t.click("new");
  }
  t.change("mode", "visualize");
  let goal = t.$("stage").querySelector("p").textContent,
    type = goal.includes("relationship")
      ? "scatter"
      : goal.includes("successive")
        ? "line"
        : "bar",
    x = type === "scatter" ? "hours" : type === "line" ? "day" : "name";
  t.$("chart-type").value = type;
  t.$("x-axis").value = x;
  t.$("y-axis").value = "score";
  t.click("preview");
  assert.ok(!t.$("chart").innerHTML.includes("NaN"));
  t.click("check");
  t.good();
  t.$("y-axis").value = "hours";
  t.click("check");
  t.bad();
  t.click("new");
}
// Expanded existing games: randomized valid problems, incorrect then independent retries.
for (let repetition = 0; repetition < 25; repetition++) {
  const b = launch("binary-builder");
  assert.equal(b.$("mode").value, "mixed");
  for (const mode of ["capacity", "overflow", "pixels"]) {
    b.change("mode", mode);
    const q = b.captures.binaryExtension;
    if (mode === "capacity") {
      b.$("capacity-answer").value = "0";
      b.$("maximum-answer").value = "0";
      b.click("check");
      b.bad();
      b.$("capacity-answer").value = q.capacity;
      b.$("maximum-answer").value = q.max;
    }
    if (mode === "overflow") {
      b.$("overflow-answer").value = q.overflow ? "no" : "yes";
      b.$("wrapped-answer").value = q.result;
      b.click("check");
      b.bad();
      b.$("overflow-answer").value = q.overflow ? "yes" : "no";
    }
    if (mode === "pixels") {
      b.$("pixel-size").value = "0";
      b.click("check");
      b.bad();
      const bits = q.target.toString(2).padStart(q.bits, "0");
      for (let i = 0; i < q.bits; i++) if (bits[i] === "1") b.click("bit" + i);
      b.$("pixel-size").value = q.size;
    }
    b.click("check");
    b.good();
    b.click("new");
  }
  const d = launch("data-detective");
  d.change("mode", "cleaning");
  const c = d.captures.cleaningChallenge;
  for (const [i, row] of c.rows.entries()) {
    d.$("clean-keep-" + i).checked = true;
    d.$("clean-cm-" + i).value = 1;
  }
  d.click("check");
  d.bad();
  const kept = new Set();
  for (const [i, row] of c.rows.entries()) {
    const keep = row.meters !== "" && !kept.has(row.id);
    d.$("clean-keep-" + i).checked = keep;
    if (keep) {
      kept.add(row.id);
      d.$("clean-category-" + i).value = row.category.trim().toLowerCase();
      d.$("clean-cm-" + i).value = Math.round(Number(row.meters) * 100);
    }
  }
  d.click("check");
  d.good();
  d.change("mode", "metadata");
  for (const id of ["pixels", "dimensions", "date"])
    d.$("meta-" + id).value = "data";
  d.click("check");
  d.bad();
  d.$("meta-dimensions").value = "metadata";
  d.$("meta-date").value = "metadata";
  d.click("check");
  d.good();
  d.change("mode", "limitations");
  d.$("limit-generalize").value = "all";
  d.$("limit-cause").value = "proved";
  d.click("check");
  d.bad();
  d.$("limit-generalize").value = "limited";
  d.$("limit-cause").value = "association";
  d.click("check");
  d.good();
}
let home = launch("");
assert.equal(home.document.querySelectorAll(".card").length, 18);
assert.equal(home.document.querySelectorAll("a.button").length, 18);
// All same-site links and assets have physical targets on Pages (no SPA fallback).
for (let name of fs
  .readdirSync(new URL("./", import.meta.url), { withFileTypes: true })
  .filter((x) => x.isDirectory())
  .map((x) => x.name))
  assert.ok(
    fs.existsSync(new URL("./" + name + "/index.html", import.meta.url)),
  );
console.log(
  `PASS: ${checks} interaction checks across all new games and modes (DOM simulation, not rendered-browser QA).`,
);
// Execute the preserved Network Breaker itself with its existing test hook.
for (let round = 0; round < 20; round++) {
  const html = fs.readFileSync(
      new URL("./network-breaker/index.html", import.meta.url),
      "utf8",
    ),
    { document, window } = parseHTML(html),
    memory = new Map();
  const script = html
      .match(/<script(?: type="module")?>([\s\S]*?)<\/script>/)[1]
      .replace(/import[^;]+;/g, ""),
    ctx = {
      sessionTracker: () =>
        S.createSessionTracker({
          storage: {
            getItem: (k) => memory.get("global:" + k) || null,
            setItem: (k, v) => memory.set("global:" + k, v),
          },
        }),
      addSessionNavigation: () => {},
      practiceGames,
      document,
      window,
      console,
      Math,
      Set,
      sessionStorage: {
        getItem: (k) => memory.get(k) || null,
        setItem: (k, v) => memory.set(k, v),
      },
    };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  let g = window.NetworkBreakerTest.state.graph;
  const click = (id) => {
    document.getElementById(id).dispatchEvent(new window.Event("click"));
    checks++;
  };
  click("check");
  assert.ok(
    document.getElementById("feedback").textContent.includes("alternate paths"),
  );
  for (let key of g.cut) {
    document
      .querySelector(`[data-edge-key="${key}"]`)
      .dispatchEvent(new window.Event("click"));
    checks++;
  }
  click("check");
  assert.ok(
    document.getElementById("feedback").textContent.includes("Correct!"),
  );
  click("new");
  assert.equal(window.NetworkBreakerTest.state.removed.size, 0);
  click("hint");
  assert.ok(document.getElementById("feedback").textContent.includes("Links"));
  click("solution");
  assert.ok(window.NetworkBreakerTest.state.showOptimal);
  click("new");
  assert.ok(!window.NetworkBreakerTest.state.showOptimal);
}
console.log(
  `PASS: preserved Network Breaker submission, new challenge, hint, and solution controls; ${checks} total DOM interaction checks.`,
);
