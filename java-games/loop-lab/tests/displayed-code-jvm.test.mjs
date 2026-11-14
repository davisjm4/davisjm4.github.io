/* Loop Lab: independent verification of the DISPLAYED student-facing code (q.code, q.choices, q.prompt) on a real JVM.
 * The code is wrapped and compiled by tests/helpers/java-batch.mjs, not by the engine printers or answer keys.
 * Usage: node tests/displayed-code-jvm.test.mjs [perCell=40]. Needs a JRE/JDK with the jdk.compiler module. */
/* Independent verification of the DISPLAYED student-facing code: q.code / q.choices / q.prompt are
 * wrapped, compiled and run on a real JVM by javarun.mjs. Nothing here uses the repo's AST,
 * printProgram, instrumentedClass, or its answer keys except as the value being checked. */
import fs from "node:fs";
import * as E from "../loop-engine.js";
import { runJobs, findJdkCompiler } from "./helpers/java-batch.mjs";
if (!findJdkCompiler()) { console.log("SKIPPED: no Java runtime with jdk.compiler found. JVM verification did not run."); process.exit(0); }
const corpus = (N, modes) => { const out = []; for (const mode of modes) for (const difficulty of E.DIFFICULTIES) for (let i = 0; i < N; i++) out.push(E.generateChallenge({ mode, difficulty, seed: 100 + i * 53 })); return out; };

const N = Number(process.argv[2] || 40);
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
const LOOP_RE = /\b(?:while|for)\s*\([^\n]*\)\s*\{/;
const names = (s) => s.replace(/\band\b/g, ",").split(",").map((x) => x.trim()).filter(Boolean);
const matchParen = (s, open) => { let d = 0; for (let i = open; i < s.length; i++) { if (s[i] === "(") d++; else if (s[i] === ")") { d--; if (!d) return i; } } return -1; };
const matchBrace = (s, open) => { let d = 0; for (let i = open; i < s.length; i++) { if (s[i] === "{") d++; else if (s[i] === "}") { d--; if (!d) return i; } } return -1; };
const topSplit = (s, seps) => { const parts = []; let d = 0, cur = ""; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === "(" || c === "[") d++; if (c === ")" || c === "]") d--; if (!d) { const sep = seps.find((x) => s.startsWith(x, i)); if (sep) { parts.push(cur); cur = ""; i += sep.length - 1; continue; } } cur += c; } parts.push(cur); return parts; };
const fmt = (vals) => vals;

