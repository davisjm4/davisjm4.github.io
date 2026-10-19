'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/core/generator.js');
const GR = require('../js/core/grader.js');
const O = require('../js/core/order.js');
const { base, deepFreeze } = require('./helpers.js');

const sample = (n, seed, filters) => G.generateMany(base, n, { seed, filters }).challenges;

test('grading: the key solution is graded correct for 1,500 generated challenges, in every mode', () => {
  const modes = {};
  sample(1500, 'g-correct').forEach(c => {
    const r = GR.grade(c, GR.solve(c));
    assert.ok(r.ok && r.correct, c.id);
    assert.equal(r.feedback.headline.startsWith('Correct'), true);
    assert.ok(r.feedback.lines.some(l => l.kind === 'principle'));
    modes[c.mode] = (modes[c.mode] || 0) + 1;
  });
  ['decision', 'nextstep', 'order', 'find'].forEach(m => assert.ok(modes[m] > 100, m + ' covered: ' + modes[m]));
});

test('grading: every incorrect choice or segment is graded incorrect with teaching feedback', () => {
  sample(1200, 'g-wrong').filter(c => c.mode !== 'order').forEach(c => {
    GR.wrongResponses(c).forEach(w => {
      const r = GR.grade(c, w);
      assert.ok(r.ok && !r.correct, c.id);
      const text = r.feedback.lines.map(l => l.text).join(' ');
      assert.ok(!/try again/i.test(text), 'no "try again" feedback');
      assert.ok(r.feedback.lines.length >= 4, 'chosen reasoning + best answer + why + principle');
      assert.ok(r.feedback.lines.some(l => l.kind === 'best'), 'shows the best answer after the attempt');
      assert.ok(r.feedback.lines.some(l => l.kind === 'principle'));
    });
  });
});

test('grading: feedback for a wrong choice explains THAT choice and not another distractor', () => {
  sample(600, 'g-match').filter(c => c.options).forEach(c => {
    const wrongs = GR.wrongResponses(c);
    wrongs.forEach(w => {
      const r = GR.grade(c, w), text = r.feedback.lines.map(l => l.text);
      assert.ok(text.includes(c.key.options[w.optionId].why), 'includes selected option reasoning');
      wrongs.filter(o => o.optionId !== w.optionId).forEach(o => assert.ok(!text.includes(c.key.options[o.optionId].why), 'does not leak another distractor reasoning'));
      assert.ok(text.includes(c.key.options[c.key.bestId].why), 'includes best-answer reasoning');
    });
  });
});

test('grading: "acceptable but not best" answers are not marked correct but are acknowledged', () => {
  const advanced = sample(400, 'g-acc', { difficulty: 'advanced', modes: ['decision', 'nextstep'] });
  let seen = 0;
  advanced.forEach(c => {
    const acc = Object.keys(c.key.options).find(k => c.key.options[k].role === 'acceptable'); assert.ok(acc, c.id);
    const r = GR.grade(c, { optionId: acc });
    assert.equal(r.correct, false);
    assert.equal(r.feedback.headline, 'Reasonable, but not the best');
    seen++;
  });
  assert.ok(seen > 20);
});

test('ordering: every valid permutation is accepted and every invalid one is rejected', () => {
  const cs = sample(300, 'g-order', { modes: ['order'] }); let checked = 0;
  cs.forEach(c => {
    const ids = c.steps.map(s => s.id), valid = O.enumerateValid(ids, c.key.precedence);
    assert.ok(valid.length >= 1);
    O.permutations(ids).forEach(p => {
      const r = GR.grade(c, { order: p }), expected = valid.some(v => v.join() === p.join());
      assert.equal(r.correct, expected, c.id + ' ' + p.join('>'));
      if (!expected) assert.ok(r.violations.length >= 1 && r.feedback.lines.some(l => /needs to come before/.test(l.text)));
      checked++;
    });
  });
  assert.ok(checked > 4000, 'permutations exercised: ' + checked);
});
test('ordering: valid alternate orders are accepted and acknowledged (SAF-O-001 has 3)', () => {
  const t = base.templatesById['SAF-O-001'], c = G.renderTemplate(t, base, { seed: 'alt', id: '0' });
  const valid = O.enumerateValid(c.steps.map(s => s.id), c.key.precedence);
  assert.equal(valid.length, 3);
  const alt = valid.find(v => v.join() !== c.key.example.join());
  const r = GR.grade(c, { order: alt });
  assert.ok(r.correct);
  assert.ok(r.feedback.lines.some(l => /Other orders also work/.test(l.text)));
});
test('ordering: the initial arrangement shown to the student is never already correct', () => {
  sample(400, 'g-init', { modes: ['order'] }).forEach(c => assert.ok(!O.isValid(c.steps.map(s => s.id), c.steps.map(s => s.id), c.key.precedence)));
});
test('ordering: an invalid submission names the broken dependency and shows one valid order', () => {
  const c = G.renderTemplate(base.templatesById['EFF-O-001'], base, { seed: 'viol', id: '0' });
  const ids = c.steps.map(s => s.id), reversed = c.key.example.slice().reverse();
  const r = GR.grade(c, { order: reversed }), text = r.feedback.lines.map(l => l.text).join(' ');
  assert.equal(r.correct, false);
  assert.match(text, /needs to come before/);
  assert.match(text, /One valid order:/);
  assert.ok(r.satisfied < 1);
});

test('grading: malformed responses are refused rather than mis-scored', () => {
  const choice = G.renderTemplate(base.templatesById['CON-D-001'], base, { seed: 'm', id: '0' });
  const ord = G.renderTemplate(base.templatesById['EFF-O-001'], base, { seed: 'm', id: '0' });
  const fnd = G.renderTemplate(base.templatesById['ISE-F-001'], base, { seed: 'm', id: '0' });
  [undefined, null, {}, { optionId: 'zzz' }, { optionId: 5 }, { segmentId: 'a' }].forEach(r => assert.equal(GR.grade(choice, r).ok, false));
  [{ order: [] }, { order: ['list'] }, { order: ['list', 'list', 'rank', 'start'] }, { order: ['list', 'assess', 'rank', 'bogus'] }, { optionId: 'o1' }].forEach(r => assert.equal(GR.grade(ord, r).ok, false));
  [{ segmentId: 'nope' }, { optionId: 'o1' }, {}].forEach(r => assert.equal(GR.grade(fnd, r).ok, false));
  assert.equal(GR.grade(null, { optionId: 'o1' }).ok, false);
});
test('grading: pure (does not mutate the challenge) and repeatable', () => {
  const c = deepFreeze(sample(1, 'pure')[0]);
  const a = GR.grade(c, GR.solve(c)), b = GR.grade(c, GR.solve(c));
  assert.deepEqual(a, b);
});
test('find the problem: each segment can be selected and only the problem is correct', () => {
  sample(300, 'g-find', { modes: ['find'] }).forEach(c => {
    const ids = c.doc.segments.map(s => s.id);
    ids.forEach(id => assert.equal(GR.grade(c, { segmentId: id }).correct, id === c.key.problemId));
  });
});
