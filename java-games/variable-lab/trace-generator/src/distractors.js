// Misconception-based distractors. Every wrong answer is produced by EXECUTING the same
// program under an alternative (incorrect) reasoning model: either a flag on the interpreter
// (e.g. left-to-right precedence, linked copies) or a small, well-defined transformation of the
// program model (e.g. `*` read as `+`). There is no "answer +/- 1" fallback.

import { bin, assign, compound, print as mkPrint, mapExpr, renderStmt, varsIn, lit, vr, not as mkNot } from './model.js';
import { execute, formatValue } from './interp.js';

export const MISCONCEPTIONS = Object.freeze({
  OPERATOR_PRECEDENCE_IGNORED: { label: 'Ignored operator precedence', family: 'OPERATOR_PRECEDENCE', generic: false },
  MULT_AS_ADD: { label: 'Treated multiplication as addition', family: 'OPERATOR_PRECEDENCE', generic: false },
  OLD_VALUE_IGNORED: { label: 'Dropped the variable’s old value', family: 'SEQUENTIAL_UPDATE', generic: false },
  COMPOUND_AS_ASSIGN: { label: 'Read a compound assignment as plain assignment', family: 'COMPOUND_ASSIGNMENT', generic: false },
  COMPOUND_REVERSED: { label: 'Reversed the operands of a compound assignment', family: 'COMPOUND_ASSIGNMENT', generic: false },
  COMPOUND_PARTIAL_RHS: { label: 'Applied a compound assignment to only part of its right side', family: 'COMPOUND_ASSIGNMENT', generic: false },
  ASSIGN_AS_ADD: { label: 'Treated assignment as addition', family: 'REASSIGN_OVERWRITE', generic: false },
  INT_DIV_EXACT: { label: 'Kept the fractional part of integer division', family: 'INTEGER_DIVISION', generic: false },
  INT_DIV_ROUNDED: { label: 'Rounded integer division instead of truncating', family: 'INTEGER_DIVISION', generic: false },
  DIV_MOD_CONFUSION: { label: 'Confused division and remainder', family: 'REMAINDER', generic: false },
  LINKED_COPY: { label: 'Assumed copied variables stay linked', family: 'COPY_INDEPENDENCE', generic: false },
  ASSIGN_DIRECTION_REVERSED: { label: 'Copied in the wrong direction', family: 'ASSIGN_COPY', generic: false },
  PRINT_STORES_VALUE: { label: 'Assumed printing an expression stores it', family: 'PRINT_VS_STORED', generic: false },
  CONCAT_NUMBERS_AS_TEXT: { label: 'Joined numbers as text instead of adding them first', family: 'STRING_NUMBER_CONCAT', generic: false },
  CONCAT_NUMBERS_ADDED_FIRST: { label: 'Added numbers before joining text', family: 'STRING_NUMBER_CONCAT', generic: false },
  CONCAT_ORDER_REVERSED: { label: 'Joined Strings in the wrong order', family: 'STRING_CONCAT', generic: false },
  BOOLEAN_NEGATION_IGNORED: { label: 'Ignored a logical NOT', family: 'BOOLEAN_NEGATION', generic: false },
  AND_OR_CONFUSION: { label: 'Confused && and ||', family: 'BOOLEAN_COMBINATION', generic: false },
  RELATIONAL_BOUNDARY: { label: 'Misjudged a comparison boundary', family: 'BOOLEAN_COMBINATION', generic: false },
  DOUBLE_FORMAT_DROPPED: { label: 'Printed a double without its .0', family: 'DOUBLE_ARITHMETIC', generic: false },
  CHAR_AS_NUMBER: { label: 'Read a char as its numeric code', family: 'ASSIGN_COPY', generic: false },
  IGNORE_UPDATE: { label: 'Skipped one of the updates', family: null, generic: true },
  STALE_VALUE: { label: 'Used a variable’s old value', family: 'SEQUENTIAL_UPDATE', generic: true },
});

const ARITH_OPS = ['+', '-', '*', '/', '%'];
const replaceStmt = (prog, i, s) => prog.map((x, k) => (k === i ? s : x));
const mapStmtExpr = (s, fn) => ({ ...s, expr: mapExpr(s.expr, fn) });

