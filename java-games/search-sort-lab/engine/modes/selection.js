/* Mode 2 — Trace Selection Sort families.
   Convention (always stated to the student): the swap executes on EVERY outer
   pass, even when minIndex == i (a harmless self-swap). The inner comparison is
   strict (a[j] < a[minIndex]), so on ties the EARLIER index stays the minimum. */
import { randInt, pick, shuffle } from "../rng.js";
import { makeArray, fmt } from "../arrays.js";
import { selectionSort, insertionSort } from "../algorithms.js";
import { selectionLoop } from "../code.js";
import { arrViz, plural, range } from "../kit.js";
import { arrEq } from "../distractors.js";

const SKILL = { min: "Selection sort: finding the minimum", pass: "Selection sort: array after a pass", swap: "Selection sort: swaps", count: "Selection sort: counting work", region: "Selection sort: sorted region", invalid: "Selection sort: spotting incorrect steps", trace: "Selection sort: full trace", loops: "Selection sort: nested-loop tracking" };
export const RULE_SEL = "Selection sort here always swaps once per pass (even a swap of an element with itself) and uses a strict < comparison, so ties keep the earlier index.";

const sizeFor = (r, d) => (d === "beginner" ? randInt(r, 4, 5) : d === "intermediate" ? randInt(r, 6, 8) : randInt(r, 7, 10));
const arrayFor = (r, d, { dups } = {}) => {
  const n = sizeFor(r, d);
  const unsortedShape = () => makeArray(r, { n, hi: d === "beginner" ? 15 : 40, dups: dups ?? (d !== "beginner" && r() < 0.5), negatives: d !== "beginner" && r() < 0.4, shape: pick(r, ["random", "random", "partial", "nearly", "reverse"]) });
  for (let t = 0; t < 50; t++) {
    const a = unsortedShape();
    if (selectionSort(a).effectiveSwaps >= Math.min(2, n - 2)) return a;
  }
  return unsortedShape();
};
/* one outer pass applied to a given state */
export function selPass(state, i) {
  const a = state.slice();
  let m = i;
  for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;
  [a[i], a[m]] = [a[m], a[i]];
  return a;
}
const selFirstSmaller = (state, i) => {
  const a = state.slice();
  let m = i;
  for (let j = i + 1; j < a.length; j++) if (a[j] < a[i]) { m = j; break; }
  [a[i], a[m]] = [a[m], a[i]];
  return a;
};
const selSwapEvery = (state, i) => {
  const a = state.slice();
  for (let j = i + 1; j < a.length; j++) if (a[j] < a[i]) [a[i], a[j]] = [a[j], a[i]];
  return a;
};
const selNoSwap = (state) => state.slice();
const upTo = (arr, k, f) => { let s = arr.slice(); for (let i = 0; i < k; i++) s = f(s, i); return s; };
const insAfter = (arr, k) => insertionSort(arr).passes[Math.min(k, arr.length - 1) - 1]?.after;
const ordinal = (k) => ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"][k] || `#${k}`;

const pViz = (arr, { sortedTo = 0, min = null, j = null, label = "" } = {}) => {
  const roles = {};
  const add = (i, x) => (roles[i] = (roles[i] || []).concat(x));
  for (let i = 0; i < sortedTo; i++) add(i, "sorted");
  if (min !== null) add(min, "min");
  if (j !== null) add(j, "compare");
  return arrViz(arr, { roles, label });
};
export function passText(p) {
  const parts = [`Pass ${p.pass} (i = ${p.i}): minIndex starts at ${p.i} (value ${p.before[p.i]}).`];
  const changes = p.compares.filter((c) => c.smaller);
  if (changes.length) parts.push(changes.map((c) => `a[${c.j}] = ${c.aj} < ${c.amin} → minIndex = ${c.j}`).join("; ") + ".");
  else parts.push("No element is smaller, so minIndex stays " + p.i + ".");
  parts.push(p.selfSwap ? `The swap a[${p.i}] ↔ a[${p.minIndex}] swaps the element with itself (no change).` : `Swap a[${p.i}] and a[${p.minIndex}] → {${p.after.join(", ")}}.`);
  return parts.join(" ");
}
const fullTrace = (res) => res.passes.map(passText);
const baseCode = (arr) => `int[] values = ${fmt(arr)};\n\n${selectionLoop()}`;
const codeLabel = "Java statements (values is the array being sorted)";
const stateAt = (res, arr, k) => (k === 0 ? arr : res.passes[k - 1].after);

