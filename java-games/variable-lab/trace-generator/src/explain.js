// Instructional trace. Every sentence is built from the interpreter's recorded execution
// events (values, evaluation order, notes) — never from an independent text template of the program.

import { renderStmt, renderExpr } from './model.js';
import { displayValue, formatValue } from './interp.js';

const bt = (s) => '`' + s + '`';

function opSteps(step) {
  return step.ops.map((o) => `${o.reduced} = ${o.resultDisplay}`);
}
function opNotes(step) {
  const seen = new Set(), out = [];
  for (const o of step.ops) for (const n of o.notes || []) if (!seen.has(n.text)) { seen.add(n.text); out.push(n.text); }
  for (const n of step.notes || []) if (!seen.has(n.text)) { seen.add(n.text); out.push(n.text); }
  return out;
}

export function buildStateHistory(program, exec) {
  const variables = exec.order.map((name) => ({ name, type: exec.types[name] }));
  const rows = exec.steps.map((st) => {
    const values = {}, raw = {};
    const known = exec.order.filter((n) => n in st.after);
    for (const nm of known) { values[nm] = displayValue(st.after[nm], exec.types[nm]); raw[nm] = formatValue(st.after[nm], exec.types[nm]); }
    return { line: st.i + 1, code: renderStmt(st.stmt), values, raw, changed: st.changed.slice(), printed: st.output ?? null };
  });
  return { variables, rows };
}

export function buildExplanation(program, exec, target) {
  const lines = exec.steps.map((st) => {
    const s = st.stmt;
    const code = renderStmt(s);
    const t = exec.types[s.name];
    const changes = st.changed.map((nm) => ({
      name: nm,
      before: nm in st.before ? displayValue(st.before[nm], exec.types[nm]) : null,
      after: displayValue(st.after[nm], exec.types[nm]),
    }));
    const steps = opSteps(st);
    const notes = opNotes(st);
    let text;
    const ex = s.expr;
    switch (s.k) {
      case 'decl':
        if (ex.k === 'lit') text = `${bt(s.name)} starts at ${displayValue(st.after[s.name], t)}.`;
        else if (ex.k === 'var') text = `${bt(s.name)} starts as a copy of ${bt(ex.name)}, which is ${displayValue(st.after[s.name], t)}.`;
        else text = `${bt(s.name)} starts as the value of ${bt(renderExpr(ex))}: ${steps.join(', then ')}. So ${bt(s.name)} starts at ${displayValue(st.after[s.name], t)}.`;
        break;
      case 'assign': {
        const nv = displayValue(st.after[s.name], t);
        const old = displayValue(st.before[s.name], t);
        if (ex.k === 'var') text = `${code.replace(/;$/, '')} copies ${nv} into ${bt(s.name)} (it was ${old}). ${bt(ex.name)} keeps its own value; only the value was copied.`;
        else if (ex.k === 'lit') text = `${bt(code.replace(/;$/, ''))} replaces the old value ${old} with ${nv}.`;
        else text = `${bt(code.replace(/;$/, ''))}: the right side is computed first using the current values — ${steps.join(', then ')}. ${bt(s.name)} becomes ${nv} (it was ${old}).`;
        break;
      }
      case 'compound': {
        const c = st.compound;
        const op = s.op;
        const lhsOld = displayValue(c.before, t);
        const rhsTxt = ex.k === 'lit' || ex.k === 'var' ? displayValue(c.rhs, ex.t) : null;
        // compound assignment combines the old value with the evaluated right side via applyOp,
        // so every recorded op belongs to the right-hand side.
        const rhsSteps = steps;
        text = `${bt(code.replace(/;$/, ''))} means ${bt(`${s.name} = ${s.name} ${op} (${renderExpr(ex)})`)}. `
          + (rhsSteps.length ? `The right side first: ${rhsSteps.join(', then ')}. ` : '')
          + `Then ${lhsOld} ${op} ${rhsTxt ?? displayValue(c.rhs, ex.t)} = ${displayValue(c.result, t)}, so ${bt(s.name)} becomes ${displayValue(c.result, t)}.`;
        break;
      }
      case 'incdec': {
        text = `${bt(code.replace(/;$/, ''))} ${s.op === '++' ? 'adds' : 'subtracts'} 1: ${bt(s.name)} goes from ${displayValue(st.before[s.name], 'int')} to ${displayValue(st.after[s.name], 'int')}.`;
        break;
      }
      case 'print': {
        if (ex.k === 'var' || ex.k === 'lit') text = `${bt(code.replace(/;$/, ''))} prints ${bt(st.output)}.`;
        else text = `${bt(code.replace(/;$/, ''))}: ${steps.join(', then ')}. It prints ${bt(st.output)}. Printing does not change any variable.`;
        break;
      }
      default: text = code;
    }
    return { line: st.i + 1, code, text, steps, notes, changes, output: st.output ?? null };
  });

  let summary;
  if (target.format === 'output') summary = `The program prints ${bt(exec.outputs[exec.outputs.length - 1])}.`;
  else if (target.format === 'final') summary = `When the program ends, ${bt(target.varName)} is ${bt(formatValue(exec.final[target.varName], exec.types[target.varName]))}.`;
  else summary = `Immediately after line ${target.index + 1}, ${bt(target.varName)} is ${bt(formatValue(exec.steps[target.index].after[target.varName], exec.types[target.varName]))}.`;
  return { lines, summary, stateHistory: buildStateHistory(program, exec) };
}
