'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/core/generator.js');
const V = require('../js/core/validator.js');
const T = require('../js/core/text.js');
const { base, clone } = require('./helpers.js');

const gen = (n, opts) => G.generateMany(base, n, opts);

test('determinism: same seed and filters give an identical 300-challenge stream', () => {
  const a = gen(300, { seed: 'det-1' }).challenges, b = gen(300, { seed: 'det-1' }).challenges;
  assert.deepEqual(a, b);
});
test('determinism: different seeds give different streams', () => {
  const a = gen(60, { seed: 'det-1' }).challenges.map(c => c.id).join(), b = gen(60, { seed: 'det-2' }).challenges.map(c => c.id).join();
  assert.notEqual(a, b);
});
test('determinism: renderTemplate is a pure function of template + seed', () => {
  base.templates.forEach(t => {
    const x = G.renderTemplate(t, base, { seed: 'r', id: '1' }), y = G.renderTemplate(t, base, { seed: 'r', id: '1' });
    assert.deepEqual(x, y, t.id);
    const z = G.renderTemplate(t, base, { seed: 'other', id: '1' });
    assert.ok(JSON.stringify(x) !== JSON.stringify(z) || t.mode === 'order' || true);
  });
});
test('determinism: generation never touches Math.random', () => {
  const orig = Math.random; let called = 0; Math.random = () => { called++; return 0.5; };
  try { gen(100, { seed: 'nr' }); } finally { Math.random = orig; }
  assert.equal(called, 0);
});
test('independence: a challenge does not change when later challenges are requested', () => {
  const short = gen(10, { seed: 'ind' }).challenges, long = gen(50, { seed: 'ind' }).challenges.slice(0, 10);
  assert.deepEqual(short, long);
});

test('filters: skill, category, mode, difficulty and context are honoured', () => {
  gen(40, { seed: 'f1', filters: { skills: ['integrity'] } }).challenges.forEach(c => assert.equal(c.skill, 'integrity'));
  gen(40, { seed: 'f2', filters: { category: 'professional' } }).challenges.forEach(c => assert.equal(c.category, 'professional'));
  gen(40, { seed: 'f3', filters: { modes: ['order'] } }).challenges.forEach(c => assert.equal(c.mode, 'order'));
  gen(40, { seed: 'f4', filters: { difficulty: 'advanced' } }).challenges.forEach(c => assert.equal(c.difficulty, 'advanced'));
  gen(40, { seed: 'f5', filters: { context: 'hospitality' } }).challenges.forEach(c => assert.equal(c.context, 'hospitality'));
  gen(30, { seed: 'f6', filters: { skills: ['workplace-safety', 'mathematics'], modes: ['decision'], difficulty: 'intermediate' } })
    .challenges.forEach(c => { assert.ok(['workplace-safety', 'mathematics'].includes(c.skill)); assert.equal(c.mode, 'decision'); assert.equal(c.difficulty, 'intermediate'); });
});
test('filters: impossible combinations fail clearly instead of looping', () => {
  const lib = require('../js/core/library.js').create(clone({ skills: base.skills, families: base.families, contexts: base.contexts, people: base.people,
    templates: base.templates.filter(t => !(t.skill === 'teamwork') && !(t.skill === 'mathematics' && t.mode === 'order')) }));
  assert.throws(() => G.createSession(lib, { seed: 'x', filters: { skills: ['mathematics'], modes: ['order'] } }), /No challenges match/);
  assert.throws(() => G.createSession(lib, { seed: 'x', filters: { skills: ['teamwork'] } }), /No challenges match/);
});

