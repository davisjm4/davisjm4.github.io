// Build 6: AP CSP Boolean Gatekeeper, List Lab and Algorithm Architect. Every event is built from a question the REAL generator produced,
// passed through the Worker's cleanGameAttempt and the shared normalizeEvent, and judged by the shared evaluateSkillProficiency.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import graph from '../curriculum-graph.json' with {type:'json'};
import * as E from '../../../csp-games/engine.js';
import {generateArchitect,architectModes} from '../../../csp-games/architect-engine.js';
import {booleanMakeEvidence,architectComponent,SPARSE_MAX_DENSITY,selectBooleanMakeChallenge} from '../../../csp-games/proficiency-metadata.js';
import {cleanGameAttempt} from '../../../wpr-games/workplace-readiness/service/profile-evidence.mjs';
import {normalizeEvent} from '../mastery/events.mjs';
import {evaluateSkillProficiency} from '../proficiency/index.mjs';
import {formativeFamily} from '../proficiency/coverage-phase2.mjs';

const csp=key=>graph.nodes.find(n=>n.id.endsWith(':CSP-'+key));
const scope={profileId:'synthetic',classId:'synthetic-class'};
let counter=0;
function record(node,activity,mode,familyId,{topic=mode,selected='mixed',correct=true,attempt=1,question}={}){
  const questionId=question??'question-'+(++counter);
  const raw={id:questionId+':'+attempt,questionId,sessionId:'session-1',activity,mode:selected,assessedMode:mode,topic,familyId,
    courseId:'csp',attempt,correct,occurred:Date.parse('2026-11-11T12:00:00Z')+(++counter)};
  const row=cleanGameAttempt(raw,()=>true);
  assert.ok(row,'the Worker accepts the event');
  if(attempt===1)assert.deepEqual(row.data.dimensions.map(x=>x.id),[node.id],`${activity}/${mode}/${familyId} is attributed to ${node.id}`);
  else assert.deepEqual(row.data.dimensions,[],'the Worker gives a retry no skill credit');
  const result=normalizeEvent(row,{graph,scope});
  assert.equal(result.ok,true,result.reason);
  return result.event;
}
const level=(node,events,options)=>evaluateSkillProficiency(node,events,options);
const BOOLEAN=csp('BOOLEAN'),LISTS=csp('LISTS'),PROCEDURES=csp('PROCEDURES');
const ARCH={SELECTION:['nested-selection','selection'],ITERATION:['nested','iteration','counter','accumulator'],SEQUENCE:['sequence'],ALGORITHMS:['search'],PROCEDURES:['procedure']};

// ---- event factories from real questions ---------------------------------------------------------------------------------------
const booleanDraw=(options={})=>{
  const c=E.booleanChallenge(),m=booleanMakeEvidence(c.solutions,c.e.op);
  return {c,m,event:record(BOOLEAN,'boolean-gatekeeper','make',m.family,{topic:'make',selected:'make',...options})};
};
const listDraw=(options={})=>{
  const c=E.listChallenge();
  return {c,event:record(LISTS,'list-lab','execute','list-execute:'+c.ops.map(o=>o.type.toLowerCase()).join('-'),{topic:'execute',selected:'execute',...options})};
};
function architectDraw(node,mode,options={}){
  const q=generateArchitect(mode),variant=q.structure.slice(q.mode.length+1).split('-')[0],component=architectComponent(q);
  return {q,variant,component,event:record(node,'algorithm-architect',mode,`${mode}:${variant}:${component}`,{topic:mode,selected:mode,...options})};
}
const collect=(draw,count,keep=()=>true,cap=20000)=>{const out=[];for(let i=0;i<cap&&out.length<count;i++){const d=draw();if(keep(d))out.push(d);}return out;};

