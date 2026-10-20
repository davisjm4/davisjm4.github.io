// Math Lab expansion: a small Java statement/expression AST, a renderer that
// prints idiomatic Java, a static type checker for the supported subset, and an
// interpreter that reproduces Java semantics. The interpreter can also re-run a
// program under named misconceptions to produce plausible wrong answers; flags
// never affect correct evaluation.
//
// No eval/Function is used anywhere. Generators build ASTs directly.

import * as N from "./java-numeric.js";

// AST constructors ----------------------------------------------------------
export const lit = v => ({ k: "lit", t: "int", v });
export const dlit = (v, text = N.doubleLiteral(v)) => ({ k: "lit", t: "double", v, text });
// Long literal values are stored as decimal strings so challenge data stays JSON-serialisable.
export const llit = v => ({ k: "lit", t: "long", v: String(v) });
/** An int literal that javac rejects ("integer number too large"). */
export const bigIntLiteral = text => ({ k: "lit", t: "int", tooLarge: true, text });
export const blit = v => ({ k: "lit", t: "boolean", v });
export const slit = v => ({ k: "lit", t: "String", v });
export const ref = name => ({ k: "var", name });
export const K = name => ({ k: "const", name });
export const bin = (op, l, r) => ({ k: "bin", op, l, r });
export const neg = e => ({ k: "neg", e });
export const cast = (t, e) => ({ k: "cast", t, e });
export const call = (fn, ...args) => ({ k: "call", fn, args });
export const grp = e => ({ k: "group", e });
export const rnd = () => call("random");

export const decl = (t, name, e) => ({ k: "decl", t, name, e });
export const assign = (name, op, e) => ({ k: "assign", name, op, e });
export const incdec = (name, op) => ({ k: "incdec", name, op });
export const print = e => ({ k: "print", e });
export const ifs = (cond, then, els = null) => ({ k: "if", cond, then, els });
export const loop = (name, count, body) => ({ k: "for", name, count, body });

export const CONSTANTS = {
  "Integer.MAX_VALUE": N.int(N.INT_MAX),
  "Integer.MIN_VALUE": N.int(N.INT_MIN),
  "Long.MAX_VALUE": N.long(N.LONG_MAX),
  "Double.NaN": N.dbl(NaN),
};

// Rendering -----------------------------------------------------------------
const PREC = { "||": 3, "&&": 4, "==": 8, "!=": 8, "<": 9, "<=": 9, ">": 9, ">=": 9, "+": 11, "-": 11, "*": 12, "/": 12, "%": 12 };
const UNARY = 13, PRIMARY = 15;

function precOf(e) {
  if (e.k === "bin") return PREC[e.op];
  if (e.k === "neg" || e.k === "cast") return UNARY;
  if (e.k === "lit" && e.t !== "String" && !e.tooLarge && isNegativeLiteral(e)) return UNARY;
  return PRIMARY;
}
function isNegativeLiteral(e) {
  if (e.t === "long") return e.v.startsWith("-");
  if (e.t === "double") return e.text.startsWith("-");
  return e.v < 0;
}

export function renderExpr(e, opts = {}) {
  switch (e.k) {
    case "lit":
      if (e.tooLarge) return e.text;
      if (e.t === "double") return e.text;
      if (e.t === "long") return `${e.v}L`;
      if (e.t === "String") return JSON.stringify(e.v);
      return String(e.v);
    case "var": return e.name;
    case "const": return e.name;
    case "group": return `(${renderExpr(e.e, opts)})`;
    case "neg": {
      const inner = renderExpr(e.e, opts);
      return precOf(e.e) < PRIMARY ? `-(${inner})` : `-${inner}`;
    }
    case "cast": {
      const inner = renderExpr(e.e, opts);
      return `(${e.t}) ` + (precOf(e.e) < UNARY ? `(${inner})` : inner);
    }
    case "call":
      if (e.fn === "random" && opts.randomName) return `${opts.randomName}()`;
      return `Math.${e.fn}(${e.args.map(a => renderExpr(a, opts)).join(", ")})`;
    case "bin": {
      const p = PREC[e.op];
      let l = renderExpr(e.l, opts), r = renderExpr(e.r, opts);
      if (precOf(e.l) < p) l = `(${l})`;
      // Right operands of equal precedence need parentheses (left associativity);
      // negative numbers on the right are parenthesised for readability.
      if (precOf(e.r) <= p || precOf(e.r) === UNARY && e.r.k !== "cast") r = `(${r})`;
      return `${l} ${e.op} ${r}`;
    }
  }
  throw new Error("cannot render " + e.k);
}

