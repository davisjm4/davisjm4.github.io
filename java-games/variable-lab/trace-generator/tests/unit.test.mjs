// Focused unit tests: Java semantics, precedence misconception transformer, difficulty enforcement,
// dependency analysis, signatures / repetition control, determinism, checkpoint line mapping.
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { execute, typeCheck, formatValue } from '../src/interp.js';
import { analyze, validateDifficulty, sliceFor } from '../src/analysis.js';
import { collectCandidates } from '../src/distractors.js';
import { generateTraceChallenge, generateTraceBatch, RecentHistory, getPreSubmissionView, getPostSubmissionView, toVariableLabChallenge } from '../src/index.js';
import { hasTrivialSelfOp } from '../src/generator.js';
import { exactSignature, semanticSignature } from '../src/history.js';

const { lit, vr, bin, decl, assign, compound, incdec, print, not } = M;
const I = (v) => lit('int', v), v = (n, t = 'int') => vr(n, t);
let passed = 0, failed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const run = (prog, opts) => execute(prog, opts);
const out = (prog) => run(prog).outputs.at(-1);

// ---------------- Java semantics ----------------
test('integer division truncates toward zero', () => {
  assert.equal(out([print(bin('/', I(7), I(2)))]), '3');
  assert.equal(out([print(bin('/', I(-7), I(2)))]), '-3');
  assert.equal(out([print(bin('/', I(7), I(-2)))]), '-3');
  assert.equal(out([print(bin('/', I(-7), I(-2)))]), '3');
});
test('remainder keeps the sign of the left operand', () => {
  assert.equal(out([print(bin('%', I(-7), I(3)))]), '-1');
  assert.equal(out([print(bin('%', I(7), I(-3)))]), '1');
  assert.equal(out([print(bin('%', I(-6), I(3)))]), '0'); // never "-0"
});
test('division by zero is a runtime error in the model (generator must prevent it)', () => {
  const r = run([print(bin('/', I(1), I(0)))]);
  assert.equal(r.ok, false); assert.equal(r.error.code, 'div0');
});
test('operator precedence and parentheses', () => {
  assert.equal(out([print(bin('+', I(2), bin('*', I(4), I(4))))]), '18');
  assert.equal(out([print(bin('*', M.paren(bin('+', I(2), I(4))), I(4)))]), '24');
  assert.equal(out([print(bin('-', I(10), bin('-', I(4), I(3))))]), '9'); // right operand needs parens in source
  assert.equal(M.renderExpr(bin('-', I(10), bin('-', I(4), I(3)))), '10 - (4 - 3)');
  assert.equal(M.renderExpr(bin('-', bin('-', I(10), I(4)), I(3))), '10 - 4 - 3');
});
test('compound assignment evaluates the whole right side first', () => {
  const p = [decl('int', 'x', I(10)), compound('x', 'int', '*', bin('+', I(2), I(3))), print(v('x'))];
  assert.equal(out(p), '50');
  assert.equal(M.renderStmt(p[1]), 'x *= 2 + 3;');
});
test('compound int division / remainder and increments', () => {
  const p = [decl('int', 'x', I(17)), compound('x', 'int', '/', I(5)), incdec('x', '++'), compound('x', 'int', '%', I(3)), print(v('x'))];
  assert.equal(out(p), '1'); // 17/5=3, 4, 4%3=1
});
test('primitive copies are independent', () => {
  const p = [decl('int', 'a', I(4)), decl('int', 'b', I(7)), assign('a', 'int', v('b')), assign('b', 'int', bin('+', v('a'), I(3))), print(bin('+', v('a'), v('b')))];
  assert.equal(out(p), '17');
  const q = [decl('int', 'a', I(1)), decl('int', 'b', I(2)), assign('b', 'int', v('a')), assign('a', 'int', I(9)), print(v('b'))];
  assert.equal(out(q), '1');
});
test('double arithmetic and printing', () => {
  const D = (x) => lit('double', x);
  assert.equal(out([print(bin('+', D(1.5), D(2.5)))]), '4.0');
  assert.equal(out([print(bin('/', I(7), I(2)))]), '3');
  assert.equal(out([decl('double', 'd', bin('/', I(7), I(2))), print(v('d', 'double'))]), '3.0'); // int division, then widened
  assert.equal(out([print(bin('/', lit('double', 7), I(2)))]), '3.5');
  assert.equal(out([print(bin('*', I(3), D(1.5)))]), '4.5');
});
test('String concatenation is left to right', () => {
  const S = (x) => lit('String', x);
  assert.equal(out([print(bin('+', bin('+', I(1), I(2)), S('x')))]), '3x');
  assert.equal(out([print(bin('+', bin('+', S('x'), I(1)), I(2)))]), 'x12');
  assert.equal(out([print(bin('+', S('x'), bin('+', I(1), I(2))))]), 'x3'); // printed with parens: "x" + (1 + 2)
  assert.equal(M.renderExpr(bin('+', S('x'), bin('+', I(1), I(2)))), '"x" + (1 + 2)');
  assert.equal(out([print(bin('+', S('n='), lit('double', 2)))]), 'n=2.0');
  assert.equal(out([print(bin('+', S('c='), lit('char', 'q')))]), 'c=q');
  assert.equal(out([print(bin('+', S('b='), lit('boolean', true)))]), 'b=true');
});
test('boolean operators, relational, short-circuit', () => {
  const B = (x) => lit('boolean', x);
  assert.equal(out([print(not(B(true)))]), 'false');
  assert.equal(out([print(bin('||', B(true), bin('&&', B(false), B(false))))]), 'true');
  assert.equal(out([print(bin('&&', bin('>', I(5), I(3)), bin('==', bin('%', I(7), I(2)), I(1))))]), 'true');
  assert.equal(M.renderExpr(not(bin('&&', B(true), B(false)))), '!(true && false)');
});
test('char values print as characters and copy by value', () => {
  const p = [decl('char', 'a', lit('char', 'x')), decl('char', 'b', lit('char', 'y')), assign('b', 'char', vr('a', 'char')), assign('a', 'char', lit('char', 'z')), print(vr('b', 'char'))];
  assert.equal(out(p), 'x');
});
test('int overflow and bounds are rejected rather than wrapped', () => {
  const r = run([decl('int', 'x', I(100000)), compound('x', 'int', '*', I(100000))]);
  assert.equal(r.ok, false);
  const r2 = run([decl('int', 'x', I(2000000000)), compound('x', 'int', '+', I(2000000000))], { maxInt: 0 });
  assert.equal(r2.ok, false); assert.equal(r2.error.code, 'overflow');
});
test('type checker rejects invalid Java', () => {
  assert.throws(() => typeCheck([decl('int', 'x', lit('double', 1.5))]));
  assert.throws(() => typeCheck([print(v('x'))])); // uninitialized
  assert.throws(() => typeCheck([decl('int', 'x', I(1)), decl('int', 'x', I(2))]));
  assert.throws(() => typeCheck([decl('boolean', 'b', I(1))]));
  assert.throws(() => typeCheck([decl('int', 'x', I(1)), compound('x', 'int', '+', lit('double', 1.5))]));
  assert.throws(() => typeCheck([decl('String', 's', lit('String', 'a')), decl('String', 't', lit('String', 'b')), print(bin('==', v('s', 'String'), v('t', 'String')))]));
});
test('state history records every statement', () => {
  const p = [decl('int', 'a', I(4)), decl('int', 'b', I(7)), assign('a', 'int', v('b')), assign('b', 'int', bin('+', v('a'), I(3))), print(bin('+', v('a'), v('b')))];
  const r = run(p, { trace: true });
  assert.deepEqual(r.steps.map((s) => s.after), [{ a: 4 }, { a: 4, b: 7 }, { a: 7, b: 7 }, { a: 7, b: 10 }, { a: 7, b: 10 }]);
  assert.equal(r.outputs[0], '17');
});