// ---- 1. Boolean Gatekeeper --------------------------------------------------------------------------------------------------------
test('Boolean make questions: a Level 3 family is attached only when both inputs matter and a random guess rarely passes',()=>{
  let tagged=0,total=0,minTagged=1,maxDensityTagged=0;
  for(let i=0;i<6000;i++){
    const c=E.booleanChallenge(),m=booleanMakeEvidence(c.solutions,c.e.op);
    total++;
    assert.equal(m.density,c.solutions.length/169);
    if(m.family){
      tagged++;
      assert.match(m.family,/^both-inputs:(and|or|not)$/);
      assert.ok(m.needsBothInputs,'a tagged question cannot be satisfied by one input alone');
      assert.ok(m.density<=SPARSE_MAX_DENSITY,'a tagged question is passed by at most 25% of random pairs');
      maxDensityTagged=Math.max(maxDensityTagged,m.density);minTagged=Math.min(minTagged,m.density);
    }else assert.ok(!m.needsBothInputs||m.density>SPARSE_MAX_DENSITY,'a question that is both-inputs and sparse must be tagged');
  }
  assert.ok(tagged/total>0.10&&tagged/total<0.30,'tagged share '+tagged/total);   // measured about 17%
  assert.ok(maxDensityTagged<=0.25);
});

test('guessing cannot reach Boolean Level 3: the chance across the 8 answers the rule needs is negligible for tagged questions',()=>{
  const binom=(n,k,p)=>{let c=1;for(let i=0;i<k;i++)c=c*(n-i)/(i+1);return c*p**k*(1-p)**(n-k);};
  const tagged=collect(()=>{const c=E.booleanChallenge();return {m:booleanMakeEvidence(c.solutions,c.e.op)};},1500,d=>d.m.family);
  const reach=d=>[7,8].reduce((s,k)=>s+binom(8,k,d.m.density),0);
  const mean=tagged.reduce((s,d)=>s+reach(d),0)/tagged.length;
  assert.ok(mean<1e-4,'mean chance of reaching 7 of 8 by luck: '+mean);
  // for comparison, the previous rule (any both-inputs question) exposed a measurable chance
  const loose=collect(()=>{const c=E.booleanChallenge();return {m:booleanMakeEvidence(c.solutions,c.e.op)};},1500,d=>d.m.needsBothInputs);
  assert.ok(loose.reduce((s,d)=>s+reach(d),0)/loose.length>10*mean,'the repair removes most of the luck exposure');
});

test('Boolean: valid sparse evidence establishes Level 3, beginner-only evidence cannot, and Level 4 stays unavailable',()=>{
  const sparse=collect(()=>booleanDraw(),40,d=>d.m.family).map(d=>d.event);
  const result=level(BOOLEAN,sparse);
  assert.equal(result.tiers.intermediate.status,'demonstrated',JSON.stringify(result.tiers.intermediate));
  assert.equal(result.level,3);
  assert.equal(result.tiers.advanced.status,'unavailable','Level 4 needs a separately supported transfer bank');
  assert.equal(level(BOOLEAN,[...sparse,...sparse.map((e,i)=>({...e,id:e.id+'x'+i,questionId:e.questionId+'x'+i}))]).level,3,'more evidence never creates Level 4');
  // Beginner: Code Concepts comparison questions support Level 2 only
  const beginner=Array.from({length:8},(_,i)=>record(BOOLEAN,'code-concepts','variables','variables/'+['comparison','boolean-expression','boolean-value','boolean-result'][i%4],
    {topic:'variables/'+['comparison','boolean-expression','boolean-value','boolean-result'][i%4]}));
  const b=level(BOOLEAN,beginner);
  assert.equal(b.tiers.beginner.status,'demonstrated');assert.equal(b.level,2);assert.notEqual(b.advancementMet,true,'easy questions do not advance the learner');
  assert.equal(b.tiers.intermediate.status!=='demonstrated',true);
});

