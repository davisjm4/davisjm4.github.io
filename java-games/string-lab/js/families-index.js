/* String Lab — Mode B "Find the Index" reasoning families.
 * The code panel for these questions never shows index labels; the indexed view appears only in feedback. */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var J = SL.J, H = SL.GenHelpers;
  var S = J.S, I = J.I, C = J.C, V = J.V, call = J.call, add = J.add, sub = J.sub;
  var decl = J.decl, print = J.print;

  function ints(list) { return list.filter(function (c) { return c.n >= 0; }); }

  H.register({
    id: 'index.charPosition', label: 'Index of a character', mode: 'index', levels: ['beginner', 'intermediate'],
    skill: 'Character Indexing', rule: 'indexOf', weight: 1.4,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { repeat: lvl === 'intermediate' ? true : undefined }), nm = H.sname(r), n = w.length;
      var info = H.letterInfo(w), pool = info.filter(function (li) { return lvl === 'beginner' ? li.count === 1 : li.count > 1; });
      if (!pool.length) return null;
      var li = r.pick(pool), stmts = [decl('String', nm, S(w))];
      var qExpr = call(V(nm), 'indexOf', C(li.ch));
      if (lvl === 'beginner') {
        return H.numQuestion({ stmts: stmts, qExpr: qExpr, answer: li.first,
          prompt: 'What index contains the character `\'' + li.ch + '\'` in `' + nm + '`?',
          cands: ints([{ n: li.first + 1, misc: 'oneBased' }, { n: n - 1 - li.first, misc: 'fromEnd' }, { n: li.first - 1, misc: 'near' }, { n: li.first + 2, misc: 'near' }]) });
      }
      return H.numQuestion({ stmts: stmts, qExpr: qExpr, answer: li.first,
        prompt: 'What is the first index that contains the character `\'' + li.ch + '\'` in `' + nm + '`?',
        cands: ints([{ n: li.last, misc: 'lastOccurrence' }, { n: li.first + 1, misc: 'oneBasedFind' }, { n: li.last + 1, misc: 'oneBasedFind' }, { n: li.first - 1, misc: 'near' }]) });
    }
  });

  H.register({
    id: 'index.indexOfCall', label: 'What indexOf() returns', mode: 'index', levels: ['beginner', 'intermediate'],
    skill: 'Searching', rule: 'indexOf', weight: 1.5,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { repeat: lvl === 'intermediate' ? undefined : undefined }), nm = H.sname(r), n = w.length;
      var stmts = [decl('String', nm, S(w))], key, first, cands, mode = lvl === 'beginner' ? 'unique' : r.pick(['repeated', 'absent']);
      if (mode === 'absent') {
        key = H.absentKey(r, w, r.pick([1, 2])); first = -1;
        cands = [{ n: 0, misc: 'notFoundZero' }, { n: n, misc: 'notFoundLength' }, { n: 1, misc: 'near' }, { n: -2, misc: 'near' }];
      } else {
        var ks = H.keys(w, { mode: mode, minLen: 1, maxLen: 3 });
        if (!ks.length) return null;
        var k = r.pick(ks); key = k.text; first = k.first;
        cands = [{ n: k.last, misc: 'lastOccurrence' }, { n: first + 1, misc: 'oneBasedFind' }, { n: first + key.length, misc: 'matchEnd' }, { n: first - 1, misc: 'near' }];
        if (mode === 'unique') cands = cands.filter(function (c) { return c.misc !== 'lastOccurrence'; });
      }
      var arg = key.length === 1 && r.chance(0.4) ? C(key) : S(key);
      var shown = J.render.expr(call(V(nm), 'indexOf', arg));
      return H.numQuestion({ stmts: stmts, qExpr: call(V(nm), 'indexOf', arg), answer: first,
        prompt: 'What does `' + shown + '` return?',
        cands: cands.filter(function (c) { return c.n >= -1; }) });
    }
  });

  H.register({
    id: 'index.beginIndex', label: 'Choosing the substring begin index', mode: 'index', levels: ['beginner'],
    skill: 'Substrings', rule: 'substring', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { min: 5 }), nm = H.sname(r), len = w.length, a = r.int(1, len - 3), target = w.substring(a);
      var stmts = [decl('String', nm, S(w))];
      function p(n) { return stmts.concat([print(call(V(nm), 'substring', I(n)))]); }
      var raw = [{ n: a + 1, misc: 'startLate' }, { n: a - 1, misc: 'startEarly' }, { n: target.length, misc: 'lengthOnly' }, { n: a + 2, misc: 'near' }, { n: a - 2, misc: 'near' }];
      var cands = [], probes = [{ text: String(a), stmts: p(a), expect: target, kind: 'correct' }];
      raw.forEach(function (c) {
        if (c.n < 0 || c.n > len || c.n === a) return;
        var res = w.substring(c.n); if (res === target) return;
        cands.push({ text: String(c.n), misc: c.misc });
        probes.push({ text: String(c.n), stmts: p(c.n), expect: res, kind: 'distractor' });
      });
      return { type: 'custom', kind: 'index', stmts: stmts, analysis: p(a), twists: 0,
        prompt: 'Which begin index makes `' + nm + '.substring(?)` return `"' + target + '"`?',
        answer: String(a), choiceKind: 'output', isNumber: true, candidates: cands, probes: probes, meta: { resultKind: 'substring' } };
    }
  });

  H.register({
    id: 'index.firstOccurrence', label: 'First occurrence of repeated text', mode: 'index', levels: ['intermediate'],
    skill: 'Searching', rule: 'indexOf', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { repeat: true, min: 6 }), nm = H.sname(r);
      var ks = H.keys(w, { mode: 'repeated', minLen: 1, maxLen: 3 });
      if (!ks.length) return null;
      var k = r.pick(ks);
      return H.numQuestion({ stmts: [decl('String', nm, S(w))], qExpr: call(V(nm), 'indexOf', S(k.text)), answer: k.first,
        prompt: 'At which index does `"' + k.text + '"` first appear in `' + nm + '`?',
        cands: ints([{ n: k.last, misc: 'lastOccurrence' }, { n: k.first + 1, misc: 'oneBasedFind' }, { n: k.first + k.text.length, misc: 'matchEnd' }, { n: k.last + 1, misc: 'oneBasedFind' }]) });
    }
  });

  H.register({
    id: 'index.whichNegativeOne', label: 'Which search fails (-1)', mode: 'index', levels: ['intermediate'],
    skill: 'Searching', rule: 'notFound', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r);
      var present = H.keys(w, { minLen: 1, maxLen: 3 });
      if (present.length < 3) return null;
      var picks = r.shuffle(present).slice(0, 3).map(function (k) { return k.text; });
      var absent;
      var style = r.int(0, 2);
      if (style === 0) absent = H.cap(w[r.int(0, w.length - 1)]);               // case-sensitive miss
      else if (style === 1) { var seg = w.substr(r.int(0, w.length - 3), 3); absent = seg.split('').reverse().join(''); if (w.indexOf(absent) >= 0) absent = H.absentKey(r, w, 2); }
      else absent = H.absentKey(r, w, r.pick([1, 2]));
      if (w.indexOf(absent) >= 0) return null;
      var stmts = [decl('String', nm, S(w))];
      var cexpr = function (t) { return call(V(nm), 'indexOf', S(t)); };
      var probes = [], cands = [];
      var allTexts = picks.concat([absent]);
      var correctText = J.render.expr(cexpr(absent));
      allTexts.forEach(function (t) {
        var ex = cexpr(t), text = J.render.expr(ex), prog = stmts.concat([print(ex)]);
        probes.push({ text: text, stmts: prog, expect: String(w.indexOf(t)), kind: t === absent ? 'correct' : 'distractor' });
        if (t !== absent) cands.push({ text: text, misc: 'present' });
      });
      return { type: 'custom', kind: 'index', stmts: stmts, analysis: stmts.concat([print(cexpr(absent))]),
        prompt: 'Which call returns `-1`?', answer: correctText, choiceKind: 'code', isNumber: false, twists: 0,
        candidates: cands, probes: probes, meta: { resultKind: 'int' } };
    }
  });

  H.register({
    id: 'index.endIndex', label: 'Choosing the substring end index', mode: 'index', levels: ['intermediate', 'advanced'],
    skill: 'Substrings', rule: 'endExclusive', weight: 1.6,
    build: function (r, lvl) {
      var nm = H.sname(r), st = 'start';
      function subProbe(stmts, startExpr, n, target) {
        return stmts.concat([print(call(V(nm), 'substring', startExpr, I(n)))]);
      }
      if (lvl === 'intermediate') {
        var w = H.pickW(r, lvl), len = w.length, a = r.int(0, len - 4), toEnd = r.chance(0.3);
        var b = toEnd ? len : r.int(a + 2, Math.min(len - 1, a + 4));
        var target = w.substring(a, b), stmts = [decl('String', nm, S(w))];
        var raw = toEnd
          ? [{ n: len - 1, misc: 'lengthLastIdx' }, { n: len - 2, misc: 'near' }, { n: a + 1, misc: 'near' }]
          : [{ n: b - 1, misc: 'inclusiveEnd' }, { n: target.length, misc: 'lengthOnly' }, { n: b + 1, misc: 'near' }, { n: b + 2, misc: 'near' }, { n: b - 2, misc: 'near' }];
        var ok = [], probes = [{ text: String(b), stmts: subProbe(stmts, I(a), b), expect: target, kind: 'correct' }];
        raw.forEach(function (c) {
          if (c.n < a || c.n > len || c.n === b) return;
          var res = w.substring(a, c.n);
          if (res === target) return;
          ok.push({ text: String(c.n), misc: c.misc });
          probes.push({ text: String(c.n), stmts: subProbe(stmts, I(a), c.n), expect: res, kind: 'distractor' });
        });
        return { type: 'custom', kind: 'index', stmts: stmts, analysis: subProbe(stmts, I(a), b), twists: 1,
          prompt: toEnd ? 'Which ending index makes `' + nm + '.substring(' + a + ', ?)` return everything from index ' + a + ' through the end of `' + nm + '`?'
            : 'Which ending index makes `' + nm + '.substring(' + a + ', ?)` return `"' + target + '"`?',
          answer: String(b), choiceKind: 'output', isNumber: true, candidates: ok, probes: probes, meta: { resultKind: 'substring' } };
      }
      // advanced: start comes from indexOf, end must be start + key.length()
      var text, key;
      if (r.chance(0.4)) { var c = H.compound(r); text = c.joined; key = c.b; }
      else {
        var w2 = H.pickW(r, 'advanced'), ks = H.keys(w2, { mode: 'unique', minLen: 2, maxLen: 4, notAtStart: true, notAtEnd: true });
        if (!ks.length) return null;
        text = w2; key = r.pick(ks).text;
      }
      var start = text.indexOf(key), E = start + key.length;
      var stmts2 = [decl('String', nm, S(text)), decl('int', st, call(V(nm), 'indexOf', S(key)))];
      var analysis = stmts2.concat([print(call(V(nm), 'substring', V(st), add(V(st), call(S(key), 'length'))))]);
      var raw2 = [{ n: E - 1, misc: 'inclusiveEnd' }, { n: key.length, misc: 'lengthOnly' }, { n: E + 1, misc: 'near' }, { n: E + 2, misc: 'near' }, { n: start + 1, misc: 'near' }];
      var ok2 = [], probes2 = [{ text: String(E), stmts: stmts2.concat([print(call(V(nm), 'substring', V(st), I(E)))]), expect: key, kind: 'correct' }];
      raw2.forEach(function (c) {
        if (c.n < start || c.n > text.length || c.n === E) return;
        var res = text.substring(start, c.n);
        if (res === key) return;
        ok2.push({ text: String(c.n), misc: c.misc });
        probes2.push({ text: String(c.n), stmts: stmts2.concat([print(call(V(nm), 'substring', V(st), I(c.n)))]), expect: res, kind: 'distractor' });
      });
      return { type: 'custom', kind: 'index', stmts: stmts2, analysis: analysis, twists: 0,
        prompt: '`' + st + '` holds the index where `"' + key + '"` begins. Which value of `end` makes `' + nm + '.substring(' + st + ', end)` return exactly `"' + key + '"`?',
        answer: String(E), choiceKind: 'output', isNumber: true, candidates: ok2, probes: probes2, meta: { resultKind: 'substring', expr: st + ' + "' + key + '".length()' } };
    }
  });

  H.register({
    id: 'index.shifted', label: 'Index inside a new substring', mode: 'index', levels: ['intermediate', 'advanced'],
    skill: 'Searching', rule: 'indexRelative', weight: 1.5,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { min: lvl === 'advanced' ? 8 : 6 }), nm = H.sname(r, ['rest', 'tail']), n = w.length;
      var a = r.int(2, 3), rest = w.substring(a), stmts = [decl('String', nm, S(w)), decl('String', 'rest', call(V(nm), 'substring', I(a)))];
      var holder = 'rest', held = rest, shift = a, qs = stmts;
      if (lvl === 'advanced') {
        var b = r.int(1, 2); if (rest.length < b + 3) return null;
        held = rest.substring(b); holder = 'tail'; shift = a + b;
        qs = stmts.concat([decl('String', 'tail', call(V('rest'), 'substring', I(b)))]);
      }
      var ks = H.keys(held, { mode: 'unique', minLen: 1, maxLen: 2 });
      if (!ks.length) return null;
      var k = r.pick(ks), idx = held.indexOf(k.text), orig = idx + shift;
      var cands = [{ n: orig, misc: 'originalIndex' }, { n: idx + 1, misc: 'oneBasedFind' }, { n: idx + (shift - a), misc: 'originalIndex' }, { n: idx - 1, misc: 'near' }, { n: idx + 2, misc: 'near' }];
      var arg = S(k.text);
      return H.numQuestion({ stmts: qs, qExpr: call(V(holder), 'indexOf', arg), answer: idx,
        prompt: 'What does `' + holder + '.indexOf("' + k.text + '")` return?', cands: ints(cands) });
    }
  });

  H.register({
    id: 'index.lastIndex', label: 'Index of the last character', mode: 'index', levels: ['intermediate'],
    skill: 'Length', rule: 'lastIndex', weight: 0.9,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), n = w.length;
      return H.numQuestion({ stmts: [decl('String', nm, S(w))], qExpr: sub(call(V(nm), 'length'), I(1)), answer: n - 1,
        prompt: r.chance(0.5) ? 'What is the index of the last character of `' + nm + '`?' : 'The last character of `' + nm + '` is at which index?',
        cands: [{ n: n, misc: 'lengthAsIndex' }, { n: n - 2, misc: 'near' }, { n: n + 1, misc: 'near' }, { n: 1, misc: 'near' }] });
    }
  });

  H.register({
    id: 'index.charThenSearch', label: 'Search for a character you just read', mode: 'index', levels: ['advanced'],
    skill: 'Searching', rule: 'firstOccurrenceNested', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { repeat: true }), nm = H.sname(r), n = w.length, back = r.int(1, 4), pos = n - back, ch = w[pos];
      var first = w.indexOf(ch), pn = r.pick(['last', 'spot', 'target', 'where']);
      if (first === pos) return null;
      var stmts = [decl('String', nm, S(w)), decl('int', pn, sub(call(V(nm), 'length'), I(back)))];
      return H.numQuestion({ stmts: stmts, qExpr: call(V(nm), 'indexOf', call(V(nm), 'charAt', V(pn))), answer: first,
        prompt: 'What does `' + nm + '.indexOf(' + nm + '.charAt(' + pn + '))` return?',
        cands: [{ n: pos, misc: 'sameAsLast' }, { n: first + 1, misc: 'oneBasedFind' }, { n: n, misc: 'lengthAsIndex' }, { n: first + 2, misc: 'near' }, { n: first - 1, misc: 'near' }].filter(function (c) { return c.n >= 0; }) });
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
