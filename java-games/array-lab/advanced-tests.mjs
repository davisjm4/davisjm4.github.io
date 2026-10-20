import assert from "node:assert/strict";
import {mkdtempSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {formatFamilies, generateArray, assessArray, solutionArray} from "./array-engine.js";

const modes = ["create-references", "in-place", "trace-2d"];
const levels = ["Beginner", "Intermediate", "Advanced"];
let total = 0, assertions = 0;
const metrics = [];
const difficultyMeans = Object.fromEntries(modes.map(mode => [mode, Object.fromEntries(levels.map(level => [level, 0]))]));
const assertOk = (condition, message) => { assert.ok(condition, message); assertions++; };
for (const mode of modes) for (const difficulty of levels) {
  const exact = new Set(), structures = new Set(), familyCounts = new Map();
  for (let i = 0; i < 1000; i++) {
    const q = generateArray(mode, undefined, {difficulty, seed: 0xabc000 + i});
    total++;
    assert.equal(q.format, mode); assert.equal(q.difficulty, difficulty);
    assertOk(formatFamilies[mode].includes(q.family), `${mode} generated an unregistered family`);
    assert.equal(q.choices.length, 4); assert.equal(new Set(q.choices).size, 4);
    assert.equal(q.choices.filter(x => x === q.answer).length, 1);
    assertOk(q.choices.every(choice => !String(choice).startsWith("Alternative")), `${q.family} used a filler distractor`);
    assertOk(q.choices.every(x => x !== q.answer || x === q.correctAnswer));
    assertOk(q.code.includes("int") || mode === "create-references");
    assertOk(q.prompt.length > 12 && q.explanation.length > 20);
    assertOk(assessArray(q, {answer: q.answer}));
    assert.equal(solutionArray(q).answer, q.answer);
    const fingerprint = JSON.stringify([q.prompt, q.code, [...q.choices].sort()]);
    exact.add(fingerprint);
    const shape = q.code.replace(/-?\d+/g, "#").replace(/\{[^{}]*\}/g, "{LITERAL}").replace(/"[^"]*"/g, '"TEXT"');
    structures.add(`${q.family}|${shape}`);
    familyCounts.set(q.family, (familyCounts.get(q.family) || 0) + 1);
    difficultyMeans[mode][difficulty] += q.complexity?.elementCount || q.rows || q.values?.length || 0;
    if (mode === "in-place") {
      assertOk(Array.isArray(q.values) && Array.isArray(q.correctState));
      assert.equal(q.values.length, q.correctState.length);
      if (q.family.startsWith("rotate-")) assertOk(q.code.includes("values[i] = values[i + 1]") || q.code.includes("values[i] = values[i - 1]") || q.code.includes("values[left] = values[right]"), "rotation must update the same array");
      if (q.family === "compact-filter") assertOk(q.answer.includes("write="), "compaction must define the meaningful prefix");
    }
    if (mode === "trace-2d") {
      assertOk(q.grid.every(row => row.length === q.columns));
      assertOk(q.rows === q.grid.length);
      if (q.family === "diagonal-sum") assert.equal(q.rows, q.columns);
    }
  }
  assert.equal(familyCounts.size, formatFamilies[mode].length);
  assertOk(structures.size >= formatFamilies[mode].length, `${mode}/${difficulty} lacks structural coverage`);
  metrics.push({mode,difficulty,tested:1000,exactDuplicates:1000-exact.size,structuralPatterns:structures.size,families:familyCounts.size});

  // Consecutive-practice session: recent exact question signatures are avoided.
  const history = new Set(), run = [];
  for (let i=0;i<100;i++) run.push(generateArray(mode, undefined, {difficulty, seed:0x771000+i, history}));
  assert.equal(new Set(run.map(q => `${q.prompt}\n${q.code}`)).size, 100, `${mode}/${difficulty} repeated in a 100-question session`);
}
for (const mode of modes) {
  const means = levels.map(level => difficultyMeans[mode][level] / 1000);
  assertOk(means[0] < means[1] && means[1] < means[2], `${mode} difficulty must increase average data size: ${means.join(" < ")}`);
  for (const level of levels) difficultyMeans[mode][level] /= 1000;
}

// Seed reproduction is a public generator contract.
for (const mode of modes) for (const difficulty of levels) {
  assert.deepEqual(generateArray(mode, undefined, {difficulty,seed:8128}), generateArray(mode, undefined, {difficulty,seed:8128}));
}

const dir = mkdtempSync(join(tmpdir(), "array-lab-java-"));
let compiled=0, compared=0;
function java(name, code, tail, expected) {
  const className=`ArrayCheck_${name.replace(/[^A-Za-z0-9]/g,"_")}`;
  const file=join(dir,`${className}.java`);
  const source=`import java.util.Arrays;\npublic class ${className} {\n${code.includes("public static") ? code.slice(0,code.indexOf("\nint[]", code.indexOf("public static"))) : ""}\npublic static void main(String[] args) {\n${code.includes("public static") ? code.slice(code.indexOf("\nint[]", code.indexOf("public static"))+1) : code}\n${tail}\n}\n}`;
  writeFileSync(file,source);
  const result=spawnSync("java",["--source","17",file],{encoding:"utf8",timeout:15000});
  assert.equal(result.status,0,`${name} compile/run failed: ${result.stderr}\n${source}`); compiled++;
  if(expected!==undefined){assert.equal(result.stdout.trim(),String(expected).trim(),`${name} runtime output disagrees with generated answer`);compared++;}
}
function javaFailure(name, code, kind) {
  const className=`ArrayFailure_${name}`;
  const file=join(dir,`${className}.java`);
  writeFileSync(file,`public class ${className} { public static void main(String[] args) {\n${code}\n} }`);
  const result=spawnSync("java",["--source","17",file],{encoding:"utf8",timeout:15000});
  assert.notEqual(result.status,0,`${name} unexpectedly completed`);
  if(kind==="compile") assert.match(result.stderr,/might not have been initialized|variable .* might not have been initialized/);
  else assert.match(result.stderr,new RegExp(kind));
  compiled++;
}
try {
  const d="Advanced";
  let q;
  q=generateArray("create-references","negative-length",{difficulty:d,seed:123});
  javaFailure("negative_length",q.code,"NegativeArraySizeException");
  q=generateArray("create-references","invalid-boundary-access",{difficulty:d,seed:124});
  javaFailure("zero_length_access",q.code,"ArrayIndexOutOfBoundsException");
  q=generateArray("create-references","uninitialized-local",{difficulty:d,seed:125});
  javaFailure("uninitialized_local",q.code,"compile");
  q=generateArray("create-references","reference-default",{difficulty:d,seed:101});
  java("string_default",q.code,"",String(q.answer));
  q=generateArray("create-references","alias-mutation",{difficulty:d,seed:102});
  java("alias",q.code,"",String(q.answer));
  q=generateArray("create-references","method-mutation",{difficulty:d,seed:103});
  java("method_mutation",q.code,"",String(q.answer));
  q=generateArray("create-references","parameter-reassignment",{difficulty:d,seed:111});
  java("parameter_reassignment",q.code,"",String(q.answer));
  q=generateArray("create-references","returned-reference",{difficulty:d,seed:112});
  java("returned_reference",q.code,"",String(q.answer));
  q=generateArray("create-references","reference-equality",{difficulty:d,seed:126});
  java("reference_equality",q.code,"",String(q.answer));
  q=generateArray("in-place","rotate-left",{difficulty:d,seed:104});
  java("rotate_left",q.code,`System.out.print(Arrays.toString(values));`, `[${String(q.answer).slice(1,-1)}]`);
  q=generateArray("in-place","rotate-right",{difficulty:d,seed:105});
  java("rotate_right",q.code,`System.out.print(Arrays.toString(values));`, `[${String(q.answer).slice(1,-1)}]`);
  q=generateArray("in-place","reverse-complete",{difficulty:d,seed:106});
  java("reverse",q.code,`System.out.print(Arrays.toString(values));`, `[${String(q.answer).slice(1,-1)}]`);
  q=generateArray("in-place","shift-right",{difficulty:d,seed:107});
  java("shift_right",q.code,`System.out.print(Arrays.toString(values));`, `[${String(q.answer).slice(1,-1)}]`);
  for (const [family,seed] of [["shift-left",113],["conditional-swap",114],["compact-filter",115],["reverse-section",116]]) {
    q=generateArray("in-place",family,{difficulty:d,seed});
    java(`in_place_${family}`,q.code,`System.out.print(Arrays.toString(values));`,`[${q.correctState.join(", ")}]`);
  }
  q=generateArray("trace-2d","grid-count",{difficulty:d,seed:108});
  java("grid_count",q.code,"System.out.print(count);",q.answer);
  q=generateArray("trace-2d","diagonal-sum",{difficulty:d,seed:109});
  java("diagonal",q.code,"System.out.print(sum);",q.answer);
  q=generateArray("trace-2d","neighbor-count",{difficulty:d,seed:110});
  java("neighbors",q.code,"System.out.print(count);",q.answer);
  q=generateArray("trace-2d","grid-search",{difficulty:d,seed:117});
  java("grid_search",q.code,"System.out.print(\"(\" + foundRow + \", \" + foundCol + \")\");",q.answer);
  q=generateArray("trace-2d","minimum-coordinate",{difficulty:d,seed:118});
  java("minimum_coordinate",q.code,"System.out.print(\"(\" + minRow + \", \" + minCol + \")\");",q.answer);
  q=generateArray("trace-2d","maximum-row-sum",{difficulty:d,seed:119});
  java("maximum_row_sum",q.code,"System.out.print(bestRow);",q.answer);
  q=generateArray("trace-2d","minimum-column-sum",{difficulty:d,seed:120});
  java("minimum_column_sum",q.code,"System.out.print(bestCol);",q.answer);
  q=generateArray("trace-2d","traversal-order",{difficulty:d,seed:121});
  java("traversal_order",q.code,"",`${q.answer} `);
  q=generateArray("trace-2d","swap-rows",{difficulty:d,seed:122});
  java("swap_rows",q.code,"System.out.print(\"row 0 ↔ row \" + (grid.length-1));",q.answer);
} finally { rmSync(dir,{recursive:true,force:true}); }

console.log(`Array Lab procedural validation: ${total} challenges across 9 mode/difficulty cells; ${assertions} assertions; ${metrics.reduce((s,m)=>s+m.exactDuplicates,0)} exact duplicates across raw samples; ${metrics.reduce((s,m)=>s+m.structuralPatterns,0)} cell-pattern observations; ${compiled} generated Java snippets compiled and ${compared} outputs matched.`);
for (const m of metrics) console.log(`${m.mode}\t${m.difficulty}\t${m.tested}\t${m.exactDuplicates}\t${m.structuralPatterns}\t${m.families}`);
console.log(`Mean complexity sizes (beginner < intermediate < advanced): ${JSON.stringify(difficultyMeans)}`);
