// Java-semantics interpreter over the typed model. No eval(), no source parsing.
// The same engine runs (a) the faithful Java semantics and (b) deliberately
// "wrong" reasoning models (via opts) that produce misconception distractors.

import { ARITH, PREC, binType, hasParens, needsParens, renderExpr, renderStmt, varsIn, isNumeric } from './model.js';

export class JavaRuntimeError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const INT_MIN = -2147483648, INT_MAX = 2147483647;
const norm0 = (v) => (v === 0 ? 0 : v); // -0 -> 0 for ints

export function formatValue(v, t, relaxed = false) {
  switch (t) {
    case 'int':
      if (Number.isInteger(v)) return String(norm0(v));
      return String(Math.round(v * 1000) / 1000);
    case 'double': {
      if (relaxed) { const r = Math.round(v * 1000) / 1000; return Number.isInteger(r) ? r.toFixed(1) : String(r); }
      if (Number.isInteger(v)) return (Object.is(v, -0) ? '-0' : String(v)) + '.0';
      return String(v);
    }
    case 'boolean': return v ? 'true' : 'false';
    default: return String(v);
  }
}
// How a value is shown inside an explanation sentence (strings/chars quoted).
export function displayValue(v, t) {
  if (t === 'String') return `"${v}"`;
  if (t === 'char') return `'${v}'`;
  return formatValue(v, t);
}

const toText = (v, t) => formatValue(v, t);

export function applyOp(op, a, b, lt, rt, o) {
  const rtype = binType(op, { t: lt }, { t: rt });
  if (op === '+' && rtype === 'String') return toText(a, lt) + toText(b, rt);
  if (ARITH.includes(op)) {
    if (rtype === 'int') {
      let r;
      switch (op) {
        case '+': r = a + b; break;
        case '-': r = a - b; break;
        case '*': r = a * b; break;
        case '/':
          if (b === 0) throw new JavaRuntimeError('div0', 'Division by zero');
          r = o.intDiv === 'exact' ? a / b : o.intDiv === 'round' ? Math.round(a / b) : Math.trunc(a / b);
          break;
        case '%':
          if (b === 0) throw new JavaRuntimeError('div0', 'Remainder by zero');
          r = a % b; break;
      }
      r = norm0(r);
      if (r > INT_MAX || r < INT_MIN) throw new JavaRuntimeError('overflow', 'int overflow');
      if (o.maxInt && Math.abs(r) > o.maxInt) throw new JavaRuntimeError('bounds', 'int magnitude out of range');
      return r;
    }
    let r;
    switch (op) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/': if (b === 0) throw new JavaRuntimeError('div0', 'Division by zero'); r = a / b; break;
      case '%': if (b === 0) throw new JavaRuntimeError('div0', 'Remainder by zero'); r = a % b; break;
    }
    if (!Number.isFinite(r) || Math.abs(r) > (o.maxDouble || 100000)) throw new JavaRuntimeError('bounds', 'double out of range');
    return r;
  }
  switch (op) {
    case '<': return a < b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '>=': return a >= b;
    case '==': return a === b;
    case '!=': return a !== b;
    default: throw new JavaRuntimeError('badop', 'bad operator ' + op);
  }
}

