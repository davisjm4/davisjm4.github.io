/*
 * Loop Lab Java model.
 * Generators build a small AST for a controlled Java subset. This module
 *   1. prints the AST as indented Java (what students see),
 *   2. prints an instrumented Java program (for JVM verification of counts),
 *   3. executes the AST with Java semantics (32-bit int, truncating division,
 *      remainder sign, compound-assignment narrowing, short-circuit && / ||,
 *      String concatenation, char values, block scope, break/continue),
 *      counting every statement execution, condition evaluation, loop-body
 *      entry and relational comparison.
 * No eval / Function / Math.random.
 */

export class JavaError extends Error {
  constructor(kind, detail = "") { super(`${kind}${detail ? ": " + detail : ""}`); this.kind = kind; }
}
export class ModelError extends Error {}

/* ---------- AST builders ---------- */
const E = (t, o) => ({ t, ...o });
export const J = {
  n: (v) => E("num", { v }), d: (v) => E("dbl", { v }), s: (v) => E("str", { v }), b: (v) => E("bool", { v }),
  ch: (v) => E("chr", { v }), v: (name) => E("var", { name }), arr: (items, elem = "int") => E("arr", { items, elem }),
  bin: (op, l, r) => E("bin", { op, l, r }),
  add: (l, r) => J.bin("+", l, r), sub: (l, r) => J.bin("-", l, r), mul: (l, r) => J.bin("*", l, r),
  div: (l, r) => J.bin("/", l, r), mod: (l, r) => J.bin("%", l, r),
  lt: (l, r) => J.bin("<", l, r), le: (l, r) => J.bin("<=", l, r), gt: (l, r) => J.bin(">", l, r), ge: (l, r) => J.bin(">=", l, r),
  eq: (l, r) => J.bin("==", l, r), ne: (l, r) => J.bin("!=", l, r), and: (l, r) => J.bin("&&", l, r), or: (l, r) => J.bin("||", l, r),
  not: (e) => E("un", { op: "!", e }), neg: (e) => E("un", { op: "-", e }),
  idx: (a, i) => E("idx", { a, i }), len: (a) => E("len", { a }),
  slen: (o) => E("call", { o, m: "length", args: [] }), charAt: (o, i) => E("call", { o, m: "charAt", args: [i] }),
  substr: (o, a, b) => E("call", { o, m: "substring", args: b === undefined ? [a] : [a, b] }),
  cast: (to, e) => E("cast", { to, e }),
  // statements
  decl: (type, name, e) => ({ t: "decl", type, name, e }),
  set: (name, e) => ({ t: "set", name, op: "=", e }),
  op: (name, op, e) => ({ t: "set", name, op, e }),
  inc: (name) => ({ t: "inc", name, op: "++" }), dec: (name) => ({ t: "inc", name, op: "--" }),
  print: (e) => ({ t: "print", e, ln: true }), printNo: (e) => ({ t: "print", e, ln: false }),
  iff: (c, then, els = null, opts = {}) => ({ t: "if", c, then, els, ...opts }),
  forL: (init, c, upd, body, opts = {}) => ({ t: "for", init, c, upd, body, ...opts }),
  whileL: (c, body, opts = {}) => ({ t: "while", c, body, ...opts }),
  brk: () => ({ t: "break" }), cont: () => ({ t: "continue" }),
  comment: (text) => ({ t: "comment", text }),
};
export const mark = (stmt, label) => ((stmt.mark = label), stmt);
export const tag = (stmt, name) => ((stmt.tag = name), stmt);

