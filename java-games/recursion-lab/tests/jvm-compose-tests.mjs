// Independent JVM verification of compositional questions.
// Every answer is re-derived from real JVM execution (instrumented call/return/array logs);
// debugging questions are judged against reference implementations written HERE, not the generator's specs.
// Usage: node tests/jvm-compose-tests.mjs [perCell=60] [seed=2026]
import { generateRecursion, seededRandom, modeNames, difficulties } from "../engine.js";
import { harness, parseObs } from "./jvm/instrument.mjs"; import { runJava } from "./jvm/jvm.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const per = +(process.argv[2] || 60), seed = +(process.argv[3] || 2026);
const strip = code => code.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
const brace = s => s.replace(/^\[/, "{").replace(/\]$/, "}");
const lit = x => Array.isArray(x) ? `new int[]{${x.join(", ")}}` : typeof x === "string" ? JSON.stringify(x) : String(x);
const listFmt = xs => `{${xs.join(", ")}}`;
// ---- independent references for the debugging programs (written separately from compose/debug.js) ----
const REF = {
  "sum-to": ([n]) => { let s = 0; for (let k = 1; k <= n; k++) s += k; return s; },
  "factorial": ([n]) => { let p = 1; for (let k = n; k > 1; k--) p *= k; return p; },
  "power": ([b, e]) => { let p = 1; for (let k = 0; k < e; k++) p *= b; return p; },
  "count-digits": ([n]) => n.toString().length,
  "count-down": ([n]) => { let s = ""; for (let k = n; k >= 1; k--) s += k + " "; return s; },
  "digit-sum": ([n]) => [...n.toString()].reduce((s, c) => s + Number(c), 0),
  "reverse": ([s]) => s.split("").reverse().join(""),
  "array-sum": ([a, i]) => a.slice(i).reduce((s, x) => s + x, 0),
  "array-max": ([a, i]) => a.slice(i).reduce((m, x) => x > m ? x : m, -Infinity),
  "contains": ([a, i, t]) => a.slice(i).indexOf(t) >= 0,
  "count-letter": ([s]) => s.split("A").length - 1,
  "palindrome": ([s]) => { for (let x = 0, y = s.length - 1; x < y; x++, y--) if (s[x] !== s[y]) return false; return true; },
};
const refOk = (pid, args, beh) => {
  if (beh.exc) return false;
  if (pid === "binary-search") { const [a, lo, hi, t] = args, v = Number(beh.ret); return v === -1 ? !a.slice(lo, hi + 1).includes(t) : a[v] === t && v >= lo && v <= hi; }
  const want = REF[pid](args); return pid === "count-down" ? beh.out === want : beh.ret === String(want);
};

