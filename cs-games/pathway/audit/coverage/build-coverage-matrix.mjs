// Mastery assessment coverage matrix (all 290 nodes). Deterministic: node cs-games/pathway/audit/coverage/build-coverage-matrix.mjs [--check]
// Facts come from executable sources (graph, evidence registry, resolveRecord probes, the real question banks). Judgments are labelled
// with a confidence and a rationale. Nothing here changes mastery policy, evaluators, profiles or stored evidence.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import graph from '../../curriculum-graph.json' with {type: 'json'};
import registry from '../../evidence-gap-registry.json' with {type: 'json'};
import {auditRecommended, boundedPracticePools} from '../../requirements/recommended.mjs';
import {resolveRecord} from '../../../../csp-games/exam-readiness/mapping.js';
import {WPR_PERFORMANCE_ONLY,WPR_CANDIDATE_TIERS} from '../../mastery/wpr-automatic.mjs';
import {loadCatalog as loadWpr, measure as measureWpr} from '../wpr-mastery/coverage.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const req = createRequire(import.meta.url);
const outDir = path.resolve(here, '../../reports/coverage');
const check = process.argv.includes('--check');

// ---------------------------------------------------------------------------------------------------------- measured banks
const wprCapacity = Object.fromEntries(req('./wpr-concept-capacity.cjs').map(r => [r.concept, r]));
const inet = await import(pathToFileURL(path.join(root, 'csp-games/internet-layers-lab/engine.js')).href);
const parts = await import(pathToFileURL(path.join(root, 'cs-games/robotics/parts-sprint/catalog.js')).href);
const {SCENARIOS} = await import(pathToFileURL(path.join(root, 'cs-games/robotics/component-challenge/scenarios.mjs')).href);
const roundoff = await import(pathToFileURL(path.join(root, 'csp-games/roundoff-overflow-lab/engine.js')).href);
const inetBySkill = {};
for (const q of inet.QUESTIONS) {
  const m = resolveRecord({game: 'internet-layers-lab', mode: q.mode, topic: 'net:' + q.topic + ':' + q.concept, details: {concept: q.concept, familyId: q.family}});
  if (!m || m.quality !== 'direct') continue;
  (inetBySkill[m.skillId] ??= new Set()).add(q.family);
}
const binaryWidths = /\[4,\s*6,\s*8,\s*16\]/.test(fs.readFileSync(path.join(root, 'csp-games/app.js'), 'utf8')) ? 4 : null;
if (binaryWidths !== 4) throw new Error('binary-builder bit lengths changed; re-audit capacity/representation/pixels');
const componentModes = {};
for (const s of SCENARIOS) (componentModes[s.mode] ??= new Set()).add(s.family);

// ---------------------------------------------------------------------------------------------------------- judgments
// Workplace Readiness: a scored game-attempt event now credits the one primary assessed concept of a question, for concepts whose bank passed
// the activation rules (audit/wpr-mastery/coverage.mjs). The per-node facts below come from that measurement.
const wprPrimary = new Map(measureWpr(loadWpr()).rows.map(r => [r.conceptId, r]));
const WPR_GATED = 'Local practice is formative. Verified families must satisfy the release audit before yielding node credit.';
// Workplace concepts whose title names a performed or demonstrated behaviour. Multiple-choice practice can show knowledge of the
// expectation, not the behaviour. Educator confirmation required (judgment, not measurement).
const WPR_PERFORMANCE = new Set(WPR_PERFORMANCE_ONLY);

