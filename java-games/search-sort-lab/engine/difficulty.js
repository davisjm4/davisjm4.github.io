/* Difficulty model. Difficulty is a property of the REASONING required, not the
   size of the numbers. Every challenge records:
     meta.reasoning  one of the labels below
     meta.steps      number of simulator steps a student must carry out/inspect
     meta.arrayLength, comparisons, passes, shifts, swaps, calls, states (optional)
   validateDifficulty() flags a challenge whose metadata does not fit its level. */
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
export const DIFFICULTY_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

const BEGINNER_ONLY = ["one-step", "recognize", "one-pass"];
const ALL = ["one-step", "recognize", "one-pass", "multi-step", "pass-state", "count", "recognize-code", "compare-run", "evidence", "full-trace", "debug", "defect", "compare-analysis", "implementation", "growth", "precondition", "misleading"];
export const REASONING_BY_LEVEL = {
  beginner: BEGINNER_ONLY,
  intermediate: ["multi-step", "pass-state", "count", "recognize-code", "compare-run", "evidence", "full-trace", "precondition"],
  advanced: ALL.filter((x) => !BEGINNER_ONLY.includes(x)),
};
/* Numeric guard rails (inclusive). minSteps counts the simulator steps a student must
   carry out or inspect (for debugging questions: trace steps plus code lines inspected), so a long array alone can never make a challenge Advanced. */
export const LIMITS = {
  beginner: { maxSteps: 7, maxLength: 16 },
  intermediate: { minSteps: 2, maxSteps: 60, minLength: 4, maxLength: 20 },
  advanced: { minSteps: 4, minLength: 6 },
};

export function validateDifficulty(ch) {
  const problems = [];
  const m = ch.meta || {};
  const d = ch.difficulty;
  if (!REASONING_BY_LEVEL[d]) return ["unknown difficulty " + d];
  if (!REASONING_BY_LEVEL[d].includes(m.reasoning)) problems.push(`reasoning "${m.reasoning}" not allowed at ${d}`);
  if (!Number.isInteger(m.steps) || m.steps < 0) problems.push("meta.steps missing");
  const L = LIMITS[d];
  if (L.maxSteps !== undefined && m.steps > L.maxSteps) problems.push(`steps ${m.steps} > ${L.maxSteps}`);
  if (L.minSteps !== undefined && m.steps < L.minSteps) problems.push(`steps ${m.steps} < ${L.minSteps}`);
  if (m.arrayLength > 0) {
    if (L.maxLength !== undefined && m.arrayLength > L.maxLength) problems.push(`array length ${m.arrayLength} > ${L.maxLength}`);
    if (L.minLength !== undefined && m.arrayLength < L.minLength) problems.push(`array length ${m.arrayLength} < ${L.minLength}`);
  }
  // Advanced may never be a one-step recall question just because the array is long.
  if (d === "advanced" && ["one-step", "recognize", "one-pass"].includes(m.reasoning)) problems.push("advanced challenge is one-step");
  return problems;
}
