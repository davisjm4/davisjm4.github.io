// Math Lab expansion — Mode 1: Math Methods & Random Ranges.
// Every family returns a draft; generator.js finalises choices and validates.
import * as P from "./java-program.js";
import * as N from "./java-numeric.js";
import * as R from "./random-range.js";
import * as H from "./gen-helpers.js";

const { lit, dlit, ref, K, bin, cast, call, grp, decl, print, ifs, slit, rnd, neg } = P;
const MODE = "math-methods";
const asDoubleText = t => /^-?\d+$/.test(t) ? t + ".0" : null;
const asIntText = t => /^-?\d+\.0$/.test(t) ? t.slice(0, -2) : null;
const paren = v => v < 0 ? `(${v})` : String(v);
const lowerFirst = t => t[0].toLowerCase() + t.slice(1);

// ---------------------------------------------------------------------------
// A. Math.abs
const abs = {
  id: "mm.abs", mode: MODE, label: "Absolute value", skill: "Math.abs",
  weights: { beginner: 3, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["difference", "literal-sum", "literal-minus", "stored"],
      intermediate: ["double-arg", "mixed-signs", "zero-mix", "scaled"],
      advanced: ["nested", "min-value", "min-shift", "branch"],
    }[d]);
    const [a, b, c] = H.pickNames(rng, 3);
    if (shape === "difference" || shape === "stored") {
      const x = rng.int(1, 20), y = x + rng.int(2, 25);
      const lo = rng.chance(0.5);
      const first = lo ? x : y, second = lo ? y : x;
      const expr = call("abs", bin("-", ref(a), ref(b)));
      const program = [decl("int", a, lit(first)), decl("int", b, lit(second)),
        ...(shape === "stored" ? [decl("int", c, expr), print(ref(c))] : [print(expr)])];
      const diff = first - second;
      return H.outputDraft({
        shape, program, flags: ["absNoop", "absNegate"],
        alts: [{ misc: "absSum", program: [print(lit(first + second))] }],
        extras: [{ text: `${Math.abs(diff)}.0`, misc: "absDouble" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `${a} - ${b} is ${first} - ${second} = ${diff}.`,
          `Math.abs returns the distance from zero, so Math.abs(${diff}) is ${Math.abs(diff)}.`,
          "Math.abs(int) returns an int, so no .0 is printed."),
      });
    }
    if (shape === "literal-sum" || shape === "literal-minus") {
      const x = rng.int(3, 40);
      const y = shape === "literal-sum" ? rng.int(1, 30) : x + rng.int(2, 20);
      const op = shape === "literal-sum" ? "+" : "-";
      const program = [print(bin(op, call("abs", lit(-x)), lit(y)))];
      const answer = op === "+" ? x + y : x - y;
      return H.outputDraft({
        shape, program, flags: ["absNoop"],
        alts: [{ misc: "absWholeExpr", program: [print(call("abs", bin(op, lit(-x), lit(y))))] }],
        extras: [{ text: `${answer}.0`, misc: "absDouble" }, { text: String(op === "+" ? -x - y : -x + y), misc: "absNegate" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `Only -${x} is inside Math.abs, so it becomes ${x}.`,
          `Then ${x} ${op} ${y} = ${answer}. Math.abs(int) returns an int.`),
      });
    }
    if (shape === "double-arg") {
      const x = -H.quarterValue(rng, 1, 9);
      const k = Math.ceil(Math.abs(x)) + rng.int(1, 6);
      const program = [decl("double", a, dlit(x)), print(bin("-", call("abs", ref(a)), lit(k)))];
      const value = Math.abs(x) - k;
      return H.outputDraft({
        shape, program, flags: ["absNoop"],
        alts: [
          { misc: "absWholeExpr", program: [print(call("abs", bin("-", dlit(x), lit(k))))] },
          { misc: "absInt", program: [print(bin("-", lit(Math.trunc(Math.abs(x))), lit(k)))] },
        ],
        prompt: "What is printed?",
        explanation: H.lines(
          `${a} is a double, so Java calls Math.abs(double), which returns a double: ${H.showDouble(Math.abs(x))}.`,
          `Math.abs applies only to ${a}; the subtraction happens afterward: ${H.showDouble(Math.abs(x))} - ${k} = ${H.showDouble(value)}.`),
      });
    }
    if (shape === "mixed-signs" || shape === "scaled") {
      const x = -rng.int(8, 30), y = rng.int(2, Math.abs(x) - 3), m = rng.int(2, 5);
      const inner = call("abs", bin("+", ref(a), ref(b)));
      const expr = shape === "scaled" ? bin("*", inner, ref(c)) : bin("-", inner, ref(c));
      const program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("int", c, lit(m)), print(expr)];
      const s = Math.abs(x + y), value = shape === "scaled" ? s * m : s - m;
      return H.outputDraft({
        shape, program, flags: ["absNoop", "absDistributes", "absNegate"],
        extras: [{ text: `${value}.0`, misc: "absDouble" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `Evaluate the argument first: ${a} + ${b} = ${x} + ${y} = ${x + y}.`,
          `Math.abs(${x + y}) = ${s}. It is not |${x}| + |${y}|.`,
          `Then ${s} ${shape === "scaled" ? "*" : "-"} ${m} = ${value}.`),
      });
    }
    if (shape === "zero-mix") {
      const x = rng.int(4, 30), z = -rng.int(2, 25);
      const program = [decl("int", a, lit(x)), decl("int", b, lit(x)), decl("int", c, lit(z)),
        print(bin("+", call("abs", bin("-", ref(a), ref(b))), call("abs", ref(c))))];
      const value = Math.abs(z);
      return H.outputDraft({
        shape, program, flags: ["absNoop"],
        alts: [{ misc: "absSum", program: [print(lit(x + x + Math.abs(z)))] }],
        extras: [{ text: `${value}.0`, misc: "absDouble" }, { text: String(value + 1), misc: "noMinusLiteral" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `${a} - ${b} is 0, and Math.abs(0) is 0.`,
          `Math.abs(${c}) = Math.abs(${z}) = ${value}. The sum is 0 + ${value} = ${value}.`),
      });
    }
    if (shape === "nested") {
      const x = -rng.int(3, 20), y = Math.abs(x) + rng.int(2, 15), m = rng.int(2, 4);
      const expr = bin("*", call("abs", bin("-", call("abs", ref(a)), ref(b))), lit(m));
      const program = [decl("int", a, lit(x)), decl("int", b, lit(y)), print(expr)];
      const inner = Math.abs(x) - y;
      return H.outputDraft({
        shape, program, flags: ["absNoop", "absDistributes"],
        alts: [{ misc: "absWholeExpr", program: [print(lit(Math.abs(inner * m) + 0))] },
          { misc: "absSum", program: [print(lit((Math.abs(x) + y) * m))] }],
        extras: [{ text: `${Math.abs(inner) * m}.0`, misc: "absDouble" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `Work from the inside out: Math.abs(${a}) = Math.abs(${x}) = ${Math.abs(x)}.`,
          `${Math.abs(x)} - ${b} = ${Math.abs(x)} - ${y} = ${inner}; Math.abs(${inner}) = ${Math.abs(inner)}.`,
          `Finally ${Math.abs(inner)} * ${m} = ${Math.abs(inner) * m}.`),
      });
    }
    if (shape === "min-value" || shape === "min-shift") {
      const k = rng.int(1, 9);
      let program, explanation;
      if (shape === "min-value") {
        const variant = rng.pick(["plain", "plus", "minus"]);
        const base = call("abs", ref(a));
        const expr = variant === "plain" ? base : bin(variant === "plus" ? "+" : "-", base, lit(k));
        program = [decl("int", a, K("Integer.MIN_VALUE")), print(expr)];
        explanation = H.lines(
          "Integer.MIN_VALUE is -2147483648, but the largest int is 2147483647.",
          "Its positive counterpart, 2147483648, does not fit, so Math.abs(Integer.MIN_VALUE) overflows and returns -2147483648.",
          variant === "plain" ? "No exception is thrown." :
            `Then -2147483648 ${variant === "plus" ? "+" : "-"} ${k} = ${H.fmt(P.evalExpr(expr, { vars: { [a]: N.int(N.INT_MIN) } }))}${variant === "minus" ? " (subtraction wraps around past the minimum)" : ""}.`);
      } else {
        const variant = rng.pick(["plus", "minus-one"]);
        const inner = variant === "plus" ? bin("+", ref(a), lit(k)) : bin("-", ref(a), lit(1));
        program = [decl("int", a, K("Integer.MIN_VALUE")), print(call("abs", inner))];
        const innerValue = variant === "plus" ? N.INT_MIN + k : N.INT_MAX;
        explanation = H.lines(
          `${a} ${variant === "plus" ? "+ " + k : "- 1"} is evaluated first, in int arithmetic: ${innerValue}${variant === "plus" ? "" : " (subtracting 1 from the minimum wraps to the maximum)"}.`,
          `Math.abs(${innerValue}) = ${Math.abs(innerValue)}, which fits in an int.`);
      }
      return H.outputDraft({
        shape, program, flags: ["noOverflow", "overflowThrows", "overflowClamps", "absNoop"],
        extras: [{ text: "2147483648", misc: "noOverflow" }],
        prompt: "What is printed?", explanation,
      });
    }
    // branch
    const x = rng.int(1, 30), y = rng.int(1, 30), t = rng.int(3, 15);
    if (x === y) return null;
    const program = [decl("int", a, lit(x)), decl("int", b, lit(y)),
      decl("int", c, call("abs", bin("-", ref(a), ref(b)))),
      ifs(bin(">", ref(c), lit(t)), [print(bin("+", slit("far "), ref(c)))], [print(bin("+", slit("near "), ref(c)))])];
    const dist = Math.abs(x - y);
    return H.outputDraft({
      shape, program, flags: ["absNoop", "absNegate"],
      alts: [{ misc: "absSum", program: [decl("int", c, lit(x + y)), ifs(bin(">", ref(c), lit(t)), [print(bin("+", slit("far "), ref(c)))], [print(bin("+", slit("near "), ref(c)))])] }],
      extras: [{ text: `${dist > t ? "near" : "far"} ${dist}`, misc: "wrongBranch" }],
      prompt: "What is printed?",
      explanation: H.lines(
        `${c} = Math.abs(${x} - ${y}) = Math.abs(${x - y}) = ${dist}.`,
        `${dist} > ${t} is ${dist > t}, so the ${dist > t ? "if" : "else"} branch prints "${dist > t ? "far" : "near"} ${dist}".`),
    });
  },
};

// ---------------------------------------------------------------------------
// B. Math.pow (integer arguments with exactly representable results only:
// Java guarantees an exact result in that case, so no platform variation).
const pow = {
  id: "mm.pow", mode: MODE, label: "Exponents with Math.pow", skill: "Math.pow",
  weights: { beginner: 3, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["basic", "stored", "plus", "var-base", "basic", "stored", "plus", "var-base", "zero-exp"],
      intermediate: ["negative-exp", "cast-div", "versus-multiply", "stored-sum"],
      advanced: ["nested", "cast-overflow", "chain"],
    }[d]);
    const [a, b, c] = H.pickNames(rng, 3, H.DOUBLE_NAMES);
    if (shape === "basic" || shape === "stored" || shape === "zero-exp" || shape === "plus" || shape === "var-base") {
      const base = rng.int(2, 12), exp = shape === "zero-exp" ? 0 : rng.int(2, base <= 3 ? 6 : base <= 6 ? 4 : 3);
      const k = shape === "plus" ? rng.int(1, 20) : 0;
      const power = Math.pow(base, exp), value = power - k;
      const [iv] = H.pickNames(rng, 1);
      const raw = shape === "var-base" ? call("pow", ref(iv), lit(exp)) : call("pow", lit(base), lit(exp));
      const expr = k ? bin("-", raw, lit(k)) : raw;
      const program = shape === "stored" ? [decl("double", a, expr), print(ref(a))] : shape === "var-base" ? [decl("int", iv, lit(base)), print(expr)] : [print(expr)];
      const extras = shape === "zero-exp"
        ? [{ text: "0.0", misc: "powZero" }, { text: `${base}.0`, misc: "powZeroBase" }]
        : [{ text: String(base * exp - k), misc: "powMultiply" }, { text: String(value), misc: "powInt" }];
      return H.outputDraft({
        shape, program, flags: ["powInt", "powMultiply", "powSwap"], extras,
        prompt: "What is printed?",
        explanation: H.lines(
          exp === 0 ? `Any nonzero number raised to the power 0 is 1.` : `Math.pow(${base}, ${exp}) means ${Array(exp).fill(base).join(" × ")} = ${power}.`,
          `Math.pow always returns a double${k ? `, so ${H.showDouble(power)} - ${k} is the double ${H.showDouble(value)}` : `, so it prints ${H.showDouble(value)}`}.`),
      });
    }
    if (shape === "negative-exp") {
      const base = rng.pick([2, 4, 8]), exp = -rng.int(1, base === 8 ? 2 : 3);
      const value = Math.pow(base, exp);
      const program = [decl("double", a, call("pow", lit(base), lit(exp))), print(ref(a))];
      return H.outputDraft({
        shape, program, flags: ["powMultiply", "powSwap"],
        extras: [{ text: H.showDouble(-Math.pow(base, -exp)), misc: "negExpNegates" },
          { text: H.showDouble(Math.pow(base, -exp)), misc: "negExpIgnored" }, { text: "0", misc: "powInt" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `A negative exponent means a reciprocal: ${base}^${exp} = 1 / ${base}^${-exp} = 1 / ${Math.pow(base, -exp)}.`,
          `That is ${H.showDouble(value)}, which a double stores exactly.`),
      });
    }
    if (shape === "cast-div") {
      const base = rng.int(2, 5), exp = rng.int(2, 4), dv = rng.int(3, 7);
      const value = Math.pow(base, exp);
      if (value % dv === 0) return null;
      const [n] = H.pickNames(rng, 1);
      const program = [decl("int", n, bin("/", cast("int", call("pow", lit(base), lit(exp))), lit(dv))), print(ref(n))];
      return H.outputDraft({
        shape, program, flags: ["intDivReal", "intDivRound", "powMultiply"],
        alts: [{ misc: "castLate", program: [print(bin("/", dlit(value), lit(dv)))] }],
        extras: [{ text: "Does not compile", misc: "compileStrict" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `Math.pow(${base}, ${exp}) returns the double ${H.showDouble(value)}; the (int) cast makes it ${value}.`,
          `Now ${value} / ${dv} is int division, which truncates: ${Math.trunc(value / dv)}.`),
      });
    }
    if (shape === "versus-multiply") {
      const x = rng.int(2, 6), e = rng.pick([2, 3]);
      const [n] = H.pickNames(rng, 1);
      const program = [decl("int", n, lit(x)), print(bin("-", call("pow", ref(n), lit(e)), bin("*", ref(n), lit(e))))];
      const value = Math.pow(x, e) - x * e;
      if (value === 0) return null;
      return H.outputDraft({
        shape, program, flags: ["powMultiply", "powInt", "powSwap"],
        prompt: "What is printed?",
        explanation: H.lines(
          `Math.pow(${n}, ${e}) = ${x}^${e} = ${H.showDouble(Math.pow(x, e))} (a double).`,
          `${n} * ${e} = ${x * e} is ordinary multiplication.`,
          `double - int gives a double: ${H.showDouble(value)}.`),
      });
    }
    if (shape === "stored-sum") {
      const x = rng.int(2, 5), e1 = rng.int(2, 3), y = rng.int(2, 9);
      const program = [decl("double", a, call("pow", lit(x), lit(e1))), decl("int", b === a ? "m" : "m", lit(y)),
        print(bin("+", ref(a), bin("/", ref("m"), lit(2))))];
      const value = Math.pow(x, e1) + Math.trunc(y / 2);
      return H.outputDraft({
        shape, program, flags: ["powInt", "intDivReal", "powMultiply"],
        prompt: "What is printed?",
        explanation: H.lines(
          `${a} = Math.pow(${x}, ${e1}) = ${H.showDouble(Math.pow(x, e1))}.`,
          `m / 2 is int division: ${y} / 2 = ${Math.trunc(y / 2)}. Division happens before addition.`,
          `${H.showDouble(Math.pow(x, e1))} + ${Math.trunc(y / 2)} = ${H.showDouble(value)}.`),
      });
    }
    if (shape === "nested") {
      const x = rng.int(2, 4), e1 = rng.int(2, x === 2 ? 4 : 3), e2 = 2;
      const k = rng.int(1, 8);
      const program = [print(bin("-", call("pow", call("pow", lit(x), lit(e1)), lit(e2)), call("pow", lit(x), lit(k))))];
      const value = Math.pow(Math.pow(x, e1), e2) - Math.pow(x, k);
      return H.outputDraft({
        shape, program, flags: ["powMultiply", "powInt"],
        alts: [{ misc: "powAddExp", program: [print(bin("-", call("pow", lit(x), lit(e1 + e2)), call("pow", lit(x), lit(k))))] }],
        prompt: "What is printed?",
        explanation: H.lines(
          `Inner call first: Math.pow(${x}, ${e1}) = ${H.showDouble(Math.pow(x, e1))}.`,
          `Then Math.pow(${H.showDouble(Math.pow(x, e1))}, ${e2}) = ${H.showDouble(Math.pow(Math.pow(x, e1), e2))} (exponents multiply: ${x}^${e1 * e2}).`,
          `Math.pow(${x}, ${k}) = ${H.showDouble(Math.pow(x, k))}, so the result is ${H.showDouble(value)}.`),
      });
    }
    if (shape === "cast-overflow") {
      const exp = rng.int(10, 12);
      const [n] = H.pickNames(rng, 1);
      const program = [decl("int", n, cast("int", call("pow", lit(10), lit(exp)))), print(ref(n))];
      const wrapped = Number(BigInt.asIntN(32, 10n ** BigInt(exp)));
      return H.outputDraft({
        shape, program, flags: [],
        extras: [
          { text: String(wrapped), misc: "castWraps" },
          { text: "1" + "0".repeat(exp), misc: "noOverflow" },
          { text: "Throws ArithmeticException", misc: "overflowThrows" },
          { text: H.showDouble(Math.pow(10, exp)), misc: "compileStrict" },
        ],
        prompt: "What is printed?",
        explanation: H.lines(
          `Math.pow(10, ${exp}) = ${H.showDouble(Math.pow(10, exp))}, far above Integer.MAX_VALUE (2147483647).`,
          "Casting a double that is too large to int does not wrap and does not throw: Java clamps it to Integer.MAX_VALUE.",
          "So the program prints 2147483647."),
      });
    }
    // chain
    const x = rng.int(2, 4), e = rng.int(2, 4), m = rng.int(3, 9);
    const value = Math.pow(x, e);
    if (value % m === 0) return null;
    const [n, r] = H.pickNames(rng, 2);
    const program = [decl("int", n, cast("int", call("pow", lit(x), lit(e)))), decl("int", r, bin("%", ref(n), lit(m))),
      print(call("pow", ref(r), lit(2)))];
    const rem = value % m;
    return H.outputDraft({
      shape, program, flags: ["powInt", "powMultiply", "powSwap"],
      alts: [{ misc: "intDivReal", program: [print(call("pow", dlit(value / m, H.showDouble(value / m)), lit(2)))] }],
      prompt: "What is printed?",
      explanation: H.lines(
        `${n} = (int) Math.pow(${x}, ${e}) = ${value}.`,
        `${r} = ${value} % ${m} = ${rem}.`,
        `Math.pow(${rem}, 2) = ${H.showDouble(rem * rem)}, printed as a double.`),
    });
  },
};

// ---------------------------------------------------------------------------
// C. Math.sqrt (IEEE-754 requires a correctly rounded square root)
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20], [7, 24, 25], [20, 21, 29]];
const sqrt = {
  id: "mm.sqrt", mode: MODE, label: "Square roots with Math.sqrt", skill: "Math.sqrt",
  weights: { beginner: 3, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["perfect", "stored", "plus", "var-arg", "perfect", "stored", "plus", "var-arg", "zero"],
      intermediate: ["cast-truncate", "pythagorean", "sum-roots"],
      advanced: ["negative", "negative-compare", "round-trip"],
    }[d]);
    const [a, b] = H.pickNames(rng, 2, H.DOUBLE_NAMES);
    if (shape === "perfect" || shape === "stored" || shape === "zero" || shape === "plus" || shape === "var-arg") {
      const r = shape === "zero" ? 0 : rng.int(2, 20), sq = r * r, k = rng.int(1, 9);
      const [iv] = H.pickNames(rng, 1);
      const expr = shape === "var-arg" ? call("sqrt", ref(iv)) : call("sqrt", lit(sq));
      const program = shape === "stored" ? [decl("double", a, expr), print(ref(a))]
        : shape === "plus" ? [print(bin("+", expr, lit(k)))]
          : shape === "var-arg" ? [decl("int", iv, lit(sq)), print(expr)] : [print(expr)];
      const add = shape === "plus" ? k : 0;
      const extras = shape === "zero"
        ? [{ text: "Throws ArithmeticException", misc: "sqrtThrows" }, { text: "1.0", misc: "powZero" }, { text: "NaN", misc: "sqrtNegative" }]
        : [{ text: H.showDouble(sq / 2 + add), misc: "sqrtHalf" }, { text: H.showDouble(sq * sq + add), misc: "sqrtSquares" }, { text: String(r + add), misc: "sqrtInt" }, { text: H.showDouble(sq + add), misc: "sqrtIgnored" }];
      return H.outputDraft({
        shape, program, flags: ["sqrtInt"], extras,
        prompt: "What is printed?",
        explanation: H.lines(
          shape === "zero" ? "The square root of 0 is 0." : `${r} × ${r} = ${sq}, so the square root of ${sq} is ${r}.`,
          `Math.sqrt returns a double: ${H.showDouble(r)}.`, shape === "plus" ? `double + int is a double: ${H.showDouble(r + k)}.` : ""),
      });
    }
    if (shape === "cast-truncate") {
      let n;
      do { n = rng.int(5, 140); } while (Number.isInteger(Math.sqrt(n)));
      const [v] = H.pickNames(rng, 1);
      const program = [decl("int", v, cast("int", call("sqrt", lit(n)))), print(ref(v))];
      const root = Math.sqrt(n), lower = Math.floor(root);
      const extras = [{ text: "Does not compile", misc: "compileStrict" }];
      if (Math.round(root) === lower) extras.push({ text: H.showDouble(lower), misc: "sqrtInt" }, { text: String(lower + 1), misc: "castRounds" });
      return H.outputDraft({
        shape, program, flags: ["castRounds"], extras,
        alts: [{ misc: "sqrtHalf", program: [print(lit(Math.trunc(n / 2)))] }],
        prompt: "What is printed?",
        explanation: H.lines(
          `${lower}² = ${lower * lower} and ${lower + 1}² = ${(lower + 1) ** 2}, so Math.sqrt(${n}) is between ${lower} and ${lower + 1} (about ${root.toFixed(3)}).`,
          `The (int) cast truncates; it does not round. The result is ${lower}.`),
      });
    }
    if (shape === "pythagorean") {
      const [x, y, z] = rng.pick(TRIPLES);
      const [p, q] = H.pickNames(rng, 2);
      const program = [decl("int", p, lit(x)), decl("int", q, lit(y)),
        print(call("sqrt", bin("+", bin("*", ref(p), ref(p)), bin("*", ref(q), ref(q)))))];
      return H.outputDraft({
        shape, program, flags: ["sqrtInt"],
        extras: [{ text: H.showDouble(x + y), misc: "sqrtDistributes" }, { text: H.showDouble(x * x + y * y), misc: "sqrtIgnored" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `${p} * ${p} + ${q} * ${q} = ${x * x} + ${y * y} = ${x * x + y * y}.`,
          `Math.sqrt(${x * x + y * y}) = ${z}, returned as the double ${H.showDouble(z)}.`,
          `The root of a sum is not the sum of the roots (${x} + ${y} = ${x + y}).`),
      });
    }
    if (shape === "sum-roots") {
      const r1 = rng.int(2, 9), r2 = rng.int(2, 9);
      const program = [print(bin("+", call("sqrt", lit(r1 * r1)), call("abs", lit(-r2))))];
      return H.outputDraft({
        shape, program, flags: ["sqrtInt", "absNoop"],
        alts: [{ misc: "mixedStaysInt", program: [print(lit(r1 + r2))] }],
        extras: [{ text: H.showDouble(r1 * r1 / 2 + r2), misc: "sqrtHalf" }],
        prompt: "What is printed?",
        explanation: H.lines(
          `Math.sqrt(${r1 * r1}) = ${H.showDouble(r1)} (double) and Math.abs(-${r2}) = ${r2} (int).`,
          `double + int is a double: ${H.showDouble(r1 + r2)}.`),
      });
    }
    if (shape === "negative" || shape === "negative-compare") {
      const x = rng.int(2, 9), y = x + rng.int(1, 30);
      const [p, q] = H.pickNames(rng, 2);
      const root = call("sqrt", bin("-", ref(p), ref(q)));
      const program = shape === "negative"
        ? [decl("int", p, lit(x)), decl("int", q, lit(y)), decl("double", a, root), print(ref(a))]
        : [decl("int", p, lit(x)), decl("int", q, lit(y)), decl("double", a, root),
          print(bin("+", bin("+", slit(""), grp(bin(">=", ref(a), lit(0)))), bin("+", slit(" "), grp(bin("<", ref(a), lit(0))))))];
      const diff = x - y, mag = Math.sqrt(-diff);
      const magText = Number.isInteger(mag) ? H.showDouble(mag) : null;
      const extras = shape === "negative"
        ? [{ text: "Throws ArithmeticException", misc: "sqrtThrows" }, { text: magText ? "-" + magText : "0.0", misc: magText ? "sqrtNegative" : "divZeroIsZero" }, { text: "Does not compile", misc: "compileStrict" }]
        : [{ text: "Throws ArithmeticException", misc: "sqrtThrows" }, { text: "false true", misc: "sqrtNegative" }, { text: "true false", misc: "sqrtIgnored" }];
      return H.outputDraft({
        shape, program, flags: [], extras,
        prompt: "What is printed?",
        explanation: H.lines(
          `${p} - ${q} = ${diff}, a negative number.`,
          "Math.sqrt of a negative number does not throw an exception; it returns NaN (\"not a number\").",
          shape === "negative" ? "Printing that double shows NaN." : "Every comparison with NaN is false, so both >= 0 and < 0 are false."),
      });
    }
    // round-trip (spec example: int x = (int) Math.sqrt(50); double y = Math.pow(x, 2);)
    let n;
    do { n = rng.int(10, 150); } while (Number.isInteger(Math.sqrt(n)));
    const [x, y] = [H.pickNames(rng, 1)[0], H.pickNames(rng, 1, H.DOUBLE_NAMES)[0]];
    if (x === y) return null;
    const variant = rng.pick(["square", "gap"]);
    const program = [decl("int", x, cast("int", call("sqrt", lit(n)))), decl("double", y, call("pow", ref(x), lit(2))),
      print(variant === "square" ? ref(y) : bin("-", lit(n), ref(y)))];
    const s = Math.floor(Math.sqrt(n));
    return H.outputDraft({
      shape: `${shape}-${variant}`, program, flags: ["castRounds", "powInt", "sqrtInt"],
      alts: [{ misc: "earlyRounding", program: [print(variant === "square" ? lit(n) : lit(0))] }],
      prompt: "What is printed?",
      explanation: H.lines(
        `Math.sqrt(${n}) ≈ ${Math.sqrt(n).toFixed(3)}; the (int) cast truncates it to ${s}.`,
        `Math.pow(${s}, 2) = ${H.showDouble(s * s)}, so squaring does not recover ${n}.`,
        variant === "square" ? `It prints ${H.showDouble(s * s)}.` : `${n} - ${H.showDouble(s * s)} = ${H.showDouble(n - s * s)}.`),
    });
  },
};

