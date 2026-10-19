/* Mode 3: Choose the Missing Piece. Four plausible options, one defensible best answer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'), require('./structure.js'), require('./feedback.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.Missing = factory(root.RACECES.Model, root.RACECES.Structure, root.RACECES.Feedback); }
})(typeof self !== 'undefined' ? self : this, function (Model, Structure, Feedback) {
  'use strict';

  var SLOT_KEYS = ['R', 'A', 'C1', 'C2', 'E1', 'E2', 'S'];

  // Build the candidate distractor pool for a missing role. `keep` marks the misconception each
  // role is meant to test; those candidates are always included.
  function candidatePool(resp, role, pair) {
    var d = resp.distractors;
    var P = {
      rep: { text: null, kind: 'repeat', plays: 'C' },
      offExp: { text: d.offExp, kind: 'offExp', plays: 'E' },
      offFact: { text: d.offEv, kind: 'offFact', plays: 'C' },
      bad: { text: d.bad, kind: 'unsupported', plays: 'A' },
      sumNew: { text: d.sumNew, kind: 'summaryLike', plays: 'S' },
      badRestate: { text: d.badRestate, kind: 'wrongFocus', plays: 'R' }
    };
    if (pair) P.rep.text = d.rep[pair - 1];
    var out;
    if (role === 'R') out = [P.badRestate, P.bad, P.offFact, P.sumNew];
    else if (role === 'A') out = [Object.assign({ keep: true }, P.bad), P.badRestate, P.offFact, P.sumNew];
    else if (role === 'C') out = [Object.assign({ keep: true }, P.offFact), P.bad, P.offExp, P.sumNew];
    else if (role === 'E') out = [Object.assign({ keep: true }, P.rep), P.offExp, P.bad, P.sumNew];
    else out = [Object.assign({ keep: true }, P.sumNew), P.bad, P.offFact, P.offExp];
    return out;
  }

  function whyCorrect(role, tag) {
    switch (role) {
      case 'R': return 'The best choice restates the question as a statement of the topic, which sets up the answer that comes next.';
      case 'A': return 'The best choice makes the claim that answers the question, and the evidence that follows supports it.';
      case 'C': return 'The best choice presents the source\'s information about ' + tag + ', which is exactly what the explanation after the gap discusses.';
      case 'E': return 'The best choice says why the information about ' + tag + ' supports the answer, instead of only repeating it.';
      default: return 'The best choice reinforces the overall answer without adding new information.';
    }
  }

  function generate(resp, rng, opts) {
    opts = opts || {};
    var slot = opts.slot || rng.pick(SLOT_KEYS);
    var role = Structure.roleOfSlot(slot);
    var pair = Structure.pairOfSlot(slot);
    var pairOrder = opts.pairOrder || (rng.chance(0.5) ? [1, 2] : [2, 1]);
    var order = Model.orderFor(pairOrder);
    var correctText = resp.sentences[slot].text;
    var tag = pair ? resp.pairs[pair].tag : null;

    var pool = candidatePool(resp, role, pair);
    var optional = pool.filter(function (p) { return !p.keep; });
    // Length-balance steering: draw a target length rank for the correct option (0 = longest) and omit
    // the optional distractor that brings the correct sentence closest to that rank. This removes
    // "longest answer is right (or wrong)" shortcuts without changing which misconceptions are tested.
    var targetRank = rng.int(4);
    var correctLen = correctText.length;
    function chosenFor(om) { return pool.filter(function (p) { return p !== om; }); }
    function rankWith(om) {
      return chosenFor(om).filter(function (c) { return c.text.length > correctLen; }).length;
    }
    var order0 = rng.shuffle(optional), omit = order0[0], bestGap = Infinity;
    order0.forEach(function (om) {
      var gap = Math.abs(rankWith(om) - targetRank);
      if (gap < bestGap) { bestGap = gap; omit = om; }
    });
    var chosen = chosenFor(omit);

    var opts4 = chosen.map(function (c) { return { text: c.text, kind: c.kind, plays: c.plays, correct: false }; });
    opts4.push({ text: correctText, kind: 'correct', plays: role, correct: true });
    opts4 = rng.shuffle(opts4).map(function (o, i) { o.id = 'o' + (i + 1); return o; });

    var ch = Model.baseChallenge(resp, 'missing');
    ch.missingSlot = slot;
    ch.missingRole = role;
    ch.missingPair = pair;
    ch.missingTag = tag;
    ch.pairOrder = pairOrder;
    ch.shown = order.map(function (s) {
      return s === slot ? { id: s, gap: true } : { id: s, text: resp.sentences[s].text };
    });
    ch.options = opts4.map(function (o) { return { id: o.id, text: o.text, kind: o.kind, plays: o.plays }; });
    ch.correctId = opts4.filter(function (o) { return o.correct; })[0].id;
    ch.roleHint = resp.level === 'beginner' ? Structure.LABEL[role] : null;
    ch.prompt = resp.level === 'beginner'
      ? 'One sentence is missing. It needs to do the job of ' + Structure.LABEL[role] + '. Which sentence fits best?'
      : 'One sentence is missing. Which sentence best completes the response?';
    ch.whyCorrect = whyCorrect(role, tag);
    ch.signature = 'missing|' + resp.modelId + '|' + slot;
    ch.role = role;
    return ch;
  }

  function grade(ch, answer) {
    var fb = Feedback.missing(ch, answer && answer.optionId);
    return { correct: fb.correct, feedback: fb, role: ch.missingRole, category: fb.category };
  }

  return { SLOT_KEYS: SLOT_KEYS, generate: generate, grade: grade, candidatePool: candidatePool };
});
