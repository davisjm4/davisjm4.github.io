/* Loop Lab — JVM verification. Compiles and runs generated programs on a real JVM and
 * compares output plus every statement / condition / body / comparison count with the model.
 * Usage: node tests/jvm.test.mjs [perCell=40] [focusedPerFamily=60]
 * Requires a JDK with the jdk.compiler module (java Source.java launcher); JDK 17+.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import * as E from "../loop-engine.js";
import { run } from "../engine/java-model.js";
import { findJava, javaVersion, runBatch } from "./jvm-harness.mjs";

const PER = Number(process.argv[2] || 40), FOCUS = Number(process.argv[3] || 60);
const java = findJava();
if (!java) { console.log("SKIPPED: no Java runtime found (set JAVA_HOME). JVM verification did not run."); process.exit(0); }
const t0 = Date.now();
let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; };

const qs = [];
for (const mode of E.MODES) for (const d of E.DIFFICULTIES) for (let s = 1; s <= PER; s++) qs.push(E.generateChallenge({ mode, difficulty: d, seed: (s * 97 + 13) >>> 0 }));
// focused sets requested by the brief: nested loops, dependent bounds, digit extraction, GCD, sentinels, execution counts
const focus = [["executions", "nested-independent"], ["executions", "nested-dependent"], ["executions", "simple-counts"], ["executions", "non-unit-updates"], ["executions", "early-termination"], ["executions", "conditional-execution"], ["executions", "operation-types"], ["algorithms", "digit-extraction"], ["algorithms", "gcd"], ["algorithms", "sentinel"], ["algorithms", "nested-algorithms"]];
for (const [mode, family] of focus) for (const d of E.DIFFICULTIES) for (let s = 1; s <= FOCUS / 3; s++) qs.push(E.generateChallenge({ mode, difficulty: d, seed: (s * 7331 + 5) >>> 0, family }));

const jobs = [];
for (const q of qs) { jobs.push({ q, program: q.javaProgram, kind: "instrumented" }); jobs.push({ q, program: q.javaProgram, kind: "plain" }); }
// buggy debug programs that terminate: must compile and misbehave exactly as modeled
const buggy = [];
for (let s = 1; buggy.length < 120 && s < 2000; s++) {
  const q = E.generateChallenge({ mode: "debug", difficulty: E.DIFFICULTIES[s % 3], seed: s * 31 });
  const shown = q.buggyProgram;
  if (!shown) continue;
  const r = run(shown, { stepLimit: 5000 });
  if (r.error === "StepLimit") continue; // intentionally nonterminating: validated by the model's step limit only
  buggy.push({ q, r }); jobs.push({ q, program: shown, kind: "plain", buggy: true, model: r });
}
const results = runBatch(java, jobs.map((j) => ({ program: j.program, kind: j.kind })));
let countMatches = 0, outputMatches = 0, buggyMatches = 0;
const arr = (o, n) => Array.from({ length: n }, (_, k) => o[k] || 0);
jobs.forEach((j, i) => {
  const r = results[i]; ok(r, `JVM produced a result for ${j.q.id}`);
  if (j.buggy) {
    const m = j.model;
    if (!m.ok) ok(r.exception === m.error, `buggy ${j.q.id}: JVM throws ${m.error} (got ${r.exception})`);
    else { ok(!r.exception, `buggy ${j.q.id} runs`); assert.deepEqual(r.stdoutLines, m.output, `buggy ${j.q.id} output`); checks++; }
    buggyMatches++; return;
  }
  const m = run(j.program);
  ok(!r.exception, `${j.q.id} ${j.kind}: no exception (${r.exception})`);
  assert.deepEqual(r.stdoutLines, m.output, `${j.q.id} ${j.kind}: output matches model`); checks++; outputMatches++;
  if (j.kind === "instrumented") {
    const n = r.S.length;
    assert.deepEqual(r.S, arr(m.S, n), `${j.q.id}: statement counts`); assert.deepEqual(r.C, arr(m.C, n), `${j.q.id}: condition counts`);
    assert.deepEqual(r.B, arr(m.B, n), `${j.q.id}: body counts`); assert.equal(r.K, m.K, `${j.q.id}: comparison count`); checks += 4; countMatches++;
  }
});
const summary = { java, version: javaVersion(java).split("\n")[0], challenges: qs.length, instrumentedRuns: countMatches, plainRuns: outputMatches - countMatches, buggyDebugRuns: buggyMatches, checks, seconds: (Date.now() - t0) / 1000 };
fs.mkdirSync(new URL("../reports/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../reports/jvm-results.json", import.meta.url), JSON.stringify(summary, null, 1));
console.log(`Loop Lab JVM: ${checks.toLocaleString()} checks passed on ${summary.version}; ${qs.length} challenges → ${countMatches} instrumented runs (output + every statement/condition/body/comparison count) and ${outputMatches - countMatches} runs of the displayed code; ${buggyMatches} terminating buggy debug programs behave as modeled; ${summary.seconds}s.`);
