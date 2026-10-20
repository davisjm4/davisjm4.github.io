// Real-Java verification. For each generated challenge, every program in
// q.check is compiled into a Java class and executed on every listed input.
// Each answer option carries a claim; using ONLY the JVM's outputs this file
// evaluates every claim and requires exactly one true claim, at q.answer.
// Boolean expression programs are additionally cross-checked against an
// independent JS evaluator (tools/diag-bool.mjs) that shares no engine code.
//
// usage: node tests/java-verify.mjs [perCell=200] [modes=truthTable,switchIf,coverage,...] [--json out]
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { generate, makeRng, DIFFICULTIES } from "../engine.js";
import { evalExpr } from "./diag-bool.mjs";

const args = process.argv.slice(2);
const perCell = Number(args[0] || 200);
const modes = (args[1] || "truthTable,switchIf,coverage,evaluate,branch,conditions,equivalent,short,construct").split(",");
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bcl-java-"));

const lit = (type, v) => type === "char" ? `'${v}'` : type === "String" ? JSON.stringify(v) : String(v);
const parse = (type, i) => type === "int" ? `Integer.parseInt(a[${i}])` : type === "boolean" ? `Boolean.parseBoolean(a[${i}])` : type === "char" ? `a[${i}].charAt(0)` : `a[${i}]`;
const enc = v => String(v).replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n");
const inKey = arr => JSON.stringify(arr);

function runBatch(items) {
  // items: [{id, q}] ; programs get method names m<idx>
  const methods = [], dispatch = [], data = [], index = [];
  let m = 0;
  for (const { id, q } of items) {
    for (const [pid, prog] of Object.entries(q.check.programs)) {
      const name = `m${m++}`; index.push({ id, pid, name, prog });
      const params = prog.params.map(([t, v]) => `${t} ${v}`).join(", ");
      methods.push(`  static void ${name}(${params}) {\n${prog.body.split("\n").map(l => "    " + l).join("\n")}\n  }`);
      dispatch.push(`        case "${name}": ${name}(${prog.params.map(([t], i) => parse(t, i + 1)).join(", ")}); return;`);
      const ins = q.check.inputs[pid] || [[]];
      for (const inp of ins) data.push([name, ...inp.map(String)].join("\t"));
    }
  }
  // dispatch is split into chunks so no JVM method exceeds the 64 KB bytecode limit
  const CH = 200, chunks = [];
  for (let i = 0; i < dispatch.length; i += CH) chunks.push(`  static void d${i / CH}(String[] a) {\n    switch (a[0]) {\n${dispatch.slice(i, i + CH).join("\n")}\n    }\n  }`);
  const route = `  static void call(String[] a) { int k = Integer.parseInt(a[0].substring(1)) / ${CH}; switch (k) {\n${chunks.map((_, i) => `      case ${i}: d${i}(a); return;`).join("\n")}\n    } }`;
  const src = `import java.io.*;\npublic class Verify {\n${methods.join("\n")}\n${chunks.join("\n")}\n${route}\n  public static void main(String[] args) throws Exception {\n    BufferedReader r = new BufferedReader(new InputStreamReader(System.in));\n    PrintStream real = System.out; String line;\n    while ((line = r.readLine()) != null) {\n      String[] a = line.split("\\t", -1);\n      ByteArrayOutputStream buf = new ByteArrayOutputStream(); System.setOut(new PrintStream(buf, true));\n      String tail = "";\n      try { call(a); } catch (Throwable t) { tail = "EXCEPTION:" + t.getClass().getSimpleName(); }\n      System.out.flush(); System.setOut(real);\n      String o = buf.toString() + tail;\n      real.println(o.replace("\\\\", "\\\\\\\\").replace("\\t", "\\\\t").replace("\\n", "\\\\n"));\n    }\n  }\n}\n`;
  const file = path.join(tmp, "Verify.java"); fs.writeFileSync(file, src);
  let out;
  try { out = execFileSync("java", ["-Xss8m", file], { input: data.join("\n") + "\n", maxBuffer: 1 << 30, stdio: ["pipe", "pipe", "pipe"] }).toString(); }
  catch (e) { return { compileError: e.stderr?.toString().slice(0, 3000) || String(e) }; }
  const lines = out.split("\n"); lines.pop();
  if (lines.length !== data.length) throw new Error(`expected ${data.length} results, got ${lines.length}`);
  const dec = s => s.replace(/\\(\\|t|n)/g, (_, c) => c === "n" ? "\n" : c === "t" ? "\t" : "\\");
  const R = new Map(); let li = 0;
  for (const { id, pid, prog } of index) {
    const q = items.find(x => x.id === id).q; const ins = q.check.inputs[pid] || [[]];
    if (!R.has(id)) R.set(id, {});
    const tbl = R.get(id)[pid] = new Map();
    for (const inp of ins) tbl.set(inKey(inp.map(v => v)), dec(lines[li++]));
    void prog;
  }
  return { R };
}

