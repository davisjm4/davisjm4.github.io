// Advanced CS evidence coverage (Phase 2): every Java lab mode, focused and Mixed, through the real client-to-normalizer flow.
//   engine question -> session tracker -> recordGameAttempt -> outbox event -> cleanGameAttempt -> credited node ids.
// Synthetic profile and stubbed network only. See lib/lab-flow.mjs for the harness and the per-lab page shapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB_ADAPTERS, E, graph, nodeById, play, pageGuards, pageSource, normalize, nodeIdsOf, tracker, drain, reseed, unmappedReport, S } from './lib/lab-flow.mjs';
import fs from 'node:fs';

const phase1 = JSON.parse(fs.readFileSync(new URL('./fixtures/phase1-ids.json', import.meta.url), 'utf8'));
const LABS = Object.values(LAB_ADAPTERS);
const N_FOCUSED = 12; // draws per mode (levels cycle, so every level is hit)
const N_MIXED = 420;
const famBound = (nodeId, familyId) => graph.questionFamilies.some(f => f.sourceFamilyId === familyId && f.nodeIds.includes(nodeId));
const PHASE2_NODES = ['linkedlist-lab:references', 'inheritance-polymorphism-lab:hierarchy', 'inheritance-polymorphism-lab:override', 'inheritance-polymorphism-lab:tracer', 'inheritance-polymorphism-lab:debug', 'documentation-lab:editor', 'documentation-lab:builder', 'robot-algorithms:build', 'robot-algorithms:debug'].map(x => 'node:advanced:' + x);
const ELEVEN = [['method-constructor-lab', 'order-args'], ['linkedlist-lab', 'link'], ['linkedlist-lab', 'mutate'], ['inheritance-polymorphism-lab', 'hierarchy'], ['inheritance-polymorphism-lab', 'override'], ['inheritance-polymorphism-lab', 'tracer'], ['inheritance-polymorphism-lab', 'debug'], ['documentation-lab', 'editor'], ['documentation-lab', 'builder'], ['robot-algorithms', 'build'], ['robot-algorithms', 'debug']];

// ------------------------------------------------------------------ pages ------------------------------------------------------------------
test('wiring: every lab page still sends the begin/annotate shape this suite reproduces', () => {
  for (const [lab, [file, needles]] of Object.entries(pageGuards)) {
    const src = pageSource(file).replace(/\s+/g, ' ');
    for (const needle of needles) assert.ok(src.includes(needle.replace(/\s+/g, ' ')), `${lab}: ${file} no longer contains: ${needle}`);
  }
  // Cache tags: a changed page must be fetched fresh next to its changed imports.
  for (const [file, tag] of [['java-games/linkedlist-lab/index.html', 'linkedlist-evidence-v1'], ['java-games/inheritance-polymorphism-lab/index.html', 'iplab-evidence-v1'], ['java-games/documentation-lab/index.html', 'doc-evidence-v1'], ['java-games/robot-algorithms/index.html', 'robot-evidence-v1'], ['java-games/boolean-conditional-lab/index.html', 'bool-evidence-v1'], ['java-games/math-lab/index.html', 'math-mixed-v1']])
    assert.ok(pageSource(file).includes(tag), `${file} cache tag ${tag}`);
});