// ---------------------------------------------------------------------------
// Return types: which declaration compiles?
const DECLS = [
  ["int", call("abs", lit(-7))], ["double", call("abs", lit(-7))], ["int", call("abs", dlit(-7.5))], ["double", call("abs", dlit(-7.5))],
  ["int", call("pow", lit(2), lit(5))], ["double", call("pow", lit(2), lit(5))], ["long", call("pow", lit(2), lit(5))],
  ["int", call("sqrt", lit(49))], ["double", call("sqrt", lit(49))], ["int", cast("int", call("sqrt", lit(49)))],
  ["int", call("round", dlit(4.6))], ["long", call("round", dlit(4.6))], ["int", cast("int", call("round", dlit(4.6)))],
  ["int", call("random")], ["double", call("random")], ["int", cast("int", call("random"))],
  ["int", bin("*", call("random"), lit(10))], ["int", cast("int", bin("*", call("random"), lit(10)))],
  ["int", bin("+", call("abs", lit(-3)), call("sqrt", lit(16)))], ["double", bin("+", call("abs", lit(-3)), call("sqrt", lit(16)))],
  ["int", cast("int", call("pow", lit(3), lit(2)))], ["long", call("abs", lit(-12))],
];
const returnType = {
  id: "mm.return-type", mode: MODE, label: "Return types", skill: "Math method return types",
  weights: { beginner: 2, intermediate: 2, advanced: 1 },
  build(rng, d) {
    const shape = d === "beginner" ? rng.pick(["which-compiles", "printed-form", "printed-form"]) : rng.pick(["which-compiles", "which-fails", "printed-form"]);
    if (shape === "printed-form") {
      const variant = rng.pick(d === "beginner" ? ["pow", "sqrt", "abs"] : ["mixed", "round", "abs-double"]);
      const x = rng.int(2, 30);
      let expr, explanation, extras;
      if (variant === "pow") { expr = call("pow", lit(x), lit(2)); explanation = `Math.pow returns a double even for whole-number results: ${H.showDouble(x * x)}.`; extras = [{ text: String(x * x), misc: "powInt" }, { text: String(x * 2), misc: "powMultiply" }, { text: H.showDouble(x * 2), misc: "powMultiply" }]; }
      else if (variant === "sqrt") { expr = call("sqrt", lit(x * x)); explanation = `Math.sqrt returns a double: ${H.showDouble(x)}.`; extras = [{ text: String(x), misc: "sqrtInt" }, { text: H.showDouble(x * x / 2), misc: "sqrtHalf" }, { text: String(x * x * x * x), misc: "sqrtSquares" }]; }
      else if (variant === "abs") { expr = call("abs", lit(-x * 3)); explanation = `Math.abs(int) returns an int, so it prints ${x * 3} without .0.`; extras = [{ text: H.showDouble(x * 3), misc: "absDouble" }, { text: String(-x * 3), misc: "absNoop" }, { text: H.showDouble(-x * 3), misc: "absDouble" }]; }
      else if (variant === "mixed") { expr = bin("+", call("abs", lit(-x)), call("sqrt", lit(x * x))); explanation = `Math.abs(-${x}) is the int ${x}; Math.sqrt(${x * x}) is the double ${H.showDouble(x)}. int + double is a double: ${H.showDouble(2 * x)}.`; extras = [{ text: String(2 * x), misc: "mixedStaysInt" }, { text: H.showDouble(0), misc: "absNoop" }, { text: H.showDouble(x + x * x / 2), misc: "sqrtHalf" }]; }
      else if (variant === "round") { const v = H.tenthValue(rng, 2, 30, true); expr = call("round", dlit(v)); explanation = `Math.round(double) returns a long, which prints as a whole number: ${Math.round(v)}.`; extras = [{ text: H.showDouble(Math.round(v)), misc: "doubleShowsInt" }, { text: String(Math.trunc(v)), misc: "roundTruncates" }, { text: H.showDouble(Math.trunc(v)), misc: "roundTruncates" }]; }
      else { const v = -H.quarterValue(rng, 1, 9); expr = call("abs", dlit(v)); explanation = `The argument is a double, so Math.abs(double) returns a double: ${H.showDouble(-v)}.`; extras = [{ text: String(Math.trunc(-v)), misc: "absInt" }, { text: H.showDouble(v), misc: "absNoop" }, { text: String(Math.round(-v)), misc: "castRounds" }]; }
      return H.outputDraft({ shape: `${shape}-${variant}`, program: [print(expr)], flags: [], extras, prompt: "What is printed?", explanation });
    }
    const [name] = H.pickNames(rng, 1);
    const pool = DECLS.filter(([, e]) => d !== "beginner" || P.metrics([print(e)]).operations === 0);
    const want = shape === "which-compiles";
    const entries = rng.shuffle(pool).map(([t, e]) => ({ t, e, ok: P.compiles([decl(t, name, e)]) }));
    const right = entries.find(x => x.ok === want);
    const wrong = entries.filter(x => x.ok !== want && x.e !== right.e);
    // Prefer distractors that use the same method as the key, so the contrast is about the return type.
    const key = x => P.renderExpr(x.e).match(/Math\.(\w+)/)?.[1];
    wrong.sort((x, y) => (key(y) === key(right)) - (key(x) === key(right)));
    const text = x => `${x.t} ${name} = ${P.renderExpr(x.e)};`;
    const candidates = wrong.slice(0, 6).map(x => ({ text: text(x), misc: want ? "compileLossy" : "compileStrict" }));
    return {
      kind: "code-choice", shape: `${shape}-${key(right)}`,
      prompt: want ? "Which declaration compiles?" : "Which declaration does NOT compile?",
      code: "", answer: text(right), candidates,
      optionCheck: option => P.compiles([decl(option.split(" ")[0], name, parseBack(option, entries, name))]) === want,
      explanation: H.lines(
        "Return types: Math.abs matches its argument (int → int, double → double); Math.pow, Math.sqrt and Math.random return double; Math.round(double) returns long.",
        "A double or long cannot be stored in an int without an explicit cast; an int or long can be stored in a double.",
        `${text(right)} ${want ? "compiles" : "does not compile"}.`),
      verify: entries.map(x => ({ type: "program", program: [decl(x.t, name, x.e)], expect: x.ok ? { out: [], exception: null } : { compileError: true } }))
        .filter(v => [right, ...wrong.slice(0, 6)].some(x => x.t === v.program[0].t && x.e === v.program[0].e)),
    };
  },
};
function parseBack(option, entries, name) {
  const found = entries.find(x => `${x.t} ${name} = ${P.renderExpr(x.e)};` === option);
  if (!found) throw new Error("unknown option " + option);
  return found.e;
}

