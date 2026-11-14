/* Turns a family "spec" (program + target + misconception mutants) into a challenge. */
import { makeRng, hashString } from "./rng.js?v=loop-expansion-v2";
import { run, printProgram, clone, walk, findTag, findMark, displayValue, staticShape, J, walkExpr } from "./java-model.js?v=loop-quality-v1";

export const MISCONCEPTIONS = {
  "extra-iteration": "This counts one more iteration than the condition allows. Check the boundary: the loop stops as soon as the condition is false.",
  "missed-final": "This stops one iteration early. The last value that still satisfies the condition is processed too.",
  "boundary": "This treats the boundary as inclusive when it is exclusive (or the reverse). Compare < with <= (or > with >=).",
  "cond-vs-body": "This mixes up condition checks and body executions. A loop checks its condition one more time than its body runs (unless break ends it).",
  "body-vs-cond": "This counts body executions, but the question asks how many times the condition is evaluated.",
  "ignore-inner": "This counts only the outer loop. The inner loop runs completely on every outer iteration.",
  "outer-times-inner-max": "This treats a dependent inner bound as if it were constant. The inner bound changes with the outer variable.",
  "ignore-condition": "This ignores the if condition, as if the statement ran on every iteration.",
  "zero-while-boundary": "The while condition is checked before the body. It is false on the first check, so the body runs zero times and the variable keeps its initial value. Zero is the boundary, not the final value.",
  "inverted-condition": "This counts the cases where the condition is false instead of true.",
  "accum-overwrite": "This replaces the accumulator instead of adding to it. += keeps the running total; = discards it.",
  "accum-init": "This ignores the accumulator's starting value.",
  "int-division": "This uses decimal division. When both operands are int, Java's / truncates toward zero.",
  "decimal-expected": "This truncates, but one operand is a double, so Java keeps the fractional part.",
  "update-order": "This applies the statements in the wrong order. Inside the body, each statement sees the results of the statements before it.",
  "sentinel-processed": "This processes the sentinel as if it were ordinary data. The sentinel only signals the end.",
  "past-sentinel": "This keeps processing values after the sentinel. The loop stops when the sentinel appears.",
  "ignore-break": "This ignores break. When break runs, the loop ends immediately.",
  "ignore-continue": "This ignores continue. continue skips the rest of the body for that iteration.",
  "break-outer": "This treats break as ending every loop. break exits only the innermost loop that contains it.",
  "printed-vs-final": "This is a value that was printed, not the variable's final value.",
  "initial-value": "This uses the starting value and overlooks the updates.",
  "last-in-loop": "This is the last value used inside the loop body. After the final update the variable has moved past it.",
  "wrong-operator": "This swaps % and /. % gives the last digit (remainder); / removes it.",
  "flag-reset": "This assumes the flag can switch back. Once set, the flag stays true unless code changes it again.",
  "first-vs-last": "This picks the first match when the loop keeps going (or the last match when the loop stops early).",
  "off-start": "This starts counting from the wrong initial value.",
  "update-count": "This counts update executions. The update runs once after each completed body execution.",
  "nested-break-cond": "With break, the loop exits before the final condition check, so condition checks equal body executions.",
  "comparison-scope": "This counts only some of the comparisons. Count every relational operator each time it is evaluated, including loop conditions.",
  "string-reverse": "This builds the String in the opposite order. Prepending (x + s) reverses; appending (s + x) keeps order.",
  "char-arithmetic": "Adding a char to an int produces a number, not a letter.",
  "growth-linear": "This assumes the work grows in proportion to n.",
  "growth-quadratic": "This assumes nested work that grows with n × n.",
  "growth-log": "This assumes the loop variable is repeatedly multiplied or divided.",
  "growth-constant": "This assumes the amount of work does not depend on n.",
  "wrong-loop": "This reads the count for the other loop.",
  "min-init": "This initializes the running minimum/maximum to 0 instead of a real data value.",
  "comparison-direction": "This uses the opposite comparison, finding the other extreme.",
  "tie-handling": "With >= (or <=) a tie also triggers the update; with > (or <) it does not.",
  "gcd-swap": "This updates the variables in the wrong order, losing a value before it is used.",
  "divisor-bound": "This uses the wrong divisor range (excluding or including the number itself).",
  "reverse-no-shift": "This forgets to multiply by 10 before adding the next digit.",
  "value-vs-index": "This is an element's value, but the variable stores an index (a position).",
  "ignore-step": "This counts as if the loop variable changed by 1 each time; the update changes it by a different amount.",
  "value-vs-count": "This is a value of the loop variable, not the number of iterations.",
  "runs-once": "This assumes the body runs at least once. A while or for loop checks its condition first.",
  "direction": "This moves the variable in the wrong direction.",
  "wrong-operation": "This counts a different operation than the one the question names.",
  "same-work": "Computing the same result does not mean doing the same amount of work.",
  "post-update": "This is the loop variable's value after the final update. The assignment in the body ran before that update.",
  "sum-vs-count": "This mixes up adding values with counting them (or the reverse).",
  "ignore-final-step": "This leaves out the statement that runs after the loop ends.",
  "logic-operator": "This swaps && and ||. With &&, every part of the condition must be true for another iteration; with ||, one true part is enough.",
  "trace-slip": "Trace the condition and each update in the order Java executes them.",
  "fallback": "This value does not match any step of the trace.",
};

