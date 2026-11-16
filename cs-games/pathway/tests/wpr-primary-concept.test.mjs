// Workplace Readiness primary-concept evidence (synthetic profile, stubbed network, nothing real is read or written).
// Flow under test, for real generated questions:
//   WPR generator -> node-evidence.mjs -> recordGameAttempt outbox event -> server normalizer cleanGameAttempt -> credited node ids.
// The service-level checks (duplicates, class isolation, legacy reports) are in wpr-primary-concept-service.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

class MemoryStorage { getItem(k) { return Object.hasOwn(this, k) ? this[k] : null; } setItem(k, v) { this[k] = String(v); } removeItem(k) { delete this[k]; } }
globalThis.localStorage = new MemoryStorage();
localStorage.setItem('wrg.profile.active.v1', JSON.stringify({ id: '3b9d8a5e-1c2f-4a6b-8d7e-0f1a2b3c4d5e', token: 'a'.repeat(64), expires: Date.now() + 1e10, classId: 'synthetic-class', courseId: 'workplace' }));
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...rest) => { const t = realSetTimeout(fn, ms, ...rest); t.unref?.(); return t; };
globalThis.fetch = async () => { throw new Error('network disabled in tests'); };

const root = new URL('../../../', import.meta.url);
const imp = path => import(new URL(path, root).href);
const require = createRequire(import.meta.url);
const sync = await imp('wpr-games/workplace-readiness/online/profile-sync.mjs');
const NE = await imp('wpr-games/workplace-readiness/online/node-evidence.mjs');
const { PROFILE_ID, practiceEvent } = await imp('wpr-games/workplace-readiness/online/profile-model.mjs');
const { cleanGameAttempt } = await imp('wpr-games/workplace-readiness/service/profile-evidence.mjs');
const { questionEvidence } = await imp('cs-games/pathway/evidence.mjs');
const P = await imp('cs-games/pathway/wpr-primary-concepts.mjs');
const graph = JSON.parse(fs.readFileSync(new URL('cs-games/pathway/curriculum-graph.json', root), 'utf8'));
const wprDir = new URL('wpr-games/workplace-readiness/', root).pathname;
const { loadHybrid } = require(wprDir + 'tools/compose-load.js');
const SEL = require(wprDir + 'js/compose/selector.js');

assert.ok(sync.activeProfile, 'the synthetic profile must be active so recordGameAttempt queues events');
const nodeOfConcept = new Map(graph.nodes.filter(n => n.courseId === 'workplace').map(n => [n.familySelectors[0].conceptId, n.id]));
const WPR_NODES = [...nodeOfConcept.values()];
const hybrid = loadHybrid();
const { challenges: QUESTIONS } = SEL.generateMany(hybrid, 3000, { seed: 'wpr-primary-v1', filters: {} });
const outboxPrefix = sync.device.key('outbox.');
const outbox = () => Object.keys(localStorage).filter(k => k.startsWith(outboxPrefix)).map(k => JSON.parse(localStorage.getItem(k)));
const clearOutbox = () => Object.keys(localStorage).filter(k => k.startsWith(outboxPrefix)).forEach(k => localStorage.removeItem(k));
const normalize = event => cleanGameAttempt(event, id => PROFILE_ID.test(id));
const nodeIdsOf = cleaned => cleaned ? cleaned.data.dimensions.map(d => d.id) : [];

/** Play one question through the real client queue and the real server normalizer. Returns the credited node ids and the cleaned event. */
function play(q, right = true, seed = 'seed-1') {
  clearOutbox();
  const queued = NE.queueNodeAttempt(q, right, { seed });
  const events = outbox();
  assert.equal(events.length, queued ? 1 : 0);
  const cleaned = events.length ? normalize(events[0]) : null;
  if (events.length) assert.ok(cleaned, 'the server normalizer must accept every event the page sends');
  return { queued, event: events[0] || null, cleaned, nodeIds: nodeIdsOf(cleaned) };
}

