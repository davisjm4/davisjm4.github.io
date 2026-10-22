import { num, v, bin, call, If, Ret, Do, Decl, ASet, method, program, run, idx, alen, tern, renderJava } from "./ir.js?v=compositional-v2";
import { makeQuestion, reject, int, pick, LEVEL, fmtList, exec, traceLines, shuffle } from "./core.js?v=compositional-v2";
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
    distractors: [{ value: fmtList(otherMids), mis: midKind === "up" ? "midpoint-rounded-down" : "midpoint-rounded-up", why: midKind === "up" ? "(low + high + 1) / 2 rounds the midpoint up." : "Integer division truncates, so the midpoint rounds down." }, { value: fmtList(mids.slice(0, -1)), mis: "last-probe-missed", why: "The last range is checked too." }, { value: fmtList(Array.from({ length: mids.length }, (_, j) => j)), mis: "linear-order", why: "Binary search jumps to the middle of the remaining range." }, { value: fmtList(mids.map(x => A[x])), mis: "values-for-indexes", why: "The question asks for indexes, not the values stored there." }],
    explanation: `Ranges: ${fmtList(res.log.map(e => `${e.args[1]}..${e.args[2]}`))}; mids ${fmtList(mids)}. ${absent ? "The range becomes empty, so -1 is returned." : `a[${res.value}] = ${T}.`}`, jvm: { ...jvm, observe: "bsMids", midKind } });
  if (ask === "calls") return Q({ ...common, prompt: `How many calls to ${nm} are made by ${ct}, including the first?`, answer: res.calls,
    distractors: [{ value: res.calls - 1, mis: "empty-range-call-not-counted", why: absent ? "The call whose range is empty (low > high) still happens; it returns -1." : "Count the first call." }, { value: A.length, mis: "linear-search-model", why: "Each call discards about half the range." }, ...(other.calls !== res.calls ? [{ value: other.calls, mis: "midpoint-rounding", why: "Use the midpoint formula in the code." }] : []), { value: res.calls + 1, mis: "extra-call", why: "Nothing is called after a return." }, { value: Math.ceil(Math.log2(A.length + 1)) + 1, mis: "formula-instead-of-trace", why: "Trace the actual ranges for this target." }],
    explanation: `Ranges: ${fmtList(res.log.map(e => `${e.args[1]}..${e.args[2]}`))} — ${res.calls} calls.`, jvm: { ...jvm, observe: "calls" } });
  const last = res.log.at(-1).args, ans = `low = ${last[1]}, high = ${last[2]}`, prev = res.log.at(-2).args;
  return Q({ ...common, prompt: `${T} is not in a. What are low and high in the last call made by ${ct}?`, answer: ans,
    distractors: [{ value: `low = ${prev[1]}, high = ${prev[2]}`, mis: "empty-range-call-not-counted", why: "That range still contains an index; one more call is made with an empty range." }, { value: `low = ${last[2]}, high = ${last[1]}`, mis: "low-high-swapped", why: "The base case is low > high." }, { value: `low = ${last[1]}, high = ${last[1]}`, mis: "stops-at-single-element", why: "A one-element range is still searched." }, { value: `low = 0, high = -1`, mis: "always-ends-at-start", why: "Where the range closes depends on the target." }],
    explanation: `Ranges: ${fmtList(res.log.map(e => `${e.args[1]}..${e.args[2]}`))}. The last range is empty, so -1 is returned.`, jvm: { ...jvm, observe: "lastArgs" } });
} };

