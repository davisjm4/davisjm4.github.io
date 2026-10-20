/* Java source templates shown to students. Every template here is compiled by
   the JVM test (tests/jvm.test.mjs). codeKind says how to wrap it:
     "statements" -> body of main        "methods" -> members of a class */
import { fmt } from "./arrays.js";

export const decl = (name, arr) => `int[] ${name} = ${fmt(arr)};`;

/* ---- binary search ---- */
export function binaryLoop({ arr = "numbers", mid = "lower", bug = null } = {}) {
  const cond = bug === "lt-high" ? "low < high" : "low <= high";
  const midLine = mid === "upper" || bug === "mid-hi" ? "int mid = (low + high + 1) / 2;" : "int mid = (low + high) / 2;";
  const lowUpd = bug === "low=mid" ? "low = mid;" : "low = mid + 1;";
  const highUpd = bug === "high=mid" ? "high = mid;" : "high = mid - 1;";
  return [
    `while (${cond}) {`,
    `    ${midLine}`,
    `    if (${arr}[mid] == target) {`,
    `        return mid;`,
    `    } else if (${arr}[mid] < target) {`,
    `        ${lowUpd}`,
    `    } else {`,
    `        ${highUpd}`,
    `    }`,
    `}`,
    `return -1;`,
  ].join("\n");
}
export function binaryMethod(opts = {}) {
  const loop = binaryLoop({ ...opts, arr: "numbers" })
    .split("\n")
    .map((l) => "    " + l)
    .join("\n");
  return `public static int search(int[] numbers, int target) {\n    int low = 0;\n    int high = numbers.length - 1;\n${loop}\n}`;
}
export const binarySetup = (arr, target) => `${decl("numbers", arr)}\nint target = ${target};\n\nint low = 0;\nint high = numbers.length - 1;`;

/* ---- bare sort loops (statements; array variable `values`) ---- */
export const selectionLoop = (a = "values") =>
  [
    `for (int i = 0; i < ${a}.length - 1; i++) {`,
    `    int minIndex = i;`,
    `    for (int j = i + 1; j < ${a}.length; j++) {`,
    `        if (${a}[j] < ${a}[minIndex]) {`,
    `            minIndex = j;`,
    `        }`,
    `    }`,
    `    int temp = ${a}[i];`,
    `    ${a}[i] = ${a}[minIndex];`,
    `    ${a}[minIndex] = temp;`,
    `}`,
  ].join("\n");

export function insertionLoop(a = "values", variant = "std") {
  const guard = variant === "j>0" ? "j > 0" : "j >= 0";
  const cmp = variant === "ge" ? ">=" : variant === "lt" ? "<" : ">";
  return [
    `for (int i = 1; i < ${a}.length; i++) {`,
    `    int key = ${a}[i];`,
    `    int j = i - 1;`,
    `    while (${guard} && ${a}[j] ${cmp} key) {`,
    `        ${a}[j + 1] = ${a}[j];`,
    `        j--;`,
    `    }`,
    `    ${a}[j + 1] = key;`,
    `}`,
  ].join("\n");
}

export const mergeSortCode = [
  `public static void mergeSort(int[] a, int lo, int hi) {`,
  `    if (lo >= hi) {`,
  `        return;`,
  `    }`,
  `    int mid = (lo + hi) / 2;`,
  `    mergeSort(a, lo, mid);`,
  `    mergeSort(a, mid + 1, hi);`,
  `    merge(a, lo, mid, hi);`,
  `}`,
].join("\n");
export const mergeHelperCode = [
  `public static void merge(int[] a, int lo, int mid, int hi) {`,
  `    int[] temp = new int[hi - lo + 1];`,
  `    int i = lo;`,
  `    int j = mid + 1;`,
  `    int k = 0;`,
  `    while (i <= mid && j <= hi) {`,
  `        if (a[i] <= a[j]) {`,
  `            temp[k++] = a[i++];`,
  `        } else {`,
  `            temp[k++] = a[j++];`,
  `        }`,
  `    }`,
  `    while (i <= mid) {`,
  `        temp[k++] = a[i++];`,
  `    }`,
  `    while (j <= hi) {`,
  `        temp[k++] = a[j++];`,
  `    }`,
  `    for (k = 0; k < temp.length; k++) {`,
  `        a[lo + k] = temp[k];`,
  `    }`,
  `}`,
].join("\n");

/* ---- algorithm-identification templates ----
   Placeholders: $a array, $t target, $n length name, $i $j outer/inner,
   $m min/mid-ish, $k key, $x temp, $lo $hi, $f method name.
   Each template is a complete static method (codeKind "methods"). */
