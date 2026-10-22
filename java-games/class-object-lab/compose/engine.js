/* Compositional Class & Object generator: realisation, single-challenge API and practice sessions.
 *
 * A family returns a *spec* (program IR + query + misconception models). realize() then:
 *   1. simulates the program (correct Java semantics) -> the answer,
 *   2. simulates each misconception model / alternative reading -> candidate distractors,
 *   3. keeps only candidates that differ from the answer, are distinct, and carry a misconception,
 *   4. rejects programs containing statements that affect neither the answer nor any chosen
 *      distractor (no padding with irrelevant code),
 *   5. measures complexity and applies the difficulty gate,
 *   6. renders Java, explanation, trace and object diagram, and computes signatures.
 * Nothing is authored as a complete program; nothing is answered from a lookup table. */
import { makeRng, hashString } from "./rng.js";
import { simulate } from "./sim.js";
import { emitDisplay, expr } from "./emit.js";
import { pr, clone } from "./ir.js";
import { context } from "./kit.js";
import { MIS } from "./misconceptions.js";
import { metricsOf, gate, LEVELS, levelIndex } from "./difficulty.js";
import { signatures, canonicalize, canonFragment } from "./signature.js";
import { traceSteps, objectCards } from "./explain.js";
import { FAMILIES } from "./families/index.js";
import { validateProgram } from "./validate.js";

export const MODE_IDS = ["structure", "defaults", "constructors", "getters", "setters", "this", "independent", "aliases", "equality", "parameters", "static", "tostring", "reverse"];
export const MODE_NAMES = { structure: "Class versus object", defaults: "Instance variables and initial state", constructors: "Constructor initialization", getters: "Getters and encapsulation", setters: "Setters and state updates", this: "this and parameter shadowing", independent: "Multiple independent objects", aliases: "Object references and aliases", equality: "Reference equality", parameters: "Passing an object to a method", static: "Static versus instance fields", tostring: "toString() and object representation", reverse: "Reverse reasoning" };
export { LEVELS };
export const GAME_ID = "class-object-lab";
const MAX_ATTEMPTS = 400;

const safeSim = (program, m) => { try { const s = simulate(program, { m }); return s.error ? null : s; } catch { return null; } };
export function outputText(sim) {
  if (sim.exc) return sim.out.length ? `${sim.out.join("\n")}\nthen a ${sim.exc} is thrown` : `A ${sim.exc} is thrown`;
  return sim.out.join("\n");
}
const COUNT = {
  created: (s) => s.created,
  reachable: (s) => s.reachable(),
  sameAs: (s, q) => (s.vars[q.v] ? Object.entries(s.vars).filter(([k, v]) => k !== q.v && v.k === "r" && s.vars[q.v]?.k === "r" && v.id === s.vars[q.v].id).length : -1),
  nullVars: (s) => Object.values(s.vars).filter((v) => v.k === "n").length,
};

function pickDistractors(rng, pool, answer, n = 3) {
  const seen = new Set([answer]);
  const uniq = [];
  for (const c of pool) { if (c.text == null || c.text === "" || seen.has(c.text) || !c.mis || !MIS[c.mis]) continue; seen.add(c.text); uniq.push(c); }
  // prefer distinct misconceptions; keep family ordering as relevance but randomise ties
  const byMis = new Map();
  for (const c of rng.shuffle(uniq)) if (!byMis.has(c.mis)) byMis.set(c.mis, c);
  // family order expresses relevance (on-topic misconceptions first); a small jitter only breaks near-ties
  const jitter = new Map(uniq.map((c) => [c, rng.next() * 0.15]));
  const order = (arr) => arr.sort((a, b) => ((a.rank ?? 9) + jitter.get(a)) - ((b.rank ?? 9) + jitter.get(b)));
  const first = order([...byMis.values()]).slice(0, n);
  if (first.length < n) for (const c of uniq) { if (first.length >= n) break; if (!first.includes(c)) first.push(c); }
  if (first.length < n) return null;
  return balanceLength(first, uniq, answer.length);
}
/* Length balance: if the key would be the uniquely longest choice, swap in an unused misconception
 * candidate that is at least as long (keeps every distractor misconception-based). */
function balanceLength(chosen, pool, ansLen) {
  if (chosen.some((c) => c.text.length >= ansLen)) return chosen;
  const longer = pool.filter((c) => !chosen.includes(c) && c.text.length >= ansLen);
  if (!longer.length) return chosen;
  const out = [...chosen];
  const pick = longer.find((c) => !out.some((o) => o.mis === c.mis)) || longer[0];
  out[out.length - 1] = pick;
  return out;
}

