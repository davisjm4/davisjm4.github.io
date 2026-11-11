// Pure, deterministic evaluation of one node's evidence against one mastery policy. No clock, no storage, no network.
//
// What counts as a scored question
//   One record per distinct (sessionId, questionId): its FIRST submitted attempt. Retries (attempt > 1) and repeated ids never add
//   credit; an incorrect first answer stays incorrect even if the student later fixes it. Focused and Mixed Practice are the same
//   thing here: only the assessed mode and family on the event matter.
// Skips, reveals, hints
//   Never credited as correct. By default each stays in the denominator as incorrect, so skipping hard questions cannot raise
//   accuracy. A policy may choose 'excluded' (outside the denominator) but only up to maxExcludedShare of presented questions.
import { BP, toBasisPoints, meetsAccuracy, minCorrectFor, additionalCorrectToRecover, mistakeAllowance, accuracyPercent, accuracyFraction } from './arithmetic.mjs';
import { compareEvents } from './events.mjs';
import { isChallengeConfigured, policyDigest, policyRef } from './policy.mjs';

export const EVALUATION_SCHEMA = 'cs-games.mastery-evaluation/1';

/** Selects first-attempt records from a node's events: dedupe, ignore retries, report orphans. */
export function selectRecords(events, nodeId) {
  const mine = events.filter((e) => e.nodeIds.includes(nodeId)).sort(compareEvents);
  const ignored = { duplicateEvents: 0, duplicateQuestions: 0, retries: 0, orphanRetries: 0 };
  const seenIds = new Set(), firstKeys = new Set(), retryKeys = new Set(), records = [];
  for (const e of mine) {
    if (seenIds.has(e.id)) { ignored.duplicateEvents++; continue; }
    seenIds.add(e.id);
    const key = `${e.sessionId}|${e.questionId}`;
    if (!e.firstAttempt) { ignored.retries++; retryKeys.add(key); continue; }
    if (firstKeys.has(key)) { ignored.duplicateQuestions++; continue; }
    firstKeys.add(key);
    records.push(e);
  }
  for (const key of retryKeys) if (!firstKeys.has(key)) ignored.orphanRetries++;
  return { records, ignored, eventIds: mine.map((e) => e.id) };
}

export function creditOf(e, unscored) {
  const rule = (k) => (unscored[k] === 'excluded' ? 'excluded' : 'incorrect');
  if (e.outcome === 'revealed') return { credit: rule('revealed'), cause: 'revealed' };
  if (e.outcome === 'skipped') return { credit: rule('skipped'), cause: 'skipped' };
  if (e.assisted) return { credit: rule('assisted'), cause: 'assisted' };
  return { credit: e.correct === true ? 'correct' : 'incorrect', cause: null };
}

const needs = (m) => [m.assessedModes && 'assessedMode', (m.familyIds || m.familyPrefixes) && 'familyId', m.topics && 'topic'].filter(Boolean);
export function matchesSubskill(sub, e) {
  const m = sub.match, dims = [];
  if (m.assessedModes) dims.push(Boolean(e.assessedMode) && m.assessedModes.includes(e.assessedMode));
  if (m.familyIds) dims.push(Boolean(e.familyId) && m.familyIds.includes(e.familyId));
  if (m.familyPrefixes) dims.push(Boolean(e.familyId) && m.familyPrefixes.some((p) => e.familyId.startsWith(p)));
  if (m.topics) dims.push(Boolean(e.topic) && m.topics.includes(e.topic));
  return dims.length ? dims.every(Boolean) : e.subskills.includes(sub.id);
}
const lacksMetadata = (sub, e) => needs(sub.match).some((k) => !e[k]);

