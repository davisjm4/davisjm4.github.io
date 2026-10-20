/* Mode 3 — Trace Insertion Sort families.
   Convention: key = a[i]; elements GREATER than key (strict >) shift one place
   right (a[j+1] = a[j]); the key is then written into the gap. Equal elements are
   not passed, so the sort is stable. A shift is one execution of a[j+1] = a[j].
   A comparison is one evaluation of a[j] > key (only while j >= 0). */
import { randInt, pick, shuffle } from "../rng.js";
import { makeArray, fmt } from "../arrays.js";
import { insertionSort, selectionSort } from "../algorithms.js";
import { insertionLoop } from "../code.js";
import { arrViz, plural, range } from "../kit.js";
import { arrEq } from "../distractors.js";

const SKILL = { key: "Insertion sort: the key", pos: "Insertion sort: insertion position", pass: "Insertion sort: array after a pass", shift: "Insertion sort: shifting", count: "Insertion sort: counting work", invalid: "Insertion sort: spotting incorrect steps", trace: "Insertion sort: full trace", defect: "Insertion sort: defective code", compare: "Insertion sort: vs. selection sort" };
export const RULE_INS = "Insertion sort here shifts elements that are strictly greater than the key one place to the right (a[j + 1] = a[j]); equal elements are not shifted. A shift is not a swap: only one write per moved element.";
const sizeFor = (r, d) => (d === "beginner" ? randInt(r, 4, 5) : d === "intermediate" ? randInt(r, 6, 8) : randInt(r, 7, 10));
const arrayFor = (r, d) => {
  const n = sizeFor(r, d);
  for (let t = 0; t < 60; t++) {
    const a = makeArray(r, { n, hi: d === "beginner" ? 15 : 40, dups: d !== "beginner" && r() < 0.5, negatives: d !== "beginner" && r() < 0.3, shape: pick(r, ["random", "random", "partial", "nearly", "reverse"]) });
    const res = insertionSort(a);
    if (res.shifts >= 2 && res.passes.some((p) => p.shifts >= 2)) return a;
  }
  return makeArray(r, { n, hi: 30, shape: "reverse" });
};
export function insPass(state, i) {
  const a = state.slice();
  const key = a[i];
  let j = i - 1;
  while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
  a[j + 1] = key;
  return a;
}
const ordinal = (k) => ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"][k] || `#${k}`;
const iViz = (arr, { sortedTo = 0, key = null, gap = null, shifted = [], label = "" } = {}) => {
  const roles = {};
  const add = (i, x) => (roles[i] = (roles[i] || []).concat(x));
  for (let i = 0; i < sortedTo; i++) add(i, "sorted");
  shifted.forEach((i) => add(i, "shift"));
  if (key !== null) add(key, "key");
  if (gap !== null) add(gap, "gap");
  return arrViz(arr, { roles, label });
};
export function passText(p) {
  const head = `i = ${p.i}: key = ${p.key}.`;
  if (p.shifts === 0) return `${head} a[${p.i - 1}] = ${p.before[p.i - 1]} is not greater than ${p.key}, so nothing shifts; the key stays at index ${p.i}.`;
  const moved = p.compares.filter((c) => c.greater).map((c) => `a[${c.j}] = ${c.aj}`);
  return `${head} ${plural(p.shifts, "element")} greater than ${p.key} shift right (${moved.join(", ")}). The key goes into index ${p.insertAt} → {${p.after.join(", ")}}.`;
}
const fullTrace = (res) => res.passes.map(passText);
const baseCode = (arr, variant = "std") => `int[] values = ${fmt(arr)};\n\n${insertionLoop("values", variant)}`;
const codeLabel = "Java statements (values is the array being sorted)";
const stateAt = (res, arr, i) => (i === 0 ? arr : res.passes[i - 1].after); // after processing index i
/* misconception executions */
const insAdjSwapOnce = (state, i) => { const a = state.slice(); if (i > 0 && a[i - 1] > a[i]) [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; };
const insTooEarly = (state, i) => {
  // key is inserted ONE position before its correct slot (the element left of it is wrongly passed)
  const key = state[i];
  let j = i - 1;
  while (j >= 0 && state[j] > key) j--;
  const slot = Math.max(0, j + 1 - 1);
  const rest = state.slice(0, i).concat(state.slice(i + 1));
  rest.splice(slot, 0, key);
  return rest;
};
const insNoShift = (state, i) => {
  // writes the key into its slot WITHOUT shifting: overwrites an element
  const a = state.slice();
  const key = a[i];
  let j = i - 1;
  while (j >= 0 && a[j] > key) j--;
  a[j + 1] = key;
  return a;
};
const selAfter = (arr, k) => selectionSort(arr).passes[Math.min(k, arr.length - 1) - 1]?.after;

export const insertionFamilies = [
  {
    id: "i-key-pos",
    weight: { beginner: 3, intermediate: 1.2, advanced: 0 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const res = insertionSort(arr);
      const moving = res.passes.filter((p) => p.moved);
      const p = pick(r, d === "beginner" ? moving.slice(0, 2) : moving);
      if (!p) return null;
      const askKey = d === "beginner" && r() < 0.5;
      const sortedPrefix = p.before.slice(0, p.i);
      if (askKey) {
        const correct = p.key;
        const cands = [
          { value: p.before[p.i - 1], why: "That is the last element of the sorted prefix. The key is the value at index i, the next element to insert." },
          { value: p.before[0], why: "That is the first element. The key changes each pass: it is a[i]." },
          { value: p.i, why: "That is the INDEX i. The key is the VALUE stored at that index." },
          { value: p.before[Math.min(p.i + 1, arr.length - 1)], why: "That is the next element. The key at pass i is a[i], the element about to be inserted." },
        ];
        return {
          algorithm: "insertion", skill: SKILL.key, family: "i-key-pos", variant: "key", rule: RULE_INS,
          stem: `When i = ${p.i}, what is the value of key?`, code: baseCode(arr), codeLabel,
          visuals: [iViz(p.before, { sortedTo: p.i, key: p.i, label: `values when i = ${p.i} (sorted prefix marked)` })],
          answerKind: "int", correct, candidates: cands, fallbacks: [{ value: p.key + 1, why: "Not the value at index i." }],
          explanation: [`key = values[${p.i}] = ${p.key}. The prefix values[0..${p.i - 1}] = {${sortedPrefix.join(", ")}} is already sorted.`], trace: fullTrace(res),
          spec: { op: "ins-key", arr, i: p.i },
          meta: { reasoning: "one-step", steps: 1, arrayLength: arr.length, comparisons: 0, passes: 1 },
        };
      }
      const correct = p.insertAt;
      const cands = [
        { value: p.i, why: "That is where the key already is. It moves left past every larger element in the sorted prefix." },
        { value: p.insertAt + 1, why: "That inserts the key one position too late, after a larger element. The key goes where it is no longer smaller than the element on its left." },
        { value: Math.max(0, p.insertAt - 1), why: "That inserts the key one position too early, before an element that is smaller than it." },
        { value: sortedPrefix.findIndex((v) => v > p.key) === -1 ? p.i : sortedPrefix.lastIndexOf(Math.max(...sortedPrefix)), why: "That is the position of the largest element, not where the key belongs." },
        { value: 0, why: "The key goes at the front only if it is smaller than every element of the prefix." },
      ];
      return {
        algorithm: "insertion", skill: SKILL.pos, family: "i-key-pos", variant: "pos", rule: RULE_INS,
        stem: `When i = ${p.i}, key = ${p.key}. At which index is the key finally inserted (the value of j + 1 after the while loop)?`,
        code: baseCode(arr), codeLabel,
        visuals: [iViz(p.before, { sortedTo: p.i, key: p.i, label: `values when i = ${p.i}` })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: p.insertAt + 2 <= arr.length - 1 ? p.insertAt + 2 : p.insertAt - 2 >= 0 ? p.insertAt - 2 : p.insertAt + 3, why: "Not the position where the shifting stops." }],
        explanation: [passText(p)], trace: fullTrace(res),
        reveal: [iViz(p.after, { sortedTo: p.i + 1, key: p.insertAt, label: `after i = ${p.i}` })],
        spec: { op: "ins-pos", arr, i: p.i },
        meta: { reasoning: d === "beginner" ? "one-step" : "multi-step", steps: p.compares.length + 1, arrayLength: arr.length, comparisons: p.compares.length, shifts: p.shifts, passes: 1 },
      };
    },
  },
  {
    id: "i-after-pass",
    weight: { beginner: 3, intermediate: 3, advanced: 2 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const res = insertionSort(arr);
      const maxI = d === "beginner" ? 2 : d === "intermediate" ? 4 : res.passes.length;
      const i = d === "beginner" ? randInt(r, 1, 2) : randInt(r, 2, Math.max(2, Math.min(maxI, res.passes.length)));
      if (i > res.passes.length) return null;
      const correct = res.passes[i - 1].after;
      const prev = stateAt(res, arr, i - 1);
      const cands = [
        { value: insAdjSwapOnce(prev, i), why: "That swaps the key with only its left neighbor. Insertion sort keeps shifting until the key reaches its place." },
        { value: insNoShift(prev, i), why: "That writes the key into its slot without shifting anything, which overwrites an element. Insertion sort first shifts EVERY larger element right to open a gap." },
        { value: prev, why: "That is the array before this pass. The key at index " + i + " was inserted, which can change the array." },
        { value: stateAt(res, arr, Math.min(i + 1, res.passes.length)), why: "That is one pass too far." },
        { value: selAfter(arr, i), why: "That is selection sort's result. Insertion sort inserts the key into the sorted prefix by shifting, not by swapping in a minimum." },
        { value: insTooEarly(prev, i), why: "That inserts the key one position too early." },
      ];
      return {
        algorithm: "insertion", skill: SKILL.pass, family: "i-after-pass", rule: RULE_INS,
        stem: `What is the array after the pass with i = ${i} (the key from index ${i} has been inserted)?`,
        code: baseCode(arr), codeLabel, visuals: [iViz(arr, { label: "values at the start" })],
        answerKind: "array", correct, candidates: cands, fallbacks: [],
        explanation: res.passes.slice(0, i).map(passText), trace: fullTrace(res),
        reveal: [iViz(correct, { sortedTo: i + 1, label: `after i = ${i}` })],
        spec: { op: "ins-after-pass", arr, i },
        meta: { reasoning: d === "beginner" ? "one-pass" : "pass-state", steps: res.passes.slice(0, i).reduce((s, p) => s + p.compares.length + 1, 0), arrayLength: arr.length, comparisons: res.passes.slice(0, i).reduce((s, p) => s + p.compares.length, 0), shifts: res.passes.slice(0, i).reduce((s, p) => s + p.shifts, 0), passes: i },
      };
    },
  },
  {
    id: "i-next-shift",
    weight: { beginner: 1.5, intermediate: 2.2, advanced: 1 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const res = insertionSort(arr);
      const cand = res.passes.filter((p) => p.shifts >= 2);
      const p = pick(r, cand);
      if (!p) return null;
      const kind = pick(r, ["count", "which-first", "count"]);
      if (kind === "which-first") {
        const first = p.compares[0];
        const correct = first.j;
        const cands = [
          { value: p.insertAt, why: "That is where the key will land at the end. The first element to shift is the one just left of the key." },
          { value: p.i, why: "That is the key's own position. The first element to shift is a[i - 1]." },
          { value: 0, why: "Shifting starts next to the key and moves left; index 0 is the last element compared, not the first." },
          { value: p.i - 2, why: "The comparison starts at j = i - 1, immediately left of the key." },
        ];
        return {
          algorithm: "insertion", skill: SKILL.shift, family: "i-next-shift", variant: "first", rule: RULE_INS,
          stem: `At the start of the pass with i = ${p.i} (key = ${p.key}), which index holds the first element that is shifted right?`,
          code: baseCode(arr), codeLabel, visuals: [iViz(p.before, { sortedTo: p.i, key: p.i, label: `values when i = ${p.i}` })],
          answerKind: "int", correct, candidates: cands, fallbacks: [{ value: p.i + 1 < arr.length ? p.i + 1 : p.i - 3 >= 0 ? p.i - 3 : 1, why: "Not next to the key." }],
          explanation: [passText(p)], trace: fullTrace(res),
          reveal: [iViz(p.after, { sortedTo: p.i + 1, key: p.insertAt, label: "after the pass" })],
          spec: { op: "ins-first-shift", arr, i: p.i },
          meta: { reasoning: d === "beginner" ? "one-step" : "multi-step", steps: p.compares.length + 1, arrayLength: arr.length, comparisons: p.compares.length, shifts: p.shifts, passes: 1 },
        };
      }
      const correct = p.shifts;
      const cands = [
        { value: 1, why: "Insertion sort keeps shifting while the element on the left is greater than the key; here more than one element moves." },
        { value: p.compares.length, why: "That counts comparisons, which includes the final comparison that stops the loop (or the loop ending at index 0). Count only the shifts." },
        { value: p.shifts + 1, why: "You counted the key's final write as a shift. The key is written once with a[j + 1] = key; that is not a shift." },
        { value: p.i, why: "That is every element of the sorted prefix. Only the elements GREATER than the key shift." },
        { value: p.shifts * 2, why: "A shift is one write per element. A swap would be three writes; insertion sort does not swap." },
      ];
      return {
        algorithm: "insertion", skill: SKILL.shift, family: "i-next-shift", variant: "count", rule: "Count each execution of a[j + 1] = a[j] as one shift. The final write of the key is not a shift.",
        stem: `During the pass with i = ${p.i} (key = ${p.key}), how many elements are shifted one place to the right?`,
        code: baseCode(arr), codeLabel, visuals: [iViz(p.before, { sortedTo: p.i, key: p.i, label: `values when i = ${p.i}` })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: p.shifts + 2, why: "Two more than the true count." }],
        explanation: [passText(p)], trace: fullTrace(res),
        reveal: [iViz(p.after, { sortedTo: p.i + 1, key: p.insertAt, label: "after the pass" })],
        spec: { op: "ins-shifts-pass", arr, i: p.i },
        meta: { reasoning: d === "beginner" ? "one-step" : "multi-step", steps: p.compares.length + 1, arrayLength: arr.length, comparisons: p.compares.length, shifts: p.shifts, passes: 1 },
      };
    },
  },
  {
    id: "i-count",
    weight: { beginner: 0, intermediate: 2.2, advanced: 2.5 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const res = insertionSort(arr);
      const kind = pick(r, d === "intermediate" ? ["cmp-pass", "shifts-first-k"] : ["cmp-total", "shifts-total", "cmp-first-k"]);
      let stem, rule, correct, cands, spec, expl, work, steps;
      const cmpRule = "Count each evaluation of a[j] > key (only while j >= 0). The check of j >= 0 itself is not counted.";
      const shRule = "Count each execution of a[j + 1] = a[j] as one shift. Writing the key is not a shift.";
      if (kind === "cmp-pass") {
        const k = randInt(r, 2, Math.min(5, res.passes.length));
        const p = res.passes[k - 1];
        correct = p.compares.length; rule = cmpRule;
        stem = `How many times is a[j] > key evaluated during the pass with i = ${p.i}?`;
        cands = [{ value: k, why: "That is the pass number, not the number of comparisons." }, { value: p.shifts, why: "That counts only the comparisons that were true (shifts). The comparison that stops the loop is also evaluated" + (p.insertAt === 0 ? " — except when j reaches -1, where the loop ends before comparing." : ".") }, { value: p.i, why: "That is the size of the sorted prefix, the most comparisons possible. Insertion sort stops as soon as a[j] is not greater than the key." }, { value: p.compares.length + 1, why: "You counted a comparison that never happened (for example, one with j = -1)." }, { value: p.shifts + 2, why: "Too many comparisons for this pass." }, { value: n - 1, why: "That is the number of passes in the whole sort, not comparisons in this pass." }];
        spec = { op: "ins-compares-pass", arr, i: p.i };
        expl = [passText(p), `Comparisons: ${p.compares.map((c) => `a[${c.j}]=${c.aj} > ${c.key}? ${c.greater ? "yes" : "no"}`).join("; ")}.`];
        steps = p.compares.length + 1; work = { comparisons: correct, shifts: p.shifts, passes: 1 };
      } else if (kind === "shifts-first-k") {
        const k = randInt(r, 2, Math.min(5, res.passes.length));
        correct = res.passes.slice(0, k).reduce((s, p) => s + p.shifts, 0); rule = shRule;
        stem = `How many shifts happen during the passes i = 1 through i = ${k}?`;
        cands = [{ value: res.passes.slice(0, k).reduce((s, p) => s + p.compares.length, 0), why: "That counts comparisons. Comparisons that stop a pass are not shifts." }, { value: correct + k, why: "You counted each key write as a shift. Writing the key is not a shift." }, { value: res.passes.slice(0, k).filter((p) => p.moved).length, why: "That counts passes in which the key moved, not elements shifted." }, { value: res.shifts, why: "That counts shifts for the WHOLE sort, not just the first " + k + " passes." }, { value: k, why: "That is the number of passes, not shifts." }];
        spec = { op: "ins-shifts-first-k", arr, k };
        expl = [`Shifts per pass: ${res.passes.slice(0, k).map((p) => p.shifts).join(" + ")} = ${correct}.`]; steps = res.passes.slice(0, k).reduce((s, p) => s + p.compares.length + 1, 0); work = { shifts: correct, passes: k };
      } else if (kind === "cmp-total") {
        correct = res.comparisons; rule = cmpRule;
        stem = "How many times is a[j] > key evaluated during the complete sort?";
        cands = [{ value: res.shifts, why: "That counts shifts only. Some passes also evaluate a comparison that is false." }, { value: (n * (n - 1)) / 2, why: "That is the worst case (reverse order). Count the actual comparisons for THIS array." }, { value: res.shifts + n - 1, why: "That assumes every pass ends with one false comparison. A pass that reaches the front (j = -1) has no false comparison." }, { value: res.comparisons + res.passes.length, why: "You added a comparison for each pass." }, { value: n - 1, why: "That is the number of passes, not comparisons." }];
        spec = { op: "ins-compares-total", arr };
        expl = [`Comparisons per pass: ${res.passes.map((p) => p.compares.length).join(" + ")} = ${correct}.`]; steps = correct; work = { comparisons: correct, shifts: res.shifts, passes: n - 1 };
      } else if (kind === "shifts-total") {
        correct = res.shifts; rule = shRule;
        stem = "How many shifts a[j + 1] = a[j] happen during the complete sort?";
        cands = [{ value: res.comparisons, why: "That counts comparisons, including the false comparison that ends many passes." }, { value: correct + n - 1, why: "You added one write of the key per pass. Those are not shifts." }, { value: res.passes.filter((p) => p.moved).length, why: "That counts passes where the key moved, not elements shifted." }, { value: (n * (n - 1)) / 2, why: "That is the worst-case (reverse order) count, not this array's count." }, { value: n - 1, why: "That is the number of passes, not shifts." }];
        spec = { op: "ins-shifts-total", arr };
        expl = [`Shifts per pass: ${res.passes.map((p) => p.shifts).join(" + ")} = ${correct}.`]; steps = correct + n; work = { shifts: correct, passes: n - 1 };
      } else {
        const k = randInt(r, 2, Math.min(5, res.passes.length));
        correct = res.passes.slice(0, k).reduce((s, p) => s + p.compares.length, 0); rule = cmpRule;
        stem = `How many times is a[j] > key evaluated during passes i = 1 through i = ${k}?`;
        cands = [{ value: res.passes.slice(0, k).reduce((s, p) => s + p.shifts, 0), why: "That counts only shifts. Each pass may also evaluate one false comparison." }, { value: correct + k, why: "You added one extra comparison per pass, but some passes reach index 0 and end without one." }, { value: (k * (k + 1)) / 2, why: "That is the worst case for these passes, not the actual count for this array." }, { value: res.comparisons, why: "That counts the whole sort, not just " + k + " passes." }, { value: k, why: "That is the number of passes, not comparisons." }];
        spec = { op: "ins-compares-first-k", arr, k };
        expl = [`Comparisons per pass: ${res.passes.slice(0, k).map((p) => p.compares.length).join(" + ")} = ${correct}.`]; steps = correct + k; work = { comparisons: correct, passes: k };
      }
      return {
        algorithm: "insertion", skill: SKILL.count, family: "i-count", variant: kind, rule,
        stem, code: baseCode(arr), codeLabel, visuals: [iViz(arr, { label: "values at the start" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 1, why: "One more than the true count." }, { value: Math.max(0, correct - 1), why: "One fewer than the true count." }],
        explanation: expl, trace: fullTrace(res), spec,
        meta: { reasoning: "count", steps: Math.max(steps, 3), arrayLength: n, ...work },
      };
    },
  },
  {
    id: "i-vs-selection",
    weight: { beginner: 1, intermediate: 1.8, advanced: 1.5 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const ins = insertionSort(arr), sel = selectionSort(arr);
      const k = randInt(r, 2, Math.min(d === "beginner" ? 3 : 4, ins.passes.length));
      const which = r() < 0.5 ? "insertion" : "selection";
      const iA = ins.passes[k - 1].after, sA = sel.passes[k - 1].after;
      if (arrEq(iA, sA)) return null;
      const a = which === "insertion" ? iA : sA, b = which === "insertion" ? sA : iA;
      const correct = which === "insertion" ? "Insertion sort" : "Selection sort";
      const other = which === "insertion" ? "Selection sort" : "Insertion sort";
      const cands = [{ value: other, why: `${other} would give ${fmt(b)} after ${k} passes. ${which === "insertion" ? "The shown array keeps the original order of the first elements and inserts each key into a sorted prefix." : "The shown array holds the smallest values of the whole array at the front, placed by swaps."}` }, { value: "Both give this array", why: "They produce different arrays after the same number of passes on this input." }, { value: "Neither can produce this array", why: `${correct} produces it.` }];
      return {
        algorithm: "insertion", skill: SKILL.compare, family: "i-vs-selection", rule: "",
        stem: `Starting from the array below, one of the two sorts was run for ${k} passes (selection sort: ${k} outer passes; insertion sort: i = 1 to ${k}) and produced the array shown. Which algorithm was it?`,
        code: "", visuals: [arrViz(arr, { label: "starting array" }), arrViz(a, { label: `after ${k} passes of ?` })],
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: [`Insertion sort after ${k} passes (i = 1..${k}): ${fmt(iA)}.`, `Selection sort after ${k} passes: ${fmt(sA)}.`, "Insertion sort keeps the ORIGINAL left-to-right order of the first elements and inserts each key into the sorted prefix. Selection sort pulls the smallest value from the whole unsorted part."],
        spec: { op: "ins-vs-sel", arr, k, shown: a },
        meta: { reasoning: d === "beginner" ? "recognize" : "evidence", steps: k * 2, arrayLength: arr.length, comparisons: 0, passes: k },
      };
    },
  },
  {
    id: "i-invalid-step",
    weight: { beginner: 0, intermediate: 1.2, advanced: 2.4 },
    build(r, d) {
      const arr = arrayFor(r, d);
      const n = arr.length;
      const rows = d === "advanced" ? Math.min(n - 1, 5) : 4;
      const bad = randInt(r, 1, rows);
      const prevOf = (b) => { let s = arr; for (let p = 1; p < b; p++) s = insPass(s, p); return s; };
      const prev = prevOf(bad), i = bad;
      const correctNext = insPass(prev, i);
      const options = shuffle(r, [["swapped the key with only its left neighbor", insAdjSwapOnce(prev, i)], ["wrote the key into its slot without shifting, overwriting an element", insNoShift(prev, i)], ["inserted the key one place too early", insTooEarly(prev, i)], ["skipped the pass", prev.slice()]]);
      const pickOpt = options.find(([, a]) => !arrEq(a, correctNext));
      if (!pickOpt) return null;
      const states = [arr];
      for (let p = 1; p <= rows; p++) states.push(p === bad ? pickOpt[1] : insPass(states[p - 1], p));
      const labels = range(1, rows).map((p) => `After i = ${p}`);
      const correct = labels[bad - 1];
      const cands = labels.filter((_, k) => k !== bad - 1).map((l) => ({ value: l, why: `${l} follows correctly from the row above it.` }));
      return {
        algorithm: "insertion", skill: SKILL.invalid, family: "i-invalid-step", rule: RULE_INS,
        stem: "A student traced insertion sort, making exactly one mistake in one row. Every other row is computed correctly from the row above it. Which row is wrong?",
        code: baseCode(arr), codeLabel,
        visuals: states.map((s, idx) => arrViz(s, { label: idx === 0 ? "Start" : `After i = ${idx}`, indices: idx === 0 })),
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: [`${correct} is wrong: the student ${pickOpt[0]}.`, `The correct state is {${correctNext.join(", ")}}.`], trace: fullTrace(insertionSort(arr)),
        spec: { op: "ins-invalid-row", arr, rows, bad, states },
        meta: { reasoning: d === "advanced" ? "debug" : "multi-step", steps: rows * 2, arrayLength: n, comparisons: 0, passes: rows },
      };
    },
  },
  {
    id: "i-defect",
    weight: { beginner: 0, intermediate: 0, advanced: 2.6 },
    build(r, d) {
      const variant = pick(r, ["j>0", "lt", "ge"]);
      for (let t = 0; t < 80; t++) {
        const n = randInt(r, 5, 7);
        const arr = makeArray(r, { n, hi: 30, dups: variant === "ge" || r() < 0.3, shape: "random" });
        const std = insertionSort(arr), bad = insertionSort(arr, variant);
        if (arrEq(std.result, bad.result) && variant !== "ge") continue;
        if (variant === "ge" && bad.comparisons === std.comparisons) continue;
        const label = { "j>0": "while (j > 0 && values[j] > key)", lt: "while (j >= 0 && values[j] < key)", ge: "while (j >= 0 && values[j] >= key)" }[variant];
        if (variant === "ge") {
          const correct = bad.shifts;
          const cands = [{ value: std.shifts, why: "That is the shift count when the test is > (equal values are not shifted). With >=, equal elements also shift." }, { value: bad.comparisons, why: "That counts comparisons, not shifts." }, { value: bad.shifts + 1, why: "One too many." }, { value: Math.max(0, bad.shifts - 1), why: "One too few." }];
          return {
            algorithm: "insertion", skill: SKILL.defect, family: "i-defect", variant, rule: "Count each execution of values[j + 1] = values[j] as one shift.",
            stem: `This version tests ${label}. The array has duplicates. How many shifts happen during the complete sort?`,
            code: baseCode(arr, "ge"), codeLabel, visuals: [arrViz(arr, { label: "values at the start" })],
            answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true count." }],
            explanation: [`With >=, an element equal to the key is also shifted, so more shifts occur (${bad.shifts} instead of ${std.shifts}). The array still ends sorted, but equal elements swap their original order (not stable).`], trace: fullTrace(bad),
            spec: { op: "ins-defect-shifts", arr, variant },
            meta: { reasoning: "defect", steps: bad.comparisons + bad.shifts, arrayLength: n, comparisons: bad.comparisons, shifts: bad.shifts, passes: n - 1 },
          };
        }
        const correct = bad.result;
        const cands = [{ value: std.result, why: "That is what the CORRECT version produces. This version's defect changes the result." }, { value: arr.slice(), why: "The code does run and changes the array in some passes." }, { value: [...arr].sort((a, b) => b - a), why: variant === "lt" ? "" : "This code does not sort descending." }, { value: bad.passes[Math.max(0, bad.passes.length - 2)].after, why: "That is the array one pass early; the final pass still runs." }, { value: std.passes[Math.max(0, std.passes.length - 2)].after, why: "That is a state of the correct sort, not the defective code." }].filter((c) => c.why);
        return {
          algorithm: "insertion", skill: SKILL.defect, family: "i-defect", variant, rule: "",
          stem: `This version tests ${label}. What is the array after the whole sort finishes?`,
          code: baseCode(arr, variant), codeLabel, visuals: [arrViz(arr, { label: "values at the start" })],
          answerKind: "array", correct, candidates: cands, fallbacks: [],
          explanation: variant === "j>0" ? ["With j > 0 the loop stops before comparing against values[0], so a smaller key can never move into index 0; the first element is never shifted."].concat(fullTrace(bad).slice(0, 3)) : ["With < instead of >, the loop shifts SMALLER elements, so each key moves to the right of smaller values: the array ends up in descending order."].concat(fullTrace(bad).slice(0, 3)),
          trace: fullTrace(bad), spec: { op: "ins-defect-result", arr, variant },
          meta: { reasoning: "defect", steps: bad.comparisons + bad.shifts, arrayLength: n, comparisons: bad.comparisons, shifts: bad.shifts, passes: n - 1 },
        };
      }
      return null;
    },
  },
  {
    id: "i-full-trace",
    weight: { beginner: 0, intermediate: 0.6, advanced: 2.6 },
    build(r, d) {
      const n = d === "advanced" ? randInt(r, 5, 7) : 5;
      const arr = makeArray(r, { n, hi: 30, dups: r() < 0.4, shape: pick(r, ["random", "partial", "reverse"]) });
      const res = insertionSort(arr);
      const rows = n - 1;
      const toTrace = (f) => { const t = []; let s = arr; for (let i = 1; i <= rows; i++) { s = f(s, i); t.push(s); } return t; };
      const correct = res.passes.map((p) => p.after);
      const sel = selectionSort(arr).passes.map((p) => p.after);
      const cands = [
        { value: toTrace(insAdjSwapOnce), why: "This trace only swaps the key with its left neighbor once. Insertion sort keeps moving the key left until it is in place." },
        { value: sel.slice(0, rows), why: "These are selection sort's states: minimums swapped to the front." },
        { value: toTrace(insNoShift), why: "This trace writes each key into its slot without shifting, overwriting elements." },
        { value: toTrace((s, i) => insPass(s, Math.min(i + 1, s.length - 1))), why: "This trace starts each pass at the wrong index (it inserts a[i + 1])." },
      ];
      return {
        algorithm: "insertion", skill: SKILL.trace, family: "i-full-trace", rule: RULE_INS,
        stem: "Which list shows the array after each pass (i = 1, 2, ...) of insertion sort, in order?",
        code: baseCode(arr), codeLabel, visuals: [arrViz(arr, { label: "values at the start" })],
        answerKind: "trace", correct, candidates: cands, fallbacks: [],
        explanation: fullTrace(res), trace: fullTrace(res), spec: { op: "ins-full-trace", arr },
        meta: { reasoning: "full-trace", steps: res.comparisons + res.shifts, arrayLength: n, comparisons: res.comparisons, shifts: res.shifts, passes: rows, states: rows },
      };
    },
  },
];
