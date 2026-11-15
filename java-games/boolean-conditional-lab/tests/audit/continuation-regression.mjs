// Regression tests for the continuation repair (BC-02: four high-predictability families) and the misconception feedback.
// Every educational defect is tested directly (by what a student can see), not by whether an export exists.
//   power      : the shortcut measure must FLAG frozen samples of the original generators (so a revert is detected);
//   resistance : fresh output on held-out seeds must stay under per-family caps;
//   plus uniqueness, determinism, difficulty preservation, explanation facts, feedback, and JVM checks (subprocess).
// Seeds: held-out base 1357911 (tuning used 20240101, validation 77001731; the frozen fixture used 555001).
// usage: node tests/audit/continuation-regression.mjs [draws=400]   (draws per level per family)
import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
import { generate, makeRng } from "../../engine.js";
import { generateCoverage } from "../../generators/coverage.js"; import { generateSwitch } from "../../generators/switch-if.js";
import { MISCONCEPTION_FEEDBACK } from "../../generators/misconceptions.js";
import { measure } from "./heuristics.mjs"; import { parseIfChain, parseSwitch, nameOfBlock } from "./displayed-parsers.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)); const N = Number(process.argv[2] || 400); const HELD_OUT = 1357911;
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const LEVELS2 = ["Intermediate", "Advanced"], LEVELS3 = ["Beginner", "Intermediate", "Advanced"];
const FAMILIES = {
  "coverage/fix-boundary": { levels: LEVELS3, gen: (r, L) => generateCoverage(r, L, "fix-boundary") },
  "coverage/equivalent-chain": { levels: LEVELS3, gen: (r, L) => generateCoverage(r, L, "equivalent-chain") },
  "switchIf/missing-break-fix": { levels: LEVELS3, gen: (r, L) => generateSwitch(r, L, "missing-break-fix") },
  "short/short-counter": { levels: LEVELS2, gen: (r, L) => { const q = generate("short", r, L); return q.family === "short-counter" ? q : null; }, tries: 40 },
};
const draw = (fam, L, i, extra = 0) => { const F = FAMILIES[fam]; for (let t = 0; t < (F.tries || 1); t++) { try { const q = F.gen(makeRng(HELD_OUT + extra + i * 104729 + t * 982451653 + LEVELS3.indexOf(L) * 1299709), L); if (q) return q; } catch {} } return null; };
const sample = (fam, n = N, levels = FAMILIES[fam].levels, offset = 0) => { const out = []; for (const L of levels) for (let i = 0; i < n; i++) { const q = draw(fam, L, i, offset); if (q) out.push(q); } return out; };
const data = Object.fromEntries(Object.keys(FAMILIES).map(f => [f, sample(f)]));
const sizes = Object.entries(data).map(([f, v]) => `${f.split("/")[1]}=${v.length}`).join(", ");

// ---- 1. power: the measure flags the frozen ORIGINAL behaviour (base 2bd0527), so reintroducing it fails the tests ----
const fixture = JSON.parse(fs.readFileSync(path.join(here, "fixtures/original-option-sets.json"), "utf8")).sets;
const MIN_ORIGINAL = { "coverage/fix-boundary": 90, "coverage/equivalent-chain": 80, "switchIf/missing-break-fix": 45, "short/short-counter": 85, "conditions": 75, "construct": 65 };
for (const [k, min] of Object.entries(MIN_ORIGINAL)) { const m = measure(fixture[k]); ok(m.n >= 140, `${k}: fixture too small`); ok(m.worst >= min, `${k}: measure only flags the original behaviour at ${m.worst.toFixed(0)}% (needs >= ${min}) - the test would not catch a revert`); }
// synthetic leaks of each kind must be flagged by the corresponding cue
{ const mk = (f) => Array.from({ length: 200 }, (_, i) => f(i));
  const hub = mk(i => ({ choices: [`a${i} && b`, `a${i} || b`, `a${i} && c`, `a${i} && b && c`].map((t, j) => j === 0 ? "x >= 5 && y < 3" : ["x > 5 && y < 3", "x >= 5 || y < 3", "x >= 5 && y <= 3"][j - 1]), answer: 0 }));
  ok(measure(hub).mostSimilar > 90, "synthetic hub leak not flagged");
  const longest = mk(i => ({ choices: ["short", "tiny", "a considerably longer keyed option", "brief"], answer: 2 })); ok(measure(longest).longest > 90, "synthetic longest-is-key leak not flagged");
  const overlap = mk(i => ({ question: `Check the value alpha${i} beta`, choices: ["gamma delta", `alpha${i} beta`, "epsilon zeta", "eta theta"], answer: 1 })); ok(measure(overlap).promptOverlap > 90, "synthetic prompt-overlap leak not flagged");
  const balanced = mk(i => { const o = ["w x", "y z", "p q", "r s"]; return { choices: o, answer: i % 4 }; }); ok(measure(balanced).worst < 45, "balanced synthetic sets wrongly flagged"); }

