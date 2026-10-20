// Math Lab expansion — automated tests.
//   node math-lab/expansion/tests/expansion-tests.mjs            (full run, includes real Java)
//   SKIP_JAVA=1 node math-lab/expansion/tests/expansion-tests.mjs (no JDK available)
//   PER_CELL=1000 sets challenges per mode × difficulty (default 1000).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as G from "../generator.js";
import * as P from "../java-program.js";
import * as N from "../java-numeric.js";
import * as R from "../random-range.js";
import { buildJavaChecks } from "./java-sources.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const PER_CELL = Number(process.env.PER_CELL || 1000);
let assertions = 0;
const eq = (a, b, m) => { assert.deepEqual(a, b, m); assertions++; };
const ok = (a, m) => { assert.ok(a, m); assertions++; };
const report = { generatedAt: new Date().toISOString(), node: process.version, perCell: PER_CELL, cells: {}, sessions: {}, java: null, anchors: 0 };

// ---------------------------------------------------------------------------
// 1. Hand-authored semantic anchors. Expected values are written by hand from
//    the Java Language Specification, not computed by the code under test.
const { lit, dlit, llit, K, bin, cast, call, decl, assign, incdec, print, rnd, neg, ref, grp } = P;
const out = stmts => P.outcomeText(P.run(stmts));
const anchors = [
  [[print(bin("+", K("Integer.MAX_VALUE"), lit(1)))], "-2147483648"],
  [[print(bin("-", K("Integer.MIN_VALUE"), lit(1)))], "2147483647"],
  [[print(bin("*", lit(50000), lit(50000)))], "-1794967296"],
  [[print(call("abs", K("Integer.MIN_VALUE")))], "-2147483648"],
  [[print(neg(K("Integer.MIN_VALUE")))], "-2147483648"],
  [[print(bin("/", K("Integer.MIN_VALUE"), lit(-1)))], "-2147483648"],
  [[print(bin("%", K("Integer.MIN_VALUE"), lit(-1)))], "0"],
  [[print(bin("/", lit(-7), lit(2)))], "-3"],
  [[print(bin("%", lit(-7), lit(2)))], "-1"],
  [[print(bin("%", lit(7), lit(-2)))], "1"],
  [[print(call("pow", lit(3), lit(4)))], "81.0"],
  [[print(call("pow", lit(2), lit(-3)))], "0.125"],
  [[print(call("pow", lit(5), lit(0)))], "1.0"],
  [[print(call("sqrt", lit(81)))], "9.0"],
  [[print(call("sqrt", lit(-4)))], "NaN"],
  [[print(call("abs", dlit(-7.5)))], "7.5"],
  [[print(call("abs", lit(-14)))], "14"],
  [[print(call("round", dlit(-2.5)))], "-2"],
  [[print(call("round", dlit(2.5)))], "3"],
  [[print(call("round", dlit(-2.7)))], "-3"],
  [[print(cast("int", dlit(-8.9)))], "-8"],
  [[print(cast("int", dlit(7.9)))], "7"],
  [[print(cast("int", dlit(3e9)))], "2147483647"],
  [[print(cast("int", dlit(-3e9)))], "-2147483648"],
  [[print(cast("int", llit(3000000000)))], "-1294967296"],
  [[print(cast("int", bin("/", dlit(1), dlit(0))))], "2147483647"],
  [[print(bin("+", dlit(0.1), dlit(0.2)))], "0.30000000000000004"],
  [[print(bin("==", bin("+", dlit(0.1), dlit(0.2)), dlit(0.3)))], "false"],
  [[print(bin("==", bin("+", dlit(0.5), dlit(0.25)), dlit(0.75)))], "true"],
  [[print(bin("/", dlit(5), lit(0)))], "Infinity"],
  [[print(bin("/", dlit(-5), lit(0)))], "-Infinity"],
  [[print(bin("/", dlit(0), dlit(0)))], "NaN"],
  [[print(bin("/", lit(12), lit(0)))], "Throws ArithmeticException"],
  [[print(bin("%", lit(12), lit(0)))], "Throws ArithmeticException"],
  [[decl("int", "x", call("pow", lit(2), lit(3)))], "Does not compile"],
  [[decl("int", "x", call("round", dlit(2.5)))], "Does not compile"],
  [[decl("int", "x", P.bigIntLiteral("3000000000"))], "Does not compile"],
  [[decl("int", "x", lit(10)), assign("x", "+=", dlit(2.7)), print(ref("x"))], "12"],
  [[decl("int", "x", lit(10)), assign("x", "=", bin("+", ref("x"), dlit(2.7)))], "Does not compile"],
  [[decl("int", "x", K("Integer.MAX_VALUE")), assign("x", "+=", dlit(1)), print(ref("x"))], "2147483647"],
  [[decl("int", "a", lit(50000)), decl("long", "b", bin("*", ref("a"), ref("a"))), print(ref("b"))], "-1794967296"],
  [[decl("int", "a", lit(50000)), decl("long", "b", bin("*", cast("long", ref("a")), ref("a"))), print(ref("b"))], "2500000000"],
  [[print(dlit(1e7))], "1.0E7"],
  [[print(dlit(0.001))], "0.001"],
  [[print(dlit(0.0001))], "1.0E-4"],
  [[decl("int", "n", K("Integer.MAX_VALUE")), incdec("n", "++"), print(ref("n"))], "-2147483648"],
];
for (const [stmts, expected] of anchors) eq(out(stmts), expected, P.renderCode(stmts));
report.anchors = anchors.length;

