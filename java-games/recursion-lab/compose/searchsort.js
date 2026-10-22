import { num, v, bin, call, If, Ret, Do, Decl, ASet, method, program, run, idx, alen, tern, renderJava } from "./ir.js?v=compositional-v1";
import { makeQuestion, reject, int, pick, LEVEL, fmtList, exec, traceLines, shuffle } from "./core.js?v=compositional-v1";
const MODE = "searchsort", TITLE = "Recursive Search & Sort";
const a = v("a"), i = v("i"), t = v("t"), lo = v("low"), hi = v("high"), mid = v("mid"), n = v("n"), k = v("k"), m = v("m");
const Q = o => makeQuestion({ mode: MODE, modeTitle: TITLE, ...o });
const arr = xs => `{${xs.join(", ")}}`, note = (A, c) => `int[] a = ${arr(A)};  call: ${c}`;
const sortedArr = (len, r) => { const A = []; let x = int(0, 4, r); for (let j = 0; j < len; j++) { x += int(1, 5, r); A.push(x); } return A; };
const distinctArr = (len, r, max = 40) => { const s = new Set(); while (s.size < len) s.add(int(1, max, r)); return [...s]; };
const unsorted = (len, r) => { let A; do A = Array.from({ length: len }, () => int(1, 20, r)); while (A.every((x, j) => !j || A[j - 1] <= x)); return A; };

// ---- recursive linear search ----
export const linearSearch = { id: "linear-search", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(["find", "search", "locate", "indexOf"], r), variant = pick(["first", "last", "count-checks"], r);
  const A = Array.from({ length: int(5, [6, 8, 9][L], r) }, () => int(0, 9, r)), absent = r() < 0.3, T = absent ? 10 + int(0, 9, r) : pick(A, r);
  const body = variant === "last" ? [If(bin("<", i, num(0)), [Ret(num(-1))]), If(bin("==", idx(a, i), t), [Ret(i)]), Ret(call(name, a, bin("-", i, num(1)), t))]
    : [If(bin(">=", i, alen(a)), [Ret(num(-1))]), If(bin("==", idx(a, i), t), [Ret(i)]), Ret(call(name, a, bin("+", i, num(1)), t))];
  const prog = program([method(name, "int", [["int[]", "a"], ["int", "i"], ["int", "t"]], body)], name), st = variant === "last" ? A.length - 1 : 0;
  const res = exec(prog, name, [[...A], st, T]), ct = `${name}(a, ${st}, ${T})`;
  const common = { r, difficulty: d, family: "linear-search", prog, callNote: note(A, ct), trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, data: { array: A, target: T } };
  const jvm = { method: name, setup: `int[] a = ${arr(A)};`, call: `${name}(a, ${st}, ${T})` };
  if (variant === "count-checks") return Q({ ...common, prompt: `How many calls to ${name} are made by ${ct}, including the first?`, answer: res.calls, reasoning: `linear-search:calls:${absent ? "absent" : "present"}`,
    distractors: [{ value: A.length, mis: "always-scans-everything", why: absent ? "The call with i == a.length also happens." : "The search returns as soon as it finds the target." }, { value: res.calls - 1, mis: "base-call-not-counted", why: "Count every call, including the first." }, { value: A.length + 1, mis: "always-scans-everything", why: "The search stops at the first match." }, { value: absent ? A.length - 1 : res.value, mis: "index-as-calls", why: "Calls are counted from 1, indexes from 0." }, { value: res.calls + 1, mis: "extra-call", why: "No call follows a return." }],
    explanation: absent ? `${T} is not in a, so every index is checked and the call with i = ${A.length} returns -1: ${res.calls} calls.` : `The first ${T} is at index ${res.value}; calls for i = 0 … ${res.value}: ${res.calls} calls.`, jvm: { ...jvm, observe: "calls" } });
  return Q({ ...common, prompt: `What does ${ct} return?`, answer: res.value, reasoning: `linear-search:${variant}:${absent ? "absent" : "present"}`,
    distractors: [{ value: variant === "last" ? A.indexOf(T) : A.lastIndexOf(T), mis: variant === "last" ? "first-match-instead-of-last" : "last-match-instead-of-first", why: `The search starts at index ${st} and returns the first match it reaches.` }, { value: absent ? A.length : -1, mis: absent ? "returns-length-when-absent" : "assumes-absent", why: absent ? "The base case returns -1." : `${T} is in the array.` }, { value: T, mis: "value-for-index", why: "The method returns an index, not the value." }, { value: absent ? 0 : res.value + 1, mis: "one-based-index", why: "Indexes start at 0." }, { value: absent ? A.length - 1 : res.value - 1, mis: "off-by-one-index", why: "Return the index where a[i] == t." }],
    explanation: absent ? `${T} does not appear, so the recursion reaches the base case and returns -1.` : `Checking from index ${st} ${variant === "last" ? "downward" : "upward"}, the first match is at index ${res.value}.`, jvm: { ...jvm, observe: "ret" } });
} };

