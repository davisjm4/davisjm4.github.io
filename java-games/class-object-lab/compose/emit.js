/* Java source emitter. Renders the IR as readable, already-formatted Java
 * (4-space indentation, braces on every block). Two outputs:
 *   emitDisplay(program)  -> student-facing code (classes, helper methods, then main statements)
 *   emitHarness(program)  -> complete compilable Main.java used by the development JVM oracle
 * The harness wraps the SAME statement text, so the displayed semantics are preserved exactly. */
const PREC = { "||": 2, "&&": 3, "==": 4, "!=": 4, "<": 5, "<=": 5, ">": 5, ">=": 5, "+": 6, "-": 6, "*": 7, "/": 7, "%": 7 };

export function jdouble(v) {
  if (Number.isInteger(v)) return v.toFixed(1);
  return String(v);
}
function jstring(s) {
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function jchar(c) {
  if (c === "\u0000") return "'\\u0000'";
  if (c === "'") return "'\\''";
  return "'" + c + "'";
}

export function expr(e, prec = 0) {
  switch (e.k) {
    case "lit":
      if (e.t === "int") return e.v < 0 && prec > 8 ? `(${e.v})` : String(e.v);
      if (e.t === "double") return jdouble(e.v);
      if (e.t === "boolean") return e.v ? "true" : "false";
      if (e.t === "String") return jstring(e.v);
      if (e.t === "char") return jchar(e.v);
      return "null";
    case "name": return e.n;
    case "this": return "this";
    case "fld": return `${expr(e.o, 9)}.${e.n}`;
    case "sfld": return `${e.c}.${e.n}`;
    case "new": { const s = `new ${e.c}(${e.args.map((a) => expr(a)).join(", ")})`; return prec >= 9 ? `(${s})` : s; }
    case "call": return `${e.o ? expr(e.o, 9) + "." : ""}${e.n}(${e.args.map((a) => expr(a)).join(", ")})`;
    case "scall": return `${e.c}.${e.n}(${e.args.map((a) => expr(a)).join(", ")})`;
    case "math": return `Math.${e.f}(${e.args.map((a) => expr(a)).join(", ")})`;
    case "un": { const s = `${e.op}${expr(e.e, 8)}`; return prec > 8 ? `(${s})` : s; }
    case "tern": { const s = `${expr(e.c, 2)} ? ${expr(e.a, 1)} : ${expr(e.b, 1)}`; return prec > 1 ? `(${s})` : s; }
    case "bin": {
      const p = PREC[e.op];
      // left-assoc: right operand needs strictly higher precedence
      const s = `${expr(e.l, p)} ${e.op} ${expr(e.r, p + 1)}`;
      return prec > p ? `(${s})` : s;
    }
  }
  throw Error("emit: unknown expr " + e.k);
}

function stmt(s, ind, out, tag) {
  const pad = "    ".repeat(ind);
  const push = (text) => out.push({ text: pad + text, tag });
  switch (s.k) {
    case "decl": push(`${s.t} ${s.n}${s.e ? " = " + expr(s.e) : ""};`); return;
    case "asg": push(`${expr(s.tg)} ${s.op} ${expr(s.e)};`); return;
    case "inc": push(`${expr(s.tg)}${s.op};`); return;
    case "ex": push(`${expr(s.e)};`); return;
    case "ret": push(s.e ? `return ${expr(s.e)};` : "return;"); return;
    case "print": push(`System.out.println(${expr(s.e)});`); return;
    case "if": {
      push(`if (${expr(s.c)}) {`);
      s.th.forEach((x) => stmt(x, ind + 1, out, tag));
      if (s.el && s.el.length) {
        if (s.el.length === 1 && s.el[0].k === "if") {
          const sub = []; stmt(s.el[0], ind, sub, tag);
          out.push({ text: pad + "} else " + sub[0].text.trimStart(), tag });
          out.push(...sub.slice(1));
          return;
        }
        push("} else {");
        s.el.forEach((x) => stmt(x, ind + 1, out, tag));
      }
      push("}");
      return;
    }
  }
  throw Error("emit: unknown stmt " + s.k);
}
const mods = (acc, st) => [acc, st ? "static" : ""].filter(Boolean).join(" ");
const sigParams = (ps) => ps.map((p) => `${p.t} ${p.n}`).join(", ");

export function emitClass(c, ind = 0, opts = {}) {
  const out = [], pad = "    ".repeat(ind);
  out.push({ text: `${pad}class ${c.n} {`, tag: "class" });
  if (opts.countAllocs) out.push({ text: `${pad}    { Main.__allocs++; }`, tag: "harness" });
  for (const f of c.fields) {
    const m = mods(f.acc, f.st);
    out.push({ text: `${pad}    ${m ? m + " " : ""}${f.t} ${f.n}${f.init ? " = " + expr(f.init) : ""};`, tag: "field" });
  }
  const members = [
    ...c.ctors.map((k) => ({ head: `${k.acc ? k.acc + " " : ""}${c.n}(${sigParams(k.params)})`, body: k.body, chain: k.chain })),
    ...c.methods.map((m) => ({ head: `${mods(m.acc, m.st) ? mods(m.acc, m.st) + " " : ""}${m.ret} ${m.n}(${sigParams(m.params)})`, body: m.body })),
  ];
  members.forEach((m, i) => {
    if (i > 0 || c.fields.length) out.push({ text: "", tag: "blank" });
    out.push({ text: `${pad}    ${m.head} {`, tag: "member" });
    if (m.chain) out.push({ text: `${pad}        this(${m.chain.args.map((a) => expr(a)).join(", ")});`, tag: "member" });
    m.body.forEach((s) => stmt(s, ind + 2, out, "member"));
    out.push({ text: `${pad}    }`, tag: "member" });
  });
  out.push({ text: `${pad}}`, tag: "class" });
  return out;
}
function emitHelper(h, ind) {
  const out = [], pad = "    ".repeat(ind);
  out.push({ text: `${pad}${mods(h.acc, true)} ${h.ret} ${h.n}(${sigParams(h.params)}) {`, tag: "helper" });
  h.body.forEach((s) => stmt(s, ind + 1, out, "helper"));
  out.push({ text: `${pad}}`, tag: "helper" });
  return out;
}

/* Student-facing code. Returns {code, lines, mainLines:[displayLineNumber per main stmt]} */
export function emitDisplay(p) {
  const lines = [];
  p.classes.forEach((c, i) => { if (i) lines.push({ text: "", tag: "blank" }); lines.push(...emitClass(c, 0)); });
  for (const h of p.helpers) { lines.push({ text: "", tag: "blank" }); lines.push(...emitHelper({ ...h, acc: "" }, 0)); }
  if (p.main.length) lines.push({ text: "", tag: "blank" });
  const mainLines = [];
  p.main.forEach((s, i) => { mainLines.push(lines.length + 1); const o = []; stmt(s, 0, o, "main:" + i); lines.push(...o); });
  return { code: lines.map((l) => l.text).join("\n"), lines, mainLines };
}

/* Complete program for the JVM oracle. `pkg` isolates programs compiled in one batch.
 * observe=true appends a hidden state dump (identity-canonical object ids, all fields, statics). */
export function emitHarness(p, { pkg = null, observe = true, countAllocs = false } = {}) {
  const L = [];
  if (pkg) L.push(`package ${pkg};`, "");
  if (observe) L.push("import java.lang.reflect.*;", "import java.util.*;", "");
  for (const c of p.classes) { L.push(...emitClass(c, 0, { countAllocs }).map((l) => l.text)); L.push(""); }
  L.push("public class Main {");
  if (countAllocs) L.push("    static int __allocs = 0;");
  for (const h of p.helpers) { L.push(...emitHelper({ ...h, acc: "" }, 1).map((l) => l.text)); L.push(""); }
  L.push("    public static void run() throws Exception {");
  const o = []; p.main.forEach((s, i) => stmt(s, 2, o, "main:" + i)); L.push(...o.map((l) => l.text));
  if (observe) {
    const locals = mainLocals(p);
    L.push("        Dump __dump = new Dump();");
    for (const v of locals) L.push(`        __dump.local("${v.n}", ${v.n});`);
    L.push("        __dump.finish();");
    if (countAllocs) L.push('        System.out.println("##A " + __allocs);');
  }
  L.push("    }");
  L.push("");
  L.push("    public static void main(String[] args) throws Exception {");
  L.push("        try { run(); } catch (RuntimeException e) { System.out.println(\"##EXC \" + e.getClass().getSimpleName()); }");
  L.push("    }");
  if (observe) L.push(DUMP_CLASS(p));
  L.push("}");
  return L.join("\n");
}
export function mainLocals(p) {
  // uninitialised declarations are excluded: reading them would not compile
  return p.main.filter((s) => s.k === "decl" && s.e).map((s) => ({ n: s.n, t: s.t }));
}
function DUMP_CLASS(p) {
  const statics = [];
  for (const c of p.classes) for (const f of c.fields) if (f.st) statics.push(`        Field sf_${c.n}_${f.n} = ${c.n}.class.getDeclaredField("${f.n}"); sf_${c.n}_${f.n}.setAccessible(true); System.out.println("##S ${c.n}.${f.n}=" + fmt(sf_${c.n}_${f.n}.get(null)));`);
  return `
    static class Dump {
        IdentityHashMap<Object, Integer> ids = new IdentityHashMap<>();
        List<Object> order = new ArrayList<>();
        String ref(Object o) {
            if (o == null) return "null";
            Integer id = ids.get(o);
            if (id == null) { id = ids.size() + 1; ids.put(o, id); order.add(o); }
            return "#" + id;
        }
        void local(String n, Object v) { System.out.println("##L " + n + "=" + (v == null || isUser(v) ? ref(v) : fmt(v))); }
        void local(String n, int v) { System.out.println("##L " + n + "=" + v); }
        void local(String n, double v) { System.out.println("##L " + n + "=" + v); }
        void local(String n, boolean v) { System.out.println("##L " + n + "=" + v); }
        void local(String n, char v) { System.out.println("##L " + n + "=" + (int) v); }
        boolean isUser(Object o) { return !(o instanceof String) && !(o instanceof Number) && !(o instanceof Boolean) && !(o instanceof Character); }
        String fmt(Object v) {
            if (v == null) return "null";
            if (v instanceof Character) return String.valueOf((int) (Character) v);
            if (v instanceof String) return "\\"" + v + "\\"";
            if (isUser(v)) return ref(v);
            return String.valueOf(v);
        }
        void finish() throws Exception {
            for (int i = 0; i < order.size(); i++) {
                Object o = order.get(i);
                StringBuilder sb = new StringBuilder("##O #" + (i + 1) + " " + o.getClass().getSimpleName());
                for (Field f : o.getClass().getDeclaredFields()) {
                    if (Modifier.isStatic(f.getModifiers())) continue;
                    f.setAccessible(true);
                    sb.append(" ").append(f.getName()).append("=").append(fmt(f.get(o)));
                }
                System.out.println(sb);
            }
${statics.join("\n")}
        }
    }`;
}
