import { num, str, v, bin, call, If, Ret, Do, Print, Decl, method, program, run, mmax, clone } from "./ir.js?v=compositional-v1";
import { makeQuestion, reject, int, pick, LEVEL, NAMES, fmtList, exec, traceLines } from "./core.js?v=compositional-v1";
const MODE = "returns", TITLE = "Return Values";
const n = v("n"), Q = o => makeQuestion({ mode: MODE, modeTitle: TITLE, ...o });
const ok = res => !res.error && res.value !== undefined;
/** Generic distractors from misconception-transformed programs. */
function fromRuns(list, call, answer) { return list.map(([prog, entry, args, mis, why]) => { const res = run(prog, entry, args, { maxDepth: 300 }); return ok(res) ? { value: res.value, mis, why } : null; }).filter(Boolean); }

// ---- digit recursion ----
const DIGIT = [
  { id: "digit-sum", levels: [0, 1, 2], base: () => n, rec: (f) => bin("+", bin("%", n, num(10)), f), desc: "adds the digits",
    wrongs: f => [[() => num(0), "leading-digit-dropped", "The base case returns the last remaining digit n, not 0."], [() => n, null, null]] },
  { id: "digit-count", levels: [0, 1, 2], base: () => num(1), rec: (f) => bin("+", num(1), f), desc: "counts the digits",
    wrongs: () => [[() => num(0), "base-returns-zero", "A one-digit number still has one digit, so the base case returns 1."]] },
  { id: "max-digit", levels: [1, 2], base: () => n, rec: (f) => mmax(bin("%", n, num(10)), f), desc: "finds the largest digit",
    wrongs: () => [[() => num(0), "leading-digit-dropped", "The base case returns the first digit itself."]] },
  { id: "alternating-digits", levels: [2], base: () => n, rec: (f) => bin("-", bin("%", n, num(10)), f), desc: "alternately subtracts digits",
    wrongs: () => [[() => num(0), "leading-digit-dropped", "The base case returns the first digit itself."]] },
];
export const digitRecursion = { id: "digit-recursion", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], D = pick(DIGIT.filter(x => x.levels.includes(L)), r), name = pick(NAMES.ret, r);
  const mk = (base, rec, div = bin("/", n, num(10))) => program([method(name, "int", [["int", "n"]], [If(bin("<", n, num(10)), [Ret(base)]), Ret(rec(call(name, div)))])], name);
  const prog = mk(D.base(), D.rec), start = [int(100, 999, r), int(1000, 99999, r), int(10000, 9999999, r)][L], res = exec(prog, name, [start]);
  const ask = pick(["value", "inner", "returnOrder"], r);
  const common = { r, difficulty: d, family: "digit-recursion", prog, callNote: `call: ${name}(${start})`, trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `digit-recursion:${D.id}:${ask}`, data: { start } };
  const base0 = run(mk(num(0), D.rec), name, [start]), plusOne = run(mk(D.base(), D.rec, bin("-", n, num(10))), name, [start], { maxDepth: 400 });
  if (ask === "value") {
    const Ds = [ok(base0) && { value: base0.value, mis: "leading-digit-dropped", why: "The base case returns n itself (the leading digit), not 0." },
      ok(plusOne) && { value: plusOne.value, mis: "n-minus-10-for-n-div-10", why: "n / 10 removes the last digit; it does not subtract 10." },
      { value: res.value + 1, mis: "off-by-one", why: "Recompute each level's return value carefully." },
      { value: D.id === "digit-count" ? String(start).length - 1 : String(start).split("").reverse().slice(1).map(Number).reduce((a, b) => a + b, 0), mis: "last-digit-skipped", why: "The first call already uses n % 10, the last digit." }].filter(Boolean);
    return Q({ ...common, prompt: `What does ${name}(${start}) return?`, answer: res.value, distractors: Ds,
      explanation: `Each call peels off n % 10 and recurses on n / 10. Returns while unwinding: ${fmtList(res.returns.map(x => `${name}(${x.args[0]}) = ${x.value}`))}.`, jvm: { method: name, call: `${name}(${start})`, observe: "ret" } });
  }
  if (ask === "inner") {
    const target = pick(res.returns.slice(1, -1).length ? res.returns.slice(1, -1) : res.returns.slice(0, -1), r), k = target.args[0];
    return Q({ ...common, prompt: `While ${name}(${start}) is evaluated, what value does the call ${name}(${k}) return?`, answer: target.value,
      distractors: [{ value: res.value, mis: "inner-equals-outer", why: `${res.value} is what the first call returns; ${name}(${k}) only sees the digits of ${k}.` }, ...res.returns.filter(x => x.args[0] !== k && x.value !== target.value).slice(0, 3).map(x => ({ value: x.value, mis: "wrong-level", why: `That is the value returned by ${name}(${x.args[0]}).` }))],
      explanation: `${name}(${k}) depends only on ${k}: it returns ${target.value}.`, jvm: { method: name, call: `${name}(${start})`, observe: "retOf", arg: String(k) } });
  }
  const order = res.returns.map(x => x.value);
  return Q({ ...common, prompt: `List the values returned by the calls, in the order the calls finish.`, answer: fmtList(order),
    distractors: [{ value: fmtList([...order].reverse()), mis: "return-order-is-call-order", why: "The first call made is the last to finish; returns happen in reverse call order." }, { value: fmtList(res.log.map(e => e.args[0])), mis: "arguments-not-returns", why: "Those are the arguments passed to each call, not the returned values." }, { value: fmtList(order.slice(1)), mis: "base-return-ignored", why: "The base-case call also returns a value and finishes first." }],
    explanation: `The deepest call (${name}(${res.log.at(-1).args[0]})) finishes first, then each caller: ${fmtList(order)}.`, jvm: { method: name, call: `${name}(${start})`, observe: "returnOrder" } });
} };

