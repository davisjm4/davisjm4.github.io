// Teacher-controlled mastery requirements: drafts, change summaries, explicit publishing, new policy versions, preserved history,
// checkpoint references, and compatibility with the existing pathway structures and the shared service's rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { R, graph, facts, classPathway, ctxFor, pct, must, policyById, checkpointOf, resolved, reqPolicies, publishDraft, AREA, NODE, PUBLISH_AT } from './lib/requirements-fixtures.mjs';
import { validatePathway, diffPathways, studentContract, pacingStatus, evaluateNode, clone } from '../model.mjs';
import { createMemoryAdapter, createServiceAdapter, assertPublishedVersionsUnchanged } from '../../teacher/requirements/adapter.mjs';

const snapshot = (x) => JSON.stringify(x);
const LATER = '2026-12-15T08:00:00.000Z';
const classAt = (q, a, p, published = null) => must(R.applyToClass(p, { minimumQuestions: q, accuracy: pct(a) }, ctxFor({ published })));
const versionsOf = (p, id) => p.policies.filter((x) => x.id === id).map((x) => x.version).sort((a, b) => a - b);
const refsResolve = (p) => p.checkpoints.every((c) => p.policies.some((x) => x.id === c.policyId && x.version === c.policyVersion));

// ---- drafts ---------------------------------------------------------------------------------------------------------
test('drafts: editing before anything is published reuses version 1 in place and activates nothing', () => {
  let p = classAt(30, 90, classPathway());
  p = classAt(35, 90, p); p = classAt(40, 95, p);
  assert.deepEqual(versionsOf(p, R.CLASS_POLICY_ID), [1], 'an unpublished draft never piles up versions');
  assert.equal(policyById(p, R.CLASS_POLICY_ID).minimumQuestions, 40);
  assert.equal(policyById(p, R.CLASS_POLICY_ID).effectiveFrom, null, 'no policy takes effect until the teacher publishes');
  assert.ok(reqPolicies(p).every((x) => x.effectiveFrom === null));
});

test('drafts: a draft with a warning-level problem can be saved; one with a blocked setting cannot', () => {
  const ok = R.applyToSkills(classAt(30, 90, classPathway()), [NODE.trace2d], { families: { minDistinct: 11, minCorrectEach: 1 } }, ctxFor());
  assert.equal(ok.ok, true, 'expandable content: saved as a draft with a warning');
  assert.equal(R.reviewRequirements(ok.pathway, null, graph, { facts }).readiness.canSaveDraft, true);
  const bad = R.applyToSkills(classAt(30, 90, classPathway()), [NODE.division], { difficulties: [{ difficulty: 'advanced', minQuestions: 3, minCorrect: 0 }] }, ctxFor());
  assert.equal(bad.ok, false);
});

// ---- change summary -------------------------------------------------------------------------------------------------
test('change summary: the first draft is described as new, in plain words, with who is affected', () => {
  const p = classAt(30, 90, classPathway());
  const d = R.differences(p, null, graph);
  assert.equal(d.levels.length, 1); assert.equal(d.levels[0].change, 'added');
  assert.equal(d.levels[0].text, 'Class defaults: new setting, 30 questions at 90%.');
  assert.equal(d.changed, 123); assert.equal(d.skills.length, 16, 'one line per learning area');
  assert.ok(d.skills.every((g) => /skills? in .+: 30 questions at 90%\.$/.test(g.text)));
  assert.doesNotMatch(JSON.stringify(d), /node:|policy:|area:advanced/);
});

test('change summary: after publishing, only what actually changed is listed, with the old and new values', () => {
  const { draft, published } = publishDraft(classAt(30, 90, classPathway()), null);
  let p = must(R.applyToAreas(draft, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctxFor({ published })));
  p = must(R.applyToSkills(p, [NODE.modulus], { accuracy: pct(80) }, ctxFor({ published })));
  const d = R.differences(p, published, graph);
  assert.deepEqual(d.levels.map((l) => [l.name, l.change]), [['Math Lab', 'added'], ['Modulus', 'added']]);
  assert.equal(d.changed, 7);
  const math = d.skills.find((g) => g.area === 'Math Lab' && g.skills.length === 6);
  assert.ok(math); assert.equal(math.was, '30 questions at 90%'); assert.equal(math.now, '50 questions at 95%');
  assert.match(math.text, /^6 skills in Math Lab: 50 questions at 95% \(was 30 questions at 90%\)\.$/);
  assert.ok(d.skills.some((g) => g.skills.join() === 'Modulus' && g.now === '50 questions at 80%'));
  const removed = R.differences(must(R.resetToInherited(p, { level: 'area', ids: [AREA.math] }, ctxFor({ published }))), published, graph);
  assert.deepEqual(removed.levels.map((l) => l.name), ['Modulus'], 'an area override that existed only in the draft leaves no trace');
});

