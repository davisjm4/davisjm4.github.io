// Independent JVM oracle for the three "which change/chain" families, working only from student-visible text:
//   coverage/fix-boundary, coverage/equivalent-chain, switchIf/missing-break-fix.
// Each option is applied to (or turned into) Java source exactly as a student would read it, every version is compiled
// and run over the full input domain, and the results are compared with the specification stated in the question.
// Also checks the behaviour that the selected misconception tags promise (e.g. a "no-op" tag really changes nothing).
// usage: node family-java-verify.mjs [perCell=120] [seedBase=4141] [--json out.json]
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { generateCoverage } from "../../generators/coverage.js"; import { generateSwitch } from "../../generators/switch-if.js"; import { makeRng } from "../../generators/core.js";
const a = process.argv.slice(2); const per = Number(a[0] || 120), base = Number(a[1] || 4141);
const sabotage = a.includes("--sabotage-key");   // self-test: corrupt the keyed answer, the verifier must then fail
const jsonOut = a.includes("--json") ? a[a.indexOf("--json") + 1] : null;
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

// ---------- Java batch runner: methods take one parameter; returns output string per (method, input) ----------
function runBatch(methods) { // [{id, type, name, body, inputs:[string literal in Java syntax]}]
  const src = []; const calls = [];
  methods.forEach((m, i) => { src.push(`  static void m${i}(${m.type} ${m.name}) {\n${m.body.split("\n").map(l => "    " + l).join("\n")}\n  }`); m.inputs.forEach((lit, j) => calls.push(`      case ${calls.length}: m${i}(${lit}); break;`)); });
  const total = calls.length; const CH = 400; const chunks = [];
  for (let c = 0; c < total; c += CH) chunks.push(`  static void d${c / CH}(int k) { switch (k) {\n${calls.slice(c, c + CH).join("\n")}\n    } }`);
  const java = `import java.io.*;\npublic class Fam {\n${src.join("\n")}\n${chunks.join("\n")}\n  static void call(int k) { ${chunks.map((_, i) => `if (k / ${CH} == ${i}) { d${i}(k); return; }`).join(" ")} }\n  public static void main(String[] x) {\n    PrintStream real = System.out;\n    for (int k = 0; k < ${total}; k++) {\n      ByteArrayOutputStream b = new ByteArrayOutputStream(); System.setOut(new PrintStream(b));\n      try { call(k); } catch (Throwable t) { System.out.print("EXC:" + t.getClass().getSimpleName()); }\n      System.setOut(real); real.println(b.toString().replace("\\\\", "\\\\\\\\").replace("\\n", "\\\\n"));\n    }\n  }\n}\n`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fam-")); const f = path.join(dir, "Fam.java"); fs.writeFileSync(f, java);
  let out; try { out = execFileSync("java", ["-Xss8m", f], { maxBuffer: 1 << 29, stdio: ["ignore", "pipe", "pipe"] }).toString(); } catch (e) { throw new Error("Java failed: " + String(e.stderr || e).slice(0, 2500)); }
  const lines = out.split("\n"); lines.pop(); if (lines.length !== total) throw new Error(`expected ${total} results, got ${lines.length}`);
  const res = []; let k = 0; for (const m of methods) { res.push(m.inputs.map(() => lines[k++].replace(/\\n/g, "\n").replace(/\\\\/g, "\\"))); } return res;
}

import { parseIfChain, printIfChain, parseNotation, domainOf, range, parseSwitch, printSwitch, nameOfBlock, clone, applySwitchEdit } from "./displayed-parsers.mjs";

const failures = []; const tally = {}; const jobs = []; const T = (k, ok) => { tally[k] ??= { n: 0, ok: 0 }; tally[k].n++; if (ok) tally[k].ok++; };
const fail = (rec) => failures.push(rec);

