import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BP, toBasisPoints, percentToFraction, meetsAccuracy, minCorrectFor, additionalCorrectToRecover, mistakeAllowance, accuracyPercent, formatPercent,
  validateMasteryPolicy, policyDigest, stableStringify, toPathwayPolicy, policyForCheckpoint, isChallengeConfigured } from '../mastery/index.mjs';
import { validatePathway, diffPathways, provisionalPolicy } from '../model.mjs';
import { EXAMPLE_POLICIES } from '../mastery/examples.mjs';
import { suggestedConfigurations, summarizeSuggestionCoverage } from '../mastery/suggestions.mjs';
import { graph, newPathway, basePolicy } from './lib/mastery-fixtures.mjs';

const bp = (x) => toBasisPoints(x);

test('minimum correct answers use exact arithmetic for the teacher examples', () => {
  assert.equal(minCorrectFor(50, bp(0.95)), 48);
  assert.equal(minCorrectFor(30, bp(0.9)), 27);
  assert.equal(minCorrectFor(20, bp(0.9)), 18);
  assert.equal(minCorrectFor(25, bp(0.56)), 14, '0.56 * 25 is 14.000000000000002 in floating point; a float ceiling would demand 15');
  assert.equal(0.56 * 25 > 14, true, 'guard: this really is the floating-point trap the integer arithmetic avoids');
  assert.equal(minCorrectFor(10, bp(0.7)), 7);
  assert.equal(minCorrectFor(7, bp(0.9)), 7, '6.3 rounds up to 7, never down');
  assert.equal(minCorrectFor(1, bp(0.95)), 1);
  assert.equal(minCorrectFor(100, bp(1)), 100);
});

test('minCorrectFor is the smallest passing count, checked against an independent search, for every total up to 250', () => {
  for (const target of [0.5, 0.7, 0.75, 0.8, 0.85, 0.9, 0.925, 0.95, 0.99, 1]) for (let total = 1; total <= 250; total++) {
    const got = minCorrectFor(total, bp(target));
    let want = 0; while (want / total < target - 1e-12) want++;
    assert.equal(got, want, `${total} questions at ${target}`);
    assert.ok(meetsAccuracy(got, total, bp(target)));
    if (got > 0) assert.ok(!meetsAccuracy(got - 1, total, bp(target)));
  }
});

test('a quarter of the accuracy grid: 25 of 30 is 83.3% and has not qualified at 90%', () => {
  assert.equal(accuracyPercent(25, 30), 83.3);
  assert.equal(meetsAccuracy(25, 30, bp(0.9)), false);
  assert.equal(formatPercent(accuracyPercent(25, 30)), '83.3%');
  assert.equal(formatPercent(95), '95%');
});

test('percentages are truncated for display, never rounded up past the threshold', () => {
  assert.equal(accuracyPercent(2374, 2500), 94.9, '94.96% must not display as 95%');
  assert.equal(Math.round(2374 * 1000 / 2500) / 10, 95, 'guard: rounding would have shown 95');
  assert.equal(accuracyPercent(47, 50), 94);
  assert.equal(accuracyPercent(0, 0), null);
});

test('accuracy recovery: fewest additional consecutive correct answers is exact', () => {
  assert.equal(additionalCorrectToRecover(25, 30, bp(0.9)), 20);
  assert.equal(additionalCorrectToRecover(17, 20, bp(0.9)), 10);
  assert.equal(additionalCorrectToRecover(16, 20, bp(0.9)), 20);
  assert.equal(additionalCorrectToRecover(47, 50, bp(0.95)), 10, '47/50 needs 10 more: 57/60 is exactly 95%');
  for (const target of [0.7, 0.8, 0.9, 0.95]) for (let total = 0; total <= 80; total++) for (let correct = 0; correct <= total; correct++) {
    const k = additionalCorrectToRecover(correct, total, bp(target));
    assert.ok(meetsAccuracy(correct + k, total + k, bp(target)), `${correct}/${total} +${k} at ${target}`);
    const floor = total === 0 ? 1 : 0;
    if (k > floor) assert.ok(!meetsAccuracy(correct + k - 1, total + k - 1, bp(target)), `${correct}/${total}: ${k - 1} would already be enough at ${target}`);
  }
});

test('recovery edge cases: nothing answered, perfect accuracy, 100% target after a miss', () => {
  assert.equal(additionalCorrectToRecover(0, 0, bp(0.9)), 1, 'with nothing answered the accuracy rule needs at least one answer');
  assert.equal(additionalCorrectToRecover(30, 30, bp(0.95)), 0);
  assert.equal(additionalCorrectToRecover(29, 30, bp(1)), null, 'a 100% target cannot be recovered after any miss');
  assert.equal(additionalCorrectToRecover(30, 30, bp(1)), 0);
  assert.equal(meetsAccuracy(0, 0, bp(0)), false, 'no answers never satisfy an accuracy rule');
});

