/* Count the Executions — ten reasoning families. Every prompt names exactly which
 * operation is counted (a marked statement, a condition, an update, or comparisons). */
import { J, P, V, N, lvl, range, clone, findTag, run, stmtText, loopCountExtras } from "./fam-util.js?v=loop-expansion-v2";
import { mutate, GenReject, evaluate } from "./questions.js?v=loop-expansion-v2";
import { tag, mark, printProgram, exprStr } from "./java-model.js?v=loop-expansion-v2";
import { applyVariety } from "./variety.js?v=loop-expansion-v2";

const choose = (rng, d, templates) => rng.pick(templates.filter(([lo, hi]) => lvl(d) >= lo && lvl(d) <= hi))[2];
const condText = (loop) => exprStr(loop.c);
const COUNT_PROMPT = {
  mark: () => "How many times does the statement marked // A execute?",
  cond: (loop) => `How many times is the loop condition ${condText(loop)} evaluated, including the final check that ends the loop?`,
  condBreak: (loop) => `How many times is the loop condition ${condText(loop)} evaluated?`,
  upd: (loop) => `How many times does the update ${stmtText(loop.upd)} execute?`,
  comparisons: () => "Counting every evaluation of a comparison operator (<, <=, >, >=, ==, !=) in the loop and if conditions, how many comparisons are performed?",
};
/** Standard counting mutants for a single loop target. */
function countMutants(program, loopTag, target) {
  const ms = [{ misconception: "boundary", program: mutate.boundary(program, loopTag) }];
  if (target.kind === "mark" || target.kind === "body") ms.push({ misconception: "cond-vs-body", program, target: { kind: "cond", tag: loopTag } });
  if (target.kind === "cond") ms.push({ misconception: "body-vs-cond", program, target: { kind: "body", tag: loopTag } });
  if (target.kind === "upd") ms.push({ misconception: "cond-vs-body", program, target: { kind: "cond", tag: loopTag } });
  return ms;
}
const ask = (rng, d, opts) => rng.pick(opts.filter(([lo, hi]) => lvl(d) >= lo && lvl(d) <= hi).map((x) => x[2]));
function targetFor(kind, loop) {
  if (kind === "mark") return { kind: "mark", label: "A" };
  return { kind, tag: loop.tag };
}
function promptFor(kind, loop, hasBreak = false) {
  if (kind === "cond") return hasBreak ? COUNT_PROMPT.condBreak(loop) : COUNT_PROMPT.cond(loop);
  return COUNT_PROMPT[kind](loop);
}
const loopSeq = (start, cmp, bound, stepFn) => { const o = []; let x = start; while (cmp(x, bound) && o.length < 500) { o.push(x); x = stepFn(x); } return o; };
const CMP = { "<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b, "!=": (a, b) => a !== b };

/* ---------- A. Simple loop-body counts ---------- */
const simple = {
  id: "simple-counts", name: "Simple loop-body counts",
  generate(rng, d) {
    const countMutantsExtra = [];
    const L = lvl(d), up = rng.chance(0.6), useWhile = rng.chance(L === 0 ? 0.25 : 0.45);
    const v = rng.pick(["i", "k", "count", "step"].filter((x) => x !== "count")), acc = rng.pick(["total", "count", "hits"]);
    const start = up ? rng.int(0, 5) : rng.int(8, 15), len = rng.int([3, 4, 6][L], [8, 12, 15][L]);
    const op = up ? rng.pick(["<", "<="]) : rng.pick([">", ">="]);
    const bound = up ? start + len - (op === "<=" ? 1 : 0) : start - len + (op === ">=" ? 1 : 0);
    const cap = L === 2 ? rng.int(Math.max(3, len - 4), len + 2) : null;
    const cond = cap !== null ? J.and(J.bin(op, V(v), N(bound)), J.lt(V(acc), N(cap))) : J.bin(op, V(v), N(bound)), upd = up ? J.inc(v) : J.dec(v);
    const body = [mark(J.inc(acc), "A")];
    const loop = useWhile ? tag(J.whileL(cond, [...body, upd]), "main") : tag(J.forL(J.decl("int", v, N(start)), cond, upd, body), "main");
    const program = P([J.decl("int", acc, N(0)), ...(useWhile ? [J.decl("int", v, N(start))] : []), loop]);
    const kind = ask(rng, d, [[0, 2, "mark"], [1, 2, "cond"], [1, 2, "upd"]].filter((x) => !(useWhile && x[2] === "upd")));
    if (cap !== null) countMutantsExtra.push({ misconception: "comparison-scope", program: mutate.edit(program, (q) => { findTag(q, "main").c = findTag(q, "main").c.l; }) });
    const target = targetFor(kind, loop);
    const seq = loopSeq(start, CMP[op], bound, (x) => (up ? x + 1 : x - 1));
    return {
      program, target, template: `${useWhile ? "while" : "for"}-${up ? "up" : "down"}-${kind}`, concept: kind === "cond" ? "condition evaluations vs body executions" : kind === "upd" ? "update executions" : "loop-body executions",
      prompt: promptFor(kind, loop), params: { start, bound, op, up, cap }, traceLoop: "main", traceVars: cap !== null ? [v, acc] : [v],
      mutants: [...countMutantsExtra.map((m) => ({ ...m, target })), ...countMutants(program, "main", target)],
      extraDistractors: [...loopCountExtras(program, "main"), { choice: String(Math.abs(bound - start)), misconception: "missed-final" }, { choice: String(Math.abs(bound - start) + 1), misconception: "extra-iteration" }, { choice: String(seq.length + 2), misconception: "cond-vs-body" }],
      explain: cap !== null ? `The condition has two parts; the loop stops when either fails. ${acc} reaches ${cap} after ${Math.min(cap, seq.length)} executions${cap < seq.length ? `, before ${v} reaches its bound` : ""}. The condition is checked once more than the body runs.` : `${v} takes ${seq.length ? seq.join(", ") : "no values"} (${seq.length} body execution${seq.length === 1 ? "" : "s"}). The condition is checked ${seq.length + 1} times — once more than the body, because the final check fails.${kind === "upd" ? ` The update runs after each body execution: ${seq.length} times.` : ""}`,
    };
  },
};

/* ---------- B. Non-unit increments ---------- */
const nonUnit = {
  id: "non-unit-updates", name: "Non-unit increments",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 1, "add"], [0, 1, "sub"], [1, 2, "mul"], [1, 2, "div"], [2, 2, "growing-step"], [2, 2, "double-update"]]);
    const v = rng.pick(["i", "x", "n"]);
    let init, cond, upd, desc, step;
    if (t === "add") { step = rng.int(2, L === 0 ? 3 : 5); init = rng.int(0, 4); const b = init + step * rng.int(3, 6) + rng.int(-1, step - 1); cond = J.bin(rng.pick(["<", "<="]), V(v), N(b)); upd = J.op(v, "+=", N(step)); desc = `adds ${step}`; }
    if (t === "sub") { step = rng.int(2, L === 0 ? 3 : 5); init = rng.int(15, 30); const b = rng.int(0, 6); cond = J.bin(rng.pick([">", ">="]), V(v), N(b)); upd = J.op(v, "-=", N(step)); desc = `subtracts ${step}`; }
    if (t === "mul") { step = rng.pick([2, 2, 3]); init = rng.int(1, 3); const b = rng.int(20, 100); cond = J.bin(rng.pick(["<", "<="]), V(v), N(b)); upd = J.op(v, "*=", N(step)); desc = `multiplies by ${step}`; }
    if (t === "div") { step = 2; init = rng.int(20, 100); const b = rng.pick([0, 1, 2]); cond = J.bin(">", V(v), N(b)); upd = J.op(v, "/=", N(2)); desc = "halves (integer division)"; }
    if (t === "double-update") {
      const st = rng.int(2, 3), k = rng.int(3, 5), b = rng.int(18, 30);
      const program = P([J.decl("int", "count", N(0)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(b)), J.op("i", "+=", N(st)), [mark(J.inc("count"), "A"), J.iff(J.eq(J.mod(V("i"), N(k)), N(0)), [J.op("i", "+=", N(1))], null, { tag: "test", inline: true })]), "main")]);
      return {
        program, target: { kind: "mark", label: "A" }, template: "header-and-body-updates", concept: "loop variable updated in the header and the body",
        prompt: COUNT_PROMPT.mark(), params: { st, k, b }, traceLoop: "main", traceVars: ["i", "count"],
        mutants: [{ misconception: "ignore-condition", program: mutate.edit(program, (q) => { findTag(q, "main").body.pop(); }) }, { misconception: "cond-vs-body", program, target: { kind: "cond", tag: "main" } }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "ignore-step", program: mutate.edit(program, (q) => { findTag(q, "main").upd = J.inc("i"); }) }],
        explain: `i normally advances by ${st}, but whenever i is a multiple of ${k} the body adds 1 more before the header update. Trace i to see when it reaches ${b}.`,
      };
    }
    if (t === "growing-step") {
      const lim = rng.int(15, 40);
      const program = P([J.decl("int", "x", N(0)), J.decl("int", "stepSize", N(1)), tag(J.whileL(J.lt(V("x"), N(lim)), [mark(J.op("x", "+=", V("stepSize")), "A"), J.inc("stepSize")]), "main")]);
      return {
        program, target: { kind: "mark", label: "A" }, template: "growing-step", concept: "step size that changes each iteration",
        prompt: COUNT_PROMPT.mark(), params: { lim }, traceLoop: "main", traceVars: ["x", "stepSize"],
        mutants: [{ misconception: "cond-vs-body", program, target: { kind: "cond", tag: "main" } }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "growth-linear", program: mutate.edit(program, (q) => { findTag(q, "main").body.pop(); }) }],
        explain: `x grows by 1, 2, 3, … so the loop needs far fewer than ${lim} iterations: it stops at the first check where x ≥ ${lim}.`,
      };
    }
    const useWhile = rng.chance(0.5);
    const loop = useWhile ? tag(J.whileL(cond, [mark(J.inc("count"), "A"), upd]), "main") : tag(J.forL(J.decl("int", v, N(init)), cond, upd, [mark(J.inc("count"), "A")]), "main");
    const program = P([J.decl("int", "count", N(0)), ...(useWhile ? [J.decl("int", v, N(init))] : []), loop]);
    const kind = ask(rng, d, [[0, 2, "mark"], [1, 2, "cond"]]);
    const target = targetFor(kind, loop);
    const r = run(program); const seq = r.trace.filter((x) => x.loop === loop.id && x.result).map((x) => x.vars[v]);
    if (seq.length < 2) throw new GenReject("too few");
    return {
      program, target, template: `${t}-${useWhile ? "while" : "for"}-${kind}`, concept: `update that ${desc}`,
      prompt: promptFor(kind, loop), params: { init, step, t }, traceLoop: "main", traceVars: [v],
      extraDistractors: loopCountExtras(program, "main", { markId: findMarkIdOf(program, "A") }),
      mutants: [...countMutants(program, "main", target), { misconception: "growth-linear", program: mutate.edit(program, (q) => { const l = findTag(q, "main"); const u = useWhile ? l.body[1] : l.upd; if (u.op === "*=" || u.op === "/=") { u.op = u.op === "*=" ? "+=" : "-="; } else { u.e = N(1); } }), target }],
      explain: `The update ${desc}, so ${v} takes ${seq.join(", ")} while the condition holds: ${seq.length} body executions${kind === "cond" ? ` and ${seq.length + 1} condition checks` : ""}.`,
    };
  },
};

