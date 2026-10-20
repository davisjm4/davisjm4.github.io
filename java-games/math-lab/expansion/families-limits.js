// Math Lab expansion — Mode 2: Numeric Limits, Overflow & Round-off.
import * as P from "./java-program.js";
import * as N from "./java-numeric.js";
import * as H from "./gen-helpers.js";

const { lit, dlit, llit, bigIntLiteral, ref, K, bin, cast, call, grp, decl, assign, incdec, print, slit, loop, neg } = P;
const MODE = "numeric-limits";
const MAX = N.INT_MAX, MIN = N.INT_MIN;
const wrap = v => Number(BigInt.asIntN(32, BigInt(v)));
const pair = (x, y) => bin("+", bin("+", x, slit(" ")), y);  // x + " " + y
const show = v => H.showDouble(v);
const nextUp = x => { const b = new Float64Array([x]), i = new BigInt64Array(b.buffer); i[0] += x >= 0 ? 1n : -1n; return b[0]; };
const nextDown = x => { const b = new Float64Array([x]), i = new BigInt64Array(b.buffer); i[0] += x > 0 ? -1n : 1n; return b[0]; };
const OVERFLOW_FLAGS = ["noOverflow", "overflowThrows", "overflowClamps"];

// A. Integer maximum and minimum ------------------------------------------------
const intLimits = {
  id: "nl.int-limits", mode: MODE, label: "Integer limits", skill: "Integer.MAX_VALUE and Integer.MIN_VALUE",
  weights: { beginner: 4, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["max-inc", "min-dec", "max-plus", "min-minus"],
      intermediate: ["near-max", "near-min", "double-max", "round-trip"],
      advanced: ["negate-min", "near-max-compare", "max-times"],
    }[d]);
    const [n, m] = H.pickNames(rng, 2);
    const k = shape === "max-plus" || shape === "min-minus" ? rng.int(1, 200) : rng.int(1, 9);
    let program, explanation;
    if (shape === "max-inc" || shape === "min-dec") {
      const max = shape === "max-inc";
      const step = k === 1 ? incdec(n, max ? "++" : "--") : assign(n, max ? "+=" : "-=", lit(k));
      program = [decl("int", n, K(max ? "Integer.MAX_VALUE" : "Integer.MIN_VALUE")), step, print(ref(n))];
      const v = wrap((max ? MAX : MIN) + (max ? k : -k));
      explanation = H.lines(
        `${n} starts at ${max ? "Integer.MAX_VALUE (2147483647)" : "Integer.MIN_VALUE (-2147483648)"}.`,
        `${max ? "Adding" : "Subtracting"} ${k} goes past the ${max ? "largest" : "smallest"} int, so the value wraps around to the other end of the range: ${v}.`,
        "Java does not throw an exception for int overflow and does not stop at the limit.");
    } else if (shape === "max-plus" || shape === "min-minus") {
      const max = shape === "max-plus";
      program = [print(bin(max ? "+" : "-", K(max ? "Integer.MAX_VALUE" : "Integer.MIN_VALUE"), lit(k)))];
      const v = wrap((max ? MAX : MIN) + (max ? k : -k));
      explanation = H.lines(`The exact result, ${(max ? MAX : MIN) + (max ? k : -k)}, is outside the int range.`, `In 32-bit int arithmetic it wraps around to ${v}.`);
    } else if (shape === "near-max" || shape === "near-min") {
      const max = shape === "near-max", gap = rng.int(2, 50), step = gap + rng.int(1, 30);
      const start = max ? MAX - gap : MIN + gap;
      program = [decl("int", n, lit(start)), assign(n, max ? "+=" : "-=", lit(step)), print(ref(n))];
      const v = wrap(start + (max ? step : -step));
      explanation = H.lines(
        `${n} is ${gap} ${max ? "below Integer.MAX_VALUE" : "above Integer.MIN_VALUE"}.`,
        `${max ? "Adding" : "Subtracting"} ${step} overshoots by ${step - gap}, so the result wraps to the other end: ${v}.`);
    } else if (shape === "double-max") {
      const mult = rng.int(2, 9);
      program = [decl("int", n, bin("*", K("Integer.MAX_VALUE"), lit(mult))), print(ref(n))];
      explanation = H.lines(`The exact product is ${MAX * mult}, which needs more than 32 bits.`, `Keeping only the low 32 bits leaves ${wrap(MAX * mult)}.`);
    } else if (shape === "round-trip") {
      program = [decl("int", n, K("Integer.MAX_VALUE")), incdec(n, "++"), print(ref(n)), incdec(n, "--"), print(ref(n))];
      explanation = H.lines(`${n}++ wraps Integer.MAX_VALUE to Integer.MIN_VALUE (-2147483648).`, `${n}-- wraps it back to 2147483647: wrapping is reversible, and no exception occurs.`);
    } else if (shape === "negate-min") {
      program = [decl("int", n, K("Integer.MIN_VALUE")), decl("int", m, neg(ref(n))), print(pair(ref(m), grp(bin("==", ref(m), ref(n)))))];
      explanation = H.lines(`-${n} should be 2147483648, but that is one more than Integer.MAX_VALUE.`, `It wraps to -2147483648, so ${m} equals ${n} and the comparison prints true.`);
      return H.outputDraft({ shape, program, flags: OVERFLOW_FLAGS, extras: [{ text: "-2147483648 false", misc: "noMinusLiteral" }], prompt: "What is printed?", explanation });
    } else if (shape === "near-max-compare") {
      const gap = rng.int(1, 20), step = gap + rng.int(1, 40);
      program = [decl("int", n, bin("-", K("Integer.MAX_VALUE"), lit(gap))), assign(n, "=", bin("+", ref(n), lit(step))), print(pair(ref(n), grp(bin(">", ref(n), lit(0)))))];
      const v = wrap(MAX - gap + step);
      explanation = H.lines(`${n} starts at ${MAX - gap}. Adding ${step} exceeds the maximum by ${step - gap}.`, `The sum wraps to ${v}, a negative number, so ${n} > 0 is false.`);
    } else {
      const half = Math.floor(MAX / 2), extra = rng.int(1, 9);
      program = [decl("int", n, bin("+", bin("/", K("Integer.MAX_VALUE"), lit(2)), lit(extra))), decl("int", m, bin("*", ref(n), lit(2))), print(ref(m))];
      explanation = H.lines(`Integer.MAX_VALUE / 2 is ${half} (int division), so ${n} = ${half + extra}.`, `${n} * 2 = ${(half + extra) * 2} exactly, which is above 2147483647.`, `It wraps to ${wrap((half + extra) * 2)}.`);
    }
    return H.outputDraft({ shape, program, flags: OVERFLOW_FLAGS, prompt: "What is printed?", explanation });
  },
};

