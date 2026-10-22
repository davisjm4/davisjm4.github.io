/* Structural invariants checked before a program can become a challenge. They reject IR that
 * would not compile (duplicate declarations, clashing signatures, unknown classes) independently of the
 * simulator. Runtime invariants (every reference points to an existing object or null, typed values,
 * step bounds) are enforced inside sim.js. */
const sig = (n, ps) => n + "(" + ps.map((p) => p.t).join(",") + ")";
export function validateProgram(p) {
  const problems = [];
  const classNames = new Set();
  for (const c of p.classes) {
    if (classNames.has(c.n) || c.n === "Main") problems.push("duplicate class " + c.n);
    classNames.add(c.n);
    const f = new Set();
    for (const x of c.fields) { if (f.has(x.n)) problems.push(`duplicate field ${c.n}.${x.n}`); f.add(x.n); }
    const ms = new Set();
    for (const m of c.methods) { const s = sig(m.n, m.params); if (ms.has(s)) problems.push(`duplicate method ${c.n}.${s}`); ms.add(s); }
    const ks = new Set();
    for (const k of c.ctors) { const s = sig("", k.params); if (ks.has(s)) problems.push(`duplicate constructor ${c.n}${s}`); ks.add(s); const pn = new Set(); for (const q of k.params) { if (pn.has(q.n)) problems.push("duplicate parameter " + q.n); pn.add(q.n); } }
    for (const m of c.methods) { const pn = new Set(); for (const q of m.params) { if (pn.has(q.n)) problems.push("duplicate parameter " + q.n); pn.add(q.n); } }
  }
  const types = new Set(["int", "double", "boolean", "char", "String", "void", ...classNames]);
  const checkType = (t, where) => { if (!types.has(t)) problems.push(`unknown type ${t} in ${where}`); };
  for (const c of p.classes) { c.fields.forEach((x) => checkType(x.t, c.n)); c.methods.forEach((m) => { checkType(m.ret, c.n); m.params.forEach((q) => checkType(q.t, c.n)); }); }
  const hs = new Set();
  for (const h of p.helpers) { const s = sig(h.n, h.params); if (hs.has(s)) problems.push("duplicate helper " + s); hs.add(s); checkType(h.ret, "helper"); }
  const locals = new Set();
  for (const s of p.main) if (s.k === "decl") { if (locals.has(s.n)) problems.push("duplicate local " + s.n); locals.add(s.n); checkType(s.t, "main"); }
  return problems;
}