test('Boolean: ordinary evaluation, dense make questions and missing family metadata earn no level',()=>{
  const evaluate=Array.from({length:30},()=>record(BOOLEAN,'boolean-gatekeeper','evaluate',undefined,{topic:'evaluate',selected:'evaluate'}));
  assert.equal(level(BOOLEAN,evaluate).level,0,'evaluation questions carry no formative tier');
  const dense=collect(()=>booleanDraw(),30,d=>!d.m.family).map(d=>d.event);
  assert.ok(dense.every(e=>e.familyId===null),'an untagged question is recorded without a family');
  const r=level(BOOLEAN,dense);assert.ok(r.level<=1);assert.equal(r.tiers.intermediate.status!=='demonstrated',true);
  assert.equal(r.evidenceQuality.classified,0);
  // a family label the rubric has not reviewed (the evaluator's own diversity rule would be satisfied by two distinct labels)
  const unreviewed=Array.from({length:30},(_,i)=>record(BOOLEAN,'boolean-gatekeeper','make',['any-pair:and','any-pair:or','dense:not'][i%3],{topic:'make',selected:'make'}));
  const u=level(BOOLEAN,unreviewed);
  assert.equal(u.evidenceQuality.classified,0,'only the reviewed both-inputs families are classified');
  assert.equal(u.level,0);
});

// ---- 2. List Lab -----------------------------------------------------------------------------------------------------------------
test('List Lab: executing several shifting operations supports Level 3; simple programs, Build mode and missing family do not',()=>{
  const shifting=collect(()=>listDraw(),30,d=>d.c.ops.filter(o=>o.type!=='APPEND').length>=2).map(d=>d.event);
  const r=level(LISTS,shifting);
  assert.equal(r.tiers.intermediate.status,'demonstrated');assert.equal(r.level,3);assert.equal(r.tiers.advanced.status,'unavailable');
  const simple=collect(()=>listDraw(),20,d=>d.c.ops.filter(o=>o.type!=='APPEND').length<2).map(d=>d.event);
  assert.equal(level(LISTS,simple).level,0,'simple programs stay practice');
  const build=Array.from({length:20},()=>record(LISTS,'list-lab','build',undefined,{topic:'build',selected:'build'}));
  assert.equal(level(LISTS,build).level,0,'freeform construction can be solved by a short workaround, so it stays practice');
  const unlabeled=Array.from({length:20},()=>record(LISTS,'list-lab','execute',undefined,{topic:'execute',selected:'execute'}));
  assert.equal(level(LISTS,unlabeled).level,0,'a question without a family cannot generate a tier');
});

test('List Lab: index-shift reasoning is what the qualifying questions measure (misconception audit)',()=>{
  const zeroBased=(start,ops)=>{const a=[...start];for(const o of ops){if(o.type==='APPEND')a.push(o.value);else if(o.type==='INSERT'){if(o.index<0||o.index>a.length)return null;a.splice(o.index,0,o.value);}else{if(o.index<0||o.index>=a.length)return null;a.splice(o.index,1);}}return a;};
  const reversed=(start,ops)=>{try{return E.runOperations(start,[...ops].reverse());}catch{return null;}};
  const eq=(a,b)=>a&&JSON.stringify(a)===JSON.stringify(b);
  const q=collect(()=>({c:E.listChallenge()}),2500,d=>d.c.ops.filter(o=>o.type!=='APPEND').length>=2).map(d=>d.c);
  const pass=fn=>q.filter(c=>eq(fn(c.start,c.ops),c.target)).length/q.length;
  assert.ok(pass(zeroBased)<0.08,'0-based indexing passes '+pass(zeroBased));
  assert.ok(pass(reversed)<0.12,'reversed order passes '+pass(reversed));
  assert.ok(q.every(c=>eq(E.runOperations(c.start,c.ops),c.target)),'the answer key is the correct execution');
});