const cspProbe = (game, mode, topic, details = {}) => ({game, mode, topic, details});
// category: A-E; objective: yes|partly|no; probe is executed against resolveRecord and must return skill/quality.
const CSP = {
  PURPOSE: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('mixed-ap-practice', 'x', 'creative/purpose'), q: 'estimated', why: 'Only estimated (capped) mappings exist (vocabulary term, Mixed AP Practice).', rec: 'Add direct skill metadata only after an educator decides whether term recognition is evidence of explaining purpose; explanation stays teacher-assessed.'},
  FUNCTION: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('test-case-builder', 'quick', 'quick.predict'), q: 'direct', why: 'Direct route only through Test Case Builder predict items; depth unmeasured. Response Builder routes are estimated.', rec: 'Replay Test Case Builder predict items through cleanGameAttempt and measure distinct families.'},
  INPUT: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('create-task-lab', 'io', 'io', {familyId: 'input-x'}), q: 'estimated', why: 'Create Task Lab input/output routes are estimated and need a family id.', rec: 'Review Create Task Lab input items for direct attribution; keep open task design teacher-assessed.'},
  OUTPUT: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('create-task-lab', 'io', 'io', {familyId: 'output-x'}), q: 'estimated', why: 'Same as INPUT.', rec: 'Same as INPUT.'},
  DEVELOPMENT: {cat: 'E', obj: 'no', conf: 'medium', probe: cspProbe('vocabulary-fill-in-lab', 'x', 'x', {term: 'iterative-development'}), q: 'estimated', why: 'Iterative development is demonstrated across a project; vocabulary recognition names it but does not show it.', rec: 'Keep teacher-assessed; vocabulary practice remains formative.'},
  COLLABORATION: {cat: 'E', obj: 'no', conf: 'medium', probe: cspProbe('mixed-ap-practice', 'x', 'creative/collaboration'), q: 'estimated', why: 'Authentic teamwork needs teacher-reviewed project evidence (csp-games/coverage.json states this gap).', rec: 'Keep teacher-assessed.'},
  DESIGN: {cat: 'E', obj: 'no', conf: 'medium', probe: cspProbe('vocabulary-fill-in-lab', 'x', 'x', {term: 'user-experience'}), q: 'estimated', why: 'Designing for a user is shown in a designed artifact, not a term match.', rec: 'Keep teacher-assessed.'},
  DOCUMENTATION: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('vocabulary-fill-in-lab', 'x', 'x', {term: 'documentation'}), q: 'estimated', why: 'Only estimated vocabulary and written-response routes.', rec: 'Educator decision: is documentation recognition acceptable evidence? If yes add direct metadata.'},
  TESTING: {cat: 'B', obj: 'yes', conf: 'medium', probe: cspProbe('test-case-builder', 'x', 'build'), q: 'direct', why: 'Direct route through Test Case Builder; depth, family metadata and first-attempt replay not yet verified.', rec: 'Replay real Test Case Builder items; confirm answer correctness with the rule-based evaluator.'},
  DEBUGGING: {cat: 'B', obj: 'yes', conf: 'medium', probe: cspProbe('test-case-builder', 'quick', 'quick.bugs'), q: 'direct', why: 'Direct route through quick.bugs items only; depth unmeasured.', rec: 'Replay and measure quick.bugs depth.'},
  BINARY: {cat: 'C', obj: 'yes', conf: 'medium', probe: cspProbe('binary-builder', 'x', 'representation / 8-bit'), q: 'direct', measured: 'representation mode: 1 reasoning family, 4 bit lengths', depth: 1, why: 'Decimal-to-binary is a single reasoning task with different numbers; feedback appears only after Check, so first attempt is valid.', rec: 'Add distinct reasoning families (binary to decimal, place value errors, hex bridge, fixed width) before any tier.'},
  CAPACITY: {cat: 'C', obj: 'yes', conf: 'high', probe: cspProbe('binary-builder', 'x', 'capacity / 8-bit'), q: 'direct', measured: 'capacity mode: 4 possible questions (bit lengths 4, 6, 8, 16)', depth: 4, why: 'Only four possible questions; 30 or 50 answers would repeat them.', rec: 'Expand with applied capacity reasoning families (addresses, colors, IDs, storage).'},
  RGB: {cat: 'D', obj: 'yes', conf: 'medium', probe: cspProbe('rgb-color-builder', 'x', 'x'), q: 'direct', why: 'The student sees a live swatch and their own hex while editing and must match a hidden target by sight (tolerance deltaE 6), so a first Check can pass by trial and error. Read from source; not browser-played.', rec: 'New format: give a code or described color and ask for the other representation with no live swatch.'},
  REPRESENTATION: {cat: 'C', obj: 'yes', conf: 'medium', probe: cspProbe('binary-builder', 'x', 'pixels / 8-bit'), q: 'direct', measured: 'pixels mode: 1 reasoning family, 4 bit lengths', depth: 1, why: 'One reasoning task (encode one pixel, compute storage) with different numbers.', rec: 'Add families covering images, text, sound and metadata representation.'},
  CHARACTERS: {cat: 'D', obj: 'yes', conf: 'medium', probe: cspProbe('ascii-binary-builder', 'x', 'x'), q: 'direct', why: 'The decoded character is shown live while bits are toggled, so a first Check can pass by trial and error. Read from source; not browser-played.', rec: 'New format: encode or decode without live decoding.'},
  NUMERIC: {cat: 'A', obj: 'yes', conf: 'high', probe: cspProbe('roundoff-overflow-lab', 'overflow', 'Overflow', {familyId: 'f'}), q: 'direct', why: 'Newly validated in this wave.', rec: 'None.'},
  ANALYSIS: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('data-detective', 'x', 'table'), q: 'direct', why: 'Direct route through Data Detective; depth and family metadata unmeasured.', rec: 'Replay and measure.'},
  VISUALIZATION: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('data-detective', 'x', 'graph/bar'), q: 'direct', why: 'Same as ANALYSIS.', rec: 'Replay and measure.'},
  TRANSFORM: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('data-detective', 'x', 'cleaning'), q: 'direct', why: 'Same as ANALYSIS.', rec: 'Replay and measure.'},
  VARIABLES: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('code-concepts', 'x', 'variables/assignment'), q: 'direct', why: 'Direct route through Code Concepts; AP CSP pseudocode semantics must be checked, not Java.', rec: 'Replay; verify against College Board pseudocode semantics.'},
  EXPRESSIONS: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('code-concepts', 'x', 'variables/expression'), q: 'direct', why: 'Same as VARIABLES.', rec: 'Replay; verify pseudocode semantics (MOD, strings).'},
  ALGORITHMS: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('trivial-nontrivial', 'x', 'x'), q: 'direct', why: 'Direct route; depth unmeasured.', rec: 'Replay and measure.'},
  'DATA-ABSTRACTION': {cat: 'E', obj: 'partly', conf: 'medium', probe: cspProbe('response-builder', 'x', 'abstraction/x'), q: 'none', why: 'Explaining how lists manage complexity is a written explanation; Response Builder abstraction items resolve to no skill.', rec: 'Keep teacher-assessed; recognition items may be formative.'},
  SEARCH: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('binary-search-hunt', 'x', 'x'), q: 'direct', why: 'Direct route; depth unmeasured.', rec: 'Replay and measure.'},
  PROCEDURES: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('code-concepts', 'x', 'procedures/call'), q: 'direct', why: 'Direct route; pseudocode semantics to verify.', rec: 'Replay; verify pseudocode semantics.'},
  PARAMETERS: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('code-concepts', 'x', 'procedures/parameter'), q: 'direct', why: 'Direct route; depth unmeasured.', rec: 'Replay and measure.'},
  'PROCEDURAL-ABSTRACTION': {cat: 'E', obj: 'partly', conf: 'medium', probe: cspProbe('vocabulary-fill-in-lab', 'x', 'x', {term: 'procedural-abstraction'}), q: 'estimated', why: 'Explaining procedural abstraction is written explanation; only an estimated vocabulary route exists (the Response Builder abstraction branch returns no skill).', rec: 'Keep teacher-assessed.'},
  LIBRARIES: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('vocabulary-fill-in-lab', 'x', 'x', {term: 'api'}), q: 'estimated', why: 'Estimated vocabulary route only.', rec: 'Educator decision on recognition as evidence; add direct metadata if accepted.'},
  RANDOM: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('simulation-lab', 'x', 'randomness'), q: 'direct', why: 'Direct route; depth unmeasured.', rec: 'Replay and measure.'},
  SIMULATION: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('simulation-lab', 'x', 'x'), q: 'direct', why: 'Direct route; depth unmeasured.', rec: 'Replay and measure.'},
  EFFICIENCY: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('algorithm-race', 'x', 'x'), q: 'direct', why: 'Direct route; depth unmeasured.', rec: 'Replay and measure.'},
  UNDECIDABLE: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('mixed-ap-practice', 'x', 'algorithms/undecidable'), q: 'estimated', why: 'Estimated routes only.', rec: 'Educator decision; then direct metadata.'},
  SYSTEMS: {cat: 'C', obj: 'yes', conf: 'high', inet: 'CSP-SYSTEMS', q: 'direct', why: 'Direct attribution is correct, but the bank is shallow and each family has 5 surface profiles (names only).', rec: 'Add reasoning families (target at least 30 distinct for a standard tier).'},
  PROTOCOLS: {cat: 'C', obj: 'yes', conf: 'high', inet: 'CSP-PROTOCOLS', q: 'direct', why: 'Same as SYSTEMS.', rec: 'Same as SYSTEMS.'},
  IP: {cat: 'C', obj: 'yes', conf: 'high', inet: 'CSP-IP', q: 'direct', why: 'Same as SYSTEMS; Packet Router adds an unmeasured second source.', rec: 'Same as SYSTEMS; measure Packet Router.'},
  DNS: {cat: 'C', obj: 'yes', conf: 'high', inet: 'CSP-DNS', q: 'direct', why: 'Same as SYSTEMS.', rec: 'Same as SYSTEMS.'},
  PACKETS: {cat: 'C', obj: 'yes', conf: 'high', inet: 'CSP-PACKETS', q: 'direct', why: 'Same as SYSTEMS; Packet Router adds an unmeasured second source.', rec: 'Same as SYSTEMS; measure Packet Router.'},
  RESILIENCE: {cat: 'C', obj: 'yes', conf: 'medium', inet: 'CSP-RESILIENCE', q: 'direct', why: 'Internet Layers has 6 families; Network Breaker and Packet Router are direct but unmeasured.', rec: 'Measure the other two sources; expand if the sum stays below 30.'},
  PARALLEL: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('parallel-processing-race', 'x', 'x'), q: 'direct', why: 'Direct route; depth unmeasured.', rec: 'Replay and measure.'},
  'SECURE-NETWORKS': {cat: 'C', obj: 'yes', conf: 'high', inet: 'CSP-SECURE-NETWORKS', q: 'direct', why: 'Same as SYSTEMS (5 families).', rec: 'Same as SYSTEMS.'},
  IMPACTS: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('ai-ethics-lab', 'x', 'a:b:c:accessibility'), q: 'direct', why: 'Direct when an AI Ethics objective is present; Computing Impact routes are estimated. Scenario analysis is assessable; unrestricted explanation is not.', rec: 'Replay AI Ethics items; measure depth.'},
  BIAS: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('ai-ethics-lab', 'x', 'a:b:c:history'), q: 'direct', why: 'Same as IMPACTS.', rec: 'Same as IMPACTS.'},
  CROWD: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('computing-impact-lab', 'x', 'crowd/x'), q: 'estimated', why: 'Estimated routes only.', rec: 'Educator decision; then direct metadata.'},
  RIGHTS: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('copyright-creative-commons-lab', 'x', 'x'), q: 'direct', why: 'Direct route; the lab was reviewed on 60 cases by its own commit, but depth and family metadata are unmeasured here.', rec: 'Replay and measure.'},
  ETHICS: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('ai-ethics-lab', 'x', 'a:b:c:transparency'), q: 'direct', why: 'Direct when an objective is present; evaluating ethics is judgment beyond choosing among provided options.', rec: 'Replay; educator decision on how much of the skill options-based items can evidence.'},
  PRIVACY: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('ai-ethics-lab', 'x', 'a:b:c:privacy'), q: 'direct', why: 'Same as IMPACTS.', rec: 'Same as IMPACTS.'},
  SECURITY: {cat: 'B', obj: 'yes', conf: 'low', probe: cspProbe('cybersecurity-defender', 'x', 'x'), q: 'direct', why: 'Direct route; depth unmeasured.', rec: 'Replay and measure.'},
  PPR: {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('create-task-lab', 'behavior', 'behavior', {familyId: 'ppr-x'}), q: 'estimated', why: 'Estimated route; selecting PPR evidence is objective, producing it is performance.', rec: 'Direct metadata for selection items only; the Create performance task stays teacher-assessed.'},
  'STUDENT-PROCEDURE': {cat: 'B', obj: 'partly', conf: 'low', probe: cspProbe('create-task-lab', 'x', 'x', {familyId: 'algorithm-selection-absent'}), q: 'estimated', why: 'Estimated route; recognizing requirements is objective, building a procedure is performance.', rec: 'Same as PPR.'},
};
for (const [key, row] of Object.entries(CSP)) {
  if (!row.probe) continue;
  const got = resolveRecord(row.probe), want = row.q;
  const have = !got ? 'none' : got.quality;
  if (have !== want || (got && got.skillId !== 'CSP-' + key)) throw new Error(`mapping probe for ${key} resolved to ${got ? got.skillId + '/' + got.quality : 'null'}, expected CSP-${key}/${want}`);
}

