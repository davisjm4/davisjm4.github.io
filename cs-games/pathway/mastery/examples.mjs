// ILLUSTRATIVE policies for tests and the demonstration only. None is an approved requirement, none is attached to any node by
// default, and every one carries exampleOnly: true so a screen can label it. Real requirements are decided by the teacher
// (see reports/mastery-engine/TEACHER_POLICY_DECISIONS.md). Executable policies live apart from the non-executable suggestions
// in suggestions.mjs.
export const EXAMPLE_NOTICE = 'EXAMPLE ONLY: not an approved mastery requirement.';
const ex = (p) => Object.freeze({ provisional: false, coverage: {}, scoreTarget: null, exampleOnly: true, ...p, label: `${EXAMPLE_NOTICE} ${p.label}` });

/** The teacher's first illustration, applied to Variable Lab identify nodes. Variable Lab reports ONE family per identify skill, so only a one-family requirement can be met there. */
export const exampleQuickVariableIdentification = ex({
  id: 'example:quick-variable-identification', version: 1, label: 'Quick Variable Identification: 50 questions at 95%', minimumQuestions: 50, accuracy: 0.95,
  challenge: { families: { minDistinct: 1, minCorrectEach: 1 } },
});
/** A quick, foundational skill with real essential subskills and real families (Math Lab, Integer and Double Division). Used for Student A. */
export const exampleQuickRecognitionDivision = ex({
  id: 'example:quick-recognition-division', version: 1, label: 'Quick recognition: 50 questions at 95%', minimumQuestions: 50, accuracy: 0.95,
  challenge: {
    subskills: [
      { id: 'integer-division', label: 'integer division', match: { familyIds: ['division:integer', 'division:widened'] }, minExposure: 5, minCorrect: 4 },
      { id: 'double-division', label: 'double division', match: { familyIds: ['division:double-right', 'division:double-left', 'division:both-double'] }, minExposure: 5, minCorrect: 4, minAccuracy: 0.8 },
    ],
    families: { minDistinct: 3, minCorrectEach: 1 },
  },
});
/** The teacher's second illustration, on the 2D array tracing node: fewer, longer questions, a stricter reasoning-variety rule. */
const advancedArray = (version, minimumQuestions, accuracy) => ex({
  id: 'example:advanced-array-reasoning', version, label: `Advanced Array Reasoning: ${minimumQuestions} questions at ${Math.round(accuracy * 100)}%`, minimumQuestions, accuracy,
  challenge: {
    difficulties: [{ difficulty: 'advanced', minQuestions: 10, minCorrect: version === 1 ? 8 : 9 }],
    subskills: [
      { id: 'totals', label: 'row and column totals', match: { familyIds: ['row-sum', 'column-sum', 'maximum-row', 'minimum-column'] }, minExposure: 3, minCorrect: 2 },
      { id: 'conditions', label: 'conditional array logic', match: { familyIds: ['conditional-total', 'conditional-transform'] }, minExposure: 3, minCorrect: 2 },
    ],
    families: { minDistinct: 5, minCorrectEach: 1 },
  },
});
export const exampleAdvancedArrayReasoning = advancedArray(1, 20, 0.9);
/** A later, more demanding version of the same policy id (Student F). */
export const exampleAdvancedArrayReasoningV2 = advancedArray(2, 25, 0.95);
/** A small uniform policy for the seven Math Lab nodes, used to show area completion through Mixed Practice (Student D). */
export const exampleMathLabStandard = ex({ id: 'example:math-lab-standard', version: 1, label: 'Math Lab standard practice: 10 questions at 90%', minimumQuestions: 10, accuracy: 0.9 });
export const EXAMPLE_POLICIES = Object.freeze([exampleQuickVariableIdentification, exampleQuickRecognitionDivision, exampleAdvancedArrayReasoning, exampleAdvancedArrayReasoningV2, exampleMathLabStandard]);
