// Machine-check of the 7 fixed legacy debugging items: the shown code must fail its intent,
// and the keyed fix (applied by hand here) must satisfy it on every test input.
import { harness, parseObs } from "./jvm/instrument.mjs"; import { runJava } from "./jvm/jvm.mjs";
const items = [
  { id: "missing-base-case", m: "sum", bad: "static int sum(int n) { return n + sum(n - 1); }", good: "static int sum(int n) { if (n == 0) return 0; return n + sum(n - 1); }", calls: ["sum(0)", "sum(4)"], want: ["0", "10"] },
  { id: "nonprogressing-argument", m: "count", bad: "static int count(int n) { if (n == 0) return 0; return 1 + count(n); }", good: "static int count(int n) { if (n == 0) return 0; return 1 + count(n - 1); }", calls: ["count(0)", "count(5)"], want: ["0", "5"] },
  { id: "wrong-recursive-subproblem", m: "reverse", bad: 'static String reverse(String s) { if (s.length() <= 1) return s; return reverse(s.substring(0, s.length()-1)) + s.substring(0,1); }', good: 'static String reverse(String s) { if (s.length() <= 1) return s; return reverse(s.substring(1)) + s.substring(0, 1); }', calls: ['reverse("AB")', 'reverse("CODE")'], want: ["BA", "EDOC"] },
  { id: "array-boundary", m: "find", bad: "static int find(int[] a, int i, int x) { if (i > a.length) return -1; if (a[i] == x) return i; return find(a, i + 1, x); }", good: "static int find(int[] a, int i, int x) { if (i >= a.length) return -1; if (a[i] == x) return i; return find(a, i + 1, x); }", calls: ["find(new int[]{1,2,3}, 0, 9)", "find(new int[]{1,2,3}, 0, 2)"], want: ["-1", "1"] },
  { id: "wrong-return-combination", m: "power", bad: "static int power(int n) { if (n == 0) return 1; return 2 + power(n - 1); }", good: "static int power(int n) { if (n == 0) return 1; return 2 * power(n - 1); }", calls: ["power(0)", "power(5)"], want: ["1", "32"] },
  { id: "negative-array-edge", m: "max", bad: "static int max(int[] a, int i) { if (i == a.length) return 0; return Math.max(a[i], max(a, i + 1)); }", good: "static int max(int[] a, int i) { if (i == a.length - 1) return a[i]; return Math.max(a[i], max(a, i + 1)); }", calls: ["max(new int[]{-5,-2,-9}, 0)", "max(new int[]{3,7,1}, 0)"], want: ["-2", "7"] },
  { id: "short-circuit-condition", m: "contains", bad: "static boolean contains(int[] a, int i, int x) { if (i == a.length) return false; return a[i] == x && contains(a, i + 1, x); }", good: "static boolean contains(int[] a, int i, int x) { if (i == a.length) return false; return a[i] == x || contains(a, i + 1, x); }", calls: ["contains(new int[]{4,5,6}, 0, 5)", "contains(new int[]{4,5,6}, 0, 9)"], want: ["true", "false"] },
];
const progs = []; let k = 0;
for (const it of items) for (const [ver, code] of [["bad", it.bad], ["good", it.good]]) it.calls.forEach((c, ci) => { const name = `L${k++}`; progs.push({ name, source: harness(name, code, { method: it.m, call: c }) }); (it.runs ??= []).push({ name, ver, ci }); });
const res = runJava(progs); let pass = 0;
for (const it of items) { const ok = v => it.runs.filter(x => x.ver === v).map(x => { const o = parseObs(res.get(x.name).stdout); return !o.exc && o.ret === it.want[x.ci]; });
  const goodAll = ok("good").every(Boolean), badSome = ok("bad").some(x => !x); console.log(`${it.id}: fixed passes=${goodAll}, shown code fails=${badSome}`); if (goodAll && badSome) pass++; }
console.log(`${pass}/${items.length} legacy debugging items verified`); if (pass !== items.length) process.exit(1);
