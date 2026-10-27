// Keep source export data and the game's displayed context together without
// changing the student generator or revealing its solution/trace.
export function searchQuestionContext(challenge, exported) {
  if (!exported || exported.stem !== challenge.stem || exported.code !== challenge.code ||
      exported.countingRule !== challenge.rule || !Array.isArray(challenge.visuals) || !Array.isArray(exported.arrays)) return null;
  const arrays = challenge.visuals.filter(v => v.type === "array");
  if (JSON.stringify(exported.arrays) !== JSON.stringify(arrays.map(v => ({label:v.label, values:v.values})))) return null;
  const blocks = [exported.countingRule, challenge.description, challenge.codeLabel].filter(Boolean);
  for (const visual of challenge.visuals) {
    if (visual.type === "array") {
      if (!Array.isArray(visual.values)) return null;
      const values = visual.values;
      blocks.push(`${visual.label || "Array"}: [${values.join(", ")}]`);
      if (visual.indices !== false && values.length) blocks.push(`Indices: [${values.map((_,i) => i).join(", ")}]`);
      const roles = Object.entries(visual.roles || {}).map(([index, names]) => `index ${index}: ${names.join(", ")}`);
      if (roles.length) blocks.push(`Array markers: ${roles.join("; ")}`);
      if (visual.note) blocks.push(visual.note);
    } else if (visual.type === "tree") {
      if (!Array.isArray(visual.rows) || visual.rows.some(row => !Array.isArray(row))) return null;
      blocks.push(`${visual.label || "Split tree"}:\n${visual.rows.map((row,i) => `Level ${i+1}: ${row.join(" | ")}`).join("\n")}`);
    } else return null; // New visual contracts require an explicit adaptation.
  }
  return blocks.join("\n\n");
}
