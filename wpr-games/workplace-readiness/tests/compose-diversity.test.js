'use strict';
/* Session variety and repeat avoidance for the hybrid generator. A "reasoning repeat" means the
 * same reasoning signature (authored family:pattern, or composed decisive-state signature). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadHybrid } = require('../tools/compose-load.js');
const SEL = require('../js/compose/selector.js');
const T = require('../js/core/text.js');
const h = loadHybrid();
const L = ['beginner', 'intermediate', 'advanced'], SEEDS = ['div-a', 'div-b', 'div-c'];
const norm = s => T.normalize(String(s || '').replace(/\d+/g, '#'));
const exactKey = c => JSON.stringify([c.mode, c.scenario, c.prompt, (c.options || []).map(o => o.text).sort(), (c.steps || []).map(s => s.text).sort(), c.doc ? c.doc.segments.map(s => s.text) : []]);
const firstRepeat = cs => { const seen = new Map(); for (let i = 0; i < cs.length; i++) { if (seen.has(cs[i].reasoning)) return i; seen.set(cs[i].reasoning, i); } return -1; };
function minGap(cs) { const last = {}; let g = Infinity; cs.forEach((c, i) => { if (last[c.reasoning] !== undefined) g = Math.min(g, i - last[c.reasoning]); last[c.reasoning] = i; }); return g; }

test('mixed practice: 500-question sessions have no exact repeats and no reasoning repeat within 20', () => {
  SEEDS.forEach(seed => {
    const cs = SEL.generateMany(h, 500, { seed }).challenges;
    assert.equal(new Set(cs.map(exactKey)).size, 500, 'exact duplicates');
    assert.ok(minGap(cs) >= 20, 'min reasoning gap ' + minGap(cs));
    assert.equal(new Set(cs.map(c => c.reasoning)).size, 500, 'with this much capacity no reasoning configuration repeats in 500');
  });
});
test('mixed practice: each skill appears once per 22-challenge window (skill bag preserved)', () => {
  const cs = SEL.generateMany(h, 22 * 15, { seed: 'bag' }).challenges;
  for (let w = 0; w + 22 <= cs.length; w += 22) assert.equal(new Set(cs.slice(w, w + 22).map(c => c.skill)).size, 22);
});
test('mixed practice: modes, difficulties, sources and settings all appear', () => {
  const cs = SEL.generateMany(h, 400, { seed: 'mix' }).challenges;
  ['decision', 'nextstep', 'order', 'find'].forEach(m => assert.ok(cs.some(c => c.mode === m), m));
  L.forEach(l => assert.ok(cs.some(c => c.difficulty === l), l));
  assert.ok(cs.some(c => c.source === 'authored') && cs.some(c => c.source === 'composed'));
  assert.equal(new Set(cs.map(c => c.context)).size, h.contexts.length);
});
test('narrow filters: all 66 skill/difficulty cells give 20 consecutive challenges with no reasoning repeat', () => {
  h.skills.forEach(s => L.forEach(l => {
    const f = { skills: [s.id], difficulty: l }, cap = SEL.capacity(h, f);
    assert.ok(cap.signatures >= 20, s.id + '/' + l + ' capacity ' + cap.signatures);
    SEEDS.forEach(seed => {
      const cs = SEL.generateMany(h, 20, { seed: seed + s.id + l, filters: f }).challenges;
      assert.equal(new Set(cs.map(c => c.reasoning)).size, 20, s.id + '/' + l + ' ' + seed);
    });
  }));
});
test('narrow filters: a single-skill session uses every eligible configuration before repeating any', () => {
  h.skills.forEach(s => {
    const f = { skills: [s.id], difficulty: 'beginner' }, M = SEL.capacity(h, f).signatures;
    const cs = SEL.generateMany(h, M + 5, { seed: 'exhaust' + s.id, filters: f }).challenges;
    const fr = firstRepeat(cs);
    assert.ok(fr === -1 || fr >= M, s.id + ': first repeat at ' + fr + ' of ' + M);
  });
});
test('small pools: when fewer than 20 configurations are eligible, unused ones come first, then review continues', () => {
  let tested = 0;
  h.skills.forEach(s => ['order', 'find'].forEach(m => L.forEach(l => {
    const f = { skills: [s.id], modes: [m], difficulty: l }, M = SEL.capacity(h, f).signatures;
    if (!M || M >= 20) return;
    const cs = SEL.generateMany(h, Math.max(25, M * 2), { seed: 'small' + s.id + m + l, filters: f }).challenges;
    const fr = firstRepeat(cs);
    assert.ok(fr === -1 || fr >= M, s.id + '/' + m + '/' + l + ' first repeat ' + fr + ' of ' + M);
    tested++;
  })));
  assert.ok(tested > 30);
});
test('session lengths 14/20/50/100: no exact repeats, no reasoning repeats', () => {
  [14, 20, 50, 100].forEach(n => SEEDS.forEach(seed => {
    const cs = SEL.generateMany(h, n, { seed: seed + n }).challenges;
    assert.equal(new Set(cs.map(exactKey)).size, n);
    assert.equal(new Set(cs.map(c => c.reasoning)).size, n);
  }));
});
test('history is bounded and generation stays fast (2,000 challenges)', () => {
  const s = SEL.createSession(h, { seed: 'long' }), t0 = Date.now();
  for (let i = 0; i < 2000; i++) s.next();
  const ms = Date.now() - t0;
  assert.ok(s.history.length <= SEL.HISTORY_LIMIT);
  assert.ok(ms / 2000 < 25, 'average ' + (ms / 2000).toFixed(2) + ' ms per challenge');
});
