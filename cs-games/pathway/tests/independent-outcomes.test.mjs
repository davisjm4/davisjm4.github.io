// CSG-PKG-08 prototype: characterization of the coupled formative evaluator, and side-by-side checks of three independent outcomes.
// Synthetic learner, real curriculum graph, real requirement operations, real Variable Lab generator metadata. Nothing is persisted
// outside an in-memory SQLite database.
import '../../teacher/test-runtime.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import graph from '../curriculum-graph.json' with { type: 'json' };
import registry from '../evidence-gap-registry.json' with { type: 'json' };
import { generateTrace } from '../../../java-games/variable-lab/trace-adapter.js';
import { createPathway, publicationSnapshot, studentContract } from '../model.mjs';
import * as O from '../requirements/operations.mjs';
import { buildContentFacts } from '../requirements/limits.mjs';
import { normalizeEvent } from '../mastery/events.mjs';
import { deepFreeze, emptyHistory, restartAttempt } from '../mastery/attempts.mjs';
import { nodeProgress } from '../mastery/progress.mjs';
import { assertMasteryPolicy } from '../mastery/policy.mjs';
import { evaluateProficiency } from '../proficiency/index.mjs';
import * as I from '../proficiency/independent.mjs';
import { startDev } from '../../../wpr-games/workplace-readiness/service/dev.mjs';

const NODE = 'node:advanced:variable-lab:trace', OTHER = 'node:advanced:variable-lab:assemble';
const node = graph.nodes.find((n) => n.id === NODE);
const scope = { profileId: 'synthetic-learner', classId: 'synthetic-class' };
const ctx = O.createContext({ graph, facts: buildContentFacts({ graph, registry }) });
const NOW = '2026-11-15T12:00:00.000Z';
let seq = 0;
function answers(tier, count, { mode = 'trace', correct = () => true, start = Date.parse('2026-11-11T12:00:00Z') } = {}) {
  return Array.from({ length: count }, (_, i) => {
    const q = generateTrace({ difficulty: tier, seed: i + 1 });
    const questionId = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
    const r = normalizeEvent({ id: questionId + ':1', questionId, sessionId: '00000000-0000-4000-8000-000000000001', courseId: 'advanced', activity: 'variable-lab',
      mode, assessedMode: 'trace', topic: q.topic, familyId: q.traceFamily, difficulty: q.difficulty, attempt: 1, correct: correct(i), occurred: start + seq }, { graph, scope });
    assert.equal(r.ok, true, r.reason);
    return r.event;
  });
}
const must = (r) => { assert.equal(r.ok, true, JSON.stringify(r.errors ?? r.problems)); return r.pathway; };
const plain = () => createPathway(graph, { id: 'p', classId: scope.classId, courseId: 'advanced' });
const recommended = () => must(O.applyRecommended(plain(), ctx, O.auditRecommended(graph, registry)));
const STRICT = { minimumQuestions: 40, accuracy: 0.95 }, LOOSE = { minimumQuestions: 5, accuracy: 0.5 };
const pathways = {
  'no requirements': plain,
  'class target 40 at 95% (stricter)': () => must(O.applyToClass(plain(), STRICT, ctx)),
  'class target 5 at 50% (looser)': () => must(O.applyToClass(plain(), LOOSE, ctx)),
  'skill target 40 at 95%': () => must(O.applyToSkills(plain(), [NODE], STRICT, ctx)),
  'PR #46 recommended': recommended,
  'PR #46 recommended, presets raised to 40 at 95%': () => must(O.setTierSettings(recommended(), Object.fromEntries(O.TIERS.map((t) => [t.id, { minimumQuestions: Math.max(40, t.minimumQuestions), accuracy: 0.95 }])), ctx)),
  'PR #46 recommended + skill override 40 at 95%': () => must(O.applyToSkills(recommended(), [NODE], STRICT, ctx)),
};
const viewOf = (pathway, evidence = []) => studentContract(publicationSnapshot(pathway, graph, 1), graph, evidence, {});
const input = (pathway, events, evidence) => ({ courseId: 'advanced', nodes: viewOf(pathway, evidence).nodes, policies: pathway.policies, eventsByNode: new Map([[NODE, events]]) });
const legacyLevel = (pathway, events) => evaluateProficiency(input(pathway, events)).skills[NODE].level;
const courseSkill = (pathway, events) => I.evaluateCourseProficiency(input(pathway, events)).skills[NODE];
const policyFor = (pathway) => { const c = pathway.checkpoints.find((x) => x.nodeId === NODE); return assertMasteryPolicy(pathway.policies.find((p) => p.id === c.policyId && p.version === c.policyVersion)); };
const target = (pathway, events, history = emptyHistory(scope, NODE)) => nodeProgress({ node, policy: policyFor(pathway), history, events, now: NOW, policies: pathway.policies.filter((p) => p.challenge).map(assertMasteryPolicy) });

