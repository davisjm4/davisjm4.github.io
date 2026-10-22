import { num, v, bin, call, If, Ret, Do, method, program, run, renderJava, renderValue, clone } from "./ir.js?v=compositional-v2";
import { makeQuestion, reject, int, pick, LEVEL, NAMES, fmtList, exec, traceLines, traceWithError } from "./core.js?v=compositional-v2";
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
  const other = [">=", ">"].find(o => o !== op) ?? ">=", alt = run(mk(other, step), name, [start, limit], { maxDepth: 200 }), alt1 = step > 1 ? run(mk(op, 1), name, [start, limit], { maxDepth: 200 }) : run(mk(op, 2), name, [start, limit], { maxDepth: 200 });
  const cond = `i ${op} limit`, common = { r, difficulty: d, family: "upward-parameter", prog, callNote: `call: ${name}(${start}, ${limit})`, trace: traceLines(res, { showReturns: false }), callCount: res.calls, callDepth: res.maxDepth, reasoning: `upward-parameter:${op === "==" ? "exact" : "bound"}:${ask}`, data: { start, limit } };
  const jvm = { method: name, call: `${name}(${start}, ${limit})`, isVoid: true };
  const opWhy = `The base case is i ${op} limit; ${op === ">=" ? "i equal to limit already stops" : op === ">" ? "i equal to limit does not stop yet" : "only exactly limit stops"}.`;
  if (ask === "calls") return Q({ ...common, prompt: `How many calls to ${name} happen in total for ${name}(${start}, ${limit})?`, answer: res.calls,
    distractors: [!alt.error && { value: alt.calls, mis: "boundary-operator-confused", why: opWhy }, { value: res.calls - 1, mis: "base-call-not-counted", why: "Count the final call that stops at the base case." }, !alt1.error && { value: alt1.calls, mis: "step-misread", why: `i increases by ${step} each call.` }, { value: limit - start, mis: "range-length-as-calls", why: "The number of calls depends on the step and the stopping condition, not just limit − start." }].filter(Boolean),
    explanation: `i takes the values ${fmtList(seq)}; the call with i = ${seq.at(-1)} satisfies ${cond}. That is ${res.calls} calls.`, jvm: { ...jvm, observe: "calls" } });
  if (ask === "lastArg") return Q({ ...common, prompt: `What is i in the last call to ${name} for ${name}(${start}, ${limit})?`, answer: seq.at(-1),
    distractors: [!alt.error && { value: alt.log.at(-1).args[0], mis: "boundary-operator-confused", why: opWhy }, { value: seq.at(-2), mis: "base-call-not-counted", why: `${name}(${seq.at(-2)}, ${limit}) still recurses because ${seq.at(-2)} ${op} ${limit} is false.` }, { value: limit, mis: "stops-exactly-at-limit", why: `i only takes values ${start}, ${start + step}, …; check which first satisfies ${cond}.` }, { value: seq.at(-1) + step, mis: "extra-call-after-base", why: "Once the base case is true, no further call is made." }].filter(Boolean),
    explanation: `i goes ${fmtList(seq)}. ${seq.at(-1)} is the first value with ${cond}.`, jvm: { ...jvm, observe: "lastArg" } });
  return Q({ ...common, prompt: `Which values does i take, in order, for ${name}(${start}, ${limit})?`, answer: fmtList(seq),
    distractors: [!alt.error && { value: fmtList(alt.log.map(e => e.args[0])), mis: "boundary-operator-confused", why: opWhy }, { value: fmtList(seq.slice(0, -1)), mis: "base-call-not-counted", why: "The call that reaches the base case also receives an argument." }, !alt1.error && { value: fmtList(alt1.log.map(e => e.args[0])), mis: "step-misread", why: `i increases by ${step}.` }].filter(Boolean),
    explanation: `Starting at ${start} and adding ${step}: ${fmtList(seq)}; the last satisfies ${cond}.`, jvm: { ...jvm, observe: "argSequence" } });
} };

