import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { generateTrace, validateTraceDifficulty, TRACE_FAMILIES, TRACE_FAMILY_DIFFICULTIES } from "./trace-engine.js";

const levels = ["beginner", "intermediate", "advanced"];
const distributions = {difficulty:{},family:{},format:{},type:{},variables:{},statements:{},relevantChanges:{},concepts:{},dependencyDepth:{},operations:{},misconceptions:{}};
const bump=(bucket,key)=>bucket[key]=(bucket[key]||0)+1;
for(let i=0;i<15000;i++){
  const difficulty=levels[i%3],q=generateTrace({difficulty,seed:i+1}),m=q.complexity;
  assert.equal(q.validatedDifficulty,difficulty);
  assert.ok(validateTraceDifficulty(q,difficulty));
  assert.equal(new Set(q.choices).size,q.choices.length);
  assert.equal(q.choices.filter(x=>x===q.answer).length,1);
  assert.ok(q.choices.length>=2&&q.choices.length<=4);
  if(q.resultType==="boolean")assert.equal(q.choices.length,2);
  if(difficulty==="advanced"&&q.resultType!=="boolean")assert.equal(q.choices.length,4);
  assert.ok(q.distractors.every(d=>d.value!==q.answer&&d.misconceptionId&&d.explanation));
  assert.ok(!/\/ 0|% 0/.test(q.rawCode));
  assert.ok(q.traceRows.every((step)=>step.statement&&step.explanation));
  if(q.format==="checkpoint"){
    assert.match(q.prompt,/immediately after line \d+/);
    assert.equal(q.checkpointLine,Number(q.prompt.match(/line (\d+)/)[1]));
  }
  if(difficulty==="beginner"){
    assert.equal(m.variables,1);
    assert.ok(m.executableStatements>=2&&m.executableStatements<=4);
    assert.ok(m.relevantStateChanges<=2);
  } else if(difficulty==="intermediate"){
    assert.ok(m.variables<=2);
    assert.ok(m.executableStatements>=3&&m.executableStatements<=6);
    assert.ok(m.operationCount>=3);
    assert.ok(m.relevantStateChanges>=1&&m.relevantStateChanges<=4);
  } else {
    assert.ok(m.variables>=2,"Advanced must involve at least two relevant variables");
    assert.ok(m.executableStatements>=5&&m.executableStatements<=8);
    assert.ok(m.relevantStateChanges>=3,"Advanced needs three relevant state changes");
    assert.ok(m.interactingConcepts>=2,"Advanced needs multiple concepts");
    assert.ok(m.dependencyDepth>=2,"Advanced answer needs chained state dependencies");
    assert.ok(m.operationCount>=7);
    assert.notEqual(q.traceFamily,"outputExpression");
    assert.ok(m.relevantLines.filter(n=>q.traceRows[n-1]&&q.traceRows[n-1].statement).length>=4);
  }
  const replay=generateTrace({difficulty,seed:q.seed});
  assert.equal(replay.rawCode,q.rawCode);assert.equal(replay.answer,q.answer);assert.deepEqual(replay.distractors,q.distractors);
  bump(distributions.difficulty,difficulty);bump(distributions.family,q.traceFamily);bump(distributions.format,q.format);
  for(const t of new Set(Object.values(q.types)))bump(distributions.type,t);
  for(const [bucket,key] of [[distributions.variables,m.variables],[distributions.statements,m.executableStatements],[distributions.relevantChanges,m.relevantStateChanges],[distributions.concepts,m.interactingConcepts],[distributions.dependencyDepth,m.dependencyDepth],[distributions.operations,m.operationCount]])bump(bucket,key);
  for(const d of q.distractors)bump(distributions.misconceptions,d.misconceptionId.replace(/-line-\d+$/,""));
}
assert.deepEqual(distributions.difficulty,{beginner:5000,intermediate:5000,advanced:5000});
for(const type of ["int","double","boolean","String","char"])assert.ok(distributions.type[type]>0,`${type} represented`);
for(const f of Object.keys(TRACE_FAMILIES))assert.ok(distributions.family[f]>0,`${f} represented`);
for(const [family,allowed] of Object.entries(TRACE_FAMILY_DIFFICULTIES))for(const difficulty of allowed){const q=generateTrace({difficulty,family,seed:12345});assert.equal(q.traceFamily,family);assert.ok(validateTraceDifficulty(q,difficulty));}

