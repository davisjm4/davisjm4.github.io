import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent, normalizeEvents, evaluateEvidence, selectRecords, emptyHistory, syncAttempt, pathwayProgress } from '../mastery/index.mjs';
import { retry } from '../mastery/synthetic.mjs';
import { graph, NODE, SCOPE, NOW, pol, basePolicy, norm, run, answer, newPathway, families } from './lib/mastery-fixtures.mjs';

const P = pol(basePolicy({ minimumQuestions: 10, accuracy: 0.9 }));
const ev = (raw, over = {}) => norm(raw, over).events;
const evalNode = (raw, policy = P, nodeId = NODE.division) => evaluateEvidence({ nodeId, policy, events: ev(raw) });
const q = (n, correct, extra = {}) => answer({ student: 's1', session: 'a', n, at: n, assessedMode: 'division', familyId: 'division:integer', correct, ...extra });

test('a correct first answer counts; an incorrect first answer stays incorrect even when the retry is right', () => {
  const first = q(1, false), fixed = retry(first, true);
  const r = evalNode([first, fixed, q(2, true)]);
  assert.equal(r.counts.attempted, 2);
  assert.equal(r.counts.correct, 1, 'only the second question was right on the first try');
  assert.equal(r.ignored.retries, 1);
  assert.equal(r.counts.accuracy, 0.5);
});

test('retries never become extra first-attempt credit, however many arrive', () => {
  const first = q(1, false);
  const flood = [first, ...[2, 3, 4, 5, 6].map((a) => ({ ...retry(first, true), id: `${first.questionId}:${a}`, attempt: a }))];
  const r = evalNode(flood);
  assert.deepEqual([r.counts.attempted, r.counts.correct, r.ignored.retries], [1, 0, 5]);
});

test('repeated submissions and replays do not duplicate evidence', () => {
  const a = q(1, true);
  const r = evalNode([a, a, { ...a }, q(2, true)]);
  assert.equal(r.counts.attempted, 2);
  const parsed = norm([a, a, a]);
  assert.equal(parsed.counts.duplicateIds, 2);
  const sameQuestionNewId = { ...a, id: 'other-id:1' };
  assert.equal(evalNode([a, sameQuestionNewId]).counts.attempted, 1, 'the same session and question counts once');
  assert.equal(evalNode([a, sameQuestionNewId]).ignored.duplicateQuestions, 1);
});

test('an orphan retry (its first attempt was lost) earns nothing and is reported as a limitation', () => {
  const r = evalNode([retry(q(1, true), true), q(2, true)]);
  assert.equal(r.counts.attempted, 1);
  assert.ok(r.limitations.some((l) => l.code === 'ORPHAN_RETRIES'));
});

test('skipped and revealed questions are never credited as correct and stay in the denominator by default', () => {
  const skipped = { ...q(3, false), skipped: true }, revealed = { ...q(4, false), revealed: true }, lie = { ...q(5, true), revealed: true };
  const r = evalNode([q(1, true), q(2, true), skipped, revealed, lie]);
  assert.equal(r.counts.attempted, 5);
  assert.equal(r.counts.correct, 2, 'a skipped, revealed, or revealed-then-claimed-correct question earns no credit');
  const e = normalizeEvent(lie, { graph, scope: SCOPE });
  assert.equal(e.event.correct, false);
  assert.ok(e.event.notes.includes('correct-flag-ignored-for-revealed'));
});

test('skipping hard questions cannot raise accuracy: 18 right + 12 skipped is 60%, not 100%', () => {
  const answered = Array.from({ length: 18 }, (_, i) => q(i + 1, true));
  const skips = Array.from({ length: 12 }, (_, i) => ({ ...q(100 + i, false), skipped: true }));
  const r = evalNode([...answered, ...skips], pol(basePolicy({ minimumQuestions: 30, accuracy: 0.9 })));
  assert.equal(r.counts.attempted, 30);
  assert.equal(r.counts.accuracyPercent, 60);
  assert.equal(r.qualifies, false);
});

