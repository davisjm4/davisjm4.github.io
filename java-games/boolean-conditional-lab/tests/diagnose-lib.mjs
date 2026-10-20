// Shared student-visible keys used by diagnostics and quality gates.
export const JAVA_WORDS = new Set("int boolean String char double if else switch case default break System out print println new null true false return while for do".split(" "));
export function tableText(q) {
  if (!q.table) return "";
  return q.table.map(r => Object.entries(r).map(([k, v]) => `${k}=${v === null ? "?" : v}`).join(",")).join(";");
}
// A: exact student-visible question. Choice ORDER is excluded (a reshuffled
// copy is the same question to a student); a second, order-sensitive key is kept.
export function exactKey(q) {
  const opts = q.kind === "select" ? q.tokens.map(t => t.text) : q.choices;
  return JSON.stringify([q.mode, q.question, q.code, tableText(q), [...opts].sort(), q.answerText ?? opts[q.answer]]);
}
// C: structural key. Identifiers -> canonical by first appearance, numbers,
// strings and Boolean literals -> placeholders, table values removed (only shape kept).
export function normalizeCode(src) {
  const map = new Map();
  return String(src)
    .replace(/"(?:[^"\\]|\\.)*"/g, '"S"')
    .replace(/'(?:[^'\\]|\\.)'/g, "'C'")
    .replace(/\b\d+\b/g, "N")
    .replace(/\b(true|false)\b/g, "B")
    .replace(/\b[A-Za-z_]\w*\b/g, w => (JAVA_WORDS.has(w) || w === "N" || w === "B" || w === "S" || w === "C") ? w : (map.has(w) ? map.get(w) : (map.set(w, `v${map.size}`), map.get(w))));
}
const normText = s => normalizeCode(s).replace(/\s+/g, " ");
export function structuralKey(q) {
  const shape = q.table ? `${Object.keys(q.table[0]).length - 1}x${q.table.length}` : "";
  return JSON.stringify([q.mode, normText(q.question), normalizeCode(q.code), shape, (q.choices || []).length]);
}
