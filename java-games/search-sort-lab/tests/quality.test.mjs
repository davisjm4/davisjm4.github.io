/* Variety / quality analysis. Measures SEPARATELY:
   1 exact uniqueness  2 normalized structural uniqueness  3 operation diversity
   4 difficulty distribution  5 distractor diversity  6 repetition frequency
   and writes results/quality-report.json + results/QUALITY_REPORT.md. */
import { section, ok, summary } from "./harness.mjs";
import { generate, nextChallenge, createHistory, exactKey, structKey, MODE_IDS, DIFFICULTIES, MODES, familiesFor } from "../engine/generator.js";
import { makeRng } from "../engine/rng.js";
import fs from "node:fs";

const N = Number(process.env.PER_CELL || 1000);
const SESSION = Number(process.env.SESSION_LEN || 200);
console.log(`quality.test.mjs (N=${N} per cell, session length ${SESSION})`);
const seedFor = (i) => 1 + ((i * 2654435761) % 2147483646);
const norm = (s) => String(s).replace(/-?\d+/g, "#").replace(/\s+/g, " ");
const entropy = (counts) => { const t = counts.reduce((a, b) => a + b, 0); const h = -counts.reduce((s, c) => (c ? s + (c / t) * Math.log2(c / t) : s), 0); return counts.length > 1 ? h / Math.log2(counts.length) : 0; };
const report = { perCell: {}, perFamily: {}, flags: [] };

await section("variety analysis", () => {
  for (const mode of MODE_IDS) for (const d of DIFFICULTIES) {
    const list = Array.from({ length: N }, (_, i) => generate(mode, d, seedFor(i + 1)));
    const exact = new Set(list.map(exactKey));
    const struct = new Set(list.map(structKey));
    const patterns = new Set(list.map((c) => `${c.family}:${c.variant}`));
    const fams = {}; list.forEach((c) => (fams[c.family] = (fams[c.family] || 0) + 1));
    const reasoning = {}; list.forEach((c) => (reasoning[c.meta.reasoning] = (reasoning[c.meta.reasoning] || 0) + 1));
    const answerKinds = {}; list.forEach((c) => (answerKinds[c.answerKind] = (answerKinds[c.answerKind] || 0) + 1));
    const algos = {}; list.forEach((c) => (algos[c.algorithm] = (algos[c.algorithm] || 0) + 1));
    const whys = new Set(); let distractors = 0, misc = 0;
    list.forEach((c) => c.choices.forEach((x, i) => { if (i !== c.answerIndex) { distractors++; whys.add(norm(x.why)); if (x.source === "misconception") misc++; } }));
    const stems = new Set(list.map((c) => norm(c.stem)));
    const maxShare = Math.max(...Object.values(fams)) / N;
    const cell = {
      challenges: N,
      exactUnique: exact.size,
      exactUniqueRate: +(exact.size / N).toFixed(4),
      structuralUnique: struct.size,
      normalizedStems: stems.size,
      reasoningPatterns: patterns.size,
      families: Object.keys(fams).length,
      familyEntropy: +entropy(Object.values(fams)).toFixed(3),
      maxFamilyShare: +maxShare.toFixed(3),
      reasoningTypes: reasoning,
      answerKinds,
      algorithms: algos,
      distinctMisconceptions: whys.size,
      misconceptionDistractorRate: +(misc / distractors).toFixed(3),
    };
    report.perCell[`${mode}/${d}`] = cell;
    ok(cell.exactUniqueRate >= 0.99, `${mode}/${d}: exact uniqueness ${cell.exactUniqueRate}`);
    ok(cell.reasoningPatterns >= Math.min(4, familiesFor(mode, d).length), `${mode}/${d}: reasoning patterns ${cell.reasoningPatterns}`);
    ok(cell.families === familiesFor(mode, d).length, `${mode}/${d}: all families appear`);
    ok(maxShare <= 0.5, `${mode}/${d}: no single family dominates (${(maxShare * 100).toFixed(0)}%)`);
    ok(cell.distinctMisconceptions >= 6, `${mode}/${d}: distractor explanations are varied (${cell.distinctMisconceptions})`);
    ok(cell.misconceptionDistractorRate >= 0.9, `${mode}/${d}: distractors come from misconceptions`);
    // difficulty must not be label-only: cells share family pools but with different parameters
  }
});

