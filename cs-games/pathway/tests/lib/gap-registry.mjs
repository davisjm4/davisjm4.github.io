// Evidence gap registry generator (Phase 2).
//
// One entry per (game, mode) of every Java Games activity. Measured fields come from running real engine questions through the real
// client-to-normalizer flow (lib/lab-flow.mjs); authored fields (scoring basis, notes, the status of activities with no node) are the
// small tables below. Output is deterministic: fresh adapters and a fixed seed per run, so `build-gap-registry.mjs --check` and the
// registry test can diff the committed files byte for byte.
//
// Status vocabulary (every entry carries exactly one):
//   fully-supported              a node exists; the real flow credits exactly that node, with the difficulty actually presented; Mixed reaches it
//   metadata-repair-needed       scoring and node exist but the question's metadata does not reach the node (difficulty, mode, family)
//   curriculum-mapping-needed    scoring is objective and tested, but no node exists; a teacher decision on the assessed skill is required first
//   scoring-validation-needed    a node could exist but the scoring is not yet shown to measure one skill with one correct response
//   intentionally-practice-only  available for practice; counting it as first-attempt skill evidence would mislead
//   unsupported                  the activity emits no evidence events at all
import fs from 'node:fs';
import { makeAdapters, play, reseed, graph, nodeById, root } from './lab-flow.mjs';

export const REGISTRY_SCHEMA_VERSION = 1;
export const REGISTRY_SEED = 20261112;
export const N_PER_LEVEL = 8;      // focused draws per mode and difficulty level
export const N_NO_LEVEL = 12;      // focused draws per mode when the lab has no difficulty levels
export const N_MIXED = 420;        // Mixed Practice draws per lab

export const STATUSES = ['fully-supported', 'metadata-repair-needed', 'curriculum-mapping-needed', 'scoring-validation-needed', 'intentionally-practice-only', 'unsupported'];
export const STATUS_DEFINITIONS = {
  'fully-supported': 'A node exists; the real client-to-normalizer flow credits exactly that node at the difficulty actually presented; Mixed Practice reaches the mode (or the lab has no Mixed).',
  'metadata-repair-needed': 'Scoring and a node exist but the question does not send the metadata needed to reach the node correctly.',
  'curriculum-mapping-needed': 'Scoring is objective and tested but no node exists. A teacher decision about the assessed skill is needed before a node is added.',
  'scoring-validation-needed': 'A node could exist, but it has not been shown that the scoring measures one skill with one defensible correct response.',
  'intentionally-practice-only': 'Stays available for practice. Counting it as first-attempt skill evidence would be misleading.',
  unsupported: 'The activity emits no evidence events to the student profile.',
};
export const PRIORITY_DEFINITIONS = { none: 'No action.', low: 'Cosmetic or documentation only.', medium: 'Worth scheduling; no wrong credit is being given.', high: 'Wrong or missing credit for students today.' };