test('assisted answers are not independent credit; excluding them is allowed only up to a cap', () => {
  const hinted = Array.from({ length: 4 }, (_, i) => q(i + 1, true, { assisted: true }));
  const clean = Array.from({ length: 6 }, (_, i) => q(i + 10, true));
  const strict = evalNode([...hinted, ...clean]);
  assert.equal(strict.counts.correct, 6, 'a hinted correct answer is not a correct first try');
  assert.equal(strict.counts.attempted, 10);
  const lenient = pol(basePolicy({ minimumQuestions: 6, accuracy: 0.9, challenge: { unscored: { assisted: 'excluded', maxExcludedShare: 0.5 } } }));
  const r = evalNode([...hinted, ...clean], lenient);
  assert.equal(r.counts.attempted, 6); assert.equal(r.counts.excluded.assisted, 4);
  assert.equal(r.qualifies, true);
  const capped = pol(basePolicy({ minimumQuestions: 6, accuracy: 0.9, challenge: { unscored: { assisted: 'excluded', maxExcludedShare: 0.2 } } }));
  const c = evalNode([...hinted, ...clean], capped);
  assert.equal(c.qualifies, false);
  assert.ok(c.diagnostics.some((d) => d.code === 'EXCESSIVE_EXCLUSIONS'), 'dropping hinted questions out of the denominator is capped so it cannot be used to hide hard questions');
});

test('Mixed Practice credits the assessed mode and family of the question shown, never the word Mixed', () => {
  const mixedAnswer = answer({ student: 's1', session: 'm', n: 1, at: 1, requestedMode: 'mixed', assessedMode: 'modulus', familyId: 'modulus:remainder', correct: true });
  const e = normalizeEvent(mixedAnswer, { graph, scope: SCOPE }).event;
  assert.equal(e.requestedMode, 'mixed'); assert.equal(e.assessedMode, 'modulus');
  assert.deepEqual([...e.nodeIds], [NODE.modulus]);
  for (const bad of [{ assessedMode: 'mixed' }, { assessedMode: 'Mixed' }, { assessedMode: null }]) {
    const r = normalizeEvent({ ...mixedAnswer, ...bad }, { graph, scope: SCOPE });
    assert.equal(r.ok, false, JSON.stringify(bad)); assert.equal(r.reason, 'no-assessed-mode');
  }
});

test('focused and Mixed answers feed the same count for a node; the same question reported by both is counted once', () => {
  const focusedPart = run({ mode: 'modulus', count: 6, results: [true], session: 'f1' });
  const mixedPart = Array.from({ length: 4 }, (_, i) => answer({ student: 's1', session: 'm1', n: i + 1, at: 50 + i, requestedMode: 'mixed', assessedMode: 'modulus', familyId: 'modulus:larger', correct: true }));
  const policy = pol(basePolicy({ minimumQuestions: 10, accuracy: 0.9 }));
  const r = evaluateEvidence({ nodeId: NODE.modulus, policy, events: ev([...focusedPart, ...mixedPart]) });
  assert.equal(r.counts.attempted, 10); assert.equal(r.qualifies, true);
  const echoedAsFocused = { ...mixedPart[0], mode: 'modulus', id: 'echo:1' };
  assert.equal(evaluateEvidence({ nodeId: NODE.modulus, policy, events: ev([...focusedPart, ...mixedPart, echoedAsFocused]) }).counts.attempted, 10, 'switching mode labels must not add a question');
});

test('a question credits only the nodes its mode and family map to', () => {
  const e = normalizeEvent(q(1, true), { graph, scope: SCOPE }).event;
  assert.deepEqual([...e.nodeIds], [NODE.division]);
  const r = evaluateEvidence({ nodeId: NODE.modulus, policy: P, events: [e] });
  assert.equal(r.counts.attempted, 0, 'a division answer adds nothing to modulus');
  const forged = normalizeEvent({ ...q(2, true), nodeIds: [NODE.modulus, NODE.array], dimensions: [{ id: NODE.array }] }, { graph, scope: SCOPE }).event;
  assert.deepEqual([...forged.nodeIds], [NODE.division], 'client-supplied node ids are ignored');
});

