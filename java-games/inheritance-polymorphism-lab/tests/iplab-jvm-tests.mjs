/* Inheritance & Polymorphism Lab — Java verification (development only).
   Run from java-games/inheritance-polymorphism-lab/:
       node tests/iplab-jvm-tests.mjs
   Requires a JDK 17+; everything compiles with javac --release 17.

   1. MODEL vs JAVA, exhaustively, for every scenario hierarchy:
      every (declared type T, object class C, method m) — compile result,
      exception, and output must match java-model.js; every cast
      ((S) x).m() for every S; every constructor chain new C().
   2. Every model-driven challenge's own statements, run as written.
   3. Hand-written items: intended compile errors fail with the intended
      javac message at the intended line; intended outputs and crashes
      happen; correct fixes compile and print the intended output; wrong
      fixes don't; override/overload/new/error tags; must-be-abstract keys;
      every header combination agrees with the engine's rule; choice
      outcomes; "compiles?" rows. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as E from "../engine.js";
import { EXTRA } from "../bank.js";
import { prep } from "../raw-items.js";

const J = E.J;
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "iplab-jvm-"));
const units = new Map();
let n = 0;
function unit(label, mode, src, check) {
  const id = String(++n).padStart(5, "0");
  const d = path.join(dir, id);
  fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, "MODE"), mode);
  fs.writeFileSync(path.join(d, /public class Main\b/.test(src) ? "Main.java" : "Unit.java"), src);
  units.set(id, { label, check, src });
}
const counts = {};
const tally = (k) => (counts[k] = (counts[k] || 0) + 1);

/* ---------------- 1. model vs Java, exhaustively ---------------- */
const hierarchies = { ...E.SCENARIOS, ...EXTRA };
const TRY = (expr) => `try { System.out.println(${expr}); } catch (ClassCastException cce) { System.out.println("throws ClassCastException"); }`;
const TRYSTMT = (st) => `try { ${st} } catch (ClassCastException cce) { System.out.println("throws ClassCastException"); }`;
for (const [name, classes] of Object.entries(hierarchies)) {
  unit(`${name}: classes compile`, "compile", J.renderClasses(classes).code, (s, o) => (s === "OK" ? null : "classes don't compile: " + o));
  const valid = []; // [label, expr, expected]
  const types = classes.map((c) => c.name);
  const methodNames = [...new Set(classes.flatMap((c) => c.methods.filter((m) => !m.params.length).map((m) => m.name)))];
  for (const T of types)
    for (const C of types) {
      const decl = { k: "new", t: T, name: "x", cls: C };
      const r = J.runStatement(classes, {}, decl);
      if (!r.compiles) {
        unit(`${name}: ${T} x = new ${C}()`, "compile", J.program(classes, [J.statementText(decl)]), (s, o) =>
          s === "COMPILE_ERROR" && o.includes(J.JAVAC_ERRORS[r.error]) ? null : `model says compile error (${r.error}); javac: ${s} ${o}`);
        tally("model: invalid creations");
        continue;
      }
      const env = { x: { decl: T, obj: C } };
      for (const m of methodNames) {
        const st = { k: "call", v: "x", m };
        const rr = J.runStatement(classes, env, st);
        const pre = J.constructionOutput(classes, C); // constructors may print first
        if (rr.compiles) valid.push([`${T} x = new ${C}(); x.${m}()`, `new ${C}()`, T, `.${m}()`, pre + rr.output]);
        else
          unit(`${name}: ${T} x = new ${C}(); x.${m}()`, "compile", J.program(classes, [`${T} x = new ${C}();`, J.statementText(st)]), (s, o) =>
            s === "COMPILE_ERROR" && o.includes(J.JAVAC_ERRORS[rr.error]) ? null : `model says ${rr.error}; javac: ${s} ${o}`);
        tally("model: calls");
        for (const S of types) {
          const cs = { k: "cast", v: "x", to: S, m };
          const rc = J.runStatement(classes, env, cs);
          if (!rc.compiles) {
            unit(`${name}: ${T} x = new ${C}(); ((${S}) x).${m}()`, "compile", J.program(classes, [`${T} x = new ${C}();`, J.statementText(cs)]), (s, o) =>
              s === "COMPILE_ERROR" && o.includes(J.JAVAC_ERRORS[rc.error]) ? null : `model says ${rc.error}; javac: ${s} ${o}`);
          } else valid.push([`${T} x = new ${C}(); ((${S}) x).${m}()`, `new ${C}()`, T, `.${m}()`, pre + (rc.exception ? "throws ClassCastException" : rc.output), S]);
          tally("model: casts");
        }
      }
      if (!classes.find((c) => c.name === C).abstract && classes.some((c) => c.ctor) && T === C) {
        const want = J.constructionOutput(classes, C);
        unit(`${name}: new ${C}() constructor chain`, "run", J.program(classes, [`new ${C}();`]), (s, o) => (s === "OK" && o === want ? null : `model "${want}", java ${s} "${o}"`));
        tally("model: constructor chains");
      }
    }
  // all valid calls/casts for this hierarchy in ONE program, one line each
  const lines = valid.map(([, init, T, call, , S], i) => `{ ${T} x${i} = ${init}; ${TRY(S ? `((${S}) x${i})${call}` : `x${i}${call}`)} }`);
  unit(`${name}: ${valid.length} valid calls`, "run", J.program(classes, lines), (s, o) => {
    if (s !== "OK") return `${s} ${o}`;
    const got = o.split("\n");
    const bad = valid.map((v, i) => (got[i] === v[4] ? null : `${v[0]}: model "${v[4]}", java "${got[i]}"`)).filter(Boolean);
    return bad.length ? bad.slice(0, 5).join("; ") : null;
  });
}

