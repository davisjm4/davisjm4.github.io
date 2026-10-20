/* Shared challenge-assembly helpers. */
import { buildChoices } from "./distractors.js";

export const arrViz = (values, { roles = {}, label = "", note = "", indices = true, groups = null } = {}) => ({ type: "array", values: values.slice(), roles, label, note, indices, groups });
export const treeViz = (rows, label = "") => ({ type: "tree", rows, label });
export const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const plural = (n, w, pl = w + "s") => `${n} ${n === 1 ? w : pl}`;
export const range = (a, b) => (a > b ? [] : Array.from({ length: b - a + 1 }, (_, i) => a + i));

/* Assemble a finished challenge from a family's pieces. Returns null if choices fail. */
export function assemble(r, p) {
  const built = buildChoices(r, p.answerKind, p.correct, p.candidates || [], p.fallbacks || [], p.count || 4);
  if (!built) return null;
  return {
    schema: "search-sort-lab/1",
    algorithm: p.algorithm,
    skill: p.skill,
    family: p.family,
    variant: p.variant || "",
    stem: p.stem,
    rule: p.rule || "",
    code: p.code || "",
    codeKind: p.codeKind || "statements",
    codeLabel: p.codeLabel || "",
    visuals: p.visuals || [],
    description: p.description || "",
    answerKind: p.answerKind,
    correctValue: p.correct,
    choices: built.choices,
    answerIndex: built.answerIndex,
    explanation: p.explanation,
    trace: p.trace || [],
    reveal: p.reveal || [],
    spec: p.spec,
    meta: p.meta,
  };
}
