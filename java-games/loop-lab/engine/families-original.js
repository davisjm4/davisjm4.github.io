/* The eight original Loop Lab modes, rebuilt procedurally. Every legacy variant id
 * is preserved (and now parameterized by difficulty); new structural variants are added. */
import { J, P, V, N, lvl, range, clone, findTag, run, stmtText, loopCountExtras } from "./fam-util.js?v=loop-expansion-v2";
import { mutate, GenReject, evaluate } from "./questions.js?v=loop-expansion-v2";
import { tag, mark, printProgram, exprStr, walk } from "./java-model.js?v=loop-expansion-v2";
import { applyVariety } from "./variety.js?v=loop-expansion-v2";

const vname = (rng) => rng.pick(["i", "k", "n", "x", "step", "index"]);
const updStmt = (v, delta) => (delta === 1 ? J.inc(v) : delta === -1 ? J.dec(v) : delta > 0 ? J.op(v, "+=", N(delta)) : J.op(v, "-=", N(-delta)));
function seqOf(start, op, bound, delta) { const f = { "<": (a) => a < bound, "<=": (a) => a <= bound, ">": (a) => a > bound, ">=": (a) => a >= bound, "!=": (a) => a !== bound }[op]; const o = []; let x = start; while (f(x) && o.length < 200) { o.push(x); x += delta; } return o; }
const oneLine = (program) => printProgram(program).code.split("\n").map((l) => l.trim()).join(" ");
const levels = (lo, hi) => [lo, hi];
const allowed = (variants, d) => Object.entries(variants).filter(([, v]) => lvl(d) >= v.lv[0] && lvl(d) <= v.lv[1]).map(([k]) => k);

/* ---------- iterations ---------- */
const iterations = {
  id: "iterations", variants: {
    "inc-exclusive": { lv: levels(0, 1) }, "dec-inclusive": { lv: levels(0, 1) }, "zero-start": { lv: levels(0, 0) }, "while-decrement": { lv: levels(0, 1) },
    "one-step": { lv: levels(0, 0) }, "skip-step": { lv: levels(0, 1) }, multiplicative: { lv: levels(1, 2) }, halving: { lv: levels(1, 2) },
    "not-equal": { lv: levels(1, 2) }, "two-pointer": { lv: levels(2, 2) }, "compound-condition": { lv: levels(2, 2) }, "body-modifies-counter": { lv: levels(2, 2) },
  },
  generate(rng, d, variant) {
    const L = lvl(d), v = vname(rng);
    let program, concept, explainSeq;
    const body = [rng.pick([J.print(V(v)), J.inc("count"), J.op("total", "+=", V(v))])];
    const prelude = [J.decl("int", "count", N(0)), J.decl("int", "total", N(0))].filter((s) => JSON.stringify(body).includes(`"${s.name}"`));
    const forLoop = (start, op, bound, delta) => { explainSeq = seqOf(start, op, bound, delta); return P([...prelude, tag(J.forL(J.decl("int", v, N(start)), J.bin(op, V(v), N(bound)), updStmt(v, delta), clone(body)), "main")]); };
    const span = () => rng.int(3, [5, 8, 11][L]);
    switch (variant) {
      case "inc-exclusive": { const s = rng.int(0, 5), dl = rng.pick(L === 0 ? [1, 2] : [2, 3, 4]); program = forLoop(s, "<", s + dl * span() + rng.int(0, dl - 1), dl); concept = "for-loop boundaries"; break; }
      case "dec-inclusive": { const s = rng.int(10, 20), dl = rng.pick(L === 0 ? [1, 2] : [2, 3]); program = forLoop(s, ">=", s - dl * span() + rng.int(0, dl - 1), -dl); concept = "inclusive decreasing bound"; break; }
      case "zero-start": { const s = rng.int(6, 12); program = rng.chance(0.5) ? forLoop(s, "<", s - rng.int(1, 4), 1) : forLoop(s - 5, ">", s, -1); concept = "zero iterations"; break; }
      case "one-step": { const s = rng.int(2, 9), dl = rng.int(3, 6); program = forLoop(s, "<=", s + rng.int(0, dl - 1), dl); concept = "exactly one iteration"; break; }
      case "skip-step": { const s = rng.int(1, 4), dl = rng.int(3, 5); program = forLoop(s, "<=", s + dl * span() - rng.int(0, 1), dl); concept = "non-unit step"; break; }
      case "while-decrement": {
        const s = rng.int(12, 30), dl = rng.int(2, 6), b = rng.int(0, 5);
        explainSeq = seqOf(s, ">", b, -dl);
        program = P([J.decl("int", v, N(s)), tag(J.whileL(J.gt(V(v), N(b)), [J.op(v, "-=", N(dl))]), "main")]); concept = "while loops"; break;
      }
      case "multiplicative": { const s = rng.int(1, 3), f = rng.pick([2, 3]), b = rng.int(20, 90); program = P([J.decl("int", v, N(s)), tag(J.whileL(J.lt(V(v), N(b)), [J.op(v, "*=", N(f))]), "main")]); explainSeq = (() => { const o = []; let x = s; while (x < b) { o.push(x); x *= f; } return o; })(); concept = "multiplicative update"; break; }
      case "halving": { const s = rng.int(20, 100), b = rng.pick([0, 1, 3]); program = P([J.decl("int", v, N(s)), tag(J.whileL(J.gt(V(v), N(b)), [J.op(v, "/=", N(2))]), "main")]); explainSeq = (() => { const o = []; let x = s; while (x > b) { o.push(x); x = Math.trunc(x / 2); } return o; })(); concept = "halving with integer division"; break; }
      case "not-equal": { const s = rng.int(0, 4), dl = rng.pick([2, 3]); program = forLoop(s, "!=", s + dl * span(), dl); concept = "!= condition reached exactly"; break; }
      case "two-pointer": { const lo = rng.int(0, 3), hi = lo + rng.int(6, 13); program = P([J.decl("int", "lo", N(lo)), J.decl("int", "hi", N(hi)), tag(J.whileL(J.lt(V("lo"), V("hi")), [J.inc("lo"), J.op("hi", "-=", N(rng.pick([1, 2])))]), "main")]); explainSeq = null; concept = "two changing variables"; break; }
      case "compound-condition": { const b = rng.int(8, 14), cap = rng.int(10, 30); program = P([J.decl("int", "total", N(0)), tag(J.forL(J.decl("int", v, N(1)), J.and(J.le(V(v), N(b)), J.lt(V("total"), N(cap))), J.inc(v), [J.op("total", "+=", V(v))]), "main")]); explainSeq = null; concept = "two-part loop condition"; break; }
      case "body-modifies-counter": { const b = rng.int(10, 18); program = P([J.decl("int", "count", N(0)), tag(J.forL(J.decl("int", v, N(0)), J.lt(V(v), N(b)), J.inc(v), [J.inc("count"), J.iff(J.eq(J.mod(V(v), N(3)), N(0)), [J.inc(v)], null, { tag: "test", inline: true })]), "main")]); explainSeq = null; concept = "counter changed inside the body"; break; }
      default: throw new GenReject("variant " + variant);
    }
    const loop = findTag(program, "main"), isWhile = loop.t === "while";
    const res = run(program), count = res.B[loop.id] || 0;
    const cv = loop.t === "for" ? loop.init.name : (loop.c.l.name || v);
    return {
      program, target: { kind: "body", tag: "main" }, concept, template: variant,
      prompt: isWhile ? "How many times does the while body execute?" : "How many times does the loop execute?",
      params: { variant }, traceLoop: "main", traceVars: [...new Set([cv, ...(variant === "two-pointer" ? ["hi"] : []), ...(variant === "compound-condition" ? ["total"] : [])])],
      mutants: [{ misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "cond-vs-body", program, target: { kind: "cond", tag: "main" } }, variant === "body-modifies-counter" ? { misconception: "ignore-condition", program: mutate.edit(program, (q) => { findTag(q, "main").body.pop(); }) } : null, variant === "compound-condition" ? { misconception: "comparison-scope", program: mutate.edit(program, (q) => { findTag(q, "main").c = findTag(q, "main").c.l; }) } : null],
      extraDistractors: [...loopCountExtras(program, "main"), { choice: String(count + 1), misconception: "extra-iteration" }, { choice: String(Math.max(0, count - 1)), misconception: "missed-final" }],
      explain: explainSeq ? `${cv} takes ${explainSeq.length ? explainSeq.join(", ") : "no values that satisfy the condition"}, so the body runs ${count} time${count === 1 ? "" : "s"}. The next value fails the condition.` : `Trace the condition each time it is checked; it is true ${count} time${count === 1 ? "" : "s"} before it becomes false.`,
    };
  },
};

