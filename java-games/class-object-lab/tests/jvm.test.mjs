/* Real-JVM verification of generated challenges (development only).
 *   node class-object-lab/tests/jvm.test.mjs [--per N] [--modes a,b] [--out file.json] [--seed S]
 * For every challenge, the displayed program is emitted as a complete Main.java (identical statement
 * text), compiled with javac --release 17 and run on the JVM. Checks:
 *   output   : stdout (and exception) equal the simulator; the keyed answer equals the JVM output;
 *              no distractor equals the JVM output; full heap/static state dump equals the simulator.
 *   count    : allocation count (harness-only instance initializer) and reference graph from the JVM
 *              re-derive the keyed number; no distractor equals it.
 *   value    : heap/reference dump equals the simulator (the answer is derived from that graph);
 *              default toString output matches ClassName@hex.
 *   compare  : every candidate comparison printed by the JVM; exactly one displayed choice has the
 *              wanted truth value and it is the keyed answer.
 *   select   : every candidate fragment is compiled; deliberate compile errors must fail with the
 *              expected javac diagnostic on that fragment; the rest run on the JVM; exactly one
 *              displayed fragment reaches the goal (or fails to compile, for "which fails") and it is the key.
 * Results are merged into a JSON summary so large runs can be split across invocations. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { generateChallenge, MODE_IDS, LEVELS, outputText } from "../compose/engine.js";
import { simulate } from "../compose/sim.js";
import { pr } from "../compose/ir.js";
import { expr } from "../compose/emit.js";
import { runPrograms, compileDiagnostics, jdkInfo } from "./jvm-oracle.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : null)).filter(Boolean));
const PER = +(args.per || 40);
const MODES = args.modes ? args.modes.split(",") : MODE_IDS;
const OUT = args.out || null;
const SEED0 = +(args.seed || 424242);
const EXPECT = {
  privateAccess: ["report.access"],
  staticContext: ["non-static.cant.be.ref"],
  missingParens: ["cant.resolve.location"],
  wrongCallForm: ["cant.resolve.location.args", "cant.apply.symbol"],
  undeclared: ["cant.resolve.location.args", "cant.resolve.location"],
  localDefaults: ["var.might.not.have.been.initialized"],
  argOrder: ["cant.apply.symbol"],
  wrongArity: ["cant.apply.symbol"],
};

const jdk = jdkInfo();
if (!jdk.ok) { console.log("SKIP: no JDK available (" + jdk.error + ")"); process.exit(0); }

const stats = { challenges: 0, programsCompiled: 0, programsExecuted: 0, compileErrorProgramsVerified: 0, selectAlternativesVerified: 0, answersRederived: 0, distractorsChecked: 0, stateDumpsCompared: 0, byKind: {}, byCell: {}, failures: [] };
const fail = (c, msg) => { stats.failures.push({ id: c.id, family: c.family, msg: msg.slice(0, 600) }); };

const runJobs = []; // {program, countAllocs, onResult}
const compileJobs = []; // {program, onResult}

for (const mode of MODES) for (const difficulty of LEVELS) {
  for (let i = 0; i < PER; i++) {
    const seed = SEED0 + i * 7919 + MODE_IDS.indexOf(mode) * 104729 + LEVELS.indexOf(difficulty) * 15485863;
    let c;
    try { c = generateChallenge({ mode, difficulty, seed }); } catch (e) { stats.failures.push({ id: `${mode}/${difficulty}/${seed}`, msg: "generation: " + e.message }); continue; }
    stats.challenges++;
    const cell = `${mode}/${difficulty}`; stats.byCell[cell] = (stats.byCell[cell] || 0) + 1;
    const kind = c.query.kind; stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;
    const program = c.program;
    const sim = simulate(program);
    const distractors = c.choices.filter((x) => x !== c.answer);
    if (kind === "output") {
      runJobs.push({ program, onResult(r) {
        const jvmText = r.exc ? (r.stdout.length ? `${r.stdout.join("\n")}\nthen a ${r.exc} is thrown` : `A ${r.exc} is thrown`) : r.stdout.join("\n");
        if (jvmText !== outputText(sim)) return fail(c, `stdout mismatch JVM=${JSON.stringify(jvmText)} SIM=${JSON.stringify(outputText(sim))}\n${c.code}`);
        if (c.answer !== jvmText) return fail(c, "key differs from JVM output");
        stats.answersRederived++;
        for (const d of distractors) { stats.distractorsChecked++; if (d === jvmText) return fail(c, "distractor equals JVM output"); }
        if (!r.exc) { stats.stateDumpsCompared++; if (JSON.stringify(r.dump) !== JSON.stringify(sim.dump)) return fail(c, `state dump mismatch\nJVM ${r.dump.join(" ; ")}\nSIM ${sim.dump.join(" ; ")}`); }
      } });
    } else if (kind === "count") {
      runJobs.push({ program, countAllocs: true, onResult(r) {
        if (r.exc) return fail(c, "unexpected exception " + r.exc);
        stats.stateDumpsCompared++;
        if (JSON.stringify(r.dump) !== JSON.stringify(sim.dump)) return fail(c, `state dump mismatch\nJVM ${r.dump.join(" ; ")}\nSIM ${sim.dump.join(" ; ")}`);
        const locals = Object.fromEntries(r.dump.filter((l) => l.startsWith("##L ")).map((l) => l.slice(4).split("=")));
        let v;
        const q = c.query;
        if (q.what === "created") v = r.allocs;
        else if (q.what === "reachable") v = new Set(Object.values(locals).filter((x) => x.startsWith("#"))).size;
        else if (q.what === "sameAs") v = Object.entries(locals).filter(([k, x]) => k !== q.v && x.startsWith("#") && x === locals[q.v]).length;
        else if (q.what === "nullVars") v = Object.values(locals).filter((x) => x === "null").length;
        if (String(v) !== c.answer) return fail(c, `JVM count ${v} != key ${c.answer}\n${c.code}`);
        stats.answersRederived++;
        for (const d of distractors) { stats.distractorsChecked++; if (d === String(v)) return fail(c, "distractor equals JVM count"); }
      } });
    } else if (kind === "value") {
      runJobs.push({ program, onResult(r) {
        if (r.exc) return fail(c, "unexpected exception " + r.exc);
        if (c.query.what === "defaultToString") {
          const last = r.stdout[r.stdout.length - 1] || "";
          const cls = program.classes[0].n;
          if (!new RegExp(`${cls}@[0-9a-f]+$`).test(last)) return fail(c, "default toString pattern not observed: " + last);
          for (const d of distractors) { stats.distractorsChecked++; if (d === last) return fail(c, "distractor equals JVM text"); }
          stats.answersRederived++;
          return;
        }
        stats.stateDumpsCompared++;
        if (JSON.stringify(r.dump) !== JSON.stringify(sim.dump)) return fail(c, `state dump mismatch\nJVM ${r.dump.join(" ; ")}\nSIM ${sim.dump.join(" ; ")}`);
        stats.answersRederived++;
        stats.distractorsChecked += distractors.length;
      } });
    } else if (kind === "compare") {
      const cands = c.query.cands;
      const aug = { ...program, main: [...program.main, ...cands.map((x) => pr(x))] };
      runJobs.push({ program: aug, onResult(r) {
        if (r.exc) return fail(c, "unexpected exception " + r.exc);
        const vals = r.stdout.map((x) => x === "true");
        const byText = new Map(cands.map((x, i) => [expr(x), vals[i]]));
        const hits = c.choices.filter((t) => byText.get(t) === c.query.want);
        if (hits.length !== 1 || hits[0] !== c.answer) return fail(c, `compare: ${hits.length} choices have truth ${c.query.want}: ${JSON.stringify(hits)} key=${c.answer}`);
        stats.answersRederived++; stats.distractorsChecked += distractors.length;
      } });
    } else if (kind === "select") {
      const q = c.query;
      const results = new Array(q.cands.length);
      let pending = q.cands.length;
      const done = () => {
        if (--pending) return;
        const good = q.cands.map((cd, i) => (q.want === "fails" ? results[i].compileError : results[i].goal) ? cd.text : null).filter(Boolean);
        const shown = good.filter((t) => c.choices.includes(t));
        if (shown.length !== 1 || shown[0] !== c.answer) return fail(c, `select: ${shown.length} qualifying choices ${JSON.stringify(shown)} key=${c.answer}\n${c.code}`);
        stats.answersRederived++; stats.distractorsChecked += distractors.length;
      };
      q.cands.forEach((cd, i) => {
        const prog = { ...program, main: [...program.main, ...(q.pre || []), ...(cd.stmts || []), ...(q.check ? [pr(q.check)] : [])] };
        if (cd.invalid) {
          compileJobs.push({ program: prog, onResult(r) {
            stats.compileErrorProgramsVerified++; stats.selectAlternativesVerified++;
            const want = EXPECT[cd.invalid] || [];
            if (r.ok) { fail(c, `expected compile error (${cd.invalid}) but it compiled: ${cd.text}`); results[i] = { compileError: false }; return done(); }
            const keys = r.errors.map((e) => e.key);
            if (!keys.some((k) => want.some((w) => k.startsWith(w)))) fail(c, `wrong compile error for ${cd.text}: ${keys.join(",")} (expected ${want.join("|")})`);
            results[i] = { compileError: true }; done();
          } });
        } else {
          runJobs.push({ program: prog, onResult(r) {
            stats.selectAlternativesVerified++;
            const goal = !r.exc && (q.check ? r.stdout[r.stdout.length - 1] === "true" : true);
            results[i] = { goal, compileError: false }; done();
          } });
        }
      });
    }
  }
}

// ---- execute in batches
const BATCH = 300;
for (let i = 0; i < runJobs.length; i += BATCH) {
  const batch = runJobs.slice(i, i + BATCH);
  let res;
  try { res = runPrograms(batch.map((j) => ({ program: j.program, countAllocs: !!j.countAllocs }))); }
  catch (e) {
    // locate programs that do not compile
    const diag = compileDiagnostics(batch.map((j) => j.program));
    diag.forEach((d, k) => { if (!d.ok) stats.failures.push({ id: "batch", msg: "unexpected compile error: " + d.errors.map((x) => x.key + x.text).join("; ") }); });
    const okJobs = batch.filter((_, k) => diag[k].ok);
    res = null;
    if (okJobs.length) { const r2 = runPrograms(okJobs.map((j) => ({ program: j.program, countAllocs: !!j.countAllocs }))); okJobs.forEach((j, k) => { stats.programsCompiled++; stats.programsExecuted++; j.onResult(r2[k]); }); }
    continue;
  }
  batch.forEach((j, k) => { stats.programsCompiled++; stats.programsExecuted++; j.onResult(res[k]); });
}
for (let i = 0; i < compileJobs.length; i += BATCH) {
  const batch = compileJobs.slice(i, i + BATCH);
  const diag = compileDiagnostics(batch.map((j) => j.program));
  batch.forEach((j, k) => j.onResult(diag[k]));
}

// ---- merge & report
let merged = stats;
if (OUT) {
  if (existsSync(OUT) && !args.fresh) {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    merged = { ...prev };
    for (const k of ["challenges", "programsCompiled", "programsExecuted", "compileErrorProgramsVerified", "selectAlternativesVerified", "answersRederived", "distractorsChecked", "stateDumpsCompared"]) merged[k] = (prev[k] || 0) + stats[k];
    for (const k of ["byKind", "byCell"]) { merged[k] = { ...prev[k] }; for (const [a, b] of Object.entries(stats[k])) merged[k][a] = (merged[k][a] || 0) + b; }
    merged.failures = [...(prev.failures || []), ...stats.failures];
  }
  merged.jdk = jdk; merged.release = "17";
  writeFileSync(OUT, JSON.stringify(merged, null, 1));
}
console.log(`JVM verification (${jdk.javac}; --release 17): ${stats.challenges} challenges, ${stats.programsCompiled} programs compiled+executed, ${stats.compileErrorProgramsVerified} compile-error alternatives confirmed, ${stats.selectAlternativesVerified} selection alternatives checked, ${stats.answersRederived} keys re-derived from the JVM, ${stats.distractorsChecked} distractors checked, ${stats.stateDumpsCompared} heap dumps compared. Failures: ${stats.failures.length}.`);
for (const f of stats.failures.slice(0, 12)) console.log("FAIL", f.id, f.family || "", "\n  " + f.msg.replace(/\n/g, "\n  "));
if (stats.failures.length) process.exitCode = 1;