// ---- binary search: mids, ranges, calls ----
const bsBody = (nm, midExpr) => [If(bin(">", lo, hi), [Ret(num(-1))]), Decl("int", "mid", midExpr), If(bin("==", idx(a, mid), t), [Ret(mid)]), If(bin("<", t, idx(a, mid)), [Ret(call(nm, a, lo, bin("-", mid, num(1)), t))]), Ret(call(nm, a, bin("+", mid, num(1)), hi, t))];
const MIDS = { down: bin("/", bin("+", lo, hi), num(2)), up: bin("/", bin("+", bin("+", lo, hi), num(1)), num(2)), safe: bin("+", lo, bin("/", bin("-", hi, lo), num(2))) };
export const binarySearchTrace = { id: "binary-search-trace", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], nm = "binarySearch", midKind = L === 0 ? "down" : pick(L === 1 ? ["down", "safe"] : ["down", "up", "safe"], r);
  const A = sortedArr(int(L === 0 ? 6 : 8, [8, 12, 16][L], r), r), absent = r() < 0.4;
  const T = absent ? (() => { let x; do x = int(A[0] - 2, A.at(-1) + 3, r); while (A.includes(x)); return x; })() : pick(A, r);
  const mk = me => program([method(nm, "int", [["int[]", "a"], ["int", "low"], ["int", "high"], ["int", "t"]], bsBody(nm, me))], nm);
  const prog = mk(MIDS[midKind]), res = exec(prog, nm, [[...A], 0, A.length - 1, T]), ct = `${nm}(a, 0, ${A.length - 1}, ${T})`;
  const mids = res.log.filter(e => e.args[1] <= e.args[2]).map(e => midKind === "up" ? Math.floor((e.args[1] + e.args[2] + 1) / 2) : Math.floor((e.args[1] + e.args[2]) / 2));
  if (mids.length < 2) reject("found immediately");
  const other = run(mk(midKind === "up" ? MIDS.down : MIDS.up), nm, [[...A], 0, A.length - 1, T]), otherMids = other.log.filter(e => e.args[1] <= e.args[2]).map(e => midKind === "up" ? Math.floor((e.args[1] + e.args[2]) / 2) : Math.floor((e.args[1] + e.args[2] + 1) / 2));
  const ask = pick(absent ? ["mids", "calls", "lastRange"] : ["mids", "calls", "mids"], r);
  const common = { r, difficulty: d, family: "binary-search-trace", prog, callNote: note(A, ct), trace: res.log.map(e => `call low=${e.args[1]}, high=${e.args[2]}`), callCount: res.calls, callDepth: res.maxDepth, reasoning: `binary-search-trace:${midKind}:${ask}:${absent ? "absent" : "present"}`, data: { array: A, target: T } };
  const jvm = { method: nm, setup: `int[] a = ${arr(A)};`, call: `${nm}(a, 0, ${A.length - 1}, ${T})` };
  if (ask === "mids") return Q({ ...common, prompt: `Which indexes are used as mid, in order, by ${ct}?`, answer: fmtList(mids),
    distractors: [{ value: fmtList(otherMids), mis: midKind === "up" ? "midpoint-rounded-down" : "midpoint-rounded-up", why: midKind === "up" 