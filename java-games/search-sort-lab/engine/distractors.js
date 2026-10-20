/* Misconception-based distractor assembly.
   Candidates are {value, why} produced from SIMULATED wrong procedures by each
   family, never by adding random numbers to the answer. If fewer than 3 distinct
   candidates survive, `fallbacks` are used and tagged source:"fallback" so the
   quality tests can measure how often that happens. */
import { shuffle } from "./rng.js";

export const keyOf = (v) => JSON.stringify(v);
export function textOf(kind, v) {
  if (kind === "array") return "{" + v.join(", ") + "}";
  if (kind === "trace") return v.map((a, i) => `Pass ${i + 1}: {${a.join(", ")}}`).join("\n");
  if (kind === "lines") return v.join("\n");
  return String(v);
}

/* Build exactly `count` choices (default 4). Returns null if impossible. */
export function buildChoices(r, kind, correct, candidates, fallbacks = [], count = 4) {
  const seen = new Set([keyOf(correct)]);
  const out = [];
  const take = (list, source) => {
    for (const c of list) {
      if (c == null || c.value === undefined || c.value === null) continue;
      const k = keyOf(c.value);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ kind, value: c.value, why: c.why, tag: c.tag || null, source });
    }
  };
  // keep misconception candidates in a random order so the same one is not always shown
  take(shuffle(r, candidates), "misconception");
  let misc = out.slice();
  if (out.length > count - 1) out.length = count - 1; // trim extra misconceptions
  if (out.length < count - 1) take(shuffle(r, fallbacks), "fallback");
  if (out.length < count - 1) return null;
  const choices = [{ kind, value: correct, why: "", tag: "correct", source: "correct" }, ...out.slice(0, count - 1)];
  const order = shuffle(r, choices);
  const answerIndex = order.findIndex((c) => c.source === "correct");
  for (const c of order) c.text = textOf(kind, c.value);
  return { choices: order, answerIndex };
}

/* ---- shared misconception generators on arrays ---- */
export const swapAdjacentAt = (a, i) => {
  const b = a.slice();
  if (i + 1 < b.length) [b[i], b[i + 1]] = [b[i + 1], b[i]];
  return b;
};
export const arrEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