// ---- implicit base case (no return statement) ----
export const implicitBase = { id: "implicit-base", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(NAMES.int, r), K = int(0, 3, r), step = L === 0 ? int(1, 2, r) : int(1, 3, r), op = pick([">", ">=", "!="].slice(0, L === 2 ? 3 : 2), r);
  const mk = (s) => program([method(name, "void", [["int", "n"]], [If(bin(op, n, num(K)), [Do(call(name, bin("-", n, num(s))))])])], name);
  const prog = mk(step), start = K + int(3, [7, 12, 18][L], r), res = run(prog, name, [start], { maxDepth: 200 });
  const ask = op === "!=" ? "stopRule" : pick(["calls", "stopRule"], r);
  if (res.error && ask === "calls") reject("diverges");
  const stopText = op === ">" ? `n is ${K} or less` : op === ">=" ? `n is less than ${K}` : `n equals ${K}`;
  const pred = op === ">" ? x => x <= K : op === ">=" ? x => x < K : x => x === K;
  const cands = [[`When ${stopText}`, pred, null],
    [op === ">" ? `When n is less than ${K}` : `When n is ${K} or less`, op === ">" ? x => x < K : x => x <= K, "boundary-operator-confused"],
    [`When n reaches 0`, x => x === 0, "base-is-always-zero"],
    [`Never — the method has no return statement`, () => false, "needs-explicit-return"],
    [`When n becomes negative`, x => x < 0, "base-is-negative"]];
  const range = Array.from({ length: 16 }, (_, i) => i - 4);
  const stopSet = range.filter(x => run(prog, name, [x], { maxDepth: 400 }).calls === 1);
  const sets = cands.map(c => range.filter(c[1]).join(","));
  if (sets[0] !== stopSet.join(",")) reject("predicate mismatch");
  const common = { r, difficulty: d, family: "implicit-base", prog, callNote: `call: ${name}(${start})`, trace: traceWithError(res, { showReturns: false }), callCount: res.calls, callDepth: res.maxDepth, diverges: !!res.error, reasoning: `implicit-base:${op}:${ask}`, data: { start } };
  if (ask === "calls") {
    const alt = run(mk(step === 1 ? 2 : 1), name, [start], { maxDepth: 200 });
    return Q({ ...common, prompt: `${name} has no explicit return statement. How many times is it called for ${name}(${start})?`, answer: res.calls,
      distractors: [{ value: res.calls - 1, mis: "base-call-not-counted", why: `The last call still happens; it just skips the if-body because n ${op} ${K} is false.` }, !alt.error && { value: alt.calls, mis: "step-misread", why: `n decreases by ${step}.` }, { value: res.calls + 1, mis: "extra-call-after-base", why: "When the condition is false the method ends without another call." }, { value: start - K, mis: "range-length-as-calls", why: "Count the actual argument values." }].filter(Boolean),
      explanation: `The method recurses only while n ${op} ${K}: arguments ${fmtList(res.log.map(e => e.args[0]))}, so ${res.calls} calls. The final call does nothing — that is the implicit base case.`, jvm: { method: name, call: `${name}(${start})`, isVoid: true, observe: "calls" } });
  }
  const D = cands.slice(1).filter((c, i) => sets[i + 1] !== sets[0]).map(c => ({ value: c[0], mis: c[2], why: c[2] === "needs-explicit-return" ? "A void method also ends when it reaches its closing brace; when the if-condition is false nothing else runs." : `Compare with the condition n ${op} ${K}: recursion continues only while it is true.` }));
  return Q({ ...common, prompt: `When does a call to ${name} stop making further recursive calls?`, answer: cands[0][0], distractors: D,
    explanation: `The recursive call is inside if (n ${op} ${K}). When that is false the method simply ends: that is the base case, even without a return statement.`,
    jvm: { method: name, isVoid: true, observe: "stopSet", range, choiceSets: Object.fromEntries(cands.map((c, i) => [c[0], sets[i]])) } });
} };

