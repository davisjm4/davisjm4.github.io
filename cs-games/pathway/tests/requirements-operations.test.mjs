// Teacher-controlled mastery requirements: bulk editing, copying, resetting, rejected input, and the guarantees every operation keeps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { R, graph, classPathway, ctxFor, pct, must, policyById, checkpointOf, resolved, reqPolicies, AREA, NODE, MATH_NODES } from './lib/requirements-fixtures.mjs';

const ctx = () => ctxFor();
const VARIABLE = 'node:advanced:variable-lab:trace';
const snapshot = (p) => JSON.stringify(p);
const classAt = (q, a, p = classPathway()) => must(R.applyToClass(p, { minimumQuestions: q, accuracy: pct(a) }, ctx()));

// ---- bulk editing ---------------------------------------------------------------------------------------------------
test('apply to all class skills: one call, every skill reported as changed, nothing else created', () => {
  const res = R.applyToClass(classPathway(), { minimumQuestions: 30, accuracy: pct(90) }, ctx());
  assert.equal(res.ok, true); assert.equal(res.changed.length, 123);
  assert.equal(new Set(res.changed).size, 123); assert.deepEqual(res.errors, []);
  assert.equal(reqPolicies(res.pathway).length, 1);
});

test('apply to a selected area, to several areas, and to selected skills', () => {
  let p = classAt(30, 90);
  let res = R.applyToAreas(p, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx());
  assert.equal(res.ok, true); assert.equal(res.changed.length, 7); p = res.pathway;
  res = R.applyToAreas(p, [AREA.array, AREA.loop], { minimumQuestions: 20, accuracy: pct(92.5) }, ctx());
  assert.equal(res.ok, true); assert.equal(res.changed.length, 12 + 11); p = res.pathway;
  for (const id of p.checkpoints.filter((c) => c.areaId === AREA.loop).map((c) => c.nodeId)) assert.equal(resolved(p, id).effective.accuracy, 0.925);
  const picks = [NODE.modulus, NODE.trace2d, VARIABLE];
  res = R.applyToSkills(p, picks, { minimumQuestions: 15 }, ctx());
  assert.equal(res.ok, true); assert.deepEqual([...res.changed].sort(), [...picks].sort());
  for (const id of picks) assert.equal(resolved(res.pathway, id).effective.minimumQuestions, 15);
  assert.equal(resolved(res.pathway, NODE.division).effective.minimumQuestions, 50, 'unselected skills in the same area are unchanged');
  assert.equal(reqPolicies(res.pathway).length, 1 + 3 + 3, 'one policy for the class, three areas and three skills, not one per skill');
});

test('bulk edits keep skills\' own settings by default and report them; "replace" clears just the overlapping settings', () => {
  let p = classAt(30, 90);
  p = must(R.applyToSkills(p, [NODE.modulus], { accuracy: pct(80), minimumCorrect: 20 }, ctx()));
  const keep = R.applyToClass(p, { minimumQuestions: 40, accuracy: pct(95) }, ctx());
  assert.equal(keep.ok, true);
  assert.deepEqual(keep.kept, [{ level: 'skill', scopeId: NODE.modulus, fields: ['accuracy'] }], 'only the setting that overlaps is reported as kept');
  assert.equal(resolved(keep.pathway, NODE.modulus).effective.accuracy, 0.8);
  assert.equal(resolved(keep.pathway, NODE.modulus).effective.minimumQuestions, 40);
  const replace = R.applyToClass(p, { minimumQuestions: 40, accuracy: pct(95) }, ctx(), { replaceLowerOverrides: true });
  assert.equal(replace.ok, true); assert.deepEqual(replace.kept, []);
  assert.equal(resolved(replace.pathway, NODE.modulus).effective.accuracy, 0.95, 'the skill\'s accuracy override was replaced');
  assert.equal(resolved(replace.pathway, NODE.modulus).effective.minimumCorrect, 20, 'its other setting, which the bulk edit did not touch, is kept');
});

