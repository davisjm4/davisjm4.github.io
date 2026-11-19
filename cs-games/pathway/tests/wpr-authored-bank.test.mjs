import '../../teacher/test-runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {items,authoredItems} from '../../../wpr-games/workplace-readiness/service/issued-practice-bank.mjs';
import {issuePractice,scoreIssuedPractice} from '../../../wpr-games/workplace-readiness/service/issued-practice.mjs';
import {startDev} from '../../../wpr-games/workplace-readiness/service/dev.mjs';
import {itemIssues,bankIssues,cueFailures,jaccard} from '../audit/wpr-mastery/authored-bank.mjs';
import {WPR_CANDIDATE_TIERS,WPR_AUTOMATIC} from '../mastery/wpr-automatic.mjs';

const SIX=['information-security:security-procedures','integrity:honesty-and-fairness','information-literacy:evaluate-credibility',
  'information-technology:software-and-applications','reading-and-writing:interpret-documents','job-specific-tools-and-technologies:safe-use'];
const secret='synthetic-worker-signing-secret-for-tests-only';
const now=Date.UTC(2026,10,20);
const profile={id:'p1',class_id:'c1',generation:1,course_id:'workplace'};

test('every authored family passes the structural, decisive-fact and explanation gate',()=>{
  for (const item of authoredItems) assert.deepEqual(itemIssues(item),[],item.id);
});
test('authored bank has no duplicate identities and no overlapping situations or choice sets',()=>{
  assert.deepEqual(bankIssues(authoredItems),[]);
  for (const key of ['id','family']) assert.equal(new Set(items.map(i=>i[key])).size,items.length,key);
});
test('each priority skill has twenty distinct server-scoreable families and no answer cue',()=>{
  for (const concept of SIX) {
    const all=items.filter(i=>i.concept===concept);
    assert.ok(all.length>=20,concept+' has '+all.length);
    assert.deepEqual(cueFailures(authoredItems.filter(i=>i.concept===concept)),[],concept);
    assert.ok(Object.hasOwn(WPR_CANDIDATE_TIERS,concept));
  }
});
test('regression: renaming people, places or numbers alone cannot make two families distinct',()=>{
  // A synthetic skin of an existing family must be rejected as the same situation.
  const base=authoredItems[0];
  const skin={...base,id:'skin',family:'authored:skin',decision:'skin',scenario:base.scenario.replace(/clinic/g,'warehouse').replace(/badge/g,'card')};
  assert.ok(bankIssues([base,skin]).some(x=>x.issue==='near-duplicate-situation'));
  assert.ok(jaccard(base.scenario,skin.scenario)>0.5);
});
test('regression: the gate rejects a keyed answer that is the unique longest option and an invented rule',()=>{
  const base={...authoredItems[0]};
  const longBest={...base,best:1,choices:base.choices.map((c,i)=>i===1?c+' and then document every detail of the whole exchange for the file':c)};
  assert.ok(cueFailures(Array(10).fill(longBest)).includes('longest-answer-shortcut'));
  assert.ok(itemIssues({...base,decisive:'a rule that appears nowhere in this scenario'}).includes('decisive-fact-not-in-scenario'));
  assert.ok(itemIssues({...base,why:'Correct.'}).length>0);
});

