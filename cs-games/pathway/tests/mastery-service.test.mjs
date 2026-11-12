import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {startDev} from '../../../wpr-games/workplace-readiness/service/dev.mjs';
import {applyToClass,applyToSkills,createContext} from '../requirements/index.mjs';
import graph from '../curriculum-graph.json' with {type:'json'};

const owner='synthetic-mastery-teacher-one';
const other='synthetic-mastery-teacher-two';
const loop='node:advanced:loop-lab:looptype';
const trace='node:advanced:variable-lab:trace';
const math='node:advanced:math-lab:modulus';
async function service(t){
  const dev=await startDev({teacherTokens:{owner,other}});
  t.after(async()=>{await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
  async function call(path,token,body){
    const response=await fetch(dev.url+'/api/wpr'+path,{
      method:body===undefined?'GET':'POST',
      headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},
      body:body===undefined?undefined:JSON.stringify(body)
    });
    return {status:response.status,data:await response.json()};
  }
  async function ok(...args){
    const response=await call(...args);
    assert.equal(response.status,200,response.data.error);
    return response.data;
  }
  async function classroom(title,teacher=owner){
    const c=await ok('/teacher/profiles',teacher,{title,courseId:'advanced'});
    const student=await ok('/profile/enroll',null,{invite:c.invite});
    const route='/pathways/student/'+c.id;
    const view=(token=student.token)=>ok(route,token).then(result=>result.pathway);
    const editor='/pathways/teacher/'+(await view()).pathwayId;
    async function save(pathway){
      const {draftVersion}=await ok(editor,teacher);
      await ok(editor+'/draft',teacher,{pathway,draftVersion});
    }
    async function publish(){
      const {previewToken,expectedRevision,draftVersion}=await ok(editor+'/preview',teacher,{});
      return (await ok(editor+'/publish',teacher,{previewToken,expectedRevision,draftVersion,acknowledged:true})).published;
    }
    return {c,teacher,student,route,view,editor,save,publish,entry:()=>ok(editor,teacher)};
  }
  return {...dev,call,ok,classroom};
}
function pathOf(result){
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  return result.pathway;
}
const skill=(path,id)=>path.nodes.find(node=>node.id===id);
function attempt({kind='loop',mode='mixed',correct=true,at=Date.now(),...extra}={}){
  const questionId=crypto.randomUUID();
  const selection=kind==='loop'?['loop-lab','looptype','count-with-header']
    :kind==='trace'?['variable-lab','trace','var.trace.increment-decrement']
    :['math-lab','modulus',graph.questionFamilies.find(f=>f.nodeIds.includes(math)).sourceFamilyId];
  const [activity,assessedMode,familyId]=selection;
  return {version:1,format:'game-attempt',kind:'practice',id:questionId+':1',questionId,sessionId:crypto.randomUUID(),
    courseId:'advanced',activity,mode:mode==='focused'?assessedMode:mode,assessedMode,familyId,difficulty:'advanced',
    attempt:1,correct,occurred:at,...extra};
}

test('defaults need no settings and published class and skill requirements drive the existing practice evidence',async t=>{
  const {ok,call,db,classroom}=await service(t);
  const first=await classroom('Period 1'),second=await classroom('Period 3',other);
  const original=await first.view();
  assert.equal(original.revision,1);
  assert.equal(original.status,'Self-paced');
  assert.equal(skill(original,loop).masteryChallenge,undefined);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM mastery_attempt_states').get().n,0);
  const {draft,published}=await first.entry();
  const ctx=createContext({graph,published});
  const classRule=pathOf(applyToClass(draft,{minimumQuestions:30,accuracy:0.9},ctx));
  const skillRule=pathOf(applyToSkills(classRule,[math],{minimumQuestions:50,accuracy:0.95},ctx));
  const advanced=pathOf(applyToSkills(skillRule,[trace],{minimumQuestions:20,accuracy:0.9,
    difficulties:[{difficulty:'advanced',minQuestions:5,minCorrect:4}]},ctx));
  await first.save(advanced);
  assert.equal(skill(await first.view(),loop).masteryChallenge,undefined);
  const forged=advanced.policies.find(p=>p.id==='policy:req:class');
  forged.effectiveFrom='2010-01-01T00:00:00.000Z';
  await first.save(advanced);
  const snapshot=await first.publish();
  assert.ok(Date.parse(snapshot.policies.find(p=>p.id===forged.id).effectiveFrom)>Date.parse(forged.effectiveFrom));
  const current=await first.view();
  for(const [id,n,pct] of [[loop,30,90],[math,50,95],[trace,20,90]]){
    assert.equal(skill(current,id).masteryChallenge.requirement.minimumQuestions,n);
    assert.equal(skill(current,id).masteryChallenge.requirement.accuracyPercent,pct);
  }
  assert.equal(skill(await second.view(),loop).masteryChallenge,undefined);
  const foreign=await second.entry();
  await second.save(pathOf(applyToClass(foreign.draft,{minimumQuestions:50,accuracy:0.95},createContext({graph,published:foreign.published}))));
  await second.publish();
  assert.equal(skill(await second.view(),loop).masteryChallenge.requirement.minimumQuestions,50);
  assert.equal(skill(await first.view(),loop).masteryChallenge.requirement.minimumQuestions,30);
  assert.equal((await call(first.route,second.student.token)).status,403);
  assert.equal((await call(first.editor,other)).status,404);

  const at=Date.now()-1000;
  const initial=Array.from({length:30},(_,index)=>attempt({at:at+index,mode:index%2?'mixed':'focused',correct:index>=5,verified:true}));
  const retry={...initial[0],id:initial[0].questionId+':2',attempt:2,correct:true};
  await ok('/profile/sync',first.student.token,{events:initial.slice(0,20)});
  await ok('/profile/sync',first.student.token,{events:[...initial.slice(20),initial[0],retry,attempt({kind:'math'})]});
  const low=skill(await first.view(),loop).masteryChallenge;
  assert.equal(low.progress.answered,30);
  assert.equal(low.progress.correct,25);
  assert.equal(low.remaining.correctInARowForAccuracy,20);
  assert.equal(low.mapProgress.recovery.additionalCorrectForAccuracy,20);
  assert.deepEqual(low.mapProgress.attempt,{id:low.activeAttemptId,seq:1,attempted:30,correct:25,accuracyPercent:83.3});
  assert.deepEqual(low.mapProgress.requirementChecks.map(({code,met})=>[code,met]),[['minimumQuestions',true],['accuracy',false]]);
  assert.equal(skill(await first.view(),math).masteryChallenge.progress.answered,1);
  const recovery=Array.from({length:20},(_,index)=>attempt({at:at+100+index}));
  await ok('/profile/sync',first.student.token,{events:recovery});
  const node=skill(await first.view(),loop);
  assert.equal(node.masteryChallenge.progress.answered,50);
  assert.equal(node.masteryChallenge.progress.correct,45);
  assert.equal(node.masteryChallenge.status,'requirements-met');
  assert.equal(node.masteryChallenge.mapProgress.verification,'provisional');
  assert.equal(node.masteryChallenge.mapProgress.award,null);
  assert.match(node.masteryChallenge.milestoneNote,/practice milestone/);
  assert.equal(node.checkpoint.score,null);
  assert.equal(node.checkpoint.award,undefined);
  assert.equal((await call('/teacher/profiles/'+first.c.id+'/students/'+first.student.id+'/evidence',first.student.token,
    {id:crypto.randomUUID(),nodeId:loop,score:4,award:true,revision:2})).status,401);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM performance_events WHERE kind='assessment'").get().n,0);
});

test('restarts are owner-scoped, durable, safe to retry and respect later policy publication windows',async t=>{
  const {ok,call,db,classroom}=await service(t);
  const subject=await classroom('Period 5');
  let {draft,published}=await subject.entry();
  await subject.save(pathOf(applyToSkills(draft,[loop],{minimumQuestions:20,accuracy:0.9},createContext({graph,published}))));
  await subject.publish();
  await ok('/profile/sync',subject.student.token,{events:[attempt({correct:false}),attempt()]});
  const before=skill(await subject.view(),loop).masteryChallenge;
  assert.equal(before.progress.answered,2);
  const restart=subject.route+'/restart';
  const payload={nodeId:loop,requestId:crypto.randomUUID(),expectedAttemptId:before.activeAttemptId};
  const responses=await Promise.all([ok(restart,subject.student.token,payload),ok(restart,subject.student.token,payload)]);
  assert.deepEqual(responses,[{restarted:true},{restarted:true}]);
  assert.equal((await call(restart,subject.student.token,{...payload,requestId:crypto.randomUUID()})).status,409);
  assert.equal((await call(restart,owner,payload)).status,401);
  const recovered=await ok('/profile/restore',null,{id:subject.student.id,recovery:subject.student.recovery});
  const old=skill(await subject.view(recovered.token),loop).masteryChallenge;
  assert.equal(old.progress.answered,0);
  const [{closedAt,...closed}]=old.history;
  assert.ok(Number.isFinite(Date.parse(closedAt)));
  assert.deepEqual(closed,{number:1,status:'restarted',answered:2,correct:1,accuracy:50});
  assert.equal(old.mapProgress.attempt.seq,2);
  assert.equal(old.mapProgress.lifetime.questionsAnswered,2);
  const row=db.prepare('SELECT body FROM mastery_attempts WHERE profile_id=? AND node_id=? AND sequence=1');
  const original=row.get(subject.student.id,loop).body;
  assert.throws(()=>db.prepare("UPDATE mastery_attempts SET body='{}' WHERE profile_id=? AND sequence=1").run(subject.student.id),/immutable/);

  await delay(5);
  await ok('/profile/sync',subject.student.token,{events:[attempt()]});
  assert.equal(skill(await subject.view(),loop).masteryChallenge.progress.answered,1);
  ({draft,published}=await subject.entry());
  await subject.save(pathOf(applyToSkills(draft,[loop],{minimumQuestions:50,accuracy:0.95},createContext({graph,published}))));
  assert.equal(skill(await subject.view(),loop).masteryChallenge.requirement.minimumQuestions,20);
  await subject.publish();
  await delay(5);
  await ok('/profile/sync',subject.student.token,{events:[attempt()]});
  const revised=skill(await subject.view(recovered.token),loop).masteryChallenge;
  assert.equal(revised.requirement.minimumQuestions,50);
  assert.equal(revised.progress.answered,1);
  assert.equal(revised.history.at(-1).status,'superseded-by-new-policy');
  assert.equal(revised.history.at(-1).answered,1);
  assert.equal(row.get(subject.student.id,loop).body,original);
  assert.equal((await subject.view()).status,'Self-paced');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM performance_events').get().n,4);
});

test('the additive attempt migration preserves existing records and follows profile deletion',()=>{
  const db=new DatabaseSync(':memory:');
  const read=name=>readFileSync(new URL('../../../wpr-games/workplace-readiness/service/migrations/'+name,import.meta.url),'utf8');
  try{
    db.exec('PRAGMA foreign_keys=ON;');
    for(const file of ['0001_reporting.sql','0002_pathways.sql','0003_profiles.sql','0004_integrated_progress.sql','0005_teacher_sessions.sql','0006_class_creation_requests.sql'])db.exec(read(file));
    db.exec(`INSERT INTO profile_classes(id,owner,title,invite,created,expires,course_id) VALUES('c','owner','Existing class','digest',1,9999999999999,'advanced');
      INSERT INTO student_profiles(id,class_id,recovery,created) VALUES('s','c','digest',1);
      INSERT INTO performance_events VALUES('s','e',1,'advanced','loop-lab','practice',1,'{"n":1,"c":1}');
      INSERT INTO class_pathways(id,class_id,owner,draft,created) VALUES('p','c','owner','{}',1);
      INSERT INTO pathway_revisions VALUES('p',1,0,'{}','[]',1);`);
    db.exec(read('0007_mastery_attempts.sql'));
    assert.equal(db.prepare("SELECT head FROM class_pathways WHERE id='p'").get().head,1);
    assert.equal(db.prepare("SELECT data FROM performance_events WHERE id='e'").get().data,'{"n":1,"c":1}');
    db.exec(`INSERT INTO mastery_attempt_states VALUES('s','node',1,'marker');
      INSERT INTO mastery_attempts VALUES('s','node',1,'{"closedAt":"2026-11-11"}');
      INSERT INTO mastery_restart_requests VALUES('s','node','request','{}');
      DELETE FROM student_profiles WHERE id='s';`);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM mastery_attempts').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM mastery_restart_requests').get().n,0);
  }finally{db.close();}
});
