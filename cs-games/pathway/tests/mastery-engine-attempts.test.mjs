import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyHistory, syncAttempt, restartAttempt, verifyHistory, activeAttempt, lastCompleted, nodeProgress, areaProgress, pathwayProgress, toPathwayPolicy, validateMasteryPolicy } from '../mastery/index.mjs';
import * as index from '../mastery/index.mjs';
import { proposeAward } from '../mastery/award.mjs';
import { validatePathway, evaluateNode, diffPathways } from '../model.mjs';
import { exampleAdvancedArrayReasoning, exampleAdvancedArrayReasoningV2 } from '../mastery/examples.mjs';
import { graph, NODE, SCOPE, NOW, pol, basePolicy, norm, run, answer, progress, newPathway, node, calendar, minutesAfterStart, mixed, families } from './lib/mastery-fixtures.mjs';

const MOD = NODE.modulus;
const P1 = basePolicy({ id: 'test:mod', version: 1, minimumQuestions: 10, accuracy: 0.9 });
const P2 = basePolicy({ id: 'test:mod', version: 2, minimumQuestions: 20, accuracy: 0.95 });
const mod = (count, results, over = {}) => run({ mode: 'modulus', count, results, ...over });
const events = (raw, scope = SCOPE) => norm(raw, { scope }).events;
const sync = (h, policy, raw, now, extra = {}) => syncAttempt(h, { policy: pol(policy), events: events(raw), now, policies: [P1, P2].map(pol), ...extra });
const fresh = () => emptyHistory(SCOPE, MOD);

test('lifecycle: not started, in progress, requirements not yet met, requirements met', () => {
  let r = sync(fresh(), P1, [], NOW);
  assert.equal(r.evaluation.status, 'not-started'); assert.equal(r.history.attempts.length, 0, 'asking about a node does not create an attempt');
  r = sync(r.history, P1, mod(4, [true]), NOW);
  assert.equal(r.active.status, 'in-progress'); assert.equal(r.history.attempts.length, 1);
  r = sync(r.history, P1, mod(10, (i) => i < 6), NOW);
  assert.equal(r.active.status, 'requirements-not-yet-met'); assert.equal(r.history.attempts.length, 1, 'continuing does not create a new attempt');
  r = sync(r.history, P1, mod(40, (i) => i < 6 || i >= 10), NOW);
  assert.equal(r.active, null, 'the same attempt continued until accuracy recovered at the 40th answer (36 of 40)');
  const done = lastCompleted(r.history);
  assert.equal(done.status, 'requirements-met'); assert.equal(done.closeReason, 'completed'); assert.equal(done.snapshot.counts.attempted, 40); assert.equal(done.snapshot.counts.correct, 36); assert.equal(r.history.attempts.length, 1);
  assert.deepEqual(verifyHistory(r.history), []);
});

test('transitions are deterministic: identical inputs give identical histories, and syncing twice changes nothing', () => {
  const raw = mod(14, (i) => i !== 3);
  const a = sync(fresh(), P1, raw, NOW), b = sync(fresh(), P1, raw, NOW);
  assert.deepEqual(a.history, b.history);
  const again = sync(a.history, P1, raw, NOW);
  assert.deepEqual(again.history, a.history); assert.deepEqual(again.changes, []);
  const met = sync(fresh(), P1, mod(10, [true]), NOW);
  assert.deepEqual(sync(met.history, P1, mod(10, [true]), NOW).history, met.history, 'a met attempt stays as it is');
});

test('history is immutable: closed attempts cannot be edited and every update returns a new object', () => {
  const met = sync(fresh(), P1, mod(10, [true]), NOW).history;
  assert.throws(() => { met.attempts[0].status = 'in-progress'; }, TypeError);
  assert.throws(() => { met.attempts.push({}); }, TypeError);
  assert.throws(() => { met.awards.push({}); }, TypeError);
  assert.throws(() => { met.attempts[0].snapshot.counts.correct = 99; }, TypeError);
  const next = sync(met, P2, mod(10, [true]), NOW).history;
  assert.notEqual(next, met); assert.equal(met.attempts.length, 1, 'the earlier object is untouched');
});

