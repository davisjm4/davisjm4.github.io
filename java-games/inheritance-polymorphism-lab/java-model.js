/* Inheritance & Polymorphism Lab — a small, explicit model of the Java subset
   the game uses. It renders class hierarchies as conventional Java source and
   simulates the rules students reason about:

     • compile time: which methods a REFERENCE TYPE makes available
       (private members are never accessible from another top-level class);
       assignment and cast compatibility; abstract classes can't be created
     • run time: dynamic dispatch for instance methods (the OBJECT's class
       decides), super.m() (non-virtual: starts above the current class),
       static methods (hidden, not overridden: chosen by the declared type),
       private methods (never overridden), ClassCastException on bad casts,
       constructor chaining (superclass constructors finish first).

   Every scenario the game shows is compiled and run on a real JVM by
   tests/iplab-jvm-tests.mjs, which fails if this model disagrees with Java. */

/* ----------------------------- model builders ----------------------------- */
// Body parts: "text" literal · {c:"m"} this-call · {s:"m"} super-call · {p:"x"} parameter
export const call = (m) => ({ c: m });
export const sup = (m) => ({ s: m });
export const par = (p) => ({ p });
export function method(name, body, o = {}) {
  return { name, params: o.params || [], ret: o.ret || "String", vis: o.vis || "", static: !!o.static, abstract: false, override: !!o.override, body };
}
export const over = (name, body, o = {}) => method(name, body, { ...o, override: true });
export function abstractMethod(name, o = {}) {
  return { name, params: o.params || [], ret: o.ret || "String", vis: o.vis || "", static: false, abstract: true, override: false, body: null };
}
export function cls(name, ext, methods = [], o = {}) {
  return { name, ext: ext || null, methods, abstract: !!o.abstract, ctor: o.ctor || null };
}

/* ------------------------------- utilities -------------------------------- */
export const sigKey = (m) => `${m.name}(${m.params.map((p) => p[0]).join(",")})`;
export const methodId = (c, m) => `${c}.${sigKey(m)}`;
export function index(classes) {
  const map = new Map(classes.map((c) => [c.name, c]));
  return map;
}
export function chain(classes, name) {
  const map = index(classes);
  const out = [];
  let c = map.get(name);
  const seen = new Set();
  while (c && !seen.has(c.name)) {
    seen.add(c.name);
    out.push(c.name);
    c = c.ext ? map.get(c.ext) : null;
  }
  return out;
}
export const isSubtype = (classes, sub, sup_) => sub === sup_ || chain(classes, sub).includes(sup_);
export const depth = (classes, name) => chain(classes, name).length - 1;
const sameSig = (a, types) => a.params.length === types.length && a.params.every((p, i) => p[0] === types[i]);
const getClass = (classes, name) => index(classes).get(name);

/* Methods a class makes available to OTHER classes (e.g. Main): all
   non-private methods declared in it or any superclass, nearest first,
   one entry per signature. */
export function availableMethods(classes, name) {
  const out = new Map();
  for (const cn of chain(classes, name))
    for (const m of getClass(classes, cn).methods)
      if (m.vis !== "private" && !out.has(sigKey(m))) out.set(sigKey(m), { cls: cn, m });
  return [...out.values()];
}

/* Compile-time lookup from outside the hierarchy (Main). */
export function lookup(classes, declType, name, types) {
  for (const cn of chain(classes, declType)) {
    const m = getClass(classes, cn).methods.find((x) => x.name === name && sameSig(x, types));
    if (m && m.vis !== "private") return { cls: cn, m };
  }
  return null;
}
/* Lookup from inside class `from` (a this-call): private allowed only when
   declared in `from` itself. */
function lookupInside(classes, from, name, types) {
  for (const cn of chain(classes, from)) {
    const m = getClass(classes, cn).methods.find((x) => x.name === name && sameSig(x, types));
    if (m && (m.vis !== "private" || cn === from)) return { cls: cn, m };
  }
  return null;
}
/* The implementation that actually runs. */
export function dispatch(classes, objType, found) {
  if (found.m.static || found.m.vis === "private") return found;
  for (const cn of chain(classes, objType)) {
    const m = getClass(classes, cn).methods.find((x) => x.name === found.m.name && sameSig(x, found.m.params.map((p) => p[0])) && !x.static && x.vis !== "private");
    if (m && !m.abstract) return { cls: cn, m };
  }
  throw new Error(`No implementation of ${sigKey(found.m)} for ${objType}`);
}
function superImpl(classes, fromCls, name) {
  const parent = getClass(classes, fromCls).ext;
  if (!parent) throw new Error(`super.${name}() in ${fromCls}, which has no superclass in the model`);
  const f = lookupInside(classes, parent, name, []);
  if (!f || f.m.abstract || (f.m.vis === "private")) throw new Error(`super.${name}() has no concrete inherited method`);
  return f;
}