test('an area edit reports and keeps overriding skills inside that area only', () => {
  let p = classAt(30, 90);
  p = must(R.applyToSkills(p, [NODE.modulus, NODE.trace2d], { accuracy: pct(80) }, ctx()));
  const res = R.applyToAreas(p, [AREA.math], { accuracy: pct(97) }, ctx());
  assert.equal(res.ok, true); assert.deepEqual(res.kept.map((k) => k.scopeId), [NODE.modulus], 'the array skill is in another area and is not affected');
  assert.equal(resolved(res.pathway, NODE.trace2d).effective.accuracy, 0.8);
});

test('remove every individual skill setting inside chosen areas in one step', () => {
  let p = classAt(30, 90);
  p = must(R.applyToAreas(p, [AREA.math], { accuracy: pct(95), minimumQuestions: 50 }, ctx()));
  p = must(R.applyToSkills(p, [NODE.modulus, NODE.division, NODE.trace2d], { minimumQuestions: 10 }, ctx()));
  const res = R.clearSkillOverridesInAreas(p, [AREA.math], ctx());
  assert.equal(res.ok, true);
  assert.equal(resolved(res.pathway, NODE.modulus).effective.minimumQuestions, 50); assert.equal(resolved(res.pathway, NODE.division).hasOwnSettings, false);
  assert.equal(resolved(res.pathway, NODE.trace2d).effective.minimumQuestions, 10, 'a skill in another area keeps its own setting');
  assert.ok(R.verifyConsistency(res.pathway, ctx()).consistent);
});

