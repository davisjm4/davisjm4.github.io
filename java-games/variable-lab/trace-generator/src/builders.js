// Compositional statement / expression builders. Each builder composes typed model
// nodes from reusable rules (leaves, operators, precedence parsing, grouping).
// Nothing here is a finished program: programs emerge from random composition.

import { lit, vr, bin, not, paren, assign, compound, incdec, print, PREC } from './model.js';

export const NAME_THEMES = {
  int: [
    ['a', 'b', 'c', 'd'], ['x', 'y', 'z', 'w'], ['m', 'n', 'p', 'q'], ['i', 'j', 'k', 'r'],
    ['score', 'bonus', 'lives', 'level', 'coins'], ['apples', 'pears', 'boxes', 'crates'],
    ['goals', 'shots', 'points', 'fouls'], ['quiz', 'homework', 'extra', 'total'],
    ['miles', 'hours', 'stops', 'laps'], ['wallet', 'cost', 'tips', 'savings'],
    ['width', 'height', 'area', 'size'], ['health', 'armor', 'damage', 'shield'],
    ['items', 'bags', 'slots', 'packs'], ['speed', 'time', 'steps', 'turns'],
  ],
  double: [
    ['price', 'tax', 'total', 'tip'], ['width', 'height', 'area', 'scale'], ['avg', 'rate', 'sum', 'bonus'],
    ['temp', 'change', 'offset', 'base'], ['p', 'q', 'r', 's'], ['gpa', 'extra', 'weight', 'credit'],
    ['balance', 'fee', 'interest', 'refund'], ['distance', 'speed', 'delta', 'fuel'],
  ],
  boolean: [
    ['isOn', 'ready', 'done', 'hasKey', 'passed', 'active', 'open', 'valid', 'late', 'win', 'full', 'paused'],
  ],
  char: [
    ['first', 'second', 'third', 'fourth'], ['c1', 'c2', 'c3', 'c4'], ['grade', 'letter', 'initial', 'mark'],
    ['left', 'middle', 'right', 'extra'], ['symbol', 'key', 'tag', 'code'],
  ],
  String: [
    ['first', 'second', 'third', 'fourth'], ['word', 'name', 'msg', 'text'], ['prefix', 'suffix', 'title', 'tag'],
    ['left', 'right', 'center', 'side'], ['s1', 's2', 's3', 's4'], ['pet', 'color', 'food', 'game'],
  ],
};
const WORDS = ['sun', 'rise', 'moon', 'star', 'cat', 'dog', 'red', 'blue', 'ice', 'pop', 'hi', 'go', 'up', 'sky', 'tree', 'run', 'jam', 'pen', 'bug', 'map', 'art', 'fun', 'top', 'net', 'sea', 'ant', 'owl', 'zip'];
const SEPS = ['-', '+', ':', '!', '/', '.', '#', '*'];
const LETTERS = 'abcdefghjkmnpqrstuvwxyz';

export const CORE_POOLS = {
  int: ['COMPOUND_ASSIGNMENT', 'INCREMENT_DECREMENT', 'OPERATOR_PRECEDENCE', 'PARENTHESES', 'INTEGER_DIVISION', 'REMAINDER', 'ASSIGN_COPY', 'COPY_INDEPENDENCE'],
  double: ['DOUBLE_ARITHMETIC', 'MIXED_NUMERIC', 'COMPOUND_ASSIGNMENT', 'OPERATOR_PRECEDENCE', 'PARENTHESES', 'ASSIGN_COPY', 'INTEGER_DIVISION'],
  boolean: ['BOOLEAN_NEGATION', 'BOOLEAN_COMBINATION', 'ASSIGN_COPY', 'COPY_INDEPENDENCE', 'REMAINDER'],
  char: ['ASSIGN_COPY', 'COPY_INDEPENDENCE'],
  String: ['STRING_CONCAT', 'ASSIGN_COPY', 'COPY_INDEPENDENCE', 'STRING_NUMBER_CONCAT', 'COMPOUND_ASSIGNMENT'],
};

const varsOf = (G, t) => G.vars.filter((v) => v.type === t);
const R = (G) => G.rng;

export function pickNames(G, specs) { // specs: array of types; returns vars with unique names
  const rng = R(G);
  const taken = new Set();
  const themeFor = {};
  const vars = [];
  for (const t of specs) {
    if (!themeFor[t]) themeFor[t] = rng.shuffle(rng.pick(NAME_THEMES[t]));
    const name = themeFor[t].find((n) => !taken.has(n)) || (themeFor[t][0] + (taken.size + 1));
    taken.add(name);
    vars.push({ name, type: t });
  }
  return vars;
}

