import {MODEL_NAMES,LEVELS,buildModel,rng} from './models.js';
import {validateCandidate} from './quality.js';

export const HISTORY_KEY='javaArray.semanticHistory.v1';
export const signatureKey=text=>{let a=2166136261,b=0x9e3779b9;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619)>>>0;b=Math.imul(b^c,2246822519)>>>0;}return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');};
export function createArrayHistory(storage=globalThis.localStorage){
 let entries=[];try{const saved=JSON.parse(storage?.getItem(HISTORY_KEY)||'null');if(saved?.version===1&&Array.isArray(saved.entries))entries=saved.entries.filter(e=>typeof e.key==='string').slice(-50);}catch{}
 const counts=new Map();for(const entry of entries)counts.set(entry.key,(counts.get(entry.key)||0)+1);
 return {entries,has(key){return counts.has(key);},record(q){entries.push({key:q.repetitionKey,mode:q.format,model:q.reasoningModel});counts.set(q.repetitionKey,(counts.get(q.repetitionKey)||0)+1);if(entries.length>50){const old=entries.shift(),n=counts.get(old.key)-1;if(n)counts.set(old.key,n);else counts.delete(old.key);}try{storage?.setItem(HISTORY_KEY,JSON.stringify({version:1,entries}));}catch{}},snapshot(){return structuredClone(entries);}};
}
const pools=new Map();
const groupedPools=new WeakMap();
export function variantCapacity(mode){return ['access-2d','update-2d'].includes(mode)?144:72;}
export function structurePool(mode,difficulty){
 const key=mode+'/'+difficulty;if(pools.has(key))return pools.get(key);
 const pool=[],seen=new Map();for(let m=0;m<MODEL_NAMES[mode].length;m++)for(let v=0;v<variantCapacity(mode);v++){
   for(let trial=0;trial<24;trial++){
     const certificationSeed=(123+Math.imul(trial,2654435761))>>>0;
     try{const q=buildModel(mode,m,v,difficulty,certificationSeed),check=validateCandidate(q),key=signatureKey(q.semanticFingerprint);if(!check.valid)continue;
       const descriptor={model:m,variant:v,certificationSeed},existing=seen.get(key);
       if(existing){if(!existing.alternatives.some(d=>d.model===m))existing.alternatives.push(descriptor);break;}
       const item={...descriptor,key,alternatives:[descriptor]};seen.set(key,item);pool.push(item);break;
     }catch{}
   }
 }
 if(pool.length<60)throw Error(`${key}: only ${pool.length} eligible semantic structures; at least 60 are required.`);
 pools.set(key,pool);return pool;
}
// An edge-case model can share a structure with another model. Both remain
// reachable, while the shared key occupies only one place in the cooldown.
export const modelDescriptors=pool=>pool.flatMap(item=>item.alternatives.map(d=>({...d,key:item.key})));
function modelGroups(pool){if(groupedPools.has(pool))return groupedPools.get(pool);const grouped=new Map();for(const descriptor of modelDescriptors(pool)){if(!grouped.has(descriptor.model))grouped.set(descriptor.model,[]);grouped.get(descriptor.model).push(descriptor);}groupedPools.set(pool,grouped);return grouped;}
export function generateCompositionalArray(mode='mixed',options={}){
 const difficulty=options.difficulty||'Intermediate';if(!LEVELS.includes(difficulty))throw Error('Unknown Array Lab difficulty');
 const seed=(options.seed??Math.floor(Math.random()*4294967296))>>>0,random=rng(seed),history=options.history||createArrayHistory(null),recent=history.snapshot?history.snapshot():[];
 const eligible=mode==='mixed'?Object.keys(MODEL_NAMES):[mode];if(eligible.some(m=>!MODEL_NAMES[m]))throw Error('Unknown Array Lab mode');
 const lastMode=m=>recent.findLastIndex(e=>e.mode===m);const modes=eligible.map(m=>({m,last:lastMode(m),tie:random()})).sort((a,b)=>a.last-b.last||a.tie-b.tie);
 let attempts=0;for(const {m} of modes){
   const grouped=modelGroups(structurePool(m,difficulty));
   const modelOrder=[...grouped.keys()].map(model=>({model,last:recent.findLastIndex(e=>e.mode===m&&e.model===MODEL_NAMES[m][model]),tie:random()})).sort((a,b)=>a.last-b.last||a.tie-b.tie);
   for(const {model} of modelOrder){const descriptors=grouped.get(model),start=Math.floor(random()*descriptors.length);
   for(let offset=0;offset<descriptors.length;offset++){const descriptor=descriptors[(start+offset)%descriptors.length];if(history.has(descriptor.key))continue;
     for(let trial=0;trial<8;trial++){if(++attempts>1500)break;let q;try{q=buildModel(m,descriptor.model,descriptor.variant,difficulty,(seed+Math.imul(attempts,2654435761))>>>0);}catch{continue;}
       const key=signatureKey(q.semanticFingerprint);if(history.has(key)||!validateCandidate(q).valid)continue;
       q.repetitionKey=key;q.generationSeed=seed;history.record(q);return q;
     }
   }}
 }
 throw Error(`Array Lab could not satisfy the semantic 50-question window (${mode}, ${difficulty}, seed ${seed}).`);
}
