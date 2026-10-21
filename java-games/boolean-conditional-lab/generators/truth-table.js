/* Truth Table Builder: 12 reasoning activities over generated expression trees. */
import { pick, int, chance, shuffle, sample, reject, retry } from "./core.js";
import * as B from "./bool.js";
import { challenge, boolProgram, boolInputs, rowInput, fmtRow } from "./schema.js";

const MODE = "truthTable";
const NAME_SETS = [["a", "b", "c", "d"], ["p", "q", "r", "s"], ["x", "y", "z", "w"]];
// Descriptive names are parameter variation (the diagnostics report them as such,
// never as new structure); they keep code realistic and readable.
const NAMED_SETS = [["raining", "windy", "cold", "dark"], ["hasKey", "doorOpen", "alarmOn", "isAdmin"], ["paid", "shipped", "late", "returned"],
  ["online", "charging", "muted", "locked"], ["member", "coupon", "onSale", "giftCard"], ["ready", "waiting", "done", "failed"],
  ["isEven", "isPositive", "isLarge", "isPrime"], ["visible", "enabled", "focused", "selected"], ["home", "awake", "busy", "hungry"]];
const VARIABLE_NAMES = ["hasBadge", "isReady", "doorOpen", "hasKey", "isActive", "isOnline", "hasAccess", "isComplete", "needsReview", "isSelected", "canEdit", "isLocked", "hasTicket", "isValid", "isEmpty", "isFull", "isPaused", "isVisible", "hasSignal", "isConnected", "isSafe", "isLate", "hasPermission", "isVerified", "isMember", "isPremium", "hasCoupon", "isAvailable", "isUrgent", "hasError", "isApproved", "isPublic", "hasUpdate", "isSignedIn", "isMuted", "isCharging", "hasBalance", "isWinner", "isBlocked", "isArchived", "canSubmit", "isEligible", "hasLicense", "isExpired", "isEnabled", "isFocused", "isRemote", "hasChanges", "isDirty", "canMove"];
export const LEVELS = {
  Beginner: { vars: () => 2, leaves: [2, 4], negLeaf: 0.35, negGroup: 0.3, slack: 0, maxDepth: 2, mixed: false },
  Intermediate: { vars: rng => chance(0.75, rng) ? 3 : 2, leaves: [3, 5], negLeaf: 0.3, negGroup: 0.3, slack: 1, minDepth: 2, maxDepth: 3, mixed: true },
  Advanced: { vars: () => 3, leaves: [5, 8], negLeaf: 0.3, negGroup: 0.45, slack: 2, minDepth: 2, maxDepth: 4, mixed: true, advanced: true },
};
export const ACTIVITIES = {
  Beginner: ["eval-row", "complete-missing", "find-error-row", "inputs-make-true", "count-true-rows", "count-false-rows", "always-true", "always-false"],
  Intermediate: ["eval-row", "eval-trace", "complete-missing", "find-error-row", "inputs-make-true", "count-true-rows", "count-false-rows", "always-true", "always-false"],
  Advanced: ["eval-trace", "complete-missing", "find-error-row", "inputs-make-true", "count-true-rows", "count-false-rows", "always-true", "always-false"],
};
const WEIGHT = { "eval-row": 0, "eval-trace": 1.5, "complete-missing": 0.5, "find-error-row": 1.5, "inputs-make-true": 1, "count-true-rows": 2, "count-false-rows": 2, "always-true": 2.5, "always-false": 2.5 };
const SKILL = {
  "eval-row": "Evaluate a specified row", "eval-trace": "Evaluate a row through its subexpressions", "complete-missing": "Complete missing truth-table values",
  "find-error-row": "Identify an incorrectly evaluated row", "inputs-make-true": "Identify inputs that produce a given result", "always-true": "Decide whether an expression is always true",
  "always-false": "Decide whether an expression is always false", "count-true-rows": "Count true results in a truth table", "count-false-rows": "Count false results in a truth table", "equivalence-check": "Determine whether two expressions are equivalent", "counterexample-row": "Find a row demonstrating nonequivalence",
  simplify: "Identify a meaningful simplification", "negate-effect": "Determine the effect of negating a subexpression", grouping: "Determine how Java groups mixed operators",
  "grouping-counterexample": "Compare expressions with different grouping",
};

// ---------------- expression generation ----------------
function genExpr(rng, L, names, opts = {}) {
  const cfg = LEVELS[L];
  return retry(() => {
    const nv = opts.vars ?? cfg.vars(rng); const vars = names.slice(0, nv);
    const lo = Math.max(cfg.leaves[0], nv), hi = Math.max(lo, cfg.leaves[1] + (nv === 4 ? 1 : 0));
    const n = B.randomTree(rng, { vars, leafCount: int(lo, hi, rng), negLeaf: cfg.negLeaf, negGroup: cfg.negGroup, topOp: opts.topOp, negTop: opts.negTop ?? 0.12 });
    const q = B.quality(n, { slack: cfg.slack });
    if (!q.valid) reject(q.reasons[0]);
    const m = q.metrics;
    if (cfg.mixed && !m.mixed) reject("needs mixed operators");
    if (cfg.minDepth && m.depth < cfg.minDepth) reject("too shallow");
    if (m.depth > cfg.maxDepth) reject("too deep");
    if (cfg.advanced && m.depth < 3 && m.negatedGroups < 1) reject("advanced needs nesting or a negated group");
    if (opts.needNegGroup && m.negatedGroups < 1 && !B.paths(n).some(p => B.SOUND.pullNot(B.at(n, p)))) reject("needs a De Morgan site");
    if (opts.accept && !opts.accept(n, vars)) reject("activity constraint");
    return { node: n, vars };
  }, 2000);
}
const names = rng => chance(0.45, rng) ? shuffle(pick(NAMED_SETS, rng), rng) : shuffle(VARIABLE_NAMES, rng).slice(0, 4);
const T = b => String(b);
const decls = (vars, env) => vars.map(v => `boolean ${v} = ${env[v]};`).join("\n");
const tableRows = (node, vars) => B.rows(vars).map(e => ({ ...e, result: B.evaluate(node, e) }));
function complexity(L, act, node, vars, extra = 0) {
  const m = B.metrics(node, vars);
  const f = { relevantVars: m.relevantVars, literals: m.literals, depth: m.depth, negatedGroups: m.negatedGroups, mixed: m.mixed ? 1 : 0, steps: m.steps, task: WEIGHT[act] };
  const score = +(1.5 * f.relevantVars + 0.5 * f.literals + 1.2 * f.depth + 1.2 * f.negatedGroups + 1.5 * f.mixed + f.task + extra).toFixed(2);
  return { score, factors: f };
}
// structural descriptor: tree shape with variables abstracted (used by diversity metrics)
const shape = n => n.k === "var" ? "v" : n.k === "cmp" ? "c" : n.k === "not" ? `!${shape(n.a)}` : `${n.k}(${n.xs.map(shape).sort().join(",")})`;
function explainRow(node, env) {
  const parts = B.isCompound(node) ? node.xs : [node];
  const bits = parts.map(p => `${B.print(p)} is ${B.evaluate(p, env)}`);
  const op = node.k === "and" ? "&& needs every operand true" : node.k === "or" ? "|| needs at least one true operand" : "! reverses the value";
  return `With ${fmtRow(B.varsOf(node), env)}: ${bits.join("; ")}. ${op}, so the result is ${B.evaluate(node, env)}.`;
}
const base = (L, act, extra) => ({ mode: MODE, family: act, skill: SKILL[act], ...extra });

