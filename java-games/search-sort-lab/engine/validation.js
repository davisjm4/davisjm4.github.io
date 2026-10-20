/* Independent verification. This file deliberately re-derives every answer from
   the challenge `spec` WITHOUT importing algorithms.js, so a bug in a simulator
   cannot silently agree with itself. (The JVM test additionally runs real Java.) */
import { validateDifficulty } from "./difficulty.js";

const set = (a) => `{${a.join(", ")}}`;
const eqv = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortedAsc = (a) => a.every((v, i) => i === 0 || a[i - 1] <= v);

/* ---------- independent binary search (recursive style) ---------- */
function bsTrace(arr, t, o = {}) {
  const out = { steps: [], index: -1, looped: false };
  let lo = 0, hi = arr.length - 1, guard = 0;
  const upper = o.bug === "mid-hi";
  while (o.bug === "lt-high" ? lo < hi : lo <= hi) {
    if (++guard > 200) { out.looped = true; return out; }
    const mid = upper ? Math.ceil((lo + hi) / 2) : Math.floor((lo + hi) / 2);
    const st = { lo, hi, mid, v: arr[mid] };
    out.steps.push(st);
    if (arr[mid] === t) { out.index = mid; return out; }
    if (arr[mid] < t) lo = o.bug === "low=mid" ? mid : mid + 1;
    else hi = o.bug === "high=mid" ? mid : mid - 1;
    st.nlo = lo; st.nhi = hi;
  }
  out.endLo = lo; out.endHi = hi;
  return out;
}
const LH = (lo, hi) => `low = ${lo}, high = ${hi}`;
const outcomeText = (looped, index, present, t) => (looped ? "It never finishes: the loop runs forever." : index === -1 ? (present ? `It returns -1 even though ${t} is in the array.` : "It returns -1.") : `It returns ${index}.`);

/* ---------- independent sorts ---------- */
function selStates(arr, passes) {
  const a = arr.slice(), out = [];
  for (let i = 0; i < Math.min(passes, a.length - 1); i++) {
    const rest = a.slice(i);
    const m = i + rest.indexOf(Math.min(...rest));
    const t = a[i]; a[i] = a[m]; a[m] = t;
    out.push(a.slice());
  }
  return out;
}
const selOnePass = (state, i) => { const a = state.slice(); const rest = a.slice(i); const m = i + rest.indexOf(Math.min(...rest)); const t = a[i]; a[i] = a[m]; a[m] = t; return a; };
const insOnePass = (state, i) => { const prefix = state.slice(0, i); const key = state[i]; const pos = prefix.filter((v) => v <= key).length; const out = prefix.slice(); out.splice(pos, 0, key); return out.concat(state.slice(i + 1)); };
function insStates(arr) { let s = arr.slice(); const out = []; for (let i = 1; i < s.length; i++) { s = insOnePass(s, i); out.push(s); } return out; }
function insCounts(arr, upto, variant = "std") {
  let cmp = 0, sh = 0; const a = arr.slice();
  for (let i = 1; i <= upto; i++) {
    const key = a[i]; let j = i - 1;
    for (;;) {
      if (variant === "j>0" ? !(j > 0) : !(j >= 0)) break;
      cmp++;
      const go = variant === "ge" ? a[j] >= key : variant === "lt" ? a[j] < key : a[j] > key;
      if (!go) break;
      a[j + 1] = a[j]; sh++; j--;
    }
    a[j + 1] = key;
  }
  return { cmp, sh, a };
}
function mergeSimple(L, R) { const o = [], src = []; let i = 0, j = 0, c = 0; while (i < L.length && j < R.length) { c++; if (L[i] <= R[j]) { o.push(L[i++]); src.push("L"); } else { o.push(R[j++]); src.push("R"); } } while (i < L.length) { o.push(L[i++]); src.push("L"); } while (j < R.length) { o.push(R[j++]); src.push("R"); } return { o, c, src }; }
/* recursive generator returning {calls, merges} in execution order */
function msRun(arr) {
  const a = arr.slice(), calls = [], merges = []; let cmp = 0;
  (function go(lo, hi, depth) {
    calls.push({ lo, hi, depth, sub: a.slice(lo, hi + 1) });
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    go(lo, mid, depth + 1); go(mid + 1, hi, depth + 1);
    const m = mergeSimple(a.slice(lo, mid + 1), a.slice(mid + 1, hi + 1));
    for (let k = 0; k < m.o.length; k++) a[lo + k] = m.o[k];
    cmp += m.c;
    merges.push({ lo, mid, hi, left: m.o.length ? undefined : undefined, state: a.slice(), result: m.o, c: m.c });
  })(0, a.length - 1, 0);
  return { calls, merges, cmp, result: a };
}
function msMergesDetailed(arr) {
  const a = arr.slice(), out = [];
  (function go(lo, hi) { if (lo >= hi) return; const mid = (lo + hi) >> 1; go(lo, mid); go(mid + 1, hi); const L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1); const m = mergeSimple(L, R); for (let k = 0; k < m.o.length; k++) a[lo + k] = m.o[k]; out.push(`Merge ${out.length + 1}: ${set(L)} + ${set(R)} → ${set(m.o)}`); })(0, a.length - 1);
  return out;
}