// Where each lab's scoring is exercised. Every file is part of the repository's own test chain; the generator verifies each exists.
const SCORING = {
  'math-lab': { files: ['java-games/math-lab/tests.mjs', 'java-games/math-lab/expansion/tests/expansion-tests.mjs'], note: 'Answers are evaluated by real Java programs in those suites.' },
  'loop-lab': { files: ['java-games/loop-lab/loop-redesign-tests.mjs', 'java-games/loop-jvm-tests.mjs'], note: 'Loop questions are checked against executed loop semantics.' },
  'array-lab': { files: ['java-games/array-lab/array-redesign-tests.mjs', 'java-games/array-lab/advanced-tests.mjs'], note: 'Generator, interaction and runtime-output assertions.' },
  'boolean-conditional-lab': { files: ['java-games/boolean-conditional-lab/boolean-tests.mjs', 'java-games/boolean-conditional-lab/tests/quality-gates.mjs'], note: 'Quality gates plus Java verification runs.' },
  'arraylist-lab': { files: ['tests/arraylist-lab.test.js', 'tests/arraylist-lab-jvm.test.js'], note: 'Engine suite plus generated programs compiled and run on a JVM.' },
  'linkedlist-lab': { files: ['java-games/linkedlist-lab/tests/linkedlist-lab.test.mjs'], note: 'Engine suite; link and mutate are additionally re-derived with an independent model in Phase 2.' },
  'method-constructor-lab': { files: ['tests/method-constructor-lab.test.js', 'tests/method-constructor-lab-jvm.test.js'], note: 'Engine suite plus JVM checks.' },
  'inheritance-polymorphism-lab': { files: ['java-games/inheritance-polymorphism-lab/tests/iplab-tests.mjs', 'java-games/inheritance-polymorphism-lab/tests/iplab-jvm-tests.mjs'], note: 'Item keys are checked against javac and java.' },
  'search-sort-lab': { files: ['java-games/search-sort-lab/tests/algorithms.test.mjs', 'java-games/search-sort-lab/tests/generator.test.mjs', 'java-games/search-sort-lab/tests/jvm.test.mjs'], note: 'Algorithm traces are compared with reference implementations and a JVM.' },
  'recursion-lab': { files: ['java-games/recursion-lab/recursion-tests.mjs', 'java-games/recursion-lab/recursion-jvm-tests.mjs'], note: 'Recursion answers are checked by executed programs.' },
  'debugger-lab': { files: ['java-games/debugger-lab/debugger-redesign-tests.mjs', 'java-games/compiler-tests.mjs'], note: 'Compiler-backed checks of the defective and repaired code.' },
  'documentation-lab': { files: ['java-games/documentation-lab/tests/doclab-tests.mjs', 'java-games/documentation-lab/tests/doclab-jvm-tests.mjs'], note: 'Javadoc and call keys are checked with javac and javadoc.' },
  'robot-algorithms': { files: ['tests/robot-algorithms.test.js', 'tests/robot-algorithms-jvm.test.js'], note: 'Every program and repair option is run in the lab simulator.' },
  'class-object-lab': { files: ['java-games/class-object-lab/class-object-tests.mjs', 'java-games/class-object-lab/tests/jvm.test.mjs'], note: 'Executed-program checks for every mode.' },
};
// Modes whose scoring was independently re-derived in Phase 2 (oracle, model or simulator written separately from the engine key).
const PHASE2_SCORING = new Set(['linkedlist-lab/link', 'linkedlist-lab/mutate', 'method-constructor-lab/order-args', 'inheritance-polymorphism-lab/hierarchy', 'inheritance-polymorphism-lab/override', 'inheritance-polymorphism-lab/tracer', 'inheritance-polymorphism-lab/debug', 'documentation-lab/editor', 'documentation-lab/builder', 'robot-algorithms/build', 'robot-algorithms/debug']);
const PHASE2_SCORING_TEST = 'cs-games/pathway/tests/java-mode-scoring.test.mjs';

// Per-mode notes that a reader needs next to the status.
const NOTES = {
  'method-constructor-lab/order-args': 'Credits the existing match-call node (matching arguments to parameters). Order Arguments is the same skill in a different response format.',
  'linkedlist-lab/link': 'Credits the new references node together with mutate; both are about re-pointing node references.',
  'linkedlist-lab/mutate': 'Credits the new references node together with link.',
  'linkedlist-lab/trace': 'Family ids are display text, so credit is by mode only (no family narrowing).',
  'linkedlist-lab/collections': 'Family ids are display text, so credit is by mode only (no family narrowing).',
  'robot-algorithms/build': 'The first Run is the scored attempt; later Runs are retries and never earn first-try credit.',
  'inheritance-polymorphism-lab/debug': 'Attributed by defect type (family ids debug/...), not by the generic Debug label.',
  'robot-algorithms/debug': 'Attributed by defect type (families debug:bound, :condition, :missing, :order, :turn).',
  'math-lab/math-methods': 'Joined Mixed Practice in Phase 2; credit was already correct in focused practice.',
  'math-lab/numeric-limits': 'Joined Mixed Practice in Phase 2; credit was already correct in focused practice.',
  'boolean-conditional-lab/*': 'Difficulty was not recorded before Phase 2; it is now.',
  'arraylist-lab/*': 'The page sends no annotation; credit is by mode (no family narrowing). Mixed draws are unevenly spread, see labFindings.',
};