// ---------------- activities ----------------
const A = {};
A["eval-row"] = (rng, L) => {
  const want = chance(0.5, rng); const nm = names(rng);
  const { node, vars } = genExpr(rng, L, nm);
  const envs = B.rows(vars).filter(e => B.evaluate(node, e) === want); if (!envs.length) reject("no row");
  const env = pick(envs, rng); const P = { e: boolProgram(vars, node) }, inp = rowInput(vars, env);
  const all = tableRows(node, vars), rowIndex = all.findIndex(r => vars.every(v => r[v] === env[v]));
  const shown = all.map((r, i) => i === rowIndex ? { ...r, result: null } : r);
  const swapped = B.MISTAKES["swap-and-or"](node);
  return challenge({ ...base(L, "eval-row"), rng, count: 2,
    question: `Complete the highlighted Result cell (${fmtRow(vars, env)}). What value belongs there?`,
    code: `${decls(vars, env)}\nboolean result = ${B.print(node)};`,
    correct: { text: T(want), tag: "correct", claim: { t: "out", p: "e", in: inp, is: T(want) } },
    wrong: [{ text: T(!want), tag: swapped && B.evaluate(swapped, env) !== want ? "treats-and-as-or" : "misapplied-operator", claim: { t: "out", p: "e", in: inp, is: T(!want) } }],
    explanation: explainRow(node, env), structure: `eval|${shape(node)}`, complexity: complexity(L, "eval-row", node, vars),
    check: { programs: P, inputs: { e: all.map(r => rowInput(vars, r)) }, table: { p: "e", rows: shown.map(r => ({ in: rowInput(vars, r), shown: r.result })) } }, extra: { expression: B.print(node), table: shown, allRows: all, highlightedRow: rowIndex } });
};
A["eval-trace"] = (rng, L) => {
  const nm = names(rng); const { node, vars } = genExpr(rng, L, nm, { accept: n => B.isCompound(n) && n.xs.some(B.isCompound) });
  const sub = pick(node.xs.filter(x => B.isCompound(x) || (x.k === "not" && B.isCompound(x.a))), rng) || reject("no sub");
  const env = pick(B.rows(vars), rng); const sv = B.evaluate(sub, env), rv = B.evaluate(node, env);
  const all = tableRows(node, vars), rowIndex = all.findIndex(r => vars.every(v => r[v] === env[v]));
  const shown = all.map((r, i) => i === rowIndex ? { ...r, result: null } : r);
  const subT = B.print(sub), txt = (s, r) => `${subT} is ${s}; result is ${r}`;
  const P = { e: boolProgram(vars, node), s: boolProgram(vars, sub) }, inp = rowInput(vars, env);
  const claim = (s, r) => ({ t: "all", of: [{ t: "out", p: "s", in: inp, is: T(s) }, { t: "out", p: "e", in: inp, is: T(r) }] });
  return challenge({ ...base(L, "eval-trace"), rng,
    question: `Trace the highlighted part first. What are the values of ${subT} and result?`,
    code: `${decls(vars, env)}\nboolean result = ${B.print(node)};`,
    correct: { text: txt(sv, rv), tag: "correct", claim: claim(sv, rv) },
    wrong: [[!sv, rv, "subexpression-misevaluated"], [sv, !rv, "outer-operator-misapplied"], [!sv, !rv, "both-steps-wrong"]].map(([s, r, tag]) => ({ text: txt(s, r), tag, claim: claim(s, r) })),
    explanation: `${subT} evaluates to ${sv}. ${explainRow(node, env)}`, structure: `trace|${shape(node)}`, complexity: complexity(L, "eval-trace", node, vars),
    check: { programs: P, inputs: { e: B.rows(vars).map(r => rowInput(vars, r)), s: [inp] }, table: { p: "e", rows: shown.map(r => ({ in: rowInput(vars, r), shown: r.result })) } }, extra: { expression: B.print(node), table: shown, allRows: all, highlightedRow: rowIndex } });
};
A["complete-missing"] = (rng, L) => {
  const nm = names(rng); const { node, vars } = genExpr(rng, L, nm);
  const all = tableRows(node, vars); const k = L === "Beginner" ? 1 : 2;
  const idx = sample(all.map((_, i) => i), k, rng).sort((a, b) => a - b);
  const shown = all.map((r, i) => idx.includes(i) ? { ...r, result: null } : r);
  const P = { e: boolProgram(vars, node) }; const inps = idx.map(i => rowInput(vars, all[i]));
  const claim = vals => ({ t: "all", of: vals.map((v, j) => ({ t: "out", p: "e", in: inps[j], is: T(v) })) });
  const truthVals = idx.map(i => all[i].result);
  const where = idx.map(i => fmtRow(vars, all[i]));
  if (k === 1) {
    return challenge({ ...base(L, "complete-missing"), rng, count: 2,
      question: `Which value belongs in the missing Result cell (${where[0]})?`, code: `boolean result = ${B.print(node)};`,
      correct: { text: T(truthVals[0]), tag: "correct", claim: claim(truthVals) },
      wrong: [{ text: T(!truthVals[0]), tag: "misapplied-operator", claim: claim([!truthVals[0]]) }],
      explanation: explainRow(node, all[idx[0]]), structure: `missing1|${shape(node)}`, complexity: complexity(L, "complete-missing", node, vars),
      check: { programs: P, inputs: { e: B.rows(vars).map(e => rowInput(vars, e)) }, table: { p: "e", rows: shown.map(r => ({ in: rowInput(vars, r), shown: r.result })) } },
      extra: { table: shown, allRows: all, highlightedRow: idx[0], expression: B.print(node) } });
  }
  const txt = v => `Upper ? = ${v[0]}; lower ? = ${v[1]}`;
  const combos = [[true, true], [true, false], [false, true], [false, false]];
  const wrong = combos.filter(c => c[0] !== truthVals[0] || c[1] !== truthVals[1]).map(c => ({ text: txt(c), tag: c[0] !== truthVals[0] && c[1] !== truthVals[1] ? "both-rows-wrong" : "one-row-misevaluated", claim: claim(c) }));
  return challenge({ ...base(L, "complete-missing"), rng,
    question: `Two Result cells are missing (rows ${where.join(" and ")}). Which values complete the table?`, code: `boolean result = ${B.print(node)};`,
    correct: { text: txt(truthVals), tag: "correct", claim: claim(truthVals) }, wrong,
    explanation: idx.map(i => explainRow(node, all[i])).join(" "), structure: `missing2|${shape(node)}`, complexity: complexity(L, "complete-missing", node, vars),
    check: { programs: P, inputs: { e: B.rows(vars).map(e => rowInput(vars, e)) }, table: { p: "e", rows: shown.map(r => ({ in: rowInput(vars, r), shown: r.result })) } },
    extra: { table: shown, allRows: all, highlightedRow: idx[0], expression: B.print(node) } });
};
A["find-error-row"] = (rng, L) => {
  const nm = names(rng), nv = L === "Beginner" ? 2 : L === "Intermediate" ? (chance(0.5, rng) ? 2 : 3) : 3;
  const { node, vars } = genExpr(rng, L, nm, { vars: nv });
  const all = tableRows(node, vars); const rowIndex = int(0, all.length - 1, rng);
  const row = all[rowIndex], shownCorrectly = chance(0.5, rng), shown = all.map((r, i) => ({ ...r, result: i === rowIndex && !shownCorrectly ? !r.result : r.result }));
  const label = fmtRow(vars, row), inp = rowInput(vars, row), shownValue = shown[rowIndex].result;
  return challenge({ ...base(L, "find-error-row"), rng, count: 2,
    question: `For the highlighted row (${label}), what value belongs in its Result cell?`, code: `boolean result = ${B.print(node)};`,
    correct: { text: T(row.result), tag: "correct", claim: { t: "out", p: "e", in: inp, is: T(row.result) } },
    wrong: [{ text: T(!row.result), tag: "row-misevaluated", claim: { t: "out", p: "e", in: inp, is: T(!row.result) } }],
    explanation: `For ${label}, the expression evaluates to ${row.result}. The table shows ${shown[rowIndex].result}, so that cell is ${shownCorrectly ? "correct" : "incorrect"}. ${explainRow(node, row)}`,
    structure: `error-focused|${shape(node)}`, complexity: complexity(L, "find-error-row", node, vars),
    check: { programs: { e: boolProgram(vars, node) }, inputs: { e: [inp] }, table: { p: "e", rows: [{ in: inp, shown: shownValue }], expectWrong: shownCorrectly ? 0 : 1 } },
    extra: { table: shown, allRows: all, expression: B.print(node), highlightedRow: rowIndex } });
};
A["inputs-make-true"] = (rng, L) => {
  const want = chance(0.5, rng); const nm = names(rng);
  const { node, vars } = genExpr(rng, L, nm, { accept: (n, v) => { const t = B.truth(n, v); return [...t].filter(c => c === (want ? "0" : "1")).length >= 3 && t.includes(want ? "1" : "0"); } });
  const all = B.rows(vars); const good = all.filter(e => B.evaluate(node, e) === want), bad = all.filter(e => B.evaluate(node, e) !== want);
  const ans = pick(good, rng); const swapped = B.MISTAKES["swap-and-or"](node);
  const tagged = shuffle(bad, rng).map(e => ({ e, tag: swapped && B.evaluate(swapped, e) === want ? "treats-and-as-or" : "operator-misapplied" })).sort((a, b) => (a.tag === "treats-and-as-or" ? -1 : 1) - (b.tag === "treats-and-as-or" ? -1 : 1)).slice(0, 3);
  const P = { e: boolProgram(vars, node) };
  return challenge({ ...base(L, "inputs-make-true"), rng,
    question: `Use the truth table to select an input combination where result is ${want}.`, code: `boolean result = ${B.print(node)};`,
    correct: { text: fmtRow(vars, ans), tag: "correct", claim: { t: "out", p: "e", in: rowInput(vars, ans), is: T(want) } },
    wrong: tagged.map(({ e, tag }) => ({ text: fmtRow(vars, e), tag, claim: { t: "out", p: "e", in: rowInput(vars, e), is: T(want) } })),
    explanation: explainRow(node, ans), structure: `inputs-${want}|${shape(node)}`, complexity: complexity(L, "inputs-make-true", node, vars),
    check: { programs: P, inputs: { e: all.map(e => rowInput(vars, e)) }, table: { p: "e", rows: all.map(e => ({ in: rowInput(vars, e), shown: B.evaluate(node, e) })) } }, extra: { expression: B.print(node), table: all, allRows: all } });
};
function countRows(rng, L, want) {
  const activity = want ? "count-true-rows" : "count-false-rows";
  const nm = names(rng), { node, vars } = genExpr(rng, L, nm, { vars: L === "Advanced" ? 3 : 2 });
  const all = tableRows(node, vars), focus = vars.length > 2 ? sample(all, 4, rng) : all;
  const trueCount = focus.filter(r => r.result === want).length;
  const shown = focus.map(r => ({ ...r, result: null }));
  const options = [0, 1, 2, 3, 4].map(n => ({
    text: `${n} ${n === 1 ? "row" : "rows"}`,
    tag: n === trueCount ? "correct" : "miscounted-results",
    claim: { t: "countValue", p: "e", is: T(want), n },
  }));
  const correct = options[trueCount], wrong = options.filter(o => o !== correct);
  return challenge({ ...base(L, activity), rng, question: `How many of these four truth-table rows evaluate to ${want}?`,
    code: `boolean result = ${B.print(node)};`, correct, wrong,
    explanation: `The four input rows produce ${trueCount} ${want ? "true" : "false"} result${trueCount === 1 ? "" : "s"}. Evaluate the expression once for each Result cell.`,
    structure: `${activity}|${shape(node)}`, complexity: complexity(L, activity, node, vars),
    check: { programs: { e: boolProgram(vars, node) }, inputs: { e: focus.map(r => rowInput(vars, r)) } },
    extra: { expression: B.print(node), table: shown, allRows: all } });
}
A["count-true-rows"] = (rng, L) => countRows(rng, L, true);
A["count-false-rows"] = (rng, L) => countRows(rng, L, false);
// Build an intentionally constant expression f OP g with g a rewritten form of !f;
// half the time the rewrite contains a modeled mistake so the result is NOT constant.
function constantCandidate(rng, L, nm, wantTrue) {
  return retry(() => {
    const cfg = LEVELS[L];
    const nv = L === "Beginner" ? 2 : L === "Intermediate" ? int(2, 3, rng) : 3;
    const vars = nm.slice(0, nv);
    const f = B.randomTree(rng, { vars, leafCount: int(nv, nv + (L === "Beginner" ? 0 : 1), rng), negLeaf: 0.3, negGroup: L === "Beginner" ? 0 : 0.2 });
    if (!B.quality(f, { slack: cfg.slack }).valid) reject("f");
    let g = B.pushNot(B.NOT(f)) || B.NOT(f);
    if (chance(0.4, rng)) { const g2 = B.applyAt(g, B.SOUND.pullNot, rng) || B.applyAt(g, B.SOUND.distribute, rng); if (g2) g = g2; }
    const constant = chance(0.5, rng);
    if (!constant) { const mk = pick(["swap-and-or", "demorgan-keep-operator", "negate-first-only"], rng); const g2 = B.applyAt(g, B.MISTAKES[mk], rng) || B.applyAt(g, B.MISTAKES["swap-and-or"], rng); if (!g2) reject("no mistake"); g = g2; }
    const e = wantTrue ? B.OR(f, g) : B.AND(f, g);
    const tv = B.truth(e, vars);
    const isConst = wantTrue ? !tv.includes("0") : !tv.includes("1");
    if (isConst !== constant) reject("mistake did not change constancy");
    if (B.leaves(e) < (L === "Beginner" ? 3 : L === "Intermediate" ? 4 : 5)) reject("too trivial");
    if (B.essential(e, vars).length === 0 && !constant) reject("odd");
    if (B.varsOf(e).length !== nv) reject("vars");
    // the displayed expression should not be a bare "x || !x"
    if (B.isCompound(e) && e.xs.some(x => e.xs.some(y => B.key(y) === `!${B.key(x)}`))) reject("bare complement");
    return { node: e, vars, constant };
  }, 2000);
}
function constantActivity(act, wantTrue) {
  return (rng, L) => {
    const nm = names(rng); const { node, vars, constant } = constantCandidate(rng, L, nm, wantTrue);
    const all = B.rows(vars); const val = wantTrue; // the constant value being asked about
    const counter = all.filter(e => B.evaluate(node, e) !== val), agree = all.filter(e => B.evaluate(node, e) === val);
    const word = wantTrue ? "true" : "false", other = wantTrue ? "false" : "true";
    const yes = { text: `Yes, it is ${word} for every input`, tag: constant ? "correct" : "missed-counterexample", claim: { t: "constant", p: "e", is: T(val) } };
    const rowOpt = (e, tag) => ({ text: `No, it is ${other} when ${fmtRow(vars, e)}`, tag, claim: { t: "out", p: "e", in: rowInput(vars, e), is: T(!val) } });
    let correct, wrong;
    if (constant) { correct = yes; wrong = sample(all, 3, rng).map(e => rowOpt(e, "assumed-not-constant")); }
    else { if (agree.length < 2) reject("need two agreeing rows"); correct = rowOpt(pick(counter, rng), "correct"); wrong = [yes, ...sample(agree, 2, rng).map(e => rowOpt(e, "misevaluated-row"))]; }
    const expl = constant ? `The second part is a rewritten form of the negation of the first part, so ${wantTrue ? "one side is always true" : "the two sides can never both be true"}. Every row of the truth table is ${word}.`
      : `The second part is not an exact negation of the first part, so the result is not constant. For ${fmtRow(vars, counter[0])} the expression is ${other}.`;
    return challenge({ ...base(L, act), rng, question: `Read the truth table. Is this expression ${word} for every possible combination of inputs?`, code: `boolean result = ${B.print(node)};`, correct, wrong,
      explanation: expl, structure: `${act}-${constant}|${shape(node)}`, complexity: complexity(L, act, node, vars),
      check: { programs: { e: boolProgram(vars, node) }, inputs: { e: all.map(e => rowInput(vars, e)) }, table: { p: "e", rows: all.map(e => ({ in: rowInput(vars, e), shown: B.evaluate(node, e) })) } }, extra: { expression: B.print(node), table: tableRows(node, vars), allRows: tableRows(node, vars) } });
  };
}
A["always-true"] = constantActivity("always-true", true);
A["always-false"] = constantActivity("always-false", false);