test('restart: fresh scoring window, counters reset, earlier attempt and all practice preserved, no event in two attempts', () => {
  const first = mod(10, (i) => i < 6, { session: 's1' });
  const opened = sync(fresh(), P1, first, minutesAfterStart(20));
  assert.equal(opened.active.status, 'requirements-not-yet-met');
  const r = restartAttempt(opened.history, { requestId: 'r1', policy: pol(P1), events: events(first), now: minutesAfterStart(20) });
  assert.equal(r.ok, true); assert.equal(r.idempotent, false);
  assert.equal(r.history.attempts.length, 2);
  const [old, next] = r.history.attempts;
  assert.equal(old.status, 'restarted'); assert.equal(old.closeReason, 'restart'); assert.equal(old.snapshot.counts.attempted, 10); assert.equal(old.snapshot.counts.correct, 6);
  assert.equal(old.successorId, next.id); assert.equal(next.windowStart, minutesAfterStart(20));
  const second = mod(12, [true], { session: 's2', start: { n: 1, at: 30 } });
  const all = [...first, ...second];
  const cont = sync(r.history, P1, all, minutesAfterStart(60));
  assert.equal(cont.evaluation.counts.attempted, 10, 'the 12 new answers satisfy the minimum; none of the old answers count toward it');
  assert.equal(cont.evaluation.counts.correct, 10);
  assert.equal(cont.history.attempts[0].snapshot.counts.correct, 6, 'the first attempt record is unchanged');
  assert.deepEqual(verifyHistory(cont.history, { events: events(all) }), []);
  const progressNow = nodeProgress({ node: node(MOD), policy: pol(P1), history: cont.history, events: events(all), now: minutesAfterStart(60), policies: [pol(P1)] }).progress;
  assert.equal(progressNow.lifetime.questionsAnswered, 22, 'cumulative practice history still counts every question');
  assert.equal(progressNow.lifetime.restarts, 1);
  assert.equal(progressNow.lastCompletedAttempt.seq, 2);
});

test('a restart recorded by a server clock that is behind the browser clock cannot re-count the answers the old attempt claimed', () => {
  const raw = mod(10, (i) => i < 6, { session: 'skew' });          // browser timestamps run from minute 0 to minute 9
  const opened = sync(fresh(), P1, raw, minutesAfterStart(10));
  const r = restartAttempt(opened.history, { requestId: 'skew-1', policy: pol(P1), events: events(raw), now: minutesAfterStart(5) });
  assert.equal(r.ok, true);
  const after = sync(r.history, P1, raw, minutesAfterStart(12));
  assert.equal(after.evaluation.counts.attempted, 0, 'answers stamped after the restart time but claimed by the earlier attempt do not count again');
  assert.deepEqual(verifyHistory(after.history, { events: events(raw) }), []);
});

test('a restart request is idempotent and a stale request is refused', () => {
  const raw = mod(10, (i) => i < 6);
  const opened = sync(fresh(), P1, raw, minutesAfterStart(20));
  const a = restartAttempt(opened.history, { requestId: 'same', policy: pol(P1), events: events(raw), now: minutesAfterStart(20) });
  const b = restartAttempt(a.history, { requestId: 'same', policy: pol(P1), events: events(raw), now: minutesAfterStart(25) });
  assert.equal(b.idempotent, true); assert.equal(b.history, a.history, 'a retried request returns the same history object'); assert.equal(b.attemptId, a.attemptId);
  assert.equal(a.history.attempts.length, 2);
  const stale = restartAttempt(a.history, { requestId: 'different', expectedAttemptId: opened.active.id, policy: pol(P1), events: events(raw), now: minutesAfterStart(26) });
  assert.equal(stale.ok, false); assert.equal(stale.reason, 'stale-request'); assert.equal(stale.history.attempts.length, 2, 'a double click with two request ids cannot make a third attempt');
  assert.equal(restartAttempt(a.history, { requestId: '', policy: pol(P1), events: [], now: NOW }).reason, 'missing-request-id');
});

