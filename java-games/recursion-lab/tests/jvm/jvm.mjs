// Node wrapper: runJava([{name, source}]) -> Map(name -> {status, stdout, exception, error})
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)), build = join(tmpdir(), "jvmbatch-build");
function ensure(){ if(existsSync(join(build,"JvmBatch.class"))) return; mkdirSync(build,{recursive:true});
  // compile JvmBatch itself using the source launcher's compiler via a tiny bootstrap
  writeFileSync(join(build,"Boot.java"),`import javax.tools.*;public class Boot{public static void main(String[] a){System.exit(ToolProvider.getSystemJavaCompiler().run(null,null,null,"-d","${build}","${join(here,"JvmBatch.java")}"));}}`);
  const b=spawnSync("java",[join(build,"Boot.java")],{encoding:"utf8",timeout:120000}); if(b.status!==0) throw Error("bootstrap failed "+b.stderr);
}
export function runJava(programs, { timeoutMs = 3000, batch = 400 } = {}) {
  ensure(); const results = new Map();
  for (let s = 0; s < programs.length; s += batch) {
    const dir = mkdtempSync(join(tmpdir(), "jb-"));
    for (const p of programs.slice(s, s + batch)) writeFileSync(join(dir, p.name + ".java"), p.source);
    const r = spawnSync("java", ["-Xss4m", "-cp", build, "JvmBatch", dir, String(timeoutMs)], { encoding: "utf8", maxBuffer: 1 << 28, timeout: 600000 });
    if (r.status !== 0 && !r.stdout) throw Error("JvmBatch failed: " + r.stderr.slice(0, 2000));
    for (const line of r.stdout.split("\n")) { if (!line) continue; const [name, status, payload] = line.split("\t"); const text = JSON.parse(payload);
      const [stdout, exception = null] = status === "COMPILE" ? ["", null] : text.split("\u0000");
      results.set(name, { status, stdout, exception, error: status === "COMPILE" ? text : null }); }
    if (process.env.JVM_KEEP) console.error("kept " + dir); else rmSync(dir, { recursive: true, force: true });
  }
  return results;
}
