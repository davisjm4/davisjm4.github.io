/* Mode 6 — Compare the Work. Every count comes from the simulators; every stem
   states exactly what is being counted (the `rule`). */
import { randInt, pick, shuffle } from "../rng.js";
import { makeArray, chooseTarget, fmt } from "../arrays.js";
import { linearSearch, binarySearch, selectionSort, insertionSort, mergeSort, merge } from "../algorithms.js";
import { binaryMethod } from "../code.js";
import { arrViz, plural } from "../kit.js";

const SKILL = { search: "Compare the Work: linear vs. binary search", sorts: "Compare the Work: comparing sorts", count: "Compare the Work: counting operations", cases: "Compare the Work: best and worst cases", growth: "Compare the Work: growth with array size", fit: "Compare the Work: choosing an algorithm" };
export const RULE_LINEAR = "Count each evaluation of values[i] == target in linear search.";
export const RULE_BINARY = "Count each loop pass of binary search (one look at values[mid]); a pass counts once even though it may test == and then <.";
export const RULE_SORT_CMP = "Count only comparisons between two array values: a[j] < a[minIndex] in selection sort, a[j] > key in insertion sort, and a[i] <= a[j] in merge. Do not count swaps, shifts, or copies.";
const NAMES = { linear: "Linear search", binary: "Binary search" };
const SN = { selection: "Selection sort", insertion: "Insertion sort", merge: "Merge sort" };

const linearCode = `public static int linearSearch(int[] values, int target) {\n    for (int i = 0; i < values.length; i++) {\n        if (values[i] == target) {\n            return i;\n        }\n    }\n    return -1;\n}`;
const binaryCode = binaryMethod().replace("numbers", "numbers");

