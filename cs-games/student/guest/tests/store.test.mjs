import test from 'node:test';
import assert from 'node:assert/strict';
import { GUEST_KEY, LIMITS, MESSAGES, BACKUP_FORMAT, createGuestStore, cleanState, parseBackup, emptyState } from '../store.mjs';
import { newStore, memoryStorage, clock } from './lib.mjs';

const ev = (i, extra = {}) => ({ id: `q${i}:1`, questionId: `q${i}`, courseId: 'advanced', activityId: 'math-lab', attempt: 1, correct: i % 2 === 0, assessedMode: 'modulus',
  occurred: Date.parse('2026-11-02T16:00:00Z') + i * 1000, date: '2026-11-02', ...extra });

test('a new browser starts empty, disabled and writes nothing until the learner chooses to explore', () => {
  const { store, storage } = newStore();
  assert.equal(store.state().tracking, false);
  assert.equal(store.addEvent(ev(1)), false, 'game pages record nothing before the learner opts in');
  assert.equal(storage.m.has(GUEST_KEY), false, 'reading and ignored events never create stored data');
});

test('choosing a course turns saving on and survives a new visit (new store, same browser storage)', () => {
  const { store, storage, now } = newStore();
  store.setCourse('csp');
  store.setMark('node:csp:x', 'needs-practice', 'csp');
  assert.equal(store.addEvent(ev(1, { courseId: 'csp', activityId: 'binary-builder' })), true);
  const later = createGuestStore({ storage, now });
  assert.equal(later.state().course, 'csp');
  assert.equal(later.state().events.length, 1);
  assert.equal(later.state().marks['node:csp:x'].state, 'needs-practice');
});

test('events are de-duplicated by question and attempt, and only first attempts are accepted', () => {
  const { store } = newStore(); store.setCourse('advanced');
  assert.equal(store.addEvent(ev(1)), true);
  assert.equal(store.addEvent(ev(1)), false, 'same question attempt');
  assert.equal(store.addEvent({ ...ev(2), attempt: 2, id: 'q2:2' }), false, 'a correct retry is never a second first-attempt success');
  assert.equal(store.state().events.length, 1);
});

test('only the stable practice fields are kept; no names, emails or credentials can be stored', () => {
  const { store } = newStore(); store.setCourse('advanced');
  store.addEvent({ ...ev(1), studentName: 'Pat', email: 'pat@example.org', token: 'secret', award: true, verified: true, score: 4, eligible: true });
  const stored = JSON.stringify(store.state());
  for (const word of ['Pat', 'example.org', 'secret', 'award', 'verified', 'eligible', 'score']) assert.ok(!stored.includes(word), word);
});

test('self-reported marks: one Start here per course, node mark beats nothing, clear removes it', () => {
  const { store } = newStore();
  store.setMark('node:advanced:a', 'start-here', 'advanced', { nodeId: 'node:advanced:a', areaId: 'area:advanced:x' });
  store.setMark('node:advanced:b', 'start-here', 'advanced', { nodeId: 'node:advanced:b', areaId: 'area:advanced:x' });
  const s = store.state();
  assert.equal(s.marks['node:advanced:a'], undefined);
  assert.equal(s.marks['node:advanced:b'].state, 'start-here');
  assert.equal(s.position.advanced.nodeId, 'node:advanced:b');
  assert.throws(() => store.setMark('node:advanced:c', 'mastered', 'advanced'), /Unknown self-assessment/);
  store.clearMark('node:advanced:b');
  assert.equal(store.state().marks['node:advanced:b'], undefined);
});

test('corrupted records are recovered safely: unreadable copy kept aside, fresh start, warning raised', () => {
  for (const raw of ['{not json', JSON.stringify({ schema: 99 }), JSON.stringify({ ...emptyState(0), marks: { 'node:x': { state: 'mastered', at: new Date().toISOString(), courseId: 'csp' } } }), '[]', '"x"']) {
    const warnings = [];
    const storage = memoryStorage({ [GUEST_KEY]: raw });
    const store = createGuestStore({ storage, onWarning: m => warnings.push(m) });
    const s = store.state();
    assert.equal(s.events.length, 0); assert.equal(s.tracking, false);
    assert.equal(storage.getItem(GUEST_KEY + ':corrupt'), raw, 'raw copy preserved for recovery');
    assert.deepEqual(warnings, [MESSAGES.corrupt]); assert.equal(store.info.recovered, true);
    store.setCourse('csp'); // and the store works again afterwards
    assert.equal(createGuestStore({ storage }).state().course, 'csp');
  }
});

test('local storage disabled or blocked: nothing throws, learner is told, state still works for this page', () => {
  const warnings = [];
  const none = createGuestStore({ storage: undefined, onWarning: m => warnings.push(m) });
  none.setCourse('csp'); assert.equal(none.state().course, 'csp'); assert.equal(none.info.volatile, true);
  assert.equal(none.info.warning, MESSAGES.unavailable);
  const blocked = { getItem() { throw new DOMException('denied', 'SecurityError'); }, setItem() { throw new DOMException('denied', 'SecurityError'); }, removeItem() { throw new Error('x'); } };
  const s = createGuestStore({ storage: blocked, onWarning: m => warnings.push(m) });
  s.setCourse('advanced'); s.setMark('node:advanced:a', 'familiar', 'advanced');
  assert.equal(s.state().marks['node:advanced:a'].state, 'familiar'); assert.equal(s.info.volatile, true);
  assert.doesNotThrow(() => s.clear());
});

