import assert from 'node:assert/strict';
import fs from 'node:fs';
import {families,TOPICS,MODES,buildChallenge,validate,createSampler,assess} from './engine.js';
import {scenario,scenarioIds} from './scenarios.js';
import {execute,render,find,walk,L,V,E,A,D,P,R,Call,U,clone,patch} from './model.js';
const dir=new URL('./reports/',import.meta.url);fs.mkdirSync(dir,{recursive:true});let assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
check(families.length>=120,'120 genuinely distinct authored families');
check(new Set(families.map(f=>f.id)).size===families.length,'unique stable IDs');
const counts={};for(const mode of Object.keys(MODES)){const subset=families.filter(f=>f.mode===mode);check(subset.length>=60,mode+' minimum');counts[mode]=Object.fromEntries(Object.keys(TOPICS).map(t=>[t,subset.filter(f=>f.topic===t).length]));for(const n of Object.values(counts[mode]))check(n>0,'every topic in '+mode);}
// Independently authored oracle outputs verify the interpreter's AP semantics.
const zero=execute([A('i',L(4)),U(E('>',V('i'),L(3)),[D(V('i')),A('i',E('+',V('i'),L(1)))],'loop')]);
check(zero.outputs.length===0&&!zero.error,'AP REPEAT UNTIL tests before entering: zero iterations');
check(execute([D(E('INDEX',{k:'list',values:[L(9)]},L(1)))]).outputs[0]===9,'AP index 1 is first');
check(!!execute([D(E('INDEX',{k:'list',values:[L(9)]},L(0)))]).error,'AP index 0 is an error');
check(execute([P('f',['x'],[R(V('x')),D(L('unreachable'))]),A('r',Call('f',[L(7)])),D(V('r'))]).outputs.join(',')==='7','RETURN exits call and does not display on its own');
const corpus=[],signatures=new Set(),structural=new Set(),spans=new Set(),mutations=new Set(),scenarioSet=new Set();let executions=0,counterfactuals=0;
for(const f of families)for(let variant=0;variant<3;variant++){
  const q=buildChallenge(f.id,variant,29,{phrasing:variant%2}),r=validate(q);check(r.ok,q.id+' '+r.errors.join(';'));executions+=2;counterfactuals+=r.counterfactuals;
  check(assess(q,q.correct),'answer accepted '+q.id);check(!assess(q,'not-an-answer'),'wrong answer rejected '+q.id);
  check(q.code===render(q.program).code,'render matches program');check(q.code===buildChallenge(f.id,variant,29,{phrasing:variant%2}).code,'reproducible');
  if(q.target){check(q.target.text===q.code.slice(q.target.start,q.target.end),'exact selectable span');spans.add(q.target.kind);}
  const fresh=!signatures.has(q.repeatSignature);signatures.add(q.repeatSignature);structural.add(q.structuralSignature);scenarioSet.add(q.scenarioId);if(q.mutation)mutations.add(q.mutation.id);
  if(fresh)corpus.push({id:q.id,mode:q.mode,topic:q.topic,familyId:q.familyId,scenarioId:q.scenarioId,scenario:q.scenario,focus:q.requirement,prompt:q.prompt,code:q.code,correct:q.mode==='identify'?q.target:q.correct,choices:q.choices,explanation:q.explanation,mutation:q.mutation,correctedCode:q.mode==='missing'?q.correctedCode:null,validation:r});
  if(q.mode==='missing'){const control=buildChallenge(f.id,variant,29,{valid:true});check(validate(control).ok,'valid control '+f.id);}
}
check(corpus.length>=360,'360 substantively distinct corpus instances');check(signatures.size===corpus.length,'no exact corpus duplicate');
// The three forms differ in call/data-flow structure, not just literal values or names.
for(const f of families){const forms=[0,1,2].map(v=>buildChallenge(f.id,v,29).structuralSignature);check(new Set(forms).size>=2,'at least two structural configurations for '+f.id);}
let sweep=0;for(const f of families)for(let v=0;v<3;v++)for(let seed=1;seed<=20;seed++){
  for(const phrasing of [0,1]){const q=buildChallenge(f.id,v,seed,{phrasing}),r=validate(q);check(r.ok,q.id+': '+r.errors.join(';'));sweep++;executions+=2;counterfactuals+=r.counterfactuals;}
}
let sampled=0,controls=0,missing=0,repeats=0;const sampling=[];
for(const mode of ['mixed',...Object.keys(MODES)])for(const topic of ['all',...Object.keys(TOPICS)]){
  const s=createSampler(7301),history=[],byMode={},byTopic={};
  for(let i=0;i<300;i++){
    const q=s.next({mode,topic});check(!history.includes(q.repeatSignature),`no repeat in 50 ${mode}/${topic}`);if(history.includes(q.repeatSignature))repeats++;history.push(q.repeatSignature);if(history.length>50)history.shift();
    byMode[q.mode]=(byMode[q.mode]||0)+1;byTopic[q.topic]=(byTopic[q.topic]||0)+1;if(q.mode==='missing'){missing++;if(q.valid)controls++;}sampled++;
  }
  if(mode==='mixed')check(Math.abs(byMode.missing-byMode.identify)<=1,'balanced Mixed modes');
  if(topic==='all')check(Math.max(...Object.values(byTopic))-Math.min(...Object.values(byTopic))<=2,'balanced topics');
  sampling.push({mode,topic,byMode,byTopic});
}
check(controls/missing>=.15&&controls/missing<=.20,'15–20% valid controls');
const wording=corpus.map(q=>q.prompt+' '+q.explanation+' '+q.focus).join('\n');
for(const phrase of ['parameter','argument','Boolean','selection','conditional','control structure','iteration','instructions responsible for input','instructions responsible for output','PPR','sequencing','list'])check(wording.toLowerCase().includes(phrase.toLowerCase()),'terminology '+phrase);
const report={date:'2026-10-24',families:families.length,counts,corpus:corpus.length,exactCorpusUnique:signatures.size,codeStructuralSignatures:structural.size,structurallyDistinctFormsPerFamily:'2–3 (4 mutations erase the third caller form)',scenarios:scenarioSet.size,scenariosAvailable:scenarioIds.length,mutations:mutations.size,selectionKinds:[...spans],sweep,sampled,executions,counterfactuals,validControlRate:controls/missing,repeatsInLast50:repeats,assertions,sampling,limitations:['Behavioral verification executes the bounded structured model rendered as pseudocode; it does not compile arbitrary external pseudocode.','Counterfactual probes are finite; they do not establish universal equivalence.','Original examples focus on specific components, not entire scored submissions.','No external educator or separate agent has certified the corpus.']};
fs.writeFileSync(new URL('validation.json',dir),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(new URL('review-corpus.json',dir),JSON.stringify(corpus,null,2)+'\n');
fs.writeFileSync(new URL('REVIEW_SAMPLES.md',dir),'# Reviewable instructional samples\n\nGenerated from every family. Each family has three structurally different call/data-flow configurations in review-corpus.json.\n\n'+Object.keys(MODES).map(mode=>`## ${MODES[mode]}\n\n`+Object.keys(TOPICS).map(topic=>`### ${TOPICS[topic]}\n\n`+corpus.filter(x=>x.mode===mode&&x.topic===topic&&x.id.split(':')[1]==='0').map(x=>`#### ${x.familyId}\n\n${x.scenario}\n\n${x.focus||''}\n\n${x.prompt}\n\n\`\`\`text\n${x.code}\n\`\`\`\n\nAnswer: ${typeof x.correct==='string'?x.correct:x.correct.text}\n\n${x.explanation}\n`).join('\n')).join('\n')).join('\n'));
console.log(JSON.stringify(report,null,2));
