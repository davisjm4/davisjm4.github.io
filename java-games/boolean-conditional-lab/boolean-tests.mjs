// Fast compatibility suite for the rebuilt generators (runs in the repo's npm test).
// Heavier gates live in tests/quality-gates.mjs (diversity, difficulty, sessions)
// and tests/java-verify.mjs (real Java execution of every answer claim).
import assert from "node:assert/strict";
import { booleanGame, generate, assess, makeRng, signature, enumerateTruthTable, evaluateBooleanExpression, validateBooleanExpression, createPracticeSession } from "./engine.js";

let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const modes = Object.keys(booleanGame.modes), levels = ["Beginner", "Intermediate", "Advanced"];

// 1. every mode and difficulty produces schema-valid, single-answer challenges
for (const mode of modes) for (const L of levels) {
  const rng = makeRng(7000 + modes.indexOf(mode) * 10 + levels.indexOf(L)); const pos = new Set(); const sigs = new Set();
  for (let i = 0; i < 120; i++) {
    const q = generate(mode, rng, L);
    ok(q.mode === mode && q.topic === mode && q.modeTitle === booleanGame.modes[mode], `${mode} identity`);
    ok(q.question && q.explanation && q.code && q.difficulty === L, `${mode} fields`);
    ok(q.family && q.skill && q.questionStem && q.javaCode && q.answerOptions && q.correctAnswer !== undefined, `${mode} schema v2 fields`);
    if (q.kind === "select") {
      ok(q.tokens.length >= 4 && q.tokens.filter(t => t.correct).length === 1 && q.answer === q.tokens.findIndex(t => t.correct), `${mode} select token`);
    } else {
      ok(q.choices.length >= 2 && q.choices.length <= 4 && new Set(q.choices).size === q.choices.length, `${mode} choices`);
      ok(q.answerText === q.choices[q.answer], `${mode} answerText`);
    }
    const n = q.kind === "select" ? q.tokens.length : q.choices.length;
    ok(assess(q, q.answer) && !assess(q, (q.answer + 1) % n), `${mode} assess`);
    pos.add(q.answer); sigs.add(signature(q));
  }
  ok(pos.size >= 2, `${mode}/${L} answer positions are predictable`);
  ok(sigs.size >= 100, `${mode}/${L} only ${sigs.size} distinct of 120`);
}
// 2. Teacher Tools contract: these modes always give 4-choice items by default
for (const mode of ["branch", "conditions", "equivalent", "short", "construct"]) { const rng = makeRng(31); for (let i = 0; i < 60; i++) ok(generate(mode, rng).choices.length === 4, `${mode} must stay 4-choice for QTI`); }
// 3. mixed practice reaches every mode; unknown difficulty falls back safely
const mixed = makeRng(9911), seen = new Set(); for (let i = 0; i < 600; i++) seen.add(generate("mixed", mixed).mode);
assert.deepEqual([...seen].sort(), [...modes].sort()); checks++;
ok(generate("truthTable", makeRng(3), "Expert").difficulty === "Intermediate", "difficulty fallback");
ok(booleanGame.modes.evaluate === "Evaluate Expressions", "mode titles unchanged");
// 4. determinism
assert.deepEqual(generate("switchIf", makeRng(77), "Advanced"), generate("switchIf", makeRng(77), "Advanced")); checks++;
assert.deepEqual(generate("coverage", makeRng(78), "Beginner"), generate("coverage", makeRng(78), "Beginner")); checks++;
// 5. the Boolean validator rejects the documented defects and accepts genuine forms
for (const e of ["((a && a) && b)", "a || a", "a && true", "a && !a", "a || !a", "((a && b) && (a && b))", "(a && b) || (a && !b)", "(a && b) || (a && !b) || c", "((c || a) || (b && !a))", "(!a || (b || ((!b && c) && a)))"])
  ok(!validateBooleanExpression(e, "Intermediate").valid, `should reject ${e}`);
for (const e of ["(((a && !b) && !c) || ((!a && b) && !c)) || (((!a && !b) && c) || ((a && b) && c))", "a && (b || c)", "(a || b) && !(a && b)"])
  ok(validateBooleanExpression(e, "Advanced").valid, `should accept ${e}`);
assert.deepEqual(Object.keys(enumerateTruthTable("((a && a) && b)")[0]).filter(k => k !== "result").sort(), ["a", "b"]); checks++;
ok(enumerateTruthTable("!(a && b)").length === 4 && evaluateBooleanExpression("a || b && !c", { a: false, b: true, c: false }) === true, "string utilities");
// 6. the defect that motivated the rebuild cannot be generated
for (const L of levels) { const rng = makeRng(555); for (let i = 0; i < 300; i++) { const q = generate("truthTable", rng, L); ok(!/\b([a-z])\s*&&\s*\1\b/.test(q.expression || "") || /every possible|simpler/.test(q.question), `redundant operand in ${q.expression}`); if (q.table) { const shown = Object.keys(q.table[0]).filter(k => k !== "result"); ok(shown.every(v => new RegExp(`\\b${v}\\b`).test(q.expression)), "table shows only used variables"); } } }
// 7. bounded session history: no repeats in 100 consecutive challenges
{ const r = makeRng(42); const s = createPracticeSession({ seedSource: () => Math.floor(r() * 0x7fffffff) + 1 }); for (const mode of ["truthTable", "switchIf", "coverage"]) { const sig = new Set(); for (let i = 0; i < 100; i++) sig.add(signature(s.next(mode, "Beginner"))); ok(sig.size === 100, `${mode} repeated within 100`); } }
console.log(`Boolean & Conditional Lab: ${checks} compatibility checks passed across ${modes.length} modes x 3 difficulties.`);
