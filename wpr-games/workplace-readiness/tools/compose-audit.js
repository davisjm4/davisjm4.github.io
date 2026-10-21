#!/usr/bin/env node
'use strict';
/* Before/after audit of reasoning variety. Baseline = the authored-only generator (js/core/generator.js);
 * new = the hybrid selector. Uses the same 502 filter combinations as tools/procedural-audit.js.
 * Writes tests/results/compose-audit.json (input to tools/compose-docs.js). */
const fs = require('fs');
const path = require('path');
const { loadLibrary } = require('./load-library.js');
const { loadCompose } = require('./compose-load.js');
const G = require('../js/core/generator.js');
const SEL = require('../js/compose/selector.js');
const T = require('../js/core/text.js');
const S = require('../js/data/schema.js');

const t0 = Date.now();
const lib = loadLibrary(), cx = loadCompose();
const tb = Date.now(); const h = SEL.createHybrid(lib, cx); const buildMs = Date.now() - tb;
const L = ['beginner', 'intermediate', 'advanced'], M = Object.keys(S.MODES);
const seeds = ['audit-a', 'audit-b', 'audit-c'];
const cxu = h.catalog.units;

/* ---------- filter list identical to tools/procedural-audit.js ---------- */
const configs = [];
const add = (label, filters) => configs.push({ label, filters });
add('all-skills/mixed/mixed-difficulty/any-setting', {});
for (const l of L) add('all-skills/mixed/' + l + '/any-setting', { difficulty: l });
for (const m of M) for (const l of L) add('all-skills/' + m + '/' + l + '/any-setting', { modes: [m], difficulty: l });
for (const ctx of lib.contexts) for (const m of M) for (const l of L) add('all-skills/' + m + '/' + l + '/' + ctx.id, { modes: [m], difficulty: l, context: ctx.id });
for (const s of lib.skills) for (const l of L) {
  add(s.id + '/mixed/' + l + '/any-setting', { skills: [s.id], difficulty: l });
  for (const m of M) add(s.id + '/' + m + '/' + l + '/any-setting', { skills: [s.id], modes: [m], difficulty: l });
}
const basePatterns = f => new Set(G.eligibleTemplates(lib, f).map(t => t.family + ':' + t.pattern)).size;
const filterRows = configs.map(c => ({ selection: c.label, before: basePatterns(c.filters), after: SEL.capacity(h, c.filters).signatures }));

/* ---------- 66 cells ---------- */
const cells = [];
for (const s of lib.skills.slice().sort((a, b) => a.number - b.number)) for (const l of L) {
  const cap = SEL.capacity(h, { skills: [s.id], difficulty: l });
  const modes = {}; M.forEach(m => { modes[m] = SEL.capacity(h, { skills: [s.id], difficulty: l, modes: [m] }).signatures; });
  cells.push({ skill: s.id, name: s.name, code: s.code, number: s.number, level: l, before: basePatterns({ skills: [s.id], difficulty: l }),
    authored: cap.authoredPatterns, composed: cap.composedConfigurations, total: cap.signatures, modes });
}

/* ---------- sessions ---------- */
const exactKey = c => JSON.stringify([c.mode, c.scenario, c.prompt, (c.options || []).map(o => o.text).sort(), (c.steps || []).map(s => s.text).sort(), c.doc ? c.doc.segments.map(s => s.text) : []]);
const norm = s => T.normalize(String(s || '').replace(/\d+/g, '#'));
function sessionStats(make, n) {
  const rows = seeds.map(seed => { const s = make(seed), cs = []; for (let i = 0; i < n; i++) cs.push(s.next()); return cs; });
  const avg = f => +(rows.reduce((a, cs) => a + f(cs), 0) / rows.length).toFixed(2);
  return { n, exactRepeats: avg(cs => cs.length - new Set(cs.map(exactKey)).size),
    reasoningRepeats: avg(cs => cs.length - new Set(cs.map(c => c.reasoning)).size),
    familyDistinct: avg(cs => new Set(cs.map(c => c.family)).size),
    scenarioRepeats: avg(cs => cs.length - new Set(cs.map(c => norm(c.scenario))).size) };
}
const sessionFilters = [['all-skills mixed', {}], ['one skill (Integrity), mixed difficulty', { skills: ['integrity'] }],
  ['one skill + Advanced (Mathematics)', { skills: ['mathematics'], difficulty: 'advanced' }], ['Advanced, Best Next Step', { modes: ['nextstep'], difficulty: 'advanced' }],
  ['Advanced, Put the Steps in Order', { modes: ['order'], difficulty: 'advanced' }], ['Advanced, Find the Problem', { modes: ['find'], difficulty: 'advanced' }]];
const sessions = sessionFilters.map(([label, f]) => ({
  label, before: [14, 20, 50, 100, 500].map(n => sessionStats(seed => G.createSession(lib, { seed, filters: f }), n)),
  after: [14, 20, 50, 100, 500].map(n => sessionStats(seed => SEL.createSession(h, { seed, filters: f }), n)) }));
