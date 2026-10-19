// Bulk validation: generates N challenges across difficulty x type x format x reasoning family and checks
// every invariant on every challenge. Usage: node tests/bulk.test.mjs [N=20000]
import fs from 'node:fs';
import { generateTraceChallenge, RecentHistory, verifyChallengeModel, FAMILY_IDS, MISCONCEPTIONS, DIFFICULTIES, TYPES, FORMATS } from '../src/index.js';
import { typeCheck, execute } from '../src/interp.js';
import { analyze, validateDifficulty, sliceFor } from '../src/analysis.js';
import { collectCandidates } from '../src/distractors.js';
import { CORE_POOLS } from '../src/builders.js';
import { mixSeed } from '../src/rng.js';

const N = Number(process.argv[2] || 20000);
const started = Date.now();
const fail = [];
const bad = (c, msg) => { if (fail.length < 40) fail.push(`${c ? c.id : '?'}: ${msg}\n${c ? c.code : ''}`); fail.count = (fail.count || 0) + 1; };

const cov = { diffType: {}, diffFormat: {}, typeFormat: {}, families: {}, famByDiff: {}, misconceptions: {}, relaxed: 0, checks: 0 };
const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
const cells = [];
for (const d of DIFFICULTIES) for (const t of TYPES) for (const f of FORMATS) cells.push({ d, t, f });
const histories = {};
const pair = (id, t) => `${id}|${t}`;