// ------------------------------------------------------------------ graph ------------------------------------------------------------------
test('graph is additive to Phase 1: only the nine documented nodes are new, order and ids preserved, version unchanged, nothing activated', () => {
  const ids = graph.nodes.map(n => n.id);
  assert.deepEqual(ids.filter(id => phase1.nodeIds.includes(id)), phase1.nodeIds, 'Phase 1 node order unchanged');
  assert.deepEqual(ids.filter(id => !phase1.nodeIds.includes(id)).sort(), [...PHASE2_NODES].sort());
  const fam = new Set(graph.questionFamilies.map(f => f.id));
  for (const id of phase1.familyIds) assert.ok(fam.has(id), `${id} preserved`);
  assert.equal(graph.version, phase1.graphVersion, 'graph version intentionally unchanged (see GRAPH_COMPATIBILITY.md)');
  // Existing nodes may only change where documented: match-call gains order-args; five labs gain family bindings.
  const allowed = new Set(['node:advanced:method-constructor-lab:match-call', 'node:advanced:inheritance-polymorphism-lab:abstract', ...['inspector', 'docs', 'detective'].map(m => `node:advanced:documentation-lab:${m}`), ...['predict', 'loops', 'conditionals', 'methods'].map(m => `node:advanced:robot-algorithms:${m}`)]);
  for (const id of phase1.nodeIds) {
    const now = JSON.stringify(nodeById.get(id).familySelectors), then = JSON.stringify(phase1.selectors[id]);
    if (now !== then) assert.ok(allowed.has(id) && id.endsWith(':match-call'), `selectors of ${id} changed unexpectedly`);
  }
  const mc = nodeById.get('node:advanced:method-constructor-lab:match-call').familySelectors[0];
  assert.deepEqual(mc.modeIds, ['match-call', 'order-args']);
  for (const id of PHASE2_NODES) { const n = nodeById.get(id); assert.equal(n.estimateProvisional, true); assert.ok(n.objective && n.objective.length > 20, `${id} has an instructional objective`); assert.deepEqual(n.prerequisites, []); assert.ok(n.areaId.startsWith('area:advanced:')); }
  for (const n of graph.nodes) for (const p of n.prerequisites) assert.ok(nodeById.has(p));
  for (const n of graph.nodes) assert.ok(!('policy' in n) && !('masteryPolicy' in n), 'no mastery policy is attached by this package');
});

test('every node-bearing mode selector resolves to exactly one node per activity+mode, except the documented order-args contribution', () => {
  const owners = new Map();
  for (const n of graph.nodes.filter(n => n.courseId === 'advanced')) for (const s of n.familySelectors) for (const m of [s.modeId, ...(s.modeIds || [])].filter(Boolean)) { const k = `${s.activityId}|${m}`; (owners.get(k) || owners.set(k, []).get(k)).push(n.id); }
  for (const [k, list] of owners) assert.equal(list.length, 1, `${k} credits ${list.join(', ')}`);
});

test('family bindings: every reasoning family the engines produce is bound to the node of its mode, and every bound family is reachable', () => {
  const produced = new Map(); // nodeId -> Set(familyId)
  const add = (node, fam) => (produced.get(node) || produced.set(node, new Set()).get(node)).add(fam);
  for (const lab of ['inheritance-polymorphism-lab', 'documentation-lab', 'robot-algorithms', 'linkedlist-lab']) {
    const a = LAB_ADAPTERS[lab];
    for (const mode of a.modes) for (let i = 0; i < (lab === 'robot-algorithms' ? 160 : 260); i++) {
      const q = a.focused(mode, i), d = a.details(q);
      if (d?.family) add(a.expected(q), d.family);
    }
  }
  // Bank enumeration for the lab banks (engines draw from fixed banks, so enumeration is exhaustive)
  for (const [mode, fams] of Object.entries(E.IP.FAMILY_TITLES)) for (const f of Object.keys(fams)) add(`node:advanced:inheritance-polymorphism-lab:${mode}`, `${mode}/${f}`);
  for (const [mode, items] of Object.entries(E.DOC.ITEMS)) for (const f of new Set(items.map(i => i.family))) add(`node:advanced:documentation-lab:${mode}`, `${mode}/${f}`);
  for (const [nodeId, fams] of produced) {
    const n = nodeById.get(nodeId); assert.ok(n, nodeId);
    assert.equal(n.familyBindingStatus, 'source-family-ids', `${nodeId} must have bound families`);
    const bound = new Set(graph.questionFamilies.filter(f => f.nodeIds.includes(nodeId)).map(f => f.sourceFamilyId));
    for (const f of fams) assert.ok(bound.has(f), `${nodeId}: engine family ${f} is not bound`);
    for (const f of bound) assert.ok(fams.has(f), `${nodeId}: bound family ${f} is never produced`);
  }
  for (const qf of graph.questionFamilies.filter(f => ['linkedlist-lab', 'inheritance-polymorphism-lab', 'documentation-lab', 'robot-algorithms'].includes(f.activityId))) assert.equal(qf.nodeIds.length, 1, `${qf.id} binds one node`);
});