test('change summary: removing a published override says it now follows the level above', () => {
  const a = must(R.applyToAreas(classAt(30, 90, classPathway()), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctxFor()));
  const { draft, published } = publishDraft(a, null);
  const p = must(R.resetToInherited(draft, { level: 'area', ids: [AREA.math] }, ctxFor({ published })));
  const d = R.differences(p, published, graph);
  assert.equal(d.levels.length, 1); assert.equal(d.levels[0].change, 'removed');
  assert.match(d.levels[0].text, /Math Lab: own setting removed \(was 50 questions at 95%\); it now follows the level above\./);
  assert.match(d.skills[0].text, /7 skills in Math Lab: 30 questions at 90% \(was 50 questions at 95%\)\./);
});

// ---- explicit publish and new versions --------------------------------------------------------------------------------
test('publishing is explicit: stamping sets the effective time on new requirement versions only, once', () => {
  const draft = must(R.applyToAreas(classAt(30, 90, classPathway()), [AREA.math], { accuracy: pct(95) }, ctxFor()));
  const stamped = R.stampPublishTime(draft, null, PUBLISH_AT);
  assert.ok(reqPolicies(stamped).every((x) => x.effectiveFrom === PUBLISH_AT));
  assert.equal(policyById(stamped, 'policy:provisional').effectiveFrom, undefined, 'the provisional policy is not a teacher requirement and is left as it was');
  assert.equal(snapshot(R.stampPublishTime(stamped, stamped, LATER)), snapshot(stamped), 'versions already published keep their original time');
  assert.equal(policyById(draft, R.CLASS_POLICY_ID).effectiveFrom, null, 'stamping returns a copy; the draft is not changed');
});

test('a published version is never edited: the first change creates the next version and the old one stays byte-for-byte', () => {
  const { draft, published } = publishDraft(classAt(30, 90, classPathway()), null);
  const v1 = snapshot(policyById(draft, R.CLASS_POLICY_ID, 1));
  const p = classAt(40, 95, draft, published);
  assert.deepEqual(versionsOf(p, R.CLASS_POLICY_ID), [1, 2]);
  assert.equal(snapshot(policyById(p, R.CLASS_POLICY_ID, 1)), v1, 'version 1 is exactly as published');
  assert.equal(policyById(p, R.CLASS_POLICY_ID, 2).minimumQuestions, 40);
  assert.equal(policyById(p, R.CLASS_POLICY_ID, 2).effectiveFrom, null);
  assert.ok(p.checkpoints.every((c) => c.policyId === R.CLASS_POLICY_ID && c.policyVersion === 2), 'every inheriting skill now references version 2');
  assert.ok(published.checkpoints.every((c) => c.policyVersion === 1), 'the published revision still references version 1');
  assert.equal(snapshot(published), snapshot(publishDraft(draft, null).published), 'the published object itself was not touched');
});

test('further edits before the next publish change the draft version in place, then publish creates a clean history', () => {
  const r1 = publishDraft(classAt(30, 90, classPathway()), null);
  let p = classAt(40, 95, r1.draft, r1.published);
  p = classAt(45, 95, p, r1.published); p = classAt(50, 95, p, r1.published);
  assert.deepEqual(versionsOf(p, R.CLASS_POLICY_ID), [1, 2], 'three edits before publishing make one new version');
  const r2 = publishDraft(p, r1.published, LATER);
  assert.equal(policyById(r2.published, R.CLASS_POLICY_ID, 2).minimumQuestions, 50); assert.equal(policyById(r2.published, R.CLASS_POLICY_ID, 2).effectiveFrom, LATER);
  assert.equal(policyById(r2.published, R.CLASS_POLICY_ID, 1).effectiveFrom, PUBLISH_AT, 'version 1 keeps its own effective time');
  const p3 = classAt(55, 95, r2.draft, r2.published);
  assert.deepEqual(versionsOf(p3, R.CLASS_POLICY_ID), [1, 2, 3]);
  assert.ok(refsResolve(p3));
});

