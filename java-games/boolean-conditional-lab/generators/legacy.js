/* The seven original modes, rebuilt procedurally. Mode ids, kinds and choice
 * counts are unchanged (evaluate: 2 choices; identify: token select; the rest
 * 4 choices, which Teacher Tools / QTI export requires). */
import { pick, int, chance, shuffle, sample, reject, retry, join } from "./core.js";
import * as B from "./bool.js";
import { challenge } from "./schema.js";
import { generateCoverage } from "./coverage.js";

// ---------- shared: comparison/flag atoms and sound representative inputs ----------
const NUMS = [["score", 0, 100], ["age", 0, 99], ["temperature", -10, 110], ["speed", 0, 120], ["level", 1, 50], ["points", 0, 200], ["items", 0, 30], ["minutes", 0, 90], ["battery", 0, 100], ["hour", 0, 23]];
const FLAGS = ["member", "verified", "paid", "late", "online", "admin", "hasKey", "suspended", "submitted", "weekend", "raining", "complete", "locked", "premium", "excused", "active"];
const constantsOf = (n, out = new Map()) => { if (n.k === "cmp") { if (!out.has(n.v)) out.set(n.v, new Set()); out.get(n.v).add(n.c); } else if (n.k === "not") constantsOf(n.a, out); else if (B.isCompound(n)) n.xs.forEach(x => constantsOf(x, out)); return out; };
/** Comparisons against constants are piecewise constant between critical points,
 * so {c-1, c, c+1} for every constant plus two far points decides equivalence soundly. */
function reps(nodes) {
  const cs = new Map(); nodes.forEach(n => constantsOf(n, cs));
  const bools = [...new Set(nodes.flatMap(n => B.varsOf(n)))].sort();
  const ints = [...cs.keys()].sort();
  const vals = ints.map(v => { const s = [...cs.get(v)]; return [...new Set([...s.flatMap(c => [c - 1, c, c + 1]), Math.min(...s) - 100, Math.max(...s) + 100])].sort((a, b) => a - b); });
  let envs = [{}];
  ints.forEach((v, i) => { envs = envs.flatMap(e => vals[i].map(k => ({ ...e, [v]: k }))); });
  bools.forEach(b => { envs = envs.flatMap(e => [{ ...e, [b]: false }, { ...e, [b]: true }]); });
  return { envs, ints, bools };
}
const same = (a, b) => { const { envs } = reps([a, b]); return envs.every(e => B.evaluate(a, e) === B.evaluate(b, e)); };
const exprProgram = (ints, bools, src) => ({ params: [...ints.map(v => ["int", v]), ...bools.map(v => ["boolean", v])], body: `System.out.print(${src});` });
/** Options are expressions; exactly one is equivalent to the reference. Verified with Java over sound inputs. */
function exprChoice(rng, o) {
  const all = [o.ref, ...o.options.map(x => x.n)];
  const { envs, ints, bools } = reps(all);
  const P = { ref: exprProgram(ints, bools, B.print(o.ref)) }; const inp = envs.map(e => [...ints.map(v => e[v]), ...bools.map(v => e[v])]);
  const inputs = { ref: inp };
  const seen = new Set(); const opts = [];
  for (const x of o.options) { const t = x.text ?? B.print(x.n); if (seen.has(t)) continue; seen.add(t); opts.push({ ...x, text: t }); }
  const good = opts.filter(x => same(x.n, o.ref)); if (good.length !== 1 || good[0].tag !== "correct") reject("not exactly one equivalent option");
  opts.forEach((x, i) => { P[`o${i}`] = exprProgram(ints, bools, B.print(x.n)); inputs[`o${i}`] = inp; x.claim = { t: "sameAll", a: "ref", b: `o${i}` }; });
  const wrong = opts.filter(x => x.tag !== "correct"); if (wrong.length < 3) reject("few distractors");
  return challenge({ ...o.meta, rng, correct: opts.find(x => x.tag === "correct"), wrong: shuffle(wrong, rng), check: { programs: P, inputs } });
}

