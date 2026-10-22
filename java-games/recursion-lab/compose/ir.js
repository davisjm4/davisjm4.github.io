/*
 * Recursion Lab compositional IR.
 * One JSON-safe program representation, two backends:
 *   renderJava(program)  -> the Java source shown to students
 *   run(program, call)   -> bounded interpreter with Java int/String/array semantics
 * Distractors come from running *transformed* programs (wrong mental models) through
 * the same interpreter; correctness is independently re-checked on a real JVM by tests.
 */
export const INT_MIN = -2147483648, INT_MAX = 2147483647;

// ---------- constructors ----------
export const num = v => ({ k: "num", v }), str = v => ({ k: "str", v }), bool = v => ({ k: "bool", v }), v = name => ({ k: "var", name });
export const bin = (op, a, b) => ({ k: "bin", op, a, b }), not = a => ({ k: "not", a }), neg = a => ({ k: "neg", a });
export const call = (name, ...args) => ({ k: "call", name, args }), len = s => ({ k: "len", s }), sub = (s, a, b) => ({ k: "sub", s, a, b });
export const eq = (a, b) => ({ k: "eq", a, b }), idx = (arr, i) => ({ k: "idx", arr, i }), alen = arr => ({ k: "alen", arr });
export const mmax = (a, b) => ({ k: "math", fn: "max", a, b }), mmin = (a, b) => ({ k: "math", fn: "min", a, b }), tern = (c, a, b) => ({ k: "tern", c, a, b });
export const If = (c, then, els) => ({ k: "if", c, then, els }), Ret = e => ({ k: "ret", e }), Print = (e, ln = false) => ({ k: "print", e, ln });
export const Decl = (type, name, e) => ({ k: "decl", type, name, e }), Assign = (name, e) => ({ k: "assign", name, e }), ASet = (arr, i, e) => ({ k: "aset", arr, i, e });
export const Do = e => ({ k: "expr", e });
export const method = (name, ret, params, body) => ({ name, ret, params: params.map(([type, n]) => ({ type, name: n })), body });
export const program = (methods, main) => ({ methods, main });   // main = name of the method students trace

