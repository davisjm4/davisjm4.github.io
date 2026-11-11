// Attempt lifecycle and immutable history for ONE node of ONE student scope (profile, optional class).
//
//   not started -> in-progress -> requirements-not-yet-met -> requirements-met        (derived from evidence while the attempt is open)
//   closed states: requirements-met | restarted | superseded-by-new-policy
//
// History is append-only. Every function returns a new deeply frozen history; closed attempts are never modified, carry the
// policy id, version and digest they were judged against, and keep a frozen snapshot plus the ids of the events they claimed.
// An event is claimed by at most one attempt (the only exception is an explicit carry-over, where the superseded attempt hands its
// events to its successor and says so). The functions are pure: callers supply `now`, events and policies.
import { evaluateEvidence } from './evaluate.mjs';
import { isChallengeConfigured, policyDigest, policyKey, policyRef } from './policy.mjs';

export const HISTORY_SCHEMA = 'cs-games.mastery-history/1';
export const ATTEMPT_STATUS = Object.freeze(['in-progress', 'requirements-not-yet-met', 'requirements-met', 'restarted', 'superseded-by-new-policy']);
const OPEN = new Set(['in-progress', 'requirements-not-yet-met']);

export function deepFreeze(x) {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) deepFreeze(v); }
  return x;
}
const same = (a, b) => a.profileId === b.profileId && (a.classId ?? null) === (b.classId ?? null);
/** An event may feed a history when it is the same profile and either unclassed (profile-level) or from the same class. */
export const eventInScope = (e, scope) => e.scope.profileId === scope.profileId && (e.scope.classId === null || e.scope.classId === (scope.classId ?? null));

export function emptyHistory(scope, nodeId) {
  if (!scope?.profileId || !nodeId) throw new Error('A history needs a profile scope and a node.');
  return deepFreeze({ schema: HISTORY_SCHEMA, scope: { profileId: scope.profileId, classId: scope.classId ?? null }, nodeId, attempts: [], awards: [], requests: {} });
}
export const isOpen = (a) => a.closedAt === null;
export const activeAttempt = (h) => h.attempts.find(isOpen) ?? null;
export const lastCompleted = (h) => [...h.attempts].reverse().find((a) => a.status === 'requirements-met') ?? null;
const attemptId = (h, seq) => `attempt:${h.scope.profileId}:${h.scope.classId ?? '-'}:${h.nodeId}:${seq}`;

/** Events an open attempt owns: inside its window and not claimed by an earlier attempt. */
export function eventsFor(history, attempt, events) {
  const claimed = new Set(history.attempts.filter((a) => a.id !== attempt.id && a.seq < attempt.seq && !a.carriedOverTo).flatMap((a) => a.snapshot?.ledger.eventIds ?? []));
  const from = attempt.windowStart === 'beginning' ? -Infinity : Date.parse(attempt.windowStart);
  return events.filter((e) => eventInScope(e, history.scope) && e.ts >= from && !claimed.has(e.id));
}
function append(history, attempts, extra = {}) { return deepFreeze({ ...history, ...extra, attempts }); }
function newAttempt(history, policy, now, windowStart, openedBy) {
  return { id: attemptId(history, history.attempts.length + 1), seq: history.attempts.length + 1, scope: history.scope, nodeId: history.nodeId, policy: { ...policyRef(policy), digest: policyDigest(policy) },
    status: 'in-progress', windowStart, openedAt: now, openedBy, closedAt: null, closeReason: null, snapshot: null, successorId: null, carriedOverTo: null };
}
function close(attempt, { status, at, reason, snapshot, successorId = null, carriedOverTo = null }) { return { ...attempt, status, closedAt: at, closeReason: reason, snapshot, successorId, carriedOverTo }; }
const findPolicy = (policies, ref) => (policies ?? []).find((p) => p.id === ref.id && p.version === ref.version) ?? null;

function guardPolicyVersions(history, policy, policies) {
  for (const a of history.attempts) {
    const known = a.policy.id === policy.id && a.policy.version === policy.version ? policy : findPolicy(policies, a.policy);
    if (known && policyDigest(known) !== a.policy.digest) throw new Error(`Policy ${policyKey(known)} was changed after attempts were recorded against it. Publish a new version instead.`);
  }
}

