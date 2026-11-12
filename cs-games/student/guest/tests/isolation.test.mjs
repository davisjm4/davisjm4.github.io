// Learner F: independent practice first, then the same browser joins a class. Uses the real profile-device.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PROFILE = '0a1b2c3d-1111-4222-8333-444455556666';
const prefix = 'wrg.profile.' + PROFILE + '.';
// A Storage-like object: stored keys are own enumerable properties (so Object.keys works as in a browser); methods are not.
const storage = {};
for (const [name, fn] of Object.entries({
  getItem: k => (Object.hasOwn(storage, k) ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; },
})) Object.defineProperty(storage, name, { value: fn, enumerable: false });
globalThis.localStorage = storage;
globalThis.addEventListener = () => {};

const { GUEST_KEY, createGuestStore } = await import('../store.mjs');
const { reconcileEvents, guestEventFromAttempt } = await import('../evidence.mjs');
const { buildGuestView } = await import('../pathway.mjs');
const graph = JSON.parse(fs.readFileSync(new URL('../../../pathway/curriculum-graph.json', import.meta.url)));

function guestPractice(store, n) {
  store.setCourse('advanced'); store.setMark('area:advanced:variable-lab', 'familiar', 'advanced');
  for (let i = 0; i < n; i++) store.addEvent(guestEventFromAttempt('advanced', { id: 'g' + i, game: 'math-lab', topic: 'math-lab/modulus', mode: 'modulus', submissions: 1, details: { practiceMode: 'modulus', reasoningFamily: 'modulus:larger' } }, i % 2 === 0, '2026-11-03T10:00:00Z'));
}

test('the guest key can never collide with class-backed profile keys', () => {
  assert.ok(!GUEST_KEY.startsWith('wrg.profile.'));
  assert.notEqual(GUEST_KEY, 'wrg.profile.active.v1');
});

test('learner F: joining a class leaves guest progress untouched, class progress stays class-only, leaving restores the guest state', async () => {
  const guest = createGuestStore({ storage });
  guestPractice(guest, 8);
  const guestBefore = storage[GUEST_KEY];
  assert.ok(guestBefore);

  // The learner enrolls: the page reloads with an active class profile (this is the state profile-device.js reads at load).
  storage['wrg.profile.active.v1'] = JSON.stringify({ id: PROFILE, token: 'b'.repeat(64), expires: Date.now() + 1e9, classId: 'class-1', courseId: 'advanced' });
  storage[prefix + 'javaGames.session.v1'] = '{"class":"session"}';
  storage[prefix + 'outbox.q1:1'] = '{"class":"event"}';
  const { device } = await import('../../../../wpr-games/workplace-readiness/online/profile-sync.mjs');
  assert.equal(device.identity?.id, PROFILE, 'a class profile is active');

  // Class practice is stored under the profile prefix; it never reaches the guest record.
  assert.equal(storage[GUEST_KEY], guestBefore, 'joining a class does not change guest progress');
  assert.equal(createGuestStore({ storage }).state().events.length, 8);
  const classView = createGuestStore({ storage }); classView.update(s => reconcileEvents(s, graph));
  const v = buildGuestView(graph, 'advanced', classView.state(), { today: '2026-11-11' });
  assert.equal(v.guest.totals.answered, 8, 'the guest view shows guest practice only, never class events');
  assert.ok(!JSON.stringify(classView.state()).includes('class'), 'no class data inside the guest record');

  // Leaving the class (the existing sign-out) removes class data only.
  const guestAfterReconcile = storage[GUEST_KEY];
  device.clear();
  assert.equal(storage['wrg.profile.active.v1'], undefined);
  assert.equal(storage[prefix + 'outbox.q1:1'], undefined, 'class-backed data removed by the class sign-out');
  assert.equal(storage[GUEST_KEY], guestAfterReconcile, 'guest progress survives class sign-out');
  const back = createGuestStore({ storage }).state();
  assert.equal(back.events.length, 8); assert.equal(back.marks['area:advanced:variable-lab'].state, 'familiar');
});

test('no automatic transfer: guest practice is never copied into the class outbox and class events are never copied to the guest store', () => {
  const classState = fs.readFileSync(new URL('../class-state.mjs', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.deepEqual(classState.match(/\.(getItem|setItem|removeItem)\(/g), ['.getItem('], 'the one read-only class check never writes or deletes');
  const src = fs.readdirSync(new URL('../', import.meta.url)).filter(f => /\.(mjs|js)$/.test(f) && f !== 'class-state.mjs').map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
  assert.ok(!/outbox|queueProfileEvent|recordGameAttempt\(|profile\.|wrg\./.test(src), 'guest code does not touch class-backed storage or queues');
});