// ---- two-parameter recursion ----
const a = v("a"), b = v("b");
const TWO = [
  { id: "power", levels: [0, 1, 2], params: [["int", "a"], ["int", "b"]], body: nm => [If(bin("==", b, num(0)), [Ret(num(1))]), Ret(bin("*", a, call(nm, a, bin("-", b, num(1)))))], args: (L, r) => [int(2, 3 + L, r), int(2, [4, 6, 8][L], r)],
    wrongs: nm => [[[If(bin("==", b, num(0)), [Ret(a)]), Ret(bin("*", a, call(nm, a, bin("-", b, num(1)))))], "base-returns-a", "When b is 0 the method returns 1, not a."], [[If(bin("==", b, num(0)), [Ret(num(1))]), Ret(bin("+", a, call(nm, a, bin("-", b, num(1)))))], "multiply-read-as-add", "Each level multiplies by a."]] },
  { id: "multiply", levels: [0, 1, 2], params: [["int", "a"], ["int", "b"]], body: nm => [If(bin("==", b, num(0)), [Ret(num(0))]), Ret(bin("+", a, call(nm, a, bin("-", b, num(1)))))], args: (L, r) => [int(2, 9, r), int(3, [5, 8, 12][L], r)],
    wrongs: nm => [[[If(bin("==", b, num(0)), [Ret(a)]), Ret(bin("+", a, call(nm, a, bin("-", b, num(1)))))], "base-returns-a", "When b is 0 the base case returns 0."], [[If(bin("==", b, num(0)), [Ret(num(0))]), Ret(bin("*", a, call(nm, a, bin("-", b, num(1)))))], "add-read-as-multiply", "Each level adds a; it does not multiply."]] },
  { id: "range-sum", levels: [0, 1, 2], params: [["int", "a"], ["int", "b"]], body: nm => [If(bin(">", a, b), [Ret(num(0))]), Ret(bin("+", a, call(nm, bin("+", a, num(1)), b)))], args: (L, r) => { const x = int(1, 6, r); return [x, x + int(2, [4, 7, 10][L], r)]; },
    wrongs: nm => [[[If(bin(">=", a, b), [Ret(num(0))]), Ret(bin("+", a, call(nm, bin("+", a, num(1)), b)))], "boundary-operator-confused", "The base case is a > b, so a == b still adds b."], [[If(bin(">", a, b), [Ret(a)]), Ret(bin("+", a, call(nm, bin("+", a, num(1)), b)))], "base-returns-a", "The base case returns 0."]] },
  { id: "gcd", levels: [1, 2], params: [["int", "a"], ["int", "b"]], body: nm => [If(bin("==", b, num(0)), [Ret(a)]), Ret(call(nm, b, bin("%", a, b)))], args: (L, r) => { const g = int(2, 9, r); return [g * int(3, 17, r), g * int(2, 11, r)]; },
    wrongs: nm => [[[If(bin("==", b, num(0)), [Ret(b)]), Ret(call(nm, b, bin("%", a, b)))], "returns-wrong-parameter", "When b is 0, the answer is a."], [[If(bin("==", b, num(0)), [Ret(a)]), Ret(call(nm, a, bin("%", a, b)))], "arguments-not-rotated", "The new call is (b, a % b): b moves to the first position."]] },
  { id: "fast-power", levels: [2], params: [["int", "a"], ["int", "b"]], body: nm => [If(bin("==", b, num(0)), [Ret(num(1))]), If(bin("==", bin("%", b, num(2)), num(0)), [Decl("int", "h", call(nm, a, bin("/", b, num(2)))), Ret(bin("*", v("h"), v("h")))]), Ret(bin("*", a, call(nm, a, bin("-", b, num(1)))))], args: (L, r) => [int(2, 3, r), int(5, 15, r)],
    wrongs: nm => [[[If(bin("==", b, num(0)), [Ret(num(1))]), If(bin("==", bin("%", b, num(2)), num(0)), [Decl("int", "h", call(nm, a, bin("/", b, num(2)))), Ret(bin("*", num(2), v("h")))]), Ret(bin("*", a, call(nm, a, bin("-", b, num(1)))))], "square-as-double", "h * h squares the half result; it does not double it."]] },
];
export const twoParameter = { id: "two-parameter", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], T = pick(TWO.filter(x => x.levels.includes(L)), r), name = pick(NAMES.ret, r);
  const prog = program([method(name, "int", T.params, T.body(name))], name), args = T.args(L, r), res = exec(prog, name, args);
  if (res.calls < 3) reject("short");
  const ask = pick(L === 0 ? ["value", "calls"] : ["value", "calls", "baseArgs"], r), ct = `${name}(${args.join(", ")})`;
  const common = { r, difficulty: d, family: "two-parameter", prog, callNote: `call: ${ct}`, trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `two-parameter:${T.id}:${ask}`, data: { args } };
  const jvm = { method: name, call: ct };
  if (ask === "value") return Q({ ...common, prompt: `What does ${ct} return?`, answer: res.value,
    distractors: [...T.wrongs(name).map(([body, mis, why]) => { const w = run(program([method(name, "int", T.params, body)], name), name, args, { maxDepth: 300 }); return ok(w) && { value: w.value, mis, why }; }).filter(Boolean),
      { value: res.log[1]?.ret, mis: "one-level-short", why: `That is what the second call returns; the first call still applies its own step.` }, { value: res.value + (T.id === "gcd" ? args[1] : 1), mis: "off-by-one", why: "Retrace the return values from the base case up." }],
    explanation: `Calls: ${fmtList(res.log.map(e => `${name}(${e.args.join(", ")})`))}. Returns from the base up: ${fmtList(res.returns.map(x => x.value))}.`, jvm: { ...jvm, observe: "ret" } });
  if (ask === "calls") return Q({ ...common, prompt: `How many calls to ${name} are made for ${ct}, including the first?`, answer: res.calls,
    distractors: [{ value: res.calls - 1, mis: "base-call-not-counted", why: "The base-case call counts too." }, { value: res.calls + 1, mis: "extra-call-after-base", why: "No call happens after the base case." }, { value: res.value, mis: "result-as-call-count", why: "The returned value is not the number of calls." }, { value: args[1], mis: "parameter-as-call-count", why: "Count the calls actually made." }],
    explanation: `${fmtList(res.log.map(e => `${name}(${e.args.join(", ")})`))}: ${res.calls} calls.`, jvm: { ...jvm, observe: "calls" } });
  const last = res.log.at(-1).args, prev = res.log.at(-2).args;
  return Q({ ...common, prompt: `What are the arguments of the call that reaches the base case, starting from ${ct}?`, answer: `${name}(${last.join(", ")})`,
    distractors: [{ value: `${name}(${prev.join(", ")})`, mis: "base-call-not-counted", why: "That call still recurses; the base condition is false there." }, { value: `${name}(${args[0]}, 0)`, mis: "first-parameter-unchanged", why: "Track how each argument changes in every call." }, { value: `${name}(0, ${args[1]})`, mis: "wrong-parameter-moves", why: "Check which parameter the recursive call changes." }, { value: `${name}(${last[1]}, ${last[0]})`, mis: "parameters-swapped", why: "Keep the parameter order." }],
    explanation: `Calls: ${fmtList(res.log.map(e => `${name}(${e.args.join(", ")})`))}.`, jvm: { ...jvm, observe: "lastCall", name } });
} };