// ---- multiple base cases ----
export const multipleBases = { id: "multiple-base-cases", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(NAMES.ret, r), three = L === 2 && r() < 0.5, step = three ? 3 : 2;
  const bases = three ? [0, 1, 2] : pick(L === 0 ? [[0, 1]] : [[0, 1], [0, 3], [1, 4]], r);
  const vals = bases.map(() => 0); bases.forEach((_, i) => { let x; do x = int(-5, 9, r); while (vals.includes(x)); vals[i] = x; });
  const body = [...bases.map((b, i) => If(bin("==", n, num(b)), [Ret(num(vals[i]))])), Ret(call(name, bin("-", n, num(step))))];
  const prog = program([method(name, "int", [["int", "n"]], body)], name);
  let start, res, tries = 0; do { start = int(L === 0 ? 3 : 2, [9, 15, 22][L], r); res = run(prog, name, [start], { maxDepth: 300 }); } while (++tries < 20 && (L === 0 && res.error));
  const lines = bases.map(b => `if (n == ${b})`), never = "Neither — the calls never stop (StackOverflowError)";
  const answer = res.error ? never : lines[vals.indexOf(res.value)];
  const D = lines.filter(x => x !== answer).map(x => ({ value: x, mis: "parity-ignored", why: `Follow n: ${start}, ${start - step}, ${start - 2 * step}, … Only values reachable by subtracting ${step} can match a base case.` }));
  if (answer !== never) D.push({ value: never, mis: "assumes-divergence", why: `n = ${res.log.at(-1).args[0]} matches a base case, so the recursion stops.` });
  if (!three) D.push({ value: "Both base cases, one after the other", mis: "all-base-cases-run", why: "A return ends the call immediately; only one base case can run in the final call." });
  const seq = res.error ? res.log.slice(0, 6).map(e => e.args[0]) : res.log.map(e => e.args[0]);
  return Q({ r, difficulty: d, family: "multiple-base-cases", prog, callNote: `call: ${name}(${start})`, prompt: `Which base case ends the recursion for ${name}(${start})?`, answer, distractors: D,
    explanation: res.error ? `n goes ${fmtList(seq)}, … and skips every base value, so the recursion never stops.` : `n goes ${fmtList(seq)}; ${seq.at(-1)} matches ${answer}, which returns ${res.value}.`,
    trace: res.error ? [`${fmtList(seq)}, … (never matches)`] : traceLines(res), callCount: res.calls, callDepth: res.maxDepth, diverges: !!res.error,
    reasoning: `multiple-base-cases:${three ? "three" : "two"}:${res.error ? "diverges" : "stops"}`, data: { start },
    jvm: { method: name, call: `${name}(${start})`, observe: "baseChoice", valueToChoice: Object.fromEntries(vals.map((x, i) => [String(x), lines[i]])), divergeChoice: never } });
} };

