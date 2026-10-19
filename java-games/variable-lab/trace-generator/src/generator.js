// Program generator: objectives -> declarations -> typed statements -> dependencies ->
// target -> execution -> validation. Returns a validated candidate or null.

import { lit, vr, bin, not, decl, print, renderStmt, renderExpr, renderProgram, defOf, usesOf, walkExpr } from './model.js';
import { execute, formatValue, typeCheck } from './interp.js';
import { analyze, validateDifficulty, RULES, FAMILY_IDS, BASELINE_FAMILIES } from './analysis.js';
import { assign } from './model.js';
import { pickNames, initLiteral, intLit, charLit, stmtFor, intSideStatement, printExprFor, printOnlyStatement, CORE_POOLS } from './builders.js';

export const TYPES = ['int', 'double', 'boolean', 'char', 'String'];
export const FORMATS = ['output', 'final', 'checkpoint'];
export const TYPE_WEIGHTS = { int: 0.42, double: 0.14, boolean: 0.12, char: 0.08, String: 0.24 };
export const FORMAT_WEIGHTS = { output: 0.4, final: 0.33, checkpoint: 0.27 };
const INT_CAP = { beginner: 100, intermediate: 500, advanced: 2000 };

const MAX_STR = 22;
// a - a, a / a, a % a, a && a, a || !a ... are valid but teach nothing: reject them
const keyOf = (e) => (e.k === 'not' ? keyOf(e.e) : renderExpr(e));
export function hasTrivialSelfOp(program) {
  let found = false;
  for (const s of program) {
    if (!s.expr) continue;
    walkExpr(s.expr, (n) => {
      if (n.k === 'bin' && ['-', '/', '%', '&&', '||', '==', '!=', '<', '>', '<=', '>='].includes(n.op) && (n.l.k === 'var' || n.l.k === 'not') && (n.r.k === 'var' || n.r.k === 'not') && keyOf(n.l) === keyOf(n.r)) found = true;
    });
  }
  return found;
}
const tidyDouble = (v) => {
  if (Object.is(v, -0)) return false;
  if (!Number.isFinite(v) || Math.abs(v) >= 100000) return false;
  if (v !== 0 && Math.abs(v) < 0.001) return false;
  const r = Math.round(v * 1000) / 1000;
  return r === v && String(r) === String(v) && !/e/i.test(String(v));
};

// ---- objective selection (called by the public API with history-derived weights) ----
export function chooseObjective(rng, difficulty, type, format, weightOf = () => 1, forced = []) {
  let pool = CORE_POOLS[type].filter((f) => f !== 'STRING_CONCAT' || type !== 'char');
  if (difficulty === 'beginner') {
    // beginner programs have one variable (char is the exception: copying needs two)
    const banned = ['COPY_INDEPENDENCE', 'REMAINDER_BOOL', 'MIXED_NUMERIC', 'INTEGER_DIVISION_DBL', 'STRING_NUMBER_CONCAT'];
    pool = pool.filter((f) => {
      if (type !== 'char' && (f === 'ASSIGN_COPY' || f === 'COPY_INDEPENDENCE')) return false;
      if (type === 'char' && f === 'COPY_INDEPENDENCE') return false;
      if (type === 'boolean' && f === 'REMAINDER') return false;
      if (type === 'double' && (f === 'MIXED_NUMERIC' || f === 'INTEGER_DIVISION')) return false;
      if (f === 'STRING_NUMBER_CONCAT') return false;
      return !banned.includes(f) || false;
    });
    if (type === 'char') pool.push('REASSIGN_OVERWRITE');
  }
  if (format === 'final' && type !== 'char') pool.push('PRINT_VS_STORED');
  const n = difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? rng.int(1, 2) : rng.int(2, 3);
  const chosen = [...forced];
  const rest = pool.filter((f) => !chosen.includes(f));
  while (chosen.length < n && rest.length) {
    const f = rng.weighted(rest, (x) => weightOf(x));
    chosen.push(f); rest.splice(rest.indexOf(f), 1);
  }
  return chosen;
}

function needsInt(type, objective) {
  if (type === 'double') return objective.includes('MIXED_NUMERIC') || objective.includes('INTEGER_DIVISION');
  if (type === 'boolean') return objective.includes('REMAINDER');
  if (type === 'String') return objective.includes('STRING_NUMBER_CONCAT');
  return false;
}