/* ---------- C. Nested independent loops ---------- */
const nestedInd = {
  id: "nested-independent", name: "Nested independent loops",
  generate(rng, d) {
    const L = lvl(d), R = rng.int(2, 5 + L * 2), Cn = rng.int(2, 5 + L * 2);
    const ro = rng.pick(["row", "i", "outer"]), co = { row: "col", i: "j", outer: "inner" }[ro];
    const rIncl = rng.chance(0.4), cIncl = rng.chance(0.4);
    const rs = rIncl ? 1 : 0, cs = cIncl ? 1 : 0;
    const what = ask(rng, d, [[0, 2, "inner-mark"], [1, 2, "outer-mark"], [1, 2, "inner-cond"], [2, 2, "both-marks"], [2, 2, "inner-upd"]]);
    const inner = tag(J.forL(J.decl("int", co, N(cs)), cIncl ? J.le(V(co), N(Cn)) : J.lt(V(co), N(Cn)), J.inc(co), [what === "outer-mark" ? J.inc("cells") : mark(J.inc("cells"), "A")]), "inner");
    const outerBody = what === "outer-mark" || what === "both-marks" ? [mark(J.inc("rows"), what === "both-marks" ? "B" : "A"), inner] : [inner];
    const program = P([J.decl("int", "cells", N(0)), ...(outerBody.length > 1 ? [J.decl("int", "rows", N(0))] : []), tag(J.forL(J.decl("int", ro, N(rs)), rIncl ? J.le(V(ro), N(R)) : J.lt(V(ro), N(R)), J.inc(ro), outerBody), "main")]);
    let target, prompt;
    if (what === "inner-mark") { target = { kind: "mark", label: "A" }; prompt = COUNT_PROMPT.mark(); }
    if (what === "outer-mark") { target = { kind: "mark", label: "A" }; prompt = COUNT_PROMPT.mark(); }
    if (what === "inner-cond") { target = { kind: "cond", tag: "inner" }; prompt = `How many times is the inner condition ${condText(inner)} evaluated in total, including the check that ends each inner loop?`; }
    if (what === "inner-upd") { target = { kind: "upd", tag: "inner" }; prompt = `How many times does the inner update ${co}++ execute in total?`; }
    if (what === "both-marks") { target = { kind: "markSum", labels: ["A", "B"] }; prompt = "How many statement executions are there in total for the statements marked // A and // B combined?"; }
    return {
      program, target, template: `nested-rect-${what}`, concept: "inner loop restarts on every outer iteration",
      prompt, params: { R, Cn, rIncl, cIncl }, traceLoop: "main", traceVars: [ro, "cells"],
      mutants: [
        { misconception: "ignore-inner", program, target: { kind: "body", tag: "main" } },
        { misconception: "boundary", program: mutate.boundary(program, "inner") },
        { misconception: "cond-vs-body", program, target: what === "inner-cond" ? { kind: "body", tag: "inner" } : { kind: "cond", tag: "inner" } },
        { misconception: "boundary", program: mutate.boundary(program, "main") },
        { misconception: "comparison-scope", program, target: { kind: "mark", label: "A" } },
      ],
      extraDistractors: [{ choice: String(R + Cn), misconception: "ignore-inner" }],
      explain: `The outer loop runs ${R} times and, each time, the inner loop runs ${Cn} times: ${R} × ${Cn} = ${R * Cn} inner-body executions.${what === "inner-cond" ? ` Each inner loop checks its condition ${Cn + 1} times, so ${R} × ${Cn + 1} = ${R * (Cn + 1)}.` : ""}${what === "outer-mark" ? ` A statement in the outer body (outside the inner loop) runs once per outer iteration: ${R}.` : ""}`,
    };
  },
};

