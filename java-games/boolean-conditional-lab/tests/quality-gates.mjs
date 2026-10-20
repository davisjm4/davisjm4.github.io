// Enforcing quality gates. Each gate reports PASS/FAIL separately; the process
// exits non-zero if any gate fails. usage: node tests/quality-gates.mjs [n=1000] [--json out]
import fs from "node:fs";
import { generate, makeRng, booleanGame, assess, signature, createPracticeSession, DIFFICULTIES } from "../engine.js";
import { FAMILIES as SW } from "../generators/switch-if.js";
import { FAMILIES as CV } from "../generators/coverage.js";
import { ACTIVITIES as TT } from "../generators/truth-table.js";
import { exactKey, structuralKey } from "./diagnose-lib.mjs";
import { exprVars, truthVector, hasDuplicateOperand } from "./diag-bool.mjs";
import * as B from "../generators/bool.js";

const args = process.argv.slice(2); const N = Number(args[0] || 1000);
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const MODES = Object.keys(booleanGame.modes); const REBUILT = ["truthTable", "switchIf", "coverage"];
const DUP_LIMIT = { Beginner: 10, Intermediate: 5, Advanced: 5 };
const DECLARED = { truthTable: TT, switchIf: SW, coverage: CV };
const gates = {}; const fail = (g, msg) => { (gates[g] ||= { pass: true, problems: [] }); gates[g].pass = false; if (gates[g].problems.length < 12) gates[g].problems.push(msg); };
const ok = g => { gates[g] ||= { pass: true, problems: [] }; };
["correctness", "exact-diversity", "structural-diversity", "family-coverage", "difficulty", "distractors", "session-repetition", "answer-position", "expression-quality", "partition-soundness"].forEach(ok);
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const matrix = [];

