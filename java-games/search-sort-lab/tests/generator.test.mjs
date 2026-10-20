/* Generator tests: PER_CELL challenges for each mode x difficulty (default 1000,
   18,000 total). Every challenge is re-derived by engine/validation.js, which does
   not import the simulators. */
import { section, ok, eq, summary } from "./harness.mjs";
import { generate, nextChallenge, createHistory, exportQuestion, assess, MODES, MODE_IDS, DIFFICULTIES, familiesFor, exactKey } from "../engine/generator.js";
import { verifyChallenge } from "../engine/validation.js";
import { validateDifficulty } from "../engine/difficulty.js";
import { makeRng } from "../engine/rng.js";
import fs from "node:fs";

const PER_CELL = Number(process.env.PER_CELL || 1000);
console.log(`generator.test.mjs (PER_CELL=${PER_CELL})`);
const table = [];
const seedFor = (i) => 1 + ((i * 2654435761) % 2147483646);
const all = {};

await section(`${PER_CELL} challenges per mode x difficulty are valid, solvable, and independently verified`, () => {
  for (const mode of MODE_IDS) {
    const row = { mode, cells: {}, issues: [] };
    for (const d of DIFFICULTIES) {
      const list = [];
      let crashes = 0, nulls = 0, problems = 0, attemptsSum = 0;
      const t0 = Date.now();
      for (let i = 1; i <= PER_CELL; i++) {
        let ch = null;
        try { ch = generate(mode, d, seedFor(i), { throwErrors: true }); } catch (e) { crashes++; row.issues.push(`${d}: crash ${e.message}`); continue; }
        if (!ch) { nulls++; continue; }
        attemptsSum += ch.attempts;
        const p = verifyChallenge(ch);
        if (p.length) { problems++; if (row.issues.length < 6) row.issues.push(`${d} seed ${seedFor(i)} ${ch.family}: ${p[0]}`); }
        // solvable: exactly the answer index is accepted
        ok(assess(ch, ch.answerIndex), "correct index accepted");
        for (let c = 0; c < 4; c++) if (c !== ch.answerIndex) ok(!assess(ch, c), "wrong index rejected");
        list.push(ch);
      }
      all[`${mode}/${d}`] = list;
      eq(crashes, 0, `${mode}/${d} crashes`);
      eq(nulls, 0, `${mode}/${d} failed to generate`);
      eq(problems, 0, `${mode}/${d} verification problems: ${row.issues.join(" | ")}`);
      row.cells[d] = { tested: list.length, avgAttempts: +(attemptsSum / Math.max(1, list.length)).toFixed(2), ms: Date.now() - t0 };
    }
    table.push(row);
  }
});

await section("same seed reproduces the identical challenge; different seeds differ", () => {
  for (const mode of MODE_IDS) for (const d of DIFFICULTIES) {
    for (let i = 1; i <= 60; i++) {
      const s = seedFor(i * 31);
      const a = generate(mode, d, s), b = generate(mode, d, s);
      eq(JSON.stringify(a), JSON.stringify(b), `${mode}/${d} seed ${s} reproducible`);
      const c = generate(mode, d, s, { family: a.family });
      eq(JSON.stringify({ ...c, attempts: 0, rejects: [] }) === JSON.stringify({ ...a, attempts: 0, rejects: [] }) || c.family === a.family, true, "forced family keeps the family");
    }
    const distinct = new Set(Array.from({ length: 40 }, (_, i) => exactKey(generate(mode, d, seedFor(i + 1)))));
    ok(distinct.size >= 30, `${mode}/${d}: 40 different seeds give >=30 different challenges (got ${distinct.size})`);
  }
});

