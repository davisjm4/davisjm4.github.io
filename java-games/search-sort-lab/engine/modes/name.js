/* Mode 5 — Name That Algorithm families. Answers come from the template that was
   rendered (the algorithm is known by construction) and are cross-checked by an
   independent structural classifier in validation.js, which reads only the
   displayed code and ignores identifier names. */
import { randInt, pick, shuffle } from "../rng.js";
import { makeArray, chooseTarget, fmt } from "../arrays.js";
import { binarySearch, linearSearch, selectionSort, insertionSort, mergeSort, ALGO_NAMES, ALGORITHMS } from "../algorithms.js";
import { ID_TEMPLATES, DEFECT_TEMPLATES, applyNames, nameSet, PLAIN_METHOD, NAME_SET_COUNT } from "../code.js";
import { arrViz } from "../kit.js";

const SKILL = { code: "Name That Algorithm: from code", trace: "Name That Algorithm: from execution", desc: "Name That Algorithm: from behavior", defect: "Name That Algorithm: defective code", mislead: "Name That Algorithm: misleading names" };
export const FEATURE = {
  linear: "checks the elements one at a time from the start",
  binary: "repeatedly checks the middle of a sorted range and discards half of it",
  selection: "finds the smallest remaining element and swaps it into the next position",
  insertion: "takes the next element (the key) and shifts larger elements right to insert it into the sorted prefix",
  merge: "splits the array recursively and merges sorted pieces",
};
export const label = (a) => ALGO_NAMES[a][0].toUpperCase() + ALGO_NAMES[a].slice(1);
const CONFUSERS = { linear: ["binary", "selection", "insertion"], binary: ["linear", "merge", "insertion"], selection: ["insertion", "merge", "linear"], insertion: ["selection", "merge", "linear"], merge: ["selection", "insertion", "binary"] };
const whyNot = (wrong, actual) => `That is ${label(wrong).toLowerCase()}, which ${FEATURE[wrong]}. This ${FEATURE[actual] ? "code" : "code"} ${FEATURE[actual]}.`;
const cands = (actual, pool) => (pool || CONFUSERS[actual]).concat(ALGORITHMS.filter((a) => a !== actual)).filter((v, i, l) => l.indexOf(v) === i && v !== actual).map((w) => ({ value: label(w), why: whyNot(w, actual) }));
const answerCode = (code) => code;

function renderTemplate(algo, tIndex, names, { stripName = false } = {}) {
  return applyNames(ID_TEMPLATES[algo][tIndex], names);
}
const NEUTRAL_METHOD = { search: ["findIt", "locate", "lookFor", "scan", "hunt"], sort: ["arrange", "process", "tidy", "reorder", "organize", "fixUp"] };
const isSearch = (a) => a === "linear" || a === "binary";

