#!/usr/bin/env node
/* Diversity audit for the hybrid (authored + compositional) generator.
   Surface variety and reasoning variety are measured SEPARATELY:
     exact      - the full displayed challenge (prompt, passage, sentences, options, target)
     passage    - the source passage text
     surface    - kit + fictional name + numbers (vocabulary/scenario combination)
     scenario   - kit + scenario elements used (feature/setting/stage/observation ids), ignoring the question type
     claim      - question/claim relationship = the configuration (structure + its elements)
     evidence   - kit + the two evidence facts' identities (who supports the claim), ignoring wording
     structure  - the reasoning structure (authored models: "authored:<family>")
     modeTarget - practice mode + target role
   A new seed, a new name, a shuffled pair order or answer order never counts as a new
   configuration, evidence relationship or structure. Writes tests/results/diversity.json. */
const fs = require('fs'), path = require('path');
const G = require('../js/engine/generator.js'), S = require('../js/engine/structure.js'), RNG = require('../js/engine/rng.js');
const C = require('../js/compose/compose.js');
const bundle = require('../js/data/content-bundle.js'), lib = require('../js/data/compose-bundle.js');
const idx = G.makeIndex(bundle, lib), cidx = idx.compose;
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const SCEN_KEYS = ['f', 'fa', 'fb', 's', 'sy', 'sn', 'i', 'k', 'a', 'b', 'j', 'r', 'c'];

// Evidence identity per configuration (stable across seeds: fact ids, not wording).
const evidenceOf = {};
cidx.entries.forEach(e => {
  const r = C.buildResponse(cidx, e.id, RNG.create('ev'));
  evidenceOf[e.id] = e.kitId + '|' + [r.pairs[1].factId, r.pairs[2].factId].map(x => x.replace(/:(?:design|result)$/, '')).sort().join('+');
});
bundle.models.forEach(m => { evidenceOf[m.id] = m.topicId + '|' + m.ev.slice().sort().join('+'); });

function scenarioKey(id) { const e = cidx.byId[id]; return e ? e.kitId + '|' + SCEN_KEYS.filter(k => e.params[k] !== undefined).map(k => e.params[k]).sort().join(',') : 'authored|' + id; }
function sig(ch) {
  const e = cidx.byId[ch.modelId];
  const scen = scenarioKey(ch.modelId);
  return {
    exact: JSON.stringify([ch.mode, norm(ch.prompt), norm(ch.excerpt), S.SLOTS.map(k => norm(ch.info[k].text)), (ch.options || []).map(o => norm(o.text)).sort(), ch.targetKey || ch.missingSlot || '']),
    passage: norm(ch.excerpt),
    surface: e ? e.kitId + '|' + ch.surface.name + '|' + (ch.surface.numbers || []).join(',') : 'authored|' + ch.passageId,
    scenario: scen,
    claim: ch.modelId,
    evidence: evidenceOf[ch.modelId],
    structure: ch.structure || ('authored:' + ch.family),
    modeTarget: ch.mode + '|' + (ch.targetKey || ch.missingSlot || '-')
  };
}
const LAYERS = ['exact', 'passage', 'surface', 'scenario', 'claim', 'evidence', 'structure', 'modeTarget'];

function session(sel, level, n, seed) {
  const g = new G.Generator(bundle, seed, { compose: lib });
  const seen = {}; LAYERS.forEach(l => { seen[l] = new Set(); });
  const rep = {}; LAYERS.forEach(l => { rep[l] = 0; });
  const marks = {}; let exactGen = 0;
  for (let i = 0; i < n; i++) {
    const ch = g.next(Object.assign({ mode: 'mixed', level }, sel)); const s = sig(ch);
    if (seen.exact.has(s.exact) && ch.generated) exactGen++;
    LAYERS.forEach(l => { if (seen[l].has(s[l])) rep[l]++; seen[l].add(s[l]); });
    if ([14, 20, 50, 100].includes(i + 1)) { marks[i + 1] = { exactGenerated: exactGen }; LAYERS.forEach(l => { marks[i + 1][l] = { repeats: rep[l], distinct: seen[l].size }; }); }
  }
  return marks;
}