function pairCandidate(rng, L, nm, equivalent) {
  return retry(() => {
    const { node: left, vars } = genExpr(rng, L, nm, { needNegGroup: L === "Beginner" || chance(0.6, rng), negTop: L === "Beginner" ? 0.6 : 0.2 });
    const sorted = [...vars].sort();
    for (let k = 0; k < 25; k++) {
      let right = left;
      const steps = L === "Beginner" ? 1 : int(1, 2, rng);
      for (let s = 0; s < steps; s++) { const fn = pick(Object.values(B.SOUND), rng); right = B.applyAt(right, fn, rng) || right; }
      let tag = "correct";
      if (!equivalent) { const mk = pick(Object.keys(B.MISTAKES), rng); const r2 = B.applyAt(right, B.MISTAKES[mk], rng); if (!r2) continue; right = r2; tag = mk; }
      if (B.key(right) === B.key(left) || B.print(right) === B.print(left)) continue;
      if (B.sameFunction(left, right, sorted) !== equivalent) continue;
      if (B.varsOf(right).join() !== sorted.join()) continue;
      if (!B.quality(right, { slack: LEVELS[L].slack + 2 }).valid) continue;
      return { left, right, vars, tag };
    }
    reject("no valid rewrite of this expression");
  }, 400);
}
A["equivalence-check"] = (rng, L) => {
  const eq = chance(0.5, rng); const nm = names(rng);
  const { left, right, vars, tag } = pairCandidate(rng, L, nm, eq);
  const P = { l: boolProgram(vars, left), r: boolProgram(vars, right) }, inputs = boolInputs(vars);
  const diff = B.rows(vars).find(e => B.evaluate(left, e) !== B.evaluate(right, e));
  return challenge({ ...base(L, "equivalence-check"), rng, count: 2,
    question: `Are left and right equivalent for every combination of ${vars.join(", ")}?`,
    code: `boolean left = ${B.print(left)};\nboolean right = ${B.print(right)};`,
    correct: { text: eq ? "Equivalent" : "Not equivalent", tag: "correct", claim: { t: "equiv", a: "l", b: "r", is: eq } },
    wrong: [{ text: eq ? "Not equivalent" : "Equivalent", tag: eq ? "distrusts-valid-rewrite" : tag, claim: { t: "equiv", a: "l", b: "r", is: !eq } }],
    explanation: eq ? `right is a valid rewrite of left (De Morgan, factoring or distribution), so all ${1 << vars.length} rows match.` : `right contains a rewriting mistake (${tag.replace(/-/g, " ")}). For ${fmtRow(vars, diff)}, left is ${B.evaluate(left, diff)} but right is ${B.evaluate(right, diff)}.`,
    structure: `equiv-${eq}|${shape(left)}|${shape(right)}`, complexity: complexity(L, "equivalence-check", left, vars, 0.4 * B.leaves(right)),
    check: { programs: P, inputs: { l: inputs, r: inputs } }, extra: { expressions: [B.print(left), B.print(right)] } });
};
function counterexampleFrom(rng, L, act, left, right, vars, tagWrong, question, codeLabels = ["left", "right"]) {
  const all = B.rows(vars); const differ = all.filter(e => B.evaluate(left, e) !== B.evaluate(right, e)), agree = all.filter(e => B.evaluate(left, e) === B.evaluate(right, e));
  if (!differ.length || agree.length < 2) reject("need one differing and two agreeing rows");
  const nWrong = Math.min(3, agree.length);
  const ans = pick(differ, rng); const P = { l: boolProgram(vars, left), r: boolProgram(vars, right) }, inputs = boolInputs(vars);
  return challenge({ ...base(L, act), rng, question, count: nWrong + 1,
    code: `boolean ${codeLabels[0]} = ${B.print(left)};\nboolean ${codeLabels[1]} = ${B.print(right)};`,
    correct: { text: fmtRow(vars, ans), tag: "correct", claim: { t: "differ", a: "l", b: "r", in: rowInput(vars, ans) } },
    wrong: sample(agree, nWrong, rng).map(e => ({ text: fmtRow(vars, e), tag: tagWrong, claim: { t: "differ", a: "l", b: "r", in: rowInput(vars, e) } })),
    explanation: `For ${fmtRow(vars, ans)}, ${codeLabels[0]} is ${B.evaluate(left, ans)} but ${codeLabels[1]} is ${B.evaluate(right, ans)}. The other listed rows give the same value for both.`,
    structure: `${act}|${shape(left)}|${shape(right)}`, complexity: complexity(L, act, left, vars, 0.4 * B.leaves(right)),
    check: { programs: P, inputs: { l: inputs, r: inputs } }, extra: { expressions: [B.print(left), B.print(right)] } });
}
A["counterexample-row"] = (rng, L) => {
  const nm = names(rng); const { left, right, vars, tag } = pairCandidate(rng, L, nm, false);
  return counterexampleFrom(rng, L, "counterexample-row", left, right, vars, "rows-agree", `A student rewrote left as right, but the rewrite is wrong (${tag.replace(/-/g, " ")}). Which input row proves they are not equivalent?`);
};

