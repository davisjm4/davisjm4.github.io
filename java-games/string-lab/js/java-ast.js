/* String Lab — tiny Java AST (constructors), renderer (AST -> Java source) and static typing.
 * The generator builds programs as ASTs; the SAME AST is rendered for the student, evaluated by the
 * evaluator, and exported to a real JVM for independent verification. */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});

  var J = {};

  // ---- expressions ----
  J.S = function (v) { return { k: 'str', v: v }; };
  J.I = function (n) { return { k: 'int', v: n }; };
  J.C = function (ch) { return { k: 'chr', v: ch }; };
  J.V = function (name) { return { k: 'var', name: name }; };
  J.call = function (target, method) {
    return { k: 'call', target: target, method: method, args: Array.prototype.slice.call(arguments, 2) };
  };
  J.bin = function (op, l, r) { return { k: 'bin', op: op, l: l, r: r }; };
  J.add = function (l, r) { return J.bin('+', l, r); };
  J.sub = function (l, r) { return J.bin('-', l, r); };
  J.mul = function (l, r) { return J.bin('*', l, r); };
  /** Left-associative chain a + b + c ... */
  J.addAll = function () {
    var parts = Array.prototype.slice.call(arguments);
    return parts.slice(1).reduce(function (acc, p) { return J.add(acc, p); }, parts[0]);
  };
  // ---- statements ----
  // tag: optional marker, e.g. 'result' (the variable a question asks about) or 'immut' (intentionally "dead" call)
  J.decl = function (type, name, expr, tag) { return { s: 'decl', type: type, name: name, expr: expr, tag: tag || null }; };
  J.assign = function (name, expr, tag) { return { s: 'assign', name: name, expr: expr, tag: tag || null }; };
  J.exprStmt = function (callExpr, tag) { return { s: 'expr', expr: callExpr, tag: tag || null }; };
  J.print = function (expr) { return { s: 'print', expr: expr, tag: null }; };

  // ---- rendering ----
  var PREC = { '+': 1, '-': 1, '*': 2 };
  function esc(str) { return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

  function expr(e) {
    switch (e.k) {
      case 'str': return '"' + esc(e.v) + '"';
      case 'int': return String(e.v);
      case 'chr': return "'" + e.v + "'";
      case 'var': return e.name;
      case 'call': {
        var t = expr(e.target);
        if (e.target.k === 'bin') t = '(' + t + ')';
        return t + '.' + e.method + '(' + e.args.map(expr).join(', ') + ')';
      }
      case 'bin': {
        var p = PREC[e.op], l = expr(e.l), r = expr(e.r);
        if (e.l.k === 'bin' && PREC[e.l.op] < p) l = '(' + l + ')';
        if (e.r.k === 'bin' && PREC[e.r.op] <= p) r = '(' + r + ')';
        return l + ' ' + e.op + ' ' + r;
      }
    }
    throw new Error('bad expr ' + JSON.stringify(e));
  }
  function stmt(s) {
    switch (s.s) {
      case 'decl': return s.type + ' ' + s.name + ' = ' + (s.expr ? expr(s.expr) : '???') + ';';
      case 'assign': return s.name + ' = ' + expr(s.expr) + ';';
      case 'expr': return expr(s.expr) + ';';
      case 'print': return 'System.out.println(' + expr(s.expr) + ');';
    }
    throw new Error('bad stmt');
  }
  J.render = { expr: expr, stmt: stmt, program: function (stmts) { return stmts.map(stmt); } };

  // ---- static typing ----
  var CALL_TYPE = { length: 'int', charAt: 'char', substring: 'String', indexOf: 'int' };
  J.typeOf = function (e, vtypes) {
    switch (e.k) {
      case 'str': return 'String';
      case 'int': return 'int';
      case 'chr': return 'char';
      case 'var': return vtypes[e.name];
      case 'call': return CALL_TYPE[e.method];
      case 'bin':
        if (e.op === '+' && (J.typeOf(e.l, vtypes) === 'String' || J.typeOf(e.r, vtypes) === 'String')) return 'String';
        return 'int';
    }
  };

  J.clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  /** Rename variables (used for normalized signatures). map: oldName -> newName */
  J.rename = function (stmts, map) {
    function re(e) {
      if (e.k === 'var') return J.V(map[e.name] || e.name);
      if (e.k === 'call') return { k: 'call', target: re(e.target), method: e.method, args: e.args.map(re) };
      if (e.k === 'bin') return J.bin(e.op, re(e.l), re(e.r));
      return e;
    }
    return stmts.map(function (s) {
      var c = Object.assign({}, s);
      if (c.name) c.name = map[c.name] || c.name;
      if (c.expr) c.expr = re(c.expr);
      return c;
    });
  };
  SL.J = J;
})(typeof globalThis !== 'undefined' ? globalThis : this);