// ---- merge sort on UNSORTED input ----
export const MERGE_CODE = `public static void mergeSort(int[] a, int low, int high) {
    if (low >= high) {
        return;
    }
    int mid = (low + high) / 2;
    mergeSort(a, low, mid);
    mergeSort(a, mid + 1, high);
    merge(a, low, mid, high);
}
private static void merge(int[] a, int low, int mid, int high) {
    int[] temp = new int[high - low + 1];
    int i = low, j = mid + 1, k = 0;
    while (i <= mid && j <= high) {
        if (a[i] <= a[j]) temp[k++] = a[i++];
        else temp[k++] = a[j++];
    }
    while (i <= mid) temp[k++] = a[i++];
    while (j <= high) temp[k++] = a[j++];
    for (int x = 0; x < temp.length; x++) a[low + x] = temp[x];
}`;
export function simMerge(A) {
  const a_ = [...A], merges = []; let calls = 0, depth = 0, maxDepth = 0; const entries = [];
  function ms(l, h) { calls++; depth++; maxDepth = Math.max(maxDepth, depth); entries.push({ depth, low: l, high: h, state: [...a_] });
    if (l < h) { const m_ = Math.floor((l + h) / 2); ms(l, m_); ms(m_ + 1, h); const before = [...a_], L = a_.slice(l, m_ + 1), R = a_.slice(m_ + 1, h + 1), out = []; let x = 0, y = 0;
      while (x < L.length && y < R.length) out.push(L[x] <= R[y] ? L[x++] : R[y++]); while (x < L.length) out.push(L[x++]); while (y < R.length) out.push(R[y++]);
      out.forEach((val, z) => { a_[l + z] = val; }); merges.push({ low: l, mid: m_, high: h, left: L, right: R, before, after: [...a_] }); }
    depth--; }
  ms(0, A.length - 1); return { result: a_, merges, calls, maxDepth, entries };
}
export const mergeSortTrace = { id: "merge-sort-trace", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], A = unsorted(int(L === 0 ? 4 : 6, [5, 8, 10][L], r), r), S = simMerge(A), h = A.length - 1, m_ = Math.floor(h / 2);
  const ask = pick(L === 0 ? ["afterLeft", "merges", "lastMerge"] : ["afterLeft", "merges", "lastMerge", "kthMerge"], r), ct = `mergeSort(a, 0, ${h})`;
  const common = { r, difficulty: d, family: "merge-sort-trace", code: `${MERGE_CODE}\n// ${note(A, ct)}`, trace: S.merges.map(x => `merge ${x.low}..${x.mid} with ${x.mid + 1}..${x.high} → ${arr(x.after)}`), callCount: S.calls, callDepth: S.maxDepth, reasoning: `merge-sort-trace:${ask}`, data: { array: A } };
  const leftSorted = [...A.slice(0, m_ + 1).sort((x, y) => x - y), ...A.slice(m_ + 1)];
  if (ask === "afterLeft") return Q({ ...common, prompt: `In ${ct}, what does a contain right after the call mergeSort(a, 0, ${m_}) returns?`, answer: arr(leftSorted),
    distractors: [{ value: arr(S.result), mis: "whole-array-sorted-early", why: `Only indexes 0..${m_} have been sorted; the right half has not been touched yet.` }, { value: arr(A), mis: "sorting-happens-at-the-end", why: "Each recursive call sorts its range in place before returning." }, { value: arr([...A.slice(0, m_ + 1), ...A.slice(m_ + 1).sort((x, y) => x - y)]), mis: "halves-confused", why: `mergeSort(a, 0, ${m_}) sorts the left half.` }, { value: arr([...S.result.slice(0, m_ + 1), ...A.slice(m_ + 1)]), mis: "smallest-values-move-left", why: "The left half is sorted using only its own values." }],
    explanation: `mergeSort(a, 0, ${m_}) sorts indexes 0..${m_} in place (${arr(A.slice(0, m_ + 1))} → ${arr(leftSorted.slice(0, m_ + 1))}); indexes ${m_ + 1}..${h} are unchanged until the next call.`, jvm: { method: "mergeSort", setup: `int[] a = ${arr(A)};`, call: ct, isVoid: true, observe: "secondChildEntryArray" } });
  if (ask === "merges") return Q({ ...common, prompt: `How many times is merge called during ${ct}?`, answer: S.merges.length,
    distractors: [{ value: S.calls, mis: "counts-all-mergesort-calls", why: "Base-case calls (one element) return without merging." }, { value: A.length, mis: "one-merge-per-element", why: `Combining ${A.length} single elements into one array takes ${A.length - 1} merges.` }, { value: S.maxDepth, mis: "depth-as-merges", why: "Count merges across the whole call tree, not its height." }, { value: Math.ceil(Math.log2(A.length)), mis: "levels-as-merges", why: "Each level can have several merges." }],
    explanation: `Every mergeSort call with low < high merges once: ${S.merges.length} merges for ${A.length} elements.`, jvm: { method: "merge", setup: `int[] a = ${arr(A)};`, call: "mergeSort(a, 0, a.length - 1)".replace("a.length - 1", String(h)), isVoid: true, observe: "calls" } });
  if (ask === "lastMerge") { const lm = S.merges.at(-1), ans = `${arr(lm.left)} and ${arr(lm.right)}`;
    return Q({ ...common, prompt: `The last call to merge in ${ct} combines two sorted halves. What are they?`, answer: ans,
      distractors: [{ value: `${arr(A.slice(0, m_ + 1))} and ${arr(A.slice(m_ + 1))}`, mis: "halves-unsorted", why: "Each half was sorted by its own recursive call before the final merge." }, { value: `${arr(S.result.slice(0, m_ + 1))} and ${arr(S.result.slice(m_ + 1))}`, mis: "smallest-values-move-left", why: "Each half keeps its own values; merging interleaves them." }, { value: `${arr(lm.left.slice(0, -1))} and ${arr([lm.left.at(-1), ...lm.right])}`, mis: "midpoint-in-right-half", why: `mid = ${m_}, so the left half is indexes 0..${m_}.` }, { value: `${arr(S.merges[0].left)} and ${arr(S.merges[0].right)}`, mis: "first-merge-for-last", why: "The first merge combines single elements; the last combines the two big halves." }],
      explanation: `The final merge combines a[0..${m_}] = ${arr(lm.left)} and a[${m_ + 1}..${h}] = ${arr(lm.right)} into ${arr(S.result)}.`, jvm: { method: "merge", setup: `int[] a = ${arr(A)};`, call: ct, isVoid: true, observe: "lastMergeHalves", mid: m_ } }); }
  const kIdx = int(1, Math.min(S.merges.length - 2, 3), r), km = S.merges[kIdx];
  return Q({ ...common, prompt: `In ${ct}, what does a contain right after merge is called for the ${["first", "second", "third", "fourth"][kIdx]} time?`, answer: arr(km.after),
    distractors: [{ value: arr(km.before), mis: "merge-not-applied", why: "That is the array just before that merge." }, { value: arr(S.merges[kIdx + 1].after), mis: "off-by-one-merge", why: "Count merges in the order they happen (left subtree first)." }, { value: arr(S.merges[kIdx - 1].after), mis: "off-by-one-merge", why: "Count merges from the first one." }, { value: arr(S.result), mis: "whole-array-sorted-early", why: "Later merges have not happened yet." }],
    explanation: `Merges happen depth-first, left before right: ${S.merges.map((x, z) => `#${z + 1} ${x.low}..${x.high}`).join(", ")}. After #${kIdx + 1}: ${arr(km.after)}.`, jvm: { method: "merge", setup: `int[] a = ${arr(A)};`, call: ct, isVoid: true, observe: "arrayAfterNthCall", n: kIdx } });
} };