const fmtVal = (x) => displayValue(x);
function finalLoop(program, tagName) { return tagName ? findTag(program, tagName) : (() => { let l = null; walk(program, (s) => { if (!l && (s.t === "for" || s.t === "while")) l = s; }); return l; })(); }

/* Evaluate a target against a run result. Returns a display string or null if undefined. */
export function evaluate(target, program, res) {
  if (!res.ok && target.kind !== "error") return null;
  switch (target.kind) {
    case "var": { const x = res.vars[target.name]; return x ? fmtVal(x) : null; }
    case "output": return res.output.length ? res.output.join("\n") : "(no output)";
    case "lastOutput": return res.output.length ? res.output.at(-1) : null;
    case "lineOutput": return res.output[target.line - 1] ?? null;
    case "outputCount": return String(res.output.length);
    case "body": { const l = findTag(program, target.tag); return String(res.B[l.id] || 0); }
    case "cond": { const l = findTag(program, target.tag); return String(res.C[l.id] || 0); }
    case "upd": { const l = findTag(program, target.tag); return String(res.S[l.upd.id] || 0); }
    case "mark": { const s = findMark(program, target.label); return s ? String(res.S[s.id] || 0) : null; }
    case "markSum": return String(target.labels.reduce((t, lab) => { const s = findMark(program, lab); return t + (s ? res.S[s.id] || 0 : 0); }, 0));
    case "comparisons": return String(res.K);
    case "stateAfter": {
      const l = findTag(program, target.tag), rows = res.trace.filter((r) => r.loop === l.id);
      const row = rows[target.k]; if (!row) return null;
      return target.vars.map((v) => `${v} = ${row.vars[v]}`).join(", ");
    }
    case "terminate": {
      const l = findTag(program, target.tag), rows = res.trace.filter((r) => r.loop === l.id && !r.result);
      const row = rows[0]; return row ? (target.vars ? target.vars.map((v) => `${v} = ${row.vars[v]}`).join(", ") : row.vars[target.var]) : null;
    }
    case "vars": return target.names.map((n) => `${n} = ${res.vars[n] ? fmtVal(res.vars[n]) : "?"}`).join(", ");
    case "pair": return target.parts.map((p) => `${p.label}: ${evaluate(p.target, program, res)}`).join(" · ");
  }
  throw new Error("target " + target.kind);
}