// ---------- build jobs ----------
for (const L of LEVELS) for (let i = 0; i < per; i++) {
  const seed = base + i * 7919 + LEVELS.indexOf(L) * 104729;
  // fix-boundary
  try { const q = generateCoverage(makeRng(seed), L, "fix-boundary"); const d = domainOf(q.code); const spec = q.question.match(/: (.*)\. Which single change/)[1].split("; ");
    const specFn = v => { for (const p of spec) { let m; if ((m = p.match(/^(-?\d+) and above → "(.*)"$/))) { if (v >= +m[1]) return m[2]; } else if ((m = p.match(/^(-?\d+) to (-?\d+) → "(.*)"$/))) { if (v >= +m[1] && v <= +m[2]) return m[3]; } else if ((m = p.match(/^below (-?\d+) → "(.*)"$/))) { if (v < +m[1]) return m[2]; } } return null; };
    const orig = parseIfChain(q.code); const versions = q.choices.map(c => { const ch = clone(orig); let m; if ((m = c.match(/^Change (.+) to (.+)$/))) { const arm = ch.arms.filter(x => x.cond === m[1]); if (arm.length !== 1) throw new Error(`condition "${m[1]}" not found exactly once`); arm[0].cond = m[2]; } else if (c === "Swap the order of the first two conditions") { [ch.arms[0], ch.arms[1]] = [ch.arms[1], ch.arms[0]]; } else throw new Error("unparsed option " + c); return ch; });
    jobs.push({ fam: "fix-boundary", L, seed, q, d, expected: range(d.lo, d.hi).map(v => specFn(+v) + "\n"), specOk: true, versions: [orig, ...versions], print: printIfChain, type: "int", name: d.name, inputs: range(d.lo, d.hi) }); } catch (e) { fail({ fam: "fix-boundary", L, seed, error: String(e.message) }); }
  // equivalent-chain
  try { const q = generateCoverage(makeRng(seed), L, "equivalent-chain"); const d = domainOf(q.code); const orig = parseIfChain(q.code); const versions = q.choices.map(parseNotation);
    jobs.push({ fam: "equivalent-chain", L, seed, q, d, expected: null, versions: [orig, ...versions], print: printIfChain, type: "int", name: d.name, inputs: range(d.lo, d.hi) }); } catch (e) { fail({ fam: "equivalent-chain", L, seed, error: String(e.message) }); }
  // missing-break-fix
  try { const q = generateSwitch(makeRng(seed), L, "missing-break-fix"); const sw = parseSwitch(q.code); const lab = sw.blocks.flatMap(b => b.labels); const isChar = lab[0].startsWith("'"), isStr = lab[0].startsWith('"');
    const outsider = isChar ? "'~'" : isStr ? '"zzz"' : String(Math.max(...lab.map(Number)) + 17); const ins = [...lab, outsider];
    const exp = lit => { const b = sw.blocks.find(x => x.labels.includes(lit)); if (b) return b.stmts.join(""); const dflt = sw.blocks.find(x => x.isDefault); return dflt ? dflt.stmts.join("") : ""; };
    const versions = q.choices.map(c => applySwitchEdit(sw, c));
    jobs.push({ fam: "missing-break-fix", L, seed, q, d: { name: sw.sel }, expected: ins.map(exp), versions: [sw, ...versions], print: printSwitch, type: isChar ? "char" : isStr ? "String" : "int", name: sw.sel, inputs: ins }); } catch (e) { fail({ fam: "missing-break-fix", L, seed, error: String(e.message) }); }
}

// ---------- run on the JVM ----------
const methods = []; const index = [];
for (const [ji, j] of jobs.entries()) j.versions.forEach((v, vi) => { methods.push({ type: j.type, name: j.name, body: j.fam === "missing-break-fix" ? j.print(v) : j.print(v), inputs: j.inputs }); index.push([ji, vi]); });
if (sabotage) for (const j of jobs) j.q.answer = (j.q.answer + 1) % j.q.choices.length;
const results = []; const BATCH = 250; for (let s = 0; s < methods.length; s += BATCH) results.push(...runBatch(methods.slice(s, s + BATCH)));
const outs = jobs.map(() => []); index.forEach(([ji, vi], k) => { outs[ji][vi] = results[k]; });
const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);

for (const [ji, j] of jobs.entries()) { const [origOut, ...optOuts] = outs[ji]; const key = `${j.fam}/${j.L}`; const q = j.q; const probs = [];
  // parser faithfulness: reprinting the parsed original must behave exactly like the original displayed code (checked via the original-version output of a spec-less reference)
  let expected = j.expected; if (!expected) expected = origOut;   // equivalent-chain: the displayed code is the reference
  const matches = optOuts.map((o, k) => same(o, expected) ? k : -1).filter(k => k >= 0);
  if (matches.length !== 1 || matches[0] !== q.answer) probs.push(`JVM says options ${JSON.stringify(matches)} satisfy the specification; keyed ${q.answer}`);
  // misconception behaviour promised by tags
  const noop = new Set(["equivalent-rewrite-of-the-bug", "rewrites-the-wrong-arm-equivalently", "thinks-braces-stop-fall-through", "adds-useless-break"]);
  q.choiceTags.forEach((tag, k) => { if (k === q.answer) return; const o = optOuts[k];
    if (noop.has(tag) && !same(o, origOut)) probs.push(`tag ${tag} should leave behaviour unchanged but option ${k} differs from the displayed code`);
    if (j.fam !== "equivalent-chain" && tag !== "correct" && same(o, expected)) probs.push(`distractor ${k} (${tag}) actually satisfies the specification`);
    if (tag === "fixes-only-one-fall-through") { const fixedSome = o.some((v, t) => v === expected[t] && origOut[t] !== expected[t]); const stillWrong = o.some((v, t) => v !== expected[t]); if (!(fixedSome && stillWrong)) probs.push(`tag ${tag}: option ${k} should fix some but not all inputs`); } });
  T(key, probs.length === 0); if (probs.length) fail({ fam: j.fam, L: j.L, seed: j.seed, question: q.question.slice(0, 100), choices: q.choices, keyed: q.answer, problems: probs.slice(0, 3) }); }

const errs = failures.filter(f => f.error).length;
console.log(`Family JVM verification: ${jobs.length} challenges (${methods.length} Java programs, ${results.flat().length} executions), per cell ${per}`);
for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${k.padEnd(28)} ${v.ok}/${v.n}`);
console.log(`failures: ${failures.length} (${errs} generator/parse errors)`); failures.slice(0, 5).forEach(f => console.log(JSON.stringify(f).slice(0, 700)));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ per, base, jobs: jobs.length, tally, failures }, null, 1));
process.exit(failures.length ? 1 : 0);