const THIRTY = deepFreeze(answers('intermediate', 30)), FIVE = deepFreeze(answers('intermediate', 5));

/** The property under test, written against any evaluator so the negative controls can swap in broken ones. */
function assertTargetInvariant(evaluateSkill, events, expectedLevel) {
  const results = Object.entries(pathways).map(([name, make]) => [name, evaluateSkill(make(), events)]);
  for (const [name, skill] of results) {
    assert.equal(skill.level, expectedLevel, `${name}: formative level`);
    assert.deepEqual(JSON.parse(JSON.stringify(skill.tiers)), JSON.parse(JSON.stringify(results[0][1].tiers)), `${name}: rubric thresholds and counts`);
    assert.equal(skill.policy, null, `${name}: no class policy is part of the result`);
  }
}

// ------------------------------------------------------------------------------------------------------------ 1. the defect
test('defect reproduced on this branch: a published class or skill target changes the legacy formative level in both directions', () => {
  assert.equal(legacyLevel(pathways['no requirements'](), THIRTY), 3, 'course rubric: 30 correct intermediate answers is Level 3');
  assert.equal(legacyLevel(pathways['class target 40 at 95% (stricter)'](), THIRTY), 1, 'stricter class target lowers the level with identical evidence');
  assert.equal(legacyLevel(pathways['skill target 40 at 95%'](), THIRTY), 1, 'stricter skill target lowers it too');
  assert.equal(legacyLevel(pathways['no requirements'](), FIVE), 1, 'course rubric: 5 answers is Level 1');
  assert.equal(legacyLevel(pathways['class target 5 at 50% (looser)'](), FIVE), 3, 'looser class target raises the level with identical evidence');
  const coupled = evaluateProficiency(input(pathways['class target 40 at 95% (stricter)'](), THIRTY)).skills[NODE];
  assert.deepEqual(coupled.policy, { id: 'policy:req:class', version: 1 });
  assert.equal(coupled.tiers.intermediate.minimumQuestions, 40, 'the teacher number replaced the rubric number');
});

test('scope of the defect: checkpoints that carry a requirement tier (PR #46 starting requirements) are already uncoupled', () => {
  for (const name of ['PR #46 recommended', 'PR #46 recommended, presets raised to 40 at 95%', 'PR #46 recommended + skill override 40 at 95%']) {
    const pathway = pathways[name]();
    assert.ok(Object.hasOwn(pathway.checkpoints.find((c) => c.nodeId === NODE), 'requirementTier'), name);
    assert.equal(legacyLevel(pathway, THIRTY), 3, name);
  }
  assert.ok(!Object.hasOwn(pathways['class target 40 at 95% (stricter)']().checkpoints.find((c) => c.nodeId === NODE), 'requirementTier'), 'the coupled path is a checkpoint without the tier key');
});

