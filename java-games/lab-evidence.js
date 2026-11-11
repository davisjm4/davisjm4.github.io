/* Practice-evidence annotations for the Advanced CS labs that do not need a lab-specific helper.
 *
 * Convention (same as the Variable Lab and String Lab helpers; Boolean also records its difficulty, which the page never sent before):
 *   practiceMode  the engine mode of the question actually shown. Mixed Practice is never reported; the drawn question's own mode is.
 *   family        the reasoning family of the question, namespaced "<mode>/<family>" when family ids repeat across modes of one lab
 *                 (Inheritance, Documentation, LinkedList). Robot Algorithms families are already "<mode>:<generator>".
 * The profile client sends practiceMode as assessedMode and family as familyId. The curriculum graph binds exactly these ids, so a
 * question can only credit the node of its own mode, and only when the family belongs to that node.
 * Pure function: reads the question, never changes it, never touches scoring, hints or session totals.
 */
export const LAB_EVIDENCE_GAMES = ["boolean-conditional-lab", "linkedlist-lab", "inheritance-polymorphism-lab", "documentation-lab", "robot-algorithms"];
const ok = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.:/|%-]{0,119}$/.test(v);

export function labEvidence(game, q) {
  if (!q || typeof q !== "object" || !ok(q.mode)) return null;
  switch (game) {
    case "boolean-conditional-lab":
      // The page shows a difficulty selector but never recorded it; the question carries the level it was generated at.
      return { practiceMode: q.mode, mode: q.mode, difficulty: q.difficulty, family: q.family };
    case "linkedlist-lab":
      // Only link and mutate challenges carry a stable family (the operation); trace/collections families are display text.
      return q.mode === "link" || q.mode === "mutate"
        ? { practiceMode: q.mode, mode: q.mode, family: `${q.mode}/${q.family}` }
        : { practiceMode: q.mode, mode: q.mode };
    case "inheritance-polymorphism-lab":
    case "documentation-lab":
      return ok(q.family) ? { practiceMode: q.mode, mode: q.mode, family: `${q.mode}/${q.family}` } : null;
    case "robot-algorithms":
      return ok(q.family) ? { practiceMode: q.mode, mode: q.mode, family: q.family } : null;
    default:
      return null;
  }
}