/* ---------- final ---------- */
const finalV = {
  id: "final", variants: {
    "sum-range": { lv: levels(0, 1) }, product: { lv: levels(0, 1) }, overwrite: { lv: levels(0, 1) }, "count-even": { lv: levels(0, 1) },
    "continue-sum": { lv: levels(1, 2) }, "break-sum": { lv: levels(1, 2) }, alternating: { lv: levels(1, 2) }, "two-accumulators": { lv: levels(2, 2) },
    "running-difference": { lv: levels(1, 2) }, "conditional-product": { lv: levels(2, 2) },
  },
  generate(rng, d, variant) {
    const L = lvl(d), a = rng.int(1, 12), b = a + rng.int(3, 6 + L), init = rng.pick([0, rng.int(1, 8)]);
    const loopOver = (body, opts = {}) => tag(J.forL(J.decl("int", "i", N(opts.start ?? a)), J.le(V("i"), N(opts.end ?? b)), opts.step ? J.op("i", "+=", N(opts.step)) : J.inc("i"), body), "main");
    let program, acc = "total", concept, extra = [];
    switch (variant) {
      case "sum-range": program = P([J.decl("int", acc, N(init)), loopOver([J.op(acc, "+=", V("i"))], { step: L ? rng.pick([1, 2]) : 1 })]); concept = "accumulator"; break;
      case "product": acc = "product"; program = P([J.decl("int", acc, N(1)), loopOver([J.op(acc, "*=", V("i"))], { end: a + rng.int(2, 3) })]); concept = "accumulator"; extra = [{ misconception: "accum-init", program: mutate.setInit(program, acc, N(0)) }]; break;
      case "overwrite": { acc = "last"; const st = rng.int(2, 3); program = P([J.decl("int", acc, N(-1)), loopOver([J.set(acc, V("i"))], { step: st })]); concept = "assignment"; extra = [{ misconception: "printed-vs-final", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = J.set(acc, N(b)); }) }, { misconception: "initial-value", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = J.set(acc, N(a)); }) }, { misconception: "post-update", program: mutate.edit(program, (q) => { q.push(J.set(acc, J.add(V(acc), N(st)))); }) }]; break; }
      case "count-even": acc = "count"; program = P([J.decl("int", acc, N(0)), loopOver([J.iff(J.eq(J.mod(V("i"), N(2)), N(rng.int(0, 1))), [J.inc(acc)], null, { tag: "test", inline: true })], { start: rng.int(0, 2), end: rng.int(8, 18 + L * 3) })]); concept = "condition"; extra = [{ misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }, { misconception: "value-vs-count", program: mutate.edit(program, (q) => { findTag(q, "test").then = [J.set(acc, V("i"))]; }) }]; break;
      case "continue-sum": { const skip = rng.int(a + 1, b - 1); program = P([J.decl("int", acc, N(0)), loopOver([J.iff(J.eq(V("i"), N(skip)), [J.cont()], null, { tag: "test", inline: true }), J.op(acc, "+=", V("i"))])]); concept = "continue"; extra = [{ misconception: "ignore-continue", program: mutate.removeAll(program, "continue") }, { misconception: "ignore-break", program: mutate.edit(program, (q) => { findTag(q, "test").then = [J.brk()]; }) }]; break; }
      case "break-sum": { const cap = rng.int(6, 30); program = P([J.decl("int", acc, N(0)), loopOver([J.op(acc, "+=", V("i")), J.iff(J.ge(V(acc), N(cap)), [J.brk()], null, { tag: "test", inline: true })], { start: rng.int(1, 5), end: rng.int(12, 22), step: rng.pick([1, 2, 3]) })]); concept = "break"; extra = [{ misconception: "ignore-break", program: mutate.removeAll(program, "break") }, { misconception: "update-order", program: mutate.swapBody(program, "main") }]; break; }
      case "alternating": program = P([J.decl("int", acc, N(0)), loopOver([J.iff(J.eq(J.mod(V("i"), N(2)), N(0)), [J.op(acc, "+=", V("i"))], [J.op(acc, "-=", V("i"))], { tag: "test" })], { start: rng.int(0, 2), end: rng.int(8, 18 + L * 3) })]); concept = "if-else accumulator"; extra = [{ misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }]; break;
      case "two-accumulators": program = P([J.decl("int", "evens", N(0)), J.decl("int", "odds", N(0)), loopOver([J.iff(J.eq(J.mod(V("i"), N(2)), N(0)), [J.op("evens", "+=", V("i"))], [J.inc("odds")], { tag: "test" })], { start: rng.int(0, 5), end: rng.int(14, 26 + L * 3) })]); acc = null; concept = "two accumulators"; extra = [{ misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }]; break;
      case "running-difference": { const s = rng.int(40, 150); acc = "remaining"; program = P([J.decl("int", acc, N(s)), loopOver([J.op(acc, "-=", J.mul(V("i"), N(2)))], { start: 1, end: rng.int(4, 9) })]); concept = "decreasing accumulator"; break; }
      case "conditional-product": acc = "product"; program = P([J.decl("int", acc, N(1)), loopOver([J.iff(J.eq(J.mod(V("i"), N(3)), N(0)), [J.op(acc, "*=", V("i"))], null, { tag: "test", inline: true })], { start: 1, end: rng.int(9, 22) })]); concept = "conditional product"; extra = [{ misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }, { misconception: "accum-init", program: mutate.setInit(program, acc, N(0)) }]; break;
      default: throw new GenReject("variant " + variant);
    }
    const target = acc ? { kind: "var", name: acc } : { kind: "vars", names: ["evens", "odds"] };
    return {
      program, target, concept, template: variant, prompt: acc ? `What is the final value of ${acc}?` : "What are the final values of evens and odds?", params: { variant },
      traceLoop: "main", traceVars: acc ? ["i", acc] : ["i", "evens", "odds"],
      mutants: [{ misconception: "boundary", program: mutate.boundary(program, "main") }, acc ? { misconception: "accum-overwrite", program: mutate.edit(program, (q) => { let hit = false; walk(q, (s) => { if (s.t === "set" && s.name === acc && s.op !== "=") { s.op = "="; hit = true; } }); return hit; }) } : null, ...extra, { misconception: "off-start", program: mutate.edit(program, (q) => { const l = findTag(q, "main"); l.init.e = N(l.init.e.v + 1); }) }],
      explain: (ans) => `Trace each iteration in order: ${concept === "break" ? "break ends the loop as soon as its condition is true" : concept === "continue" ? "continue skips the rest of the body for one value" : "apply the update to the current value every time the body runs"}. The final value is ${ans}.`,
    };
  },
};

