import { J, run, finalize, clone, findTag, printProgram, walk } from "./java-model.js?v=loop-expansion-v2";
import { evaluate, GenReject } from "./questions.js?v=loop-expansion-v2";

export const LEVELS = ["beginner", "intermediate", "advanced"];
export const lvl = (d) => LEVELS.indexOf(d);
export const range = (a, b, step = 1) => { const o = []; for (let x = a; step > 0 ? x <= b : x >= b; x += step) o.push(x); return o; };
export const V = J.v, N = J.n;
export const P = (stmts) => finalize(stmts);
export function lines(program) { return printProgram(program).code; }
export function stmtText(st) { return lines(finalize([clone(st)])).replace(/;$/, ""); }
export function ordinal(k) { return ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"][k - 1] || `${k}th`; }
export const arrLit = (vals) => J.arr(vals.map((x) => J.n(x)));
export function distinctDigits(rng, count, opts = {}) {
  let n = rng.int(opts.first ?? 1, 9);
  for (let i = 1; i < count; i++) n = n * 10 + rng.int(opts.min ?? 0, 9);
  return n;
}
/** Row values of a tagged loop's condition checks (vars at each check). */
export function checks(program, tag) {
  const res = run(program); const l = findTag(program, tag);
  return res.trace.filter((r) => r.loop === l.id);
}
export function bodyCount(program, tag) { const res = run(program); return res.B[findTag(program, tag).id] || 0; }

/**
 * "Select the correct statement" interaction: a statement (tag) is blanked.
 * candidates: [{stmt, misconception}] alternative statements. A candidate is
 * a valid distractor only when it changes the goal (target value).
 */
export function selectStatement({ rng, program, tag, candidates, target, goalText, concept, template, explain, params, traceLoop, traceVars }) {
  const st = findTag(program, tag); if (!st) throw new GenReject("no blank tag");
  const correct = stmtText(st);
  const goal = evaluate(target, program, run(program));
  const choices = [];
  for (const c of candidates) {
    const p = clone(program), s2 = findTag(p, tag);
    Object.keys(s2).forEach((k) => { if (!["id", "tag", "mark"].includes(k)) delete s2[k]; });
    Object.assign(s2, clone(c.stmt));
    let r; try { r = run(p, { stepLimit: 20000 }); } catch { continue; }
    const text = stmtText(c.stmt);
    const value = r.ok ? evaluate(target, p, r) : null;
    if (text !== correct && value !== goal && !choices.some((x) => x.choice === text)) choices.push({ choice: text, misconception: c.misconception, note: r.ok ? `With this statement the result would be ${value}.` : "With this statement the loop would not finish normally." });
  }
  if (choices.length < 3) throw new GenReject("not enough statement candidates");
  return {
    rng, program, concept, template, params, traceLoop, traceVars,
    prompt: `Which statement belongs in the blank so that ${goalText(goal)}?`,
    printOpts: { blank: st.id, blankText: "________________;" },
    choices: [{ choice: correct }, ...choices.slice(0, 3)], answer: correct, targetKind: "select-statement",
    explain: explain || `Only ${correct} produces ${goal}; each alternative changes how the state evolves across iterations.`,
  };
}

/**
 * "Identify the incorrect trace row": shows a student's trace of the loop
 * (condition-check rows) with exactly one corrupted row. Choices are row labels.
 */
export function badStep({ rng, program, tag, vars, corrupt, concept, template, params, why }) {
  const rows = checks(program, tag).slice(0, 6);
  if (rows.length < 4) throw new GenReject("trace too short");
  const k = rng.int(1, Math.min(rows.length, 5) - 1); // never row 0
  const table = rows.slice(0, Math.min(rows.length, 5)).map((r) => vars.map((v) => r.vars[v]));
  const before = table[k].slice();
  corrupt(table, k, rng);
  if (table[k].every((x, i) => x === before[i])) throw new GenReject("corruption had no effect");
  // later rows continue from the wrong row only in the corrupted column(s)? keep later rows correct so exactly one row is wrong.
  const labels = table.map((_, i) => `Row ${i + 1}`);
  const wrong = labels[k];
  const others = labels.filter((l, i) => i !== k);
  const picked = rng.sample(others, 3);
  return {
    rng, program, concept, template, params, traceLoop: tag, traceVars: vars,
    prompt: "A student recorded the variables each time the loop condition was checked. Which row is incorrect?",
    studentTrace: { columns: vars, rows: table.map((vals, i) => ({ label: labels[i], values: vals })) },
    choices: [{ choice: wrong }, ...picked.map((c) => ({ choice: c, misconception: "row-correct", note: `${c} matches the code: compare each value with the row above it.` }))],
    answer: wrong, targetKind: "bad-step",
    explain: `${wrong} should be ${vars.map((v, i) => `${v} = ${before[i]}`).join(", ")}. ${why || "Apply the body's statements, in order, to the previous row."}`,
  };
}
export const stateTarget = (tag, k, vars) => ({ kind: "stateAfter", tag, k, vars });
export function stateMutants(program, tag, k, vars, rows) {
  const ms = [];
  if (k - 1 >= 0) ms.push({ misconception: "missed-final", program, target: stateTarget(tag, k - 1, vars) });
  if (k + 1 < rows) ms.push({ misconception: "extra-iteration", program, target: stateTarget(tag, k + 1, vars) });
  return ms;
}
export { J, run, finalize, clone, findTag, walk };

/** Extra misconception distractors for "how many times" questions about a tagged loop. */
export function loopCountExtras(program, tagName, opts = {}) {
  const l = findTag(program, tagName); if (!l) return [];
  const res = run(program), rows = res.trace.filter((r) => r.loop === l.id);
  const cv = l.t === "for" ? l.init.name : (l.c.l?.t === "var" ? l.c.l.name : null);
  const out = [];
  if (cv) {
    const exit = rows.find((r) => !r.result)?.vars[cv];
    if (exit !== undefined && /^-?\d+$/.test(exit)) out.push({ choice: exit, misconception: "value-vs-count" });
    const lastTrue = [...rows].reverse().find((r) => r.result)?.vars[cv];
    if (lastTrue !== undefined && /^-?\d+$/.test(lastTrue)) out.push({ choice: lastTrue, misconception: "value-vs-count" });
  }
  const upd = l.t === "for" ? l.upd : l.body.find((s) => (s.t === "set" || s.t === "inc") && s.name === cv);
  if (upd && upd.t === "set" && upd.op !== "=" && !(upd.e.t === "num" && upd.e.v === 1 && (upd.op === "+=" || upd.op === "-="))) {
    const p = clone(program), l2 = findTag(p, tagName);
    const u2 = l2.t === "for" ? l2.upd : l2.body.find((s) => (s.t === "set" || s.t === "inc") && s.name === cv);
    u2.op = upd.op === "-=" || upd.op === "/=" ? "-=" : "+="; u2.e = J.n(1);
    try { const r2 = run(p, { stepLimit: 20000 }); if (r2.ok) out.push({ choice: String(opts.markId !== undefined ? r2.S[opts.markId] || 0 : r2.B[l2.id] || 0), misconception: "ignore-step" }); } catch {}
  }
  return out;
}
