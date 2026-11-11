// Evidence gap registry (Phase 2): the committed registry and matrix must equal a fresh measurement, every claim in them must be
// reproducible through the real client-to-normalizer flow, and the classifier must report missing coverage instead of hiding it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import serviceGraph from '../curriculum-graph.json' with { type: 'json' };
import { makeAdapters, play, graph, root, tracker, drain, normalize, nodeIdsOf, pageSource } from './lib/lab-flow.mjs';
import { buildRegistry, toCsv, serialize, classify, measureMode, STATUSES, REGISTRY_PATH, MATRIX_PATH } from './lib/gap-registry.mjs';

const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const registry = JSON.parse(read(REGISTRY_PATH));
const byKey = new Map(registry.entries.map((e) => [`${e.game}/${e.mode}`, e]));
const REQUIRED = ['game', 'mode', 'assessedSkill', 'metadataSupport', 'objectiveScoring', 'nodeExists', 'mixedReaches', 'creditUnavailableReason', 'recommendedRepair', 'priority', 'status'];

test('the committed registry and coverage matrix equal a fresh run (deterministic, nothing stale)', () => {
  const fresh = buildRegistry();
  assert.equal(read(REGISTRY_PATH), serialize(fresh), 'evidence-gap-registry.json is stale: run node cs-games/pathway/tests/build-gap-registry.mjs');
  assert.equal(read(MATRIX_PATH), toCsv(fresh), 'JAVA_MASTERY_COVERAGE_MATRIX.csv is stale: run node cs-games/pathway/tests/build-gap-registry.mjs');
});

test('every entry carries every required field, a known status and priority, and an action when credit is unavailable', () => {
  assert.equal(registry.graphVersion, graph.version, 'registry was built against this graph version');
  for (const e of registry.entries) {
    for (const f of REQUIRED) assert.ok(f in e, `${e.game}/${e.mode} lacks ${f}`);
    assert.ok(STATUSES.includes(e.status), `${e.game}/${e.mode}: status ${e.status}`);
    assert.ok(['none', 'low', 'medium', 'high'].includes(e.priority));
    assert.equal(typeof e.nodeExists, 'boolean');
    if (e.status === 'fully-supported') { assert.equal(e.nodeExists, true); assert.equal(e.creditUnavailableReason, null); assert.ok(nodeIdOk(e.nodeId), `${e.game}/${e.mode}: node ${e.nodeId} must exist`); }
    else { assert.ok(e.creditUnavailableReason && e.recommendedRepair, `${e.game}/${e.mode}: a gap needs a reason and a repair`); assert.notEqual(e.priority, 'none'); }
    assert.ok(e.objectiveScoring.validatedBy.every((f) => fs.existsSync(new URL(f, root))), `${e.game}/${e.mode}: scoring evidence files exist`);
  }
  assert.deepEqual(Object.keys(registry.summary.byStatus).sort(), [...STATUSES].sort());
  assert.equal(Object.values(registry.summary.byStatus).reduce((a, b) => a + b, 0), registry.entries.length);
  function nodeIdOk(id) { return graph.nodes.some((n) => n.id === id); }
});

test('the registry covers every mode of every measured lab and every Advanced CS activity in the Package F inventory', () => {
  for (const a of Object.values(makeAdapters())) for (const m of a.modes) assert.ok(byKey.has(`${a.lab}/${m}`), `${a.lab}/${m} missing from the registry`);
  const inventory = JSON.parse(read('cs-games/reports/package-f/integration-coverage.json')).activities.filter((x) => x.pathway === 'Advanced CS');
  const extra = { 'class-builder-rearrange': 'class-object-lab/class-builder-rearrange', 'response-explorer': 'documentation-lab/response-explorer', 'api-project-builder': 'documentation-lab/api-builder' };
  for (const act of inventory) {
    const hit = extra[act.slug] ? byKey.has(extra[act.slug]) : registry.entries.some((e) => e.game === act.slug);
    assert.ok(hit, `inventory activity ${act.slug} has no registry entry`);
  }
  // Every node that credits practice has at least one registry entry pointing at it.
  const claimed = new Set(registry.entries.map((e) => e.nodeId).filter(Boolean));
  for (const n of graph.nodes.filter((x) => x.courseId === 'advanced' && x.familySelectors.length)) assert.ok(claimed.has(n.id), `${n.id} is credited by a lab mode but no registry entry names it`);
});

test('every fully-supported claim holds in the real flow: all drawn questions credited the intended node, at the difficulty presented', () => {
  for (const e of registry.entries.filter((x) => x.status === 'fully-supported' && x.measured.focusedDrawn)) {
    assert.equal(e.measured.focusedCreditedToIntendedNode, e.measured.focusedDrawn, `${e.game}/${e.mode}`);
    if (e.mixedReaches === true) assert.equal(e.measured.mixedCreditedToIntendedNode, e.measured.mixedDrawn, `${e.game}/${e.mode} Mixed`);
    assert.notEqual(e.metadataSupport.difficulty, 'missing-or-mismatched');
  }
  assert.equal(registry.summary.byStatus['metadata-repair-needed'], 0, 'no verified metadata defect is left open');
});