test('mistake allowance at the minimum-question checkpoint', () => {
  assert.deepEqual(mistakeAllowance({ correct: 0, attempted: 0, minimum: 30, bp: bp(0.9) }), { budgetAtMinimum: 3, atMinimumCheckpoint: 3, checkpointStillReachable: true, beforeThresholdBreaks: 0 });
  assert.equal(mistakeAllowance({ correct: 19, attempted: 20, minimum: 30, bp: bp(0.9) }).atMinimumCheckpoint, 2);
  assert.equal(mistakeAllowance({ correct: 17, attempted: 20, minimum: 30, bp: bp(0.9) }).atMinimumCheckpoint, 0);
  assert.equal(mistakeAllowance({ correct: 21, attempted: 25, minimum: 30, bp: bp(0.9) }).checkpointStillReachable, false, 'four misses exceed a budget of three: the checkpoint needs recovery past the minimum');
  assert.equal(mistakeAllowance({ correct: 27, attempted: 30, minimum: 30, bp: bp(0.9) }).atMinimumCheckpoint, 0);
  assert.equal(mistakeAllowance({ correct: 30, attempted: 31, minimum: 30, bp: bp(0.9) }).atMinimumCheckpoint, null, 'past the checkpoint the allowance is no longer defined');
  assert.equal(mistakeAllowance({ correct: 36, attempted: 36, minimum: 30, bp: bp(0.9) }).beforeThresholdBreaks, 4, '36/40 is 90%, so four misses fit');
  assert.equal(mistakeAllowance({ correct: 5, attempted: 10, minimum: 5, bp: bp(0) }).beforeThresholdBreaks, null);
  assert.equal(mistakeAllowance({ correct: 1, attempted: 1, minimum: 1, bp: bp(0.9) }).budgetAtMinimum, 0, 'a one-question minimum at 90% leaves no room for a mistake');
});

test('percent entry converts to the stored fraction without float noise and rejects bad values', () => {
  assert.equal(percentToFraction(95), 0.95);
  assert.equal(percentToFraction(90.5), 0.905);
  assert.equal(toBasisPoints(0.9), 9000);
  assert.throws(() => toBasisPoints(1.01), /fraction/);
  assert.throws(() => toBasisPoints(-0.1), /fraction/);
  assert.throws(() => toBasisPoints(0.123456), /decimal/);
  assert.throws(() => toBasisPoints('0.9'), /fraction/);
  assert.throws(() => percentToFraction(101), /between/);
  assert.equal(BP, 10000);
});

test('policy validation: legacy pathway policies stay valid, challenge fields are checked, errors are reported not thrown', () => {
  assert.ok(validateMasteryPolicy(provisionalPolicy).ok, 'the existing provisional policy is a valid mastery policy');
  const legacy = validateMasteryPolicy({ id: 'p', version: 1, provisional: false, label: 'x', minimumQuestions: 30, accuracy: 0.9, coverage: { 'integer-division': 2 }, scoreTarget: 3 });
  assert.ok(legacy.ok);
  assert.equal(legacy.policy.challenge.subskills[0].minCorrect, 2, 'legacy coverage becomes a subskill requirement');
  for (const [name, bad, path] of [
    ['version', basePolicy({ version: 0 }), 'version'],
    ['minimum', basePolicy({ minimumQuestions: 0 }), 'minimumQuestions'],
    ['fractional minimum', basePolicy({ minimumQuestions: 2.5 }), 'minimumQuestions'],
    ['accuracy above 1', basePolicy({ accuracy: 1.2 }), 'accuracy'],
    ['accuracy as percent', basePolicy({ accuracy: 90 }), 'accuracy'],
    ['unknown challenge schema', basePolicy({ challenge: { schema: 'other' } }), 'challenge.schema'],
    ['subskill correct above exposure', basePolicy({ challenge: { subskills: [{ id: 's', minExposure: 2, minCorrect: 3 }] } }), 'challenge.subskills[0].minCorrect'],
    ['duplicate subskill', basePolicy({ challenge: { subskills: [{ id: 's', minExposure: 2, minCorrect: 1 }, { id: 's', minExposure: 2, minCorrect: 1 }] } }), 'challenge.subskills[1].id'],
    ['difficulty correct above questions', basePolicy({ challenge: { difficulties: [{ difficulty: 'advanced', minQuestions: 3, minCorrect: 4 }] } }), 'challenge.difficulties[0].minCorrect'],
    ['unknown selector', basePolicy({ challenge: { subskills: [{ id: 's', minExposure: 1, minCorrect: 1, match: { colour: ['red'] } }] } }), 'challenge.subskills[0].match'],
    ['unscored rule', basePolicy({ challenge: { unscored: { skipped: 'ignore' } } }), 'challenge.unscored.skipped'],
    ['minimum correct', basePolicy({ challenge: { minimumCorrect: 0 } }), 'challenge.minimumCorrect'],
  ]) {
    const r = validateMasteryPolicy(bad);
    assert.equal(r.ok, false, name); assert.equal(r.policy, null);
    assert.ok(r.errors.some((e) => e.path === path), `${name}: expected an error at ${path}, got ${JSON.stringify(r.errors)}`);
  }
  assert.equal(validateMasteryPolicy(null).ok, false);
  assert.equal(validateMasteryPolicy([]).ok, false);
  assert.ok(validateMasteryPolicy(basePolicy({ minimumQuestions: 3 })).warnings.length, 'a tiny minimum is flagged');
});