/* ---------- traversal ---------- */
export function children(st) {
  if (st.t === "for") return [st.init, st.upd, ...st.body].filter(Boolean);
  if (st.t === "while") return st.body;
  if (st.t === "if") return [...st.then, ...(st.els || [])];
  return [];
}
export function walk(stmts, fn, depth = 0, parent = null) {
  for (const st of stmts) {
    fn(st, depth, parent);
    if (st.t === "for") { if (st.init) fn(st.init, depth + 1, st); if (st.upd) fn(st.upd, depth + 1, st); walk(st.body, fn, depth + 1, st); }
    else if (st.t === "while") walk(st.body, fn, depth + 1, st);
    else if (st.t === "if") { walk(st.then, fn, depth, st); if (st.els) walk(st.els, fn, depth, st); }
  }
}
export function finalize(program) {
  let id = 0;
  walk(program, (st) => { st.id = id++; });
  return program;
}
export const clone = (x) => JSON.parse(JSON.stringify(x));
export function findTag(program, name) { let hit = null; walk(program, (st) => { if (st.tag === name && !hit) hit = st; }); return hit; }
export function findMark(program, label) { let hit = null; walk(program, (st) => { if (st.mark === label && !hit) hit = st; }); return hit; }
export function walkExpr(e, fn) {
  if (!e || typeof e !== "object") return;
  fn(e);
  for (const k of ["l", "r", "e", "a", "i", "o"]) if (e[k]) walkExpr(e[k], fn);
  if (e.args) e.args.forEach((x) => walkExpr(x, fn));
  if (e.items) e.items.forEach((x) => walkExpr(x, fn));
}

