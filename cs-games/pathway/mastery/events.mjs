// Turns raw practice records into immutable, scoped, first-attempt-aware evidence records.
// Reuses questionEvidence() so node attribution is the same selector logic the Worker applies at ingest: a question credits
// the nodes its ASSESSED mode and family map to, never "Mixed", never a node chosen by the client.
// This module never trusts a client's claim of trust: `trust` is set only by the integrator's trustResolver.
import { questionEvidence } from '../evidence.mjs';

export const EVENT_SCHEMA = 'cs-games.mastery-event/1';
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/|%-]{0,119}$/;
const MAX_SKEW_MS = 5 * 60 * 1000;
const text = (v) => (typeof v === 'string' && ID.test(v) ? v : null);

/** Accept either a stored performance_events row ({id, occurred, pathway, activity, data}) or a flat outbox/practice event. */
export function flatten(raw) {
  if (raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object' && typeof raw.activity === 'string') {
    const { n, c, dimensions, ...rest } = raw.data; // stored n/c/dimensions are ingest-time tallies; the engine recomputes from first principles
    return { id: raw.id, occurred: raw.occurred, courseId: raw.pathway ?? raw.courseId, activity: raw.activity, profileId: raw.profileId ?? raw.profile, storedDimensions: dimensions, ...rest };
  }
  return raw;
}
export const scopeKey = (scope) => `${scope.profileId}|${scope.classId ?? '-'}`;

/**
 * Normalize one raw event. Returns {ok:true, event} or {ok:false, id, reason, detail}. It never throws on malformed input and
 * never invents missing state: absent attempt numbers, correctness, timestamps or assessed modes reject the record.
 */
export function normalizeEvent(rawInput, { graph, scope, trustResolver = null, now = null } = {}) {
  const fail = (reason, detail) => ({ ok: false, id: typeof rawInput?.id === 'string' ? rawInput.id : null, reason, detail });
  if (!scope || typeof scope.profileId !== 'string' || !scope.profileId) throw new Error('A profile scope is required to normalize evidence.');
  if (!rawInput || typeof rawInput !== 'object') return fail('malformed');
  const raw = flatten(rawInput);
  const id = text(raw.id), questionId = text(raw.questionId), sessionId = text(raw.sessionId);
  const activityId = text(raw.activityId ?? raw.activity);
  if (!id) return fail('missing-id');
  if (!questionId) return fail('missing-question-id');
  if (!sessionId) return fail('missing-session-id');
  if (!activityId) return fail('missing-activity');
  const profile = raw.profileId ?? raw.profile;
  if (profile != null && profile !== scope.profileId) return fail('scope-mismatch', 'profile');
  const classId = scope.classId ?? null;
  if (raw.classId != null && classId !== null && raw.classId !== classId) return fail('scope-mismatch', 'class');
  const ms = raw.timestamp != null ? Date.parse(raw.timestamp) : Number(raw.occurred);
  if (raw.timestamp == null && raw.occurred == null) return fail('missing-timestamp');
  if (!Number.isFinite(ms)) return fail('invalid-timestamp');
  if (now !== null && ms > Date.parse(now) + MAX_SKEW_MS) return fail('future-timestamp');
  const outcome = raw.revealed === true ? 'revealed' : raw.skipped === true ? 'skipped' : 'answered';
  if (outcome === 'answered' && typeof raw.correct !== 'boolean') return fail('missing-correctness');
  let attemptNumber = raw.attempt;
  if (attemptNumber == null) {
    if (outcome === 'answered') return fail('missing-attempt-number');
    attemptNumber = raw.firstAttempt === false ? 2 : 1; // a skip/reveal record describes the presentation itself
  }
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > 1000) return fail('invalid-attempt-number');
  if (typeof raw.firstAttempt === 'boolean' && raw.firstAttempt !== (attemptNumber === 1)) return fail('conflicting-first-attempt');
  const requestedMode = text(raw.mode ?? raw.requestedMode);
  const assessedMode = text(raw.assessedMode) ?? requestedMode;
  if (!assessedMode || assessedMode.toLowerCase() === 'mixed') return fail('no-assessed-mode', 'Mixed Practice must report the mode of the question shown.');
  const familyId = text(raw.familyId);
  const familyKnown = familyId !== null && familyId !== 'unclassified';
  const notes = [];
  if (raw.assessedMode == null || text(raw.assessedMode) === null) notes.push('assessed-mode-taken-from-requested-mode');
  if (raw.trusted != null || raw.trust != null || raw.verified != null) notes.push('client-trust-claim-ignored');
  if (outcome !== 'answered' && raw.correct === true) notes.push('correct-flag-ignored-for-' + outcome);
  let nodeIds = [];
  try {
    nodeIds = questionEvidence(graph, {
      id, questionId, sessionId, activityId, courseId: raw.courseId, mode: requestedMode, assessedMode, topic: text(raw.topic),
      details: raw.details, familyId: familyKnown ? familyId : 'unclassified', timestamp: new Date(ms).toISOString(), firstAttempt: attemptNumber === 1,
      correct: outcome === 'answered' ? raw.correct : false,
    }, { trusted: false }).nodeIds;
  } catch (error) { return fail('malformed', String(error.message)); }
  if (!nodeIds.length) return fail('no-node-mapping', `${activityId}/${assessedMode} credits no skill node.`);
  if (Array.isArray(raw.storedDimensions) && raw.storedDimensions.length) {
    const stored = raw.storedDimensions.map((d) => d.id).sort().join();
    if (stored !== [...nodeIds].sort().join()) notes.push('stored-attribution-differs-from-graph');
  }
  const subskills = Array.isArray(raw.subskills) ? [...new Set(raw.subskills.filter((s) => text(s)))].slice(0, 20) : [];
  const difficulty = typeof raw.difficulty === 'string' && raw.difficulty.trim() ? raw.difficulty.trim().toLowerCase() : null;
  const trusted = typeof trustResolver === 'function' && trustResolver({ id, questionId, sessionId, scope, activityId }) === true;
  const event = {
    schema: EVENT_SCHEMA, id, questionId, sessionId, scope: Object.freeze({ profileId: scope.profileId, classId }), timestamp: new Date(ms).toISOString(), ts: ms,
    activityId, courseId: raw.courseId ?? null, requestedMode, assessedMode, topic: text(raw.topic), familyId: familyKnown ? familyId : null, difficulty,
    attemptNumber, firstAttempt: attemptNumber === 1, outcome, correct: outcome === 'answered' ? raw.correct : false, assisted: raw.assisted === true,
    subskills: Object.freeze(subskills), nodeIds: Object.freeze([...new Set(nodeIds)]), trust: trusted ? 'verified' : 'provisional', notes: Object.freeze(notes),
  };
  return { ok: true, event: Object.freeze(event) };
}

/** Normalize a list. Rejections are reported, never silently dropped. Exact duplicate ids are collapsed here and counted. */
export function normalizeEvents(list, ctx) {
  const events = [], rejected = [], seen = new Set();
  let duplicates = 0;
  for (const raw of list ?? []) {
    const r = normalizeEvent(raw, ctx);
    if (!r.ok) { rejected.push({ id: r.id, reason: r.reason, detail: r.detail }); continue; }
    if (seen.has(r.event.id)) { duplicates++; continue; }
    seen.add(r.event.id);
    events.push(r.event);
  }
  const reasons = {};
  for (const r of rejected) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  return { events, rejected, counts: { received: (list ?? []).length, accepted: events.length, rejected: rejected.length, duplicateIds: duplicates, reasons } };
}
export const compareEvents = (a, b) => a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