/* Run a method body. Returns {value, trace} where trace lists implementations
   entered, in order ("Class.method"). */
export function invoke(classes, objType, impl, args = [], trace = [], opts = {}) {
  trace.push(`${impl.cls}.${impl.m.name}`);
  const env = Object.fromEntries(impl.m.params.map((p, i) => [p[1], args[i]]));
  let value = "";
  for (const part of impl.m.body) {
    if (typeof part === "string") value += part;
    else if (part.p !== undefined) value += String(env[part.p]);
    else if (part.c) {
      const found = lookupInside(classes, impl.cls, part.c, []);
      if (!found) throw new Error(`${impl.cls} calls ${part.c}() but it isn't available there`);
      // opts.staticInner models a misconception: inner calls bound to the
      // containing class instead of being dispatched on the object.
      const target = found.m.static || found.m.vis === "private" || opts.staticInner ? found : dispatch(classes, objType, found);
      if (target.m.abstract) throw new Error("abstract call");
      value += invoke(classes, objType, target, [], trace, opts).value;
    } else if (part.s) value += invoke(classes, objType, superImpl(classes, impl.cls, part.s), [], trace, opts).value;
  }
  return { value, trace };
}

/* Constructor chaining: superclass constructors complete first. */
export function constructionOrder(classes, name) {
  return chain(classes, name).reverse();
}
export function constructionOutput(classes, name) {
  return constructionOrder(classes, name)
    .map((cn) => getClass(classes, cn).ctor?.print)
    .filter(Boolean)
    .join("");
}

/* ------------------------------ statements -------------------------------- */
/* env: { var: {decl, obj} }. Statements:
     {k:"call", v, m, args:[lit...]}       System.out.println(v.m(args));
     {k:"cast", v, to, m}                  System.out.println(((To) v).m());
     {k:"assign", t, name, from}           T name = from;
     {k:"new", t, name, cls}               T name = new Cls();
     {k:"castAssign", t, name, from}       T name = (T) from;
   Result: {compiles, error, output, exception, trace, impl} */
const litType = (a) => (typeof a === "number" ? (Number.isInteger(a) ? "int" : "double") : "String");
export const javaLit = (a) => (typeof a === "string" ? JSON.stringify(a) : Number.isInteger(a) ? String(a) : String(a).includes(".") ? String(a) : a.toFixed(1));
export function statementText(s) {
  const args = (s.args || []).map(javaLit).join(", ");
  switch (s.k) {
    case "call":
      return `System.out.println(${s.v}.${s.m}(${args}));`;
    case "cast":
      return `System.out.println(((${s.to}) ${s.v}).${s.m}(${args}));`;
    case "assign":
      return `${s.t} ${s.name} = ${s.from};`;
    case "new":
      return `${s.t} ${s.name} = new ${s.cls}();`;
    case "castAssign":
      return `${s.t} ${s.name} = (${s.t}) ${s.from};`;
  }
  throw new Error("unknown statement " + s.k);
}
export function runStatement(classes, env, s) {
  const err = (error, detail) => ({ compiles: false, error, detail, output: null, exception: null, trace: [] });
  const types = (s.args || []).map(litType);
  if (s.k === "call" || s.k === "cast") {
    const ref = env[s.v];
    let view = ref.decl;
    if (s.k === "cast") {
      if (!isSubtype(classes, s.to, ref.decl) && !isSubtype(classes, ref.decl, s.to)) return err("inconvertible", `${ref.decl} cannot be converted to ${s.to}`);
      view = s.to;
    }
    const found = lookup(classes, view, s.m, types);
    if (!found) {
      // A private method is a member only of the class that declares it:
      // through that class's type javac reports "private access"; through a
      // subclass type the method doesn't exist at all ("cannot find symbol").
      const hidden = getClass(classes, view).methods.some((x) => x.name === s.m && sameSig(x, types) && x.vis === "private");
      if (hidden) return err("private", `${s.m}() is private in ${view}'s hierarchy`);
      return err("no-method", `${view} has no accessible method ${s.m}(${types.join(", ")})`);
    }
    if (s.k === "cast" && !isSubtype(classes, ref.obj, s.to)) return { compiles: true, error: null, output: null, exception: "ClassCastException", trace: [], impl: null };
    const impl = dispatch(classes, ref.obj, found);
    const r = invoke(classes, ref.obj, impl, s.args || []);
    return { compiles: true, error: null, output: r.value, exception: null, trace: r.trace, impl, found };
  }
  if (s.k === "assign") {
    const ref = env[s.from];
    if (!isSubtype(classes, ref.decl, s.t)) return err("incompatible", `${ref.decl} cannot be converted to ${s.t}`);
    return { compiles: true, error: null, output: null, exception: null, trace: [] };
  }
  if (s.k === "new") {
    const c = getClass(classes, s.cls);
    if (c.abstract) return err("abstract", `${s.cls} is abstract; cannot be instantiated`);
    if (!hasNoArgConstructor(c)) return err("ctor-args", `${s.cls} has no constructor that takes no arguments`);
    if (!isSubtype(classes, s.cls, s.t)) return err("incompatible", `${s.cls} cannot be converted to ${s.t}`);
    return { compiles: true, error: null, output: null, exception: null, trace: [] };
  }
  if (s.k === "castAssign") {
    const ref = env[s.from];
    if (!isSubtype(classes, s.t, ref.decl) && !isSubtype(classes, ref.decl, s.t)) return err("inconvertible", `${ref.decl} cannot be converted to ${s.t}`);
    if (!isSubtype(classes, ref.obj, s.t)) return { compiles: true, error: null, output: null, exception: "ClassCastException", trace: [] };
    return { compiles: true, error: null, output: null, exception: null, trace: [] };
  }
  throw new Error("unknown statement " + s.k);
}
/* javac message fragments for each modeled compile error (checked by tests). */
export const hasNoArgConstructor = (c) => !c.ctor || !(c.ctor.params || []).length;
export const JAVAC_ERRORS = {
  private: "has private access",
  "ctor-args": "cannot be applied to given types",
  "no-method": "cannot find symbol",
  incompatible: "incompatible types",
  inconvertible: "incompatible types",
  abstract: "is abstract; cannot be instantiated",
};

