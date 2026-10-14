import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as J from './engine.js';
let seed=27519;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const counts={},samples=[];
for(let i=0;i<500;i++) {
 const q=J.generate('debugger-lab'); counts[q.variant]=(counts[q.variant]||0)+1;
 assert.equal(q.prompt,'Find and fix the error.');
 assert.ok(!/faulty line|insertion boundary|Suppress|unrelated|Ignore/.test(q.context+q.fixes.join(' ')));
 assert.equal(q.tokens.map(t=>t.text).join(''),q.code);
 assert.equal(new Set(q.tokens.map(t=>t.id)).size,q.tokens.length);
 const target=q.tokens.find(t=>t.id===q.location);assert.ok(target);
 // Individual symbols, words, and literals; no special whole-line selection that gives away the location.
 assert.ok(target.gap || /^([A-Za-z_$][\w$]*|\d+(\.\d+)?|".*"|'.*'|\S{1,2})$/.test(target.text),q.variant+': '+target.text);
 assert.ok(q.fixes.length>=3);
 for(const t of q.tokens.filter(t=>t.selectable||t.gap)) {
   assert.equal(J.assess(q,{location:t.id,fix:q.fix}),q.locations.includes(t.id));
 }
 for(const fix of q.fixes.filter(f=>f!==q.fix))assert.equal(J.assess(q,{location:q.location,fix}),false);
 assert.ok(J.assess(q,J.solution(q)));
 if(!samples.some(s=>s.variant===q.variant))samples.push({variant:q.variant,context:q.context,code:q.code,fault:target,fixes:q.fixes});
}
assert.equal(Object.keys(counts).length,J.debugTemplates.length);
// Verify each accepted alternate brace removal against the real compiler, at all generated numeric values.
const dir='/tmp/java-debug-quality';fs.mkdirSync(dir,{recursive:true});const manifest=[];
for(const [variant,mode] of J.debugTemplates)for(let n=2;n<=9;n++) {
 const q=J.debugQuestion(mode,variant,n);
 for(const id of new Set(q.locations)) {
   const t=q.tokens.find(t=>t.id===id);
   if(id===q.location)continue;
   const code=q.code.slice(0,t.start)+q.code.slice(t.end);
   const path=`${dir}/${variant}-${n}-${id}.java`;fs.writeFileSync(path,code);manifest.push(path+'\ttrue');
 }
}
fs.writeFileSync(dir+'/manifest.tsv',manifest.join('\n'));
console.log(execFileSync('/usr/lib/jvm/java-17-openjdk-amd64/bin/java',[new URL("./compiler-harness.java",import.meta.url).pathname,dir+'/manifest.tsv'],{encoding:'utf8',timeout:120000}));
fs.writeFileSync(dir+'/samples.json',JSON.stringify(samples,null,2));
console.log(`Debugger quality: 500 randomized challenges cover ${Object.keys(counts).length} templates; token specificity, no boundary controls/leaking titles, repair choices, scoring, and ${manifest.length} alternate brace repairs passed.`);
