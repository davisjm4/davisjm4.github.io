import fs from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import * as J from "./engine.js";
const java = "/usr/lib/jvm/java-17-openjdk-amd64/bin/java",
  folder = "/tmp/java-games-verify";
fs.mkdirSync(folder, { recursive: true });
const manifest = [],
  questions = [];
for (const [variant, mode] of J.debugTemplates)
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9]) {
    const q = J.debugQuestion(mode, variant, n);
    questions.push(q);
    for (const [tag, code, ok] of [
      ["broken", q.brokenSource, !["syntax", "tricky"].includes(mode)],
      ["fixed", q.fixedSource, true],
    ]) {
      const path = `${folder}/${variant}-${n}-${tag}.java`;
      fs.writeFileSync(path, code);
      manifest.push(path + "\t" + ok);
    }
  }
let seed = 543;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
for (const game of ["variable-lab", "loop-lab", "array-lab"])
  for (let n = 0; n < 20; n++) {
    const q = J.generate(game);
    if (q.compilerSource) {
      const path = `${folder}/${game}-${n}.java`;
      fs.writeFileSync(path, q.compilerSource);
      manifest.push(path + "\ttrue");
    }
  }
fs.writeFileSync(folder + "/manifest.tsv", manifest.join("\n"));
console.log(
  execFileSync(
    java,
    [
      new URL("./compiler-harness.java", import.meta.url).pathname,
      folder + "/manifest.tsv",
    ],
    { encoding: "utf8", timeout: 120000, maxBuffer: 100000 },
  ),
);
const diagnostics = {};
for (const [variant, mode] of J.debugTemplates) {
  const raw = fs.readFileSync(
    `${folder}/${variant}-2-broken.java.diagnostic`,
    "utf8",
  );
  if (raw !== "OK") {
    const [line, ...message] = raw.split("\t");
    diagnostics[variant] = {
      line: Number(line),
      message: message.join("\t"),
      compiler: "javac 17.0.20",
      verifiedValues: [2, 3, 4, 5, 6, 7, 8, 9],
    };
  }
}
fs.writeFileSync(
  new URL("./diagnostics.js", import.meta.url),
  "// Generated from actual compiler checks, not invented diagnostics.\nexport const diagnostics = " +
    JSON.stringify(diagnostics, null, 2) +
    ";\n",
);
// Runtime exceptions and fixed variants are checked with the real JVM.
for (const [variant, mode] of J.debugTemplates)
  if (mode === "runtime") {
    const run = (tag) => {
      try {
        return {
          ok: true,
          output: execFileSync(
            java,
            ["-cp", `${folder}/${variant}-2-${tag}.java-classes`, "Practice"],
            {
              encoding: "utf8",
              timeout: 2000,
              stdio: ["ignore", "pipe", "pipe"],
            },
          ),
        };
      } catch (error) {
        return { ok: false, output: String(error.stderr || error.message) };
      }
    };
    const bad = run("broken"),
      good = run("fixed");
    assert.equal(bad.ok, false, variant);
    assert.equal(good.ok, true, variant);
    assert.ok(bad.output.includes("Exception"), variant);
  }
console.log(
  "All runtime-defect templates throw on the stated input; their verified repairs run without exceptions.",
);
// Independent JVM cross-check of generated loop output and collection final states.
const behavioral = [];
for (const game of ["loop-lab", "array-lab", "variable-lab"])
  for (let n = 0; n < 36; n++) {
    const q = J.generate(game);
    let source = q.compilerSource,
      expected,
      parse;
    if (game === "loop-lab") {
      expected = q.trace
        .filter((s) => s.output.startsWith("Print "))
        .map((s) => s.output.slice(6))
        .join("\n");
      parse = (out) => out.trim();
    } else if (game === "array-lab" && q.kind === "collection") {
      expected = q.answer;
      parse = (out) => {
        const raw = out.trim();
        if (q.answer.some((v) => typeof v === "string"))
          return raw.slice(1, -1).split(", ").filter(Boolean);
        return JSON.parse(raw).flat();
      };
    } else if (
      game === "array-lab" &&
      ["count", "sum", "search", "minimum", "maximum"].some((topic) =>
        q.topic.endsWith("-" + topic),
      )
    ) {
      source = `import java.util.*; public class Practice {public static void main(String[] args){${q.code}\nSystem.out.println(${q.topic.endsWith("-search") ? "found" : "result"});}}`;
      expected = String(q.answer);
      parse = (out) => out.trim();
    } else if (game === "variable-lab" && q.resultVariable) {
      source = `public class Practice {public static void main(String[] args){${q.code}\nSystem.out.println(${q.resultVariable});}}`;
      expected = String(q.answer);
      parse = (out) => out.trim();
    } else continue;
    const path = `${folder}/behavior-${behavioral.length}.java`;
    fs.writeFileSync(path, source);
    behavioral.push({ path, expected, parse });
  }
fs.writeFileSync(
  folder + "/behavior.tsv",
  behavioral.map((b) => b.path + "\ttrue").join("\n"),
);
console.log(
  execFileSync(
    java,
    [
      new URL("./compiler-harness.java", import.meta.url).pathname,
      folder + "/behavior.tsv",
    ],
    { encoding: "utf8", timeout: 120000, maxBuffer: 100000 },
  ),
);
for (const b of behavioral) {
  const output = execFileSync(java, ["-cp", b.path + "-classes", "Practice"], {
    encoding: "utf8",
    timeout: 2000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.deepEqual(b.parse(output), b.expected);
}
console.log(
  `Real JVM independently matched ${behavioral.length} generated loop, collection, accumulator, and conversion results.`,
);