// Random analysis anchors (sets written by hand).
const ri = e => R.possibleInts(e);
eq(ri(bin("+", cast("int", bin("*", rnd(), lit(6))), lit(1))), [1, 2, 3, 4, 5, 6]);
eq(ri(bin("+", bin("*", cast("int", rnd()), lit(6)), lit(1))), [1]);
eq(ri(bin("+", cast("int", bin("*", rnd(), lit(8))), lit(5))), [5, 6, 7, 8, 9, 10, 11, 12]);
eq(ri(bin("-", cast("int", bin("*", rnd(), lit(4))), lit(2))), [-2, -1, 0, 1]);
eq(ri(bin("+", bin("*", cast("int", bin("*", rnd(), lit(4))), lit(3)), lit(1))), [1, 4, 7, 10]);
eq(ri(bin("-", lit(10), cast("int", bin("*", rnd(), lit(3))))), [8, 9, 10]);
eq(R.truncatedRange({ lo: -5, hi: 5, lc: true, hc: false }), [-5, 4]);
eq(R.truncatedRange({ lo: -2.5, hi: 0, lc: false, hc: false }), [-2, 0]);

// ---------------------------------------------------------------------------
// 2. Generator correctness, determinism, and diversity for every mode × difficulty.
const all = [];
const complexity = (q) => q.metrics.statements + q.metrics.operations + q.metrics.methodCalls + q.metrics.casts + 2 * q.metrics.branches + 2 * q.metrics.loops;
for (const mode of Object.keys(G.EXPANSION_MODES)) {
  for (const difficulty of G.DIFFICULTIES) {
    const cell = { mode, difficulty, generated: 0, exact: new Set(), structure: new Set(), families: {}, shapes: new Set(), misconceptions: {}, positions: [0, 0, 0, 0], complexity: 0, codeLines: 0, questionTypes: {} };
    for (let seed = 0; seed < PER_CELL; seed++) {
      const q = G.generateChallenge({ mode, difficulty, seed });
      all.push(q);
      cell.generated++;
      ok(G.validate(q), q.id);
      eq(q.choices.length, 4, q.id);
      eq(new Set(q.choices).size, 4, q.id);
      eq(q.choices.filter(c => G.assessExpansion(q, c)).length, 1, q.id);
      eq(q.choiceDetails.filter(c => c.correct).length, 1, q.id);
      ok(q.choiceDetails.filter(c => !c.correct).every(c => c.misconception && c.why && c.why !== c.misconception), "unmodelled distractor " + q.id);
      ok(q.explanation.trim().length > 20 && q.explanation.length < 700, "explanation " + q.id);
      ok(!/undefined|\[object|NaN NaN/.test(JSON.stringify([q.prompt, q.code, q.choices, q.explanation])), "junk " + q.id);
      ok(q.mode === mode && q.difficulty === difficulty && q.seed === seed, "metadata " + q.id);
      // Output questions: the key is the program's actual outcome; every distractor differs.
      if (q.questionType === "output") {
        eq(P.outcomeText(P.run(q.program)), q.answer, q.id);
        // Program is valid Java within the subset unless the lesson is a compile error.
        if (q.answer !== "Does not compile") ok(P.compiles(q.program), q.id);
      }
      // Code-choice questions over random ranges: exactly one option has the target set.
      if (q.meta.optionSets) {
        const target = q.meta.target || q.meta.optionSets[q.answer];
        eq(q.choices.filter(c => q.meta.optionSets[c] && R.sameSet(q.meta.optionSets[c], target)).length, 1, q.id);
      }
      // Numeric choices never give the key away as "the only decimal" when avoidable.
      // Teacher Tools contract.
      for (const k of ["mode", "difficulty", "skill", "family", "seed", "code", "prompt", "choices", "answer", "explanation"]) ok(k in q, k);
      JSON.stringify(q); // serialisable
      cell.exact.add(q.signature.exact);
      cell.structure.add(q.signature.structure);
      cell.families[q.family] = (cell.families[q.family] || 0) + 1;
      cell.shapes.add(q.family + "/" + q.shape);
      cell.questionTypes[q.questionType] = (cell.questionTypes[q.questionType] || 0) + 1;
      for (const c of q.choiceDetails) if (!c.correct) cell.misconceptions[c.misconception] = (cell.misconceptions[c.misconception] || 0) + 1;
      cell.positions[q.correctIndex]++;
      cell.complexity += complexity(q);
      cell.codeLines += q.metrics.codeLines;
      if (seed < 25) eq(JSON.stringify(G.generateChallenge({ mode, difficulty, seed })), JSON.stringify(q), "determinism " + q.id);
    }
    const families = Object.keys(cell.families).length;
    ok(families >= 9, `${mode}/${difficulty}: only ${families} families`);
    ok(cell.positions.every(p => p > PER_CELL * 0.15 && p < PER_CELL * 0.35), `${mode}/${difficulty} answer positions ${cell.positions}`);
    report.cells[`${mode}/${difficulty}`] = {
      generated: cell.generated, exactUnique: cell.exact.size, exactDuplicates: cell.generated - cell.exact.size,
      structuralUnique: cell.structure.size, families, familyCounts: cell.families, shapes: cell.shapes.size,
      questionTypes: cell.questionTypes, distinctMisconceptions: Object.keys(cell.misconceptions).length,
      topMisconceptions: Object.entries(cell.misconceptions).sort((a, b) => b[1] - a[1]).slice(0, 8),
      answerPositions: cell.positions, meanComplexity: +(cell.complexity / cell.generated).toFixed(2), meanCodeLines: +(cell.codeLines / cell.generated).toFixed(2),
    };
  }
  // Difficulty progression: complexity strictly increases.
  const c = G.DIFFICULTIES.map(d => report.cells[`${mode}/${d}`].meanComplexity);
  ok(c[0] < c[1] && c[1] < c[2], `${mode} complexity does not increase: ${c}`);
}
// Family totals per mode.
for (const mode of Object.keys(G.EXPANSION_MODES)) ok(G.FAMILIES.filter(f => f.mode === mode).length >= 10, mode + " has fewer than 10 families");

// ---------------------------------------------------------------------------
// 3. Simulated classroom sessions: 100 consecutive challenges per mode × difficulty,
//    plus a 300-question session to approximate a long class period.
for (const mode of Object.keys(G.EXPANSION_MODES)) for (const difficulty of G.DIFFICULTIES) {
  for (const [label, length, seeds] of [["100", 100, [1, 2, 3]], ["300", 300, [4]]]) {
    const runs = [];
    for (const seed of seeds) {
      const deck = G.createExpansionDeck({ seed });
      const qs = Array.from({ length }, () => deck.next(mode, difficulty));
      const exact = new Set(qs.map(q => q.signature.exact)), structure = new Set(qs.map(q => q.signature.structure));
      let backToBack = 0, structuralRepeatsWithin12 = 0;
      qs.forEach((q, i) => {
        if (i && qs[i - 1].family === q.family) backToBack++;
        if (qs.slice(Math.max(0, i - 12), i).some(p => p.signature.structure === q.signature.structure)) structuralRepeatsWithin12++;
      });
      const fam = {}; qs.forEach(q => fam[q.family] = (fam[q.family] || 0) + 1);
      runs.push({ seed, length, exactRepeats: length - exact.size, structuralUnique: structure.size, structuralRepeatsWithin12, sameFamilyBackToBack: backToBack, familiesSeen: Object.keys(fam).length, maxFamilyShare: Math.max(...Object.values(fam)) / length });
      eq(length - exact.size, 0, `exact repeat in ${mode}/${difficulty} session`);
      eq(backToBack, 0, "same family twice in a row");
    }
    report.sessions[`${mode}/${difficulty}/${label}`] = runs;
  }
}
const deckA = G.createExpansionDeck({ seed: 99 }), deckB = G.createExpansionDeck({ seed: 99 });
for (let i = 0; i < 30; i++) eq(deckA.next("math-methods", "advanced").id, deckB.next("math-methods", "advanced").id, "seeded decks reproducible");

// ---------------------------------------------------------------------------
// 4. Real Java verification (independent oracle: javac + JVM).
if (!process.env.SKIP_JAVA) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "mathlab-exp-"));
  const javaDir = path.join(folder, "src"); fs.mkdirSync(javaDir);
  try {
    const checks = buildJavaChecks(all, javaDir);
    const java = process.env.JAVA || "java";
    const reportFile = path.join(folder, "oracle.tsv");
    execFileSync(java, ["-Xss8m", path.join(here, "JavaOracle.java"), javaDir, reportFile], { encoding: "utf8", timeout: 900000, maxBuffer: 20 * 1024 * 1024, stdio: ["ignore", "inherit", "inherit"] });
    const rows = new Map(fs.readFileSync(reportFile, "utf8").trim().split("\n").map(line => { const f = line.split("\t"); return [f[0], f]; }));
    const unesc = s => (s || "").replace(/\\(n|t|\\)/g, (_, c) => c === "n" ? "\n" : c === "t" ? "\t" : "\\");
    const byType = {}; let failures = [];
    for (const c of checks) {
      const row = rows.get(c.id);
      const result = { status: row[1], exception: row[1] === "EXCEPTION" ? row[2] : null, stdout: row[1] === "EXCEPTION" ? unesc(row[3]) : row[1] === "OK" ? unesc(row[2]) : "", error: row[1] === "COMPILE_ERROR" ? row[2] : null };
      const problem = c.judge(result);
      byType[c.type] = byType[c.type] || { checked: 0, families: new Set() };
      byType[c.type].checked++; byType[c.type].families.add(c.family);
      if (problem) failures.push(`${c.challenge} [${c.type}] ${problem}`);
      assertions++;
    }
    report.java = { programs: checks.length, byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, { checked: v.checked, families: v.families.size }])), failures: failures.slice(0, 50), failureCount: failures.length };
    const perCell = {};
    for (const c of checks) { const k = `${c.mode}/${c.difficulty}`; perCell[k] = perCell[k] || { checks: 0, challenges: new Set() }; perCell[k].checks++; perCell[k].challenges.add(c.challenge); }
    report.java.perCell = Object.fromEntries(Object.entries(perCell).map(([k, v]) => [k, { checks: v.checks, challengesCovered: v.challenges.size }]));
    if (failures.length) { console.error(failures.slice(0, 20).join("\n")); throw new Error(`${failures.length} Java disagreements`); }
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
}

fs.mkdirSync(path.join(here, "results"), { recursive: true });
fs.writeFileSync(path.join(here, "results", "test-report.json"), JSON.stringify(report, null, 2));
console.log(`Math Lab expansion: ${all.length} generated challenges, ${anchors.length} semantic anchors, ${assertions} assertions` +
  (report.java ? `, ${report.java.programs} real Java programs (${report.java.failureCount} disagreements)` : ", Java skipped") + ". All passed.");