/** Render statements; returns {lines, lineOf: Map(stmt -> 1-based line)}. */
export function renderProgram(stmts, opts = {}) {
  const lines = [], lineOf = new Map();
  const pad = d => "    ".repeat(d);
  function walk(list, depth) {
    for (const s of list) {
      lineOf.set(s, lines.length + 1);
      switch (s.k) {
        case "decl": lines.push(`${pad(depth)}${s.t} ${s.name}${s.e ? " = " + renderExpr(s.e, opts) : ""};`); break;
        case "assign": lines.push(`${pad(depth)}${s.name} ${s.op} ${renderExpr(s.e, opts)};`); break;
        case "incdec": lines.push(`${pad(depth)}${s.name}${s.op};`); break;
        case "print": lines.push(`${pad(depth)}System.out.println(${renderExpr(s.e, opts)});`); break;
        case "if":
          lines.push(`${pad(depth)}if (${renderExpr(s.cond, opts)}) {`);
          walk(s.then, depth + 1);
          if (s.els) { lines.push(`${pad(depth)}} else {`); walk(s.els, depth + 1); }
          lines.push(`${pad(depth)}}`);
          break;
        case "for":
          lines.push(`${pad(depth)}for (int ${s.name} = 0; ${s.name} < ${s.count}; ${s.name}++) {`);
          walk(s.body, depth + 1);
          lines.push(`${pad(depth)}}`);
          break;
        default: throw new Error("cannot render statement " + s.k);
      }
    }
  }
  walk(stmts, opts.depth || 0);
  return { lines, lineOf };
}
export const renderCode = (stmts, opts) => renderProgram(stmts, opts).lines.join("\n");

// Static typing -------------------------------------------------------------
export function typeOf(e, scope) {
  switch (e.k) {
    case "lit":
      if (e.tooLarge) throw new N.CompileError("integer number too large");
      return e.t;
    case "var": {
      if (!scope.has(e.name)) throw new N.CompileError(`cannot find symbol ${e.name}`);
      return scope.get(e.name);
    }
    case "const": {
      if (!CONSTANTS[e.name]) throw new Error("unknown constant " + e.name);
      return CONSTANTS[e.name].t;
    }
    case "group": return typeOf(e.e, scope);
    case "neg": {
      const t = typeOf(e.e, scope);
      if (!N.isNumericType(t)) throw new N.CompileError("bad operand type for unary -");
      return t;
    }
    case "cast": {
      const t = typeOf(e.e, scope);
      if (!N.isNumericType(t) || !N.isNumericType(e.t)) throw new N.CompileError(`incompatible types: ${t} cannot be converted to ${e.t}`);
      return e.t;
    }
    case "call": {
      if (!(e.fn in N.MATH_ARITY) || e.args.length !== N.MATH_ARITY[e.fn]) throw new N.CompileError(`no suitable method Math.${e.fn}`);
      const ts = e.args.map(a => typeOf(a, scope));
      if (!ts.every(N.isNumericType)) throw new N.CompileError(`no suitable method Math.${e.fn}`);
      return N.MATH_RETURN[e.fn](ts);
    }
    case "bin": {
      const a = typeOf(e.l, scope), b = typeOf(e.r, scope);
      if (e.op === "+" && (a === "String" || b === "String")) return "String";
      if (e.op === "&&" || e.op === "||") {
        if (a !== "boolean" || b !== "boolean") throw new N.CompileError("bad operand types");
        return "boolean";
      }
      if (["==", "!=", "<", "<=", ">", ">="].includes(e.op)) {
        if (a === "boolean" && b === "boolean" && (e.op === "==" || e.op === "!=")) return "boolean";
        N.promote(a, b); return "boolean";
      }
      return N.promote(a, b);
    }
  }
  throw new Error("cannot type " + e.k);
}