/* Generic mutators keyed by misconception. Each returns a mutated program clone or null. */
const REL_FLIP = { "<": "<=", "<=": "<", ">": ">=", ">=": ">" };
export const mutate = {
  boundary(program, tag) { const p = clone(program), l = finalLoop(p, tag); if (!l || !REL_FLIP[l.c.op]) return null; l.c.op = REL_FLIP[l.c.op]; return p; },
  /** Under-count misconception ("stops one iteration early"): tighten a simple loop bound by exactly one step. */
  shrink(program, tag) {
    const p = clone(program), l = finalLoop(p, tag); if (!l || !l.c || l.c.t !== "bin") return null;
    const c = l.c, num = c.r && c.r.t === "num";
    if (c.op === "<=") c.op = "<"; else if (c.op === ">=") c.op = ">";
    else if (c.op === "<" && num) c.r = J.n(c.r.v - 1); else if (c.op === ">" && num) c.r = J.n(c.r.v + 1);
    else return null;
    return p;
  },
  /** Start-value slip ("off-start"): move a numeric loop-control start by delta (either direction). */
  shiftStart(program, tag, delta) {
    const p = clone(program), l = finalLoop(p, tag); if (!l) return null;
    if (l.t === "for") { if (!l.init || !l.init.e || l.init.e.t !== "num") return null; l.init.e = J.n(l.init.e.v + delta); return p; }
    const name = l.c && l.c.l && l.c.l.t === "var" ? l.c.l.name : null; if (!name) return null; let hit = false;
    walk(p, (st) => { if (!hit && st.t === "decl" && st.name === name && st.e && st.e.t === "num") { st.e = J.n(st.e.v + delta); hit = true; } });
    return hit ? p : null;
  },
  /** Logical-operator slip: swap && and || at the top of a loop condition. */
  swapLogic(program, tag) { const p = clone(program), l = finalLoop(p, tag); if (!l || !l.c || l.c.t !== "bin" || !["&&", "||"].includes(l.c.op)) return null; l.c.op = l.c.op === "&&" ? "||" : "&&"; return p; },
  /** Boundary slip inside an if: treat the first relational test as inclusive instead of exclusive (or the reverse). */
  flipIf(program) { const p = clone(program); let hit = false; walk(p, (st) => { if (!hit && st.t === "if" && st.c && st.c.t === "bin" && REL_FLIP[st.c.op]) { st.c.op = REL_FLIP[st.c.op]; hit = true; } }); return hit ? p : null; },
  removeAll(program, type) { const p = clone(program); let hit = false; const strip = (list) => list.filter((s) => { if (s.t === type) { hit = true; return false; } return true; }); walk(p, (s) => { if (s.body) s.body = strip(s.body); if (s.then) s.then = strip(s.then); if (s.els) s.els = strip(s.els); }); const top = strip(p); return hit ? top : null; },
  ifAlways(program, tag) { const p = clone(program); let hit = false; walk(p, (s) => { if (s.t === "if" && (!tag || s.tag === tag)) { s.c = J.b(true); hit = true; } }); return hit ? p : null; },
  ifInvert(program, tag) { const p = clone(program); let hit = false; walk(p, (s) => { if (s.t === "if" && (!tag || s.tag === tag)) { s.c = J.not(s.c); hit = true; } }); return hit ? p : null; },
  overwrite(program, name) { const p = clone(program); let hit = false; walk(p, (s) => { if (s.t === "set" && s.name === name && s.op === "+=") { s.op = "="; hit = true; } }); return hit ? p : null; },
  setInit(program, name, value) { const p = clone(program); let hit = false; walk(p, (s) => { if (s.t === "decl" && s.name === name) { s.e = value; hit = true; } }); return hit ? p : null; },
  swapBody(program, tag, i = 0, j = 1) { const p = clone(program), l = findTag(p, tag); if (!l || l.body.length <= Math.max(i, j)) return null; [l.body[i], l.body[j]] = [l.body[j], l.body[i]]; return p; },
  edit(program, fn) { const p = clone(program); return fn(p) === false ? null : p; },
};

