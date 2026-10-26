import {FAMILIES} from './content.js?v=copyright-v1';
import {TOPICS,SOURCES} from './model.js?v=copyright-v1';
export {FAMILIES,TOPICS,SOURCES};
export function validate(q){
 if(!q.id||!TOPICS[q.topic]||!['foundational','applied','nuanced'].includes(q.tier)||![q.scene,q.prompt,q.answer,q.why,q.clarification].every(s=>typeof s==='string'&&s.trim())||q.wrong?.length!==3||q.wrong.some(w=>w.length!==2||w.some(s=>typeof s!=='string'||!s.trim()))||!q.sources?.length||q.sources.some(s=>!SOURCES[s]))throw Error('Invalid reviewed family '+q.id);
 const choices=[q.answer,...q.wrong.map(w=>w[0])];if(new Set(choices).size!==4||q.scene.includes(q.answer)||q.prompt.includes(q.answer))throw Error('Duplicate or disclosed answer '+q.id);
 return {...q,family:q.id,choices,bigIdea:5,learningObjective:'IOC-1.F',mode:'best-action'};
}
export const QUESTIONS=FAMILIES.map(validate);
if(new Set(QUESTIONS.map(q=>q.id)).size!==QUESTIONS.length)throw Error('Duplicate family ID');
export function random(seed){let s=Number(seed)>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(a,rng){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function filterBank(topic='mixed',bank=QUESTIONS){if(topic!=='mixed'&&!TOPICS[topic])throw Error('Unknown topic');const pool=bank.filter(q=>topic==='mixed'||q.topic===topic);if(!pool.length)throw Error('Empty topic pool');return pool;}
// The same 50-item history survives topic changes. Exact avoidance takes priority;
// if a small topic is exhausted, choose the least-recent valid question while
// retaining the last-three-family cooldown whenever the pool permits it.
export function createGenerator({seed=Date.now(),history=[],bank=QUESTIONS}={}){
 const rng=random(seed),byId=new Map(bank.map(q=>[q.id,q])),recent=(Array.isArray(history)?history:[]).filter(id=>typeof id==='string'&&byId.has(id)).slice(-50),counts={};
 for(const id of recent){const t=byId.get(id).topic;counts[t]=(counts[t]||0)+1;}
 return {next(topic='mixed'){
 const pool=filterBank(topic,bank),old=new Set(recent);let candidates=pool.filter(q=>!old.has(q.id)),exactRelaxed=false,familyRelaxed=false;
 if(!candidates.length){exactRelaxed=true;candidates=pool;}
 const fresh=candidates.filter(q=>!recent.slice(-3).includes(q.family));if(fresh.length)candidates=fresh;else familyRelaxed=true;
 if(exactRelaxed){const age=Math.min(...candidates.map(q=>recent.lastIndexOf(q.id)));candidates=candidates.filter(q=>recent.lastIndexOf(q.id)===age);}
 if(topic==='mixed'){const min=Math.min(...candidates.map(q=>counts[q.topic]||0));candidates=candidates.filter(q=>(counts[q.topic]||0)===min);}
 const q=candidates[Math.floor(rng()*candidates.length)];counts[q.topic]=(counts[q.topic]||0)+1;recent.push(q.id);if(recent.length>50)recent.shift();return {...q,choices:shuffle(q.choices,rng),exactRelaxed,familyRelaxed};
 },history:()=>[...recent]};
}
export function feedback(q,selected){if(!q.choices.includes(selected))throw Error('Choose a listed action');const correct=selected===q.answer,misconception=q.wrong.find(w=>w[0]===selected)?.[1];return{correct,text:(correct?'Correct.':'Incorrect. '+misconception)+' Best-supported answer: '+q.answer+'\n'+q.why+'\n'+q.clarification};}
export function topicMetrics(game={}){return Object.entries(TOPICS).map(([id,title])=>{const buckets=Object.entries(game.topics||{}).filter(([key])=>key.startsWith('bi5:copyright:'+id+':'));return{id,title,attempted:buckets.reduce((n,[,m])=>n+m.attempted,0),firstTry:buckets.reduce((n,[,m])=>n+m.firstTry,0)};});}