/* ---------- choose ---------- */
const chooseF = {
  id: "choose", variants: {
    evens: { lv: levels(0, 1) }, down: { lv: levels(0, 1) }, multiples: { lv: levels(0, 1) }, "odd-range": { lv: levels(0, 1) },
    "countdown-step": { lv: levels(1, 2) }, "while-sum": { lv: levels(1, 2) }, "nonunit-while": { lv: levels(1, 2) }, "nested-grid": { lv: levels(2, 2) },
  },
  generate(rng, d, variant) {
    const L = lvl(d), v = rng.pick(["i", "k", "n", "x", "j"]);
    const forP = (start, op, bound, delta, body = null) => P([tag(J.forL(J.decl("int", v, N(start)), J.bin(op, V(v), N(bound)), updStmt(v, delta), body || [J.print(V(v))]), "main")]);
    const whileP = (start, op, bound, delta) => P([J.decl("int", v, N(start)), tag(J.whileL(J.bin(op, V(v), N(bound)), [J.print(V(v)), updStmt(v, delta)]), "main")]);
    let correct, goalKind = "output", alts = [];
    const variantsOf = (mk, s, op, b, dl) => [
      ["boundary", mk(s, { "<=": "<", "<": "<=", ">=": ">", ">": ">=" }[op], b, dl)],
      ["off-start", mk(s - Math.sign(dl) * (Math.abs(dl) === 1 ? 1 : Math.abs(dl)), op, b, dl)],
      ["update-count", mk(s, op, b, Math.sign(dl))],
      ["missed-final", mk(s, op, b - dl, dl)],
      ["extra-iteration", mk(s, op, b + dl, dl)],
      ["comparison-direction", mk(b, { "<=": ">=", "<": ">", ">=": "<=", ">": "<" }[op], s, -dl)],
    ];
    switch (variant) {
      case "evens": { const s = rng.int(0, 24) * 2, n = rng.int(3, 8 + L); correct = forP(s, "<=", s + 2 * (n - 1), 2); alts = variantsOf(forP, s, "<=", s + 2 * (n - 1), 2); break; }
      case "odd-range": { const s = rng.int(0, 5) * 2 + 1, n = rng.int(3, 9 + L); correct = forP(s, "<", s + 2 * n, 2); alts = variantsOf(forP, s, "<", s + 2 * n, 2); break; }
      case "down": { const s = rng.int(4, 18 + L * 3), e = rng.int(0, 5); correct = forP(s, ">=", e, -1); alts = variantsOf(forP, s, ">=", e, -1); break; }
      case "countdown-step": { const s = rng.int(12, 30), dl = rng.int(2, 6), e = s - dl * rng.int(2, 7); correct = forP(s, ">=", e, -dl); alts = variantsOf(forP, s, ">=", e, -dl); break; }
      case "multiples": { const k = rng.int(3, 12), n = rng.int(3, 8); correct = whileP(k, "<=", k * n, k); alts = variantsOf(whileP, k, "<=", k * n, k); break; }
      case "nonunit-while": { const s = rng.int(1, 8), dl = rng.int(3, 8), n = rng.int(3, 8); correct = whileP(s, "<", s + dl * n, dl); alts = variantsOf(whileP, s, "<", s + dl * n, dl); break; }
      case "while-sum": {
        goalKind = "total"; const n = rng.int(3, 20 + L * 3);
        const mk = (s, op, b, dl) => P([J.decl("int", "total", N(0)), J.decl("int", v, N(s)), tag(J.whileL(J.bin(op, V(v), N(b)), [J.op("total", "+=", V(v)), updStmt(v, dl)]), "main")]);
        correct = mk(1, "<=", n, 1);
        alts = [["boundary", mk(1, "<", n, 1)], ["off-start", mk(0, "<", n, 1)], ["update-order", P([J.decl("int", "total", N(0)), J.decl("int", v, N(1)), tag(J.whileL(J.le(V(v), N(n)), [updStmt(v, 1), J.op("total", "+=", V(v))]), "main")])], ["accum-overwrite", P([J.decl("int", "total", N(0)), J.decl("int", v, N(1)), tag(J.whileL(J.le(V(v), N(n)), [J.set("total", V(v)), updStmt(v, 1)]), "main")])], ["extra-iteration", mk(1, "<=", n + 1, 1)]];
        break;
      }
      case "nested-grid": {
        goalKind = "output"; const R = rng.int(2, 12), C = rng.int(2, 15);
        const mk = (rs, rop, rb, cop, cb, dep) => P([tag(J.forL(J.decl("int", "r", N(rs)), J.bin(rop, V("r"), N(rb)), J.inc("r"), [J.forL(J.decl("int", "c", N(0)), J.bin(cop, V("c"), dep ? V("r") : N(cb)), J.inc("c"), [J.printNo(J.s("*"))]), J.print(J.s(""))]), "main")]);
        correct = mk(0, "<", R, "<", C, false);
        alts = [["boundary", mk(0, "<=", R, "<", C, false)], ["boundary", mk(0, "<", R, "<=", C, false)], ["outer-times-inner-max", mk(0, "<", R, "<", C, true)], ["comparison-direction", mk(0, "<", C, "<", R, false)], ["off-start", mk(1, "<", R, "<", C, false)]];
        break;
      }
      default: throw new GenReject("variant " + variant);
    }
    const res = run(correct);
    const goal = goalKind === "total" ? `total ends as ${res.vars.total.v}` : res.output.every((x) => /^-?\d+$/.test(x)) ? `prints ${res.output.join(", ")} (one per line)` : `prints ${res.output.length} rows of ${res.output[0].length} stars`;
    const goalVal = goalKind === "total" ? res.vars.total.v : res.outputText;
    const answer = oneLine(correct);
    const choices = [];
    for (const [m, p] of rng.shuffle(alts)) {
      const r = run(p, { stepLimit: 5000 }); const got = goalKind === "total" ? r.vars.total?.v : r.outputText;
      const text = oneLine(p);
      if (text !== answer && (!r.ok || got !== goalVal) && !choices.some((c) => c.choice === text)) choices.push({ choice: text, misconception: m, note: r.ok ? `This loop ${goalKind === "total" ? `leaves total at ${got}` : `prints ${r.output.length ? r.output.join(", ") : "nothing"}`}.` : "This loop never stops." });
    }
    if (choices.length < 3) throw new GenReject("choose alternatives");
    const goalCode = `// Goal: ${goal}`;
    return {
      program: correct, template: variant, concept: "loop construction", params: { variant, goal },
      prompt: `Which code ${goal}?`, choices: [{ choice: answer }, ...choices.slice(0, 3)], answer, targetKind: "choose-loop", choiceFormat: "code",
      codeOverride: goalCode, traceLoop: "main", traceVars: goalKind === "total" ? [v, "total"] : [variant === "nested-grid" ? "r" : v],
      explain: `The correct loop starts at the first required value, keeps the condition true through the last one, and moves by the right step. Each alternative changes one of those three parts.`,
    };
  },
};

