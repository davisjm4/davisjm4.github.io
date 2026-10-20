/* Standard Iteration Algorithms — ten reasoning families. Each template builds an AST,
 * a question target, and misconception mutants; answers come from the interpreter. */
import { J, P, V, N, lvl, range, clone, findTag, run, ordinal, arrLit, selectStatement, badStep, stateTarget, stateMutants, checks, walk } from "./fam-util.js?v=loop-expansion-v2";
import { mutate, GenReject } from "./questions.js?v=loop-expansion-v2";
import { tag, mark } from "./java-model.js?v=loop-expansion-v2";

const choose = (rng, d, templates) => {
  const ok = templates.filter(([lo, hi]) => lvl(d) >= lo && lvl(d) <= hi);
  return rng.pick(ok)[2];
};
const digits = (n) => String(n).split("").map(Number);
const numberFor = (rng, d, opts = {}) => {
  const len = opts.len ?? [rng.int(2, 3), rng.int(3, 4), rng.int(4, 5)][lvl(d)];
  let s = String(rng.int(1, 9));
  for (let i = 1; i < len; i++) s += String(rng.int(opts.noZero ? 1 : 0, 9));
  return Number(s);
};

/* ---------------- A. Digit extraction ---------------- */
function digitLoop(numName, body) { return tag(J.whileL(J.gt(V(numName), N(0)), body), "main"); }
const digitExtraction = {
  id: "digit-extraction", name: "Digit extraction",
  generate(rng, d) {
    const num = rng.pick(["number", "n", "value", "num"]);
    const t = choose(rng, d, [
      [0, 1, "sum"], [0, 1, "count"], [0, 1, "leading"], [1, 2, "reverse"], [1, 2, "product"], [1, 2, "find"],
      [1, 2, "extreme"], [0, 1, "zero"], [1, 2, "state"], [2, 2, "evenodd"], [2, 2, "palindrome"], [2, 2, "alternate"], [1, 2, "select"], [1, 2, "badstep"],
    ]);
    const n = numberFor(rng, d, { noZero: t === "product" });
    const ds = digits(n);
    const base = (acc, init, update, extra = []) => P([J.decl("int", num, N(n)), J.decl("int", acc, N(init)), ...extra, digitLoop(num, update)]);
    const wrongOp = (p, acc) => mutate.edit(p, (q) => { let hit = false; walk(q, (s) => { if (s.t === "set" && s.name === acc && s.e) { const swap = (e) => { if (e?.t === "bin" && e.op === "%" && e.l.t === "var" && e.l.name === num) { e.op = "/"; hit = true; } else if (e && typeof e === "object") ["l", "r", "e"].forEach((k) => e[k] && swap(e[k])); }; swap(s.e); } }); return hit; });
    if (t === "sum" || t === "count") {
      const acc = t === "sum" ? rng.pick(["sum", "total", "digitSum"]) : rng.pick(["count", "digits", "length"]);
      const upd = t === "sum" ? J.op(acc, "+=", J.mod(V(num), N(10))) : J.inc(acc);
      const program = base(acc, 0, [upd, J.op(num, "/=", N(10))]);
      const ask = rng.chance(lvl(d) === 0 ? 0.25 : 0.4) ? "body" : "var";
      const target = ask === "body" ? { kind: "body", tag: "main" } : { kind: "var", name: acc };
      return {
        program, target, template: `${t}-digits`, concept: t === "sum" ? "summing digits with % and /" : "counting digits",
        prompt: ask === "body" ? "How many times does the loop body execute?" : `What is the final value of ${acc}?`,
        params: { n, digits: ds.length, sum: ds.reduce((a, b) => a + b, 0) }, traceLoop: "main", traceVars: [num, acc],
        mutants: [
          { misconception: "update-order", program: mutate.swapBody(program, "main") },
          { misconception: "wrong-operator", program: wrongOp(program, acc) },
          { misconception: "off-start", program: mutate.setInit(program, acc, N(1)) },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
          ask === "body" || t === "count" ? { misconception: "cond-vs-body", program, target: { kind: "cond", tag: "main" } } : null,
        ],
        extraDistractors: t === "count" ? [{ choice: String(ds.reduce((a, b) => a + b, 0)), misconception: "sum-vs-count" }, { choice: String(n % 10), misconception: "value-vs-count" }] : [{ choice: String(ds.length), misconception: "sum-vs-count" }, { choice: String(ds.slice(1).reduce((a, b) => a + b, 0)), misconception: "missed-final" }],
        explain: `Each iteration ${t === "sum" ? `adds the last digit (${num} % 10)` : "counts one digit"} and then removes it with ${num} /= 10. ${n} has ${ds.length} digits, so the body runs ${ds.length} times before ${num} becomes 0.`,
      };
    }
    if (t === "leading") {
      const program = base("digit", 0, [J.set("digit", J.mod(V(num), N(10))), J.op(num, "/=", N(10))]);
      return {
        program, target: { kind: "var", name: "digit" }, template: "leading-digit", concept: "last digit extracted",
        prompt: "What is the final value of digit?", params: { n }, traceLoop: "main", traceVars: [num, "digit"],
        mutants: [
          { misconception: "update-order", program: mutate.swapBody(program, "main") },
          { misconception: "wrong-operator", program: wrongOp(program, "digit") },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
        ],
        extraDistractors: [{ choice: String(n % 10), misconception: "printed-vs-final" }, { choice: "0", misconception: "last-in-loop" }, { choice: String(ds.length), misconception: "sum-vs-count" }],
        explain: `digit is overwritten every iteration. The last iteration runs when ${num} is ${ds[0]}, so digit ends as the leading digit, ${ds[0]}.`,
      };
    }
    if (t === "reverse") {
      const rev = rng.pick(["reversed", "rev", "result"]);
      const program = base(rev, 0, [J.set(rev, J.add(J.mul(V(rev), N(10)), J.mod(V(num), N(10)))), J.op(num, "/=", N(10))]);
      return {
        program, target: { kind: "var", name: rev }, template: "reverse-digits", concept: "reversing digits",
        prompt: `What is the final value of ${rev}?`, params: { n }, traceLoop: "main", traceVars: [num, rev],
        mutants: [
          { misconception: "reverse-no-shift", program: mutate.edit(program, (q) => { findTag(q, "main").body[0].e = J.add(V(rev), J.mod(V(num), N(10))); }) },
          { misconception: "update-order", program: mutate.swapBody(program, "main") },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
        ],
        extraDistractors: [{ choice: String(n), misconception: "initial-value" }],
        explain: `Each iteration shifts ${rev} left one place (× 10) and appends the last digit of ${num}. The digits come out last-to-first, so ${rev} ends as ${Number(String(n).split("").reverse().join(""))}${String(n).endsWith("0") ? " (a leading zero disappears in an int)" : ""}.`,
      };
    }
    if (t === "product") {
      const program = base("product", 1, [J.op("product", "*=", J.mod(V(num), N(10))), J.op(num, "/=", N(10))]);
      return {
        program, target: { kind: "var", name: "product" }, template: "product-digits", concept: "multiplying digits",
        prompt: "What is the final value of product?", params: { n }, traceLoop: "main", traceVars: [num, "product"],
        mutants: [
          { misconception: "accum-init", program: mutate.setInit(program, "product", N(0)) },
          { misconception: "update-order", program: mutate.swapBody(program, "main") },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
          { misconception: "accum-overwrite", program: mutate.edit(program, (q) => { findTag(q, "main").body[0].op = "="; }) },
        ],
        explain: `product starts at 1 and is multiplied by each digit: ${ds.slice().reverse().join(" × ")} = ${ds.reduce((a, b) => a * b, 1)}.`,
      };
    }
    if (t === "find") {
      const target = rng.pick(ds), acc = "matches";
      const program = base(acc, 0, [J.iff(J.eq(J.mod(V(num), N(10)), N(target)), [J.inc(acc)], null, { tag: "test", inline: rng.chance(0.5) }), J.op(num, "/=", N(10))]);
      return {
        program, target: { kind: "var", name: acc }, template: "count-specific-digit", concept: "finding a specific digit",
        prompt: `What is the final value of ${acc}?`, params: { n, target }, traceLoop: "main", traceVars: [num, acc],
        mutants: [
          { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") },
          { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") },
          { misconception: "update-order", program: mutate.swapBody(program, "main") },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
        ],
        explain: `The loop examines each digit of ${n} once (via ${num} % 10) and counts the ones equal to ${target}: ${ds.filter((x) => x === target).length}.`,
      };
    }
    if (t === "extreme") {
      const big = rng.chance(0.5), acc = big ? "largest" : "smallest";
      const program = P([J.decl("int", num, N(n)), J.decl("int", acc, N(big ? 0 : 9)), digitLoop(num, [
        J.decl("int", "digit", J.mod(V(num), N(10))),
        J.iff(big ? J.gt(V("digit"), V(acc)) : J.lt(V("digit"), V(acc)), [J.set(acc, V("digit"))], null, { tag: "test" }),
        J.op(num, "/=", N(10)),
      ])]);
      return {
        program, target: { kind: "var", name: acc }, template: `${acc}-digit`, concept: "running extreme over digits",
        prompt: `What is the final value of ${acc}?`, params: { n }, traceLoop: "main", traceVars: [num, acc],
        mutants: [
          { misconception: "comparison-direction", program: mutate.edit(program, (q) => { const s = findTag(q, "test"); s.c.op = big ? "<" : ">"; }) },
          { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
        ],
        extraDistractors: [{ choice: String(n % 10), misconception: "initial-value" }],
        explain: `${acc} is replaced only when a digit is ${big ? "larger" : "smaller"} than the current ${acc}. The digits of ${n} are ${ds.join(", ")}, so ${acc} ends as ${big ? Math.max(...ds) : Math.min(...ds)}.`,
      };
    }
    if (t === "zero") {
      const start = rng.pick([0, 0, -rng.int(1, 999)]), cnt = rng.pick(["count", "digits", "steps"]);
      const program = P([J.decl("int", num, N(start)), J.decl("int", cnt, N(0)), digitLoop(num, [J.inc(cnt), J.op(num, "/=", N(10))])]);
      const askCond = rng.chance(0.5);
      return {
        program, target: askCond ? { kind: "cond", tag: "main" } : { kind: "var", name: cnt }, template: start === 0 ? "zero-input" : "negative-input", concept: start === 0 ? "handling zero" : "a loop that never starts",
        prompt: askCond ? `How many times is the condition ${num} > 0 evaluated?` : `What is the final value of ${cnt}?`, params: { n: start }, traceLoop: "main", traceVars: [num, cnt],
        mutants: [{ misconception: askCond ? "body-vs-cond" : "cond-vs-body", program, target: askCond ? { kind: "body", tag: "main" } : { kind: "cond", tag: "main" } }],
        extraDistractors: askCond ? [{ choice: "2", misconception: "extra-iteration" }, { choice: String(String(Math.abs(start)).length + 1), misconception: "runs-once" }, { choice: "10", misconception: "fallback" }] : [{ choice: "1", misconception: "runs-once" }, { choice: String(String(Math.abs(start)).length), misconception: "runs-once" }, { choice: "-1", misconception: "direction" }, { choice: "10", misconception: "fallback" }],
        explain: `${num} starts at ${start}, so ${num} > 0 is false on the very first check. The condition is evaluated once and the body never runs${start === 0 ? ", even though 0 is written with one digit" : "; a negative number is not processed by this loop"}.`,
      };
    }
    if (t === "state" || t === "select" || t === "badstep") {
      const acc = rng.pick(["sum", "total"]);
      const program = base(acc, 0, [J.op(acc, "+=", J.mod(V(num), N(10))), J.op(num, "/=", N(10))]);
      if (t === "select") {
        const blankUpd = rng.chance(0.5);
        tag(findTag(program, "main").body[blankUpd ? 1 : 0], "blank");
        const cands = blankUpd
          ? [{ stmt: J.op(num, "%=", N(10)), misconception: "wrong-operator" }, { stmt: J.op(num, "-=", N(10)), misconception: "update-order" }, { stmt: J.dec(num), misconception: "off-start" }, { stmt: J.op(num, "/=", N(100)), misconception: "missed-final" }]
          : [{ stmt: J.op(acc, "+=", J.div(V(num), N(10))), misconception: "wrong-operator" }, { stmt: J.set(acc, J.mod(V(num), N(10))), misconception: "accum-overwrite" }, { stmt: J.op(acc, "+=", V(num)), misconception: "wrong-operator" }, { stmt: J.inc(acc), misconception: "cond-vs-body" }];
        return selectStatement({ rng, program, tag: "blank", candidates: rng.shuffle(cands), target: { kind: "var", name: acc }, goalText: (g) => `${acc} ends as ${g} (the sum of the digits of ${n})`, concept: "choosing the digit-loop update", template: "select-digit-update", params: { n }, traceLoop: "main", traceVars: [num, acc] });
      }
      if (t === "badstep") {
        return badStep({ rng, program, tag: "main", vars: [num, acc], concept: "verifying a digit trace", template: "digit-bad-step", params: { n },
          corrupt: (rows, k, r) => { if (r.chance(0.5)) rows[k][1] = String(Number(rows[k][1]) + Number(rows[k - 1][0]) % 10 + (Number(rows[k - 1][0]) % 10 === 0 ? 1 : 0)); else rows[k][0] = String(Math.floor(Number(rows[k - 1][0]) / 10) + 1); },
          why: `Each row applies ${acc} += ${num} % 10 and then ${num} /= 10 to the row above.` });
      }
      const rows = ds.length + 1, k = rng.int(1, Math.min(rows - 2, 3));
      return {
        program, target: stateTarget("main", k, [num, acc]), template: "digit-next-state", concept: "tracking the number between iterations",
        prompt: `What are the values of ${num} and ${acc} after the ${ordinal(k)} iteration?`, params: { n, k }, traceLoop: "main", traceVars: [num, acc],
        mutants: [...stateMutants(program, "main", k, [num, acc], rows), { misconception: "update-order", program: mutate.swapBody(program, "main"), target: stateTarget("main", k, [num, acc]) }, { misconception: "wrong-operator", program: wrongOp(program, acc), target: stateTarget("main", k, [num, acc]) }],
        explain: `Each iteration adds the last digit to ${acc} and then drops it from ${num}. After ${k} iteration${k > 1 ? "s" : ""}, the last ${k} digit${k > 1 ? "s have" : " has"} been removed.`,
      };
    }
    if (t === "evenodd") {
      const program = P([J.decl("int", num, N(n)), J.decl("int", "evens", N(0)), J.decl("int", "oddSum", N(0)), digitLoop(num, [
        J.decl("int", "d", J.mod(V(num), N(10))),
        J.iff(J.eq(J.mod(V("d"), N(2)), N(0)), [J.inc("evens")], [J.op("oddSum", "+=", V("d"))], { tag: "test" }),
        J.op(num, "/=", N(10)),
      ])]);
      const target = { kind: "vars", names: ["evens", "oddSum"] };
      return {
        program, target, template: "even-count-odd-sum", concept: "two conditional accumulators over digits",
        prompt: "What are the final values of evens and oddSum?", params: { n }, traceLoop: "main", traceVars: [num, "evens", "oddSum"],
        mutants: [
          { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
          { misconception: "wrong-operator", program: mutate.edit(program, (q) => { findTag(q, "main").body[0].e = J.div(V(num), N(10)); }) },
          { misconception: "update-order", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b.unshift(b.pop()); }) },
        ],
        explain: `Digits of ${n}: ${ds.join(", ")}. Even digits are counted; odd digits are added to oddSum.`,
      };
    }
    if (t === "palindrome") {
      const program = P([J.decl("int", num, N(n)), J.decl("int", "original", V(num)), J.decl("int", "rev", N(0)), digitLoop(num, [J.set("rev", J.add(J.mul(V("rev"), N(10)), J.mod(V(num), N(10)))), J.op(num, "/=", N(10))]), J.decl("boolean", "same", J.eq(V("original"), V("rev")))]);
      return {
        program, target: { kind: "vars", names: ["rev", "same"] }, template: "palindrome-check", concept: "reverse and compare",
        prompt: "What are the final values of rev and same?", params: { n }, traceLoop: "main", traceVars: [num, "rev"],
        mutants: [
          { misconception: "reverse-no-shift", program: mutate.edit(program, (q) => { findTag(q, "main").body[0].e = J.add(V("rev"), J.mod(V(num), N(10))); }) },
          { misconception: "update-order", program: mutate.swapBody(program, "main") },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
          { misconception: "initial-value", program: mutate.edit(program, (q) => { q[2].e = V(num); findTag(q, "main").c = J.lt(V(num), N(0)); }) },
        ],
        explain: `rev rebuilds ${n} with its digits in reverse order. same compares the saved original with rev.`,
      };
    }
    // alternate
    const program = P([J.decl("int", num, N(n)), J.decl("int", "sign", N(1)), J.decl("int", "total", N(0)), digitLoop(num, [J.op("total", "+=", J.mul(V("sign"), J.mod(V(num), N(10)))), J.set("sign", J.neg(V("sign"))), J.op(num, "/=", N(10))])]);
    return {
      program, target: { kind: "vars", names: ["total", "sign"] }, template: "alternating-digit-sum", concept: "alternating accumulator",
      prompt: "What are the final values of total and sign?", params: { n }, traceLoop: "main", traceVars: [num, "sign", "total"],
      mutants: [
        { misconception: "update-order", program: mutate.swapBody(program, "main", 0, 1) },
        { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V(num), N(9)); }) },
        { misconception: "accum-init", program: mutate.edit(program, (q) => { findTag(q, "main").body.splice(1, 1); }) },
      ],
      explain: `Starting from the last digit, digits are added and subtracted alternately; sign flips after every iteration (${ds.length} flips).`,
    };
  },
};