// ---- 3. Algorithm Architect ------------------------------------------------------------------------------------------------------
test('Architect components: idiom and transcription questions are labelled as such, everything else keeps its established name',()=>{
  const seen=new Map();
  for(const mode of Object.keys(architectModes))for(let i=0;i<2500;i++){
    const q=generateArchitect(mode),component=architectComponent(q),legacy=q.format==='arrange'?'arrange':q.component.replaceAll(' ','-');
    seen.set(component,(seen.get(component)||0)+1);
    const text=q.format==='missing'?q.options[Number(q.correctChoice.split('-')[1])].text:'';
    if(component==='update-count'){assert.equal(text,'result ← (result + 1)');assert.equal(legacy,'update');}
    else if(component==='procedure-call-direct'){
      assert.equal(legacy,'procedure-call');
      const args=/\(([^()]*)\)$/.exec(text)[1].split(',').map(s=>s.trim());
      assert.ok(args.every(a=>q.params.includes(a)),text+' uses only the procedure inputs');
    }else assert.equal(component,legacy,'unaffected component '+legacy);
    assert.equal(architectComponent(q),component,'deterministic');
  }
  for(const name of ['update-count','procedure-call-direct','condition','loop-boundary','update','procedure-call','initialization','return','arrange'])assert.ok(seen.get(name)>0,name+' occurs');
});

test('Architect: the goal of a direct procedure call states the call (the reason it cannot be Level 3)',()=>{
  let direct=0,stated=0;
  for(let i=0;i<4000;i++){
    const q=generateArchitect('procedure');
    if(architectComponent(q)!=='procedure-call-direct')continue;
    direct++;
    const text=q.options[Number(q.correctChoice.split('-')[1])].text.replace(/^result ← /,'');           // e.g. difference(a, b)
    const name=text.slice(0,text.indexOf('('));
    if(q.goal.includes(name+'('+text.slice(text.indexOf('(')+1,-1).replace(/, /g,',')+')')||q.goal.includes(name+'('))stated++;
  }
  assert.ok(direct>500);assert.ok(stated/direct>0.5,'share of direct-call goals that spell out the call: '+stated/direct);
});

for(const [key,modes] of Object.entries(ARCH)){
  test(`Architect ${key}: Level 3 comes from reasoning questions only, and foundational questions alone never reach it`,()=>{
    const node=csp(key);
    const practice=level(node,[]).tiers.intermediate.practice;                       // the mode the student map actually recommends
    assert.equal(practice.activityId,'algorithm-architect');assert.ok(modes.includes(practice.mode),practice.mode);
    let result,events=[];
    for(let i=0;i<400&&(result?.level??0)<3;i++){events.push(architectDraw(node,practice.mode).event);if(events.length>=6)result=level(node,events);}
    assert.equal(result.tiers.intermediate.status,'demonstrated',key+' Level 3 is reachable in the recommended mode');
    assert.equal(result.tiers.advanced.status,'unavailable');
    // a long run of only foundational questions (counter increments, direct calls, initialization, return values)
    const easy=collect(()=>architectDraw(node,modes[Math.floor(Math.random()*modes.length)]),60,
      d=>['update-count','procedure-call-direct','initialization','return'].includes(d.component)).map(d=>d.event);
    assert.ok(level(node,easy).level<3,key+': 60 foundational answers do not reach Level 3');
    assert.equal(level(node,easy).tiers.intermediate.status!=='demonstrated',true);
  });
}

test('Architect PROCEDURES: Level 3 needs two different composition models; one model, however often repeated, is not enough',()=>{
  const draws=collect(()=>architectDraw(PROCEDURES,'procedure'),400,d=>['procedure-call','arrange'].includes(d.component));
  const byVariant=new Map();for(const d of draws){(byVariant.get(d.variant)||[]).push(d.event);byVariant.set(d.variant,byVariant.get(d.variant)||[]);}
  assert.deepEqual([...new Set(draws.map(d=>d.variant))].sort(),['2','4'],'only the two composition models qualify');
  const events=new Map();for(const d of draws){if(!events.has(d.variant))events.set(d.variant,[]);events.get(d.variant).push(d.event);}
  const one=events.get('2').slice(0,40);
  assert.equal(level(PROCEDURES,one).tiers.intermediate.status!=='demonstrated',true,'one model repeated 40 times');
  const both=[...events.get('2').slice(0,4),...events.get('4').slice(0,4)];
  assert.equal(level(PROCEDURES,both).tiers.intermediate.status,'demonstrated');
});

