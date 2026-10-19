/* Workplace Readiness Games - grading.
 * One scored attempt per challenge. grade() is pure: same challenge + response => same result.
 *
 * Responses:
 *   decision / nextstep : { optionId }
 *   order               : { order: [stepId, ...] }
 *   find                : { segmentId }
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var order = isNode ? require('./order.js') : root.WRG.order;
  var feedback = isNode ? require('./feedback.js') : root.WRG.feedback;
  var api = factory(order, feedback);
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.grader = api; }
}(typeof self !== 'undefined' ? self : this, function (order, feedback) {
  'use strict';

  function invalid(reason) { return { ok: false, error: reason }; }

  function grade(challenge, response) {
    var r;
    if (!challenge || !challenge.key) return invalid('Challenge has no answer key');
    if (!response || typeof response !== 'object') return invalid('Missing response');

    if (challenge.mode === 'decision' || challenge.mode === 'nextstep') {
      var opts = challenge.key.options;
      if (typeof response.optionId !== 'string' || !opts[response.optionId]) return invalid('Unknown option');
      r = {
        ok: true, mode: challenge.mode, selectedId: response.optionId, bestId: challenge.key.bestId,
        correct: response.optionId === challenge.key.bestId,
        selectedRole: opts[response.optionId].role
      };
    } else if (challenge.mode === 'order') {
      var ids = challenge.steps.map(function (s) { return s.id; });
      if (!order.isPermutationOf(response.order, ids)) return invalid('Response must place every step exactly once');
      var viol = order.violations(response.order, challenge.key.precedence);
      r = {
        ok: true, mode: 'order', correct: viol.length === 0, violations: viol,
        satisfied: order.satisfiedFraction(response.order, challenge.key.precedence),
        differsFromExample: response.order.join('|') !== challenge.key.example.join('|'),
        submittedOrder: response.order.slice()
      };
    } else if (challenge.mode === 'find') {
      var segs = challenge.key.segments;
      if (typeof response.segmentId !== 'string' || !segs[response.segmentId]) return invalid('Unknown segment');
      r = {
        ok: true, mode: 'find', selectedId: response.segmentId, problemId: challenge.key.problemId,
        correct: response.segmentId === challenge.key.problemId
      };
    } else {
      return invalid('Unsupported mode ' + challenge.mode);
    }
    r.feedback = feedback.compose(challenge, r);
    return r;
  }

  /* A response that grades as correct (used by tests and by the UI "completable" checks). */
  function solve(challenge) {
    if (challenge.mode === 'decision' || challenge.mode === 'nextstep') return { optionId: challenge.key.bestId };
    if (challenge.mode === 'order') return { order: challenge.key.example.slice() };
    return { segmentId: challenge.key.problemId };
  }

  /* Every distinct incorrect response for a challenge (used by tests). */
  function wrongResponses(challenge) {
    if (challenge.mode === 'decision' || challenge.mode === 'nextstep') {
      return Object.keys(challenge.key.options).filter(function (id) { return id !== challenge.key.bestId; })
        .map(function (id) { return { optionId: id }; });
    }
    if (challenge.mode === 'find') {
      return Object.keys(challenge.key.segments).filter(function (id) { return id !== challenge.key.problemId; })
        .map(function (id) { return { segmentId: id }; });
    }
    var ids = challenge.steps.map(function (s) { return s.id; });
    return order.permutations(ids).filter(function (p) {
      return order.violations(p, challenge.key.precedence).length > 0;
    }).map(function (p) { return { order: p }; });
  }

  return { grade: grade, solve: solve, wrongResponses: wrongResponses };
}));
