/* Narrow integration hook for the shared session trackers (Java, CSP, Robotics Parts Sprint).
 *
 *   onAttempt: activeProfile ? (...a)=>recordGameAttempt('csp',...a) : recordGuestAttempt('csp'),
 *
 * Signature matches recordGameAttempt(courseId, record, sessionId, correct, occurred) minus the class-only session id.
 * It does nothing while a class profile is active (the tracker only reaches this branch when none is), nothing until the
 * learner has chosen to explore on their own, never throws into a game, never loads the curriculum graph and never uses the network.
 */
import { createGuestStore } from './store.mjs';
import { guestEventFromAttempt } from './evidence.mjs';

let shared;
export function guestStore() {
  if (!shared) { let storage; try { storage = globalThis.localStorage; } catch { /* storage blocked */ } shared = createGuestStore({ storage }); }
  return shared;
}
export function recordGuestAttempt(courseId, { store } = {}) {
  return (record, _sessionId, correct, occurred) => {
    try {
      const event = guestEventFromAttempt(courseId, record, correct, occurred);
      return event ? (store || guestStore()).addEvent(event) : false;
    } catch { return false; }
  };
}