test('missing or malformed metadata is rejected with a reason, never invented', () => {
  const ok = q(1, true), cases = {
    'missing-id': { id: undefined }, 'missing-question-id': { questionId: undefined }, 'missing-session-id': { sessionId: undefined }, 'missing-activity': { activity: undefined },
    'missing-timestamp': { occurred: undefined }, 'invalid-timestamp': { occurred: 'nope' }, 'missing-correctness': { correct: 'yes' }, 'missing-attempt-number': { attempt: undefined },
    'invalid-attempt-number': { attempt: 0 }, 'conflicting-first-attempt': { attempt: 2, firstAttempt: true }, 'no-assessed-mode': { assessedMode: undefined, mode: undefined },
    'no-node-mapping': { activity: 'math-lab', assessedMode: 'made-up-mode', mode: 'made-up-mode' },
  };
  for (const [reason, patch] of Object.entries(cases)) {
    const r = normalizeEvent({ ...ok, ...patch }, { graph, scope: SCOPE });
    assert.equal(r.ok, false, reason); assert.equal(r.reason, reason);
  }
  for (const junk of [null, undefined, 7, 'text', [], {}]) assert.equal(normalizeEvent(junk, { graph, scope: SCOPE }).ok, false);
  const batch = norm([ok, { ...ok, id: undefined }, null, { ...ok, id: 'x:1', questionId: 'x', correct: 'maybe' }]);
  assert.equal(batch.counts.accepted, 1); assert.equal(batch.counts.rejected, 3);
  assert.deepEqual(Object.keys(batch.counts.reasons).sort(), ['malformed', 'missing-correctness', 'missing-id']);
  assert.throws(() => normalizeEvent(ok, { graph, scope: {} }), /profile scope/);
});

test('an event dated in the future is rejected; unclassified families are kept as unknown, not guessed', () => {
  const far = answer({ student: 's1', session: 'a', n: 9, at: 60 * 24 * 400, assessedMode: 'division', familyId: 'division:integer', correct: true });
  assert.equal(normalizeEvent(far, { graph, scope: SCOPE, now: NOW }).reason, 'future-timestamp');
  const none = normalizeEvent(q(1, true, { familyId: null }), { graph, scope: SCOPE }).event;
  assert.equal(none.familyId, null);
  const unclassified = normalizeEvent(q(1, true, { familyId: 'unclassified' }), { graph, scope: SCOPE }).event;
  assert.equal(unclassified.familyId, null);
  assert.deepEqual([...unclassified.nodeIds], [NODE.division], 'credit still follows the mode');
});

test('browser evidence is provisional; a client trust claim changes nothing; only the integrator resolver can verify', () => {
  const claim = { ...q(1, true), trusted: true, verified: true, trust: 'verified' };
  const e = normalizeEvent(claim, { graph, scope: SCOPE }).event;
  assert.equal(e.trust, 'provisional'); assert.ok(e.notes.includes('client-trust-claim-ignored'));
  const verified = normalizeEvent(q(1, true), { graph, scope: SCOPE, trustResolver: (x) => x.id === 'syn' }).event;
  assert.equal(verified.trust, 'provisional');
  const yes = normalizeEvent(q(1, true), { graph, scope: SCOPE, trustResolver: () => true }).event;
  assert.equal(yes.trust, 'verified');
  const stray = normalizeEvent(q(1, true), { graph, scope: SCOPE, trustResolver: () => 'true' }).event;
  assert.equal(stray.trust, 'provisional', 'only a literal true verifies');
  const r = evaluateEvidence({ nodeId: NODE.division, policy: P, events: ev(run({ count: 10, results: [true] })) });
  assert.equal(r.trust.verified, false); assert.equal(r.trust.provisionalEvents, 10);
});

test('stored performance_events rows (the Worker shape) are read the same way as outbox events', () => {
  const raw = q(1, false);
  const row = { id: raw.id, occurred: raw.occurred, pathway: 'advanced', activity: 'math-lab', data: { mode: raw.mode, assessedMode: 'division', topic: null, familyId: 'division:integer', difficulty: null, questionId: raw.questionId, sessionId: raw.sessionId, attempt: 1, correct: false, firstAttempt: true, assisted: false, n: 1, c: 0, dimensions: [{ scope: 'node', id: NODE.division, n: 1, c: 0 }] } };
  const e = normalizeEvent(row, { graph, scope: SCOPE });
  assert.ok(e.ok, JSON.stringify(e));
  assert.deepEqual([...e.event.nodeIds], [NODE.division]);
  assert.equal(e.event.correct, false);
  const stale = { ...row, data: { ...row.data, dimensions: [] } };
  assert.ok(normalizeEvent(stale, { graph, scope: SCOPE }).ok, 'attribution is recomputed from the graph, so rows stored before a mapping existed still resolve');
  const assistedRow = { ...row, data: { ...row.data, assisted: true, correct: true, dimensions: [], n: 0, c: 0 } };
  const a = normalizeEvent(assistedRow, { graph, scope: SCOPE }).event;
  assert.equal(evaluateEvidence({ nodeId: NODE.division, policy: P, events: [a] }).counts.correct, 0);
});

