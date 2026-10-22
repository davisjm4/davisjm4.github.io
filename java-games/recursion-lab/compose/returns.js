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
  { id: "range-sum", levels: [0, 1, 2], params: [["int", "a"], ["int", "b"]], body: nm => [If(bin(">", a, b), [Ret(num(0))]), Ret(bin("+", a, call(nm, bin("+", a, num(1)), b)))], args: (L, r) => { const x = int(1, 6, r); return [x, x + int(2, [4, 7, 10][L], r)