/* ---------- D. Dependent nested bounds ---------- */
const nestedDep = {
  id: "nested-dependent", name: "Dependent nested bounds",
  generate(rng, d) {
    const L = lvl(d), n = rng.int(3, 6 + L * 2);
    const work = rng.pick([["count", J.inc("count")], ["pairs", J.inc("pairs")], ["ops", J.op("ops", "+=", N(1))], ["steps", J.inc("steps")]]);
    const shape = choose(rng, d, [[0, 2, "j<i"], [0, 2, "j<=i"], [1, 2, "j=i..n"], [1, 2, "j=n..i"], [2, 2, "j<2i"], [2, 2, "outer-step"]]);
    let innerInit, innerCond, innerUpd = J.inc("j"), outerUpd = J.inc("i"), outerStart = 0, outerCond = J.lt(V("i"), N(n));
    if (shape === "j<i") { innerInit = N(0); innerCond = J.lt(V("j"), V("i")); }
    if (shape === "j<=i") { innerInit = N(0); innerCond = J.le(V("j"), V("i")); }
    if (shape === "j=i..n") { innerInit = V("i"); innerCond = J.lt(V("j"), N(n)); }
    if (shape === "j=n..i") { innerInit = N(n); innerCond = J.gt(V("j"), V("i")); innerUpd = J.dec("j"); }
    if (shape === "j<2i") { innerInit = N(0); innerCond = J.lt(V("j"), J.mul(N(2), V("i"))); outerStart = 1; outerCond = J.le(V("i"), N(n)); }
    if (shape === "outer-step") { innerInit = N(0); innerCond = J.lt(V("j"), V("i")); outerUpd = J.op("i", "+=", N(2)); outerCond = J.le(V("i"), N(n + 3)); }
    const inner = tag(J.forL(J.decl("int", "j", innerInit), innerCond, innerUpd, [mark(clone(work[1]), "A")]), "inner");
    const program = P([J.decl("int", work[0], N(0)), tag(J.forL(J.decl("int", "i", N(outerStart)), outerCond, outerUpd, [inner]), "main")]);
    const kind = L === 2 && rng.chance(0.35) ? "inner-cond" : "mark";
    const target = kind === "mark" ? { kind: "mark", label: "A" } : { kind: "cond", tag: "inner" };
    const res = run(program); const per = res.trace.filter((x) => x.loop === program[1].id && x.result).map((x) => x.vars.i);
    // per-row inner counts (independent closed forms)
    const rowCount = (i) => ({ "j<i": i, "j<=i": i + 1, "j=i..n": Math.max(0, n - i), "j=n..i": Math.max(0, n - i), "j<2i": 2 * i, "outer-step": i }[shape]);
    const rows = per.map((iv) => rowCount(Number(iv)));
    return {
      program, target, template: `triangular-${shape}-${kind}`, concept: "inner bound depends on the outer variable",
      prompt: kind === "mark" ? COUNT_PROMPT.mark() : `How many times is the inner condition ${condText(inner)} evaluated in total?`, params: { n, shape, rows },
      traceLoop: "main", traceVars: ["i", work[0]],
      mutants: [
        { misconception: "outer-times-inner-max", program: mutate.edit(program, (q) => { const f = findTag(q, "inner"); if (shape === "j=i..n") f.init.e = N(0); else if (shape === "j=n..i") f.c = J.gt(V("j"), N(0)); else f.c = J.bin(f.c.op, V("j"), N(n)); }), target },
        { misconception: "boundary", program: mutate.boundary(program, "inner"), target },
        { misconception: "ignore-inner", program, target: { kind: "body", tag: "main" } },
        { misconception: kind === "mark" ? "cond-vs-body" : "body-vs-cond", program, target: kind === "mark" ? { kind: "cond", tag: "inner" } : { kind: "mark", label: "A" } },
        { misconception: "boundary", program: mutate.boundary(program, "main"), target },
      ],
      explain: `The inner loop's length changes with i. Row by row it runs ${rows.join(" + ")} = ${rows.reduce((a, b) => a + b, 0)} times${kind === "inner-cond" ? `; each of the ${rows.length} inner loops checks its condition once more than it runs, adding ${rows.length}` : ""}.`,
    };
  },
};