function extract(exec, program, target, relaxed = true) {
  if (!exec.ok) return null;
  if (target.format === 'output') return exec.outputs.length ? exec.outputs[exec.outputs.length - 1] : null;
  const t = exec.types[target.varName];
  const raw = target.format === 'final' ? exec.final[target.varName] : exec.steps[target.index].after[target.varName];
  if (raw === undefined) return null;
  return formatValue(raw, t, relaxed);
}

function firstDivergence(program, correct, variant) {
  const n = Math.min(correct.steps.length, variant.steps.length);
  for (let i = 0; i < n; i++) {
    const a = correct.steps[i], b = variant.steps[i];
    if (a.output !== b.output && a.output !== undefined && a.output !== null) return { index: i, kind: 'output', correct: a.output, wrong: b.output };
    for (const nm of Object.keys(a.after)) {
      if (!(nm in b.after)) continue;
      if (a.after[nm] !== b.after[nm]) {
        const t = correct.types[nm];
        return { index: i, kind: 'var', name: nm, correct: formatValue(a.after[nm], t), wrong: formatValue(b.after[nm], t, true) };
      }
    }
  }
  return null;
}

// ---- variant factory ---------------------------------------------------------
function* variants(program, target, analysis) {
  const rel = analysis.relevantLines.map((l) => l - 1);
  const stmtsRel = rel.filter((i) => program[i].k !== 'decl');
  const mutable = (i) => ['assign', 'compound', 'incdec'].includes(program[i].k);

  yield { id: 'OPERATOR_PRECEDENCE_IGNORED', opts: { precedence: 'ltr' } };
  yield { id: 'INT_DIV_EXACT', opts: { intDiv: 'exact' } };
  yield { id: 'INT_DIV_ROUNDED', opts: { intDiv: 'round' } };
  yield { id: 'LINKED_COPY', opts: { alias: true } };
  yield { id: 'CONCAT_NUMBERS_AS_TEXT', opts: { plusMode: 'concatAll' } };
  yield { id: 'CONCAT_NUMBERS_ADDED_FIRST', opts: { plusMode: 'numbersFirst' } };

  for (const i of stmtsRel) {
    const s = program[i];
    if (mutable(i)) yield { id: 'IGNORE_UPDATE', opts: { skip: new Set([i]) }, at: i };
    // stale reads
    const reads = new Set(s.k === 'incdec' ? [s.name] : [...(s.expr ? varsIn(s.expr) : []), ...(s.k === 'compound' ? [s.name] : [])]);
    for (const name of reads) yield { id: 'STALE_VALUE', opts: { stale: { stmt: i, name } }, at: i, name };
  }
  if (target.format === 'output') {
    const pi = target.index;
    for (const name of new Set(varsIn(program[pi].expr))) yield { id: 'STALE_VALUE', opts: { stale: { stmt: pi, name } }, at: pi, name };
  }

  for (const i of stmtsRel) {
    const s = program[i];
    if (s.k === 'compound') {
      yield { id: 'COMPOUND_AS_ASSIGN', prog: replaceStmt(program, i, assign(s.name, s.t, s.expr)), at: i };
      if (['-', '/', '%'].includes(s.op) && s.t !== 'String')
        yield { id: 'COMPOUND_REVERSED', prog: replaceStmt(program, i, assign(s.name, s.t, bin(s.op, s.expr, vr(s.name, s.t)))), at: i };
      if (s.op === '*' || s.op === '/') yield { id: 'MULT_AS_ADD', prog: replaceStmt(program, i, compound(s.name, s.t, s.op === '*' ? '+' : '-', s.expr)), at: i, onlyMult: s.op === '*' };
      if (s.op === '/' && s.t === 'int') yield { id: 'DIV_MOD_CONFUSION', prog: replaceStmt(program, i, compound(s.name, s.t, '%', s.expr)), at: i };
      if (s.op === '%') yield { id: 'DIV_MOD_CONFUSION', prog: replaceStmt(program, i, compound(s.name, s.t, '/', s.expr)), at: i };
      if (s.expr.k === 'bin' && ARITH_OPS.includes(s.expr.op) && ['int', 'double'].includes(s.t) && s.op !== '%') {
        const e = s.expr;
        yield { id: 'COMPOUND_PARTIAL_RHS', prog: replaceStmt(program, i, assign(s.name, s.t, bin(e.op, bin(s.op, vr(s.name, s.t), e.l), e.r))), at: i };
      }
    }
    if (s.k === 'assign') {
      const selfRef = s.expr.k === 'bin' && s.expr.l.k === 'var' && s.expr.l.name === s.name;
      if (selfRef) yield { id: 'OLD_VALUE_IGNORED', prog: replaceStmt(program, i, assign(s.name, s.t, s.expr.r)), at: i };
      if (!varsIn(s.expr).includes(s.name) && ['int', 'double', 'String'].includes(s.t)) {
        yield { id: 'ASSIGN_AS_ADD', prog: replaceStmt(program, i, compound(s.name, s.t, '+', s.expr)), at: i };
      }
      if (s.expr.k === 'var' && s.expr.name !== s.name) yield { id: 'ASSIGN_DIRECTION_REVERSED', prog: replaceStmt(program, i, assign(s.expr.name, s.t, vr(s.name, s.t))), at: i };
    }
    if (s.expr) {
      const has = (pred) => { let f = false; mapExpr(s.expr, (n) => { if (pred(n)) f = true; return n; }); return f; };
      if (has((n) => n.k === 'bin' && n.op === '*')) yield { id: 'MULT_AS_ADD', prog: replaceStmt(program, i, mapStmtExpr(s, (n) => (n.k === 'bin' && n.op === '*' ? { ...n, op: '+' } : n))), at: i };
      if (has((n) => n.k === 'bin' && (n.op === '/' || n.op === '%') && n.t === 'int')) yield { id: 'DIV_MOD_CONFUSION', prog: replaceStmt(program, i, mapStmtExpr(s, (n) => (n.k === 'bin' && n.t === 'int' && n.op === '/' ? { ...n, op: '%' } : n.k === 'bin' && n.t === 'int' && n.op === '%' ? { ...n, op: '/' } : n))), at: i };
      if (has((n) => n.k === 'bin' && n.op === '+' && n.t === 'String')) yield { id: 'CONCAT_ORDER_REVERSED', prog: replaceStmt(program, i, mapStmtExpr(s, (n) => (n.k === 'bin' && n.op === '+' && n.t === 'String' ? { ...n, l: n.r, r: n.l } : n))), at: i };
      if (has((n) => n.k === 'not')) yield { id: 'BOOLEAN_NEGATION_IGNORED', prog: replaceStmt(program, i, mapStmtExpr(s, (n) => (n.k === 'not' ? n.e : n))), at: i };
      if (has((n) => n.k === 'bin' && (n.op === '&&' || n.op === '||'))) yield { id: 'AND_OR_CONFUSION', prog: replaceStmt(program, i, mapStmtExpr(s, (n) => (n.k === 'bin' && n.op === '&&' ? { ...n, op: '||' } : n.k === 'bin' && n.op === '||' ? { ...n, op: '&&' } : n))), at: i };
      const bmap = { '>': '>=', '<': '<=', '>=': '>', '<=': '<' };
      if (has((n) => n.k === 'bin' && bmap[n.op])) yield { id: 'RELATIONAL_BOUNDARY', prog: replaceStmt(program, i, mapStmtExpr(s, (n) => (n.k === 'bin' && bmap[n.op] ? { ...n, op: bmap[n.op] } : n))), at: i };
    }
  }
  // the print used as the output sink may also hold the key operations
  if (target.format === 'output') {
    const pi = target.index, s = program[pi];
    const mk = (id, fn, pred) => { let f = false; mapExpr(s.expr, (n) => { if (pred(n)) f = true; return n; }); if (f) return { id, prog: replaceStmt(program, pi, mkPrint(mapExpr(s.expr, fn))), at: pi }; return null; };
    const list = [
      mk('MULT_AS_ADD', (n) => (n.k === 'bin' && n.op === '*' ? { ...n, op: '+' } : n), (n) => n.k === 'bin' && n.op === '*'),
      mk('DIV_MOD_CONFUSION', (n) => (n.k === 'bin' && n.t === 'int' && n.op === '/' ? { ...n, op: '%' } : n.k === 'bin' && n.t === 'int' && n.op === '%' ? { ...n, op: '/' } : n), (n) => n.k === 'bin' && n.t === 'int' && (n.op === '/' || n.op === '%')),
      mk('CONCAT_ORDER_REVERSED', (n) => (n.k === 'bin' && n.op === '+' && n.t === 'String' ? { ...n, l: n.r, r: n.l } : n), (n) => n.k === 'bin' && n.op === '+' && n.t === 'String'),
      mk('BOOLEAN_NEGATION_IGNORED', (n) => (n.k === 'not' ? n.e : n), (n) => n.k === 'not'),
      mk('AND_OR_CONFUSION', (n) => (n.k === 'bin' && n.op === '&&' ? { ...n, op: '||' } : n.k === 'bin' && n.op === '||' ? { ...n, op: '&&' } : n), (n) => n.k === 'bin' && (n.op === '&&' || n.op === '||')),
    ].filter(Boolean);
    yield* list;
  }
  // printing without storing: pretend each non-sink print stores its value
  for (let i = 0; i < program.length; i++) {
    const s = program[i];
    if (s.k !== 'print' || (target.format === 'output' && i === target.index)) continue;
    const e = s.expr;
    const v = e.k === 'bin' && e.l.k === 'var' ? e.l : e.k === 'not' && e.e.k === 'var' ? e.e : null;
    if (v && v.t === e.t) yield { id: 'PRINT_STORES_VALUE', prog: replaceStmt(program, i, assign(v.name, v.t, e)), at: i };
  }
}