test('the gaps the registry reports are real: each unmapped activity credits nothing in the real flow (or never emits an event)', () => {
  // Response Explorer and API Project Builder call tracker.begin with these exact mode ids (see the pages); the normalizer must credit no node.
  for (const [mode, topic] of [['response-explorer', 'response-explorer/example-1'], ['api-builder', 'api-project/example-1']]) {
    const id = tracker.begin('documentation-lab', 'Documentation Lab', topic, 'Example', mode, 'Example'); drain();
    tracker.submit(id, true);
    const events = drain(); assert.equal(events.length, 1, `${mode} emits one evidence event`);
    const cleaned = normalize(events[0]);
    assert.deepEqual(nodeIdsOf(cleaned) ?? [], [], `${mode} must credit no node while the registry says none exists`);
  }
  for (const [file, mode] of [['java-games/documentation-lab/response-explorer-ui.js', '"response-explorer"'], ['java-games/documentation-lab/api-project-builder-ui.js', '"api-builder"']]) assert.ok(pageSource(file).includes(mode), `${file} still begins with the mode id the registry documents`);
  // Class Builder Rearrange never calls the shared tracker, so it cannot emit evidence.
  for (const f of ['src/ui.js', 'src/session.js', 'src/main.js']) {
    const rel = `java-games/class-object-lab/class-builder-rearrange/${f}`;
    if (!fs.existsSync(new URL(rel, root))) continue;
    assert.ok(!/createSessionTracker|recordGameAttempt|JavaGamesSession\.recordResult\s*\(/.test(pageSource(rel).replace(/\/\/.*$/gm, '')), `${rel} would now emit evidence; update the registry`);
  }
  for (const key of ['documentation-lab/response-explorer', 'documentation-lab/api-builder', 'class-object-lab/class-builder-rearrange']) assert.notEqual(byKey.get(key).status, 'fully-supported');
});

test('negative: the classifier reports each kind of missing coverage and does not call it supported', () => {
  const node = { id: 'x' };
  assert.equal(classify({ node: null, credited: true, difficulty: 'sent', mixedReaches: true }).status, 'curriculum-mapping-needed');
  assert.equal(classify({ node, credited: false, difficulty: 'sent', mixedReaches: true }).status, 'metadata-repair-needed');
  assert.equal(classify({ node, credited: true, difficulty: 'missing-or-mismatched', mixedReaches: true }).status, 'metadata-repair-needed');
  assert.equal(classify({ node, credited: true, difficulty: 'sent', mixedReaches: false }).status, 'metadata-repair-needed');
  assert.equal(classify({ node, credited: true, difficulty: 'sent', mixedReaches: 'no-mixed-mode' }).status, 'fully-supported');
  for (const c of [{ node: null }, { node, credited: false }]) { const r = classify({ difficulty: 'sent', mixedReaches: true, ...c }); assert.ok(r.reason && r.repair && r.priority === 'high'); }
});

test('negative (end to end): when the graph stops mapping a mode, the measurement notices and the classifier stops calling it supported', () => {
  const adapters = makeAdapters(), robot = adapters['robot-algorithms'];
  const target = serviceGraph.nodes.find((n) => n.id === 'node:advanced:robot-algorithms:build');
  const saved = target.familySelectors;
  const intact = measureMode(robot, 'build');
  const intactOk = intact.cells.every(([, c]) => c.credited === c.drawn);
  assert.ok(intactOk, 'with the graph intact the mode is credited');
  try {
    target.familySelectors = []; // the service-side graph the normalizer reads
    const broken = measureMode(adapters['robot-algorithms'], 'build');
    const drawn = broken.cells.reduce((s, [, c]) => s + c.drawn, 0), credited = broken.cells.reduce((s, [, c]) => s + c.credited, 0);
    assert.equal(credited, 0, 'no question may be credited once the node no longer selects the mode');
    assert.equal(classify({ node: graph.nodes.find((n) => n.id === target.id), credited: credited === drawn, difficulty: 'not-applicable', mixedReaches: true }).status, 'metadata-repair-needed');
  } finally { target.familySelectors = saved; }
  const restored = measureMode(makeAdapters()['robot-algorithms'], 'build');
  assert.ok(restored.cells.every(([, c]) => c.credited === c.drawn), 'restoring the graph restores credit');
});

test('negative: a misattributed event (right activity, wrong mode or family) is not credited to the node it names', () => {
  const adapters = makeAdapters(), a = adapters['inheritance-polymorphism-lab'];
  const q = a.focused('override', 0), r = play(a, q, 'correct');
  const real = r.credits[0].event;
  assert.deepEqual(r.credits[0].ids, ['node:advanced:inheritance-polymorphism-lab:override']);
  // Family of an override question but claiming the tracer mode (and vice versa): the family/mode disagreement credits nothing.
  const forged = { ...real, assessedMode: 'tracer', mode: 'tracer' };
  assert.deepEqual(nodeIdsOf(normalize(forged)) ?? [], [], 'a forged mode with another mode\'s family must not credit tracer or override');
  const forgedNode = { ...real, assessedMode: 'hierarchy', mode: 'hierarchy', familyId: real.familyId };
  assert.ok(!(nodeIdsOf(normalize(forgedNode)) ?? []).includes('node:advanced:inheritance-polymorphism-lab:override'));
});

test('matrix: one row per game / mode / difficulty, derived from the registry, with no empty node cell for a supported mode', () => {
  const csv = read(MATRIX_PATH).trimEnd().split('\n');
  const header = csv[0].split(',');
  assert.ok(['game', 'mode', 'difficulty', 'status', 'node_id', 'mixed_reaches', 'recommended_repair'].every((c) => header.includes(c)));
  const cells = new Map(); for (const m of registry.matrix) cells.set(`${m.game}/${m.mode}/${m.difficulty}`, m);
  assert.equal(cells.size, registry.matrix.length, 'no duplicate game/mode/difficulty rows');
  const withoutCells = registry.entries.filter((e) => !registry.matrix.some((m) => m.game === e.game && m.mode === e.mode)).length;
  assert.equal(csv.length - 1, registry.matrix.length + withoutCells);
  for (const lab of ['boolean-conditional-lab', 'math-lab']) assert.ok(registry.matrix.some((m) => m.game === lab && ['beginner', 'intermediate', 'advanced'].includes(m.difficulty)), `${lab} has per-difficulty rows`);
});
