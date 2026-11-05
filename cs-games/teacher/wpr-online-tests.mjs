import './test-runtime.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { getHybrid } from './workplace-adapter.js';
import { generateDiagnostic, availability } from './wpr-online-builder.mjs';
import { validateSnapshot, evidence, csv } from '../../wpr-games/workplace-readiness/online/model.mjs';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';
const W=globalThis.WRG, h=getHybrid();
const filters={skills:[],contexts:[],modes:[],difficulty:'mixed'};
const ids=['attire-ppe','workplace-relationships','computer-technology'];
const quotas=ids.map(id=>({scope:'topic',id,name:id,count:3}));
const snapshot=(questions, settings={})=>({title:'Classroom diagnostic',version:1,kind:'diagnostic',reporting:true,
  feedbackTiming:'after',retakes:'once',shuffle:true,closes:null,questions,...settings});
const token='local-test-teacher-token-12345678';
const other='other-test-teacher-token-12345678';

test('taxonomy integrity, narrow eligibility and content capacity',()=>{
  const allTags=h.topics.flatMap(t=>t.subtopics);
  const source=new Set(h.units.flatMap(u=>[u.id,u.kitId,'@'+u.skill]));
  const counts=h.topics.map(t=>{
    const f={topics:[t.id]}, cap=W.selector.capacity(h,f);
    assert.ok(cap.families>=6,t.id);
    return {topic:t.id,...cap,subtopics:t.subtopics.map(([id,,refs])=>{
      assert.ok(refs.split(' ').every(r=>source.has(r)),id);
      const f={topics:[t.id],subtopics:[id]};
      const capacity=W.selector.capacity(h,f);
      assert.ok(capacity.families>=3,id);
      const byFilter={};
      for(const level of ['beginner','intermediate','advanced','mixed']) for(const mode of ['decision','nextstep','order','find','mixed']) {
        const filter={...f,difficulty:level,modes:mode==='mixed'?null:[mode]};
        const units=W.selector.eligibleUnits(h,filter);
        byFilter[level+'/'+mode]=W.selector.capacity(h,filter).families;
        assert.ok(units.every(u=>h.topicIndex[u.id].some(tag=>tag.topicId===t.id&&tag.subtopicId===id)));
      }
      const stream=W.selector.createSession(h,{seed:id,filters:f});
      for(let i=0;i<8;i++){
        const c=stream.next();
        assert.ok(c.tags.some(x=>x.subtopicId===id));
        assert.equal(W.selector.validate(h,c),null);
      }
      return {id,...capacity,byFilter};
    })};
  });
  assert.equal(new Set(allTags.map(s=>s[0])).size,allTags.length);
  assert.equal(availability({ ...filters,difficulty:'advanced',modes:['order'] },{scope:'subtopic',id:'spreadsheet-tools'}).questions,0);
  if(process.env.WPR_COVERAGE_PATH) writeFileSync(process.env.WPR_COVERAGE_PATH,JSON.stringify(counts,null,2)+'\n');
});
test('builder respects three quotas, validates keys and regenerates just one item',()=>{
  const questions=generateDiagnostic(filters,quotas,'e2e');
  assert.equal(questions.length,9);assert.equal(validateSnapshot(snapshot(questions)),null);
  assert.equal(new Set(questions.map(q=>q.reasoningSignature)).size,9);
  questions.forEach((q,i)=>assert.ok(q.tags.some(t=>t.topicId===ids[Math.floor(i/3)])));
  const held=questions.map((q,i)=>i===2?null:q);
  const replacement=generateDiagnostic(filters,quotas,'different-seed',held);
  assert.deepEqual(replacement.slice(3),questions.slice(3));
  assert.notEqual(replacement[2].id,questions[2].id);
  assert.throws(()=>generateDiagnostic({...filters,difficulty:'advanced'},[{id:'spreadsheet-tools',scope:'subtopic',name:'Sheets',count:5}],'bad'),/Insufficient/);
  assert.ok(validateSnapshot(snapshot([questions[0],questions[0]])));
  assert.ok(validateSnapshot(snapshot([{...questions[0],correctIndex:(questions[0].correctIndex+1)%4}])));
});
test('CSV cells, accuracy boundaries and evidence labels',()=>{
  assert.equal(evidence(0,0),'Not assessed');
  assert.equal(evidence(1,1),'Insufficient evidence');
  assert.equal(evidence(5,3),'Developing');
  assert.equal(evidence(5,4),'Demonstrating readiness');
  assert.equal(csv([['=RUN()', 'A,"B"', ' @X', '-name', 0.5]]), "\"'=RUN()\",\"A,\"\"B\"\"\",\"' @X\",\"'-name\",0.5\r\n");
});
test('server freezes content, aggregates five anonymous submissions, gates reports and prevents duplicate counts',async t=>{
  const {server,db,url}=await startDev({teacherTokens:{teacher:token,other}});
  t.after(()=>{server.close();db.close();});
  const api=async(path,{body,key,method}={})=>{
    const r=await fetch(url+'/api/wpr'+path,{method:method||(body?'POST':'GET'),headers:{...(key?{Authorization:'Bearer '+key}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:r.status,body:await r.json()};
  };
  const questions=generateDiagnostic(filters,quotas,'service');
  const a=snapshot(questions);
  assert.equal((await api('/teacher/assignments',{body:a})).status,401);
  assert.equal((await api('/student/'+randomUUID())).status,404);
  const {id}=(await api('/teacher/assignments',{key:token,body:a})).body;
  assert.ok(id);
  assert.equal((await api('/teacher/'+id,{key:other})).status,404);
  assert.equal((await api('/teacher/'+id)).status,401);
  const student='/student/'+id, published=await api(student);
  assert.equal(published.body.questions.length,9);
  assert.deepEqual(Object.keys(published.body.questions[0]).sort(),['choices','context','id','passage','prompt','response']);
  assert.equal((await api(student+'/answer',{body:{token:randomUUID(),index:0,choice:0}})).status,404);
  const answers=questions.map((q,i)=>i<3?(q.correctIndex+1)%4:q.correctIndex);
  for(let i=0;i<5;i++){
    const browser=randomUUID(), receipt=(await api(student+'/start',{body:{browser}})).body;
    assert.ok(receipt.token);
    if(i===0){
      assert.equal((await api(student+'/answer',{body:{token:receipt.token,index:0,choice:0}})).status,404);
      assert.equal((await api(student+'/submit',{body:{token:receipt.token,answers:[0]}})).status,400);
    }
    const [one,two]=await Promise.all([1,2].map(()=>api(student+'/submit',{body:{token:receipt.token,answers}})));
    assert.equal(one.status,200);assert.deepEqual(one,two);
    assert.equal(one.body.c,6);assert.equal(one.body.rows.find(r=>r.id==='attire-ppe').c,0);
    assert.equal((await api(student+'/start',{body:{browser}})).status,409);
    assert.equal((await api(student+'/submit',{body:{token:receipt.token,answers:questions.map(q=>q.correctIndex)}})).status,409);
    const report=(await api('/teacher/'+id,{key:token})).body;
    assert.equal(report.completed,i+1);assert.equal(Boolean(report.suppressed),i<4);
    if(i===4) {
      assert.equal(report.n,45);assert.equal(report.c,30);
      assert.ok(report.items[0].choices[0].misconception);
      assert.ok(!JSON.stringify(report).includes(receipt.token));
    }
  }
  assert.equal(db.prepare("SELECT count(*) AS n FROM receipts WHERE payload IS NOT NULL OR locked<>'{}'").get().n,0);
  assert.deepEqual(await api(student),published);
  const practice=snapshot(questions.slice(0,1),{kind:'practice',feedbackTiming:'immediate',retakes:'repeat'});
  const pid=(await api('/teacher/assignments',{key:token,body:practice})).body.id;
  const path='/student/'+pid, browser=randomUUID(), rec=(await api(path+'/start',{body:{browser}})).body;
  assert.equal((await api(path+'/submit',{body:{...rec,answers:[0]}})).status,409);
  assert.equal((await api(path+'/answer',{body:{...rec,index:0,choice:0}})).status,200);
  assert.equal((await api(path+'/answer',{body:{...rec,index:0,choice:1}})).status,409);
  assert.equal((await api(path+'/submit',{body:{...rec,answers:[0]}})).status,200);
  assert.notEqual((await api(path+'/start',{body:{browser}})).body.token,rec.token);
  assert.equal((await api('/teacher/'+id,{key:token,method:'DELETE'})).status,200);
  assert.equal((await api(student)).status,404);
  assert.equal(db.prepare('SELECT count(*) AS n FROM totals WHERE assignment=?').get(id).n,0);
});