test('every earlier version stays available: nothing is deleted when requirements change many times', () => {
  let { draft, published } = publishDraft(classAt(30, 90, classPathway()), null);
  const seen = [snapshot(policyById(draft, R.CLASS_POLICY_ID, 1))];
  for (const [q, a, at] of [[40, 90, '2026-12-01T08:00:00.000Z'], [40, 95, '2026-12-08T08:00:00.000Z'], [25, 95, LATER]]) {
    draft = classAt(q, a, draft, published);
    ({ draft, published } = publishDraft(draft, published, at));
    seen.push(snapshot(policyById(draft, R.CLASS_POLICY_ID, seen.length + 1)));
  }
  assert.deepEqual(versionsOf(published, R.CLASS_POLICY_ID), [1, 2, 3, 4]);
  seen.forEach((s, i) => assert.equal(snapshot(policyById(published, R.CLASS_POLICY_ID, i + 1)), s, `version ${i + 1} unchanged`));
  assert.deepEqual([1, 2, 3, 4].map((v) => policyById(published, R.CLASS_POLICY_ID, v).minimumQuestions), [30, 40, 40, 25]);
  assert.equal(published.revision, 4);
});

test('restoring a published override to inherited adds a retired marker instead of deleting the old version', () => {
  const a = must(R.applyToAreas(classAt(30, 90, classPathway()), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctxFor()));
  const { draft, published } = publishDraft(a, null);
  const areaId = `policy:req:area:${AREA.math}`;
  const p = must(R.resetToInherited(draft, { level: 'area', ids: [AREA.math] }, ctxFor({ published })));
  assert.deepEqual(versionsOf(p, areaId), [1, 2]);
  assert.equal(policyById(p, areaId, 1).minimumQuestions, 50, 'the old version is preserved');
  assert.equal(policyById(p, areaId, 2).requirementSource.retired, true); assert.equal(policyById(p, areaId, 2).provisional, true);
  assert.equal(resolved(p, NODE.modulus).effective.minimumQuestions, 30);
  assert.equal(checkpointOf(p, NODE.modulus).policyId, R.CLASS_POLICY_ID);
  assert.ok(refsResolve(p));
  const back = must(R.applyToAreas(p, [AREA.math], { minimumQuestions: 60, accuracy: pct(97) }, ctxFor({ published })));
  assert.deepEqual(versionsOf(back, areaId), [1, 2], 'setting it again before publishing reuses the draft marker version');
  assert.equal(policyById(back, areaId, 2).minimumQuestions, 60); assert.equal(policyById(back, areaId, 2).requirementSource.retired, undefined);
});

test('turning requirements off after publishing leaves skills with no requirement, never with a stale one', () => {
  const { draft, published } = publishDraft(classAt(30, 90, classPathway()), null);
  const p = must(R.resetToInherited(draft, { level: 'class' }, ctxFor({ published })));
  assert.ok(p.checkpoints.every((c) => c.policyId === 'policy:provisional'));
  assert.ok(R.resolveAll(p, graph).every((r) => r.complete === false));
  assert.equal(policyById(p, R.CLASS_POLICY_ID, 1).minimumQuestions, 30, 'the published version stays in the history');
  assert.equal(policyById(p, R.CLASS_POLICY_ID).requirementSource.retired, true);
});

test('repeating an edit after publishing creates no new version, and re-deriving a published pathway changes nothing', () => {
  const { draft, published } = publishDraft(must(R.applyToAreas(classAt(30, 90, classPathway()), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctxFor())), null);
  const ctx = ctxFor({ published });
  const again = R.applyToAreas(draft, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx);
  assert.equal(again.ok, true); assert.deepEqual(again.changed, []); assert.equal(snapshot(again.pathway), snapshot(draft), 'the same numbers typed again are not a change');
  assert.equal(snapshot(R.rematerialize(draft, ctx)), snapshot(draft));
  assert.equal(snapshot(R.rematerialize(published, ctx)), snapshot(published), 'a published revision is already consistent');
  assert.deepEqual(R.verifyConsistency(published, ctx), { consistent: true, drift: [] });
  const sameClass = R.applyToClass(draft, { minimumQuestions: 30, accuracy: pct(90) }, ctx);
  assert.deepEqual(versionsOf(sameClass.pathway, R.CLASS_POLICY_ID), [1]);
});