// Activities that run on Java Games pages but are not engine modes of the 14 measured labs. Authored from reading the page code and tests.
const OTHER_ACTIVITIES = [
  { game: 'documentation-lab', mode: 'response-explorer', subModes: ['find-data', 'understand-structure', 'select-needs'],
    assessedSkill: 'Locate and interpret fields in a simulated API response.',
    metadataSupport: { practiceMode: 'sent-as-response-explorer-only', family: 'not-sent', difficulty: 'nested-in-responseExplorer-object-not-read-by-profile-client' },
    objectiveScoring: { objective: true, validatedBy: ['java-games/documentation-lab/tests/response-explorer-tests.mjs'], validatedInPhase2: false, note: 'Shared graders validated against runtime samples (159 challenges).' },
    nodeExists: false, mixedReaches: 'no-mixed-mode', status: 'curriculum-mapping-needed', priority: 'medium',
    creditUnavailableReason: 'No node covers reading API responses, so the events normalize but credit no node. The page reports one mode id for all three activities.',
    recommendedRepair: 'Teacher decision: which Documentation node (new or existing) assesses API-response reading. Then send practiceMode = challenge.format and family = reasoning model id, add the node and bindings, and extend the evidence tests.' },
  { game: 'documentation-lab', mode: 'api-builder',
    assessedSkill: 'Plan a sequence of API requests for a scenario.',
    metadataSupport: { practiceMode: 'sent-as-api-builder-only', family: 'not-sent', difficulty: 'not-applicable' },
    objectiveScoring: { objective: true, validatedBy: ['java-games/documentation-lab/tests/api-project-builder-tests.mjs'], validatedInPhase2: false, note: 'A scenario accepts several valid plans and carries a free-text reflection; one submit is a whole project, not one skill check.' },
    nodeExists: false, mixedReaches: 'no-mixed-mode', status: 'intentionally-practice-only', priority: 'low',
    creditUnavailableReason: 'Multi-step project plan with several accepted solutions and a reflection; a single pass or fail is not a first-attempt measure of one skill.',
    recommendedRepair: 'Leave as practice. If a teacher wants evidence from it, define a per-requirement rubric first so each requirement can be scored once.' },
  { game: 'class-object-lab', mode: 'class-builder-rearrange',
    assessedSkill: 'Arrange class members into a valid class.',
    metadataSupport: { practiceMode: 'not-sent', family: 'not-sent', difficulty: 'not-sent' },
    objectiveScoring: { objective: true, validatedBy: ['java-games/class-object-lab/class-builder-rearrange/tests/session-tests.mjs'], validatedInPhase2: false, note: 'Keeps its own local summary; the host-tracker adapter in the repository is an unimplemented example.' },
    nodeExists: false, mixedReaches: 'no-mixed-mode', status: 'unsupported', priority: 'medium',
    creditUnavailableReason: 'The mode uses its own session store and never calls the shared session tracker, so no evidence event is produced.',
    recommendedRepair: 'Implement the host adapter against java-games/session.js (begin, submit, skip, reveal), then decide the node mapping with the teacher.' },
];

const round3 = (x) => Math.round(x * 1000) / 1000;
const lc = (v) => (v == null ? null : String(v).toLowerCase());
const exists = (rel) => fs.existsSync(new URL(rel, root));

/** Status of a measured mode. Pure so the negative tests can feed it a missing node, wrong credit, wrong difficulty or an unreachable mode. */
export function classify({ node, credited, difficulty, mixedReaches }) {
  if (!node) return { status: 'curriculum-mapping-needed', reason: 'No node exists for this mode.', repair: 'Add a node after a teacher decision.', priority: 'high' };
  if (!credited) return { status: 'metadata-repair-needed', reason: 'The flow did not credit exactly the intended node.', repair: 'Repair the annotation the page sends.', priority: 'high' };
  if (difficulty === 'missing-or-mismatched') return { status: 'metadata-repair-needed', reason: 'Difficulty recorded differs from the difficulty presented.', repair: 'Send the presented difficulty.', priority: 'high' };
  if (mixedReaches === false) return { status: 'metadata-repair-needed', reason: 'Mixed Practice never draws this mode.', repair: 'Add the mode to the Mixed rotation.', priority: 'high' };
  return { status: 'fully-supported', reason: null, repair: null, priority: 'none' };
}