const describe = {
  OPERATOR_PRECEDENCE_IGNORED: (d) => `Working strictly left to right and ignoring operator precedence gives this answer${d}. Java evaluates *, / and % before + and -.`,
  MULT_AS_ADD: (d) => `Treating a multiplication as an addition gives this answer${d}.`,
  OLD_VALUE_IGNORED: (d) => `Forgetting to include the variable’s old value in its update gives this answer${d}.`,
  COMPOUND_AS_ASSIGN: (d) => `Reading a compound assignment such as += as a plain = gives this answer${d}. Compound assignment uses the variable’s current value.`,
  COMPOUND_REVERSED: (d) => `Reversing the operands of a compound assignment (for example reading x -= e as e - x) gives this answer${d}.`,
  COMPOUND_PARTIAL_RHS: (d) => `Applying a compound assignment to only the first part of its right side gives this answer${d}. The whole right side is evaluated first.`,
  ASSIGN_AS_ADD: (d) => `Treating = as “add to” instead of “replace with” gives this answer${d}.`,
  INT_DIV_EXACT: (d) => `Keeping the fractional part of an int division gives this answer${d}. int / int discards the fraction.`,
  INT_DIV_ROUNDED: (d) => `Rounding an int division gives this answer${d}. Java truncates toward zero instead.`,
  DIV_MOD_CONFUSION: (d) => `Swapping / (quotient) and % (remainder) gives this answer${d}.`,
  LINKED_COPY: (d) => `Assuming a copied variable stays linked to the original gives this answer${d}. Assignment copies the value at that moment.`,
  ASSIGN_DIRECTION_REVERSED: (d) => `Copying in the wrong direction (right-hand variable receiving the left one) gives this answer${d}. In a = b, the value of b is copied into a.`,
  PRINT_STORES_VALUE: (d) => `Assuming println stores the printed expression back into the variable gives this answer${d}. Printing does not change a variable.`,
  CONCAT_NUMBERS_AS_TEXT: (d) => `Joining numbers as text instead of adding them first gives this answer${d}. + is evaluated left to right, so two numbers before a String are added.`,
  CONCAT_NUMBERS_ADDED_FIRST: (d) => `Adding the numbers together before joining gives this answer${d}. After a String appears, each number is joined as text one at a time.`,
  CONCAT_ORDER_REVERSED: (d) => `Joining the Strings in the opposite order gives this answer${d}.`,
  BOOLEAN_NEGATION_IGNORED: (d) => `Ignoring a ! gives this answer${d}. ! flips true and false.`,
  AND_OR_CONFUSION: (d) => `Swapping && and || gives this answer${d}. && needs both sides true; || needs at least one.`,
  RELATIONAL_BOUNDARY: (d) => `Treating a comparison as if it included (or excluded) equality gives this answer${d}.`,
  DOUBLE_FORMAT_DROPPED: () => 'A double prints with a decimal point, so a whole-number result prints like 7.0, not 7.',
  CHAR_AS_NUMBER: () => 'A char prints as the character, not its numeric code.',
  IGNORE_UPDATE: (d) => `Skipping one of the updates gives this answer${d}. Every statement runs, in order.`,
  STALE_VALUE: (d) => `Using a variable’s old value instead of its latest value gives this answer${d}.`,
};

