import { num, v, bin, call, If, Ret, Do, Decl, ASet, method, program, run, idx, alen, mmax, tern, not, renderValue } from "./ir.js?v=compositional-v1";
import { makeQuestion, reject, int, pick, LEVEL, NAMES, fmtList, exec, traceLines } from "./core.js?v=compositional-v1";
const MODE = "arrays", TITLE = "Arrays & Parameters";
const a = v("a"), i = v("i"), lo = v("lo"), hi = v("hi"), Q = o => makeQuestion({ mode: MODE, modeTitle: TITLE, ...o });
const arr = xs => `{${xs.join(", ")}}`, ok = res => !res.error;
const randArr = (len, lo_, hi_, r) => Array.from({ length: len }, () => int(lo_, hi_, r));
const runA = (prog, name, A, extra, opts) => { const copy = [...A]; const res = run(prog, name, [copy, ...extra], opts); res.array = copy; return res; };
const note = (A, c) => `int[] a = ${arr(A)};  call: ${c}`;
const jv = (A, name, extra, more = {}) => ({ method: name, setup: `int[] a = ${arr(A)};`, call: `${name}(a${extra.length ? ", " + extra.join(", ") : ""})`, ...more });

// ---- divide-in-half segment recursion ----
const SEG = [
  { id: "sum", levels: [1, 2], leaf: () => idx(a, lo), comb: (x, y) => bin("+", x, y), empty: true },
  { id: "max", levels: [1, 2], leaf: () => idx(a, lo), comb: (x, y) => mmax(x, y) },
  { id: "count-above", levels: [2], k: true, leaf: k => tern(bin(">", idx(a, lo), num(k)), num(1), num(0)), comb: (x, y) => bin("+", x, y) },
];
export const segmentRecursion = { id: "segment-recursion", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], S = pick(SEG.filter(x => x.levels.includes(L)), r), name = pick(NAMES.arr, r), k = int(1, 5, r), m = v("mid");
  const mk = (comb = S.comb) => program([method(name, "int", [["int[]", "a"], ["int", "lo"], ["int", "hi"]], [If(bin("==", lo, hi), [Ret(S.leaf(k))]), Decl("int", "mid", bin("/", bin("+", lo, hi), num(2))), Ret(comb(call(name, a, lo, m), call(name, a, bin("+", m, num(1)), hi)))])], name);
  const A = randArr(int(L === 1 ? 4 : 5, L === 1 ? 6 : 9, r), -4, 12, r), prog = mk(), res = runA(prog, name, A, [0, A.length - 1]); if (res.error) reject("seg err");
  const ask = pick(["value", "calls", "ranges"], r), ct = `${name}(a, 0, ${A.length - 1})`, leaves = res.log.filter(e => e.args[1] === e.args[2]).length;
  const common = { r, difficulty: d, family: "segment-recursion", prog, callNote: note(A, ct), trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `segment-recursion:${S.id}:${ask}`, data: { array: A } };
  if (ask === "value") { const left = runA(prog, name, A, [0, Math.floor((A.length - 1) / 2)]).value;
    return Q({ ...common, prompt: `What does ${ct} return?`, answer: res.value,
      distractors: [{ value: left, mis: "second-half-ignored", why: "Both halves are processed and their results combined." }, { value: S.id === "max" ? A[0] : res.value - A.at(-1), mis: S.id === "max" ? "first-element-only" : "last-element-missed", why: "The ranges cover every index from lo to hi." }, S.id === "sum" && { value: res.value + A[Math.floor((A.length - 1) / 2)], mis: "midpoint-counted-twice", why: "The halves are lo..mid and mid + 1..hi, so the midpoint is in only one half." }, S.id !== "sum" && { value: runA(mk((x, y) => bin("+", x, y)), name, A, [0, A.length - 1]).value, mis: "combine-misread-as-sum", why: "Look at how the two results are combined." }, { value: Math.min(...A), mis: "min-for-max", why: "Track what each call returns." }].filter(Boolean),
      explanation: `The range splits in half until single elements remain (${leaves} of them), and results are combined on the way back: ${res.value}.`, jvm: jv(A, name, [0, A.length - 1], { observe: "ret" }) }); }
  if (ask === "calls") return Q({ ...common, prompt: `How many calls to ${name} are made by ${ct}, including the first?`, answer: res.calls,
    distractors: [{ value: A.length, mis: "one-call-per-element", why: "Single-element ranges are leaves, but every split range is also a call." }, { value: res.maxDepth, mis: "depth-as-calls", why: "Depth is the longest chain; count every call in the tree." }, { value: res.calls - leaves, mis: "leaves-not-counted", why: "Base-case calls count too." }, { value: 2 * A.length, mis: "two-per-element", why: `A range of ${A.length} elements has exactly ${A.length - 1} splits.` }],
    explanation: `${A.length} single-element ranges plus ${A.length - 1} splitting calls = ${res.calls}.`, jvm: jv(A, name, [0, A.length - 1], { observe: "calls" }) });
  const kids = res.log.filter(e => e.depth === 2).map(e => `${e.args[1]}..${e.args[2]}`), mid = Math.floor((A.length - 1) / 2), last = A.length - 1;
  return Q({ ...common, prompt: `Which index ranges (lo..hi) do the two calls made directly by ${ct} receive?`, answer: kids.join(" and "),
    distractors: [{ value: `0..${mid - 1} and ${mid}..${last}`, mis: "midpoint-in-right-half", why: "The left half is lo..mid, including mid." }, { value: `0..${mid} and ${mid}..${last}`, mis: "midpoint-shared", why: "The right half starts at mid + 1." }, { value: `0..${mid + 1} and ${mid + 2}..${last}`, mis: "midpoint-rounded-up", why: "(lo + hi) / 2 uses integer division, which truncates." }, { value: `1..${mid} and ${mid + 1}..${last}`, mis: "lo-shifted", why: "The left call keeps lo." }],
    explanation: `mid = (0 + ${last}) / 2 = ${mid}, so the calls receive ${kids.join(" and ")}.`, jvm: jv(A, name, [0, last], { observe: "childRanges" }) });
} };