// ---- quicksort (Lomuto partition) ----
export const QUICK_CODE = `public static void quickSort(int[] a, int low, int high) {
    if (low >= high) {
        return;
    }
    int p = partition(a, low, high);
    quickSort(a, low, p - 1);
    quickSort(a, p + 1, high);
}
private static int partition(int[] a, int low, int high) {
    int pivot = a[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (a[j] <= pivot) {
            i++;
            int t = a[i]; a[i] = a[j]; a[j] = t;
        }
    }
    int t = a[i + 1]; a[i + 1] = a[high]; a[high] = t;
    return i + 1;
}`;
export function simQuick(A, { strict = false, firstPivot = false } = {}) {
  const a_ = [...A], parts = []; let calls = 0, depth = 0, maxDepth = 0;
  function part(l, h) { if (firstPivot) { const tt = a_[l]; a_[l] = a_[h]; a_[h] = tt; } const pv = a_[h]; let x = l - 1; for (let j = l; j < h; j++) if (strict ? a_[j] < pv : a_[j] <= pv) { x++; [a_[x], a_[j]] = [a_[j], a_[x]]; } [a_[x + 1], a_[h]] = [a_[h], a_[x + 1]]; parts.push({ low: l, high: h, pivot: pv, p: x + 1, after: [...a_] }); return x + 1; }
  function qs(l, h) { calls++; depth++; maxDepth = Math.max(maxDepth, depth); if (l < h) { const p = part(l, h); qs(l, p - 1); qs(p + 1, h); } depth--; }
  qs(0, A.length - 1); return { result: a_, parts, calls, maxDepth };
}
export const quickSortTrace = { id: "quicksort-partition", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], A = L === 1 ? distinctArr(int(5, 7, r), r) : Array.from({ length: int(6, 9, r) }, () => int(1, 12, r)), S = simQuick(A), h = A.length - 1, ct = `quickSort(a, 0, ${h})`;
  const ask = pick(["firstPartition", "pivotIndex", "calls"], r), p0 = S.parts[0];
  const common = { r, difficulty: d, family: "quicksort-partition", code: `${QUICK_CODE}\n// ${note(A, ct)}`, trace: S.parts.map(x => `partition ${x.low}..${x.high}, pivot ${x.pivot} → index ${x.p}: ${arr(x.after)}`), callCount: S.calls, callDepth: S.maxDepth, reasoning: `quicksort-partition:${ask}${L === 2 ? ":duplicates" : ""}`, data: { array: A } };
  const strict = simQuick(A, { strict: true }), firstP = simQuick(A, { firstPivot: true });
  const noFinalSwap = (() => { const c = [...A], pv = c[h]; let x = -1; for (let j = 0; j < h; j++) if (c[j] <= pv) { x++; [c[x], c[j]] = [c[j], c[x]]; } return c; })();
  if (ask === "firstPartition") return Q({ ...common, prompt: `What does a contain right after the first call to partition in ${ct}?`, answer: arr(p0.after),
    distractors: [{ value: arr(S.result), mis: "partition-sorts", why: "Partition only places the pivot; each side can still be unsorted." }, { value: arr(noFinalSwap), mis: "pivot-not-swapped-into-place", why: "The last swap moves the pivot to index i + 1." }, { value: arr(firstP.parts[0].after), mis: "pivot-is-first-element", why: `The pivot is a[high] = ${A[h]}.` }, ...(L === 2 && arr(strict.parts[0].after) !== arr(p0.after) ? [{ value: arr(strict.parts[0].after), mis: "strict-comparison", why: "a[j] <= pivot also moves values equal to the pivot." }] : []), { value: arr(A), mis: "array-unchanged", why: "partition swaps elements of the caller's array." }],
    explanation: `Pivot ${p0.pivot}: values ≤ ${p0.pivot} are swapped to the front, then the pivot moves to index ${p0.p}: ${arr(p0.after)}.`, jvm: { method: "quickSort", setup: `int[] a = ${arr(A)};`, call: ct, isVoid: true, observe: "firstChildEntryArray" } });
  if (ask === "pivotIndex") return Q({ ...common, prompt: `What index does the first call to partition return in ${ct}?`, answer: p0.p,
    distractors: [{ value: h, mis: "pivot-index-unchanged", why: "The pivot starts at high but is swapped to i + 1." }, { value: S.result.indexOf(p0.pivot) === p0.p ? p0.p + 1 : S.result.indexOf(p0.pivot), mis: "final-position-guess", why: `Count how many values are ≤ ${p0.pivot}.` }, { value: p0.p - 1, mis: "returns-i", why: "partition returns i + 1, not i." }, { value: A.filter(x => x < p0.pivot).length === p0.p ? p0.p + 2 : A.filter(x => x < p0.pivot).length, mis: "strict-comparison", why: "Values equal to the pivot also go to its left." }, { value: Math.floor(h / 2), mis: "midpoint-split", why: "Quicksort splits at the pivot's position, not the middle." }],
    explanation: `${A.filter((x, z) => z < h && x <= p0.pivot).length} of the other values are ≤ ${p0.pivot}, so the pivot ends at index ${p0.p}.`, jvm: { method: "partition", setup: `int[] a = ${arr(A)};`, call: ct, isVoid: true, observe: "firstReturn" } });
  return Q({ ...common, prompt: `How many calls to quickSort are made by ${ct}, including the first?`, answer: S.calls,
    distractors: [{ value: S.parts.length, mis: "counts-partitions", why: "Calls with low >= high also count, even though they do not partition." }, { value: A.length, mis: "one-call-per-element", why: "Trace the actual calls." }, { value: 2 * A.length - 1, mis: "merge-sort-count", why: "Quicksort's tree depends on where the pivots land." }, { value: S.maxDepth, mis: "depth-as-calls", why: "Count every call, not the height of the tree." }, { value: S.calls - 1, mis: "first-call-not-counted", why: "Include the first call." }],
    explanation: `${S.parts.length} calls partition a range; ${S.calls - S.parts.length} calls hit the base case: ${S.calls} in total.`, jvm: { method: "quickSort", setup: `int[] a = ${arr(A)};`, call: ct, isVoid: true, observe: "calls" } });
} };