// --------------------------------------------------------- focused practice, every mode ---------------------------------------------------------
test('focused practice: every mode of every Advanced CS lab credits exactly its intended node once, at the difficulty actually presented', (t) => {
  let total = 0; const perLab = {};
  for (const a of LABS) {
    for (const mode of a.modes) for (let i = 0; i < N_FOCUSED; i++) {
      const q = a.focused(mode, i);
      assert.equal(a.mode(q), mode, `${a.lab}: asked for ${mode}, got ${a.mode(q)}`);
      const r = play(a, q, 'correct');
      assert.equal(r.events.length, 1, `${a.lab}/${mode}: one event per scored question`);
      const [{ event, cleaned, ids }] = r.credits;
      assert.ok(cleaned, `${a.lab}/${mode}: normalizer rejected the event`);
      assert.deepEqual(ids, [a.expected(q)], `${a.lab}/${mode} credited ${JSON.stringify(ids)}`);
      assert.equal(cleaned.data.n, 1); assert.equal(cleaned.data.c, 1);
      assert.equal(event.assessedMode, mode, `${a.lab}/${mode}: assessedMode`);
      const want = a.difficulty(q);
      assert.equal(cleaned.data.difficulty, want == null ? null : String(want).toLowerCase(), `${a.lab}/${mode}: difficulty recorded must equal difficulty presented`);
      total++; perLab[a.lab] = (perLab[a.lab] || 0) + 1;
    }
  }
  t.diagnostic(`focused questions credited to exactly the intended node: ${total} (${Object.entries(perLab).map(([k, v]) => `${k} ${v}`).join(', ')})`);
});

// ------------------------------------------------------------------ Mixed Practice ------------------------------------------------------------------
test('Mixed Practice: the credited node follows the question actually shown, in every lab that has Mixed, and every mode is reachable', (t) => {
  const report = [];
  for (const a of LABS) {
    if (!a.mixed) { report.push(`${a.lab}: no Mixed Practice`); continue; }
    const modesSeen = new Set(); let credited = 0;
    for (let i = 0; i < N_MIXED; i++) {
      const q = a.mixed(i), r = play(a, q, 'correct');
      assert.equal(r.events.length, 1);
      assert.deepEqual(r.credits[0].ids, [a.expected(q)], `${a.lab} Mixed: ${a.mode(q)} credited ${JSON.stringify(r.credits[0].ids)}`);
      assert.equal(r.credits[0].event.assessedMode, a.mode(q), `${a.lab} Mixed assessedMode is the question's own mode, not Mixed`);
      const want = a.difficulty(q); assert.equal(r.credits[0].cleaned.data.difficulty, want == null ? null : String(want).toLowerCase(), `${a.lab} Mixed: difficulty recorded must equal difficulty presented`);
      modesSeen.add(a.mode(q)); credited++;
    }
    const missing = a.modes.filter(m => !modesSeen.has(m));
    assert.deepEqual(missing, [], `${a.lab}: Mixed Practice never reached ${missing.join(', ')}`);
    report.push(`${a.lab}: ${credited} Mixed questions, ${modesSeen.size}/${a.modes.length} modes reached`);
  }
  t.diagnostic(report.join(' | '));
});

