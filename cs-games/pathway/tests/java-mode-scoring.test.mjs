// Scoring validation for the eleven modes that gained node credit in Phase 2. Evidence is only as good as the scoring behind it, so for each
// mode this suite re-derives the right answer independently of the engine's own key where a simple oracle exists, and checks that the engine
// accepts that answer and rejects plausible wrong ones. The Inheritance and Documentation labs' own javac/javadoc-backed suites are run
// separately (their logs ship in the package); this file adds checks that need no JDK.
import test from 'node:test';
import assert from 'node:assert/strict';
import { E, LAB_ADAPTERS } from './lib/lab-flow.mjs';

const draw = (lab, mode, n) => Array.from({ length: n }, (_, i) => LAB_ADAPTERS[lab].focused(mode, i));
const chainValues = (ch, head, next) => { const out = [], seen = new Set(); let id = head; while (id && !seen.has(id)) { seen.add(id); const n = ch.nodes.find(x => x.id === id); if (!n) return null; out.push(n.value); id = next[id] ?? null; } return id ? null : out; };
const refsFor = (ch, values) => { const idOf = v => ch.nodes.find(n => n.value === v)?.id; const next = Object.fromEntries(ch.nodes.map(n => [n.id, null])); values.forEach((v, i) => { next[idOf(v)] = i + 1 < values.length ? idOf(values[i + 1]) : null; }); return { head: idOf(values[0]) ?? null, next }; };

test('LinkedList link: the engine key builds exactly the chain the prompt asks for, and the starting references do not already satisfy it', () => {
  for (const ch of draw('linkedlist-lab', 'link', 300)) {
    const target = ch.prompt.match(/reads ([\d → ]+) → null/)[1].split(' → ').map(Number);
    assert.deepEqual(chainValues(ch, ch.answer.head, ch.answer.next), target, 'answer key equals the prompt');
    assert.equal(E.LL.assess(ch, { head: ch.answer.head, next: ch.answer.next }), true);
    assert.equal(E.LL.assess(ch, { head: ch.head, next: ch.next }), false, 'the unconnected starting state is not already correct');
    assert.equal(E.LL.assess(ch, refsFor(ch, [...target].reverse())), false, 'a reversed chain is rejected');
    assert.equal(E.LL.assess(ch, { head: null, next: ch.answer.next }), false, 'a missing head is rejected');
  }
});

test('LinkedList link: no draw starts already solved (the page pre-fills the starting references, so that would be a free correct answer)', () => {
  let solved = 0;
  for (const ch of draw('linkedlist-lab', 'link', 4000)) if (E.LL.assess(ch, { head: ch.head, next: ch.next })) solved++;
  assert.equal(solved, 0);
});

test('LinkedList mutate: an independent list model of each operation matches the engine key; other operations are rejected', () => {
  const OPS = { 'insert-head': (a, x) => [x, ...a], 'insert-middle': (a, x) => { const i = Math.max(1, Math.floor(a.length / 2)); return [...a.slice(0, i), x, ...a.slice(i)]; }, append: (a, x) => [...a, x], 'remove-head': a => a.slice(1), 'remove-middle': a => a.slice(0, Math.floor(a.length / 2)).concat(a.slice(Math.floor(a.length / 2) + 1)), 'remove-tail': a => a.slice(0, -1) };
  const seen = new Set();
  for (const ch of draw('linkedlist-lab', 'mutate', 600)) {
    const op = ch.family, x = Number((ch.operation.match(/\d+/) || [])[0]); seen.add(op);
    assert.ok(OPS[op], `known operation ${op}`);
    const model = OPS[op](ch.initial, x);
    assert.deepEqual(chainValues(ch, ch.answer.head, ch.answer.next), model, `${op} on ${ch.initial}`);
    assert.equal(E.LL.assess(ch, { head: ch.answer.head, next: ch.answer.next }), true);
    assert.equal(E.LL.assess(ch, { head: ch.head, next: ch.next }), false, 'doing nothing is not a correct update');
    for (const [other, fn] of Object.entries(OPS)) { if (other === op) continue; const alt = fn(ch.initial, x); if (JSON.stringify(alt) === JSON.stringify(model) || alt.some(v => !ch.nodes.some(n => n.value === v))) continue; assert.equal(E.LL.assess(ch, refsFor(ch, alt)), false, `${other} must not be accepted for ${op}`); }
  }
  assert.deepEqual([...seen].sort(), Object.keys(OPS).sort(), 'all six operations are drawn');
});

