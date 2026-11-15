// Parsers for the code and option text a student sees (fix-boundary, equivalent-chain, missing-break-fix).
// Shared by family-java-verify.mjs and the regression tests. No access to generator internals.
// ---------- parsing / printing of if-else chains ----------
export const parseIfChain = code => { const body = code.replace(/^\/\/.*\n/, ""); const arms = []; const re = /(?:if|else if) \(([^)]*)\) \{\s*System\.out\.println\("([^"]*)"\);\s*\}/g; let m; while ((m = re.exec(body))) arms.push({ cond: m[1], out: m[2] }); const e = body.match(/else \{\s*System\.out\.println\("([^"]*)"\);\s*\}\s*$/); return { arms, els: e ? e[1] : null }; };
export const printIfChain = ({ arms, els }) => arms.map((x, i) => `${i ? "else if" : "if"} (${x.cond}) { System.out.println("${x.out}"); }`).join(" ") + (els != null ? ` else { System.out.println("${els}"); }` : "");
export const parseNotation = n => { const parts = n.split("; "); const arms = []; let els = null; for (const p of parts) { let m = p.match(/^(?:if|else if) \((.*)\) → "(.*)"$/); if (m) arms.push({ cond: m[1], out: m[2] }); else if ((m = p.match(/^else → "(.*)"$/))) els = m[1]; else throw new Error("unparsed notation part: " + p); } return { arms, els }; };
export const domainOf = code => { const m = code.match(/^\/\/ (\w+) is an int from (-?\d+) to (-?\d+)/); return { name: m[1], lo: +m[2], hi: +m[3] }; };
export const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));

// ---------- parsing / printing of switch statements ----------
export function parseSwitch(code) { const lines = code.split("\n").map(l => l.trim()); const sel = lines[0].match(/^switch \((\w+)\) \{$/)[1]; const blocks = []; let cur = null;
  for (const l of lines.slice(1)) { let m; if ((m = l.match(/^case (.+):$/))) { if (!cur || cur.stmts.length || cur.brk) { cur = { labels: [], isDefault: false, stmts: [], brk: false }; blocks.push(cur); } cur.labels.push(m[1]); }
    else if (l === "default:") { if (!cur || cur.stmts.length || cur.brk) { cur = { labels: [], isDefault: true, stmts: [], brk: false }; blocks.push(cur); } else cur.isDefault = true; }
    else if ((m = l.match(/^System\.out\.print\("([^"]*)"\);$/))) cur.stmts.push(m[1]); else if (l === "break;") cur.brk = true; else if (l === "}" || l === "") {} else throw new Error("unparsed switch line: " + l); }
  return { sel, blocks }; }
export const printSwitch = ({ sel, blocks }) => `switch (${sel}) { ${blocks.map(b => `${b.labels.map(l => `case ${l}:`).join(" ")}${b.isDefault ? " default:" : ""} ${b.stmts.map(s => `System.out.print("${s}");`).join(" ")}${b.brk ? " break;" : ""}`).join(" ")} }`;
export const nameOfBlock = b => b.isDefault && !b.labels.length ? "default" : `case ${b.labels[0]}`;
export const clone = x => JSON.parse(JSON.stringify(x));
export function applySwitchEdit(sw, text) { const s = clone(sw); const find = nm => { const i = s.blocks.findIndex(b => nameOfBlock(b) === nm); if (i < 0) throw new Error("no block " + nm); return i; }; let m;
  if ((m = text.match(/^Add break; at the end of both (.+) and (.+)$/))) { s.blocks[find(m[1])].brk = true; s.blocks[find(m[2])].brk = true; }
  else if ((m = text.match(/^Add break; at the end of (.+?)( only)?$/)) && text !== "Add break; after the last block") s.blocks[find(m[1])].brk = true;
  else if ((m = text.match(/^Remove the break; from both (.+) and (.+)$/))) { s.blocks[find(m[1])].brk = false; s.blocks[find(m[2])].brk = false; }
  else if ((m = text.match(/^Remove the break; from (.+)$/))) s.blocks[find(m[1])].brk = false;
  else if (text === "Move default to the top of the switch") { const i = s.blocks.findIndex(b => b.isDefault); const [d] = s.blocks.splice(i, 1); d.brk = false; s.blocks.unshift(d); }
  else if (text === "Add break; after the last block") s.blocks[s.blocks.length - 1].brk = true;
  else if (text === "Put the statements of each block inside { } braces") { /* no change in behaviour */ }
  else if ((m = text.match(/^Move both (.+) and (.+) to the end of the switch$/))) { const i = find(m[1]), j = find(m[2]); const bl = [s.blocks[i], s.blocks[j]]; s.blocks = s.blocks.filter((_, k) => k !== i && k !== j).concat(bl); }
  else if ((m = text.match(/^Move (.+) to the end of the switch$/))) { const i = find(m[1]); const [b] = s.blocks.splice(i, 1); s.blocks.push(b); }
  else throw new Error("unparsed option: " + text);
  return s; }