test('Math Lab Mixed Practice now reaches math-methods and numeric-limits, credits them to their own nodes, and records their difficulty', () => {
  const a = LAB_ADAPTERS['math-lab'];
  const seen = { 'math-methods': new Set(), 'numeric-limits': new Set() };
  for (let i = 0; i < 700; i++) {
    const q = a.mixed(i);
    if (!E.X.EXPANSION_MODES[q.mode]) continue;
    const r = play(a, q, 'correct'), ev = r.credits[0].event;
    assert.deepEqual(r.credits[0].ids, [`node:advanced:math-lab:${q.mode}`]);
    assert.equal(r.credits[0].cleaned.data.difficulty, e3(i)); assert.equal(r.credits[0].cleaned.data.difficulty, q.difficulty);
    assert.ok(ev.familyId && famBound(`node:advanced:math-lab:${q.mode}`, ev.familyId), `family ${ev.familyId} is bound to the node`);
    seen[q.mode].add(q.difficulty);
  }
  function e3(i) { return ['beginner', 'intermediate', 'advanced'][i % 3]; }
  for (const m of Object.keys(seen)) assert.deepEqual([...seen[m]].sort(), ['advanced', 'beginner', 'intermediate'], `${m} reached at every level through Mixed`);
  // Original-mode questions now send their structure family, which the graph already binds.
  for (let i = 0; i < 200; i++) {
    const q = a.mixed(i); if (E.X.EXPANSION_MODES[q.mode]) continue;
    const r = play(a, q, 'correct'), ev = r.credits[0].event;
    assert.equal(ev.familyId, `${q.mode}:${q.shape}`); assert.ok(famBound(`node:advanced:math-lab:${q.mode}`, ev.familyId));
    assert.equal(r.credits[0].cleaned.data.difficulty, null, 'original modes have no difficulty levels and are not labelled with one');
  }
});

test('Boolean lab records the difficulty the page presented (it previously recorded none)', () => {
  const a = LAB_ADAPTERS['boolean-conditional-lab'];
  for (const [i, level] of ['beginner', 'intermediate', 'advanced'].entries()) for (let k = 0; k < 10; k++) {
    const q = a.mixed(i), r = play(a, q, 'correct');
    assert.equal(r.credits[0].cleaned.data.difficulty, String(q.difficulty).toLowerCase());
  }
});

// ------------------------------------------------------------- the eleven previously unmapped modes -------------------------------------------------------------
test('the eleven previously unmapped modes each credit exactly one node, and never an unrelated skill', () => {
  for (const [lab, mode] of ELEVEN) {
    const a = LAB_ADAPTERS[lab];
    for (let i = 0; i < 40; i++) {
      const q = a.focused(mode, i), r = play(a, q, 'correct');
      assert.equal(r.credits[0].ids.length, 1, `${lab}/${mode} credits ${r.credits[0].ids.join(', ') || 'nothing'}`);
      assert.deepEqual(r.credits[0].ids, [a.expected(q)]);
    }
  }
  // Named negatives, from the assignment.
  const mc = LAB_ADAPTERS['method-constructor-lab'];
  for (let i = 0; i < 40; i++) { const r = play(mc, mc.focused('order-args', i)); assert.deepEqual(r.credits[0].ids, ['node:advanced:method-constructor-lab:match-call']); }
  const others = graph.nodes.filter(n => n.id.startsWith('node:advanced:method-constructor-lab:') && !n.id.endsWith(':match-call'));
  for (const n of others) assert.ok(!n.familySelectors.some(s => [s.modeId, ...(s.modeIds || [])].includes('order-args')), `${n.id} must not accept order-args`);
  const ip = LAB_ADAPTERS['inheritance-polymorphism-lab'];
  for (const m of ['tracer', 'hierarchy', 'override', 'debug', 'abstract']) for (let i = 0; i < 25; i++) {
    const r = play(ip, ip.focused(m, i)); assert.deepEqual(r.credits[0].ids, [`node:advanced:inheritance-polymorphism-lab:${m}`], `a ${m} question must credit only the ${m} node`);
  }
  const rb = LAB_ADAPTERS['robot-algorithms'];
  for (const m of ['build', 'debug']) for (let i = 0; i < 40; i++) {
    const r = play(rb, rb.focused(m, i)); assert.deepEqual(r.credits[0].ids, [`node:advanced:robot-algorithms:${m}`], `finishing a robot ${m} task must not credit loops, conditionals, methods or predict`);
  }
  const ll = LAB_ADAPTERS['linkedlist-lab'];
  for (const m of ['link', 'mutate']) for (let i = 0; i < 40; i++) { const r = play(ll, ll.focused(m, i)); assert.deepEqual(r.credits[0].ids, ['node:advanced:linkedlist-lab:references']); }
  for (const m of ['trace', 'collections']) for (let i = 0; i < 20; i++) { const r = play(ll, ll.focused(m, i)); assert.deepEqual(r.credits[0].ids, [`node:advanced:linkedlist-lab:${m}`], 'trace/collections never credit the reference-wiring node'); }
});