// B. Arithmetic overflow ----------------------------------------------------------
const overflowMultiply = {
  id: "nl.overflow-multiply", mode: MODE, label: "Overflow in multiplication", skill: "Integer overflow",
  weights: { beginner: 2, intermediate: 3, advanced: 3 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["product"],
      intermediate: ["product", "millis", "running"],
      advanced: ["long-destination", "long-fix", "cast-after", "doubling"],
    }[d]);
    const [a, b, c] = H.pickNames(rng, 3);
    if (shape === "product" || shape === "long-destination" || shape === "long-fix" || shape === "cast-after") {
      let x, y, guard = 0;
      do {
        x = rng.pick([20000, 30000, 40000, 50000, 60000, 70000, 80000, 100000, rng.int(2, 9) * 10000 + rng.int(1, 9) * 1000]);
        y = rng.pick([x, rng.int(3, 9) * 10000, 50000]);
      } while ((x * y <= MAX || x * y > 2 ** 34) && guard++ < 50);
      if (x * y <= MAX || x * y > 2 ** 34) return null;
      const target = shape === "product" ? "int" : "long";
      const prod = shape === "long-fix" ? bin("*", cast("long", ref(a)), ref(b)) : shape === "cast-after" ? cast("long", grp(bin("*", ref(a), ref(b)))) : bin("*", ref(a), ref(b));
      const program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl(target, c, prod), print(ref(c))];
      const exact = x * y, wrapped = wrap(exact);
      const extras = [{ text: String(exact), misc: shape === "long-destination" ? "longDestination" : shape === "cast-after" ? "castLate" : "noOverflow" },
        { text: "Throws ArithmeticException", misc: "overflowThrows" }, { text: String(MAX), misc: "overflowClamps" }];
      if (shape === "long-fix") extras.push({ text: String(wrapped), misc: "castLate" });
      return H.outputDraft({
        shape, program, flags: shape === "long-fix" ? [] : OVERFLOW_FLAGS, extras,
        prompt: "What is printed?",
        explanation: H.lines(
          `The exact product ${x} × ${y} is ${exact}, larger than Integer.MAX_VALUE (2147483647).`,
          shape === "long-fix" ? `(long) ${a} converts ${a} first, so the multiplication is done in 64-bit long arithmetic and prints ${exact}.`
            : shape === "long-destination" ? `${a} * ${b} is int * int, so it is calculated in int arithmetic and wraps to ${wrapped} BEFORE it is stored. The long variable only receives the already-wrapped value.`
              : shape === "cast-after" ? `The parentheses make ${a} * ${b} happen first, in int arithmetic, wrapping to ${wrapped}. Casting afterward cannot recover the lost value.`
                : `int multiplication keeps only the low 32 bits, so the result wraps to ${wrapped}. No exception is thrown.`),
      });
    }
    if (shape === "millis") {
      const days = rng.int(25, 60);
      const [dn, ms] = rng.pick([["days", "millis"], ["d", "ms"], ["numDays", "totalMs"]]);
      const program = [decl("int", dn, lit(days)), decl("int", ms, bin("*", bin("*", bin("*", bin("*", ref(dn), lit(24)), lit(60)), lit(60)), lit(1000))), print(ref(ms))];
      return H.outputDraft({
        shape, program, flags: OVERFLOW_FLAGS, prompt: `This code converts days to milliseconds. What is printed?`,
        explanation: H.lines(`${days} days is ${days * 86400000} milliseconds, which exceeds 2147483647 (about 24.8 days' worth).`, `The int multiplication wraps, printing ${wrap(days * 86400000)}.`),
      });
    }
    if (shape === "running") {
      const start = rng.int(4, 9) * 100000000, step = rng.int(3, 9) * 100000000, times = rng.int(2, 3);
      if (start + step * times <= MAX) return null;
      const program = [decl("int", a, lit(start)), loop("i", times, [assign(a, "+=", lit(step))]), print(ref(a))];
      let v = start; for (let i = 0; i < times; i++) v = wrap(v + step);
      return H.outputDraft({
        shape, program, flags: OVERFLOW_FLAGS, prompt: "What is printed?",
        explanation: H.lines(`${a} becomes ${start} + ${times} × ${step} = ${start + step * times} in exact arithmetic.`, `That is above 2147483647, so the int wraps to ${v}.`),
      });
    }
    // doubling
    const times = rng.pick([30, 31, 32, 33, rng.int(29, 34)]);
    const program = [decl("int", a, lit(1)), loop("i", times, [assign(a, "*=", lit(2))]), print(ref(a))];
    const v = wrap(2 ** times);
    return H.outputDraft({
      shape: `doubling-${times}`, program, flags: OVERFLOW_FLAGS, prompt: "What is printed?",
      explanation: H.lines(`Doubling 1 ${times} times gives 2^${times} = ${2 ** times} in exact arithmetic.`,
        times <= 30 ? "That still fits in an int." : times === 31 ? "2^31 is one more than Integer.MAX_VALUE, so it wraps to Integer.MIN_VALUE." : "In 32-bit arithmetic, 2^31 wraps to Integer.MIN_VALUE and doubling that wraps to 0; after that it stays 0.",
        `It prints ${v}.`),
    });
  },
};

// Which expression overflows? -------------------------------------------------
function overflowOption(rng, overflow) {
  const kind = rng.pick(["product", "sum", "min", "square"]);
  if (kind === "product") {
    const x = rng.int(2, 9) * 10 ** rng.int(4, 5);
    const limit = Math.floor(MAX / x);
    let y = overflow ? limit + 1 + rng.int(0, Math.floor(limit / 2)) : limit - rng.int(0, Math.floor(limit / 4));
    y = Number(y.toPrecision(2));
    if (y < 2 || x * y > 2 ** 34 || (x * y > MAX) !== overflow) return null;
    return { e: bin("*", lit(x), lit(y)), misc: overflow ? null : "largeNotOverflow" };
  }
  if (kind === "sum") {
    const gap = rng.int(1, 1000), add = overflow ? gap + rng.int(1, 1000) : rng.int(0, gap);
    return { e: bin("+", bin("-", K("Integer.MAX_VALUE"), lit(gap)), lit(add)), misc: overflow ? null : "startAtMax" };
  }
  if (kind === "min") {
    const gap = rng.int(1, 500), sub = overflow ? gap + rng.int(1, 500) : rng.int(0, gap);
    return { e: bin("-", bin("+", K("Integer.MIN_VALUE"), lit(gap)), lit(sub)), misc: overflow ? null : "startAtMax" };
  }
  const r = overflow ? rng.int(46341, 47000) : rng.int(45000, 46340);
  return { e: bin("*", lit(r), lit(r)), misc: overflow ? null : "largeNotOverflow" };
}
export function exactInt(e) {
  // Exact (unbounded) value of an int-typed expression built from literals and constants.
  switch (e.k) {
    case "lit": return BigInt(e.v);
    case "const": return BigInt(P.CONSTANTS[e.name].v);
    case "group": return exactInt(e.e);
    case "neg": return -exactInt(e.e);
    case "bin": {
      const x = exactInt(e.l), y = exactInt(e.r);
      return e.op === "+" ? x + y : e.op === "-" ? x - y : e.op === "*" ? x * y : x / y;
    }
  }
  throw new Error("exactInt: " + e.k);
}
/** True if ANY intermediate int result leaves the 32-bit range. */
export function overflows(e) {
  let bad = false;
  P.walkExpr(e, x => { if (x.k === "bin" || x.k === "neg") { const v = exactInt(x); if (v > BigInt(MAX) || v < BigInt(MIN)) bad = true; } });
  return bad;
}
const overflowDetect = {
  id: "nl.overflow-detect", mode: MODE, label: "Spot the overflow", skill: "Integer overflow",
  weights: { beginner: 0, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const want = rng.chance(d === "advanced" ? 0.5 : 0.75);  // true: "which overflows?"
    const options = [];
    let guard = 0;
    while (options.length < 6 && guard++ < 80) {
      const o = overflowOption(rng, options.length === 0 ? want : !want);
      if (o && !options.some(x => P.renderExpr(x.e) === P.renderExpr(o.e))) options.push(o);
    }
    if (options.length < 4) return null;
    const text = o => P.renderExpr(o.e);
    return {
      kind: "code-choice", shape: want ? "which-overflows" : "which-safe",
      prompt: want ? "Which int expression overflows?" : "Which int expression does NOT overflow?",
      code: "", answer: text(options[0]),
      candidates: options.slice(1).map(o => ({ text: text(o), misc: want ? (o.misc || "largeNotOverflow") : o.e.op === "*" ? "productFits" : "sumNotWrapped" })),
      optionCheck: t => overflows(options.find(o => text(o) === t).e) === want,
      explanationFor: shown => H.lines(
        "An int holds -2147483648 through 2147483647. An expression overflows when an exact intermediate result falls outside that range.",
        ...shown.map(t => { const o = options.find(x => text(x) === t); return `${t}: exact value ${exactInt(o.e)}${overflows(o.e) ? " — overflows" : " — fits"}.`; })),
      explanation: "",
      verify: options.map(o => ({ type: "overflows", expr: o.e, expect: overflows(o.e) })),
    };
  },
};

// Midpoint (binary-search) overflow and truncation ------------------------------
const midpoint = {
  id: "nl.midpoint", mode: MODE, label: "Averages of two ints", skill: "Integer overflow",
  weights: { beginner: 1, intermediate: 2, advanced: 3 },
  build(rng, d) {
    const shape = rng.pick({ beginner: ["small-odd"], intermediate: ["small-odd", "negative-odd"], advanced: ["overflow", "both"] }[d]);
    const [lo, hi, mid] = rng.pick([["low", "high", "mid"], ["left", "right", "middle"], ["first", "last", "center"]]);
    let x, y;
    if (shape === "small-odd") { x = rng.int(0, 40); y = x + 2 * rng.int(1, 30) + 1; }
    else if (shape === "negative-odd") { x = -rng.int(10, 60); y = rng.int(-9, 20); if ((x + y) % 2 === 0) y++; if (x + y >= 0) return null; }
    else { x = rng.int(11, 20) * 100000000; y = x + rng.int(1, 9) * 10000000 + rng.int(0, 9); if (x + y <= MAX || y > MAX) return null; }
    const naive = bin("/", grp(bin("+", ref(lo), ref(hi))), lit(2));
    const safe = bin("+", ref(lo), bin("/", grp(bin("-", ref(hi), ref(lo))), lit(2)));
    const program = [decl("int", lo, lit(x)), decl("int", hi, lit(y)),
      ...(shape === "both" ? [print(pair(naive, safe))] : [decl("int", mid, naive), print(ref(mid))])];
    const sum = x + y;
    return H.outputDraft({
      shape, program, flags: ["noOverflow", "overflowThrows", "intDivRound", "intDivFloor", "intDivReal"],
      extras: shape === "overflow" ? [{ text: String(x + Math.trunc((y - x) / 2)), misc: "safeMidpoint" }]
        : shape === "both" ? [{ text: `${x + Math.trunc((y - x) / 2)} ${x + Math.trunc((y - x) / 2)}`, misc: "noOverflow" }, { text: `${wrap(sum)} ${x + Math.trunc((y - x) / 2)}`, misc: "forgotDivide" }]
          : [{ text: show(sum / 2), misc: "intDivReal" }, { text: show(Math.trunc(sum / 2)), misc: "divisionGivesDouble" }, { text: String(Math.floor(sum / 2)), misc: "intDivFloor" }, { text: String(Math.trunc(sum / 2) + 1), misc: "intDivRound" }],
      prompt: "What is printed?",
      explanation: shape === "small-odd" || shape === "negative-odd"
        ? H.lines(`${lo} + ${hi} = ${sum}. int division by 2 truncates toward zero: ${sum} / 2 = ${Math.trunc(sum / 2)}.`, shape === "negative-odd" ? "For a negative sum, truncating toward zero moves up, not down." : "The .5 is discarded, not rounded.")
        : H.lines(`${lo} + ${hi} = ${sum} exactly, which is above 2147483647, so the int sum wraps to ${wrap(sum)}.`,
          `Dividing the wrapped sum by 2 gives ${Math.trunc(wrap(sum) / 2)}.`,
          shape === "both" ? `${lo} + (${hi} - ${lo}) / 2 never forms the big sum: ${y - x} / 2 = ${Math.trunc((y - x) / 2)}, plus ${lo} is ${x + Math.trunc((y - x) / 2)}.` : `The overflow-safe version is ${lo} + (${hi} - ${lo}) / 2.`),
    });
  },
};

