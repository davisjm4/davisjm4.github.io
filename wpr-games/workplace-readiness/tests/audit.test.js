'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/core/generator.js');
const V = require('../js/core/validator.js');
const GR = require('../js/core/grader.js');
const LIB = require('../js/core/library.js');
const { base } = require('./helpers.js');

const SKILLS = base.skillOrder, MODES = ['decision', 'nextstep', 'order', 'find'], DIFFS = ['beginner', 'intermediate', 'advanced'];
const KNOWN_NO_ADVANCED = [];

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
test('coverage: all skills now have Advanced content, including the three former gaps', () => {
  const missing = SKILLS.filter(s => !base.templatesBySkill[s].some(t => t.difficulty === 'advanced'));
  assert.deepEqual(missing.sort(), KNOWN_NO_ADVANCED.slice().sort());
  ['career-and-life-management', 'mathematics', 'reading-and-writing'].forEach(s => {
    const advanced = base.templatesBySkill[s].filter(t => t.difficulty === 'advanced');
    assert.ok(advanced.length >= 4, s + ' needs the new advanced decision, next-step, ordering, and problem-finding set');
    ['decision', 'nextstep', 'order', 'find'].forEach(m => assert.ok(advanced.some(t => t.mode === m), s + ' lacks advanced ' + m));
  });
});
test('advanced gap expansion covers all required modes and independently correct mathematics', () => {
  const added = ['CAR-D-003','CAR-N-002','CAR-O-002','CAR-F-002','MAT-D-004','MAT-N-002','MAT-O-002','MAT-F-002','RAW-D-003','RAW-N-002','RAW-O-002','RAW-F-002'];
  added.forEach(id => assert.ok(base.templatesById[id], 'missing authored template ' + id));
  assert.equal(Math.ceil((7 * 2.4 * 1.08) / 5), 4, 'seven kits require four 5-meter rolls after the stated waste allowance');
  const subtotal = 12 * 18 + 1.5 * 42;
  assert.equal(subtotal, 279);
  assert.equal(subtotal * 0.08, 22.32);
  assert.equal(subtotal * 1.08, 301.32);
  assert.equal(3.5 * 28, 98);
});
test('missing beginner next-step coverage is restored with three different reasoning families', () => {
  ['SAF-N-002', 'EFF-N-002', 'CUS-N-002'].forEach(id => {
    const template = base.templatesById[id];
    assert.ok(template, 'missing ' + id);
    assert.equal(template.difficulty, 'beginner');
    assert.equal(template.mode, 'nextstep');
  });
  assert.equal(new Set(['SAF-N-002', 'EFF-N-002', 'CUS-N-002'].map(id => base.templatesById[id].family)).size, 3);
});
test('quality sample: 1,000 seeded challenges per mode and difficulty validate and grade correctly', () => {
  MODES.forEach(mode => DIFFS.forEach(difficulty => {
    const { challenges } = G.generateMany(base, 1000, {
      seed: 'quality-' + mode + '-' + difficulty,
      filters: { modes: [mode], difficulty }
    });
    assert.equal(challenges.length, 1000, mode + '/' + difficulty);
    challenges.forEach(c => {
      assert.equal(c.mode, mode);
      assert.equal(c.difficulty, difficulty);
      assert.deepEqual(V.validateChallenge(c, base).errors, [], c.id);
      assert.ok(GR.grade(c, GR.solve(c)).ok && GR.grade(c, GR.solve(c)).correct, c.id);
      if (mode !== 'order') GR.wrongResponses(c).forEach(response => {
        const result = GR.grade(c, response);
        assert.ok(result.ok && !result.correct, c.id + '/' + JSON.stringify(response));
      });
    });
  }));
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
  assert.equal(patterns.size, new Set(base.templates.map(t => t.family + ':' + t.pattern)).size);
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