/* ---------------- B. Divisor counting ---------------- */
const divisors = {
  id: "divisor-counting", name: "Divisor counting",
  generate(rng, d) {
    const t = choose(rng, d, [[0, 1, "count"], [0, 1, "print"], [1, 2, "proper-sum"], [1, 2, "common"], [1, 2, "largest"], [2, 2, "prime"], [2, 2, "count-primes"], [0, 2, "select"]]);
    const v = rng.pick(["d", "k", "div"]);
    const composite = [6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 35, 36, 40, 42, 44, 45, 48];
    if (t === "count" || t === "select") {
      const n = rng.pick(lvl(d) === 0 ? composite.slice(0, 16) : composite);
      const inclusive = lvl(d) === 0 || rng.chance(0.6);
      const loop = tag(J.forL(J.decl("int", v, N(1)), inclusive ? J.le(V(v), N(n)) : J.lt(V(v), N(n)), J.inc(v), [J.iff(J.eq(J.mod(N(n), V(v)), N(0)), [J.inc("count")], null, { tag: "test", inline: rng.chance(0.4) })]), "main");
      const program = P([J.decl("int", "count", N(0)), loop]);
      if (t === "select") {
        const ifs = findTag(program, "test");
        tag(ifs.then[0], "blank");
        return selectStatement({ rng, program, tag: "blank", candidates: rng.shuffle([{ stmt: J.op("count", "+=", V(v)), misconception: "accum-overwrite" }, { stmt: J.set("count", V(v)), misconception: "accum-overwrite" }, { stmt: J.dec("count"), misconception: "fallback" }, { stmt: J.op("count", "+=", J.div(N(n), V(v))), misconception: "wrong-operator" }]), target: { kind: "var", name: "count" }, goalText: (g) => `count ends as ${g}, the number of divisors of ${n} the loop tests`, concept: "counting divisors", template: "select-divisor-update", params: { n } });
      }
      const all = range(1, n).filter((x) => n % x === 0);
      return {
        program, target: { kind: "var", name: "count" }, template: inclusive ? "count-divisors" : "count-proper-divisors", concept: "divisor counting with %",
        prompt: "What is the final value of count?", params: { n, inclusive }, traceLoop: "main", traceVars: [v, "count"],
        mutants: [
          { misconception: "divisor-bound", program: mutate.boundary(program, "main") },
          { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") },
          { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(2); }) },
          { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") },
        ],
        explain: `${v} tests 1 through ${inclusive ? n : n - 1}. The divisors of ${n} are ${all.join(", ")}${inclusive ? "" : `; the condition ${v} < ${n} excludes ${n} itself`}, so count is ${inclusive ? all.length : all.length - 1}.`,
      };
    }
    if (t === "print") {
      const n = rng.pick(composite.slice(0, 18));
      const step = rng.pick([1, 1, 2]), start = step === 2 ? rng.pick([1, 2]) : 1;
      const program = P([tag(J.forL(J.decl("int", v, N(start)), J.le(V(v), N(n)), step === 1 ? J.inc(v) : J.op(v, "+=", N(2)), [J.iff(J.eq(J.mod(N(n), V(v)), N(0)), [J.print(V(v))], null, { tag: "test" })]), "main")]);
      return {
        program, target: { kind: "output" }, template: step === 1 ? "print-divisors" : "print-step-divisors", concept: "identifying factors",
        prompt: "What does the program print?", params: { n, step, start }, traceLoop: "main", traceVars: [v],
        mutants: [
          { misconception: "boundary", program: mutate.boundary(program, "main") },
          { misconception: "inverted-condition", program: mutate.edit(program, (q) => { const s = findTag(q, "test"); s.c = J.eq(J.mod(V(v), N(n)), N(0)); }) },
          { misconception: "ignore-condition", program: mutate.edit(program, (q) => { findTag(q, "main").upd = J.op(v, "+=", N(step === 1 ? 2 : 1)); }) },
          { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(start + 1); }) },
        ],
        explain: `${v} visits ${range(start, n, step).join(", ")}; it is printed only when ${n} % ${v} == 0.`,
      };
    }
    if (t === "proper-sum") {
      const n = rng.pick([6, 8, 10, 12, 15, 16, 18, 20, 28]), half = rng.chance(0.5);
      const program = P([J.decl("int", "n", N(n)), J.decl("int", "sum", N(0)), tag(J.forL(J.decl("int", v, N(1)), half ? J.le(V(v), J.div(V("n"), N(2))) : J.lt(V(v), V("n")), J.inc(v), [J.iff(J.eq(J.mod(V("n"), V(v)), N(0)), [J.op("sum", "+=", V(v))], null, { tag: "test" })]), "main"), J.decl("boolean", "perfect", J.eq(V("sum"), V("n")))]);
      return {
        program, target: { kind: "vars", names: ["sum", "perfect"] }, template: half ? "proper-sum-half" : "proper-sum", concept: "summing proper divisors",
        prompt: "What are the final values of sum and perfect?", params: { n, half }, traceLoop: "main", traceVars: [v, "sum"],
        mutants: [
          { misconception: "divisor-bound", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.le(V(v), V("n")); }) },
          { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") },
          { misconception: "accum-overwrite", program: mutate.overwrite(program, "sum") },
          { misconception: "update-count", program: mutate.edit(program, (q) => { findTag(q, "test").then[0] = J.inc("sum"); }) },
        ],
        explain: `The proper divisors of ${n} (excluding ${n}) are ${range(1, n - 1).filter((x) => n % x === 0).join(", ")}. ${half ? `Bounding ${v} by n / 2 = ${Math.floor(n / 2)} still finds them all.` : ""}`,
      };
    }
    if (t === "common") {
      const g = rng.pick([2, 3, 4, 6]), a = g * rng.pick([2, 3, 5]), b = g * rng.pick([3, 4, 7].filter((x) => x * g !== a));
      const program = P([J.decl("int", "a", N(a)), J.decl("int", "b", N(b)), J.decl("int", "common", N(0)), tag(J.forL(J.decl("int", v, N(1)), J.le(V(v), V("a")), J.inc(v), [J.iff(J.and(J.eq(J.mod(V("a"), V(v)), N(0)), J.eq(J.mod(V("b"), V(v)), N(0))), [J.inc("common")], null, { tag: "test" })]), "main")]);
      return {
        program, target: { kind: "var", name: "common" }, template: "common-divisors", concept: "compound divisibility condition",
        prompt: "What is the final value of common?", params: { a, b }, traceLoop: "main", traceVars: [v, "common"],
        mutants: [
          { misconception: "inverted-condition", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = "||"; }) },
          { misconception: "ignore-condition", program: mutate.edit(program, (q) => { findTag(q, "test").c = findTag(q, "test").c.l; }) },
          { misconception: "divisor-bound", program: mutate.boundary(program, "main") },
          { misconception: "comparison-scope", program: mutate.edit(program, (q) => { findTag(q, "test").c = findTag(q, "test").c.r; }) },
        ],
        explain: `&& requires ${v} to divide both ${a} and ${b}. Those common divisors are ${range(1, a).filter((x) => a % x === 0 && b % x === 0).join(", ")}.`,
      };
    }
    if (t === "largest") {
      const n = rng.pick([12, 15, 18, 20, 21, 25, 27, 28, 30, 33, 35]);
      const program = P([J.decl("int", "n", N(n)), J.decl("int", "largest", N(1)), tag(J.forL(J.decl("int", v, J.sub(V("n"), N(1))), J.ge(V(v), N(2)), J.dec(v), [J.iff(J.eq(J.mod(V("n"), V(v)), N(0)), [J.set("largest", V(v)), J.brk()], null, { tag: "test" })]), "main")]);
      const ask = rng.chance(0.5) ? "body" : "var";
      return {
        program, target: ask === "body" ? { kind: "body", tag: "main" } : { kind: "var", name: "largest" }, template: "largest-proper-divisor", concept: "searching downward with break",
        prompt: ask === "body" ? "How many times does the loop body execute?" : "What is the final value of largest?", params: { n }, traceLoop: "main", traceVars: [v, "largest"],
        mutants: [
          { misconception: "ignore-break", program: mutate.removeAll(program, "break") },
          ask === "body" ? { misconception: "cond-vs-body", program, target: { kind: "cond", tag: "main" } } : null,
          { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = V("n"); }) },
        ],
        extraDistractors: ask === "var" ? [{ choice: String(n / range(2, n).find((x) => n % x === 0)), misconception: "first-vs-last" }] : [{ choice: String(n - 2), misconception: "ignore-break" }],
        explain: `${v} counts down from ${n - 1}. The first divisor found is the largest proper divisor, ${n / range(2, n).find((x) => n % x === 0)}; break stops the search there.`,
      };
    }
    if (t === "prime") {
      const n = rng.pick([21, 25, 29, 31, 35, 37, 41, 43, 47, 49, 51, 53, 55]);
      const program = P([J.decl("int", "n", N(n)), J.decl("boolean", "prime", J.b(true)), J.decl("int", "tests", N(0)), tag(J.forL(J.decl("int", v, N(2)), J.le(J.mul(V(v), V(v)), V("n")), J.inc(v), [J.inc("tests"), J.iff(J.eq(J.mod(V("n"), V(v)), N(0)), [J.set("prime", J.b(false)), J.brk()], null, { tag: "test" })]), "main")]);
      return {
        program, target: { kind: "vars", names: ["prime", "tests"] }, template: "prime-test-sqrt", concept: "early termination with a bound of d * d <= n",
        prompt: "What are the final values of prime and tests?", params: { n }, traceLoop: "main", traceVars: [v, "tests", "prime"],
        mutants: [
          { misconception: "ignore-break", program: mutate.removeAll(program, "break") },
          { misconception: "boundary", program: mutate.boundary(program, "main") },
          { misconception: "divisor-bound", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V(v), V("n")); }) },
          { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(1); }) },
        ],
        explain: `The loop tests divisors while ${v} * ${v} <= ${n}. ${range(2, n).find((x) => n % x === 0) < n ? `It finds ${range(2, n).find((x) => n % x === 0)} divides ${n}, sets prime to false, and breaks.` : `No divisor exists up to √${n}, so prime stays true.`}`,
      };
    }
    // count-primes (nested)
    const lo = rng.int(2, 10), hi = lo + rng.int(5, 8);
    const program = P([J.decl("int", "primes", N(0)), tag(J.forL(J.decl("int", "x", N(lo)), J.le(V("x"), N(hi)), J.inc("x"), [J.decl("int", "c", N(0)), tag(J.forL(J.decl("int", v, N(1)), J.le(V(v), V("x")), J.inc(v), [J.iff(J.eq(J.mod(V("x"), V(v)), N(0)), [J.inc("c")], null, { inline: true })]), "inner"), J.iff(J.eq(V("c"), N(2)), [J.inc("primes")], null, { tag: "test" })]), "main")]);
    return {
      program, target: { kind: "var", name: "primes" }, template: "count-primes-nested", concept: "nested divisor counting",
      prompt: "What is the final value of primes?", params: { lo, hi }, traceLoop: "main", traceVars: ["x", "primes"],
      mutants: [
        { misconception: "divisor-bound", program: mutate.boundary(program, "inner") },
        { misconception: "boundary", program: mutate.boundary(program, "main") },
        { misconception: "comparison-scope", program: mutate.edit(program, (q) => { findTag(q, "test").c = J.le(V("c"), N(2)); }) },
        { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") },
      ],
      explain: `For each x from ${lo} to ${hi}, the inner loop counts its divisors; exactly 2 divisors means prime. Primes in range: ${range(lo, hi).filter((x) => range(1, x).filter((y) => x % y === 0).length === 2).join(", ") || "none"}.`,
    };
  },
};

