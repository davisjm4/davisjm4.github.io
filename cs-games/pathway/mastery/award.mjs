// SERVER-SIDE ONLY. This is the single place an official mastery award can be produced, and it needs an explicit
// trusted-evidence boundary supplied by server code. It is deliberately NOT exported from index.mjs, which is the browser-safe
// entry point. Browser evidence is provisional: normalizeEvent() never marks an event verified unless the integrator's own
// trustResolver says so, and a client's own "trusted" claim is ignored.
//
// A boundary is the server's attestation that it re-derived each event from a source it controls (for example a server-side question
// grader or a teacher-supervised session) rather than from a student's browser:
//   { kind: 'trusted-evidence-boundary', issuer: '<service name>', verifiedEventIds: ['...'] }
// Nothing here can check that attestation cryptographically; the integration must only call it from authenticated Worker code.
import { deepFreeze, lastCompleted } from './attempts.mjs';

export function proposeAward({ history, boundary, now }) {
  const fail = (reason) => ({ ok: false, reason, history });
  if (!now || !Number.isFinite(Date.parse(now))) throw new Error('proposeAward needs an ISO `now`.');
  const attempt = lastCompleted(history);
  if (!attempt) return fail('no-completed-attempt');
  const existing = history.awards.find((a) => a.attemptId === attempt.id);
  if (existing) return { ok: true, idempotent: true, award: existing, history };
  if (!boundary || boundary.kind !== 'trusted-evidence-boundary' || typeof boundary.issuer !== 'string' || !boundary.issuer || !Array.isArray(boundary.verifiedEventIds)) return fail('no-trusted-evidence-boundary');
  if (!attempt.snapshot?.trust?.verified) return fail('evidence-not-verified');
  const covered = new Set(boundary.verifiedEventIds);
  if (!attempt.snapshot.ledger.eventIds.every((id) => covered.has(id))) return fail('boundary-does-not-cover-evidence');
  const award = { id: `award:${attempt.id}`, kind: 'mastery-award', nodeIds: [history.nodeId], policyId: attempt.policy.id, policyVersion: attempt.policy.version,
    eligible: true, timestamp: now, issuedAt: now, attemptId: attempt.id, issuer: boundary.issuer, evidenceCount: attempt.snapshot.ledger.eventIds.length };
  return { ok: true, idempotent: false, award, history: deepFreeze({ ...history, awards: [...history.awards, award] }) };
}
