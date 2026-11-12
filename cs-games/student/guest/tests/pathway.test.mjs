import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGuestView, guestCourses, guestPathway } from '../pathway.mjs';
import { summarizeProgress, GUIDANCE, STATUS } from '../progress.mjs';
import { suggestNext, afterPractice } from '../suggest.mjs';
import { reconcileEvents } from '../evidence.mjs';
import { createPathway } from '../../../pathway/model.mjs';
import { graph, newStore, javaTracker, answerWith, clock, nodesOf } from './lib.mjs';

const TODAY = '2026-11-11';
const view = (store, course = 'advanced', today = TODAY) => { store.update(s => reconcileEvents(s, graph)); return buildGuestView(graph, course, store.state(), { today }); };
const A = id => 'area:advanced:' + id;
const N = (lab, mode) => `node:advanced:${lab}:${mode}`;
const math = (mode, family, correct, extra = {}) => ({ game: 'math-lab', topic: 'math-lab/' + mode, mode, details: { practiceMode: mode, reasoningFamily: family, ...extra }, correct });
const loop = (mode, correct) => ({ game: 'loop-lab', topic: 'loop-lab/' + mode, mode, details: { practiceMode: mode }, correct });

test('guest access needs no authentication, enrollment or network: modules import nothing from profiles and use no network API', () => {
  const dir = new URL('../', import.meta.url);
  const banned = [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/, /profile-sync/, /profile-device/, /online\/config/, /\brequest\s*\(/, /workers\.dev/, /Authorization/];
  const files = fs.readdirSync(dir).filter(f => /\.(mjs|js)$/.test(f));
  assert.ok(files.length >= 6, "scan must actually cover the modules");
  for (const f of files) {
    const src = fs.readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1'); // code only; comments may name things
    if (f === 'app.mjs') { // the page loads the canonical curriculum with same-origin static data
      const fetches = src.match(/\bfetch\s*\(/g) || [];
      assert.equal(fetches.length, 2); assert.ok(src.includes("fetch('../../pathway/evidence-gap-registry.json')")); assert.match(src, /fetch\(new URL\('\.\.\/\.\.\/pathway\/curriculum-graph\.json', import\.meta\.url\)\)/);
      assert.ok(!/method\s*:|body\s*:|POST|PUT/.test(src.slice(src.indexOf('fetch('), src.indexOf('fetch(') + 140)), 'GET only');
    }
    for (const re of banned.filter(r => !(f === 'app.mjs' && /fetch/.test(r.source)))) assert.ok(!re.test(src), `${f} must not use ${re}`);
  }
});

test('no remote writes: a full session of guest operations makes zero network calls', () => {
  const calls = [];
  const trap = name => () => { calls.push(name); throw new Error('network blocked'); };
  const saved = ['fetch', 'XMLHttpRequest', 'WebSocket'].map(k => [k, globalThis[k]]);
  globalThis.fetch = trap('fetch'); globalThis.XMLHttpRequest = trap('xhr'); globalThis.WebSocket = trap('ws');
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { sendBeacon: trap('beacon') } });
  try {
    const { store, now } = newStore(); store.setCourse('advanced');
    const t = javaTracker({ store, now });
    for (let i = 0; i < 5; i++) answerWith(t, math('modulus', 'modulus:larger', i % 2 === 0));
    store.setMark(A('loop-lab'), 'needs-practice', 'advanced');
    const v = view(store); store.exportBackup(); store.importBackup(store.exportBackup());
    assert.ok(v.nodes.length);
  } finally {
    for (const [k, v] of saved) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; }
    if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator;
  }
  assert.deepEqual(calls, []);
});

test('all four course pathways open immediately in the established order, self-paced, with stable ids and practice links', () => {
  assert.deepEqual(guestCourses(graph).map(c => c.id).sort(), ['advanced', 'csp', 'robotics', 'workplace']);
  const baseline = JSON.parse(fs.readFileSync(new URL('../../../pathway/tests/fixtures/baseline-ids.json', import.meta.url)));
  const { store } = newStore();
  for (const { id, skills } of guestCourses(graph)) {
    const v = view(store, id);
    const expected = createPathway(graph, { id: 'x', classId: 'y', courseId: id }).sequence;
    assert.deepEqual(v.nodes.map(n => n.id), expected, id + ' uses the existing prerequisite ordering');
    assert.equal(v.nodes.length, skills);
    assert.equal(v.status, 'Self-paced'); assert.equal(v.courseId, id);
    assert.equal(v.sessions.length, 0); assert.equal(v.examDate, null);
    for (const n of v.nodes) {
      assert.equal(n.checkpoint.targetDate, null, 'no due dates'); assert.ok(n.practice.length > 0, n.id + ' has a practice link');
      assert.ok(graph.nodes.some(g => g.id === n.id), 'ids come straight from the canonical graph');
    }
    for (const n of v.nodes) for (const p of n.checkpoint.prerequisites) assert.ok(v.nodes.findIndex(x => x.id === p) < v.nodes.findIndex(x => x.id === n.id), 'prerequisites come first');
  }
  const present = new Set(graph.nodes.map(n => n.id));
  assert.ok(baseline.nodeIds.every(id => present.has(id)), 'every historical node id still exists');
  assert.equal(guestPathway(graph, 'csp').calendar, null);
});

