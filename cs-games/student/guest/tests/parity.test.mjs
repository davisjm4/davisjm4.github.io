// Runs in its own process (node --test isolates files) because it fakes an ACTIVE class profile before importing the real
// profile-sync module, so the events compared are what recordGameAttempt really queues for a class-backed student.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const graph = JSON.parse(fs.readFileSync(new URL('../../../pathway/curriculum-graph.json', import.meta.url)));

const PROFILE = '12345678-1234-4234-8234-123456789abc';
const data = new Map([['wrg.profile.active.v1', JSON.stringify({ id: PROFILE, token: 'a'.repeat(64), expires: Date.now() + 1e9, classId: 'c', courseId: 'csp' })]]);
globalThis.localStorage = { getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) };
globalThis.addEventListener = () => {};
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = () => 0; // keep the class queue from scheduling network syncs
globalThis.fetch = async () => { throw new Error('network is not available in tests'); };
const { recordGameAttempt, activeProfile } = await import('../../../../wpr-games/workplace-readiness/online/profile-sync.mjs');
const { cleanGameAttempt } = await import('../../../../wpr-games/workplace-readiness/service/profile-evidence.mjs');
const { PROFILE_ID } = await import('../../../../wpr-games/workplace-readiness/online/profile-model.mjs');
const { guestEventFromAttempt, resolveEventNodes } = await import('../evidence.mjs');
test.after(() => { globalThis.setTimeout = realSetTimeout; });

const uuid = () => crypto.randomUUID();
const validId = v => PROFILE_ID.test(v);
function bothWays(courseId, rec, correct = true) {
  data.forEach((_, k) => { if (k.includes('.outbox.')) data.delete(k); });
  recordGameAttempt(courseId, rec, uuid(), correct, '2026-11-03T10:00:00.000Z');
  const queued = [...data].filter(([k]) => k.includes('.outbox.')).map(([, v]) => JSON.parse(v))[0];
  const server = queued ? cleanGameAttempt(queued, validId) : null;
  const serverNodes = server ? server.data.dimensions.map(d => d.id).sort() : null;
  const g = guestEventFromAttempt(courseId, rec, correct, '2026-11-03T10:00:00.000Z');
  const guestNodes = g ? resolveEventNodes(graph, g).sort() : null;
  return { serverNodes, guestNodes, queued, g, server };
}

test('the class profile used by this test is really active (so the comparison is meaningful)', () => {
  assert.equal(activeProfile?.id, PROFILE);
});

test('guest credit equals Worker credit for every skill selector of every course (focused and Mixed)', () => {
  let compared = 0, credited = 0;
  const topics = [null, 'representation/pixels', 'capacity', 'rerouting', 'state', 'procedures/parameter', 'iteration', 'lists', 'quick.bugs', 'algorithms', 'abstraction/x', 'io', 'behavior', 'metadata'];
  for (const node of graph.nodes) for (const sel of node.familySelectors) {
    if (!sel.activityId) continue; // no game can emit an event for this selector
    const modes = [...(sel.modeId ? [sel.modeId] : []), ...(sel.modeIds || []), ...(sel.modes || [])].slice(0, 3);
    const families = [null, ...graph.questionFamilies.filter(f => f.activityId === sel.activityId && f.nodeIds.includes(node.id)).slice(0, 2).map(f => f.sourceFamilyId)];
    for (const mode of modes.length ? modes : [null]) for (const family of families) for (const topic of (node.courseId === 'advanced' ? [null] : [sel.category ?? null, ...topics.slice(0, node.courseId === 'csp' ? topics.length : 2)])) {
      const rec = { id: uuid(), game: sel.activityId, topic, mode: 'mixed', submissions: 1,
        details: { practiceSetting: 'mixed', practiceMode: mode, ...(family ? { reasoningFamily: family } : {}), difficulty: 'Advanced' } };
      const r = bothWays(node.courseId, rec);
      assert.deepEqual(r.guestNodes, r.serverNodes, `${node.id} ${sel.activityId} ${mode} ${family} ${topic}`);
      assert.equal(r.g.difficulty, 'advanced');
      compared++; if (r.guestNodes?.length) credited++;
    }
  }
  console.log(`# parity compared=${compared} credited=${credited}`);
  assert.ok(compared >= 600 && credited >= 250, 'a vacuous comparison would credit nothing: ' + credited);
  console.log(`# parity compared=${compared} credited=${credited}`);
});

test('both paths drop the same attempts: retries and assisted answers', () => {
  const base = { id: uuid(), game: 'math-lab', topic: 'math-lab/modulus', mode: 'modulus', submissions: 1, details: { practiceMode: 'modulus', reasoningFamily: 'modulus:larger' } };
  assert.deepEqual(bothWays('advanced', base).guestNodes, ['node:advanced:math-lab:modulus']);
  const retry = bothWays('advanced', { ...base, id: uuid(), submissions: 2 });
  assert.equal(retry.g, null, 'guest records no retry');
  assert.deepEqual(retry.server.data.dimensions, [], 'the Worker gives a retry no skill credit either');
  const assisted = bothWays('advanced', { ...base, id: uuid(), details: { ...base.details, assisted: true } });
  assert.equal(assisted.g, null);
  assert.deepEqual(assisted.server.data.dimensions, []);
});

test('the event the guest stores carries the same practice metadata the class queue carries', () => {
  const { queued, g } = bothWays('csp', { id: uuid(), game: 'binary-builder', topic: 'representation/x', mode: 'quiz', submissions: 1, details: { practiceMode: 'learn', family: 'f1', difficulty: 'Beginner' } });
  for (const [guestKey, queueKey] of [['mode', 'mode'], ['assessedMode', 'assessedMode'], ['topic', 'topic'], ['familyId', 'familyId'], ['activityId', 'activity']]) assert.equal(g[guestKey], queued[queueKey], guestKey);
});
