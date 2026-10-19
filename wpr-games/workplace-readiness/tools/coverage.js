'use strict';
/* Coverage matrix: skills x modes x difficulty, families, and standards concepts. */
const { loadLibrary } = require('./load-library.js');
const lib = loadLibrary();
const modes = ['decision', 'nextstep', 'order', 'find'];
const out = { rows: [], uncoveredConcepts: [], totals: {} };
lib.skills.forEach(s => {
  const ts = lib.templatesBySkill[s.id];
  const fams = new Set(ts.map(t => t.family));
  const concepts = new Set(); ts.forEach(t => t.concepts.forEach(c => concepts.add(c)));
  const row = { code: s.code, skill: s.id, templates: ts.length, families: fams.size,
    modes: Object.fromEntries(modes.map(m => [m, ts.filter(t => t.mode === m).length])),
    diff: { beginner: ts.filter(t => t.difficulty === 'beginner').length, intermediate: ts.filter(t => t.difficulty === 'intermediate').length, advanced: ts.filter(t => t.difficulty === 'advanced').length },
    concepts: concepts.size + '/' + s.concepts.length };
  out.rows.push(row);
  s.concepts.forEach(c => { if (!concepts.has(c.id)) out.uncoveredConcepts.push(c.id); });
});
if (process.argv[2] === '--json') { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
console.log('code  templ fam  D  N  O  F | beg int adv | concepts  skill');
out.rows.forEach(r => console.log(
  r.code.padEnd(5), String(r.templates).padStart(3), String(r.families).padStart(4), '',
  ...modes.map(m => String(r.modes[m]).padStart(2)), '|', String(r.diff.beginner).padStart(3), String(r.diff.intermediate).padStart(3), String(r.diff.advanced).padStart(3), '|',
  r.concepts.padStart(6), ' ', r.skill));
console.log('\nTotal templates:', lib.templates.length, '| families:', lib.families.length, '| distinct patterns:', new Set(lib.templates.map(t => t.family + ':' + t.pattern)).size);
console.log('Mode totals:', modes.map(m => m + '=' + lib.templates.filter(t => t.mode === m).length).join(' '));
console.log('Difficulty totals:', ['beginner', 'intermediate', 'advanced'].map(d => d + '=' + lib.templates.filter(t => t.difficulty === d).length).join(' '));
console.log('Uncovered concepts (' + out.uncoveredConcepts.length + '):', out.uncoveredConcepts.join(', ') || 'none');
