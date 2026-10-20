import assert from "node:assert/strict";
import { booleanGame, generate, assess, makeRng, signature, enumerateTruthTable, evaluateBooleanExpression, validateBooleanExpression } from "./engine.js";

let checks = 0;
const modes = Object.keys(booleanGame.modes);
const positions = Object.fromEntries(modes.map(m => [m, [0, 0, 0, 0]]));
const variants = new Set();
for (const mode of modes) {
  const rng = makeRng(7000 + mode.length);
  for (let i = 0; i < 150; i++) {
    const q = generate(mode, rng);
    assert.equal(q.mode, mode); checks++;
    assert.ok(q.question && q.explanation && q.code); checks += 2;
    if (q.kind === "select") {
      assert.ok(q.tokens.length >= 4); checks++;
      assert.equal(q.tokens.filter(t => t.correct).length, 1); checks++;
      assert.equal(q.answer, q.tokens.findIndex(t => t.correct)); checks++;
      assert.equal(assess(q, q.answer), true); checks++;
      assert.equal(assess(q, (q.answer + 1) % q.tokens.length), false); checks++;
    } else {
      assert.ok(q.choices.length === 2 || q.choices.length === 4); checks++;
      assert.equal(new Set(q.choices).size, q.choices.length); checks++;
      assert.ok(q.answer >= 0 && q.answer < q.choices.length); checks++;
      assert.equal(assess(q, q.answer), true); checks++;
      assert.equal(assess(q, (q.answer + 1) % q.choices.length), false); checks++;
    }
    variants.add(signature(q)); positions[mode][q.answer]++;
  }
}
assert.ok(variants.size >= 20); checks++;
for (const mode of modes) {
  const seen = positions[mode].filter(x => x > 0).length;
  assert.ok(seen >= 2, `${mode} answer positions are predictable`); checks++;
}
const mixed = makeRng(9911), mixedModes = new Set();
for (let i = 0; i < 1050; i++) mixedModes.add(generate("mixed", mixed).mode);
assert.deepEqual([...mixedModes].sort(), [...modes].sort()); checks++;
assert.equal(booleanGame.modes.evaluate, "Evaluate Expressions"); checks++;
console.log(`Boolean & Conditional Lab: ${checks} checks passed; ${variants.size} distinct generated signatures across ${modes.length} modes and 1,050 mixed challenges.`);

