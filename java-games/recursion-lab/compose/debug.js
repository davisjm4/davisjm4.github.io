import { num, str, bool, v, bin, call, If, Ret, Do, Print, Decl, method, program, run, len, sub, eq, idx, alen, mmax, not, renderJava, renderValue } from "./ir.js?v=compositional-v2";
import { makeQuestion, reject, int, pick, LEVEL, WORDS, quote, shuffle, traceWithError } from "./core.js?v=compositional-v2";
const MODE = "debug", TITLE = "Recursive Debugging";
const n = v("n"), s = v("s"), a = v("a"), i = v("i"), b = v("b"), e = v("e"), lo = v("lo"), hi = v("hi"), t = v("t"), mid = v("mid");
const Q = o => makeQuestion({ mode: MODE, modeTitle: TITLE, ...o });
const first = sub(s, num(0), num(1)), rest = sub(s, num(1));

/* Reference programs. knobs: { knob: [options...] } with option 0 correct.
   Each option: [label, irFragment | value, misconceptionId, studentWhy]. build(cfg) returns the method body. */
const P = [
  { id: "sum-to", levels: [0, 1, 2], name: "sumTo", ret: "int", params: [["int", "n"]], intent: "returns 1 + 2 + … + n (and 0 when n is 0)",
    spec: ([x]) => x * (x + 1) / 2, inputs: r => [int(3, 8, r)], tests: [[0], [1], [2], [5], [7]],
    knobs: { base: [true, false], cond: [bin("==", n, num(0)), bin("==", n, num(1)), bin("<", n, num(0))], val: [num(0), num(1), n], arg: [bin("-", n, num(1)), n, bin("+", n, num(1)), bin("-", n, num(2))], comb: [R => bin("+", n, R), R => bin("*", n, R), R => R, R => bin("+", R, num(1))] },
    build: (c, nm) => [...(c.base ? [If(c.cond, [Ret(c.val)])] : []), Ret(c.comb(call(nm, c.arg)))] },
  { id: "factorial", levels: [0, 1, 2], name: "factorial", ret: "int", params: [["int", "n"]], intent: "returns n! = 1 × 2 × … × n (and 1 when n is 0)",
    spec: ([x]) => { let p = 1; for (let k = 2; k <= x; k++) p *= k; return p; }, inputs: r => [int(3, 7, r)], tests: [[0], [1], [3], [5], [6]],
    knobs: { base: [true, false], cond: [bin("<=", n, num(1)), bin("==", n, num(1)), bin("<", n, num(1))], val: [num(1), num(0), n], arg: [bin("-", n, num(1)), n, bin("+", n, num(1))], comb: [R => bin("*", n, R), R => bin("+", n, R), R => R] },
    build: (c, nm) => [...(c.base ? [If(c.cond, [Ret(c.val)])] : []), Ret(c.comb(call(nm, c.arg)))] },
  { id: "power", levels: [0, 1, 2], name: "power", ret: "int", params: [["int", "b"], ["int", "e"]], intent: "returns b raised to the power e (e ≥ 0)",
    spec: ([x, y]) => x ** y, inputs: r => [int(2, 4, r), int(2, 5, r)], tests: [[2, 0], [2, 1], [3, 2], [2, 5], [5, 3]],
    knobs: { base: [true, false], cond: [bin("==", e, num(0)), bin("==", e, num(1)), bin("<", e, num(0))], val: [num(1), b, num(0)], arg: [bin("-", e, num(1)), e, bin("+", e, num(1))], comb: [R => bin("*", b, R), R => bin("+", b, R), R => bin("*", e, R)] },
    build: (c, nm) => [...(c.base ? [If(c.cond, [Ret(c.val)])] : []), Ret(c.comb(call(nm, b, c.arg)))] },
  { id: "count-digits", levels: [0, 1, 2], name: "countDigits", ret: "int", params: [["int", "n"]], intent: "returns how many digits n has (n ≥ 0)",
    spec: ([x]) => String(x).length, inputs: r => [int(100, 99999, r)], tests: [[0], [7], [10], [345], [90210]],
    knobs: { base: [true, false], cond: [bin("<", n, num(10)), bin("==", n, num(0)), bin("<", n, num(9))], val: [num(1), num(0), n], arg: [bin("/", n, num(10)), bin("%", n, num(10)), bin("-", n, num(10)), n], comb: [R => bin("+", num(1), R), R => R, R => bin("+", bin("%", n, num(10)), R)] },
    build: (c, nm) => [...(c.base ? [If(c.cond, [Ret(c.val)])] : []), Ret(c.comb(call(nm, c.arg)))] },
  { id: "count-down", levels: [0, 1, 2], name: "countDown", ret: "void", params: [["int", "n"]], intent: "prints n, n − 1, …, 1, each followed by a space", out: true,
    spec: ([x]) => Array.from({ length: x }, (_, k) => `${x - k} `).join(""), inputs: r => [int(3, 6, r)], tests: [[0], [1], [3], [5]],
    knobs: { base: [true, false], cond: [bin("==", n, num(0)), bin("<", n, num(0)), bin("==", n, num(1))], arg: [bin("-", n, num(1)), n, bin("+", n, num(1))], order: ["before", "after"] },
    build: (c, nm) => { const p = Print(bin("+", n, str(" "))), r = Do(call(nm, c.arg)); return [...(c.base ? [If(c.cond, [Ret()])] : []), ...(c.order === "before" ? [p, r] : [r, p])]; } },
  { id: "digit-sum", levels: [1, 2], name: "digitSum", ret: "int", params: [["int", "n"]], intent: "returns the sum of the digits of n (n ≥ 0)",
    spec: ([x]) => String(x).split("").reduce((p, d) => p + +d, 0), inputs: r => [int(100, 99999, r)], tests: [[0], [8], [19], [405], [99999]],
    knobs: { cond: [bin("<", n, num(10)), bin("<", n, num(1)), bin("==", n, num(10))], val: [n, num(0), num(1)], arg: [bin("/", n, num(10)), bin("%", n, num(10)), bin("-", n, num(1))], comb: [R => bin("+", bin("%", n, num(10)), R), R => bin("+", bin("/", n, num(10)), R), R => bin("+", num(1), R)] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, c.arg)))] },
  { id: "reverse", levels: [1, 2], name: "reverse", ret: "String", params: [["String", "s"]], intent: "returns s with its characters in reverse order", str: true,
    spec: ([x]) => [...x].reverse().join(""), inputs: r => [pick(WORDS.Intermediate, r)], tests: [[""], ["A"], ["AB"], ["CODE"], ["LEMON"]],
    knobs: { cond: [bin("<=", len(s), num(1)), bin("==", len(s), num(1)), bin("<=", len(s), num(0))], val: [s, str(""), first], arg: [rest, sub(s, num(0)), sub(s, num(2)), sub(s, num(0), bin("-", len(s), num(1)))], comb: [R => bin("+", R, first), R => bin("+", first, R), R => R] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, c.arg)))] },
  { id: "array-sum", levels: [1, 2], name: "arraySum", ret: "int", params: [["int[]", "a"], ["int", "i"]], intent: "returns the sum of a[i], a[i + 1], …, a[a.length − 1]", arr: true,
    spec: ([A, k]) => A.slice(k).reduce((p, x) => p + x, 0), inputs: r => [Array.from({ length: int(4, 6, r) }, () => int(-2, 9, r)), 0], tests: [[[], 0], [[4], 0], [[1, 2, 3], 0], [[5, -2, 7, 1], 0], [[3, 1, 4, 1, 5], 2]],
    knobs: { cond: [bin("==", i, alen(a)), bin("==", i, bin("-", alen(a), num(1))), bin(">", i, alen(a))], val: [num(0), idx(a, i), num(1)], arg: [bin("+", i, num(1)), i, bin("+", i, num(2))], comb: [R => bin("+", idx(a, i), R), R => R, R => bin("+", i, R)] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, a, c.arg)))] },
  { id: "array-max", levels: [1, 2], name: "arrayMax", ret: "int", params: [["int[]", "a"], ["int", "i"]], intent: "returns the largest value among a[i] … a[a.length − 1] (the array is not empty)", arr: true,
    spec: ([A, k]) => Math.max(...A.slice(k)), inputs: r => [Array.from({ length: int(4, 6, r) }, () => int(-9, 9, r)), 0], tests: [[[4], 0], [[-3, -7, -1], 0], [[2, 9, 4], 0], [[-5, -2], 0], [[1, 8, 3, 9, 2], 1]],
    knobs: { cond: [bin("==", i, bin("-", alen(a), num(1))), bin("==", i, alen(a)), bin("==", i, num(0))], val: [idx(a, i), num(0), num(-1)], arg: [bin("+", i, num(1)), i, bin("-", i, num(1))], comb: [R => mmax(idx(a, i), R), R => { const x = { k: "math", fn: "min", a: idx(a, i), b: R }; return x; }, R => R] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, a, c.arg)))] },
  { id: "contains", levels: [1, 2], name: "contains", ret: "boolean", params: [["int[]", "a"], ["int", "i"], ["int", "t"]], intent: "returns true if t appears in a at index i or later", arr: true,
    spec: ([A, k, x]) => A.slice(k).includes(x), inputs: r => { const A = Array.from({ length: int(4, 6, r) }, () => int(0, 9, r)); return [A, 0, r() < 0.5 ? pick(A, r) : 10 + int(0, 5, r)]; }, tests: [[[], 0, 1], [[3], 0, 3], [[1, 2, 3], 0, 3], [[1, 2, 3], 0, 5], [[4, 4, 2], 0, 4], [[7, 8], 0, 7]],
    knobs: { cond: [bin("==", i, alen(a)), bin("==", i, bin("-", alen(a), num(1))), bin(">", i, alen(a))], val: [bool(false), bool(true)], arg: [bin("+", i, num(1)), i], comb: [R => bin("||", bin("==", idx(a, i), t), R), R => bin("&&", bin("==", idx(a, i), t), R), R => R] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, a, c.arg, t)))] },
  { id: "count-letter", levels: [1, 2], name: "countA", ret: "int", params: [["String", "s"]], intent: "returns how many times \"A\" appears in s", str: true,
    spec: ([x]) => [...x].filter(ch => ch === "A").length, inputs: r => [pick(["BANANA", "JAVA", "PANDA", "ALPACA", "CABBAGE", "SALAD", "AGAIN", "MANGO"], r)], tests: [[""], ["A"], ["B"], ["ABA"], ["BANANA"], ["CODE"]],
    knobs: { cond: [bin("==", len(s), num(0)), bin("==", len(s), num(1)), bin("<", len(s), num(0))], val: [num(0), num(1)], arg: [rest, sub(s, num(0)), sub(s, num(2))], comb: [R => ({ k: "tern", c: eq(first, str("A")), a: bin("+", num(1), R), b: R }), R => bin("+", num(1), R), R => ({ k: "tern", c: eq(first, str("A")), a: R, b: bin("+", num(1), R) })] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), Ret(c.comb(call(nm, c.arg)))] },
  { id: "binary-search", levels: [2], name: "search", ret: "int", params: [["int[]", "a"], ["int", "lo"], ["int", "hi"], ["int", "t"]], intent: "returns an index of t in the sorted array a between lo and hi, or -1 if t is absent", arr: true,
    spec: null /* any valid index */, check: ([A, l, h, x], out) => out === -1 ? !A.slice(l, h + 1).includes(x) : A[out] === x && out >= l && out <= h,
    inputs: r => { const A = []; let x = int(0, 3, r); for (let k = 0; k < int(6, 9, r); k++) { x += int(1, 4, r); A.push(x); } return [A, 0, A.length - 1, r() < 0.6 ? pick(A, r) : A[int(0, A.length - 2, r)] + 1 < A[A.length - 1] && !A.includes(A[0] + 1) ? A[0] + 1 : A.at(-1) + 3]; },
    tests: [[[], 0, -1, 3], [[5], 0, 0, 5], [[5], 0, 0, 4], [[1, 3, 5, 7, 9], 0, 4, 9], [[1, 3, 5, 7, 9], 0, 4, 1], [[1, 3, 5, 7, 9], 0, 4, 4], [[2, 4, 6, 8], 0, 3, 8], [[2, 4, 6, 8], 0, 3, 5]],
    knobs: { cond: [bin(">", lo, hi), bin(">=", lo, hi), bin("==", lo, hi)], left: [bin("-", mid, num(1)), mid, bin("+", mid, num(1))], right: [bin("+", mid, num(1)), mid], dir: [bin("<", t, idx(a, mid)), bin(">", t, idx(a, mid))] },
    build: (c, nm) => [If(c.cond, [Ret(num(-1))]), Decl("int", "mid", bin("/", bin("+", lo, hi), num(2))), If(bin("==", idx(a, mid), t), [Ret(mid)]), If(c.dir, [Ret(call(nm, a, lo, c.left, t))]), Ret(call(nm, a, c.right, hi, t))] },
  { id: "palindrome", levels: [2], name: "isPalindrome", ret: "boolean", params: [["String", "s"]], intent: "returns true if s reads the same forwards and backwards", str: true,
    spec: ([x]) => x === [...x].reverse().join(""), inputs: r => [pick(["LEVEL", "RADAR", "ROTOR", "REFER", "NOON", "ABBA", "LEVER", "ROBOT", "TENET", "STATS", "CIVIC", "RACECAR"], r)], tests: [[""], ["A"], ["AB"], ["AA"], ["ABA"], ["ABCA"], ["NOON"], ["LEVEL"], ["LEVER"]],
    knobs: { cond: [bin("<=", len(s), num(1)), bin("==", len(s), num(1)), bin("==", len(s), num(0))], val: [bool(true), bool(false)], cmp: [R => not(eq(first, sub(s, bin("-", len(s), num(1))))), R => eq(first, sub(s, bin("-", len(s), num(1))))], arg: [sub(s, num(1), bin("-", len(s), num(1))), sub(s, num(1)), sub(s, num(1), len(s))] },
    build: (c, nm) => [If(c.cond, [Ret(c.val)]), If(c.cmp(), [Ret(bool(false))]), Ret(call(nm, c.arg))] },
];
const MIS = { base: "missing-base-case", cond: "wrong-base-condition", val: "wrong-base-value", arg: "wrong-recursive-argument", comb: "wrong-return-combination", order: "wrong-call-placement", left: "wrong-search-bound", right: "wrong-search-bound", dir: "wrong-search-direction", cmp: "inverted-comparison" };