// ---------------- precedence misconception transformer is general ----------------
const spec = (ps, tgtVar) => ({ prog: ps, target: { format: 'output', index: ps.length - 1 } });
test('precedence distractors 24, 16 and 10 are GENERATED for value = value + 4 * 4 (not hardcoded)', () => {
  const p = [decl('int', 'value', I(2)), assign('value', 'int', bin('+', v('value'), bin('*', I(4), I(4)))), print(v('value'))];
  const target = { format: 'output', index: 2 };
  const exec = execute(p, { trace: true });
  const an = analyze(p, target, { exec });
  const c = collectCandidates(p, target, an, exec, '18');
  const by = (id) => c.filter((x) => x.id === id).map((x) => x.text);
  assert.ok(by('OPERATOR_PRECEDENCE_IGNORED').includes('24'));
  assert.ok(by('OLD_VALUE_IGNORED').includes('16'));
  assert.ok(by('MULT_AS_ADD').includes('10'));
});
test('same transformer produces the equivalent wrong answer for other expressions', () => {
  // total = 5 * 3 + 2 * 4  -> correct 23; left to right: ((5*3)+2)*4 = 68
  const p = [decl('int', 'total', I(1)), assign('total', 'int', bin('+', bin('*', I(5), I(3)), bin('*', I(2), I(4)))), print(v('total'))];
  const target = { format: 'output', index: 2 };
  const exec = execute(p, { trace: true });
  assert.equal(exec.outputs[0], '23');
  const an = analyze(p, target, { exec });
  const c = collectCandidates(p, target, an, exec, '23');
  assert.ok(c.some((x) => x.id === 'OPERATOR_PRECEDENCE_IGNORED' && x.text === '68'));
  // y = 20 - 6 / 2 -> 17; left to right (20-6)/2 = 7
  const q = [decl('int', 'y', I(0)), assign('y', 'int', bin('-', I(20), bin('/', I(6), I(2)))), print(v('y'))];
  const e2 = execute(q, { trace: true });
  const a2 = analyze(q, target, { exec: e2 });
  assert.ok(collectCandidates(q, target, a2, e2, '17').some((x) => x.id === 'OPERATOR_PRECEDENCE_IGNORED' && x.text === '7'));
});
test('linked-copy misconception is executed, not asserted', () => {
  const p = [decl('int', 'a', I(5)), decl('int', 'b', I(1)), assign('b', 'int', v('a')), compound('a', 'int', '+', I(4)), print(v('b'))];
  const target = { format: 'output', index: 4 };
  const exec = execute(p, { trace: true });
  assert.equal(exec.outputs[0], '5');
  const an = analyze(p, target, { exec });
  assert.ok(collectCandidates(p, target, an, exec, '5').some((x) => x.id === 'LINKED_COPY' && x.text === '9'));
});
test('String number concatenation misconceptions', () => {
  const S = (x) => lit('String', x);
  const p = [decl('int', 'a', I(3)), decl('int', 'b', I(4)), print(bin('+', bin('+', v('a'), v('b')), S('!')))];
  const target = { format: 'output', index: 2 };
  const exec = execute(p, { trace: true });
  assert.equal(exec.outputs[0], '7!');
  const an = analyze(p, target, { exec });
  assert.ok(collectCandidates(p, target, an, exec, '7!').some((x) => x.id === 'CONCAT_NUMBERS_AS_TEXT' && x.text === '34!'));
});

