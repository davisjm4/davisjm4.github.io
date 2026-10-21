'use strict';
/* Compositional engine: content validity, determinism, counterfactual reasoning and
 * irrelevance. These tests render real instances and read the keyed answer from the instance. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLibrary } = require('../tools/load-library.js');
const { loadCompose } = require('../tools/compose-load.js');
const SEL = require('../js/compose/selector.js');
const E = require('../js/compose/engine.js');
const K = require('../js/compose/check.js');
const O = require('../js/core/order.js');
const V = require('../js/core/validator.js');

const lib = loadLibrary(), cx = loadCompose(), h = SEL.createHybrid(lib, cx);
const stateKits = cx.kits.filter(k => (k.engine || 'state') === 'state' && (k.issues || []).length);
const unitsOf = (kitId, pred) => h.catalog.units.filter(u => u.kitId === kitId && pred(u));
const bestSource = c => c.key.options[c.key.bestId].source;
const render = (u, seed, ctx) => SEL.renderUnit(h, u, { seed: seed, contextId: ctx });
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

/* ---------- content ---------- */

test('content: every kit passes kit validation with no errors', () => {
  const r = K.validateCompose(lib, cx);
  assert.deepEqual(r.errors, []);
});
test('content: authored library is untouched and still validates (140 templates, 0 errors)', () => {
  const r = V.validateLibrary(lib);
  assert.equal(lib.templates.length, 140);
  assert.deepEqual(r.errors, []);
});
test('content: 12 reusable frameworks, every kit uses one, every framework is used', () => {
  const fws = cx.frameworks.filter(f => f.id !== '_defaults');
  assert.equal(fws.length, 12);
  const used = new Set(cx.kits.map(k => k.framework));
  fws.forEach(f => assert.ok(used.has(f.id), f.id + ' unused'));
});
test('content: every one of the 22 skills has composed units in every difficulty', () => {
  lib.skills.forEach(s => E.LEVELS.forEach(l => assert.ok(h.catalog.units.some(u => u.skill === s.id && u.difficulty === l), s.id + '/' + l)));
});
test('content: unit ids unique; composed families never collide with authored families', () => {
  assert.equal(new Set(h.units.map(u => u.id)).size, h.units.length);
  h.catalog.families.forEach(f => assert.ok(!lib.familiesById[f.id], f.id));
});
test('content: every bundle offered to a kit actually provides its typed slots', () => {
  h.catalog.units.forEach(u => {
    const kit = h.catalog.kitsById[u.kitId];
    u.hosts.forEach(x => (kit.requires || []).forEach(slot => assert.ok(cx.slots[x.bundle][slot], u.id + ' ' + x.bundle + ' lacks ' + slot)));
  });
});

/* ---------- determinism ---------- */

test('determinism: same seed and filters give an identical 300-challenge hybrid stream', () => {
  const a = SEL.generateMany(h, 300, { seed: 'det' }).challenges, b = SEL.generateMany(h, 300, { seed: 'det' }).challenges;
  assert.deepEqual(a, b);
});
test('determinism: generation never calls Math.random', () => {
  const orig = Math.random; let n = 0; Math.random = () => { n++; return 0.5; };
  try { SEL.generateMany(h, 150, { seed: 'nr' }); } finally { Math.random = orig; }
  assert.equal(n, 0);
});
test('determinism: challenge n does not change when later challenges are requested', () => {
  const short = SEL.generateMany(h, 12, { seed: 'ind' }).challenges, long = SEL.generateMany(h, 60, { seed: 'ind' }).challenges.slice(0, 12);
  assert.deepEqual(short, long);
});
test('determinism: renderUnit is a pure function of unit + seed + setting', () => {
  h.catalog.units.filter((u, i) => i % 7 === 0).forEach(u => assert.deepEqual(render(u, 's', u.hosts[0].context), render(u, 's', u.hosts[0].context)));
});

/* ---------- counterfactual reasoning ---------- */