// ---------- requirement specs (conditions / construct) ----------
const FLIP = { ">=": ">", ">": ">=", "<=": "<", "<": "<=" };
const flipAt = (n, i) => { let k = 0; const f = x => x.k === "cmp" ? (k++ === i ? B.CMP(x.v, FLIP[x.op] || x.op, x.c) : x) : x.k === "not" ? B.NOT(f(x.a)) : B.isCompound(x) ? { k: x.k, xs: x.xs.map(f) } : x; return f(n); };
const cmpCount = n => (JSON.stringify(n).match(/"cmp"/g) || []).length;
const SPECS = {
  threshold: (rng) => { const [v, lo, hi] = pick(NUMS, rng), f = pick(FLAGS, rng), t = int(lo + 5, hi - 5, rng); const kind = pick(["at least", "more than", "at most", "less than"], rng); const op = { "at least": ">=", "more than": ">", "at most": "<=", "less than": "<" }[kind]; const neg = chance(0.35, rng); const conj = chance(0.6, rng) ? "and" : "or";
    const flag = neg ? B.NOT(B.V(f)) : B.V(f); const n = conj === "and" ? B.AND(B.CMP(v, op, t), flag) : B.OR(B.CMP(v, op, t), flag);
    return { n, text: `${v} is ${kind} ${t} ${conj.toUpperCase()} ${f} is ${neg ? "false" : "true"}`, ref: n, decl: [["int", v], ["boolean", f]], cat: "threshold" }; },
  range: (rng) => { const [v, lo0, hi0] = pick(NUMS, rng); const lo = int(lo0 + 2, Math.floor((lo0 + hi0) / 2), rng), hi = int(lo + 3, hi0 - 2, rng); const incl = chance(0.6, rng); const n = incl ? B.AND(B.CMP(v, ">=", lo), B.CMP(v, "<=", hi)) : B.AND(B.CMP(v, ">", lo), B.CMP(v, "<", hi));
    return { n, text: `${v} is between ${lo} and ${hi}, ${incl ? "including" : "excluding"} both ${lo} and ${hi}`, ref: B.NOT(B.OR(B.CMP(v, incl ? "<" : "<=", lo), B.CMP(v, incl ? ">" : ">=", hi))), decl: [["int", v]], cat: "range", lo, hi, v, incl }; },
  outside: (rng) => { const [v, lo0, hi0] = pick(NUMS, rng); const lo = int(lo0 + 2, Math.floor((lo0 + hi0) / 2), rng), hi = int(lo + 3, hi0 - 2, rng); const n = B.OR(B.CMP(v, "<", lo), B.CMP(v, ">", hi));
    return { n, text: `${v} is outside the inclusive range ${lo} through ${hi}`, ref: B.NOT(B.AND(B.CMP(v, ">=", lo), B.CMP(v, "<=", hi))), decl: [["int", v]], cat: "outside", lo, hi, v }; },
  rangeFlag: (rng) => { const s = SPECS.range(rng); const f = pick(FLAGS, rng); const neg = chance(0.4, rng); const fl = neg ? B.NOT(B.V(f)) : B.V(f);
    return { ...s, n: B.AND(s.n, fl), ref: B.AND(s.ref, fl), text: `${s.text}, AND ${f} is ${neg ? "false" : "true"}`, decl: [...s.decl, ["boolean", f]], cat: "rangeFlag" }; },
  eitherBut: (rng) => { const [a, b, c] = sample(FLAGS, 3, rng); const n = B.AND(B.OR(B.V(a), B.V(b)), B.NOT(B.V(c)));
    return { n, text: `either ${a} OR ${b} is true, but never when ${c} is true`, ref: B.NOT(B.OR(B.AND(B.NOT(B.V(a)), B.NOT(B.V(b))), B.V(c))), decl: [["boolean", a], ["boolean", b], ["boolean", c]], cat: "eitherBut" }; },
  groupAnd: (rng) => { const [a, b, c] = sample(FLAGS, 3, rng); const n = B.AND(B.OR(B.V(a), B.V(b)), B.V(c));
    return { n, text: `(${a} OR ${b}) AND ${c}: at least one of the first two, plus ${c}`, ref: B.OR(B.AND(B.V(a), B.V(c)), B.AND(B.V(b), B.V(c))), decl: [["boolean", a], ["boolean", b], ["boolean", c]], cat: "groupAnd" }; },
  denial: (rng) => { const [a, b] = sample(FLAGS, 2, rng); const [v, lo, hi] = pick(NUMS, rng); const t = int(lo + 5, hi - 5, rng); const three = chance(0.5, rng);
    const n = three ? B.OR(B.NOT(B.V(a)), B.V(b), B.CMP(v, "<", t)) : B.OR(B.NOT(B.V(a)), B.V(b));
    return { n, text: `access is denied when ${a} is false OR ${b} is true${three ? ` OR ${v} is below ${t}` : ""}`, ref: B.NOT(B.AND(B.V(a), B.NOT(B.V(b)), ...(three ? [B.CMP(v, ">=", t)] : []))), decl: three ? [["int", v], ["boolean", a], ["boolean", b]] : [["boolean", a], ["boolean", b]], cat: "denial" }; },
};
function specDistractors(rng, s) {
  const out = [];
  const add = (n, tag) => { if (n) out.push({ n, tag }); };
  for (let i = 0; i < cmpCount(s.n); i++) add(flipAt(s.n, i), "boundary-inclusive-exclusive-confusion");
  add(B.applyAt(s.n, B.MISTAKES["swap-and-or"], rng), "confuses-and-with-or");
  if (s.cat === "range" || s.cat === "rangeFlag") add(B.replace(s.n, s.n.k === "and" && s.n.xs[0].k === "cmp" ? [0] : [], B.OR(B.CMP(s.v, "<", s.lo), B.CMP(s.v, ">", s.hi))) , "describes-outside-instead-of-inside");
  if (s.cat === "outside") { add(B.AND(B.CMP(s.v, "<", s.lo), B.CMP(s.v, ">", s.hi)), "impossible-and-of-opposite-bounds"); add(B.OR(B.CMP(s.v, "<=", s.lo), B.CMP(s.v, ">=", s.hi)), "excludes-the-endpoints-from-inside"); add(B.AND(B.CMP(s.v, ">=", s.lo), B.CMP(s.v, "<=", s.hi)), "describes-inside-instead-of-outside"); }
  // negation misplacement
  for (const p of B.paths(s.n)) { const x = B.at(s.n, p); if (x.k === "not") add(B.replace(s.n, p, x.a), "drops-a-negation"); else if (x.k === "var") add(B.replace(s.n, p, B.NOT(x)), "negates-the-wrong-variable"); }
  if (s.n.k === "and" && s.n.xs[0].k === "or") { add(B.NOT(s.n), "negates-whole-condition"); out.push({ text: `${B.print(s.n.xs[0], { clarify: false })} && ${s.n.xs.slice(1).map(x => B.print(x)).join(" && ")}`, n: B.OR(...s.n.xs[0].xs.slice(0, -1), B.AND(s.n.xs[0].xs[s.n.xs[0].xs.length - 1], ...s.n.xs.slice(1))), tag: "missing-parentheses" }); }
  return shuffle(out, rng);
}
function specMode(mode, cats, prompt) {
  return (rng, L) => retry(() => {
    const cat = pick(cats[L] || cats.Intermediate, rng); const s = SPECS[cat](rng);
    const ds = specDistractors(rng, s).filter(d => !same(d.n, s.ref));
    // prefer distinct misconception types
    const byTag = []; for (const d of ds) if (!byTag.some(x => x.tag === d.tag)) byTag.push(d); for (const d of ds) if (byTag.length < 6 && !byTag.includes(d)) byTag.push(d);
    return exprChoice(rng, { ref: s.ref, options: [{ n: s.n, tag: "correct" }, ...byTag], meta: { mode, family: `${mode}-${cat}`, skill: `Translate a requirement into a condition (${cat})`, question: prompt(s),
      code: mode === "conditions" ? s.decl.map(([t, v]) => `${t} ${v};`).join("\n") : "Choose the complete Java Boolean condition.",
      explanation: { threshold: "Match the boundary words exactly (at least/at most include the number; more than/less than do not) and the connector (AND means &&, OR means ||).", range: "A range check needs both bounds joined by &&; including an endpoint means <= or >=.", outside: "Outside means below the lower bound OR above the upper bound; the endpoints themselves are inside.", rangeFlag: "Both bounds and the flag requirement must all hold, so every part is joined with &&.", eitherBut: "The OR group needs parentheses so the !cancelled requirement applies to both options.", groupAnd: "Without parentheses && binds before ||, which would change which values must be true.", denial: "Each listed reason on its own causes denial, so the reasons are joined with ||." }[cat],
      structure: `${mode}|${cat}|${B.print(s.n).replace(/\b[A-Za-z]\w*\b/g, "v").replace(/\d+/g, "N")}`, complexity: { score: +(1 + 0.8 * B.leaves(s.n) + (B.ops(s.n).and && B.ops(s.n).or ? 1.5 : 0) + (L === "Advanced" ? 1 : 0)).toFixed(2), factors: { literals: B.leaves(s.n), category: cat } } } });
  }, 300);
}
const CATS_COND = { Beginner: ["threshold", "range"], Intermediate: ["threshold", "range", "outside", "rangeFlag"], Advanced: ["outside", "rangeFlag", "range", "denial"] };
const CATS_CONSTRUCT = { Beginner: ["threshold", "denial"], Intermediate: ["eitherBut", "groupAnd", "denial", "rangeFlag", "outside"], Advanced: ["eitherBut", "groupAnd", "denial", "rangeFlag"] };
export const conditionsFamily = specMode("conditions", CATS_COND, s => `Which condition implements the requirement? True exactly when ${s.text}.`);
export const constructFamily = specMode("construct", CATS_CONSTRUCT, s => `Which condition satisfies this requirement? ${s.text[0].toUpperCase()}${s.text.slice(1)}.`);