/* ---------------- answer derivation per query kind ---------------- */
function deriveOutput(spec, sim) {
  const answer = outputText(sim);
  const pool = [];
  (spec.mis || []).forEach((flag, i) => { const s = safeSim(spec.program, { [flag]: true }); if (s && !(s.exc && !spec.allowExcDistractors && !spec.allowExc)) pool.push({ text: outputText(s), mis: flag, rank: i * 0.1, flag }); });
  // alternative readings compete with simulator flags (rank in the middle of the flag order), so
  // topic-specific readings (boundary, ignored computation, argument order) are not crowded out
  (spec.alts || []).forEach((alt) => { const s = safeSim(alt.program); if (s && !s.exc) pool.push({ text: outputText(s), mis: alt.mis, rank: alt.rank ?? 0.35, alt }); });
  (spec.extra || []).forEach((x) => pool.push({ ...x, rank: x.rank ?? 1 }));
  return { answer, pool };
}
function deriveCount(spec, sim) {
  const f = COUNT[spec.q.what];
  const answer = String(f(sim, spec.q));
  const pool = [];
  (spec.mis || []).forEach((flag, i) => { const s = safeSim(spec.program, { [flag]: true }); if (s && !s.exc) pool.push({ text: String(f(s, spec.q)), mis: flag, rank: i * 0.1, flag }); });
  for (const m of spec.countModels ? spec.countModels(sim, spec.program) : []) if (Number.isInteger(m.value) && m.value >= 0) pool.push({ text: String(m.value), mis: m.mis, rank: 2 });
  return { answer, pool };
}
function deriveValue(spec, sim) {
  const f = spec.q.measure;
  const answer = f(sim, spec.program);
  if (answer == null) return null;
  const pool = [];
  (spec.mis || []).forEach((flag, i) => { const s = safeSim(spec.program, { [flag]: true }); if (s && !s.exc) { const t = f(s, spec.program); if (t != null) pool.push({ text: t, mis: flag, rank: i * 0.1, flag }); } });
  for (const m of spec.models ? spec.models(sim, spec.program) : []) if (m.text != null) pool.push({ text: m.text, mis: m.mis, rank: 2 });
  return { answer, pool };
}
function deriveCompare(spec, sim, rng) {
  const aug = { ...spec.program, main: [...spec.program.main, ...spec.q.cands.map((c) => pr(c))] };
  const truth = safeSim(aug);
  if (!truth || truth.exc) return null;
  const vals = truth.out.map((x) => x === "true");
  const flagVals = {};
  for (const flag of spec.mis || []) { const s = safeSim(aug, { [flag]: true }); if (s && !s.exc) flagVals[flag] = s.out.map((x) => x === "true"); }
  const want = spec.q.want;
  // a comparison that merely confirms a live variable is non-null ("x != null" true / "x == null" false)
  // is a trivial key; it may appear only as a distractor
  const trivial = (c, v) => c.k === "bin" && c.r.k === "lit" && c.r.t === "null" && ((c.op === "!=" && v === true) || (c.op === "==" && v === false));
  const right = spec.q.cands.map((c, i) => i).filter((i) => vals[i] === want && !trivial(spec.q.cands[i], vals[i]));
  if (!right.length) return null;
  const ansIdx = rng.pick(right);
  const pool = [];
  spec.q.cands.forEach((c, i) => {
    if (vals[i] === want) return;
    const flag = (spec.mis || []).find((f) => flagVals[f] && flagVals[f][i] === want);
    if (flag) pool.push({ text: expr(c), mis: flag, idx: i, flag });
  });
  // drop textual duplicates (a == b vs b == a would never both appear: pairs are generated once)
  return { answer: expr(spec.q.cands[ansIdx]), ansIdx, pool, aug, vals };
}
function deriveSelect(spec, sim) {
  // reverse/compile: candidates are fragments; exactly one satisfies the goal
  const results = spec.q.cands.map((cand) => {
    if (cand.invalid) return { ok: false, invalid: cand.invalid };
    const prog = { ...spec.program, main: [...spec.program.main, ...(spec.q.pre || []), ...cand.stmts, ...(spec.q.check ? [pr(spec.q.check)] : [])] };
    if (validateProgram(prog).length) return { ok: false, err: true, invalidProgram: true };
    const s = safeSim(prog);
    if (!s) return { ok: false, err: true };
    if (s.exc) return { ok: false, exc: s.exc, prog };
    const ok = spec.q.check ? s.out[s.out.length - 1] === "true" : true;
    return { ok, prog, sim: s };
  });
  const goodIdx = results.map((r, i) => (spec.q.want === "fails" ? !!results[i].invalid : r.ok) ? i : -1).filter((i) => i >= 0);
  if (goodIdx.length !== 1 || results.some((r) => r.invalidProgram)) return null;
  const ans = goodIdx[0];
  const pool = spec.q.cands.map((c, i) => (i === ans ? null : { text: c.text, mis: c.mis, idx: i })).filter(Boolean);
  return { answer: spec.q.cands[ans].text, ansIdx: ans, pool, results };
}