/** Assertion under test: a candidate evidence system credits exactly the primary concept's node, and nothing for units without one. */
function assertPrimaryOnly(creditOf, questions) {
  let credited = 0, multiTagCredited = 0;
  for (const q of questions) {
    const primary = P.primaryAttribution(q);
    const got = creditOf(q);
    if (!primary) { assert.deepEqual(got, [], `${q.templateId} has no reviewed primary concept and must earn no node credit`); continue; }
    assert.deepEqual(got, [nodeOfConcept.get(primary.conceptId)], `${q.templateId} must credit only its primary concept node`);
    credited++; if (q.concepts.length > 1) multiTagCredited++;
  }
  return { credited, multiTagCredited };
}
const realCredit = q => play(q).nodeIds;

// ---------------------------------------------------------------------------------------------------------------- table vs catalog
test('attribution table matches the generated catalog: no stale keys, no unaccounted unit, every primary is one of the unit\'s own tags', () => {
  const authored = hybrid.units.filter(u => u.kind === 'authored');
  const composed = hybrid.units.filter(u => u.kind === 'composed');
  for (const u of authored) {
    const id = u.id, tags = u.template.concepts;
    const inPrimary = Object.hasOwn(P.AUTHORED_PRIMARY, id), inAmb = P.AUTHORED_AMBIGUOUS.includes(id);
    assert.ok(inPrimary !== inAmb, `${id} must be either credited or explicitly ambiguous`);
    if (inPrimary) assert.ok(tags.includes(P.AUTHORED_PRIMARY[id].split('|')[0]), `${id} primary must be one of its own tags`);
    if (tags.length === 1) assert.ok(inPrimary, `${id} has one tag and so one primary`);
  }
  for (const id of [...Object.keys(P.AUTHORED_PRIMARY), ...P.AUTHORED_AMBIGUOUS]) assert.ok(authored.some(u => u.id === id), `stale authored key ${id}`);
  const rules = new Map();
  for (const u of composed) { const s = rules.get(u.kitId) || { tags: u.concepts, rules: new Set() }; s.rules.add(u.rule); rules.set(u.kitId, s); }
  for (const [kit, byRule] of Object.entries(P.COMPOSED_PRIMARY)) {
    assert.ok(rules.has(kit), `stale kit ${kit}`);
    for (const [rule, entry] of Object.entries(byRule)) {
      assert.ok(rules.get(kit).rules.has(rule), `${kit}/${rule} is never generated`);
      assert.ok(rules.get(kit).tags.includes(entry.split('|')[0]), `${kit}/${rule} primary must be one of the kit's tags`);
    }
  }
  for (const concept of Object.values(P.AUTHORED_PRIMARY).map(e => e.split('|')[0])) assert.ok(nodeOfConcept.has(concept), concept + ' must be a graph node');
});

test('generic cross-kit reasoning earns no node credit (hazard control, ordering, defect finding)', () => {
  const generic = ['proceed-when-satisfied', 'respect-dependencies', 'find-the-defect', 'protect-requirements', 'consult-affected-people', 'protect-safety', 'keep-safety-step'];
  for (const [kit, byRule] of Object.entries(P.COMPOSED_PRIMARY)) for (const rule of generic) assert.ok(!Object.hasOwn(byRule, rule), `${kit}/${rule} must stay uncredited`);
  for (const [kit, byRule] of Object.entries(P.COMPOSED_PRIMARY)) {
    if (Object.hasOwn(byRule, 'control-hazard-first')) assert.ok(/^(saf-|jst-)/.test(kit), `${kit}: hazard control is a safety concept only in a safety or equipment kit`);
  }
});

// ---------------------------------------------------------------------------------------------------------------- attribution
test('primary-concept attribution: one scored response credits exactly the primary concept node, over 3,000 mixed questions', () => {
  const { credited, multiTagCredited } = assertPrimaryOnly(realCredit, QUESTIONS);
  assert.ok(credited > 500, 'a large sample earns credit: ' + credited);
  assert.ok(multiTagCredited > 400, 'multi-tag questions must be exercised: ' + multiTagCredited);
});

