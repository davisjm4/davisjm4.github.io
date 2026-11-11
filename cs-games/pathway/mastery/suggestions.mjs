// Suggested starting points for TEACHER REVIEW. These are not executable: validateMasteryPolicy() rejects them, no node refers to
// them, and nothing in the engine reads this file. They restate the teacher's stated preferences (about 95% for simple recognition,
// about 90% for substantial reasoning, larger counts for quick questions, smaller counts for long multistep ones). They are not
// calibrated against student data, and the audit's earlier 80% and 85% figures are deliberately NOT adopted.
export const SUGGESTION_NOTICE = 'SUGGESTION ONLY: a teacher must review, edit and publish it as a policy before it has any effect.';

export const suggestedConfigurations = Object.freeze([
  { tier: 'quick-recognition', label: 'Quick recognition', minimumQuestions: 50, accuracy: 0.95, intendedFor: 'short, single-step recognition or foundational questions', basis: 'teacher preference: larger counts for quick challenges, about 95% for simple skills' },
  { tier: 'standard-practice', label: 'Standard practice', minimumQuestions: 30, accuracy: 0.9, intendedFor: 'typical application questions', basis: 'teacher preference: about 90% for substantial reasoning; count between the two extremes (a placeholder the teacher should set)' },
  { tier: 'complex-reasoning', label: 'Complex reasoning', minimumQuestions: 20, accuracy: 0.9, intendedFor: 'long, multistep tracing or reasoning questions', basis: 'teacher preference: smaller counts for lengthy multistep questions, about 90%' },
].map((s) => Object.freeze({ ...s, executable: false, status: 'suggestion', notice: SUGGESTION_NOTICE })));

/** Which suggested tier the graph's own complexity label points to. Only two labels exist, so quick-recognition skills must be identified by the teacher. */
export const complexityToTier = Object.freeze({ 'multi-step tracing': 'complex-reasoning', application: 'standard-practice' });

/** Counts per tier and course. Informational: it assigns nothing. */
export function summarizeSuggestionCoverage(graph) {
  const out = {};
  for (const n of graph.nodes) {
    const tier = complexityToTier[n.complexity] ?? 'unclassified';
    out[n.courseId] ??= {};
    out[n.courseId][tier] = (out[n.courseId][tier] || 0) + 1;
  }
  return out;
}
