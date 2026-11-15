// Independent guessability / shortcut probe. Usage: node guess-probe.mjs [N] [seedBase]
import { generate, makeRng, booleanGame, DIFFICULTIES } from "../../engine.js";
import * as B from "../../generators/bool.js";
const N = Number(process.argv[2] || 2000), base = Number(process.argv[3] || 7001);
const rows = [];
for (const L of DIFFICULTIES) {
  const c = { n: 0, T: 0, run: 0, maxRun: 0, prev: null, sc: 0, sc2: 0, taut: 0, ignorable: 0, fail: 0, op: {}, len: [], textLen: [0, 0] };
  for (let i = 0; i < N; i++) {
    let q; try { q = generate("evaluate", makeRng(base + i * 7919), L); } catch { c.fail++; continue; }
    c.n++; const ans = q.choices[q.answer] === "true"; if (ans) c.T++;
    if (c.prev === ans) c.run++; else c.run = 0; c.maxRun = Math.max(c.maxRun, c.run); c.prev = ans;
    const lastLine = q.code.trim().split("\n").pop(); const m = lastLine.match(/^boolean \w+ = (.*);$/); if (!m) continue;
    const node = B.parse(m[1]);
    // Shortcut A: leftmost-operand short-circuit decides the result (first term alone determines answer)
    const env = {}; for (const l of q.code.split("\n")) { const k = l.match(/^(int|boolean) (\w+) = (-?\w+);/); if (k) env[k[2]] = k[1] === "int" ? Number(k[3]) : k[3] === "true"; }
    const top = node.xs ?? [node];
    if (node.k === "and" || node.k === "or") {
      const first = B.evaluate(top[0], env);
      if ((node.k === "and" && !first) || (node.k === "or" && first)) c.sc++;
    }
    // Shortcut B: a single variable/comparison flip never changes result (ignorable terms)
    const vars = [...new Set([...B.varsOf(node)])];
    const ess = vars.filter(v => B.evaluate(node, { ...env, [v]: !env[v] }) !== ans).length;
    const intAtoms = []; const walk = n => n.k === "cmp" ? intAtoms.push(n) : n.k === "not" ? walk(n.a) : B.isCompound(n) ? n.xs.forEach(walk) : 0; walk(node);
        const cmpFlip = intAtoms.some(a => { const v = a.v; return B.evaluate(node, { ...env, [v]: env[v] + 1 }) !== ans || B.evaluate(node, { ...env, [v]: env[v] - 1 }) !== ans; });
    if (ess === 0 && !cmpFlip) c.ignorable++;
    // Shortcut C: decided by the NOT/AND/OR top-level operator alone? predictor accuracy
    const key = node.k + (node.k === "not" ? "" : ""); c.op[key] ??= [0, 0]; c.op[key][0]++; if (ans) c.op[key][1]++;
    // Shortcut D: longest-expression predictor
    c.len.push([m[1].length, ans]);
    // Beginner-level sufficiency: count of ops
  }
  const med = c.len.map(x => x[0]).sort((a, b) => a - b)[c.len.length >> 1];
  const lenAcc = c.len.filter(([l, a]) => (l > med) === a).length / c.len.length;
  const opAcc = Object.values(c.op).reduce((s, [n, t]) => s + Math.max(t, n - t), 0) / c.n;
  rows.push({ L, n: c.n, fail: c.fail, pTrue: +(c.T / c.n).toFixed(3), maxRunSameAns: c.maxRun + 1, shortCircuitDecides: +(c.sc / c.n).toFixed(3), noBoolFlipChanges: +(c.ignorable / c.n).toFixed(3), bestTopOpPredictor: +opAcc.toFixed(3), lengthPredictor: +Math.max(lenAcc, 1 - lenAcc).toFixed(3), ops: Object.fromEntries(Object.entries(c.op).map(([k, [n, t]]) => [k, `${n}:${(t / n).toFixed(2)}`])) });
}
console.table(rows.map(({ ops, ...r }) => r)); rows.forEach(r => console.log(r.L, JSON.stringify(r.ops)));