/** Throws CompileError if the statement list would not compile. */
export function typeCheck(stmts, outer = new Map()) {
  const scope = new Map(outer);
  for (const s of stmts) {
    switch (s.k) {
      case "decl": {
        if (scope.has(s.name)) throw new N.CompileError(`variable ${s.name} is already defined`);
        if (s.e) {
          const t = typeOf(s.e, scope);
          if (!N.assignable(s.t, t)) throw new N.CompileError(`incompatible types: possible lossy conversion from ${t} to ${s.t}`);
        }
        scope.set(s.name, s.t);
        break;
      }
      case "assign": {
        if (!scope.has(s.name)) throw new N.CompileError(`cannot find symbol ${s.name}`);
        const target = scope.get(s.name), t = typeOf(s.e, scope);
        if (s.op === "=") {
          if (!N.assignable(target, t)) throw new N.CompileError(`incompatible types: possible lossy conversion from ${t} to ${target}`);
        } else if (!N.isNumericType(target) || !N.isNumericType(t)) throw new N.CompileError("bad operand types");
        // Compound assignment includes an implicit cast back to the target type (JLS 15.26.2).
        break;
      }
      case "incdec":
        if (!N.isNumericType(scope.get(s.name))) throw new N.CompileError(`bad operand for ${s.op}`);
        break;
      case "print": typeOf(s.e, scope); break;
      case "if":
        if (typeOf(s.cond, scope) !== "boolean") throw new N.CompileError("incompatible types: condition must be boolean");
        typeCheck(s.then, scope); if (s.els) typeCheck(s.els, scope);
        break;
      case "for": {
        const inner = new Map(scope); inner.set(s.name, "int");
        typeCheck(s.body, inner);
        break;
      }
      default: throw new Error("cannot check " + s.k);
    }
  }
  return scope;
}

export function compiles(stmts) {
  try { typeCheck(stmts); return true; } catch (e) { if (e.compileError) return false; throw e; }
}

// Interpreter ---------------------------------------------------------------
/**
 * Misconception flags. Each models one specific, documented student error and
 * is used ONLY to manufacture distractors.
 */
export const MISCONCEPTIONS = {
  intDivReal: "Treating int / int as ordinary decimal division",
  intDivRound: "Assuming integer division rounds to the nearest whole number",
  intDivFloor: "Assuming integer division rounds down toward negative infinity",
  noOverflow: "Ignoring the 32-bit int limit (using the mathematical result)",
  overflowThrows: "Assuming int overflow throws an exception",
  overflowClamps: "Assuming an int sticks at its maximum or minimum instead of wrapping",
  castRounds: "Treating an (int) cast as rounding to the nearest integer",
  castFloors: "Assuming an (int) cast rounds down toward negative infinity",
  powInt: "Assuming Math.pow returns an int",
  powMultiply: "Treating exponentiation as multiplication",
  powSwap: "Swapping the base and the exponent",
  sqrtInt: "Assuming Math.sqrt returns an int",
  absNoop: "Ignoring the absolute value",
  absNegate: "Thinking Math.abs flips the sign of any value",
  absDistributes: "Applying Math.abs to each operand separately",
  doubleExact: "Assuming every decimal value is stored exactly",
  doubleShowsInt: "Expecting a whole-number double to print without .0",
  roundTruncates: "Treating Math.round like an (int) cast",
  roundHalfAway: "Assuming Math.round rounds .5 away from zero",
  divZeroIntInfinity: "Treating int division by zero like double division",
  divZeroThrowsDouble: "Assuming double division by zero throws an exception",
  divZeroIsZero: "Assuming division by zero produces 0",
  lossyTruncates: "Assuming Java silently converts a double to int",
  compoundNoCast: "Assuming x += value keeps the decimal part in an int",
  remAbs: "Assuming % always gives a nonnegative remainder",
  remainderQuotient: "Confusing % (remainder) with / (quotient)",
  castLate: "Applying the cast after the division instead of before it",
  wrongOperandCast: "Assuming the cast applies to the whole expression",
};