test('no second curriculum: the guest view does not copy node definitions', () => {
  const v = view(newStore().store, 'csp');
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  for (const n of v.nodes) { const g = byId.get(n.id); assert.equal(n.title, g.title); assert.deepEqual(n.practice, g.practice); assert.deepEqual(n.standardRefs, g.standardRefs); }
});

test('learner A: first visit to AP CSP shows the whole pathway and a first step, with nothing practiced and nothing claimed', () => {
  const { store } = newStore(); store.setCourse('csp');
  const v = view(store, 'csp');
  assert.equal(v.nodes.length, nodesOf('csp').length);
  assert.equal(v.guest.totals.answered, 0); assert.equal(v.guest.practicedSkills, 0);
  assert.equal(v.guest.suggestion.primary.nodeId, v.nodes[0].id, 'starts at the beginning of the established order');
  assert.ok(v.nodes.every(n => n.guest.status === 'not-started' && n.guest.statusLabel === 'Not started'));
  assert.ok(v.nodes.every(n => n.checkpoint.score === null && !n.checkpoint.award && !n.masteryChallenge));
});

test('learner B: marks Variable Lab familiar and moves straight on to Math Lab without a diagnostic', () => {
  const { store } = newStore(); store.setCourse('advanced');
  assert.equal(view(store).guest.suggestion.primary.areaId, A('variable-lab'));
  store.setMark(A('variable-lab'), 'familiar', 'advanced');
  const v = view(store);
  assert.equal(v.guest.suggestion.primary.areaId, A('math-lab'), 'suggestion skips familiar content');
  assert.ok(v.nodes.filter(n => n.areaId === A('variable-lab')).every(n => n.guest.status === 'familiar' && n.guest.statusLabel === 'Familiar (self-reported)'));
  assert.equal(v.guest.practicedSkills, 0, 'self-reported familiarity is not practice');
  assert.equal(v.guest.totals.answered, 0);
  const t = v.nodes.find(n => n.areaId === A('variable-lab')).guest;
  assert.equal(t.answered, 0); assert.equal(t.accuracy, null);
  // Jumping anywhere is always allowed: all skills remain open with their practice links.
  assert.ok(v.nodes.every(n => n.practice.length > 0));
  assert.ok(!JSON.stringify(v.nodes.map(n => n.guest)).match(/meeting|exceed|mastered|proficient/i), 'never labels familiarity as meeting or exceeding');
});

test('a skill mark beats its area mark; clearing returns to the area setting; clearing everything restores the default path', () => {
  const { store } = newStore(); store.setCourse('advanced');
  store.setMark(A('variable-lab'), 'familiar', 'advanced');
  store.setMark(N('variable-lab', 'trace'), 'needs-practice', 'advanced');
  let v = view(store);
  assert.equal(v.nodes.find(n => n.id === N('variable-lab', 'trace')).guest.mark, 'needs-practice');
  assert.equal(v.guest.suggestion.primary.nodeId, N('variable-lab', 'trace'));
  store.clearMark(N('variable-lab', 'trace'));
  assert.equal(view(store).nodes.find(n => n.id === N('variable-lab', 'trace')).guest.mark, 'familiar');
  store.clearMark(A('variable-lab'));
  assert.equal(view(store).guest.suggestion.primary.areaId, A('variable-lab'));
});