export function execute(program, opts = {}) {
  const o = {
    precedence: 'java', intDiv: 'trunc', alias: false, stale: null, plusMode: 'java',
    skip: null, maxInt: 10000, maxDouble: 100000, relaxed: false, trace: false, ...opts,
  };
  const env = new Map();
  const order = [];
  const types = {};
  const steps = [];
  const outputs = [];
  let ctx = null;

  const read = (name, i) => {
    const box = env.get(name);
    if (!box) throw new JavaRuntimeError('uninit', `Variable ${name} not initialized`);
    if (o.stale && o.stale.stmt === i && o.stale.name === name && box.hist.length >= 2) return box.hist[box.hist.length - 2];
    return box.v;
  };
  const leafText = (n) => displayValue(read(n.name, ctx.i), n.t);
  const sub = (n) => renderExpr(n, { leaf: leafText }, true);
  const note = (id, text) => { if (o.trace) ctx.cur.notes.push({ id, text }); };

  function flattenArith(node, out) {
    const side = (c, s) => {
      if (c.k === 'bin' && ARITH.includes(c.op) && !hasParens(node.op, c, s)) flattenArith(c, out);
      else out.operands.push(c);
    };
    side(node.l, 'l'); out.ops.push(node.op); side(node.r, 'r');
    return out;
  }
  function flattenPlus(node, out) {
    const side = (c, s) => {
      if (c.k === 'bin' && c.op === '+' && !hasParens('+', c, s)) flattenPlus(c, out);
      else out.operands.push(c);
    };
    side(node.l, 'l'); side(node.r, 'r');
    return out;
  }

  function ev(n) {
    switch (n.k) {
      case 'lit': return n.v;
      case 'var': return read(n.name, ctx.i);
      case 'not': {
        const v = ev(n.e);
        const r = !v;
        if (o.trace) ctx.cur.ops.push({ kind: 'not', op: '!', text: `!${n.e.k === 'bin' ? '(' + sub(n.e) + ')' : sub(n.e)}`, result: r, type: 'boolean', resultText: formatValue(r, 'boolean'), resultDisplay: formatValue(r, 'boolean'), reduced: `!${formatValue(v, 'boolean')}`, notes: [] });
        return r;
      }
      case 'bin': return evBin(n);
      default: throw new Error('bad node');
    }
  }

  function evBin(n) {
    // --- misconception reasoning modes that re-group the expression ---
    if (o.precedence === 'ltr' && ARITH.includes(n.op)) {
      const f = flattenArith(n, { operands: [], ops: [] });
      if (f.ops.length > 1) {
        const vals = f.operands.map((x) => ({ v: ev(x), t: x.t }));
        let acc = vals[0];
        for (let k = 0; k < f.ops.length; k++) {
          const rt = vals[k + 1];
          acc = { v: applyOp(f.ops[k], acc.v, rt.v, acc.t, rt.t, o), t: binType(f.ops[k], { t: acc.t }, { t: rt.t }) };
        }
        return acc.v;
      }
    }
    if (o.plusMode !== 'java' && n.op === '+' && n.t === 'String') {
      const f = flattenPlus(n, { operands: [], ops: [] });
      const vals = f.operands.map((x) => ({ v: ev(x), t: x.t }));
      if (o.plusMode === 'concatAll') return vals.map((x) => toText(x.v, x.t)).join('');
      // numbersFirst: consecutive numeric operands are summed before joining
      let out = '', run = null;
      for (const x of vals) {
        if (isNumeric(x.t)) { run = run === null ? { v: x.v, t: x.t } : { v: run.v + x.v, t: run.t === 'double' || x.t === 'double' ? 'double' : 'int' }; }
        else { if (run) { out += toText(run.v, run.t); run = null; } out += toText(x.v, x.t); }
      }
      if (run) out += toText(run.v, run.t);
      return out;
    }

    // --- faithful Java ---
    if (n.op === '&&' || n.op === '||') {
      const l = ev(n.l);
      if (n.op === '&&' && !l) { traceBin(n, l, undefined, false, true); return false; }
      if (n.op === '||' && l) { traceBin(n, l, undefined, true, true); return true; }
      const r = ev(n.r);
      traceBin(n, l, r, r, false);
      return r;
    }
    const l = ev(n.l), r = ev(n.r);
    const res = applyOp(n.op, l, r, n.l.t, n.r.t, o);
    traceBin(n, l, r, res, false);
    return res;
  }

  function traceBin(n, l, r, res, short) {
    if (!o.trace) return;
    const c = ctx.cur;
    const text = sub(n);
    const op = {
      kind: 'bin', op: n.op, text, result: res, type: n.t, resultText: formatValue(res, n.t), resultDisplay: displayValue(res, n.t),
      reduced: `${displayValue(l, n.l.t)} ${n.op} ${r === undefined ? '\u2026' : displayValue(r, n.r.t)}`, notes: [],
    };
    const nts = op.notes;
    // precedence / grouping notes (structural, from the tree that actually ran)
    const inlineHigher = [n.l, n.r].some((c2, idx) => c2.k === 'bin' && !hasParens(n.op, c2, idx ? 'r' : 'l') && PREC[c2.op] > PREC[n.op]);
    if (inlineHigher) nts.push({ id: 'precedence', text: precedenceNote(n.op) });
    if ([n.l, n.r].some((c2, idx) => c2.k === 'bin' && needsParens(n.op, c2, idx ? 'r' : 'l') && PREC[c2.op] < PREC[n.op])) nts.push({ id: 'parens', text: 'Parentheses are evaluated first.' });
    if (n.op === '/' && n.t === 'int' && !short) {
      if (l % r !== 0) nts.push({ id: 'int-division', text: `Integer division drops the fractional part (truncates toward zero): ${l} / ${r} gives ${res}.` });
    }
    if (n.op === '%' && n.t === 'int') nts.push({ id: 'remainder', text: `% gives the remainder of ${l} divided by ${r}${l < 0 ? ' (the sign follows the left operand)' : ''}: ${res}.` });
    if (ARITH.includes(n.op) && n.t === 'double' && ((n.l.t === 'int') !== (n.r.t === 'int'))) nts.push({ id: 'promotion', text: 'The int operand is promoted to a double, so the result is a double.' });
    if (n.op === '/' && n.t === 'int' && o.trace) { /* handled above */ }
    if (n.op === '+' && n.t === 'String') {
      if (isNumeric(n.l.t) || isNumeric(n.r.t) || n.l.t === 'char' || n.r.t === 'char' || n.l.t === 'boolean' || n.r.t === 'boolean')
        nts.push({ id: 'concat-number', text: 'When one side of + is a String, the other side is converted to text and joined.' });
    }
    if (n.op === '+' && isNumeric(n.t) && ctx.parentStringPlus && ctx.parentStringPlus.has(n)) nts.push({ id: 'left-to-right', text: '+ works left to right: this is still numeric addition because neither side is a String yet.' });
    if (short) nts.push({ id: 'short-circuit', text: n.op === '&&' ? 'The left side is false, so && is false without checking the right side.' : 'The left side is true, so || is true without checking the right side.' });
    c.ops.push(op);
  }

  function precedenceNote(op) {
    if (op === '+' || op === '-') return 'Multiplication, division, and remainder happen before addition and subtraction.';
    if (op === '||') return '&& is evaluated before ||.';
    if (op === '&&' || op === '==' || op === '!=') return 'Relational comparisons are evaluated before && and ||.';
    return 'Higher-precedence operators are evaluated first.';
  }

  function markLeftToRight(n, set) {
    // numeric '+' that is the left operand of a String '+' (e.g. 1 + 2 + "x")
    if (n.k === 'bin') {
      if (n.op === '+' && n.t === 'String' && n.l.k === 'bin' && n.l.op === '+' && isNumeric(n.l.t)) set.add(n.l);
      markLeftToRight(n.l, set); markLeftToRight(n.r, set);
    } else if (n.k === 'not') markLeftToRight(n.e, set);
  }

  const snapshot = () => {
    const s = {};
    for (const nm of order) s[nm] = env.get(nm).v;
    return s;
  };

  const writeVar = (name, value, srcExpr) => {
    const box = env.get(name);
    if (o.alias && srcExpr && srcExpr.k === 'var') {
      const src = env.get(srcExpr.name);
      env.set(name, src); // linked: both names now share one box
      return;
    }
    box.v = value; box.hist.push(value);
  };

  try {
    for (let i = 0; i < program.length; i++) {
      const s = program[i];
      const before = snapshot();
      const cur = { ops: [], notes: [], statementKind: s.k };
      ctx = { i, cur, parentStringPlus: null };
      if (o.trace) { ctx.parentStringPlus = new Set(); if (s.expr) markLeftToRight(s.expr, ctx.parentStringPlus); }
      let output = null;
      if (o.skip && o.skip.has(i)) {
        steps.push({ i, stmt: s, before, after: before, changed: [], skipped: true, ops: [], notes: [] });
        continue;
      }
      switch (s.k) {
        case 'decl': {
          const v = ev(s.expr);
          env.set(s.name, { v, t: s.t, hist: [v] });
          order.push(s.name); types[s.name] = s.t;
          break;
        }
        case 'assign': { const v = ev(s.expr); writeVar(s.name, v, s.expr); break; }
        case 'compound': {
          const l = read(s.name, i), r = ev(s.expr);
          const v = applyOp(s.op, l, r, s.t, s.expr.t, o);
          if (o.trace) {
            cur.compound = { before: l, rhs: r, result: v };
            if (s.op === '/' && s.t === 'int' && l % r !== 0) cur.notes.push({ id: 'int-division', text: `Integer division drops the fractional part (truncates toward zero): ${l} / ${r} gives ${v}.` });
            if (s.op === '%' && s.t === 'int') cur.notes.push({ id: 'remainder', text: `% gives the remainder of ${l} divided by ${r}${l < 0 ? ' (the sign follows the left operand)' : ''}: ${v}.` });
            if (s.t === 'double' && s.expr.t === 'int') cur.notes.push({ id: 'promotion', text: 'The int operand is promoted to a double, so the result is a double.' });
          }
          writeVar(s.name, v, null);
          break;
        }
        case 'incdec': {
          const l = read(s.name, i);
          const v = applyOp(s.op === '++' ? '+' : '-', l, 1, 'int', 'int', o);
          writeVar(s.name, v, null);
          break;
        }
        case 'print': {
          const v = ev(s.expr);
          output = formatValue(v, s.expr.t, o.relaxed);
          outputs.push(output);
          if (o.trace) cur.printed = { value: v, text: output };
          break;
        }
        default: throw new Error('bad stmt');
      }
      const after = snapshot();
      const changed = order.filter((nm) => before[nm] !== after[nm] || !(nm in before));
      steps.push({ i, stmt: s, before, after, changed, output, ops: cur.ops, notes: cur.notes, compound: cur.compound, printed: cur.printed });
    }
  } catch (e) {
    if (e instanceof JavaRuntimeError) return { ok: false, error: { code: e.code, message: e.message, stmt: ctx ? ctx.i : -1 }, steps, outputs, order, types };
    throw e;
  }
  return { ok: true, steps, outputs, order, types, final: snapshot() };
}