// ------------------------------------------------------------------------------------------------------------ 2. the fix
test('course-rubric proficiency is identical under no, stricter, looser, class, skill and preset targets', () => {
  assertTargetInvariant(courseSkill, THIRTY, 3);
  assertTargetInvariant(courseSkill, FIVE, 1);
  assertTargetInvariant(courseSkill, [], 0);
  assert.deepEqual(I.evaluateCourseProficiency(input(plain(), THIRTY)).basis, { evaluator: 'course-rubric', schema: 'cs-games.formative-proficiency/1', rubricVersion: I.evaluateCourseProficiency(input(plain(), [])).version, policy: null });
});

test('where no target is configured the independent result equals the legacy result for every skill of the course (no silent rubric change)', () => {
  const events = new Map([[NODE, THIRTY]]);
  for (const make of [plain, recommended]) {
    const nodes = viewOf(make()).nodes;
    const legacy = evaluateProficiency({ courseId: 'advanced', nodes, policies: make().policies, eventsByNode: events });
    const course = I.evaluateCourseProficiency({ courseId: 'advanced', nodes, eventsByNode: events });
    for (const n of nodes) assert.equal(course.skills[n.id].level, legacy.skills[n.id].level, n.id);
    assert.deepEqual(course.areas, legacy.areas);
  }
});

test('side by side: legacy, course rubric, class target, history and official score are separate and each moves only for its own reason', () => {
  const official = new Map([[NODE, deepFreeze({ id: 'assessment-1', score: 4, recordedAt: '2026-11-01T00:00:00.000Z', evidence: [{ type: 'performance-task' }], policyContext: { id: 'policy:provisional', version: 1 } })]]);
  const table = {};
  for (const [name, make] of Object.entries(pathways)) {
    const pathway = make();
    const t = policyFor(pathway).provisional ? new Map() : new Map([[NODE, target(pathway, THIRTY).progress]]);
    const row = I.compareOutcomes({ ...input(pathway, THIRTY), targetProgress: t, assessments: official }).rows.find((r) => r.nodeId === NODE);
    table[name] = row;
    assert.equal(row.course.level, 3, name);
    assert.deepEqual(row.official, { state: 'recorded', score: 4, recordId: 'assessment-1', recordedAt: '2026-11-01T00:00:00.000Z', evidence: [{ type: 'performance-task' }], policyContext: { id: 'policy:provisional', version: 1 } }, name);
    assert.equal(row.historical.state, 'unavailable', name);
  }
  assert.equal(table['class target 40 at 95% (stricter)'].legacy.level, 1);
  assert.equal(table['class target 40 at 95% (stricter)'].direction, 'legacy-lower');
  assert.equal(table['class target 40 at 95% (stricter)'].target.status, 'in-progress', '30 of 40: the target is not met, which is the only thing a stricter target should change');
  assert.equal(table['class target 5 at 50% (looser)'].target.status, 'requirements-met');
  assert.equal(table['PR #46 recommended'].target.status, 'requirements-met', 'complex reasoning 20 at 90%');
  assert.equal(table['PR #46 recommended, presets raised to 40 at 95%'].target.status, 'in-progress');
  assert.equal(table['no requirements'].target.state, 'not-configured');
  const five = I.compareOutcomes({ ...input(pathways['class target 5 at 50% (looser)'](), FIVE) }).rows.find((r) => r.nodeId === NODE);
  assert.deepEqual([five.legacy.level, five.course.level, five.direction], [3, 1, 'legacy-higher'], 'a looser target no longer inflates the formative level');
});

// ------------------------------------------------------------------------------------------------------------ 3. inputs are not rewritten
test('evaluation and comparison never modify evidence, policies, checkpoints or official records (all inputs deep-frozen)', () => {
  const pathway = deepFreeze(pathways['class target 40 at 95% (stricter)']());
  const nodes = deepFreeze(viewOf(pathway, [{ nodeId: NODE, score: 4, type: 'performance-task', policyId: 'policy:provisional', policyVersion: 1, timestamp: '2026-11-01T00:00:00.000Z', source: { id: 'a1' }, artifactId: 'x', trusted: true }]).nodes);
  const before = JSON.stringify([THIRTY, pathway, nodes]);
  const frozenInput = { courseId: 'advanced', nodes, policies: pathway.policies, eventsByNode: new Map([[NODE, THIRTY]]) };
  I.evaluateCourseProficiency(frozenInput); I.evaluateLegacyProficiency(frozenInput);
  I.compareOutcomes({ ...frozenInput, assessments: new Map([[NODE, deepFreeze({ id: 'a1', score: 4 })]]) });
  assert.equal(JSON.stringify([THIRTY, pathway, nodes]), before);
});

