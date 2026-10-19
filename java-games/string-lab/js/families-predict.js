/* String Lab — Mode A "Predict the Output" reasoning families. */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var J = SL.J, H = SL.GenHelpers, W = SL.Words;
  var S = J.S, I = J.I, C = J.C, V = J.V, call = J.call, add = J.add, sub = J.sub, mul = J.mul, addAll = J.addAll;
  var decl = J.decl, print = J.print, out = H.out;

  function L(nm) { return call(V(nm), 'length'); }
  function dropped(w) { return { text: w, misc: 'dropped' }; }

  H.register({
    id: 'predict.concat.single', label: 'Single concatenation', mode: 'predict', levels: ['beginner'],
    skill: 'Concatenation', rule: 'concat', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), pat = r.int(0, 3), suf = r.pick(H.SUFFIX), pre = r.pick(H.PREFIX), n = r.int(2, 9);
      var e, extra;
      if (pat === 0) { e = add(V(nm), S(suf)); extra = [{ text: suf + w, misc: 'order' }, { text: w + ' ' + suf, misc: 'spaceAdded' }, dropped(w)]; }
      else if (pat === 1) { e = add(S(pre), V(nm)); extra = [{ text: w + pre, misc: 'order' }, { text: pre + ' ' + w, misc: 'spaceAdded' }, dropped(w)]; }
      else if (pat === 2) { e = add(V(nm), I(n)); extra = [{ text: n + w, misc: 'order' }, { text: w + ' ' + n, misc: 'spaceAdded' }, dropped(w)]; }
      else { e = add(I(n), V(nm)); extra = [{ text: w + n, misc: 'order' }, { text: n + ' ' + w, misc: 'spaceAdded' }, dropped(w)]; }
      return out([decl('String', nm, S(w)), print(e)], extra);
    }
  });

  H.register({
    id: 'predict.concat.numbers', label: 'Concatenation with numbers', mode: 'predict', levels: ['intermediate'],
    skill: 'Concatenation', rule: 'concatNumbers', weight: 1.4,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), a = r.int(1, 9), b = r.int(1, 9), lab = r.pick(W.LABELS), pat = r.int(0, 7);
      var d0 = decl('String', nm, S(w)), stmts, extra = [];
      switch (pat) {
        case 0: stmts = [d0, print(addAll(V(nm), I(a), I(b)))]; extra.push({ text: w + b + a, misc: 'order' }); break;
        case 1: stmts = [d0, print(addAll(I(a), I(b), V(nm)))]; break;
        case 2: stmts = [d0, print(add(V(nm), add(I(a), I(b))))]; break;
        case 3: stmts = [d0, print(addAll(I(a), V(nm), I(b)))]; extra.push({ text: (a + b) + w, misc: 'sumNumbers' }); break;
        case 4: stmts = [print(addAll(S(lab), I(a), I(b)))]; extra.push({ text: lab + b + a, misc: 'order' }); break;
        case 5: stmts = [print(add(S(lab), add(I(a), I(b))))]; break;
        case 6:
          var n1 = H.iname(r), n2 = H.iname(r, [n1]);
          stmts = [d0, decl('int', n1, I(a)), decl('int', n2, I(b)), print(addAll(V(nm), V(n1), V(n2)))]; break;
        default: stmts = [print(add(S(lab), mul(I(a), I(b))))]; extra.push({ text: lab + a + b, misc: 'allConcat' }); extra.push({ text: lab + (a + b), misc: 'arith' });
      }
      return out(stmts, extra);
    }
  });

  H.register({
    id: 'predict.concat.expr', label: 'Concatenation mixed with length and substring', mode: 'predict', levels: ['advanced'],
    skill: 'Concatenation', rule: 'concatNumbers', weight: 1.2,
    build: function (r, lvl) {
      var p = H.pair(r), x = p[0], y = p[1];
      var wa = H.pickW(r, 'beginner', { max: 6 }), wb = H.pickW(r, 'beginner', { max: 6, exclude: [wa] });
      var pat = r.int(0, 4), lab = r.pick(W.LABELS), tail = r.pick([' chars', ' letters', ' total', ' units']);
      var dx = decl('String', x, S(wa)), dy = decl('String', y, S(wb)), stmts;
      switch (pat) {
        case 0: stmts = [dx, dy, decl('String', 'joined', add(V(x), V(y))), print(addAll(V('joined'), call(V('joined'), 'length'), I(1)))]; break;
        case 1: stmts = [dx, dy, print(addAll(L(x), L(y), S(tail)))]; break;
        case 2: stmts = [dx, dy, print(addAll(S(lab), L(x), L(y)))]; break;
        case 3: stmts = [dx, dy, print(addAll(L(x), V(y), L(y)))]; break;
        default: stmts = [dx, dy, print(add(call(V(x), 'substring', I(0), I(2)), mul(L(y), I(2))))];
      }
      return out(stmts, []);
    }
  });

  H.register({
    id: 'predict.length', label: 'length()', mode: 'predict', levels: ['beginner', 'intermediate'],
    skill: 'Length', rule: 'length', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), k = r.int(1, 3), lab = r.pick(W.LABELS);
      if (lvl === 'beginner') return out([decl('String', nm, S(w)), print(L(nm))], []);
      var p = H.pair(r), wb = H.pickW(r, 'beginner', { exclude: [w] }), pat = r.int(0, 5), stmts;
      switch (pat) {
        case 0: stmts = [decl('String', nm, S(w)), print(add(L(nm), I(k)))]; break;
        case 1: stmts = [decl('String', nm, S(w)), print(sub(L(nm), I(k)))]; break;
        case 2: stmts = [decl('String', nm, S(w)), print(add(S(lab), L(nm)))]; break;
        case 3: stmts = [decl('String', p[0], S(w)), decl('String', p[1], S(wb)), print(add(L(p[0]), L(p[1])))]; break;
        case 4: stmts = [decl('String', p[0], S(w)), decl('String', p[1], S(wb)), print(call(add(V(p[0]), V(p[1])), 'length'))]; break;
        default: stmts = [decl('String', nm, S(w)), print(mul(L(nm), I(2)))];
      }
      return out(stmts, []);
    }
  });

  H.register({
    id: 'predict.charAt', label: 'charAt()', mode: 'predict', levels: ['beginner', 'intermediate'],
    skill: 'Character Indexing', rule: 'charAt', weight: 1.2,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { repeat: lvl === 'intermediate' ? true : undefined }), nm = H.sname(r), n = w.length;
      var d0 = decl('String', nm, S(w));
      if (lvl === 'beginner') {
        var k = r.chance(0.15) ? 0 : r.int(1, n - 1), extra = [];
        if (k + 1 < n) extra.push({ text: w[k + 1], misc: 'nextChar' });
        [n - 1, 0, k + 2].forEach(function (i) { if (i >= 0 && i < n) extra.push({ text: w[i], misc: 'near' }); });
        return out([d0, print(call(V(nm), 'charAt', I(k)))], extra);
      }
      var pat = r.int(0, 3), stmts, ex = [];
      var a = r.int(0, n - 2), b = r.int(a + 1, n - 1);
      if (pat === 0) { stmts = [d0, print(call(V(nm), 'charAt', sub(L(nm), I(1))))]; ex.push({ text: w[n - 2], misc: 'lengthLastIdx' }); }
      else if (pat === 1) { var sp = r.pick(H.SEP1); stmts = [d0, print(addAll(call(V(nm), 'charAt', I(a)), S(sp), call(V(nm), 'charAt', I(b))))]; ex.push({ text: w[b] + sp + w[a], misc: 'order' }); if (b + 1 < n) ex.push({ text: w[a + 1] + sp + w[b + 1], misc: 'nextChar' }); }
      else if (pat === 2) { var lab = r.pick(['Letter: ', 'Char: ', 'Got: ']); stmts = [d0, print(add(S(lab), call(V(nm), 'charAt', I(a))))]; ex.push({ text: lab + w[a + 1], misc: 'nextChar' }); }
      else {
        var cand = H.letterInfo(w).filter(function (li) { return li.first < n - 1; });
        if (!cand.length) return null;
        var li = r.pick(cand);
        stmts = [d0, print(call(V(nm), 'charAt', add(call(V(nm), 'indexOf', S(li.ch)), I(1))))];
        ex.push({ text: li.ch, misc: 'forgotShift' });
      }
      return out(stmts, ex);
    }
  });

  H.register({
    id: 'predict.substring', label: 'substring()', mode: 'predict', levels: ['beginner', 'intermediate'],
    skill: 'Substrings', rule: 'substring', weight: 1.5,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { repeat: lvl === 'intermediate' ? undefined : undefined }), nm = H.sname(r), n = w.length;
      var d0 = decl('String', nm, S(w));
      if (lvl === 'beginner') {
        if (r.chance(0.4)) return out([d0, print(call(V(nm), 'substring', I(r.int(1, n - 2))))], []);
        var a = r.int(0, n - 3), b = r.int(a + 2, n);
        return out([d0, print(call(V(nm), 'substring', I(a), I(b)))], []);
      }
      var p = H.pair(r), wb = H.pickW(r, 'beginner', { exclude: [w] }), pat = r.int(0, 3), stmts;
      if (pat === 0) { var a0 = r.int(0, n - 3), b0 = r.int(a0 + 2, n - 1); stmts = [d0, print(add(call(V(nm), 'substring', I(a0), I(b0)), S(r.pick(H.SUFFIX))))]; }
      else if (pat === 1) stmts = [decl('String', p[0], S(w)), decl('String', p[1], S(wb)), print(add(call(V(p[0]), 'substring', I(0), I(2)), call(V(p[1]), 'substring', I(1))))];
      else if (pat === 2) stmts = [d0, print(call(V(nm), 'substring', sub(L(nm), I(r.int(2, 3)))))];
      else stmts = [d0, print(add(call(V(nm), 'substring', I(0), I(1)), call(V(nm), 'substring', I(r.int(2, n - 2)))))];
      return out(stmts, []);
    }
  });

  H.register({
    id: 'predict.indexOf', label: 'indexOf()', mode: 'predict', levels: ['beginner', 'intermediate'],
    skill: 'Searching', rule: 'indexOf', weight: 1.5,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { repeat: lvl === 'intermediate' ? true : undefined }), nm = H.sname(r), d0 = decl('String', nm, S(w));
      function arg(k) { return k.length === 1 && r.chance(0.5) ? C(k) : S(k); }
      if (lvl === 'beginner') {
        var ks = H.keys(w, { mode: 'unique', minLen: 1, maxLen: 3 });
        var k = r.pick(ks);
        return out([d0, print(call(V(nm), 'indexOf', arg(k.text)))], []);
      }
      var pat = r.int(0, 4), key;
      var reps = H.keys(w, { mode: 'repeated', minLen: 1, maxLen: 3 });
      var anyk = H.keys(w, { minLen: 1, maxLen: 3 });
      if (pat === 0) key = H.absentKey(r, w, r.pick([1, 2]));
      else if (pat === 1) { if (!reps.length) return null; key = r.pick(reps).text; }
      else key = r.chance(0.2) ? H.absentKey(r, w, 1) : r.pick(anyk).text;
      var ix = call(V(nm), 'indexOf', S(key)), stmts;
      if (pat === 0 || pat === 1) stmts = [d0, print(ix)];
      else if (pat === 2) { var pos = H.posName(r); stmts = [d0, decl('int', pos, ix), print(add(V(pos), I(r.int(1, 3))))]; }
      else if (pat === 3) stmts = [d0, print(add(ix, I(1)))];
      else stmts = [d0, print(add(S(r.pick(['Found at ', 'Index: ', 'Position: ', 'Spot '])), ix))];
      return out(stmts, []);
    }
  });

  H.register({
    id: 'predict.chain', label: 'Method chaining', mode: 'predict', levels: ['intermediate', 'advanced'],
    skill: 'Substrings', rule: 'chain', weight: 1.2,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { min: lvl === 'advanced' ? 7 : 6 }), nm = H.sname(r), n = w.length, d0 = decl('String', nm, S(w));
      if (lvl === 'intermediate') {
        var pat = r.int(0, 3), a = r.int(1, 2), stmts;
        if (pat === 0) stmts = [d0, print(call(call(V(nm), 'substring', I(a)), 'length'))];
        else if (pat === 1) { var b = r.int(a + 3, n - 1); stmts = [d0, print(call(call(V(nm), 'substring', I(a), I(b)), 'charAt', I(r.int(0, b - a - 1))))]; }
        else if (pat === 2) stmts = [d0, print(call(call(V(nm), 'substring', I(a)), 'substring', I(r.int(1, 2))))];
        else {
          var tail = w.substring(a), ks = H.keys(tail, { minLen: 1, maxLen: 2 });
          if (!ks.length) return null;
          stmts = [d0, print(call(call(V(nm), 'substring', I(a)), 'indexOf', S(r.pick(ks).text)))];
        }
        return out(stmts, []);
      }
      var pat2 = r.int(0, 1);
      if (pat2 === 0) {
        var a2 = r.int(1, 3), t = w.substring(a2); if (t.length < 5) return null;
        var b2 = r.int(0, 1), c2 = r.int(b2 + 2, t.length - 1);
        return out([d0, decl('String', 't', call(V(nm), 'substring', I(a2))), decl('String', 'u', call(V('t'), 'substring', I(b2), I(c2))),
          print(add(V('u'), call(V('t'), 'length')))], []);
      }
      var ks2 = H.keys(w, { mode: 'unique', minLen: 2, maxLen: 3, notAtStart: true });
      ks2 = ks2.filter(function (k) { return w.length - k.first >= 3; });
      if (!ks2.length) return null;
      var key = r.pick(ks2).text;
      return out([d0, decl('String', 't', call(V(nm), 'substring', call(V(nm), 'indexOf', S(key)))),
        print(add(call(V('t'), 'substring', I(1)), call(V('t'), 'length')))], []);
    }
  });

  H.register({
    id: 'predict.indexSubstring', label: 'indexOf() combined with substring()', mode: 'predict', levels: ['intermediate', 'advanced'],
    skill: 'Searching', rule: 'indexSubstring', weight: 1.4,
    build: function (r, lvl) {
      var nm = H.sname(r), st = H.startName(r), sep = r.pick(H.SEP1);
      if (lvl === 'intermediate') {
        var w = H.pickW(r, lvl), ks = H.keys(w, { minLen: 1, maxLen: 3, notAtStart: true, mode: 'unique' });
        if (!ks.length) return null;
        var key = r.pick(ks).text, ix = call(V(nm), 'indexOf', S(key));
        var e = r.chance(0.5) ? call(V(nm), 'substring', ix) : call(V(nm), 'substring', I(0), ix);
        return out([decl('String', nm, S(w)), print(e)], []);
      }
      var pat = r.int(0, 2), text, key2, start;
      if (pat < 2 && r.chance(0.6)) { var c = H.compound(r); text = c.joined; key2 = c.b; }
      else {
        var w2 = H.pickW(r, 'advanced'), ks2 = H.keys(w2, { mode: 'unique', minLen: 2, maxLen: 4, notAtStart: true, notAtEnd: true });
        if (!ks2.length) return null;
        text = w2; key2 = r.pick(ks2).text;
      }
      start = text.indexOf(key2);
      var d0 = decl('String', nm, S(text));
      if (pat === 0) return out([d0, decl('int', st, call(V(nm), 'indexOf', S(key2))),
        print(addAll(call(V(nm), 'substring', I(0), V(st)), S(sep), call(V(nm), 'substring', V(st))))], []);
      if (pat === 1) return out([d0, decl('int', st, call(V(nm), 'indexOf', S(key2))),
        print(addAll(call(V(nm), 'substring', V(st)), S(sep), V(st)))], []);
      if (start + key2.length >= text.length) return null;
      return out([d0, decl('String', 'key', S(key2)), decl('int', st, call(V(nm), 'indexOf', V('key'))),
        print(call(V(nm), 'substring', I(0), add(V(st), call(V('key'), 'length'))))], []);
    }
  });

  H.register({
    id: 'predict.twoStrings', label: 'Two String variables', mode: 'predict', levels: ['intermediate'],
    skill: 'Concatenation', rule: 'concat', weight: 1,
    build: function (r, lvl) {
      var p = H.pair(r), x = p[0], y = p[1];
      var wa = H.pickW(r, lvl), wb = H.pickW(r, lvl, { exclude: [wa] });
      var pat = r.int(0, 2), e, extra = [];
      var dx = decl('String', x, S(wa)), dy = decl('String', y, S(wb));
      if (pat === 0) { var sp = r.pick(H.SEP1); e = addAll(V(x), S(sp), V(y)); extra.push({ text: wb + sp + wa, misc: 'order' }, { text: x + sp + y, misc: 'quotedVar' }); }
      else if (pat === 1) { e = add(V(y), V(x)); extra.push({ text: wa + wb, misc: 'order' }, { text: wb + ' ' + wa, misc: 'spaceAdded' }); }
      else { e = add(call(V(x), 'charAt', I(0)), call(V(y), 'substring', I(1))); extra.push({ text: wa[0] + wb, misc: 'near' }, { text: wb[0] + wa.substring(1), misc: 'order' }); }
      return out([dx, dy, print(e)], extra);
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