test('Method & Constructor order-args: only the right order scores; the decoy token and every other permutation are rejected; the call is argument matching', () => {
  const permutations = a => a.length <= 1 ? [a] : a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
  let withDecoy = 0;
  for (const ch of draw('method-constructor-lab', 'order-args', 200)) {
    assert.equal(ch.mode, 'order-args'); assert.ok(E.MC.validateChallenge(ch).ok);
    assert.equal(E.MC.assess(ch, ch.answerOrder), true);
    const text = id => ch.tokens.find(t => t.id === id).text;
    for (const p of permutations(ch.answerOrder)) assert.equal(E.MC.assess(ch, p), p.every((id, i) => text(id) === text(ch.answerOrder[i])), 'only the answer order scores');
    if (ch.decoy) { withDecoy++; assert.equal(E.MC.assess(ch, [ch.decoy.id, ...ch.answerOrder.slice(1)]), false, 'the token that does not belong is rejected'); }
    assert.ok(/^[a-zA-Z]+\(.*\);$/.test(E.MC.orderedCall(ch, ch.answerOrder)), 'the ordered answer is a call to the method');
  }
  assert.ok(withDecoy > 0, 'decoy variants are exercised');
});

test('Inheritance: every mode accepts the engine answer and rejects a perturbed one (the lab JVM suite separately checks keys against javac/java)', (t) => {
  const kinds = {};
  for (const mode of ['hierarchy', 'override', 'tracer', 'abstract', 'debug']) for (const ch of draw('inheritance-polymorphism-lab', mode, 400)) {
    const right = E.IP.answerFor(ch); assert.equal(E.IP.assess(ch, right).correct, true, `${mode}/${ch.family}/${ch.kind} key accepted`);
    let wrong; const k = ch.kind;
    if (k === 'choice' || k === 'box') wrong = (right + 1) % (ch.options?.length || ch.classes?.length || 2);
    else if (k === 'multi') wrong = [];
    else if (k === 'connect') { const c = ch.classes.find(c => ch.answer[c] !== null); wrong = { ...right, [c]: null }; }
    else if (k === 'rows') wrong = right.map((v, i) => i === 0 ? !v : v);
    else if (k === 'sequence') wrong = { ...right, order: right.order.slice().reverse() };
    else if (k === 'trace') wrong = { ...right, compiler: (right.compiler + 1) % ch.compilerOptions.length };
    else if (k === 'debug') wrong = { ...right, line: -1 };
    if (wrong !== undefined && !(k === 'sequence' && JSON.stringify(right.order) === JSON.stringify(wrong.order)) && !(k === 'multi' && right.length === 0)) {
      if (!(k === 'choice' && typeof wrong === 'number' && wrong === right)) assert.equal(E.IP.assess(ch, wrong).correct, false, `${mode}/${ch.family}/${k} perturbed answer must fail`);
    }
    kinds[k] = (kinds[k] || 0) + 1;
    if (mode === 'debug' && ch.kind === 'debug') { assert.ok(ch.fixes.some(f => f.ok), 'a debug question has at least one valid fix'); assert.ok(ch.badLines.length >= 1); assert.equal(E.IP.assess(ch, { ...right, fix: ch.fixes.findIndex(f => !f.ok) }).correct, ch.fixes.every(f => f.ok), 'a wrong fix fails the question'); }
  }
  t.diagnostic('Inheritance challenge kinds checked: ' + JSON.stringify(kinds));
});

