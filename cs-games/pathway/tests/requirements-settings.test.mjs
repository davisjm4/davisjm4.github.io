// Teacher-controlled mastery requirements: what a teacher types (percentages, whole numbers), how it is checked, explained and preset.
import test from 'node:test';
import assert from 'node:assert/strict';
import { R, graph, classPathway, ctxFor, pct, must, policyById, checkpointOf } from './lib/requirements-fixtures.mjs';
import { toBasisPoints, minCorrectFor, fractionToPercent } from '../mastery/arithmetic.mjs';
import { suggestedConfigurations } from '../mastery/suggestions.mjs';

// ---- percent entry --------------------------------------------------------------------------------------------------
test('percent entry: 95, 95% and " 92.5 % " are percentages and become exact fractions', () => {
  for (const [text, percent, bp] of [['95', 95, 9500], ['95%', 95, 9500], [' 92.5 % ', 92.5, 9250], ['90', 90, 9000], ['100', 100, 10000], ['1', 1, 100], ['99.99', 99.99, 9999], [95, 95, 9500]]) {
    const r = R.parsePercent(text);
    assert.equal(r.ok, true, String(text));
    assert.equal(r.percent, percent);
    assert.equal(toBasisPoints(r.fraction), bp, `${text} must be exactly ${bp} basis points, with no floating-point noise`);
  }
});

test('percent entry: every percentage from 1.00 to 100.00 in steps of 0.01 converts exactly (no float noise at any value)', () => {
  for (let bp = 100; bp <= 10000; bp++) {
    const text = (bp / 100).toFixed(2);
    const r = R.parsePercent(text);
    assert.equal(r.ok, true, text);
    assert.equal(toBasisPoints(r.fraction), bp, `${text}%`);
    assert.equal(fractionToPercent(r.fraction), bp / 100, `${text}% displays back as typed`);
  }
});

test('percent entry: 0.90 and 0.95 are refused rather than silently meaning 0.9% or 0.95%', () => {
  for (const text of ['0.90', '0.95', '0.9', '.9', '0']) {
    const r = R.parsePercent(text);
    assert.equal(r.ok, false, text);
    assert.match(r.error, /percentage|digits/i, text);
  }
  assert.match(R.parsePercent('0.90').error, /not a fraction like 0\.90/);
});