function traceTable(spec, program, res) {
  const l = finalLoop(program, spec.traceLoop);
  if (!l) return null;
  const vars = spec.traceVars || [];
  const cond = printProgram([l]).code.split("\n")[0].replace(/\s*\{$/, "");
  const rows = res.trace.filter((r) => r.loop === l.id).map((r, i) => ({ check: i + 1, values: vars.map((v) => r.vars[v] ?? "—"), result: r.result }));
  const capped = res.trace.length >= 600;
  let shown = rows, truncated = false;
  if (rows.length > 10) { shown = [...rows.slice(0, 5), null, ...rows.slice(-4)]; truncated = true; }
  return { loop: cond, columns: vars, rows: shown, totalChecks: rows.length, truncated, capped };
}

export function metadata(program, res) {
  const shape = staticShape(program);
  const iterations = Object.values(res.B).reduce((a, b) => a + b, 0);
  const m = {
    loopIterations: iterations,
    changingVariables: res.changed.length,
    nestingDepth: shape.nestingDepth,
    loops: shape.loops,
    accumulatorUpdates: res.accWrites,
    conditions: shape.ifs + shape.loops + shape.logicalOperators,
    stateTransitions: res.writes,
    tracedOperations: res.steps,
    dependentBounds: shape.dependentBounds,
    earlyExits: shape.earlyExits,
  };
  m.score = Math.round(10 * (m.nestingDepth * 3 + m.loops * 1.5 + m.changingVariables * 1.5 + m.conditions * 1.2 + m.dependentBounds * 2.5 + m.earlyExits * 1.5 + Math.log2(1 + m.stateTransitions) * 1.4 + Math.log2(1 + m.loopIterations))) / 10;
  return m;
}

const KEYWORDS = new Set("int double boolean String char for while if else break continue true false System out println print length charAt substring new".split(" "));
export function structuralSignature(code, targetKind) {
  const ids = new Map();
  const norm = code
    .replace(/"(?:[^"\\]|\\.)*"/g, "$S").replace(/'(?:[^'\\]|\\.)'/g, "$C")
    .replace(/\/\/ [A-Z]\b/g, "//M")
    .replace(/\b\d+(\.\d+)?\b/g, "#")
    .replace(/\b[A-Za-z_]\w*\b/g, (w) => (KEYWORDS.has(w) ? w : (ids.has(w) || ids.set(w, "v" + ids.size), ids.get(w))))
    .replace(/\s+/g, " ");
  return norm + "|" + targetKind;
}

/**
 * Build a challenge from a spec.
 * spec: { program, prompt, target, concept, template, explain(answer,res)->string,
 *         mutants: [{misconception, program|null}], extraDistractors: [{choice, misconception}],
 *         choices (custom fixed choice set) + answer (for code-choice questions),
 *         traceLoop, traceVars, params, allowError }
 */
/* Choose 3 distinct distractors from the misconception pool. Order of the pool (how a family lists its mutants) must not decide
 * which values appear or where they fall relative to the answer: for numeric answers the number of smaller distractors is drawn
 * at random from what the pool can supply, then each side is sampled preferring distinct misconceptions. */
export function selectDistractors(pool, answer, rng) {
  const seen = new Set(); const cand = [];
  for (const d of pool) if (d.choice !== "" && d.choice !== answer && !seen.has(d.choice)) { seen.add(d.choice); cand.push(d); }
  const pick = (list, n) => { const out = [], tags = new Set(); const bag = rng.shuffle(list.slice()); for (const d of bag) if (out.length < n && !tags.has(d.note || d.misconception)) { out.push(d); tags.add(d.note || d.misconception); } for (const d of bag) if (out.length < n && !out.includes(d)) out.push(d); return out; };
  if (cand.length <= 3) return cand.slice(0, 3);
  if (!/^-?\d+$/.test(answer)) return pick(cand, 3);
  const a = Number(answer), numeric = cand.every((d) => /^-?\d+$/.test(d.choice));
  if (!numeric) return pick(cand, 3);
  const below = cand.filter((d) => Number(d.choice) < a), above = cand.filter((d) => Number(d.choice) > a);
  const kmin = Math.max(0, 3 - above.length), kmax = Math.min(3, below.length);
  if (kmin > kmax) return pick(cand, 3);
  const k = kmin + Math.floor(rng.next() * (kmax - kmin + 1));
  return [...pick(below, k), ...pick(above, 3 - k)];
}