test('Documentation editor and builder: the key is accepted, every single-slot or single-field change is rejected', () => {
  let slotsChecked = 0, repairsChecked = 0;
  for (const mode of ['editor', 'builder']) for (const ch of draw('documentation-lab', mode, 300)) {
    const right = E.DOC.answerFor(ch); assert.equal(E.DOC.assess(ch, right).correct, true, `${mode}/${ch.family} key`);
    if (mode === 'editor') {
      assert.equal(ch.kind, 'repair'); assert.ok(ch.fixes.filter(f => f.ok).length === 1, 'exactly one accepted repair');
      assert.equal(E.DOC.assess(ch, { line: right.line, fix: ch.fixes.findIndex((f, i) => i !== right.fix) }).correct, false, 'a different repair fails');
      const otherLine = (ch.selectable || []).find(l => l !== right.line); if (otherLine !== undefined) assert.equal(E.DOC.assess(ch, { line: otherLine, fix: right.fix }).correct, false, 'the wrong comment line fails');
      repairsChecked++;
    } else {
      assert.equal(ch.kind, 'build');
      ch.slots.forEach((s, i) => { const alt = s.options.findIndex((o, j) => j !== s.answer); assert.ok(alt >= 0); const r = right.slice(); r[i] = alt; assert.equal(E.DOC.assess(ch, r).correct, false, `${ch.family} slot ${i} changed`); slotsChecked++; });
    }
  }
  assert.ok(slotsChecked > 100 && repairsChecked > 100);
});

test('Robot build: the reference program passes, the empty program and each single-statement truncation do not meet the requirement unless the simulator says so', () => {
  let truncated = 0;
  for (const ch of draw('robot-algorithms', 'build', 200)) {
    assert.equal(E.RB.validateChallenge(ch).ok, true);
    assert.equal(E.RB.evaluateBuild(ch, ch.reference).pass, true, 'reference passes');
    assert.equal(E.RB.evaluateBuild(ch, '').pass, false, 'empty program fails');
    const lines = ch.reference.split('\n').filter(l => l.trim().startsWith('robot.'));
    if (lines.length >= 2 && !ch.reference.includes('for') && !ch.reference.includes('while')) { const cut = ch.reference.split('\n').filter((l, i, a) => i !== a.findIndex(x => x.trim().startsWith('robot.'))).join('\n'); const r = E.RB.evaluateBuild(ch, cut), run = E.RB.runSource(cut, ch.world); if (!r.pass) { assert.ok(!E.RB.meetsRequirement(run, ch.world, ch.req) || r.reason, 'a rejected program explains why'); truncated++; } }
  }
  assert.ok(truncated > 20, 'truncated programs are rejected for straight-line routes');
});

test('Robot debug: the keyed fix meets the requirement in the simulator; every other option still fails it', () => {
  const families = new Set();
  for (const ch of draw('robot-algorithms', 'debug', 300)) {
    assert.equal(E.RB.validateChallenge(ch).ok, true); families.add(ch.family);
    assert.equal(ch.choices.filter(c => c.correct).length, 1);
    assert.equal(ch.choices[ch.answer].correct, true);
    const meets = c => { const run = E.RB.runSource(c.lines.join('\n'), ch.world); return !run.error && E.RB.meetsRequirement(run, ch.world, ch.req); };
    assert.equal(meets(ch.choices[ch.answer]), true, 'the keyed change fixes the program');
    for (const [i, c] of ch.choices.entries()) if (i !== ch.answer) assert.equal(meets(c), false, 'a distractor must not meet the requirement');
    assert.equal(E.RB.meetsRequirement(E.RB.runSource(ch.code, ch.world), ch.world, ch.req) && !E.RB.runSource(ch.code, ch.world).error, false, 'the buggy program really fails');
  }
  assert.deepEqual([...families].sort(), ['debug:bound', 'debug:condition', 'debug:missing', 'debug:order', 'debug:turn']);
});