// ---- 2. resistance on held-out seeds ----
const CAPS = { // per-cue caps on the exploitable accuracy (percent). Chance is 25. Higher caps are documented limits, see audit report.
  "coverage/fix-boundary": { mostSimilar: 33, leastSimilar: 40, longest: 40, shortest: 56, promptOverlap: 56 },   // keyed fix is the minimal edit -> shortest/overlap cues are inherent to the format
  "coverage/equivalent-chain": { mostSimilar: 36, leastSimilar: 40, longest: 36, shortest: 40, promptOverlap: 40 },
  "switchIf/missing-break-fix": { mostSimilar: 36, leastSimilar: 40, longest: 36, shortest: 40, promptOverlap: 47 },
  "short/short-counter": { mostSimilar: 40, leastSimilar: 42, longest: 45, shortest: 42, promptOverlap: 45 },
};
for (const [fam, caps] of Object.entries(CAPS)) { const m = measure(data[fam]); ok(m.n >= (fam.startsWith("short") ? 200 : 700), `${fam}: only ${m.n} usable draws`);
  for (const [cue, cap] of Object.entries(caps)) ok(m.exploit[cue] <= cap, `${fam}: ${cue} exploits ${m.exploit[cue].toFixed(1)}% (cap ${cap}%, n=${m.n})`); }
// A second seed block isolates two cues that reliably return with joint balancing disabled.
// Each family has a wide margin on both the repaired and mutation-control samples.
for (const [family, cue, cap] of [
  ["coverage/equivalent-chain", "mostSimilar", 34],
  ["switchIf/missing-break-fix", "promptOverlap", 36],
]) {
  const independent = measure(sample(family, 400, LEVELS3, 12547399 - HELD_OUT));
  ok(independent.n === 1200, `${family}: expected 1,200 independent four-choice draws`);
  ok(independent[cue] < cap, `${family}: independent ${cue} shortcut ${independent[cue].toFixed(1)}% (cap ${cap}%)`);
}
// answer position stays uniform
for (const [fam, qs] of Object.entries(data)) { const pos = [0, 0, 0, 0]; qs.forEach(q => pos[q.answer]++); const e = qs.length / 4; const chi = pos.reduce((s, x) => s + (x - e) ** 2 / e, 0); ok(chi < 16.3, `${fam}: answer position skewed (chi2 ${chi.toFixed(1)}, ${pos})`); }

