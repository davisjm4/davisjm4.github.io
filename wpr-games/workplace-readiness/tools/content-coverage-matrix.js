#!/usr/bin/env node
'use strict';
/* Content-only coverage matrix: 22 areas x 94 objectives.
 * A reasoning key identifies one distinct decision, not wording: for state units it is the decisive
 * principle ("first:"), for the other engines the unit signature, for authored templates family:pattern.
 * "Tagged" counts every concept a kit lists; "primary" counts only the first listed concept, because a
 * kit that lists three concepts does not test all three equally. Gaps are ranked on primary keys.
 * Writes reports/CONTENT_COVERAGE_MATRIX.{json,csv}. Use --check to fail on a stale file. */
const fs = require('fs');
const path = require('path');
const { loadLibrary } = require('./load-library.js');
const { loadCompose } = require('./compose-load.js');
const SEL = require('../js/compose/selector.js');

const lib = loadLibrary(), cx = loadCompose();
const h = SEL.createHybrid(lib, cx);
// Concepts whose title names a performed behaviour: scenario questions show knowledge of the expectation, not the behaviour.
const PERFORMANCE = new Set(['listening-and-speaking:presenting', 'listening-and-speaking:nonverbal-cues', 'professionalism:self-representation',
  'professionalism:appearance', 'professionalism:punctuality-attendance', 'work-ethic:diligence', 'work-ethic:dependability',
  'initiative-and-self-direction:minimal-supervision']);
// An ordering kit is one reasoning problem however many step subsets it renders, so it counts once per kit.
// A state unit with no active issue ("clear:" or empty first) tests no decision, so it contributes no key.
const key = u => u.engine === 'state' ? ((u.signature.match(/first:([^|]+)/) || [])[1] ? 'S:' + u.signature.match(/first:([^|]+)/)[1] : null) : u.engine === 'process' ? 'P:' + u.kitId : 'X:' + u.signature;
const rows = new Map();
const row = (skill, concept, label) => { if (!rows.has(concept)) rows.set(concept, { skill, concept, label, tagged: new Set(), primary: new Set(), modes: new Set(), levels: new Set(), kits: new Set(), templates: new Set(), primaryTemplates: new Set(), units: 0 }); return rows.get(concept); };
for (const s of lib.skills) for (const c of s.concepts) row(s.id, c.id, c.label);
for (const u of h.catalog.units) {
  const kit = h.catalog.kitsById[u.kitId];
  u.concepts.forEach((c, i) => {
    const r = rows.get(c); if (!r) return;
    if (key(u)) r.tagged.add(key(u)); r.modes.add(u.mode); r.levels.add(u.difficulty); r.kits.add(u.kitId); r.units++;
    if (c === kit.concepts[0] && key(u)) r.primary.add(key(u));
  });
}
for (const t of lib.templates) (t.concepts || []).forEach((c, i) => {
  const r = rows.get(c); if (!r) return;
  const k = 'T:' + t.family + ':' + t.pattern;
  r.templates.add(k); r.modes.add(t.mode); r.levels.add(t.difficulty); if (i === 0) r.primaryTemplates.add(k);
});
const out = [...rows.values()].map(r => {
  const primaryKeys = r.primary.size + r.primaryTemplates.size, taggedKeys = r.tagged.size + r.templates.size;
  return { skill: r.skill, concept: r.concept, label: r.label, primaryReasoningKeys: primaryKeys, taggedReasoningKeys: taggedKeys,
    composedPrimary: r.primary.size, authoredPrimary: r.primaryTemplates.size, kits: r.kits.size,
    modes: [...r.modes].sort().join('+'), levels: [...r.levels].sort().join('+'),
    performanceTitle: PERFORMANCE.has(r.concept),
    flags: [primaryKeys < 4 ? 'thin-primary-reasoning' : '', r.modes.size < 3 ? 'few-formats' : '', r.levels.size < 3 ? 'missing-difficulty-levels' : '',
      PERFORMANCE.has(r.concept) ? 'knowledge-not-performance' : ''].filter(Boolean) };
});
const areas = lib.skills.map(s => { const cs = out.filter(r => r.skill === s.id);
  return { area: s.id, name: s.name, objectives: cs.length, primaryKeys: cs.reduce((a, r) => a + r.primaryReasoningKeys, 0),
    minObjectiveKeys: Math.min(...cs.map(r => r.primaryReasoningKeys)), thinObjectives: cs.filter(r => r.flags.includes('thin-primary-reasoning')).map(r => r.concept) }; });
const gaps = out.slice().sort((a, b) => a.primaryReasoningKeys - b.primaryReasoningKeys || a.taggedReasoningKeys - b.taggedReasoningKeys)
  .map((r, i) => ({ rank: i + 1, concept: r.concept, primaryReasoningKeys: r.primaryReasoningKeys, taggedReasoningKeys: r.taggedReasoningKeys, flags: r.flags }));
const result = { areas: areas.length, objectives: out.length, matrix: out, areaRollup: areas, gaps };
const dir = path.join(__dirname, '..', 'reports');
const json = JSON.stringify(result, null, 1) + '\n';
const csv = ['area,objective,primary_reasoning_keys,tagged_reasoning_keys,composed_primary,authored_primary,kits,formats,levels,flags']
  .concat(out.map(r => [r.skill, r.concept, r.primaryReasoningKeys, r.taggedReasoningKeys, r.composedPrimary, r.authoredPrimary, r.kits, r.modes, r.levels, r.flags.join(' ')].join(','))).join('\n') + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(path.join(dir, 'CONTENT_COVERAGE_MATRIX.json'), 'utf8') !== json) throw new Error('Stale coverage matrix');
} else { fs.writeFileSync(path.join(dir, 'CONTENT_COVERAGE_MATRIX.json'), json); fs.writeFileSync(path.join(dir, 'CONTENT_COVERAGE_MATRIX.csv'), csv); }
console.log(result.areas + ' areas, ' + result.objectives + ' objectives; thin (<4 primary keys): ' + out.filter(r => r.flags.includes('thin-primary-reasoning')).length);
gaps.slice(0, 22).forEach(g => console.log(String(g.primaryReasoningKeys).padStart(3), String(g.taggedReasoningKeys).padStart(3), g.concept, g.flags.join(' ')));
