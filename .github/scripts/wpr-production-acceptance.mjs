// Explicit synthetic-only production acceptance. Private profiles are supplied outside Git.
// Never print credentials, signed permits, raw requests, or real learner records.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {proceduralSkills,proceduralKitIds,proceduralSources,proceduralQuestion} from '../../wpr-games/workplace-readiness/service/procedural-practice.mjs';
import grader from '../../wpr-games/workplace-readiness/js/core/grader.js';
const dir=process.env.WPR_TEST_PRIVATE_DIR;
assert(dir,'WPR_TEST_PRIVATE_DIR must name a private directory of synthetic profiles');
const profiles=Object.fromEntries(['a','b','c','d'].map(k=>[k,JSON.parse(fs.readFileSync(`${dir}/profile-${k}.json`))]));
const base='https://cs-games-api.cs-games-davisjm4.workers.dev/api/wpr';
const origin='https://davisjm4.github.io';
const report={startedAt:new Date().toISOString(),environment:'production',syntheticOnly:true,checks:[],issued:0,scored:0,correct:0,incorrect:0};
const check=name=>{report.checks.push({name,passed:true});console.log(JSON.stringify({check:name,passed:true}));};
async function call(route,p,body) {
  const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{Origin:origin,...(p?{Authorization:'Bearer '+p.token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const data=await r.json();return {status:r.status,data};
}
async function get(route,p){const r=await call(route,p);assert.equal(r.status,200,`GET ${route} failed`);return r.data;}
function claim(issued){return JSON.parse(Buffer.from(issued.permit.split('.')[0],'base64url').toString());}
function event(issued,response){const {id,format,version,presented,permit}=issued;return {id,format,version,presented,permit,kind:'practice',response};}
async function issue(skill,p){const r=await call('/profile/wpr-procedural',p,{skillId:skill});assert.equal(r.status,200,`Issue ${skill}`);report.issued++;return r.data;}
async function send(e,p){const r=await call('/profile/sync',p,{events:[e]});assert.equal(r.status,200,'Synthetic synchronization');return r.data;}
const seenKits=new Set(),seenSkills=new Set(),formats=new Set(),seenPrimary=new Set();
const counts={a:0,b:0,c:0},caps={a:45,b:55,c:55};
const allSources=new Map(proceduralSkills.flatMap(proceduralSources).map(s=>[s.id,s]));
let first,firstEvent,firstQuestion,delayed;
try {
  const identities={};for(const k of ['a','b','c','d']) identities[k]=await get('/profile/identity',profiles[k]);
  for(const identity of Object.values(identities)) assert(identity.classTitle.startsWith('Synthetic PR68'),'Refusing a non-synthetic production profile');
  assert.equal(identities.a.courseId,'workplace');assert.equal(identities.b.classId,identities.a.classId);
  assert.notEqual(identities.c.classId,identities.a.classId);assert.equal(identities.c.courseId,'workplace');assert.equal(identities.d.courseId,'csp');
  check('four synthetic profiles in the intended class/course scopes');
  const catalog=await get('/profile/wpr-procedural',profiles.b);
  assert.deepEqual([...catalog.skills].sort(),[...proceduralSkills].sort());assert.equal(catalog.skills.length,22);assert.equal(catalog.masteryEligible,false);
  check('live catalog retains all 22 WPR areas and disables automatic mastery');
  const beforePlan=(await get('/pathways/student/'+profiles.a.classId,profiles.a)).pathway;
  const beforeOtherPlan=(await get('/pathways/student/'+profiles.c.classId,profiles.c)).pathway;
  assert(beforePlan.title.startsWith('Synthetic PR68'),'Refusing a non-synthetic class');assert(beforeOtherPlan.title.startsWith('Synthetic PR68'));
  const graph=JSON.parse(fs.readFileSync(new URL('../../cs-games/pathway/curriculum-graph.json',import.meta.url)));
  const objectiveIds=graph.nodes.filter(n=>n.courseId==='workplace').map(n=>n.id).sort();assert.equal(objectiveIds.length,94);
  assert.deepEqual(beforePlan.nodes.map(n=>n.id).sort(),objectiveIds);assert.equal(beforePlan.areas.length,22);
  assert.equal(beforePlan.nodes[0].checkpoint.score,3,'Expected the synthetic teacher preservation fixture');
  fs.writeFileSync(`${dir}/acceptance-plan-before.json`,JSON.stringify(beforePlan),{mode:0o600});
  check('published pathway retains all 94 objective IDs');
  for(const [p,foreign] of [[profiles.a,profiles.c.classId],[profiles.c,profiles.a.classId],[profiles.d,profiles.a.classId]]) assert.equal((await call('/pathways/student/'+foreign,p)).status,403);
  assert.equal((await call('/profile/wpr-procedural',profiles.d)).status,403);
  assert.equal((await call('/profile/wpr-procedural',profiles.d,{skillId:proceduralSkills[0]})).status,400);
  check('both cross-class directions and cross-course access are rejected');
  for(const skill of proceduralSkills) {
    const issued=await issue(skill,profiles.b);counts.b++;
    const c=claim(issued),q=proceduralQuestion(c.sourceId,c.seed);assert(q,'Live signed scenario is reproducible from merged content');
    assert.equal(issued.question.skill,skill);assert.equal(issued.question.key,undefined);assert.equal(issued.question.principle,undefined);
    const source=allSources.get(c.sourceId);assert(source,'Unknown production source');if(source.kitId)seenKits.add(source.kitId);seenSkills.add(skill);formats.add(q.mode);
    const wrong=grader.wrongResponses(q)[0],response=report.scored%8===0&&wrong?wrong:grader.solve(q);
    const expected=grader.grade(q,response),e=event(issued,response),synced=await send(e,profiles.b),feedback=synced.scored?.[issued.id];
    assert(feedback,'No server feedback');assert.equal(feedback.correct,expected.correct);assert.equal(feedback.masteryEligible,false);assert.equal(feedback.practiceOnly,true);
    if(q.mode==='find')assert.equal(feedback.problemId,q.key.problemId,'Find feedback must identify the actual problem');
    if(feedback.primaryConcept)seenPrimary.add(feedback.primaryConcept);
    report.scored++;report[expected.correct?'correct':'incorrect']++;
    if(!first && !expected.correct){first=issued;firstEvent=e;firstQuestion=q;}
  }
  check('all 22 areas issue signed key-free scenarios and score correctly in production');
  assert(first,'Expected a deliberately incorrect synthetic first response');
  const firstBefore=await get('/profile/me',profiles.b);
  const replay=await send(firstEvent,profiles.b);assert(replay.accepted?.includes(first.id));
  const alternative=grader.solve(firstQuestion);
  // First issued answer was deliberately wrong, so the correction must be rejected.
  const altered=await send(event(first,alternative),profiles.b);assert(altered.rejected?.some(r=>r.code==='first-response-already-recorded'));
  for(const p of [profiles.a,profiles.c,profiles.d]){const foreign=await send(firstEvent,p);assert(foreign.rejected?.some(r=>r.code==='invalid-workplace-issuance'));}
  const tampered=await send({...firstEvent,presented:'tampered'},profiles.b);assert(tampered.rejected?.length);
  const guest=await send({...firstEvent,learner:'guest'},profiles.b);assert(guest.rejected?.some(r=>r.code==='profile-scope'));
  const scope=await send({...firstEvent,classId:profiles.c.classId},profiles.b);assert(scope.rejected?.some(r=>r.code==='profile-scope'));
  assert.deepEqual((await get('/profile/me',profiles.b)).attempts,firstBefore.attempts);
  check('replay, altered first response, identity tampering and guest/class contamination cannot rewrite saved attempts');

  const kitArea=new Map(proceduralSkills.flatMap(skill=>proceduralSources(skill).filter(s=>s.kitId).map(s=>[s.kitId,skill])));
  while(seenKits.size<proceduralKitIds.length || formats.size<4) {
    const key=['b','c','a'].find(k=>counts[k]<caps[k]);assert(key,'Synthetic issuance budget exhausted before complete kit coverage');
    const missing=proceduralKitIds.filter(k=>!seenKits.has(k));const skill=missing.length?kitArea.get(missing[(report.issued-22)%missing.length]):proceduralSkills[report.issued%22];
    const issued=await issue(skill,profiles[key]);counts[key]++;
    const c=claim(issued),q=proceduralQuestion(c.sourceId,c.seed),source=allSources.get(c.sourceId);assert(q&&source);
    if(source.kitId)seenKits.add(source.kitId);formats.add(q.mode);
    const wrong=grader.wrongResponses(q)[0],response=report.scored%8===0&&wrong?wrong:grader.solve(q),expected=grader.grade(q,response);
    const synced=await send(event(issued,response),profiles[key]),feedback=synced.scored?.[issued.id];
    assert(feedback);assert.equal(feedback.correct,expected.correct);assert.equal(feedback.masteryEligible,false);
    if(q.mode==='find')assert.equal(feedback.problemId,q.key.problemId);
    if(feedback.primaryConcept)seenPrimary.add(feedback.primaryConcept);
    report.scored++;report[expected.correct?'correct':'incorrect']++;
    if(report.scored%10===0)console.log(JSON.stringify({progress:'live scenario coverage',scored:report.scored,kits:seenKits.size,formats:formats.size}));
  }
  assert.deepEqual([...seenKits].sort(),[...proceduralKitIds].sort());assert.deepEqual([...formats].sort(),['decision','find','nextstep','order']);
  check('all 15 new composition kits and all four response formats issued and scored through ordinary area selection');
  // An issued permit may be held while disconnected, then synchronized unchanged.
  const p=profiles.c,held=await issue('information-technology',p),heldClaim=claim(held);
  assert.equal(heldClaim.expires-heldClaim.issued,7*86400000);const heldQ=proceduralQuestion(heldClaim.sourceId,heldClaim.seed);delayed=event(held,grader.solve(heldQ));
  fs.writeFileSync(`${dir}/delayed-event.json`,JSON.stringify(delayed),{mode:0o600});
  const recovered=await call('/profile/restore',null,{id:p.id,recovery:p.recovery});assert.equal(recovered.status,200);assert.notEqual(recovered.data.token,p.token);
  const delayedSync=await send(JSON.parse(fs.readFileSync(`${dir}/delayed-event.json`)),recovered.data);assert.equal(delayedSync.scored?.[held.id]?.correct,true);
  check('seven-day permit survives delayed synchronization after recovery into a different session');
  const oldSession=await call('/profile/signout',p,{});assert.equal(oldSession.status,200);assert.equal((await call('/profile/me',p)).status,401);
  assert.equal((await call('/profile/me',recovered.data)).status,200);profiles.c={...p,...recovered.data};fs.writeFileSync(`${dir}/profile-c.json`,JSON.stringify(profiles.c),{mode:0o600});
  check('session revocation leaves the recovered session working');
  const afterPlan=(await get('/pathways/student/'+profiles.a.classId,profiles.a)).pathway;
  assert.deepEqual(afterPlan.policies,beforePlan.policies);assert.equal(afterPlan.revision,beforePlan.revision);
  assert.deepEqual(afterPlan.nodes.map(n=>n.id).sort(),objectiveIds);
  // Teacher assessments belong to checkpoints; preserve their recorded scores and awards.
  for(const before of beforePlan.nodes){const after=afterPlan.nodes.find(n=>n.id===before.id);for(const field of ['score','verifiedScore','mastery','mastered','awarded','assessment','assessmentScore'])if(Object.hasOwn(before.checkpoint,field))assert.deepEqual(after.checkpoint[field],before.checkpoint[field],`Official ${field} changed`);}
  check('published revision, teacher policies and checkpoint assessments survive additional practice');
  report.kits=[...seenKits].sort();report.formats=[...formats].sort();report.areas=seenSkills.size;report.objectiveIds=objectiveIds.length;report.distinctPrimaryObjectives=seenPrimary.size;
  report.syntheticIssuanceCounts=counts;report.completedAt=new Date().toISOString();report.status='passed';
} catch(error){report.status='failed';report.failure=error.message;process.exitCode=1;}
fs.writeFileSync('/tmp/csg-pr68-acceptance-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
