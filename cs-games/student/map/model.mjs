// The map model. Pure: no DOM, no clock, no network. Everything a component draws comes from here, and everything here comes from
// three read-only inputs: the curriculum graph, the evaluated progress contract, and an optional pacing overlay.
//
//   Course -> unit -> activity (aggregated area) -> direct practice with stable skill context
//
// Order is the order of the pathway sequence (or, without one, of graph.nodes). `graph.areas` is NOT the curriculum order: for Advanced CS
// it is alphabetical-ish, while graph.nodes follows the established order. Navigation groups an area at its first occurrence,
// while the flat skill sequence and each skill's original courseIndex remain in published order.
import { areaIdentity } from './identity.mjs';
import { daysUntil, formatDay } from './format.mjs';
import { practiceLinks } from '../practice-links.mjs';
import { countsAsComplete, deriveNodeState } from './states.mjs';
import { skillTarget } from './skill-target.mjs';

export const INPUT_SCHEMA = 'cs-games.student-map-input/1';
export const MODEL_SCHEMA = 'cs-games.student-map-model/1';
const SOON_DAYS = 7;
const humanize = (slug) => String(slug ?? '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Accepts the engine's pathwayProgress() output, a bare array of node progress objects, or a map keyed by node id. Missing is fine. */
export function normalizeProgress(progress) {
  const nodes = new Map(), areas = new Map();
  if (!progress) return { nodes, areas };
  const list = Array.isArray(progress) ? progress : Array.isArray(progress.nodes) ? progress.nodes : Object.values(progress.nodes ?? (progress.schema ? {} : progress));
  for (const p of list) if (p && typeof p === 'object' && typeof p.nodeId === 'string') nodes.set(p.nodeId, p);
  for (const a of Array.isArray(progress.areas) ? progress.areas : Object.values(progress.areas ?? {})) if (a && typeof a.areaId === 'string') areas.set(a.areaId, a);
  return { nodes, areas };
}

/** Structural checks on the input. Unknown ids in progress are warnings (the graph may have moved on); a missing graph or course is an error. */
export function validateInput(input) {
  const errors = [], warnings = [];
  const g = input?.graph;
  if (!g || !Array.isArray(g.nodes) || !Array.isArray(g.areas) || !Array.isArray(g.courses)) errors.push('graph needs courses, areas and nodes arrays');
  else {
    if (!g.courses.some((c) => c.id === input.courseId)) errors.push(`course "${input.courseId}" is not in the graph`);
    const ids = new Set(g.nodes.map((n) => n.id));
    if (ids.size !== g.nodes.length) errors.push('graph node ids must be unique');
    const { nodes } = normalizeProgress(input.progress);
    const unknown = [...nodes.keys()].filter((id) => !ids.has(id));
    if (unknown.length) warnings.push(`${unknown.length} progress record(s) refer to skills that are not in the graph and were ignored`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

function orderNodes(courseNodes, sequence, warnings) {
  if (!Array.isArray(sequence)) return courseNodes;
  const byId = new Map(courseNodes.map((n) => [n.id, n])), seen = new Set(), out = [];
  for (const id of sequence) if (byId.has(id) && !seen.has(id)) { seen.add(id); out.push(byId.get(id)); }
  const rest = courseNodes.filter((n) => !seen.has(n.id));
  if (rest.length) warnings.push(`${rest.length} skill(s) were missing from the pathway sequence and were appended in graph order`);
  return [...out, ...rest];
}

function targetFor(target, complete, today) {
  const date = target?.targetDate ?? null;
  const n = daysUntil(date, today);
  if (!date || formatDay(date) === null) return null;
  const day = formatDay(date);
  if (complete) return { date, days: n, tone: 'done', text: `Target ${day}` };
  if (n === null) return { date, days: null, tone: 'upcoming', text: `Target ${day}` };
  // Neutral wording on purpose: a target date is a goal to aim for, not a due date.
  if (n < 0) return { date, days: n, tone: 'passed', text: `Target was ${day}` };
  if (n === 0) return { date, days: n, tone: 'soon', text: 'Target today' };
  if (n === 1) return { date, days: n, tone: 'soon', text: 'Target tomorrow' };
  if (n <= SOON_DAYS) return { date, days: n, tone: 'soon', text: `Target ${day}, in ${n} days` };
  return { date, days: n, tone: 'upcoming', text: `Target ${day}` };
}

function ringFor(state, progress) {
  const req = progress?.requirements;
  if (state === 'requirements-met' || state === 'mastered') return { kind: 'full', fraction: 1 };
  if (!req || !progress.attempt || state === 'unavailable') return null;
  const frac = req.minimumQuestions > 0 ? Math.min(1, (progress.attempt.attempted ?? 0) / req.minimumQuestions) : 0;
  return state === 'not-started' && frac === 0 ? null : { kind: 'questions', fraction: frac };
}

function summarizeStop(stop, areaContract, classCompletion) {
  const nodes = stop.nodes, req = nodes.filter((n) => n.required && (classCompletion || n.requirementsConfigured || n.proficiency?.goal)), opt = nodes.filter((n) => !n.required);
  let requiredCompleted = req.filter((n) => n.complete).length, optionalCompleted = opt.filter((n) => n.complete).length;
  let source = 'derived';
  // Prefer the engine's own area roll-up when it describes exactly this stop. A stop that is only part of an area cannot use it.
  // The live service sends only requiredTotal and requiredCompleted; optional counts are then derived from skill states.
  if (areaContract && stop.parts === 1 && areaContract.requiredTotal === req.length && (areaContract.optionalTotal === undefined || areaContract.optionalTotal === opt.length)) {
    requiredCompleted = areaContract.requiredCompleted; if (areaContract.optionalCompleted !== undefined) optionalCompleted = areaContract.optionalCompleted; source = 'contract';
  }
  const practiced = nodes.filter((n) => n.started).length;
  const mode = nodes.some((n) => n.requirementsConfigured) ? 'requirements' : 'practice';
  const complete = req.length > 0 && requiredCompleted === req.length;
  const status = complete ? 'complete' : (nodes.some((n) => n.started) ? 'in-progress' : 'not-started');
  const independent = nodes.some(node=>node.guest);
  const label = req.length ? `${requiredCompleted} of ${req.length} ${independent?'skill targets':'requirements'} met` : classCompletion ? 'No required skills' : `${practiced} of ${nodes.length} skills practiced`;
  const practiceOnly = nodes.filter((n) => !n.requirementsConfigured && !n.proficiency?.goal).length;
  const targetFraction = req.length ? req.reduce((sum,n)=>sum+(n.complete?1:n.skillTarget?.fraction??n.ring?.fraction??0),0)/req.length : practiced/nodes.length;
  return { status, mode, complete, practiceOnly, requiredTotal: req.length, requiredCompleted, optionalTotal: opt.length, optionalCompleted, optionalRemaining: opt.length - optionalCompleted,
    practiced, classCompletion, reviewRecommended: nodes.filter((n) => n.state === 'review').length, fraction: complete?1:Math.min(.99,targetFraction), label, source };
}

function pickNext(candidates, { preferStopId = null, dated = false } = {}) {
  let pool = candidates;
  if (preferStopId) { const inStop = pool.filter((n) => n.stopId === preferStopId); if (inStop.length) pool = inStop; }
  if (dated) {
    const withDate = pool.filter((n) => n.target?.date);
    if (withDate.length) return [...withDate].sort((a, b) => a.target.date.localeCompare(b.target.date) || a.courseIndex - b.courseIndex)[0];
  }
  return pool[0] ?? null;
}
const isCandidate = (n) => n.required && n.practice.length && n.state !== 'unavailable' &&
  (n.requirementsConfigured ? !n.complete : !n.started);

/**
 * @param {object} input see INPUT_SCHEMA: { graph, courseId, sequence?, progress?, required?, attempts?, pacing?, mixedActivities?, student? }
 */
export function buildMapModel(input) {
  const check = validateInput(input);
  if (!check.ok) throw new RangeError(check.errors.join('; '));
  const warnings = [...check.warnings];
  const { graph, courseId } = input;
  const course = graph.courses.find((c) => c.id === courseId);
  const { nodes: progressByNode, areas: areaContracts } = normalizeProgress(input.progress);
  const attempts = input.attempts ?? {};
  const pacingIn = input.pacing ?? {};
  const dated = pacingIn.mode === 'dated' && Object.keys(pacingIn.targets ?? {}).length > 0;
  const today = pacingIn.today ?? null;
  const mixedActivities = input.mixedActivities ? new Set(input.mixedActivities) : undefined;
  const areaTitle = new Map(graph.areas.map((a) => [a.id, a.title]));
  const areaMarks = new Map(graph.areas.map(area => [area.id,area.guest?.mark]));
  const prereqTitle = new Map(graph.nodes.map((n) => [n.id, n.title]));

  const ordered = orderNodes(graph.nodes.filter((n) => n.courseId === courseId), input.sequence, warnings);
  // Activity navigation is independent of curriculum sequencing. Combine all
  // occurrences of an area, retaining first occurrence order and stable skills.
  const runs = [];
  for (const node of ordered) {
    const last = runs.find(run => run.areaId === node.areaId);
    if (last && last.areaId === node.areaId) last.raw.push(node); else runs.push({ areaId: node.areaId, raw: [node] });
  }
  const runCount = new Map();
  for (const r of runs) runCount.set(r.areaId, (runCount.get(r.areaId) ?? 0) + 1);
  const seenRuns = new Map();

  const flat = [];
  const stops = runs.map((run, stopIndex) => {
    const part = (seenRuns.set(run.areaId, (seenRuns.get(run.areaId) ?? 0) + 1), seenRuns.get(run.areaId));
    const parts = runCount.get(run.areaId);
    const id = parts === 1 ? run.areaId : `${run.areaId}~${part}`;
    const baseTitle = areaTitle.get(run.areaId) ?? humanize(String(run.areaId).split(':').at(-1));
    const title=parts===1?baseTitle:part===1?`${baseTitle} (1 of ${parts})`:`${baseTitle} (continued, ${part} of ${parts})`;
    const stop = { id, areaId: run.areaId, index: stopIndex, part, parts, title, baseTitle, identity: areaIdentity(run.areaId, courseId), nodes: [] };
    stop.guestMark=areaMarks.get(run.areaId);
    run.raw.forEach((raw, i) => {
      const progress = progressByNode.get(raw.id) ?? null;
      const { state: progressState, unrecognized } = deriveNodeState(progress);
      const proficiency = input.proficiency?.skills?.[raw.id] ?? null;
      const complete = raw.pathwayComplete ?? (input.guest && proficiency ? proficiency.goalMet : countsAsComplete(progressState, progress));
      const state = complete && (input.guest || raw.pathwayComplete === true) && progressState !== 'mastered'
        ? 'requirements-met' : progressState;
      const requirementsConfigured = Boolean(progress?.requirements);
      // The engine's progress object already folds the class checkpoint's `required` flag in. Without one (the zero-setup pathway)
      // the host can pass `required: { [nodeId]: false }` from its checkpoints so optional skills still read as optional.
      const required = progress?.required ?? (input.required?.[raw.id] !== false);
      const links = practiceLinks(raw, { mixedActivities,guest:input.guest });
      const target = dated ? targetFor(pacingIn.targets?.[raw.id], complete, today) : null;
      const attempted = progress?.attempt?.attempted ?? 0;
      const started = complete || state === 'in-progress' || state === 'review' || attempted > 0 || (progress?.lifetime?.questionsAnswered ?? 0) > 0;
      const view = {
        id: raw.id, title: raw.title, objective: raw.objective ?? '', curriculumRefs: raw.standardRefs ?? [], areaId: raw.areaId, stopId: id, order: i + 1, orderOf: run.raw.length, courseIndex: ordered.indexOf(raw),
        state, unrecognized, classParticipation:Boolean(input.pathwayCompletion), optional: !required, required, complete, started, requirementsConfigured, practiceOnly: !requirementsConfigured,
        proficiency,
        teacherAssessmentRequired:raw.teacherAssessmentRequired, guest:raw.guest,practiceGoal:raw.practiceGoal,verifiedAward:raw.verifiedAward||(progress?.verification==='verified'&&Boolean(progress.award?.id)),
        earlierVerifiedAward:raw.earlierVerifiedAward,standardsScore:raw.standardsScore??progress?.standards?.score,
        demonstrationType:raw.demonstrationType,
        ring: ringFor(state, progress), progress, attempts: attempts[raw.id] ?? [], practice: links.links, mixed: links.mixed,
        prerequisites: (raw.prerequisites ?? []).map((pid) => ({ id: pid, title: prereqTitle.get(pid) ?? pid })),
        target, example: progress?.policy?.exampleOnly === true, verified: progress?.verification === 'verified', suggested: false,
      };
      view.skillTarget = skillTarget(view, input);
      if (view.skillTarget && !complete) view.ring = { kind: 'target', fraction: view.skillTarget.fraction };
      stop.nodes.push(view); flat.push(view);
    });
    const mixedFrom = stop.nodes.find((n) => n.mixed)?.mixed ?? null;
    stop.mixed = mixedFrom;
    stop.summary = summarizeStop(stop, parts === 1 ? areaContracts.get(run.areaId) : null, Boolean(input.pathwayCompletion));
    return stop;
  });

  flat.sort((a,b)=>a.courseIndex-b.courseIndex);
  // Pacing overlay. In the default undated pathway nothing about dates reaches the model.
  const currentStop = dated && pacingIn.currentAreaId
    ? (stops.find((s) => s.areaId === pacingIn.currentAreaId && !s.summary.complete) ?? stops.find((s) => s.areaId === pacingIn.currentAreaId) ?? null) : null;
  const candidates = flat.filter(isCandidate);
  const canAdvance = node => node.required && !node.complete && (node.teacherAssessmentRequired ||
    (node.practice.length && (node.requirementsConfigured || node.proficiency?.goal || !node.started)));
  const recommended = (nodes, guidance) => nodes.find(node=>node.id===guidance?.primary?.nodeId && canAdvance(node));
  const next = input.pathwayCompletion
    ? pickNext(flat.filter(canAdvance), { preferStopId: currentStop?.id ?? null, dated })
    : recommended(flat, input.proficiency?.recommendation) ?? pickNext(candidates, { preferStopId: currentStop?.id ?? null, dated });
  if (next) next.suggested = true;
  for (const stop of stops) {
    const inStop = input.pathwayCompletion
      ? pickNext(stop.nodes.filter(canAdvance), { dated })
      : recommended(stop.nodes, input.proficiency?.byArea[stop.areaId]) ?? pickNext(stop.nodes.filter(isCandidate), { dated });
    stop.suggestedNodeId = inStop?.id ?? null;
  }
  const upcoming = dated ? flat.filter((n) => n.target && !n.complete).sort((a, b) => a.target.date.localeCompare(b.target.date)) : [];
  const required = flat.filter((n) => n.required);
  const nodeIndex = Object.fromEntries(flat.map((n) => [n.id, n]));
  return {
    schema: MODEL_SCHEMA, courseId, courseTitle: course.title, classTitle:input.classTitle, enrolled:input.enrolled===true,guest:input.guest===true, warnings,
    mode: flat.some((n) => n.requirementsConfigured) ? 'requirements' : 'practice',
    pacing: { mode: dated ? 'dated' : 'undated', showDates: dated, today: dated ? today : null, note: dated ? (pacingIn.note ?? null) : null, currentStopId: currentStop?.id ?? null,
      upcoming: upcoming.slice(0, 5).map((n) => n.id), reviewIds: flat.filter((n) => n.state === 'review').map((n) => n.id) },
    stops, nodes: flat, nodeIndex, proficiency:input.proficiency,pathwayCompletion:input.pathwayCompletion, suggestedNext: next ? { nodeId: next.id, stopId: next.stopId } : null,
    totals: { stops: stops.length, skills: flat.length, withRequirements: required.filter((n) => n.requirementsConfigured).length, completeWithRequirements: required.filter((n) => n.requirementsConfigured && n.complete).length,
      practiceOnly: required.filter((n) => !n.requirementsConfigured).length, required: required.length, optional: flat.length - required.length, complete: required.filter((n) => n.complete).length,
      started: flat.filter((n) => n.started).length, stopsComplete: stops.filter((s) => s.summary.complete).length, stopsStarted: stops.filter((s) => s.summary.status !== 'not-started').length },
  };
}
export const findNode = (model, id) => model.nodeIndex[id] ?? null;
export const findStop = (model, id) => model.stops.find((s) => s.id === String(id).replace(/~\d+$/, '')) ?? null;