test('an official score shown on a checkpoint is the same under every target, and a recorded zero stays distinct from no score', () => {
  for (const [name, make] of Object.entries(pathways)) {
    const pathway = make();
    const nodes = viewOf(pathway).nodes.map((n) => n.id === NODE ? { ...n, checkpoint: { ...n.checkpoint, score: 0 } } : n);
    const rows = I.compareOutcomes({ courseId: 'advanced', nodes, policies: pathway.policies, eventsByNode: new Map([[NODE, THIRTY]]) }).rows;
    assert.deepEqual(rows.find((r) => r.nodeId === NODE).official, { state: 'recorded', score: 0, recordId: null, recordedAt: null, evidence: null, policyContext: null }, name);
    assert.deepEqual(rows.find((r) => r.nodeId === OTHER).official, { state: 'none', score: null }, name);
    assert.equal(rows.find((r) => r.nodeId === NODE).course.level, 3, name + ': a recorded 0 does not lower the formative level');
  }
});

test('target review state and teacher scores on a checkpoint are separate: review-recommended is a target fact, a recorded score is passed through unchanged', () => {
  const base = viewOf(plain()).nodes;
  const reviewed = base.map((n) => n.id === NODE ? { ...n, masteryChallenge: { ...(n.masteryChallenge ?? {}), status: 'review-recommended' } } : n);
  const withScore = (score) => base.map((n) => n.id === NODE ? { ...n, checkpoint: { ...n.checkpoint, score } } : n);
  const legacy = evaluateProficiency({ courseId: 'advanced', nodes: reviewed, policies: [], eventsByNode: new Map([[NODE, THIRTY]]) });
  assert.equal(legacy.skills[NODE].reviewRecommended, true, 'the legacy result carries the class target\'s review flag as part of the formative result');
  const course = I.evaluateCourseProficiency({ courseId: 'advanced', nodes: reviewed, eventsByNode: new Map([[NODE, THIRTY]]) });
  assert.equal(course.skills[NODE].reviewRecommended, false, 'the course result does not depend on class target state');
  assert.equal(course.recommendation.review.length, 0);
  assert.equal(legacy.recommendation.review.length, 1);
  for (const score of [0, 1, 2, 3, 4]) {
    const row = I.compareOutcomes({ courseId: 'advanced', nodes: withScore(score), eventsByNode: new Map([[NODE, FIVE]]) }).rows.find((r) => r.nodeId === NODE);
    assert.equal(row.official.score, score); assert.equal(row.official.state, 'recorded');
    assert.equal(row.course.level, 1, 'with 5 answers the rubric level is 1 whatever the teacher scored: the two are separate results');
    const strong = I.compareOutcomes({ courseId: 'advanced', nodes: withScore(score), eventsByNode: new Map([[NODE, THIRTY]]) }).rows.find((r) => r.nodeId === NODE);
    assert.equal(strong.course.level, 3, 'and a low or zero score does not lower a rubric level the evidence earned');
  }
});

