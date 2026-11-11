import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEvidence, contentProfileFromGraph, assessSupport, toBasisPoints, minCorrectFor } from '../mastery/index.mjs';
import { evaluateNode } from '../model.mjs';
import { lcg } from '../mastery/synthetic.mjs';
import { graph, NODE, pol, basePolicy, norm, run, answer, families, progress, NOW } from './lib/mastery-fixtures.mjs';

const MOD = 'node:advanced:math-lab:modulus';
const profile = contentProfileFromGraph(graph, MOD);
const ev = (policy, raw, nodeId = MOD, contentProfile = profile) => evaluateEvidence({ nodeId, policy: pol(policy), events: norm(raw).events, contentProfile });
const modulus = (count, results, over = {}) => run({ mode: 'modulus', count, results, ...over });
const codes = (r) => r.diagnostics.map((d) => d.code).sort();

test('minimum question threshold: one short of the minimum is in progress, the minimum with good accuracy qualifies', () => {
  const p = basePolicy({ minimumQuestions: 30, accuracy: 0.9 });
  const short = ev(p, modulus(29, [true]));
  assert.equal(short.status, 'in-progress'); assert.equal(short.qualifies, false);
  assert.deepEqual(codes(short), ['INSUFFICIENT_COUNT']);
  assert.equal(short.recovery.remainingQuestions, 1);
  const met = ev(p, modulus(30, [true]));
  assert.equal(met.status, 'requirements-met'); assert.equal(met.qualifies, true); assert.deepEqual(met.diagnostics, []);
});

test('90% accuracy is judged exactly at the boundary (27 of 30 passes, 26 of 30 does not)', () => {
  const p = basePolicy({ minimumQuestions: 30, accuracy: 0.9 });
  const at = (misses) => modulus(30, (i) => i >= misses);
  assert.equal(ev(p, at(3)).qualifies, true);
  const fail = ev(p, at(4));
  assert.equal(fail.qualifies, false); assert.equal(fail.status, 'requirements-not-yet-met');
  assert.deepEqual(codes(fail), ['LOW_OVERALL_ACCURACY']);
  assert.equal(fail.diagnostics[0].atOrAboveMinimum, true);
});

test('95% accuracy is judged exactly at the boundary (48 of 50 passes, 47 of 50 does not)', () => {
  const p = basePolicy({ minimumQuestions: 50, accuracy: 0.95 });
  assert.equal(ev(p, modulus(50, (i) => i >= 2)).qualifies, true);
  assert.equal(ev(p, modulus(50, (i) => i >= 3)).qualifies, false);
  assert.equal(ev(p, modulus(50, (i) => i >= 3)).counts.accuracyPercent, 94);
});

test('a student who is short on accuracy at the minimum keeps answering and recovers; the engine states the exact number', () => {
  const p = basePolicy({ minimumQuestions: 30, accuracy: 0.9 });
  const at30 = ev(p, modulus(30, (i) => i >= 5));
  assert.deepEqual([at30.counts.attempted, at30.counts.correct, at30.counts.accuracyPercent], [30, 25, 83.3]);
  assert.equal(at30.recovery.additionalCorrectForAccuracy, 20);
  assert.equal(at30.recovery.lowerBoundOnly, false);
  const stream = (extra) => modulus(30 + extra, (i) => i < 30 ? i >= 5 : true);
  assert.equal(ev(p, stream(19)).qualifies, false, '19 more is one short');
  const done = ev(p, stream(20));
  assert.equal(done.qualifies, true); assert.equal(done.counts.attempted, 50); assert.equal(done.counts.correct, 45);
  assert.equal(done.completion.recordNumber, 50);
});