/**
 * Bring the history up to date with the evidence and the policy now in force. Idempotent for the same inputs.
 * - Opens the first attempt when evidence for the node exists. The first attempt reaches back to the start of the evidence
 *   (`firstWindow: 'beginning'`) so practice done before the challenge existed is not discarded; use `firstWindow: <ISO>` to cut it off.
 * - Closes an open attempt as requirements-met at the record where it was met.
 * - Supersedes an open attempt when the policy changed, and starts a fresh attempt under the new policy.
 * - Never edits a closed attempt, and never revokes an earned one.
 * Returns {history, evaluation, active, changes}. `evaluation` is for the open attempt, or the last completed one.
 */
export function syncAttempt(history, { policy, events, now, policies = [], carryOver = false, contentProfile = null, firstWindow = 'beginning' }) {
  if (!now || !Number.isFinite(Date.parse(now))) throw new Error('syncAttempt needs an ISO `now`.');
  if (events.some((e) => !eventInScope(e, history.scope))) throw new Error('Evidence belongs to a different student profile or class than this history.');
  if (!isChallengeConfigured(policy)) {
    const evaluation = evaluateEvidence({ nodeId: history.nodeId, policy, events: events.filter((e) => e.nodeIds.includes(history.nodeId)), contentProfile });
    return { history, evaluation, active: activeAttempt(history), changes: [] };
  }
  guardPolicyVersions(history, policy, policies);
  let h = history; const changes = [];
  const evaluateOpen = (attempt, pol) => evaluateEvidence({ nodeId: h.nodeId, policy: pol, events: eventsFor(h, attempt, events), contentProfile });
  let active = activeAttempt(h);
  if (active && policyKey(active.policy) !== policyKey(policy)) {
    const oldPolicy = findPolicy(policies, active.policy);
    const snapshot = oldPolicy ? evaluateOpen(active, oldPolicy) : null;
    const at = policy.effectiveFrom ?? now;
    const successor = newAttempt(h, policy, at, carryOver ? active.windowStart : at, 'policy-change');
    const closed = close(active, { status: 'superseded-by-new-policy', at, reason: 'policy-change', snapshot: snapshot ?? { unavailable: 'policy-definition-missing', ledger: { eventIds: [] } }, successorId: successor.id, carriedOverTo: carryOver ? successor.id : null });
    h = append(h, [...h.attempts.map((a) => (a.id === active.id ? closed : a)), successor]);
    changes.push({ type: 'superseded', attemptId: closed.id, successorId: successor.id, from: closed.policy, to: policyRef(policy), carryOver });
    active = successor;
  }
  if (!active) {
    const last = h.attempts[h.attempts.length - 1];
    if (!last) {
      if (events.some((e) => e.nodeIds.includes(h.nodeId))) {
        active = newAttempt(h, policy, now, firstWindow, 'first-evidence');
        h = append(h, [active]); changes.push({ type: 'opened', attemptId: active.id, reason: 'first-evidence' });
      }
    } else if (last.status === 'requirements-met' && policyKey(last.policy) !== policyKey(policy)) {
      const at = policy.effectiveFrom ?? now;
      active = newAttempt(h, policy, at, at, 'policy-change');
      h = append(h, [...h.attempts, active]); changes.push({ type: 'reassessment-opened', attemptId: active.id, from: last.policy, to: policyRef(policy) });
    }
  }
  if (!active) {
    const done = lastCompleted(h);
    return { history: h, evaluation: done ? done.snapshot : evaluateEvidence({ nodeId: h.nodeId, policy, events: [], contentProfile }), active: null, changes };
  }
  const evaluation = evaluateOpen(active, policy);
  if (evaluation.qualifies) {
    const closed = close(active, { status: 'requirements-met', at: evaluation.completion.at, reason: 'completed', snapshot: evaluation });
    h = append(h, h.attempts.map((a) => (a.id === active.id ? closed : a)));
    changes.push({ type: 'completed', attemptId: closed.id, at: closed.closedAt });
    return { history: h, evaluation, active: null, changes };
  }
  // The status of an open attempt is derived from the evidence on every call; it is stored on the record only when the attempt closes.
  return { history: h, evaluation, active: { ...active, status: OPEN.has(evaluation.status) ? evaluation.status : 'in-progress' }, changes };
}

