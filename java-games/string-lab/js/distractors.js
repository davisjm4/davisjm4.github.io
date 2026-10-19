/* String Lab — distractor construction.
 *
 * Wrong answers are produced by RE-RUNNING the same program under a named misconception
 * (one-based indexing, inclusive end index, "methods change the original", ...), so every distractor is
 * what a student with that misconception would really compute. Each distractor carries its misconception id.
 */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var E = SL.Evaluator;

  /** Misconception candidates for an output-style program. */
  function variantCandidates(stmts, correctText) {
    var out = [];
    Object.keys(E.MISCONCEPTIONS).forEach(function (id) {
      var r = E.evaluate(stmts, { flags: E.MISCONCEPTIONS[id] });
      if (r.ok && r.output !== null && r.output !== correctText) out.push({ text: r.output, misc: id });
    });
    // "stopped tracing one step early": run the program without its last state-changing statement
    var idx = -1;
    stmts.forEach(function (s, i) { if (s.s === 'assign') idx = i; });
    if (idx >= 0) {
      var cut = stmts.filter(function (s, i) { return i !== idx; });
      var r2 = E.evaluate(cut);
      if (r2.ok && r2.output !== null && r2.output !== correctText) out.push({ text: r2.output, misc: 'stoppedEarly' });
    }
    return out;
  }

  /** Generic "close but wrong" fallbacks (lowest priority). */
  function nearCandidates(text, isNumber) {
    var out = [];
    if (isNumber) {
      var n = parseInt(text, 10);
      [n + 1, n - 1, n + 2, n - 2, n * 2].forEach(function (x) { out.push({ text: String(x), misc: 'near' }); });
    } else if (text.length > 1) {
      out.push({ text: text.slice(0, -1), misc: 'near' });
      if (!/^[A-Z]/.test(text)) out.push({ text: text.slice(1), misc: 'near' });
    }
    return out;
  }

  var GOOD_OUTPUT = function (t) { return t.length > 0 && t === t.trim() && t.length <= 40; };

  /**
   * finalize(correctText, candidates, rng, opts) -> { choices, correctIndex } | null
   * opts.kind: 'output' | 'code' ; opts.max: number of distractors (default 3) ; opts.isNumber
   */
  function finalize(correctText, candidates, rng, opts) {
    opts = opts || {};
    var max = opts.max || 3;
    var seen = {}; seen[correctText] = true;
    var pool = [];
    var shuffled = rng.shuffle(candidates);
    // a text claimed by a realistic misconception must not be relabelled as a generic "near" miss
    shuffled = shuffled.filter(function (c) { return c.misc !== 'near'; }).concat(shuffled.filter(function (c) { return c.misc === 'near'; }));
    shuffled.forEach(function (c) {
      if (seen[c.text]) return;
      if (opts.kind !== 'code' && !GOOD_OUTPUT(c.text)) return;
      seen[c.text] = true; pool.push(c);
    });
    var real = pool.filter(function (c) { return c.misc !== 'near'; });
    var near = pool.filter(function (c) { return c.misc === 'near'; });
    var picked = [], usedMisc = {};
    real.forEach(function (c) { if (picked.length < max && !usedMisc[c.misc]) { picked.push(c); usedMisc[c.misc] = true; } });
    real.forEach(function (c) { if (picked.length < max && picked.indexOf(c) < 0) picked.push(c); });
    near.forEach(function (c) { if (picked.length < max) picked.push(c); });
    if (picked.length < 2) return null;
    var all = rng.shuffle([{ text: correctText, misc: null, correct: true }].concat(picked.map(function (c) {
      return { text: c.text, misc: c.misc, correct: false };
    })));
    var letters = 'abcd';
    var choices = all.map(function (c, i) {
      return { id: letters[i], text: c.text, kind: opts.kind || 'output', misc: c.misc, correct: !!c.correct };
    });
    var correctIndex = 0;
    choices.forEach(function (c, i) { if (c.correct) correctIndex = i; });
    return { choices: choices, correctIndex: correctIndex };
  }

  SL.Distractors = { variantCandidates: variantCandidates, nearCandidates: nearCandidates, finalize: finalize };
})(typeof globalThis !== 'undefined' ? globalThis : this);
