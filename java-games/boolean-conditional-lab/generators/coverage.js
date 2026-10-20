/* Conditional Coverage & Branch Reasoning.
 * Programs are trees of if / else-if / else built from comparison predicates.
 * Every domain is a stated finite integer range, so reachability, coverage and
 * equivalence are decided by exhaustive evaluation over the whole domain (sound,
 * not sampled). The verifier re-runs the same exhaustive inputs on real Java. */
import { pick, int, chance, shuffle, sample, reject, retry, range, join } from "./core.js";
import * as B from "./bool.js";
import { challenge } from "./schema.js";

const MODE = "coverage";
const SKILL = {
  unreachable: "Identify an unreachable branch", redundant: "Identify a redundant condition", "missing-cases": "Find inputs that no branch handles", boundary: "Boundary-value analysis",
  "else-if-order": "Reason about else-if ordering", overlapping: "Trace overlapping independent if statements", compound: "Evaluate compound Boolean conditions", "multi-variable": "Reach a branch with multiple input variables",
  nested: "Trace nested conditional structures", "equivalent-chain": "Identify an equivalent conditional chain", counterexample: "Find a counterexample to equivalence", "reach-target": "Find an input that reaches a target branch",
  "fix-boundary": "Fix an incorrect boundary", "fix-order": "Fix a branch-order mistake", "domain-coverage": "Determine complete domain coverage", "else-fallback": "Distinguish explicit branches from the else fallback",
  "short-circuit": "Reason about short-circuit evaluation", "dead-code": "Detect ineffective or unreachable code",
};
export const FAMILIES = {
  Beginner: ["boundary", "else-if-order", "reach-target", "missing-cases", "domain-coverage", "else-fallback", "overlapping", "compound", "unreachable", "nested", "short-circuit"],
  Intermediate: ["unreachable", "redundant", "missing-cases", "boundary", "else-if-order", "overlapping", "compound", "multi-variable", "nested", "equivalent-chain", "counterexample", "reach-target", "fix-boundary", "fix-order", "domain-coverage", "else-fallback", "short-circuit", "dead-code"],
  Advanced: ["unreachable", "redundant", "missing-cases", "else-if-order", "overlapping", "compound", "multi-variable", "nested", "equivalent-chain", "counterexample", "reach-target", "fix-boundary", "fix-order", "domain-coverage", "else-fallback", "short-circuit", "dead-code"],
};
const WEIGHT = { unreachable: 2, redundant: 3, "missing-cases": 2, boundary: 0.5, "else-if-order": 1, overlapping: 1, compound: 1.5, "multi-variable": 2.5, nested: 2, "equivalent-chain": 3, counterexample: 3, "reach-target": 1.5, "fix-boundary": 2.5, "fix-order": 2.5, "domain-coverage": 2, "else-fallback": 1.5, "short-circuit": 2, "dead-code": 2.5 };
const CONTEXTS = [
  { v: "score", lo: 0, hi: 100, labels: ["A", "B", "C", "D", "F"] }, { v: "temp", lo: -10, hi: 110, labels: ["Hot", "Warm", "Mild", "Cool", "Cold"] },
  { v: "speed", lo: 0, hi: 120, labels: ["Ticket", "Warning", "Fast", "Normal", "Slow"] }, { v: "age", lo: 0, hi: 99, labels: ["Senior", "Adult", "Teen", "Child", "Infant"] },
  { v: "battery", lo: 0, hi: 100, labels: ["Full", "Good", "Low", "Critical", "Empty"] }, { v: "level", lo: 1, hi: 60, labels: ["Expert", "Pro", "Skilled", "Novice", "Starter"] },
  { v: "points", lo: 0, hi: 250, labels: ["Gold", "Silver", "Bronze", "Member", "Guest"] }, { v: "minutes", lo: 0, hi: 180, labels: ["Long", "Medium", "Short", "Quick", "Instant"] },
];
const PAIRS = [{ x: ["hours", 0, 12], y: ["tasks", 0, 10], labels: ["Overloaded", "Busy", "Steady", "Idle"] }, { x: ["wins", 0, 10], y: ["losses", 0, 10], labels: ["Champion", "Contender", "Even", "Rebuild"] },
  { x: ["rows", 0, 12], y: ["cols", 0, 12], labels: ["Large", "Wide", "Tall", "Small"] }, { x: ["coins", 0, 15], y: ["gems", 0, 8], labels: ["Rich", "Saver", "Spender", "Broke"] }];

// ---------- program model ----------
// stmt: {k:"print", s} | {k:"chain", arms:[{cond, body:[stmt]}], elseBody:[stmt]|null}
const P = s => ({ k: "print", s });
const chain = (arms, elseBody = null) => ({ k: "chain", arms, elseBody });
function lines(stmts, ind = "") {
  const out = [];
  for (const s of stmts) {
    if (s.k === "print") out.push(`${ind}System.out.println("${s.s}");`);
    else if (s.k === "chain") {
      s.arms.forEach((a, i) => { out.push(`${ind}${i ? "} else " : ""}if (${B.print(a.cond)}) {`); out.push(...lines(a.body, ind + "    ")); });
      if (s.elseBody) { out.push(`${ind}} else {`); out.push(...lines(s.elseBody, ind + "    ")); }
      out.push(`${ind}}`);
    }
  }
  return out;
}
const codeOf = (stmts, decl = "") => `${decl}${lines(stmts).join("\n")}`;
function run(stmts, env, mis = null, out = []) {
  for (const s of stmts) {
    if (s.k === "print") { out.push(s.s); continue; }
    const ev = c => B.evaluate(mis === "boundary-flip" ? flipBounds(c) : mis === "and-as-or" ? swapAll(c) : c, env);
    const hits = s.arms.map(a => ev(a.cond));
    if (mis === "all-true-branches") { let any = false; s.arms.forEach((a, i) => { if (hits[i]) { any = true; run(a.body, env, mis, out); } }); if (!any && s.elseBody) run(s.elseBody, env, mis, out); continue; }
    if (mis === "last-true-branch") { const i = hits.lastIndexOf(true); if (i >= 0) run(s.arms[i].body, env, mis, out); else if (s.elseBody) run(s.elseBody, env, mis, out); continue; }
    const i = hits.indexOf(true);
    if (i >= 0) { run(s.arms[i].body, env, mis, out); if (mis === "else-also-runs" && s.elseBody) run(s.elseBody, env, mis, out); }
    else if (s.elseBody) run(s.elseBody, env, mis, out);
  }
  return out;
}
const FLIP = { ">=": ">", ">": ">=", "<=": "<", "<": "<=", "==": "==", "!=": "!=" };
const flipBounds = c => c.k === "cmp" ? B.CMP(c.v, FLIP[c.op], c.c) : c.k === "not" ? B.NOT(flipBounds(c.a)) : B.isCompound(c) ? { k: c.k, xs: c.xs.map(flipBounds) } : c;
const swapAll = c => c.k === "not" ? B.NOT(swapAll(c.a)) : B.isCompound(c) ? { k: c.k === "and" ? "or" : "and", xs: c.xs.map(swapAll) } : c;
const outText = o => o.length ? o.join(", then ") : "Nothing is printed";
const javaOut = o => o.map(x => x + "\n").join("");
const progOf = (stmts, vars) => ({ params: vars.map(v => ["int", v]), body: lines(stmts).join("\n") });
const domainOf = (vars) => { let envs = [{}]; for (const [v, lo, hi] of vars) envs = envs.flatMap(e => range(lo, hi).map(k => ({ ...e, [v]: k }))); return envs; };
const inputsOf = (envs, vars) => envs.map(e => vars.map(([v]) => e[v]));
const shapeOf = stmts => stmts.map(s => s.k === "print" ? "p" : `C[${s.arms.map(a => `${condShape(a.cond)}:${shapeOf(a.body)}`).join(";")}|${s.elseBody ? shapeOf(s.elseBody) : "-"}]`).join(",");
const condShape = c => c.k === "cmp" ? c.op : c.k === "not" ? `!${condShape(c.a)}` : `${c.k}(${c.xs.map(condShape).join(",")})`;
function complexity(fam, stmts, nVars, extra = 0) {
  let branches = 0, atoms = 0, depth = 0, compound = 0;
  const walk = (ss, d) => { for (const s of ss) if (s.k === "chain") { depth = Math.max(depth, d + 1); branches += s.arms.length + (s.elseBody ? 1 : 0); s.arms.forEach(a => { atoms += B.leaves(a.cond); if (B.isCompound(a.cond)) compound++; walk(a.body, d + 1); }); if (s.elseBody) walk(s.elseBody, d + 1); } };
  walk(stmts, 0);
  const f = { branches, predicateAtoms: atoms, nestingDepth: depth, compoundConditions: compound, inputVariables: nVars, task: WEIGHT[fam] };
  return { score: +(0.6 * branches + 0.5 * atoms + 1.2 * Math.max(0, depth - 1) + 1.2 * compound + 1.5 * (nVars - 1) + f.task + extra).toFixed(2), factors: f };
}
const base = fam => ({ mode: MODE, family: fam, skill: SKILL[fam] });
const declLine = (ctx) => `// ${ctx.v} is an int from ${ctx.lo} to ${ctx.hi}\n`;

