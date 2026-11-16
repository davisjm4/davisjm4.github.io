import {compareOutcomes} from './independent.mjs';

/**
 * Optional read-only comparison of current (legacy-coupled) and course-only
 * formative levels. No learner, class, node or evidence identifiers leave
 * this function. Defaults off and does not touch input when disabled.
 */
export function shadowComparisonSummary(input, enabled=false) {
  if (!enabled) return null;
  const {schema,courseId,summary}=compareOutcomes(input);
  return {schema,courseId,
    nodes:summary.nodes,differ:summary.differ,
    legacyLower:summary.legacyLower,legacyHigher:summary.legacyHigher};
}