/* Statement relevance: every non-declaration main statement must influence the answer or one of the
 * chosen distractors' misconception models. */
function relevant(spec, chosenFlags, measure) {
  const base = measure(spec.program, null);
  const baseFlags = chosenFlags.map((f) => measure(spec.program, f));
  for (let i = 0; i < spec.program.main.length; i++) {
    const s = spec.program.main[i];
    if (s.k === "decl" || s.k === "print") continue;
    const q = clone(spec.program); q.main.splice(i, 1);
    const changed = measure(q, null) !== base || chosenFlags.some((f, j) => measure(q, f) !== baseFlags[j]);
    if (!changed) return false;
  }
  return true;
}

export function realize(spec, mode, level, rng) {
  if (validateProgram(spec.program).length) return { fail: "invalid-program" };
  const sim = safeSim(spec.program);
  if (!sim) return { fail: "sim" };
  if (sim.exc && !spec.allowExc) return { fail: "exception" };
  if (sim.steps > 3000) return { fail: "steps" };
  let d;
  const kind = spec.q.kind;
  if (kind === "output") d = deriveOutput(spec, sim);
  else if (kind === "count") d = deriveCount(spec, sim);
  else if (kind === "compare") d = deriveCompare(spec, sim, rng);
  else if (kind === "value") d = deriveValue(spec, sim);
  else if (kind === "select") d = deriveSelect(spec, sim);
  else throw Error("unknown query " + kind);
  if (!d) return { fail: "derive" };
  const chosen = pickDistractors(rng, d.pool, d.answer);
  if (!chosen) return { fail: "distractors" };
  // relevance (not applied to selection questions, whose base program is context)
  if (kind !== "select" && !spec.skipRelevance) {
    const flags = [...new Set(chosen.map((c) => c.flag).filter(Boolean))];
    let measure;
    if (kind === "output") measure = (p, f) => { const s = safeSim(p, f ? { [f]: true } : undefined); return s ? outputText(s) : "!"; };
    else if (kind === "count") measure = (p, f) => { const s = safeSim(p, f ? { [f]: true } : undefined); if (!s) return "!"; const models = !f && spec.countModels ? spec.countModels(s, p).filter((x) => chosen.some((c) => c.mis === x.mis)).map((x) => x.mis + x.value).join(",") : ""; return String(COUNT[spec.q.what](s, spec.q)) + "|" + models; };
    else if (kind === "value") measure = (p, f) => { const s = safeSim(p, f ? { [f]: true } : undefined); if (!s) return "!"; const models = !f && spec.models ? spec.models(s, p).filter((x) => chosen.some((c) => c.mis === x.mis)).map((x) => x.mis + x.text).join(",") : ""; return String(spec.q.measure(s, p)) + "|" + models; };
    else measure = (p, f) => { const idx = [d.ansIdx, ...chosen.map((c) => c.idx)]; const s = safeSim({ ...p, main: [...p.main, ...idx.map((i) => pr(spec.q.cands[i]))] }, f ? { [f]: true } : undefined); return s ? s.out.join(",") : "!"; };
    if (!relevant(spec, flags, measure)) return { fail: "irrelevant" };
  }
  let metrics;
  if (kind === "select") {
    // a selection question's reasoning = executing every candidate from the base state
    const r = d.results[d.ansIdx];
    const answerSim = r.sim || sim;
    metrics = metricsOf(r.prog || spec.program, answerSim, spec.q);
    const traced = d.results.filter((x) => x.sim || x.exc).length;
    metrics.candidatesTraced = traced;
    metrics.score += traced * 2;
    if (traced >= 3) metrics.features = [...new Set([...metrics.features, "trace-each-candidate"])].sort();
  } else metrics = metricsOf(spec.program, sim, spec.q);
  const g = gate(level, metrics, kind);
  if (g) return { fail: g };
  const disp = emitDisplay(spec.program);
  const choices = rng.shuffle([d.answer, ...chosen.map((c) => c.text)]);
  const { map } = canonicalize(spec.program);
  const answerCanon = kind === "compare" ? canonFragment(spec.q.cands[d.ansIdx], map) : kind === "select" ? canonFragment(spec.q.cands[d.ansIdx].stmts || spec.q.cands[d.ansIdx].text, map) : "";
  const sig = signatures({ program: spec.program, display: disp.code, prompt: spec.prompt, choices, sim, query: spec.q, canon: spec.canon, mode, difficulty: LEVELS[level], family: spec.fam, answerCanon });
  const steps = kind === "select" ? selectSteps(spec, d) : traceSteps(spec.program, sim);
  const diagram = kind === "select" ? null : objectCards(spec.program, sim);
  const why = Object.fromEntries(chosen.map((c) => [c.text, { misconception: c.mis, label: MIS[c.mis].label, why: c.why || MIS[c.mis].why }]));
  return {
    ok: true,
    challenge: {
      family: spec.fam, code: disp.code, prompt: spec.prompt, context: contextNote(spec.program, kind),
      choices, answer: d.answer, focus: spec.focus, summary: answerSummary(spec, d, sim),
      steps, diagram, why, misconceptions: chosen.map((c) => c.mis), metrics, signatures: sig,
      program: spec.program, query: serialQuery(spec.q),
      verify: { kind, answerIndex: d.ansIdx ?? null },
    },
  };
}
function serialQuery(q) {
  if (q.kind === "value") return { kind: q.kind, what: q.what || null, v: q.v || null };
  if (q.kind === "compare") return { kind: q.kind, want: q.want, cands: q.cands };
  if (q.kind === "select") return { kind: q.kind, want: q.want, check: q.check || null, pre: q.pre || null, cands: q.cands.map((c) => ({ text: c.text, stmts: c.stmts || null, invalid: c.invalid || null, mis: c.mis || null })) };
  return { ...q };
}
function contextNote(program, kind) {
  const parts = ["The statements after the class run in order inside main."];
  if (program.helpers.length) parts.push("The static methods shown outside the class are in the same class as main.");
  if (kind === "select") parts.push("Each choice would be placed at the end of main.");
  return parts.join(" ");
}
function answerSummary(spec, d, sim) {
  switch (spec.q.kind) {
    case "output": return sim.exc ? `Running the code: ${d.answer}.` : `The program prints ${d.answer.includes("\n") ? "these lines in order: " + d.answer.split("\n").join(", ") : d.answer}.`;
    case "count": return `The answer is ${d.answer}.`;
    case "value": return `Answer: ${d.answer}.`;
    case "compare": return `${d.answer} is ${spec.q.want}.`;
    case "select": return `${d.answer} is the only choice that ${spec.q.want === "fails" ? "does not compile" : "achieves the goal"}.`;
  }
  return "";
}
function selectSteps(spec, d) {
  return spec.q.cands.map((c, i) => {
    const r = d.results[i];
    let effect;
    if (c.invalid) effect = `does not compile: ${MIS[c.invalid]?.why || c.invalid}`;
    else if (r.exc) effect = `throws a ${r.exc}`;
    else if (spec.q.want === "fails") effect = "compiles";
    else effect = r.ok ? "achieves the goal" : (c.note || "does not achieve the goal");
    return { code: c.text, effect };
  });
}

