import assert from 'node:assert/strict';
import {test} from 'node:test';
import {startDev} from '../../../wpr-games/workplace-readiness/service/dev.mjs';
import {profileHash} from '../../../wpr-games/workplace-readiness/service/profiles.mjs';
import {createPathway,removePacing} from '../model.mjs';
import graph from '../curriculum-graph.json' with {type:'json'};

const owner='synthetic-automatic-teacher-a';
const foreign='synthetic-automatic-teacher-b';
const loop='node:advanced:loop-lab:looptype';
async function fixture(t){
  const dev=await startDev({teacherTokens:{owner,foreign}});
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
  async function legacy(teacher='owner'){
    const id=crypto.randomUUID(),invite=(await profileHash(id));
    dev.db.prepare('INSERT INTO profile_classes(id,owner,title,invite,created,expires,course_id) VALUES(?,?,?,?,?,?,?)')
      .run(id,teacher,'Synthetic legacy class',await profileHash(invite),Date.now(),Date.now()+86400000,'advanced');
    return {id,invite};
  }
  return {...dev,call,ok,legacy};
}

test('all four class defaults are published with the canonical standards sequence and no dates',async t=>{
  const {ok}=await fixture(t);
  const first={
    advanced:'node:advanced:variable-lab:trace',
    csp:'node:csp:vocabulary-fill-in-lab:CSP-PURPOSE',
    robotics:'node:robotics:parts-sprint:structure',
    workplace:'node:workplace:creativity-and-innovation:contribute-ideas'
  };
  for(const [courseId,firstId] of Object.entries(first)){
    const classroom=await ok('/teacher/profiles',owner,{title:'Synthetic '+courseId,courseId});
    const profile=await ok('/profile/enroll',null,{invite:classroom.invite});
    const {pathway}=await ok('/pathways/student/'+classroom.id,profile.token);
    const authored=graph.nodes.filter(node=>node.courseId===courseId);
    assert.equal(pathway.courseId,courseId);
    assert.equal(pathway.revision,1);
    assert.equal(pathway.status,'Self-paced');
    assert.equal(pathway.examDate,null);
    assert.deepEqual(pathway.sessions,[]);
    assert.equal(pathway.nodes[0].id,firstId);
    assert.deepEqual(new Set(pathway.nodes.map(node=>node.id)),new Set(authored.map(node=>node.id)));
    const byId=new Map(authored.map(node=>[node.id,node]));
    const seen=new Set();
    for(const node of pathway.nodes){
      assert.deepEqual(node.standardRefs,byId.get(node.id).standardRefs);
      assert.ok(node.checkpoint.prerequisites.every(id=>seen.has(id)));
      assert.equal(node.checkpoint.targetDate,null);
      assert.equal(node.checkpoint.overdue,false);
      seen.add(node.id);
    }
  }
});

test('concurrent retries, rolled-back provisioning and owner-scoped backfill preserve legacy publications and drafts',async t=>{
  const {call,ok,db,legacy}=await fixture(t);
  const request={title:'Synthetic retry',courseId:'advanced',creationKey:'cd'.repeat(32)};
  const [first,retry]=await Promise.all([ok('/teacher/profiles',owner,request),ok('/teacher/profiles',owner,request)]);
  assert.deepEqual(first,retry);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM profile_classes').get().n,1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM pathway_revisions').get().n,1);
  assert.equal((await call('/teacher/profiles',owner,{...request,title:'Different'})).status,409);
  const sameKeyOtherOwner=await ok('/teacher/profiles',foreign,request);
  assert.notEqual(sameKeyOtherOwner.id,first.id);
  assert.notEqual(sameKeyOtherOwner.invite,first.invite);
  db.exec("CREATE TRIGGER synthetic_failure BEFORE INSERT ON pathway_revisions BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");
  const interrupted={...request,creationKey:'ef'.repeat(32)};
  assert.equal((await call('/teacher/profiles',owner,interrupted)).status,500);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM profile_classes').get().n,2);
  db.exec('DROP TRIGGER synthetic_failure;');
  await ok('/teacher/profiles',owner,interrupted);
  const empty=await legacy(), untouched=await legacy('foreign'), draftClass=await legacy();
  const draft=createPathway(graph,{classId:draftClass.id,courseId:'advanced',title:'Unpublished legacy draft'});
  await ok('/pathways/teacher',owner,draft);
  const snapshot=db.prepare('SELECT snapshot FROM pathway_revisions r JOIN class_pathways p ON p.id=r.pathway_id WHERE p.class_id=?').get(first.id).snapshot;
  const query=db.prepare('SELECT head FROM class_pathways WHERE class_id=?');
  assert.equal((await call('/teacher/profiles/default-pathways',null,{})).status,401);
  await Promise.all([ok('/teacher/profiles/default-pathways',owner,{}),ok('/teacher/profiles/default-pathways',owner,{})]);
  assert.equal(query.get(empty.id).head,1);
  assert.equal(query.get(draftClass.id).head,0);
  assert.equal(query.get(untouched.id),undefined);
  assert.equal((await call('/pathways/teacher/'+draft.id,foreign)).status,404);
  assert.equal(db.prepare('SELECT snapshot FROM pathway_revisions r JOIN class_pathways p ON p.id=r.pathway_id WHERE p.class_id=?').get(first.id).snapshot,snapshot);
  const enrolled=await ok('/profile/enroll',null,{invite:untouched.invite});
  assert.equal((await ok('/pathways/student/'+untouched.id,enrolled.token)).pathway.revision,1);
});

