// Independent dependency analysis for Trace programs (R2/R5).
//
// Two complementary checks, neither of which relies on the generator's own slicing:
//
//  1. Algebraic: every statement's expression is normalised to a polynomial over the
//     variables it reads (opaque atoms for `/`, `%`, comparisons, logic and string
//     concatenation). A variable that is *referenced* but absent from the normal form has
//     cancelled out, e.g. `time - (time + 8)`, `z - 1 * z`, `bonus -= score + bonus`.
//     This is exact symbolic reasoning, not sampling.
//  2. Semantic (instance-level, deterministic): a counted statement is "inert" when removing
//     it does not change the observed answer AND adding a small fixed offset to the value it
//     produces does not change the answer either. Inert statements are not demonstrated
//     reasoning, so they must not be counted toward difficulty.
//
// Legitimate patterns are untouched: an assignment that does not read its own previous value
// (`x = 7`) cancels nothing; printed-but-not-stored trap statements are not definitions; and a
// statement that merely overwrites an earlier one is judged by what it reads, not by being an
// overwrite.

import { defOf, usesOf, varsIn, lit, vr, bin, assign } from './model.js';
import { execute } from './interp.js';

// ---- polynomial normal form ---------------------------------------------------------------
// poly: Map<monomialKey, {coef, atoms: string[]}>; atomDeps: Map<atomName, Set<varName>>
const ONE = '';
function constant(c) { return new Map(c === 0 ? [] : [[ONE, { coef: c, atoms: [] }]]); }
function add(a, b, sign = 1) {
  const out = new Map(a);
  for (const [key, term] of b) {
    const prev = out.get(key), coef = (prev ? prev.coef : 0) + sign * term.coef;
    if (coef === 0) out.delete(key); else out.set(key, { coef, atoms: term.atoms });
  }
  return out;
}
function mul(a, b) {
  let out = new Map();
  for (const x of a.values()) for (const y of b.values()) {
    const atoms = [...x.atoms, ...y.atoms].sort(), key = atoms.join('*');
    out = add(out, new Map([[key, { coef: x.coef * y.coef, atoms }]]));
  }
  return out;
}
const contains = (atoms, need) => { const pool = [...atoms]; return need.every((n) => { const k = pool.indexOf(n); if (k < 0) return false; pool.splice(k, 1); return true; }); };
const remove = (atoms, need) => { const pool = [...atoms]; for (const n of need) pool.splice(pool.indexOf(n), 1); return pool; };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const same = (a, b) => a.size === b.size && [...a].every(([k, t]) => b.get(k)?.coef === t.coef);
const isConstant = (p) => p.size === 0 || (p.size === 1 && p.has(ONE));
const constValue = (p) => (p.size === 0 ? 0 : p.get(ONE).coef);