test('there is nothing to restart before practice starts, or after the requirements are met', () => {
  assert.equal(restartAttempt(fresh(), { requestId: 'x', policy: pol(P1), events: [], now: NOW }).reason, 'no-open-attempt');
  const raw = mod(10, [true]);
  const met = sync(fresh(), P1, raw, NOW).history;
  const r = restartAttempt(met, { requestId: 'y', policy: pol(P1), events: events(raw), now: NOW });
  assert.equal(r.ok, false); assert.equal(r.reason, 'no-open-attempt'); assert.equal(r.history.attempts.length, 1);
  const onlyRetries = restartAttempt(fresh(), { requestId: 'z', policy: pol(P1), events: events([{ ...mod(1, [true])[0], attempt: 2, id: 'q:2' }]), now: NOW });
  assert.equal(onlyRetries.ok, false);
});

test('a restart keeps the teacher assessment score, the earlier award record and the lifetime history', () => {
  const raw = mod(10, (i) => i < 6);
  const assessment = [{ id: 'a1', kind: 'assessment', eligible: true, nodeIds: [MOD], score: 3, timestamp: '2026-11-20T00:00:00.000Z' }];
  const opened = sync(fresh(), P1, raw, minutesAfterStart(20));
  const award = { id: 'award:old', kind: 'mastery-award', attemptId: 'attempt:elsewhere', issuedAt: NOW };
  const withAward = { ...opened.history, awards: [award] };
  const r = restartAttempt(withAward, { requestId: 'r', policy: pol(P1), events: events(raw), now: minutesAfterStart(20) });
  assert.deepEqual(r.history.awards, [award], 'awards survive a restart');
  const p = nodeProgress({ node: node(MOD), policy: pol(P1), history: r.history, events: events(raw), now: minutesAfterStart(21), policies: [pol(P1)], assessmentEvidence: assessment }).progress;
  assert.equal(p.standards.score, 3, 'the teacher score is untouched by a restart');
  assert.equal(p.attempt.attempted, 0); assert.equal(p.lifetime.questionsAnswered, 10);
});

test('policy change after completion: the earlier completion stays, a new attempt opens, and the student is told', () => {
  const raw = mod(30, [true]);
  const met = sync(fresh(), P1, raw, minutesAfterStart(40)).history;
  const changed = progress({ policy: P2, policies: [P1, P2], raw, nodeId: MOD, history: met, now: minutesAfterStart(100) });
  assert.equal(changed.history.attempts.length, 2);
  assert.equal(changed.history.attempts[0].status, 'requirements-met'); assert.equal(changed.history.attempts[0].policy.version, 1);
  assert.equal(changed.history.attempts[1].policy.version, 2);
  const p = changed.progress;
  assert.equal(p.status, 'review-recommended'); assert.equal(p.reassessment.needed, true); assert.equal(p.reassessment.reason, 'policy-changed');
  assert.deepEqual(p.lastCompletedAttempt.policy, { id: 'test:mod', version: 1 });
  assert.match(p.explanation.text, /updated them, so a new challenge is open/);
  assert.match(p.explanation.text, /earlier progress is saved/);
  assert.equal(p.attempt.attempted, 0, 'the old answers belong to the old attempt, so version 2 starts from zero');
  const later = progress({ policy: P2, policies: [P1, P2], raw: [...raw, ...mod(20, [true], { session: 'v2', start: { n: 1, at: 500 } })], nodeId: MOD, history: changed.history, now: minutesAfterStart(900) });
  assert.equal(later.progress.status, 'requirements-met'); assert.equal(later.history.attempts.length, 2);
  assert.deepEqual(later.history.attempts.map((a) => [a.policy.version, a.status]), [[1, 'requirements-met'], [2, 'requirements-met']]);
  assert.deepEqual(verifyHistory(later.history), []);
});

test('policy change in the middle of an attempt supersedes it; carrying over is explicit and still never counts an event twice', () => {
  const raw = mod(6, [true]);
  const opened = sync(fresh(), P1, raw, minutesAfterStart(10));
  const fresher = sync(opened.history, P2, raw, minutesAfterStart(20));
  assert.equal(fresher.history.attempts[0].status, 'superseded-by-new-policy'); assert.equal(fresher.history.attempts[0].snapshot.counts.attempted, 6);
  assert.equal(fresher.evaluation.counts.attempted, 0, 'by default the new policy starts a fresh window');
  assert.deepEqual(verifyHistory(fresher.history), []);
  const carried = sync(opened.history, P2, raw, minutesAfterStart(20), { carryOver: true });
  assert.equal(carried.history.attempts[0].carriedOverTo, carried.history.attempts[1].id);
  assert.equal(carried.evaluation.counts.attempted, 6, 'with carry-over the successor keeps the work in progress');
  assert.deepEqual(verifyHistory(carried.history), [], 'an event is claimed by one attempt only: the successor');
  assert.equal(carried.history.attempts[0].status, 'superseded-by-new-policy');
});