test('secondary tags stay available for instructional use but earn no mastery credit', () => {
  let checked = 0;
  for (const q of QUESTIONS) {
    const primary = P.primaryAttribution(q);
    if (!primary || q.concepts.length < 2) continue;
    const { event, nodeIds } = play(q);
    assert.equal(nodeIds.length, 1);
    for (const other of q.concepts.filter(c => c !== primary.conceptId)) {
      assert.ok(!nodeIds.includes(nodeOfConcept.get(other)), `${q.templateId}: secondary tag ${other} must not be credited`);
      assert.ok(!JSON.stringify(event).includes(other), 'secondary tags are never sent in the node event');
    }
    assert.ok(Array.isArray(q.concepts) && q.concepts.length >= 2, 'the question keeps all its tags for discovery, feedback and reports');
    checked++;
  }
  assert.ok(checked > 400, String(checked));
});

test('the credited skill matches the reasoning assessed: spot checks of reviewed units', () => {
  const byKey = (key, concept) => { const q = QUESTIONS.find(x => P.attributionKey(x) === key); assert.ok(q, 'no question for ' + key); assert.equal(P.primaryAttribution(q).conceptId, concept); };
  byKey('c:ise-suspicious-email/verify-sender', 'information-security:cyber-threats');
  byKey('c:tea-team-project/communicate-overlap', 'teamwork:team-communication');
  byKey('c:lis-spoken-instructions/confirm-missed-detail', 'listening-and-speaking:active-listening');
  byKey('c:raw-delay-email/organize-for-reader', 'reading-and-writing:clarity');
  const conflict = hybrid.units.find(u => u.id === 'CON-D-001');
  assert.ok(conflict, 'CON-D-001 exists');
  assert.equal(P.verifyPrimary('a:CON-D-001', 'conflict-resolution:diplomatic-negotiation'), true);
  assert.equal(P.verifyPrimary('a:CON-D-001', 'conflict-resolution:work-style-differences'), false);
  assert.equal(P.verifyPrimary('a:CON-D-001', 'conflict-resolution:when-to-escalate'), false);
});

test('unrelated WPR nodes receive no credit and no non-WPR node is ever credited', () => {
  const seen = new Set();
  for (const q of QUESTIONS.slice(0, 1500)) for (const id of play(q).nodeIds) { assert.ok(WPR_NODES.includes(id), id); seen.add(id); }
  assert.equal(seen.size, Object.keys(P.WPR_AUTOMATIC).length, 'a broad sample reaches every enabled node and no other: ' + seen.size);
  for (const id of seen) assert.ok(Object.keys(P.WPR_AUTOMATIC).some(c => nodeOfConcept.get(c) === id));
  const p = QUESTIONS.map(q => P.primaryAttribution(q)).find(Boolean);
  const credited = play(QUESTIONS.find(q => P.primaryAttribution(q)?.conceptId === p.conceptId)).nodeIds;
  assert.deepEqual(credited, [nodeOfConcept.get(p.conceptId)]);
});

// ---------------------------------------------------------------------------------------------------------------- first attempts
test('an eligible correct first attempt credits the intended node once; an incorrect one counts in the denominator', () => {
  const q = QUESTIONS.find(x => P.primaryAttribution(x));
  const right = play(q, true), wrong = play(q, false);
  assert.equal(right.cleaned.data.firstAttempt, true);
  assert.deepEqual(right.cleaned.data.dimensions, [{ scope: 'node', id: nodeOfConcept.get(P.primaryAttribution(q).conceptId), n: 1, c: 1 }]);
  assert.deepEqual(wrong.cleaned.data.dimensions, [{ scope: 'node', id: nodeOfConcept.get(P.primaryAttribution(q).conceptId), n: 1, c: 0 }]);
  assert.equal(right.event.attempt, 1);
});

test('a corrected second attempt, an assisted answer and a skipped or revealed answer add no independent first-attempt credit', () => {
  const q = QUESTIONS.find(x => P.primaryAttribution(x));
  const { event } = play(q, true);
  const second = normalize({ ...event, attempt: 2, id: event.questionId + ':2' });
  assert.equal(second.data.firstAttempt, false);
  assert.deepEqual(second.data.dimensions, []);
  assert.equal(second.data.n, 0); assert.equal(second.data.c, 0);
  const assisted = normalize({ ...event, assisted: true });
  assert.deepEqual(assisted.data.dimensions, []); assert.equal(assisted.data.c, 0);
  // The page has one check per question and no skip, reveal or hint control; an event can never claim one.
  assert.ok(!('skipped' in event) && !('revealed' in event));
  const html = fs.readFileSync(new URL('wpr-games/workplace-readiness/index.html', root), 'utf8') + fs.readFileSync(new URL('wpr-games/workplace-readiness/js/app/ui.js', root), 'utf8');
  assert.ok(!/skip question|show answer|reveal answer|btn-skip|btn-reveal/i.test(html), 'a skip or reveal control would need its own evidence handling');
});

