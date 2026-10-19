import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { generateTrace, TRACE_FAMILIES } from "./trace-engine.js";

const levels = ["beginner", "intermediate", "advanced"];
const distributions = { difficulty: {}, family: {}, type: {}, format: {} };

for (let i = 0; i < 10000; i++) {
  const difficulty = levels[i % levels.length];
  const q = generateTrace({ difficulty, seed: i + 1 });
  distributions.difficulty[difficulty] = (distributions.difficulty[difficulty] || 0) + 1;
  distributions.family[q.traceFamily] = (distributions.family[q.traceFamily] || 0) + 1;
  distributions.format[q.format] = (distributions.format[q.format] || 0) + 1;
  for (const type of new Set(Object.values(q.types)))
    distributions.type[type] = (distributions.type[type] || 0) + 1;

  assert.ok(q.prompt && q.code && q.compilerSource && q.explanation);
  assert.ok(q.traceRows.length >= 2 && q.traceRows.length <= 7);
  assert.equal(new Set(q.choices).size, q.choices.length);
  assert.equal(q.choices.filter((x) => x === q.answer).length, 1);
  assert.equal(q.resultType === "boolean" ? 2 : 4, q.choices.length);
  assert.ok(!/\/ 0|% 0/.test(q.rawCode));
  assert.ok(q.traceRows.every((step) => step.statement && step.explanation));
  if (q.format === "checkpoint") {
    assert.match(q.prompt, /immediately after line \d+/);
    assert.ok(q.checkpointLine >= 2 && q.checkpointLine <= q.traceRows.length - 1);
  }

  const replay = generateTrace({ difficulty, seed: q.seed });
  assert.equal(replay.rawCode, q.rawCode);
  assert.equal(replay.answer, q.answer);
}

for (const family of Object.keys(TRACE_FAMILIES))
  for (const difficulty of levels) {
    const q = generateTrace({ difficulty, seed: 0xc0ffee, family });
    assert.equal(q.traceFamily, family);
    assert.equal(q.choices.filter((x) => x === q.answer).length, 1);
    for (const wrong of q.choices.filter((x) => x !== q.answer))
      assert.notEqual(wrong, q.answer);
  }

// Independently verify 1,000 generated answers with javac/java rather than
// trusting the JavaScript execution model alone.
const samples = [];
for (let i = 0; i < 1000; i++)
  samples.push(generateTrace({ difficulty: levels[i % levels.length], seed: 50000 + i }));

const methods = samples.map((q, i) => {
  const lines = q.rawCode.split("\n");
  if (q.format === "print")
    return `static String q${i}() throws Exception {
      java.io.ByteArrayOutputStream __buf = new java.io.ByteArrayOutputStream();
      java.io.PrintStream __old = System.out;
      System.setOut(new java.io.PrintStream(__buf));
      try { ${lines.join(" ")} } finally { System.setOut(__old); }
      String s = __buf.toString().replace("\\r\\n", "\\n");
      if (s.endsWith("\\n")) s = s.substring(0, s.length() - 1);
      return s;
    }`;
  const prefix = lines
    .slice(0, q.checkpointLine)
    .filter((line) => !line.startsWith("System.out.println("));
  return `static String q${i}() { ${prefix.join(" ")} return String.valueOf(${q.resultVariable}); }`;
}).join("\n");

const main = samples
  .map((q, i) => `System.out.println("${i}\\t" + q${i}());`)
  .join("\n");
const javaSource = `public class TraceVerify {
${methods}
public static void main(String[] args) throws Exception {
${main}
}
}`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trace-variable-verify-"));
const src = path.join(dir, "TraceVerify.java");
fs.writeFileSync(src, javaSource);
execFileSync("javac", [src], { timeout: 120000, stdio: "pipe" });
const output = execFileSync("java", ["-cp", dir, "TraceVerify"], {
  encoding: "utf8",
  timeout: 120000,
  maxBuffer: 2_000_000,
});
const actual = new Map(output.trimEnd().split("\n").map((line) => {
  const split = line.indexOf("\t");
  return [Number(line.slice(0, split)), line.slice(split + 1)];
}));
for (let i = 0; i < samples.length; i++)
  assert.equal(actual.get(i), samples[i].answer, `JVM mismatch for sample ${i}`);

console.log(JSON.stringify({ generated: 10000, jvmVerified: 1000, distributions }, null, 2));
console.log("Trace the Variable generator and JVM verification passed.");
