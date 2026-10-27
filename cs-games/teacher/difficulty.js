// Teacher-only level mapping. Return the source's spelling after comparing IDs.
export const difficultyId = value => String(value ?? "").trim().toLowerCase();
const order = ["beginner", "intermediate", "advanced"];
export function resolveDifficulty(mode, requested, index = 0) {
  const wanted = difficultyId(requested);
  if (![...order, "mixed"].includes(wanted)) return { error: `Unknown difficulty: ${requested}. Choose Beginner, Intermediate, Advanced, or Mixed.` };
  if (!mode.difficulties) return { level: "Mixed", notice: wanted === "mixed" ? "" : `${mode.name} has no difficulty control; it uses its native Mixed level.` };
  const levels = mode.difficulties;
  if (!levels.length) return { error: `${mode.name} has no exportable difficulty levels.` };
  if (wanted === "mixed") return { level: levels[(index + Math.floor(index / levels.length)) % levels.length], notice: "" };
  const exact = levels.find(level => difficultyId(level) === wanted);
  if (exact) return { level: exact, notice: "" };
  const nearest = [...levels].sort((a,b) => Math.abs(order.indexOf(difficultyId(a))-order.indexOf(wanted)) - Math.abs(order.indexOf(difficultyId(b))-order.indexOf(wanted)))[0];
  return { level: nearest, notice: `${mode.name} does not export ${requested}; using its nearest supported level, ${nearest}. Supported levels: ${levels.join(", ")}.` };
}