// C. Integer division and casting -------------------------------------------------
const intDivision = {
  id: "nl.int-division", mode: MODE, label: "Integer division and casts", skill: "Integer division and casting",
  weights: { beginner: 3, intermediate: 3, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["double-dest", "int-dest", "cast-before"],
      intermediate: ["cast-after", "negative", "cast-divisor", "mixed-sum"],
      advanced: ["reassemble", "chain", "mixed-negative", "two-casts"],
    }[d]);
    const [a, b] = H.pickNames(rng, 2);
    const [r] = H.pickNames(rng, 1, H.DOUBLE_NAMES, [a, b]);
    let x = rng.int(7, 60);
    const y = rng.pick([2, 4, 8, rng.int(3, 9)]);
    if (x % y === 0) x++;
    if (shape === "negative" || shape === "mixed-negative") x = -x;
    const clean = y === 2 || y === 4 || y === 8;  // exact double quotient
    let program, explanation;
    const q = Math.trunc(x / y);
    if (shape === "double-dest") {
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("double", r, bin("/", ref(a), ref(b))), print(ref(r))];
      explanation = H.lines(`${a} / ${b} divides two ints, so Java uses integer division: ${x} / ${y} = ${q}.`, `Only then is ${q} stored in the double, so it prints ${show(q)}. The destination type does not change how the division is done.`);
    } else if (shape === "int-dest") {
      program = [print(bin("/", lit(x), lit(y)))];
      explanation = H.lines(`${x} / ${y} is int / int, so the fractional part is discarded: ${q}.`, "Integer division truncates; it does not round.");
    } else if (shape === "cast-before" || shape === "cast-divisor") {
      if (!clean) return null;
      const expr = shape === "cast-before" ? bin("/", cast("double", ref(a)), ref(b)) : bin("/", ref(a), cast("double", ref(b)));
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("double", r, expr), print(ref(r))];
      explanation = H.lines(`The cast applies to ${shape === "cast-before" ? a : b} only, before dividing.`, `With one double operand, the division is floating-point: ${show(x / y)}.`);
      return H.outputDraft({ shape, program, flags: ["intDivRound"], extras: [{ text: show(q), misc: "castLate" }, { text: String(q), misc: "doubleShowsInt" }, { text: show(Math.round(x / y)), misc: "intDivRound" }], prompt: "What is printed?", explanation });
    } else if (shape === "cast-after") {
      if (!clean) return null;
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("double", r, cast("double", grp(bin("/", ref(a), ref(b))))), print(ref(r))];
      explanation = H.lines(`The parentheses force ${a} / ${b} to happen first, as integer division: ${q}.`, `Casting ${q} to double gives ${show(q)}; the lost fraction cannot come back.`);
      return H.outputDraft({ shape, program, flags: ["intDivRound"], extras: [{ text: show(x / y), misc: "wrongOperandCast" }, { text: String(q), misc: "doubleShowsInt" }], prompt: "What is printed?", explanation });
    } else if (shape === "negative") {
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), print(pair(bin("/", ref(a), ref(b)), bin("%", ref(a), ref(b))))];
      explanation = H.lines(`${x} / ${y} truncates toward zero: ${q} (not ${Math.floor(x / y)}).`, `The remainder keeps the dividend's sign: ${x} - (${q} × ${y}) = ${x % y}.`);
      return H.outputDraft({ shape, program, flags: ["intDivFloor", "intDivRound", "remAbs"], extras: [{ text: `${Math.floor(x / y)} ${((x % y) + y) % y}`, misc: "intDivFloor" }], prompt: "What is printed?", explanation });
    } else if (shape === "mixed-sum") {
      if (!clean) return null;
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), print(bin("+", bin("/", ref(a), ref(b)), bin("/", ref(a), dlit(y))))];
      explanation = H.lines(`${a} / ${b} is integer division: ${q}.`, `${a} / ${show(y)} is floating-point division: ${show(x / y)}.`, `${q} + ${show(x / y)} = ${show(q + x / y)}.`);
    } else if (shape === "reassemble") {
      const c = rng.int(2, 5);
      const [qn, rn] = rng.pick([["q", "rem"], ["whole", "extra"], ["groups", "left"]]);
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("int", qn, bin("/", ref(a), ref(b))), decl("int", rn, bin("%", ref(a), ref(b))),
        print(bin("+", bin("*", ref(qn), lit(c)), ref(rn)))];
      explanation = H.lines(`${qn} = ${x} / ${y} = ${q} and ${rn} = ${x} % ${y} = ${x % y}.`, `${qn} * ${c} + ${rn} = ${q * c} + ${x % y} = ${q * c + (x % y)}.`);
    } else if (shape === "chain") {
      const c = rng.int(2, 9);
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), print(pair(bin("*", bin("/", ref(a), ref(b)), lit(c)), bin("/", bin("*", ref(a), lit(c)), ref(b))))];
      explanation = H.lines(`Left to right: ${a} / ${b} * ${c} = ${q} * ${c} = ${q * c} (the fraction is lost first).`, `${a} * ${c} / ${b} = ${x * c} / ${y} = ${Math.trunc(x * c / y)} (truncation happens last).`, "Order matters in integer arithmetic.");
      if (q * c === Math.trunc(x * c / y)) return null;
      return H.outputDraft({ shape, program, flags: ["intDivReal", "intDivRound"], prompt: "What is printed?", explanation,
        extras: [{ text: `${q * c} ${q * c}`, misc: "orderIrrelevant" }, { text: `${Math.trunc(x * c / y)} ${Math.trunc(x * c / y)}`, misc: "orderIrrelevant" }, { text: `${Math.trunc(x * c / y)} ${q * c}`, misc: "rightToLeft" }] });
    } else if (shape === "mixed-negative") {
      if (!clean) return null;
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("double", r, bin("+", bin("/", ref(a), ref(b)), bin("/", cast("double", ref(a)), ref(b)))), print(ref(r))];
      explanation = H.lines(`${a} / ${b} is integer division toward zero: ${q}.`, `(double) ${a} / ${b} = ${show(x / y)}.`, `${q} + ${show(x / y)} = ${show(q + x / y)}.`);
      return H.outputDraft({ shape, program, flags: ["intDivReal", "intDivFloor"], prompt: "What is printed?", explanation,
        extras: [{ text: show(2 * q), misc: "wrongOperandCast" }, { text: show(Math.floor(x / y) + x / y), misc: "intDivFloor" }, { text: show(Math.round(x / y) + x / y), misc: "intDivRound" }] });
    } else {
      if (!clean) return null;
      const c = rng.int(2, 5);
      program = [decl("int", a, lit(x)), decl("int", b, lit(y)), decl("double", r, bin("*", cast("double", grp(bin("/", ref(a), ref(b)))), lit(c))),
        print(pair(ref(r), cast("int", grp(bin("*", bin("/", cast("double", ref(a)), ref(b)), lit(c))))))];
      explanation = H.lines(`(double) (${a} / ${b}): integer division first gives ${q}, then ${show(q)} × ${c} = ${show(q * c)}.`, `(int) ((double) ${a} / ${b} * ${c}): ${show(x / y)} × ${c} = ${show(x / y * c)}, truncated to ${Math.trunc(x / y * c)}.`);
    }
    return H.outputDraft({ shape, program, flags: ["intDivReal", "intDivRound", "intDivFloor", "remAbs", "doubleShowsInt"], prompt: "What is printed?", explanation });
  },
};

