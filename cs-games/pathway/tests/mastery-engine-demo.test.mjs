// The six synthetic students, and real Phase 1/2 practice events (engine question -> real session tracker -> real profile client outbox
// -> mastery engine) so the engine is proven against what the pages actually send, not only against hand-written records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB_ADAPTERS, play, reseed, graph as labGraph } from './lib/lab-flow.mjs';
import { runDemo } from '../mastery/demo.mjs';
import { evaluateEvidence, normalizeEvents, selectRecords, emptyHistory, syncAttempt, validateMasteryPolicy, verifyHistory } from '../mastery/index.mjs';
import { graph, SCOPE, NOW, basePolicy } from './lib/mastery-fixtures.mjs';

const demo = runDemo({ graph });
const last = (s) => s.steps[s.steps.length - 1];

test('demo A: a quick foundational node is met at 95% (48 of 50) with its subskills and families', () => {
  const p = last(demo.A).progress;
  assert.equal(p.status, 'requirements-met'); assert.deepEqual([p.attempt.attempted, p.attempt.correct], [50, 48]);
  assert.equal(p.requirements.requiredAccuracyPercent, 95); assert.equal(p.verification, 'provisional');
  assert.equal(demo.A.steps[0].progress.status, 'in-progress'); assert.equal(demo.A.steps[0].progress.remaining.questions, 26);
  assert.match(demo.A.steps[0].progress.explanation.text, /You've answered 24 of the 50 required questions\. Your accuracy is 95\.8%\./);
});

test('demo B: reaches the minimum at 85%, is not told to restart, and recovers with exactly the stated number of correct answers', () => {
  const [atMin, mid, done] = demo.B.steps.map((s) => s.progress);
  assert.equal(atMin.attemptStatus, 'requirements-not-yet-met'); assert.equal(atMin.recovery.additionalCorrectForAccuracy, 10);
  assert.match(atMin.explanation.text, /don't need to restart/); assert.match(atMin.explanation.text, /at least 10 more correct answers in a row/);
  assert.equal(mid.recovery.additionalCorrectForAccuracy, 5);
  assert.equal(done.status, 'requirements-met'); assert.deepEqual([done.attempt.attempted, done.attempt.correct], [30, 27]);
  assert.equal(demo.B.history.attempts.length, 1, 'recovery happened inside one attempt');
});

test('demo C: 98% accuracy still fails for a missing essential subskill and too few families, and says so', () => {
  const p = last(demo.C).progress;
  assert.equal(p.status, 'in-progress'); assert.equal(p.attemptStatus, 'requirements-not-yet-met'); assert.equal(p.attempt.accuracyPercent, 98);
  assert.deepEqual(p.diagnostics.map((d) => d.code).sort(), ['INSUFFICIENT_FAMILY_VARIETY', 'MISSING_SUBSKILL_EXPOSURE']);
  assert.deepEqual(p.missing.subskills.map((s) => s.label), ['double division']);
  assert.match(p.explanation.text, /You still need to practice questions about double division\./);
});

test('demo D: seven Math Lab skills finish through Mixed Practice only, and the area completes', () => {
  const [first, second] = demo.D.steps;
  assert.equal(first.area.label, '5 of 7 skills complete'); assert.equal(first.area.qualified, false);
  assert.equal(second.area.label, '7 of 7 skills complete'); assert.equal(second.area.status, 'complete'); assert.equal(second.area.qualified, true); assert.equal(second.area.verified, false, 'qualification is not verified mastery');
  assert.ok(second.nodes.every((n) => n.status === 'requirements-met'));
  assert.ok(second.nodes.every((n) => n.standards.score === null), 'finishing the area awards no standards score');
  for (const h of Object.values(demo.D.histories)) assert.equal(h.attempts.length, 1);
});

test('demo E: the restart keeps the unsuccessful attempt, resets counters, and a repeated request changes nothing', () => {
  assert.deepEqual(demo.E.steps[0], { label: 'restart requested twice with the same request id', restarted: true, repeatedRequestChangedNothing: true });
  const h = demo.E.history;
  assert.deepEqual(h.attempts.map((a) => a.status), ['restarted', 'requirements-met']);
  assert.deepEqual([h.attempts[0].snapshot.counts.attempted, h.attempts[0].snapshot.counts.correct], [20, 12]);
  assert.deepEqual([h.attempts[1].snapshot.counts.attempted, h.attempts[1].snapshot.counts.correct], [20, 20]);
  assert.deepEqual(verifyHistory(h), []);
  assert.equal(last(demo.E).progress.lifetime.questionsAnswered, 40);
});

test('demo F: a newer policy keeps the earlier completion, opens a new challenge, and the student is told', () => {
  const [v1, changed, v2] = demo.F.steps.map((s) => s.progress);
  assert.equal(v1.status, 'requirements-met'); assert.equal(v1.lastCompletedAttempt.policy.version, 1);
  assert.equal(changed.status, 'review-recommended'); assert.equal(changed.reassessment.needed, true);
  assert.equal(changed.lastCompletedAttempt.policy.version, 1, 'version 1 completion remains visible under version 2');
  assert.equal(v2.status, 'requirements-met'); assert.equal(v2.lastCompletedAttempt.policy.version, 2);
  assert.deepEqual(demo.F.history.attempts.map((a) => [a.policy.version, a.status]), [[1, 'requirements-met'], [2, 'requirements-met']]);
  assert.deepEqual(verifyHistory(demo.F.history), []);
});

test('the demonstration is deterministic', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(runDemo({ graph }))), JSON.parse(JSON.stringify(demo)));
});

