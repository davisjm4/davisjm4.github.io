// Teacher-controlled mastery requirements and the mastery engine: the numbers a teacher previews are the numbers a student is measured
// against, in focused and Mixed Practice, in different classes, and without ever producing a standards score or an official award.
import test from 'node:test';
import assert from 'node:assert/strict';
import { R, graph, classPathway, ctxFor, pct, must, resolved, policyById, AREA, NODE, MATH_NODES, NOW } from './lib/requirements-fixtures.mjs';
import { run, mixed, families, answer } from './lib/mastery-fixtures.mjs';
import { pathwayProgress } from '../mastery/index.mjs';
import * as masteryIndex from '../mastery/index.mjs';
import { minCorrectFor } from '../mastery/arithmetic.mjs';

const MOD = NODE.modulus;
const progressFor = (pathway, raw, { profileId = 'student-1', now = NOW } = {}) => pathwayProgress({ graph, pathway, profileId, rawEvents: raw, now });
const nodeOf = (out, id = MOD) => out.nodes.find((n) => n.nodeId === id);
const classWith = (q, a, extra = {}) => must(R.applyToClass(classPathway(), { minimumQuestions: q, accuracy: pct(a), ...extra }, ctxFor()));
/** `count` modulus answers where exactly `correct` are right, the wrong ones first. */
const modulus = (count, correct, over = {}) => run({ mode: 'modulus', count, results: (i) => i >= count - correct, ...over });
const mixedPlan = () => MATH_NODES.map((id) => ({ assessedMode: id.split(':').pop(), families: families(id) }));

// ---- teacher settings are the thresholds the engine applies -----------------------------------------------------------------
test('a requirement the teacher saved is the one the engine measures: the progress object reports exactly those numbers', () => {
  const out = progressFor(classWith(50, 95), modulus(10, 10));
  const n = nodeOf(out);
  assert.equal(n.requirements.minimumQuestions, 50); assert.equal(n.requirements.requiredAccuracyPercent, 95); assert.equal(n.requirements.correctNeededAtMinimum, 48);
  assert.equal(n.policy.configured, true); assert.equal(n.status, 'in-progress');
  assert.equal(n.remaining.questions, 40);
  assert.deepEqual(out.problems, []);
});

test('boundaries at several settings: the exact required correct count meets it, one fewer does not (teacher table = engine)', () => {
  for (const [q, p, minCorrect] of [[10, 90, null], [20, 90, null], [20, 95, null], [30, 90, null], [30, 95, null], [50, 90, null], [50, 95, null], [40, 92.5, null], [30, 90, 28], [25, 80, null]]) {
    const pathway = classWith(q, p, minCorrect ? { minimumCorrect: minCorrect } : {});
    const e = R.explainRequirement(resolved(pathway, MOD).effective);
    const need = Math.max(e.correctNeededAtMinimum, minCorrect ?? 0);
    assert.equal(e.correctNeededAtMinimum, minCorrectFor(q, Math.round(p * 100)));
    const met = nodeOf(progressFor(pathway, modulus(q, need)));
    assert.equal(met.status, 'requirements-met', `${q} at ${p}% with exactly ${need} correct`);
    assert.equal(met.requirements.correctNeededAtMinimum, need, 'the engine reports the same number the teacher was shown');
    const short = nodeOf(progressFor(pathway, modulus(q, need - 1)));
    assert.notEqual(short.status, 'requirements-met', `${q} at ${p}% with ${need - 1} correct`);
    assert.equal(short.attemptStatus, 'requirements-not-yet-met');
  }
});

test('incorrect first attempts stay in the denominator: wrong answers lower accuracy and a retry cannot repair them', () => {
  const pathway = classWith(30, 90);
  const first = modulus(30, 26);
  const withRetries = [...first, ...first.filter((e) => e.correct === false).map((e) => ({ ...e, id: `${e.questionId}:2`, attempt: 2, correct: true, occurred: e.occurred + 30000 }))];
  const a = nodeOf(progressFor(pathway, first)), b = nodeOf(progressFor(pathway, withRetries));
  assert.equal(a.attempt.attempted, 30); assert.equal(a.attempt.correct, 26); assert.equal(a.status, 'in-progress');
  assert.equal(b.attempt.correct, 26, 'a correct retry adds no credit'); assert.equal(b.attempt.attempted, 30); assert.equal(b.status, 'in-progress');
});

