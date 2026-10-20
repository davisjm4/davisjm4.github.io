import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import * as D from "./debugger-engine.js";
import * as Session from "../session.js";

const modes = Object.keys(D.challengeFamilies);
const levels = D.DIFFICULTIES;
assert.deepEqual(modes, ["correction", "statement", "explanation", "test", "exception"]);
assert.equal(D.formatNames.explanation, "Find the Cause");
assert.equal(D.formatNames.exception, "Name the Exception");
assert.deepEqual(levels, ["beginner", "intermediate", "advanced"]);

const metrics=[];
const javaTokens=new Set("public class static void main String int double boolean char if else for while return try catch new null true false break continue System out println length substring charAt equals compareTo toUpperCase ArithmeticException".split(" "));
const normalize=(q)=>q.code.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g,'"S"').replace(/-?\d+(?:\.\d+)?/g,"#").replace(/\b[A-Za-z_$][\w$]*\b/g,token=>javaTokens.has(token)?token:"V").replace(/\s+/g," ").trim();
const exact=(q)=>JSON.stringify([q.format,q.difficulty,q.prompt,q.requirement,q.code,q.choices,q.correctAnswer]);
function verifyTestCase(q,t){
  const v=t.input;
  switch(q.familyId){
    case "loop-bound": return [v.reduce((a,b)=>a+b,0),v.slice(0,-1).reduce((a,b)=>a+b,0)];
    case "array-bound":case "search-edge": {const target=v.find(x=>x<0),correct=target===undefined?-1:v.indexOf(target),later=v.slice(1).findIndex(x=>x<0);return [correct,later<0?-1:later+1];}
    case "string-content": return [v[0]===v[1],v[2]];
    case "integer-division": return [v[0]/v[1],Math.trunc(v[0]/v[1])];
    case "boolean-range": {const [low,high]=[...q.code.matchAll(/(?:>=|<=) (-?\d+)/g)].map(x=>Number(x[1]));return [v[0]>=low&&v[0]<=high,v[0]>=low||v[0]<=high];}
    case "wrong-update": return [v.reduce((a,b)=>a+b,0),v.at(-1)];
    case "method-parameter": return [v[0]+v[1],v[0]+5];
    case "aliasing": return [[v[0]],[v[0]===Number(q.code.match(/== (\d+)/)?.[1])?99:v[0]]];
    case "sentinel": {const at=v.indexOf(-1),limit=at<0?v.length:at;return [v.slice(0,limit).reduce((a,b)=>a+b,0),v.slice(0,limit+(at<0?0:1)).reduce((a,b)=>a+b,0)];}
    default: throw new Error(`No independent expected/actual model for ${q.familyId}`);
  }
}
let total=0, assertions=0;
for(const mode of modes) for(const difficulty of levels){
  const exactSet=new Set(),structures=new Set(),families=new Set(),familyCounts={},distractors=new Set(),answerCounts=new Map();let complexity=0;
  let categoryCounts={};
  for(let i=0;i<1000;i++){
    const seed=(Math.imul(i+1,2654435761)^Math.imul(modes.indexOf(mode)+3,2246822519)^Math.imul(levels.indexOf(difficulty)+7,3266489917))>>>0;
    const q=D.generateDebugger(mode,{difficulty,seed}); total++;
    assert.equal(q.format,mode);assert.equal(q.difficulty,difficulty);assert.ok(q.seed===seed);assert.ok(q.code&&q.code.trim());assert.ok(q.prompt&&q.explanation&&q.requirement);assert.equal(q.metadata.complexity>0,true);assert.equal(q.metadata.traceSteps,q.code.split("\n").length);assert.ok(q.metadata.concepts.length);assert.ok(q.correctAnswer);complexity+=q.metadata.complexity;
    if(q.kind==="line") {assert.ok(Number(q.correctLine)>=1&&Number(q.correctLine)<=q.lines.length);assert.equal(D.assessDebugger(q,{line:q.correctLine}),true);}
    else {assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.equal(q.choices.filter(c=>c===q.answer).length,1);assert.equal(D.assessDebugger(q,{answer:q.answer}),true);for(const c of q.choices)assert.ok(c.length>3);distractors.add(q.choices.filter(c=>c!==q.answer).sort().join("~"));answerCounts.set(q.choices.indexOf(q.answer),(answerCounts.get(q.choices.indexOf(q.answer))||0)+1);}
    assert.equal(D.assessDebugger(q,q.kind==="line"?{line:"-1"}:{answer:"__wrong__"}),false);
    exactSet.add(exact(q));structures.add(normalize(q));families.add(q.familyId);familyCounts[q.familyId]=(familyCounts[q.familyId]||0)+1;categoryCounts[q.errorCategory]=(categoryCounts[q.errorCategory]||0)+1;
    // Every family has a deterministic, explicit result/cause and validated choices.
    if(mode==="exception"){
      assert.ok(["compile","runtime","logic","success"].includes(q.errorCategory));
      assert.ok(q.errorCategoryName);
      if(q.familyId==="array-index"||q.familyId==="computed-index"||q.familyId==="loop-boundary")assert.equal(q.answer,"ArrayIndexOutOfBoundsException");
      if(q.familyId==="string-index"||q.familyId==="null-dereference"||q.familyId==="arithmetic-zero"||q.familyId==="evaluation-order")assert.ok(q.explanation.length>30);
    }
    if(mode==="correction"&&q.familyId==="array-bound"){
      const length=q.code.match(/= \{([^}]*)\}/)[1].split(",").length;const bad=Number(q.code.match(/\[(-?\d+)\]/)[1]);const answerIndex=Number(q.answer.match(/\[(-?\d+)\]$/)[1]);assert.equal(answerIndex,length-1);assert.notEqual(bad,length-1);for(const choice of q.choices.filter(c=>c!==q.answer)){const replacement=Number(choice.match(/\[(-?\d+)\]$/)?.[1]);assert.ok(replacement!==length-1,`A second correction also meets the final-element requirement: ${choice}`);}
    }
    if(mode==="statement"&&q.familyId==="null-guard"){const expectedLine=q.code.split("\n").findIndex(line=>/\.length|\.substring/.test(line))+1;assert.equal(Number(q.correctLine),expectedLine);}
    if(mode==="test"){
      assert.equal(q.tests.filter(t=>String(t.expected)!==String(t.actual)).length,1);
      assert.equal(q.tests.find(t=>String(t.expected)!==String(t.actual)).label,q.answer);
      for(const t of q.tests){const [expected,actual]=verifyTestCase(q,t);assert.deepEqual(expected,t.expected,`${q.familyId}: independent expected result`);assert.deepEqual(actual,t.actual,`${q.familyId}: independent buggy result`);}
    }
  }
  assert.ok(exactSet.size>0,`${mode}/${difficulty} emitted no questions`);
  assert.ok(families.size>=8,`${mode}/${difficulty} family count ${families.size}`);
  metrics.push({mode,difficulty,tested:1000,exactDuplicates:1000-exactSet.size,exactDuplicatePercent:Number(((1000-exactSet.size)/10).toFixed(1)),structures:structures.size,parameterOnlyQuestions:1000-structures.size,families:families.size,familyCounts,distractorSets:distractors.size,averageComplexity:Number((complexity/1000).toFixed(2)),categoryCounts,answerPositionCounts:Object.fromEntries(answerCounts)});
  assertions+=1000;
}
for(const mode of modes){const values=metrics.filter(x=>x.mode===mode).map(x=>x.averageComplexity);assert.ok(values[0]<values[1]&&values[1]<values[2],`${mode} must have increasing measured complexity: ${values}`);for(const row of metrics.filter(x=>x.mode===mode)){assert.ok(row.exactDuplicatePercent<10,`${mode}/${row.difficulty} exact repeat rate ${row.exactDuplicatePercent}%`);assert.ok(row.structures>=8,`${mode}/${row.difficulty} needs varied normalized code structures`);}}