test('counterfactual: issue active vs the same prerequisite satisfied -> the answer changes (every clearable issue)', () => {
  let pairs = 0;
  stateKits.forEach(kit => kit.issues.filter(i => i.clear).forEach(is => {
    const A = unitsOf(kit.id, u => u.engine === 'state' && u.mode === 'nextstep' && sameSet(u.spec.active, [is.id]) && !u.spec.resolved.length)[0];
    const B = unitsOf(kit.id, u => u.engine === 'state' && u.mode === 'nextstep' && !u.spec.active.length && sameSet(u.spec.resolved, [is.id]))[0];
    if (!A || !B) return;
    for (let s = 0; s < 3; s++) {
      const a = render(A, 'cf' + s), b = render(B, 'cf' + s);
      assert.equal(bestSource(a), 'act:' + is.id, kit.id + ': with ' + is.id + ' active the key is its action');
      assert.equal(bestSource(b), 'proceed', kit.id + ': with ' + is.id + ' satisfied the key is to proceed');
      assert.notEqual(a.reasoning, b.reasoning);
      // in the satisfied version, the old action is offered and keyed as a redundant distractor (if offered)
      Object.values(b.key.options).filter(o => o.source === 'redo:' + is.id).forEach(o => assert.equal(o.role, 'distractor'));
    }
    pairs++;
  }));
  assert.ok(pairs >= 60, 'tested ' + pairs + ' missing/verified pairs');
});

test('counterfactual: two active issues vs the higher one resolved -> the decisive action moves to the other issue', () => {
  let pairs = 0;
  stateKits.forEach(kit => {
    unitsOf(kit.id, u => u.engine === 'state' && u.mode === 'nextstep' && u.spec.active.length === 2 && !u.spec.resolved.length).forEach(A => {
      const [hi, lo] = A.spec.active;
      const B = unitsOf(kit.id, u => u.engine === 'state' && u.mode === 'nextstep' && sameSet(u.spec.active, [lo]) && sameSet(u.spec.resolved, [hi]))[0];
      if (!B) return;
      const a = render(A, 'p'), b = render(B, 'p');
      assert.equal(bestSource(a), 'act:' + hi);
      assert.equal(bestSource(b), 'act:' + lo);
      const loOpt = Object.values(a.key.options).find(o => o.source === 'act:' + lo);
      if (loOpt) assert.equal(loOpt.role, 'acceptable', 'the lower-priority issue is acceptable-but-not-best while the higher one is active');
      pairs++;
    });
  });
  assert.ok(pairs >= 80, 'tested ' + pairs + ' priority pairs');
});

test('counterfactual: adding a higher-priority issue to a state changes the key to that issue', () => {
  let n = 0;
  stateKits.forEach(kit => {
    const tier = Object.fromEntries(kit.issues.map(i => [i.id, i.tier]));
    unitsOf(kit.id, u => u.engine === 'state' && u.mode === 'decision' && u.spec.active.length === 1 && !u.spec.resolved.length).forEach(A => {
      const base = A.spec.active[0];
      unitsOf(kit.id, u => u.engine === 'state' && u.mode === 'nextstep' && u.spec.active.length === 2 && !u.spec.resolved.length && u.spec.active.includes(base)).forEach(B => {
        const other = B.spec.active.find(x => x !== base);
        const expected = tier[other] < tier[base] ? other : base;
        assert.equal(bestSource(render(B, 'h')), 'act:' + expected, kit.id + ' ' + B.spec.active.join('+'));
        n++;
      });
    });
  });
  assert.ok(n >= 150, 'checked ' + n);
});

test('irrelevance: setting, names, wording variants, details and pressure never change the key or the signature', () => {
  let n = 0;
  h.catalog.units.filter(u => u.engine === 'state').filter((u, i) => i % 5 === 0).forEach(u => {
    const ref = render(u, 'irr0', u.hosts[0].context), srcs = new Set(), sigs = new Set(), scen = new Set();
    for (let s = 0; s < 12; s++) {
      const host = u.hosts[s % u.hosts.length];
      const c = render(u, 'irr' + s, host.context);
      srcs.add(bestSource(c)); sigs.add(c.reasoning); scen.add(c.scenario); n++;
    }
    assert.equal(srcs.size, 1, u.id + ' key changed with surface details');
    assert.equal(sigs.size, 1, u.id + ' signature changed with surface details');
    assert.ok(scen.size > 1 || u.hosts.length === 1, u.id + ' surface never varies');
    assert.equal([...srcs][0], bestSource(ref));
  });
  assert.ok(n > 3000);
});