test('students may answer more than the minimum to improve accuracy, and the same attempt continues until it is met', () => {
  const pathway = classWith(30, 90);
  const raw = (extraCorrect) => [...modulus(30, 25, { session: 'a' }).slice(0), ...run({ mode: 'modulus', count: extraCorrect, results: [true], session: 'b', start: { n: 1, at: 100 } })];
  const at30 = nodeOf(progressFor(pathway, raw(0)));
  assert.equal(at30.status, 'in-progress'); assert.equal(at30.recovery.additionalCorrectForAccuracy, 20, '25 of 30 at 90% recovers with 20 more correct answers');
  assert.equal(at30.recovery.guaranteesRequirementsMet, false);
  assert.equal(nodeOf(progressFor(pathway, raw(19))).status, 'in-progress', 'one short of the 20');
  const done = nodeOf(progressFor(pathway, raw(20)));
  assert.equal(done.status, 'requirements-met'); assert.equal(done.attempt.attempted, 50); assert.equal(done.attempt.correct, 45);
  assert.equal(done.lifetime.restarts, 0, 'no restart was needed');
});

test('a minimum number of correct answers is required in addition to the accuracy, and can exceed the question minimum', () => {
  const pathway = classWith(30, 90, { minimumCorrect: 40 });
  const e = R.explainRequirement(resolved(pathway, MOD).effective);
  assert.match(e.text, /they will answer at least 40 questions/);
  const thirty = nodeOf(progressFor(pathway, modulus(30, 30)));
  assert.equal(thirty.status, 'in-progress', '30 of 30 satisfies the accuracy and the question minimum but not the 40 correct');
  assert.ok(thirty.diagnostics.includes('INSUFFICIENT_CORRECT') || thirty.diagnostics.some((d) => d.code === 'INSUFFICIENT_CORRECT'));
  assert.equal(nodeOf(progressFor(pathway, modulus(40, 40))).status, 'requirements-met');
  assert.equal(nodeOf(progressFor(pathway, modulus(41, 39))).status, 'in-progress', '39 correct is under 40 even though accuracy is above 90%');
});

test('skipped, revealed and hinted answers follow the teacher\'s explicit rule: by default they stay in the denominator as not correct', () => {
  const pathway = classWith(20, 95);
  // the hinted answers come first: once a student has met the requirement the attempt is complete and later answers do not reopen it
  const hinted = (count) => run({ mode: 'modulus', count, results: [true], session: 'h' }).map((e) => ({ ...e, assisted: true }));
  const later = () => modulus(20, 20, { session: 'a', start: { n: 1, at: 200 } });
  const raw = [...hinted(2), ...later()];
  const byDefault = nodeOf(progressFor(pathway, raw));
  assert.equal(byDefault.attempt.attempted, 22); assert.equal(byDefault.attempt.correct, 20);
  assert.equal(byDefault.status, 'in-progress', '20 of 22 is 90.9%, under the required 95%');
  const lenient = must(R.applyToClass(pathway, { unscored: { assisted: 'excluded', skipped: 'incorrect', revealed: 'incorrect', maxExcludedShare: 0.1 } }, ctxFor()));
  const left = nodeOf(progressFor(lenient, raw));
  assert.equal(left.attempt.attempted, 20, 'the two hinted answers are left out of the count');
  assert.equal(left.status, 'requirements-met');
  const tooMany = nodeOf(progressFor(lenient, [...hinted(6), ...later()]));
  assert.notEqual(tooMany.status, 'requirements-met', 'leaving out is capped, so it cannot be used to avoid every hard question');
});

