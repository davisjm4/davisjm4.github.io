// Math Lab expansion: Java numeric semantics.
//
// JavaScript numbers are IEEE-754 doubles, which match Java's `double` for
// + - * / % and Math.sqrt. They do NOT match Java's `int` or `long`, so those
// are modelled explicitly: int with 32-bit two's-complement wrapping
// (Math.imul, |0), long with BigInt.asIntN(64). Values are tagged {t, v}.

export const INT_MAX = 2147483647;
export const INT_MIN = -2147483648;
export const LONG_MAX = 9223372036854775807n;
export const LONG_MIN = -9223372036854775808n;

export class JavaException extends Error {
  constructor(name, detail) { super(`${name}${detail ? ": " + detail : ""}`); this.javaName = name; this.detail = detail; }
}
export class CompileError extends Error {
  constructor(message) { super(message); this.compileError = true; }
}

export const int = n => ({ t: "int", v: n | 0 });
export const long = n => ({ t: "long", v: BigInt.asIntN(64, BigInt(n)) });
export const dbl = x => ({ t: "double", v: +x });
export const bool = b => ({ t: "boolean", v: !!b });
export const str = s => ({ t: "String", v: String(s) });

export const isNumericType = t => t === "int" || t === "long" || t === "double";
const rank = { int: 1, long: 2, double: 3 };

/** Binary numeric promotion (JLS 5.6.2) for the supported types. */
export function promote(a, b) {
  if (!isNumericType(a) || !isNumericType(b)) throw new CompileError(`bad operand types ${a} and ${b}`);
  return rank[a] >= rank[b] ? a : b;
}

/** Widening assignment conversion (JLS 5.2) without constant narrowing. */
export function assignable(to, from) {
  if (to === from) return true;
  if (to === "long") return from === "int";
  if (to === "double") return from === "int" || from === "long";
  if (to === "String") return false;
  return false;
}

export function toType(value, t) {
  if (value.t === t) return value;
  if (t === "double") return dbl(value.t === "long" ? Number(value.v) : value.v);
  if (t === "long") {
    if (value.t === "int") return long(value.v);
    return castDoubleToLong(value.v);
  }
  if (t === "int") {
    if (value.t === "long") return int(Number(BigInt.asIntN(32, value.v)));
    return castDoubleToInt(value.v);
  }
  throw new CompileError(`cannot convert ${value.t} to ${t}`);
}

/** Narrowing primitive conversion double -> int (JLS 5.1.3): NaN -> 0, saturating, toward zero. */
export function castDoubleToInt(x) {
  if (Number.isNaN(x)) return int(0);
  if (x >= INT_MAX) return int(INT_MAX);
  if (x <= INT_MIN) return int(INT_MIN);
  return int(Math.trunc(x));
}
export function castDoubleToLong(x) {
  if (Number.isNaN(x)) return long(0n);
  if (x >= 9223372036854775807) return long(LONG_MAX);
  if (x <= -9223372036854775808) return long(LONG_MIN);
  return long(BigInt(Math.trunc(x)));
}

/** Explicit cast `(t) value`. */
export function cast(t, value) {
  if (t === value.t) return value;
  if (!isNumericType(t) || !isNumericType(value.t)) throw new CompileError(`cannot cast ${value.t} to ${t}`);
  return toType(value, t);
}

export function arith(op, a, b) {
  if (op === "+" && (a.t === "String" || b.t === "String")) return str(javaString(a) + javaString(b));
  const t = promote(a.t, b.t);
  const x = toType(a, t).v, y = toType(b, t).v;
  if (t === "int") {
    switch (op) {
      case "+": return int(x + y);
      case "-": return int(x - y);
      case "*": return int(Math.imul(x, y));
      case "/": if (y === 0) throw new JavaException("ArithmeticException", "/ by zero"); return int(Math.trunc(x / y));
      case "%": if (y === 0) throw new JavaException("ArithmeticException", "/ by zero"); return int(x % y);
    }
  } else if (t === "long") {
    switch (op) {
      case "+": return long(x + y);
      case "-": return long(x - y);
      case "*": return long(x * y);
      case "/": if (y === 0n) throw new JavaException("ArithmeticException", "/ by zero"); return long(x / y);
      case "%": if (y === 0n) throw new JavaException("ArithmeticException", "/ by zero"); return long(x % y);
    }
  } else {
    switch (op) {
      case "+": return dbl(x + y);
      case "-": return dbl(x - y);
      case "*": return dbl(x * y);
      case "/": return dbl(x / y); // IEEE: x/0.0 is +/-Infinity or NaN, never an exception
      case "%": return dbl(x % y);
    }
  }
  throw new CompileError(`unsupported operator ${op}`);
}

