import { num, str, v, bin, call, If, Ret, Do, Print, Decl, method, program, run, len, sub, eq, not, tern } from "./ir.js?v=compositional-v2";
import { makeQuestion, reject, int, pick, LEVEL, NAMES, WORDS, fmtList, exec, traceLines, quote } from "./core.js?v=compositional-v2";
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
    explanation: `Each call ${order === "pre" ? "prints n, then runs both recursive calls" : order === "in" ? "finishes the first recursive call, prints n, then runs the second call" : order === "post" ? "runs both recursive calls, then prints n" : "prints n and \"(\", runs the first call, prints \")\", then runs the second call"}: ${out}.`, jvm: { method: name, call: `${name}(${start})`, isVoid: true, observe: "out", trim: true } });
  const toks = out.split(" "), lowest = String(Math.min(...toks.map(Number))), c = toks.filter(t => t === lowest).length;
  return Q({ ...common, prompt: `How many times is ${lowest} printed by ${name}(${start})?`, answer: c,
    distractors: [{ value: 1, mis: "each-value-once", why: "Branching recursion reaches the same value in several branches." }, { value: c * 2, mis: "double-counted", why: "Each call prints once." }, { value: c - 1, mis: "off-by-one", why: "Count every branch." }, { value: start, mis: "depth-as-count", why: "Count the calls with that argument." }, { value: c + 1, mis: "off-by-one", why: "Count every branch." }],
    explanation: `Output: ${out}. ${lowest} appears ${c} times.`, jvm: { method: name, call: `${name}(${start})`, isVoid: true, observe: "outCount", token: lowest } });
} };