// Averages: rounding too early ------------------------------------------------
const average = {
  id: "nl.average", mode: MODE, label: "Averages and early truncation", skill: "Integer division and casting",
  weights: { beginner: 2, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({ beginner: ["two-ints"], intermediate: ["three-ints", "fixed-three"], advanced: ["difference", "percent"] }[d]);
    const names = rng.pick([["quiz1", "quiz2", "quiz3"], ["day1", "day2", "day3"], ["a", "b", "c"], ["red", "green", "blue"]]);
    const [s] = H.pickNames(rng, 1, ["avg", "mean", "result"]);
    let vals, program, explanation;
    if (shape === "two-ints") {
      vals = [rng.int(60, 100), rng.int(60, 100)];
      if ((vals[0] + vals[1]) % 2 === 0) vals[1]--;
      program = [decl("int", names[0], lit(vals[0])), decl("int", names[1], lit(vals[1])), decl("double", s, bin("/", grp(bin("+", ref(names[0]), ref(names[1]))), lit(2))), print(ref(s))];
      const sum = vals[0] + vals[1];
      explanation = H.lines(`The sum ${sum} and the 2 are both ints, so ${sum} / 2 is integer division: ${Math.trunc(sum / 2)}.`, `It is stored as ${show(Math.trunc(sum / 2))}. Writing 2.0 would give ${show(sum / 2)}.`);
      return H.outputDraft({ shape, program, flags: ["intDivReal", "intDivRound", "doubleShowsInt"], prompt: "What is printed?", explanation });
    }
    vals = [rng.int(50, 100), rng.int(50, 100), rng.int(50, 100)];
    let sum = vals[0] + vals[1] + vals[2];
    if (sum % 3 === 0) { vals[2]++; sum++; }
    const decls = names.map((n, i) => decl("int", n, lit(vals[i])));
    const total = grp(bin("+", bin("+", ref(names[0]), ref(names[1])), ref(names[2])));
    if (shape === "three-ints" || shape === "fixed-three") {
      const fixed = shape === "fixed-three";
      program = [...decls, decl("double", s, bin("/", total, fixed ? dlit(3) : lit(3))), print(ref(s))];
      explanation = fixed
        ? H.lines(`3.0 is a double, so ${sum} / 3.0 is floating-point division: ${show(sum / 3)}.`, "Java prints the shortest decimal that identifies that double.")
        : H.lines(`${sum} / 3 divides two ints, so the fraction is discarded: ${Math.trunc(sum / 3)}.`, `Storing it in a double gives ${show(Math.trunc(sum / 3))}, not ${show(sum / 3)}.`);
      return H.outputDraft({
        shape, program, flags: fixed ? [] : ["intDivReal", "intDivRound", "doubleShowsInt"],
        extras: fixed ? [{ text: show(Math.trunc(sum / 3)), misc: "earlyRounding" }, { text: show(Math.round(sum / 3)), misc: "castRounds" }, { text: show(Number((sum / 3).toFixed(2))), misc: "printRounds" }] : [],
        prompt: "What is printed?", explanation,
      });
    }
    if (shape === "difference") {
      program = [...decls, decl("int", "sum", total), decl("double", "rough", bin("/", ref("sum"), lit(3))), decl("double", "exact", bin("/", ref("sum"), dlit(3))),
        print(cast("int", grp(bin("*", grp(bin("-", ref("exact"), ref("rough"))), lit(3)))))];
      const rough = Math.trunc(sum / 3), exact = sum / 3, diff = (exact - rough) * 3;
      explanation = H.lines(`sum = ${sum}. rough = ${sum} / 3 = ${rough} (integer division, stored as ${show(rough)}).`, `exact = ${sum} / 3.0 = ${show(exact)}.`,
        `(exact - rough) * 3 = ${show(diff)}${Math.trunc(diff) !== sum % 3 ? ` — round-off makes it slightly less than ${sum % 3}` : ""}; the (int) cast truncates it to ${Math.trunc(diff)}.`);
      return H.outputDraft({ shape, program, flags: ["intDivReal", "castRounds"], extras: [{ text: "0", misc: "earlyRounding" }, { text: String(sum % 3), misc: "doubleExact" }, { text: show(diff), misc: "castIgnored" }, { text: show(exact - rough), misc: "missedMultiply" }, { text: String(sum % 3 + 1), misc: "castRounds" }], prompt: "What is printed?", explanation });
    }
    // percent
    const max = rng.pick([40, 80, 120, 160]);
    const score = rng.int(Math.floor(max * 0.5), max - 1);
    if ((score * 100) % max === 0) return null;
    program = [decl("int", "score", lit(score)), decl("int", "max", lit(max)), decl("double", "pct", bin("*", bin("/", ref("score"), ref("max")), lit(100))),
      decl("double", "better", bin("/", bin("*", ref("score"), dlit(100)), ref("max"))), print(pair(ref("pct"), ref("better")))];
    explanation = H.lines(`score / max is ${score} / ${max}, integer division: 0. Then 0 * 100 = 0, stored as 0.0.`, `score * 100.0 / max is floating-point: ${score * 100} / ${max} = ${show(score * 100 / max)}.`);
    const good = show(score * 100 / max);
    return H.outputDraft({ shape, program, flags: ["intDivReal", "intDivRound"], prompt: "What is printed?", explanation,
      extras: [{ text: `0 ${good}`, misc: "doubleShowsInt" }, { text: `${good} ${good}`, misc: "intDivReal" }, { text: `0.0 ${(score * 100 / max).toFixed(2)}`, misc: "printRounds" }, { text: `${show(Math.trunc(score * 100 / max))} ${good}`, misc: "orderIrrelevant" }] });
  },
};

// D. Floating-point precision -------------------------------------------------
const floatEquality = {
  id: "nl.float-equality", mode: MODE, label: "Comparing doubles with ==", skill: "Floating-point precision",
  weights: { beginner: 2, intermediate: 3, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({ beginner: ["sum-check"], intermediate: ["sum-check", "product-check"], advanced: ["equivalent", "tolerance"] }[d]);
    const [r] = H.pickNames(rng, 1, H.DOUBLE_NAMES);
    if (shape === "sum-check" || shape === "product-check") {
      let x, y, exact, op;
      if (shape === "sum-check") {
        if (rng.chance(0.35)) { x = rng.pick([0.5, 0.25, 0.75, 1.5, 0.125]); y = rng.pick([0.25, 0.5, 0.125, 2.5]); exact = x + y; }
        else { const a = rng.int(1, d === "beginner" ? 9 : 25), b = rng.int(1, 9); x = a / 10; y = b / 10; exact = Number(((a + b) / 10).toFixed(1)); }
        op = "+";
      } else {
        x = rng.pick([0.1, 0.2, 0.3, 0.7, 1.1, 1.2, 2.2]); y = rng.int(2, 9); exact = Number((x * y).toFixed(1)); op = "*";
      }
      const program = [decl("double", r, bin(op, dlit(x), op === "*" ? lit(y) : dlit(y))), print(pair(ref(r), grp(bin("==", ref(r), dlit(exact)))))];
      const actual = op === "+" ? x + y : x * y, equal = actual === exact;
      const near = actual > exact ? nextDown(exact) : nextUp(exact);
      const candidates = equal
        ? [{ text: `${show(exact)} false`, misc: "overcautiousDouble" }, { text: `${show(nextUp(exact))} false`, misc: "overcautiousDouble" }, { text: `${show(nextDown(exact))} false`, misc: "roundOffDirection" }]
        : [{ text: `${show(exact)} true`, misc: "doubleExact" }, { text: `${show(exact)} false`, misc: "printRounds" }, { text: `${show(actual)} true`, misc: "equalityTolerant" }, { text: `${show(near)} false`, misc: "roundOffDirection" }];
      const binaryExact = [x, op === "+" ? y : 1].every(v => Number.isInteger(v * 1024));
      return H.outputDraft({
        shape: `${shape}-${equal ? "equal" : "differs"}`, program, flags: [], extras: candidates, prompt: "What is printed?",
        explanation: equal
          ? (binaryExact
            ? H.lines(`${show(x)}${op === "+" ? `, ${show(y)}` : ""} and ${show(exact)} are exactly representable in binary (sums of powers of 2), so there is no round-off.`, `${r} is exactly ${show(exact)} and == is true.`)
            : H.lines(`${show(x)} is not stored exactly, but here the rounding errors happen to cancel: the result is the same double as the literal ${show(exact)}.`, "So == is true this time — but you cannot count on that for other values."))
          : H.lines(`${show(x)}${op === "+" && !Number.isInteger(y * 1024) ? ` and ${show(y)} are` : " is"} not exactly representable in binary, just as 1/3 is not exact in decimal.`,
            `The representation errors make the result ${show(actual)}, a different double from the literal ${show(exact)}.`,
            "== compares the exact stored values, so it is false. Compare doubles with a tolerance instead."),
      });
    }
    if (shape === "equivalent") {
      const base = rng.pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 1.7, 2.1, 0.05, 0.15]), times = rng.int(3, 10);
      const sumExpr = Array.from({ length: times }).reduce(acc => acc ? bin("+", acc, ref("step")) : ref("step"), null);
      let added = base; for (let i = 1; i < times; i++) added += base;
      const multiplied = base * times, eq = added === multiplied;
      const program = [decl("double", "step", dlit(base)), decl("double", "added", sumExpr), decl("double", "multiplied", bin("*", ref("step"), lit(times))),
        print(pair(grp(bin("==", ref("added"), ref("multiplied"))), grp(bin("<", call("abs", bin("-", ref("added"), ref("multiplied"))), dlit(1e-9)))))];
      const misc = { "true true": "doubleExact", "false true": "overcautiousDouble", "true false": "equalityTolerant", "false false": "toleranceFails" };
      const answer = `${eq} true`;
      return H.outputDraft({
        shape: `${shape}-${eq}`, program, flags: [],
        extras: Object.keys(misc).filter(c => c !== answer).map(c => ({ text: c, misc: misc[c] })),
        prompt: "What is printed?",
        explanation: H.lines(`Mathematically, adding ${show(base)} ${times} times equals ${show(base)} × ${times}.`,
          `In double arithmetic each addition can round, so added is ${show(added)} and multiplied is ${show(multiplied)}.`,
          `added == multiplied is ${eq}. The difference is far smaller than 1.0E-9, so the tolerance check is true.`),
      });
    }
    // tolerance
    const a = rng.int(1, 40), b = rng.int(1, 40), x = a / 10, y = b / 10, exact = Number(((a + b) / 10).toFixed(1));
    if (x + y === exact) return null;
    const program = [decl("double", r, bin("+", dlit(x), dlit(y))), decl("boolean", "same", bin("==", ref(r), dlit(exact))),
      decl("boolean", "close", bin("<", call("abs", bin("-", ref(r), dlit(exact))), dlit(1e-9))), print(pair(ref("same"), ref("close")))];
    return H.outputDraft({
      shape, program, flags: [],
      extras: [{ text: "true true", misc: "doubleExact" }, { text: "false false", misc: "toleranceFails" }, { text: "true false", misc: "equalityTolerant" }],
      prompt: "What is printed?",
      explanation: H.lines(`${show(x)} + ${show(y)} is stored as ${show(x + y)}, which is not exactly the double ${show(exact)}.`, "So == is false, but the difference is tiny, so the tolerance comparison is true.", "Use Math.abs(a - b) < tolerance to compare doubles."),
    });
  },
};

