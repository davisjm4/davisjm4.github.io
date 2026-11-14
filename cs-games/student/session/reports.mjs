import { scopedStorage } from '../../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';
import { sessionTracker as javaTracker } from '../../../java-games/session.js?v=guest-map-v1';
import { sessionTracker as cspTracker } from '../../../csp-games/session.js?v=guest-map-v1';
import { createRoboticsSession } from '../../robotics/parts-sprint/session.js?v=guest-map-v1';

export const reports = {
  advanced: { title: 'Advanced CS', url: '/java-games/session-summary/', label: 'Advanced CS report', tracker: javaTracker },
  csp: { title: 'AP CSP', url: '/csp-games/session-summary/', label: 'AP CSP report', tracker: cspTracker },
  robotics: { title: 'Robotics', url: '/cs-games/robotics/parts-sprint/#session-summary', label: 'Parts Sprint report', tracker: roboticsTracker },
  workplace: { title: 'Workplace Readiness', url: '/wpr-games/workplace-readiness/#/summary', label: 'Workplace Performance', localSession: workplaceSession },
  raceces: { title: 'RACECES', url: '/wpr-games/raceces/#/summary', label: 'RACECES report', localSession: racecesSession },
};

let robotics;
function roboticsTracker() {
  if (!robotics) {
    let storage;
    try { storage = globalThis.localStorage; } catch { /* The tracker handles unavailable storage. */ }
    robotics = createRoboticsSession({ storage }).tracker;
  }
  return robotics;
}

function legacyRecord(key, { independent = false } = {}) {
  try {
    const storage = independent ? globalThis.localStorage : scopedStorage(globalThis.localStorage);
    const result = JSON.parse(storage.getItem(key));
    return result?.version === 1 ? result : null;
  } catch { return null; }
}

function legacySession(record, started, attempted, firstTry, title, modes, labels) {
  if (!Number.isFinite(started) || started <= 0 || !Number.isSafeInteger(attempted) || attempted < 1 ||
      !Number.isSafeInteger(firstTry) || firstTry < 0 || firstTry > attempted) return null;
  const activity = { title, attempted, firstTry, modes: {} };
  for (const [key, name] of Object.entries(labels)) {
    const mode = modes?.[key];
    const correct = mode?.c ?? mode?.ok;
    if (Number.isSafeInteger(mode?.n) && Number.isSafeInteger(correct) && correct >= 0 && correct <= mode.n) {
      activity.modes[key] = { title: name, attempted: mode.n, firstTry: correct };
    }
  }
  return { started, totals: { attempted, firstTry }, activeSeconds: Math.floor(Math.max(0, Number(record.activeMs) || 0) / 1000),
    games: { activity } };
}

function workplaceSession() {
  const record = legacyRecord('wrg.v1');
  return legacySession(record, record?.startedAt, record?.stats?.completed, record?.stats?.firstAttemptCorrect,
    'Workplace Readiness practice', record?.stats?.byMode, {
      decision: 'Workplace Decisions', nextstep: 'Best Next Step', order: 'Put the Steps in Order', find: 'Find the Problem',
    });
}

function racecesSession() {
  const record = legacyRecord('raceces-writing-games:v1:session', { independent: true });
  return legacySession(record, record?.started, record?.totals?.done, record?.totals?.correct, 'RACECES practice',
    record?.byMode, { identify: 'Identify the Parts', rearrange: 'Rearrange the Response', missing: 'Choose the Missing Piece' });
}

export function firstTry(metrics) {
  return metrics.attempted
    ? Math.round(1000 * metrics.firstTry / metrics.attempted) / 10 + '%'
    : '—';
}

export function reportRows(games) {
  return Object.values(games).map(game => ({
    title: game.title,
    attempted: game.attempted,
    firstTry: game.firstTry,
    modes: Object.values(game.modes ?? {}).map(mode => ({
      title: mode.title, attempted: mode.attempted, firstTry: mode.firstTry,
    })),
  }));
}

export function scopedReportUrl(url, independent) {
  if (!independent) return url;
  const target = new URL(url, 'https://cs-games.invalid');
  target.searchParams.set('learner', 'guest');
  return target.pathname + target.search + target.hash;
}