/* Generic near-miss values (used only when a family cannot model three distinct mistakes). They are sampled, not taken in a fixed
 * order, and how many fall below the answer is drawn at random within what is feasible, so the filler does not form a rank pattern. */
export function completeWithFallback(existing, answer, rng) {
  const a = Number(answer), out = existing.slice(), need = 3 - out.length; if (need <= 0) return out;
  const taken = new Set([answer, ...out.map((d) => d.choice)]);
  const mk = (v) => ({ choice: String(v), misconception: "fallback" });
  const ok = (v) => !taken.has(String(v)) && !(v < 0 && a >= 0);
  const below = [1, 2, 3, 5].map((o) => a - o).filter(ok), above = [1, 2, 3, 5, 10].map((o) => a + o).filter(ok);
  const eb = out.filter((d) => /^-?\d+$/.test(d.choice) && Number(d.choice) < a).length;
  const lo = Math.max(0, need - above.length), hi = Math.min(need, below.length);
  const kb = lo > hi ? 0 : lo + Math.floor(rng.next() * (hi - lo + 1));
  void eb;
  const pickN = (list, n) => rng.shuffle(list.slice()).slice(0, n);
  for (const v of [...pickN(below, kb), ...pickN(above, need - kb)]) out.push(mk(v));
  for (const off of [1, -1, 2, -2, 3, 5, 10]) { if (out.length >= 3) break; const v = a + off; if (!out.some((d) => d.choice === String(v)) && String(v) !== answer && !(v < 0 && a >= 0)) out.push(mk(v)); }
  return out;
}