const newModes = ["truthTable", "switchIf", "coverage"], levels = ["Beginner", "Intermediate", "Advanced"];
const report = [];
for (const mode of newModes) for (const difficulty of levels) {
  const exact = new Set(), structure = new Set(), families = new Set();
  const rng = makeRng(61000 + newModes.indexOf(mode) * 100 + levels.indexOf(difficulty));
  for (let i=0;i<1000;i++) {
    const q=generate(mode,rng,difficulty); exact.add(signature(q)); families.add(q.family);
    structure.add(`${q.family}|${q.code.replace(/\b\d+\b/g,"#").replace(/\b(?:true|false)\b/g,"BOOL").replace(/"[^"]*"/g,'"TEXT"')}`);
    assert.equal(q.difficulty,difficulty); assert.ok(q.seed); assert.ok(q.family && q.skill && q.questionStem && q.javaCode && q.answerOptions && q.correctAnswer); checks+=2;
    assert.equal(new Set(q.choices).size,q.choices.length); assert.equal(assess(q,q.answer),true); assert.equal(assess(q,(q.answer+1)%q.choices.length),false); checks+=3;
    if(mode==="truthTable") {
      assert.ok(q.table?.length >= 2 && q.table.length <= 8); checks++;
      if(q.expression){const quality=validateBooleanExpression(q.expression,difficulty);assert.equal(quality.valid,true,`${difficulty}: ${q.expression} ${quality.reasons}`);assert.deepEqual(Object.keys(q.table[0]).filter(k=>k!=="result").sort(),quality.vars);assert.deepEqual(quality.essentialVariables,quality.vars);for(const row of (q.allRows||q.table)) assert.equal(row.result,evaluateBooleanExpression(q.expression,row));checks+=3;}
      if(q.expressions){for(const expression of q.expressions)assert.equal(validateBooleanExpression(expression,difficulty).valid,true,`${difficulty}: ${expression}`);assert.deepEqual(Object.keys(q.table[0]).filter(k=>k!=="result").sort(),[...new Set(q.expressions.flatMap(x=>x.match(/\b[a-z]\b/g)||[]))].sort());assert.equal(q.choices[q.answer]==="Equivalent",q.table.every(row=>evaluateBooleanExpression(q.expressions[0],row)===evaluateBooleanExpression(q.expressions[1],row)));checks+=3;}
    }
    if(mode==="coverage"&&(q.family==="missing-case"||q.family==="domain-coverage")){const max=q.domain?.match(/\[[^,]+, (\d+)\]/)?.[1];assert.ok(max&&q.question.includes(`through ${max}`));checks++;}
  }
  assert.ok(families.size >= 4,`${mode}/${difficulty} family variety`); assert.ok(structure.size >= 4,`${mode}/${difficulty} structural variety`); checks+=2;
  report.push({mode,difficulty,tested:1000,exactDuplicates:1000-exact.size,structuralPatterns:structure.size,families:families.size});
}
assert.deepEqual(generate("switchIf",makeRng(77)),generate("switchIf",makeRng(77))); checks++;
assert.equal(enumerateTruthTable("!(a && b)",["a","b"]).length,4); checks++;
const rejectedExpressions=[
  "((a && a) && b)", "a || a", "a && true", "a && !a", "a || !a",
  "((a && b) && (a && b))", "(a && b) || (a && !b)", "(a && b) || (a && !b) || c",
  "((c || a) || (b && !a))", "(!a || (b || ((!b && c) && a)))",
];
for(const expression of rejectedExpressions){assert.equal(validateBooleanExpression(expression,"Intermediate").valid,false,expression);checks++;}
assert.deepEqual(Object.keys(enumerateTruthTable("((a && a) && b)",["a","b","c"])[0]).filter(k=>k!=="result").sort(),["a","b"]);checks++;
const advancedParity="(((a && !b) && !c) || ((!a && b) && !c)) || (((!a && !b) && c) || ((a && b) && c))";
for(const expression of [advancedParity,"!((((a || b) || c) && ((a || !b) || !c)) && (((!a || b) || !c) && ((!a || !b) || c)))"]){const quality=validateBooleanExpression(expression,"Advanced");assert.equal(quality.valid,true,`${expression}: ${quality.reasons}`);assert.equal(quality.essentialVariables.length,3);checks+=2;}
const verifiedEquivalenceShapes=new Set(),eqRng=makeRng(74821);
for(let i=0;i<3000&&verifiedEquivalenceShapes.size<6;i++){const q=generate("equivalent",eqRng);const shape=Number(q.variant.replace("equiv-",""));if(![1,4,5,6,7,8].includes(shape))continue;const original=q.code.match(/boolean expression = ([^;]+);/)[1],vars=[...new Set([original,...q.choices].flatMap(x=>x.match(/\b[a-z]\b/g)||[]))].sort(),rows=enumerateTruthTable(original,vars),equivalent=q.choices.map(option=>rows.every(row=>evaluateBooleanExpression(original,row)===evaluateBooleanExpression(option,row)));assert.equal(equivalent.filter(Boolean).length,1,`ambiguous equivalent options for ${q.variant}`);assert.equal(equivalent[q.answer],true,`wrong De Morgan/equivalence answer for ${q.variant}`);verifiedEquivalenceShapes.add(shape);checks+=2;}
assert.equal(verifiedEquivalenceShapes.size,6);checks++;
const qualitySamples=[];
for(const difficulty of levels){const q=generate("truthTable",makeRng(93200+levels.indexOf(difficulty)),difficulty);const expression=q.expression||q.expressions?.[0];const quality=validateBooleanExpression(expression,difficulty);assert.equal(quality.valid,true);qualitySamples.push({difficulty,family:q.family,expression,variables:quality.vars,minimizedDnfTerms:quality.dnf.terms,minimizedDnfLiterals:quality.dnf.literals,operators:quality.operators});checks++;}
console.log(`Expression quality samples: ${JSON.stringify(qualitySamples)}`);
console.log(`New mode matrix: ${JSON.stringify(report)}`);
console.log(`Expanded Boolean & Conditional Lab: ${checks} checks passed; 9,000 new-mode/difficulty challenges verified.`);
