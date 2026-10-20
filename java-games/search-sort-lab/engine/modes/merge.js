/* Mode 4 — Merge Sort Trace families.
   Implementation (documented in algorithms.js and shown in the code panel):
     mid = (lo + hi) / 2 (integer division) so for odd sizes the LEFT half is larger;
     base case lo >= hi (size 0 or 1);
     merge copies the LEFT element when a[i] <= a[j] (ties go left);
     one comparison per evaluation of a[i] <= a[j]; leftovers are copied without comparing. */
import { randInt, pick, shuffle } from "../rng.js";
import { makeArray, fmt, distinctValues } from "../arrays.js";
import { mergeSort, merge } from "../algorithms.js";
import { mergeSortCode, mergeHelperCode } from "../code.js";
import { arrViz, treeViz, plural, range } from "../kit.js";
import { arrEq } from "../distractors.js";

const SKILL = { next: "Merge sort: merging two sorted halves", split: "Merge sort: splitting", calls: "Merge sort: recursive call order", count: "Merge sort: counting calls and comparisons", state: "Merge sort: array after a merge", invalid: "Merge sort: spotting incorrect merges", trace: "Merge sort: full trace", tie: "Merge sort: tie-breaking" };
export const RULE_MERGE = "mid = (lo + hi) / 2 (the left half is the larger half for an odd number of elements). The merge copies the LEFT value when left <= right, so ties go to the left.";
const code = (arr) => `${mergeSortCode}\n\n${mergeHelperCode}\n\nint[] values = ${fmt(arr)};\nmergeSort(values, 0, values.length - 1);`;
const codeLabel = "Java (the array is sorted by mergeSort(values, 0, values.length - 1))";
const set = (a) => `{${a.join(", ")}}`;
const sizeFor = (r, d) => (d === "beginner" ? randInt(r, 4, 6) : d === "intermediate" ? randInt(r, 6, 8) : randInt(r, 7, 11));
const arrayFor = (r, d) => makeArray(r, { n: sizeFor(r, d), hi: d === "beginner" ? 20 : 40, dups: d !== "beginner" && r() < 0.5, negatives: d === "advanced" && r() < 0.3, shape: pick(r, ["random", "random", "partial", "reverse"]) });
const sortedHalf = (r, n, o = {}) => makeArray(r, { n, hi: 30, dups: !!o.dups, shape: "sorted" });
const callsOf = (res) => res.events.filter((e) => e.type === "call");
const mergesOf = (res) => res.events.filter((e) => e.type === "merge");
const ordinal = (k) => ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"][k] || `#${k}`;

function splitTree(res) {
  const rows = [];
  for (const c of callsOf(res)) (rows[c.depth] = rows[c.depth] || []).push(set(c.sub));
  return rows;
}
const mergeLine = (m, idx) => `Merge ${idx}: ${set(m.left)} + ${set(m.right)} → ${set(m.result)}`;
const mergeLog = (res) => mergesOf(res).map((m, i) => mergeLine(m, i + 1));
function mergeSeqText(m) {
  const seq = m.sequence;
  const parts = seq.map((s) => (s.compared ? `${s.value} (from ${s.from}, after comparing)` : `${s.value} (from ${s.from}, leftover copied)`));
  return parts.join(", ");
}
const mViz = (left, right, i, j, out, { label = "" } = {}) => {
  const lr = {}, rr = {};
  for (let q = 0; q < i; q++) lr[q] = ["sorted"];
  for (let q = 0; q < j; q++) rr[q] = ["sorted"];
  if (i < left.length) lr[i] = ["compare"];
  if (j < right.length) rr[j] = ["compare"];
  return [arrViz(left, { roles: lr, label: "left (sorted)" }), arrViz(right, { roles: rr, label: "right (sorted)" }), arrViz(out.length ? out : [], { label: "merged so far", indices: true })];
};
/* wrong merges */
const concat = (l, r) => l.concat(r);
const alternate = (l, r) => { const o = []; for (let q = 0; q < Math.max(l.length, r.length); q++) { if (q < l.length) o.push(l[q]); if (q < r.length) o.push(r[q]); } return o; };
const rightFirst = (l, r) => r.concat(l);
const dropDup = (res) => { const a = res.slice(); if (a.length < 2) return a; a[a.length - 1] = a[a.length - 2]; return a; };
const descending = (res) => res.slice().sort((x, y) => y - x);

