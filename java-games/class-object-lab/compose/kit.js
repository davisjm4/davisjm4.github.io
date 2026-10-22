/* Shared helpers for semantic families. */
import { DOMAINS, names } from "./components.js";
import { clone, walk } from "./ir.js";

export const P = (classes, helpers, main) => ({ classes, helpers, main });
export function context(rng, level) {
  const D = rng.pick(DOMAINS);
  const N = names(D);
  return { rng, level, D, N, vars: rng.sample(N.vars, 5) };
}
export function distinct(rng, n, lo, hi, avoid = []) {
  const out = new Set();
  let guard = 0;
  while (out.size < n && guard++ < 500) { const v = rng.int(lo, hi); if (!avoid.includes(v)) out.add(v); }
  return [...out];
}
export const lvl = (level, b, i, a) => (level === 0 ? b : level === 1 ? i : a);

/* ---- generic program transformations used as misconception models ---- */
const isCallStmt = (s) => s.k === "ex" && (s.e.k === "call" || s.e.k === "scall");
export function mutDropCall(p) {
  const alts = [];
  p.main.forEach((s, i) => { if (isCallStmt(s)) { const q = clone(p); q.main.splice(i, 1); alts.push({ program: q, mis: "lostUpdate", at: i }); } });
  return alts;
}
export function mutSwapReceiver(p, refVars) {
  const alts = [];
  p.main.forEach((s, i) => {
    if (s.k === "ex" && s.e.k === "call" && s.e.o?.k === "name") {
      for (const v of refVars) if (v !== s.e.o.n) { const q = clone(p); q.main[i].e.o.n = v; alts.push({ program: q, mis: "wrongReceiver", at: i }); }
    }
  });
  return alts;
}
export function mutReorder(p) {
  const alts = [];
  for (let i = 0; i + 1 < p.main.length; i++) {
    if (isCallStmt(p.main[i]) && isCallStmt(p.main[i + 1])) { const q = clone(p); [q.main[i], q.main[i + 1]] = [q.main[i + 1], q.main[i]]; alts.push({ program: q, mis: "orderSwap", at: i }); }
  }
  return alts;
}
const FLIP = { ">=": ">", ">": ">=", "<=": "<", "<": "<=" };
export function mutBoundary(p) {
  const alts = [];
  let count = 0;
  walkClasses(p, (n) => { if (n.k === "bin" && FLIP[n.op] && (n.r.k === "lit" || n.l.k === "lit")) count++; });
  for (let target = 0; target < count; target++) {
    const q = clone(p); let idx = 0;
    walkClasses(q, (n) => { if (n.k === "bin" && FLIP[n.op] && (n.r.k === "lit" || n.l.k === "lit")) { if (idx === target) n.op = FLIP[n.op]; idx++; } });
    alts.push({ program: q, mis: "boundary" });
  }
  return alts;
}
function walkClasses(p, fn) {
  for (const c of p.classes) { for (const k of c.ctors) walk(k.body, fn); for (const m of c.methods) walk(m.body, fn); }
  for (const h of p.helpers) walk(h.body, fn);
}
export const refVarsOf = (p, cn) => p.main.filter((s) => s.k === "decl" && (!cn || s.t === cn) && !["int", "double", "boolean", "char", "String"].includes(s.t)).map((s) => s.n);
