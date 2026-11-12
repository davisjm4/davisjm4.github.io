import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileEvents, guestEventFromAttempt, resolveEventNodes } from '../evidence.mjs';
import { summarizeProgress } from '../progress.mjs';
import { createGuestStore } from '../store.mjs';
import { graph, newStore, javaTracker, answerWith, memoryStorage, clock } from './lib.mjs';

const MOD = 'node:advanced:math-lab:modulus', DIV = 'node:advanced:math-lab:division', CAST = 'node:advanced:math-lab:casting';
const math = (mode, family, extra = {}) => ({ game: 'math-lab', topic: 'math-lab/' + mode, mode, details: { practiceMode: mode, reasoningFamily: family, ...extra } });
function setup(opts = {}) {
  const ctx = newStore(opts); ctx.store.setCourse('advanced');
  ctx.tracker = javaTracker({ ...ctx, ...opts });
  ctx.credit = () => { ctx.store.update(s => reconcileEvents(s, graph)); return ctx.store.state(); };
  ctx.skills = () => summarizeProgress(ctx.credit(), graph, 'advanced', '2026-11-02').skills;
  return ctx;
}

test('a real focused Java answer is recorded locally and credits only its own skill', () => {
  const t = setup();
  answerWith(t.tracker, { ...math('modulus', 'modulus:larger', { difficulty: 'Intermediate' }), correct: true });
  const s = t.credit();
  assert.equal(s.events.length, 1);
  assert.deepEqual(s.events[0].nodeIds, [MOD]);
  assert.equal(s.events[0].difficulty, 'intermediate');
  assert.equal(s.events[0].familyId, 'modulus:larger');
  assert.equal(s.events[0].assessedMode, 'modulus');
  const skills = t.skills();
  assert.deepEqual([skills.get(MOD).answered, skills.get(MOD).correct], [1, 1]);
  for (const [id, p] of skills) if (id !== MOD) assert.equal(p.answered, 0, id + ' must not be credited');
});

test('Mixed Practice credits the assessed mode of each question shown, never "mixed"', () => {
  const t = setup();
  const drawn = [['modulus', 'modulus:larger', true], ['division', 'division:int', false], ['casting', 'casting:narrow', true], ['modulus', 'modulus:larger', false]];
  for (const [mode, family, correct] of drawn) answerWith(t.tracker, { game: 'math-lab', topic: 'math-lab/mixed', mode: 'mixed', details: { practiceSetting: 'mixed', practiceMode: mode, reasoningFamily: family }, correct });
  const s = t.credit();
  assert.equal(s.events[0].mode, 'mixed', 'the requested setting is kept for context');
  assert.deepEqual(s.events.map(e => e.nodeIds), [[MOD], [DIV], [CAST], [MOD]]);
  const k = t.skills();
  assert.deepEqual([k.get(MOD).answered, k.get(MOD).correct], [2, 1]);
  assert.deepEqual([k.get(DIV).answered, k.get(DIV).correct], [1, 0]);
  assert.deepEqual([k.get(CAST).answered, k.get(CAST).correct], [1, 1]);
  assert.equal(JSON.stringify([...k.keys()].filter(id => k.get(id).answered)).includes('mixed'), false);
});

test('first-try accuracy: a correct retry is not a second success and the first miss stays a miss', () => {
  const t = setup();
  const { first } = answerWith(t.tracker, { ...math('modulus', 'modulus:larger'), correct: false, retries: [false, true] });
  assert.equal(first.firstTry, false);
  const s = t.credit();
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].correct, false);
  const p = t.skills().get(MOD);
  assert.deepEqual([p.answered, p.correct], [1, 0]);
});