export const compareFamilies = [
  {
    id: "c-which-search",
    weight: { beginner: 2.0, intermediate: 1.6, advanced: 0.6 },
    build(r, d) {
      const n = d === "beginner" ? pick(r, [8, 10, 12, 16]) : d === "intermediate" ? randInt(r, 12, 16) : randInt(r, 20, 40);
      const arr = makeArray(r, { n, hi: 120, shape: "sorted" });
      const where = pick(r, d === "beginner" ? ["last", "afterAll", "present", "first"] : ["last", "first", "middle", "absent", "present", "gap"]);
      const target = chooseTarget(r, arr, where);
      const lin = linearSearch(arr, target), bin = binarySearch(arr, target);
      const correct = lin.comparisons < bin.probes ? "Linear search" : lin.comparisons > bin.probes ? "Binary search" : "They make the same number";
      const cands = [
        { value: "Linear search", why: lin.comparisons > bin.probes ? "Linear search checks elements one at a time and needs more comparisons here. Binary search halves the range each time." : "" },
        { value: "Binary search", why: lin.comparisons < bin.probes ? "Binary search is usually faster, but not for every target. Here the target is found early by linear search." : "" },
        { value: "They make the same number", why: "The two counts are different for this array and target." },
        { value: "It depends only on how many elements there are, not on the target", why: "The target's position changes how many linear-search comparisons are needed, and which midpoints binary search lands on." },
      ];
      return {
        algorithm: "binary", skill: SKILL.search, family: "c-which-search",
        rule: `${RULE_LINEAR} ${RULE_BINARY}`,
        stem: `The array is sorted and has ${n} elements. Searching for ${target}${where === "absent" || where === "afterAll" || where === "gap" ? " (not in the array)" : ""}, which method makes fewer counted comparisons?`,
        code: "", visuals: [arrViz(arr, { label: "values (sorted)" })],
        answerKind: "text", correct, candidates: cands.filter((c) => c.why), fallbacks: [],
        explanation: [`Linear search: ${plural(lin.comparisons, "comparison")} (${lin.found ? `found at index ${lin.index}` : "reaches the end"}).`, `Binary search: ${plural(bin.probes, "pass", "passes")} (midpoints ${bin.steps.map((s) => s.mid).join(", ")}).`, lin.comparisons < bin.probes ? "A target near the front favors linear search." : lin.comparisons > bin.probes ? "Binary search discards half the remaining elements each pass, so it needs far fewer comparisons for most targets." : "Both counts are equal for this target."],
        spec: { op: "cmp-which-search", arr, target },
        meta: { reasoning: d === "beginner" ? "one-step" : "compare-run", steps: d === "advanced" ? bin.probes + Math.min(lin.comparisons, 12) : bin.probes + 1, arrayLength: n, comparisons: lin.comparisons + bin.probes },
      };
    },
  },
  {
    id: "c-count-search",
    weight: { beginner: 1.8, intermediate: 2, advanced: 1 },
    build(r, d) {
      const n = d === "beginner" ? randInt(r, 6, 7) : randInt(r, 10, 16);
      const arr = makeArray(r, { n, hi: 100, shape: "sorted" });
      const algo = pick(r, ["linear", "binary"]);
      const target = chooseTarget(r, arr, pick(r, ["present", "absent", "last", "first"]));
      const lin = linearSearch(arr, target), bin = binarySearch(arr, target);
      const correct = algo === "linear" ? lin.comparisons : bin.probes;
      const other = algo === "linear" ? bin.probes : lin.comparisons;
      const cands = [
        { value: other, why: `That is the count for the other search method. Make sure you are tracing ${NAMES[algo].toLowerCase()}.` },
        { value: algo === "linear" ? (lin.found ? lin.index : n) : bin.probes + 1, why: algo === "linear" ? "Comparisons are counted from 1: index i means i + 1 comparisons." : "You counted one extra pass." },
        { value: n, why: algo === "linear" ? (lin.found ? "That is the whole array; linear search stops as soon as it finds the target." : "") : "That is the array length. Binary search looks at far fewer elements." },
        { value: Math.ceil(Math.log2(n)), why: "That is an estimate of the worst case. Count the actual comparisons for THIS target." },
        { value: algo === "binary" ? 2 * bin.probes - (bin.found ? 1 : 0) : Math.ceil(n / 2), why: algo === "binary" ? "You counted the == test and the < test separately. Here one loop pass counts as one comparison." : "That is a guess at the average case. Count the actual comparisons for THIS target." },
        { value: algo === "linear" ? Math.max(0, lin.comparisons - 1) : Math.floor(n / 2), why: algo === "linear" ? "Comparisons start at 1: finding the target at index i takes i + 1 comparisons." : "Binary search never starts at the middle of the whole array and ends there; count the passes." },
      ].filter((c) => c.why);
      return {
        algorithm: algo, skill: SKILL.count, family: "c-count-search", variant: algo,
        rule: algo === "linear" ? RULE_LINEAR : RULE_BINARY,
        stem: `How many comparisons does ${NAMES[algo].toLowerCase()} make when searching for ${target}?`,
        code: algo === "linear" ? linearCode : binaryCode, codeKind: "methods", codeLabel: "Java",
        visuals: [arrViz(arr, { label: "values (sorted)" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true count." }, { value: Math.max(0, correct - 1), why: "One fewer than the true count." }],
        explanation: algo === "linear" ? [`Linear search compares values[0], values[1], ... ${lin.found ? `until index ${lin.index}` : "through the last index"}: ${plural(correct, "comparison")}.`] : [`Binary search passes: ${bin.steps.map((s) => `mid = ${s.mid}`).join(", ")} → ${plural(correct, "pass", "passes")}.`],
        spec: { op: "cmp-count-search", arr, target, algo },
        meta: { reasoning: d === "beginner" ? "one-step" : "count", steps: algo === "linear" ? Math.max(correct, d === "advanced" ? 5 : 2) : Math.max(bin.probes, d === "advanced" ? 5 : 2), arrayLength: n, comparisons: correct },
      };
    },
  },
  {
    id: "c-count-sort-op",
    weight: { beginner: 0, intermediate: 2.6, advanced: 2 },
    build(r, d) {
      const n = d === "beginner" ? 5 : d === "intermediate" ? randInt(r, 6, 8) : randInt(r, 8, 11);
      const arr = makeArray(r, { n, hi: 40, dups: r() < 0.3, shape: pick(r, ["random", "partial", "nearly", "reverse"]) });
      const algo = pick(r, ["selection", "insertion", "merge"]);
      const sel = selectionSort(arr), ins = insertionSort(arr), mrg = mergeSort(arr);
      let stem, rule, correct, cands, expl, work, spec;
      if (algo === "selection") {
        const k = randInt(r, 1, Math.min(3, n - 1));
        const p = sel.passes[k - 1];
        correct = p.compares.length; rule = "Count each evaluation of a[j] < a[minIndex]. Do not count swaps.";
        stem = `How many value comparisons does selection-sort pass ${k} (i = ${p.i}) perform?`;
        cands = [{ value: correct + 1, why: "You counted the swap. Swaps are not value comparisons." }, { value: n - 1, why: k === 1 ? "" : "That is the first pass's count. Each later pass compares one fewer element." }, { value: p.compares.filter((c) => c.smaller).length, why: "That counts how often a smaller value was found, not every comparison." }, { value: n, why: "The inner loop compares only the elements after i." }, { value: k, why: "That is the pass number, not the number of comparisons." }, { value: n - 1 - k, why: `You subtracted k from n - 1. Pass ${k} compares n - ${k} = ${n - k} elements.` }].filter((c) => c.why);
        expl = [`The inner loop runs j = ${p.i + 1}..${n - 1}: ${plural(correct, "comparison")}.`]; work = { comparisons: correct, passes: 1 }; spec = { op: "sel-compares-pass", arr, k };
      } else if (algo === "insertion") {
        const k = randInt(r, 2, Math.min(5, ins.passes.length));
        const total = ins.passes.slice(0, k).reduce((s, p) => s + p.compares.length, 0), sh = ins.passes.slice(0, k).reduce((s, p) => s + p.shifts, 0);
        const askShifts = r() < 0.5;
        correct = askShifts ? sh : total;
        rule = askShifts ? "Count each execution of a[j + 1] = a[j] as one shift. Do not count comparisons or key writes." : "Count each evaluation of a[j] > key. Do not count shifts.";
        stem = `During insertion-sort passes i = 1 through i = ${k}, how many ${askShifts ? "shifts" : "value comparisons"} are performed?`;
        cands = askShifts
          ? [{ value: total, why: "That counts comparisons. A comparison that ends a pass is not a shift." }, { value: sh + k, why: "You counted each key write as a shift." }, { value: ins.passes.slice(0, k).filter((p) => p.moved).length, why: "That counts passes in which the key moved, not elements shifted." }, { value: ins.shifts, why: "That counts shifts for the whole sort." }, { value: k, why: "That is the number of passes, not shifts." }]
          : [{ value: sh, why: "That counts only shifts. Each pass may have one extra false comparison." }, { value: total + k, why: "You added a comparison per pass, but a pass that reaches index 0 has none." }, { value: ins.comparisons, why: "That counts the whole sort, not just " + k + " passes." }, { value: (k * (k + 1)) / 2, why: "That is the worst case for these passes, not this array." }];
        expl = [`Per pass: ${ins.passes.slice(0, k).map((p) => `${askShifts ? p.shifts : p.compares.length}`).join(" + ")} = ${correct}.`]; work = { comparisons: total, shifts: sh, passes: k }; spec = { op: askShifts ? "ins-shifts-first-k" : "ins-compares-first-k", arr, k };
      } else {
        const ms = mrg.merges_list.filter((m) => m.left.length + m.right.length >= 4);
        const m = pick(r, ms.length ? ms : mrg.merges_list);
        correct = m.comparisons; rule = "Count each evaluation of a[i] <= a[j] in the first loop of merge. Copying leftovers is not a comparison.";
        stem = `How many value comparisons are made when merging ${"{"}${m.left.join(", ")}${"}"} and ${"{"}${m.right.join(", ")}${"}"}?`;
        const tot = m.left.length + m.right.length;
        cands = [{ value: tot, why: "That counts every element copied. Leftovers copied after one side runs out need no comparison." }, { value: tot - 1, why: "That is the most comparisons a merge could need; this one ends sooner." }, { value: Math.min(m.left.length, m.right.length), why: "That is the shorter half's length, not the number of comparisons." }, { value: m.left.length, why: "That is the left half's length, not the number of comparisons." }, { value: m.right.length, why: "That is the right half's length, not the number of comparisons." }];
        expl = [`Comparisons stop when one half is used up: ${plural(correct, "comparison")}.`]; work = { comparisons: correct, passes: 1 }; spec = { op: "mrg-compares-one", left: m.left, right: m.right };
      }
      return {
        algorithm: algo, skill: SKILL.count, family: "c-count-sort-op", variant: algo, rule,
        stem, code: "", visuals: algo === "merge" ? [] : [arrViz(arr, { label: "values at the start" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true count." }, { value: Math.max(0, correct - 1), why: "One fewer than the true count." }],
        explanation: expl, spec,
        meta: { reasoning: "count", steps: Math.max(3, algo === "merge" ? correct + 2 : correct + 1), arrayLength: algo === "merge" ? correct + 4 : n, ...work },
      };
    },
  },
  {
    id: "c-sort-fewer",
    weight: { beginner: 0, intermediate: 2.6, advanced: 2.2 },
    build(r, d) {
      const three = d === "advanced" && r() < 0.6;
      const n = d === "intermediate" ? randInt(r, 7, 10) : randInt(r, 10, 18);
      const shape = pick(r, d === "intermediate" ? ["nearly", "reverse", "random", "partial"] : ["nearly", "reverse", "random", "partial", "sorted"]);
      const arr = makeArray(r, { n, hi: 99, dups: r() < 0.25, shape });
      const s = selectionSort(arr).comparisons, i = insertionSort(arr).comparisons, m = mergeSort(arr).comparisons;
      const vals = three ? { "Selection sort": s, "Insertion sort": i, "Merge sort": m } : { "Selection sort": s, "Insertion sort": i };
      const min = Math.min(...Object.values(vals));
      const best = Object.entries(vals).filter(([, v]) => v === min).map(([k]) => k);
      const allEqual = best.length === Object.keys(vals).length;
      if (best.length > 1 && !allEqual) return null; // ambiguous
      const correct = allEqual ? "They all make the same number" : best[0];
      const names = Object.keys(vals);
      const cands = names.filter((x) => x !== correct).map((x) => ({ value: x, why: `${x} makes ${vals[x]} comparisons here, more than ${allEqual ? "" : correct + "'s " + min}.`.replace("more than .", "the same.") }));
      cands.push({ value: "They all make the same number", why: "The counts are different for this input." });
      cands.push({ value: "It is impossible to tell without running the code", why: "You can count comparisons by tracing each algorithm on this input." });
      const shapeText = { nearly: "nearly sorted", reverse: "in reverse (descending) order", random: "in no particular order", partial: "partly sorted", sorted: "already sorted" }[shape];
      return {
        algorithm: "insertion", skill: SKILL.sorts, family: "c-sort-fewer", variant: three ? "three" : "two", rule: RULE_SORT_CMP,
        stem: `This array is ${shapeText}. Which algorithm performs FEWER value comparisons on it?`,
        code: "", visuals: [arrViz(arr, { label: "values" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: Object.entries(vals).map(([k, v]) => `${k}: ${plural(v, "comparison")}.`).concat([shape === "nearly" || shape === "sorted" ? "Insertion sort does very little work when elements are already nearly in place, but selection sort always scans the whole unsorted part." : shape === "reverse" ? "Reverse order is insertion sort's worst case: every key shifts past every earlier element." : "Compare the totals: selection sort's count never depends on the data."]),
        spec: { op: "cmp-sort-fewer", arr, three },
        meta: { reasoning: "compare-run", steps: s + i, arrayLength: n, comparisons: s + i + (three ? m : 0) },
      };
    },
  },
  {
    id: "c-input-order",
    weight: { beginner: 0, intermediate: 1.4, advanced: 2.2 },
    build(r, d) {
      const n = d === "intermediate" ? randInt(r, 6, 8) : randInt(r, 8, 12);
      const base = makeArray(r, { n, hi: 99, shape: "random" });
      const sorted = base.slice().sort((a, b) => a - b), reverse = sorted.slice().reverse();
      const rand = shuffle(r, base);
      if (rand.join() === sorted.join() || rand.join() === reverse.join()) return null;
      const algo = pick(r, ["insertion", "selection"]);
      const metric = algo === "insertion" ? pick(r, ["shifts", "comparisons"]) : "comparisons";
      const dir = pick(r, ["fewest", "most"]);
      const inputs = { "Sorted order": sorted, "Reverse order": reverse, "Shuffled order": rand };
      const run = (a) => (algo === "insertion" ? (metric === "shifts" ? insertionSort(a).shifts : insertionSort(a).comparisons) : selectionSort(a).comparisons);
      const v = Object.fromEntries(Object.entries(inputs).map(([k, a]) => [k, run(a)]));
      const target = dir === "fewest" ? Math.min(...Object.values(v)) : Math.max(...Object.values(v));
      const hits = Object.keys(v).filter((k) => v[k] === target);
      const allEq = new Set(Object.values(v)).size === 1;
      if (hits.length > 1 && !allEq) return null;
      const correct = allEq ? "All three need the same amount" : hits[0];
      const cands = Object.keys(inputs).filter((k) => k !== correct).map((k) => ({ value: k, why: `${k} needs ${v[k]} ${metric}${allEq ? "" : `, which is not the ${dir}.`}` })).concat([{ value: "All three need the same amount", why: "The three counts are not all equal here." }]);
      const rule = algo === "insertion" ? (metric === "shifts" ? "Count each execution of a[j + 1] = a[j] as one shift." : "Count each evaluation of a[j] > key.") : "Count each evaluation of a[j] < a[minIndex].";
      return {
        algorithm: algo, skill: SKILL.cases, family: "c-input-order", variant: `${algo}-${metric}-${dir}`, rule,
        stem: `The same ${n} values are sorted by ${SN[algo].toLowerCase()} in three different starting orders. Which order needs the ${dir} ${metric}?`,
        code: "", visuals: Object.entries(inputs).map(([k, a]) => arrViz(a, { label: k, indices: false })),
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: Object.entries(v).map(([k, x]) => `${k}: ${plural(x, metric === "shifts" ? "shift" : "comparison")}.`).concat([algo === "selection" ? "Selection sort scans the whole unsorted part on every pass, so its comparison count is the same no matter how the data is ordered." : "Insertion sort does the least work on already sorted data and the most on reverse-ordered data."]),
        spec: { op: "cmp-input-order", inputs, algo, metric, dir },
        meta: { reasoning: d === "intermediate" ? "compare-run" : "compare-analysis", steps: v["Sorted order"] + v["Reverse order"] + v["Shuffled order"], arrayLength: n, comparisons: Object.values(v).reduce((a, b) => a + b, 0) },
      };
    },
  },
  {
    id: "c-growth",
    weight: { beginner: 0, intermediate: 0, advanced: 2.8 },
    build(r, d) {
      const kind = pick(r, ["worst-binary", "grow-binary", "grow-linear", "max-size", "gap"]);
      const worst = (n) => { const arr = Array.from({ length: n }, (_, i) => 2 * i + 2); let w = 0; for (let t = 0; t <= 2 * n + 2; t++) w = Math.max(w, binarySearch(arr, t).probes); return w; };
      let N = 0, f = 0, k = 0, stem, correct, cands, expl, rule, code = binaryCode, algorithm = "binary";
      if (kind === "worst-binary") {
        N = randInt(r, 5, 120);
        correct = worst(N); rule = RULE_BINARY;
        stem = `A sorted array has ${N} elements. In the WORST case (any target, present or not), how many loop passes can binary search need?`;
        cands = [{ value: N, why: "That is linear search's worst case. Binary search halves the range each pass." }, { value: Math.floor(N / 2), why: "Half the array is far too many passes; each pass removes half of the remaining range." }, { value: Math.floor(Math.log2(N)), why: "Close, but the last remaining element still needs a pass. The count is floor(log2 N) + 1 when you simulate every target." }, { value: Math.ceil(Math.log2(N)), why: Math.ceil(Math.log2(N)) === correct ? "" : "That is only an estimate. Simulating every possible target gives the exact worst case." }, { value: correct + 1, why: "One more than the true worst case." }, { value: Math.ceil(N / 4), why: "Each pass halves the range; dividing by 4 once does not describe the passes." }].filter((c) => c.why);
        expl = [`Each pass keeps at most half the range: ${N} → ${Math.floor(N / 2)} → ... → 1 → 0. Simulating every possible target shows at most ${correct} passes.`];
      } else if (kind === "grow-binary") {
        N = randInt(r, 4, 60); f = pick(r, [2, 4, 8]);
        const a2 = worst(N), b2 = worst(f * N);
        correct = b2 - a2; rule = RULE_BINARY;
        stem = `A sorted array grows from ${N} to ${f * N} elements (${f} times as many). By how many does binary search's WORST-case number of loop passes increase?`;
        cands = [{ value: (f - 1) * N, why: "That is how many more comparisons LINEAR search might need. Binary search grows very slowly." }, { value: a2 * (f - 1), why: "That multiplies the passes. Making the array " + f + " times larger adds a few halving steps, not " + f + " times as many passes." }, { value: f, why: "The increase depends on how many times the size doubles, not on the multiplier itself." }, { value: correct + 1, why: "One more than the true increase." }, { value: Math.max(0, correct - 1), why: "One fewer than the true increase." }, { value: 0, why: "Making the array larger does allow more halving steps in the worst case." }];
        expl = [`Worst case for ${N} elements: ${a2} passes. For ${f * N}: ${b2} passes. The difference is ${correct}.`];
      } else if (kind === "grow-linear") {
        N = randInt(r, 5, 80); f = pick(r, [2, 3, 4, 10]);
        correct = (f - 1) * N; rule = RULE_LINEAR; code = linearCode; algorithm = "linear";
        stem = `An array grows from ${N} to ${f * N} elements. By how many does linear search's worst-case number of comparisons increase?`;
        cands = [{ value: f * N, why: "That is the new worst case, not the increase." }, { value: f - 1, why: "That is binary-search-like growth. Linear search's worst case grows in step with the size." }, { value: N, why: f === 2 ? "" : "That is the OLD worst case, not the increase." }, { value: (f - 1) * N + 1, why: "One more than the true increase." }, { value: Math.floor(Math.log2(f)), why: "That is a binary-search-style estimate. Linear search checks every added element." }, { value: f * N - 1, why: "The worst case is one comparison per element; the increase is the number of added elements." }].filter((c) => c.why);
        expl = [`Linear search's worst case checks every element: ${N} → ${f * N}, an increase of ${(f - 1) * N}.`];
      } else if (kind === "max-size") {
        k = randInt(r, 3, 7);
        let n = 1; while (worst(n + 1) <= k) n++;
        correct = n; rule = RULE_BINARY;
        stem = `Binary search must finish in at most ${k} loop passes for EVERY possible target. What is the largest sorted array it is guaranteed to handle?`;
        cands = [{ value: 2 ** k, why: "One element too many: with " + 2 ** k + " elements some targets need " + (k + 1) + " passes." }, { value: 2 * k, why: "The size DOUBLES with each extra pass; it does not grow by 2 per pass." }, { value: k * k, why: "Each pass halves the range, so the capacity doubles per pass (powers of 2), not squares." }, { value: 2 ** (k - 1), why: "That is the capacity of one fewer pass." }, { value: 2 ** k - 2, why: "One fewer than the true capacity." }];
        expl = [`Each pass can discard half the range, so ${k} passes cover ${2 ** k - 1} elements (1 + 2 + 4 + ... + ${2 ** (k - 1)}).`];
      } else {
        N = randInt(r, 16, 120);
        const w = worst(N);
        correct = N - w; rule = `${RULE_LINEAR} ${RULE_BINARY}`; code = "";
        stem = `On a sorted array of ${N} elements, how many MORE comparisons can linear search need than binary search in the worst case?`;
        cands = [{ value: N, why: "That is linear search's worst case by itself. You must subtract binary search's worst case." }, { value: N - Math.floor(Math.log2(N)), why: "You used floor(log2 N); binary search's worst case is one more (a final single-element pass)." }, { value: w, why: "That is binary search's worst case by itself." }, { value: Math.floor(N / 2), why: "That is a guess at half the array, not the difference of the two worst cases." }, { value: N - w + 1, why: "One more than the true difference." }];
        expl = [`Linear worst case: ${N}. Binary worst case: ${w}. Difference: ${correct}.`];
      }
      return {
        algorithm, skill: SKILL.growth, family: "c-growth", variant: kind, rule,
        stem, code, codeKind: "methods", codeLabel: "Java",
        visuals: [], answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true value." }, { value: correct + 3, why: "Three more than the true value." }],
        explanation: expl, spec: { op: "cmp-growth", kind, N, f, k },
        meta: { reasoning: "growth", steps: Math.max(4, correct > 12 ? 8 : correct + 3), arrayLength: 8, comparisons: correct },
      };
    },
  },
  {
    id: "c-narrowing",
    weight: { beginner: 1.8, intermediate: 0, advanced: 0 },
    build(r, d) {
      const n = randInt(r, 8, 16);
      const arr = makeArray(r, { n, hi: 90, shape: "sorted" });
      let target = null, res = null;
      for (let t = 0; t < 40; t++) { const v = pick(r, arr); const x = binarySearch(arr, v); if (x.steps.length >= 2) { target = v; res = x; break; } }
      if (target === null) return null;
      const s = res.steps[0];
      const correct = s.nextHigh - s.nextLow + 1;
      const cands = [
        { value: n - 1, why: "That removes only the middle element. Binary search also discards everything on the wrong side of it." },
        { value: n, why: "Nothing is left unchanged: after one comparison either the left or the right part is eliminated." },
        { value: Math.ceil(n / 2), why: correct === Math.ceil(n / 2) ? "" : `The middle element itself is also removed, so about half of ${n} minus the middle remain, depending on which side the target is on.` },
        { value: Math.floor(n / 2), why: correct === Math.floor(n / 2) ? "" : "That is half of the array, but the compared middle element is removed too and the two halves can differ by one." },
        { value: 1, why: "Only one element remains after the LAST comparison, not after the first." },
        { value: s.mid, why: "That is the INDEX of the middle element, not how many elements are left." },
      ].filter((c) => c.why);
      return {
        algorithm: "binary", skill: SKILL.search, family: "c-narrowing", rule: "Count the elements between low and high (inclusive) after the first update.",
        stem: `Binary search looks for ${target} in this sorted array of ${n} elements. After its FIRST comparison and bounds update, how many elements are still in the search range (low through high)?`,
        code: binaryMethod(), codeKind: "methods", codeLabel: "Java",
        visuals: [arrViz(arr, { label: "values (sorted)" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true count." }, { value: Math.max(0, correct - 1), why: "One fewer than the true count." }],
        explanation: [`First pass: low = 0, high = ${n - 1}, mid = ${s.mid}. ${s.rel === "lt" ? `${s.value} < ${target}, so low = ${s.nextLow}.` : `${s.value} > ${target}, so high = ${s.nextHigh}.`}`, `Range ${s.nextLow} to ${s.nextHigh} → ${correct} elements remain. Roughly half of the array was ruled out in one comparison.`],
        spec: { op: "cmp-narrowing", arr, target },
        meta: { reasoning: "one-step", steps: 2, arrayLength: n, comparisons: 1 },
      };
    },
  },
  {
    id: "c-simple-count",
    weight: { beginner: 1.8, intermediate: 0, advanced: 0 },
    build(r, d) {
      const kind = pick(r, ["sel-first-pass", "lin-absent", "ins-sorted-compares", "ins-sorted-shifts"]);
      const n = randInt(r, 4, 7);
      let arr, stem, correct, cands, rule, expl, algorithm, code = "";
      if (kind === "sel-first-pass") {
        arr = makeArray(r, { n, hi: 20, shape: "random" });
        const sel = selectionSort(arr);
        correct = sel.passes[0].compares.length; algorithm = "selection"; rule = "Count each evaluation of a[j] < a[minIndex]. Do not count swaps.";
        stem = `How many value comparisons does the FIRST pass of selection sort make on these ${n} elements?`;
        cands = [{ value: n, why: "The inner loop starts at index 1, so it compares n − 1 elements, not n." }, { value: n + 1, why: "You counted the swap too. Swaps are not value comparisons." }, { value: sel.passes[0].compares.filter((c) => c.smaller).length, why: "That counts how many times minIndex changed, not every comparison." }, { value: (n * (n - 1)) / 2, why: "That is the total for the whole sort, not one pass." }];
        expl = [`Pass 1 compares a[1] ... a[${n - 1}] with the current minimum: ${plural(correct, "comparison")}.`];
      } else if (kind === "lin-absent") {
        arr = makeArray(r, { n, hi: 30, shape: "random" });
        const target = chooseTarget(r, arr.slice().sort((a, b) => a - b), "absent");
        correct = linearSearch(arr, target).comparisons; algorithm = "linear"; rule = RULE_LINEAR; code = linearCode;
        stem = `How many comparisons does linear search make when ${target} is NOT in the array?`;
        cands = [{ value: n - 1, why: "A search that fails must look at every element, including the last one." }, { value: 1, why: "Linear search can stop early only when it finds the target." }, { value: Math.ceil(n / 2), why: "That is a guess at an average. A failed search checks every element." }, { value: n + 1, why: "There is no extra comparison after the last element; the loop just ends." }];
        expl = [`The target never matches, so all ${n} elements are compared.`];
      } else {
        arr = makeArray(r, { n, hi: 30, shape: "sorted" });
        const ins = insertionSort(arr);
        algorithm = "insertion";
        const shifts = kind === "ins-sorted-shifts";
        correct = shifts ? ins.shifts : ins.comparisons;
        rule = shifts ? "Count each execution of a[j + 1] = a[j] as one shift." : "Count each evaluation of a[j] > key.";
        stem = `Insertion sort runs on this array, which is ALREADY sorted. How many ${shifts ? "shifts" : "value comparisons"} does the whole sort make?`;
        cands = shifts
          ? [{ value: n - 1, why: "Each key is compared with its left neighbor, but nothing is greater than it, so no element shifts." }, { value: (n * (n - 1)) / 2, why: "That is the worst case (reverse order), not already-sorted input." }, { value: n, why: "No element shifts: every key is already in the right place." }, { value: 1, why: "A sorted array has no out-of-order elements, so nothing shifts." }]
          : [{ value: 0, why: "Each key is still compared once with its left neighbor to confirm it is in place." }, { value: n, why: "The first element is never compared; there are only n − 1 keys." }, { value: (n * (n - 1)) / 2, why: "That is the worst case (reverse order). Sorted input stops after one comparison per key." }, { value: 2 * (n - 1), why: "Each key needs one comparison, not two." }];
        expl = shifts ? ["Every key is already larger than the element on its left, so the while loop never shifts anything."] : [`Each of the ${n - 1} keys is compared once with its left neighbor and found to be in place.`];
      }
      return {
        algorithm, skill: SKILL.count, family: "c-simple-count", variant: kind, rule,
        stem, code: code || (kind === "sel-first-pass" ? "" : ""), codeKind: "methods", codeLabel: code ? "Java" : "",
        visuals: [arrViz(arr, { label: "values" })],
        answerKind: "int", correct, candidates: cands, fallbacks: [{ value: correct + 2, why: "Two more than the true count." }, { value: correct + 3, why: "Three more than the true count." }],
        explanation: expl, spec: { op: "cmp-simple-count", kind, arr },
        meta: { reasoning: "one-step", steps: Math.min(7, Math.max(2, kind === "ins-sorted-shifts" ? 2 : correct)), arrayLength: n, comparisons: correct },
      };
    },
  },
  {
    id: "c-fit",
    weight: { beginner: 1.8, intermediate: 1.4, advanced: 1.2 },
    build(r, d) {
      const n = d === "beginner" ? randInt(r, 6, 8) : randInt(r, 8, 12);
      const isSortedArr = r() < 0.5;
      const arr = isSortedArr ? makeArray(r, { n, hi: 60, shape: "sorted" }) : makeArray(r, { n, hi: 60, shape: pick(r, ["random", "nearly", "partial", "reverse"]) });
      const sorted = arr.every((v, i) => i === 0 || arr[i - 1] <= v);
      const target = pick(r, arr);
      const correct = sorted ? "Either linear or binary search" : "Linear search only";
      const cands = [
        { value: "Linear search only", why: sorted ? "Binary search is also correct here because the array is sorted in ascending order." : "" },
        { value: "Binary search only", why: sorted ? "Linear search works on any array, so it is also correct here." : "Binary search needs a sorted array. This array is not sorted, so it can miss the target." },
        { value: "Either linear or binary search", why: sorted ? "" : "The array is not sorted, so binary search's rule of discarding half the range is not valid." },
        { value: "Neither search can be used", why: "Linear search works on any array." },
      ].filter((c) => c.why);
      return {
        algorithm: "binary", skill: SKILL.fit, family: "c-fit", rule: "",
        stem: `You need to find ${target} in this array, and you may not rearrange it. Which search method is guaranteed to give a correct result?`,
        code: "", visuals: [arrViz(arr, { label: "values" })],
        answerKind: "text", correct, candidates: cands, fallbacks: [],
        explanation: sorted ? ["The array is sorted in ascending order, so both searches are correct. Binary search will need far fewer comparisons for large arrays."] : ["The array is not sorted, so binary search can discard the wrong half. Linear search checks every element in turn and works on any array."],
        spec: { op: "cmp-fit", arr },
        meta: { reasoning: d === "beginner" ? "recognize" : d === "intermediate" ? "compare-run" : "precondition", steps: d === "advanced" ? 5 : 2, arrayLength: n },
      };
    },
  },
];
