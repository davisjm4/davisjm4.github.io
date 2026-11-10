/*
 * Loop Lab engine — public, DOM-independent generator API.
 * Legacy exports (familyNames, challengeFamilies, generateLoop, assessLoop) are kept
 * so the original page and tests keep working; generateChallenge / createLoopSession
 * add seeds, difficulty, recent-question avoidance, and structured metadata.
 */
import { makeRng, hashString } from "./engine/rng.js?v=loop-expansion-v2";
import { buildChallenge, GenReject, structuralSignature, MISCONCEPTIONS } from "./engine/questions.js?v=package-c-v1";
// Existing family helpers still import the previous URL; both modules can
// throw their own GenReject class when a generated candidate is discarded.
import { GenReject as PreviousGenReject } from "./engine/questions.js?v=loop-expansion-v2";
import { originalFamilies, allowed } from "./engine/families-original.js?v=package-c-v1";
import { algorithmFamilies } from "./engine/families-algorithms.js?v=loop-expansion-v2";
import { executionFamilies } from "./engine/families-executions.js?v=loop-expansion-v2";
import { LEVELS } from "./engine/fam-util.js?v=loop-expansion-v2";
import { printProgram } from "./engine/java-model.js?v=loop-expansion-v2";

import { loopTypeFamilies, LOOP_TYPES } from "./engine/families-loop-types.js";

export const ENGINE_VERSION = "loop-types-v1";
export const DIFFICULTIES = LEVELS;
export const DIFFICULTY_NAMES = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

/* Original eight modes: names unchanged. */
export const originalModeNames = {
  iterations: "Predict iteration count", final: "Predict the final value", choose: "Choose the correct loop", components: "Identify loop components",
  conditional: "Predict conditional behavior", while: "Trace a while loop", nested: "Nested-loop reasoning", debug: "Debug a loop",
};
export const newModeNames = { algorithms: "Standard Iteration Algorithms", executions: "Count the Executions" };
export const loopTypeModeNames = { looptype: "Choose the Loop Type" };
export const familyNames = { ...originalModeNames, ...newModeNames, ...loopTypeModeNames };
export const MODES = Object.keys(familyNames);

const VARIANT_NAMES = Object.fromEntries([...algorithmFamilies, ...executionFamilies, ...loopTypeFamilies].map((f) => [f.id, f.name]));
const newModeFamilies = { algorithms: algorithmFamilies, executions: executionFamilies, looptype: loopTypeFamilies };
export const challengeFamilies = Object.fromEntries(MODES.map((m) => [m, newModeFamilies[m] ? newModeFamilies[m].map((f) => f.id) : Object.keys(originalFamilies[m].variants)]));
export const reasoningFamilyNames = VARIANT_NAMES;
export { MISCONCEPTIONS };

function variantsFor(mode, difficulty) {
  if (newModeFamilies[mode]) return newModeFamilies[mode].filter((f) => !f.level || f.level === difficulty).map((f) => f.id);
  return allowed(originalFamilies[mode].variants, difficulty);
}
function variantLevels(mode, variant) {
  if (newModeFamilies[mode]) {
    const level = newModeFamilies[mode].find((f) => f.id === variant)?.level;
    return level ? [level] : LEVELS;
  }
  const lv = originalFamilies[mode].variants[variant]?.lv; return lv ? LEVELS.slice(lv[0], lv[1] + 1) : [];
}
function runFamily(mode, variant, difficulty, rng) {
  if (newModeFamilies[mode]) return newModeFamilies[mode].find((f) => f.id === variant).generate(rng, difficulty);
  return originalFamilies[mode].generate(rng, difficulty, variant);
}
const titleCase = (s) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Deterministic: same {mode, difficulty, seed, family} → same challenge. */
export function generateChallenge({ mode = "mixed", difficulty = "beginner", seed = 1, family = null } = {}) {
  if (!LEVELS.includes(difficulty)) throw new Error("unknown difficulty " + difficulty);
  seed = Number(seed) >>> 0;
  const pickRng = makeRng(hashString(`pick:${mode}:${difficulty}:${seed}`));
  let m = mode;
  if (m === "mixed") m = pickRng.pick(MODES);
  if (!familyNames[m]) throw new Error("unknown mode " + mode);
  const pool = variantsFor(m, difficulty);
  let variant = family && challengeFamilies[m].includes(family) ? family : pickRng.pick(pool);
  if (m === "looptype" && !pool.includes(variant)) throw new Error("Loop type family does not match the requested difficulty");
  let level = difficulty;
  if (!variantLevels(m, variant).includes(level)) level = variantLevels(m, variant)[0];
  let lastErr;
  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = makeRng(hashString(`gen:${m}:${variant}:${level}:${seed}:${attempt}`));
    try {
      const spec = runFamily(m, variant, level, rng);
      if (m === "looptype") {
        const family = loopTypeFamilies.find((f) => f.id === variant);
        return assemble(buildLoopType(spec, family, rng), { mode: m, requestedMode: mode, difficulty: level, requestedDifficulty: difficulty, seed, variant, attempt });
      }
      spec.rng = rng;
      const c = buildChallenge(spec);
      return assemble(c, { mode: m, requestedMode: mode, difficulty: level, requestedDifficulty: difficulty, seed, variant, attempt });
    } catch (err) {
      if (!(err instanceof GenReject) && !(err instanceof PreviousGenReject) && !/StepLimit|UnsafeDouble|^invalid challenge/.test(String(err.message))) throw err;
      lastErr = err;
    }
  }
  throw new Error(`generation failed for ${m}/${variant}/${level}/${seed}: ${lastErr?.message}`);
}

