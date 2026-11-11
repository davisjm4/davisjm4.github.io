// Teacher-controlled mastery requirements: class defaults, learning-area overrides, individual skill overrides, resolution, sources and reset.
import test from 'node:test';
import assert from 'node:assert/strict';
import { R, graph, classPathway, ctxFor, pct, must, policyById, checkpointOf, resolved, reqPolicies, publishDraft, AREA, NODE, MATH_NODES } from './lib/requirements-fixtures.mjs';
import { validatePathway } from '../model.mjs';

const ctx = () => ctxFor();
const VARIABLE = 'node:advanced:variable-lab:trace';
const classAt = (q, a, p = classPathway()) => must(R.applyToClass(p, { minimumQuestions: q, accuracy: pct(a) }, ctx()));

test('by default nothing is configured: every skill points at the provisional policy and no requirement exists', () => {
  const p = classPathway();
  assert.equal(p.checkpoints.length, 123);
  assert.deepEqual(p.policies.map((x) => x.id), ['policy:provisional']);
  assert.ok(p.checkpoints.every((c) => c.policyId === 'policy:provisional'));
  const all = R.resolveAll(p, graph);
  assert.equal(all.length, 123);
  assert.ok(all.every((r) => r.level === 'none' && r.complete === false && r.effective.minimumQuestions === null && r.effective.accuracy === null));
  assert.ok(all.every((r) => Object.values(r.labels).includes('Not set')));
  assert.equal(reqPolicies(p).length, 0);
});

test('class defaults reach every skill through ONE policy, not one policy per skill', () => {
  const p = classAt(30, 90);
  assert.deepEqual(p.policies.map((x) => `${x.id}@${x.version}`).sort(), ['policy:provisional@1', 'policy:req:class@1']);
  assert.ok(p.checkpoints.every((c) => c.policyId === R.CLASS_POLICY_ID && c.policyVersion === 1));
  for (const r of R.resolveAll(p, graph)) {
    assert.equal(r.level, 'class'); assert.equal(r.complete, true);
    assert.equal(r.effective.minimumQuestions, 30); assert.equal(r.effective.accuracy, 0.9);
    assert.equal(r.sources.minimumQuestions.level, 'class'); assert.equal(r.labels.accuracy, 'Class defaults');
  }
});