// Seed reproduction includes the complete student-visible structured payload.
for(const mode of modes)for(const difficulty of levels){const a=D.generateDebugger(mode,{difficulty,seed:89732}),b=D.generateDebugger(mode,{difficulty,seed:89732});assert.deepEqual(a,b);}
// One hundred consecutive challenges per combination: exact question repeats are avoided.
const sessions=[];
for(const mode of modes)for(const difficulty of levels){const session=D.createDebuggerSession({seed:12345,historyLimit:200}),seen=new Set(),shapeSeen=new Set();let maxAttempts=0,structuralRepeatEvents=0;for(let i=0;i<100;i++){const q=session.next({mode,difficulty}),key=exact(q),shape=normalize(q);assert.ok(!seen.has(key),`100-session exact repeat: ${mode}/${difficulty}/${i}`);seen.add(key);if(shapeSeen.has(shape))structuralRepeatEvents++;shapeSeen.add(shape);maxAttempts=Math.max(maxAttempts,q.repeatAvoidanceAttempts);}sessions.push({mode,difficulty,count:100,exactRepeats:0,structuralPatterns:shapeSeen.size,structuralRepeatEvents,maxRegenerations:maxAttempts});}

// Shared tracker integration: one scored submission, annotate mode/difficulty, lock on submit.
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};const tracker=Session.createSessionTracker({storage});const id=tracker.begin("debugger-lab","Debugger Lab","exception.arithmetic-zero","Name the Exception");tracker.annotate(id,{mode:"exception",difficulty:"advanced",skill:"Integer and floating-point division"});assert.equal(tracker.submit(id,true).accepted,true);assert.equal(tracker.submit(id,false).accepted,false);assert.equal(tracker.snapshot().games["debugger-lab"].submissions,1);assert.equal(tracker.snapshot().records[id].details.difficulty,"advanced");