await section("difficulty metadata is consistent and genuinely graded", () => {
  const medians = {};
  for (const [cell, list] of Object.entries(all)) {
    for (const ch of list) eq(validateDifficulty(ch), [], `${cell} ${ch.family}`);
    const [mode, d] = cell.split("/");
    const med = (f) => { const v = list.map(f).filter((x) => Number.isFinite(x)).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    (medians[mode] = medians[mode] || {})[d] = { steps: med((c) => c.meta.steps), len: med((c) => c.meta.arrayLength) };
  }
  for (const mode of MODE_IDS) {
    const m = medians[mode];
    ok(m.beginner.steps <= m.intermediate.steps && m.intermediate.steps <= m.advanced.steps, `${mode}: median steps rise with difficulty ${JSON.stringify(m)}`);
    ok(m.beginner.steps < m.advanced.steps, `${mode}: advanced requires more steps than beginner`);
  }
  // no Advanced challenge is a one-step question
  for (const [cell, list] of Object.entries(all)) if (cell.endsWith("advanced")) for (const ch of list) ok(ch.meta.steps >= 4 && !["one-step", "recognize", "one-pass"].includes(ch.meta.reasoning), `${cell}: advanced is not one-step`);
  fs.writeFileSync(new URL("./results/difficulty-medians.json", import.meta.url), JSON.stringify(medians, null, 2));
});

await section("every challenge family is reachable at the difficulties it declares", () => {
  for (const mode of MODE_IDS) for (const d of DIFFICULTIES) {
    const seen = new Set(all[`${mode}/${d}`].map((c) => c.family));
    for (const f of familiesFor(mode, d)) { ok(Array.from({ length: 30 }, (_, i) => generate(mode, d, seedFor(i + 1), { family: f.id })).some(Boolean), `${mode}/${d}: family ${f.id} cannot be generated`); if (PER_CELL >= 500) ok(seen.has(f.id), `${mode}/${d}: family ${f.id} never generated in ${PER_CELL} samples`); }
    for (const fam of seen) ok(familiesFor(mode, d).some((f) => f.id === fam), "no undeclared family");
  }
});

await section("session behavior: no immediate repeats, mode/difficulty switching, export schema", () => {
  const rng = makeRng(2026);
  const hist = createHistory();
  for (const mode of MODE_IDS) for (const d of DIFFICULTIES) {
    const keys = [];
    let sameFamilyRuns = 0, prev = null;
    for (let i = 0; i < 150; i++) {
      const ch = nextChallenge(mode, d, rng, hist);
      ok(ch && ch.mode === mode && ch.difficulty === d, "challenge matches the requested mode and difficulty");
      eq(verifyChallenge(ch), []);
      keys.push(exactKey(ch));
      if (prev && prev === ch.family) sameFamilyRuns++;
      prev = ch.family;
      const recent = keys.slice(-40, -1);
      ok(!recent.includes(exactKey(ch)), `${mode}/${d}: exact repeat inside the recent window`);
    }
    ok(sameFamilyRuns <= 150 * 0.35, `${mode}/${d}: consecutive same-family challenges stay uncommon (${sameFamilyRuns})`);
  }
  // exported questions
  for (const mode of MODE_IDS) {
    const q = exportQuestion(generate(mode, "intermediate", 777));
    for (const k of ["id", "mode", "difficulty", "algorithm", "skill", "seed", "stem", "choices", "correctIndex", "explanation", "regenerate"]) ok(k in q, `export has ${k}`);
    eq(q.choices.filter((c) => c.correct).length, 1);
    eq(generate(q.regenerate.mode, q.regenerate.difficulty, q.regenerate.seed, { family: q.regenerate.family }).id, q.id, "export regenerates via seed");
  }
});

await section("distractors: distinct, actually wrong, and carry a misconception explanation", () => {
  let fallback = 0, total = 0;
  for (const list of Object.values(all)) for (const ch of list) {
    ch.choices.forEach((c, i) => {
      if (i === ch.answerIndex) return;
      total++;
      if (c.source === "fallback") fallback++;
      ok(c.why && c.why.length > 8, "distractor has a why");
    });
  }
  const rate = fallback / total;
  fs.writeFileSync(new URL("./results/distractor-sources.json", import.meta.url), JSON.stringify({ distractors: total, fallback, fallbackRate: +rate.toFixed(4) }, null, 2));
  ok(rate < 0.12, `generic fallback distractors stay rare (${(rate * 100).toFixed(1)}%)`);
});

fs.writeFileSync(new URL("./results/generator-table.json", import.meta.url), JSON.stringify(table, null, 2));
const { checks, sections } = summary();
console.log(`generator.test.mjs: ${checks} checks passed in ${sections.length} sections; ${Object.values(all).reduce((s, l) => s + l.length, 0)} challenges generated and verified`);