// ---- String builders ----
const SB = [
  { id: "double-letters", levels: [0, 1, 2], base: [If(bin("==", len(s), num(0)), [Ret(str(""))])], ret: f => bin("+", bin("+", first, first), f), swap: f => bin("+", f, bin("+", first, first)) },
  { id: "separators", levels: [0, 1, 2], base: [If(bin("<=", len(s), num(1)), [Ret(s)])], ret: f => bin("+", bin("+", first, str("-")), f), swap: f => bin("+", bin("+", f, str("-")), first) },
  { id: "remove-letter", levels: [0, 1, 2], letter: true, base: [If(bin("==", len(s), num(0)), [Ret(str(""))])], cond: X => eq(first, str(X)), ret: f => bin("+", first, f), swap: f => bin("+", f, first) },
  { id: "mirror", levels: [1, 2], base: [If(bin("==", len(s), num(0)), [Ret(str(""))])], ret: f => bin("+", bin("+", first, f), first), swap: f => bin("+", bin("+", f, first), first) },
  { id: "last-char-first", levels: [1, 2], base: [If(bin("==", len(s), num(0)), [Ret(str(""))])], custom: true },
  { id: "swap-pairs", levels: [2], base: [If(bin("<", len(s), num(2)), [Ret(s)])], pairs: true },
];
export const stringBuilder = { id: "string-builder", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], B = pick(SB.filter(x => x.levels.includes(L)), r), name = pick(NAMES.str, r), word = pick(WORDS[d], r);
  let body, swapBody, X = null;
  if (B.custom) { const last = sub(s, L1), init = sub(s, num(0), L1); body = [...B.base, Ret(bin("+", last, call(name, init)))]; swapBody = [...B.base, Ret(bin("+", call(name, init), last))]; }
  else if (B.pairs) { body = [...B.base, Ret(bin("+", bin("+", sub(s, num(1), num(2)), first), call(name, sub(s, num(2)))))]; swapBody = [...B.base, Ret(bin("+", bin("+", first, sub(s, num(1), num(2))), call(name, sub(s, num(2)))))]; }
  else if (B.letter) { const counts = {}; for (const ch of word) counts[ch] = (counts[ch] || 0) + 1; X = pick(Object.keys(counts), r);
    body = [...B.base, If(B.cond(X), [Ret(call(name, rest))]), Ret(B.ret(call(name, rest)))]; swapBody = [...B.base, If(B.cond(X), [Ret(call(name, rest))]), Ret(B.swap(call(name, rest)))]; }
  else { body = [...B.base, Ret(B.ret(call(name, rest)))]; swapBody = [...B.base, Ret(B.swap(call(name, rest)))]; }
  const mk = b => program([method(name, "String", [["String", "s"]], b)], name), prog = mk(body), res = exec(prog, name, [word]);
  const swapped = run(mk(swapBody), name, [word]), wrongBase = run(mk([...(B.custom ? [If(bin("==", len(s), num(0)), [Ret(str("?"))])] : []), ...body.slice(B.custom ? 1 : 0).map(x => x)]), name, [word]);
  const ask = pick(L === 0 ? ["value", "value", "argAt"] : ["value", "argAt", "calls"], r);
  const common = { r, difficulty: d, family: "string-builder", prog, callNote: `call: ${name}(${quote(word)})`, trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `string-builder:${B.id}:${ask}`, data: { word } };
  const jvm = { method: name, call: `${name}(${quote(word)})` };
  if (ask === "value") return Q({ ...common, prompt: `What does ${name}(${quote(word)}) return?`, answer: quote(res.value),
    distractors: [ok(swapped) && { value: quote(swapped.value), mis: "concatenation-order-swapped", why: "String + is not commutative: the left operand appears first." }, { value: quote(word), mis: "returns-input", why: "Each call builds a new string; the input is not returned unchanged." },
      { value: quote(res.log[1]?.ret ?? ""), mis: "one-level-short", why: "That is the result of the second call; the first call still adds its part." }, { value: quote([...res.value].reverse().join("")), mis: "reversed-result", why: "Build the result from the base case upward, keeping each concatenation's order." },
      B.letter && { value: quote(word.split(X).join("").length ? [...word].filter(ch => ch !== X).reverse().join("") : "?"), mis: "reversed-result", why: "Kept letters stay in their original order." }].filter(Boolean),
    explanation: `${B.letter ? `Letters equal to "${X}" are skipped; the others are kept in order` : "Each call handles part of the string and concatenates it with the recursive result"}. Returns from the base case up: ${fmtList(res.returns.map(x => quote(x.value)))}.`, jvm: { ...jvm, observe: "ret", quote: true } });
  if (ask === "argAt") { const i = int(1, Math.min(res.log.length - 1, 4), r), args = res.log.map(e => e.args[0]);
    return Q({ ...common, prompt: `What is s in call number ${i + 1} of ${name}(${quote(word)})? (The first call is call 1.)`, answer: quote(args[i]),
      distractors: [{ value: quote(args[i - 1]), mis: "off-by-one-call", why: "Call 1 receives the original string." }, { value: quote(args[i + 1] ?? ""), mis: "off-by-one-call", why: "Count calls from 1." }, { value: quote(B.custom ? word.slice(i) : word.slice(0, word.length - i)), mis: "wrong-end-removed", why: B.custom ? "s.substring(0, s.length() - 1) removes the last character." : "s.substring(1) removes the first character." }, { value: quote(word.slice(i + 1)), mis: "substring-index-misread", why: "substring(1) drops exactly one character." }].filter(x => x.value !== quote(undefined)),
      explanation: `Arguments by call: ${fmtList(args.map(quote))}.`, jvm: { ...jvm, observe: "argAt", call_index: i, param: 0, quote: true } }); }
  return Q({ ...common, prompt: `How many calls to ${name} are made for ${name}(${quote(word)}), including the first?`, answer: res.calls,
    distractors: [{ value: word.length, mis: "length-as-calls", why: "Check the base case: which string length stops the recursion?" }, { value: res.calls - 1, mis: "base-call-not-counted", why: "The base-case call counts." }, { value: res.calls + 1, mis: "extra-call-after-base", why: "Nothing is called after the base case." }, { value: word.length + 1, mis: "length-plus-one", why: "Count the actual arguments." }],
    explanation: `Arguments: ${fmtList(res.log.map(e => quote(e.args[0])))} — ${res.calls} calls.`, jvm: { ...jvm, observe: "calls" } });
} };