// 20-question reasoning repeats across all 66 cells
let cellRepBefore = 0, cellRepAfter = 0, cellExactAfter = 0;
for (const c of cells) {
  const f = { skills: [c.skill], difficulty: c.level };
  cellRepBefore += sessionStats(seed => G.createSession(lib, { seed, filters: f }), 20).reasoningRepeats;
  const a = sessionStats(seed => SEL.createSession(h, { seed, filters: f }), 20);
  cellRepAfter += a.reasoningRepeats; cellExactAfter += a.exactRepeats;
}

/* ---------- structure of the composed system ---------- */
const sig = new Set(cxu.map(u => u.signature));
const byEngine = {}; cxu.forEach(u => { byEngine[u.engine] = byEngine[u.engine] || new Set(); byEngine[u.engine].add(u.signature); });
const rules = new Set(cxu.map(u => u.rule));
const issues = cx.kits.reduce((n, k) => n + (k.issues || []).length, 0);
const configsN = cx.kits.reduce((n, k) => n + (k.configs || []).length, 0);
const kitsByFw = {}; cx.kits.forEach(k => { kitsByFw[k.framework] = (kitsByFw[k.framework] || 0) + 1; });
const stateShapes = {}; cxu.filter(u => u.engine === 'state').forEach(u => {
  const k = u.difficulty + ':' + u.spec.active.length + 'active+' + u.spec.resolved.length + 'resolved';
  stateShapes[k] = stateShapes[k] || new Set(); stateShapes[k].add(u.signature); });
// surface variety: distinct normalized scenarios per signature (sample)
let surf = 0, surfN = 0;
cxu.filter((u, i) => i % 9 === 0).forEach(u => { const set = new Set(); for (let s = 0; s < 8; s++) { const host = u.hosts[s % u.hosts.length]; set.add(SEL.renderUnit(h, u, { seed: 'sv' + s, contextId: host.context }).scenario); } surf += set.size; surfN++; });
// distractor sources
const src = {}; let distractors = 0, withMis = 0;
SEL.generateMany(h, 3000, { seed: 'dq', filters: { modes: ['decision', 'nextstep'] } }).challenges.filter(c => c.source === 'composed').forEach(c => {
  Object.values(c.key.options).forEach(o => { if (o.role === 'best') return; distractors++; if (o.misconception) withMis++;
    const k = o.role === 'acceptable' ? 'acceptable (real but lower-priority issue)' : (o.source || '').split(':')[0]; src[k] = (src[k] || 0) + 1; }); });
// difficulty metrics
const metric = {}; L.forEach(l => { const us = cxu.filter(u => u.difficulty === l && u.engine === 'state'); metric[l] = {
  facts: +(us.reduce((a, u) => a + u.metrics.facts, 0) / us.length).toFixed(2), priorities: +(us.reduce((a, u) => a + u.metrics.priorities, 0) / us.length).toFixed(2) }; });
['process'].forEach(e => L.forEach(l => { const us = cxu.filter(u => u.difficulty === l && u.engine === e); if (us.length) metric[l].orderSteps = +(us.reduce((a, u) => a + u.metrics.steps, 0) / us.length).toFixed(2); metric[l].orderValidOrdersMax = Math.max(...us.map(u => u.metrics.branches)); }));
// performance
const tp = Date.now(); SEL.generateMany(h, 1000, { seed: 'perf' }); const perMs = (Date.now() - tp) / 1000;

const out = {
  generatedAt: new Date().toISOString(),
  summary: {
    authoredTemplates: lib.templates.length, authoredPatterns: new Set(lib.templates.map(t => t.family + ':' + t.pattern)).size,
    frameworks: cx.frameworks.filter(f => f.id !== '_defaults').length, kits: cx.kits.length, kitsByFramework: kitsByFw,
    issueComponents: issues, numericConfigs: configsN, composedFamilies: h.catalog.families.length,
    composedUnits: cxu.length, composedConfigurations: sig.size,
    configurationsByEngine: Object.fromEntries(Object.entries(byEngine).map(([k, v]) => [k, v.size])),
    decisionRules: rules.size, stateShapes: Object.fromEntries(Object.entries(stateShapes).map(([k, v]) => [k, v.size])),
    totalSignatures: SEL.capacity(h, {}).signatures,
    cellsAt20Before: cells.filter(c => c.before >= 20).length, cellsAt20After: cells.filter(c => c.total >= 20).length,
    filtersAt20Before: filterRows.filter(r => r.before >= 20).length, filtersAt20After: filterRows.filter(r => r.after >= 20).length, filterCount: filterRows.length,
    filtersEmptyAfter: filterRows.filter(r => r.after === 0).length,
    cellReasoningRepeats20Before: +cellRepBefore.toFixed(2), cellReasoningRepeats20After: +cellRepAfter.toFixed(2), cellExactRepeats20After: +cellExactAfter.toFixed(2),
    avgDistinctScenariosPerConfigurationIn8Renders: +(surf / surfN).toFixed(2),
    distractorSources: src, distractorsWithMisconception: withMis + ' of ' + distractors,
    difficultyMetrics: metric, catalogBuildMs: buildMs, msPerChallenge: +perMs.toFixed(2), bundleBytes: fs.statSync(path.join(__dirname, '..', 'js', 'data', 'compose-bundle.js')).size
  },
  cells, sessions, filters: filterRows, auditSeconds: Math.round((Date.now() - t0) / 1000)
};
const outPath = path.join(__dirname, '..', 'tests', 'results', 'compose-audit.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary, null, 1));
