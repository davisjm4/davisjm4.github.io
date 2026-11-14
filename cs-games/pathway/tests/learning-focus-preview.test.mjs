import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { startDev } from '../../../wpr-games/workplace-readiness/service/dev.mjs';

const teacher = 'synthetic-learning-focus-owner';
const other = 'synthetic-learning-focus-other';

test('learning-focus preview uses the owner, published class target and active recipient scope', async t => {
  const dev = await startDev({ teacherTokens: { teacher, other } });
  t.after(async () => { await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  async function post(path, body, token = teacher, status = 200) {
    const response = await fetch(dev.url + '/api/wpr' + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  const classroom = await post('/teacher/profiles', { title: 'Focus preview', courseId: 'advanced' });
  const foreign = await post('/teacher/profiles', { title: 'Foreign focus class', courseId: 'advanced' }, other);
  const students = '/teacher/profiles/' + classroom.id + '/students';
  const first = await post(students, {});
  const second = await post(students, {});
  const outsider = await post('/teacher/profiles/' + foreign.id + '/students', {}, other);
  const route = '/teacher/learning-focus/' + classroom.id + '/preview';
  const nodeId = 'node:advanced:loop-lab:looptype';
  const target = { kind: 'skill', id: nodeId };
  const base = { scope: 'class', target };

  const result = await post(route, base);
  assert.equal(result.mode, 'advisory');
  assert.equal(result.pathwayRevision, 1);
  assert.equal(result.classId, classroom.id);
  assert.equal(result.activeRecipientCount, 2);
  assert.deepEqual(result.recipientIds, []);
  assert.equal(Object.hasOwn(result, 'affectedIds'), false);
  assert.equal((await fetch(dev.url+'/api/wpr'+route.replace(/preview$/, 'publish'), {
    method: 'POST', headers: { Authorization: 'Bearer '+teacher }, body: '{}'
  })).status, 404);
  assert.deepEqual(result.destinations, [{ nodeId, activityId: 'loop-lab' }]);

  for (const [scope, recipientIds, nextTarget] of [
    ['individual', [first.id], { kind: 'area', id: 'area:advanced:loop-lab' }],
    ['group', [first.id, second.id], { kind: 'skill-group', nodeIds: [nodeId, 'node:advanced:loop-lab:components'] }],
    ['class', [], { kind: 'activity', id: 'loop-lab' }],
  ]) {
    const startAt = Date.now() + 60000;
    const preview = await post(route, {
      scope, recipientIds, target: nextTarget, mode: 'restricted', startAt, timeZone: 'America/Los_Angeles',
    });
    assert.equal(preview.mode, 'restricted');
    assert.equal(preview.activeRecipientCount, scope === 'class' ? 2 : recipientIds.length);
    assert.equal(preview.timeZone, 'America/Los_Angeles');
    assert.equal(preview.startAt, startAt);
    assert.equal(preview.recipientIds.length, recipientIds.length);
    assert.ok(preview.destinations.some(destination => destination.nodeId === nodeId));
  }

  await post(route, base, other, 404);
  const learner = await post('/profile/enroll', { invite: classroom.invite }, '');
  await post(route, base, learner.token, 401);
  await post(route, { ...base, scope: 'individual', recipientIds: [outsider.id] }, teacher, 400);
  await post(route, { ...base, target: { kind: 'skill', id: 'node:csp:binary' } }, teacher, 400);
  await post(route, { ...base, startAt: Date.now() + 60000, timeZone: 'Invalid/Zone' }, teacher, 400);
  await post(students + '/' + first.id + '/revoke', {});
  await post(route, { ...base, scope: 'individual', recipientIds: [first.id] }, teacher, 400);
  assert.equal(dev.db.prepare('SELECT COUNT(*) count FROM performance_events').get().count, 0);
});

test('gated focus publication is atomic, checks reviewed scope, and retries one immutable record', async t => {
  const dev = await startDev({
    teacherTokens: { teacher, other },
    pathwayAdapters: { ENABLE_TEACHER_DIRECTED_LEARNING: '1' },
  });
  t.after(async () => { await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  dev.db.exec(readFileSync(new URL('../../../wpr-games/workplace-readiness/service/migrations/0008_learning_focus.sql', import.meta.url), 'utf8'));

  async function post(path, body, token = teacher) {
    const response = await fetch(dev.url + '/api/wpr' + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  }
  const { data: classInfo } = await post('/teacher/profiles', { title: 'Synthetic focus publication', courseId: 'advanced' });
  const classRoute = '/teacher/profiles/' + classInfo.id;
  const route = '/teacher/learning-focus/' + classInfo.id;
  const { data: student } = await post(classRoute + '/students', {});
  const assignment = { scope: 'individual', recipientIds: [student.id], mode: 'restricted',
    target: { kind: 'skill', id: 'node:advanced:loop-lab:looptype' } };
  async function prepare(assignment) {
    const { status, data: preview } = await post(route + '/preview', assignment);
    assert.equal(status, 200, JSON.stringify(preview));
    return { assignment, requestId: crypto.randomUUID(), previewAt: preview.previewAt, previewSignature: preview.previewSignature };
  }

  const request = await prepare(assignment);
  assert.equal((await post(route + '/publish', request, other)).status, 404);
  assert.equal((await post(route + '/publish', { ...request, assignment: { ...assignment, mode: 'advisory' } })).status, 409);
  assert.equal((await post(route + '/publish', { ...request, previewAt: request.previewAt - 660000 })).status, 409);
  const results = await Promise.all([post(route + '/publish', request), post(route + '/publish', request)]);
  for (const entry of results) assert.deepEqual(entry, { status: 200, data: { id: request.requestId, revision: 1 } });
  assert.equal((await post(route + '/publish', { ...request, assignment: { ...assignment, mode: 'advisory' } })).status, 409);
  assert.equal(dev.db.prepare('SELECT COUNT(*) count FROM learning_focus').get().count, 1);
  assert.deepEqual(dev.db.prepare('SELECT scope,restricted FROM learning_focus_revisions').get(), Object.assign(Object.create(null), { scope: 'individual', restricted: 1 }));
  assert.equal(dev.db.prepare('SELECT profile_id FROM learning_focus_recipients').get().profile_id, student.id);

  const wholeClass = await prepare({ scope: 'class', target: assignment.target });
  await post(classRoute + '/students', {});
  assert.equal((await post(route + '/publish', wholeClass)).status, 409);
  const revoked = await prepare(assignment);
  const sameCount = await prepare({ scope: 'class', target: assignment.target });
  await post(classRoute + '/students/' + student.id + '/revoke', {});
  await post(classRoute + '/students', {});
  assert.equal((await post(route + '/publish', sameCount)).status, 409);
  assert.equal((await post(route + '/publish', revoked)).status, 400);
  assert.equal(dev.db.prepare('SELECT COUNT(*) count FROM learning_focus').get().count, 1);
  assert.equal(dev.db.prepare('SELECT COUNT(*) count FROM performance_events').get().count, 0);
});

test('owner reads and revision actions retain older grants and release them by profile', async t => {
  const dev = await startDev({ teacherTokens: { teacher, other }, pathwayAdapters: { ENABLE_TEACHER_DIRECTED_LEARNING: '1' } });
  t.after(async () => { await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  dev.db.exec(readFileSync(new URL('../../../wpr-games/workplace-readiness/service/migrations/0008_learning_focus.sql', import.meta.url), 'utf8'));
  async function call(path, body, token = teacher, expected = 200) {
    const response = await fetch(dev.url + '/api/wpr' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, expected, JSON.stringify(data));
    return data;
  }
  const room = await call('/teacher/profiles',{title:'Lifecycle',courseId:'advanced'});
  const learner = await call('/profile/enroll',{invite:room.invite},'');
  const peer = await call('/profile/enroll',{invite:room.invite},'');
  const path = '/teacher/learning-focus/' + room.id;
  const student = '/profile/learning-focus';
  const work = token=>call(student,undefined,token);
  async function publish(assignment,edit) {
    const {previewAt,previewSignature}=await call(path+'/preview',{...assignment,...(edit ? {edit} : {})});
    return call(path+'/publish',{assignment,edit,previewAt,previewSignature,requestId:crypto.randomUUID()});
  }
  const a={kind:'skill',id:'node:advanced:loop-lab:looptype'};
  const b={kind:'skill',id:'node:advanced:loop-lab:components'};
  const one={scope:'individual',recipientIds:[learner.id],mode:'restricted',target:a};
  const all={scope:'class',mode:'restricted',target:b};
  const catchUp=await publish(one);
  const whole=await publish(all);
  await call(path,undefined,other,404);
  await call(path+'/preview',{...one,edit:catchUp},other,404);
  let loaded=await work(learner.token);
  assert.deepEqual(loaded.classwork.map(row=>row.id),[whole.id]);
  assert.deepEqual(loaded.catchUp.map(row=>row.id),[catchUp.id]);
  assert.equal((await work(peer.token)).catchUp.length,0);
  assert.ok(!JSON.stringify(loaded).includes(peer.id));
  const edited=await publish({...one,mode:'advisory',target:b},catchUp);
  loaded=await work(learner.token);
  assert.deepEqual(loaded.allowed.map(row=>row.nodeId).sort(),[a.id,b.id].sort());
  assert.equal(loaded.recommendations.length,1);
  const view=await call(path);
  assert.equal(view.activeRestrictions.length,2);
  assert.equal(view.activeRestrictions.find(row=>row.profileId===learner.id).grants.length,2);
  const release={requestId:crypto.randomUUID(),grants:[
    {...whole,profileId:learner.id},{...whole,profileId:crypto.randomUUID()},
  ]};
  await call(path+'/release',release,other,404);
  for(let retry=0;retry<2;retry++){
    assert.deepEqual((await call(path+'/release',release)).results.map(row=>row.status),['released','unavailable']);
  }
  assert.equal((await work(learner.token)).restricted,true);
  assert.equal((await work(peer.token)).restricted,true);
  const command={...edited,requestId:crypto.randomUUID()};
  await call(path+'/end',{...catchUp,requestId:crypto.randomUUID()},teacher,409);
  const ended=await call(path+'/end',command);
  assert.equal(ended.state,'ended');
  assert.deepEqual(await call(path+'/end',command),ended);
  assert.equal((await work(learner.token)).restricted,false);
  assert.equal((await work(peer.token)).restricted,true);
});