const floatPrint = {
  id: "nl.float-print", mode: MODE, label: "Printing double results", skill: "Floating-point precision",
  weights: { beginner: 2, intermediate: 2, advanced: 3 },
  build(rng, d) {
    const shape = rng.pick({ beginner: ["exact-vs-tenths"], intermediate: ["two-calcs", "exact-vs-tenths"], advanced: ["accumulate", "accumulate-compare"] }[d]);
    if (shape === "exact-vs-tenths" || shape === "two-calcs") {
      const calc = inexact => {
        for (let i = 0; i < 50; i++) {
          let x, y, op;
          if (!inexact) { x = rng.pick([0.5, 0.25, 0.75, 1.5, 2.25]); y = rng.pick([0.25, 0.5, 0.125, 1.75]); op = rng.pick(["+", "-"]); }
          else { x = rng.int(1, 30) / 10; y = rng.int(1, 30) / 10; op = rng.pick(["+", "-", "*"]); if (op === "*") y = rng.int(2, 9); }
          const actual = op === "+" ? x + y : op === "-" ? x - y : x * y;
          const exact = Number(actual.toFixed(op === "*" ? 2 : 1));
          if ((actual !== exact) === inexact && actual !== 0) return { e: bin(op, dlit(x), op === "*" ? lit(y) : dlit(y)), actual, exact };
        }
        return null;
      };
      const first = calc(shape === "two-calcs" ? rng.chance(0.5) : false), second = calc(true);
      if (!first || !second) return null;
      const program = [print(first.e), print(second.e)];
      const txt = (p, q) => `${show(p)}\n${show(q)}`;
      const firstInexact = first.actual !== first.exact;
      const candidates = [
        { text: txt(first.exact, second.exact), misc: "doubleExact" },
        { text: txt(firstInexact ? first.exact : nextUp(first.actual), second.actual), misc: firstInexact ? "partialRoundOff" : "overcautiousDouble" },
        { text: txt(first.actual, second.exact), misc: "partialRoundOff" },
        { text: txt(first.actual, second.actual > second.exact ? nextDown(second.exact) : nextUp(second.exact)), misc: "roundOffDirection" },
      ];
      return H.outputDraft({
        shape, program, flags: [], extras: candidates, prompt: "What is printed?",
        explanation: H.lines(
          `${P.renderExpr(first.e)} ${firstInexact ? `involves decimals with no exact binary form, so it prints ${show(first.actual)}.` : `uses values that are exact in binary (sums of powers of 2), so it prints exactly ${show(first.actual)}.`}`,
          `${P.renderExpr(second.e)} involves decimals that binary cannot store exactly. The rounding error shows: ${show(second.actual)}.`,
          "println shows the shortest decimal that identifies the stored double, so the error is visible."),
      });
    }
    // accumulate
    const step = rng.pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.9, 0.01, 0.02, 0.05, 0.25, 0.1, 1.1]), n = rng.int(3, 25);
    let total = 0; for (let i = 0; i < n; i++) total += step;
    const exact = Number((step * n).toFixed(2));
    const compare = shape === "accumulate-compare";
    const program = [decl("double", "total", dlit(0)), loop("i", n, [assign("total", "+=", dlit(step))]),
      compare ? print(pair(ref("total"), grp(bin("==", ref("total"), dlit(exact))))) : print(ref("total"))];
    const equal = total === exact;
    const other = total > exact ? nextDown(exact) : nextUp(exact);
    const t = (v, b) => compare ? `${show(v)} ${b}` : show(v);
    const candidates = equal
      ? [{ text: t(nextUp(exact), false), misc: "overcautiousDouble" }, { text: t(nextDown(exact), false), misc: "roundOffDirection" },
        { text: compare ? t(exact, false) : (Number.isInteger(exact) ? String(exact) : show(Number((exact + step).toFixed(2)))), misc: compare ? "overcautiousDouble" : Number.isInteger(exact) ? "doubleShowsInt" : "loopOffByOne" }]
      : [{ text: t(exact, true), misc: "doubleExact" }, { text: t(other, false), misc: "roundOffDirection" },
        ...(compare ? [{ text: t(exact, false), misc: "printRounds" }, { text: t(total, true), misc: "equalityTolerant" }]
          : [{ text: Number.isInteger(exact) ? String(exact) : show(Number((exact + step).toFixed(2))), misc: Number.isInteger(exact) ? "doubleShowsInt" : "loopOffByOne" }])];
    const binaryExact = Number.isInteger(step * 1024);
    return H.outputDraft({
      shape: `${shape}-${equal ? "exact" : "drift"}`, program, flags: [], extras: candidates, prompt: "What is printed?",
      explanation: equal
        ? (binaryExact ? H.lines(`${show(step)} is exactly representable in binary, so adding it ${n} times gives exactly ${show(exact)}.`)
          : H.lines(`${show(step)} is not stored exactly, but for these ${n} additions the rounding errors happen to cancel, giving the same double as ${show(exact)}.`, "Do not rely on that: other counts drift."))
        : H.lines(`${show(step)} cannot be stored exactly; each += adds a slightly-off value and rounds again.`, `After ${n} additions total is ${show(total)}, not ${show(exact)}.`, compare ? "So == against the decimal literal is false." : "The accumulated round-off error becomes visible."),
    });
  },
};

// E. Rounding and truncation ---------------------------------------------------
const rounding = {
  id: "nl.rounding", mode: MODE, label: "Casting versus rounding", skill: "Rounding and truncation",
  weights: { beginner: 3, intermediate: 3, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({ beginner: ["cast-positive", "cast-negative"], intermediate: ["cast-vs-round", "cast-scope", "round-half"], advanced: ["plus-half", "cast-vs-round-negative", "round-stored"] }[d]);
    const [v] = H.pickNames(rng, 1, H.DOUBLE_NAMES);
    const [n] = H.pickNames(rng, 1, ["whole", "count", "rounded", "cut", "level"]);
    let x = H.tenthValue(rng, 1, 30, true);
    if (shape.includes("negative") || shape === "plus-half") x = -x;
    if (shape === "round-half" || (shape === "plus-half" && rng.chance(0.3))) x = (rng.int(1, 20) + 0.5) * (rng.chance(0.5) ? 1 : -1);
    if (shape === "cast-positive" || shape === "cast-negative") {
      x = Number((Math.trunc(x) + (shape === "cast-positive" ? 1 : -1) * rng.pick([0.6, 0.7, 0.8, 0.9])).toFixed(1));
      const program = [decl("double", v, dlit(x)), decl("int", n, cast("int", ref(v))), print(ref(n))];
      return H.outputDraft({
        shape, program, flags: ["castRounds", "castFloors"],
        extras: [{ text: show(x), misc: "castIgnored" }, { text: "Does not compile", misc: "compileStrict" }, { text: String(-Math.trunc(x)), misc: "noMinusLiteral" }],
        prompt: "What is printed?",
        explanation: H.lines(`Casting a double to int discards the fractional part: (int) ${show(x)} is ${Math.trunc(x)}.`, x < 0 ? "For negative numbers this moves toward zero, so it is not the same as rounding down." : "It does not round up, even when the fraction is close to 1."),
      });
    }
    if (shape === "cast-vs-round" || shape === "cast-vs-round-negative" || shape === "round-half") {
      const program = [decl("double", v, dlit(x)), print(pair(cast("int", ref(v)), call("round", ref(v))))];
      return H.outputDraft({
        shape, program, flags: ["castRounds", "roundTruncates", "roundHalfAway", "castFloors"],
        extras: [{ text: `${Math.trunc(x)} ${show(Math.round(x) + 0)}`, misc: "doubleShowsInt" }],
        prompt: "What is printed?",
        explanation: H.lines(`(int) ${show(x)} truncates toward zero: ${Math.trunc(x)}.`, `Math.round(${show(x)}) rounds to the nearest whole number${Math.abs(x % 1) === 0.5 ? " — an exact .5 rounds toward positive infinity" : ""}: ${Math.round(x) + 0}.`, "Math.round(double) returns a long, so no .0 is printed."),
      });
    }
    if (shape === "cast-scope") {
      const m = rng.int(2, 5);
      const program = [decl("double", v, dlit(x)), print(pair(bin("*", cast("int", ref(v)), lit(m)), cast("int", grp(bin("*", ref(v), lit(m))))))];
      const a = Math.trunc(x) * m, b = Math.trunc(x * m);
      if (a === b) return null;
      return H.outputDraft({
        shape, program, flags: ["castRounds"],
        extras: [{ text: `${b} ${b}`, misc: "wrongOperandCast" }, { text: `${a} ${a}`, misc: "castLate" }],
        prompt: "What is printed?",
        explanation: H.lines(`A cast applies only to the operand right after it. (int) ${v} * ${m} truncates first: ${Math.trunc(x)} * ${m} = ${a}.`, `(int) (${v} * ${m}) multiplies first: ${show(x * m)}, then truncates to ${b}.`),
      });
    }
    if (shape === "plus-half") {
      const program = [decl("double", v, dlit(x)), decl("int", "a", cast("int", grp(bin("+", ref(v), dlit(0.5))))), decl("long", "b", call("round", ref(v))), print(pair(ref("a"), ref("b")))];
      const a = Math.trunc(x + 0.5), b = Math.round(x) + 0;
      return H.outputDraft({
        shape: `${shape}-${a === b ? "same" : "differs"}`, program, flags: ["castFloors", "roundHalfAway", "castRounds"],
        extras: [{ text: `${b} ${b}`, misc: "plusHalfWorks" }],
        prompt: "What is printed?",
        explanation: H.lines(`${show(x)} + 0.5 = ${show(x + 0.5)}; the (int) cast truncates toward zero, giving ${a}.`, `Math.round(${show(x)}) is ${b}.`,
          a === b ? "Here they agree, but (int) (x + 0.5) is not a general rounding method: it truncates toward zero, which is wrong for many negative values." : "They differ: (int) (x + 0.5) truncates toward zero, so it rounds incorrectly for negative values. Use Math.round."),
      });
    }
    // round-stored
    const program = [decl("double", v, dlit(x)), decl("int", n, cast("int", call("round", bin("*", ref(v), lit(10))))), print(bin("/", ref(n), lit(10)))];
    const r = Math.round(x * 10);
    return H.outputDraft({
      shape, program, flags: ["intDivReal", "roundTruncates", "intDivRound"],
      prompt: "What is printed?",
      explanation: H.lines(`${v} * 10 = ${show(x * 10)}; Math.round gives ${r} and the (int) cast keeps ${r}.`, `${n} / 10 is int division: ${Math.trunc(r / 10)}. Dividing by the int 10 discards the decimal again.`),
    });
  },
};