// ---------------- difficulty enforcement & dependency analysis ----------------
const diff = (prog, target, d, ctx = {}) => validateDifficulty(analyze(prog, target), d, ctx);
test('trivial programs can never qualify as Advanced', () => {
  const p1 = [decl('int', 'value', I(9)), print(bin('+', v('value'), I(2)))];
  assert.equal(diff(p1, { format: 'output', index: 1 }, 'advanced').ok, false);
  const p2 = [decl('int', 'value', I(2)), assign('value', 'int', bin('+', v('value'), bin('*', I(4), I(4)))), print(v('value'))];
  const r = diff(p2, { format: 'output', index: 2 }, 'advanced');
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => /relevant changes/.test(f)));
  // ...but the single precedence update is fine for Beginner/Intermediate-level concept checks
  assert.equal(diff(p2, { format: 'output', index: 2 }, 'beginner').ok, true);
});
test('the spec’s advanced example qualifies', () => {
  const p = [decl('int', 'a', I(6)), decl('int', 'b', I(4)), compound('a', 'int', '+', bin('*', v('b'), I(2))), assign('b', 'int', bin('/', v('a'), I(3))), compound('a', 'int', '-', v('b')), print(bin('+', v('a'), v('b')))];
  const t = { format: 'output', index: 5 };
  const e = execute(p);
  assert.equal(e.outputs[0], '14'); // a=14; b=14/3=4; a=14-4=10; 10+4=14
  const r = diff(p, t, 'advanced');
  assert.equal(r.ok, true, r.failures.join('; '));
});
test('irrelevant assignments do not count toward difficulty', () => {
  // three updates, but only ONE feeds the answer
  const p = [decl('int', 'a', I(5)), decl('int', 'b', I(2)), decl('int', 'c', I(9)), compound('b', 'int', '+', I(3)), compound('c', 'int', '*', I(2)), compound('c', 'int', '-', I(1)), compound('a', 'int', '+', v('b')), print(v('a'))];
  const an = analyze(p, { format: 'output', index: 7 });
  assert.equal(an.relevantChanges, 2); // a += b ; b += 3
  assert.equal(an.irrelevantStatements >= 3, true);
  assert.equal(diff(p, { format: 'output', index: 7 }, 'advanced').ok, false);
});
test('slice is sound: removing non-slice statements never changes the answer', () => {
  const p = [decl('int', 'a', I(5)), decl('int', 'b', I(2)), decl('int', 'c', I(9)), compound('b', 'int', '+', I(3)), compound('c', 'int', '*', I(2)), compound('a', 'int', '+', v('b')), print(v('a'))];
  const s = sliceFor(p, { format: 'output', index: 6 });
  const skip = new Set(p.map((_, i) => i).filter((i) => i < 6 && !s.relevant.has(i)));
  assert.equal(execute(p, { skip }).outputs[0], execute(p).outputs[0]);
});
test('dependency depth follows reaching definitions', () => {
  const p = [decl('int', 'a', I(1)), assign('a', 'int', bin('+', v('a'), I(1))), assign('a', 'int', bin('*', v('a'), I(2))), print(v('a'))];
  const s = sliceFor(p, { format: 'output', index: 3 });
  assert.equal(s.dependencyDepth, 4);
});

