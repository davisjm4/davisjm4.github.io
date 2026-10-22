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
  const common = { r, difficulty: d, family: "two-ended", prog, callNote: note(A, ct), trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `two-ended:${T.id}:${ask}:${A.length % 2 ? "odd" : "even"}`, data: { array: A } };
  if (ask === "value") return Q({ ...common, prompt: `What does ${ct} return?`, answer: res.value,
    distractors: [{ value: res.log[1]?.ret, mis: "outer-pair-missed", why: "The first call handles a[0] and the last element itself." }, T.id === "pair-sums" && { value: A.reduce((x, y) => x + y, 0) - (A.length % 2 ? A[(A.length - 1) / 2] : 0), mis: "middle-element-missed", why: "When lo == hi the middle element is returned." }, T.id === "pair-sums" && { value: A.reduce((x, y) => x + y, 0) + (A.length % 2 ? A[(A.length - 1) / 2] : A[0]), mis: "element-counted-twice", why: "Each index is used once." }, T.id !== "pair-sums" && { value: -res.value, mis: "subtraction-order", why: "Keep the order of operands in each subtraction." }, { value: res.value + 1, mis: "off-by-one", why: "Retrace each pair." }, T.id === "matching-pairs" && { value: Math.floor(A.length / 2), mis: "assumes-all-match", why: "Only pairs with equal values add 1." }].filter(x => x && x.value !== undefined),
    explanation: `Pairs (lo, hi): ${fmtList(res.log.map(e => `(${e.args[1]}, ${e.args[2]})`))}. Returns: ${fmtList(res.returns.map(x => x.value))}.`, jvm: jv(A, name, [0, A.length - 1], { observe: "ret" }) });
  if (ask === "baseParams") { const ans = `lo = ${lastC[1]}, hi = ${lastC[2]}`;
    return Q({ ...common, prompt: `What are lo and hi in the last call made by ${ct}?`, answer: ans,
      distractors: [{ value: `lo = ${lastC[2]}, hi = ${lastC[1]}`, mis: "lo-hi-swapped", why: "lo increases and hi decreases; check which crosses which." }, { value: `lo = ${res.log.at(-2).args[1]}, hi = ${res.log.at(-2).args[2]}`, mis: "base-call-not-counted", why: "That call still recurses." }, { value: `lo = ${Math.floor(A.length / 2)}, hi = ${Math.floor(A.length / 2)}`, mis: "always-meets-in-middle", why: A.length % 2 ? "Check the base condition." : "With an even length, lo and hi never become equal." }, { value: `lo = ${A.length - 1}, hi = 0`, mis: "runs-to-ends", why: "Both indexes move each call, so they meet near the middle." }],
      explanation: `With ${A.length} elements, the pairs are ${fmtList(res.log.map(e => `(${e.args[1]}, ${e.args[2]})`))}.`, jvm: jv(A, name, [0, A.length - 1], { observe: "lastArgs" }) }); }
  return Q({ ...common, prompt: `How many calls to ${name} are made by ${ct}, including the first?`, answer: res.calls,
    distractors: [{ value: A.length, mis: "one-call-per-element", why: "Each call handles two elements." }, { value: res.calls - 1, mis: "base-call-not-counted", why: "The base-case call counts too." }, { value: Math.floor(A.length / 2), mis: "pairs-only", why: "Add the call that reaches the base case." }, { value: res.calls + 1, mis: "extra-call", why: "Nothing is called after the base case." }],
    explanation: `Calls (lo, hi): ${fmtList(res.log.map(e => `(${e.args[1]}, ${e.args[2]})`))}.`, jvm: jv(A, name, [0, A.length - 1], { observe: "calls" }) });
} };