/* ---------------- C. Greatest common divisor ---------------- */
const gcdF = (a, b) => (b === 0 ? a : gcdF(b, a % b));
const gcd = {
  id: "gcd", name: "Greatest common divisor",
  generate(rng, d) {
    const t = choose(rng, d, [[1, 1, "brute"], [0, 1, "euclid"], [1, 2, "euclid-state"], [2, 2, "subtract"], [1, 1, "euclid-select"], [2, 2, "lcm"], [1, 1, "euclid-badstep"], [2, 2, "gcd-three"]]);
    const pickPair = (minSteps) => { for (let i = 0; i < 200; i++) { const g = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9]), a = g * rng.int(3, lvl(d) === 0 ? 14 : 19), b = g * rng.int(2, lvl(d) === 0 ? 12 : 15); if (a <= b || gcdF(a, b) !== g) continue; let s = 0, x = a, y = b; while (y) { [x, y] = [y, x % y]; s++; } if (s >= minSteps) return [a, b]; } throw new GenReject("pair"); };
    const euclid = (a, b) => P([J.decl("int", "a", N(a)), J.decl("int", "b", N(b)), tag(J.whileL(J.ne(V("b"), N(0)), [J.decl("int", "r", J.mod(V("a"), V("b"))), J.set("a", V("b")), J.set("b", V("r"))]), "main")]);
    if (t === "brute") {
      const [a, b] = pickPair(1);
      const program = P([J.decl("int", "a", N(a)), J.decl("int", "b", N(b)), J.decl("int", "gcd", N(1)), tag(J.forL(J.decl("int", "d", N(b)), J.ge(V("d"), N(1)), J.dec("d"), [J.iff(J.and(J.eq(J.mod(V("a"), V("d")), N(0)), J.eq(J.mod(V("b"), V("d")), N(0))), [J.set("gcd", V("d")), J.brk()], null, { tag: "test" })]), "main")]);
      const ask = lvl(d) === 0 ? "var" : rng.pick(["var", "body"]);
      return {
        program, target: ask === "var" ? { kind: "var", name: "gcd" } : { kind: "body", tag: "main" }, template: "gcd-countdown", concept: "searching for the greatest common divisor",
        prompt: ask === "var" ? "What is the final value of gcd?" : "How many times does the loop body execute?", params: { a, b }, traceLoop: "main", traceVars: ["d", "gcd"],
        mutants: [
          { misconception: "ignore-break", program: mutate.removeAll(program, "break") },
          { misconception: "comparison-scope", program: mutate.edit(program, (q) => { findTag(q, "test").c = findTag(q, "test").c.r; }) },
          ask === "body" ? { misconception: "cond-vs-body", program, target: { kind: "cond", tag: "main" } } : null,
          { misconception: "inverted-condition", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = "||"; }) },
        ],
        explain: `d counts down from ${b}; the first d that divides both ${a} and ${b} is ${gcdF(a, b)}, and break stops the loop after ${b - gcdF(a, b) + 1} iteration(s).`,
      };
    }
    if (t === "euclid" || t === "euclid-state" || t === "euclid-select" || t === "euclid-badstep") {
      const [a, b] = pickPair(t === "euclid" ? (lvl(d) === 0 ? 1 : 2) : 3);
      const program = euclid(a, b);
      let steps = 0; { let x = a, y = b; while (y) { [x, y] = [y, x % y]; steps++; } }
      if (t === "euclid-select") {
        tag(findTag(program, "main").body[rng.pick([1, 2])], "blank");
        return selectStatement({ rng, program, tag: "blank", candidates: rng.shuffle([{ stmt: J.set("a", V("r")), misconception: "gcd-swap" }, { stmt: J.set("b", V("a")), misconception: "gcd-swap" }, { stmt: J.set("a", J.mod(V("a"), V("b"))), misconception: "wrong-operator" }, { stmt: J.set("b", J.mod(V("b"), V("r"))), misconception: "update-order" }, { stmt: J.set("b", J.sub(V("a"), V("b"))), misconception: "fallback" }]), target: { kind: "var", name: "a" }, goalText: (g) => `a ends as ${g}, the GCD of ${a} and ${b}`, concept: "Euclidean update order", template: "euclid-select-update", params: { a, b }, traceLoop: "main", traceVars: ["a", "b"] });
      }
      if (t === "euclid-badstep") {
        return badStep({ rng, program, tag: "main", vars: ["a", "b"], concept: "verifying a Euclidean trace", template: "euclid-bad-step", params: { a, b },
          corrupt: (rows, k) => { const pa = Number(rows[k - 1][0]), pb = Number(rows[k - 1][1]); rows[k] = [String(pb), String(pa - pb === pa % pb ? pa - pb + pb : pa - pb)]; if (rows[k][1] === String(pa % pb)) rows[k][1] = String(Math.floor(pa / pb)); },
          why: "Each iteration replaces a with b and b with a % b." });
      }
      if (t === "euclid-state") {
        const k = rng.int(1, Math.min(steps - 1, 3));
        return {
          program, target: stateTarget("main", k, ["a", "b"]), template: "euclid-state", concept: "intermediate Euclidean values",
          prompt: `What are a and b after the ${ordinal(k)} iteration?`, params: { a, b, k }, traceLoop: "main", traceVars: ["a", "b"],
          mutants: [...stateMutants(program, "main", k, ["a", "b"], steps + 1), { misconception: "gcd-swap", program: mutate.edit(program, (q) => { const bd = findTag(q, "main").body; [bd[1], bd[2]] = [bd[2], bd[1]]; }), target: stateTarget("main", k, ["a", "b"]) }],
          extraDistractors: [{ choice: (() => { const rows = checks(program, "main"); return `a = ${rows[k].vars.b}, b = ${rows[k].vars.a}`; })(), misconception: "update-order" }],
          explain: `Each iteration computes r = a % b, then shifts: a takes b's value and b takes r.`,
        };
      }
      const ask = rng.pick(lvl(d) === 0 ? ["gcd"] : ["gcd", "body", "cond"]);
      const target = ask === "gcd" ? { kind: "var", name: "a" } : { kind: ask, tag: "main" };
      return {
        program, target, template: `euclid-${ask}`, concept: "Euclidean algorithm",
        prompt: ask === "gcd" ? "When the loop ends, what is the value of a (the GCD)?" : ask === "body" ? "How many times does the loop body execute?" : "How many times is the condition b != 0 evaluated?",
        params: { a, b, steps }, traceLoop: "main", traceVars: ["a", "b"],
        mutants: ask === "gcd"
          ? [{ misconception: "gcd-swap", program: mutate.edit(program, (q) => { const bd = findTag(q, "main").body; [bd[1], bd[2]] = [bd[2], bd[1]]; }) }, { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V("b"), N(gcdF(a, b))); }) }]
          : [{ misconception: ask === "body" ? "cond-vs-body" : "body-vs-cond", program, target: { kind: ask === "body" ? "cond" : "body", tag: "main" } }, { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V("b"), N(gcdF(a, b))); }) }],
        extraDistractors: ask === "gcd" ? [{ choice: "0", misconception: "printed-vs-final" }, { choice: String(b), misconception: "initial-value" }, { choice: String(a), misconception: "initial-value" }, ...checks(program, "main").slice(0, -1).reverse().map((r) => ({ choice: r.vars.a, misconception: "missed-final" }))] : [{ choice: String(steps + 2), misconception: "extra-iteration" }],
        explain: `Euclid's loop replaces (a, b) with (b, a % b) until b is 0: ${checks(program, "main").map((r) => `(${r.vars.a}, ${r.vars.b})`).join(" → ")}. The GCD ${gcdF(a, b)} is left in a after ${steps} iteration(s).`,
      };
    }
    if (t === "subtract") {
      let a, b, steps; for (let i = 0; i < 100; i++) { const g = rng.int(2, 6); a = g * rng.int(2, 9); b = g * rng.int(2, 9); if (a === b) continue; let x = a, y = b; steps = 0; while (x !== y) { if (x > y) x -= y; else y -= x; steps++; } if (steps >= 3 && steps <= 9) break; }
      const program = P([J.decl("int", "a", N(a)), J.decl("int", "b", N(b)), J.decl("int", "steps", N(0)), tag(J.whileL(J.ne(V("a"), V("b")), [J.iff(J.gt(V("a"), V("b")), [J.op("a", "-=", V("b"))], [J.op("b", "-=", V("a"))], { tag: "test" }), J.inc("steps")]), "main")]);
      return {
        program, target: { kind: "vars", names: ["a", "steps"] }, template: "gcd-subtraction", concept: "subtraction-based GCD",
        prompt: "What are the final values of a and steps?", params: { a, b }, traceLoop: "main", traceVars: ["a", "b", "steps"],
        mutants: [{ misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.and(J.ne(V("a"), V("b")), J.lt(V("steps"), N(steps - 1))); }) }, { misconception: "cond-vs-body", program, target: { kind: "vars", names: ["b", "steps"] } }, { misconception: "extra-iteration", program: mutate.edit(program, (q) => { q[2].e = N(1); }) }],
        explain: `The larger value is reduced by the smaller until they are equal: ${checks(program, "main").map((r) => `(${r.vars.a}, ${r.vars.b})`).join(" → ")}.`,
      };
    }
    if (t === "gcd-three") {
      const g = rng.int(2, 6), a = g * rng.int(3, 9), b = g * rng.int(2, 8), c = g * rng.int(2, 7);
      const loopFor = (x, y, name) => tag(J.whileL(J.ne(V(y), N(0)), [J.decl("int", "r", J.mod(V(x), V(y))), J.set(x, V(y)), J.set(y, V("r"))]), name);
      const program = P([J.decl("int", "a", N(a)), J.decl("int", "b", N(b)), J.decl("int", "c", N(c)), loopFor("a", "b", "main"), loopFor("a", "c", "second")]);
      const g3 = gcdF(gcdF(a, b), c);
      return {
        program, target: { kind: "vars", names: ["a", "b", "c"] }, template: "gcd-of-three", concept: "chaining two Euclidean loops",
        prompt: "What are the final values of a, b, and c?", params: { a, b, c }, traceLoop: "second", traceVars: ["a", "c"],
        mutants: [{ misconception: "gcd-swap", program: mutate.edit(program, (q) => { const bd = findTag(q, "second").body; [bd[1], bd[2]] = [bd[2], bd[1]]; }) }, { misconception: "printed-vs-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V("b"), N(gcdF(a, b))); }) }],
        extraDistractors: [{ choice: `a = ${gcdF(a, b)}, b = 0, c = 0`, misconception: "missed-final" }, { choice: `a = ${g3}, b = ${b}, c = 0`, misconception: "initial-value" }],
        explain: `The first loop leaves gcd(${a}, ${b}) = ${gcdF(a, b)} in a and 0 in b. The second loop then computes gcd(${gcdF(a, b)}, ${c}) = ${g3}, leaving c = 0.`,
      };
    }
    // lcm
    const [a, b] = pickPair(2);
    const program = P([J.decl("int", "x", N(a)), J.decl("int", "y", N(b)), J.decl("int", "a", V("x")), J.decl("int", "b", V("y")), tag(J.whileL(J.ne(V("b"), N(0)), [J.decl("int", "r", J.mod(V("a"), V("b"))), J.set("a", V("b")), J.set("b", V("r"))]), "main"), J.decl("int", "lcm", J.mul(J.div(V("x"), V("a")), V("y")))]);
    return {
      program, target: { kind: "vars", names: ["a", "lcm"] }, template: "gcd-then-lcm", concept: "combining GCD with a follow-up calculation",
      prompt: "What are the final values of a and lcm?", params: { a, b }, traceLoop: "main", traceVars: ["a", "b"],
      mutants: [{ misconception: "gcd-swap", program: mutate.edit(program, (q) => { const bd = findTag(q, "main").body; [bd[1], bd[2]] = [bd[2], bd[1]]; }) }, { misconception: "printed-vs-final", program: mutate.edit(program, (q) => { q[5].e = J.mul(J.div(V("x"), V("b")), V("y")); }) }, { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V("b"), N(gcdF(a, b))); }) }],
      explain: `The loop leaves the GCD (${gcdF(a, b)}) in a. Then lcm = x / a * y = ${a} / ${gcdF(a, b)} * ${b} = ${(a / gcdF(a, b)) * b}.`,
    };
  },
};