export const ID_TEMPLATES = {
  linear: [
    `public static int $f(int[] $a, int $t) {\n    for (int $i = 0; $i < $a.length; $i++) {\n        if ($a[$i] == $t) {\n            return $i;\n        }\n    }\n    return -1;\n}`,
    `public static int $f(int[] $a, int $t) {\n    int $i = 0;\n    while ($i < $a.length) {\n        if ($a[$i] == $t) {\n            return $i;\n        }\n        $i++;\n    }\n    return -1;\n}`,
    `public static int $f(int[] $a, int $t) {\n    int $i = 0;\n    for (int $x : $a) {\n        if ($x == $t) {\n            return $i;\n        }\n        $i++;\n    }\n    return -1;\n}`,
  ],
  binary: [
    `public static int $f(int[] $a, int $t) {\n    int $lo = 0;\n    int $hi = $a.length - 1;\n    while ($lo <= $hi) {\n        int $m = ($lo + $hi) / 2;\n        if ($a[$m] == $t) {\n            return $m;\n        } else if ($a[$m] < $t) {\n            $lo = $m + 1;\n        } else {\n            $hi = $m - 1;\n        }\n    }\n    return -1;\n}`,
    `public static int $f(int[] $a, int $t) {\n    int $lo = 0;\n    int $hi = $a.length - 1;\n    while ($lo <= $hi) {\n        int $m = $lo + ($hi - $lo) / 2;\n        if ($t < $a[$m]) {\n            $hi = $m - 1;\n        } else if ($t > $a[$m]) {\n            $lo = $m + 1;\n        } else {\n            return $m;\n        }\n    }\n    return -1;\n}`,
    `public static int $f(int[] $a, int $t, int $lo, int $hi) {\n    if ($lo > $hi) {\n        return -1;\n    }\n    int $m = ($lo + $hi) / 2;\n    if ($a[$m] == $t) {\n        return $m;\n    }\n    if ($a[$m] < $t) {\n        return $f($a, $t, $m + 1, $hi);\n    }\n    return $f($a, $t, $lo, $m - 1);\n}`,
  ],
  selection: [
    `public static void $f(int[] $a) {\n    for (int $i = 0; $i < $a.length - 1; $i++) {\n        int $m = $i;\n        for (int $j = $i + 1; $j < $a.length; $j++) {\n            if ($a[$j] < $a[$m]) {\n                $m = $j;\n            }\n        }\n        int $x = $a[$i];\n        $a[$i] = $a[$m];\n        $a[$m] = $x;\n    }\n}`,
    `public static void $f(int[] $a) {\n    for (int $i = 0; $i < $a.length; $i++) {\n        int $m = $i;\n        for (int $j = $i; $j < $a.length; $j++) {\n            if ($a[$j] < $a[$m]) {\n                $m = $j;\n            }\n        }\n        int $x = $a[$m];\n        $a[$m] = $a[$i];\n        $a[$i] = $x;\n    }\n}`,
    `public static void $f(int[] $a) {\n    for (int $i = 0; $i < $a.length - 1; $i++) {\n        int $m = $i;\n        int $v = $a[$i];\n        for (int $j = $i + 1; $j < $a.length; $j++) {\n            if ($a[$j] < $v) {\n                $v = $a[$j];\n                $m = $j;\n            }\n        }\n        $a[$m] = $a[$i];\n        $a[$i] = $v;\n    }\n}`,
  ],
  insertion: [
    `public static void $f(int[] $a) {\n    for (int $i = 1; $i < $a.length; $i++) {\n        int $k = $a[$i];\n        int $j = $i - 1;\n        while ($j >= 0 && $a[$j] > $k) {\n            $a[$j + 1] = $a[$j];\n            $j--;\n        }\n        $a[$j + 1] = $k;\n    }\n}`,
    `public static void $f(int[] $a) {\n    for (int $i = 1; $i < $a.length; $i++) {\n        int $k = $a[$i];\n        int $j;\n        for ($j = $i - 1; $j >= 0 && $a[$j] > $k; $j--) {\n            $a[$j + 1] = $a[$j];\n        }\n        $a[$j + 1] = $k;\n    }\n}`,
    `public static void $f(int[] $a) {\n    for (int $i = 1; $i < $a.length; $i++) {\n        int $j = $i;\n        while ($j > 0 && $a[$j - 1] > $a[$j]) {\n            int $x = $a[$j];\n            $a[$j] = $a[$j - 1];\n            $a[$j - 1] = $x;\n            $j--;\n        }\n    }\n}`,
  ],
  merge: [
    `public static void $f(int[] $a, int $lo, int $hi) {\n    if ($lo >= $hi) {\n        return;\n    }\n    int $m = ($lo + $hi) / 2;\n    $f($a, $lo, $m);\n    $f($a, $m + 1, $hi);\n    int[] $x = new int[$hi - $lo + 1];\n    int $i = $lo;\n    int $j = $m + 1;\n    int $k = 0;\n    while ($i <= $m && $j <= $hi) {\n        if ($a[$i] <= $a[$j]) {\n            $x[$k++] = $a[$i++];\n        } else {\n            $x[$k++] = $a[$j++];\n        }\n    }\n    while ($i <= $m) {\n        $x[$k++] = $a[$i++];\n    }\n    while ($j <= $hi) {\n        $x[$k++] = $a[$j++];\n    }\n    for ($k = 0; $k < $x.length; $k++) {\n        $a[$lo + $k] = $x[$k];\n    }\n}`,
    `public static int[] $f(int[] $a) {\n    if ($a.length <= 1) {\n        return $a;\n    }\n    int $m = $a.length / 2;\n    int[] $l = $f(java.util.Arrays.copyOfRange($a, 0, $m));\n    int[] $r = $f(java.util.Arrays.copyOfRange($a, $m, $a.length));\n    int[] $x = new int[$a.length];\n    int $i = 0, $j = 0, $k = 0;\n    while ($i < $l.length && $j < $r.length) {\n        $x[$k++] = ($l[$i] <= $r[$j]) ? $l[$i++] : $r[$j++];\n    }\n    while ($i < $l.length) {\n        $x[$k++] = $l[$i++];\n    }\n    while ($j < $r.length) {\n        $x[$k++] = $r[$j++];\n    }\n    return $x;\n}`,
  ],
};
/* Defective / partial versions: structure still identifies exactly one algorithm. */
export const DEFECT_TEMPLATES = {
  selection: [
    `public static void $f(int[] $a) {\n    for (int $i = 0; $i < $a.length - 1; $i++) {\n        int $m = $i;\n        for (int $j = $i + 1; $j < $a.length; $j++) {\n            if ($a[$j] < $a[$m]) {\n                $m = $j;\n            }\n        }\n        $a[$i] = $a[$m];\n    }\n}`,
    `public static void $f(int[] $a) {\n    for (int $i = 0; $i < $a.length - 1; $i++) {\n        int $m = $i;\n        for (int $j = $i + 1; $j < $a.length; $j++) {\n            if ($a[$j] < $a[$m]) {\n                $m = $j;\n                break;\n            }\n        }\n        int $x = $a[$i];\n        $a[$i] = $a[$m];\n        $a[$m] = $x;\n    }\n}`,
    `public static void $f(int[] $a) {\n    for (int $i = 0; $i < $a.length - 1; $i++) {\n        int $m = $i;\n        for (int $j = $i + 1; $j < $a.length - 1; $j++) {\n            if ($a[$j] < $a[$m]) {\n                $m = $j;\n            }\n        }\n        int $x = $a[$i];\n        $a[$i] = $a[$m];\n        $a[$m] = $x;\n    }\n}`,
  ],
  insertion: [
    `public static void $f(int[] $a) {\n    for (int $i = 1; $i < $a.length; $i++) {\n        int $k = $a[$i];\n        int $j = $i - 1;\n        while ($j > 0 && $a[$j] > $k) {\n            $a[$j + 1] = $a[$j];\n            $j--;\n        }\n        $a[$j + 1] = $k;\n    }\n}`,
    `public static void $f(int[] $a) {\n    for (int $i = 1; $i < $a.length; $i++) {\n        int $k = $a[$i];\n        int $j = $i - 1;\n        while ($j >= 0 && $a[$j] > $k) {\n            $a[$j + 1] = $a[$j];\n            $j--;\n        }\n    }\n}`,
    `public static void $f(int[] $a) {\n    for (int $i = 1; $i < $a.length; $i++) {\n        int $k = $a[$i];\n        int $j = $i - 1;\n        while ($j >= 0 && $a[$j + 1] > $k) {\n            $a[$j + 1] = $a[$j];\n            $j--;\n        }\n        $a[$j + 1] = $k;\n    }\n}`,
  ],
  binary: [
    `public static int $f(int[] $a, int $t) {\n    int $lo = 0;\n    int $hi = $a.length - 1;\n    while ($lo <= $hi) {\n        int $m = ($lo + $hi) / 2;\n        if ($a[$m] == $t) {\n            return $m;\n        } else if ($a[$m] < $t) {\n            $lo = $m;\n        } else {\n            $hi = $m - 1;\n        }\n    }\n    return -1;\n}`,
    `public static int $f(int[] $a, int $t) {\n    int $lo = 0;\n    int $hi = $a.length - 1;\n    while ($lo < $hi) {\n        int $m = ($lo + $hi) / 2;\n        if ($a[$m] == $t) {\n            return $m;\n        } else if ($a[$m] < $t) {\n            $lo = $m + 1;\n        } else {\n            $hi = $m - 1;\n        }\n    }\n    return -1;\n}`,
    `public static int $f(int[] $a, int $t) {\n    int $lo = 0;\n    int $hi = $a.length;\n    while ($lo <= $hi) {\n        int $m = ($lo + $hi) / 2;\n        if ($a[$m] == $t) {\n            return $m;\n        } else if ($a[$m] < $t) {\n            $lo = $m + 1;\n        } else {\n            $hi = $m - 1;\n        }\n    }\n    return -1;\n}`,
  ],
  merge: [
    `public static void $f(int[] $a, int $lo, int $hi) {\n    int $m = ($lo + $hi) / 2;\n    $f($a, $lo, $m);\n    $f($a, $m + 1, $hi);\n    int[] $x = new int[$hi - $lo + 1];\n    int $i = $lo;\n    int $j = $m + 1;\n    int $k = 0;\n    while ($i <= $m && $j <= $hi) {\n        if ($a[$i] <= $a[$j]) {\n            $x[$k++] = $a[$i++];\n        } else {\n            $x[$k++] = $a[$j++];\n        }\n    }\n    while ($i <= $m) {\n        $x[$k++] = $a[$i++];\n    }\n    while ($j <= $hi) {\n        $x[$k++] = $a[$j++];\n    }\n    for ($k = 0; $k < $x.length; $k++) {\n        $a[$lo + $k] = $x[$k];\n    }\n}`,
    `public static void $f(int[] $a, int $lo, int $hi) {\n    if ($lo >= $hi) {\n        return;\n    }\n    int $m = ($lo + $hi) / 2;\n    $f($a, $lo, $m);\n    $f($a, $m + 1, $hi);\n    int[] $x = new int[$hi - $lo + 1];\n    int $i = $lo;\n    int $j = $m + 1;\n    int $k = 0;\n    while ($i <= $m && $j <= $hi) {\n        if ($a[$i] <= $a[$j]) {\n            $x[$k++] = $a[$i++];\n        } else {\n            $x[$k++] = $a[$j++];\n        }\n    }\n    while ($i <= $m) {\n        $x[$k++] = $a[$i++];\n    }\n    for ($k = 0; $k < $x.length; $k++) {\n        $a[$lo + $k] = $x[$k];\n    }\n}`,
  ],
  linear: [
    `public static int $f(int[] $a, int $t) {\n    for (int $i = 0; $i <= $a.length; $i++) {\n        if ($a[$i] == $t) {\n            return $i;\n        }\n    }\n    return -1;\n}`,
    `public static int $f(int[] $a, int $t) {\n    for (int $i = 0; $i < $a.length; $i++) {\n        if ($a[$i] == $t) {\n            return $i + 1;\n        }\n    }\n    return -1;\n}`,
  ],
};