test('percent entry: out-of-range, malformed and over-precise entries are refused with a plain message', () => {
  for (const text of ['101', '100.01', '1000', '-5', 'abc', '', '   ', '9e1', '90..1', '9 0', 'ninety', '90.123', '90.001']) {
    const r = R.parsePercent(text);
    assert.equal(r.ok, false, JSON.stringify(text));
    assert.ok(typeof r.error === 'string' && r.error.length > 10 && !/undefined|NaN|\[object/.test(r.error), JSON.stringify(text));
  }
  assert.equal(R.parsePercent(null).ok, false); assert.equal(R.parsePercent(undefined).ok, false);
  for (const text of ['101', '100.01', '250']) assert.match(R.parsePercent(text).error, /Accuracy cannot be more than 100%/, 'a too-large percentage gets the clear message, not a generic one');
  assert.match(R.parsePercent('90.123').error, /at most two decimal places/);
});

test('whole-number entry accepts 30 and refuses 30.5, -3, 1e2, blanks, zero and absurdly large values', () => {
  assert.deepEqual(R.parseWholeNumber('30'), { ok: true, value: 30 });
  assert.deepEqual(R.parseWholeNumber(' 30 '), { ok: true, value: 30 });
  for (const text of ['30.5', '-3', '1e2', '', '  ', 'thirty', '3 0', '0', '1001', '99999999999']) assert.equal(R.parseWholeNumber(text).ok, false, JSON.stringify(text));
  assert.equal(R.parseWholeNumber('0', { min: 0 }).ok, true);
  assert.match(R.parseWholeNumber('30.5', { label: 'Minimum questions' }).error, /Minimum questions must be a whole number/);
});

// ---- validation -----------------------------------------------------------------------------------------------------
test('validation: a valid class default passes, and the typed 95 is stored as the fraction 0.95', () => {
  const v = R.validateSettings({ minimumQuestions: 50, accuracy: pct(95) }, { level: 'class' });
  assert.deepEqual(v, { ok: true, errors: [], warnings: [] });
});

test('validation: invalid numbers are reported per field, never thrown', () => {
  const bad = [
    [{ minimumQuestions: 0 }, 'minimumQuestions'], [{ minimumQuestions: 1.5 }, 'minimumQuestions'], [{ minimumQuestions: -4 }, 'minimumQuestions'], [{ minimumQuestions: 1001 }, 'minimumQuestions'],
    [{ minimumQuestions: '30' }, 'minimumQuestions'],
    [{ accuracy: 0.009 }, 'accuracy'], [{ accuracy: 1.5 }, 'accuracy'], [{ accuracy: -0.1 }, 'accuracy'], [{ accuracy: 0.123456 }, 'accuracy'], [{ accuracy: Number.NaN }, 'accuracy'],
    [{ minimumCorrect: 0 }, 'minimumCorrect'], [{ minimumCorrect: 2.5 }, 'minimumCorrect'],
    [{ families: { minDistinct: 51 } }, 'families'], [{ families: { minDistinct: -1 } }, 'families'], [{ families: null }, 'families'], [{ families: { minDistinct: 3, minCorrectEach: 0 } }, 'families'],
    [{ difficulties: 'advanced' }, 'difficulties'], [{ difficulties: [{ difficulty: '', minQuestions: 5 }] }, 'difficulties'],
    [{ difficulties: [{ difficulty: 'advanced', minQuestions: 5 }, { difficulty: 'Advanced', minQuestions: 6 }] }, 'difficulties'],
    [{ difficulties: [{ difficulty: 'advanced', minQuestions: 5, minCorrect: 9 }] }, 'difficulties'],
    [{ unscored: { assisted: 'maybe', skipped: 'incorrect', revealed: 'incorrect' } }, 'unscored'],
    [{ requiredForAreaCompletion: 'yes' }, 'requiredForAreaCompletion'],
    [{ staleAfterDays: 0 }, 'staleAfterDays'], [{ staleAfterDays: 3651 }, 'staleAfterDays'],
    [{ colour: 'blue' }, 'colour'],
  ];
  for (const [settings, field] of bad) {
    const v = R.validateSettings(settings, { level: 'area' });
    assert.equal(v.ok, false, JSON.stringify(settings));
    assert.ok(v.errors.some((e) => e.field === field), `${JSON.stringify(settings)} should name ${field}: ${JSON.stringify(v.errors)}`);
    assert.ok(v.errors.every((e) => e.message.length > 10 && !/undefined|NaN/.test(e.message)));
  }
  assert.doesNotThrow(() => R.validateSettings(null)); assert.doesNotThrow(() => R.validateSettings(undefined)); assert.doesNotThrow(() => R.validateSettings({ accuracy: 'x' }));
});

test('validation: class defaults need both numbers; an area or skill may set one and inherit the other', () => {
  for (const one of [{ minimumQuestions: 30 }, { accuracy: pct(90) }]) {
    assert.equal(R.validateSettings(one, { level: 'class' }).ok, false);
    assert.equal(R.validateSettings(one, { level: 'area' }).ok, true);
    assert.equal(R.validateSettings(one, { level: 'skill' }).ok, true);
  }
});

test('validation: essential topics belong to one skill, so class and area levels refuse them', () => {
  const topics = [{ id: 'integer', label: 'Integer division', match: { familyIds: ['division:integer'] }, minExposure: 3, minCorrect: 3 }];
  assert.equal(R.validateSettings({ subskills: topics }, { level: 'class' }).ok, false);
  assert.equal(R.validateSettings({ subskills: topics }, { level: 'area' }).ok, false);
  assert.equal(R.validateSettings({ subskills: topics }, { level: 'skill' }).ok, true);
  assert.equal(R.validateSettings({ subskills: [] }, { level: 'area' }).ok, true, 'clearing them is always fine');
});

test('validation: warnings explain consequences without blocking (100% accuracy; minimum correct above the question minimum)', () => {
  const a = R.validateSettings({ minimumQuestions: 20, accuracy: pct(100) }, { level: 'class' });
  assert.equal(a.ok, true); assert.ok(a.warnings.some((w) => w.field === 'accuracy' && /restart/i.test(w.message)));
  const b = R.validateSettings({ minimumQuestions: 20, accuracy: pct(90), minimumCorrect: 25 }, { level: 'class' });
  assert.equal(b.ok, true); assert.ok(b.warnings.some((w) => w.field === 'minimumCorrect' && /more than the 20 question minimum/.test(w.message)));
});

// ---- the numbers a teacher is shown ---------------------------------------------------------------------------------
test('live explanation: the example sentences are exactly the ones the teacher asked for', () => {
  const e = R.explainRequirement({ minimumQuestions: 50, accuracy: pct(95), ...bareExtras() });
  assert.equal(e.complete, true);
  assert.equal(e.lines[0], 'Students must answer at least 50 questions with at least 95% first-attempt accuracy.');
  assert.equal(e.lines[1], 'At 50 questions, students need at least 48 correct answers.');
  assert.equal(e.lines[2], 'That allows up to 2 mistakes in the first 50.');
  assert.equal(e.lines[3], 'Students may answer more than 50 questions to improve their accuracy.', 'students are told they can answer more than the minimum');
  assert.equal(e.correctNeededAtMinimum, 48); assert.equal(e.mistakesAllowedAtMinimum, 2);
});

function bareExtras() { return { minimumCorrect: null, difficulties: [], subskills: [], families: { minDistinct: 0, minCorrectEach: 1 }, unscored: { assisted: 'incorrect', skipped: 'incorrect', revealed: 'incorrect' } }; }

test('explanations show the engine arithmetic for the common settings in the teacher decision table', () => {
  // [minimum questions, percent, correct needed, mistakes allowed]
  for (const [q, p, need, miss] of [[10, 90, 9, 1], [10, 95, 10, 0], [15, 90, 14, 1], [20, 90, 18, 2], [20, 95, 19, 1], [25, 90, 23, 2], [25, 95, 24, 1], [30, 90, 27, 3], [30, 95, 29, 1], [40, 90, 36, 4], [40, 95, 38, 2], [50, 90, 45, 5], [50, 95, 48, 2]]) {
    const e = R.explainRequirement({ minimumQuestions: q, accuracy: pct(p), ...bareExtras() });
    assert.equal(e.correctNeededAtMinimum, need, `${q} at ${p}%`);
    assert.equal(e.mistakesAllowedAtMinimum, miss, `${q} at ${p}%`);
    assert.ok(e.lines[1].includes(`at least ${need} correct answer`), e.lines[1]);
  }
});

test('explanations agree with an independent integer calculation for every question count up to 250 at several percentages', () => {
  for (const p of [50, 75, 80, 85, 90, 92.5, 95, 97, 99, 99.99, 100]) {
    const bp = Math.round(p * 100);
    for (let q = 1; q <= 250; q++) {
      let c = 0; while (c * 10000 < bp * q) c++; // smallest c with c/q >= p%, using integers only
      const e = R.explainRequirement({ minimumQuestions: q, accuracy: pct(p), ...bareExtras() });
      assert.equal(e.correctNeededAtMinimum, c, `${q} at ${p}%`);
      assert.equal(minCorrectFor(q, bp), c);
      assert.equal(e.mistakesAllowedAtMinimum, q - c);
    }
  }
});

test('explanations use correct singular and plural wording and never print raw numbers like 0.9', () => {
  const one = R.explainRequirement({ minimumQuestions: 1, accuracy: pct(100), ...bareExtras() });
  assert.match(one.text, /at least 1 question with/); assert.match(one.text, /at least 1 correct answer\./);
  const e = R.explainRequirement({ minimumQuestions: 30, accuracy: pct(90), ...bareExtras() });
  assert.doesNotMatch(e.text, /0\.9\b/); assert.match(e.text, /90%/);
  const half = R.explainRequirement({ minimumQuestions: 40, accuracy: pct(92.5), ...bareExtras() });
  assert.match(half.text, /92\.5%/);
});

test('explanations for an optional minimum correct say both requirements must be met', () => {
  const extra = R.explainRequirement({ minimumQuestions: 30, accuracy: pct(90), ...bareExtras(), minimumCorrect: 28 });
  assert.match(extra.text, /at least 28 correct answers in total, which is more than the accuracy rule alone asks for/); assert.match(extra.text, /Both requirements must be met/);
  const larger = R.explainRequirement({ minimumQuestions: 30, accuracy: pct(90), ...bareExtras(), minimumCorrect: 40 });
  assert.match(larger.text, /they will answer at least 40 questions/, 'a minimum correct above the minimum questions raises the questions needed');
  const same = R.explainRequirement({ minimumQuestions: 30, accuracy: pct(90), ...bareExtras(), minimumCorrect: 20 });
  assert.doesNotMatch(same.text, /more than the accuracy rule alone/, 'a minimum correct below the accuracy rule changes nothing');
});

test('explanations for 100% and for an incomplete requirement are honest', () => {
  const full = R.explainRequirement({ minimumQuestions: 20, accuracy: pct(100), ...bareExtras() });
  assert.match(full.text, /would need to restart/); assert.match(full.text, /history/);
  const none = R.explainRequirement({ minimumQuestions: null, accuracy: null, ...bareExtras() });
  assert.equal(none.complete, false); assert.match(none.text, /No practice requirement is set yet/);
  assert.equal(R.explainRequirement({ minimumQuestions: 30, accuracy: null }).complete, false);
  assert.equal(R.explainRequirement(null).complete, false);
});

test('advanced rules are explained in words: difficulty, variety, essential topics and skipped questions', () => {
  const e = R.explainRequirement({
    minimumQuestions: 20, accuracy: pct(90), minimumCorrect: null,
    difficulties: [{ difficulty: 'advanced', minQuestions: 8, minCorrect: 7 }], families: { minDistinct: 5, minCorrectEach: 2 },
    subskills: [{ id: 's', label: 'Row sums', match: { familyIds: ['row-sum'] }, minExposure: 3, minCorrect: 2, minAccuracy: null }],
    unscored: { assisted: 'excluded', skipped: 'incorrect', revealed: 'incorrect', maxExcludedShare: 0.1 },
  });
  assert.match(e.text, /At least 8 Advanced questions, with at least 7 correct/);
  assert.match(e.text, /at least 5 different kinds of question, at least 2 correct in each kind/);
  assert.match(e.text, /Essential topics: Row sums/);
  assert.match(e.text, /left out of the count, up to 10%/);
  assert.doesNotMatch(e.text, /node:|policy:/);
});

test('counting rules are plain sentences that state the semantics the teacher specified', () => {
  assert.equal(R.COUNTING_RULES.length, 6);
  const all = R.COUNTING_RULES.join(' ');
  assert.match(all, /first answer/); assert.match(all, /stays in the total/); assert.match(all, /Mixed Practice/); assert.match(all, /never counted as correct/);
  assert.match(all, /both must be met/); assert.match(all, /keep answering past the minimum/); assert.match(all, /separate from the 0 to 4 standards score/);
});

// ---- presets --------------------------------------------------------------------------------------------------------
test('presets: Quick Recognition, Standard Practice, Complex Reasoning and Custom, with the numbers from the single list of suggestions', () => {
  assert.deepEqual(R.PRESETS.map((p) => p.label), ['Quick recognition', 'Standard practice', 'Complex reasoning', 'Custom']);
  const byId = Object.fromEntries(R.PRESETS.map((p) => [p.id, p]));
  assert.deepEqual([byId['quick-recognition'].minimumQuestions, byId['quick-recognition'].accuracyPercent], [50, 95]);
  assert.deepEqual([byId['standard-practice'].minimumQuestions, byId['standard-practice'].accuracyPercent], [30, 90]);
  assert.deepEqual([byId['complex-reasoning'].minimumQuestions, byId['complex-reasoning'].accuracyPercent], [20, 90]);
  assert.equal(byId.custom.minimumQuestions, null);
  for (const s of suggestedConfigurations) { // the presets restate the suggestions, they do not hold a second copy
    const p = byId[s.tier]; assert.ok(p, s.tier); assert.equal(p.minimumQuestions, s.minimumQuestions); assert.equal(p.accuracyPercent, fractionToPercent(s.accuracy));
    assert.equal(s.executable, false, 'the engine still refuses the inert suggestions; only a teacher-saved policy is real');
  }
});

test('presets are starting points: they fill editable numbers, say they are not calibrated, and Custom clears nothing', () => {
  assert.match(R.PRESET_NOTICE, /starting points/); assert.match(R.PRESET_NOTICE, /not been calibrated/); assert.match(R.PRESET_NOTICE, /change any number/);
  assert.deepEqual(R.presetSettings('standard-practice'), { minimumQuestions: 30, accuracy: 0.9 });
  assert.deepEqual(R.presetSettings('quick-recognition'), { minimumQuestions: 50, accuracy: 0.95 });
  assert.deepEqual(R.presetSettings('custom'), {}); assert.deepEqual(R.presetSettings('nope'), {});
});

test('presets: the label follows the numbers exactly, so editing a number turns the preset into Custom', () => {
  assert.equal(R.presetFor({ minimumQuestions: 50, accuracy: pct(95) }), 'quick-recognition');
  assert.equal(R.presetFor({ minimumQuestions: 30, accuracy: pct(90) }), 'standard-practice');
  assert.equal(R.presetFor({ minimumQuestions: 20, accuracy: pct(90) }), 'complex-reasoning');
  assert.equal(R.presetFor({ minimumQuestions: 51, accuracy: pct(95) }), 'custom');
  assert.equal(R.presetFor({ minimumQuestions: 50, accuracy: pct(94.9) }), 'custom');
  assert.equal(R.presetFor({ minimumQuestions: null, accuracy: null }), 'custom'); assert.equal(R.presetFor(null), 'custom');
});

test('presets: applying one stores an ordinary teacher policy marked as teacher-defined, referring to no suggestion id', () => {
  let p = classPathway();
  p = must(R.applyToClass(p, R.presetSettings('standard-practice'), ctxFor()));
  const pol = policyById(p, R.CLASS_POLICY_ID);
  assert.equal(pol.requirementSource.preset, 'standard-practice');
  assert.equal(pol.calibration, 'teacher-defined; not system-calibrated');
  assert.equal(pol.minimumQuestions, 30); assert.equal(pol.accuracy, 0.9);
  assert.equal(JSON.stringify(p).includes('example:'), false, 'no example or suggested policy id leaks into a class pathway');
  assert.notEqual(pol.id, 'policy:provisional');
});

test('presets: changing a number after choosing a preset is a custom setting, never a hidden preset', () => {
  let p = classPathway();
  p = must(R.applyToClass(p, { minimumQuestions: 30, accuracy: pct(90) }, ctxFor()));
  p = must(R.applyToClass(p, { minimumQuestions: 35 }, ctxFor()));
  assert.equal(policyById(p, R.CLASS_POLICY_ID).requirementSource.preset, 'custom');
  assert.equal(checkpointOf(p, 'node:advanced:variable-lab:trace').policyId, R.CLASS_POLICY_ID);
});
