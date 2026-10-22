import { num, str, v, bin, call, If, Ret, Do, Print, Decl, method, program, run, len, sub, eq, not, tern } from "./ir.js?v=compositional-v1";
import { makeQuestion, reject, int, pick, LEVEL, NAMES, WORDS, fmtList, exec, traceLines, quote } from "./core.js?v=compositional-v1";
const MODE = "output", TITLE = "Output & Strings";
const n = v("n"), s = v("s"), Q = o => makeQuestion({ mode: MODE, modeTitle: TITLE, ...o });
const ok = res => !res.error;
const first = sub(s, num(0), num(1)), rest = sub(s, num(1)), L1 = bin("-", len(s), num(1));

// ---- numeric output before / after / around the call ----
const PA = [
  { id: "pre", levels: [0, 1, 2], pre: true, post: false },
  { id: "post", levels: [0, 1, 2], pre: false, post: true },
  { id: "surround", levels: [0, 1, 2], pre: true, post: true },
  { id: "surround-base-marker", levels: [1, 2], pre: true, post: true, marker: true },
  { id: "pre-post-different", levels: [1, 2], pre: true, post: true, postExpr: true },
];
export const printAroundCall = { id: "print-around-call", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], P = pick(PA.filter(x => x.levels.includes(L)), r), name = pick(NAMES.int, r), step = int(1, L === 0 ? 1 : 2, r);
  const k = L === 2 ? int(2, 3, r) : 1;
  const preE = bin("+", n, str(" ")), postE = P.postExpr ? bin("+", bin("*", n, num(k === 1 ? 10 : k)), str(" ")) : bin("+", n, str(" "));
  const mk = (pre, post, marker = P.marker) => program([method(name, "void", [["int", "n"]], [If(bin("<=", n, num(0)), [...(marker ? [Print(str("* "))] : []), Ret()]), ...(pre ? [Print(preE)] : []), Do(call(name, bin("-", n, num(step)))), ...(post ? [Print(postE)] : [])])], name);
  const prog = mk(P.pre, P.post), start = int(3, [4, 6, 7][L], r), res = exec(prog, name, [start]);
  const basePrints = run(program([method(name, "void", [["int", "n"]], [If(bin("<=", n, num(0)), [...(P.marker ? [Print(str("* "))] : []), Print(P.pre ? preE : postE), Ret()]), ...(P.pre ? [Print(preE)] : []), Do(call(name, bin("-", n, num(step)))), ...(P.post ? [Print(postE)] : [])])], name), name, [start]);
  const allPre = run(mk(true, false), name, [start]), allPost = run(mk(false, true), name, [start]), swapped = run(mk(P.post, P.pre), name, [start]), noMarker = run(mk(P.pre, P.post, false), name, [start]);
  const out = res.out.trim(), toks = out.split(" ");
  const ask = toks.length >= 5 && L > 0 ? pick(["output", "output", "kth"], r) : "output";
  const common = { r, difficulty: d, family: "print-around-call", prog, callNote: `call: ${name}(${start})`, trace: traceLines(res, { showReturns: false }).concat(`output: ${out}`), callCount: res.calls, callDepth: res.maxDepth, reasoning: `print-around-call:${P.id}:${ask}`, data: { start } };
  const why = { pre: "A print above the recursive call runs on the way down, before deeper calls.", post: "A print below the recursive call runs only after the deeper calls finish, on the way back up." };
  if (ask === "output") return Q({ ...common, prompt: `What is printed by ${name}(${start})?`, answer: out,
    distractors: [{ value: allPre.out.trim(), mis: "all-prints-before-call", why: why.post }, { value: allPost.out.trim(), mis: "all-prints-after-call", why: why.pre }, { value: swapped.out.trim(), mis: "pre-post-swapped", why: "Check which print is above the recursive call and which is below." },
      P.marker && { value: noMarker.out.trim(), mis: "base-case-output-missed", why: "The base case prints before returning." }, { value: basePrints.out.trim(), mis: "base-call-prints", why: "The base-case call returns before reaching any print of n." }, { value: toks.slice(0, -1).join(" "), mis: "last-output-missed", why: "Every pending print still runs as the calls return." }, { value: [...toks].reverse().join(" "), mis: "output-reversed", why: "Follow the order statements actually execute." }].filter(Boolean),
    explanation: `${P.pre && P.post ? "Each call prints on the way down, then again on the way back up" : P.pre ? why.pre : why.post}: ${out}.`, jvm: { method: name, call: `${name}(${start})`, isVoid: true, observe: "out", trim: true } });
  const i = int(2, toks.length - 1, r);
  return Q({ ...common, prompt: `What is the ${ord(i)} value printed by ${name}(${start})?`, answer: toks[i - 1],
    distractors: [{ value: allPre.out.trim().split(" ")[i - 1], mis: "all-prints-before-call", why: why.post }, { value: allPost.out.trim().split(" ")[i - 1], mis: "all-prints-after-call", why: why.pre }, { value: toks[i], mis: "off-by-one-position", why: "Count printed values from the first one." }, { value: toks[i - 2], mis: "off-by-one-position", why: "Count printed values from the first one." }, { value: [...toks].reverse()[i - 1], mis: "output-reversed", why: "Follow the order statements execute." }].filter(x => x.value !== undefined),
    explanation: `The full output is ${out}; value ${i} is ${toks[i - 1]}.`, jvm: { method: name, call: `${name}(${start})`, isVoid: true, observe: "outToken", index: i - 1 } });
} };
const ord = i => `${i}${i % 10 === 1 && i !== 11 ? "st" : i % 10 === 2 && i !== 12 ? "nd" : i % 10 === 3 && i !== 13 ? "rd" : "th"}`;

