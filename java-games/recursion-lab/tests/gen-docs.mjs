// Regenerates docs/REASONING_FAMILY_CATALOG.md and docs/REPRESENTATIVE_QUESTIONS.md from the live generators.
import { writeFileSync, mkdirSync } from "node:fs";
import { FAMILIES, LEGACY_WEIGHT, composeQuestion } from "../compose/index.js";
import { seededRandom, difficulties, modeNames } from "../engine.js";
const out = new URL("../docs/", import.meta.url); mkdirSync(out, { recursive: true });
const DESC = {
  "call-sequence": "Trace how a parameter moves toward the base case under subtraction, halving, division by 3, or digit removal; sequence of arguments, total calls, value at the base case.",
  "upward-parameter": "Increasing parameter toward a limit (i + step vs. limit) with >=, > and == stopping conditions.",
  "implicit-base": "Recursion guarded by if (n > K) with no return statement: when does it stop, and how many calls.",
  "multiple-base-cases": "Two or three base cases reached by stepping by 2 or 3: which one ends the recursion, or none (non-termination).",
  "termination-check": "Pick the call that never reaches the base case (parity skip, wrong side, halving fixed point, step 3, overshoot, converging pair), or the one that does.",
  "conditional-progression": "The recursive argument depends on a condition (even/odd, multiple of 3, size): argument sequence, call count, how many calls take the else-branch.",
  "branching-tree": "Two or three recursive calls per frame: total calls vs. maximum stack depth vs. base-case calls, and how often a subproblem repeats.",
  "digit-recursion": "n % 10 / n / 10 recursion (digit sum, digit count, max digit, alternating): value, an inner call's value, return order.",
  "two-parameter": "power, multiply, range sum, gcd, fast power: value, calls, arguments at the base case.",
  "conditional-return": "Different return expressions depending on a condition (sum of evens/odds, count multiples, add-or-subtract, weights).",
  "nested-return": "Return expressions that transform the recursive result (2f+1, n − f, f + 2n − 1, 3f − n, 2f + n % 3).",
  "work-around-call": "A value-returning method that also prints before and/or after its recursive call: output vs. returned value.",
  "multi-call-return": "f(n−1) combined with f(n−2) under different bases/weights: value and the value of a repeated subcall.",
  "accumulator-parameter": "Results carried in a parameter (sum, product, conditional count, digit reversal): final value and acc in a given call.",
  "print-around-call": "Numeric prints before, after, or around the recursive call, with base-case markers and different pre/post expressions.",
  "branching-output": "Pre-, in-, post-order and bracketed output from two recursive calls.",
  "string-builder": "Return-value string construction: doubling, separators, removing a letter, mirroring, last-char-first reversal, swapping pairs.",
  "palindrome": "Two-ended String recursion with early false: result and call count, last argument.",
  "count-char": "Counting a letter with ternary, if-return and last-character variants, including absent letters.",
  "string-print-around": "Printing characters before/after the call on first/last-character substrings, including brackets.",
  "segment-recursion": "Divide-in-half recursion over (lo, hi): sum/max/count, calls, child ranges.",
  "two-ended": "lo++ / hi−− recursion: pair sums, matching pairs, outer-minus-inner; odd vs. even lengths; parameters at the base case.",
  "stride-recursion": "i += 2 or 3 traversal: value, visited indexes, calls.",
  "in-place-mutation": "Array updates before vs. after the recursive call, reading a[i−1] or a[i+1]: when do updates accumulate?",
  "in-place-reverse": "Swapping toward the middle (full, partial, every other pair).",
  "mutation-vs-return": "A method that both mutates the array and returns a value computed from old or new values.",
  "conditional-aggregate": "Counting above a threshold, last match from the end (incl. absent), && short-circuit call counts, sum of negatives.",
  "knob-bug": "Debugging over 13 reference programs (ints, Strings, arrays, output, binary search, palindrome). One knob (base presence, base condition, base value, recursive argument, combination, call placement, search bounds/direction) is wrong. Question types: which fix works, what actually happens, which line is wrong, which input reveals the bug.",
  "linear-search": "Recursive linear search forward/backward, present/absent targets, call counts.",
  "binary-search-trace": "Mid sequences with round-down, round-up and overflow-safe midpoints; calls; the empty range at the end.",
  "merge-sort-trace": "Merge sort on unsorted input: array after the left half, number of merges, the final merge's halves, state after the k-th merge.",
  "quicksort-partition": "Lomuto partition: array after the first partition, pivot index, total quickSort calls (incl. duplicates at Advanced).",
  "recursive-selection-sort": "Recursive selection sort with a recursive maxIndex: array at the start of a later call, maxIndex with ties.",
  "recursive-vs-iterative": "Match a recursive traversal (forward, backward, stride 2, print-after-call) with the equivalent for-loop header.",
};
const LV = ["B", "I", "A"];
let cat = "# Reasoning-family catalog\n\nGenerated by `tests/gen-docs.mjs` from the live generators. The **legacy** generator of each mode is retained as one weighted entry (only narrow changes: merge-sort questions now use unsorted input; legacy debug items display 'find the bug' instead of their answer-revealing family label) (weights: " + Object.entries(LEGACY_WEIGHT).map(([m, w]) => `${m} ${w}`).join(", ") + "; each new family has weight 1, `knob-bug` 4).\n\nDeclared reasoning ids have the form `family:structural-variant:question-type`. Counts below are distinct ids observed in 600 builds per family and difficulty.\n\n";
let reps = "# Representative generated questions\n\nGenerated by `tests/gen-docs.mjs` (seed 31415). One question per family at its lowest and highest difficulty. Every answer shown is re-derived from a real JVM run by `tests/jvm-compose-tests.mjs`.\n\n";
const r = seededRandom(31415);
for (const [mode, fams] of Object.entries(FAMILIES)) {
  cat += `## ${modeNames[mode]} (\`${mode}\`)\n\n| Family | Levels | Reasoning process | Declared reasoning ids (B / I / A) | Misconception ids |\n|---|---|---|---|---|\n`;
  reps += `## ${modeNames[mode]}\n\n`;
  for (const f of fams) {
    const counts = [], mis = new Set();
    for (const L of [0, 1, 2]) { if (!f.levels.includes(L)) { counts.push("—"); continue; } const ids = new Set(); for (let i = 0; i < 600; i++) { const q = composeQuestion(f, difficulties[L], r); if (q) { ids.add(q.reasoning); q.misconceptions.forEach(m => mis.add(m)); } } counts.push(ids.size); }
    cat += `| \`${f.id}\` | ${f.levels.map(l => LV[l]).join("")} | ${DESC[f.id] || ""} | ${counts.join(" / ")} | ${mis.size} |\n`;
    for (const L of [...new Set([Math.min(...f.levels), Math.max(...f.levels)])]) { const q = composeQuestion(f, difficulties[L], r);
      reps += `### ${f.id} — ${difficulties[L]} (\`${q.reasoning}\`)\n\n\`\`\`java\n${q.code}\n\`\`\`\n\n**${q.prompt}**\n\n${q.choices.map(c => `- ${c === q.answer ? "**✓** " : ""}${c}${c !== q.answer ? ` — _${q.choiceFeedback[c]}_` : ""}`).join("\n")}\n\n> ${q.explanation}\n\n`; }
  }
  cat += "\n";
}
writeFileSync(new URL("REASONING_FAMILY_CATALOG.md", out), cat); writeFileSync(new URL("REPRESENTATIVE_QUESTIONS.md", out), reps);
console.log("docs written");