/* ---------- printing ---------- */
const PREC = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
const REL = new Set(["<", "<=", ">", ">=", "==", "!="]);
export function fmtDouble(x) {
  if (Object.is(x, -0)) return "-0.0";
  if (x === 0) return "0.0";
  if (!Number.isFinite(x)) throw new JavaError("UnsafeDouble", String(x));
  const a = Math.abs(x);
  if (a < 1e-3 || a >= 1e7) throw new JavaError("UnsafeDouble", String(x));
  if (Number.isInteger(x)) return x + ".0";
  const t = String(x);
  if (t.replace(/^-?\d*\./, "").length > 6) throw new JavaError("UnsafeDouble", t);
  return t;
}
const escStr = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
function exprPrec(e) {
  if (e.t === "bin") return PREC[e.op];
  if (e.t === "un" || e.t === "cast") return 7;
  if ((e.t === "num" || e.t === "dbl") && e.v < 0) return 7;
  return 8;
}
export function exprStr(e, inst = false) {
  const wrap = (child, minPrec, strict) => {
    const s = exprStr(child, inst), p = exprPrec(child);
    return p < minPrec || (strict && p === minPrec) ? `(${s})` : s;
  };
  switch (e.t) {
    case "num": return String(e.v);
    case "dbl": return Number.isInteger(e.v) ? e.v + ".0" : String(e.v);
    case "str": return `"${escStr(e.v)}"`;
    case "chr": return `'${e.v === "'" ? "\\'" : e.v}'`;
    case "bool": return String(e.v);
    case "var": return e.name;
    case "arr": return `{${e.items.map((x) => exprStr(x, inst)).join(", ")}}`;
    case "un": return e.op + wrap(e.e, 7, false);
    case "cast": return `(${e.to}) ${wrap(e.e, 7, false)}`;
    case "idx": return `${wrap(e.a, 8, false)}[${exprStr(e.i, inst)}]`;
    case "len": return `${wrap(e.a, 8, false)}.length`;
    case "call": return `${wrap(e.o, 8, false)}.${e.m}(${e.args.map((x) => exprStr(x, inst)).join(", ")})`;
    case "bin": {
      const p = PREC[e.op];
      const text = `${wrap(e.l, p, false)} ${e.op} ${wrap(e.r, p, true)}`;
      return inst && REL.has(e.op) ? `__k(${text})` : text;
    }
  }
  throw new ModelError("unknown expression " + e.t);
}
function simpleStr(st, inst) {
  switch (st.t) {
    case "decl": return `${st.type} ${st.name} = ${exprStr(st.e, inst)}`;
    case "set": return `${st.name} ${st.op} ${exprStr(st.e, inst)}`;
    case "inc": return `${st.name}${st.op}`;
    case "print": return `System.out.${st.ln ? "println" : "print"}(${exprStr(st.e, inst)})`;
    case "break": return "break";
    case "continue": return "continue";
  }
  throw new ModelError("not simple " + st.t);
}
/** Print program. opts.inst → instrumented Java. Returns {code, lines:{id:lineNumber}} */
export function printProgram(program, opts = {}) {
  const inst = !!opts.inst, out = [], lines = {};
  const blank = opts.blank; // statement id to replace with a placeholder
  const emit = (depth, text, st) => {
    if (st && st.id !== undefined && !(st.id in lines)) lines[st.id] = out.length + 1;
    out.push("    ".repeat(depth) + text + (st?.mark && !inst ? `  // ${st.mark}` : ""));
  };
  const cond = (st) => (inst ? `__c(${st.id}, ${exprStr(st.c, true)})` : exprStr(st.c));
  const pre = (st) => (inst ? `__S[${st.id}]++; ` : "");
  const block = (stmts, depth, loopId) => {
    if (inst && loopId !== undefined) out.push("    ".repeat(depth) + `__B[${loopId}]++;`);
    stmts.forEach((s) => stmt(s, depth));
  };
  function stmt(st, depth) {
    if (st.t === "comment") { if (!inst) emit(depth, `// ${st.text}`); return; }
    if (blank !== undefined && st.id === blank) { emit(depth, opts.blankText || "/* missing statement */", { id: st.id }); return; }
    if (st.t === "for") {
      if (inst) out.push("    ".repeat(depth) + `__S[${st.id}]++; __S[${st.init.id}]++;`);
      const updText = blank === st.upd.id ? (opts.blankText || "/* ??? */") : simpleStr(st.upd, inst) + (inst ? `, __S[${st.upd.id}]++` : "");
      emit(depth, `for (${simpleStr(st.init, inst)}; ${cond(st)}; ${updText}) {`, st);
      lines[st.init.id] = lines[st.id]; lines[st.upd.id] = lines[st.id];
      block(st.body, depth + 1, st.id); emit(depth, "}"); return;
    }
    if (st.t === "while") {
      if (inst) out.push("    ".repeat(depth) + `__S[${st.id}]++;`);
      emit(depth, `while (${cond(st)}) {`, st); block(st.body, depth + 1, st.id); emit(depth, "}"); return;
    }
    if (st.t === "if") {
      if (inst) out.push("    ".repeat(depth) + `__S[${st.id}]++;`);
      if (st.inline && !inst && st.then.length === 1 && !st.els && ["set", "inc", "print", "break", "continue"].includes(st.then[0].t)) {
        lines[st.then[0].id] = out.length + 1;
        emit(depth, `if (${cond(st)}) ${simpleStr(st.then[0])};`, st.mark ? st : { ...st, mark: st.then[0].mark }); return;
      }
      emit(depth, `if (${cond(st)}) {`, st);
      block(st.then, depth + 1);
      let els = st.els;
      while (els) {
        if (els.length === 1 && els[0].t === "if" && st.chain && !inst) {
          const e2 = els[0];
          if (inst) out.push("    ".repeat(depth + 1) + `__S[${e2.id}]++;`);
          emit(depth, `} else if (${cond(e2)}) {`, e2); block(e2.then, depth + 1); els = e2.els; continue;
        }
        emit(depth, "} else {"); block(els, depth + 1); els = null;
      }
      emit(depth, "}"); return;
    }
    emit(depth, pre(st) + simpleStr(st, inst) + ";", st);
  }
  program.forEach((s) => stmt(s, 0));
  return { code: out.join("\n"), lines };
}
export function countStatements(program) { let n = 0; walk(program, () => n++); return n; }
export function instrumentedClass(program, className = "Practice") {
  const { code } = printProgram(program, { inst: true });
  const n = countStatements(program) + 1;
  const body = code.split("\n").map((l) => "        " + l).join("\n");
  return `public class ${className} {
    static long[] __S = new long[${n}], __C = new long[${n}], __B = new long[${n}];
    static long __K = 0;
    static boolean __c(int id, boolean b) { __C[id]++; return b; }
    static boolean __k(boolean b) { __K++; return b; }
    public static void main(String[] args) {
${body}
        System.out.println();
        System.out.println("##S" + java.util.Arrays.toString(__S));
        System.out.println("##C" + java.util.Arrays.toString(__C));
        System.out.println("##B" + java.util.Arrays.toString(__B));
        System.out.println("##K" + __K);
    }
}`;
}
export function plainClass(program, className = "Practice") {
  const { code } = printProgram(program);
  return `public class ${className} {\n    public static void main(String[] args) {\n${code.split("\n").map((l) => "        " + l).join("\n")}\n    }\n}`;
}