test('Architect: three components of the same program model do not count as breadth',()=>{
  const node=csp('ITERATION');
  const sameModel=['iteration:1:update','iteration:1:loop-boundary','iteration:1:condition'].flatMap(f=>Array.from({length:3},()=>record(node,'algorithm-architect','iteration',f,{topic:'iteration'})));
  assert.equal(formativeFamily({activityId:'algorithm-architect',familyId:'iteration:1:update'}),'iteration:1');
  assert.equal(level(node,sameModel).tiers.intermediate.status!=='demonstrated',true);
});

test('historical records keep their meaning: tags written before this change are still read exactly as before',()=>{
  const node=csp('ITERATION');
  const old=[0,1,2,4,1,0,2,4].map((v,i)=>record(node,'algorithm-architect','iteration','iteration:'+v+':update',{topic:'iteration',question:'old-'+i}));
  assert.equal(level(node,old).tiers.intermediate.status,'demonstrated','an earlier Level 3 stays Level 3');
  const counter=['counter:0:update','counter:1:update','counter:4:update','counter:0:update','counter:1:update','counter:4:update'].map((f,i)=>record(csp('ITERATION'),'algorithm-architect','counter',f,{topic:'counter',question:'ctr-'+i}));
  assert.equal(level(node,counter).tiers.intermediate.status,'demonstrated','records already stored with the old tag are not rewritten');
  const fresh=['counter:0:update-count','counter:1:update-count','counter:4:update-count','counter:0:update-count','counter:1:update-count','counter:4:update-count'].map((f,i)=>record(csp('ITERATION'),'algorithm-architect','counter',f,{topic:'counter',question:'new-'+i}));
  assert.equal(level(node,fresh).tiers.intermediate.status!=='demonstrated',true,'new counter-increment records are practice');
});

// ---- 4. cross-cutting ------------------------------------------------------------------------------------------------------------
test('focused and Mixed Practice credit the same skill and tier for the same question',()=>{
  const q=generateArchitect('iteration'),variant=q.structure.slice(q.mode.length+1).split('-')[0],family=`iteration:${variant}:${architectComponent(q)}`;
  const focused=record(csp('ITERATION'),'algorithm-architect','iteration',family,{topic:'iteration',selected:'iteration',question:'same-q-f'});
  const mixed=record(csp('ITERATION'),'algorithm-architect','iteration',family,{topic:'iteration',selected:'mixed',question:'same-q-m'});
  assert.deepEqual([focused.nodeIds,focused.assessedMode,focused.familyId],[mixed.nodeIds,mixed.assessedMode,mixed.familyId]);
  assert.equal(focused.requestedMode,'iteration');assert.equal(mixed.requestedMode,'mixed');
  const b1=booleanMakeEvidence(E.booleanChallenge().solutions,'AND'),b2=booleanMakeEvidence(E.booleanChallenge().solutions,'AND');
  assert.equal(typeof b1.needsBothInputs,'boolean');assert.ok(b2.density>=0);
});

test('a correct retry never inflates first-attempt accuracy',()=>{
  const wrongFirst=Array.from({length:10},(_,i)=>{
    const d=listDraw({question:'retry-'+i,correct:false});
    const again=record(LISTS,'list-lab','execute',d.event.familyId,{topic:'execute',selected:'execute',question:'retry-'+i,attempt:2,correct:true});
    return [d.event,again];
  }).flat();
  const r=level(LISTS,wrongFirst);
  assert.equal(r.tiers.intermediate.correct??0,0);assert.equal(r.tiers.intermediate.status!=='demonstrated',true);
  assert.equal(r.evidenceQuality.duplicates+r.evidenceQuality.classified>=0,true);
});

