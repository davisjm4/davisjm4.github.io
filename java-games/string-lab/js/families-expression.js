/* String Lab — Mode C "Complete the Expression" reasoning families.
 * Every answer choice is compiled into a full program and evaluated: wrong choices are valid Java
 * that produce a different value from the goal. Students choose; they never type code. */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var J = SL.J, H = SL.GenHelpers, W = SL.Words;
  var S = J.S, I = J.I, V = J.V, call = J.call, add = J.add, sub = J.sub, mul = J.mul, addAll = J.addAll;
  var decl = J.decl;
  var ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];

  function charAt(nm, e) { return call(V(nm), 'charAt', typeof e === 'number' ? I(e) : e); }
  function subs(nm, a, b) {
    var args = [typeof a === 'number' ? I(a) : a];
    if (b !== undefined) args.push(typeof b === 'number' ? I(b) : b);
    return call.apply(null, [V(nm), 'substring'].concat(args));
  }
  function L(nm) { return call(V(nm), 'length'); }

  H.register({
    id: 'expr.char', label: 'Choose the charAt() expression', mode: 'expr', levels: ['beginner', 'intermediate'],
    skill: 'Character Indexing', rule: 'charAt', weight: 1.3,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r), n = w.length, pre = [decl('String', nm, S(w))];
      if (lvl === 'beginner') {
        var k = r.int(0, Math.min(n - 1, 6));
        return H.exprQuestion({ pre: pre, type: 'char', name: 'letter', correct: charAt(nm, k),
          goal: 'Store the ' + ORD[k] + ' character of `' + nm + '` in `letter`.',
          wrongs: [{ expr: charAt(nm, k + 1), misc: 'oneBased' }, { expr: charAt(nm, k - 1), misc: 'offByOne' }, { expr: charAt(nm, k + 2), misc: 'near' },
            { expr: charAt(nm, 0), misc: 'near' }, { expr: charAt(nm, n - 1), misc: 'near' }] });
      }
      if (r.chance(0.5)) {
        return H.exprQuestion({ pre: pre, type: 'char', name: 'letter', correct: charAt(nm, sub(L(nm), I(1))),
          goal: 'Store the last character of `' + nm + '` in `letter`.',
          wrongs: [{ expr: charAt(nm, sub(L(nm), I(2))), misc: 'offByOne' }, { expr: charAt(nm, sub(L(nm), I(3))), misc: 'near' },
            { expr: charAt(nm, 0), misc: 'near' }, { expr: charAt(nm, I(1)), misc: 'near' }] });
      }
      var cand = H.letterInfo(w).filter(function (li) { return li.count === 1 && li.first < n - 2; });
      if (!cand.length) return null;
      var li = r.pick(cand), ix = call(V(nm), 'indexOf', S(li.ch));
      return H.exprQuestion({ pre: pre, type: 'char', name: 'letter', correct: charAt(nm, add(ix, I(1))),
        goal: 'Store the character that comes right after the `"' + li.ch + '"` in `' + nm + '`.',
        wrongs: [{ expr: charAt(nm, ix), misc: 'forgotShift' }, { expr: charAt(nm, sub(ix, I(1))), misc: 'near' },
          { expr: charAt(nm, add(ix, I(2))), misc: 'near' }, { expr: charAt(nm, add(ix, I(3))), misc: 'near' }] });
    }
  });

  H.register({
    id: 'expr.substring', label: 'Choose the substring(begin, end) expression', mode: 'expr', levels: ['beginner'],
    skill: 'Substrings', rule: 'substring', weight: 1.6,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { min: 6 }), nm = H.sname(r), n = w.length;
      var a = r.int(0, n - 4), b = r.int(a + 2, Math.min(n, a + 4)), t = w.substring(a, b);
      return H.exprQuestion({ pre: [decl('String', nm, S(w))], type: 'String', name: 'result', correct: subs(nm, a, b),
        goal: 'Extract `"' + t + '"` from `' + nm + '` and store it in `result`.',
        wrongs: [{ expr: subs(nm, a, b + 1), misc: 'inclusiveEnd' }, { expr: subs(nm, a, b - 1), misc: 'offByOne' },
          { expr: subs(nm, a - 1, b), misc: 'startEarly' }, { expr: subs(nm, a + 1, b), misc: 'startLate' }] });
    }
  });

  H.register({
    id: 'expr.length', label: 'Choose the length() expression', mode: 'expr', levels: ['beginner', 'intermediate'],
    skill: 'Length', rule: 'length', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl), nm = H.sname(r);
      if (lvl === 'beginner') {
        return H.exprQuestion({ pre: [decl('String', nm, S(w))], type: 'int', name: 'size', correct: L(nm),
          goal: 'Store the number of characters in `' + nm + '` in `size`.',
          wrongs: [{ expr: sub(L(nm), I(1)), misc: 'lengthLastIdx' }, { expr: add(L(nm), I(1)), misc: 'lengthPlus' },
            { expr: mul(L(nm), I(2)), misc: 'near' }, { expr: sub(L(nm), I(2)), misc: 'near' }] });
      }
      var pat = r.int(0, 1);
      if (pat === 0) {
        return H.exprQuestion({ pre: [decl('String', nm, S(w))], type: 'int', name: 'last', correct: sub(L(nm), I(1)),
          goal: 'Store the index of the last character of `' + nm + '` in `last`.',
          wrongs: [{ expr: L(nm), misc: 'lengthAsIndex' }, { expr: sub(L(nm), I(2)), misc: 'offByOne' }, { expr: add(L(nm), I(1)), misc: 'near' }, { expr: I(1), misc: 'near' }] });
      }
      var p = H.pair(r), wb = H.pickW(r, 'beginner', { exclude: [w] });
      return H.exprQuestion({ pre: [decl('String', p[0], S(w)), decl('String', p[1], S(wb))], type: 'int', name: 'size',
        correct: add(L(p[0]), L(p[1])), goal: 'Store the total number of characters in `' + p[0] + '` and `' + p[1] + '` in `size`.',
        wrongs: [{ expr: L(p[0]), misc: 'partial' }, { expr: L(p[1]), misc: 'partial' }, { expr: mul(L(p[0]), L(p[1])), misc: 'arith' },
          { expr: sub(add(L(p[0]), L(p[1])), I(1)), misc: 'lengthLastIdx' }] });
    }
  });

  H.register({
    id: 'expr.find', label: 'Choose the indexOf() expression', mode: 'expr', levels: ['beginner', 'intermediate'],
    skill: 'Searching', rule: 'indexOf', weight: 1.3,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { repeat: lvl === 'intermediate' ? true : undefined, min: 6 }), nm = H.sname(r);
      var ks = H.keys(w, { mode: lvl === 'beginner' ? 'unique' : 'repeated', minLen: lvl === 'beginner' ? 2 : 1, maxLen: 3 });
      if (!ks.length) return null;
      var k = r.pick(ks), key = k.text, ix = function (t) { return call(V(nm), 'indexOf', S(t)); };
      var wrongs = [{ expr: add(ix(key), I(1)), misc: 'oneBasedFind' }, { expr: add(ix(key), I(key.length)), misc: 'matchEnd' },
        { expr: ix(key.slice(0, -1)), misc: 'partial' }, { expr: ix(key.slice(1)), misc: 'partial' }, { expr: sub(ix(key), I(1)), misc: 'near' }];
      return H.exprQuestion({ pre: [decl('String', nm, S(w))], type: 'int', name: 'position', correct: ix(key),
        goal: 'Store the index where `"' + key + '"` first appears in `' + nm + '` in `position`.', wrongs: wrongs });
    }
  });

  H.register({
    id: 'expr.concat', label: 'Choose the concatenation expression', mode: 'expr', levels: ['beginner', 'intermediate', 'advanced'],
    skill: 'Concatenation', rule: 'concat', weight: 1.4,
    build: function (r, lvl) {
      if (lvl === 'beginner') {
        var nm = r.pick(['name', 'friend', 'pet']), who = r.pick(W.NAMES);
        if (r.chance(0.5)) {
          var g = r.pick(W.GREETINGS);
          return H.exprQuestion({ pre: [decl('String', nm, S(who))], type: 'String', name: 'greeting', correct: add(S(g), V(nm)),
            goal: 'Store `"' + g + who + '"` in `greeting`, using the variable `' + nm + '`.',
            wrongs: [{ expr: add(V(nm), S(g)), misc: 'order' }, { expr: add(S(g), S(nm)), misc: 'quotedVar' },
              { expr: addAll(S(g), V(nm), V(nm)), misc: 'near' }, { expr: V(nm), misc: 'dropped' }] });
        }
        var sf = r.pick(W.PUNCT_SUFFIXES);
        return H.exprQuestion({ pre: [decl('String', nm, S(who))], type: 'String', name: 'shout', correct: add(V(nm), S(sf)),
          goal: 'Store `"' + who + sf + '"` in `shout`, using the variable `' + nm + '`.',
          wrongs: [{ expr: add(S(sf), V(nm)), misc: 'order' }, { expr: add(S(nm), S(sf)), misc: 'quotedVar' },
            { expr: addAll(V(nm), V(nm), S(sf)), misc: 'near' }, { expr: V(nm), misc: 'dropped' }] });
      }
      if (lvl === 'intermediate') {
        if (r.chance(0.5)) {
          var lab = r.pick(['Room', 'Level', 'Item', 'Page', 'Team', 'Step', 'Lap']), num = r.int(10, 499);
          return H.exprQuestion({ pre: [decl('String', 'label', S(lab)), decl('int', 'number', I(num))], type: 'String', name: 'text',
            correct: addAll(V('label'), S(' '), V('number')), goal: 'Store `"' + lab + ' ' + num + '"` in `text`, using `label` and `number`.',
            wrongs: [{ expr: add(V('label'), V('number')), misc: 'missingSpace' }, { expr: addAll(V('number'), S(' '), V('label')), misc: 'order' },
              { expr: addAll(V('label'), S(' '), S('number')), misc: 'quotedVar' }, { expr: addAll(V('label'), S(' '), V('number'), I(1)), misc: 'near' }] });
        }
        var a = r.int(2, 9), b = r.int(2, 9), lb = r.pick(['Total: ', 'Sum: ', 'Score: ']);
        var n1 = H.iname(r), n2 = H.iname(r, [n1]);
        return H.exprQuestion({ pre: [decl('int', n1, I(a)), decl('int', n2, I(b))], type: 'String', name: 'text',
          correct: add(S(lb), add(V(n1), V(n2))), goal: 'Store `"' + lb + (a + b) + '"` in `text`: the label followed by the SUM of `' + n1 + '` and `' + n2 + '`.',
          wrongs: [{ expr: addAll(S(lb), V(n1), V(n2)), misc: 'needParens' }, { expr: addAll(V(n1), V(n2), S(lb)), misc: 'order' },
            { expr: add(S(lb), mul(V(n1), V(n2))), misc: 'arith' }, { expr: add(S(lb), sub(V(n1), V(n2))), misc: 'near' }] });
      }
      var p = H.pair(r), x = p[0], y = p[1], wa = H.pickW(r, 'beginner', { max: 5 }), wb = H.pickW(r, 'beginner', { max: 5, exclude: [wa] });
      var both = add(V(x), V(y)), colon = S(':');
      return H.exprQuestion({ pre: [decl('String', x, S(wa)), decl('String', y, S(wb))], type: 'String', name: 'summary',
        correct: addAll(V(x), V(y), colon, call(both, 'length')),
        goal: 'Store the combined text of `' + x + '` and `' + y + '`, then a colon, then the length of the combined text.',
        wrongs: [{ expr: addAll(V(x), V(y), colon, L(x), L(y)), misc: 'needParens' }, { expr: addAll(V(x), V(y), colon, L(x)), misc: 'partial' },
          { expr: addAll(V(x), colon, call(both, 'length')), misc: 'dropped' }, { expr: add(addAll(V(x), V(y), colon, call(both, 'length')), I(1)), misc: 'near' }] });
    }
  });

  H.register({
    id: 'expr.tail', label: 'Choose the substring that returns a tail', mode: 'expr', levels: ['beginner', 'intermediate'],
    skill: 'Substrings', rule: 'substring', weight: 1.2,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { min: 6 }), nm = H.sname(r), n = w.length, pre = [decl('String', nm, S(w))];
      if (lvl === 'beginner') {
        var k = r.int(1, 3);
        return H.exprQuestion({ pre: pre, type: 'String', name: 'rest', correct: subs(nm, k),
          goal: 'Store everything from index ' + k + ' to the end of `' + nm + '` in `rest`.',
          wrongs: [{ expr: subs(nm, k + 1), misc: 'startLate' }, { expr: subs(nm, k - 1), misc: 'startEarly' }, { expr: subs(nm, 0, k), misc: 'wrongPart' },
            { expr: subs(nm, k, sub(L(nm), I(1))), misc: 'lengthLastIdx' }] });
      }
      var N = r.int(2, 3);
      return H.exprQuestion({ pre: pre, type: 'String', name: 'ending', correct: subs(nm, sub(L(nm), I(N))),
        goal: 'Store the last ' + N + ' characters of `' + nm + '` in `ending`.',
        wrongs: [{ expr: subs(nm, N), misc: 'wrongPart' }, { expr: subs(nm, add(sub(L(nm), I(N)), I(1))), misc: 'offByOne' },
          { expr: subs(nm, sub(sub(L(nm), I(N)), I(1))), misc: 'offByOne' }, { expr: subs(nm, I(0), sub(L(nm), I(N))), misc: 'wrongPart' }] });
    }
  });

  H.register({
    id: 'expr.split', label: 'Combine indexOf() and substring()', mode: 'expr', levels: ['intermediate', 'advanced'],
    skill: 'Searching', rule: 'indexSubstring', weight: 1.6,
    build: function (r, lvl) {
      var nm = H.sname(r, ['key']), st = H.startName(r), w, key;
      if (lvl === 'intermediate' || r.chance(0.5)) {
        if (r.chance(0.2)) { var c = H.compound(r); w = c.joined; key = c.b; }
        else { w = H.pickW(r, 'advanced'); var ks = H.keys(w, { mode: 'unique', minLen: 2, maxLen: 4, notAtStart: true, notAtEnd: true }); if (!ks.length) return null; key = r.pick(ks).text; }
      } else { w = H.pickW(r, 'advanced'); var ks2 = H.keys(w, { mode: 'unique', minLen: 2, maxLen: 4, notAtStart: true, notAtEnd: true }); if (!ks2.length) return null; key = r.pick(ks2).text; }
      var start = w.indexOf(key);
      var ix = call(V(nm), 'indexOf', S(key));
      var pre = [decl('String', nm, S(w)), decl('int', st, ix)], s = V(st);
      if (lvl === 'intermediate') {
        if (start < 2) return null;
        return H.exprQuestion({ pre: pre, type: 'String', name: 'before', correct: subs(nm, I(0), s),
          goal: 'Store the part of `' + nm + '` that comes before `"' + key + '"` in `before`. (`' + st + '` holds where `"' + key + '"` begins.)',
          wrongs: [{ expr: subs(nm, s), misc: 'wrongPart' }, { expr: subs(nm, I(0), add(s, I(1))), misc: 'inclusiveEnd' },
            { expr: subs(nm, I(0), sub(s, I(1))), misc: 'offByOne' }, { expr: subs(nm, I(1), s), misc: 'startLate' }] });
      }
      if (start + key.length >= w.length || start < 2) return null;
      if (r.chance(0.5)) {
        return H.exprQuestion({ pre: pre, type: 'String', name: 'swapped', correct: add(subs(nm, s), subs(nm, I(0), s)),
          goal: 'Store a new String that begins with the part starting at `"' + key + '"` and then adds the part that came before it.',
          wrongs: [{ expr: add(subs(nm, I(0), s), subs(nm, s)), misc: 'order' }, { expr: add(subs(nm, add(s, I(1))), subs(nm, I(0), s)), misc: 'startLate' },
            { expr: add(subs(nm, s), subs(nm, I(0), add(s, I(1)))), misc: 'inclusiveEnd' }, { expr: add(subs(nm, s), subs(nm, I(1), s)), misc: 'startLate' }] });
      }
      var pre2 = [decl('String', nm, S(w)), decl('String', 'key', S(key)), decl('int', st, call(V(nm), 'indexOf', V('key')))];
      var after = add(s, call(V('key'), 'length'));
      return H.exprQuestion({ pre: pre2, type: 'String', name: 'after', correct: subs(nm, after),
        goal: 'Store the part of `' + nm + '` that comes after the key text in `after`.',
        wrongs: [{ expr: subs(nm, sub(after, I(1))), misc: 'offByOne' }, { expr: subs(nm, add(s, I(1))), misc: 'startLate' },
          { expr: subs(nm, call(V('key'), 'length')), misc: 'lengthOnly' }, { expr: subs(nm, s), misc: 'wrongPart' }] });
    }
  });

  H.register({
    id: 'expr.firstLast', label: 'Build a String from first and last letters', mode: 'expr', levels: ['advanced'],
    skill: 'Substrings', rule: 'substring', weight: 1,
    build: function (r, lvl) {
      var w = H.pickW(r, lvl, { max: 9 }), nm = H.sname(r), last = subs(nm, sub(L(nm), I(1)));
      return H.exprQuestion({ pre: [decl('String', nm, S(w))], type: 'String', name: 'ends',
        correct: add(subs(nm, 0, 1), last),
        goal: 'Store the first letter of `' + nm + '` followed by its last letter in `ends`.',
        wrongs: [{ expr: add(subs(nm, 0, 1), subs(nm, sub(L(nm), I(2)))), misc: 'offByOne' }, { expr: add(subs(nm, 0, 2), last), misc: 'near' },
          { expr: add(subs(nm, 1), last), misc: 'wrongPart' }, { expr: add(subs(nm, 0, 1), subs(nm, L(nm))), misc: 'dropped' }] });
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