// ---- conditional returns ----
const CR = [
  { id: "sum-of-evens", levels: [0, 1, 2], c: bin("==", bin("%", n, num(2)), num(0)), t: f => bin("+", n, f), e: f => f },
  { id: "count-multiples", levels: [0, 1, 2], k: true, c: k => bin("==", bin("%", n, num(k)), num(0)), t: f => bin("+", num(1), f), e: f => f },
  { id: "sum-of-odds", levels: [0, 1], c: bin("!=", bin("%", n, num(2)), num(0)), t: f => bin("+", n, f), e: f => f },
  { id: "add-or-subtract", levels: [1, 2], c: bin("==", bin("%", n, num(2)), num(0)), t: f => bin("+", f, n), e: f => bin("-", f, n) },
  { id: "large-small-weights", levels: [2], k: true, c: k => bin(">", n, num(k)), t: f => bin("+", f, num(2)), e: f => bin("+", f, num(1)) },
];
export const conditionalReturn = { id: "conditional-return", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], C = pick(CR.filter(x => x.levels.includes(L)), r), name = pick(NAMES.ret, r), k = int(3, 4, r), cond = C.k ? C.c(k) : C.c;
  const baseVal = L === 0 ? 0 : int(0, 3, r), rc = call(name, bin("-", n, num(1)));
  const mk = (cnd, t, e) => program([method(name, "int", [["int", "n"]], [If(bin("==", n, num(0)), [Ret(num(baseVal))]), If(cnd, [Ret(t(rc))]), Ret(e(rc))])], name);
  const prog = mk(cond, C.t, C.e), start = int(4, [7, 10, 13][L], r), res = exec(prog, name, [start]);
  const always = run(mk(bin("==", num(0), num(0)), C.t, C.e), name, [start]), inverted = run(mk({ k: "not", a: cond }, C.t, C.e), name, [start]);
  const ask = pick(["value", "value", "inner"], r);
  const common = { r, difficulty: d, family: "conditional-return", prog, callNote: `call: ${name}(${start})`, trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `conditional-return:${C.id}:${ask}`, data: { start } };
  if (ask === "value") return Q({ ...common, prompt: `What does ${name}(${start}) return?`, answer: res.value,
    distractors: [ok(always) && { value: always.value, mis: "condition-ignored", why: "Only values that satisfy the if-condition take the first return." }, ok(inverted) && { value: inverted.value, mis: "condition-inverted", why: "Re-check which values make the condition true." }, { value: res.value - baseVal + (baseVal === 0 ? 1 : 0), mis: "base-value-misread", why: `The base case returns ${baseVal}.` }, { value: res.log[1]?.ret, mis: "one-level-short", why: `That is ${name}(${start - 1}); the first call adds its own contribution.` }].filter(Boolean),
    explanation: `Working up from ${name}(0) = ${baseVal}: ${fmtList(res.returns.map(x => `${name}(${x.args[0]}) = ${x.value}`))}.`, jvm: { method: name, call: `${name}(${start})`, observe: "ret" } });
  const target = pick(res.returns.slice(1, -1), r);
  return Q({ ...common, prompt: `While ${name}(${start}) is evaluated, what does the call ${name}(${target.args[0]}) return?`, answer: target.value,
    distractors: [{ value: res.value, mis: "inner-equals-outer", why: "That is the final result of the first call." }, ...res.returns.filter(x => x.value !== target.value).slice(0, 3).map(x => ({ value: x.value, mis: "wrong-level", why: `That is ${name}(${x.args[0]}).` }))],
    explanation: `${name}(${target.args[0]}) only depends on values ${target.args[0]} down to 0: it returns ${target.value}.`, jvm: { method: name, call: `${name}(${start})`, observe: "retOf", arg: String(target.args[0]) } });
} };

