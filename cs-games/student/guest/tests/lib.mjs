import fs from 'node:fs';
import { createSessionTracker } from '../../../../java-games/session.js';
import { createGuestStore } from '../store.mjs';
import { recordGuestAttempt } from '../hook.mjs';

export const graph = JSON.parse(fs.readFileSync(new URL('../../../pathway/curriculum-graph.json', import.meta.url)));
export const memoryStorage = (seed = {}) => {
  const m = new Map(Object.entries(seed));
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
};
export const clock = (iso = '2026-11-02T16:00:00.000Z') => { let t = Date.parse(iso); const now = () => t; now.advance = ms => { t += ms; return t; }; now.set = v => { t = Date.parse(v); }; return now; };
export const newStore = (opts = {}) => {
  const storage = opts.storage ?? memoryStorage();
  const now = opts.now ?? clock();
  const store = createGuestStore({ storage, now, onWarning: opts.onWarning });
  return { store, storage, now };
};
// A real Java session tracker wired exactly like java-games/session.js wires it, but to the guest hook.
export function javaTracker({ store, now, courseId = 'advanced', storage = memoryStorage(), profile = false, classEvents = [] }) {
  let n = 0;
  return createSessionTracker({
    storage, now: () => new Date(now()), id: () => `q${now()}-${++n}`,
    onAttempt: profile ? (...a) => classEvents.push(a) : recordGuestAttempt(courseId, { store }),
  });
}
export function answerWith(tracker, { game, topic, mode, details, correct, retries = [] }) {
  const id = tracker.begin(game, game, topic, topic, mode, mode);
  tracker.annotate(id, details);
  const first = tracker.submit(id, correct);
  for (const c of retries) tracker.submit(id, c);
  return { id, first };
}
export const nodeById = id => graph.nodes.find(n => n.id === id);
export const nodesOf = course => graph.nodes.filter(n => n.courseId === course);