// ---------------------------------------------------------------------------
// D. Math.random() fundamentals
const randomBasics = {
  id: "mm.random-basics", mode: MODE, label: "Math.random() fundamentals", skill: "Math.random() range",
  weights: { beginner: 3, intermediate: 2, advanced: 1 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["could-hold", "never-hold", "smallest", "cast-only"],
      intermediate: ["could-hold", "never-hold", "cast-first", "largest-int"],
      advanced: ["never-hold", "cast-first", "largest-int"],
    }[d]);
    const [r] = H.pickNames(rng, 1, H.DOUBLE_NAMES);
    const k = rng.pick(d === "beginner" ? [2, 4, 5, 8, 10, 20] : [3, 6, 7, 12, 25, 50, 60, 100]);
    // Double-interval questions use only Math.random() * k. Adding a double offset
    // (Math.random() * k + c) can round up to exactly k + c in real Java when
    // Math.random() returns its largest value, so "k + c is impossible" would be false.
    const c = 0;
    if (["could-hold", "never-hold"].includes(shape)) {
      const expr = c === 0 ? bin("*", rnd(), lit(k)) : bin("+", bin("*", rnd(), lit(k)), lit(c));
      const iv = R.analyze(expr);
      const inside = () => H.showDouble(c + rng.int(1, k * 4 - 1) / 4);
      const outside = [
        { text: H.showDouble(c + k), misc: "randomInclusive" },
        { text: H.showDouble(c - 1), misc: "randomNegative" },
        { text: H.showDouble(c + k + 1), misc: "oneTooMany" },
        { text: H.showDouble(k * 2 + c), misc: "wrongMultiplier" },
      ];
      if (c !== 0) outside.push({ text: H.showDouble(c + k + (c > 0 ? 0.5 : -0.5)), misc: "offsetInsideOnly" });
      const insideOptions = [{ text: H.showDouble(c), misc: "randomNoZero" }, { text: H.showDouble(c + rng.int(1, k - 1)), misc: "wholeNumberImpossible" },
        { text: inside(), misc: "interiorValue" }, { text: H.showDouble(c + k - 0.25), misc: "nearTopExcluded" }];
      const could = !shape.startsWith("never");
      const program = [decl("double", r, expr)];
      const answer = could ? rng.pick(insideOptions.slice(1)).text : outside[0].text;
      const candidates = could ? outside : insideOptions;
      return {
        kind: "membership", shape, prompt: could ? `Which value could ${r} hold after this statement?` : `Which value could ${r} NEVER hold after this statement?`,
        program, answer, candidates,
        optionCheck: option => R.inInterval(iv, Number(option)) === could,
        explanation: H.lines(
          "Math.random() returns a double from 0.0 up to but not including 1.0.",
          `Multiplying by ${k} gives 0.0 up to but not including ${H.showDouble(k)}${c ? `; adding ${c} shifts that to ${H.showDouble(c)} up to but not including ${H.showDouble(k + c)}` : ""}.`,
          `So ${r} is in ${R.describeInterval(iv)}: ${H.showDouble(c)} is possible, ${H.showDouble(c + k)} is not.`),
        verify: [{ type: "randomDouble", expr, expect: { lo: iv.lo, hi: iv.hi } }],
        meta: { interval: iv },
      };
    }
    if (shape === "smallest") {
      const expr = bin("*", rnd(), lit(k));
      return {
        kind: "membership", shape, prompt: `What is the smallest value ${r} can hold?`,
        program: [decl("double", r, expr)], answer: "0.0",
        candidates: [{ text: "1.0", misc: "randomNoZero" }, { text: H.showDouble(k), misc: "randomInclusive" }, { text: "0.01", misc: "randomNoZero" }, { text: "-" + H.showDouble(k), misc: "randomNegative" }],
        optionCheck: option => Number(option) === 0,
        explanation: H.lines("Math.random() can return exactly 0.0 (it is the inclusive lower bound).", `0.0 * ${k} = 0.0, so the smallest possible value is 0.0.`),
        verify: [{ type: "randomDouble", expr, expect: { lo: 0, hi: k } }],
      };
    }
    if (shape === "cast-only" || shape === "cast-first") {
      const [n] = H.pickNames(rng, 1);
      const expr = shape === "cast-only" ? cast("int", rnd()) : bin("+", bin("*", cast("int", rnd()), lit(k)), lit(c || rng.int(1, 9)));
      const set = R.possibleInts(expr);
      const off = shape === "cast-only" ? 0 : set[0];
      const kk = shape === "cast-only" ? 1 : k;
      return {
        kind: "set-description", shape, prompt: `Which values can ${n} hold?`,
        program: [decl("int", n, expr)], answer: R.describeSet(set),
        candidates: shape === "cast-only"
          ? [{ text: "0 through 1", misc: "randomInclusive" }, { text: "always 1", misc: "castRounds" }, { text: "any int value", misc: "randomInteger" }]
          : [{ text: R.describeSet(range(off, off + kk - 1)), misc: "intendedRange" }, { text: R.describeSet(range(off, off + kk)), misc: "randomInclusive" }, { text: R.describeSet(range(0, kk - 1)), misc: "missingOffset" }],
        optionCheck: option => option === R.describeSet(set),
        explanation: H.lines(
          "(int) Math.random() is applied before any multiplication. Math.random() is less than 1.0, so the cast always truncates it to 0.",
          shape === "cast-only" ? `${n} is always 0.` : `0 * ${k} = 0, then + ${off} gives ${off} every time. To spread values out, multiply inside the parentheses: (int) (Math.random() * ${k}).`),
        verify: [{ type: "randomInts", expr, expect: set }],
      };
    }
    // largest-int
    const [n] = H.pickNames(rng, 1);
    const expr = cast("int", bin("*", rnd(), lit(k)));
    return {
      kind: "membership", shape, prompt: `What is the largest value ${n} can hold?`,
      program: [decl("int", n, expr)], answer: String(k - 1),
      candidates: [{ text: String(k), misc: "randomInclusive" }, { text: String(k + 1), misc: "oneTooMany" }, { text: "0", misc: "castPlacement" }, { text: H.showDouble(k - 1), misc: "absDouble" }],
      optionCheck: option => option === String(k - 1),
      explanation: H.lines(`Math.random() * ${k} is at least 0.0 and less than ${H.showDouble(k)}.`, `Truncating any value below ${k} gives at most ${k - 1}.`),
      verify: [{ type: "randomInts", expr, expect: range(0, k - 1) }],
    };
  },
};
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