/* ---------------- D. Running minimum / maximum ---------------- */
const minMax = {
  id: "min-max", name: "Running minimum and maximum",
  generate(rng, d) {
    const t = choose(rng, d, [[0, 1, "extreme"], [1, 2, "index"], [1, 2, "updates"], [2, 2, "both"], [2, 2, "second"], [1, 1, "state"]]);
    const L = lvl(d), len = [5, 6, 7][L];
    const neg = L >= 1 && rng.chance(0.5);
    const vals = Array.from({ length: len }, () => rng.int(neg ? -20 : 1, neg ? -1 : 30));
    if (t === "index") { const m = rng.pick([Math.max(...vals)]); vals[rng.int(0, len - 1)] = m; }
    const arr = rng.pick(["values", "scores", "data", "temps"]);
    const big = rng.chance(0.5), acc = big ? "max" : "min";
    const loop = (body, start = 1) => tag(J.forL(J.decl("int", "i", N(start)), J.lt(V("i"), J.len(V(arr))), J.inc("i"), body), "main");
    if (t === "extreme" || t === "state") {
      const zeroInit = L === 2 && neg && big ? false : false;
      const program = P([J.decl("int[]", arr, arrLit(vals)), J.decl("int", acc, J.idx(V(arr), N(0))), loop([J.iff(big ? J.gt(J.idx(V(arr), V("i")), V(acc)) : J.lt(J.idx(V(arr), V("i")), V(acc)), [J.set(acc, J.idx(V(arr), V("i")))], null, { tag: "test", inline: rng.chance(0.4) })])]);
      if (t === "state") {
        const k = rng.int(2, len - 2);
        return { program, target: stateTarget("main", k - 1, ["i", acc]), template: "extreme-state", concept: "state of a running extreme", prompt: `What are i and ${acc} when the loop condition is checked for the ${ordinal(k)} time?`, params: { vals, k }, traceLoop: "main", traceVars: ["i", acc],
          mutants: [...stateMutants(program, "main", k - 1, ["i", acc], len), { misconception: "comparison-direction", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = big ? "<" : ">"; }), target: stateTarget("main", k - 1, ["i", acc]) }],
          explain: `The condition check happens before each body execution. By check ${k}, the loop has examined indices 1 through ${k - 1}.` };
      }
      return {
        program, target: { kind: "var", name: acc }, template: big ? "running-max" : "running-min", concept: "running extreme initialized from data",
        prompt: `What is the final value of ${acc}?`, params: { vals }, traceLoop: "main", traceVars: ["i", acc],
        mutants: [
          { misconception: "comparison-direction", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = big ? "<" : ">"; }) },
          { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") },
          { misconception: "min-init", program: mutate.setInit(program, acc, N(0)) },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("i"), J.sub(J.len(V(arr)), N(1))); }) },
          { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(2); }) },
        ],
        extraDistractors: [{ choice: String(vals.indexOf(big ? Math.max(...vals) : Math.min(...vals))), misconception: "value-vs-index" }, { choice: String(vals[0]), misconception: "initial-value" }],
        explain: `${acc} starts at ${arr}[0] = ${vals[0]} and is replaced whenever a ${big ? "larger" : "smaller"} element appears. The ${big ? "largest" : "smallest"} element is ${big ? Math.max(...vals) : Math.min(...vals)}.`,
      };
    }
    if (t === "index") {
      // ensure a tie exists for > vs >= reasoning
      const m = Math.max(...vals), first = vals.indexOf(m);
      if (vals.lastIndexOf(m) === first) { const j = rng.pick(range(0, len - 1).filter((x) => x !== first)); vals[j] = m; }
      const strict = rng.chance(0.5);
      const program = P([J.decl("int[]", arr, arrLit(vals)), J.decl("int", "best", N(0)), loop([J.iff(strict ? J.gt(J.idx(V(arr), V("i")), J.idx(V(arr), V("best"))) : J.ge(J.idx(V(arr), V("i")), J.idx(V(arr), V("best"))), [J.set("best", V("i"))], null, { tag: "test" })])]);
      return {
        program, target: { kind: "var", name: "best" }, template: strict ? "index-of-max-first" : "index-of-max-last", concept: "index of the maximum with ties",
        prompt: "What is the final value of best?", params: { vals, strict }, traceLoop: "main", traceVars: ["i", "best"],
        mutants: [
          { misconception: "tie-handling", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = strict ? ">=" : ">"; }) },
          { misconception: "comparison-direction", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = strict ? "<" : "<="; }) },
          { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") },
        ],
        extraDistractors: [{ choice: String(Math.max(...vals)), misconception: "value-vs-index" }],
        explain: `best stores an index, not a value. The maximum ${Math.max(...vals)} appears at indices ${vals.map((x, i) => (x === Math.max(...vals) ? i : -1)).filter((i) => i >= 0).join(" and ")}; ${strict ? "> keeps the first one" : ">= moves best to the last one"}.`,
      };
    }
    if (t === "updates") {
      const program = P([J.decl("int[]", arr, arrLit(vals)), J.decl("int", acc, J.idx(V(arr), N(0))), loop([J.iff(big ? J.gt(J.idx(V(arr), V("i")), V(acc)) : J.lt(J.idx(V(arr), V("i")), V(acc)), [mark(J.set(acc, J.idx(V(arr), V("i"))), "A")], null, { tag: "test" })])]);
      return {
        program, target: { kind: "mark", label: "A" }, template: "count-extreme-updates", concept: "counting conditional updates",
        prompt: "How many times does the statement marked // A execute?", params: { vals }, traceLoop: "main", traceVars: ["i", acc],
        mutants: [
          { misconception: "ignore-condition", program, target: { kind: "body", tag: "main" } },
          { misconception: "comparison-direction", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = big ? "<" : ">"; }) },
          { misconception: "tie-handling", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = big ? ">=" : "<="; }) },
          { misconception: "off-start", program: mutate.edit(program, (q) => { q[1].e = N(big ? -100 : 100); }) },
        ],
        explain: `// A runs only when a new ${big ? "maximum" : "minimum"} appears. Scanning ${vals.join(", ")}: each time an element beats every earlier one, ${acc} updates.`,
      };
    }
    if (t === "both") {
      const program = P([J.decl("int[]", arr, arrLit(vals)), J.decl("int", "max", J.idx(V(arr), N(0))), J.decl("int", "min", J.idx(V(arr), N(0))), loop([J.iff(J.gt(J.idx(V(arr), V("i")), V("max")), [J.set("max", J.idx(V(arr), V("i")))], [J.iff(J.lt(J.idx(V(arr), V("i")), V("min")), [J.set("min", J.idx(V(arr), V("i")))], null, { tag: "test2" })], { tag: "test", chain: true })]), J.decl("int", "spread", J.sub(V("max"), V("min")))]);
      return {
        program, target: { kind: "vars", names: ["max", "min", "spread"] }, template: "min-and-max-else-if", concept: "two extremes with else-if",
        prompt: "What are the final values of max, min, and spread?", params: { vals }, traceLoop: "main", traceVars: ["i", "max", "min"],
        mutants: [
          { misconception: "min-init", program: mutate.edit(program, (q) => { q[1].e = N(0); q[2].e = N(0); }) },
          { misconception: "comparison-direction", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = "<"; findTag(q, "test2").c.op = ">"; }) },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("i"), J.sub(J.len(V(arr)), N(1))); }) },
        ],
        explain: `Both start at ${vals[0]}. Each element can raise max or (else) lower min. Final: max ${Math.max(...vals)}, min ${Math.min(...vals)}.`,
      };
    }
    // second largest
    const uniq = [...new Set(vals)]; if (uniq.length < 4) throw new GenReject("dupes");
    const program = P([J.decl("int[]", arr, arrLit(uniq)), J.decl("int", "first", N(-100)), J.decl("int", "second", N(-100)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), J.len(V(arr))), J.inc("i"), [J.iff(J.gt(J.idx(V(arr), V("i")), V("first")), [tag(J.set("second", V("first")), "s1"), tag(J.set("first", J.idx(V(arr), V("i"))), "s2")], [J.iff(J.gt(J.idx(V(arr), V("i")), V("second")), [J.set("second", J.idx(V(arr), V("i")))])], { tag: "test", chain: true })]), "main")]);
    return {
      program, target: { kind: "vars", names: ["first", "second"] }, template: "second-largest", concept: "two related running values",
      prompt: "What are the final values of first and second?", params: { vals: uniq }, traceLoop: "main", traceVars: ["i", "first", "second"],
      mutants: [
        { misconception: "update-order", program: mutate.edit(program, (q) => { const th = findTag(q, "test").then; [th[0], th[1]] = [th[1], th[0]]; }) },
        { misconception: "ignore-condition", program: mutate.edit(program, (q) => { findTag(q, "test").els = null; }) },
        { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("i"), J.sub(J.len(V(arr)), N(1))); }) },
      ],
      explain: `When a new largest appears, the old first slides into second before first is replaced. Order matters: assigning first before second would lose the old value.`,
    };
  },
};

