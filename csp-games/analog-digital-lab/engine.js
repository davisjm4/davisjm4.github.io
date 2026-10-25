import {FAMILIES,TOPICS} from './content.js?v=analog-v1';
export {FAMILIES,TOPICS};
export const SKILLS=['analog-digital-representation','sampling','digital-data','data-abstraction'];
export const STEMS=[focus=>`Classify ${focus}.`,focus=>`Which type of representation describes ${focus}?`,focus=>`Focus only on ${focus}. Is it analog or digital?`,focus=>`For ${focus}, choose Analog or Digital.`,focus=>`Decide whether ${focus} is analog or digital.`,focus=>`What classification fits ${focus}?`];
export function classification(model){if(!model||!['continuous','discrete'].includes(model.domain))throw Error('Reject: unspecified representation domain.');return model.domain==='continuous'?'Analog':'Digital';}
export function validateFamily(f){if(!TOPICS[f.topic]||!f.id||!f.distinction||f.variants.length<2)throw Error('Invalid family.');for(const v of f.variants){if(!v.scene||!v.focus||!v.evidence||v.scene.length<40||v.evidence.length<40||v.focus.length<10||v.ambiguous||/^(a|an|the) (thermometer|phone|computer|clock|sensor)$/i.test(v.focus))throw Error('Reject: unclear classification target or evidence.');classification(v.model);}return f;}
FAMILIES.forEach(validateFamily);
export const CASES=FAMILIES.flatMap(f=>f.variants.map((v,i)=>({...v,caseId:`${f.id}:${i}`,family:f.id,topic:f.topic,distinction:f.distinction,answer:classification(v.model)})));
export const QUESTIONS=CASES.flatMap(c=>STEMS.map((stem,i)=>({...c,id:`${c.caseId}:${i}`,prompt:stem(c.focus)})));
function random(seed){let s=Number(seed)>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createGenerator({seed=Date.now(),history=[],bank=QUESTIONS}={}){if(!bank.length)throw Error('Empty question bank.');const rng=random(seed),byId=new Map(bank.map(q=>[q.id,q])),recent=history.map(h=>byId.get(typeof h==='string'?h:h?.id)).filter(Boolean).slice(-50),counts={},families={},topics={};let delivered=0;const answers={Analog:0,Digital:0};return {next(topic='mixed'){
 const pool=topic==='mixed'?bank:bank.filter(q=>q.topic===topic);if(!pool.length)throw Error('Unknown or empty topic.');const ids=new Set(recent.map(q=>q.id));let candidates=pool.filter(q=>!ids.has(q.id)),exactRelaxed=false,cooldownRelaxed=false;
 // Cooldown is considered only after exact exclusion. If exact exclusion exhausts
 // an unusually small injected bank, remove the oldest constraints in a bounded loop.
 if(!candidates.length){exactRelaxed=true;for(let n=recent.length-1;n>=0;n--){const keep=new Set(recent.slice(-n||recent.length).map(q=>q.id));if(n===0){candidates=[...pool];break;}candidates=pool.filter(q=>!keep.has(q.id));if(candidates.length)break;}}
 const cooldown=new Set(recent.slice(-3).map(q=>q.family)),fresh=candidates.filter(q=>!cooldown.has(q.family));if(fresh.length)candidates=fresh;else cooldownRelaxed=true;
 const desired=answers.Analog===answers.Digital?(rng()<.5?'Analog':'Digital'):answers.Analog<answers.Digital?'Analog':'Digital',balanced=candidates.filter(q=>q.answer===desired);if(balanced.length)candidates=balanced;
 // Bonus semantic-case avoidance, where the eligible pool permits it. Stem changes
 // never inflate the reported 120 authored semantic cases.
 const semantic=new Set(recent.map(q=>q.caseId)),newCases=candidates.filter(q=>!semantic.has(q.caseId));if(newCases.length)candidates=newCases;
 const minimum=Math.min(...candidates.map(q=>families[q.family]||0));candidates=candidates.filter(q=>(families[q.family]||0)===minimum);
 const minTopic=Math.min(...candidates.map(q=>topics[q.topic]||0));candidates=candidates.filter(q=>(topics[q.topic]||0)===minTopic);
 const q=candidates[Math.floor(rng()*candidates.length)];counts[q.id]=(counts[q.id]||0)+1;families[q.family]=(families[q.family]||0)+1;topics[q.topic]=(topics[q.topic]||0)+1;answers[q.answer]++;delivered++;recent.push(q);if(recent.length>50)recent.shift();return {...q,cooldownRelaxed,exactRelaxed};},history:()=>recent.map(q=>q.id),metrics:()=>({delivered,answers:{...answers},families:{...families},topics:{...topics}})};}
export function feedback(q,selected){if(!['Analog','Digital'].includes(selected))throw Error('Choose Analog or Digital.');return {correct:selected===q.answer,text:`${selected===q.answer?'Correct':'Incorrect'} — ${q.answer}\n${q.evidence}\n${q.answer==='Analog'?'The specified magnitude varies through intermediate values.':'The specified information uses separate permitted codes, values or states.'}${selected===q.answer?'':" Classify the named representation, not the device's age, electronics, or a different stage in the process."}`};}
