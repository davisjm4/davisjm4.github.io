import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as J from './engine.js';
let seed=91923; Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const dir='/tmp/java-quality'; fs.mkdirSync(dir,{recursive:true});
const manifest=[], seen=new Set(), samples=[];
for(let i=0;i<500;i++) {
  const q=J.generate('variable-lab','assemble');
  const a=q.answer;
  assert.equal(q.prompt,`Store ${q.scenario.purpose}, initially ${a.value}.`);
  assert.ok(!q.prompt.includes(a.name));
  assert.ok(!/Use (int|double|boolean|char|String)|no typing|whole number|decimal value/.test(q.prompt));
  assert.ok(q.scenario.types.includes(a.type));
  assert.equal(q.explanation.includes("int is the intended type"),a.type === "int");
  assert.equal(q.fields.find(f=>f.id==='value').label,'Value');
  for(const f of q.fields) {
    assert.equal(f.choices.length,new Set(f.choices).size);
    assert.equal(f.choices.filter(x=>x===a[f.id]).length,1);
    for(const x of f.choices.filter(x=>x!==a[f.id])) assert.equal(J.assess(q,{...a,[f.id]:x}),false);
  }
  assert.ok(J.assess(q,a));
  if(a.type==='int') assert.ok(/^\d+$/.test(a.value));
  if(a.type==='double') assert.ok(/^\d+\.\d+$/.test(a.value)&&Number(a.value)%1!==0);
  if(a.type==='boolean') assert.ok(['true','false'].includes(a.value));
  if(a.type==='char') assert.ok(/^'[A-D]'$/.test(a.value));
  if(a.type==='String') assert.ok(/^"[A-Za-z ]+"$/.test(a.value));
  const key=a.name+'/'+a.type; if(!seen.has(key)) samples.push({prompt:q.prompt,fields:q.fields,answer:a});seen.add(key);
  const path=`${dir}/assemble-${i}.java`;fs.writeFileSync(path,q.compilerSource);manifest.push(path+'\ttrue');
}
assert.equal(seen.size,12);
for(let i=0;i<100;i++) {const q=J.generate('variable-lab','identify'); assert.ok(J.assess(q,J.solution(q)));}
const conversionAnswers=new Set();const declarationPositions=new Set();
for(let i=0;i<300;i++) {
 const q=J.generate('variable-lab','identify','compatibility');conversionAnswers.add(q.answer);assert.ok(J.assess(q,J.solution(q)));
 const structural=J.generate('variable-lab','identify','declaration');declarationPositions.add(structural.root.children.filter(x=>typeof x!=='string').findIndex(x=>x.id==='declaration'));
 assert.equal(J.nodes(structural.root).filter(x=>x.id.endsWith('declaration')).length,2);
}
assert.equal(conversionAnswers.size,3);assert.equal(declarationPositions.size,2);
const modes=new Set(Array.from({length:100},()=>J.generate('variable-lab').mode));assert.deepEqual([...modes].sort(),['assemble','identify']);
fs.writeFileSync(dir+'/manifest.tsv',manifest.join('\n'));
console.log(execFileSync('/usr/lib/jvm/java-17-openjdk-amd64/bin/java',[new URL("./compiler-harness.java",import.meta.url).pathname,dir+'/manifest.tsv'],{encoding:'utf8',timeout:120000}));
fs.writeFileSync(dir+'/variable-samples.json',JSON.stringify(samples,null,2));
console.log('Variable quality: 500 assembled declarations compiled; all 12 purpose/type combinations, wrong choices, leakage, identification, and mixed mode passed.');
