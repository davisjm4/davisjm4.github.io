import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import graph from '../curriculum-graph.json' with {type:'json'};
import {generateArray,assessArray,createArrayHistory,solutionArray} from '../../../java-games/array-lab/array-engine.js';
import {generateChallenge,assessLoop} from '../../../java-games/loop-lab/loop-engine.js';
import {generate as math,assess as assessMath,structures} from '../../../java-games/math-lab/engine.js';
import {generate as boolean,assess as assessBoolean,makeRng} from '../../../java-games/boolean-conditional-lab/engine.js';
import {generateArchitect,evaluateArchitect,evaluateMissing} from '../../../csp-games/architect-engine.js';
import {cleanGameAttempt} from '../../../wpr-games/workplace-readiness/service/profile-evidence.mjs';
import {normalizeEvent} from '../mastery/events.mjs';
import {auditedDifficulty,rubricFor} from '../proficiency/catalog.mjs';
import {evaluateProficiency,evaluateSkillProficiency} from '../proficiency/index.mjs';

const strings=createRequire(import.meta.url)('../string-lab-source.cjs');
const get=id=>graph.nodes.find(n=>n.id===id);
const csp=key=>graph.nodes.find(n=>n.id.endsWith(':CSP-'+key));
const scope={profileId:'synthetic',classId:'synthetic-class'};
let counter=0;
function record(node,activity,mode,familyId,{difficulty,topic=mode,selected='mixed',evidenceRevision,correct=true}={}){
  const questionId='question-'+(++counter);
  const raw={id:questionId+':1',questionId,sessionId:'session-1',activity,mode:selected,
    assessedMode:mode,topic,familyId,difficulty,courseId:node.courseId,
    evidenceRevision,attempt:1,correct,occurred:Date.parse('2026-11-11T12:00:00Z')+counter};
  const row=cleanGameAttempt(raw,()=>true);
  assert.ok(row);
  assert.deepEqual(row.data.dimensions.map(x=>x.id),[node.id],activity+'/'+mode+'/'+familyId);
  const result=normalizeEvent(row,{graph,scope});
  assert.equal(result.ok,true,result.reason);
  return result.event;
}
const label=value=>value[0].toUpperCase()+value.slice(1);

function sample(node,activity,mode,difficulty,seed,history){
  const options={difficulty,selected:mode};
  let family;
  if(activity==='array-lab'){
    const q=generateArray(mode,undefined,{difficulty:label(difficulty),seed,history});
    assert.ok(q.difficultyEvidence&&assessArray(q,solutionArray(q)),mode);
    return record(node,activity,q.format,q.reasoningModel,{
      ...options,difficulty:q.difficulty,evidenceRevision:q.generationVersion===1?'array-compose-v1':null
    });
  }
  if(activity==='string-lab'){
    const q=strings.generateChallenge({mode,difficulty,seed});
    assert.ok(q.metrics);
    assert.equal(q.choices[q.correctIndex].text,q.answer);
    family=q.family;
  }else if(activity==='loop-lab'){
    const q=generateChallenge({mode,difficulty,seed});
    assert.ok(assessLoop(q,{answer:q.answer}));
    family=q.reasoningFamily;
    options.difficulty=q.difficulty;
  }else if(activity==='math-lab'){
    const q=math(mode,structures[mode][seed%structures[mode].length],makeRng(seed));
    assert.ok(assessMath(q,q.answer));
    family=mode+':'+q.shape;
  }else{
    const q=boolean(mode,makeRng(seed*7919+113),label(difficulty));
    assert.ok(assessBoolean(q,q.answer));
    family=q.family;
  }
  return record(node,activity,mode,family,options);
}

test('every new Java tier is reachable in the recommended practice mode',()=>{
  for(const node of graph.nodes.filter(n=>/^node:advanced:(array|loop|string|math|boolean-conditional)-lab:/.test(n.id))){
    const groups=[];
    for(const [tier,rule] of Object.entries(rubricFor(node).tiers)){
      const {activityId,mode,difficulty}=rule.practice;
      const history=createArrayHistory(null), records=[];
      for(let seed=1;seed<=90;seed++){
        records.push(sample(node,activityId,mode,difficulty,seed,history));
        if(seed%10===0&&evaluateSkillProficiency(node,records).tiers[tier].status==='demonstrated')break;
      }
      const progress=evaluateSkillProficiency(node,records);
      assert.equal(progress.tiers[tier].status,'demonstrated',JSON.stringify([node.id,tier,progress.tiers[tier]]));
      if(tier==='beginner'&&difficulty)assert.ok(progress.level<=2,node.id);
      if(activityId==='array-lab'){
        assert.equal(evaluateSkillProficiency(node,records.map(e=>({...e,evidenceRevision:null}))).level,0);
      }
      groups.push(...records);
    }
    if(rubricFor(node).tiers.advanced)assert.equal(evaluateSkillProficiency(node,groups).level,4,node.id);
  }
});