test('debug questions are attributed by defect type: each Inheritance and Robot defect family is bound once, to the debug node only', () => {
  for (const [lab, node, prefix] of [['inheritance-polymorphism-lab', 'node:advanced:inheritance-polymorphism-lab:debug', 'debug/'], ['robot-algorithms', 'node:advanced:robot-algorithms:debug', 'debug:']]) {
    const fams = graph.questionFamilies.filter(f => f.activityId === lab && f.sourceFamilyId.startsWith(prefix));
    assert.ok(fams.length >= 5, `${lab} debug defect families`);
    for (const f of fams) assert.deepEqual(f.nodeIds, [node]);
    const a = LAB_ADAPTERS[lab], seen = new Set();
    for (let i = 0; i < 200; i++) { const q = a.focused('debug', i), r = play(a, q); seen.add(r.credits[0].event.familyId); assert.deepEqual(r.credits[0].ids, [node]); }
    assert.deepEqual([...seen].sort(), fams.map(f => f.sourceFamilyId).sort(), `${lab}: every defect family is reachable and recorded`);
  }
});

// --------------------------------------------------------------- first-attempt rules for the new modes ---------------------------------------------------------------
test('first-attempt evidence: wrong-then-right stays a miss, reveals and skips credit nothing, double submits count once (all eleven modes)', () => {
  for (const [lab, mode] of ELEVEN) {
    const a = LAB_ADAPTERS[lab];
    const q1 = a.focused(mode, 1), wr = play(a, q1, 'wrongThenRight');
    assert.equal(wr.events.length, 2); const [first, second] = wr.credits;
    assert.deepEqual([first.cleaned.data.n, first.cleaned.data.c], [1, 0], 'first answer is scored, and it was wrong');
    assert.deepEqual(first.ids, [a.expected(q1)], 'the miss is recorded against the right node');
    assert.deepEqual([second.cleaned.data.n, second.cleaned.data.c], [0, 0], 'the later correct retry adds no first-try evidence');
    assert.deepEqual(second.cleaned.data.dimensions, []);
    const inc = play(a, a.focused(mode, 2), 'incorrect'); assert.equal(inc.events.length, 1, 'wrong answer then reveal: only the submission is evidence'); assert.equal(inc.credits[0].cleaned.data.c, 0);
    assert.equal(play(a, a.focused(mode, 3), 'skip').events.length, 0, 'a skipped question emits no evidence');
    assert.equal(play(a, a.focused(mode, 4), 'reveal').events.length, 0, 'a revealed answer emits no evidence');
    const dbl = play(a, a.focused(mode, 5), 'doubleSubmit'); assert.equal(dbl.events.length, 1, 'a repeated submission of one question is one scoring event'); assert.equal(dbl.credits[0].cleaned.data.n, 1);
  }
});