// ---------- equivalent expressions ----------
export function equivalentFamily(rng, L) {
  return retry(() => {
    const nAtoms = L === "Beginner" ? 2 : L === "Intermediate" ? int(2, 3, rng) : 3;
    const atoms = []; const used = new Set();
    for (let i = 0; i < nAtoms; i++) { if (chance(0.5, rng)) { const [v, lo, hi] = pick(NUMS.filter(n => !used.has(n[0])), rng); used.add(v); atoms.push(B.CMP(v, pick(["<", "<=", ">", ">=", "==", "!="], rng), int(lo + 3, hi - 3, rng))); } else { const f = pick(FLAGS.filter(x => !used.has(x)), rng); used.add(f); atoms.push(B.V(f)); } }
    const t = B.randomTree(rng, { vars: atoms.map((_, i) => `p${i}`), leafCount: nAtoms, negLeaf: 0.25, negGroup: L === "Advanced" ? 0.5 : 0 });
    const sub = n => n.k === "var" ? atoms[Number(n.n.slice(1))] : n.k === "not" ? B.NOT(sub(n.a)) : { k: n.k, xs: n.xs.map(sub) };
    const original = B.NOT(sub(t)); // the item always starts from a negated expression
    let correct = B.pushNot(original); if (!correct) reject("atomic");
    // finish pushing negations inward on comparisons
    const tidy = n => n.k === "not" && n.a.k === "cmp" ? B.negCmp(n.a) : n.k === "not" && n.a.k === "not" ? tidy(n.a.a) : n.k === "not" && B.isCompound(n.a) ? tidy(B.pushNot(n)) : B.isCompound(n) ? { k: n.k, xs: n.xs.map(tidy) } : n.k === "not" ? B.NOT(tidy(n.a)) : n;
    correct = tidy(correct);
    const ds = [];
    for (const [tag, fn] of Object.entries(B.MISTAKES)) { const m = fn(original); if (m) ds.push({ n: tidy(m), tag }); }
    // comparison-negation boundary error: !(x >= 5) is not x <= 5
    const badNeg = n => n.k === "cmp" ? B.CMP(n.v, { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "==": "!=", "!=": "==" }[n.op], n.c) : n.k === "not" ? B.NOT(badNeg(n.a)) : B.isCompound(n) ? { k: n.k, xs: n.xs.map(badNeg) } : n;
    if (cmpCount(original)) ds.push({ n: badNeg(B.pushNot(original) ? B.pushNot(original) : original), tag: "negates-comparison-without-flipping-boundary" });
    ds.push({ n: B.applyAt(correct, B.MISTAKES["swap-and-or"], rng), tag: "forgets-to-switch-operator" });
    return exprChoice(rng, { ref: original, options: [{ n: correct, tag: "correct" }, ...shuffle(ds.filter(d => d.n), rng)], meta: { mode: "equivalent", family: `equivalent-${nAtoms}`, skill: "Apply De Morgan's laws and negate comparisons",
      question: "Which expression is logically equivalent?", code: `boolean expression = ${B.print(original)};`,
      explanation: `De Morgan: negating && gives || (and vice versa) with every operand negated. Negating a comparison flips it to its complement, e.g. !(x >= 5) is x < 5. So ${B.print(original)} becomes ${B.print(correct)}.`,
      structure: `equiv|${B.print(t).replace(/p\d/g, "p")}|${atoms.map(a => a.k).join("")}`, complexity: { score: +(1 + nAtoms + (L === "Advanced" ? 2 : 0)).toFixed(2), factors: { atoms: nAtoms } } } });
  }, 300);
}