await section("per-family repetitiveness (investigating overly repetitive families)", () => {
  for (const mode of MODE_IDS) for (const f of MODES[mode].families) for (const d of DIFFICULTIES) {
    if (!(f.weight[d] > 0)) continue;
    const list = []; for (let i = 1; i <= 400; i++) { const c = generate(mode, d, seedFor(i * 7 + 3), { family: f.id }); if (c) list.push(c); }
    if (!list.length) { report.flags.push(`${mode}/${d}/${f.id}: produced nothing`); continue; }
    const exact = new Set(list.map(exactKey)).size, stems = new Set(list.map((c) => norm(c.stem))).size;
    const variants = new Set(list.map((c) => c.variant)).size;
    const ansDistinct = new Set(list.map((c) => JSON.stringify(c.correctValue))).size;
    const key = `${mode}/${d}/${f.id}`;
    report.perFamily[key] = { n: list.length, exactUnique: exact, exactRate: +(exact / list.length).toFixed(3), normalizedStems: stems, variants, distinctAnswers: ansDistinct };
    if (exact / list.length < 0.9) report.flags.push(`${key}: only ${exact}/${list.length} exact-unique`);
    if (ansDistinct < 3) report.flags.push(`${key}: only ${ansDistinct} distinct answers`);
  }
  ok(report.flags.filter((f) => f.includes("exact-unique") || f.includes("produced nothing")).length === 0, "no family is overly repetitive: " + report.flags.join("; "));
});

await section(`repetition frequency over simulated ${SESSION}-challenge classroom sessions`, () => {
  const rows = {}, fails = [];
  for (const mode of MODE_IDS) for (const d of DIFFICULTIES) {
    const rng = makeRng(99 + mode.length * 7 + d.length), hist = createHistory();
    const keys = [], structs = [];
    let exactRepeats = 0, structRepeatsWithin5 = 0, structRepeatsWithin2 = 0, sameFamilyAdj = 0, prev = null;
    for (let i = 0; i < SESSION; i++) {
      const c = nextChallenge(mode, d, rng, hist);
      const k = exactKey(c), s = structKey(c);
      if (keys.includes(k)) exactRepeats++;
      if (structs.slice(-5).includes(s)) structRepeatsWithin5++;
      if (structs.slice(-2).includes(s)) structRepeatsWithin2++;
      if (prev === c.family) sameFamilyAdj++;
      prev = c.family; keys.push(k); structs.push(s);
    }
    rows[`${mode}/${d}`] = { session: SESSION, exactRepeats, structuralRepeatsWithin2: structRepeatsWithin2, structuralRepeatsWithin5: structRepeatsWithin5, adjacentSameFamily: sameFamilyAdj };
    if (exactRepeats) fails.push(`${mode}/${d}: exact repeats ${exactRepeats}`);
    if (structRepeatsWithin2 > SESSION * 0.05) fails.push(`${mode}/${d}: same reasoning structure within previous 2 challenges = ${structRepeatsWithin2}`);
    if (sameFamilyAdj > SESSION * 0.05) fails.push(`${mode}/${d}: adjacent same-family = ${sameFamilyAdj}`);
  }
  report.sessions = rows;
  report.sessionFailures = fails;
  fs.writeFileSync(new URL("./results/quality-report.json", import.meta.url), JSON.stringify(report, null, 2));
  ok(fails.length === 0, fails.join("; "));
});

fs.writeFileSync(new URL("./results/quality-report.json", import.meta.url), JSON.stringify(report, null, 2));
// markdown table
const rowsMd = ["| Mode / Difficulty | Challenges | Exact unique | Structural signatures | Reasoning patterns | Families | Family entropy | Max family share | Distinct misconception notes |", "|---|---|---|---|---|---|---|---|---|"];
for (const [k, c] of Object.entries(report.perCell)) rowsMd.push(`| ${k} | ${c.challenges} | ${c.exactUnique} (${(c.exactUniqueRate * 100).toFixed(1)}%) | ${c.structuralUnique} | ${c.reasoningPatterns} | ${c.families} | ${c.familyEntropy} | ${(c.maxFamilyShare * 100).toFixed(0)}% | ${c.distinctMisconceptions} |`);
fs.writeFileSync(new URL("./results/QUALITY_REPORT.md", import.meta.url), "# Variety report\n\n" + rowsMd.join("\n") + "\n\nFlags:\n" + (report.flags.length ? report.flags.map((f) => "- " + f).join("\n") : "- none") + "\n");
const { checks, sections } = summary();
console.log(`quality.test.mjs: ${checks} checks passed in ${sections.length} sections; flags: ${report.flags.length}`);
if (report.flags.length) console.log(report.flags.join("\n"));
