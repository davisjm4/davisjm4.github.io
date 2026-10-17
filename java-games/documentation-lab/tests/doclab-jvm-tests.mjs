/* Documentation Lab — Java verification (development only).
   Run from java-games/documentation-lab/:   node tests/doclab-jvm-tests.mjs
   Requires a JDK (javac 17 or newer); everything compiles with --release 17.

   Checks:
   1. Every code block compiles exactly as shown (slot markers removed;
      excerpts wrapped in a method and labeled "Excerpt" in the UI).
   2. Comment Editor: the code with the correct repair applied passes javac's
      doclint (-Xdoclint:all,-missing), so the fixed Javadoc is well-formed.
   3. Javadoc Builder: the method with the correct assembled Javadoc passes
      doclint (no @return on void, @param names match the signature, ...).
      Each decoy tag the student must leave out (e.g. @return on a void
      method, @param for a field) FAILS doclint when inserted.
   4. Every `verify` fact in the bank (API behavior a challenge relies on)
      produces the expected output on a real JVM.
   5. API Detective: the correct option satisfies every case; each distractor
      fails to compile or gives a different result for at least one case.
   6. "Which does not compile" items: exactly the keyed option fails.
   7. Assemble-a-call: every possible method/argument combination is run on
      the JVM and must agree with the JavaScript evaluator in engine.js
      (compile error, exception, returned value, or resulting list).        */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as E from "../engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doclab-jvm-"));
const units = new Map(); // id -> {mode, expect: fn(status, out) -> error|null}
let n = 0;
function unit(label, mode, files, expect) {
  const id = String(++n).padStart(4, "0") + "-" + label.replace(/[^\w-]/g, "_").slice(0, 60);
  const d = path.join(dir, id);
  fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, "MODE"), mode);
  for (const [name, src] of Object.entries(files)) fs.writeFileSync(path.join(d, name), src);
  units.set(id, { label, expect, files });
}
const IMPORTS = "import java.util.*;\n";
const all = Object.entries(E.ITEMS).flatMap(([mode, items]) => items.map((i) => ({ ...i, mode })));

/* ---- source builders ---- */
function sourceFor(block, code, mode) {
  const j = block.java;
  const body = E.compilableCode(code);
  const support = j.support ? "\n" + j.support + "\n" : "";
  if (j.kind === "class") return { "Unit.java": IMPORTS + body.replace(/^public class/m, "class") + support };
  if (j.kind === "method") return { "Unit.java": IMPORTS + `class Wrapper {\n${j.fields || ""}\n${body}\n}` + support };
  if (j.kind === "excerpt") {
    const before = j.before || "void run() throws Exception {";
    const after = j.after || "}";
    return { "Unit.java": IMPORTS + `class Wrapper {\n${before}\n${body}\n${after}\n}` + support };
  }
  throw new Error("unknown java kind " + j.kind);
}
const mustCompile = (s) => (s === "OK" ? null : "expected to compile");
const mustFail = (s) => (s === "COMPILE_ERROR" ? null : "expected a compile error");

/* 1. every code block compiles */
for (const it of all)
  (it.blocks || []).forEach((b, bi) => {
    if (!b.java) throw new Error(`${it.id} block ${bi} has no java spec`);
    unit(`${it.id}-block${bi}`, "compile", sourceFor(b, b.code), mustCompile);
  });

/* 2. Comment Editor: repaired code passes doclint */
for (const it of all.filter((i) => i.kind === "repair")) {
  const ch = E.instantiate(it, E.makeRng(1));
  const fixed = E.applyRepair(ch, ch.bad, ch.fixAnswer);
  unit(`${it.id}-repaired`, "doclint", sourceFor(it.blocks[0], fixed), (s, o, msg) => (s === "OK" ? null : "repaired Javadoc fails doclint: " + msg));
}