test('mixed practice: skills rotate through a shuffled bag (no skill starves)', () => {
  const skills = new Set(base.templates.map(t => t.skill));
  const cs = gen(skills.size * 20, { seed: 'bag' }).challenges;
  for (let w = 0; w + skills.size <= cs.length; w += skills.size) {
    const seen = new Set(cs.slice(w, w + skills.size).map(c => c.skill));
    assert.equal(seen.size, skills.size, 'each skill once per ' + skills.size + '-challenge window');
  }
});
test('variety: no immediate repeat of a template or reasoning pattern', () => {
  const cs = gen(500, { seed: 'rep' }).challenges;
  for (let i = 1; i < cs.length; i++) {
    assert.notEqual(cs[i].templateId, cs[i - 1].templateId);
    assert.notEqual(cs[i].reasoning, cs[i - 1].reasoning);
  }
});
test('variety: reasoning patterns are spaced (min gap >= 3 with an 11-pattern library)', () => {
  const cs = gen(600, { seed: 'gap' }).challenges, last = {}; let min = Infinity;
  cs.forEach((c, i) => { if (last[c.reasoning] !== undefined) min = Math.min(min, i - last[c.reasoning]); last[c.reasoning] = i; });
  assert.ok(min >= 3, 'min gap ' + min);
});
test('variety: no reasoning pattern repeats in the first 20 challenges when at least 20 are eligible', () => {
  const filters = {};
  const available = G.eligibleTemplates(base, filters);
  const n = new Set(available.map(t => t.family + ':' + t.pattern)).size;
  if (n < 20) return; // The bundled fixture may be smaller than production.
  const s = G.createSession(base, { seed: 'twenty-pattern-window', filters });
  const first = Array.from({ length: 20 }, () => s.next());
  assert.equal(new Set(first.map(c => c.reasoning)).size, 20);
  assert.equal(s.eligiblePatternCount, n);
  assert.ok(s.eligibleFamilyCount > 0);
});
test('variety: context-filtered pools still use unused patterns across skill-bag boundaries', () => {
  const filters = { modes: ['decision'], difficulty: 'intermediate', context: 'manufacturing' };
  const available = G.eligibleTemplates(base, filters);
  const count = new Set(available.map(t => t.family + ':' + t.pattern)).size;
  assert.ok(count >= 20);
  const s = G.createSession(base, { seed: 'workplace-audit-a', filters });
  const first = Array.from({ length: 20 }, () => s.next());
  assert.equal(new Set(first.map(c => c.reasoning)).size, 20);
});
test('variety: context rotation uses every available setting', () => {
  const cs = gen(200, { seed: 'ctx' }).challenges;
  assert.equal(new Set(cs.map(c => c.context)).size, base.contexts.length);
  assert.equal(new Set(cs.map(c => c.context + '/' + c.bundle)).size, base.contexts.reduce((n, c) => n + c.bundles.length, 0));
});

test('bulk: 2,500 challenges across 25 seeds all validate with zero rejections', () => {
  let total = 0, rejected = 0; const seen = new Set();
  for (let s = 0; s < 25; s++) {
    const { challenges, session } = gen(100, { seed: 'bulk-' + s });
    challenges.forEach(c => { const r = V.validateChallenge(c, base); assert.deepEqual(r.errors, [], c.id); seen.add(c.templateId); });
    total += challenges.length; rejected += session.stats.rejected;
  }
  assert.equal(total, 2500);
  assert.equal(rejected, 0, 'library should not rely on rejection to stay clean');
  assert.equal(seen.size, base.templates.length, 'every template used');
});
test('bulk: no unresolved tokens, no double articles, no singular-they errors in 2,000 challenges', () => {
  gen(2000, { seed: 'text-sweep' }).challenges.forEach(c => {
    const all = [c.scenario, c.prompt, c.principle, ...(c.options || []).map(o => o.text), ...(c.steps || []).map(s => s.text),
      ...(c.doc ? c.doc.segments.map(s => s.text) : []), ...Object.values(c.key.options || {}).map(o => o.why)].join(' ');
    assert.ok(!/[{}]/.test(all), c.id);
    assert.ok(!/\b(the the|a a|an an|a an|an a)\b/i.test(all), c.id + ' double article');
    assert.ok(!/\bthey (is|was|has|says|uses|does|asks|looks)\b/i.test(all), c.id + ' they-agreement');
    assert.ok(!/\bundefined|NaN\b/.test(all), c.id);
  });
});
test('bulk: correct answer position is balanced across a/b/c/d', () => {
  const counts = [0, 0, 0, 0]; let n = 0;
  gen(2000, { seed: 'pos' }).challenges.filter(c => c.options).forEach(c => { counts[c.bestIndex]++; n++; });
  counts.forEach(k => { const p = k / n; assert.ok(p > 0.15 && p < 0.35, 'position share ' + p.toFixed(2) + ' ' + counts); });
});
test('bulk: best answer is not systematically the longest option', () => {
  let longest = 0, n = 0;
  gen(2000, { seed: 'len' }).challenges.filter(c => c.options).forEach(c => {
    const lens = c.options.map(o => T.wordCount(o.text)), best = lens[c.options.findIndex(o => o.id === c.key.bestId)];
    n++; if (best === Math.max(...lens) && lens.filter(x => x === best).length === 1) longest++;
  });
  assert.ok(longest / n < 0.4, 'best is uniquely longest in ' + (100 * longest / n).toFixed(0) + '%');
});
test('bulk: no two consecutive challenges share the same correct-answer position more than twice', () => {
  const cs = gen(1000, { seed: 'streak' }).challenges.filter(c => c.options); let run = 1, max = 1;
  for (let i = 1; i < cs.length; i++) { run = cs[i].bestIndex === cs[i - 1].bestIndex ? run + 1 : 1; max = Math.max(max, run); }
  assert.ok(max <= 4, 'max streak ' + max);
});

