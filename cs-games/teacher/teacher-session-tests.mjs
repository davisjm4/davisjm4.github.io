import assert from 'node:assert/strict';
import {test} from 'node:test';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';

test('opaque teacher sessions expire, revoke, and retain account-level authorization', async t => {
  const credentials={teacher:'development-teacher-fixture-12345',other:'another-teacher-fixture-12345678'};
  const {url,server,db}=await startDev({teacherTokens:credentials});
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();});
  async function request(path,token,method='GET',body,origin=url) {
    const response=await fetch(url+'/api/wpr'+path,{
      method,headers:{Origin:origin,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined
    });
    return {response,data:await response.json()};
  }
  assert.equal((await request('/teacher/session','wrong','POST')).response.status,401);
  assert.equal((await request('/teacher/session',credentials.teacher,'POST',undefined,'https://other.example')).response.status,403);
  const {response,data:session}=await request('/teacher/session',credentials.teacher,'POST');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('set-cookie'),null);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(session.token,/^csgt_[0-9a-f]{64}$/);
  assert.equal(session.account,'teacher');
  assert.ok(session.expires>Date.now() && session.expires<=Date.now()+7200000);
  const stored=db.prepare('SELECT * FROM teacher_sessions').get();
  assert.notEqual(stored.digest,session.token);
  assert.match(stored.digest,/^[0-9a-f]{64}$/);
  assert.equal((await request('/teacher/session',session.token,'POST')).response.status,401);
  assert.equal((await request('/teacher/session',session.token)).data.account,'teacher');
  const {data:classroom}=await request('/teacher/profiles',session.token,'POST',{title:'Synthetic review class',courseId:'advanced'});
  assert.equal((await request('/teacher/profiles/'+classroom.id,session.token)).data.class.title,'Synthetic review class');
  assert.equal((await request('/teacher/profiles/'+classroom.id,credentials.other)).response.status,404);
  assert.equal((await request('/teacher/session',session.token,'DELETE')).response.status,200);
  assert.equal((await request('/teacher/profiles',session.token)).response.status,401);
  const replacement=(await request('/teacher/session',credentials.teacher,'POST')).data;
  db.prepare('UPDATE teacher_sessions SET expires=?').run(Date.now()-1);
  assert.equal((await request('/teacher/session',replacement.token)).response.status,401);
  assert.equal((await request('/teacher/profiles',replacement.token)).response.status,401);
  assert.equal((await request('/teacher/profiles/'+classroom.id,credentials.teacher)).response.status,200);
});