// ---------------------------------------------------------------------------
// E. Random integer ranges: build a generating expression for a family
function rangeExpr(rng, d) {
  // Returns {expr, env, decls, set} for a valid random integer expression.
  const style = rng.pick({
    beginner: ["one-based", "zero-based", "offset"],
    intermediate: ["offset", "negative", "span-literal", "negative"],
    advanced: ["variables", "negative", "step", "reverse", "span-literal"],
  }[d]);
  let lo, hi, expr, decls = [], env = {};
  if (style === "zero-based") { hi = rng.int(3, 30); lo = 0; expr = cast("int", bin("*", rnd(), lit(hi + 1))); }
  else if (style === "one-based") { lo = 1; hi = rng.pick([6, 10, 12, 20, 50, 100, rng.int(3, 40)]); expr = bin("+", cast("int", bin("*", rnd(), lit(hi))), lit(1)); }
  else if (style === "offset" || style === "span-literal") {
    lo = rng.int(2, 40); hi = lo + rng.int(3, 30);
    const span = style === "span-literal" ? grp(bin("+", bin("-", lit(hi), lit(lo)), lit(1))) : lit(hi - lo + 1);
    expr = bin("+", cast("int", bin("*", rnd(), span)), lit(lo));
  } else if (style === "negative") {
    lo = -rng.int(1, 30); hi = lo + rng.int(3, 40);
    expr = bin("-", cast("int", bin("*", rnd(), lit(hi - lo + 1))), lit(-lo));
  } else if (style === "variables") {
    const [ln, hn] = rng.pick([["low", "high"], ["min", "max"], ["start", "end"], ["lo", "hi"], ["first", "last"]]);
    lo = rng.int(-20, 30); hi = lo + rng.int(3, 30);
    decls = [decl("int", ln, lit(lo)), decl("int", hn, lit(hi))];
    env = { [ln]: lit(lo), [hn]: lit(hi) };
    expr = bin("+", cast("int", bin("*", rnd(), grp(bin("+", bin("-", ref(hn), ref(ln)), lit(1))))), ref(ln));
  } else if (style === "step") {
    const count = rng.int(3, 12), step = rng.int(2, 5), start = rng.int(-10, 20);
    expr = bin("+", bin("*", cast("int", bin("*", rnd(), lit(count))), lit(step)), lit(start));
    lo = start; hi = start + (count - 1) * step;
  } else {
    // reverse: hi - (int) (Math.random() * n)
    hi = rng.int(10, 60); const count = rng.int(3, 20); lo = hi - count + 1;
    expr = bin("-", lit(hi), cast("int", bin("*", rnd(), lit(count))));
  }
  const set = R.possibleInts(expr, env);
  return { style, expr, env, decls, set, lo: set[0], hi: set.at(-1) };
}
const rangeExplain = (g, name) => {
  const set = g.set;
  const lines = ["Math.random() is in [0.0, 1.0): 0.0 is possible, 1.0 is not."];
  if (g.style === "step") lines.push(`Multiplying and truncating gives a whole number 0 up to one less than the multiplier; × the step and + the start give ${R.describeSet(set)}.`);
  else if (g.style === "reverse") lines.push(`(int) (Math.random() * ${set.length}) is 0 through ${set.length - 1}; subtracting it from ${set.at(-1)} gives ${set[0]} through ${set.at(-1)}.`);
  else {
    const n = set.length;
    lines.push(`Multiplying by ${n} gives values from 0.0 up to but not including ${H.showDouble(n)}; the (int) cast truncates them to 0 through ${n - 1}.`);
    lines.push(`${set[0] < 0 ? `Subtracting ${-set[0]}` : `Adding ${set[0]}`} shifts the range to ${set[0]} through ${set.at(-1)}, inclusive.`);
  }
  return H.lines(...lines);
};
/** Misconception variants of a basic range: [{set, misc}] */
function rangeMistakes(set) {
  const lo = set[0], hi = set.at(-1);
  return [
    { set: range(lo, hi + 1), misc: "randomInclusive" },
    { set: range(lo + 1, hi + 1), misc: "randomNoZero" },
    { set: range(0, hi - lo), misc: "missingOffset" },
    { set: range(lo, hi - 1), misc: "oneTooFew" },
    { set: range(lo - 1, hi), misc: "offsetInsideOnly" },
  ];
}