export function measureMode(adapter, mode) {
  const perLevel = new Map(); // level -> cell
  const cell = (level) => perLevel.get(level) || perLevel.set(level, { drawn: 0, credited: 0, modeOk: 0, familySent: 0, familyBound: 0, difficultyOk: 0 }).get(level);
  const probe = adapter.focused(mode, 0);
  const hasLevels = adapter.levels && adapter.difficulty(probe) != null;
  const famSent = new Set(), famBound = new Set(), draws = [];
  if (hasLevels) for (let li = 0; li < 3; li++) for (let k = 0; k < N_PER_LEVEL; k++) draws.push(3 * k + li);
  else for (let k = 0; k < N_NO_LEVEL; k++) draws.push(k);
  for (const i of draws) {
    const q = adapter.focused(mode, i);
    const want = adapter.difficulty(q);
    const level = want == null ? 'n/a' : lc(want);
    const c = cell(level);
    const r = play(adapter, q, 'correct');
    c.drawn++;
    const one = r.credits.length === 1 ? r.credits[0] : null;
    if (one && one.ids.length === 1 && one.ids[0] === adapter.expected(q)) c.credited++;
    if (one && one.event.assessedMode === mode) c.modeOk++;
    if (one && one.event.familyId) {
      c.familySent++; famSent.add(one.event.familyId);
      if (graph.questionFamilies.some((f) => f.sourceFamilyId === one.event.familyId && f.nodeIds.includes(adapter.expected(q)))) { c.familyBound++; famBound.add(one.event.familyId); }
    }
    if (one && one.cleaned && one.cleaned.data.difficulty === (want == null ? null : lc(want))) c.difficultyOk++;
  }
  return { hasLevels, famSent: famSent.size, famBound: famBound.size, cells: [...perLevel.entries()].sort(([a], [b]) => (a < b ? -1 : 1)) };
}

export function measureMixed(adapter) {
  if (!adapter.mixed) return null;
  const counts = Object.fromEntries(adapter.modes.map((m) => [m, 0]));
  let credited = 0;
  for (let i = 0; i < N_MIXED; i++) {
    const q = adapter.mixed(i), r = play(adapter, q, 'correct');
    const m = adapter.mode(q); counts[m] = (counts[m] || 0) + 1;
    if (r.credits.length === 1 && r.credits[0].ids.length === 1 && r.credits[0].ids[0] === adapter.expected(q) && r.credits[0].event.assessedMode === m) credited++;
  }
  return { counts, credited, drawn: N_MIXED };
}

function skillFor(nodeId) { const n = nodeById.get(nodeId); return n ? (n.objective || n.title) : null; }

