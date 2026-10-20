/* Search & Sort Lab — deterministic algorithm simulators.
   Pure functions, no DOM, no randomness. Every simulator returns structured
   step data plus operation counts. Input arrays are never mutated.

   DOCUMENTED JAVA IMPLEMENTATIONS (the exact conventions simulated here)
   ---------------------------------------------------------------------
   LINEAR SEARCH      for (i=0;i<n;i++) if (a[i]==t) return i; return -1;
                      -> returns FIRST occurrence. Comparisons = elements examined.
   BINARY SEARCH      int low=0, high=n-1;
                      while (low<=high){ int mid=(low+high)/2;
                        if (a[mid]==t) return mid;
                        else if (a[mid]<t) low=mid+1; else high=mid-1; }
                      return -1;
                      -> returns WHICHEVER matching index the midpoints reach first
                         (not necessarily first/last). Integer division floors
                         (values are non-negative sums, so floor == truncation).
                      Midpoint comparison count: 1 per loop pass if a[mid]==t
                      is checked first, +1 for the a[mid]<t test when not equal.
                      We count "a[mid] versus target" as ONE three-way look per pass
                      (probes), and separately expose the two-test count.
   SELECTION SORT    for (i=0;i<n-1;i++){ int min=i;
                        for (j=i+1;j<n;j++) if (a[j]<a[min]) min=j;
                        swap a[i],a[min]; }
                      -> swap is ALWAYS performed (self-swap when min==i, counted
                         as a swap and flagged selfSwap). Strict < so the FIRST
                         occurrence of the minimum is kept (unstable overall).
                      Comparisons = n(n-1)/2 always.
   INSERTION SORT    for (i=1;i<n;i++){ int key=a[i]; int j=i-1;
                        while (j>=0 && a[j]>key){ a[j+1]=a[j]; j--; }
                        a[j+1]=key; }
                      -> strict > so equal elements are NOT passed (stable).
                      Comparison counted each time a[j]>key is evaluated with
                      j>=0 true. Shifts = executions of a[j+1]=a[j].
   MERGE SORT        mergeSort(a,lo,hi): if (hi-lo<1) return;   // size<=1 base case
                        mid=(lo+hi)/2; mergeSort(a,lo,mid); mergeSort(a,mid+1,hi);
                        merge(a,lo,mid,hi);
                      merge: left=a[lo..mid], right=a[mid+1..hi];
                        take left when left[i] <= right[j] (ties go LEFT => stable);
                        each take while both sides non-empty = 1 comparison;
                        remaining elements are copied with no comparison.
                      Left half is the LARGER half for odd sizes (mid=(lo+hi)/2).
*/

export const ALGORITHMS = ["linear", "binary", "selection", "insertion", "merge"];
export const ALGO_NAMES = {
  linear: "linear search",
  binary: "binary search",
  selection: "selection sort",
  insertion: "insertion sort",
  merge: "merge sort",
};

export const isSorted = (a) => a.every((v, i) => i === 0 || a[i - 1] <= v);
export const multisetKey = (a) => [...a].sort((x, y) => x - y).join(",");

/* ------------------------------ linear search ------------------------------ */
export function linearSearch(arr, target) {
  const steps = [];
  let comparisons = 0;
  for (let i = 0; i < arr.length; i++) {
    comparisons++;
    const hit = arr[i] === target;
    steps.push({ type: "compare", index: i, value: arr[i], target, hit });
    if (hit) return { index: i, comparisons, steps, found: true };
  }
  return { index: -1, comparisons, steps, found: false };
}

/* ------------------------------ binary search ------------------------------ */
/* variant "std": check == first, then <, else >. Optional `bug` injects a
   well-defined defective rule for debugging questions:
     bug: "high=mid"  (high = mid instead of mid-1)
          "low=mid"   (low = mid instead of mid+1)
          "lt-high"   (loop condition low<high)
          "mid-hi"    (mid = (low+high+1)/2)  — a legal, different convention
   Every defect is simulated with a step limit so infinite loops are reported. */
export function binarySearch(arr, target, opts = {}) {
  const { bug = null, maxIterations = 64 } = opts;
  let low = 0,
    high = arr.length - 1;
  const steps = [];
  let probes = 0,
    iterations = 0,
    looped = false;
  const cond = () => (bug === "lt-high" ? low < high : low <= high);
  while (cond()) {
    if (iterations++ >= maxIterations) {
      looped = true;
      break;
    }
    const mid = bug === "mid-hi" ? Math.floor((low + high + 1) / 2) : Math.floor((low + high) / 2);
    probes++;
    const v = arr[mid];
    const rel = v === target ? "eq" : v < target ? "lt" : "gt";
    const step = { low, high, mid, value: v, rel };
    if (rel === "eq") {
      step.action = "found";
      steps.push(step);
      return { index: mid, probes, iterations, steps, found: true, looped, arr: arr.slice() };
    }
    if (rel === "lt") {
      step.action = bug === "low=mid" ? "low=mid" : "low=mid+1";
      low = bug === "low=mid" ? mid : mid + 1;
    } else {
      step.action = bug === "high=mid" ? "high=mid" : "high=mid-1";
      high = bug === "high=mid" ? mid : mid - 1;
    }
    step.nextLow = low;
    step.nextHigh = high;
    steps.push(step);
  }
  return { index: -1, probes, iterations, steps, found: false, looped, arr: arr.slice(), endLow: low, endHigh: high };
}