// ---- literals ---------------------------------------------------------------
export function intLit(G, lo, hi) { return lit('int', R(G).int(lo, hi)); }
export function dblLit(G, lo = 1, hi = 9) {
  const rng = R(G);
  const whole = rng.int(lo, hi);
  const frac = rng.pick([0, 0.5, 0.5, 0.25]);
  return lit('double', whole + (G.difficulty === 'beginner' && frac === 0.25 ? 0.5 : frac));
}
export const charLit = (G, avoid = []) => {
  const opts = [...LETTERS].filter((c) => !avoid.includes(c));
  return lit('char', R(G).pick(opts));
};
export const wordLit = (G, avoid = []) => lit('String', R(G).pick(WORDS.filter((w) => !avoid.includes(w))));
export const sepLit = (G) => lit('String', R(G).pick(SEPS));

function initRange(G) {
  return G.difficulty === 'beginner' ? [1, 20] : G.difficulty === 'intermediate' ? [3, 30] : [2, 40];
}
export function initLiteral(G, type, taken = []) {
  const rng = R(G);
  switch (type) {
    case 'int': {
      const [lo, hi] = initRange(G);
      if (G.difficulty === 'advanced' && G.allowNegative && rng.chance(0.3)) return lit('int', -rng.int(2, 15));
      return intLit(G, lo, hi);
    }
    case 'double': return dblLit(G, 1, G.difficulty === 'beginner' ? 9 : 14);
    case 'boolean': return lit('boolean', rng.chance(0.5));
    case 'char': return charLit(G, taken);
    case 'String': return wordLit(G, taken);
  }
}

// ---- leaves -----------------------------------------------------------------
function pickVar(G, type, exclude = []) {
  const rng = R(G);
  const pool = varsOf(G, type).filter((v) => !exclude.includes(v.name));
  if (!pool.length) return null;
  const v = rng.weighted(pool, (x) => (G.recent.indexOf(x.name) === 0 ? 3 : G.recent.includes(x.name) ? 2 : 1));
  return vr(v.name, v.type);
}
export function intLeaf(G, { exclude = [], pVar = 0.65, lo = 1, hi = 9 } = {}) {
  const v = R(G).chance(pVar) ? pickVar(G, 'int', exclude) : null;
  return v || intLit(G, lo, hi);
}
function operandLit(G, op, type = 'int') {
  const rng = R(G);
  if (type === 'double') {
    if (op === '/') return lit('double', rng.pick([2, 4, 2, 5]));
    return dblLit(G, 1, 6);
  }
  if (op === '/' || op === '%') return intLit(G, 2, 7);
  if (op === '*') return intLit(G, 2, 5);
  return intLit(G, 1, 9);
}

// precedence parse of an operand/operator token list (left associative)
export function parseChain(operands, ops) {
  const out = [operands[0]], st = [];
  const reduce = () => { const op = st.pop(); const r = out.pop(); const l = out.pop(); out.push(bin(op, l, r)); };
  for (let i = 0; i < ops.length; i++) {
    while (st.length && PREC[st[st.length - 1]] >= PREC[ops[i]]) reduce();
    st.push(ops[i]); out.push(operands[i + 1]);
  }
  while (st.length) reduce();
  return out[0];
}