// ---- stride recursion ----
export const strideRecursion = { id: "stride-recursion", mode: MODE, levels: [0, 1], build(d, r) {
  const L = LEVEL[d], name = pick(NAMES.arr, r), stride = int(2, L === 0 ? 2 : 3, r), start = int(0, stride - 1, r);
  const mk = s => program([method(name, "int", [["int[]", "a"], ["int", "i"]], [If(bin(">=", i, alen(a)), [Ret(num(0))]), Ret(bin("+", idx(a, i), call(name, a, bin("+", i, num(s)))))])], name);
  const A = randArr(int(5, L === 0 ? 7 : 10, r), -3, 9, r), prog = mk(stride), res = runA(prog, name, A, [start]);
  const ask = pick(["value", "indexes", "calls"], r), ct = `${name}(a, ${start})`, visited = res.log.map(e => e.args[1]).slice(0, -1);
  const common = { r, difficulty: d, family: "stride-recursion", prog, callNote: note(A, ct), trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `stride-recursion:${stride}:${ask}`, data: { array: A } };
  const s1 = runA(mk(1), name, A, [start]), other = runA(mk(stride), name, A, [start === 0 ? 1 : 0]);
  if (ask === "value") return Q({ ...common, prompt: `What does ${ct} return?`, answer: res.value,
    distractors: [{ value: s1.value, mis: "stride-ignored", why: `i increases by ${stride}, skipping elements.` }, { value: other.value, mis: "start-index-misread", why: `The first index used is ${start}.` }, { value: res.value - A[start], mis: "first-element-skipped", why: `The first call adds a[${start}].` }, { value: res.value + (A[visited.at(-1) + 1] ?? 1), mis: "extra-element", why: "Only the visited indexes contribute." }],
    explanation: `Indexes ${fmtList(visited)} are added: ${visited.map(j => A[j]).join(" + ")} = ${res.value}.`, jvm: jv(A, name, [start], { observe: "ret" }) });
  if (ask === "indexes") return Q({ ...common, prompt: `Which array indexes are added by ${ct}?`, answer: fmtList(visited),
    distractors: [{ value: fmtList(s1.log.map(e => e.args[1]).slice(0, -1)), mis: "stride-ignored", why: `i increases by ${stride}.` }, { value: fmtList(res.log.map(e => e.args[1])), mis: "base-index-used", why: `When i >= a.length (${A.length}) the method returns 0 without reading a[i].` }, { value: fmtList(visited.slice(0, -1)), mis: "last-index-missed", why: `Index ${visited.at(-1)} is still less than ${A.length}.` }, { value: fmtList(visited.map(x => x + 1).filter(x => x < A.length)), mis: "one-based-indexes", why: "Arrays are 0-indexed." }],
    explanation: `i: ${fmtList(res.log.map(e => e.args[1]))}; the last value is ≥ ${A.length}, so it adds nothing.`, jvm: jv(A, name, [start], { observe: "argList", param: 1, dropLast: true }) });
  return Q({ ...common, prompt: `How many calls to ${name} are made by ${ct}, including the first?`, answer: res.calls,
    distractors: [{ value: A.length, mis: "one-call-per-element", why: `i jumps by ${stride}.` }, { value: res.calls - 1, mis: "base-call-not-counted", why: "The call with i past the end counts too." }, { value: s1.calls, mis: "stride-ignored", why: `i increases by ${stride}.` }, { value: res.calls + 1, mis: "extra-call", why: "Nothing is called after the base case." }],
    explanation: `i takes ${fmtList(res.log.map(e => e.args[1]))}: ${res.calls} calls.`, jvm: jv(A, name, [start], { observe: "calls" }) });
} };