test('missing difficulty or family metadata cannot create proficiency in any of the three games',()=>{
  const none=[
    ...Array.from({length:40},()=>record(BOOLEAN,'boolean-gatekeeper','make',undefined,{topic:'make',selected:'make'})),
    ...Array.from({length:40},()=>record(LISTS,'list-lab','execute',undefined,{topic:'execute',selected:'execute'}))];
  assert.equal(level(BOOLEAN,none.slice(0,40)).level,0);assert.equal(level(LISTS,none.slice(40)).level,0);
  for(const [key,modes] of Object.entries(ARCH)){
    const node=csp(key),events=Array.from({length:40},()=>record(node,'algorithm-architect',modes[0],undefined,{topic:modes[0],selected:modes[0]}));
    assert.equal(level(node,events).level,0,key);
  }
});

test('teacher-configured quantities and percentages still apply inside the supported tiers',()=>{
  const sparse=collect(()=>booleanDraw(),30,d=>d.m.family).map(d=>d.event);
  const policy={id:'teacher:class',version:3,minimumQuestions:12,accuracy:.9,provisional:false,challenge:{}};
  const strict=level(BOOLEAN,sparse.slice(0,10),{policy});
  assert.equal(strict.tiers.intermediate.minimumQuestions,12);assert.equal(strict.tiers.intermediate.accuracy,.9);
  assert.equal(strict.tiers.intermediate.status!=='demonstrated',true,'10 answers do not satisfy the teacher\'s 12');
  assert.equal(level(BOOLEAN,sparse.slice(0,14),{policy}).tiers.intermediate.status,'demonstrated');
  const wrong=sparse.slice(0,14).map((e,i)=>i<3?{...e,correct:false}:e);                 // 11 of 14 = 78% < 90%
  assert.equal(level(BOOLEAN,wrong,{policy}).tiers.intermediate.status!=='demonstrated',true);
  assert.equal(level(BOOLEAN,sparse.slice(0,8)).tiers.intermediate.minimumQuestions,8,'default rule when no policy is configured');
});

test('official scores and awards are untouched: formative evaluation only reads them',()=>{
  const node={...BOOLEAN,checkpoint:{score:3,award:{id:'award-1',level:3}}};
  const before=JSON.stringify(node);
  const events=collect(()=>booleanDraw(),20,d=>d.m.family).map(d=>d.event);
  const r=level(node,events);
  assert.equal(r.standardsScore,3);assert.equal(r.trust,'formative');assert.equal(JSON.stringify(node),before,'the node is not modified');
  assert.equal(level({...BOOLEAN,checkpoint:{score:1}},events).standardsScore,1,'the score reported is the teacher\'s, not the formative level');
  assert.ok(!('award' in r),'no award is created');
});

test('stable skill ids and course coverage are unchanged',()=>{
  for(const key of ['BOOLEAN','LISTS','SEQUENCE','SELECTION','ITERATION','ALGORITHMS','PROCEDURES'])assert.ok(csp(key),key);
  assert.equal(graph.nodes.filter(n=>n.courseId==='csp').length,58);
});

test('focused Make selection supplies Level 3 evidence promptly without repeating recent solution sets',()=>{
  const recent=[],events=[];
  let solved=0;
  for(let i=0;i<40;i++){
    const q=selectBooleanMakeChallenge(E.booleanChallenge,recent);
    const m=booleanMakeEvidence(q.solutions,q.e.op);
    if(m.family)solved++;
    events.push(record(BOOLEAN,'boolean-gatekeeper','make',m.family));
  }
  assert.ok(solved>=38);
  assert.equal(new Set(recent.map(q=>q.key)).size,recent.length);
  assert.equal(level(BOOLEAN,events.slice(0,12)).level,3);
});