// ---- which call fails to terminate ----
const TERM = [
  { id: "parity", levels: [0, 1, 2], make: nm => voidRec(nm, bin("==", n, num(0)), bin("-", n, num(2))), good: r => 2 * int(1, 6, r), bad: r => 2 * int(1, 6, r) + 1, why: "Subtracting 2 from an odd number never lands exactly on 0." },
  { id: "wrong-side", levels: [0, 1], make: nm => voidRec(nm, bin("==", n, num(0)), bin("-", n, num(1))), good: r => int(1, 9, r), bad: r => -int(1, 5, r), why: "Starting below 0 and subtracting 1 moves away from 0, so n == 0 is never reached." },
  { id: "halving-fixed-point", levels: [1, 2], make: nm => voidRec(nm, bin("==", n, num(1)), bin("/", n, num(2))), good: r => int(1, 60, r), bad: () => 0, why: "0 / 2 is 0, so n stays 0 forever and never equals 1." },
  { id: "step-three", levels: [1, 2], make: nm => voidRec(nm, bin("==", n, num(0)), bin("-", n, num(3))), good: r => 3 * int(1, 6, r), bad: r => 3 * int(1, 6, r) + int(1, 2, r), why: "Only multiples of 3 reach exactly 0 when subtracting 3." },
  { id: "overshoot-upward", levels: [1, 2], make: nm => program([method(nm, "void", [["int", "n"]], [If(bin("==", n, num(20)), [Ret()]), Do(call(nm, bin("+", n, num(4))))])], nm), good: r => 20 - 4 * int(0, 4, r), bad: r => 20 - 4 * int(0, 3, r) - int(1, 3, r), why: "Adding 4 only lands on 20 from values that differ from 20 by a multiple of 4." },
  { id: "converging-pair", levels: [2], make: nm => program([method(nm, "void", [["int", "a"], ["int", "b"]], [If(bin("==", v("a"), v("b")), [Ret()]), Do(call(nm, bin("+", v("a"), num(1)), bin("-", v("b"), num(1))))])], nm), two: true,
    good: r => { const a = int(0, 5, r); return [a, a + 2 * int(1, 4, r)]; }, bad: r => { const a = int(0, 5, r); return [a, a + 2 * int(0, 4, r) + 1]; }, why: "a and b move toward each other by 2 per call, so they can only meet when b − a is even." },
];
export const terminationCheck = { id: "termination-check", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], T = pick(TERM.filter(t => t.levels.includes(L)), r), name = pick(NAMES.int, r), prog = T.make(name);
  const flip = L > 0 && r() < 0.35;   // ask for the one call that DOES terminate
  const key = x => JSON.stringify(x), argsOf = x => T.two ? x : [x], ct = x => `${name}(${argsOf(x).join(", ")})`;
  const goods = new Map(), bads = new Map(); let guard = 0;
  while ((goods.size < 3 || bads.size < 3) && guard++ < 200) { const g = T.good(r), b = T.bad(r); goods.set(key(g), g); bads.set(key(b), b); }
  const G = [...goods.values()], B = [...bads.values()]; if (G.length < 3 || B.length < 3) reject("few candidates");
  const answerArg = flip ? G[0] : B[0], others = flip ? B.slice(0, 3) : G.slice(0, 3);
  for (const x of [answerArg, ...others]) { const res = run(prog, name, argsOf(x), { maxDepth: 500 }); if ((res.error === "StackOverflowError") !== (B.includes(x))) reject("termination mismatch"); }
  const D = others.map(x => ({ value: ct(x), mis: flip ? "misjudges-divergence" : "misjudges-termination", why: flip ? `${ct(x)} never reaches the base case. ${T.why}` : `${ct(x)} reaches the base case after ${run(prog, name, argsOf(x)).calls} calls.` }));
  return Q({ r, difficulty: d, family: "termination-check", prog, callNote: `each answer choice is a different first call to ${name}`, prompt: flip ? `Exactly one of these calls finishes normally. Which one?` : `Which call never reaches the base case and ends with a StackOverflowError?`, answer: ct(answerArg), distractors: D,
    explanation: `${T.why} ${flip ? `${ct(answerArg)} reaches the base case; the others recurse until the call stack overflows.` : `${ct(answerArg)} skips past the base case; the other calls stop normally.`}`,
    trace: [answerArg, ...others].map(x => { const rr = run(prog, name, argsOf(x), { maxDepth: 500 }); return `${ct(x)}: ${rr.error ? `${fmtList(rr.log.slice(0, 5).map(e => e.args.join("/")))}, … never stops` : `stops after ${rr.calls} calls`}`; }), callCount: run(prog, name, argsOf(flip ? answerArg : others[0])).calls, callDepth: run(prog, name, argsOf(flip ? answerArg : others[0])).maxDepth,
    reasoning: `termination-check:${T.id}:${flip ? "find-terminating" : "find-diverging"}`, data: {},
    jvm: { method: name, isVoid: true, observe: "terminationChoice", candidates: Object.fromEntries([answerArg, ...others].map(x => [ct(x), `${name}(${argsOf(x).join(", ")})`])), wantOverflow: !flip } });
} };