const questions = [], programs = [], plan = []; let id = 0, cell = 0;
for (const mode of Object.keys(modeNames)) for (const d of difficulties) {
  const r = seededRandom(seed + 7919 * ++cell); let got = 0, guard = 0;
  while (got < per && guard++ < per * 40) { const q = generateRecursion(mode, r, d); if (q.generator === "legacy") continue; got++; questions.push(q); }
}
function add(spec) { const name = `Q${id++}`; programs.push({ name, source: harness(name, spec.code, spec) }); return name; }
for (const [qi, q] of questions.entries()) {
  const j = q.data.jvm, code = strip(q.code), P = { qi, q, runs: {} };
  const base = { code, method: j.method, setup: j.setup || "", isVoid: !!j.isVoid };
  const callOf = (args) => `${j.method}(${args.map(lit).join(", ")})`;
  switch (j.observe) {
    case "stopSet": for (const x of j.range) P.runs[x] = add({ ...base, call: `${j.method}(${x})` }); break;
    case "terminationChoice": for (const [k, c] of Object.entries(j.candidates)) P.runs[k] = add({ ...base, call: c }); break;
    case "loopEquivalence": for (const nsz of j.sampleSizes) { const arr = Array.from({ length: nsz }, (_, k) => 10 + 7 * k);
        P.runs[`rec|${nsz}`] = add({ ...base, isVoid: true, setup: `int[] a = {${arr.join(", ")}};`, call: j.recursiveCall });
        for (const header of Object.keys(j.loops)) P.runs[`${header}|${nsz}`] = add({ code: `static void loop(int[] a) {\n    ${header} {\n        System.out.print(a[i] + " ");\n    }\n}`, method: "loop", setup: `int[] a = {${arr.join(", ")}};`, call: "loop(a)", isVoid: true }); } break;
    case "fixChoice": P.tests = [...j.tests, j.setupArgs]; for (const [txt, src] of Object.entries(j.candidates)) P.tests.forEach((args, ti) => { P.runs[`${txt}|${ti}`] = add({ code: src, method: j.method, call: callOf(args), isVoid: j.out }); }); break;
    case "symptom": P.runs.main = add({ code: j.buggy, method: j.method, call: callOf(j.setupArgs), isVoid: j.out }); break;
    case "faultyLine": P.tests = [...j.tests, j.setupArgs]; P.tests.forEach((args, ti) => { P.runs[`good|${ti}`] = add({ code: j.good, method: j.method, call: callOf(args), isVoid: j.out }); P.runs[`bad|${ti}`] = add({ code: j.buggy, method: j.method, call: callOf(args), isVoid: j.out }); }); break;
    case "revealChoice": for (const [k, args] of Object.entries(j.candidates)) P.runs[k] = add({ code: j.buggy, method: j.method, call: callOf(args), isVoid: j.out }); break;
    default: P.runs.main = add({ ...base, call: j.call, after: /array|retAndArray/i.test(j.observe) ? ["a"] : [] });
  }
  plan.push(P);
}
const t0 = Date.now(); const res = runJava(programs, { timeoutMs: 4000 });
const obs = name => { const v = res.get(name); if (!v || v.status === "COMPILE") throw Error(`compile: ${v?.error}`); if (v.status === "TIMEOUT") return { exc: "Timeout", log: [], rets: [], events: [], arrays: [], after: [], out: "" }; return parseObs(v.stdout); };
function pairs(o) { const st = [], out = []; for (const e of o.events) { if (e.type === "C") st.push(e); else if (e.type === "R") { const c = st.pop(); out.push({ args: c.text, value: e.text }); } } return out; }
const argsOf = e => e.args.split(",").filter(x => x !== "arr");
const tally = {}, failures = [];
for (const P of plan) {
  const q = P.q, j = q.data.jvm, key = `${q.mode}/${q.difficulty}`; tally[key] ??= { questions: 0, agree: 0, distractorEqualsTruth: 0, programs: 0 };
  const T = tally[key]; T.questions++; T.programs += Object.keys(P.runs).length;
  let truth;
  try {
    const o = P.runs.main ? obs(P.runs.main) : null, L = o?.log;
    switch (j.observe) {
      case "ret": truth = o.exc ? `EXC ${o.exc}` : j.quote ? JSON.stringify(o.ret) : o.ret; break;
      case "calls": truth = String(o.calls); break;
      case "depth": truth = String(o.maxDepth); break;
      case "out": truth = j.trim ? o.out.trim() : o.out; break;
      case "argSequence": truth = L.map(e => argsOf(e)[0]).join(", "); break;
      case "lastArg": truth = argsOf(L.at(-1))[0]; break;
      case "leaves": truth = String(L.filter((e, k) => !(L[k + 1] && L[k + 1].depth > e.depth)).length); break;
      case "countArg": truth = String(L.filter(e => argsOf(e)[0] === j.arg).length); break;
      case "elseCount": { const seq = L.map(e => +argsOf(e)[0]); const pred = { "even-half-odd-minus": x => x % 2 !== 0, "even-half-odd-plus": x => x % 2 !== 0, "three-third-else-minus": x => x % 3 !== 0, "big-minus-small-half": x => !(x > 10) }[j.cond]; truth = String(seq.slice(0, -1).filter(pred).length); break; }
      case "baseChoice": truth = o.exc === "StackOverflowError" ? j.divergeChoice : j.valueToChoice[o.ret]; break;
      case "retOf": truth = pairs(o).find(p => p.args === j.arg)?.value; break;
      case "returnOrder": truth = o.rets.map(x => x.value).join(", "); break;
      case "lastCall": truth = `${j.name}(${argsOf(L.at(-1)).join(", ")})`; break;
      case "argAt": truth = argsOf(L[j.call_index])[j.param]; break;
      case "outToken": truth = o.out.trim().split(" ")[j.index]; break;
      case "outCount": truth = String(o.out.trim().split(" ").filter(x => x === j.token).length); break;
      case "retAndCalls": truth = `${o.ret} after ${o.calls} call${o.calls === 1 ? "" : "s"}`; break;
      case "lastArgQuoted": truth = argsOf(L.at(-1))[0]; break;
      case "childRanges": truth = L.filter(e => e.depth === 2).map(e => argsOf(e).slice(0, 2).join("..")).join(" and "); break;
      case "lastArgs": { const names = (q.code.match(/\(int\[\] a, int (\w+), int (\w+)/) || []).slice(1); const v = argsOf(L.at(-1)); truth = `${names[0]} = ${v[0]}, ${names[1]} = ${v[1]}`; break; }
      case "argList": { const v = L.map(e => argsOf(e)[0]); truth = (j.dropLast ? v.slice(0, -1) : v).join(", "); break; }
      case "arrayAfter": truth = brace(o.after[0]); break;
      case "arrayElement": truth = String(JSON.parse(o.after[0])[j.index]); break;
      case "retAndArray": truth = `returns ${o.ret}; a = ${brace(o.after[0])}`; break;
      case "bsMids": { const mids = []; for (let k = 0; k < L.length; k++) { const [lo, hi] = argsOf(L[k]).slice(0, 2).map(Number); if (lo > hi) continue; const nx = L[k + 1]; if (!nx) { mids.push(Number(o.ret)); continue; } const [lo2, hi2] = argsOf(nx).slice(0, 2).map(Number); mids.push(lo2 !== lo ? lo2 - 1 : hi2 + 1); } truth = mids.join(", "); break; }
      case "secondChildEntryArray": truth = brace(o.arrays.filter(x => x.depth === 2)[1].value); break;
      case "firstChildEntryArray": truth = brace(o.arrays.filter(x => x.depth === 2)[0].value); break;
      case "lastMergeHalves": { const arr = JSON.parse(o.arrays.at(-1).value), [lo, mid, hi] = argsOf(L.at(-1)).map(Number); truth = `${listFmt(arr.slice(lo, mid + 1))} and ${listFmt(arr.slice(mid + 1, hi + 1))}`; break; }
      case "arrayAfterNthCall": truth = brace(o.arrays[j.n + 1].value); break;
      case "firstReturn": truth = o.rets[0].value; break;
      case "entryArrayAt": truth = brace(o.arrays[j.index].value); break;
      case "stopSet": { const stops = Object.entries(P.runs).filter(([, nm]) => obs(nm).calls === 1).map(([x]) => x).sort((x, y) => x - y).join(","); const m = Object.entries(j.choiceSets).filter(([t, set]) => set === stops && q.choices.includes(t)); truth = m.length === 1 ? m[0][0] : `AMBIGUOUS(${m.length})`; break; }
      case "terminationChoice": { const m = Object.entries(P.runs).filter(([, nm]) => (obs(nm).exc === "StackOverflowError") === j.wantOverflow).map(([k]) => k); truth = m.length === 1 ? m[0] : `AMBIGUOUS(${m.length})`; break; }
      case "loopEquivalence": { const m = Object.keys(j.loops).filter(h => j.sampleSizes.every(nsz => obs(P.runs[`${h}|${nsz}`]).out === obs(P.runs[`rec|${nsz}`]).out)); truth = m.length === 1 ? m[0] : `AMBIGUOUS(${m.length})`; break; }
      case "fixChoice": { const m = Object.keys(j.candidates).filter(txt => P.tests.every((args, ti) => refOk(j.programId, args, obs(P.runs[`${txt}|${ti}`])))); truth = m.length === 1 ? m[0] : `AMBIGUOUS(${m.length})`; break; }
      case "symptom": { const b = obs(P.runs.main), isStr = /static String /.test(j.buggy); truth = b.exc ? `Throws ${b.exc}` : j.out ? (b.out === "" ? "Prints nothing" : `Prints ${b.out.trim()}`) : `Returns ${isStr ? JSON.stringify(b.ret) : b.ret}`; if (refOk(j.programId, j.setupArgs, b)) truth = "BUG-NOT-SHOWN"; break; }
      case "faultyLine": { const A = j.buggy.split("\n"), B = j.good.split("\n"), diff = A.map((l, k) => l !== B[k] ? l.trim() : null).filter(Boolean);
        const goodOk = P.tests.every((args, ti) => refOk(j.programId, args, obs(P.runs[`good|${ti}`]))), badFails = P.tests.some((args, ti) => !refOk(j.programId, args, obs(P.runs[`bad|${ti}`])));
        truth = goodOk && badFails && diff.length === 1 && A.length === B.length ? diff[0] : `INVALID(goodOk=${goodOk},badFails=${badFails},diff=${diff.length})`; break; }
      case "revealChoice": { const m = Object.entries(j.candidates).filter(([k, args]) => refOk(j.programId, args, obs(P.runs[k])) === j.wantCorrect).map(([k]) => k); truth = m.length === 1 ? m[0] : `AMBIGUOUS(${m.length})`; break; }
      default: truth = `UNHANDLED ${j.observe}`;
    }
  } catch (e) { truth = `ERROR ${e.message.slice(0, 300)}`; }
  if (String(truth) === q.answer) T.agree++; else failures.push({ key, family: q.family, observe: j.observe, prompt: q.prompt, answer: q.answer, jvm: truth, code: q.code });
  if (q.choices.some(c => c !== q.answer && c === String(truth))) { T.distractorEqualsTruth++; failures.push({ key, family: q.family, why: "a distractor equals the JVM truth", prompt: q.prompt }); }
}
let tq = 0, ta = 0; for (const v of Object.values(tally)) { tq += v.questions; ta += v.agree; }
const summary = { perCell: per, seed, questions: tq, agree: ta, programsRun: programs.length, seconds: Math.round((Date.now() - t0) / 1000), failures: failures.length, tally };
mkdirSync(new URL("../test-results/", import.meta.url), { recursive: true });
writeFileSync(new URL(`../test-results/jvm-compose-${seed}.json`, import.meta.url), JSON.stringify({ ...summary, failures }, null, 2));
console.log(JSON.stringify({ questions: tq, agree: ta, programsRun: programs.length, seconds: summary.seconds, failures: failures.length }));
for (const f of failures.slice(0, 6)) console.log(JSON.stringify(f).slice(0, 900));
if (failures.length) process.exit(1);