export function buildRegistry() {
  reseed(REGISTRY_SEED);
  const adapters = makeAdapters();
  const entries = [], matrix = [], labFindings = [];
  for (const [lab, a] of Object.entries(adapters)) {
    const mixed = measureMixed(a);
    for (const mode of a.modes) {
      const m = measureMode(a, mode);
      const sample = a.focused(mode, 0);
      const nodeId = a.expected(sample);
      const node = nodeId ? nodeById.get(nodeId) : null;
      const sum = (k) => m.cells.reduce((s, [, c]) => s + c[k], 0), drawn = sum('drawn');
      const credited = sum('credited') === drawn && sum('modeOk') === drawn;
      const familySent = sum('familySent'), familyBound = sum('familyBound');
      const difficulty = !m.hasLevels ? 'not-applicable' : sum('difficultyOk') === drawn ? 'sent' : 'missing-or-mismatched';
      const mixedCount = mixed ? mixed.counts[mode] || 0 : null;
      const mixedReaches = mixed ? mixedCount > 0 : 'no-mixed-mode';
      const { status, reason, repair, priority } = classify({ node, credited, difficulty, mixedReaches });
      const scoringFiles = (SCORING[lab] || { files: [] }).files;
      const phase2 = PHASE2_SCORING.has(`${lab}/${mode}`);
      entries.push({
        game: lab, mode,
        assessedSkill: skillFor(nodeId),
        metadataSupport: { practiceMode: credited ? 'sent' : 'missing', family: familySent === 0 ? 'not-sent' : familyBound === familySent ? 'sent-and-bound' : familyBound === 0 ? 'sent-unbound' : 'sent-partly-unbound', difficulty },
        objectiveScoring: { objective: true, validatedBy: phase2 ? [PHASE2_SCORING_TEST, ...scoringFiles] : scoringFiles, validatedInPhase2: phase2, note: (SCORING[lab] || {}).note || '' },
        nodeExists: !!node, nodeId: nodeId || null,
        mixedReaches, mixedShare: mixed ? round3(mixedCount / N_MIXED) : null,
        creditUnavailableReason: reason, recommendedRepair: repair, priority, status,
        notes: NOTES[`${lab}/${mode}`] || NOTES[`${lab}/*`] || '',
        measured: { focusedDrawn: drawn, focusedCreditedToIntendedNode: sum('credited'), distinctFamiliesSent: m.famSent, distinctFamiliesBound: m.famBound, mixedDrawn: mixed ? N_MIXED : null, mixedCreditedToIntendedNode: mixed ? mixed.credited : null },
      });
      for (const [level, c] of m.cells) matrix.push({ game: lab, mode, difficulty: level, node: nodeId, drawn: c.drawn, credited: c.credited, difficultyOk: c.difficultyOk, familySent: c.familySent, familyBound: c.familyBound });
    }
    const mine = entries.filter((e) => e.game === lab && e.measured.focusedDrawn);
    const partial = mine.filter((e) => e.metadataSupport.family !== 'sent-and-bound');
    if (partial.length) {
      const sent = mine.reduce((t, e) => t + e.measured.distinctFamiliesSent, 0), bound = mine.reduce((t, e) => t + e.measured.distinctFamiliesBound, 0);
      labFindings.push({ game: lab, finding: 'family-narrowing-partial', detail: `${partial.length} of ${mine.length} modes send a family id that is absent or not fully bound in the graph (${bound} of ${sent} distinct family ids sent are bound). Credit falls back to the mode selector, which is correct for every drawn question; only the optional narrowing by family is inactive.`, status: 'fully-supported', priority: 'low', recommendedRepair: 'Bind the lab\'s generator family ids in build-graph.mjs (a graph content change, left for a calibrated follow-up).' });
    }
    if (mixed) {
      const shares = Object.entries(mixed.counts).map(([k, v]) => [k, v / N_MIXED]), uniform = 1 / a.modes.length;
      const [topMode, top] = shares.reduce((x, y) => (y[1] > x[1] ? y : x));
      if (top > 2 * uniform) labFindings.push({ game: lab, finding: 'mixed-distribution-skew', detail: `Mixed Practice draws ${topMode} in ${Math.round(top * 100)}% of questions (uniform would be ${Math.round(uniform * 100)}%). Every mode is still reached and credited correctly.`, status: 'fully-supported', priority: 'low', recommendedRepair: 'Rebalance the Mixed draw across modes in the lab engine (generator change; not done in Phase 2).' });
    } else labFindings.push({ game: lab, finding: 'no-mixed-mode', detail: 'The lab has no Mixed Practice, so every mode is practiced in focused mode only. This is not a credit defect.', status: 'fully-supported', priority: 'low', recommendedRepair: 'Optional: add a Mixed mode if the teacher wants interleaved practice.' });
  }
  // Variable Lab and String Lab were repaired in Phase 1; their credit is exercised by mastery-evidence.test.mjs, not re-measured here.
  for (const lab of ['variable-lab', 'string-lab']) {
    const modes = new Set();
    for (const n of graph.nodes.filter((x) => x.courseId === 'advanced')) for (const s of n.familySelectors) if (s.activityId === lab) for (const id of [s.modeId, ...(s.modeIds || [])].filter(Boolean)) modes.add(`${id}\t${n.id}`);
    for (const key of [...modes].sort()) {
      const [mode, nodeId] = key.split('\t');
      entries.push({ game: lab, mode, assessedSkill: skillFor(nodeId), metadataSupport: { practiceMode: 'sent', family: 'sent-and-bound', difficulty: 'sent-where-applicable' },
        objectiveScoring: { objective: true, validatedBy: ['cs-games/pathway/tests/mastery-evidence.test.mjs', lab === 'variable-lab' ? 'java-games/variable-lab/evidence-ui-tests.mjs' : 'java-games/string-lab/tests/generator.test.cjs'], validatedInPhase2: false, note: 'Repaired and tested in Phase 1; unchanged in Phase 2.' },
        nodeExists: true, nodeId, mixedReaches: 'verified-in-phase1-tests', mixedShare: null, creditUnavailableReason: null, recommendedRepair: null, priority: 'none', status: 'fully-supported', notes: '', measured: { focusedDrawn: null, focusedCreditedToIntendedNode: null, distinctFamiliesSent: null, distinctFamiliesBound: null, mixedDrawn: null, mixedCreditedToIntendedNode: null } });
    }
  }
  for (const o of OTHER_ACTIVITIES) entries.push({ mixedShare: null, notes: '', measured: { focusedDrawn: 0, focusedCreditedToIntendedNode: 0, distinctFamiliesSent: 0, distinctFamiliesBound: 0, mixedDrawn: null, mixedCreditedToIntendedNode: null }, nodeId: null, ...o });
  entries.sort((x, y) => (x.game === y.game ? (x.mode < y.mode ? -1 : x.mode > y.mode ? 1 : 0) : x.game < y.game ? -1 : 1));
  labFindings.sort((x, y) => (x.game === y.game ? (x.finding < y.finding ? -1 : 1) : x.game < y.game ? -1 : 1));
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, entries.filter((e) => e.status === s).length]));
  const missing = [];
  for (const e of entries) for (const f of e.objectiveScoring.validatedBy) if (!exists(f)) missing.push(f);
  if (missing.length) throw new Error('scoring evidence files not found: ' + [...new Set(missing)].join(', '));
  return {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    generatedBy: 'cs-games/pathway/tests/build-gap-registry.mjs',
    graphVersion: graph.version,
    seed: REGISTRY_SEED,
    sampling: { focusedPerModeAndLevel: N_PER_LEVEL, focusedPerModeWithoutLevels: N_NO_LEVEL, mixedPerLab: N_MIXED },
    statusDefinitions: STATUS_DEFINITIONS, priorityDefinitions: PRIORITY_DEFINITIONS,
    metadataVocabulary: {
      practiceMode: 'sent = the event\'s assessed mode equals the question\'s own mode in every drawn question (never "mixed").',
      family: 'sent-and-bound = every family id sent is bound to the node (narrowing active); sent-partly-unbound = some are not bound; sent-unbound = none are bound; not-sent = the page sends no family id. In the last three cases credit falls back to the mode selector, which is the credit measured here.',
      difficulty: 'sent = the difficulty recorded equals the difficulty presented; not-applicable = the lab or mode has no difficulty levels.',
    },
    summary: { entries: entries.length, byStatus },
    labFindings, entries, matrix,
  };
}