// A random operator chain. mode: 'plain' | 'prec' (needs both precedence levels) | 'low' (only + -)
export function intChain(G, { k = 3, mode = 'prec', must = [] } = {}) {
  const rng = R(G);
  const high = ['*', '*', '/', '%'], low = ['+', '+', '-'];
  for (let tries = 0; tries < 20; tries++) {
    const ops = [];
    for (let i = 0; i < k - 1; i++) ops.push(mode === 'low' ? rng.pick(low) : rng.pick(rng.chance(0.5) ? high : low));
    if (mode === 'prec' && !(ops.some((o) => PREC[o] === 6) && ops.some((o) => PREC[o] === 5))) continue;
    const operands = [];
    for (let i = 0; i < k; i++) {
      const prevOp = i > 0 ? ops[i - 1] : null;
      operands.push((prevOp === '/' || prevOp === '%') && rng.chance(0.8) ? operandLit(G, prevOp) : intLeaf(G, { pVar: 0.6 }));
    }
    // force the "must" vars into leaf positions (preferring non-divisor slots)
    const slots = operands.map((_, i) => i).filter((i) => i === 0 || (ops[i - 1] !== '/' && ops[i - 1] !== '%'));
    const shuffled = rng.shuffle(slots);
    must.forEach((name, idx) => { if (idx < shuffled.length) operands[shuffled[idx]] = vr(name, 'int'); });
    if (!operands.some((o) => o.k === 'var')) continue;
    return parseChain(operands, ops);
  }
  return null;
}
function groupedInt(G, { must = [] } = {}) {
  const rng = R(G);
  const a = must[0] ? vr(must[0], 'int') : intLeaf(G, { pVar: 0.85 });
  const b = must[1] ? vr(must[1], 'int') : intLeaf(G, { pVar: 0.5, lo: 1, hi: 9 });
  const inner = paren(bin(rng.pick(['+', '+', '-']), a, b));
  const outerOp = rng.pick(['*', '*', '/', '%']);
  const other = operandLit(G, outerOp);
  const e = rng.chance(0.65) ? bin(outerOp, inner, other) : bin(rng.pick(['+', '-', '*']), other.k === 'lit' ? intLeaf(G, { pVar: 0.8 }) : other, inner);
  return e;
}
function divExpr(G, must) {
  const rng = R(G);
  const a = must[0] ? vr(must[0], 'int') : intLeaf(G, { pVar: 0.85 });
  switch (rng.int(0, 3)) {
    case 0: return bin('/', a, intLit(G, 2, 7));
    case 1: return bin('/', paren(bin(rng.pick(['+', '-', '*']), a, must[1] ? vr(must[1], 'int') : intLeaf(G, { pVar: 0.5 }))), intLit(G, 2, 6));
    case 2: { const b = pickVar(G, 'int', [a.k === 'var' ? a.name : '']) || intLit(G, 2, 6); return bin('/', a, b); }
    default: return bin(rng.pick(['+', '-']), a.k === 'var' ? intLeaf(G, { pVar: 0.9, exclude: [a.name] }) : a, bin('/', must[1] ? vr(must[1], 'int') : intLeaf(G, { pVar: 0.8 }), intLit(G, 2, 5)));
  }
}
function modExpr(G, must) {
  const rng = R(G);
  const a = must[0] ? vr(must[0], 'int') : intLeaf(G, { pVar: 0.9 });
  switch (rng.int(0, 3)) {
    case 0: return bin('%', a, intLit(G, 2, 7));
    case 1: return bin(rng.pick(['+', '-']), intLeaf(G, { pVar: 0.8, exclude: a.k === 'var' ? [a.name] : [] }), bin('%', a, intLit(G, 2, 7)));
    case 2: return bin('%', paren(bin('*', a, intLit(G, 2, 4))), intLit(G, 3, 9));
    default: { const b = pickVar(G, 'int', [a.k === 'var' ? a.name : '']) || intLit(G, 2, 7); return bin('%', a, b); }
  }
}

// ---- double expressions -----------------------------------------------------
function dblLeaf(G, { mixed = false, exclude = [], pVar = 0.65 } = {}) {
  const rng = R(G);
  if (mixed && rng.chance(0.55)) { const iv = pickVar(G, 'int'); if (iv) return iv; }
  const dv = rng.chance(pVar) ? pickVar(G, 'double', exclude) : null;
  return dv || dblLit(G, 1, 6);
}
function dblChain(G, { k = 2, mixed = false, must = [], precMode = false } = {}) {
  const rng = R(G);
  for (let tries = 0; tries < 20; tries++) {
    const ops = [];
    for (let i = 0; i < k - 1; i++) ops.push(rng.pick(precMode ? (i % 2 ? ['+', '-'] : ['*', '/']) : ['+', '+', '-', '*']));
    if (precMode && !(ops.some((o) => PREC[o] === 6) && ops.some((o) => PREC[o] === 5))) continue;
    const operands = [];
    for (let i = 0; i < k; i++) operands.push(i > 0 && ops[i - 1] === '/' ? operandLit(G, '/', 'double') : dblLeaf(G, { mixed: mixed && i === (tries % k) }));
    must.forEach((name, idx) => { if (idx < k && !(idx > 0 && ops[idx - 1] === '/')) operands[idx] = vr(name, varsOf(G, 'int').some((v) => v.name === name) ? 'int' : 'double'); });
    if (!operands.some((o) => o.k === 'var')) continue;
    if (mixed && !operands.some((o) => o.t === 'int') ) continue;
    if (!mixed && operands.some((o) => o.t === 'int')) continue;
    return parseChain(operands, ops);
  }
  return null;
}