test('a policy is a superset of the stored pathway policy: validatePathway and the pathway diff accept it unchanged', () => {
  const policy = validateMasteryPolicy(basePolicy({ id: 'policy:test-challenge', challenge: { families: { minDistinct: 2 } } })).policy;
  const p = newPathway();
  p.policies.push(toPathwayPolicy(policy));
  p.checkpoints[0].policyId = policy.id; p.checkpoints[0].policyVersion = 1;
  assert.ok(validatePathway(p, graph, { validateSessions: false, validateTargets: false }));
  const before = newPathway();
  assert.ok(diffPathways(before, p).some((c) => c.kind === 'policies'));
  assert.equal(policyForCheckpoint(p, p.checkpoints[0]).policy.challenge.families.minDistinct, 2);
  assert.equal(policyForCheckpoint(p, { policyId: 'nope', policyVersion: 1 }).ok, false);
  assert.deepEqual(toPathwayPolicy(validateMasteryPolicy(toPathwayPolicy(policy)).policy), toPathwayPolicy(policy), 'round trip is stable');
});

test('policy digest is stable under key order and changes when a requirement changes', () => {
  const a = validateMasteryPolicy(basePolicy()).policy, b = validateMasteryPolicy(JSON.parse(JSON.stringify(basePolicy()), (k, v) => v)).policy;
  assert.equal(policyDigest(a), policyDigest(b));
  assert.equal(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}');
  assert.notEqual(policyDigest(a), policyDigest(validateMasteryPolicy(basePolicy({ accuracy: 0.95 })).policy));
  assert.notEqual(policyDigest(a), policyDigest(validateMasteryPolicy(basePolicy({ challenge: { families: { minDistinct: 1 } } })).policy));
});

test('no mastery policy is attached to anything by default; examples and suggestions are inert', () => {
  assert.equal(graph.nodes.length, 290);
  assert.equal(graph.questionFamilies.length, 453);
  assert.ok(graph.nodes.every((n) => !('policy' in n) && !('policyId' in n) && !('masteryPolicy' in n)), 'the curriculum graph carries no policy');
  const p = newPathway();
  assert.deepEqual(p.policies.map((x) => x.id), ['policy:provisional']);
  assert.ok(p.checkpoints.every((c) => c.policyId === 'policy:provisional'));
  assert.ok(!isChallengeConfigured(validateMasteryPolicy(provisionalPolicy).policy));
  for (const e of EXAMPLE_POLICIES) { assert.equal(e.exampleOnly, true); assert.match(e.label, /^EXAMPLE ONLY/); }
  for (const s of suggestedConfigurations) {
    assert.equal(s.executable, false);
    const r = validateMasteryPolicy(s);
    assert.equal(r.ok, false, 'a suggestion must not validate as an executable policy');
  }
  for (const s of suggestedConfigurations) assert.notEqual(s.accuracy, 0.8), assert.notEqual(s.accuracy, 0.85);
  const cov = summarizeSuggestionCoverage(graph);
  assert.equal(Object.values(cov).flatMap((x) => Object.values(x)).reduce((a, b) => a + b, 0), 290);
});

test('engine sources are pure: no clock, randomness, network, storage or environment access', () => {
  const dir = new URL('../mastery/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mjs'))) {
    const src = fs.readFileSync(new URL(f, dir), 'utf8');
    for (const banned of [/Date\.now\(/, /new Date\(\)/, /Math\.random/, /\bfetch\(/, /process\.env/, /localStorage/, /sessionStorage/, /XMLHttpRequest/]) assert.ok(!banned.test(src), `${f} must not use ${banned}`);
  }
});
