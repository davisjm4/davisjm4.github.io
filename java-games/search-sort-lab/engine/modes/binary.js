/* Mode 1 — Binary Search Tracker families. */
import { randInt, pick, shuffle } from "../rng.js";
import { makeArray, chooseTarget, fmt } from "../arrays.js";
import { binarySearch, linearSearch } from "../algorithms.js";
import { binaryMethod, binarySetup, binaryLoop } from "../code.js";
import { arrViz, plural } from "../kit.js";

const SKILL = {
  mid: "Binary search: midpoint",
  bounds: "Binary search: updating low/high",
  trace: "Binary search: tracing steps",
  result: "Binary search: result and failure",
  precond: "Binary search: preconditions",
  debug: "Binary search: debugging",
};
const sortedArr = (r, n, { dups = false, negatives = false, hi = 60 } = {}) => makeArray(r, { n, hi, dups, negatives, shape: "sorted" });
const sizeFor = (r, d) => (d === "beginner" ? randInt(r, 5, 8) : d === "intermediate" ? randInt(r, 8, 15) : randInt(r, 16, 28));
const vizAt = (arr, { low, mid, high, label }) => {
  const roles = {};
  const add = (i, role) => {
    if (i >= 0 && i < arr.length) (roles[i] = roles[i] || []).push(role);
  };
  for (let i = 0; i < arr.length; i++) if (i < low || i > high) add(i, "out");
  if (low !== undefined) add(low, "low");
  if (high !== undefined) add(high, "high");
  if (mid !== undefined && mid !== null) add(mid, "mid");
  return arrViz(arr, { roles, label });
};
const stepLine = (s, arrName = "numbers", target) => {
  const rel = s.rel === "eq" ? `${arrName}[${s.mid}] = ${s.value} equals the target ${target}, so the method returns ${s.mid}.` : s.rel === "lt" ? `${arrName}[${s.mid}] = ${s.value} is less than ${target}, so the target can only be to the right: low = mid + 1 = ${s.nextLow}.` : `${arrName}[${s.mid}] = ${s.value} is greater than ${target}, so the target can only be to the left: high = mid - 1 = ${s.nextHigh}.`;
  return `low = ${s.low}, high = ${s.high}: mid = (${s.low} + ${s.high}) / 2 = ${s.mid}. ${rel}`;
};
const traceOf = (res, target) => res.steps.map((s) => stepLine(s, "numbers", target)).concat(res.found ? [] : [`low (${res.endLow}) is now greater than high (${res.endHigh}), so the loop ends and the method returns -1.`]);
const bounds = (lo, hi) => `low = ${lo}, high = ${hi}`;

/* helper: find array/target satisfying a predicate on the standard search */
function search(r, tries, make, ok) {
  for (let t = 0; t < tries; t++) {
    const c = make();
    const res = binarySearch(c.arr, c.target);
    if (ok(res, c)) return { ...c, res };
  }
  return null;
}