// Independent static type / definite-assignment checker (a second line of defence
// against generating invalid Java; does not use the interpreter).
export function typeCheck(program) {
  const declared = new Map();
  const fail = (m) => { throw new Error('typeCheck: ' + m); };
  const assignable = (to, from) => to === from || (to === 'double' && from === 'int');
  const chk = (e) => {
    if (e.k === 'var') { if (!declared.has(e.name)) fail('uninitialized ' + e.name); if (declared.get(e.name) !== e.t) fail('var type mismatch ' + e.name); }
    else if (e.k === 'not') { chk(e.e); if (e.e.t !== 'boolean') fail('! on non-boolean'); }
    else if (e.k === 'bin') {
      chk(e.l); chk(e.r);
      const { op, l, r } = e;
      if (ARITH.includes(op)) {
        if (op === '+' && (l.t === 'String' || r.t === 'String')) { /* concat ok */ }
        else if (!isNumeric(l.t) || !isNumeric(r.t)) fail(`arithmetic ${op} on ${l.t},${r.t}`);
        if (op === '%' && (l.t === 'double' || r.t === 'double')) fail('double remainder not generated');
      } else if (['<', '>', '<=', '>='].includes(op)) { if (!isNumeric(l.t) || !isNumeric(r.t)) fail('relational on non-numeric'); }
      else if (op === '==' || op === '!=') { if (l.t === 'String' || r.t === 'String') fail('String == not allowed'); if (isNumeric(l.t) !== isNumeric(r.t) || (!isNumeric(l.t) && l.t !== r.t)) fail('== type mismatch'); }
      else if (op === '&&' || op === '||') { if (l.t !== 'boolean' || r.t !== 'boolean') fail('logical on non-boolean'); }
      else fail('unknown op ' + op);
      if (e.t !== binType(op, l, r)) fail('node type wrong');
    }
  };
  for (const s of program) {
    if (s.k === 'decl') { if (declared.has(s.name)) fail('redeclared ' + s.name); chk(s.expr); if (!assignable(s.t, s.expr.t)) fail('decl type ' + s.name); declared.set(s.name, s.t); }
    else if (s.k === 'assign') { chk(s.expr); if (!declared.has(s.name)) fail('assign undeclared'); if (declared.get(s.name) !== s.t || !assignable(s.t, s.expr.t)) fail('assign type ' + s.name); }
    else if (s.k === 'compound') {
      chk(s.expr); if (!declared.has(s.name) || declared.get(s.name) !== s.t) fail('compound target');
      if (s.t === 'int' && s.expr.t !== 'int') fail('int compound with non-int rhs');
      if (s.t === 'double' && !isNumeric(s.expr.t)) fail('double compound rhs');
      if (s.t === 'String' && s.op !== '+') fail('String compound op');
      if (s.t === 'boolean' || s.t === 'char') fail('compound on ' + s.t);
      if (s.t === 'double' && s.op === '%') fail('double %=');
    } else if (s.k === 'incdec') { if (declared.get(s.name) !== 'int') fail('incdec on non-int'); }
    else if (s.k === 'print') chk(s.expr);
    else fail('stmt kind');
  }
  return true;
}
export { renderStmt, varsIn };