test('delivering the same attempt twice records it once', () => {
  const t = setup();
  const record = { id: 'dup-1', game: 'math-lab', topic: 'math-lab/modulus', mode: 'modulus', submissions: 1, details: { practiceMode: 'modulus', reasoningFamily: 'modulus:larger' } };
  const event = guestEventFromAttempt('advanced', record, true, '2026-11-02T16:00:00Z');
  assert.equal(t.store.addEvent(event), true);
  assert.equal(t.store.addEvent(event), false);
  assert.equal(t.credit().events.length, 1);
});

test('assisted answers, skips, reveals, page visits and active time create no evidence', () => {
  const t = setup();
  answerWith(t.tracker, { ...math('modulus', 'modulus:larger', { assisted: true }), correct: true });
  const skipped = t.tracker.begin('math-lab', 'Math', 'math-lab/modulus', 'm', 'modulus', 'm'); t.tracker.skip(skipped);
  const revealed = t.tracker.begin('math-lab', 'Math', 'math-lab/modulus', 'm', 'modulus', 'm'); t.tracker.reveal(revealed);
  t.tracker.begin('math-lab', 'Math', 'math-lab/modulus', 'm', 'modulus', 'm'); // displayed but never answered
  t.tracker.addActiveSeconds(900);
  assert.equal(t.credit().events.length, 0);
});

test('missing or unmatched metadata is not invented into credit', () => {
  const t = setup();
  answerWith(t.tracker, { game: 'math-lab', topic: 'math-lab/x', mode: null, details: {}, correct: true });          // no mode at all
  answerWith(t.tracker, { game: 'math-lab', topic: 'math-lab/x', mode: 'no-such-mode', details: {}, correct: true }); // unknown mode
  answerWith(t.tracker, { game: 'not-a-game', topic: 't', mode: 'modulus', details: {}, correct: true });             // unknown activity
  const s = t.credit();
  assert.deepEqual(s.events.map(e => e.nodeIds), [[], [], []]);
  const sum = summarizeProgress(s, graph, 'advanced', '2026-11-02');
  assert.equal(sum.practicedSkills, 0);
  assert.equal(sum.totals.answered, 3, 'still counted as questions answered');
  assert.equal(sum.totals.unmapped, 3, 'but credited to no skill');
});

test('an activity from another course never credits this course', () => {
  assert.deepEqual(resolveEventNodes(graph, { id: 'x:1', questionId: 'x', courseId: 'csp', activityId: 'math-lab', assessedMode: 'modulus', correct: true, occurred: 1 }), []);
});

test('practice history survives the daily Session Summary reset', () => {
  const clk = clock('2026-11-02T20:00:00.000Z');
  const sessionStorage = memoryStorage();
  const t = setup({ now: clk, storage: memoryStorage(), sessionStorage });
  // setup() gives the tracker its own storage; rebuild it so we can inspect the tracker's summary across midnight
  t.tracker = javaTracker({ store: t.store, now: clk, storage: sessionStorage });
  for (let i = 0; i < 6; i++) answerWith(t.tracker, { ...math('modulus', 'modulus:larger'), correct: i % 3 !== 0 });
  assert.equal(t.tracker.snapshot().totals.attempted, 6);
  clk.advance(30 * 3600 * 1000); // next local day
  assert.equal(t.tracker.snapshot().totals.attempted, 0, 'the daily summary reset');
  assert.equal(t.tracker.snapshot().sessionDate !== undefined, true);
  const reopened = createGuestStore({ storage: t.storage, now: clk });
  reopened.update(s => reconcileEvents(s, graph));
  const p = summarizeProgress(reopened.state(), graph, 'advanced', '2026-11-04').skills.get(MOD);
  assert.deepEqual([p.answered, p.correct], [6, 4], 'long-term local history is intact');
  answerWith(t.tracker, { ...math('modulus', 'modulus:larger'), correct: true });
  assert.equal(createGuestStore({ storage: t.storage, now: clk }).state().events.length, 7, 'and keeps growing the next day');
});