export const binaryFamilies = [
  {
    id: "b-first-mid",
    weight: { beginner: 3, intermediate: 0, advanced: 0 },
    build(r, d) {
      const n = sizeFor(r, d);
      const arr = sortedArr(r, n);
      const target = chooseTarget(r, arr, "present");
      const mid = Math.floor((n - 1) / 2);
      const correct = mid;
      return {
        algorithm: "binary", skill: SKILL.mid, family: "b-first-mid",
        stem: "What is the first value of mid? (The loop has not started yet.)",
        code: binarySetup(arr, target) + `\n\nint mid = (low + high) / 2;`,
        visuals: [vizAt(arr, { low: 0, high: n - 1, label: "numbers" })],
        answerKind: "int", correct,
        candidates: [
          { value: Math.ceil((n - 1) / 2), why: "You rounded the midpoint up. In Java, (low + high) / 2 is integer division, which drops the fraction." },
          { value: arr[mid], why: "That is the value stored at mid, not the index. mid holds an index." },
          { value: Math.floor(n / 2), why: "You used numbers.length instead of numbers.length - 1 for high. high starts at the last index." },
          { value: mid + 1, why: "You counted positions starting at 1. Java indexes start at 0." },
          { value: n - 1, why: "That is high, the last index. mid is the middle of low and high." },
          { value: 0, why: "That is low, the first index. mid is halfway between low and high." },
        ],
        fallbacks: [{ value: mid - 1, why: "Off by one from (low + high) / 2." }, { value: n - 1, why: "That is the last index (high), not the midpoint." }],
        explanation: [`low = 0 and high = numbers.length - 1 = ${n - 1}.`, `mid = (0 + ${n - 1}) / 2 = ${mid}. Integer division drops any fraction.`],
        trace: [],
        spec: { op: "bin-mid-first", n },
        meta: { reasoning: "one-step", steps: 1, arrayLength: n, comparisons: 0 },
      };
    },
  },
  {
    id: "b-bounds-first",
    weight: { beginner: 3, intermediate: 0, advanced: 0 },
    build(r, d) {
      const n = sizeFor(r, d);
      const c = search(r, 60, () => { const arr = sortedArr(r, n); return { arr, target: chooseTarget(r, arr, "present") }; }, (res) => res.steps.length >= 2);
      if (!c) return null;
      const { arr, target, res } = c;
      const s = res.steps[0];
      const correctLow = s.nextLow, correctHigh = s.nextHigh;
      const correct = bounds(correctLow, correctHigh);
      const c2 = [];
      if (s.rel === "lt") {
        c2.push({ value: bounds(s.mid, s.high), why: "You set low = mid. The element at mid was already checked and is too small, so low must move past it: low = mid + 1." });
        c2.push({ value: bounds(s.low, s.mid - 1), why: "You moved high, but numbers[mid] is smaller than the target. The target can only be to the right, so low moves." });
        c2.push({ value: bounds(s.mid + 1, s.mid - 1), why: "Only one bound changes each pass. high does not change when the target is larger than numbers[mid]." });
        c2.push({ value: bounds(s.low, s.high), why: "A bound must change after an unsuccessful comparison; otherwise the loop would repeat forever." });
      } else {
        c2.push({ value: bounds(s.low, s.mid), why: "You set high = mid. numbers[mid] was already checked and is too large, so high must move before it: high = mid - 1." });
        c2.push({ value: bounds(s.mid + 1, s.high), why: "You moved low, but numbers[mid] is larger than the target. The target can only be to the left, so high moves." });
        c2.push({ value: bounds(s.mid + 1, s.mid - 1), why: "Only one bound changes each pass. low does not change when the target is smaller than numbers[mid]." });
        c2.push({ value: bounds(s.low, s.high), why: "A bound must change after an unsuccessful comparison; otherwise the loop would repeat forever." });
      }
      return {
        algorithm: "binary", skill: SKILL.bounds, family: "b-bounds-first",
        stem: `The first comparison is numbers[mid] with target (${target}). After it, what are low and high?`,
        code: binarySetup(arr, target), codeKind: "statements",
        visuals: [vizAt(arr, { low: 0, mid: s.mid, high: arr.length - 1, label: "numbers · first pass" })],
        answerKind: "text", correct, candidates: c2,
        fallbacks: [{ value: bounds(s.low, s.mid + 1), why: "high is not set to mid + 1." }, { value: bounds(s.mid - 1, s.high), why: "low is not set to mid - 1." }],
        explanation: traceOf({ steps: [s], found: true }, target).slice(0, 1),
        trace: traceOf(res, target),
        reveal: [vizAt(arr, { low: s.nextLow, high: s.nextHigh, label: "after the first comparison" })],
        spec: { op: "bin-bounds-first", arr, target },
        meta: { reasoning: "one-step", steps: 1, arrayLength: arr.length, comparisons: 1 },
      };
    },
  },
  {
    id: "b-update-line",
    weight: { beginner: 2, intermediate: 1.4, advanced: 0 },
    build(r, d) {
      const n = sizeFor(r, d);
      const arr = sortedArr(r, n, { dups: d !== "beginner" });
      const low = randInt(r, 0, Math.floor(n / 3));
      const high = randInt(r, Math.floor((2 * n) / 3), n - 1);
      const mid = Math.floor((low + high) / 2);
      const kind = pick(r, ["lt", "gt"]);
      const target = kind === "lt" ? arr[mid] + randInt(r, 1, 6) : arr[mid] - randInt(r, 1, 6);
      const correct = kind === "lt" ? "low = mid + 1;" : "high = mid - 1;";
      const cands = kind === "lt"
        ? [{ value: "low = mid;", why: "numbers[mid] was already compared, so it can be skipped. low = mid would keep it in the range and can loop forever." }, { value: "high = mid - 1;", why: "This discards the right half, but numbers[mid] is smaller than target, so the target must be to the right." }, { value: "high = mid;", why: "This moves the wrong bound. When the target is larger, the left side is eliminated, not the right." }, { value: "low = mid - 1;", why: "low would move backwards, re-including elements already ruled out." }]
        : [{ value: "high = mid;", why: "numbers[mid] was already compared, so it can be skipped. high = mid would keep it in the range." }, { value: "low = mid + 1;", why: "This discards the left half, but numbers[mid] is larger than target, so the target must be to the left." }, { value: "low = mid;", why: "This moves the wrong bound. When the target is smaller, the right side is eliminated, not the left." }, { value: "high = mid + 1;", why: "high would move forward, re-including elements already ruled out." }];
      const roles = vizAt(arr, { low, mid, high, label: "numbers" });
      return {
        algorithm: "binary", skill: SKILL.bounds, family: "b-update-line", variant: kind,
        stem: `At this point low = ${low}, high = ${high}, mid = ${mid}, numbers[mid] = ${arr[mid]}, and target = ${target}. Which statement should run next?`,
        code: binaryLoop().split("\n").slice(0, 10).join("\n"), codeKind: "int-fragment", codeLabel: "loop (fragment inside a method that returns an int)",
        visuals: [roles], answerKind: "code", correct, candidates: cands,
        fallbacks: [{ value: "return mid;", why: "numbers[mid] does not equal the target, so the method cannot return mid yet." }],
        explanation: [`numbers[${mid}] = ${arr[mid]} is ${kind === "lt" ? "less" : "greater"} than ${target}.`, kind === "lt" ? `Everything at or left of mid is too small, so low moves to mid + 1 = ${mid + 1}.` : `Everything at or right of mid is too big, so high moves to mid - 1 = ${mid - 1}.`],
        spec: { op: "bin-update-line", value: arr[mid], target },
        meta: { reasoning: d === "beginner" ? "one-step" : "multi-step", steps: d === "beginner" ? 1 : 2, arrayLength: n, comparisons: 1 },
      };
    },
  },
  {
    id: "b-step-k",
    weight: { beginner: 0, intermediate: 3, advanced: 1.2 },
    build(r, d) {
      const n = sizeFor(r, d);
      const k = d === "intermediate" ? 2 : 4;
      const c = search(r, 120, () => { const arr = sortedArr(r, n, { dups: r() < 0.4 }); return { arr, target: chooseTarget(r, arr, r() < 0.45 ? "absent" : "present") }; }, (res) => res.steps.length >= k && res.steps[k - 1].action !== "found");
      if (!c) return null;
      const { arr, target, res } = c;
      const s = res.steps[k - 1];
      const askBounds = r() < 0.5;
      const cmp = (bug, midRule) => { const x = binarySearch(arr, target, { bug }); return x.steps[k - 1]; };
      const hm = cmp("high=mid"), lm = cmp("low=mid"), up = cmp("mid-hi");
      let correct, cands, fall, stem, spec;
      const ord = ["", "first", "second", "third", "fourth"][k] || `#${k}`;
      if (askBounds) {
        correct = bounds(s.low, s.high);
        cands = [];
        if (hm) cands.push({ value: bounds(hm.low, hm.high), why: "You updated high = mid on an earlier pass. The correct update is high = mid - 1 because numbers[mid] was already ruled out." });
        if (lm) cands.push({ value: bounds(lm.low, lm.high), why: "You updated low = mid on an earlier pass. The correct update is low = mid + 1." });
        const prev = res.steps[k - 2];
        cands.push({ value: bounds(prev.low, prev.high), why: "Those are the bounds from the previous pass. You forgot to apply that pass's update." });
        cands.push({ value: bounds(s.high, s.low), why: "low and high are swapped. low is always the left bound and high the right." });
        fall = [{ value: bounds(s.low + 1, s.high), why: "low is one too large." }, { value: bounds(s.low, s.high + 1), why: "high is one too large." }];
        stem = `At the start of the ${ord} pass of the loop, what are low and high?`;
        spec = { op: "bin-bounds-at", arr, target, k };
      } else {
        correct = s.mid;
        cands = [];
        if (hm) cands.push({ value: hm.mid, why: "You moved high to mid instead of mid - 1 earlier, which changes later midpoints." });
        if (lm) cands.push({ value: lm.mid, why: "You moved low to mid instead of mid + 1 earlier, which changes later midpoints." });
        if (up) cands.push({ value: up.mid, why: "You rounded a midpoint up. (low + high) / 2 uses integer division, which rounds down." });
        cands.push({ value: s.value, why: "That is the value stored at mid, not the index mid." });
        cands.push({ value: res.steps[k - 2].mid, why: "That is the previous pass's midpoint. The bounds changed, so mid changed." });
        fall = [{ value: s.mid + 1, why: "Off by one." }, { value: s.mid - 1, why: "Off by one." }];
        stem = `What is the value of mid on the ${ord} pass of the loop?`;
        spec = { op: "bin-mid-at", arr, target, k };
      }
      return {
        algorithm: "binary", skill: SKILL.trace, family: "b-step-k", variant: askBounds ? "bounds" : "mid",
        stem, code: binarySetup(arr, target) + "\n\n" + binaryLoop().split("\n").slice(0, 10).join("\n").replace(/\nreturn -1;$/, ""), codeKind: "int-statements", codeLabel: "loop fragment (inside a method that returns an int)",
        visuals: [vizAt(arr, { low: 0, high: arr.length - 1, label: "numbers · before the loop" })],
        answerKind: askBounds ? "text" : "int", correct, candidates: cands, fallbacks: fall,
        explanation: [`Trace the first ${k} pass${k > 1 ? "es" : ""}:`].concat(res.steps.slice(0, k).map((x) => stepLine(x, "numbers", target))),
        trace: traceOf(res, target),
        reveal: [vizAt(arr, { low: s.low, mid: s.mid, high: s.high, label: `pass ${k}` })],
        spec,
        meta: { reasoning: "multi-step", steps: k, arrayLength: n, comparisons: k },
      };
    },
  },
  {
    id: "b-return",
    weight: { beginner: 0.4, intermediate: 3, advanced: 1.5 },
    build(r, d) {
      const n = sizeFor(r, d);
      const absent = r() < (d === "intermediate" ? 0.4 : 0.3);
      const dupMode = !absent && d !== "beginner" && r() < 0.6;
      const arr = sortedArr(r, n, { dups: d !== "beginner", negatives: d === "advanced" && r() < 0.5 });
      let target = absent ? chooseTarget(r, arr, pick(r, ["absent", "gap", "beforeAll", "afterAll"])) : chooseTarget(r, arr, "present");
      if (dupMode) {
        const dupVals = arr.filter((v, i) => arr.indexOf(v) !== arr.lastIndexOf(v));
        if (dupVals.length) target = pick(r, dupVals);
      }
      const res = binarySearch(arr, target);
      const first = arr.indexOf(target), last = arr.lastIndexOf(target);
      const correct = res.index;
      const cands = [];
      if (first >= 0 && first !== correct) cands.push({ value: first, why: "Binary search does not look for the first occurrence. It returns whichever matching index its midpoints reach first." });
      if (last >= 0 && last !== correct) cands.push({ value: last, why: "Binary search does not look for the last occurrence either. It returns the first match its midpoint lands on." });
      if (correct !== -1) cands.push({ value: -1, why: "The target is in the array and the midpoints reach it, so the method returns its index, not -1." });
      if (correct === -1) { cands.push({ value: res.endLow, why: "That is where the target would be inserted, not the return value. A failed search returns -1." }); cands.push({ value: arr.length, why: "A failed search does not return the length. It returns -1." }); }
      cands.push({ value: target, why: "That is the target value. The method returns an index, not the value." });
      cands.push({ value: res.probes, why: "That is how many times the loop ran, not the index it returns." });
      const probe = res.steps[res.steps.length - 1];
      if (correct !== -1) cands.push({ value: correct + 1, why: "You counted positions from 1. Java returns the zero-based index." });
      return {
        algorithm: "binary", skill: SKILL.result, family: "b-return", variant: absent ? "absent" : dupMode ? "duplicates" : "present",
        stem: `What does search(numbers, ${target}) return?`,
        code: binaryMethod() + `\n\nint[] numbers = ${fmt(arr)};`, codeKind: "methods", codeLabel: "Java (method plus the array it is called with)",
        visuals: [arrViz(arr, { label: "numbers" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct === -1 ? 0 : correct - 1, why: "Off by one from the traced index." }],
        explanation: [res.found ? `The search finds ${target} at index ${correct} after ${plural(res.probes, "check")}.` : `${target} is not in numbers, so the search shrinks until low > high and returns -1.`].concat(dupMode && first !== last ? [`Values equal to ${target} appear at indexes ${arr.map((v, i) => (v === target ? i : null)).filter((x) => x !== null).join(", ")}. This implementation returns the first one its midpoints land on (index ${correct}).`] : []),
        trace: traceOf(res, target),
        spec: { op: "bin-return", arr, target },
        meta: { reasoning: d === "beginner" ? "one-step" : "multi-step", steps: res.probes, arrayLength: n, comparisons: res.probes },
      };
    },
  },
  {
    id: "b-exit-bounds",
    weight: { beginner: 0, intermediate: 1.5, advanced: 1.5 },
    build(r, d) {
      const n = sizeFor(r, d);
      const c = search(r, 80, () => { const arr = sortedArr(r, n, { dups: r() < 0.4 }); return { arr, target: chooseTarget(r, arr, pick(r, ["absent", "gap", "beforeAll", "afterAll"])) }; }, (res) => !res.found && res.steps.length >= 3);
      if (!c) return null;
      const { arr, target, res } = c;
      const correct = bounds(res.endLow, res.endHigh);
      const last = res.steps[res.steps.length - 1];
      const hm = binarySearch(arr, target, { bug: "high=mid" }), lm = binarySearch(arr, target, { bug: "low=mid" });
      const cands = [
        { value: bounds(res.endHigh, res.endLow), why: "low and high are swapped. When a search fails, low ends up one past high (low > high)." },
        { value: bounds(last.low, last.high), why: "Those are the bounds BEFORE the last update. The loop stops after the final update makes low > high." },
        { value: bounds(last.mid, last.mid), why: "The loop does not stop with both bounds on mid. It stops when the last update crosses them." },
        { value: bounds(res.endLow, res.endLow), why: "On exit low > high, so the bounds are different. They cross rather than meet." },
        { value: bounds(0, arr.length - 1), why: "Those are the STARTING bounds. Every unsuccessful pass moves one of them." },
        ...(hm.looped ? [] : [{ value: bounds(hm.endLow, hm.endHigh), why: "That comes from setting high = mid instead of mid - 1, which changes where the bounds end up." }]),
        ...(lm.looped ? [] : [{ value: bounds(lm.endLow, lm.endHigh), why: "That comes from setting low = mid instead of mid + 1, which changes where the bounds end up." }]),
      ];
      return {
        algorithm: "binary", skill: SKILL.result, family: "b-exit-bounds",
        stem: `The target ${target} is not in numbers. What are low and high when the while loop ends?`,
        code: binarySetup(arr, target) + "\n\n" + binaryLoop().split("\n").slice(0, 10).join("\n"), codeKind: "int-statements", codeLabel: "loop fragment (inside a method that returns an int)",
        visuals: [arrViz(arr, { label: "numbers" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [{ value: bounds(res.endLow + 1, res.endHigh), why: "low is one too large." }, { value: bounds(res.endLow, res.endHigh + 1), why: "high is one too large." }],
        explanation: traceOf(res, target), trace: traceOf(res, target),
        reveal: [vizAt(arr, { low: res.endLow, high: res.endHigh, label: "final bounds (low > high: nothing left to search)" })],
        spec: { op: "bin-exit", arr, target },
        meta: { reasoning: d === "intermediate" ? "multi-step" : "full-trace", steps: res.probes, arrayLength: n, comparisons: res.probes },
      };
    },
  },
  {
    id: "b-passes",
    weight: { beginner: 0, intermediate: 1.5, advanced: 1.8 },
    build(r, d) {
      const n = sizeFor(r, d) + (d === "advanced" ? randInt(r, 4, 20) : 0);
      const arr = sortedArr(r, n, { dups: r() < 0.3, hi: 200 });
      const absent = r() < 0.4;
      const target = chooseTarget(r, arr, absent ? "absent" : "present");
      const res = binarySearch(arr, target);
      const lin = linearSearch(arr, target);
      const correct = res.probes;
      const cands = [
        { value: lin.comparisons, why: "That counts elements from the left like a linear search. Binary search discards half the remaining range each pass." },
        { value: Math.ceil(n / 2), why: "Binary search does not check half of the elements; it halves the range repeatedly." },
        { value: Math.floor(Math.log2(n)), why: "log2 estimates the worst case, but you must trace this target. Count the actual loop passes." },
        { value: res.probes + 1, why: "You counted one extra pass. Count only the times the loop body runs." },
      ];
      return {
        algorithm: "binary", skill: SKILL.trace, family: "b-passes",
        stem: `How many times does the while loop body run when searching for ${target}? (Count every value of mid that is checked.)`,
        rule: "Count one loop pass per midpoint checked, including a pass that finds the target.",
        code: binaryMethod() + `\n\nint[] numbers = ${fmt(arr)};\nint result = search(numbers, ${target});`, codeKind: "methods", codeLabel: "Java",
        visuals: [arrViz(arr, { label: "numbers", indices: true })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct - 1, why: "One fewer than the true count." }, { value: correct + 2, why: "Two more than the true count." }],
        explanation: [`The loop runs ${plural(res.probes, "time")}. Midpoints checked: ${res.steps.map((s) => s.mid).join(", ")}.`, `A linear search would need ${plural(lin.comparisons, "comparison")} here.`],
        trace: traceOf(res, target),
        spec: { op: "bin-passes", arr, target },
        meta: { reasoning: d === "intermediate" ? "multi-step" : "full-trace", steps: res.probes, arrayLength: n, comparisons: res.probes },
      };
    },
  },
  {
    id: "b-mid-sequence",
    weight: { beginner: 0, intermediate: 0.5, advanced: 2.5 },
    build(r, d) {
      const n = sizeFor(r, d);
      const c = search(r, 100, () => { const arr = sortedArr(r, n, { dups: r() < 0.5 }); return { arr, target: chooseTarget(r, arr, r() < 0.4 ? "absent" : "present") }; }, (res) => res.steps.length >= 4);
      if (!c) return null;
      const { arr, target, res } = c;
      const seq = (x) => x.steps.map((s) => s.mid).join(", ");
      const correct = seq(res);
      const hm = binarySearch(arr, target, { bug: "high=mid" }), lm = binarySearch(arr, target, { bug: "low=mid" }), up = binarySearch(arr, target, { bug: "mid-hi" }), lin = linearSearch(arr, target);
      const cands = [
        { value: seq(hm), why: "That trace uses high = mid instead of high = mid - 1, so later midpoints differ." },
        { value: seq(lm), why: "That trace uses low = mid instead of low = mid + 1, so later midpoints differ." },
        { value: seq(up), why: "That trace rounds the midpoint up. (low + high) / 2 rounds down in Java." },
        { value: lin.steps.slice(0, res.steps.length).map((s) => s.index).join(", "), why: "That is the order a linear search visits indexes. Binary search jumps to the middle of the remaining range." },
        { value: res.steps.map((s) => s.value).join(", "), why: "Those are the values at each mid, not the mid indexes." },
      ];
      return {
        algorithm: "binary", skill: SKILL.trace, family: "b-mid-sequence",
        stem: `List every value of mid, in order, until the method returns. (target = ${target})`,
        code: binaryMethod() + `\n\nint[] numbers = ${fmt(arr)};\nint result = search(numbers, ${target});`, codeKind: "methods", codeLabel: "Java",
        visuals: [arrViz(arr, { label: "numbers" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [{ value: correct.split(", ").reverse().join(", "), why: "Those are the right midpoints in reverse order." }],
        explanation: traceOf(res, target), trace: traceOf(res, target),
        spec: { op: "bin-mids", arr, target },
        meta: { reasoning: "full-trace", steps: res.probes, arrayLength: n, comparisons: res.probes },
      };
    },
  },
  {
    id: "b-precondition",
    weight: { beginner: 0, intermediate: 0.3, advanced: 1.6 },
    build(r, d) {
      const n = d === "advanced" ? randInt(r, 6, 10) : randInt(r, 5, 7);
      const base = makeArray(r, { n, hi: 50, dups: r() < 0.35, shape: "sorted" });
      const bad = (kind) => {
        const b = base.slice();
        if (kind === "swap") { const i = randInt(r, 1, n - 3); if (b[i] === b[i + 1]) return null; [b[i], b[i + 1]] = [b[i + 1], b[i]]; return b; }
        if (kind === "reverse") return b.slice().reverse();
        if (kind === "last") { b.push(b[0] - 1); return b; }
        if (kind === "first") { b.unshift(b[b.length - 1] + 1); return b; }
        return null;
      };
      const wrong = [["swap", "Two neighbors are out of order (an element is bigger than the one after it). Binary search can discard the wrong half."], ["reverse", "This array is sorted from largest to smallest. This binary search assumes ascending order."], ["last", "The last element is smaller than the ones before it, so the array is not in ascending order."], ["first", "The first element is larger than the ones after it, so the array is not in ascending order."]]
        .map(([k, why]) => ({ value: bad(k), why }))
        .filter((c) => c.value && !c.value.every((v, i) => i === 0 || c.value[i - 1] <= v));
      if (wrong.length < 3) return null;
      return {
        algorithm: "binary", skill: SKILL.precond, family: "b-precondition",
        stem: "Which array can the binary search method below search correctly? (The method assumes ascending order; equal neighbors are fine.)",
        code: binaryMethod(), codeKind: "methods",
        visuals: [], answerKind: "array", correct: base, candidates: wrong,
        fallbacks: [],
        explanation: ["Binary search only works if the array is sorted in ascending order (non-decreasing). Each comparison discards half the range based on that order.", `The correct choice, ${fmt(base)}, is in order from left to right.`],
        spec: { op: "bin-valid-array" },
        meta: { reasoning: "precondition", steps: 5, arrayLength: base.length, comparisons: 0 },
      };
    },
  },
  {
    id: "b-unsorted-return",
    weight: { beginner: 0, intermediate: 0, advanced: 1.6 },
    build(r, d) {
      const n = randInt(r, 7, 11);
      let pickOne = null;
      const wantFound = r() < 0.5;
      for (let t = 0; t < 300 && !pickOne; t++) {
        const arr = makeArray(r, { n, hi: 50, shape: r() < 0.5 ? "partial" : "nearly" });
        if (arr.every((v, i) => i === 0 || arr[i - 1] <= v)) continue;
        const target = pick(r, arr);
        const res = binarySearch(arr, target);
        const lin = linearSearch(arr, target);
        if (res.index !== lin.index && res.found === wantFound) pickOne = { arr, target, res, lin };
      }
      if (!pickOne) return null;
      const { arr, target, res, lin } = pickOne;
      const correct = res.index;
      const cands = [
        { value: lin.index, why: `${target} IS at index ${lin.index}, but binary search only follows the sorted-order rule. On an unsorted array it can miss it.` },
        { value: -1, why: correct === -1 ? "" : "The midpoints actually land on a matching value in this array, so it does not return -1." },
        { value: arr.length - 1, why: "The method never returns the last index just because the array is unsorted. Trace the midpoints." },
        { value: target, why: "That is the target value. The method returns an index." },
        { value: res.probes, why: "That is the number of loop passes, not a return value." },
        { value: Math.floor((arr.length - 1) / 2), why: "That is only the first midpoint. The method keeps going (or returns -1)." },
      ].filter((c) => c.why);
      return {
        algorithm: "binary", skill: SKILL.precond, family: "b-unsorted-return",
        stem: `numbers is NOT sorted, and ${target} is in it. What does search(numbers, ${target}) return?`,
        code: binaryMethod() + `\n\nint[] numbers = ${fmt(arr)};`, codeKind: "methods",
        visuals: [arrViz(arr, { label: "numbers (not sorted)" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 1, why: "Off by one." }, { value: 0, why: "The search does not simply return the first index." }],
        explanation: [`Trace exactly what the code does, even though the precondition is broken:`].concat(traceOf(res, target)).concat([`${target} is actually at index ${lin.index}, but binary search ${res.found ? "stops at another match" : "never looks there"}.`]),
        trace: traceOf(res, target),
        spec: { op: "bin-return", arr, target },
        meta: { reasoning: "precondition", steps: Math.max(res.probes, 5), arrayLength: n, comparisons: res.probes },
      };
    },
  },
  {
    id: "b-bug-behavior",
    weight: { beginner: 0, intermediate: 0, advanced: 2.5 },
    build(r, d) {
      const bug = pick(r, ["high=mid", "low=mid", "lt-high"]);
      let found = null;
      for (let t = 0; t < 400 && !found; t++) {
        const n = randInt(r, 15, 24);
        const arr = sortedArr(r, n);
        const target = chooseTarget(r, arr, r() < 0.7 ? "present" : "absent");
        const good = binarySearch(arr, target);
        const bad = binarySearch(arr, target, { bug });
        const differs = bad.looped || bad.index !== good.index;
        if (differs) found = { arr, target, good, bad };
      }
      if (!found) return null;
      const { arr, target, good, bad } = found;
      const inArr = arr.includes(target);
      const outcome = (looped, index) => (looped ? "It never finishes: the loop runs forever." : index === -1 ? (inArr ? `It returns -1 even though ${target} is in the array.` : `It returns -1.`) : `It returns ${index}.`);
      const correct = outcome(bad.looped, bad.index);
      const cands = [
        { value: outcome(false, good.index), why: "That is what the correct version returns. This version has a defect that changes the result." },
        { value: "It returns -1.", why: bad.looped ? "The defect makes the bounds stop shrinking, so the loop never reaches the return -1." : "" },
        { value: "It never finishes: the loop runs forever.", why: bad.looped ? "" : "The bounds still change on every pass here, so the loop does end." },
        { value: "It throws an ArrayIndexOutOfBoundsException.", why: "mid always stays between low and high, which stay inside the array, so no invalid index is used." },
        { value: `It returns -1 even though ${target} is in the array.`, why: inArr ? "" : `${target} is not in the array, so -1 would be correct, not a miss.` },
      ].filter((c) => c.why);
      const label = { "high=mid": "high = mid;", "low=mid": "low = mid;", "lt-high": "while (low < high)" }[bug];
      return {
        algorithm: "binary", skill: SKILL.debug, family: "b-bug-behavior", variant: bug,
        stem: `This binary search has a defect (${label}). What happens when search(numbers, ${target}) runs?`,
        code: binaryMethod({ bug }) + `\n\nint[] numbers = ${fmt(arr)};`, codeKind: "methods",
        visuals: [arrViz(arr, { label: "numbers" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [{ value: `It returns ${arr.length}.`, why: "The method never returns the array length." }],
        explanation: bad.looped ? [`Trace until the bounds stop changing:`].concat(bad.steps.slice(0, 5).map((s) => `low = ${s.low}, high = ${s.high}, mid = ${s.mid}: ${s.action}`)).concat(["The same bounds repeat forever."]) : [`The defect (${label}) changes the result:`].concat(bad.steps.map((s) => `low = ${s.low}, high = ${s.high}, mid = ${s.mid}, numbers[mid] = ${s.value}${s.action === "found" ? " → found" : ""}`)),
        trace: bad.steps.map((s) => `low = ${s.low}, high = ${s.high}, mid = ${s.mid}: ${s.action}`),
        spec: { op: "bin-bug-outcome", arr, target, bug },
        meta: { reasoning: "debug", steps: Math.max(bad.looped ? 6 : bad.probes, 5), arrayLength: arr.length, comparisons: bad.probes },
      };
    },
  },
  {
    id: "b-find-bug",
    weight: { beginner: 0, intermediate: 0, advanced: 2 },
    build(r, d) {
      const bug = pick(r, ["high=mid", "low=mid", "lt-high"]);
      const code = binaryMethod({ bug });
      const lines = code.split("\n").map((l) => l.trim());
      const buggyLine = { "high=mid": "high = mid;", "low=mid": "low = mid;", "lt-high": "while (low < high) {" }[bug];
      const correctLine = { "high=mid": "high = mid - 1;", "low=mid": "low = mid + 1;", "lt-high": "while (low <= high) {" }[bug];
      const why = {
        "int mid = (low + high) / 2;": "The midpoint line is correct.",
        "return mid;": "Returning mid when numbers[mid] equals the target is correct.",
        "} else if (numbers[mid] < target) {": "This comparison is correct: a smaller middle value means search right.",
        "if (numbers[mid] == target) {": "Checking for the target first is correct.",
        "int high = numbers.length - 1;": "high should start at the last index, so this is correct.",
        "int low = 0;": "low should start at index 0, so this is correct.",
        "low = mid + 1;": "Skipping the middle after a too-small value is correct.",
        "high = mid - 1;": "Skipping the middle after a too-large value is correct.",
        "while (low <= high) {": "This loop condition is correct: a single remaining element still needs checking.",
        "return -1;": "Returning -1 when the loop ends is correct.",
      };
      const pool = Object.keys(why).filter((l) => l !== buggyLine && l !== correctLine && lines.includes(l));
      const cands = shuffle(r, pool).slice(0, 5).map((l) => ({ value: l, why: why[l] + " The defect is elsewhere." }));
      const label = { "high=mid": "never terminates on some inputs", "low=mid": "never terminates on some inputs", "lt-high": "can miss the target when only one element remains" }[bug];
      return {
        algorithm: "binary", skill: SKILL.debug, family: "b-find-bug", variant: bug,
        stem: `This method has exactly one incorrect line (symptom: it ${label}). Which line is wrong?`,
        code, codeKind: "methods",
        visuals: [], answerKind: "code", correct: buggyLine, candidates: cands, fallbacks: [],
        explanation: [`Wrong line: ${buggyLine}`, `It should be ${correctLine}`, bug === "lt-high" ? "With low < high the loop stops before checking the last remaining element, so a target at low == high is never examined." : "numbers[mid] was already compared. Keeping mid inside the range can leave low and high unchanged forever."],
        spec: { op: "bin-bug-line", bug },
        meta: { reasoning: "debug", steps: 6, comparisons: 0 },
      };
    },
  },
  {
    id: "b-impl-compare",
    weight: { beginner: 0, intermediate: 0, advanced: 2 },
    build(r, d) {
      let found = null;
      for (let t = 0; t < 400 && !found; t++) {
        const n = randInt(r, 8, 16);
        const arr = sortedArr(r, n, { dups: true });
        const dupVals = arr.filter((v, i) => arr.indexOf(v) !== arr.lastIndexOf(v));
        if (!dupVals.length) continue;
        const target = pick(r, dupVals);
        const a = binarySearch(arr, target), b = binarySearch(arr, target, { bug: "mid-hi" });
        if (a.index !== b.index) found = { arr, target, a, b };
      }
      if (!found) return null;
      const { arr, target, a, b } = found;
      const pair = (x, y) => `searchA returns ${x}, searchB returns ${y}`;
      const correct = pair(a.index, b.index);
      const first = arr.indexOf(target), last = arr.lastIndexOf(target);
      const cands = [
        { value: pair(b.index, a.index), why: "You swapped the methods. searchA uses the lower midpoint (low + high) / 2; searchB adds 1 first, so it uses the upper midpoint." },
        { value: pair(first, last), why: "Neither method is designed to return the first or last occurrence. Each returns the first match its midpoints reach." },
        { value: pair(a.index, a.index), why: "searchB uses a different midpoint formula, so its midpoints (and the match it reaches) can differ." },
        { value: pair(b.index, b.index), why: "searchA uses the lower midpoint, so its midpoints can differ from searchB's." },
      ];
      const A = binaryMethod().replace("search(", "searchA(");
      const B = binaryMethod({ mid: "upper" }).replace("search(", "searchB(");
      return {
        algorithm: "binary", skill: SKILL.debug, family: "b-impl-compare",
        stem: `Both methods are correct searches of a sorted array; they differ only in how mid is rounded. The array has duplicates of ${target}. What does each return for target ${target}?`,
        code: A + "\n\n" + B + `\n\nint[] numbers = ${fmt(arr)};`, codeKind: "methods", codeLabel: "Java (two implementations)",
        visuals: [arrViz(arr, { label: "numbers" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [{ value: pair(a.index + 1, b.index), why: "You counted from 1 for searchA." }],
        explanation: [`searchA midpoints: ${a.steps.map((s) => s.mid).join(", ")} → returns ${a.index}.`, `searchB midpoints: ${b.steps.map((s) => s.mid).join(", ")} → returns ${b.index}.`, `Both are valid binary searches, but with duplicates they can return different matching indexes.`],
        trace: [],
        spec: { op: "bin-impl-compare", arr, target },
        meta: { reasoning: "implementation", steps: a.probes + b.probes, arrayLength: arr.length, comparisons: a.probes + b.probes },
      };
    },
  },
];
