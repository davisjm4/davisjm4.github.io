import assert from 'node:assert/strict';import {test} from 'node:test';
import {proceduralSkills,proceduralSources,proceduralQuestion,chooseProceduralSource,issueProceduralPractice,scoreProceduralPractice} from '../../../wpr-games/workplace-readiness/service/procedural-practice.mjs';
import grader from '../../../wpr-games/workplace-readiness/js/core/grader.js';
const profile={id:'synthetic-profile',class_id:'synthetic-class',generation:0,course_id:'workplace'},secret='a-valid-synthetic-signing-secret-000000',now=Date.parse('2026-11-18T12:00:00Z');
const claim=issued=>JSON.parse(Buffer.from(issued.permit.split('.')[0],'base64url').toString());
function event(issued,response){const {id,version,presented,permit,format}=issued;return {id,version,presented,permit,format,kind:'practice',response};}
test('procedural issuance uses actual seeded scenarios across 22 areas; grade, facts and reasoning remain consistent',()=>{
 assert.equal(proceduralSkills.length,22);const modes=new Set();let total=0,authored=0,varied=0,fixed=0;
 for(const skill of proceduralSkills){const sources=proceduralSources(skill);assert.ok(sources.length,skill);
  for(const source of sources){const texts=new Set();for(let seed=0;seed<40;seed++){
   const q=proceduralQuestion(source.id,'boundary-'+seed);assert.ok(q,source.id);assert.equal(q.skill,skill);
   const solved=grader.grade(q,grader.solve(q));assert.equal(solved.ok,true);assert.equal(solved.correct,true,source.id);modes.add(q.mode);total++;
   if(q.options){assert.equal(new Set(q.options.map(o=>o.text)).size,q.options.length);for(const option of q.options){const result=grader.grade(q,{optionId:option.id});assert.equal(result.correct,option.id===q.key.bestId);}}
   texts.add(JSON.stringify([q.scenario,q.prompt,q.options?.map(o=>o.text)]));
   assert.ok(!/\{[a-z][\w.]*\}|\bundefined\b|\bNaN\b/.test(JSON.stringify(q)),source.id);
  }if(source.id.startsWith('a:')){if(texts.size>1)varied++;else fixed++;}else authored++;
 }
 }
 console.log(JSON.stringify({generated:total,variedProceduralSources:varied,fixedRetainedSources:fixed,authored}));
 assert.ok(varied>100,varied);assert.ok(total>=10000,total);assert.equal(authored,122);assert.deepEqual([...modes].sort(),['decision','find','nextstep','order']);
});
test('selection rotates reasoning patterns and mixes new authored content with procedural sources',()=>{
 const skill='information-technology',recent=[],seen=new Set();for(let i=0;i<150;i++){const id=chooseProceduralSource(skill,recent,'pick'+i);assert.ok(!recent.slice(-3).some(r=>r.sourceId===id));seen.add(id);const q=proceduralQuestion(id,'question'+i);recent.push({sourceId:id,concept:q.concepts[0],correct:i%2===0});}
 assert.ok([...seen].some(x=>x.startsWith('bank:')));assert.ok([...seen].some(x=>x.startsWith('a:')));assert.equal(chooseProceduralSource('invalid'),null);
});
test('signed procedural answers reject content/identity/expiry tampering; no unvalidated automatic mastery',async()=>{
 const issued=await issueProceduralPractice(secret,profile,'creativity-and-innovation',[],now);assert.ok(issued);assert.equal(issued.question.key,undefined);assert.equal(issued.question.principle,undefined);
 const c=claim(issued),q=proceduralQuestion(c.sourceId,c.seed),response=grader.solve(q),e=event(issued,response);
 const result=await scoreProceduralPractice(secret,profile,e,now+10);assert.equal(result.data.correct,true);assert.equal(result.feedback.masteryEligible,false);assert.ok(result.data.dimensions.every(d=>d.scope!=='node'));
 for(const bad of [{...e,presented:'changed'},{...e,permit:e.permit.slice(0,-2)+'xx'},{...e,version:'old'},{...e,id:'other'},{...e,correct:true}])assert.equal(await scoreProceduralPractice(secret,profile,bad,now+10),null);
 for(const changed of [{...profile,id:'other'},{...profile,class_id:'other'},{...profile,generation:1},{...profile,course_id:'advanced'}])assert.equal(await scoreProceduralPractice(secret,changed,e,now+10),null);
 assert.equal(await scoreProceduralPractice(secret,profile,e,now+8*86400000),null);
 const fresh=await issueProceduralPractice(secret,profile,'creativity-and-innovation',[],now);assert.notEqual(fresh.id,issued.id);assert.notEqual(fresh.permit,issued.permit);
});
test('service preserves first response, enforces class/course boundaries and accepts fresh instances',async t=>{
 const {startDev}=await import('../../../wpr-games/workplace-readiness/service/dev.mjs');
 const dev=await startDev({teacherTokens:{teacher:'synthetic-procedural-owner'}});t.after(()=>{dev.server.close();dev.db.close();});
 async function call(path,token,body){const response=await fetch(dev.url+'/api/wpr'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
 const c=(await call('/teacher/profiles','synthetic-procedural-owner',{title:'Procedural test',courseId:'workplace'})).data;
 const p=(await call('/profile/enroll',null,{invite:c.invite})).data;
 const other=(await call('/profile/enroll',null,{invite:c.invite})).data;
 const issued=(await call('/profile/wpr-procedural',p.token,{skillId:'information-technology'})).data;
 const c1=claim(issued),q=proceduralQuestion(c1.sourceId,c1.seed),right=grader.solve(q);
 let wrong=q.options?{optionId:q.options.find(o=>o.id!==q.key.bestId).id}:q.doc?{segmentId:q.doc.segments.find(s=>s.id!==q.key.problemId).id}:{order:[...q.key.example].reverse()};
 if(grader.grade(q,wrong).correct){wrong={order:q.steps.map(s=>s.id)};if(grader.grade(q,wrong).correct)wrong={order:q.key.example.slice(1).concat(q.key.example[0])};}
 const first=event(issued,wrong);const sent=await call('/profile/sync',p.token,{events:[first]});assert.equal(sent.status,200);assert.equal(sent.data.scored[issued.id].correct,grader.grade(q,wrong).correct);
 const replay=await call('/profile/sync',p.token,{events:[first]});assert.deepEqual(replay.data.accepted,[issued.id]);
 const altered=await call('/profile/sync',p.token,{events:[event(issued,right)]});assert.ok(altered.data.rejected?.some(r=>r.code==='first-response-already-recorded'));
 const foreign=await call('/profile/sync',other.token,{events:[first]});assert.ok(foreign.data.rejected?.length);assert.equal(dev.db.prepare('SELECT COUNT(*) n FROM performance_events').get().n,1);
 const row=JSON.parse(dev.db.prepare('SELECT data FROM performance_events').get().data);assert.ok(row.dimensions.every(d=>d.scope!=='node'));
 const fresh=(await call('/profile/wpr-procedural',p.token,{skillId:'information-technology'})).data;assert.notEqual(fresh.id,issued.id);
 const forged=await call('/profile/wpr-procedural',p.token,{skillId:'information-technology',correct:true});assert.equal(forged.status,400);
});