/* ---------------- E. Accumulators and averages ---------------- */
const accumulators = {
  id: "accumulators", name: "Accumulators and averages",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 1, "range-sum"], [0, 0, "count-match"], [1, 1, "average"], [1, 2, "cond-average"], [2, 2, "multi"], [0, 0, "running-print"], [2, 2, "threshold"], [1, 2, "badstep"]]);
    if (t === "range-sum" || t === "badstep") {
      const a = rng.int(1, 6), step = rng.pick(L === 0 ? [1, 1, 2] : [2, 3]), b = a + step * rng.int(3, 5) + rng.int(0, step - 1);
      const acc = rng.pick(["total", "sum"]), init = rng.pick([0, 0, rng.int(2, 9)]);
      const program = P([J.decl("int", acc, N(init)), tag(J.forL(J.decl("int", "i", N(a)), J.le(V("i"), N(b)), step === 1 ? J.inc("i") : J.op("i", "+=", N(step)), [J.op(acc, "+=", V("i"))]), "main")]);
      if (t === "badstep") return badStep({ rng, program, tag: "main", vars: ["i", acc], concept: "verifying an accumulator trace", template: "accumulator-bad-step", params: { a, b, step }, corrupt: (rows, k) => { rows[k][1] = String(Number(rows[k - 1][1]) + Number(rows[k][0])); }, why: `${acc} adds the value of i that was used in the previous iteration, then i advances by ${step}.` });
      const vals = range(a, b, step);
      return {
        program, target: { kind: "var", name: acc }, template: init ? "range-sum-offset" : "range-sum", concept: "running total",
        prompt: `What is the final value of ${acc}?`, params: { a, b, step, init }, traceLoop: "main", traceVars: ["i", acc],
        mutants: [
          { misconception: "boundary", program: mutate.boundary(program, "main") },
          { misconception: "accum-overwrite", program: mutate.overwrite(program, acc) },
          { misconception: "accum-init", program: init ? mutate.setInit(program, acc, N(0)) : null },
          { misconception: "update-count", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = J.inc(acc); }) },
        ],
        explain: `i takes ${vals.join(", ")}. ${acc} = ${init} + ${vals.join(" + ")} = ${init + vals.reduce((x, y) => x + y, 0)}.`,
      };
    }
    if (t === "count-match") {
      const n = rng.int(10, 24), k = rng.pick([3, 4, 5]), r = rng.int(0, k - 1);
      const program = P([J.decl("int", "count", N(0)), tag(J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n)), J.inc("i"), [J.iff(J.eq(J.mod(V("i"), N(k)), N(r)), [J.inc("count")], null, { tag: "test", inline: rng.chance(0.5) })]), "main")]);
      return {
        program, target: { kind: "var", name: "count" }, template: "count-remainder", concept: "conditional counting",
        prompt: "What is the final value of count?", params: { n, k, r }, traceLoop: "main", traceVars: ["i", "count"],
        mutants: [{ misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }, { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(0); }) }],
        extraDistractors: [{ choice: String(Math.floor(n / k)), misconception: "off-start" }, { choice: String(n), misconception: "ignore-condition" }],
        explain: `Values 1–${n} with i % ${k} == ${r}: ${range(1, n).filter((x) => x % k === r).join(", ")}.`,
      };
    }
    if (t === "average" || t === "cond-average") {
      const len = rng.pick([4, 5, 8]);
      const vals = Array.from({ length: len }, () => rng.int(1, 20));
      const cast = rng.chance(0.5), arr = rng.pick(["scores", "values", "points"]);
      const cond = t === "cond-average";
      const thr = cond ? rng.int(5, 12) : 0;
      const body = cond
        ? [J.iff(J.gt(J.idx(V(arr), V("i")), N(thr)), [J.op("sum", "+=", J.idx(V(arr), V("i"))), J.inc("count")], null, { tag: "test" })]
        : [J.op("sum", "+=", J.idx(V(arr), V("i")))];
      const divisor = cond ? V("count") : J.len(V(arr));
      const sel = cond ? vals.filter((x) => x > thr) : vals;
      if (sel.length === 0) throw new GenReject("empty selection");
      const program = P([J.decl("int[]", arr, arrLit(vals)), J.decl("int", "sum", N(0)), ...(cond ? [J.decl("int", "count", N(0))] : []), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), J.len(V(arr))), J.inc("i"), body), "main"), J.decl("double", "average", cast ? J.div(J.cast("double", V("sum")), divisor) : J.div(V("sum"), divisor))]);
      const S = sel.reduce((x, y) => x + y, 0), exact = S / sel.length;
      if (Number.isInteger(exact)) throw new GenReject("average divides evenly");
      const fmt = (x) => (Number.isInteger(x) ? x + ".0" : String(x));
      return {
        program, target: { kind: "var", name: "average" }, template: `${cond ? "conditional-" : ""}average-${cast ? "cast" : "int-division"}`, concept: cast ? "floating-point average" : "integer division in an average",
        prompt: "What is the final value of average?", params: { vals, cast, thr }, traceLoop: "main", traceVars: cond ? ["i", "sum", "count"] : ["i", "sum"],
        mutants: [cond ? { misconception: "ignore-condition", program: mutate.edit(program, (q) => { q[4].e = cast ? J.div(J.cast("double", V("sum")), J.len(V(arr))) : J.div(V("sum"), J.len(V(arr))); }) } : null],
        extraDistractors: [
          { choice: cast ? fmt(Math.trunc(exact)) : fmt(exact), misconception: cast ? "decimal-expected" : "int-division" },
          { choice: cast ? String(Math.trunc(exact)) : String(Math.trunc(exact)), misconception: cast ? "decimal-expected" : "int-division" },
          { choice: fmt(S), misconception: "accum-init" },
          { choice: fmt(Math.round(exact)), misconception: "int-division" },
        ],
        explain: `sum = ${S}${cond ? ` over the ${sel.length} values greater than ${thr}` : ""}. ${cast ? `(double) sum makes the division decimal: ${S} / ${sel.length} = ${fmt(exact)}.` : `sum / ${cond ? "count" : `${arr}.length`} divides two ints, so Java truncates to ${Math.trunc(exact)} before storing it as ${Math.trunc(exact)}.0.`}`,
      };
    }
    if (t === "multi") {
      const vals = Array.from({ length: rng.int(6, 8) }, () => rng.int(-9, 12));
      if (!vals.some((x) => x < 0) || !vals.some((x) => x > 0)) throw new GenReject("signs");
      const program = P([J.decl("int[]", "data", arrLit(vals)), J.decl("int", "posSum", N(0)), J.decl("int", "negCount", N(0)), J.decl("int", "zeros", N(0)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), J.len(V("data"))), J.inc("i"), [J.iff(J.gt(J.idx(V("data"), V("i")), N(0)), [J.op("posSum", "+=", J.idx(V("data"), V("i")))], [J.iff(J.lt(J.idx(V("data"), V("i")), N(0)), [J.inc("negCount")], [J.inc("zeros")], { tag: "t2" })], { tag: "test", chain: true })]), "main")]);
      return {
        program, target: { kind: "vars", names: ["posSum", "negCount", "zeros"] }, template: "three-way-accumulators", concept: "multiple accumulators with else-if",
        prompt: "What are the final values of posSum, negCount, and zeros?", params: { vals }, traceLoop: "main", traceVars: ["i", "posSum", "negCount"],
        mutants: [
          { misconception: "boundary", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = ">="; }) },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("i"), J.sub(J.len(V("data")), N(1))); }) },
          { misconception: "accum-overwrite", program: mutate.overwrite(program, "posSum") },
          { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(1); }) },
        ],
        explain: `Positive values are summed (${vals.filter((x) => x > 0).join(" + ")}), negative values are counted, and zeros fall to the final else.`,
      };
    }
    if (t === "running-print") {
      const n = rng.int(3, 7), start = rng.int(1, 9), step = rng.pick([1, 2, 3]);
      const program = P([J.decl("int", "total", N(0)), tag(J.forL(J.decl("int", "i", N(start)), J.lt(V("i"), N(start + n * step)), J.op("i", "+=", N(step)), [J.op("total", "+=", V("i")), J.print(V("total"))]), "main"), J.op("total", "*=", N(2))]);
      const ask = L === 0 ? "lastOutput" : rng.pick(["lastOutput", "var"]);
      return {
        program, target: ask === "var" ? { kind: "var", name: "total" } : { kind: "lastOutput" }, template: ask === "var" ? "final-after-print" : "last-printed-total", concept: "printed value vs final value",
        prompt: ask === "var" ? "What is the final value of total?" : "What is the last value printed?", params: { n, start, step }, traceLoop: "main", traceVars: ["i", "total"],
        mutants: [
          { misconception: "printed-vs-final", program, target: ask === "var" ? { kind: "lastOutput" } : { kind: "var", name: "total" } },
          { misconception: "boundary", program: mutate.boundary(program, "main") },
          { misconception: "update-order", program: mutate.swapBody(program, "main"), target: ask === "var" ? { kind: "var", name: "total" } : { kind: "lastOutput" } },
        ],
        explain: `total is printed after each addition; the statement total *= 2 runs once after the loop, so the final value differs from the last printed value.`,
      };
    }
    // threshold with while
    const step = rng.int(3, 7), limit = rng.int(20, 45);
    const program = P([J.decl("int", "total", N(0)), J.decl("int", "count", N(0)), tag(J.whileL(J.lt(V("total"), N(limit)), [J.op("total", "+=", J.add(V("count"), N(step))), J.inc("count")]), "main")]);
    return {
      program, target: { kind: "vars", names: ["total", "count"] }, template: "accumulate-until-threshold", concept: "accumulator controls termination",
      prompt: "What are the final values of total and count?", params: { step, limit }, traceLoop: "main", traceVars: ["total", "count"],
      mutants: [{ misconception: "update-order", program: mutate.swapBody(program, "main") }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(J.add(V("total"), J.add(V("count"), N(step))), N(limit)); }) }],
      explain: `Each iteration adds count + ${step} (a growing amount) and then increments count. The loop stops at the first check where total is at least ${limit}.`,
    };
  },
};

/* ---------------- F. Sentinel-controlled loops ---------------- */
const sentinel = {
  id: "sentinel", name: "Sentinel-controlled loops",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 0, "count"], [0, 1, "sum"], [1, 1, "max"], [1, 1, "break"], [2, 2, "compound"], [2, 2, "average"], [2, 2, "filtered"]]);
    const S = t === "max" ? rng.pick([999, 99, -1]) : rng.pick([-1, 0, 999, -99]);
    const before = Array.from({ length: rng.int(3, 5 + L) }, () => rng.int(1, 30)).filter((x) => x !== S);
    const after = Array.from({ length: rng.int(1, 3) }, () => rng.int(1, 30));
    if (t === "max") { after[0] = Math.max(...before) + rng.int(1, 6); if (before.at(-1) === Math.max(...before)) before.reverse(); }
    const present = t !== "compound" || rng.chance(0.5);
    const input = present ? [...before, S, ...after] : [...before];
    const arr = "input", sumB = before.reduce((a, b) => a + b, 0);
    const prime = (body) => P([J.decl("int[]", arr, arrLit(input)), J.decl("int", "pos", N(0)), J.decl("int", "value", J.idx(V(arr), V("pos"))), ...body]);
    const readNext = [J.inc("pos"), J.set("value", J.idx(V(arr), V("pos")))];
    if (t === "count" || t === "sum" || t === "max") {
      const acc = t === "count" ? "count" : t === "sum" ? "total" : "largest";
      const upd = t === "count" ? J.inc(acc) : t === "sum" ? J.op(acc, "+=", V("value")) : J.iff(J.gt(V("value"), V(acc)), [J.set(acc, V("value"))], null, { tag: "test" });
      const program = prime([J.decl("int", acc, N(0)), tag(J.whileL(J.ne(V("value"), N(S)), [upd, ...readNext]), "main")]);
      const wrong = t === "count" ? [before.length + 1, before.length + 1 + after.length] : t === "sum" ? [sumB + S, sumB + S + after.reduce((a, b) => a + b, 0)] : [Math.max(...before, S), Math.max(...before, S, ...after)];
      return {
        program, target: { kind: "var", name: acc }, template: `sentinel-${t}`, concept: "priming read and sentinel test",
        prompt: `What is the final value of ${acc}?`, params: { input, S }, traceLoop: "main", traceVars: ["pos", "value", acc],
        mutants: [{ misconception: "update-order", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b.push(b.shift()); }) }],
        extraDistractors: [...(t === "max" ? [{ choice: String(before[0]), misconception: "initial-value" }] : []), { choice: String(wrong[0]), misconception: "sentinel-processed" }, { choice: String(wrong[1]), misconception: "past-sentinel" }, { choice: String(t === "count" ? before.length - 1 : t === "sum" ? sumB - before.at(-1) : Math.max(...before.slice(0, -1))), misconception: "missed-final" }],
        explain: `The priming read loads ${input[0]}. The loop processes ${before.join(", ")} and stops when value becomes the sentinel ${S}; the sentinel and everything after it are never processed.`,
      };
    }
    if (t === "break") {
      const program = P([J.decl("int[]", arr, arrLit(input)), J.decl("int", "count", N(0)), J.decl("int", "total", N(0)), tag(J.forL(J.decl("int", "k", N(0)), J.lt(V("k"), J.len(V(arr))), J.inc("k"), [J.iff(J.eq(J.idx(V(arr), V("k")), N(S)), [J.brk()], null, { tag: "test", inline: true }), J.op("total", "+=", J.idx(V(arr), V("k"))), J.inc("count")]), "main")]);
      return {
        program, target: { kind: "vars", names: ["count", "total"] }, template: "sentinel-break", concept: "sentinel detected with break",
        prompt: "What are the final values of count and total?", params: { input, S }, traceLoop: "main", traceVars: ["k", "count", "total"],
        mutants: [{ misconception: "ignore-break", program: mutate.edit(program, (q) => { findTag(q, "test").then = [J.cont()]; }) }, { misconception: "sentinel-processed", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b.push(b.shift()); }) }, { misconception: "past-sentinel", program: mutate.edit(program, (q) => { findTag(q, "main").body.shift(); }) }],
        explain: `Values before the sentinel ${S} are added and counted. When input[k] equals ${S}, break ends the loop before the additions run.`,
      };
    }
    if (t === "compound") {
      const program = P([J.decl("int[]", arr, arrLit(input)), J.decl("int", "pos", N(0)), J.decl("int", "sum", N(0)), tag(J.whileL(J.and(J.lt(V("pos"), J.len(V(arr))), J.ne(J.idx(V(arr), V("pos")), N(S))), [J.op("sum", "+=", J.idx(V(arr), V("pos"))), J.inc("pos")]), "main")]);
      return {
        program, target: { kind: "vars", names: ["pos", "sum"] }, template: present ? "compound-sentinel-present" : "compound-sentinel-missing", concept: "two ways to stop: sentinel or end of data",
        prompt: "What are the final values of pos and sum?", params: { input, S, present }, traceLoop: "main", traceVars: ["pos", "sum"],
        mutants: [{ misconception: "update-order", program: mutate.swapBody(program, "main") }, { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c.l = J.lt(V("pos"), J.sub(J.len(V(arr)), N(1))); }) }],
        extraDistractors: [{ choice: `pos = ${before.length + 1}, sum = ${sumB + (present ? S : 0)}`, misconception: "sentinel-processed" }, { choice: `pos = ${before.length - 1}, sum = ${sumB}`, misconception: "last-in-loop" }],
        explain: present ? `The loop stops at index ${before.length}, where the sentinel ${S} appears. && checks pos < input.length first, so input[pos] is never read out of bounds.` : `The sentinel ${S} never appears, so the loop stops when pos reaches input.length (${input.length}). Short-circuit && prevents reading input[${input.length}].`,
      };
    }
    if (t === "filtered") {
      const thr = rng.int(8, 18);
      const program = P([J.decl("int[]", arr, arrLit(input)), J.decl("int", "big", N(0)), J.decl("int", "small", N(0)), tag(J.forL(J.decl("int", "k", N(0)), J.lt(V("k"), J.len(V(arr))), J.inc("k"), [J.iff(J.eq(J.idx(V(arr), V("k")), N(S)), [J.brk()], null, { tag: "stop", inline: true }), J.iff(J.gt(J.idx(V(arr), V("k")), N(thr)), [J.inc("big")], [J.op("small", "+=", J.idx(V(arr), V("k")))], { tag: "test" })]), "main")]);
      return {
        program, target: { kind: "vars", names: ["big", "small"] }, template: "sentinel-filtered", concept: "sentinel exit plus conditional accumulation",
        prompt: "What are the final values of big and small?", params: { input, S, thr }, traceLoop: "main", traceVars: ["k", "big", "small"],
        mutants: [{ misconception: "past-sentinel", program: mutate.edit(program, (q) => { findTag(q, "main").body.shift(); }) }, { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "sentinel-processed", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b.push(b.shift()); }) }, { misconception: "boundary", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = ">="; }) }],
        explain: `Before the sentinel ${S}: values above ${thr} are counted in big; the others are added to small. break stops the loop at the sentinel.`,
      };
    }
    // average before sentinel
    const len = before.length;
    const program = prime([J.decl("int", "sum", N(0)), J.decl("int", "count", N(0)), tag(J.whileL(J.ne(V("value"), N(S)), [J.op("sum", "+=", V("value")), J.inc("count"), ...readNext]), "main"), J.decl("double", "avg", J.div(J.cast("double", V("sum")), V("count")))]);
    const exact = sumB / len;
    const f = (x) => (Number.isInteger(x) ? x + ".0" : String(x));
    return {
      program, target: { kind: "var", name: "avg" }, template: "sentinel-average", concept: "sentinel with counter and accumulator",
      prompt: "What is the final value of avg?", params: { input, S }, traceLoop: "main", traceVars: ["value", "sum", "count"],
      extraDistractors: [{ choice: f((sumB + S) / (len + 1)), misconception: "sentinel-processed" }, { choice: f(Math.trunc(exact)), misconception: "decimal-expected" }, { choice: f(sumB / (len + 1)), misconception: "extra-iteration" }, { choice: f(sumB / (len - 1)), misconception: "missed-final" }],
      explain: `${len} values are processed before the sentinel: sum = ${sumB}, count = ${len}, and the cast makes avg = ${f(exact)}.`,
    };
  },
};