test('a published policy version cannot be edited after attempts exist; a new version must be published', () => {
  const opened = sync(fresh(), P1, mod(4, [true]), NOW).history;
  const tampered = { ...P1, accuracy: 0.5 };
  assert.throws(() => syncAttempt(opened, { policy: pol(tampered), events: events(mod(4, [true])), now: NOW, policies: [] }), /was changed after attempts were recorded/);
  assert.throws(() => syncAttempt(opened, { policy: pol(P2), events: events(mod(4, [true])), now: NOW, policies: [tampered].map(pol) }), /was changed after attempts were recorded/);
  const unknownOld = syncAttempt(opened, { policy: pol(P2), events: events(mod(4, [true])), now: NOW, policies: [] });
  assert.equal(unknownOld.history.attempts[0].snapshot.unavailable, 'policy-definition-missing', 'a lost old definition is reported, not invented');
});

test('policy effectiveFrom, not the time of the check, decides when the new window opens', () => {
  const met = sync(fresh(), P1, mod(10, [true]), minutesAfterStart(30)).history;
  const eff = { ...P2, effectiveFrom: minutesAfterStart(100) };
  const during = mod(5, [true], { session: 'before', start: { n: 1, at: 60 } }), after = mod(5, [true], { session: 'after', start: { n: 1, at: 120 } });
  const r = syncAttempt(met, { policy: pol(eff), events: events([...mod(10, [true]), ...during, ...after]), now: minutesAfterStart(500), policies: [P1, eff].map(pol) });
  assert.equal(r.evaluation.counts.attempted, 5, 'only practice after the policy took effect counts');
});

test('award: browser evidence can never produce an official award, with or without a boundary', () => {
  const met = sync(fresh(), P1, mod(10, [true]), NOW).history;
  assert.equal(proposeAward({ history: met, now: NOW }).reason, 'no-trusted-evidence-boundary');
  const ids = lastCompleted(met).snapshot.ledger.eventIds;
  const forged = proposeAward({ history: met, now: NOW, boundary: { kind: 'trusted-evidence-boundary', issuer: 'browser', verifiedEventIds: ids } });
  assert.equal(forged.ok, false); assert.equal(forged.reason, 'evidence-not-verified', 'a boundary cannot upgrade events the resolver never verified');
  assert.equal(proposeAward({ history: fresh(), now: NOW }).reason, 'no-completed-attempt');
  const claim = mod(10, [true]).map((e) => ({ ...e, trusted: true }));
  assert.equal(proposeAward({ history: sync(fresh(), P1, claim, NOW).history, now: NOW, boundary: { kind: 'trusted-evidence-boundary', issuer: 's', verifiedEventIds: ids } }).reason, 'evidence-not-verified');
  assert.equal(met.awards.length, 0);
});

