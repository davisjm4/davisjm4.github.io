/* Shared JVM batch runner: compiles many generated programs in one source-launcher run. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { instrumentedClass, plainClass } from "../engine/java-model.js";

export function findJava() {
  const env = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", "java") : null;
  const candidates = [env, "/usr/lib/jvm/java-17-openjdk-amd64/bin/java", "/usr/lib/jvm/java-21-openjdk-amd64/bin/java", "/usr/bin/java"].filter(Boolean);
  for (const c of candidates) { try { if (fs.existsSync(c)) { execFileSync(c, ["-version"], { stdio: "ignore" }); return c; } } catch {} }
  return null;
}
export function javaVersion(java) { const r = spawnSync(java, ["-version"], { encoding: "utf8" }); return (r.stderr || r.stdout || "").trim(); }

/**
 * programs: [{ program, kind: "instrumented" | "plain" }]
 * returns per program: { stdoutLines, S, C, B, K, exception }
 */
export function runBatch(java, programs, { batchSize = 250 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-jvm-"));
  const results = [];
  for (let start = 0; start < programs.length; start += batchSize) {
    const chunk = programs.slice(start, start + batchSize);
    const classes = chunk.map((p, i) => {
      const name = `P${start + i}`;
      const src = p.kind === "plain" ? plainClass(p.program, name) : instrumentedClass(p.program, name);
      return src.replace(/^public class/, "class");
    });
    const runner = `public class Runner {
    public static void main(String[] args) throws Exception {
        java.io.PrintStream real = System.out;
${chunk.map((_, i) => `        { java.io.ByteArrayOutputStream b = new java.io.ByteArrayOutputStream(); System.setOut(new java.io.PrintStream(b, true, "UTF-8"));
          String exc = ""; try { P${start + i}.main(new String[0]); } catch (Throwable t) { exc = t.getClass().getSimpleName(); }
          System.setOut(real); real.print("@@BEGIN ${start + i}\\n" + b.toString("UTF-8") + "\\n@@EXC " + exc + "\\n@@END\\n"); }`).join("\n")}
    }
}
${classes.join("\n")}`;
    const file = path.join(dir, `Runner${start}.java`);
    fs.writeFileSync(file, runner.replace("public class Runner", `public class Runner${start}`));
    const out = execFileSync(java, ["-Xss8m", file], { encoding: "utf8", maxBuffer: 1 << 28, timeout: 600000 });
    const blocks = out.split("@@BEGIN ").slice(1);
    for (const block of blocks) {
      const nl = block.indexOf("\n"), idx = Number(block.slice(0, nl));
      const body = block.slice(nl + 1, block.lastIndexOf("\n@@EXC "));
      const exc = block.slice(block.lastIndexOf("@@EXC ") + 6).split("\n")[0].trim();
      const lines = body.split("\n");
      const r = { exception: exc || null, S: null, C: null, B: null, K: null };
      const sIdx = lines.findIndex((l) => l.startsWith("##S"));
      let outLines = sIdx >= 0 ? lines.slice(0, sIdx) : lines;
      if (sIdx >= 0) {
        const arr = (pre) => JSON.parse(lines.find((l) => l.startsWith(pre)).slice(3));
        r.S = arr("##S"); r.C = arr("##C"); r.B = arr("##B"); r.K = Number(lines.find((l) => l.startsWith("##K")).slice(3));
        if (outLines.at(-1) === "") outLines = outLines.slice(0, -1);
      } else if (outLines.at(-1) === "") outLines = outLines.slice(0, -1);
      r.stdoutLines = outLines;
      results[idx] = r;
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return results;
}