// ---- nested return expressions ----
const NE = [
  { id: "double-plus-one", levels: [1, 2], e: f => bin("+", bin("*", num(2), f), num(1)), wrong: f => bin("*", num(2), bin("+", f, num(1))), base: 0 },
  { id: "alternating", levels: [1, 2], e: f => bin("-", n, f), wrong: f => bin("-", f, n), base: 0 },
  { id: "odd-squares", levels: [1, 2], e: f => bin("-", bin("+", f, bin("*", num(2), n)), num(1)), wrong: f => bin("+", f, bin("*", num(2), n)), base: 0 },
  { id: "triple-minus-n", levels: [2], e: f => bin("-", bin("*", num(3), f), n), wrong: f => bin("*", num(3), bin("-", f, n)), base: 1 },
  { id: "square-plus", levels: [2], e: f => bin("+", bin("*", f, num(2)), bin("%", n, num(3))), wrong: f => bin("*", bin("+", f, bin("%", n, num(3))), num(2)), base: 1 },
];
export const nestedReturn = { id: "nested-return", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], N = pick(NE.filter(x => x.levels.includes(L)), r), name = pick(NAMES.ret, r);
  const mk = (e, base = N.base) => program([method(name, "int", [["int", "n"]], [If(bin("==", n, num(0)), [Ret(num(base))]), Ret(e(call(name, bin("-", n, num(1)))))])], name);
  const prog = mk(N.e), start = int(3, L === 1 ? 6 : 9, r), res = exec(prog, name, [start]);
  const wrong = run(mk(N.wrong), name, [start]), topOnly = run(program([method(name, "int", [["int", "n"]], [Ret(N.e(num(N.base)))])], name), name, [start]), base1 = run(mk(N.e, N.base + 1), name, [start]);
  return Q({ r, difficulty: d, family: "nested-return", prog, callNote: `call: ${name}(${start})`, prompt: `What does ${name}(${start}) return?`, answer: res.value,
    distractors: [ok(wrong) && { value: wrong.value, mis: "precedence-misapplied", why: "Apply operator precedence: multiplication before addition/subtraction, using the returned value." }, ok(topOnly) && { value: topOnly.value, mis: "recursion-not-unwound", why: "The recursive call returns a value that must itself be computed, level by level." }, ok(base1) && { value: base1.value, mis: "base-value-misread", why: `The base case returns ${N.base}.` }, { value: res.returns.at(-2)?.value, mis: "one-level-short", why: `That is ${name}(${start - 1}).` }].filter(Boolean),
    explanation: `Start at ${name}(0) = ${N.base} and apply the expression on the way back: ${fmtList(res.returns.map(x => `${name}(${x.args[0]}) = ${x.value}`))}.`,
    trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `nested-return:${N.id}:value`, data: { start }, jvm: { method: name, call: `${name}(${start})`, observe: "ret" } });
} };