/* ---------- interpreter ---------- */
const NUM = new Set(["int", "double", "char"]);
const val = (t, v) => ({ t, v });
export function javaString(x) {
  switch (x.t) {
    case "int": return String(x.v);
    case "double": return fmtDouble(x.v);
    case "boolean": return String(x.v);
    case "char": return String.fromCharCode(x.v);
    case "String": return x.v;
    default: throw new ModelError("cannot print " + x.t);
  }
}
export function displayValue(x) {
  if (!x) return "?";
  if (x.t === "String") return `"${x.v}"`;
  if (x.t === "char") return `'${String.fromCharCode(x.v)}'`;
  if (x.t.endsWith("[]")) return `{${x.v.map((e) => displayValue(e)).join(", ")}}`;
  return javaString(x);
}
function coerce(target, x, compound) {
  if (target === x.t) return x;
  if (target === "double" && (x.t === "int" || x.t === "char")) return val("double", x.v);
  if (target === "int" && x.t === "char") return val("int", x.v);
  if (compound) {
    if (target === "int" && x.t === "double") return val("int", Math.trunc(x.v) | 0);
    if (target === "String") return val("String", javaString(x));
    if (target === "char" && x.t === "int") return val("char", x.v & 0xffff);
  }
  throw new ModelError(`type mismatch: ${x.t} -> ${target}`);
}

