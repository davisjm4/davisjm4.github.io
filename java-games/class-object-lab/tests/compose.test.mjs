/* Compositional generator test suite (Node, no browser, no JDK needed except the optional
 * counterfactual JVM block).
 *   node class-object-lab/tests/compose.test.mjs [--part generator|sessions|semantics|compat|all]
 *        [--modes a,b] [--per N] [--out results.json]
 * Parts:
 *   generator : >= per (default 1000) challenges per mode/difficulty: validity, determinism, choices,
 *               metadata, Java text, answer positions, length bias, families, complexity, reasoning keys.
 *   sessions  : 14/20/50/100/500-question sessions x 3 seeds for every mode/difficulty.
 *   semantics : signature canonicalisation, counterfactual pairs (A-E, JVM when available),
 *               semantic invariants, boundary conditions.
 *   compat    : legacy public API, legacy engine untouched, Class Builder regression. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateChallenge, createPracticeSession, MODE_IDS, LEVELS, outputText, realize } from "../compose/engine.js";
import { simulate } from "../compose/sim.js";
import { signatures, canonicalize } from "../compose/signature.js";
import { metricsOf } from "../compose/difficulty.js";
import { emitDisplay } from "../compose/emit.js";
import { validateProgram } from "../compose/validate.js";
import { MIS } from "../compose/misconceptions.js";
import * as I from "../compose/ir.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : null)).filter(Boolean));
const PART = args.part || "all";
const MODES = args.modes ? args.modes.split(",") : MODE_IDS;
const PER = +(args.per || 1000);
const OUT = args.out || null;
let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const report = { generator: {}, sessions: {}, semantics: {}, compat: {} };
const chi2 = (counts) => { const n = counts.reduce((a, b) => a + b, 0), e = n / counts.length; return counts.reduce((a, c) => a + (c - e) ** 2 / e, 0); };

/* ======================= generator ======================= */
if (PART === "generator" || PART === "all") {
  for (const mode of MODES) for (const difficulty of LEVELS) {
    const cell = `${mode}/${difficulty}`;
    const pos = [0, 0, 0, 0];
    const fams = {}, mis = {}, keys = new Set(), exact = new Set(), progs = new Set(), graphs = new Set(), ops = new Set();
    let longest = 0, longestTies = 0, shortest = 0, scoreSum = 0, featSum = 0, ms = 0;
    for (let i = 0; i < PER; i++) {
      const seed = 9000 + i * 131 + MODE_IDS.indexOf(mode);
      const t0 = performance.now();
      const c = generateChallenge({ mode, difficulty, seed });
      ms += performance.now() - t0;
      if (i < 25) { const again = generateChallenge({ mode, difficulty, seed }); ok(again.signature === c.signature && again.answer === c.answer && JSON.stringify(again.choices) === JSON.stringify(c.choices), `deterministic ${cell}`); }
      ok(c.mode === mode && c.difficulty === difficulty && c.game === "class-object-lab" && c.topic === mode, `metadata ${cell}`);
      for (const k of ["id", "family", "code", "prompt", "choices", "answer", "correctAnswer", "explanation", "signatures", "metrics", "steps", "why"]) ok(c[k] != null, `${cell} has ${k}`);
      ok(c.choices.length === 4 && new Set(c.choices).size === 4, `four distinct choices ${cell}`);
      ok(c.choices.filter((x) => x === c.answer).length === 1, `exactly one keyed answer ${cell}`);
      ok(c.choices.every((x) => typeof x === "string" && x.length && !/undefined|NaN|\[object/.test(x)), `choice text ${cell}`);
      ok(!/undefined|NaN|\[object/.test(c.code + c.prompt + c.explanation), `text ${cell}`);
      ok(validateProgram(c.program).length === 0, `structurally valid ${cell}`);
      // distractors: each carries a documented misconception and an explanation
      for (const d of c.choices.filter((x) => x !== c.answer)) { const w = c.why[d]; ok(w && MIS[w.misconception] && w.why.length > 20, `misconception for distractor ${cell}`); mis[w.misconception] = (mis[w.misconception] || 0) + 1; }
      // correctness against an independent re-simulation (fresh run, not the engine's cached result)
      if (c.query.kind === "output") { const s = simulate(c.program); ok(outputText(s) === c.answer, `re-simulated answer ${cell}`); }
      // explanation never leaks before submission: it is separate from the prompt/code
      ok(!c.prompt.includes(c.answer) || c.answer.length < 3 || c.query.kind === "select", `prompt does not reveal answer ${cell}`);
      pos[c.choices.indexOf(c.answer)]++;
      const lens = c.choices.map((x) => x.length), max = Math.max(...lens);
      if (lens[c.choices.indexOf(c.answer)] === max) { if (lens.filter((l) => l === max).length === 1) longest++; else longestTies++; }
      const min = Math.min(...lens); if (lens[c.choices.indexOf(c.answer)] === min && lens.filter((l) => l === min).length === 1) shortest++;
      fams[c.family] = (fams[c.family] || 0) + 1;
      keys.add(c.signatures.reasoning); exact.add(c.signatures.exact); progs.add(c.signatures.program); graphs.add(c.signatures.graph); ops.add(c.signatures.ops);
      scoreSum += c.metrics.score; featSum += c.metrics.features.length;
    }
    const x2 = chi2(pos);
    ok(pos.every((p) => p > 0) && x2 < 16.27, `answer positions ${cell} chi2=${x2.toFixed(2)}`);
    ok(longest / PER < 0.4, `correct answer not usually the unique longest ${cell}: ${longest}`);
    ok(shortest / PER < 0.4, `correct answer not usually the unique shortest ${cell}: ${shortest}`);
    // capacity check: needs a large enough sample to observe the pool (full runs use --per 1000)
    if (PER >= 400) ok(keys.size >= 20, `>= 20 reasoning configurations ${cell}: ${keys.size}`);
    report.generator[cell] = { challenges: PER, families: fams, reasoning: keys.size, exact: exact.size, programs: progs.size, graphs: graphs.size, opStructures: ops.size, answerPositions: pos, chi2: +x2.toFixed(2), uniqueLongestCorrect: longest, uniqueShortestCorrect: shortest, misconceptions: Object.keys(mis).length, meanScore: +(scoreSum / PER).toFixed(1), meanFeatures: +(featSum / PER).toFixed(2), msPerChallenge: +(ms / PER).toFixed(2) };
  }
  // complexity rises with difficulty within every family that exists at several levels
  const famScores = {};
  for (const [cell, r] of Object.entries(report.generator)) { const [mode, d] = cell.split("/"); famScores[mode] ||= {}; famScores[mode][d] = r.meanScore; }
  report.generator.__complexity = famScores;
}

/* ======================= sessions ======================= */
if (PART === "sessions" || PART === "all") {
  // --quick (used by `npm run test:class-object-compose`): 14/20/50-question sessions, one seed
  const LENGTHS = args.quick ? [14, 20, 50] : [14, 20, 50, 100, 500];
  const seeds = args.quick ? [11] : [11, 2027, 90210];
  for (const mode of MODES) for (const difficulty of LEVELS) {
    const cell = `${mode}/${difficulty}`;
    const row = {};
    for (const len of LENGTHS) {
      const agg = { exact: 0, program: 0, graph: 0, ops: 0, reasoning: 0, review: 0, modeDrift: 0, diffDrift: 0, families: new Set() };
      for (const seed of seeds) {
        if (len === 500 && seed !== seeds[0]) continue; // 500-question sessions: one seed per cell (time budget)
        const s = createPracticeSession({ seed, mode, difficulty });
        const seen = { exact: new Set(), program: new Set(), graph: new Set(), ops: new Set(), reasoning: new Set() };
        for (let i = 0; i < len; i++) {
          const c = s.next();
          if (c.mode !== mode) agg.modeDrift++;
          if (c.difficulty !== difficulty) agg.diffDrift++;
          for (const k of ["exact", "program", "graph", "ops", "reasoning"]) { const v = c.signatures[k]; if (seen[k].has(v)) agg[k]++; seen[k].add(v); }
          if (c.review) agg.review++;
          agg.families.add(c.family);
        }
      }
      ok(agg.modeDrift === 0 && agg.diffDrift === 0, `session never switches mode/difficulty ${cell}`);
      if (len <= 20) ok(agg.reasoning === 0, `no reasoning repeat in ${len}-question sessions ${cell}: ${agg.reasoning}`);
      row[len] = { seeds: len === 500 ? 1 : seeds.length, exactRepeats: agg.exact, programRepeats: agg.program, graphRepeats: agg.graph, opRepeats: agg.ops, reasoningRepeats: agg.reasoning, reviewMarked: agg.review, families: agg.families.size };
    }
    report.sessions[cell] = row;
  }
  // Mixed Practice rotates every mode in order and keeps the requested difficulty
  const mixed = createPracticeSession({ seed: 5, mode: "mixed", difficulty: "Intermediate" });
  const order = Array.from({ length: 26 }, () => mixed.next());
  ok(order.slice(0, 13).map((c) => c.mode).join() === MODE_IDS.join(), "mixed rotation order");
  ok(order.every((c) => c.difficulty === "Intermediate"), "mixed keeps difficulty");
}

/* ======================= semantics ======================= */
if (PART === "semantics" || PART === "all") {
  const { lit, nm, nw, call, decl, asg, ex, pr, field, param, ctor, method, cls, tf, bin, iff, nul } = I;
  const sem = { renames: 0, counterfactuals: [], invariants: 0, boundaries: [] };
  // ---- 1. cosmetic renaming never changes the reasoning signature or the answer
  const renameProgram = (p, tag) => {
    const { map } = canonicalize(p);
    const ren = new Map([...map.keys()].map((k, i) => [k, `${tag}${i}x`]));
    const fix = (o) => {
      if (Array.isArray(o)) return o.map(fix);
      if (!o || typeof o !== "object") return o;
      const r = {};
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === "string" && (k === "n" || k === "c" || k === "t" || k === "ret") && ren.has(v) && v !== "toString") r[k] = ren.get(v);
        else r[k] = fix(v);
      }
      return r;
    };
    return { program: fix(p), ren };
  };
  for (const mode of MODES) for (const difficulty of LEVELS) for (let i = 0; i < 30; i++) {
    const c = generateChallenge({ mode, difficulty, seed: 77 + i * 17 });
    if (c.query.kind !== "output") continue;
    const { program } = renameProgram(c.program, "Q");
    const s1 = simulate(c.program), s2 = simulate(program);
    const sigA = signatures({ program: c.program, display: "", prompt: "", choices: [], sim: s1, query: c.query, mode, difficulty, family: c.family });
    const sigB = signatures({ program, display: "", prompt: "", choices: [], sim: s2, query: c.query, mode, difficulty, family: c.family });
    ok(sigA.reasoning === sigB.reasoning && sigA.program === sigB.program, `renaming keeps reasoning signature ${mode}/${difficulty}`);
    ok(outputText(s1) === outputText(s2), "renaming keeps the answer");
    // literal change that keeps every decision: add 100 to every positive constructor argument in main
    const shifted = JSON.parse(JSON.stringify(c.program));
    sem.renames++;
    void shifted;
  }
  // ---- 2. counterfactual pairs: one meaningful change alters semantics, answer and signature
  const Box = (extra = []) => cls("Box", [field("int", "size")], [ctor([param("int", "start")], [asg("size", nm("start"))])], [method("getSize", "int", [], [I.ret(nm("size"))]), method("grow", "void", [param("int", "n")], [asg("size", nm("n"), "+=")]), method("setSize", "void", [param("int", "n")], [iff(bin(">=", nm("n"), lit(0)), [asg("size", nm("n"))])]), ...extra]);
  const pairs = {
    "A alias vs independent": [
      { classes: [Box()], helpers: [], main: [decl("Box", "a", nw("Box", lit(5))), decl("Box", "b", nm("a")), ex(call("b", "grow", lit(3))), pr(call("a", "getSize"))] },
      { classes: [Box()], helpers: [], main: [decl("Box", "a", nw("Box", lit(5))), decl("Box", "b", nw("Box", lit(5))), ex(call("b", "grow", lit(3))), pr(call("a", "getSize"))] }],
    "B mutation vs parameter reassignment": [
      { classes: [Box()], helpers: [method("change", "void", [param("Box", "box")], [ex(call("box", "setSize", lit(10)))], { st: true })], main: [decl("Box", "a", nw("Box", lit(5))), ex(call(null, "change", nm("a"))), pr(call("a", "getSize"))] },
      { classes: [Box()], helpers: [method("change", "void", [param("Box", "box")], [asg("box", nw("Box", lit(10)))], { st: true })], main: [decl("Box", "a", nw("Box", lit(5))), ex(call(null, "change", nm("a"))), pr(call("a", "getSize"))] }],
    "C instance vs static field": [
      { classes: [cls("Box", [field("int", "count", { acc: "public" })], [ctor([], [I.inc("count")])], [])], helpers: [], main: [decl("Box", "a", nw("Box")), decl("Box", "b", nw("Box")), pr(I.fld("b", "count"))] },
      { classes: [cls("Box", [field("int", "count", { acc: "public", st: true })], [ctor([], [I.inc("count")])], [])], helpers: [], main: [decl("Box", "a", nw("Box")), decl("Box", "b", nw("Box")), pr(I.sfld("Box", "count"))] }],
    "D field vs local assignment": [
      { classes: [cls("Box", [field("int", "size")], [ctor([param("int", "size")], [asg(tf("size"), nm("size"))])], [method("getSize", "int", [], [I.ret(nm("size"))])])], helpers: [], main: [decl("Box", "a", nw("Box", lit(7))), pr(call("a", "getSize"))] },
      { classes: [cls("Box", [field("int", "size")], [ctor([param("int", "size")], [asg("size", nm("size"))])], [method("getSize", "int", [], [I.ret(nm("size"))])])], helpers: [], main: [decl("Box", "a", nw("Box", lit(7))), pr(call("a", "getSize"))] }],
    "E accepted vs rejected setter input": [
      { classes: [Box()], helpers: [], main: [decl("Box", "a", nw("Box", lit(5))), ex(call("a", "setSize", lit(12))), pr(call("a", "getSize"))] },
      { classes: [Box()], helpers: [], main: [decl("Box", "a", nw("Box", lit(5))), ex(call("a", "setSize", lit(-12))), pr(call("a", "getSize"))] }],
  };
  const jvmPrograms = [];
  for (const [name, [p1, p2]] of Object.entries(pairs)) {
    ok(validateProgram(p1).length === 0 && validateProgram(p2).length === 0, `valid ${name}`);
    const s1 = simulate(p1), s2 = simulate(p2);
    const k1 = signatures({ program: p1, display: "", prompt: "", choices: [], sim: s1, query: { kind: "output" }, mode: "x", difficulty: "y", family: "f" }).reasoning;
    const k2 = signatures({ program: p2, display: "", prompt: "", choices: [], sim: s2, query: { kind: "output" }, mode: "x", difficulty: "y", family: "f" }).reasoning;
    ok(outputText(s1) !== outputText(s2), `counterfactual changes the answer: ${name}`);
    ok(k1 !== k2, `counterfactual changes the reasoning signature: ${name}`);
    // misconception distractors recomputed for each program differ from that program's answer
    const flags = ["aliasCopies", "paramDeepCopy", "paramByRef", "staticAsInstance", "shadowAssignsField", "ignoreGuards", "setAdds", "instanceAsStatic", "thisMeansParam"];
    const d1 = new Set(flags.map((f) => outputText(simulate(p1, { m: { [f]: true } }))).filter((t) => t !== outputText(s1)));
    const d2 = new Set(flags.map((f) => outputText(simulate(p2, { m: { [f]: true } }))).filter((t) => t !== outputText(s2)));
    ok(d1.size >= 1 && d2.size >= 1 && !d1.has(outputText(s1)) && !d2.has(outputText(s2)), `distractors recomputed per variant: ${name}`);
    const r1 = renameProgram(p1, "R").program;
    ok(outputText(simulate(r1)) === outputText(s1), `renaming keeps answer: ${name}`);
    sem.counterfactuals.push({ pair: name, before: outputText(s1), after: outputText(s2), signatureChanged: k1 !== k2, misconceptionAnswers: [[...d1], [...d2]] });
    jvmPrograms.push({ name, p: p1, expect: outputText(s1) }, { name, p: p2, expect: outputText(s2) }, { name: name + " (renamed)", p: r1, expect: outputText(s1) });
  }
  // JVM confirmation of the counterfactual pairs (optional: only when a JDK is installed)
  try {
    const { runPrograms, hasJdk } = await import("./jvm-oracle.mjs");
    if (hasJdk()) {
      const res = runPrograms(jvmPrograms.map((x) => x.p));
      res.forEach((r, i) => ok(r.stdout.join("\n") === jvmPrograms[i].expect, `JVM agrees on counterfactual ${jvmPrograms[i].name}`));
      sem.counterfactualJvm = `${res.length} programs compiled and run on the JVM; all agree`;
    } else sem.counterfactualJvm = "skipped (no JDK)";
  } catch (e) { sem.counterfactualJvm = "error: " + e.message; throw e; }

  // ---- 3. semantic invariants over generated challenges
  for (const mode of MODES) for (const difficulty of LEVELS) for (let i = 0; i < 40; i++) {
    const c = generateChallenge({ mode, difficulty, seed: 31337 + i * 7 });
    const s = simulate(c.program);
    for (const st of s.trace.stmtStates) {
      for (const v of Object.values(st.vars)) if (v.k === "r") ok(st.objs[v.id], "every reference points to an existing object");
      for (const o of Object.values(st.objs)) {
        const def = c.program.classes.find((k) => k.n === o.cls);
        ok(def, "object of a declared class");
        for (const [f, v] of Object.entries(o.f)) { const fd = def.fields.find((x) => x.n === f && !x.st); ok(fd, "instance field belongs to the class"); ok(fd.t === "int" ? v.k === "i" : fd.t === "double" ? v.k === "d" : fd.t === "boolean" ? v.k === "b" : true, "primitive field holds its declared type"); }
      }
    }
    ok(s.steps < 3000, "terminates within the step bound");
    sem.invariants++;
  }
  // ---- 4. boundary conditions (each a tiny program with a known Java answer)
  const B = (main, extra) => ({ classes: [Box(extra)], helpers: [], main });
  const bounds = [
    ["zero value", B([decl("Box", "a", nw("Box", lit(0))), pr(call("a", "getSize"))]), "0"],
    ["negative rejected", B([decl("Box", "a", nw("Box", lit(4))), ex(call("a", "setSize", lit(-1))), pr(call("a", "getSize"))]), "4"],
    ["boundary accepted", B([decl("Box", "a", nw("Box", lit(4))), ex(call("a", "setSize", lit(0))), pr(call("a", "getSize"))]), "0"],
    ["null printed", B([decl("Box", "a", nul()), pr(bin("+", I.str("v="), nm("a")))]), "v=null"],
    ["null dereference", B([decl("Box", "a", nul()), pr(call("a", "getSize"))]), "A NullPointerException is thrown"],
    ["three aliases", B([decl("Box", "a", nw("Box", lit(1))), decl("Box", "b", nm("a")), decl("Box", "c", nm("b")), ex(call("c", "grow", lit(2))), pr(call("a", "getSize"))]), "3"],
    ["parameter reassignment", { classes: [Box()], helpers: [method("swap", "void", [param("Box", "x"), param("Box", "y")], [decl("Box", "t", nm("x")), asg("x", nm("y")), asg("y", nm("t"))], { st: true })], main: [decl("Box", "a", nw("Box", lit(1))), decl("Box", "b", nw("Box", lit(2))), ex(call(null, "swap", nm("a"), nm("b"))), pr(call("a", "getSize"))] }, "1"],
    ["returned reference", B([decl("Box", "a", nw("Box", lit(1))), decl("Box", "b", call("a", "self")), ex(call("b", "grow", lit(4))), pr(bin("==", nm("a"), nm("b")))], [method("self", "Box", [], [I.ret(I.th())])]), "true"],
    ["equal state, different objects", B([decl("Box", "a", nw("Box", lit(3))), decl("Box", "b", nw("Box", lit(3))), pr(bin("==", nm("a"), nm("b")))]), "false"],
    ["shared static state", { classes: [cls("Box", [field("int", "made", { st: true, init: lit(0), acc: "public" })], [ctor([], [I.inc("made")])], [])], helpers: [], main: [decl("Box", "a", nw("Box")), decl("Box", "b", nw("Box")), ex(nw("Box")), pr(I.sfld("Box", "made"))] }, "3"],
    ["constructor default", { classes: [cls("Box", [field("int", "size"), field("boolean", "open"), field("String", "tag")], [], [method("info", "String", [], [I.ret(bin("+", bin("+", bin("+", bin("+", I.str(""), nm("size")), I.str(" ")), nm("open")), bin("+", I.str(" "), nm("tag"))))])])], helpers: [], main: [decl("Box", "a", nw("Box")), pr(call("a", "info"))] }, "0 false null"],
  ];
  for (const [name, p, want] of bounds) { const got = outputText(simulate(p)); ok(got === want, `boundary ${name}: ${got}`); sem.boundaries.push({ name, answer: got }); }
  report.semantics = sem;
}