// ------------------------------------------------------------------------------------------------------------ 4. participation
test('making a skill optional or excluding its area changes class progression inputs, not the skill\'s formative level', () => {
  const pathway = plain();
  const required = viewOf(pathway).nodes;
  const optional = required.map((n) => n.id === NODE ? { ...n, checkpoint: { ...n.checkpoint, required: false } } : n);
  const excludedArea = required.filter((n) => n.areaId !== node.areaId || n.id === NODE);   // only this skill left from its area
  const lone = [required.find((n) => n.id === NODE)];
  const levels = [required, optional, excludedArea, lone].map((nodes) => I.evaluateCourseProficiency({ courseId: 'advanced', nodes, eventsByNode: new Map([[NODE, THIRTY]]) }).skills[NODE]);
  for (const s of levels) { assert.equal(s.level, 3); assert.deepEqual(s.tiers, levels[0].tiers); }
  const evalArea = (nodes) => I.evaluateCourseProficiency({ courseId: 'advanced', nodes, eventsByNode: new Map([[NODE, THIRTY]]) }).areas[node.areaId];
  assert.notDeepEqual(evalArea(required).missing, evalArea(lone).missing, 'area readiness follows the class\'s included skills (a class fact, reported separately)');
});

// ------------------------------------------------------------------------------------------------------------ 5. evidence rules
test('Mixed Practice, duplicates, retries and out-of-order offline replay give the same course result as the plain evidence', () => {
  const base = courseSkill(plain(), THIRTY);
  const asMixed = THIRTY.map((e) => ({ ...e, mode: 'mixed', selectedMode: 'mixed' }));
  assert.equal(courseSkill(plain(), asMixed).level, 3);
  assert.deepEqual(courseSkill(plain(), asMixed).tiers, base.tiers, 'the difficulty window and counts do not depend on the selected mode label');
  const duplicated = [...THIRTY, ...THIRTY, ...THIRTY.slice(0, 10)];
  const dup = courseSkill(plain(), duplicated);
  assert.deepEqual(dup.tiers, base.tiers, 'duplicates add nothing; the evaluator stops counting once the rubric is met');
  assert.equal(dup.level, 3); assert.equal(dup.evidenceQuality.duplicates, 40);
  const retries = THIRTY.slice(0, 10).map((e) => ({ ...e, id: e.questionId + ':2', attempt: 2, firstAttempt: false }));
  assert.equal(courseSkill(plain(), [...FIVE, ...retries]).level, 1, 'second attempts add no first-attempt evidence');
  const shuffled = [...THIRTY].reverse();
  assert.deepEqual(courseSkill(plain(), shuffled).tiers, base.tiers, 'arrival order does not matter');
  for (const make of Object.values(pathways)) assert.deepEqual(courseSkill(make(), duplicated).tiers, courseSkill(plain(), duplicated).tiers);
});

test('restarting a class target attempt changes the target only; the course evaluator sees the same evidence and gives the same level', () => {
  const pathway = pathways['class target 40 at 95% (stricter)']();
  const first = target(pathway, THIRTY);
  assert.equal(first.progress.attempt.attempted, 30);
  const restarted = restartAttempt(first.history, { requestId: 'r1', policy: policyFor(pathway), events: THIRTY, now: NOW, policies: [] });
  const after = target(pathway, THIRTY, restarted.history);
  assert.equal(after.progress.attempt?.attempted ?? 0, 0, 'the new target attempt starts empty');
  assert.equal(after.progress.lifetime.restarts, 1);
  assert.equal(courseSkill(pathway, THIRTY).level, 3, 'the course level is untouched by the restart');
  assert.deepEqual(courseSkill(pathway, THIRTY).tiers, courseSkill(plain(), THIRTY).tiers, 'the same evidence reaches the course evaluator before and after the restart');
});

