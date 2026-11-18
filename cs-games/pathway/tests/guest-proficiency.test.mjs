import assert from 'node:assert/strict';
import {test} from 'node:test';
import graph from '../curriculum-graph.json' with {type:'json'};
import {QUESTIONS} from '../../../csp-games/digital-divide-lab/engine.js';
import {buildGuestView} from '../../student/guest/pathway.mjs';
import {guestEventFromAttempt,reconcileEvents} from '../../student/guest/evidence.mjs';
import {emptyState} from '../../student/guest/store.mjs';
import {inputFromStudentContract} from '../../student/map/live-contract.mjs';
import {buildMapModel} from '../../student/map/model.mjs';
import {generateTrace} from '../../../java-games/variable-lab/trace-adapter.js';

test('a single Mixed Practice setting supplies distinct evidence levels in the independent map',()=>{
  const now=Date.parse('2026-11-12T12:00:00Z');
  const state=emptyState(now);
  const add=questions=>questions.forEach(q=>{
    const id='question-'+(state.events.length+1);
    state.events.push(guestEventFromAttempt('csp',{
      id,game:'digital-divide-lab',submissions:1,mode:'mixed',
      topic:`bi5:divide:${q.topic}:${q.barrier}`,
      details:{selectedMode:'mixed',practiceMode:q.mode,family:q.family}
    },true,new Date(now).toISOString()));
  });
  const skill='node:csp:digital-divide-lab:CSP-DIVIDE';
  const outcomes=()=>buildGuestView(graph,'csp',state).proficiency.skills[skill];
  const samples=QUESTIONS.filter(q=>q.variant<=1);
  add(samples.filter(q=>q.mode==='barrier'));
  assert.equal(outcomes().level,2);
  add(samples.filter(q=>q.mode==='impact'||q.mode==='solution'));
  assert.equal(outcomes().level,3);
  add(samples.filter(q=>q.mode==='evidence'));
  reconcileEvents(state,graph);
  const view=buildGuestView(graph,'csp',state);
  const map=buildMapModel(inputFromStudentContract(view));
  assert.equal(map.nodeIndex[skill].proficiency.level,4);
  assert.equal(map.nodeIndex[skill].standardsScore,null);
  assert.equal(map.enrolled,false);
  assert.equal(map.nodeIndex[skill].practice.every(link=>link.url.includes('learner=guest')),true);
});

test('guest recommendation skips familiar skills without giving any proficiency credit',()=>{
  const state=emptyState(Date.now());
  const area='area:advanced:variable-lab';
  state.marks[area]={state:'familiar',at:new Date().toISOString(),courseId:'advanced'};
  const view=buildGuestView(graph,'advanced',state);
  assert.notEqual(view.proficiency.recommendation.primary.areaId,area);
  assert.equal(view.proficiency.areas[area].readyToAdvance,false);
  assert.ok(view.nodes.filter(n=>n.areaId===area).every(n=>view.proficiency.skills[n.id].level===0));
});

test('independent Trace ring follows qualifying evidence and completion takes the skill out of recommendations',()=>{
  const now=Date.parse('2026-11-12T12:00:00Z');
  const state=emptyState(now);
  const skill='node:advanced:variable-lab:trace';
  const build=()=>buildMapModel(inputFromStudentContract(buildGuestView(graph,'advanced',state)));
  const add=(i,correct)=>{
    const q=generateTrace({difficulty:'intermediate',seed:i+1});
    state.events.push(guestEventFromAttempt('advanced',{
      id:'trace-'+i,game:'variable-lab',submissions:1,mode:'trace',topic:q.topic,
      details:{selectedMode:'mixed',practiceMode:'trace',family:q.traceFamily,difficulty:q.difficulty}
    },correct,new Date(now+i).toISOString()));
  };
  for(let i=0;i<5;i++) add(i,i!==0);
  let node=build().nodeIndex[skill];
  assert.equal(node.skillTarget.count,'5 of 8 qualifying answers');
  assert.equal(node.skillTarget.correct,4);
  assert.ok(node.ring.fraction<=5/8);
  assert.equal(node.complete,false);
  for(let i=5;i<10;i++) add(i,true);
  const map=build();
  node=map.nodeIndex[skill];
  assert.equal(node.proficiency.level,3);
  assert.equal(node.proficiency.tiers.beginner.answered,0);
  assert.equal(node.state,'requirements-met');
  assert.equal(node.ring.fraction,1);
  assert.notEqual(map.suggestedNext?.nodeId,skill);
  assert.equal(node.proficiency.extensionAvailable,true);
});
