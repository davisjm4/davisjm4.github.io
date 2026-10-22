/* JSON-safe intermediate representation for a small, validated Java subset.
 * One IR is the single source of truth: emit.js renders Java from it and
 * sim.js executes it. See GENERATOR_SCHEMA.md for the full grammar. */

// ---------- expressions ----------
export const lit = (v) => ({ k: "lit", t: "int", v });
export const dbl = (v) => ({ k: "lit", t: "double", v });
export const bool = (v) => ({ k: "lit", t: "boolean", v: !!v });
export const str = (v) => ({ k: "lit", t: "String", v });
export const chr = (v) => ({ k: "lit", t: "char", v });
export const nul = () => ({ k: "lit", t: "null", v: null });
export const nm = (n) => ({ k: "name", n });
export const th = () => ({ k: "this" });
export const fld = (o, n) => ({ k: "fld", o: typeof o === "string" ? nm(o) : o, n });
export const tf = (n) => fld(th(), n); // this.n
export const sfld = (c, n) => ({ k: "sfld", c, n });
export const nw = (c, ...args) => ({ k: "new", c, args });
export const call = (o, n, ...args) => ({ k: "call", o: o == null ? null : typeof o === "string" ? nm(o) : o, n, args });
export const scall = (c, n, ...args) => ({ k: "scall", c, n, args });
export const bin = (op, l, r) => ({ k: "bin", op, l, r });
export const not = (e) => ({ k: "un", op: "!", e });
export const neg = (e) => ({ k: "un", op: "-", e });
export const tern = (c, a, b) => ({ k: "tern", c, a, b });
export const math = (f, ...args) => ({ k: "math", f, args });

// ---------- statements ----------
export const decl = (t, n, e) => ({ k: "decl", t, n, e: e ?? null });
export const asg = (tg, e, op = "=") => ({ k: "asg", tg: typeof tg === "string" ? nm(tg) : tg, op, e });
export const inc = (tg, op = "++") => ({ k: "inc", tg: typeof tg === "string" ? nm(tg) : tg, op });
export const ex = (e) => ({ k: "ex", e });
export const iff = (c, thn, els = null) => ({ k: "if", c, th: thn, el: els });
export const ret = (e) => ({ k: "ret", e: e ?? null });
export const pr = (e) => ({ k: "print", e });

// ---------- declarations ----------
export const field = (t, n, opts = {}) => ({ t, n, st: !!opts.st, acc: opts.acc ?? "private", init: opts.init ?? null });
export const param = (t, n) => ({ t, n });
export const ctor = (params, body, opts = {}) => ({ params, body, acc: opts.acc ?? "public", chain: opts.chain ?? null });
export const method = (n, ret0, params, body, opts = {}) => ({ n, ret: ret0, params, body, st: !!opts.st, acc: opts.acc ?? "public", meta: opts.meta ?? null });
export const cls = (n, fields, ctors, methods) => ({ n, fields, ctors, methods });

export const PRIMS = new Set(["int", "double", "boolean", "char"]);
export const isRefType = (t) => !PRIMS.has(t);
export const clone = (x) => JSON.parse(JSON.stringify(x));

/* Walk every expression/statement node (pre-order). fn(node, parentKind) */
export function walk(node, fn) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, fn)); return; }
  if (node.k) fn(node);
  for (const key of ["e", "tg", "c", "a", "b", "l", "r", "o", "th", "el", "args", "body", "init", "chain"]) {
    if (node[key] && typeof node[key] === "object") walk(node[key], fn);
  }
}
export function walkProgram(p, fn) {
  for (const c of p.classes) {
    for (const f of c.fields) if (f.init) walk(f.init, fn);
    for (const k of c.ctors) { if (k.chain) walk(k.chain.args, fn); walk(k.body, fn); }
    for (const m of c.methods) walk(m.body, fn);
  }
  for (const h of p.helpers) walk(h.body, fn);
  walk(p.main, fn);
}