// One symbolic evaluator holds the opaque-atom table so that normal forms from different
// statements are comparable. `env` maps a variable to its current polynomial (whole-program
// evaluation); a variable with no entry stands for itself (single-statement evaluation).
class Symbolic {
  constructor() { this.atomDeps = new Map(); this.opaqueKeys = new Map(); this.atomMult = new Map(); this.atomRange = new Map(); this.serial = 0; this.env = new Map(); }
  // Interval of values a polynomial can take (unknown atoms are unbounded).
  range(p) {
    let lo = 0, hi = 0;
    for (const t of p.values()) {
      let a = t.coef, b = t.coef;
      for (const atom of t.atoms) {
        const [x, y] = this.atomRange.get(atom) || [-Infinity, Infinity], c = [a * x, a * y, b * x, b * y].map((v) => (Number.isNaN(v) ? 0 : v));
        a = Math.min(...c); b = Math.max(...c);
      }
      lo += a; hi += b;
    }
    return [lo, hi];
  }
  // Largest integer that provably divides every value of the polynomial (0 when unknown).
  multiple(p) {
    let g = 0;
    for (const t of p.values()) { let m = Math.abs(t.coef); if (!Number.isInteger(m)) return 1; for (const a of t.atoms) m *= this.atomMult.get(a) || 1; g = gcd(g, m); }
    return g || 0;
  }
  atomOf(label, deps, mult = 1, range = null) {
    if (!this.opaqueKeys.has(label)) { const name = `@${this.serial++}`; this.opaqueKeys.set(label, name); this.atomDeps.set(name, deps); this.atomMult.set(name, mult); if (range) this.atomRange.set(name, range); }
    const name = this.opaqueKeys.get(label);
    return new Map([[name, { coef: 1, atoms: [name] }]]);
  }
  deps(p) {
    const out = new Set();
    for (const term of p.values()) for (const atom of term.atoms) {
      if (this.atomDeps.has(atom)) for (const d of this.atomDeps.get(atom)) out.add(d); else out.add(atom);
    }
    return out;
  }
  fresh(name) { return new Map([[name, { coef: 1, atoms: [name] }]]); }
  evaluate(e) {
    const canon = (p) => [...p].map(([k, t]) => `${t.coef}:${k}`).sort().join('+');
    if (e.k === 'lit') {
      if ((e.t === 'int' || e.t === 'double') && Number.isFinite(e.v)) return constant(e.v);
      return this.atomOf(`lit:${e.t}:${e.v}`, new Set());
    }
    if (e.k === 'var') return this.env.has(e.name) ? this.env.get(e.name) : this.fresh(e.name);
    if (e.k === 'not') { const inner = this.evaluate(e.e); return this.atomOf(`not(${canon(inner)})`, this.deps(inner)); }
    const l = this.evaluate(e.l), r = this.evaluate(e.r);
    const numeric = (e.t === 'int' || e.t === 'double') && e.l.t !== 'String' && e.r.t !== 'String';
    if (numeric && e.op === '+') return add(l, r);
    if (numeric && e.op === '-') return add(l, r, -1);
    if (numeric && e.op === '*') return mul(l, r);
    const deps = new Set([...this.deps(l), ...this.deps(r)]);
    // Exact polynomial division: when the divisor is a single term c*M and every term of the
    // dividend is a multiple of it, `(2 * x) / x` is 2 and `(2 * x) % x` is 0.
    if (['/', '%'].includes(e.op) && r.size === 1 && !r.has(ONE)) {
      const [divisor] = r.values();
      const multiples = [...l.values()].every((t) => t.coef % divisor.coef === 0 && contains(t.atoms, divisor.atoms));
      if (multiples && l.size > 0) {
        if (e.op === '%') return constant(0);
        let quotient = new Map();
        for (const t of l.values()) { const atoms = remove(t.atoms, divisor.atoms); quotient = add(quotient, new Map([[atoms.join('*'), { coef: t.coef / divisor.coef, atoms }]])); }
        return quotient;
      }
    }
    // Whole-polynomial multiples: l = k * r for an integer k makes `l / r` the constant k and `l % r` zero.
    if (['/', '%'].includes(e.op) && r.size > 0 && !isConstant(r) && l.size === r.size) {
      let k = null, ok = true;
      for (const [key, t] of l) { const u = r.get(key); if (!u) { ok = false; break; } const q = t.coef / u.coef; if (!Number.isInteger(q) || (k !== null && q !== k)) { ok = false; break; } k = q; }
      if (ok && k !== null) return e.op === '%' ? constant(0) : constant(k);
    }
    // A remainder whose left operand already lies strictly inside (-k, k) is the identity.
    if (e.op === '%' && e.t === 'int' && isConstant(r) && constValue(r) !== 0) {
      const k = Math.abs(constValue(r)), [lo, hi] = this.range(l);
      if (lo > -k && hi < k) return l;
    }
    // Integers: a remainder by k is 0 when the left operand is provably a multiple of k
    // (x % 1, (x * 4) % 4, ((x * 4) % 6) % 2), and (a % d) / d is always 0.
    if (e.op === '%' && e.t === 'int' && isConstant(r) && Number.isInteger(constValue(r)) && constValue(r) !== 0
        && this.multiple(l) % Math.abs(constValue(r)) === 0 && l.size > 0) return constant(0);
    if (e.op === '/' && e.t === 'int' && e.l.k === 'bin' && e.l.op === '%' && same(this.evaluate(e.l.r), r)) return constant(0);
    // Self-referential comparisons and quotients collapse to a constant.
    if (same(l, r) && !isConstant(l)) {
      if (e.op === '/' && e.t === 'int') return constant(1);
      if (e.op === '%') return constant(0);
      if (['==', '<=', '>='].includes(e.op)) return this.atomOf('const:true', new Set());
      if (['!=', '<', '>'].includes(e.op)) return this.atomOf('const:false', new Set());
    }
    // Constant folding keeps `x * 0`-style collapses visible to the dependency count.
    if (isConstant(l) && isConstant(r) && numeric) {
      const a = constValue(l), b = constValue(r);
      if (e.op === '/' && b !== 0) return constant(e.t === 'int' ? Math.trunc(a / b) : a / b);
      if (e.op === '%' && b !== 0) return constant(a % b);
    }
    const mult = e.op === '%' && e.t === 'int' && isConstant(r) && constValue(r) !== 0 ? gcd(this.multiple(l), constValue(r)) : 1;
    let range = null;
    if (e.t === 'int' && isConstant(r) && constValue(r) !== 0) {
      const k = Math.abs(constValue(r)), [lo, hi] = this.range(l);
      if (e.op === '%') range = lo >= 0 ? [0, k - 1] : [-(k - 1), k - 1];
      if (e.op === '/' && constValue(r) > 0 && Number.isFinite(lo) && Number.isFinite(hi)) {
        range = [Math.trunc(lo / k), Math.trunc(hi / k)];
        if (range[0] === range[1]) return constant(range[0]);
      }
    }
    return this.atomOf(`${e.op}(${canon(l)},${canon(r)})`, deps, mult || 1, range);
  }
}

