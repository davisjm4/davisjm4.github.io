/* Optional JVM differential test for Robot Algorithms (needs a JDK on PATH).
   Run from the repository root:  node tests/robot-algorithms-jvm.test.js
   Every generated program (prediction code, all four debug versions, and
   build reference solutions) is wrapped in a real Java class with a Robot
   stub, compiled with javac, executed on the JVM, and compared with the
   game's interpreter. This proves the displayed code is legal Java and that
   the interpreter's answers match real Java semantics. Not used by students. */
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "..");
const PER_MODE = Number(process.env.ROBOT_JVM_PER_MODE || 60);

(async () => {
  try {
    execFileSync("javac", ["-version"], { stdio: "ignore" });
  } catch {
    console.log("SKIPPED: javac not found on PATH (this optional test needs a JDK).");
    return;
  }
  const E = await import(pathToFileURL(path.join(ROOT, "java-games", "robot-algorithms", "engine.js")).href);
  const programs = [];
  for (const mode of Object.keys(E.MODES)) {
    const rng = E.makeRng(4242 + mode.length);
    for (let i = 0; i < PER_MODE; i++) {
      const ch = E.generate(mode, rng);
      if (ch.kind === "build") for (const w of ch.worlds) programs.push({ mode, src: ch.reference, world: w });
      else if (ch.kind === "debug") {
        programs.push({ mode, src: ch.code, world: ch.world });
        for (const c of ch.choices) programs.push({ mode, src: c.lines.join("\n"), world: ch.world });
      } else programs.push({ mode, src: ch.code, world: ch.world });
    }
  }
  const classes = [];
  const runs = [];
  programs.forEach((p, i) => {
    const prog = E.parse(p.src);
    const res = E.run(prog, p.world);
    if (res.error && res.error.kind !== "crash") return; // interpreter step-limit cases are not compared
    const methods = Object.values(prog.methods).map((m) => m.name);
    const lines = p.src.split("\n");
    // Separate method declarations from top-level statements.
    const declLines = new Set();
    for (const m of Object.values(prog.methods)) for (let l = m.line; l <= m.endLine; l++) declLines.add(l);
    const decls = lines.filter((_, k) => declLines.has(k + 1)).join("\n");
    const body = lines.filter((_, k) => !declLines.has(k + 1)).join("\n");
    const entry = body.trim() ? body : methods.includes("run") ? "run();" : "";
    classes.push(`  static class P${i} extends P {\n${decls}\n    void go() {\n${entry}\n    }\n  }`);
    const w = p.world;
    const walls = w.walls.map((k) => `{${k}}`).join(",");
    runs.push(`    check(${i}, new P${i}(), ${w.rows}, ${w.cols}, new int[][]{${walls}}, ${w.start.r}, ${w.start.c}, ${w.start.d}, ${w.goal ? w.goal.r : -1}, ${w.goal ? w.goal.c : -1});`);
    p.expected = res.error ? `crash ${res.final.r} ${res.final.c} ${res.final.d}` : `ok ${res.final.r} ${res.final.c} ${res.final.d}`;
    p.index = i;
  });
  const chunks = [];
  for (let k = 0; k < runs.length; k += 150) chunks.push(runs.slice(k, k + 150));
  const java = `import java.util.*;
public class RobotCheck {
  static final int[] DR = {-1, 0, 1, 0}, DC = {0, 1, 0, -1};
  static class Crash extends RuntimeException { Crash() { super(null, null, false, false); } }
  static class Robot {
    int rows, cols, r, c, d, gr, gc; boolean[][] wall;
    boolean blocked() { int nr = r + DR[d], nc = c + DC[d]; return nr < 0 || nc < 0 || nr >= rows || nc >= cols || wall[nr][nc]; }
    void move() { if (blocked()) throw new Crash(); r += DR[d]; c += DC[d]; }
    void turnLeft() { d = (d + 3) % 4; }
    void turnRight() { d = (d + 1) % 4; }
    boolean canMove() { return !blocked(); }
    boolean atGoal() { return r == gr && c == gc; }
  }
  static abstract class P { Robot robot = new Robot(); abstract void go(); }
${classes.join("\n")}
  static void check(int id, P p, int rows, int cols, int[][] walls, int r, int c, int d, int gr, int gc) {
    Robot b = p.robot; b.rows = rows; b.cols = cols; b.r = r; b.c = c; b.d = d; b.gr = gr; b.gc = gc;
    b.wall = new boolean[rows][cols]; for (int[] w : walls) b.wall[w[0]][w[1]] = true;
    String out;
    try { p.go(); out = "ok"; } catch (Crash e) { out = "crash"; }
    System.out.println(id + " " + out + " " + b.r + " " + b.c + " " + b.d);
  }
${chunks.map((c, k) => `  static void part${k}() {\n${c.join("\n")}\n  }`).join("\n")}
  public static void main(String[] args) {
${chunks.map((_, k) => `    part${k}();`).join("\n")}
  }
}
`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "robot-jvm-"));
  fs.writeFileSync(path.join(dir, "RobotCheck.java"), java);
  execFileSync("javac", ["-Xlint:none", "RobotCheck.java"], { cwd: dir, stdio: "inherit" });
  const out = execFileSync("java", ["-cp", dir, "RobotCheck"], { encoding: "utf8", maxBuffer: 1 << 26 });
  const got = new Map(out.trim().split("\n").map((l) => { const [id, ...rest] = l.split(" "); return [Number(id), rest.join(" ")]; }));
  let compared = 0;
  const byMode = {};
  for (const p of programs) {
    if (p.index === undefined) continue;
    assert.equal(got.get(p.index), p.expected, `program ${p.index} (${p.mode}) differs:\n${p.src}`);
    compared++;
    byMode[p.mode] = (byMode[p.mode] || 0) + 1;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`Robot Algorithms JVM: ${compared} generated programs compiled with javac and matched the interpreter on the JVM. By mode: ${JSON.stringify(byMode)}`);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