/* ---------------- single challenge ---------------- */
function familiesFor(mode) { const f = FAMILIES[mode]; if (!f) throw Error(`Unknown mode ${mode}`); return f; }
export function generateChallenge({ mode, difficulty = "Beginner", seed = 1, accept = null, familyHint = null } = {}) {
  if (mode === "mixed") { const r = makeRng(seed); mode = r.pick(MODE_IDS); }
  const level = levelIndex(difficulty);
  const fams = familiesFor(mode);
  const rng = makeRng(seed);
  const fails = {};
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sub = rng.fork(attempt);
    const famFn = familyHint && attempt < MAX_ATTEMPTS / 2 ? fams.find((f) => f.name === familyHint) || sub.pick(fams) : sub.pick(fams);
    const spec = famFn(context(sub, level));
    if (!spec) { fails.unsupported = (fails.unsupported || 0) + 1; continue; }
    const r = realize(spec, mode, level, sub);
    if (!r.ok) { fails[r.fail] = (fails[r.fail] || 0) + 1; continue; }
    const ch = finish(r.challenge, mode, difficulty, seed, attempt);
    if (accept && !accept(ch) && attempt < MAX_ATTEMPTS - 1) { fails.rejectedByCaller = (fails.rejectedByCaller || 0) + 1; continue; }
    ch.attempts = attempt + 1;
    return ch;
  }
  const e = new Error(`Could not generate ${mode}/${difficulty} (seed ${seed}): ${JSON.stringify(fails)}`);
  e.fails = fails; throw e;
}
function finish(c, mode, difficulty, seed, attempt) {
  const id = `${GAME_ID}:${mode}:${difficulty}:${seed}:${attempt}`;
  return {
    id, game: GAME_ID, gameId: GAME_ID, title: "Class & Object Lab",
    mode, difficulty, topic: mode, topicTitle: MODE_NAMES[mode], concept: MODE_NAMES[mode],
    variant: c.family, family: c.family,
    code: c.code, preformatted: true, context: c.context, prompt: c.prompt,
    choices: c.choices, answer: c.answer, correctAnswer: c.answer,
    explanation: `${c.focus} ${c.summary}`.trim(), focus: c.focus, summary: c.summary,
    steps: c.steps, diagram: c.diagram, why: c.why, misconceptions: c.misconceptions,
    metrics: c.metrics, signatures: c.signatures,
    signature: c.signatures.exact, structuralSignature: c.signatures.program, reasoningSignature: c.signatures.reasoning,
    program: c.program, query: c.query, verify: c.verify, seed,
  };
}

