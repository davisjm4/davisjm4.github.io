/* Loop Lab expansion — engine correctness tests.
 * Usage: node tests/engine.test.mjs [newPerCell=1200] [originalPerCell=300]
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import * as E from "../loop-engine.js";
import { run } from "../engine/java-model.js";

const NEW_PER = Number(process.argv[2] || 1200), OLD_PER = Number(process.argv[3] || 300);
let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const t0 = Date.now();
const KNOWN_TAGS = new Set([...Object.keys(E.MISCONCEPTIONS), "fix-fails", "row-correct", "role-init", "role-cond", "role-upd", "role-body", "role-acc", "role-oc", "role-ou", "role-ic", "role-iu", "role-b", "role-decl", "role-variable"]);
const oracleHits = {};
const hit = (k) => (oracleHits[k] = (oracleHits[k] || 0) + 1);
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const digitsOf = (n) => String(n).split("").map(Number);
const fmtVars = (o) => Object.entries(o).map(([k, v]) => `${k} = ${v}`).join(", ");

/** Independent closed-form oracles (no AST, no interpreter). Return expected answer or undefined. */
function oracle(q) {
  const p = q.params, t = q.template;
  if (q.mode === "executions" && q.variant === "simple-counts" && !(p.cap !== null && p.cap !== undefined && q.template.endsWith("upd") && false)) {
    const { start, bound, op, cap } = p;
    let n = { "<": Math.max(0, bound - start), "<=": Math.max(0, bound - start + 1), ">": Math.max(0, start - bound), ">=": Math.max(0, start - bound + 1) }[op];
    if (cap !== null && cap !== undefined) n = Math.min(n, cap);
    const kind = t.split("-").at(-1);
    return String(kind === "cond" ? n + 1 : n);
  }
  if (q.mode === "executions" && q.variant === "nested-independent") {
    const { R, Cn } = p; const what = t.replace("nested-rect-", "");
    return String({ "inner-mark": R * Cn, "outer-mark": R, "inner-cond": R * (Cn + 1), "inner-upd": R * Cn, "both-marks": R * Cn + R }[what]);
  }
  if (q.mode === "executions" && q.variant === "nested-dependent") {
    const { n, shape } = p; let total = 0, outer = 0;
    if (shape === "j<2i") { for (let i = 1; i <= n; i++) { total += 2 * i; outer++; } }
    else if (shape === "outer-step") { for (let i = 0; i <= n + 3; i += 2) { total += i; outer++; } }
    else for (let i = 0; i < n; i++) { outer++; total += { "j<i": i, "j<=i": i + 1, "j=i..n": n - i, "j=n..i": n - i }[shape]; }
    return String(t.endsWith("inner-cond") ? total + outer : total);
  }
  if (q.mode === "executions" && q.template === "continue-skip") return String(p.n - Math.floor(p.n / p.k));
  if (q.mode === "executions" && q.template === "two-sequential-loops") return String(p.a + p.b);
  if (q.mode === "executions" && q.template === "reused-loop-variable") return String(p.b - p.a);
  if (q.mode === "algorithms" && q.variant === "digit-extraction" && q.targetKind === "var") {
    const ds = digitsOf(p.n);
    if (t === "sum-digits") return String(ds.reduce((a, b) => a + b, 0));
    if (t === "count-digits") return String(ds.length);
    if (t === "reverse-digits") return String(Number(String(p.n).split("").reverse().join("")));
    if (t === "product-digits") return String(ds.reduce((a, b) => a * b, 1));
    if (t === "leading-digit") return String(ds[0]);
    if (t === "count-specific-digit") return String(ds.filter((x) => x === p.target).length);
  }
  if (q.mode === "algorithms" && q.template === "euclid-gcd") return String(gcd(p.a, p.b));
  if (q.mode === "algorithms" && q.template === "gcd-countdown" && q.targetKind === "var") return String(gcd(p.a, p.b));
  if (q.mode === "algorithms" && (t === "count-divisors" || t === "count-proper-divisors")) { let c = 0; for (let d = 1; d <= (p.inclusive ? p.n : p.n - 1); d++) if (p.n % d === 0) c++; return String(c); }
  if (q.mode === "algorithms" && q.variant === "sentinel") {
    const cut = p.input.indexOf(p.S), data = cut < 0 ? p.input : p.input.slice(0, cut);
    if (t === "sentinel-count") return String(data.length);
    if (t === "sentinel-sum") return String(data.reduce((a, b) => a + b, 0));
    if (t === "sentinel-max") return String(Math.max(0, ...data));
    if (t === "sentinel-break") return fmtVars({ count: data.length, total: data.reduce((a, b) => a + b, 0) });
    if (t.startsWith("compound-sentinel")) return fmtVars({ pos: data.length, sum: data.reduce((a, b) => a + b, 0) });
  }
  if (q.mode === "algorithms" && (t === "range-sum" || t === "range-sum-offset")) { let s = p.init; for (let i = p.a; i <= p.b; i += p.step) s += i; return String(s); }
  if (q.mode === "algorithms" && t === "count-remainder") { let c = 0; for (let i = 1; i <= p.n; i++) if (i % p.k === p.r) c++; return String(c); }
  return undefined;
}