// ---- recursive selection sort (with a recursive maxIndex) ----
export const selectionSort = { id: "recursive-selection-sort", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], A = L === 1 ? distinctArr(int(5, 6, r), r, 30) : Array.from({ length: int(5, 7, r) }, () => int(1, 9, r));
  const maxIdx = method("maxIndex", "int", [["int[]", "a"], ["int", "k"]], [If(bin("==", k, num(0)), [Ret(num(0))]), Decl("int", "m", call("maxIndex", a, bin("-", k, num(1)))), Ret(tern(bin(">", idx(a, k), idx(a, m)), k, m))]);
  const sortM = method("sort", "void", [["int[]", "a"], ["int", "n"]], [If(bin("<=", n, num(1)), [Ret()]), Decl("int", "m", call("maxIndex", a, bin("-", n, num(1)))), Decl("int", "tmp", idx(a, m)), ASet(a, m, idx(a, bin("-", n, num(1)))), ASet(a, bin("-", n, num(1)), v("tmp")), Do(call("sort", a, bin("-", n, num(1))))]);
  maxIdx.vis = "private"; const prog = program([sortM, maxIdx], "sort");
  const snaps = []; const copy = [...A]; const res = run(prog, "sort", [copy, A.length], { onEvent: ev => { if (ev.type === "call" && ev.name === "sort") snaps.push([...ev.args[0]]); } });
  if (res.error) reject("sel err");
  const ask = pick(L === 2 ? ["afterPasses", "maxIndex", "afterPasses"] : ["afterPasses", "maxIndex"], r), ct = `sort(a, ${A.length})`;
  const common = { r, difficulty: d, family: "recursive-selection-sort", prog, callNote: note(A, ct), trace: snaps.map((s_, z) => `call sort(a, ${A.length - z}): a = ${arr(s_)}`), callCount: res.calls, callDepth: res.maxDepth, data: { array: A } };
  if (ask === "afterPasses") { const p = int(1, Math.min(3, snaps.length - 2), r), ans = snaps[p], sortedPrefix = [...A].sort((x, y) => x - y);
    const ascendingMin = (() => { const c = [...A]; for (let z = 0; z < p; z++) { let mi = z; for (let y = z; y < c.length; y++) if (c[y] < c[mi]) mi = y; [c[z], c[mi]] = [c[mi], c[z]]; } return c; })();
    return Q({ ...common, prompt: `In ${ct}, what does a contain when sort(a, ${A.length - p}) begins?`, answer: arr(ans), reasoning: `recursive-selection-sort:after-passes${L === 2 ? ":duplicates" : ""}`,
      distractors: [{ value: arr(snaps[p - 1]), mis: "off-by-one-pass", why: `sort(a, ${A.length - p}) starts after ${p} swap${p > 1 ? "s" : ""}.` }, { value: arr(snaps[p + 1]), mis: "off-by-one-pass", why: `That is the state when sort(a, ${A.length - p - 1}) begins.` }, { value: arr(ascendingMin), mis: "minimum-to-front", why: "This version moves the maximum to the end of the unsorted part." }, { value: arr(sortedPrefix), mis: "fully-sorted-early", why: "Only the last positions are final so far." }],
      explanation: `Each call swaps the largest of a[0..n−1] into index n − 1 and recurses on n − 1: ${snaps.map(arr).join(" → ")}.`, jvm: { method: "sort", setup: `int[] a = ${arr(A)};`, call: ct, isVoid: true, observe: "entryArrayAt", index: p } }); }
  const kk = int(2, A.length - 1, r), mres = run(program([maxIdx], "maxIndex"), "maxIndex", [[...A], kk]), sub_ = A.slice(0, kk + 1), mx = Math.max(...sub_);
  return Q({ ...common, prompt: `Before any swaps, what does maxIndex(a, ${kk}) return?`, answer: mres.value, reasoning: `recursive-selection-sort:max-index${sub_.filter(x => x === mx).length > 1 ? ":tie" : ""}`,
    distractors: [{ value: mx, mis: "value-for-index", why: "maxIndex returns an index, not the value." }, { value: sub_.lastIndexOf(mx) !== mres.value ? sub_.lastIndexOf(mx) : A.indexOf(Math.max(...A)) !== mres.value ? A.indexOf(Math.max(...A)) : kk, mis: sub_.lastIndexOf(mx) !== mres.value ? "ties-pick-last" : "searches-whole-array", why: sub_.lastIndexOf(mx) !== mres.value ? "a[k] > a[m] is strict, so on a tie the earlier index is kept." : `maxIndex(a, ${kk}) only looks at indexes 0..${kk}.` }, { value: kk, mis: "returns-k", why: `k is returned only when a[k] is larger than every earlier value.` }, { value: 0, mis: "returns-base", why: "0 is returned by the base case, but later levels can replace it." }, { value: sub_.indexOf(Math.min(...sub_)), mis: "min-for-max", why: "The comparison keeps the larger value." }],
    explanation: `Among a[0..${kk}] = ${arr(sub_)}, the largest value ${mx} is first found at index ${mres.value}.`, jvm: { method: "maxIndex", setup: `int[] a = ${arr(A)};`, call: `maxIndex(a, ${kk})`, observe: "ret", program: "maxIndexOnly" } });
} };