test('accuracy falling after more mistakes raises the recovery requirement', () => {
  const p = basePolicy({ minimumQuestions: 30, accuracy: 0.9 });
  const a = ev(p, modulus(30, (i) => i >= 4)), b = ev(p, modulus(34, (i) => i < 30 ? i >= 4 : false));
  assert.equal(a.recovery.additionalCorrectForAccuracy, 10, '26/30: 36/40 is exactly 90%');
  assert.equal(b.recovery.additionalCorrectForAccuracy, 46, '26/34: 72/80 is exactly 90%');
  assert.ok(b.recovery.additionalCorrectForAccuracy > a.recovery.additionalCorrectForAccuracy);
});

test('the additional-correct number is an accuracy-only lower bound whenever another requirement is outstanding', () => {
  const p = basePolicy({ minimumQuestions: 20, accuracy: 0.9, challenge: { subskills: [{ id: 'neg', label: 'negative operands', match: { familyIds: ['modulus:negative-dividend'] }, minExposure: 3, minCorrect: 2 }] } });
  const r = ev(p, modulus(20, (i) => i >= 4, { famList: ['modulus:larger', 'modulus:smaller'] }));
  assert.equal(r.recovery.lowerBoundOnly, true);
  assert.deepEqual(r.recovery.otherRequirementsOutstanding, ['subskill:neg']);
  assert.equal(r.recovery.guaranteesRequirementsMet, false);
  const flawless = ev(p, modulus(60, [true], { famList: ['modulus:larger'] }));
  assert.equal(flawless.qualifies, false, 'perfect accuracy cannot stand in for a missing subskill');
  assert.equal(flawless.recovery.guaranteesRequirementsMet, false);
  const prog = progress({ policy: p, raw: modulus(20, (i) => i >= 4, { famList: ['modulus:larger', 'modulus:smaller'] }), nodeId: MOD }).progress;
  assert.match(prog.explanation.text, /accuracy only/);
  assert.match(prog.explanation.text, /still need to practice questions about negative operands/);
});

test('edge cases: nothing answered, perfect accuracy, 100% target, tiny minimums', () => {
  const p = basePolicy({ minimumQuestions: 30, accuracy: 0.9 });
  const none = ev(p, []);
  assert.deepEqual([none.counts.attempted, none.counts.accuracy, none.recovery.remainingQuestions, none.recovery.additionalCorrectForAccuracy], [0, null, 30, 1]);
  assert.equal(ev(p, modulus(30, [true])).counts.accuracyPercent, 100);
  const strict = basePolicy({ minimumQuestions: 5, accuracy: 1 });
  const missed = ev(strict, modulus(5, (i) => i !== 2));
  assert.equal(missed.recovery.accuracyUnrecoverableInAttempt, true); assert.equal(missed.recovery.additionalCorrectForAccuracy, null);
  assert.match(progress({ policy: strict, raw: modulus(5, (i) => i !== 2), nodeId: MOD }).progress.explanation.text, /no longer possible in this attempt/);
  const one = basePolicy({ minimumQuestions: 1, accuracy: 0.9 });
  assert.equal(ev(one, modulus(1, [true])).qualifies, true);
  const oneMiss = ev(one, modulus(1, [false]));
  assert.equal(oneMiss.recovery.additionalCorrectForAccuracy, 9);
  assert.equal(oneMiss.recovery.mistakeBudgetAtMinimum, 0);
  assert.equal(minCorrectFor(3, toBasisPoints(0.95)), 3, 'a three-question minimum at 95% means no mistakes at all');
});