// ---------- rendering ----------
const PREC = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
function prec(e) { return e.k === "bin" ? PREC[e.op] : e.k === "tern" ? 0 : e.k === "not" || e.k === "neg" ? 7 : 9; }
export function renderExpr(e, parent = -1, right = false) {
  let s;
  switch (e.k) {
    case "num": s = e.v < 0 ? `-${-e.v}` : String(e.v); if (e.v < 0 && parent >= 5) s = `(${s})`; return s;
    case "str": return JSON.stringify(e.v);
    case "bool": return String(e.v);
    case "var": return e.name;
    case "bin": { const p = PREC[e.op]; s = `${renderExpr(e.a, p, false)} ${e.op} ${renderExpr(e.b, p, true)}`; return p < parent || (p === parent && right) ? `(${s})` : s; }
    case "not": return `!${renderExpr(e.a, 7)}`;
    case "neg": return `-${renderExpr(e.a, 7)}`;
    case "call": return `${e.name}(${e.args.map(a => renderExpr(a)).join(", ")})`;
    case "len": return `${renderExpr(e.s, 9)}.length()`;
    case "sub": return `${renderExpr(e.s, 9)}.substring(${renderExpr(e.a)}${e.b ? `, ${renderExpr(e.b)}` : ""})`;
    case "eq": return `${renderExpr(e.a, 9)}.equals(${renderExpr(e.b)})`;
    case "idx": return `${renderExpr(e.arr, 9)}[${renderExpr(e.i)}]`;
    case "alen": return `${renderExpr(e.arr, 9)}.length`;
    case "math": return `Math.${e.fn}(${renderExpr(e.a)}, ${renderExpr(e.b)})`;
    case "tern": s = `${renderExpr(e.c, 1)} ? ${renderExpr(e.a, 1)} : ${renderExpr(e.b, 1)}`; return parent > 0 ? `(${s})` : s;
  }
  throw Error(`render: unknown expr ${e.k}`);
}
const JT = { int: "int", String: "String", "int[]": "int[]", boolean: "boolean", void: "void" };
function renderStmts(list, ind, out) { for (const s of list) renderStmt(s, ind, out); }
function renderStmt(s, ind, out) {
  const p = " ".repeat(ind);
  switch (s.k) {
    case "if": out.push(`${p}if (${renderExpr(s.c)}) {`); renderStmts(s.then, ind + 4, out);
      if (s.els && s.els.length === 1 && s.els[0].k === "if") { const inner = []; renderStmt(s.els[0], ind, inner); out.push(`${p}} else ${inner[0].trimStart()}`, ...inner.slice(1)); return; }
      if (s.els) { out.push(`${p}} else {`); renderStmts(s.els, ind + 4, out); } out.push(`${p}}`); return;
    case "ret": out.push(`${p}return${s.e ? " " + renderExpr(s.e) : ""};`); return;
    case "print": out.push(`${p}System.out.${s.ln ? "println" : "print"}(${renderExpr(s.e)});`); return;
    case "decl": out.push(`${p}${JT[s.type]} ${s.name} = ${renderExpr(s.e)};`); return;
    case "assign": out.push(`${p}${s.name} = ${renderExpr(s.e)};`); return;
    case "aset": out.push(`${p}${renderExpr(s.arr, 9)}[${renderExpr(s.i)}] = ${renderExpr(s.e)};`); return;
    case "expr": out.push(`${p}${renderExpr(s.e)};`); return;
  }
  throw Error(`render: unknown stmt ${s.k}`);
}
export function renderMethod(m, vis = "public") {
  const out = [`${vis} static ${JT[m.ret]} ${m.name}(${m.params.map(p => `${JT[p.type]} ${p.name}`).join(", ")}) {`];
  renderStmts(m.body, 4, out); out.push("}"); return out.join("\n");
}
export function renderJava(prog) { return prog.methods.map((m, i) => renderMethod(m, i === 0 ? "public" : (m.vis || "public"))).join("\n"); }
/** Lines of the rendered program (used by "which line" questions). */
export function javaLines(prog) { return renderJava(prog).split("\n"); }
export function renderValue(x) { return Array.isArray(x) ? `{${x.join(", ")}}` : typeof x === "string" ? JSON.stringify(x) : String(x); }

// ---------- interpreter ----------
export class JavaError extends Error { constructor(type, msg) { super(msg || type); this.javaType = type; } }
const chk = x => { if (!Number.isInteger(x) || x < INT_MIN || x > INT_MAX) throw new JavaError("Overflow", "int overflow (rejected composition)"); return x; };
export function run(prog, entry, args, { maxDepth = 800, maxSteps = 200000, onEvent } = {}) {
  const table = Object.fromEntries(prog.methods.map(m => [m.name, m]));
  const st = { out: "", calls: {}, depth: 0, maxDepth: 0, steps: 0, log: [], returns: [] };
  const RETURN = Symbol("ret");
  function ev(e, env) {
    if (++st.steps > maxSteps) throw new JavaError("Timeout");
    switch (e.k) {
      case "num": return e.v; case "str": return e.v; case "bool": return e.v;
      case "var": if (!(e.name in env)) throw Error(`unbound ${e.name}`); return env[e.name];
      case "not": return !ev(e.a, env);
      case "neg": return chk(-ev(e.a, env));
      case "bin": {
        if (e.op === "&&") return ev(e.a, env) ? !!ev(e.b, env) : false;
        if (e.op === "||") return ev(e.a, env) ? true : !!ev(e.b, env);
        const a = ev(e.a, env), b = ev(e.b, env);
        switch (e.op) {
          case "+": return typeof a === "string" || typeof b === "string" ? jstr(a) + jstr(b) : chk(a + b);
          case "-": return chk(a - b); case "*": return chk(a * b);
          case "/": if (b === 0) throw new JavaError("ArithmeticException"); return chk(Math.trunc(a / b));
          case "%": if (b === 0) throw new JavaError("ArithmeticException"); return a % b === 0 ? 0 : a % b;
          case "<": return a < b; case "<=": return a <= b; case ">": return a > b; case ">=": return a >= b;
          case "