function cfgOf(p, choice) { const c = {}; for (const [k, opts] of Object.entries(p.knobs)) c[k] = opts[choice[k] ?? 0]; return c; }
function build(p, choice, nm = p.name) { return program([method(nm, p.ret, p.params, p.build(cfgOf(p, choice), nm))], nm); }
function behaviour(p, prog, args, nm) {
  const res = run(prog, nm, structuredClone(args), { maxDepth: 400, maxSteps: 60000 });
  if (res.error) return { kind: "error", error: res.error === "Timeout" ? "StackOverflowError" : res.error };
  return p.out ? { kind: "out", value: res.out } : { kind: "value", value: res.value };
}
function correct(p, args, beh) {
  if (beh.kind === "error") return false;
  if (p.check) return p.check(args, beh.value);
  const want = p.spec(args); return p.out ? beh.value === want : beh.value === want;
}
const passesAll = (p, prog, nm, extra = []) => [...p.tests, ...extra].every(x => correct(p, x, behaviour(p, prog, x, nm)));
const describe = (p, beh) => beh.kind === "error" ? `Throws ${beh.error}` : p.out ? (beh.value === "" ? "Prints nothing" : `Prints ${beh.value.trim()}`) : `Returns ${p.str && typeof beh.value === "string" ? quote(beh.value) : renderValue(beh.value)}`;
/** Line diff → instruction text. */
export function editText(fromProg, toProg) {
  const A = renderJava(fromProg).split("\n"), B = renderJava(toProg).split("\n");
  let x = 0; while (x < A.length && x < B.length && A[x] === B[x]) x++;
  let ya = A.length - 1, yb = B.length - 1; while (ya >= x && yb >= x && A[ya] === B[yb]) { ya--; yb--; }
  if (x > ya && x > yb) throw Error("editText: programs are identical");
  const removed = A.slice(x, ya + 1).map(l => l.trim()), added = B.slice(x, yb + 1).map(l => l.trim());
  const j = l => l.join(" ").replace(/\{ /g, "{ ").replace(/ \}/g, " }");
  if (removed.length === 1 && added.length === 1) return `Change ${removed[0]} to ${added[0]}`;
  if (!removed.length) return `Insert ${j(added)} ${x <= 1 ? "at the start of the method" : `after ${A[x - 1].trim()}`}`;
  if (!added.length) return `Delete ${j(removed)}`;
  if (removed.length === 2 && added.length === 2 && removed[0] === added[1] && removed[1] === added[0]) return `Move ${removed[1]} above ${removed[0]}`;
  return `Replace ${j(removed)} with ${j(added)}`;
}
const statementLines = prog => renderJava(prog).split("\n").map(l => l.trim()).filter(l => l !== "}" && l !== "} else {");