/* 3. Javadoc Builder: correct Javadoc passes doclint; decoys fail */
function withJavadoc(it, ch, picks) {
  const lines = it.blocks[0].code.split("\n");
  const at = lines.findIndex((l) => /^\s*(public|private|protected)\b[^=]*\(.*\)\s*\{\s*$/.test(l) && !/\bclass\b/.test(l));
  const indent = lines[at].match(/^ */)[0];
  const doc = E.buildJavadoc(ch, picks, indent);
  return [...lines.slice(0, at), doc, ...lines.slice(at)].join("\n");
}
for (const it of all.filter((i) => i.kind === "build")) {
  const ch = E.instantiate(it, E.makeRng(1));
  const right = ch.slots.map((s) => s.answer);
  unit(`${it.id}-javadoc`, "doclint", sourceFor(it.blocks[0], withJavadoc(it, ch, right)), (s, o, msg) => (s === "OK" ? null : "correct Javadoc fails doclint: " + msg));
  ch.slots.forEach((s, si) => {
    if (!s.options[s.answer].omit) return;
    // Decoys that doclint can judge: @return on void, @param that isn't a parameter.
    const sig = it.blocks[0].code.split("\n").find((l) => /\(.*\)\s*\{/.test(l) && !/class/.test(l));
    const isVoid = /\bvoid\b/.test(sig);
    const paramNames = (sig.match(/\((.*)\)/)[1].match(/\b(\w+)\s*(?:,|$)/g) || []).map((x) => x.replace(/[,\s]/g, ""));
    const judge = (s.tag === "return" && isVoid) || (s.tag === "param" && !paramNames.includes(s.name));
    if (!judge) return;
    const decoy = s.options.findIndex((o) => !o.omit);
    const picks = right.slice();
    picks[si] = decoy;
    unit(`${it.id}-decoy-${s.tag}`, "doclint", sourceFor(it.blocks[0], withJavadoc(it, ch, picks)), (st) => (st === "COMPILE_ERROR" ? null : `doclint should reject the decoy ${s.label}`));
  });
}

/* run-unit helper */
function mainSource(body) {
  return { "Main.java": IMPORTS + `public class Main {\n  public static void main(String[] args) {\n    try {\n${body}\n    } catch (Exception e) {\n      System.out.print("throws " + e.getClass().getSimpleName());\n    }\n  }\n}\n` };
}
function runUnit(label, body, check) {
  unit(label, "run", mainSource(body), check);
}
const printOf = (x) => `System.out.print(String.valueOf(${x}));`;

/* 4. verify facts */
for (const it of all)
  (it.verify || []).forEach((v, vi) => {
    const body = `${v.setup || ""}\n${v.stmt || ""}\n${printOf(v.expr || v.print)}`;
    runUnit(`${it.id}-verify${vi}`, body, (s, out) => (s === "OK" && out === v.expect ? null : `expected "${v.expect}", got ${s} "${out}"`));
  });

/* 5. API Detective option checks */
function optionBody(jv, text, c) {
  if (jv.kind === "expr") return `${c.setup}\n${printOf(jv.print ? jv.print.replace("__", `(${text})`) : text)}`;
  if (jv.kind === "cond") return `${c.setup}\nif (${text}) System.out.print("true"); else System.out.print("false");`;
  return `${c.setup}\n${text}\n${printOf(c.print)}`;
}
const optionResults = new Map(); // item id -> [{ok, label, results:[]}]
for (const it of all.filter((i) => i.jv)) {
  it.options.forEach((o, oi) =>
    it.jv.cases.forEach((c, ci) => {
      const key = `${it.id}#${oi}#${ci}`;
      runUnit(key, optionBody(it.jv, o.text, c), () => null);
      optionResults.set(key, { item: it, option: o, c });
    }),
  );
}

/* 6. "does not compile" items */
for (const it of all.filter((i) => i.optionChecks === "compile"))
  it.options.forEach((o, oi) =>
    unit(`${it.id}-opt${oi}`, "compile", { "Unit.java": IMPORTS + `class Wrapper { void run() {\n${o.text}\n} }` }, o.ok ? mustFail : mustCompile),
  );

/* 7. assemble-a-call: JVM vs JS evaluator for every combination */
const javaLit = (v) => (typeof v === "string" ? JSON.stringify(v) : String(v));
for (const it of all.filter((i) => i.kind === "assemble")) {
  const ch = E.instantiate(it, E.makeRng(1));
  const r = ch.receiver;
  const setup =
    r.type === "String"
      ? `String ${r.name} = ${javaLit(r.value)};`
      : `${r.type} ${r.name} = new ArrayList<>(List.of(${r.value.map(javaLit).join(", ")}));`;
  const vars = Object.entries(ch.vars || {}).map(([k, v]) => `int ${k} = ${v};`).join("\n");
  for (const call of E.allCalls(ch)) {
    const js = E.evaluateCall(ch, call.method, call.args);
    const stmt = ch.template.replace("{call}", js.callText);
    const target = (ch.template.match(/^\w+\s+(\w+)\s*=/) || [])[1];
    const body = `${setup}\n${vars}\n${stmt}\n${printOf(target || r.name)}`;
    const jsOut = !js.compiles ? "COMPILE_ERROR" : js.throws ? "throws " + js.throws : ch.want.type === "list" ? js.listText : String(js.result);
    runUnit(`${it.id}-${js.callText}`, body, (s, out) => {
      const jvm = s === "COMPILE_ERROR" ? "COMPILE_ERROR" : out;
      return jvm === jsOut ? null : `JS evaluator says ${jsOut}, JVM says ${jvm}`;
    });
  }
}

/* ---- run the harness ---- */
console.log(`Documentation Lab JVM checks: ${units.size} compilation units in ${dir}`);
const raw = execFileSync("java", [path.join(here, "JavaCheck.java"), dir], { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] });
const results = new Map(raw.trim().split("\n").map((l) => { const [id, s, d] = l.split("\t"); return [id, { s, d: (d || "").replace(/\\n/g, "\n") }]; }));
let failures = 0;
const fail = (msg) => { failures++; console.log("  ✗ " + msg); };
const byLabel = new Map();
for (const [id, u] of units) {
  const r = results.get(id);
  if (!r) { fail(`${u.label}: no result`); continue; }
  byLabel.set(u.label, r);
  const err = u.expect(r.s, r.d, r.d);
  if (err) fail(`${u.label}: ${err}${r.s === "COMPILE_ERROR" && !/doclint|compile error/.test(err) ? " — " + r.d : ""}`);
}
// evaluate option groups
for (const it of all.filter((i) => i.jv)) {
  it.options.forEach((o, oi) => {
    const outs = it.jv.cases.map((c, ci) => byLabel.get(`${it.id}#${oi}#${ci}`));
    const compiles = outs.every((x) => x.s === "OK");
    const matches = outs.map((x, ci) => x.s === "OK" && x.d === it.jv.cases[ci].expect);
    if (o.ok && !matches.every(Boolean)) fail(`${it.id}: correct option "${o.text}" gave ${outs.map((x) => x.s + ":" + x.d).join(", ")}`);
    if (!o.ok && compiles && matches.every(Boolean)) fail(`${it.id}: distractor "${o.text}" also satisfies every case`);
    // A distractor whose explanation says "doesn't compile" must really fail to compile, and vice versa.
    const saysNoCompile = /doesn't compile|does not compile|can't be stored/i.test(o.why || "");
    if (!o.ok && saysNoCompile && compiles) fail(`${it.id}: "${o.text}" is explained as not compiling, but it compiles`);
    if (!o.ok && !saysNoCompile && !compiles) fail(`${it.id}: "${o.text}" fails to compile, but its explanation doesn't say so`);
  });
}
const total = units.size;
console.log(failures ? `\n${failures} failure(s) out of ${total} units` : `  ✓ all ${total} compilation units behaved as expected (javac --release 17)`);
fs.rmSync(dir, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