const matchOut = (got, want) => want === "EXCEPTION:*" ? /EXCEPTION:/.test(got) : got === want;
const split = o => { const i = o.indexOf("|"); return i < 0 ? { printed: o, state: "" } : { printed: o.slice(0, i), state: o.slice(i) }; };
function evalClaim(c, q, R) {
  const get = (p, inp) => { const t = R[p]; const k = inKey(inp); if (!t || !t.has(k)) throw new Error(`no Java result for ${p} ${k}`); return t.get(k); };
  const all = p => [...R[p].entries()];
  switch (c.t) {
    case "out": return matchOut(get(c.p, c.in), c.is);
    case "field": { const o = get(c.p, c.in); const s = split(o); return c.field === "out" ? s.printed === c.is : c.field === "state" ? s.state === c.is : o === c.is; }
    case "all": return c.of.every(x => evalClaim(x, q, R));
    case "tableWrong": { const row = q.check.table.rows.find(r => inKey(r.in) === inKey(c.in)); return get(c.p, c.in) !== String(row.shown); }
    case "constant": return all(c.p).every(([, o]) => o === c.is);
    case "equiv": return all(c.a).every(([k, o]) => R[c.b].get(k) === o) === c.is;
    case "differ": return get(c.a, c.in) !== get(c.b, c.in);
    case "countDiffer": return all(c.a).filter(([k, o]) => R[c.b].get(k) !== o).length === c.n;
    case "sameAll": return all(c.a).every(([k, o]) => R[c.b].has(k) && R[c.b].get(k) === o);
    case "setEq": { const got = c.in.filter(inp => split(get(c.p, inp)).printed === c.is).map(inKey).sort(); return JSON.stringify(got) === JSON.stringify(c.set.map(inKey).sort()); }
    case "setWhere": { const got = all(c.p).filter(([, o]) => c.where.silent ? o === "" : o === c.where.is).map(([k]) => k).sort(); return JSON.stringify(got) === JSON.stringify(c.set.map(inKey).sort()); }
    case "neverPrints": return all(c.p).every(([, o]) => !o.split("\n").includes(c.mark) && o !== c.mark && !split(o).printed.includes(c.mark) || false);
    case "allPrint": return c.marks.every(mk => all(c.p).some(([, o]) => o.split("\n").includes(mk) || split(o).printed.includes(mk)));
    case "noneSilent": return all(c.p).every(([, o]) => o !== "");
    case "compileError": return false; // every program compiled, so this claim is false
    default: throw new Error(`unknown claim ${c.t}`);
  }
}
// independent oracle cross-check for pure Boolean programs
function oracleCheck(q, R) {
  let n = 0;
  for (const [pid, prog] of Object.entries(q.check.programs)) {
    const m = /^System\.out\.print\((.*)\);$/.exec(prog.body); if (!m || !prog.params.every(([t]) => t === "boolean")) continue;
    if (/[<>=]|\d/.test(m[1])) continue;
    for (const inp of q.check.inputs[pid] || []) { const env = Object.fromEntries(prog.params.map(([, v], i) => [v, inp[i]])); const want = String(evalExpr(m[1], env)); const got = R[pid].get(inKey(inp)); if (got !== want) return `oracle mismatch ${pid} ${m[1]} ${JSON.stringify(env)}: java=${got} js=${want}`; n++; }
  }
  return n;
}