/* ---------- components ---------- */
const components = {
  id: "components", variants: {
    "for-update": { lv: levels(0, 1) }, "for-condition": { lv: levels(0, 1) }, "while-init": { lv: levels(0, 1) }, body: { lv: levels(0, 1) }, "while-condition": { lv: levels(0, 1) },
    "inner-update": { lv: levels(1, 2) }, "accumulator-vs-counter": { lv: levels(1, 2) }, "control-variable": { lv: levels(1, 2) }, "outer-condition": { lv: levels(2, 2) },
  },
  generate(rng, d, variant) {
    const L = lvl(d), v = rng.pick(["i", "index", "k", "pos"]), acc = rng.pick(["total", "count", "sum"]);
    const s = rng.int(0, 4), dl = rng.pick([1, 2, 3]), b = s + dl * rng.int(3, 6);
    const op = rng.pick(["<", "<="]);
    const upd = updStmt(v, dl), cond = J.bin(op, V(v), N(b)), init = J.decl("int", v, N(s));
    const bodyStmt = rng.pick([J.op(acc, "+=", V(v)), J.inc(acc), J.op(acc, "+=", J.mul(V(v), N(2)))]);
    let program, answer, distractors, prompt;
    const frag = (st) => stmtText(st);
    const ex = (e) => exprStr(e);
    switch (variant) {
      case "for-update": case "for-condition": case "body": {
        program = P([J.decl("int", acc, N(0)), tag(J.forL(clone(init), clone(cond), clone(upd), [clone(bodyStmt)]), "main")]);
        const parts = { init: frag(init), cond: ex(cond), upd: frag(upd), body: frag(bodyStmt) + ";" };
        const want = { "for-update": "upd", "for-condition": "cond", body: "body" }[variant];
        prompt = { upd: "Select the statement that updates the loop counter.", cond: "Select the condition that determines whether another iteration runs.", body: "Select the statement in the loop body." }[want];
        answer = parts[want]; distractors = Object.entries(parts).filter(([k]) => k !== want).map(([k, x]) => ({ choice: x, misconception: `role-${k}` }));
        break;
      }
      case "while-init": case "while-condition": {
        const wcond = J.bin(rng.pick([">", ">="]), V(v), N(rng.int(0, 3)));
        const start = rng.int(10, 20);
        program = P([J.decl("int", acc, N(0)), J.decl("int", v, N(start)), tag(J.whileL(clone(wcond), [clone(bodyStmt), updStmt(v, -dl)]), "main")]);
        const parts = { init: `int ${v} = ${start};`, cond: ex(wcond), upd: frag(updStmt(v, -dl)) + ";", acc: `int ${acc} = 0;` };
        const want = variant === "while-init" ? "init" : "cond";
        prompt = want === "init" ? "Select the initialization of the loop-control variable." : "Select the condition that controls the while loop.";
        answer = parts[want]; distractors = Object.entries(parts).filter(([k]) => k !== want).map(([k, x]) => ({ choice: x, misconception: `role-${k}` }));
        break;
      }
      case "inner-update": case "outer-condition": {
        const R = rng.int(2, 5), C = rng.int(2, 5);
        program = P([J.decl("int", acc, N(0)), tag(J.forL(J.decl("int", "row", N(0)), J.lt(V("row"), N(R)), J.inc("row"), [J.forL(J.decl("int", "col", N(0)), J.le(V("col"), N(C)), J.op("col", "+=", N(dl)), [J.inc(acc)])]), "main")]);
        const parts = { oc: `row < ${R}`, ou: "row++", ic: `col <= ${C}`, iu: frag(updStmt("col", dl)), b: `${acc}++;` };
        const want = variant === "inner-update" ? "iu" : "oc";
        prompt = want === "iu" ? "Select the update of the inner loop's control variable." : "Select the condition that decides whether the outer loop runs again.";
        answer = parts[want]; distractors = rng.shuffle(Object.entries(parts).filter(([k]) => k !== want)).slice(0, 3).map(([k, x]) => ({ choice: x, misconception: `role-${k}` }));
        break;
      }
      case "accumulator-vs-counter": {
        const start = rng.int(1, 3);
        program = P([J.decl("int", v, N(start)), J.decl("int", acc, N(0)), tag(J.whileL(J.le(V(v), N(start + rng.int(4, 8))), [J.op(acc, "+=", V(v)), updStmt(v, dl)]), "main")]);
        const parts = { acc: `${acc} += ${v};`, upd: frag(updStmt(v, dl)) + ";", init: `int ${v} = ${start};`, decl: `int ${acc} = 0;` };
        const want = rng.chance(0.5) ? "acc" : "upd";
        prompt = want === "acc" ? "Select the statement that updates the accumulator (not the loop-control variable)." : "Select the statement that moves the loop toward stopping.";
        answer = parts[want]; distractors = Object.entries(parts).filter(([k]) => k !== want).map(([k, x]) => ({ choice: x, misconception: `role-${k}` }));
        break;
      }
      case "control-variable": {
        const names = rng.shuffle(["count", "limit", "total", v]).slice(0, 4); if (!names.includes(v)) names[0] = v;
        const others = names.filter((x) => x !== v);
        program = P([J.decl("int", others[0], N(rng.int(5, 9))), J.decl("int", others[1], N(0)), J.decl("int", v, N(0)), tag(J.whileL(J.lt(V(v), V(others[0])), [J.op(others[1], "+=", V(v)), J.inc(v)]), "main"), J.decl("int", others[2], V(others[1]))]);
        prompt = "Which variable is the loop-control variable?"; answer = v; distractors = others.map((x) => ({ choice: x, misconception: "role-variable" }));
        break;
      }
      default: throw new GenReject("variant " + variant);
    }
    // Intermediate/Advanced: an extra, unrelated statement in the loop body adds structural variety;
    // students must still pick out the requested loop component.
    if (L >= 1 && rng.chance(L === 2 ? 0.8 : 0.4)) {
      const main = findTag(program, "main");
      const cv = main.t === "for" ? main.init.name : (main.c.l?.name || v);
      const extraName = rng.pick(["extra", "seen", "marks"]);
      const kind = rng.pick(["guarded", "step", "print"]);
      const st = kind === "guarded" ? J.iff(J.eq(J.mod(V(cv), N(2)), N(0)), [J.inc(extraName)], null, { inline: rng.chance(0.5) }) : kind === "step" ? J.op(extraName, "+=", N(rng.int(2, 5))) : J.print(V(cv));
      const p2 = clone(program); const m2 = findTag(p2, "main");
      const at = m2.t === "while" ? Math.max(0, m2.body.length - 1) : m2.body.length;
      m2.body.splice(rng.int(0, at), 0, st);
      if (kind !== "print") p2.unshift(J.decl("int", extraName, N(0)));
      program = P(p2);
    }
    const notes = { "role-init": "That fragment runs once, before the first condition check.", "role-cond": "That is the condition, tested before each iteration.", "role-upd": "That statement changes the control variable after each iteration.", "role-body": "That statement is in the body — it is repeated, but it is not loop control.", "role-acc": "That declares the accumulator, not the control variable.", "role-oc": "That is the outer loop's condition.", "role-ou": "That is the outer loop's update.", "role-ic": "That is the inner loop's condition.", "role-iu": "That is the inner loop's update.", "role-b": "That is the inner loop's body.", "role-decl": "That declaration runs once before the loop.", "role-variable": "That variable changes or is compared, but it does not control how many times the loop repeats." };
    return {
      program, template: variant, concept: "initialization, condition, update, and body", params: { variant },
      prompt, choices: [{ choice: answer }, ...distractors.slice(0, 3).map((x) => ({ ...x, note: notes[x.misconception] }))], answer, targetKind: "component", choiceFormat: "fragment",
      traceLoop: "main", traceVars: [],
      noTrace: true,
      explain: "A for header holds initialization; condition; update. The body is the block in braces. A while loop keeps the same parts, but its initialization comes before the loop and its update is inside the body.",
    };
  },
};