const randomBounds = {
  id: "mm.random-bounds", mode: MODE, label: "Random range endpoints", skill: "Random integer ranges",
  weights: { beginner: 3, intermediate: 3, advanced: 2 },
  build(rng, d) {
    const g = rangeExpr(rng, d);
    const [n] = H.pickNames(rng, 1, ["roll", "pick", "card", "spin", "guess", "draw", "num", "slot"]);
    const ask = rng.pick(d === "beginner" ? ["smallest", "largest", "largest"] : ["smallest", "largest", "both", "both"]);
    const lo = g.lo, hi = g.hi, step = g.set.length > 1 ? g.set[1] - g.set[0] : 1;
    const program = [...g.decls, decl("int", n, g.expr)];
    let answer, candidates, check;
    if (ask === "both") {
      answer = `${lo} to ${hi}`;
      const mistakes = g.style === "step"
        ? [{ text: `${lo} to ${hi + step}`, misc: "randomInclusive" }, { text: `${lo} to ${lo + g.set.length - 1}`, misc: "stepIgnored" }, { text: `0 to ${(g.set.length - 1) * step}`, misc: "missingOffset" }, { text: `${lo} to ${lo + g.set.length * step}`, misc: "oneTooMany" }]
        : rangeMistakes(g.set).map(m => ({ text: `${m.set[0]} to ${m.set.at(-1)}`, misc: m.misc }));
      candidates = mistakes;
      check = o => o === answer;
    } else {
      const target = ask === "smallest" ? lo : hi;
      answer = String(target);
      candidates = ask === "smallest"
        ? [{ text: String(lo + step), misc: "randomNoZero" }, { text: "0", misc: "missingOffset" }, { text: String(lo - 1), misc: "offsetInsideOnly" }, { text: String(lo + 1), misc: "randomNoZero" }]
        : [{ text: String(hi + step), misc: "randomInclusive" }, { text: String(hi - g.lo), misc: "missingOffset" }, { text: String(hi - step), misc: "oneTooFew" }, { text: String(hi + 1), misc: "oneTooMany" }];
      check = o => o === answer;
    }
    return {
      kind: "range", shape: `${g.style}-${ask}`,
      prompt: ask === "both" ? `What are the smallest and largest values ${n} can hold?` : `What is the ${ask} value ${n} can hold?`,
      program, answer, candidates, optionCheck: check,
      explanation: rangeExplain(g, n),
      verify: [{ type: "randomInts", expr: g.expr, env: g.env, expect: g.set }],
      meta: { possible: g.set },
    };
  },
};