for (const mode of MODES) {
  const cx = {};
  for (const L of DIFFICULTIES) {
    const rng = makeRng(98765 + MODES.indexOf(mode) * 17 + DIFFICULTIES.indexOf(L));
    const exact = new Set(), struct = new Set(), fam = new Map(), scores = [], pos = [0, 0, 0, 0]; let longest = 0, multi = 0, boolT = 0, boolN = 0;
    const tagSet = new Set();
    for (let i = 0; i < N; i++) {
      const c = generate(mode, rng, L);
      const id = `${mode}/${L}/${i}`;
      // ---- correctness (structural, JS level; Java semantics are checked in java-verify.mjs)
      const opts = c.kind === "select" ? c.tokens.map(t => t.text) : c.choices;
      if (c.kind === "select") { if (c.tokens.filter(t => t.correct).length !== 1 || !c.tokens[c.answer]?.correct) fail("correctness", `${id}: select item without exactly one correct token`); }
      else {
        if (new Set(opts).size !== opts.length) fail("correctness", `${id}: duplicate options`);
        if (opts.length < 2 || opts.length > 4) fail("correctness", `${id}: ${opts.length} options`);
        if (opts.some(o => /^Option \d/.test(o))) fail("correctness", `${id}: filler option`);
        if (!c.check || c.check.claims.length !== opts.length) fail("correctness", `${id}: options lack verifiable claims`);
        if (c.choiceTags.filter(t => t === "correct").length !== 1 || c.choiceTags[c.answer] !== "correct") fail("correctness", `${id}: answer tag mismatch`);
      }
      if (!assess(c, c.answer) || opts.some((_, j) => j !== c.answer && assess(c, j))) fail("correctness", `${id}: assess() does not single out the answer`);
      if (c.difficulty !== L || c.mode !== mode || !c.question || !c.code || !c.explanation) fail("correctness", `${id}: missing schema fields`);
      const visible = [c.question, c.code, c.explanation, ...(opts || []), JSON.stringify(c.table || "")].join("\n");
      if (/undefined|NaN|\[object|null\)|Option \d/.test(visible)) fail("correctness", `${id}: placeholder text visible to students: ${visible.match(/.{0,40}(undefined|NaN|\[object|null\)|Option \d).{0,20}/)[0]}`);
      // ---- distractors
      c.choiceTags.forEach((t, j) => { if (j !== c.answer) { if (!t || t === "correct") fail("distractors", `${id}: distractor without misconception tag`); tagSet.add(t); } });
      // ---- truth-table expression quality on everything students see
      if (mode === "truthTable") {
        const intentional = /every possible|simpler/.test(c.question);
        for (const ex of (c.expressions || (c.expression ? [c.expression] : []))) {
          if (/[<>=]|\d/.test(ex)) continue;
          if (!intentional && hasDuplicateOperand(ex)) fail("expression-quality", `${id}: duplicate operand in ${ex}`);
          const vars = exprVars(ex), tv = truthVector(ex, vars);
          const essential = vars.filter((v, j) => { const bit = 1 << (vars.length - 1 - j); for (let r = 0; r < tv.length; r++) if (tv[r] !== tv[r ^ bit]) return true; return false; });
          if (!intentional && L !== "Beginner" && essential.length !== vars.length) fail("expression-quality", `${id}: irrelevant variable in ${ex}`);
          if (!intentional && (!tv.includes("0") || !tv.includes("1"))) fail("expression-quality", `${id}: accidental constant ${ex}`);
          if (L === "Beginner" && vars.length > 2) fail("expression-quality", `${id}: Beginner uses ${vars.length} variables`);
        }
        if (c.table) { const shown = Object.keys(c.table[0]).filter(k => k !== "result"); const used = exprVars(c.expression); if (shown.some(v => !used.includes(v))) fail("expression-quality", `${id}: table shows unused variable`); }
      }
      exact.add(exactKey(c)); struct.add(structuralKey(c)); fam.set(c.family, (fam.get(c.family) || 0) + 1); scores.push(c.complexity.score);
      if (c.kind !== "select") { pos[c.answer]++; if (opts.length > 2) { multi++; const Ls = opts.map(o => o.length), mx = Math.max(...Ls); if (Ls[c.answer] === mx && Ls.filter(x => x === mx).length === 1) longest++; } if (/^(true|false)$/.test(c.answerText)) { boolN++; if (c.answerText === "true") boolT++; } }
    }
    const dupPct = +(100 * (N - exact.size) / N).toFixed(1);
    if (dupPct >= DUP_LIMIT[L]) fail("exact-diversity", `${mode}/${L}: ${dupPct}% exact duplicates (limit ${DUP_LIMIT[L]}%)`);
    if (REBUILT.includes(mode) && struct.size < 0.1 * N) fail("structural-diversity", `${mode}/${L}: only ${struct.size} structural patterns in ${N} (need at least 10%)`);
    if (DECLARED[mode]) {
      const declared = mode === "truthTable" ? TT[L] : DECLARED[mode][L];
      const expectShare = N / declared.length;
      for (const f of declared) { const n = fam.get(f) || 0; if (n < 0.4 * expectShare || n > 2.0 * expectShare) fail("family-coverage", `${mode}/${L}: family ${f} appears ${n} times (expected about ${Math.round(expectShare)})`); }
    }
    const answered = pos.reduce((a, b) => a + b, 0), slots = pos.filter((_, i) => i < 4 && pos[i] > 0).length;
    if (mode !== "identify") { const four = multi > 0.8 * answered; if (four && pos.some(p => p / answered < 0.15 || p / answered > 0.35)) fail("answer-position", `${mode}/${L}: positions ${JSON.stringify(pos)}`); }
    if (boolN > 50 && (boolT / boolN < 0.4 || boolT / boolN > 0.6)) fail("answer-position", `${mode}/${L}: true share ${(boolT / boolN).toFixed(2)}`);
    if (multi && longest / multi > 0.4) fail("answer-position", `${mode}/${L}: correct option is the longest ${(100 * longest / multi).toFixed(0)}% of the time`);
    if (tagSet.size < 3) fail("distractors", `${mode}/${L}: only ${tagSet.size} misconception types`);
    cx[L] = { mean: scores.reduce((a, b) => a + b, 0) / N, p50: q(scores, 0.5), p75: q(scores, 0.75), p25: q(scores, 0.25) };
    // ---- session-level repetition (bounded history)
    const sess = createPracticeSession({ seedSource: (() => { const r = makeRng(1234 + i0(mode, L)); return () => Math.floor(r() * 0x7fffffff) + 1; })() });
    const seq = Array.from({ length: 100 }, () => signature(sess.next(mode, L)));
    if (new Set(seq).size !== 100) fail("session-repetition", `${mode}/${L}: ${100 - new Set(seq).size} repeats in 100 consecutive challenges`);
    matrix.push({ mode, difficulty: L, tested: N, exactDuplicates: N - exact.size, exactDuplicatePct: dupPct, structuralPatterns: struct.size, parameterOnlyVariants: exact.size - struct.size, families: fam.size, misconceptionTypes: tagSet.size, positions: pos, trueShare: boolN ? +(boolT / boolN).toFixed(2) : null, longestCorrectPct: multi ? +(100 * longest / multi).toFixed(1) : null, complexity: { mean: +cx[L].mean.toFixed(2), p25: cx[L].p25, p50: cx[L].p50, p75: cx[L].p75 }, sessionRepeatsIn100: 100 - new Set(seq).size });
  }
  if (REBUILT.includes(mode)) {
    const [b, i, a] = DIFFICULTIES.map(L => cx[L]);
    if (!(b.mean < i.mean && i.mean < a.mean)) fail("difficulty", `${mode}: means not increasing ${b.mean.toFixed(1)} / ${i.mean.toFixed(1)} / ${a.mean.toFixed(1)}`);
    if (!(b.p75 < a.p50)) fail("difficulty", `${mode}: Beginner p75 ${b.p75} is not below Advanced median ${a.p50}`);
  } else {
    const [b, , a] = DIFFICULTIES.map(L => cx[L]); if (!(b.mean <= a.mean)) fail("difficulty", `${mode}: Advanced is not at least as complex as Beginner`);
  }
}
function i0(m, L) { return MODES.indexOf(m) * 7 + DIFFICULTIES.indexOf(L); }