export function collectCandidates(program, target, analysis, correct, correctText) {
  const out = [];
  const seen = new Set();
  const add = (id, text, extra) => {
    if (text === null || text === undefined) return;
    if (text === correctText || text.length > 24) return;
    if (/NaN|Infinity/.test(text)) return;
    const key = id + '|' + text + '|' + (extra.at ?? '') + (extra.name ?? '');
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ id, text, ...extra });
  };
  const BIG = { maxInt: 1e6, maxDouble: 1e7, relaxed: true };
  for (const v of variants(program, target, analysis)) {
    const prog = v.prog || program;
    const exec = execute(prog, { ...BIG, ...(v.opts || {}) });
    const text = extract(exec, prog, target);
    if (text === null) continue;
    // numeric answers must still look like sensible values
    const div = exec.ok ? firstDivergence(program, correct, exec) : null;
    let det = '';
    if (div) {
      det = div.kind === 'var'
        ? ` (at line ${div.index + 1}, \`${renderStmt(program[div.index])}\`, ${div.name} would be ${div.wrong} instead of ${div.correct})`
        : ` (the printed value would be ${div.wrong} instead of ${div.correct})`;
    }
    add(v.id, text, { at: v.at, name: v.name, rationale: describe[v.id](det), divergence: div });
  }
  // formatting / representation misconceptions on the final answer
  const t = target.format === 'output' ? program[target.index].expr.t : correct.types[target.varName];
  if (t === 'double' && /\.0$/.test(correctText)) add('DOUBLE_FORMAT_DROPPED', correctText.replace(/\.0$/, ''), { rationale: describe.DOUBLE_FORMAT_DROPPED(), divergence: null });
  if (t === 'char' && correctText.length === 1) add('CHAR_AS_NUMBER', String(correctText.charCodeAt(0)), { rationale: describe.CHAR_AS_NUMBER(), divergence: null });
  return out;
}