// ---- in-place mutation: order relative to the call matters ----
const MU = [
  { id: "prefix-sum", levels: [0, 1, 2], dep: "prev", start: 1, upd: () => ASet(a, i, bin("+", idx(a, i), idx(a, bin("-", i, num(1))))) },
  { id: "add-index", levels: [0, 1], dep: "none", start: 0, alt: () => ASet(a, i, bin("+", idx(a, i), bin("+", i, num(1)))), upd: () => ASet(a, i, bin("+", idx(a, i), i)) },
  { id: "add-next", levels: [1, 2], dep: "next", start: 0, end: 1, upd: () => ASet(a, i, bin("+", idx(a, i), idx(a, bin("+", i, num(1))))) },
  { id: "copy-previous-doubled", levels: [2], dep: "prev", start: 1, upd: () => ASet(a, i, bin("*", idx(a, bin("-", i, num(1))), num(2))) },
];
export const inPlaceMutation = { id: "in-place-mutation", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], M = pick(MU.filter(x => x.levels.includes(L)), r), name = pick(NAMES.arr, r), after = L > 0 && r() < 0.5;
  const stop = M.end ? bin(">=", i, bin("-", alen(a), num(1))) : bin(">=", i, alen(a));
  const mk = aft => program([method(name, "void", [["int[]", "a"], ["int", "i"]], [If(stop, [Ret()]), ...(aft ? [Do(call(name, a, bin("+", i, num(1)))), M.upd()] : [M.upd(), Do(call(name, a, bin("+", i, num(1))))])])], name);
  const A = randArr(int(4, [5, 6, 7][L], r), 1, 9, r), prog = mk(after), res = runA(prog, name, A, [M.start]); if (res.error) reject("mut err");
  const flipped = runA(mk(!after), name, A, [M.start]), firstOnly = (() => { const c = [...A]; const p = program([method(name, "void", [["int[]", "a"], ["int", "i"]], [If(stop, [Ret()]), M.upd()])], name); run(p, name, [c, M.start]); return c; })();
  const ask = pick(["array", "array", "element"], r), ct = `${name}(a, ${M.start})`;
  const common = { r, difficulty: d, family: "in-place-mutation", prog, callNote: note(A, ct), trace: [`a before: ${arr(A)}`, `a after:  ${arr(res.array)}`], callCount: res.calls, callDepth: res.maxDepth, reasoning: `in-place-mutation:${M.id}:${M.dep === "none" ? "order-irrelevant" : after ? "update-after-call" : "update-before-call"}:${ask}`, data: { array: A } };
  const sees = (M.dep === "prev") !== after;   // does each update read an already-updated neighbour?
  const why = M.dep === "none" ? "Each call changes only its own index, so the order of updates does not matter here."
    : `The update runs ${after ? "after the recursive call returns, so the highest index is updated first" : "before the recursive call, so index " + M.start + " is updated first"}. Each a[i] reads a[i ${M.dep === "prev" ? "- 1" : "+ 1"}], which ${sees ? "has already been updated, so the changes accumulate" : "has not been updated yet, so it still holds its original value"}.`;
  const offIdx = M.alt ? (() => { const c = [...A]; run(program([method(name, "void", [["int[]", "a"], ["int", "i"]], [If(stop, [Ret()]), M.alt(), Do(call(name, a, bin("+", i, num(1))))])], name), name, [c, M.start]); return c; })() : null;
  if (ask === "array") return Q({ ...common, prompt: `What are the contents of a after ${ct}?`, answer: arr(res.array),
    distractors: [{ value: arr(flipped.array), mis: after ? "update-order-assumed-forward" : "update-order-assumed-backward", why }, { value: arr(A), mis: "array-passed-by-value", why: "The method receives a reference to the same array, so its changes are visible to the caller." }, { value: arr(firstOnly), mis: "only-first-index-updated", why: "Every recursive call updates its own index." }, offIdx && { value: arr(offIdx), mis: "index-plus-one", why: "Each element gets its own index i added, and indexes start at 0." }].filter(Boolean),
    explanation: `${why} Result: ${arr(res.array)}.`, jvm: jv(A, name, [M.start], { isVoid: true, observe: "arrayAfter" }) });
  const j = int(Math.max(M.start, 1), A.length - 1 - (M.end || 0), r);
  return Q({ ...common, prompt: `What is a[${j}] after ${ct}?`, answer: res.array[j],
    distractors: [{ value: flipped.array[j], mis: after ? "update-order-assumed-forward" : "update-order-assumed-backward", why }, offIdx && { value: offIdx[j], mis: "index-plus-one", why: "Each element gets its own index added; indexes start at 0." }, { value: A[j], mis: "array-passed-by-value", why: "Changes made through the parameter change the caller's array." }, { value: res.array[j - 1], mis: "neighbour-index", why: `Check index ${j}.` }, { value: res.array[j + 1], mis: "neighbour-index", why: `Check index ${j}.` }].filter(x => x && x.value !== undefined),
    explanation: `${why} a becomes ${arr(res.array)}, so a[${j}] = ${res.array[j]}.`, jvm: jv(A, name, [M.start], { isVoid: true, observe: "arrayElement", index: j }) });
} };

