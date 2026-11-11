// Deterministic synthetic practice records for tests and the demonstration. No real students, no network, no clock.
// Events have the shape the practice pages queue (see recordGameAttempt in wpr-games/workplace-readiness/online/profile-sync.mjs).
export function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const BASE = Date.parse('2026-11-02T16:00:00.000Z');

/** One first-attempt answer in an outbox-shaped record. `at` is minutes after the synthetic start. */
export function answer({ student, session, n, activity = 'math-lab', courseId = 'advanced', requestedMode = null, assessedMode, familyId = null, difficulty = null, correct, at, assisted = false, attempt = 1, topic = null }) {
  const questionId = `${student}-${session}-q${n}`;
  return { version: 1, format: 'game-attempt', kind: 'practice', id: `${questionId}:${attempt}`, questionId, sessionId: `${student}-${session}`, courseId, activity, attempt, correct,
    occurred: BASE + at * 60000, mode: requestedMode ?? assessedMode, assessedMode, topic, difficulty, familyId, assisted };
}
/**
 * A run of focused answers on one mode. `families` are cycled in order; `results` is an array of booleans (or a function of the index).
 * Returns {events, next} where next is the question counter and clock to continue from.
 */
export function focused({ student, session, start = { n: 1, at: 0 }, count, results, ...rest }) {
  const events = [];
  const families = rest.families ?? [rest.familyId ?? null];
  for (let i = 0; i < count; i++) {
    const correct = typeof results === 'function' ? results(i) : results[i % results.length];
    events.push(answer({ student, session, n: start.n + i, at: start.at + i, correct, ...rest, familyId: families[i % families.length] }));
  }
  return { events, next: { n: start.n + count, at: start.at + count } };
}
/** Mixed Practice: the page asks for 'mixed' but each answer reports the mode of the question actually shown. */
export function mixed({ student, session, start = { n: 1, at: 0 }, rounds, plan, activity = 'math-lab', results }) {
  const events = [];
  let n = start.n, at = start.at, i = 0;
  for (let r = 0; r < rounds; r++) for (const step of plan) {
    const correct = typeof results === 'function' ? results(i, step) : results[i % results.length];
    events.push(answer({ student, session, n, at, activity, requestedMode: 'mixed', assessedMode: step.assessedMode, familyId: step.families[r % step.families.length], correct }));
    n++; at++; i++;
  }
  return { events, next: { n, at } };
}
export const retry = (first, correct, minutes = 0.5) => ({ ...first, id: `${first.questionId}:2`, attempt: 2, correct, occurred: first.occurred + minutes * 60000 });
export const minutesAfterStart = (m) => new Date(BASE + m * 60000).toISOString();