test('pending versions are listed for the review: only requirement versions the published revision does not have', () => {
  const { draft, published } = publishDraft(classAt(30, 90, classPathway()), null);
  assert.deepEqual(R.unpublishedPolicies(draft, published), []);
  const p = must(R.applyToAreas(classAt(40, 90, draft, published), [AREA.math], { accuracy: pct(95) }, ctxFor({ published })));
  assert.deepEqual(R.unpublishedPolicies(p, published).map((x) => `${x.id}@${x.version}`).sort(), [`policy:req:area:${AREA.math}@1`, 'policy:req:class@2']);
  assert.deepEqual(R.reviewRequirements(p, published, graph, { facts }).pendingPolicies.map((x) => x.version).sort(), [1, 2]);
});

// ---- checkpoint references -----------------------------------------------------------------------------------------------
test('checkpoint references always resolve to an existing policy and version, through every kind of edit', () => {
  let p = classPathway(); assert.ok(refsResolve(p));
  const ctx = () => ctxFor();
  const steps = [
    (x) => R.applyToClass(x, { minimumQuestions: 30, accuracy: pct(90) }, ctx()),
    (x) => R.applyToAreas(x, [AREA.math, AREA.array], { accuracy: pct(95) }, ctx()),
    (x) => R.applyToSkills(x, [NODE.modulus, NODE.trace2d], { minimumQuestions: 12 }, ctx()),
    (x) => R.copyAreaSettings(x, AREA.math, [AREA.loop], ctx()),
    (x) => R.resetToInherited(x, { level: 'skill', ids: [NODE.modulus] }, ctx()),
    (x) => R.resetToInherited(x, { level: 'class' }, ctx()),
  ];
  for (const step of steps) { p = must(step(p)); assert.ok(refsResolve(p)); assert.doesNotThrow(() => validatePathway(p, graph, { validateSessions: false, validateTargets: false })); }
});

test('a checkpoint points at the most specific level: the skill, else its area, else the class, else provisional', () => {
  let p = classAt(30, 90, classPathway());
  p = must(R.applyToAreas(p, [AREA.math], { accuracy: pct(95) }, ctxFor()));
  p = must(R.applyToSkills(p, [NODE.modulus], { minimumQuestions: 12 }, ctxFor()));
  assert.equal(checkpointOf(p, NODE.modulus).policyId, `policy:req:skill:${NODE.modulus}`);
  assert.equal(checkpointOf(p, NODE.division).policyId, `policy:req:area:${AREA.math}`);
  assert.equal(checkpointOf(p, 'node:advanced:variable-lab:trace').policyId, R.CLASS_POLICY_ID);
  assert.equal(checkpointOf(classPathway(), NODE.modulus).policyId, 'policy:provisional');
});

// ---- compatibility with what already exists --------------------------------------------------------------------------
test('a pathway written before this feature is left exactly as it was: nothing is rewritten, nothing activated', () => {
  const before = classPathway();
  assert.equal(snapshot(R.rematerialize(before, ctxFor())), snapshot(before));
  assert.deepEqual(R.verifyConsistency(before, ctxFor()), { consistent: true, drift: [] });
  const legacy = classPathway(); legacy.policies.push({ id: 'policy:legacy', version: 1, provisional: false, label: 'old', minimumQuestions: 20, accuracy: 0.9, coverage: { a: 1 }, scoreTarget: 3 });
  const c = checkpointOf(legacy, NODE.modulus); c.policyId = 'policy:legacy'; c.policyVersion = 1;
  assert.equal(snapshot(R.rematerialize(legacy, ctxFor())), snapshot(legacy), 'a pathway using the older editor\'s policies is unchanged by merely opening it here');
});

