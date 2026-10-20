/* Boolean & Conditional Lab engine (generator rebuild, schema v2).
 * Public API is unchanged: booleanGame, generate, assess, makeRng, signature,
 * enumerateTruthTable, evaluateBooleanExpression, validateBooleanExpression.
 * New: createPracticeSession (bounded in-memory repeat avoidance). */
import { makeRng, pick } from "./generators/core.js";
import * as B from "./generators/bool.js";
import { generateTruthTable } from "./generators/truth-table.js";
import { generateSwitch } from "./generators/switch-if.js";
import { generateCoverage } from "./generators/coverage.js";
import { evaluateFamily, branchFamily, conditionsFamily, equivalentFamily, shortFamily, identifyFamily, constructFamily } from "./generators/legacy.js";

export { makeRng };
export const booleanGame = {
  name: "Boolean & Conditional Lab",
  icon: "&&",
  description: "Evaluate Boolean logic, follow branches, and choose conditions that match Java requirements.",
  concepts: "Boolean logic · Conditions · Branches · Precedence · Short-circuiting",
  modes: {
    evaluate: "Evaluate Expressions",
    branch: "Follow the Branch",
    conditions: "Build Conditions",
    equivalent: "Equivalent Expressions",
    short: "Short-Circuit & Strings",
    identify: "Identify Conditions",
    construct: "Construct a Condition",
    truthTable: "Truth Table Builder",
    switchIf: "Switch vs. If/Else",
    coverage: "Conditional Coverage & Branch Reasoning",
  },
};
export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const GEN = { evaluate: evaluateFamily, branch: branchFamily, conditions: conditionsFamily, equivalent: equivalentFamily, short: shortFamily, identify: identifyFamily, construct: constructFamily, truthTable: generateTruthTable, switchIf: generateSwitch, coverage: generateCoverage };

export function generate(mode = "mixed", rng = Math.random, difficulty = "Intermediate") {
  if (!DIFFICULTIES.includes(difficulty)) difficulty = "Intermediate";
  const actual = mode === "mixed" ? pick(Object.keys(booleanGame.modes), rng) : mode;
  if (!GEN[actual]) throw new Error(`Unknown mode ${actual}`);
  const q = GEN[actual](rng, difficulty);
  q.mode = actual; q.topic = actual; q.modeTitle = booleanGame.modes[actual];
  q.difficulty = difficulty; q.seed = Number.isInteger(rng.seed) ? rng.seed : null;
  q.variant = q.variant || q.family; q.skill = q.skill || q.family;
  q.questionStem = q.question; q.javaCode = q.javaCode || q.code;
  q.answerOptions = q.choices || q.tokens?.map(t => t.text);
  q.correctAnswer = q.answerText ?? q.tokens?.[q.answer]?.text;
  return q;
}
export function assess(q, response) { return Number(response) === q.answer; }

/** Student-visible identity: prompt, code, table, option set and answer. Internal
 * labels, seeds and option order are deliberately excluded. */
export function signature(q) {
  const table = q.table ? q.table.map(r => Object.entries(r).map(([k, v]) => `${k}=${v === null ? "?" : v}`).join(",")).join(";") : "";
  const opts = q.kind === "select" ? q.tokens.map(t => t.text) : q.choices;
  return JSON.stringify([q.mode, q.question, q.code, table, [...opts].sort(), q.answerText ?? opts[q.answer]]);
}

/** Bounded in-memory history (default 120 challenges). Repeat avoidance is a
 * safeguard only; generator breadth is what prevents repetition. */
export function createPracticeSession({ historySize = 120, maxTries = 60, seedSource = () => Math.floor(Math.random() * 0x7fffffff) + 1 } = {}) {
  const recent = []; const set = new Set();
  return {
    next(mode, difficulty) {
      let q;
      for (let i = 0; i < maxTries; i++) { q = generate(mode, makeRng(seedSource()), difficulty); if (!set.has(signature(q))) break; }
      const s = signature(q); recent.push(s); set.add(s);
      while (recent.length > historySize) set.delete(recent.shift());
      return q;
    },
    get size() { return recent.length; },
  };
}

// ---------- string-based Boolean utilities (kept for compatibility) ----------
export function evaluateBooleanExpression(source, env) { return B.evaluate(B.parse(source), env); }
export function enumerateTruthTable(source) { const n = B.parse(source), vars = B.varsOf(n); return B.rows(vars).map(e => ({ ...e, result: B.evaluate(n, e) })); }
const SLACK = { Beginner: 0, Intermediate: 1, Advanced: 2 };
export function validateBooleanExpression(source, difficulty = "Intermediate", options = {}) {
  try {
    const n = B.parse(source), vars = B.varsOf(n);
    const q = B.quality(n, { slack: SLACK[difficulty] ?? 1, all: true, ...options });
    const m = B.metrics(n, vars);
    return { valid: q.valid, reasons: q.reasons, vars, essentialVariables: B.essential(n, vars), rows: enumerateTruthTable(source), operators: { and: m.and, or: m.or, not: m.not }, depth: m.depth, metrics: m };
  } catch (error) { return { valid: false, reasons: [error.message], vars: [], essentialVariables: [], rows: [], operators: { and: 0, or: 0, not: 0 }, depth: 0, metrics: null }; }
}
