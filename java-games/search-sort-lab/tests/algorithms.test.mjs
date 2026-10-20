/* Algorithm simulator tests: every simulator is checked against independently
   computed expectations (JS built-ins, brute force, hand-worked examples). */
import { section, ok, eq, summary, mulberry } from "./harness.mjs";
import * as A from "../engine/algorithms.js";

const randArr = (r, n, lo = -20, hi = 40) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const asc = (a) => a.slice().sort((x, y) => x - y);
const ms = (a) => asc(a).join(",");

console.log("algorithms.test.mjs");

await section("hand-worked examples from the assignment", () => {
  eq(A.selectionSort([8, 3, 6, 1, 5]).passes[0].after, [1, 3, 6, 8, 5], "selection first pass");
  eq(A.selectionSort([8, 3, 6, 1, 5]).passes[0].minIndex, 3);
  eq(A.insertionSort([4, 9, 2, 7, 5]).passes[1].after, [2, 4, 9, 7, 5], "insertion index 2");
  eq(A.mergeSort([9, 4, 7, 2, 8, 1]).result, [1, 2, 4, 7, 8, 9]);
  const b = A.binarySearch([3, 7, 11, 18, 24, 31, 45], 24);
  eq(b.steps.map((s) => s.mid), [3, 5, 4]);
  eq(b.index, 4);
  eq([b.steps[0].nextLow, b.steps[0].nextHigh], [4, 6]);
});

await section("binary search edge cases", () => {
  eq(A.binarySearch([], 5).index, -1, "empty array");
  eq(A.binarySearch([], 5).probes, 0);
  eq(A.binarySearch([7], 7).index, 0, "single hit");
  eq(A.binarySearch([7], 3).index, -1, "single miss");
  eq(A.binarySearch([2, 4], 2).index, 0, "two elements first");
  eq(A.binarySearch([2, 4], 4).index, 1, "two elements last");
  eq(A.binarySearch([2, 4], 3).index, -1);
  const odd = [1, 3, 5, 7, 9, 11, 13];
  eq(A.binarySearch(odd, 1).index, 0); eq(A.binarySearch(odd, 7).index, 3); eq(A.binarySearch(odd, 13).index, 6);
  const even = [1, 3, 5, 7, 9, 11];
  eq(A.binarySearch(even, 1).index, 0); eq(A.binarySearch(even, 11).index, 5); eq(A.binarySearch(even, 6).index, -1);
  eq(A.binarySearch(even, 0).index, -1, "below range"); eq(A.binarySearch(even, 99).index, -1, "above range");
  // negatives
  eq(A.binarySearch([-9, -4, -1, 0, 3], -4).index, 1);
  // midpoint truncation: (low+high)/2 with odd sum floors
  eq(A.binarySearch([1, 2, 3, 4], 4).steps[0].mid, 1, "(0+3)/2 = 1");
});

await section("binary search with duplicates follows the documented implementation (not first/last)", () => {
  const a = [1, 5, 5, 5, 5, 5, 9];
  eq(A.binarySearch(a, 5).index, 3, "lands on mid first");
  const b = [5, 5, 5, 5];
  eq(A.binarySearch(b, 5).index, 1, "(0+3)/2 = 1, not first (0) or last (3)");
  eq(A.binarySearch(b, 5, { bug: "mid-hi" }).index, 2, "upper midpoint lands on 2");
  const c = [2, 3, 3, 7];
  eq(A.binarySearch(c, 3).index, 1);
  eq(A.binarySearch([3, 3, 3, 3, 3], 3).index, 2);
});

await section("binary search matches brute force on 3000 random sorted arrays", () => {
  const r = mulberry(11);
  for (let t = 0; t < 3000; t++) {
    const a = asc(randArr(r, Math.floor(r() * 25), -15, 30));
    const target = -18 + Math.floor(r() * 52);
    const res = A.binarySearch(a, target);
    if (a.includes(target)) { ok(res.found && a[res.index] === target, "found index must hold target"); }
    else { eq(res.index, -1); }
    ok(res.probes <= Math.floor(Math.log2(a.length || 1)) + 1, "probes bounded by floor(log2 n)+1");
  }
});

await section("binary search defects behave as documented", () => {
  // high = mid never terminates when the target is above everything in a 2-element range
  eq(A.binarySearch([1, 2], 3, { bug: "high=mid" }).index, -1);
  eq(A.binarySearch([1, 3], 2, { bug: "low=mid" }).looped, true, "low=mid loops forever");
  eq(A.binarySearch([4], 4, { bug: "lt-high" }).index, -1, "low<high skips a lone element");
  eq(A.binarySearch([1, 2, 3], 9, { bug: "high=mid" }).looped, false);
});

