// Safe integration gate for CSG-PKG-08; synthetic evidence, no real profile changes.
import '../../teacher/test-runtime.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import graph from '../curriculum-graph.json' with { type: 'json' };
import registry from '../evidence-gap-registry.json' with { type: 'json' };
import { generateTrace } from '../../../java-games/variable-lab/trace-adapter.js';
import { createPathway, publicationSnapshot, studentContract } from '../model.mjs';
import * as operations from '../requirements/operations.mjs';
import { buildContentFacts } from '../requirements/limits.mjs';
import { normalizeEvent } from '../mastery/events.mjs';
import { evaluateProficiency } from '../proficiency/index.mjs';
import * as independent from '../proficiency/independent.mjs';

const NODE = 'node:advanced:variable-lab:trace';
const scope = { profileId: 'synthetic-learner', classId: 'synthetic-class' };
const ctx = operations.createContext({ graph, facts: buildContentFacts({ graph, registry }) });
const plain = () => createPathway(graph, { id:'p', classId:scope.classId, courseId:'advanced' });
const withTargets = (target) => {
  const r = operations.applyToClass(plain(), target, ctx);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  return r.pathway;
};
const nodesOf = (p) => studentContract(publicationSnapshot(p, graph, 1), graph, [], {}).nodes;
let serial = 0;
function evidence(count) {
  return Array.from({ length:count }, (_,i) => {
    const q = generateTrace({ difficulty:'intermediate', seed:i+1 });
    const questionId = '00000000-0000-4000-8000-' + String(++serial).padStart(12,'0');
    const r = normalizeEvent({ id:questionId+':1', questionId, sessionId:'00000000-0000-4000-8000-000000000001',
      courseId:'advanced', activity:'variable-lab', mode:'trace', assessedMode:'trace', topic:q.topic,
      familyId:q.traceFamily, difficulty:q.difficulty, attempt:1, correct:true, occurred:Date.parse('2026-11-11T12:00:00Z')+serial },
    { graph, scope });
    assert.equal(r.ok, true, r.reason);
    return r.event;
  });
}
const THIRTY = evidence(30), FIVE = evidence(5);
const input = (p, events) => ({courseId:'advanced', nodes:nodesOf(p), policies:p.policies, eventsByNode:new Map([[NODE,events]]) });

test('independent course level is invariant under stricter or looser teacher targets',()=>{
  for(const [events,expected] of [[THIRTY,3],[FIVE,1],[[],0]]) {
    const baseline=independent.evaluateCourseProficiency(input(plain(),events)).skills[NODE];
    assert.equal(baseline.level,expected);
    for(const rules of [{minimumQuestions:40,accuracy:.95},{minimumQuestions:5,accuracy:.5}]) {
      const p=withTargets(rules);
      const now=independent.evaluateCourseProficiency(input(p,events)).skills[NODE];
      assert.equal(now.level,baseline.level);
      assert.deepEqual(now.tiers,baseline.tiers);
      assert.equal(now.policy,null);
    }
  }
});

test('the existing legacy evaluator remains coupled, but the independent result does not',()=>{
  const strict=withTargets({minimumQuestions:40,accuracy:.95});
  const loose=withTargets({minimumQuestions:5,accuracy:.5});
  const a=evaluateProficiency(input(strict,THIRTY)).skills[NODE].level;
  const b=independent.evaluateCourseProficiency(input(strict,THIRTY)).skills[NODE].level;
  const c=evaluateProficiency(input(loose,FIVE)).skills[NODE].level;
  const d=independent.evaluateCourseProficiency(input(loose,FIVE)).skills[NODE].level;
  assert.deepEqual([a,b,c,d],[1,3,3,1]);
});

test('comparison separates live formative, course rubric, class target, and official teacher score',()=>{
  const p=withTargets({minimumQuestions:40,accuracy:.95});
  const n=nodesOf(p).map(n=>n.id===NODE?{...n,checkpoint:{...n.checkpoint,score:4}}:n);
  const compare=independent.compareOutcomes({courseId:'advanced',nodes:n,policies:p.policies,eventsByNode:new Map([[NODE,THIRTY]])});
  const row=compare.rows.find(r=>r.nodeId===NODE);
  assert.equal(row.legacy.level,1);
  assert.equal(row.course.level,3);
  assert.equal(row.official.score,4);
  assert.equal(row.direction,'legacy-lower');
  assert.equal(row.historical.state,'unavailable');
});

test('append-only history keeps earned progression and does not fabricate missing earlier results',()=>{
  const current={nodeId:NODE,level:3,goalMet:true};
  const empty=independent.emptyLevelHistory(scope);
  assert.equal(independent.historicalFor(null,NODE).state,'unavailable');
  const recorded=independent.recordLevel(empty,{nodeId:NODE,skill:current,evaluator:independent.EVALUATORS.legacy,
    policy:{id:'policy:req:class',version:1},pathwayRevision:1,recordedAt:'2026-11-01T12:00:00.000Z'});
  const repeated=independent.recordLevel(recorded,{nodeId:NODE,skill:current,evaluator:independent.EVALUATORS.legacy,
    policy:{id:'policy:req:class',version:1},pathwayRevision:1,recordedAt:'2026-11-02T12:00:00.000Z'});
  assert.equal(repeated.entries.length,1);
  assert.equal(empty.entries.length,0);
  const carried=independent.carriedProgression(recorded,NODE,{level:1});
  assert.equal(carried.earned,true);
  assert.equal(carried.carriedForward,true);
  assert.equal(carried.earnedUnder.policy.id,'policy:req:class');
  assert.throws(()=>independent.recordLevel(recorded,{nodeId:NODE,skill:current,evaluator:independent.EVALUATORS.course,
    policy:{id:'forbidden',version:1},recordedAt:'2026-11-02T12:00:00.000Z'}));
});

test('comparison leaves immutable inputs and official records unchanged',()=>{
  const p=withTargets({minimumQuestions:40,accuracy:.95});
  const original=nodesOf(p);
  const nodes=structuredClone(original);
  const official=new Map([[NODE,Object.freeze({id:'teacher-1',score:0})]]);
  const before=JSON.stringify([nodes,p.policies,THIRTY]);
  independent.compareOutcomes({courseId:'advanced',nodes,policies:p.policies,eventsByNode:new Map([[NODE,THIRTY]]),assessments:official});
  assert.equal(JSON.stringify([nodes,p.policies,THIRTY]),before);
  assert.equal(official.get(NODE).score,0);
  assert.equal(independent.compareOutcomes({courseId:'advanced',nodes,policies:p.policies,assessments:official}).rows.find(r=>r.nodeId===NODE).official.score,0);
});

test('historical migration is only a proposal, with append-only protections',()=>{
  const sql=fs.readFileSync(new URL('../proficiency/migration/0009_formative_level_history.proposed.sql',import.meta.url),'utf8');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS formative_level_history/);
  assert.match(sql,/formative_level_history_immutable/);
  assert.match(sql,/RAISE\(ABORT/);
  assert.match(sql,/Do not apply without approval/);
});
