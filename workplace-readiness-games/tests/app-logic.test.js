'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const SESSION = require('../js/app/session.js');
const STORAGE = require('../js/app/storage.js');
const G = require('../js/core/generator.js');
const GR = require('../js/core/grader.js');
const { base } = require('./helpers.js');

function fakeClock() { let t = 1000000; const f = () => t; f.advance = ms => { t += ms; }; return f; }
const meta = (skill, mode, difficulty, category) => ({ skill, mode, difficulty: difficulty || 'beginner', category: category || 'personal' });

test('session: records one scored attempt per challenge and tracks first-attempt performance', () => {
  const s = SESSION.create(null, fakeClock());
  s.record(meta('integrity', 'decision'), true); s.record(meta('integrity', 'decision'), false); s.record(meta('teamwork', 'order', 'advanced', 'interpersonal'), true);
  const st = s.data.stats;
  assert.equal(st.completed, 3); assert.equal(st.correct, 2); assert.equal(st.incorrect, 1); assert.equal(st.firstAttemptCorrect, 2);
  assert.deepEqual(st.bySkill.integrity, { n: 2, c: 1 });
  assert.deepEqual(st.byMode.order, { n: 1, c: 1 });
  assert.deepEqual(st.byDifficulty.advanced, { n: 1, c: 1 });
  assert.ok(Math.abs(s.accuracy() - 2 / 3) < 1e-9);
});
test('session: accuracy is null (not NaN) before any answer', () => assert.equal(SESSION.create(null, fakeClock()).accuracy(), null));
test('session: weak skills need enough attempts and low accuracy, weakest first', () => {
  const s = SESSION.create(null, fakeClock());
  s.record(meta('a', 'decision'), false);                                   // 1 attempt only: not flagged
  [false, false, true].forEach(r => s.record(meta('b', 'decision'), r));    // 33%
  [false, true, true, true].forEach(r => s.record(meta('c', 'decision'), r)); // 75%: fine
  [false, true].forEach(r => s.record(meta('d', 'decision'), r));           // 50%
  const w = s.weakSkills().map(x => x.skill);
  assert.deepEqual(w, ['b', 'd']);
});
test('active time: counts interaction, excludes long idle gaps, ignores hidden tabs', () => {
  const clock = fakeClock(), s = SESSION.create(null, clock);
  s.touch();
  for (let i = 0; i < 20; i++) { clock.advance(1000); s.tick(true); }
  assert.equal(s.data.activeMs, 20000);
  clock.advance(10 * 60 * 1000); s.tick(true);                 // ten idle minutes
  assert.equal(s.data.activeMs, 20000, 'idle period excluded');
  s.touch(); clock.advance(1000); s.tick(true);
  assert.equal(s.data.activeMs, 21000, 'resumes after interaction');
  s.touch(); clock.advance(2000); s.tick(false);
  assert.equal(s.data.activeMs, 21000, 'hidden tab adds nothing');
});
test('active time: a single huge tick (device sleep) is capped', () => {
  const clock = fakeClock(), s = SESSION.create(null, clock);
  s.touch(); clock.advance(30000); const add = s.tick(true);
  assert.ok(add <= 5000);
});
test('active time: formatting is readable', () => {
  assert.equal(SESSION.formatDuration(45000), '45 sec');
  assert.equal(SESSION.formatDuration(125000), '2 min 05 sec');
  assert.equal(SESSION.formatDuration(3720000), '1 h 2 min');
});
test('reset: clears results and time but keeps nothing identifying', () => {
  const s = SESSION.create(null, fakeClock());
  s.record(meta('x', 'find'), true); s.data.activeMs = 9000; s.data.index = 7;
  s.reset('newseed');
  assert.equal(s.data.stats.completed, 0); assert.equal(s.data.activeMs, 0); assert.equal(s.data.index, 0); assert.equal(s.data.seed, 'newseed');
  assert.deepEqual(s.data.stats.recent, []);
});
test('recent results window is bounded', () => {
  const s = SESSION.create(null, fakeClock());
  for (let i = 0; i < 100; i++) s.record(meta('x', 'find'), i % 2 === 0);
  assert.equal(s.data.stats.recent.length, 12);
});

