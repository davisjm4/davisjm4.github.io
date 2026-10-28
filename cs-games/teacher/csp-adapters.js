import * as analog from '../../csp-games/analog-digital-lab/engine.js';
import * as compression from '../../csp-games/lossless-lossy-lab/engine.js';
import * as rounding from '../../csp-games/roundoff-overflow-lab/engine.js';
import * as ethics from '../../csp-games/ai-ethics-lab/engine.js';
import * as divide from '../../csp-games/digital-divide-lab/engine.js';
import * as internet from '../../csp-games/internet-layers-lab/engine.js';
import * as tcp from '../../csp-games/tcp-udp-lab/generator.js';
import * as rights from '../../csp-games/copyright-creative-commons-lab/engine.js';
import * as vocab from '../../csp-games/vocabulary-fill-in-lab/engine.js';
import * as create from '../../csp-games/create-task-lab/engine.js';
import * as trivial from '../../csp-games/trivial-nontrivial/engine.js';
import * as response from '../../csp-games/response-engine.js';
import * as testing from '../../csp-games/test-case-engine.js';
import * as architect from '../../csp-games/architect-engine.js';
import * as concepts from '../../csp-games/concepts-engine.js';
import {item,source,nativeModes,rng,seeded,text,table,sourceSpans} from './assessment-item.js?v=package-f-20261027';
const pick=(pool,seed)=>pool[Math.floor(rng(seed)()*pool.length)];
export const finiteContracts=[
 ['analog-digital-lab','Analog vs. Digital Lab',analog,['Analog','Digital']],
 ['lossless-lossy-lab','Lossless vs. Lossy Compression Lab',compression,['Lossless','Lossy']],
 ['roundoff-overflow-lab','Roundoff vs. Overflow Lab',rounding,rounding.ANSWERS],
 ['ai-ethics-lab','AI Ethics Scenario Lab',ethics],['digital-divide-lab','Digital Divide Scenario Lab',divide],
 ['internet-layers-lab','Internet Layers & Protocol Roles Lab',internet],['tcp-udp-lab','TCP vs. UDP Decision Lab',tcp,tcp.ANSWERS],
 ['copyright-creative-commons-lab','Copyright & Creative Commons Lab',rights],['vocabulary-fill-in-lab','AP CSP Vocabulary Fill-in Lab',vocab]
];
export function adaptFinite(contract,q,mode,seed,points){
 const [id,name,E,fixed]=contract;let choices=fixed||q.choices,answer=q.answer,code=q.code||'',prompt=q.prompt||E.PROMPT,explanation=id==='vocabulary-fill-in-lab'?'':E.feedback(q,q.answer).text;
 if(id==='vocabulary-fill-in-lab'){
  q=vocab.withChoices(q,rng(seed));choices=q.choices.map(k=>vocab.TERMS[k].term);answer=vocab.TERMS[q.term].term;prompt='Choose the term that completes the blank.';explanation=vocab.feedback(q,q.term).text;
 }
 const context=[q.scene,q.evidence?.caption,q.evidence?.headers&&table(q.evidence.headers,q.evidence.rows),q.steps&&q.steps.map((s,i)=>`${i+1}. ${typeof s==='string'?s:s.missing?'[Missing step]':s.text}`).join('\n'),q.table&&(Array.isArray(q.table)?table(q.table[0],q.table.slice(1)):table(q.table.headers,q.table.rows)),q.diagram&&internet.diagramDescription(q)].filter(Boolean).join('\n\n');
 const responseKeys=id==='vocabulary-fill-in-lab'?q.choices:choices;
 return item({id,name,mode,difficulty:'Mixed',seed,points,prompt,context,code,choices,answerIndex:choices.indexOf(answer),explanation,family:q.family,topic:q.topic,raw:q,responses:responseKeys,grade:r=>E.feedback(q,r).correct,sourceQuestionId:q.id});
}
export const cspSources=finiteContracts.map(contract=>{
 const [id,name,E]=contract,labels=E.MODES||E.TOPICS,modes=nativeModes(labels);
 return source(id,name,modes,(mode,level,seed,points)=>{
  const pool=E.QUESTIONS.filter(q=>E.MODES?q.mode===mode:q.topic===mode);const q=pick(pool,seed);if(!q)return null;
  return adaptFinite(contract,q,mode,seed,points);
 },{bankSize:E.QUESTIONS.length});
});
cspSources.push(source('create-task-lab','Create Performance Task Lab',Object.entries(create.MODES).map(([id,name])=>({id,name,difficulties:['Beginner'],difficultyPolicy:'strict'})),(mode,level,seed,points)=>{
 const families=create.families.filter(f=>f.mode===mode),family=pick(families,seed),q=create.buildChallenge(family.id,(seed>>>8)%3,seed,{valid:mode==='missing'&&seed%6===0});
 return adaptCreate(q,mode,seed,points);
}));
export function adaptCreate(q,mode,seed,points){
 if(create.validate(q).length)return null;
 let choices=q.choices,responses=choices,prompt=q.prompt;
 if(mode==='identify'){
  const targets=[q.target,...q.candidates.filter(c=>c.id!==q.correct).slice(0,3)];
  choices=targets.map(c=>`Characters ${c.start+1}–${c.end}: ${JSON.stringify(c.text)}`);responses=targets.map(c=>c.id);
  prompt+=' Choose the source region; character positions are counted from the beginning of the complete code, starting at 1.';
 }
 return item({id:'create-task-lab',name:'Create Performance Task Lab',mode,difficulty:'Beginner',seed,points,prompt,context:[q.scenario,q.requirement].filter(Boolean).join('\n'),code:q.code,choices,answerIndex:responses.indexOf(q.correct),explanation:q.explanation,family:q.familyId,topic:q.topic,raw:q,responses,grade:r=>create.assess(q,r),sourceQuestionId:q.id});
}
cspSources.push(source('response-builder','Response Builder',nativeModes(response.responseModes),(mode,level,seed,points)=>{
 const q=seeded(seed,()=>response.generateResponse(mode,'minimal'));
 return item({id:'response-builder',name:'Response Builder',mode,seed,points,prompt:q.prompt,context:q.reminder,code:q.code,choices:q.choices.map(c=>c.text),answerIndex:q.choices.findIndex(c=>c.id===q.correctId),explanation:q.feedback,family:q.structure,topic:q.topic,raw:q,responses:q.choices.map(c=>c.id),grade:r=>response.evaluateResponse(q,r).correct});
}));
cspSources.push(source('test-case-builder','Test Case Builder',nativeModes(testing.testModes),(mode,level,seed,points)=>{
 const q=seeded(seed,()=>testing.generateTestCase(mode));if(!testing.validateQuestion(q))return null;
 return item({id:'test-case-builder',name:'Test Case Builder',mode,seed,points,prompt:q.prompt,context:[q.requirement,q.docs,q.inputText].filter(Boolean).join('\n\n'),code:q.code,choices:q.options.map(c=>c.label),answerIndex:q.options.findIndex(c=>c.id===q.correctId),explanation:q.explanation,family:testing.reasonFamily(mode,q.structure),raw:q,responses:q.options.map(c=>({choice:c.id})),grade:r=>testing.evaluateTestCase(q,r).correct});
}));
cspSources.push(source('algorithm-architect','Algorithm Architect — Missing Component',nativeModes(architect.architectModes),(mode,level,seed,points)=>{
 const q=seeded(seed,()=>architect.generateArchitect(mode));if(!q||q.format!=='missing')return null;
 return item({id:'algorithm-architect',name:'Algorithm Architect',mode,seed,points,prompt:`Which component replaces ??? so the program meets the stated goal?`,context:q.context,code:q.missingText,choices:q.options.map(c=>c.text),answerIndex:q.options.findIndex(c=>c.id===q.correctChoice),explanation:architect.evaluateMissing(q,q.correctChoice).details,family:q.structure,raw:q,responses:q.options.map(c=>c.id),grade:r=>architect.evaluateMissing(q,r).correct});
}));
// The single-choice format is an explicit assessment of one source region.
// Multi-region selection families remain excluded; no partial key is exported.
cspSources.push(source('code-concepts','Code Concepts — Single Decision',concepts.categories.map(id=>({id,name:concepts.categoryLabels[id]})),(mode,level,seed,points)=>{
 const q=seeded(seed,()=>concepts.generateConcept(mode));let choices,responses,answerIndex;
 if(q.interaction==='count'){
  const answer=String(q.answer);choices=[answer,...['0','1','2','3','4','5','unknown'].filter(v=>v!==answer).slice(0,3)];responses=choices;answerIndex=0;
 }else{
  if(q.multiple||q.answerIds?.length!==1)return null;
  const pool=concepts.components(q.root).filter(n=>n.text&&n.id!==q.answerIds[0]),target=concepts.components(q.root).find(n=>n.id===q.answerIds[0]);
  if(!target)return null;const spans=sourceSpans(q.root),seen=new Set([JSON.stringify(spans.get(target.id))]),nodes=[target];for(const n of pool){const key=JSON.stringify(spans.get(n.id));if(!seen.has(key)){nodes.push(n);seen.add(key)}if(nodes.length===4)break;}choices=nodes.map(n=>`Characters ${sourceSpans(q.root).get(n.id).start+1}–${sourceSpans(q.root).get(n.id).end}: ${JSON.stringify(n.text)}`);responses=nodes.map(n=>[n.id]);answerIndex=0;
 }
 return item({id:'code-concepts',name:'Code Concepts',mode,seed,points,prompt:q.prompt.replace(/^Select /,'Choose ')+(q.interaction==='select'?' Choose the exact source span; character positions start at 1.':''),code:q.code,choices,answerIndex,explanation:q.explanation,family:q.variant,raw:q,responses,grade:r=>concepts.assess(q,q.interaction==='count'&&q.answer!=='unknown'?Number(r):r)});
}));
const trivialBank=trivial.configurationBank();
cspSources.push(source('trivial-nontrivial','Trivial or Non-Trivial?',Object.entries(trivial.CATEGORIES).map(([id,v])=>({id,name:v.title})),(mode,level,seed,points)=>{
 const q=pick(trivialBank.filter(q=>q.category===mode),seed),answer=q.meaningfulA?'Non-trivial':'Trivial';
 return item({id:'trivial-nontrivial',name:'Trivial or Non-Trivial?',mode,seed,points,prompt:'For the stated task, does Program A use the construct meaningfully (non-trivially) or superficially (trivially)?',context:[q.task,Array.isArray(q.assumptions)?q.assumptions.join('\n'):q.assumptions].join('\n'),code:q.codeA,choices:['Trivial','Non-trivial'],answerIndex:['Trivial','Non-trivial'].indexOf(answer),explanation:q.explanation,family:q.modelId,raw:q,responses:[false,true],grade:r=>r===q.meaningfulA});
}));