// ---- recursive vs. iterative ----
const LOOPS = [
  { text: n_ => `for (int i = 0; i < a.length; i++)`, order: len => Array.from({ length: len }, (_, z) => z) },
  { text: () => `for (int i = a.length - 1; i >= 0; i--)`, order: len => Array.from({ length: len }, (_, z) => len - 1 - z) },
  { text: () => `for (int i = 0; i < a.length; i += 2)`, order: len => Array.from({ length: Math.ceil(len / 2) }, (_, z) => 2 * z) },
  { text: () => `for (int i = 1; i < a.length; i += 2)`, order: len => Array.from({ length: Math.floor(len / 2) }, (_, z) => 2 * z + 1) },
  { text: () => `for (int i = 1; i <= a.length; i++)`, order: len => Array.from({ length: len }, (_, z) => z + 1) },
  { text: () => `for (int i = a.length - 2; i >= 0; i--)`, order: len => Array.from({ length: len - 1 }, (_, z) => len - 2 - z) },
  { text: () => `for (int i = a.length - 1; i > 0; i--)`, order: len => Array.from({ length: len - 1 }, (_, z) => len - 1 - z) },
];
export const recursiveVsIterative = { id: "recursive-vs-iterative", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(["visit", "show", "walk"], r), shape = pick(L === 0 ? ["forward", "backward"] : L === 1 ? ["forward", "backward", "even"] : ["forward", "backward", "even", "odd", "backward-post"], r);
  const pr = { k: "print", e: bin("+", idx(a, i), { k: "str", v: " " }), ln: false };
  const B = { forward: [[If(bin(">=", i, alen(a)), [Ret()]), pr, Do(call(name, a, bin("+", i, num(1))))], "0"], backward: [[If(bin("<", i, num(0)), [Ret()]), pr, Do(call(name, a, bin("-", i, num(1))))], "a.length - 1"],
    even: [[If(bin(">=", i, alen(a)), [Ret()]), pr, Do(call(name, a, bin("+", i, num(2))))], "0"], odd: [[If(bin(">=", i, alen(a)), [Ret()]), pr, Do(call(name, a, bin("+", i, num(2))))], "1"],
    "backward-post": [[If(bin(">=", i, alen(a)), [Ret()]), Do(call(name, a, bin("+", i, num(1)))), pr], "0"] }[shape];
  const prog = program([method(name, "void", [["int[]", "a"], ["int", "i"]], B[0])], name);
  const A = distinctArr(int(5, 7, r), r, 50), st = B[1] === "0" ? 0 : B[1] === "1" ? 1 : A.length - 1, res = exec(prog, name, [[...A], st]);
  const visited = res.out.trim().split(" ").map(x => A.indexOf(Number(x)));
  const match = LOOPS.filter(l => fmtList(l.order(A.length)) === fmtList(visited)); if (match.length !== 1) reject("ambiguous loop");
  const others = shuffle(LOOPS.filter(l => fmtList(l.order(A.length)) !== fmtList(visited)), r).slice(0, 3);
  const startText = B[1] === "a.length - 1" ? "a.length - 1" : B[1];
  return Q({ r, difficulty: d, family: "recursive-vs-iterative", prog, callNote: `called as ${name}(a, ${startText})`, prompt: `Which loop header, with System.out.print(a[i] + " ") as its body, prints the same values in the same order as ${name}(a, ${startText}) for any array a?`, answer: match[0].text(),
    distractors: others.map(l => ({ value: l.text(), mis: "loop-order-mismatch", why: `That loop visits indexes ${fmtList(l.order(A.length))} for a ${A.length}-element array; the recursion visits ${fmtList(visited)}.` })),
    explanation: `${shape === "backward-post" ? "The print happens after the recursive call, so the last index prints first" : "Each call prints a[i] and moves i"}: for a ${A.length}-element array the indexes are ${fmtList(visited)}, exactly the order produced by ${match[0].text()}.`,
    trace: [`a = ${arr(A)}`, `output: ${res.out.trim()}`], callCount: res.calls, callDepth: res.maxDepth, reasoning: `recursive-vs-iterative:${shape}`, data: { array: A },
    jvm: { method: name, observe: "loopEquivalence", recursiveCall: `${name}(a, ${startText})`, loops: Object.fromEntries([match[0], ...others].map(l => [l.text(), l.text()])), sampleSizes: [1, 2, 5, 6, 7] } });
} };
export default [linearSearch, binarySearchTrace, mergeSortTrace, quickSortTrace, selectionSort, recursiveVsIterative];