export const mergeFamilies = [
  {
    id: "m-next-merged",
    weight: { beginner: 3, intermediate: 1.6, advanced: 0.2 },
    build(r, d) {
      const nl = d === "beginner" ? randInt(r, 2, 4) : randInt(r, 3, 5), nr = d === "beginner" ? randInt(r, 2, 4) : randInt(r, 3, 5);
      const L = sortedHalf(r, nl, { dups: d !== "beginner" }), R = sortedHalf(r, nr, { dups: d !== "beginner" });
      const full = merge(L, R);
      const seq = full.sequence;
      const progress = d === "beginner" ? 0 : randInt(r, 1, Math.min(seq.length - 2, 4));
      let i = 0, j = 0;
      for (let q = 0; q < progress; q++) { if (seq[q].from === "left") i++; else j++; }
      const next = seq[progress];
      if (!next.compared && d !== "beginner") return null;
      const out = full.result.slice(0, progress);
      const correct = next.value;
      const otherHead = next.from === "left" ? (j < R.length ? R[j] : null) : (i < L.length ? L[i] : null);
      const cands = [
        otherHead !== null && otherHead !== correct ? { value: otherHead, why: "You picked the LARGER head. Merging copies the smaller of the two front elements, because both halves are sorted." } : null,
        { value: L[Math.min(i, L.length - 1)] === correct ? R[Math.min(j, R.length - 1)] : L[Math.min(i, L.length - 1)], why: "You always took from one side. The merge compares the two front elements each time." },
        { value: out.length ? out[out.length - 1] : L[L.length - 1], why: out.length ? "That value was already copied into the merged array." : "That is the last element of the left half, not a front element." },
        { value: L[L.length - 1], why: "That is the LAST element of the left half. Only the FRONT element of each half is compared." },
        { value: R[R.length - 1], why: "That is the LAST element of the right half. Only the FRONT element of each half is compared." },
        i + 1 < L.length ? { value: L[i + 1], why: "That skips ahead. Only the front element of each sorted half is a candidate." } : null,
        j + 1 < R.length ? { value: R[j + 1], why: "That skips ahead. Only the front element of each sorted half is a candidate." } : null,
      ].filter((c) => c);
      return {
        algorithm: "merge", skill: SKILL.next, family: "m-next-merged", rule: RULE_MERGE,
        stem: progress === 0 ? "The two halves below are sorted and are about to be merged. Which value is copied into the merged array first?" : `The merge is partly done. Which value is copied into the merged array next?`,
        code: mergeHelperCode, codeKind: "methods", codeLabel: "Java (merge helper)",
        visuals: mViz(L, R, i, j, out),
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 1, why: "That value is not at the front of either half." }],
        explanation: [`Front elements: left ${i < L.length ? L[i] : "—"}, right ${j < R.length ? R[j] : "—"}. ${next.from === "left" ? "left <= right" : "right < left"}, so ${correct} is copied from the ${next.from}.`], trace: [mergeSeqText({ sequence: seq })],
        spec: { op: "mrg-next", left: L, right: R, progress },
        meta: { reasoning: d === "beginner" ? "one-step" : "multi-step", steps: progress + 1, arrayLength: nl + nr, comparisons: progress + 1 },
      };
    },
  },
  {
    id: "m-merge-result",
    weight: { beginner: 2, intermediate: 2.2, advanced: 1 },
    build(r, d) {
      const nl = d === "advanced" ? randInt(r, 3, 6) : d === "beginner" ? randInt(r, 2, 3) : randInt(r, 2, 4), nr = d === "advanced" ? randInt(r, 2, 6) : d === "beginner" ? randInt(r, 2, 3) : randInt(r, 2, 4);
      const L = sortedHalf(r, nl, { dups: d !== "beginner" && r() < 0.6 }), R = sortedHalf(r, nr, { dups: d !== "beginner" && r() < 0.6 });
      const m = merge(L, R);
      if (arrEq(m.result, concat(L, R)) || arrEq(m.result, rightFirst(L, R))) return null;
      const correct = m.result;
      const cands = [
        { value: concat(L, R), why: "That just places the left half before the right half. Merging interleaves the two sorted halves by comparing front elements." },
        { value: alternate(L, R), why: "That alternates left, right, left, right. A merge takes whichever front element is smaller each time." },
        { value: rightFirst(L, R), why: "That places the right half first. Neither half is simply placed whole before the other." },
        { value: dropDup(correct), why: "That loses an element and repeats another. Every element of both halves must appear exactly once." },
        { value: descending(correct), why: "A merge of two ascending halves produces ascending order." },
      ];
      return {
        algorithm: "merge", skill: SKILL.next, family: "m-merge-result", rule: RULE_MERGE,
        stem: "What is the result of merging these two sorted halves?",
        code: mergeHelperCode, codeKind: "methods", codeLabel: "Java (merge helper)",
        visuals: [arrViz(L, { label: "left (sorted)" }), arrViz(R, { label: "right (sorted)" })],
        answerKind: "array", correct, candidates: cands, fallbacks: [],
        explanation: [`Repeatedly copy the smaller front element: ${mergeSeqText(m)}.`], trace: [],
        reveal: [arrViz(correct, { label: "merged" })],
        spec: { op: "mrg-result", left: L, right: R },
        meta: { reasoning: d === "beginner" ? "one-step" : "multi-step", steps: nl + nr, arrayLength: nl + nr, comparisons: m.comparisons },
      };
    },
  },
  {
    id: "m-split",
    weight: { beginner: 1.6, intermediate: 2, advanced: 0 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const mid = Math.floor((n - 1) / 2);
      const left = arr.slice(0, mid + 1), right = arr.slice(mid + 1);
      const asked = d === "beginner" || r() < 0.5 ? "halves" : "sizes";
      if (asked === "halves") {
        const correct = `${set(left)} and ${set(right)}`;
        const cands = [
          n % 2 ? { value: `${set(arr.slice(0, mid))} and ${set(arr.slice(mid))}`, why: "That makes the RIGHT half larger. With mid = (lo + hi) / 2, the left half gets the extra element." } : null,
          { value: `${set(arr.filter((_, i) => i % 2 === 0))} and ${set(arr.filter((_, i) => i % 2 === 1))}`, why: "That splits by even and odd positions. Merge sort splits at the middle index, keeping neighbors together." },
          { value: `${set([...arr].sort((a, b) => a - b).slice(0, mid + 1))} and ${set([...arr].sort((a, b) => a - b).slice(mid + 1))}`, why: "That splits by value (smallest vs largest). Merge sort splits by position and sorts later, while merging." },
          { value: `${set(arr.slice(0, Math.ceil(n / 2) + (n % 2 === 0 ? 1 : 0)))} and ${set(arr.slice(Math.ceil(n / 2) + (n % 2 === 0 ? 1 : 0)))}`, why: "That cuts one position too far." },
          { value: `${set(arr.slice(0, Math.max(1, mid)))} and ${set(arr.slice(Math.max(1, mid)))}`, why: "That cuts one position too early." },
        ].filter((c) => c);
        return {
          algorithm: "merge", skill: SKILL.split, family: "m-split", variant: "halves", rule: RULE_MERGE,
          stem: "mergeSort(values, 0, values.length - 1) is called. What are the two subarrays of the first split (the ranges passed to the two recursive calls)?",
          code: code(arr), codeKind: "methods", codeLabel,
          visuals: [arrViz(arr, { label: "values" })], answerKind: "text", correct, candidates: cands, fallbacks: [],
          explanation: [`mid = (0 + ${n - 1}) / 2 = ${mid}. The recursive calls handle indexes 0..${mid} and ${mid + 1}..${n - 1}: ${correct}.`], trace: [],
          reveal: [treeViz(splitTree(mergeSort(arr)), "all splits")],
          spec: { op: "mrg-split", arr },
          meta: { reasoning: d === "beginner" ? "one-step" : "multi-step", steps: 2, arrayLength: n, comparisons: 0 },
        };
      }
      const correct = `left ${left.length}, right ${right.length}`;
      const sz = (a, b) => `left ${a}, right ${b}`;
      const cands = [
        { value: sz(right.length, left.length), why: "You gave the extra element to the right. mid = (lo + hi) / 2 rounds down, so the left half is larger when n is odd." },
        { value: sz(left.length + 1, right.length - 1), why: "That cuts one position too far." },
        { value: sz(left.length - 1, right.length + 1), why: "That cuts one position too early." },
        { value: sz(n, 0), why: "A split makes two non-empty parts when n >= 2." },
        { value: sz(Math.ceil(n / 2), Math.ceil(n / 2)), why: "The two parts together must contain all " + n + " elements." },
      ];
      return {
        algorithm: "merge", skill: SKILL.split, family: "m-split", variant: "sizes", rule: RULE_MERGE,
        stem: `mergeSort is called on ${n} elements. How many elements go into the left and right recursive calls at the first split?`,
        code: code(arr), codeKind: "methods", codeLabel, visuals: [arrViz(arr, { label: "values" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: [`mid = (0 + ${n - 1}) / 2 = ${mid}. Left = indexes 0..${mid} (${left.length} elements); right = indexes ${mid + 1}..${n - 1} (${right.length} elements).`], trace: [],
        reveal: [treeViz(splitTree(mergeSort(arr)), "all splits")],
        spec: { op: "mrg-split-sizes", n },
        meta: { reasoning: "multi-step", steps: 2, arrayLength: n, comparisons: 0 },
      };
    },
  },
  {
    id: "m-base-case",
    weight: { beginner: 1.8, intermediate: 0, advanced: 0 },
    build(r, d) {
      const n = randInt(r, 5, 8);
      const arr = arrayFor(r, d);
      const res = mergeSort(arr);
      const calls = callsOf(res);
      const bases = calls.filter((c) => c.base), splits = calls.filter((c) => !c.base);
      if (splits.length < 3) return null;
      const correct = (() => { const c = pick(r, bases); return `mergeSort(values, ${c.lo}, ${c.hi})`; })();
      const asText = (c) => `mergeSort(values, ${c.lo}, ${c.hi})`;
      const cands = shuffle(r, splits).slice(0, 3).map((c) => ({ value: asText(c), why: `This call covers ${c.hi - c.lo + 1} elements (indexes ${c.lo} to ${c.hi}), so lo < hi and it splits again. Only a single element stops the recursion.` }));
      return {
        algorithm: "merge", skill: SKILL.split, family: "m-base-case", rule: RULE_MERGE,
        stem: `The array has ${arr.length} elements. Which of these recursive calls is a BASE CASE, one that returns without splitting?`,
        code: mergeSortCode + "\n\n" + mergeHelperCode, codeKind: "methods", codeLabel: "Java (mergeSort and merge)",
        visuals: [arrViz(arr, { label: "values" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: [`The base case is if (lo >= hi) return;. ${correct} has lo = hi (one element), so it returns immediately.`, "Every other call here covers two or more elements, so it calls mergeSort on its two halves."],
        trace: [], reveal: [treeViz(splitTree(res), "split tree: the bottom row is all base cases")],
        spec: { op: "mrg-base-case", options: [correct].concat(cands.map((c) => c.value)) },
        meta: { reasoning: "one-step", steps: 2, arrayLength: arr.length, calls: 1, comparisons: 0 },
      };
    },
  },
  {
    id: "m-pair-sorted",
    weight: { beginner: 1.8, intermediate: 0, advanced: 0 },
    build(r, d) {
      const nl = randInt(r, 2, 3), nr = randInt(r, 2, 3);
      const okL = sortedHalf(r, nl), okR = sortedHalf(r, nr);
      const unsorted = (a) => { for (let t = 0; t < 30; t++) { const b = shuffle(r, a); if (!b.every((v, i) => i === 0 || b[i - 1] <= v)) return b; } return null; };
      const uL = unsorted(sortedHalf(r, nl)), uR = unsorted(sortedHalf(r, nr)), uL2 = unsorted(sortedHalf(r, nr)), uR2 = unsorted(sortedHalf(r, nl));
      if (!uL || !uR || !uL2 || !uR2) return null;
      const pair = (a, b) => `${set(a)} and ${set(b)}`;
      const correct = pair(okL, okR);
      const cands = [
        { value: pair(uL, okR), why: `The left half ${set(uL)} is not in ascending order. merge assumes BOTH halves are already sorted.` },
        { value: pair(okL, uR), why: `The right half ${set(uR)} is not in ascending order. merge assumes BOTH halves are already sorted.` },
        { value: pair(uL2, uR2), why: "Neither half is sorted. The merge would copy values in the wrong order." },
      ];
      return {
        algorithm: "merge", skill: SKILL.next, family: "m-pair-sorted", rule: RULE_MERGE,
        stem: "The merge method copies the smaller front element each time. For which pair of halves does it produce a correctly sorted result?",
        code: mergeHelperCode, codeKind: "methods", codeLabel: "Java (merge helper)",
        visuals: [], answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: ["merge only compares the FRONT of each half, so it works only when each half is already sorted.", `${correct}: both halves are in ascending order. Merged: ${set(merge(okL, okR).result)}.`],
        trace: [], spec: { op: "mrg-pair-sorted", options: [correct].concat(cands.map((c) => c.value)), pairs: [[okL, okR], [uL, okR], [okL, uR], [uL2, uR2]] },
        meta: { reasoning: "one-step", steps: 3, arrayLength: nl + nr, comparisons: 0 },
      };
    },
  },
  {
    id: "m-kth-call",
    weight: { beginner: 0, intermediate: 2.4, advanced: 2.2 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const res = mergeSort(arr);
      const calls = callsOf(res);
      const k = randInt(r, 3, Math.min(calls.length - 1, d === "intermediate" ? 6 : 9));
      const call = calls[k - 1];
      const correct = `mergeSort(values, ${call.lo}, ${call.hi}) → ${set(call.sub)}`;
      const level = []; // breadth-first order
      const byDepth = calls.slice().sort((a, b) => a.depth - b.depth || a.lo - b.lo);
      const rightFirst = (() => { const out = []; const f = (lo, hi) => { out.push([lo, hi]); if (hi - lo < 1) return; const mid = Math.floor((lo + hi) / 2); f(mid + 1, hi); f(lo, mid); }; f(0, n - 1); return out; })();
      const fmtCall = (lo, hi) => `mergeSort(values, ${lo}, ${hi}) → ${set(arr.slice(lo, hi + 1))}`;
      const cands = [
        { value: fmtCall(byDepth[k - 1].lo, byDepth[k - 1].hi), why: "That lists calls level by level. Recursion goes DEEP first: each left call keeps splitting before the right call starts." },
        { value: fmtCall(rightFirst[k - 1][0], rightFirst[k - 1][1]), why: "That runs the RIGHT recursive call before the left one. The code calls mergeSort on the left half first." },
        { value: fmtCall(calls[k - 2].lo, calls[k - 2].hi), why: "That is the previous call. Count the calls in the order they begin." },
        { value: fmtCall(calls[Math.min(k, calls.length - 1)].lo, calls[Math.min(k, calls.length - 1)].hi), why: "That is the next call, one later than you were asked." },
      ];
      return {
        algorithm: "merge", skill: SKILL.calls, family: "m-kth-call", rule: RULE_MERGE + " Count the original call as call #1 and every recursive call, including base cases, in the order the calls begin.",
        stem: `Counting the original call as #1, which call is call #${k} to begin?`,
        code: code(arr), codeKind: "methods", codeLabel, visuals: [arrViz(arr, { label: "values" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: [`Calls in order: ${calls.slice(0, k + 1).map((c, i) => `#${i + 1} (${c.lo}..${c.hi})`).join(", ")}...`, "Merge sort finishes the entire left half (all its deeper calls) before starting the right half."],
        trace: calls.map((c, i) => `#${i + 1}: mergeSort(values, ${c.lo}, ${c.hi}) → ${set(c.sub)}${c.base ? " (base case)" : ""}`),
        reveal: [treeViz(splitTree(res), "split tree (each row is one depth)")],
        spec: { op: "mrg-kth-call", arr, k },
        meta: { reasoning: "multi-step", steps: k, arrayLength: n, calls: k, comparisons: 0 },
      };
    },
  },
  {
    id: "m-count-calls",
    weight: { beginner: 0, intermediate: 2, advanced: 1.6 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const res = mergeSort(arr);
      const kind = pick(r, ["calls", "merges", "base"]);
      const val = kind === "calls" ? res.calls : kind === "merges" ? res.merges : n;
      const stem = kind === "calls" ? `How many times is mergeSort called in total (including the original call and all base-case calls)?` : kind === "merges" ? "How many times is merge(...) called during the whole sort?" : "How many calls are base cases (the call returns immediately because lo >= hi)?";
      const cands = [
        { value: kind === "calls" ? 2 * n : kind === "merges" ? n : n - 1, why: kind === "calls" ? "That is 2n. A binary tree with n leaves has 2n − 1 nodes (the original call counts once)." : kind === "merges" ? "That would be one merge per element. Each merge combines two parts into one, so n elements need n − 1 merges." : "That is the number of merges, not base-case calls." },
        { value: kind === "calls" ? n : n - 1 === val ? n : n - 1, why: kind === "calls" ? "That counts only the base cases (one per element). Calls that split are also calls." : "That counts one fewer or the wrong kind of call." },
        { value: kind === "base" ? res.merges : Math.floor(n / 2), why: "That does not match the recursion: every element ends up alone in a base case." },
        { value: kind === "calls" ? 2 * n - 2 : kind === "merges" ? n + 1 : n + 1, why: "Off by one from the true count." },
        { value: res.maxDepth + 1, why: "That is the number of LEVELS in the recursion tree, not the number of calls." },
        { value: n * 2 - 1 === val ? n + 2 : n * 2 - 1, why: kind === "calls" ? "That is a miscount of the splitting calls." : "That counts every call to mergeSort, but only some calls reach merge." },
      ];
      return {
        algorithm: "merge", skill: SKILL.count, family: "m-count-calls", variant: kind, rule: RULE_MERGE,
        stem, code: code(arr), codeKind: "methods", codeLabel, visuals: [arrViz(arr, { label: "values" })],
        answerKind: "int", correct: val, candidates: cands, fallbacks: [{ value: val + 2, why: "Two more than the true count." }],
        explanation: [kind === "calls" ? `${n} elements give ${n} base-case calls and ${res.merges} splitting calls: ${res.calls} in all.` : kind === "merges" ? `Each merge joins two parts; ${n} single elements need ${n - 1} merges.` : `Every single element reaches a base case once: ${n}.`], trace: [],
        reveal: [treeViz(splitTree(res), "split tree (each row is one depth)")],
        spec: { op: "mrg-count", arr, kind },
        meta: { reasoning: "count", steps: res.calls, arrayLength: n, calls: res.calls, comparisons: res.comparisons },
      };
    },
  },
  {
    id: "m-after-merge",
    weight: { beginner: 0, intermediate: 2.6, advanced: 2.4 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const res = mergeSort(arr);
      const ms = mergesOf(res);
      const k = randInt(r, 2, Math.min(ms.length - 1, d === "intermediate" ? 4 : 7));
      const correct = ms[k - 1].state;
      const afterPrev = ms[k - 2].state;
      const m = ms[k - 1];
      const levelOrder = ms.slice().sort((a, b) => b.depth - a.depth || a.lo - b.lo);
      // wrong: apply merges bottom-up level by level instead of recursion order
      let lvl = arr.slice(); for (let q = 0; q < k; q++) { const e = levelOrder[q]; const part = lvl.slice(e.lo, e.hi + 1).sort((a, b) => a - b); for (let t = 0; t < part.length; t++) lvl[e.lo + t] = part[t]; }
      const unmerged = correct.slice(); // wrong: merged range left in original order
      for (let t = m.lo; t <= m.hi; t++) unmerged[t] = afterPrev[t];
      const concatBad = correct.slice(); concat(m.left, m.right).forEach((v, t) => (concatBad[m.lo + t] = v));
      const cands = [
        { value: afterPrev, why: "That is the array BEFORE this merge. The k-th merge has already written its result back." },
        { value: lvl, why: "That does the merges level by level. Recursion merges as soon as both halves are finished, working depth-first." },
        { value: concatBad, why: "That writes the two halves one after the other without merging them." },
        { value: ms[Math.min(k, ms.length - 1)].state, why: "That is the array after the NEXT merge." },
        { value: res.result, why: "That is the fully sorted array. Only " + k + " of " + ms.length + " merges are done." },
      ];
      return {
        algorithm: "merge", skill: SKILL.state, family: "m-after-merge", rule: RULE_MERGE + " Merges are numbered in the order they happen.",
        stem: `What is the whole array right after merge #${k} finishes writing its result back into values?`,
        code: code(arr), codeKind: "methods", codeLabel, visuals: [arrViz(arr, { label: "values at the start" })],
        answerKind: "array", correct, candidates: cands, fallbacks: [],
        explanation: mergeLog(res).slice(0, k).concat([`After merge #${k}, the array is ${set(correct)}.`]), trace: mergeLog(res),
        reveal: [treeViz(splitTree(res), "split tree"), arrViz(correct, { label: `after merge #${k}`, roles: Object.fromEntries(range(m.lo, m.hi).map((i) => [i, ["sorted"]])) })],
        spec: { op: "mrg-after-merge", arr, k },
        meta: { reasoning: "multi-step", steps: res.events.slice(0, res.events.indexOf(m) + 1).length, arrayLength: arr.length, calls: callsOf(res).length, comparisons: ms.slice(0, k).reduce((s, x) => s + x.comparisons, 0), states: k },
      };
    },
  },
  {
    id: "m-compares",
    weight: { beginner: 0, intermediate: 1.4, advanced: 2.2 },
    build(r, d) {
      const kind = d === "intermediate" ? "one-merge" : pick(r, ["total", "one-merge", "sources"]);
      if (kind === "sources") {
        const nl = randInt(r, 3, 5), nr = randInt(r, 3, 5);
        let L, R, m;
        for (let t = 0; t < 40; t++) { L = sortedHalf(r, nl, { dups: true }); R = sortedHalf(r, nr, { dups: true }); if (L.some((v) => R.includes(v))) break; }
        if (!L.some((v) => R.includes(v))) return null;
        m = merge(L, R);
        const src = (seq) => seq.slice(0, 6).map((s) => s.from[0].toUpperCase()).join("");
        const correct = src(m.sequence);
        // wrong tie rule: right wins ties
        const alt = (() => { const out = []; let i = 0, j = 0; while (i < L.length && j < R.length) { if (L[i] < R[j]) { out.push({ from: "left" }); i++; } else { out.push({ from: "right" }); j++; } } while (i++ < L.length) out.push({ from: "left" }); while (j++ < R.length) out.push({ from: "right" }); return out; })();
        const cands = [
          { value: src(alt), why: "That gives equal values to the RIGHT half. The code tests a[i] <= a[j], so ties go to the LEFT." },
          { value: src(m.sequence.slice().map((s) => ({ from: s.from === "left" ? "right" : "left" }))), why: "That swaps left and right everywhere." },
          { value: src(Array.from({ length: 6 }, (_, q) => ({ from: q % 2 ? "right" : "left" }))), why: "That simply alternates. Which side is copied depends on the values." },
          { value: "LLLLLL".slice(0, Math.min(6, m.sequence.length)), why: "That copies only from the left half; the right half's smaller values are interleaved." },
          { value: "RRRRRR".slice(0, Math.min(6, m.sequence.length)), why: "That copies only from the right half; the left half's smaller values are interleaved." },
        ];
        return {
          algorithm: "merge", skill: SKILL.tie, family: "m-compares", variant: "sources", rule: RULE_MERGE,
          stem: `The halves contain equal values. For the first ${Math.min(6, m.sequence.length)} copies, which side (L = left, R = right) does each value come from?`,
          code: mergeHelperCode, codeKind: "methods", codeLabel: "Java (merge helper)",
          visuals: [arrViz(L, { label: "left (sorted)" }), arrViz(R, { label: "right (sorted)" })],
          answerKind: "text", correct, candidates: cands, fallbacks: [{ value: correct.split("").reverse().join(""), why: "That is the right sequence reversed." }],
          explanation: [mergeSeqText(m), `The merge uses <=, so when front elements are equal, the left one is copied first.`], trace: [],
          reveal: [arrViz(m.result, { label: "merged" })],
          spec: { op: "mrg-sources", left: L, right: R },
          meta: { reasoning: "evidence", steps: Math.min(6, m.sequence.length) + 1, arrayLength: nl + nr, comparisons: m.comparisons },
        };
      }
      const arr = arrayFor(r, d);
      const res = mergeSort(arr);
      const rule = "Count each evaluation of a[i] <= a[j] in the first while loop of merge. Copying leftover elements is not a comparison.";
      if (kind === "one-merge") {
        const ms = mergesOf(res);
        const pickM = ms.filter((m) => m.left.length + m.right.length >= 4);
        const m = pick(r, pickM.length ? pickM : ms);
        const idx = ms.indexOf(m) + 1;
        const correct = m.comparisons;
        const total = m.left.length + m.right.length;
        const cands = [
          { value: total, why: "That counts every element copied. Leftovers copied after one side runs out involve no comparison." },
          { value: total - 1, why: "That is the MOST comparisons a merge could need. This merge ends earlier because one side runs out first." },
          { value: Math.min(m.left.length, m.right.length), why: "That is the size of the shorter half, which is not how many comparisons happen." },
          { value: total + 1, why: "A merge never needs more comparisons than elements." },
        ];
        return {
          algorithm: "merge", skill: SKILL.count, family: "m-compares", variant: "one-merge", rule,
          stem: `How many comparisons (a[i] <= a[j]) does merge #${idx} make: merging ${set(m.left)} and ${set(m.right)}?`,
          code: code(arr), codeKind: "methods", codeLabel, visuals: [arrViz(m.left, { label: "left (sorted)" }), arrViz(m.right, { label: "right (sorted)" })],
          answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true count." }],
          explanation: [mergeSeqText(m), `${plural(correct, "comparison")} before one side ran out.`], trace: mergeLog(res),
          spec: { op: "mrg-compares-one", left: m.left, right: m.right },
          meta: { reasoning: "count", steps: total, arrayLength: total, comparisons: correct, calls: 1 },
        };
      }
      const correct = res.comparisons;
      const n = arr.length;
      const cands = [
        { value: res.merges_list.reduce((s, m) => s + m.left.length + m.right.length - 1, 0), why: "That assumes every merge makes its maximum (total − 1) comparisons. Merges end early when one half runs out." },
        { value: res.merges_list.reduce((s, m) => s + m.left.length + m.right.length, 0), why: "That counts every element copied in every merge, not just the comparisons." },
        { value: res.merges, why: "That is the number of merges, not the number of comparisons." },
        { value: (n * (n - 1)) / 2, why: "That is selection sort's comparison count. Merge sort usually needs far fewer." },
      ];
      return {
        algorithm: "merge", skill: SKILL.count, family: "m-compares", variant: "total", rule,
        stem: "How many comparisons a[i] <= a[j] does the whole merge sort make on this array?",
        code: code(arr), codeKind: "methods", codeLabel, visuals: [arrViz(arr, { label: "values at the start" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true count." }, { value: Math.max(1, correct - 1), why: "One fewer than the true count." }],
        explanation: [`Comparisons per merge: ${res.merges_list.map((m) => m.comparisons).join(" + ")} = ${correct}.`].concat(mergeLog(res)), trace: mergeLog(res),
        reveal: [treeViz(splitTree(res), "split tree")],
        spec: { op: "mrg-compares-total", arr },
        meta: { reasoning: "count", steps: res.merges + correct, arrayLength: n, comparisons: correct, calls: res.calls },
      };
    },
  },
  {
    id: "m-invalid-merge",
    weight: { beginner: 0, intermediate: 0.8, advanced: 2.6 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const res = mergeSort(arr);
      const ms = mergesOf(res).filter((m) => m.left.length + m.right.length >= (d === "advanced" ? 3 : 2));
      if (ms.length < 4) return null;
      const chosen = shuffle(r, ms).slice(0, 4);
      const badIdx = randInt(r, 0, 3);
      const m = chosen[badIdx];
      const wrongs = shuffle(r, [["concatenated the halves instead of merging", concat(m.left, m.right)], ["dropped one element and repeated another", dropDup(m.result)], ["put the largest value first (descending)", descending(m.result)], ["copied the right half first", rightFirst(m.left, m.right)]]);
      const w = wrongs.find(([, a]) => !arrEq(a, m.result));
      if (!w) return null;
      const labels = ["A", "B", "C", "D"];
      const shown = chosen.map((x, i) => (i === badIdx ? w[1] : x.result));
      const correct = `Merge ${labels[badIdx]}`;
      const cands = labels.filter((_, i) => i !== badIdx).map((l) => ({ value: `Merge ${l}`, why: `Merge ${l} is a correct merge: its output is sorted and contains exactly the elements of both halves.` }));
      return {
        algorithm: "merge", skill: SKILL.invalid, family: "m-invalid-merge", rule: RULE_MERGE,
        stem: "Each row shows two sorted halves and the output of merging them. Exactly one output is wrong. Which merge is incorrect?",
        code: mergeHelperCode, codeKind: "methods", codeLabel: "Java (merge helper)",
        visuals: chosen.map((x, i) => arrViz(shown[i], { label: `Merge ${labels[i]}: left ${set(x.left)} + right ${set(x.right)} →`, indices: false })),
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: [`Merge ${labels[badIdx]} is wrong: the student ${w[0]}.`, `The correct output is ${set(m.result)}.`], trace: mergeLog(res),
        spec: { op: "mrg-invalid", rows: chosen.map((x, i) => ({ left: x.left, right: x.right, shown: shown[i] })), bad: badIdx },
        meta: { reasoning: d === "advanced" ? "debug" : "multi-step", steps: chosen.reduce((s, x) => s + x.left.length + x.right.length, 0), arrayLength: arr.length, comparisons: 0, calls: 4 },
      };
    },
  },
  {
    id: "m-full-trace",
    weight: { beginner: 0, intermediate: 0.5, advanced: 2.6 },
    build(r, d) {
      const n = d === "advanced" ? randInt(r, 5, 7) : randInt(r, 5, 6);
      const arr = makeArray(r, { n, hi: 30, dups: r() < 0.4, shape: pick(r, ["random", "random", "reverse"]) });
      const res = mergeSort(arr);
      const correct = mergeLog(res);
      // wrong 1: right half larger split
      const altSplit = (() => { const log = []; const a = arr.slice(); const f = (lo, hi) => { if (hi - lo < 1) return; const leftSize = Math.floor((hi - lo + 1) / 2); const mm = lo + leftSize - 1; f(lo, mm); f(mm + 1, hi); const l = a.slice(lo, mm + 1), rr = a.slice(mm + 1, hi + 1); const mg = merge(l, rr).result; for (let q = 0; q < mg.length; q++) a[lo + q] = mg[q]; log.push(`Merge ${log.length + 1}: ${set(l)} + ${set(rr)} → ${set(mg)}`); }; f(0, n - 1); return log; })();
      const levelOrder = (() => { const ms = mergesOf(res).slice().sort((a, b) => b.depth - a.depth || a.lo - b.lo); return ms.map((m, i) => mergeLine(m, i + 1)); })();
      const rightFirstLog = (() => { const log = []; const a = arr.slice(); const f = (lo, hi) => { if (hi - lo < 1) return; const mid = Math.floor((lo + hi) / 2); f(mid + 1, hi); f(lo, mid); const l = a.slice(lo, mid + 1), rr = a.slice(mid + 1, hi + 1); const mg = merge(l, rr).result; for (let q = 0; q < mg.length; q++) a[lo + q] = mg[q]; log.push(`Merge ${log.length + 1}: ${set(l)} + ${set(rr)} → ${set(mg)}`); }; f(0, n - 1); return log; })();
      const cands = [
        { value: altSplit, why: n % 2 ? "This trace gives the extra element to the RIGHT half. With mid = (lo + hi) / 2 the left half is larger." : "" },
        { value: levelOrder, why: "This lists the merges level by level. Recursion merges depth-first: the entire left side finishes before the right side starts." },
        { value: rightFirstLog, why: "This processes the RIGHT half first. The code calls mergeSort on the left half first." },
        { value: correct.slice().reverse().map((l, i) => l.replace(/^Merge \d+/, `Merge ${i + 1}`)), why: "This lists the merges in reverse order." },
      ].filter((c) => c.why);
      return {
        algorithm: "merge", skill: SKILL.trace, family: "m-full-trace", rule: RULE_MERGE,
        stem: "Which list shows every merge, in the order the program performs them?",
        code: code(arr), codeKind: "methods", codeLabel, visuals: [arrViz(arr, { label: "values at the start" })],
        answerKind: "lines", correct, candidates: cands, fallbacks: [],
        explanation: correct, trace: correct, reveal: [treeViz(splitTree(res), "split tree")],
        spec: { op: "mrg-full-trace", arr },
        meta: { reasoning: "full-trace", steps: res.calls, arrayLength: n, calls: res.calls, comparisons: res.comparisons, states: res.merges },
      };
    },
  },
];
