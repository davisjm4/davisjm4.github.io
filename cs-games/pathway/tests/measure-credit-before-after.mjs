// Before / after credit measurement (synthetic questions, real client-to-normalizer flow, no network).
//   node cs-games/pathway/tests/measure-credit-before-after.mjs [--out <dir>] [--before <rev>] [--base <rev>]
// "After" is this checkout. "Before" re-creates the Phase 1 situation inside this process:
//   * the service-side curriculum graph is swapped for the graph committed at <rev> (default fc70e68, the Phase 1 head), and
//   * the five pages Phase 2 changed are driven the way Phase 1 drove them (no evidence annotation; Boolean without difficulty;
//     Math Lab Mixed drawing only the five original modes, expansion questions annotated as before).
// The evidence pipeline itself (session tracker, profile client, server normalizer, node matcher) is byte-identical between the two
// commits (git diff over wpr-games, cs-games/pathway/evidence.mjs and java-games/session.js is empty), so nothing else needs swapping.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import serviceGraph from '../curriculum-graph.json' with { type: 'json' };
import { makeAdapters, reseed, root, E, graph } from './lib/lab-flow.mjs';
import { measureMode, measureMixed, N_MIXED } from './lib/gap-registry.mjs';

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const OUT = new URL((arg('--out', 'cs-games/pathway/reports/phase2/') + '/').replace(/\/+$/, '/'), root);
const BEFORE_REV = arg('--before', 'fc70e68'), BASE_REV = arg('--base', '422398d');
const gitGraph = (rev) => { try { return JSON.parse(execFileSync('git', ['-C', root.pathname, 'show', `${rev}:cs-games/pathway/curriculum-graph.json`], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })); } catch { return null; } };
const beforeGraph = gitGraph(BEFORE_REV), baseGraph = gitGraph(BASE_REV);
if (!beforeGraph) { console.error(`git history for ${BEFORE_REV} is not available; cannot measure "before"`); process.exit(2); }
const afterGraphCopy = structuredClone(serviceGraph);
const swapTo = (g) => { for (const k of Object.keys(serviceGraph)) delete serviceGraph[k]; Object.assign(serviceGraph, structuredClone(g)); };

const LEGACY_DETAILS_NULL = new Set(['boolean-conditional-lab', 'linkedlist-lab', 'inheritance-polymorphism-lab', 'documentation-lab', 'robot-algorithms']);
function legacyAdapters() {
  const A = makeAdapters();
  for (const lab of LEGACY_DETAILS_NULL) A[lab].details = () => null;
  const m = A['math-lab'], oldDeck = E.M.createDeck(Math.random), isX = (mode) => Object.hasOwn(E.X.EXPANSION_MODES, mode);
  m.details = (q) => (isX(q.mode) ? { difficulty: q.difficulty, reasoningFamily: q.family, skill: q.skill, seed: q.seed } : null);
  m.mixed = () => oldDeck.next('mixed');
  return A;
}

function run(label, adapters, g) {
  swapTo(g); reseed(20261112);
  const rows = {};
  for (const [lab, a] of Object.entries(adapters)) {
    const mixed = measureMixed(a);
    rows[lab] = { mixed: mixed ? { drawn: mixed.drawn, credited: mixed.credited, counts: mixed.counts } : null, modes: {} };
    for (const mode of a.modes) {
      const m = measureMode(a, mode);
      const sum = (k) => m.cells.reduce((s, [, c]) => s + c[k], 0);
      rows[lab].modes[mode] = { drawn: sum('drawn'), credited: sum('credited'), difficultyRecorded: sum('difficultyOk'), familySent: sum('familySent'), familyBound: sum('familyBound'), hasLevels: m.hasLevels };
    }
  }
  return { label, rows, nodes: g.nodes.length, families: g.questionFamilies.length };
}

const before = run('before (Phase 1 graph, Phase 1 page behaviour)', legacyAdapters(), beforeGraph);
const after = run('after (Phase 2)', makeAdapters(), afterGraphCopy);
swapTo(afterGraphCopy);

