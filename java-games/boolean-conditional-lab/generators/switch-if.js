/* Switch vs. If/Else. Supported language level: traditional Java switch
 * statements (Java 7+ for String selectors; no arrow labels, no switch
 * expressions, no pattern matching). Every snippet is simulated with Java
 * semantics; wrong answers come from simulating modeled misconceptions. */
import { pick, int, chance, shuffle, sample, reject, retry, range, join } from "./core.js";
import { challenge } from "./schema.js";

const MODE = "switchIf";
const SKILL = {
  "simple-select": "Trace which case executes", "default-behavior": "Analyze unmatched selector values", "fall-through": "Trace fall-through when break is omitted",
  "multi-label": "Trace several labels sharing a block", "break-placement": "Analyze early termination inside a case", "string-accumulation": "Track accumulated String output",
  "numeric-state": "Trace arithmetic updates across cases", "boolean-state": "Trace Boolean flag updates across cases", "convert-to-if": "Identify an equivalent if/else conversion",
  "conversion-counterexample": "Find an input where two implementations differ", "missing-break-fix": "Choose the correction that prevents unintended fall-through",
  reachability: "Determine which cases are reachable", "multi-statement": "Trace a complete multi-statement case block", "combined-conditional": "Analyze a switch combined with an if statement",
  "execution-sequence": "Predict the sequence of executed case bodies", "reverse-trace": "Find a selector value that produces a given output",
};
export const FAMILIES = {
  Beginner: ["simple-select", "default-behavior", "fall-through", "multi-label", "string-accumulation", "numeric-state", "missing-break-fix", "execution-sequence", "reverse-trace"],
  Intermediate: ["simple-select", "default-behavior", "fall-through", "multi-label", "break-placement", "string-accumulation", "numeric-state", "boolean-state", "convert-to-if", "conversion-counterexample", "missing-break-fix", "reachability", "multi-statement", "combined-conditional", "execution-sequence", "reverse-trace"],
  Advanced: ["default-behavior", "fall-through", "multi-label", "break-placement", "string-accumulation", "numeric-state", "boolean-state", "convert-to-if", "conversion-counterexample", "missing-break-fix", "reachability", "multi-statement", "combined-conditional", "execution-sequence", "reverse-trace"],
};
const WEIGHT = { "simple-select": 0, "default-behavior": 0.5, "fall-through": 1, "multi-label": 1, "break-placement": 1.5, "string-accumulation": 1, "numeric-state": 1.5, "boolean-state": 1.5, "convert-to-if": 3, "conversion-counterexample": 3, "missing-break-fix": 2.5, reachability: 2.5, "multi-statement": 2, "combined-conditional": 2, "execution-sequence": 1, "reverse-trace": 2 };
const LEVEL = {
  Beginner: { cases: [2, 3], stmts: [1, 1], missing: [0, 1], defaultPos: ["last", "last", "none"], multi: 0.2 },
  Intermediate: { cases: [3, 4], stmts: [1, 2], missing: [1, 2], defaultPos: ["last", "last", "middle", "none"], multi: 0.35 },
  Advanced: { cases: [4, 5], stmts: [2, 3], missing: [1, 3], defaultPos: ["middle", "first", "last"], multi: 0.5 },
};

// ---------- selectors ----------
const WORDS = ["red", "blue", "green", "gold", "gray", "pink", "teal", "plum"];
const SEL = {
  int: rng => ({ type: "int", name: pick(["n", "day", "code", "level", "choice", "option", "month", "slot"], rng), pool: (() => { const s = int(0, 6, rng), step = pick([1, 1, 1, 2, 3, 5, 10], rng); return range(0, 7).map(i => s + i * step); })() }),
  char: rng => ({ type: "char", name: pick(["grade", "key", "letter", "cmd", "tier"], rng), pool: shuffle(["A", "B", "C", "D", "E", "F", "N", "Q", "S", "X", "Y", "Z"], rng).slice(0, 8).sort() }),
  String: rng => ({ type: "String", name: pick(["color", "size", "mode", "team", "plan"], rng), pool: shuffle(WORDS, rng).slice(0, 7) }),
};
const lit = (type, v) => type === "char" ? `'${v}'` : type === "String" ? `"${v}"` : String(v);
const MARKS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "M", "P", "R", "T", "W"];