// F. Arithmetic exceptions and special values --------------------------------------
const divZero = {
  id: "nl.div-zero", mode: MODE, label: "Division by zero", skill: "Arithmetic exceptions",
  weights: { beginner: 3, intermediate: 3, advanced: 3 },
  build(rng, d) {
    const shape = rng.pick({
      beginner: ["int-div", "double-div", "int-rem"],
      intermediate: ["negative-double", "zero-over-zero", "cast-after", "mixed-operand"],
      advanced: ["partial-output", "nan-compare", "infinity-cast", "computed-zero"],
    }[d]);
    const [a, b] = H.pickNames(rng, 2);
    const x = rng.int(3, 50);
    const extras = [{ text: "Does not compile", misc: "divZeroCompile" }];
    let program, explanation, flags = ["divZeroIntInfinity", "divZeroIsZero", "divZeroThrowsDouble"];
    if (shape === "int-div" || shape === "int-rem") {
      const op = shape === "int-div" ? "/" : "%";
      program = [decl("int", a, lit(x)), decl("int", b, lit(0)), print(bin(op, ref(a), ref(b)))];
      explanation = H.lines(`${a} ${op} ${b} is int arithmetic with a zero divisor.`, `Integer ${op === "%" ? "remainder" : "division"} by zero throws ArithmeticException at run time. The compiler does not check variable values.`);
      if (op === "%") extras.push({ text: String(x), misc: "remAbs" }, { text: "NaN", misc: "infinityNaN" });
    } else if (shape === "double-div" || shape === "negative-double") {
      const sign = shape === "negative-double" ? -1 : 1;
      program = [decl("double", a, dlit(sign * x)), print(bin("/", ref(a), lit(0)))];
      explanation = H.lines(`${a} is a double, so this is floating-point division.`, `Dividing a ${sign < 0 ? "negative" : "positive"} double by zero gives ${sign < 0 ? "-Infinity" : "Infinity"}; no exception is thrown.`);
      extras.push({ text: "NaN", misc: "infinityNaN" });
      if (sign < 0) extras.push({ text: "Infinity", misc: "noMinusLiteral" });
    } else if (shape === "zero-over-zero") {
      program = [decl("double", a, dlit(0)), print(bin("/", ref(a), lit(0)))];
      explanation = H.lines(`${a} / 0 is floating-point division because ${a} is a double.`, "Zero divided by zero has no meaningful value, so the result is NaN (\"not a number\"). No exception is thrown.");
      extras.push({ text: "Infinity", misc: "infinityNaN" });
    } else if (shape === "cast-after") {
      program = [decl("int", a, lit(x)), decl("int", b, lit(0)), print(cast("double", grp(bin("/", ref(a), ref(b)))))];
      explanation = H.lines(`The parentheses make ${a} / ${b} happen first, as int division.`, "int division by zero throws ArithmeticException before the cast is ever applied.");
      extras.push({ text: "Infinity", misc: "castLate" });
    } else if (shape === "mixed-operand") {
      program = [decl("int", a, lit(x)), decl("double", b, dlit(0)), print(bin("/", ref(a), ref(b)))];
      explanation = H.lines(`${b} is a double, so ${a} is widened and the division is floating-point.`, "A positive number divided by 0.0 is Infinity; no exception is thrown.");
      extras.push({ text: "NaN", misc: "infinityNaN" }, { text: "Throws ArithmeticException", misc: "divZeroThrowsDouble" });
    } else if (shape === "partial-output" || shape === "computed-zero") {
      const m = rng.int(2, 9), y = m * rng.int(2, 6);
      const zero = shape === "computed-zero" ? bin("%", lit(y), lit(m)) : bin("-", lit(y), lit(y));
      const [s1, s2] = rng.pick([["Start", "Done"], ["Begin", "End"], ["Ready", "Finished"]]);
      program = [decl("int", a, lit(x)), decl("int", b, zero), print(slit(s1)), print(bin("/", ref(a), ref(b))), print(slit(s2))];
      explanation = H.lines(`${b} = ${P.renderExpr(zero)} = 0.`, `"${s1}" prints first. Then ${a} / ${b} is int division by zero, which throws ArithmeticException.`, `The exception stops the program, so "${s2}" never prints — but output already printed stays.`);
      extras.push({ text: "Throws ArithmeticException", misc: "noPartialOutput" }, { text: `${s1}\nInfinity\n${s2}`, misc: "divZeroIntInfinity" }, { text: `${s1}\n0\n${s2}`, misc: "divZeroIsZero" });
    } else if (shape === "nan-compare") {
      program = [decl("double", a, bin("/", dlit(0), dlit(0))), print(pair(ref(a), grp(bin("==", ref(a), ref(a)))))];
      explanation = H.lines("0.0 / 0.0 is NaN.", `NaN is not equal to anything, not even itself, so ${a} == ${a} is false.`);
      extras.push({ text: "NaN true", misc: "nanEqualsItself" }, { text: "Throws ArithmeticException", misc: "nanThrows" }, { text: "0.0 true", misc: "divZeroIsZero" });
      flags = [];
    } else {
      const sign = rng.chance(0.5) ? 1 : -1;
      program = [decl("double", a, dlit(sign * x)), decl("int", b, cast("int", grp(bin("/", ref(a), lit(0))))), print(ref(b))];
      explanation = H.lines(`${show(sign * x)} / 0 is ${sign > 0 ? "Infinity" : "-Infinity"} (double division).`, `Casting ${sign > 0 ? "Infinity" : "-Infinity"} to int clamps to ${sign > 0 ? "Integer.MAX_VALUE" : "Integer.MIN_VALUE"}: ${sign > 0 ? MAX : MIN}.`);
      extras.push({ text: "0", misc: "infinityZero" }, { text: sign > 0 ? "Infinity" : "-Infinity", misc: "castIgnored" }, { text: "Throws ArithmeticException", misc: "divZeroThrowsDouble" });
      flags = [];
    }
    return H.outputDraft({ shape, program, flags, extras, prompt: "What happens when this code is compiled and run?", explanation });
  },
};