/* -------------------------------- rendering ------------------------------- */
const IND = "    ";
export function renderClasses(classes) {
  const lines = [];
  const at = { classes: {}, methods: {}, ctors: {} };
  classes.forEach((c, ci) => {
    if (ci) lines.push("");
    at.classes[c.name] = lines.length;
    lines.push(`${c.abstract ? "abstract " : ""}class ${c.name}${c.ext ? " extends " + c.ext : ""} {`);
    const members = [];
    if (c.ctor) members.push({ ctor: c.ctor });
    for (const m of c.methods) members.push({ m });
    members.forEach((mem, mi) => {
      if (mi) lines.push("");
      if (mem.ctor) {
        const k = mem.ctor;
        at.ctors[c.name] = lines.length;
        lines.push(`${IND}${c.name}(${(k.params || []).map((p) => p.join(" ")).join(", ")}) {`);
        if (k.superArgs) lines.push(`${IND}${IND}super(${k.superArgs.join(", ")});`);
        if (k.print) lines.push(`${IND}${IND}System.out.print(${JSON.stringify(k.print)});`);
        lines.push(`${IND}}`);
        return;
      }
      const m = mem.m;
      const mods = [m.vis, m.abstract ? "abstract" : "", m.static ? "static" : ""].filter(Boolean).join(" ");
      const head = `${mods ? mods + " " : ""}${m.ret} ${m.name}(${m.params.map((p) => p.join(" ")).join(", ")})`;
      if (m.override) lines.push(`${IND}@Override`);
      at.methods[methodId(c.name, m)] = lines.length;
      if (m.abstract) {
        lines.push(`${IND}${head};`);
        return;
      }
      lines.push(`${IND}${head} {`);
      lines.push(`${IND}${IND}return ${bodyText(m.body)};`);
      lines.push(`${IND}}`);
    });
    lines.push("}");
  });
  return { code: lines.join("\n"), at };
}
export function bodyText(body) {
  if (!body.length) return '""';
  return body
    .map((p) => (typeof p === "string" ? JSON.stringify(p) : p.p !== undefined ? p.p : p.c ? `${p.c}()` : `super.${p.s}()`))
    .join(" + ");
}
/* A short, human signature for diagrams and chips: "status()" or "pay(int)". */
export const shortSig = (m) => `${m.name}(${m.params.map((p) => p[0]).join(", ")})`;

/* Full compilable program (used by the JVM tests and, as source text, for
   display of the main excerpt). */
export function program(classes, mainLines) {
  return `public class Main {\n    public static void main(String[] args) {\n${mainLines.map((l) => "        " + l).join("\n")}\n    }\n}\n\n${renderClasses(classes).code}\n`;
}