test('the stored pathway still passes the existing validation and diff, and the student contract carries the policies', () => {
  const before = classPathway();
  const after = must(R.applyToAreas(classAt(30, 90, before), [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctxFor()));
  assert.doesNotThrow(() => validatePathway(after, graph, { validateSessions: false, validateTargets: false }));
  assert.doesNotThrow(() => validatePathway(after, graph));
  const diff = diffPathways(before, after);
  assert.ok(diff.some((d) => d.kind === 'policies')); assert.ok(diff.some((d) => d.kind === 'policyId' || d.kind === 'policyVersion'));
  const contract = studentContract(after, graph, [], { today: '2026-12-01' });
  assert.equal(contract.policies.filter((x) => x.id.startsWith('policy:req:')).length, 2);
  assert.equal(contract.nodes.length, 123);
  const pace = pacingStatus(after, [], { today: '2026-12-01' });
  assert.equal(pace.checkpoints.length, 123);
});

test('the existing completion logic accepts a teacher policy as an ordinary policy, and agrees where it can', () => {
  const p = must(R.applyToClass(classPathway(), { minimumQuestions: 30, accuracy: pct(90) }, ctxFor()));
  const policy = p.policies.find((x) => x.id === R.CLASS_POLICY_ID);
  const q = (i, correct) => ({ id: `e${i}`, kind: 'question', nodeIds: [NODE.modulus], eligible: true, firstAttempt: true, familyId: 'modulus:a', questionId: `q${i}`, sessionId: 's', correct });
  const ev = (correctCount) => Array.from({ length: 30 }, (_, i) => q(i, i < correctCount));
  assert.equal(evaluateNode(NODE.modulus, policy, ev(27)).completion, 'complete');
  assert.equal(evaluateNode(NODE.modulus, policy, ev(26)).completion, 'incomplete');
  assert.equal(evaluateNode(NODE.modulus, policy, ev(27)).score, null, 'completing practice gives no 0-4 score');
});

test('published curriculum snapshots, the schedule and the sessions are not touched by any requirement edit', () => {
  const base = classPathway(); base.curriculumSnapshot = { version: graph.version, nodes: graph.nodes, areas: graph.areas };
  const strip = (p) => snapshot({ curriculumSnapshot: p.curriculumSnapshot, calendar: p.calendar, sessions: p.sessions, sequence: p.sequence, customNodes: p.customNodes, customAreas: p.customAreas, examDate: p.examDate, graphVersion: p.graphVersion });
  let p = classAt(30, 90, base); p = must(R.applyToAreas(p, [AREA.math], { accuracy: pct(95) }, ctxFor()));
  assert.equal(strip(p), strip(base));
  assert.equal(R.resolveAll(p, graph).length, 123, 'titles still come from the pinned snapshot');
});

// ---- the service's rule, through the adapter -----------------------------------------------------------------------------
test('adapter: a normal edit, publish, edit, publish sequence is accepted and keeps a revision history', async () => {
  const start = classAt(30, 90, classPathway());
  const adapter = createMemoryAdapter({ pathway: start, now: () => PUBLISH_AT });
  await adapter.saveDraft(start);
  const out1 = await adapter.publish({ pathway: R.stampPublishTime(start, null, PUBLISH_AT) });
  assert.match(out1.message, /Published version 1/);
  const edited = classAt(40, 95, out1.pathway, out1.published);
  await adapter.saveDraft(edited);
  const out2 = await adapter.publish({ pathway: R.stampPublishTime(edited, out1.published, LATER) });
  assert.match(out2.message, /Published version 2/);
  const history = await adapter.history();
  assert.deepEqual(history.map((h) => h.revision), [1, 2]);
  assert.deepEqual(versionsOf(out2.published, R.CLASS_POLICY_ID), [1, 2]);
  assert.equal(adapter.state.published.revision, 2);
});

test('adapter: changing a published version in place is refused, exactly like the shared service', async () => {
  const start = classAt(30, 90, classPathway());
  const adapter = createMemoryAdapter({ pathway: start });
  const out = await adapter.publish({ pathway: R.stampPublishTime(start, null, PUBLISH_AT) });
  const tampered = clone(out.pathway); policyById(tampered, R.CLASS_POLICY_ID, 1).minimumQuestions = 99;
  await assert.rejects(adapter.saveDraft(tampered), /Create a new mastery policy version/);
  await assert.rejects(adapter.publish({ pathway: tampered }), /Create a new mastery policy version/);
  assert.throws(() => assertPublishedVersionsUnchanged(out.published, tampered), /new mastery policy version/);
  assert.doesNotThrow(() => assertPublishedVersionsUnchanged(out.published, classAt(40, 90, out.pathway, out.published)));
  assert.equal(adapter.state.published.revision, 1, 'a refused publish creates no revision');
});

test('the operations themselves never produce an edit the service would refuse, across a long sequence', () => {
  let { draft, published } = publishDraft(classAt(30, 90, classPathway()), null);
  const ctx = () => ctxFor({ published });
  const steps = [
    (x) => R.applyToAreas(x, [AREA.math], { minimumQuestions: 50, accuracy: pct(95) }, ctx()),
    (x) => R.applyToSkills(x, [NODE.modulus], { accuracy: pct(80) }, ctx()),
    (x) => R.applyToClass(x, { minimumQuestions: 35, accuracy: pct(92.5) }, ctx(), { replaceLowerOverrides: true }),
    (x) => R.resetToInherited(x, { level: 'area', ids: [AREA.math] }, ctx()),
    (x) => R.copyAreaSettings(R.applyToAreas(x, [AREA.array], { accuracy: pct(99) }, ctx()).pathway, AREA.array, [AREA.loop], ctx()),
    (x) => R.resetToInherited(x, { level: 'class' }, ctx()),
  ];
  for (const step of steps) { draft = must(step(draft)); assert.doesNotThrow(() => assertPublishedVersionsUnchanged(published, draft)); }
});

test('"no unapproved policy is activated": nothing sets an effective time or a revision unless the teacher publishes', () => {
  let p = classPathway();
  for (const step of [(x) => R.applyToClass(x, { minimumQuestions: 30, accuracy: pct(90) }, ctxFor()), (x) => R.applyToAreas(x, [AREA.math], { accuracy: pct(95) }, ctxFor()), (x) => R.applyToSkills(x, [NODE.modulus], { minimumQuestions: 12 }, ctxFor())]) p = must(step(p));
  assert.ok(reqPolicies(p).every((x) => x.effectiveFrom === null));
  assert.equal(p.revision, classPathway().revision); assert.equal(p.baseRevision, classPathway().baseRevision);
  const review = R.reviewRequirements(p, null, graph, { facts });
  assert.equal(review.readiness.needsAcknowledgement, true, '12 questions at 95% allows no mistakes, so the teacher is asked to confirm');
  assert.equal(R.reviewRequirements(p, null, graph, { facts, acknowledged: true }).readiness.canPublish, true, 'publishing is possible, but it is a separate explicit step');
});

test('the service adapter makes the same draft, preview and publish calls as the existing pathway editor, in order, with its tokens', async () => {
  const calls = [];
  const request = async (url, { token, body }) => {
    calls.push({ url, token, body });
    if (url.endsWith('/draft')) return { draftVersion: body.draftVersion + 1 };
    if (url.endsWith('/preview')) return { previewToken: 'preview-token-1', draftVersion: entry.draftVersion, expectedRevision: 2 };
    return { revision: 3, published: { revision: 3 } };
  };
  const entry = { draftVersion: 4 };
  const adapter = createServiceAdapter({ request, token: 'teacher-session-token', entry });
  const pathway = classAt(30, 90, classPathway());
  await adapter.saveDraft(pathway);
  assert.deepEqual(calls.map((c) => c.url), [`/pathways/teacher/${pathway.id}/draft`]);
  assert.equal(calls[0].token, 'teacher-session-token'); assert.equal(calls[0].body.draftVersion, 4); assert.equal(entry.draftVersion, 5);
  calls.length = 0;
  const out = await adapter.publish({ pathway });
  assert.deepEqual(calls.map((c) => c.url.split('/').pop()), ['draft', 'preview', 'publish']);
  assert.ok(calls.every((c) => c.token === 'teacher-session-token'));
  assert.equal(calls[2].body.previewToken, 'preview-token-1'); assert.equal(calls[2].body.expectedRevision, 2);
  assert.match(out.message, /Published version 3/); assert.deepEqual(await adapter.history(), []);
  assert.equal(JSON.stringify(calls).includes('password'), false);
});

test('requirements publish refuses a preview of a different saved draft', async () => {
  const calls = [];
  const adapter = createServiceAdapter({
    entry: { draftVersion: 4 },
    async request(url) {
      const action = url.split('/').pop();
      calls.push(action);
      if (action === 'draft') return { draftVersion: 5 };
      if (action === 'preview') return { draftVersion: 6 };
      throw new Error('Publish should never receive another browser’s draft.');
    },
  });
  await assert.rejects(adapter.publish({ pathway: classPathway(), onDraftSaved: () => calls.push('saved') }), /Another session changed the draft/);
  assert.deepEqual(calls, ['draft', 'saved', 'preview']);
});