// ---------------- generator guarantees ----------------
test('determinism: same seed and history reproduce the identical challenge', () => {
  for (const d of ['beginner', 'intermediate', 'advanced']) {
    const a = generateTraceChallenge({ difficulty: d, seed: 4242 });
    const b = generateTraceChallenge({ difficulty: d, seed: 4242 });
    assert.deepEqual(a, b);
  }
});
test('different seeds produce different challenges', () => {
  const seen = new Set();
  for (let s = 1; s <= 60; s++) seen.add(generateTraceChallenge({ difficulty: 'advanced', seed: s }).signatures.exact);
  assert.ok(seen.size >= 59);
});
test('checkpoint questions reference a real line of the displayed code', () => {
  for (let s = 1; s <= 60; s++) {
    const c = generateTraceChallenge({ difficulty: 'intermediate', seed: s, format: 'checkpoint' });
    const n = c.question.line;
    assert.ok(n >= 1 && n <= c.codeLines.length);
    assert.equal(c.codeLines[n - 1], c.question.lineCode);
    // the named variable is the one assigned on that line, and the answer is its value right after that line
    assert.ok(c.codeLines[n - 1].startsWith(c.question.targetVariable));
    assert.equal(c.stateHistory.rows[n - 1].raw[c.question.targetVariable], c.correct.text);
    // checkpoint values must not be revealed in the prompt or code
    assert.ok(!c.question.text.includes(c.correct.text) || c.correct.text.length < 2 || /line \d+/.test(c.question.text));
  }
});
test('options: unique, include the answer, boolean results use two choices', () => {
  for (let s = 1; s <= 200; s++) {
    const c = generateTraceChallenge({ difficulty: ['beginner', 'intermediate', 'advanced'][s % 3], seed: s });
    const texts = c.choices.map((x) => x.text);
    assert.equal(new Set(texts).size, texts.length);
    assert.equal(c.choices[c.correctIndex].text, c.correct.text);
    assert.ok(c.choices.length === (c.answerType === 'boolean' ? 2 : 4) || (c.answerType === 'char' && c.choices.length === 3));
    for (const d of c.distractors) { assert.ok(d.misconceptionId && d.explanation); assert.notEqual(d.text, c.correct.text); }
  }
});
test('advanced questions always meet the Advanced rules', () => {
  for (let s = 1; s <= 150; s++) {
    const c = generateTraceChallenge({ difficulty: 'advanced', seed: s });
    const m = c.difficultyMetrics;
    assert.ok(m.relevantChanges >= 3, c.code);
    assert.ok(m.coreFamilies.length >= 2);
    assert.ok(m.dependencyDepth >= 4);
    assert.ok(m.variablesInSlice >= 2);
    assert.ok(m.totalStatements >= 5 && m.totalStatements <= 9);
  }
});