const ELEVEN = [['method-constructor-lab', 'order-args'], ['linkedlist-lab', 'link'], ['linkedlist-lab', 'mutate'], ['inheritance-polymorphism-lab', 'hierarchy'], ['inheritance-polymorphism-lab', 'override'], ['inheritance-polymorphism-lab', 'tracer'], ['inheritance-polymorphism-lab', 'debug'], ['documentation-lab', 'editor'], ['documentation-lab', 'builder'], ['robot-algorithms', 'build'], ['robot-algorithms', 'debug']];
const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : 'n/a');
const frac = (r) => `${r.credited}/${r.drawn}`;
const md = [];
md.push(`Seed 20261112; focused draws per mode: 12 (24 when the lab has difficulty levels), Mixed draws per lab: ${N_MIXED}. Graphs: base ${BASE_REV} ${baseGraph ? `${baseGraph.nodes.length} nodes / ${baseGraph.questionFamilies.length} families` : 'unavailable'}; Phase 1 ${BEFORE_REV} ${before.nodes} / ${before.families}; Phase 2 ${after.nodes} / ${after.families}.\n`);
md.push('### A. The eleven previously unmapped modes (correct first-try answers, real flow)\n');
md.push('| Game | Mode | Before: questions that credit the intended node | After: questions that credit the intended node |', '|---|---|---|---|');
for (const [lab, mode] of ELEVEN) md.push(`| ${lab} | ${mode} | ${frac(before.rows[lab].modes[mode])} | ${frac(after.rows[lab].modes[mode])} |`);
md.push('\n### B. Math Lab Mixed Practice (share of Mixed questions per mode)\n');
md.push('| Mode | Before | After |', '|---|---|---|');
for (const mode of after.rows['math-lab'].mixed ? Object.keys(after.rows['math-lab'].mixed.counts) : []) md.push(`| ${mode} | ${pct(before.rows['math-lab'].mixed.counts[mode] || 0, N_MIXED)} | ${pct(after.rows['math-lab'].mixed.counts[mode] || 0, N_MIXED)} |`);
md.push('\n### C. Mixed Practice: questions that credit exactly the question\'s own node\n');
md.push('| Game | Before | After |', '|---|---|---|');
for (const lab of Object.keys(after.rows).filter((l) => after.rows[l].mixed)) md.push(`| ${lab} | ${pct(before.rows[lab].mixed.credited, N_MIXED)} (${before.rows[lab].mixed.credited}/${N_MIXED}) | ${pct(after.rows[lab].mixed.credited, N_MIXED)} (${after.rows[lab].mixed.credited}/${N_MIXED}) |`);
md.push('\nA Mixed question can only credit its intended node when its mode has one; in "before" the modes of section A had none, so the share below 100% is exactly those modes.\n');
md.push('### D. Boolean & Conditional: difficulty recorded equals the difficulty presented\n');
const bd = (r) => { const t = Object.values(r.rows['boolean-conditional-lab'].modes); return `${t.reduce((s, m) => s + m.difficultyRecorded, 0)}/${t.reduce((s, m) => s + m.drawn, 0)}`; };
md.push(`Before: ${bd(before)}. After: ${bd(after)}.\n`);
md.push('### E. Family ids bound to the credited node (narrowing active), questions answered correctly in focused practice\n');
md.push('| Game | Before | After |', '|---|---|---|');
for (const lab of ['linkedlist-lab', 'inheritance-polymorphism-lab', 'documentation-lab', 'robot-algorithms', 'boolean-conditional-lab']) {
  const t = (r) => { const ms = Object.values(r.rows[lab].modes); return `${ms.reduce((s, m) => s + m.familyBound, 0)}/${ms.reduce((s, m) => s + m.drawn, 0)}`; };
  md.push(`| ${lab} | ${t(before)} | ${t(after)} |`);
}
md.push('\n### F. Focused-practice credit in every measured lab (questions credited to the intended node)\n');
md.push('| Game | Before | After |', '|---|---|---|');
for (const lab of Object.keys(after.rows)) {
  const t = (r) => { const ms = Object.values(r.rows[lab].modes); return `${ms.reduce((s, m) => s + m.credited, 0)}/${ms.reduce((s, m) => s + m.drawn, 0)}`; };
  md.push(`| ${lab} | ${t(before)} | ${t(after)} |`);
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(new URL('before-after-credit.json', OUT), JSON.stringify({ seed: 20261112, beforeRev: BEFORE_REV, baseRev: BASE_REV, graphs: { base: baseGraph && { nodes: baseGraph.nodes.length, questionFamilies: baseGraph.questionFamilies.length, version: baseGraph.version }, before: { nodes: before.nodes, questionFamilies: before.families }, after: { nodes: after.nodes, questionFamilies: after.families, version: graph.version } }, before: before.rows, after: after.rows }, null, 2) + '\n');
fs.writeFileSync(new URL('before-after-credit-tables.md', OUT), md.join('\n') + '\n');
console.log(md.join('\n'));
