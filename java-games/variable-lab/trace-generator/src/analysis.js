// Dependency analysis (backward slicing), reasoning-family detection, difficulty metrics
// and difficulty validation. Difficulty is evaluated on the COMPLETE generated program.

import { defOf, usesOf, varsIn, walkExpr, exprDepth, hasParens, isNumeric, PREC } from './model.js';
import { execute } from './interp.js';

export const FAMILIES = Object.freeze({
  ASSIGN_COPY: 'Copying a value from one variable to another',
  COPY_INDEPENDENCE: 'Primitive copies stay independent after the source changes',
  SEQUENTIAL_UPDATE: 'Later statements use values produced by earlier updates',
  REASSIGN_OVERWRITE: 'Reassignment overwrites the old value',
  OPERATOR_PRECEDENCE: 'Operator precedence changes the result',
  PARENTHESES: 'Parentheses force a different grouping',
  INTEGER_DIVISION: 'Integer division truncates toward zero',
  REMAINDER: 'Remainder (%) operator',
  COMPOUND_ASSIGNMENT: 'Compound assignment (+=, -=, *=, /=, %=)',
  INCREMENT_DECREMENT: 'Increment and decrement (++ / --)',
  MIXED_NUMERIC: 'int and double mixed in one calculation or assignment',
  DOUBLE_ARITHMETIC: 'double arithmetic',
  BOOLEAN_NEGATION: 'Logical negation (!)',
  BOOLEAN_COMBINATION: 'Logical and relational combinations (&&, ||, <, ==, ...)',
  STRING_CONCAT: 'String concatenation',
  STRING_NUMBER_CONCAT: 'Concatenating Strings with numbers, left to right',
  PRINT_VS_STORED: 'Printing an expression does not change a variable',
});
export const FAMILY_IDS = Object.freeze(Object.keys(FAMILIES));
// Baseline tracing skills present in almost every program; they do not count as
// an "interacting reasoning concept" when validating difficulty.
export const BASELINE_FAMILIES = Object.freeze(['SEQUENTIAL_UPDATE', 'REASSIGN_OVERWRITE']);

export const RULES = Object.freeze({
  beginner:     { statements: [2, 4], declared: [1, 1], changes: [1, 2], core: [0, 1], depthMin: 2, edgesMin: 1, irrelevantMax: 0, sliceVarsMin: 1 },
  intermediate: { statements: [4, 7], declared: [1, 2], changes: [2, 4], core: [1, 3], depthMin: 3, edgesMin: 2, irrelevantMax: 1, sliceVarsMin: 1 },
  advanced:     { statements: [5, 8], declared: [2, 4], changes: [3, 6], core: [2, 5], depthMin: 4, edgesMin: 3, irrelevantMax: 1, sliceVarsMin: 2 },
});

// target: { format: 'output'|'final'|'checkpoint', index, varName? }
export function sliceFor(program, target) {
  const relevant = new Set();
  let needed, start;
  if (target.format === 'output') { needed = new Set(varsIn(program[target.index].expr)); start = target.index - 1; }
  else if (target.format === 'final') { needed = new Set([target.varName]); start = program.length - 1; }
  else { needed = new Set([target.varName]); start = target.index; }
  for (let i = start; i >= 0; i--) {
    const d = defOf(program[i]);
    if (d && needed.has(d)) {
      relevant.add(i);
      needed.delete(d);
      for (const u of usesOf(program[i])) needed.add(u);
    }
  }
  // Reaching-definition edges among relevant statements (+ sink)
  const nodes = [...relevant].sort((a, b) => a - b);
  const sink = target.format === 'output' ? target.index : null;
  const edges = [];
  const reach = (name, before) => { for (let j = before - 1; j >= 0; j--) if (defOf(program[j]) === name) return j; return -1; };
  for (const i of [...nodes, ...(sink !== null ? [sink] : [])]) {
    for (const u of new Set(usesOf(program[i]))) {
      const j = reach(u, i);
      if (j >= 0) edges.push([j, i, u]);
    }
  }
  const depth = new Map();
  for (const i of [...nodes, ...(sink !== null ? [sink] : [])]) {
    let d = 1;
    for (const [j, k] of edges) if (k === i) d = Math.max(d, 1 + (depth.get(j) || 1));
    depth.set(i, d);
  }
  const sinkNode = sink !== null ? sink : (nodes.length ? nodes[nodes.length - 1] : -1);
  const dependencyDepth = sinkNode >= 0 ? depth.get(sinkNode) || 1 : 0;
  // for final/checkpoint the target var's last def is the deepest sink among the slice
  const maxDepth = Math.max(0, ...[...depth.values()]);
  return { relevant, nodes, edges, depth, dependencyDepth: Math.max(dependencyDepth, maxDepth), sink };
}

