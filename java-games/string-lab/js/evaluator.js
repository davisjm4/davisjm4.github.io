/* String Lab — Java String semantic evaluator.
 *
 * Interprets the restricted Java subset used by String Lab (String/int/char variables, + - *,
 * length/charAt/substring/indexOf, assignment, println) with REAL Java semantics:
 *   - zero-based indexing, exclusive substring end, indexOf -> first occurrence or -1
 *   - left-to-right evaluation, * before +, String + anything = concatenation
 *   - Strings are immutable; methods return new Strings
 *   - invalid operations (bad index, bad bounds, type errors) THROW a JavaError (never silently clamp)
 *
 * Optional `flags` re-run the same program with a deliberate MISCONCEPTION (e.g. one-based indexing,
 * inclusive end index). These power realistic distractors. Flags never alter the correct evaluation.
 */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});

  function JavaError(kind, msg) { this.kind = kind; this.message = msg; }
  JavaError.prototype = Object.create(Error.prototype);

  function fmt(v) {
    if (v.t === 'String') return '"' + v.v + '"';
    if (v.t === 'char') return "'" + v.v + "'";
    return String(v.v);
  }
  function show(v) { return String(v.v); } // value as println would show it

  /**
   * evaluate(stmts, opts) -> { ok, output, outputs, env, log } | { ok:false, error, kind, stmtIndex }
   * opts.flags   misconception flags (see FLAGS list)
   * opts.events  true to record call/concat events per statement (used by feedback)
   */
  function evaluate(stmts, opts) {
    opts = opts || {};
    var flags = opts.flags || {};
    var wantEvents = !!opts.events;
    var env = {};
    var outputs = [];
    var log = [];
    var events;

    function lookup(name) {
      var cell = env[name];
      if (!cell) throw new JavaError('undefined', 'variable ' + name + ' is not defined');
      if (cell.alias) return lookup(cell.alias);
      return cell;
    }

    function plus(a, b) {
      if (flags.allConcat || a.t === 'String' || b.t === 'String') {
        var r = { t: 'String', v: show(a) + show(b) };
        if (wantEvents) events.push({ kind: 'concat', l: a, r: b, result: r });
        return r;
      }
      if (a.t === 'int' && b.t === 'int') {
        var s = { t: 'int', v: a.v + b.v };
        if (wantEvents) events.push({ kind: 'add', l: a, r: b, result: s });
        return s;
      }
      throw new JavaError('charArithmetic', 'char arithmetic is outside the scope of String Lab');
    }

    function ev(e) {
      switch (e.k) {
        case 'str': return { t: 'String', v: e.v };
        case 'int': return { t: 'int', v: e.v };
        case 'chr': return { t: 'char', v: e.v };
        case 'var': { var c = lookup(e.name); return { t: c.t, v: c.v }; }
        case 'call': return call(e);
        case 'bin': return bin(e);
      }
      throw new JavaError('syntax', 'unknown expression');
    }

    function bin(e) {
      if (e.op === '+' && flags.sumNums) {
        var spine = [], n = e;
        while (n.k === 'bin' && n.op === '+') { spine.unshift(n.r); n = n.l; }
        spine.unshift(n);
        var pieces = [];
        spine.forEach(function (x) {
          var v = ev(x), last = pieces[pieces.length - 1];
          if (v.t === 'int' && last && last.t === 'int') last.v += v.v; else pieces.push({ t: v.t, v: v.v });
        });
        return pieces.slice(1).reduce(plus, pieces[0]);
      }
      var l = ev(e.l), r = ev(e.r);
      if (e.op === '+') return plus(l, r);
      if (l.t !== 'int' || r.t !== 'int') throw new JavaError('type', 'operator ' + e.op + ' needs int operands');
      var res = { t: 'int', v: e.op === '-' ? l.v - r.v : l.v * r.v };
      if (wantEvents) events.push({ kind: 'arith', op: e.op, l: l, r: r, result: res });
      return res;
    }

    function call(e) {
      var recv = ev(e.target);
      if (recv.t !== 'String') throw new JavaError('type', 'method ' + e.method + ' called on non-String');
      var args = e.args.map(ev), s = recv.v, len = s.length, res, i, a, b;
      switch (e.method) {
        case 'length':
          if (args.length) throw new JavaError('overload', 'length() takes no arguments');
          res = { t: 'int', v: len + (flags.lengthMinus1 ? -1 : 0) + (flags.lengthPlus1 ? 1 : 0) };
          if (flags.lengthMinus1 && flags.lengthPlus1) res.v = len;
          break;
        case 'charAt':
          if (args.length !== 1 || args[0].t !== 'int') throw new JavaError('overload', 'charAt(int) expected');
          i = args[0].v;
          if (i < 0 || i >= len) throw new JavaError('StringIndexOutOfBoundsException', 'charAt index ' + i + ' out of range for length ' + len);
          if (flags.oneBasedChar) { i = i - 1; if (i < 0) throw new JavaError('flag', 'no one-based variant'); }
          res = { t: 'char', v: s.charAt(i) };
          break;
        case 'substring':
          if (args.length < 1 || args.length > 2 || args.some(function (x) { return x.t !== 'int'; })) throw new JavaError('overload', 'substring(int) or substring(int,int) expected');
          a = args[0].v; b = args.length === 2 ? args[1].v : len;
          if (a < 0 || b > len || a > b) throw new JavaError('StringIndexOutOfBoundsException', 'substring(' + a + ',' + b + ') invalid for length ' + len);
          if (flags.inclusiveEnd && args.length === 2) b = Math.min(b + 1, len);
          if (flags.startEarly) a = Math.max(a - 1, 0);
          if (flags.startLate) a = Math.min(a + 1, b);
          res = { t: 'String', v: s.substring(a, b) };
          break;
        case 'indexOf':
          if (args.length !== 1 || (args[0].t !== 'String' && args[0].t !== 'char')) throw new JavaError('overload', 'indexOf(String) or indexOf(char) expected');
          var target = show(args[0]);
          var idx = flags.lastOcc ? s.lastIndexOf(target) : s.indexOf(target);
          if (flags.oneBasedIdx && idx >= 0) idx += 1;
          if (flags.notFoundZero && idx === -1) idx = 0;
          res = { t: 'int', v: idx };
          break;
        default: throw new JavaError('method', 'unsupported method ' + e.method);
      }
      if (wantEvents) events.push({ kind: 'call', method: e.method, recv: recv, args: args, result: res });
      return res;
    }

    function typeCheck(type, v, what) {
      if (v.t !== type) throw new JavaError('incompatibleTypes', what + ': cannot assign ' + v.t + ' to ' + type);
    }

    var i = 0;
    try {
      for (; i < stmts.length; i++) {
        var s = stmts[i];
        events = [];
        var entry = { index: i, stmt: s, events: events };
        switch (s.s) {
          case 'decl': {
            if (env[s.name]) throw new JavaError('duplicate', s.name + ' already declared');
            if (s.expr === null || s.expr === undefined) throw new JavaError('uninitialized', 'no initializer');
            var v = ev(s.expr);
            typeCheck(s.type, v, s.name);
            if (flags.alias && s.expr.k === 'var' && s.type === 'String') env[s.name] = { t: 'String', alias: s.expr.name };
            else env[s.name] = { t: v.t, v: v.v };
            entry.value = v;
            break;
          }
          case 'assign': {
            var cell = env[s.name];
            if (!cell) throw new JavaError('undefined', s.name + ' is not declared');
            var nv = ev(s.expr);
            typeCheck(cell.alias ? lookup(s.name).t : cell.t, nv, s.name);
            env[s.name] = { t: nv.t, v: nv.v };
            entry.value = nv;
            break;
          }
          case 'expr': {
            if (s.expr.k !== 'call') throw new JavaError('syntax', 'not a statement expression');
            var rv = ev(s.expr);
            if (flags.mutate && s.expr.target.k === 'var' && rv.t === 'String') env[s.expr.target.name] = { t: 'String', v: rv.v };
            entry.value = rv;
            break;
          }
          case 'print': {
            var pv = ev(s.expr);
            outputs.push(show(pv));
            entry.value = pv; entry.printed = show(pv);
            break;
          }
          default: throw new JavaError('syntax', 'unknown statement');
        }
        if (wantEvents) {
          entry.env = {};
          Object.keys(env).forEach(function (k) { var c = lookup(k); entry.env[k] = { t: c.t, v: c.v }; });
        }
        log.push(entry);
      }
    } catch (err) {
      if (err instanceof JavaError) return { ok: false, error: err.message, kind: err.kind, stmtIndex: i };
      throw err;
    }
    var snap = {};
    Object.keys(env).forEach(function (k) { var c = lookup(k); snap[k] = { t: c.t, v: c.v }; });
    return { ok: true, output: outputs.length ? outputs[outputs.length - 1] : null, outputs: outputs, env: snap, log: log };
  }

  // Misconception flag sets used by the distractor builder: id -> flags
  var MISCONCEPTIONS = {
    oneBased:      { oneBasedChar: true },
    inclusiveEnd:  { inclusiveEnd: true },
    startEarly:    { startEarly: true },
    startLate:     { startLate: true },
    mutates:       { mutate: true },
    aliasFollows:  { alias: true },
    sumNumbers:    { sumNums: true },
    allConcat:     { allConcat: true },
    lastOccurrence:{ lastOcc: true },
    oneBasedFind:  { oneBasedIdx: true },
    notFoundZero:  { notFoundZero: true },
    lengthLastIdx: { lengthMinus1: true },
    lengthPlus:    { lengthPlus1: true }
  };

  SL.Evaluator = { evaluate: evaluate, JavaError: JavaError, fmt: fmt, show: show, MISCONCEPTIONS: MISCONCEPTIONS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
