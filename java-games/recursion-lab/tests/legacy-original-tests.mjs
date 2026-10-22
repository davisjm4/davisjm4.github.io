import assert from "node:assert/strict";
import { modeNames, difficulties, generateRecursion, createRecursionGenerator, seededRandom, assessRecursion, recursionMetrics, simulateBinarySearch, simulateMergeSort } from "./legacy-shim.mjs";

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const all = Object.keys(modeNames), perCell = 1000, metrics = {};
assert.equal(all.length, 6);
for (const mode of all) for (const difficulty of difficulties) {
  const exact = new Set(), structures = new Set(), families = new Set(), positions = new Set(), depth = [], invalid = [];
  const familyCount = new Map();
  const r = seededRandom((all.indexOf(mode) + 1) * 70001 + (difficulties.indexOf(difficulty) + 1) * 900001);
  for (let i = 0; i < perCell; i++) {
    const q = generateRecursion(mode, r, difficulty);
    try {
      ok(q.game === "recursion-lab" && q.mode === mode && q.difficulty === difficulty, "challenge metadata matches request");
      ok(q.code.includes("public static") && q.code.includes("//") && q.prompt.length > 10, "question includes Java method and prompt");
      ok(q.choices.length === 4 && new Set(q.choices).size === 4 && q.choices.filter(x => x === q.answer).length === 1, "answer choices are distinct and contain one key");
      ok(assessRecursion(q, q.answer) && !assessRecursion(q, "unlikely-invalid"), "answer validator recognizes the key");
      ok(!q.code.includes("eval(") && q.callCount > 0 && q.callDepth >= 0, "generated trace is bounded");
      if (mode === "base" && q.prompt.startsWith("Which condition")) {
        const actual=q.code.match(/if \(([^)]+)\)/)[1], vector=expr=>Array.from({length:16},(_,j)=>j-3).map(n=>{const [,op,num]=expr.match(/^n (<=|<|==|>=|>) (\d+)$/);return op==="<="?n<=+num:op==="<"?n<+num:op==="=="?n===+num:op===">="?n>=+num:n>+num}).join("");
        ok(q.answer===actual && new Set(q.choices.map(vector)).size===4,"base-case answer has one semantically unique condition");
      }
      if (mode === "arrays") {
        const a=q.data.array,t=q.data.target,i=q.data.index,k=q.data.operation;
        const expected=[a.reduce((x,y)=>x+y,0),a.filter(x=>x===t).length,a.indexOf(t),a.reduce((x,y)=>x+y,0),String(a.some(x=>x%2===0)),Math.max(...a.slice(i)),a.reduce((s,x,j)=>s+(j%2===0?x:-x),0),a.slice().reverse().join(" ")][k];
        ok(String(expected)===q.answer,"array result agrees with independent direct execution");
      }
      if (mode === "output") {
        const s=q.data.text,k=q.data.operation;
        const expected=k===1||k===3?[...s].reverse().join(""):k<3?s:k===4?[...s].filter(c=>c===s[0]).join(""):k===5?[...s].filter((_,j)=>j%2===0).join(""):k===6?s.slice(0,Math.ceil(s.length/2)):s.slice(Math.floor(s.length/2));
        ok(expected===q.answer,"String recursive result agrees with independent transformation");
      }
      if (mode === "searchsort") {
        const a=q.data.array,k=q.data.operation;
        if(q.data.algorithm==="binarySearch") { const sim=simulateBinarySearch(a,q.data.target), first=sim.trace.find(x=>!x.base); const expected=k===0?(first.value===q.data.target?`return ${first.mid}`:first.value<q.data.target?`low = ${first.mid+1}`:`high = ${first.mid-1}`):k===2?first.mid:k===4?sim.calls:sim.result;ok(String(expected)===q.answer,"binary-search answer matches independent simulator"); }
        else { const sim=simulateMergeSort(a), mid=Math.floor((a.length-1)/2), expected=k===1?"low >= high":k===3?`0..${mid} and ${mid+1}..${a.length-1}`:k===5?sim.calls:sim.result.join(", ");ok(String(expected)===q.answer,"merge-sort answer matches independent simulator"); }
      }
      exact.add(q.signature);
      structures.add(q.family + "|" + q.code.replace(/\d+/g, "#").replace(/\"[A-Z]+\"/g, '"WORD"'));
      families.add(q.family); familyCount.set(q.family, (familyCount.get(q.family) || 0) + 1);
      positions.add(q.choices.indexOf(q.answer));
      depth.push(q.callDepth);
      if (q.trace.length === 0) invalid.push("missing trace");
    } catch (e) { invalid.push(`${i}: ${e.message}`); }
  }
  ok(invalid.length === 0, `${mode} ${difficulty}: no invalid challenges (${invalid.slice(0, 2)})`);
  ok(exact.size >= 500, `${mode} ${difficulty}: exact uniqueness ${exact.size}/${perCell}`);
  ok(structures.size >= 8, `${mode} ${difficulty}: structural variety ${structures.size}`);
  ok(families.size >= 5, `${mode} ${difficulty}: family coverage ${families.size}`);
  ok(positions.size >= 3, `${mode} ${difficulty}: answer positions vary`);
  metrics[`${mode}/${difficulty}`] = { count: perCell, exact: exact.size, exactDuplicatePct: +((1-exact.size/perCell)*100).toFixed(2), structures: structures.size, families: families.size, depthMin: Math.min(...depth), depthMax: Math.max(...depth), familyCount: Object.fromEntries(familyCount) };
}

// 100 consecutive questions per mode/difficulty: bounded histories suppress
// exact duplicates and recently repeated structural signatures.
for (const mode of all) for (const difficulty of difficulties) {
  const gen = createRecursionGenerator(20261020), recentExact = new Set(), recentShapes = new Set();
  for (let i = 0; i < 100; i++) {
    const q = gen.next(mode, difficulty);
    ok(!recentExact.has(q.signature), `${mode}/${difficulty}: recent exact repeat suppressed`);
    if (i > 0 && recentShapes.size < 8) ok(!recentShapes.has(q.structuralSignature), `${mode}/${difficulty}: recent structure repeat suppressed while alternatives remain`);
    recentExact.add(q.signature); recentShapes.add(q.structuralSignature);
    if (recentExact.size > 100) recentExact.delete(recentExact.values().next().value);
    if (recentShapes.size > 8) recentShapes.delete(recentShapes.values().next().value);
  }
}

const first = createRecursionGenerator(145), second = createRecursionGenerator(145);
for (let i = 0; i < 200; i++) ok(first.next("mixed", difficulties[i%3]).signature === second.next("mixed", difficulties[i%3]).signature, "same seed reproduces mixed sequence");
const diverse = createRecursionGenerator(101), seenModes = new Set(); for (let i=0;i<30;i++) seenModes.add(diverse.next("mixed").mode); ok(seenModes.size===all.length,"mixed mode rotates through all modes");
console.log(JSON.stringify({ checks, challenges: all.length*difficulties.length*perCell, samplesPerCell: perCell, metrics }, null, 2));