test('award: only verified events plus an explicit boundary that covers them produce an award, once, compatible with evaluateNode', () => {
  const raw = mod(10, [true]);
  const trusted = syncAttempt(fresh(), { policy: pol(P1), events: norm(raw, { trustResolver: () => true }).events, now: NOW });
  const done = lastCompleted(trusted.history), ids = done.snapshot.ledger.eventIds;
  assert.equal(done.snapshot.trust.verified, true);
  assert.equal(proposeAward({ history: trusted.history, now: NOW }).reason, 'no-trusted-evidence-boundary');
  assert.equal(proposeAward({ history: trusted.history, now: NOW, boundary: { kind: 'wrong', issuer: 'x', verifiedEventIds: ids } }).reason, 'no-trusted-evidence-boundary');
  assert.equal(proposeAward({ history: trusted.history, now: NOW, boundary: { kind: 'trusted-evidence-boundary', issuer: 'x', verifiedEventIds: ids.slice(1) } }).reason, 'boundary-does-not-cover-evidence');
  const ok = proposeAward({ history: trusted.history, now: NOW, boundary: { kind: 'trusted-evidence-boundary', issuer: 'grader-service', verifiedEventIds: ids } });
  assert.equal(ok.ok, true); assert.equal(ok.history.awards.length, 1);
  assert.equal(proposeAward({ history: ok.history, now: NOW, boundary: { kind: 'trusted-evidence-boundary', issuer: 'grader-service', verifiedEventIds: ids } }).idempotent, true);
  const legacy = evaluateNode(MOD, { ...toPathwayPolicy(pol(P1)), provisional: false }, [ok.award]);
  assert.equal(legacy.completion, 'complete'); assert.equal(legacy.award, ok.award.id, 'the existing evaluateNode() recognizes the award record');
  const p = nodeProgress({ node: node(MOD), policy: pol(P1), history: ok.history, events: norm(raw, { trustResolver: () => true }).events, now: NOW, policies: [pol(P1)] }).progress;
  assert.equal(p.verification, 'verified'); assert.match(p.explanation.text, /verified/);
  const next = progress({ policy: P2, policies: [P1, P2], raw, nodeId: MOD, history: ok.history, now: minutesAfterStart(900) });
  assert.equal(next.history.awards.length, 1, 'a later policy never removes an earned award');
});

test('award creation is server-side only: the browser-safe entry point does not export it', () => {
  assert.equal('proposeAward' in index, false);
  assert.equal(Object.keys(index).some((k) => /award/i.test(k)), false);
});

test('area completion counts required nodes only; optional skills never block it', () => {
  const modes = ['modulus', 'division', 'casting', 'expressions', 'reverse', 'math-methods', 'numeric-limits'];
  const pathway = newPathway();
  const lab = new Set(modes.map((m) => `node:advanced:math-lab:${m}`));
  pathway.sequence = pathway.sequence.filter((id) => lab.has(id)); pathway.checkpoints = pathway.checkpoints.filter((c) => lab.has(c.nodeId));
  const policy = basePolicy({ id: 'test:area', version: 1, minimumQuestions: 5, accuracy: 0.8 });
  pathway.policies.push(policy); for (const c of pathway.checkpoints) { c.policyId = policy.id; c.policyVersion = 1; }
  assert.ok(validatePathway(pathway, graph, { validateSessions: false, validateTargets: false }));
  const plan = modes.map((m) => ({ assessedMode: m, families: families(`node:advanced:math-lab:${m}`) }));
  const read = (raw, histories = {}, p = pathway) => pathwayProgress({ graph, pathway: p, profileId: SCOPE.profileId, rawEvents: raw, histories, now: NOW });
  const five = mixed({ student: 's1', session: 'm', rounds: 5, plan: plan.slice(0, 5), results: [true] }).events;
  let r = read(five);
  assert.equal(r.areas[0].label, '5 of 7 skills complete'); assert.equal(r.areas[0].status, 'in-progress'); assert.equal(r.areas[0].qualified, false);
  assert.deepEqual(r.areas[0].remainingNodeIds.sort(), ['node:advanced:math-lab:math-methods', 'node:advanced:math-lab:numeric-limits']);
  const optional = JSON.parse(JSON.stringify(pathway)); optional.checkpoints.find((c) => c.nodeId.endsWith(':numeric-limits')).required = false;
  r = read(five, {}, optional);
  assert.equal(r.areas[0].label, '5 of 6 skills complete'); assert.equal(r.areas[0].optionalTotal, 1);
  const rest = mixed({ student: 's1', session: 'm2', rounds: 5, plan: plan.slice(5, 6), start: { n: 1, at: 100 }, results: [true] }).events;
  r = read([...five, ...rest], r.histories, optional);
  assert.equal(r.areas[0].status, 'complete', 'the optional node is untouched and does not block completion'); assert.equal(r.areas[0].qualified, true); assert.equal(r.areas[0].verified, false);
  assert.equal(r.nodes.find((n) => n.nodeId.endsWith(':numeric-limits')).status, 'not-started');
  const all = read([...five, ...rest, ...mixed({ student: 's1', session: 'm3', rounds: 5, plan: plan.slice(6), start: { n: 1, at: 200 }, results: [true] }).events], r.histories);
  assert.equal(all.areas[0].label, '7 of 7 skills complete');
  const flagged = JSON.parse(JSON.stringify(pathway)); flagged.policies[1] = { ...flagged.policies[1], challenge: { requiredForAreaCompletion: false } };
  assert.equal(read(five, {}, flagged).areas[0].requiredTotal, 0, 'a policy can mark its skills optional for area completion');
});

