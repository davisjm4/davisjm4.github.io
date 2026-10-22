// JVM-side instrumentation. The traced method is renamed to <name>__impl and a logging wrapper
// named <name> is added, so every call (including recursive ones) logs entry and return in true order.
export function instrument(code, method) {
  const re = new RegExp(`(static\\s+)([\\w\\[\\]]+)(\\s+)${method}(\\s*\\(([^)]*)\\)\\s*\\{)`); const m = re.exec(code);
  if (!m) throw Error(`method ${method} not found`);
  const type = m[2], params = m[5].split(",").map(s => s.trim()).filter(Boolean).map(p => { const [t, n] = p.split(/\s+/); return { t, n }; });
  const logged = params.map(p => p.t === "String" ? `"\\"" + ${p.n} + "\\""` : p.t === "int[]" ? `"arr"` : p.n);
  const renamed = code.slice(0, m.index) + m[1] + type + m[3] + method + "__impl" + m[4] + code.slice(m.index + m[0].length);
  const plist = params.map(p => `${p.t} ${p.n}`).join(", "), alist = params.map(p => p.n).join(", ");
  const wrapper = `static ${type} ${method}(${plist}) {
  __calls++; __depth++; if (__depth > __max) __max = __depth;${params.filter(p => p.t === "int[]").map(p => ` if (__log.size() < 4000) __log.add("A" + __depth + ":" + java.util.Arrays.toString(${p.n}));`).join("")} if (__log.size() < 4000) __log.add("C" + __depth + ":" + ${logged.length ? logged.join(` + "," + `) : '""'});
  try { ${type === "void" ? `${method}__impl(${alist});` : `${type} __v = ${method}__impl(${alist}); if (__log.size() < 4000) __log.add("R" + __depth + ":" + __fmt(__v)); return __v;`} } finally { __depth--; }
}`;
  return renamed + "\n" + wrapper;
}
const FMT = `static String __fmt(Object o){ if(o instanceof int[]) return java.util.Arrays.toString((int[])o); return String.valueOf(o); }`;
export function harness(cls, code, { method, setup = "", call, isVoid = false, after = [] }) {
  return `public class ${cls} {
static int __calls = 0, __depth = 0, __max = 0; static java.util.List<String> __log = new java.util.ArrayList<>();
${FMT}
${instrument(code, method)}
public static void main(String[] args) {
  java.io.PrintStream __o = System.out; java.io.ByteArrayOutputStream __b = new java.io.ByteArrayOutputStream();
  System.setOut(new java.io.PrintStream(__b)); String __r = "void", __x = "";
  ${setup}
  try { ${isVoid ? `${call};` : `__r = __fmt(${call});`} } catch (Throwable t) { __x = t.getClass().getSimpleName(); }
  System.out.flush(); System.setOut(__o);
  String __after = ${after.length ? after.map(a => `__fmt(${a})`).join(` + "\\u0002" + `) : '""'};
  System.out.print(__b.toString() + "\\u0001" + __r + "\\u0001" + __x + "\\u0001" + __calls + "\\u0001" + __max + "\\u0001" + String.join("\\u0003", __log.size() > 600 ? __log.subList(0, 600) : __log) + "\\u0001" + __after);
} }`;
}
export function parseObs(stdout) {
  const [out, ret, exc, calls, max, log, after] = stdout.split("\u0001");
  const events = log ? log.split("\u0003").map(e => { const i = e.indexOf(":"); return { type: e[0], depth: +e.slice(1, i), text: e.slice(i + 1) }; }) : [];
  return { out, ret, exc: exc || null, calls: +calls, maxDepth: +max, events,
    log: events.filter(e => e.type === "C").map(e => ({ depth: e.depth, args: e.text })),
    rets: events.filter(e => e.type === "R").map(e => ({ depth: e.depth, value: e.text })),
    arrays: events.filter(e => e.type === "A").map(e => ({ depth: e.depth, value: e.text })),
    after: after ? after.split("\u0002") : [] };
}
