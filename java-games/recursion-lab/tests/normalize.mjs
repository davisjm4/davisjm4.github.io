// Independent normalization used for BOTH baseline and final audits.
export function methodNames(code) {
  return [...code.matchAll(/(?:public|private)\s+static\s+[\w\[\]<>]+\s+(\w+)\s*\(/g)].map(m => m[1]);
}
export function skeleton(code) {
  let s = code.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");    // drop call/data comment lines
  s = s.replace(/\/\/.*$/gm, "");                                            // trailing comments
  methodNames(code).forEach((m, i) => { s = s.replace(new RegExp(`\\b${m}\\b`, "g"), `M${i}`); });
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, "S").replace(/'(?:[^'\\]|\\.)'/g, "C").replace(/\b\d+\b/g, "#");
  return s.replace(/\s+/g, " ").trim();
}
export function promptKey(prompt, code) {
  let p = prompt;
  methodNames(code).forEach(m => { p = p.replace(new RegExp(`\\b${m}\\b`, "g"), "M"); });
  return p.replace(/"(?:[^"\\]|\\.)*"/g, "S").replace(/-?\b\d+\b/g, "#").replace(/\s+/g, " ").trim();
}
export function answerKind(v) {
  v = String(v);
  if (/^-?\d+$/.test(v)) return "int";
  if (v === "true" || v === "false") return "bool";
  if (/^-?\d+(, -?\d+)+$/.test(v) || /^-?\d+( -?\d+)+$/.test(v)) return "list";
  if (/^(Change|Use|Add|Replace|Move|Remove|Return|Call|Swap|Append|Compare|Insert|Delete)\b/.test(v)) return "fix";
  if (/[<>=]=?|\bn\b|\(|\.\./.test(v)) return "code";
  return "text";
}
export const reasoningKey = q => `${skeleton(q.code)} || ${promptKey(q.prompt, q.code)} || ${answerKind(q.answer)}`;
export const exactKey = q => `${q.code}|${q.prompt}|${[...q.choices].sort().join("~")}`;