export function compare(op, a, b) {
  if (a.t === "boolean" && b.t === "boolean" && (op === "==" || op === "!=")) return bool(op === "==" ? a.v === b.v : a.v !== b.v);
  const t = promote(a.t, b.t);
  const x = toType(a, t).v, y = toType(b, t).v;
  switch (op) {
    case "==": return bool(x === y); // NaN == NaN is false in both Java and JS
    case "!=": return bool(x !== y);
    case "<": return bool(x < y);
    case "<=": return bool(x <= y);
    case ">": return bool(x > y);
    case ">=": return bool(x >= y);
  }
  throw new CompileError(`unsupported comparison ${op}`);
}

export function negate(a) {
  if (a.t === "int") return int(-a.v);
  if (a.t === "long") return long(-a.v);
  if (a.t === "double") return dbl(-a.v);
  throw new CompileError("bad operand type for unary -");
}

// java.lang.Math -------------------------------------------------------------
export const MATH_RETURN = {
  abs: args => args[0],              // overloads: abs(int) int, abs(long) long, abs(double) double
  pow: () => "double",
  sqrt: () => "double",
  random: () => "double",
  round: () => "long",               // Math.round(double) returns long
  max: args => promote(args[0], args[1]),
  min: args => promote(args[0], args[1]),
};
export const MATH_ARITY = { abs: 1, pow: 2, sqrt: 1, random: 0, round: 1, max: 2, min: 2 };

export function mathCall(fn, args, randomSource) {
  switch (fn) {
    case "abs": {
      const a = args[0];
      if (a.t === "int") return int(a.v < 0 ? -a.v : a.v);        // Math.abs(Integer.MIN_VALUE) == Integer.MIN_VALUE
      if (a.t === "long") return long(a.v < 0n ? -a.v : a.v);
      return dbl(Math.abs(a.v));
    }
    case "pow": return dbl(Math.pow(toType(args[0], "double").v, toType(args[1], "double").v));
    case "sqrt": return dbl(Math.sqrt(toType(args[0], "double").v));
    case "random": {
      if (!randomSource) throw new Error("Math.random() needs an explicit value source");
      const r = randomSource();
      if (!(r >= 0 && r < 1)) throw new Error("Math.random() source out of [0, 1)");
      return dbl(r);
    }
    case "round": {
      const x = toType(args[0], "double").v;
      if (Number.isNaN(x)) return long(0n);
      // JS Math.round and Java (7+) Math.round both return the mathematical
      // floor(x + 1/2), i.e. ties round toward positive infinity.
      return castDoubleToLong(Math.round(x));
    }
    case "max": case "min": {
      const t = promote(args[0].t, args[1].t);
      const x = toType(args[0], t), y = toType(args[1], t);
      if (t === "double" && (Number.isNaN(x.v) || Number.isNaN(y.v))) return dbl(NaN);
      const pickFirst = fn === "max" ? x.v >= y.v : x.v <= y.v;
      return pickFirst ? x : y;
    }
  }
  throw new CompileError(`unsupported Math.${fn}`);
}

// Output formatting ---------------------------------------------------------
/**
 * Java's Double.toString(double) as specified from JDK 19 onward (shortest
 * decimal that uniquely identifies the double). JavaScript's Number#toString
 * picks the same digits; only the layout differs (Java uses "E" notation
 * outside [1e-3, 1e7) and always shows at least one fractional digit).
 */
export function javaDouble(x) {
  if (Number.isNaN(x)) return "NaN";
  if (x === Infinity) return "Infinity";
  if (x === -Infinity) return "-Infinity";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const abs = Math.abs(x);
  if (abs >= 1e-3 && abs < 1e7) {
    const s = String(x);
    if (/e/i.test(s)) throw new Error("unexpected exponent form " + s);
    return s.includes(".") ? s : s + ".0";
  }
  const [mantissa, exponent] = x.toExponential().split("e");
  const m = mantissa.includes(".") ? mantissa : mantissa + ".0";
  return `${m}E${Number(exponent)}`;
}

export function javaString(value) {
  switch (value.t) {
    case "int": return String(value.v);
    case "long": return value.v.toString();
    case "double": return javaDouble(value.v);
    case "boolean": return value.v ? "true" : "false";
    case "String": return value.v;
  }
  throw new Error("unknown type " + value.t);
}

/** Java source text for a double literal value (always contains '.' or 'E'). */
export function doubleLiteral(x) {
  const s = javaDouble(x);
  if (!/^-?\d+\.\d+(E-?\d+)?$/.test(s)) throw new Error("not a literal-safe double " + s);
  return s;
}