test('the requirement that matters is reported separately: low accuracy, short count, missing subskill, weak subskill, few families, missing difficulty', () => {
  const sub = (over = {}) => ({ id: 'neg', label: 'negative operands', match: { familyIds: ['modulus:negative-dividend', 'modulus:negative-divisor', 'modulus:both-negative'] }, minExposure: 4, minCorrect: 3, minAccuracy: 0.7, ...over });
  const all = families(MOD);
  const base = { minimumQuestions: 10, accuracy: 0.8 };
  const scenarios = {
    INSUFFICIENT_COUNT: [{ ...base }, modulus(6, [true])],
    LOW_OVERALL_ACCURACY: [{ ...base }, modulus(10, (i) => i < 5)],
    MISSING_SUBSKILL_EXPOSURE: [{ ...base, challenge: { subskills: [sub()] } }, modulus(20, [true], { famList: ['modulus:larger', 'modulus:smaller'] })],
    LOW_SUBSKILL_PERFORMANCE: [{ ...base, challenge: { subskills: [sub()] } }, [...modulus(10, [true], { famList: ['modulus:larger'] }), ...modulus(4, [false, true, false, true], { famList: ['modulus:negative-dividend'], session: 'x2' })]],
    INSUFFICIENT_FAMILY_VARIETY: [{ ...base, challenge: { families: { minDistinct: 4 } } }, modulus(20, [true], { famList: ['modulus:larger', 'modulus:smaller'] })],
    MISSING_REQUIRED_DIFFICULTY: [{ ...base, challenge: { difficulties: [{ difficulty: 'advanced', minQuestions: 3, minCorrect: 2 }] } }, modulus(12, [true], { difficulty: 'beginner' })],
  };
  for (const [code, [policy, raw]] of Object.entries(scenarios)) {
    const r = ev({ ...basePolicy(), ...policy }, raw);
    assert.deepEqual(codes(r), [code], `${code}: only this diagnostic should fire, got ${codes(r)}`);
    assert.equal(r.qualifies, false);
  }
  void all;
});

test('subskills: nearly perfect is enough (9 of 10 modulus negatives passes) and exposure alone is not', () => {
  const sub = { id: 'neg', label: 'negative operands', match: { familyIds: ['modulus:negative-dividend'] }, minExposure: 10, minCorrect: 8, minAccuracy: 0.8 };
  const p = basePolicy({ minimumQuestions: 20, accuracy: 0.9, challenge: { subskills: [sub] } });
  const rest = modulus(10, [true], { famList: ['modulus:larger'], session: 'r' });
  const nine = [...rest, ...modulus(10, (i) => i !== 4, { famList: ['modulus:negative-dividend'], session: 'n' })];
  const r = ev(p, nine);
  assert.equal(r.qualifies, true, 'one isolated mistake in ten must not fail the subskill'); assert.deepEqual(r.counts.bySubskill.neg, { n: 10, correct: 9 });
  const seven = [...rest, ...modulus(10, (i) => i < 7, { famList: ['modulus:negative-dividend'], session: 'n' })];
  const low = ev(basePolicy({ minimumQuestions: 20, accuracy: 0.8, challenge: { subskills: [sub] } }), seven);
  assert.equal(low.qualifies, false); assert.deepEqual(codes(low), ['LOW_SUBSKILL_PERFORMANCE']);
  assert.deepEqual(low.missing.subskills.map((s) => [s.id, s.reason]), [['neg', 'performance']]);
});

test('a subskill requirement fails for ambiguous evidence: answers missing the metadata needed to place them', () => {
  const sub = { id: 'neg', label: 'negative operands', match: { familyIds: ['modulus:negative-dividend'] }, minExposure: 3, minCorrect: 2 };
  const p = basePolicy({ minimumQuestions: 10, accuracy: 0.8, challenge: { subskills: [sub] } });
  const placed = modulus(5, [true], { famList: ['modulus:negative-dividend'], session: 'p' });
  const unplaced = modulus(5, [true], { famList: [null], session: 'u' });
  const r = ev(p, [...placed, ...unplaced]);
  assert.equal(r.qualifies, false); assert.deepEqual(codes(r), ['AMBIGUOUS_SUBSKILL_EVIDENCE']);
  assert.equal(r.diagnostics[0].unmapped, 5);
  const tolerant = ev({ ...p, challenge: { ...p.challenge, subskillEvidence: { maxUnmappedShare: 0.5 } } }, [...placed, ...unplaced]);
  assert.equal(tolerant.qualifies, true, 'a teacher may allow a stated share of unplaced questions');
  const otherFamily = modulus(5, [true], { famList: ['modulus:larger'], session: 'o' });
  assert.equal(ev(p, [...placed, ...otherFamily]).qualifies, true, 'a question that simply belongs elsewhere is not ambiguous');
});