// ---------- statements ----------
// {k:print,s} {k:append,v,s} {k:add|sub|mul|set,v,n} {k:flag,v,val} {k:toggle,v} {k:ifBreak,cond} {k:if,cond,then}
const condText = c => `${c.v} ${c.op} ${c.c}`;
function stmtText(s) {
  switch (s.k) {
    case "print": return `System.out.print("${s.s}");`;
    case "append": return `${s.v} += "${s.s}";`;
    case "add": return `${s.v} += ${s.n};`;
    case "sub": return `${s.v} -= ${s.n};`;
    case "mul": return `${s.v} *= ${s.n};`;
    case "set": return `${s.v} = ${s.n};`;
    case "flag": return `${s.v} = ${s.val};`;
    case "toggle": return `${s.v} = !${s.v};`;
    case "ifBreak": return `if (${condText(s.cond)}) break;`;
    case "if": return `if (${condText(s.cond)}) ${stmtText(s.then)}`;
  }
}
const CMP = { "<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b, "==": (a, b) => a === b, "!=": (a, b) => a !== b };
function exec(s, st) { // returns "break" when a conditional break fires
  switch (s.k) {
    case "print": st.printed += s.s; return;
    case "append": st.vars[s.v] += s.s; return;
    case "add": st.vars[s.v] += s.n; return;
    case "sub": st.vars[s.v] -= s.n; return;
    case "mul": st.vars[s.v] *= s.n; return;
    case "set": st.vars[s.v] = s.n; return;
    case "flag": st.vars[s.v] = s.val; return;
    case "toggle": st.vars[s.v] = !st.vars[s.v]; return;
    case "ifBreak": return CMP[s.cond.op](st.vars[s.cond.v], s.cond.c) ? "break" : undefined;
    case "if": if (CMP[s.cond.op](st.vars[s.cond.v], s.cond.c)) return exec(s.then, st); return;
  }
}

// ---------- the switch model ----------
// sw = {sel:{type,name}, state:[{type,name,init}], cases:[{labels:[...]|null(default), body:[stmts], brk}], after:[stmts], printAfter:[var]}
export function printSwitch(sw, value, { declareSelector = true } = {}) {
  const L = [];
  if (declareSelector) L.push(`${sw.sel.type} ${sw.sel.name} = ${lit(sw.sel.type, value)};`);
  for (const v of sw.state) L.push(`${v.type} ${v.name} = ${v.type === "String" ? `"${v.init}"` : v.init};`);
  L.push(`switch (${sw.sel.name}) {`);
  for (const c of sw.cases) {
    if (c.labels) for (const l of c.labels) L.push(`    case ${lit(sw.sel.type, l)}:`); else L.push("    default:");
    for (const s of c.body) L.push(`        ${stmtText(s)}`);
    if (c.brk) L.push("        break;");
  }
  L.push("}");
  for (const s of sw.after || []) L.push(stmtText(s));
  for (const v of sw.printAfter || []) L.push(`System.out.print(${v});`);
  return L.join("\n");
}
const footer = sw => sw.state.map(v => `System.out.print("|${v.name}=" + ${v.name});`).join("\n");
export const program = sw => ({ params: [[sw.sel.type, sw.sel.name]], body: `${printSwitch(sw, null, { declareSelector: false })}\n${footer(sw)}` });

/** Simulate with Java semantics, or with a named misconception. */
export function simulate(sw, value, mis = null) {
  const st = { printed: "", vars: Object.fromEntries(sw.state.map(v => [v.name, v.init])), trace: [] };
  let cases = sw.cases.map((c, i) => ({ ...c, idx: i }));
  if (mis === "default-runs-last") { const d = cases.find(c => !c.labels); if (d) cases = [...cases.filter(c => c.labels), d]; }
  let start = cases.findIndex(c => c.labels && c.labels.includes(value));
  if (mis === "matches-next-case" && start >= 0) start = start + 1 < cases.length ? start + 1 : -1;
  const unmatched = start < 0;
  if (start < 0) start = mis === "ignores-default" ? -1 : mis === "unmatched-runs-first-case" ? 0 : cases.findIndex(c => !c.labels);
  const runFrom = (from, stopAtBreak) => {
    for (let i = from; i >= 0 && i < cases.length; i++) {
      const c = cases[i]; st.trace.push(c.idx); let broke = false;
      for (const s of c.body) { const r = exec(s, st); if (r === "break" && mis !== "ignores-conditional-break") { broke = true; break; } }
      if (broke) return;
      if (mis === "no-fall-through") return;
      if (c.brk && stopAtBreak) return;
    }
  };
  if (mis === "runs-every-case") runFrom(0, false);
  else if (mis === "ignores-break") runFrom(start, false);
  else runFrom(start, true);
  if (mis === "default-always-runs") { const d = cases.findIndex(c => !c.labels); if (d >= 0 && !st.trace.includes(cases[d].idx)) { st.trace.push(cases[d].idx); for (const s of cases[d].body) { if (exec(s, st) === "break") break; } } }
  for (const s of sw.after || []) exec(s, st);
  for (const v of sw.printAfter || []) st.printed += String(st.vars[v]);
  st.out = `${st.printed}${sw.state.map(v => `|${v.name}=${st.vars[v.name]}`).join("")}`;
  return st;
}
const MISCONCEPTIONS = ["no-fall-through", "ignores-break", "default-always-runs", "default-runs-last", "matches-next-case", "runs-every-case", "ignores-conditional-break", "ignores-default", "unmatched-runs-first-case"];

// ---------- random switch construction ----------
function bodyFor(rng, kind, n, ctx) {
  const out = [];
  if (kind === "print" || kind === "append") n = 1; // extra letters add length, not reasoning
  for (let i = 0; i < n; i++) {
    const k = kind === "mixed" ? pick(ctx.kinds, rng) : kind;
    if (k === "print") out.push({ k: "print", s: ctx.mark() });
    else if (k === "append") out.push({ k: "append", v: ctx.strVar, s: ctx.mark() });
    else if (k === "num") { const op = pick(ctx.numOps, rng); out.push({ k: op, v: pick(ctx.numVars, rng), n: op === "mul" ? int(2, 3, rng) : op === "set" ? int(0, 9, rng) : int(1, 9, rng) }); }
    else if (k === "flag") out.push(chance(0.4, rng) ? { k: "toggle", v: pick(ctx.flagVars, rng) } : { k: "flag", v: pick(ctx.flagVars, rng), val: chance(0.5, rng) });
  }
  return out;
}
const FLAGS = [["ready", "locked"], ["open", "alarm"], ["valid", "saved"], ["active", "paused"], ["lit", "muted"]];
const NUMS = [["total"], ["score"], ["count"], ["points"], ["x", "y"], ["a", "b"], ["sum", "steps"]];
function buildSwitch(rng, L, o = {}) {
  const lv = LEVEL[L];
  const selType = o.selType || pick(L === "Beginner" ? ["int", "int", "char"] : ["int", "int", "char", "String"], rng);
  const sel = SEL[selType](rng);
  const nCases = o.nCases ?? int(...lv.cases, rng);
  const defaultPos = o.defaultPos || pick(lv.defaultPos, rng);
  let pool = [...sel.pool]; if (selType === "int" && chance(0.5, rng)) pool = pool.slice(0, 7);
  const labelVals = shuffle(pool, rng);
  const cases = [];
  let marks = shuffle(MARKS, rng), mi = 0; const mark = () => marks[mi++ % marks.length];
  const kind = o.kind || "print";
  const ctx = { mark, strVar: "out", numVars: pick(NUMS, rng), flagVars: pick(FLAGS, rng), numOps: L === "Beginner" ? ["add", "add", "sub"] : ["add", "sub", "mul", "set"], kinds: o.kinds || ["num", "flag"] };
  const multi = o.multi ?? chance(lv.multi, rng);
  const multiIdx = multi ? int(0, nCases - 1, rng) : -1;
  for (let i = 0; i < nCases; i++) {
    const nl = i === multiIdx ? int(2, 3, rng) : 1;
    cases.push({ labels: labelVals.splice(0, nl), body: bodyFor(rng, kind, o.stmts ?? int(...lv.stmts, rng), ctx), brk: true });
  }
  if (multi && !cases.some(c => c.labels.length > 1)) { cases[0].labels.push(labelVals.shift()); }
  // ordered labels look natural for ints/chars; Strings stay in written order
  if (selType !== "String" && !o.shuffledOrder) cases.sort((a, b) => (selType === "int" ? a.labels[0] - b.labels[0] : a.labels[0].localeCompare(b.labels[0])));
  for (const c of cases) if (selType !== "String") c.labels.sort((a, b) => selType === "int" ? a - b : a.localeCompare(b));
  if (defaultPos !== "none") {
    const d = { labels: null, body: bodyFor(rng, kind, o.stmts ?? int(...lv.stmts, rng), ctx), brk: false };
    const at = defaultPos === "first" ? 0 : defaultPos === "middle" ? int(1, cases.length - 1, rng) : cases.length;
    cases.splice(at, 0, d);
    if (at < cases.length - 1) d.brk = true; // a default that is not last normally has break unless removed below
  }
  // remove breaks to create fall-through (never on the final case, where it is meaningless)
  const missing = o.missing ?? int(...lv.missing, rng);
  const breakable = cases.slice(0, -1).map((c, i) => i);
  for (const i of sample(breakable, Math.min(missing, breakable.length), rng)) cases[i].brk = false;
  const last = cases[cases.length - 1]; last.brk = last.labels ? chance(0.5, rng) : false; // optional trailing break
  const state = [];
  if (kind === "append") state.push({ type: "String", name: "out", init: "" });
  if (kind === "num" || (kind === "mixed" && ctx.kinds.includes("num"))) for (const v of ctx.numVars) state.push({ type: "int", name: v, init: int(0, 10, rng) });
  if (kind === "flag" || (kind === "mixed" && ctx.kinds.includes("flag"))) for (const v of ctx.flagVars) state.push({ type: "boolean", name: v, init: chance(0.5, rng) });
  const sw = { sel, state, cases, after: [], printAfter: kind === "append" ? ["out"] : [] };
  // drop state variables that are never touched
  const used = new Set(); const touch = s => { if (s.v) used.add(s.v); if (s.then) touch(s.then); if (s.cond) used.add(s.cond.v); };
  sw.cases.forEach(c => c.body.forEach(touch));
  sw.state = sw.state.filter(v => used.has(v.name));
  return sw;
}
const labelsOf = sw => sw.cases.flatMap(c => c.labels || []);
function outsider(sw, rng) {
  const ls = labelsOf(sw);
  const cands = sw.sel.type === "int" ? range(-1, 60).filter(v => !ls.includes(v)) : sw.sel.type === "char" ? "ABCDEFGHJKLMNPQRSTUVWXYZ".split("").filter(v => !ls.includes(v)) : [...WORDS, "black", "white"].filter(v => !ls.includes(v));
  return pick(cands, rng);
}
const caseName = (sw, i) => sw.cases[i].labels ? `case ${lit(sw.sel.type, sw.cases[i].labels[sw.cases[i].labels.length - 1])}` : "default";
const fmtOut = s => s === "" ? "(nothing is printed)" : s;
const fmtState = (sw, st, keys) => keys.map(k => `${k} = ${st.vars[k]}`).join(", ");
function complexity(L, fam, sw, value, extra = 0) {
  const st = simulate(sw, value);
  const executed = new Set(st.trace).size;
  const hops = Math.max(0, st.trace.length - 1);
  const muts = st.trace.reduce((s, i) => s + sw.cases[i].body.filter(x => x.k !== "print").length, 0);
  const conds = sw.cases.reduce((s, c) => s + c.body.filter(x => x.k === "if" || x.k === "ifBreak").length, 0) + (sw.after || []).filter(x => x.k === "if").length;
  const f = { cases: sw.cases.length, executedCases: executed, fallThroughHops: hops, stateVars: sw.state.length, mutationsExecuted: muts, conditionals: conds,
    defaultNotLast: sw.cases.findIndex(c => !c.labels) >= 0 && sw.cases.findIndex(c => !c.labels) < sw.cases.length - 1 ? 1 : 0, multiLabel: sw.cases.filter(c => c.labels && c.labels.length > 1).length, task: WEIGHT[fam] };
  const score = +(0.6 * f.cases + 0.8 * f.executedCases + 1.2 * f.fallThroughHops + 0.8 * f.stateVars + 0.5 * f.mutationsExecuted + 1.5 * f.conditionals + f.defaultNotLast + 0.6 * f.multiLabel + f.task + extra).toFixed(2);
  return { score, factors: f };
}
const shapeOf = sw => `${sw.sel.type}|${sw.cases.map(c => `${c.labels ? `L${c.labels.length}` : "D"}:${c.body.map(s => s.k).join("+")}${c.brk ? "B" : ""}`).join(",")}|${(sw.after || []).map(s => s.k).join("+")}|${sw.state.map(v => v.type).join("")}`;
const base = fam => ({ mode: MODE, family: fam, skill: SKILL[fam] });

/** Output-prediction question: answer = Java result; distractors = misconception results. */
function predict(rng, L, fam, sw, value, { question, render, field = "out", count = 4, explain }) {
  const real = simulate(sw, value);
  const text = render(real);
  const wrong = [];
  // "runs every case" is always the longest output; use it only when needed so
  // length never signals the answer.
  const order = [...shuffle(MISCONCEPTIONS.filter(m => m !== "runs-every-case"), rng), "runs-every-case"];
  for (const m of order) { const s = simulate(sw, value, m); const t = render(s); if (t !== text) wrong.push({ text: t, tag: m, claim: { t: "field", p: "s", in: [value], field, is: pickField(s, field) } }); }
  if (new Set(wrong.map(w => w.text)).size < count - 1) reject("misconceptions do not produce enough distinct wrong answers");
  return challenge({ ...base(fam), rng, count, question, code: printSwitch(sw, value),
    correct: { text, tag: "correct", claim: { t: "field", p: "s", in: [value], field, is: pickField(real, field) } }, wrong,
    explanation: explain(real), structure: `${fam}|${shapeOf(sw)}`, complexity: complexity(L, fam, sw, value),
    check: { programs: { s: program(sw) }, inputs: { s: [[value]] }, types: { s: [sw.sel.type] } }, extra: { javaCode: printSwitch(sw, value) } });
}
function pickField(st, field) { if (field === "out") return st.printed; if (field === "state") return st.out.slice(st.printed.length); return st.out; }
function traceExplain(sw, value, st) {
  const start = st.trace.length ? caseName(sw, st.trace[0]) : null;
  const matched = sw.cases.find(c => c.labels && c.labels.includes(value));
  const first = matched ? `${sw.sel.name} is ${lit(sw.sel.type, value)}, so execution starts at ${start}.` : start ? `No case label matches ${lit(sw.sel.type, value)}, so execution starts at default.` : `No case label matches ${lit(sw.sel.type, value)} and there is no default, so nothing in the switch runs.`;
  const rest = st.trace.length > 1 ? ` Without a break, execution falls through ${st.trace.slice(1).map(i => caseName(sw, i)).join(", then ")}.` : "";
  const stop = st.trace.length ? ` It stops at ${sw.cases[st.trace[st.trace.length - 1]].brk ? "a break" : st.trace[st.trace.length - 1] === sw.cases.length - 1 ? "the end of the switch" : "a conditional break"}.` : "";
  return first + rest + stop;
}
const matchedValue = (sw, rng, missingOnPath) => {
  const cands = labelsOf(sw).filter(v => !missingOnPath || simulate(sw, v).trace.length > 1);
  if (!cands.length) reject("no value on a fall-through path"); return pick(cands, rng);
};

// ---------- families ----------
const F = {};
F["simple-select"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { missing: 0, defaultPos: "last" }); const v = matchedValue(sw, rng);
  return predict(rng, L, "simple-select", sw, v, { question: "What is printed?", render: s => fmtOut(s.printed), explain: s => traceExplain(sw, v, s) });
};
F["default-behavior"] = (rng, L) => {
  const pos = L === "Beginner" ? "last" : pick(["first", "middle", "last"], rng);
  const sw = buildSwitch(rng, L, { defaultPos: pos, missing: L === "Beginner" ? 0 : undefined });
  const d = sw.cases.findIndex(c => !c.labels); if (L !== "Beginner" && d < sw.cases.length - 1 && chance(0.6, rng)) sw.cases[d].brk = false;
  const v = outsider(sw, rng);
  return predict(rng, L, "default-behavior", sw, v, { question: `No case label equals ${lit(sw.sel.type, v)}. What is printed?`, render: s => fmtOut(s.printed), explain: s => traceExplain(sw, v, s) });
};
F["fall-through"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { missing: Math.max(1, int(...LEVEL[L].missing, rng)) }); const v = matchedValue(sw, rng, true);
  return predict(rng, L, "fall-through", sw, v, { question: "What is printed?", render: s => fmtOut(s.printed), explain: s => traceExplain(sw, v, s) });
};
F["multi-label"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { multi: true, missing: L === "Beginner" ? 0 : undefined });
  const group = sw.cases.findIndex(c => c.labels && c.labels.length > 1); const gc = sw.cases[group];
  if (L === "Beginner" || chance(0.5, rng)) {
    const v = pick(gc.labels.slice(0, -1).concat(gc.labels), rng);
    return predict(rng, L, "multi-label", sw, v, { question: "What is printed?", render: s => fmtOut(s.printed), explain: s => `Stacked case labels share one block. ${traceExplain(sw, v, s)}` });
  }
  // which values produce a target output
  const cands = [...labelsOf(sw), outsider(sw, rng)];
  const target = simulate(sw, gc.labels[0]).printed; if (!target) reject("empty target");
  const set = cands.filter(v => simulate(sw, v).printed === target);
  const fmtSet = s => s.length ? join(s.map(v => lit(sw.sel.type, v))) : "no listed value";
  const alts = [[gc.labels.slice(-1), "only-the-label-next-to-the-code"], [gc.labels.slice(0, 1), "only-the-first-label"], [cands.filter(v => simulate(sw, v, "no-fall-through").printed === target), "ignores-fall-through"], [[...set, ...cands.filter(v => !set.includes(v) && simulate(sw, v).printed.includes(target))], "output-contains-target"]];
  const sig = s => [...s].map(String).sort().join("|");
  const wrong = alts.filter(([s]) => sig(s) !== sig(set)).map(([s, tag]) => ({ text: fmtSet(s), tag, claim: { t: "setEq", p: "s", in: cands.map(v => [v]), is: target, set: s.map(v => [v]) } }));
  return challenge({ ...base("multi-label"), rng, question: `Consider only these values of ${sw.sel.name}: ${cands.map(v => lit(sw.sel.type, v)).join(", ")}. For which of them is exactly "${target}" printed?`,
    code: printSwitch(sw, null, { declareSelector: false }).replace(/^/, `// ${sw.sel.type} ${sw.sel.name} is set before this switch\n`),
    correct: { text: fmtSet(set), tag: "correct", claim: { t: "setEq", p: "s", in: cands.map(v => [v]), is: target, set: set.map(v => [v]) } }, wrong,
    explanation: `Every stacked label before a block jumps to that block, and execution continues until a break. Tracing each value gives "${target}" only for ${fmtSet(set)}.`,
    structure: `multi-set|${shapeOf(sw)}`, complexity: complexity(L, "multi-label", sw, gc.labels[0], 1),
    check: { programs: { s: program(sw) }, inputs: { s: cands.map(v => [v]) }, types: { s: [sw.sel.type] } } });
};
F["break-placement"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { kind: "num", stmts: 1, missing: 0 });
  const nv = sw.state.find(v => v.type === "int"); if (!nv) reject("no numeric state");
  // a case whose body updates, conditionally breaks, then updates again; it falls through
  const i = int(0, sw.cases.length - 2, rng); const c = sw.cases[i];
  const thr = int(nv.init, nv.init + 12, rng);
  c.body = [{ k: "add", v: nv.name, n: int(1, 6, rng) }, { k: "ifBreak", cond: { v: nv.name, op: pick([">", ">=", "<"], rng), c: thr } }, { k: chance(0.5, rng) ? "add" : "mul", v: nv.name, n: int(2, 4, rng) }];
  c.brk = false; if (!sw.cases[i].labels) reject("default chosen");
  const v = pick(c.labels, rng);
  const keys = sw.state.map(x => x.name);
  return predict(rng, L, "break-placement", sw, v, { question: `What is the value of ${keys.join(" and ")} after the switch?`, field: "state", render: s => fmtState(sw, s, keys), explain: s => `${traceExplain(sw, v, s)} The break inside the if only runs when its condition is true at that moment.` });
};
F["string-accumulation"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { kind: "append", missing: Math.max(1, int(...LEVEL[L].missing, rng)) }); const v = chance(0.75, rng) ? matchedValue(sw, rng, true) : outsider(sw, rng);
  if (!sw.state.length) reject("no state");
  return predict(rng, L, "string-accumulation", sw, v, { question: "What is printed?", render: s => fmtOut(s.printed), explain: s => `${traceExplain(sw, v, s)} Each executed += adds to the end of out.` });
};
F["numeric-state"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { kind: "num" }); const v = chance(0.8, rng) ? matchedValue(sw, rng) : outsider(sw, rng);
  if (!sw.state.length) reject("no state"); const keys = sw.state.map(x => x.name);
  return predict(rng, L, "numeric-state", sw, v, { question: `What ${keys.length > 1 ? "are" : "is"} the value${keys.length > 1 ? "s" : ""} of ${join(keys)} after the switch?`, field: "state", render: s => fmtState(sw, s, keys), explain: s => `${traceExplain(sw, v, s)} Apply each executed update in order.` });
};
F["boolean-state"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { kind: "flag" }); const v = chance(0.8, rng) ? matchedValue(sw, rng) : outsider(sw, rng);
  if (!sw.state.length) reject("no state"); const keys = sw.state.map(x => x.name);
  return predict(rng, L, "boolean-state", sw, v, { question: `What are the values of the flags after the switch?`, field: "state", render: s => fmtState(sw, s, sw.state.map(x => x.name)), explain: s => `${traceExplain(sw, v, s)} A toggle (x = !x) flips the current value, so order matters.` });
};
F["multi-statement"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { kind: "mixed", kinds: ["num", "flag", "num"], stmts: int(2, L === "Advanced" ? 4 : 3, rng) }); const v = matchedValue(sw, rng);
  if (sw.state.length < 2) reject("needs two state variables"); const keys = sw.state.map(x => x.name);
  return predict(rng, L, "multi-statement", sw, v, { question: `What are ${join(keys)} after the switch?`, field: "state", render: s => fmtState(sw, s, keys), explain: s => `${traceExplain(sw, v, s)} Every statement in each executed block runs, top to bottom.` });
};
F["combined-conditional"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { kind: "num", stmts: 1 }); const nv = sw.state[0]; if (!nv) reject("no state");
  const thr = int(nv.init - 2, nv.init + 10, rng);
  if (chance(0.5, rng)) { const i = int(0, sw.cases.length - 1, rng); sw.cases[i].body.push({ k: "if", cond: { v: nv.name, op: pick([">", "<", ">=", "<="], rng), c: thr }, then: { k: "print", s: pick(["!", "*", "+"], rng) } }); }
  sw.after = [{ k: "if", cond: { v: nv.name, op: pick([">", ">=", "<", "<="], rng), c: int(nv.init, nv.init + 12, rng) }, then: { k: "print", s: pick(["High", "Big", "Over"], rng) } }];
  sw.printAfter = [nv.name];
  const v = chance(0.8, rng) ? matchedValue(sw, rng) : outsider(sw, rng);
  return predict(rng, L, "combined-conditional", sw, v, { question: "What is printed?", render: s => fmtOut(s.printed), explain: s => `${traceExplain(sw, v, s)} Then the if statement after the switch tests the updated ${nv.name}, and ${nv.name} is printed (${s.vars[nv.name]}).` });
};
F["execution-sequence"] = (rng, L) => {
  const sw = buildSwitch(rng, L, { missing: Math.max(1, int(...LEVEL[L].missing, rng)) }); const v = chance(0.75, rng) ? matchedValue(sw, rng, true) : outsider(sw, rng);
  const seq = s => s.trace.length ? s.trace.map(i => caseName(sw, i)).join(" → ") : "No block runs";
  return predict(rng, L, "execution-sequence", sw, v, { question: "Which blocks run, in order?", render: seq, field: "out", explain: s => traceExplain(sw, v, s) });
};
F["reverse-trace"] = (rng, L) => {
  const sw = buildSwitch(rng, L, {}); const cands = [...labelsOf(sw), outsider(sw, rng)];
  const outs = new Map(cands.map(v => [v, simulate(sw, v).printed]));
  const uniq = cands.filter(v => [...outs.values()].filter(o => o === outs.get(v)).length === 1 && outs.get(v) !== "");
  if (!uniq.length) reject("no uniquely produced output"); const ans = pick(uniq, rng), target = outs.get(ans);
  // distractors: values whose output the target would be under a misconception, then any other value
  const mistaken = cands.filter(v => v !== ans && MISCONCEPTIONS.some(m => simulate(sw, v, m).printed === target));
  const others = shuffle(cands.filter(v => v !== ans && !mistaken.includes(v) && outs.get(v) !== target), rng);
  const wrongVals = [...shuffle(mistaken, rng), ...others].filter(v => outs.get(v) !== target).slice(0, 3);
  const P = { s: program(sw) };
  return challenge({ ...base("reverse-trace"), rng, question: `Which value of ${sw.sel.name} makes this code print exactly "${target}"?`, code: printSwitch(sw, null, { declareSelector: false }).replace(/^/, `// ${sw.sel.type} ${sw.sel.name} = ?\n`),
    correct: { text: `${sw.sel.name} = ${lit(sw.sel.type, ans)}`, tag: "correct", claim: { t: "field", p: "s", in: [ans], field: "out", is: target } },
    wrong: wrongVals.map(v => ({ text: `${sw.sel.name} = ${lit(sw.sel.type, v)}`, tag: mistaken.includes(v) ? "right-under-a-misconception" : "different-output", claim: { t: "field", p: "s", in: [v], field: "out", is: target } })),
    explanation: `Only ${lit(sw.sel.type, ans)} produces "${target}". ${traceExplain(sw, ans, simulate(sw, ans))}`,
    structure: `reverse|${shapeOf(sw)}`, complexity: complexity(L, "reverse-trace", sw, ans, 1),
    check: { programs: P, inputs: { s: cands.map(v => [v]) }, types: { s: [sw.sel.type] } } });
};
// ----- conversion to if/else -----
// A chain arm executes the statements the switch would run from that case until a break.
function convert(sw, mis = null) {
  const arms = []; const eq = v => sw.sel.type === "String" ? `${sw.sel.name}.equals(${lit("String", v)})` : `${sw.sel.name} == ${lit(sw.sel.type, v)}`;
  const runBody = i => { const out = []; for (let j = i; j < sw.cases.length; j++) { out.push(...sw.cases[j].body); if (sw.cases[j].brk || mis === "no-fall-through") break; } return out; };
  sw.cases.forEach((c, i) => { if (c.labels) arms.push({ labels: c.labels, cond: c.labels.map(eq).join(" || "), body: runBody(i) }); });
  const d = sw.cases.findIndex(c => !c.labels);
  let elseBody = d >= 0 ? runBody(d) : null;
  if (mis === "drops-default") elseBody = null;
  if (mis === "drops-a-label") { const g = arms.find(a => a.labels.length > 1); if (!g) return null; g.cond = eq(g.labels[0]); g.labels = g.labels.slice(0, 1); }
  if (mis === "swaps-two-bodies") { if (arms.length < 2) return null; const [x, y] = [0, 1]; [arms[x].body, arms[y].body] = [arms[y].body, arms[x].body]; }
  if (mis === "uses-greater-or-equal") { if (sw.sel.type !== "int") return null; const a = arms[0]; a.cond = `${sw.sel.name} >= ${a.labels[0]}`; a.ge = a.labels[0]; }
  if (mis === "independent-ifs") arms.forEach(a => a.independent = true);
  return { arms, elseBody, sel: sw.sel };
}
const bodyText = b => b.length ? b.map(stmtText).join(" ") : "";
function chainText(ch) {
  if (ch.arms.every(a => a.independent)) return ch.arms.map(a => `if (${a.cond}) { ${bodyText(a.body)} }`).join(" ") + (ch.elseBody ? ` else { ${bodyText(ch.elseBody)} }` : "");
  return ch.arms.map((a, i) => `${i ? "else " : ""}if (${a.cond}) { ${bodyText(a.body)} }`).join(" ") + (ch.elseBody && ch.elseBody.length ? ` else { ${bodyText(ch.elseBody)} }` : "");
}
const chainProgram = (sw, ch) => ({ params: [[sw.sel.type, sw.sel.name]], body: `${sw.state.map(v => `${v.type} ${v.name} = ${v.type === "String" ? `"${v.init}"` : v.init};`).join("\n")}\n${chainText(ch)}\n${(sw.printAfter || []).map(v => `System.out.print(${v});`).join("\n")}\n${footer(sw)}` });
function chainRun(sw, ch, value) {
  const st = { printed: "", vars: Object.fromEntries(sw.state.map(v => [v.name, v.init])) };
  const hit = a => a.ge !== undefined ? value >= a.ge : a.labels.includes(value);
  const run = b => { for (const s of b) if (exec(s, st) === "break") break; };
  if (ch.arms.every(a => a.independent)) { let any = false; ch.arms.forEach(a => { if (hit(a)) { any = true; run(a.body); } }); if (!ch.arms[ch.arms.length - 1] || !hit(ch.arms[ch.arms.length - 1])) { if (ch.elseBody) run(ch.elseBody); } void any; }
  else { const a = ch.arms.find(hit); if (a) run(a.body); else if (ch.elseBody) run(ch.elseBody); }
  for (const v of sw.printAfter || []) st.printed += String(st.vars[v]);
  return `${st.printed}${sw.state.map(v => `|${v.name}=${st.vars[v.name]}`).join("")}`;
}
// Sound finite input set: chains compare only against label constants, so behaviour is
// constant between consecutive critical points; test each constant, its neighbours and outsiders.
function domainInputs(sw) {
  const ls = labelsOf(sw);
  if (sw.sel.type === "int") return [...new Set([...ls.flatMap(v => [v - 1, v, v + 1]), Math.min(...ls) - 50, Math.max(...ls) + 50])].sort((a, b) => a - b);
  if (sw.sel.type === "char") return [...new Set([...ls.flatMap(v => [String.fromCharCode(v.charCodeAt(0) - 1), v, String.fromCharCode(v.charCodeAt(0) + 1)]), "a", "z"])].sort();
  return [...ls, "other", ""];
}
const CONV_MISTAKES = ["no-fall-through", "drops-default", "drops-a-label", "swaps-two-bodies", "uses-greater-or-equal", "independent-ifs"];
function conversionPool(rng, L) {
  const sw = buildSwitch(rng, L, { selType: pick(["int", "int", "char"], rng), kind: L === "Advanced" ? "print" : "print", multi: chance(0.5, rng) });
  if (sw.cases.length < 3) reject("needs three blocks");
  const ins = domainInputs(sw); const realOut = v => simulate(sw, v).out;
  const good = convert(sw);
  if (!ins.every(v => chainRun(sw, good, v) === realOut(v))) throw new Error("internal: correct conversion disagrees with switch");
  const bad = [];
  for (const m of shuffle(CONV_MISTAKES, rng)) { const ch = convert(sw, m); if (!ch) continue; const diffAt = ins.filter(v => chainRun(sw, ch, v) !== realOut(v)); if (diffAt.length && !bad.some(b => chainText(b.ch) === chainText(ch))) bad.push({ ch, tag: m, diffAt }); }
  return { sw, ins, good, bad };
}
F["convert-to-if"] = (rng, L) => {
  const { sw, ins, good, bad } = conversionPool(rng, L); if (bad.length < 3) reject("not enough wrong conversions");
  const P = { s: program(sw) }; const inputs = { s: ins.map(v => [v]) }; const types = { s: [sw.sel.type] };
  const opts = [{ ch: good, tag: "correct" }, ...bad.slice(0, 3)];
  opts.forEach((o, i) => { P[`c${i}`] = chainProgram(sw, o.ch); inputs[`c${i}`] = ins.map(v => [v]); types[`c${i}`] = [sw.sel.type]; o.claim = { t: "sameAll", a: "s", b: `c${i}` }; o.text = chainText(o.ch); });
  return challenge({ ...base("convert-to-if"), rng, question: `Which if/else code behaves exactly like this switch for every possible value of ${sw.sel.name}?`, code: printSwitch(sw, null, { declareSelector: false }),
    correct: opts[0], wrong: opts.slice(1),
    explanation: `Each if branch must run the same statements the switch runs from that label until a break, including fall-through into later blocks, and the final else must match default${sw.cases.some(c => !c.labels) ? "" : " (here there is no default, so there is no else)"}.`,
    structure: `convert|${shapeOf(sw)}`, complexity: complexity(L, "convert-to-if", sw, labelsOf(sw)[0], 0.5 * sw.cases.length),
    check: { programs: P, inputs, types }, extra: { domain: `every ${sw.sel.type} value (checked at each label, its neighbours and outside values)` } });
};
F["conversion-counterexample"] = (rng, L) => {
  const { sw, ins, bad } = conversionPool(rng, L); if (!bad.length) reject("no wrong conversion");
  const b = pick(bad, rng); const agree = ins.filter(v => !b.diffAt.includes(v));
  const ansPool = b.diffAt.filter(v => labelsOf(sw).includes(v) || sw.sel.type === "int" ? true : true);
  if (agree.length < 3) reject("need agreeing inputs"); const ans = pick(ansPool, rng);
  const P = { s: program(sw), c: chainProgram(sw, b.ch) }; const all = [ans, ...sample(agree, 3, rng)];
  const opt = (v, tag) => ({ text: `${sw.sel.name} = ${lit(sw.sel.type, v)}`, tag, claim: { t: "differ", a: "s", b: "c", in: [v] } });
  return challenge({ ...base("conversion-counterexample"), rng, question: `A student converted the switch into the if/else code below it. Which value of ${sw.sel.name} shows that the conversion is wrong?`,
    code: `${printSwitch(sw, null, { declareSelector: false })}\n\n// Student's conversion:\n${chainText(b.ch).replace(/ else /g, "\nelse ")}`,
    correct: opt(ans, "correct"), wrong: all.slice(1).map(v => opt(v, "both-versions-agree")),
    explanation: `For ${lit(sw.sel.type, ans)} the switch produces "${fmtOut(simulate(sw, ans).out.split("|")[0])}" but the conversion produces "${fmtOut(chainRun(sw, b.ch, ans).split("|")[0])}". The mistake: ${b.tag.replace(/-/g, " ")}.`,
    structure: `counter|${b.tag}|${shapeOf(sw)}`, complexity: complexity(L, "conversion-counterexample", sw, ans, 0.5 * sw.cases.length),
    check: { programs: P, inputs: { s: all.map(v => [v]), c: all.map(v => [v]) }, types: { s: [sw.sel.type], c: [sw.sel.type] } } });
};
F["missing-break-fix"] = (rng, L) => {
  const nMissing = L === "Beginner" ? 1 : int(1, 2, rng);
  const sw = buildSwitch(rng, L, { missing: 0, defaultPos: "last", stmts: 1, multi: false });
  if (sw.cases.length < 3) reject("needs three blocks");
  const missIdx = sample(sw.cases.slice(0, -1).map((_, i) => i), nMissing, rng).sort((a, b) => a - b); missIdx.forEach(i => sw.cases[i].brk = false);
  const ins = [...labelsOf(sw), ...(sw.cases.some(c => !c.labels) ? [outsider(sw, rng)] : [])];
  const intended = v => simulate(sw, v, "no-fall-through").out;
  const variants = [];
  const mod = (desc, fn, tag) => { const c = JSON.parse(JSON.stringify(sw)); if (fn(c) === false) return; variants.push({ text: desc, sw: c, tag }); };
  const nameOf = i => caseName(sw, i);
  mod(missIdx.length === 1 ? `Add break; at the end of ${nameOf(missIdx[0])}` : `Add break; at the end of both ${nameOf(missIdx[0])} and ${nameOf(missIdx[1])}`, c => missIdx.forEach(i => c.cases[i].brk = true), "correct");
  if (missIdx.length === 2) missIdx.forEach(i => mod(`Add break; at the end of ${nameOf(i)} only`, c => { c.cases[i].brk = true; }, "fixes-only-one-fall-through"));
  const withBreak = sw.cases.map((c, i) => i).filter(i => sw.cases[i].brk && i < sw.cases.length - 1);
  if (withBreak.length) { const i = pick(withBreak, rng); mod(`Remove the break; from ${nameOf(i)}`, c => { c.cases[i].brk = false; }, "removes-a-needed-break"); }
  const dIdx = sw.cases.findIndex(c => !c.labels);
  if (dIdx >= 0) mod("Move default to the top of the switch", c => { const [d] = c.cases.splice(dIdx, 1); d.brk = false; c.cases.unshift(d); }, "moves-default");
  mod(`Add break; after the last block`, c => { const l = c.cases[c.cases.length - 1]; if (l.brk) return false; l.brk = true; }, "adds-useless-break");
  if (missIdx[0] + 1 < sw.cases.length - 1) mod(`Add break; at the end of ${nameOf(missIdx[0] + 1)}`, c => { if (c.cases[missIdx[0] + 1].brk) return false; c.cases[missIdx[0] + 1].brk = true; }, "fixes-the-wrong-block");
  const fixes = v => ins.every(x => simulate(v.sw, x).out === intended(x));
  const correct = variants.filter(fixes); if (correct.length !== 1 || correct[0].tag !== "correct") reject("fix not unique");
  const wrong = variants.filter(v => !fixes(v)); if (wrong.length < (L === "Beginner" ? 2 : 3)) reject("few distractors");
  const P = { want: { params: [[sw.sel.type, sw.sel.name]], body: `${sw.cases.map(c => "").join("")}${(() => { const c = JSON.parse(JSON.stringify(sw)); c.cases.forEach(k => k.brk = true); return printSwitch(c, null, { declareSelector: false }); })()}\n${footer(sw)}` } };
  const inputs = { want: ins.map(v => [v]) }; const types = { want: [sw.sel.type] };
  const opts = [correct[0], ...wrong.slice(0, 3)];
  opts.forEach((o, i) => { P[`f${i}`] = program(o.sw); inputs[`f${i}`] = ins.map(v => [v]); types[`f${i}`] = [sw.sel.type]; o.claim = { t: "sameAll", a: "want", b: `f${i}` }; });
  return challenge({ ...base("missing-break-fix"), rng, count: Math.min(4, opts.length), question: `Each value of ${sw.sel.name} should print only the letter in its own block (unmatched values print only default's letter). Which change makes the switch do that?`,
    code: printSwitch(sw, null, { declareSelector: false }), correct: opts[0], wrong: opts.slice(1),
    explanation: `Fall-through happens only where a block ends without break: ${missIdx.map(nameOf).join(" and ")}. Adding break there stops execution before the next block; the other changes either do nothing or create new fall-through.`,
    structure: `fix|${missIdx.length}|${shapeOf(sw)}`, complexity: complexity(L, "missing-break-fix", sw, sw.cases[missIdx[0]].labels[0], missIdx.length),
    check: { programs: P, inputs, types } });
};
F.reachability = (rng, L) => {
  const kind = pick(["mod", "div", "mod-offset"], rng);
  const k = int(3, 5, rng), max = int(12, 40, rng);
  const expr = kind === "mod" ? { t: `x % ${k}`, f: x => x % k } : kind === "div" ? { t: `x / ${Math.ceil(max / k)}`, f: x => Math.floor(x / Math.ceil(max / k)) } : { t: `x % ${k} + 1`, f: x => (x % k) + 1 };
  const reach = [...new Set(range(0, max).map(expr.f))].sort((a, b) => a - b);
  const allReach = chance(0.3, rng);
  const outside = [Math.max(...reach) + 1, Math.min(...reach) - 1, Math.max(...reach) + 2].filter(v => !reach.includes(v));
  const caseVals = allReach ? sample(reach, Math.min(reach.length, int(3, 4, rng)), rng) : [...sample(reach, int(2, 3, rng), rng), pick(outside, rng)];
  caseVals.sort((a, b) => a - b);
  const marks = shuffle(MARKS, rng);
  const sw = { sel: { type: "int", name: "n" }, state: [], cases: caseVals.map((v, i) => ({ labels: [v], body: [{ k: "print", s: marks[i] }], brk: true })), after: [], printAfter: [] };
  if (chance(0.5, rng)) sw.cases.push({ labels: null, body: [{ k: "print", s: marks[caseVals.length] }], brk: false });
  const code = `// x is an int from 0 to ${max}\nint n = ${expr.t};\n${printSwitch(sw, null, { declareSelector: false })}`;
  const dead = sw.cases.map((c, i) => i).filter(i => sw.cases[i].labels && !reach.includes(sw.cases[i].labels[0]));
  const dIdx = sw.cases.findIndex(c => !c.labels);
  const defaultDead = dIdx >= 0 && reach.every(r => caseVals.includes(r));
  const xs = range(0, max).map(x => [x]);
  const P = { r: { params: [["int", "x"]], body: `int n = ${expr.t};\n${printSwitch(sw, null, { declareSelector: false })}` } };
  const deadClaim = i => ({ t: "neverPrints", p: "r", mark: sw.cases[i].body[0].s });
  const options = sw.cases.map((c, i) => ({ text: `${caseName(sw, i)} can never run`, tag: (dead.includes(i) || (i === dIdx && defaultDead)) ? "correct" : (c.labels ? "reachable-label" : "default-is-reachable"), claim: deadClaim(i) }));
  const everyOpt = { text: "Every block can run", tag: "", claim: { t: "allPrint", p: "r", marks: sw.cases.map(c => c.body[0].s) } };
  const trueOnes = options.filter(o => o.tag === "correct");
  let correct, wrong;
  if (trueOnes.length === 0) { correct = { ...everyOpt, tag: "correct" }; wrong = sample(options, Math.min(3, options.length), rng).map(o => ({ ...o, tag: "thinks-label-is-out-of-range" })); }
  else if (trueOnes.length === 1) { correct = trueOnes[0]; wrong = [{ ...everyOpt, tag: "ignores-selector-range" }, ...sample(options.filter(o => o !== correct), 2, rng)]; }
  else reject("more than one dead block");
  return challenge({ ...base("reachability"), rng, question: `x can be any int from 0 to ${max}. Which statement about this switch is true?`, code, correct, wrong,
    explanation: `${expr.t} can only produce ${reach.join(", ")} for x from 0 to ${max}. ${correct.text === "Every block can run" ? "Every case label is one of those values, and default handles the rest (if present)." : `So ${correct.text.replace(" can never run", "")} is never selected.`}`,
    structure: `reach|${kind}|${sw.cases.length}|${dIdx >= 0}`, complexity: { score: +(2.5 + 0.6 * sw.cases.length + 1.5 + WEIGHT.reachability).toFixed(2), factors: { cases: sw.cases.length, domainSize: max + 1, task: WEIGHT.reachability, selectorExpression: 1 } },
    check: { programs: P, inputs: { r: xs }, types: { r: ["int"] } }, extra: { domain: `x in [0, ${max}]` } });
};

export function generateSwitch(rng, L = "Intermediate", forced) {
  const fam = forced || pick(FAMILIES[L], rng);
  return retry(() => F[fam](rng, L), 300);
}
export { simulate as simulateSwitch, buildSwitch, MISCONCEPTIONS };