// ---- boolean expressions ----------------------------------------------------
function boolLeaf(G, exclude = []) {
  const rng = R(G);
  const iv = varsOf(G, 'int');
  if (iv.length && rng.chance(0.4)) {
    const a = pickVar(G, 'int');
    switch (rng.int(0, 3)) {
      case 0: return bin(rng.pick(['>', '<', '>=', '<=']), a, intLit(G, 2, 20));
      case 1: return bin('==', bin('%', a, intLit(G, 2, 4)), intLit(G, 0, 1));
      case 2: { const b = pickVar(G, 'int', [a.name]); return b ? bin(rng.pick(['>', '<', '==', '!=']), a, b) : bin('>', a, intLit(G, 2, 20)); }
      default: return bin('!=', a, intLit(G, 1, 15));
    }
  }
  const bv = pickVar(G, 'boolean', exclude);
  return bv || lit('boolean', rng.chance(0.5));
}
function boolExpr(G, { depth = 1, must = [], allowNot = true } = {}) {
  const rng = R(G);
  const leaf = () => {
    const l = boolLeaf(G);
    return allowNot && rng.chance(0.3) ? (l.k === 'bin' ? not(paren(l)) : not(l)) : l;
  };
  let e = must[0] ? vr(must[0], 'boolean') : leaf();
  if (allowNot && must[0] && rng.chance(0.3)) e = not(e);
  for (let i = 0; i < depth; i++) {
    const op = rng.pick(['&&', '||']);
    const r = must[i + 1] ? vr(must[i + 1], 'boolean') : leaf();
    e = bin(op, e, r);
  }
  return e;
}

// ---- String expressions -----------------------------------------------------
function strTok(G, exclude = []) {
  const v = pickVar(G, 'String', exclude);
  return v || wordLit(G);
}
function strChain(G, { k = 3, numbers = false, must = [] } = {}) {
  const rng = R(G);
  const toks = [];
  const iv = numbers ? varsOf(G, 'int') : [];
  for (let i = 0; i < k; i++) {
    if (numbers && iv.length && rng.chance(0.45)) toks.push(pickVar(G, 'int'));
    else if (numbers && rng.chance(0.2)) toks.push(intLit(G, 1, 9));
    else toks.push(rng.chance(0.75) ? strTok(G) : sepLit(G));
  }
  must.forEach((name, idx) => { toks[idx] = vr(name, 'String'); });
  if (!toks.some((t) => t.t === 'String')) toks[rng.int(0, k - 1)] = strTok(G);
  let e = toks[0];
  for (let i = 1; i < toks.length; i++) e = bin('+', e, toks[i]);
  return e;
}

// ---- statement builders (return arrays of statements, or null) --------------
function chooseLhs(G, type, exclude = []) {
  const rng = R(G);
  const pool = varsOf(G, type).filter((v) => !exclude.includes(v.name));
  if (!pool.length) return null;
  const fresh = (name) => G.stmts.filter((st) => st.name === name).length === 1; // only its declaration so far
  return rng.weighted(pool, (v) => (G.difficulty === 'beginner' ? 1 : (G.recent[0] === v.name ? 0.4 : 1.4) * (fresh(v.name) ? 2.5 : 1)));
}
function copySource(G, type, xname) {
  const rng = R(G);
  const r = recentOther(G, xname, type);
  if (r && (G.difficulty !== 'beginner') && rng.chance(0.75)) return r;
  const y = chooseLhs(G, type, [xname]);
  return y ? y.name : null;
}
function copyStmts(G, type, xname) {
  const y = copySource(G, type, xname);
  if (!y) return null;
  const out = [];
  if (G.values && G.values[y] === G.values[xname]) {
    // the copy would be invisible: first change the source so the copy matters
    if (type === 'char') out.push(assign(y, 'char', charLit(G, [G.values[xname]])));
    else if (type === 'boolean') out.push(assign(y, 'boolean', not(vr(y, 'boolean'))));
    else if (type === 'String') out.push(assign(y, 'String', wordLit(G, [G.values[xname]])));
  }
  out.push(assign(xname, type, vr(y, type)));
  return out;
}
const recentOther = (G, name, type) => {
  const c = G.recent.filter((n) => n !== name && varsOf(G, type).some((v) => v.name === n));
  return c.length ? c[0] : null;
};