export function normalForm(expr) {
  const sym = new Symbolic();
  const poly = sym.evaluate(expr);
  return { poly, deps: sym.deps(poly) };
}

// R2 (whole program): the answer must depend on at least one initial numeric value. When every
// declaration is replaced by an unknown and the answer's normal form mentions none of them, the
// answer is a constant (e.g. `tax = total + 1.5; print(tax - total)` is always 1.5) and the whole
// trace can be skipped. Non-numeric answers are not judged here.
export function answerIsConstant(program, target) {
  const sym = new Symbolic();
  let answer = null, initials = 0;
  const read = new Set();                       // initial values some statement actually reads
  const note = (p) => { for (const d of sym.deps(p)) if (d.startsWith('$init')) read.add(d); };
  for (let k = 0; k < program.length; k++) {
    const st = program[k];
    if (st.k === 'print') { if (target.format === 'output' && k === target.index) { answer = sym.evaluate(st.expr); note(answer); } continue; }
    const d = defOf(st);
    if (!d) continue;
    let value;
    if (st.k === 'decl' && ['int', 'double'].includes(st.t) && st.expr.k === 'lit') { value = sym.fresh(`$init${initials++}`); }
    else if (st.k === 'incdec') { value = add(sym.evaluate(vr(d, st.t)), constant(st.op === '++' ? 1 : -1)); note(value); }
    else { value = sym.evaluate(effectiveExpression(st)); note(value); }
    sym.env.set(d, value);
    if (target.format === 'checkpoint' && k === target.index) answer = value;
  }
  if (target.format === 'final') answer = sym.env.get(target.varName);
  if (!answer) return false;
  const typed = target.format === 'output' ? program[target.index].expr.t : (program.find((x) => x.k === 'decl' && x.name === target.varName)?.t);
  if (!['int', 'double'].includes(typed)) return false;
  // A program that overwrites every initial value before reading it (`x = 4; x = 23; print(x * 6)`)
  // is the legitimate overwrite lesson and is constant by design. Only programs that read an initial
  // value and then lose it to cancellation or collapse are rejected.
  if (read.size === 0) return false;
  const [lo, hi] = sym.range(answer);
  if (Number.isFinite(lo) && lo === hi) return true;
  return ![...sym.deps(answer)].some((d) => read.has(d));
}