const catLabel = {A: 'A existing assessment sufficient', B: 'B evidence metadata or adapter repair', C: 'C targeted question expansion', D: 'D new assessment format needed', E: 'E teacher-assessed performance'};
const statusOf = {A: 'newly-validated', B: 'not-yet-verified', C: 'additional-content-needed', D: 'new-format-needed', E: 'teacher-assessed'};

// ---------------------------------------------------------------------------------------------------------- rows
const rec = new Map(auditRecommended(graph, registry).map(r => [r.nodeId, r]));
const regRows = new Map(); for (const e of registry.entries) regRows.set(e.nodeId, e);
const areaTitle = new Map(graph.areas.map(a => [a.id, a.title]));
const rows = [];
for (const node of graph.nodes) {
  const r = rec.get(node.id), key = node.id.split(':').slice(2).join(':'), act = node.id.split(':')[2], reg = regRows.get(node.id);
  const base = {course: node.courseId, area: areaTitle.get(node.areaId) ?? node.areaId, nodeId: node.id, title: node.title,
    practiceActivities: node.practice.map(p => p.activityId).join('+'),
    scoredModes: node.familySelectors.map(s => (s.modeIds ?? (s.modeId ? [s.modeId] : s.category ? [s.category] : s.conceptId ? [s.conceptId] : [])).join('/')).filter(Boolean).join(';'),
    verifiedFamilyCount: node.familyIds.length, repairImplemented: 'no', proposedTier: '', minDistinct: ''};
  const workplaceCandidate=node.courseId === 'workplace' ? WPR_CANDIDATE_TIERS[node.familySelectors[0].conceptId] : null;
  if (workplaceCandidate && !r.tier) {
    const w = wprPrimary.get(node.familySelectors[0].conceptId);
    rows.push({...base, currentRoute: 'teacher-assessment', reasonCode: 'insufficient-diversity', category: 'B', status: 'insufficient-diversity', mixedMapsCorrectly: 'node credit disabled',
      firstAttemptEvidence: 'authoritative practice-only scoring available for repaired families', whyNotEnabled: 'The available independent reasoning families do not support this tier.', objectivelyAssessable: 'candidate (situational judgment)', bankMeetsRequirement: 'no',
      measuredDistinct: `${w.keyCount} primary reasoning units (${w.highKeys} high confidence), ${w.modeCount} modes`,
      recommendation: 'Expand the independent reasoning bank and satisfy the repeatable release audit.', confidence: 'medium',
      proposedTier: workplaceCandidate, minDistinct: r.minDistinct, repairImplemented: 'yes',
      evidenceSource: 'cs-games/pathway/tests/wpr-primary-concept.test.mjs; wpr-primary-concept-service.test.mjs; audit/wpr-mastery/coverage.mjs'});
    continue;
  }
  if (r.tier) {
    const isNew = node.id.endsWith(':CSP-NUMERIC');
    rows.push({...base, currentRoute: 'automatic:' + r.tier, reasonCode: '', category: isNew ? 'A' : '', status: isNew ? 'newly-validated' : 'already-automatic',
      mixedMapsCorrectly: reg?.measured?.mixedDrawn ? `${reg.measured.mixedCreditedToIntendedNode}/${reg.measured.mixedDrawn}` : isNew ? 'tested: all 4 filters credit CSP-NUMERIC' : 'covered by existing tests',
      firstAttemptEvidence: 'yes', whyNotEnabled: '', objectivelyAssessable: 'yes', bankMeetsRequirement: 'accepted by PR #46 review', measuredDistinct: reg?.measured?.distinctFamiliesBound ?? '',
      recommendation: isNew ? 'Standard practice 30 at 90%; pinned for new classes only.' : 'None.', confidence: isNew ? 'high' : 'as reviewed in PR #46',
      proposedTier: r.tier, minDistinct: r.minDistinct, repairImplemented: isNew ? 'yes' : 'no',
      evidenceSource: isNew ? 'cs-games/pathway/tests/roundoff-evidence.test.mjs; csp-games/roundoff-overflow-lab/tests.mjs (36,867 assertions, independent BigInt oracle)' : 'PR #46 requirements/recommended.mjs and evidence-gap-registry.json'});
    continue;
  }
  const row = {...base, currentRoute: 'teacher-assessment', reasonCode: r.reason, firstAttemptEvidence: '', mixedMapsCorrectly: 'not measured'};
  if (node.courseId === 'advanced') {
    const pool = boundedPracticePools[node.id];
    if (key === 'variable-lab:assemble') Object.assign(row, {category: 'B', objectivelyAssessable: 'yes', bankMeetsRequirement: 'unknown', measuredDistinct: '', confidence: 'low',
      firstAttemptEvidence: 'credited since mastery evidence repair (no replay measurement in the registry)', whyNotEnabled: 'Registry marks it fully supported but with null measurements; PR #46 left declaration assembly teacher-assessed.',
      recommendation: 'Replay real assemble questions, measure families, confirm that an assembled declaration cannot be reached by trial and error before any tier.', evidenceSource: 'evidence-gap-registry.json (null measured block)'});
    else Object.assign(row, {category: 'C', objectivelyAssessable: 'yes', confidence: 'high', firstAttemptEvidence: 'yes (registry: focused and Mixed credit 100%)',
      mixedMapsCorrectly: reg?.measured?.mixedDrawn ? `${reg.measured.mixedCreditedToIntendedNode}/${reg.measured.mixedDrawn}` : 'not measured', bankMeetsRequirement: 'no',
      measuredDistinct: pool ?? reg?.measured?.distinctFamiliesBound ?? '', whyNotEnabled: `Attribution is fully supported; the bank has ${pool ?? reg?.measured?.distinctFamiliesBound} distinct items${pool ? ' (bounded pool)' : ' (families bound; item count not recorded)'}.`,
      recommendation: 'Expand with new reasoning families rather than variants of the existing ones.', evidenceSource: 'evidence-gap-registry.json; requirements/recommended.mjs boundedPracticePools'});
  } else if (node.courseId === 'csp') {
    const k = key.split(':')[1].replace('CSP-', ''), c = CSP[k];
    if (!c) throw new Error('no CSP judgment for ' + node.id);
    const depth = c.inet ? inetBySkill[c.inet]?.size : c.depth;
    const measured = c.inet ? `${depth} reasoning families in Internet Layers Lab (${depth * 5} questions = families x 5 surface profiles)` : c.measured ?? '';
    Object.assign(row, {category: c.cat, objectivelyAssessable: c.obj, confidence: c.conf, bankMeetsRequirement: c.inet || c.depth ? 'no (below 30)' : 'unknown', measuredDistinct: measured,
      firstAttemptEvidence: c.q === 'direct' ? 'attribution path exists (resolveRecord direct)' : c.q === 'estimated' ? 'no: estimated mapping is not credited' : 'no: no skill resolves',
      mixedMapsCorrectly: c.q === 'direct' ? 'resolves by game; Mixed credits the question shown' : 'n/a', whyNotEnabled: c.why, recommendation: c.rec,
      evidenceSource: 'csp-games/exam-readiness/mapping.js probe' + (c.inet ? '; csp-games/internet-layers-lab real bank' : '')});
  } else if (node.courseId === 'workplace') {
    const concept = node.familySelectors[0].conceptId, cap = wprCapacity[concept];
    const perf = WPR_PERFORMANCE.has(concept), w = wprPrimary.get(concept);
    const cat = perf ? 'E' : !w.keyCount ? 'D' : w.reviewOnly ? 'B' : 'C';
    Object.assign(row, {category: cat, objectivelyAssessable: perf ? 'knowledge only' : 'yes (situational judgment)', confidence: 'medium',
      bankMeetsRequirement: perf ? 'n/a' : 'no',
      measuredDistinct: `${cap.signatures} tagged signatures, ${cap.families} families, B/I/A ${cap.beginner}/${cap.intermediate}/${cap.advanced}; ${w.keyCount} primary reasoning units (${w.highKeys} high confidence)`,
      firstAttemptEvidence: 'no: ' + WPR_GATED, repairImplemented: 'adapter and primary-concept rule: yes; node not enabled',
      whyNotEnabled: w.reasons.join('; ') + '.',
      recommendation: perf ? 'Keep teacher-assessed for the performed behaviour; scenario practice stays formative knowledge practice. '
        : cat === 'D' ? 'No question has this concept as its primary assessed concept. Write questions whose decisive reasoning is this concept, or keep teacher-assessed.'
        : cat === 'B' ? 'Attribution and reasoning diversity require further validation.'
        : 'Add reasoning units whose primary concept is this one, or revise option lengths where that is the stated reason.',
      evidenceSource: 'cs-games/pathway/audit/wpr-mastery/coverage.mjs; cs-games/pathway/audit/coverage/wpr-concept-capacity.cjs (real hybrid library)'});
  } else {
    if (act === 'parts-sprint') {
      const cat = node.familySelectors[0].category, n = Object.values(parts.PARTS).filter(p => p.category === cat).length;
      Object.assign(row, {category: 'C', objectivelyAssessable: 'yes', confidence: 'high', bankMeetsRequirement: 'no (below 30)', measuredDistinct: `${n} distinct parts`, firstAttemptEvidence: 'attribution path exists (category topic)',
        whyNotEnabled: `Only ${n} distinct parts in this category; 30 identifications would repeat parts. Identification does not show physical engineering competence.`, recommendation: 'Add question formats (function, compatibility, size) rather than more part photos; hands-on skill stays teacher-assessed.',
        evidenceSource: 'cs-games/robotics/parts-sprint/catalog.js'});
    } else if (act === 'component-challenge') {
      const mode = {choose: 'choose', troubleshoot: 'fix', solution: 'solution', tools: 'tools'}[key.split(':')[1]], n = componentModes[mode].size;
      Object.assign(row, {category: 'C', objectivelyAssessable: 'yes', confidence: 'medium', bankMeetsRequirement: n >= 20 ? 'no for 30; 20 only if complex tier accepted' : 'no (below 20)', measuredDistinct: `${n} scenarios (each its own family) in mode ${mode}`,
        firstAttemptEvidence: 'no: graph selectors are adapter-pending', whyNotEnabled: `Adapter-pending graph selectors; only ${n} scenarios in this mode.`, recommendation: 'Wire an adapter, then expand scenarios; do not claim hardware competence from choices.',
        evidenceSource: 'cs-games/robotics/component-challenge/scenarios.mjs'});
    } else {
      Object.assign(row, {category: 'E', objectivelyAssessable: 'no', confidence: 'medium', bankMeetsRequirement: 'n/a', measuredDistinct: '', firstAttemptEvidence: 'n/a',
        whyNotEnabled: 'Open design work (scale, geometry and test comparison are justified in a design), per the PR #46 report.', recommendation: 'Keep teacher-assessed.', evidenceSource: 'PR #46 report; not independently re-verified'});
    }
  }
  row.status = statusOf[row.category];
  rows.push(row);
}

