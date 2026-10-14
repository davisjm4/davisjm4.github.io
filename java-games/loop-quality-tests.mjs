import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from './engine.js';
let seed=53622;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const samples=[],seen=new Set(),positions=new Set();
for(let i=0;i<1000;i++) {
 const q=J.generate('loop-lab');
 assert.ok(!/before the while|in the for header|remains in scope|declared outside/.test(q.prompt));
 assert.ok(J.assess(q,J.solution(q)));
 if(q.mode==='nested') {
   const outer=Number(q.code.match(/row < (\d+)/)[1]);
   const inner=q.code.match(/col < (row \+ 1|\d+)/)[1];
   const pairs=[];for(let r=0;r<outer;r++)for(let c=0;c<(inner==='row + 1'?r+1:Number(inner));c++)pairs.push(`${r},${c}`);
   assert.deepEqual(q.trace.filter(f=>f.output.startsWith('Print ')).map(f=>f.output.slice(6)),pairs);
   if(q.topic==='nested-total')assert.equal(q.answer,pairs.length);
   if(q.topic==='nested-outer-count')assert.equal(q.answer,outer);
   if(q.kind==='multi')assert.deepEqual(q.answerIds,pairs);
 } else {
   const match=q.code.match(/(i|index|counter) ([<>]=?|!=) (-?\d+)/);assert.ok(match);
   const [,v,op,bound]=match;
   const start=Number(q.code.match(new RegExp(`${v} = (-?\\d+)`))[1]);
   const update=q.code.match(new RegExp(`${v} ([+-])= (\\d+)`));const delta=Number(update[2])*(update[1]==='+'?1:-1);
   const valid=x=>op==='<'?x<Number(bound):op==='<='?x<=Number(bound):op==='>'?x>Number(bound):op==='>='?x>=Number(bound):x!==Number(bound);
   let x=start;const values=[];while(valid(x)){assert.ok(values.length<50);values.push(x);x+=delta;}
   assert.deepEqual(q.trace.filter(f=>f.output.startsWith('Print ')).map(f=>Number(f.output.slice(6))),values);
   assert.equal(q.trace.at(-1).variables[v],x);
   assert.equal(q.trace.at(-1).variables.score,Number(q.code.match(/score = (\d+)/)[1])+Number(q.code.match(/bonus = (\d+)/)[1])*values.length);
   const expected={start,step:Math.abs(delta),last:values.at(-1),count:values.length,after:x,output:values.join(', ')};
   if(q.kind==='value') assert.equal(q.answer,expected[q.topic]);
   if(q.topic==='after')assert.ok(q.code.includes(`int ${v} =`)&&!q.code.includes(`for (int ${v}`));
   if(q.topic==='initialization') {
     assert.equal(q.prompt,'Select the initialization of the loop control variable.');
     const declarations=J.nodes(q.root).filter(n=>['initialization','score-declaration','bonus-declaration'].includes(n.id));
     assert.ok(declarations.length===3);
     if(q.code.includes('while')) positions.add(declarations.findIndex(n=>n.id==='initialization'));
   }
   if(q.topic==='control-variable') {
     assert.ok(q.validIds.length>=3);
     for(const id of q.validIds)assert.ok(J.assess(q,{id}));
     assert.equal(J.assess(q,{id:'score-name'}),false);
   }
 }
 const key=q.mode+'/'+q.topic;if(!seen.has(key)){seen.add(key);samples.push({prompt:q.prompt,code:q.code,choices:q.choices,answer:J.solution(q)});}
}
assert.equal(positions.size,3);
assert.equal(seen.size,17);
fs.mkdirSync('/tmp/java-quality',{recursive:true});
fs.writeFileSync('/tmp/java-quality/loop-samples.json',JSON.stringify(samples,null,2));
console.log(`Loop quality: 1,000 randomized challenges, ${seen.size} modes/concepts; independently parsed conditions, increasing/decreasing steps, inclusive/exclusive bounds, nested output, score trace, scope, and randomized declaration positions passed.`);
