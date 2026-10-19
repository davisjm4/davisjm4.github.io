/* String Lab — difficulty classification.
 *
 * Difficulty is MEASURED from the Java program a student must reason about (AST analysis), not trusted from
 * the generator's label. The generator rejects any challenge whose measured level differs from the level requested.
 *
 *   ops          method calls + binary operators (+ - *)
 *   concepts     distinct ideas touched: Concatenation, Length, Character Indexing, Substrings, Searching, Immutability
 *   depends      an operation consumes the result of another operation (nested, or via a variable computed earlier)
 *   stateEvents  reassignments + String aliasing + discarded method calls
 *   extraVars    variables beyond the first (result variables of "complete the expression" are not counted)
 *   twists       indexOf returning -1 / matching repeated text, or declared inverse reasoning
 *   steps        ops + stateEvents + extraVars + twists   (total reasoning load)
 *
 *   beginner     exactly one operation, one variable, at most one simple reassignment, no aliasing/discarded call
 *   advanced     depends AND >= 2 concepts AND ops >= 3 AND steps >= 5   (genuinely interacting steps)
 *   intermediate otherwise, with 2 <= steps <= 5 and ops <= 4
 */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var J = SL.J;

  var CONCEPT_OF = { length: 'Length', charAt: 'Character Indexing', substring: 'Substrings', indexOf: 'Searching' };

  /**
   * analyze(stmts, evalResult, extraTwists)
   * evalResult (from Evaluator with events:true) lets us detect "twists" the student must notice:
   * an indexOf that returns -1, or whose target occurs more than once (first occurrence matters).
   * extraTwists: author-declared inverse reasoning (e.g. "which END index would produce this text?").
   */
  function analyze(stmts, evalResult, extraTwists) {
    var vtypes = {}, computed = {}, concepts = {};
    var m = { twists: extraTwists || 0, ops: 0, vars: 0, strVars: 0, reassigns: 0, aliasDecls: 0, discarded: 0, depends: false, statements: stmts.length };

    function isOp(e) { return e.k === 'call' || e.k === 'bin'; }
    function containsOp(e) {
      if (isOp(e)) return true;
      return false;
    }
    function walk(e) {
      var children;
      if (e.k === 'call') {
        m.ops++; concepts[CONCEPT_OF[e.method]] = true;
        children = [e.target].concat(e.args);
      } else if (e.k === 'bin') {
        m.ops++;
        if (e.op === '+' && (J.typeOf(e.l, vtypes) === 'String' || J.typeOf(e.r, vtypes) === 'String')) concepts['Concatenation'] = true;
        children = [e.l, e.r];
      } else return;
      children.forEach(function (c) {
        if (isOp(c) || (c.k === 'var' && computed[c.name])) m.depends = true;
        walk(c);
      });
    }
    function exprComputed(e) {
      if (isOp(e)) return true;
      if (e.k === 'var') return !!computed[e.name];
      return false;
    }

    stmts.forEach(function (s) {
      if (s.expr) walk(s.expr);
      if (s.s === 'decl') {
        if (s.tag !== 'result') { m.vars++; if (s.type === 'String') m.strVars++; }
        if (s.type === 'String' && s.expr && s.expr.k === 'var') { m.aliasDecls++; concepts['Immutability'] = true; }
        vtypes[s.name] = s.type;
        computed[s.name] = s.expr ? exprComputed(s.expr) : false;
      } else if (s.s === 'assign') {
        m.reassigns++;
        computed[s.name] = exprComputed(s.expr);
      } else if (s.s === 'expr') {
        m.discarded++; concepts['Immutability'] = true;
      }
    });
    if (evalResult && evalResult.log) {
      evalResult.log.forEach(function (entry) {
        entry.events.forEach(function (ev) {
          if (ev.kind !== 'call' || ev.method !== 'indexOf') return;
          var target = SL.Evaluator.show(ev.args[0]), hay = ev.recv.v, count = 0, p = hay.indexOf(target);
          while (p >= 0 && count < 2) { count++; p = hay.indexOf(target, p + 1); }
          if (ev.result.v === -1 || count > 1) m.twists++;
        });
      });
    }
    m.concepts = Object.keys(concepts).sort();
    m.stateEvents = m.reassigns + m.aliasDecls + m.discarded;
    m.extraVars = Math.max(0, m.vars - 1);
    m.steps = m.ops + m.stateEvents + m.extraVars + m.twists;
    return m;
  }

  function classify(m) {
    if (m.ops === 1 && m.twists === 0 && m.vars <= 1 && m.aliasDecls === 0 && m.discarded === 0 && m.reassigns <= 1) return 'beginner';
    if (m.depends && m.concepts.length >= 2 && m.ops >= 3 && m.steps >= 5) return 'advanced';
    if (m.steps >= 2 && m.steps <= 5 && m.ops <= 4) return 'intermediate';
    return 'other';
  }

  SL.Difficulty = { analyze: analyze, classify: classify, LEVELS: ['beginner', 'intermediate', 'advanced'] };
})(typeof globalThis !== 'undefined' ? globalThis : this);
