/* Search & Sort Lab — challenge generator (no DOM, no globals, fully seedable).
   generate(mode, difficulty, seed[, {family}])  -> challenge object (pure)
   createHistory()                                -> bounded in-memory repeat avoidance
   nextChallenge(mode, difficulty, rng, history)  -> next fresh challenge for a session
   exportQuestion(challenge)                      -> plain structure for Teacher Tools / QTI later */
import { makeRng, weighted } from "./rng.js";
import { assemble } from "./kit.js";
import { validateDifficulty, DIFFICULTIES } from "./difficulty.js";
import { binaryFamilies } from "./modes/binary.js";
import { selectionFamilies } from "./modes/selection.js";
import { insertionFamilies } from "./modes/insertion.js";
import { mergeFamilies } from "./modes/merge.js";
import { nameFamilies } from "./modes/name.js";
import { compareFamilies } from "./modes/compare.js";

export const GAME_ID = "search-sort-lab";
export const MODES = {
  binary: { title: "Binary Search Tracker", short: "Binary Search", blurb: "Trace low, mid, and high on a sorted array.", families: binaryFamilies },
  selection: { title: "Trace Selection Sort", short: "Selection Sort", blurb: "Find minimums, swap, and read the array after each pass.", families: selectionFamilies },
  insertion: { title: "Trace Insertion Sort", short: "Insertion Sort", blurb: "Track the key, the shifts, and the sorted prefix.", families: insertionFamilies },
  merge: { title: "Merge Sort Trace", short: "Merge Sort", blurb: "Follow splitting, recursive calls, and merging.", families: mergeFamilies },
  name: { title: "Name That Algorithm", short: "Name That Algorithm", blurb: "Recognize an algorithm from its code or its behavior.", families: nameFamilies },
  compare: { title: "Compare the Work", short: "Compare the Work", blurb: "Count comparisons and compare algorithms on real inputs.", families: compareFamilies },
};
export const MODE_IDS = Object.keys(MODES);
export { DIFFICULTIES };
export const familiesFor = (mode, difficulty) => MODES[mode].families.filter((f) => (f.weight[difficulty] || 0) > 0);

const norm = (s) => String(s || "").replace(/-?\d+/g, "#");
export const exactKey = (ch) => JSON.stringify([ch.mode, ch.difficulty, ch.stem, ch.code, ch.visuals.map((v) => v.values || v.rows), ch.choices.map((c) => c.text)]);
export const structKey = (ch) => [ch.mode, ch.difficulty, ch.family, ch.variant, norm(ch.stem), norm(ch.code).replace(/\s+/g, " "), ch.answerKind].join("|");

/* ---- pure generation ---- */
export function generate(mode, difficulty, seed, opts = {}) {
  const M = MODES[mode];
  if (!M) throw new Error("unknown mode " + mode);
  if (!DIFFICULTIES.includes(difficulty)) throw new Error("unknown difficulty " + difficulty);
  const r = makeRng(seed);
  const pool = familiesFor(mode, difficulty);
  const forced = opts.family ? pool.find((f) => f.id === opts.family) : null;
  if (opts.family && !forced) return null;
  const maxAttempts = opts.maxAttempts || 80;
  const rejects = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const fam = forced || weighted(r, pool.map((f) => [f, f.weight[difficulty]]));
    let base = null;
    try { base = fam.build(r, difficulty); } catch (e) { if (opts.throwErrors) throw e; rejects.push(`${fam.id}: threw ${e.message}`); continue; }
    if (!base) { rejects.push(`${fam.id}: null`); continue; }
    const ch = assemble(r, base);
    if (!ch) { rejects.push(`${fam.id}: choices`); continue; }
    ch.mode = mode; ch.difficulty = difficulty; ch.seed = seed; ch.attempts = attempt;
    ch.id = `${GAME_ID}:${mode}:${difficulty}:${seed}:${ch.family}`;
    const dp = validateDifficulty(ch);
    if (dp.length) { rejects.push(`${fam.id}: ${dp[0]}`); continue; }
    ch.rejects = rejects;
    return ch;
  }
  return null;
}

/* ---- bounded repeat avoidance (in-memory only; nothing is stored) ---- */
export function createHistory({ exactMax = 300, structMax = 6, familyMax = 4 } = {}) {
  const exact = [], struct = [], fams = [];
  const push = (a, v, max) => { a.push(v); while (a.length > max) a.shift(); };
  return {
    isExactRepeat: (ch) => exact.includes(exactKey(ch)),
    isStructRepeat: (ch) => struct.includes(structKey(ch)),
    recentFamilies: () => fams.slice(),
    add(ch) { push(exact, exactKey(ch), exactMax); push(struct, structKey(ch), structMax); push(fams, ch.family, familyMax); },
    clear() { exact.length = struct.length = fams.length = 0; },
    get size() { return exact.length; },
  };
}

export function nextChallenge(mode, difficulty, rng = Math.random, history = createHistory(), tries = 60) {
  const all = familiesFor(mode, difficulty);
  for (let t = 0; t < tries; t++) {
    // avoid the most recent families: up to half of the pool (at most 3) so small pools still rotate
    const avoid = Math.max(1, Math.min(3, Math.floor(all.length / 2)));
    const recent = history.recentFamilies().slice(-avoid);
    const open = all.filter((f) => !recent.includes(f.id));
    const pool = open.length && t < tries - 10 ? open : all;
    const fam = weighted(rng, pool.map((f) => [f, f.weight[difficulty]]));
    const seed = 1 + Math.floor(rng() * 2147483646);
    const ch = generate(mode, difficulty, seed, { family: fam.id });
    if (!ch) continue;
    if (history.isExactRepeat(ch)) continue;
    if (history.isStructRepeat(ch) && t < tries - 20) continue;
    history.add(ch);
    return ch;
  }
  // last resort: accept any valid challenge
  const seed = 1 + Math.floor(rng() * 2147483646);
  const ch = generate(mode, difficulty, seed);
  if (ch) history.add(ch);
  return ch;
}

/* ---- Teacher Tools / QTI-ready export (no Canvas export is implemented here) ---- */
export function exportQuestion(ch) {
  return {
    schema: "search-sort-lab.question/1",
    id: ch.id, game: GAME_ID, mode: ch.mode, difficulty: ch.difficulty, algorithm: ch.algorithm,
    skill: ch.skill, family: ch.family, seed: ch.seed,
    stem: ch.stem, countingRule: ch.rule || "", code: ch.code, codeKind: ch.codeKind,
    arrays: ch.visuals.filter((v) => v.type === "array").map((v) => ({ label: v.label, values: v.values })),
    choices: ch.choices.map((c, i) => ({ text: c.text, correct: i === ch.answerIndex })),
    correctIndex: ch.answerIndex,
    explanation: ch.explanation.join(" "),
    regenerate: { mode: ch.mode, difficulty: ch.difficulty, seed: ch.seed, family: ch.family },
  };
}
/* Grade a student's choice index against a challenge (UI-independent). */
export const assess = (ch, choiceIndex) => Number.isInteger(choiceIndex) && choiceIndex === ch.answerIndex;
