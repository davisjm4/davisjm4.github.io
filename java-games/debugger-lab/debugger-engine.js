import {
  generateProceduralDebugger,
  challengeFamilies,
  formatNames,
  categoryNames,
} from "./procedural-generator.js?v=debugger-generator-v2";

export { challengeFamilies, formatNames, categoryNames };
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
export const DIFFICULTY_NAMES = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

let seedState = 0x5a17;
function nextSeed() {
  seedState = (Math.imul(seedState, 1664525) + 1013904223) >>> 0;
  return seedState;
}

/** Backward-compatible generator signature plus structured options. */
export function generateDebugger(mode = "mixed", familyOrOptions) {
  const options = typeof familyOrOptions === "object" && familyOrOptions !== null
    ? familyOrOptions
    : { family: familyOrOptions };
  return generateProceduralDebugger({
    mode,
    difficulty: options.difficulty || "beginner",
    seed: options.seed ?? nextSeed(),
    family: options.family || options.variant || null,
  });
}

export function createDebuggerSession({ seed = Date.now() >>> 0, historyLimit = 200 } = {}) {
  let state = (Number(seed) >>> 0) || 0x7f4a7c15;
  const history = new Map();
  const nextSeed = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  const structure = (q) => q.code
    .replace(/-?\d+(?:\.\d+)?/g, "#")
    .replace(/"[^"]*"/g, '"S"')
    .replace(/\b(?:total|sum|count|value|index|values|numbers|items|score|result|text|name|message|command|points|step|partial|running|subtotal|i|j)\b/g, "V")
    .replace(/\s+/g, " ")
    .trim();
  return {
    next({ mode = "mixed", difficulty = "beginner", family = null } = {}) {
      const key = `${mode}/${difficulty}`;
      const recent = history.get(key) || [];
      const exact = new Set(recent.map((item) => item.exact));
      const shapes = new Map(recent.map((item) => [item.shape, item.age]));
      let question;
      let attempts = 0;
      do {
        question = generateProceduralDebugger({
          mode, difficulty, family, seed: nextSeed(),
        });
        attempts++;
      } while (
        attempts < 80 &&
        (exact.has(questionKey(question)) ||
          (shapes.has(structure(question)) && shapes.get(structure(question)) < 3))
      );
      for (const item of recent) item.age++;
      recent.unshift({
        exact: questionKey(question),
        shape: structure(question),
        age: 0,
      });
      history.set(key, recent.slice(0, historyLimit));
      question.repeatAvoidanceAttempts = attempts - 1;
      return question;
    },
  };
}

function questionKey(q) {
  return `${q.format}|${q.difficulty}|${q.prompt}|${q.code}|${(q.choices || []).join("|")}|${q.correctLine || ""}`;
}

export function assessDebugger(question, response) {
  return question.kind === "line"
    ? String(response.line) === String(question.correctLine)
    : String(response.answer) === String(question.answer);
}

export function solutionDebugger(question) {
  return question.kind === "line"
    ? { line: question.correctLine, answer: question.correctAnswer }
    : { answer: question.answer };
}

export function exportDebuggerQuestion(question) {
  return JSON.parse(JSON.stringify(question));
}
