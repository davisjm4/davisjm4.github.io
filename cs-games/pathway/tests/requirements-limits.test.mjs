// Teacher-controlled mastery requirements: impossible and unsupported requirements. Verified limits are separated from estimates;
// content that could be added later may be saved as a draft but not published; nothing is invented to make a requirement possible.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { R, graph, registry, facts, classPathway, ctxFor, pct, must, resolved, publishDraft, AREA, NODE } from './lib/requirements-fixtures.mjs';

const VARIABLE = 'node:advanced:variable-lab:trace';
const base = () => must(R.applyToClass(classPathway(), { minimumQuestions: 30, accuracy: pct(90) }, ctxFor()));
const snapshot = (x) => JSON.stringify(x);
const adv = (q, c = 0) => [{ difficulty: 'advanced', minQuestions: q, minCorrect: c }];
const bank = (nodeId, value, basis, expandable) => ({ [nodeId]: { bankSize: { value, basis, expandable } } });
const codes = (res, kind) => (res.problems?.[kind] ?? []).map((p) => p.code);

test('a difficulty level the skill does not offer is impossible: blocked, nothing saved, and the message says which skill', () => {
  const p = base(), before = snapshot(p);
  const res = R.applyToSkills(p, [NODE.division], { difficulties: adv(5) }, ctxFor());
  assert.equal(res.ok, false);
  assert.equal(res.errors[0].code, 'difficulty-not-offered');
  assert.match(res.errors[0].message, /Integer and Double Division: its practice has no difficulty levels, so an Advanced requirement can't be met/);
  assert.equal(snapshot(res.pathway), before, 'a blocked change is not saved, not even as a draft');
  assert.equal(res.blocked[0].verified, true, 'this limit is verified from the practice engine, not guessed');
});

test('blocking applies through areas and the class too: one skill that cannot meet it blocks the whole change', () => {
  const p = base();
  const area = R.applyToAreas(p, [AREA.math], { difficulties: adv(5) }, ctxFor());
  assert.equal(area.ok, false);
  assert.ok(area.errors.length >= 1 && area.errors.every((e) => e.code === 'difficulty-not-offered'));
  assert.ok(area.errors.some((e) => /Modulus/.test(e.message)), 'every skill that cannot meet it is named');
  assert.equal(R.applyToClass(p, { difficulties: adv(5) }, ctxFor()).ok, false);
});

test('a difficulty level that the skill offers is fine', () => {
  const res = R.applyToSkills(base(), [NODE.trace2d], { difficulties: adv(8, 6) }, ctxFor());
  assert.equal(res.ok, true); assert.deepEqual(codes(res, 'blocked'), []); assert.deepEqual(codes(res, 'draftOnly'), []); assert.deepEqual(codes(res, 'warnings'), []);
  assert.deepEqual(resolved(res.pathway, NODE.trace2d).effective.difficulties, adv(8, 6));
});

test('a missing Advanced mode: a skill known to have no levels is blocked; a skill whose levels are not recorded only gets a warning', () => {
  const profile = facts.profileFor(VARIABLE);
  assert.equal(Array.isArray(profile.difficulties), false, 'Variable Lab does not record difficulty levels, so availability is unknown');
  const res = R.applyToSkills(base(), [VARIABLE], { difficulties: adv(5) }, ctxFor());
  assert.equal(res.ok, true, 'unknown is not impossible');
  const w = res.problems.warnings.find((x) => x.code === 'difficulty-unknown');
  assert.ok(w); assert.equal(w.verified, false); assert.equal(w.basis, 'estimate');
  assert.match(w.message, /isn't known whether this skill has Advanced questions/);
  // the registry lists which skills do have levels; none of the Advanced class lacks the Advanced one while offering others
  const withLevels = base().sequence.filter((id) => Array.isArray(facts.profileFor(id).difficulties) && facts.profileFor(id).difficulties.length);
  assert.ok(withLevels.length > 0 && withLevels.every((id) => facts.profileFor(id).difficulties.includes('advanced')));
});

test('too many kinds of questions is a verified shortfall that content could fix: saved as a draft, not publishable', () => {
  const p = base();
  const ten = R.applyToSkills(p, [NODE.trace2d], { families: { minDistinct: 10, minCorrectEach: 1 } }, ctxFor());
  assert.equal(ten.ok, true); assert.deepEqual(codes(ten, 'draftOnly'), [], 'ten kinds exist, so ten is possible');
  const eleven = R.applyToSkills(p, [NODE.trace2d], { families: { minDistinct: 11, minCorrectEach: 1 } }, ctxFor());
  assert.equal(eleven.ok, true, 'the draft is saved');
  assert.deepEqual(codes(eleven, 'draftOnly'), ['too-many-families']);
  const d = eleven.problems.draftOnly[0];
  assert.equal(d.verified, true); assert.equal(d.basis, 'verified');
  assert.match(d.message, /only 10 kinds of questions exist but you asked for 11/); assert.match(d.message, /add question kinds or lower the number before publishing/);
  const review = R.reviewRequirements(eleven.pathway, null, graph, { facts });
  assert.equal(review.readiness.canSaveDraft, true); assert.equal(review.readiness.canPublish, false);
  assert.ok(review.readiness.reasons.some((r) => /1 skill needs more questions or question kinds than exist/.test(r)));
  const fixed = must(R.applyToSkills(eleven.pathway, [NODE.trace2d], { families: { minDistinct: 8, minCorrectEach: 1 } }, ctxFor()));
  assert.equal(R.reviewRequirements(fixed, null, graph, { facts }).readiness.canPublish, true, 'lowering the number makes it publishable');
});

test('question variety cannot be checked where the lab does not name its question kinds: a warning, never a fabricated number of kinds', () => {
  assert.equal(facts.profileFor(VARIABLE).boundFamilyIds, null);
  const res = R.applyToSkills(base(), [VARIABLE], { families: { minDistinct: 3, minCorrectEach: 1 } }, ctxFor());
  assert.equal(res.ok, true);
  const w = res.problems.warnings.find((x) => x.code === 'families-unverifiable');
  assert.ok(w); assert.equal(w.verified, false);
  assert.match(w.message, /can't check how many kinds of questions exist/);
  assert.equal(resolved(res.pathway, VARIABLE).effective.families.minDistinct, 3, 'the requirement is stored as typed; the system does not invent kinds of questions to satisfy it');
});

test('a question pool smaller than the minimum: draft-only when more questions can be added, blocked when the pool is fixed', () => {
  const small = R.applyToSkills(base(), [NODE.modulus], { minimumQuestions: 30 }, ctxFor({ extra: bank(NODE.modulus, 12, 'verified', true) }));
  assert.equal(small.ok, true); assert.deepEqual(codes(small, 'draftOnly'), ['pool-too-small']);
  assert.match(small.problems.draftOnly[0].message, /only 12 different questions exist but 30 are required, and a question is not repeated within a practice window/);
  assert.match(small.problems.draftOnly[0].message, /more questions need to be added before publishing/);
  assert.equal(small.problems.draftOnly[0].verified, true);
  const fixed = R.applyToSkills(base(), [NODE.modulus], { minimumQuestions: 30 }, ctxFor({ extra: bank(NODE.modulus, 12, 'verified', false) }));
  assert.equal(fixed.ok, false); assert.equal(fixed.errors[0].code, 'pool-too-small');
  assert.doesNotMatch(fixed.errors[0].message, /can be saved/, 'a fixed pool offers no "save as draft" promise');
});

test('an estimated pool size is only a warning and is labeled as an estimate; a verified size is a limit', () => {
  const est = R.applyToSkills(base(), [NODE.modulus], { minimumQuestions: 30 }, ctxFor({ extra: bank(NODE.modulus, 12, 'estimate', true) }));
  assert.equal(est.ok, true); assert.deepEqual(codes(est, 'draftOnly'), []); assert.deepEqual(codes(est, 'blocked'), []);
  const w = est.problems.warnings.find((x) => x.code === 'pool-may-be-small');
  assert.ok(w); assert.equal(w.verified, false); assert.equal(w.basis, 'estimate'); assert.match(w.message, /roughly 12 different questions are available \(an estimate\)/);
  const grouped = R.groupProblems(est.problems.warnings);
  assert.equal(grouped[0].verified, false); assert.equal(grouped[0].basis, 'estimate');
  // a pool at least as large as the minimum raises nothing
  const enough = R.applyToSkills(base(), [NODE.modulus], { minimumQuestions: 30 }, ctxFor({ extra: bank(NODE.modulus, 30, 'verified', true) }));
  assert.deepEqual([codes(enough, 'blocked'), codes(enough, 'draftOnly'), codes(enough, 'warnings')], [[], [], []]);
});

test('an essential topic with no questions is a draft-only shortfall, and one that names real questions is fine', () => {
  const topic = (families) => [{ id: 't', label: 'Float division', match: { familyIds: families }, minExposure: 3, minCorrect: 2 }];
  const missing = R.applyToSkills(base(), [NODE.division], { subskills: topic(['division:no-such-family']) }, ctxFor());
  assert.equal(missing.ok, true); assert.deepEqual(codes(missing, 'draftOnly'), ['subskill-without-questions']);
  assert.match(missing.problems.draftOnly[0].message, /No question family matches the subskill "Float division"/);
  assert.equal(R.reviewRequirements(missing.pathway, null, graph, { facts }).readiness.canPublish, false);
  const real = R.applyToSkills(base(), [NODE.division], { subskills: topic(['division:widened']) }, ctxFor());
  assert.equal(real.ok, true); assert.deepEqual(codes(real, 'draftOnly'), []);
  assert.equal(R.applyToClass(base(), { subskills: topic(['division:widened']) }, ctxFor()).ok, false, 'topics cannot be set for a whole class');
});

test('no room for a mistake is a verified warning, not an error: a student can keep answering to recover', () => {
  const res = R.applyToSkills(base(), [NODE.modulus], { minimumQuestions: 10, accuracy: pct(95) }, ctxFor());
  assert.equal(res.ok, true);
  const w = res.problems.warnings.find((x) => x.code === 'no-room-for-mistakes');
  assert.ok(w); assert.equal(w.verified, true); assert.match(w.message, /allows no mistakes in the first 10/); assert.match(w.message, /keep answering to recover/);
  assert.equal(codes(R.applyToSkills(base(), [NODE.modulus], { minimumQuestions: 20, accuracy: pct(95) }, ctxFor()), 'warnings').includes('no-room-for-mistakes'), false, '20 at 95% leaves room for one');
});

test('a requirement is never lowered, rewritten or "fixed" by the system to make it possible', () => {
  const requested = { minimumQuestions: 30, difficulties: adv(5) };
  const res = R.applyToSkills(base(), [NODE.division], requested, ctxFor());
  assert.equal(res.ok, false);
  assert.equal(resolved(res.pathway, NODE.division).effective.minimumQuestions, 30);
  const d = R.applyToSkills(base(), [NODE.trace2d], { families: { minDistinct: 12, minCorrectEach: 1 } }, ctxFor());
  assert.equal(resolved(d.pathway, NODE.trace2d).effective.families.minDistinct, 12, 'the teacher\'s number is kept as typed, with a warning, not trimmed to the 10 that exist');
});

test('the practice content is never touched: question families and the curriculum graph are identical after any edit', () => {
  const before = fs.readFileSync(new URL('../curriculum-graph.json', import.meta.url), 'utf8');
  const familiesBefore = JSON.stringify(graph.questionFamilies);
  let p = base();
  p = R.applyToSkills(p, [NODE.trace2d], { families: { minDistinct: 12, minCorrectEach: 1 } }, ctxFor()).pathway;
  p = R.applyToSkills(p, [NODE.modulus], { minimumQuestions: 99 }, ctxFor({ extra: bank(NODE.modulus, 5, 'verified', true) })).pathway;
  assert.equal(graph.questionFamilies.length, 453); assert.equal(graph.nodes.length, 290);
  assert.equal(JSON.stringify(graph.questionFamilies), familiesBefore);
  assert.equal(fs.readFileSync(new URL('../curriculum-graph.json', import.meta.url), 'utf8'), before);
  assert.equal(JSON.stringify(p).includes('questionFamilies'), false, 'a class pathway never stores or copies question families');
});

test('the requirements code does not reach into question generation, the labs, the Worker or authentication', () => {
  const dir = new URL('../requirements/', import.meta.url);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
    const src = fs.readFileSync(new URL(file, dir), 'utf8');
    for (const m of src.matchAll(/(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/g)) assert.match(m[1], /^\.\.?\//, `${file} imports ${m[1]}`);
    for (const m of src.matchAll(/from\s*['"](\.\.\/[^'"]+)['"]/g)) assert.match(m[1], /^\.\.\/(model|mastery\/[a-z-]+)\.mjs$/, `${file} reaches only the pathway model and the mastery engine, not ${m[1]}`);
    assert.doesNotMatch(src, /award\.mjs|proposeAward|authorization|bearer|localStorage|sessionStorage|fetch\(|XMLHttpRequest|Date\.now|new Date\(|Math\.random|process\.env|crypto\./i, `${file} must stay pure`);
  }
});

test('review readiness: warnings need acknowledgement, unmet levels and an empty draft block publishing, and the reasons are readable', () => {
  const draft = must(R.applyToSkills(base(), [NODE.modulus], { minimumQuestions: 10, accuracy: pct(95) }, ctxFor()));
  const unack = R.reviewRequirements(draft, null, graph, { facts });
  assert.equal(unack.readiness.canPublish, false); assert.equal(unack.readiness.needsAcknowledgement, true);
  assert.ok(unack.readiness.reasons.includes('Read the notes below and confirm you understand them.'));
  const ack = R.reviewRequirements(draft, null, graph, { facts, acknowledged: true });
  assert.equal(ack.readiness.canPublish, true); assert.deepEqual(ack.readiness.reasons, []);
  const { published } = publishDraft(draft, null);
  const nothing = R.reviewRequirements(draft, published, graph, { facts, acknowledged: true });
  assert.equal(nothing.readiness.hasChanges, false); assert.deepEqual(nothing.readiness.reasons, ['There are no changes to publish.']);
  const none = R.reviewRequirements(classPathway(), null, graph, { facts });
  assert.equal(none.readiness.canPublish, false); assert.equal(none.counts.notSet, 123);
});

test('problems are grouped by kind in a fixed order: blocked, draft-only, then warnings, each with a plain heading', () => {
  const list = [
    { severity: 'warning', code: 'pool-may-be-small', message: 'a', title: 'A', verified: false, basis: 'estimate' },
    { severity: 'draft-only', code: 'too-many-families', message: 'b', title: 'B', verified: true, basis: 'verified' },
    { severity: 'blocked', code: 'difficulty-not-offered', message: 'c', title: 'C', verified: true, basis: 'verified' },
    { severity: 'draft-only', code: 'too-many-families', message: 'd', title: 'D', verified: true, basis: 'verified' },
  ];
  const g = R.groupProblems(list);
  assert.deepEqual(g.map((x) => x.severity), ['blocked', 'draft-only', 'warning']);
  assert.equal(g[1].items.length, 2); assert.equal(g[0].heading, 'A required difficulty level does not exist for the skill');
  assert.equal(R.SEVERITY_HEADING.blocked, 'Cannot be saved'); assert.equal(R.SEVERITY_HEADING['draft-only'], 'Can be saved as a draft, not published');
  for (const x of g) assert.doesNotMatch(JSON.stringify(x), /node:|policy:/);
});

test('every status and code a teacher can meet has a heading, so no raw code is shown', () => {
  const seen = new Set();
  const attempts = [
    R.applyToSkills(base(), [NODE.division], { difficulties: adv(5) }, ctxFor()),
    R.applyToSkills(base(), [NODE.trace2d], { families: { minDistinct: 11, minCorrectEach: 1 } }, ctxFor()),
    R.applyToSkills(base(), [VARIABLE], { families: { minDistinct: 3, minCorrectEach: 1 }, difficulties: adv(3) }, ctxFor()),
    R.applyToSkills(base(), [NODE.modulus], { minimumQuestions: 10, accuracy: pct(95) }, ctxFor({ extra: bank(NODE.modulus, 4, 'estimate', true) })),
  ];
  for (const a of attempts) for (const p of [...(a.problems?.blocked ?? []), ...(a.problems?.draftOnly ?? []), ...(a.problems?.warnings ?? []), ...(a.blocked ?? [])]) seen.add(p.code);
  assert.ok(seen.size >= 5, [...seen].join(','));
  for (const code of seen) assert.ok(R.PROBLEM_HEADINGS[code], `${code} needs a heading`);
});

test('status levels are ordered from least to most serious, and the contents facts report evidence verification', () => {
  assert.deepEqual(R.STATUS_ORDER, ['ok', 'warning', 'draft-only', 'blocked']);
  assert.equal(facts.practiceEvidence(NODE.modulus), 'verified');
  assert.equal(R.buildContentFacts({ graph, registry: null }).practiceEvidence(NODE.modulus), 'unverified', 'without the registry nothing is called verified');
  const unverified = R.applyToClass(classPathway(), { minimumQuestions: 30, accuracy: pct(90) }, R.createContext({ graph, facts: R.buildContentFacts({ graph, registry: null }) }));
  assert.equal(unverified.ok, true);
  assert.equal(unverified.problems.warnings.filter((w) => w.code === 'evidence-unverified').length, 123, 'every skill warns when its practice evidence has not been verified');
  assert.equal(unverified.problems.warnings[0].verified, false);
});