test('storage: round trip, corruption tolerance and blocked-storage fallback', () => {
  const mem = {}; const backend = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  const st = STORAGE.create(backend);
  assert.equal(st.persistent, true); assert.equal(st.load(), null);
  const s = SESSION.create(null, fakeClock()); s.record(meta('x', 'find'), true);
  st.save(s.data); assert.equal(st.load().stats.completed, 1);
  mem[STORAGE.KEY] = '{not json'; assert.equal(st.load(), null, 'corrupt data is ignored, not thrown');
  mem[STORAGE.KEY] = JSON.stringify({ version: 99 }); assert.equal(st.load(), null, 'unknown version ignored');
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const fb = STORAGE.create(blocked);
  assert.equal(fb.persistent, false);
  fb.save(s.data); assert.equal(fb.load().stats.completed, 1, 'memory fallback works');
  fb.clear(); assert.equal(fb.load(), null);
  assert.equal(STORAGE.create(null).persistent, false);
});
test('storage: the saved record contains only practice data (no names, accounts or free text)', () => {
  const s = SESSION.create(null, fakeClock()); s.data.seed = 'abc'; s.data.filters = { skills: ['integrity'], category: null, modes: null, difficulty: 'mixed', context: null };
  s.record(meta('integrity', 'decision'), true);
  const keys = Object.keys(s.data).sort();
  assert.deepEqual(keys, ['activeMs', 'filters', 'index', 'seed', 'startedAt', 'stats', 'updatedAt', 'version']);
  const json = JSON.stringify(s.data);
  assert.ok(!/name|email|user|student|school/i.test(Object.keys(JSON.parse(json)).concat(Object.keys(JSON.parse(json).stats)).join(' ')));
});

test('long-session stability: 6,000 generated challenges answered, tracked and persisted without drift', () => {
  const clock = fakeClock(), s = SESSION.create(null, clock), gen = G.createSession(base, { seed: 'long' });
  let expected = 0, correct = 0;
  const t0 = Date.now();
  for (let i = 0; i < 6000; i++) {
    const c = gen.next();
    const wrongs = GR.wrongResponses(c);
    const resp = i % 3 === 0 ? wrongs[i % wrongs.length] : GR.solve(c);
    const r = GR.grade(c, resp); assert.ok(r.ok);
    s.record({ skill: c.skill, category: c.category, mode: c.mode, difficulty: c.difficulty }, r.correct);
    expected++; if (r.correct) correct++;
    clock.advance(20000); s.touch(); s.tick(true);
  }
  const st = s.data.stats, sum = o => Object.values(o).reduce((a, e) => a + e.n, 0);
  assert.equal(st.completed, expected); assert.equal(st.correct, correct); assert.equal(st.correct + st.incorrect, st.completed);
  [st.bySkill, st.byCategory, st.byMode, st.byDifficulty].forEach(m => assert.equal(sum(m), expected));
  assert.equal(Object.keys(st.bySkill).length, 22, 'all 22 skills practiced in a long mixed session');
  assert.ok(JSON.stringify(s.data).length < 5000, 'saved record stays small: ' + JSON.stringify(s.data).length);
  assert.equal(gen.stats.rejected, 0);
  assert.ok(Date.now() - t0 < 20000, 'finished quickly');
});
test('resume: fast-forwarding a saved seed reproduces the exact next challenge', () => {
  const a = G.createSession(base, { seed: 'resume-1' }); const seen = []; for (let i = 0; i < 25; i++) seen.push(a.next());
  const b = G.createSession(base, { seed: 'resume-1' }); for (let i = 0; i < 20; i++) b.next();
  assert.deepEqual(b.next(), seen[20]); assert.deepEqual(b.next(), seen[21]);
});