test('profile and class scopes are never mixed', () => {
  const mine = ev([q(1, true)]);
  const other = ev([answer({ student: 's2', session: 'a', n: 1, at: 1, assessedMode: 'division', familyId: 'division:integer', correct: true })], { scope: { profileId: 'synthetic-student-2', classId: SCOPE.classId } });
  assert.throws(() => evaluateEvidence({ nodeId: NODE.division, policy: P, events: [...mine, ...other] }), /more than one student/);
  const classB = ev([q(2, true)], { scope: { profileId: SCOPE.profileId, classId: 'synthetic-class-2' } });
  assert.throws(() => evaluateEvidence({ nodeId: NODE.division, policy: P, events: [...mine, ...classB] }), /more than one class/);
  assert.throws(() => syncAttempt(emptyHistory(SCOPE, NODE.division), { policy: P, events: classB, now: NOW }), /different student profile or class/);
  assert.throws(() => syncAttempt(emptyHistory(SCOPE, NODE.division), { policy: P, events: other, now: NOW }), /different student profile or class/);
  const stamped = normalizeEvent({ ...q(1, true), profileId: 'someone-else' }, { graph, scope: SCOPE });
  assert.equal(stamped.reason, 'scope-mismatch');
  const classStamped = normalizeEvent({ ...q(1, true), classId: 'synthetic-class-2' }, { graph, scope: SCOPE });
  assert.equal(classStamped.reason, 'scope-mismatch');
  const profileLevel = normalizeEvent(q(1, true), { graph, scope: { profileId: SCOPE.profileId } }).event;
  assert.equal(profileLevel.scope.classId, null);
  const pathway = newPathway();
  const wrong = emptyHistory({ profileId: 'synthetic-student-9', classId: SCOPE.classId }, NODE.division);
  assert.throws(() => pathwayProgress({ graph, pathway, profileId: SCOPE.profileId, now: NOW, histories: { [NODE.division]: wrong } }), /different student or class/);
  const otherClass = emptyHistory({ profileId: SCOPE.profileId, classId: 'synthetic-class-2' }, NODE.division);
  assert.throws(() => pathwayProgress({ graph, pathway, profileId: SCOPE.profileId, now: NOW, histories: { [NODE.division]: otherClass } }), /different student or class/);
});

test('the same practice evaluated for two students never leaks between them', () => {
  const policy = pol(basePolicy({ minimumQuestions: 10, accuracy: 0.9 }));
  const a = ev(run({ count: 10, results: [true], student: 'a' }), { scope: { profileId: 'sa', classId: 'c' } });
  const b = ev(run({ count: 3, results: [true], student: 'b' }), { scope: { profileId: 'sb', classId: 'c' } });
  assert.equal(evaluateEvidence({ nodeId: NODE.division, policy, events: a }).qualifies, true);
  assert.equal(evaluateEvidence({ nodeId: NODE.division, policy, events: b }).qualifies, false);
});

test('empty and incomplete histories are handled', () => {
  const r = evaluateEvidence({ nodeId: NODE.division, policy: P, events: [] });
  assert.equal(r.status, 'not-started'); assert.equal(r.counts.attempted, 0); assert.equal(r.counts.accuracy, null);
  assert.equal(r.recovery.remainingQuestions, 10); assert.equal(r.recovery.accuracyMet, false);
  const only = selectRecords(ev([{ ...q(1, true), attempt: 2 }]), NODE.division);
  assert.equal(only.records.length, 0);
  assert.equal(norm([]).counts.received, 0);
  assert.equal(norm(undefined).counts.received, 0);
});