// Literals and narrowing casts at the limits ---------------------------------------
const literalCast = {
  id: "nl.literal-cast", mode: MODE, label: "Big literals and narrowing casts", skill: "Casting at the limits",
  weights: { beginner: 2, intermediate: 2, advanced: 2 },
  build(rng, d) {
    const shape = rng.pick({ beginner: ["int-literal", "long-suffix"], intermediate: ["long-no-suffix", "double-to-int", "double-to-int-negative"], advanced: ["long-to-int", "both-casts"] }[d]);
    const [n] = H.pickNames(rng, 1, ["population", "views", "total", "distance", "bytes"]);
    const value = rng.pick([2147483648, rng.int(22, 42) * 100000000, rng.int(2148, 4294) * 1000000, rng.int(2148, 4294) * 1000000 + rng.int(1, 999) * 1000, rng.int(2147483648, 4000000000)]);
    const wrapped = wrap(value);
    if (shape === "int-literal" || shape === "long-no-suffix") {
      const program = [decl(shape === "int-literal" ? "int" : "long", n, bigIntLiteral(String(value))), print(ref(n))];
      return H.outputDraft({
        shape, program, flags: [],
        extras: [{ text: String(value), misc: shape === "int-literal" ? "compileLossy" : "longSuffixOptional" }, { text: String(wrapped), misc: "castWraps" }, { text: String(MAX), misc: "overflowClamps" }],
        prompt: "What happens when this code is compiled and run?",
        explanation: H.lines(`${value} is larger than 2147483647, but a whole-number literal without L is an int literal.`, `javac rejects it ("integer number too large")${shape === "long-no-suffix" ? " even though the variable is a long" : ""}. Write ${value}L to make a long literal.`),
      });
    }
    if (shape === "long-suffix") {
      const program = [decl("long", n, llit(value)), print(ref(n))];
      return H.outputDraft({ shape, program, flags: [],
        extras: [{ text: "Does not compile", misc: "longSuffixMissing" }, { text: String(wrapped), misc: "castWraps" }, { text: String(MAX), misc: "overflowClamps" }],
        prompt: "What happens when this code is compiled and run?",
        explanation: H.lines(`The L suffix makes ${value}L a long literal.`, `A long holds about ±9.2 quintillion, so ${value} fits and prints unchanged.`) });
    }
    if (shape === "double-to-int" || shape === "double-to-int-negative") {
      const sign = shape === "double-to-int" ? 1 : -1;
      const program = [decl("double", "d", dlit(sign * value)), decl("int", n, cast("int", ref("d"))), print(ref(n))];
      return H.outputDraft({ shape, program, flags: [],
        extras: [{ text: String(wrap(sign * value)), misc: "castWraps" }, { text: String(sign * value), misc: "noOverflow" }, { text: "Throws ArithmeticException", misc: "overflowThrows" }, { text: show(sign * value), misc: "castIgnored" }],
        prompt: "What happens when this code is compiled and run?",
        explanation: H.lines(`d is ${show(sign * value)}, outside the int range.`, `A double-to-int cast does not wrap: values that are too large become ${sign > 0 ? "Integer.MAX_VALUE" : "Integer.MIN_VALUE"} (${sign > 0 ? MAX : MIN}).`) });
    }
    if (shape === "long-to-int") {
      const program = [decl("long", "big", llit(value)), decl("int", n, cast("int", ref("big"))), print(ref(n))];
      return H.outputDraft({ shape, program, flags: [],
        extras: [{ text: String(MAX), misc: "castSaturates" }, { text: String(value), misc: "noOverflow" }, { text: "Throws ArithmeticException", misc: "overflowThrows" }, { text: "Does not compile", misc: "compileStrict" }],
        prompt: "What happens when this code is compiled and run?",
        explanation: H.lines("Casting a long to int keeps only the low 32 bits.", `${value} - 2^32 = ${value - 2 ** 32}, so it prints ${wrapped}. Unlike a double-to-int cast, this one wraps.`) });
    }
    const program = [decl("long", "big", llit(value)), decl("double", "d", ref("big")), print(pair(cast("int", ref("big")), cast("int", ref("d"))))];
    return H.outputDraft({ shape, program, flags: [],
      extras: [{ text: `${wrapped} ${wrapped}`, misc: "castWraps" }, { text: `${MAX} ${MAX}`, misc: "castSaturates" }, { text: `${MAX} ${wrapped}`, misc: "castSaturates" }, { text: `${value} ${value}`, misc: "noOverflow" }],
      prompt: "What is printed?",
      explanation: H.lines(`(int) big: a long-to-int cast keeps the low 32 bits, giving ${wrapped}.`, `(int) d: a double-to-int cast clamps out-of-range values to Integer.MAX_VALUE, ${MAX}.`, "The same number, cast from different types, gives different results.") });
  },
};

// Compound assignment narrowing ------------------------------------------------
const compound = {
  id: "nl.compound-narrowing", mode: MODE, label: "Compound assignment with doubles", skill: "Casting and compound assignment",
  weights: { beginner: 0, intermediate: 3, advanced: 3 },
  build(rng, d) {
    const shape = rng.pick({ intermediate: ["plus-equals", "plain-assign", "times-equals"], advanced: ["chain", "max-plus-double", "contrast"] }[d]);
    const [x] = H.pickNames(rng, 1);
    const start = rng.int(4, 40), frac = H.tenthValue(rng, 1, 6, true);
    if (shape === "plus-equals" || shape === "times-equals") {
      const op = shape === "plus-equals" ? "+=" : "*=";
      const program = [decl("int", x, lit(start)), assign(x, op, dlit(frac)), print(ref(x))];
      const exact = op === "+=" ? start + frac : start * frac;
      return H.outputDraft({ shape, program, flags: ["compoundNoCast", "castRounds"],
        extras: [{ text: "Does not compile", misc: "compileStrict" }, { text: String(Math.trunc(exact) + 1), misc: "castRounds" }],
        prompt: "What is printed?",
        explanation: H.lines(`${x} ${op} ${show(frac)} means ${x} = (int) (${x} ${op[0]} ${show(frac)}): compound assignment includes a hidden cast.`, `${start} ${op[0]} ${show(frac)} = ${show(exact)}, truncated to ${Math.trunc(exact)}.`) });
    }
    if (shape === "plain-assign") {
      const program = [decl("int", x, lit(start)), assign(x, "=", bin("+", ref(x), dlit(frac))), print(ref(x))];
      return H.outputDraft({ shape, program, flags: [],
        extras: [{ text: String(Math.trunc(start + frac)), misc: "lossyTruncates" }, { text: show(start + frac), misc: "compoundNoCast" }, { text: String(Math.round(start + frac)), misc: "castRounds" }],
        prompt: "What happens when this code is compiled and run?",
        explanation: H.lines(`${x} + ${show(frac)} is a double. Assigning a double to an int with = needs an explicit cast.`, `This does not compile ("possible lossy conversion from double to int"). The compound form ${x} += ${show(frac)} would compile because it casts automatically.`) });
    }
    if (shape === "chain") {
      const m = rng.pick([1.5, 2.5, 0.5]), sub = rng.pick([0.5, 1.5, 2.5]), dv = rng.int(2, 4);
      const program = [decl("int", x, lit(start)), assign(x, "*=", dlit(m)), assign(x, "/=", lit(dv)), assign(x, "-=", dlit(sub)), print(ref(x))];
      const s1 = Math.trunc(start * m), s2 = Math.trunc(s1 / dv), s3 = Math.trunc(s2 - sub);
      return H.outputDraft({ shape, program, flags: ["compoundNoCast", "castRounds", "intDivReal"],
        extras: [{ text: "Does not compile", misc: "compileStrict" }],
        prompt: "What is printed?",
        explanation: H.lines(`${x} *= ${show(m)}: ${start} × ${show(m)} = ${show(start * m)} → ${s1} (the hidden cast truncates).`, `${x} /= ${dv}: int division ${s1} / ${dv} = ${s2}.`, `${x} -= ${show(sub)}: ${s2} - ${show(sub)} = ${show(s2 - sub)} → ${s3}.`) });
    }
    if (shape === "max-plus-double") {
      const add = rng.pick([1.0, 0.5, 10.0, 1.5]);
      const program = [decl("int", x, K("Integer.MAX_VALUE")), assign(x, "+=", dlit(add)), print(ref(x))];
      return H.outputDraft({ shape, program, flags: [],
        extras: [{ text: String(wrap(MAX + Math.trunc(add))), misc: "castWraps" }, { text: String(MAX + Math.trunc(add)), misc: "noOverflow" }, { text: "Throws ArithmeticException", misc: "overflowThrows" }, { text: show(MAX + add), misc: "compoundNoCast" }],
        prompt: "What is printed?",
        explanation: H.lines(`${x} += ${show(add)} means ${x} = (int) (${x} + ${show(add)}).`, `${x} + ${show(add)} is double arithmetic: ${show(MAX + add)} (no int overflow happens).`, "Casting a too-large double to int clamps to Integer.MAX_VALUE, so it stays 2147483647.") });
    }
    // contrast: x += 0.5 twice never accumulates
    const program = [decl("int", x, lit(start)), assign(x, "+=", dlit(0.5)), assign(x, "+=", dlit(0.5)), print(ref(x))];
    return H.outputDraft({ shape, program, flags: ["compoundNoCast", "castRounds"],
      extras: [{ text: String(start + 1), misc: "halvesAccumulate" }, { text: "Does not compile", misc: "compileStrict" }],
      prompt: "What is printed?",
      explanation: H.lines(`Each ${x} += 0.5 computes ${start} + 0.5 = ${show(start + 0.5)} and truncates back to ${start}.`, `The two halves never accumulate, so ${x} is still ${start}.`) });
  },
};

