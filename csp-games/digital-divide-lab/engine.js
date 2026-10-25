import {FAMILIES as TEXT_FAMILIES}from './content.js?v=divide-v1';
import {DATA_FAMILIES}from './data.js?v=divide-v1';
import {MODES,TOPICS,BARRIERS,CONTEXTS,SOLUTIONS}from './model.js?v=divide-v1';
export {MODES,TOPICS,BARRIERS,CONTEXTS,SOLUTIONS};
export const FAMILIES=[...TEXT_FAMILIES,...DATA_FAMILIES];
export function validate(q){
 if(!q.id||!q.family||!MODES[q.mode]||!TOPICS[q.topic]||!BARRIERS[q.barrier]||!CONTEXTS[q.context]||!q.scene||!q.prompt||!q.why||!q.contrast||q.learningObjective!=='IOC-1.C'||q.choices?.length!==4||new Set(q.choices).size!==4||!q.choices.includes(q.answer))throw Error('Invalid reviewed question '+q.id);
 if(q.solution&&!SOLUTIONS[q.solution])throw Error('Unknown intervention '+q.id);
 if(q.scene.includes(q.answer)||q.prompt.includes(q.answer))throw Error('Answer disclosed in prompt '+q.id);
 if(q.mode==='evidence'){const d=q.evidence;if(!d||!d.caption.startsWith('Fictional instructional dataset')||!d.numeric||d.headers.length<2||!d.rows.length||d.rows.some(r=>r.length!==d.headers.length))throw Error('Invalid fictional dataset '+q.id);if(d.chart){const c=d.chart;if(c.max!==100||c.unit!=='%'||c.labels.length!==c.values.length||c.values.some(n=>!Number.isFinite(n)||n<0||n>100))throw Error('Invalid chart scale '+q.id);}}
 return q;
}
export const QUESTIONS=FAMILIES.flatMap(f=>Array.from({length:5},(_,variant)=>{
 const built=f.build?f.build(variant):{scene:f.scene+' '+f.details[variant],prompt:f.prompt,answer:f.answer,wrong:f.wrong,why:f.why,contrast:f.contrast};
 return validate({...built,id:f.id+':'+variant,family:f.id,variant,mode:f.mode,topic:f.topic,barrier:f.barrier,concept:f.barrier,context:f.context,solution:f.solution,bigIdea:5,learningObjective:'IOC-1.C',supportingObjectives:f.mode==='evidence'?['DAT-2.A','DAT-2.D']:['IOC-1.A'],choices:[built.answer,...built.wrong]});
}));
export function signature(q){return JSON.stringify([q.scene,q.prompt,q.evidence?.headers||[],q.evidence?.rows||[]]);}
export function random(seed){let s=Number(seed)>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const shuffle=(a,rng)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function filterBank(bank,mode='mixed',topic='mixed'){if(mode!=='mixed'&&!MODES[mode]||topic!=='mixed'&&!TOPICS[topic])throw Error('Unknown practice filter');const pool=bank.filter(q=>(mode==='mixed'||q.mode===mode)&&(topic==='mixed'||q.topic===topic));if(!pool.length)throw Error('No challenges in the selected combination');return pool;}
export function createGenerator({seed=Date.now(),history=[],bank=QUESTIONS}={}){if(!bank.length)throw Error('Empty bank');const rng=random(seed),byId=new Map(bank.map(q=>[q.id,q])),recent=history.map(h=>byId.get(typeof h==='string'?h:h?.id)).filter(Boolean).slice(-50),modes={},topics={},families={},concepts={};return {next(mode='mixed',topic='mixed'){
 const pool=filterBank(bank,mode,topic);let candidates=pool.filter(q=>!recent.some(r=>r.id===q.id)),exactRelaxed=false,familyRelaxed=false,conceptRelaxed=false;if(!candidates.length){exactRelaxed=true;for(let n=recent.length-1;n>=0;n--){const tail=n?recent.slice(-n):[];candidates=pool.filter(q=>!tail.some(r=>r.id===q.id));if(candidates.length)break;}}
 const fresh=candidates.filter(q=>!recent.slice(-3).some(r=>r.family===q.family));if(fresh.length)candidates=fresh;else familyRelaxed=true;const newConcepts=candidates.filter(q=>!recent.slice(-2).some(r=>r.concept===q.concept));if(newConcepts.length)candidates=newConcepts;else{conceptRelaxed=true;const notLast=candidates.filter(q=>q.concept!==recent.at(-1)?.concept);if(notLast.length)candidates=notLast;}
 const narrow=(key,counts)=>{const keys=[...new Set(candidates.map(q=>q[key]))],minimum=Math.min(...keys.map(k=>counts[k]||0)),weights=keys.map(k=>1/(1+(counts[k]||0)-minimum));let ticket=rng()*weights.reduce((a,b)=>a+b,0),chosen=keys.at(-1);for(let i=0;i<keys.length;i++){ticket-=weights[i];if(ticket<0){chosen=keys[i];break;}}candidates=candidates.filter(q=>q[key]===chosen);};narrow('mode',modes);narrow('topic',topics);narrow('concept',concepts);narrow('family',families);const q=candidates[Math.floor(rng()*candidates.length)];modes[q.mode]=(modes[q.mode]||0)+1;topics[q.topic]=(topics[q.topic]||0)+1;concepts[q.concept]=(concepts[q.concept]||0)+1;families[q.family]=(families[q.family]||0)+1;recent.push(q);if(recent.length>50)recent.shift();return {...q,choices:shuffle(q.choices,rng),exactRelaxed,familyRelaxed,conceptRelaxed};},history:()=>recent.map(q=>q.id),metrics:()=>({modes:{...modes},topics:{...topics},families:{...families},concepts:{...concepts}})};}

export function feedback(q,selected){if(!q.choices.includes(selected))throw Error('Choose one of the four listed answers.');const correct=selected===q.answer;return {correct,text:(correct?'Correct':'Incorrect')+' — '+q.answer+'\n'+q.why+'\n'+q.contrast};}