const INT_LIMIT = v => v > N.INT_MAX || v < N.INT_MIN;
/** Thrown when a misconception cannot be modelled for this program. */
export class MisconceptionUnavailable extends Error {}

class Machine {
  constructor(flags = {}, randomSource = null) {
    this.flags = flags;
    this.randomSource = randomSource;
    this.out = [];
    this.trace = [];
    this.steps = 0;
  }
  intResult(exact, op) {
    // `exact` is the mathematical result as a JS number (operands are small enough).
    const f = this.flags;
    if (f.noOverflow) {
      if (!Number.isSafeInteger(exact)) throw new MisconceptionUnavailable();
      return { t: "int", v: exact + 0 }; // deliberately allowed out of range
    }
    if (INT_LIMIT(exact)) {
      if (f.overflowThrows) throw new N.JavaException("ArithmeticException", "integer overflow");
      if (f.overflowClamps) return N.int(exact > 0 ? N.INT_MAX : N.INT_MIN);
    }
    return N.int(op());
  }
  arith(op, a, b) {
    const f = this.flags;
    if (op === "+" && (a.t === "String" || b.t === "String")) return N.str(this.text(a) + this.text(b));
    const t = N.promote(a.t, b.t);
    if (t === "int") {
      const x = a.v, y = b.v;
      if ((op === "/" || op === "%") && y === 0) {
        if (f.divZeroIsZero) return N.int(0);
        if (f.divZeroIntInfinity && op === "/") return N.dbl(x / 0);
        throw new N.JavaException("ArithmeticException", "/ by zero");
      }
      if (op === "/") {
        if (f.intDivReal) return N.dbl(x / y);
        if (f.intDivRound) return N.int(Math.round(x / y));
        if (f.intDivFloor) return N.int(Math.floor(x / y));
      }
      if (op === "%" && f.remAbs) return N.int(Math.abs(x % y));
      if (op === "%" && f.remainderQuotient) return N.int(Math.trunc(x / y));
      const exact = op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : op === "/" ? Math.trunc(x / y) : x % y;
      return this.intResult(exact, () => N.arith(op, N.int(x), N.int(y)).v);
    }
    if (t === "double") {
      const x = N.toType(a, "double").v, y = N.toType(b, "double").v;
      if ((op === "/" || op === "%") && y === 0) {
        if (f.divZeroThrowsDouble) throw new N.JavaException("ArithmeticException", "/ by zero");
        if (f.divZeroIsZero) return N.dbl(0);
      }
      const r = N.arith(op, N.dbl(x), N.dbl(y));
      if (f.doubleExact && Number.isFinite(r.v)) return N.dbl(Number(r.v.toPrecision(12)));
      return r;
    }
    return N.arith(op, a, b);
  }
  text(value) {
    if (value.t === "double" && this.flags.doubleShowsInt && Number.isInteger(value.v)) return String(value.v);
    if (value.t === "int" && !Number.isInteger(value.v)) return String(value.v);
    return value.t === "int" ? String(value.v) : N.javaString(value);
  }
  eval(e, env) {
    this.steps++;
    if (this.steps > 100000) throw new Error("evaluation step limit");
    const f = this.flags;
    switch (e.k) {
      case "lit":
        if (e.t === "int") return N.int(e.v);
        if (e.t === "long") return N.long(BigInt(e.v));
        if (e.t === "double") return N.dbl(e.v);
        if (e.t === "boolean") return N.bool(e.v);
        return N.str(e.v);
      case "var": return env.get(e.name);
      case "const": return CONSTANTS[e.name];
      case "group": return this.eval(e.e, env);
      case "neg": {
        const a = this.eval(e.e, env);
        if (a.t === "int") return this.intResult(-a.v, () => -a.v);
        return N.negate(a);
      }
      case "cast": {
        const a = this.eval(e.e, env);
        if (e.t === "int" && a.t === "double") {
          if (f.castRounds) return N.int(Math.round(a.v));
          if (f.castFloors) return N.int(Math.floor(a.v));
        }
        return N.cast(e.t, a.t === "int" && INT_LIMIT(a.v) ? { t: "double", v: a.v } : a);
      }
      case "call": {
        if (e.fn === "abs") {
          const arg = e.args[0];
          if (f.absDistributes && arg.k === "bin" && (arg.op === "+" || arg.op === "-")) {
            const l = this.call("abs", [this.eval(arg.l, env)]), r = this.call("abs", [this.eval(arg.r, env)]);
            return this.arith(arg.op, l, r);
          }
        }
        if (e.fn === "pow" && f.powMultiply) {
          return N.dbl(N.toType(this.eval(e.args[0], env), "double").v * N.toType(this.eval(e.args[1], env), "double").v);
        }
        const args = e.args.map(a => this.eval(a, env));
        if (e.fn === "pow" && f.powSwap) args.reverse();
        return this.call(e.fn, args);
      }
      case "bin": {
        if (e.op === "&&" || e.op === "||") {
          const l = this.eval(e.l, env);
          if (e.op === "&&" ? !l.v : l.v) return l;
          return this.eval(e.r, env);
        }
        const l = this.eval(e.l, env), r = this.eval(e.r, env);
        if (["==", "!=", "<", "<=", ">", ">="].includes(e.op)) return N.compare(e.op, l, r);
        return this.arith(e.op, l, r);
      }
    }
    throw new Error("cannot evaluate " + e.k);
  }
  call(fn, args) {
    const f = this.flags;
    if (fn === "abs") {
      if (f.absNoop) return args[0];
      if (f.absNegate) return N.negate(args[0]);
      if (args[0].t === "int" && args[0].v === N.INT_MIN) return this.intResult(-N.INT_MIN, () => N.INT_MIN);
    }
    if (fn === "pow") {
      const r = N.mathCall("pow", args);
      if (f.powInt && Number.isInteger(r.v)) return { t: "int", v: r.v };
      return r;
    }
    if (fn === "sqrt" && f.sqrtInt) return N.int(Math.trunc(Math.sqrt(N.toType(args[0], "double").v)));
    if (fn === "round") {
      const x = N.toType(args[0], "double").v;
      if (f.roundTruncates) return N.long(BigInt(Math.trunc(x)));
      if (f.roundHalfAway) return N.long(BigInt(Math.sign(x) * Math.round(Math.abs(x))));
    }
    return N.mathCall(fn, args, this.randomSource);
  }
  store(target, value) {
    // Assignment conversion. A misconception run may carry an out-of-range int.
    if (value.t === target) return value;
    if (target === "int" && value.t === "double" && this.flags.lossyTruncates) return N.int(Math.trunc(value.v));
    if (target === "double" && value.t === "int") return N.dbl(value.v);
    if (target === "int" && value.t === "double" && this.flags.compoundNoCast) return value;
    return N.toType(value, target);
  }
  exec(stmts, env, types) {
    for (const s of stmts) {
      this.current = s;
      switch (s.k) {
        case "decl": {
          types.set(s.name, s.t);
          if (s.e) env.set(s.name, this.store(s.t, this.eval(s.e, env)));
          break;
        }
        case "assign": {
          const t = types.get(s.name);
          let value = this.eval(s.e, env);
          if (s.op !== "=") {
            const current = env.get(s.name);
            value = this.arith(s.op[0], current, value);
            // Compound assignment casts back to the variable's type (JLS 15.26.2).
            if (!(this.flags.compoundNoCast && t === "int" && value.t === "double")) value = value.t === t ? value : N.cast(t, value);
          } else value = this.store(t, value);
          env.set(s.name, value);
          break;
        }
        case "incdec": {
          const current = env.get(s.name);
          env.set(s.name, current.t === "int"
            ? this.arith(s.op === "++" ? "+" : "-", current, N.int(1))
            : N.cast(current.t, this.arith(s.op === "++" ? "+" : "-", current, N.int(1))));
          break;
        }
        case "print": this.out.push(this.text(this.eval(s.e, env))); break;
        case "if": {
          const c = this.eval(s.cond, env);
          if (c.v) this.exec(s.then, env, types);
          else if (s.els) this.exec(s.els, env, types);
          break;
        }
        case "for": {
          types.set(s.name, "int");
          for (let i = 0; i < s.count; i++) { env.set(s.name, N.int(i)); this.exec(s.body, env, types); }
          env.delete(s.name); types.delete(s.name);
          break;
        }
      }
      this.trace.push({ stmt: s, vars: Object.fromEntries([...env].map(([k, v]) => [k, v])) });
    }
  }
}

