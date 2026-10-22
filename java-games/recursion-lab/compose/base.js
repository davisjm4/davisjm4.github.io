import { num, v, bin, call, If, Ret, Do, method, program, run, renderJava, renderValue, clone } from "./ir.js?v=compositional-v1";
import { makeQuestion, reject, int, pick, LEVEL, NAMES, fmtList, exec, traceLines, traceWithError } from "./core.js?v=compositional-v1";
const MODE = "base", TITLE = "Base Cases & Calls";
const n = v("n");
const Q = (o) => makeQuestion({ mode: MODE, modeTitle: TITLE, ...o });
const seqOf = res => res.log.map(e => e.args[0]);
const voidRec = (name, base, prog) => program([method(name, "void", [["int", "n"]], [If(base, [Ret()]), Do(call(name, prog))])], name);

// ---- progression catalogue (each a distinct way n moves toward the base) ----
const PROG = {
  sub:   { levels: [0, 1, 2], make: k => bin("-", n, num(k)), wrong: k => [bin("-", n, num(k === 1 ? 2 : k - 1))], label: k => `subtracts ${k}` },
  half:  { levels: [0, 1, 2], make: () => bin("/", n, num(2)), wrong: () => [bin("/", bin("+", n, num(1)), num(2)), bin("-", n, num(2))], label: () => "halves n with integer division" },
  third: { levels: [1, 2],    make: () => bin("/", n, num(3)), wrong: () => [bin("/", bin("+", n, num(2)), num(3)), bin("-", n, num(3))], label: () => "divides n by 3 with integer division" },
  digit: { levels: [1, 2],    make: () => bin("/", n, num(10)), wrong: () => [bin("%", n, num(10)), bin("-", n, num(10))], label: () => "drops the last digit (n / 10)" },
};
function baseFor(kind, L, r) {
  if (kind === "digit") return pick([[bin("<", n, num(10)), "n < 10"], [bin("==", n, num(0)), "n == 0"]], r);
  if (kind === "sub") return pick([[bin("<=", n, num(0)), "n <= 0"], [bin("<=", n, num(1)), "n <= 1"], [bin("<", n, num(2)), "n < 2"]], r);
  return pick(L === 0 ? [[bin("<=", n, num(1)), "n <= 1"], [bin("==", n, num(0)), "n == 0"]] : [[bin("<=", n, num(1)), "n <= 1"], [bin("==", n, num(0)), "n == 0"], [bin("<", n, num(3)), "n < 3"]], r);
}
function startFor(kind, L, r) {
  if (kind === "digit") return [int(100, 999, r), int(1000, 99999, r), int(100000, 9999999, r)][L];
  if (kind === "sub") return [int(5, 9, r), int(9, 16, r), int(14, 24, r)][L];
  if (kind === "third") return [0, int(20, 80, r), int(80, 400, r)][L];
  return [int(9, 30, r), int(30, 120, r), int(100, 700, r)][L];
}
export const callSequence = { id: "call-sequence", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], kinds = Object.keys(PROG).filter(k => PROG[k].levels.includes(L)), kind = pick(kinds, r), P = PROG[kind];
  const k = kind === "sub" ? int(2, L === 0 ? 3 : 4, r) : 0, [base, baseText] = baseFor(kind, L, r), name = pick(NAMES.int, r), start = startFor(kind, L, r);
  const prog = voidRec(name, base, P.make(k)), res = exec(prog, name, [start]); if (res.calls < 3) reject("too shallow");
  const seq = seqOf(res), asks = kind === "sub" ? ["sequence"] : ["sequence", "calls", "baseArg"], ask = pick(asks, r);
  const wrongRuns = P.wrong(k).map(w => run(voidRec(name, base, w), name, [start], { maxDepth: 60 }));
  const reason = `${kind}:${ask}`, trace = traceLines(res, { showReturns: false });
  const common = { r, difficulty: d, family: "call-sequence", prog, callNote: `call: ${name}(${start})`, trace, callCount: res.calls, callDepth: res.maxDepth, reasoning: `call-sequence:${reason}`, data: { start } };
  const jvm = { method: name, call: `${name}(${start})`, isVoid: true };
  if (ask === "sequence") {
    const D = [];
    wrongRuns.forEach((w, i) => { if (!w.error) D.push({ value: fmtList(seqOf(w)), mis: i === 0 ? "progression-misread" : "progression-swapped", why: `That sequence comes from a different update rule; this call ${P.label(k)} each time.` }); });
    D.push({ value: fmtList(seq.slice(0, -1)), mis: "base-call-not-counted", why: `The call ${name}(${seq.at(-1)}) still happens; it is the call that reaches the base case (${baseText}).` });
    const nextVal = run(program([method("f", "int", [["int", "n"]], [Ret(P.make(k))])], "f"), "f", [seq.at(-1)]).value;
    D.push({ value: fmtList([...seq, nextVal]), mis: "base-case-checked-after-call", why: `The base case is checked first, so no call is made after ${name}(${seq.at(-1)}).` });
    return Q({ ...common, prompt: `Which sequence of arguments does ${name} receive, starting with ${name}(${start})?`, answer: fmtList(seq), distractors: D,
      explanation: `Each call ${P.label(k)}: ${fmtList(seq)}. At ${seq.at(-1)} the condition ${baseText} is true, so that call returns without recursing.`, jvm: { ...jvm, observe: "argSequence" } });
  }
  if (ask === "calls") {
    const D = [{ value: res.calls - 1, mis: "base-call-not-counted", why: `Count the final call ${name}(${seq.at(-1)}) too; it runs the base case.` },
      { value: res.calls + 1, mis: "extra-call-after-base", why: "No call is made after the base case is reached." }];
    wrongRuns.forEach(w => { if (!w.error) D.push({ value: w.calls, mis: "progression-misread", why: `That count fits a different update rule; this call ${P.label(k)}.` }); });
    return Q({ ...common, prompt: `How many times is ${name} called in total for ${name}(${start}), including the first call?`, answer: res.calls, distractors: D,
      explanation: `The arguments are ${fmtList(seq)}: ${res.calls} calls, the last one stopping at ${baseText}.`, jvm: { ...jvm, observe: "calls" } });
  }
  const D = [{ value: seq.at(-2), mis: "base-call-not-counted", why: `${name}(${seq.at(-2)}) does not satisfy ${baseText}; it makes one more call.` }];
  wrongRuns.forEach(w => { if (!w.error) D.push({ value: seqOf(w).at(-1), mis: "progression-misread", why: `That value comes from a different update rule; this call ${P.label(k)}.` }); });
  D.push({ value: 0, mis: "base-is-always-zero", why: `The recursion stops at the first value satisfying ${baseText}, which is not necessarily 0.` }, { value: 1, mis: "base-is-always-one", why: `Check each argument against ${baseText}.` });
  return Q({ ...common, prompt: `What is the value of n in the call that reaches the base case, starting from ${name}(${start})?`, answer: seq.at(-1), distractors: D,
    explanation: `The arguments are ${fmtList(seq)}. ${seq.at(-1)} is the first to satisfy ${baseText}.`, jvm: { ...jvm, observe: "lastArg" } });
} };

// ---- increasing parameter ----
export const upwardParameter = { id: "upward-parameter", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(NAMES.int, r), step = int(1, L === 0 ? 2 : 4, r), op = pick([">=", ">", "=="].slice(0, L === 0 ? 2 : 3), r);
  const limit = int(6, [10, 18, 30][L], r), start = int(0, Math.max(0, limit - step * 2 - 1), r);
  const mk = (o, s) => program([method(name, "void", [["int", "i"], ["int", "limit"]], [If(bin(o, v("i"), v("limit")), [Ret()]), Do(call(name, bin("+", v("i"), num(s)), v("limit")))])], name);
  const prog = mk(op, step), res = run(prog, name, [start, limit], { maxDepth: 200 }); if (res.error || res.calls < 3) reject("bad upward");
  const seq = res.log.map(e => e.args[0]), ask = pick(L === 0 ? ["calls", "lastArg"] : ["calls", "lastArg", "sequence"], r);
  co