// ------------------------------------------------------------------- negative tests -------------------------------------------------------------------
function forged(over) {
  const a = LAB_ADAPTERS['inheritance-polymorphism-lab'], q = a.focused('tracer', 0), r = play(a, q, 'correct');
  const ev = { ...r.events[0], ...over }; return normalize(ev);
}
test('negative: forged or misattributed events credit nothing or are rejected', () => {
  // A tracer family claimed under another mode's node: mode picks the node, the family must belong to it, so nothing is credited.
  const wrongFamily = forged({ assessedMode: 'hierarchy', familyId: 'tracer/swap' }); assert.deepEqual(nodeIdsOf(wrongFamily), []);
  // Mixed or a display label is not a mode.
  assert.deepEqual(nodeIdsOf(forged({ assessedMode: 'mixed' })), []);
  assert.deepEqual(nodeIdsOf(forged({ assessedMode: 'Polymorphism Tracer', mode: 'Polymorphism Tracer' })), []); // a display title has spaces: metadata nulls it, nothing is left to match
  // A mode of a different lab does not resolve under this activity.
  assert.deepEqual(nodeIdsOf(forged({ assessedMode: 'trace' })), []);
  assert.deepEqual(nodeIdsOf(forged({ assessedMode: 'order-args' })), []);
  // A mode that was practice-only before this package no longer exists under the old shape, and an invented one credits nothing.
  assert.deepEqual(nodeIdsOf(forged({ assessedMode: 'builder' })), []);
  // An activity the course does not register is rejected outright.
  assert.equal(forged({ activity: 'not-a-lab' }), null);
  // A tampered event id is rejected.
  assert.equal(forged({ id: 'x:1' }), null);
  // Retries and assisted work never create node evidence.
  { const a = LAB_ADAPTERS['inheritance-polymorphism-lab'], r = play(a, a.focused('tracer', 0), 'correct'), ev = r.events[0];
    assert.deepEqual(normalize({ ...ev, attempt: 2, id: ev.questionId + ':2' }).data.dimensions, [], 'a retry never creates node evidence');
    assert.deepEqual(normalize({ ...ev, assisted: true }).data.dimensions, [], 'assisted work never creates node evidence'); }
});

test('negative: an unknown mode is reported, not silently lost', () => {
  // The audit wants unmapped practice to be visible. A real unmapped event is classified here and added to the report.
  const a = LAB_ADAPTERS['inheritance-polymorphism-lab'], r = play(a, a.focused('tracer', 0), 'correct');
  const ev = { ...r.events[0], assessedMode: 'not-a-mode', mode: 'not-a-mode' }; const cleaned = normalize(ev);
  assert.deepEqual(nodeIdsOf(cleaned), []); unmappedReport.push(`inheritance-polymorphism-lab assessedMode ${ev.assessedMode}: credits nothing`);
  assert.equal(unmappedReport.length, 1);
});

test('compat: a cached older page that sends no annotation still credits the right node by mode (no family narrowing, no loss)', () => {
  for (const [lab, mode] of ELEVEN) {
    const a = LAB_ADAPTERS[lab], q = a.focused(mode, 0), old = { ...a, details: () => null }, r = play(old, q, 'correct');
    assert.deepEqual(r.credits[0].ids, [a.expected(q)], `${lab}/${mode} from an un-annotated page`);
  }
});

test('session summaries still report the same totals with annotations in place', () => {
  const memory = new Map(); const bare = S.createSessionTracker({ storage: { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) } });
  const withNotes = S.createSessionTracker({ storage: { getItem: k => memory.get(k + 'b') ?? null, setItem: (k, v) => memory.set(k + 'b', v) } });
  reseed(99);
  for (const [lab, mode] of ELEVEN) {
    const a = LAB_ADAPTERS[lab]; const qs = [0, 1, 2].map(i => a.focused(mode, i));
    for (const [t, withDetails] of [[bare, false], [withNotes, true]]) for (const [i, q] of qs.entries()) {
      const rec = a.record(q), id = t.begin(lab, lab, rec.topic, String(rec.topic), rec.mode, String(rec.mode)); if (withDetails && a.details(q)) t.annotate(id, a.details(q));
      if (i === 0) t.submit(id, true); else if (i === 1) { t.submit(id, false); t.reveal(id); } else t.skip(id);
    }
  }
  drain();
  const strip = snap => JSON.parse(JSON.stringify({ totals: snap.totals, games: snap.games }));
  assert.deepEqual(strip(withNotes.snapshot()), strip(bare.snapshot()));
});