// ---- conditional progression ----
const COND = [
  { id: "even-half-odd-minus", c: bin("==", bin("%", n, num(2)), num(0)), t: bin("/", n, num(2)), e: bin("-", n, num(1)), base: bin("<=", n, num(1)), bt: "n <= 1" },
  { id: "even-half-odd-plus", c: bin("==", bin("%", n, num(2)), num(0)), t: bin("/", n, num(2)), e: bin("+", n, num(1)), base: bin("<=", n, num(2)), bt: "n <= 2" },
  { id: "three-third-else-minus", c: bin("==", bin("%", n, num(3)), num(0)), t: bin("/", n, num(3)), e: bin("-", n, num(1)), base: bin("<", n, num(3)), bt: "n < 3" },
  { id: "big-minus-small-half", c: bin(">", n, num(10)), t: bin("-", n, num(7)), e: bin("/", n, num(2)), base: bin("==", n, num(0)), bt: "n == 0" },
];
export const conditionalProgression = { id: "conditional-progression", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], C = pick(COND, r), name = pick(NAMES.int, r);
  const mk = (t, e) => program([method(name, "void", [["int", "n"]], [If(C.base, [Ret()]), If(C.c, [Do(call(name, t))], [Do(call(name, e))])])], name);
  const prog = mk(C.t, C.e), start = int(L === 1 ? 9 : 30, L === 1 ? 40 : 160, r), res = exec(prog, name, [start], { maxDepth: 300 });
  if (res.calls < 4) reject("short");
  const seq = seqOf(res), swapped = run(mk(C.e, C.t), name, [start], { maxDepth: 300 }), only = run(mk(C.t, C.t), name, [start], { maxDepth: 300 });
  const ask = pick(["sequence", "calls", "elseCount"], r);
  const elseCount = seq.slice(0, -1).filter(x => !run(program([method("t", "boolean", [["int", "n"]], [Ret(C.c)])], "t"), "t", [x]).value).length;
  const common = { r, difficulty: d, family: "conditional-progression", prog, callNote: `call: ${name}(${start})`, trace: traceLines(res, { showReturns: false }), callCount: res.calls, callDepth: res.maxDepth, reasoning: `conditional-progression:${C.id}:${ask}`, data: { start } };
  const jvm = { method: name, call: `${name}(${start})`, isVoid: true };
  if (ask === "sequence") return Q({ ...common, prompt: `Which arguments does ${name} receive, in order, for ${name}(${start})?`, answer: fmtList(seq),
    distractors: [!swapped.error && { value: fmtList(seqOf(swapped)), mis: "branches-swapped", why: "Check the condition for each value: the if-branch and else-branch apply to different cases." }, !only.error && { value: fmtList(seqOf(only)), mis: "else-branch-ignored", why: "Values that fail the condition take the else-branch call." }, { value: fmtList(seq.slice(0, -1)), mis: "base-call-not-counted", why: `The call with ${seq.at(-1)} still happens; it is where ${C.bt} stops the recursion.` }].filter(Boolean),
    explanation: `Each call checks the base case, then chooses a branch: ${fmtList(seq)}.`, jvm: { ...jvm, observe: "argSequence" } });
  if (ask === "calls") return Q({ ...common, prompt: `How many calls to ${name} are made in total for ${name}(${start})?`, answer: res.calls,
    distractors: [!swapped.error && { value: swapped.calls, mis: "branches-swapped", why: "The if-branch applies only when its condition is true." }, !only.error && { value: only.calls, mis: "else-branch-ignored", why: "Values that fail the condition take the else-branch call." }, { value: res.calls - 1, mis: "base-call-not-counted", why: "Count the final call that reaches the base case." }, { value: res.calls + 1, mis: "extra-call-after-base", why: "Nothing is called after the base case." }].filter(Boolean),
    explanation: `Arguments: ${fmtList(seq)} — ${res.calls} calls.`, jvm: { ...jvm, observe: "calls" } });
  return Q({ ...common, prompt: `During ${name}(${start}), how many recursive calls are made from the else-branch?`, answer: elseCount,
    distractors: [{ value: seq.length - 1 - elseCount, mis: "branches-swapped", why: "That counts the if-branch calls." }, { value: seq.length - 1, mis: "counts-all-calls", why: "Only calls made when the condition is false come from the else-branch." }, { value: elseCount + 1, mis: "base-call-counted-as-branch", why: "The base-case call returns before reaching either branch." }, { value: Math.max(0, elseCount - 1), mis: "first-call-skipped", why: "Check the first argument too." }],
    explanation: `Arguments ${fmtList(seq)}. The else-branch runs for ${fmtList(seq.slice(0, -1).filter(x => !run(program([method("t", "boolean", [["int", "n"]], [Ret(C.c)])], "t"), "t", [x]).value)) || "no values"}: ${elseCount} calls.`, jvm: { ...jvm, observe: "elseCount", cond: C.id } });
} };

