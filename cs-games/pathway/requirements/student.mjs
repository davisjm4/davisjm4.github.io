// What a student sees, and the preview a teacher sees of it. Both come from the mastery engine's own progress object (nodeProgress):
// nothing here recalculates accuracy, thresholds or recovery, so a teacher's preview and a student's screen cannot disagree.
// The view carries no identifiers: no node, policy or attempt ids, only titles, numbers and sentences.
import { emptyHistory } from '../mastery/attempts.mjs';
import { nodeProgress } from '../mastery/progress.mjs';
import { normalizeEvents } from '../mastery/events.mjs';
import { validateMasteryPolicy } from '../mastery/policy.mjs';
import { formatPercent, minCorrectFor, toBasisPoints } from '../mastery/arithmetic.mjs';
import { answer } from '../mastery/synthetic.mjs';
import { buildPolicy } from './policies.mjs';

export const STUDENT_VIEW_SCHEMA = 'cs-games.student-requirement-view/1';
export const STATUS_LABELS = Object.freeze({
  'not-started': 'Not started', 'in-progress': 'In progress', 'requirements-met': 'Requirements met', 'review-recommended': 'Review recommended', provisional: 'Waiting for your teacher',
});
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** Map the engine's progress object to what is shown. `progress` is the `progress` field returned by nodeProgress(). */
export function studentRequirementView(progress) {
  const p = progress, req = p.requirements, att = p.attempt, rec = p.recovery;
  const configured = Boolean(req);
  const view = {
    schema: STUDENT_VIEW_SCHEMA, title: p.title, status: p.status, statusLabel: STATUS_LABELS[p.status] ?? p.status,
    example: p.policy.exampleOnly === true,
    requirement: configured ? {
      headline: `Answer at least ${plural(req.minimumQuestions, 'question')} with at least ${formatPercent(req.requiredAccuracyPercent)} right on the first try.`,
      minimumQuestions: req.minimumQuestions, accuracyPercent: req.requiredAccuracyPercent, correctNeededAtMinimum: req.correctNeededAtMinimum, minimumCorrect: req.minimumCorrect,
      keepGoing: `You can answer more than ${req.minimumQuestions} questions to raise your accuracy.`,
      mixedNote: 'Questions from Mixed Practice count toward this skill too.',
    } : { headline: null, keepGoing: null, mixedNote: null },
    progress: configured && att ? {
      answered: att.attempted, required: req.minimumQuestions,
      answeredLabel: att.attempted > req.minimumQuestions ? `${plural(att.attempted, 'question')} (${req.minimumQuestions} required)` : `${att.attempted} of ${plural(req.minimumQuestions, 'question')}`,
      correct: att.correct, accuracyPercent: att.accuracyPercent, accuracyLabel: att.accuracyPercent === null ? 'No answers yet' : formatPercent(att.accuracyPercent),
      questionsShare: Math.min(1, att.attempted / req.minimumQuestions), accuracyMet: Boolean(rec?.accuracyMet),
    } : null,
    remaining: configured && rec ? {
      questions: rec.remainingQuestions, correctInARowForAccuracy: rec.additionalCorrectForAccuracy, accuracyOnlyLowerBound: rec.lowerBoundOnly,
      mistakesBeforeAccuracyBreaks: rec.mistakesBeforeThresholdBreaks,
    } : null,
    explanation: { headline: p.explanation.headline, lines: p.explanation.lines, text: p.explanation.text },
    milestoneNote: p.status === 'requirements-met' && p.verification !== 'verified' ? 'This is a practice milestone. It becomes official mastery only after it is verified.' : null,
    standardsNote: 'Your 0 to 4 standards score comes from your teacher\'s assessment. Practice does not change it.',
    standardsScore: p.standards.score,
    reassessment: p.reassessment ? { needed: p.reassessment.needed, reason: p.reassessment.reason } : null,
  };
  return view;
}

const TEMPLATE_NODE = { id: 'node:advanced:math-lab:division', areaId: 'area:advanced:math-lab' };
const SCOPE = { profileId: 'preview-student', classId: 'preview-class' };
const NOW = '2026-12-01T12:00:00.000Z';

/**
 * Sample student screens for a requirement, produced by running synthetic answers through the real engine. Only the question count and
 * accuracy rules (and minimum correct, and how skipped questions are handled) are simulated; topic, difficulty and variety rules are
 * not, and the preview says so.
 */
export function previewStudentStates({ effective, title, graph }) {
  if (effective.minimumQuestions == null || effective.accuracy == null) return { states: [], note: 'Set a minimum number of questions and a required accuracy to see what students will see.', simulated: [] };
  const base = buildPolicy({ level: 'skill', scopeId: 'preview', version: 1, explicit: [], effective: { ...effective, difficulties: [], subskills: [], families: { minDistinct: 0, minCorrectEach: 1 } } });
  base.id = 'preview:policy';
  const v = validateMasteryPolicy(base);
  if (!v.ok) return { states: [], note: 'This requirement is not valid yet.', simulated: [] };
  const policy = v.policy, q = effective.minimumQuestions, bp = toBasisPoints(effective.accuracy);
  const needed = Math.max(minCorrectFor(q, bp), effective.minimumCorrect ?? 0);
  const make = (count, correctCount, label) => {
    const raw = [];
    for (let i = 0; i < count; i++) raw.push(answer({ student: 'p', session: 's', n: i + 1, at: i, assessedMode: 'division', familyId: 'integer', correct: i >= count - correctCount }));
    const norm = normalizeEvents(raw, { graph, scope: SCOPE, now: NOW });
    const node = { ...TEMPLATE_NODE, title };
    const { progress } = nodeProgress({ node, policy, history: emptyHistory(SCOPE, node.id), events: norm.events, now: NOW, policies: [policy], contentProfile: null });
    return { label, answered: count, correct: correctCount, view: studentRequirementView(progress) };
  };
  const states = [make(0, 0, 'Just starting')];
  const part = Math.max(1, Math.floor(q * 0.4));
  states.push(make(part, part, `Partway there (${part} correct so far)`));
  if (needed > 1 && minCorrectFor(q, bp) >= 1) {
    const shortCorrect = Math.max(0, minCorrectFor(q, bp) - 1);
    states.push(make(q, shortCorrect, `At ${q} questions, one answer short of the accuracy goal`));
  }
  // exactly enough: the allowed misses first, then correct answers until every requirement holds
  let n = q, correct = minCorrectFor(q, bp);
  if ((effective.minimumCorrect ?? 0) > correct) { n = q + ((effective.minimumCorrect ?? 0) - correct); correct = effective.minimumCorrect; }
  states.push(make(n, correct, `Requirement just met (${correct} correct of ${n})`));
  return { states, simulated: ['question count', 'accuracy', ...(effective.minimumCorrect != null ? ['minimum correct'] : [])],
    note: (effective.difficulties?.length || effective.subskills?.length || (effective.families?.minDistinct ?? 0) > 0) ? 'These samples cover the question count and accuracy. Topic, difficulty and variety rules are shown to students only when they are working on them.' : null };
}
