/* Development-time JVM oracle. NOT used by the browser.
 * Programs are emitted as complete Main.java files, each in its own package, compiled in ONE javac
 * call and executed in ONE JVM (a generated Runner calls each pN.Main.main inside try/catch).
 * Requires a JDK on PATH (javac/java). Compiled with --release 17. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitHarness } from "../compose/emit.js";

export function jdkInfo() {
  try {
    const v = execFileSync("javac", ["-version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const r = execFileSync("java", ["-version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, javac: v, java: (r || "").split("\n")[0] };
  } catch (e) {
    const err = String(e.stderr || e.message);
    // java -version prints to stderr
    try { const r2 = execFileSync("sh", ["-c", "java -version 2>&1"], { encoding: "utf8" }).split("\n")[0]; const v2 = execFileSync("sh", ["-c", "javac -version 2>&1"], { encoding: "utf8" }).trim(); if (/javac/.test(v2)) return { ok: true, javac: v2, java: r2 }; } catch {}
    return { ok: false, error: err };
  }
}

/* Run programs that are expected to compile. Returns [{stdout:[...], dump:[...], exc}] in order. */
export function runPrograms(programs, { observe = true, countAllocs = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "colab-jvm-"));
  try {
    const files = [];
    programs.forEach((p, i) => {
      const pkg = "p" + i;
      mkdirSync(join(dir, pkg));
      const f = join(dir, pkg, "Main.java");
      writeFileSync(f, emitHarness(p.program || p, { pkg, observe, countAllocs: p.countAllocs ?? countAllocs }));
      files.push(f);
    });
    const runner = ["public class Runner {", "  public static void main(String[] a) throws Exception {"];
    programs.forEach((_, i) => runner.push(`    System.out.println("##BEGIN ${i}"); System.out.flush(); try { p${i}.Main.main(new String[0]); } catch (Throwable t) { System.out.println("##EXC " + t.getClass().getSimpleName()); }`));
    runner.push(`    System.out.println("##BEGIN ${programs.length}");`, "  }", "}");
    writeFileSync(join(dir, "Runner.java"), runner.join("\n"));
    writeFileSync(join(dir, "files.txt"), [...files, join(dir, "Runner.java")].join("\n"));
    try {
      execFileSync("javac", ["--release", "17", "-nowarn", "-encoding", "UTF-8", "-d", join(dir, "out"), "@" + join(dir, "files.txt")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
    } catch (e) {
      const err = String(e.stdout || "") + String(e.stderr || "");
      throw Object.assign(new Error("javac failed for a batch that should compile:\n" + err.slice(0, 4000)), { javacOutput: err, dir });
    }
    const stdout = execFileSync("java", ["-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Xss8m", "-cp", join(dir, "out"), "Runner"], { encoding: "utf8", maxBuffer: 1 << 28 });
    const chunks = stdout.split(/^##BEGIN \d+\n/m).slice(1);
    return programs.map((_, i) => {
      const lines = (chunks[i] || "").split("\n").filter((x) => x.length || false);
      const excLine = lines.find((l) => l.startsWith("##EXC "));
      return {
        stdout: lines.filter((l) => !l.startsWith("##")),
        dump: lines.filter((l) => /^##[LOS] /.test(l)),
        allocs: (() => { const a = lines.find((l) => l.startsWith("##A ")); return a ? +a.slice(4) : null; })(),
        exc: excLine ? excLine.slice(6) : null,
      };
    });
  } finally {
    if (!process.env.KEEP_JVM_DIR) rmSync(dir, { recursive: true, force: true });
  }
}

/* Compile programs individually-isolated in one javac call and return the diagnostics per program.
 * Result: [{ok:boolean, errors:[{line, key, text}]}]. Lines refer to the harness file (observe=false). */
export function compileDiagnostics(programs) {
  const dir = mkdtempSync(join(tmpdir(), "colab-javac-"));
  try {
    const files = programs.map((p, i) => {
      const pkg = "q" + i; mkdirSync(join(dir, pkg));
      // raw diagnostics print only the file name, so give every file a unique name (Main is then non-public)
      const f = join(dir, pkg, `Prog${i}.java`); writeFileSync(f, emitHarness(p.program || p, { pkg, observe: false }).replace("public class Main {", "class Main {")); return f;
    });
    writeFileSync(join(dir, "files.txt"), files.join("\n"));
    let out = "";
    try {
      execFileSync("javac", ["--release", "17", "-nowarn", "-XDrawDiagnostics", "-XDshould-stop.ifError=FLOW", "-Xmaxerrs", "100000", "-encoding", "UTF-8", "-d", join(dir, "out"), "@" + join(dir, "files.txt")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
    } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
    const res = programs.map(() => ({ ok: true, errors: [] }));
    for (const line of out.split("\n")) {
      const m = line.match(/Prog(\d+)\.java:(\d+):(\d+): compiler\.err\.([\w.-]+)(.*)$/);
      if (m) { const r = res[+m[1]]; r.ok = false; r.errors.push({ line: +m[2], key: m[4], text: m[5] }); }
    }
    return res;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/* Harness line number of main statement i (for matching compile errors to displayed statements). */
export function harnessMainLine(p, i) {
  const text = emitHarness(p, { pkg: "q0", observe: false }).split("\n");
  const start = text.findIndex((l) => l.includes("public static void run()"));
  // count emitted lines per main statement
  let line = start + 2; // 1-based line after the run() header
  for (let k = 0; k < i; k++) line += stmtLineCount(p.main[k]);
  return line;
}
function stmtLineCount(s) {
  if (s.k !== "if") return 1;
  let n = 2 + s.th.reduce((a, x) => a + stmtLineCount(x), 0);
  if (s.el && s.el.length) n += 1 + s.el.reduce((a, x) => a + stmtLineCount(x), 0);
  return n;
}
export const hasJdk = () => { try { execFileSync("sh", ["-c", "command -v javac && command -v java"], { stdio: "ignore" }); return true; } catch { return false; } };
export { existsSync };