/* ---------------- G. Boolean flags ---------------- */
const flags = {
  id: "boolean-flags", name: "Boolean flag algorithms",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 1, "found-index"], [1, 2, "found-break"], [1, 2, "all"], [1, 1, "early-while"], [2, 2, "multi"], [2, 2, "ever"]]);
    const len = [rng.int(4, 5), rng.int(5, 7), rng.int(7, 9)][L];
    const vals = Array.from({ length: len }, () => rng.int(1, 15));
    const arr = rng.pick(["values", "nums", "codes"]);
    const targetVal = rng.pick(vals);
    if (vals.indexOf(targetVal) === vals.lastIndexOf(targetVal) && rng.chance(0.7)) vals[rng.int(vals.indexOf(targetVal) + 1 > len - 1 ? 0 : vals.indexOf(targetVal) + 1, len - 1)] = targetVal;
    const first = vals.indexOf(targetVal), last = vals.lastIndexOf(targetVal);
    const loop = (body) => tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), J.len(V(arr))), J.inc("i"), body), "main");
    if (t === "found-index" || t === "found-break") {
      const brk = t === "found-break";
      const program = P([J.decl("int[]", arr, arrLit(vals)), J.decl("boolean", "found", J.b(false)), J.decl("int", "where", N(-1)), loop([J.iff(J.eq(J.idx(V(arr), V("i")), N(targetVal)), [J.set("found", J.b(true)), J.set("where", V("i")), ...(brk ? [J.brk()] : [])], null, { tag: "test" })])]);
      const askBody = brk && L >= 1 && rng.chance(0.5);
      return {
        program, target: askBody ? { kind: "body", tag: "main" } : { kind: "vars", names: ["found", "where"] }, template: brk ? "search-with-break" : "search-last-match", concept: brk ? "early termination on first match" : "flag plus last matching index",
        prompt: askBody ? "How many times does the loop body execute?" : "What are the final values of found and where?", params: { vals, targetVal }, traceLoop: "main", traceVars: ["i", "found", "where"],
        mutants: [
          { misconception: brk ? "ignore-break" : "first-vs-last", program: brk ? mutate.removeAll(program, "break") : mutate.edit(program, (q) => { findTag(q, "test").then.push(J.brk()); }) },
          { misconception: "flag-reset", program: mutate.edit(program, (q) => { findTag(q, "test").els = [J.set("found", J.b(false))]; }) },
          { misconception: askBody ? "cond-vs-body" : "inverted-condition", program: askBody ? program : mutate.ifInvert(program, "test"), target: askBody ? { kind: "cond", tag: "main" } : undefined },
          { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("i"), J.sub(J.len(V(arr)), N(1))); }) },
        ],
        extraDistractors: askBody ? [{ choice: String(len), misconception: "ignore-break" }] : [{ choice: `found = true, where = ${targetVal}`, misconception: "value-vs-index" }],
        explain: brk ? `${targetVal} first appears at index ${first}; break stops the loop in that iteration (iteration ${first + 1}).` : `With no break, the loop keeps scanning; where ends at the last match, index ${last}.`,
      };
    }
    if (t === "all") {
      const k = rng.pick([2, 3]); const allMatch = rng.chance(0.4);
      const v2 = vals.map((x) => (allMatch ? x * k : x));
      const program = P([J.decl("int[]", arr, arrLit(v2)), J.decl("boolean", "allMultiples", J.b(true)), J.decl("int", "checked", N(0)), loop([J.inc("checked"), J.iff(J.ne(J.mod(J.idx(V(arr), V("i")), N(k)), N(0)), [J.set("allMultiples", J.b(false)), J.brk()], null, { tag: "test" })])]);
      const firstBad = v2.findIndex((x) => x % k !== 0);
      return {
        program, target: { kind: "vars", names: ["allMultiples", "checked"] }, template: "all-match-flag", concept: "flag that starts true and can only turn false",
        prompt: "What are the final values of allMultiples and checked?", params: { vals: v2, k }, traceLoop: "main", traceVars: ["i", "checked", "allMultiples"],
        mutants: [{ misconception: "ignore-break", program: mutate.removeAll(program, "break") }, { misconception: "flag-reset", program: mutate.edit(program, (q) => { findTag(q, "test").els = [J.set("allMultiples", J.b(true))]; findTag(q, "test").then.pop(); }) }, { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "update-order", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b.push(b.shift()); }) }],
        explain: firstBad < 0 ? `Every element is a multiple of ${k}, so the flag stays true and all ${v2.length} elements are checked.` : `Index ${firstBad} holds ${v2[firstBad]}, the first non-multiple of ${k}. The flag turns false and break stops after ${firstBad + 1} checks.`,
      };
    }
    if (t === "early-while") {
      const program = P([J.decl("int[]", arr, arrLit(vals)), J.decl("int", "i", N(0)), J.decl("boolean", "found", J.b(false)), tag(J.whileL(J.and(J.lt(V("i"), J.len(V(arr))), J.not(V("found"))), [J.iff(J.eq(J.idx(V(arr), V("i")), N(targetVal)), [J.set("found", J.b(true))], null, { tag: "test" }), J.inc("i")]), "main")]);
      return {
        program, target: { kind: "vars", names: ["found", "i"] }, template: "flag-controlled-while", concept: "flag in the loop condition",
        prompt: "What are the final values of found and i?", params: { vals, targetVal }, traceLoop: "main", traceVars: ["i", "found"],
        mutants: [{ misconception: "last-in-loop", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; findTag(q, "test").els = [b[1]]; b.pop(); }) }, { misconception: "ignore-condition", program: mutate.edit(program, (q) => { findTag(q, "main").c = findTag(q, "main").c.l; }) }, { misconception: "flag-reset", program: mutate.edit(program, (q) => { findTag(q, "test").els = [J.set("found", J.b(false))]; }) }],
        extraDistractors: [{ choice: `found = true, i = ${first}`, misconception: "last-in-loop" }],
        explain: `When index ${first} matches, found becomes true, but i++ still runs in that iteration. The next check of !found fails, leaving i = ${first + 1}.`,
      };
    }
    if (t === "ever") {
      const lim = rng.int(15, 30);
      const program = P([J.decl("int[]", arr, arrLit(vals)), J.decl("int", "running", N(0)), J.decl("boolean", "exceeded", J.b(false)), J.decl("int", "when", N(-1)), loop([J.op("running", "+=", J.idx(V(arr), V("i"))), J.iff(J.and(J.gt(V("running"), N(lim)), J.not(V("exceeded"))), [J.set("exceeded", J.b(true)), J.set("when", V("i"))], null, { tag: "test" })])]);
      return {
        program, target: { kind: "vars", names: ["exceeded", "when"] }, template: "ever-exceeded", concept: "recording when a condition first occurs",
        prompt: "What are the final values of exceeded and when?", params: { vals, lim }, traceLoop: "main", traceVars: ["i", "running", "exceeded"],
        mutants: [{ misconception: "first-vs-last", program: mutate.edit(program, (q) => { findTag(q, "test").c = findTag(q, "test").c.l; }) }, { misconception: "boundary", program: mutate.edit(program, (q) => { findTag(q, "test").c.l.op = ">="; }) }, { misconception: "update-order", program: mutate.swapBody(program, "main") }],
        explain: `running accumulates the elements. The first time it passes ${lim}, exceeded turns true and when records that index; the !exceeded test prevents later overwrites.`,
      };
    }
    // multi
    const v2 = vals.map((x) => (rng.chance(0.3) ? -x : x));
    const program = P([J.decl("int[]", arr, arrLit(v2)), J.decl("boolean", "hasNeg", J.b(false)), J.decl("boolean", "hasEven", J.b(false)), J.decl("int", "both", N(0)), loop([J.iff(J.lt(J.idx(V(arr), V("i")), N(0)), [J.set("hasNeg", J.b(true))], null, { tag: "t1", inline: true }), J.iff(J.eq(J.mod(J.idx(V(arr), V("i")), N(2)), N(0)), [J.set("hasEven", J.b(true))], null, { tag: "t2", inline: true }), J.iff(J.and(V("hasNeg"), V("hasEven")), [J.inc("both")], null, { tag: "test", inline: true })])]);
    return {
      program, target: { kind: "vars", names: ["hasNeg", "hasEven", "both"] }, template: "two-flags-combined", concept: "multiple flags and a combined condition",
      prompt: "What are the final values of hasNeg, hasEven, and both?", params: { vals: v2 }, traceLoop: "main", traceVars: ["i", "hasNeg", "hasEven", "both"],
      mutants: [{ misconception: "flag-reset", program: mutate.edit(program, (q) => { findTag(q, "t1").els = [J.set("hasNeg", J.b(false))]; findTag(q, "t1").inline = false; findTag(q, "t2").els = [J.set("hasEven", J.b(false))]; findTag(q, "t2").inline = false; }) }, { misconception: "inverted-condition", program: mutate.edit(program, (q) => { findTag(q, "test").c.op = "||"; }) }, { misconception: "update-order", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b.unshift(b.pop()); }) }],
      explain: `Once a flag turns true it stays true. both counts the iterations (from the first moment both flags are true) through the end.`,
    };
  },
};