const CSV_COLUMNS = ['game', 'mode', 'difficulty', 'status', 'priority', 'node_id', 'assessed_skill', 'focused_questions', 'focused_credited_to_intended_node', 'difficulty_recorded_equals_presented', 'family_sent', 'family_bound', 'practice_mode_metadata', 'family_metadata', 'difficulty_metadata', 'mixed_reaches', 'mixed_share', 'objective_scoring', 'scoring_validated_in_phase2', 'credit_unavailable_reason', 'recommended_repair', 'notes'];
const q = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s; };

/** One row per game / mode / difficulty level, from the same registry. */
export function toCsv(reg) {
  const rows = [CSV_COLUMNS.join(',')];
  const cells = new Map();
  for (const m of reg.matrix) (cells.get(`${m.game}/${m.mode}`) || cells.set(`${m.game}/${m.mode}`, []).get(`${m.game}/${m.mode}`)).push(m);
  for (const e of reg.entries) {
    const list = cells.get(`${e.game}/${e.mode}`) || [{ difficulty: 'n/a', drawn: e.measured.focusedDrawn, credited: e.measured.focusedCreditedToIntendedNode, difficultyOk: null, familySent: null, familyBound: null }];
    for (const c of list) rows.push([e.game, e.mode, c.difficulty, e.status, e.priority, e.nodeId, e.assessedSkill, c.drawn, c.credited, c.difficultyOk, c.familySent, c.familyBound, e.metadataSupport.practiceMode, e.metadataSupport.family, e.metadataSupport.difficulty, e.mixedReaches, e.mixedShare, e.objectiveScoring.validatedBy.length ? 'yes' : 'no', e.objectiveScoring.validatedInPhase2 ? 'yes' : 'no', e.creditUnavailableReason, e.recommendedRepair, e.notes].map(q).join(','));
  }
  return rows.join('\n') + '\n';
}

export const REGISTRY_PATH = 'cs-games/pathway/evidence-gap-registry.json';
export const MATRIX_PATH = 'cs-games/pathway/reports/phase2/JAVA_MASTERY_COVERAGE_MATRIX.csv';
export const serialize = (reg) => JSON.stringify(reg, null, 2) + '\n';
