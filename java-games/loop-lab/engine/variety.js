/* Structural variation for the original modes. Decisions are made once per challenge and
 * applied identically to the program and every misconception mutant, so answers and
 * distractors stay consistent. */
import { J, finalize, clone, walk, walkExpr } from "./java-model.js?v=loop-expansion-v2";

const POOLS = {
  count: ["count", "tally", "hits", "matches"], total: ["total", "sum", "result", "acc"], product: ["product", "prod", "value"],
  last: ["last", "latest", "recent"], small: ["small", "low"], big: ["big", "high"], evens: ["evens", "evenSum"], odds: ["odds", "oddCount"],
  remaining: ["remaining", "left", "balance"], found: ["found", "match", "spot"], after: ["after", "next"], tries: ["tries", "attempts", "rounds"],
  steps: ["steps", "moves", "rounds"], other: ["other", "rest"], row: ["row", "r", "outer", "i"], col: ["col", "c", "inner", "j"],
  i: ["i", "k", "n", "x"], level: ["level", "value", "n", "x"],
};
function namesIn(program) { const s = new Set(); walk(program, (st) => { if (st.name) s.add(st.name); if (st.c) walkExpr(st.c, (e) => e.t === "var" && s.add(e.name)); }); return s; }
export function chooseRenames(program, rng) {
  const present = namesIn(program), used = new Set(present), map = {};
  for (const name of present) {
    const pool = POOLS[name]; if (!pool) continue;
    const opts = pool.filter((x) => x === name || !used.has(x));
    const pick = rng.pick(opts); if (pick !== name) { map[name] = pick; used.add(pick); }
  }
  return map;
}
function renameExpr(e, map) { if (!e || typeof e !== "object") return; if (e.t === "var" && map[e.name]) e.name = map[e.name]; for (const k of ["l", "r", "e", "a", "i", "o"]) if (e[k]) renameExpr(e[k], map); (e.args || []).forEach((x) => renameExpr(x, map)); (e.items || []).forEach((x) => renameExpr(x, map)); }
export function renameProgram(program, map) {
  const p = clone(program);
  walk(p, (st) => { if (st.name && map[st.name]) st.name = map[st.name]; for (const k of ["e", "c"]) if (st[k]) renameExpr(st[k], map); });
  return p;
}
export const renameText = (text, map) => (typeof text !== "string" ? text : Object.keys(map).length ? text.replace(new RegExp(`\\b(${Object.keys(map).join("|")})\\b`, "g"), (w) => map[w]) : text);
const hasContinue = (stmts) => { let c = false; const scan = (list, depth) => list.forEach((s) => { if (s.t === "continue" && depth === 0) c = true; if (s.t === "if") { scan(s.then, depth); if (s.els) scan(s.els, depth); } }); scan(stmts, 0); return c; };
/** Convert the tagged for loop into initialization + while loop (update moved to the end of the body). */
export function forToWhile(program, tagName) {
  const p = clone(program); let done = false;
  const conv = (list) => { for (let i = 0; i < list.length; i++) { const st = list[i];
    if (!done && st.t === "for" && st.tag === tagName && !hasContinue(st.body)) { list.splice(i, 1, st.init, { t: "while", c: st.c, body: [...st.body, st.upd], tag: st.tag, mark: st.mark }); done = true; return; }
    if (st.body) conv(st.body); } };
  conv(p);
  return done ? p : null;
}
/** Rewrite statement forms: x++ → x += 1 or x = x + 1 (and --). Applies to body statements only. */
export function incrementForm(program, form) {
  if (form === "plain") return program;
  const p = clone(program);
  const rewrite = (st) => { if (st.t !== "inc") return st; const op = st.op === "++" ? "+" : "-"; const out = form === "compound" ? { t: "set", name: st.name, op: op + "=", e: J.n(1) } : { t: "set", name: st.name, op: "=", e: J.bin(op, J.v(st.name), J.n(1)) }; for (const k of ["tag", "mark"]) if (st[k]) out[k] = st[k]; return out; };
  const scan = (list) => list.forEach((s, i) => { list[i] = rewrite(s); if (s.body) scan(s.body); if (s.then) scan(s.then); if (s.els) scan(s.els); });
  scan(p);
  return p;
}
/** Apply one set of decisions to the spec's program, mutants, target, and text. */
export function applyVariety(spec, rng, { convert = true, loopTag = "main" } = {}) {
  const map = chooseRenames(spec.program, rng);
  const toWhile = convert && rng.chance(0.4);
  const form = rng.pick(["plain", "plain", "compound", "expanded"]);
  const tf = (prog) => { if (!prog) return prog; let p = renameProgram(prog, map); if (toWhile) { const w = forToWhile(p, loopTag); if (w) p = w; } p = incrementForm(p, form); return finalize(p); };
  const out = { ...spec, program: tf(spec.program) };
  out.mutants = (spec.mutants || []).map((m) => (m ? { ...m, program: tf(m.program), target: m.target ? renameTarget(m.target, map) : m.target } : m));
  out.target = renameTarget(spec.target, map);
  out.traceVars = (spec.traceVars || []).map((v) => map[v] || v);
  out.prompt = renameText(spec.prompt, map);
  const ex = spec.explain; out.explain = typeof ex === "function" ? (a, r) => renameText(ex(a, r), map) : renameText(ex, map);
  out.extraDistractors = (spec.extraDistractors || []).map((d) => (d ? { ...d, choice: renameText(d.choice, map) } : d));
  out.variety = { renamed: Object.keys(map).length, whileForm: toWhile && out.program.some((s) => s.t === "while" && s.tag === loopTag), incrementForm: form };
  return out;
}
function renameTarget(t, map) { if (!t) return t; const o = { ...t }; if (o.name) o.name = map[o.name] || o.name; if (o.names) o.names = o.names.map((n) => map[n] || n); if (o.vars) o.vars = o.vars.map((n) => map[n] || n); return o; }