test('a forged claim cannot credit another concept, another unit or another course', () => {
  const q = QUESTIONS.find(x => P.primaryAttribution(x) && x.concepts.length > 1);
  const primary = P.primaryAttribution(q);
  const { event } = play(q);
  const other = q.concepts.find(c => c !== primary.conceptId);
  assert.deepEqual(nodeIdsOf(normalize({ ...event, topic: other })), [], 'a secondary tag claimed as the topic is refused');
  assert.deepEqual(nodeIdsOf(normalize({ ...event, familyId: 'c:made-up/rule' })), [], 'an unknown reasoning unit is refused');
  assert.deepEqual(nodeIdsOf(normalize({ ...event, familyId: undefined })), [], 'a missing reasoning unit is refused');
  assert.equal(normalize({ ...event, courseId: 'advanced' }), null, 'a Workplace Readiness activity cannot report into another course');
  const raw = { id: 'e:1', questionId: 'q', sessionId: 's', activityId: 'workplace-readiness', familyId: event.familyId, topic: other, timestamp: new Date().toISOString(), correct: true, firstAttempt: true, courseId: 'workplace' };
  assert.deepEqual(questionEvidence(graph, { ...raw, nodeIds: WPR_NODES }).nodeIds, [], 'client-supplied node ids are ignored');
  // A server that trusted the claimed topic would credit it: this is what the verification prevents.
  const naive = graph.nodes.filter(n => n.courseId === 'workplace' && n.familySelectors.some(s => s.conceptId === other)).map(n => n.id);
  assert.equal(naive.length, 1);
});

// ---------------------------------------------------------------------------------------------------------------- mixed practice
test('Mixed Practice credits the concept of the question actually shown, never the word "mixed"', () => {
  const mixed = SEL.generateMany(hybrid, 600, { seed: 'wpr-mixed', filters: { modes: ['decision', 'nextstep', 'order', 'find'], difficulty: 'mixed' } }).challenges;
  const modes = new Set(), concepts = new Set();
  for (const q of mixed) {
    const { event, nodeIds } = play(q);
    if (!event) continue;
    assert.equal(event.assessedMode, q.mode); assert.notEqual(event.assessedMode, 'mixed'); assert.notEqual(event.topic, 'mixed');
    assert.equal(event.topic, P.primaryAttribution(q).conceptId);
    assert.deepEqual(nodeIds, [nodeOfConcept.get(P.primaryAttribution(q).conceptId)]);
    modes.add(event.assessedMode); concepts.add(event.topic);
  }
  assert.equal(modes.size, 4); assert.ok(concepts.size >= 25, String(concepts.size));
});

// ---------------------------------------------------------------------------------------------------------------- identity, offline, isolation
test('event identity is stable across reload and replay, and distinct across questions and sessions', () => {
  const q = QUESTIONS.find(x => P.primaryAttribution(x));
  const a = play(q, true, 'seed-A').event, again = play(q, true, 'seed-A').event, otherSession = play(q, true, 'seed-B').event;
  assert.equal(a.id, again.id); assert.equal(a.questionId, again.questionId); assert.equal(a.sessionId, again.sessionId);
  assert.notEqual(a.id, otherSession.id); assert.notEqual(a.sessionId, otherSession.sessionId);
  assert.ok(PROFILE_ID.test(a.questionId) && PROFILE_ID.test(a.sessionId));
  const ids = new Set(QUESTIONS.map(x => NE.questionIdFor('seed-A', x)));
  assert.equal(ids.size, new Set(QUESTIONS.map(x => x.id)).size, 'distinct questions of one session never share an event id');
});