test('irrelevance: changing numbers that do not change the decision keeps the numeric signature', () => {
  h.catalog.units.filter(u => u.engine === 'numeric').forEach(u => {
    const sigs = new Set(), texts = new Set();
    for (let s = 0; s < 10; s++) { const c = render(u, 'num' + s); sigs.add(c.reasoning); texts.add(c.scenario); }
    assert.equal(sigs.size, 1); assert.ok(texts.size > 1, u.id + ' numbers never vary');
  });
});

test('counterfactual numeric pairs: the decisive constraint flips the keyed choice', () => {
  const pairs = [['bulk-threshold-cheaper', 'bulk-threshold-not-worth', 'b', 'a'], ['coupon-percent-better', 'coupon-fixed-better', 'a', 'b'],
    ['supplier-over-budget', 'supplier-within-budget', 'b', 'a']];
  pairs.forEach(([x, y, kx, ky]) => {
    const ux = h.catalog.units.find(u => u.spec.config === x), uy = h.catalog.units.find(u => u.spec.config === y);
    for (let s = 0; s < 50; s++) {
      assert.equal(bestSource(render(ux, 'np' + s)), kx, x);
      assert.equal(bestSource(render(uy, 'np' + s)), ky, y);
    }
  });
});

/* ---------- process (ordering) ---------- */

test('ordering: variants of a kit differ in their valid-order sets when a prerequisite step is added', () => {
  let n = 0;
  cx.kits.filter(k => k.process).forEach(kit => {
    const vs = unitsOf(kit.id, u => u.engine === 'process');
    vs.forEach(a => vs.forEach(b => {
      if (b.spec.steps.length !== a.spec.steps.length + 1 || !a.spec.steps.every(x => b.spec.steps.includes(x))) return;
      const ca = render(a, 'o'), cb = render(b, 'o');
      const added = b.spec.steps.find(x => !a.spec.steps.includes(x));
      assert.ok(cb.key.precedence.some(p => p.before === added || p.after === added), kit.id + ': added step ' + added + ' has a dependency');
      assert.notEqual(ca.reasoning, cb.reasoning);
      n++;
    }));
  });
  assert.ok(n >= 60, 'checked ' + n + ' process extensions');
});
test('ordering: every accepted order respects the full dependency graph, and the grader accepts every valid alternate', () => {
  const G = require('../js/core/grader.js');
  h.catalog.units.filter(u => u.engine === 'process').forEach(u => {
    const c = render(u, 'alt');
    const ids = c.steps.map(s => s.id), valid = O.enumerateValid(ids, c.key.precedence);
    assert.ok(valid.length >= 1 && valid.length / [1, 1, 2, 6, 24, 120][ids.length] <= 0.25);
    valid.forEach(v => assert.ok(G.grade(c, { order: v }).correct, u.id + ' rejects a valid order'));
    assert.deepEqual(K.checkInstance(c, h), []);
  });
});

/* ---------- find the problem ---------- */

test('find: exactly one defect, on the unit\'s line, and every other line is the correct version', () => {
  h.catalog.units.filter(u => u.engine === 'defect').forEach(u => {
    for (let s = 0; s < 4; s++) {
      const c = render(u, 'f' + s);
      const probs = Object.entries(c.key.segments).filter(([, v]) => v.problem);
      assert.equal(probs.length, 1);
      assert.equal(probs[0][0], u.spec.line);
      assert.deepEqual(K.checkInstance(c, h), []);
    }
  });
});

/* ---------- checker catches tampering ---------- */

test('checker: a tampered key (best moved to a lower-priority issue) is rejected', () => {
  const u = h.catalog.units.find(x => x.engine === 'state' && x.spec.active.length === 2 && x.mode === 'nextstep');
  const c = render(u, 't');
  const acc = Object.keys(c.key.options).find(k => c.key.options[k].role === 'acceptable');
  c.key.options[c.key.bestId].role = 'acceptable'; c.key.options[acc].role = 'best'; c.key.bestId = acc;
  assert.ok(K.checkInstance(c, h).length > 0);
});
test('checker: a scenario missing the decisive fact is rejected', () => {
  const u = h.catalog.units.find(x => x.engine === 'state' && x.spec.active.length === 1);
  const c = render(u, 't');
  c.scenario = c.scenario.replace(c.cx.statements[0].text, '');
  assert.ok(K.checkInstance(c, h).some(e => /missing from scenario|not stated/.test(e)));
});
