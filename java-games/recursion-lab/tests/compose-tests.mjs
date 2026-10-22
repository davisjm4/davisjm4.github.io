// Quality gates for the compositional expansion (Node only; JVM checks are in jvm-compose-tests.mjs).
// Usage: node tests/compose-tests.mjs [perFamily=400] [perCell=1000]
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { modeNames, difficulties, generateRecursion, createRecursionGenerator, seededRandom, assessRecursion } from "../engine.js";
import { FAMILIES, composeQuestion } from "../compose/index.js";
import * as IR from "../compose/ir.js";
import { skeleton, promptKey, reasoningKey, exactKey } from "./normalize.mjs";
const perFamily = +(process.argv[2] || 400), perCell = +(process.argv[3] || 1000);
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const report = { families: {}, cells: {}, sessions: {}, progression: {} };
const BAD = /undefined|NaN|\[object|null(?!Pointer)|Infinity/;

// 1) Interpreter semantics spot checks (Java int rules)
const f = IR.program([IR.method("f", "int", [["int", "n"]], [IR.If(IR.bin("<=", IR.v("n"), IR.num(1)), [IR.Ret(IR.num(1))]), IR.Ret(IR.bin("*", IR.v("n"), IR.call("f", IR.bin("-", IR.v("n"), IR.num(1)))))])], "f");
ok(IR.run(f, "f", [12]).value === 479001600, "12! fits in int"); ok(IR.run(f, "f", [13]).error === "Overflow", "13! overflow is detected and rejected");
const dv = IR.program([IR.method("d", "int", [["int", "n"]], [IR.Ret(IR.bin("/", IR.v("n"), IR.num(2)))])], "d");
ok(IR.run(dv, "d", [-7]).value === -3, "int division truncates toward zero"); ok(IR.run(IR.program([IR.method("m", "int", [["int", "n"]], [IR.Ret(IR.bin("%", IR.v("n"), IR.num(3)))])], "m"), "m", [-7]).value === -1, "Java remainder sign");
const inf = IR.program([IR.method("g", "void", [["int", "n"]], [IR.Do(IR.call("g", IR.v("n")))])], "g"); ok(IR.run(inf, "g", [1]).error === "StackOverflowError", "non-terminating recursion is bounded");
const ss = IR.program([IR.method("s", "String", [["String", "s"]], [IR.Ret(IR.sub(IR.v("s"), IR.num(2)))])], "s"); ok(IR.run(ss, "s", ["A"]).error === "StringIndexOutOfBoundsException", "substring bounds");

// 2) Per-family invariants
for (const [mode, fams] of Object.entries(FAMILIES)) for (const fam of fams) for (const d of difficulties) {
  if (!fam.levels.includes(difficulties.indexOf(d))) continue;
  const r = seededRandom(1000 + checks % 9973), mis = new Set(), reasoning = new Set(); let built = 0, nulls = 0, explainsAnswer = 0;
  for (let i = 0; i < perFamily; i++) {
    const q = composeQuestion(fam, d, r); if (!q) { nulls++; continue; } built++;
    ok(q.mode === mode && q.difficulty === d && q.generator === "compositional-v1", `${fam.id}: metadata`);
    ok(q.choices.length === 4 && new Set(q.choices).size === 4 && q.choices.filter(c => c === q.answer).length === 1, `${fam.id}: 4 distinct choices, one key`);
    ok(assessRecursion(q, q.answer) && q.choices.filter(c => assessRecursion(q, c)).length === 1, `${fam.id}: assessment`);
    ok(q.misconceptions.length === 3 && q.choices.filter(c => c !== q.answer).every(c => q.choiceFeedback[c]?.length > 10), `${fam.id}: every distractor has a misconception and feedback`);
    ok(![q.code, q.prompt, q.explanation, ...q.choices].some(x => BAD.test(x)), `${fam.id}: no placeholder tokens: ${[q.code, q.prompt, ...q.choices].find(x => BAD.test(x))}`);
    ok(q.code.includes("public static") && q.code.includes("//") && q.trace.length > 0 && q.callCount > 0, `${fam.id}: code, comment line, trace`);
    ok(q.data.jvm && q.data.jvm.observe, `${fam.id}: JVM verification descriptor`);
    ok(typeof q.reasoning === "string" && q.reasoning.startsWith(fam.id === "knob-bug" ? "knob-bug" : fam.id), `${fam.id}: declared reasoning id`);
    if (/how many/i.test(q.prompt)) { const n = q.answer.match(/\d+/g)?.at(-1); ok(new RegExp(`\\b${n}\\b`).test(q.explanation), `${fam.id}: counting explanation states the count`); }
    if (q.explanation.includes(q.answer.replace(/^"|"$/g, ""))) explainsAnswer++;
    q.misconceptions.forEach(m => mis.add(m)); reasoning.add(q.reasoning);
  }
  ok(nulls / perFamily < 0.02, `${fam.id}/${d}: composition succeeds (${nulls} failures)`);
  report.families[`${mode}/${fam.id}/${d}`] = { built, compositionFailures: nulls, distinctMisconceptions: mis.size, declaredReasoning: reasoning.size, explanationStatesAnswerPct: +(explainsAnswer / built * 100).toFixed(1) };
}

// 3) Engine-level cells (mixed legacy + compositional, as students see them)
const skel = {};
for (const mode of Object.keys(modeNames)) for (const d of difficulties) {
  const r = seededRandom(424242 + Object.keys(modeNames).indexOf(mode) * 31 + difficulties.indexOf(d)), pos = [0, 0, 0, 0], rk = new Set(), sk = new Set(), ex = new Set(); let depth = 0, comp = 0;
  for (let i = 0; i < perCell; i++) { const q = generateRecursion(mode, r, d);
    ok(q.choices.length === 4 && new Set(q.choices).size === 4 && q.choices.includes(q.answer), `${mode}/${d}: choices`);
    pos[q.choices.indexOf(q.answer)]++; rk.add(reasoningKey(q)); sk.add(skeleton(q.code)); ex.add(exactKey(q)); depth += q.callDepth; if (q.generator === "compositional-v1") comp++; }
  const e = perCell / 4, chi2 = pos.reduce((a, o) => a + (o - e) ** 2 / e, 0);
  ok(chi2 < 16.27, `${mode}/${d}: answer positions balanced (chi2 ${chi2.toFixed(2)})`);
  ok(rk.size >= 20, `${mode}/${d}: at least 20 normalized reasoning patterns (${rk.size})`);
  skel[`${mode}/${d}`] = sk; report.cells[`${mode}/${d}`] = { reasoningPatterns: rk.size, skeletons: sk.size, distinctExact: ex.size, chi2: +chi2.toFixed(2), meanDepth: +(depth / perCell).toFixed(2), compositionalSharePct: +(comp / perCell * 100).toFixed(1) };
}
// 4) Difficulty progression: structural variety grows and Advanced is not a renamed Beginner
for (const mode of Object.keys(modeNames)) {
  const [b, i, a] = difficulties.map(d => report.cells[`${mode}/${d}`]);
  ok(b.skeletons < a.skeletons && b.reasoningPatterns < i.reasoningPatterns, `${mode}: variety grows with difficulty`);
  const overlap = [...skel[`${mode}/Advanced`]].filter(s => skel[`${mode}/Beginner`].has(s)).length / skel[`${mode}/Advanced`].size;
  ok(overlap < 0.75, `${mode}: most Advanced skeletons are not Beginner skeletons (${(overlap * 100).toFixed(0)}%)`);
  report.progression[mode] = { meanDepth: [b.meanDepth, i.meanDepth, a.meanDepth], skeletons: [b.skeletons, i.skeletons, a.skeletons], advancedSkeletonsAlsoInBeginnerPct: +(overlap * 100).toFixed(1) };
}
// 5) Student sessions: 100 consecutive questions per cell
for (const mode of Object.keys(modeNames)) for (const d of difficulties) for (const s of [7, 8, 9]) {
  const g = createRecursionGenerator(s * 1009), seen = new Set(), seenR = new Set(); let prev = null, exactRep = 0, consecutive = 0;
  for (let i = 0; i < 100; i++) { const q = g.next(mode, d), e = exactKey(q), k = reasoningKey(q); if (seen.has(e)) exactRep++; if (k === prev) consecutive++; seen.add(e); seenR.add(k); prev = k; }
  ok(exactRep <= 1, `${mode}/${d}: at most one exact repeat in 100 (${exactRep})`); ok(consecutive === 0, `${mode}/${d}: never the same reasoning twice in a row`);
  (report.sessions[`${mode}/${d}`] ??= []).push({ exactRepeats: exactRep, consecutiveSameReasoning: consecutive, distinctReasoning: seenR.size });
}
// 6) Determinism and mixed rotation
const g1 = createRecursionGenerator(145), g2 = createRecursionGenerator(145);
for (let i = 0; i < 300; i++) ok(g1.next("mixed", difficulties[i % 3]).signature === g2.next("mixed", difficulties[i % 3]).signature, "same seed reproduces the mixed sequence");
const rot = createRecursionGenerator(3), seenModes = new Set(); for (let i = 0; i < 12; i++) seenModes.add(rot.next("mixed").mode); ok(seenModes.size === 6, "mixed practice rotates through all six modes");
mkdirSync(new URL("../test-results/", import.meta.url), { recursive: true });
writeFileSync(new URL("../test-results/compose-tests.json", import.meta.url), JSON.stringify({ checks, perFamily, perCell, ...report }, null, 2));
console.log(JSON.stringify({ checks, families: Object.keys(report.families).length, cellsAtLeast20: Object.values(report.cells).filter(c => c.reasoningPatterns >= 20).length }));