const bump = (map, key, correct) => { const x = map.get(key) || { n: 0, correct: 0 }; x.n++; if (correct) x.correct++; map.set(key, x); };
function emptyCounters() {
  return { attempted: 0, correct: 0, excluded: { assisted: 0, skipped: 0, revealed: 0 }, difficulties: new Map(), subskills: new Map(), families: new Map(), ambiguous: 0, unclassified: 0, unbound: new Set(), verified: 0, provisional: 0 };
}
function addRecord(c, e, policy, boundFamilies) {
  const { credit, cause } = creditOf(e, policy.challenge.unscored);
  if (e.trust === 'verified') c.verified++; else c.provisional++;
  if (credit === 'excluded') { c.excluded[cause]++; return; }
  const ok = credit === 'correct';
  c.attempted++; if (ok) c.correct++;
  if (e.difficulty) bump(c.difficulties, e.difficulty, ok);
  if (e.familyId) { if (!boundFamilies || boundFamilies.has(e.familyId)) bump(c.families, e.familyId, ok); else c.unbound.add(e.familyId); } else c.unclassified++;
  let matched = false;
  for (const s of policy.challenge.subskills) if (matchesSubskill(s, e)) { matched = true; bump(c.subskills, s.id, ok); }
  if (!matched && policy.challenge.subskills.some((s) => lacksMetadata(s, e))) c.ambiguous++;
}

/** Requirement-by-requirement check of a counter snapshot. */
export function checkRequirements(c, policy, { familiesVerifiable = true } = {}) {
  const ch = policy.challenge, bp = toBasisPoints(policy.accuracy), N = policy.minimumQuestions;
  const reqs = [], diags = [];
  const add = (code, label, met, required, actual, diag) => { reqs.push({ code, label, met, required, actual }); if (!met && diag) diags.push(diag); };
  add('minimumQuestions', `Answer at least ${N} questions`, c.attempted >= N, N, c.attempted, { code: 'INSUFFICIENT_COUNT', needed: Math.max(0, N - c.attempted) });
  const accOk = meetsAccuracy(c.correct, c.attempted, bp);
  add('accuracy', `At least ${bp / 100}% first-try accuracy`, accOk, bp / BP, accuracyFraction(c.correct, c.attempted),
    c.attempted ? { code: 'LOW_OVERALL_ACCURACY', accuracyPercent: accuracyPercent(c.correct, c.attempted), requiredPercent: bp / 100, atOrAboveMinimum: c.attempted >= N } : null);
  if (ch.minimumCorrect !== null) add('minimumCorrect', `At least ${ch.minimumCorrect} correct first tries`, c.correct >= ch.minimumCorrect, ch.minimumCorrect, c.correct, { code: 'INSUFFICIENT_CORRECT', needed: ch.minimumCorrect - c.correct });
  for (const d of ch.difficulties) {
    const x = c.difficulties.get(d.difficulty) || { n: 0, correct: 0 };
    const exposure = x.n >= d.minQuestions, perf = x.correct >= d.minCorrect;
    add(`difficulty:${d.difficulty}`, `${d.minQuestions} ${d.difficulty} questions (${d.minCorrect} correct)`, exposure && perf, d.minQuestions, x.n,
      !exposure ? { code: 'MISSING_REQUIRED_DIFFICULTY', difficulty: d.difficulty, have: x.n, needed: d.minQuestions - x.n } : { code: 'LOW_DIFFICULTY_PERFORMANCE', difficulty: d.difficulty, correct: x.correct, needed: d.minCorrect - x.correct });
  }
  for (const s of ch.subskills) {
    const x = c.subskills.get(s.id) || { n: 0, correct: 0 };
    const exposed = x.n >= s.minExposure, enough = x.correct >= s.minCorrect, rate = s.minAccuracy === null || meetsAccuracy(x.correct, x.n, toBasisPoints(s.minAccuracy));
    add(`subskill:${s.id}`, `${s.label}: ${s.minExposure} questions, ${s.minCorrect} correct${s.minAccuracy === null ? '' : `, ${toBasisPoints(s.minAccuracy) / 100}% accuracy`}`, exposed && enough && rate, s.minExposure, x.n,
      !exposed ? { code: 'MISSING_SUBSKILL_EXPOSURE', subskillId: s.id, label: s.label, have: x.n, needed: s.minExposure - x.n }
        : { code: 'LOW_SUBSKILL_PERFORMANCE', subskillId: s.id, label: s.label, exposure: x.n, correct: x.correct, neededCorrect: Math.max(0, s.minCorrect - x.correct), accuracyPercent: accuracyPercent(x.correct, x.n) });
  }
  if (ch.subskills.length) {
    const share = c.attempted ? c.ambiguous / c.attempted : 0;
    add('subskillEvidence', 'Questions carry the metadata needed to place them in a subskill', share <= ch.subskillEvidence.maxUnmappedShare, ch.subskillEvidence.maxUnmappedShare, share, { code: 'AMBIGUOUS_SUBSKILL_EVIDENCE', unmapped: c.ambiguous, share });
  }
  if (ch.families.minDistinct > 0) {
    const have = [...c.families.values()].filter((f) => f.correct >= ch.families.minCorrectEach).length;
    // Without a list of the families that really exist for the node, family names on events could be cosmetic: the requirement cannot be verified.
    if (!familiesVerifiable) reqs.push({ code: 'families', label: `Correct answers in ${ch.families.minDistinct} different question families`, met: false, required: ch.families.minDistinct, actual: have }), diags.push({ code: 'FAMILY_METADATA_UNAVAILABLE', have });
    else add('families', `Correct answers in ${ch.families.minDistinct} different question families`, have >= ch.families.minDistinct, ch.families.minDistinct, have, { code: 'INSUFFICIENT_FAMILY_VARIETY', have, needed: ch.families.minDistinct - have });
  }
  const excluded = c.excluded.assisted + c.excluded.skipped + c.excluded.revealed, presented = excluded + c.attempted;
  if (excluded) add('exclusions', 'Few questions set aside as hinted, skipped or revealed', excluded / presented <= ch.unscored.maxExcludedShare, ch.unscored.maxExcludedShare, excluded / presented, { code: 'EXCESSIVE_EXCLUSIONS', excluded, presented });
  return { requirements: reqs, diagnostics: diags, met: reqs.every((r) => r.met) };
}