test('accuracy is never rounded up: 94.9% is shown as 94.9% and does not meet 95%', () => {
  const pathway = classWith(1000, 95);
  const short = nodeOf(progressFor(pathway, modulus(1000, 949)));
  assert.equal(short.status, 'in-progress'); assert.equal(short.attempt.accuracyPercent, 94.9);
  assert.equal(R.studentRequirementView(short).progress.accuracyLabel, '94.9%');
  assert.equal(nodeOf(progressFor(pathway, modulus(1000, 950))).status, 'requirements-met');
});

// ---- Mixed Practice -------------------------------------------------------------------------------------------------------
test('Mixed Practice counts toward each skill from the question shown, once, alongside focused practice', () => {
  const pathway = must(R.applyToAreas(classWith(30, 90), [AREA.math], { minimumQuestions: 10, accuracy: pct(90) }, ctxFor()));
  const { events } = mixed({ student: 'm', session: 'mx', rounds: 10, plan: mixedPlan(), results: [true] });
  assert.equal(events.length, 70); assert.ok(events.every((e) => e.mode === 'mixed'), 'the page asked for Mixed; each answer still reports the question actually shown');
  const out = progressFor(pathway, events);
  for (const id of MATH_NODES) { const n = nodeOf(out, id); assert.equal(n.attempt.attempted, 10, id); assert.equal(n.status, 'requirements-met', id); }
  const area = out.areas.find((a) => a.areaId === AREA.math);
  assert.equal(area.label, '7 of 7 skills complete'); assert.equal(area.qualified, true); assert.equal(area.verified, false);
  assert.equal(nodeOf(out, 'node:advanced:variable-lab:trace').attempt?.attempted ?? 0, 0, 'Mixed Practice credits nothing outside the skills it showed');
  // focused plus Mixed feed one count
  const half = mixed({ student: 'm', session: 'mx2', rounds: 5, plan: mixedPlan(), results: [true] }).events;
  const focused = run({ mode: 'division', count: 5, results: [true], session: 'f' });
  assert.equal(nodeOf(progressFor(pathway, [...half, ...focused]), NODE.division).attempt.attempted, 10);
  assert.equal(nodeOf(progressFor(pathway, [...half, ...focused]), NODE.division).status, 'requirements-met');
});

test('a Mixed answer is credited exactly once even when the same event arrives twice', () => {
  const pathway = must(R.applyToAreas(classWith(30, 90), [AREA.math], { minimumQuestions: 10, accuracy: pct(90) }, ctxFor()));
  const { events } = mixed({ student: 'm', session: 'mx', rounds: 5, plan: mixedPlan(), results: [true] });
  const out = progressFor(pathway, [...events, ...events]);
  for (const id of MATH_NODES) assert.equal(nodeOf(out, id).attempt.attempted, 5);
});

// ---- classes --------------------------------------------------------------------------------------------------------------
test('the same practice meets one class\'s requirement and not another\'s, because each class has its own thresholds', () => {
  const a = classWith(30, 90), b = (() => { const p = classPathway({ id: 'pb', classId: 'class-b', title: 'Period 5' }); return must(R.applyToClass(p, { minimumQuestions: 20, accuracy: pct(95) }, ctxFor())); })();
  const raw = modulus(30, 28);
  assert.equal(nodeOf(progressFor(a, raw)).status, 'requirements-met', '28 of 30 is 93.3%, enough for 90%');
  assert.equal(nodeOf(progressFor(b, raw)).status, 'in-progress', '28 of 30 is 93.3%, not enough for 95%');
  const rawB = modulus(20, 19);
  assert.equal(nodeOf(progressFor(b, rawB)).status, 'requirements-met', '19 of 20 is exactly 95%');
  assert.equal(nodeOf(progressFor(a, rawB)).status, 'in-progress', 'only 20 questions answered against a 30 question minimum');
});

