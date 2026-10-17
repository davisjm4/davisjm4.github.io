/* Inheritance & Polymorphism Lab — generator, content-quality, and scoring
   tests (no dependencies). Run from java-games/inheritance-polymorphism-lab/:
       node tests/iplab-tests.mjs
   Java behavior itself is verified against javac/java in iplab-jvm-tests.mjs. */
import assert from "node:assert/strict";
import * as E from "../engine.js";
import { createSessionTracker } from "../../session.js";

const J = E.J;
let checks = 0;
const ok = (v, msg) => {
  assert.ok(v, msg);
  checks++;
};
const section = (name, fn) => {
  const before = checks;
  fn();
  console.log(`  ✓ ${name} (${checks - before} checks)`);
};
const N = Number(process.env.IPLAB_N || 1500);
const modes = Object.keys(E.MODES);
const insts = (it, seeds = 12) => Array.from({ length: seeds }, (_, s) => E.instantiate(it, E.makeRng(s + 1)));
console.log("Inheritance & Polymorphism Lab tests");

section("bank structure: five modes, families, interaction variety", () => {
  ok(modes.length === 5, "five modes");
  const ids = new Set();
  for (const it of E.ITEMS) {
    ok(!ids.has(it.id), "unique id " + it.id);
    ids.add(it.id);
    ok(E.FAMILY_TITLES[it.mode]?.[it.family], it.id + " family titled");
  }
  for (const m of modes) {
    const items = E.ITEMS.filter((i) => i.mode === m);
    const fams = new Set(items.map((i) => i.family));
    ok(fams.size >= 5, `${m}: ≥5 reasoning families (${fams.size})`);
    ok(items.length >= 15, `${m}: ≥15 challenges (${items.length})`);
    const kinds = new Set(items.map((i) => E.instantiate(i, E.makeRng(1)).kind));
    ok(kinds.size >= 2, `${m}: ≥2 interaction types (${[...kinds]})`);
  }
  const all = E.ITEMS.map((i) => E.instantiate(i, E.makeRng(1)).kind);
  const kinds = new Set(all);
  ok(kinds.size >= 9, `≥9 interaction types overall (${[...kinds].join(", ")})`);
  const choiceShare = all.filter((k) => k === "choice").length / all.length;
  ok(choiceShare <= 0.1, `plain multiple choice is a small minority (${Math.round(choiceShare * 100)}%)`);
  const overload = E.ITEMS.filter((i) => i.mode === "override" && (i.family === "classify" || i.family === "compare")).length;
  ok(overload / E.ITEMS.filter((i) => i.mode === "override").length <= 0.4, "overload-vs-override is a supporting concept, not most of Mode B");
  // hierarchies vary in shape, not just names
  const shapes = new Set(Object.values(E.SCENARIOS).map((cl) => cl.map((c) => J.depth(cl, c.name)).sort().join("") + (cl.some((c) => c.abstract) ? "A" : "") + (cl.some((c) => c.methods.some((m) => m.static)) ? "S" : "") + (cl.some((c) => c.methods.some((m) => m.vis === "private")) ? "P" : "") + (cl.some((c) => c.ctor) ? "C" : "")));
  ok(shapes.size >= 8, `scenario hierarchies have ≥8 distinct shapes/features (${shapes.size})`);
});

section("every challenge: keyed answer is correct, a wrong answer isn't", () => {
  for (const it of E.ITEMS)
    for (const ch of insts(it)) {
      const a = E.answerFor(ch);
      ok(a != null && E.assess(ch, a).correct, `${it.id}: key assesses correct`);
      let w;
      switch (ch.kind) {
        case "choice":
          w = (a + 1) % ch.options.length;
          break;
        case "line":
          w = ch.blocks[0].selectable.find((l) => !ch.answer.includes(l));
          break;
        case "box":
          w = ch.diagram.find((c) => c.name !== a).name;
          break;
        case "multi":
          w = ch.options.filter((o) => !a.includes(o)).slice(0, 1).concat(a.slice(1));
          break;
        case "connect":
          w = { ...a, [ch.classes[0]]: a[ch.classes[0]] ? null : ch.classes[1] };
          break;
        case "rows":
          w = a.map((x, i) => (i ? x : (x + 1) % ch.rows[0].options.length));
          break;
        case "sequence":
          w = { ...a, order: a.order.slice().reverse() };
          if (a.order.length === 1) w.order = [ch.chips.find((c) => c.id !== a.order[0]).id];
          break;
        case "trace":
          w = { ...a, impl: ch.object.layers.flatMap((L) => L.methods).find((m) => m.id !== a.impl).id };
          break;
        case "header":
          w = { ...a, params: ch.segments.params.findIndex((p) => JSON.stringify(p.types) !== JSON.stringify(ch.required.types)) };
          break;
        case "debug":
          w = { ...a, fix: ch.fixes.findIndex((f) => !f.ok) };
          break;
      }
      ok(!E.assess(ch, w).correct, `${it.id}: wrong response assesses incorrect`);
    }
});

