/* Student-facing challenge header. Only mode and difficulty are shown: the question family / variant
 * (e.g. "Wrong direction", "Reset inside", "Break sum") names the trick or the bug and must not be visible
 * before the student answers. Variant ids stay on the challenge object for reporting and validation. */
export function challengeHeaderParts(q) { return [q.modeName, q.difficultyName]; }
export const challengeHeaderText = (q) => challengeHeaderParts(q).join(" · ");
