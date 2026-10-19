/* RACECES structure constants, labels, principles, and shared helpers. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.RACECES = root.RACECES || {}; root.RACECES.Structure = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Internal slot identifiers. Students only ever see the letters R, A, C, E, S.
  var SLOTS = ['R', 'A', 'C1', 'E1', 'C2', 'E2', 'S'];
  var ROLES = ['R', 'A', 'C', 'E', 'S'];

  var LABEL = {
    R: 'Restate', A: 'Answer', C: 'Cite Evidence', E: 'Explain Evidence', S: 'Summarize'
  };

  var PURPOSE = {
    R: 'Restate turns the writing question into a statement of the topic. It sets up the response without giving the answer yet.',
    A: 'Answer makes a clear claim that responds to the question. Everything after it should support that claim.',
    C: 'Cite Evidence presents specific information from the source that supports the answer. It says what the source reports.',
    E: 'Explain Evidence says how or why the evidence supports the answer. It interprets the evidence instead of repeating it.',
    S: 'Summarize closes the response by reinforcing the overall answer. It should not bring in new information.'
  };

  function roleOfSlot(slot) { return slot.charAt(0); }
  function pairOfSlot(slot) { return slot.length > 1 ? Number(slot.charAt(1)) : null; }

  // The two valid canonical orders. Pairs may appear in either order.
  function canonicalOrders() {
    return [
      ['R', 'A', 'C1', 'E1', 'C2', 'E2', 'S'],
      ['R', 'A', 'C2', 'E2', 'C1', 'E1', 'S']
    ];
  }

  // Confusion categories used for session tracking.
  function confusionCategory(targetRole, actualRole) {
    if (!targetRole || !actualRole || targetRole === actualRole) return null;
    var pair = [targetRole, actualRole].sort().join('');
    if (pair === 'CE') return 'evidence-vs-explanation';
    if (pair === 'AR') return 'restate-vs-answer';
    if (pair === 'CS') return 'summary-vs-evidence';
    if (pair === 'AS') return 'answer-vs-summary';
    return 'other';
  }

  var CATEGORY_LABEL = {
    'evidence-vs-explanation': 'Evidence vs. explanation',
    'restate-vs-answer': 'Restatement vs. answer',
    'summary-vs-evidence': 'Summary vs. new evidence',
    'answer-vs-summary': 'Answer vs. summary',
    'wrong-pair': 'Matching explanations to evidence',
    'relevance': 'Choosing relevant, supported information',
    'other': 'Other structure errors'
  };

  var MODES = ['identify', 'rearrange', 'missing'];
  var MODE_LABEL = {
    identify: 'Identify the Parts',
    rearrange: 'Rearrange the Response',
    missing: 'Choose the Missing Piece',
    mixed: 'Mixed Practice'
  };
  var LEVELS = ['beginner', 'intermediate', 'advanced'];
  var LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  return {
    SLOTS: SLOTS, ROLES: ROLES, LABEL: LABEL, PURPOSE: PURPOSE,
    roleOfSlot: roleOfSlot, pairOfSlot: pairOfSlot, canonicalOrders: canonicalOrders,
    confusionCategory: confusionCategory, CATEGORY_LABEL: CATEGORY_LABEL,
    MODES: MODES, MODE_LABEL: MODE_LABEL, LEVELS: LEVELS, LEVEL_LABEL: LEVEL_LABEL
  };
});