/* ---------- structure-only classifier for displayed Java ---------- */
export function classifyCode(code) {
  const src = code.replace(/\/\/[^\n]*/g, "");
  const m = src.match(/static\s+[\w\[\]]+\s+(\w+)\s*\(/);
  const name = m ? m[1] : "";
  const selfCalls = name ? (src.match(new RegExp("\\b" + name + "\\s*\\(", "g")) || []).length - 1 : 0;
  const hasNewArr = /new int\s*\[/.test(src);
  const half = /\/\s*2/.test(src);
  if (selfCalls >= 2 && hasNewArr) return "merge";
  if (selfCalls >= 1 && half && !hasNewArr) return "binary";
  if (half && /while|for/.test(src) && /return\s+-1/.test(src)) return "binary";
  if (/return\s+-1/.test(src)) return "linear";
  const shift = /\[\s*\w+\s*\+\s*1\s*\]\s*=\s*\w+\s*\[\s*\w+\s*\]/.test(src);
  const adjSwap = /\[\s*\w+\s*-\s*1\s*\]/.test(src) && /while/.test(src);
  if (shift || adjSwap) return "insertion";
  if ((src.match(/\bfor\s*\(/g) || []).length >= 2) return "selection";
  return "unknown";
}

/* ---------- op table: spec -> canonical correct value ---------- */
const OPS = {
  "bin-mid-first": (s) => Math.floor((s.n - 1) / 2),
  "bin-bounds-first": (s) => { const t = bsTrace(s.arr, s.target).steps[0]; return LH(t.nlo, t.nhi); },
  "bin-bounds-at": (s) => { const t = bsTrace(s.arr, s.target).steps[s.k - 1]; return LH(t.lo, t.hi); },
  "bin-mid-at": (s) => bsTrace(s.arr, s.target).steps[s.k - 1].mid,
  "bin-exit": (s) => { const t = bsTrace(s.arr, s.target); return LH(t.endLo, t.endHi); },
  "bin-return": (s) => bsTrace(s.arr, s.target).index,
  "bin-passes": (s) => bsTrace(s.arr, s.target).steps.length,
  "bin-mids": (s) => bsTrace(s.arr, s.target).steps.map((x) => x.mid).join(", "),
  "bin-update-line": (s) => (s.value < s.target ? "low = mid + 1;" : "high = mid - 1;"),
  "bin-valid-array": null, // checked against choices
  "bin-bug-outcome": (s) => { const t = bsTrace(s.arr, s.target, { bug: s.bug }); return outcomeText(t.looped, t.index, s.arr.includes(s.target), s.target); },
  "bin-bug-line": (s) => ({ "high=mid": "high = mid;", "low=mid": "low = mid;", "lt-high": "while (low < high) {" })[s.bug],
  "bin-impl-compare": (s) => `searchA returns ${bsTrace(s.arr, s.target).index}, searchB returns ${bsTrace(s.arr, s.target, { bug: "mid-hi" }).index}`,
  "sel-min-index": (s) => { const st = selStates(s.arr, s.k - 1); const base = s.k === 1 ? s.arr : st[s.k - 2]; const i = s.k - 1; const rest = base.slice(i); return i + rest.indexOf(Math.min(...rest)); },
  "sel-after-pass": (s) => selStates(s.arr, s.k)[s.k - 1],
  "sel-next-swap": (s) => { const base = s.k === 1 ? s.arr : selStates(s.arr, s.k - 1)[s.k - 2]; const i = s.k - 1; const rest = base.slice(i); const m = i + rest.indexOf(Math.min(...rest)); return m === i ? `a[${i}] with itself (index ${i} is already the smallest)` : `a[${i}] and a[${m}]`; },
  "sel-compares-pass": (s) => s.arr.length - 1 - (s.k - 1),
  "sel-compares-first-k": (s) => { let t = 0; for (let i = 0; i < s.k; i++) t += s.arr.length - 1 - i; return t; },
  "sel-compares-total": (s) => (s.arr.length * (s.arr.length - 1)) / 2,
  "sel-effective-swaps": (s) => { let c = 0, st = s.arr; for (let i = 0; i < s.arr.length - 1; i++) { const rest = st.slice(i); const m = i + rest.indexOf(Math.min(...rest)); if (m !== i) c++; st = selOnePass(st, i); } return c; },
  "sel-region": (s) => `indexes 0 through ${s.k - 1}`,
  "sel-inner-range": (s) => `j runs from ${s.i + 1} to ${s.n - 1} (${s.n - 1 - s.i} iteration${s.n - 1 - s.i === 1 ? "" : "s"})`,
  "sel-changes": (s) => { const base = s.k === 1 ? s.arr : selStates(s.arr, s.k - 1)[s.k - 2]; const i = s.k - 1; let min = base[i]; const js = []; for (let j = i + 1; j < base.length; j++) if (base[j] < min) { min = base[j]; js.push(j); } return js.length ? js.map((j) => `j = ${j}`).join(" and ") : "no value of j"; },
  "sel-invalid-row": (s) => { for (let p = 1; p <= s.rows; p++) if (!eqv(s.states[p], selOnePass(s.states[p - 1], p - 1))) return `After pass ${p}`; return null; },
  "sel-full-trace": (s) => selStates(s.arr, s.arr.length - 1),
  "ins-key": (s) => s.arr[s.i],
  "ins-pos": (s) => s.arr.slice(0, s.i).filter((v) => v <= s.arr[s.i]).length,
  "ins-after-pass": (s) => { let st = s.arr; for (let i = 1; i <= s.i; i++) st = insOnePass(st, i); return st; },
  "ins-first-shift": (s) => s.i - 1,
  "ins-shifts-pass": (s) => s.arr.slice(0, s.i).filter((v) => v > s.arr[s.i]).length,
  "ins-compares-pass": (s) => { const sh = s.arr.slice(0, s.i).filter((v) => v > s.arr[s.i]).length; return sh + (sh < s.i ? 1 : 0); },
  "ins-shifts-first-k": (s) => insCounts(s.arr, s.k).sh,
  "ins-compares-first-k": (s) => insCounts(s.arr, s.k).cmp,
  "ins-compares-total": (s) => insCounts(s.arr, s.arr.length - 1).cmp,
  "ins-shifts-total": (s) => insCounts(s.arr, s.arr.length - 1).sh,
  "ins-vs-sel": (s) => { const i = insStates(s.arr)[s.k - 1], q = selStates(s.arr, s.k)[s.k - 1]; if (eqv(i, q)) return null; return eqv(s.shown, i) ? "Insertion sort" : eqv(s.shown, q) ? "Selection sort" : null; },
  "ins-invalid-row": (s) => { for (let p = 1; p <= s.rows; p++) if (!eqv(s.states[p], insOnePass(s.states[p - 1], p))) return `After i = ${p}`; return null; },
  "ins-defect-shifts": (s) => insCounts(s.arr, s.arr.length - 1, s.variant).sh,
  "ins-defect-result": (s) => insCounts(s.arr, s.arr.length - 1, s.variant).a,
  "ins-full-trace": (s) => insStates(s.arr),
  "mrg-next": (s) => mergeSimple(s.left, s.right).o[s.progress],
  "mrg-result": (s) => [...s.left, ...s.right].sort((a, b) => a - b),
  "mrg-split": (s) => { const mid = (s.arr.length - 1) >> 1; return `${set(s.arr.slice(0, mid + 1))} and ${set(s.arr.slice(mid + 1))}`; },
  "mrg-split-sizes": (s) => `left ${Math.ceil(s.n / 2)}, right ${Math.floor(s.n / 2)}`,
  "mrg-kth-call": (s) => { const c = msRun(s.arr).calls[s.k - 1]; return `mergeSort(values, ${c.lo}, ${c.hi}) → ${set(c.sub)}`; },
  "mrg-count": (s) => (s.kind === "calls" ? 2 * s.arr.length - 1 : s.kind === "merges" ? s.arr.length - 1 : s.arr.length),
  "mrg-after-merge": (s) => msRun(s.arr).merges[s.k - 1].state,
  "mrg-compares-one": (s) => mergeSimple(s.left, s.right).c,
  "mrg-compares-total": (s) => msRun(s.arr).cmp,
  "mrg-sources": (s) => mergeSimple(s.left, s.right).src.slice(0, 6).join(""),
  "mrg-invalid": (s) => { const bad = s.rows.map((r, i) => (eqv(r.shown, mergeSimple(r.left, r.right).o) ? -1 : i)).filter((i) => i >= 0); return bad.length === 1 ? `Merge ${"ABCD"[bad[0]]}` : null; },
  "mrg-base-case": (s) => { const base = s.options.filter((o) => { const m = o.match(/values, (\d+), (\d+)\)/); return Number(m[1]) >= Number(m[2]); }); return base.length === 1 ? base[0] : null; },
  "mrg-pair-sorted": (s) => { const ok = s.pairs.filter(([a, b]) => sortedAsc(a) && sortedAsc(b)); return ok.length === 1 ? `${set(ok[0][0])} and ${set(ok[0][1])}` : null; },
  "mrg-full-trace": (s) => msMergesDetailed(s.arr),
  "name-code": null, "name-defect": null, "name-mislead": null, // classifier (needs code)
  "name-trace-search": (s) => (s.algo === "binary" ? "Binary search" : "Linear search"),
  "name-trace-merge": () => "Merge sort",
  "name-trace-sort": (s) => (s.algo === "selection" ? "Selection sort" : "Insertion sort"),
  "name-desc": (s) => ({ linear: "Linear search", binary: "Binary search", selection: "Selection sort", insertion: "Insertion sort", merge: "Merge sort" })[s.algo],
  "cmp-which-search": (s) => { const t = s.arr.indexOf(s.target); const lin = t >= 0 ? t + 1 : s.arr.length; const bin = bsTrace(s.arr, s.target).steps.length; return lin < bin ? "Linear search" : lin > bin ? "Binary search" : "They make the same number"; },
  "cmp-count-search": (s) => { if (s.algo === "linear") { const t = s.arr.indexOf(s.target); return t >= 0 ? t + 1 : s.arr.length; } return bsTrace(s.arr, s.target).steps.length; },
  "cmp-sort-fewer": (s) => {
    const sel = (s.arr.length * (s.arr.length - 1)) / 2, ins = insCounts(s.arr, s.arr.length - 1).cmp, mrg = msRun(s.arr).cmp;
    const vals = s.three ? { "Selection sort": sel, "Insertion sort": ins, "Merge sort": mrg } : { "Selection sort": sel, "Insertion sort": ins };
    const min = Math.min(...Object.values(vals)); const best = Object.keys(vals).filter((k) => vals[k] === min);
    return best.length === Object.keys(vals).length ? "They all make the same number" : best.length === 1 ? best[0] : null;
  },
  "cmp-input-order": (s) => {
    const run = (a) => (s.algo === "insertion" ? (s.metric === "shifts" ? insCounts(a, a.length - 1).sh : insCounts(a, a.length - 1).cmp) : (a.length * (a.length - 1)) / 2);
    const v = Object.fromEntries(Object.entries(s.inputs).map(([k, a]) => [k, run(a)]));
    const tgt = s.dir === "fewest" ? Math.min(...Object.values(v)) : Math.max(...Object.values(v));
    const hits = Object.keys(v).filter((k) => v[k] === tgt);
    return new Set(Object.values(v)).size === 1 ? "All three need the same amount" : hits.length === 1 ? hits[0] : null;
  },
  "cmp-growth": (s) => {
    const worst = (n) => { const arr = Array.from({ length: n }, (_, i) => 10 * (i + 1)); let w = 0; for (let t = 0; t <= 10 * n + 10; t++) w = Math.max(w, bsTrace(arr, t).steps.length); return w; };
    if (s.kind === "worst-binary") return worst(s.N);
    if (s.kind === "grow-binary") return worst(s.f * s.N) - worst(s.N);
    if (s.kind === "grow-linear") return (s.f - 1) * s.N;
    if (s.kind === "max-size") return 2 ** s.k - 1; // closed form, cross-checks the generator's brute-force search
    return s.N - worst(s.N);
  },
  "cmp-narrowing": (s) => { const t = bsTrace(s.arr, s.target).steps[0]; return t.nhi - t.nlo + 1; },
  "cmp-simple-count": (s) => (s.kind === "sel-first-pass" ? s.arr.length - 1 : s.kind === "lin-absent" ? s.arr.length : s.kind === "ins-sorted-compares" ? s.arr.length - 1 : 0),
  "cmp-fit": (s) => (sortedAsc(s.arr) ? "Either linear or binary search" : "Linear search only"),
};

export function recompute(ch) {
  const op = ch.spec?.op;
  if (!(op in OPS)) return { error: `unknown op ${op}` };
  if (op === "bin-valid-array") {
    const sortedChoices = ch.choices.filter((c) => sortedAsc(c.value));
    return { value: sortedChoices.length === 1 ? sortedChoices[0].value : null };
  }
  if (op === "name-code" || op === "name-defect" || op === "name-mislead") {
    const lab = { linear: "Linear search", binary: "Binary search", selection: "Selection sort", insertion: "Insertion sort", merge: "Merge sort" };
    return { value: lab[classifyCode(ch.code)] };
  }
  const v = OPS[op](ch.spec);
  // extra checks for evidence-style name questions
  return { value: v };
}

const countBraces = (code, o, c) => (code.split(o).length - 1) - (code.split(c).length - 1);
export function verifyChallenge(ch) {
  const problems = [];
  const bad = (m) => problems.push(m);
  if (ch.schema !== "search-sort-lab/1") bad("schema");
  if (!ch.stem) bad("no stem");
  if (!Array.isArray(ch.choices) || ch.choices.length !== 4) return problems.concat(["need exactly 4 choices"]);
  const keys = ch.choices.map((c) => JSON.stringify(c.value));
  if (new Set(keys).size !== 4) bad("duplicate choices");
  const texts = ch.choices.map((c) => c.text);
  if (new Set(texts).size !== 4) bad("duplicate choice text");
  if (!(ch.answerIndex >= 0 && ch.answerIndex < 4)) bad("bad answerIndex");
  if (!eqv(ch.choices[ch.answerIndex]?.value, ch.correctValue)) bad("answerIndex does not point at correctValue");
  const rec = recompute(ch);
  if (rec.error) bad(rec.error);
  else {
    if (rec.value === null || rec.value === undefined) bad("independent recomputation ambiguous/undefined");
    else if (!eqv(rec.value, ch.correctValue)) bad(`independent answer ${JSON.stringify(rec.value)} != generated ${JSON.stringify(ch.correctValue)}`);
    ch.choices.forEach((c, i) => { if (i !== ch.answerIndex && eqv(c.value, rec.value)) bad(`distractor ${i} equals the independent answer`); });
  }
  ch.choices.forEach((c, i) => { if (i !== ch.answerIndex && !(c.why && c.why.length > 8)) bad(`distractor ${i} has no misconception explanation`); });
  if (ch.code) {
    if (countBraces(ch.code, "{", "}") !== 0 && !/int\[\] \w+ = \{/.test(ch.code)) bad("unbalanced braces in code");
    if (countBraces(ch.code.replace(/int\[\] \w+ = \{[^}]*\};/g, ""), "{", "}") !== 0) bad("unbalanced braces in code (after removing array literals)");
    if (countBraces(ch.code, "(", ")") !== 0) bad("unbalanced parentheses in code");
  }
  if (!ch.explanation || !ch.explanation.length) bad("no explanation");
  for (const p of validateDifficulty(ch)) bad("difficulty: " + p);
  return problems;
}
export { OPS };