/* ---------------- 2. every model-driven challenge as written ---------------- */
const items = E.ITEMS;
for (const it of items) {
  const ch = E.instantiate(it, E.makeRng(1));
  const classes = it.classes || (it.scen && E.SCENARIOS[it.scen]);
  const decls = (it.decls || []).map((d) => `${d.t} ${d.v} = new ${d.obj}();`);
  const env = Object.fromEntries((it.decls || []).map((d) => [d.v, { decl: d.t, obj: d.obj }]));
  const stmts = !classes ? [] : it.stmt ? [it.stmt] : ["outputs", "compiles"].includes(it.kind) ? it.rows : [];
  for (const st of stmts) {
    const r = J.runStatement(classes, env, st);
    const src = J.program(classes, [...decls, st.k === "call" || st.k === "cast" ? TRY(J.statementText(st).replace(/^System\.out\.println\(|\);$/g, "")) : TRYSTMT(J.statementText(st))]);
    unit(`${it.id}: ${J.statementText(st)}`, r.compiles ? "run" : "compile", src, (s, o) => {
      if (!r.compiles) return s === "COMPILE_ERROR" && o.includes(J.JAVAC_ERRORS[r.error]) ? null : `expected compile error; got ${s} ${o}`;
      const want = r.exception ? "throws ClassCastException" : st.k === "call" || st.k === "cast" ? r.output : "";
      return s === "OK" && o === want ? null : `expected "${want}", got ${s} "${o}"`;
    });
    tally("challenge statements");
  }
  if (it.kind === "versions")
    for (const [label, cl] of it.versions) {
      const r = J.runStatement(cl, env, it.stmt);
      unit(`${it.id} ${label}`, "run", J.program(cl, [...decls, J.statementText(it.stmt)]), (s, o) => (s === "OK" && o === r.output ? null : `expected "${r.output}", got ${s} "${o}"`));
      tally("challenge statements");
    }
  if (it.kind === "swap")
    for (const obj of it.objs) {
      const r = J.runStatement(classes, { [it.v]: { decl: it.declType, obj } }, { k: "call", v: it.v, m: it.m });
      unit(`${it.id} new ${obj}()`, "run", J.program(classes, [`${it.declType} ${it.v} = new ${obj}();`, `System.out.println(${it.v}.${it.m}());`]), (s, o) => (s === "OK" && o === r.output ? null : `expected "${r.output}", got ${s} "${o}"`));
      tally("challenge statements");
    }
}

