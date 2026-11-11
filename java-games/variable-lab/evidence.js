// Practice-evidence metadata for Variable Lab. The shared profile client (wpr-games/workplace-readiness/online/profile-sync.mjs) reads
// details.practiceMode before details.format or details.mode, so the assessed skill is always explicit and never replaced by a display
// format such as "output" or "final". practiceMode values match curriculum selector modeIds: "trace", "assemble", "identify/<variant>".
// Beginner evidence is never relabelled: difficulty is copied from the question actually shown, and is absent for modes without tiers.
export const IDENTIFY_VARIANTS = ["type", "name", "operator", "value", "declaration", "initialization", "assignment-operator", "assignment", "declaration-only", "stored", "conversion", "compatibility"];
export const ASSESSED_MODES = ["trace", "assemble", ...IDENTIFY_VARIANTS.map((v) => `identify/${v}`)];
export function variableEvidence(q) {
  if (!q || q.game !== "variable-lab") return null;
  if (q.mode === "trace")
    return { practiceMode: "trace", mode: "trace", skill: "trace", variant: String(q.topic || "").split("/")[2], difficulty: q.difficulty, family: q.traceFamily, format: q.format };
  if (q.mode === "identify" && IDENTIFY_VARIANTS.includes(q.topic))
    return { practiceMode: `identify/${q.topic}`, mode: "identify", skill: `identify/${q.topic}`, variant: q.topic, family: `identify/${q.topic}` };
  if (q.mode === "assemble" && q.scenario?.type)
    return { practiceMode: "assemble", mode: "assemble", skill: "assemble", variant: q.scenario.type, family: `assemble/${q.scenario.type}` };
  return null;
}
