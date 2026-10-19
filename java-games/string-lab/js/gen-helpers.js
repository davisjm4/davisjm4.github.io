/* String Lab — shared helpers for the reasoning-family modules (no DOM). */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var W = SL.Words, J = SL.J, E = SL.Evaluator;

  var LEN = { beginner: [4, 7], intermediate: [5, 9], advanced: [6, 12] };
  var ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  var H = {};

  H.families = [];
  H.register = function (def) { H.families.push(def); };

  H.SEP1 = ['-', '_', ':', '/', '=', '|', '#'];
  H.SUFFIX = ['s', '!', '?', 'er', 'ed', 'ly', 'ish', '-1'];
  H.PREFIX = ['my', 're', 'un', 'pre', 'mini', 'big'];

  H.pickW = function (r, lvl, opts) {
    var l = LEN[lvl];
    return W.pickWord(r, Object.assign({ min: l[0], max: l[1] }, opts || {}));
  };
  H.sname = function (r, avoid) {
    var pool = W.STRING_NAMES.filter(function (n) { return !avoid || avoid.indexOf(n) < 0; });
    return r.pick(pool);
  };
  H.pair = function (r) { return r.pick(W.STRING_PAIRS); };
  H.iname = function (r, avoid) {
    var pool = W.INT_NAMES.filter(function (n) { return !avoid || avoid.indexOf(n) < 0; });
    return r.pick(pool);
  };
  H.posName = function (r) { return r.pick(W.POS_NAMES); };
  H.startName = function (r) { return r.pick(W.START_NAMES); };
  H.compound = function (r) {
    var c = r.pick(W.COMPOUNDS);
    return { a: c[0], b: c[1], joined: c[0] + c[1] };
  };
  H.occ = function (s, t) {
    var c = 0, p = s.indexOf(t);
    while (p >= 0) { c++; p = s.indexOf(t, p + 1); }
    return c;
  };
  /** letters that occur exactly once / more than once: [{ch, idx(first), last}] */
  H.letterInfo = function (w) {
    var info = {}, i;
    for (i = 0; i < w.length; i++) {
      var ch = w[i];
      if (!info[ch]) info[ch] = { ch: ch, first: i, last: i, count: 0 };
      info[ch].last = i; info[ch].count++;
    }
    return Object.keys(info).map(function (k) { return info[k]; });
  };
  /** All distinct substrings of w meeting constraints. opts: minLen,maxLen,mode('unique'|'repeated'|'any'),notAtStart,notAtEnd */
  H.keys = function (w, opts) {
    opts = opts || {};
    var seen = {}, out = [], i, l;
    for (l = opts.minLen || 1; l <= (opts.maxLen || 3); l++) {
      for (i = 0; i + l <= w.length; i++) {
        var t = w.substr(i, l);
        if (seen[t]) continue; seen[t] = true;
        var c = H.occ(w, t), first = w.indexOf(t);
        if (opts.mode === 'unique' && c !== 1) continue;
        if (opts.mode === 'repeated' && c < 2) continue;
        if (opts.notAtStart && first === 0) continue;
        if (opts.notAtEnd && first + t.length === w.length) continue;
        out.push({ text: t, first: first, last: w.lastIndexOf(t), count: c });
      }
    }
    return out;
  };
  /** A key (letter/chunk) that is NOT in w. */
  H.absentKey = function (r, w, len) {
    for (var tries = 0; tries < 60; tries++) {
      var t = '';
      for (var i = 0; i < (len || 1); i++) t += ALPHA[r.int(0, 25)];
      if (w.indexOf(t) < 0) return t;
    }
    return 'q';
  };
  H.cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  /** Output-style draft (Modes A and D). extra = [{text, misc}] topical distractors. */
  H.out = function (stmts, extra, meta) { return { type: 'output', stmts: stmts, extra: extra || [], meta: meta || {} }; };

  /**
   * Numeric question draft (Mode B). spec: {stmts, qExpr, prompt, answer, cands:[{n,misc}], twists, probes?}
   * The answer is VERIFIED by running stmts + println(qExpr) on the evaluator and on a real JVM.
   */
  H.numQuestion = function (spec) {
    var analysis = spec.stmts.concat([J.print(spec.qExpr)]);
    var probes = [{ text: String(spec.answer), stmts: analysis, expect: String(spec.answer), kind: 'correct' }];
    return {
      type: 'custom', kind: 'index', stmts: spec.stmts, analysis: analysis, prompt: spec.prompt,
      answer: String(spec.answer), choiceKind: 'output', isNumber: true, twists: spec.twists || 0,
      candidates: spec.cands.filter(function (c) { return c.n !== spec.answer; })
        .map(function (c) { return { text: String(c.n), misc: c.misc }; }),
      probes: probes, meta: spec.meta || {}
    };
  };

  /**
   * Expression-completion draft (Mode C). spec: {pre:[stmts], type, name, correct:Expr, wrongs:[{expr,misc}], goal}
   * Every choice is compiled into a full program and evaluated: wrong choices must be valid Java that
   * produce a DIFFERENT value from the goal, so exactly one choice is correct.
   */
  H.exprQuestion = function (spec) {
    var name = spec.name || 'result';
    function program(expr) { return spec.pre.concat([J.decl(spec.type, name, expr, 'result'), J.print(J.V(name))]); }
    var correctText = J.render.expr(spec.correct);
    var cprog = program(spec.correct);
    var cres = E.evaluate(cprog);
    if (!cres.ok) return null;
    var probes = [{ text: correctText, stmts: cprog, expect: cres.output, kind: 'correct' }];
    var cands = [], seen = {}; seen[correctText] = true;
    spec.wrongs.forEach(function (w) {
      var t = J.render.expr(w.expr);
      if (seen[t]) return; seen[t] = true;
      var p = program(w.expr), res = E.evaluate(p);
      if (!res.ok || res.output === cres.output) return;
      cands.push({ text: t, misc: w.misc });
      probes.push({ text: t, stmts: p, expect: res.output, kind: 'distractor' });
    });
    return {
      type: 'custom', kind: 'expr', stmts: spec.pre.concat([J.decl(spec.type, name, null, 'result')]),
      analysis: cprog, goal: spec.goal, prompt: spec.goal + ' Which expression should replace `???`?',
      answer: correctText, choiceKind: 'code', isNumber: false, twists: spec.twists || 0,
      candidates: cands, probes: probes, meta: Object.assign({ resultType: spec.type }, spec.meta || {})
    };
  };

  SL.GenHelpers = H;
})(typeof globalThis !== 'undefined' ? globalThis : this);