// ---- 3. uniqueness, option quality and feedback ----
for (const [fam, qs] of Object.entries(data)) { for (const q of qs) {
  ok(q.choices.length === 4 && new Set(q.choices).size === 4, `${fam}: options not four distinct texts`);
  ok(q.choices[q.answer] === q.answerText && q.choiceTags[q.answer] === "correct" && q.choiceTags.filter(t => t === "correct").length === 1, `${fam}: exactly one option must carry the correct tag at the keyed index`);
  ok(new Set(q.choiceTags.filter(t => t !== "correct")).size >= 2 || q.choiceTags.filter(t => t !== "correct").length < 2, `${fam}: distractors show a single misconception only`);
  ok(Array.isArray(q.choiceFeedback) && q.choiceFeedback.length === 4 && q.choiceFeedback[q.answer] === null, `${fam}: feedback must be null for the key`);
  q.choiceTags.forEach((t, i) => { if (i === q.answer) return; ok(typeof q.choiceFeedback[i] === "string" && q.choiceFeedback[i].length > 30, `${fam}: wrong option with tag "${t}" has no misconception feedback`); ok(!q.choiceFeedback[i].includes(q.choices[q.answer]), `${fam}: feedback must not reveal the keyed option`); }); } }
// every tag the families emit has a message, and no message is unused junk
{ const seen = new Set(); Object.values(data).flat().forEach(q => q.choiceTags.forEach(t => { if (t !== "correct") seen.add(t); })); for (const t of seen) ok(MISCONCEPTION_FEEDBACK[t], `tag "${t}" has no feedback message`);
  ok(Object.values(MISCONCEPTION_FEEDBACK).every(m => /[.]$/.test(m) && m.length < 260), "feedback messages must be short complete sentences");
  ok(new Set(Object.values(MISCONCEPTION_FEEDBACK)).size >= Object.keys(MISCONCEPTION_FEEDBACK).length - 2, "feedback messages should differ per misconception"); }
// the pool must offer real variety: at least five different misconceptions across the sample for every family
for (const [fam, qs] of Object.entries(data)) { const tags = new Set(qs.flatMap(q => q.choiceTags).filter(t => t !== "correct")); ok(tags.size >= 5, `${fam}: only ${tags.size} distinct misconceptions across ${qs.length} items (original had 3-4)`); }

// ---- 4. seeded determinism and isolation ----
for (const fam of Object.keys(FAMILIES)) { for (const L of FAMILIES[fam].levels) { const a = JSON.stringify(draw(fam, L, 5)), b = JSON.stringify(draw(fam, L, 7)); const a2 = JSON.stringify(draw(fam, L, 5)); ok(a === a2, `${fam}/${L}: same seed produced different challenges`); ok(a !== b, `${fam}/${L}: different seeds produced the same challenge`); } }

