/* CSG-PKG-08: independent course proficiency, published class practice targets, and
 * official teacher-reviewed scores remain separate. Pure module; no live reads or writes. */
import { evaluateProficiency, PROFICIENCY_SCHEMA, PROFICIENCY_VERSION } from './index.mjs';

export const OUTCOMES_SCHEMA = 'cs-games.independent-outcomes/1';
export const LEVEL_HISTORY_SCHEMA = 'cs-games.formative-level-history/1';
export const EVALUATORS = Object.freeze({ legacy: 'legacy-coupled', course: 'course-rubric' });
const withoutTarget = (node) => { const { masteryChallenge, ...rest } = node; return rest; };

export function evaluateCourseProficiency({ courseId, nodes, eventsByNode = new Map(), familiarity, pacingTargets, skipFamiliar }) {
  const result = evaluateProficiency({ courseId, nodes: nodes.map(withoutTarget), eventsByNode, policies: [], familiarity, pacingTargets, skipFamiliar });
  return { ...result, basis: { evaluator: EVALUATORS.course, schema: PROFICIENCY_SCHEMA, rubricVersion: PROFICIENCY_VERSION, policy: null } };
}

export function evaluateLegacyProficiency(input) {
  const result = evaluateProficiency(input);
  return { ...result, basis: { evaluator: EVALUATORS.legacy, schema: PROFICIENCY_SCHEMA, rubricVersion: PROFICIENCY_VERSION } };
}

const officialOf = (node, assessments) => {
  const record = assessments?.get?.(node.id) ?? null;
  if (record) return { state: 'recorded', score: record.score, recordId: record.id ?? null, recordedAt: record.recordedAt ?? null, evidence: record.evidence ?? null, policyContext: record.policyContext ?? null };
  const score = node.checkpoint?.score;
  return Number.isFinite(score) ? { state: 'recorded', score, recordId: null, recordedAt: null, evidence: null, policyContext: null } : { state: 'none', score: null };
};
const targetOf = (progress) => !progress ? { state: 'not-configured' } : {
  state: progress.policy.configured ? 'configured' : 'not-configured', status: progress.status, policy: { id: progress.policy.id, version: progress.policy.version },
  attempt: progress.attempt ? { attempted: progress.attempt.attempted, correct: progress.attempt.correct } : null,
  earnedUnder: progress.lastCompletedAttempt?.policy ?? progress.reassessment?.earnedUnder ?? null,
};

/* Compute independently without replacing the live formative result. */
export function compareOutcomes({ courseId, nodes, eventsByNode = new Map(), policies = [], targetProgress = new Map(), assessments = new Map(), levelHistory = null }) {
  const legacy = evaluateLegacyProficiency({ courseId, nodes, eventsByNode, policies });
  const course = evaluateCourseProficiency({ courseId, nodes, eventsByNode });
  const rows = nodes.map((node) => {
    const l = legacy.skills[node.id], c = course.skills[node.id];
    const historical = historicalFor(levelHistory, node.id);
    return {
      nodeId: node.id,
      legacy: { level: l.level, policy: l.policy, goalMet: l.goalMet },
      course: { level: c.level, goalMet: c.goalMet, formativeAdvancementMet: c.level >= 3, basis: course.basis },
      differs: l.level !== c.level, direction: l.level === c.level ? null : l.level < c.level ? 'legacy-lower' : 'legacy-higher',
      target: targetOf(targetProgress.get(node.id)), official: officialOf(node, assessments),
      historical, progression: carriedProgression(levelHistory, node.id, c),
    };
  });
  return { schema: OUTCOMES_SCHEMA, courseId, rows, summary: { nodes: rows.length, differ: rows.filter((r) => r.differs).length,
    legacyLower: rows.filter((r) => r.direction === 'legacy-lower').length, legacyHigher: rows.filter((r) => r.direction === 'legacy-higher').length } };
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const entryKey = (e) => [e.nodeId, e.evaluator, e.rubricVersion, e.policy ? [e.policy.id, e.policy.version].join('@') : '-', e.pathwayRevision ?? '-', e.evidence?.count ?? '-', e.evidence?.lastEventId ?? '-', e.level].join('|');
export const emptyLevelHistory = (scope) => ({ schema: LEVEL_HISTORY_SCHEMA, scope: clone(scope), entries: [] });

/* Append only; never reconstruct guessed historic levels or overwrite existing records. */
export function recordLevel(history, { nodeId, skill, evaluator, policy = null, pathwayRevision = null, evidence = null, recordedAt }) {
  if (!history || history.schema !== LEVEL_HISTORY_SCHEMA) throw new Error('A level history is required.');
  if (!Object.values(EVALUATORS).includes(evaluator)) throw new Error('Unknown evaluator.');
  if (!skill || skill.nodeId !== nodeId || !Number.isInteger(skill.level)) throw new Error('A skill result for this node is required.');
  if (typeof recordedAt !== 'string') throw new Error('recordedAt is required.');
  if (evaluator === EVALUATORS.course && policy) throw new Error('A course-rubric result has no class policy context.');
  const entry = { nodeId, level: skill.level, goalMet: skill.goalMet === true, formativeAdvancementMet: skill.level >= 3, evaluator,
    schema: PROFICIENCY_SCHEMA, rubricVersion: PROFICIENCY_VERSION, policy: policy ? { id: policy.id, version: policy.version } : null,
    pathwayRevision, evidence: evidence ? { count: evidence.count, lastEventId: evidence.lastEventId ?? null } : null, recordedAt };
  if (history.entries.some((e) => entryKey(e) === entryKey(entry))) return history;
  return { ...history, entries: [...history.entries, entry] };
}
export function historicalFor(history, nodeId) {
  if (!history) return { state: 'unavailable', reason: 'no-level-history-kept', entries: [] };
  const entries = history.entries.filter((e) => e.nodeId === nodeId);
  if (!entries.length) return { state: 'unavailable', reason: 'no-recorded-result-for-this-skill', entries: [] };
  return { state: 'recorded', entries: entries.map((e) => ({ ...clone(e), provenance: e.evaluator === EVALUATORS.legacy && !e.policy && e.pathwayRevision === null ? 'incomplete' : 'complete' })) };
}
export function carriedProgression(history, nodeId, current) {
  const past = historicalFor(history, nodeId);
  const currentMet = current.level >= 3;
  if (past.state === 'unavailable') return { earned: currentMet, source: currentMet ? 'current' : null, carriedForward: false, historical: 'unavailable', earnedUnder: null, currentLevel: current.level };
  const best = past.entries.filter((e) => e.formativeAdvancementMet).sort((a, b) => a.recordedAt < b.recordedAt ? -1 : 1)[0] ?? null;
  const carriedForward = Boolean(best) && !currentMet;
  return { earned: currentMet || Boolean(best), source: currentMet ? 'current' : best ? 'historical' : null, carriedForward, historical: 'recorded', currentLevel: current.level,
    earnedUnder: best ? { evaluator: best.evaluator, rubricVersion: best.rubricVersion, policy: best.policy, pathwayRevision: best.pathwayRevision, recordedAt: best.recordedAt, level: best.level } : null };
}