/* ---------- conditional ---------- */
const conditionalF = {
  id: "conditional", variants: {
    "odd-count": { lv: levels(0, 1) }, "greater-sum": { lv: levels(0, 1) }, "continue-even": { lv: levels(0, 1) }, "break-target": { lv: levels(0, 1) },
    "else-count": { lv: levels(1, 2) }, "compound-and": { lv: levels(1, 2) }, "two-divisors": { lv: levels(2, 2) }, "nested-if-break": { lv: levels(2, 2) },
  },
  generate(rng, d, variant) {
    const L = lvl(d), s = rng.int(0, 3), e = s + rng.int(5, 7 + L * 2);
    const loop = (body) => tag(J.forL(J.decl("int", "i", N(s)), J.le(V("i"), N(e)), J.inc("i"), body), "main");
    let program, acc, concept;
    switch (variant) {
      case "odd-count": acc = "count"; program = P([J.decl("int", acc, N(0)), loop([J.iff(J.eq(J.mod(V("i"), N(2)), N(1)), [J.inc(acc)], null, { tag: "test", inline: true })])]); concept = "odd values"; break;
      case "greater-sum": { const t = rng.int(s + 1, e - 1); acc = "total"; program = P([J.decl("int", acc, N(0)), loop([J.iff(J.bin(rng.pick([">", ">="]), V("i"), N(t)), [J.op(acc, "+=", V("i"))], null, { tag: "test", inline: true })])]); concept = "selected values"; break; }
      case "continue-even": acc = "count"; program = P([J.decl("int", acc, N(0)), loop([J.iff(J.ne(J.mod(V("i"), N(2)), N(0)), [J.cont()], null, { tag: "test", inline: true }), J.inc(acc)])]); concept = "continue"; break;
      case "break-target": { const t = rng.int(s + 2, e - 1); acc = "found"; program = P([J.decl("int", acc, N(-1)), loop([J.iff(J.eq(J.mul(V("i"), V("i")), N(t * t)), [J.set(acc, V("i")), J.brk()], null, { tag: "test" })]), J.decl("int", "after", J.add(V(acc), N(1)))]); acc = "after"; concept = "break"; break; }
      case "else-count": acc = "small"; program = P([J.decl("int", "big", N(0)), J.decl("int", acc, N(0)), loop([J.iff(J.gt(V("i"), N(rng.int(s + 2, e - 2))), [J.inc("big")], [J.op(acc, "+=", V("i"))], { tag: "test" })])]); concept = "else branch"; break;
      case "compound-and": { const lo = rng.int(s + 1, s + 3), hi = rng.int(lo + 2, e); acc = "total"; program = P([J.decl("int", acc, N(0)), loop([J.iff(J.and(J.ge(V("i"), N(lo)), J.ne(V("i"), N(hi - 1))), [J.op(acc, "+=", V("i"))], null, { tag: "test" })])]); concept = "compound condition"; break; }
      case "two-divisors": { const a = rng.int(2, 3), b = rng.int(4, 5); acc = "count"; program = P([J.decl("int", acc, N(0)), loop([J.iff(J.or(J.eq(J.mod(V("i"), N(a)), N(0)), J.eq(J.mod(V("i"), N(b)), N(0))), [J.inc(acc)], null, { tag: "test" })])]); concept = "|| with two divisors"; break; }
      case "nested-if-break": { const lim = rng.int(8, 20); acc = "total"; program = P([J.decl("int", acc, N(0)), loop([J.iff(J.eq(J.mod(V("i"), N(2)), N(0)), [J.op(acc, "+=", V("i")), J.iff(J.gt(V(acc), N(lim)), [J.brk()], null, { tag: "inner", inline: true })], null, { tag: "test" })])]); concept = "break inside a nested if"; break; }
      default: throw new GenReject("variant " + variant);
    }
    return {
      program, target: { kind: "var", name: acc }, concept, template: variant, prompt: `What is the final value of ${acc}?`, params: { variant, s, e },
      traceLoop: "main", traceVars: ["i", acc === "after" ? "found" : acc],
      extraDistractors: variant === "break-target" ? [{ choice: String(run(program).vars.found.v), misconception: "printed-vs-final" }, { choice: "0", misconception: "initial-value" }, { choice: String(e + 1), misconception: "ignore-break" }] : variant === "odd-count" || variant === "two-divisors" ? [{ choice: String(e - s + 1), misconception: "ignore-condition" }] : [],
      mutants: [{ misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "ignore-break", program: mutate.removeAll(program, "break") }, { misconception: "ignore-continue", program: mutate.removeAll(program, "continue") }, { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(s + 1); }) }],
      explain: (ans) => `i runs from ${s} to ${e}. Test the condition for each value and apply only the selected updates${concept.includes("break") ? "; break ends the loop the first time it runs" : ""}. Result: ${ans}.`,
    };
  },
};

