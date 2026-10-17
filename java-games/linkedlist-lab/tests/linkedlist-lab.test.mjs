import assert from "node:assert/strict";
import { generate, makeRng, assess, MODES } from "../engine.js";
const rng=makeRng(20261017);
let checks=0; const seen=new Set();
for(let i=0;i<5000;i++){
  const q=generate("mixed",rng); checks++; seen.add(q.mode);
  assert.ok(q.prompt && q.explanation);
  assert.equal(assess(q,q.kind==="links"?q.answer:q.answer),true);
  if(q.choices){ assert.ok(q.choices.length>=3); assert.equal(new Set(q.choices.map(String)).size,q.choices.length); assert.equal(q.choices.filter((_,j)=>j===q.answer).length,1); }
  if(q.kind==="links"){ assert.equal(q.nodes.length>=3,true); assert.equal(Object.keys(q.answer.next).length,q.nodes.length); }
}
assert.deepEqual([...seen].sort(),["collections","link","mutate","trace"]);
console.log("LinkedList Lab: "+checks+" generated challenges passed across "+seen.size+" modes.");