const randomValues = {
  id: "mm.random-values", mode: MODE, label: "Possible and impossible values", skill: "Random integer ranges",
  weights: { beginner: 2, intermediate: 3, advanced: 3 },
  build(rng, d) {
    const g = rangeExpr(rng, d);
    const [n] = H.pickNames(rng, 1, ["roll", "pick", "card", "spin", "guess", "draw", "num", "slot"]);
    const can = rng.chance(0.5);
    const inSet = v => g.set.includes(v);
    const lo = g.lo, hi = g.hi, step = g.set.length > 1 ? g.set[1] - g.set[0] : 1;
    const outside = [
      { v: hi + step, misc: "randomInclusive" }, { v: lo - 1, misc: "offsetInsideOnly" },
      { v: hi - lo + 1, misc: "wrongMultiplier" }, { v: g.set.length + (g.style === "step" ? 0 : lo), misc: "oneTooMany" },
      { v: lo + 1, misc: "stepIgnored" }, { v: 0, misc: "missingOffset" }, { v: hi + 1, misc: "randomInclusive" },
    ].filter(x => !inSet(x.v));
    const inside = rng.shuffle([lo, hi, ...g.set.slice(1, -1)]).slice(0, 4).map(v => ({ v, misc: v === lo ? "randomNoZero" : v === hi ? "oneTooFew" : null }));
    let answer, candidates;
    if (can) {
      answer = String(rng.pick([lo, hi, rng.pick(g.set)]));
      candidates = outside.map(x => ({ text: String(x.v), misc: x.misc }));
    } else {
      if (!outside.length) return null;
      answer = String(rng.pick(outside).v);
      const multiplier = g.set.length;
      const possible = [{ v: lo, misc: "randomNoZero" }, { v: hi, misc: "topExcluded" },
        { v: multiplier, misc: "multiplierExcluded" }, { v: 0, misc: "zeroExcluded" }, ...inside.map(x => ({ v: x.v, misc: "interiorValue" }))]
        .filter(x => inSet(x.v));
      candidates = possible.filter(x => String(x.v) !== answer).map(x => ({ text: String(x.v), misc: x.misc }));
    }
    return {
      kind: "membership", shape: `${g.style}-${can ? "can" : "cannot"}`,
      prompt: can ? `Which value can ${n} hold?` : `Which value can ${n} NEVER hold?`,
      program: [...g.decls, decl("int", n, g.expr)], answer, candidates,
      optionCheck: o => inSet(Number(o)) === can,
      explanation: H.lines(rangeExplain(g, n), `Possible values: ${R.describeSet(g.set)}.`),
      verify: [{ type: "randomInts", expr: g.expr, env: g.env, expect: g.set }],
      meta: { possible: g.set },
    };
  },
};

const randomCount = {
  id: "mm.random-count", mode: MODE, label: "Counting possible values", skill: "Random integer ranges",
  weights: { beginner: 2, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const g = rangeExpr(rng, d);
    const [n] = H.pickNames(rng, 1, ["roll", "pick", "card", "spin", "guess", "draw", "num", "slot"]);
    const size = g.set.length, span = g.hi - g.lo;
    const candidates = [
      { text: String(size + 1), misc: "randomInclusive" }, { text: String(size - 1), misc: "oneTooFew" },
      { text: String(span), misc: "oneTooFew" }, { text: String(g.hi), misc: "countIsMax" },
      { text: String(span + 1), misc: "stepIgnored" },
    ];
    return {
      kind: "count", shape: g.style,
      prompt: `How many different values can ${n} hold?`,
      program: [...g.decls, decl("int", n, g.expr)], answer: String(size), candidates,
      optionCheck: o => Number(o) === size,
      explanation: H.lines(rangeExplain(g, n), `That is ${size} different values (${R.describeSet(g.set)}).`),
      verify: [{ type: "randomInts", expr: g.expr, env: g.env, expect: g.set }],
      meta: { possible: g.set },
    };
  },
};