export function stmtFor(G, family) {
  const rng = R(G);
  const T = G.type;
  const fn = BUILDERS[T];
  if (family === 'SEQUENTIAL_UPDATE' || family === 'REASSIGN_OVERWRITE') return fn.base(G, family, rng);
  return fn.family(G, family, rng) || null;
}

const copyIndep = (G, type, rng) => {
  const x = chooseLhs(G, type);
  if (!x) return null;
  const yName = copySource(G, type, x.name);
  if (!yName) return null;
  const y = { name: yName };
  const first = assign(x.name, type, vr(y.name, type));
  let follow;
  if (type === 'int') follow = rng.chance(0.5) ? compound(y.name, 'int', rng.pick(['+', '-', '*']), intLit(G, 2, 6)) : assign(y.name, 'int', bin(rng.pick(['+', '-']), vr(y.name, 'int'), intLit(G, 1, 9)));
  else if (type === 'double') follow = assign(y.name, 'double', bin(rng.pick(['+', '*']), vr(y.name, 'double'), dblLit(G, 1, 4)));
  else if (type === 'boolean') follow = assign(y.name, 'boolean', not(vr(y.name, 'boolean')));
  else if (type === 'char') follow = assign(y.name, 'char', charLit(G, []));
  else follow = assign(y.name, 'String', bin('+', vr(y.name, 'String'), wordLit(G)));
  return [first, follow];
};