test('direct Architect questions support multiple CSP areas and preserve difficulty boundaries',()=>{
  const modes={SELECTION:'nested-selection',ITERATION:'nested',SEQUENCE:'sequence',ALGORITHMS:'search',PROCEDURES:'procedure'};
  const members=Object.keys(modes).map(csp);
  const byNode=new Map();
  for(const node of members){
    const mode=modes[node.id.split('CSP-').at(-1)];
    const events=[];
    let result=evaluateSkillProficiency(node,events);
    for(let i=0;i<160&&result.level<3;i++){
      const q=generateArchitect(mode);
      const variant=q.structure.slice(q.mode.length+1).split('-')[0];
      const component=q.format==='arrange'?q.format:q.component.replaceAll(' ','-');
      const scored=q.format==='arrange'?evaluateArchitect(q,q.solution):evaluateMissing(q,q.correctChoice);
      assert.equal(scored.correct,true,mode);
      events.push(record(node,q.game,q.mode,`${q.mode}:${variant}:${component}`,{
        selected:i%2===0?'mixed':mode,topic:q.topic
      }));
      result=evaluateSkillProficiency(node,events);
    }
    assert.equal(result.level,3,JSON.stringify([node.id,result.tiers]));
    assert.equal(result.tiers.advanced.status,'unavailable');
    assert.equal(auditedDifficulty(node,{...events[0],familyId:mode+':1:return'}),null);
    byNode.set(node.id,events);
  }
  const unreviewed=csp('PURPOSE');
  const progress=evaluateProficiency({courseId:'csp',nodes:[unreviewed,...members],eventsByNode:new Map([...byNode].filter(([id])=>id!==members[4].id))});
  assert.equal(progress.areas[unreviewed.areaId].readyToAdvance,false);
  assert.equal(progress.byArea[unreviewed.areaId].browseNext.areaId,members[4].areaId);
  assert.equal(progress.areas[members[0].areaId].readyToAdvance,true);
  assert.equal(progress.byArea[members[0].areaId].primary.areaId,members[4].areaId);
});

test('an unreviewed skill is visible without blocking a reviewed area or changing grades',()=>{
  const a=get('node:advanced:math-lab:expressions');
  const b=get('node:advanced:math-lab:numeric-limits');
  const c=get('node:advanced:loop-lab:looptype');
  const records=Array.from({length:12},(_,seed)=>sample(a,'math-lab','expressions',undefined,seed));
  const p=evaluateProficiency({courseId:'advanced',nodes:[a,b,c],eventsByNode:new Map([[a.id,records]])});
  assert.equal(p.areas[a.areaId].readyToAdvance,true);
  assert.deepEqual(p.areas[a.areaId].unavailable,[b.id]);
  assert.equal(p.byArea[a.areaId].primary.kind,'continue-learning');
  assert.equal(p.skills[a.id].standardsScore,null);
});

test('CSP recognition, list application and repeated incorrect attempts remain separate',()=>{
  const node=csp('LISTS');
  const basics=Array.from({length:12},(_,i)=>{
    const family='lists/'+['index','insert','append'][i%3];
    return record(node,'code-concepts','lists',family,{topic:family});
  });
  assert.equal(evaluateSkillProficiency(node,basics).level,2);
  const first=record(node,'list-lab','execute','list-execute:remove-append-insert-append',{correct:false});
  const retry={...first,id:first.questionId+':2',attemptNumber:2,firstAttempt:false,correct:true};
  const unrelated=record(node,'list-lab','build','list-execute:remove-append-insert-append');
  const result=evaluateSkillProficiency(node,[...basics,first,retry,unrelated,first]);
  assert.equal(result.tiers.intermediate.answered,1);
  assert.equal(result.tiers.intermediate.correct,0);
  assert.equal(result.evidenceQuality.unclassified,1);
});