/** Can the policy be met with the question variety the node really has? `verified` marks facts from the graph versus estimates. */
export function assessSupport(policy, profile = null) {
  const reasons = [], ch = policy.challenge;
  const add = (code, verified, message, level) => reasons.push({ code, verified, message, level });
  if (policy.provisional) add('policy-provisional', true, 'This requirement has not been approved yet.', 'provisional');
  else if (!isChallengeConfigured(policy)) add('no-challenge-requirements', true, 'The policy sets no question minimum and accuracy, so there is no practice challenge to evaluate.', 'provisional');
  const p = profile ?? {};
  const bound = Array.isArray(p.boundFamilyIds) ? p.boundFamilyIds : null;
  if (ch.families.minDistinct > 0) {
    if (bound === null) add('family-metadata-unavailable', false, 'The available question families for this skill are not known, so the family requirement cannot be verified.', 'provisional');
    else if (bound.length < ch.families.minDistinct) add('fewer-families-than-required', true, `Only ${bound.length} question families exist for this skill but ${ch.families.minDistinct} are required.`, 'unsupported');
    else if (p.familyBindingStatus && p.familyBindingStatus !== 'source-family-ids') add('families-not-bound-at-source', false, 'Question families are not reported by the practice pages for this skill, so the family requirement cannot be verified.', 'provisional');
  }
  for (const d of ch.difficulties) {
    if (!Array.isArray(p.difficulties)) add('difficulty-levels-unknown', false, `It is not known whether this skill has ${d.difficulty} questions.`, 'provisional');
    else if (!p.difficulties.includes(d.difficulty)) add('difficulty-not-offered', true, `This skill has no ${d.difficulty} questions.`, 'unsupported');
  }
  if (Number.isInteger(p.bankSize) && policy.minimumQuestions !== null && p.bankSize < policy.minimumQuestions) add('question-pool-smaller-than-minimum', true, `Only ${p.bankSize} distinct questions exist but ${policy.minimumQuestions} are required.`, 'unsupported');
  if (bound !== null) for (const s of ch.subskills) {
    const m = s.match;
    if ((m.familyIds || m.familyPrefixes) && !bound.some((f) => (!m.familyIds || m.familyIds.includes(f)) && (!m.familyPrefixes || m.familyPrefixes.some((x) => f.startsWith(x))))) add('subskill-has-no-questions', true, `No question family matches the subskill "${s.label}".`, 'unsupported');
  }
  const status = reasons.some((r) => r.level === 'unsupported') ? 'unsupported' : reasons.length ? 'provisional' : 'supported';
  return { status, reasons: reasons.map(({ level, ...r }) => r) };
}
export function contentProfileFromGraph(graph, nodeId) {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const bySource = new Map(graph.questionFamilies.map((f) => [f.id, f.sourceFamilyId]));
  const bound = (node.familyIds || []).map((id) => bySource.get(id)).filter(Boolean);
  return { boundFamilyIds: node.familyBindingStatus === 'source-family-ids' || bound.length ? bound : null, familyBindingStatus: node.familyBindingStatus || null, difficulties: null, bankSize: null };
}