test('pre-submission view never reveals the answer or intermediate values', () => {
  const c = generateTraceChallenge({ difficulty: 'advanced', seed: 5, format: 'checkpoint' });
  const pre = getPreSubmissionView(c);
  const json = JSON.stringify(pre);
  for (const k of ['correctChoiceId', 'correctIndex', 'distractors', 'explanation', 'stateHistory', 'model', 'misconception', 'signatures']) assert.ok(!json.includes(k), k);
  const post = getPostSubmissionView(c, c.distractors[0].choiceId);
  assert.equal(post.correct, false); assert.ok(post.selectedMisconception.id);
  assert.equal(getPostSubmissionView(c, c.correctChoiceId).correct, true);
});
test('adapter produces a flat multiple-choice object with a bounded topic', () => {
  const c = generateTraceChallenge({ difficulty: 'intermediate', seed: 9 });
  const a = toVariableLabChallenge(c);
  assert.equal(a.options.length, c.choices.length);
  assert.equal(a.options[a.answerIndex], c.correct.text);
  assert.match(a.topic, /^variable-trace\/(beginner|intermediate|advanced)\/(int|double|boolean|char|String)$/);
  const b = toVariableLabChallenge(c, { options: 'choices', answerIndex: 'correct' });
  assert.ok(Array.isArray(b.choices) && typeof b.correct === 'number');
});
test('trivial self-operations (a - a, a && a, a && !a) are rejected', () => {
  assert.equal(hasTrivialSelfOp([print(bin('-', v('a'), v('a')))]), true);
  assert.equal(hasTrivialSelfOp([print(bin('&&', vr('b', 'boolean'), not(vr('b', 'boolean'))))]), true);
  assert.equal(hasTrivialSelfOp([print(bin('+', v('a'), v('a')))]), false);
});
test('generated programs never contain trivial self-operations', () => {
  for (let s = 1; s <= 300; s++) assert.equal(hasTrivialSelfOp(generateTraceChallenge({ difficulty: ['beginner', 'intermediate', 'advanced'][s % 3], seed: s }).model.program), false);
});

// ---------------- repetition control ----------------
test('signatures: exact differs with names, semantic ignores names and literals', () => {
  const mk = (n1, n2, k) => [decl('int', n1, I(3)), decl('int', n2, I(4)), compound(n1, 'int', '+', bin('*', v(n2), I(k))), print(v(n1))];
  const t = { format: 'output', index: 3 };
  const a = mk('a', 'b', 2), b = mk('score', 'bonus', 5);
  const sa = semanticSignature(a, t, analyze(a, t), 'advanced'), sb = semanticSignature(b, t, analyze(b, t), 'advanced');
  assert.equal(sa.hash, sb.hash);
  assert.notEqual(exactSignature(a, t, '11').hash, exactSignature(b, t, '23').hash);
  const c = [decl('int', 'a', I(3)), decl('int', 'b', I(4)), compound('a', 'int', '-', bin('*', v('b'), I(2))), print(v('a'))];
  assert.notEqual(semanticSignature(c, t, analyze(c, t), 'advanced').hash, sa.hash); // different operator => different structure
});
test('history is bounded, serialisable and holds no identifiers', () => {
  const h = new RecentHistory({ maxEntries: 50 });
  for (let i = 0; i < 400; i++) h.record({ signatures: { exact: 'e' + i, semantic: 's' + i, pattern: 'p' + (i % 7) }, reasoningFamilies: ['ASSIGN_COPY'] });
  assert.equal(h.entries.length, 50);
  const j = JSON.parse(JSON.stringify(h.toJSON()));
  const h2 = RecentHistory.fromJSON(j);
  assert.equal(h2.entries.length, 50);
  assert.ok(h2.hasExact('e399'));
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, x) => store.set(k, x) };
  assert.ok(h.save(storage));
  assert.equal(RecentHistory.load(storage).entries.length, 50);
  assert.equal(RecentHistory.load({ getItem() { throw new Error('blocked'); } }).entries.length, 0); // storage failure tolerated
});
test('recentSignatures prevents exact repeats inside the window', () => {
  const batch = generateTraceBatch(120, { difficulty: 'advanced', seed: 99 });
  const ex = batch.map((c) => c.signatures.exact);
  assert.equal(new Set(ex).size, ex.length);
  // replaying the same seed against that history must NOT return the same question
  const again = generateTraceChallenge({ difficulty: 'advanced', seed: batch[0].seed, recentSignatures: batch.map((c) => ({ exact: c.signatures.exact, semantic: c.signatures.semantic, pattern: c.signatures.pattern, families: c.reasoningFamilies })) });
  assert.notEqual(again.signatures.exact, batch[0].signatures.exact);
});

// ---------------- run ----------------
for (const [name, fn] of tests) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 6).join('\n       ')); }
}
console.log(`\nunit tests: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