/* ---------- E. Conditional execution ---------- */
const conditional = {
  id: "conditional-execution", name: "Conditional execution",
  generate(rng, d) {
    const L = lvl(d), n = rng.int(8, 14 + L * 6), start = rng.int(0, 2);
    const kindC = choose(rng, d, [[0, 2, "mod"], [0, 1, "range"], [1, 2, "and"], [1, 2, "or"], [2, 2, "else"], [2, 2, "nested-if"]]);
    const k = rng.int(2, 5), lo = rng.int(2, 5), hi = lo + rng.int(2, 5);
    let cond; const iv = V("i");
    if (kindC === "mod") cond = J.eq(J.mod(iv, N(k)), N(rng.int(0, k - 1)));
    if (kindC === "range") cond = J.bin(rng.pick([">", ">=", "<", "<="]), iv, N(lo + 2));
    if (kindC === "and") cond = J.and(J.ge(iv, N(lo)), J.le(iv, N(hi)));
    if (kindC === "or") cond = J.or(J.lt(iv, N(lo)), J.eq(J.mod(iv, N(k)), N(0)));
    let body, prompt = COUNT_PROMPT.mark(), target = { kind: "mark", label: "A" };
    if (kindC === "else") body = [J.iff(J.eq(J.mod(iv, N(k)), N(0)), [J.inc("hits")], [mark(J.inc("misses"), "A")], { tag: "test" })];
    else if (kindC === "nested-if") body = [J.iff(J.eq(J.mod(iv, N(2)), N(0)), [J.iff(J.gt(iv, N(lo + 3)), [mark(J.inc("hits"), "A")], null, { tag: "test2" })], null, { tag: "test" })];
    else body = [J.iff(cond, [mark(J.inc("hits"), "A")], null, { tag: "test", inline: rng.chance(0.4) })];
    const program = P([J.decl("int", "hits", N(0)), ...(kindC === "else" ? [J.decl("int", "misses", N(0))] : []), tag(J.forL(J.decl("int", "i", N(start)), J.lt(iv, N(n)), J.inc("i"), body), "main")]);
    const askIf = L >= 1 && kindC !== "nested-if" && rng.chance(0.25);
    if (askIf) { target = { kind: "cond", tag: "test" }; prompt = "How many times is the if condition evaluated?"; }
    if (L === 2 && rng.chance(0.3) && (kindC === "and" || kindC === "or")) { target = { kind: "comparisons" }; prompt = COUNT_PROMPT.comparisons(); }
    const sel = range(start, n - 1);
    return {
      program, target, template: `conditional-${kindC}-${target.kind}`, concept: target.kind === "comparisons" ? "short-circuit evaluation changes the comparison count" : "statement guarded by a condition",
      prompt, params: { n, start, k, lo, hi, kindC }, traceLoop: "main", traceVars: ["i", "hits"],
      mutants: [
        { misconception: "ignore-condition", program, target: { kind: "body", tag: "main" } },
        { misconception: "inverted-condition", program: mutate.ifInvert(program, kindC === "nested-if" ? "test2" : "test"), target },
        { misconception: "boundary", program: mutate.boundary(program, "main"), target },
        { misconception: "comparison-scope", program: kindC === "and" || kindC === "or" ? mutate.edit(program, (q) => { const t = findTag(q, "test"); t.c = J.bin(t.c.op, t.c.l, t.c.r); t.c.op = kindC === "and" ? "||" : "&&"; }) : null, target },
        { misconception: "ignore-condition", program: kindC === "nested-if" ? mutate.ifAlways(program, "test") : null, target },
      ],
      extraDistractors: [{ choice: String(sel.length), misconception: "ignore-condition" }, { choice: String(sel.length + 1), misconception: "cond-vs-body" }],
      explain: target.kind === "cond" ? `The if statement is reached on every iteration, so its condition is evaluated ${sel.length} times, whether or not it is true.` : target.kind === "comparisons" ? `The loop condition makes ${sel.length + 1} comparisons. Each if makes one comparison, plus a second only when ${kindC === "and" ? "the first is true (&& short-circuits on false)" : "the first is false (|| short-circuits on true)"}.` : `i takes ${sel.length} values (${start}–${n - 1}); // A runs only for those that ${kindC === "else" ? "fail the if condition (else branch)" : "satisfy the condition"}.`,
    };
  },
};

