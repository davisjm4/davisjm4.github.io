/* Mode 2: Rearrange the Response. Semantic grading: roles and relationships, never one rigid sequence. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'), require('./structure.js'), require('./feedback.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.Rearrange = factory(root.RACECES.Model, root.RACECES.Structure, root.RACECES.Feedback); }
})(typeof self !== 'undefined' ? self : this, function (Model, Structure, Feedback) {
  'use strict';

  /* Evaluate an arrangement of slot ids against the RACECES rules.
     Rules enforced:
       1. Restate is first.            2. Answer is second.
       3. Summary is last.             4. Positions 3-4 and 5-6 are each (Cite Evidence, Explain Evidence)
                                          where the explanation belongs to that exact evidence.
     The two evidence/explanation pairs may appear in either order. */
  function analyze(order, info) {
    var i, seen = {};
    if (!Array.isArray(order) || order.length !== 7) return { valid: false, issues: [{ code: 'incomplete' }], primary: { code: 'incomplete' } };
    for (i = 0; i < 7; i++) {
      if (!info[order[i]] || seen[order[i]]) return { valid: false, issues: [{ code: 'incomplete' }], primary: { code: 'incomplete' } };
      seen[order[i]] = true;
    }
    function roleAt(k) { return info[order[k]].role; }
    var issues = [];
    if (roleAt(0) !== 'R') issues.push({ code: 'restate-first', found: roleAt(0) });
    if (roleAt(1) !== 'A') issues.push({ code: 'answer-second', found: roleAt(1) });
    if (roleAt(6) !== 'S') issues.push({ code: 'summary-last', found: roleAt(6) });
    [2, 4].forEach(function (start) {
      var a = info[order[start]], b = info[order[start + 1]];
      var ok = a.role === 'C' && b.role === 'E' && a.pair === b.pair;
      if (!ok) issues.push({ code: 'pairing', start: start, first: a, second: b });
    });
    // If a dependency is declared in the challenge metadata, it is enforced by the caller (none are authored).
    return { valid: issues.length === 0, issues: issues, primary: issues[0] || null };
  }

  function fixedPoints(order, canon) {
    var n = 0;
    for (var i = 0; i < canon.length; i++) if (order[i] === canon[i]) n++;
    return n;
  }
  function adjacentPairs(order, info) {
    var n = 0;
    for (var i = 0; i < 6; i++) {
      var a = info[order[i]], b = info[order[i + 1]];
      if (a.role === 'C' && b.role === 'E' && a.pair === b.pair) n++;
    }
    return n;
  }

  function startingOrder(info, rng) {
    var canons = Structure.canonicalOrders();
    var tries = 0, cand;
    while (tries++ < 500) {
      cand = rng.shuffle(Structure.SLOTS);
      if (analyze(cand, info).valid) continue;
      if (fixedPoints(cand, canons[0]) > 2 || fixedPoints(cand, canons[1]) > 2) continue;
      if (adjacentPairs(cand, info) > 1) continue;
      return cand;
    }
    return ['S', 'E2', 'A', 'C1', 'R', 'E1', 'C2']; // deterministic fallback (verified unsolved)
  }

  function generate(resp, rng, opts) {
    opts = opts || {};
    var ch = Model.baseChallenge(resp, 'rearrange');
    var order = startingOrder(ch.info, rng);
    ch.prompt = 'Put the seven sentences in order to build a complete response.';
    ch.items = order.map(function (s) { return { id: s, text: resp.sentences[s].text }; });
    ch.defaultPairOrder = [1, 2];
    ch.solution = { order: Model.orderFor([1, 2]), alternate: Model.orderFor([2, 1]) };
    ch.signature = 'rearrange|' + resp.modelId;
    ch.role = null;
    return ch;
  }

  function grade(ch, answer) {
    var order = (answer && answer.order) || [];
    var analysis = analyze(order, ch.info);
    var fb = Feedback.rearrange(ch, order, analysis);
    return { correct: analysis.valid, feedback: fb, role: fb.role || null, category: fb.category, analysis: analysis };
  }

  return { analyze: analyze, generate: generate, grade: grade, startingOrder: startingOrder };
});
