import {CASES} from './cases.js?v=ethics-v1';
import {MODES,TOPICS,CONCEPTS,DOMAINS,DETAILS} from './model.js?v=ethics-v1';
export {MODES,TOPICS,CONCEPTS,DOMAINS};
export const FAMILIES=CASES;
export const SOURCES=['https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf','https://www.nist.gov/itl/ai-risk-management-framework','https://airc.nist.gov/airmf-resources/airmf/3-sec-characteristics/'];
const reviewConditions=[
 'The resulting review will inform whether the organization can broaden this use; the current claim is its proposed justification.',
 'The organization wants an independent check of this claim rather than relying only on the supplier’s assurance.',
 'The team is considering an update and needs evidence relevant to this claim before carrying it into the next version.',
 'Affected people will receive a summary of the review, so its stated conclusion must match what was actually tested.',
 'An earlier review addressed a different goal; the organization still needs evidence for the claim stated here.'
];
export function detailFor(f,i){
 if(f.mode==='evidence')return reviewConditions[i];
 if(f.concept==='errors')return ['The audit distinguishes relevant error types rather than reporting only an overall score.','Comparable cases are checked under the same task conditions.','Reviewers record which people bear the cost of the relevant mistake.','The review distinguishes an error disparity from a difference in total selections.','The team has evidence from a repeated controlled comparison rather than a single unexplained difference.'][i];
 return DETAILS[f.concept][i];
}
export function validate(q){
 if(!q.id||!q.family||!MODES[q.mode]||!TOPICS[q.topic]||!CONCEPTS[q.concept]||!DOMAINS[q.domain]||!q.scene||!q.prompt||!q.why||!q.contrast||!q.learningObjective||q.choices?.length!==4||new Set(q.choices).size!==4||!q.choices.includes(q.answer))throw Error('Invalid reviewed question '+q.id);
 if(q.scene.includes(q.answer)||q.prompt.includes(q.answer))throw Error('Answer disclosed in prompt '+q.id);
 if(!q.rationale||!q.reviewScope)throw Error('Missing author rationale/scope '+q.id);
 return q;
}
export const QUESTIONS=CASES.flatMap(f=>Array.from({length:5},(_,i)=>{
 const pairs=[[1,2],[1,3],[2,3],[1,2],[2,3]],more=[...f.wrong,f.extraWrong],pair=pairs[i];
 return validate({id:f.id+':'+i,family:f.id,variant:i,mode:f.mode,topic:f.topic,concept:f.concept,domain:f.domain,bigIdea:5,learningObjective:CONCEPTS[f.concept][1],scene:f.scene+' '+detailFor(f,i),prompt:f.prompt,answer:f.answer,choices:[f.answer,f.wrong[0],more[pair[0]],more[pair[1]]],why:f.why,contrast:f.contrast,rationale:f.why,reviewScope:f.prompt});
}));
export function signature(q){return JSON.stringify([q.scene,q.prompt]);}
export function random(seed){let s=Number(seed)>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const shuffle=(a,rng)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function filterBank(bank,mode='mixed',topic='mixed'){if(mode!=='mixed'&&!MODES[mode]||topic!=='mixed'&&!TOPICS[topic])throw Error('Unknown practice filter');const pool=bank.filter(q=>(mode==='mixed'||q.mode===mode)&&(topic==='mixed'||q.topic===topic));if(!pool.length)throw Error('No challenges in the selected combination');return pool;}
export function createGenerator({seed=Date.now(),history=[],bank=QUESTIONS}={}){if(!bank.length)throw Error('Empty bank');const rng=random(seed),byId=new Map(bank.map(q=>[q.id,q])),recent=history.map(h=>byId.get(typeof h==='string'?h:h?.id)).filter(Boolean).slice(-50),modes={},topics={},families={},concepts={};return {next(mode='mixed',topic='mixed'){
 const pool=filterBank(bank,mode,topic);let candidates=pool.filter(q=>!recent.some(r=>r.id===q.id)),exactRelaxed=false,familyRelaxed=false,conceptRelaxed=false;if(!candidates.length){exactRelaxed=true;for(let n=recent.length-1;n>=0;n--){const tail=n?recent.slice(-n):[];candidates=pool.filter(q=>!tail.some(r=>r.id===q.id));if(candidates.length)break;}}
 const fresh=candidates.filter(q=>!recent.slice(-3).some(r=>r.family===q.family));if(fresh.length)candidates=fresh;else familyRelaxed=true;const newConcepts=candidates.filter(q=>!recent.slice(-2).some(r=>r.concept===q.concept));if(newConcepts.length)candidates=newConcepts;else conceptRelaxed=true;
 const narrow=(key,counts)=>{const keys=[...new Set(candidates.map(q=>q[key]))],minimum=Math.min(...keys.map(k=>counts[k]||0)),weights=keys.map(k=>1/(1+(counts[k]||0)-minimum));let ticket=rng()*weights.reduce((a,b)=>a+b,0),chosen=keys.at(-1);for(let i=0;i<keys.length;i++){ticket-=weights[i];if(ticket<0){chosen=keys[i];break;}}candidates=candidates.filter(q=>q[key]===chosen);};narrow('mode',modes);narrow('topic',topics);narrow('concept',concepts);narrow('family',families);const q=candidates[Math.floor(rng()*candidates.length)];modes[q.mode]=(modes[q.mode]||0)+1;topics[q.topic]=(topics[q.topic]||0)+1;concepts[q.concept]=(concepts[q.concept]||0)+1;families[q.family]=(families[q.family]||0)+1;recent.push(q);if(recent.length>50)recent.shift();return {...q,choices:shuffle(q.choices,rng),exactRelaxed,familyRelaxed,conceptRelaxed};},history:()=>recent.map(q=>q.id),metrics:()=>({modes:{...modes},topics:{...topics},families:{...families},concepts:{...concepts}})};}

export function feedback(q,selected){if(!q.choices.includes(selected))throw Error('Choose one of the four listed answers.');const correct=selected===q.answer;return {correct,text:(correct?'Correct':'Incorrect')+' — '+q.answer+'\n'+q.why+'\n'+q.contrast};}
