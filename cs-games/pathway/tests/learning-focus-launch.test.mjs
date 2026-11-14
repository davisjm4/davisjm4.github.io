import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { purgeFocusLaunches } from '../../../wpr-games/workplace-readiness/service/focus-launch.mjs';
import { sqliteAdapter, startDev } from '../../../wpr-games/workplace-readiness/service/dev.mjs';

const teacher='synthetic-focus-launch-owner';
const a='node:advanced:loop-lab:looptype';
const b='node:advanced:loop-lab:components';
const c='node:advanced:loop-lab:iterations';
const href=mode=>'/java-games/loop-lab/?mode='+mode;

test('class launches and queued attempts preserve scope, overlap, and one ordinary evidence record', async t=>{
  const pathwayAdapters={ENABLE_TEACHER_DIRECTED_LEARNING:'1'};
  const dev=await startDev({teacherTokens:{teacher},pathwayAdapters});
  t.after(async()=>{await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
  dev.db.exec(readFileSync(new URL('../../../wpr-games/workplace-readiness/service/migrations/0008_learning_focus.sql',import.meta.url),'utf8'));
  async function call(path,body,token=teacher,status=200){
    const response=await fetch(dev.url+'/api/wpr'+path,{
      method:body===undefined?'GET':'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:body===undefined?undefined:JSON.stringify(body),
    });
    const output=await response.json();
    assert.equal(response.status,status,JSON.stringify(output));
    return output;
  }
  const room=await call('/teacher/profiles',{title:'Launch class',courseId:'advanced'});
  const learner=await call('/profile/enroll',{invite:room.invite},'');
  const peer=await call('/profile/enroll',{invite:room.invite},'');
  const path='/teacher/learning-focus/'+room.id;
  async function assign(node,scope,mode){
    const assignment={scope,mode,target:{kind:'skill',id:node},...(scope==='individual'?{recipientIds:[learner.id]}:{})};
    const {previewAt,previewSignature}=await call(path+'/preview',assignment);
    return call(path+'/publish',{assignment,previewAt,previewSignature,requestId:crypto.randomUUID()});
  }
  const launch=(nodeId,mode,assignmentId,status=200,token=learner.token,overrides={})=>
    call('/profile/class-launch',{classId:room.id,nodeId,href:href(mode),assignmentId,...overrides},token,status);
  const old=await launch(c,'iterations');
  const oldQuestion=crypto.randomUUID();
  const permit=(launch,questionId,mode,status=200,token=learner.token)=>
    call('/profile/class-launch/'+launch.id+'/question',{questionId,mode},token,status);
  await permit(old,oldQuestion,'iterations');
  await permit(old,crypto.randomUUID(),'iterations',409);
  const focusA=await assign(a,'individual','restricted');
  const focusB=await assign(b,'class','advisory');
  const sameA=await assign(a,'class','advisory');
  await permit(old,crypto.randomUUID(),'iterations',403);
  const authorized=await launch(a,'looptype',focusA.id);
  await launch(b,'components',focusB.id);
  await launch(c,'iterations',undefined,403);
  await launch(a,'looptype',focusA.id,403,peer.token);
  await launch(a,'looptype',focusA.id,403,learner.token,{classId:crypto.randomUUID()});
  await launch(a,'looptype',focusA.id,400,learner.token,{href:'//example.com'});
  await call('/profile/class-launch/'+authorized.id,undefined,peer.token,403);
  await call('/profile/class-launch/'+authorized.id,undefined,learner.token);
  function event(mode,more={}){
    const questionId=crypto.randomUUID();
    return {version:1,format:'game-attempt',kind:'practice',id:questionId+':1',questionId,sessionId:crypto.randomUUID(),
      courseId:'advanced',activity:'loop-lab',mode,assessedMode:mode,correct:true,occurred:Date.now(),
      familyId:'count-with-header',difficulty:'beginner',attempt:1,classLaunchId:authorized.id,...more};
  }
  const guaranteed=event('looptype');
  await permit(authorized,guaranteed.questionId,'looptype',403,peer.token);
  await permit(authorized,guaranteed.questionId,'components',403);
  await permit(authorized,guaranteed.questionId,'looptype');
  const mismatched=event('components',{familyId:'unclassified'});
  const unverified=event('looptype',{classLaunchId:null,occurred:Date.now()-86400000});
  const wrongScope=event('looptype',{classId:crypto.randomUUID()});
  const unpermitted=event('looptype');
  const oldEvent=event('iterations',{questionId:oldQuestion,id:oldQuestion+':1',classLaunchId:old.id,familyId:'unclassified'});
  const modified=event('components',{questionId:guaranteed.questionId,id:guaranteed.questionId+':2',attempt:2});
  const explicitGuest=event('looptype',{learner:'guest'});
  const sync=events=>call('/profile/sync',{events},learner.token);
  const acceptedBeforeCutover=event('iterations',{classLaunchId:null,familyId:'unclassified'});
  pathwayAdapters.ENABLE_TEACHER_DIRECTED_LEARNING='0';
  assert.deepEqual((await sync([acceptedBeforeCutover])).accepted,[acceptedBeforeCutover.id]);
  const storedBefore=dev.db.prepare('SELECT data FROM performance_events WHERE id=?').get(acceptedBeforeCutover.id).data;
  pathwayAdapters.ENABLE_TEACHER_DIRECTED_LEARNING='1';
  assert.deepEqual((await sync([acceptedBeforeCutover])).accepted,[acceptedBeforeCutover.id]);
  assert.equal(dev.db.prepare('SELECT data FROM performance_events WHERE id=?').get(acceptedBeforeCutover.id).data,storedBefore);
  dev.db.prepare('UPDATE learning_focus_launches SET expires=0 WHERE id=?').run(old.id);
  await permit(old,crypto.randomUUID(),'iterations',403);
  await purgeFocusLaunches(sqliteAdapter(dev.db),Date.now());
  assert.ok(dev.db.prepare('SELECT 1 FROM learning_focus_launches WHERE id=?').get(old.id), 'expired launch with an open question is retained');
  const answer=await sync([guaranteed,mismatched,unverified,explicitGuest,wrongScope,unpermitted,oldEvent,modified]);
  assert.deepEqual(answer.accepted,[guaranteed.id,oldEvent.id]);
  assert.deepEqual(answer.rejected.map(item=>item.id),[mismatched.id,unverified.id,explicitGuest.id,wrongScope.id,unpermitted.id,modified.id]);
  assert.equal(answer.rejected[1].code,'legacy-unverified');
  dev.db.prepare('UPDATE learning_focus_launches SET expires=0 WHERE id=?').run(authorized.id);
  await purgeFocusLaunches(sqliteAdapter(dev.db),Date.now());
  assert.equal(dev.db.prepare('SELECT 1 FROM learning_focus_launches WHERE id=?').get(old.id),undefined);
  assert.deepEqual((await sync([guaranteed,oldEvent])).accepted,[guaranteed.id,oldEvent.id]);
  assert.equal(dev.db.prepare('SELECT count(*) n FROM performance_events').get().n,3);
  const state=await call('/profile/learning-focus',undefined,learner.token);
  assert.equal(state.classwork.find(item=>item.id===sameA.id).progress,'complete');
  assert.equal(state.catchUp[0].progress,'complete');
  assert.equal(state.restricted,true);
  await launch(c,'iterations',undefined,403);
  await call(path+'/release',{requestId:crypto.randomUUID(),grants:[{...focusA,profileId:learner.id}]});
  await launch(c,'iterations');
  const report=await call('/profile/me',undefined,learner.token);
  assert.equal(report.measures.find(row=>row.id===a).n,1);
});
