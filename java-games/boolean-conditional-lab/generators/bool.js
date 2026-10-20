/* Boolean expression model.
 * Nodes: {k:"var",n} {k:"const",v} {k:"cmp",v,op,c} {k:"not",a} {k:"and",xs:[...]} {k:"or",xs:[...]}
 * and/or are n-ary and kept flattened, so "(a && b) && c" can never be printed:
 * associative chains print without parentheses. */
import { pick, int, shuffle, reject } from "./core.js";

export const V = n => ({ k: "var", n });
export const NOT = a => ({ k: "not", a });
export const AND = (...xs) => flat("and", xs);
export const OR = (...xs) => flat("or", xs);
export const CMP = (v, op, c) => ({ k: "cmp", v, op, c });
function flat(k, xs) { const out = []; for (const x of xs) x.k === k ? out.push(...x.xs) : out.push(x); return out.length === 1 ? out[0] : { k, xs: out }; }
export const isCompound = n => n.k === "and" || n.k === "or";

// ---------- parsing (Java precedence: ! > && > ||) ----------
const TOK = /\s*(&&|\|\||!=|==|<=|>=|<|>|!|\(|\)|-?\d+|true|false|[A-Za-z_]\w*)/y;
export function parse(src) {
  const t = []; TOK.lastIndex = 0; let m; const s = String(src);
  while (TOK.lastIndex < s.length && (m = TOK.exec(s))) t.push(m[1]);
  if (t.join("").replace(/\s/g, "") !== s.replace(/\s/g, "")) throw new Error(`cannot tokenize ${s}`);
  let p = 0;
  const unary = () => {
    if (t[p] === "!") { p++; return NOT(unary()); }
    if (t[p] === "(") { p++; const e = or(); if (t[p++] !== ")") throw new Error("missing )"); return e; }
    const w = t[p++]; if (w === undefined) throw new Error("unexpected end");
    if (w === "true" || w === "false") return { k: "const", v: w === "true" };
    if (!/^[A-Za-z_]/.test(w)) throw new Error(`unexpected ${w}`);
    if (["<", ">", "<=", ">=", "==", "!="].includes(t[p])) { const op = t[p++], c = Number(t[p++]); if (!Number.isFinite(c)) throw new Error("bad literal"); return CMP(w, op, c); }
    return V(w);
  };
  const and = () => { const xs = [unary()]; while (t[p] === "&&") { p++; xs.push(unary()); } return xs.length > 1 ? AND(...xs) : xs[0]; };
  const or = () => { const xs = [and()]; while (t[p] === "||") { p++; xs.push(and()); } return xs.length > 1 ? OR(...xs) : xs[0]; };
  const e = or(); if (p !== t.length) throw new Error(`trailing input in ${s}`); return e;
}

// ---------- printing ----------
// Parentheses policy: required parentheses always; "clarifying" parentheses only
// around an && group that sits inside || (Java style guides recommend these and
// they separate mixed operators). Never around a single operand, never around the
// whole expression, never around a same-operator chain.
export function print(n, { clarify = true } = {}) {
  const P = x => print(x, { clarify });
  switch (n.k) {
    case "var": return n.n;
    case "const": return String(n.v);
    case "cmp": return `${n.v} ${n.op} ${n.c}`;
    case "not": return n.a.k === "var" || n.a.k === "not" || n.a.k === "const" ? `!${P(n.a)}` : `!(${P(n.a)})`;
    case "and": return n.xs.map(x => x.k === "or" ? `(${P(x)})` : P(x)).join(" && ");
    case "or": return n.xs.map(x => x.k === "and" && clarify ? `(${P(x)})` : P(x)).join(" || ");
  }
}
export const key = n => n.k === "var" ? n.n : n.k === "const" ? String(n.v) : n.k === "cmp" ? `${n.v}${n.op}${n.c}` : n.k === "not" ? `!${key(n.a)}` : `${n.k}(${n.xs.map(key).sort().join(",")})`;

