#!/usr/bin/env node
/* Independent seeded repetition audit. This measures whole challenge, passage, model,
   semantic-task, structure, and topic repetition separately; a shuffle is never a new model. */
const fs = require('fs');
const path = require('path');
const G = require('../js/engine/generator.js');
const bundle = require('../js/data/content-bundle.js');
const modes = ['mixed', 'identify', 'rearrange', 'missing'];
const levels = ['all', 'beginner', 'intermediate', 'advanced'];
const lengths = [14, 20, 50, 100, 500];
const seeds = ['audit-a', 'audit-b', 'audit-c', 'audit-d', 'audit-e'];
const topicGroups = [
  { id: 'water-weather-reef', topics: ['water-cycle', 'lightning', 'coral-reefs'] },
  { id: 'moon-mars', topics: ['moon-phases', 'mars-rovers'] },
  { id: 'energy-machines', topics: ['solar-panels', 'levers', 'bicycle-gears'] },
  { id: 'biology', topics: ['honeybees', 'cactus', 'coral-reefs'] }
];
function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function challengeKey(c) {
  return JSON.stringify([c.mode, c.level, c.modelId, c.question, normalize(c.prompt), normalize(c.excerpt),
    Object.keys(c.info || {}).sort().map(k => normalize(c.info[k].text)),
    (c.options || []).map(o => normalize(o.text)).sort(),
    (c.items || []).map(x => x.id), c.missingSlot || null, c.targetKey || null, c.correctId || null,
    c.solution || null]);
}
function structuralKey(c) {
  return [c.mode, c.level, c.family, c.role || c.targetRole || c.missingRole || '', c.multi ? 'multi' : 'single'].join('|');
}
function one(selection, mode, level, n, seed) {
  const g = new G.Generator(bundle, seed);
  g.setSelection({ subject: selection.subject || 'all', topics: selection.topics || null });
  const sets = { exact: new Set(), passage: new Set(), model: new Set(), semantic: new Set(), structure: new Set() };
  const family = {}; const topics = []; const models = [];
  let exactRepeat = 0, passageRepeat = 0, modelRepeat = 0, semanticRepeat = 0, structureRepeat = 0;
  for (let i = 0; i < n; i++) {
    const c = g.next({ mode, level, subject: selection.subject || 'all', topics: selection.topics || null });
    const values = {
      exact: challengeKey(c), passage: c.topicId + '|' + (c.passageId || normalize(c.excerpt)), model: c.modelId,
      semantic: c.signature || [c.mode, c.modelId, c.missingSlot || c.role || ''].join('|'), structure: structuralKey(c)
    };
    for (const k of Object.keys(values)) {
      if (sets[k].has(values[k])) {
        if (k === 'exact') exactRepeat++;
        if (k === 'passage') passageRepeat++;
        if (k === 'model') modelRepeat++;
        if (k === 'semantic') semanticRepeat++;
        if (k === 'structure') structureRepeat++;
      }
      sets[k].add(values[k]);
    }
    family[c.family] = (family[c.family] || 0) + 1;
    topics.push(c.topicId);
    models.push(c.modelId);
  }
  let topicRepeated = 0, topicBackToBack = 0;
  for (let i = 0; i < topics.length; i++) {
    if (topics.slice(0, i).includes(topics[i])) topicRepeated++;
    if (i && topics[i] === topics[i - 1]) topicBackToBack++;
  }
  return {
    n, exactRepeat, passageRepeat, modelRepeat, semanticRepeat, structureRepeat,
    distinctExact: sets.exact.size, distinctPassages: sets.passage.size, distinctModels: sets.model.size,
    distinctSemanticTasks: sets.semantic.size, distinctStructures: sets.structure.size,
    topicRepeated, topicBackToBack, family, first14Models: new Set(models.slice(0, 14)).size, first20Models: new Set(models.slice(0, 20)).size
  };
}
function average(xs, key) { return +(xs.reduce((s, x) => s + x[key], 0) / xs.length).toFixed(1); }
function summarize(selection, mode, level, n) {
  const samples = seeds.map(seed => one(selection, mode, level, n, seed));
  const result = { selection: selection.id, mode, level, n };
  ['exactRepeat', 'passageRepeat', 'modelRepeat', 'semanticRepeat', 'structureRepeat', 'distinctExact', 'distinctPassages', 'distinctModels', 'distinctSemanticTasks', 'distinctStructures', 'topicRepeated', 'topicBackToBack', 'first14Models', 'first20Models'].forEach(k => result[k] = average(samples, k));
  result.familyCountsAcrossSeeds = {};
  for (const f of new Set(samples.flatMap(s => Object.keys(s.family)))) result.familyCountsAcrossSeeds[f] = samples.reduce((sum, s) => sum + s.family[f], 0);
  return result;
}
const selections = [{ id: 'all-topics', subject: 'all', topics: null }]
  .concat(bundle.topics.map(t => ({ id: t.id, subject: 'all', topics: [t.id] })))
  .concat(topicGroups.map(g => ({ id: g.id, subject: 'all', topics: g.topics })));
const results = [];
// Broad sweep: all modes and difficulty filters across all content; all sizes and five seeds.
for (const mode of modes) for (const level of levels) for (const n of lengths) results.push(summarize(selections[0], mode, level, n));
// Every exact topic is exercised in every mode and difficulty, at every session length.
for (const selection of selections.slice(1, 16)) for (const mode of modes) for (const level of levels) for (const n of lengths) results.push(summarize(selection, mode, level, n));
// Curated related-topic pools are sampled in Mixed Practice at all levels and all session lengths.
for (const selection of selections.slice(16)) for (const n of lengths) results.push(summarize(selection, 'mixed', 'all', n));
const report = { generatedAt: new Date().toISOString(), definitions: {
  exact: 'same mode, model, question, prompt, excerpt, response sentences, options, and item set after whitespace/punctuation normalization',
  passage: 'same topic and selected source-fact set, regardless of fact display order',
  model: 'same authored question/claim/evidence/explanation/summary model, regardless of mode or shuffle',
  semantic: 'same mode + authored model + target slot/role',
  structure: 'mode + level + reasoning family + target role/slot category'
}, library: {
  topics: bundle.topics.length, subjects: bundle.subjects.length, sourceFacts: bundle.topics.reduce((n, t) => n + t.facts.length, 0),
  models: bundle.models.length, byLevel: Object.fromEntries(levels.slice(1).map(l => [l, bundle.models.filter(m => m.level === l).length])),
  byTopic: bundle.topics.map(t => ({ id: t.id, title: t.title, models: Object.fromEntries(levels.slice(1).map(l => [l, bundle.models.filter(m => m.topicId === t.id && m.level === l).length])) }))
}, results };
const outDir = path.join(__dirname, '..', 'tests', 'results');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'repetition-audit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ library: report.library, sampleRuns: results.length, file: 'tests/results/repetition-audit.json' }, null, 2));
