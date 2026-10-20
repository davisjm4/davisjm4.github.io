// Math Lab expansion: exact analysis of expressions containing Math.random().
//
// Possible outputs are DERIVED, never sampled. Math.random() is modelled as the
// half-open real interval [0, 1). Double sub-expressions are intervals with
// open/closed endpoints; an (int) cast maps an interval to the contiguous set
// of truncated integers; int sub-expressions are explicit finite sets.
//
// Supported subset: one Math.random() call; + - * / with constant operands;
// (int) and (double) casts; int + - * / % between finite sets.
// Generators keep multipliers <= 200 so double rounding of r * k can never
// reach k (verified against real Java at interval breakpoints in the tests).

import * as N from "./java-numeric.js";

export class UnsupportedRandomExpression extends Error {}

const point = v => ({ t: "double", lo: v, hi: v, lc: true, hc: true });
const ints = values => ({ t: "int", set: [...new Set(values.map(v => N.int(v).v))].sort((a, b) => a - b) });

function asConstant(a) {
  if (a.t === "int" && a.set.length === 1) return a.set[0];
  if (a.t === "double" && a.lo === a.hi && a.lc && a.hc) return a.lo;
  return null;
}

/** Largest/smallest integer reached by truncating every x in the interval. */
export function truncatedRange(iv) {
  if (iv.lo > iv.hi || (iv.lo === iv.hi && !(iv.lc && iv.hc))) throw new UnsupportedRandomExpression("empty interval");
  const integer = Number.isInteger;
  let min, max;
  if (iv.lc) min = Math.trunc(iv.lo);
  else if (iv.lo >= 0) min = Math.floor(iv.lo);
  else min = integer(iv.lo) ? iv.lo + 1 : Math.ceil(iv.lo);
  if (iv.hc) max = Math.trunc(iv.hi);
  else if (iv.hi > 0) max = integer(iv.hi) ? iv.hi - 1 : Math.floor(iv.hi);
  else max = integer(iv.hi) ? iv.hi : Math.ceil(iv.hi);
  return [min + 0, max + 0];
}

function scale(iv, c) {
  if (c === 0) return point(0);
  if (c > 0) return { ...iv, lo: iv.lo * c, hi: iv.hi * c };
  return { t: "double", lo: iv.hi * c, hi: iv.lo * c, lc: iv.hc, hc: iv.lc };
}
const shift = (iv, c) => ({ ...iv, lo: iv.lo + c, hi: iv.hi + c });

function combine(op, a, b) {
  if (a.t === "int" && b.t === "int") {
    if (a.set.length * b.set.length > 40000) throw new UnsupportedRandomExpression("set too large");
    const out = [];
    for (const x of a.set) for (const y of b.set) {
      if ((op === "/" || op === "%") && y === 0) throw new UnsupportedRandomExpression("division by zero");
      out.push(N.arith(op, N.int(x), N.int(y)).v);
    }
    return ints(out);
  }
  // At least one double interval; the other operand must be a constant.
  const ca = asConstant(a), cb = asConstant(b);
  if (ca !== null && cb !== null) return point(N.arith(op, N.dbl(ca), N.dbl(cb)).v);
  if (cb !== null) {
    const iv = a.t === "double" ? a : null;
    if (!iv) throw new UnsupportedRandomExpression("int set mixed with double");
    if (op === "+") return shift(iv, cb);
    if (op === "-") return shift(iv, -cb);
    if (op === "*") return scale(iv, cb);
    if (op === "/" && cb !== 0) return scale(iv, 1 / cb);
  } else if (ca !== null) {
    const iv = b.t === "double" ? b : null;
    if (!iv) throw new UnsupportedRandomExpression("int set mixed with double");
    if (op === "+") return shift(iv, ca);
    if (op === "*") return scale(iv, ca);
    if (op === "-") return shift(scale(iv, -1), ca);
  }
  throw new UnsupportedRandomExpression(`unsupported ${op} between ranges`);
}

/** Abstract value of an expression: {t:'int', set} or {t:'double', lo, hi, lc, hc}. */
export function analyze(e, env = {}) {
  const go = x => analyze(x, env);
  switch (e.k) {
    case "lit":
      if (e.t === "int") return ints([e.v]);
      if (e.t === "double") return point(e.v);
      break;
    case "group": return go(e.e);
    case "var":
      if (e.name in env) return go(env[e.name]);
      break;
    case "neg": {
      const a = go(e.e);
      return a.t === "int" ? ints(a.set.map(v => -v)) : scale(a, -1);
    }
    case "call":
      if (e.fn === "random") return { t: "double", lo: 0, hi: 1, lc: true, hc: false };
      break;
    case "cast": {
      const a = go(e.e);
      if (e.t === "int") {
        if (a.t === "int") return a;
        const [min, max] = truncatedRange(a);
        if (max - min > 5000) throw new UnsupportedRandomExpression("range too large");
        return ints(Array.from({ length: max - min + 1 }, (_, i) => min + i));
      }
      if (e.t === "double") {
        if (a.t === "double") return a;
        if (a.set.length === 1) return point(a.set[0]);
      }
      break;
    }
    case "bin":
      if (["+", "-", "*", "/", "%"].includes(e.op)) return combine(e.op, go(e.l), go(e.r));
      break;
  }
  throw new UnsupportedRandomExpression("unsupported node " + e.k);
}

/** Sorted list of every int the expression can produce. */
export function possibleInts(e, env = {}) {
  const a = analyze(e, env);
  if (a.t !== "int") throw new UnsupportedRandomExpression("expression is not int-valued");
  return a.set;
}

export const sameSet = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Human description: "1 through 6", "the even numbers 0 through 10", "always 3". */
export function describeSet(set) {
  if (set.length === 1) return `always ${set[0]}`;
  const step = set[1] - set[0];
  const regular = set.every((v, i) => i === 0 || v - set[i - 1] === step);
  if (regular && step === 1) return `${set[0]} through ${set.at(-1)}`;
  if (regular) return `${set[0]} through ${set.at(-1)} in steps of ${step}`;
  return set.join(", ");
}

export function inInterval(iv, x) {
  return (iv.lc ? x >= iv.lo : x > iv.lo) && (iv.hc ? x <= iv.hi : x < iv.hi);
}
export function describeInterval(iv) {
  return `${iv.lc ? "[" : "("}${N.javaDouble(iv.lo)}, ${N.javaDouble(iv.hi)}${iv.hc ? "]" : ")"}`;
}
