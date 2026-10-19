/* Workplace Readiness Games - safe expression evaluator.
 * Used for numeric template variables (Mathematics and any quantity-based scenario).
 * Supports: numbers, identifiers, + - * / %, unary -, comparisons, && ||, parentheses,
 * and the functions round, floor, ceil, min, max, abs, round2 (nearest cent).
 * It never uses eval/Function, so authored content cannot execute code.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.expr = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FUNCS = {
    round: function (x, d) { var m = Math.pow(10, d || 0); return Math.round(x * m) / m; },
    round2: function (x) { return Math.round(x * 100 + 1e-9) / 100; },
    floor: Math.floor, ceil: Math.ceil, abs: Math.abs,
    min: Math.min, max: Math.max
  };

  function tokenize(src) {
    var tokens = [], i = 0, m;
    var re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(&&|\|\||==|!=|>=|<=|[-+*\/%()<>,]))/y;
    while (i < src.length) {
      re.lastIndex = i;
      m = re.exec(src);
      if (!m) {
        if (/^\s*$/.test(src.slice(i))) break;
        throw new Error('Unexpected character in expression "' + src + '" at ' + i);
      }
      if (m[1] !== undefined) tokens.push({ t: 'num', v: parseFloat(m[1]) });
      else if (m[2] !== undefined) tokens.push({ t: 'id', v: m[2] });
      else tokens.push({ t: 'op', v: m[3] });
      i = re.lastIndex;
    }
    return tokens;
  }

  var BIN_PREC = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };

  function parse(src) {
    var tokens = tokenize(src), pos = 0;
    function peek() { return tokens[pos]; }
    function take() { return tokens[pos++]; }
    function expectOp(v) {
      var t = take();
      if (!t || t.t !== 'op' || t.v !== v) throw new Error('Expected "' + v + '" in "' + src + '"');
    }
    function primary() {
      var t = take();
      if (!t) throw new Error('Unexpected end of expression "' + src + '"');
      if (t.t === 'num') return { k: 'num', v: t.v };
      if (t.t === 'id') {
        var n = peek();
        if (n && n.t === 'op' && n.v === '(') {
          take();
          var args = [];
          if (!(peek() && peek().t === 'op' && peek().v === ')')) {
            args.push(binary(0));
            while (peek() && peek().t === 'op' && peek().v === ',') { take(); args.push(binary(0)); }
          }
          expectOp(')');
          if (!Object.prototype.hasOwnProperty.call(FUNCS, t.v)) throw new Error('Unknown function "' + t.v + '"');
          return { k: 'call', name: t.v, args: args };
        }
        return { k: 'var', name: t.v };
      }
      if (t.v === '(') { var e = binary(0); expectOp(')'); return e; }
      if (t.v === '-') return { k: 'neg', e: primary() };
      throw new Error('Unexpected token "' + t.v + '" in "' + src + '"');
    }
    function binary(minPrec) {
      var left = primary();
      for (;;) {
        var t = peek();
        if (!t || t.t !== 'op' || !(t.v in BIN_PREC) || BIN_PREC[t.v] < minPrec) break;
        take();
        var right = binary(BIN_PREC[t.v] + 1);
        left = { k: 'bin', op: t.v, l: left, r: right };
      }
      return left;
    }
    var ast = binary(0);
    if (pos < tokens.length) throw new Error('Trailing tokens in expression "' + src + '"');
    return ast;
  }

  function evalAst(n, scope) {
    switch (n.k) {
      case 'num': return n.v;
      case 'var':
        if (!Object.prototype.hasOwnProperty.call(scope, n.name)) throw new Error('Unknown variable "' + n.name + '"');
        return scope[n.name];
      case 'neg': return -evalAst(n.e, scope);
      case 'call': return FUNCS[n.name].apply(null, n.args.map(function (a) { return evalAst(a, scope); }));
      case 'bin': {
        var a = evalAst(n.l, scope), b = evalAst(n.r, scope);
        switch (n.op) {
          case '+': return a + b; case '-': return a - b; case '*': return a * b;
          case '/': return a / b; case '%': return a % b;
          case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b;
          case '==': return a === b; case '!=': return a !== b;
          case '&&': return !!a && !!b; case '||': return !!a || !!b;
        }
      }
    }
    throw new Error('Bad expression node');
  }

  var cache = Object.create(null);
  function evaluate(src, scope) {
    var ast = cache[src] || (cache[src] = parse(src));
    return evalAst(ast, scope || {});
  }

  return { evaluate: evaluate, parse: parse };
}));