// ---- branching recursion: calls vs depth ----
const TREES = [
  { id: "double", levels: [1, 2], calls: (nm) => [call(nm, bin("-", n, num(1))), call(nm, bin("-", n, num(1)))], base: bin("<=", n, num(0)), max: [0, 4, 6] },
  { id: "fib-shape", levels: [1, 2], calls: (nm) => [call(nm, bin("-", n, num(1))), call(nm, bin("-", n, num(2)))], base: bin("<=", n, num(1)), max: [0, 6, 9] },
  { id: "halves", levels: [1, 2], calls: (nm) => [call(nm, bin("/", n, num(2))), call(nm, bin("/", n, num(2)))], base: bin("<=", n, num(1)), max: [0, 12, 40] },
  { id: "uneven", levels: [2], calls: (nm) => [call(nm, bin("-", n, num(1))), call(nm, bin("-", n, num(3)))], base: bin("<=", n, num(2)), max: [0, 0, 10] },
  { id: "triple", levels: [2], calls: (nm) => [call(nm, bin("-", n, num(1))), call(nm, bin("-", n, num(1))), call(nm, bin("-", n, num(1)))], base: bin("<=", n, num(0)), max: [0, 0, 4] },
];
export const branchingTree = { id: "branching-tree", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], T = pick(TREES.filter(t => t.levels.includes(L)), r), name = pick(NAMES.int, r);
  const prog = program([method(name, "void", [["int", "n"]], [If(T.base, [Ret()]), ...T.calls(name).map(Do)])], name);
  const start = int(3, T.max[L], r), res = exec(prog, name, [start]); if (res.calls < 5) reject("small tree");
  const lin = run(program([method(name, "void", [["int", "n"]], [If(T.base, [Ret()]), Do(T.calls(name)[0])])], name), name, [start]);
  const leaves = res.log.filter((e, i) => !(res.log[i + 1] && res.log[i + 1].depth > e.depth)).length;
  const ask = pick(["calls", "depth", "specific", "leaves"], r);
  const common = { r, difficulty: d, family: "branching-tree", prog, callNote: `call: ${name}(${start})`, trace: traceLines(res, { showReturns: false }), callCount: res.calls, callDepth: res.maxDepth, reasoning: `branching-tree:${T.id}:${ask}`, data: { start } };
  const jvm = { method: name, call: `${name}(${start})`, isVoid: true };
  if (ask === "calls") return Q({ ...common, prompt: `How many calls to ${name} are made in total for ${name}(${start}), including base-case calls?`, answer: res.calls,
    distractors: [{ value: res.maxDepth, mis: "depth-confused-with-calls", why: `${res.maxDepth} is the deepest the stack gets; every branch adds calls, so the total is larger.` }, { value: lin.calls, mis: "second-call-ignored", why: `Each non-base call makes ${T.calls(name).length} recursive calls, not one.` }, { value: res.calls - leaves, mis: "base-calls-not-counted", why: "Base-case calls are calls too." }, { value: leaves, mis: "only-leaves-counted", why: "Count every call, not just the ones that reach the base case." }],
    explanation: `The calls form a tree: ${res.calls} calls in total, ${leaves} of them base cases, with maximum depth ${res.maxDepth}.`, jvm: { ...jvm, observe: "calls" } });
  if (ask === "depth") return Q({ ...common, prompt: `What is the maximum number of ${name} calls on the call stack at the same time during ${name}(${start})?`, answer: res.maxDepth,
    distractors: [{ value: res.calls, mis: "calls-confused-with-depth", why: "Sibling calls are not on the stack together: the first finishes before the second starts." }, { value: res.maxDepth - 1, mis: "first-call-not-counted", why: `Count ${name}(${start}) itself as the first frame.` }, { value: leaves, mis: "leaves-as-depth", why: "Depth is the longest chain of nested calls, not the number of base cases." }, { value: res.maxDepth + 1, mis: "extra-frame", why: "The deepest base-case call returns without calling again." }],
    explanation: `The longest chain of nested calls has ${res.maxDepth} frames; the total number of calls (${res.calls}) is larger because branches run one after another.`, jvm: { ...jvm, observe: "depth" } });
  if (ask === "leaves") return Q({ ...common, prompt: `How many of the calls made by ${name}(${start}) reach the base case?`, answer: leaves,
    distractors: [{ value: res.calls - leaves, mis: "internal-calls-counted", why: "Those calls make further recursive calls; they do not stop at the base case." }, { value: res.calls, mis: "counts-all-calls", why: "Only the calls where the base condition is true count." }, { value: res.maxDepth, mis: "depth-as-leaves", why: "Depth measures nesting, not how many calls stop." }, { value: leaves * 2, mis: "doubles-leaves", why: "Count the calls directly." }],
    explanation: `${leaves} of the ${res.calls} calls satisfy the base condition and return immediately.`, jvm: { ...jvm, observe: "leaves" } });
  const counts = new Map(); for (const e of res.log) counts.set(e.args[0], (counts.get(e.args[0]) || 0) + 1);
  const options = [...counts].filter(([k, c]) => c > 1 && k !== start); if (!options.length) reject("no repeated call");
  const [k, c] = pick(options, r), fresh = [...counts.values()];
  return Q({ ...common, prompt: `During ${name}(${start}), how many times is ${name}(${k}) called?`, answer: c,
    distractors: [{ value: 1, mis: "each-value-once", why: "Branching recursion repeats the same subproblem in different branches." }, { value: lin.log.filter(e => e.args[0] === k).length === 1 ? 2 : 3, mis: "linear-thinking", why: `Each non-base call makes ${T.calls(name).length} calls; count every branch that reaches ${k}.` }, { value: c * 2, mis: "double-counted", why: "Each call is counted once, when it begins." }, { value: c - 1, mis: "first-occurrence-ignored", why: "Count every occurrence." }, { value: c + 1, mis: "off-by-one", why: "Count from the tree." }],
    explanation: `${name}(${k}) appears ${c} times in the call tree because several branches reach it.`, jvm: { ...jvm, observe: "countArg", arg: String(k) } });
} };
export default [callSequence, upwardParameter, implicitBase, multipleBases, terminationCheck, conditionalProgression, branchingTree];
