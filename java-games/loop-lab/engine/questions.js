/* Turns a family "spec" (program + target + misconception mutants) into a challenge. */
import { run, printProgram, clone, walk, findTag, findMark, displayValue, staticShape, J, walkExpr } from "./java-model.js?v=loop-expansion-v2";

export const MISCONCEPTIONS = {
  "extra-iteration": "This counts one more iteration than the condition allows. Check the boundary: the loop stops as soon as the condition is false.",
  "missed-final": "This stops one iteration early. The last value that still satisfies the condition is processed too.",
  "boundary": "This treats the boundary as inclusive when it is exclusive (or the reverse). Compare < with <= (or > with >=).",
  "cond-vs-body": "This mixes up condition checks and body executions. A loop checks its condition one more time than its body runs (unless break ends it).",
  "body-vs-cond": "This counts body executions, but the question asks how many times the condition is evaluated.",
  "ignore-inner": "This counts only the outer loop. The inner loop runs completely on every outer iteration.",
  "outer-times-inner-max": "This treats a dependent inner bound as if it were constant. The inner bound changes with the outer variable.",
  "ignore-condition": "This ignores the if condition, as if the statement ran on every iteration.",
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
      if (value !== null) pool.push({ choice: value, misconception: m.misconception });
    }
    for (const d of spec.extraDistractors || []) if (d && d.choice !== null && d.choice !== undefined) pool.push({ choice: String(d.choice), misconception: d.misconception });
    distractors = [];
    for (const d of pool) if (d.choice !== "" && d.choice !== answer && !distractors.some((x) => x.choice === d.choice) && distractors.length < 3) distractors.push(d);
    if (distractors.length < 3 && spec.fallback !== false && /^-?\d+$/.test(answer)) {
      const a = Number(answer);
      for (const off of [1, -1, 2, -2, 3, 5, 10]) {
        if (distractors.length >= 3) break;
        const c = String(a + off); if (a + off < 0 && a >= 0) continue;
        if (c !== answer && !distractors.some((x) => x.choice === c)) distractors.push({ choice: c, misconception: "fallback" });
      }
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