// ---- 5. difficulty preserved ----
{ const arms = q => (q.code.match(/\b(if|else if) \(/g) || []).length;
  const fb = L => data["coverage/fix-boundary"].filter(q => q.difficulty === undefined).length; void fb;
  const countArms = (fam, L) => { const v = []; for (let i = 0; i < 150; i++) { const q = draw(fam, L, i); if (q) v.push(arms(q)); } return v; };
  ok(countArms("coverage/fix-boundary", "Intermediate").every(x => x === 2) && countArms("coverage/fix-boundary", "Advanced").every(x => x === 3), "fix-boundary: Intermediate must have 2 branches and Advanced 3");
  ok(countArms("coverage/equivalent-chain", "Intermediate").every(x => x === 2) && countArms("coverage/equivalent-chain", "Advanced").every(x => x === 3), "equivalent-chain: Intermediate must have 2 tests and Advanced 3");
  const missing = L => { const v = []; for (let i = 0; i < 150; i++) { const q = draw("switchIf/missing-break-fix", L, i); if (!q) continue; const sw = parseSwitch(q.code); v.push(sw.blocks.slice(0, -1).filter(b => !b.brk).length); } return v; };
  ok(missing("Beginner").every(x => x === 1), "missing-break-fix: Beginner has exactly one block missing its break"); ok(missing("Advanced").some(x => x === 2) && missing("Advanced").every(x => x >= 1 && x <= 2), "missing-break-fix: Advanced mixes one and two missing breaks");
  for (const fam of ["coverage/fix-boundary", "coverage/equivalent-chain", "switchIf/missing-break-fix"]) { const mean = L => { const v = []; for (let i = 0; i < 200; i++) { const q = draw(fam, L, i); if (q) v.push(q.complexity.score); } return v.reduce((s, x) => s + x, 0) / v.length; }; ok(mean("Advanced") >= mean("Intermediate") - 0.01, `${fam}: Advanced complexity fell below Intermediate`); }
  const hits = L => { let n = 0, k = 0; for (let i = 0; i < 400; i++) { const q = draw("short/short-counter", L, i); if (q) { n++; k += /hits\+\+|\+\+hits/.test(q.code) ? 1 : 0; } } return n; }; ok(hits("Intermediate") > 20 && hits("Advanced") > 20, "short-counter must still appear at Intermediate and Advanced"); }

// ---- 6. explanation facts match the displayed code ----
for (const q of data["coverage/fix-boundary"]) { const ch = parseIfChain(q.code); const bug = ch.arms.find(a => /^\w+ > \d+$/.test(a.cond)); const T = Number(bug.cond.split(" > ")[1]); const v = bug.cond.split(" ")[0];
  ok(q.explanation.includes(`"${T} and above" includes ${T}`) && q.explanation.includes(`>= ${T}`) && q.explanation.includes(`> ${T - 1}`) && q.explanation.includes(`> ${T},`), `fix-boundary explanation does not match the buggy test ${bug.cond}: ${q.explanation}`); ok(ch.arms.filter(a => /^\w+ > \d+$/.test(a.cond)).length === 1, "exactly one buggy test per item"); void v; }
for (const q of data["switchIf/missing-break-fix"]) { const sw = parseSwitch(q.code); const names = sw.blocks.slice(0, -1).filter(b => !b.brk).map(nameOfBlock); const m = q.explanation.match(/ends without break: (.+?)\. Adding/); ok(m && m[1] === names.join(" and "), `missing-break explanation names "${m && m[1]}" but the blocks without break are ${names.join(" and ")}`); }
for (const q of data["short/short-counter"]) { const m = q.code.match(/int x = (-?\d+);\nint hits = (\d+);\nif \(x > (\d+) (&&|\|\|) /); const x = +m[1], t = +m[3], left = x > t, and = m[4] === "&&"; ok(q.explanation.startsWith(`x > ${t} is ${left}.`), `counter explanation misstates the left operand: ${q.explanation}`);
  const runs = and ? left : !left; ok(runs ? /must (also )?evaluate the right side/.test(q.explanation) : /never runs/.test(q.explanation), `counter explanation misstates whether the right side runs: ${q.explanation}`); }

// ---- 7. JVM behaviour (subprocess, needs a JDK): displayed code, family options, truth tables ----
const java = spawnSync("java", ["-version"]); const run = (script, args) => { const r = spawnSync("node", [path.join(here, script), ...args], { encoding: "utf8", maxBuffer: 1 << 28 }); return { code: r.status, out: (r.stdout || "") + (r.stderr || "") }; };
if (java.status === 0) {
  let r = run("family-java-verify.mjs", ["25", "9090"]); ok(r.code === 0, "family JVM verification failed:\n" + r.out.slice(-1500));
  r = run("family-java-verify.mjs", ["8", "9090", "--sabotage-key"]); ok(r.code !== 0, "family JVM verifier did not fail when the key was corrupted (no power)");
  r = run("displayed-code-verify.mjs", ["60", "9090"]); ok(r.code === 0, "displayed-code JVM verification failed:\n" + r.out.slice(-1500));
  r = run("truth-table-audit.mjs", ["300", "9090"]); ok(r.code === 0, "truth-table audit failed:\n" + r.out.slice(-1500));
} else console.log("NOTE: no JDK on PATH - JVM subprocess checks skipped");
console.log(`Continuation regression: ${checks} checks passed (held-out seeds ${HELD_OUT}; usable draws ${sizes}; JVM checks ${java.status === 0 ? "run" : "SKIPPED"}).`);