export function analyze(program, target, opts = {}) {
  const slice = sliceFor(program, target);
  const rel = slice.nodes;
  const sinkIdx = slice.sink;
  const exec = opts.exec || execute(program, { trace: true });
  const ltr = execute(program, { precedence: 'ltr' });
  const idxs = sinkIdx !== null ? [...rel, sinkIdx] : rel;

  const fam = new Set();
  const exprsOf = (i) => (program[i].expr ? [program[i].expr] : []);
  const isCopy = (s) => (s.k === 'assign' || s.k === 'decl') && s.expr.k === 'var';
  let maxDepthExpr = 0, opCount = 0;

  for (const i of idxs) {
    const s = program[i];
    if (s.k === 'compound') fam.add('COMPOUND_ASSIGNMENT');
    if (s.k === 'incdec') fam.add('INCREMENT_DECREMENT');
    if (isCopy(s)) fam.add('ASSIGN_COPY');
    if (s.k === 'compound' && s.t === 'String') fam.add('STRING_CONCAT');
    if (s.k === 'compound' && s.t === 'String' && isNumeric(s.expr.t)) fam.add('STRING_NUMBER_CONCAT');
    if ((s.k === 'decl' || s.k === 'assign') && s.t === 'double' && s.expr.t === 'int' && s.expr.k !== 'lit') fam.add('MIXED_NUMERIC');
    for (const e of exprsOf(i)) {
      maxDepthExpr = Math.max(maxDepthExpr, exprDepth(e));
      walkExpr(e, (n) => {
        if (n.k === 'not') fam.add('BOOLEAN_NEGATION');
        if (n.k !== 'bin') return;
        opCount++;
        if (['&&', '||', '<', '>', '<=', '>=', '==', '!='].includes(n.op)) fam.add('BOOLEAN_COMBINATION');
        if (n.t === 'double') fam.add('DOUBLE_ARITHMETIC');
        if (n.op === '%' && n.t === 'int') fam.add('REMAINDER');
        if (n.op === '+' && n.t === 'String') {
          fam.add('STRING_CONCAT');
          if ([n.l, n.r].some((c) => isNumeric(c.t))) fam.add('STRING_NUMBER_CONCAT');
        }
        if (['+', '-', '*', '/', '%'].includes(n.op) && n.t === 'double' && n.l.t !== n.r.t && isNumeric(n.l.t) && isNumeric(n.r.t)) fam.add('MIXED_NUMERIC');
        for (const [c, side] of [[n.l, 'l'], [n.r, 'r']]) {
          if (c.k === 'bin' && ['+', '-', '*', '/', '%'].includes(n.op) && ['+', '-', '*', '/', '%'].includes(c.op)
              && hasParens(n.op, c, side) && PREC[c.op] < PREC[n.op]) fam.add('PARENTHESES');
        }
      });
    }
  }
  // execution-derived families (observable effects)
  if (exec.ok) {
    for (const i of idxs) {
      for (const op of exec.steps[i].ops) for (const nt of op.notes || []) {
        if (nt.id === 'int-division') fam.add('INTEGER_DIVISION');
      }
    }
  }
  // precedence only counts when it is observable: left-to-right evaluation gives a different outcome
  const structural = idxs.some((i) => exec.ok && exec.steps[i].ops.some((op) => (op.notes || []).some((n) => n.id === 'precedence') && ['+', '-', '*', '/', '%'].includes(op.op)));
  if (structural && ltr.ok && exec.ok) {
    const differs = idxs.some((i) => JSON.stringify(ltr.steps[i].after) !== JSON.stringify(exec.steps[i].after)
      || (ltr.steps[i].output !== exec.steps[i].output));
    if (differs) fam.add('OPERATOR_PRECEDENCE');
  }
  // sequential update / overwrite
  for (const i of rel) {
    const s = program[i];
    if (s.k === 'decl') continue;
    for (const [j, k] of slice.edges) if (k === i && program[j].k !== 'decl') fam.add('SEQUENTIAL_UPDATE');
    if (s.k === 'assign' && !varsIn(s.expr).includes(s.name)) {
      let earlier = false;
      for (let j = 0; j < i; j++) if (defOf(program[j]) === s.name) earlier = true;
      if (earlier) fam.add('REASSIGN_OVERWRITE');
    }
  }
  const traps = new Set(); // deliberate trap statements (do not feed the answer, but test a named misconception)
  // copy independence: x = y ... y changes ... x read afterwards through that copy
  for (const i of rel) {
    const s = program[i];
    if (!isCopy(s)) continue;
    const y = s.expr.name;
    for (const [j, k] of slice.edges) {
      if (j !== i) continue;
      for (let t = i + 1; t < k; t++) if (defOf(program[t]) === y) { fam.add('COPY_INDEPENDENCE'); if (!slice.relevant.has(t)) traps.add(t); }
    }
  }
  // printing without storing
  const pinfo = [];
  program.forEach((s, i) => { if (s.k === 'print' && !(target.format === 'output' && i === target.index)) pinfo.push(i); });
  for (const i of pinfo) {
    const used = varsIn(program[i].expr);
    const sliceNames = new Set(rel.map((r) => defOf(program[r])));
    if (used.some((u) => sliceNames.has(u)) && (target.format !== 'checkpoint' || i < target.index + 0)) fam.add('PRINT_VS_STORED');
  }

  const sinkEnd = target.format === 'output' ? target.index - 1 : target.format === 'final' ? program.length - 1 : target.index;
  let irrelevant = 0, overwrittenInit = 0;
  for (let i = 0; i <= sinkEnd; i++) {
    if (slice.relevant.has(i)) continue;
    if (program[i].k === 'print' && fam.has('PRINT_VS_STORED')) { traps.add(i); continue; } // deliberate trap statement
    if (traps.has(i)) continue;
    if (program[i].k === 'decl' && program.some((q, j) => j > i && q.k === 'assign' && q.name === program[i].name && !varsIn(q.expr).includes(q.name))) { overwrittenInit++; continue; }
    irrelevant++;
  }
  const changes = rel.filter((i) => program[i].k !== 'decl').length;
  const sliceVars = new Set(rel.map((i) => defOf(program[i])));
  const declared = program.filter((s) => s.k === 'decl').length;
  const families = [...fam].sort();
  const core = families.filter((f) => !BASELINE_FAMILIES.includes(f));
  return {
    totalStatements: program.length,
    declaredVariables: declared,
    relevantStatements: rel.length,
    relevantChanges: changes,
    irrelevantStatements: irrelevant,
    overwrittenInitializers: overwrittenInit,
    trapStatements: traps.size,
    trapLines: [...traps].sort((a, b) => a - b).map((i) => i + 1),
    postCheckpointStatements: target.format === 'checkpoint' ? program.length - 1 - target.index : 0,
    variablesInSlice: sliceVars.size,
    dependencyDepth: slice.dependencyDepth,
    dependencyEdges: slice.edges.length,
    maxExpressionDepth: maxDepthExpr,
    operatorCount: opCount,
    families,
    coreFamilies: core,
    relevantLines: idxs.map((i) => i + 1),
    edges: slice.edges.map(([a, b, v]) => ({ from: a + 1, to: b + 1, via: v })),
  };
}