/* ---------- while ---------- */
const whileF = {
  id: "while", variants: {
    "integer-half": { lv: levels(0, 1) }, "increment-sentinel": { lv: levels(0, 1) }, "zero-while": { lv: levels(0, 1) }, decrement: { lv: levels(0, 1) },
    "two-var": { lv: levels(1, 2) }, "multiply-until": { lv: levels(1, 2) }, "digit-strip": { lv: levels(1, 2) }, "compound-and": { lv: levels(2, 2) },
  },
  generate(rng, d, variant) {
    const v = rng.pick(["n", "x", "level", "value"]);
    let program, target = { kind: "var", name: v }, concept, vars = [v];
    switch (variant) {
      case "integer-half": { const s = rng.int(18, 180), b = rng.int(1, 12); program = P([J.decl("int", v, N(s)), tag(J.whileL(J.gt(V(v), N(b)), [J.op(v, "/=", N(2))]), "main")]); concept = "integer division"; break; }
      case "increment-sentinel": { const s = rng.int(0, 10), dl = rng.int(2, 8), b = s + dl * rng.int(2, 9) + rng.int(-1, 1); program = P([J.decl("int", v, N(s)), tag(J.whileL(J.lt(V(v), N(b)), [J.op(v, "+=", N(dl))]), "main")]); concept = "value after the loop"; break; }
      case "zero-while": { const s = rng.int(2, 100); program = P([J.decl("int", v, N(s)), tag(J.whileL(J.lt(V(v), N(0)), [J.dec(v)]), "main")]); concept = "zero iterations"; break; }
      case "decrement": { const s = rng.int(9, 32), dl = rng.int(2, 7), b = rng.int(2, 10); program = P([J.decl("int", v, N(s)), tag(J.whileL(J.ge(V(v), N(b)), [J.op(v, "-=", N(dl))]), "main")]); concept = "decreasing counter"; break; }
      case "two-var": { const a = rng.int(1, 15), b = rng.int(16, 100); program = P([J.decl("int", "a", N(a)), J.decl("int", "b", N(b)), tag(J.whileL(J.lt(V("a"), V("b")), [J.op("a", "*=", N(2)), J.op("b", "-=", N(3))]), "main")]); target = { kind: "vars", names: ["a", "b"] }; vars = ["a", "b"]; concept = "two changing variables"; break; }
      case "multiply-until": { const s = rng.int(1, 3), f = rng.pick([2, 3]), lim = rng.int(30, 120); program = P([J.decl("int", v, N(s)), J.decl("int", "steps", N(0)), tag(J.whileL(J.le(V(v), N(lim)), [J.op(v, "*=", N(f)), J.inc("steps")]), "main")]); target = { kind: "vars", names: [v, "steps"] }; vars = [v, "steps"]; concept = "multiply until a limit"; break; }
      case "digit-strip": { const s = rng.int(1000, 99999); program = P([J.decl("int", v, N(s)), J.decl("int", "count", N(0)), tag(J.whileL(J.ge(V(v), N(10)), [J.op(v, "/=", N(10)), J.inc("count")]), "main")]); target = { kind: "vars", names: [v, "count"] }; vars = [v, "count"]; concept = "removing digits"; break; }
      case "compound-and": { const s = rng.int(30, 60), lim = rng.int(3, 6); program = P([J.decl("int", v, N(s)), J.decl("int", "tries", N(0)), tag(J.whileL(J.and(J.gt(V(v), N(5)), J.lt(V("tries"), N(lim))), [J.op(v, "-=", N(rng.int(6, 12))), J.inc("tries")]), "main")]); target = { kind: "vars", names: [v, "tries"] }; vars = [v, "tries"]; concept = "two ways to stop"; break; }
      default: throw new GenReject("variant " + variant);
    }
    return {
      program, target, concept, template: variant, prompt: target.kind === "var" ? `What is the final value of ${v}?` : `What are the final values of ${target.names.join(" and ")}?`, params: { variant },
      traceLoop: "main", traceVars: vars,
      mutants: [{ misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "last-in-loop", program: mutate.edit(program, (q) => { const l = findTag(q, "main"); const w = vars[0]; const c = l.c.l?.op ? l.c.l : l.c; const op = { "<": "<", "<=": "<=", ">": ">", ">=": ">=" }[c.op]; if (!op) return false; const step = l.body[0]; const inv = { "+=": "-=", "-=": "+=", "*=": "/=", "/=": "*=" }[step.op]; if (!inv) return false; q.push(J.op(w, inv, step.e)); }) }, { misconception: "update-order", program: mutate.swapBody(program, "main") }, { misconception: "initial-value", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.b(false); }) }],
      extraDistractors: (() => { const r = run(program); const rows = r.trace.filter((x) => x.loop === findTag(program, "main").id); const fmt = (row) => (target.kind === "var" ? row.vars[v] : target.names.map((n) => `${n} = ${row.vars[n]}`).join(", ")); return [...(variant === "zero-while" ? [{ choice: fmt({ vars: { [v]: String(Number(rows[0].vars[v]) - 1) } }), misconception: "runs-once" }, { choice: fmt({ vars: { [v]: String(Number(rows[0].vars[v]) + 1) } }), misconception: "direction" }, { choice: "0", misconception: "ignore-condition" }] : []), rows.length >= 2 ? { choice: fmt(rows.at(-2)), misconception: "last-in-loop" } : null, { choice: fmt(rows[0]), misconception: "initial-value" }, rows.length >= 3 ? { choice: fmt(rows.at(-3)), misconception: "missed-final" } : null]; })(),
      explain: (ans) => `The condition is tested before every iteration. Track ${vars.join(" and ")} until the condition is false: ${ans}.`,
    };
  },
};

/* ---------- nested ---------- */
const nestedF = {
  id: "nested", variants: {
    rectangle: { lv: levels(0, 0) }, diagonal: { lv: levels(0, 1) }, triangular: { lv: levels(1, 2) }, "inner-step": { lv: levels(0, 0) }, "break-inner": { lv: levels(1, 2) },
    "dependent-start": { lv: levels(1, 1) }, "nested-continue": { lv: levels(2, 2) }, "line-output": { lv: levels(1, 1) }, "outer-accum": { lv: levels(2, 2) }, "two-counters": { lv: levels(2, 2) },
  },
  generate(rng, d, variant) {
    const L = lvl(d), R = rng.int(2 + (L === 2 ? 1 : 0), 4 + L * 2), C = rng.int(2, 4 + L * 2);
    const nest = (outerBody) => tag(J.forL(J.decl("int", "row", N(0)), J.lt(V("row"), N(R)), J.inc("row"), outerBody), "main");
    const inner = (body, opts = {}) => tag(J.forL(J.decl("int", "col", opts.init || N(0)), opts.cond || J.lt(V("col"), N(C)), opts.upd || J.inc("col"), body), "inner");
    let program, target = { kind: "var", name: "count" }, concept, extraNested = [];
    switch (variant) {
      case "rectangle": program = P([J.decl("int", "count", N(0)), nest([inner([J.inc("count")])])]); concept = "independent bounds"; break;
      case "diagonal": program = P([J.decl("int", "count", N(0)), nest([inner([J.iff(J.bin(rng.pick(["==", "<", ">"]), V("row"), V("col")), [J.inc("count")], null, { tag: "test", inline: true })])])]); concept = "nested condition"; break;
      case "triangular": program = P([J.decl("int", "count", N(0)), nest([inner([J.inc("count")], { cond: J.bin(rng.pick(["<", "<="]), V("col"), V("row")) })])]); concept = "dependent bounds"; break;
      case "inner-step": { const st = rng.int(2, 3); program = P([J.decl("int", "total", N(0)), nest([inner([J.op("total", "+=", V("col"))], { init: N(1), cond: J.le(V("col"), N(C * st)), upd: J.op("col", "+=", N(st)) })])]); target = { kind: "var", name: "total" }; concept = "nested accumulator"; extraNested = [{ misconception: "ignore-step", program: mutate.edit(program, (q) => { findTag(q, "inner").upd = J.inc("col"); }) }, { misconception: "accum-overwrite", program: mutate.overwrite(program, "total") }, { misconception: "ignore-inner", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("row"), N(1)); }) }]; break; }
      case "break-inner": { const b = rng.int(0, C - 2); program = P([J.decl("int", "count", N(0)), nest([inner([J.inc("count"), J.iff(J.eq(V("col"), N(b)), [J.brk()], null, { tag: "test", inline: true })])])]); concept = "inner break"; break; }
      case "dependent-start": program = P([J.decl("int", "count", N(0)), nest([inner([J.inc("count")], { init: V("row"), cond: J.lt(V("col"), N(R)) })])]); concept = "inner starts at the outer value"; break;
      case "nested-continue": program = P([J.decl("int", "count", N(0)), nest([inner([J.iff(J.eq(J.mod(J.add(V("row"), V("col")), N(2)), N(0)), [J.cont()], null, { tag: "test", inline: true }), J.inc("count")])])]); concept = "continue in the inner loop"; break;
      case "line-output": program = P([nest([inner([J.printNo(V("col"))], { cond: J.le(V("col"), V("row")) }), J.print(J.s(""))])]); target = { kind: "output" }; concept = "nested output"; break;
      case "two-counters": program = P([J.decl("int", "count", N(0)), J.decl("int", "other", N(0)), nest([inner([J.iff(J.gt(J.add(V("row"), V("col")), N(R - 1)), [J.inc("count")], [J.op("other", "+=", V("col"))], { tag: "test" })], { cond: J.le(V("col"), V("row")) })])]); target = { kind: "vars", names: ["count", "other"] }; concept = "two accumulators in a dependent inner loop"; break;
      case "outer-accum": program = P([J.decl("int", "total", N(0)), nest([J.op("total", "+=", N(10)), inner([J.inc("total")], { cond: J.lt(V("col"), V("row")) })])]); target = { kind: "var", name: "total" }; concept = "work in both loop bodies"; break;
      default: throw new GenReject("variant " + variant);
    }
    return {
      program, target, concept, template: variant, prompt: target.kind === "output" ? "What does the program print?" : target.kind === "vars" ? `What are the final values of ${target.names.join(" and ")}?` : variant === "triangular" ? "How many times does count++ execute?" : `What is the final value of ${target.name}?`, params: { variant, R, C },
      traceLoop: "main", traceVars: ["row", ...(target.name ? [target.name] : target.names || [])],
      mutants: [...extraNested, { misconception: "boundary", program: mutate.edit(program, (q) => { const f = findTag(q, "inner"); f.c.op = { "<": "<=", "<=": "<=", ">": ">=", "==": "==" }[f.c.op] || f.c.op; findTag(q, "main").c.op = "<="; }) }, { misconception: "ignore-inner", program: mutate.edit(program, (q) => { const f = findTag(q, "inner"); f.c = J.lt(V("col"), J.add(f.init.e.t === "num" ? N(f.init.e.v) : f.init.e, N(1))); }) }, { misconception: "outer-times-inner-max", program: mutate.edit(program, (q) => { const f = findTag(q, "inner"); if (JSON.stringify(f.c).includes('"row"') || JSON.stringify(f.init).includes('"row"')) { f.c = J.lt(V("col"), N(R)); f.init.e = N(0); } else return false; }) }, { misconception: "boundary", program: mutate.boundary(program, "inner") }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "ignore-break", program: mutate.removeAll(program, "break") }, { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }],
      explain: (ans) => `The inner loop restarts for each of the ${R} outer iterations (row = 0..${R - 1}). Add up the inner work for each outer iteration: ${ans}.`,
    };
  },
};