function buildLoopType(spec, family, rng) {
  const answer = LOOP_TYPES[family.best];
  return {
    code: "", scenario: spec.scenario, prompt: "Which loop best fits the requested design?",
    answer, correctAnswer: answer, choices: rng.shuffle(Object.values(LOOP_TYPES)),
    distractors: Object.entries(family.alternatives).map(([type, note]) => ({
      choice: LOOP_TYPES[type], misconception: `loop-type-${type}`, note,
    })),
    explanation: spec.why, principle: family.principle, example: { code: spec.example, output: spec.output },
    concept: family.name, template: family.id, params: {}, choiceFormat: "value", targetKind: "loop-type",
  };
}

function assemble(c, { mode, requestedMode, difficulty, requestedDifficulty, seed, variant, attempt }) {
  const isNew = !!newModeFamilies[mode];
  const variantName = isNew ? VARIANT_NAMES[variant] : titleCase(variant);
  const q = {
    game: "loop-lab", title: "Loop Lab", engineVersion: ENGINE_VERSION,
    id: `${mode}:${difficulty}:${seed}`, mode, modeName: familyNames[mode], requestedMode,
    difficulty, difficultyName: DIFFICULTY_NAMES[difficulty], requestedDifficulty, seed, generationAttempt: attempt,
    family: mode, familyName: familyNames[mode], variant, variantName, reasoningFamily: isNew ? variant : `${mode}/${variant}`, template: c.template,
    topic: `${mode}.${variant}`, topicTitle: `${familyNames[mode]} · ${variantName}`,
    concept: c.concept, kind: "choice", code: c.code, prompt: c.prompt, choices: c.choices, choiceFormat: c.choiceFormat,
    answer: c.answer, correctAnswer: c.correctAnswer, distractors: c.distractors, explanation: c.explanation,
    trace: c.trace, studentTrace: c.studentTrace, output: c.output, metadata: c.metadata, params: c.params, targetKind: c.targetKind,
    expectsError: c.expectsError,
  };
  if (c.scenario) Object.assign(q, { scenario: c.scenario, principle: c.principle, example: c.example });
  Object.defineProperty(q, "javaProgram", { value: c.javaProgram || null, enumerable: false });
  Object.defineProperty(q, "buggyProgram", { value: c.buggyProgram || null, enumerable: false });
  const structure = c.javaProgram ? structuralSignature(printProgram(c.javaProgram).code, c.targetKind) : `loop-type:${variant}`;
  q.signature = {
    exact: hashString(`${q.scenario || q.code}|${q.prompt}|${[...q.choices].sort().join("|")}`).toString(36),
    structural: hashString(structure).toString(36),
  };
  validateChallenge(q);
  return q;
}