test('issued authored questions hide the key and credit only allowlisted skills, scored on the server',async()=>{
  const allow={[SIX[0]]:'quick'};
  for (const concept of SIX) {
    const item=items.find(i=>i.concept===concept&&i.decision);
    const issued=await issuePractice(secret,profile,item.id,now);
    assert.deepEqual(Object.keys(issued.question).sort(),['context','difficulty','mode','options','prompt','scenario','skill']);
    const pick=text=>issued.question.options.find(o=>o.text===text).id;
    const right=await scoreIssuedPractice(secret,profile,{id:issued.id,version:issued.version,presented:issued.presented,permit:issued.permit,kind:'practice',format:'wpr-issued-v1',response:pick(item.choices[item.best])},now+1000,allow);
    assert.equal(right.data.correct,true);
    assert.equal(right.data.dimensions.length,concept===SIX[0]?1:0,'allowlist controls credit '+concept);
    const wrong=await scoreIssuedPractice(secret,profile,{id:issued.id,version:issued.version,presented:issued.presented,permit:issued.permit,kind:'practice',format:'wpr-issued-v1',response:pick(item.choices[(item.best+1)%4])},now+1000,allow);
    assert.equal(wrong.data.correct,false);
    assert.equal(wrong.feedback.lines.length,5);
    // default allowlist is empty, so nothing earns node credit until release review enables a skill
    const none=await scoreIssuedPractice(secret,profile,{id:issued.id,version:issued.version,presented:issued.presented,permit:issued.permit,kind:'practice',format:'wpr-issued-v1',response:pick(item.choices[item.best])},now+1000);
    assert.deepEqual(none.data.dimensions,[]);
    assert.equal(Object.keys(WPR_AUTOMATIC).length,0);
  }
});
test('credit is refused for another profile, class, altered version, expired permit and tampered concept',async()=>{
  const item=authoredItems[0];
  const issued=await issuePractice(secret,profile,item.id,now);
  const id=issued.question.options.find(o=>o.text===item.choices[item.best]).id;
  const base={id:issued.id,version:issued.version,presented:issued.presented,permit:issued.permit,kind:'practice',format:'wpr-issued-v1',response:id};
  const allow={[item.concept]:'q'};
  assert.ok(await scoreIssuedPractice(secret,profile,base,now+1,allow));
  for (const other of [{...profile,id:'p2'},{...profile,class_id:'c2'},{...profile,generation:2}]) assert.equal(await scoreIssuedPractice(secret,other,base,now+1,allow),null);
  assert.equal(await scoreIssuedPractice(secret,profile,{...base,version:'x'},now+1,allow),null);
  assert.equal(await scoreIssuedPractice(secret,profile,{...base,topic:SIX[1]},now+1,allow),null);
  assert.equal(await scoreIssuedPractice(secret,profile,base,now+8*86400000,allow),null);
  assert.equal(await scoreIssuedPractice(secret,{...profile,course_id:'csp'},base,now+1,allow),null);
});
test('end to end: an authored family keeps the first response through replay and altered resubmission',async t=>{
  const {server,db,url}=await startDev({teacherTokens:{teacher:'synthetic-wpr-evidence-teacher'},submissionSecret:secret});
  t.after(async()=>{await new Promise(r=>server.close(r));db.close();});
  const api=async(path,token,body)=>{const h=body===undefined?{}:{'Content-Type':'application/json'};if(token)h.Authorization='Bearer '+token;
    const r=await fetch(url+'/api/wpr'+path,{headers:h,method:body===undefined?'GET':'POST',body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  const cls=(await api('/teacher/profiles','synthetic-wpr-evidence-teacher',{title:'Authored bank',courseId:'workplace'})).body;
  const learner=(await api('/profile/enroll',null,{invite:cls.invite})).body;
  const list=await api('/profile/wpr-issue',learner.token);
  assert.equal(list.status,200,JSON.stringify(list.body));
  assert.ok(list.body.items.length>=122);
  const item=authoredItems.find(i=>i.concept===SIX[4]);
  const issued=(await api('/profile/wpr-issue',learner.token,{itemId:item.id})).body;
  const opt=text=>issued.question.options.find(o=>o.text===text).id;
  const event=r=>({id:issued.id,version:issued.version,presented:issued.presented,permit:issued.permit,kind:'practice',format:'wpr-issued-v1',response:r});
  const first=await api('/profile/sync',learner.token,{events:[event(opt(item.choices[(item.best+1)%4]))]});
  assert.deepEqual(first.body.accepted,[issued.id]);
  assert.equal(first.body.scored[issued.id].correct,false);
  const again=await api('/profile/sync',learner.token,{events:[event(opt(item.choices[(item.best+1)%4]))]});
  assert.deepEqual(again.body.accepted,[issued.id]);
  const altered=await api('/profile/sync',learner.token,{events:[event(opt(item.choices[item.best]))]});
  assert.equal(altered.body.rejected?.[0]?.code,'first-response-already-recorded');
  assert.equal(db.prepare("SELECT COUNT(*) n FROM performance_events WHERE activity='workplace-readiness'").get().n,1);
  const guest=await api('/profile/wpr-issue',null,{itemId:item.id});
  assert.equal(guest.status,401);
});