// ---------- evaluation ----------
const CMPF = { "<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b, "==": (a, b) => a === b, "!=": (a, b) => a !== b };
export function evaluate(n, env) {
  switch (n.k) {
    case "var": if (!(n.n in env)) throw new Error(`unbound ${n.n}`); return !!env[n.n];
    case "const": return n.v;
    case "cmp": return CMPF[n.op](env[n.v], n.c);
    case "not": return !evaluate(n.a, env);
    case "and": for (const x of n.xs) if (!evaluate(x, env)) return false; return true;
    case "or": for (const x of n.xs) if (evaluate(x, env)) return true; return false;
  }
}
export function boolVars(n, out = new Set()) { if (n.k === "var") out.add(n.n); else if (n.k === "not") boolVars(n.a, out); else if (isCompound(n)) n.xs.forEach(x => boolVars(x, out)); return out; }
export const varsOf = n => [...boolVars(n)].sort();
export function rows(vars) { return Array.from({ length: 1 << vars.length }, (_, r) => Object.fromEntries(vars.map((v, j) => [v, !!(r & (1 << (vars.length - 1 - j)))]))); }
export const truth = (n, vars) => rows(vars).map(e => evaluate(n, e) ? "1" : "0").join("");
export const sameFunction = (a, b, vars) => truth(a, vars) === truth(b, vars);
export function essential(n, vars) { const tv = truth(n, vars); return vars.filter((v, j) => { const bit = 1 << (vars.length - 1 - j); for (let r = 0; r < tv.length; r++) if (tv[r] !== tv[r ^ bit]) return true; return false; }); }
export const leaves = n => n.k === "not" ? leaves(n.a) : isCompound(n) ? n.xs.reduce((s, x) => s + leaves(x), 0) : n.k === "const" ? 0 : 1;
export const depth = n => n.k === "not" ? (isCompound(n.a) ? 1 + depth(n.a) : depth(n.a)) : isCompound(n) ? 1 + Math.max(...n.xs.map(depth)) : 0;
export function ops(n, o = { and: 0, or: 0, not: 0, negatedGroups: 0 }) {
  if (n.k === "not") { o.not++; if (isCompound(n.a)) o.negatedGroups++; ops(n.a, o); }
  else if (isCompound(n)) { o[n.k] += n.xs.length - 1; n.xs.forEach(x => ops(x, o)); }
  return o;
}
export function stepCount(n) { return n.k === "not" ? 1 + stepCount(n.a) : isCompound(n) ? n.xs.length - 1 + n.xs.reduce((s, x) => s + stepCount(x), 0) : 0; }

// ---------- minimal two-level size (exact for <= 4 variables) ----------
const minCache = new Map();
function minSop(tv, nv) {
  const ck = `${nv}:${tv}`; if (minCache.has(ck)) return minCache.get(ck);
  const N = 1 << nv; let on = 0; for (let r = 0; r < N; r++) if (tv[r] === "1") on |= 1 << r;
  if (on === 0) { minCache.set(ck, 0); return 0; }
  const cubes = [];
  const rec = (pat) => {
    if (pat.length < nv) { for (const x of [-1, 0, 1]) rec([...pat, x]); return; }
    let m = 0; for (let r = 0; r < N; r++) if (pat.every((x, j) => x === -1 || x === ((r >> (nv - 1 - j)) & 1))) m |= 1 << r;
    if ((m & ~on) === 0) cubes.push({ m, lits: pat.filter(x => x !== -1).length });
  };
  rec([]);
  const primes = cubes.filter(c => !cubes.some(d => d !== c && (c.m & d.m) === c.m && d.m !== c.m));
  const best = new Int32Array(on + 1).fill(1 << 29); best[0] = 0;
  for (let m = 0; m <= on; m++) { if ((m & ~on) || best[m] >= 1 << 29) continue; for (const c of primes) { const nm = m | c.m; if (nm !== m && best[nm] > best[m] + c.lits) best[nm] = best[m] + c.lits; } }
  const res = best[on]; minCache.set(ck, res); return res;
}
export function minLiterals(n, vars) { const tv = truth(n, vars); const inv = [...tv].map(c => c === "1" ? "0" : "1").join(""); return Math.min(minSop(tv, vars.length), minSop(inv, vars.length)); }

// ---------- tree utilities ----------
export function paths(n, p = []) { const out = [p]; if (n.k === "not") out.push(...paths(n.a, [...p, "a"])); else if (isCompound(n)) n.xs.forEach((x, i) => out.push(...paths(x, [...p, i]))); return out; }
export const at = (n, p) => p.reduce((x, s) => s === "a" ? x.a : x.xs[s], n);
export function replace(n, p, sub) {
  if (!p.length) return sub;
  const [h, ...t] = p;
  if (h === "a") return NOT(replace(n.a, t, sub));
  const xs = n.xs.map((x, i) => i === h ? replace(x, t, sub) : x);
  return flat(n.k, xs);
}
export function removeChild(n, p, i) { const node = at(n, p); const xs = node.xs.filter((_, j) => j !== i); return replace(n, p, flat(node.k, xs)); }

// ---------- quality validation ----------
/** Returns {valid, reasons, metrics}. Options: allowConstants, allowDoubleNegation,
 * allowRedundancy (for simplification/tautology tasks), slack (extra literals allowed
 * over the minimal two-level form), boolVars (variables the table will show). */
export function quality(n, opts = {}) {
  // Checks run cheapest-first; with opts.all=false (default) the first failure
  // ends validation, which keeps rejection sampling fast.
  const reasons = []; const all = opts.all;
  const fail = r => { reasons.push(r); return !all; };
  const done = () => ({ valid: reasons.length === 0, reasons: [...new Set(reasons)], metrics: reasons.length && !all ? null : metrics(n, vars) });
  const vars = opts.vars || varsOf(n);
  const shown = opts.shownVars || vars;
  for (const v of shown) if (!vars.includes(v) && fail(`displayed variable ${v} does not occur`)) return done();
  if (!opts.allowConstants && JSON.stringify(n).includes('"const"') && fail("constant literal")) return done();
  if (!opts.allowRedundancy) {
    let stop = false;
    const walk = (x) => {
      if (stop) return;
      if (x.k === "not") { if (x.a.k === "not" && !opts.allowDoubleNegation && fail("double negation")) stop = true; walk(x.a); return; }
      if (!isCompound(x)) return;
      const ks = x.xs.map(key);
      if (new Set(ks).size !== ks.length && fail("duplicate operand in chain")) { stop = true; return; }
      if (ks.some(k => ks.includes(`!${k}`)) && fail("complementary operands in chain")) { stop = true; return; }
      x.xs.forEach(walk);
    };
    walk(n); if (stop) return done();
    const seen = new Set(); for (const p of paths(n)) { const s = at(n, p); if (isCompound(s)) { const k = key(s); if (seen.has(k) && fail("repeated subexpression")) return done(); seen.add(k); } }
  }
  const tv = truth(n, vars);
  if ((!/1/.test(tv) || !/0/.test(tv)) && !opts.allowRedundancy && fail("constant result")) return done();
  if (!opts.allowRedundancy) {
    const ess = essential(n, vars);
    if (ess.length !== vars.length && fail(`non-influential variable ${vars.filter(v => !ess.includes(v)).join(",")}`)) return done();
    for (const p of paths(n)) { const s = at(n, p); if (!isCompound(s)) continue; const sv = varsOf(s), st = truth(s, sv); if ((!/1/.test(st) || !/0/.test(st)) && fail("constant subexpression")) return done(); }
    // Any operand whose removal leaves the whole function unchanged is redundant:
    // this generalizes absorption, idempotence and "(a && b) || a" style padding.
    outer: for (const p of paths(n)) { const s = at(n, p); if (!isCompound(s)) continue; for (let i = 0; i < s.xs.length; i++) { if (truth(removeChild(n, p, i), vars) === tv) { if (fail("redundant operand")) return done(); break outer; } } }
    const ml = minLiterals(n, vars);
    if (leaves(n) > ml + (opts.slack ?? 1) && fail(`reducible: ${leaves(n)} literals but a ${ml}-literal form exists`)) return done();
  }
  return done();
}
export function metrics(n, vars = varsOf(n)) {
  const o = ops(n);
  return { vars: vars.length, relevantVars: essential(n, vars).length, literals: leaves(n), depth: depth(n), ...o, mixed: o.and > 0 && o.or > 0, steps: stepCount(n), minLiterals: minLiterals(n, vars) };
}

// ---------- random tree generation ----------
/** Random n-ary tree with `leafCount` leaves over `vars`, alternating operators. */
export function randomTree(rng, { vars, leafCount, negLeaf = 0.3, negGroup = 0.2, maxFan = 3, topOp = null, negTop = 0 }) {
  const slots = [];
  const gen = (count, parentOp, isTop) => {
    if (count === 1) { const leaf = { k: "slot" }; slots.push(leaf); return leaf; }
    const op = isTop && topOp ? topOp : parentOp === "and" ? "or" : parentOp === "or" ? "and" : pick(["and", "or"], rng);
    const k = Math.min(count, int(2, maxFan, rng));
    const parts = Array(k).fill(1); for (let r = count - k; r > 0; r--) parts[int(0, k - 1, rng)]++;
    let node = { k: op, xs: parts.map(c => gen(c, op, false)) };
    if (!isTop && rng() < negGroup) node = NOT(node);
    return node;
  };
  let tree = gen(leafCount, null, true);
  const pool = shuffle([...vars, ...Array.from({ length: Math.max(0, leafCount - vars.length) }, () => pick(vars, rng))], rng);
  // assign variables so that leaves in the same chain get different variables when possible
  const fill = (x) => { if (!isCompound(x) && x.k !== "not") return; if (x.k === "not") return fill(x.a); const used = new Set(); for (const c of x.xs) { if (c.k === "slot") { let i = pool.findIndex(v => !used.has(v)); if (i < 0) i = 0; c.k = "var"; c.n = pool.splice(i, 1)[0]; used.add(c.n); } } x.xs.forEach(fill); };
  if (tree.k === "slot") { tree.k = "var"; tree.n = pool[0]; } else fill(tree);
  if (negTop && isCompound(tree) && rng() < negTop) tree = NOT(tree);
  const negate = (x) => { if (x.k === "var") return rng() < negLeaf ? NOT(x) : x; if (x.k === "not") return NOT(negate(x.a)); return flat(x.k, x.xs.map(negate)); };
  const out = negate(tree);
  return out;
}

// ---------- equivalence-preserving transforms ----------
export function pushNot(n) { // !(A op B) -> !A op' !B (one level), removing double negation
  if (n.k !== "not" || !isCompound(n.a)) return null;
  const neg = x => x.k === "not" ? x.a : x.k === "cmp" ? negCmp(x) : NOT(x);
  return flat(n.a.k === "and" ? "or" : "and", n.a.xs.map(neg));
}
export function pullNot(n) { // A' op B' -> !(A op' B) when every operand is negated
  if (!isCompound(n) || !n.xs.every(x => x.k === "not")) return null;
  return NOT(flat(n.k === "and" ? "or" : "and", n.xs.map(x => x.a)));
}
const NEG = { "<": ">=", "<=": ">", ">": "<=", ">=": "<", "==": "!=", "!=": "==" };
export const negCmp = c => CMP(c.v, NEG[c.op], c.c);
export function distribute(n) { // A && (B || C) -> (A && B) || (A && C)
  if (n.k !== "and") return null; const i = n.xs.findIndex(x => x.k === "or"); if (i < 0) return null;
  const rest = n.xs.filter((_, j) => j !== i); return flat("or", n.xs[i].xs.map(x => flat("and", [...rest, x])));
}
export function factor(n) { // (A && B) || (A && C) -> A && (B || C)
  if (n.k !== "or" || n.xs.length < 2 || !n.xs.every(x => x.k === "and")) return null;
  const common = n.xs[0].xs.filter(c => n.xs.every(t => t.xs.some(d => key(d) === key(c))));
  if (!common.length) return null;
  const ck = new Set(common.map(key));
  const rests = n.xs.map(t => t.xs.filter(d => !ck.has(key(d))));
  if (rests.some(r => !r.length)) return null;
  return flat("and", [...common, flat("or", rests.map(r => flat("and", r)))]);
}
export const SOUND = { pushNot, pullNot, distribute, factor };
// ---------- misconception transforms (results are verified non-equivalent by callers) ----------
export const MISTAKES = {
  "demorgan-keep-operator": n => n.k === "not" && isCompound(n.a) ? flat(n.a.k, n.a.xs.map(x => x.k === "not" ? x.a : NOT(x))) : null,
  "negate-first-only": n => n.k === "not" && isCompound(n.a) ? flat(n.a.k, n.a.xs.map((x, i) => i === 0 ? (x.k === "not" ? x.a : NOT(x)) : x)) : null,
  "drop-outer-negation": n => n.k === "not" && isCompound(n.a) ? n.a : null,
  "swap-and-or": n => isCompound(n) ? flat(n.k === "and" ? "or" : "and", n.xs) : null,
  "flip-operator-only": n => n.k === "not" && isCompound(n.a) ? NOT(flat(n.a.k === "and" ? "or" : "and", n.a.xs)) : null,
};
export function applyAt(n, fn, rng) {
  const cands = shuffle(paths(n), rng);
  for (const p of cands) { const r = fn(at(n, p)); if (r) return replace(n, p, r); }
  return null;
}
export { reject };
/** Structural sanity for displayed misconception options: no duplicate or
 * complementary operands in a chain and not constant. */
export function degenerate(n) {
  const bad = x => { if (x.k === "not") return bad(x.a); if (!isCompound(x)) return false; const ks = x.xs.map(key); return new Set(ks).size !== ks.length || ks.some(k => ks.includes(`!${k}`)) || x.xs.some(bad); };
  const tv = truth(n, varsOf(n)); return bad(n) || !/1/.test(tv) || !/0/.test(tv);
}
