// Math Lab expansion: challenge assembly, validation and practice sessions.
// Pure and DOM-free: the same {mode, difficulty, seed, family} always yields an
// identical challenge object, so Teacher Tools can reuse these generators.
import { Rng, seedOf } from "./rng.js";
import * as P from "./java-program.js";
import * as H from "./gen-helpers.js";
import { METHODS_FAMILIES } from "./families-methods.js";
import { LIMITS_FAMILIES } from "./families-limits.js";

export const EXPANSION_MODES = {
  "math-methods": "Math Methods & Random Ranges",
  "numeric-limits": "Numeric Limits, Overflow & Round-off",
};
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
export const DIFFICULTY_TITLES = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export const FAMILIES = [...METHODS_FAMILIES, ...LIMITS_FAMILIES];
const byId = new Map(FAMILIES.map(f => [f.id, f]));
export const familyById = id => byId.get(id);
export const familiesFor = (mode, difficulty) => FAMILIES.filter(f => f.mode === mode && (f.weights[difficulty] || 0) > 0);

// Choice finalisation --------------------------------------------------------
const isNumber = t => /^-?\d+(\.\d+)?(E-?\d+)?$/.test(t);
const hasPoint = t => isNumber(t) && /[.E]/.test(t);

function pickDistractors(draft, rng) {
  const correctFor = draft.optionCheck || (t => t === draft.answer);
  const seen = new Set([draft.answer]);
  const pool = [];
  for (const c of draft.candidates) {
    if (!c || typeof c.text !== "string" || !c.text.trim() || seen.has(c.text)) continue;
    if (correctFor(c.text)) continue;               // never offer a second correct answer
    seen.add(c.text); pool.push(c);
  }
  const shuffled = rng.shuffle(pool), picked = [], miscs = new Set();
  for (const c of shuffled) if (picked.length < 3 && !miscs.has(c.misc)) { picked.push(c); miscs.add(c.misc); }
  for (const c of shuffled) if (picked.length < 3 && !picked.includes(c)) picked.push(c);
  if (picked.length < 3) return null;
  // Avoid "the only decimal" or "the only whole number" giveaways for numeric keys.
  if (isNumber(draft.answer)) {
    const same = c => hasPoint(c.text) === hasPoint(draft.answer);
    if (!picked.some(same)) {
      const swap = shuffled.find(c => !picked.includes(c) && same(c));
      if (swap) picked[2] = swap;
    }
  }
  return picked;
}

function normalise(text, names) {
  let out = text;
  names.forEach((name, i) => { out = out.replace(new RegExp(`\\b${name}\\b`, "g"), `v${i}`); });
  return out.replace(/-?\d+(\.\d+)?(E-?\d+)?L?/g, "#");
}
function declaredNames(program) {
  const names = [];
  if (program) P.walkStmts(program, s => { if (s.k === "decl" && !names.includes(s.name)) names.push(s.name); });
  return names.sort((a, b) => b.length - a.length);
}

function assemble(family, draft, difficulty, seed, rng) {
  const picked = pickDistractors(draft, rng);
  if (!picked) return null;
  const order = rng.shuffle([{ text: draft.answer, correct: true, misc: null }, ...picked.map(c => ({ text: c.text, correct: false, misc: c.misc || null }))]);
  const code = draft.program ? P.renderCode(draft.program) : (draft.code || "");
  const names = declaredNames(draft.program);
  const choices = order.map(o => o.text);
  const challenge = {
    id: `${family.id}:${difficulty}:${seed}`,
    game: "math-lab", kind: "expansion",
    mode: family.mode, modeTitle: EXPANSION_MODES[family.mode], topic: family.mode,
    difficulty, family: family.id, familyLabel: family.label, skill: family.skill,
    seed, shape: draft.shape,
    prompt: draft.prompt, code, choices, answer: draft.answer, correctIndex: choices.indexOf(draft.answer),
    choiceDetails: order.map(o => ({ text: o.text, correct: o.correct, misconception: o.misc, why: o.misc ? H.misconceptionText(o.misc) : null })),
    explanation: draft.explanationFor ? draft.explanationFor(choices) : draft.explanation,
    questionType: draft.kind,
    metrics: { ...(draft.program ? P.metrics(draft.program) : { statements: 0, operations: 0, methodCalls: 0, casts: 0, branches: 0, loops: 0, variables: 0 }), codeLines: code ? code.split("\n").length : 0 },
    signature: {
      exact: [family.id, draft.prompt, code, [...choices].sort().join("|")].join("§"),
      structure: [family.id, draft.shape, normalise(code, names), normalise(draft.prompt, names)].join("§"),
    },
    program: draft.program || null,
    verify: draft.verify || [],
    meta: { ...(draft.meta || {}), optionSets: draft.optionSets || undefined },
  };
  return validate(challenge, draft) ? challenge : null;
}

