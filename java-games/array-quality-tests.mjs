import assert from 'node:assert/strict';import fs from 'node:fs';import * as J from './engine.js';
let seed=632;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const seen=new Set(),invalid=new Set(),positions=new Set(),samples=[];
for(let i=0;i<1200;i++) {
 const q=J.generate('array-lab');assert.ok(J.assess(q,J.solution(q)));
 if(q.kind==='value') {
   assert.equal(new Set(q.choices).size,q.choices.length);
   assert.equal(q.choices.filter(x=>x===String(q.answer)).length,1);
   if(q.topic.endsWith('-invalid')) {
    const bad=q.choices.map(Number).filter(x=>x<0||x>=q.initial.length);
    assert.deepEqual(bad,[q.answer]);invalid.add(q.answer<0?'negative':'upper');positions.add(q.choices.indexOf(String(q.answer)));
   }
   if(q.topic.endsWith('-size'))assert.equal(q.answer,q.initial.length);
   if(q.topic.endsWith('-element'))assert.equal(q.answer,q.initial[Number(q.prompt.match(/index (\d+)/)[1])]);
   if(q.topic.endsWith('-search')) {
     const target=Number(q.code.match(/== (\d+)/)[1]);assert.equal(q.answer,q.initial.indexOf(target));
     assert.ok(q.choices.every(x=>Number(x)>=-1&&Number(x)<q.initial.length));
   }
   if(q.topic.endsWith('-sum'))assert.equal(q.answer,q.initial.reduce((a,b)=>a+b,0));
   if(q.topic.endsWith('-minimum'))assert.equal(q.answer,Math.min(...q.initial));
   if(q.topic.endsWith('-maximum'))assert.equal(q.answer,Math.max(...q.initial));
   if(q.topic.endsWith('-count'))assert.equal(q.answer,q.initial.filter(x=>x>=Number(q.code.match(/>= (\d+)/)[1])).length);
 }
 if(q.mode==='collections') {
   let state=[...q.initial];
   // Interpret the displayed operations independently, respecting Java overloads and zero-based indices.
   for(const line of q.code.split('\n').slice(1)) {
     const call=line.match(/\.(add|remove|set)\((.*)\);/);
     if(call) {
       const args=call[2].split(', ').map(x=>/^"/.test(x)?JSON.parse(x):Number(x));
       if(call[1]==='add') args.length===1?state.push(args[0]):state.splice(args[0],0,args[1]);
       if(call[1]==='remove'){assert.ok(args[0]>=0&&args[0]<state.length);state.splice(args[0],1);}
       if(call[1]==='set'){assert.ok(args[0]>=0&&args[0]<state.length);state[args[0]]=args[1];}
     } else {const m=line.match(/\[(\d+)\] = (\d+)/);assert.ok(m);state[Number(m[1])]=Number(m[2]);}
   }
   assert.deepEqual(q.answer,state);
 }
 const key=q.topic;if(!seen.has(key)){seen.add(key);samples.push({topic:q.topic,prompt:q.prompt,code:q.code,choices:q.choices,answer:J.solution(q)});}
}
assert.equal(invalid.size,2);assert.equal(positions.size,4);
fs.mkdirSync('/tmp/java-quality',{recursive:true});
fs.writeFileSync('/tmp/java-quality/array-samples.json',JSON.stringify(samples,null,2));
console.log(`Array quality: 1,200 randomized challenges covering ${seen.size} concepts; independent operation interpretation, numeric scoring, invalid-index variety and shuffled positions passed.`);