section("answer quality: unique, plausible, explained, no giveaways", () => {
  let longest = 0,
    choices = 0;
  for (const it of E.ITEMS)
    for (const ch of insts(it, 4)) {
      const text = ch.question + " " + ch.prompt;
      if (ch.kind === "choice") {
        ok(ch.options.filter((o) => o.ok).length === 1, it.id + " one correct option");
        ok(new Set(ch.options.map((o) => o.text)).size === ch.options.length, it.id + " unique options");
        for (const o of ch.options) if (!o.ok) ok(o.why.length > 20, it.id + " distractor explained");
        const L = ch.options.map((o) => o.text.length);
        if (L[ch.answer] === Math.max(...L)) longest++;
        choices++;
      }
      if (ch.kind === "rows")
        for (const r of ch.rows) {
          ok(r.options.length >= 2 && new Set(r.options).size === r.options.length, `${it.id}: row options unique (${r.options})`);
          ok(r.answer >= 0 && r.answer < r.options.length, `${it.id}: row key present`);
          ok(r.why && r.why.length > 15, `${it.id}: row explained`);
        }
      for (const key of ["outputOptions"])
        if (ch[key]) {
          ok(ch[key].length >= 2 && new Set(ch[key]).size === ch[key].length, `${it.id}: ${key} unique`);
          ok(ch[key].includes(ch.output), `${it.id}: correct output offered`);
          ok(!text.includes(`"${ch.output}"`), `${it.id}: question doesn't print the answer`);
        }
      if (ch.kind === "debug") {
        ok(ch.fixes.some((f) => f.ok), it.id + " has a correct fix");
        ok(new Set(ch.fixes.map((f) => f.label)).size === ch.fixes.length, it.id + " unique fixes");
        for (const f of ch.fixes) if (!f.ok) ok(f.why && f.why.length > 15, it.id + " wrong fix explained");
        ok(ch.badLines.every((l) => ch.blocks[0].selectable.includes(l)), it.id + " faulty line selectable");
        ok(ch.blocks[0].selectable.length >= 8, it.id + " many candidate lines, not just a few");
      }
      if (ch.kind === "multi") {
        ok(ch.answer.length >= 1 && ch.answer.length < ch.options.length, it.id + " multi-select has right and wrong options");
        for (const o of ch.options) ok(ch.explain[o], it.id + " every option explained");
      }
      if (ch.kind === "sequence") {
        ok(ch.answer.every((id) => ch.chips.some((c) => c.id === id)), it.id + " every step available");
        ok(ch.chips.length > ch.answer.length, it.id + " includes steps that don't run");
      }
      if (ch.kind === "line") ok(ch.blocks[0].selectable.length >= 3, it.id + " ≥3 candidate lines");
    }
  console.log(`    correct choice is the longest in ${longest}/${choices} multiple-choice instances`);
  ok(longest / choices <= 0.35, "correct answer is not usually the longest");
});

section("Java-reasoning variety inside families", () => {
  const sup = E.ITEMS.filter((i) => i.kind === "supplier").flatMap((it) => it.pairs.map(([o, m]) => {
    const cl = E.SCENARIOS[it.scen];
    return J.depth(cl, o) - J.depth(cl, J.dispatch(cl, o, J.lookup(cl, o, m, [])).cls);
  }));
  ok(new Set(sup).size >= 3, "supplier answers: own class, parent, and grandparent all occur");
  const traces = E.ITEMS.filter((i) => i.kind === "trace").map((it) => {
    const ch = E.instantiate(it, E.makeRng(1));
    const cls = ch.implAnswer.split(".")[0];
    return cls === ch.object.obj ? "object" : cls === ch.object.decl ? "declared" : "between";
  });
  ok(new Set(traces).size === 3, `trace: implementation sometimes in the object's class, the declared class, or between (${traces})`);
  for (const it of E.ITEMS.filter((i) => i.kind === "swap")) {
    const ch = E.instantiate(it, E.makeRng(1));
    const outs = ch.rows.map((r) => r.options[r.answer]);
    ok(new Set(outs).size >= 3, `${it.id}: swapping objects changes the output (${outs})`);
  }
  const outcomes = E.ITEMS.filter((i) => i.mode === "debug").map((i) => i.outcome);
  ok(["compile", "crash", "logic"].every((o) => outcomes.includes(o)), "debugger mixes compile errors, crashes, and wrong output");
  ok(outcomes.filter((o) => o === "compile").length / outcomes.length <= 0.75, "not every bug is a compile error");
  const rowsCompile = E.ITEMS.filter((i) => i.kind === "compiles").flatMap((it) => E.instantiate(it, E.makeRng(1)).rows.map((r) => r.options[r.answer].split(" ")[0]));
  ok(["Compile", "Throws", "Prints", "Compiles"].every((k) => rowsCompile.includes(k)), "compile-time vs run-time rows cover all outcomes");
  // known Java facts the model must reproduce
  const P = E.SCENARIOS.payroll;
  ok(J.runStatement(P, { e: { decl: "Employee", obj: "Director" } }, { k: "call", v: "e", m: "describe" }).output === "Director paid by salary + bonus + stock", "super chain + dispatch inside inherited code");
  const R = E.SCENARIOS.reports;
  ok(J.runStatement(R, { r: { decl: "Report", obj: "Invoice" } }, { k: "call", v: "r", m: "render" }).output === "[Report] due in 30 days", "private helpers are not overridden");
  const T = E.ITEMS.find((i) => i.id === "B-static-tools").classes;
  ok(J.runStatement(T, { d: { decl: "Drill", obj: "Drill" } }, { k: "call", v: "d", m: "describe" }).output === "drilling (Generic)", "static calls inside inherited code are not dispatched");
  ok(!J.runStatement(E.SCENARIOS.couriers, { c: { decl: "Courier", obj: "Drone" } }, { k: "call", v: "c", m: "charge" }).compiles, "subclass-only method through superclass reference doesn't compile");
});