const BUILDERS = {
  int: {
    base(G, family, rng) {
      const x = chooseLhs(G, 'int');
      if (!x) return null;
      const self = vr(x.name, 'int');
      if (family === 'REASSIGN_OVERWRITE') {
        const other = recentOther(G, x.name, 'int');
        return [assign(x.name, 'int', rng.chance(0.5) || !other ? intLit(G, 1, 30) : bin(rng.pick(['+', '-', '*']), vr(other, 'int'), intLit(G, 2, 6)))];
      }
      const other = recentOther(G, x.name, 'int');
      const op = rng.pick(['+', '+', '-', '*']);
      const rhs = other && rng.chance(0.65) ? vr(other, 'int') : intLit(G, op === '*' ? 2 : 1, 9);
      return [assign(x.name, 'int', rng.chance(0.7) ? bin(op, self, rhs) : bin(op, rhs, self))];
    },
    family(G, family, rng) {
      const x = chooseLhs(G, 'int');
      if (!x) return null;
      const self = vr(x.name, 'int');
      const other = recentOther(G, x.name, 'int');
      const must = (n) => [...(other ? [other] : []), ...(rng.chance(0.5) ? [x.name] : [])].slice(0, n);
      switch (family) {
        case 'COMPOUND_ASSIGNMENT': {
          const op = rng.weighted(['+', '-', '*', '/', '%'], (o) => ({ '+': 3, '-': 3, '*': 2, '/': 1.2, '%': 1.2 }[o]));
          let rhs;
          if (op === '/' || op === '%') rhs = rng.chance(0.75) ? intLit(G, 2, 7) : (other ? vr(other, 'int') : intLit(G, 2, 6));
          else if (G.difficulty !== 'beginner' && rng.chance(0.4)) rhs = intChain(G, { k: 2, mode: 'plain', must: other ? [other] : [] });
          else rhs = other && rng.chance(0.6) ? vr(other, 'int') : intLit(G, op === '*' ? 2 : 1, 9);
          if (!rhs) return null;
          return [compound(x.name, 'int', op, rhs)];
        }
        case 'INCREMENT_DECREMENT': return [incdec(x.name, rng.pick(['++', '++', '--']))];
        case 'ASSIGN_COPY': { const y = copySource(G, 'int', x.name); return y ? [assign(x.name, 'int', vr(y, 'int'))] : null; }
        case 'COPY_INDEPENDENCE': return copyIndep(G, 'int', rng);
        case 'OPERATOR_PRECEDENCE': {
          const e = intChain(G, { k: G.difficulty === 'beginner' || rng.chance(0.75) ? 3 : 4, mode: 'prec', must: must(2) });
          if (!e) return null;
          return rng.chance(0.25) ? [compound(x.name, 'int', rng.pick(['+', '-']), e)] : [assign(x.name, 'int', e)];
        }
        case 'PARENTHESES': {
          const e = groupedInt(G, { must: must(2) });
          return rng.chance(0.2) ? [compound(x.name, 'int', rng.pick(['+', '-', '*']), e)] : [assign(x.name, 'int', e)];
        }
        case 'INTEGER_DIVISION': {
          if (rng.chance(0.25)) return [compound(x.name, 'int', '/', intLit(G, 2, 6))];
          return [assign(x.name, 'int', divExpr(G, must(2)))];
        }
        case 'REMAINDER': {
          if (rng.chance(0.25)) return [compound(x.name, 'int', '%', intLit(G, 2, 9))];
          return [assign(x.name, 'int', modExpr(G, must(2)))];
        }
      }
      return null;
    },
  },
  double: {
    base(G, family, rng) {
      const x = chooseLhs(G, 'double');
      if (!x) return null;
      if (family === 'REASSIGN_OVERWRITE') return [assign(x.name, 'double', dblLit(G, 1, 12))];
      const other = recentOther(G, x.name, 'double');
      const op = rng.pick(['+', '-', '*']);
      const rhs = other && rng.chance(0.6) ? vr(other, 'double') : dblLit(G, 1, 5);
      return [assign(x.name, 'double', bin(op, vr(x.name, 'double'), rhs))];
    },
    family(G, family, rng) {
      const x = chooseLhs(G, 'double');
      if (!x) return null;
      const other = recentOther(G, x.name, 'double');
      const must = [...(other ? [other] : []), ...(rng.chance(0.4) ? [x.name] : [])].slice(0, 2);
      const intVars = varsOf(G, 'int');
      switch (family) {
        case 'DOUBLE_ARITHMETIC': {
          if (rng.chance(0.3)) return [compound(x.name, 'double', rng.pick(['+', '-', '*', '/']), (() => { const op = '+'; return dblLit(G, 1, 5); })())].map((s) => (s.op === '/' ? { ...s, expr: lit('double', rng.pick([2, 4])) } : s));
          const e = dblChain(G, { k: rng.int(2, 3), mixed: false, must });
          return e ? [assign(x.name, 'double', e)] : null;
        }
        case 'MIXED_NUMERIC': {
          if (!intVars.length) return null;
          const iv = intVars[0].name;
          if (rng.chance(0.3)) return [compound(x.name, 'double', rng.pick(['+', '-', '*']), vr(rng.pick(intVars).name, 'int'))];
          const e = dblChain(G, { k: 2, mixed: true, must: [...must.slice(0, 1), iv].slice(0, 2) });
          return e ? [assign(x.name, 'double', e)] : null;
        }
        case 'COMPOUND_ASSIGNMENT': {
          const op = rng.pick(['+', '-', '*', '+', '/']);
          const rhs = op === '/' ? lit('double', rng.pick([2, 4])) : (other && rng.chance(0.5) ? vr(other, 'double') : dblLit(G, 1, 5));
          return [compound(x.name, 'double', op, rhs)];
        }
        case 'OPERATOR_PRECEDENCE': { const e = dblChain(G, { k: 3, precMode: true, must }); return e ? [assign(x.name, 'double', e)] : null; }
        case 'PARENTHESES': {
          const a = other ? vr(other, 'double') : dblLit(G, 1, 5);
          const inner = paren(bin(rng.pick(['+', '-']), a, rng.chance(0.5) ? vr(x.name, 'double') : dblLit(G, 1, 5)));
          return [assign(x.name, 'double', rng.chance(0.5) ? bin('*', inner, dblLit(G, 2, 4)) : bin('/', inner, lit('double', rng.pick([2, 4]))))];
        }
        case 'ASSIGN_COPY': { const y = copySource(G, 'double', x.name); return y ? [assign(x.name, 'double', vr(y, 'double'))] : null; }
        case 'COPY_INDEPENDENCE': return copyIndep(G, 'double', rng);
        case 'INTEGER_DIVISION': {
          if (!intVars.length) return null;
          return [assign(x.name, 'double', bin('/', vr(rng.pick(intVars).name, 'int'), intLit(G, 2, 4)))];
        }
      }
      return null;
    },
  },
  boolean: {
    base(G, family, rng) {
      const x = chooseLhs(G, 'boolean');
      if (!x) return null;
      if (family === 'REASSIGN_OVERWRITE') return [assign(x.name, 'boolean', lit('boolean', rng.chance(0.5)))];
      return [assign(x.name, 'boolean', bin(rng.pick(['&&', '||']), vr(x.name, 'boolean'), boolLeaf(G, [x.name])))];
    },
    family(G, family, rng) {
      const x = chooseLhs(G, 'boolean');
      if (!x) return null;
      const other = recentOther(G, x.name, 'boolean');
      switch (family) {
        case 'BOOLEAN_NEGATION': {
          const y = rng.chance(0.5) ? x : (chooseLhs(G, 'boolean', [x.name]) || x);
          return [assign(x.name, 'boolean', not(vr(y.name, 'boolean')))];
        }
        case 'BOOLEAN_COMBINATION': {
          const must = [...(other ? [other] : []), ...(rng.chance(0.4) ? [x.name] : [])].slice(0, 2);
          return [assign(x.name, 'boolean', boolExpr(G, { depth: rng.int(1, 2), must, allowNot: rng.chance(0.5) }))];
        }
        case 'ASSIGN_COPY': return copyStmts(G, 'boolean', x.name);
        case 'COPY_INDEPENDENCE': return copyIndep(G, 'boolean', rng);
        case 'REMAINDER': {
          if (!varsOf(G, 'int').length) return null;
          const a = pickVar(G, 'int');
          const e = bin('==', bin('%', a, intLit(G, 2, 4)), intLit(G, 0, 1));
          return [assign(x.name, 'boolean', rng.chance(0.3) && other ? bin('&&', e, vr(other, 'boolean')) : e)];
        }
      }
      return null;
    },
  },
  char: {
    base(G, family, rng) {
      const x = chooseLhs(G, 'char');
      if (!x) return null;
      if (family === 'REASSIGN_OVERWRITE' || true) return [assign(x.name, 'char', charLit(G, []))];
    },
    family(G, family, rng) {
      const x = chooseLhs(G, 'char');
      if (!x) return null;
      switch (family) {
        case 'ASSIGN_COPY': return copyStmts(G, 'char', x.name);
        case 'COPY_INDEPENDENCE': return copyIndep(G, 'char', rng);
        case 'STRING_CONCAT': { const y = chooseLhs(G, 'char', [x.name]); return y ? [assign(x.name, 'char', vr(y.name, 'char'))] : null; }
      }
      return null;
    },
  },
  String: {
    base(G, family, rng) {
      const x = chooseLhs(G, 'String');
      if (!x) return null;
      if (family === 'REASSIGN_OVERWRITE') return [assign(x.name, 'String', wordLit(G))];
      const other = recentOther(G, x.name, 'String');
      const rhs = other && rng.chance(0.6) ? vr(other, 'String') : wordLit(G);
      return [assign(x.name, 'String', rng.chance(0.7) ? bin('+', vr(x.name, 'String'), rhs) : bin('+', rhs, vr(x.name, 'String')))];
    },
    family(G, family, rng) {
      const x = chooseLhs(G, 'String');
      if (!x) return null;
      const other = recentOther(G, x.name, 'String');
      const iv = varsOf(G, 'int');
      switch (family) {
        case 'STRING_CONCAT': {
          const parts = [rng.chance(0.6) ? vr(x.name, 'String') : (other ? vr(other, 'String') : wordLit(G)), other && rng.chance(0.5) ? vr(other, 'String') : wordLit(G)];
          if (rng.chance(0.4)) parts.reverse();
          return [assign(x.name, 'String', bin('+', parts[0], parts[1]))];
        }
        case 'COMPOUND_ASSIGNMENT': return [compound(x.name, 'String', '+', other && rng.chance(0.5) ? vr(other, 'String') : wordLit(G))];
        case 'ASSIGN_COPY': return copyStmts(G, 'String', x.name);
        case 'COPY_INDEPENDENCE': return copyIndep(G, 'String', rng);
        case 'STRING_NUMBER_CONCAT': {
          if (!iv.length) return null;
          const n = vr(pickVar(G, 'int').name, 'int');
          return [assign(x.name, 'String', rng.chance(0.5) ? bin('+', vr(x.name, 'String'), n) : bin('+', n, vr(x.name, 'String')))];
        }
      }
      return null;
    },
  },
};