/* ---------- debug ---------- */
const debugF = {
  id: "debug", variants: {
    inclusive: { lv: levels(0, 1) }, "counter-update": { lv: levels(0, 2) }, accumulate: { lv: levels(0, 1) }, "while-progress": { lv: levels(0, 1) }, "array-bound": { lv: levels(0, 1) },
    "wrong-init": { lv: levels(1, 2) }, "wrong-start": { lv: levels(1, 2) }, "reset-inside": { lv: levels(1, 2) }, "wrong-direction": { lv: levels(1, 2) }, "misplaced-print": { lv: levels(2, 2) },
  },
  generate(rng, d, variant) {
    const L = lvl(d), v = rng.pick(["i", "k", "n", "x", "j", "idx"]);
    let buggy, goalText, goal, fixes; // fixes: [{label, apply(p), correct}]
    // Debug prompts expose the target values directly, so give the core repair
    // templates a wider (but still classroom-sized) range to avoid cycling
    // through the same small set of exact examples during independent draws.
    const a = rng.int(1, 20), b = a + rng.int(3, 10 + L);
    const sumTo = (from, to) => range(from, to).reduce((x, y) => x + y, 0);
    const outGoal = (p) => run(p, { stepLimit: 5000 });
    switch (variant) {
      case "inclusive": {
        buggy = P([tag(J.forL(J.decl("int", v, N(a)), J.lt(V(v), N(b)), J.inc(v), [J.print(V(v))]), "main")]);
        goalText = `Print every integer from ${a} through ${b}.`; goal = { output: range(a, b).join("\n") };
        fixes = [[`Change ${v} < ${b} to ${v} <= ${b}`, (p) => (findTag(p, "main").c.op = "<="), true], [`Change ${v} < ${b} to ${v} < ${b - 1}`, (p) => (findTag(p, "main").c.r = N(b - 1))], [`Change ${v} = ${a} to ${v} = ${a - 1}`, (p) => (findTag(p, "main").init.e = N(a - 1))], [`Change ${v}++ to ${v}--`, (p) => (findTag(p, "main").upd = J.dec(v))], [`Change ${v} < ${b} to ${v} > ${b}`, (p) => (findTag(p, "main").c.op = ">")]];
        break;
      }
      case "counter-update": {
        buggy = P([J.decl("int", "total", N(0)), tag(J.forL(J.decl("int", v, N(a)), J.le(V(v), N(b)), J.inc(v), [J.op("total", "+=", V(v)), tag(J.inc(v), "extra")]), "main")]);
        goalText = `Add ${range(a, b).join(" + ")} and store ${sumTo(a, b)} in total.`; goal = { var: ["total", sumTo(a, b)] };
        fixes = [[`Remove the line ${v}++;`, (p) => findTag(p, "main").body.pop(), true], [`Change ${v}++ (in the header) to ${v} += 2`, (p) => (findTag(p, "main").upd = J.op(v, "+=", N(2)))], [`Change total += ${v}; to total = ${v};`, (p) => (findTag(p, "main").body[0].op = "=")], [`Change ${v} <= ${b} to ${v} < ${b}`, (p) => (findTag(p, "main").c.op = "<")]];
        break;
      }
      case "accumulate": {
        const step = rng.pick([1, 2, 3]), values = range(a, b, step), expected = values.reduce((x, y) => x + y, 0);
        buggy = P([J.decl("int", "total", N(0)), tag(J.forL(J.decl("int", v, N(a)), J.le(V(v), N(b)), updStmt(v, step), [J.set("total", V(v))]), "main")]);
        goalText = `Store ${expected} (the sum of ${values.join(" + ")}) in total.`; goal = { var: ["total", expected] };
        fixes = [[`Change total = ${v}; to total += ${v};`, (p) => (findTag(p, "main").body[0].op = "+="), true], [`Change total = ${v}; to total++;`, (p) => (findTag(p, "main").body[0] = J.inc("total"))], [`Change total = ${v}; to ${v} += total;`, (p) => (findTag(p, "main").body[0] = J.op(v, "+=", V("total")))], [`Change ${v} <= ${b} to ${v} < ${b}`, (p) => (findTag(p, "main").c.op = "<")]];
        break;
      }
      case "while-progress": {
        const s = rng.int(4, 14), floor = rng.int(0, 3), step = rng.int(1, 3), values = range(s, floor + 1, -step);
        buggy = P([J.decl("int", v, N(s)), tag(J.whileL(J.gt(V(v), N(floor)), [J.print(V(v))]), "main")]);
        goalText = `Print ${values.join(", ")} and stop.`; goal = { output: values.join("\n") };
        fixes = [[`Add ${v} -= ${step}; inside the loop after the print`, (p) => findTag(p, "main").body.push(J.op(v, "-=", N(step))), true], [`Add ${v} += ${step}; inside the loop after the print`, (p) => findTag(p, "main").body.push(J.op(v, "+=", N(step)))], [`Change ${v} > ${floor} to ${v} < ${floor}`, (p) => (findTag(p, "main").c.op = "<")], [`Add ${v} -= ${step}; inside the loop before the print`, (p) => findTag(p, "main").body.unshift(J.op(v, "-=", N(step)))]];
        break;
      }
      case "array-bound": {
        const vals = Array.from({ length: rng.int(3, 5) }, () => rng.int(1, 9));
        buggy = P([J.decl("int[]", "values", J.arr(vals.map((x) => N(x)))), tag(J.forL(J.decl("int", v, N(0)), J.le(V(v), J.len(V("values"))), J.inc(v), [J.print(J.idx(V("values"), V(v)))]), "main")]);
        goalText = "Print every array element exactly once."; goal = { output: vals.join("\n") };
        fixes = [[`Change ${v} <= values.length to ${v} < values.length`, (p) => (findTag(p, "main").c.op = "<"), true], [`Change ${v} <= values.length to ${v} < values.length - 1`, (p) => (findTag(p, "main").c = J.lt(V(v), J.sub(J.len(V("values")), N(1))))], [`Change ${v} = 0 to ${v} = 1`, (p) => (findTag(p, "main").init.e = N(1))], [`Change ${v}++ to ${v} += 2`, (p) => (findTag(p, "main").upd = J.op(v, "+=", N(2)))]];
        break;
      }
      case "wrong-init": {
        const s0 = rng.int(2, 7), e = s0 + rng.int(2, 7), pr = rng.pick(["product", "result", "prod"]);
        buggy = P([J.decl("int", pr, N(0)), tag(J.forL(J.decl("int", v, N(s0)), J.le(V(v), N(e)), J.inc(v), [J.op(pr, "*=", V(v))]), "main")]);
        const f = range(s0, e).reduce((x, y) => x * y, 1);
        goalText = `Store ${f} (the product ${range(s0, e).join(" × ")}) in ${pr}.`; goal = { var: [pr, f] };
        fixes = [[`Change int ${pr} = 0; to int ${pr} = 1;`, (p) => (p[0].e = N(1)), true], [`Change ${pr} *= ${v}; to ${pr} += ${v};`, (p) => (findTag(p, "main").body[0].op = "+=")], [`Change ${v} = ${s0} to ${v} = 0`, (p) => (findTag(p, "main").init.e = N(0))], [`Change ${v} <= ${e} to ${v} < ${e}`, (p) => (findTag(p, "main").c.op = "<")]];
        break;
      }
      case "wrong-start": {
        const k = rng.int(2, 30), n = rng.int(3, 12);
        buggy = P([tag(J.forL(J.decl("int", v, N(0)), J.le(V(v), N(k * n)), J.op(v, "+=", N(k)), [J.print(V(v))]), "main")]);
        goalText = `Print the multiples ${range(k, k * n, k).join(", ")}.`; goal = { output: range(k, k * n, k).join("\n") };
        fixes = [[`Change ${v} = 0 to ${v} = ${k}`, (p) => (findTag(p, "main").init.e = N(k)), true], [`Change ${v} <= ${k * n} to ${v} < ${k * n}`, (p) => (findTag(p, "main").c.op = "<")], [`Change ${v} += ${k} to ${v}++`, (p) => (findTag(p, "main").upd = J.inc(v))], [`Change ${v} = 0 to ${v} = 1`, (p) => (findTag(p, "main").init.e = N(1))]];
        break;
      }
      case "reset-inside": {
        buggy = P([tag(J.forL(J.decl("int", v, N(a)), J.le(V(v), N(b)), J.inc(v), [J.decl("int", "total", N(0)), J.op("total", "+=", V(v)), J.print(V("total"))]), "main")]);
        goalText = `Print the running totals ${range(a, b).map((x) => sumTo(a, x)).join(", ")}.`; goal = { output: range(a, b).map((x) => sumTo(a, x)).join("\n") };
        fixes = [["Move int total = 0; above the loop", (p) => { const l = findTag(p, "main"); p.unshift(l.body.shift()); }, true], [`Change total += ${v}; to total = ${v};`, (p) => (findTag(p, "main").body[1].op = "=")], ["Move System.out.println(total); below the loop", (p) => { findTag(p, "main").body.pop(); }], [`Change ${v}++ to ${v} += 2`, (p) => (findTag(p, "main").upd = J.op(v, "+=", N(2)))]];
        break;
      }
      case "wrong-direction": {
        const floor = rng.int(1, 5), step = rng.int(1, 3), s = rng.int(floor + step, floor + step + 25), values = range(s, floor, -step);
        buggy = P([tag(J.forL(J.decl("int", v, N(s)), J.ge(V(v), N(floor)), J.op(v, "+=", N(step)), [J.print(V(v))]), "main")]);
        goalText = `Print ${values.join(", ")}.`; goal = { output: values.join("\n") };
        fixes = [[`Change ${v} += ${step} to ${v} -= ${step}`, (p) => (findTag(p, "main").upd = J.op(v, "-=", N(step))), true], [`Change ${v} >= ${floor} to ${v} <= ${floor}`, (p) => (findTag(p, "main").c.op = "<=")], [`Change ${v} = ${s} to ${v} = ${floor}`, (p) => (findTag(p, "main").init.e = N(floor))], [`Change ${v} += ${step} to ${v} += ${step + 1}`, (p) => (findTag(p, "main").upd = J.op(v, "+=", N(step + 1)))]];
        break;
      }
      case "misplaced-print": {
        buggy = P([J.decl("int", "total", N(0)), tag(J.forL(J.decl("int", v, N(a)), J.le(V(v), N(b)), J.inc(v), [J.op("total", "+=", V(v)), J.print(V("total"))]), "main")]);
        goalText = `Print only the final total, ${sumTo(a, b)}, once.`; goal = { output: String(sumTo(a, b)) };
        fixes = [["Move System.out.println(total); below the loop", (p) => { const l = findTag(p, "main"); p.push(l.body.pop()); }, true], ["Move System.out.println(total); above the loop", (p) => { const l = findTag(p, "main"); p.splice(1, 0, l.body.pop()); }], [`Change ${v} <= ${b} to ${v} < ${b}`, (p) => (findTag(p, "main").c.op = "<")], ["Move int total = 0; into the loop", (p) => { findTag(p, "main").body.unshift(p.shift()); }]];
        break;
      }
      default: throw new GenReject("variant " + variant);
    }
    const meets = (p) => { const r = outGoal(p); if (!r.ok) return false; return goal.output !== undefined ? r.outputText === goal.output : r.vars[goal.var[0]]?.v === goal.var[1]; };
    if (meets(buggy)) throw new GenReject("buggy program already meets goal");
    const evaluated = fixes.map(([label, apply, correct]) => { const p = clone(buggy); apply(p); return { label, ok: meets(P(p)), correct: !!correct, program: P(p) }; });
    const right = evaluated.filter((f) => f.correct);
    if (right.length !== 1 || !right[0].ok) throw new GenReject("intended fix does not meet goal");
    const wrong = evaluated.filter((f) => !f.correct && !f.ok);
    if (wrong.length < 3) throw new GenReject("a distractor fix also works");
    const bres = run(buggy, { stepLimit: 5000 });
    return {
      program: buggy, allowError: true, template: variant, concept: "loop correction", params: { variant },
      prompt: goalText + " Which change fixes the loop?",
      choices: [{ choice: right[0].label }, ...rng.shuffle(wrong).slice(0, 3).map((f) => { const r = run(f.program, { stepLimit: 5000 }); return { choice: f.label, misconception: "fix-fails", note: r.ok ? `After this change the program ${goal.output !== undefined ? `prints ${r.output.length ? r.output.join(", ") : "nothing"}` : `stores ${r.vars[goal.var[0]] ? r.vars[goal.var[0]].v : "?"}`}.` : r.error === "StepLimit" ? "After this change the loop never stops." : `After this change the program throws ${r.error}.` }; })],
      answer: right[0].label, targetKind: "debug-fix", choiceFormat: "fix",
      fixedProgram: right[0].program,
      traceLoop: "main", traceVars: [v], noTrace: true,
      explain: `As written, the program ${bres.ok ? (goal.output !== undefined ? `prints ${bres.output.join(", ") || "nothing"}` : `stores ${bres.vars[goal.var[0]]?.v}`) : bres.error === "StepLimit" ? "never stops (the condition never becomes false)" : `throws ${bres.error}`}. ${right[0].label} is the only change listed that meets the goal; each other change was run and fails it.`,
    };
  },
};

const varied = (fam, opts = {}) => ({ ...fam, generate(rng, d, variant) { const spec = fam.generate(rng, d, variant); return applyVariety(spec, rng, opts); } });
export const originalFamilies = { iterations: varied(iterations), final: varied(finalV), choose: chooseF, components, conditional: varied(conditionalF), while: varied(whileF, { convert: false }), nested: varied(nestedF), debug: debugF };
export { allowed };