const NAME_SETS = [
  { a: "arr", t: "target", i: "i", j: "j", m: "minIndex", k: "key", x: "temp", lo: "low", hi: "high", l: "left", r: "right", v: "minValue", f: "run" },
  { a: "data", t: "goal", i: "p", j: "q", m: "best", k: "item", x: "hold", lo: "start", hi: "end", l: "front", r: "back", v: "smallest", f: "process" },
  { a: "nums", t: "wanted", i: "x1", j: "x2", m: "pos", k: "cur", x: "t", lo: "a1", hi: "b1", l: "half1", r: "half2", v: "best", f: "work" },
  { a: "list", t: "find", i: "row", j: "col", m: "spot", k: "v", x: "swap", lo: "begin", hi: "last", l: "lft", r: "rgt", v: "low", f: "go" },
  { a: "values", t: "t", i: "n", j: "k2", m: "choice", k: "held", x: "z", lo: "L", hi: "R", l: "A", r: "B", v: "pick", f: "solve" },
];
export const NAME_STYLES = { plain: 0, renamed: 1 };
/* default method names that make the algorithm obvious (beginner only) */
export const PLAIN_METHOD = { linear: "linearSearch", binary: "binarySearch", selection: "selectionSort", insertion: "insertionSort", merge: "mergeSort" };
export function nameSet(index) {
  return NAME_SETS[index % NAME_SETS.length];
}
export const NAME_SET_COUNT = NAME_SETS.length;
export function applyNames(template, names) {
  // placeholders are $word; replace longest first (e.g. $lo before $l)
  const keys = Object.keys(names).sort((p, q) => q.length - p.length);
  return template.replace(/\$([a-z]+)/g, (_, k) => (names[k] !== undefined ? names[k] : "$" + k));
}