/* ---------- F. Early termination ---------- */
const early = {
  id: "early-termination", name: "Early termination",
  generate(rng, d) {
    const L = lvl(d), n = rng.int(6, 18 + L * 5);
    const t = choose(rng, d, [[0, 1, "break"], [1, 2, "break-cond"], [0, 1, "continue"], [1, 2, "flag-while"], [2, 2, "nested-break"], [1, 1, "break-after"]]);
    if (t === "break" || t === "break-cond" || t === "break-after") {
      const stop = rng.int(3, n - 2);
      const brkIf = J.iff(J.eq(V("i"), N(stop)), [J.brk()], null, { tag: "test", inline: true });
      const body = t === "break-after" ? [mark(J.inc("work"), "A"), brkIf] : [brkIf, mark(J.inc("work"), "A")];
      const loop = tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(n)), J.inc("i"), body), "main");
      const program = P([J.decl("int", "work", N(0)), loop]);
      const target = t === "break-cond" ? { kind: "cond", tag: "main" } : { kind: "mark", label: "A" };
      return {
        program, target, template: `${t}`, concept: t === "break-cond" ? "break skips the final condition check" : "break ends the loop immediately",
        prompt: t === "break-cond" ? COUNT_PROMPT.condBreak(loop) : COUNT_PROMPT.mark(), params: { n, stop, after: t === "break-after" }, traceLoop: "main", traceVars: ["i", "work"],
        mutants: [
          { misconception: "ignore-break", program: mutate.removeAll(program, "break"), target },
          { misconception: t === "break-cond" ? "nested-break-cond" : "cond-vs-body", program, target: t === "break-cond" ? { kind: "body", tag: "main" } : { kind: "cond", tag: "main" } },
          { misconception: "boundary", program: mutate.edit(program, (q) => { findTag(q, "test").c = J.eq(V("i"), N(stop + 1)); }), target },
          { misconception: "update-order", program: mutate.swapBody(program, "main"), target },
        ],
        extraDistractors: t === "break-cond" ? [{ choice: String(stop + 2), misconception: "nested-break-cond" }, { choice: String(n + 1), misconception: "ignore-break" }] : [{ choice: String(t === "break-after" ? stop : stop + 1), misconception: t === "break-after" ? "update-order" : "nested-break-cond" }, { choice: String(n), misconception: "ignore-break" }, { choice: String(stop + 2), misconception: "extra-iteration" }],
        explain: t === "break-cond" ? `The condition is checked for i = 0 through ${stop} (${stop + 1} times). When i is ${stop}, break exits before the update and before any further check.` : `// A runs for i = 0 through ${t === "break-after" ? stop : stop - 1}; the break ${t === "break-after" ? "comes after // A, so // A also runs on the iteration that breaks" : "comes first when i is " + stop}.`,
      };
    }
    if (t === "continue") {
      const k = rng.int(2, 4);
      const program = P([J.decl("int", "done", N(0)), tag(J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n)), J.inc("i"), [J.iff(J.eq(J.mod(V("i"), N(k)), N(0)), [J.cont()], null, { tag: "test", inline: true }), mark(J.inc("done"), "A")]), "main")]);
      return {
        program, target: { kind: "mark", label: "A" }, template: "continue-skip", concept: "continue skips the rest of the body",
        prompt: COUNT_PROMPT.mark(), params: { n, k }, traceLoop: "main", traceVars: ["i", "done"],
        mutants: [{ misconception: "ignore-continue", program: mutate.removeAll(program, "continue") }, { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "ignore-break", program: mutate.edit(program, (q) => { findTag(q, "test").then = [J.brk()]; }) }, { misconception: "boundary", program: mutate.boundary(program, "main") }],
        explain: `Of the ${n} iterations, ${Math.floor(n / k)} have i divisible by ${k}; continue skips // A on those, so it runs ${n - Math.floor(n / k)} times.`,
      };
    }
    if (t === "flag-while") {
      const vals = Array.from({ length: rng.int(6, 9) }, () => rng.int(1, 20)); const goal = vals[rng.int(2, vals.length - 2)];
      const program = P([J.decl("int[]", "list", J.arr(vals.map((x) => N(x)))), J.decl("int", "i", N(0)), J.decl("boolean", "found", J.b(false)), tag(J.whileL(J.and(J.not(V("found")), J.lt(V("i"), J.len(V("list")))), [J.iff(J.eq(J.idx(V("list"), V("i")), N(goal)), [J.set("found", J.b(true))], null, { tag: "test", inline: true }), mark(J.inc("i"), "A")]), "main")]);
      const kind = L === 2 && rng.chance(0.5) ? "comparisons" : "mark";
      const firstIdx = vals.indexOf(goal);
      return {
        program, target: kind === "mark" ? { kind: "mark", label: "A" } : { kind: "comparisons" }, template: `flag-while-${kind}`, concept: kind === "mark" ? "condition-controlled early exit" : "short-circuit comparisons in a flag loop",
        prompt: kind === "mark" ? COUNT_PROMPT.mark() : "Counting each evaluation of < and == (in both conditions), how many comparisons are performed?", params: { vals, goal },
        traceLoop: "main", traceVars: ["i", "found"],
        mutants: [{ misconception: "ignore-break", program: mutate.edit(program, (q) => { findTag(q, "main").c = findTag(q, "main").c.r; }), target: kind === "mark" ? undefined : { kind: "comparisons" } }, { misconception: "cond-vs-body", program, target: { kind: "cond", tag: "main" } }, { misconception: "comparison-scope", program, target: kind === "mark" ? { kind: "cond", tag: "test" } : { kind: "body", tag: "main" } }],
        extraDistractors: [{ choice: String(firstIdx), misconception: "missed-final" }],
        explain: `${goal} first appears at index ${firstIdx}. The body runs for i = 0 through ${firstIdx} (${firstIdx + 1} times); then !found is false.${kind === "comparisons" ? " On the final check, !found is false, so && skips i < list.length." : ""}`,
      };
    }
    // nested-break
    const R = rng.int(3, 5), Cn = rng.int(4, 7), stopJ = rng.int(1, Cn - 2);
    const program = P([J.decl("int", "count", N(0)), tag(J.forL(J.decl("int", "r", N(0)), J.lt(V("r"), N(R)), J.inc("r"), [tag(J.forL(J.decl("int", "c", N(0)), J.lt(V("c"), N(Cn)), J.inc("c"), [J.iff(J.eq(V("c"), J.add(V("r"), N(stopJ))), [J.brk()], null, { tag: "test", inline: true }), mark(J.inc("count"), "A")]), "inner")]), "main")]);
    return {
      program, target: { kind: "mark", label: "A" }, template: "nested-break-dependent", concept: "inner break with a row-dependent stopping point",
      prompt: COUNT_PROMPT.mark(), params: { R, Cn, stopJ }, traceLoop: "main", traceVars: ["r", "count"],
      mutants: [{ misconception: "ignore-break", program: mutate.removeAll(program, "break") }, { misconception: "break-outer", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("r"), N(1)); }) }, { misconception: "outer-times-inner-max", program: mutate.edit(program, (q) => { findTag(q, "test").c = J.eq(V("c"), N(stopJ)); }) }, { misconception: "boundary", program: mutate.edit(program, (q) => { findTag(q, "test").c = J.eq(V("c"), J.add(V("r"), N(stopJ + 1))); }) }],
      explain: `Row r stops when c reaches r + ${stopJ} (or the inner bound ${Cn}). Rows contribute ${range(0, R - 1).map((r) => Math.min(r + stopJ, Cn)).join(" + ")}.`,
    };
  },
};

