// Mastery-evidence attribution: Variable Lab and String Lab practice attempts must resolve to the intended curriculum nodes.
// Flow under test (nothing is mocked except storage, timers and the network):
//   real session tracker (java-games/session.js)
//     -> real profile client recordGameAttempt (wpr-games/workplace-readiness/online/profile-sync.mjs) -> outbox event
//     -> real server normalizer cleanGameAttempt (wpr-games/workplace-readiness/service/profile-evidence.mjs) -> credited node ids.
// Variable Lab questions come from the real engine and are annotated by the same helper app.js calls; String Lab questions come from the
// real generator and real String Lab session, delivered through the real shared-session-bridge.js. Synthetic profile only; no real data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

// ---- environment stubs (installed before any application module is imported) ----
class MemoryStorage { getItem(k) { return Object.hasOwn(this, k) ? this[k] : null; } setItem(k, v) { this[k] = String(v); } removeItem(k) { delete this[k]; } }
globalThis.localStorage = new MemoryStorage();
localStorage.setItem('wrg.profile.active.v1', JSON.stringify({ id: '3b9d8a5e-1c2f-4a6b-8d7e-0f1a2b3c4d5e', token: 'a'.repeat(64), expires: Date.now() + 1e10, classId: 'synthetic-class', courseId: 'advanced' }));
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...rest) => { const t = realSetTimeout(fn, ms, ...rest); t.unref?.(); return t; }; // profile sync retry timers must not hold the test open
globalThis.fetch = async () => { throw new Error('network disabled in tests'); };
let seed = 20261111; const realRandom = Math.random; Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; // deterministic generators