/* ---------------- 3. hand-written items ---------------- */
const firstErrorLine = (o) => Number((o.match(/^(\d+):/) || [])[1]);
for (const it of items.filter((i) => i.kind === "debug" || i.kind === "fixset")) {
  const { code, marks } = prep(it.src);
  const errLine = (it.errorLine ?? marks.bad[0]) + 1;
  unit(`${it.id}: original`, it.error ? "compile" : "run", code, (s, o) => {
    if (it.error) return s === "COMPILE_ERROR" && o.includes(it.error) && firstErrorLine(o) === errLine ? null : `expected "${it.error}" at line ${errLine}; got ${s} ${o}`;
    if (it.exception) return s === "RUN_ERROR" && o.includes(it.exception) ? null : `expected ${it.exception}; got ${s} ${o}`;
    return s === "OK" && o === it.actual ? null : `expected output "${it.actual}"; got ${s} "${o}"`;
  });
  tally("debug originals");
  if (it.outcome === "logic" && it.intended === it.actual) throw new Error(it.id + " actual equals intended");
  const ch = E.instantiate(it, E.makeRng(1));
  for (const f of ch.fixes || ch.fixData) {
    unit(`${it.id}: fix ${f.label}`, "run", E.applyEdits(code, f.edits), (s, o) => {
      const good = s === "OK" && o === it.intended;
      if (f.ok) return good ? null : `correct fix should print "${it.intended}"; got ${s} ${o}`;
      if (good) return "WRONG fix also works";
      // a wrong fix explained as "doesn't compile" must really not compile
      if (/doesn't compile|not allowed|can't be/.test(f.why) && s !== "COMPILE_ERROR" && !/ClassCastException|crash/.test(f.why)) return `explanation says it doesn't compile, but javac: ${s} "${o}"`;
      return null;
    });
    tally("debug fixes");
  }
}
// isolate one method of the subclass
function methodExtent(lines, header) {
  let start = header;
  if (lines[header - 1]?.trim() === "@Override") start = header - 1;
  let end = header;
  while (lines[end].trim() !== "}") end++;
  return [start, end];
}
for (const it of items.filter((i) => i.kind === "tags")) {
  const { code, marks } = prep(it.src);
  const lines = code.split("\n");
  const parentText = lines.slice(0, lines.findIndex((l, i) => i > 0 && /^class /.test(l))).join("\n");
  for (const row of marks.rows) {
    const keep = methodExtent(lines, row.line);
    const others = marks.rows.filter((r) => r !== row).map((r) => methodExtent(lines, r.line));
    const keptIdx = lines.map((_, i) => i).filter((i) => !others.some(([a, b]) => i >= a && i <= b));
    const isolated = keptIdx.map((i) => lines[i]).join("\n");
    const name = lines[row.line].match(/(\w+)\s*\(/)[1];
    unit(`${it.id}: ${lines[row.line].trim()} alone`, "compile", isolated, (s, o) => ((row.tag === "error") === (s === "COMPILE_ERROR") ? null : `tag ${row.tag} but javac ${s} ${o}`));
    if (row.tag !== "error") {
      // add @Override (if not present): compiles iff it truly overrides
      const withAnn = isolated.split("\n");
      const hdr = keptIdx.indexOf(row.line);
      if (withAnn[hdr - 1].trim() !== "@Override") withAnn.splice(hdr, 0, "    @Override");
      unit(`${it.id}: @Override on ${lines[row.line].trim()}`, "compile", withAnn.join("\n"), (s) => ((row.tag === "override") === (s === "OK") ? null : `tag ${row.tag} but with @Override javac says ${s}`));
      const parentHas = new RegExp(`\\b${name}\\s*\\(`).test(parentText);
      if (row.tag === "overload" && !parentHas) units.set("x" + n, { label: it.id, check: () => "overload tag but parent has no method of that name" });
      if (row.tag === "new" && parentHas && !/private/.test(parentText.split("\n").find((l) => new RegExp(`\\b${name}\\s*\\(`).test(l)))) units.set("y" + n, { label: it.id, check: () => "new tag but parent declares an accessible method of that name" });
    }
    tally("override tags");
  }
}
for (const it of items.filter((i) => i.kind === "mustabstract")) {
  const { code, marks } = prep(it.src);
  const lines = code.split("\n");
  unit(`${it.id}: original fails`, "compile", code, (s) => (s === "COMPILE_ERROR" ? null : "should not compile"));
  const headers = lines.map((l, i) => (/^class /.test(l) ? i : -1)).filter((i) => i >= 0);
  for (const h of headers) {
    const fixed = lines.slice();
    fixed[h] = "abstract " + fixed[h];
    unit(`${it.id}: abstract on ${lines[h]}`, "compile", fixed.join("\n"), (s) => (marks.abstract.includes(h) === (s === "OK") ? null : `${marks.abstract.includes(h) ? "key" : "non-key"} header: javac ${s}`));
    tally("must-be-abstract headers");
  }
}
for (const it of items.filter((i) => i.kind === "header")) {
  const ch = E.instantiate(it, E.makeRng(1));
  const S = ch.segments;
  for (let a = 0; a < S.access.length; a++)
    for (let t = 0; t < S.ret.length; t++)
      for (let p = 0; p < S.params.length; p++) {
        const r = { access: a, ret: t, params: p };
        const valid = E.headerValid(ch, r);
        unit(`${it.id}: ${E.headerText(ch, r)}`, "compile", E.headerCode(ch, r), (s, o) => (valid === (s === "OK") ? null : `engine says ${valid ? "valid" : "invalid"}; javac ${s} ${o}`));
        tally("header combinations");
      }
}
for (const it of items.filter((i) => i.kind === "rows")) {
  const classes = E.SCENARIOS[it.scen];
  for (const r of it.rows) {
    unit(`${it.id}: ${r.stmt}`, "compile", J.program(classes, [r.stmt]), (s, o) => ((s === "OK") === r.ok ? null : `key ${r.ok}; javac ${s} ${o}`));
    tally("compiles? rows");
  }
}
for (const it of items.filter((i) => i.kind === "choice")) {
  const { code } = prep(it.src);
  const v = it.verify;
  unit(`${it.id}`, v.compiles && /public class Main/.test(code) ? "run" : "compile", code, (s, o) => {
    if (v.compiles) return s === "OK" && (v.output === undefined || o === v.output) ? null : `expected to run with "${v.output}"; got ${s} ${o}`;
    return s === "COMPILE_ERROR" && o.includes(v.error) && (v.errorLine === undefined || firstErrorLine(o) === v.errorLine + 1) ? null : `expected "${v.error}" at line ${v.errorLine + 1}; got ${s} ${o}`;
  });
  tally("choice outcomes");
}

/* ---------------- run ---------------- */
console.log(`Inheritance & Polymorphism Lab JVM checks: ${units.size} units`);
const raw = execFileSync("java", [path.join(here, "JavaCheck.java"), dir], { encoding: "utf8", maxBuffer: 256 << 20, stdio: ["ignore", "pipe", "ignore"] });
const results = new Map(raw.trim().split("\n").map((l) => { const [id, s, d] = l.split("\t"); return [id, { s, d: (d || "").replace(/\\n/g, "\n").replace(/\n$/, "") }]; }));
let failures = 0;
for (const [id, u] of units) {
  const r = results.get(id) || { s: "NONE", d: "" };
  const err = u.check(r.s, r.d);
  if (err) {
    failures++;
    if (failures <= 40) console.log(`  ✗ ${u.label}: ${err}`);
  }
}
for (const [k, v] of Object.entries(counts)) console.log(`    ${k}: ${v}`);
console.log(failures ? `\n${failures} failure(s) of ${units.size}` : `  ✓ all ${units.size} units agree with javac/java (--release 17)`);
fs.rmSync(dir, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
