import { num, str, bool, v, bin, call, If, Ret, Do, Print, Decl, method, program, run, len, sub, eq, idx, alen, mmax, not, renderJava, renderValue } from "./ir.js?v=compositional-v1";
import { makeQuestion, reject, int, pick, LEVEL, WORDS, quote, shuffle, traceWithError } from "./core.js?v=compositional-v1";
const MODE = "debug", TITLE = "Recursive Debugging";
const n = v("n"), s = v("s"), a = v("a"), i = v("i"), b = v("b"), e = v("e"), lo = v("lo"), hi = v("hi"), t = v("t"), mid = v("mid");
const Q = o => makeQuestion({ mode: MODE, modeTitle: TITLE, ...o });
const first = sub(s, num(0), num(1)), rest = sub(s, num(1));

/* Reference programs. knobs: { knob: [options...] } with option 0 correct.
   Each option: [label, irFragment | value, misconceptionId, studentWhy]. build(cfg) returns the method body. */
const P = [
  { id: "sum-to", levels: [0, 1, 2], name: "sumTo", ret: "int", params: [["int", "n"]], intent: "returns 1 + 2 + … + n (and 0 when n is 0)",
    spec: ([x]) => x * (x + 1) / 2, inputs: r => [int(3, 8, r)], tests: [[0], [1], [2], [5], [7]],
    knobs: { base: [true, false], cond: [bin("==", n, num(0)), bin("==", n, num(1)), bin("<", n, num(0))], val: [num(0), num(1), n], arg: [bin("-", n, num(1)), n, bin("+", n, num(1)), bin("-", n, num(2))], comb: [R => bin("+", n, R), R => bin("*", n, R), R => R, R => bin("+", R, num(1))] },
    build: (c, nm) => [...(c.base ? [If(c.cond, [Ret(c.val)])] : []), Ret(c.comb(call(nm, c.arg)))] },
  { id: "factorial", levels: [0, 1, 2], name: "factorial", ret: "int", params: [["int", "n"]], intent: "returns n! = 1 × 2 × … × n (and 1 when n is 0)",
    spec: ([x]) => { let p = 1; for (let k = 2; k <= x; k++) p *= k; return p; }, inputs: r => [int(3, 7, r)], tests: [[0], [1], [3], [5], [6]],
    knobs: { base: [true, false], cond: [bin("<=", n, num(1)), bin("==", n, num(1)), bin("<", n, num(1))], val: [num(1), num(0), n], arg: [bin("-", n, num(1)), n, bin("+", n, num(1))], comb: [R => bin("*", n, R), R => bin("+", n, R), R => R] },
    build: (c, nm) => [...(c.base ? [If(c.cond, [Ret(c.val)])] : []), Ret(c.comb(call(nm, c.arg)))] },
  { id: "power", levels: [0, 1, 2], name: "power", ret: "int", params: [["int", "b"], ["int", "e"]], intent: "returns b raised to the power e (e ≥ 0)",
    spec: ([x, y]) => x ** y, inputs: r => [int(2, 4, r), int(2, 5, r)], tests: [[2, 0], [2, 1], [3, 2], [2, 5], [5, 3]],
    knobs: { base: [true, false], cond: [bin("==", e, num(0)), bin("==", e, num(1)), bin("<", e, num(0))], val: [num(1), b, num(0)], arg: [bin("-", e, num(1)), e, bin("+", e, num(1))], comb: [R => bin("*", b, R), R => bin("+", b, R), R => bin("*", e, R)] },
    build: (c, nm) => [...(c.base ? [If(c.cond, [Ret(c.val)])] : []), Ret(c.comb(call(nm, b, c.arg)))] },
  { id: "count-digits", levels: [0, 1, 2], name: "countDigits", ret: "int", params: [["int", "n"]], intent: "returns how many digits n has (n ≥ 0)",
    spec: ([x]) => String(x).length, inputs: r => [int(100, 99999, r)], tests: [[0], [7], [10], [345], [90210]],
    knobs: { base: [true, false], cond: [bin("<", n, num(10)), bin("==", n, num(0)), bin("<", n, num(9))], val: [num(1), num(0), n], arg: [bin("/", n, num(10)), bin("%", n, num(10)), bin("-", n, num(10)), n], comb: [R => bin("+", num(1), R), R => R, R => bin("+", bin("%", n, num(10)), R)] },
    build: (c, nm) => [...(c.base ? [If(c.cond, [Ret(c.val)])] : []), Ret(c.comb(call(nm, c.arg)))] },
  { id: "count-down", levels: [0, 1, 2], name: "countDown", ret: "void", params: [["int", "n"]], intent: "prints n, n − 1, …, 1, each followed by a space", out: true,
    spec: ([x]) => Array.from({ length: x }, (_, k) => `${x - k} `).join(""), inputs: r => [int(3, 6, r)], tests: [[0], [1], [3], [5]],
    knobs: { base: [true, false], cond: [bin("==", n, num(0)), bin("<", n, num(0)), bin("==", n, num(1))], arg: [bin("-", n, num(1)), n, bin("+", n, num(1))], order: ["before", "after"] },
    build: (c, nm) => { const p = Print(bin("+", n, str(" "))), r = Do(call(nm, c.arg)); return [...(c.base ? [If(c.cond, [Ret()])] : []), ...(c.order === "before" ? [p, r] : [r, p])]; } },
  { id: "digit-sum", levels: [1, 2], name: "digitSum", ret: "int", params: [["int", "n"]], intent: "returns the sum of the digits of n (n ≥ 0)",
    spec: ([x]) => String(x).split("").reduce((p, d) => p + +d, 0), inputs: r => [int(100, 99999, r)], tests: [[0], [8], [19], [405], [99999]],
    knobs: { cond: [bin("<", n, num(10)), bin("<", n, num(1)), bin("==", n, num(10))], val: [n, num(0), num(1)], arg: [bin("/", n, num(10)), bin("%", n, num(10)), bin("-", n, num(1))], comb: [R => bin("+", bin("%", n, num(10)), R), R => bin("+", bin("/", n, num(10)), R), R => bin("+", num(1), R)] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, c.arg)))] },
  { id: "reverse", levels: [1, 2], name: "reverse", ret: "String", params: [["String", "s"]], intent: "returns s with its characters in reverse order", str: true,
    spec: ([x]) => [...x].reverse().join(""), inputs: r => [pick(WORDS.Intermediate, r)], tests: [[""], ["A"], ["AB"], ["CODE"], ["LEMON"]],
    knobs: { cond: [bin("<=", len(s), num(1)), bin("==", len(s), num(1)), bin("<=", len(s), num(0))], val: [s, str(""), first], arg: [rest, sub(s, num(0)), sub(s, num(2)), sub(s, num(0), bin("-", len(s), num(1)))], comb: [R => bin("+", R, first), R => bin("+", first, R), R => R] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, c.arg)))] },
  { id: "array-sum", levels: [1, 2], name: "arraySum", ret: "int", params: [["int[]", "a"], ["int", "i"]], intent: "returns the sum of a[i], a[i + 1], …, a[a.length − 1]", arr: true,
    spec: ([A, k]) => A.slice(k).reduce((p, x) => p + x, 0), inputs: r => [Array.from({ length: int(4, 6, r) }, () => int(-2, 9, r)), 0], tests: [[[], 0], [[4], 0], [[1, 2, 3], 0], [[5, -2, 7, 1], 0], [[3, 1, 4, 1, 5], 2]],
    knobs: { cond: [bin("==", i, alen(a)), bin("==", i, bin("-", alen(a), num(1))), bin(">", i, alen(a))], val: [num(0), idx(a, i), num(1)], arg: [bin("+", i, num(1)), i, bin("+", i, num(2))], comb: [R => bin("+", idx(a, i), R), R => R, R => bin("+", i, R)] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, a, c.arg)))] },
  { id: "array-max", levels: [1, 2], name: "arrayMax", ret: "int", params: [["int[]", "a"], ["int", "i"]], intent: "returns the largest value among a[i] … a[a.length − 1] (the array is not empty)", arr: true,
    spec: ([A, k]) => Math.max(...A.slice(k)), inputs: r => [Array.from({ length: int(4, 6, r) }, () => int(-9, 9, r)), 0], tests: [[[4], 0], [[-3, -7, -1], 0], [[2, 9, 4], 0], [[-5, -2], 0], [[1, 8, 3, 9, 2], 1]],
    knobs: { cond: [bin("==", i, bin("-", alen(a), num(1))), bin("==", i, alen(a)), bin("==", i, num(0))], val: [idx(a, i), num(0), num(-1)], arg: [bin("+", i, num(1)), i, bin("-", i, num(1))], comb: [R => mmax(idx(a, i), R), R => { const x = { k: "math", fn: "min", a: idx(a, i), b: R }; return x; }, R => R] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.c