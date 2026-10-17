/* Format the small Java snippets used by Class & Object Lab for display only.
 * This is a lexical formatter: strings, character literals, and comments are
 * copied as tokens, so punctuation inside them can never alter indentation.
 */
const word = c => /[A-Za-z0-9_$]/.test(c);
const operators = [">>>=", "===", "!==", ">>=", "<<=", "==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "->", "::"];

function tokenize(source) {
  const tokens = []; let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      const quote = c; let value = c; i++;
      while (i < source.length) { const d = source[i++]; value += d; if (d === "\\" && i < source.length) value += source[i++]; else if (d === quote) break; }
      tokens.push({ type: "literal", value }); continue;
    }
    if (c === '/' && source[i + 1] === '/') { const start = i; while (i < source.length && source[i] !== '\n') i++; tokens.push({ type: "comment", value: source.slice(start, i).trim() }); continue; }
    if (c === '/' && source[i + 1] === '*') { const start = i; i += 2; while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++; i += 2; tokens.push({ type: "comment", value: source.slice(start, i).trim() }); continue; }
    if (word(c)) { const start = i++; while (i < source.length && word(source[i])) i++; tokens.push({ type: "word", value: source.slice(start, i) }); continue; }
    const op = operators.find(x => source.startsWith(x, i));
    if (op) { tokens.push({ type: "operator", value: op }); i += op.length; continue; }
    tokens.push({ type: "punct", value: c }); i++;
  }
  return tokens;
}

export function formatJavaCode(source) {
  const tokens = tokenize(String(source ?? "")); const lines = []; let line = "", indent = 0, parens = 0, previous = null;
  const flush = () => { if (line.trim()) lines.push("    ".repeat(Math.max(0, indent)) + line.trim()); line = ""; };
  const space = () => { if (line && !line.endsWith(" ")) line += " "; };
  const append = value => { line += value; };
  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti], next = tokens[ti + 1];
    const v = token.value;
    if (token.type === "comment") { space(); append(v); flush(); previous = token; continue; }
    if (v === "{") { space(); append("{"); flush(); indent++; }
    else if (v === "}") { flush(); indent--; append("}"); }
    else if (v === ";") { append(";"); if (parens === 0) flush(); else space(); }
    else if (v === "(") { if (previous?.value === "if" || previous?.value === "for" || previous?.value === "while" || previous?.value === "switch" || previous?.value === "catch") space(); append("("); parens++; }
    else if (v === ")") { line = line.trimEnd(); append(")"); parens = Math.max(0, parens - 1); }
    else if (v === ",") { line = line.trimEnd(); append(", "); }
    else if (v === ".") { line = line.trimEnd(); append("."); }
    else if (v === "[") { line = line.trimEnd(); append("["); }
    else if (v === "]") { line = line.trimEnd(); append("]"); }
    else if (v === ":") { line = line.trimEnd(); append(": "); }
    else if (token.type === "operator" || ["=", "+", "-", "*", "%", "<", ">", "!", "&", "|", "?"].includes(v)) { space(); append(v); append(" "); }
    else { if (line && !line.endsWith(" ") && !line.endsWith("(") && !line.endsWith("[") && !line.endsWith(".")) space(); append(v); }
    if (v === "}") { if (next?.value !== ";" && next?.value !== "else" && next?.value !== "catch" && next?.value !== "finally") flush(); }
    previous = token;
  }
  flush(); return lines.join("\n");
}