await section("linear search", () => {
  eq(A.linearSearch([], 1).index, -1);
  eq(A.linearSearch([5], 5).comparisons, 1);
  eq(A.linearSearch([1, 2, 2, 3], 2).index, 1, "first occurrence");
  eq(A.linearSearch([1, 2, 3], 9).comparisons, 3, "miss compares everything");
});

const SORTS = { selection: A.selectionSort, insertion: A.insertionSort, merge: A.mergeSort };
await section("every sort: sorted result + same multiset, across structured shapes", () => {
  const r = mulberry(7);
  const shapes = { empty: () => [], one: () => [5], two: () => [9, 2], twoSorted: () => [2, 9], twoEq: () => [4, 4], sorted: () => asc(randArr(r, 12)), reverse: () => asc(randArr(r, 12)).reverse(), dups: () => randArr(r, 15, 0, 4), allEq: () => Array(7).fill(3), neg: () => randArr(r, 10, -50, -1), mixed: () => randArr(r, 17), odd: () => randArr(r, 9), even: () => randArr(r, 10), longer: () => randArr(r, 40) };
  for (const [name, f] of Object.entries(shapes)) for (let t = 0; t < 40; t++) {
    const a = f();
    const copy = a.slice();
    for (const [sn, fn] of Object.entries(SORTS)) {
      const res = fn(a);
      eq(res.result, asc(a), `${sn} sorts ${name}`);
      eq(ms(res.result), ms(a), `${sn} preserves multiset (${name})`);
      eq(a, copy, `${sn} does not mutate its input`);
    }
  }
});

await section("selection sort: intermediate states, counts, self-swaps, ties", () => {
  const r = A.selectionSort([8, 3, 6, 1, 5]);
  eq(r.passes.map((p) => p.after), [[1, 3, 6, 8, 5], [1, 3, 6, 8, 5], [1, 3, 5, 8, 6], [1, 3, 5, 6, 8]]);
  eq(r.comparisons, 10, "n(n-1)/2");
  eq(r.swaps, 4, "one swap per pass");
  eq(r.selfSwaps, 1, "pass 2 swaps 3 with itself");
  eq(r.effectiveSwaps, 3);
  // strict < keeps the earlier of equal minima
  const t = A.selectionSort([5, 2, 9, 2]);
  eq(t.passes[0].minIndex, 1, "first of equal minima");
  // already sorted: all self swaps
  const s = A.selectionSort([1, 2, 3, 4]);
  eq(s.selfSwaps, 3); eq(s.comparisons, 6);
  const r2 = mulberry(5);
  for (let t2 = 0; t2 < 300; t2++) { const a = randArr(r2, 2 + Math.floor(r2() * 10)); const n = a.length; const x = A.selectionSort(a); eq(x.comparisons, (n * (n - 1)) / 2); eq(x.passes.length, n - 1);
    // after pass k the first k entries are the k smallest, in order
    x.passes.forEach((p, k) => eq(p.after.slice(0, k + 1), asc(a).slice(0, k + 1))); }
});

await section("insertion sort: shifts vs swaps, stability, counts", () => {
  const r = A.insertionSort([4, 9, 2, 7, 5]);
  eq(r.passes.map((p) => p.after), [[4, 9, 2, 7, 5], [2, 4, 9, 7, 5], [2, 4, 7, 9, 5], [2, 4, 5, 7, 9]]);
  eq(r.shifts, 5); // 9>2,4>2 ->2 ; 9>7 ->1 ; 9>5,7>5 ->2  = 5
  eq(r.passes.map((p) => p.shifts), [0, 2, 1, 2]);
  eq(r.comparisons, 8, "pass1: 1 false; pass2: 2 true (reaches index 0); pass3: 1 true + 1 false; pass4: 2 true + 1 false = 1+2+2+3");
  eq(A.insertionSort([1, 2, 3, 4, 5]).shifts, 0, "sorted: no shifts");
  eq(A.insertionSort([1, 2, 3, 4, 5]).comparisons, 4, "sorted: n-1 comparisons");
  eq(A.insertionSort([5, 4, 3, 2, 1]).shifts, 10, "reverse: n(n-1)/2 shifts");
  eq(A.insertionSort([5, 4, 3, 2, 1]).comparisons, 10);
  // stability proxy: equal key does not pass equal element (strict >)
  const eqKeys = A.insertionSort([3, 3]);
  eq(eqKeys.shifts, 0);
  eq(A.insertionSort([3, 1, 3, 1], "ge").shifts > A.insertionSort([3, 1, 3, 1]).shifts, true, ">= shifts equal elements too");
  eq(A.insertionSort([3, 1, 2], "j>0").result, [3, 1, 2], "j>0 defect never fills index 0");
  eq(A.insertionSort([1, 3, 2], "lt").result, [3, 2, 1], "< defect sorts descending");
  const r2 = mulberry(9);
  for (let t = 0; t < 300; t++) {
    const a = randArr(r2, 1 + Math.floor(r2() * 12), 0, 9);
    const x = A.insertionSort(a);
    // shifts = number of inversions (strictly greater earlier element)
    let inv = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++;
    eq(x.shifts, inv, "shifts equal inversions");
    eq(x.comparisons, x.shifts + x.passes.filter((p) => p.compares.length && !p.compares[p.compares.length - 1].greater).length);
  }
});