export function run(program, opts = {}) {
  const limit = opts.stepLimit || 200000, traceLimit = opts.traceLimit ?? 600;
  const S = {}, C = {}, B = {}, condTrue = {};
  let K = 0, steps = 0, loopDepth = 0, writes = 0, accWrites = 0;
  const trace = [], out = [""], scopes = [new Map()];
  const changed = new Set(), controlVars = new Set();
  walk(program, (st) => {
    if (st.t === "for" && st.init) controlVars.add(st.init.name);
    if (st.t === "while") walkExpr(st.c, (e) => { if (e.t === "var") controlVars.add(e.name); });
  });
  const bump = (m, id) => (m[id] = (m[id] || 0) + 1);
  const tick = () => { if (++steps > limit) throw new JavaError("StepLimit", "loop did not terminate within the safety limit"); };
  const lookup = (name) => { for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(name)) return scopes[i]; throw new ModelError("undeclared " + name); };
  const snapshot = () => {
    const o = {};
    for (const sc of scopes) for (const [k, x] of sc) if (!x.t.endsWith("[]")) o[k] = displayValue(x);
    return o;
  };
  function write(name, x, compound) {
    const sc = lookup(name), cur = sc.get(name);
    sc.set(name, coerce(cur.t, x, compound));
    if (loopDepth > 0) { changed.add(name); writes++; if (compound && !controlVars.has(name)) accWrites++; }
  }
  function num(x) { if (!NUM.has(x.t)) throw new ModelError("not numeric " + x.t); return x.v; }
  function arith(op, a, b) {
    const dbl = a.t === "double" || b.t === "double";
    const x = num(a), y = num(b);
    if (dbl) {
      if (op === "+") return val("double", x + y); if (op === "-") return val("double", x - y);
      if (op === "*") return val("double", x * y); if (op === "/") return val("double", x / y);
      if (op === "%") return val("double", x % y);
    }
    if (op === "+") return val("int", (x + y) | 0); if (op === "-") return val("int", (x - y) | 0);
    if (op === "*") return val("int", Math.imul(x, y));
    if (op === "/") { if (y === 0) throw new JavaError("ArithmeticException", "/ by zero"); return val("int", Math.trunc(x / y) | 0); }
    if (op === "%") { if (y === 0) throw new JavaError("ArithmeticException", "/ by zero"); return val("int", (x % y) | 0); }
    throw new ModelError("op " + op);
  }
  function ev(e) {
    switch (e.t) {
      case "num": return val("int", e.v);
      case "dbl": return val("double", e.v);
      case "str": return val("String", e.v);
      case "chr": return val("char", e.v.charCodeAt(0));
      case "bool": return val("boolean", e.v);
      case "var": return lookup(e.name).get(e.name);
      case "arr": return val(e.elem + "[]", e.items.map(ev));
      case "un": { const x = ev(e.e); if (e.op === "!") { if (x.t !== "boolean") throw new ModelError("! non-boolean"); return val("boolean", !x.v); } return x.t === "double" ? val("double", -x.v) : val("int", -num(x) | 0); }
      case "cast": { const x = ev(e.e); if (e.to === "double") return val("double", num(x)); if (e.to === "int") return val("int", Math.trunc(num(x)) | 0); throw new ModelError("cast"); }
      case "idx": { const a = ev(e.a), i = num(ev(e.i)); if (i < 0 || i >= a.v.length) throw new JavaError("ArrayIndexOutOfBoundsException", `Index ${i} out of bounds for length ${a.v.length}`); return a.v[i]; }
      case "len": return val("int", ev(e.a).v.length);
      case "call": {
        const o = ev(e.o); if (o.t !== "String") throw new ModelError("call on " + o.t);
        const args = e.args.map((x) => num(ev(x)));
        if (e.m === "length") return val("int", o.v.length);
        if (e.m === "charAt") { if (args[0] < 0 || args[0] >= o.v.length) throw new JavaError("StringIndexOutOfBoundsException", "index " + args[0]); return val("char", o.v.charCodeAt(args[0])); }
        if (e.m === "substring") { const a = args[0], b = args.length > 1 ? args[1] : o.v.length; if (a < 0 || b > o.v.length || a > b) throw new JavaError("StringIndexOutOfBoundsException", `begin ${a}, end ${b}`); return val("String", o.v.slice(a, b)); }
        throw new ModelError("method " + e.m);
      }
      case "bin": {
        if (e.op === "&&" || e.op === "||") {
          const l = ev(e.l); if (l.t !== "boolean") throw new ModelError("logic");
          if (e.op === "&&" ? !l.v : l.v) return l;
          const r = ev(e.r); if (r.t !== "boolean") throw new ModelError("logic"); return r;
        }
        const l = ev(e.l), r = ev(e.r);
        if (REL.has(e.op)) {
          K++;
          if (l.t === "String" || r.t === "String") throw new ModelError("String compared with ==");
          if (l.t === "boolean" || r.t === "boolean") { if (l.t !== r.t || !["==", "!="].includes(e.op)) throw new ModelError("bool compare"); return val("boolean", e.op === "==" ? l.v === r.v : l.v !== r.v); }
          const x = num(l), y = num(r);
          const res = { "<": x < y, "<=": x <= y, ">": x > y, ">=": x >= y, "==": x === y, "!=": x !== y }[e.op];
          return val("boolean", res);
        }
        if (e.op === "+" && (l.t === "String" || r.t === "String")) return val("String", javaString(l) + javaString(r));
        return arith(e.op, l, r);
      }
    }
    throw new ModelError("unknown expression " + e.t);
  }
  function test(st) {
    tick(); bump(C, st.id);
    const r = ev(st.c); if (r.t !== "boolean") throw new ModelError("condition not boolean");
    if (r.v) bump(condTrue, st.id);
    if ((st.t === "for" || st.t === "while") && trace.length < traceLimit) trace.push({ loop: st.id, result: r.v, vars: snapshot() });
    return r.v;
  }
  function simple(st) {
    switch (st.t) {
      case "decl": {
        const top = scopes[scopes.length - 1];
        for (const sc of scopes) if (sc.has(st.name)) throw new ModelError("redeclared " + st.name);
        top.set(st.name, coerce(st.type, ev(st.e), false));
        if (loopDepth > 0) { changed.add(st.name); writes++; }
        return;
      }
      case "set": {
        if (st.op === "=") return write(st.name, ev(st.e), false);
        const cur = lookup(st.name).get(st.name), rhs = ev(st.e), op = st.op[0];
        const res = op === "+" && cur.t === "String" ? val("String", cur.v + javaString(rhs)) : arith(op, cur, rhs);
        return write(st.name, res, true);
      }
      case "inc": { const cur = lookup(st.name).get(st.name); return write(st.name, arith(st.op === "++" ? "+" : "-", cur, val("int", 1)), true); }
      case "print": { const text = javaString(ev(st.e)); out[out.length - 1] += text; if (st.ln) out.push(""); return; }
    }
    throw new ModelError("statement " + st.t);
  }
  function block(stmts) {
    scopes.push(new Map());
    try { for (const s of stmts) { const sig = exec(s); if (sig) return sig; } } finally { scopes.pop(); }
    return null;
  }
  function exec(st) {
    if (st.t === "comment") return null;
    tick(); bump(S, st.id);
    switch (st.t) {
      case "break": return "break";
      case "continue": return "continue";
      case "if": return test(st) ? block(st.then) : st.els ? block(st.els) : null;
      case "while": {
        loopDepth++;
        try { while (test(st)) { bump(B, st.id); const sig = block(st.body); if (sig === "break") break; } } finally { loopDepth--; }
        return null;
      }
      case "for": {
        scopes.push(new Map());
        try {
          tick(); bump(S, st.init.id); simple(st.init);
          loopDepth++;
          while (test(st)) {
            bump(B, st.id);
            const sig = block(st.body); if (sig === "break") break;
            tick(); bump(S, st.upd.id); simple(st.upd);
          }
        } finally { loopDepth--; scopes.pop(); }
        return null;
      }
      default: simple(st); return null;
    }
  }
  let error = null;
  try { for (const s of program) { if (exec(s)) throw new ModelError("break outside loop"); } }
  catch (err) { if (err instanceof JavaError) error = err; else throw err; }
  const finalVars = {};
  for (const [k, x] of scopes[0]) finalVars[k] = x;
  const lines = out.at(-1) === "" ? out.slice(0, -1) : out;
  return { ok: !error, error: error ? error.kind : null, errorDetail: error?.message || null, output: lines, outputText: lines.join("\n"), vars: finalVars, S, C, B, condTrue, K, steps, trace, changed: [...changed], writes, accWrites };
}