test('offline answers keep their original time and identity until replay; storing twice leaves one queued event', () => {
  clearOutbox();
  const q = QUESTIONS.find(x => P.primaryAttribution(x));
  const t0 = Date.now() - 3 * 3600 * 1000;
  assert.equal(NE.queueNodeAttempt(q, true, { seed: 'offline', occurred: t0 }), true);
  assert.equal(NE.queueNodeAttempt(q, true, { seed: 'offline', occurred: t0 }), true);
  const queued = outbox();
  assert.equal(queued.length, 1, 'the same question queues one event');
  assert.equal(queued[0].occurred, t0);
  assert.ok(normalize(queued[0]));
  clearOutbox();
});

test('guest practice never becomes class evidence', () => {
  const script = `
    class M { getItem(k){return Object.hasOwn(this,k)?this[k]:null} setItem(k,v){this[k]=String(v)} removeItem(k){delete this[k]} }
    globalThis.localStorage=new M(); globalThis.location={search:'?learner=guest',hash:'',pathname:'/wpr-games/workplace-readiness/'};
    localStorage.setItem('wrg.profile.active.v1',JSON.stringify({id:'3b9d8a5e-1c2f-4a6b-8d7e-0f1a2b3c4d5e',token:'a'.repeat(64),expires:Date.now()+1e10}));
    const NE=await import(${JSON.stringify(new URL('wpr-games/workplace-readiness/online/node-evidence.mjs', root).href)});
    const q={id:'c0-x',templateId:'CON-D-001',mode:'decision',difficulty:'intermediate',concepts:['conflict-resolution:diplomatic-negotiation']};
    NE.queueNodeAttempt(q,true,{seed:'guest'});
    console.log(JSON.stringify(Object.keys(localStorage).filter(k=>k.includes('outbox'))));`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }).trim().split('\n').pop();
  assert.equal(out, '[]');
  // No active profile at all: nothing is queued either.
  const none = execFileSync(process.execPath, ['--input-type=module', '-e', script.replace(/localStorage\.setItem\('wrg\.profile\.active\.v1'[^;]*;/, '').replace("?learner=guest", '')], { encoding: 'utf8' }).trim().split('\n').pop();
  assert.equal(none, '[]');
});

// ---------------------------------------------------------------------------------------------------------------- legacy reporting
test('legacy class-report events are unchanged and carry no node dimensions', () => {
  const q = QUESTIONS.find(x => P.primaryAttribution(x) && (x.tags || []).length);
  const legacy = practiceEvent(q, true, 1700000000000, '11111111-1111-4111-8111-111111111111');
  assert.equal(legacy.activity, 'workplace-readiness-games'); assert.equal(legacy.pathway, 'workplace-readiness');
  assert.ok(legacy.dimensions.some(d => d.scope === 'skill' && d.id === q.skill));
  assert.ok(legacy.dimensions.every(d => ['skill', 'topic', 'subtopic'].includes(d.scope)), 'legacy events never carry node scope');
  for (const t of q.tags) assert.ok(legacy.dimensions.some(d => d.scope === 'subtopic' && d.id === t.subtopicId), 'every instructional tag still reports');
  assert.equal(legacy.format, undefined);
  const node = play(q).event;
  assert.equal(node.format, 'game-attempt'); assert.equal(node.activity, 'workplace-readiness'); assert.equal(node.courseId, 'workplace');
});

// ---------------------------------------------------------------------------------------------------------------- negative controls
test('negative controls: the assertions catch first-tag attribution, all-tag credit and an unverified server', () => {
  const sample = QUESTIONS.filter(q => q.concepts.length > 1).slice(0, 400);
  assert.doesNotThrow(() => assertPrimaryOnly(realCredit, sample), 'the real pipeline passes');
  const firstTag = q => [nodeOfConcept.get(q.concepts[0])];
  const everyTag = q => q.concepts.map(c => nodeOfConcept.get(c));
  const rotating = q => [nodeOfConcept.get(q.concepts[q.index % q.concepts.length])];
  const noVerification = q => { const p = P.primaryAttribution(q); return p ? [nodeOfConcept.get(q.concepts[q.concepts.length - 1])] : []; };
  for (const [name, bad] of Object.entries({ firstTag, everyTag, rotating, noVerification })) {
    assert.throws(() => assertPrimaryOnly(bad, sample), undefined, `${name} must be caught`);
  }
  // Crediting a unit the table calls ambiguous or generic must also be caught.
  const generic = QUESTIONS.find(q => !P.primaryAttribution(q));
  assert.ok(generic, 'the catalog has uncredited units');
  assert.throws(() => assertPrimaryOnly(q => [nodeOfConcept.get(q.concepts[0])], [generic]), undefined, 'crediting a generic unit must be caught');
  // A table entry that disagrees with the question's own tags is refused.
  const q = QUESTIONS.find(x => P.primaryAttribution(x));
  assert.equal(P.primaryAttribution({ ...q, concepts: q.concepts.filter(c => c !== P.primaryAttribution(q).conceptId).concat('teamwork:accountability-x') }), null);
});

