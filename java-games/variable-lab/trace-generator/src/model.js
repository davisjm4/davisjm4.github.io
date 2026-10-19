// Typed Java expression / statement model (the single internal representation).
// Everything else (source code, execution, traces, metrics, distractors,
// explanations) is derived from these nodes.

export const T = Object.freeze({ INT: 'int', DOUBLE: 'double', BOOLEAN: 'boolean', CHAR: 'char', STRING: 'String' });

export const ARITH = ['+', '-', '*', '/', '%'];
export const RELATIONAL = ['<', '>', '<=', '>='];
export const EQUALITY = ['==', '!='];
export const LOGICAL = ['&&', '||'];

export const PREC = Object.freeze({
  '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4,
  '+': 5, '-': 5, '*': 6, '/': 6, '%': 6,
});

export const isNumeric = (t) => t === 'int' || t === 'double';

// ---- expression constructors -------------------------------------------------
export const lit = (t, v) => ({ k: 'lit', t, v });
export const vr = (name, t) => ({ k: 'var', name, t });
export function binType(op, l, r) {
  if (op === '+' && (l.t === 'String' || r.t === 'String')) return 'String';
  if (ARITH.includes(op)) return (l.t === 'double' || r.t === 'double') ? 'double' : 'int';
  return 'boolean';
}
export const bin = (op, l, r, opts = {}) => ({ k: 'bin', op, l, r, t: binType(op, l, r), paren: !!opts.paren });
export const not = (e) => ({ k: 'not', e, t: 'boolean' });
export const paren = (e) => (e.k === 'bin' ? { ...e, paren: true } : e);

// ---- statement constructors --------------------------------------------------
export const decl = (t, name, init) => ({ k: 'decl', t, name, expr: init });
export const assign = (name, t, expr) => ({ k: 'assign', name, t, expr });
export const compound = (name, t, op, expr) => ({ k: 'compound', name, t, op, expr });
export const incdec = (name, op) => ({ k: 'incdec', name, t: 'int', op });
export const print = (expr) => ({ k: 'print', expr });

// ---- rendering ---------------------------------------------------------------
export function needsParens(parentOp, child, side) {
  if (child.k !== 'bin') return false;
  const pp = PREC[parentOp], cp = PREC[child.op];
  if (cp < pp) return true;
  if (cp === pp && side === 'r') return true;
  return false;
}
export function hasParens(parentOp, child, side) {
  return child.k === 'bin' && (child.paren || needsParens(parentOp, child, side));
}

export function renderLiteral(n) {
  switch (n.t) {
    case 'int': return String(n.v);
    case 'double': return Number.isInteger(n.v) ? n.v.toFixed(1) : String(n.v);
    case 'boolean': return n.v ? 'true' : 'false';
    case 'char': return `'${n.v}'`;
    case 'String': return `"${n.v}"`;
    default: throw new Error('bad literal type ' + n.t);
  }
}

// opts.leaf(node) lets callers substitute variable leaves (used for traces).
export function renderExpr(n, opts = {}, top = true) {
  switch (n.k) {
    case 'lit': {
      const s = opts.lit ? opts.lit(n) : renderLiteral(n);
      return (!top && (n.t === 'int' || n.t === 'double') && n.v < 0) ? `(${s})` : s;
    }
    case 'var': {
      const s = opts.leaf ? opts.leaf(n) : n.name;
      return (!top && opts.leaf && /^-/.test(s)) ? `(${s})` : s;
    }
    case 'not': {
      const inner = renderExpr(n.e, opts, false);
      return '!' + (n.e.k === 'bin' ? `(${renderExpr(n.e, opts, true)})` : inner);
    }
    case 'bin': {
      const wrap = (c, side) => {
        const s = renderExpr(c, opts, false);
        return hasParens(n.op, c, side) ? `(${renderExpr(c, opts, true)})` : s;
      };
      return `${wrap(n.l, 'l')} ${n.op} ${wrap(n.r, 'r')}`;
    }
    default: throw new Error('bad expr ' + n.k);
  }
}

export function renderStmt(s) {
  switch (s.k) {
    case 'decl': return `${s.t} ${s.name} = ${renderExpr(s.expr)};`;
    case 'assign': return `${s.name} = ${renderExpr(s.expr)};`;
    case 'compound': return `${s.name} ${s.op}= ${renderExpr(s.expr)};`;
    case 'incdec': return `${s.name}${s.op};`;
    case 'print': return `System.out.println(${renderExpr(s.expr)});`;
    default: throw new Error('bad stmt ' + s.k);
  }
}
export const renderProgram = (stmts) => stmts.map(renderStmt);

// ---- structural helpers ------------------------------------------------------
export function varsIn(e, out = []) {
  if (!e) return out;
  if (e.k === 'var') out.push(e.name);
  else if (e.k === 'not') varsIn(e.e, out);
  else if (e.k === 'bin') { varsIn(e.l, out); varsIn(e.r, out); }
  return out;
}
export const defOf = (s) => (['decl', 'assign', 'compound', 'incdec'].includes(s.k) ? s.name : null);
export function usesOf(s) {
  if (s.k === 'incdec') return [s.name];
  const u = varsIn(s.expr, []);
  if (s.k === 'compound') u.unshift(s.name);
  return u;
}
export function mapExpr(e, fn) { // bottom-up rebuild
  if (e.k === 'bin') return fn({ ...e, l: mapExpr(e.l, fn), r: mapExpr(e.r, fn) });
  if (e.k === 'not') return fn({ ...e, e: mapExpr(e.e, fn) });
  return fn({ ...e });
}
export function walkExpr(e, fn) {
  fn(e);
  if (e.k === 'bin') { walkExpr(e.l, fn); walkExpr(e.r, fn); }
  else if (e.k === 'not') walkExpr(e.e, fn);
}
export function exprDepth(e) {
  if (e.k === 'bin') return 1 + Math.max(exprDepth(e.l), exprDepth(e.r));
  if (e.k === 'not') return 1 + exprDepth(e.e);
  return 0;
}
export const cloneProgram = (p) => JSON.parse(JSON.stringify(p));
