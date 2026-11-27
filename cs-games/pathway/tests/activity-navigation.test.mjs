import test from 'node:test';import assert from 'node:assert/strict';
import graph from '../curriculum-graph.json' with {type:'json'};
import {buildMapModel,findStop} from '../../student/map/model.mjs';
import {activityDestination,activityCounts} from '../../student/map/activity-routing.mjs';
import {groupCourseStops} from '../../student/map/course-groups.mjs';
import {inputFromStudentContract} from '../../student/map/live-contract.mjs';
import {createPathway,studentContract} from '../model.mjs';
import {codeQuestion,gradeCode,RGB_CODE_FAMILIES} from '../../../csp-games/rgb-color-builder/assessment.js';
import {guestEventFromAttempt,guestEvidenceByNode} from '../../student/guest/evidence.mjs';
import {evaluateSkillProficiency} from '../proficiency/index.mjs';
import {auditedEvidenceBand} from '../proficiency/catalog.mjs';
const model=courseId=>buildMapModel({graph,courseId,guest:true});

test('four courses retain every skill and only one navigation stop per activity area',()=>{
 for(const c of graph.courses){const m=model(c.id);assert.equal(m.nodes.length,graph.nodes.filter(n=>n.courseId===c.id).length);
 assert.equal(m.stops.length,new Set(m.nodes.map(n=>n.areaId)).size);
 assert.equal(m.stops.flatMap(s=>s.nodes).length,m.nodes.length);
 assert.ok(m.stops.every(s=>activityDestination(s).kind==='practice'));
 }
});
test('Binary consolidates all three stable skills; continuation bookmarks remain aliases',()=>{
 const m=model('csp'),s=findStop(m,'area:csp:binary-builder~2');
 assert.equal(s,findStop(m,'area:csp:binary-builder~1'));
 assert.deepEqual(s.nodes.map(n=>n.id.split(':').at(-1)),['CSP-BINARY','CSP-CAPACITY','CSP-REPRESENTATION']);
 assert.equal(activityDestination(s).activityId,'binary-builder');
});
test('Data counts are canonical activities and skills including unsupported assessment routes',()=>{
 const m=model('csp'),g=groupCourseStops(m).find(g=>g.id==='csp-2'),c=activityCounts(g.stops);
 assert.equal(c.activities,7);assert.equal(c.requiredActivities,7);assert.equal(c.skills,11);
 assert.equal(c.requiredSkills,11);assert.equal(c.completedActivities,0);
});
test('distinct games retain a choice; no-game activity opens demonstration instructions',()=>{
 const stop={areaId:'area:synthetic:multiple',nodes:[{id:'a',practice:[{activityId:'one'}]},{id:'b',practice:[{activityId:'two'}]}]};
 assert.equal(activityDestination(stop).kind,'map');
 assert.equal(activityDestination({...stop,nodes:[{id:'a',practice:[]}]}).kind,'demonstration');
});
test('excluded class skills never reappear in consolidated routing and overrides stay on each node',()=>{
 const p=createPathway(graph,{classId:'synthetic',courseId:'advanced',title:'Synthetic'});
 p.checkpoints[0].participation='excluded';
 const contract=studentContract(p,graph),m=buildMapModel(inputFromStudentContract(contract));
 assert.ok(!m.nodeIndex[p.checkpoints[0].nodeId]);
 const dest=activityDestination(m.stops[0]);assert.notEqual(dest.node.id,p.checkpoints[0].nodeId);
 assert.equal(m.nodes.length,contract.nodes.filter(n=>n.checkpoint.participation!=='excluded').length);
});
test('optional unfinished Level 4 cannot select ahead of an unfinished required target',()=>{
 const stop={areaId:'area:synthetic:game',nodes:[{id:'optional',required:false,complete:false,practice:[{activityId:'game',url:'/game/'}]},{id:'required',required:true,complete:false,practice:[{activityId:'game',url:'/game/'}]}]};
 assert.equal(activityDestination(stop).node.id,'required');
});
test('RGB exact answers independently round-trip all 256 channel values and six reasoning families',()=>{
 for(let n=0;n<256;n++)for(let i=0;i<6;i++){
  const q=codeQuestion(i,[n,255-n,n]);assert.ok(gradeCode(q,q.answers));
  assert.ok(!gradeCode(q,['wrong','wrong','wrong']));
  if(i<5)assert.deepEqual(q.answers.map(a=>parseInt(a,q.base)),[n,255-n,n]);
  else {const expected=[n,255-n,n];expected[i%3]+=expected[i%3]>127?-32:32;assert.deepEqual(q.answers.map(Number),expected);}
 }
 assert.equal(RGB_CODE_FAMILIES.length,6);
});
test('RGB measured evidence passes real guest mapping, meets Level 3, and preserves original evidence',()=>{
 const node=graph.nodes.find(n=>n.id==='node:csp:rgb-color-builder:CSP-RGB');
 const events=Array.from({length:12},(_,i)=>guestEventFromAttempt('csp',{id:'rgb-test-'+i,game:'rgb-color-builder',mode:'assessment',topic:'assessment',submissions:1,
 details:{practiceMode:'assessment',familyId:codeQuestion(i,[1,32,255]).family,difficulty:'intermediate',evidenceRevision:'rgb-objective-v1'}},true,'2026-11-27T09:00:00Z'));
 const before=JSON.stringify(events),normalized=guestEvidenceByNode(graph,events,'csp').get(node.id);
 const result=evaluateSkillProficiency(node,normalized);
 assert.equal(result.level,3);assert.equal(result.goalMet,true);assert.equal(result.tiers.advanced.status,'unavailable');
 assert.equal(JSON.stringify(events),before);
 assert.ok(!guestEvidenceByNode(graph,events,'advanced').has(node.id));
 const noChannels=normalized.filter(e=>!['rgb-code:code-to-decimal','rgb-code:channel-change'].includes(e.familyId));
 assert.equal(evaluateSkillProficiency(node,noChannels).goalMet,false);
});
test('RGB visual similarity, unknown families and legacy binary/hex matches never establish proficiency',()=>{
 const node=graph.nodes.find(n=>n.id==='node:csp:rgb-color-builder:CSP-RGB');
 for(const mode of ['binary','hex','explore','mixed'])assert.equal(auditedEvidenceBand(node,{activityId:'rgb-color-builder',assessedMode:mode,familyId:'rgb-code:binary-to-hex',evidenceRevision:'rgb-objective-v1'}),null);
 assert.equal(auditedEvidenceBand(node,{activityId:'rgb-color-builder',assessedMode:'assessment',familyId:'rgb-code:fake',evidenceRevision:'rgb-objective-v1'}),null);
 assert.equal(auditedEvidenceBand(node,{activityId:'rgb-color-builder',assessedMode:'assessment',familyId:'rgb-code:binary-to-hex'}),null);
 assert.equal(guestEventFromAttempt('csp',{id:'retry',game:'rgb-color-builder',submissions:2},true,Date.now()),null);
 assert.equal(guestEventFromAttempt('csp',{id:'assisted',game:'rgb-color-builder',submissions:1,details:{assisted:true}},true,Date.now()),null);
});
