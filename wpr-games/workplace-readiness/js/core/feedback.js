/* Workplace Readiness Games - instructional feedback.
 * Builds concise, specific feedback from the reasoning authored in each template.
 * Feedback never says only "Incorrect": it states why the chosen action is less
 * appropriate, names the best action, and closes with a transferable principle.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.feedback = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function textOf(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].text;
    return '';
  }

  function composeChoice(c, r) {
    var lines = [], opt = c.key.options;
    var best = opt[c.key.bestId], chosen = opt[r.selectedId];
    if (r.correct) {
      lines.push({ kind: 'why', text: best.why });
    } else {
      lines.push({ kind: 'selected', text: 'You chose: ' + textOf(c.options, r.selectedId) });
      lines.push({ kind: 'why', text: chosen.why });
      lines.push({ kind: 'best', text: 'Best answer: ' + textOf(c.options, c.key.bestId) });
      lines.push({ kind: 'bestWhy', text: best.why });
    }
    lines.push({ kind: 'principle', text: c.principle });
    var headline = r.correct ? 'Correct' : (chosen.role === 'acceptable' ? 'Reasonable, but not the best' : 'Not quite');
    return { headline: headline, lines: lines };
  }

  function composeOrder(c, r) {
    var lines = [], steps = c.steps;
    if (r.correct) {
      lines.push({ kind: 'why', text: 'Each step happens after the steps it depends on, so this sequence works.' });
      if (r.differsFromExample) {
        lines.push({ kind: 'note', text: 'Other orders also work here, as long as these dependencies hold.' });
      }
    } else {
      r.violations.slice(0, 2).forEach(function (v) {
        lines.push({ kind: 'why', text: '"' + textOf(steps, v.before) + '" needs to come before "' + textOf(steps, v.after) + '". ' + v.why });
      });
      lines.push({ kind: 'best', text: 'One valid order:', items: c.key.example.map(function (id) { return textOf(steps, id); }) });
    }
    lines.push({ kind: 'principle', text: c.principle });
    return { headline: r.correct ? 'Correct sequence' : 'Not quite', lines: lines };
  }

  function composeFind(c, r) {
    var lines = [], segs = c.key.segments;
    var problem = segs[c.key.problemId];
    var problemText = textOf(c.doc.segments, c.key.problemId);
    if (r.correct) {
      lines.push({ kind: 'why', text: problem.note });
    } else {
      lines.push({ kind: 'selected', text: 'You chose: ' + textOf(c.doc.segments, r.selectedId) });
      lines.push({ kind: 'why', text: segs[r.selectedId].note });
      lines.push({ kind: 'best', text: 'The problem is: ' + problemText });
      lines.push({ kind: 'bestWhy', text: problem.note });
    }
    lines.push({ kind: 'principle', text: c.principle });
    return { headline: r.correct ? 'Correct' : 'Not quite', lines: lines };
  }

  function compose(challenge, result) {
    if (challenge.mode === 'order') return composeOrder(challenge, result);
    if (challenge.mode === 'find') return composeFind(challenge, result);
    return composeChoice(challenge, result);
  }

  return { compose: compose };
}));