// Simplification: build a simple target s, pad it with a removable redundancy.
function padded(rng, s, vars, extraVar) {
  const pads = [];
  const x = extraVar ? B.V(extraVar) : null;
  if (x && s.k === "and") pads.push(["absorption", B.OR(s, B.AND(...s.xs, x)), B.AND(...s.xs, x)]);
  if (x && s.k === "or") pads.push(["absorption", B.AND(s, B.OR(...s.xs, x)), B.OR(...s.xs, x)]);
  // split one literal L into (L && x) || (L && !x)
  if (x && B.isCompound(s)) { const i = int(0, s.xs.length - 1, rng); const Lt = s.xs[i]; if (!B.isCompound(Lt)) { const split = B.OR(B.AND(Lt, x), B.AND(Lt, B.NOT(x))); pads.push(["complement-split", B.replace(s, [i], split), B.replace(s, [i], B.AND(Lt, x))]); } }
  const f = B.distribute(s); if (f) pads.push(["distributed", f, null]);
  if (s.k === "or" && s.xs.length === 2 && s.xs.every(t => t.k === "and" && t.xs.length === 2)) {
    // consensus: (p && q) || (!p && r) gains redundant (q && r)
    const [t1, t2] = s.xs; const p = t1.xs.find(l => t2.xs.some(m => B.key(m) === `!${B.key(l)}` || B.key(l) === `!${B.key(m)}`));
    if (p) { const q = t1.xs.find(l => l !== p), r = t2.xs.find(l => B.key(l) !== `!${B.key(p)}` && B.key(p) !== `!${B.key(l)}`); if (q && r) pads.push(["consensus", B.OR(t1, t2, B.AND(q, r)), B.OR(t1, B.AND(q, r))]); }
  }
  if (!pads.length) reject("no padding");
  return pick(pads, rng);
}
function simplifyBeginner(rng, L) {
  const nm = names(rng); const [u, w] = shuffle(nm.slice(0, 2), rng);
  const Lt = chance(0.5, rng) ? B.V(u) : B.NOT(B.V(u)); const x = chance(0.7, rng) ? B.V(w) : B.NOT(B.V(w));
  const pads = [["absorption-or", B.OR(Lt, B.AND(Lt, x))], ["absorption-and", B.AND(Lt, B.OR(Lt, x))], ["complement-split", B.OR(B.AND(Lt, x), B.AND(Lt, x.k === "not" ? x.a : B.NOT(x)))], ["double-negation", B.NOT(B.NOT(Lt))]];
  const [kind, e] = pick(pads, rng); const vars = B.varsOf(e).length === 2 ? nm.slice(0, 2).sort() : B.varsOf(e);
  const ev = [...B.varsOf(e)]; if (!B.sameFunction(e, Lt, ev)) reject("unsound");
  const negL = Lt.k === "not" ? Lt.a : B.NOT(Lt);
  const cands = [[x, "kept-the-other-variable"], [B.AND(Lt, x), "kept-the-absorbed-term"], [B.OR(Lt, x), "kept-the-absorbed-term"], [negL, "lost-the-negation"], [x.k === "not" ? x.a : B.NOT(x), "kept-the-other-variable"]]
    .filter(([n]) => ev.every(v => true) && !B.sameFunction(n, e, [...new Set([...ev, ...B.varsOf(n)])].sort()));
  const all = [...new Set([...ev, ...B.varsOf(x)])].sort();
  const P = { e: boolProgram(all, e) }; const opts = [{ text: B.print(Lt), tag: "correct", n: Lt }];
  for (const [n, tag] of shuffle(cands, rng)) if (!opts.some(o => o.text === B.print(n))) opts.push({ text: B.print(n), tag, n });
  if (opts.length < 4) reject("distractors"); const use = opts.slice(0, 4);
  use.forEach((o, i) => { P[`o${i}`] = boolProgram(all, o.n); o.claim = { t: "equiv", a: "e", b: `o${i}`, is: true }; });
  const why = { "absorption-or": `If ${B.print(Lt)} is true the whole OR is true; if it is false, the && term is false too.`, "absorption-and": `${B.print(Lt)} must be true for the && to be true, and then the || part is automatically true.`, "complement-split": `${B.print(x)} is either true or false, so one of the two && terms matches whenever ${B.print(Lt)} is true.`, "double-negation": "Two ! operators cancel out." }[kind];
  return challenge({ ...base(L, "simplify"), rng, question: "Which simpler expression is equivalent to result for every input?", code: `boolean result = ${B.print(e)};`,
    correct: use[0], wrong: use.slice(1), explanation: `${why} So result is equivalent to ${B.print(Lt)}.`, structure: `simplify-${kind}|${shape(e)}`,
    complexity: complexity(L, "simplify", Lt, B.varsOf(Lt), 0.5 * B.leaves(e)),
    check: { programs: P, inputs: Object.fromEntries(Object.keys(P).map(k => [k, boolInputs(all)])) }, extra: { expression: B.print(e) } });
}
A.simplify = (rng, L) => {
  if (L === "Beginner") return simplifyBeginner(rng, L);
  const nm = names(rng);
  return retry(() => {
    const nv = L === "Advanced" ? 3 : int(2, 3, rng); const vars = nm.slice(0, nv);
    const coreVars = L === "Advanced" && chance(0.5, rng) ? vars : vars.slice(0, nv - 1);
    const s = B.randomTree(rng, { vars: coreVars.length >= 2 ? coreVars : vars, leafCount: int(2, L === "Advanced" ? 4 : 3, rng), negLeaf: 0.3, negGroup: 0 });
    if (!B.quality(s, { slack: 0 }).valid) reject("s");
    const extra = vars.find(v => !B.varsOf(s).includes(v)) || null;
    const [kind, e, keptTerm] = padded(rng, s, vars, extra);
    const ev = B.varsOf(e); if (!B.sameFunction(e, s, ev)) reject("padding not sound");
    if (B.leaves(e) < B.leaves(s) + 2) reject("not enough padding");
    const wrongs = [];
    const add = (n, tag) => { if (n && B.varsOf(n).every(v => ev.includes(v)) && !B.sameFunction(n, e, ev) && B.leaves(n) < B.leaves(e)) wrongs.push({ text: B.print(n), tag, n }); };
    if (keptTerm) add(keptTerm, "kept-the-redundant-term");
    for (const [mk, fn] of Object.entries(B.MISTAKES)) add(B.applyAt(s, fn, rng), mk);
    if (B.isCompound(s)) for (let i = 0; i < s.xs.length; i++) add(B.removeChild(s, [], i), "dropped-a-needed-operand");
    if (extra) add(B.AND(s, B.V(extra)), "kept-irrelevant-variable"), add(B.OR(s, B.V(extra)), "kept-irrelevant-variable");
    const uniq = []; for (const w of shuffle(wrongs, rng)) if (!uniq.some(u => u.text === w.text) && w.text !== B.print(s)) uniq.push(w);
    if (uniq.length < 3) reject("distractors");
    const P = { e: boolProgram(ev, e) }; const inputs = boolInputs(ev);
    const opts = [{ text: B.print(s), tag: "correct", n: s }, ...uniq.slice(0, 3)];
    opts.forEach((o, i) => { P[`o${i}`] = boolProgram(ev, o.n); o.claim = { t: "equiv", a: "e", b: `o${i}`, is: true }; });
    const inputsMap = Object.fromEntries(Object.keys(P).map(k => [k, inputs]));
    const why = { absorption: "One part absorbs the other: whenever the longer term is true, the shorter term is already true (or already required).", "complement-split": "A literal was split into (L && x) || (L && !x), which is just L because x is either true or false.", distributed: "The expression is the distributed form; factoring out the shared operand gives the shorter equivalent.", consensus: "The extra term is a consensus term: it can only be true when one of the other two terms is already true." }[kind];
    return challenge({ ...base(L, "simplify"), rng, question: "Which simpler expression is equivalent to result for every input?", code: `boolean result = ${B.print(e)};`,
      correct: opts[0], wrong: opts.slice(1), explanation: `${why} The equivalent simpler form is ${B.print(s)}.`,
      structure: `simplify-${kind}|${shape(e)}`, complexity: complexity(L, "simplify", e, ev),
      check: { programs: P, inputs: inputsMap }, extra: { expression: B.print(e) } });
  }, 3000);
};
A["negate-effect"] = (rng, L) => {
  const nm = names(rng); const { node, vars } = genExpr(rng, L, nm, { accept: n => B.paths(n).some(p => p.length && B.isCompound(B.at(n, p))) });
  const p = pick(B.paths(node).filter(p => p.length && B.isCompound(B.at(node, p))), rng);
  const sub = B.at(node, p); const alt = B.replace(node, p, B.NOT(sub));
  const all = B.rows(vars); const changed = all.filter(e => B.evaluate(node, e) !== B.evaluate(alt, e)).length;
  const subTrue = all.filter(e => B.evaluate(sub, e)).length, N = all.length;
  const cand = [[N, "assumes-every-row-changes"], [subTrue, "counts-rows-where-subexpression-is-true"], [N - changed, "counts-unchanged-rows"], [changed + 1, "off-by-one"], [changed - 1, "off-by-one"], [0, "assumes-no-row-changes"], [changed + 2, "miscounted"]]
    .filter(([v]) => v >= 0 && v <= N && v !== changed);
  const P = { e: boolProgram(vars, node), alt: boolProgram(vars, alt) }; const inputs = boolInputs(vars);
  const claim = n => ({ t: "countDiffer", a: "e", b: "alt", n });
  return challenge({ ...base(L, "negate-effect"), rng,
    question: `Suppose ${B.print(sub)} is replaced by !(${B.print(sub)}). For how many of the ${N} input rows does result change?`,
    code: `boolean result = ${B.print(node)};`, correct: { text: String(changed), tag: "correct", claim: claim(changed) },
    wrong: cand.map(([v, tag]) => ({ text: String(v), tag, claim: claim(v) })),
    explanation: `The result changes only on rows where the rest of the expression lets ${B.print(sub)} decide the outcome. Comparing result with ${B.print(alt)} row by row shows ${changed} changed row${changed === 1 ? "" : "s"}.`,
    structure: `negate|${shape(node)}|${p.length}`, complexity: complexity(L, "negate-effect", node, vars),
    check: { programs: P, inputs: { e: inputs, alt: inputs } }, extra: { table: tableRows(node, vars), allRows: tableRows(node, vars), expression: B.print(node) } });
};
// Precedence: parse the same token sequence with three different (wrong) precedence rules.
function regroup(src, rule) {
  const t = src.match(/&&|\|\||!|\(|\)|[A-Za-z_]\w*/g); let p = 0;
  const un = () => { if (t[p] === "!") { p++; return B.NOT(un()); } if (t[p] === "(") { p++; const e = ex(); p++; return e; } return B.V(t[p++]); };
  const ex = () => {
    if (rule === "left-to-right") { let l = un(); while (t[p] === "&&" || t[p] === "||") { const op = t[p++]; const r = un(); l = op === "&&" ? B.AND(l, r) : B.OR(l, r); } return l; }
    // "or-first": || binds tighter than &&
    const orx = () => { const xs = [un()]; while (t[p] === "||") { p++; xs.push(un()); } return xs.length > 1 ? B.OR(...xs) : xs[0]; };
    const xs = [orx()]; while (t[p] === "&&") { p++; xs.push(orx()); } return xs.length > 1 ? B.AND(...xs) : xs[0];
  };
  return ex();
}
const explicit = n => n.k === "var" ? n.n : n.k === "not" ? (B.isCompound(n.a) ? `!(${explicit(n.a)})` : `!${explicit(n.a)}`) : n.xs.map(x => B.isCompound(x) ? `(${explicit(x)})` : explicit(x)).join(n.k === "and" ? " && " : " || ");
A.grouping = (rng, L) => {
  const nm = names(rng);
  return retry(() => {
    const { node, vars } = genExpr(rng, L, nm, { topOp: "or", accept: n => n.k === "or" && n.xs.some(x => x.k === "and") });
    const bare = B.print(node, { clarify: false });
    const ltr = regroup(bare, "left-to-right"), orf = regroup(bare, "or-first");
    const cands = [[explicit(ltr), "left-to-right-evaluation", ltr], [explicit(orf), "or-before-and", orf]];
    const sw = B.applyAt(node, B.MISTAKES["swap-and-or"], rng); if (sw) cands.push([explicit(sw), "operators-swapped", sw]);
    const wrongs = cands.filter(([s, , n]) => !B.sameFunction(n, node, vars) && s !== explicit(node) && !B.degenerate(n));
    if (new Set(wrongs.map(w => w[0])).size < 2) reject("groupings coincide");
    const nt = node.xs.findIndex(x => x.k === "and"); const negScope = B.NOT(node.xs[nt]);
    const ws = [...wrongs]; if (ws.length < 3) { const n4 = B.replace(node, [nt], B.AND(...node.xs[nt].xs.slice(0, 1), B.OR(...node.xs[nt].xs.slice(1)))); if (!B.degenerate(n4) && !B.sameFunction(n4, node, vars)) ws.push([explicit(n4), "regrouped-inner-operands", n4]); }
    const P = { j: { params: vars.map(v => ["boolean", v]), body: `System.out.print(${bare});` } }; const inputs = boolInputs(vars);
    const opts = [[explicit(node), "correct", node], ...ws.slice(0, 3)];
    opts.forEach(([, , n], i) => { P[`o${i}`] = boolProgram(vars, n); });
    const mk = (i) => ({ text: opts[i][0], tag: opts[i][1], claim: { t: "equiv", a: "j", b: `o${i}`, is: true } });
    void negScope;
    return challenge({ ...base(L, "grouping"), rng, question: "Java gives && higher precedence than ||. Which fully parenthesized expression shows how Java evaluates result?",
      code: `boolean result = ${bare};`, correct: mk(0), wrong: opts.slice(1).map((_, i) => mk(i + 1)),
      explanation: `&& groups before ||, and Java does not simply read left to right. So ${bare} means ${explicit(node)}.`,
      structure: `grouping|${shape(node)}`, complexity: complexity(L, "grouping", node, vars),
      check: { programs: P, inputs: Object.fromEntries(Object.keys(P).map(k => [k, inputs])) }, extra: { expression: bare } });
  }, 3000);
};
A["grouping-counterexample"] = (rng, L) => {
  const nm = names(rng);
  return retry(() => {
    const { node, vars } = genExpr(rng, L, nm, { topOp: "or", accept: n => n.k === "or" && n.xs.some(x => x.k === "and") });
    const bare = B.print(node, { clarify: false }); const other = chance(0.5, rng) ? regroup(bare, "left-to-right") : regroup(bare, "or-first");
    if (B.sameFunction(other, node, vars)) reject("same");
    if (B.degenerate(other) || B.essential(other, [...vars].sort()).length !== vars.length) reject("regrouping produced a degenerate expression");
    const c = counterexampleFrom(rng, L, "grouping-counterexample", node, other, vars, "rows-agree", "javaWay uses Java's precedence; otherWay groups the same operands differently. Which input row gives them different values?", ["javaWay", "otherWay"]);
    c.code = `boolean javaWay = ${explicit(node)};\nboolean otherWay = ${explicit(other)};`;
    c.expressions = [explicit(node), explicit(other)];
    return c;
  }, 3000);
};

