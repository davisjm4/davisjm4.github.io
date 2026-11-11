// The single authoritative progress calculation. A future learning map, student sidebar and teacher preview all read THIS object,
// so they cannot disagree. Five things are reported side by side and never merged:
//   1. challenge qualification      (status, attempt)           - did the practice record meet the teacher's requirements?
//   2. verified / official mastery  (verification, award)       - only a trusted-evidence boundary can set this
//   3. area completion              (see area.mjs)
//   4. standards score 0-4          (standards)                 - a teacher assessment read via the existing evaluateNode()
//   5. pacing                       (not computed here)         - pacingStatus() in model.mjs remains the source
import { evaluateNode } from '../model.mjs';
import { formatPercent, toBasisPoints } from './arithmetic.mjs';
import { activeAttempt, lastCompleted, syncAttempt } from './attempts.mjs';
import { isChallengeConfigured, policyKey, toPathwayPolicy } from './policy.mjs';

export const PROGRESS_SCHEMA = 'cs-games.mastery-progress/1';
const DAY = 86400000;
const list = (items) => (items.length <= 1 ? items.join('') : items.length === 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function summarize(a) {
  if (!a) return null;
  const s = a.snapshot ?? {};
  return { attemptId: a.id, seq: a.seq, status: a.status, policy: { id: a.policy.id, version: a.policy.version }, openedAt: a.openedAt, closedAt: a.closedAt, closeReason: a.closeReason,
    attempted: s.counts?.attempted ?? null, correct: s.counts?.correct ?? null, accuracyPercent: s.counts?.accuracyPercent ?? null };
}

export function nodeStatus({ policy, support, last, activeEval, currentMet, now }) {
  if (!isChallengeConfigured(policy)) return { status: 'provisional', reason: policy.provisional ? 'policy-not-approved' : 'no-challenge-requirements' };
  if (currentMet) {
    const stale = policy.challenge.review.staleAfterDays;
    if (stale && Date.parse(now) - Date.parse(last.closedAt) > stale * DAY) return { status: 'review-recommended', reason: 'stale' };
    return { status: 'requirements-met', reason: null };
  }
  if (support.status === 'unsupported') return { status: 'provisional', reason: 'requirements-cannot-be-met' };
  if (support.reasons.some((r) => r.code === 'family-metadata-unavailable' || r.code === 'families-not-bound-at-source')) return { status: 'provisional', reason: 'families-cannot-be-verified' };
  if (last && !currentMet && !(activeEval && activeEval.ledger.records)) return { status: 'review-recommended', reason: 'policy-changed' };
  if (activeEval && activeEval.ledger.records) return { status: 'in-progress', reason: null };
  return { status: 'not-started', reason: null };
}

/** Plain-language explanation. Uses titles and labels only, never identifiers. */
export function explain(p) {
  const t = p.title, req = p.requirements, c = p.attempt;
  const lines = [];
  const goal = req ? `at least ${req.minimumQuestions} questions with at least ${formatPercent(req.requiredAccuracyPercent)} correct on the first try` : null;
  let headline;
  switch (p.status) {
    case 'provisional':
      headline = p.statusReason === 'requirements-cannot-be-met' ? `The requirements for ${t} can't be met with the questions that are available yet. Your teacher needs to review them.`
        : p.statusReason === 'families-cannot-be-verified' ? `The practice requirements for ${t} can't be checked yet because the question variety for this skill isn't recorded. Your answers are still saved.`
          : `Your teacher hasn't set practice requirements for ${t} yet. Keep practicing; your answers are saved.`;
      break;
    case 'not-started': headline = `You haven't started ${t} yet. To meet the requirements, answer ${goal}.`; break;
    case 'requirements-met':
      headline = `You've met the practice requirements for ${t}.`;
      lines.push(p.verification === 'verified' ? 'Your teacher\'s records have verified this skill.' : 'This is a practice milestone. It becomes official mastery only after it is verified.');
      break;
    case 'review-recommended':
      headline = p.reassessment?.reason === 'stale' ? `It has been a while since you met the requirements for ${t}. A refresher is recommended.`
        : `You met the earlier requirements for ${t}. Your teacher updated them, so a new challenge is open: answer ${goal}.`;
      lines.push('Your earlier progress is saved.');
      break;
    default: {
      const behind = c.attempted < req.minimumQuestions;
      headline = behind ? `You've answered ${c.attempted} of the ${req.minimumQuestions} required questions. Your accuracy is ${formatPercent(c.accuracyPercent ?? 0)}.`
        : `You've answered ${c.attempted} questions and ${c.correct} were right on the first try (${formatPercent(c.accuracyPercent ?? 0)}).`;
    }
  }
  if (p.status === 'in-progress' || (p.status === 'review-recommended' && c && c.attempted)) {
    const r = p.recovery;
    if (r && !r.accuracyMet && c.attempted > 0) {
      if (r.accuracyUnrecoverableInAttempt) lines.push(`Reaching ${formatPercent(req.requiredAccuracyPercent)} is no longer possible in this attempt. You can restart; your earlier work stays in your history.`);
      else if (c.attempted >= req.minimumQuestions) lines.push(`You don't need to restart. Keep practicing: at least ${plural(r.additionalCorrectForAccuracy, 'more correct answer')} in a row would bring your accuracy to ${formatPercent(req.requiredAccuracyPercent)}${r.lowerBoundOnly ? ', counting accuracy only' : ''}.`);
      else lines.push(`Your accuracy is below the ${formatPercent(req.requiredAccuracyPercent)} goal right now. Keep practicing to raise it.`);
    }
    if (p.missing?.subskills.length) lines.push(`You still need to practice questions about ${list(p.missing.subskills.map((s) => s.label))}.`);
    if (p.missing?.difficulties.length) lines.push(`You still need ${list(p.missing.difficulties.map((d) => d.difficulty))} questions.`);
    if (p.missing?.families) lines.push(`Try questions of more different kinds: you've answered correctly in ${p.missing.families.have} kinds and need ${p.missing.families.have + p.missing.families.needed}.`);
    if (p.recovery?.lowerBoundOnly && p.recovery.otherRequirementsOutstanding.length && p.recovery.additionalCorrectForAccuracy) lines.push('The number of correct answers above covers accuracy only; the other requirements still apply.');
    if (p.limits.some((l) => l.code === 'AMBIGUOUS_SUBSKILL_EVIDENCE')) lines.push('Some of your answers could not be matched to a specific topic, so they can\'t count toward the topic requirements yet.');
  }
  return { headline, lines, text: [headline, ...lines].join(' ') };
}

/**
 * Evaluate one node for one student scope and return the progress contract plus the updated history.
 * Pure: pass `now`, `events` (normalized), the node descriptor, the policy in force and every known policy version.
 */
export function nodeProgress({ node, policy, history, events, now, policies = [], contentProfile = null, assessmentEvidence = [], carryOver = false, firstWindow = 'beginning', required = null }) {
  const synced = syncAttempt(history, { policy, events, now, policies, carryOver, contentProfile, firstWindow });
  const h = synced.history, last = lastCompleted(h), open = activeAttempt(h);
  const configured = isChallengeConfigured(policy);
  const currentMet = Boolean(last && policyKey(last.policy) === policyKey(policy));
  const activeEval = open ? synced.evaluation : null;
  const shown = currentMet ? last.snapshot : (open ? synced.evaluation : (last ? null : synced.evaluation));
  const { status, reason } = nodeStatus({ policy, support: synced.evaluation.support, last, activeEval, currentMet, now });
  const award = h.awards.find((a) => last && a.attemptId === last.id) ?? null;
  const legacy = evaluateNode(node.id, { ...toPathwayPolicy(policy), provisional: true }, assessmentEvidence);
  const bp = configured ? toBasisPoints(policy.accuracy) : null;
  const lifetime = events.filter((e) => e.nodeIds.includes(node.id));
  const lifetimeFirst = new Map();
  for (const e of lifetime.filter((x) => x.firstAttempt)) { const k = `${e.sessionId}|${e.questionId}`; if (!lifetimeFirst.has(k)) lifetimeFirst.set(k, e); }
  const counts = shown?.counts ?? null;
  const progress = {
    schema: PROGRESS_SCHEMA, nodeId: node.id, areaId: node.areaId, title: node.title, required: required ?? policy.challenge.requiredForAreaCompletion,
    status, statusReason: reason,
    attemptStatus: open ? synced.evaluation.status : last ? last.status : 'not-started',
    verification: award ? 'verified' : 'provisional',
    policy: { id: policy.id, version: policy.version, configured, exampleOnly: policy.exampleOnly === true },
    requirements: configured ? { minimumQuestions: policy.minimumQuestions, requiredAccuracy: policy.accuracy, requiredAccuracyPercent: bp / 100, minimumCorrect: policy.challenge.minimumCorrect, correctNeededAtMinimum: shown?.recovery?.correctNeededAtMinimum ?? null, subskills: policy.challenge.subskills.map((s) => ({ id: s.id, label: s.label, minExposure: s.minExposure, minCorrect: s.minCorrect, minAccuracy: s.minAccuracy })), difficulties: policy.challenge.difficulties, minimumFamilies: policy.challenge.families.minDistinct } : null,
    attempt: counts ? { id: open?.id ?? last?.id ?? null, seq: open?.seq ?? last?.seq ?? null, attempted: counts.attempted, correct: counts.correct, accuracy: counts.accuracy, accuracyPercent: counts.accuracyPercent, distinctFamilies: counts.distinctFamilies, excluded: counts.excluded, windowStart: open?.windowStart ?? last?.windowStart ?? null } : null,
    remaining: shown?.recovery ? { questions: shown.recovery.remainingQuestions } : null,
    recovery: shown?.recovery ?? null,
    missing: shown?.missing ?? null,
    diagnostics: shown?.diagnostics ?? [],
    requirementChecks: shown?.requirements ?? [],
    lastCompletedAttempt: summarize(last),
    lifetime: { questionsAnswered: lifetimeFirst.size, firstTryCorrect: [...lifetimeFirst.values()].filter((e) => e.correct && !e.assisted && e.outcome === 'answered').length, attempts: h.attempts.length, restarts: h.attempts.filter((a) => a.status === 'restarted').length },
    reassessment: status === 'review-recommended' || (last && !currentMet && configured) ? { needed: true, reason: reason ?? 'policy-changed', earnedUnder: last ? { id: last.policy.id, version: last.policy.version } : null, now: { id: policy.id, version: policy.version } } : null,
    standards: { score: legacy.score, source: 'teacher-assessment', separateFromChallenge: true },
    award: award ? { id: award.id, issuedAt: award.issuedAt } : legacy.award ? { id: legacy.award, issuedAt: null } : null,
    support: synced.evaluation.support,
    trust: shown?.trust ?? null,
    limits: [...(shown?.limitations ?? []), ...(shown?.diagnostics ?? []).filter((d) => d.code === 'AMBIGUOUS_SUBSKILL_EVIDENCE')],
    changes: synced.changes,
  };
  if (progress.attempt && progress.attempt.accuracyPercent === null) progress.attempt.accuracyPercent = null;
  progress.explanation = explain(progress);
  return { progress, history: h, changes: synced.changes };
}
