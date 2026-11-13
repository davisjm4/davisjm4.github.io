// Mutation controls for Build 6: each entry breaks one rule in the real source; csp-proficiency-a.test.mjs must then fail. Files are restored,
// including when this process is interrupted.   node cs-games/pathway/tests/csp-proficiency-a-controls.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const repo = new URL('../../../', import.meta.url).pathname;
const M = [
  ['csp-games/proficiency-metadata.js', 'any density counts as Level 3 evidence', 'export const SPARSE_MAX_DENSITY = 0.25;', 'export const SPARSE_MAX_DENSITY = 1;'],
  ['csp-games/proficiency-metadata.js', 'a question one input can satisfy is still Level 3 evidence', "const needsBothInputs = ['x', 'y'].every(", "const needsBothInputs = true || ['x', 'y'].every("],
  ['csp-games/proficiency-metadata.js', 'counter increments count as Level 3 again', "if (component === 'update' && text === 'result ← (result + 1)') return 'update-count';", ''],
  ['csp-games/proficiency-metadata.js', 'direct procedure calls count as Level 3 again', "return 'procedure-call-direct';", "return 'procedure-call';"],
  ['csp-games/proficiency-metadata.js', 'a retry or arrange question is relabelled', "if (q.format === 'arrange') return 'arrange';", "if (q.format === 'arrange') return 'update';"],
  ['cs-games/pathway/proficiency/coverage-phase2.mjs', 'Iteration recommends the mode that cannot reach Level 3', "ITERATION:['iteration','accumulator','nested','counter'],", "ITERATION:['nested','iteration','counter','accumulator'],"],
  ['cs-games/pathway/proficiency/coverage-phase2.mjs', 'Procedures asks for three models it does not have', "key==='PROCEDURES'?2:3", "3"],
  ['cs-games/pathway/proficiency/coverage-phase2.mjs', 'Level 3 admits Boolean questions without the both-inputs family', "/^both-inputs:(?:and|or|not)$/.test(event.familyId)", "true"],
];
const run = () => spawnSync('node', ['--test', repo + 'cs-games/pathway/tests/csp-proficiency-a.test.mjs'], { encoding: 'utf8', cwd: repo });
const base = run(); if (base.status !== 0) { console.log('Baseline is not green; aborting.'); process.exit(2); }
let active = null, caught = 0; const missed = [];
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { if (active) fs.writeFileSync(active.p, active.original); process.exit(130); });
for (const [file, name, from, to] of M) {
  const p = repo + file, original = fs.readFileSync(p, 'utf8');
  if (!original.includes(from)) { console.log('SKIP (pattern not found)', name); missed.push('pattern missing: ' + name); continue; }
  active = { p, original };
  try { fs.writeFileSync(p, original.replace(from, to)); const r = run(); if (r.status !== 0) { caught++; console.log('CAUGHT ', name); } else { missed.push(name); console.log('MISSED ', name); } }
  finally { fs.writeFileSync(p, original); active = null; }
}
console.log(`\nBUILD 6 NEGATIVE CONTROLS: ${caught} of ${M.length} caught`);
if (missed.length) { console.log('Not caught:\n' + missed.join('\n')); process.exit(1); }