test('reasoning-family diversity: fifty repeats of one family is one family, not fifty', () => {
  const p = basePolicy({ minimumQuestions: 50, accuracy: 0.9, challenge: { families: { minDistinct: 4 } } });
  const r = ev(p, modulus(50, [true], { famList: ['modulus:remainder'] }));
  assert.equal(r.counts.distinctFamilies, 1); assert.equal(r.qualifies, false); assert.deepEqual(codes(r), ['INSUFFICIENT_FAMILY_VARIETY']);
  assert.deepEqual(r.missing.families, { have: 1, needed: 3 });
  const varied = ev(p, modulus(50, [true], { famList: ['modulus:remainder', 'modulus:larger', 'modulus:smaller', 'modulus:divisible'] }));
  assert.equal(varied.qualifies, true);
  const wrongOnes = ev(basePolicy({ minimumQuestions: 4, accuracy: 0, challenge: { families: { minDistinct: 2 } } }), [...modulus(2, [true], { famList: ['modulus:larger'] }), ...modulus(4, [false], { famList: ['modulus:smaller'], session: 'w' })]);
  assert.equal(wrongOnes.counts.distinctFamilies, 2, 'exposure to a family is tracked even when its answers were wrong');
  assert.equal(wrongOnes.qualifies, false, 'but a family counts toward diversity only when answered correctly at least once');
});

test('family names that the graph does not bind to the node are not reasoning families', () => {
  const p = basePolicy({ minimumQuestions: 10, accuracy: 0.9, challenge: { families: { minDistinct: 3 } } });
  const raw = [...modulus(4, [true], { famList: ['modulus:larger'] }), ...modulus(3, [true], { famList: ['value-1'], session: 'a' }), ...modulus(3, [true], { famList: ['value-2'], session: 'b' })];
  const r = ev(p, raw);
  assert.equal(r.counts.distinctFamilies, 1); assert.deepEqual(r.counts.unboundFamilyIds, ['value-1', 'value-2']);
  assert.equal(r.qualifies, false);
});

test('family requirements cannot be verified without a list of real families: the policy is flagged provisional, not passed', () => {
  const p = basePolicy({ minimumQuestions: 10, accuracy: 0.9, challenge: { families: { minDistinct: 2 } } });
  const raw = modulus(20, [true]);
  const none = ev(p, raw, MOD, null);
  assert.equal(none.qualifies, false); assert.deepEqual(codes(none), ['FAMILY_METADATA_UNAVAILABLE']);
  assert.equal(none.support.status, 'provisional'); assert.equal(none.support.reasons[0].verified, false);
  const varType = contentProfileFromGraph(graph, NODE.varType);
  assert.deepEqual(varType.boundFamilyIds, null, 'Variable Lab identify skills have no families bound in the graph');
  const prog = progress({ policy: p, raw: modulus(20, [true]), nodeId: NODE.varType, contentProfile: varType }).progress;
  assert.equal(prog.status, 'provisional'); assert.equal(prog.statusReason, 'families-cannot-be-verified');
});