// Whole-program symbolic execution in which statement `i` defines an unknown value: does the
// observed answer still mention it? False means the answer is algebraically independent of the
// statement (it cancels against another use), e.g. `a -= b ... print(a + b)`.
export function answerMentions(program, target, i) {
  const sym = new Symbolic(), FRESH = '$fresh';
  const answerOf = () => {
    if (target.format === 'final') return sym.env.get(target.varName);
    return null;
  };
  let answer = null;
  for (let k = 0; k < program.length; k++) {
    const st = program[k];
    if (st.k === 'print') { if (target.format === 'output' && k === target.index) answer = sym.evaluate(st.expr); continue; }
    const d = defOf(st);
    if (!d) continue;
    let value;
    if (k === i) value = sym.fresh(FRESH);
    else if (st.k === 'incdec') value = add(sym.evaluate(vr(d, st.t)), constant(st.op === '++' ? 1 : -1));
    else value = sym.evaluate(effectiveExpression(st));
    sym.env.set(d, value);
    if (target.format === 'checkpoint' && k === target.index) answer = value;
  }
  if (target.format === 'final') answer = answerOf();
  if (!answer) return true;
  return sym.deps(answer).has(FRESH);
}

// The expression a statement actually evaluates, with the implicit read of the left-hand side
// made explicit for compound assignment.
export function effectiveExpression(s) {
  if (s.k === 'compound') return bin(s.op.replace('=', ''), vr(s.name, s.t), s.expr);
  return s.expr;
}

// Variables a statement references but whose value cannot influence its result.
export function cancelledOperands(s) {
  if (s.k === 'incdec') return [];
  const e = effectiveExpression(s);
  if (!e) return [];
  const referenced = new Set(varsIn(e, []));
  if (s.k === 'compound') referenced.add(s.name);
  const { deps } = normalForm(e);
  return [...referenced].filter((name) => !deps.has(name));
}
export function hasCancelledOperand(program) {
  return program.some((s) => cancelledOperands(s).length > 0);
}

// ---- effective slice -----------------------------------------------------------------------
// Backward slice that follows only dependencies that survive algebraic cancellation.
export function algebraicUses(s) {
  if (s.k === 'incdec') return [s.name];
  const e = effectiveExpression(s);
  if (!e) return [];
  const { deps } = normalForm(e);
  return [...deps].filter((d) => usesOf(s).includes(d));
}

// ---- instance-level inertness --------------------------------------------------------------
const DELTAS = { int: [1, -1, 2, -3, 5], double: [0.5, -0.5, 1.5, -2] };
function observe(exec, target, shift) {
  if (target.format === 'output') return exec.steps[target.index + shift]?.output;
  if (target.format === 'final') return exec.final?.[target.varName];
  return exec.steps[target.index + shift]?.after?.[target.varName];
}
const same2 = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// True when statement i (a numeric definition) demonstrably has no effect on the observed answer
// through data-dependent collapse (a quotient that rounds to 0, a remainder, a later reset): removing
// it and perturbing the value it produces both leave the answer unchanged. Algebraic cross-statement
// cancellation is NOT inert (see answerMentions): the specification's own example
// `a += b * 2; b = a / 3; a -= b; print(a + b)` is an approved design where b cancels in the print.
export function isInert(program, target, i, opts = {}) {
  const s = program[i], d = defOf(s);
  if (!d || !s.t || !['int', 'double'].includes(s.t)) return false;
  const run = (prog, extra = {}) => execute(prog, { maxInt: opts.maxInt ?? 10000, ...extra });
  const base = run(program);
  if (!base.ok) return false;
  const answer = observe(base, target, 0);
  const ablated = run(program, { skip: new Set([i]) });
  // Removing a declaration leaves the variable unbound, which is a different program; only
  // assignments and updates are ablated. Declarations are tested by perturbation alone.
  if (s.k !== 'decl' && ablated.ok && !same2(observe(ablated, target, 0), answer)) return false;
  let executed = 0;
  for (const delta of DELTAS[s.t]) {
    const prog = [...program.slice(0, i + 1), assign(d, s.t, bin('+', vr(d, s.t), lit(s.t, delta))), ...program.slice(i + 1)];
    const exec = run(prog, {});
    if (!exec.ok) return false;                      // the perturbation visibly breaks the program
    executed++;
    if (!same2(observe(exec, target, target.index >= i ? 1 : 0), answer)) return false;
  }
  if (executed < 3) return false;
  return answerMentions(program, target, i);        // algebraic cancellation is by design, not inertness
}

export function effectiveSlice(program, target, syntacticRelevant, opts = {}) {
  const keep = new Set();
  for (const i of syntacticRelevant) if (!isInert(program, target, i, opts)) keep.add(i);
  return keep;
}