/* ---------------- H. String accumulation ---------------- */
const strings = {
  id: "string-accumulation", name: "String accumulation",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 1, "append"], [0, 1, "prepend"], [1, 1, "separator"], [1, 1, "letters"], [0, 0, "stars"], [2, 2, "concat-trap"], [2, 2, "char-trap"], [1, 1, "state"], [2, 2, "both-ends"], [2, 2, "nested-string"]]);
    const s = rng.pick(["result", "s", "text", "out"]);
    if (t === "append" || t === "prepend" || t === "state") {
      const a = rng.int(1, 5), step = rng.pick(L === 0 ? [1, 2] : [1, 2, 3]), b = a + step * rng.int(2, 4);
      const pre = t === "prepend" || (t === "state" && rng.chance(0.5));
      const program = P([J.decl("String", s, J.s("")), tag(J.forL(J.decl("int", "i", N(a)), J.le(V("i"), N(b)), step === 1 ? J.inc("i") : J.op("i", "+=", N(step)), [pre ? J.set(s, J.add(V("i"), V(s))) : J.op(s, "+=", V("i"))]), "main")]);
      if (t === "state") {
        const k = rng.int(1, 2);
        return { program, target: stateTarget("main", k, ["i", s]), template: "string-state", concept: "String state between iterations", prompt: `What are i and ${s} after the ${ordinal(k)} iteration?`, params: { a, b, step, pre, k }, traceLoop: "main", traceVars: ["i", s],
          mutants: [...stateMutants(program, "main", k, ["i", s], range(a, b, step).length + 1), { misconception: "string-reverse", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = pre ? J.op(s, "+=", V("i")) : J.set(s, J.add(V("i"), V(s))); }), target: stateTarget("main", k, ["i", s]) }],
          explain: `${pre ? "Prepending" : "Appending"} adds each i to the ${pre ? "front" : "end"}; after the update i has already advanced.` };
      }
      return {
        program, target: { kind: "var", name: s }, template: pre ? "prepend-numbers" : "append-numbers", concept: pre ? "prepending reverses order" : "appending in order",
        prompt: `What is the final value of ${s}?`, params: { a, b, step }, traceLoop: "main", traceVars: ["i", s],
        mutants: [
          { misconception: "string-reverse", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = pre ? J.op(s, "+=", V("i")) : J.set(s, J.add(V("i"), V(s))); }) },
          { misconception: "boundary", program: mutate.boundary(program, "main") },
          { misconception: "accum-overwrite", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = J.set(s, J.add(J.s(""), V("i"))); }) },
          { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(a + step); }) },
        ],
        explain: `i takes ${range(a, b, step).join(", ")}. ${pre ? "Each value is placed in front, so the String ends in reverse order." : "Each value is attached to the end."}`,
      };
    }
    if (t === "separator") {
      const n = rng.int(4, 7), k = rng.pick([2, 3]);
      const sep = rng.pick(["-", ",", "|"]);
      const program = P([J.decl("String", s, J.s("")), tag(J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n)), J.inc("i"), [J.iff(J.eq(J.mod(V("i"), N(k)), N(0)), [J.op(s, "+=", J.add(V("i"), J.s(sep)))], null, { tag: "test" })]), "main")]);
      return {
        program, target: { kind: "var", name: s }, template: "conditional-separator", concept: "conditional String building",
        prompt: `What is the final value of ${s}?`, params: { n, k, sep }, traceLoop: "main", traceVars: ["i", s],
        mutants: [{ misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }, { misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "boundary", program: mutate.boundary(program, "main") }],
        extraDistractors: [{ choice: `"${range(1, n).filter((x) => x % k === 0).join(sep)}"`, misconception: "printed-vs-final" }],
        explain: `Only multiples of ${k} are appended, each followed by "${sep}" — including after the last one.`,
      };
    }
    if (t === "letters") {
      const word = rng.pick(["PROGRAM", "COMPILER", "VARIABLE", "BOOLEAN", "METHOD", "BOUNDARY"]);
      const start = rng.int(0, 1), step = rng.pick([2, 3]);
      const program = P([J.decl("String", "word", J.s(word)), J.decl("String", s, J.s("")), tag(J.forL(J.decl("int", "i", N(start)), J.lt(V("i"), J.slen(V("word"))), J.op("i", "+=", N(step)), [J.op(s, "+=", J.substr(V("word"), V("i"), J.add(V("i"), N(1))))]), "main")]);
      return {
        program, target: { kind: "var", name: s }, template: "every-kth-letter", concept: "building from selected positions",
        prompt: `What is the final value of ${s}?`, params: { word, start, step }, traceLoop: "main", traceVars: ["i", s],
        mutants: [{ misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "main").init.e = N(start + 1); }) }, { misconception: "string-reverse", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b[0] = J.set(s, J.add(J.substr(V("word"), V("i"), J.add(V("i"), N(1))), V(s))); }) }, { misconception: "boundary", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("i"), J.sub(J.slen(V("word")), N(1))); }) }],
        explain: `i visits ${range(start, word.length - 1, step).join(", ")}; each substring(i, i + 1) is one letter.`,
      };
    }
    if (t === "stars") {
      const n = rng.int(3, 9), extra = rng.int(1, 6);
      const sym = rng.pick(["*", "#", "+", "ab", "-"]), bar = rng.pick(["bar", "line", "row"]);
      const program = P([J.decl("String", bar, J.s("")), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(n)), J.inc("i"), [J.op(bar, "+=", J.s(sym))]), "main"), J.decl("int", "size", J.add(J.slen(V(bar)), N(extra)))]);
      return {
        program, target: { kind: "var", name: "size" }, template: "star-length", concept: "length of a built String",
        prompt: "What is the final value of size?", params: { n, extra }, traceLoop: "main", traceVars: ["i", bar],
        mutants: [{ misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "accum-overwrite", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = J.set(bar, J.s(sym)); }) }, { misconception: "cond-vs-body", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.le(V("i"), N(n)); }) }],
        extraDistractors: [{ choice: String(n * sym.length), misconception: "ignore-final-step" }, { choice: String((n + 1) * sym.length + extra), misconception: "extra-iteration" }, ...(sym.length > 1 ? [{ choice: String(n + extra), misconception: "sum-vs-count" }] : []), { choice: String(extra), misconception: "accum-overwrite" }],
        explain: `The loop appends "*" ${n} times, so bar.length() is ${n}; size adds ${extra}.`,
      };
    }
    if (t === "concat-trap") {
      const n = rng.int(2, 5), a = rng.int(0, 7);
      const program = P([J.decl("String", s, J.s("")), tag(J.forL(J.decl("int", "i", N(a)), J.lt(V("i"), N(a + n)), J.inc("i"), [J.set(s, J.add(J.add(V(s), V("i")), N(1)))]), "main")]);
      return {
        program, target: { kind: "var", name: s }, template: "left-to-right-concatenation", concept: "+ evaluates left to right once a String is involved",
        prompt: `What is the final value of ${s}?`, params: { a, n }, traceLoop: "main", traceVars: ["i", s],
        mutants: [{ misconception: "char-arithmetic", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = J.set(s, J.add(V(s), J.add(V("i"), N(1)))); }) }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "string-reverse", program: mutate.edit(program, (q) => { findTag(q, "main").body[0] = J.set(s, J.add(J.add(V("i"), N(1)), V(s))); }) }],
        explain: `${s} + i is a String, so + 1 appends the character 1 instead of adding: each iteration appends i and then "1".`,
      };
    }
    if (t === "char-trap") {
      const n = rng.int(2, 5), ch = rng.pick(["a", "b", "x", "A", "M"]), st = rng.int(0, 2), code = ch.charCodeAt(0);
      const program = P([J.decl("String", s, J.s("")), tag(J.forL(J.decl("int", "i", N(st)), J.lt(V("i"), N(st + n)), J.inc("i"), [J.op(s, "+=", J.add(J.ch(ch), V("i")))]), "main")]);
      const is = range(st, st + n - 1), letter = (i) => String.fromCharCode(code + i);
      return {
        program, target: { kind: "var", name: s }, template: "char-plus-int", concept: "char arithmetic inside String building",
        prompt: `What is the final value of ${s}?`, params: { n, ch, st }, traceLoop: "main", traceVars: ["i", s],
        extraDistractors: [{ choice: `"${is.map(letter).join("")}"`, misconception: "char-arithmetic" }, { choice: `"${is.map((i) => ch + i).join("")}"`, misconception: "char-arithmetic" }, { choice: `"${range(st, st + n).map((i) => code + i).join("")}"`, misconception: "boundary" }],
        explain: `'${ch}' + i is evaluated first, as int arithmetic: ${code} + i. The resulting numbers are appended: ${is.map((i) => code + i).join(", ")}.`,
      };
    }
    if (t === "both-ends") {
      const n = rng.int(4, 6);
      const program = P([J.decl("String", s, J.s("")), tag(J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n)), J.inc("i"), [J.iff(J.eq(J.mod(V("i"), N(2)), N(0)), [J.op(s, "+=", V("i"))], [J.set(s, J.add(V("i"), V(s)))], { tag: "test" })]), "main")]);
      return {
        program, target: { kind: "var", name: s }, template: "append-even-prepend-odd", concept: "conditional append vs prepend",
        prompt: `What is the final value of ${s}?`, params: { n }, traceLoop: "main", traceVars: ["i", s],
        mutants: [{ misconception: "inverted-condition", program: mutate.ifInvert(program, "test") }, { misconception: "string-reverse", program: mutate.edit(program, (q) => { findTag(q, "test").els = [J.op(s, "+=", V("i"))]; }) }, { misconception: "boundary", program: mutate.boundary(program, "main") }],
        explain: `Even values go on the end and odd values go on the front, so the odds appear in reverse order before the evens.`,
      };
    }
    if (t === "nested-string") {
      const n = rng.int(3, 4), sep = rng.pick([" ", ",", "|"]);
      const program = P([J.decl("String", s, J.s("")), tag(J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n)), J.inc("i"), [tag(J.forL(J.decl("int", "j", N(1)), J.le(V("j"), V("i")), J.inc("j"), [J.op(s, "+=", V("j"))]), "inner"), J.op(s, "+=", J.s(sep))]), "main")]);
      return {
        program, target: { kind: "var", name: s }, template: "nested-string-rows", concept: "String built by a dependent nested loop",
        prompt: `What is the final value of ${s}?`, params: { n, sep }, traceLoop: "main", traceVars: ["i", s],
        mutants: [{ misconception: "outer-times-inner-max", program: mutate.edit(program, (q) => { findTag(q, "inner").c = J.le(V("j"), N(n)); }) }, { misconception: "boundary", program: mutate.boundary(program, "inner") }, { misconception: "update-order", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b.unshift(b.pop()); }) }],
        explain: `For each i, the inner loop appends 1 through i, then the separator "${sep}" is appended once.`,
      };
    }
    throw new GenReject("unknown string template");
  },
};

/* ---------------- I. Nested iterative algorithms ---------------- */
const nestedAlg = {
  id: "nested-algorithms", name: "Nested iterative algorithms",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 1, "product-sum"], [1, 2, "pairs"], [1, 2, "dependent"], [1, 2, "pattern"], [2, 2, "cond-break"], [2, 2, "row-totals"]]);
    const R = rng.int(2, 4 + L), C = rng.int(2, 4 + L);
    if (t === "product-sum") {
      const op = rng.pick(["*", "+", "-"]);
      const [ro, co] = rng.pick([["r", "c"], ["i", "j"], ["row", "col"], ["a", "b"], ["x", "y"]]);
      const acc = rng.pick(["total", "sum", "result"]), rs = rng.int(0, 2), cs = rng.int(0, 2), init = rng.pick([0, 0, rng.int(1, 9)]);
      const program = P([J.decl("int", acc, N(init)), tag(J.forL(J.decl("int", ro, N(rs)), J.le(V(ro), N(rs + R - 1)), J.inc(ro), [tag(J.forL(J.decl("int", co, N(cs)), J.lt(V(co), N(cs + C)), J.inc(co), [J.op(acc, "+=", J.bin(op, V(ro), V(co)))]), "inner")]), "main")]);
      return {
        program, target: { kind: "var", name: acc }, template: op === "*" ? "nested-product-sum" : op === "+" ? "nested-sum-of-sums" : "nested-difference-sum", concept: "nested accumulation",
        prompt: `What is the final value of ${acc}?`, params: { R, C, op }, traceLoop: "main", traceVars: [ro, acc],
        mutants: [{ misconception: "boundary", program: mutate.boundary(program, "inner") }, { misconception: "ignore-inner", program: mutate.edit(program, (q) => { findTag(q, "inner").c = J.lt(V(co), N(cs + 1)); }) }, { misconception: "accum-overwrite", program: mutate.overwrite(program, acc) }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "accum-init", program: init ? mutate.setInit(program, acc, N(0)) : null }],
        explain: `For each ${ro} from ${rs} to ${rs + R - 1}, the inner loop adds ${ro} ${op} ${co} for ${co} = ${cs}..${cs + C - 1}; the inner loop restarts every outer iteration.`,
      };
    }
    if (t === "pairs") {
      const n = rng.int(4, 5 + L), k = rng.int(n - 1, n + 2), rel = rng.pick(["sum", "less"]);
      const cond = rel === "sum" ? J.eq(J.add(V("i"), V("j")), N(k)) : J.lt(V("i"), V("j"));
      const program = P([J.decl("int", "pairs", N(0)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(n)), J.inc("i"), [tag(J.forL(J.decl("int", "j", N(0)), J.lt(V("j"), N(n)), J.inc("j"), [J.iff(cond, [J.inc("pairs")], null, { tag: "test", inline: true })]), "inner")]), "main")]);
      return {
        program, target: { kind: "var", name: "pairs" }, template: rel === "sum" ? "count-pairs-with-sum" : "count-ordered-pairs", concept: "counting matching pairs",
        prompt: "What is the final value of pairs?", params: { n, k, rel }, traceLoop: "main", traceVars: ["i", "pairs"],
        mutants: [{ misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }, { misconception: "boundary", program: mutate.boundary(program, "inner") }, { misconception: "tie-handling", program: rel === "less" ? mutate.edit(program, (q) => { findTag(q, "test").c.op = "<="; }) : mutate.edit(program, (q) => { findTag(q, "inner").init.e = V("i"); }) }, { misconception: "boundary", program: mutate.boundary(program, "main") }],
        explain: rel === "sum" ? `Every (i, j) with 0 ≤ i, j < ${n} is tested once; count the pairs whose sum is ${k}.` : `There are ${n * n} pairs; those with i < j are above the diagonal: ${(n * (n - 1)) / 2}.`,
      };
    }
    if (t === "dependent") {
      const n = rng.int(3, 8), inc = rng.chance(0.5);
      const inner = inc ? J.forL(J.decl("int", "j", V("i")), J.lt(V("j"), N(n)), J.inc("j"), [J.op("sum", "+=", V("j"))]) : J.forL(J.decl("int", "j", N(0)), J.lt(V("j"), V("i")), J.inc("j"), [J.op("sum", "+=", V("j"))]);
      const program = P([J.decl("int", "sum", N(0)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(n)), J.inc("i"), [tag(inner, "inner")]), "main")]);
      return {
        program, target: { kind: "var", name: "sum" }, template: inc ? "inner-starts-at-outer" : "inner-bounded-by-outer", concept: "index-dependent bounds",
        prompt: "What is the final value of sum?", params: { n, inc }, traceLoop: "main", traceVars: ["i", "sum"],
        mutants: [{ misconception: "outer-times-inner-max", program: mutate.edit(program, (q) => { const f = findTag(q, "inner"); if (inc) f.init.e = N(0); else f.c = J.lt(V("j"), N(n)); }) }, { misconception: "boundary", program: mutate.boundary(program, "inner") }, { misconception: "accum-overwrite", program: mutate.overwrite(program, "sum") }],
        explain: inc ? `For outer i, j runs from i to ${n - 1}; later rows have fewer j values.` : `For outer i, j runs from 0 to i − 1; row 0 adds nothing.`,
      };
    }
    if (t === "pattern") {
      const n = rng.int(3, 4 + L), shape = rng.pick(["grow", "shrink", "evens"]);
      const innerCond = shape === "grow" ? J.le(V("j"), V("i")) : shape === "shrink" ? J.le(V("j"), J.sub(N(n + 1), V("i"))) : J.le(V("j"), J.mul(N(2), V("i")));
      const sym = rng.pick(["*", "#", "o"]);
      const program = P([tag(J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n)), J.inc("i"), [tag(J.forL(J.decl("int", "j", N(1)), innerCond, J.inc("j"), [J.printNo(J.s(sym))]), "inner"), J.print(J.s(""))]), "main")]);
      const ask = rng.pick(["output", "line"]); const line = rng.int(2, n);
      return {
        program, target: ask === "output" ? { kind: "output" } : { kind: "lineOutput", line }, template: `pattern-${shape}`, concept: "pattern-building nested loops",
        prompt: ask === "output" ? "What does the program print?" : `What does the program print on line ${line}?`, params: { n, shape, line }, traceLoop: "main", traceVars: ["i"],
        mutants: [{ misconception: "boundary", program: mutate.boundary(program, "inner") }, { misconception: "outer-times-inner-max", program: mutate.edit(program, (q) => { findTag(q, "inner").c = J.le(V("j"), N(n)); }) }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "off-start", program: mutate.edit(program, (q) => { findTag(q, "inner").init.e = N(0); }) }],
        explain: `Each outer iteration prints one line: the inner loop prints "${sym}" ${shape === "grow" ? "i" : shape === "shrink" ? `${n + 1} − i` : "2 × i"} times, then println ends the line.`,
      };
    }
    if (t === "cond-break") {
      const n = rng.int(3, 6), lim = rng.int(3, 12);
      const program = P([J.decl("int", "count", N(0)), tag(J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n)), J.inc("i"), [tag(J.forL(J.decl("int", "j", N(1)), J.le(V("j"), N(n)), J.inc("j"), [J.iff(J.gt(J.mul(V("i"), V("j")), N(lim)), [J.brk()], null, { tag: "test", inline: true }), J.inc("count")]), "inner")]), "main")]);
      return {
        program, target: { kind: "var", name: "count" }, template: "nested-break-on-product", concept: "conditional nested iteration with inner break",
        prompt: "What is the final value of count?", params: { n, lim }, traceLoop: "main", traceVars: ["i", "count"],
        mutants: [{ misconception: "ignore-break", program: mutate.removeAll(program, "break") }, { misconception: "break-outer", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.and(J.le(V("i"), N(n)), J.le(V("i"), N(Math.max(1, Math.min(n, lim))))); findTag(q, "test").then = [J.brk()]; }) }, { misconception: "ignore-continue", program: mutate.edit(program, (q) => { findTag(q, "test").then = [J.cont()]; }) }, { misconception: "boundary", program: mutate.boundary(program, "inner") }],
        explain: `For each i, j counts up until i × j exceeds ${lim}; break ends only the inner loop, and the outer loop continues with the next i.`,
      };
    }
    // row-totals: print row totals
    const program = P([tag(J.forL(J.decl("int", "r", N(1)), J.le(V("r"), N(R)), J.inc("r"), [J.decl("int", "rowTotal", N(0)), tag(J.forL(J.decl("int", "c", V("r")), J.le(V("c"), N(C + 1)), J.inc("c"), [J.op("rowTotal", "+=", V("c"))]), "inner"), J.print(V("rowTotal"))]), "main")]);
    return {
      program, target: { kind: "output" }, template: "row-totals-reset", concept: "resetting an accumulator per outer iteration",
      prompt: "What does the program print?", params: { R, C }, traceLoop: "main", traceVars: ["r"],
      mutants: [{ misconception: "accum-init", program: mutate.edit(program, (q) => { const m = findTag(q, "main"); const decl = m.body.shift(); q.unshift(decl); }) }, { misconception: "outer-times-inner-max", program: mutate.edit(program, (q) => { findTag(q, "inner").init.e = N(1); }) }, { misconception: "boundary", program: mutate.boundary(program, "inner") }],
      explain: `rowTotal is declared inside the outer loop, so it restarts at 0 for each row; the inner loop sums c from r to ${C + 1}.`,
    };
  },
};