// Compile every family/difficulty representative with the JDK compiler, then run all exception examples.
for(const file of ["procedural-generator.js","debugger-engine.js","debugger-ui.js"])assert.ok(fs.statSync(new URL(file,new URL("./",import.meta.url))).size>100);
const html=fs.readFileSync(new URL("./index.html",import.meta.url),"utf8");assert.match(html,/debugger-ui\.js\?v=debugger-generator-v2/);assert.match(html,/Advanced CS/);
const java=process.env.JAVA_BIN||"java",jvmDir=`/tmp/debugger-jvm-${process.pid}`;fs.mkdirSync(jvmDir,{recursive:true});const manifest=[];const exceptionChecks=[];let jvmSnippets=0;
for(const mode of modes)for(const difficulty of levels)for(const family of D.challengeFamilies[mode]){const seed=(Math.imul(jvmSnippets+13,2246822519)^Math.imul(modes.indexOf(mode)+1,3266489917)^Math.imul(levels.indexOf(difficulty)+4,668265263))>>>0;const q=D.generateDebugger(mode,{difficulty,family,seed});const sourcePath=`${jvmDir}/${jvmSnippets++}.java`;fs.writeFileSync(sourcePath,q.source);manifest.push(`${sourcePath}\t${q.errorCategory!=="compile"}`);if(mode==="exception")exceptionChecks.push({q,sourcePath});}
const manifestPath=`${jvmDir}/manifest.tsv`;fs.writeFileSync(manifestPath,manifest.join("\n"));const compilerOutput=execFileSync(java,[new URL("../compiler-harness.java",import.meta.url).pathname,manifestPath],{encoding:"utf8",timeout:120000});
for(const {q,sourcePath} of exceptionChecks){if(q.errorCategory==="compile")continue;const run=spawnSync(java,["-cp",`${sourcePath}-classes`,"Practice"],{encoding:"utf8",timeout:3000});if(q.errorCategory==="runtime"){const expected=q.answer;assert.notEqual(run.status,0,`${q.familyId} should throw at runtime`);assert.ok(run.stderr.includes(expected),`${q.familyId}: expected ${expected}, received ${run.stderr}`);}else{assert.equal(run.status,0,`${q.familyId} should execute successfully: ${run.stderr}`);assert.equal(run.stdout.trim(),String(q.referenceResult??""),`${q.familyId}: displayed code output must match the modeled result`);}}
const jvm={compilerAvailable:true,compiledSnippets:jvmSnippets,exceptionProgramsRun:exceptionChecks.filter(x=>x.q.errorCategory!=="compile").length,compilerOutput:compilerOutput.trim()};

const {parseHTML}=createRequire(import.meta.url)(process.env.JAVA_DOM_LIBRARY||"linkedom");
const {document,window}=parseHTML(html);Object.defineProperty(window.HTMLSelectElement.prototype,"value",{configurable:true,get(){return this.querySelector("option[selected]")?.value||this.querySelector("option")?.value||"";},set(v){for(const o of this.querySelectorAll("option")){o.removeAttribute("selected");if(o.value===v)o.setAttribute("selected","");}}});
const ctx={document,window,console,crypto:{getRandomValues:a=>{a[0]=2357;return a;}},...D,sessionTracker:()=>tracker,addSessionNavigation:()=>{},roundSummary:()=>"Attempts 1"};
const {runInNewContext}=await import("node:vm");runInNewContext(fs.readFileSync(new URL("./debugger-ui.js",import.meta.url),"utf8").replace(/import[^;]+;/g,"").replace("export function","function"),ctx);
const $=id=>document.getElementById(id);assert.equal($("mode").querySelectorAll("option").length,6);assert.equal($("difficulty").querySelectorAll("option").length,3);
for(const mode of modes){$("mode").value=mode;$("mode").onchange();assert.ok($("stage").textContent.includes(D.formatNames[mode]));assert.ok($("stage").textContent.includes("Beginner"));const answer=$("stage").querySelector("[data-answer]")||$("stage").querySelector("[data-line]");answer.onclick();$("stage").querySelector("#submit").onclick();assert.ok($("feedback").textContent.includes("Correct answer:"));assert.ok($("stage").querySelector("#submit").disabled);assert.ok(!$("stage").querySelector("#next").disabled);}
$("difficulty").value="advanced";$("difficulty").onchange();assert.ok($("stage").textContent.includes("Advanced"));

fs.mkdirSync("/tmp/java-quality",{recursive:true});fs.writeFileSync("/tmp/java-quality/debugger-quality.json",JSON.stringify({total,metrics,sessions,jvm},null,2));
console.log(JSON.stringify({total,metrics,sessions,jvm},null,2));
