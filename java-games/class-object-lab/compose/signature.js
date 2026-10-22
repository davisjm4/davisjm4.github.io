/* Deterministic signatures (no random suffixes).
 *
 *  exact      = rendered code + prompt + the SET of choices (choice order excluded)
 *  program    = canonical IR: every identifier (class, field, method, helper, parameter, local)
 *               renamed by first occurrence (C1, F1, M1, ...), literal values replaced by their type.
 *  graph      = final object graph: main variables -> canonical object index / null, objects created,
 *               which objects were changed after construction.
 *  ops        = operation-sequence structure of main (decl-new, alias, reassign-new, call:<kind>, ...)
 *  reasoning  = program + branch outcomes + exception + equal-argument pattern + canonical query.
 *               This is the "reasoning configuration": two challenges with the same reasoning key
 *               ask the same question about the same object relationships with the same decisions,
 *               differing only cosmetically (names, domain, literal values that do not change any
 *               decision, answer order).
 */
import { hashHex } from "./rng.js";
import { clone, walkProgram } from "./ir.js";

const KEEP = new Set(["toString", "this", "Math", "System"]);
export function canonicalize(program) {
  const p = clone(program);
  const map = new Map();
  const counters = {};
  const id = (kind, n) => {
    if (KEEP.has(n)) return n;
    const key = n; // identifiers are unique enough per program; same text -> same canonical id
    if (!map.has(key)) { counters[kind] = (counters[kind] || 0) + 1; map.set(key, kind + counters[kind]); }
    return map.get(key);
  };
  for (const c of p.classes) {
    c.n = id("C", c.n);
    for (const f of c.fields) { f.n = id("F", f.n); f.t = canonType(f.t); }
    for (const k of c.ctors) for (const q of k.params) { q.n = id("V", q.n); q.t = canonType(q.t); }
    for (const m of c.methods) { m.n = id("M", m.n); m.ret = canonType(m.ret); for (const q of m.params) { q.n = id("V", q.n); q.t = canonType(q.t); } }
  }
  for (const h of p.helpers) { h.n = id("H", h.n); h.ret = canonType(h.ret); for (const q of h.params) { q.n = id("V", q.n); q.t = canonType(q.t); } }
  function canonType(t) { return map.has(t) ? map.get(t) : t; }
  walkProgram(p, (node) => {
    if (node.k === "lit") { if (node.t !== "boolean" && node.t !== "null") node.v = node.t[0]; }
    if (node.k === "name") node.n = id("V", node.n);
    if (node.k === "fld") node.n = id("F", node.n);
    if (node.k === "sfld") { node.c = canonType(node.c); node.n = id("F", node.n); }
    if (node.k === "new") node.c = canonType(node.c);
    if (node.k === "call") node.n = id("M", node.n);
    if (node.k === "scall") { node.c = canonType(node.c); node.n = id("M", node.n); }
    if (node.k === "decl") { node.n = id("V", node.n); node.t = canonType(node.t); }
  });
  // field initialisers / chain args were walked; ternaries inside raw nodes are walked via keys
  return { program: p, map };
}

export function opKind(s) {
  const e = s.e;
  if (s.k === "print") return "print:" + (e.k === "bin" ? "bin" + e.op : e.k);
  if (s.k === "decl") {
    if (!e) return "decl-uninit";
    if (e.k === "new") return "decl-new";
    if (e.k === "lit" && e.t === "null") return "decl-null";
    if (e.k === "name") return "decl-alias";
    if (e.k === "call") return e.o ? "decl-call-ret" : "decl-helper-ret";
    return "decl-" + e.k;
  }
  if (s.k === "asg") {
    if (s.tg.k !== "name") return "asg-field";
    if (s.e.k === "new") return "reassign-new";
    if (s.e.k === "lit" && s.e.t === "null") return "reassign-null";
    if (s.e.k === "name") return "reassign-alias";
    if (s.e.k === "call") return "reassign-call";
    return "asg-" + s.e.k;
  }
  if (s.k === "ex") {
    if (e.k === "new") return "temp-new";
    if (e.k === "call" && e.o?.k === "new") return "temp-call";
    if (e.k === "call" && !e.o) return "helper-call";
    if (e.k === "scall") return "static-call";
    return "call";
  }
  return s.k;
}

export function signatures({ program, display, prompt, choices, sim, query, canon, mode, difficulty, family, answerCanon }) {
  const { program: cp, map } = canonicalize(program);
  const progStr = JSON.stringify(cp);
  const branches = sim.trace.branches.join("");
  // equal-argument pattern among main-level constructions of the same class
  const firstIdx = new Map();
  const eqPattern = sim.trace.newArgs.map((a) => { if (!firstIdx.has(a.key)) firstIdx.set(a.key, firstIdx.size); return firstIdx.get(a.key); }).join(".");
  // object graph
  const ids = new Map();
  const ref = (v) => { if (!v || v.k !== "r") return v?.k === "n" ? "null" : "p"; if (!ids.has(v.id)) ids.set(v.id, ids.size + 1); return "o" + ids.get(v.id); };
  const graphVars = program.main.filter((s) => s.k === "decl").map((s) => ref(sim.vars[s.n])).join(",");
  const graph = `${graphVars}|created=${sim.created}|reach=${sim.reachable()}`;
  const ops = program.main.map(opKind).join(" ");
  const qCanon = query ? canonQuery(query, map) : "";
  const reasoningBase = canon ? `${canon}|${qCanon}` : `${progStr}|b=${branches}|x=${sim.exc || ""}|eq=${eqPattern}|${qCanon}|a=${answerCanon || ""}`;
  return {
    exact: hashHex(display + "\u0001" + prompt + "\u0001" + [...choices].sort().join("\u0002")),
    program: hashHex(progStr),
    graph: hashHex(graph), graphText: graph,
    ops: hashHex(ops), opsText: ops,
    framework: family,
    reasoning: hashHex(`${mode}|${difficulty}|${reasoningBase}`),
  };
}
function canonQuery(q, map) {
  const rn = (n) => map.get(n) || n;
  switch (q.kind) {
    case "count": return `count:${q.what}:${q.v ? rn(q.v) : ""}`;
    case "compare": return `compare:${q.want}`;
    default: return q.kind;
  }
}
/* canonical text of an expression or statement list, used for answer identity in compare/reverse */
export function canonFragment(fragment, map) {
  const s = JSON.stringify(fragment, (k, v) => {
    if (k === "n" && typeof v === "string") return map.get(v) || v;
    if (k === "c" && typeof v === "string") return map.get(v) || v;
    if (k === "v" && typeof v !== "boolean" && v !== null) return "#";
    return v;
  });
  return s;
}
