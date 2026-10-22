/* Deterministic interpreter for the IR Java subset.
 *
 * Models: heap objects with stable identities, instance fields (typed defaults), class-level
 * static fields, local/parameter frames with block scopes, name resolution (local -> field ->
 * static, so shadowing behaves as in Java), pass-by-value of primitives AND reference values,
 * constructor execution order (this(...) chain, then field initialisers, then body), overloads by
 * arity/type, returns, if/else, ternary, Math.min/max/abs, int arithmetic (32-bit, truncating
 * division), double printing, String concatenation (String.valueOf rules), toString overrides,
 * == on references (identity) and primitives, NullPointerException on dereferencing null.
 *
 * Misconception models: `m` is a set of flags. With no flags the interpreter is the correct Java
 * semantics; each flag changes ONE rule so that a distractor is the exact output of a specific
 * wrong mental model (documented in distractors.js).
 */
import { jdouble } from "./emit.js";
import { PRIMS } from "./ir.js";

export class JavaException extends Error { constructor(name) { super(name); this.jname = name; } }
class StepLimit extends Error {}

const V = {
  i: (v) => ({ k: "i", v: v | 0 }),
  d: (v) => ({ k: "d", v }),
  b: (v) => ({ k: "b", v: !!v }),
  s: (v) => ({ k: "s", v }),
  c: (v) => ({ k: "c", v }),
  r: (id) => ({ k: "r", id }),
  n: () => ({ k: "n" }),
};
const baseDefault = (t) => t === "int" ? V.i(0) : t === "double" ? V.d(0) : t === "boolean" ? V.b(false) : t === "char" ? V.c("\u0000") : V.n();
const num = (x) => x.k === "i" || x.k === "d" || x.k === "c";
const numv = (x) => x.k === "c" ? x.v.charCodeAt(0) : x.v;