// ---------- evaluate expressions (2 choices, as before) ----------
export function evaluateFamily(rng, L) {
  return retry(() => {
    const nb = L === "Beginner" ? 1 : L === "Intermediate" ? 2 : 3; const [v, lo, hi] = pick(NUMS, rng); const flags = sample(FLAGS, nb, rng);
    const atoms = [B.CMP(v, pick([">=", ">", "<", "<=", "==", "!="], rng), int(lo + 2, hi - 2, rng)), ...flags.map(f => B.V(f))];
    if (L === "Advanced" && chance(0.5, rng)) { const t = atoms[0].c + int(3, 15, rng); atoms.push(B.CMP(v, pick(["<", "<="], rng), t)); }
    const t = B.randomTree(rng, { vars: atoms.map((_, i) => `p${i}`), leafCount: atoms.length, negLeaf: 0.25, negGroup: L === "Advanced" ? 0.35 : 0, negTop: L === "Beginner" ? 0.2 : 0.1 });
    const sub = n => n.k === "var" ? atoms[Number(n.n.slice(1))] : n.k === "not" ? B.NOT(sub(n.a)) : { k: n.k, xs: n.xs.map(sub) };
    const node = sub(t); const want = chance(0.5, rng);
    const envs = []; for (let k = lo; k <= hi; k++) for (const r of B.rows(flags)) envs.push({ ...r, [v]: k });
    const hits = envs.filter(e => B.evaluate(node, e) === want); if (!hits.length) reject("none"); const env = pick(hits, rng);
    const name = pick(["result", "eligible", "allowed", "ok", "approved", "alert", "inside", "ready"], rng);
    const code = `int ${v} = ${env[v]};\n${flags.map(f => `boolean ${f} = ${env[f]};`).join("\n")}\nboolean ${name} = ${B.print(node)};`;
    const inp = [env[v], ...flags.map(f => env[f])]; const P = { e: { params: [["int", v], ...flags.map(f => ["boolean", f])], body: `System.out.print(${B.print(node)});` } };
    const parts = B.isCompound(node) ? node.xs : [node];
    return challenge({ mode: "evaluate", family: `evaluate-${node.k}-${atoms.length}`, skill: "Evaluate comparisons and Boolean operators", rng, count: 2, question: `What is stored in ${name}?`, code,
      correct: { text: String(want), tag: "correct", claim: { t: "out", p: "e", in: inp, is: String(want) } }, wrong: [{ text: String(!want), tag: (() => { const tries = [["confuses-and-with-or", B.applyAt(node, B.MISTAKES["swap-and-or"], () => 0)], ["boundary-inclusive-exclusive-confusion", flipAt(node, 0)], ["ignores-a-negation", (() => { const p = B.paths(node).find(p => B.at(node, p).k === "not"); return p ? B.replace(node, p, B.at(node, p).a) : null; })()]]; for (const [t, n] of tries) if (n && B.evaluate(n, env) !== want) return t; return "misapplied-operator-precedence"; })(), claim: { t: "out", p: "e", in: inp, is: String(!want) } }],
      explanation: `${parts.map(p => `${B.print(p)} is ${B.evaluate(p, env)}`).join("; ")}. ${node.k === "and" ? "&& needs every part true" : node.k === "or" ? "|| needs at least one true part" : "! reverses the value"}, so ${name} is ${want}.`,
      structure: `evaluate|${B.print(t).replace(/p\d/g, "p")}`, complexity: { score: +(1 + atoms.length + B.depth(t)).toFixed(2), factors: { atoms: atoms.length } }, check: { programs: P, inputs: { e: [inp] } } });
  }, 300);
}

