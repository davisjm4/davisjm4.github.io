import assert from 'node:assert/strict';
import {families,TOPICS,createSampler,buildChallenge} from './engine.js';
let rounds=0;const covered=new Set(),results=[];
function run(s,filters,count,pool=families){const recent=s.familyHistory(),exact=s.history(),counts=new Map();
 for(let i=0;i<count;i++){const f=typeof filters==='function'?filters(i):filters,eligible=pool.filter(x=>(f.mode==='mixed'||x.mode===f.mode)&&(f.topic==='all'||x.topic===f.topic));const n=new Set(eligible.map(x=>x.id)).size,w=Math.min(3,n-1),q=(()=>{try{return s.next(f);}catch(e){throw Error(JSON.stringify({f,i,recent})+' '+e.message);}})();
 assert.ok(!recent.slice(-w||recent.length).includes(q.familyId)||w===0,'family cooldown '+JSON.stringify(f));assert.ok(!exact.includes(q.repeatSignature),'exact 50 repeat');
 recent.push(q.familyId);while(recent.length>3)recent.shift();exact.push(q.repeatSignature);while(exact.length>50)exact.shift();covered.add(q.familyId);counts.set(q.familyId,(counts.get(q.familyId)||0)+1);rounds++;
 }return counts;}
for(const mode of ['mixed','missing','identify'])for(const topic of ['all',...Object.keys(TOPICS)]){const counts=run(createSampler(1234),{mode,topic},500);const eligible=families.filter(f=>(mode==='mixed'||f.mode===mode)&&(topic==='all'||f.topic===topic));assert.equal(counts.size,eligible.length,'every family accessible');const values=[...counts.values()];for(const m of ['missing','identify'])for(const t of Object.keys(TOPICS)){const v=eligible.filter(f=>f.mode===m&&f.topic===t).map(f=>counts.get(f.id));if(v.length)assert.ok(Math.max(...v)/Math.min(...v)<3,'balanced within mode/topic '+m+'/'+t);}results.push({mode,topic,min:Math.min(...values),max:Math.max(...values)});}
run(createSampler(77),i=>({mode:['mixed','missing','identify'][i%3],topic:i%4?'all':Object.keys(TOPICS)[i%7]}),1000);
for(let size=1;size<=3;size++){const pool=families.filter(f=>f.scenario==='greeting').slice(0,size);run(createSampler(45,{familyPool:pool}),{mode:'mixed',topic:'all'},300,pool);}
const original=createSampler(15);run(original,{mode:'mixed',topic:'all'},12);const resumed=createSampler(88,{history:original.history()});assert.deepEqual(resumed.familyHistory(),original.familyHistory());run(resumed,{mode:'mixed',topic:'all'},100);
const shared=buildChallenge('identify-header-parameter',0,29);resumed.remember(shared);assert.equal(resumed.familyHistory().at(-1),shared.familyId);run(resumed,{mode:'identify',topic:'parameters'},100);
assert.equal(covered.size,families.length);console.log(JSON.stringify({rounds,families:covered.size,violations:0,results},null,2));