test('storage quota: oldest detail is folded or trimmed, the learner is warned, and the store keeps working', () => {
  const warnings = [];
  const storage = memoryStorage();
  let limit = 6000; const real = storage.setItem;
  storage.setItem = (k, v) => { if (String(v).length > limit) throw new DOMException('full', 'QuotaExceededError'); return real(k, v); };
  const store = createGuestStore({ storage, onWarning: m => warnings.push(m) }); store.setCourse('advanced');
  for (let i = 0; i < 80; i++) store.addEvent(ev(i));
  assert.ok(warnings.includes(MESSAGES.full), 'learner warned');
  assert.ok(storage.getItem(GUEST_KEY).length <= limit, 'what is stored fits');
  assert.ok(store.state().events.length > 0);
  limit = 10; // nothing fits any more
  assert.doesNotThrow(() => store.addEvent(ev(1000)));
  assert.equal(store.info.volatile, true);
});

test('long-term history is compacted into per-skill totals without losing counts', () => {
  const { store, storage } = newStore(); store.setCourse('advanced');
  store.update(s => { for (let i = 0; i < LIMITS.events + 10; i++) s.events.push(ev(i, { nodeIds: ['node:advanced:math-lab:modulus'], graphVersion: 'g1' })); });
  const s = store.state();
  assert.ok(s.events.length <= LIMITS.events);
  assert.equal(s.events.length + s.archiveTotals.answered, LIMITS.events + 10);
  assert.equal(s.events.length + s.archive['node:advanced:math-lab:modulus'].answered, LIMITS.events + 10);
  assert.ok(storage.getItem(GUEST_KEY).length < 2_000_000, 'stays far below browser quota');
});

test('clear removes progress and the kept-aside copy, nothing else', () => {
  const storage = memoryStorage({ 'wrg.profile.abc.outbox.1': 'class data', other: 'x' });
  const { store } = newStore({ storage }); store.setCourse('csp');
  store.clear();
  assert.equal(storage.getItem(GUEST_KEY), null);
  assert.equal(storage.getItem('wrg.profile.abc.outbox.1'), 'class data', 'class-backed storage untouched');
  assert.equal(storage.getItem('other'), 'x');
});

test('export then import round-trips and merges without double counting', () => {
  const a = newStore(); a.store.setCourse('advanced'); a.store.setMark('node:advanced:a', 'familiar', 'advanced');
  for (let i = 0; i < 5; i++) a.store.addEvent(ev(i));
  const backup = a.store.exportBackup();
  assert.ok(!/name|email|password|token/i.test(backup.replace(/"note".*\n/, '')), 'no identity fields in a backup');
  const b = newStore({ now: clock('2026-11-09T12:00:00Z') }); b.store.setCourse('advanced'); b.store.addEvent(ev(3)); b.store.addEvent(ev(9));
  const r = b.store.importBackup(backup);
  assert.equal(r.addedEvents, 4, 'q3 already present');
  assert.equal(b.store.state().events.length, 6);
  assert.equal(b.store.state().marks['node:advanced:a'].state, 'familiar');
  assert.equal(b.store.importBackup(backup).addedEvents, 0, 'importing twice adds nothing');
  assert.ok(b.store.state().events.every(e => !e.nodeIds), 'imported practice is re-credited on this device, never trusted from the file');
});

test('import validation: wrong format, newer version, oversized, damaged and trust-bearing files', () => {
  assert.throws(() => parseBackup(''), /empty/);
  assert.throws(() => parseBackup('nope'), /not a CS Games progress backup/);
  assert.throws(() => parseBackup(JSON.stringify({ format: 'something-else' })), /not a CS Games progress backup/);
  assert.throws(() => parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 2, data: {} })), /newer version/);
  assert.throws(() => parseBackup('x'.repeat(LIMITS.importBytes + 1)), /too large/);
  assert.throws(() => parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, data: { schema: 1 } })), /damaged/);
  const s = emptyState(0);
  const hostile = { ...s, award: { nodeId: 'node:x' }, mastery: 4, verified: true, events: [ev(1, { nodeIds: ['node:advanced:everything'], graphVersion: 'g' , verified: true, score: 4 })] };
  const { state, ignored } = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, data: hostile }));
  assert.deepEqual(ignored.sort(), ['award', 'mastery', 'verified']);
  assert.equal(state.events[0].nodeIds, undefined); assert.equal(state.events[0].verified, undefined); assert.equal(state.events[0].score, undefined);
  assert.equal(JSON.stringify(state).includes('award'), false);
});

test('schema validation rejects structurally invalid state', () => {
  const ok = emptyState(Date.now());
  assert.doesNotThrow(() => cleanState(ok));
  for (const bad of [{ ...ok, schema: 2 }, { ...ok, created: 'x' }, { ...ok, marks: [] }, { ...ok, events: 'x' }, { ...ok, archiveTotals: { answered: 1, correct: 2 } }, { ...ok, archive: { 'node:a': { answered: 1, correct: 2, first: '2026-01-01', last: '2026-01-01' } } }])
    assert.throws(() => cleanState(bad), /Invalid guest progress/);
});