// ---- work before and after the call (prints + returns) ----
export const workAroundCall = { id: "work-around-call", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(NAMES.ret, r), variant = pick(L === 1 ? ["pre-arg", "post-result"] : ["pre-arg", "post-result", "both"], r), k = int(1, 3, r);
  const pre = variant !== "post-result" ? [Print(bin("+", n, str(" ")))] : [], post = variant !== "pre-arg" ? [Print(bin("+", v("r"), str(" ")))] : [];
  const body = (p, q) => [If(bin("==", n, num(0)), [Ret(num(k))]), ...p, Decl("int", "r", bin("+", call(name, bin("-", n, num(1))), n)), ...q, Ret(v("r"))];
  const prog = program([method(name, "int", [["int", "n"]], body(pre, post))], name), start = int(3, L === 1 ? 5 : 6, r), res = exec(prog, name, [start]);
  const swapped = run(program([method(name, "int", [["int", "n"]], body(post.map(() => Print(bin("+", n, str(" ")))), pre.length && variant === "pre-arg" ? [Print(bin("+", n, str(" ")))] : pre.map(() => Print(bin("+", v("r"), str(" "))))))], name), name, [start]);
  const ask = pick(["output", "value"], r);
  const common = { r, difficulty: d, family: "work-around-call", prog, callNote: `call: ${name}(${start})`, trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `work-around-call:${variant}:${ask}`, data: { start } };
  const outRev = res.out.trim().split(" ").reverse().join(" ") + " ";
  if (ask === "output") return Q({ ...common, prompt: `What is printed by ${name}(${start})?`, answer: res.out.trim(),
    distractors: [{ value: outRev.trim(), mis: "unwind-order-reversed", why: "Statements before the call run on the way down; statements after the call run on the way back up." }, swapped.out && { value: swapped.out.trim(), mis: "pre-post-confused", why: "Look at whether each print is above or below the recursive call." }, { value: res.out.trim().split(" ").slice(0, -1).join(" "), mis: "first-call-output-missed", why: `The first call ${name}(${start}) prints too.` }, { value: res.returns.map(x => x.value).join(" "), mis: "prints-return-values", why: "Only what reaches System.out.print appears." }].filter(Boolean),
    explanation: `${variant === "post-result" ? "Each call prints r after its recursive call returns, so the deepest call prints first" : variant === "pre-arg" ? "Each call prints n before recursing, so values appear in call order" : "n prints on the way down; r prints on the way back up"}: ${res.out.trim()}.`, jvm: { method: name, call: `${name}(${start})`, observe: "out", trim: true } });
  return Q({ ...common, prompt: `What value does ${name}(${start}) return? (Ignore what it prints.)`, answer: res.value,
    distractors: [{ value: res.value - k, mis: "base-value-ignored", why: `The base case returns ${k}, which is included in every r.` }, { value: res.returns.at(-2)?.value, mis: "one-level-short", why: `That is the value from ${name}(${start - 1}).` }, { value: Number(res.out.trim().split(" ").at(-1)), mis: "last-printed-is-returned", why: "Printing and returning are different; look at the return statement." }, { value: res.value + start, mis: "double-counted", why: "n is added once per call." }].filter(x => x.value !== undefined && !Number.isNaN(x.value)),
    explanation: `r = ${name}(n − 1) + n, starting from ${k}: ${fmtList(res.returns.map(x => x.value))}.`, jvm: { method: name, call: `${name}(${start})`, observe: "ret" } });
} };