// ---------------------------------------------------------------------------------------------------------- outputs
const cols = ['course', 'area', 'nodeId', 'title', 'currentRoute', 'reasonCode', 'practiceActivities', 'scoredModes', 'verifiedFamilyCount', 'mixedMapsCorrectly', 'firstAttemptEvidence', 'whyNotEnabled', 'objectivelyAssessable', 'bankMeetsRequirement', 'measuredDistinct', 'category', 'recommendation', 'confidence', 'status', 'proposedTier', 'minDistinct', 'repairImplemented', 'evidenceSource'];
const esc = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n';
const tally = (list, f) => list.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const exceptions = rows.filter(r => r.currentRoute === 'teacher-assessment' || r.status === 'newly-validated');
const summary = {
  baseline: {commit: '651d07a364ba0cd3550c6cd8f883a890555a4106', graphVersion: graph.version, registrySchema: registry.schemaVersion, registryGraphVersion: registry.graphVersion, nodes: rows.length},
  byStatus: tally(rows, r => r.status), originalExceptions: 162, remainingTeacherRoute: rows.filter(r => r.currentRoute === 'teacher-assessment').length,
  exceptionsByCategory: tally(exceptions, r => r.category), byCourseStatus: tally(rows, r => r.course + '|' + r.status),
  byCourseCategory: tally(exceptions, r => r.course + '|' + r.category), byArea: tally(rows, r => r.course + '|' + r.area + '|' + r.status),
  pendingWorkplaceByTier: tally(rows.filter(r => r.status === 'insufficient-diversity'), r => r.proposedTier),
  nodesAutomatic: rows.filter(r => r.status === 'already-automatic' || r.status === 'newly-validated').length,
};
const json = JSON.stringify({schema: 'cs-games.coverage-matrix/1', summary, rows}, null, 1) + '\n';
if (check) {
  if (fs.readFileSync(path.join(outDir, 'CLAUDE_MASTERY_COVERAGE_MATRIX.csv'), 'utf8') !== csv || fs.readFileSync(path.join(outDir, 'coverage-matrix.json'), 'utf8') !== json) { console.error('coverage matrix is stale: run build-coverage-matrix.mjs'); process.exit(1); }
  console.log('coverage matrix current (' + rows.length + ' nodes)');
} else {
  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'CLAUDE_MASTERY_COVERAGE_MATRIX.csv'), csv);
  fs.writeFileSync(path.join(outDir, 'coverage-matrix.json'), json);
  console.log(JSON.stringify(summary, null, 1));
}
export {rows, summary, catLabel};