/* ------------------------------ selection sort ----------------------------- */
export function selectionSort(arr) {
  const a = arr.slice();
  const n = a.length;
  const passes = [];
  let comparisons = 0,
    swaps = 0,
    selfSwaps = 0;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    const compares = [];
    const before = a.slice();
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      const smaller = a[j] < a[min];
      compares.push({ j, min, aj: a[j], amin: a[min], smaller });
      if (smaller) min = j;
    }
    const self = min === i;
    const swapped = a[i];
    a[i] = a[min];
    a[min] = swapped;
    swaps++;
    if (self) selfSwaps++;
    passes.push({ pass: i + 1, i, minIndex: min, minValue: a[i], compares, selfSwap: self, before, after: a.slice(), swapIndices: [i, min] });
  }
  return { result: a, passes, comparisons, swaps, selfSwaps, effectiveSwaps: swaps - selfSwaps };
}

/* ------------------------------ insertion sort -----------------------------
   variant: "std"  while (j >= 0 && a[j] > key)
            "j>0"  while (j > 0  && a[j] > key)   (defect: index 0 never filled by a shift)
            "ge"   while (j >= 0 && a[j] >= key)  (still sorts; passes equal elements, unstable)
            "lt"   while (j >= 0 && a[j] < key)   (defect: sorts descending)           */
export function insertionSort(arr, variant = "std") {
  const a = arr.slice();
  const n = a.length;
  const passes = [];
  let comparisons = 0,
    shifts = 0,
    writes = 0;
  const guard = (j) => (variant === "j>0" ? j > 0 : j >= 0);
  const test = (x, key) => (variant === "ge" ? x >= key : variant === "lt" ? x < key : x > key);
  for (let i = 1; i < n; i++) {
    const key = a[i];
    const before = a.slice();
    let j = i - 1;
    const compares = [];
    let passShifts = 0;
    while (guard(j)) {
      comparisons++;
      const go = test(a[j], key);
      compares.push({ j, aj: a[j], key, greater: go });
      if (!go) break;
      a[j + 1] = a[j];
      shifts++;
      passShifts++;
      j--;
    }
    a[j + 1] = key;
    writes++;
    passes.push({ pass: i, i, key, insertAt: j + 1, shifts: passShifts, compares, before, after: a.slice(), moved: j + 1 !== i });
  }
  return { result: a, passes, comparisons, shifts, writes };
}

/* -------------------------------- merge sort ------------------------------- */
export function merge(left, right) {
  const out = [];
  const seq = [];
  let i = 0,
    j = 0,
    comparisons = 0;
  while (i < left.length && j < right.length) {
    comparisons++;
    if (left[i] <= right[j]) {
      seq.push({ from: "left", value: left[i], i, j, compared: true });
      out.push(left[i++]);
    } else {
      seq.push({ from: "right", value: right[j], i, j, compared: true });
      out.push(right[j++]);
    }
  }
  while (i < left.length) {
    seq.push({ from: "left", value: left[i], i, j, compared: false });
    out.push(left[i++]);
  }
  while (j < right.length) {
    seq.push({ from: "right", value: right[j], i, j, compared: false });
    out.push(right[j++]);
  }
  return { result: out, comparisons, sequence: seq };
}

export function mergeSort(arr) {
  const a = arr.slice();
  const events = []; // pre-order call log + merges, in execution order
  let calls = 0,
    comparisons = 0,
    merges = 0,
    maxDepth = 0;
  const states = []; // whole-array state after each merge
  function rec(lo, hi, depth) {
    calls++;
    maxDepth = Math.max(maxDepth, depth);
    const call = { type: "call", lo, hi, depth, sub: a.slice(lo, hi + 1) };
    events.push(call);
    if (hi - lo < 1) {
      call.base = true;
      return;
    }
    const mid = Math.floor((lo + hi) / 2);
    call.mid = mid;
    rec(lo, mid, depth + 1);
    rec(mid + 1, hi, depth + 1);
    const left = a.slice(lo, mid + 1),
      right = a.slice(mid + 1, hi + 1);
    const m = merge(left, right);
    for (let k = 0; k < m.result.length; k++) a[lo + k] = m.result[k];
    comparisons += m.comparisons;
    merges++;
    events.push({ type: "merge", lo, mid, hi, depth, left, right, result: m.result, comparisons: m.comparisons, sequence: m.sequence, state: a.slice() });
    states.push(a.slice());
  }
  if (a.length) rec(0, a.length - 1, 0);
  return { result: a, events, calls, comparisons, merges, maxDepth, states, merges_list: events.filter((e) => e.type === "merge") };
}

/* ------------------------------ generic helpers ---------------------------- */
export function runSort(name, arr) {
  if (name === "selection") return selectionSort(arr);
  if (name === "insertion") return insertionSort(arr);
  if (name === "merge") return mergeSort(arr);
  throw new Error("unknown sort " + name);
}
export function sortComparisons(name, arr) {
  const r = runSort(name, arr);
  return r.comparisons;
}