test('a skill override changes only that skill\'s measurement', () => {
  const pathway = must(R.applyToSkills(classWith(30, 90), [MOD], { minimumQuestions: 10, accuracy: pct(80) }, ctxFor()));
  const raw = [...modulus(10, 8, { session: 'm' }), ...run({ mode: 'division', count: 10, results: (i) => i < 8, session: 'd' })];
  const out = progressFor(pathway, raw);
  assert.equal(nodeOf(out, MOD).status, 'requirements-met', '8 of 10 at 80%');
  assert.equal(nodeOf(out, NODE.division).status, 'in-progress', 'division still has the class defaults of 30 at 90%');
});

test('changing a requirement after students have practiced does not erase their evidence or their earlier result', () => {
  const v1 = classWith(10, 90);
  const raw = modulus(10, 10);
  const first = progressFor(v1, raw), met = nodeOf(first);
  assert.equal(met.status, 'requirements-met');
  const draftPublished = { ...v1, revision: 1 };
  const v2 = must(R.applyToClass(v1, { minimumQuestions: 20, accuracy: pct(95) }, ctxFor({ published: draftPublished })));
  const second = progressFor(v2, raw);
  const n = nodeOf(second);
  assert.equal(n.lifetime.questionsAnswered, 10, 'the student\'s evidence is intact');
  assert.equal(n.requirements.minimumQuestions, 20, 'they are now measured against the new requirement');
  assert.deepEqual(second.problems, []);
});

test('a teacher can restore a skill to inherited and the engine follows without any other change', () => {
  let pathway = must(R.applyToSkills(classWith(30, 90), [MOD], { minimumQuestions: 10 }, ctxFor()));
  const raw = modulus(10, 10);
  assert.equal(nodeOf(progressFor(pathway, raw)).status, 'requirements-met');
  pathway = must(R.resetToInherited(pathway, { level: 'skill', ids: [MOD] }, ctxFor()));
  assert.equal(nodeOf(progressFor(pathway, raw)).status, 'in-progress');
  assert.equal(nodeOf(progressFor(pathway, raw)).requirements.minimumQuestions, 30);
});

// ---- the teacher preview ------------------------------------------------------------------------------------------------------
test('the teacher\'s preview runs real answers through the real engine: 50 at 95% shows 0, partway, 47 of 50, and 48 of 50', () => {
  const effective = resolved(classWith(50, 95), MOD).effective;
  const preview = R.previewStudentStates({ effective, title: 'Modulus', graph });
  assert.deepEqual(preview.states.map((s) => [s.answered, s.correct]), [[0, 0], [20, 20], [50, 47], [50, 48]]);
  assert.deepEqual(preview.states.map((s) => s.view.status), ['not-started', 'in-progress', 'in-progress', 'requirements-met']);
  assert.deepEqual(preview.simulated, ['question count', 'accuracy']);
  assert.equal(preview.states[0].view.progress.accuracyLabel, 'No answers yet');
  assert.equal(preview.states[2].view.progress.accuracyLabel, '94%');
  assert.equal(preview.states[3].view.progress.accuracyLabel, '96%');
  assert.equal(preview.states[3].view.milestoneNote, 'This is a practice milestone. It becomes official mastery only after it is verified.');
});

test('the preview and a real student agree: the "just met" sample is exactly the engine\'s threshold, for every preset and a minimum-correct case', () => {
  for (const extra of [{}, { minimumCorrect: 45 }]) {
    for (const preset of ['quick-recognition', 'standard-practice', 'complex-reasoning']) {
      const pathway = must(R.applyToClass(classPathway(), { ...R.presetSettings(preset), ...extra }, ctxFor()));
      const effective = resolved(pathway, MOD).effective;
      const sample = R.previewStudentStates({ effective, title: 'Modulus', graph }).states.at(-1);
      const real = nodeOf(progressFor(pathway, modulus(sample.answered, sample.correct)));
      assert.equal(sample.view.status, 'requirements-met', preset);
      assert.equal(real.status, 'requirements-met', `${preset}: a real student with the sample's answers meets it`);
      assert.equal(real.attempt.attempted, sample.answered); assert.equal(real.attempt.correct, sample.correct);
      const oneFewer = nodeOf(progressFor(pathway, modulus(sample.answered, sample.correct - 1)));
      assert.notEqual(oneFewer.status, 'requirements-met', `${preset}: one fewer correct is not enough`);
    }
  }
});