// ---- branching output (pre/in/post-order) ----
export const branchingOutput = { id: "branching-output", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(NAMES.int, r), order = pick(L === 1 ? ["pre", "in", "post"] : ["pre", "in", "post", "split"], r), dec = L === 2 && r() < 0.4 ? 2 : 1;
  const rc = () => Do(call(name, bin("-", n, num(dec)))), pr = Print(bin("+", n, str(" "))), base = [If(bin("<=", n, num(0)), [Ret()])];
  const bodies = { pre: [pr, rc(), rc()], in: [rc(), pr, rc()], post: [rc(), rc(), pr], split: [Print(bin("+", n, str("("))) , rc(), Print(str(") ")), rc()] };
  const mk = o => program([method(name, "void", [["int", "n"]], [...base, ...bodies[o]])], name);
  const start = int(2, L === 1 ? 3 : 4, r), prog = mk(order), res = exec(prog, name, [start]), out = res.out.trim();
  const lin = run(program([method(name, "void", [["int", "n"]], [...base, ...bodies[order].filter((x, i, a) => !(x.k === "expr" && a.indexOf(x) !== a.findIndex(y => y.k === "expr")))])], name), name, [start]);
  const others = ["pre", "in", "post"].filter(o => o !== order).map(o => ({ value: run(mk(o), name, [start]).out.trim(), mis: `${o}-order-confused`, why: `Look at where the print sits relative to the two recursive calls.` }));
  const ask = order !== "split" && L === 2 && r() < 0.4 ? "countOnes" : "output";
  const common = { r, difficulty: d, family: "branching-output", prog, callNote: `call: ${name}(${start})`, trace: [`output: ${out}`], callCount: res.calls, callDepth: res.maxDepth, reasoning: `branching-output:${order}:${dec}:${ask}`, data: { start } };
  if (ask === "output") return Q({ ...common, prompt: `What is printed by ${name}(${start})?`, answer: out,
    distractors: [...others, { value: lin.out.trim(), mis: "second-call-ignored", why: "Both recursive calls run; each one prints its own values." }],
    explana