let precedence;
for(let seed=1;seed<20000&&!precedence;seed++){
  const q=generateTrace({difficulty:"intermediate",family:"precedence",format:"print",seed});
  if(q.rawCode.includes(" = 2;")&&q.rawCode.includes("+ 4 * 4"))precedence=q;
}
assert.ok(precedence,"found precedence reproduction");
assert.equal(precedence.answer,"18");
assert.deepEqual(new Set(precedence.distractors.map(d=>d.value)),new Set(["24","16","10"]));
assert.deepEqual(new Set(precedence.distractors.map(d=>d.misconceptionId)),new Set(["precedence-add-first","precedence-ignore-base","precedence-add-operands"]));

const samples=[];let forcedSeed=70000;
for(const [family,allowed] of Object.entries(TRACE_FAMILY_DIFFICULTIES))for(const difficulty of allowed)samples.push(generateTrace({difficulty,family,seed:forcedSeed++}));
while(samples.length<1000){const i=samples.length;samples.push(generateTrace({difficulty:levels[i%3],seed:80000+i}));}
assert.deepEqual([...new Set(samples.map(q=>q.traceFamily))].sort(),Object.keys(TRACE_FAMILIES).sort());
assert.deepEqual([...new Set(samples.flatMap(q=>Object.values(q.types)))].sort(),["String","boolean","char","double","int"]);
assert.deepEqual([...new Set(samples.map(q=>q.format))].sort(),["checkpoint","final","print"]);
const methods=[];
for(let i=0;i<samples.length;i++){
  const q=samples[i],lines=q.rawCode.split("\n"),body=[];
  for(let li=0;li<lines.length;li++){
    const line=lines[li],print=line.match(/^System\.out\.println\((.*)\);$/);
    body.push(print?`System.out.println("__OUT_${i}__" + String.valueOf(${print[1]}));`:line);
    for(const name of Object.keys(q.traceRows[li].variables))body.push(`System.out.println("__TRACE_${i}_${li+1}_${name}__" + String.valueOf(${name}));`);
  }
  methods.push(`static void q${i}(){${body.join("\n")}}`);
}
const javaSource=`public class TraceDeepVerify {${methods.join("\n")} public static void main(String[] args){${samples.map((_,i)=>`q${i}();`).join("\n")}}}`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"trace-variable-verify-")),src=path.join(dir,"TraceDeepVerify.java");fs.writeFileSync(src,javaSource);
execFileSync("javac",[src],{timeout:120000,maxBuffer:10_000_000});
const raw=execFileSync("java",["-cp",dir,"TraceDeepVerify"],{encoding:"utf8",timeout:120000,maxBuffer:30_000_000}),actual=new Map();
for(const line of raw.split(/\r?\n/)){const m=line.match(/^__(OUT_\d+|TRACE_\d+_\d+_[A-Za-z_$][\w$]*)__([\s\S]*)$/);if(m)actual.set(m[1],m[2]);}
const fmt=(v,t)=>t==="boolean"?String(v):t==="double"?(Number.isInteger(Number(v))?Number(v).toFixed(1):String(Number(v))):String(v);
for(let i=0;i<samples.length;i++){
  const q=samples[i];
  for(const row of q.traceRows)for(const [name,v] of Object.entries(row.variables))assert.equal(actual.get(`TRACE_${i}_${row.line}_${name}`),fmt(v,q.types[name]),`trace mismatch sample ${i}, line ${row.line}, ${name}`);
  const outputRows=q.traceRows.filter(r=>r.output!==null);if(outputRows.length)assert.equal(actual.get(`OUT_${i}`),outputRows.at(-1).output,`output mismatch ${i}`);
  const answer=q.format==="print"?actual.get(`OUT_${i}`):actual.get(`TRACE_${i}_${q.checkpointLine}_${q.resultVariable}`);assert.equal(answer,q.answer,`answer mismatch ${i}`);
}
console.log(JSON.stringify({generated:15000,jvmVerified:1000,distributions,precedence:{code:precedence.rawCode,answer:precedence.answer,distractors:precedence.distractors}},null,2));
console.log("Trace difficulty, distractor, dependency, and JVM verification passed.");