// ---- two-ended progression ----
const TE = [
  { id: "pair-sums", levels: [0, 1, 2], body: nm => [If(bin(">", lo, hi), [Ret(num(0))]), If(bin("==", lo, hi), [Ret(idx(a, lo))]), Ret(bin("+", bin("+", idx(a, lo), idx(a, hi)), call(nm, a, bin("+", lo, num(1)), bin("-", hi, num(1)))))] },
  { id: "matching-pairs", levels: [1, 2], body: nm => [If(bin(">=", lo, hi), [Ret(num(0))]), Decl("int", "here", tern(bin("==", idx(a, lo), idx(a, hi)), num(1), num(0))), Ret(bin("+", v("here"), call(nm, a, bin("+", lo, num(1)), bin("-", hi, num(1)))))], pal: true },
  { id: "outer-minus-inner", levels: [2], body: nm => [If(bin(">=", lo, hi), [Ret(num(0))]), Ret(bin("-", bin("-", idx(a, hi), idx(a, lo)), call(nm, a, bin("+", lo, num(1)), bin("-", hi, num(1)))))] },
];
export const twoEnded = { id: "two-ended", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], T = pick(TE.filter(x => x.levels.includes(L)), r), name = pick(NAMES.arr, r);
  let A = randArr(int(4, [6, 7, 9][L], r), 0, 9, r); if (T.pal) for (let j = 0; j < A.length / 2; j++) if (r() < 0.5) A[A.length - 1 - j] = A[j];
  const prog = program([method(name, "int", [["int[]", "a"], ["int", "lo"], ["int", "hi"]], T.body(name))], name), res = runA(prog, name, A, [0, A.length - 1]); if (res.error) reject("te err");
  const ask = pick(["value", "baseParams", "calls"], r), ct = `${name}(a, 0, ${A.length - 1})`, lastC = res.log.at(-1).args;
  const common = { r, difficulty: d, family: "two-ended", prog, callNote: note(A, ct), trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `two-ended:${T.id}:${ask}:${A.length % 2 ?