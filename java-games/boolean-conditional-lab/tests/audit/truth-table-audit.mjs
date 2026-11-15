// Independent truth-table audit of what a student sees. The Boolean expression printed in the code is evaluated with a
// separate implementation (JS Function), never with generators/bool.js. usage: node truth-table-audit.mjs [perCell=800] [seedBase=777]
import { generate, makeRng, DIFFICULTIES } from "../../engine.js";
const a = process.argv.slice(2); const per = Number(a[0] || 800), base = Number(a[1] || 777);
const fail = []; const stats = {}; const rankStats = {};
const bump = (k, ok) => { stats[k] ??= { n: 0, ok: 0 }; stats[k].n++; if (ok) stats[k].ok++; };
const parseRow = t => Object.fromEntries(t.split(/,\s*/).map(p => { const [k, v] = p.split(" = "); return [k.trim(), v.trim() === "true"]; }));
for (const L of DIFFICULTIES) for (let i = 0; i < per; i++) {
  const seed = base + i * 6007; const q = generate("truthTable", makeRng(seed), L); const f = q.family; const key = `${f}/${L}`;
  const expr = q.expression; const vars = Object.keys(q.table[0]).filter(k => k !== "result"); const n = vars.length;
  const ev = new Function(...vars, `return (${expr});`); const E = r => ev(...vars.map(v => r[v]));
  const problems = [];
  const subset = /these four truth-table rows/.test(q.question);   // count families may show a 4-row sample of a larger table
  if (!subset && q.table.length !== 2 ** n) problems.push(`row count ${q.table.length} != 2^${n}`);
  q.allRows.forEach((r, idx) => {
    if (subset) return;
    const expect = Object.fromEntries(vars.map((v, j) => [v, !!((idx >> (n - 1 - j)) & 1)]));       // first column = most significant bit
    if (vars.some(v => r[v] !== expect[v])) problems.push(`row ${idx} out of binary order`);
    if ("result" in r && r.result !== E(r)) problems.push(`allRows[${idx}].result=${r.result}, independent=${E(r)}`);
  });
  const hl = q.highlightedRow; if (q.table.some(r => "result" in r)) q.table.forEach((r, idx) => { if (r.result !== null && r.result !== q.allRows[idx].result && idx !== hl) problems.push(`displayed result wrong at non-highlighted row ${idx}`); });
  const keyed = q.choices[q.answer]; const all = q.allRows.map(r => ({ ...r, result: E(r) }));   // results always from the independent evaluator
  if (f === "count-true-rows" || f === "count-false-rows") { const want = f === "count-true-rows"; const shown = subset ? q.table.map(r => ({ ...r, result: E(r) })) : all; const c = shown.filter(r => r.result === want).length; if (parseInt(keyed) !== c) problems.push(`keyed ${keyed}, actual ${c}`); if (q.choices.filter(x => parseInt(x) === c).length !== 1) problems.push("ambiguous count options");
    const nums = q.choices.map(x => parseInt(x)); const rk = [...nums].sort((x, y) => x - y).indexOf(nums[q.answer]); rankStats[L] ??= [0, 0, 0, 0]; rankStats[L][rk]++; }
  if (f === "always-true" || f === "always-false") { const val = f === "always-true"; const constant = all.every(r => r.result === val); const yes = keyed.startsWith("Yes"); if (yes !== constant) problems.push(`keyed ${yes ? "Yes" : "No"}, constant=${constant}`);
    if (!yes) { const r = parseRow(keyed.replace(/^No, it is (true|false) when /, "")); const row = all.find(x => vars.every(v => x[v] === r[v])); if (!row || row.result !== !val) problems.push("keyed counterexample row is not a counterexample"); }
    const goodOpts = q.choices.filter(c => c.startsWith("Yes") ? constant : (() => { const r = parseRow(c.replace(/^No, it is (true|false) when /, "")); const row = all.find(x => vars.every(v => x[v] === r[v])); return row && row.result === !val; })()); if (goodOpts.length !== 1) problems.push(`${goodOpts.length} correct options`); }
  if (f === "inputs-make-true") { const want = /result is true/.test(q.question); const ok = q.choices.map(c => { const r = parseRow(c); const row = all.find(x => vars.every(v => x[v] === r[v])); return row && row.result === want; }); if (ok.filter(Boolean).length !== 1 || !ok[q.answer]) problems.push(`options satisfying: ${ok.filter(Boolean).length}`); }
  if (f === "eval-row" || f === "find-error-row") { if (String(all[hl].result) !== keyed) problems.push(`keyed ${keyed}, actual ${all[hl].result}`); const m = q.question.match(/\(([^)]*)\)/); if (m) { const r = parseRow(m[1]); if (!vars.every(v => all[hl][v] === r[v])) problems.push("question names a different row than the highlighted one"); } }
  if (f === "eval-trace") { const m = q.question.match(/values of (.+) and result\?/); if (m) { const sub = new Function(...vars, `return (${m[1]});`); const r = all[hl]; const want = `${m[1]} is ${sub(...vars.map(v => r[v]))}; result is ${r.result}`; if (keyed !== want) problems.push(`keyed "${keyed}", independent "${want}"`); if (q.choices.filter(c => c === want).length !== 1) problems.push("correct statement not unique"); } }
  if (f === "complete-missing") { const miss = q.table.map((r, idx) => r.result === null ? idx : -1).filter(x => x >= 0);
    const want = miss.length === 1 ? String(all[miss[0]].result) : `Upper ? = ${all[miss[0]].result}; lower ? = ${all[miss[1]]?.result}`;
    if (keyed !== want) problems.push(`keyed "${keyed}", independent "${want}" (${miss.length} blank cell(s))`); if (q.choices.filter(c => c === want).length !== 1) problems.push("answer not unique"); }
  bump(key, problems.length === 0); if (problems.length) fail.push({ seed, level: L, family: f, expression: expr, question: q.question, keyed, problems: problems.slice(0, 3) });
}
const fams = [...new Set(Object.keys(stats).map(k => k.split("/")[0]))];
console.log(`Truth-table audit (${per * 3} challenges, independent evaluator)`); for (const f of fams) console.log("  " + f.padEnd(18) + DIFFICULTIES.map(L => { const s = stats[`${f}/${L}`]; return s ? `${L.slice(0, 3)} ${s.ok}/${s.n}` : `${L.slice(0, 3)} -`; }).join("   "));
console.log("Count-family keyed numerical rank (0=smallest ... 3=largest):", JSON.stringify(rankStats));
console.log(`FAILURES: ${fail.length}`); fail.slice(0, 5).forEach(x => console.log(JSON.stringify(x)));
process.exit(fail.length ? 1 : 0);