/**
 * Run a program. Returns
 *   { compileError: message } or
 *   { out: [lines], exception: {name, detail, stmt} | null, env, trace }
 * Flags are only for distractor generation; with no flags the result is the
 * Java behaviour.
 */
export function run(stmts, { flags = {}, randomSource = null, checkTypes = true } = {}) {
  if (checkTypes) {
    try { typeCheck(stmts); } catch (e) {
      if (!e.compileError) throw e;
      if (!flags.lossyTruncates && !flags.compoundNoCast) return { compileError: e.message };
    }
  }
  const m = new Machine(flags, randomSource), env = new Map(), types = new Map();
  try { m.exec(stmts, env, types); } catch (e) {
    if (e instanceof N.JavaException) return { out: m.out, exception: { name: e.javaName, detail: e.detail, stmt: m.current }, env, trace: m.trace };
    throw e;
  }
  return { out: m.out, exception: null, env, trace: m.trace };
}

/** Evaluate one expression with optional variables and flags. */
export function evalExpr(e, { vars = {}, flags = {}, randomSource = null } = {}) {
  const m = new Machine(flags, randomSource);
  return m.eval(e, new Map(Object.entries(vars)));
}

/** Student-facing outcome text, used as an answer choice. */
export function outcomeText(result) {
  if (result.compileError) return "Does not compile";
  const lines = [...result.out];
  if (result.exception) lines.push(lines.length ? `then throws ${result.exception.name}` : `Throws ${result.exception.name}`);
  return lines.join("\n");
}