test('a learning-area override beats the class defaults, only inside that area', () => {
  const p = must(R.applyToAreas(classAt(30, 90), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  for (const id of MATH_NODES) {
    const r = resolved(p, id);
    assert.equal(r.level, 'area'); assert.equal(r.effective.minimumQuestions, 50); assert.equal(r.effective.accuracy, 0.95);
    assert.equal(r.labels.minimumQuestions, 'Set for the Math Lab area');
    assert.equal(checkpointOf(p, id).policyId, `policy:req:area:${AREA.math}`);
  }
  const other = resolved(p, VARIABLE);
  assert.equal(other.level, 'class'); assert.equal(other.effective.minimumQuestions, 30); assert.equal(other.effective.accuracy, 0.9);
  assert.equal(R.resolveAll(p, graph).filter((r) => r.level === 'area').length, 7);
});

test('an individual skill override beats its area and the class, one setting at a time', () => {
  let p = must(R.applyToAreas(classAt(30, 90), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  p = must(R.applyToSkills(p, [NODE.modulus], { accuracy: pct(80) }, ctx()));
  const m = resolved(p, NODE.modulus);
  assert.equal(m.effective.accuracy, 0.8, 'accuracy comes from the skill'); assert.equal(m.sources.accuracy.level, 'skill'); assert.equal(m.labels.accuracy, 'Set for this skill');
  assert.equal(m.effective.minimumQuestions, 50, 'the question count is still inherited from the area'); assert.equal(m.sources.minimumQuestions.level, 'area'); assert.equal(m.labels.minimumQuestions, 'Set for the Math Lab area');
  assert.equal(m.hasOwnSettings, true);
  assert.equal(checkpointOf(p, NODE.modulus).policyId, `policy:req:skill:${NODE.modulus}`);
  const sibling = resolved(p, NODE.division);
  assert.equal(sibling.effective.accuracy, 0.95); assert.equal(sibling.hasOwnSettings, false);
  assert.equal(resolved(p, VARIABLE).effective.accuracy, 0.9);
});

test('precedence is skill, then area, then class, for every setting (a layered example)', () => {
  let p = classAt(30, 90);
  p = must(R.applyToClass(p, { minimumCorrect: 25 }, ctx()));
  p = must(R.applyToAreas(p, [AREA.array], { minimumQuestions: 20, minimumCorrect: 18 }, ctx()));
  p = must(R.applyToSkills(p, [NODE.trace2d], { minimumCorrect: 15 }, ctx()));
  const t = resolved(p, NODE.trace2d), e = resolved(p, NODE.element), v = resolved(p, VARIABLE);
  assert.deepEqual([t.effective.minimumQuestions, t.effective.minimumCorrect, t.effective.accuracy], [20, 15, 0.9]);
  assert.deepEqual([t.sources.minimumQuestions.level, t.sources.minimumCorrect.level, t.sources.accuracy.level], ['area', 'skill', 'class']);
  assert.deepEqual([e.effective.minimumQuestions, e.effective.minimumCorrect], [20, 18]);
  assert.deepEqual([v.effective.minimumQuestions, v.effective.minimumCorrect], [30, 25]);
});

test('a later change to the class defaults reaches inherited settings and leaves overridden ones alone', () => {
  let p = must(R.applyToAreas(classAt(30, 90), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  p = must(R.applyToSkills(p, [NODE.modulus], { accuracy: pct(80) }, ctx()));
  p = classAt(40, 85, p);
  assert.deepEqual([resolved(p, VARIABLE).effective.minimumQuestions, resolved(p, VARIABLE).effective.accuracy], [40, 0.85], 'inheriting skills follow the class');
  assert.deepEqual([resolved(p, NODE.division).effective.minimumQuestions, resolved(p, NODE.division).effective.accuracy], [50, 0.95], 'the area keeps its own settings');
  assert.deepEqual([resolved(p, NODE.modulus).effective.minimumQuestions, resolved(p, NODE.modulus).effective.accuracy], [50, 0.8], 'the skill keeps its own accuracy');
  assert.ok(R.verifyConsistency(p, ctx()).consistent, 'every derived copy matches what its explicit choices produce');
});

test('inherited values are derived copies: the stored area policy copies the class value it inherits, and says which it chose itself', () => {
  let p = classAt(30, 90);
  p = must(R.applyToAreas(p, [AREA.math], { accuracy: pct(95) }, ctx()));
  const areaPol = policyById(p, `policy:req:area:${AREA.math}`);
  assert.deepEqual(areaPol.requirementSource.explicit, ['accuracy'], 'only the accuracy is this area\'s own choice');
  assert.equal(areaPol.minimumQuestions, 30, 'the question count is a copy of the inherited class value');
  p = classAt(45, 90, p);
  assert.equal(policyById(p, `policy:req:area:${AREA.math}`).minimumQuestions, 45, 'the copy is re-derived when the class changes');
  assert.equal(resolved(p, NODE.modulus).effective.minimumQuestions, 45);
});

test('level view for the form: effective values, the source of each, what is set here, and what would be inherited', () => {
  let p = classAt(30, 90);
  p = must(R.applyToAreas(p, [AREA.math], { accuracy: pct(95) }, ctx()));
  const v = R.levelView(p, 'area', AREA.math, graph);
  assert.deepEqual(v.setHere, ['accuracy']);
  assert.equal(v.effective.accuracy, 0.95); assert.equal(v.inheritedValues.accuracy, 0.9);
  assert.equal(v.labels.accuracy, 'Set for this area'); assert.equal(v.labels.minimumQuestions, 'Class defaults');
  assert.equal(v.inheritedLabels.accuracy, 'Class defaults'); assert.equal(v.active, true); assert.equal(v.complete, true);
  const none = R.levelView(classPathway(), 'class', null, graph);
  assert.equal(none.active, false); assert.equal(none.complete, false); assert.equal(none.effective.minimumQuestions, null);
  const skill = R.levelView(p, 'skill', NODE.modulus, graph);
  assert.equal(skill.active, false); assert.equal(skill.effective.accuracy, 0.95); assert.equal(skill.labels.accuracy, 'Set for the Math Lab area');
});

test('area and skill overrides on one area do not leak into another area or skill', () => {
  let p = classAt(30, 90);
  p = must(R.applyToAreas(p, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  p = must(R.applyToAreas(p, [AREA.array], { minimumQuestions: 20, accuracy: pct(90) }, ctx()));
  p = must(R.applyToSkills(p, [NODE.modulus], { minimumQuestions: 10 }, ctx()));
  assert.equal(resolved(p, NODE.modulus).effective.minimumQuestions, 10);
  assert.equal(resolved(p, NODE.division).effective.minimumQuestions, 50);
  assert.equal(resolved(p, NODE.trace2d).effective.minimumQuestions, 20);
  assert.equal(resolved(p, VARIABLE).effective.minimumQuestions, 30);
  assert.deepEqual(R.resolveAll(p, graph).map((r) => r.level).reduce((m, l) => ({ ...m, [l]: (m[l] ?? 0) + 1 }), {}), { class: 123 - 7 - 12, area: 6 + 12, skill: 1 });
});

test('a skill with any setting of its own is reported as its own, and the review counts add up (each skill counted once)', () => {
  let p = must(R.applyToAreas(classAt(30, 90), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  p = must(R.applyToSkills(p, [NODE.modulus], { accuracy: pct(80) }, ctx())); // inherits its question count from the area
  const m = resolved(p, NODE.modulus);
  assert.equal(m.level, 'skill', 'it has a setting of its own, so it is not described as following its area'); assert.equal(m.hasOwnSettings, true);
  assert.equal(m.sources.minimumQuestions.level, 'area', 'the per-setting source is still exact');
  const { counts } = R.overridesTable(p, graph);
  assert.deepEqual([counts.usingClass, counts.usingArea, counts.ownSettings, counts.older, counts.notSet], [123 - 7, 6, 1, 0, 0]);
  assert.equal(counts.usingClass + counts.usingArea + counts.ownSettings + counts.older + counts.notSet, counts.skills, 'no skill is counted twice or missed');
  assert.deepEqual(R.overridesTable(classPathway(), graph).counts, { skills: 123, usingClass: 0, usingArea: 0, ownSettings: 0, older: 0, notSet: 123 });
});

test('reset to inherited: a skill goes back to the area, an area goes back to the class, and the source labels follow', () => {
  let p = must(R.applyToAreas(classAt(30, 90), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  p = must(R.applyToSkills(p, [NODE.modulus], { accuracy: pct(80), minimumQuestions: 10 }, ctx()));
  p = must(R.resetToInherited(p, { level: 'skill', ids: [NODE.modulus] }, ctx()));
  const m = resolved(p, NODE.modulus);
  assert.deepEqual([m.effective.minimumQuestions, m.effective.accuracy, m.level, m.hasOwnSettings], [50, 0.95, 'area', false]);
  assert.equal(checkpointOf(p, NODE.modulus).policyId, `policy:req:area:${AREA.math}`);
  p = must(R.resetToInherited(p, { level: 'area', ids: [AREA.math] }, ctx()));
  for (const id of MATH_NODES) { const r = resolved(p, id); assert.deepEqual([r.effective.minimumQuestions, r.effective.accuracy, r.level], [30, 0.9, 'class']); assert.equal(r.labels.minimumQuestions, 'Class defaults'); }
  assert.deepEqual(p.policies.map((x) => x.id).sort(), ['policy:provisional', 'policy:req:class'], 'a never-published override leaves no trace once reset');
  assert.ok(R.verifyConsistency(p, ctx()).consistent);
});

test('reset one setting only: the others a level chose stay', () => {
  let p = classAt(30, 90);
  p = must(R.applyToSkills(p, [NODE.modulus], { minimumQuestions: 12, accuracy: pct(80) }, ctx()));
  p = must(R.resetToInherited(p, { level: 'skill', ids: [NODE.modulus] }, ctx(), { fields: ['accuracy'] }));
  const m = resolved(p, NODE.modulus);
  assert.deepEqual([m.effective.minimumQuestions, m.effective.accuracy], [12, 0.9]);
  assert.deepEqual([m.sources.minimumQuestions.level, m.sources.accuracy.level], ['skill', 'class']);
});

test('clearing an optional setting with the "clear" option restores inheritance for it', () => {
  let p = classAt(30, 90);
  p = must(R.applyToClass(p, { minimumCorrect: 28 }, ctx()));
  p = must(R.applyToAreas(p, [AREA.math], { minimumCorrect: 20 }, ctx()));
  assert.equal(resolved(p, NODE.modulus).effective.minimumCorrect, 20);
  p = must(R.setSettings(p, { level: 'area', ids: [AREA.math] }, {}, ctx(), { clear: ['minimumCorrect'] }));
  assert.equal(resolved(p, NODE.modulus).effective.minimumCorrect, 28, 'the area no longer overrides it, so the class value shows through');
  p = must(R.setSettings(p, { level: 'class' }, {}, ctx(), { clear: ['minimumCorrect'] }));
  assert.equal(resolved(p, NODE.modulus).effective.minimumCorrect, null, 'minimum correct is optional and can be turned off');
});

test('turning the class defaults off leaves areas and skills that set both numbers working, and the rest unconfigured', () => {
  let p = must(R.applyToAreas(classAt(30, 90), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  p = must(R.resetToInherited(p, { level: 'class' }, ctx()));
  assert.equal(resolved(p, NODE.modulus).complete, true); assert.equal(resolved(p, NODE.modulus).effective.minimumQuestions, 50);
  const v = resolved(p, VARIABLE);
  assert.equal(v.complete, false); assert.equal(v.level, 'none'); assert.equal(checkpointOf(p, VARIABLE).policyId, 'policy:provisional');
});

test('an older-editor policy is respected as a skill-level choice, shown as such, and not silently replaced by class defaults', () => {
  let p = classPathway();
  const legacy = { id: 'policy:legacy-modulus', version: 1, provisional: false, label: 'Modulus 25 at 85%', minimumQuestions: 25, accuracy: 0.85, coverage: {}, scoreTarget: null };
  p.policies.push(legacy);
  const c = checkpointOf(p, NODE.modulus); c.policyId = legacy.id; c.policyVersion = 1;
  const before = resolved(p, NODE.modulus);
  assert.equal(before.hasLegacyPolicy, true); assert.equal(before.level, 'legacy'); assert.equal(before.effective.minimumQuestions, 25); assert.equal(before.labels.minimumQuestions, 'Set in the older policy editor');
  p = classAt(30, 90, p);
  assert.equal(checkpointOf(p, NODE.modulus).policyId, legacy.id, 'class defaults do not take over a skill the older editor configured');
  assert.equal(resolved(p, NODE.modulus).effective.minimumQuestions, 25);
  assert.equal(resolved(p, NODE.division).effective.minimumQuestions, 30);
  assert.deepEqual(p.policies.find((x) => x.id === legacy.id), legacy, 'the older policy object is untouched');
  // the teacher can hand the skill to the class explicitly
  p = must(R.resetToInherited(p, { level: 'skill', ids: [NODE.modulus] }, ctx()));
  assert.equal(checkpointOf(p, NODE.modulus).policyId, R.CLASS_POLICY_ID);
  assert.equal(resolved(p, NODE.modulus).effective.minimumQuestions, 30);
});

test('editing one extra setting on an older-editor skill keeps its question count and accuracy', () => {
  let p = classPathway();
  p.policies.push({ id: 'policy:legacy-modulus', version: 1, provisional: false, label: 'old', minimumQuestions: 25, accuracy: 0.85, coverage: {}, scoreTarget: null });
  const c = checkpointOf(p, NODE.modulus); c.policyId = 'policy:legacy-modulus'; c.policyVersion = 1;
  p = classAt(30, 90, p);
  p = must(R.applyToSkills(p, [NODE.modulus], { minimumCorrect: 22 }, ctx()));
  const r = resolved(p, NODE.modulus);
  assert.deepEqual([r.effective.minimumQuestions, r.effective.accuracy, r.effective.minimumCorrect], [25, 0.85, 22]);
});

test('different classes carry different thresholds for the same skills, with no shared state', () => {
  const a = classAt(30, 90, classPathway({ id: 'pa', classId: 'class-a', title: 'Period 1' }));
  const b = classAt(20, 95, classPathway({ id: 'pb', classId: 'class-b', title: 'Period 5' }));
  assert.deepEqual([resolved(a, NODE.modulus).effective.minimumQuestions, resolved(a, NODE.modulus).effective.accuracy], [30, 0.9]);
  assert.deepEqual([resolved(b, NODE.modulus).effective.minimumQuestions, resolved(b, NODE.modulus).effective.accuracy], [20, 0.95]);
  const a2 = must(R.applyToAreas(a, [AREA.math], { accuracy: pct(99) }, ctx()));
  assert.equal(resolved(b, NODE.modulus).effective.accuracy, 0.95, 'changing class A never touches class B');
  assert.equal(resolved(a2, NODE.modulus).effective.accuracy, 0.99);
});

test('policy ids carry their level and are parsed back without throwing, including odd input', () => {
  assert.deepEqual(R.parsePolicyId(R.CLASS_POLICY_ID), { level: 'class', scopeId: null });
  assert.deepEqual(R.parsePolicyId(R.areaPolicyId('area:x')), { level: 'area', scopeId: 'area:x' });
  assert.deepEqual(R.parsePolicyId(R.skillPolicyId('node:y')), { level: 'skill', scopeId: 'node:y' });
  assert.equal(R.parsePolicyId('policy:provisional').level, 'provisional');
  for (const odd of ['policy:req:area:', 'policy:req:skill:', '', null, undefined, 42, 'policy:req:other']) assert.doesNotThrow(() => R.parsePolicyId(odd));
  assert.equal(R.parsePolicyId('policy:req:area:').level, 'legacy');
  assert.equal(R.isRequirementPolicy(null), false); assert.equal(R.isRequirementPolicy({ id: R.CLASS_POLICY_ID }), false, 'the id alone is not enough: it needs the requirement source');
});

test('configuring requirements never changes the pathway outside policies and checkpoint references', () => {
  const before = classPathway();
  let after = classAt(30, 90, before);
  after = must(R.applyToAreas(after, [AREA.math], { minimumQuestions: 50 }, ctx()));
  const strip = (p) => JSON.stringify({ ...p, policies: null, checkpoints: p.checkpoints.map(({ policyId, policyVersion, ...c }) => c) });
  assert.equal(strip(after), strip(before), 'calendar, sequence, sessions, areas, snapshot and dates are untouched');
  assert.doesNotThrow(() => validatePathway(after, graph, { validateSessions: false, validateTargets: false }));
  assert.equal(publishDraft(after, null).published.revision, 1);
});
