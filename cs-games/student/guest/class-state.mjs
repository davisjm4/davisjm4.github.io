/* Read-only check: is a class profile active on this browser? Used only to tell the learner where their practice is going.
 * Reads one key, keeps nothing (no id, no token) and writes nothing. */
const ACTIVE = 'wrg.profile.active.v1';
export function classProfileActive(storage) {
  try { const p = JSON.parse(storage.getItem(ACTIVE)); return !!(p && typeof p.id === 'string' && Number.isSafeInteger(p.expires) && p.expires > Date.now()); } catch { return false; }
}
