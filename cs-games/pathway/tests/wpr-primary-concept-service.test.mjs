import '../../teacher/test-runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {startDev} from '../../../wpr-games/workplace-readiness/service/dev.mjs';
import {issuePractice} from '../../../wpr-games/workplace-readiness/service/issued-practice.mjs';
import {DAY} from '../../../wpr-games/workplace-readiness/online/profile-model.mjs';

const teacher='synthetic-wpr-evidence-teacher';
const secret='synthetic-worker-signing-secret-for-tests-only';
async function fixture(t) {
  const {server,db,url}=await startDev({teacherTokens:{teacher},submissionSecret:secret});
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();});
  async function api(path,token,body) {
    const headers=body===undefined?{}:{'Content-Type':'application/json'};
    if(token)headers.Authorization='Bearer '+token;
    const r=await fetch(url+'/api/wpr'+path,{headers,method:body===undefined?'GET':'POST',body:JSON.stringify(body)});
    return {status:r.status,body:await r.json()};
  }
  const enroll=async classroom=>(await api('/profile/enroll',null,{invite:classroom.invite})).body;
  const classroom=async title=>(await api('/teacher/profiles',teacher,{title,courseId:'workplace'})).body;
  const a=await classroom('Synthetic WPR A'), b=await classroom('Synthetic WPR B');
  const learner=await enroll(a);
  const sync=(event,token=learner.token)=>api('/profile/sync',token??null,{events:[event]});
  const issued=(await api('/profile/wpr-issue',learner.token,{itemId:'chemical-response'})).body;
  const {id,version,presented,permit}=issued;
  assert.ok(permit);
  const event={id,version,presented,permit,kind:'practice',format:'wpr-issued-v1',response:issued.question.options.find(o=>o.text.startsWith('Call the supervisor yourself')).id};
  return {db,api,learner,issued,event,sync,enroll,a,b};
}
const rows=(db)=>db.prepare("SELECT id,data FROM performance_events WHERE activity='workplace-readiness'").all();
const denied=(result,code='invalid-workplace-issuance')=>{
  assert.equal(result.status,200);
  assert.deepEqual(result.body.accepted,[]);
  assert.equal(result.body.rejected?.[0]?.code,code);
};

test('issuance hides the key and explanations and requires an enrolled profile',async t=>{
  const {api,issued,learner}=await fixture(t);
  assert.equal((await api('/profile/wpr-issue',null,{itemId:'chemical-response'})).status,401);
  assert.equal((await api('/profile/wpr-issue',learner.token,{itemId:'client-created'})).status,404);
  assert.deepEqual(Object.keys(issued.question).sort(),['context','difficulty','mode','options','prompt','scenario','skill']);
  assert.ok(issued.question.options.every(o=>Object.keys(o).length===2));
  const payload=JSON.parse(Buffer.from(issued.permit.split('.')[0],'base64url'));
  assert.deepEqual(Object.keys(payload).sort(),['classId','expires','generation','id','issued','itemId','nonce','presented','profile','version']);
});

test('fabricated identity, skill, family, content, version and client score cannot be credited',async t=>{
  const {event,sync,db}=await fixture(t);
  for(const changes of [{id:'wpr-issued:'+randomUUID()},{topic:'teamwork:respect-contributions'},
    {familyId:'repaired:credit-overlooked-contribution'},{version:'another-version'},{presented:'other-content'},
    {correct:true},{bestId:'0'},{response:'4'},{permit:event.permit.replace(/.$/,'!')}]) {
    denied(await sync({...event,...changes}));
  }
  const q=randomUUID();
  denied(await sync({id:q+':1',version:1,kind:'practice',format:'game-attempt',courseId:'workplace',
    activity:'workplace-readiness',correct:true,questionId:q,familyId:'a:CON-D-001',
    topic:'conflict-resolution:diplomatic-negotiation'}),'unverified-workplace-attempt');
  assert.deepEqual(rows(db),[]);
});

test('first submitted response is scored on the server and survives concurrent duplicate and altered replay',async t=>{
  const {event,issued,sync,db}=await fixture(t);
  const copies=await Promise.all([sync(event),sync(event),sync(event)]);
  for(const r of copies) {
    assert.deepEqual(r.body.accepted,[event.id]);
    assert.equal(r.body.scored[event.id].correct,false);
    assert.equal(r.body.scored[event.id].masteryEligible,false);
    assert.match(r.body.scored[event.id].lines[0].text,/posted response/);
  }
  denied(await sync({...event,response:issued.question.options.find(o=>o.text.startsWith('Help the coworker')).id}),'first-response-already-recorded');
  const [row]=rows(db);
  assert.equal(rows(db).length,1);
  assert.equal(JSON.parse(row.data).response,'1');
  assert.deepEqual(JSON.parse(row.data).dimensions,[]);
});

test('guest, wrong learner, wrong class, expiry and revoked issuance are isolated and delayed sync is scored',async t=>{
  const {event,sync,db,learner,enroll,api,a,b}=await fixture(t);
  const second=await enroll(a), outsider=await enroll(b);
  for (const student of [second,outsider]) denied(await sync(event,student.token));
  denied(await sync({...event,learner:'guest'}),'profile-scope');
  denied(await sync({...event,classId:b.id}),'profile-scope');
  assert.equal((await sync(event,null)).status,401);
  const row=db.prepare('SELECT id,class_id,generation FROM student_profiles WHERE id=?').get(learner.id);
  const scope={...row,course_id:'workplace'};
  const obtain=async age=>{
    const {id,version,presented,permit,question}=await issuePractice(secret,scope,'credit-team-contribution',Date.now()-age);
    return {...event,id,version,presented,permit,response:question.options.find(o=>o.text.startsWith('Credit Mina')).id};
  };
  denied(await sync(await obtain(8*DAY)));
  const offline=await obtain(4*DAY);
  const submitted=await sync(offline);
  assert.equal(submitted.body.scored[offline.id].correct,true);
  assert.equal(rows(db).length,1);
  db.prepare('UPDATE student_profiles SET generation=generation+1 WHERE id=?').run(learner.id);
  assert.equal((await sync(event)).status,401);
  const restored=(await api('/profile/restore',null,{id:learner.id,recovery:learner.recovery})).body;
  denied(await sync(event,restored.token));
  assert.equal(rows(db).length,1);
});