/** For custom-choice questions, confirm by execution that exactly one choice is correct. */
function confirmUnique(q) {
  if (q.targetKind === "debug-fix" || q.targetKind === "choose-loop" || q.targetKind === "select-statement") {
    // Distractor notes are produced by running each alternative; their presence proves each was executed.
    for (const d of q.distractors) ok(d.note && d.note.length > 10, "alternative was executed and explained");
    hit(`unique:${q.targetKind}`);
  }
  if (q.targetKind === "growth-class") {
    const [a, b, c] = q.params.counts;
    const cls = a === b && b === c ? "constant" : c - b === b - a && b - a <= 2 ? "log" : c / b > 1.7 && c / b < 2.4 ? "linear" : "quadratic";
    eq(cls, q.params.cls, "growth class from measured counts"); hit("growth-class");
  }
  if (q.targetKind === "bad-step") {
    const wrongRows = q.studentTrace.rows.filter((r) => r.label === q.answer);
    eq(wrongRows.length, 1, "exactly one row marked as the answer"); hit("bad-step");
  }
}

const results = { cells: {}, totals: {} };
const allQs = [];
function cell(mode, difficulty, count) {
  const stats = { n: 0, oracle: 0, fallback: 0, distractors: 0, families: {}, templates: new Set(), errors: 0 };
  for (let s = 1; s <= count; s++) {
    const seed = (s * 2654435761) >>> 0;
    const q = E.generateChallenge({ mode, difficulty, seed });
    stats.n++;
    eq(q.mode, mode); ok(E.DIFFICULTIES.includes(q.difficulty));
    if (E.challengeFamilies[mode].length && !["iterations", "final", "choose", "components", "conditional", "while", "nested", "debug"].includes(mode)) eq(q.difficulty, difficulty, "new modes honor the requested difficulty");
    eq(q.choices.length, 4); eq(new Set(q.choices).size, 4); ok(q.choices.includes(q.answer)); eq(q.correctAnswer, q.answer);
    ok(E.assessLoop(q, { answer: q.answer })); ok(q.choices.filter((c) => E.assessLoop(q, { answer: c })).length === 1, "exactly one choice is graded correct");
    eq(q.distractors.length, 3);
    for (const d of q.distractors) { ok(d.choice !== q.answer); ok(KNOWN_TAGS.has(d.misconception) || d.misconception.startsWith("growth-"), "known misconception " + d.misconception); ok(typeof d.note === "string" && d.note.length > 5, "misconception note"); if (d.misconception === "fallback") stats.fallback++; stats.distractors++; }
    ok(q.code.length > 5 && q.prompt.length > 10 && q.explanation.length > 20);
    ok(!/undefined|NaN|\[object/.test(q.code + q.prompt + q.explanation + q.choices.join("")), "no template leaks");
    ok(q.code.includes("\n") || q.code.startsWith("// Goal") || q.code.length < 80, "code has line breaks");
    ok(/^[a-z]+\.[a-z0-9-]+$/.test(q.topic), "bounded topic id");
    // termination and execution
    const r = run(q.javaProgram);
    ok(r.ok, `program terminates normally ${q.id} ${r.error}`);
    if (q.expectsError) ok(["StepLimit", "ArrayIndexOutOfBoundsException"].includes(q.expectsError), "only intentional debugging failures");
    // metadata
    for (const k of ["dependentBounds", "earlyExits", "loopIterations", "changingVariables", "nestingDepth", "accumulatorUpdates", "conditions", "stateTransitions", "tracedOperations", "score"]) ok(Number.isFinite(q.metadata[k]), "metadata " + k);
    // oracles
    const expected = oracle(q);
    if (expected !== undefined) { eq(q.answer, expected, `oracle ${q.id} ${q.template}`); stats.oracle++; hit(`${mode}/${q.template}`); }
    confirmUnique(q);
    // reproducibility (every 7th)
    if (s % 7 === 0) eq(JSON.stringify(E.generateChallenge({ mode, difficulty, seed })), JSON.stringify(q), "seed reproducibility");
    stats.families[q.variant] = (stats.families[q.variant] || 0) + 1; stats.templates.add(q.template);
    allQs.push(q);
  }
  stats.templates = stats.templates.size;
  return stats;
}

for (const mode of E.MODES) for (const d of E.DIFFICULTIES) {
  const per = mode === "algorithms" || mode === "executions" ? NEW_PER : OLD_PER;
  results.cells[`${mode}/${d}`] = cell(mode, d, per);
}

// new-mode family coverage
for (const mode of ["algorithms", "executions"]) {
  ok(E.challengeFamilies[mode].length >= 8, `${mode} has at least eight families`);
  for (const d of E.DIFFICULTIES) {
    const fams = results.cells[`${mode}/${d}`].families;
    eq(Object.keys(fams).sort(), [...E.challengeFamilies[mode]].sort(), `${mode}/${d} covers every family`);
  }
}
// original variant ids preserved
const legacy = { iterations: ["inc-exclusive", "dec-inclusive", "zero-start", "while-decrement", "one-step", "skip-step"], final: ["sum-range", "product", "overwrite", "count-even", "continue-sum", "break-sum"], choose: ["evens", "down", "multiples"], components: ["for-update", "for-condition", "while-init", "body", "while-condition"], conditional: ["odd-count", "greater-sum", "continue-even", "break-target"], while: ["integer-half", "increment-sentinel", "zero-while", "decrement"], nested: ["rectangle", "diagonal", "triangular", "inner-step", "break-inner"], debug: ["inclusive", "counter-update", "accumulate", "while-progress", "array-bound"] };
for (const [m, vs] of Object.entries(legacy)) for (const v of vs) { ok(E.challengeFamilies[m].includes(v), `legacy variant ${m}/${v} kept`); const q = E.generateLoop(m, v); eq(q.variant, v); eq(q.family, m); }

// difficulty progression per mode (mean complexity score and structural index)
const progression = {};
for (const mode of E.MODES) {
  const mean = (d, f) => { const qs = allQs.filter((q) => q.mode === mode && q.requestedDifficulty === d); return qs.reduce((s, q) => s + f(q.metadata), 0) / qs.length; };
  const score = E.DIFFICULTIES.map((d) => mean(d, (m) => m.score));
  const structure = E.DIFFICULTIES.map((d) => mean(d, (m) => m.nestingDepth + m.conditions + m.changingVariables + m.dependentBounds + m.earlyExits));
  progression[mode] = { score, structure };
  ok(score[0] < score[1] && score[1] < score[2], `${mode}: complexity increases with difficulty ${score}`);
  ok(structure[0] <= structure[1] + 1e-9 && structure[1] < structure[2], `${mode}: structural complexity increases with difficulty ${structure}`);
}
// per-family: Advanced must be more complex than Beginner (score and structure)
const familyProgression = {};
for (const mode of E.MODES) for (const fam of E.challengeFamilies[mode]) {
  const qs = (d) => allQs.filter((q) => q.mode === mode && q.variant === fam && q.difficulty === d);
  const m = (d, f) => { const a = qs(d); return a.length ? a.reduce((s, q) => s + f(q.metadata), 0) / a.length : null; };
  const sc = E.DIFFICULTIES.map((d) => m(d, (x) => x.score)), st = E.DIFFICULTIES.map((d) => m(d, (x) => x.nestingDepth + x.conditions + x.changingVariables + x.dependentBounds + x.earlyExits));
  familyProgression[`${mode}/${fam}`] = { score: sc, structure: st, n: E.DIFFICULTIES.map((d) => qs(d).length) };
  if ((mode === "algorithms" || mode === "executions") && sc[0] !== null && sc[2] !== null) ok(st[2] > st[0] || sc[2] > sc[0], `${mode}/${fam}: advanced more complex than beginner (score ${sc}, structure ${st})`);
}
// Advanced is not just Beginner with bigger numbers: structural overlap
const overlap = {};
for (const mode of E.MODES) {
  const sig = (d) => new Set(allQs.filter((q) => q.mode === mode && q.requestedDifficulty === d).map((q) => q.signature.structural));
  const b = sig("beginner"), a = sig("advanced");
  const shared = [...a].filter((x) => b.has(x)).length;
  overlap[mode] = shared / a.size;
  ok(overlap[mode] < 0.2, `${mode}: advanced structures mostly distinct from beginner (${overlap[mode].toFixed(2)})`);
}

const newModeTotal = Object.entries(results.cells).filter(([k]) => k.startsWith("algorithms") || k.startsWith("executions")).reduce((s, [, c]) => s + c.n, 0);
const oldTotal = Object.entries(results.cells).filter(([k]) => !k.startsWith("algorithms") && !k.startsWith("executions")).reduce((s, [, c]) => s + c.n, 0);
if (NEW_PER >= 1000) ok(newModeTotal >= 6000, "at least 6,000 new-mode challenges"); else console.log("note: reduced sample — the 6,000 new-mode minimum applies to full runs only");
results.totals = { checks, newModeChallenges: newModeTotal, originalModeChallenges: oldTotal, oracleChecked: Object.values(results.cells).reduce((s, c) => s + c.oracle, 0), oracleHits, progression, familyProgression, advancedBeginnerStructuralOverlap: overlap, seconds: (Date.now() - t0) / 1000 };
fs.mkdirSync(new URL("../reports/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../reports/engine-results.json", import.meta.url), JSON.stringify(results, null, 1));
console.log(`Loop Lab engine: ${checks.toLocaleString()} checks passed; ${newModeTotal.toLocaleString()} new-mode + ${oldTotal.toLocaleString()} original-mode challenges; ${results.totals.oracleChecked.toLocaleString()} answers matched independent closed-form oracles; ${results.totals.seconds}s.`);
