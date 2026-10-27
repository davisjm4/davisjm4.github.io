import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {generateChallenge, assessLoop, distractorFor} from '../loop-engine.js';
import {run} from '../engine/java-model.js';

const generate=(seed,family='zero-while',difficulty='beginner',mode='while')=>generateChallenge({mode,difficulty,seed,family});
const exact=generate(518);
assert.equal(exact.code,'int n = 93;\nwhile (n < 0) {\n    n--;\n}');
assert.equal(exact.prompt,'What is the final value of n?');
assert.equal(exact.answer,'93');
assert.deepEqual(exact.choices,['94','92','0','93']);
const wrong=distractorFor(exact,'0');
assert.equal(wrong.misconception,'zero-while-boundary');
for(const phrase of ['while condition','before the body','false on the first check','zero times','initial value','boundary'])assert.ok(wrong.note.includes(phrase),phrase);
assert.doesNotMatch(wrong.note,/\bif\b/i);
assert.equal(assessLoop(exact,{answer:'0'}),false);
assert.equal(assessLoop(exact,{answer:'93'}),true);
assert.equal(exact.trace.totalChecks,1);
assert.equal(exact.trace.rows[0].result,false);
const initialValues=new Set(), oracle=[];
for(const difficulty of ['beginner','intermediate'])for(let seed=0;seed<100;seed++) {
  const q=generate(seed,'zero-while',difficulty), note=distractorFor(q,'0');
  assert.equal(note.misconception,'zero-while-boundary');
  assert.match(note.note,/while condition/);assert.doesNotMatch(note.note,/\bif\b/i);
  assert.equal(q.trace.totalChecks,1);assert.equal(q.trace.rows[0].result,false);
  assert.equal(assessLoop(q,{answer:'0'}),false);assert.equal(assessLoop(q,{answer:q.answer}),true);
  const res=run(q.javaProgram), variable=q.trace.columns[0];
  assert.equal(String(res.vars[variable].v),q.answer);
  initialValues.add(q.answer);if(oracle.length<5 && !oracle.some(x=>x.answer===q.answer))oracle.push(q);
}
assert.ok(initialValues.size>30);
let realIf=null;
for(let seed=0;seed<500 && !realIf;seed++) {
  const q=generate(seed,'count-even','beginner','final');
  if(q.distractors.some(d=>d.misconception==='ignore-condition'))realIf=q;
}
assert.ok(realIf,'real if-condition control found');
assert.match(realIf.code,/\bif\s*\(/);
assert.match(realIf.distractors.find(d=>d.misconception==='ignore-condition').note,/if condition/);
for(const family of ['integer-half','increment-sentinel','decrement'])for(let seed=0;seed<20;seed++) {
  const q=generate(seed,family);assert.equal(assessLoop(q,{answer:q.answer}),true);
  assert.ok(q.distractors.every(d=>d.choice!==q.answer && d.note));
}

// Independent real-Java execution for the classroom case and several other
// initial values; source mode invokes the JDK compiler available to the JVM.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'loop-package-c-')), manifest=[];
for(const [i,q] of [exact,...oracle].entries()) {
  const file=path.join(dir,`${i}.java`), variable=q.trace.columns[0];
  fs.writeFileSync(file,`public class Practice { public static void main(String[] args) { ${q.code}\nSystem.out.println(${variable}); } }`);
  manifest.push(`${file}\ttrue`);
}
fs.writeFileSync(path.join(dir,'manifest.tsv'),manifest.join('\n'));
const java=process.env.JAVA_BIN||'java';
const output=execFileSync(java,[new URL('../../compiler-harness.java',import.meta.url).pathname,path.join(dir,'manifest.tsv')],{encoding:'utf8',timeout:120000});
for(const [i,q] of [exact,...oracle].entries()) {
  const result=execFileSync(java,['-cp',path.join(dir,`${i}.java-classes`),'Practice'],{encoding:'utf8'}).trim();
  assert.equal(result,q.answer);
}
const evidence={seed:518,code:exact.code,answer:exact.answer,choices:exact.choices,wrong,initialValues:initialValues.size,zeroWhileChallenges:200,relatedWhileChallenges:60,realIfControl:{seed:realIf.seed,code:realIf.code,note:realIf.distractors.find(d=>d.misconception==='ignore-condition').note},compiler:output.trim(),jvmExamples:1+oracle.length};
if(process.env.PACKAGE_C_EVIDENCE_DIR){fs.mkdirSync(process.env.PACKAGE_C_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.PACKAGE_C_EVIDENCE_DIR,'loop-feedback.json'),JSON.stringify(evidence,null,2));}
console.log(`Loop feedback: classroom seed 518, 200 zero-while challenges, ${initialValues.size} initial values, 60 related while challenges, real-if control, ${output.trim()} JVM outputs matched.`);
