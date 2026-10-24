import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {generateCompositionalArray,createArrayHistory,structurePool,modelDescriptors,signatureKey,HISTORY_KEY} from './engine.js';
import {MODEL_NAMES,LEVELS,buildModel} from './models.js';
import {validateCandidate,analyzeDifficulty} from './quality.js';
import {array,read,declare,lit,canonical} from './ir.js';
const stress=process.argv.includes('--stress'),groupArgument=process.argv.find(a=>a.startsWith('--group=')),group=groupArgument?Number(groupArgument.split('=')[1]):null;
assert.ok(group===null||stress&&[0,1,2].includes(group));
const sourceDigest=createHash('sha256').update(fs.readdirSync(new URL('.',import.meta.url)).filter(f=>f.endsWith('.js')).sort().map(f=>f+'\n'+fs.readFileSync(new URL(f,import.meta.url),'utf8')).join('\n')).digest('hex');
const per=stress?10000:100,report={sourceDigest,verifiedAt:new Date().toISOString(),group,perCell:[],mixed:0,switching:0,repeatViolations:0};
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const q1=buildModel('element',0,0,'Beginner',1),q2=buildModel('element',0,0,'Beginner',987);
assert.equal(q1.semanticFingerprint,q2.semanticFingerprint,'numeric data must not bypass semantic history');
const direct={statements:[array('a',[1,2,3]),array('unused',[5,8]),declare('noise',lit(999))],output:read('a',1),objective:'value'};
assert.equal(analyzeDifficulty(direct).minimumBand,'Beginner');assert.equal(canonical(direct),canonical({...direct,statements:direct.statements.slice(0,1)}),'irrelevant statements cannot inflate the signature');
let h=createArrayHistory(storage);for(let i=0;i<55;i++){const q=generateCompositionalArray('element',{difficulty:'Beginner',seed:i,history:h});assert.equal(h.snapshot().length,Math.min(50,i+1));assert.equal(q.difficulty,'Beginner');}
const saved=h.snapshot();h=createArrayHistory(storage);assert.deepEqual(h.snapshot(),saved);assert.ok(memory.get(HISTORY_KEY));
for(const mode of Object.keys(MODEL_NAMES).filter((_,i)=>group===null||i%3===group))for(const difficulty of LEVELS){
 const history=createArrayHistory(null),recent=[],models=new Set(),variants=new Set(),pool=structurePool(mode,difficulty),start=Date.now();
 const ownership=new Map();for(const item of modelDescriptors(pool))ownership.set(item.model,(ownership.get(item.model)||0)+1);assert.ok(ownership.size>=10&&[...ownership.values()].every(n=>n>=6),`${mode}/${difficulty}: every registered model needs six distinct structures`);assert.equal(ownership.size,MODEL_NAMES[mode].length,'all registered instructional models must remain reachable');
 const modelKeySets=[...ownership.keys()].map(m=>modelDescriptors(pool).filter(d=>d.model===m).map(d=>d.key).sort().join(','));const independentModelSets=new Set(modelKeySets).size;assert.ok(independentModelSets>=10,'at least ten model sets must differ structurally');
 for(let i=0;i<per;i++){
   const q=generateCompositionalArray(mode,{difficulty,seed:(i*7919+113)>>>0,history});
   assert.equal(validateCandidate(q).valid,true);assert.equal(q.difficulty,difficulty);assert.ok(!recent.includes(q.repetitionKey),`${mode}/${difficulty}: repeat at ${i}`);
   assert.equal(q.repetitionKey,signatureKey(q.semanticFingerprint));recent.push(q.repetitionKey);if(recent.length>50)recent.shift();models.add(q.reasoningModel);variants.add(q.repetitionKey);
 }
 assert.equal(models.size,MODEL_NAMES[mode].length,'the schedule must exercise all registered models');
 const cell={mode,difficulty,tested:per,poolStructures:pool.length,modelsWithSixVariants:[...ownership.values()].filter(n=>n>=6).length,registeredModels:ownership.size,independentModelSets,observedStructures:variants.size,observedModels:models.size,rolling50Violations:0,milliseconds:Date.now()-start};report.perCell.push(cell);console.log(`${mode}/${difficulty}: ${per} questions, ${variants.size} semantic keys, ${models.size} scheduled models, zero rolling-50 repeats`);
}
for(const kind of ['mixed','switching']){
 if(group!==null&&group!==0)continue;
 let history=createArrayHistory(storage);const recent=history.snapshot().map(e=>e.key),modes=Object.keys(MODEL_NAMES),seen=new Set(),distribution={},count=stress?(kind==='mixed'?20000:10000):240;
 for(let i=0;i<count;i++){if(i%47===0)history=createArrayHistory(storage);const block=Math.floor(i/200)%3,mode=kind==='mixed'?'mixed':block===0?modes[Math.floor(i/20)%modes.length]:block===1?modes[i%modes.length]:i%2===0?'mixed':modes[i%modes.length],difficulty=LEVELS[kind==='mixed'?Math.floor(i/250)%3:block===0?Math.floor(i/20)%3:i%3];const q=generateCompositionalArray(mode,{difficulty,seed:i*37,history});assert.ok(!recent.includes(q.repetitionKey));recent.push(q.repetitionKey);if(recent.length>50)recent.shift();seen.add(q.format);const cell=q.format+'/'+difficulty;distribution[cell]=(distribution[cell]||0)+1;report[kind]++;}
 assert.equal(seen.size,12);report[kind+'Distribution']=distribution;if(stress&&kind==='mixed')assert.equal(Object.keys(distribution).length,36);
}
// A reproducible gallery is a review aid, not a claim of human review.
const gallery=[];if(group===null)for(const mode of Object.keys(MODEL_NAMES))for(const difficulty of LEVELS){const history=createArrayHistory(null);for(let i=0;i<20;i++){const q=generateCompositionalArray(mode,{difficulty,seed:i+10000,history});gallery.push({mode,difficulty,model:q.reasoningModel,variant:q.structuralVariant,seed:q.seed,prompt:q.prompt,code:q.code,answer:q.correctAnswer,choices:q.choices,evidence:q.difficultyEvidence,reviewStatus:'awaiting instructional review'});}}
fs.mkdirSync(new URL('../reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL(`../reports/${stress?group===null?'stress':`stress-part-${group}`:'smoke'}-results.json`,import.meta.url),JSON.stringify(report,null,2));if(group===null)fs.writeFileSync(new URL('../reports/instructional-review-gallery.json',import.meta.url),JSON.stringify(gallery,null,2));
console.log(`Array Lab compositional ${stress?'stress':'smoke'} checks passed${group===null?'; 720 review samples prepared (not a completed human audit)':` (partition ${group})`}.`);
