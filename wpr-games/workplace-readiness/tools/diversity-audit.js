'use strict';
/* Reasoning-diversity audit on a representative sample (separate seeds from the test suite).
 * Usage: node tools/diversity-audit.js [challengesPerSeed=400] [seeds=6] [--json] */
const { loadLibrary } = require('./load-library.js');
const G = require('../js/core/generator.js');
const V = require('../js/core/validator.js');
const lib = loadLibrary();
const per = parseInt(process.argv[2] || '400', 10), nSeeds = parseInt(process.argv[3] || '6', 10);
const all = [], sessions = [];
for (let s = 0; s < nSeeds; s++) { const r = G.generateMany(lib, per, { seed: 'diversity-audit-' + s }); r.challenges.forEach(c => all.push({ c, s })); sessions.push(r.session); }
const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const N = all.length;
const out = { sample: N, seeds: nSeeds, perSeed: per };
out.library = { templates: lib.templates.length, families: lib.families.length, reasoningPatterns: new Set(lib.templates.map(t => t.family + ':' + t.pattern)).size, skills: lib.skills.length, contexts: lib.contexts.length, bundles: lib.contexts.reduce((n, c) => n + c.bundles.length, 0) };
out.sampleCoverage = { families: new Set(all.map(x => x.c.family)).size, patterns: new Set(all.map(x => x.c.reasoning)).size, templates: new Set(all.map(x => x.c.templateId)).size, skills: new Set(all.map(x => x.c.skill)).size, concepts: new Set([].concat(...all.map(x => x.c.concepts))).size, totalConcepts: Object.keys(lib.conceptIds).length };
out.byMode = count(all, x => x.c.mode); out.byDifficulty = count(all, x => x.c.difficulty); out.byContext = count(all, x => x.c.context); out.byCategory = count(all, x => x.c.category);
out.bySkill = count(all, x => x.c.skill);
const skillCounts = Object.values(out.bySkill); out.skillBalance = { min: Math.min(...skillCounts), max: Math.max(...skillCounts), expected: Math.round(N / 22) };
// repetition by semantic (reasoning) signature within each session
let gaps = [], minGap = Infinity, repeatWithin5 = 0, repeatWithin12 = 0, total = 0;
sessions.forEach((_, si) => {
  const last = {}; all.filter(x => x.s === si).forEach((x, i) => {
    total++; const k = x.c.reasoning;
    if (last[k] !== undefined) { const g = i - last[k]; gaps.push(g); minGap = Math.min(minGap, g); if (g <= 5) repeatWithin5++; if (g <= 12) repeatWithin12++; }
    last[k] = i;
  });
});
gaps.sort((a, b) => a - b);
out.repetition = { minGap, medianGap: gaps[Math.floor(gaps.length / 2)], p10Gap: gaps[Math.floor(gaps.length * 0.1)], repeatsWithin5: repeatWithin5, repeatsWithin12: repeatWithin12, repeatsWithin12Pct: +(100 * repeatWithin12 / total).toFixed(2), challengesPerPatternExpected: +(per / out.library.reasoningPatterns).toFixed(2) };
// does surface variation mask repeated problems? compare distinct surface renderings vs distinct reasoning patterns
const surfaces = new Set(all.map(x => x.c.reasoning + '|' + x.c.context + '/' + x.c.bundle + '|' + x.c.twist + '|' + x.c.scenario));
out.surface = { distinctRenderedScenarios: new Set(all.map(x => x.c.scenario + '|' + x.c.prompt)).size, distinctReasoning: out.sampleCoverage.patterns, distinctSurfaceSignatures: surfaces.size,
  note: 'Distinct rendered text is NOT counted as distinct reasoning: only reasoning patterns count as different problems.' };
const perPattern = Object.values(count(all, x => x.c.reasoning)); out.patternShare = { min: Math.min(...perPattern), max: Math.max(...perPattern), expected: +(N / out.library.reasoningPatterns).toFixed(1) };
// answer-position and length bias in the sample
const ch = all.filter(x => x.c.options); const T = require('../js/core/text.js');
out.positions = count(ch, x => 'abcd'[x.c.bestIndex]);
out.bestUniquelyLongestPct = +(100 * ch.filter(x => { const l = x.c.options.map(o => T.wordCount(o.text)); const b = l[x.c.options.findIndex(o => o.id === x.c.key.bestId)]; return b === Math.max(...l) && l.filter(v => v === b).length === 1; }).length / ch.length).toFixed(1);
out.rejected = sessions.reduce((n, s) => n + s.stats.rejected, 0);
out.invalid = all.filter(x => !V.validateChallenge(x.c, lib).ok).length;
out.templatesPerDifficulty = count(lib.templates, t => t.difficulty); out.templatesPerMode = count(lib.templates, t => t.mode);
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 2)); } else { console.log(JSON.stringify(out, null, 2)); }