// ---- in-place reversal (swap toward the middle) ----
export const inPlaceReverse = { id: "in-place-reverse", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(["reverse", "flip", "mirror", "swapEnds"], r), variant = pick(L === 1 ? ["full"] : ["full", "skip-one", "partial"], r);
  const step = variant === "skip-one" ? 2 : 1;
  const body = [If(bin(">=", lo, hi), [Ret()]), Decl("int", "t", idx(a, lo)), ASet(a, lo, idx(a, hi)), ASet(a, hi, v("t")), Do(call(name, a, bin("+", lo, num(step)), bin("-", hi, num(step))))];
  const prog = program([method(name, "void", [["int[]", "a"], ["int", "lo"], ["int", "hi"]], body)], name);
  const A = randArr(int(5, L === 1 ? 6 : 8, r), 1, 9, r), l0 = variant === "partial" ? 1 : 0, h0 = variant === "partial" ? A.length - 2 : A.length - 1;
  const res = runA(prog, name, A, [l0, h0]), ct = `${name}(a, ${l0}, ${h0})`, full = [...A].reverse();
  const half = (() => { const c = [...A]; const t = c[l0]; c[l0] = c[h0]; c[h0] = t; return c; })();
  const noTemp = (() => { const c = [...A]; let x = l0, y = h0; while (x < y) { c[x] = c[y]; c[y] = c[x]; x += step; y -= step; } return c; })();
  return Q({ r, difficulty: d, family: "in-place-reverse", prog, callNote: note(A, ct), prompt: `What are the contents of a after ${ct}?`, answer: arr(res.array),
    distractors: [{ value: arr(full), mis: "assumes-full-reverse", why: variant === "full" ? "" : "Check lo, hi and the step: not every pair is swapped." }, { value: arr(A), mis: "array-passed-by-value", why: "Swaps through the parameter change the caller's array." }, { value: arr(half), mis: "only-outer-swap", why: "Each recursive call swaps another pair." }, { value: arr(noTemp), mis: "swap-without-temp", why: "The temporary t keeps the old a[lo], so both values survive the swap." }].filter(x => x.value !== arr(res.array)),
    explanation: `Pairs swapped: ${fmtList(res.log.filter(e => e.args[1] < e.args[2]).map(e => `(${e.args[1]}, ${e.args[2]})`))}. Result: ${arr(res.array)}.`,
    trace: [`a before: ${arr(A)}`, ...res.log.map(e => `call ${name}(a, ${e.args[1]}, ${e.args[2]})`), `a after:  ${arr(res.array)}`], callCount: res.calls, callDepth: res.maxDepth, reasoning: `in-place-reverse:${variant}:array`, data: { array: A },
    jvm: jv(A, name, [l0, h0], { isVoid: true, observe: "arrayAfter" }) });
} };