/* ---------- G. Comparing two algorithms ---------- */
const compare = {
  id: "compare-algorithms", name: "Comparing two algorithms",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 1, "step-vs-unit"], [1, 2, "break-vs-full"], [1, 2, "pairs-all-vs-half"], [2, 2, "nested-vs-formula"], [2, 2, "halving-vs-linear"], [0, 1, "inclusive-vs-exclusive"]]);
    const n = rng.int(6, 12 + L * 4);
    const [nameA, nameB] = rng.pick([["a", "b"], ["workA", "workB"], ["countA", "countB"], ["first", "second"]]);
    const markA = (s) => mark(s, "A"), markB = (s) => mark(s, "B");
    let A, B, desc;
    if (t === "step-vs-unit") { const s = rng.pick([2, 3]); A = [J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(n)), J.inc("i"), [markA(J.inc(nameA))])]; B = [J.forL(J.decl("int", "k", N(0)), J.lt(V("k"), N(n)), J.op("k", "+=", N(s)), [markB(J.inc(nameB))])]; desc = `Loop B skips by ${s}`; }
    if (t === "inclusive-vs-exclusive") { A = [J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n)), J.inc("i"), [markA(J.inc(nameA))])]; B = [J.forL(J.decl("int", "k", N(0)), J.lt(V("k"), N(n)), J.inc("k"), [markB(J.inc(nameB))])]; desc = "both loops visit n values"; }
    if (t === "break-vs-full") { const vals = Array.from({ length: n }, () => rng.int(1, 9)); const goal = vals[rng.int(1, n - 2)]; A = [J.decl("int[]", "data", J.arr(vals.map((x) => N(x)))), J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), J.len(V("data"))), J.inc("i"), [markA(J.inc(nameA)), J.iff(J.eq(J.idx(V("data"), V("i")), N(goal)), [J.brk()], null, { inline: true })])]; B = [J.forL(J.decl("int", "k", N(0)), J.lt(V("k"), J.len(V("data"))), J.inc("k"), [markB(J.inc(nameB)), J.iff(J.eq(J.idx(V("data"), V("k")), N(goal)), [J.set("found", J.b(true))], null, { inline: true })])]; desc = "Loop A stops at the first match"; }
    if (t === "pairs-all-vs-half") { const m = rng.int(4, 6 + L); A = [J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(m)), J.inc("i"), [J.forL(J.decl("int", "j", N(0)), J.lt(V("j"), N(m)), J.inc("j"), [markA(J.inc(nameA))])])]; B = [J.forL(J.decl("int", "x", N(0)), J.lt(V("x"), N(m)), J.inc("x"), [J.forL(J.decl("int", "y", J.add(V("x"), N(1))), J.lt(V("y"), N(m)), J.inc("y"), [markB(J.inc(nameB))])])]; desc = "Loop B visits each unordered pair once"; }
    if (t === "nested-vs-formula") { const m = rng.int(4, 7); A = [J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(m)), J.inc("i"), [J.forL(J.decl("int", "j", N(1)), J.le(V("j"), V("i")), J.inc("j"), [markA(J.inc(nameA))])])]; B = [J.forL(J.decl("int", "k", N(1)), J.le(V("k"), N(m)), J.inc("k"), [markB(J.op(nameB, "+=", V("k")))])]; desc = "both compute 1 + 2 + … + m, but A counts one at a time"; }
    if (t === "halving-vs-linear") { const m = rng.pick([16, 32, 64]); A = [J.decl("int", "x", N(m)), J.whileL(J.gt(V("x"), N(1)), [markA(J.inc(nameA)), J.op("x", "/=", N(2))])]; B = [J.decl("int", "y", N(m)), J.whileL(J.gt(V("y"), N(1)), [markB(J.inc(nameB)), J.op("y", "-=", N(2))])]; desc = "halving shrinks faster than subtracting"; }
    const decls = [J.decl("int", nameA, N(0)), J.decl("int", nameB, N(0)), ...(t === "break-vs-full" ? [J.decl("boolean", "found", J.b(false))] : [])];
    const program = P([...decls, J.comment("Loop A"), ...A, J.comment("Loop B"), ...B]);
    const target = { kind: "pair", parts: [{ label: "A", target: { kind: "mark", label: "A" } }, { label: "B", target: { kind: "mark", label: "B" } }] };
    const res = run(program); const ca = res.S[findMarkId(program, "A")] || 0, cb = res.S[findMarkId(program, "B")] || 0;
    const fmt = (x, y) => `A: ${x} · B: ${y}`;
    return {
      program, target, template: `compare-${t}`, concept: "comparing the work done by two loops",
      prompt: "How many times do the statements marked // A and // B execute?", params: { n, t }, noTrace: true,
      extraDistractors: [{ choice: fmt(cb, ca), misconception: "wrong-loop" }, { choice: fmt(ca + 1, cb + 1), misconception: "cond-vs-body" }, { choice: fmt(ca, ca), misconception: "same-work" }, { choice: fmt(cb, cb), misconception: "same-work" }, { choice: fmt(ca - 1, cb), misconception: "missed-final" }, { choice: fmt(ca, cb + 1), misconception: "extra-iteration" }],
      explain: `${desc[0].toUpperCase() + desc.slice(1)}. Loop A's marked statement runs ${ca} times; Loop B's runs ${cb} times${ca === cb ? " — the same amount of work" : `, so ${ca > cb ? "A" : "B"} does ${Math.abs(ca - cb)} more`}.`,
    };
  },
};
function findMarkIdOf(program, label) { return findMarkId(program, label); }
function findMarkId(program, label) { let id = null; const walkAll = (list) => list.forEach((s) => { if (s.mark === label) id = s.id; if (s.body) walkAll(s.body); if (s.then) walkAll(s.then); if (s.els) walkAll(s.els); }); walkAll(program); return id; }

/* ---------- H. Growth patterns ---------- */
const GROWTH = { constant: "Constant: it does not change as n grows", log: "Logarithmic-style: it grows by about 1 each time n doubles", linear: "Linear: it roughly doubles when n doubles", quadratic: "Quadratic: it roughly quadruples when n doubles" };
const growth = {
  id: "growth-patterns", name: "Growth patterns",
  generate(rng, d) {
    const L = lvl(d);
    const shapes = [
      ["constant", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(5)), J.inc("i"), [mark(J.inc("count"), "A")])]],
      ["constant", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(0)), J.and(J.lt(V("i"), V("n")), J.lt(V("i"), N(3))), J.inc("i"), [mark(J.inc("count"), "A")])]],
      ["linear", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), V("n")), J.op("i", "+=", N(2)), [mark(J.inc("count"), "A")])]],
      ["linear", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), V("n")), J.inc("i"), [J.forL(J.decl("int", "j", N(0)), J.lt(V("j"), N(3)), J.inc("j"), [mark(J.inc("count"), "A")])])]],
      ["linear", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), V("n")), J.inc("i"), [mark(J.inc("count"), "A")]), J.forL(J.decl("int", "k", N(0)), J.lt(V("k"), V("n")), J.inc("k"), [J.inc("count")])]],
      ["quadratic", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), V("n")), J.inc("i"), [J.forL(J.decl("int", "j", N(0)), J.lt(V("j"), V("n")), J.inc("j"), [mark(J.inc("count"), "A")])])]],
      ["quadratic", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), V("n")), J.inc("i"), [J.forL(J.decl("int", "j", V("i")), J.lt(V("j"), V("n")), J.inc("j"), [mark(J.inc("count"), "A")])])]],
      ["log", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(1)), J.lt(V("i"), V("n")), J.op("i", "*=", N(2)), [mark(J.inc("count"), "A")])]],
      ["log", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.decl("int", "x", V("n")), J.whileL(J.gt(V("x"), N(1)), [mark(J.inc("count"), "A"), J.op("x", "/=", N(2))])]],
      ["linear", (n) => [J.decl("int", "n", N(n)), J.decl("int", "count", N(0)), J.forL(J.decl("int", "i", N(1)), J.lt(V("i"), V("n")), J.op("i", "*=", N(2)), [J.forL(J.decl("int", "j", N(0)), J.lt(V("j"), V("i")), J.inc("j"), [mark(J.inc("count"), "A")])])]],
    ];
    const pool = L === 0 ? shapes.filter(([c], i) => [0, 2, 5, 7].includes(i)) : L === 1 ? shapes.slice(0, 9) : shapes;
    const [cls, build] = rng.pick(pool);
    const n = rng.pick(cls === "quadratic" ? [6, 8, 10, 12, 16] : [8, 10, 12, 16, 20, 24, 32]);
    const work = rng.pick(["count", "ops", "work", "steps"]);
    const rename = (stmts) => JSON.parse(JSON.stringify(stmts).replaceAll('"count"', `"${work}"`));
    const build0 = build; const buildR = (m) => rename(build0(m));
    const count = (m) => { const p = P(buildR(m)); const r = run(p); return r.S[findMarkId(p, "A")] || 0; };
    const c8 = count(n), c16 = count(2 * n), c32 = count(4 * n);
    const measured = c16 === c8 && c32 === c16 ? "constant" : c32 - c16 === c16 - c8 && c16 - c8 <= 2 ? "log" : c32 / c16 > 1.7 && c32 / c16 < 2.4 ? "linear" : c32 / c16 > 3.4 && c32 / c16 < 4.6 ? "quadratic" : null;
    if (measured !== cls) throw new GenReject(`growth class mismatch ${cls} vs ${measured}`);
    const program = P(buildR(n));
    const form = L === 0 ? "classify" : rng.pick(["classify", "predict"]);
    if (form === "classify") {
      const answer = GROWTH[cls];
      return {
        program, target: null, template: `growth-classify-${cls}`, concept: "informal growth comparison",
        prompt: `This program uses n = ${n}. As n keeps doubling, how does the number of times // A executes grow?`, params: { n, cls, counts: [c8, c16, c32] }, noTrace: true,
        choices: Object.entries(GROWTH).map(([k, text]) => ({ choice: text, misconception: `growth-${k}` })), answer, targetKind: "growth-class",
        explain: `Concrete counts for // A: n = ${n} → ${c8}, n = ${2 * n} → ${c16}, n = ${4 * n} → ${c32}. ${cls === "constant" ? "The count never changes." : cls === "log" ? "Each doubling adds just 1." : cls === "linear" ? "Each doubling about doubles the count." : "Each doubling about quadruples the count."}`,
      };
    }
    const answer = String(c16), opts = [];
    for (const [v, m] of [[c8 * 2, "growth-linear"], [c8 * 4, "growth-quadratic"], [c8 + 1, "growth-log"], [c8, "growth-constant"], [c8 * 3, "fallback"], [c16 + 1, "extra-iteration"]]) {
      const c = String(v); if (c !== answer && !opts.some((o) => o.choice === c)) opts.push({ choice: c, misconception: m });
    }
    return {
      program, target: null, template: `growth-predict-${cls}`, concept: "predicting work at a larger input",
      prompt: `With n = ${n}, // A executes ${c8} times. If the first line is changed to int n = ${2 * n};, how many times does // A execute?`, params: { n, cls, counts: [c8, c16, c32] }, noTrace: true,
      choices: [{ choice: answer }, ...opts.slice(0, 3)], answer, targetKind: "growth-predict",
      explain: `Running it with n = ${2 * n} gives ${c16}. Compare: n = ${n} → ${c8}, n = ${2 * n} → ${c16}, n = ${4 * n} → ${c32} (${cls} growth).`,
    };
  },
};