const inRange = (v, [lo, hi]) => v >= lo && v <= hi;

export function validateDifficulty(metrics, difficulty, ctx = {}) {
  let R = RULES[difficulty];
  // Beginner char programs: copying needs two variables and a lone reassignment makes the
  // initial declaration irrelevant, so one overwritten declaration is tolerated (documented).
  if (difficulty === 'beginner' && ctx.type === 'char') R = { ...R, declared: [1, 2], irrelevantMax: 1 };
  if (difficulty === 'intermediate' && ctx.type === 'char') R = { ...R, declared: [1, 3] };
  const f = [];
  if (!R) return { ok: false, failures: ['unknown difficulty'] };
  // char programs have no arithmetic, so their state is built from copy chains; advanced char gets one extra statement
  const stmtLimit = (difficulty === 'advanced' && ctx.type === 'char') ? [R.statements[0], R.statements[1] + 1] : R.statements;
  if (!inRange(metrics.totalStatements, stmtLimit)) f.push(`statements ${metrics.totalStatements} outside ${stmtLimit}`);
  if (!inRange(metrics.declaredVariables, R.declared)) f.push(`declared variables ${metrics.declaredVariables} outside ${R.declared}`);
  if (!inRange(metrics.relevantChanges, R.changes)) f.push(`relevant changes ${metrics.relevantChanges} outside ${R.changes}`);
  if (!inRange(metrics.coreFamilies.length, R.core)) f.push(`core reasoning families ${metrics.coreFamilies.length} outside ${R.core}`);
  if (metrics.dependencyDepth < R.depthMin) f.push(`dependency depth ${metrics.dependencyDepth} < ${R.depthMin}`);
  if (metrics.dependencyEdges < R.edgesMin) f.push(`dependency edges ${metrics.dependencyEdges} < ${R.edgesMin}`);
  if (metrics.trapStatements > 2) f.push(`trap statements ${metrics.trapStatements} > 2`);
  if (metrics.irrelevantStatements > R.irrelevantMax) f.push(`irrelevant statements ${metrics.irrelevantStatements} > ${R.irrelevantMax}`);
  if (metrics.variablesInSlice < R.sliceVarsMin) f.push(`variables in slice ${metrics.variablesInSlice} < ${R.sliceVarsMin}`);
  return { ok: f.length === 0, failures: f };
}
