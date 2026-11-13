// Read the authenticated student pathway. Cached responses from older Workers
// still supply their existing counts and explanations.
import {courseNames} from '../practice-links.mjs';

const REASONS = [[/can.t be met/i, 'requirements-cannot-be-met'], [/can.t be checked yet/i, 'families-cannot-be-verified']];
const mapReason = (challenge) => {
  if (challenge.practiceAvailability) return 'requirements-cannot-be-met';   // "open for practice, answers cannot be counted for this requirement yet"
  const text = challenge.explanation?.headline ?? '';
  return REASONS.find(([re]) => re.test(text))?.[1] ?? 'policy-not-approved';
};

/** @returns {object} a progress object in the shape the map reads (cs-games.mastery-progress/1, partial) */
export function progressFromMasteryChallenge(challenge, node) {
  const req = challenge.requirement, prog = challenge.progress, rem = challenge.remaining, configured = req?.minimumQuestions != null;
  const history = challenge.history ?? [];
  const metBefore = [...history].reverse().find((a) => a.status === 'requirements-met');
  const restarts = history.filter((a) => a.status === 'restarted').length;
  const progress = {
    schema: 'cs-games.mastery-progress/1', adaptedFrom: 'student-requirement-view', nodeId: node.id, areaId: node.areaId, title: node.title ?? challenge.title,
    required: node.checkpoint?.required !== false,
    // When the service says answers cannot be counted toward this requirement, the counts below would mislead, so it reads as "can't be checked yet".
    status: challenge.practiceAvailability ? 'provisional' : challenge.status, statusReason: challenge.practiceAvailability || challenge.status === 'provisional' ? mapReason(challenge) : null,
    // The view says only whether a milestone note applies, not whether an award exists, so the adapter never reports an award.
    verification: 'provisional', award: null, policy: { exampleOnly: challenge.example === true },
    requirements: configured ? { minimumQuestions: req.minimumQuestions, requiredAccuracyPercent: req.accuracyPercent, minimumCorrect: req.minimumCorrect ?? null } : null,
    attempt: prog ? { id: challenge.activeAttemptId ?? null, seq: challenge.historyCount != null ? challenge.historyCount + 1 : null, attempted: prog.answered, correct: prog.correct, accuracyPercent: prog.accuracyPercent } : null,
    remaining: rem ? { questions: rem.questions } : null,
    recovery: rem ? { remainingQuestions: rem.questions, accuracyMet: Boolean(prog?.accuracyMet), additionalCorrectForAccuracy: rem.correctInARowForAccuracy ?? null,
      accuracyUnrecoverableInAttempt: rem.correctInARowForAccuracy === null, lowerBoundOnly: Boolean(rem.accuracyOnlyLowerBound), otherRequirementsOutstanding: rem.accuracyOnlyLowerBound ? ['other requirements'] : [] } : null,
    missing: null, requirementChecks: [],
    lastCompletedAttempt: metBefore ? { seq: metBefore.number, closedAt: null } : null,
    lifetime: node.practiceProgress ? { questionsAnswered: node.practiceProgress.attempted, firstTryCorrect: node.practiceProgress.correct, attempts: (challenge.historyCount ?? history.length) + (challenge.activeAttemptId ? 1 : 0), restarts } : undefined,
    reassessment: challenge.reassessment ?? null, standards: { score: challenge.standardsScore ?? null },
    explanation: challenge.explanation ?? { headline: '', lines: [], text: '' },
  };
  Object.assign(progress, challenge.mapProgress);
  if(challenge.practiceAvailability){
    progress.status='provisional';
    progress.statusReason='requirements-cannot-be-met';
  }
  return progress;
}
/** Practice-only progress for a skill that has no requirement: counts only. Accuracy is not supplied, so none is shown. */
export function progressFromPractice(practice, node) {
  const a = practice?.attempted ?? 0;
  return { schema: 'cs-games.mastery-progress/1', adaptedFrom: 'practice-progress', nodeId: node.id, areaId: node.areaId, title: node.title, required: node.checkpoint?.required !== false,
    status: 'provisional', statusReason: 'policy-not-approved', verification: 'provisional', award: null, policy: { exampleOnly: false }, requirements: null,
    attempt: { id: null, seq: null, attempted: a, correct: practice?.correct ?? 0, accuracyPercent: null }, remaining: null, recovery: null, missing: null, requirementChecks: [], lastCompletedAttempt: null,
    lifetime: { questionsAnswered: a, firstTryCorrect: practice?.correct ?? 0, attempts: 0, restarts: 0 }, reassessment: null, standards: { score: null },
    explanation: { headline: '', lines: [], text: '' } };
}
/** The live history is closed attempts only, newest last: { number, status, answered, correct, accuracy }. */
export const attemptsFromChallenge = (challenge) => (challenge.history ?? []).map((a) => ({ seq: a.number, status: a.status, closed: true, closedAt:a.closedAt, attempted: a.answered, correct: a.correct, accuracyPercent: a.accuracy }));