// Compound condition inside an if statement, with named variables and a comparison.
const CONTEXTS = [
  { int: ["age", 8, 20], bools: ["member", "weekend", "holiday"], yes: "Discount", no: "Full price" },
  { int: ["temperature", 40, 100], bools: ["raining", "weekend", "windy"], yes: "Go outside", no: "Stay in" },
  { int: ["score", 40, 100], bools: ["submitted", "late", "excused"], yes: "Credit", no: "No credit" },
  { int: ["battery", 0, 100], bools: ["charging", "lowPower", "onWifi"], yes: "Update", no: "Wait" },
  { int: ["speed", 15, 80], bools: ["schoolZone", "raining", "night"], yes: "Warning", no: "OK" },
  { int: ["level", 1, 12], bools: ["hasKey", "bossDefeated", "hardMode"], yes: "Door opens", no: "Locked" },
  { int: ["items", 0, 15], bools: ["isMember", "coupon", "giftCard"], yes: "Free shipping", no: "Shipping fee" },
  { int: ["hour", 0, 23], bools: ["weekend", "alarmOn", "vacation"], yes: "Ring", no: "Silent" },
];
function conditionalCandidate(rng, L) {
  return retry(() => {
    const ctx = pick(CONTEXTS, rng); const [iv, lo, hi] = ctx.int;
    const nb = L === "Beginner" ? 1 : L === "Intermediate" ? 2 : 3;
    const bools = sample(ctx.bools, nb, rng); const atomNames = ["k_cmp", ...bools];
    const cfg = LEVELS[L];
    const shapeTree = B.randomTree(rng, { vars: atomNames, leafCount: L === "Beginner" ? 2 : L === "Intermediate" ? int(3, 4, rng) : int(4, 5, rng), negLeaf: 0.25, negGroup: L === "Beginner" ? 0 : 0.3 });
    const q = B.quality(shapeTree, { slack: cfg.slack }); if (!q.valid) reject(q.reasons[0]);
    if (L !== "Beginner" && !q.metrics.mixed) reject("mixed");
    if (JSON.stringify(shapeTree).split('"k_cmp"').length !== 2) reject("comparison must appear once");
    const op = pick([">=", ">", "<", "<="], rng), c = int(lo + 2, hi - 2, rng);
    const subst = n => n.k === "var" ? (n.n === "k_cmp" ? B.CMP(iv, op, c) : n) : n.k === "not" ? B.NOT(subst(n.a)) : n.k === "and" || n.k === "or" ? { k: n.k, xs: n.xs.map(subst) } : n;
    return { ctx, node: subst(shapeTree), abstract: shapeTree, atoms: atomNames, iv, lo, hi, op, c, bools };
  }, 2000);
}
const condCode = (node, ctx, envDecl) => `${envDecl}if (${B.print(node)}) {\n    System.out.println("${ctx.yes}");\n} else {\n    System.out.println("${ctx.no}");\n}`;
const condProgram = (node, ctx, iv, bools) => ({ params: [["int", iv], ...bools.map(b => ["boolean", b])], body: condCode(node, ctx, "") });
function relationalEval(rng, L) {
  const { node, abstract, atoms, iv, lo, hi, bools } = conditionalCandidate(rng, L);
  const want = chance(0.5, rng); const envs = [];
  for (let k = lo; k <= hi; k++) for (const r of B.rows(bools)) { const e = { ...r, [iv]: k }; if (B.evaluate(node, e) === want) envs.push(e); }
  if (!envs.length) reject("no env"); const env = pick(envs, rng); const inp = [env[iv], ...bools.map(b => env[b])];
  const P = { e: { params: [["int", iv], ...bools.map(b => ["boolean", b])], body: `System.out.print(${B.print(node)});` } };
  const parts = B.isCompound(node) ? node.xs : [node];
  return challenge({ ...base(L, "eval-row"), rng, count: 2, question: "What value is stored in result?",
    code: `int ${iv} = ${env[iv]};\n${bools.map(b => `boolean ${b} = ${env[b]};`).join("\n")}\nboolean result = ${B.print(node)};`,
    correct: { text: T(want), tag: "correct", claim: { t: "out", p: "e", in: inp, is: T(want) } },
    wrong: [{ text: T(!want), tag: "misevaluated-comparison-or-operator", claim: { t: "out", p: "e", in: inp, is: T(!want) } }],
    explanation: `${parts.map(p => `${B.print(p)} is ${B.evaluate(p, env)}`).join("; ")}, so result is ${want}.`,
    structure: `eval-relational|${shape(node)}`, complexity: complexity(L, "eval-row", abstract, atoms, 0.5),
    check: { programs: P, inputs: { e: [inp] } }, extra: { expression: B.print(node) } });
}
A["conditional-predict"] = (rng, L) => {
  const { ctx, node, abstract, atoms, iv, lo, hi, bools } = conditionalCandidate(rng, L);
  const want = chance(0.5, rng);
  const envs = []; for (let k = lo; k <= hi; k++) for (const r of B.rows(bools)) { const e = { ...r, [iv]: k }; if (B.evaluate(node, e) === want) envs.push(e); }
  if (!envs.length) reject("no env"); const env = pick(envs, rng);
  const decl = `int ${iv} = ${env[iv]};\n${bools.map(b => `boolean ${b} = ${env[b]};`).join("\n")}\n`;
  const out = want ? ctx.yes : ctx.no, other = want ? ctx.no : ctx.yes;
  const inp = [env[iv], ...bools.map(b => env[b])];
  const parts = B.isCompound(node) ? node.xs : [node];
  return challenge({ ...base(L, "conditional-predict"), rng, count: 2, question: "What is printed?", code: condCode(node, ctx, decl),
    correct: { text: out, tag: "correct", claim: { t: "out", p: "c", in: inp, is: out + "\n" } },
    wrong: [{ text: other, tag: "misevaluated-condition", claim: { t: "out", p: "c", in: inp, is: other + "\n" } }],
    explanation: `${parts.map(p => `${B.print(p)} is ${B.evaluate(p, env)}`).join("; ")}. The whole condition is ${want}, so "${out}" is printed.`,
    structure: `cond-predict|${shape(node)}`, complexity: complexity(L, "conditional-predict", abstract, atoms, 1.5),
    check: { programs: { c: condProgram(node, ctx, iv, bools) }, inputs: { c: [inp] } } });
};
A["conditional-find-value"] = (rng, L) => {
  return retry(() => {
    const { ctx, node, abstract, atoms, iv, lo, hi, op, c, bools } = conditionalCandidate(rng, L);
    // fix the Booleans so that the comparison decides the outcome
    const fixes = B.rows(bools).filter(r => { const vals = new Set(); for (const k of [c - 3, c - 1, c, c + 1, c + 3]) vals.add(B.evaluate(node, { ...r, [iv]: k })); return vals.size === 2; });
    if (!fixes.length) reject("comparison never decisive"); const env = pick(fixes, rng);
    const want = chance(0.5, rng); const target = want ? ctx.yes : ctx.no;
    const cands = [c - 4, c - 2, c - 1, c, c + 1, c + 2, c + 4].filter(k => k >= lo && k <= hi);
    const good = cands.filter(k => B.evaluate(node, { ...env, [iv]: k }) === want), bad = cands.filter(k => B.evaluate(node, { ...env, [iv]: k }) !== want);
    if (!good.length || bad.length < 3) reject("values");
    const boundaryFirst = shuffle(bad, rng).sort((a, b) => Math.abs(a - c) - Math.abs(b - c));
    const ans = pick(good.sort((a, b) => Math.abs(a - c) - Math.abs(b - c)).slice(0, 2), rng);
    const decl = `${bools.map(b => `boolean ${b} = ${env[b]};`).join("\n")}\nint ${iv} = ?;\n`;
    const P = { c: condProgram(node, ctx, iv, bools) };
    const inp = k => [k, ...bools.map(b => env[b])];
    const opt = (k, tag) => ({ text: `${iv} = ${k}`, tag, claim: { t: "out", p: "c", in: inp(k), is: target + "\n" } });
    return challenge({ ...base(L, "conditional-find-value"), rng, question: `The Boolean variables are fixed as shown. Which value of ${iv} makes this code print "${target}"?`,
      code: condCode(node, ctx, decl), correct: opt(ans, "correct"),
      wrong: boundaryFirst.slice(0, 3).map(k => opt(k, Math.abs(k - c) <= 1 ? "boundary-off-by-one" : "wrong-side-of-threshold")),
      explanation: `With these Boolean values the outcome depends on ${iv} ${op} ${c}. ${iv} = ${ans} makes the whole condition ${want}, so "${target}" prints.`,
      structure: `cond-value|${shape(node)}|${op}`, complexity: complexity(L, "conditional-find-value", abstract, atoms, 2),
      check: { programs: P, inputs: { c: cands.map(inp) } } });
  }, 2000);
};

export function generateTruthTable(rng, L = "Intermediate", forced) {
  const act = forced || pick(ACTIVITIES[L], rng);
  return retry(() => A[act](rng, L), 200);
}
export const TRUTH_TABLE_ACTIVITIES = Object.keys(WEIGHT);
