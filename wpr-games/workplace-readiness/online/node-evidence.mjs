import { recordGameAttempt } from './profile-sync.mjs?v=guest-map-v1';
import { primaryAttribution, WPR_COURSE, WPR_PRACTICE_ACTIVITY } from '../../../cs-games/pathway/wpr-primary-concepts.mjs';

/* Node-level practice evidence for Workplace Readiness.
 *
 * The page still sends its legacy skill/topic report event (profile-student.mjs queuePractice). This adds the shared scored-attempt event the
 * pathway reads, through the same recordGameAttempt queue, outbox, sync and rejection handling every other game uses:
 *   courseId workplace, activity workplace-readiness, one scored attempt per question (the page locks the answer after one check),
 *   topic = the single primary assessed concept, familyId = the reasoning unit that justifies it, assessedMode = the question's own mode.
 * A question with no reviewed primary concept (generic, ambiguous or unrecognised) sends nothing here and earns no node credit.
 * Secondary concept tags are never sent. Guests have no active profile, so recordGameAttempt queues nothing for them. */
export const EVIDENCE_REVISION = 'wpr-primary-v1';

// Deterministic 128-bit mix (cyrb128 style) so a reload or offline replay of the same question keeps the same event identity.
function mix128(text) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}
export function uuidFrom(text) {
  const hex = mix128(text).map(n => n.toString(16).padStart(8, '0')).join('');
  const variant = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export const sessionIdFor = seed => uuidFrom('wpr-session|' + seed);
export const questionIdFor = (seed, question) => uuidFrom('wpr-question|' + seed + '|' + question.id);

/* Build the record handed to recordGameAttempt, or null when this question earns no node credit. */
export function nodeAttemptRecord(question, seed) {
  if (typeof seed !== 'string' || !seed || !question || typeof question.id !== 'string') return null;
  const primary = primaryAttribution(question);
  if (!primary) return null;
  return {
    id: questionIdFor(seed, question), game: WPR_PRACTICE_ACTIVITY, submissions: 1, mode: question.mode, topic: primary.conceptId,
    details: { practiceMode: question.mode, profileTopic: primary.conceptId, reasoningFamily: primary.key,
      difficulty: question.difficulty, evidenceRevision: EVIDENCE_REVISION },
  };
}

export function queueNodeAttempt(question, right, { seed, occurred = Date.now() } = {}) {
  try {
    const record = nodeAttemptRecord(question, seed);
    if (!record) return false;
    recordGameAttempt(WPR_COURSE, record, sessionIdFor(seed), Boolean(right), new Date(occurred).toISOString());
    return true;
  } catch { return false; }
}