// ---------- follow the branch: tracing families from the coverage model, 4 choices ----------
export function branchFamily(rng, L) {
  return retry(() => { const q = generateCoverage(rng, L, pick(L === "Beginner" ? ["boundary", "else-if-order", "overlapping"] : ["boundary", "else-if-order", "overlapping", "nested", "compound"], rng)); if (q.choices.length !== 4) reject("needs 4"); return { ...q, mode: "branch", topic: "branch", family: `branch-${q.family}`, variant: `branch-${q.family}`, reasoning: `branch-${q.family}` }; }, 300);
}

// ---------- short-circuit and Strings ----------
const WORDS = ["Alex", "Maya", "Jordan", "Priya", "Sam", "Lee", "Ana", "Kai", "Noah", "Zoe", "Omar", "Ivy", "Luca", "Mina", "Theo", "Rosa"];
export function shortFamily(rng, L) {
  const kind = pick(L === "Beginner" ? ["equals", "reference", "case", "guard", "concat", "length"] : ["equals", "reference", "case", "null-safe", "null-guard", "guard", "counter", "ignore-case", "concat", "length", "compare"], rng);
  if (kind === "guard" || kind === "counter") return retry(() => { const q = generateCoverage(rng, L === "Beginner" ? "Intermediate" : L, "short-circuit"); if (kind === "guard" && !/total/.test(q.code)) reject("kind"); if (kind === "counter" && !/hits/.test(q.code)) reject("kind"); return { ...q, mode: "short", topic: "short", family: `short-${kind}`, variant: `short-${kind}`, reasoning: `short-${kind}` }; }, 300);
  const w = pick(WORDS, rng), other = pick(WORDS.filter(x => x !== w), rng), [yes, no] = pick([["Match", "Different"], ["Same", "Not same"], ["Found", "Missing"], ["Welcome", "Denied"], ["Yes", "No"], ["Open", "Closed"], ["Valid", "Invalid"], ["Hello", "Goodbye"]], rng);
  const name = pick(["name", "user", "input", "label", "code"], rng);
  let code, ans, expl, opts;
  const out = (t) => ({ t: "out", p: "s", in: [], is: t });
  if (kind === "equals") { const sameText = chance(0.6, rng); code = `String ${name} = new String("${w}");\nif (${name}.equals("${sameText ? w : other}")) System.out.println("${yes}");\nelse System.out.println("${no}");`; ans = sameText ? yes : no; expl = ".equals compares the characters, so separately created Strings with the same text are equal."; opts = [[yes, "correct"], [no, "thinks-equals-compares-references"], ["true", "prints-the-boolean"], ["It does not compile", "thinks-equals-is-invalid"]]; }
  else if (kind === "reference") { const useEq = chance(0.4, rng); const sameW = !useEq || chance(0.7, rng); const w2 = sameW ? w : other;
    code = `String a = new String("${w}");\nString b = new String("${w2}");\nif (${useEq ? "a.equals(b)" : "a == b"}) System.out.println("${yes}");\nelse System.out.println("${no}");`;
    ans = useEq ? (sameW ? yes : no) : no; expl = useEq ? ".equals compares text, so two separate objects with the same characters are equal." : "Each new String(...) creates a separate object; == compares references, not text, so it is false even when the text matches.";
    opts = [[yes, useEq ? "thinks-equals-compares-references" : "thinks-==-compares-text"], [no, useEq ? "thinks-equals-compares-references" : "thinks-==-compares-text"], ["true", "prints-the-boolean"], ["It does not compile", "thinks-==-is-invalid"]].map(([t, tag]) => [t, t === ans ? "correct" : tag]); }
  else if (kind === "case" || kind === "ignore-case") { const input = pick([w, w.toLowerCase(), w.toUpperCase()], rng); const ic = kind === "ignore-case"; code = `String ${name} = "${input}";\nif (${name}.${ic ? "equalsIgnoreCase" : "equals"}("${w}")) System.out.println("${yes}");\nelse System.out.println("${no}");`; ans = ic || input === w ? yes : no; expl = ic ? "equalsIgnoreCase ignores letter case." : ".equals is case-sensitive: every character, including capitalization, must match."; opts = [[yes, ans === yes ? "correct" : "ignores-case-sensitivity"], [no, ans === no ? "correct" : "thinks-case-always-matters"], ["true", "prints-the-boolean"], ["It throws an exception", "fears-runtime-error"]]; }
  else if (kind === "concat") { const a = w, b = pick(WORDS.filter(x => x !== w), rng); const sep = pick([" ", "", "-"], rng); const target = chance(0.55, rng) ? `${a}${sep}${b}` : pick([`${a}${b}`, `${a} ${b}`, `${b}${sep}${a}`].filter(t => t !== `${a}${sep}${b}`), rng);
    code = `String first = "${a}";\nString last = "${b}";\nString full = first + "${sep}" + last;\nif (full.equals("${target}")) System.out.println("${yes}");\nelse System.out.println("${no}");`; ans = target === `${a}${sep}${b}` ? yes : no; expl = `full is "${a}${sep}${b}"; .equals compares every character, including spaces and order.`; opts = [[yes, "misreads-the-concatenation"], [no, "misreads-the-concatenation"], ["true", "prints-the-boolean"], ["It does not compile", "thinks-+-cannot-join-Strings"]]; }
  else if (kind === "length") { const str = pick([w, w.toLowerCase(), `${w} ${other}`, ""], rng); const k = int(2, 7, rng); const op = pick([">", ">=", "<", "=="], rng); const len = str.length; const v = op === ">" ? len > k : op === ">=" ? len >= k : op === "<" ? len < k : len === k;
    code = `String ${name} = "${str}";\nif (${name}.length() ${op} ${k}) System.out.println("${yes}");\nelse System.out.println("${no}");`; ans = v ? yes : no; expl = `"${str}" has ${len} characters (spaces count), and ${len} ${op} ${k} is ${v}.`; opts = [[yes, "miscounted-length"], [no, "miscounted-length"], [String(len), "prints-the-length"], ["It throws an exception", "fears-runtime-error"]]; }
  else if (kind === "compare") { const a = w, b = other; const c = a.localeCompare(b) < 0 ? -1 : 1; const javaNeg = [...a].findIndex((ch, i) => ch !== b[i]); void javaNeg; const lt = a < b;
    code = `String a = "${a}";\nString b = "${b}";\nif (a.compareTo(b) < 0) System.out.println("${yes}");\nelse System.out.println("${no}");`; ans = lt ? yes : no; void c; expl = `compareTo is negative when a comes before b alphabetically (by character codes): "${a}" ${lt ? "comes before" : "does not come before"} "${b}".`; opts = [[yes, "reversed-compareTo-order"], [no, "reversed-compareTo-order"], ["true", "prints-the-boolean"], ["It does not compile", "thinks-strings-cannot-be-ordered"]]; }
  else if (kind === "null-safe") { const safe = chance(0.5, rng); code = `String ${name} = null;\nif (${safe ? `"${w}".equals(${name})` : `${name}.equals("${w}")`}) System.out.println("${yes}");\nelse System.out.println("${no}");`; ans = safe ? no : "EXCEPTION:NullPointerException"; expl = safe ? "Calling equals on the non-null literal is safe; a null argument just does not match." : `Calling a method on null (${name}.equals) throws a NullPointerException.`; opts = [[yes, "thinks-null-matches"], [no, safe ? "correct" : "assumes-null-is-safe"], ["It throws a NullPointerException", safe ? "fears-null-argument" : "correct"], ["Nothing is printed", "thinks-null-skips-the-if"]]; }
  else { const n = chance(0.5, rng) ? "null" : `"${pick([w, "", "ok"], rng)}"`; const k = int(1, 4, rng); const useAnd = chance(0.7, rng); code = `String ${name} = ${n};\nif (${name} != null && ${name}.length() > ${k}) System.out.println("${yes}");\nelse System.out.println("${no}");`; const val = n !== "null" && JSON.parse(n).length > k; ans = val ? yes : no; void useAnd; expl = n === "null" ? `${name} != null is false, so && never calls length() and no exception occurs.` : `${name} is not null, so length() is checked: ${JSON.parse(n).length} > ${k} is ${val}.`; opts = [[yes, val ? "correct" : "misevaluated-length"], [no, val ? "misevaluated-length" : "correct"], ["It throws a NullPointerException", "ignores-short-circuit"], ["Nothing is printed", "thinks-false-skips-else"]]; }
  if (["concat", "length", "compare"].includes(kind)) opts = opts.map(([t, tag]) => [t, t === ans ? "correct" : tag]);
  const toText = t => t === "EXCEPTION:NullPointerException" ? "It throws a NullPointerException" : t;
  const claimOf = t => /^\d+$/.test(t) ? out(t + "\n") : t === "It throws a NullPointerException" ? out("EXCEPTION:NullPointerException") : t === "It throws an exception" ? out("EXCEPTION:*") : t === "It does not compile" ? { t: "compileError", p: "s" } : t === "Nothing is printed" ? out("") : t === "true" ? out("true\n") : out(t + "\n");
  const ansText = toText(ans);
  const all = opts.map(([t, tag]) => ({ text: t, tag: t === ansText ? "correct" : (tag === "correct" ? "misreads-the-comparison" : tag), claim: claimOf(t) }));
  return challenge({ mode: "short", family: `short-${kind}`, skill: "String comparison and short-circuit safety", rng, question: "What happens when this code runs?", code,
    correct: all.find(o => o.text === ansText), wrong: all.filter(o => o.text !== ansText), explanation: expl,
    structure: `short|${kind}|${code.replace(/"[^"]*"/g, "S").replace(/\b(name|user|input|label|code)\b/g, "v").replace(/\d+/g, "N")}`, complexity: { score: kind === "reference" || kind === "equals" ? 2 : 3, factors: { kind } },
    check: { programs: { s: { params: [], body: code } }, inputs: { s: [[]] } } });
}