// ---- palindrome ----
export const palindrome = { id: "palindrome", mode: MODE, levels: [1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(["isPalindrome", "mirrored", "readsSame", "symmetric"], r);
  const pool = L === 1 ? ["LEVEL", "NOON", "RADAR", "STATS", "REFER", "ROTOR", "TENET", "CIVIC", "ROVER", "TOAST", "RACER", "STEMS", "SALTS"] : ["RACECAR", "REDIVIDER", "DEIFIED", "REPAPER", "ROTATOR", "REVIEWER", "DEFINED", "RECORDER", "MALAYALAM", "ROTAVATOR", "DECIDED"];
  const word = pick(pool, r), last = sub(s, L1);
  const body = [If(bin("<=", len(s), num(1)), [Ret({ k: "bool", v: true })]), If(not(eq(first, last)), [Ret({ k: "bool", v: false })]), Ret(call(name, sub(s, num(1), L1)))];
  const prog = program([method(name, "boolean", [["String", "s"]], body)], name), res = exec(prog, name, [word]);
  const ask = pick(["result-and-calls", "lastArg"], r), rv = String(res.value);
  const common = { r, difficulty: d, family: "palindrome", prog, callNote: `call: ${name}(${quote(word)})`, trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `palindrome:${res.value ? "true" : "false"}:${ask}`, data: { word } };
  if (ask === "result-and-calls") {
    const fmt = (b, c) => `${b} after ${c} call${c === 1 ? "" : "s"}`, full = Math.floor(word.length / 2) + 1;
    return Q({ ...common, prompt: `What does ${name}(${quote(word)}) return, and how many calls are made in total?`, answer: fmt(rv, res.calls),
      distractors: [{ value: fmt(String(!res.value), res.calls), mis: "mismatch-check-misread", why: "A mismatch between the first and last characters returns false immediately; otherwise the middle is checked." }, { value: fmt(rv, res.value ? full + 1 : res.calls + 1), mis: "extra-call-after-base", why: res.value ? "A string of length 0 or 1 is the base case; nothing is called after it." : "The call that finds the mismatch returns false without another recursive call." }, { value: fmt("true", full), mis: "no-early-exit", why: "When characters differ the method returns false without recursing further." }, { value: fmt(rv, word.length), mis: "one-call-per-character", why: "Each call removes two characters (first and last)." }, { value: fmt(rv, res.calls - 1), mis: "base-call-not-counted", why: "Count the first call too." }],
      explanation: `${res.calls} calls: ${fmtList(res.log.map(e => quote(e.args[0])))}. ${res.value ? "Every pair matched and the middle reached length ≤ 1, so true is returned." : "A pair of characters did not match, so false is returned and passed back up."}`, jvm: { method: name, call: `${name}(${quote(word)})`, observe: "retAndCalls" } });
  }
  const args = res.log.map(e => e.args[0]), lastArg = args.at(-1);
  return Q({ ...common, prompt: `What string is passed to the last call made by ${name}(${quote(word)})?`, answer: quote(lastArg),
    distractors: [{ value: quote(args.at(-2) ?? word), mis: "base-call-not-counted", why: "That call still recurses." }, { value: quote(word.slice(1)), mis: "only-first-removed", why: "substring(1, s.length() - 1) removes both ends." }, { value: quote(""), mis: "always-reaches-empty", why: res.value ? "Odd-length strings stop at one character." : "A mismatch stops the recursion early." }, { value: quote(word.slice(Math.floor(word.length / 2), Math.floor(word.length / 2) + 1)), mis: "always-reaches-middle", why: "A mismatch can stop the recursion before the middle." }, { value: quote(word.slice(2, -2)), mis: "two-from-each-end", why: "Each call removes one character from each end." }],
    explanation: `Arguments: ${fmtList(args.map(quote))}.`, jvm: { method: name, call: `${name}(${quote(word)})`, observe: "lastArgQuoted" } });
} };

// ---- counting a character ----
export const countChar = { id: "count-char", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(["countLetter", "occurrences", "tallyLetter", "matches"], r), word = pick(WORDS[d].filter(w => new Set(w).size < w.length) .concat(WORDS[d]), r);
  const X = pick([...word, pick(["E", "Z", "O"], r)], r), variant = pick(L === 0 ? ["ternary"] : ["ternary", "if-return", "last-char"], r);
  const lastS = sub(s, L1), init = sub(s, num(0), L1);
  const body = variant === "ternary" ? [If(bin("==", len(s), num(0)), [Ret(num(0))]), Decl("int", "here", tern(eq(first, str(X)), num(1), num(0))), Ret(bin("+", v("here"), call(name, rest)))]
    : variant === "if-return" ? [If(bin("==", len(s), num(0)), [Ret(num(0))]), If(eq(first, str(X)), [Ret(bin("+", num(1), call(name, rest)))]), Ret(call(name, rest))]
    : [If(bin("==", len(s), num(0)), [Ret(num(0))]), If(eq(lastS, str(X)), [Ret(bin("+", num(1), call(name, init)))]), Ret(call(name, init))];
  const prog = program([method(name, "int", [["String", "s"]], body)], name), res = exec(prog, name, [word]), c = res.value;
  return Q({ r, difficulty: d, family: "count-char", prog, callNote: `call: ${name}(${quote(word)})`, prompt: `What does ${name}(${quote(word)}) return?`, answer: c,
    distractors: [{ value: c + 1, mis: "base-counts-one", why: "The empty string contributes 0." }, { value: word.length - c, mis: "counts-non-matches", why: `Only characters equal to "${X}" add 1.` }, { value: c === 0 ? 1 : c - 1, mis: c === 0 ? "assumes-match" : "first-char-skipped", why: c === 0 ? `"${X}" does not occur in ${quote(word)}.` : "The first call checks a character too." }, { value: word.length, mis: "counts-all-characters", why: "Characters that do not match add 0." }, { value: res.calls, mis: "calls-as-value", why: "That is the number of calls." }],
    explanation: `${variant === "last-char" ? "Each call checks the last character and recurses on the rest" : "Each call checks the first character and recurses on the rest"}; "${X}" occurs ${c} time${c === 1 ? "" : "s"} in ${quote(word)}.`,
    trace: traceLines(res), callCount: res.calls, callDepth: res.maxDepth, reasoning: `count-char:${variant}:${c === 0 ? "absent" : "present"}`, data: { word, letter: X }, jvm: { method: name, call: `${name}(${quote(word)})`, observe: "ret" } });
} };