function planVars(G, spec) {
  const { difficulty: d, type, objective, rng } = spec;
  const types = [];
  const extraInt = needsInt(type, objective);
  const sizeBy = { beginner: [1, 1], intermediate: [1, 2], advanced: [2, 3] };
  if (type === 'char' && d === 'intermediate') sizeBy.intermediate = [2, 3];
  if (type === 'char' && d === 'advanced') sizeBy.advanced = [3, 4];
  let [lo, hi] = sizeBy[d];
  if (objective.includes('ASSIGN_COPY') || objective.includes('COPY_INDEPENDENCE')) lo = Math.max(lo, 2);
  let n = rng.int(lo, hi);
  if (extraInt) {
    // need one helper int; keep declared counts inside the difficulty limits
    if (d === 'beginner') return null;
    n = Math.min(n, d === 'intermediate' ? 1 : 3);
    n = Math.max(n, 1);
    for (let i = 0; i < n; i++) types.push(type);
    types.push('int');
    if (d === 'advanced' && type === 'boolean' && types.length < 3) types.splice(1, 0, type);
  } else {
    for (let i = 0; i < n; i++) types.push(type);
  }
  if (d === 'intermediate' && types.length > (type === 'char' ? 3 : 2)) types.length = type === 'char' ? 3 : 2;
  if ((objective.includes('ASSIGN_COPY') || objective.includes('COPY_INDEPENDENCE')) && types.filter((t) => t === type).length < 2) return null;
  return types;
}

function checkPrefix(G, prog, from, quick) {
  // Validate statements prog[from..] against all generation rules.
  const exec = execute(prog, { maxInt: INT_CAP[G.difficulty] });
  if (!exec.ok) return null;
  if (hasTrivialSelfOp(prog.slice(from))) return null;
  // no dead stores: a value may not be overwritten before anything has read it
  const readSince = {}, lastKind = {};
  for (let i = 0; i < prog.length; i++) {
    const s = prog[i];
    const uses = usesOf(s);
    for (const u of uses) readSince[u] = true;
    const d = defOf(s);
    if (d) {
      if (i >= from && s.k === 'assign' && d in readSince && !readSince[d] && !uses.includes(d) && lastKind[d] !== 'decl') return null;
      readSince[d] = false; lastKind[d] = s.k;
    }
  }
  for (let i = from; i < prog.length; i++) {
    const st = exec.steps[i];
    const s = prog[i];
    if (s.k === 'assign' || s.k === 'compound' || s.k === 'incdec') {
      if (!st.changed.includes(s.name)) return null; // must visibly change something
    }
    for (const nm of Object.keys(st.after)) {
      const v = st.after[nm], t = exec.types[nm];
      if (t === 'double' && !tidyDouble(v)) return null;
      if (t === 'String' && v.length > MAX_STR) return null;
    }
    if (i > 0 && s.k !== 'print' && renderStmt(s) === renderStmt(prog[i - 1])) return null;
  }
  return exec;
}

function showsFamily(fam, prog, from, exec) {
  if (fam === 'INTEGER_DIVISION') {
    for (let i = from; i < prog.length; i++) if (exec.steps[i].ops.some((o) => (o.notes || []).some((n) => n.id === 'int-division'))) return true;
    return false;
  }
  if (fam === 'OPERATOR_PRECEDENCE') {
    const ltr = execute(prog, { precedence: 'ltr' });
    if (!ltr.ok) return false;
    for (let i = from; i < prog.length; i++) if (JSON.stringify(ltr.steps[i].after) !== JSON.stringify(exec.steps[i].after)) return true;
    return false;
  }
  return true;
}

function addDeclarations(G, vars, spec) {
  const { rng, difficulty } = spec;
  const order = rng.shuffle(vars);
  const taken = { char: [], String: [] };
  for (let i = 0; i < order.length; i++) {
    const v = order[i];
    let init = null;
    if (difficulty === 'advanced' && i > 0 && rng.chance(0.3)) {
      const earlier = order.slice(0, i).filter((e) => e.type === v.type);
      if (earlier.length) {
        const e = rng.pick(earlier), ev = vr(e.name, e.type);
        if (v.type === 'int') init = bin(rng.pick(['+', '*', '-']), ev, intLit(G, 2, 6));
        else if (v.type === 'double') init = bin(rng.pick(['+', '*']), ev, lit('double', rng.pick([1.5, 2, 0.5, 3])));
        else if (v.type === 'boolean') init = not(ev);
        else if (v.type === 'char') init = ev;
        else init = bin('+', ev, initLiteral(G, 'String', []));
      }
    }
    if (!init) init = initLiteral(G, v.type, taken[v.type] || []);
    if (v.type === 'char') taken.char.push(init.v);
    if (v.type === 'String' && init.k === 'lit') taken.String.push(init.v);
    G.vars.push({ name: v.name, type: v.type });
    G.stmts.push(decl(v.type, v.name, init));
    G.recent.unshift(v.name);
  }
  G.recent = [...order.map((v) => v.name)].reverse();
}