// F. Choose the correct expression
function rangeCandidates(lo, hi, rng, d) {
  const n = hi - lo + 1;
  const plus = (e, c) => c === 0 ? e : c > 0 ? bin("+", e, lit(c)) : bin("-", e, lit(-c));
  const scaled = k => cast("int", bin("*", rnd(), lit(k)));
  const correct = plus(scaled(n), lo);
  const list = [
    { e: plus(scaled(n - 1), lo), misc: "oneTooFew" },
    { e: plus(scaled(n + 1), lo), misc: "oneTooMany" },
    { e: plus(scaled(n), lo + 1), misc: "randomNoZero" },
    { e: plus(scaled(n), lo - 1), misc: "offsetInsideOnly" },
    { e: plus(bin("*", cast("int", rnd()), lit(n)), lo), misc: "castPlacement" },
    { e: scaled(n), misc: "missingOffset" },
  ];
  if (hi > 0 && hi !== n) list.push({ e: plus(scaled(hi), lo), misc: "multiplierIsHigh" });
  if (lo !== 0) list.push({ e: plus(scaled(hi - lo), lo), misc: "oneTooFew" });
  return { correct, list };
}
const randomChoose = {
  id: "mm.random-choose", mode: MODE, label: "Choose the range expression", skill: "Random integer ranges",
  weights: { beginner: 2, intermediate: 3, advanced: 3 },
  build(rng, d) {
    let lo, hi, step = 1;
    const style = rng.pick({ beginner: ["one", "zero", "pos"], intermediate: ["pos", "neg", "pos"], advanced: ["neg", "step", "cross"] }[d]);
    if (style === "one") { lo = 1; hi = rng.int(4, 50); }
    else if (style === "zero") { lo = 0; hi = rng.int(4, 50); }
    else if (style === "pos") { lo = rng.int(2, 40); hi = lo + rng.int(3, 25); }
    else if (style === "neg") { lo = -rng.int(2, 30); hi = rng.int(-1, 20); if (hi - lo < 3) hi = lo + 5; }
    else if (style === "cross") { lo = -rng.int(5, 20); hi = rng.int(5, 20); }
    else { step = rng.int(2, 5); lo = rng.int(0, 10); hi = lo + step * rng.int(3, 9); }
    let correct, list;
    if (step === 1) ({ correct, list } = rangeCandidates(lo, hi, rng, d));
    else {
      const count = (hi - lo) / step + 1;
      const term = k => bin("*", cast("int", bin("*", rnd(), lit(k))), lit(step));
      const plus = (e, c) => c === 0 ? e : bin("+", e, lit(c));
      correct = plus(term(count), lo);
      list = [
        { e: plus(cast("int", bin("*", rnd(), lit(hi - lo + 1))), lo), misc: "stepIgnored" },
        { e: plus(term(count + 1), lo), misc: "oneTooMany" },
        { e: plus(term(count - 1), lo), misc: "oneTooFew" },
        { e: plus(term(count), lo + 1), misc: "offsetInsideOnly" },
        { e: plus(cast("int", bin("*", bin("*", rnd(), lit(count)), lit(step))), lo), misc: "castPlacement" },
      ];
    }
    const target = R.possibleInts(correct);
    const desc = step === 1 ? `a random integer from ${lo} through ${hi}, inclusive` : `a random multiple of ${step} offset by ${lo} (${R.describeSet(target)})`;
    const answer = P.renderExpr(correct);
    const options = new Map([[answer, correct], ...list.map(x => [P.renderExpr(x.e), x.e])]);
    return {
      kind: "code-choice", shape: style,
      prompt: `Which expression produces ${desc}?`, code: "", answer,
      candidates: list.map(x => ({ text: P.renderExpr(x.e), misc: x.misc, set: R.possibleInts(x.e) })).filter(x => !R.sameSet(x.set, target)),
      optionCheck: o => R.sameSet(R.possibleInts(options.get(o)), target),
      explanation: H.lines(
        step === 1 ? `There are ${hi} - ${paren(lo)} + 1 = ${hi - lo + 1} values from ${lo} to ${hi}.` : `There are ${(hi - lo) / step + 1} multiples to choose from.`,
        `(int) (Math.random() * ${step === 1 ? hi - lo + 1 : (hi - lo) / step + 1}) gives 0 through ${step === 1 ? hi - lo : (hi - lo) / step}${step === 1 ? "" : `; × ${step} spaces them out`}; ${lo < 0 ? `subtracting ${-lo}` : `adding ${lo}`} shifts the start to ${lo}.`,
        `${answer} produces ${R.describeSet(target)}.`),
      verify: [...options.entries()].map(([, e]) => ({ type: "randomInts", expr: e, expect: R.possibleInts(e) })),
      optionSets: Object.fromEntries([...options.entries()].map(([t, e]) => [t, R.possibleInts(e)])),
      meta: { target },
    };
  },
};

// Debugging an incorrect range expression
const randomDebug = {
  id: "mm.random-debug", mode: MODE, label: "Debug a random range", skill: "Random integer ranges",
  weights: { beginner: 0, intermediate: 2, advanced: 3 },
  build(rng, d) {
    let lo = d === "advanced" ? rng.int(-20, 20) : rng.int(1, 30), hi = lo + rng.int(4, 25);
    const { correct, list } = rangeCandidates(lo, hi, rng, d);
    const target = R.possibleInts(correct);
    const bugs = list.filter(x => !R.sameSet(R.possibleInts(x.e), target));
    const bug = rng.pick(bugs);
    const actual = R.possibleInts(bug.e);
    const [n] = H.pickNames(rng, 1, ["roll", "pick", "card", "spin", "guess", "draw", "num", "slot"]);
    const shape = rng.pick(["actual-range", "fix"]);
    if (shape === "actual-range") {
      const mistakes = [{ text: R.describeSet(target), misc: "intendedRange" }, ...rangeMistakes(actual).map(m => ({ text: R.describeSet(m.set), misc: m.misc })), ...rangeMistakes(target).map(m => ({ text: R.describeSet(m.set), misc: m.misc }))];
      return {
        kind: "set-description", shape: `${shape}-${bug.misc}`,
        prompt: `A programmer wants ${n} to be a random integer from ${lo} through ${hi}, inclusive, but wrote the code below. Which values can ${n} actually hold?`,
        program: [decl("int", n, bug.e)], answer: R.describeSet(actual),
        candidates: mistakes.filter(m => m.text !== R.describeSet(actual)),
        optionCheck: o => o === R.describeSet(actual),
        explanation: H.lines(
          `Trace it: ${P.renderExpr(bug.e)} produces ${R.describeSet(actual)}.`,
          `The mistake: ${lowerFirst(H.misconceptionText(bug.misc))}.`,
          `A correct version is ${P.renderExpr(correct)}.`),
        verify: [{ type: "randomInts", expr: bug.e, expect: actual }, { type: "randomInts", expr: correct, expect: target }],
      };
    }
    const fixes = new Map([[P.renderExpr(correct), correct], ...bugs.filter(x => x !== bug).map(x => [P.renderExpr(x.e), x.e])]);
    return {
      kind: "code-choice", shape: `${shape}-${bug.misc}`,
      prompt: `This line should give ${n} a random integer from ${lo} through ${hi}, inclusive, but it produces ${R.describeSet(actual)}. Which replacement expression is correct?`,
      program: [decl("int", n, bug.e)], answer: P.renderExpr(correct),
      candidates: bugs.filter(x => x !== bug).map(x => ({ text: P.renderExpr(x.e), misc: x.misc })),
      optionCheck: o => R.sameSet(R.possibleInts(fixes.get(o)), target),
      explanation: H.lines(
        `The original fails because of this mistake: ${lowerFirst(H.misconceptionText(bug.misc))}.`,
        `${hi} - ${paren(lo)} + 1 = ${hi - lo + 1} values are needed, so multiply by ${hi - lo + 1}, truncate, then shift by ${lo}.`,
        `${P.renderExpr(correct)} produces ${R.describeSet(target)}.`),
      verify: [...fixes.values(), bug.e].map(e => ({ type: "randomInts", expr: e, expect: R.possibleInts(e) })),
      optionSets: Object.fromEntries([...fixes.entries()].map(([t, e]) => [t, R.possibleInts(e)])),
    };
  },
};