/* ---------- I. Operation types ---------- */
const operations = {
  id: "operation-types", name: "Distinguishing counted operations",
  generate(rng, d) {
    const L = lvl(d), R = rng.int(2, 3 + L), Cn = rng.int(2, 4 + L);
    const nested = L >= 1 && rng.chance(0.7);
    const n = rng.int(4, 12), km = rng.int(2, 3);
    const program = nested
      ? P([J.decl("int", "count", N(0)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(R)), J.inc("i"), [tag(J.forL(J.decl("int", "j", N(0)), J.lt(V("j"), N(Cn)), J.inc("j"), [J.iff(J.gt(V("j"), V("i")), [mark(J.inc("count"), "A")], null, { tag: "test", inline: true })]), "inner")]), "main")])
      : P([J.decl("int", "count", N(0)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(n)), J.inc("i"), [J.iff(J.eq(J.mod(V("i"), N(km)), N(0)), [mark(J.inc("count"), "A")], null, { tag: "test", inline: true })]), "main")]);
    const kinds = nested ? ["inner-cond", "inner-upd", "outer-cond", "if-cond", "comparisons", "mark"] : ["cond", "upd", "if-cond", "comparisons", "mark"];
    const k = rng.pick(L === 0 ? kinds.filter((x) => x !== "comparisons") : kinds);
    const main = findTag(program, "main"), inner = findTag(program, "inner");
    const T = { "inner-cond": [{ kind: "cond", tag: "inner" }, `How many times is the inner condition ${condText(inner || main)} evaluated in total?`], "inner-upd": [{ kind: "upd", tag: "inner" }, "How many times does the inner update j++ execute in total?"], "outer-cond": [{ kind: "cond", tag: "main" }, `How many times is the outer condition ${condText(main)} evaluated?`], cond: [{ kind: "cond", tag: "main" }, COUNT_PROMPT.cond(main)], upd: [{ kind: "upd", tag: "main" }, COUNT_PROMPT.upd(main)], "if-cond": [{ kind: "cond", tag: "test" }, "How many times is the if condition evaluated?"], comparisons: [{ kind: "comparisons" }, COUNT_PROMPT.comparisons()], mark: [{ kind: "mark", label: "A" }, COUNT_PROMPT.mark()] }[k];
    const others = Object.entries({ cond: { kind: "cond", tag: nested ? "inner" : "main" }, body: { kind: "body", tag: nested ? "inner" : "main" }, upd: { kind: "upd", tag: nested ? "inner" : "main" }, ifc: { kind: "cond", tag: "test" }, mark: { kind: "mark", label: "A" }, cmp: { kind: "comparisons" }, outer: { kind: "cond", tag: "main" } });
    const tagOf = { cond: "body-vs-cond", body: "cond-vs-body", upd: "update-count", ifc: "comparison-scope", mark: "ignore-condition", cmp: "comparison-scope", outer: "ignore-inner" };
    return {
      program, target: T[0], template: `operation-${nested ? "nested" : "single"}-${k}`, concept: "which operation is being counted",
      prompt: T[1], params: { R, Cn, n, nested }, traceLoop: "main", traceVars: nested ? ["i", "count"] : ["i", "count"],
      mutants: rng.shuffle(others).map(([key, target]) => ({ misconception: T[0].kind === "cond" && key === "body" ? "body-vs-cond" : (T[0].kind === "mark" || T[0].kind === "body") && key === "cond" ? "cond-vs-body" : key === "outer" && /inner/.test(k) ? "ignore-inner" : "wrong-operation", program, target })),
      explain: nested
        ? `Outer condition: ${R + 1} checks. Inner loop: ${R} × ${Cn} = ${R * Cn} body runs and updates, ${R} × ${Cn + 1} = ${R * (Cn + 1)} condition checks. The if is tested on every inner iteration (${R * Cn}).`
        : `The loop body runs ${n} times, so the update runs ${n} times and the condition is checked ${n + 1} times. The if condition is evaluated ${n} times; it is true ${Math.ceil(n / km)} times.`,
    };
  },
};