export const nameFamilies = [
  {
    id: "n-code",
    weight: { beginner: 3.4, intermediate: 3.2, advanced: 2.0 },
    build(r, d) {
      const algo = pick(r, ALGORITHMS);
      const tCount = ID_TEMPLATES[algo].length;
      // Beginner sees the two most familiar shapes of each algorithm; later levels see every variant.
      const tIndex = randInt(r, 0, d === "beginner" ? Math.min(tCount, algo === "linear" ? 3 : 2) - 1 : tCount - 1);
      const nsIdx = d === "advanced" ? randInt(r, 1, NAME_SET_COUNT - 1) : d === "intermediate" ? randInt(r, 0, 3) : randInt(r, 0, 2);
      const names = { ...nameSet(nsIdx) };
      names.f = pick(r, isSearch(algo) ? NEUTRAL_METHOD.search : NEUTRAL_METHOD.sort);
      const code = applyNames(ID_TEMPLATES[algo][tIndex], names);
      const pool = d === "beginner" ? (isSearch(algo) ? [algo === "linear" ? "binary" : "linear", "selection", "insertion"] : ["selection", "insertion", "merge", "linear"].filter((a) => a !== algo)) : undefined;
      return {
        algorithm: algo, skill: SKILL.code, family: "n-code", variant: `t${tIndex}-n${nsIdx}`,
        stem: "Which algorithm does this method implement?",
        code, codeKind: "methods", codeLabel: "Java method",
        visuals: [], answerKind: "text", correct: label(algo), candidates: cands(algo, pool), fallbacks: [],
        explanation: [`This code ${FEATURE[algo]}.`, ...keyEvidence(algo, tIndex)],
        spec: { op: "name-code", algo, tIndex, nsIdx },
        meta: { reasoning: d === "beginner" ? "recognize" : d === "intermediate" ? "recognize-code" : "implementation", steps: d === "beginner" ? Math.min(7, Math.ceil(code.split("\n").length / 3)) : code.split("\n").length },
      };
    },
  },
  {
    id: "n-trace",
    weight: { beginner: 2, intermediate: 2.4, advanced: 2.2 },
    build(r, d) {
      const algo = pick(r, d === "beginner" ? ["linear", "binary", "selection", "insertion"] : ["linear", "binary", "selection", "insertion", "merge"]);
      if (isSearch(algo)) {
        const n = d === "beginner" ? randInt(r, 7, 9) : randInt(r, 9, 15);
        const arr = makeArray(r, { n, hi: 60, shape: "sorted", dups: d === "advanced" && r() < 0.3 });
        const target = chooseTarget(r, arr, r() < 0.3 ? "absent" : "present");
        const bin = binarySearch(arr, target), lin = linearSearch(arr, target);
        const seqB = bin.steps.map((s) => s.mid), seqL = lin.steps.map((s) => s.index);
        const show = algo === "binary" ? seqB : seqL;
        if (show.length < 3) return null;
        const other = algo === "binary" ? seqL : seqB;
        const cut = Math.min(show.length, d === "beginner" ? 3 : 4);
        const shown = show.slice(0, cut);
        if (shown.join() === other.slice(0, cut).join()) return null; // evidence must exclude the other search
        const pool = algo === "binary" ? ["linear", "selection", "insertion"] : ["binary", "selection", "insertion"];
        return {
          algorithm: algo, skill: SKILL.trace, family: "n-trace", variant: "search",
          stem: `A search method looked for ${target}. The indexes it compared with the target, in order, were: ${shown.join(", ")}${show.length > cut ? ", ..." : ""}. Which algorithm is it?`,
          code: "", visuals: [arrViz(arr, { label: `values (sorted array)` })],
          answerKind: "text", correct: label(algo), candidates: cands(algo, pool), fallbacks: [],
          explanation: algo === "binary" ? [`The first index checked is ${shown[0]}, near the middle of ${n} elements, and each next index jumps to the middle of what is left: that is binary search.`] : [`The indexes are ${shown.join(", ")}: one element after another from index 0. That is linear search.`],
          spec: { op: "name-trace-search", arr, target, algo, cut },
          meta: { reasoning: d === "beginner" ? "recognize" : "evidence", steps: cut + 1, arrayLength: n },
        };
      }
      if (algo === "merge") {
        const n = randInt(r, 4, d === "advanced" ? 7 : 6);
        const arr = makeArray(r, { n, hi: 40, shape: "random" });
        const res = mergeSort(arr);
        const ms = res.merges_list.slice(0, 3);
        const lines = ms.map((m) => `merged {${m.left.join(", ")}} and {${m.right.join(", ")}} into {${m.result.join(", ")}}`);
        return {
          algorithm: "merge", skill: SKILL.trace, family: "n-trace", variant: "merge",
          stem: `An algorithm sorted {${arr.join(", ")}}. Its first three steps were: ${lines.join("; ")}. Which algorithm is it?`,
          code: "", visuals: [], answerKind: "text", correct: label("merge"), candidates: cands("merge", ["selection", "insertion", "binary"]), fallbacks: [],
          explanation: ["Combining two already-sorted pieces into one sorted piece is the merge step of merge sort. The pieces came from splitting the array in half repeatedly."],
          spec: { op: "name-trace-merge", arr },
          meta: { reasoning: d === "beginner" ? "recognize" : "evidence", steps: 6, arrayLength: n },
        };
      }
      // selection vs insertion state snapshots
      const n = d === "beginner" ? 5 : randInt(r, 6, 8);
      for (let t = 0; t < 120; t++) {
        const arr = makeArray(r, { n, hi: 30, dups: d === "advanced" && r() < 0.4, shape: pick(r, ["random", "partial", "random"]) });
        const sel = selectionSort(arr).passes.map((p) => p.after), ins = insertionSort(arr).passes.map((p) => p.after);
        const rows = d === "beginner" ? 2 : 3;
        const A = algo === "selection" ? sel : ins, B = algo === "selection" ? ins : sel;
        // the snapshot lists must differ for every shown row, so no row is consistent with both
        let ok = true;
        for (let q = 0; q < rows; q++) if (A[q].join() === B[q].join()) ok = false;
        if (!ok) continue;
        const shown = A.slice(0, rows);
        const startLabel = "after each pass";
        return {
          algorithm: algo, skill: SKILL.trace, family: "n-trace", variant: "sort-states",
          stem: `A sorting method started with {${arr.join(", ")}}. Its single outer loop left the array like this ${startLabel}: ${shown.map((s) => `{${s.join(", ")}}`).join(" → ")}. Which algorithm is it?`,
          code: "", visuals: [arrViz(arr, { label: "start" })].concat(shown.map((s, i) => arrViz(s, { label: `after pass ${i + 1}`, indices: false }))),
          answerKind: "text", correct: label(algo), candidates: cands(algo, algo === "selection" ? ["insertion", "merge", "linear"] : ["selection", "merge", "linear"]), fallbacks: [],
          explanation: algo === "selection" ? [`Each pass moves the smallest remaining value to the front by swapping: the sorted part grows from the left and holds the SMALLEST values overall.`, `Insertion sort would give ${B.slice(0, rows).map((s) => `{${s.join(", ")}}`).join(" → ")}.`] : [`Each pass inserts the next element into the sorted prefix by shifting larger ones right; the prefix is the original first elements in order.`, `Selection sort would give ${B.slice(0, rows).map((s) => `{${s.join(", ")}}`).join(" → ")}.`],
          spec: { op: "name-trace-sort", arr, algo, rows },
          meta: { reasoning: d === "beginner" ? "recognize" : "evidence", steps: rows * 3, arrayLength: n, passes: rows },
        };
      }
      return null;
    },
  },
  {
    id: "n-description",
    weight: { beginner: 2, intermediate: 1.2, advanced: 0 },
    build(r, d) {
      const algo = pick(r, ALGORITHMS);
      const arr = makeArray(r, { n: randInt(r, 5, 7), hi: 40, shape: algo === "binary" || algo === "linear" ? "sorted" : "random" });
      const target = chooseTarget(r, arr, "present");
      const bin = binarySearch(arr, target);
      const D = {
        linear: [`It looks at values[0], then values[1], then values[2], and keeps going one element at a time until it finds ${target} or runs out of elements.`, `It never skips an element. It stops as soon as it sees ${target}.`],
        binary: [`It starts at the middle of the remaining range (index ${bin.steps[0].mid} of ${arr.length}), and each comparison throws away about half of what is left. It only works on a sorted array.`, `Its first comparison is with values[${bin.steps[0].mid}], not values[0]. It then moves low or high past that index.`],
        selection: [`On each pass it scans the entire unsorted part to find the smallest value, then swaps that value into the first unsorted position.`, `After every pass, the left part holds the smallest values, in order. Each pass does exactly one swap.`],
        insertion: [`On each pass it takes the next element and slides every larger element in the sorted left part one place to the right, then drops the element into the gap.`, `After every pass, the left part is sorted but contains only the elements that have been examined so far.`],
        merge: [`It cuts the array in half again and again until every piece has one element, then combines pieces by repeatedly copying the smaller front element.`, `It makes recursive calls on the left half and the right half before combining them.`],
      };
      const text = pick(r, D[algo]);
      const pool = isSearch(algo) ? [algo === "linear" ? "binary" : "linear", "selection", "insertion"] : undefined;
      return {
        algorithm: algo, skill: SKILL.desc, family: "n-description", variant: algo,
        stem: `Which algorithm does this describe?`,
        code: "", visuals: [arrViz(arr, { label: "example array" })], note: text,
        description: text,
        answerKind: "text", correct: label(algo), candidates: cands(algo, pool), fallbacks: [],
        explanation: [`${label(algo)} ${FEATURE[algo]}.`],
        spec: { op: "name-desc", algo },
        meta: { reasoning: d === "beginner" ? "recognize" : "evidence", steps: d === "beginner" ? 1 : 2, arrayLength: arr.length },
      };
    },
  },
  {
    id: "n-defect",
    weight: { beginner: 0, intermediate: 0, advanced: 3 },
    build(r, d) {
      const algo = pick(r, Object.keys(DEFECT_TEMPLATES));
      const tIndex = randInt(r, 0, DEFECT_TEMPLATES[algo].length - 1);
      const nsIdx = randInt(r, 0, NAME_SET_COUNT - 1);
      const names = { ...nameSet(nsIdx), f: pick(r, isSearch(algo) ? NEUTRAL_METHOD.search : NEUTRAL_METHOD.sort) };
      const code = applyNames(DEFECT_TEMPLATES[algo][tIndex], names);
      const defects = {
        selection: ["The swap is incomplete: a[minIndex] is never given a[i]'s old value.", "A break stops the inner loop at the first smaller value, so it no longer finds the minimum.", "The inner loop stops one element early (j < length - 1), so the last element is never considered."],
        insertion: ["The loop test j > 0 never compares with index 0.", "The key is never written back into the gap.", "The loop compares a[j + 1] (the key's own slot) instead of a[j], so nothing shifts."],
        binary: ["low = mid never moves past mid, so the search can loop forever.", "The loop test low < high skips the last remaining element.", "high starts at length instead of length - 1, so mid can reach an index that does not exist."],
        merge: ["There is no base case, so the recursion never ends.", "The leftover elements of the right half are never copied, so some values are lost."],
        linear: ["The loop test i <= length reads one index past the end.", "It returns i + 1 (a position counted from 1) instead of the index i."],
      }[algo][tIndex];
      return {
        algorithm: algo, skill: SKILL.defect, family: "n-defect", variant: `${algo}${tIndex}`,
        stem: "This code is a defective version of a standard algorithm. Which algorithm was the author trying to write?",
        code, codeKind: "methods", codeLabel: "Java method (contains a bug)",
        visuals: [], answerKind: "text", correct: label(algo), candidates: cands(algo), fallbacks: [],
        explanation: [`The structure is ${label(algo).toLowerCase()}: it ${FEATURE[algo]}.`, `The defect: ${defects}`],
        spec: { op: "name-defect", algo, tIndex, nsIdx },
        meta: { reasoning: "defect", steps: code.split("\n").length },
      };
    },
  },
  {
    id: "n-misleading",
    weight: { beginner: 0, intermediate: 0, advanced: 2.6 },
    build(r, d) {
      const algo = pick(r, ALGORITHMS);
      const fake = pick(r, ALGORITHMS.filter((a) => a !== algo && isSearch(a) === isSearch(algo)).concat(ALGORITHMS.filter((a) => a !== algo)).slice(0, 3));
      const tIndex = randInt(r, 0, ID_TEMPLATES[algo].length - 1);
      const names = { ...nameSet(randInt(r, 0, 1) ? 0 : 4), f: PLAIN_METHOD[fake] };
      const tpl = ID_TEMPLATES[algo][tIndex];
      const used = [...new Set([...tpl.matchAll(/\$([a-z]+)/g)].map((m) => m[1]))].filter((p) => p !== "f");
      // give ONE variable a name typical of the fake algorithm, never colliding with another name in this template
      const fakeName = { selection: "minIndex", insertion: "key", binary: "mid", merge: "merged", linear: "index" }[fake];
      const prefer = { selection: ["m", "v", "k", "x"], insertion: ["k", "x", "m", "v"], binary: ["m", "k", "v", "x"], merge: ["x", "k", "m"], linear: ["i", "m", "k"] }[fake];
      const target = prefer.find((p) => used.includes(p));
      if (target) {
        for (const p of used) if (p !== target && names[p] === fakeName) names[p] = fakeName + "2";
        names[target] = fakeName;
      }
      // all names used by the template must be distinct
      const vals = used.map((p) => names[p]);
      if (new Set(vals).size !== vals.length) return null;
      const body = applyNames(ID_TEMPLATES[algo][tIndex], names);
      const cstyle = randInt(r, 0, 3);
      const fk = label(fake).toLowerCase();
      const code = (cstyle === 0 ? `// ${fk}` : cstyle === 1 ? `// ${fk} implementation` : cstyle === 2 ? `/** Performs ${fk}. */` : `// classic ${fk}`) + `\n${body}`;
      // recursive templates call $f: keep the recursive name consistent (applyNames already did)
      return {
        algorithm: algo, skill: SKILL.mislead, family: "n-misleading", variant: `${algo}-as-${fake}`,
        stem: "The method's name, variable names, and comment may be misleading. Which algorithm does the code actually perform?",
        code, codeKind: "methods", codeLabel: "Java method",
        visuals: [], answerKind: "text", correct: label(algo), candidates: cands(algo, [fake].concat(CONFUSERS[algo])).map((c) => (c.value === label(fake) ? { ...c, why: `The name and comment say ${label(fake).toLowerCase()}, but names do not change what code does. ${c.why}` } : c)), fallbacks: [],
        explanation: [`Ignore the names and comment. What the loops and assignments do: this code ${FEATURE[algo]}.`, `It only LOOKS like ${label(fake).toLowerCase()} because of its naming.`],
        spec: { op: "name-mislead", algo, tIndex, fake },
        meta: { reasoning: "misleading", steps: body.split("\n").length },
      };
    },
  },
];

function keyEvidence(algo, t) {
  const ev = {
    linear: ["It returns the index of the first element equal to the target, or -1 after checking all."],
    binary: ["It keeps low and high bounds, computes the middle, and moves a bound past mid."],
    selection: ["An inner loop tracks the index of the smallest value in the unsorted part, then the outer loop swaps it into position i."],
    insertion: ["The outer loop picks a key; elements greater than the key move one place right until the key fits."],
    merge: ["It splits the range in half, sorts each half, and combines them with a merge that copies the smaller front element."],
  };
  return ev[algo];
}