test('copy settings from another area: copies what the source chose, not a live link', () => {
  let p = classAt(30, 90);
  p = must(R.applyToAreas(p, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  const res = R.copyAreaSettings(p, AREA.math, [AREA.array, AREA.loop], ctx());
  assert.equal(res.ok, true); assert.equal(res.changed.length, 12 + 11);
  assert.deepEqual([resolved(res.pathway, NODE.trace2d).effective.minimumQuestions, resolved(res.pathway, NODE.trace2d).effective.accuracy], [50, 0.95]);
  assert.equal(R.levelView(res.pathway, 'area', AREA.array, graph).setHere.includes('accuracy'), true, 'the copy is the destination\'s own setting');
  const later = must(R.applyToAreas(res.pathway, [AREA.math], { accuracy: pct(99) }, ctx()));
  assert.equal(resolved(later, NODE.trace2d).effective.accuracy, 0.95, 'changing the source later does not change the copy');
});

test('copy settings: refuses a source with no settings of its own, an unknown area, or no destination, with plain messages', () => {
  const p = classAt(30, 90);
  const none = R.copyAreaSettings(p, AREA.math, [AREA.array], ctx());
  assert.equal(none.ok, false); assert.match(none.errors[0].message, /Math Lab follows the class defaults, so it has no settings of its own to copy/);
  const q = must(R.applyToAreas(p, [AREA.math], { accuracy: pct(95) }, ctx()));
  assert.match(R.copyAreaSettings(q, 'area:advanced:nope', [AREA.array], ctx()).errors[0].message, /not in this class/);
  assert.match(R.copyAreaSettings(q, AREA.math, ['area:advanced:nope'], ctx()).errors[0].message, /not in this class/);
  assert.match(R.copyAreaSettings(q, AREA.math, [], ctx()).errors[0].message, /at least one other learning area/);
  assert.match(R.copyAreaSettings(q, AREA.math, [AREA.math], ctx()).errors[0].message, /at least one other learning area/);
  for (const r of [none]) assert.equal(snapshot(r.pathway), snapshot(p), 'a refused copy changes nothing');
});

test('copying to an area where skills have their own settings keeps those skills\' settings and says so', () => {
  let p = classAt(30, 90);
  p = must(R.applyToAreas(p, [AREA.math], { accuracy: pct(95) }, ctx()));
  p = must(R.applyToSkills(p, [NODE.trace2d], { accuracy: pct(75) }, ctx()));
  const res = R.copyAreaSettings(p, AREA.math, [AREA.array], ctx());
  assert.equal(res.ok, true); assert.deepEqual(res.kept, [{ level: 'skill', scopeId: NODE.trace2d, fields: ['accuracy'] }]);
  assert.equal(resolved(res.pathway, NODE.trace2d).effective.accuracy, 0.75);
});

test('reset to inherited for an area, a set of skills, and the class', () => {
  let p = classAt(30, 90);
  p = must(R.applyToAreas(p, [AREA.math, AREA.array], { accuracy: pct(95) }, ctx()));
  p = must(R.applyToSkills(p, [NODE.modulus, NODE.division], { minimumQuestions: 12 }, ctx()));
  const skillsReset = R.resetToInherited(p, { level: 'skill', ids: [NODE.modulus, NODE.division] }, ctx());
  assert.equal(skillsReset.ok, true); assert.equal(resolved(skillsReset.pathway, NODE.modulus).effective.minimumQuestions, 30); assert.equal(resolved(skillsReset.pathway, NODE.modulus).effective.accuracy, 0.95);
  const areaReset = R.resetToInherited(p, { level: 'area', ids: [AREA.array] }, ctx());
  assert.equal(resolved(areaReset.pathway, NODE.trace2d).effective.accuracy, 0.9); assert.equal(resolved(areaReset.pathway, NODE.casting).effective.accuracy, 0.95, 'the other area is unchanged');
  const again = R.resetToInherited(skillsReset.pathway, { level: 'skill', ids: [NODE.modulus] }, ctx());
  assert.equal(again.ok, true); assert.equal(snapshot(again.pathway), snapshot(skillsReset.pathway), 'resetting something already inherited changes nothing');
});

// ---- rejected input -------------------------------------------------------------------------------------------------
test('rejected edits change nothing and say why in plain language', () => {
  const p = classAt(30, 90);
  const before = snapshot(p);
  const cases = [
    [R.applyToClass(p, { minimumQuestions: 0, accuracy: pct(90) }, ctx()), /whole number of 1 or more/],
    [R.applyToClass(p, { minimumQuestions: 30.5, accuracy: pct(90) }, ctx()), /whole number/],
    [R.applyToClass(p, { minimumQuestions: 30, accuracy: 0.009 }, ctx()), /not a fraction like 0\.90/],
    [R.applyToClass(p, { minimumQuestions: 30, accuracy: 1.2 }, ctx()), /1 to 100/],
    [R.applyToAreas(p, [], { accuracy: pct(90) }, ctx()), /Choose at least one learning area/],
    [R.applyToAreas(p, ['area:advanced:nope'], { accuracy: pct(90) }, ctx()), /not in this class/],
    [R.applyToSkills(p, [], { accuracy: pct(90) }, ctx()), /Choose at least one skill/],
    [R.applyToSkills(p, ['node:advanced:nope'], { accuracy: pct(90) }, ctx()), /not in this class/],
    [R.applyToAreas(p, [AREA.math], { subskills: [{ id: 'x', label: 'x', match: {}, minExposure: 1, minCorrect: 1 }] }, ctx()), /one skill at a time/],
    [R.applyToClass(p, { colour: 'blue' }, ctx()), /Unknown setting/],
  ];
  for (const [res, message] of cases) {
    assert.equal(res.ok, false); assert.match(res.errors.map((e) => e.message).join(' '), message);
    assert.equal(snapshot(res.pathway), before, 'a rejected edit hands back the pathway unchanged');
    assert.deepEqual(res.changed, []);
  }
});

test('class defaults must end up with both numbers, whether typed together or one at a time', () => {
  const fresh = classPathway();
  const onlyCount = R.applyToClass(fresh, { minimumQuestions: 30 }, ctx());
  assert.equal(onlyCount.ok, false); assert.match(onlyCount.errors[0].message, /both a minimum number of questions and a required accuracy/);
  const onlyAccuracy = R.applyToClass(fresh, { accuracy: pct(90) }, ctx());
  assert.equal(onlyAccuracy.ok, false);
  const p = classAt(30, 90);
  assert.equal(R.applyToClass(p, { minimumQuestions: 35 }, ctx()).ok, true, 'once both exist, one can change alone');
  assert.equal(R.applyToClass(p, {}, ctx(), { clear: ['accuracy'] }).ok, false, 'removing only one of them is not a requirement');
});

test('an area or skill that sets only one number, with nothing above to supply the other, is refused', () => {
  const fresh = classPathway();
  const res = R.applyToAreas(fresh, [AREA.math], { minimumQuestions: 30 }, ctx());
  assert.equal(res.ok, false); assert.match(res.errors[0].message, /Choose both a minimum number of questions and a required accuracy\. 7 skills have only one of them\./);
  const one = R.applyToSkills(fresh, [NODE.modulus], { accuracy: pct(90) }, ctx());
  assert.equal(one.ok, false); assert.match(one.errors[0].message, /Modulus has only one of them/);
  assert.equal(R.applyToAreas(fresh, [AREA.math], { minimumQuestions: 30, accuracy: pct(90) }, ctx()).ok, true);
});

// ---- guarantees -----------------------------------------------------------------------------------------------------
test('operations never modify the pathway they are given', () => {
  const p = classAt(30, 90);
  const before = snapshot(p);
  R.applyToClass(p, { minimumQuestions: 40, accuracy: pct(95) }, ctx());
  R.applyToAreas(p, [AREA.math], { minimumQuestions: 12, accuracy: pct(80) }, ctx());
  R.applyToSkills(p, [NODE.modulus], { accuracy: pct(70) }, ctx());
  R.resetToInherited(p, { level: 'class' }, ctx());
  R.copyAreaSettings(p, AREA.math, [AREA.array], ctx());
  R.rematerialize(p, ctx()); R.verifyConsistency(p, ctx());
  assert.equal(snapshot(p), before);
});

test('operations are idempotent: repeating the same edit changes nothing and creates no new versions', () => {
  const once = must(R.applyToAreas(classAt(30, 90), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  const twice = R.applyToAreas(once, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx());
  assert.equal(twice.ok, true); assert.equal(snapshot(twice.pathway), snapshot(once)); assert.deepEqual(twice.changed, []);
  assert.equal(snapshot(R.rematerialize(once, ctx())), snapshot(once));
});

test('the order of edits at different levels does not change the result', () => {
  const a1 = classAt(30, 90), a2 = must(R.applyToAreas(a1, [AREA.math], { accuracy: pct(95) }, ctx())), a3 = must(R.applyToSkills(a2, [NODE.modulus], { minimumQuestions: 12 }, ctx()));
  const b1 = must(R.applyToSkills(classAt(30, 90), [NODE.modulus], { minimumQuestions: 12 }, ctx())), b2 = must(R.applyToAreas(b1, [AREA.math], { accuracy: pct(95) }, ctx()));
  const view = (p) => R.resolveAll(p, graph).map((r) => [r.nodeId, r.effective.minimumQuestions, r.effective.accuracy, r.level, r.hasOwnSettings]);
  assert.deepEqual(view(a3), view(b2));
});

test('no hidden second copy: after any sequence of edits every derived value matches its explicit choices', () => {
  let p = classAt(30, 90);
  const steps = [
    (x) => R.applyToAreas(x, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()),
    (x) => R.applyToSkills(x, [NODE.modulus], { accuracy: pct(80) }, ctx()),
    (x) => R.applyToClass(x, { minimumQuestions: 40 }, ctx()),
    (x) => R.copyAreaSettings(x, AREA.math, [AREA.array], ctx()),
    (x) => R.resetToInherited(x, { level: 'skill', ids: [NODE.modulus] }, ctx()),
    (x) => R.applyToClass(x, { accuracy: pct(85), minimumCorrect: 30 }, ctx(), { replaceLowerOverrides: true }),
    (x) => R.resetToInherited(x, { level: 'area', ids: [AREA.math] }, ctx()),
  ];
  for (const step of steps) { p = must(step(p)); assert.deepEqual(R.verifyConsistency(p, ctx()), { consistent: true, drift: [] }); }
});

test('a hand-edited derived value is detected as drift and repaired from the explicit choices', () => {
  let p = must(R.applyToAreas(classAt(30, 90), [AREA.math], { accuracy: pct(95) }, ctx()));
  const tampered = JSON.parse(JSON.stringify(p));
  policyById(tampered, `policy:req:area:${AREA.math}`).minimumQuestions = 5; // a stale inherited copy
  const check = R.verifyConsistency(tampered, ctx());
  assert.equal(check.consistent, false); assert.ok(check.drift.includes('policies'));
  const repaired = R.rematerialize(tampered, ctx());
  assert.equal(policyById(repaired, `policy:req:area:${AREA.math}`).minimumQuestions, 30);
  assert.equal(R.verifyConsistency(repaired, ctx()).consistent, true);
  const wrongRef = JSON.parse(JSON.stringify(p)); checkpointOf(wrongRef, NODE.modulus).policyId = R.CLASS_POLICY_ID;
  assert.ok(R.verifyConsistency(wrongRef, ctx()).drift.includes(NODE.modulus));
});

test('settings for areas and skills that are no longer in the plan are retired, and nothing keeps pointing at them', () => {
  let p = classAt(30, 90);
  p = must(R.applyToAreas(p, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()));
  p = must(R.applyToSkills(p, [NODE.trace2d], { minimumQuestions: 12 }, ctx()));
  const shrunk = JSON.parse(JSON.stringify(p));
  const drop = new Set([...MATH_NODES, NODE.trace2d]);
  shrunk.checkpoints = shrunk.checkpoints.filter((c) => !drop.has(c.nodeId)); shrunk.sequence = shrunk.sequence.filter((id) => !drop.has(id));
  const after = R.rematerialize(shrunk, ctx());
  const levels = R.readLevels(after);
  assert.equal(levels.areas.has(AREA.math), false, 'the Math Lab area setting goes with the area');
  assert.equal(levels.skills.has(NODE.trace2d), false, 'a removed skill\'s setting goes with it');
  assert.ok(levels.class, 'the class defaults stay');
  assert.ok(after.checkpoints.every((c) => after.policies.some((x) => x.id === c.policyId && x.version === c.policyVersion)));
  assert.equal(R.verifyConsistency(after, ctx()).consistent, true);
  assert.equal(R.resolveAll(after, graph).length, 123 - 8);
});

test('permanent policies exist only where the teacher set something: never one per skill, never a policy for untouched skills', () => {
  const fresh = classPathway();
  assert.equal(fresh.policies.length, 1);
  const p = must(R.applyToSkills(fresh, [NODE.modulus], { minimumQuestions: 30, accuracy: pct(90) }, ctx()));
  assert.equal(reqPolicies(p).length, 1);
  assert.equal(p.checkpoints.filter((c) => c.policyId !== 'policy:provisional').length, 1, 'only the chosen skill leaves the provisional policy');
  assert.equal(R.resolveAll(p, graph).filter((r) => r.complete).length, 1);
  const all = graph.nodes.length;
  assert.equal(all, 290);
  const wide = must(R.applyToClass(fresh, { minimumQuestions: 30, accuracy: pct(90) }, ctx()));
  assert.ok(wide.policies.length <= 2, 'class defaults for all skills still store one requirement policy');
});

test('a minimum-correct requirement and the other optional rules are stored with the level, not invented per skill', () => {
  let p = classAt(30, 90);
  p = must(R.applyToClass(p, { minimumCorrect: 28, unscored: { assisted: 'excluded', skipped: 'incorrect', revealed: 'incorrect', maxExcludedShare: 0.1 }, staleAfterDays: 90 }, ctx()));
  const pol = policyById(p, R.CLASS_POLICY_ID);
  assert.equal(pol.challenge.minimumCorrect, 28); assert.equal(pol.challenge.review.staleAfterDays, 90); assert.equal(pol.challenge.unscored.assisted, 'excluded');
  assert.deepEqual(pol.requirementSource.explicit, ['minimumQuestions', 'accuracy', 'minimumCorrect', 'unscored', 'staleAfterDays']);
  assert.equal(resolved(p, NODE.modulus).effective.minimumCorrect, 28);
  assert.deepEqual(MATH_NODES.map((id) => resolved(p, id).effective.staleAfterDays), Array(7).fill(90));
});
