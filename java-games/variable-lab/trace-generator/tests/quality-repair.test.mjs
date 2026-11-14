// Regression tests for the Variable Lab Trace repairs (R2 cancelling operands, R5 inert counted
// statements, R9 forced-type guard). Node only; deterministic seeds; tolerant statistical bounds.
//   node variable-lab/trace-generator/tests/quality-repair.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {generateTraceChallenge, RecentHistory, DIFFICULTIES} from '../src/index.js';
import {lit, vr, bin, decl, assign, compound, incdec, print, varsIn, usesOf, defOf} from '../src/model.js';
import {execute} from '../src/interp.js';
import * as dataflow from '../src/dataflow.js';

const BASE = 20261113;                    // base seed used by the audit
const TYPES = ['int', 'double', 'boolean', 'char', 'String'], FORMATS = ['output', 'final', 'checkpoint'];
let failures = 0, checks = 0;
const report = [];
function check(name, fn) {
  checks++;
  try { const detail = fn(); report.push(`PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  catch (e) { failures++; report.push(`FAIL  ${name} — ${e.message.split('\n')[0]}`); }
}

// ---- the audit sampler (identical parameters: 300 session + 40 per type/format forced) ----
const rows = [], fails = [];
const pack = (c, extra) => ({...extra, c});
for (const difficulty of DIFFICULTIES) {
  const history = new RecentHistory();
  for (let i = 0; i < 300; i++) {
    const seed = (BASE + i) >>> 0;
    try { const c = generateTraceChallenge({difficulty, seed, history}); history.record(c); rows.push(pack(c, {sampling: 'session', difficulty, i})); }
    catch (e) { fails.push({difficulty, i, err: e.message}); }
  }
  for (const type of TYPES) for (const format of FORMATS) {
    const h = new RecentHistory();
    for (let i = 0; i < 40; i++) {
      const seed = (BASE + 1000000 + i) >>> 0;
      try { const c = generateTraceChallenge({difficulty, type, format, seed, history: h}); h.record(c); rows.push(pack(c, {sampling: 'forced', difficulty, i})); }
      catch (e) { fails.push({difficulty, type, format, i, err: e.message}); }
    }
  }
}

// ---- helpers: program recovery -----------------------------------------------------------
function programOf(c) { return c.model?.program; }
const sample = rows.filter((r) => programOf(r.c));
const statements = (r) => programOf(r.c);

// ---- independent oracle #1: random-environment sensitivity (no symbolic reasoning) -------
function evalNumber(e, env) {
  if (e.k === 'lit') return e.v;
  if (e.k === 'var') return env[e.name];
  if (e.k === 'not') return NaN;
  const a = evalNumber(e.l, env), b = evalNumber(e.r, env);
  const integer = e.t === 'int';
  switch (e.op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? NaN : integer ? Math.trunc(a / b) : a / b;
    case '%': return b === 0 ? NaN : a % b;
    default: return NaN;
  }
}
let seedState = 12345;
const rnd = () => (seedState = (Math.imul(seedState, 1664525) + 1013904223) >>> 0) / 4294967296;
function insensitiveOperand(s) {
  if (!['decl', 'assign', 'compound'].includes(s.k) || !['int', 'double'].includes(s.t)) return null;
  const expr = s.k === 'compound' ? bin(s.op, vr(s.name, s.t), s.expr) : s.expr;
  if (!expr || expr.t === 'boolean' || expr.t === 'String') return null;
  const names = [...new Set(varsIn(expr, []))];
  const pick = () => (s.t === 'int' ? Math.floor(rnd() * 601) - 300 : Math.round((rnd() * 600 - 300) * 4) / 4);
  for (const name of names) {
    const results = new Set();
    for (let trial = 0; trial < 40; trial++) {
      const env = Object.fromEntries(names.map((n) => [n, pick()]));
      const value = evalNumber(expr, env);
      if (Number.isFinite(value)) results.add(value);
    }
    // Vary only `name`: if the output never moves while the others are random, it is not read.
    const moving = new Set();
    for (let trial = 0; trial < 24; trial++) {
      const others = Object.fromEntries(names.map((n) => [n, pick()]));
      const outs = new Set();
      for (let k = 0; k < 6; k++) { const value = evalNumber(expr, {...others, [name]: pick()}); if (Number.isFinite(value)) outs.add(value); }
      moving.add(outs.size > 1 ? 1 : 0);
    }
    if (!moving.has(1)) return name;
  }
  return null;
}
const offenders = sample.filter((r) => statements(r).some((s) => insensitiveOperand(s)));
check('R2 oracle (random environments): no statement ignores one of the variables it reads', () => {
  assert.equal(offenders.length, 0, `${offenders.length}/${sample.length} questions (${offenders.slice(0, 3).map((r) => statements(r).find((s) => insensitiveOperand(s)) && require_render(r)).join(' | ')})`);
  return `${sample.length} questions, 0 offenders, ${fails.length} generation failures`;
});
function require_render(r) {
  const s = statements(r).find((x) => insensitiveOperand(x));
  return `${s.name} ${s.k} @${r.difficulty}/${r.c.type}`;
}

// ---- unit tests for the symbolic detector ------------------------------------------------
const I = (n) => lit('int', n), D = (n) => lit('double', n);
const v = (n, t = 'int') => vr(n, t);
const examples = {
  'time = time - (time + 8)': assign('time', 'int', bin('-', v('time'), bin('+', v('time'), I(8), {paren: true}))),
  'pears = pears - (pears - 1)': assign('pears', 'int', bin('-', v('pears'), bin('-', v('pears'), I(1), {paren: true}))),
  'z = z - 1 * z': assign('z', 'int', bin('-', v('z'), bin('*', I(1), v('z')))),
  'bonus -= score + bonus': compound('bonus', 'int', '-', bin('+', v('score'), v('bonus'))),
  'wallet -= wallet + tips': compound('wallet', 'int', '-', bin('+', v('wallet'), v('tips'))),
  'width += size - width': compound('width', 'int', '+', bin('-', v('size'), v('width'))),
  'height = height - (width + height)': assign('height', 'int', bin('-', v('height'), bin('+', v('width'), v('height'), {paren: true}))),
  'damage = damage - (damage - 5)': assign('damage', 'int', bin('-', v('damage'), bin('-', v('damage'), I(5), {paren: true}))),
  'health = health % 1 + armor': assign('health', 'int', bin('+', bin('%', v('health'), I(1)), v('armor'))),
  'width = width + 5.5 - width': assign('width', 'double', bin('-', bin('+', v('width', 'double'), D(5.5)), v('width', 'double'))),
};
const legitimate = {
  'x = x + y': assign('x', 'int', bin('+', v('x'), v('y'))),
  'x = y - x': assign('x', 'int', bin('-', v('y'), v('x'))),
  'x = x * 2 - x (still reads x)': assign('x', 'int', bin('-', bin('*', v('x'), I(2)), v('x'))),
  'x = (x + y) % 3': assign('x', 'int', bin('%', bin('+', v('x'), v('y'), {paren: true}), I(3))),
  'x = 7 (legitimate overwrite)': assign('x', 'int', I(7)),
  'x -= y': compound('x', 'int', '-', v('y')),
  'x++': incdec('x', '++'),
  'x = x / 2': assign('x', 'int', bin('/', v('x'), I(2))),
  'n = n * 3 + n': assign('n', 'int', bin('+', bin('*', v('n'), I(3)), v('n'))),
  'total = total + price * qty': assign('total', 'int', bin('+', v('total'), bin('*', v('price'), v('qty')))),
};
check('R2 detector flags every audited cancelling form', () => {
  const missed = Object.entries(examples).filter(([, s]) => !dataflow.cancelledOperands(s).length).map(([k]) => k);
  assert.deepEqual(missed, []);
  return `${Object.keys(examples).length} forms`;
});
check('R2 detector accepts legitimate updates, overwrites and distractor-style statements', () => {
  const wrong = Object.entries(legitimate).filter(([, s]) => dataflow.cancelledOperands(s).length).map(([k]) => k);
  assert.deepEqual(wrong, []);
  return `${Object.keys(legitimate).length} forms`;
});
check('R2 the unrelated oracle agrees with the symbolic detector on the audited forms', () => {
  for (const [name, s] of Object.entries(examples)) assert.ok(insensitiveOperand(s), `random-environment oracle did not flag ${name}`);
  for (const [name, s] of Object.entries(legitimate)) assert.equal(insensitiveOperand(s), null, `random-environment oracle flagged ${name}`);
});

// ---- R5: counted statements must matter ---------------------------------------------------
// Independent oracle #2 (initial-literal perturbation, the audit's method): a counted
// int/double statement is structurally dead when ablating it leaves the answer unchanged in at
// least 9 of 10 environments whose declaration literals are re-drawn.
function observeAnswer(exec, target) {
  if (target.format === 'output') return exec.steps[target.index]?.output;
  if (target.format === 'final') return exec.final?.[target.varName];
  return exec.steps[target.index]?.after?.[target.varName];
}
function structurallyDead(program, target, i) {
  let same = 0, valid = 0;
  for (let trial = 0; trial < 10; trial++) {
    const prog = program.map((s) => (s.k === 'decl' && ['int', 'double'].includes(s.t) && s.expr?.k === 'lit'
      ? {...s, expr: lit(s.t, s.t === 'int' ? Math.floor(rnd() * 41) - 20 : Math.round((rnd() * 40 - 20) * 2) / 2)} : s));
    const base = execute(prog, {maxInt: 1e6, maxDouble: 1e9, relaxed: true}), cut = execute(prog, {maxInt: 1e6, maxDouble: 1e9, relaxed: true, skip: new Set([i])});
    if (!base.ok || !cut.ok) continue;
    valid++;
    if (JSON.stringify(observeAnswer(base, target)) === JSON.stringify(observeAnswer(cut, target))) same++;
  }
  return valid >= 6 && same >= 0.9 * valid;
}
function deadCountedStatements(r) {
  const program = statements(r), target = r.c.model.target;
  if (!target || !['int', 'double'].includes(r.c.type)) return [];
  const lines = r.c.difficultyMetrics?.relevantLines ?? [];
  return lines.map((l) => l - 1).filter((i) => program[i] && ['assign', 'compound', 'incdec'].includes(program[i].k) && structurallyDead(program, target, i));
}
const numericIA = sample.filter((r) => ['intermediate', 'advanced'].includes(r.difficulty) && ['int', 'double'].includes(r.c.type));
const deadRows = numericIA.filter((r) => deadCountedStatements(r).length);
// Statements that cancel only *across* statements in an answer that still depends on the initial
// state (the specification's own `a -= b ... print(a + b)` example) are approved by the existing
// difficulty spec and reported separately, not counted as defects here.
const crossCancelled = (r) => deadCountedStatements(r).every((i) => !dataflow.answerMentions(statements(r), r.c.model.target, i));
const strictDead = deadRows.filter((r) => !crossCancelled(r));
check('R5 oracle (initial-literal perturbation): counted int/double statements are rarely structurally dead', () => {
  const rate = strictDead.length / numericIA.length, all = deadRows.length / numericIA.length;
  assert.ok(rate <= 0.03, `${strictDead.length}/${numericIA.length} = ${(100 * rate).toFixed(1)}% count a structurally dead statement (limit 3%; audit baseline 12-14%)`);
  return `${strictDead.length}/${numericIA.length} = ${(100 * rate).toFixed(1)}% (plus ${deadRows.length - strictDead.length} spec-style cross-statement cancellations, ${(100 * all).toFixed(1)}% in all)`;
});
// Independent oracle #3: a numeric answer that never changes when every declaration literal is
// re-drawn can be written down without tracing.
function readInitials(program) {         // indices of numeric declarations read before being overwritten
  const live = new Set();
  program.forEach((s, i) => {
    if (s.k !== 'decl' || !['int', 'double'].includes(s.t)) return;
    for (let j = i + 1; j < program.length; j++) {
      const q = program[j];
      if (usesOf(q).includes(s.name)) { live.add(i); break; }
      if (defOf(q) === s.name) break;
    }
  });
  return live;
}
function constantAnswer(r) {
  if (!['int', 'double'].includes(r.c.type)) return false;
  const program = statements(r), target = r.c.model.target, seen = new Set(), live = readInitials(program);
  if (live.size === 0) return false;     // a pure overwrite is constant by design
  for (let trial = 0; trial < 12; trial++) {
    const prog = program.map((s, i) => (live.has(i) && s.expr?.k === 'lit'
      ? {...s, expr: lit(s.t, s.t === 'int' ? Math.floor(rnd() * 61) - 30 : Math.round((rnd() * 60 - 30) * 2) / 2)} : s));
    const exec = execute(prog, {maxInt: 1e6, maxDouble: 1e9, relaxed: true});
    if (exec.ok) seen.add(JSON.stringify(observeAnswer(exec, target)));
  }
  return seen.size === 1;
}
const constantRows = sample.filter(constantAnswer);
check('R2 oracle (re-drawn initial values): numeric answers that read an input and then lose it are (almost) gone', () => {
  const numeric = sample.filter((r) => ['int', 'double'].includes(r.c.type)).length, rate = constantRows.length / numeric;
  // Residual cases are number-theoretic collapses (a remainder of a remainder, a quotient of bounded
  // values) that the symbolic/interval rules do not prove; they are deferred, with a 0.2% ceiling.
  assert.ok(rate <= 0.002, `${constantRows.length}/${numeric} constant-answer questions (${(100 * rate).toFixed(2)}%), e.g. ${constantRows[0] && constantRows[0].c.codeLines.join(' | ')}`);
  return `${constantRows.length}/${numeric} = ${(100 * rate).toFixed(2)}%`;
});

// ---- preserved behaviour ------------------------------------------------------------------
function familyShare(name) {
  const ok = sample.filter((r) => (r.c.difficultyMetrics?.families ?? []).includes(name));
  return ok.length / sample.length;
}
const preserved = {REASSIGN_OVERWRITE: 0.5, COPY_INDEPENDENCE: 0.5, PRINT_VS_STORED: 0.5};
// Baselines measured on the unmodified generator with the same sampler are recorded in the
// handoff; the floor below only guards against the repair removing a whole family.
for (const [name, floor] of Object.entries(preserved)) {
  check(`preserved: intentional ${name} items are still generated`, () => {
    const share = familyShare(name);
    assert.ok(share > 0.005, `${name} appears in ${(100 * share).toFixed(2)}% of questions`);
    return `${(100 * share).toFixed(1)}% of questions`;
  });
}
check('R9 forced type/format generation does not throw (audit baseline: 17/1800)', () => {
  const forced = fails.filter((f) => f.type);
  assert.equal(forced.length, 0, `${forced.length} forced failures, e.g. ${JSON.stringify(forced[0])}`);
  return '0 failures in 1800 forced requests';
});
check('natural (session) generation still succeeds', () => {
  const natural = fails.filter((f) => !f.type);
  assert.equal(natural.length, 0, JSON.stringify(natural[0]));
  return '900/900';
});


// ---- independent Java verification of the repaired generator's answers ---------------------
// Compiles and runs the displayed code with a real JVM and compares with the keyed answer. This is the
// same ground truth the audit used; it is Node + Java only.
check('Java oracle: the keyed answer equals the real JVM result for every 4th sampled question', () => {
  const chosen = sample.filter((_, k) => k % 4 === 0);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-repair-'));
  try {
    fs.writeFileSync(path.join(tmp, 'Compile.java'), 'import javax.tools.*; class Compile {public static void main(String[] a){System.exit(ToolProvider.getSystemJavaCompiler().run(null,null,null,a));}}');
    const body = (c) => {
      const code = [...c.codeLines], t = c.model.target;
      if (t.format === 'final') return [...code, `System.out.println(${t.varName});`];
      if (t.format === 'checkpoint') return [...code.slice(0, t.index + 1), `if (true) { System.out.println(${t.varName}); return; }`, ...code.slice(t.index + 1)];
      return code;
    };
    let compared = 0;
    for (let start = 0; start < chosen.length; start += 150) {
      const part = chosen.slice(start, start + 150), name = 'T' + (start / 150);
      const classes = part.map((r, i) => `static class C${i} { static void run() { ${body(r.c).join('\n')} } }`);
      fs.writeFileSync(path.join(tmp, name + '.java'), `class ${name} { ${classes.join('\n')} public static void main(String[] a) { ${part.map((_, i) => `System.out.println("@@"); C${i}.run();`).join('')} } }`);
      const c = spawnSync('java', [path.join(tmp, 'Compile.java'), '-d', tmp, path.join(tmp, name + '.java')], {encoding: 'utf8', maxBuffer: 1e8});
      assert.equal(c.status, 0, String(c.stderr || c.stdout).split('\n').slice(0, 6).join('\n'));
      const run = spawnSync('java', ['-cp', tmp, name], {encoding: 'utf8', maxBuffer: 1e8});
      assert.equal(run.status, 0, run.stderr);
      const blocks = run.stdout.split('@@\n').slice(1);
      assert.equal(blocks.length, part.length);
      part.forEach((r, i) => {
        const lines = blocks[i].replace(/\n$/, '').split('\n'), got = lines[lines.length - 1], want = r.c.correct.text;
        const same = got === want || (['int', 'double'].includes(r.c.type) && Number(got) === Number(want));
        assert.ok(same, `${r.difficulty}/${r.c.type}/${r.c.format} seed ${r.c.seed}: JVM ${got} vs keyed ${want}`);
        compared++;
      });
    }
    return `${compared} programs compiled and run`;
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
});

console.log(report.join('\n'));
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