test('an impossible policy is reported unsupported with verified facts, and a tiny pool is flagged', () => {
  const p = pol(basePolicy({ minimumQuestions: 50, accuracy: 0.9, challenge: { families: { minDistinct: 12 }, difficulties: [{ difficulty: 'advanced', minQuestions: 5, minCorrect: 4 }], subskills: [{ id: 'ghost', label: 'ghost topic', match: { familyIds: ['modulus:nonexistent'] }, minExposure: 1, minCorrect: 1 }] } }));
  const s = assessSupport(p, { boundFamilyIds: families(MOD), familyBindingStatus: 'source-family-ids', difficulties: ['beginner'], bankSize: 12 });
  assert.equal(s.status, 'unsupported');
  assert.deepEqual(s.reasons.map((r) => r.code).sort(), ['difficulty-not-offered', 'fewer-families-than-required', 'question-pool-smaller-than-minimum', 'subskill-has-no-questions']);
  assert.ok(s.reasons.every((r) => r.verified === true));
  const unknown = assessSupport(p, { boundFamilyIds: families(MOD), familyBindingStatus: 'source-family-ids', difficulties: null, bankSize: null });
  assert.ok(unknown.reasons.some((r) => r.code === 'difficulty-levels-unknown' && r.verified === false), 'an unknown level is an estimate, not a fact');
  const fine = assessSupport(pol(basePolicy({ challenge: { families: { minDistinct: 3 } } })), { boundFamilyIds: families(MOD), familyBindingStatus: 'source-family-ids', difficulties: null, bankSize: null });
  assert.equal(fine.status, 'supported');
  const prog = progress({ policy: basePolicy({ minimumQuestions: 10, accuracy: 0.9, challenge: { families: { minDistinct: 12 } } }), raw: modulus(10, [true]), nodeId: MOD }).progress;
  assert.equal(prog.status, 'provisional'); assert.equal(prog.statusReason, 'requirements-cannot-be-met');
  assert.match(prog.explanation.text, /can't be met with the questions that are available/);
});

test('difficulty requirements: levels must be met at the named level, "mixed" and unlabeled answers do not stand in', () => {
  const p = basePolicy({ minimumQuestions: 10, accuracy: 0.8, challenge: { difficulties: [{ difficulty: 'Advanced', minQuestions: 4, minCorrect: 3 }] } });
  const lo = modulus(10, [true], { difficulty: 'beginner' }), mixedLevel = modulus(6, [true], { difficulty: 'mixed', session: 'm' }), none = modulus(6, [true], { difficulty: null, session: 'n' });
  assert.equal(ev(p, [...lo, ...mixedLevel, ...none]).qualifies, false);
  const adv = ev(p, [...lo, ...modulus(4, [true, true, true, false], { difficulty: 'advanced', session: 'a' })]);
  assert.equal(adv.qualifies, true);
  assert.deepEqual(adv.counts.byDifficulty.advanced, { n: 4, correct: 3 });
  const weak = ev(p, [...lo, ...modulus(4, [true, false, false, true], { difficulty: 'advanced', session: 'a' })]);
  assert.equal(weak.qualifies, false);
  assert.ok(codes(weak).includes('LOW_DIFFICULTY_PERFORMANCE'));
  assert.ok(!codes(weak).includes('MISSING_REQUIRED_DIFFICULTY'), 'enough advanced questions were seen; the problem is how they went');
  assert.deepEqual(ev(p, lo).missing.difficulties, [{ difficulty: 'advanced', reason: 'exposure', needed: 4 }]);
});

test('minimum-correct is an additional requirement: all applicable requirements must hold, not one of them', () => {
  const p = basePolicy({ minimumQuestions: 20, accuracy: 0.9, challenge: { minimumCorrect: 25 } });
  const r = ev(p, modulus(20, [true]));
  assert.equal(r.qualifies, false); assert.deepEqual(codes(r), ['INSUFFICIENT_CORRECT']);
  assert.equal(r.recovery.correctNeededAtMinimum, 25);
  assert.equal(ev(p, modulus(25, [true])).qualifies, true);
});

test('qualification freezes at the record where it was met; later mistakes do not undo it', () => {
  const p = basePolicy({ minimumQuestions: 10, accuracy: 0.9 });
  const r = ev(p, modulus(40, (i) => i < 10));
  assert.equal(r.qualifies, true); assert.equal(r.completion.recordNumber, 10); assert.equal(r.counts.attempted, 10); assert.equal(r.afterCompletionRecords, 30);
});

test('a provisional or unconfigured policy never qualifies and is labeled provisional', () => {
  const prov = ev({ id: 'policy:provisional', version: 1, provisional: true, label: 'x', minimumQuestions: null, accuracy: null, coverage: {}, scoreTarget: null }, modulus(40, [true]));
  assert.equal(prov.qualifies, false); assert.equal(prov.status, 'provisional'); assert.ok(prov.support.reasons.some((r) => r.code === 'policy-provisional'));
  const scoreOnly = ev({ ...basePolicy(), minimumQuestions: null, accuracy: null, scoreTarget: 3 }, modulus(40, [true]));
  assert.equal(scoreOnly.qualifies, false); assert.ok(scoreOnly.support.reasons.some((r) => r.code === 'no-challenge-requirements'));
});

test('the engine agrees with the existing evaluateNode() on plain question-and-accuracy policies (property test)', () => {
  const rand = lcg(20261111), mine = pol(basePolicy({ minimumQuestions: 12, accuracy: 0.85 })), legacy = { ...basePolicy({ minimumQuestions: 12, accuracy: 0.85 }), coverage: {} };
  const toLegacy = (e) => ({ id: e.id, kind: 'question', eligible: true, nodeIds: [...e.nodeIds], firstAttempt: e.firstAttempt, correct: e.correct, skipped: false, revealed: false, familyId: e.familyId ?? 'x', questionId: e.questionId, sessionId: e.sessionId, subskills: [], timestamp: e.timestamp });
  let met = 0, notMet = 0;
  for (let trial = 0; trial < 300; trial++) {
    const n = 1 + Math.floor(rand() * 40), p = 0.55 + rand() * 0.45;
    const raw = modulus(n, () => rand() < p, { session: `t${trial}` });
    const events = norm(raw).events;
    const r = evaluateEvidence({ nodeId: MOD, policy: mine, events });
    const final = evaluateNode(MOD, legacy, events.map(toLegacy));
    if (final.completion === 'complete') assert.equal(r.qualifies, true, `trial ${trial}: legacy says complete at the end, the engine must too`);
    if (r.qualifies) {
      const upTo = events.slice(0, r.completion.recordNumber);
      assert.equal(evaluateNode(MOD, legacy, upTo.map(toLegacy)).completion, 'complete', `trial ${trial}: the engine's completion record must satisfy the legacy rule`);
      met++;
    } else { assert.equal(final.completion === 'complete', false); notMet++; }
  }
  assert.ok(met > 20 && notMet > 20, `the property test needs both outcomes (${met} met, ${notMet} not met)`);
});

test('challenge qualification never sets or implies a standards score', () => {
  const policy = basePolicy({ minimumQuestions: 10, accuracy: 0.9, scoreTarget: null });
  const done = progress({ policy, raw: modulus(10, [true]), nodeId: MOD }).progress;
  assert.equal(done.status, 'requirements-met');
  assert.equal(done.standards.score, null, 'completing a challenge does not award a 0-4 score, least of all a 4');
  assert.equal(done.standards.separateFromChallenge, true);
  const scored = progress({ policy, raw: modulus(4, [true]), nodeId: MOD, assessmentEvidence: [{ id: 'a1', kind: 'assessment', eligible: true, nodeIds: [MOD], score: 3, timestamp: '2026-11-20T00:00:00.000Z' }] }).progress;
  assert.equal(scored.standards.score, 3); assert.equal(scored.status, 'in-progress', 'a teacher score of 3 does not complete the practice challenge');
  const both = progress({ policy, raw: modulus(10, [true]), nodeId: MOD, assessmentEvidence: [{ id: 'a1', kind: 'assessment', eligible: true, nodeIds: [MOD], score: 2, timestamp: '2026-11-20T00:00:00.000Z' }] }).progress;
  assert.equal(both.status, 'requirements-met'); assert.equal(both.standards.score, 2, 'the teacher score is reported as it is, unchanged by the challenge');
  assert.equal(NOW > '2026', true);
});