export const selectionFamilies = [
  {
    id: "s-min-index",
    weight: { beginner: 3, intermediate: 1.5, advanced: 0.2 },
    build(r, d) {
      const arr = arrayFor(r, d, { dups: d === "beginner" ? false : undefined });
      const res = selectionSort(arr);
      const k = d === "beginner" ? 1 : randInt(r, 1, Math.min(3, arr.length - 2));
      const p = res.passes[k - 1];
      const start = p.before;
      const i = p.i;
      const correct = p.minIndex;
      const firstSmaller = start.findIndex((v, j) => j > i && v < start[i]);
      const lastSeen = start.length - 1;
      const globalMinIdx = start.indexOf(Math.min(...start));
      const lastMinIdx = start.lastIndexOf(Math.min(...start.slice(i)));
      const cands = [
        { value: firstSmaller >= 0 ? firstSmaller : null, why: "You stopped at the first element smaller than a[i]. The inner loop keeps scanning to the END of the unsorted part to find the smallest value." },
        { value: i, why: "minIndex starts at i, but the inner loop updates it whenever a smaller value is found." },
        { value: lastSeen, why: "That is just the last index scanned. minIndex is the index of the smallest value found, not the last one checked." },
        { value: globalMinIdx, why: "You looked at the whole array. Pass " + k + " only searches indexes " + (i + 1) + " to " + (start.length - 1) + " (the sorted part stays put)." },
        { value: start[correct], why: "That is the smallest VALUE. minIndex holds its index." },
        { value: correct + 1, why: "You counted positions from 1. Java indexes start at 0." },
        { value: i + 1, why: "That is where the inner loop STARTS (j = i + 1), not where the smallest value was found." },
        { value: lastMinIdx, why: "With equal values, the strict < test keeps the EARLIER index; it does not move to a later equal value." },
      ];
      return {
        algorithm: "selection", skill: SKILL.min, family: "s-min-index", rule: RULE_SEL,
        stem: `Pass ${k} (i = ${i}) has just finished its inner loop. What is minIndex?`,
        code: baseCode(arr), codeLabel,
        visuals: [pViz(start, { sortedTo: i, label: `values at the start of pass ${k}` })],
        answerKind: "int", correct, candidates: cands,
        fallbacks: [{ value: Math.max(0, correct - 1), why: "Off by one." }, { value: Math.min(arr.length - 1, correct + 1), why: "Off by one." }],
        explanation: [passText(p)], trace: fullTrace(res),
        reveal: [pViz(p.after, { sortedTo: k, label: `after pass ${k}` })],
        spec: { op: "sel-min-index", arr, k },
        meta: { reasoning: k === 1 && d === "beginner" ? "one-pass" : "pass-state", steps: p.compares.length + 1, arrayLength: arr.length, comparisons: p.compares.length, passes: k },
      };
    },
  },
  {
    id: "s-after-pass",
    weight: { beginner: 3, intermediate: 3, advanced: 2 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const res = selectionSort(arr);
      const maxK = Math.min(res.passes.length - 1, d === "beginner" ? 1 : d === "intermediate" ? 3 : res.passes.length - 1);
      const k = d === "beginner" ? 1 : randInt(r, 2, Math.max(2, maxK));
      if (k > res.passes.length) return null;
      const correct = res.passes[k - 1].after;
      const cands = [
        { value: upTo(arr, k, selFirstSmaller), why: "You swapped with the FIRST smaller element you met. Selection sort scans the whole unsorted part and swaps with the SMALLEST." },
        { value: upTo(arr, k, selSwapEvery), why: "You swapped every time you saw something smaller. Selection sort swaps only once per pass, after the scan ends." },
        { value: stateAt(res, arr, k - 1), why: "That is the array before this pass's swap. A complete pass ends with the swap." },
        { value: stateAt(res, arr, Math.min(k + 1, res.passes.length)), why: "That is one pass too far." },
        { value: insAfter(arr, k + 1), why: "That is what insertion sort does: it shifts elements to make room. Selection sort swaps just two elements per pass." },
        { value: upTo(arr, k, selNoSwap), why: "A completed pass places the minimum with a swap; the array does change (unless the min was already in place)." },
      ];
      return {
        algorithm: "selection", skill: SKILL.pass, family: "s-after-pass", rule: RULE_SEL,
        stem: k === 1 ? "What is the array after the first complete pass of the outer loop?" : `What is the array after pass ${k} (the ${ordinal(k)} complete pass of the outer loop)?`,
        code: baseCode(arr), codeLabel,
        visuals: [pViz(arr, { label: "values at the start" })],
        answerKind: "array", correct, candidates: cands, fallbacks: [],
        explanation: res.passes.slice(0, k).map(passText), trace: fullTrace(res),
        reveal: [pViz(correct, { sortedTo: k, label: `after pass ${k} (sorted part marked)` })],
        spec: { op: "sel-after-pass", arr, k },
        meta: { reasoning: k === 1 ? (d === "beginner" ? "one-pass" : "pass-state") : "pass-state", steps: res.passes.slice(0, k).reduce((s, p) => s + p.compares.length + 1, 0), arrayLength: arr.length, comparisons: res.passes.slice(0, k).reduce((s, p) => s + p.compares.length, 0), passes: k },
      };
    },
  },
  {
    id: "s-next-swap",
    weight: { beginner: 1.6, intermediate: 2, advanced: 1 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const res = selectionSort(arr);
      const k = d === "beginner" ? 1 : randInt(r, 1, Math.min(4, res.passes.length));
      const p = res.passes[k - 1];
      const say = (x, y) => (x === y ? `a[${x}] with itself (index ${x} is already the smallest)` : `a[${x}] and a[${y}]`);
      const correct = say(p.i, p.minIndex);
      const start = p.before;
      const firstSmaller = start.findIndex((v, j) => j > p.i && v < start[p.i]);
      const cands = [
        firstSmaller >= 0 ? { value: say(p.i, firstSmaller), why: "That swaps with the first smaller element. The swap uses the index of the SMALLEST element in the unsorted part." } : null,
        { value: say(p.i, start.length - 1), why: "That swaps with the last element. The last index is only chosen if it holds the smallest value." },
        { value: say(p.i, p.i + 1), why: "That swaps neighbors, like a bubble. Selection sort swaps a[i] with a[minIndex], which can be far away." },
        { value: say(0, p.minIndex), why: p.i === 0 ? "" : `The swap target is a[i] (here i = ${p.i}), not always index 0.` },
        { value: say(p.minIndex, start.length - 1), why: "That moves the smallest value to the END. Selection sort places it at the front of the unsorted part (index i)." },
        { value: say(p.i + 1, p.minIndex + 1), why: "You counted positions from 1. Java indexes start at 0." },
        { value: say(p.minIndex, p.minIndex), why: p.i === p.minIndex ? "" : "The swap exchanges a[i] with a[minIndex]; they are different here." },
      ].filter((c) => c && c.why);
      return {
        algorithm: "selection", skill: SKILL.swap, family: "s-next-swap", rule: RULE_SEL,
        stem: `At the end of pass ${k} (i = ${p.i}), which elements are swapped?`,
        code: baseCode(arr), codeLabel,
        visuals: [pViz(start, { sortedTo: p.i, label: `values at the start of pass ${k}` })],
        answerKind: "text", correct, candidates: cands, fallbacks: [{ value: say(p.i, Math.max(p.i + 1, (p.minIndex + 2) % start.length)), why: "That is not where the smallest remaining value is." }],
        explanation: [passText(p)], trace: fullTrace(res),
        reveal: [pViz(p.after, { sortedTo: k, label: `after pass ${k}` })],
        spec: { op: "sel-next-swap", arr, k },
        meta: { reasoning: d === "beginner" ? "one-pass" : "pass-state", steps: p.compares.length + 1, arrayLength: arr.length, comparisons: p.compares.length, passes: k },
      };
    },
  },
  {
    id: "s-count",
    weight: { beginner: 0, intermediate: 2.5, advanced: 2.5 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const res = selectionSort(arr);
      const kind = pick(r, d === "intermediate" ? ["pass", "pass", "swaps"] : ["first-k", "total", "swaps"]);
      let stem, rule, correct, cands, fall = [], spec, steps, vizOut = [], expl, work;
      if (kind === "pass") {
        const k = randInt(r, 2, Math.min(4, n - 1));
        const p = res.passes[k - 1];
        correct = p.compares.length;
        rule = "Count each evaluation of the test a[j] < a[minIndex]. Do not count swaps.";
        stem = `How many times is a[j] < a[minIndex] evaluated during pass ${k} (i = ${p.i})?`;
        cands = [{ value: correct + 1, why: "You counted the swap as a comparison. Swaps are not comparisons." }, { value: n, why: "That would compare every element. Pass " + k + " only compares the " + (n - 1 - p.i) + " elements after i." }, { value: n - 1, why: "That is the count for the first pass. The inner loop starts at i + 1, so later passes have fewer comparisons." }, { value: p.compares.filter((c) => c.smaller).length, why: "That counts how many times minIndex CHANGED. Count every comparison, true or false." }];
        spec = { op: "sel-compares-pass", arr, k };
        expl = [`Inner loop runs j = ${p.i + 1} to ${n - 1}: ${plural(correct, "comparison")}.`, passText(p)];
        steps = correct;
        work = { comparisons: correct, passes: 1 };
      } else if (kind === "first-k") {
        const k = randInt(r, 2, Math.min(5, n - 1));
        correct = res.passes.slice(0, k).reduce((s, p) => s + p.compares.length, 0);
        rule = "Count each evaluation of the test a[j] < a[minIndex]. Do not count swaps.";
        stem = `How many comparisons a[j] < a[minIndex] are made during the first ${k} passes combined?`;
        const withSwaps = correct + k;
        cands = [{ value: withSwaps, why: "You also counted the " + k + " swaps. Only the a[j] < a[minIndex] tests count here." }, { value: k * (n - 1), why: "Each pass has fewer comparisons than the one before: pass i compares " + "n - 1 - i elements, not n - 1 every time." }, { value: (n * (n - 1)) / 2, why: "That is the total for the whole sort, not just " + k + " passes." }, { value: k * n, why: "The inner loop compares fewer than n elements each pass." }];
        spec = { op: "sel-compares-first-k", arr, k };
        expl = [`Pass i makes n - 1 - i comparisons: ${res.passes.slice(0, k).map((p) => p.compares.length).join(" + ")} = ${correct}.`];
        steps = correct;
        work = { comparisons: correct, passes: k };
      } else if (kind === "total") {
        correct = res.comparisons;
        rule = "Count each evaluation of the test a[j] < a[minIndex] during the whole sort. Do not count swaps.";
        stem = `How many comparisons a[j] < a[minIndex] does the complete sort make on this array?`;
        cands = [{ value: correct + res.swaps, why: "You also counted the " + res.swaps + " swaps." }, { value: n * n, why: "The comparisons shrink each pass; it is not n × n." }, { value: n * (n - 1), why: "That double counts. Pass i compares only the elements after i, giving n(n−1)/2 in all." }, { value: res.effectiveSwaps + (n - 1), why: "That mixes up swaps and comparisons." }];
        spec = { op: "sel-compares-total", arr };
        expl = [`Comparisons per pass: ${res.passes.map((p) => p.compares.length).join(" + ")} = ${correct}. Selection sort always makes this many, whatever the data.`];
        steps = correct;
        work = { comparisons: correct, passes: n - 1 };
      } else {
        correct = res.effectiveSwaps;
        rule = "Count only passes where minIndex != i (the swap actually moves two different elements). Do not count a swap of an element with itself.";
        stem = "How many passes perform a swap that moves two different elements?";
        cands = [{ value: n - 1, why: "That counts the self-swaps too. A pass where minIndex == i exchanges an element with itself, which changes nothing." }, { value: res.selfSwaps, why: "That counts the passes where the element stayed put (self-swaps)." }, { value: res.passes.reduce((s, p) => s + p.compares.filter((c) => c.smaller).length, 0), why: "That counts how often minIndex changed during scans, not how many swaps happen." }, { value: res.comparisons, why: "That is the comparison count, not the swap count." }];
        spec = { op: "sel-effective-swaps", arr };
        expl = [`Passes with minIndex ≠ i: ${res.passes.filter((p) => !p.selfSwap).map((p) => p.pass).join(", ") || "none"}. That is ${correct}.`, `Passes with minIndex = i: ${res.selfSwaps}.`];
        steps = res.passes.length * 2;
        work = { swaps: correct, passes: n - 1 };
      }
      return {
        algorithm: "selection", skill: SKILL.count, family: "s-count", variant: kind, rule,
        stem, code: baseCode(arr), codeLabel, visuals: [pViz(arr, { label: "values at the start" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true count." }, { value: Math.max(0, correct - 1), why: "One fewer than the true count." }],
        explanation: expl, trace: fullTrace(res), spec,
        meta: { reasoning: "count", steps: Math.max(steps, 2), arrayLength: n, ...work },
      };
    },
  },
  {
    id: "s-sorted-region",
    weight: { beginner: 1.4, intermediate: 1.4, advanced: 1 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const res = selectionSort(arr);
      const k = d === "beginner" ? randInt(r, 1, 2) : randInt(r, 2, Math.min(5, n - 2));
      const state = res.passes[k - 1].after;
      const text = (a, b) => `indexes ${a} through ${b}`;
      const correct = text(0, k - 1);
      const cands = [
        { value: text(0, k), why: "That includes one element too many. After pass " + k + ", exactly " + k + " elements have been placed." },
        { value: text(0, k - 2), why: "You left out the element placed by the last pass." },
        { value: text(k, n - 1), why: "That is the UNSORTED part, the part still to be scanned." },
        { value: `every index where the array happens to look in order`, why: "The sorted region is defined by the passes completed, not by values that merely look sorted. Selection sort has not checked the later elements yet." },
      ];
      return {
        algorithm: "selection", skill: SKILL.region, family: "s-sorted-region", rule: RULE_SEL,
        stem: `The array below is shown right after pass ${k} of selection sort. Which part is the sorted region that later passes will not touch?`,
        code: baseCode(arr), codeLabel,
        visuals: [pViz(state, { label: `after pass ${k}` })],
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: [`Each pass places one element in its final spot, so after ${k} passes indexes 0 to ${k - 1} are final.`, `Pass ${k + 1} starts its inner loop at index ${k + 1} and compares only the unsorted part (indexes ${k} to ${n - 1}).`], trace: fullTrace(res),
        reveal: [pViz(state, { sortedTo: k, label: "sorted part marked" })],
        spec: { op: "sel-region", n, k },
        meta: { reasoning: d === "beginner" ? "one-pass" : "pass-state", steps: k + 1, arrayLength: n, comparisons: 0, passes: k },
      };
    },
  },
  {
    id: "s-inner-loop",
    weight: { beginner: 1.2, intermediate: 1.2, advanced: 2.2 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const res = selectionSort(arr);
      const k = d === "beginner" ? randInt(r, 1, 2) : randInt(r, 1, Math.min(4, n - 2));
      const p = res.passes[k - 1];
      const kind = d === "beginner" ? "range" : pick(r, ["changes", "range", "changes"]);
      if (kind === "range") {
        const cnt = p.compares.length;
        const correct = `j runs from ${p.i + 1} to ${n - 1} (${plural(cnt, "iteration")})`;
        const cands = [
          { value: `j runs from ${p.i} to ${n - 1} (${plural(cnt + 1, "iteration")})`, why: "The inner loop starts at i + 1; comparing a[i] with itself is unnecessary." },
          { value: `j runs from ${p.i + 1} to ${n} (${plural(cnt + 1, "iteration")})`, why: "j < values.length stops before j reaches " + n + "; index " + n + " is out of bounds." },
          { value: `j runs from 1 to ${n - 1} (${plural(n - 1, "iteration")})`, why: "The inner loop's starting point moves with i; it does not restart at 1 every pass." },
          { value: `j runs from ${p.i + 1} to ${n - 2} (${plural(cnt - 1, "iteration")})`, why: "The last element, index " + (n - 1) + ", is also compared (j < values.length)." },
        ];
        return {
          algorithm: "selection", skill: SKILL.loops, family: "s-inner-loop", variant: "range", rule: "",
          stem: `During the pass where i = ${p.i}, which values does the inner loop variable j take?`,
          code: baseCode(arr), codeLabel, visuals: [pViz(p.before, { sortedTo: p.i, label: `values when i = ${p.i}` })],
          answerKind: "text", correct, candidates: cands, fallbacks: [],
          explanation: [`for (int j = i + 1; j < values.length; j++) with i = ${p.i} and values.length = ${n}.`, `So j takes ${p.i + 1}, ..., ${n - 1}.`], trace: fullTrace(res),
          spec: { op: "sel-inner-range", n, i: p.i },
          meta: { reasoning: d === "beginner" ? "one-pass" : "pass-state", steps: p.compares.length + 1, arrayLength: n, comparisons: p.compares.length, passes: k },
        };
      }
      const changes = p.compares.filter((c) => c.smaller).map((c) => c.j);
      const lst = (a) => (a.length ? a.map((j) => `j = ${j}`).join(" and ") : "no value of j");
      const correct = lst(changes);
      const start = p.before;
      const lessThanI = p.compares.filter((c) => c.aj < start[p.i]).map((c) => c.j);
      const equalMin = p.compares.filter((c) => c.aj === p.minValue).map((c) => c.j);
      const cands = [
        { value: lst(lessThanI), why: "You compared each a[j] with a[i]. The test compares with a[minIndex], which can change during the pass." },
        { value: lst(p.compares.map((c) => c.j)), why: "Those are ALL the values of j. minIndex changes only when a[j] is smaller than the current minimum." },
        { value: lst(changes.length ? [changes[changes.length - 1]] : []), why: "minIndex can change more than once in one pass; the last change is not the only one." },
        { value: lst(equalMin), why: "That finds where the minimum value sits, but minIndex changes at every new smaller value along the way." },
        { value: lst(changes.map((j) => j + 1)), why: "You counted positions from 1. Java indexes start at 0." },
        { value: lst(p.compares.filter((c) => c.aj > start[p.i]).map((c) => c.j)), why: "Those are the elements LARGER than a[i]; minIndex changes only for smaller ones." },
      ];
      return {
        algorithm: "selection", skill: SKILL.loops, family: "s-inner-loop", variant: "changes", rule: RULE_SEL,
        stem: `During pass ${k} (i = ${p.i}), for which values of j does the statement minIndex = j execute?`,
        code: baseCode(arr), codeLabel, visuals: [pViz(start, { sortedTo: p.i, label: `values at the start of pass ${k}` })],
        answerKind: "text", correct, candidates: cands, fallbacks: [{ value: lst(range(p.i + 1, Math.min(p.i + 2, n - 1))), why: "That does not match the comparisons made in this pass." }],
        explanation: [passText(p)], trace: fullTrace(res),
        spec: { op: "sel-changes", arr, k },
        meta: { reasoning: "pass-state", steps: p.compares.length + 1, arrayLength: n, comparisons: p.compares.length, passes: k },
      };
    },
  },
  {
    id: "s-dup-rule",
    weight: { beginner: 0, intermediate: 1.2, advanced: 1 },
    build(r, d) {
      const n = randInt(r, 6, 9);
      const base = makeArray(r, { n, hi: 30, shape: "random" });
      const i = randInt(r, 0, 1);
      const v = Math.min(...base.slice(i)) - randInt(r, 1, 3);
      const arr = base.slice();
      const p1 = randInt(r, i + 1, Math.floor(n / 2) + 1), p2 = randInt(r, p1 + 1, n - 1);
      if (p1 >= p2 || p2 >= n) return null;
      arr[p1] = v;
      arr[p2] = v;
      if (arr[i] <= v) return null;
      const res = selectionSort(arr);
      const p = res.passes[i];
      if (p.minIndex !== p1) return null;
      const correct = p1;
      const cands = [
        { value: p2, why: `The test is a[j] < a[minIndex] (strict). When j reaches ${p2}, ${v} is not smaller than ${v}, so minIndex stays at the earlier index.` },
        { value: i, why: "minIndex starts at i but a smaller value (" + v + ") appears later, so it changes." },
        { value: n - 1, why: "The last index is not automatically the minimum." },
        { value: arr[p1], why: "That is the minimum VALUE; minIndex is its index." },
      ];
      return {
        algorithm: "selection", skill: SKILL.min, family: "s-dup-rule", rule: RULE_SEL,
        stem: `Two elements share the smallest value ${v}. After the inner loop of pass ${i + 1} (i = ${i}), what is minIndex?`,
        code: baseCode(arr), codeLabel, visuals: [pViz(arr, { sortedTo: i, label: "values at the start of the sort" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: p1 - 1, why: "Off by one." }],
        explanation: [passText(p), `Because the comparison is strict (<), an equal value later in the array never replaces minIndex.`], trace: fullTrace(res),
        spec: { op: "sel-min-index", arr, k: i + 1 },
        meta: { reasoning: "pass-state", steps: p.compares.length + 1, arrayLength: n, comparisons: p.compares.length, passes: i + 1 },
      };
    },
  },
  {
    id: "s-invalid-step",
    weight: { beginner: 0, intermediate: 1.2, advanced: 2.5 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const res = selectionSort(arr);
      const rows = d === "advanced" ? Math.min(n - 1, 5) : 4;
      const bad = randInt(r, 1, rows);
      const kinds = shuffle(r, [["first", selFirstSmaller, "swapped with the FIRST smaller element instead of the smallest"], ["every", selSwapEvery, "swapped every time it saw a smaller element"], ["none", selNoSwap, "skipped the swap"], ["ins", null, "shifted elements like insertion sort instead of swapping"]]);
      let seq = null, why = "";
      for (const [, f, w] of kinds) {
        const prev = bad === 1 ? arr : (() => { let s = arr; for (let p = 1; p < bad; p++) s = selPass(s, p - 1); return s; })();
        const correctNext = selPass(prev, bad - 1);
        let alt = f ? f(prev, bad - 1) : (() => { const a = prev.slice(); const i = bad - 1; let m = i; for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j; const v = a[m]; for (let j = m; j > i; j--) a[j] = a[j - 1]; a[i] = v; return a; })();
        if (!arrEq(alt, correctNext)) { seq = { prev, alt }; why = w; break; }
      }
      if (!seq) return null;
      const states = [arr];
      for (let p = 1; p <= rows; p++) states.push(p === bad ? seq.alt : selPass(states[p - 1], p - 1));
      const labels = range(1, rows).map((p) => `After pass ${p}`);
      const correct = labels[bad - 1];
      const cands = labels.filter((_, i) => i !== bad - 1).map((l) => ({ value: l, why: `${l} follows correctly from the row before it.` }));
      return {
        algorithm: "selection", skill: SKILL.invalid, family: "s-invalid-step", rule: RULE_SEL,
        stem: "A student traced selection sort but made exactly one mistake in one row. Each later row is computed correctly from the row above it. Which row is wrong?",
        code: baseCode(arr), codeLabel,
        visuals: states.map((s, idx) => arrViz(s, { label: idx === 0 ? "Start" : `After pass ${idx}`, indices: idx === 0 })),
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: [`${correct} is wrong: the student ${why}.`, `The correct state is {${selPass(seq.prev, bad - 1).join(", ")}}.`], trace: fullTrace(res),
        spec: { op: "sel-invalid-row", arr, rows, bad, states },
        meta: { reasoning: d === "advanced" ? "debug" : "multi-step", steps: rows * 2, arrayLength: n, comparisons: 0, passes: rows },
      };
    },
  },
  {
    id: "s-full-trace",
    weight: { beginner: 0, intermediate: 0.6, advanced: 3 },
    build(r, d) {
      const n = d === "advanced" ? randInt(r, 5, 7) : randInt(r, 5, 5);
      const arr = makeArray(r, { n, hi: 30, dups: r() < 0.4, shape: "random" });
      const res = selectionSort(arr);
      const rows = n - 1;
      const toTrace = (f) => { const t = []; let s = arr; for (let i = 0; i < rows; i++) { s = f(s, i); t.push(s); } return t; };
      const correct = res.passes.map((p) => p.after);
      const insTr = insertionSort(arr).passes.map((p) => p.after);
      const cands = [
        { value: toTrace(selFirstSmaller), why: "This trace swaps with the first smaller element in each pass instead of the smallest." },
        { value: toTrace(selSwapEvery), why: "This trace swaps repeatedly during a scan. Selection sort swaps once per pass." },
        { value: insTr.slice(0, rows), why: "These are insertion sort's states: elements shift to build a sorted prefix. Selection sort swaps and places the global minimum of the unsorted part." },
        { value: toTrace((s, i) => selPass(s, Math.min(i + 1, s.length - 2))), why: "This trace starts each pass one index too late, so the front element is skipped." },
      ];
      return {
        algorithm: "selection", skill: SKILL.trace, family: "s-full-trace", rule: RULE_SEL,
        stem: "Which list shows the array after each outer-loop pass of selection sort, in order?",
        code: baseCode(arr), codeLabel, visuals: [pViz(arr, { label: "values at the start" })],
        answerKind: "trace", correct, candidates: cands, fallbacks: [],
        explanation: fullTrace(res), trace: fullTrace(res),
        spec: { op: "sel-full-trace", arr },
        meta: { reasoning: "full-trace", steps: res.comparisons + res.swaps, arrayLength: n, comparisons: res.comparisons, swaps: res.swaps, passes: rows, states: rows },
      };
    },
  },
];