// Choose distractors: diverse misconceptions first, prefer ones tied to the program's reasoning families.
export function selectDistractors(rng, candidates, { want = 3, min = want, families = [] } = {}) {
  const chosen = [];
  const usedText = new Set();
  const perId = {};
  const weight = (c) => {
    const m = MISCONCEPTIONS[c.id];
    let w = m.generic ? 0.8 : 1.5;
    if (m.family && families.includes(m.family)) w *= 2.5;
    return w;
  };
  for (const cap of [1, 2]) {
    let pool = candidates.filter((c) => !usedText.has(c.text) && (perId[c.id] || 0) < cap);
    while (chosen.length < want && pool.length) {
      const pick = rng.weighted(pool, weight);
      chosen.push(pick);
      usedText.add(pick.text);
      perId[pick.id] = (perId[pick.id] || 0) + 1;
      pool = candidates.filter((c) => !usedText.has(c.text) && (perId[c.id] || 0) < cap);
    }
  }
  return chosen.length >= min ? chosen : null;
}

export function generateDistractors(rng, program, target, correct, answer, analysis) {
  const cands = collectCandidates(program, target, analysis, correct, answer.text);
  const want = answer.type === 'boolean' ? 1 : 3;
  // char answers have few genuine misconception models: a 3-option question is acceptable there
  const min = answer.type === 'char' ? 2 : want;
  const picked = selectDistractors(rng, cands, { want, min, families: analysis.families });
  if (!picked) return null;
  return picked.map((c) => ({
    text: c.text,
    misconceptionId: c.id,
    label: MISCONCEPTIONS[c.id].label,
    explanation: c.rationale,
    line: c.divergence ? c.divergence.index + 1 : null,
  }));
}