// ---------- identify conditions (token selection) ----------
export function identifyFamily(rng, L) {
  return retry(() => {
    const s = SPECS[pick(["threshold", "range", "rangeFlag", "eitherBut", "denial", "outside"], rng)](rng);
    const n = s.n; const toks = [];
    const emit = (x, parent) => {
      if (x.k === "cmp") toks.push({ text: B.print(x), role: "cmp", op: x.op });
      else if (x.k === "var") toks.push({ text: x.n, role: "var" });
      else if (x.k === "not") { toks.push({ text: "!", role: "not" }); if (x.a.k === "var") emit(x.a); else { toks.push({ text: "(", role: "p" }); emit(x.a); toks.push({ text: ")", role: "p" }); } }
      else { const paren = parent && (x.k === "or" || (x.k === "and" && parent === "or")); if (paren) toks.push({ text: "(", role: "p" }); x.xs.forEach((c, i) => { if (i) toks.push({ text: x.k === "and" ? "&&" : "||", role: x.k }); emit(c, x.k); }); if (paren) toks.push({ text: ")", role: "p" }); }
    };
    emit(n, null);
    const stmt = pick([["eligible", "=", "true", ";"], ["admit", "(", ")", ";"], ["count", "++", ";"], ["System.out.println(\"OK\")", ";"]], rng);
    const all = [{ text: "if", role: "kw" }, { text: "(", role: "p" }, ...toks, { text: ")", role: "p" }, { text: "{", role: "p" }, ...stmt.map(t => ({ text: t, role: "stmt" })), { text: "}", role: "p" }];
    const tasks = [];
    const one = (pred) => all.filter(pred).length === 1 ? all.findIndex(pred) : -1;
    const iAnd = one(t => t.role === "and"), iOr = one(t => t.role === "or"), iNot = one(t => t.role === "not");
    const iIncl = one(t => t.role === "cmp" && /[<>]=/.test(t.op)), iExcl = one(t => t.role === "cmp" && /^[<>]$/.test(t.op));
    if (iAnd >= 0) tasks.push([iAnd, "Select the operator that requires both of its operands to be true.", "&& is true only when both sides are true.", "and"]);
    if (iOr >= 0) tasks.push([iOr, "Select the operator that is true when at least one operand is true.", "|| needs only one true operand.", "or"]);
    if (iNot >= 0) tasks.push([iNot, "Select the operator that reverses a Boolean value.", "! changes true to false and false to true.", "not"]);
    if (iIncl >= 0 && iExcl >= 0) tasks.push([iIncl, "Select the comparison that includes its boundary value.", "<= and >= include the number itself.", "inclusive"], [iExcl, "Select the comparison that excludes its boundary value.", "< and > do not include the number itself.", "exclusive"]);
    const firstOperand = all.findIndex(t => t.role === "cmp" || t.role === "var"); const ops = all.filter(t => t.role === "cmp" || t.role === "var").map(t => t.text);
    if (new Set(ops).size === ops.length) tasks.push([firstOperand, "Java evaluates && and || from left to right. Select the operand that is evaluated first.", "The leftmost operand is always evaluated first; short-circuiting can skip later ones.", "first-evaluated"]);
    if (!tasks.length) reject("no unique token");
    const [ai, question, explanation, sub] = pick(tasks, rng);
    const tokens = all.map((t, i) => ({ id: i, text: t.text, correct: i === ai }));
    const code = `if (${B.print(n)}) { ${stmt.join(stmt[0].startsWith("System") || stmt[1] === "(" ? "" : " ").replace(" ;", ";")} }`;
    return { schemaVersion: 2, mode: "identify", topic: "identify", variant: `identify-${sub}`, family: `identify-${sub}`, reasoning: `identify-${sub}`, skill: "Identify parts of a condition", kind: "select", question, code, tokens, answer: ai, answerText: all[ai].text, explanation,
      structure: `identify|${sub}|${tokens.map(t => /^[a-z]\w*$|\d/.test(t.text) && !["if"].includes(t.text) ? "v" : t.text).join(" ")}`, complexity: { score: 1 + toks.length / 3, factors: { tokens: toks.length } }, choiceTags: all.map((t, i) => i === ai ? "correct" : t.role === "and" || t.role === "or" ? "confuses-and-with-or" : t.role === "cmp" ? (sub === "inclusive" || sub === "exclusive" ? "confuses-inclusive-and-exclusive" : "chose-a-comparison") : t.role === "not" ? "chose-the-negation" : t.role === "var" ? "chose-an-operand" : "chose-punctuation-or-keyword") };
  }, 300);
}
