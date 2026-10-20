/* Real-JVM verification (needs `java` 11+ with the compiler module; skipped with a clear notice if absent).
   Part 1: instrumented Java implementations of the documented algorithms are run on random
           arrays; their results/counters must equal the JS simulators.
   Part 2: every distinct Java snippet the game can display is compiled by javac (in-memory). */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { section, ok, eq, summary, mulberry } from "./harness.mjs";
import * as A from "../engine/algorithms.js";
import { generate, MODE_IDS, DIFFICULTIES } from "../engine/generator.js";

console.log("jvm.test.mjs");
const have = spawnSync("java", ["-version"]).status === 0;
if (!have) { console.log("  (java not found — JVM tests SKIPPED)"); process.exit(0); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ssl-"));
const arrLit = (a) => `new int[]{${a.join(",")}}`;

await section("Part 1: real Java algorithms match the simulators (600 random arrays)", () => {
  const r = mulberry(77);
  const cases = [];
  for (let i = 0; i < 600; i++) {
    const n = Math.floor(r() * 16);
    const dup = r() < 0.5;
    const a = Array.from({ length: n }, () => (dup ? Math.floor(r() * 6) : Math.floor(r() * 60)) - 10);
    const sorted = a.slice().sort((x, y) => x - y);
    const target = r() < 0.7 && n ? sorted[Math.floor(r() * n)] : Math.floor(r() * 70) - 12;
    cases.push({ a, sorted, target });
  }
  const java = `
import java.util.*;
public class Harness {
  static int cmp, mv, calls, merges;
  static int linear(int[] a, int t) { cmp = 0; for (int i = 0; i < a.length; i++) { cmp++; if (a[i] == t) return i; } return -1; }
  static int binary(int[] a, int t, boolean upper) { int low = 0, high = a.length - 1; cmp = 0;
    while (low <= high) { int mid = upper ? (low + high + 1) / 2 : (low + high) / 2; cmp++;
      if (a[mid] == t) return mid; else if (a[mid] < t) low = mid + 1; else high = mid - 1; } return -1; }
  static int[] selection(int[] in) { int[] a = in.clone(); cmp = 0; mv = 0; int eff = 0;
    for (int i = 0; i < a.length - 1; i++) { int m = i; for (int j = i + 1; j < a.length; j++) { cmp++; if (a[j] < a[m]) m = j; }
      int tmp = a[i]; a[i] = a[m]; a[m] = tmp; mv++; if (m != i) eff++; } calls = eff; return a; }
  static int[] insertion(int[] in, int variant) { int[] a = in.clone(); cmp = 0; mv = 0;
    for (int i = 1; i < a.length; i++) { int key = a[i]; int j = i - 1;
      while (variant == 1 ? (j > 0) : (j >= 0)) { cmp++; boolean go = variant == 2 ? a[j] >= key : variant == 3 ? a[j] < key : a[j] > key; if (!go) break; a[j + 1] = a[j]; mv++; j--; }
      a[j + 1] = key; } return a; }
  static void mergeSort(int[] a, int lo, int hi) { calls++; if (lo >= hi) return; int mid = (lo + hi) / 2; mergeSort(a, lo, mid); mergeSort(a, mid + 1, hi); merge(a, lo, mid, hi); merges++; }
  static void merge(int[] a, int lo, int mid, int hi) { int[] temp = new int[hi - lo + 1]; int i = lo, j = mid + 1, k = 0;
    while (i <= mid && j <= hi) { cmp++; if (a[i] <= a[j]) temp[k++] = a[i++]; else temp[k++] = a[j++]; }
    while (i <= mid) temp[k++] = a[i++]; while (j <= hi) temp[k++] = a[j++];
    for (k = 0; k < temp.length; k++) a[lo + k] = temp[k]; }
  static String s(int[] a) { return Arrays.toString(a).replace(" ", ""); }
  public static void main(String[] x) {
    int[][] arrs = { ${cases.map((c) => arrLit(c.a)).join(",")} };
    int[][] sorted = { ${cases.map((c) => arrLit(c.sorted)).join(",")} };
    int[] targets = { ${cases.map((c) => c.target).join(",")} };
    for (int c = 0; c < arrs.length; c++) {
      int[] a = arrs[c], so = sorted[c]; int t = targets[c];
      int li = linear(a, t); int lc = cmp;
      int bi = binary(so, t, false); int bc = cmp; int bu = binary(so, t, true);
      int[] sel = selection(a); int sc = cmp, ss = mv, se = calls;
      int[] ins = insertion(a, 0); int ic = cmp, ish = mv;
      int[] i1 = insertion(a, 1), i2 = insertion(a, 2); int i2s = mv, i3s; int[] i3 = insertion(a, 3);
      int[] m = a.clone(); cmp = 0; calls = 0; merges = 0; if (m.length > 0) mergeSort(m, 0, m.length - 1);
      System.out.println(String.join("|", "" + li, "" + lc, "" + bi, "" + bc, "" + bu, s(sel), "" + sc, "" + ss, "" + se, s(ins), "" + ic, "" + ish, s(i1), s(i2), "" + i2s, s(i3), s(m), "" + cmp, "" + calls, "" + merges));
    }
  }
}`;
  const f = path.join(tmp, "Harness.java");
  fs.writeFileSync(f, java);
  const out = execFileSync("java", [f], { encoding: "utf8", maxBuffer: 1 << 26 }).trim().split("\n");
  eq(out.length, cases.length, "one result line per case");
  const S = (a) => "[" + a.join(",") + "]";
  cases.forEach((c, i) => {
    const l = A.linearSearch(c.a, c.target), b = A.binarySearch(c.sorted, c.target), bu = A.binarySearch(c.sorted, c.target, { bug: "mid-hi" });
    const sel = A.selectionSort(c.a), ins = A.insertionSort(c.a), m = A.mergeSort(c.a);
    const exp = [l.index, l.comparisons, b.index, b.probes, bu.index, S(sel.result), sel.comparisons, sel.swaps, sel.effectiveSwaps, S(ins.result), ins.comparisons, ins.shifts, S(A.insertionSort(c.a, "j>0").result), S(A.insertionSort(c.a, "ge").result), A.insertionSort(c.a, "ge").shifts, S(A.insertionSort(c.a, "lt").result), S(m.result), m.comparisons, c.a.length ? m.calls : 0, m.merges].join("|");
    eq(out[i], exp, `case ${i} ${S(c.a)} target ${c.target}`);
  });
});

await section("Part 2: every distinct displayed Java snippet compiles", () => {
  const seen = new Map();
  for (const mode of MODE_IDS) for (const d of DIFFICULTIES) for (let s = 1; s <= 400; s++) {
    const ch = generate(mode, d, s * 97 + 5);
    if (!ch.code) continue;
    const key = ch.codeKind + "|" + ch.code.replace(/-?\d+/g, "#");
    if (!seen.has(key)) seen.set(key, ch);
  }
  const wrap = (ch, i) => {
    let code = ch.code, body = "";
    if (ch.codeKind === "methods") {
      const m = code.match(/\n\n(int\[\] \w+ = [\s\S]*)$/);
      if (m) { code = code.slice(0, m.index); body = m[1]; }
      return `class C${i} {\n${code}\nstatic void run() {\n${body}\n}\n}`;
    }
    if (ch.codeKind === "int-fragment") return `class C${i} {\nstatic int run(int[] numbers, int target, int low, int high) {\n${code}\nreturn -1;\n}\n}`;
    if (ch.codeKind === "int-statements") return `class C${i} {\nstatic int run() {\n${code}\nreturn -1;\n}\n}`;
    return `class C${i} {\nstatic void run() {\n${code}\n}\n}`;
  };
  const list = [...seen.values()];
  const src = `public class All { public static void main(String[] a) { System.out.println("compiled"); } }\n` + list.map(wrap).join("\n");
  const f = path.join(tmp, "All.java");
  fs.writeFileSync(f, src);
  const res = spawnSync("java", [f], { encoding: "utf8" });
  if (res.status !== 0) console.log(res.stderr.slice(0, 3000));
  ok(res.status === 0 && res.stdout.includes("compiled"), "all snippets compile");
  console.log(`    ${list.length} distinct snippet shapes compiled`);
  fs.writeFileSync(new URL("./results/jvm-summary.json", import.meta.url), JSON.stringify({ snippetShapesCompiled: list.length, randomArraysChecked: 600 }, null, 2));
});
const { checks, sections } = summary();
console.log(`jvm.test.mjs: ${checks} checks passed in ${sections.length} sections`);
