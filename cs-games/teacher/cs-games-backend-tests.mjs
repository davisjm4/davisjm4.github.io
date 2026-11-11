import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {startDev,sqliteAdapter} from '../../wpr-games/workplace-readiness/service/dev.mjs';
import {profileHash} from '../../wpr-games/workplace-readiness/service/profiles.mjs';
import {teacherIdentity,teacherSession} from '../../wpr-games/workplace-readiness/service/auth.mjs';
import {createPathway} from '../pathway/model.mjs';
import {generatePacing} from '../pathway/pacing.mjs';
import {createPathwayClient} from '../pathway/client.mjs';
import graph from '../pathway/curriculum-graph.json' with {type:'json'};

const owner='synthetic-teacher-a-credential';
const other='synthetic-teacher-b-credential';
const nodeId='node:advanced:loop-lab:looptype';
const mapStorage=()=>{const items=new Map();return {getItem:key=>items.get(key),setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)};};

test('registered Google audience, verified external teacher email and signature are all required',async()=>{
  const algorithm={name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'};
  const keys=await crypto.subtle.generateKey(algorithm,true,['sign','verify']);
  const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key'};
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../wpr-games/workplace-readiness/service/migrations/0005_teacher_sessions.sql',import.meta.url),'utf8'));
  const env={DB:sqliteAdapter(db),GOOGLE_CLIENT_ID:'fictional-client',TEACHER_EMAILS:'teacher@fictional.example,second@independent.example'};
  const now=Math.floor(Date.now()/1000);
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  async function idToken(claims={}) {
    const unsigned=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:'https://accounts.google.com',aud:env.GOOGLE_CLIENT_ID,
      exp:now+3600,iat:now,sub:'10001',email:'teacher@fictional.example',email_verified:true,...claims});
    const sig=await crypto.subtle.sign(algorithm,keys.privateKey,new TextEncoder().encode(unsigned));
    return unsigned+'.'+Buffer.from(sig).toString('base64url');
  }
  const verify=token=>teacherIdentity(new Request('https://fictional.example/',{headers:{Authorization:'Bearer '+token}}),env);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async url=>{assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');return Response.json({keys:[jwk]});};
  try {
    assert.equal(await verify(await idToken()),'google:10001');
    assert.equal(await verify(await idToken({email:'second@independent.example',sub:'10002'})),'google:10002');
    for(const claims of [{email:'outsider@fictional.example'},{email_verified:false},{aud:'other-client'},{exp:now-1},{iss:'https://fictional.example'}]) {
      assert.equal(await verify(await idToken(claims)),null);
    }
    const valid=await idToken();
    assert.equal(await verify(valid.slice(0,valid.lastIndexOf('.')+1)+'bad-signature'),null);
    const session=await teacherSession(new Request('https://fictional.example/api/wpr/teacher/session',{
      method:'POST',headers:{Authorization:'Bearer '+valid}
    }),env);
    assert.equal(session.account,'teacher@fictional.example');
    assert.equal(await verify(session.token),'google:10001');
    env.TEACHER_EMAILS='second@independent.example';
    assert.equal(await verify(session.token),null,'allowlist changes revoke authorization immediately');
  } finally { globalThis.fetch=originalFetch;db.close(); }
});

