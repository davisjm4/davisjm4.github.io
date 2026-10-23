import {MODEL_NAMES,LEVELS,buildModel,rng} from './models.js';
import {validateCandidate} from './quality.js';

export const HISTORY_KEY='javaArray.semanticHistory.v1';
export const signatureKey=text=>{let a=2166136261,b=0x9e3779b9;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619)>>>0;b=Math.imul(b^c,2246822519)>>>0;}return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');};
export function createArrayHistory(storage=globalThis.localStorage){
 let entries=[];try{const saved=JSON.parse(storage?.getItem(HISTORY_KEY)||'null');if(saved?.version===1&&Array.isArray(saved.entries))entries=saved.entries.filter(e=>typeof e.key==='string').slice(-50);}catch{}
 return {entries,has(key){return entries.some(e=>e.key===key);},record(q){entries.push({key:q.repetitionKey,mode:q.format,model:q.reasoningModel});if(entries.length>50)entries.shift();try{storage?.setItem(HISTORY_KEY,JSON.stringify({version:1,entries}));}catch{}},snapshot(){return structuredClone(entries);}};
}
const pools=new Map();
export function variantCapacity(mode){return ['access-2d','update-2d'].includes(mode)?144:72;}
export function structurePool(mode,difficulty){
 const key=mode+'/'+difficulty;if(pools.has(key))return pools.get(key);
 const pool=[],seen=new Set();for(let m=0;m<MODEL_NAMES[mode].length;m++)for(let v=0;v<variantCapacity(mode);v++){
   try{const q=buildModel(mode,m,v,difficulty,123),check=validateCandidate(q),key=signatureKey(q.semanticFingerprint);if(!check.valid||seen.has(key))continue;seen.add(key);pool.push({model:m,variant:v,key});}catch{}
 }
 if(pool.length<60)throw Error(`${key}: only ${pool.length} eligible semantic structures; at least 60 are required.`);
 pools.set(key,pool);return pool;
}
export function generateCompositionalArray(mode='mixed',options={}){
 const difficulty=options.difficulty||'Intermediate';if(!LEVELS.includes(difficulty))throw Error('Unknown Array Lab difficulty');
 const seed=(options.seed??Math.floor(Math.random()*4294967296))>>>0,random=rng(seed),history=options.history||createArrayHistory(null),recent=history.snapshot?history.snapshot():[];
 const eligible=mode==='mixed'?Object.keys(MODEL_NAMES):[mode];if(eligible.some(m=>!MODEL_NAMES[m]))throw Error('Unknown Array Lab mode');
 const lastMode=m=>recent.findLastIndex(e=>e.mode===m);const modes=eligible.map(m=>({m,last:lastMode(m),tie:random()})).sort((a,b)=>a.last-b.last||a.tie-b.tie);
 let attempts=0;for(const {m} of modes){
   const descriptors=structurePool(m,difficulty).map(d=>({...d,last:recent.findLastIndex(e=>e.mode===m&&e.model===MODEL_NAMES[m][d.model]),tie:random()})).sort((a,b)=>a.last-b.last||a.tie-b.tie);
   for(const descriptor of descriptors){if(++attempts>1500)break;let q;try{q=buildModel(m,descriptor.model,descriptor.variant,difficulty,(seed+Math.imul(attempts,2654435761))>>>0);}catch{continue;}
     const key=signatureKey(q.semanticFingerprint);if(history.has(key)||!validateCandidate(q).valid)continue;
     q.repetitionKey=key;q.generationSeed=seed;history.record(q);return q;
   }
 }
 throw Error(`Array Lab could not satisfy the semantic 50-question window (${mode}, ${difficulty}, seed ${seed}).`);
}