export const debugFamily = { id: "knob-bug", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], p = pick(P.filter(x => x.levels.includes(L)), r), nm = p.name;
  // choose a bug: one knob set to a wrong option, never the "base" knob outside Beginner/Intermediate for array programs
  const bugs = []; for (const [k, opts] of Object.entries(p.knobs)) for (let o = 1; o < opts.length; o++) bugs.push({ [k]: o, _k: k });
  const bug = pick(bugs, r), knob = bug._k; delete bug._k;
  const good = build(p, {}), buggy = build(p, bug);
  if (!passesAll(p, good, nm)) throw Error(`reference ${p.id} fails its spec`);
  if (passesAll(p, buggy, nm)) reject("bug is equivalent to correct code");
  // the shown call must reveal the bug (except for the "reveal" question)
  const askPool = L === 0 ? ["fix", "fix", "symptom", "line"] : L === 1 ? ["fix", "symptom", "line", "reveal"] : ["fix", "symptom", "reveal", "reveal", "line"];
  const ask = pick(askPool, r);
  const args = p.inputs(r), bb = behaviour(p, buggy, args, nm), gb = behaviour(p, good, args, nm);
  if (ask !== "reveal" && correct(p, args, bb)) reject("shown call does not reveal the bug");
  const argText = args.map((x, k) => Array.isArray(x) ? "a" : p.params[k][0] === "String" ? quote(x) : String(x)).join(", "), ct = `${nm}(${argText})`;
  const arrNote = p.arr ? `int[] a = ${renderValue(args[0])};  ` : "";
  const header = `// Intended: ${nm} ${p.intent}.`;
  const code = `${renderJava(buggy)}\n${header}${ask !== "reveal" ? `\n// ${arrNote}call: ${ct}` : ""}`;
  const misId = MIS[knob], common = { r, difficulty: d, family: `debug-${ask}`, task: "debug", prog: buggy, code, reasoning: `knob-bug:${p.id}:${knob}:${ask}`, data: { program: p.id, knob, option: bug[knob] }, trace: [] };
  const jvmBase = { method: nm, programId: p.id, intent: p.intent, tests: p.tests, out: !!p.out };
  const resGood = run(good, nm, structuredClone(args), { maxDepth: 400 }), resBad = run(buggy, nm, structuredClone(args), { maxDepth: 400 });
  common.callCount = resGood.calls; common.callDepth = resGood.maxDepth;
  common.trace = ask === "reveal" ? ["The trace depends on the input; compare each call with the intended behaviour."] : [`Buggy code, ${ct}:`, ...traceWithError(resBad), ...(p.out && !resBad.error ? [`output: ${resBad.out.trim() || "(nothing)"}`] : [])];

  if (ask === "fix") {
    const fixText = editText(buggy, good), cands = [];
    for (const [k, opts] of Object.entries(p.knobs)) for (let o = 0; o < opts.length; o++) {
      const choice = { ...bug, [k]: o }, prog = build(p, choice);
      if (renderJava(prog) === renderJava(buggy) || renderJava(prog) === renderJava(good)) continue;
      if (passesAll(p, prog, nm, [args])) continue;      // a working edit is not a wrong fix      // a working edit is not a wrong fix
      const text = editText(buggy, prog); if (text === fixText) continue;
      cands.push({ value: text, mis: k === knob ? "partial-fix" : `fixes-${MIS[k]}`, why: `After that change, ${describeFail(p, prog, nm, args)}.`, choice });
    }
    if (cands.length < 3) reject("not enough wrong fixes");
    const D = shuffle(cands, r).slice(0, 3);
    return Q({ ...common, prompt: `Which single change makes ${nm} work as intended?`, answer: fixText, distractors: D,
      explanation: `Currently ${ct} ${lc(describe(p, bb))}, but it should ${p.out ? `print ${String(p.spec(args)).trim() || "nothing"}` : `return ${expected(p, args, gb)}`}. ${fixText.replace(/^Change/, "Changing").replace(/^Insert/, "Inserting").replace(/^Delete/, "Deleting").replace(/^Move/, "Moving").replace(/^Replace/, "Replacing")} fixes the ${misId.replaceAll("-", " ")}.`,
      jvm: { ...jvmBase, observe: "fixChoice", setupArgs: args, candidates: Object.fromEntries([[fixText, renderJava(good)], ...D.map(x => [x.value, renderJava(build(p, x.choice))])]) } });
  }
  if (ask === "symptom") {
    const answer = describe(p, bb), seen = new Set([answer]), D = [];
    const add = (beh, mis, why) => { const t = describe(p, beh); if (!seen.has(t)) { seen.add(t); D.push({ value: t, mis, why }); } };
    add(gb, "bug-not-noticed", `That is the intended result; trace the code as written.`);
    for (const [k, opts] of shuffle(Object.entries(p.knobs), r)) for (let o = 0; o < opts.length; o++) { if (k === knob && o === bug[k]) continue; add(behaviour(p, build(p, { ...bug, [k]: o }), args, nm), `misreads-${k}`, `That would happen with different code; re-read the ${k === "cond" ? "base condition" : k === "val" ? "base-case return value" : k === "arg" ? "recursive argument" : "highlighted part"}.`); }
    for (const err of ["StackOverflowError", "ArrayIndexOutOfBoundsException", "StringIndexOutOfBoundsException"]) if (D.length < 3 && (p.arr || err !== "ArrayIndexOutOfBoundsException") && (p.str || err !== "StringIndexOutOfBoundsException")) add({ kind: "error", error: err }, "wrong-exception", bb.kind === "error" ? `Trace which statement fails first.` : `The calls stay within bounds and reach a base case.`);
    return Q({ ...common, prompt: `What actually happens when ${ct} runs?`, answer, distractors: D,
      explanation: `${bb.kind === "error" ? `${errorWhy(bb.error, knob)}` : `Tracing the code as written gives ${bb.kind === "out" ? `"${bb.value.trim()}"` : renderValue(bb.value)}`}; the intended result is ${p.out ? `"${String(p.spec(args)).trim()}"` : expected(p, args, gb)}.`,
      jvm: { ...jvmBase, observe: "symptom", buggy: renderJava(buggy), setupArgs: args } });
  }
  if (ask === "line") {
    const bad = renderJava(buggy).split("\n"), goodL = renderJava(good).split("\n");
    if (bad.length !== goodL.length) reject("line question needs a one-line bug");
    const diff = bad.map((l, k) => l !== goodL[k] ? k : -1).filter(k => k >= 0); if (diff.length !== 1) reject("multi-line bug");
    const answer = bad[diff[0]].trim(), others = shuffle(statementLines(buggy).filter(l => l !== answer), r);
    if (others.length < 3) reject("few lines");
    return Q({ ...common, prompt: `${ct} gives the wrong result. Which line contains the error?`, answer, distractors: others.slice(0, 3).map(l => ({ value: l, mis: "wrong-line-blamed", why: "That line is correct for the intended behaviour." })),
      explanation: `${ct} ${lc(describe(p, bb))}. The faulty line is ${answer}; it should be ${goodL[diff[0]].trim()}.`, jvm: { ...jvmBase, observe: "faultyLine", buggy: renderJava(buggy), good: renderJava(good), setupArgs: args } });
  }
  // reveal: which input exposes the bug?
  const revealing = [], hidden = [], seen = new Set();
  const pool = [...p.tests, ...Array.from({ length: 30 }, () => p.inputs(r))];
  for (const x of pool) { const key = JSON.stringify(x); if (seen.has(key)) continue; seen.add(key); (correct(p, x, behaviour(p, buggy, x, nm)) ? hidden : revealing).push(x); }
  const flip = revealing.length >= 3 && hidden.length >= 1 && r() < 0.3;
  if (!flip && (revealing.length < 1 || hidden.length < 3)) reject("cannot build reveal set");
  const pickArgs = flip ? hidden[0] : pick(revealing, r), others = shuffle(flip ? revealing : hidden, r).slice(0, 3);
  const show = x => `${nm}(${x.map((y, k) => Array.isArray(y) ? renderValue(y) : p.params[k][0] === "String" ? quote(y) : String(y)).join(", ")})`;
  const D = others.map(x => ({ value: show(x), mis: flip ? "misses-bug-trigger" : "assumes-bug-everywhere", why: `${show(x)} ${lc(describe(p, behaviour(p, buggy, x, nm)))}, which ${flip ? "is wrong" : "is the intended result"}.` }));
  return Q({ ...common, prompt: flip ? `Three of these calls give a wrong result or throw an exception. Which call still works as intended?` : `Three of these calls happen to work as intended. Which call reveals the bug?`, answer: show(pickArgs), distractors: D,
    explanation: `${show(pickArgs)} ${lc(describe(p, behaviour(p, buggy, pickArgs, nm)))}${flip ? " as intended" : ` instead of the intended ${p.out ? `output "${String(p.spec(pickArgs)).trim()}"` : expected(p, pickArgs, behaviour(p, good, pickArgs, nm))}`}. The ${misId.replaceAll("-", " ")} only matters for some inputs.`,
    jvm: { ...jvmBase, observe: "revealChoice", buggy: renderJava(buggy), wantCorrect: flip, candidates: Object.fromEntries([pickArgs, ...others].map(x => [show(x), x])) } });
} };
const lc = s => s.charAt(0).toLowerCase() + s.slice(1);
const expected = (p, args, gb) => p.spec ? (p.str && typeof p.spec(args) === "string" ? quote(p.spec(args)) : renderValue(p.spec(args))) : renderValue(gb.value);
function describeFail(p, prog, nm, args) {
  for (const x of [args, ...p.tests]) { const beh = behaviour(p, prog, x, nm); if (!correct(p, x, beh)) { const call = `${nm}(${x.map((y, k) => Array.isArray(y) ? renderValue(y) : p.params[k][0] === "String" ? quote(y) : String(y)).join(", ")})`; return `${call} ${lc(describe(p, beh))}${p.spec && beh.kind !== "error" ? ` instead of ${p.out ? `printing ${String(p.spec(x)).trim() || "nothing"}` : expected(p, x, beh)}` : ""}`; } }
  return "the method is still incorrect";
}
function errorWhy(err, knob) {
  if (err === "StackOverflowError") return knob === "base" ? "Without a base case the calls never stop, and the call stack overflows (StackOverflowError)" : "The recursive calls never reach the base case, so the call stack overflows (StackOverflowError)";
  return `An index goes out of range (${err})`;
}
export const PROGRAMS = P;
export default [debugFamily];