test('profile classes connect practice, verified mastery and immutable pathway revisions across devices',async t=>{
  const dev=await startDev({teacherTokens:{one:owner,two:other}});
  t.after(()=>{dev.server.close();dev.db.close();});
  const call=async(path,token,body,opts={})=>{
    const res=await fetch(dev.url+'/api/wpr'+path,{method:opts.method||(body===undefined?'GET':'POST'),
      headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...opts.headers},
      body:body===undefined?undefined:JSON.stringify(body)});
    return {status:res.status,data:await res.json()};
  };
  async function ok(...args) {
    const response=await call(...args);
    assert.equal(response.status,200,JSON.stringify(response.data));
    return response.data;
  }
  assert.equal((await ok('/health')).databaseReady,true);
  assert.equal((await call('/health',null,undefined,{headers:{Origin:'https://unrelated.example'}})).status,403);
  assert.equal((await call('/teacher/profiles',null)).status,401);
  const classroom={id:crypto.randomUUID(),invite:'ab'.repeat(32)};
  dev.db.prepare('INSERT INTO profile_classes(id,owner,title,invite,created,expires,course_id) VALUES(?,?,?,?,?,?,?)')
    .run(classroom.id,'one','Synthetic Advanced CS',await profileHash(classroom.invite),Date.now(),Date.now()+86400000,'advanced');
  const foreign=await ok('/teacher/profiles',other,{title:'Different school',courseId:'advanced'});
  const roster='/teacher/profiles/'+classroom.id;


  let plan=createPathway(graph,{classId:classroom.id,courseId:'advanced',calendar:{start:'2026-11-02',end:'2026-12-18',
    weekdays:[1,2,3,4,5],minutes:80,rotation:['A','B'],classRotations:[],rotationOffset:0,overrides:[]}});
  plan.checkpoints=plan.checkpoints.filter(item=>item.nodeId===nodeId);
  plan.sequence=[nodeId];
  plan=generatePacing(plan,graph);
  assert.equal((await call('/pathways/teacher',owner,{...plan,classId:foreign.id})).status,404);
  await ok('/pathways/teacher',owner,plan);
  const student=await ok('/profile/enroll',null,{invite:classroom.invite});
  const restored=await ok('/profile/restore',null,{id:student.id,recovery:student.recovery});
  assert.equal(restored.id,student.id);
  assert.equal(restored.classId,classroom.id);
  assert.notEqual(restored.token,student.token);
  assert.equal((await call('/profile/me',student.id)).status,401);
  assert.equal((await call(roster+'/students/'+student.id,other)).status,404);
  assert.equal((await call('/pathways/student/'+foreign.id,student.token)).status,403);
  assert.equal((await call('/profile/restore',null,{id:student.id,recovery:student.recovery,email:'synthetic@fictional.example'})).status,401);
  const editor='/pathways/teacher/'+plan.id;
  const studentPath='/pathways/student/'+classroom.id;
  assert.equal((await call(studentPath,student.token)).status,404);
  async function publish() {
    const {previewToken,draftVersion,expectedRevision}=await ok(editor+'/preview',owner,{});
    return (await ok(editor+'/publish',owner,{previewToken,draftVersion,expectedRevision})).published;
  }
  plan=await publish();
  const originalDate=plan.checkpoints[0].targetDate;
  const first=await ok(studentPath,student.token);
  assert.equal(first.pathway.revision,1);
  assert.equal((await ok(studentPath+'?known='+encodeURIComponent(first.cacheKey),restored.token)).unchanged,true);
  const attempt=(overrides={})=>{
    const questionId=overrides.questionId||crypto.randomUUID();
    const ordinal=overrides.attempt||1;
    return {version:1,format:'game-attempt',kind:'practice',id:questionId+':'+ordinal,questionId,sessionId:crypto.randomUUID(),
      courseId:'advanced',activity:'loop-lab',mode:'mixed',assessedMode:'looptype',familyId:'count-with-header',difficulty:'beginner',
      attempt:ordinal,correct:false,occurred:Date.now(),...overrides};
  };
  const failed=attempt({answer:'private synthetic answer text',email:'synthetic@fictional.example'});
  const retried=attempt({questionId:failed.questionId,sessionId:failed.sessionId,attempt:2,correct:true});
  const csp=attempt({courseId:'csp',activity:'boolean-gatekeeper',assessedMode:'evaluate',correct:true});
  const robotics=attempt({courseId:'robotics',activity:'parts-sprint',assessedMode:'learn',topic:'structure',correct:true,assisted:true});
  const events=[failed,retried,csp,robotics];
  for(const result of await Promise.all([ok('/profile/sync',student.token,{events}),ok('/profile/sync',restored.token,{events})])) {
    assert.deepEqual(result.accepted,events.map(event=>event.id));
  }
  let report=await ok(roster+'/students/'+student.id,owner);
  assert.deepEqual(report.activity.find(row=>row.activity==='loop-lab'),{pathway:'advanced',activity:'loop-lab',kind:'practice',events:2,n:1,c:0});
  assert.equal(report.activity.find(row=>row.activity==='parts-sprint').n,0);
  assert.equal(report.measures.find(row=>row.id===nodeId).n,1);
  assert.equal(report.verifiedEvidence.length,0);
  assert.equal(report.pathway.nodes[0].checkpoint.score,null);
  assert.doesNotMatch(JSON.stringify(report),/private synthetic answer text|synthetic@fictional/);
  assert.equal(report.attempts.find(row=>row.id===failed.id).receivedUnderRevision,1);
  const assessment={id:crypto.randomUUID(),nodeId,score:3.5,award:true,revision:1};
  const evidence=roster+'/students/'+student.id+'/evidence';
  assert.equal((await call(evidence,student.token,assessment)).status,401);
  assert.equal((await call(evidence,other,assessment)).status,404);
  await ok(evidence,owner,assessment);
  await ok(evidence,owner,assessment);
  const awarded=await ok(studentPath+'?known='+encodeURIComponent(first.cacheKey),restored.token);
  assert.equal(awarded.pathway.nodes[0].checkpoint.score,3.5);
  assert.equal(awarded.pathway.nodes[0].checkpoint.completion,'complete');

  const profileClient=createPathwayClient({storage:mapStorage(),scope:student.id,load:()=>ok(studentPath,student.token)});
  await profileClient.sync();
  profileClient.setActive(true);
  const draft=(await ok(editor,owner)).draft;
  draft.checkpoints[0].targetDate='2026-12-01';
  draft.checkpoints[0].targetLocked=true;
  const {draftVersion}=await ok(editor,owner);
  await ok(editor+'/draft',owner,{pathway:draft,draftVersion});
  assert.equal((await ok(studentPath,student.token)).pathway.revision,1);
  plan=await publish();
  assert.equal(plan.revision,2);
  await profileClient.sync();
  assert.equal(profileClient.current.revision,1);
  profileClient.setActive(false);
  assert.equal(profileClient.current.nodes[0].checkpoint.targetDate,'2026-12-01');
  assert.equal(profileClient.current.nodes[0].checkpoint.score,3.5);
  assert.equal((await ok(studentPath,restored.token)).pathway.revision,2);
  assert.equal((await call(evidence,owner,{...assessment,id:crypto.randomUUID()})).status,409);

  await ok('/profile/sync',student.token,{events:[attempt({correct:true})]});
  const current=await ok(editor,owner);
  await ok(editor+'/rollback',owner,{revision:1,draftVersion:current.draftVersion});
  assert.equal((await publish()).revision,3);
  report=await ok(roster+'/students/'+student.id,owner);
  assert.equal(report.pathway.nodes[0].checkpoint.targetDate,originalDate);
  assert.equal(report.pathway.nodes[0].checkpoint.completion,'complete');
  assert.equal(report.verifiedEvidence.length,2);
  assert.equal(report.attempts.length,5);
  assert.equal(dev.db.prepare('SELECT event_count FROM student_profiles WHERE id=?').get(student.id).event_count,6);
});

