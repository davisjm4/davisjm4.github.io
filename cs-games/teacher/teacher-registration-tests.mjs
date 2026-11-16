import assert from 'node:assert/strict';
import {test} from 'node:test';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';

test('two self-registered teachers and the existing Google owner have isolated workspaces', async t => {
  const settings = {
    ENABLE_TEACHER_ACCOUNTS:'1',
    GOOGLE_CLIENT_ID:'fictional-cs-games-client',
    TEACHER_EMAILS:'legacy@gmail.com',
    TEACHER_AUTH_SECRET:'synthetic-rate-limit-secret'.repeat(2),
    TEACHER_MAIL_API_KEY:'synthetic-mail-key',
    TEACHER_MAIL_FROM:'CS Games Test <codes@fixture.example>'
  };
  const dev = await startDev({pathwayAdapters:settings});
  t.after(async () => {
    await new Promise(resolve=>dev.server.close(resolve));
    dev.db.close();
  });
  const keys = await crypto.subtle.generateKey({
    name:'RSASSA-PKCS1-v1_5', modulusLength:2048,
    publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256'
  }, true, ['sign','verify']);
  const jwk = {...await crypto.subtle.exportKey('jwk', keys.publicKey), kid:'registration-fixture'};
  const mailbox = new Map();
  const realFetch = globalThis.fetch;
  t.after(() => {globalThis.fetch = realFetch;});
  globalThis.fetch = async (url, options) => {
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({keys:[jwk]});
    if (url === 'https://api.resend.com/emails') {
      const {to:[address], text} = JSON.parse(options.body);
      mailbox.set(address, text.match(/\b[a-f0-9]{32}\b/)[0]);
      return Response.json({id:'synthetic-email'});
    }
    return realFetch(url,options);
  };
  async function googleToken(email, sub, overrides = {}) {
    const now = Math.floor(Date.now()/1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const header = encode({alg:'RS256',kid:jwk.kid});
    const payload = encode({iss:'https://accounts.google.com',aud:settings.GOOGLE_CLIENT_ID,
      email,email_verified:true,sub,iat:now,exp:now+3600,jti:crypto.randomUUID(),...overrides});
    const input = header + '.' + payload;
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(input));
    return input + '.' + Buffer.from(sig).toString('base64url');
  }
  async function call(path, {token, body, method, origin = dev.url, ip = '192.0.2.1'} = {}) {
    const response = await fetch(dev.url+'/api/wpr'+path,{
      method:method || (body === undefined ? 'GET' : 'POST'),
      headers:{Origin:origin,'CF-Connecting-IP':ip,...(token ? {Authorization:'Bearer '+token} : {}),
        ...(body === undefined ? {} : {'Content-Type':'application/json'})},
      body:body === undefined ? undefined : JSON.stringify(body)
    });
    return {status:response.status,data:await response.json()};
  }
  async function ok(path, options) {
    const result = await call(path,options);
    assert.equal(result.status,200,JSON.stringify(result.data));
    return result.data;
  }
  const google = (token,mode = 'signup') => call('/teacher/session',{token,body:{mode}});
  const email = (mode,action,address,code,options = {}) =>
    call('/teacher/email',{...options,body:{mode,action,email:address,code}});
  const school = 'teacher@school.example';
  const personal = 'new.teacher@gmail.com';
  const googleCredential = await googleToken(personal,'10001');
  const legacyCredential = await googleToken('legacy@gmail.com','10003');
  const invalidCredential = await googleToken(personal,'10001',{email_verified:false});
  const fallbackCredential = await googleToken(school,'10004');
  const migration = dev.db.prepare('SELECT COUNT(*) AS count FROM teacher_accounts');
  assert.equal(migration.get().count,0);
  assert.deepEqual(await ok('/teacher/registration'),{enabled:true,signup:true,email:true});

  settings.ENABLE_TEACHER_ACCOUNTS = '0';
  assert.equal((await google(googleCredential)).status,401);
  assert.equal((await email('signup','send',school)).status,503);
  const originalSession = await ok('/teacher/session',{token:legacyCredential,method:'POST'});
  const legacyClass = await ok('/teacher/profiles',{token:originalSession.token,body:{title:'Retained test class',courseId:'advanced'}});
  settings.ENABLE_TEACHER_ACCOUNTS = '1';

  assert.equal((await google(googleCredential,'signin')).status,401);
  assert.equal((await google(invalidCredential)).status,401);
  assert.equal((await google(fallbackCredential)).status,401);
  assert.equal((await call('/teacher/session',{token:legacyCredential,method:'POST'})).status,401);
  const {status:registered,data:first} = await google(googleCredential);
  assert.equal(registered,200,JSON.stringify(first));
  assert.equal(first.owner,'google:10001');
  assert.equal((await google(googleCredential)).status,401,'Google credential replay');
  assert.equal((await call('/teacher/profiles',{token:googleCredential})).status,401,'Google JWT is not a session');
  const legacy = await google(legacyCredential,'signin');
  assert.equal(legacy.status,200,JSON.stringify(legacy.data));
  assert.equal(legacy.data.owner,originalSession.owner);

  assert.equal((await email('signup','send',school,undefined,{origin:'https://unrelated.example'})).status,403);
  assert.equal((await email('signup','send',school.toUpperCase())).status,200);
  const signupCode = mailbox.get(school);
  assert.equal((await email('signin','verify',school,signupCode)).status,401,'Codes are scoped to their purpose');
  const concurrent = await Promise.all([
    email('signup','verify',school,signupCode),
    email('signup','verify',school,signupCode)
  ]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,401]);
  const second = concurrent.find(r=>r.status===200).data;
  assert.match(second.owner,/^email:/);
  assert.equal(migration.get().count,3);
  for (const active of [first, second]) {
    assert.deepEqual((await ok('/teacher/profiles',{token:active.token})).classes,[]);
    assert.deepEqual((await ok('/pathways/teacher',{token:active.token})).pathways,[]);
    assert.deepEqual((await ok('/teacher/assignments',{token:active.token})).assignments,[]);
    assert.equal((await call('/teacher/profiles/'+legacyClass.id,{token:active.token})).status,404);
  }
  assert.equal((await ok('/teacher/profiles/'+legacyClass.id,{token:legacy.data.token})).class.title,'Retained test class');
  assert.equal((await ok('/teacher/profiles/'+legacyClass.id,{token:originalSession.token})).class.title,'Retained test class');
  assert.equal((await email('signup','send',personal)).status,200);
  assert.equal((await email('signup','verify',personal,mailbox.get(personal))).status,409);
  assert.equal((await google(await googleToken(school,'10009',{hd:'school.example'}))).status,409,'Google cannot take over an email account');

  const created = [];
  for (const active of [first,second]) {
    const opts = {token:active.token};
    const classroom = await ok('/teacher/profiles',{...opts,body:{title:active.provider+' synthetic class',courseId:'advanced'}});
    const root = '/teacher/profiles/'+classroom.id;
    const student = await ok('/profile/enroll',{body:{invite:classroom.invite}});
    assert.equal((await ok(root+'/students/'+student.id,opts)).classTitle,active.provider+' synthetic class');
    const [pathway] = (await ok('/pathways/teacher',opts)).pathways;
    assert.equal(pathway.classId,classroom.id);
    const assignment = crypto.randomUUID();
    dev.db.prepare('INSERT INTO assignments(id,owner,snapshot,created,expires) VALUES(?,?,?,?,?)')
      .run(assignment,active.owner,JSON.stringify({title:'Private diagnostic',kind:'diagnostic',questions:[]}),Date.now(),Date.now()+60_000);
    assert.deepEqual((await ok('/teacher/assignments',opts)).assignments.map(item=>item.id),[assignment]);
    assert.equal((await ok('/teacher/assignments/'+assignment,opts)).title,'Private diagnostic');
    created.push({root,student,pathway,assignment});
  }
  for (const [active, foreign] of [[first,created[1]],[second,created[0]]]) {
    const opts = {token:active.token};
    for (const path of [foreign.root,foreign.root+'/progress',foreign.root+'/students/'+foreign.student.id,
      '/pathways/teacher/'+foreign.pathway.id,'/teacher/assignments/'+foreign.assignment]) {
      assert.equal((await call(path,opts)).status,404,path);
    }
    assert.equal((await call(foreign.root,{...opts,method:'DELETE'})).status,404);
    assert.equal((await call(foreign.root+'/students',{...opts,body:{}})).status,404);
    assert.equal((await call('/teacher/assignments/'+foreign.assignment,{...opts,method:'DELETE'})).status,404);
  }

  settings.PAUSE_TEACHER_SIGNUP = '1';
  assert.equal((await ok('/teacher/registration')).signup,false);
  assert.equal((await google(await googleToken('new@gmail.com','10005'))).status,401);
  assert.equal((await email('signup','send','new@school.example')).status,503);
  assert.equal((await email('signin','send',school)).status,200);
  const recovered = await email('signin','verify',school,mailbox.get(school));
  assert.equal(recovered.status,200,JSON.stringify(recovered.data));
  assert.equal(recovered.data.owner,second.owner);
  assert.equal((await ok(created[1].root,{token:recovered.data.token})).class.title,'email synthetic class');
  assert.equal((await email('signin','send',school)).status,200);
  dev.db.prepare("UPDATE teacher_auth_proofs SET expires=0 WHERE purpose='signin'").run();
  assert.equal((await email('signin','verify',school,mailbox.get(school))).status,401);
  assert.equal((await email('signin','send',school)).status,200);
  assert.equal((await email('signin','send',school,undefined,{ip:'192.0.2.2'})).status,429,'Per-mailbox rate limit');
  await ok('/teacher/sessions',{token:recovered.data.token,method:'DELETE'});
  assert.equal((await call('/teacher/profiles',{token:second.token})).status,401);
  assert.equal((await call('/teacher/profiles',{token:first.token})).status,200);
  await ok('/teacher/session',{token:recovered.data.token,method:'DELETE'});
  assert.equal((await call('/teacher/profiles',{token:recovered.data.token})).status,401);
});
