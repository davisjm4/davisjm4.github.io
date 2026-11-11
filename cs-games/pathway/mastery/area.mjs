// Learning-area completion from the required nodes of an area. Optional nodes never block it.
// Area completion is its own dimension: it says nothing about standards scores (0-4), pacing, or whether results are verified.
export const AREA_SCHEMA = 'cs-games.mastery-area-progress/1';
const started = new Set(['in-progress', 'requirements-met', 'review-recommended']);

/**
 * `nodes` are nodeProgress().progress objects for one area. A node that earned its requirements under an earlier policy version
 * (review-recommended) still counts as complete unless `reviewCountsAsComplete` is false, because earned mastery is never silently erased.
 */
export function areaProgress({ area, nodes, reviewCountsAsComplete = true }) {
  const done = (n) => n.status === 'requirements-met' || (reviewCountsAsComplete && n.status === 'review-recommended' && n.lastCompletedAttempt !== null);
  const req = nodes.filter((n) => n.required), opt = nodes.filter((n) => !n.required);
  const completed = req.filter(done);
  const provisional = req.filter((n) => n.status === 'provisional');
  const remaining = req.filter((n) => !done(n));
  const inProgress = req.filter((n) => n.status === 'in-progress');
  const anyStarted = nodes.some((n) => started.has(n.status) || (n.attempt?.attempted ?? 0) > 0);
  const total = req.length;
  const status = total === 0 ? 'no-required-skills' : completed.length === total ? 'complete' : anyStarted ? 'in-progress' : provisional.length === total ? 'provisional' : 'not-started';
  return {
    schema: AREA_SCHEMA, areaId: area.id, title: area.title, status,
    requiredTotal: total, requiredCompleted: completed.length, requiredInProgress: inProgress.length,
    requiredNotStarted: req.filter((n) => n.status === 'not-started').length, requiredProvisional: provisional.length,
    reviewRecommended: req.filter((n) => n.status === 'review-recommended').length,
    optionalTotal: opt.length, optionalCompleted: opt.filter(done).length,
    label: total ? `${completed.length} of ${total} skills complete` : 'No required skills',
    // qualified: every required node met its practice requirements (provisional evidence allowed).
    // verified: every required node also holds an official award. These are different claims.
    qualified: total > 0 && completed.length === total,
    verified: total > 0 && req.every((n) => done(n) && n.verification === 'verified'),
    completedNodeIds: completed.map((n) => n.nodeId), remainingNodeIds: remaining.map((n) => n.nodeId),
    needsConfiguration: provisional.map((n) => n.nodeId),
  };
}
