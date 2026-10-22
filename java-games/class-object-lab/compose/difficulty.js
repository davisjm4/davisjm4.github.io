/* Measured complexity of a generated challenge and the tier gates that reject challenges whose
 * measured complexity does not match the requested difficulty. Difficulty is a property of the
 * executed program (objects, references, updates, calls, decisions, features), not of code length. */
import { walkProgram, isRefType } from "./ir.js";

export const LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const levelIndex = (d) => { const i = LEVELS.indexOf(d); if (i < 0) throw Error("Unknown difficulty " + d); return i; };

export function metricsOf(program, sim, query) {
  const t = sim.trace;
  const refVars = program.main.filter((s) => s.k === "decl" && isRefType(s.t) && s.t !== "String").length;
  const helperRefParams = program.helpers.reduce((a, h) => a + h.params.filter((p) => isRefType(p.t) && p.t !== "String").length, 0);
  const features = new Set();
  let maxShare = 0;
  for (const st of t.stmtStates) {
    const count = {}; for (const v of Object.values(st.vars)) if (v.k === "r") count[v.id] = (count[v.id] || 0) + 1;
    maxShare = Math.max(maxShare, ...Object.values(count), 0);
  }
  if (maxShare >= 2) features.add("alias");
  if (maxShare >= 3) features.add("multi-alias");
  const kinds = program.main.map((s) => s.k + ":" + (s.e?.k || "") + ":" + (s.tg?.k || ""));
  const anyAsgName = program.main.some((s) => s.k === "asg" && s.tg.k === "name");
  if (anyAsgName && features.has("alias")) features.add("reassign-after-alias");
  if (program.main.some((s) => (s.k === "asg" || s.k === "decl") && s.e?.k === "lit" && s.e.t === "null")) features.add("null");
  let staticFields = 0, shadow = false, chain = false, overloads = false, retRef = false, cond = false, thisRet = false, multiField = false;
  for (const c of program.classes) {
    staticFields += c.fields.filter((f) => f.st).length;
    if (c.fields.filter((f) => !f.st).length >= 2) multiField = true;
    if (c.ctors.length > 1 || new Set(c.methods.map((m) => m.n)).size < c.methods.length) overloads = true;
    for (const k of c.ctors) { if (k.chain) chain = true; if (k.params.some((p) => c.fields.some((f) => f.n === p.n))) shadow = true; }
    for (const m of c.methods) { if (isRefType(m.ret) && m.ret !== "String" && m.ret !== "void") retRef = true; if (m.params.some((p) => c.fields.some((f) => f.n === p.n))) shadow = true; }
  }
  walkProgram(program, (n) => { if (n.k === "if" || n.k === "tern") cond = true; if (n.k === "ret" && n.e?.k === "this") thisRet = true; if (n.k === "decl" && program.classes.some((c) => c.fields.some((f) => f.n === n.n))) shadow = true; });
  for (const h of program.helpers) {
    if (isRefType(h.ret) && h.ret !== "void" && h.ret !== "String") retRef = true;
    if (h.body.some((s) => s.k === "asg" && s.tg.k === "name" && h.params.some((p) => p.n === s.tg.n && isRefType(p.t)))) features.add("param-reassign");
    if (h.body.some((s) => s.k === "ex" && s.e.k === "call" && s.e.o?.k === "name" && h.params.some((p) => p.n === s.e.o.n))) features.add("param-mutation");
  }
  if (staticFields) features.add("static");
  if (staticFields >= 2 || program.classes.length >= 2) features.add("multi-static-or-class");
  if (shadow) features.add("shadowing");
  if (chain) features.add("ctor-chain");
  if (overloads) features.add("overload");
  if (retRef) features.add("returns-reference");
  if (thisRet) features.add("returns-this");
  if (cond && t.branches.length) features.add("conditional");
  if (t.branches.length >= 3) features.add("several-decisions");
  if (multiField) features.add("multi-field");
  if (program.helpers.length >= 2) features.add("several-helpers");
  if (t.exc) features.add("exception");
  const receivers = new Set();
  for (const s of program.main) if (s.k === "ex" && s.e.k === "call" && s.e.o?.k === "name") receivers.add(s.e.o.n);
  if (receivers.size >= 2) features.add("several-receivers");
  if (sim.created >= 3) features.add("three-objects");
  if (program.main.filter((s) => s.k === "print").length >= 2) features.add("several-outputs");
  void kinds;
  const metrics = {
    objects: sim.created,
    references: refVars + helperRefParams,
    fieldUpdates: t.fieldWrites + t.staticWrites,
    calls: t.calls,
    decisions: t.branches.length,
    mainStatements: program.main.length,
    classes: program.classes.length,
    helpers: program.helpers.length,
    features: [...features].sort(),
  };
  metrics.score = Math.round(metrics.objects * 2 + metrics.references * 1.5 + metrics.fieldUpdates + metrics.calls + metrics.decisions * 2 + metrics.mainStatements * 0.5 + metrics.classes * 2 + metrics.helpers * 2 + features.size * 3 + (query?.kind === "reverse" ? 2 : 0));
  return metrics;
}

/* Selection questions (reverse reasoning, "which statement compiles") are smaller programs whose
 * difficulty lies in evaluating each candidate; they use their own, documented bounds. */
function gateSelect(level, m) {
  if (level === 0) { if (m.objects > 2 || m.classes > 1 || m.decisions > 2 || m.score > 34) return "beginner:select"; return null; }
  if (level === 1) { if (m.score < 9) return "intermediate:too-simple"; if (m.score > 48) return "intermediate:score"; return null; }
  if (m.score < 16) return "advanced:too-simple";
  if (m.features.length < 2) return "advanced:features";
  return null;
}
const HEAVY = ["ctor-chain", "param-reassign", "returns-reference", "returns-this", "several-decisions", "multi-alias", "reassign-after-alias", "exception", "several-helpers", "multi-static-or-class", "three-objects"];
/* Returns null when the challenge fits the tier, otherwise the reason it was rejected. */
export function gate(level, m, kind = "output") {
  if (kind === "select") return gateSelect(level, m);
  if (level === 0) {
    if (m.objects > 2) return "beginner:objects";
    if (m.mainStatements > 6) return "beginner:statements";
    if (m.decisions > 2) return "beginner:decisions";
    if (m.classes > 1 || m.helpers > 1) return "beginner:classes";
    if (m.features.filter((f) => HEAVY.includes(f)).length > 1) return "beginner:heavy";
    if (m.score > 34) return "beginner:score";
    return null;
  }
  if (level === 1) {
    if (m.objects > 4 || m.mainStatements > 9) return "intermediate:size";
    if (m.score < 14) return "intermediate:too-simple";
    if (m.score > 52) return "intermediate:score";
    return null;
  }
  if (m.score < 24) return "advanced:too-simple";
  if (m.features.length < 2) return "advanced:features";
  if (m.mainStatements > 12 || m.objects > 6 || m.calls > 40) return "advanced:bounds";
  return null;
}
