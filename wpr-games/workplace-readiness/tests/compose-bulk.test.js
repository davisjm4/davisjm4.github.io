'use strict';
/* Bulk correctness through the hybrid session engine: every generated challenge is re-validated
 * (existing instance validator + compositional checker), its key grades correct and every wrong
 * response grades incorrect. Rejections during generation are counted and must be zero. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadHybrid } = require('../tools/compose-load.js');
const SEL = require('../js/compose/selector.js');
const G = require('../js/core/grader.js');
const S = require('../js/data/schema.js');
const h = loadHybrid();
const N = +(process.env.BULK_N || 1000), CELL_N = +(process.env.CELL_N || 100);
const L = ['beginner', 'intermediate', 'advanced'];

function check(c, label) {
  assert.equal(SEL.validate(h, c), null, label + ' ' + c.templateId);
  const ok = G.grade(c, G.solve(c)); assert.ok(ok.ok && ok.correct, label + ' key');
  G.wrongResponses(c).slice(0, 30).forEach(w => assert.equal(G.grade(c, w).correct, false, label + ' wrong graded correct'));
}

for (const m of Object.keys(S.MODES)) for (const l of L) {
  test('bulk: ' + N + ' ' + m + '/' + l + ' challenges validate and grade correctly', () => {
    const { challenges, session } = SEL.generateMany(h, N, { seed: 'bulk-' + m + '-' + l, filters: { modes: [m], difficulty: l } });
    challenges.forEach(c => { assert.equal(c.mode, m); assert.equal(c.difficulty, l); check(c, m + '/' + l); });
    assert.equal(session.stats.rejected, 0, JSON.stringify(session.stats.rejectionReasons).slice(0, 300));
    assert.ok(challenges.some(c => c.source === 'composed'));
  });
}
test('bulk: every skill/difficulty cell (' + CELL_N + ' each, 66 cells) validates with zero rejections', () => {
  for (const s of h.skills) for (const l of L) {
    const { challenges, session } = SEL.generateMany(h, CELL_N, { seed: 'cell-' + s.id + l, filters: { skills: [s.id], difficulty: l } });
    challenges.forEach(c => { assert.equal(c.skill, s.id); check(c, s.id + '/' + l); });
    assert.equal(session.stats.rejected, 0, s.id + '/' + l + ' ' + JSON.stringify(session.stats.rejectionReasons).slice(0, 200));
  }
});
test('bulk: every career setting filter yields valid composed challenges', () => {
  for (const ctx of h.contexts) {
    const { challenges } = SEL.generateMany(h, 60, { seed: 'ctx-' + ctx.id, filters: { context: ctx.id } });
    challenges.forEach(c => { assert.equal(c.context, ctx.id); check(c, ctx.id); });
  }
});
test('bulk: answer positions are balanced in composed choice challenges', () => {
  const pos = [0, 0, 0, 0];
  SEL.generateMany(h, 4000, { seed: 'pos', filters: { modes: ['decision', 'nextstep'] } }).challenges.forEach(c => pos[c.bestIndex]++);
  const exp = 1000, chi = pos.reduce((a, x) => a + (x - exp) * (x - exp) / exp, 0);
  assert.ok(chi < 16.27, 'chi-square ' + chi.toFixed(2) + ' ' + pos.join('/'));
});
test('bulk: generated text has no unresolved tokens, double articles or they-agreement errors', () => {
  SEL.generateMany(h, 3000, { seed: 'text' }).challenges.forEach(c => {
    const all = [c.scenario, c.prompt, c.principle, ...(c.options || []).map(o => o.text), ...(c.steps || []).map(s => s.text),
      ...(c.doc ? c.doc.segments.map(s => s.text) : []), ...Object.values(c.key.options || {}).map(o => o.why + ' ' + (o.misconception || ''))].join(' ');
    assert.ok(!/[{}]/.test(all), c.id);
    assert.ok(!/\b(the the|a a|an an|a an|an a)\b/i.test(all), c.id + ' double article');
    assert.ok(!/\bthey (is|was|has|says|uses|does|asks|looks)\b/i.test(all), c.id);
    const t2 = all.replace(/\b(Supplier|Job|Option|Point) [AB]\b/g, 'X');
    const aBad = t2.match(/\ba (?!one|once|uni|use|usu|eu)[aeiouAEIOU]\w*/);
    assert.ok(!aBad, c.id + ' article: ' + (aBad && aBad[0]));
    const anBad = t2.match(/\ban (?!hour|honest|honor|heir|x-ray|MBA)[^aeiouAEIOU\s\d$]\w*/);
    assert.ok(!anBad, c.id + ' article: ' + (anBad && anBad[0]));
  });
});