function recovery(c, policy, requirements) {
  const bp = toBasisPoints(policy.accuracy), N = policy.minimumQuestions;
  const correctNeededAtMinimum = Math.max(minCorrectFor(N, bp), policy.challenge.minimumCorrect ?? 0);
  const outstanding = requirements.filter((r) => !r.met && r.code !== 'accuracy' && r.code !== 'minimumQuestions').map((r) => r.code);
  const k = additionalCorrectToRecover(c.correct, c.attempted, bp);
  const remainingQuestions = Math.max(0, N - c.attempted);
  const allow = mistakeAllowance({ correct: c.correct, attempted: c.attempted, minimum: N, bp });
  return {
    remainingQuestions, correctNeededAtMinimum,
    accuracyMet: meetsAccuracy(c.correct, c.attempted, bp),
    additionalCorrectForAccuracy: k, accuracyUnrecoverableInAttempt: k === null,
    // fewest more answers, all correct, that satisfy the question count AND the accuracy rule; still ignores the other requirements
    additionalAnswersLowerBound: k === null ? null : Math.max(k, remainingQuestions),
    mistakesAllowedAtMinimum: allow.atMinimumCheckpoint, mistakeBudgetAtMinimum: allow.budgetAtMinimum, minimumCheckpointReachable: allow.checkpointStillReachable, mistakesBeforeThresholdBreaks: allow.beforeThresholdBreaks,
    lowerBoundOnly: outstanding.length > 0, otherRequirementsOutstanding: outstanding,
    // never true: this engine does not promise mastery from an accuracy calculation
    guaranteesRequirementsMet: false,
  };
}
function summarizeMissing(c, policy, requirements, diags) {
  const ch = policy.challenge, label = new Map(ch.subskills.map((s) => [s.id, s.label]));
  const missingSubskills = diags.filter((d) => d.code === 'MISSING_SUBSKILL_EXPOSURE' || d.code === 'LOW_SUBSKILL_PERFORMANCE').map((d) => ({ id: d.subskillId, label: label.get(d.subskillId), reason: d.code === 'MISSING_SUBSKILL_EXPOSURE' ? 'exposure' : 'performance', needed: d.needed ?? d.neededCorrect }));
  const fam = requirements.find((r) => r.code === 'families');
  return { subskills: missingSubskills, families: fam && !fam.met ? { have: fam.actual, needed: fam.required - fam.actual } : null,
    difficulties: diags.filter((d) => d.code === 'MISSING_REQUIRED_DIFFICULTY' || d.code === 'LOW_DIFFICULTY_PERFORMANCE').map((d) => ({ difficulty: d.difficulty, reason: d.code === 'MISSING_REQUIRED_DIFFICULTY' ? 'exposure' : 'performance', needed: d.needed })) };
}

/**
 * Evaluate a node's evidence against a normalized policy (see validateMasteryPolicy).
 * `events` are normalized events for ONE profile scope; mixed scopes throw. `endAt` (optional) caps the evaluation.
 * If the requirements are met at some point in the stream, the evaluation is FROZEN at that record: later practice does not change it.
 */
