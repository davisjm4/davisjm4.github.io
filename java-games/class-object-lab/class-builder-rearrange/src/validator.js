/* Semantic arrangement validator.
   Grades the FINAL STRUCTURE against the class model, never against block ids or original positions.
   Identical statements (e.g. the constructor's and a setter's `this.name = name;`) are interchangeable
   because grading compares each body's multiset of semantic keys ("assign:name", "return:name", "tostring"). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CBR = root.CBR || {}; root.CBR.validator = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Issue codes in priority order (lowest number = most important to fix first) */
  var PRIORITY = [
    'STRUCTURE',           // blocks missing/duplicated (should never happen through the UI)
    'FIELD_SECTION',       // field declaration outside Section 1
    'CTOR_SECTION',        // constructor outside Section 2 (or something else inside Section 2)
    'METHOD_SECTION',      // getter/setter/toString outside Section 3
    'CTOR_MISSING',        // constructor lacks an assignment
    'CTOR_EXTRA',          // constructor holds a statement that doesn't belong
    'GETTER_WRONG_FIELD',
    'GETTER_ASSIGN',
    'GETTER_EMPTY',
    'GETTER_EXTRA',
    'SETTER_WRONG_FIELD',
    'SETTER_RETURN',
    'SETTER_EMPTY',
    'SETTER_EXTRA',
    'TOSTRING_MISSING',
    'TOSTRING_EXTRA'
  ];

  function counts(list) {
    var m = {};
    list.forEach(function (k) { m[k] = (m[k] || 0) + 1; });
    return m;
  }
  function sameMultiset(a, b) {
    var ca = counts(a), cb = counts(b), k;
    for (k in ca) if (ca[k] !== cb[k]) return false;
    for (k in cb) if (ca[k] !== cb[k]) return false;
    return true;
  }
  function sems(body) { return (body || []).map(function (s) { return s.sem; }); }

  /** What each method body must contain (derived from the model only). */
  function expectedBody(block, model) {
    if (block.kind === 'ctor') return model.fields.map(function (f) { return 'assign:' + f.name; });
    if (block.kind === 'getter') return ['return:' + block.field];
    if (block.kind === 'setter') return ['assign:' + block.field];
    if (block.kind === 'tostring') return ['tostring'];
    return [];
  }

  function issue(code, ids, extra) {
    var o = { code: code, priority: PRIORITY.indexOf(code), ids: ids || [] };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  function validate(arr, model) {
    var issues = [];
    var blocks = [];
    arr.sections.forEach(function (sec, si) { sec.forEach(function (b) { blocks.push({ b: b, s: si }); }); });

    /* ---- required blocks present exactly once ---- */
    var needKeys = ['ctor:', 'tostring:'];
    model.fields.forEach(function (f) { needKeys.push('field:' + f.name, 'getter:' + f.name, 'setter:' + f.name); });
    var haveKeys = blocks.map(function (x) { return x.b.kind + ':' + (x.b.field || ''); });
    if (!sameMultiset(needKeys, haveKeys)) issues.push(issue('STRUCTURE'));

    /* ---- section placement ---- */
    var badFields = blocks.filter(function (x) { return x.b.kind === 'field' && x.s !== 0; });
    if (badFields.length) issues.push(issue('FIELD_SECTION', badFields.map(function (x) { return x.b.id; })));

    var ctors = blocks.filter(function (x) { return x.b.kind === 'ctor'; });
    var sec2Wrong = blocks.filter(function (x) { return x.s === 1 && x.b.kind !== 'ctor'; });
    var ctorWrong = ctors.filter(function (x) { return x.s !== 1; }).concat(sec2Wrong);
    if (ctorWrong.length) issues.push(issue('CTOR_SECTION', ctorWrong.map(function (x) { return x.b.id; })));

    var badMethods = blocks.filter(function (x) { return (x.b.kind === 'getter' || x.b.kind === 'setter' || x.b.kind === 'tostring') && x.s !== 2; });
    if (badMethods.length) issues.push(issue('METHOD_SECTION', badMethods.map(function (x) { return x.b.id; })));

    /* ---- bodies (checked wherever the block currently sits, so feedback is independent of sections) ---- */
    blocks.forEach(function (x) {
      var b = x.b, got = sems(b.body), want = expectedBody(b, model);
      if (b.kind === 'field' || sameMultiset(got, want)) return;
      var gc = counts(got), wc = counts(want), k;
      var missing = [], extra = [];
      for (k in wc) if ((gc[k] || 0) < wc[k]) missing.push(k);
      for (k in gc) if ((gc[k] || 0) > (wc[k] || 0)) extra.push(k);
      var ids = [b.id].concat((b.body || []).map(function (s) { return s.id; }));

      if (b.kind === 'ctor') {
        if (missing.length) issues.push(issue('CTOR_MISSING', ids, { block: b.id }));
        else issues.push(issue('CTOR_EXTRA', ids, { block: b.id }));
      } else if (b.kind === 'getter') {
        var gRet = extra.some(function (e) { return e.indexOf('return:') === 0; });
        var gAssign = extra.some(function (e) { return e.indexOf('assign:') === 0; });
        if (gRet && missing.length) issues.push(issue('GETTER_WRONG_FIELD', ids, { block: b.id }));
        else if (gAssign) issues.push(issue('GETTER_ASSIGN', ids, { block: b.id }));
        else if (!got.length) issues.push(issue('GETTER_EMPTY', ids, { block: b.id }));
        else issues.push(issue('GETTER_EXTRA', ids, { block: b.id }));
      } else if (b.kind === 'setter') {
        var sRet = extra.some(function (e) { return e.indexOf('return:') === 0 || e === 'tostring'; });
        var sAssign = extra.some(function (e) { return e.indexOf('assign:') === 0; });
        if (sRet) issues.push(issue('SETTER_RETURN', ids, { block: b.id }));
        else if (!got.length) issues.push(issue('SETTER_EMPTY', ids, { block: b.id }));
        else if (sAssign && missing.length) issues.push(issue('SETTER_WRONG_FIELD', ids, { block: b.id }));
        else issues.push(issue('SETTER_EXTRA', ids, { block: b.id }));
      } else if (b.kind === 'tostring') {
        if (missing.length) issues.push(issue('TOSTRING_MISSING', ids, { block: b.id }));
        else issues.push(issue('TOSTRING_EXTRA', ids, { block: b.id }));
      }
    });

    issues.sort(function (a, b) { return a.priority - b.priority; });
    return { solved: issues.length === 0, issues: issues, primary: issues[0] || null, placement: placement(arr, model) };
  }

  /** How many pieces currently sit in an acceptable place (for the "x of y in place" readout). */
  function placement(arr, model) {
    var blocksTotal = 0, blocksPlaced = 0, stmtsTotal = 0, stmtsPlaced = 0;
    arr.sections.forEach(function (sec, si) {
      sec.forEach(function (b) {
        blocksTotal++;
        var okSection = (b.kind === 'field' && si === 0) || (b.kind === 'ctor' && si === 1) || (b.kind !== 'field' && b.kind !== 'ctor' && si === 2);
        if (okSection) blocksPlaced++;
        if (b.body) {
          var want = counts(expectedBody(b, model)), used = {};
          b.body.forEach(function (s) {
            stmtsTotal++;
            used[s.sem] = (used[s.sem] || 0) + 1;
            if (used[s.sem] <= (want[s.sem] || 0)) stmtsPlaced++;
          });
        }
      });
    });
    return { blocksTotal: blocksTotal, blocksPlaced: blocksPlaced, stmtsTotal: stmtsTotal, stmtsPlaced: stmtsPlaced };
  }

  /** Count pieces that start in an unacceptable place (used by the generator to enforce difficulty). */
  function misplacedCounts(arr, model) {
    var p = placement(arr, model);
    return { blocks: p.blocksTotal - p.blocksPlaced, statements: p.stmtsTotal - p.stmtsPlaced };
  }

  return { PRIORITY: PRIORITY, validate: validate, placement: placement, misplacedCounts: misplacedCounts, expectedBody: expectedBody };
});
