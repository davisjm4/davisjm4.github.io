import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assignmentDestinations, classWork, recommendedWork } from '../assignments/access.mjs';

const skill = (id, areaId, ...activityIds) => ({ id, areaId, practice: activityIds.map(activityId => ({ activityId })) });
const pathway = { classId: 'class', nodes: [skill('A', 'first', 'shared'), skill('B', 'second', 'different'), skill('C', 'second', 'shared')] };
const member = { id: 'one', classId: 'class', active: true };
const target = id => ({ kind: 'skill', id });
const make = (id, scope, nodeId, overrides = {}) => ({
  id, classId: pathway.classId, scope, recipientIds: scope === 'class' ? [] : [member.id], state: 'published',
  startAt: 50, order: 0, target: target(nodeId), destinations: assignmentDestinations(pathway, target(nodeId)), ...overrides,
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

test('scheduling and class membership change only which work is shown', () => {
  const next = {...member,id:'new'};
  const whole=make('classwork','class','B',{startAt:150});
  const latest=make('next lesson','class','B',{startAt:160});
  const group=make('group','group','A');
  const read=(member,now)=>classWork({member,items:[whole,latest,group],now,pathway});
  assert.deepEqual(read(next,149).classwork,[]);
  assert.deepEqual(read(next,160).classwork.map(row=>row.id),['next lesson','classwork']);
  assert.deepEqual(read(next,160).catchUp,[]);
  assert.equal(read(member,160).catchUp[0].id,'group');
  assert.deepEqual(read({...member,active:false},160).classwork,[]);
  assert.deepEqual(read({...member,classId:'other'},160).catchUp,[]);
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
    ...make('area-work', 'class', 'A'),
    target: { kind: 'area', id: 'first' },
  };
  const revised = { ...pathway, nodes: [...pathway.nodes, skill('D', 'first', 'new')] };
  assert.deepEqual(classWork({member,items:[work],now:100,pathway:revised}).classwork[0].destinations, work.destinations);
});