// ------------------------------------------------------------------------------------------------------------ 6. history
test('level history is append-only and idempotent, and keeps each result with its original policy context', () => {
  const v1 = pathways['class target 5 at 50% (looser)'](), ctx1 = { policy: { id: 'policy:req:class', version: 1 }, pathwayRevision: 3 };
  const legacy = evaluateProficiency(input(v1, FIVE)).skills[NODE];
  let h = deepFreeze(I.emptyLevelHistory(scope));
  const h1 = I.recordLevel(h, { nodeId: NODE, skill: legacy, evaluator: 'legacy-coupled', ...ctx1, evidence: { count: 5, lastEventId: FIVE[4].id }, recordedAt: '2026-10-01T00:00:00.000Z' });
  assert.equal(h.entries.length, 0, 'the earlier history object is not modified');
  assert.equal(I.recordLevel(h1, { nodeId: NODE, skill: legacy, evaluator: 'legacy-coupled', ...ctx1, evidence: { count: 5, lastEventId: FIVE[4].id }, recordedAt: '2026-10-02T00:00:00.000Z' }), h1, 'the same result in the same context adds nothing');
  const current = courseSkill(v1, FIVE);
  const h2 = I.recordLevel(deepFreeze(h1), { nodeId: NODE, skill: current, evaluator: 'course-rubric', pathwayRevision: 4, evidence: { count: 5, lastEventId: FIVE[4].id }, recordedAt: '2026-11-15T00:00:00.000Z' });
  assert.equal(h2.entries.length, 2);
  assert.deepEqual(h2.entries[0], h1.entries[0], 'the older entry is unchanged');
  assert.deepEqual([h2.entries[0].level, h2.entries[0].policy, h2.entries[0].pathwayRevision, h2.entries[0].evaluator], [3, { id: 'policy:req:class', version: 1 }, 3, 'legacy-coupled']);
  assert.deepEqual([h2.entries[1].level, h2.entries[1].policy, h2.entries[1].evaluator], [1, null, 'course-rubric']);
  assert.throws(() => I.recordLevel(h2, { nodeId: NODE, skill: current, evaluator: 'course-rubric', policy: ctx1.policy, recordedAt: NOW }), /no class policy context/);
  assert.throws(() => I.recordLevel(h2, { nodeId: NODE, skill: current, evaluator: 'guessed', recordedAt: NOW }), /Unknown evaluator/);
  assert.throws(() => I.recordLevel(h2, { nodeId: OTHER, skill: current, evaluator: 'course-rubric', recordedAt: NOW }), /skill result for this node/);
});

test('CSG-DEC-14: progression earned under an older policy revision is carried forward and labelled, while the current level is shown accurately', () => {
  const v1 = pathways['class target 5 at 50% (looser)']();
  let h = I.recordLevel(I.emptyLevelHistory(scope), { nodeId: NODE, skill: evaluateProficiency(input(v1, FIVE)).skills[NODE], evaluator: 'legacy-coupled', policy: { id: 'policy:req:class', version: 1 }, pathwayRevision: 3, evidence: { count: 5 }, recordedAt: '2026-10-01T00:00:00.000Z' });
  const v2 = pathways['class target 40 at 95% (stricter)']();   // the teacher later publishes a stricter revision
  const row = I.compareOutcomes({ ...input(v2, FIVE), levelHistory: h }).rows.find((r) => r.nodeId === NODE);
  assert.equal(row.course.level, 1, 'current formative level is the course-rubric level');
  assert.deepEqual(row.progression, { earned: true, source: 'historical', carriedForward: true, historical: 'recorded', currentLevel: 1,
    earnedUnder: { evaluator: 'legacy-coupled', rubricVersion: row.course.basis.rubricVersion, policy: { id: 'policy:req:class', version: 1 }, pathwayRevision: 3, recordedAt: '2026-10-01T00:00:00.000Z', level: 3 } });
  assert.equal(row.historical.entries[0].provenance, 'complete');
  const met = I.compareOutcomes({ ...input(v2, THIRTY), levelHistory: h }).rows.find((r) => r.nodeId === NODE);
  assert.deepEqual([met.progression.earned, met.progression.source, met.progression.carriedForward], [true, 'current', false]);
});