test('the preview says what it does not simulate, and refuses to guess for an incomplete requirement', () => {
  const withRules = resolved(must(R.applyToSkills(classWith(30, 90), [NODE.trace2d], { families: { minDistinct: 5, minCorrectEach: 1 } }, ctxFor())), NODE.trace2d).effective;
  assert.match(R.previewStudentStates({ effective: withRules, title: 'Trace', graph }).note, /Topic, difficulty and variety rules are shown to students only when they are working on them/);
  const none = R.previewStudentStates({ effective: resolved(classPathway(), MOD).effective, title: 'Modulus', graph });
  assert.deepEqual(none.states, []); assert.match(none.note, /Set a minimum number of questions and a required accuracy/);
});

// ---- the student display contract ----------------------------------------------------------------------------------------------
test('student view contract: the headline, the "keep going" note and the Mixed note come from the saved requirement', () => {
  const out = progressFor(classWith(30, 90), modulus(24, 22));
  const v = R.studentRequirementView(nodeOf(out));
  assert.equal(v.schema, 'cs-games.student-requirement-view/1'); assert.equal(R.STUDENT_VIEW_SCHEMA, v.schema);
  assert.equal(v.title, 'Modulus'); assert.equal(v.status, 'in-progress'); assert.equal(v.statusLabel, 'In progress');
  assert.equal(v.requirement.headline, 'Answer at least 30 questions with at least 90% right on the first try.');
  assert.equal(v.requirement.keepGoing, 'You can answer more than 30 questions to raise your accuracy.');
  assert.equal(v.requirement.mixedNote, 'Questions from Mixed Practice count toward this skill too.');
  assert.equal(v.requirement.correctNeededAtMinimum, 27);
  assert.equal(v.progress.answeredLabel, '24 of 30 questions'); assert.equal(v.progress.answered, 24); assert.equal(v.progress.correct, 22);
  assert.equal(v.progress.accuracyLabel, '91.6%'); assert.equal(v.progress.questionsShare, 0.8);
  assert.equal(v.remaining.questions, 6);
  assert.equal(v.standardsScore, null); assert.match(v.standardsNote, /Practice does not change it/);
  assert.ok(typeof v.explanation.text === 'string' && v.explanation.text.length > 20);
});

test('student view contract: answering more than the minimum reads naturally, the share never exceeds 100%, and an unconfigured skill shows no numbers', () => {
  const stillGoing = R.studentRequirementView(nodeOf(progressFor(classWith(10, 90), modulus(25, 15))));
  assert.equal(stillGoing.status, 'in-progress'); assert.equal(stillGoing.progress.questionsShare, 1);
  assert.equal(stillGoing.progress.answeredLabel, '25 questions (10 required)'); assert.equal(stillGoing.remaining.questions, 0);
  const met = R.studentRequirementView(nodeOf(progressFor(classWith(10, 90), modulus(25, 25))));
  assert.equal(met.status, 'requirements-met'); assert.equal(met.progress.answeredLabel, '10 of 10 questions', 'a met attempt is frozen at the moment it was met');
  assert.equal(R.studentRequirementView(nodeOf(progressFor(classWith(1, 100), modulus(1, 1)))).progress.answeredLabel, '1 of 1 question');
  const bare = R.studentRequirementView(nodeOf(progressFor(classPathway(), modulus(5, 5))));
  assert.equal(bare.requirement.headline, null); assert.equal(bare.progress, null); assert.equal(bare.remaining, null);
  assert.equal(bare.status, 'provisional'); assert.equal(bare.statusLabel, 'Waiting for your teacher');
});

test('student view contract: no node, policy or attempt identifier or UUID ever appears in what a student sees', () => {
  const pathway = must(R.applyToAreas(classWith(30, 90), [AREA.math], { minimumQuestions: 20, accuracy: pct(95) }, ctxFor()));
  for (const raw of [[], modulus(5, 5), modulus(20, 19), modulus(60, 60)]) {
    for (const id of [MOD, 'node:advanced:variable-lab:trace']) {
      const text = JSON.stringify(R.studentRequirementView(nodeOf(progressFor(pathway, raw), id)));
      assert.doesNotMatch(text, /node:|policy:|area:|attempt-|[0-9a-f]{8}-[0-9a-f]{4}-/i, text.slice(0, 200));
    }
  }
});