await section("merge sort: splits, merge order, comparison convention, uneven sizes", () => {
  const r = A.mergeSort([9, 4, 7, 2, 8, 1]);
  const calls = r.events.filter((e) => e.type === "call").map((c) => [c.lo, c.hi]);
  eq(calls, [[0, 5], [0, 2], [0, 1], [0, 0], [1, 1], [2, 2], [3, 5], [3, 4], [3, 3], [4, 4], [5, 5]]);
  eq(r.calls, 11, "2n-1 calls");
  eq(r.merges, 5, "n-1 merges");
  eq(r.merges_list.map((m) => m.result), [[4, 9], [4, 7, 9], [2, 8], [1, 2, 8], [1, 2, 4, 7, 8, 9]]);
  eq(r.comparisons, 1 + 2 + 1 + 1 + 5, "per-merge comparison totals under the stated convention");
  // left half is the larger half for odd sizes
  const odd = A.mergeSort([5, 4, 3, 2, 1]);
  eq(odd.events[0].mid, 2); eq(odd.events[1].lo + "-" + odd.events[1].hi, "0-2");
  // ties go left (<=)
  const m = A.merge([2, 2], [2, 3]);
  eq(m.sequence.slice(0, 3).map((s) => s.from), ["left", "left", "right"], "equal values copied from left first");
  eq(m.result, [2, 2, 2, 3]);
  // leftovers copied without comparing
  eq(A.merge([1], [2, 3, 4]).comparisons, 1);
  eq(A.merge([5, 6, 7], [1]).comparisons, 1);
  eq(A.merge([], [1, 2]).comparisons, 0);
  // uneven sizes + base cases
  const u = A.mergeSort([3, 1, 2, 5, 4, 7, 6]);
  eq(u.calls, 13); eq(u.merges, 6);
  const r2 = mulberry(3);
  for (let t = 0; t < 300; t++) { const a = randArr(r2, 1 + Math.floor(r2() * 20)); const x = A.mergeSort(a); eq(x.calls, 2 * a.length - 1); eq(x.merges, a.length - 1);
    ok(x.comparisons <= x.merges_list.reduce((s, q) => s + q.left.length + q.right.length - 1, 0), "comparisons bounded");
    // every intermediate state is a permutation of the input
    x.states.forEach((s) => eq(ms(s), ms(a))); }
});

await section("operation counts agree with direct instrumentation", () => {
  const r = mulberry(21);
  for (let t = 0; t < 300; t++) {
    const a = randArr(r, 1 + Math.floor(r() * 14), 0, 12);
    // instrumented selection
    { const b = a.slice(); let c = 0; for (let i = 0; i < b.length - 1; i++) { let m = i; for (let j = i + 1; j < b.length; j++) { c++; if (b[j] < b[m]) m = j; } [b[i], b[m]] = [b[m], b[i]]; } eq(A.selectionSort(a).comparisons, c); }
    // instrumented insertion
    { const b = a.slice(); let c = 0, s = 0; for (let i = 1; i < b.length; i++) { const key = b[i]; let j = i - 1; while (j >= 0) { c++; if (!(b[j] > key)) break; b[j + 1] = b[j]; s++; j--; } b[j + 1] = key; } const x = A.insertionSort(a); eq([x.comparisons, x.shifts], [c, s]); }
    // instrumented merge
    { let c = 0; const b = a.slice(); const rec = (lo, hi) => { if (lo >= hi) return; const mid = (lo + hi) >> 1; rec(lo, mid); rec(mid + 1, hi); const L = b.slice(lo, mid + 1), R = b.slice(mid + 1, hi + 1); let i = 0, j = 0, k = lo; while (i < L.length && j < R.length) { c++; b[k++] = L[i] <= R[j] ? L[i++] : R[j++]; } while (i < L.length) b[k++] = L[i++]; while (j < R.length) b[k++] = R[j++]; }; rec(0, b.length - 1); eq(A.mergeSort(a).comparisons, c); }
  }
});

const { checks, sections } = summary();
console.log(`algorithms.test.mjs: ${checks} checks passed in ${sections.length} sections`);
