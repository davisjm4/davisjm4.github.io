'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const rng = require('../js/core/rng.js');
const expr = require('../js/core/expr.js');
const text = require('../js/core/text.js');
const order = require('../js/core/order.js');

test('rng: same seed gives same stream, different seed differs', () => {
  const a = rng.create('s1'), b = rng.create('s1'), c = rng.create('s2');
  const sa = Array.from({ length: 50 }, () => a.float()), sb = Array.from({ length: 50 }, () => b.float()), sc = Array.from({ length: 50 }, () => c.float());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
});
test('rng: fork streams are independent of draws on the parent', () => {
  const a = rng.create('p'), b = rng.create('p');
  a.float(); a.float(); a.float();
  assert.equal(a.fork('x').float(), b.fork('x').float());
});
test('rng: shuffle is a permutation and unbiased enough', () => {
  const r = rng.create('shuf'); const counts = [0, 0, 0, 0];
  for (let i = 0; i < 4000; i++) { const s = r.shuffle([0, 1, 2, 3]); assert.deepEqual(s.slice().sort(), [0, 1, 2, 3]); counts[s[0]]++; }
  counts.forEach(n => assert.ok(n > 800 && n < 1200, 'first position roughly uniform: ' + counts));
});
test('rng: weighted never picks zero-weight items', () => {
  const r = rng.create('w');
  for (let i = 0; i < 500; i++) assert.equal(r.weighted([{ weight: 0, value: 'x' }, { weight: 3, value: 'y' }]), 'y');
});
test('expr: arithmetic, precedence, functions', () => {
  assert.equal(expr.evaluate('2+3*4'), 14);
  assert.equal(expr.evaluate('(2+3)*4'), 20);
  assert.equal(expr.evaluate('-3+5'), 2);
  assert.equal(expr.evaluate('round2(10*7/100)'), 0.7);
  assert.equal(expr.evaluate('ceil(7/2)+floor(7/2)'), 7);
  assert.equal(expr.evaluate('a*b-c', { a: 3, b: 4, c: 2 }), 10);
  assert.equal(expr.evaluate('a>b && b>0', { a: 3, b: 2 }), true);
  assert.equal(expr.evaluate('a!=b', { a: 3, b: 3 }), false);
});
test('expr: cannot execute code or touch globals', () => {
  for (const bad of ['process.exit()', 'constructor', '__proto__', 'a;b', 'require("fs")', 'globalThis', 'x=1', '`1`']) {
    assert.throws(() => expr.evaluate(bad, {}), undefined, bad);
  }
  assert.throws(() => expr.evaluate('toString', {}));
});
test('text: slots, filters, pronouns, capitalization', () => {
  const scope = { role: { text: 'dental assistant' }, equip: { text: 'x-ray unit' }, p: { name: 'Yuki', subj: 'they', obj: 'them', poss: 'their', refl: 'themself' }, n: 1234.5, client: { text: 'patient', plural: 'patients' } };
  assert.equal(text.render('{role|a}', scope), 'a dental assistant');
  assert.equal(text.render('{equip|a}', scope), 'an x-ray unit');
  assert.equal(text.render('{Role|the}', scope), 'The dental assistant');
  assert.equal(text.render('{p} asked {p.obj} about {p.poss} work', scope), 'Yuki asked them about their work');
  assert.equal(text.render('{p.Subj} left', scope), 'They left');
  assert.equal(text.render('{n|money}', scope), '$1,234.50');
  assert.equal(text.render('{client.plural}', scope), 'patients');
});
test('text: unresolved or bad tokens throw instead of leaking', () => {
  assert.throws(() => text.render('{nothing}', {}));
  assert.throws(() => text.render('{p.bogus}', { p: { name: 'A' } }));
  assert.throws(() => text.render('{n|weird}', { n: 1 }));
  assert.throws(() => text.render('{n}', { n: NaN }));
});
test('text: article choice handles vowel-sound exceptions', () => {
  const r = (w) => text.render('{x|a}', { x: { text: w } });
  assert.equal(r('hour of overtime'), 'an hour of overtime');
  assert.equal(r('uniform check'), 'a uniform check');
  assert.equal(r('office manager'), 'an office manager');
  assert.equal(r('server'), 'a server');
});
test('order: precedence validity, alternates, cycles', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const prec = [{ before: 'a', after: 'b' }, { before: 'b', after: 'd' }, { before: 'a', after: 'c' }];
  assert.ok(order.isValid(['a', 'b', 'c', 'd'], ids, prec));
  assert.ok(order.isValid(['a', 'c', 'b', 'd'], ids, prec), 'valid alternate accepted');
  assert.ok(!order.isValid(['b', 'a', 'c', 'd'], ids, prec));
  assert.ok(!order.isValid(['a', 'b', 'c'], ids, prec), 'missing step rejected');
  assert.ok(!order.isValid(['a', 'a', 'b', 'c'], ids, prec), 'duplicate rejected');
  assert.ok(order.hasCycle(['a', 'b'], [{ before: 'a', after: 'b' }, { before: 'b', after: 'a' }]));
  assert.deepEqual(order.solution(ids, prec).length, 4);
  assert.ok(order.isValid(order.solution(ids, prec), ids, prec));
});
