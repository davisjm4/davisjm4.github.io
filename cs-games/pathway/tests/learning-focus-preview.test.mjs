import assert from 'node:assert/strict';
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