test('learner C: marks Boolean Logic and Loops as needing practice and gets recommendations from exactly those areas', () => {
  const { store } = newStore(); store.setCourse('advanced');
  store.setMark(A('boolean-conditional-lab'), 'needs-practice', 'advanced');
  store.setMark(A('loop-lab'), 'needs-practice', 'advanced');
  const v = view(store);
  const top = v.guest.suggestion.all.slice(0, 6);
  assert.ok(top.every(s => [A('boolean-conditional-lab'), A('loop-lab')].includes(s.areaId)), 'top suggestions stay in the flagged areas');
  assert.equal(v.guest.suggestion.primary.areaId, A('boolean-conditional-lab'), 'course order breaks ties');
  assert.equal(v.guest.suggestion.primary.code, 'marked');
  assert.match(v.guest.suggestion.primary.reason, /marked this as needing practice/);
  assert.ok(v.nodes.filter(n => n.areaId === A('loop-lab')).every(n => n.guest.mark === 'needs-practice' && n.guest.status === 'not-started'), 'a mark is not practice');
});

test('suggested-next priority order: marked > current area > low accuracy > next unvisited > due for review', () => {
  const { store, now } = newStore(); store.setCourse('advanced');
  const t = javaTracker({ store, now });
  for (let i = 0; i < 6; i++) answerWith(t, loop('while', i === 0)); // 1 of 6 right: low accuracy
  for (let i = 0; i < 12; i++) answerWith(t, math('modulus', 'modulus:larger', true)); // steady
  let v = view(store);
  const codes = () => v.guest.suggestion.all.map(s => s.code);
  assert.equal(v.guest.suggestion.all.find(s => s.nodeId === N('loop-lab', 'while')).code, 'low');
  // position now points at the most recent credited practice (math lab), so the current area is math
  assert.equal(v.guest.resume.nodeId, N('math-lab', 'modulus'));
  assert.equal(v.guest.suggestion.primary.code, 'area');
  assert.equal(v.guest.suggestion.primary.areaId, A('math-lab'));
  assert.ok(codes().indexOf('low') < codes().indexOf('next'), 'low accuracy outranks next unvisited');
  store.setMark(N('boolean-conditional-lab', 'identify'), 'needs-practice', 'advanced');
  v = view(store);
  assert.deepEqual([v.guest.suggestion.primary.nodeId, v.guest.suggestion.primary.code], [N('boolean-conditional-lab', 'identify'), 'marked']);
  // due-for-review comes last
  const later = view(store, 'advanced', '2026-12-30');
  const review = later.guest.suggestion.all.find(s => s.code === 'review');
  assert.ok(review && review.reason.includes('days ago'));
  assert.equal(later.guest.suggestion.all.at(-1).code, 'review');
});

test('a steady skill that was marked needing practice stops being nagged; a familiar skill is never suggested as next', () => {
  const { store, now } = newStore(); store.setCourse('advanced');
  const t = javaTracker({ store, now });
  store.setMark(N('math-lab', 'modulus'), 'needs-practice', 'advanced');
  assert.equal(view(store).guest.suggestion.primary.nodeId, N('math-lab', 'modulus'));
  for (let i = 0; i < GUIDANCE.steadyAnswered; i++) answerWith(t, math('modulus', 'modulus:larger', true));
  const v = view(store);
  assert.notEqual(v.guest.suggestion.primary?.nodeId, N('math-lab', 'modulus'));
  assert.equal(v.nodes.find(n => n.id === N('math-lab', 'modulus')).guest.mark, 'needs-practice', 'the learner’s mark is theirs to clear');
});

test('learner D: returns days later and sees historical local progress, recent activity and a Resume action', () => {
  const clk = clock('2026-11-02T17:00:00Z');
  const { store } = newStore({ now: clk }); store.setCourse('advanced');
  const t = javaTracker({ store, now: clk });
  for (let day = 0; day < 4; day++) { for (let i = 0; i < 5; i++) answerWith(t, math('modulus', 'modulus:larger', i < 3 + (day % 2))); clk.advance(24 * 3600 * 1000); }
  clk.advance(2 * 24 * 3600 * 1000);
  const v = view(store, 'advanced', '2026-11-08');
  assert.equal(v.guest.totals.answered, 20);
  assert.equal(v.guest.recent.length, 4, 'one entry per day and game');
  assert.deepEqual(v.guest.recent.map(r => r.date), ['2026-11-05', '2026-11-04', '2026-11-03', '2026-11-02']);
  assert.equal(v.guest.resume.nodeId, N('math-lab', 'modulus'));
  assert.equal(v.guest.resume.fromPosition, true);
  const p = v.nodes.find(n => n.id === N('math-lab', 'modulus')).guest;
  assert.equal(p.answered, 20); assert.equal(p.lastDate, '2026-11-05');
  assert.match(v.nodes.find(n => n.id === N('math-lab', 'modulus')).practiceProgress.attempted + '', /20/);
});

