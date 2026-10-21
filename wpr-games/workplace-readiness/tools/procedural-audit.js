#!/usr/bin/env node
'use strict';
/* Seeded procedural-diversity audit. Surface variants are reported separately from
 * underlying family:pattern reasoning signatures. Usage: node tools/procedural-audit.js [--baseline|--after] */
const fs = require('fs');
const path = require('path');
const { loadLibrary } = require('./load-library.js');
const G = require('../js/core/generator.js');
const T = require('../js/core/text.js');
const S = require('../js/data/schema.js');
const lib = loadLibrary();
const seeds = ['workplace-audit-a', 'workplace-audit-b', 'workplace-audit-c'];
const lengths = [14, 20, 50, 100, 500];
const modes = Object.keys(S.MODES);
const levels = ['beginner', 'intermediate', 'advanced'];
const norm = s => T.normalize(String(s || '').replace(/\d+/g, '#'));
function surface(c) {
  let s = c.scenario || '';
  (c.maskValues || []).forEach(v => { if (v) s = s.split(String(v).toLowerCase()).join(' # '); });
  return norm(s);
}
function answers(c) {
  const correct = c.options && c.key && c.options.find(o => o.id === c.key.bestId);
  return {
    options: (c.options || []).map(o => norm(o.text)).sort(),
    correct: correct ? norm(correct.text) : c.mode === 'find' ? c.key.problemId : c.mode === 'order' ? JSON.stringify(c.key.example) : '',
    doc: c.doc ? c.doc.segments.map(x => norm(x.text)).sort() : [],
    steps: c.steps ? c.steps.map(x => norm(x.text)).sort() : []
  };
}
function exact(c) { return JSON.stringify([c.mode, norm(c.prompt), surface(c), answers(c)]); }
function summarize(rows) {
  const keys = f => new Set(rows.map(f)).size;
  return {
    exactRepeats: rows.length - keys(exact),
    scenarioRepeats: rows.length - keys(c => surface(c)),
    reasoningRepeats: rows.length - keys(c => c.reasoning),
    familyRepeats: rows.length - keys(c => c.family),
    structuralPatterns: keys(c => [c.mode, c.reasoning, c.difficulty].join('|')),
    answerPositions: rows.reduce((m, c) => { const i = c.bestIndex === undefined ? c.problemIndex : c.bestIndex; if (i !== undefined && i !== null) m[i] = (m[i] || 0) + 1; return m; }, {})
  };
}
function sessionSample(filters) {
  const seedData = seeds.map(seed => {
    const s = G.createSession(lib, { seed, filters });
    const all = Array.from({ length: 500 }, () => s.next());
    return all;
  });
  return lengths.map(n => {
    const stats = seedData.map(cs => summarize(cs.slice(0, n)));
    const avg = k => +(stats.reduce((a, x) => a + x[k], 0) / stats.length).toFixed(2);
    const minimum = k => Math.min(...stats.map(x => x[k]));
    const maximum = k => Math.max(...stats.map(x => x[k]));
    return { n, exactRepeats: avg('exactRepeats'), scenarioRepeats: avg('scenarioRepeats'), reasoningRepeats: avg('reasoningRepeats'), familyRepeats: avg('familyRepeats'), structuralPatterns: avg('structuralPatterns'), exactRepeatRange: [minimum('exactRepeats'), maximum('exactRepeats')], reasoningRepeatRange: [minimum('reasoningRepeats'), maximum('reasoningRepeats')] };
  });
}

const bySkill = lib.skills.map(skill => ({
  skill: skill.id, name: skill.name, code: skill.code,
  levels: Object.fromEntries(levels.map(level => {
    const ts = lib.templates.filter(t => t.skill === skill.id && t.difficulty === level);
    return [level, { patterns: new Set(ts.map(t => t.family + ':' + t.pattern)).size, templates: ts.length,
      modes: Object.fromEntries(modes.map(mode => [mode, ts.filter(t => t.mode === mode).length])),
      contexts: lib.contexts.map(ctx => ({ id: ctx.id, patterns: new Set(ts.filter(t => G.eligibleTemplates(lib, {skills:[skill.id], difficulty:level, context:ctx.id}).some(x=>x.id===t.id)).map(t=>t.family+':'+t.pattern)).size })).filter(x=>x.patterns) }];
  }))
}));

const configurations = [];
function add(label, filters) { configurations.push({ label, filters }); }
add('all-skills/mixed/mixed-difficulty/any-setting', {});
for (const level of levels) add('all-skills/mixed/' + level + '/any-setting', { difficulty: level });
for (const mode of modes) for (const level of levels) add('all-skills/' + mode + '/' + level + '/any-setting', { modes: [mode], difficulty: level });
for (const ctx of lib.contexts) for (const mode of modes) for (const level of levels) add('all-skills/' + mode + '/' + level + '/' + ctx.id, { modes: [mode], difficulty: level, context: ctx.id });
for (const skill of lib.skills) for (const level of levels) {
  add(skill.id + '/mixed/' + level + '/any-setting', { skills: [skill.id], difficulty: level });
  for (const mode of modes) add(skill.id + '/' + mode + '/' + level + '/any-setting', { skills: [skill.id], modes: [mode], difficulty: level });
}

const rows = configurations.map((c, i) => {
  const eligible = G.eligibleTemplates(lib, c.filters);
  const patterns = new Set(eligible.map(t => t.family + ':' + t.pattern));
  const samples = eligible.length ? sessionSample(c.filters) : [];
  if (i % 25 === 0) process.stderr.write('Audited ' + (i + 1) + '/' + configurations.length + '\n');
  return { selection: c.label, templates: eligible.length, patterns: patterns.size, families: new Set(eligible.map(t => t.family)).size, sessions: samples };
});
const out = {
  generatedAt: new Date().toISOString(), library: { templates: lib.templates.length, families: lib.families.length,
    patterns: new Set(lib.templates.map(t => t.family + ':' + t.pattern)).size, skills: lib.skills.length,
    contexts: lib.contexts.length, bundles: lib.contexts.reduce((n, c) => n + c.bundles.length, 0) },
  bySkill, rows, generatedChallenges: rows.reduce((n, r) => n + (r.patterns ? seeds.length * 500 : 0), 0),
  definitions: { exact: 'same mode, normalized scenario and prompt, choices, correct answer, and task content', scenario: 'same normalized scenario after masking generated slot values and digits', reasoning: 'same authored family:pattern; setting/name changes are not new reasoning', structure: 'mode + family:pattern + difficulty' }
};
const suffix = process.argv.includes('--after') ? 'after' : 'baseline';
const outPath = path.join(__dirname, '..', 'tests', 'results', 'procedural-' + suffix + '.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('Wrote ' + path.relative(process.cwd(), outPath) + ': ' + out.rows.length + ' filters; ' + out.generatedChallenges + ' generated challenges.');
