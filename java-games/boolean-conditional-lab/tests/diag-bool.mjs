// Independent oracle: a recursive-descent evaluator written separately from
// the engine so tests do not inherit the generator's assumptions.
// Grammar (Java precedence): or := and ('||' and)* ; and := unary ('&&' unary)* ;
// unary := '!' unary | '(' or ')' | ident | true | false
export function tokenize(src) {
  const out = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (src.startsWith("&&", i) || src.startsWith("||", i)) { out.push(src.slice(i, i + 2)); i += 2; continue; }
    if ("!()".includes(c)) { out.push(c); i++; continue; }
    const m = /^[A-Za-z_]\w*/.exec(src.slice(i));
    if (!m) throw new Error(`bad char ${c} in ${src}`);
    out.push(m[0]); i += m[0].length;
  }
  return out;
}
export function parseExpr(src) {
  const t = tokenize(src); let p = 0;
  const peek = () => t[p], eat = x => { if (t[p] !== x) throw new Error(`expected ${x} in ${src}`); p++; };
  function unary() {
    if (peek() === "!") { p++; return { k: "not", a: unary() }; }
    if (peek() === "(") { p++; const e = or(); eat(")"); return e; }
    const w = t[p++]; if (w === undefined || /^(&&|\|\||\))$/.test(w)) throw new Error(`unexpected ${w} in ${src}`);
    if (w === "true" || w === "false") return { k: "const", v: w === "true" };
    return { k: "var", n: w };
  }
  function and() { let l = unary(); while (peek() === "&&") { p++; l = { k: "and", a: l, b: unary() }; } return l; }
  function or() { let l = and(); while (peek() === "||") { p++; l = { k: "or", a: l, b: and() }; } return l; }
  const e = or(); if (p !== t.length) throw new Error(`trailing tokens in ${src}`); return e;
}
export function evalNode(n, env) {
  switch (n.k) {
    case "const": return n.v;
    case "var": if (!(n.n in env)) throw new Error(`unbound ${n.n}`); return env[n.n];
    case "not": return !evalNode(n.a, env);
    case "and": return evalNode(n.a, env) && evalNode(n.b, env);
    case "or": return evalNode(n.a, env) || evalNode(n.b, env);
  }
}
export const exprVars = src => [...new Set(tokenize(src).filter(w => /^[A-Za-z_]/.test(w) && w !== "true" && w !== "false"))].sort();
// truth vector over vars in the given order, row 0 = all false, MSB = first var
export function truthVector(src, vars = exprVars(src)) {
  const n = parseExpr(src); let s = "";
  for (let r = 0; r < 1 << vars.length; r++) {
    const env = {}; vars.forEach((v, j) => { env[v] = !!(r & (1 << (vars.length - 1 - j))); });
    s += evalNode(n, env) ? "1" : "0";
  }
  return s;
}
export const evalExpr = (src, env) => evalNode(parseExpr(src), env);
// True when some flattened &&/|| chain contains the same operand twice (e.g. a && a, (a && b) && a).
export function hasDuplicateOperand(src) {
  const key = n => n.k === "var" ? n.n : n.k === "const" ? String(n.v) : n.k === "not" ? `!${key(n.a)}` : `${n.k}(${chain(n, n.k).map(key).sort()})`;
  const chain = (n, k) => n.k === k ? [...chain(n.a, k), ...chain(n.b, k)] : [n];
  const walk = n => { if (n.k === "not") return walk(n.a); if (n.k !== "and" && n.k !== "or") return false; const xs = chain(n, n.k), ks = xs.map(key); return new Set(ks).size !== ks.length || xs.some(walk); };
  return walk(parseExpr(src));
}