export function staticShape(program) {
  let maxDepth = 0, loops = 0, ifs = 0, logic = 0, stmts = 0;
  const depthOf = (stmts, d) => { for (const st of stmts) { if (st.t === "for" || st.t === "while") { loops++; maxDepth = Math.max(maxDepth, d + 1); depthOf(st.body, d + 1); } else if (st.t === "if") { ifs++; depthOf(st.then, d); if (st.els) depthOf(st.els, d); } } };
  depthOf(program, 0);
  let exits = 0, dependent = 0;
  walk(program, (st) => { stmts++; if (st.t === "break" || st.t === "continue") exits++; if (st.c) walkExpr(st.c, (e) => { if (e.t === "bin" && (e.op === "&&" || e.op === "||")) logic++; }); });
  const refs = (e, names) => { let hit = false; walkExpr(e, (x) => { if (x.t === "var" && names.includes(x.name)) hit = true; }); return hit; };
  const scan = (stmts, outer) => { for (const st of stmts) {
    if (st.t === "for" || st.t === "while") {
      if (outer.length && (refs(st.c, outer) || (st.init && refs(st.init.e, outer)))) dependent++;
      const cv = st.t === "for" ? [st.init.name] : []; walkExpr(st.c, (x) => { if (st.t === "while" && x.t === "var") cv.push(x.name); });
      scan(st.body, [...outer, ...cv]);
    } else if (st.t === "if") { scan(st.then, outer); if (st.els) scan(st.els, outer); }
  } };
  scan(program, []);
  return { nestingDepth: maxDepth, loops, ifs, logicalOperators: logic, statements: stmts, earlyExits: exits, dependentBounds: dependent };
}