test('student view contract: the status labels cover every status the engine can report', () => {
  assert.deepEqual(Object.keys(R.STATUS_LABELS).sort(), ['in-progress', 'not-started', 'provisional', 'requirements-met', 'review-recommended']);
  for (const label of Object.values(R.STATUS_LABELS)) assert.ok(label.length > 3 && !/-/.test(label.replace('Waiting for your teacher', '')));
});

// ---- no standards score, no award, no unapproved activation --------------------------------------------------------------------
test('meeting a requirement is a practice milestone: no 0-4 score, no award, nothing verified', () => {
  const pathway = must(R.applyToAreas(classWith(30, 90), [AREA.math], { minimumQuestions: 10, accuracy: pct(90) }, ctxFor()));
  const out = progressFor(pathway, mixed({ student: 'm', session: 'mx', rounds: 10, plan: mixedPlan(), results: [true] }).events);
  assert.ok(MATH_NODES.every((id) => nodeOf(out, id).status === 'requirements-met'));
  for (const id of MATH_NODES) {
    const n = nodeOf(out, id);
    assert.equal(n.standards.score, null); assert.equal(n.award, null); assert.equal(n.verification, 'provisional');
    assert.ok(n.trust.provisionalEvents > 0 && n.trust.verifiedEvents === 0 && n.trust.verified === false, 'browser evidence is never treated as trusted');
    const view = R.studentRequirementView(n);
    assert.match(view.milestoneNote, /practice milestone/); assert.equal(view.standardsScore, null, 'the student view shows no standards score because a requirement was met');
  }
  assert.equal(out.areas.find((a) => a.areaId === AREA.math).verified, false);
});

test('the requirements module exposes no way to create an award or a score, and the award module stays out of the browser entry points', () => {
  const names = Object.keys(R).join(' ');
  assert.doesNotMatch(names, /award|certif|score|grade/i);
  assert.equal('proposeAward' in masteryIndex, false);
  assert.equal(Object.keys(R).some((k) => /^propose/.test(k)), false);
});

test('an unconfigured class has no requirement and the engine says so instead of inventing one', () => {
  const out = progressFor(classPathway(), modulus(60, 60));
  const n = nodeOf(out);
  assert.equal(n.status, 'provisional'); assert.equal(n.policy.configured, false); assert.equal(n.requirements, null);
  assert.equal(n.award, null); assert.equal(out.areas.find((a) => a.areaId === AREA.math).qualified, false);
});

test('a draft policy that has not been published does not change what a student is shown from the published revision', () => {
  const published = classWith(30, 90);
  const draft = must(R.applyToClass(published, { minimumQuestions: 99, accuracy: pct(99) }, ctxFor({ published: { ...published, revision: 1 } })));
  const raw = modulus(30, 27);
  assert.equal(nodeOf(progressFor(published, raw)).status, 'requirements-met', 'students use the published revision');
  assert.equal(nodeOf(progressFor(draft, raw)).status, 'in-progress', 'only the teacher\'s draft view uses the draft');
  assert.equal(policyById(published, R.CLASS_POLICY_ID).minimumQuestions, 30);
});

test('invalid saved data never crashes progress: a malformed requirement policy is reported as a problem for that skill', () => {
  const pathway = classWith(30, 90);
  const broken = JSON.parse(JSON.stringify(pathway));
  policyById(broken, R.CLASS_POLICY_ID).challenge.families = { minDistinct: -4 };
  const out = progressFor(broken, modulus(5, 5));
  assert.ok(out.problems.length > 0); assert.equal(out.nodes.length, 0, 'no guess is made for a policy the engine cannot read');
  assert.ok(out.problems[0].errors.length > 0);
});