function addChangeStatements(G, spec, maxChanges) {
  const { rng, objective, difficulty, type } = spec;
  const baseline = ['SEQUENTIAL_UPDATE', 'REASSIGN_OVERWRITE'];
  const core = objective.filter((f) => f !== 'PRINT_VS_STORED');
  const target = spec.nChanges;
  const seq = [];
  let changes = 0, used = 0;
  const hasInt = G.vars.some((v) => v.type === 'int') && type !== 'int';
  let queue = rng.shuffle(core);
  let guard = 0;
  while (changes < target && guard++ < 20) {
    let fam = queue.shift();
    if (!fam) {
      const r = rng.next();
      if (hasInt && r < 0.3) fam = 'INT_SIDE';
      else if (r < 0.55 && difficulty !== 'beginner') fam = rng.pick(baseline);
      else fam = rng.pick(core.length ? core : baseline);
    }
    if (fam === 'REASSIGN_OVERWRITE' && difficulty !== 'beginner' && changes >= target - 1 && core.length) fam = rng.pick(core);
    if (fam === 'COPY_INDEPENDENCE' && maxChanges - used < 2) { fam = rng.pick(core.filter((f) => f !== 'COPY_INDEPENDENCE').concat(baseline)); }
    let accepted = false;
    { const e0 = execute(G.stmts, { maxInt: INT_CAP[difficulty] }); G.values = e0.ok ? e0.final : null; }
    for (let attempt = 0; attempt < 14 && !accepted; attempt++) {
      const stmts = fam === 'INT_SIDE' ? intSideStatement(G, rng) : stmtFor(G, fam);
      if (!stmts) continue;
      if (used + stmts.length > maxChanges) continue;
      const prog = [...G.stmts, ...stmts];
      const exec = checkPrefix(G, prog, G.stmts.length);
      if (!exec) continue;
      if (!showsFamily(fam, prog, G.stmts.length, exec)) continue;
      // statements must type-check as valid Java
      try { typeCheck(prog); } catch { continue; }
      G.stmts = prog;
      used += stmts.length;
      changes += fam === 'COPY_INDEPENDENCE' ? 1 : stmts.length; // the trap follow-up is not counted as a meaningful change
      for (const s of (fam === 'COPY_INDEPENDENCE' ? [...stmts].reverse() : stmts)) { const d = defOf(s); G.recent = [d, ...G.recent.filter((n) => n !== d)]; }
      seq.push(fam);
      accepted = true;
    }
    if (!accepted) {
      if (core.includes(fam) && !seq.includes(fam)) return null; // objective family could not be realised
    }
  }
  return changes >= Math.min(target, 1) ? seq : null;
}

// char programs have no arithmetic, so state evolves through copy chains: x = head; head = x,
// with optional "source reset" statements that test whether copies stay independent.
function charChainPlan(G, spec, maxChanges) {
  const { rng, difficulty, objective } = spec;
  const wantsIndep = objective.includes('COPY_INDEPENDENCE') || (difficulty === 'advanced' && rng.chance(0.8));
  const names = G.vars.map((v) => v.name);
  let head = rng.pick(names);
  const defined = new Set(), readSince = new Set();
  let used = 0, changes = 0, trap = false;
  const seq = [];
  let guard = 0;
  while (changes < spec.nChanges && guard++ < 12) {
    const e0 = execute(G.stmts, { maxInt: 100 });
    if (!e0.ok) return null;
    const vals = e0.final;
    const cands = names.filter((n) => n !== head && vals[n] !== vals[head] && (!defined.has(n) || readSince.has(n)));
    if (!cands.length) break;
    const x = rng.weighted(cands, (n) => (defined.has(n) ? 1 : 2.5));
    const stmts = [assign(x, 'char', vr(head, 'char'))];
    const src = head;
    if (wantsIndep && !trap && difficulty !== 'beginner' && changes < spec.nChanges - 1 && used + 2 <= maxChanges && rng.chance(0.75)) {
      const taken = G.vars.map((v) => vals[v.name]);
      stmts.push(assign(src, 'char', charLit(G, taken)));
      trap = true;
    }
    if (used + stmts.length > maxChanges) break;
    const prog = [...G.stmts, ...stmts];
    if (!checkPrefix(G, prog, G.stmts.length)) continue;
    G.stmts = prog;
    used += stmts.length; changes++;
    readSince.add(src); readSince.delete(x); defined.add(x);
    if (stmts.length > 1) { defined.add(src); readSince.delete(src); }
    head = x;
    G.recent = [x, ...(stmts.length > 1 ? [src] : []), ...G.recent.filter((n) => n !== x && n !== src)];
    seq.push(stmts.length > 1 ? 'COPY_INDEPENDENCE' : 'ASSIGN_COPY');
  }
  return changes >= 1 ? seq : null;
}

function answerOf(exec, program, target) {
  if (target.format === 'output') return { text: exec.outputs[exec.outputs.length - 1], type: program[target.index].expr.t };
  const t = exec.types[target.varName];
  const raw = target.format === 'final' ? exec.final[target.varName] : exec.steps[target.index].after[target.varName];
  return { text: formatValue(raw, t), type: t };
}