test('incomplete history is reported as unavailable or incomplete; no level is invented and none is taken away', () => {
  const none = I.compareOutcomes({ ...input(plain(), FIVE), levelHistory: null }).rows.find((r) => r.nodeId === NODE);
  assert.deepEqual(none.historical, { state: 'unavailable', reason: 'no-level-history-kept', entries: [] });
  assert.deepEqual(none.progression, { earned: false, source: null, carriedForward: false, historical: 'unavailable', earnedUnder: null, currentLevel: 1 });
  const otherOnly = I.recordLevel(I.emptyLevelHistory(scope), { nodeId: OTHER, skill: { nodeId: OTHER, level: 3, goalMet: true }, evaluator: 'course-rubric', recordedAt: NOW });
  assert.equal(I.historicalFor(otherOnly, NODE).reason, 'no-recorded-result-for-this-skill');
  const bare = I.recordLevel(I.emptyLevelHistory(scope), { nodeId: NODE, skill: { nodeId: NODE, level: 3, goalMet: true }, evaluator: 'legacy-coupled', recordedAt: '2026-09-01T00:00:00.000Z' });
  const entry = I.historicalFor(bare, NODE).entries[0];
  assert.equal(entry.provenance, 'incomplete'); assert.equal(entry.policy, null); assert.equal(entry.pathwayRevision, null);
  const met = I.compareOutcomes({ ...input(plain(), THIRTY), levelHistory: null }).rows.find((r) => r.nodeId === NODE);
  assert.deepEqual([met.progression.earned, met.progression.source, met.progression.historical], [true, 'current', 'unavailable'], 'current evidence still counts without history');
  // The service's status history holds a pathway status and a digest only, so it cannot supply a per-skill level.
  const schema = fs.readFileSync(new URL('../../../wpr-games/workplace-readiness/service/migrations/0004_integrated_progress.sql', import.meta.url), 'utf8');
  const table = schema.slice(schema.indexOf('pathway_status_history')).split(';')[0];
  assert.ok(!/level|node_id|proficiency/i.test(table), 'if a per-skill level column appears here, revisit the "unavailable" rule');
});

