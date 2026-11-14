import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assignmentDestinations, classLaunchDecision, classWork, recommendedWork } from '../assignments/access.mjs';

const skill = (id, areaId, ...activityIds) => ({ id, areaId, practice: activityIds.map(activityId => ({ activityId })) });
const pathway = { classId: 'class', nodes: [skill('A', 'first', 'shared'), skill('B', 'second', 'different'), skill('C', 'second', 'shared')] };
const member = { id: 'one', classId: 'class', active: true };
const target = id => ({ kind: 'skill', id });
const make = (id, scope, nodeId, overrides = {}) => ({
  id, classId: pathway.classId, scope, recipientIds: scope === 'class' ? [] : [member.id], state: 'published',
  startAt: 50, order: 0, target: target(nodeId), destinations: assignmentDestinations(pathway, target(nodeId)), ...overrides,
});
const grant = (id, releasedProfileIds = []) => ({ id, active: true, releasedProfileIds });
const decide = (items, nodeId, activityId, overrides = {}) => classLaunchDecision({
  member, pathway, items, now: 100, fresh: true, destination: { nodeId, activityId }, ...overrides,
});

test('classwork takes priority in either creation order and group work stays with catch-up', () => {
  const individual = make('catch-up', 'individual', 'A', { startAt: 25 });
  const whole = make('classwork', 'class', 'B');
  const group = make('group', 'group', 'B', { order: 1 });
  for (const items of [[individual, whole, group], [whole, individual, group]]) {
    const view = classWork({ member, items, now: 100, pathway });
    assert.deepEqual(view.classwork.map(item => item.id), ['classwork']);
    assert.deepEqual(view.catchUp.map(item => item.id), ['catch-up', 'group']);
    assert.deepEqual(recommendedWork(view).map(item => item.assignments.map(a => a.id)), [['classwork', 'group'], ['catch-up']]);
    assert.equal(Object.hasOwn(view.catchUp[0], 'recipientIds'), false);
  }
});

test('restriction union permits advisory and restricted assignments, with isolated releases and end', () => {
  const a = make('a', 'individual', 'A');
  const b = make('b', 'class', 'B');
  const restrictedA = { ...a, grant: grant('one') };
  const restrictedB = { ...b, grant: grant('two') };
  for (const items of [[restrictedA, b], [a, restrictedB], [restrictedA, restrictedB]]) {
    assert.equal(decide(items, 'A', 'shared'), 'allowed');
    assert.equal(decide(items, 'B', 'different'), 'allowed');
    assert.equal(decide(items, 'C', 'shared'), 'restricted');
  }
  const released = { ...restrictedA, grant: grant('one', [member.id]) };
  assert.equal(decide([released, restrictedB], 'A', 'shared'), 'allowed');
  assert.equal(decide([{ ...released, state: 'ended' }, restrictedB], 'A', 'shared'), 'restricted');
  assert.equal(decide([released, { ...restrictedB, grant: grant('two', [member.id]) }], 'C', 'shared'), 'allowed');
  assert.equal(decide([{ ...restrictedA, completion: 'complete' }], 'C', 'shared'), 'restricted');
  assert.equal(decide([released, restrictedB], 'A', 'shared', { fresh: false }), 'pending');
  assert.equal(decide([], 'B', 'different', { member: { ...member, classId: 'other' } }), 'unauthorized');
  assert.equal(decide([], 'B', 'shared'), 'unavailable');
});

test('membership, scheduling, and a class grant exemption only affect the specified recipient', () => {
  const next = { ...member, id: 'new' };
  const whole = make('classwork', 'class', 'B', { startAt: 150, grant: grant('whole', [member.id]) });
  const group = make('group', 'group', 'A', { grant: grant('group') });
  assert.deepEqual(classWork({ member: next, items: [whole, group], now: 149, pathway }).classwork, []);
  assert.equal(decide([whole, group], 'C', 'shared', { now: 150, member: next }), 'restricted');
  assert.equal(decide([whole], 'C', 'shared', { now: 150 }), 'allowed');
  assert.equal(decide([whole], 'C', 'shared', { member: { ...member, active: false } }), 'unauthorized');
  assert.equal(decide([{ ...whole, state: 'canceled' }], 'C', 'shared', { now: 150, member: next }), 'allowed');
});

test('area, skill group and activity target normalization respects the published checkpoint and original scope', () => {
  const group = { kind: 'skill-group', nodeIds: ['A', 'B'] };
  assert.deepEqual(assignmentDestinations(pathway, group), [
    { nodeId: 'A', activityId: 'shared' }, { nodeId: 'B', activityId: 'different' },
  ]);
  assert.equal(assignmentDestinations(pathway, { kind: 'area', id: 'second' }).length, 2);
  assert.deepEqual(assignmentDestinations(pathway, { kind: 'activity', id: 'shared' }).map(d => d.nodeId), ['A', 'C']);
  assert.deepEqual(assignmentDestinations(pathway, { ...group, nodeIds: ['A', 'unknown'] }), []);
  const work = {
    ...make('area-work', 'class', 'A', { grant: grant('area') }),
    target: { kind: 'area', id: 'first' },
  };
  const revised = { ...pathway, nodes: [...pathway.nodes, skill('D', 'first', 'new')] };
  assert.equal(decide([work], 'D', 'new', { pathway: revised }), 'restricted');
});
