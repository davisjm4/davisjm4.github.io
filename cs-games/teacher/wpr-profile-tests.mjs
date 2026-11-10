import './test-runtime.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { startDev, sqliteAdapter } from '../../wpr-games/workplace-readiness/service/dev.mjs';
import { purgeProfiles } from '../../wpr-games/workplace-readiness/service/profiles.mjs';
import { practiceEvent, DAY } from '../../wpr-games/workplace-readiness/online/profile-model.mjs';
import { profileCsv } from '../../wpr-games/workplace-readiness/online/profile-report.mjs';
import { generateDiagnostic } from './wpr-online-builder.mjs';

const teacher='local-profile-teacher-test-secret';
const other='other-profile-teacher-test-secret';

async function fixture(t) {
  const {server,db,url}=await startDev({teacherTokens:{teacher,other}});
  t.after(()=>{server.close();db.close();});
  async function api(path,key,body,method=body?'POST':'GET') {
    const headers={};
    if (key) headers.Authorization='Bearer '+key;
    if (body) headers['Content-Type']='application/json';
    const response=await fetch(url+'/api/wpr'+path,{method,headers,body:body?JSON.stringify(body):undefined});
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    return {status:response.status,data:await response.json()};
  }
  const create=async key=>{
    const r=await api('/teacher/profiles',key,{title:'Period 5'});
    assert.equal(r.status,200,JSON.stringify(r.data));
    return {...r.data,path:'/teacher/profiles/'+r.data.id};
  };
  const enroll=async c=>{
    const r=await api('/profile/enroll',null,{invite:c.invite});
    assert.equal(r.status,200,JSON.stringify(r.data));
    return r.data;
  };
  return {api,db,create,enroll};
}

test('profile auth, class isolation, offline replay, teacher export and cross-device recovery',async t=>{
  const {api,db,create,enroll}=await fixture(t);
  assert.equal((await api('/teacher/profiles')).status,401);
  assert.equal((await api('/teacher/profiles',teacher,{title:'Period 5',studentName:'Do not store'})).status,400);
  const c=await create(teacher), differentOwner=await create(other), sameOwner=await create(teacher);
  const a=await enroll(c), b=await enroll(c);
  assert.notEqual(a.id,b.id);
  assert.equal((await api(c.path,other)).status,404);
  assert.equal((await api(differentOwner.path,teacher)).status,404);
  assert.equal((await api(sameOwner.path+'/students/'+a.id,teacher)).status,404);
  assert.equal((await api('/profile/me',a.id)).status,401);
  assert.equal((await api('/profile/me/'+b.id,a.token)).status,404);
  assert.equal((await api('/profile/me?id='+b.id,a.token)).data.id,a.id);
  const event=practiceEvent({skill:'creativity-and-innovation'},true,Date.now()-DAY);
  assert.equal((await api('/profile/sync',a.token,{events:[{...event,activity:'robotics'}]})).status,400);
  assert.equal((await api('/profile/sync',a.token,{events:[{...event,dimensions:[{scope:'skill',id:'arbitrary-value'}]}]})).status,400);
  const tries=await Promise.all([1,2,3].map(()=>api('/profile/sync',a.token,{id:b.id,events:[event]})));
  for (const result of tries) assert.deepEqual(result,{status:200,data:{accepted:[event.id]}});
  assert.equal((await api('/profile/me',b.token)).data.activity.length,0);
  const replacement=(await api('/profile/restore',null,{id:a.id,recovery:a.recovery})).data;
  assert.equal(replacement.id,a.id);
  assert.notEqual(replacement.token,a.token);
  const report=(await api('/profile/me',replacement.token)).data;
  assert.deepEqual(report.activity.map(({events,n,c})=>[events,n,c]),[[1,1,1]]);
  assert.equal(report.measures[0].id,'creativity-and-innovation');
  assert.match(profileCsv(report),new RegExp(a.id));
  assert.equal((await api(c.path+'/progress',other)).status,404);
  const progress=await api(c.path+'/progress',teacher);
  assert.equal(progress.status,200,JSON.stringify(progress.data));
  assert.equal(progress.data.reports.find(r=>r.id===a.id).measures[0].c,1);
  const roster=(await api(c.path,teacher)).data.roster;
  assert.deepEqual(roster.map(p=>p.id).sort(),[a.id,b.id].sort());
  const stored=db.prepare('SELECT recovery FROM student_profiles WHERE id=?').get(a.id).recovery;
  assert.notEqual(stored,a.recovery);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profile_sessions WHERE digest=?').get(a.token).n,0);
  assert.equal((await api('/profile/signout',replacement.token,{})).status,200);
  assert.equal((await api('/profile/me',replacement.token)).status,401);
  assert.equal((await api('/profile/me',a.token)).status,200);
});