/* ---------------- practice sessions ---------------- */
export function createPracticeSession({ seed = 1, mode = "mixed", difficulty = "Beginner", historyLimit = 600 } = {}) {
  const base = makeRng(seed);
  const usedReasoning = new Map(); // key -> last index
  const usedExact = new Set();
  const lastFamily = {};
  const misses = {};
  const modeQueue = [...MODE_IDS];
  let count = 0;
  const stats = { generated: 0, review: 0 };
  function next(opts = {}) {
    const diff = opts.difficulty || difficulty;
    let m = opts.mode || mode;
    if (m === "mixed") { m = modeQueue.shift(); modeQueue.push(m); }
    const level = levelIndex(diff);
    let best = null, bestAge = -1;
    const budget = (misses[m + level] || 0) >= 3 ? 10 : 48; // pool exhausted: review mode needs only a short search
    for (let t = 0; t < budget; t++) {
      const s = Math.floor(base.next() * 4294967296) >>> 0;
      let ch;
      try { ch = generateChallenge({ mode: m, difficulty: diff, seed: s }); } catch { continue; }
      const rk = ch.reasoningSignature;
      const fresh = !usedReasoning.has(rk) && !usedExact.has(ch.signature);
      const familyRepeat = lastFamily[m + level] === ch.family && FAMILIES[m].length > 1 && t < 12;
      if (fresh && !familyRepeat) { best = ch; bestAge = Infinity; break; }
      const age = usedExact.has(ch.signature) ? -1 : usedReasoning.has(rk) ? count - usedReasoning.get(rk) : 1e9;
      if (age > bestAge) { best = ch; bestAge = age; }
    }
    if (!best) throw Error("Could not generate a challenge");
    best.review = bestAge !== Infinity && usedReasoning.has(best.reasoningSignature);
    misses[m + level] = best.review ? (misses[m + level] || 0) + 1 : 0;
    if (best.review) stats.review++;
    usedReasoning.set(best.reasoningSignature, count);
    usedExact.add(best.signature);
    if (usedReasoning.size > historyLimit) usedReasoning.delete(usedReasoning.keys().next().value);
    lastFamily[m + level] = best.family;
    count++; stats.generated++;
    return best;
  }
  return { next, get stats() { return { ...stats, distinctReasoning: usedReasoning.size }; } };
}

export function assessChallenge(challenge, response) {
  return String(response?.answer ?? response) === String(challenge.answer);
}
export const seedFrom = (r) => Math.floor(r() * 4294967296) >>> 0;
export { hashString };