// ------------------------------------------------------------------------------------------------------------ 7. proposed migration
test('the proposed migration is additive, append-only and removable; existing tables and rows are untouched', async (t) => {
  const { server, db } = await startDev({ teacherTokens: { teacher: 'fable-migration-teacher-secret-0001' } });
  t.after(() => { server.close(); db.close(); });
  const objects = () => db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
  db.exec("INSERT INTO profile_classes(id,owner,title,invite,created,expires) VALUES('c1','teacher','Period 3','INVITE1',1,9999999999999)");
  db.exec("INSERT INTO student_profiles(id,class_id,recovery,created) VALUES('p1','c1','r',1)");
  db.exec("INSERT INTO performance_events(profile,id,version,pathway,activity,kind,occurred,data) VALUES('p1','a1',1,'advanced','teacher-assessment','assessment',1,'{\"score\":4}')");
  const before = objects(), rowsBefore = db.prepare('SELECT * FROM performance_events').all();
  const sql = fs.readFileSync(new URL('../proficiency/migration/0009_formative_level_history.proposed.sql', import.meta.url), 'utf8');
  db.exec(sql); db.exec(sql);   // re-runnable
  const added = objects().filter((o) => !before.some((b) => b.name === o.name));
  assert.deepEqual(added.map((o) => o.name).sort(), ['formative_level_history', 'formative_level_history_immutable', 'formative_level_history_profile']);
  assert.deepEqual(objects().filter((o) => before.some((b) => b.name === o.name)), before, 'no existing object changed');
  assert.deepEqual(db.prepare('SELECT * FROM performance_events').all(), rowsBefore);
  const h = I.recordLevel(I.emptyLevelHistory(scope), { nodeId: NODE, skill: { nodeId: NODE, level: 3, goalMet: true }, evaluator: 'legacy-coupled', policy: { id: 'policy:req:class', version: 1 }, pathwayRevision: 3, recordedAt: NOW });
  const put = db.prepare('INSERT OR IGNORE INTO formative_level_history(profile_id,node_id,entry_key,evaluator,level,body,recorded) VALUES(?,?,?,?,?,?,?)');
  const e = h.entries[0];
  for (let i = 0; i < 3; i++) put.run('p1', e.nodeId, 'k1', e.evaluator, e.level, JSON.stringify(e), 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM formative_level_history').get().n, 1, 'replays do not duplicate');
  assert.throws(() => db.exec("UPDATE formative_level_history SET level=4"), /append-only/);
  assert.throws(() => db.exec("INSERT INTO formative_level_history VALUES('p1','n','k2','invented',3,'{}',1)"), /CHECK/);
  assert.deepEqual(JSON.parse(db.prepare('SELECT body FROM formative_level_history').get().body), e, 'the stored entry round-trips');
  db.exec('DROP TRIGGER formative_level_history_immutable; DROP INDEX formative_level_history_profile; DROP TABLE formative_level_history;');
  assert.deepEqual(objects(), before, 'rollback restores the schema exactly');
});

// ------------------------------------------------------------------------------------------------------------ 8. negative controls
test('negative controls: the tests detect coupling, inflation, history loss, invented history and a rewritten official score', () => {
  // (a) the legacy evaluator is the coupled implementation: the invariance property must reject it, in both directions.
  const legacySkill = (pathway, events) => evaluateProficiency(input(pathway, events)).skills[NODE];
  assert.throws(() => assertTargetInvariant(legacySkill, THIRTY, 3), /stricter|formative level|skill target/, 'coupling (stricter) must be detected');
  assert.throws(() => assertTargetInvariant(legacySkill, FIVE, 1), /formative level|rubric thresholds/, 'a target that changes what the rubric reports (looser or stricter) must be detected');
  const looseOnly = (pathway, events) => legacySkill(pathways['class target 5 at 50% (looser)'](), events);
  assert.throws(() => assertTargetInvariant(looseOnly, FIVE, 1), /formative level/, 'inflation by a looser target must be detected on its own');
  // (b) an evaluator that keeps the level but leaks the teacher thresholds into the result is rejected too.
  const leaky = (pathway, events) => ({ ...courseSkill(pathway, events), tiers: legacySkill(pathway, events).tiers });
  assert.throws(() => assertTargetInvariant(leaky, THIRTY, 3), /rubric thresholds/);
  // (c) a recorder that overwrites loses the earlier result: the carry-forward check fails on it.
  const overwrite = (history, entry) => ({ ...history, entries: [I.recordLevel(I.emptyLevelHistory(scope), entry).entries[0]] });
  const first = { nodeId: NODE, skill: { nodeId: NODE, level: 3, goalMet: true }, evaluator: 'legacy-coupled', policy: { id: 'policy:req:class', version: 1 }, pathwayRevision: 3, recordedAt: '2026-10-01T00:00:00.000Z' };
  const second = { nodeId: NODE, skill: { nodeId: NODE, level: 1, goalMet: false }, evaluator: 'course-rubric', pathwayRevision: 4, recordedAt: '2026-11-15T00:00:00.000Z' };
  const kept = I.recordLevel(I.recordLevel(I.emptyLevelHistory(scope), first), second);
  const lost = overwrite(overwrite(I.emptyLevelHistory(scope), first), second);
  assert.equal(I.carriedProgression(kept, NODE, { level: 1 }).carriedForward, true);
  assert.equal(I.carriedProgression(lost, NODE, { level: 1 }).earned, false, 'with the overwriting recorder the earned progression is gone, which the DEC-14 test would report');
  // (d) inventing a level for a learner with no history differs from the required "unavailable".
  const invented = (history, nodeId, current) => ({ ...I.carriedProgression(history, nodeId, current), historical: 'recorded', earned: true });
  assert.notDeepEqual(invented(null, NODE, { level: 1 }), I.carriedProgression(null, NODE, { level: 1 }));
  // (e) a target change that rewrote the official record would break the frozen-input test: mutation of a frozen record throws.
  const record = deepFreeze({ id: 'a1', score: 4 });
  assert.throws(() => { 'use strict'; record.score = 2; }, TypeError);
});