test('area completion cannot be claimed while required skills have no approved requirements', () => {
  const pathway = newPathway();
  const lab = new Set(['modulus', 'division'].map((m) => `node:advanced:math-lab:${m}`));
  pathway.sequence = pathway.sequence.filter((id) => lab.has(id)); pathway.checkpoints = pathway.checkpoints.filter((c) => lab.has(c.nodeId));
  const policy = basePolicy({ id: 'test:one', version: 1, minimumQuestions: 5, accuracy: 0.8 });
  pathway.policies.push(policy); pathway.checkpoints[0].policyId = policy.id; pathway.checkpoints[0].policyVersion = 1;
  const raw = [...mod(5, [true]), ...run({ mode: 'division', count: 20, results: [true], session: 'd' })];
  const r = pathwayProgress({ graph, pathway, profileId: SCOPE.profileId, rawEvents: raw, now: NOW });
  const a = r.areas[0];
  assert.equal(a.qualified, false); assert.equal(a.requiredProvisional, 1); assert.deepEqual(a.needsConfiguration, ['node:advanced:math-lab:division']);
  assert.equal(r.nodes.find((n) => n.nodeId.endsWith(':division')).status, 'provisional', 'lots of practice cannot complete a skill whose requirements were never approved');
  assert.equal(a.label, '1 of 2 skills complete');
});

test('different classes can use different thresholds for the same student and the same practice', () => {
  const strict = { ...newPathway({ id: 'p-strict', classId: 'class-strict' }) }, easy = { ...newPathway({ id: 'p-easy', classId: 'class-easy' }) };
  for (const [p, accuracy] of [[strict, 0.95], [easy, 0.7]]) {
    const pl = basePolicy({ id: `class:${p.classId}`, version: 1, minimumQuestions: 10, accuracy });
    p.sequence = [MOD]; p.checkpoints = p.checkpoints.filter((c) => c.nodeId === MOD); p.policies.push(pl); p.checkpoints[0].policyId = pl.id; p.checkpoints[0].policyVersion = 1;
  }
  const raw = mod(10, (i) => i < 8);
  const read = (p) => pathwayProgress({ graph, pathway: p, profileId: SCOPE.profileId, rawEvents: raw, now: NOW });
  assert.equal(read(strict).nodes[0].status, 'in-progress'); assert.equal(read(easy).nodes[0].status, 'requirements-met');
  assert.equal(read(strict).scope.classId, 'class-strict'); assert.equal(read(easy).scope.classId, 'class-easy');
  assert.notEqual(read(strict).histories[MOD].scope.classId, read(easy).histories[MOD].scope.classId);
  const classRows = [{ ...raw[0], id: 'other:1', questionId: 'other', classId: 'class-easy' }];
  assert.equal(read(strict).normalization.counts.rejected, 0);
  const mismatched = pathwayProgress({ graph, pathway: strict, profileId: SCOPE.profileId, rawEvents: classRows, now: NOW });
  assert.equal(mismatched.normalization.rejected[0].reason, 'scope-mismatch', 'practice stamped for another class is not read into this class');
});