// ---- multi-call returns (beyond the legacy fibLike) ----
const MC = [
  { id: "fib-zero-one", b0: 0, b1: 1, e: (f1, f2) => bin("+", f1, f2) },
  { id: "lucas", b0: 2, b1: 1, e: (f1, f2) => bin("+", f1, f2) },
  { id: "weighted", b0: 1, b1: 1, e: (f1, f2) => bin("+", f1, bin("*", num(2), f2)) },
  { id: "difference", b0: 1, b1: 3, e: (f1, f2) => bin("-", f1, f2) },
  { id: "plus-one", b0: 0, b1: 0, e: (f1, f2) => bin("+", bin("+", f1, f2), num(1)) },
];
export const multiCallReturn = { id: "multi-call-return", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], M = pick(MC, r), name = pick(NAMES.ret, r);
  const mk = (b0, b1, e) => program([method(name, "int", [["int", "n"]], [If(bin("==", n, num(0)), [Ret(num(b0))]), If(bin("==", n, num(1)), [Ret(num(b1))]), Ret(e(call(name, bin("-", n, num(1))), call(name, bin("-", n, num(2)))))])], name);
  const prog = mk(M.b0, M.b1, M.e), start = int(4, L === 1 ? 6 : 8, r), res = exec(prog, name, [start]);
  const swapB = run(mk(M.b1, M.b0, M.e), name, [start]), lin = run(program([method(name, "int", [["int", "n"]], [If(bin("==", n, num(0)), [Ret(num(M.b0))]), If(bin("==", n, num(1)), [Ret(num(M.b1))]), Ret(M.e(call(name, bin("-", n, num(1))), num(M.b1)))])], name), name, [start]);
  const ask = pick(["value", "inner"], r);
  const vals = []; for (let i = 0; i <= start; i++) vals.push(run(prog, name, [i]).value);
  const common = { r, difficulty: d, family: "multi-call-return", prog, callNote: `call: ${name}(${start})`, trace: [`values: ${vals.map((x, i) => `${name}(${i}) = ${x}`).join(", ")}`], callCount: res.calls, callDepth: res.maxDepth, reasoning: `multi-call-return:${M.id}:${ask}`, data: { start } };
  if (ask === "value") return Q({ ...common, prompt: `What does ${name}(${start}) return?`, answer: res.value,
    distractors: [ok(swapB) && { value: swapB.value, mis: "base-cases-swapped", why: `${name}(0) returns ${M.b0} and ${name}(1) returns ${M.b1}.` }, ok(lin) && { value: lin.value, mis: "second-call-treated-as-base", why: `${name}(n − 2) is a full recursive call too.` }, { value: vals[start - 1], mis: "one-level-short", why: `That is ${name}(${start - 1}).` }, { value: res.calls, mis: "calls-as-value", why: "That is the number of calls, not the returned value." }].filter(Boolean),
    explanation: `Build the values bottom-up: ${vals.map((x, i) => `${name}(${i}) = ${x}`).join(", ")}.`, jvm: { method: name, call: `${name}(${start})`, observe: "ret" } });
  const k = int(2, start - 1, r);
  return Q({ ...common, prompt: `During ${name}(${start}), every call to ${name}(${k}) returns the same value. What is it?`, answer: vals[k],
    distractors: [{ value: vals[k - 1], mis: "wrong-level", why: `That is ${name}(${k - 1}).` }, { value: vals[k + 1], mis: "wrong-level", why: `That is ${name}(${k + 1}).` }, { value: res.log.filter(e => e.args[0] === k).length, mis: "count-as-value", why: "That is how many times it is called." }, ok(swapB) && { value: run(mk(M.b1, M.b0, M.e), name, [k]).value, mis: "base-cases-swapped", why: "Check which base case returns which value." }].filter(Boolean),
    explanation: `${name}(${k}) = ${vals[k]}, computed from ${name}(${k - 1}) = ${vals[k - 1]} and ${name}(${k - 2}) = ${vals[k - 2]}.`, jvm: { method: name, call: `${name}(${start})`, observe: "retOf", arg: String(k) } });
} };