// Integer side-statements used to evolve numeric helper variables in String/boolean programs
export function intSideStatement(G, rng) {
  const x = chooseLhs(G, 'int');
  if (!x) return null;
  const choice = rng.int(0, 2);
  if (choice === 0) return [compound(x.name, 'int', rng.pick(['+', '-', '*']), intLit(G, 2, 6))];
  if (choice === 1) return [incdec(x.name, rng.pick(['++', '--']))];
  return [assign(x.name, 'int', bin(rng.pick(['+', '-']), vr(x.name, 'int'), intLit(G, 1, 9)))];
}

// ---- output (println) expression builders -----------------------------------
export function printExprFor(G) {
  const rng = R(G);
  const T = G.type;
  const adv = G.difficulty === 'advanced', beg = G.difficulty === 'beginner';
  const recentOf = (t) => G.recent.filter((n) => varsOf(G, t).some((v) => v.name === n));
  const sel = (t, n) => { const r = recentOf(t); const pool = varsOf(G, t).map((v) => v.name); const out = [...new Set([...r, ...pool])]; return out.slice(0, n); };
  if (T === 'int') {
    const names = sel('int', 3);
    if (beg) return rng.chance(0.55) ? vr(names[0], 'int') : bin(rng.pick(['+', '-', '*']), vr(names[0], 'int'), intLit(G, 2, 5));
    if (G.difficulty === 'intermediate') {
      if (names.length > 1 && rng.chance(0.6)) return bin(rng.pick(['+', '-', '*', '%']), vr(names[0], 'int'), vr(names[1], 'int'));
      return rng.chance(0.5) ? vr(names[0], 'int') : bin(rng.pick(['+', '-']), vr(names[0], 'int'), intLit(G, 1, 9));
    }
    const r = rng.int(0, 3);
    if (r === 0 && names.length > 1) return bin(rng.pick(['+', '-']), vr(names[0], 'int'), vr(names[1], 'int'));
    if (r === 1 && names.length > 1) return intChain(G, { k: 3, mode: 'prec', must: names.slice(0, 2) }) || bin('+', vr(names[0], 'int'), vr(names[1], 'int'));
    if (r === 2 && names.length > 1) return bin(rng.pick(['*', '%', '/']), vr(names[0], 'int'), vr(names[1], 'int'));
    return vr(names[0], 'int');
  }
  if (T === 'double') {
    const names = sel('double', 2);
    if (beg) return rng.chance(0.6) ? vr(names[0], 'double') : bin(rng.pick(['+', '*']), vr(names[0], 'double'), dblLit(G, 1, 4));
    if (names.length > 1 && rng.chance(0.6)) return bin(rng.pick(['+', '-', '*']), vr(names[0], 'double'), vr(names[1], 'double'));
    const iv = varsOf(G, 'int');
    if (iv.length && rng.chance(0.5)) return bin(rng.pick(['+', '*', '-']), vr(names[0], 'double'), vr(iv[0].name, 'int'));
    return vr(names[0], 'double');
  }
  if (T === 'boolean') {
    const names = sel('boolean', 2);
    if (beg || names.length < 2) return rng.chance(0.6) ? vr(names[0], 'boolean') : not(vr(names[0], 'boolean'));
    if (rng.chance(0.35)) return vr(names[0], 'boolean');
    const a = rng.chance(0.3) ? not(vr(names[0], 'boolean')) : vr(names[0], 'boolean');
    const b = rng.chance(0.3) ? not(vr(names[1], 'boolean')) : vr(names[1], 'boolean');
    return bin(rng.pick(['&&', '||']), a, b);
  }
  if (T === 'char') {
    const names = sel('char', 2);
    if (beg || names.length < 2 || rng.chance(0.4)) return vr(names[0], 'char');
    return bin('+', bin('+', vr(names[0], 'char'), sepLit(G)), vr(names[1], 'char'));
  }
  // String
  const names = sel('String', 3);
  const iv = varsOf(G, 'int');
  if (beg) return rng.chance(0.55) || !names.length ? vr(names[0], 'String') : bin('+', vr(names[0], 'String'), sepLit(G));
  if (G.difficulty === 'intermediate' || !adv) {
    if (names.length > 1 && rng.chance(0.55)) return bin('+', vr(names[0], 'String'), vr(names[1], 'String'));
    return rng.chance(0.4) ? vr(names[0], 'String') : bin('+', vr(names[0], 'String'), sepLit(G));
  }
  const must = names.slice(0, rng.int(1, 2));
  return strChain(G, { k: rng.int(3, 4), numbers: iv.length > 0, must });
}

// A statement whose only effect is output (used for the "printing is not storing" family)
export function printOnlyStatement(G) {
  const rng = R(G);
  const T = G.type;
  const name = G.recent[0] && varsOf(G, T).some((v) => v.name === G.recent[0]) ? G.recent[0] : varsOf(G, T)[0].name;
  const v = vr(name, T);
  if (T === 'int') return print(bin(rng.pick(['+', '*', '-']), v, intLit(G, 2, 6)));
  if (T === 'double') return print(bin(rng.pick(['+', '*']), v, dblLit(G, 1, 3)));
  if (T === 'boolean') return print(not(v));
  if (T === 'String') return print(bin('+', v, sepLit(G)));
  return print(v);
}