// Analysis helpers ---------------------------------------------------------
export function walkExpr(e, visit) {
  visit(e);
  if (e.k === "bin") { walkExpr(e.l, visit); walkExpr(e.r, visit); }
  else if (e.k === "neg" || e.k === "cast" || e.k === "group") walkExpr(e.e, visit);
  else if (e.k === "call") e.args.forEach(a => walkExpr(a, visit));
}
export function walkStmts(stmts, visitStmt, visitExpr = () => {}) {
  for (const s of stmts) {
    visitStmt(s);
    for (const key of ["e", "cond"]) if (s[key]) walkExpr(s[key], visitExpr);
    if (s.then) walkStmts(s.then, visitStmt, visitExpr);
    if (s.els) walkStmts(s.els, visitStmt, visitExpr);
    if (s.body) walkStmts(s.body, visitStmt, visitExpr);
  }
}

/** Complexity metrics used by difficulty tests. */
export function metrics(stmts) {
  const m = { statements: 0, operations: 0, methodCalls: 0, casts: 0, branches: 0, loops: 0, variables: 0 };
  walkStmts(stmts, s => {
    m.statements++;
    if (s.k === "decl") m.variables++;
    if (s.k === "if") m.branches++;
    if (s.k === "for") m.loops++;
    if (s.k === "assign" && s.op !== "=") m.operations++;
    if (s.k === "incdec") m.operations++;
  }, e => {
    if (e.k === "bin" || e.k === "neg") m.operations++;
    if (e.k === "call") m.methodCalls++;
    if (e.k === "cast") m.casts++;
  });
  return m;
}