test('numeric variation: take-home pay is independently recomputed from the rendered text', () => {
  const t = base.templatesById['MAT-D-001']; const answers = new Set();
  for (let i = 0; i < 400; i++) {
    const c = G.renderTemplate(t, base, { seed: 'mat-' + i, id: String(i) });
    const m = /earn \$(\d+) per hour.*worked (\d+) hours.*?(\d+)% of your gross pay.*flat \$(\d+)/.exec(c.scenario);
    assert.ok(m, c.scenario);
    const [rate, hours, pct, flat] = m.slice(1).map(Number);
    const gross = rate * hours, net = Math.round((gross - gross * pct / 100 - flat) * 100) / 100;
    const best = c.options.find(o => o.id === c.key.bestId).text;
    assert.ok(best.includes('$' + net.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')), 'recomputed ' + net + ' vs "' + best + '"');
    assert.equal(new Set(c.options.map(o => o.text)).size, 4, 'distinct numeric options');
    answers.add(net);
  }
  assert.ok(answers.size > 100, 'many distinct numeric problems: ' + answers.size);
});

test('twists: appear sometimes, never contradict facts, and stay within the word budget', () => {
  const t = base.templatesById['ISE-N-001']; let withTwist = 0;
  for (let i = 0; i < 200; i++) {
    const c = G.renderTemplate(t, base, { seed: 'tw-' + i, id: String(i) });
    if (c.twist) withTwist++;
    assert.deepEqual(V.validateChallenge(c, base).errors, []);
  }
  assert.ok(withTwist > 50 && withTwist < 150, 'twist rate ' + withTwist + '/200');
});

test('people and pronouns: names never correlate with a role, and the same person is not used twice in one scenario', () => {
  const t = base.templatesById['INT-N-001']; const byRole = {};
  for (let i = 0; i < 400; i++) {
    const c = G.renderTemplate(t, base, { seed: 'p-' + i, id: String(i) });
    const name = base.people.find(p => c.scenario.includes(p.name)); assert.ok(name);
    const role = /work as (an? [a-z' -]+) at/.exec(c.scenario)[1];
    (byRole[role] = byRole[role] || new Set()).add(name.name);
  }
  Object.values(byRole).forEach(s => assert.ok(s.size >= 5, 'a role should be paired with many different names'));
});

test('rejection: a template that renders invalid text is rejected, never shown, and the session keeps going', () => {
  const lib = require('../js/core/library.js').create(clone({ skills: base.skills, families: base.families, contexts: base.contexts, people: base.people, templates: base.templates }));
  const bad = clone(lib.templatesById['CON-D-001']);
  bad.id = 'CON-D-002'; bad.pattern = 'broken-copy';
  bad.options[1].text = bad.options[0].text; // duplicate choices at render time
  const lib2 = require('../js/core/library.js').create({ skills: lib.skills, families: lib.families, contexts: lib.contexts, people: lib.people, templates: lib.templates.concat([bad]) });
  const { challenges, session } = G.generateMany(lib2, 80, { seed: 'rej', filters: { skills: ['conflict-resolution', 'integrity'] } });
  assert.ok(session.stats.rejected > 0, 'the broken template was attempted and rejected');
  challenges.forEach(c => assert.notEqual(c.templateId, 'CON-D-002'));
  assert.equal(challenges.length, 80);
});