test('practice survives device restore, customization, private and shared pacing, and removal',async t=>{
  const {call,ok}=await fixture(t);
  const classroom=await ok('/teacher/profiles',owner,{title:'Synthetic practice',courseId:'advanced'});
  const student=await ok('/profile/enroll',null,{invite:classroom.invite});
  const studentPath='/pathways/student/'+classroom.id;
  const first=await ok(studentPath,student.token);
  assert.equal((await call('/pathways/teacher/'+first.pathway.pathwayId+'/student-preview',foreign)).status,404);
  const editor='/pathways/teacher/'+first.pathway.pathwayId;
  const {draft}=await ok(editor,owner);
  const checkpoint=draft.checkpoints.find(node=>node.nodeId===loop);
  const practiceGoal={id:'policy:synthetic-practice',label:'Practice goal',version:1,provisional:true,practiceGoal:true,minimumQuestions:1,accuracy:1,coverage:{},scoreTarget:null};
  draft.policies.push(practiceGoal);
  checkpoint.practiceGoalPolicyId=practiceGoal.id;
  checkpoint.practiceGoalPolicyVersion=1;
  checkpoint.required=false;
  const questionId=crypto.randomUUID();
  const event={version:1,format:'game-attempt',kind:'practice',id:questionId+':1',questionId,sessionId:crypto.randomUUID(),
    courseId:'advanced',activity:'loop-lab',mode:'mixed',assessedMode:'looptype',familyId:'count-with-header',difficulty:'beginner',
    attempt:1,correct:true,occurred:Date.now()};
  await ok('/profile/sync',student.token,{events:[event]});
  const restored=await ok('/profile/restore',null,{id:student.id,recovery:student.recovery});
  const reload=()=>ok(studentPath,restored.token).then(result=>result.pathway);
  const skill=view=>view.nodes.find(node=>node.id===loop);
  async function save(plan){
    const {draftVersion}=await ok(editor,owner);
    await ok(editor+'/draft',owner,{pathway:plan,draftVersion});
  }
  async function publish(){
    const {previewToken,draftVersion,expectedRevision}=await ok(editor+'/preview',owner,{});
    return (await ok(editor+'/publish',owner,{previewToken,draftVersion,expectedRevision})).published;
  }
  assert.deepEqual(skill(await reload()).practiceProgress,{attempted:1,correct:1});
  await save(draft);
  assert.equal(skill(await reload()).checkpoint.required,true);
  let plan=await publish();
  let current=skill(await reload());
  assert.equal(current.checkpoint.required,false);
  assert.equal(current.practiceGoal.met,true);
  assert.equal(current.checkpoint.award,undefined);
  assert.equal(current.checkpoint.score,null);
  plan.calendar={start:'2025-01-06',end:'2025-03-28',weekdays:[1,2,3,4,5],minutes:80,rotation:[],classRotations:[],rotationOffset:0,overrides:[]};
  plan.pacingVisibility='private';
  plan.checkpoints.find(node=>node.nodeId===loop).targetDate='2025-02-05';
  await save(plan);
  plan=await publish();
  assert.equal(skill(await reload()).checkpoint.targetDate,null);
  plan.pacingVisibility='shared';
  await save(plan);
  plan=await publish();
  current=skill(await reload());
  assert.equal(current.checkpoint.targetDate,'2025-02-05');
  assert.equal(current.checkpoint.overdue,false);
  await save(removePacing(plan));
  await publish();
  const undated=await reload();
  assert.equal(undated.status,'Self-paced');
  assert.equal(skill(undated).checkpoint.targetDate,null);
  assert.deepEqual(skill(undated).practiceProgress,{attempted:1,correct:1});
});
