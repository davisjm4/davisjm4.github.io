/* Independent Java batch runner for the Loop Lab audit. It does not use the repo's
 * java-model.js printers or tests/jvm-harness.mjs. Each snippet is wrapped by THIS file,
 * compiled with real javac, run in one JVM per batch with stdout captured per snippet. */
import fs from "node:fs"; import path from "node:path"; import os from "node:os";
import { spawnSync } from "node:child_process";

const HELP = `static int __s,__bb,__cc,__uu,__k; static int[] __m=new int[26]; static StringBuilder __tr=new StringBuilder();
 static boolean __c(boolean b){__cc++;return b;} static boolean __kk(boolean b){__k++;return b;}
 static boolean __t(String s,boolean b){__tr.append(s).append("\\n");return b;} static void __p(String s){__tr.append(s).append("\\n");}`;
export function guard(code) {
  return code.replace(/((?:\bwhile|\bfor)\s*\([^\n]*\)\s*\{)/g, '$1 if(++__s>200000) throw new RuntimeException("LIMIT");')
             .replace(/(\bdo\s*\{)/g, '$1 if(++__s>200000) throw new RuntimeException("LIMIT");');
}
/* jobs: [{code, extra?}] -> [{ok, compileError, exc, out:[lines], extras:{bb,cc,uu,k,m:[..],tr:[..]}}] */
export function findJdkCompiler() { const r = spawnSync("java", ["--list-modules"], { encoding: "utf8" }); return r.status === 0 && /jdk\.compiler/.test(r.stdout); }
export function runJobs(jobs, { batch = 200 } = {}) {
  const results = new Array(jobs.length);
  for (let b0 = 0; b0 < jobs.length; b0 += batch) {
    const idxs = []; for (let i = b0; i < Math.min(jobs.length, b0 + batch); i++) idxs.push(i);
    let live = idxs.slice();
    for (let attempt = 0; attempt < 40 && live.length; attempt++) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "la-"));
      let lines = []; const range = {};
      const classes = live.map((i) => {
        const src = `class P${i} { ${HELP}\n public static void main(String[] args) throws Exception {\n${guard(jobs[i].code)}\n${jobs[i].extra || ""}\n }\n}\n`;
        return src;
      });
      let text = ""; let line = 1;
      const header = `public class R${b0} {\n`;
      const runner = `public static void main(String[] a) throws Exception { java.io.PrintStream real=System.out;\n` + live.map((i) =>
        `{ java.io.ByteArrayOutputStream bo=new java.io.ByteArrayOutputStream(); System.setOut(new java.io.PrintStream(bo,true,"UTF-8")); String exc=""; P${i}.__s=0;P${i}.__tr.setLength(0);
          try{ P${i}.main(new String[0]); }catch(Throwable t){ exc=t.getClass().getSimpleName(); } System.setOut(real);
          real.print("@@B "+${i}+"\\n"+bo.toString("UTF-8")+"\\n@@E "+exc+"\\n@@X "+P${i}.__bb+" "+P${i}.__cc+" "+P${i}.__uu+" "+P${i}.__k+" "+java.util.Arrays.toString(P${i}.__m)+"\\n@@T\\n"+P${i}.__tr+"@@Z\\n"); }`).join("\n") + "\n}\n}\n";
      // top-level classes first so line->class mapping is simple
      const parts = []; let cur = 2;
      for (let j = 0; j < live.length; j++) { const n = classes[j].split("\n").length - 1; range[live[j]] = [cur, cur + n - 1]; cur += n; parts.push(classes[j]); }
      const file = path.join(dir, `R${b0}.java`);
      fs.writeFileSync(file, "import java.util.*;\n" + parts.join("") + header.replace("public class", "class") + runner);
      const jc = spawnSync("java", ["-m", "jdk.compiler/com.sun.tools.javac.Main", "-proc:none", "-nowarn", "-Xmaxerrs", "100000", "-d", dir, file], { encoding: "utf8", maxBuffer: 1 << 28 });
      if (jc.status !== 0) {
        const bad = new Set();
        for (const m of (jc.stderr || "").matchAll(/R\d+\.java:(\d+): error/g)) { const ln = +m[1]; for (const i of live) if (ln >= range[i][0] && ln <= range[i][1]) bad.add(i); }
        if (!bad.size) { for (const i of live) results[i] = { ok: false, compileError: (jc.stderr || "").slice(0, 400) }; live = []; fs.rmSync(dir, { recursive: true, force: true }); break; }
        for (const i of bad) { const msg = (jc.stderr.match(new RegExp(`R\\d+\\.java:(?:${rangeLines(range[i])}): error: [^\\n]*`)) || [""])[0]; results[i] = { ok: false, compileError: msg }; }
        live = live.filter((i) => !bad.has(i)); fs.rmSync(dir, { recursive: true, force: true }); continue;
      }
       const jr = spawnSync("java", ["-Xss16m", "-cp", dir, `R${b0}`], { encoding: "utf8", maxBuffer: 1 << 29, timeout: 900000 });
      for (const blk of (jr.stdout || "").split("@@B ").slice(1)) {
        const nl = blk.indexOf("\n"), i = Number(blk.slice(0, nl)); const rest = blk.slice(nl + 1);
        const body = rest.slice(0, rest.indexOf("\n@@E "));
        const exc = rest.slice(rest.indexOf("@@E ") + 4).split("\n")[0].trim();
        const x = rest.slice(rest.indexOf("@@X ") + 4).split("\n")[0].split(" ");
        const tr = rest.slice(rest.indexOf("@@T\n") + 4, rest.indexOf("@@Z")).split("\n").filter(Boolean);
        let out = body.split("\n"); if (out.at(-1) === "") out.pop();
        results[i] = { ok: true, exc: exc || null, out, bb: +x[0], cc: +x[1], uu: +x[2], k: +x[3], m: JSON.parse(rest.slice(rest.indexOf("@@X ") + 4).split("\n")[0].split(" ").slice(4).join(" ")), tr };
      }
       for (const i of live) if (!results[i]) results[i] = { ok: false, compileError: "no result: " + (jr.stderr || "").slice(0, 200) };
      fs.rmSync(dir, { recursive: true, force: true }); live = [];
    }
  }
  return results;
}
function rangeLines([a, b]) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r.join("|"); }