section(`generation: ${N} per mode + Mixed; rotation and repeats`, () => {
  for (const mode of [...modes, "mixed"]) {
    const rng = E.makeRng(mode.length * 31);
    const p = E.createPicker(rng);
    const seen = new Set();
    let prev = null,
      prevMode = null,
      sameFam = 0;
    for (let k = 0; k < N; k++) {
      const ch = E.generate(mode, p, rng);
      seen.add(ch.id);
      ok(ch.id !== prev?.id, `${mode}: no immediate repeat`);
      if (mode === "mixed") ok(ch.mode !== prevMode, "mixed: mode changes every challenge");
      else if (prev && prev.family === ch.family) sameFam++;
      prev = ch;
      prevMode = ch.mode;
    }
    const total = mode === "mixed" ? E.ITEMS.length : E.ITEMS.filter((i) => i.mode === mode).length;
    ok(seen.size === total, `${mode}: every challenge reachable (${seen.size}/${total})`);
    if (mode !== "mixed") ok(sameFam / N < 0.06, `${mode}: back-to-back same family is rare (${sameFam}/${N})`);
  }
  for (let seed = 1; seed <= 200; seed++) {
    const rng = E.makeRng(seed);
    const p = E.createPicker(rng);
    const run = Array.from({ length: 25 }, () => E.generate("mixed", p, rng));
    ok(new Set(run.map((c) => c.id)).size === 25, `seed ${seed}: 25 different challenges`);
    ok(new Set(run.map((c) => c.mode + "/" + c.family)).size >= 18, `seed ${seed}: ≥18 different reasoning families in 25`);
    ok(new Set(run.map((c) => c.kind)).size >= 7, `seed ${seed}: ≥7 interaction types in 25`);
    for (let i = 0; i < 25; i += 5) ok(new Set(run.slice(i, i + 5).map((c) => c.mode)).size === 5, `seed ${seed}: each round of five covers every mode`);
    for (const m of modes) {
      const q = E.createPicker(rng);
      const k = Math.min(12, E.ITEMS.filter((i) => i.mode === m).length);
      const ids = Array.from({ length: k }, () => E.generate(m, q, rng).id);
      ok(new Set(ids).size === k, `seed ${seed}: focused ${m} has no repeats in first ${k}`);
    }
  }
});

section("session tracker integration (javaGames.session.v1)", () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  const t = createSessionTracker({ storage });
  const g = E.GAME_ID,
    title = E.ipLabGame.name;
  let id = t.begin(g, title, "tracer", E.MODES.tracer);
  ok(t.submit(id, true).firstTry, "first-try correct");
  id = t.begin(g, title, "debug", E.MODES.debug);
  t.submit(id, false);
  ok(t.reveal(id), "wrong answer closes as revealed");
  ok(!t.submit(id, true).accepted, "no credit after reveal");
  id = t.begin(g, title, "abstract", E.MODES.abstract);
  ok(t.reveal(id), "show answer");
  id = t.begin(g, title, "hierarchy", E.MODES.hierarchy);
  ok(t.skip(id), "skip");
  const m = t.snapshot().games[g];
  ok(m.title === title && m.generated === 4 && m.attempted === 2 && m.firstTry === 1 && m.incorrect === 1 && m.revealed === 2 && m.skipped === 1, "totals " + JSON.stringify(m));
  ok(m.topics.tracer.title === "Polymorphism Tracer" && m.topics.debug.incorrect === 1, "results by mode");
  ok(typeof t.addActiveSeconds === "function", "shared tracker exposes active practice time");
  ok(createSessionTracker({ storage }).snapshot().games[g].generated === 4, "persists and validates under the shared schema");
});

console.log(`\n${checks} checks passed.`);
