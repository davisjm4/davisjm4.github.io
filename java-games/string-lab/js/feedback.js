/* String Lab — instructional feedback (no DOM).
 * Builds, for a submitted answer: verdict, correct answer, the rule being tested, the misconception behind
 * the selected wrong answer, a line-by-line trace (derived from the SAME evaluator that graded the answer,
 * so the explanation can never disagree with the grading) and indexed-character views.
 * Text uses `backticks` to mark inline code; the UI turns them into <code>. */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var E = SL.Evaluator, J = SL.J;

  var RULES = {
    concat: 'The `+` operator joins Strings. If either side is a String, Java turns the other side into text and joins them. It never adds spaces for you.',
    concatNumbers: 'Java evaluates `+` from left to right. Number + number adds, but as soon as one side is a String, `+` joins text, so each later number is appended as text. Parentheses change the grouping, so `"Result: " + (2 + 3)` adds first.',
    length: '`length()` counts every character. A String with n characters has indexes 0 through n - 1.',
    charAt: '`charAt(i)` uses zero-based indexing: index 0 is the first character, so `charAt(2)` is the THIRD character.',
    substring: '`substring(begin, end)` starts AT `begin` and stops BEFORE `end`, so it returns end - begin characters. `substring(begin)` runs from `begin` to the end of the String.',
    indexOf: '`indexOf` returns the zero-based index where the FIRST match starts, or -1 if there is no match.',
    notFound: '`indexOf` returns -1 when the text is not found. Searching is case-sensitive, and the characters must appear in the same order.',
    endExclusive: 'The end index of `substring` is exclusive. To include the character at index i, the end index must be i + 1. To keep everything through the last character, the end index is `length()`.',
    chain: 'In a chain such as `a.substring(1).length()`, each method works on the String returned by the method before it.',
    indexSubstring: '`indexOf` gives a position and `substring` can use it as a boundary: `substring(0, start)` keeps the text BEFORE the match, and `substring(start)` keeps everything FROM the match onward.',
    immutable: 'Strings are immutable. A method such as `substring` returns a NEW String; the variable only changes if you assign the result back to it.',
    alias: '`String b = a;` makes `b` refer to the SAME String as `a`. Reassigning `a` later points `a` at a different String; `b` still refers to the original, because Strings never change.',
    reassign: 'An assignment evaluates the right-hand side first, then stores the resulting String in the variable.',
    sequence: 'Statements run in order. Each one uses the value the variable holds at that moment, and each assignment replaces the previous value.',
    indexSplit: 'Work out where `indexOf` finds the text, then use that number as a boundary: `substring(0, start)` is everything BEFORE it, `substring(start)` is everything FROM it, and `start + key.length()` is the first index AFTER the match. Strings never change, so each substring is a new String.',
    indexRelative: '`indexOf` counts from the start of the String it is called on. After `substring`, the new String begins again at index 0.',
    lastIndex: 'The last character is at index `length() - 1`, because indexes start at 0.',
    firstOccurrenceNested: '`charAt` reads one character; `indexOf` then searches from the start of the String for the FIRST occurrence of it, which can be earlier than where you read it.'
  };

  var MISC = {
    oneBased: 'That counts positions from 1. Java counts from 0, so the character at index n is the (n + 1)th character.',
    inclusiveEnd: 'That includes the character at the end index. In `substring(begin, end)` the end index is exclusive: the result stops just before it.',
    startEarly: 'That starts one position too early. `substring` begins exactly AT the begin index.',
    startLate: 'That starts one position too late. The character at the begin index is included.',
    mutates: 'That assumes the method changed the original String. Strings are immutable: the method returned a new String, but nothing stored it, so the variable keeps its old value.',
    aliasFollows: 'That assumes the second variable follows the first. `String b = a;` copies the reference to the original String; reassigning `a` later does not change `b`.',
    sumNumbers: 'That adds the numbers together first. Java works left to right: once the left side is a String, each number is joined on as text.',
    allConcat: 'That joins numbers as text even where both sides are numbers. Number + number is real addition (and parentheses are evaluated first).',
    lastOccurrence: '`indexOf` returns the FIRST match, not a later one.',
    oneBasedFind: 'That counts the position from 1. `indexOf` returns a zero-based index.',
    notFoundZero: '`indexOf` returns -1, not 0, when the text is missing. An index of 0 means "found at the very start".',
    lengthLastIdx: 'That is off by one around `length()`. A String with n characters has indexes 0 through n - 1.',
    lengthPlus: 'That is one too many. `length()` is exactly the number of characters, and the last index is one less than that.',
    stoppedEarly: 'That stops tracing one statement too soon. Every statement runs, in order, and later statements use the updated values.',
    order: 'That puts the pieces in the wrong order. `+` joins values left to right exactly as written.',
    spaceAdded: 'Java does not insert spaces for you. `+` joins the text exactly as written.',
    dropped: 'That leaves part of the expression out. Every operand of `+` shows up in the result.',
    quotedVar: 'Quotes make a String literal. `"name"` is the letters n-a-m-e; `name` without quotes is the variable\'s value.',
    needParens: 'Without parentheses Java works left to right: once a String is on the left, each number is appended as text instead of being added.',
    missingSpace: 'Java does not add a space between joined values. Include `" "` yourself.',
    arith: 'That uses a different arithmetic operation than the goal needs. Check which operator the goal asks for.',
    fromEnd: 'That counts from the end. Indexes always count from the start of the String, beginning at 0.',
    matchEnd: 'That is where the match ENDS. `indexOf` returns where it STARTS.',
    lengthOnly: 'That is only a length. The boundary for `substring` is a position counted from the start of the String, so the start index has to be included.',
    notFoundLength: '`indexOf` does not return the String\'s length when nothing matches. It returns -1.',
    lengthAsIndex: '`length()` is one more than the last index. Index numbers run from 0 to `length() - 1`.',
    originalIndex: 'That counts in a longer String. `indexOf` counts from the start of the String it is called on, and after `substring` that String starts again at index 0.',
    sameAsLast: 'That is where the letter was read. `indexOf` searches from the start and returns the FIRST occurrence, which can be earlier.',
    wrongPart: 'That returns a different part of the String than the goal asks for. Check which side of the boundary you need.',
    offByOne: 'That is off by one. Check whether the boundary is included or excluded, and remember indexes start at 0.',
    present: 'That text IS in the String, so `indexOf` returns its start index (0 or higher), not -1.',
    forgotShift: 'That stops at the position that was found. The goal wants the NEXT character, so add 1.',
    partial: 'That only covers part of what the goal asks for.',
    nextChar: 'That is the character AFTER the one at that index. `charAt(i)` returns the character AT index i.',
    near: 'That is not what Java computes here. Follow the step-by-step trace below to see where it differs.'
  };

  var fmt = E.fmt;
  function code(s) { return '`' + s + '`'; }

  function describeEvent(ev) {
    var r = fmt(ev.result);
    if (ev.kind === 'call') {
      var args = ev.args.map(fmt).join(', ');
      return code(fmt(ev.recv) + '.' + ev.method + '(' + args + ')') + ' returns ' + code(r) + '.';
    }
    if (ev.kind === 'concat') {
      var note = (ev.l.t === 'int' || ev.r.t === 'int' || ev.l.t === 'char' || ev.r.t === 'char') ? ' (the non-String side is converted to text)' : '';
      return code(fmt(ev.l) + ' + ' + fmt(ev.r)) + ' joins text and gives ' + code(r) + note + '.';
    }
    if (ev.kind === 'add') return code(ev.l.v + ' + ' + ev.r.v) + ' adds two numbers and gives ' + code(r) + '.';
    return code(ev.l.v + ' ' + ev.op + ' ' + ev.r.v) + ' gives ' + code(r) + '.';
  }

  /** Line-by-line narration of a program, from the evaluator's own event log. */
  function traceProgram(stmts, opts) {
    opts = opts || {};
    var res = E.evaluate(stmts, { events: true });
    if (!res.ok) return null;
    var lines = J.render.program(stmts);
    return res.log.map(function (entry) {
      var s = entry.stmt, notes = [], evs = entry.events.map(describeEvent), v = entry.value;
      if (s.s === 'decl') {
        if (s.expr.k === 'str' || s.expr.k === 'int' || s.expr.k === 'chr') notes.push(code(s.name) + ' starts as ' + code(fmt(v)) + '.');
        else if (s.expr.k === 'var' && s.type === 'String') notes.push(code(s.name) + ' refers to the same String as ' + code(s.expr.name) + ', ' + code(fmt(v)) + '.');
        else { notes = notes.concat(evs); notes.push(code(s.name) + ' is ' + code(fmt(v)) + '.'); }
      } else if (s.s === 'assign') {
        notes = notes.concat(evs);
        notes.push(code(s.name) + ' now holds ' + code(fmt(v)) + (v.t === 'String' && opts.immut ? ' (a new String; any other variable that referred to the old one is unaffected)' : '') + '.');
      } else if (s.s === 'expr') {
        notes = notes.concat(evs);
        var tv = s.expr.target.k === 'var' ? s.expr.target.name : null;
        notes.push('Nothing stores that result' + (tv ? ', so ' + code(tv) + ' is still ' + code(fmt(entry.env[tv])) : '') + '.');
      } else {
        notes = notes.concat(evs);
        notes.push('Prints ' + code(entry.printed) + '.');
      }
      return { code: lines[entry.index], notes: notes };
    });
  }

  /** Indexed-character views for the String methods used (shown ONLY after the answer). */
  function indexViews(stmts) {
    var res = E.evaluate(stmts, { events: true });
    if (!res.ok) return [];
    var views = [];
    res.log.forEach(function (entry) {
      entry.events.forEach(function (ev) {
        if (ev.kind !== 'call' || ev.method === 'length' || views.length >= 3) return;
        var s = ev.recv.v, hl = [], caption;
        if (ev.method === 'charAt') { hl = [ev.args[0].v]; caption = code('charAt(' + ev.args[0].v + ')') + ' is ' + code(fmt(ev.result)) + '.'; }
        else if (ev.method === 'substring') {
          var a = ev.args[0].v, b = ev.args.length > 1 ? ev.args[1].v : s.length;
          for (var i = a; i < b; i++) hl.push(i);
          caption = code(ev.args.length > 1 ? 'substring(' + a + ', ' + b + ')' : 'substring(' + a + ')') + ' keeps index ' + (hl.length ? hl[0] + ' up to ' + hl[hl.length - 1] : 'none (empty)') + (ev.args.length > 1 ? '; index ' + b + ' is excluded' : ', through the end') + '.';
        } else {
          var t = E.show(ev.args[0]), idx = ev.result.v;
          if (idx >= 0) { for (var j = 0; j < t.length; j++) hl.push(idx + j); caption = code('indexOf(' + fmt(ev.args[0]) + ')') + ' first matches at index ' + idx + '.'; }
          else caption = code('indexOf(' + fmt(ev.args[0]) + ')') + ' finds no match, so it returns -1.';
        }
        views.push({ text: s, highlights: hl, caption: caption });
      });
    });
    return views;
  }

  function build(ch, selectedIndex) {
    var revealed = selectedIndex === null || selectedIndex === undefined;
    var sel = revealed ? null : ch.choices[selectedIndex];
    var correct = !revealed && selectedIndex === ch.correctIndex;
    var out = {
      correct: correct, revealed: revealed,
      verdict: revealed ? 'Answer revealed.' : correct ? 'Correct!' : 'Not quite.',
      answerText: ch.answer, selectedText: sel ? sel.text : null,
      rule: RULES[ch.rule] || null, misconception: null, trace: null, views: []
    };
    if (sel && !correct) out.misconception = MISC[sel.misc] || MISC.near;
    out.trace = traceProgram(ch.traceStmts, { immut: ch.rule === 'alias' || ch.rule === 'immutable' });
    out.views = indexViews(ch.traceStmts);
    return out;
  }

  SL.Feedback = { build: build, RULES: RULES, MISC: MISC, traceProgram: traceProgram, indexViews: indexViews };
})(typeof globalThis !== 'undefined' ? globalThis : this);