/* ---------------- J. Combined algorithm tracing ---------------- */
const combined = {
  id: "combined-tracing", name: "Combined algorithm tracing",
  generate(rng, d) {
    const L = lvl(d);
    const t = choose(rng, d, [[0, 1, "converge"], [1, 2, "fib"], [2, 2, "collatz"], [1, 2, "sum-max"], [0, 1, "swap-step"], [2, 2, "fib-state"], [2, 2, "multi-state"]]);
    if (t === "converge") {
      const lo = rng.int(0, 9), hi = lo + rng.int(5, 14), dl = rng.pick([1, 2]), dh = rng.pick([1, 2, 3]);
      const program = P([J.decl("int", "lo", N(lo)), J.decl("int", "hi", N(hi)), J.decl("int", "steps", N(0)), tag(J.whileL(J.lt(V("lo"), V("hi")), [dl === 1 ? J.inc("lo") : J.op("lo", "+=", N(dl)), dh === 1 ? J.dec("hi") : J.op("hi", "-=", N(dh)), J.inc("steps")]), "main")]);
      return {
        program, target: { kind: "vars", names: ["lo", "hi", "steps"] }, template: "converging-pointers", concept: "two variables moving toward each other",
        prompt: "What are the final values of lo, hi, and steps?", params: { lo, hi, dl, dh }, traceLoop: "main", traceVars: ["lo", "hi", "steps"],
        mutants: [{ misconception: "boundary", program: mutate.edit(program, (q) => { findTag(q, "main").c.op = "<="; }) }, { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(J.add(V("lo"), N(dl + dh)), V("hi")); }) }, { misconception: "update-count", program: mutate.edit(program, (q) => { q[2].e = N(1); }) }],
        explain: `Each iteration moves lo up by ${dl} and hi down by ${dh}. The loop stops at the first check where lo is no longer less than hi.`,
      };
    }
    if (t === "fib" || t === "fib-state") {
      const a0 = rng.int(0, 5), b0 = rng.int(1, 6), n = rng.int(3, 7);
      const program = P([J.decl("int", "a", N(a0)), J.decl("int", "b", N(b0)), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), N(n)), J.inc("i"), [J.decl("int", "next", J.add(V("a"), V("b"))), J.set("a", V("b")), J.set("b", V("next"))]), "main")]);
      if (t === "fib-state") {
        const k = rng.int(2, n - 1);
        return { program, target: stateTarget("main", k, ["a", "b"]), template: "fibonacci-state", concept: "paired updates", prompt: `What are a and b after the ${ordinal(k)} iteration?`, params: { a0, b0, n, k }, traceLoop: "main", traceVars: ["i", "a", "b"],
          mutants: [...stateMutants(program, "main", k, ["a", "b"], n + 1), { misconception: "update-order", program: mutate.edit(program, (q) => { const bd = findTag(q, "main").body; bd[0] = J.set("a", V("b")); bd[1] = J.decl("int", "next", J.add(V("a"), V("b"))); }), target: stateTarget("main", k, ["a", "b"]) }],
          explain: "next stores the old a + b before a and b shift, so no value is lost." };
      }
      return {
        program, target: { kind: "vars", names: ["a", "b"] }, template: "fibonacci-like", concept: "temporary variable in paired updates",
        prompt: "What are the final values of a and b?", params: { a0, b0, n }, traceLoop: "main", traceVars: ["i", "a", "b"],
        mutants: [{ misconception: "update-order", program: mutate.edit(program, (q) => { const bd = findTag(q, "main").body; [bd[1], bd[2]] = [bd[2], bd[1]]; }) }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "missed-final", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.lt(V("i"), N(n - 1)); }) }],
        explain: `Each iteration computes next = a + b, then shifts a ← b and b ← next. ${n} iterations run.`,
      };
    }
    if (t === "collatz") {
      const n = rng.pick([6, 7, 9, 10, 11, 12, 13, 17]);
      const program = P([J.decl("int", "n", N(n)), J.decl("int", "steps", N(0)), J.decl("int", "peak", V("n")), tag(J.whileL(J.ne(V("n"), N(1)), [J.iff(J.eq(J.mod(V("n"), N(2)), N(0)), [J.op("n", "/=", N(2))], [J.set("n", J.add(J.mul(N(3), V("n")), N(1)))], { tag: "test" }), J.inc("steps"), J.iff(J.gt(V("n"), V("peak")), [J.set("peak", V("n"))], null, { tag: "t2", inline: true })]), "main")]);
      return {
        program, target: { kind: "vars", names: ["steps", "peak"] }, template: "collatz-steps-peak", concept: "branching update with a running maximum",
        prompt: "What are the final values of steps and peak?", params: { n }, traceLoop: "main", traceVars: ["n", "steps", "peak"],
        mutants: [{ misconception: "update-order", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b.unshift(b.pop()); }) }, { misconception: "inverted-condition", program: mutate.edit(program, (q) => { findTag(q, "main").c = J.gt(V("n"), N(2)); }) }, { misconception: "initial-value", program: mutate.setInit(program, "peak", N(0)) }],
        explain: `Even values are halved; odd values become 3n + 1. steps counts every update; peak tracks the largest value reached.`,
      };
    }
    if (t === "sum-max") {
      const vals = Array.from({ length: rng.int(5, 6 + L) }, () => rng.int(-5, 15));
      const program = P([J.decl("int[]", "data", arrLit(vals)), J.decl("int", "sum", N(0)), J.decl("int", "best", J.idx(V("data"), N(0))), tag(J.forL(J.decl("int", "i", N(0)), J.lt(V("i"), J.len(V("data"))), J.inc("i"), [J.op("sum", "+=", J.idx(V("data"), V("i"))), J.iff(J.gt(V("sum"), V("best")), [J.set("best", V("sum"))], null, { tag: "test", inline: true })]), "main")]);
      return {
        program, target: { kind: "vars", names: ["sum", "best"] }, template: "best-prefix-sum", concept: "running sum feeding a running maximum",
        prompt: "What are the final values of sum and best?", params: { vals }, traceLoop: "main", traceVars: ["i", "sum", "best"],
        mutants: [{ misconception: "update-order", program: mutate.swapBody(program, "main") }, { misconception: "min-init", program: mutate.setInit(program, "best", N(0)) }, { misconception: "ignore-condition", program: mutate.ifAlways(program, "test") }],
        explain: `sum is the running total; best records the largest running total seen (comparing after each addition).`,
      };
    }
    if (t === "swap-step") {
      const x = rng.int(2, 9), y = rng.int(10, 30), n = rng.int(2, 4);
      const program = P([J.decl("int", "x", N(x)), J.decl("int", "y", N(y)), tag(J.forL(J.decl("int", "k", N(0)), J.lt(V("k"), N(n)), J.inc("k"), [J.decl("int", "temp", V("x")), J.set("x", V("y")), J.set("y", J.add(V("temp"), V("k")))]), "main")]);
      return {
        program, target: { kind: "vars", names: ["x", "y"] }, template: "swap-and-shift", concept: "swap with a temporary variable",
        prompt: "What are the final values of x and y?", params: { x, y, n }, traceLoop: "main", traceVars: ["k", "x", "y"],
        mutants: [{ misconception: "update-order", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b[0] = J.decl("int", "temp", V("y")); b[1] = J.set("y", V("x")); b[2] = J.set("x", J.add(V("temp"), V("k"))); }) }, { misconception: "boundary", program: mutate.boundary(program, "main") }, { misconception: "gcd-swap", program: mutate.edit(program, (q) => { const b = findTag(q, "main").body; b[2] = J.set("y", J.add(V("x"), V("k"))); }) }],
        explain: `temp saves x before x is overwritten, so y can receive the old x (plus k).`,
      };
    }
    // multi-state: three variables; ask state after k
    const n = rng.int(4, 8), m = rng.int(2, 4);
    const program = P([J.decl("int", "count", N(0)), J.decl("int", "total", N(0)), J.decl("int", "last", N(-1)), tag(J.forL(J.decl("int", "i", N(1)), J.le(V("i"), N(n * m)), J.inc("i"), [J.iff(J.eq(J.mod(V("i"), N(m)), N(0)), [J.inc("count"), J.op("total", "+=", J.mul(V("i"), V("count"))), J.set("last", V("i"))], null, { tag: "test" })]), "main")]);
    const k = rng.int(m * 2, m * 3);
    return {
      program, target: stateTarget("main", k, ["count", "total", "last"]), template: "three-variable-state", concept: "multi-variable state with a conditional block",
      prompt: `What are count, total, and last after the ${ordinal(k)} iteration?`, params: { n, m, k }, traceLoop: "main", traceVars: ["i", "count", "total", "last"],
      mutants: [{ misconception: "update-order", program: mutate.edit(program, (q) => { const th = findTag(q, "test").then; [th[0], th[1]] = [th[1], th[0]]; }), target: stateTarget("main", k, ["count", "total", "last"]) }, ...stateMutants(program, "main", k, ["count", "total", "last"], n * m + 1), { misconception: "ignore-condition", program: mutate.ifAlways(program, "test"), target: stateTarget("main", k, ["count", "total", "last"]) }],
      explain: `Only multiples of ${m} enter the if block. Inside it, count increases before total uses it, and last records i.`,
    };
  },
};

export const algorithmFamilies = [digitExtraction, divisors, gcd, minMax, accumulators, sentinel, flags, strings, nestedAlg, combined];