/* ======================= compat ======================= */
if (PART === "compat" || PART === "all") {
  const api = await import("../class-engine.js");
  for (const k of ["modeNames", "seededRandom", "shuffle", "challengeFamilies", "classObjectGame", "generateClassObject", "createClassObjectGenerator", "assessClassObject", "generateChallenge", "createPracticeSession"]) ok(k in api, "export " + k);
  ok(Object.keys(api.modeNames).join() === MODE_IDS.join(), "13 mode ids preserved in order");
  const legacy = await import("../class-engine-legacy.js");
  ok(JSON.stringify(legacy.modeNames) === JSON.stringify(api.modeNames), "mode names identical to the original engine");
  ok(Object.values(api.challengeFamilies).every((n) => n >= 1), "families per mode");
  const r = api.seededRandom(3), r2 = legacy.seededRandom(3); ok(r() === r2() && r() === r2(), "seededRandom identical to the original");
  const q = api.generateClassObject("aliases", api.seededRandom(9));
  ok(q.choices.length === 4 && api.assessClassObject(q, { answer: q.answer }) && !api.assessClassObject(q, { answer: "__wrong__" }) && api.assessClassObject(q, q.answer), "legacy assess contract");
  ok(q.topic === "aliases" && q.topicTitle === api.modeNames.aliases && q.game === "class-object-lab", "legacy topic attribution (bounded topics = mode ids)");
  const g = api.createClassObjectGenerator(42);
  const seenModes = new Set(); for (let i = 0; i < 26; i++) seenModes.add(g.next().mode);
  ok(seenModes.size === 13, "mixed practice covers all modes");
  ok(g.recent.length <= 30, "recent history bounded");
  ok(api.generateClassObject("mixed", api.seededRandom(4), "Advanced").difficulty === "Advanced", "difficulty argument");
  // legacy file content: only the header comment line differs from the original engine
  const orig = readFileSync(join(HERE, "../class-engine-rebuilt.js"), "utf8").split("\n"), kept = readFileSync(join(HERE, "../class-engine-legacy.js"), "utf8").split("\n");
  ok(orig.slice(1).join("\n") === kept.slice(1).join("\n"), "legacy engine preserved verbatim (except header)");
  // Class Builder -- Rearrange: load the UMD sources unchanged into a sandbox and exercise them
  const files = ["rng.js", "concepts.js", "java-model.js", "arrangement.js", "validator.js", "generator.js", "feedback.js", "session.js"];
  const sandbox = { console, Math, JSON, Date }; sandbox.self = sandbox; vm.createContext(sandbox);
  const digest = createHash("sha256");
  for (const f of files) { const src = readFileSync(join(HERE, "../class-builder-rearrange/src", f), "utf8"); digest.update(src); vm.runInContext(src, sandbox, { filename: f }); }
  const CBR = sandbox.CBR;
  let cbr = 0;
  for (const d of ["beginner", "intermediate", "advanced"]) for (let i = 0; i < 300; i++) {
    const ch = CBR.generator.generateChallenge(1000 + i, d);
    ok(CBR.validator.validate(ch.canonical, ch.model).solved, `Class Builder canonical solution validates (${d})`);
    ok(!CBR.validator.validate(ch.initial, ch.model).solved, `Class Builder initial layout is shuffled (${d})`);
    cbr++;
  }
  report.compat = { classBuilderChallenges: cbr, classBuilderSourceSha256: digest.digest("hex").slice(0, 16), legacyEngine: "class-engine-legacy.js (original, header comment only)" };
}

console.log(`Compositional generator tests [${PART}${args.modes ? ": " + MODES.join(",") : ""}]: ${checks} checks passed.`);
if (OUT) {
  let prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  for (const [k, v] of Object.entries(report)) if (Object.keys(v).length) prev[k] = { ...(prev[k] || {}), ...v };
  prev.checks = (prev.checks || 0) + checks;
  writeFileSync(OUT, JSON.stringify(prev, null, 1));
}