// ---- string printed around the call ----
export const stringPrintAround = { id: "string-print-around", mode: MODE, levels: [0, 1, 2], build(d, r) {
  const L = LEVEL[d], name = pick(NAMES.str, r), word = pick(WORDS[d].filter(w => w.length <= (L === 0 ? 4 : 6)), r);
  const variant = pick(L === 0 ? ["surround", "last-before", "last-after"] : ["surround", "last-before", "last-after", "surround-rest", "bracket"], r);
  const lastS = sub(s, L1), init = sub(s, num(0), L1);
  const B = { surround: [Print(first), Do(call(name, rest)), Print(first)], "last-before": [Print(lastS), Do(call(name, init))], "last-after": [Do(call(name, init)), Print(lastS)],
    "surround-rest": [Print(first), Do(call(name, rest)), Print(bin("+", str("."), first))], bracket: [Print(str("[")), Do(call(name, rest)), Print(bin("+", first, str("]")))] };
  const mk = b => program([method(name, "void", [["String", "s"]], [If(bin("==", len(s), num(0)), [Ret()]), ...b])], name);
  const prog = mk(B[variant]), res = exec(prog, name, [word]);
  const flip = b => { const i = b.findIndex(x => x.k === "expr"); return [...b.slice(i), ...b.slice(0, i)]; };
  const wrongEnd = run(mk(JSON.parse(JSON.stringify(B[variant]).replaceAll(JSON.stringify(init), "__REST__").replaceAll(JSON.stringify(rest), JSON.stringify(init)).replaceAll("__REST__", JSON.stringify(rest)))), name, [word]);
  const flipped = run(mk(flip(B[variant])), name, [word]), noPost = run(mk(B[variant].slice(0, B[variant].findIndex(x => x.k === "expr") + 1)), name, [word]);
  return Q({ r, difficulty: d, family: "string-print-around", prog, callNote: `call: ${name}(${quote(word)})`, prompt: `What is printed by ${name}(${quote(word)})?`, answer: res.out,
    distractors: [{ value: flipped.out, mis: "pre-post-swapped", why: "Statements above the recursive call run on the way down; statements below run on the way back up." }, noPost.out !== res.out && { value: noPost.out, mis: "post-call-work-skipped", why: "After the recursive call returns, the rest of the method still runs." }, { value: [...res.out].reverse().join(""), mis: "output-reversed", why: "Follow the order statements execute." }, !wrongEnd.error && { value: wrongEnd.out, mis: "wrong-end-removed", why: "Check which end of the string the recursive call's substring removes." }, { value: res.out.slice(0, -1), mis: "last-output-missed", why: "The first call's final print runs last." }, { value: word, mis: "prints-input", why: "Trace each call's prints." }].filter(Boolean),
    explanation: `Arguments: ${fmtList(res.log.map(e => quote(e.args[0])))}. Output: ${res.out}.`, trace: traceLines(res, { showReturns: false }).concat(`output: ${res.out}`), callCount: res.calls, callDepth: res.maxDepth,
    reasoning: `string-print-around:${variant}:output`, data: { word }, jvm: { method: name, call: `${name}(${quote(word)})`, isVoid: true, observe: "out" } });
} };
export default [printAroundCall, branchingOutput, stringBuilder, palindrome, countChar, stringPrintAround];