export function simulate(program, opts = {}) {
  const m = opts.m || {};
  const maxSteps = opts.maxSteps ?? 4000;
  const classes = Object.fromEntries(program.classes.map((c) => [c.n, c]));
  const heap = new Map(); // id -> {id, cls, f:{}, sf:{}}
  let nextId = 1, steps = 0;
  const statics = {};
  const shared = {}; // instanceAsStatic storage
  const lastOf = {}; // staticAsInstance: last created object of class
  const trace = { allocs: [], fieldWrites: 0, staticWrites: 0, calls: 0, branches: [], helperCalls: 0, events: [], newArgs: [], exc: null, stmtStates: [] };
  const out = [];
  let mainStmtIndex = -1;
  const tsCache = new Map(); // toStringAtCreation
  const born = new Map(); // onlyLastUpdate snapshots

  const defaultFor = (t) => {
    if (m.defaultsNull && t !== "char") return V.n();
    if (m.boolDefaultTrue && t === "boolean") return V.b(true);
    if (m.stringDefaultEmpty && t === "String") return V.s("");
    if (m.doubleDefaultInt && t === "double") return V.i(0);
    return baseDefault(t);
  };
  const tick = () => { if (++steps > maxSteps) throw new StepLimit("step limit"); };
  const fieldDef = (cn, n) => classes[cn]?.fields.find((f) => f.n === n);
  const instField = (cn, n) => { const f = fieldDef(cn, n); return f && !f.st ? f : null; };
  const staticField = (cn, n) => { const f = fieldDef(cn, n); return f && f.st ? f : null; };

  // ---- static init (constant initialisers only, so eager init is observably identical)
  for (const c of program.classes) {
    statics[c.n] = {};
    for (const f of c.fields) if (f.st) statics[c.n][f.n] = f.init ? coerce(evalE(f.init, staticFrame(c.n)), f.t) : defaultFor(f.t);
  }

  function staticFrame(cn) { return { scopes: [new Map()], self: null, cls: cn, kind: "static", bind: {} }; }

  // ---- object field storage (instanceAsStatic redirects to a per-class shared slot)
  function getF(id, n) {
    const o = heap.get(id);
    if (m.instanceAsStatic) { const s = shared[o.cls]; return s && n in s ? s[n] : o.f[n]; }
    return o.f[n];
  }
  function setF(id, n, v) {
    const o = heap.get(id);
    trace.fieldWrites++;
    if (m.instanceAsStatic) { (shared[o.cls] ||= {})[n] = v; }
    o.f[n] = v;
  }
  function getS(cn, n, self) {
    if (m.staticAsInstance) {
      const o = self != null && heap.get(self)?.cls === cn ? heap.get(self) : (lastOf[cn] != null ? heap.get(lastOf[cn]) : null);
      if (o && n in o.sf) return o.sf[n];
    }
    return statics[cn][n];
  }
  function setS(cn, n, v, self) {
    trace.staticWrites++;
    if (m.staticAsInstance) {
      const o = self != null && heap.get(self)?.cls === cn ? heap.get(self) : (lastOf[cn] != null ? heap.get(lastOf[cn]) : null);
      if (o) { o.sf[n] = v; return; }
    }
    statics[cn][n] = v;
  }

  function coerce(v, t) {
    if (t === "double" && v.k === "i") return V.d(v.v);
    if (t === "int" && v.k === "c") return V.i(v.v.charCodeAt(0));
    return v;
  }

  // ---- name resolution: local/param -> instance field of this -> static field of class
  function lookupLocal(fr, n) { for (let i = fr.scopes.length - 1; i >= 0; i--) if (fr.scopes[i].has(n)) return fr.scopes[i]; return null; }
  function readName(fr, n) {
    const sc = lookupLocal(fr, n);
    if (sc) return sc.get(n);
    if (fr.cls) {
      if (fr.self != null && instField(fr.cls, n)) return getF(fr.self, n);
      if (staticField(fr.cls, n)) return getS(fr.cls, n, fr.self);
    }
    throw Error("sim: unresolved name " + n);
  }
  function writeName(fr, n, v) {
    const sc = lookupLocal(fr, n);
    if (sc) {
      // misconception: an unqualified name that shadows a field is believed to be the field
      if (m.shadowAssignsField && fr.cls && fr.self != null && instField(fr.cls, n)) { setF(fr.self, n, coerce(v, instField(fr.cls, n).t)); return; }
      sc.set(n, v);
      // misconception: Java passes by reference (caller variable is rebound)
      const b = fr.bind[n];
      if (b && ((m.paramByRef && v.k === "r") || (m.paramByRef && v.k === "n") || (m.primByRef && v.k !== "r" && v.k !== "n"))) {
        const csc = lookupLocal(b.frame, b.name); if (csc) csc.set(b.name, v);
      }
      return;
    }
    if (fr.cls) {
      if (fr.self != null && instField(fr.cls, n)) { setF(fr.self, n, coerce(v, instField(fr.cls, n).t)); return; }
      if (staticField(fr.cls, n)) { setS(fr.cls, n, coerce(v, staticField(fr.cls, n).t), fr.self); return; }
    }
    throw Error("sim: unresolved write " + n);
  }
  function deref(v) { if (v.k === "n") throw new JavaException("NullPointerException"); if (v.k !== "r") throw Error("sim: deref non-reference"); return v.id; }

  function cloneObj(id) {
    const o = heap.get(id), nid = nextId++;
    heap.set(nid, { id: nid, cls: o.cls, f: { ...o.f }, sf: { ...o.sf }, clone: true, src: o.src ?? id });
    return V.r(nid);
  }

  // ---- string conversion (String.valueOf semantics)
  function toS(v) {
    switch (v.k) {
      case "i": return String(v.v);
      case "d": return jdouble(v.v);
      case "b": return v.v ? "true" : "false";
      case "s": return v.v;
      case "c": return v.v;
      case "n": return "null";
      case "r": return objToString(v.id);
    }
  }
  function objToString(id) {
    const o = heap.get(id);
    const meth = classes[o.cls].methods.find((x) => x.n === "toString" && x.params.length === 0 && !x.st);
    if (!meth) return `${o.cls}@<hash>`; // identity hash: never presented as a predictable value
    if (m.toStringAtCreation && tsCache.has(id)) return tsCache.get(id);
    return invoke(meth, o.cls, id, [], null, null).v;
  }

  // ---- expressions
  function evalE(e, fr) {
    tick();
    switch (e.k) {
      case "__v": return e.v; // pseudo-expression used for compound assignment
      case "lit":
        return e.t === "int" ? V.i(e.v) : e.t === "double" ? V.d(e.v) : e.t === "boolean" ? V.b(e.v) : e.t === "String" ? V.s(e.v) : e.t === "char" ? V.c(e.v) : V.n();
      case "name": return readName(fr, e.n);
      case "this": return V.r(fr.self);
      case "fld": {
        if (m.thisMeansParam && e.o.k === "this" && lookupLocal(fr, e.n)) return readName(fr, e.n);
        const id = deref(evalE(e.o, fr));
        return getF(id, e.n);
      }
      case "sfld": return getS(e.c, e.n, null);
      case "new": return construct(e, fr);
      case "call": return evalCall(e, fr);
      case "scall": {
        const c = classes[e.c]; const args = e.args.map((a) => evalE(a, fr));
        const meth = resolve(c.methods.filter((x) => x.st && x.n === e.n), e.args, fr, args);
        return invoke(meth, e.c, null, args, e.args, fr);
      }
      case "math": {
        const a = e.args.map((x) => evalE(x, fr));
        if (e.f === "abs") return a[0].k === "d" ? V.d(Math.abs(a[0].v)) : V.i(Math.abs(a[0].v));
        if (m.ignoreClamp && (e.f === "min" || e.f === "max")) {
          const litIdx = e.args.findIndex((x) => x.k === "lit");
          if (litIdx >= 0) return a[1 - litIdx];
        }
        const r = e.f === "min" ? Math.min(a[0].v, a[1].v) : Math.max(a[0].v, a[1].v);
        trace.branches.push(r === a[0].v ? 0 : 1);
        return a[0].k === "d" || a[1].k === "d" ? V.d(r) : V.i(r);
      }
      case "un": {
        const v = evalE(e.e, fr);
        if (e.op === "!") return V.b(!v.v);
        return v.k === "d" ? V.d(-v.v) : V.i(-v.v);
      }
      case "tern": {
        const c = evalE(e.c, fr).v;
        trace.branches.push(c ? 1 : 0);
        return evalE(c ? e.a : e.b, fr);
      }
      case "bin": return evalBin(e, fr);
    }
    throw Error("sim: unknown expr " + e.k);
  }
  function evalBin(e, fr) {
    if (e.op === "&&") { const l = evalE(e.l, fr); return l.v ? evalE(e.r, fr) : V.b(false); }
    if (e.op === "||") { const l = evalE(e.l, fr); return l.v ? V.b(true) : evalE(e.r, fr); }
    const l = evalE(e.l, fr), r = evalE(e.r, fr);
    if (e.op === "+" && (l.k === "s" || r.k === "s" || (l.k === "n" && e.l.k !== "lit" && isStringTyped(e.l, fr)) || (r.k === "n" && isStringTyped(e.r, fr)))) {
      if (m.nullPrintThrows && (l.k === "n" || r.k === "n")) throw new JavaException("NullPointerException");
      return V.s(toS(l) + toS(r));
    }
    if (e.op === "==" || e.op === "!=") {
      let eq;
      if (m.valuesAsIdentity && e.l.k === "call" && e.r.k === "call" && e.l.o && e.r.o && l.k !== "r" && r.k !== "r") {
        const a = evalE(e.l.o, fr), b = evalE(e.r.o, fr);
        return V.b((e.op === "==") === (a.k === "r" && b.k === "r" && a.id === b.id));
      }
      if ((l.k === "r" || l.k === "n") && (r.k === "r" || r.k === "n")) {
        eq = l.k === "n" ? r.k === "n" : r.k === "r" && l.id === r.id;
        if (m.identityAsContent && l.k === "r" && r.k === "r" && heap.get(l.id).cls === heap.get(r.id).cls) eq = sameContent(l.id, r.id);
      } else if (l.k === "b") eq = l.v === r.v;
      else eq = numv(l) === numv(r);
      return V.b(e.op === "==" ? eq : !eq);
    }
    // arithmetic/relational operators never see null in valid programs; a misconception model that
    // produces it is incoherent, so the run is discarded rather than inventing a value
    if (!num(l) || !num(r)) throw Error("sim: non-numeric operand");
    const a = numv(l), b = numv(r), dbl = l.k === "d" || r.k === "d";
    switch (e.op) {
      case "<": return V.b(a < b);
      case "<=": return V.b(a <= b);
      case ">": return V.b(a > b);
      case ">=": return V.b(a >= b);
      case "+": return dbl ? V.d(a + b) : V.i(a + b);
      case "-": return dbl ? V.d(a - b) : V.i(a - b);
      case "*": return dbl ? V.d(a * b) : V.i(Math.imul(a, b));
      case "/": if (!dbl && b === 0) throw new JavaException("ArithmeticException"); return dbl ? V.d(a / b) : V.i(Math.trunc(a / b));
      case "%": if (!dbl && b === 0) throw new JavaException("ArithmeticException"); return dbl ? V.d(a % b) : V.i(a % b);
    }
    throw Error("sim: op " + e.op);
  }
  function isStringTyped(e, fr) {
    // static type String for a null-valued operand (field/local declared String)
    if (e.k === "name") {
      const decl = fr.types?.get?.(e.n);
      if (decl) return decl === "String";
      if (fr.cls) { const f = fieldDef(fr.cls, e.n); return f?.t === "String"; }
    }
    if (e.k === "fld") { /* field of some object */ for (const c of program.classes) { const f = c.fields.find((x) => x.n === e.n); if (f) return f.t === "String"; } }
    if (e.k === "call") { for (const c of program.classes) { const mm = c.methods.find((x) => x.n === e.n); if (mm) return mm.ret === "String"; } }
    return false;
  }
  function sameContent(a, b) {
    const A = heap.get(a), B = heap.get(b);
    return Object.keys(A.f).every((k) => JSON.stringify(getF(a, k)) === JSON.stringify(getF(b, k)));
  }

  function argType(v) { return v.k === "i" ? "int" : v.k === "d" ? "double" : v.k === "b" ? "boolean" : v.k === "s" ? "String" : v.k === "c" ? "char" : v.k === "r" ? heap.get(v.id).cls : "null"; }
  function assignable(vt, pt) {
    if (vt === pt) return true;
    if (pt === "double" && (vt === "int" || vt === "char")) return true;
    if (pt === "int" && vt === "char") return true;
    if (vt === "null" && !PRIMS.has(pt)) return true;
    return false;
  }
  function resolve(cands, argExprs, fr, vals) {
    const n = argExprs.length;
    const byArity = cands.filter((c) => c.params.length === n);
    if (byArity.length <= 1) { if (!byArity.length) throw Error("sim: no overload"); return byArity[0]; }
    const vs = vals;
    const exact = byArity.filter((c) => c.params.every((p, i) => argType(vs[i]) === p.t));
    if (exact.length) return exact[0];
    const ok = byArity.filter((c) => c.params.every((p, i) => assignable(argType(vs[i]), p.t)));
    if (!ok.length) throw Error("sim: no applicable overload");
    return ok[0];
  }

  function evalCall(e, fr) {
    if (!e.o) {
      if (fr.cls) {
        const c = classes[fr.cls];
        const args = e.args.map((a) => evalE(a, fr));
        const meth = resolve(c.methods.filter((x) => x.n === e.n), e.args, fr, args);
        return invoke(meth, fr.cls, meth.st ? null : fr.self, args, e.args, fr);
      }
      const args = e.args.map((a) => evalE(a, fr));
      const h = resolve(program.helpers.filter((x) => x.n === e.n), e.args, fr, args);
      trace.helperCalls++;
      return invoke(h, null, null, args, e.args, fr);
    }
    const rv = evalE(e.o, fr);
    if (rv.k === "s") { // java.lang.String methods used by the generator
      if (e.n === "length") return V.i(rv.v.length);
      if (e.n === "toUpperCase") return V.s(rv.v.toUpperCase());
      throw Error("sim: String." + e.n);
    }
    if (rv.k === "n" && m.nullCallPrintsNull) return V.s("null");
    const id = deref(rv);
    const cn = heap.get(id).cls;
    const args = e.args.map((a) => evalE(a, fr));
    if (e.n === "toString" && !classes[cn].methods.some((x) => x.n === "toString")) return V.s(objToString(id));
    const meth = resolve(classes[cn].methods.filter((x) => x.n === e.n && !x.st), e.args, fr, args);
    return invoke(meth, cn, id, args, e.args, fr);
  }

  function invoke(meth, cn, self, args, argExprs, caller) {
    tick();
    trace.calls++;
    let selfId = self;
    const fr = { scopes: [new Map()], self: selfId, cls: cn, kind: cn ? (meth.st ? "static" : "method") : "helper", bind: {}, types: new Map(), meth };
    meth.params.forEach((p, i) => {
      let v = coerce(args[i], p.t);
      if (m.paramDeepCopy && v.k === "r" && caller && (cn === null)) v = cloneObj(v.id);
      fr.scopes[0].set(p.n, v); fr.types.set(p.n, p.t);
      if (argExprs && argExprs[i]?.k === "name" && caller) fr.bind[p.n] = { frame: caller, name: argExprs[i].n };
    });
    if (m.thisIsArgument && selfId != null) {
      const p = meth.params.find((pp) => pp.t === cn);
      if (p) { const other = fr.scopes[0].get(p.n); if (other.k === "r") { fr.scopes[0].set(p.n, V.r(selfId)); fr.self = other.id; } }
    }
    const res = execBlock(meth.body, fr, false);
    let rv = res && res.ret ? coerce(res.ret, meth.ret) : null;
    if (rv && m.returnCopies && rv.k === "r" && cn === null) rv = cloneObj(rv.id);
    if (rv && m.accessorStores && meth.meta?.computesFrom && fr.self != null) setF(fr.self, meth.meta.computesFrom, rv);
    return rv || { k: "void" };
  }

  function construct(e, fr) {
    const c = classes[e.c];
    const args = e.args.map((a) => evalE(a, fr));
    if (m.equalArgsAlias && fr.kind === "main") {
      const key = e.c + "(" + args.map((a) => JSON.stringify(a)).join(",") + ")";
      const prev = trace.newArgs.find((x) => x.key === key);
      if (prev) return V.r(prev.id);
    }
    const id = nextId++;
    const o = { id, cls: e.c, f: {}, sf: {} };
    for (const f of c.fields) if (!f.st) o.f[f.n] = defaultFor(f.t);
    heap.set(id, o);
    if (m.staticAsInstance) for (const f of c.fields) if (f.st) o.sf[f.n] = f.init ? evalE(f.init, staticFrame(e.c)) : defaultFor(f.t);
    lastOf[e.c] = id;
    trace.allocs.push({ id, cls: e.c, stmt: mainStmtIndex });
    if (fr.kind === "main") trace.newArgs.push({ key: e.c + "(" + args.map((a) => JSON.stringify(a)).join(",") + ")", id });
    const skipBody = m.ctorOnce && trace.allocs.some((a) => a.cls === e.c && a.id !== id);
    if (c.ctors.length && !skipBody) {
      const k = resolve(c.ctors, e.args, fr, args);
      runCtor(c, k, id, args);
    } else runInitialisers(c, id);
    if (m.toStringAtCreation) tsCache.set(id, (() => { const save = m.toStringAtCreation; m.toStringAtCreation = false; const s = objToString(id); m.toStringAtCreation = save; return s; })());
    born.set(id, JSON.stringify(heap.get(id).f));
    return V.r(id);
  }
  function runInitialisers(c, id) {
    const fr = { scopes: [new Map()], self: id, cls: c.n, kind: "ctor", bind: {}, types: new Map() };
    for (const f of c.fields) if (!f.st && f.init) setF(id, f.n, coerce(evalE(f.init, fr), f.t));
  }
  function runCtor(c, k, id, args) {
    tick(); trace.calls++;
    const fr = { scopes: [new Map()], self: id, cls: c.n, kind: "ctor", bind: {}, types: new Map() };
    k.params.forEach((p, i) => { fr.scopes[0].set(p.n, coerce(args[i], p.t)); fr.types.set(p.n, p.t); });
    const body = () => { if (!m.forgetCtor) execBlock(k.body, fr, false); };
    if (k.chain && !m.skipChain) {
      const cargs = k.chain.args.map((a) => evalE(a, fr));
      const target = resolve(c.ctors.filter((x) => x !== k), k.chain.args, fr, cargs);
      if (m.chainAfterBody) { body(); runCtor(c, target, id, cargs); }
      else { runCtor(c, target, id, cargs); body(); }
      return;
    }
    if (m.initializerAfterCtor) { body(); runInitialisers(c, id); }
    else { runInitialisers(c, id); body(); }
  }

  // ---- statements
  function execBlock(stmts, fr, newScope = true) {
    if (newScope) fr.scopes.push(new Map());
    try {
      for (const s of stmts) { const r = exec(s, fr); if (r && r.ret !== undefined) return r; }
    } finally { if (newScope) fr.scopes.pop(); }
    return null;
  }
  function targetWrite(tg, v, fr) {
    if (tg.k === "name") return writeName(fr, tg.n, v);
    if (tg.k === "fld") {
      if (m.thisMeansParam && tg.o.k === "this" && lookupLocal(fr, tg.n)) return writeName(fr, tg.n, v);
      const id = deref(evalE(tg.o, fr));
      const f = instField(heap.get(id).cls, tg.n);
      return setF(id, tg.n, coerce(v, f ? f.t : "int"));
    }
    if (tg.k === "sfld") return setS(tg.c, tg.n, coerce(v, staticField(tg.c, tg.n).t), null);
    throw Error("sim: bad target");
  }
  function exec(s, fr) {
    tick();
    const inMethod = fr.kind === "method" || fr.kind === "static";
    switch (s.k) {
      case "decl": {
        let v = s.e ? coerce(evalE(s.e, fr), s.t) : undefined;
        if (v && m.aliasCopies && v.k === "r" && (s.e.k === "name" || s.e.k === "fld")) v = cloneObj(v.id);
        fr.scopes[fr.scopes.length - 1].set(s.n, v === undefined ? { k: "unassigned" } : v);
        fr.types?.set?.(s.n, s.t);
        return null;
      }
      case "asg": {
        let op = s.op;
        if (inMethod && m.compoundAsReplace && (op === "+=" || op === "-=")) op = "=";
        if (inMethod && m.setAdds && op === "=" && /^set[A-Z]/.test(fr.meth?.n || "") && s.e.k === "name" && fr.meth.params.some((p) => p.n === s.e.n)) op = "+=";
        let v = evalE(s.e, fr);
        if (op !== "=") {
          const cur = evalE(s.tg, fr);
          const bop = op[0];
          v = evalBin({ k: "bin", op: bop, l: { k: "__v", v: cur }, r: { k: "__v", v } }, fr);
        } else if (m.aliasCopies && v.k === "r" && (s.e.k === "name" || s.e.k === "fld")) v = cloneObj(v.id);
        if (fr.kind === "main" && s.tg.k === "name") {
          const cur = readName(fr, s.tg.n);
          if (m.reassignMutates && v.k === "r" && cur.k === "r" && s.e.k === "new") {
            const src = heap.get(v.id), dst = heap.get(cur.id);
            for (const k2 of Object.keys(src.f)) dst.f[k2] = src.f[k2];
            return null;
          }
          if (m.nullPropagates && v.k === "n" && cur.k === "r") {
            for (const [k2, val] of fr.scopes[0]) if (val.k === "r" && val.id === cur.id) fr.scopes[0].set(k2, V.n());
            return null;
          }
        }
        targetWrite(s.tg, v, fr);
        return null;
      }
      case "inc": {
        const cur = evalE(s.tg, fr);
        targetWrite(s.tg, cur.k === "d" ? V.d(cur.v + (s.op === "++" ? 1 : -1)) : V.i(cur.v + (s.op === "++" ? 1 : -1)), fr);
        return null;
      }
      case "ex": {
        if (fr.kind === "main" && m.onlyLastUpdate && s.e.k === "call" && s.e.o?.k === "name") {
          const rv = readName(fr, s.e.o.n);
          if (rv.k === "r" && born.has(rv.id)) heap.get(rv.id).f = JSON.parse(born.get(rv.id));
        }
        evalE(s.e, fr); return null;
      }
      case "print": { const v = evalE(s.e, fr); if (m.nullPrintThrows && v.k === "n") throw new JavaException("NullPointerException"); out.push(toS(v)); return null; }
      case "ret": {
        let v = s.e ? evalE(s.e, fr) : null;
        if (v && m.returnThisCopies && s.e.k === "this") v = cloneObj(v.id);
        return { ret: v };
      }
      case "if": {
        let c = evalE(s.c, fr).v;
        if (m.ignoreGuards && fr.kind === "method") c = true;
        trace.branches.push(c ? 1 : 0);
        return execBlock(c ? s.th : (s.el || []), fr);
      }
    }
    throw Error("sim: unknown stmt " + s.k);
  }

  // ---- run main
  const mainFr = { scopes: [new Map()], self: null, cls: null, kind: "main", bind: {}, types: new Map() };
  let error = null;
  trace.initial = snapshot();
  try {
    program.main.forEach((s, i) => {
      mainStmtIndex = i;
      exec(s, mainFr);
      trace.stmtStates.push(snapshot());
    });
  } catch (err) {
    if (err instanceof JavaException) { trace.exc = err.jname; }
    else if (err instanceof StepLimit) { error = "step-limit"; }
    else throw err;
  }
  function snapshot() {
    const vars = {};
    for (const [k, v] of mainFr.scopes[0]) vars[k] = v;
    const objs = {};
    for (const [id, o] of heap) objs[id] = { cls: o.cls, f: Object.fromEntries(Object.keys(o.f).map((k) => [k, getF(id, k)])) };
    const st = {}; for (const c in statics) st[c] = Object.fromEntries(Object.keys(statics[c]).map((k) => [k, getS(c, k, null)]));
    return JSON.parse(JSON.stringify({ vars, objs, st }));
  }

  // ---- canonical dump (same format the JVM harness prints)
  function dump() {
    if (trace.exc || error) return null;
    const lines = [], ids = new Map(), order = [];
    const ref = (id) => { if (!ids.has(id)) { ids.set(id, ids.size + 1); order.push(id); } return "#" + ids.get(id); };
    const fmt = (v) => v.k === "r" ? ref(v.id) : v.k === "n" ? "null" : v.k === "s" ? `"${v.v}"` : v.k === "c" ? String(v.v.charCodeAt(0)) : toSRaw(v);
    for (const d of program.main.filter((s) => s.k === "decl" && s.e)) {
      const v = mainFr.scopes[0].get(d.n);
      lines.push(`##L ${d.n}=${fmt(v)}`);
    }
    for (let i = 0; i < order.length; i++) {
      const o = heap.get(order[i]);
      const parts = [`##O #${i + 1} ${o.cls}`];
      for (const f of classes[o.cls].fields) if (!f.st) parts.push(`${f.n}=${fmt(getF(o.id, f.n))}`);
      lines.push(parts.join(" "));
    }
    for (const c of program.classes) for (const f of c.fields) if (f.st) lines.push(`##S ${c.n}.${f.n}=${fmt(statics[c.n][f.n])}`);
    return lines;
  }
  function toSRaw(v) { return v.k === "d" ? jdouble(v.v) : v.k === "b" ? String(v.v) : String(v.v); }

  const finalVars = {};
  for (const [k, v] of mainFr.scopes[0]) finalVars[k] = v;
  return {
    out, exc: trace.exc, error, trace, steps,
    vars: finalVars, heap, statics,
    dump: dump(),
    created: trace.allocs.filter((a) => !heap.get(a.id)?.clone).length,
    stdout: out.join("\n"),
    reachable() { const s = new Set(); for (const v of Object.values(finalVars)) if (v.k === "r") s.add(v.id); return s.size; },
    getField: (id, n) => getF(id, n),
  };
}

export function valueText(v) {
  if (!v) return "";
  switch (v.k) { case "i": return String(v.v); case "d": return jdouble(v.v); case "b": return String(v.v); case "s": return v.v; case "c": return v.v; case "n": return "null"; case "r": return "#" + v.id; }
  return "";
}