/**
 * Restart the open attempt: it is closed as `restarted` with a frozen snapshot and a fresh attempt opens at `now` with all counters at zero.
 * Idempotent: a repeated requestId returns the original outcome and changes nothing. `expectedAttemptId` rejects a request made against
 * an attempt that is no longer the open one (for example a double click that used two request ids).
 */
export function restartAttempt(history, { requestId, expectedAttemptId = null, policy, events, now, policies = [], contentProfile = null }) {
  if (typeof requestId !== 'string' || !requestId) return { ok: false, reason: 'missing-request-id', history };
  const prior = history.requests[requestId];
  if (prior) return { ok: true, idempotent: true, history, attemptId: prior.openedAttemptId, closedAttemptId: prior.closedAttemptId };
  if (!isChallengeConfigured(policy)) return { ok: false, reason: 'policy-not-configured', history };
  const synced = syncAttempt(history, { policy, events, now, policies, contentProfile });
  const active = activeAttempt(synced.history);
  if (!active) return { ok: false, reason: 'no-open-attempt', history: synced.history };
  if (expectedAttemptId && expectedAttemptId !== active.id) return { ok: false, reason: 'stale-request', history: synced.history };
  if (!synced.evaluation.ledger.records) return { ok: false, reason: 'nothing-to-restart', history: synced.history };
  const successor = newAttempt(synced.history, policy, now, now, 'restart');
  const closed = close(active, { status: 'restarted', at: now, reason: 'restart', snapshot: synced.evaluation, successorId: successor.id });
  const h = append(synced.history, [...synced.history.attempts.map((a) => (a.id === active.id ? closed : a)), successor],
    { requests: { ...synced.history.requests, [requestId]: { type: 'restart', closedAttemptId: active.id, openedAttemptId: successor.id, at: now } } });
  return { ok: true, idempotent: false, history: h, attemptId: successor.id, closedAttemptId: active.id };
}

/** Structural invariants every history must keep. Returns a list of problems (empty when sound). */
export function verifyHistory(history, { events = null } = {}) {
  const problems = [], open = history.attempts.filter(isOpen);
  if (history.schema !== HISTORY_SCHEMA) problems.push('schema');
  if (open.length > 1) problems.push('more than one open attempt');
  history.attempts.forEach((a, i) => {
    if (a.seq !== i + 1) problems.push(`attempt ${a.id}: sequence is not contiguous`);
    if (!ATTEMPT_STATUS.includes(a.status)) problems.push(`attempt ${a.id}: unknown status ${a.status}`);
    if (a.closedAt === null && !OPEN.has(a.status)) problems.push(`attempt ${a.id}: closed status on an open attempt`);
    if (a.closedAt !== null && !a.snapshot) problems.push(`attempt ${a.id}: closed without a snapshot`);
    if (!a.policy?.id || !a.policy.version || !a.policy.digest) problems.push(`attempt ${a.id}: missing policy reference`);
    if (!same(a.scope, history.scope) || a.nodeId !== history.nodeId) problems.push(`attempt ${a.id}: scope or node differs from the history`);
  });
  const owner = new Map();
  for (const a of history.attempts.filter((x) => !x.carriedOverTo)) for (const id of a.snapshot?.ledger?.eventIds ?? []) {
    if (owner.has(id)) problems.push(`event ${id} is claimed by attempts ${owner.get(id)} and ${a.id}`); else owner.set(id, a.id);
  }
  if (events) for (const a of history.attempts) for (const id of a.snapshot?.ledger?.eventIds ?? []) if (!events.some((e) => e.id === id)) problems.push(`attempt ${a.id}: ledger event ${id} is not in the supplied evidence`);
  return problems;
}