// ---- accumulator parameter vs. unwinding ----
const ACC = [
  { id: "sum-acc", init: 0, upd: (n, acc) => bin("+", acc, n), unwind: f => bin("+", n, f), ub: 0 },
  { id: "product-acc", init: 1, upd: (n, acc) => bin("*", acc, n), unwind: f => bin("*", n, f), ub: 1 },
  { id: "count-even-acc", init: 0, upd: (n, acc) => bin("+", acc, { k: "tern", c: bin("==", bin("%", n, num(2)), num(0)), a: num(1), b: num(0) }), unwind: null },
  { id: "digits-reversed-acc", init: 0, upd: (n, acc) => bin("+", bin("*", acc, num(10)), bin("%", n, num(10))), step: () => bin("/", n, num(10)), unwind: null },
];
export const accumulatorParam = { id: "accumulator-parameter", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], A = pick(ACC.filter(x => L === 0 ? x.id === "sum-acc" || x.id === "product-acc" : L === 2 || x.id !== "digits-reversed-acc"), r), name = pick(NAMES.ret, r), acc = v("acc"), step = A.step ? A.step() : bin("-", n, num(1));
  const prog = program([method(name, "int", [["int", "n"], ["int", "acc"]], [If(bin("==", n, num(0)), [Ret(acc)]), Ret(call(name, step, A.upd(n, acc)))])], name);
  const start = A.id === "digits-reversed-acc" ? int(1000, 99999, r) : A.id === "product-acc" ? int(3, 7, r) : int(4, 10, r), init = A.init === 0 && L === 2 && A.id === "sum-acc" ? int(1, 9, r) : A.init;
  const res = exec(prog, name, [start, init]), ask = pick(["value", "accAt"], r);
  const common = { r, difficulty: d, family: "accumulator-parameter", prog, callNote: `call: ${name}(${start}, ${init})`, trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `accumulator-parameter:${A.id}:${ask}`, data: { start, init } };
  const accs = res.log.map(e => e.args[1]);
  if (ask === "value") return Q({ ...common, prompt: `What does ${name}(${start}, ${init}) return?`, answer: res.value,
    distractors: [{ value: init, mis: "acc-not-updated", why: "Each call passes an updated acc to the next call." }, { value: accs.at(-2), mis: "one-update-missing", why: "The last update happens in the call just before the base case and is passed down." }, { value: res.value - init + (init ? 0 : 1), mis: "initial-acc-ignored", why: `acc starts at ${init}.` }, A.id === "digits-reversed-acc" && { value: start, mis: "reversal-missed", why: "Each step moves the last digit of n onto the end of acc." }, { value: accs[1], mis: "first-update-only", why: "acc keeps changing in every call." }].filter(Boolean),
    explanation: `acc takes the values ${fmtList(accs)}; the base case returns the final acc, and every caller passes it straight back up.`, jvm: { method: name, call: `${name}(${start}, ${init})`, observe: "ret" } });
  const i = int(1, Math.min(res.log.length - 2, 4), r);
  return Q({ ...common, prompt: `In ${name}(${start}, ${init}), what is acc in call number ${i + 1} (the first call is call 1)?`, answer: accs[i],
    distractors: [{ value: accs[i - 1], mis: "acc-off-by-one-call", why: "acc is updated in the argument list before the next call starts." }, { value: accs[i + 1], mis: "acc-off-by-one-call", why: `That is acc in call ${i + 2}.` }, { value: res.value, mis: "final-acc-everywhere", why: "acc grows call by call; it only reaches the final value at the base case." }, { value: init, mis: "acc-not-updated", why: "acc changes in every call." }],
    explanation: `acc per call: ${fmtList(accs)}.`, jvm: { method: name, call: `${name}(${start}, ${init})`, observe: "argAt", call_index: i, param: 1 } });
} };
export default [digitRecursion, twoParameter, conditionalReturn, nestedReturn, workAroundCall, multiCallReturn, accumulatorParam];
