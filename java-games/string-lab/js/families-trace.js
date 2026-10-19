/* String Lab — Mode D "Trace String Operations" reasoning families. */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var J = SL.J, H = SL.GenHelpers;
  var S = J.S, I = J.I, V = J.V, call = J.call, add = J.add, mul = J.mul, addAll = J.addAll;
  var decl = J.decl, assign = J.assign, print = J.print, out = H.out;

  /** Random single operation on variable nm whose current value is cur; returns {expr, value}. */
  function randOp(r, nm, cur, kinds) {
    var kind = r.pick(kinds), k, a, b, s;
    if (kind === 'sub1' && cur.length >= 3) { k = r.int(1, Math.min(3, cur.length - 2)); return { expr: call(V(nm), 'substring', I(k)), value: cur.substring(k) }; }
    if (kind === 'sub2' && cur.length >= 4) { a = r.int(0, 1); b = r.int(a + 2, cur.length - 1); return { expr: call(V(nm), 'substring', I(a), I(b)), value: cur.substring(a, b) }; }
    if (kind === 'pre') { s = r.pick(H.PREFIX); return { expr: add(S(s), V(nm)), value: s + cur }; }
    s = r.pick(H.SUFFIX);
    return { expr: add(V(nm), S(s)), value: cur + s };
  }

  H.register({
    id: 'trace.reassign.substring', label: 'Reassign with substring', mode: 'trace', levels: ['beginner'],
    skill: 'Multi-Step String Tracing', rule: 'reassign', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r);
      var op = randOp(r, nm, w, ['sub1', 'sub2']);
      return out([decl('String', nm, S(w)), assign(nm, op.expr), print(V(nm))], []);
    }
  });

  H.register({
    id: 'trace.reassign.concat', label: 'Reassign with concatenation', mode: 'trace', levels: ['beginner'],
    skill: 'Multi-Step String Tracing', rule: 'reassign', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), k = r.int(2, 9), pat = r.int(0, 3), e, extra = [];
      if (pat === 0) { var sf = r.pick(H.SUFFIX); e = add(V(nm), S(sf)); extra.push({ text: sf + w, misc: 'order' }); }
      else if (pat === 1) { var pf = r.pick(H.PREFIX); e = add(S(pf), V(nm)); extra.push({ text: w + pf, misc: 'order' }); }
      else if (pat === 2) { e = add(V(nm), I(k)); extra.push({ text: k + w, misc: 'order' }); }
      else { var other = H.pickW(r, lvl, { exclude: [w], max: 5 }); e = add(V(nm), S(other)); extra.push({ text: other + w, misc: 'order' }); }
      return out([decl('String', nm, S(w)), assign(nm, e), print(V(nm))], extra);
    }
  });

  H.register({
    id: 'trace.sequence', label: 'Sequential updates', mode: 'trace', levels: ['intermediate', 'advanced'],
    skill: 'Multi-Step String Tracing', rule: 'sequence', weight: 1.3,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), cur = w, stmts = [decl('String', nm, S(w))];
      var count = lvl === 'advanced' ? 3 : 2;
      for (var i = 0; i < count; i++) {
        var op = randOp(r, nm, cur, ['sub1', 'sub2', 'cat', 'pre']);
        stmts.push(assign(nm, op.expr)); cur = op.value;
      }
      stmts.push(print(V(nm)));
      return out(stmts, []);
    }
  });

  H.register({
    id: 'trace.immutable', label: 'Methods do not change the String', mode: 'trace', levels: ['intermediate'],
    skill: 'String Immutability', rule: 'immutable', weight: 1.6,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), n = w.length, d0 = decl('String', nm, S(w)), pat = r.int(0, 3), stmts;
      var a = r.int(1, n - 3), b = r.int(a + 2, n);
      if (pat === 0) stmts = [d0, J.exprStmt(call(V(nm), 'substring', I(a)), 'immut'), print(V(nm))];
      else if (pat === 1) stmts = [d0, J.exprStmt(call(V(nm), 'substring', I(a), I(b)), 'immut'), print(V(nm))];
      else if (pat === 2) { stmts = [d0, decl('String', 'part', call(V(nm), 'substring', I(a)), 'immut'), print(V(nm))]; return out(stmts, [{ text: w.substring(a), misc: 'mutates' }]); }
      else stmts = [d0, J.exprStmt(call(V(nm), 'substring', I(1)), 'immut'), J.exprStmt(call(V(nm), 'substring', I(0), I(2)), 'immut'), print(V(nm))];
      return out(stmts, []);
    }
  });

  H.register({
    id: 'trace.mixedImmutable', label: 'Discarded results mixed with real updates', mode: 'trace', levels: ['advanced'],
    skill: 'String Immutability', rule: 'immutable', weight: 1.2,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), n = w.length, d0 = decl('String', nm, S(w)), suf = r.pick(H.SUFFIX), pat = r.int(0, 1);
      if (pat === 0) return out([d0, J.exprStmt(call(V(nm), 'substring', I(1)), 'immut'), assign(nm, add(V(nm), S(suf))),
        decl('String', 't', call(V(nm), 'substring', I(2))), print(add(V('t'), V(nm)))], []);
      return out([d0, decl('String', 'u', call(V(nm), 'substring', I(r.int(1, 3)))), assign(nm, add(V(nm), V('u'))),
        J.exprStmt(call(V(nm), 'substring', I(r.int(2, n - 2))), 'immut'), print(V(nm))], []);
    }
  });

  H.register({
    id: 'trace.alias', label: 'Two variables, one String', mode: 'trace', levels: ['intermediate', 'advanced'],
    skill: 'String Immutability', rule: 'alias', weight: 1.4,
    build: function (r, lvl) {
      var p = H.pair(r), a = p[0], b = p[1], w = H.pickW(r, lvl, { max: 7 }), da = decl('String', a, S(w)), db = decl('String', b, V(a));
      if (lvl === 'intermediate') {
        var op = randOp(r, a, w, ['sub1', 'cat', 'pre']);
        return out([da, db, assign(a, op.expr, 'immut'), print(V(b))], []);
      }
      var pat = r.int(0, 1), sep = r.pick(H.SEP1);
      if (pat === 0) return out([da, db, assign(a, add(V(a), call(V(a), 'length'))), assign(b, call(V(b), 'substring', I(1))), print(addAll(V(a), S(sep), V(b)))], []);
      return out([da, db, assign(a, add(V(a), S(r.pick(H.SUFFIX)))), assign(b, add(V(b), call(V(a), 'length'))), print(addAll(V(b), S(sep), V(a)))], []);
    }
  });

  H.register({
    id: 'trace.indexSplit', label: 'Splitting at indexOf()', mode: 'trace', levels: ['advanced'],
    skill: 'Multi-Step String Tracing', rule: 'indexSplit', weight: 1.5,
    build: function (r, lvl) {
      var nm = H.sname(r, ['key']), st = H.startName(r), sep = r.pick(H.SEP1), pat = r.int(0, 1), text, key, w;
      if (pat === 0 && r.chance(0.6)) { var c = H.compound(r); text = c.joined; key = c.b; }
      else {
        w = H.pickW(r, 'advanced');
        var ks = H.keys(w, { mode: 'unique', minLen: 2, maxLen: 4, notAtStart: true, notAtEnd: pat === 1 });
        if (!ks.length) return null;
        text = w; key = r.pick(ks).text;
      }
      var d0 = decl('String', nm, S(text));
      if (pat === 0) return out([d0, decl('int', st, call(V(nm), 'indexOf', S(key))), decl('String', 'part', call(V(nm), 'substring', V(st))),
        assign(nm, call(V(nm), 'substring', I(0), V(st))), print(addAll(V('part'), S(sep), V(nm)))], []);
      return out([d0, decl('String', 'key', S(key)), decl('int', st, call(V(nm), 'indexOf', V('key'))),
        decl('String', 'before', call(V(nm), 'substring', I(0), V(st))),
        decl('String', 'after', call(V(nm), 'substring', add(V(st), call(V('key'), 'length')))),
        print(addAll(V('before'), S(sep), V('after')))], []);
    }
  });

  H.register({
    id: 'trace.numbers', label: 'Numbers in String updates', mode: 'trace', levels: ['intermediate', 'advanced'],
    skill: 'Multi-Step String Tracing', rule: 'concatNumbers', weight: 1.2,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), n = H.iname(r), d0 = decl('String', nm, S(w)), dn = decl('int', n, call(V(nm), 'length'));
      if (lvl === 'intermediate') {
        if (r.chance(0.5)) return out([d0, dn, assign(nm, add(V(nm), V(n))), print(V(nm))], []);
        return out([d0, dn, print(addAll(V(nm), V(n), I(r.int(1, 5))))], []);
      }
      if (r.chance(0.5)) return out([d0, dn, assign(nm, add(call(V(nm), 'substring', I(1)), V(n))), assign(n, mul(V(n), I(2))), print(add(V(nm), V(n)))], []);
      return out([d0, dn, assign(nm, add(V(nm), V(n))), assign(n, add(V(n), call(V(nm), 'length'))), print(addAll(V(n), S(r.pick(H.SEP1)), V(nm)))], []);
    }
  });

  H.register({
    id: 'trace.twoStrings', label: 'Combining two Strings', mode: 'trace', levels: ['intermediate', 'advanced'],
    skill: 'Multi-Step String Tracing', rule: 'sequence', weight: 1.1,
    build: function (r, lvl) {
      var p = H.pair(r), x = p[0], y = p[1], z = 'result';
      var wa = H.pickW(r, lvl, { max: 8 }), wb = H.pickW(r, lvl, { max: 8, exclude: [wa] });
      var dx = decl('String', x, S(wa)), dy = decl('String', y, S(wb));
      if (lvl === 'intermediate') {
        if (r.chance(0.5)) return out([dx, dy, decl('String', z, add(V(y), call(V(x), 'substring', I(r.int(1, 3))))), print(V(z))], []);
        return out([dx, dy, assign(x, add(V(x), V(y))), print(V(x))], []);
      }
      return out([dx, dy, decl('String', z, add(call(V(x), 'substring', I(0), I(2)), call(V(y), 'substring', I(1)))),
        assign(z, add(V(z), call(V(z), 'length'))), print(V(z))], []);
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
