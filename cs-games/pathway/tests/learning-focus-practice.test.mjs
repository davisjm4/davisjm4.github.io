import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startDev } from '../../../wpr-games/workplace-readiness/service/dev.mjs';

const teacher='synthetic-advisory-assignment-owner';
const a='node:advanced:loop-lab:looptype';
const b='node:advanced:loop-lab:components';

test('advisory work keeps ordinary practice, assignment completion and assessments separate', async t=>{
  const flags={ENABLE_TEACHER_DIRECTED_LEARNING:'1'};
  const dev=await startDev({teacherTokens:{teacher},pathwayAdapters:flags});
  t.after(async()=>{await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
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
  const room=await call('/teacher/profiles',{title:'Advisory practice',courseId:'advanced'});
  const foreign=await call('/teacher/profiles',{title:'Other class',courseId:'advanced'});
  const learner=await call('/profile/enroll',{invite:room.invite},'');
  const peer=await call('/profile/enroll',{invite:room.invite},'');
  const outsider=await call('/profile/enroll',{invite:foreign.invite},'');
  const path='/teacher/learning-focus/'+room.id;
  async function assign(node,scope){
    const assignment={scope,target:{kind:'skill',id:node},...(scope==='individual'?{recipientIds:[learner.id]}:{})};
    const {previewAt,previewSignature}=await call(path+'/preview',assignment);
    return call(path+'/publish',{assignment,previewAt,previewSignature,requestId:crypto.randomUUID()});
  }
  const focusA=await assign(a,'individual');
  const focusB=await assign(b,'class');
  const start=(assignment,token=learner.token,status=200)=>call('/profile/learning-focus/start',assignment,token,status);
  await start(focusA,peer.token,404);
  await start(focusB,outsider.token,404);
  const {receipt}=await start(focusA);
  assert.deepEqual(await start(focusA),{receipt});
  const {receipt:peerReceipt}=await start(focusB,peer.token);
  const sync=events=>call('/profile/sync',{events},learner.token);
  const work=()=>call('/profile/learning-focus',undefined,learner.token);
  const row=key=>dev.db.prepare('SELECT data FROM performance_events WHERE id=?').get(key);
  function event(mode,more={}){
    const questionId=crypto.randomUUID();
    return {version:1,format:'game-attempt',kind:'practice',id:questionId+':1',questionId,sessionId:crypto.randomUUID(),
      courseId:'advanced',activity:'loop-lab',mode,assessedMode:mode,correct:true,occurred:Date.now(),
      familyId:mode==='looptype'?'count-with-header':'unclassified',difficulty:'beginner',attempt:1,...more};
  }
  const person='/teacher/profiles/'+room.id+'/students/'+learner.id;
  await call(person+'/evidence',{id:crypto.randomUUID(),nodeId:a,revision:1,score:4,award:true,demonstrationType:'project'});
  const before=(await call(person)).verifiedEvidence;
  const historical=event('looptype');
  flags.ENABLE_TEACHER_DIRECTED_LEARNING='0';
  assert.deepEqual((await sync([historical])).accepted,[historical.id]);
  flags.ENABLE_TEACHER_DIRECTED_LEARNING='1';
  const original=row(historical.id).data;
  assert.deepEqual((await sync([{...historical,assignmentReceipt:receipt}])).accepted,[historical.id]);
  assert.equal(row(historical.id).data,original);
  const lateLegacy=event('looptype',{occurred:Date.now()-86400000});
  const offTarget=event('components',{assignmentReceipt:receipt});
  const forged=event('looptype',{assignmentReceipt:crypto.randomUUID()});
  const peerReplay=event('components',{assignmentReceipt:peerReceipt});
  const guest=event('looptype',{learner:'guest',assignmentReceipt:receipt});
  const foreignClass=event('looptype',{classId:foreign.id});
  const foreignProfile=event('looptype',{profileId:peer.id});
  const assisted=event('looptype',{assisted:true,assignmentReceipt:receipt});
  const all=[lateLegacy,offTarget,forged,peerReplay,assisted];
  const result=await sync([...all,guest,foreignClass,foreignProfile]);
  assert.deepEqual(result.accepted,all.map(x=>x.id));
  assert.deepEqual(result.rejected.map(x=>x.id),[guest.id,foreignClass.id,foreignProfile.id]);
  assert.equal((await work()).catchUp[0].progress,'started');
  assert.equal((await work()).classwork[0].progress,'available');
  const answer=event('looptype',{assignmentReceipt:receipt});
  assert.deepEqual((await sync([answer])).accepted,[answer.id]);
  assert.deepEqual((await sync([answer])).accepted,[answer.id]);
  assert.equal(dev.db.prepare('SELECT count(*) n FROM learning_focus_completion').get().n,1);
  assert.equal((await work()).catchUp[0].progress,'complete');
  assert.equal((await work()).classwork[0].progress,'available');
  assert.deepEqual((await call(person)).verifiedEvidence,before);
  assert.equal(dev.db.prepare("SELECT count(*) n FROM performance_events WHERE kind='practice'").get().n,7);
  await call(path+'/complete',{...focusB,profileId:learner.id},learner.token,401);
  await call(path+'/complete',{...focusB,profileId:learner.id});
  assert.equal((await work()).classwork[0].progress,'complete');
  assert.deepEqual((await call(person)).verifiedEvidence,before);
});