export function evaluateEvidence({ nodeId, policy, events, contentProfile = null }) {
  const scopes = new Set(events.map((e) => `${e.scope.profileId}|${e.scope.classId ?? '-'}`));
  const profiles = new Set(events.map((e) => e.scope.profileId));
  if (profiles.size > 1) throw new Error('Evidence from more than one student profile cannot be evaluated together.');
  if (scopes.size > 1) throw new Error('Evidence from more than one class scope cannot be evaluated together.');
  const configured = isChallengeConfigured(policy);
  const sel = selectRecords(events, nodeId);
  const support = assessSupport(policy, contentProfile);
  const bound = contentProfile && Array.isArray(contentProfile.boundFamilyIds) ? new Set(contentProfile.boundFamilyIds) : null;
  const familiesVerifiable = bound !== null;
  const base = { schema: EVALUATION_SCHEMA, nodeId, policy: { ...policyRef(policy), digest: policyDigest(policy) }, configured, support, ignored: sel.ignored, limitations: [] };
  const lim = base.limitations;
  if (sel.ignored.orphanRetries) lim.push({ code: 'ORPHAN_RETRIES', count: sel.ignored.orphanRetries, message: 'Some retries arrived without their first attempt, which may have been lost; they earn no credit.' });
  if (!configured) {
    const c = emptyCounters();
    for (const e of sel.records) addRecord(c, e, policy, bound);
    return { ...base, status: sel.records.length ? 'provisional' : 'not-started', qualifies: false, counts: counts(c), requirements: [], diagnostics: [], recovery: null, missing: null, trust: trust(c), completion: null, ledger: { eventIds: sel.eventIds, records: sel.records.length } };
  }
  const c = emptyCounters();
  let completion = null, snapshot = null, used = 0;
  for (let i = 0; i < sel.records.length; i++) {
    addRecord(c, sel.records[i], policy, bound);
    if (!completion && checkRequirements(c, policy, { familiesVerifiable }).met) { completion = { recordNumber: i + 1, eventId: sel.records[i].id, at: sel.records[i].timestamp }; snapshot = structuredCloneCounters(c); used = i + 1; break; }
    used = i + 1;
  }
  const finalC = snapshot ?? c;
  const chk = checkRequirements(finalC, policy, { familiesVerifiable });
  const N = policy.minimumQuestions;
  const status = chk.met ? 'requirements-met' : !sel.records.length ? 'not-started' : finalC.attempted >= N ? 'requirements-not-yet-met' : 'in-progress';
  const afterCompletion = completion ? sel.records.length - used : 0;
  lim.push({ code: 'SKIPS_NOT_RECORDED', message: 'Practice pages do not yet record skipped or revealed questions, so the engine can only apply the skip and reveal rules to records that carry those flags.', informational: true });
  const eventIdsUpTo = completion ? sel.eventIds.slice(0, sel.eventIds.indexOf(completion.eventId) + 1) : sel.eventIds;
  return { ...base, status, qualifies: chk.met, counts: counts(finalC), requirements: chk.requirements, diagnostics: chk.diagnostics, recovery: recovery(finalC, policy, chk.requirements), missing: summarizeMissing(finalC, policy, chk.requirements, chk.diagnostics),
    trust: trust(finalC), completion, afterCompletionRecords: afterCompletion, ledger: { eventIds: eventIdsUpTo, records: used } };
}
function structuredCloneCounters(c) {
  const copy = (m) => new Map([...m].map(([k, v]) => [k, { ...v }]));
  return { ...c, unbound: new Set(c.unbound), excluded: { ...c.excluded }, difficulties: copy(c.difficulties), subskills: copy(c.subskills), families: copy(c.families) };
}
function counts(c) {
  return { attempted: c.attempted, correct: c.correct, incorrect: c.attempted - c.correct, accuracy: accuracyFraction(c.correct, c.attempted), accuracyPercent: accuracyPercent(c.correct, c.attempted),
    excluded: { ...c.excluded }, distinctFamilies: c.families.size, unclassifiedQuestions: c.unclassified, unboundFamilyIds: [...c.unbound].sort(), bySubskill: Object.fromEntries(c.subskills), byDifficulty: Object.fromEntries(c.difficulties) };
}
function trust(c) { return { verified: c.provisional === 0 && c.verified > 0, verifiedEvents: c.verified, provisionalEvents: c.provisional }; }
