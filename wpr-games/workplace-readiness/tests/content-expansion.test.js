'use strict';
/* Content-only tests for the procedural expansion kits (x1/x2/x3 files) and the repaired big-closing-impacts kit. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadLibrary } = require('../tools/load-library.js');
const { loadCompose } = require('../tools/compose-load.js');
const SEL = require('../js/compose/selector.js');
const K = require('../js/compose/check.js');

const lib = loadLibrary(), cx = loadCompose(), h = SEL.createHybrid(lib, cx);
const dir = path.join(__dirname, '..', 'content', 'compose', 'kits');
const NEW_FILES = fs.readdirSync(dir).filter(f => /-x[0-9]\.json$/.test(f));
const NEW = [].concat(...NEW_FILES.map(f => JSON.parse(fs.readFileSync(path.join(dir, f))).kits));
const TARGETS = {
  'int-rules-and-regulations': 'integrity:laws-and-regulations', 'ite-new-technology': 'information-technology:emerging-technology',
  'ise-responsible-technology': 'information-security:ethical-technology-use', 'ise-every-format': 'information-security:information-formats',
  'ili-fit-to-the-task': 'information-literacy:judge-relevance', 'eff-care-for-equipment': 'efficiency-and-productivity:capital-resources',
  'eff-sustainable-practices': 'efficiency-and-productivity:natural-resources', 'big-community-and-industry': 'big-picture-thinking:community-and-industry',
  'cre-why-originality-matters': 'creativity-and-innovation:value-of-creativity', 'con-working-across-differences': 'conflict-resolution:personality-and-culture',
  'wet-owning-mistakes': 'work-ethic:accepting-consequences', 'int-trust-has-consequences': 'integrity:importance-of-integrity',
  'ise-acceptable-use-limits': 'information-security:acceptable-use', 'ite-handling-devices': 'information-technology:hardware-and-devices',
  'ctp-compare-solutions': 'critical-thinking-and-problem-solving:evaluate-solutions'
};

test('the expansion adds fifteen kits, each aimed at one thin objective as its primary concept', () => {
  assert.equal(NEW.length, 15);
  for (const k of NEW) assert.equal(k.concepts[0], TARGETS[k.id], k.id);
});
test('every kit passes the authoring rules and provides decisions, ordering and find-the-problem content', () => {
  const r = K.validateCompose(lib, cx);
  assert.deepEqual(r.errors, []);
  for (const k of NEW) {
    assert.ok(k.issues.length >= 4, k.id + ' issues');
    assert.ok(k.process && k.process.steps.length >= 3, k.id + ' process');
    assert.ok(k.doc.lines.filter(l => l.bad).length >= 3, k.id + ' defects');
    const levels = new Set([].concat(...k.doc.lines.filter(l => l.bad).map(l => l.bad.map(b => b.level))));
    assert.equal(levels.size, 3, k.id + ' defect levels');
  }
});
test('priority between independent issues is only asserted where the stated tier reason supports it', () => {
  for (const k of NEW) {
    const ex = new Set((k.exclusive || []).map(p => p.slice().sort().join('|')));
    const tiered = k.issues.filter(i => i.tier >= 3);
    for (let a = 0; a < tiered.length; a++) for (let b = a + 1; b < tiered.length; b++)
      assert.ok(ex.has([tiered[a].id, tiered[b].id].sort().join('|')), k.id + ': ' + tiered[a].id + ' and ' + tiered[b].id + ' may not co-occur');
  }
});
test('seeded renders of each new kit are logically valid and free of key-position, length and capitalisation cues', () => {
  const by = {};
  for (const skill of [...new Set(NEW.map(k => k.skill))]) {
    const { challenges } = SEL.generateMany(h, 2500, { seed: 'content-test-' + skill, filters: { skills: [skill] } });
    for (const c of challenges) {
      const u = h.unitsById[c.templateId]; if (!u || u.kind !== 'composed' || !TARGETS[u.kitId]) continue;
      const r = by[u.kitId] || (by[u.kitId] = { n: 0, choice: 0, pos: [0, 0, 0, 0], longest: 0, bad: 0 });
      r.n++; assert.deepEqual(K.checkInstance(c, h), [], u.kitId);
      [c.scenario || '', ...(c.options || []).map(o => o.text)].forEach(t => { if (/(^|(?<![ap]\.m)[.!?]\s)[a-z]/.test(t) || /\b(\w+) \1\b/i.test(t)) r.bad++; });
      if (c.options) {
        r.choice++; r.pos[c.options.findIndex(o => o.id === c.key.bestId)]++;
        const L = c.options.map(o => o.text.split(/\s+/).length), m = Math.max(...L), bi = c.options.findIndex(o => o.id === c.key.bestId);
        if (L[bi] === m && L.filter(x => x === m).length === 1) r.longest++;
      }
    }
  }
  for (const id of Object.keys(TARGETS)) {
    const r = by[id]; assert.ok(r && r.choice >= 200, id + ' rendered ' + (r && r.choice));
    const e = r.choice / 4, chi = r.pos.reduce((a, p) => a + (p - e) * (p - e) / e, 0);
    assert.ok(chi < 16.27, id + ' position chi-square ' + chi.toFixed(2));
    assert.ok(r.longest / r.choice < 0.45, id + ' longest-is-key ' + (r.longest / r.choice).toFixed(2));
    assert.equal(r.bad, 0, id + ' capitalisation or doubled-word defects');
  }
});
test('regression: big-closing-impacts no longer keys the longest option', () => {
  const { challenges } = SEL.generateMany(h, 2500, { seed: 'bci', filters: { skills: ['big-picture-thinking'] } });
  let n = 0, long = 0;
  for (const c of challenges) {
    const u = h.unitsById[c.templateId]; if (!u || u.kitId !== 'big-closing-impacts' || !c.options) continue;
    n++; const L = c.options.map(o => o.text.split(/\s+/).length), m = Math.max(...L), bi = c.options.findIndex(o => o.id === c.key.bestId);
    if (L[bi] === m && L.filter(x => x === m).length === 1) long++;
  }
  assert.ok(n > 200 && long / n < 0.45, long + '/' + n);
});
test('generation is deterministic for a seed', () => {
  const a = SEL.generateMany(h, 60, { seed: 'det', filters: { skills: ['integrity'] } }).challenges.map(c => c.id + c.scenario);
  const b = SEL.generateMany(h, 60, { seed: 'det', filters: { skills: ['integrity'] } }).challenges.map(c => c.id + c.scenario);
  assert.deepEqual(a, b);
});
test('the committed coverage matrix is current and the targeted objectives are no longer thin', () => {
  execFileSync('node', [path.join(__dirname, '..', 'tools', 'content-coverage-matrix.js'), '--check'], { stdio: 'pipe' });
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports', 'CONTENT_COVERAGE_MATRIX.json')));
  assert.equal(m.areas, 22); assert.equal(m.objectives, 94);
  for (const concept of Object.values(TARGETS)) assert.ok(m.matrix.find(r => r.concept === concept).primaryReasoningKeys >= 8, concept);
});

test('independent discussion steps accept either order while unsupported dependencies fail', () => {
  const G = require('../js/core/grader.js');
  const u = h.catalog.units.find(u => u.kitId === 'con-working-across-differences' && u.engine === 'process' && u.spec.steps.length === 4);
  const q = SEL.renderUnit(h, u, {seed:'alternative-discussion-order'});
  assert.equal(G.grade(q,{order:['listen','share','propose','try']}).correct,true);
  assert.equal(G.grade(q,{order:['share','listen','propose','try']}).correct,true);
  assert.equal(G.grade(q,{order:['propose','share','listen','try']}).correct,false);
});