test('pathway progress reads published snapshots without modifying them, and leaves evaluateNode behavior unchanged', () => {
  const p = newPathway();
  p.sequence = [MOD, NODE.division]; p.checkpoints = p.checkpoints.filter((c) => p.sequence.includes(c.nodeId));
  p.curriculumSnapshot = { version: graph.version, nodes: graph.nodes.filter((n) => p.sequence.includes(n.id)), areas: graph.areas.filter((a) => a.id === 'area:advanced:math-lab') };
  const pl = basePolicy({ id: 'test:snap', version: 1, minimumQuestions: 5, accuracy: 0.8 });
  p.policies.push(toPathwayPolicy(pol(pl))); p.checkpoints.forEach((c) => { c.policyId = pl.id; c.policyVersion = 1; });
  const before = JSON.stringify(p);
  assert.ok(validatePathway(p, graph, { validateSessions: false, validateTargets: false }));
  const r = pathwayProgress({ graph, pathway: p, profileId: SCOPE.profileId, rawEvents: mod(5, [true]), now: NOW });
  assert.equal(JSON.stringify(p), before, 'the pathway object, snapshot included, is not changed');
  assert.equal(r.nodes.length, 2);
  assert.equal(r.nodes.find((n) => n.nodeId === MOD).status, 'requirements-met');
  const legacy = evaluateNode(MOD, { ...pl, provisional: true }, []);
  assert.deepEqual(legacy, { completion: 'needs-assessment', score: null, evidenceCount: 0, historicalAwards: [] }, 'evaluateNode is untouched');
  const edited = JSON.parse(before); edited.policies.push({ ...toPathwayPolicy(pol(pl)), version: 2, minimumQuestions: 9 });
  assert.ok(diffPathways(p, edited).some((c) => c.kind === 'policies'));
  assert.ok(validatePathway(edited, graph, { validateSessions: false, validateTargets: false }));
});

test('empty and malformed input produces a calm not-started view with the problems listed', () => {
  const p = newPathway(); p.sequence = [MOD]; p.checkpoints = p.checkpoints.filter((c) => c.nodeId === MOD);
  const pl = basePolicy({ id: 'test:e', version: 1, minimumQuestions: 5, accuracy: 0.8 }); p.policies.push(pl); p.checkpoints[0].policyId = pl.id; p.checkpoints[0].policyVersion = 1;
  const r = pathwayProgress({ graph, pathway: p, profileId: SCOPE.profileId, rawEvents: [null, {}, { id: 'x' }, 'text'], now: NOW });
  assert.equal(r.nodes[0].status, 'not-started'); assert.equal(r.normalization.counts.rejected, 4); assert.equal(r.nodes[0].attempt.attempted, 0);
  assert.equal(pathwayProgress({ graph, pathway: p, profileId: SCOPE.profileId, now: NOW }).nodes[0].status, 'not-started');
  assert.throws(() => pathwayProgress({ graph, pathway: p, now: NOW }), /profile is required/);
  const bad = JSON.parse(JSON.stringify(p)); bad.checkpoints[0].policyVersion = 9;
  assert.equal(pathwayProgress({ graph, pathway: bad, profileId: SCOPE.profileId, now: NOW }).problems.length, 1, 'a checkpoint pointing at a missing policy version is reported');
});

test('stale earned requirements can be flagged for review without being removed', () => {
  const policy = basePolicy({ id: 'test:stale', version: 1, minimumQuestions: 5, accuracy: 0.8, challenge: { review: { staleAfterDays: 30 } } });
  const raw = mod(5, [true]);
  const first = progress({ policy, raw, nodeId: MOD, now: minutesAfterStart(30) });
  assert.equal(first.progress.status, 'requirements-met');
  const later = progress({ policy, raw, nodeId: MOD, history: first.history, now: '2027-03-01T00:00:00.000Z' });
  assert.equal(later.progress.status, 'review-recommended'); assert.equal(later.progress.reassessment.reason, 'stale');
  assert.equal(later.progress.lastCompletedAttempt.status, 'requirements-met'); assert.equal(later.history.attempts.length, 1);
});

test('exposed example policies version cleanly: v2 is a new version of the same id and v1 history stays interpretable', () => {
  assert.equal(exampleAdvancedArrayReasoning.id, exampleAdvancedArrayReasoningV2.id);
  assert.ok(exampleAdvancedArrayReasoningV2.version > exampleAdvancedArrayReasoning.version);
  const a = validateMasteryPolicy(exampleAdvancedArrayReasoning).policy, b = validateMasteryPolicy(exampleAdvancedArrayReasoningV2).policy;
  assert.notEqual(index.policyDigest(a), index.policyDigest(b));
});