// ---------- threshold chains ----------
function thresholds(rng, ctx, n) {
  const span = ctx.hi - ctx.lo; const ts = new Set();
  while (ts.size < n) ts.add(ctx.lo + int(Math.ceil(span * 0.12), Math.floor(span * 0.88), rng));
  const arr = [...ts].sort((a, b) => b - a);
  for (let i = 1; i < arr.length; i++) if (arr[i - 1] - arr[i] < 3) reject("thresholds too close");
  return arr;
}
/** Descending chain: v >= t1 -> L1, else if v >= t2 -> L2 ..., else Lk (ops vary between >= and >). */
function descendingChain(rng, ctx, n, { withElse = true, ascending = false } = {}) {
  const ts = thresholds(rng, ctx, n); const labels = ctx.labels.slice(0, n + 1);
  const arms = ts.map((t, i) => ({ cond: ascending ? B.CMP(ctx.v, pick(["<", "<="], rng), ts[ts.length - 1 - i]) : B.CMP(ctx.v, pick([">=", ">"], rng), t), body: [P(ascending ? labels[n - i] : labels[i])] }));
  return { stmts: [chain(arms, withElse ? [P(ascending ? labels[0] : labels[n])] : null)], ts, labels };
}
function predictQ(rng, L, fam, stmts, vars, env, question, explain, mis, extra = {}) {
  const real = run(stmts, env); const text = outText(real);
  const wrong = [];
  const longFirst = ["all-true-branches", "else-also-runs"]; // always-longer outputs: use only when needed
  const ordered = [...shuffle(mis.filter(m => !longFirst.includes(m)), rng), ...mis.filter(m => longFirst.includes(m))];
  for (const m of ordered) { const o = run(stmts, env, m); const t = outText(o); if (t !== text) wrong.push({ text: t, tag: m, claim: { t: "out", p: "c", in: vars.map(([v]) => env[v]), is: javaOut(o) } }); }
  const allLabels = [...new Set(JSON.stringify(stmts).match(/"s":"[^"]+"/g).map(x => x.slice(5, -1)))];
  for (const l of shuffle(allLabels, rng)) if (outText([l]) !== text) wrong.splice(Math.min(wrong.length, 2), 0, { text: outText([l]), tag: "other-branch", claim: { t: "out", p: "c", in: vars.map(([v]) => env[v]), is: javaOut([l]) } });
  const decl = vars.map(([v]) => `int ${v} = ${env[v]};`).join("\n") + "\n";
  const distinct = new Set(wrong.map(w => w.text)).size; if (!distinct) reject("no distractor");
  return challenge({ ...base(fam), rng, count: Math.min(4, 1 + distinct), question, code: codeOf(stmts, decl), correct: { text, tag: "correct", claim: { t: "out", p: "c", in: vars.map(([v]) => env[v]), is: javaOut(real) } }, wrong,
    explanation: explain(real), structure: `${fam}|${shapeOf(stmts)}`, complexity: complexity(fam, stmts, vars.length, extra.cx || 0),
    check: { programs: { c: progOf(stmts, vars.map(([v]) => v)) }, inputs: { c: [vars.map(([v]) => env[v])] } } });
}
const firstTrueExplain = (stmts, env) => o => {
  const s = stmts[0]; const i = s.arms.findIndex(a => B.evaluate(a.cond, env));
  return i >= 0 ? `Conditions are tested top to bottom and only the first true one runs: ${s.arms.slice(0, i).map(a => `${B.print(a.cond)} is false`).join(", ")}${i ? ", then " : ""}${B.print(s.arms[i].cond)} is true, so "${o.join(", ")}" is printed.` : `Every condition is false, so ${s.elseBody ? "the else branch runs" : "nothing is printed"}.`;
};
const CHAIN_MIS = ["all-true-branches", "last-true-branch", "boundary-flip", "else-also-runs"];

const F = {};
F.boundary = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const { stmts, ts } = descendingChain(rng, ctx, L === "Beginner" ? int(1, 2, rng) : int(2, 3, rng), { ascending: chance(0.35, rng) });
  const t = pick(ts, rng); const env = { [ctx.v]: t + pick([0, 0, 1, -1], rng) };
  return predictQ(rng, L, "boundary", stmts, [[ctx.v, ctx.lo, ctx.hi]], env, "What is printed?", o => `${firstTrueExplain(stmts, env)(o)} Remember: >= includes the boundary value; > does not.`, CHAIN_MIS);
};
F["else-if-order"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const n = L === "Beginner" ? 2 : L === "Intermediate" ? 3 : 4; // contexts carry 5 labels: n arms + else
  // conditions overlap and are NOT ordered most-selective first
  const ts = thresholds(rng, ctx, n); const ord = shuffle(ts, rng); if (ord.every((x, i) => x === ts[i])) reject("already ordered");
  const arms = ord.map((t, i) => ({ cond: B.CMP(ctx.v, pick([">=", ">"], rng), t), body: [P(ctx.labels[i])] }));
  const stmts = [chain(arms, chance(0.6, rng) ? [P(ctx.labels[n])] : null)];
  const hitCount = e => arms.filter(a => B.evaluate(a.cond, e)).length;
  const envs = domainOf([[ctx.v, ctx.lo, ctx.hi]]).filter(e => hitCount(e) >= 2); if (!envs.length) reject("no overlap");
  const env = pick(envs, rng);
  return predictQ(rng, L, "else-if-order", stmts, [[ctx.v, ctx.lo, ctx.hi]], env, "Several conditions are true for this value. What is printed?", firstTrueExplain(stmts, env), ["all-true-branches", "last-true-branch", "else-also-runs"]);
};
F.overlapping = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const n = L === "Beginner" ? 2 : L === "Intermediate" ? 3 : 4; const ts = thresholds(rng, ctx, n);
  const stmts = ts.map((t, i) => chain([{ cond: L === "Advanced" && i === 1 ? B.AND(B.CMP(ctx.v, ">", t), B.CMP(ctx.v, "<", ts[0])) : i === n - 1 && L !== "Beginner" ? B.CMP(ctx.v, pick(["<", "<="], rng), t) : B.CMP(ctx.v, pick([">=", ">"], rng), t), body: [P(ctx.labels[i])] }], null));
  const envs = domainOf([[ctx.v, ctx.lo, ctx.hi]]).filter(e => run(stmts, e).length >= (L === "Beginner" ? 1 : 2)); const env = pick(envs, rng);
  const asElseIf = [chain(stmts.map(s => s.arms[0]))];
  const o = run(stmts, env); const alt = run(asElseIf, env); const lastOnly = o.slice(-1);
  const wrong = [[alt, "treats-separate-ifs-as-else-if"], [lastOnly, "keeps-only-last-output"], [run(stmts, env, "boundary-flip"), "boundary-flip"], [[...o].reverse(), "wrong-order"], [o.slice(0, 1), "stops-after-first"]];
  const decl = `int ${ctx.v} = ${env[ctx.v]};\n`; const inp = [env[ctx.v]];
  return challenge({ ...base("overlapping"), rng, question: "These are separate if statements, not an else-if chain. What is printed?", code: codeOf(stmts, decl),
    correct: { text: outText(o), tag: "correct", claim: { t: "out", p: "c", in: inp, is: javaOut(o) } },
    wrong: wrong.map(([w, tag]) => ({ text: outText(w), tag, claim: { t: "out", p: "c", in: inp, is: javaOut(w) } })),
    explanation: `Each separate if is tested on its own, so every true condition prints, in order: ${stmts.map(s => `${B.print(s.arms[0].cond)} is ${B.evaluate(s.arms[0].cond, env)}`).join("; ")}.`,
    structure: `overlap|${shapeOf(stmts)}`, complexity: complexity("overlapping", stmts, 1), check: { programs: { c: progOf(stmts, [ctx.v]) }, inputs: { c: [inp] } } });
};
F.compound = (rng, L) => {
  const pr = pick(PAIRS, rng); const [x, xl, xh] = pr.x, [y, yl, yh] = pr.y;
  const atom = (v, lo, hi) => B.CMP(v, pick([">=", ">", "<", "<=", "=="], rng), int(lo + 1, hi - 1, rng));
  const mk = () => { const parts = [atom(x, xl, xh), atom(y, yl, yh)]; if (L === "Advanced") parts.push(chance(0.5, rng) ? atom(x, xl, xh) : atom(y, yl, yh)); const t = B.randomTree(rng, { vars: parts.map((_, i) => `p${i}`), leafCount: parts.length, negLeaf: L === "Beginner" ? 0 : 0.2, negGroup: L === "Advanced" ? 0.3 : 0 }); const sub = n => n.k === "var" ? parts[Number(n.n.slice(1))] : n.k === "not" ? B.NOT(sub(n.a)) : { k: n.k, xs: n.xs.map(sub) }; return sub(t); };
  const nArms = L === "Beginner" ? 1 : 2;
  const stmts = [chain(range(0, nArms - 1).map(i => ({ cond: mk(), body: [P(pr.labels[i])] })), [P(pr.labels[3])])];
  const env = pick(domainOf([[x, xl, xh], [y, yl, yh]]), rng);
  return predictQ(rng, L, "compound", stmts, [[x, xl, xh], [y, yl, yh]], env, "What is printed?", o => `${stmts[0].arms.map(a => `${B.print(a.cond)} is ${B.evaluate(a.cond, env)}`).join("; ")}. So "${o.join(", ")}" is printed.`, ["and-as-or", "boundary-flip", "all-true-branches", "else-also-runs"]);
};
F.nested = (rng, L) => {
  const pr = pick(PAIRS, rng); const [x, xl, xh] = pr.x, [y, yl, yh] = pr.y;
  const tx = int(xl + 2, xh - 2, rng), ty = int(yl + 2, yh - 2, rng);
  const inner = chain([{ cond: B.CMP(y, pick([">", ">=", "<"], rng), ty), body: [P(pr.labels[0])] }], [P(pr.labels[1])]);
  const outerElse = L === "Advanced" ? [chain([{ cond: B.CMP(y, pick(["<", "<=", ">"], rng), int(yl + 1, yh - 1, rng)), body: [P(pr.labels[2])] }], [P(pr.labels[3])])] : [P(pr.labels[2])];
  const stmts = [chain([{ cond: B.CMP(x, pick([">=", ">", "<"], rng), tx), body: [inner] }], outerElse)];
  const env = pick(domainOf([[x, xl, xh], [y, yl, yh]]), rng);
  const flat = [chain([{ cond: stmts[0].arms[0].cond, body: [P(pr.labels[0])] }, { cond: inner.arms[0].cond, body: [P(pr.labels[1])] }], [P(pr.labels[2])])];
  const r = predictQ(rng, L, "nested", stmts, [[x, xl, xh], [y, yl, yh]], env, "What is printed?", o => `The outer test ${B.print(stmts[0].arms[0].cond)} is ${B.evaluate(stmts[0].arms[0].cond, env)}, so ${B.evaluate(stmts[0].arms[0].cond, env) ? "the inner if/else decides" : "the outer else runs"}. Result: "${o.join(", ")}".`, ["all-true-branches", "else-also-runs", "boundary-flip"]);
  void flat; return r;
};
// ---------- set / range answers ----------
const rangesOf = (vals) => { const s = [...vals].sort((a, b) => a - b), out = []; for (const v of s) { const l = out[out.length - 1]; if (l && l[1] === v - 1) l[1] = v; else out.push([v, v]); } return out; };
const rangeText = (v, rs) => rs.length ? rs.map(([a, b]) => a === b ? `${v} = ${a}` : `${v} from ${a} to ${b}`).join(" and ") : "No values";
function rangeOptions(rng, v, correctVals, domainVals, tagBase) {
  const rs = rangesOf(correctVals); const opts = [];
  if (rs.length === 1) { const [a, b] = rs[0];
    for (const [na, nb, tag] of [[a - 1, b, "includes-a-boundary-value"], [a + 1, b, "excludes-a-boundary-value"], [a, b + 1, "includes-a-boundary-value"], [a, b - 1, "excludes-a-boundary-value"], [a - 1, b + 1, "includes-both-boundaries"]])
      if (na <= nb && domainVals.includes(na) && domainVals.includes(nb)) opts.push({ vals: range(na, nb), tag });
  }
  opts.push({ vals: [], tag: `${tagBase}-thinks-none` });
  return shuffle(opts, rng).filter(o => rangeText(v, rangesOf(o.vals)) !== rangeText(v, rs));
}
F["missing-cases"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng);
  const ts = thresholds(rng, ctx, L === "Beginner" ? 2 : L === "Intermediate" ? 3 : 4);
  // a gap: one arm uses a strict bound so a contiguous interval is unhandled
  const hi = ts[0], mid = ts[1];
  const arms = [{ cond: B.CMP(ctx.v, ">=", hi), body: [P(ctx.labels[0])] }, { cond: B.CMP(ctx.v, "<", mid), body: [P(ctx.labels[2])] }];
  if (L !== "Beginner") arms.splice(1, 0, { cond: B.AND(B.CMP(ctx.v, ">=", mid), B.CMP(ctx.v, "<", ts[2] > mid ? ts[2] : int(mid + 1, hi - 1, rng))), body: [P(ctx.labels[1])] });
  const stmts = [chain(shuffle(arms, rng))];
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]), vals = dom.map(e => e[ctx.v]);
  const silent = vals.filter(k => run(stmts, { [ctx.v]: k }).length === 0); if (!silent.length) reject("no gap");
  const opts = rangeOptions(rng, ctx.v, silent, vals, "missing");
  const mk = (vs, tag) => ({ text: rangeText(ctx.v, rangesOf(vs)), tag, claim: { t: "setWhere", p: "c", where: { silent: true }, set: vs.map(k => [k]) } });
  return challenge({ ...base("missing-cases"), rng, question: `${ctx.v} can be any int from ${ctx.lo} to ${ctx.hi}. For which values does this code print nothing?`, code: codeOf(stmts, declLine(ctx)),
    correct: mk(silent, "correct"), wrong: opts.slice(0, 3).map(o => mk(o.vals, o.tag)),
    explanation: `There is no else, so a value prints nothing when every condition is false. Checking each boundary (>= includes it, < excludes it) leaves ${rangeText(ctx.v, rangesOf(silent))} unhandled.`,
    structure: `missing|${shapeOf(stmts)}`, complexity: complexity("missing-cases", stmts, 1), check: { programs: { c: progOf(stmts, [ctx.v]) }, inputs: { c: inputsOf(dom, [[ctx.v]]) } } });
};
F["else-fallback"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const n = L === "Beginner" ? 2 : L === "Intermediate" ? 3 : 4;
  const { stmts, labels } = descendingChain(rng, ctx, n, { ascending: chance(0.3, rng) });
  const elseLabel = stmts[0].elseBody[0].s;
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]), vals = dom.map(e => e[ctx.v]);
  const hits = vals.filter(k => run(stmts, { [ctx.v]: k })[0] === elseLabel);
  const opts = rangeOptions(rng, ctx.v, hits, vals, "fallback");
  const mk = (vs, tag) => ({ text: rangeText(ctx.v, rangesOf(vs)), tag, claim: { t: "setWhere", p: "c", where: { is: elseLabel + "\n" }, set: vs.map(k => [k]) } });
  void labels;
  return challenge({ ...base("else-fallback"), rng, question: `${ctx.v} can be any int from ${ctx.lo} to ${ctx.hi}. Which values reach the else branch (printing "${elseLabel}")?`, code: codeOf(stmts, declLine(ctx)),
    correct: mk(hits, "correct"), wrong: opts.slice(0, 3).map(o => mk(o.vals, o.tag)),
    explanation: `else runs only when every earlier condition is false. That happens for ${rangeText(ctx.v, rangesOf(hits))}.`,
    structure: `fallback|${shapeOf(stmts)}`, complexity: complexity("else-fallback", stmts, 1), check: { programs: { c: progOf(stmts, [ctx.v]) }, inputs: { c: inputsOf(dom, [[ctx.v]]) } } });
};
F["domain-coverage"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const covered = chance(0.5, rng);
  const ts = thresholds(rng, ctx, L === "Beginner" ? 1 : L === "Intermediate" ? 2 : 3);
  const arms = [{ cond: B.CMP(ctx.v, ">=", ts[0]), body: [P(ctx.labels[0])] }];
  for (let i = 1; i < ts.length; i++) arms.push({ cond: B.AND(B.CMP(ctx.v, ">=", ts[i]), B.CMP(ctx.v, "<", ts[i - 1])), body: [P(ctx.labels[i])] });
  const lowT = ts[ts.length - 1];
  arms.push({ cond: B.CMP(ctx.v, covered ? "<" : pick(["<", "<="], rng) === "<" ? "<" : "<", covered ? lowT : lowT - int(1, 3, rng)), body: [P(ctx.labels[ts.length])] });
  if (!covered && L === "Advanced" && chance(0.5, rng)) { const i = int(1, ts.length - 1, rng); arms[i].cond = B.AND(B.CMP(ctx.v, ">", ts[i]), B.CMP(ctx.v, "<", ts[i - 1])); arms[arms.length - 1].cond = B.CMP(ctx.v, "<", lowT); }
  const stmts = [chain(shuffle(arms, rng))];
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]), vals = dom.map(e => e[ctx.v]);
  const silent = vals.filter(k => run(stmts, { [ctx.v]: k }).length === 0);
  if ((silent.length === 0) !== covered) reject("coverage mismatch");
  const yes = { text: `Yes, every value from ${ctx.lo} to ${ctx.hi} prints something`, claim: { t: "noneSilent", p: "c" } };
  const noAt = k => ({ text: `No, ${ctx.v} = ${k} prints nothing`, claim: { t: "out", p: "c", in: [k], is: "" } });
  const bounds = [...new Set([...ts, lowT - 1, lowT + 1, ...ts.map(t => t - 1), ...ts.map(t => t + 1), ctx.lo, ctx.hi])].filter(k => vals.includes(k));
  let correct, wrong;
  if (covered) { correct = { ...yes, tag: "correct" }; wrong = sample(bounds, 3, rng).map(k => ({ ...noAt(k), tag: "boundary-misread" })); }
  else { correct = { ...noAt(pick(silent, rng)), tag: "correct" }; const handled = shuffle(bounds.filter(k => !silent.includes(k)), rng); if (handled.length < 2) reject("handled"); wrong = [{ ...yes, tag: "missed-the-gap" }, ...handled.slice(0, 2).map(k => ({ ...noAt(k), tag: "boundary-misread" }))]; }
  return challenge({ ...base("domain-coverage"), rng, question: `${ctx.v} can be any int from ${ctx.lo} to ${ctx.hi}. Does this code print something for every value?`, code: codeOf(stmts, declLine(ctx)), correct, wrong,
    explanation: covered ? `The conditions meet exactly at each boundary (one uses >= t, the other < t), so every value is handled.` : `The ranges do not meet: ${rangeText(ctx.v, rangesOf(silent))} satisfies no condition and there is no else.`,
    structure: `coverage-${covered}|${shapeOf(stmts)}`, complexity: complexity("domain-coverage", stmts, 1), check: { programs: { c: progOf(stmts, [ctx.v]) }, inputs: { c: inputsOf(dom, [[ctx.v]]) } } });
};
// ---------- branch-level reasoning ----------
F.unreachable = (rng, L) => {
  if (L === "Advanced" && chance(0.6, rng)) return unreachableIntervals(rng, L);
  const ctx = pick(CONTEXTS, rng); const n = L === "Beginner" ? 2 : int(3, 4, rng);
  const ts = thresholds(rng, ctx, n); const dead = chance(0.75, rng);
  let order = [...ts].sort((a, b) => b - a); // most selective first = all reachable
  if (dead) { const i = int(0, n - 2, rng), j = int(i + 1, n - 1, rng); [order[i], order[j]] = [order[j], order[i]]; }
  const arms = order.map((t, i) => ({ cond: B.CMP(ctx.v, ">=", t), body: [P(ctx.labels[i])] }));
  const stmts = [chain(arms, [P(ctx.labels[n])])];
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]);
  const reached = new Set(dom.map(e => run(stmts, e)[0]));
  const deadLabels = arms.map(a => a.body[0].s).filter(l => !reached.has(l));
  if (dead !== (deadLabels.length > 0)) reject("mismatch");
  const opt = (l, tag) => ({ text: `The "${l}" branch can never run`, tag, claim: { t: "neverPrints", p: "c", mark: l } });
  const every = { text: "Every branch can run for some value", claim: { t: "allPrint", p: "c", marks: [...arms.map(a => a.body[0].s), ctx.labels[n]] } };
  let correct, wrong;
  const live = [...arms.map(a => a.body[0].s), ctx.labels[n]].filter(l => reached.has(l));
  if (deadLabels.length === 1) { correct = opt(deadLabels[0], "correct"); wrong = [{ ...every, tag: "ignores-shadowing" }, ...sample(live, 2, rng).map(l => opt(l, "reachable-branch"))]; }
  else if (deadLabels.length === 0) { correct = { ...every, tag: "correct" }; wrong = sample(live, 3, rng).map(l => opt(l, "thinks-overlap-blocks-it")); }
  else { correct = { text: `Both ${join(deadLabels.map(l => `"${l}"`))} can never run`, tag: "correct", claim: { t: "all", of: deadLabels.map(l => ({ t: "neverPrints", p: "c", mark: l })) } }; wrong = [{ ...every, tag: "ignores-shadowing" }, ...sample(deadLabels, Math.min(2, deadLabels.length), rng).map(l => ({ ...opt(l, "finds-only-one-dead-branch"), claim: { t: "all", of: [{ t: "neverPrints", p: "c", mark: l }, { t: "allPrint", p: "c", marks: deadLabels.filter(x => x !== l) }] } }))]; if (wrong.length < 3) wrong.push(opt(pick(live, rng), "reachable-branch")); }
  return challenge({ ...base("unreachable"), rng, question: `${ctx.v} can be any int from ${ctx.lo} to ${ctx.hi}. Which statement is true?`, code: codeOf(stmts, declLine(ctx)), correct, wrong,
    explanation: deadLabels.length ? `An else-if is tested only when every earlier condition is false. Every value that satisfies the shadowed test also satisfies an earlier, less selective test, so ${join(deadLabels.map(l => `"${l}"`))} never prints.` : `The thresholds are tested from most to least selective, so each branch has values that reach it.`,
    structure: `unreach-${deadLabels.length}|${shapeOf(stmts)}`, complexity: complexity("unreachable", stmts, 1), check: { programs: { c: progOf(stmts, [ctx.v]) }, inputs: { c: inputsOf(dom, [[ctx.v]]) } } });
};
// Advanced: an earlier range test contains a later range test, so the later one is shadowed.
function unreachableIntervals(rng, L) {
  const ctx = pick(CONTEXTS, rng); const [a, b, c, d] = thresholds(rng, ctx, 4).sort((x, y) => x - y);
  const shadow = chance(0.75, rng);
  const r1 = B.AND(B.CMP(ctx.v, ">=", a), B.CMP(ctx.v, "<", d));
  const inner = shadow ? B.AND(B.CMP(ctx.v, ">", b), B.CMP(ctx.v, "<=", c)) : B.AND(B.CMP(ctx.v, ">", b), B.CMP(ctx.v, "<=", d + int(1, 5, rng)));
  const arms = [{ cond: B.CMP(ctx.v, ">=", d + int(5, 9, rng) <= ctx.hi ? d + 5 : d), body: [P(ctx.labels[0])] }, { cond: r1, body: [P(ctx.labels[1])] }, { cond: inner, body: [P(ctx.labels[2])] }, { cond: B.CMP(ctx.v, "<", a), body: [P(ctx.labels[3])] }];
  const stmts = [chain(arms, [P(ctx.labels[4])])];
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]); const reached = new Set(dom.map(e => run(stmts, e)[0]));
  const labels = [...arms.map(x => x.body[0].s), ctx.labels[4]]; const dead = labels.filter(l => !reached.has(l)), live = labels.filter(l => reached.has(l));
  if (dead.length > 1) reject("too many dead");
  const opt = (l, tag) => ({ text: `The "${l}" branch can never run`, tag, claim: { t: "neverPrints", p: "c", mark: l } });
  const every = { text: "Every branch can run for some value", claim: { t: "allPrint", p: "c", marks: labels } };
  const correct = dead.length ? opt(dead[0], "correct") : { ...every, tag: "correct" };
  const wrong = dead.length ? [{ ...every, tag: "ignores-shadowing" }, ...sample(live, 2, rng).map(l => opt(l, "reachable-branch"))] : sample(live, 3, rng).map(l => opt(l, "thinks-overlap-blocks-it"));
  return challenge({ ...base("unreachable"), rng, question: `${ctx.v} can be any int from ${ctx.lo} to ${ctx.hi}. Which statement is true?`, code: codeOf(stmts, declLine(ctx)), correct, wrong,
    explanation: dead.length ? `Every value in the "${dead[0]}" range also lies inside an earlier range test, and an else-if is reached only after the earlier tests are false.` : `Each range test has values not covered by any earlier test, so every branch is reachable.`,
    structure: `unreach-int-${dead.length}|${shapeOf(stmts)}`, complexity: complexity("unreachable", stmts, 1, 1), check: { programs: { c: progOf(stmts, [ctx.v]) }, inputs: { c: inputsOf(dom, [[ctx.v]]) } } });
}
F["dead-code"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const t1 = int(ctx.lo + 20, ctx.hi - 20, rng), t2 = t1 - int(3, 15, rng);
  const deadLbl = ctx.labels[1];
  const contradictory = chance(0.7, rng);
  const inner = chain([{ cond: B.CMP(ctx.v, "<", contradictory ? t2 : t1 + int(3, 12, rng)), body: [P(deadLbl)] }], [P(ctx.labels[2])]);
  const outerCond = L === "Advanced" ? B.AND(B.CMP(ctx.v, ">", t1), B.NOT(B.CMP(ctx.v, ">=", Math.min(ctx.hi, t1 + int(15, 30, rng))))) : B.CMP(ctx.v, ">", t1);
  const stmts = [chain([{ cond: outerCond, body: [P(ctx.labels[0]), inner] }], [P(ctx.labels[3])])];
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]); const reached = new Set(dom.flatMap(e => run(stmts, e)));
  const all = [ctx.labels[0], deadLbl, ctx.labels[2], ctx.labels[3]]; const deads = all.filter(l => !reached.has(l));
  if (deads.length !== (contradictory ? 1 : 0)) reject("dead mismatch");
  const opt = (l, tag) => ({ text: `System.out.println("${l}") never runs`, tag, claim: { t: "neverPrints", p: "c", mark: l } });
  const every = { text: "Every println can run", claim: { t: "allPrint", p: "c", marks: all } };
  const correct = contradictory ? opt(deadLbl, "correct") : { ...every, tag: "correct" };
  const wrong = contradictory ? [{ ...every, tag: "misses-contradiction" }, opt(ctx.labels[2], "confuses-inner-else"), opt(ctx.labels[3], "confuses-outer-else")] : all.filter(l => l !== ctx.labels[0]).map(l => opt(l, "assumes-nested-test-is-impossible"));
  return challenge({ ...base("dead-code"), rng, question: `${ctx.v} can be any int from ${ctx.lo} to ${ctx.hi}. Which statement is true?`, code: codeOf(stmts, declLine(ctx)), correct, wrong,
    explanation: contradictory ? `The inner test needs ${ctx.v} < ${t2}, but the code is only reached when ${ctx.v} > ${t1}. No value satisfies both, so "${deadLbl}" is dead code.` : `Values between ${t1 + 1} and the inner threshold satisfy both tests, so every println can run.`,
    structure: `dead-${contradictory}|${shapeOf(stmts)}`, complexity: complexity("dead-code", stmts, 1), check: { programs: { c: progOf(stmts, [ctx.v]) }, inputs: { c: inputsOf(dom, [[ctx.v]]) } } });
};
F["reach-target"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const { stmts, ts } = descendingChain(rng, ctx, L === "Beginner" ? 2 : L === "Intermediate" ? 3 : 4, { ascending: chance(0.3, rng) });
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]); const lbls = [...stmts[0].arms.map(a => a.body[0].s), stmts[0].elseBody[0].s];
  const target = pick(lbls.slice(1), rng);
  const reaches = k => run(stmts, { [ctx.v]: k })[0] === target;
  const cands = [...new Set(ts.flatMap(t => [t - 2, t - 1, t, t + 1, t + 2]))].filter(k => k >= ctx.lo && k <= ctx.hi);
  const good = cands.filter(reaches), bad = cands.filter(k => !reaches(k)); if (!good.length || bad.length < 3) reject("cands");
  const nearest = bad.sort((a, b) => Math.min(...ts.map(t => Math.abs(a - t))) - Math.min(...ts.map(t => Math.abs(b - t))));
  const opt = (k, tag) => ({ text: `${ctx.v} = ${k}`, tag, claim: { t: "out", p: "c", in: [k], is: target + "\n" } });
  return challenge({ ...base("reach-target"), rng, question: `Which value of ${ctx.v} makes this code print "${target}"?`, code: codeOf(stmts, declLine(ctx)),
    correct: opt(pick(good, rng), "correct"), wrong: sample(nearest.slice(0, 5), 3, rng).map(k => opt(k, run(stmts, { [ctx.v]: k }, "boundary-flip")[0] === target ? "boundary-off-by-one" : "captured-by-another-branch")),
    explanation: `"${target}" prints only when every earlier condition is false and its own condition is true; check each candidate against the boundaries in order.`,
    structure: `reach|${shapeOf(stmts)}`, complexity: complexity("reach-target", stmts, 1), check: { programs: { c: progOf(stmts, [ctx.v]) }, inputs: { c: cands.map(k => [k]) } } });
};
F["multi-variable"] = (rng, L) => {
  const pr = pick(PAIRS, rng); const [x, xl, xh] = pr.x, [y, yl, yh] = pr.y;
  const a1 = B.AND(B.CMP(x, pick([">=", ">"], rng), int(xl + 3, xh - 2, rng)), B.CMP(y, pick([">=", ">"], rng), int(yl + 3, yh - 2, rng)));
  const a2 = chance(0.5, rng) ? B.OR(B.CMP(x, ">=", int(xl + 2, xh - 2, rng)), B.CMP(y, ">=", int(yl + 2, yh - 2, rng))) : B.AND(B.CMP(x, "<", int(xl + 2, xh - 2, rng)), B.NOT(B.CMP(y, "==", int(yl + 1, yh - 1, rng))));
  const stmts = [chain([{ cond: a1, body: [P(pr.labels[0])] }, { cond: a2, body: [P(pr.labels[1])] }], [P(pr.labels[3])])];
  const target = pick([pr.labels[0], pr.labels[1], pr.labels[3]], rng);
  const dom = domainOf([[x, xl, xh], [y, yl, yh]]);
  const good = dom.filter(e => run(stmts, e)[0] === target), bad = dom.filter(e => run(stmts, e)[0] !== target);
  if (!good.length || bad.length < 3) reject("reach");
  const misled = shuffle(bad, rng).sort((e1, e2) => (run(stmts, e2, "and-as-or")[0] === target) - (run(stmts, e1, "and-as-or")[0] === target));
  const opt = (e, tag) => ({ text: `${x} = ${e[x]}, ${y} = ${e[y]}`, tag, claim: { t: "out", p: "c", in: [e[x], e[y]], is: target + "\n" } });
  const pickW = misled.slice(0, 3);
  return challenge({ ...base("multi-variable"), rng, question: `Which input pair makes this code print "${target}"?`, code: codeOf(stmts, `// ${x} is from ${xl} to ${xh}; ${y} is from ${yl} to ${yh}\n`),
    correct: opt(pick(good, rng), "correct"), wrong: pickW.map(e => opt(e, run(stmts, e, "and-as-or")[0] === target ? "treats-and-as-or" : run(stmts, e, "all-true-branches").includes(target) ? "ignores-earlier-branch" : "misevaluated-comparison")),
    explanation: `Check the conditions in order with both values: ${stmts[0].arms.map(a => B.print(a.cond)).join(" then ")}. Only the chosen pair makes "${target}" the first branch whose condition is true.`,
    structure: `multivar|${shapeOf(stmts)}`, complexity: complexity("multi-variable", stmts, 2), check: { programs: { c: progOf(stmts, [x, y]) }, inputs: { c: inputsOf(dom, [[x], [y]]) } } });
};
// ---------- chain comparison ----------
function chainPair(rng, ctx, L, equivalent) {
  const n = L === "Advanced" ? 3 : 2; const { stmts, ts, labels } = descendingChain(rng, ctx, n);
  const asc = [chain([...stmts[0].arms].reverse().map((a, i, arr) => ({ cond: B.negCmp(a.cond), body: [P(i === 0 ? labels[n] : arr[i - 1].body[0].s)] })), [P(labels[0])])];
  // asc: tests the complement from the bottom up. Check equivalence exhaustively.
  const variants = [[asc, "reordered-with-complements"]];
  const offBy = JSON.parse(JSON.stringify(asc)); const k = int(0, offBy[0].arms.length - 1, rng); const c = offBy[0].arms[k].cond; offBy[0].arms[k].cond = B.CMP(c.v, FLIP[c.op], c.c); variants.push([offBy, "boundary-off-by-one"]);
  const wrongOrder = [chain([...stmts[0].arms].reverse(), stmts[0].elseBody)]; variants.push([wrongOrder, "order-reversed-without-changing-tests"]);
  const noElse = [chain(asc[0].arms, null)]; variants.push([noElse, "dropped-the-else"]);
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]); const same = alt => dom.every(e => outText(run(alt, e)) === outText(run(stmts, e)));
  return { stmts, dom, variants: variants.map(([s, tag]) => ({ s, tag, eq: same(s) })), ts };
}
const chainNotation = stmts => { const s = stmts[0]; return s.arms.map((a, i) => `${i ? "else if" : "if"} (${B.print(a.cond)}) → "${a.body[0].s}"`).join("; ") + (s.elseBody ? `; else → "${s.elseBody[0].s}"` : ""); };
F["equivalent-chain"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const { stmts, dom, variants } = chainPair(rng, ctx, L);
  const good = variants.filter(v => v.eq), bad = variants.filter(v => !v.eq); if (good.length !== 1 || bad.length < 3) reject("variants");
  const Pm = { c: progOf(stmts, [ctx.v]) }, inputs = { c: inputsOf(dom, [[ctx.v]]) };
  const opts = [{ ...good[0], tag: "correct" }, ...bad.slice(0, 3)];
  opts.forEach((o, i) => { Pm[`o${i}`] = progOf(o.s, [ctx.v]); inputs[`o${i}`] = inputs.c; o.text = chainNotation(o.s); o.claim = { t: "sameAll", a: "c", b: `o${i}` }; });
  return challenge({ ...base("equivalent-chain"), rng, question: `${ctx.v} can be any int from ${ctx.lo} to ${ctx.hi}. Which chain prints the same thing as this code for every value? (→ shows what each branch prints.)`, code: codeOf(stmts, declLine(ctx)),
    correct: opts[0], wrong: opts.slice(1), explanation: `Testing from the other end works only if every test is the exact complement (>= t becomes < t) and the old else becomes the new first branch's opposite. Off-by-one bounds, reversed order with the same tests, or a missing else all change some outputs.`,
    structure: `equivchain|${shapeOf(stmts)}`, complexity: complexity("equivalent-chain", stmts, 1, 1.5), check: { programs: Pm, inputs } });
};
F.counterexample = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const { stmts, dom, variants, ts } = chainPair(rng, ctx, L);
  const bad = variants.filter(v => !v.eq && v.tag !== "dropped-the-else"); if (!bad.length) reject("bad"); const b = pick(bad, rng);
  const diff = dom.filter(e => outText(run(b.s, e)) !== outText(run(stmts, e))).map(e => e[ctx.v]);
  const cands = [...new Set(ts.flatMap(t => [t - 2, t - 1, t, t + 1, t + 2]))].filter(k => k >= ctx.lo && k <= ctx.hi);
  const ansPool = diff.filter(k => cands.includes(k)).length ? diff.filter(k => cands.includes(k)) : diff; const ans = pick(ansPool, rng);
  const agree = shuffle(cands.filter(k => !diff.includes(k)), rng); if (agree.length < 3) reject("agree");
  const Pm = { a: progOf(stmts, [ctx.v]), b: progOf(b.s, [ctx.v]) }; const all = [ans, ...agree.slice(0, 3)];
  const opt = (k, tag) => ({ text: `${ctx.v} = ${k}`, tag, claim: { t: "differ", a: "a", b: "b", in: [k] } });
  return challenge({ ...base("counterexample"), rng, question: `Version B was meant to behave like Version A. Which value of ${ctx.v} proves they are different?`,
    code: `// Version A\n${codeOf(stmts)}\n\n// Version B\n${codeOf(b.s)}`, correct: opt(ans, "correct"), wrong: agree.slice(0, 3).map(k => opt(k, "both-versions-agree")),
    explanation: `For ${ctx.v} = ${ans}, Version A prints ${outText(run(stmts, { [ctx.v]: ans }))} but Version B prints ${outText(run(b.s, { [ctx.v]: ans }))} (${b.tag.replace(/-/g, " ")}).`,
    structure: `counter|${b.tag}|${shapeOf(stmts)}`, complexity: complexity("counterexample", stmts, 1, 1.5), check: { programs: Pm, inputs: { a: all.map(k => [k]), b: all.map(k => [k]) } } });
};
// ---------- debugging ----------
function specChain(rng, ctx, n) {
  const ts = thresholds(rng, ctx, n); const labels = ctx.labels.slice(0, n + 1);
  const spec = k => { for (let i = 0; i < n; i++) if (k >= ts[i]) return labels[i]; return labels[n]; };
  const words = ts.map((t, i) => i === 0 ? `${t} and above → "${labels[0]}"` : `${t} to ${ts[i - 1] - 1} → "${labels[i]}"`).join("; ") + `; below ${ts[n - 1]} → "${labels[n]}"`;
  return { ts, labels, spec, words };
}
F["fix-boundary"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const n = L === "Advanced" ? 3 : 2; const { ts, labels, spec, words } = specChain(rng, ctx, n);
  const arms = ts.map((t, i) => ({ cond: B.CMP(ctx.v, ">=", t), body: [P(labels[i])] }));
  const bug = int(0, n - 1, rng); arms[bug].cond = B.CMP(ctx.v, ">", ts[bug]);
  const stmts = [chain(arms, [P(labels[n])])];
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]); const want = { params: [["int", ctx.v]], body: lines([chain(ts.map((t, i) => ({ cond: B.CMP(ctx.v, ">=", t), body: [P(labels[i])] })), [P(labels[n])])]).join("\n") };
  const fixes = [];
  const fx = (desc, mut, tag) => { const s = JSON.parse(JSON.stringify(stmts)); mut(s[0]); fixes.push({ text: desc, s, tag }); };
  fx(`Change ${ctx.v} > ${ts[bug]} to ${ctx.v} >= ${ts[bug]}`, c => { c.arms[bug].cond = B.CMP(ctx.v, ">=", ts[bug]); }, "correct");
  fx(`Change ${ctx.v} > ${ts[bug]} to ${ctx.v} > ${ts[bug] - 2}`, c => { c.arms[bug].cond = B.CMP(ctx.v, ">", ts[bug] - 2); }, "overcorrects-the-threshold");
  const other = (bug + 1) % n; fx(`Change ${ctx.v} >= ${ts[other]} to ${ctx.v} > ${ts[other]}`, c => { c.arms[other].cond = B.CMP(ctx.v, ">", ts[other]); }, "changes-the-wrong-boundary");
  fx(`Change ${ctx.v} > ${ts[bug]} to ${ctx.v} >= ${ts[bug] + 1}`, c => { c.arms[bug].cond = B.CMP(ctx.v, ">=", ts[bug] + 1); }, "equivalent-rewrite-of-the-bug");
  fx(`Swap the order of the first two conditions`, c => { [c.arms[0], c.arms[1]] = [c.arms[1], c.arms[0]]; }, "reorders-instead-of-fixing");
  const ok = f => dom.every(e => run(f.s, e)[0] === spec(e[ctx.v]));
  const good = fixes.filter(ok); if (good.length !== 1 || good[0].tag !== "correct") reject("fix not unique");
  const Pm = { want }, inputs = { want: inputsOf(dom, [[ctx.v]]) };
  const opts = [good[0], ...shuffle(fixes.filter(f => !ok(f)), rng).slice(0, 3)];
  opts.forEach((o, i) => { Pm[`f${i}`] = progOf(o.s, [ctx.v]); inputs[`f${i}`] = inputs.want; o.claim = { t: "sameAll", a: "want", b: `f${i}` }; });
  return challenge({ ...base("fix-boundary"), rng, question: `Required behavior for ${ctx.v} from ${ctx.lo} to ${ctx.hi}: ${words}. Which single change fixes the code?`, code: codeOf(stmts, declLine(ctx)),
    correct: opts[0], wrong: opts.slice(1), explanation: `"${ts[bug]} and above" includes ${ts[bug]}, so the test must be >= ${ts[bug]}. With >, the value ${ts[bug]} falls to the next branch.`,
    structure: `fixb|${n}|${bug}`, complexity: complexity("fix-boundary", stmts, 1, 1), check: { programs: Pm, inputs } });
};
F["fix-order"] = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const n = L === "Advanced" ? 3 : 2; const { ts, labels, spec, words } = specChain(rng, ctx, n);
  const right = ts.map((t, i) => ({ cond: B.CMP(ctx.v, ">=", t), body: [P(labels[i])] }));
  let wrongOrder = shuffle(right, rng); if (wrongOrder.every((a, i) => a === right[i])) wrongOrder = [...right].reverse();
  const stmts = [chain(wrongOrder, [P(labels[n])])];
  const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]);
  const notation = arms => arms.map(a => `${B.print(a.cond)} → "${a.body[0].s}"`).join(", then ");
  const cands = [[right, "correct"], [[...right].reverse(), "least-selective-first"], [wrongOrder.map(a => ({ ...a, cond: B.CMP(ctx.v, ">", a.cond.c) })), "changes-bounds-not-order"]];
  if (n === 3) cands.push([[right[0], right[2], right[1]], "partially-reordered"]); else cands.push([[{ cond: B.CMP(ctx.v, "<", ts[1]), body: [P(labels[1])] }, right[0]], "complements-the-wrong-test"]);
  const opts = []; for (const [arms, tag] of cands) { const s = [chain(arms, [P(labels[n])])]; const t = notation(arms); if (!opts.some(o => o.text === t)) opts.push({ text: t, tag, s }); }
  const ok = o => dom.every(e => run(o.s, e)[0] === spec(e[ctx.v]));
  if (opts.filter(ok).length !== 1 || !ok(opts[0])) reject("order fix not unique");
  const want = progOf([chain(right, [P(labels[n])])], [ctx.v]); const Pm = { want }, inputs = { want: inputsOf(dom, [[ctx.v]]) };
  opts.forEach((o, i) => { Pm[`f${i}`] = progOf(o.s, [ctx.v]); inputs[`f${i}`] = inputs.want; o.claim = { t: "sameAll", a: "want", b: `f${i}` }; });
  return challenge({ ...base("fix-order"), rng, question: `Required behavior: ${words}. The code below gets some values wrong. Which test order (keeping the final else "${labels[n]}") is correct?`, code: codeOf(stmts, declLine(ctx)),
    correct: opts[0], wrong: opts.slice(1), explanation: `With >= tests, the most selective threshold (${ts[0]}) must be checked first; otherwise a smaller threshold captures values that belong to a higher branch.`,
    structure: `fixo|${shapeOf(stmts)}`, complexity: complexity("fix-order", stmts, 1, 1), check: { programs: Pm, inputs } });
};
F.redundant = (rng, L) => {
  const ctx = pick(CONTEXTS, rng); const n = L === "Advanced" ? 3 : 2; const { ts, labels } = specChain(rng, ctx, n);
  // else-if arms carry an upper bound that earlier failures already guarantee
  const arms = ts.map((t, i) => ({ cond: i === 0 ? B.CMP(ctx.v, ">=", t) : B.AND(B.CMP(ctx.v, ">=", t), B.CMP(ctx.v, "<", ts[i - 1])), body: [P(labels[i])] }));
  const stmts = [chain(arms, [P(labels[n])])]; const dom = domainOf([[ctx.v, ctx.lo, ctx.hi]]);
  const same = s => dom.every(e => outText(run(s, e)) === outText(run(stmts, e)));
  const opts = [];
  arms.forEach((a, i) => { if (a.cond.k !== "and") return; a.cond.xs.forEach((atom, j) => { const s = JSON.parse(JSON.stringify(stmts)); s[0].arms[i].cond = a.cond.xs[1 - j]; opts.push({ text: `Remove "${B.print(atom)}" from the "${labels[i]}" test`, s, tag: j === 1 ? "correct" : "removes-a-needed-lower-bound" }); }); });
  const s0 = JSON.parse(JSON.stringify(stmts)); s0[0].elseBody = null; opts.push({ text: `Remove the else branch`, s: s0, tag: "removes-the-fallback" });
  const s1 = JSON.parse(JSON.stringify(stmts)); s1[0].arms[0].cond = B.CMP(ctx.v, ">", ts[0]); opts.push({ text: `Change ${ctx.v} >= ${ts[0]} to ${ctx.v} > ${ts[0]}`, s: s1, tag: "boundary-change" });
  const good = opts.filter(o => same(o.s)); if (!good.length) reject("none redundant");
  const ans = pick(good, rng); const wrong = shuffle(opts.filter(o => !same(o.s)), rng).slice(0, 3); if (wrong.length < 3) reject("few");
  const Pm = { c: progOf(stmts, [ctx.v]) }, inputs = { c: inputsOf(dom, [[ctx.v]]) };
  [ans, ...wrong].forEach((o, i) => { Pm[`o${i}`] = progOf(o.s, [ctx.v]); inputs[`o${i}`] = inputs.c; o.claim = { t: "sameAll", a: "c", b: `o${i}` }; });
  return challenge({ ...base("redundant"), rng, question: "Which change removes a redundant condition without changing what the code prints for any value?", code: codeOf(stmts, declLine(ctx)),
    correct: { ...ans, tag: "correct" }, wrong, explanation: `An else-if only runs after every earlier test failed. Because ${ctx.v} >= ${ts[0]} was false, ${ctx.v} < ${ts[0]} is already guaranteed in the next test, so that upper bound is redundant. The lower bounds are not redundant.`,
    structure: `redundant|${shapeOf(stmts)}`, complexity: complexity("redundant", stmts, 1), check: { programs: Pm, inputs } });
};
F["short-circuit"] = (rng, L) => {
  const kind = L === "Beginner" ? "guard-divide" : pick(["guard-divide", "counter-and", "counter-or"], rng);
  if (kind === "guard-divide") {
    const count = pick([0, 0, int(1, 6, rng)], rng), total = int(0, 40, rng), k = int(2, 8, rng); const useOr = L === "Advanced" && chance(0.5, rng);
    const cond = useOr ? `count == 0 || total / count > ${k}` : `count != 0 && total / count > ${k}`;
    const val = useOr ? (count === 0 || Math.floor(total / count) > k) : (count !== 0 && Math.floor(total / count) > k);
    const body = `int count = ${count};\nint total = ${total};\nif (${cond}) {\n    System.out.println("Yes");\n} else {\n    System.out.println("No");\n}`;
    const ans = val ? "Yes" : "No";
    const prog = { params: [], body: body };
    const opts = [{ text: ans, tag: "correct", claim: { t: "out", p: "s", in: [], is: ans + "\n" } }, { text: val ? "No" : "Yes", tag: "misevaluated-condition", claim: { t: "out", p: "s", in: [], is: (val ? "No" : "Yes") + "\n" } },
      { text: "It throws an ArithmeticException", tag: count === 0 ? "ignores-short-circuit" : "fears-division", claim: { t: "out", p: "s", in: [], is: "EXCEPTION:ArithmeticException" } }, { text: "Yes, then No", tag: "runs-both-branches", claim: { t: "out", p: "s", in: [], is: "Yes\nNo\n" } }];
    return challenge({ ...base("short-circuit"), rng, question: "What happens when this code runs?", code: body, correct: opts[0], wrong: opts.slice(1),
      explanation: count === 0 ? `count ${useOr ? "== 0 is true, so || skips" : "!= 0 is false, so && skips"} the division; no exception occurs and "${ans}" prints.` : `count is ${count}, so the division runs: ${total} / ${count} is ${Math.floor(total / count)} (integer division), and the condition is ${val}.`,
      structure: `short-${kind}-${useOr}-${count === 0}`, complexity: { score: +(3 + WEIGHT["short-circuit"] + (useOr ? 1 : 0)).toFixed(2), factors: { operands: 2, sideEffects: 0, task: WEIGHT["short-circuit"] } }, check: { programs: { s: prog }, inputs: { s: [[]] } } });
  }
  const x = int(0, 12, rng), t = int(2, 10, rng), hits = int(0, 3, rng), and = kind === "counter-and";
  const second = pick(["++hits > 0", `hits++ >= ${hits}`, "++hits > 1"], rng);
  const cond = and ? `x > ${t} && ${second}` : `x > ${t} || ${second}`;
  const evals = and ? x > t : !(x > t);
  const body = `int x = ${x};\nint hits = ${hits};\nif (${cond}) {\n    System.out.print("In ");\n}\nSystem.out.print(hits);`;
  // simulate
  let h = hits; const left = x > t; let right = null;
  const evalSecond = () => { if (second === "++hits > 0") { h++; return h > 0; } if (second.startsWith("hits++")) { const old = h; h++; return old >= hits; } h++; return h > 1; };
  const result = and ? (left && (right = evalSecond())) : (left || (right = evalSecond()));
  void right; const out = `${result ? "In " : ""}${h}`;
  const both = (() => { let hh = hits; hh++; const r2 = second === "++hits > 0" ? hh > 0 : second.startsWith("hits++") ? hits >= hits : hh > 1; const res = and ? left && r2 : left || r2; return `${res ? "In " : ""}${hh}`; })();
  const never = `${(and ? false : left) ? "In " : ""}${hits}`;
  const prog = { params: [], body };
  const cands = [[out, "correct"], [both, "evaluates-both-operands"], [never, "thinks-right-side-never-runs"], [`${result ? "" : "In "}${h}`, "misevaluated-condition"], [`${result ? "In " : ""}${h + 1}`, "miscounted-increment"]];
  const uniq = []; for (const [txt, tag] of cands) if (!uniq.some(u => u.text === txt)) uniq.push({ text: txt, tag, claim: { t: "out", p: "s", in: [], is: txt } });
  if (uniq.length < 4 || uniq[0].tag !== "correct") reject("short-circuit options");
  return challenge({ ...base("short-circuit"), rng, question: "What is printed?", code: body, correct: uniq[0], wrong: uniq.slice(1),
    explanation: `x > ${t} is ${left}. ${and ? (left ? "&& must also evaluate the right side, which updates hits." : "&& stops at a false left side, so the right side (and its increment) never runs.") : (left ? "|| stops at a true left side, so the increment never runs." : "|| must evaluate the right side, which updates hits.")}`,
    structure: `short-${kind}-${second.replace(/\d+/g, "N")}-${evals}`, complexity: { score: +(3 + WEIGHT["short-circuit"] + 1).toFixed(2), factors: { operands: 2, sideEffects: 1, task: WEIGHT["short-circuit"] } }, check: { programs: { s: prog }, inputs: { s: [[]] } } });
};

export function generateCoverage(rng, L = "Intermediate", forced) {
  const fam = forced || pick(FAMILIES[L], rng);
  return retry(() => F[fam](rng, L), 300);
}