const root = new URL('../../../', import.meta.url);
const imp = path => import(new URL(path, root).href);
const S = await imp('java-games/session.js');
const sync = await imp('wpr-games/workplace-readiness/online/profile-sync.mjs');
const { PROFILE_ID } = await imp('wpr-games/workplace-readiness/online/profile-model.mjs');
const { cleanGameAttempt } = await imp('wpr-games/workplace-readiness/service/profile-evidence.mjs');
const J = await imp('java-games/engine.js');
const graph = JSON.parse(fs.readFileSync(new URL('cs-games/pathway/curriculum-graph.json', root), 'utf8'));
const baseline = JSON.parse(fs.readFileSync(new URL('./fixtures/baseline-ids.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);
const SG = require('../string-lab-source.cjs');
require(new URL('java-games/string-lab/js/session.js', root).pathname);
assert.ok(sync.activeProfile, 'synthetic profile must be active so recordGameAttempt queues events');

// ---- shared helpers ----
const nodeById = new Map(graph.nodes.map(n => [n.id, n]));
const memory = new Map();
const tracker = S.createSessionTracker({ storage: { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) }, onAttempt: (...args) => sync.recordGameAttempt('advanced', ...args) });
const outboxPrefix = sync.device.key('outbox.');
function drain() { const keys = Object.keys(localStorage).filter(k => k.startsWith(outboxPrefix)); const events = keys.map(k => JSON.parse(localStorage.getItem(k))); keys.forEach(k => localStorage.removeItem(k)); return events; }
const normalize = event => cleanGameAttempt(event, id => PROFILE_ID.test(id));
const nodeIdsOf = cleaned => cleaned ? cleaned.data.dimensions.map(d => d.id) : null;
const unmapped = [];
function creditOf(event, label) { const c = normalize(event); assert.ok(c, `normalizer rejected ${label}`); const ids = nodeIdsOf(c); if (!ids.length) unmapped.push(`${label} (activity ${event.activity}, assessedMode ${event.assessedMode})`); return { cleaned: c, ids }; }

// Mirrors the begin/annotate calls in java-games/app.js for Variable Lab.
const variableModes = J.games['variable-lab'].modes;
function presentVariable(q) {
  const id = tracker.begin('variable-lab', 'Variable Lab', q.topic, q.topicTitle || q.topic.replaceAll('-', ' '), q.mode, variableModes[q.mode] || q.topicTitle || q.mode);
  const evidence = J.variableEvidence(q);
  if (evidence) tracker.annotate(id, evidence);
  return id;
}
const expectedVariable = q => q.mode === 'trace' ? 'trace' : q.mode === 'assemble' ? 'assemble' : `identify/${q.topic}`;

// ============================ Variable Lab ============================
test('every Variable Lab assessed mode has exactly one node, and every node-bearing mode is reachable from the UI contract', () => {
  for (const mode of J.VARIABLE_ASSESSED_MODES) {
    const matches = graph.nodes.filter(n => n.id.startsWith('node:advanced:variable-lab:') && n.familySelectors.some(s => s.modeId === mode || s.modeIds?.includes(mode)));
    assert.equal(matches.length, 1, `${mode} should map to exactly one node`);
    assert.equal(matches[0].id, `node:advanced:variable-lab:${mode}`);
  }
  assert.equal(J.VARIABLE_ASSESSED_MODES.length, 14);
  assert.ok(nodeById.has('node:advanced:variable-lab:assemble'), 'assemble node is added additively');
});

test('Variable Lab focused practice credits exactly the intended node with accurate metadata (all trace levels, 12 identify variants, assemble)', () => {
  const seen = new Set();
  const draws = [];
  for (const difficulty of ['beginner', 'intermediate', 'advanced']) for (let i = 0; i < 40; i++) draws.push(J.generate('variable-lab', 'trace', undefined, { difficulty }));
  for (let i = 0; i < 500; i++) draws.push(J.generate('variable-lab', 'identify'));
  for (let i = 0; i < 40; i++) draws.push(J.generate('variable-lab', 'assemble'));
  for (const q of draws) {
    const id = presentVariable(q); assert.equal(tracker.submit(id, true).firstTry, true);
    const events = drain(); assert.equal(events.length, 1, 'exactly one event per scored question');
    const expected = expectedVariable(q), { cleaned, ids } = creditOf(events[0], expected);
    assert.equal(events[0].assessedMode, expected, 'assessed mode is the explicit skill, not the display format');
    assert.deepEqual(ids, [`node:advanced:variable-lab:${expected}`], 'one question credits one node');
    assert.equal(cleaned.data.n, 1); assert.equal(cleaned.data.c, 1);
    if (q.mode === 'trace') { assert.equal(events[0].difficulty, q.difficulty); assert.equal(cleaned.data.difficulty, q.difficulty); assert.equal(events[0].familyId, q.traceFamily); assert.ok(!['output', 'final', 'checkpoint'].includes(events[0].assessedMode)); }
    else { assert.equal(events[0].difficulty, null, 'modes without tiers carry no invented difficulty'); assert.ok(events[0].familyId && events[0].familyId !== 'unclassified'); }
    seen.add(expected);
  }
  assert.deepEqual([...seen].sort(), [...J.VARIABLE_ASSESSED_MODES].sort(), 'every assessed mode was exercised');
});

test('Variable Lab Mixed Practice credits the question actually shown, at the difficulty actually shown', () => {
  const byDifficulty = { beginner: 0, intermediate: 0, advanced: 0 };
  for (const requested of [undefined, 'beginner', 'intermediate', 'advanced']) {
    let traces = 0;
    for (let i = 0; i < 150; i++) {
      const q = J.generate('variable-lab', 'mixed', undefined, requested ? { difficulty: requested } : {});
      const id = presentVariable(q); tracker.submit(id, true); const [event] = drain(); const { ids } = creditOf(event, 'mixed ' + expectedVariable(q));
      assert.deepEqual(ids, [`node:advanced:variable-lab:${expectedVariable(q)}`]);
      if (q.mode === 'trace') { traces++; assert.equal(event.difficulty, requested || 'beginner', 'trace difficulty is never relabelled'); byDifficulty[event.difficulty]++; }
      else assert.equal(event.difficulty, null);
    }
    assert.ok(traces > 20, `Mixed produced trace questions for ${requested || 'default'}`);
  }
  assert.ok(byDifficulty.intermediate > 0 && byDifficulty.advanced > 0, 'Mixed can now supply higher-difficulty trace evidence when the student chooses it');
});

test('skips and revealed answers never become first-try correct evidence; resubmissions do not double count', () => {
  const totalsBefore = tracker.snapshot().totals;
  let q = J.generate('variable-lab', 'identify'); let id = presentVariable(q);
  assert.equal(tracker.skip(id), true); assert.equal(drain().length, 0, 'skip emits no evidence event');
  assert.equal(tracker.submit(id, true).accepted, false, 'a skipped question cannot be scored afterwards'); assert.equal(drain().length, 0);
  q = J.generate('variable-lab', 'identify'); id = presentVariable(q);
  assert.equal(tracker.reveal(id), true); assert.equal(drain().length, 0, 'reveal emits no evidence event');
  assert.equal(tracker.submit(id, true).accepted, false); assert.equal(drain().length, 0);
  // wrong first try, then correct retry: first attempt counts as a miss; retry is not independent evidence
  q = J.generate('variable-lab', 'trace', undefined, { difficulty: 'advanced' }); id = presentVariable(q);
  tracker.submit(id, false); tracker.closeIncorrect?.(id);
  const first = drain(); assert.equal(first.length, 1); const c1 = normalize(first[0]); assert.equal(c1.data.n, 1); assert.equal(c1.data.c, 0);
  const retry = tracker.submit(id, true); if (retry.accepted) { const second = drain(); assert.equal(second.length, 1); const c2 = normalize(second[0]); assert.equal(c2.data.n, 0, 'retry is not first-attempt evidence'); assert.equal(c2.data.c, 0); }
  // solved question cannot be scored twice
  q = J.generate('variable-lab', 'assemble'); id = presentVariable(q); tracker.submit(id, true); assert.equal(drain().length, 1);
  assert.equal(tracker.submit(id, true).accepted, false); assert.equal(drain().length, 0, 'no second credit for the same scored question');
  const totals = tracker.snapshot().totals;
  assert.equal(totals.skipped - totalsBefore.skipped, 1, 'a skipped question is counted as skipped'); assert.equal(totals.revealed - totalsBefore.revealed, 1, 'a revealed question is counted as revealed');
  assert.equal(totals.firstTry - totalsBefore.firstTry, 1, 'only the one first-try solve (assemble) counted as first-try; skips and reveals never did');
});

test('annotating evidence does not change tracker totals or per-mode summaries', () => {
  const qs = []; for (let i = 0; i < 30; i++) qs.push(J.generate('variable-lab', 'mixed', undefined, { difficulty: 'intermediate' }));
  const run = annotate => {
    const store = new Map(); const t = S.createSessionTracker({ storage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } });
    qs.forEach((q, i) => { const id = t.begin('variable-lab', 'Variable Lab', q.topic, q.topicTitle || q.topic, q.mode, variableModes[q.mode]); if (annotate) t.annotate(id, J.variableEvidence(q)); if (i % 5 === 0) t.skip(id); else if (i % 7 === 0) t.reveal(id); else t.submit(id, i % 3 !== 0); });
    const snap = t.snapshot(); return { totals: snap.totals, modes: snap.games['variable-lab'].modes };
  };
  assert.deepEqual(run(true), run(false));
});

// ============================ String Lab ============================
const bridgeSource = fs.readFileSync(new URL('java-games/string-lab/js/shared-session-bridge.js', root), 'utf8')
  .replace("import('../../session.js?v=per-mode-daily-v1')", 'Promise.resolve(globalThis.__sharedSession)');
assert.ok(bridgeSource.includes('globalThis.__sharedSession'), 'bridge source transformation applied (dynamic import replaced)');
globalThis.dispatchEvent = () => true; // the browser window provides this; the bridge dispatches a ready event when the tracker attaches
globalThis.__sharedSession = { sessionTracker: () => tracker, addSessionNavigation() {} };
vm.runInThisContext(bridgeSource, { filename: 'shared-session-bridge.js' });
await new Promise(r => setImmediate(r));
assert.ok(globalThis.JavaGamesSessionBridge, 'real String Lab bridge installed');
const SL = globalThis.StringLab;
const stringNodeFor = mode => `node:advanced:string-lab:${mode === 'algorithms' ? 'algo' : mode}`;
function playString(ch, outcome) {
  const session = SL.Session.create({ settings: { mode: 'mixed' } }); drain();
  session.present(ch);
  if (outcome === 'correct') session.answer(ch.correctIndex);
  else if (outcome === 'incorrect') session.answer((ch.correctIndex + 1) % ch.choices.length);
  else if (outcome === 'reveal') session.reveal();
  else if (outcome === 'skip') session.skip();
  return drain();
}

test('every String Lab engine family belongs to exactly one node and its mode selector; selectors use mode ids, not family ids', () => {
  const families = SG.families();
  assert.ok(families.length >= 58);
  const stringNodes = graph.nodes.filter(n => n.id.startsWith('node:advanced:string-lab:'));
  assert.equal(stringNodes.length, 7);
  for (const n of stringNodes) {
    const [selector] = n.familySelectors;
    assert.ok(selector.modeId && !selector.modeIds, `${n.id} selects by engine mode id`);
    assert.ok(SG.MODES.some(m => m.id === selector.modeId), `${n.id} modeId is a real engine mode`);
    assert.deepEqual([...selector.familyIds].sort(), families.filter(f => f.mode === selector.modeId).map(f => f.id).sort(), `${n.id} lists exactly its mode's generator families`);
    assert.equal(n.familyBindingStatus, 'source-family-ids');
  }
  for (const f of families) {
    const bound = graph.questionFamilies.filter(b => b.activityId === 'string-lab' && b.sourceFamilyId === f.id);
    assert.equal(bound.length, 1, `${f.id} bound once`); assert.deepEqual(bound[0].nodeIds, [stringNodeFor(f.mode)]);
  }
  const omittedBefore = families.filter(f => !Object.values(baseline.stringSelectorsBefore).flat().includes(f.id)).map(f => f.id);
  assert.ok(omittedBefore.length > 0, 'baseline omitted some engine families (now bound)');
});

test('String Lab focused practice: every engine family at every level credits exactly its own node, once', () => {
  let checked = 0;
  for (const f of SG.families()) for (const difficulty of f.levels) {
    const ch = SG.generateChallenge({ seed: 11 + checked, mode: f.mode, difficulty, family: f.id });
    const events = playString(ch, 'correct'); assert.equal(events.length, 1, `${f.id}@${difficulty} emits one event`);
    const ev = events[0], { cleaned, ids } = creditOf(ev, `${f.id}@${difficulty}`);
    assert.equal(ev.assessedMode, f.mode); assert.equal(ev.familyId, f.id); assert.equal(ev.difficulty, difficulty);
    assert.deepEqual(ids, [stringNodeFor(f.mode)], `${f.id} credits only ${stringNodeFor(f.mode)}`);
    assert.equal(cleaned.data.n, 1); checked++;
  }
  assert.ok(checked >= 100);
});

test('String Lab Mixed Practice credits the mode of the question actually shown; mismatched family/mode credits nothing', () => {
  const gen = SG.createSession({ seed: 7, mode: 'mixed', difficulty: 'intermediate' }); const modes = new Set();
  for (let i = 0; i < 80; i++) { const ch = gen.next(); const [ev] = playString(ch, i % 4 === 0 ? 'incorrect' : 'correct'); const { cleaned, ids } = creditOf(ev, 'mixed ' + ch.family); modes.add(ch.mode);
    assert.equal(ev.assessedMode, ch.mode); assert.deepEqual(ids, [stringNodeFor(ch.mode)]); assert.equal(cleaned.data.c, i % 4 === 0 ? 0 : 1); }
  assert.equal(modes.size, 7, 'Mixed reached all seven String Lab modes');
  const ch = SG.generateChallenge({ seed: 5, mode: 'trace', difficulty: 'beginner' }); const [ev] = playString(ch, 'correct');
  const forged = { ...ev, familyId: 'predict.charAt' }; // a family that belongs to a different node
  assert.deepEqual(nodeIdsOf(normalize(forged)), [], 'a family bound to another node must not be credited to this mode');
});

test('String Lab skips and reveals emit no evidence; incorrect first answers count as a miss', () => {
  const ch = SG.generateChallenge({ seed: 3, mode: 'index', difficulty: 'beginner' });
  assert.equal(playString(ch, 'skip').length, 0); assert.equal(playString(ch, 'reveal').length, 0);
  const [miss] = playString(ch, 'incorrect'); const c = normalize(miss); assert.equal(c.data.n, 1); assert.equal(c.data.c, 0);
});

// ============================ Graph compatibility ============================
const PHASE2_NODES = ['linkedlist-lab:references', 'inheritance-polymorphism-lab:hierarchy', 'inheritance-polymorphism-lab:override', 'inheritance-polymorphism-lab:tracer', 'inheritance-polymorphism-lab:debug', 'documentation-lab:editor', 'documentation-lab:builder', 'robot-algorithms:build', 'robot-algorithms:debug'].map(x => 'node:advanced:' + x);
test('graph is additive: every baseline node and family id survives, graph version unchanged, order preserved', () => {
  const ids = graph.nodes.map(n => n.id);
  for (const id of baseline.nodeIds) assert.ok(nodeById.has(id), `${id} preserved`);
  assert.deepEqual(ids.filter(id => baseline.nodeIds.includes(id)), baseline.nodeIds, 'existing node order unchanged');
  const famIds = new Set(graph.questionFamilies.map(f => f.id)); for (const id of baseline.familyIds) assert.ok(famIds.has(id), `${id} preserved`);
  assert.equal(graph.version, baseline.graphVersion, 'graph version is intentionally unchanged so saved pathway drafts stay valid');
  assert.equal(new Set(ids).size, ids.length);
  // Phase 1 added the Variable assemble node; Phase 2 (java-evidence-coverage.test.mjs) adds the nine nodes listed here and nothing else.
  const added = ids.filter(id => !baseline.nodeIds.includes(id));
  assert.deepEqual(added.sort(), ['node:advanced:variable-lab:assemble', ...PHASE2_NODES].sort());
  for (const n of graph.nodes) for (const p of n.prerequisites) assert.ok(nodeById.has(p), 'prerequisite references stay valid');
});

test('wiring: app.js and the String Lab bridge send the explicit assessed mode', () => {
  const app = fs.readFileSync(new URL('java-games/app.js', root), 'utf8');
  assert.ok(app.includes('J.variableEvidence(q)'));
  const bridge = fs.readFileSync(new URL('java-games/string-lab/js/shared-session-bridge.js', root), 'utf8');
  assert.equal((bridge.match(/practiceMode: ch\.mode/g) || []).length, 2);
});

test('unmapped questions are reported explicitly', (t) => {
  const synthetic = { version: 1, format: 'game-attempt', kind: 'practice', id: '', questionId: crypto.randomUUID(), sessionId: crypto.randomUUID(), courseId: 'advanced', activity: 'variable-lab', attempt: 1, correct: true, occurred: Date.now(), mode: 'identify', assessedMode: 'identify', topic: 'type', difficulty: null, familyId: null, assisted: false };
  synthetic.id = synthetic.questionId + ':1';
  const c = normalize(synthetic); assert.deepEqual(nodeIdsOf(c), [], 'the pre-repair shape (mode "identify" with the variant as topic) credits nothing');
  creditOf(synthetic, 'pre-repair identify event');
  t.diagnostic(`UNMAPPED questions seen in this run: ${unmapped.length}`);
  for (const line of unmapped) t.diagnostic('UNMAPPED ' + line);
  assert.equal(unmapped.length, 1, 'only the deliberately pre-repair synthetic event is unmapped; every real Variable and String question mapped');
});

test.after(() => { Math.random = realRandom; });