test('a class profile on the same device receives class evidence only; guest practice is not mixed in', () => {
  const classEvents = [];
  const t = setup({ profile: true, classEvents });
  answerWith(t.tracker, { ...math('modulus', 'modulus:larger'), correct: true });
  assert.equal(classEvents.length, 1);
  assert.equal(t.store.state().events.length, 0, 'class-backed answers never reach the guest store');
});

test('hook never throws into a game, even with hostile records or broken storage', () => {
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const store = createGuestStore({ storage: broken });
  store.setCourse('advanced');
  const tracker = javaTracker({ store, now: clock() });
  assert.doesNotThrow(() => answerWith(tracker, { ...math('modulus', 'modulus:larger'), correct: true }));
  const hook = (rec) => { try { return guestEventFromAttempt('advanced', rec, true, 'not a date'); } catch { return 'threw'; } };
  for (const rec of [null, undefined, {}, { id: 5 }, { id: 'a', game: {} , submissions: 1}, { id: 'a b', game: 'math-lab', submissions: 1 }]) assert.notEqual(hook(rec), 'threw');
});

test('graph release adds a skill without erasing earlier local progress, and re-credits only through the new graph', () => {
  const t = setup();
  answerWith(t.tracker, { ...math('modulus', 'modulus:larger'), correct: true });
  t.credit();
  const next = structuredClone(graph); next.version = '2099.01.01.1';
  const added = { ...structuredClone(next.nodes.find(n => n.id === MOD)), id: 'node:advanced:math-lab:modulus-extra', title: 'Modulus extra' };
  next.nodes.push(added); // same selectors, and bound to the same question family as a real release would do
  for (const f of next.questionFamilies) if (f.nodeIds.includes(MOD)) f.nodeIds.push(added.id);
  t.store.update(s => reconcileEvents(s, next));
  const sum = summarizeProgress(t.store.state(), next, 'advanced', '2026-11-02');
  assert.equal(sum.skills.get(MOD).answered, 1, 'existing skill unchanged');
  assert.equal(sum.skills.get(added.id).answered, 1, 'the new skill is credited from stored practice details');
  const removed = structuredClone(next); removed.nodes = removed.nodes.filter(n => n.id !== MOD); removed.version = '2099.02.01.1';
  t.store.update(s => reconcileEvents(s, removed));
  assert.equal(t.store.state().events.length, 1, 'stored practice is never deleted by a graph change');
});

test('a question with a mode but no family credits that mode’s skill and no family is invented', () => {
  const t = setup();
  answerWith(t.tracker, { game: 'math-lab', topic: 'math-lab/division', mode: 'division', details: { practiceMode: 'division' }, correct: true });
  const s = t.credit();
  assert.equal(s.events[0].familyId, null, 'missing family stays missing');
  assert.deepEqual(s.events[0].nodeIds, [DIV]);
});

test('credit never lands on a skill outside the course the event came from, for any selector of any course', () => {
  let checked = 0, crossCourseSelectors = 0;
  for (const node of graph.nodes) for (const sel of node.familySelectors) {
    if (!sel.activityId) continue;
    const modes = [sel.modeId, ...(sel.modeIds || []), ...(sel.modes || [])].filter(Boolean);
    for (const courseId of ['csp', 'advanced', 'robotics', 'workplace']) for (const mode of modes.slice(0, 2)) {
      const ids = resolveEventNodes(graph, { id: 'x:1', questionId: 'x', courseId, activityId: sel.activityId, assessedMode: mode, mode, topic: sel.category ?? null, correct: true, occurred: 1 });
      for (const id of ids) assert.equal(graph.nodes.find(n => n.id === id).courseId, courseId, `${sel.activityId}/${mode} for ${courseId} credited ${id}`);
      if (node.courseId !== courseId && ids.length === 0) crossCourseSelectors++;
      checked++;
    }
  }
  assert.ok(checked > 400 && crossCourseSelectors > 100, `checked ${checked}, refused cross-course ${crossCourseSelectors}`);
});