const rows = [];
bundle.topics.forEach(t => S.LEVELS.forEach(level => {
  const gen = cidx.entries.filter(e => e.topicId === t.id && e.level === level);
  const auth = bundle.models.filter(m => m.topicId === t.id && m.level === level);
  const evidenceKeys = new Set(gen.map(e => evidenceOf[e.id]).concat(auth.map(m => evidenceOf[m.id])));
  const scenarioKeys = new Set(gen.map(e => scenarioKey(e.id)));
  const structures = new Set(gen.map(e => e.structure));
  // Evidence relationships used by more than one structure (same facts, different question).
  const evStruct = {}; gen.forEach(e => { (evStruct[evidenceOf[e.id]] = evStruct[evidenceOf[e.id]] || new Set()).add(e.structure); });
  const sharedEvidence = Object.values(evStruct).filter(s => s.size > 1).length;
  const sessions = [0, 1, 2].map(sd => session({ subject: t.subject, topics: [t.id] }, level, 100, 'div|' + t.id + '|' + level + '|' + sd));
  const worst = (n, l) => Math.max(...sessions.map(s => s[n][l].repeats));
  const mean = (n, l) => sessions.reduce((a, s) => a + s[n][l].distinct, 0) / sessions.length;
  rows.push({
    subject: t.subject, topic: t.id, title: t.title, level,
    configurations: gen.length + auth.length, generatedConfigurations: gen.length, authoredModels: auth.length,
    structures: structures.size, evidenceRelationships: evidenceKeys.size, scenarioCombinations: scenarioKeys.size, sharedEvidenceAcrossStructures: sharedEvidence,
    in14: { exact: worst(14, 'exact'), claim: worst(14, 'claim'), evidence: worst(14, 'evidence'), structureRepeats: worst(14, 'structure'), distinctStructures: mean(14, 'structure') },
    in20: { exact: worst(20, 'exact'), claim: worst(20, 'claim'), evidence: worst(20, 'evidence'), structureRepeats: worst(20, 'structure'), distinctStructures: mean(20, 'structure') },
    in50: { exact: worst(50, 'exact'), claim: worst(50, 'claim'), evidence: worst(50, 'evidence'), distinctClaims: mean(50, 'claim'), distinctStructures: mean(50, 'structure') },
    in100: { exact: worst(100, 'exact'), exactGenerated: Math.max(...sessions.map(s => s[100].exactGenerated)), claim: worst(100, 'claim'), evidence: worst(100, 'evidence'), distinctClaims: mean(100, 'claim'), distinctSurface: mean(100, 'surface'), distinctPassages: mean(100, 'passage') }
  });
}));

// All-topics sessions, including long ones.
const allTopics = S.LEVELS.concat(['all']).map(level => {
  const g = new G.Generator(bundle, 'div-all|' + level, { compose: lib });
  const seen = {}; LAYERS.forEach(l => { seen[l] = new Set(); });
  const out = { level };
  for (let i = 0; i < 500; i++) {
    const s = sig(g.next({ mode: 'mixed', level }));
    LAYERS.forEach(l => seen[l].add(s[l]));
    if ([14, 20, 50, 100, 500].includes(i + 1)) { out[i + 1] = {}; LAYERS.forEach(l => { out[i + 1][l] = seen[l].size; }); }
  }
  return out;
});

// Normalized response skeletons: names and numbers replaced, then compared across seeds of one configuration.
let skeletonSame = 0, skeletonTotal = 0;
cidx.entries.filter((e, i) => i % 7 === 0).forEach(e => {
  const sk = new Set();
  for (let s = 0; s < 4; s++) {
    const r = C.buildResponse(cidx, e.id, RNG.create('sk' + s));
    sk.add(S.SLOTS.map(k => r.sentences[k].text).join(' ').replace(new RegExp(r.generated.surfaceName, 'g'), 'NAME').replace(/\d+/g, 'N'));
  }
  skeletonTotal++; if (sk.size === 1) skeletonSame++;
});

const structureTotals = {};
cidx.entries.forEach(e => { const k = e.structure; structureTotals[k] = structureTotals[k] || { family: e.family, levels: new Set(), configurations: 0 }; structureTotals[k].levels.add(e.level); structureTotals[k].configurations++; });
Object.values(structureTotals).forEach(v => { v.levels = [...v.levels]; });

const report = { ranAt: new Date().toISOString(), rows, allTopics, skeleton: { configurationsSampled: skeletonTotal, identicalWordingAcrossSeeds: skeletonSame }, structureTotals,
  totals: { kits: lib.kits.length, generatedConfigurations: cidx.entries.length, authoredModels: bundle.models.length, structures: Object.keys(structureTotals).length } };
fs.writeFileSync(path.join(__dirname, '..', 'tests', 'results', 'diversity.json'), JSON.stringify(report, null, 2));
const fails = rows.filter(r => r.subject === 'Mathematics'
  ? r.configurations < 6 || r.in20.exact
  : r.configurations < 20 || r.in20.exact || r.in20.claim);
const legacyPass = rows.filter(r => r.subject !== 'Mathematics' && r.configurations >= 20 && !r.in20.exact && !r.in20.claim).length;
const mathPass = rows.filter(r => r.subject === 'Mathematics' && r.configurations >= 6 && !r.in20.exact).length;
console.log('Diversity audit: ' + rows.length + ' topic/difficulty combinations; ' + legacyPass + ' original pools meet the 20-problem gate; ' + mathPass + ' math pools provide six authored models with no exact repeat in 20 (review begins at pool exhaustion).');
console.log('Worst evidence-relationship repeats in 20: ' + Math.max(...rows.map(r => r.in20.evidence)) + '; worst in 100 (configuration): ' + Math.max(...rows.map(r => r.in100.claim)));
console.log('Skeletons identical across 4 seeds: ' + skeletonSame + '/' + skeletonTotal);
process.exit(fails.length ? 1 : 0);