// ----------------------------------------------------------------------------------------------------------------------------------------
// Real events from the real pages' flow
const scope = { profileId: '3b9d8a5e-1c2f-4a6b-8d7e-0f1a2b3c4d5e', classId: 'synthetic-class' };
const normalizeReal = (events) => normalizeEvents(events, { graph, scope, now: new Date(Date.now() + 86400000).toISOString() });

test('real Math Lab Mixed Practice events credit each skill from the question shown, and the engine counts them per node', () => {
  reseed(424242);
  const math = LAB_ADAPTERS['math-lab'], raw = [], expectedByNode = {};
  for (let i = 0; i < 210; i++) {
    const q = math.mixed(i), r = play(math, q, i % 7 === 3 ? 'incorrect' : 'correct');
    raw.push(...r.events);
    const node = math.expected(q);
    (expectedByNode[node] ??= { questions: 0, correct: 0 });
    expectedByNode[node].questions++; if (i % 7 !== 3) expectedByNode[node].correct++;
  }
  const parsed = normalizeReal(raw);
  assert.equal(parsed.counts.rejected, 0, JSON.stringify(parsed.counts.reasons));
  assert.ok(parsed.events.every((e) => e.requestedMode === 'mixed' || e.requestedMode === e.assessedMode), 'the page asked for Mixed');
  assert.ok(parsed.events.every((e) => e.assessedMode !== 'mixed'), 'but no event is credited to "mixed"');
  const policy = validateMasteryPolicy(basePolicy({ id: 'real:test', version: 1, minimumQuestions: 5, accuracy: 0.5 })).policy;
  assert.equal(Object.keys(expectedByNode).length, 7, 'Mixed Practice reaches all seven Math Lab skills');
  for (const [nodeId, want] of Object.entries(expectedByNode)) {
    const r = evaluateEvidence({ nodeId, policy, events: parsed.events });
    assert.equal(r.ignored.retries, 0);
    const sel = selectRecords(parsed.events, nodeId);
    assert.equal(sel.records.length, want.questions, `${nodeId}: every question shown credits its own node exactly once`);
    assert.ok(sel.records.every((e) => e.nodeIds.length === 1 && e.nodeIds[0] === nodeId), 'no question credits an unrelated node');
  }
});

test('real tracker: a wrong answer followed by a right one counts once, as incorrect; a doubled submit counts once', () => {
  reseed(777);
  const loop = LAB_ADAPTERS['loop-lab'];
  const q1 = loop.focused(loop.modes[0], 0), r1 = play(loop, q1, 'wrongThenRight');
  assert.equal(r1.events.length, 2); assert.deepEqual(r1.events.map((e) => [e.attempt, e.correct]), [[1, false], [2, true]]);
  const q2 = loop.focused(loop.modes[0], 1), r2 = play(loop, q2, 'doubleSubmit');
  const parsed = normalizeReal([...r1.events, ...r2.events]);
  const nodeId = loop.expected(q1);
  const policy = validateMasteryPolicy(basePolicy({ id: 'real:test2', version: 1, minimumQuestions: 1, accuracy: 0.1 })).policy;
  const r = evaluateEvidence({ nodeId, policy, events: parsed.events });
  assert.equal(r.counts.attempted, 2, 'two questions, however many submissions');
  assert.equal(r.counts.correct, 1, 'the wrong-then-right question stays incorrect; the doubled submit is one correct first try');
  assert.equal(r.ignored.retries >= 1, true);
});

test('real tracker: skipping and revealing emit no events, so the engine reports the limitation instead of inventing them', () => {
  reseed(31337);
  const loop = LAB_ADAPTERS['loop-lab'], q = loop.focused(loop.modes[0], 0);
  assert.deepEqual(play(loop, q, 'skip').events, [], 'the page records a skip locally but sends nothing to the profile');
  assert.deepEqual(play(loop, loop.focused(loop.modes[0], 2), 'reveal').events, []);
  const policy = validateMasteryPolicy(basePolicy({ id: 'real:test3', version: 1, minimumQuestions: 3, accuracy: 0.9 })).policy;
  const r = evaluateEvidence({ nodeId: loop.expected(q), policy, events: [] });
  assert.ok(r.limitations.some((l) => l.code === 'SKIPS_NOT_RECORDED'), 'the limitation is part of every evaluation');
});

test('real events for every lab and mode normalize to the same nodes the Worker credits (no engine attribution drift)', () => {
  reseed(9001);
  let checked = 0;
  for (const a of Object.values(LAB_ADAPTERS)) for (const mode of a.modes) {
    const q = a.focused(mode, 0), r = play(a, q, 'correct');
    if (!r.events.length) continue;
    const parsed = normalizeReal(r.events);
    if (!r.credits[0].ids.length) { assert.equal(parsed.counts.accepted, 0, `${a.lab}/${mode}: the Worker credits nothing, so must the engine`); continue; }
    assert.equal(parsed.counts.accepted, 1, `${a.lab}/${mode}`);
    assert.deepEqual([...parsed.events[0].nodeIds].sort(), [...r.credits[0].ids].sort(), `${a.lab}/${mode}`);
    checked++;
  }
  assert.ok(checked >= 100, `expected to check at least 100 lab modes, checked ${checked}`);
  void labGraph; void emptyHistory; void syncAttempt; void NOW; void SCOPE;
});