for (let i = 0; i < N; i++) {
  const cell = cells[i % cells.length];
  const round = Math.floor(i / cells.length);
  const hkey = cell.d;
  const hist = (histories[hkey] ||= new RecentHistory());
  // every other round, force one reasoning family that exists for this type (rotating) so all families are exercised
  const pool = [...CORE_POOLS[cell.t], ...(cell.f === 'final' && cell.t !== 'char' ? ['PRINT_VS_STORED'] : [])];
  const family = round % 2 === 1 ? pool[Math.floor(round / 2) % pool.length] : undefined;
  const opts = { difficulty: cell.d, type: cell.t, format: cell.f, seed: mixSeed(i + 1, 0xb01c), history: hist, family };
  let c, usedOpts = opts;
  try { c = generateTraceChallenge(opts); }
  catch (e) {
    if (family) { try { usedOpts = { ...opts, family: undefined }; c = generateTraceChallenge(usedOpts); } catch (e2) { bad(null, `generation failed ${JSON.stringify(cell)} ${e2.message}`); continue; } }
    else { bad(null, `generation failed ${JSON.stringify(cell)} ${e.message}`); continue; }
  }
  hist.record(c);
  const chk = (cond, msg) => { cov.checks++; if (!cond) bad(c, msg); };

  // coverage
  inc(cov.diffType, `${c.difficulty}/${c.type}`); inc(cov.diffFormat, `${c.difficulty}/${c.format}`); inc(cov.typeFormat, `${c.type}/${c.format}`);
  for (const f of c.reasoningFamilies) { inc(cov.families, f); inc(cov.famByDiff, `${c.difficulty}/${f}`); }
  for (const d of c.distractors) inc(cov.misconceptions, d.misconceptionId);
  if (c.repetition.relaxed) cov.relaxed++;

  const { program, target } = c.model;
  // 1. valid Java (static)
  try { typeCheck(program); cov.checks++; } catch (e) { bad(c, 'typeCheck: ' + e.message); }
  chk(c.codeLines.length === program.length && c.codeLines.every((l) => /;$/.test(l)), 'code lines');
  chk(!/\b(for|while|if|else|switch|new|int\[\]|Scanner|static|class)\b/.test(c.code), 'forbidden construct in code');
  // 2. correct answer by independent re-execution
  const v = verifyChallengeModel(c);
  chk(v.ok, `answer mismatch ${v.text} vs ${c.correct.text}`);
  const exec = v.exec;
  // 3. checkpoint integrity
  if (c.format === 'checkpoint') {
    const n = c.question.line;
    chk(n === target.index + 1 && c.codeLines[n - 1] === c.question.lineCode, 'checkpoint line mapping');
    chk(c.stateHistory.rows[n - 1].raw[target.varName] === c.correct.text, 'checkpoint value');
    chk(!c.code.includes('//'), 'no comments revealing values');
  }
  // 4. explanation derived from execution
  chk(c.explanation.lines.length === program.length, 'explanation line count');
  c.explanation.lines.forEach((l, k) => {
    const st = exec.steps[k];
    chk(l.line === k + 1 && l.code === c.codeLines[k], 'explanation line/code');
    for (const ch of l.changes) {
      const nm = ch.name;
      const expected = c.stateHistory.rows[k].values[nm];
      chk(ch.after === expected, `change value mismatch line ${k + 1} ${nm}`);
      chk(l.text.includes(ch.after) || program[k].k === 'print', `explanation text lacks new value ${ch.after} (line ${k + 1}): ${l.text}`);
    }
    if (program[k].k === 'print') chk(l.text.includes('`' + st.output + '`'), 'print text');
  });
  chk(c.explanation.summary.includes('`' + c.correct.text + '`'), 'summary includes the answer');
  // 5. difficulty (recomputed from scratch)
  const metrics = analyze(program, target);
  const dv = validateDifficulty(metrics, c.difficulty, { format: c.format, type: c.type });
  chk(dv.ok, 'difficulty rules: ' + dv.failures.join('; '));
  if (c.difficulty === 'advanced') {
    chk(metrics.relevantChanges >= 3, 'advanced: relevant changes');
    chk(metrics.coreFamilies.length >= 2, 'advanced: families');
    chk(metrics.dependencyDepth >= 4, 'advanced: depth');
    chk(metrics.variablesInSlice >= 2, 'advanced: vars');
  }
  // 6. slice soundness (dynamic): dropping every statement outside the slice leaves the answer unchanged
  const s = sliceFor(program, target);
  const end = target.format === 'output' ? target.index - 1 : target.format === 'final' ? program.length - 1 : target.index;
  const skip = new Set();
  for (let k = 0; k <= end; k++) if (!s.relevant.has(k) && program[k].k !== 'decl') skip.add(k);
  const ex2 = execute(program, { skip });
  if (!ex2.ok) bad(c, 'slice soundness: skipped run failed ' + JSON.stringify(ex2.error));
  else {
    const t2 = target.format === 'output' ? ex2.outputs.at(-1) : null;
    if (target.format === 'output') chk(t2 === c.correct.text, 'slice soundness (output)');
    else {
      const raw = target.format === 'final' ? ex2.final[target.varName] : ex2.steps[target.index].after[target.varName];
      chk(String(raw) === String(target.format === 'final' ? exec.final[target.varName] : exec.steps[target.index].after[target.varName]), 'slice soundness (value)');
    }
  }
  // 7. meaningful relevant changes: every relevant update visibly changes its variable
  for (const ln of metrics.relevantLines) {
    const k = ln - 1, st = program[k];
    if (['assign', 'compound', 'incdec'].includes(st.k)) chk(exec.steps[k].changed.includes(st.name), `relevant statement ${ln} has no visible effect`);
  }
  // 8. options and distractors
  const texts = c.choices.map((x) => x.text);
  chk(new Set(texts).size === texts.length, 'duplicate options');
  chk(c.choices.length === (c.answerType === 'boolean' ? 2 : c.answerType === 'char' ? 3 : 4) || (c.answerType === 'char' && c.choices.length === 4), 'option count');
  chk(c.choices[c.correctIndex].text === c.correct.text, 'correct option');
  chk(c.distractors.length === c.choices.length - 1, 'distractor count');
  const cands = collectCandidates(program, target, metrics, exec, c.correct.text);
  const cset = new Set(cands.map((x) => pair(x.id, x.text)));
  let pm1 = 0;
  for (const d of c.distractors) {
    chk(MISCONCEPTIONS[d.misconceptionId] && d.explanation && d.label, 'distractor metadata');
    chk(d.text !== c.correct.text, 'distractor equals correct');
    chk(cset.has(pair(d.misconceptionId, d.text)), `distractor ${d.text}/${d.misconceptionId} not reproducible from its model`);
    if (/^-?\d+$/.test(c.correct.text) && Math.abs(Number(d.text) - Number(c.correct.text)) === 1) pm1++;
  }
  chk(pm1 < c.distractors.length, 'all distractors are answer+/-1');
  // 9. magnitudes manageable
  for (const row of c.stateHistory.rows) for (const nm of Object.keys(row.raw)) {
    const ty = exec.types[nm];
    if (ty === 'int') chk(Math.abs(Number(row.raw[nm])) <= 2000, 'int magnitude');
    if (ty === 'String') chk(row.raw[nm].length <= 22, 'string length');
  }
  // 10. deterministic reproduction (sampled)
  if (i % 97 === 0) {
    const h2 = RecentHistory.from(hist.entries.slice(0, -1).map((e) => [e.e, e.s, e.p, e.f]));
    // history before this challenge was recorded:
    const again = generateTraceChallenge({ ...usedOpts, history: h2 });
    chk(JSON.stringify(again) === JSON.stringify(c), 'non-deterministic generation');
  }
  if (i % 2000 === 0) process.stderr.write(`  ${i}/${N}  (${((Date.now() - started) / 1000).toFixed(0)}s)\n`);
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
const missingFamilies = FAMILY_IDS.filter((f) => !cov.families[f]);
const result = { generated: N, seconds: Number(secs), checks: cov.checks, failures: fail.count || 0, relaxedRepetition: cov.relaxed, missingFamilies, coverage: cov };
fs.mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../reports/bulk-results.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(`bulk: ${N} challenges, ${cov.checks} checks, ${fail.count || 0} failures, ${secs}s; families missing: ${missingFamilies.join(',') || 'none'}; relaxed-repetition: ${cov.relaxed}`);
if (fail.length) { console.log(fail.slice(0, 8).join('\n----\n')); process.exit(1); }