/**
 * @param contract the result of studentContract(...), called with options.mastery and options.practice when the service has them
 * @param {{courseTitle:string, today:string, currentAreaId?:string|null}} o `today` is a date-only string in the class time zone
 */
export function inputFromStudentContract(contract, {
  courseTitle=courseNames[contract.courseId],today=contract.calculatedAt,mixedActivities
}={}) {
  const nodes = contract.nodes, courseId = contract.courseId ?? nodes[0]?.courseId;
  const targets = {}, required = {}, progressNodes = [], attempts = {};
  for (const n of nodes) {
    required[n.id] = n.checkpoint?.required !== false;
    if (n.checkpoint?.targetDate) targets[n.id] = { targetDate: n.checkpoint.targetDate };
    if (n.masteryChallenge) {
      const progress=progressFromMasteryChallenge(n.masteryChallenge,n);
      progress.historyCount=n.masteryChallenge.historyCount;
      progressNodes.push(progress);
      const history=attemptsFromChallenge(n.masteryChallenge);
      if(history.length)attempts[n.id]=history;
    } else if ((n.practiceProgress?.attempted ?? 0) > 0) progressNodes.push(progressFromPractice(n.practiceProgress, n));
  }
  const areas = contract.areas.filter((a) => a.practiceRequirements).map((a) => ({ areaId: a.id, requiredTotal: a.practiceRequirements.requiredTotal, requiredCompleted: a.practiceRequirements.requiredCompleted }));
  // The service strips private target dates before creating this contract.
  const dated = Object.keys(targets).length > 0;
  const currentAreaId=contract.sessions?.find(session=>session.date===today&&session.allocations?.length)?.allocations[0].areaId??null;
  return {
    graph: {
      courses:[{id:courseId,title:courseTitle}],
      areas:contract.areas,
      nodes:nodes.map(n=>({
        id:n.id,courseId:n.courseId,areaId:n.areaId,title:n.title,objective:n.objective,
        familySelectors:n.familySelectors,standardRefs:n.standardRefs,practice:n.checkpoint.practice,
        prerequisites:n.checkpoint.prerequisites,practiceGoal:n.practiceGoal,
        guest:n.guest,verifiedAward:Boolean(n.checkpoint.award),earlierVerifiedAward:n.earlierVerifiedAward===true,
        standardsScore:n.checkpoint.score,demonstrationType:n.checkpoint.demonstrationType
      }))
    },
    courseId,classId:contract.guest?null:contract.classId,classTitle:contract.title,enrolled:Boolean(contract.classId)&&!contract.guest,guest:contract.guest?.source==='independent',sequence:nodes.map(n=>n.id),required,progress:{nodes:progressNodes,areas},attempts,mixedActivities,
    proficiency:contract.proficiency,
    pacing:{mode:dated?'dated':'undated',today,currentAreaId,targets}
  };
}