export function buildChallenge(spec) {
  const program = spec.program;
  const res = run(program);
  if (!res.ok && !spec.allowError) throw new GenReject("program raised " + res.error);
  const shown = printProgram(program, spec.printOpts || {});
  let answer, distractors;
  if (spec.choices) {
    answer = spec.answer;
    distractors = spec.choices.filter((c) => c.choice !== answer);
  } else {
    answer = evaluate(spec.target, program, res);
    if (answer === null || answer === "") throw new GenReject("target undefined or empty");
    const pool = [];
    for (const m of spec.mutants || []) {
      if (!m || !m.program) continue;
      let r2; try { r2 = run(m.program, { stepLimit: 20000 }); } catch { continue; }
      if (!r2.ok) continue;
      let value; try { value = m.target ? evaluate(m.target, m.program, r2) : evaluate(spec.target, m.program, r2); } catch { continue; }
      if (value !== null) pool.push({ choice: value, misconception: m.misconception, note: m.note });
    }
    for (const d of spec.extraDistractors || []) if (d && d.choice !== null && d.choice !== undefined) pool.push({ choice: String(d.choice), misconception: d.misconception });
    if (!spec.authoredDistractors) {
      // Automatic under-count candidate so the pool has plausible values on both sides of the answer.
      if (["var", "body", "cond", "upd", "mark", "markSum"].includes(spec.target.kind) && /^-?\d+$/.test(answer) && !pool.some((d) => d.misconception === "missed-final")) {
        const sp = mutate.shrink(program, spec.traceLoop || "main");
        if (sp) { try { const r3 = run(sp, { stepLimit: 20000 }); const v3 = r3.ok ? evaluate(spec.target, sp, r3) : null; if (v3 !== null && v3 !== answer) pool.push({ choice: v3, misconception: "missed-final" }); } catch { /* candidate only */ } }
      }
      if (["var", "body", "cond", "upd", "mark", "markSum"].includes(spec.target.kind) && /^-?\d+$/.test(answer)) {
        for (const delta of [1, -1]) {
          const sp = mutate.shiftStart(program, spec.traceLoop || "main", delta); if (!sp) continue;
          try { const r4 = run(sp, { stepLimit: 20000 }); const v4 = r4.ok ? evaluate(spec.target, sp, r4) : null; if (v4 !== null && v4 !== answer) pool.push({ choice: v4, misconception: "off-start" }); } catch { /* candidate only */ }
        }
      }
      if (["var", "body", "cond", "upd", "mark", "markSum"].includes(spec.target.kind) && /^-?\d+$/.test(answer)) {
        // compound slip: begins one step late AND stops one step early (two independent boundary errors)
        const half = mutate.shrink(program, spec.traceLoop || "main"), sp = half && mutate.shiftStart(half, spec.traceLoop || "main", 1);
        if (sp) { try { const r5 = run(sp, { stepLimit: 20000 }); const v5 = r5.ok ? evaluate(spec.target, sp, r5) : null; if (v5 !== null && v5 !== answer) pool.push({ choice: v5, misconception: "missed-final" }); } catch { /* candidate only */ } }
      }
      if (["var", "body", "cond", "upd", "mark", "markSum"].includes(spec.target.kind) && /^-?\d+$/.test(answer)) {
        const sp = mutate.swapLogic(program, spec.traceLoop || "main");
        if (sp) { try { const r6 = run(sp, { stepLimit: 20000 }); const v6 = r6.ok ? evaluate(spec.target, sp, r6) : null; if (v6 !== null && v6 !== answer) pool.push({ choice: v6, misconception: "logic-operator" }); } catch { /* candidate only */ } }
      }
      if (["var", "body", "cond", "upd", "mark", "markSum"].includes(spec.target.kind) && /^-?\d+$/.test(answer)) {
        const sp = mutate.flipIf(program);
        if (sp) { try { const r7 = run(sp, { stepLimit: 20000 }); const v7 = r7.ok ? evaluate(spec.target, sp, r7) : null; if (v7 !== null && v7 !== answer) pool.push({ choice: v7, misconception: "boundary" }); } catch { /* candidate only */ } }
      }
    }
    distractors = selectDistractors(pool, answer, makeRng(hashString(`${shown.code}|${answer}|${spec.prompt}`)));
    if (distractors.length < 3 && !spec.authoredDistractors && spec.fallback !== false && /^-?\d+$/.test(answer)) {
      distractors = completeWithFallback(distractors, answer, makeRng(hashString(`fb|${shown.code}|${answer}|${spec.prompt}`)));
    }
  }
  if (distractors.length < 3) throw new GenReject(`only ${distractors.length} distinct distractors`);
  distractors = distractors.slice(0, 3).map((d) => ({ ...d, note: d.note || MISCONCEPTIONS[d.misconception] || "" }));
  const rng = spec.rng;
  const choices = rng.shuffle([answer, ...distractors.map((d) => d.choice)]);
  const trace = spec.noTrace ? null : traceTable(spec, program, res);
  const meta = metadata(program, res);
  const explanation = typeof spec.explain === "function" ? spec.explain(answer, res) : spec.explain;
  return {
    code: spec.codeOverride || shown.code, lines: shown.lines, prompt: spec.prompt, answer, correctAnswer: answer, choices, distractors,
    choiceFormat: spec.choiceFormat || (choices.some((c) => c.includes("\n")) ? "block" : "value"),
    explanation, trace, output: res.output, metadata: meta, concept: spec.concept, template: spec.template,
    params: spec.params || {}, targetKind: spec.target?.kind || spec.targetKind || "custom",
    javaProgram: spec.fixedProgram || program, buggyProgram: spec.fixedProgram ? program : null, studentTrace: spec.studentTrace || null, expectsError: !res.ok ? res.error : null,
    verify: spec.verify || null,
  };
}
export class GenReject extends Error {}
export { walkExpr };