// G. Numeric tracing -----------------------------------------------------------------
const trace = {
  id: "nl.trace", mode: MODE, label: "Trace numeric statements", skill: "Numeric result tracing",
  weights: { beginner: 1, intermediate: 3, advanced: 4 },
  build(rng, d) {
    const shape = rng.pick({ beginner: ["score"], intermediate: ["score", "split", "countdown"], advanced: ["scaled-score", "split-remainder", "loop-growth", "mixed-chain"] }[d]);
    let program, explanation;
    if (shape === "score" || shape === "scaled-score") {
      const base = rng.int(50, 120), n = rng.int(2, 6), bonus = rng.int(1, 15);
      const total = base * n + bonus;
      if (total % n === 0) return null;
      program = [decl("int", "points", lit(base)), assign("points", "*=", lit(n)), assign("points", "+=", lit(bonus)), decl("double", "avg", bin("/", ref("points"), lit(n)))];
      const avg = Math.trunc(total / n);
      if (shape === "scaled-score") {
        const pct = rng.int(2, 9) * 10;
        program.push(decl("int", "scaled", cast("int", grp(bin("*", ref("avg"), dlit(pct / 100))))), print(pair(ref("avg"), ref("scaled"))));
        explanation = H.lines(`points = ${base} × ${n} + ${bonus} = ${total}.`, `avg = ${total} / ${n} uses int division: ${avg}, stored as ${show(avg)}.`, `scaled = (int) (${show(avg)} × ${show(pct / 100)}) = (int) ${show(avg * (pct / 100))} = ${Math.trunc(avg * (pct / 100))}.`);
      } else {
        program.push(print(ref("avg")));
        explanation = H.lines(`points = ${base} × ${n} + ${bonus} = ${total}.`, `avg = ${total} / ${n}: both are ints, so the division truncates to ${avg}, stored as ${show(avg)}.`);
      }
    } else if (shape === "split" || shape === "split-remainder") {
      const total = rng.int(40, 200), people = rng.int(3, 9);
      if (total % people === 0) return null;
      program = [decl("int", "total", lit(total)), decl("int", "people", lit(people)), decl("int", "each", bin("/", ref("total"), ref("people"))), decl("int", "left", bin("%", ref("total"), ref("people")))];
      const each = Math.trunc(total / people), left = total % people;
      if (shape === "split-remainder") {
        program.push(decl("double", "share", bin("+", ref("each"), bin("/", ref("left"), ref("people")))), print(pair(ref("left"), ref("share"))));
        explanation = H.lines(`each = ${total} / ${people} = ${each}; left = ${total} % ${people} = ${left}.`, `left / people = ${left} / ${people} = 0 (int division), so share = ${each} + 0 = ${show(each)}.`);
      } else {
        program.push(print(pair(ref("each"), ref("left"))));
        explanation = H.lines(`each = ${total} / ${people} = ${each} (truncated).`, `left = ${total} % ${people} = ${left}.`);
      }
    } else if (shape === "countdown") {
      const gap = rng.int(1, 5), steps = gap + rng.int(1, 4);
      program = [decl("int", "level", bin("+", K("Integer.MIN_VALUE"), lit(gap))), loop("i", steps, [incdec("level", "--")]), print(ref("level"))];
      explanation = H.lines(`level starts ${gap} above Integer.MIN_VALUE.`, `${steps} decrements go ${steps - gap} past the minimum, wrapping to ${wrap(MIN + gap - steps)}.`);
    } else if (shape === "loop-growth") {
      const start = rng.int(3, 9) * 100000, factor = rng.int(10, 40);
      if (start * factor * factor <= MAX) return null;
      program = [decl("int", "size", lit(start)), loop("i", 2, [assign("size", "*=", lit(factor))]), decl("long", "big", bin("*", cast("long", lit(start)), lit(factor * factor))), print(pair(ref("size"), ref("big")))];
      explanation = H.lines(`size is multiplied by ${factor} twice in int arithmetic: exact ${start * factor * factor}, which wraps to ${wrap(wrap(start * factor) * factor)}.`, `big uses long arithmetic ((long) ${start} * ${factor * factor}), so it is exact: ${start * factor * factor}.`);
    } else {
      const a = rng.int(10, 40), b = rng.int(3, 7), c = rng.pick([2, 4]);
      if (a % b === 0) return null;
      program = [decl("int", "a", lit(a)), decl("int", "b", lit(b)), decl("double", "x", bin("/", ref("a"), ref("b"))), decl("double", "y", bin("/", cast("double", ref("a")), lit(c))), assign("a", "%=", ref("b")),
        print(bin("+", bin("+", ref("x"), ref("y")), ref("a")))];
      const x = Math.trunc(a / b), y = a / c, r = a % b;
      explanation = H.lines(`x = ${a} / ${b} = ${x} (int division) → ${show(x)}.`, `y = (double) ${a} / ${c} = ${show(y)}.`, `a %= b makes a = ${r}.`, `x + y + a = ${show(x)} + ${show(y)} + ${r} = ${show(x + y + r)}.`);
    }
    return H.outputDraft({ shape, program, flags: ["intDivReal", "intDivRound", "noOverflow", "overflowThrows", "castRounds", "remAbs", "doubleShowsInt", "remainderQuotient", "overflowClamps"], prompt: "What is printed?", explanation });
  },
};

// Which statement first goes wrong? -------------------------------------------------
const firstProblem = {
  id: "nl.first-problem", mode: MODE, label: "Find the first problem", skill: "Numeric result tracing",
  weights: { beginner: 0, intermediate: 2, advanced: 3 },
  build(rng, d) {
    const shape = rng.pick(d === "intermediate" ? ["overflow-line", "exception-line"] : ["overflow-line", "exception-line", "overflow-chain"]);
    const [v, w] = H.pickNames(rng, 2, ["total", "count", "size", "score", "steps", "items", "units"]);
    let program, roles;
    if (shape === "overflow-line" || shape === "overflow-chain") {
      const start = rng.int(2, 9) * 10000000;
      const f1 = rng.int(2, 4), f2 = rng.int(10, 30);
      if (start * f1 > MAX || start * f1 * f2 <= MAX) return null;
      const grow1 = assign(v, "*=", lit(f1)), grow2 = assign(v, "*=", lit(f2));
      const use = decl("int", w, bin("/", ref(v), lit(2))), out = print(ref(w));
      const declStmt = decl("int", v, lit(start));
      program = shape === "overflow-chain"
        ? [declStmt, grow1, assign(v, "+=", lit(rng.int(1, 999))), grow2, use, out]
        : [declStmt, grow1, grow2, use, out];
      roles = [{ s: declStmt, misc: "startAtMax" }, { s: grow1, misc: "largeNotOverflow" }, { s: use, misc: "printedLine" }, { s: out, misc: "printedLine" }];
    } else {
      const m = rng.int(2, 9), y = m * rng.int(2, 9), x = rng.int(10, 99);
      const declA = decl("int", v, lit(x)), declB = decl("int", w, bin("%", lit(y), lit(m)));
      const ratio = decl("int", "ratio", bin("/", ref(v), ref(w))), out = print(ref("ratio"));
      const first = print(ref(v));
      program = [declA, declB, first, ratio, out];
      roles = [{ s: declB, misc: "zeroProducerThrows" }, { s: out, misc: "printedLine" }, { s: first, misc: "noPartialOutput" }, { s: declA, misc: "divZeroCompile" }];
    }
    const result = P.run(program, { flags: { overflowThrows: true } });
    if (!result.exception) return null;
    const bad = result.exception.stmt;
    const rendered = P.renderProgram(program), text = s => rendered.lines[rendered.lineOf.get(s) - 1].trim();
    if (new Set(program.map(text)).size !== program.length) return null;
    const isException = shape === "exception-line";
    let explanation;
    if (isException) explanation = H.lines(`${w} = ${P.renderExpr(program[1].e)} = 0. Producing 0 is not an error by itself.`, `${text(bad)} divides an int by zero, so it throws ArithmeticException.`);
    else {
      const out = []; let val = BigInt(program[0].e.v);
      for (const s of program.slice(1)) {
        if (s.k !== "assign") break;
        const k = BigInt(s.e.v); val = s.op === "*=" ? val * k : val + k;
        const over = val > BigInt(MAX);
        out.push(`${text(s)} → exact ${val}${over ? `, above 2147483647: this is where the int wraps (to ${wrap(Number(val))})` : " (still fits)"}.`);
        if (over) break;
      }
      explanation = H.lines(...out, "Later statements only use the already-wrong value.");
    }
    return {
      kind: "statement-choice", shape, program,
      prompt: isException ? "Which statement throws an exception?" : "Which statement is the first to produce an overflowed (wrong) value?",
      answer: text(bad),
      candidates: roles.filter(r => r.s !== bad).map(r => ({ text: text(r.s), misc: r.misc })),
      optionCheck: t => t === text(bad),
      explanation,
      verify: [{ type: "firstProblem", program, expectStatement: program.indexOf(bad), exceptionKind: isException ? "ArithmeticException" : "overflow" }],
    };
  },
};

export const LIMITS_FAMILIES = [intLimits, overflowMultiply, overflowDetect, midpoint, intDivision, average, floatEquality, floatPrint, rounding, divZero, literalCast, compound, trace, firstProblem];