test('teacher-issued IDs, invite rotation, revoke/reset, rate limits and retention',async t=>{
  const {api,db,create,enroll}=await fixture(t);
  const c=await create(teacher), oldInvite=c.invite;
  c.invite=(await api(c.path+'/invite',teacher,{})).data.invite;
  assert.equal((await api('/profile/enroll',null,{invite:oldInvite})).status,404);
  const a=await enroll(c);
  const issue=await api(c.path+'/students',teacher,{});
  assert.equal(issue.status,200);
  const b=(await api('/profile/restore',null,issue.data)).data;
  assert.ok(b.token);
  const person=c.path+'/students/'+a.id;
  assert.equal((await api(person+'/revoke',other,{})).status,404);
  assert.equal((await api(person+'/revoke',teacher,{})).status,200);
  assert.equal((await api('/profile/me',a.token)).status,401);
  assert.equal((await api('/profile/restore',null,{id:a.id,recovery:a.recovery})).status,401);
  const fresh=(await api(person+'/reset',teacher,{})).data;
  const restored=(await api('/profile/restore',null,fresh)).data;
  assert.equal(restored.id,a.id);
  assert.equal((await api('/profile/me',a.token)).status,401);
  assert.equal((await api('/profile/me',restored.token)).status,200);
  const invented=randomUUID();
  for(let i=0;i<8;i++) assert.equal((await api('/profile/restore',null,{id:invented,recovery:a.recovery})).status,401);
  assert.equal((await api('/profile/restore',null,{id:invented,recovery:a.recovery})).status,429);
  assert.equal((await api(person,teacher,null,'DELETE')).status,200);
  assert.equal((await api('/profile/me',restored.token)).status,401);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profile_sessions WHERE profile=?').get(a.id).n,0);
  assert.equal((await api(c.path+'/archive',teacher,{})).status,200);
  assert.equal((await api('/profile/me',b.token)).status,401);
  assert.equal((await api('/profile/enroll',null,{invite:c.invite})).status,404);
  assert.equal((await api(c.path,teacher)).data.roster.length,1);
  await purgeProfiles(sqliteAdapter(db),Date.now()+31*DAY);
  assert.equal((await api(c.path,teacher)).status,404);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_profiles').get().n,0);
});

test('class assignment scores are server verified, scoped, idempotent and separate from anonymous assignments',async t=>{
  const {api,db,create,enroll}=await fixture(t);
  const c=await create(teacher), d=await create(other), a=await enroll(c), b=await enroll(c), outside=await enroll(d);
  const questions=generateDiagnostic({difficulty:'mixed',skills:[],contexts:[],modes:[]},[{scope:'topic',id:'attire-ppe',name:'PPE',count:3}],'profile-tests');
  const base={title:'PPE diagnostic',version:1,kind:'diagnostic',reporting:true,
    feedbackTiming:'after',retakes:'once',shuffle:false,closes:null,questions};
  assert.equal((await api('/teacher/assignments',teacher,{...base,profileClassId:d.id})).status,404);
  const publish=await api('/teacher/assignments',teacher,{...base,profileClassId:c.id});
  assert.equal(publish.status,200,JSON.stringify(publish.data));
  const path='/student/'+publish.data.id;
  assert.equal((await api(path)).data.profileRequired,true);
  assert.equal((await api(path+'/start',null,{})).status,401);
  assert.equal((await api(path+'/start',outside.token,{})).status,403);
  const rec=(await api(path+'/start',a.token,{})).data;
  const answers=questions.map(q=>q.correctIndex);
  assert.equal((await api(path+'/submit',b.token,{...rec,answers})).status,404);
  const restored=(await api('/profile/restore',null,{id:a.id,recovery:a.recovery})).data;
  assert.deepEqual((await api(path+'/start',restored.token,{})).data,rec);
  const saved=await Promise.all([1,2].map(()=>api(path+'/submit',restored.token,{...rec,answers})));
  assert.ok(saved.every(r=>r.status===200 && r.data.c===3));
  assert.equal((await api(path+'/start',a.token,{})).status,409);
  const report=(await api('/profile/me',a.token)).data;
  assert.equal(report.assessments.length,1);
  assert.equal(report.assessments[0].c,3);
  assert.ok(report.assessments[0].dimensions.some(d=>d.id==='attire-ppe'));
  assert.equal((await api('/profile/me',b.token)).data.assessments.length,0);
  const anonymous=(await api('/teacher/assignments',teacher,base)).data.id;
  const anonPath='/student/'+anonymous;
  const anon=(await api(anonPath+'/start',a.token,{browser:randomUUID()})).data;
  assert.equal((await api(anonPath+'/submit',a.token,{...anon,answers})).status,200);
  assert.equal((await api('/profile/me',a.token)).data.assessments.length,1);
  assert.equal((await api(c.path,teacher,null,'DELETE')).status,200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM performance_events').get().n,0);
  assert.equal((await api(path)).status,404);
  assert.equal((await api(anonPath)).status,200);
});