// ---- mutation vs returned value ----
export const mutationVsReturn = { id: "mutation-vs-return", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(NAMES.arr, r), k = int(1, 3, r), variant = pick(["increment-then-sum", "sum-then-increment"], r);
  const upd = ASet(a, i, bin("+", idx(a, i), num(k)));
  const body = variant === "increment-then-sum" ? [If(bin("==", i, alen(a)), [Ret(num(0))]), upd, Ret(bin("+", idx(a, i), call(name, a, bin("+", i, num(1)))))]
    : [If(bin("==", i, alen(a)), [Ret(num(0))]), Decl("int", "rest", call(name, a, bin("+", i, num(1)))), Decl("int", "old", idx(a, i)), upd, Ret(bin("+", v("old"), v("rest")))];
  const prog = program([method(name, "int", [["int[]", "a"], ["int", "i"]], body)], name);
  const A = randArr(int(3, L === 1 ? 5 : 6, r), 1, 9, r), res = runA(prog, name, A, [0]), sum = A.reduce((x, y) => x + y, 0), ct = `${name}(a, 0)`;
  const fmt = (t, xs) => `returns ${t}; a = ${arr(xs)}`, inc = A.map(x => x + k);
  const other = variant === "increment-then-sum" ? sum : sum + k * A.length;
  return Q({ r, difficulty: d, family: "mutation-vs-return", prog, callNote: note(A, ct), prompt: `What does ${ct} return, and what does a contain afterwards?`, answer: fmt(res.value, res.array),
    distractors: [{ value: fmt(res.value, A), mis: "array-passed-by-value", why: "a[i] = … changes the caller's array." }, { value: fmt(other, res.array), mis: variant === "increment-then-sum" ? "reads-old-value" : "reads-new-value", why: variant === "increment-then-sum" ? "a[i] is read after it was increased." : "old was saved before a[i] changed." }, { value: fmt(other, A), mis: "mutation-ignored-entirely", why: "Both the update and the return value matter." }, { value: fmt(res.value, inc.map(x => x + k)), mis: "double-update", why: `Each index is increased by ${k} exactly once.` }],
    explanation: `Each a[i] increases by ${k}. ${variant === "increment-then-sum" ? "The sum uses the new values" : "The sum uses the saved old values"}: returns ${res.value}; a = ${arr(res.array)}.`,
    trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `mutation-vs-return:${variant}`, data: { array: A }, jvm: jv(A, name, [0], { observe: "retAndArray" }) });
} };