export function validateChallenge(q) {
  const fail = (m) => { throw new Error(`invalid challenge ${q.id}: ${m}`); };
  if (!Array.isArray(q.choices) || q.choices.length !== 4) fail("needs four choices");
  if (new Set(q.choices).size !== 4) fail("choices not unique");
  if (!q.choices.includes(q.answer)) fail("answer missing from choices");
  if (q.distractors.some((d) => d.choice === q.answer)) fail("distractor equals answer");
  if ((!q.code && !q.scenario) || !q.prompt || !q.explanation) fail("missing text");
  if (q.mode === "looptype") {
    const family = loopTypeFamilies.find((f) => f.id === q.variant);
    const alternatives = q.choices.filter((choice) => choice !== q.answer);
    if (q.targetKind !== "loop-type" || !family || family.level !== q.difficulty ||
        q.answer !== LOOP_TYPES[family.best] || q.correctAnswer !== q.answer ||
        !Object.values(LOOP_TYPES).every((label) => q.choices.includes(label)) ||
        q.distractors.length !== 3 || !alternatives.every((choice) => q.distractors.some((d) => d.choice === choice && d.note)) ||
        !q.scenario || q.code || !q.principle || !q.example?.code || !Array.isArray(q.example.output)) fail("invalid loop type decision");
  }
  if (q.choices.some((c) => typeof c !== "string" || !c.length)) fail("empty choice");
  if (q.code.includes("undefined") || q.prompt.includes("undefined") || (q.scenario || "").includes("undefined") || q.explanation.includes("undefined") || q.choices.some((c) => c.includes("undefined") || c.includes("NaN"))) fail("undefined text");
  return true;
}

export function assessLoop(question, response) {
  return String(response.answer) === String(question.answer);
}
export function distractorFor(question, answer) {
  return question.distractors?.find((d) => d.choice === answer) || null;
}

/* Legacy API: generateLoop(family = "mixed", forcedVariant = null). */
let legacySeed = null;
function nextLegacySeed() {
  if (legacySeed === null) { try { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); legacySeed = a[0]; } catch { legacySeed = Date.now() >>> 0; } }
  legacySeed = (Math.imul(legacySeed, 1664525) + 1013904223) >>> 0;
  return legacySeed;
}
export function generateLoop(family = "mixed", forcedVariant = null, options = {}) {
  const seed = options.seed ?? nextLegacySeed();
  let mode = family;
  if (mode === "mixed") mode = MODES[seed % MODES.length];
  const variant = forcedVariant && challengeFamilies[mode]?.includes(forcedVariant) ? forcedVariant : null;
  let difficulty = options.difficulty;
  if (!difficulty) { const lv = variant ? variantLevels(mode, variant) : LEVELS; difficulty = lv[(seed >>> 3) % lv.length]; }
  return generateChallenge({ mode, difficulty, seed, family: variant });
}

/**
 * Practice session with bounded in-memory history (no storage, no accounts).
 * - Exact repeats are avoided across the last `historySize` challenges.
 * - The same normalized structure is avoided within a window that adapts to how many
 *   structures this mode/difficulty has actually produced (a pool of 6 structures cannot
 *   support a 12-challenge gap), and structural avoidance stops after `structuralTries`
 *   attempts so a small pool never causes visible lag.
 */
export function createLoopSession({ seed = 1, historySize = 200, structuralWindow = 12, maxTries = 24, structuralTries = 16 } = {}) {
  const seedRng = makeRng(Number(seed) >>> 0);
  const exact = [], fams = [];
  const recent = new Map(); // key mode/difficulty -> recent structural signatures
  const seen = new Map();   // key -> Set of structures observed
  const remember = (list, x, n) => { list.push(x); while (list.length > n) list.shift(); };
  return {
    next({ mode = "mixed", difficulty = "beginner", family = null } = {}) {
      const key = `${mode}/${difficulty}/${family || "*"}`;
      if (!recent.has(key)) { recent.set(key, []); seen.set(key, new Set()); }
      const rec = recent.get(key), pool = seen.get(key);
      const window = Math.max(3, Math.min(structuralWindow, Math.floor(pool.size * 0.6)));
      let best = null, bestScore = -1;
      for (let t = 0; t < maxTries; t++) {
        const q = generateChallenge({ mode, difficulty, seed: seedRng.seed(), family });
        pool.add(q.signature.structural);
        const fresh = !exact.includes(q.signature.exact);
        const last = rec.lastIndexOf(q.signature.structural);
        const gap = last < 0 ? window + 1 : Math.min(window + 1, rec.length - last); // larger = seen longer ago
        const famOk = !!family || !fams.length || fams.at(-1) !== q.reasoningFamily;
        const score = (fresh ? 1000 : 0) + gap * 10 + (famOk ? 1 : 0);
        if (score > bestScore) { best = q; bestScore = score; }
        const ideal = 1000 + (window + 1) * 10;
        if (bestScore === ideal + 1 || (bestScore >= ideal && t >= structuralTries / 2) || (bestScore >= 1000 && t >= structuralTries)) break;
      }
      remember(exact, best.signature.exact, historySize); remember(rec, best.signature.structural, structuralWindow); remember(fams, best.reasoningFamily, 4);
      return best;
    },
    history: () => ({ exact: [...exact], structural: Object.fromEntries([...recent].map(([k, v]) => [k, [...v]])) }),
  };
}