/* ---- instrumentation helpers (text based) ---- */
function firstLoop(code) { const m = code.match(LOOP_RE); if (!m) return null; const hs = m.index, open = hs + m[0].length - 1; return { hs, open, close: matchBrace(code, open), header: m[0] }; }
function headerCond(header) { // returns {kind, cond, start, end} indices within header
  const lp = header.indexOf("("), rp = matchParen(header, lp), inner = header.slice(lp + 1, rp);
  if (header.startsWith("while")) return { kind: "while", cond: inner, lp, rp, condStart: lp + 1, condEnd: rp };
  const parts = topSplit(inner, [";"]); if (parts.length !== 3) return null;
  const condStart = lp + 1 + parts[0].length + 1; return { kind: "for", cond: parts[1], lp, rp, parts, condStart, condEnd: condStart + parts[1].length };
}
function hookCheck(code, hookExpr) { // wrap first loop condition: __t(hookExpr, cond)
  const L = firstLoop(code); if (!L) return null; const h = headerCond(L.header); if (!h) return null;
  const newHeader = L.header.slice(0, h.condStart) + `__t(${hookExpr}, ${h.cond.trim()})` + L.header.slice(h.condEnd);
  return code.slice(0, L.hs) + newHeader + code.slice(L.hs + L.header.length);
}
function hookEndBody(code, hookExpr) { const L = firstLoop(code); if (!L || L.close < 0) return null; return code.slice(0, L.close) + `__p(${hookExpr}); ` + code.slice(L.close); }
const hookStr = (vs) => vs.map((v) => `String.valueOf(${v})`).join('+"|"+');
function insertMarks(code) { // `stmt; // A` -> counts executions of that statement
  return code.split("\n").map((line) => {
    const m = line.match(/^(\s*)(.*?)\s*\/\/ ([A-Z])\s*$/); if (!m) return line;
    const [, ind, stmt, lab] = m; const idx = lab.charCodeAt(0) - 65; const inc = `__m[${idx}]++;`;
    if (/^if\s*\(/.test(stmt)) { const rp = matchParen(stmt, stmt.indexOf("(")); return `${ind}${stmt.slice(0, rp + 1)} { ${inc} ${stmt.slice(rp + 1).trim()} }`; }
    if (/^(else|\})/.test(stmt)) return line;
    if (/^(int|double|String|boolean|char|long)\b/.test(stmt)) return `${ind}${inc} ${stmt}`;
    return `${ind}${inc} ${stmt}`;
  }).join("\n");
}
function wrapComparisons(code) { // __kk() around each relational atom of every loop/if condition
  let out = "", i = 0, ok = true;
  const re = /\b(while|if|for)\s*\(/g; let m;
  while ((m = re.exec(code))) {
    const lp = m.index + m[0].length - 1, rp = matchParen(code, lp); if (rp < 0) return null;
    const inner = code.slice(lp + 1, rp); let cond = inner, pre = "", post = "";
    if (m[1] === "for") { const parts = topSplit(inner, [";"]); if (parts.length !== 3) return null; pre = parts[0] + ";"; cond = parts[1]; post = ";" + parts[2]; }
    const atoms = topSplit(cond, ["&&", "||"]); const seps = []; let p = 0; for (let a = 0; a < atoms.length - 1; a++) { p += atoms[a].length; seps.push(cond.slice(p, p + 2)); p += 2; }
    const wrapped = atoms.map((a) => /(<=|>=|==|!=|<|>)/.test(a) ? ` __kk(${a.trim()}) ` : a).map((a, ix) => a + (seps[ix] || "")).join("");
    out += code.slice(i, lp + 1) + pre + wrapped + post; i = rp;
  }
  return out + code.slice(i);
}

/* ---- per-question task builders ---- */
const tasks = [];
const pass = (detail = "") => ({ status: "pass", detail }), fail = (detail) => ({ status: "FAIL", detail }), unv = (detail) => ({ status: "unverified", detail });
function add(q, jobs, check) { tasks.push({ q, jobs, check }); }
const textOf = (r) => (r.out.length ? r.out.join("\n") : "(no output)");
function pickCheck(q, expected, key = "answer") { // expected = display string the displayed code truly produces
  const keyed = q.answer; const matching = q.choices.filter((c) => c === expected);
  if (matching.length !== 1) return fail(`displayed code gives "${expected}" which matches ${matching.length} choices ${JSON.stringify(q.choices)}; keyed=${JSON.stringify(keyed)}`);
  if (matching[0] !== keyed) return fail(`JVM says "${expected}" but keyed answer is "${keyed}"`);
  return pass();
}

for (const q of corpus(N, E.MODES.filter((m) => m !== "looptype"))) {
  const code = q.code, kind = q.targetKind, P = q.prompt;
  try {
    if (kind === "var") {
      const se = P.match(/How many times does (\w+)\+\+ execute/) || P.match(/statement that adds 1 to (\w+) execute/);
      if (se) { const v = se[1]; const lines = code.split("\n"); const ix = lines.findIndex((l) => new RegExp(`^\\s*${v}(\\+\\+|\\s*\\+=\\s*1|\\s*=\\s*${v}\\s*\\+\\s*1);\\s*$`).test(l));
        if (ix < 0) { add(q, [], () => unv("statement not found")); continue; }
        const literal = lines.some((l) => l.trim() === `${v}++;`); lines[ix] = `__m[0]++; ` + lines[ix];
        add(q, [{ code: lines.join("\n") }], ([r]) => { const x = r.ok ? pickCheck(q, String(r.m[0])) : fail(r.compileError); if (x.status === "pass" && !literal) x.detail = `PROMPT-CODE MISMATCH: prompt names ${v}++ but displayed statement is written differently`; return x; }); continue; }
      const nm = (P.match(/(?:final value of|value of) (\w+)/) || [])[1]; if (!nm) { add(q, [], () => unv("no var in prompt")); continue; }
      add(q, [{ code: code + `\nSystem.out.println(${nm});` }], ([r]) => r.ok && !r.exc ? pickCheck(q, q.answer.startsWith('"') ? `"${r.out.at(-1)}"` : r.out.at(-1)) : fail("run error " + (r.exc || r.compileError)));
    } else if (kind === "vars") {
      const vs = names((P.match(/final values of (.+?)\?/) || [])[1] || ""); if (!vs.length) { add(q, [], () => unv("no vars")); continue; }
      add(q, [{ code: code + "\n" + vs.map((v) => `System.out.println("@@V${v}="+${v});`).join("\n") }], ([r]) => {
        if (!r.ok || r.exc) return fail("run error " + (r.exc || r.compileError));
        const kv = Object.fromEntries(r.out.filter((l) => l.startsWith("@@V")).map((l) => [l.slice(3, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
        return pickCheck(q, vs.map((v) => `${v} = ${kv[v]}`).join(", "));
      });
    } else if (kind === "output") {
      add(q, [{ code }], ([r]) => r.ok && !r.exc ? pickCheck(q, textOf(r)) : fail("run error " + (r.exc || r.compileError)));
    } else if (kind === "lastOutput") {
      add(q, [{ code }], ([r]) => r.ok ? pickCheck(q, r.out.at(-1)) : fail(r.compileError));
    } else if (kind === "lineOutput") {
      const n = +(P.match(/line (\d+)/) || [])[1];
      add(q, [{ code }], ([r]) => r.ok ? pickCheck(q, r.out[n - 1]) : fail(r.compileError));
    } else if (kind === "body") {
      const L = firstLoop(code); if (!L) { add(q, [], () => unv("no loop")); continue; }
      const multi = (code.match(/\b(?:while|for)\s*\(/g) || []).length > 1;
      add(q, [{ code: code.slice(0, L.open + 1) + " __bb++;" + code.slice(L.open + 1) }], ([r]) => r.ok && !r.exc ? (() => { const x = pickCheck(q, String(r.bb)); if (multi && x.status === "pass") x.detail = "multi-loop: counted first loop only"; return x; })() : fail("run error " + (r.exc || r.compileError)));
    } else if (kind === "cond") {
      if (/the if condition/.test(P)) { const c2 = code.replace(/\bif\s*\(([^\n]*?)\)(\s*[\{a-z])/, (m, a, b) => `if (__c(${a}))${b}`); add(q, [{ code: c2 }], ([r]) => r.ok ? pickCheck(q, String(r.cc)) : fail(r.compileError)); continue; }
      const cs = (P.match(/condition (.+?) (?:evaluated|checked|tested|is evaluated)/) || P.match(/condition (.+?) (?:v|evaluated)/) || [])[1];
      if (!cs) { add(q, [], () => unv("cannot parse condition from prompt: " + P)); continue; }
      let c2 = code.replace(/(\bwhile\s*\()([^\n]*?)(\)\s*\{)/g, (m, a, b, c) => b.trim() === cs.trim() ? `${a}__c(${b})${c}` : m).replace(/(;\s*)([^;\n]*?)(\s*;[^;\n]*\)\s*\{)/g, (m, a, b, c) => b.trim() === cs.trim() ? `${a}__c(${b})${c}` : m);
      if (c2 === code) { add(q, [], () => unv("condition text not found in a header: " + cs)); continue; }
      add(q, [{ code: c2 }], ([r]) => r.ok && !r.exc ? pickCheck(q, String(r.cc)) : fail("run error " + (r.exc || r.compileError)));
    } else if (kind === "upd") {
      const u = (P.match(/update (.+?) execute/) || [])[1]; if (!u) { add(q, [], () => unv("no update")); continue; }
      const esc = u.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const c2 = code.replace(new RegExp(`(;\\s*)${esc}(\\s*\\)\\s*\\{)`, "g"), `$1${u}, __uu++$2`);
      if (c2 === code) { add(q, [], () => unv("update not in for header: " + u)); continue; }
      add(q, [{ code: c2 }], ([r]) => r.ok ? pickCheck(q, String(r.uu)) : fail(r.compileError));
    } else if (kind === "mark" || kind === "markSum" || kind === "pair") {
      add(q, [{ code: insertMarks(code) }], ([r]) => {
        if (!r.ok || r.exc) return fail("run error " + (r.exc || r.compileError));
        if (kind === "mark") return pickCheck(q, String(r.m[0]));
        if (kind === "markSum") return pickCheck(q, String(r.m[0] + r.m[1]));
        return pickCheck(q, `A: ${r.m[0]} · B: ${r.m[1]}`);
      });
    } else if (kind === "comparisons") {
      const c2 = wrapComparisons(code); if (!c2) { add(q, [], () => unv("could not parse conditions")); continue; }
      add(q, [{ code: c2 }], ([r]) => r.ok ? pickCheck(q, String(r.k)) : fail(r.compileError));
    } else if (kind === "stateAfter") {
      const m = P.match(/What are (?:the values of )?(.+?) (?:after the|when the loop condition is checked for the) (\w+)/); if (!m) { add(q, [], () => unv("cannot parse: " + P)); continue; }
      const vs = names(m[1]), k = ORD[m[2]] || parseInt(m[2], 10); const viaCheck = /checked for the/.test(P);
      const mkExp = (line) => line ? vs.map((v, i) => { const raw = line.split("|")[i]; return q.answer.includes(`${v} = "`) ? `${v} = "${raw}"` : `${v} = ${raw}`; }).join(", ") : null;
      const A = hookEndBody(code, hookStr(vs)), B = hookCheck(code, hookStr(vs));
      if (!A || !B) { add(q, [], () => unv("cannot instrument")); continue; }
      add(q, [{ code: A }, { code: B }], ([ra, rb]) => {
        if (!rb.ok || rb.exc) return fail("run error " + (rb.exc || rb.compileError));
        const eA = mkExp(ra.tr[k - 1]), eB = mkExp(rb.tr[k - 1]), eAfterUpdate = mkExp(rb.tr[k]);
        if (viaCheck) return pickCheck(q, eB);
        // "after the k-th iteration": convention A = end of k-th body (before for-update), B' = next condition check (after update)
        const conv = [eA, eAfterUpdate]; const matchesKey = conv.map((e) => e === q.answer);
        const diff = eA !== eAfterUpdate;
        if (!matchesKey.some(Boolean)) return fail(`neither end-of-body "${eA}" nor next-check "${eAfterUpdate}" equals keyed "${q.answer}"`);
        return pass(diff ? `CONVENTION-DEPENDENT: end-of-body=${eA} | after-update=${eAfterUpdate}; keyed=${matchesKey[0] ? "end-of-body" : "after-update"}` : "");
      });
    } else if (kind === "bad-step") {
      const cols = q.studentTrace.columns; const B = hookCheck(code, hookStr(cols));
      if (!B) { add(q, [], () => unv("cannot instrument")); continue; }
      add(q, [{ code: B }], ([r]) => {
        if (!r.ok || r.exc) return fail("run error " + (r.exc || r.compileError));
        const rows = q.studentTrace.rows; const bad = rows.filter((row, i) => (r.tr[i] || "") !== row.values.join("|")).map((x) => x.label);
        const extra = r.tr.length > rows.length ? `JVM has ${r.tr.length} checks, table shows ${rows.length}` : "";
        if (bad.length !== 1 || bad[0] !== q.answer) return fail(`differing rows ${JSON.stringify(bad)} vs keyed ${q.answer}; ${extra}`);
        return pass(extra);
      });
    } else if (kind === "choose-loop") {
      const goal = q.params.goal || "";
      const jobs = q.choices.map((c) => ({ code: /total ends as/.test(goal) ? c + "\nSystem.out.println(total);" : c }));
      add(q, jobs, (rs) => {
        let expect;
        if (/^prints (\d+) rows of (\d+) stars/.test(goal)) { const [, R, C] = goal.match(/^prints (\d+) rows of (\d+)/); expect = Array.from({ length: +R }, () => "*".repeat(+C)); }
        else if (/^prints /.test(goal)) expect = (goal.match(/-?\d+/g) || []).map(String);
        else if (/total ends as (\d+)/.test(goal)) expect = [goal.match(/ends as (-?\d+)/)[1]];
        else return unv("goal not parsed: " + goal);
        const good = q.choices.filter((c, i) => rs[i].ok && !rs[i].exc && JSON.stringify(rs[i].out) === JSON.stringify(expect));
        if (good.length !== 1) return fail(`${good.length} choices meet the goal ${JSON.stringify(goal)}: ${JSON.stringify(good)}`);
        return good[0] === q.answer ? pass() : fail(`JVM-correct choice ${JSON.stringify(good[0])} != keyed`);
      });
    } else if (kind === "select-statement") {
      if (!/_{4,}/.test(code)) { add(q, [], () => fail(`NO BLANK DISPLAYED: prompt asks which statement belongs in the blank but the displayed code has no blank; keyed answer "${q.answer}" is visible in the code`)); continue; }
      const mm = P.match(/so that (\w+) ends as (-?\d+)/); if (!mm) { add(q, [], () => unv("cannot parse " + P)); continue; }
      const jobs = q.choices.map((c) => ({ code: code.replace(/_{4,};?/, c.replace(/;?$/, ";")) + `\nSystem.out.println(${mm[1]});` }));
      add(q, jobs, (rs) => { const good = q.choices.filter((c, i) => rs[i].ok && !rs[i].exc && rs[i].out.at(-1) === mm[2]); if (good.length !== 1) return fail(`${good.length} choices give ${mm[1]}=${mm[2]}: ${JSON.stringify(good)}`); return good[0] === q.answer ? pass() : fail("JVM-correct != keyed"); });
    } else if (kind === "debug-fix") {
      const jobs = q.choices.map((c) => ({ code: applyFix(code, c) ?? "int __unparsed = ;" }));
      const goal = parseDebugGoal(P, code);
      if (!goal) { add(q, [], () => unv("goal not parsed: " + P)); continue; }
      add(q, jobs.map((j) => ({ code: j.code + (goal.print ? `\nSystem.out.println(${goal.print});` : "") })), (rs) => {
        const good = q.choices.filter((c, i) => rs[i].ok && !rs[i].exc && JSON.stringify(goal.print ? [rs[i].out.at(-1)] : rs[i].out) === JSON.stringify(goal.expect));
        const unparsed = q.choices.filter((c, i) => !rs[i].ok);
        const keyedIdx = q.choices.indexOf(q.answer); if (!rs[keyedIdx].ok) return fail("keyed fix does not compile/apply: " + rs[keyedIdx].compileError);
        if (good.length !== 1) return fail(`${good.length} fixes reach the goal: ${JSON.stringify(good)}`);
        return good[0] === q.answer ? pass(unparsed.length ? "COMPILE-ERROR DISTRACTORS: " + JSON.stringify(unparsed) : "") : fail("JVM-correct fix != keyed");
      });
    } else if (kind === "growth-class" || kind === "growth-predict") {
      const nm = code.match(/int n = (\d+);/); if (!nm) { add(q, [], () => unv("no n")); continue; }
      const n0 = +nm[1]; const ns = kind === "growth-class" ? [n0, 2 * n0, 4 * n0] : [n0, +(P.match(/int n = (\d+);/) || [])[1]];
      add(q, ns.map((n) => ({ code: insertMarks(code.replace(/int n = \d+;/, `int n = ${n};`)) })), (rs) => {
        const c = rs.map((r) => r.m[0]);
        if (kind === "growth-predict") return pickCheck(q, String(c[1]));
        const r1 = c[1] / c[0], r2 = c[2] / c[1]; let cls;
        if (c[0] === c[1] && c[1] === c[2]) cls = "Constant"; else if (Math.abs(r1 - 2) < 0.35 && Math.abs(r2 - 2) < 0.35) cls = "Linear"; else if (Math.abs(r1 - 4) < 0.8 && Math.abs(r2 - 4) < 0.5) cls = "Quadratic"; else if (c[1] - c[0] >= 1 && Math.abs((c[2] - c[1]) - (c[1] - c[0])) <= 1) cls = "Logarithmic"; else cls = "??";
        const ok = q.answer.startsWith(cls); return ok ? pass(`counts ${c}`) : fail(`counts at n,2n,4n=${JSON.stringify(c)} classify as ${cls}; keyed "${q.answer}"`);
      });
    } else if (kind === "component") {
      add(q, [], () => componentCheck(q));
    } else add(q, [], () => unv("kind not handled: " + kind));
  } catch (e) { add(q, [], () => fail("verifier exception: " + e.message)); }
}

function applyFix(code, choice) {
  let m;
  if ((m = choice.match(/^Change (.+?) (\(in the header\) )?to (.+)$/))) {
    const [, from, hdr, to] = m;
    if (hdr) return code.split("\n").map((l) => (/^\s*for\s*\(/.test(l) ? l.replace(from, to) : l)).join("\n");
    return code.includes(from) ? code.replace(from, to) : null;
  }
  if ((m = choice.match(/^Remove the line (.+?);?$/))) { const lines = code.split("\n"); const i = lines.findIndex((l) => l.trim() === m[1] + ";" || l.trim() === m[1]); if (i < 0) return null; lines.splice(i, 1); return lines.join("\n"); }
  if ((m = choice.match(/^Add (.+?;) inside the loop (before|after) the print$/))) { const lines = code.split("\n"); const i = lines.findIndex((l) => /System\.out\.print/.test(l)); if (i < 0) return null; lines.splice(m[2] === "before" ? i : i + 1, 0, "    " + m[1]); return lines.join("\n"); }
  if ((m = choice.match(/^Move (.+?;?) (below|above|into) the (?:loop)$/))) {
    const lines = code.split("\n"); const stmt = m[1]; const i = lines.findIndex((l) => l.trim() === stmt || l.trim() === stmt + ";"); if (i < 0) return null; const [removed] = lines.splice(i, 1);
    const li = lines.findIndex((l) => /^\s*(for|while)\s*\(/.test(l));
    if (m[2] === "above") { lines.splice(li, 0, removed.trim()); }
    else if (m[2] === "into") { lines.splice(li + 1, 0, "    " + removed.trim()); }
    else { lines.push(removed.trim()); }
    return lines.join("\n");
  }
  return null;
}
function parseDebugGoal(P, code) {
  let m;
  if (/Print every array element exactly once/.test(P)) { const a = code.match(/\{([^}]*)\}/); return a ? { expect: a[1].split(",").map((x) => x.trim()) } : null; }
  if ((m = P.match(/Print every integer from (-?\d+) through (-?\d+)/))) { const out = []; for (let i = +m[1]; i <= +m[2]; i++) out.push(String(i)); return { expect: out }; }
  if ((m = P.match(/Print only the final total, (-?\d+), once/))) return { expect: [m[1]] };
  if ((m = P.match(/(?:and store|Store) (-?\d+).*? in (\w+)\./))) return { expect: [m[1]], print: m[2] };
  if ((m = P.match(/^Print (?:the multiples |the running totals )?([-\d, ]+?)(?: and stop)?\. Which/)) || (m = P.match(/^Print (?:the multiples |the running totals )?([-\d, and]+?)\. Which/))) return { expect: (m[1].match(/-?\d+/g) || []) };
  return null;
}
function componentCheck(q) {
  const code = q.code, a = q.answer, P = q.prompt; const L = firstLoop(code);
  if (!code.includes(a)) return fail("CHOICE-NOT-IN-CODE: keyed answer text is not in the displayed code (displayed statement is written in a different form)");
  if (L && L.header.startsWith("for")) {
    const h = headerCond(L.header); const [i0, c0, u0] = h.parts.map((s) => s.trim());
    if (/updates the loop|update of the inner|moves the loop toward/.test(P) && !/accumulator/.test(P)) { if (!/inner/.test(P) && a !== u0 && !/moves/.test(P)) return fail(`header update is "${u0}" but keyed "${a}"`); }
    if (/initialization of the loop-control/.test(P) && a !== i0) return fail(`header init is "${i0}" but keyed "${a}"`);
    if (/condition (?:that )?(?:determines|decides|controls)/.test(P) && !/outer/.test(P) && !/inner/.test(P) && a !== c0) return fail(`header condition is "${c0}" but keyed "${a}"`);
  }
  const dupe = q.choices.filter((c) => c === a).length; if (dupe !== 1) return fail("keyed answer appears " + dupe + " times in choices");
  return pass("structural check only (no execution semantics)");
}

/* ---- run everything ---- */
const jobList = []; tasks.forEach((t, ti) => t.jobs.forEach((j, ji) => jobList.push({ ti, ji, code: j.code })));
console.error(`${tasks.length} questions, ${jobList.length} Java programs`);
const res = runJobs(jobList.map((j) => ({ code: j.code })));
const byTask = tasks.map(() => []); jobList.forEach((j, k) => { byTask[j.ti][j.ji] = res[k]; });
const rows = tasks.map((t, ti) => { let v; try { v = t.check(byTask[ti]); } catch (e) { v = fail("check exception " + e.message); } const q = t.q; return { id: q.id, mode: q.mode, difficulty: q.difficulty, variant: q.variant, kind: q.targetKind, seed: q.seed, ...v, prompt: q.prompt, code: q.code }; });
const tot = { pass: 0, FAIL: 0, unverified: 0 }; rows.forEach((r) => tot[r.status]++);
fs.mkdirSync(new URL("../reports/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../reports/displayed-code-jvm.json", import.meta.url), JSON.stringify({ N, questions: rows.length, programs: jobList.length, ...tot, failures: rows.filter((r) => r.status === "FAIL").slice(0, 20).map((r) => ({ id: r.id, detail: r.detail })) }, null, 1));
console.log(`Displayed-code JVM verification: ${rows.length} questions, ${jobList.length} programs: ${tot.pass} pass, ${tot.FAIL} FAIL, ${tot.unverified} unverified (informational).`);
if (tot.FAIL) { console.log(rows.filter((r) => r.status === "FAIL").slice(0, 10).map((r) => `${r.id} ${r.detail}`).join("\n")); process.exit(1); }
