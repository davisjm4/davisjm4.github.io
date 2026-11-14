// Regression tests for the Array Lab instructional-quality repairs (R1, R3/R8, R4, R11).
// Node + Java only. Seeds are deterministic; statistical checks use tolerant bounds.
//   node array-lab/quality-repair-tests.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {generateArray} from './array-engine.js';
import {createArrayHistory} from './compose/engine.js';
import * as quality from './compose/quality.js';
const {validateCandidate} = quality;
import {buildModel} from './compose/models.js';
import {execute} from './compose/ir.js';
// The shared helper exists only after the repair; the same semantic definition is kept here so the
// suite can also run against the unmodified generator to reproduce the original failures.
const finalAssignmentIsNoOp = quality.finalAssignmentIsNoOp ?? (program => {
  const list = program.statements, last = list.at(-1);
  if (!last || last.op !== 'assign' || last.index === undefined) return false;
  return JSON.stringify(execute({...program, statements: list.slice(0, -1)}).states[last.name]) === JSON.stringify(execute(program).states[last.name]);
});

const BASE_SEED = 20261113;               // base seed used by the audit
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
let failures = 0, checks = 0;
const report = [];
function check(name, fn) {
  checks++;
  try { const detail = fn(); report.push(`PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  catch (e) { failures++; report.push(`FAIL  ${name} — ${e.message.split('\n')[0]}`); }
}

function sequence(mode, difficulty, n, base = BASE_SEED) {
  const history = createArrayHistory(null), out = [];
  for (let i = 0; i < n; i++) out.push(generateArray(mode, undefined, {difficulty, seed: (base + i) >>> 0, history}));
  return out;
}

// ---------- independent Java oracle -------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'array-repair-'));
process.on('exit', () => fs.rmSync(tmp, {recursive: true, force: true}));
fs.writeFileSync(path.join(tmp, 'Compile.java'), 'import javax.tools.*; class Compile {public static void main(String[] a){System.exit(ToolProvider.getSystemJavaCompiler().run(null,null,null,a));}}');
function runJava(snippets) {      // snippets: [{methods, body}] where body returns a String via `return`
  const results = [];
  for (let start = 0; start < snippets.length; start += 150) {
    const part = snippets.slice(start, start + 150), name = 'B' + (start / 150);
    const classes = part.map((s, i) => `static class C${i} { ${s.methods || ''}\nstatic String run() { try { ${s.body} } catch (Throwable e) { return "EXC:" + e.getClass().getSimpleName(); } } }`);
    fs.writeFileSync(path.join(tmp, name + '.java'), `import java.util.*; class ${name} { ${classes.join('\n')} public static void main(String[] a) { ${part.map((_, i) => `System.out.println(C${i}.run());`).join('')} } }`);
    const c = spawnSync('java', [path.join(tmp, 'Compile.java'), '-d', tmp, path.join(tmp, name + '.java')], {encoding: 'utf8', maxBuffer: 1e8});
    assert.equal(c.status, 0, String(c.stderr || c.stdout).split('\n').slice(0, 8).join('\n'));
    const r = spawnSync('java', ['-cp', tmp, name], {encoding: 'utf8', maxBuffer: 1e8});
    assert.equal(r.status, 0, r.stderr);
    results.push(...r.stdout.trimEnd().split('\n'));
  }
  return results;
}
// Execute the displayed program up to (not including) its last statement, snapshot the
// assigned array, run the last statement, snapshot again.
function noOpChangedCell(q) {
  const lines = q.javaBody.replace(/\s+$/, '').split('\n'), last = lines.pop().trim();
  const m = last.match(/^(\w+)(?:\[.*\])+\s*=/);
  if (!m) throw new Error('last statement is not an array assignment: ' + last);
  return {
    methods: q.javaMethods,
    body: `${lines.join('\n')}\nString __snapBefore = Arrays.deepToString(new Object[]{${m[1]}});\n${last}\nString __snapAfter = Arrays.deepToString(new Object[]{${m[1]}});\nreturn __snapBefore.equals(__snapAfter) ? "SAME" : "DIFF";`
  };
}
const lenOf = q => q.values?.length ?? q.code.match(/int\[\] values = \{([^}]*)\}/)?.[1].split(',').length;
const claimsChange = q => /\bchanged\b/.test(q.prompt) && ['apply', 'cell-2d'].includes(q.kind);

// ---------- R1: "changed cell" must change ------------------------------------------
{
  const batches = [['perform-update', 150], ['update-2d', 300], ['mixed', 150]];
  let total = 0, noOps = 0;const per = {};
  for (const [mode, n] of batches) for (const difficulty of LEVELS) {
    const qs = sequence(mode, difficulty, n).filter(claimsChange);
    const out = runJava(qs.map(noOpChangedCell));
    const bad = out.filter(x => x === 'SAME').length;
    assert.ok(!out.some(x => x.startsWith('EXC:')), `unexpected exception in ${mode}/${difficulty}`);
    total += qs.length; noOps += bad; per[`${mode}/${difficulty}`] = `${bad}/${qs.length}`;
  }
  check('R1 java oracle: no "changed cell" question leaves its cell unchanged (deterministic seeds)', () => {
    assert.equal(noOps, 0, `${noOps}/${total} no-op items: ${JSON.stringify(per)}`);
    return `${total} questions, 0 no-ops`;
  });
}
// Deterministic regression cases: a final assignment that rewrites the cell with its own value
// must be rejected when the prompt says "changed", and accepted by this gate when it says "assigned".
function selfAssigned(q, prompt) {
  const stmts = q.semanticProgram.statements.slice(), last = stmts.at(-1);
  const self = {op: 'read', name: last.name, index: last.index, ...(last.column ? {column: last.column} : {})};
  stmts[stmts.length - 1] = {...last, value: self};
  return {...q, prompt: prompt ?? q.prompt, semanticProgram: {...q.semanticProgram, statements: stmts}};
}
const gateProblems = q => validateCandidate(q).problems.filter(p => /unchanged/.test(p));
for (const [mode, model, label] of [['perform-update', 0, '1D'], ['update-2d', 0, '2D']]) for (const difficulty of LEVELS) {
  check(`R1 ${label}/${difficulty}: a self-assignment is rejected under a "changed" prompt and exempt under "assigned"`, () => {
    let tried = 0;
    for (let seed = 1; seed < 60 && tried < 6; seed++) {
      const q = buildModel(mode, model, 0, difficulty, seed * 104729);
      if (!claimsChange(q)) continue;
      tried++;
      assert.equal(gateProblems(selfAssigned(q)).length, 1, `seed ${seed}: no-op not rejected`);
      assert.equal(gateProblems(selfAssigned(q, 'Select the cell assigned by the final assignment.')).length, 0, 'assigned wording wrongly rejected');
      assert.equal(gateProblems(q).length, finalAssignmentIsNoOp(q.semanticProgram) ? 1 : 0, 'gate disagrees with the semantic no-op check');
    }
    assert.ok(tried >= 3, `only ${tried} usable samples`);
    return `${tried} samples`;
  });
}

// ---------- R3/R8: Beginner array variation -----------------------------------------
{
  const N = 400;
  const accessed = q => q.kind === 'cell' || q.kind === 'apply' ? Number(q.correctCell) : null;
  for (const mode of ['element', 'perform-update']) {
    // 4 independent sequences of 100 so the statistics do not depend on a single seed stream
    const qs = [0, 1, 2, 3].flatMap(k => sequence(mode, 'Beginner', N / 4, BASE_SEED + k * 1000003));
    const cells = qs.map(accessed).filter(x => x !== null);
    check(`R3 ${mode}/Beginner: accessed index is not concentrated on 2-4`, () => {
      const mid = cells.filter(i => i >= 2 && i <= 4).length / cells.length;
      assert.ok(mid <= 0.62, `indices 2-4 are ${(100 * mid).toFixed(1)}% of ${cells.length}`);
      return `${(100 * mid).toFixed(1)}% in 2-4`;
    });
    check(`R3 ${mode}/Beginner: first, second, middle and final valid index each appear`, () => {
      const hits = {first: 0, second: 0, last: 0, middle: 0};
      for (const q of qs) {
        const i = accessed(q); if (i === null) continue;
        const n = lenOf(q);
        if (i === 0) hits.first++; if (i === 1) hits.second++; if (i === n - 1) hits.last++; if (i === Math.floor(n / 2) || i === Math.floor((n - 1) / 2)) hits.middle++;
      }
      for (const [k, v] of Object.entries(hits)) assert.ok(v / cells.length >= (mode === 'perform-update' && k === 'first' ? 0.02 : 0.05), `${k} index only ${v}/${cells.length}`);
      return JSON.stringify(hits);
    });
    check(`R3 ${mode}/Beginner: array lengths vary`, () => {
      const lengths = new Map();
      for (const q of qs) lengths.set(lenOf(q), (lengths.get(lenOf(q)) || 0) + 1);
      const top = Math.max(...lengths.values()) / qs.length;
      assert.ok(lengths.size >= 3, `only ${lengths.size} distinct length(s)`);
      assert.ok(top <= 0.5, `most common length is ${(100 * top).toFixed(1)}%`);
      return JSON.stringify([...lengths]);
    });
    check(`R3 ${mode}/Beginner: runs of identical accessed cells are not more frequent than chance allows`, () => {
      // Share of start positions inside each 100-question sequence that begin a 3-in-a-row streak.
      // Audit baseline for the unmodified generator: 25.5% (element) and 31.0% (perform-update).
      let starts = 0, windows = 0;
      for (let k = 0; k < 4; k++) {
        const seq = qs.slice(k * 100, k * 100 + 100).map(accessed);
        for (let i = 0; i + 2 < seq.length; i++) { windows++; if (seq[i] !== null && seq[i] === seq[i + 1] && seq[i] === seq[i + 2]) starts++; }
      }
      const rate = starts / windows;
      assert.ok(rate <= 0.08, `${(100 * rate).toFixed(1)}% of positions start a 3-streak (limit 8%)`);
      return `${(100 * rate).toFixed(1)}% start a 3-streak`;
    });
  }
  const bounds = [0, 1, 2, 3].flatMap(k => sequence('element', 'Beginner', 100, BASE_SEED + k * 1000003)).filter(q => q.reasoningModel === 'bounds-check');
  check('R8 element/Beginner bounds-check: valid boundary and exception outcomes are both present', () => {
    const exc = bounds.filter(q => /Exception/.test(q.expectedOutput)).length;
    assert.ok(bounds.length >= 20, `only ${bounds.length} bounds-check samples`);
    const share = exc / bounds.length;
    assert.ok(share >= 0.2 && share <= 0.8, `exception share ${(100 * share).toFixed(0)}% of ${bounds.length}`);
    return `${exc}/${bounds.length} exceptions`;
  });
  check('R8 element/Beginner bounds-check: each structural variant keeps one outcome across seeds (certified structure stays seed-independent)', () => {
    const byVariant = new Map();
    for (let variant = 0; variant < 12; variant++) {
      const outcomes = new Set();
      for (let seed = 1; seed <= 12; seed++) outcomes.add(/Exception/.test(buildModel('element', 9, variant, 'Beginner', seed * 7919).expectedOutput));
      assert.equal(outcomes.size, 1, `variant ${variant} changes outcome with the seed`);
      byVariant.set(variant, [...outcomes][0]);
    }
    const valid = [...byVariant.values()].filter(x => !x).length;
    assert.ok(valid >= 4 && valid <= 8, `${valid}/12 variants are valid-boundary cases`);
    return `${valid}/12 variants valid, ${12 - valid}/12 exception`;
  });
  check('R8 element/Beginner bounds-check: outcome is not a fixed pattern of the family position', () => {
    // Over independent sequences every transition (valid->valid, valid->exception, exception->valid,
    // exception->exception) must occur; a strict alternation or a constant outcome would leave a
    // transition at zero. No transition may dominate beyond what a 2:1 mixture produces.
    const t = {VV: 0, VE: 0, EV: 0, EE: 0};
    for (let k = 0; k < 12; k++) {
      const seq = sequence('element', 'Beginner', 100, BASE_SEED + k * 7000003).filter(q => q.reasoningModel === 'bounds-check').map(q => /Exception/.test(q.expectedOutput) ? 'E' : 'V');
      for (let i = 1; i < seq.length; i++) t[seq[i - 1] + seq[i]]++;
    }
    const total = Object.values(t).reduce((a, b) => a + b, 0);
    for (const [k, v] of Object.entries(t)) assert.ok(v >= 5 && v / total <= 0.6, `transition ${k}: ${v}/${total}`);
    return JSON.stringify(t);
  });
}

// ---------- R4: no redundant modulus on already-bounded 2D indices ---------------------
// Independent oracle (Java): for every `X % grid[...].length` statement, running the program
// with the modulus removed must either throw or behave identically ONLY IF the modulus was
// required. A modulus whose removal never changes any observable result across the full
// sample is dead code that pads the difficulty.
check('R4 access-2d/update-2d: no dead `c % grid[r].length` re-bounding statement', () => {
  const pattern = /^\s*(\w+) = \(\1 % grid\[(\w+)\]\.length\);$/;
  let flagged = 0, total = 0, examples = [];
  for (const mode of ['access-2d', 'update-2d']) for (const difficulty of ['Intermediate', 'Advanced']) {
    const qs = sequence(mode, difficulty, 120);
    const bodies = [];
    for (const q of qs) {
      total++;
      const lines = q.javaBody.split('\n');
      lines.forEach((line, idx) => { if (pattern.test(line)) bodies.push({q, idx, lines}); });
    }
    if (!bodies.length) continue;
    const snippets = [], keep = [];
    for (const {q, idx, lines} of bodies) {
      const tail = `return String.valueOf(${q.javaOutput.trim() ? q.javaOutput : '0'}) + "|" + Arrays.deepToString(new Object[]{grid});`;
      const make = ablate => `${lines.filter((_, i) => !(ablate && i === idx)).join('\n')}\n${tail}`;
      snippets.push({methods: q.javaMethods, body: make(false)}, {methods: q.javaMethods, body: make(true)});
      keep.push(q);
    }
    const out = runJava(snippets);
    for (let i = 0; i < keep.length; i++) if (out[2 * i] === out[2 * i + 1]) { flagged++; if (examples.length < 2) examples.push(`${mode}/${difficulty}`); }
  }
  assert.equal(flagged, 0, `${flagged} dead re-bounding statements (${examples.join(', ')})`);
  return `${total} questions inspected`;
});

// ---------- R11: explanations only describe what the question contains ------------------
check('R11 explanations do not mention aliases or conditions that are absent from the code', () => {
  const aliasWords = /\balias(?:es)?\b|shared? (?:one )?array|same array object/i;
  const aliasCode = /\bint\[\] \w+ = \w+(?:\[[^\]]+\])?;|\w+ = \w+;|\w+\(\w+\)|clone\(\)/;
  let inspected = 0; const bad = [];
  for (const mode of ['element', 'predict-update', 'perform-update', 'search', 'traversal', 'access-2d', 'update-2d', 'nested', 'reverse', 'create-references', 'in-place', 'trace-2d']) for (const difficulty of LEVELS) {
    for (const q of sequence(mode, difficulty, 60)) {
      inspected++;
      const text = q.explanation, placeholder = /Choose one statement here/.test(q.code);
      if (aliasWords.test(text) && !aliasCode.test(q.code)) bad.push(`${mode}/${difficulty}: alias wording without alias code`);
      if (/\bconditions?\b/.test(text) && !/\bif \(/.test(q.code) && !placeholder) bad.push(`${mode}/${difficulty}: condition wording without an if statement`);
      if (/nested loops/.test(text) && !/\bfor \(/.test(q.code)) bad.push(`${mode}/${difficulty}: loop wording without a loop`);
    }
  }
  assert.equal(bad.length, 0, `${bad.length}/${inspected}: ${[...new Set(bad)].slice(0, 3).join('; ')}`);
  return `${inspected} explanations inspected`;
});

// ---------- R6: trace-2d row-transform statements must matter ---------------------------
// Java ablation under re-drawn grid data: a statement whose removal leaves the printed value
// unchanged in at least 5 of 6 data draws is dead.
function redrawGrid(code, salt) {
  let state = (salt * 2654435761) >>> 0; const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const lines = code.split('\n'); let inside = false;
  return lines.map(line => {
    if (/int\[\]\[\] grid = \{/.test(line)) { inside = true; return line; }
    if (inside && /^\s*\};?$/.test(line)) { inside = false; return line; }
    return inside ? line.replace(/-?\d+/g, () => String(1 + Math.floor(next() * 13))) : line;
  }).join('\n');
}
function deadStatementRate(qs, pattern) {
  const snippets = [], keep = [];
  for (const q of qs) {
    const lines = q.javaBody.split('\n'), idx = lines.findIndex(l => pattern.test(l.trim()));
    if (idx < 0) continue;
    const out = `System.out.println(${q.javaOutput});`;
    for (let draw = 0; draw < 6; draw++) {
      const full = redrawGrid(q.javaBody, draw + 1), cutLines = redrawGrid(lines.filter((_, i) => i !== idx).join('\n'), draw + 1);
      snippets.push({methods: q.javaMethods, body: `${full}\nreturn String.valueOf(${q.javaOutput});`}, {methods: q.javaMethods, body: `${cutLines}\nreturn String.valueOf(${q.javaOutput});`});
    }
    keep.push(q);
  }
  const results = runJava(snippets);
  let dead = 0;
  keep.forEach((q, k) => { let same = 0, valid = 0; for (let d = 0; d < 6; d++) { const a = results[(k * 6 + d) * 2], b = results[(k * 6 + d) * 2 + 1]; if (a.startsWith('EXC:') || b.startsWith('EXC:')) continue; valid++; if (a === b) same++; } if (valid >= 4 && same >= 0.8 * valid) dead++; });
  return {dead, total: keep.length};
}
check('R6 trace-2d row-transform (Intermediate/Advanced): the grid[0][0] update is not cancelled by the printed expression', () => {
  let dead = 0, total = 0;
  for (const difficulty of ['Intermediate', 'Advanced']) {
    const qs = sequence('trace-2d', difficulty, 400).filter(q => q.reasoningModel === 'row-transform');
    const r = deadStatementRate(qs, /^grid\[0\]\[0\] = \(grid\[0\]\[0\] \+ result\);$/);
    dead += r.dead; total += r.total;
  }
  assert.ok(total >= 20, `only ${total} samples`);
  assert.equal(dead, 0, `${dead}/${total} questions have a cancelled grid[0][0] update`);
  return `${total} questions, 0 dead updates`;
});
check('R6 trace-2d row-transform (Beginner): the second half of the swap is observed', () => {
  const qs = sequence('trace-2d', 'Beginner', 400).filter(q => q.reasoningModel === 'row-transform');
  const r = deadStatementRate(qs, /^grid\[2\]\[0\] = saved;$/);
  assert.ok(r.total >= 20, `only ${r.total} samples`);
  assert.equal(r.dead, 0, `${r.dead}/${r.total} questions never read grid[2][0]`);
  return `${r.total} questions, 0 dead second halves`;
});

console.log(report.join('\n'));
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