// G. Combined Math expressions (multi-statement)
const combined = {
  id: "mm.combined", mode: MODE, label: "Combined Math expressions", skill: "Combining Math methods",
  weights: { beginner: 1, intermediate: 3, advanced: 3 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["abs-sqrt", "pow-abs", "abs-sqrt"],
      intermediate: ["abs-pow", "sqrt-cast-sum", "max-min"],
      advanced: ["abs-pow-branch", "sqrt-pow-gap", "clamp", "pythag-cast"],
    }[d]);
    const [a, b, c] = H.pickNames(rng, 3);
    const [p] = H.pickNames(rng, 1, H.DOUBLE_NAMES, [a, b, c]);
    let program, explanation;
    if (shape === "abs-sqrt") {
      const r = rng.int(2, 15), x = -rng.int(2, 40);
      program = [print(bin("+", call("sqrt", lit(r * r)), call("abs", lit(x))))];
      explanation = H.lines(`Math.sqrt(${r * r}) = ${H.showDouble(r)}; Math.abs(${x}) = ${-x}.`, `double + int = double: ${H.showDouble(r - x)}.`);
      return H.outputDraft({ shape, program, flags: ["sqrtInt", "absNoop"], alts: [{ misc: "mixedStaysInt", program: [print(lit(r - x))] }], extras: [{ text: H.showDouble(r * r / 2 - x), misc: "sqrtHalf" }], prompt: "What is printed?", explanation });
    }
    if (shape === "pow-abs") {
      const x = -rng.int(2, 12), e = rng.int(2, 3), k = rng.int(1, 30);
      program = [decl("int", a, lit(x)), print(bin("+", call("pow", call("abs", ref(a)), lit(e)), lit(k)))];
      const v = Math.pow(-x, e) + k;
      explanation = H.lines(`Math.abs(${a}) = Math.abs(${x}) = ${-x}.`, `Math.pow(${-x}, ${e}) = ${H.showDouble(Math.pow(-x, e))}, a double.`, `Adding ${k} gives ${H.showDouble(v)}.`);
      return H.outputDraft({ shape, program, flags: ["powInt", "powMultiply", "absNoop"], extras: [{ text: H.showDouble(-x * e + k), misc: "powMultiply" }], prompt: "What is printed?", explanation });
    }
    if (shape === "abs-pow" || shape === "abs-pow-branch") {
      const x = rng.int(1, 12), y = x + rng.int(2, 6) * (rng.chance(0.5) ? 1 : -1);
      if (y < -20) return null;
      const dist = Math.abs(x - y), sq = dist * dist, t = rng.int(5, 40);
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("int", c, call("abs", bin("-", ref(a), ref(b)))),
        decl("double", p, call("pow", ref(c), lit(2)))];
      if (shape === "abs-pow") program.push(print(bin("+", ref(p), ref(c))));
      else program.push(ifs(bin(">", ref(p), lit(t)), [print(bin("-", ref(p), lit(t)))], [print(bin("*", ref(c), lit(2)))]));
      explanation = H.lines(`${c} = Math.abs(${x} - ${y}) = ${dist}.`, `${p} = Math.pow(${dist}, 2) = ${H.showDouble(sq)}.`,
        shape === "abs-pow" ? `${p} + ${c} = ${H.showDouble(sq + dist)} (double + int is a double).`
          : `${H.showDouble(sq)} > ${t} is ${sq > t}, so it prints ${sq > t ? H.showDouble(sq - t) : dist * 2}.`);
      return H.outputDraft({ shape, program, flags: ["absNoop", "powMultiply", "powInt", "absNegate"], prompt: "What is printed?", explanation });
    }
    if (shape === "sqrt-cast-sum" || shape === "pythag-cast") {
      let n; do { n = rng.int(10, 120); } while (Number.isInteger(Math.sqrt(n)));
      const m = rng.int(2, 9);
      const root = Math.floor(Math.sqrt(n));
      if (shape === "sqrt-cast-sum") {
        program = [decl("int", a, cast("int", call("sqrt", lit(n)))), decl("int", b, bin("%", ref(a), lit(m))), print(bin("+", ref(a), ref(b)))];
        explanation = H.lines(`(int) Math.sqrt(${n}) truncates ${Math.sqrt(n).toFixed(3)} to ${root}.`, `${b} = ${root} % ${m} = ${root % m}.`, `${root} + ${root % m} = ${root + root % m}.`);
        return H.outputDraft({ shape, program, flags: ["castRounds", "remAbs", "intDivReal"], alts: [{ misc: "sqrtHalf", program: [decl("int", a, lit(Math.trunc(n / 2))), decl("int", b, bin("%", ref(a), lit(m))), print(bin("+", ref(a), ref(b)))] }], prompt: "What is printed?", explanation });
      }
      const [x, y, z] = rng.pick(TRIPLES);
      const k = rng.int(2, 4);
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("int", c, cast("int", call("sqrt", bin("+", call("pow", ref(a), lit(2)), call("pow", ref(b), lit(2)))))), print(bin("/", ref(c), lit(k)))];
      explanation = H.lines(`Math.pow(${x}, 2) + Math.pow(${y}, 2) = ${H.showDouble(x * x + y * y)}.`, `Math.sqrt gives ${H.showDouble(z)}; the cast makes it the int ${z}.`, `${z} / ${k} is int division: ${Math.trunc(z / k)}.`);
      if (z % k === 0) return null;
      return H.outputDraft({ shape, program, flags: ["intDivReal", "intDivRound", "powMultiply"], alts: [{ misc: "sqrtDistributes", program: [print(bin("/", lit(x + y), lit(k)))] }], prompt: "What is printed?", explanation });
    }
    if (shape === "max-min" || shape === "clamp") {
      const lo = rng.int(0, 10), hi = lo + rng.int(5, 30), v = rng.chance(0.5) ? hi + rng.int(1, 20) : lo - rng.int(1, 20);
      if (shape === "max-min") {
        program = [decl("int", a, lit(v)), print(bin("+", call("max", ref(a), lit(lo)), call("min", ref(a), lit(hi))))];
        explanation = H.lines(`Math.max(${v}, ${lo}) = ${Math.max(v, lo)}; Math.min(${v}, ${hi}) = ${Math.min(v, hi)}.`, `Their sum is ${Math.max(v, lo) + Math.min(v, hi)}.`);
        return H.outputDraft({ shape, program, flags: [], alts: [{ misc: "maxMinSwap", program: [print(lit(Math.min(v, lo) + Math.max(v, hi)))] }, { misc: "methodReturnsDouble", program: [print(dlit(Math.max(v, lo) + Math.min(v, hi)))] }, { misc: "maxMinBounds", program: [print(lit(lo + hi))] }], prompt: "What is printed?", explanation });
      }
      const x = -rng.int(2, 15);
      program = [decl("int", a, lit(v)), decl("int", b, call("max", lit(lo), call("min", lit(hi), ref(a)))), decl("int", c, call("abs", bin("-", ref(b), lit(-x)))), print(bin("*", ref(c), lit(2)))];
      const clamped = Math.max(lo, Math.min(hi, v));
      explanation = H.lines(`Math.min(${hi}, ${v}) = ${Math.min(hi, v)}, then Math.max(${lo}, that) = ${clamped}: ${b} is ${v} clamped to [${lo}, ${hi}].`, `${c} = Math.abs(${clamped} - ${-x}) = ${Math.abs(clamped + x)}.`, `${c} * 2 = ${Math.abs(clamped + x) * 2}.`);
      return H.outputDraft({ shape, program, flags: ["absNoop"], alts: [{ misc: "clampIgnored", program: [print(lit(Math.abs(v + x) * 2))] }, { misc: "maxMinSwap", program: [print(lit(Math.abs((clamped === lo ? hi : lo) + x) * 2))] }, { misc: "methodReturnsDouble", program: [print(dlit(Math.abs(clamped + x) * 2))] }], prompt: "What is printed?", explanation });
    }
    // sqrt-pow-gap
    let n; do { n = rng.int(20, 200); } while (Number.isInteger(Math.sqrt(n)));
    const s = Math.floor(Math.sqrt(n));
    program = [decl("int", a, lit(n)), decl("int", b, cast("int", call("sqrt", ref(a)))), decl("double", p, call("pow", bin("+", ref(b), lit(1)), lit(2))), print(bin("-", ref(p), ref(a)))];
    explanation = H.lines(`${b} = (int) Math.sqrt(${n}) = ${s}.`, `${p} = Math.pow(${s} + 1, 2) = ${H.showDouble((s + 1) ** 2)}.`, `${H.showDouble((s + 1) ** 2)} - ${n} = ${H.showDouble((s + 1) ** 2 - n)}: how far ${n} is below the next perfect square.`);
    return H.outputDraft({ shape, program, flags: ["castRounds", "powInt", "powMultiply"], prompt: "What is printed?", explanation });
  },
};

// Supplied random value: predict the result when the random number is given.
const suppliedRandom = {
  id: "mm.supplied-random", mode: MODE, label: "Trace with a given random value", skill: "Math.random() transformation",
  weights: { beginner: 2, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const k = rng.pick(d === "beginner" ? [6, 10, 20] : [6, 8, 12, 20, 50, 100]);
    const lo = d === "beginner" ? 1 : d === "intermediate" ? rng.int(2, 30) : -rng.int(2, 30);
    let r;
    // r has up to three decimals; reject values whose scaled product sits on or near a whole number.
    do { r = rng.int(1, 999) / 1000; } while (Math.abs(r * k - Math.round(r * k)) < 0.05);
    const [rv] = H.pickNames(rng, 1, ["r", "rand", "chance", "x"]);
    const [n] = H.pickNames(rng, 1, ["roll", "pick", "card", "spin", "num", "slot"]);
    const plus = (e, c) => c === 0 ? e : c > 0 ? bin("+", e, lit(c)) : bin("-", e, lit(-c));
    const m = rng.int(2, 4);
    const make = (expr, castFn = e => e) => {
      const body = [decl("double", rv, dlit(r)), decl("int", n, expr)];
      if (d === "advanced") body.push(decl("int", "scaled", bin("*", ref(n), lit(m))), print(bin("+", bin("+", ref(n), slit(" ")), ref("scaled"))));
      else body.push(print(ref(n)));
      return body;
    };
    const scaledCast = cast("int", bin("*", ref(rv), lit(k)));
    const program = make(plus(scaledCast, lo));
    const scaled = r * k, cut = Math.trunc(scaled), value = cut + lo;
    return H.outputDraft({
      shape: `supplied-${d}`, program, flags: ["castRounds", "castFloors"],
      alts: [
        { misc: "missingOffset", program: make(scaledCast) },
        { misc: "oneTooMany", program: make(plus(scaledCast, lo + 1)) },
        { misc: "castPlacement", program: make(plus(bin("*", cast("int", ref(rv)), lit(k)), lo)) },
      ],
      prompt: `Suppose Math.random() returned ${H.showDouble(r)}, stored in ${rv} below. What is printed?`,
      explanation: H.lines(`${rv} * ${k} = ${H.showDouble(scaled)}.`, `The (int) cast truncates it to ${cut}; it does not round.`,
        `${cut} ${lo >= 0 ? "+" : "-"} ${Math.abs(lo)} = ${value}.`, d === "advanced" ? `scaled = ${value} * ${m} = ${value * m}, so it prints "${value} ${value * m}".` : ""),
    });
  },
};

export const METHODS_FAMILIES = [abs, pow, sqrt, returnType, randomBasics, randomBounds, randomValues, randomCount, randomChoose, randomDebug, combined, suppliedRandom];
