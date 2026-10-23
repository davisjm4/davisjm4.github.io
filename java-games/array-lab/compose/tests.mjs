import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateCompositionalArray,createArrayHistory,structurePool,signatureKey,HISTORY_KEY} from './engine.js';
import {MODEL_NAMES,LEVELS,buildModel} from './models.js';
import {validateCandidate,analyzeDifficulty} from './quality.js';
import {array,read,declare,lit,canonical} from './ir.js';
const stress=process.argv.includes('--stress'),per=stress?10000:100,report={perCell:[],mixed:0,switching:0,repeatViolations:0};
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const q1=buildModel('element',0,0,'Beginner',1),q2=buildModel('element',0,0,'Beginner',987);
assert.equal(q1.semanticFingerprint,q2.semanticFingerprint,'numeric data must not bypass semantic history');
const direct={statements:[array('a',[1,2,3]),array('unused',[5,8]),declare('noise',lit(999))],output:read('a',1),objective:'value'};
assert.equal(analyzeDifficulty(direct).minimumBand,'Beginner');assert.equal(canonical(direct),canonical({...direct,statements:direct.statements.slice(0,1)}),'irrelevant statements cannot inflate the signature');
let h=createArrayHistory(storage);for(let i=0;i<55;i++){const q=generateCompositionalArray('element',{difficulty:'Beginner',seed:i,history:h});assert.equal(h.snapshot().length,Math.min(50,i+1));assert.equal(q.difficulty,'Beginner');}
const saved=h.snapshot();h=createArrayHistory(storage);assert.deepEqual(h.snapshot(),saved);assert.ok(memory.get(HISTORY_KEY));
for(const mode of Object.keys(MODEL_NAMES))for(const difficulty of LEVELS){
 const history=createArrayHistory(null),recent=[],models=new Set(),variants=new Set(),pool=structurePool(mode,difficulty),start=Date.now();
 const ownership=new Map();for(const item of pool)ownership.set(item.model,(ownership.get(item.model)||0)+1);assert.ok([...ownership.values()].filter(n=>n>=6).length>=10,`${mode}/${difficulty}: at least ten independently represented models need six structures each`);
 for(let i=0;i<per;i++){
   const q=generateCompositionalArray(mode,{difficulty,seed:(i*7919+113)>>>0,history});
   assert.equal(validateCandidate(q).valid,true);assert.equal(q.difficulty,difficulty);assert.ok(!recent.includes(q.repetitionKey),`${mode}/${difficulty}: repeat at ${i}`);
   assert.equal(q.repetitionKey,signatureKey(q.semanticFingerprint));recent.push(q.repetitionKey);if(recent.length>50)recent.shift();models.add(q.reasoningModel);variants.add(q.repetitionKey);
 }
 const cell={mode,difficulty,tested:per,poolStructures:pool.length,observedStructures:variants.size,observedModels:models.size,rolling50Violations:0,milliseconds:Date.now()-start};report.perCell.push(cell);console.log(`${mode}/${difficulty}: ${per} questions, ${variants.size} semantic keys, ${models.size} scheduled models, zero rolling-50 repeats`);
}
for(const kind of ['mixed','switching']){
 let history=createArrayHistory(storage);const recent=history.snapshot().map(e=>e.key),modes=Object.keys(MODEL_NAMES),seen=new Set(),count=stress?(kind==='mixed'?20000:10000):240;
 for(let i=0;i<count;i++){if(i%47===0)history=createArrayHistory(storage);const mode=kind==='mixed'?'mixed':i%4===0?'mixed':modes[i%modes.length],difficulty=LEVELS[i%3];const q=generateCompositionalArray(mode,{difficulty,seed:i*37,history});assert.ok(!recent.includes(q.repetitionKey));recent.push(q.repetitionKey);if(recent.length>50)recent.shift();seen.add(q.format);report[kind]++;}
 assert.equal(seen.size,12);
}
// A reproducible gallery is a review aid, not a claim of human review.
const gallery=[];for(const mode of Object.keys(MODEL_NAMES))for(const difficulty of LEVELS){const history=createArrayHistory(null);for(let i=0;i<20;i++){const q=generateCompositionalArray(mode,{difficulty,seed:i+10000,history});gallery.push({mode,difficulty,model:q.reasoningModel,variant:q.structuralVariant,seed:q.seed,prompt:q.prompt,code:q.code,answer:q.correctAnswer,choices:q.choices,evidence:q.difficultyEvidence,reviewStatus:'awaiting instructional review'});}}
fs.mkdirSync(new URL('../reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL(`../reports/${stress?'stress':'smoke'}-results.json`,import.meta.url),JSON.stringify(report,null,2));fs.writeFileSync(new URL('../reports/instructional-review-gallery.json',import.meta.url),JSON.stringify(gallery,null,2));
console.log(`Array Lab compositional ${stress?'stress':'smoke'} checks passed; 720 review samples prepared (not a completed human audit).`);