function evaluateTarget(G, spec, program, target) {
  const exec = execute(program, { trace: true, maxInt: INT_CAP[G.difficulty] });
  if (!exec.ok) return null;
  if (hasTrivialSelfOp(program)) return null;
  for (let i = 0; i < program.length; i++) for (const nm of Object.keys(exec.steps[i].after)) {
    const v = exec.steps[i].after[nm], t = exec.types[nm];
    if (t === 'double' && !tidyDouble(v)) return null;
  }
  const answer = answerOf(exec, program, target);
  if (!answer.text || answer.text.length > MAX_STR) return null;
  const analysis = analyze(program, target, { exec });
  const v = validateDifficulty(analysis, spec.difficulty, { format: target.format, type: spec.type });
  if (!v.ok) { if (spec.debug) spec.debug.push(renderProgram(program).join(' | ') + '  => ' + v.failures.join('; ')); return null; }
  for (const f of spec.objective) if (!analysis.families.includes(f)) return null;
  if (spec.difficulty !== 'advanced' && analysis.coreFamilies.length > 0) { /* ok */ }
  return { program, target, exec, answer, analysis, objective: spec.objective };
}

export function buildCandidate(rng, spec) {
  const { difficulty, type, format } = spec;
  spec = { ...spec, rng };
  const G = { rng, difficulty, type, vars: [], stmts: [], recent: [], allowNegative: rng.chance(0.5) };
  const types = planVars(G, spec);
  if (!types) return null;
  const vars = pickNames(G, types);
  addDeclarations(G, vars, spec);
  const R = RULES[difficulty];
  const wantsPvs = spec.objective.includes('PRINT_VS_STORED');
  const tail = (format === 'output' || format === 'checkpoint') ? 1 : (wantsPvs ? 1 : 0);
  const base = { beginner: [1, 2], intermediate: [2, 4], advanced: [3, 5] }[difficulty];
  const stmtMax = R.statements[1] + (type === 'char' && difficulty === 'advanced' ? 1 : 0);
  const maxChanges = stmtMax - G.stmts.length - tail;
  spec.nChanges = Math.min(rng.int(base[0], base[1]), maxChanges);
  if (spec.nChanges < base[0]) return null;
  const seq = (type === 'char' && difficulty !== 'beginner') ? charChainPlan(G, spec, maxChanges) : addChangeStatements(G, spec, maxChanges);
  if (!seq) return null;
  // a trailing literal reassignment would wipe out all earlier state: drop it
  while (difficulty !== 'beginner' && G.stmts.length > 1 && G.stmts[G.stmts.length - 1].k === 'assign' && G.stmts[G.stmts.length - 1].expr.k === 'lit') G.stmts.pop();
  const lastChangeIdx = G.stmts.length - 1;

  const finish = (program, target) => evaluateTarget(G, spec, program, target);

  if (format === 'output') {
    for (let k = 0; k < 6; k++) {
      const e = printExprFor(G);
      if (!e) continue;
      const program = [...G.stmts, print(e)];
      try { typeCheck(program); } catch { continue; }
      const r = finish(program, { format: 'output', index: program.length - 1 });
      if (r) return r;
    }
    return null;
  }
  if (format === 'final') {
    let program = G.stmts;
    if (wantsPvs) {
      const pos = rng.int(Math.max(1, program.findIndex((s) => s.k !== 'decl')) + 1, program.length);
      const ps = printOnlyStatement(G);
      program = [...program.slice(0, pos), ps, ...program.slice(pos)];
      try { typeCheck(program); } catch { return null; }
      if (!execute(program, { maxInt: INT_CAP[difficulty] }).ok) return null;
    }
    const names = [...new Set([...G.recent, ...G.vars.map((v) => v.name)])].filter((n) => G.vars.find((v) => v.name === n).type === type);
    for (const n of names.slice(0, 4)) {
      const r = finish(program, { format: 'final', varName: n });
      if (r) return r;
    }
    return null;
  }
  // checkpoint
  const pe = printExprFor(G);
  const program = [...G.stmts, print(pe)];
  try { typeCheck(program); } catch { return null; }
  const cands = [];
  program.forEach((s, i) => { if (['assign', 'compound', 'incdec'].includes(s.k)) cands.push(i); });
  // later checkpoints give longer slices; keep some randomness in the choice
  const order = rng.chance(0.4) ? rng.shuffle(cands) : [...cands].sort((a, b) => b - a);
  for (const c of order.slice(0, 5)) {
    const r = finish(program, { format: 'checkpoint', index: c, varName: program[c].name });
    if (r) return r;
  }
  return null;
}
export { FAMILY_IDS, BASELINE_FAMILIES };