// ---------------------------------------------------------------------------------------------------------------- activation and feasibility
const COV = await imp('cs-games/pathway/audit/wpr-mastery/coverage.mjs');
const measured = COV.measure(COV.loadCatalog());

test('only vetted nodes are enabled: the enabled list equals the activation rules applied to the live catalog', () => {
  assert.deepEqual({ ...P.WPR_AUTOMATIC }, COV.enabledTiers(measured), 'regenerate WPR_AUTOMATIC after changing content or the table');
  assert.equal(measured.rows.length, 94);
  for (const r of measured.rows.filter(x => x.enabled)) {
    assert.ok(r.keyCount >= COV.RULES.MIN_KEYS && r.highKeys >= COV.RULES.MIN_HIGH && r.modeCount >= COV.RULES.MIN_MODES, r.conceptId);
    assert.ok(COV.TIER_QUESTIONS[r.tier] / r.keyCount <= COV.RULES.MAX_PER_KEY, `${r.conceptId}: the ${r.tier} requirement is feasible without rote repetition`);
  }
});

test('performed-behaviour concepts are never automatic, whatever their question bank holds', () => {
  assert.equal(P.WPR_PERFORMANCE_ONLY.length, 8);
  for (const c of P.WPR_PERFORMANCE_ONLY) { assert.ok(nodeOfConcept.has(c), c); assert.equal(P.isAutomatic(c), false, c); }
  assert.ok(measured.rows.filter(r => r.performance).every(r => !r.enabled && r.status === 'teacher-assessed-performance'));
});

test('a reviewed primary on a node that is not enabled earns no credit and sends no node event', () => {
  const thin = QUESTIONS.find(q => { const p = P.reviewedPrimary(q); return p && !P.isAutomatic(p.conceptId); });
  assert.ok(thin, 'the catalog has reviewed questions on nodes that are not enabled');
  assert.equal(P.primaryAttribution(thin), null);
  assert.equal(play(thin).queued, false);
  const p = P.reviewedPrimary(thin);
  assert.equal(P.verifyPrimary(p.key, p.conceptId), false, 'the server refuses the claim even if a client sends it');
});

test('starting requirements: enabled Workplace Readiness skills get their tier, every other one stays teacher-assessed, other courses are unchanged', async () => {
  const { auditRecommended, TIERS } = await imp('cs-games/pathway/requirements/recommended.mjs');
  const registry = JSON.parse(fs.readFileSync(new URL('cs-games/pathway/evidence-gap-registry.json', root), 'utf8'));
  const rows = auditRecommended(graph, registry);
  const wpr = rows.filter(r => r.nodeId.startsWith('node:workplace:'));
  assert.equal(wpr.filter(r => r.tier).length, Object.keys(P.WPR_AUTOMATIC).length);
  for (const r of wpr) {
    const concept = [...nodeOfConcept].find(([, id]) => id === r.nodeId)[0];
    assert.equal(r.tier, P.WPR_AUTOMATIC[concept] ?? null, r.nodeId);
    if (r.tier) assert.ok(TIERS.some(t => t.id === r.tier), 'only the existing presets are used; no number is changed');
  }
  assert.deepEqual(TIERS.map(t => [t.id, t.minimumQuestions, t.accuracy]), [['quick-recognition', 50, 0.95], ['standard-practice', 30, 0.9], ['complex-reasoning', 20, 0.9]]);
  const others = { ...graph, nodes: graph.nodes.filter(n => n.courseId !== 'workplace') };
  assert.deepEqual(rows.filter(r => !r.nodeId.startsWith('node:workplace:')), auditRecommended(others, registry), 'no other course gains or loses an automatic skill');
});
