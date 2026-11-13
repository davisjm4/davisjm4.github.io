import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { get } from 'node:http';
import { test } from 'node:test';
import { startAudit } from './launch.mjs';
import { startDev, sqliteAdapter } from '../../wpr-games/workplace-readiness/service/dev.mjs';
import worker from '../../wpr-games/workplace-readiness/service/worker.mjs';

test('loopback audit fixtures, authorization, and a disposable reset',async t=>{
  const audit = await startAudit();
  t.after(audit.close);
  const {api,classes,teacherToken,secondTeacherToken,url,db} = audit;
  assert.equal(new URL(url).hostname,'127.0.0.1');
  assert.equal(db.location(),null);
  assert.equal(classes.length,4);
  for (const course of classes) {
    const roster = await api('/teacher/profiles/'+course.id,{token:teacherToken});
    assert.equal(roster.roster.length,24);
    const reports = await api('/teacher/profiles/'+course.id+'/progress',{token:teacherToken});
    assert.equal(reports.reports.length,24);
    assert.ok(reports.reports.some(r=>r.activity.length===0));
    assert.ok(reports.reports.some(r=>r.activity.some(a=>a.kind==='practice'&&a.n>=20&&a.c/a.n<0.5)));
  }
  const [csp,advanced,robotics,wpr] = classes;
  const person = advanced.students[3];
  const localTeacher = await api('/teacher/session',{token:teacherToken,body:{}});
  const restore = await api('/profile/restore',{body:{id:person.id,recovery:person.recovery}});
  const {token} = restore;
  assert.equal((await api('/pathways/student/'+advanced.id,{token})).pathway.proficiency.skills[advanced.node].level,2);
  await api('/pathways/student/'+robotics.id,{token,status:403});
  await api('/student/'+wpr.diagnosticId+'/start',{token,body:{},status:403});
  await api('/profile/restore',{body:{id:csp.students[0].id,recovery:person.recovery},status:401});
  await api('/teacher/profiles/'+advanced.id,{token,status:401});
  await api('/teacher/profiles/'+advanced.id,{token:secondTeacherToken,status:404});
  await api('/teacher/profiles/'+advanced.id+'/students',{body:{},status:401});
  await api('/teacher/'+wpr.diagnosticId,{token,status:401});
  const report = await api('/teacher/'+wpr.diagnosticId,{token:teacherToken});
  assert.equal(report.completed,7);
  assert.equal(report.suppressed,undefined);
  const welcome = await fetch(url+'/audit/');
  assert.equal(welcome.status,200);
  assert.match(welcome.headers.get('content-security-policy'),/connect-src 'self'/);
  assert.match(welcome.headers.get('cache-control'),/no-store/);
  assert.equal((await fetch(url+'/audit/',{headers:{Origin:'https://example.invalid'}})).status,403);
  assert.equal((await fetch(url+'/audit/',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
  const foreignHost = await new Promise((resolve,reject)=>{
    get(url+'/audit/',{headers:{Host:'example.invalid'}},response=>{response.resume();resolve(response.statusCode);}).on('error',reject);
  });
  assert.equal(foreignHost,403);
  assert.equal((await fetch(url+'/_audit/cs-games/launch.mjs')).status,404);
  assert.equal((await fetch(url+'/wpr-games/workplace-readiness/service/dev.mjs')).status,404);

  // The same Worker with production-shaped bindings and no local verifier.
  // Reuse this test DB so even an existing synthetic session row must be rejected.
  const productionShape = {DB:sqliteAdapter(db),GOOGLE_CLIENT_ID:'synthetic-client-id',
    TEACHER_EMAILS:'approved@example.invalid',ENABLE_STUDENT_PROFILES:'1',
    ALLOWED_ORIGINS:'https://davisjm4.github.io'};
  for (const [path,method,credential] of [
    ['session','POST',teacherToken],['session','GET',localTeacher.token],['profiles','GET',teacherToken]
  ]) {
    const request = new Request('https://audit.invalid/api/wpr/teacher/'+path,{
      method,headers:{Origin:'https://davisjm4.github.io',Authorization:'Bearer '+credential}
    });
    const response = await worker.fetch(request,productionShape);
    assert.equal(response.status,401);
  }
  assert.equal((await worker.fetch(new Request('https://audit.invalid/audit/'),productionShape)).status,404);

  await api('/teacher/profiles/'+advanced.id+'/students',{token:teacherToken,body:{}});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_profiles').get().n,97);
  const reset = await startAudit();
  t.after(reset.close);
  assert.notEqual(reset.url,url);
  assert.notEqual(reset.teacherToken,teacherToken);
  await reset.api('/teacher/profiles',{token:teacherToken,status:401});
  await reset.api('/teacher/profiles',{token:localTeacher.token,status:401});
  await reset.api('/profile/me',{token,status:401});
  await reset.api('/profile/restore',{body:{id:person.id,recovery:person.recovery},status:401});
  await reset.api('/profile/enroll',{body:{invite:advanced.invite},status:404});
  assert.equal(reset.db.prepare('SELECT COUNT(*) AS n FROM student_profiles').get().n,96);

  const ordinaryDev = await startDev({teacherTokens:{teacher:randomBytes(32).toString('hex')}});
  t.after(async()=>{
    await new Promise(resolve=>ordinaryDev.server.close(resolve));
    ordinaryDev.db.close();
  });
  assert.equal((await fetch(ordinaryDev.url+'/audit/')).status,404);
});
