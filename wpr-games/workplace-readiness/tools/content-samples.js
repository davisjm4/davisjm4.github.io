#!/usr/bin/env node
'use strict';
/* Writes reports/EXPANSION_SAMPLES.md: one decision, one next step, one ordering and one find-the-problem
 * example per expansion kit, rendered through the real engine with fixed seeds. */
const fs = require('fs'), path = require('path');
const { loadLibrary } = require('./load-library.js');
const { loadCompose } = require('./compose-load.js');
const SEL = require('../js/compose/selector.js');
const lib = loadLibrary(), cx = loadCompose(), h = SEL.createHybrid(lib, cx);
const dir = path.join(__dirname, '..', 'content', 'compose', 'kits');
const kits = [].concat(...fs.readdirSync(dir).filter(f => /-x[0-9]\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(dir, f))).kits));
let md = '# Expansion samples\n\nRendered with the real engine, fixed seeds. `*` marks the keyed answer. Generated text is machine-checked, not educator-reviewed.\n';
for (const k of kits) {
  md += `\n## ${k.id}: ${k.familyName}\nPrimary objective: \`${k.concepts[0]}\`. Settings: ${k.contexts === 'any' ? 'any' : k.contexts.join(', ')}.\n`;
  const { challenges } = SEL.generateMany(h, 3000, { seed: 'sample-' + k.skill, filters: { skills: [k.skill] } });
  const want = ['decision', 'nextstep', 'order', 'find'];
  for (const mode of want) {
    const c = challenges.find(x => { const u = h.unitsById[x.templateId]; return u && u.kitId === k.id && x.mode === mode && (mode !== 'decision' || x.difficulty === 'intermediate'); });
    if (!c) continue;
    md += `\n**${mode} / ${c.difficulty} / ${c.context}**\n\n> ${(c.scenario || (c.doc && c.doc.intro) || '').replace(/\n/g, ' ')}\n>\n> *${c.prompt}*\n`;
    (c.options || []).forEach(o => { md += `> - ${o.id === c.key.bestId ? '**' : ''}${o.text}${o.id === c.key.bestId ? '** *' : ''}\n`; });
    (c.steps || []).forEach(s => { md += `> - (step) ${s.text}\n`; });
    ((c.doc && c.doc.segments) || []).forEach(s => { md += `> - ${s.problem ? '**' : ''}${s.text}${s.problem ? '** *' : ''}\n`; });
  }
}
fs.writeFileSync(path.join(__dirname, '..', 'reports', 'EXPANSION_SAMPLES.md'), md);
console.log('samples for', kits.length, 'kits');
