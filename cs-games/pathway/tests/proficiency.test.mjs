import assert from 'node:assert/strict';
import {test} from 'node:test';
import graph from '../curriculum-graph.json' with {type:'json'};
import {generateTrace} from '../../../java-games/variable-lab/trace-adapter.js';
import {QUESTIONS as divide} from '../../../csp-games/digital-divide-lab/engine.js';
import {QUESTIONS as numeric} from '../../../csp-games/roundoff-overflow-lab/engine.js';
import {cleanGameAttempt} from '../../../wpr-games/workplace-readiness/service/profile-evidence.mjs';
import {normalizeEvent} from '../mastery/events.mjs';
import {auditedDifficulty} from '../proficiency/catalog.mjs';
import {evaluateProficiency,evaluateSkillProficiency} from '../proficiency/index.mjs';

const trace=graph.nodes.find(n=>n.id==='node:advanced:variable-lab:trace');
const div=graph.nodes.find(n=>n.id.endsWith(':CSP-DIVIDE'));
const num=graph.nodes.find(n=>n.id.endsWith(':CSP-NUMERIC'));
const scope={profileId:'synthetic-learner',classId:'synthetic-class'};
const sessionId='00000000-0000-4000-8000-000000000001';
let sequence=0;
function raw(node,activity,assessedMode,topic,familyId,difficulty){
  const questionId=`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`;
  return {id:questionId+':1',questionId,sessionId,courseId:node.courseId,activity,mode:'mixed',assessedMode,
    topic,familyId,difficulty,attempt:1,correct:true,occurred:Date.parse('2026-11-11T12:00:00Z')+sequence};
}
function normalize(input){
  const result=normalizeEvent(input,{graph,scope});
  assert.equal(result.ok,true,result.reason);
  return result.event;
}
function java(tier,count=30){
  return Array.from({length:count},(_,i)=>{
    const q=generateTrace({difficulty:tier,seed:i+1});
    return normalize(raw(trace,'variable-lab','trace',q.topic,q.traceFamily,q.difficulty));
  });
}
const skill=records=>evaluateSkillProficiency(trace,records);
test('trace tiers enforce difficulty, first attempts, and breadth using real generator metadata',()=>{
  const beginner=java('beginner'), intermediate=java('intermediate'), advanced=java('advanced');
  assert.equal(skill(beginner).level,2);
  assert.equal(skill(intermediate).level,3);
  assert.equal(skill(intermediate).tiers.beginner.answered,0);
  assert.equal(skill([...intermediate,...advanced]).level,4);
  assert.equal(skill(advanced).level,1);
  assert.equal(skill(advanced).highestDemonstratedDifficulty,'advanced');
  const narrow=skill([...beginner,...intermediate.filter(e=>/\/(int|double)$/.test(e.topic))]);
  assert.equal(narrow.level,2);
  assert.ok(narrow.tiers.intermediate.missing.subskills.some(x=>x.id==='non-numeric'));
  assert.equal(skill(beginner.map(e=>({...e,difficulty:null}))).level,0);
  assert.equal(skill(beginner.map(e=>({...e,difficulty:'advanced'}))).level,0);
  assert.equal(skill(Array(20).fill(beginner[0])).tiers.beginner.answered,1);
  assert.equal(skill([{...beginner[0],correct:false},{...beginner[0],id:beginner[0].questionId+':2',firstAttempt:false}]).level,0);
  assert.throws(()=>skill([beginner[0],{...beginner[1],scope:{profileId:'different'}}]),/one student scope/);
});

test('published policy overrides preserve tier isolation, recovery, and teacher score separation',()=>{
  const attempts=java('intermediate');
  const policy={id:'teacher:class',version:3,minimumQuestions:40,accuracy:.95,provisional:false,challenge:{}};
  const result=evaluateSkillProficiency({...trace,checkpoint:{score:4}},attempts,{policy});
  assert.equal(result.level,1);
  assert.equal(result.standardsScore,4);
  assert.equal(result.tiers.intermediate.minimumQuestions,40);
  assert.equal(result.tiers.intermediate.accuracy,.95);
  assert.equal(result.tiers.beginner.answered,0);
  assert.equal(result.trust,'formative');
  const wrong=attempts.slice(0,3).map(e=>({...e,correct:false}));
  assert.ok(skill(wrong).tiers.intermediate.recovery.additionalCorrectForAccuracy>0);
  assert.equal(skill([...wrong,...java('intermediate',48)]).level,3);
});

test('AP CSP uses source question families and ignores estimated mappings',()=>{
  const records=divide.filter(q=>q.variant<=1).map(q=>normalize(raw(div,'digital-divide-lab',q.mode,
    `bi5:divide:${q.topic}:${q.barrier}`,q.family)));
  assert.equal(evaluateSkillProficiency(div,records.filter(e=>e.assessedMode==='barrier')).level,2);
  assert.equal(evaluateSkillProficiency(div,records.filter(e=>['impact','solution'].includes(e.assessedMode))).level,3);
  assert.equal(evaluateSkillProficiency(div,records).level,4);
  const attempts=numeric.map(q=>normalize(raw(num,'roundoff-overflow-lab',q.answer.toLowerCase(),q.answer,q.family)));
  assert.equal(evaluateSkillProficiency(num,attempts).level,2);
  const repaired=raw(num,'roundoff-overflow-lab','overflow','Overflow',numeric[0].family);
  assert.equal(normalizeEvent({...repaired,assessedMode:null},{graph,scope}).reason,'no-assessed-mode');
  const row=cleanGameAttempt(repaired,()=>true);
  assert.deepEqual(row.data.dimensions.map(d=>d.id),[num.id]);
  assert.equal(auditedDifficulty(num,normalize(row)),'beginner');
  const estimated=raw(div,'mixed-ap-practice','scenario','impact/privacy','old-estimate');
  assert.equal(normalizeEvent(estimated,{graph,scope}).reason,'no-node-mapping');
  assert.equal(auditedDifficulty(div,{...records[0],familyId:'unknown'}),null);
});

test('area readiness requires foundations and core, then offers optional extension',()=>{
  const foundation=graph.nodes.find(n=>n.id.endsWith('variable-lab:assemble'));
  const math=graph.nodes.find(n=>n.id.startsWith('node:advanced:math-lab:'));
  const types=['int','double','String','int','double'].map(type=>normalize(raw(foundation,'variable-lab','assemble','assemble',`assemble/${type}`)));
  const args={courseId:'advanced',nodes:[trace,foundation,math],eventsByNode:new Map([[trace.id,java('intermediate')]])};
  const missing=evaluateProficiency({...args,familiarity:{[foundation.id]:true}});
  assert.equal(missing.skills[foundation.id].level,0);
  assert.equal(missing.areas[trace.areaId].readyToAdvance,false);
  assert.equal(missing.byArea[trace.areaId].primary.nodeId,foundation.id);
  args.eventsByNode.set(foundation.id,types);
  const ready=evaluateProficiency(args);
  assert.equal(ready.areas[trace.areaId].readyToAdvance,true);
  assert.equal(ready.byArea[trace.areaId].primary.kind,'continue-learning');
  assert.equal(ready.byArea[trace.areaId].primary.nodeId,math.id);
  assert.equal(ready.byArea[trace.areaId].extension.nodeId,trace.id);
  assert.equal(ready.skills[math.id].tiers.advanced.status,'unavailable');
});