/** Independent re-check of a finished challenge (also used by tests). */
export function validate(q, draft = null) {
  if (!q || q.choices.length !== 4 || new Set(q.choices).size !== 4) return false;
  if (q.choices.filter(c => c === q.answer).length !== 1) return false;
  if (q.choiceDetails.filter(c => c.correct).length !== 1 || q.choiceDetails[q.correctIndex].text !== q.answer) return false;
  if (/undefined|null|NaN NaN|\[object/.test(q.prompt + q.code + q.choices.join() + q.explanation.replace(/NaN/g, ""))) return false;
  if (q.questionType === "output") {
    // Re-run the shown program: the key must be its actual outcome.
    if (P.outcomeText(P.run(q.program)) !== q.answer) return false;
  } else if (draft?.optionCheck) {
    const flags = q.choices.map(c => draft.optionCheck(c));
    if (flags.filter(Boolean).length !== 1 || !flags[q.correctIndex]) return false;
  }
  if (q.program) {
    const expectsCompileError = q.verify.some(v => v.type === "program" && v.program === q.program && v.expect.compileError);
    if (!expectsCompileError && !P.compiles(q.program)) return false;
  }
  return true;
}

// Public generation API --------------------------------------------------------
export function generateChallenge({ mode, difficulty, seed = 1, family = null }) {
  if (!DIFFICULTIES.includes(difficulty)) throw new Error(`Unknown difficulty ${difficulty}`);
  const fam = family ? familyById(family) : null;
  if (family && !fam) throw new Error(`Unknown family ${family}`);
  const m = fam ? fam.mode : mode;
  if (!EXPANSION_MODES[m]) throw new Error(`Unknown mode ${m}`);
  const rng = new Rng(`${m}|${difficulty}|${seedOf(seed)}|${family || ""}`);
  const options = familiesFor(m, difficulty);
  const chosen = fam || rng.weighted(options.map(f => [f, f.weights[difficulty]]));
  if (!(chosen.weights[difficulty] > 0)) throw new Error(`${chosen.id} has no ${difficulty} challenges`);
  for (let attempt = 0; attempt < 80; attempt++) {
    const r = rng.fork(`attempt-${attempt}`);
    const draft = chosen.build(r, difficulty);
    if (!draft) continue;
    const q = assemble(chosen, draft, difficulty, seed, r);
    if (q) return q;
  }
  throw new Error(`Cannot generate ${chosen.id}/${difficulty}/${seed}`);
}

/**
 * Endless practice with a bounded in-memory history.
 *  - exact repeats are rejected against the last `historySize` challenges;
 *  - structural repeats (same family, shape and normalised code) are rejected
 *    against the last `structureWindow` challenges;
 *  - the same reasoning family is never served twice in a row when another exists.
 * No accounts or storage: history lives only as long as the deck object.
 */
export function createExpansionDeck({ seed = Date.now(), historySize = 400, structureWindow = 12 } = {}) {
  const rng = new Rng(`deck|${seedOf(seed)}`);
  const exact = [], exactSet = new Set(), structures = [], bags = new Map();
  let lastFamily = null;
  function nextFamily(mode, difficulty) {
    const key = mode + "|" + difficulty;
    const options = familiesFor(mode, difficulty);
    const refill = () => {
      const bag = [];
      for (const f of options) for (let i = 0; i < f.weights[difficulty]; i++) bag.push(f.id);
      return rng.shuffle(bag);
    };
    if (!bags.get(key)?.length) bags.set(key, refill());
    let bag = bags.get(key);
    let index = bag.findIndex(id => id !== lastFamily);
    // Only the previous family is left in this cycle: start the next cycle early.
    if (index < 0) { bag.push(...refill()); index = bag.findIndex(id => id !== lastFamily); }
    return bag.splice(index, 1)[0];
  }
  return {
    next(mode, difficulty = "beginner") {
      if (!EXPANSION_MODES[mode]) throw new Error("Unknown expansion mode " + mode);
      const family = nextFamily(mode, difficulty);
      let q, fallback = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        q = generateChallenge({ mode, difficulty, family, seed: Math.floor(rng.next() * 2 ** 32) });
        if (exactSet.has(q.signature.exact)) continue;
        fallback = fallback || q;
        if (structures.includes(q.signature.structure)) continue;
        break;
      }
      if (exactSet.has(q.signature.exact) || structures.includes(q.signature.structure)) q = fallback || q;
      exact.push(q.signature.exact); exactSet.add(q.signature.exact);
      if (exact.length > historySize) exactSet.delete(exact.shift());
      structures.push(q.signature.structure);
      if (structures.length > structureWindow) structures.shift();
      lastFamily = q.family;
      return q;
    },
    get historyLength() { return exact.length; },
  };
}

export const assessExpansion = (q, choice) => q.choices.includes(choice) && choice === q.answer;