test('additive migrations preserve legacy profile events and clear deleted profile pacing history',()=>{
  const db=new DatabaseSync(':memory:');
  const migration=name=>readFileSync(new URL('../../wpr-games/workplace-readiness/service/migrations/'+name,import.meta.url),'utf8');
  try {
    for(const name of ['0001_reporting.sql','0002_pathways.sql','0003_profiles.sql']) db.exec(migration(name));
    db.exec("INSERT INTO profile_classes(id,owner,title,invite,created,expires) VALUES('class','teacher','Synthetic','digest',1,9999999999999);");
    db.exec("INSERT INTO student_profiles(id,class_id,recovery,created) VALUES('student','class','digest',1);");
    db.exec("INSERT INTO performance_events VALUES('student','historical',1,'workplace-readiness','workplace-readiness-games','practice',1,'{\"n\":1,\"c\":1}');");
    db.exec(migration('0004_integrated_progress.sql'));
    db.exec(migration('0006_class_creation_requests.sql'));
    assert.equal(db.prepare("SELECT creation_request FROM profile_classes WHERE id='class'").get().creation_request,null);
    assert.equal(db.prepare("SELECT course_id FROM profile_classes WHERE id='class'").get().course_id,'workplace');
    assert.equal(db.prepare("SELECT event_count FROM student_profiles WHERE id='student'").get().event_count,1);
    assert.equal(db.prepare("SELECT data FROM performance_events WHERE id='historical'").get().data,'{"n":1,"c":1}');
    db.exec("INSERT INTO class_pathways(id,class_id,owner,draft,created) VALUES('path','class','teacher','{}',1);");
    db.exec("INSERT INTO pathway_status_history VALUES('path','student',1,'digest','On Track',1);");
    db.exec("DELETE FROM student_profiles WHERE id='student';");
    assert.equal(db.prepare('SELECT COUNT(*) n FROM pathway_status_history').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM performance_events').get().n,0);
  } finally {db.close();}
});