// ---- conditional aggregation (incl. absent targets and short-circuit) ----
const CA = [
  { id: "count-above", levels: [0, 1, 2], ret: "int", body: (nm, k) => [If(bin("==", i, alen(a)), [Ret(num(0))]), If(bin(">", idx(a, i), num(k)), [Ret(bin("+", num(1), call(nm, a, bin("+", i, num(1)))))]), Ret(call(nm, a, bin("+", i, num(1))))], start: () => 0 },
  { id: "last-match-backward", levels: [0, 1, 2], ret: "int", body: (nm, k) => [If(bin("<", i, num(0)), [Ret(num(-1))]), If(bin("==", idx(a, i), num(k)), [Ret(i)]), Ret(call(nm, a, bin("-", i, num(1))))], start: A => A.length - 1, target: true },
  { id: "all-positive-short-circuit", levels: [1, 2], ret: "boolean", body: nm => [If(bin("==", i, alen(a)), [Ret({ k: "bool", v: true })]), Ret(bin("&&", bin(">", idx(a, i), num(0)), call(nm, a, bin("+", i, num(1)))))], start: () => 0, calls: true },
  { id: "sum-of-negatives", levels: [1, 2], ret: "int", body: nm => [If(bin("==", i, alen(a)), [Ret(num(0))]), Decl("int", "rest", call(nm, a, bin("+", i, num(1)))), If(bin("<", idx(a, i), num(0)), [Ret(bin("+", idx(a, i), v("rest")))]), Ret(v("rest"))], start: () => 0 },
];
export const conditionalAggregate = { id: "conditional-aggregate", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], C = pick(CA.filter(x => x.levels.includes(L)), r), name = pick(NAMES.arr, r);
  const A = randArr(int(5, [6, 8, 9][L], r), C.calls ? -2 : -5, 9, r), k = C.target ? (r() < 0.3 ? 10 + int(0, 5, r) : pick(A, r)) : int(1, 5, r);
  const prog = program([method(name, C.ret, [["int[]", "a"], ["int", "i"]], C.body(name, k))], name), st = C.start(A), res = runA(prog, name, A, [st]), ct = `${name}(a, ${st})`;
  const common = { r, difficulty: d, family: "conditional-aggregate", prog, callNote: note(A, ct), trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, data: { array: A, target: k } };
  if (C.calls) { const fmt = (b, c) => `${b} after ${c} call${c === 1 ? "" : "s"}`, full = A.length + 1;
    return Q({ ...common, prompt: `What does ${ct} return, and how many calls are made?`, answer: fmt(res.value, res.calls), reasoning: `conditional-aggregate:${C.id}:${res.value ? "true" : "false"}`,
      distractors: [{ value: fmt(res.value, full), mis: "no-short-circuit", why: "&& stops evaluating as soon as the left side is false, so the recursive call is skipped." }, { value: fmt(!res.value, res.calls), mis: "result-misread", why: res.value ? "No element is ≤ 0." : `a[${res.calls - 1}] is not positive.` }, { value: fmt(res.value, res.calls - 1), mis: "base-call-not-counted", why: "Count every call, including the first." }, { value: fmt(res.value, A.length), mis: "one-call-per-element", why: res.value ? "The call with i == a.length also happens." : "The recursion stops at the first non-positive value." }],
      explanation: res.value ? `Every element is positive, so all ${res.calls} calls happen and true is returned.` : `a[${res.calls - 1}] = ${A[res.calls - 1]} is not positive; && short-circuits there, so only ${res.calls} calls happen.`, jvm: jv(A, name, [st], { observe: "retAndCalls" }) }); }
  const D = C.id === "last-match-backward" ? [{ value: A.indexOf(k), mis: "first-match-instead-of-last", why: "The search starts from the end, so it finds the last occurrence." }, { value: res.value === -1 ? A.length : -1, mis: res.value === -1 ? "returns-length-when-absent" : "assumes-absent", why: res.value === -1 ? `${k} does not occur; the base case i < 0 returns -1.` : `${k} occurs in a.` }, { value: res.value === -1 ? 0 : res.value - 1, mis: "off-by-one-index", why: "Return the index where a[i] == target." }, { value: k, mis: "value-for-index", why: "The method returns an index, not the value." }]
    : C.id === "count-above" ? [{ value: A.filter(x => x >= k).length, mis: "boundary-operator-confused", why: `The condition is a[i] > ${k}; values equal to ${k} do not count.` }, { value: A.length - res.value, mis: "counts-complement", why: "Only values that satisfy the condition add 1." }, { value: A.filter(x => x > k).reduce((x, y) => x + y, 0), mis: "sum-for-count", why: "Each match adds 1, not its value." }, { value: res.value + 1, mis: "base-counts-one", why: "The base case returns 0." }]
    : [{ value: A.reduce((x, y) => x + y, 0), mis: "condition-ignored", why: "Only negative values are added." }, { value: A.filter(x => x <= 0).reduce((x, y) => x + y, 0) === res.value ? res.value - 1 : A.filter(x => x <= 0).reduce((x, y) => x + y, 0), mis: "boundary-operator-confused", why: "The condition is a[i] < 0." }, { value: -res.value, mis: "sign-dropped", why: "Negative values sum to a negative result." }, { value: A.filter(x => x < 0).length, mis: "count-for-sum", why: "Each negative value is added, not counted." }];
  return Q({ ...common, prompt: `What does ${ct} return${C.target ? ` when the target is ${k}` : ""}?`, answer: res.value, reasoning: `conditional-aggregate:${C.id}${C.target ? (res.value === -1 ? ":absent" : ":present") : ""}`, distractors: D,
    explanation: C.id === "last-match-backward" ? (res.value === -1 ? `${k} never appears, so the calls reach i = -1 and return -1.` : `Searching from index ${A.length - 1} down, the first match is at index ${res.value}.`) : `Each call decides whether a[i] contributes: ${res.value}.`, jvm: jv(A, name, [st], { observe: "ret" }) });
} };
export default [segmentRecursion, twoEnded, strideRecursion, inPlaceMutation, inPlaceReverse, mutationVsReturn, conditionalAggregate];