// ---- partition soundness: equivalence by critical points must agree with brute force over a wide window
{
  const rng = makeRng(777); let checked = 0;
  for (let t = 0; t < 400; t++) {
    const mk = () => { const atoms = [B.CMP("x", ["<", "<=", ">", ">=", "==", "!="][Math.floor(rng() * 6)], Math.floor(rng() * 40)), B.CMP("y", ["<", "<=", ">", ">="][Math.floor(rng() * 4)], Math.floor(rng() * 40)), B.V("f")]; const tree = B.randomTree(rng, { vars: ["p0", "p1", "p2"], leafCount: 3, negLeaf: 0.3, negGroup: 0.3 }); const sub = n => n.k === "var" ? atoms[Number(n.n.slice(1))] : n.k === "not" ? B.NOT(sub(n.a)) : { k: n.k, xs: n.xs.map(sub) }; return sub(tree); };
    const a = mk(); const b = rng() < 0.5 ? (B.applyAt(a, B.SOUND.pushNot, rng) || B.applyAt(a, B.MISTAKES["swap-and-or"], rng) || a) : mk();
    const cs = new Map(); const col = n => { if (n.k === "cmp") { (cs.get(n.v) || cs.set(n.v, new Set()).get(n.v)).add(n.c); } else if (n.k === "not") col(n.a); else if (B.isCompound(n)) n.xs.forEach(col); }; col(a); col(b);
    const pts = v => { const s = [...(cs.get(v) || [0])]; return [...new Set([...s.flatMap(c => [c - 1, c, c + 1]), Math.min(...s) - 100, Math.max(...s) + 100])]; };
    let repSame = true; for (const x of pts("x")) for (const y of pts("y")) for (const f of [false, true]) if (B.evaluate(a, { x, y, f }) !== B.evaluate(b, { x, y, f })) repSame = false;
    let bruteSame = true; for (let x = -150; x <= 250 && bruteSame; x += 1) for (let y = -150; y <= 250 && bruteSame; y += 3) for (const f of [false, true]) if (B.evaluate(a, { x, y, f }) !== B.evaluate(b, { x, y, f })) bruteSame = false;
    if (repSame !== bruteSame) fail("partition-soundness", `critical points disagree with brute force: ${B.print(a)} vs ${B.print(b)}`);
    checked++;
  }
  gates["partition-soundness"].checked = checked;
}

let allPass = true;
for (const [g, r] of Object.entries(gates)) { console.log(`${r.pass ? "PASS" : "FAIL"}  ${g}${r.problems.length ? "\n      " + r.problems.join("\n      ") : ""}`); if (!r.pass) allPass = false; }
console.log("\nmode/difficulty            dup%  struct  param  fam  tags  cx(p25/p50/p75)     positions");
for (const r of matrix) console.log(`${(r.mode + "/" + r.difficulty).padEnd(25)} ${String(r.exactDuplicatePct).padStart(5)}  ${String(r.structuralPatterns).padStart(6)} ${String(r.parameterOnlyVariants).padStart(6)} ${String(r.families).padStart(4)} ${String(r.misconceptionTypes).padStart(5)}  ${`${r.complexity.p25}/${r.complexity.p50}/${r.complexity.p75}`.padEnd(18)} ${JSON.stringify(r.positions)}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ n: N, gates, matrix }, null, 2));
console.log(allPass ? "\nALL QUALITY GATES PASS" : "\nQUALITY GATES FAILED");
process.exit(allPass ? 0 : 1);
