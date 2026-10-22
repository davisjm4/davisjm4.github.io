import { renderJava, run, renderValue } from "./ir.js?v=compositional-v1";
export class Reject extends Error {}
export const reject = why => { throw new Reject(why); };
export const int = (lo, hi, r) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = (a, r) => a[Math.floor(r() * a.length)];
export function shuffle(a, r) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const LEVEL = { Beginner: 0, Intermediate: 1, Advanced: 2 };
export const NAMES = {
  int: ["count", "trace", "reduce", "visit", "walk", "step", "climb", "process", "tally", "follow"],
  ret: ["compute", "combine", "build", "total", "evaluate", "fold", "collect", "measure", "score", "accumulate"],
  str: ["shape", "mirror", "echo", "transform", "scan", "rebuild", "weave", "relay", "spell", "filter"],
  arr: ["scan", "sweep", "gather", "inspect", "survey", "probe", "tally", "check", "combine", "explore"],
};
export const WORDS = { Beginner: ["CAT", "MAP", "SUN", "DOG", "TREE", "CODE", "JAVA", "BIRD", "LAMP", "FROG", "STAR", "MOON"],
  Intermediate: ["PLANT", "ROBOT", "APPLE", "STACK", "RIVER", "TIGER", "PIANO", "CLOUD", "LEMON", "MANGO", "BANANA", "LETTER", "PEPPER", "COFFEE"],
  Advanced: ["RECURSE", "BALLOON", "TOMATO", "MISSISSIPPI", "BOOKKEEPER", "COMMITTEE", "PARALLEL", "BANANAS", "CABBAGE", "ACADEMIC"] };
export const fmtList = xs => xs.join(", ");
export const quote = s => JSON.stringify(s);
/** Run and reject unless it terminates normally. */
export function exec(prog, entry, args, opts) { const res = run(prog, entry, args, opts); if (res.error) reject(`execution error ${res.error}`); return res; }
/** Callable description shown to students (e.g. walk(13) or scan(a, 0)). */
export const callText = (entry, args, names) => `${entry}(${args.map((a, i) => names?.[i] ?? renderValue(a)).join(", ")})`;

/**
 * Assemble a question. distractors: [{ value, mis, why }] — each from a named misconception.
 * Throws Reject if fewer than 3 distinct distractors different from the answer remain.
 */
export function makeQuestion(o) {
  const answer = String(o.answer), seen = new Set([answer]), picked = [];
  for (const d of o.distractors) { const v = String(d.value); if (d.value === undefined || d.value === null || v === "" && answer !== "" || v === "NaN" || seen.has(v)) continue; seen.add(v); picked.push({ ...d, value: v }); if (picked.length === 3) break; }
  if (picked.length < 3) reject(`only ${picked.length} distinct misconception distractors`);
  if (o.validate && !o.validate(answer)) reject("answer failed validation");
  const choices = shuffle([answer, ...picked.map(p => p.value)], o.r);
  const code = o.code ?? renderJava(o.prog) + (o.callNote ? `\n// ${o.callNote}` : "");
  const feedback = Object.fromEntries(picked.map(p => [p.value, p.why]));
  return {
    game: "recursion-lab", title: "Recursion Lab", mode: o.mode, topic: o.mode, topicTitle: o.modeTitle, difficulty: o.difficulty,
    skill: `${o.mode}.${o.family}`, family: o.family, reasoning: o.reasoning, task: o.task || "trace", generator: "compositional-v1",
    code, prompt: o.prompt, answer, correctAnswer: answer, choices, explanation: o.explanation, choiceFeedback: feedback, choiceMisconception: Object.fromEntries(picked.map(p => [p.value, p.mis])),
    misconceptions: picked.map(p => p.mis), diverges: !!o.diverges, trace: (o.trace || []).slice(0, 16), callDepth: o.callDepth ?? 0, callCount: o.callCount ?? 0,
    data: { ...(o.data || {}), jvm: o.jvm, seed: undefined },
    signature: `${o.mode}|${o.difficulty}|${o.family}|${code}|${o.prompt}|${answer}|${choices.join("~")}`,
  };
}
/** Readable call/return trace from an interpreter result. */
export function traceLines(res, { max = 14, showReturns = true } = {}) {
  const lines = [];
  for (const e of res.log) { lines.push(`${"  ".repeat(Math.min(e.depth - 1, 8))}call ${e.name}(${e.args.map(a => a === "arr" ? "a" : renderValue(a)).join(", ")})${showReturns && e.ret !== undefined ? ` → returns ${renderValue(e.ret)}` : ""}`); }
  if (lines.length > max) return [...lines.slice(0, max - 2), `… ${lines.length - max + 1} more calls …`, lines.at(-1)];
  return lines;
}
/** Trace that also works for runs ending in an exception (shows the first calls, then the error). */
export function traceWithError(res, opts = {}) {
  if (!res.error) return traceLines(res, opts);
  const head = traceLines({ ...res, log: res.log.slice(0, 7).map(e => ({ ...e, ret: undefined })) }, { ...opts, max: 99 });
  return [...head, res.error === "StackOverflowError" ? "… the calls never reach a base case → StackOverflowError" : `… ${res.error}`];
}