/* ---------- J. Sequential and data-dependent loops ---------- */
const sequential = {
  id: "sequential-loops", name: "Sequential and data-dependent loops",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 1, "two-loops"], [1, 2, "bound-from-first"], [1, 1, "while-accum"], [2, 2, "nested-while"], [0, 1, "loop-after-loop-var"]]);
    if (t === "two-loops") {
      const a = rng.int(2, 9), b = rng.int(2, 9), s1 = rng.int(0, 3), c = rng.pick(["count", "work", "total"]);
      const program = P([J.decl("int", c, N(0)), tag(J.forL(J.decl("int", "i", N(s1)), J.lt(V("i"), N(s1 + a)), J.inc("i"), [mark(J.inc(c), "A")]), "main"), tag(J.forL(J.decl("int", "k", N(1)), J.le(V("k"), N(b)), J.inc("k"), [mark(J.op(c, "+=", N(1)), "B")]), "second")]);
      return {
        program, target: { kind: "markSum", labels: ["A", "B"] }, template: "two-sequential-loops", concept: "sequential loops add",
        prompt: "How many times, in total, do the statements marked // A and // B execute?", params: { a, b }, traceLoop: "main", traceVars: ["i", c],
        extraDistractors: [{ choice: String(a * b), misconception: "growth-quadratic" }, { choice: String(a + b + 2), misconception: "cond-vs-body" }, { choice: String(a), misconception: "wrong-loop" }, { choice: String(a + b - 1), misconception: "boundary" }],
        explain: `The loops run one after the other, not nested: ${a} + ${b} = ${a + b}.`,
      };
    }
    if (t === "bound-from-first") {
      const vals = Array.from({ length: rng.int(4, 6) }, () => rng.int(1, 12)); const thr = rng.int(4, 8);
      const program = P([J.decl("int[]", "data", J.arr(vals.map((x) => N(x)))), J.decl("int", "big", N(0)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), J.len(V("data"))), J.inc("i"), [J.iff(J.gt(J.idx(V("data"), V("i")), N(thr)), [J.inc("big")], null, { tag: "test", inline: true })]), "main"), tag(J.forL(J.decl("int", "k", N(0)), J.lt(V("k"), J.mul(V("big"), N(2))), J.inc("k"), [mark(J.inc("work"), "A")]), "second")]);
      program.splice(2, 0, ...P([J.decl("int", "work", N(0))]));
      const p2 = P(JSON.parse(JSON.stringify(program)));
      const big = vals.filter((x) => x > thr).length;
      return {
        program: p2, target: { kind: "mark", label: "A" }, template: "bound-from-earlier-loop", concept: "second loop's bound comes from the first loop's result",
        prompt: COUNT_PROMPT.mark(), params: { vals, thr }, traceLoop: "second", traceVars: ["k", "work"],
        extraDistractors: [{ choice: String(vals.length * 2), misconception: "ignore-condition" }, { choice: String(big), misconception: "update-count" }, { choice: String(big * 2 + 1), misconception: "cond-vs-body" }, { choice: String(vals.filter((x) => x >= thr).length * 2), misconception: "boundary" }],
        explain: `The first loop counts ${big} values greater than ${thr}. The second loop runs while k < big * 2 = ${big * 2}.`,
      };
    }
    if (t === "while-accum") {
      const lim = rng.int(20, 50), step = rng.int(2, 4);
      const program = P([J.decl("int", "sum", N(0)), J.decl("int", "i", N(1)), tag(J.whileL(J.le(V("sum"), N(lim)), [mark(J.op("sum", "+=", V("i")), "A"), J.op("i", "+=", N(step))]), "main")]);
      return {
        program, target: { kind: "mark", label: "A" }, template: "while-until-sum", concept: "loop count determined by accumulated data",
        prompt: COUNT_PROMPT.mark(), params: { lim, step }, traceLoop: "main", traceVars: ["i", "sum"],
        mutants: [{ misconception: "cond-vs-body", program, target: { kind: "cond", tag: "main" } }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "update-order", program: mutate.swapBody(program, "main") }],
        explain: `The loop keeps adding while sum ≤ ${lim}; i grows by ${step} each time, so the additions get larger.`,
      };
    }
    if (t === "nested-while") {
      const n = rng.int(4, 6);
      const program = P([J.decl("int", "count", N(0)), J.decl("int", "i", N(1)), tag(J.whileL(J.le(V("i"), N(n)), [J.decl("int", "j", V("i")), tag(J.whileL(J.gt(V("j"), N(0)), [mark(J.inc("count"), "A"), J.op("j", "-=", N(2))]), "inner"), J.inc("i")]), "main")]);
      return {
        program, target: { kind: "mark", label: "A" }, template: "nested-while-halving", concept: "inner while with a dependent start and step 2",
        prompt: COUNT_PROMPT.mark(), params: { n }, traceLoop: "main", traceVars: ["i", "count"],
        mutants: [{ misconception: "growth-linear", program: mutate.edit(program, (q) => { findTag(q, "inner").body[1] = J.dec("j"); }) }, { misconception: "ignore-inner", program, target: { kind: "body", tag: "main" } }, { misconception: "boundary", program: mutate.boundary(program, "inner") }, { misconception: "cond-vs-body", program, target: { kind: "cond", tag: "inner" } }],
        explain: `For each i, j starts at i and drops by 2 while positive: ⌈i / 2⌉ executions. Sum over i = 1..${n}: ${range(1, n).map((i) => Math.ceil(i / 2)).join(" + ")}.`,
      };
    }
    // loop-after-loop-var: while loop variable reused
    const a = rng.int(2, 8), b = a + rng.int(2, 8), v = rng.pick(["i", "k", "pos"]), c = rng.pick(["count", "extra", "work"]), s0 = rng.int(0, 1);
    const program = P([J.decl("int", v, N(s0)), J.decl("int", c, N(0)), tag(J.whileL(J.lt(V(v), N(a)), [J.inc(v)]), "main"), tag(J.whileL(J.lt(V(v), N(b)), [mark(J.inc(c), "A"), J.inc(v)]), "second")]);
    return {
      program, target: { kind: "mark", label: "A" }, template: "reused-loop-variable", concept: "second loop starts where the first left off",
      prompt: COUNT_PROMPT.mark(), params: { a, b }, traceLoop: "second", traceVars: [v, c],
      extraDistractors: [{ choice: String(b), misconception: "initial-value" }, { choice: String(b - a + 1), misconception: "extra-iteration" }, { choice: String(a + b), misconception: "growth-linear" }],
      explain: `The first loop leaves ${v} = ${a}. The second loop continues from there: ${v} = ${a}..${b - 1}, ${b - a} executions.`,
    };
  },
};

// Surface variety (consistent renames, x++ / x += 1 / x = x + 1) applied to the program, mutants, and text.
// For-to-while conversion stays off: several questions count the for-header update.
const varied = (fam) => ({ ...fam, generate(rng, d) { const spec = fam.generate(rng, d); return spec.choices ? spec : applyVariety(spec, rng, { convert: false }); } });
export const executionFamilies = [simple, nonUnit, nestedInd, nestedDep, conditional, early, compare, growth, operations, sequential].map(varied);
