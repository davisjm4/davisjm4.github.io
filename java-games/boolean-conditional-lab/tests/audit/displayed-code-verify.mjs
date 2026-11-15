// Independent oracle on the code a student actually sees (q.code), not on generator internals.
// For every "What is printed? / What happens when this code runs? / What is stored in x?" challenge the displayed
// snippet is compiled and executed with javac/java; the JVM output must equal the keyed option and match no
// distractor. usage: node displayed-code-verify.mjs [perCell=300] [seedBase=555] [--json out.json]
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { generate, makeRng, booleanGame, DIFFICULTIES } from "../../engine.js";
const a = process.argv.slice(2); const per = Number(a[0] || 300), base = Number(a[1] || 555);
const jsonOut = a.includes("--json") ? a[a.indexOf("--json") + 1] : null;
const STEM = /(What is printed\?|What happens when this code runs\?|^What is stored in )/;
const MODES = ["evaluate", "branch", "coverage", "short", "switchIf"];
const items = [];
for (const mode of MODES) for (const L of DIFFICULTIES) for (let i = 0; i < per; i++) {
  const seed = base + i * 7919; let q; try { q = generate(mode, makeRng(seed), L); } catch { continue; }
  if (q.kind === "select" || !STEM.test(q.question) || !q.code) continue;
  let code = q.code; if (mode === "evaluate") { const m = code.trim().split("\n").pop().match(/^boolean (\w+) =/); if (!m) continue; code += `\nSystem.out.print(${m[1]});`; }
  items.push({ mode, L, seed, family: q.family, q, code });
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "disp-"));
const methods = items.map((it, i) => `  static void s${i}() {\n${it.code.split("\n").map(l => "    " + l).join("\n")}\n  }`);
const dispatch = items.map((_, i) => `      case ${i}: s${i}(); break;`);
const CH = 150, chunks = []; for (let i = 0; i < items.length; i += CH) chunks.push(i);
const src = `import java.io.*;\npublic class Disp {\n${methods.join("\n")}\n${chunks.map(c => `  static void run${c}(int k) {\n    switch (k) {\n${dispatch.slice(c, c + CH).join("\n")}\n    }\n  }`).join("\n")}\n  static void run(int k) { ${chunks.map(c => `if (k >= ${c} && k < ${c + CH}) { run${c}(k); return; }`).join(" ")} }\n  public static void main(String[] a) {\n    PrintStream real = System.out;\n    for (int k = 0; k < ${items.length}; k++) {\n      ByteArrayOutputStream b = new ByteArrayOutputStream(); System.setOut(new PrintStream(b)); String exc = "";\n      try { run(k); } catch (Throwable t) { exc = t.getClass().getName(); }\n      System.setOut(real); real.println(k + "\\t" + exc + "\\t" + b.toString().replace("\\\\", "\\\\\\\\").replace("\\n", "\\\\n"));\n    }\n  }\n}\n`;
fs.writeFileSync(path.join(tmp, "Disp.java"), src);
let out; try { out = execFileSync("java", ["-Xss8m", path.join(tmp, "Disp.java")], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] }).toString(); }   // source-launcher mode compiles with the JDK
catch (e) { console.log("COMPILE/RUN FAILURE\n" + String(e.stderr?.toString() || e).slice(0, 4000)); process.exit(2); }
const res = out.split("\n").filter(Boolean).map(l => { const [k, exc, txt] = l.split("\t"); return { k: +k, exc, txt: (txt ?? "").replace(/\\n/g, "\n").replace(/\\\\/g, "\\") }; });
const forms = (r) => { const lines = r.txt.split("\n").filter((x, i, arr) => !(i === arr.length - 1 && x === "")); const s = new Set([lines.join(", then "), r.txt.replace(/\n$/, ""), r.txt.trim(), lines.join(" ")]);
  if (r.exc) s.add(r.exc.endsWith("NullPointerException") ? "It throws a NullPointerException" : "It throws an exception");
  if (r.txt === "" && !r.exc) s.add("Nothing is printed"); return s; };
const bad = [], tally = {};
for (const r of res) { const it = items[r.k]; const f = forms(r); const q = it.q; const key = q.choices[q.answer]; const matches = q.choices.map((c, j) => f.has(c) ? j : -1).filter(j => j >= 0);
  const kk = `${it.mode}/${it.L}`; tally[kk] ??= { n: 0, ok: 0 }; tally[kk].n++;
  if (matches.length === 1 && matches[0] === q.answer) tally[kk].ok++; else bad.push({ mode: it.mode, L: it.L, seed: it.seed, family: it.family, question: q.question, code: it.code, choices: q.choices, keyed: key, jvm: JSON.stringify(r) }); }
console.log(`Displayed-code verification: ${res.length} snippets compiled and executed, ${res.length - bad.length} agree with the keyed answer and no distractor, ${bad.length} disagree`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(22)} ${v.ok}/${v.n}`);
if (bad.length) { console.log("\nFirst failures:"); bad.slice(0, 6).forEach(b => console.log(JSON.stringify(b, null, 1).slice(0, 900))); }
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ per, base, verified: res.length, failures: bad }, null, 1));
process.exit(bad.length ? 1 : 0);
