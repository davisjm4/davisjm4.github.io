/*
 * Seeded, structured recursion challenge generator. Answers and traces are
 * computed by bounded simulators; displayed Java is emitted from the same
 * challenge parameters (we never execute arbitrary source in the browser).
 */
import { entriesFor, composeQuestion } from "./compose/index.js?v=compositional-v1";
export const modeNames = {
  base: "Base Cases & Calls",
  returns: "Return Values",
  output: "Output & Strings",
  arrays: "Arrays & Parameters",
  debug: "Recursive Debugging",
  searchsort: "Recursive Search & Sort",
};
const modes = Object.keys(modeNames);
export const difficulties = ["Beginner", "Intermediate", "Advanced"];
export const seededRandom = (seed = 1) => {
  let s = Number(seed) >>> 0;
  return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
};
const pick = (a, r) => a[Math.floor(r() * a.length)];
const int = (lo, hi, r) => lo + Math.floor(r() * (hi - lo + 1));
export function shuffle(values, r = Math.random) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const cfg = { Beginner: { n: 3, depth: 4, calls: 18 }, Intermediate: { n: 6, depth: 8, calls: 90 }, Advanced: { n: 9, depth: 12, calls: 450 } };
const fmt = v => typeof v === "string" && !/^-?\d+(\.\d+)?$/.test(v) && v !== "true" && v !== "false" ? `"${v}"` : String(v);
function choicesFor(answer, wrong, r) {
  const list = [];
  for (const x of [String(answer), ...wrong.map(String)]) if (!list.includes(x)) list.push(x);
  for (const x of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "-1", "true", "false", '""', '"0"', '"1"']) if (list.length < 4 && !list.includes(x) && x !== String(answer)) list.push(x);
  return shuffle(list.slice(0, 4), r);
}
function make({ mode, difficulty, family, code, prompt, answer, wrong, explanation, trace = [], task = "trace", r, data = {} }) {
  const choices = choicesFor(answer, wrong, r);
  if (choices.length !== 4 || choices.filter(x => x === String(answer)).length !== 1) throw Error(`Invalid choices for ${family}`);
  const q = { game: "recursion-lab", title: "Recursion Lab", mode, topic: mode, topicTitle: modeNames[mode], difficulty, skill: `${mode}.${family}`, family, seed: data.seed, data: { ...data }, task, code, prompt, answer: String(answer), correctAnswer: String(answer), choices, explanation, trace, callDepth: data.callDepth || 0, callCount: data.callCount || 0, signature: `${mode}|${difficulty}|${family}|${code}|${prompt}|${answer}|${choices.join("~")}` };
  return q;
}
const words = ["SUN", "MAP", "CAT", "CODE", "JAVA", "PLANT", "LEVEL", "ROBOT", "NOON", "ARRAY", "MATH", "STACK", "COMPUTER", "RECURSION", "CHALLENGE", "EDUCATION"];
const methodNames = ["walk", "visit", "trace", "process", "reduceValue", "stepThrough", "recurse", "solve", "inspect", "buildResult", "follow", "compute"];
function genBase(d, r) {
  const c = cfg[d], n = int(2, c.n + 2, r), kind = int(0, 7, r);
  let step = int(1, d === "Advanced" ? 3 : 2, r);
  const method = pick(methodNames, r);
  const threshold = kind % 3 === 0 ? 0 : 1;
  if (kind % 4 === 2) step = 1;
  const condition = kind % 4 === 0 ? `n <= ${threshold}` : kind % 4 === 1 ? `n < ${threshold + 1}` : kind % 4 === 2 ? `n == ${threshold}` : `n <= ${threshold}`;
  const delta = -step, start = kind % 2 ? n + threshold + 1 : n;
  const callArg = kind % 3 === 2 ? `n - ${step}` : `n - ${step}`;
  let count = 0, x = start, trace = [];
  while (count++ < c.depth + 2 && !(kind % 2 ? x <= threshold : x <= threshold)) { trace.push(`${method}(${x})`); x += delta; }
  trace.push(`${method}(${x}) → base case`);
  const ask = kind % 4;
  const answer = ask === 0 ? condition : ask === 1 ? trace.length : ask === 2 ? x : `n - ${step}`;
  const prompt = ["Which condition stops the recursive calls?", `How many method calls occur for ${method}(${start})?`, `At what value of n does the base case run?`, "Which argument expression matches the recursive call shown?"][ask];
  const wrong = ask === 0 ? [`n < ${threshold}`, `n == ${threshold + 1}`, `n > ${threshold + 1}`] : ask === 1 ? [trace.length - 1, trace.length + 1, trace.length + 2] : ask === 2 ? [x - delta, x + delta, threshold] : [`n + ${step}`, "n", `n - 1`];
  const code = `public static void ${method}(int n) {\n    if (${condition}) {\n        return;\n    }\n    ${method}(${callArg});\n}\n// call: ${method}(${start})`;
  return make({ mode: "base", difficulty: d, family: ["base-threshold", "step-size", "call-count", "terminal-argument", "nonzero-base", "method-variant", "call-chain", "condition-form"][kind], code, prompt, answer, wrong, explanation: ask === 1 ? `The calls visit ${trace.slice(0, -1).join(" → ")} and then the base case: ${count} calls total.` : ask === 2 ? `Each call reduces n by ${step}; the first value satisfying ${condition} is ${x}.` : ask === 0 ? `The condition is checked before the recursive call. At ${x}, it returns without another call.` : `Subtracting ${step} moves n toward the stopping range.`, trace, r, data: { seed: dataSeed(r), callDepth: count - 1, callCount: count } });
}
// A small deterministic draw is retained as metadata only; the generator's
// externally supplied seed is attached by createRecursionGenerator.
const dataSeed = () => undefined;

function genReturns(d, r) {
  const c = cfg[d], k = int(1, d === "Advanced" ? 7 : 4, r), n = int(2, c.n + 2, r), a = int(1, 4, r), b = int(-2, 5, r), type = int(0, 7, r);
  const name = pick(methodNames, r);
  if (type === 7 && d !== "Beginner") {
    const value = Math.min(n, d === "Intermediate" ? 7 : 8), calls = [], returns = [];
    const fib = x => {
      if (calls.length >= 500) throw Error("Branching recursion safety limit exceeded");
      calls.push(`fibLike(${x})`);
      if (x <= 1) { returns.push(`fibLike(${x}) → 1`); return 1; }
      const left = fib(x - 1), right = fib(x - 2), result = left + right;
      returns.push(`fibLike(${x}) returns ${left} + ${right} = ${result}`);
      return result;
    };
    const answer = fib(value), asks = ["value", "calls", "depth"], ask = pick(asks, r);
    const response = ask === "value" ? answer : ask === "calls" ? calls.length : value;
    const prompt = ask === "value" ? `What does fibLike(${value}) return?` : ask === "calls" ? `How many total calls, including base cases, are made by fibLike(${value})?` : `What is the maximum call depth for fibLike(${value}), counting the first call as depth 1?`;
    const code = `public static int fibLike(int n) {\n    if (n <= 1) return 1;\n    return fibLike(n - 1) + fibLike(n - 2);\n}\n// call: fibLike(${value})`;
    return make({ mode: "returns", difficulty: d, family: "two-branch-recursion", code, prompt, answer: response, wrong: ask === "value" ? [answer - 1, answer + 1, answer * 2] : ask === "calls" ? [calls.length - 2, calls.length - 1, calls.length + 1] : [value - 1, value + 1, value + 2], explanation: `The first branch fibLike(${value-1}) is evaluated before fibLike(${val