test('learner E: Mixed Java practice credits each skill the learner actually saw', () => {
  const { store, now } = newStore(); store.setCourse('advanced');
  const t = javaTracker({ store, now });
  const plan = [['modulus', 'modulus:larger'], ['division', 'division:int'], ['casting', 'casting:narrow']];
  for (let r = 0; r < 4; r++) for (const [m, f] of plan) answerWith(t, { game: 'math-lab', topic: 'math-lab/mixed', mode: 'mixed', details: { practiceSetting: 'mixed', practiceMode: m, reasoningFamily: f }, correct: r !== 0 });
  const v = view(store);
  for (const [m] of plan) { const g = v.nodes.find(n => n.id === N('math-lab', m)).guest; assert.deepEqual([g.answered, g.correct], [4, 3], m); }
  assert.equal(v.guest.totals.answered, 12); assert.equal(v.guest.practicedSkills, 3);
  assert.equal(v.nodes.find(n => n.id === N('math-lab', 'reverse')).guest.answered, 0, 'unseen skills get nothing');
});

test('statuses use plain descriptions and keep self-report separate from practice', () => {
  assert.deepEqual(Object.values(STATUS).sort(), ['Familiar (self-reported)', 'Needs review', 'Not started', 'Practiced']);
  const { store, now } = newStore(); store.setCourse('advanced');
  const t = javaTracker({ store, now });
  store.setMark(N('loop-lab', 'while'), 'familiar', 'advanced');
  for (let i = 0; i < 6; i++) answerWith(t, loop('while', i < 2)); // practiced AND self-reported familiar, but struggling
  const g = view(store).nodes.find(n => n.id === N('loop-lab', 'while')).guest;
  assert.equal(g.status, 'needs-review'); assert.equal(g.statusLabel, 'Needs review');
  assert.equal(g.selfReported, 'Familiar (self-reported)', 'the self-report stays visible, labeled as such');
  assert.equal(g.accuracy, 2 / 6);
});

test('after practice: continue in this area, move to the next area, or try something different', () => {
  const { store, now } = newStore(); store.setCourse('advanced');
  const t = javaTracker({ store, now });
  for (let i = 0; i < 3; i++) answerWith(t, math('modulus', 'modulus:larger', true));
  const v = view(store);
  const out = afterPractice({ nodes: v.nodes, areaOrder: v.guest.areaOrder, summary: v.guest.summary, suggestion: v.guest.suggestion, nodeId: N('math-lab', 'modulus') });
  assert.equal(out.continueInArea.areaId, A('math-lab')); assert.notEqual(out.continueInArea.nodeId, N('math-lab', 'modulus'));
  assert.equal(out.nextArea.areaId, A('boolean-conditional-lab'));
  assert.ok(out.different && out.different.nodeId !== out.continueInArea.nodeId);
  store.setMark(A('boolean-conditional-lab'), 'familiar', 'advanced');
  const v2 = view(store);
  const out2 = afterPractice({ nodes: v2.nodes, areaOrder: v2.guest.areaOrder, summary: v2.guest.summary, suggestion: v2.guest.suggestion, nodeId: N('math-lab', 'modulus') });
  assert.equal(out2.nextArea.areaId, A('string-lab'), 'familiar areas are skipped');
});

test('direct navigation to any later area is allowed and remembered; "Start here" is the single chosen target', () => {
  const { store } = newStore(); store.setCourse('advanced');
  store.setMark(N('recursion-lab', 'trace') in Object.fromEntries(graph.nodes.map(n => [n.id, 1])) ? N('recursion-lab', 'trace') : graph.nodes.find(n => n.areaId === A('recursion-lab')).id, 'start-here', 'advanced',
    { areaId: A('recursion-lab'), nodeId: graph.nodes.find(n => n.areaId === A('recursion-lab')).id });
  const v = view(store);
  assert.equal(v.guest.resume.areaId, A('recursion-lab'));
  assert.equal(v.guest.suggestion.primary.areaId, A('recursion-lab'));
  assert.equal(v.guest.suggestion.primary.code, 'start');
  assert.ok(v.nodes.every(n => n.practice.length), 'earlier areas were never locked');
});

test('unpracticed lists and review areas are reported for the summary panel', () => {
  const { store, now } = newStore(); store.setCourse('advanced');
  const t = javaTracker({ store, now });
  for (let i = 0; i < 6; i++) answerWith(t, loop('while', false));
  const v = view(store);
  assert.equal(v.guest.practicedSkills, 1); assert.equal(v.guest.notPracticedSkills, v.nodes.length - 1);
  assert.deepEqual(v.guest.reviewAreas, [A('loop-lab')]);
  assert.equal(v.guest.totals.accuracy, 0);
});