const report = []; let failures = []; let totalPrograms = 0, totalRuns = 0, totalOracle = 0, compiled = 0;
const t0 = Date.now();
const LEVELS = process.env.LEVELS ? process.env.LEVELS.split(",") : DIFFICULTIES;
for (const mode of modes) for (const L of LEVELS) {
  const rng = makeRng(424242 + modes.indexOf(mode) * 31 + DIFFICULTIES.indexOf(L));
  const qs = []; for (let i = 0; i < perCell; i++) { const q = generate(mode, rng, L); if (q.check) qs.push({ id: `${mode}/${L}/${i}`, q }); }
  // --mutate: corrupt every answer key (or one claim) to prove the verifier rejects wrong keys
  if (args.includes("--mutate")) for (const { q } of qs) { if (q.check.claims.length > 1) q.answer = (q.answer + 1) % q.check.claims.length; }
  let ok = 0, bad = 0, oracle = 0;
  for (let b = 0; b < qs.length; b += 250) {
    const batch = qs.slice(b, b + 250);
    const res = runBatch(batch);
    if (res.compileError) { failures.push({ cell: `${mode}/${L}`, error: "COMPILE", detail: res.compileError }); bad += batch.length; continue; }
    compiled += batch.length;
    for (const { id, q } of batch) {
      totalPrograms += Object.keys(q.check.programs).length; totalRuns += Object.values(q.check.inputs).reduce((s, x) => s + x.length, 0);
      try {
        const R = res.R.get(id);
        const truths = q.check.claims.map(c => evalClaim(c, q, R));
        const nTrue = truths.filter(Boolean).length;
        let err = null;
        if (nTrue !== 1) err = `${nTrue} options are true`; else if (!truths[q.answer]) err = `keyed answer ${q.answer} is false; true option is ${truths.indexOf(true)}`;
        if (!err && q.check.table) { const wrongRows = q.check.table.rows.filter(r => r.shown !== null && R[q.check.table.p].get(inKey(r.in)) !== String(r.shown)).length; if (wrongRows !== (q.check.table.expectWrong || 0)) err = `table has ${wrongRows} incorrect rows`; }
        const oc = oracleCheck(q, R); if (typeof oc === "string") err = oc; else oracle += oc;
        if (err) { bad++; failures.push({ id, family: q.family, err, question: q.question, code: q.code, choices: q.choices, answer: q.answerText }); } else ok++;
      } catch (e) { bad++; failures.push({ id, family: q.family, err: e.message }); }
    }
  }
  totalOracle += oracle;
  report.push({ mode, difficulty: L, tested: qs.length, verified: ok, failed: bad, oracleRowChecks: oracle });
  console.log(`${mode.padEnd(11)} ${L.padEnd(12)} verified ${ok}/${qs.length}${bad ? `  FAILED ${bad}` : ""}  (oracle rows ${oracle})`);
}
const summary = { perCell, challenges: report.reduce((s, r) => s + r.tested, 0), verified: report.reduce((s, r) => s + r.verified, 0), failed: failures.length, javaPrograms: totalPrograms, javaExecutions: totalRuns, oracleRowChecks: totalOracle, seconds: Math.round((Date.now() - t0) / 1000), java: execFileSync("java", ["-version"], { stdio: ["ignore", "pipe", "pipe"] }).toString() || "" };
console.log(`\nJava verification: ${summary.verified}/${summary.challenges} challenges, ${summary.javaPrograms} programs, ${summary.javaExecutions} JVM executions, ${summary.oracleRowChecks} independent-oracle row checks, ${summary.failed} failures, ${summary.seconds}s`);
for (const f of failures.slice(0, 8)) console.log("FAIL", JSON.stringify(f).slice(0, 900));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary, report, failures: failures.slice(0, 200) }, null, 2));
process.exit(failures.length ? 1 : 0);
