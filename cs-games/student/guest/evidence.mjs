/* Guest evidence adapter.
 *
 * guestEventFromAttempt() mirrors recordGameAttempt() in wpr-games/workplace-readiness/online/profile-sync.mjs so a practice
 * page hands the same question-level record to either the class-backed queue or this local store.
 * resolveEventNodes() credits skills with the SAME questionEvidence() the Worker uses (cs-games/pathway/evidence.mjs), so a
 * guest and an enrolled student get credit for the same questions. A parity test compares it with the Worker's cleanGameAttempt.
 *
 * Credit rules (same as class-backed evidence): first submission only; assisted answers never count; Mixed Practice credits the
 * assessed mode of the question shown; unmapped questions credit nothing; nothing is invented when family or mode is missing.
 */
import { questionEvidence } from '../../pathway/evidence.mjs';
import { normalizeEvent } from '../../pathway/mastery/events.mjs';
import { COURSE_IDS, localDate } from './store.mjs';

const META = /^[a-zA-Z0-9][a-zA-Z0-9_.:/|%-]{0,119}$/;
const meta = v => (typeof v === 'string' && META.test(v) ? v : null);

// record: { id, game, topic, mode, details, submissions } as produced by the shared session trackers.
export function guestEventFromAttempt(courseId, record, correct, occurred, nowMs = Date.now()) {
  if (!COURSE_IDS.includes(courseId) || !record || typeof record.id !== 'string' || !META.test(record.id)) return null;
  if (record.submissions !== 1) return null; // a correct retry is never a second first-attempt success
  const details = record.details || {};
  if (details.assisted === true) return null;
  const activityId = meta(record.game);
  if (!activityId) return null;
  const when = Date.parse(occurred);
  const occurredMs = Number.isFinite(when) ? when : nowMs;
  const difficulty = typeof details.difficulty === 'string' ? details.difficulty.toLowerCase() : null;
  return {
    id: record.id + ':1', questionId: record.id, courseId, activityId, attempt: 1, correct: Boolean(correct),
    mode: meta(details.practiceSetting || details.selectedMode || record.mode),
    assessedMode: meta(details.practiceMode) || meta(details.format) || meta(details.mode) || meta(record.mode),
    topic: meta(details.profileTopic) || meta(record.topic), difficulty,
    evidenceRevision: meta(details.evidenceRevision),
    familyId: meta(details.reasoningFamily || details.generatorFamily || details.familyId || details.family || details.modelId || details.componentId),
    occurred: occurredMs, date: localDate(occurredMs),
  };
}

const activityCourseCache = new WeakMap();
function activityCourses(graph) {
  let map = activityCourseCache.get(graph);
  if (!map) {
    map = new Map();
    for (const node of graph.nodes) for (const a of node.practice) { const s = map.get(a.activityId) || new Set(); s.add(node.courseId); map.set(a.activityId, s); }
    activityCourseCache.set(graph, map);
  }
  return map;
}

export function resolveEventNodes(graph, event) {
  if (!activityCourses(graph).get(event.activityId)?.has(event.courseId)) return [];
  try {
    return questionEvidence(graph, {
      id: event.id, questionId: event.questionId, sessionId: 'guest', courseId: event.courseId, activityId: event.activityId,
      mode: event.mode, assessedMode: event.assessedMode, topic: event.topic, familyId: event.familyId || 'unclassified',
      timestamp: new Date(event.occurred).toISOString(), firstAttempt: true, correct: event.correct,
    }).nodeIds;
  } catch { return []; }
}

// Stamp credit on events that have not been resolved against this graph release yet. Events keep their raw practice
// details, so a release that adds a skill can credit earlier practice and a release can never erase it. Pure: returns whether anything changed.
export function reconcileEvents(state, graph) {
  let changed = 0;
  for (const e of state.events) {
    if (e.graphVersion === graph.version && e.nodeIds) continue;
    const next = resolveEventNodes(graph, e);
    e.nodeIds = next; e.graphVersion = graph.version; changed++;
  }
  // Keep "where I left off" pointing at the most recent credited practice.
  for (const course of COURSE_IDS) {
    const last = [...state.events].reverse().find(e => e.courseId === course && e.nodeIds?.length);
    if (!last) continue;
    const at = state.position[course]?.at;
    if (!at || last.occurred > Date.parse(at)) {
      const node = graph.nodes.find(n => n.id === last.nodeIds[0]);
      state.position[course] = { areaId: node?.areaId ?? null, nodeId: last.nodeIds[0], at: new Date(last.occurred).toISOString() };
      changed++;
    }
  }
  return changed;
}

// Formative inputs are mapped from question metadata, including on restored backups.
export function guestEvidenceByNode(graph, events, courseId) {
  const byNode = new Map();
  const scope = { profileId: 'independent-browser' };
  for (const raw of events) {
    if (raw.courseId !== courseId || !activityCourses(graph).get(raw.activityId)?.has(courseId)) continue;
    const result = normalizeEvent({ ...raw, activity: raw.activityId, sessionId: 'guest' }, { graph, scope });
    if (!result.ok) continue;
    for (const nodeId of result.event.nodeIds) {
      if (!byNode.has(nodeId)) byNode.set(nodeId, []);
      byNode.get(nodeId).push(result.event);
    }
  }
  return byNode;
}
