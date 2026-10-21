'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/core/generator.js');
const V = require('../js/core/validator.js');
const GR = require('../js/core/grader.js');
const LIB = require('../js/core/library.js');
const { base } = require('./helpers.js');

const SKILLS = base.skillOrder, MODES = ['decision', 'nextstep', 'order', 'find'], DIFFS = ['beginner', 'intermediate', 'advanced'];
// Pinned, documented gaps: Advanced templates do not yet exist for these skills (see STANDARDS_COVERAGE.md).
const KNOWN_NO_ADVANCED = ['career-and-life-management', 'mathematics', 'reading-and-writing'];

let sample;
test.before(() => {
  sample = [];
  for (let s = 0; s < 6; s++) G.generateMany(base, 400, { seed: 'audit-test-' + s }).challenges.forEach(c => sample.push(c));
});

test('volume: 2,400 mixed challenges generated and every one passes full validation', () => {
  assert.equal(sample.length, 2400);
  sample.forEach(c => { const r = V.validateChallenge(c, base); assert.deepEqual(r.errors, [], c.id); });
});
test('coverage: all 22 skills receive substantial, balanced practice in mixed mode', () => {
  const by = {}; sample.forEach(c => { by[c.skill] = (by[c.skill] || 0) + 1; });
  assert.equal(Object.keys(by).length, 22);
  SKILLS.forEach(s => assert.ok(by[s] >= 100 && by[s] <= 120, s + ' got ' + by[s]));
});
test('coverage: every mode, difficulty, category and career context appears substantially', () => {
  const tally = f => sample.reduce((m, c) => { m[f(c)] = (m[f(c)] || 0) + 1; return m; }, {});
  MODES.forEach(m => assert.ok(tally(c => c.mode)[m] >= 350, m));
  DIFFS.forEach(d => assert.ok(tally(c => c.difficulty)[d] >= 200, d));
  ['personal', 'interpersonal', 'professional'].forEach(k => assert.ok(tally(c => c.category)[k] >= 400, k));
  const ctx = tally(c => c.context); base.contexts.forEach(c => assert.ok(ctx[c.id] >= 140, c.id + ' ' + ctx[c.id]));
});
test('coverage: all 94 standards concepts and all 22 skills x 4 modes are authored', () => {
  const covered = new Set(); base.templates.forEach(t => t.concepts.forEach(c => covered.add(c)));
  assert.deepEqual(Object.keys(base.conceptIds).filter(c => !covered.has(c)), []);
  SKILLS.forEach(s => MODES.forEach(m => assert.ok(base.templatesBySkill[s].some(t => t.mode === m), s + ' lacks ' + m)));
});
test('coverage: documented Advanced gaps are exactly the ones the docs state', () => {
  const missing = SKILLS.filter(s => !base.templatesBySkill[s].some(t => t.difficulty === 'advanced'));
  assert.deepEqual(missing.sort(), KNOWN_NO_ADVANCED.slice().sort());
});
test('every skill x mode filter produces valid challenges (88 combinations)', () => {
  SKILLS.forEach(s => MODES.forEach(m => {
    const { challenges } = G.generateMany(base, 8, { seed: 'combo-' + s + m, filters: { skills: [s], modes: [m] } });
    challenges.forEach(c => { assert.equal(c.skill, s); assert.equal(c.mode, m); assert.ok(V.validateChallenge(c, base).ok); });
  }));
});
test('every skill x difficulty filter produces valid challenges where authored', () => {
  SKILLS.forEach(s => DIFFS.forEach(d => {
    const has = base.templatesBySkill[s].some(t => t.difficulty === d);
    if (!has) { assert.throws(() => G.createSession(base, { seed: 'x', filters: { skills: [s], difficulty: d } }), /No challenges match/); return; }
    G.generateMany(base, 8, { seed: 'diff-' + s + d, filters: { skills: [s], difficulty: d } }).challenges.forEach(c => assert.equal(c.difficulty, d));
  }));
});
test('every category and every career context works as a filter', () => {
  ['personal', 'interpersonal', 'professional'].forEach(k => G.generateMany(base, 30, { seed: 'k' + k, filters: { category: k } }).challenges.forEach(c => assert.equal(c.category, k)));
  base.contexts.forEach(ctx => G.generateMany(base, 60, { seed: 'c' + ctx.id, filters: { context: ctx.id } }).challenges.forEach(c => { assert.equal(c.context, ctx.id); assert.ok(V.validateChallenge(c, base).ok); }));
});
test('semantic repetition: the same reasoning pattern never recurs within 20 challenges in mixed practice', () => {
  for (let s = 0; s < 6; s++) {
    const last = {}; sample.slice(s * 400, (s + 1) * 400).forEach((c, i) => { if (last[c.reasoning] !== undefined) assert.ok(i - last[c.reasoning] > 19, c.reasoning + ' repeated after ' + (i - last[c.reasoning])); last[c.reasoning] = i; });
  }
});
test('surface wording is not counted as new reasoning: distinct problems = distinct reasoning patterns', () => {
  const patterns = new Set(sample.map(c => c.reasoning)), texts = new Set(sample.map(c => c.scenario + '|' + c.prompt));
  assert.equal(patterns.size, 125);
  assert.ok(texts.size > patterns.size, 'surface variety exists');
  assert.equal(new Set(base.templates.map(t => t.family + ':' + t.pattern)).size, base.templates.length, 'no two templates share a reasoning pattern');
});
test('grading: correct and incorrect answers grade correctly for all 2,400 challenges', () => {
  sample.forEach(c => {
    assert.ok(GR.grade(c, GR.solve(c)).correct);
    const wrongs = GR.wrongResponses(c); assert.ok(wrongs.length > 0);
    wrongs.slice(0, 6).forEach(w => assert.equal(GR.grade(c, w).correct, false));
  });
});
test('context independence: every template renders validly in every context it allows', () => {
  let n = 0;
  base.templates.forEach(t => LIB.contextsFor(base, t).forEach(ctx => base.contexts.find(c => c.id === ctx).bundles.forEach(b => {
    const c = G.renderTemplate(t, base, { seed: 'ci', id: '0', contextId: ctx, bundleId: b.id });
    assert.deepEqual(V.validateChallenge(c, base).errors, [], t.id + ' ' + ctx + '/' + b.id); n++;
  })));
  assert.ok(n > 2500, 'renders: ' + n);
});
test('determinism: the audit sample is reproducible from its seeds', () => {
  const again = G.generateMany(base, 400, { seed: 'audit-test-3' }).challenges;
  assert.deepEqual(again, sample.slice(1200, 1600));
});
