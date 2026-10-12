import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as E from "./engine.js";
let seed = 123456789;
Math.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
let checks = 0;
function ok(v, msg) {
  assert.ok(v, msg);
  checks++;
}
function same(a, b) {
  assert.deepEqual(a, b);
  checks++;
}
// Independent exhaustive reference for scheduling: no pruning.
function brute(times, p) {
  let best = Infinity,
    a = [];
  function visit(i) {
    if (i === times.length) {
      let loads = Array(p).fill(0);
      times.forEach((t, j) => (loads[a[j]] += t));
      best = Math.min(best, Math.max(...loads));
      return;
    }
    for (let j = 0; j < p; j++) {
      a[i] = j;
      visit(i + 1);
    }
  }
  visit(0);
  return best;
}
for (let n of [4, 6, 8, 16])
  for (let i = 0; i < 300; i++) {
    let target = E.int(0, 2 ** n - 1);
    same(
      E.binaryValue(target.toString(2).padStart(n, "0").split("").map(Number)),
      target,
    );
  }
for (let i = 0; i < 300; i++) {
  let c = E.booleanChallenge();
  ok(
    c.solutions.length > 0 && c.solutions.length < 169,
    "Boolean is solvable and nontrivial",
  );
  for (let v of c.solutions) ok(E.evaluate(c.e, v));
  // Independent evaluator for the constrained expression grammar, not student text.
  let text = E.formatExpression(c.e)
    .replaceAll("AND", "&&")
    .replaceAll("OR", "||")
    .replaceAll("NOT", "!")
    .replaceAll("≥", ">=")
    .replaceAll("≤", "<=")
    .replaceAll("≠", "!==")
    .replace(/(?<![<>!=])=(?!=)/g, "===");
  same(
    E.evaluate(c.e, c.values),
    Function("x", "y", "return " + text)(c.values.x, c.values.y),
  );
  let l = E.listChallenge();
  same(E.runOperations(l.start, l.ops), l.target);
  ok(!E.equal(l.start, l.target));
  let g = E.networkChallenge();
  ok(E.connected(g.n, g.edges, g.start, g.end, g.broken));
  ok(g.broken.size > 0);
  ok(!E.validRoute(g, [g.start, g.start, g.end]));
  let queue = [[g.start]],
    seen = new Set([g.start]);
  for (let route of queue) {
    if (route.at(-1) === g.end) {
      ok(E.validRoute(g, route));
      break;
    }
    g.edges.forEach(([a, b], k) => {
      let end = route.at(-1),
        v = a === end ? b : b === end ? a : -1;
      if (!g.broken.has(k) && v >= 0 && !seen.has(v)) {
        seen.add(v);
        queue.push([...route, v]);
      }
    });
  }
  for (let mode of ["text", "image", "optimize"]) {
    let c = E.compressionChallenge(mode);
    for (let order of ["rows", "columns"]) {
      let a = c.image ? E.flattenGrid(c.grid, order) : c.a;
      same(E.decodeRLE(E.rleText(a), c.alphabet), a);
      let r = E.runs(a);
      ok(r.every((x, j) => j === 0 || x.symbol !== r[j - 1].symbol));
      same(
        r.reduce((s, r) => s + r.count, 0),
        a.length,
      );
    }
    let options = E.compressionOptions(c);
    ok(Math.min(...options.map((o) => o.size)) <= c.raw);
  }
  let times = Array.from({ length: 6 }, () => E.int(1, 9)),
    p = (i % 2) + 2;
  let opt = E.optimalSchedule(times, p);
  same(opt.time, brute(times, p));
  same(E.simulateSchedule(times, opt.assignment, p).time, opt.time);
  let ph = E.phishingChallenge();
  ok(ph.link.includes(".example/"));
  ok(!ph.bad.has("urgency"));
  same(ph.bad.has("request"), ph.request.includes("password"));
  same(ph.bad.has("attachment"), ph.attachment.endsWith(".exe"));
  for (let n of [7, 15, 31])
    for (let presence of ["present", "absent"]) {
      let c = E.searchChallenge(n, presence),
        trace = E.searchTrace(c.values, c.target);
      ok(trace.length <= Math.ceil(Math.log2(n + 1)));
      same(c.values.includes(c.target), presence === "present");
      let lo = 0,
        hi = n - 1;
      for (let m of trace) {
        same(m, Math.floor((lo + hi) / 2));
        if (c.values[m] === c.target) break;
        if (c.values[m] < c.target) lo = m + 1;
        else hi = m - 1;
      }
      if (!c.present) ok(lo > hi);
    }
}
same(
  E.applyOperation([4, 8, 2, 9, 5], { type: "REMOVE", index: 2 }),
  [4, 2, 9, 5],
);
same(
  E.runOperations(
    [4, 8, 2, 9, 5],
    [
      { type: "REMOVE", index: 2 },
      { type: "APPEND", value: 7 },
      { type: "INSERT", index: 3, value: 6 },
    ],
  ),
  [4, 2, 6, 9, 5, 7],
);
assert.throws(() => E.applyOperation([1], { type: "REMOVE", index: 0 }));
assert.throws(() => E.decodeRLE("0:A", ["A"]));
assert.throws(() => E.decodeRLE("300:A", ["A"]));
// Test preserved Network Breaker's actual pure logic with independently enumerated cuts.
let html = fs.readFileSync(
    new URL("./network-breaker/index.html", import.meta.url),
    "utf8",
  ),
  pure = html.slice(
    html.indexOf("function rngInt"),
    html.indexOf("function create("),
  );
let sandbox = { Math, state: { previousSignature: "" }, Set };
vm.createContext(sandbox);
vm.runInContext(pure, sandbox);
for (let i = 0; i < 120; i++) {
  let g = sandbox.makeGraph(),
    best = Infinity;
  ok(g.distance >= 3);
  for (let mask = 0; mask < 2 ** g.n; mask++) {
    if (!(mask & (1 << g.a)) || mask & (1 << g.b)) continue;
    let count = g.edges.filter(
      ([a, b]) => !!(mask & (1 << a)) !== !!(mask & (1 << b)),
    ).length;
    best = Math.min(best, count);
  }
  same(g.optimal, best);
  same(g.cut.size, best);
  ok(!Number.isFinite(sandbox.distances(g.a, g.n, g.edges, g.cut)[g.b]));
}
for (let times of [
  [8, 6, 4, 3, 2, 1],
  [1, 1, 1, 1, 1, 1],
  [9, 8, 7, 6, 5, 4],
]) {
  let deps = [[], [], [0], [], [1, 2], [3]],
    p = 3,
    opt = E.optimalDependent(times, p, deps),
    r = E.simulateSchedule(times, opt.assignment, p, deps);
  same(r.time, opt.time);
  for (let i = 0; i < 6; i++)
    for (let j of deps[i]) ok(r.starts[i] >= r.ends[j]);
}
console.log(`PASS: ${checks} generator, answer, and optimum assertions.`);
