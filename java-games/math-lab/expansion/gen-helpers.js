// Math Lab expansion: helpers shared by family builders.
import * as P from "./java-program.js";
import * as N from "./java-numeric.js";

export const INT_NAMES = ["count", "total", "score", "points", "steps", "value", "level", "amount", "items", "sum",
  "result", "balance", "tickets", "coins", "distance", "size", "width", "height", "area", "num", "a", "b", "x", "y", "n", "k", "big", "start"];
export const DOUBLE_NAMES = ["price", "avg", "rate", "ratio", "temp", "weight", "grade", "share", "cost", "time", "d", "r", "value", "amount", "result", "answer"];

/** n distinct variable names from a pool, avoiding names already used. */
export function pickNames(rng, n, pool = INT_NAMES, avoid = []) {
  const options = pool.filter(name => !avoid.includes(name));
  return rng.sample(options, n);
}

export const misconceptionText = key => P.MISCONCEPTIONS[key] || EXTRA_MISCONCEPTIONS[key] || key;

/** Misconceptions that are produced by family-specific reasoning rather than interpreter flags. */
export const EXTRA_MISCONCEPTIONS = {
  absDouble: "Assuming Math.abs always returns a double",
  absInt: "Assuming Math.abs always returns an int",
  absSum: "Adding the two magnitudes instead of finding the distance between the values",
  absWholeExpr: "Applying Math.abs to the whole expression instead of only its argument",
  powZero: "Thinking any number to the power 0 is 0",
  powZeroBase: "Thinking x to the power 0 is x",
  negExpNegates: "Thinking a negative exponent makes the result negative",
  negExpIgnored: "Ignoring the minus sign on the exponent",
  sqrtHalf: "Dividing by 2 instead of taking the square root",
  sqrtSquares: "Squaring instead of taking the square root",
  sqrtDistributes: "Taking the square root of each term separately",
  sqrtIgnored: "Forgetting to take the square root",
  sqrtNegative: "Taking the root of the magnitude and keeping the minus sign",
  sqrtThrows: "Assuming Math.sqrt of a negative number throws an exception",
  castWraps: "Thinking a double-to-int cast wraps around like int arithmetic",
  castSaturates: "Thinking a long-to-int cast stops at Integer.MAX_VALUE",
  compileLossy: "Expecting the compiler to accept a narrowing assignment",
  compileStrict: "Thinking this code needs an explicit cast to compile",
  randomInclusive: "Treating 1.0 as a possible Math.random() result",
  randomNoZero: "Thinking Math.random() never returns 0.0",
  randomInteger: "Confusing Math.random() with a random integer",
  randomNegative: "Thinking Math.random() can return negative values",
  missingOffset: "Forgetting the value added after the cast",
  offsetInsideOnly: "Adding the offset to the wrong part of the expression",
  wrongMultiplier: "Multiplying by the wrong interval size",
  multiplierIsHigh: "Using the upper bound as the multiplier",
  oneTooFew: "Using hi - lo instead of hi - lo + 1, which excludes the top value",
  oneTooMany: "Adding one extra value to the interval size",
  castPlacement: "Casting Math.random() before multiplying (it is then always 0)",
  stepIgnored: "Ignoring the multiplication applied after the cast",
  intendedRange: "Assuming the code produces what the programmer intended",
  sizeIsMultiplier: "Using the multiplier as the count without considering the cast and step",
  overcautiousDouble: "Assuming every double calculation picks up round-off error",
  roundOffDirection: "Expecting the round-off error in the other direction",
  wrongBranch: "Following the wrong branch after a mistaken comparison",
  plusHalfWorks: "Assuming (int) (x + 0.5) rounds correctly for negative values",
  printedLine: "Noticing the problem only on the line that prints it",
  largeNotOverflow: "Assuming a large value overflows before it passes the limit",
  startAtMax: "Thinking a value equal to the limit is already an overflow",
  longDestination: "Assuming a long destination makes int multiplication use long",
  divZeroCompile: "Thinking the compiler rejects division by zero",
  nanThrows: "Assuming NaN causes an exception",
  infinityZero: "Treating Infinity as 0 when cast to int",
  earlyRounding: "Rounding (truncating) too early",
  sumNotWrapped: "Expecting the sum to fit because each operand fits",
  safeMidpoint: "Assuming the overflow-safe formula was used",
  mixedStaysInt: "Assuming int + double stays an int",
  noMinusLiteral: "Overlooking the negative sign",
  powAddExp: "Adding exponents for a power of a power instead of multiplying them",
  wholeNumberImpossible: "Thinking Math.random() * k can never land on a whole number",
  interiorValue: "Missing that every value inside the range is possible",
  nearTopExcluded: "Thinking values just below the upper bound are excluded",
  topExcluded: "Thinking the largest value in the range can never occur",
  multiplierExcluded: "Thinking the multiplier value itself can never occur",
  zeroExcluded: "Thinking 0 can never be produced",
  countIsMax: "Using the largest value as the number of possible values",
  maxMinSwap: "Mixing up Math.max and Math.min",
  maxMinBounds: "Adding the bounds instead of evaluating the method calls",
  methodReturnsDouble: "Assuming every Math method returns a double",
  clampIgnored: "Ignoring the Math.max/Math.min clamp",
  loopOffByOne: "Counting one extra loop iteration",
  productFits: "Expecting the product to fit because each factor fits",
  forgotDivide: "Forgetting the division by 2 after the sum",
  divisionGivesDouble: "Assuming / always produces a decimal (double) result",
  orderIrrelevant: "Assuming the order of * and / never matters with ints",
  rightToLeft: "Evaluating * and / right to left",
  missedMultiply: "Forgetting the final multiplication",
  longSuffixOptional: "Assuming a long variable lets you write any whole number without L",
  longSuffixMissing: "Thinking a long literal still cannot exceed the int range",
  partialRoundOff: "Expecting round-off error in only one of the calculations",
  printRounds: "Thinking println hides tiny round-off errors",
  equalityTolerant: "Thinking == ignores tiny differences between doubles",
  toleranceFails: "Thinking the tolerance comparison fails too",
  castIgnored: "Thinking the cast keeps the decimal part",
  infinityNaN: "Confusing Infinity with NaN",
  noPartialOutput: "Thinking an exception erases output that was already printed",
  nanEqualsItself: "Assuming NaN equals itself",
  zeroProducerThrows: "Blaming the statement that produced 0 instead of the division by it",
  halvesAccumulate: "Expecting the two .5 additions to add up to 1",
};

/** Run under one flag set; returns outcome text or null if unavailable/uninteresting. */
export function outcomeUnder(program, flags) {
  try {
    const r = P.run(program, { flags });
    return P.outcomeText(r);
  } catch (e) {
    if (e instanceof P.MisconceptionUnavailable) return null;
    throw e;
  }
}

/**
 * Build a "What is printed?" draft from a program.
 *  flags: misconception keys run through the interpreter
 *  alts:  [{misc, program}] alternative programs that model an error
 *  extras:[{misc, text}] literal candidates (e.g. "Does not compile")
 */
export function outputDraft({ program, flags = [], alts = [], extras = [], ...rest }) {
  const result = P.run(program);
  const answer = P.outcomeText(result);
  const candidates = [];
  for (const key of flags) {
    const text = outcomeUnder(program, { [key]: true });
    if (text !== null) candidates.push({ text, misc: key });
  }
  for (const alt of alts) {
    const text = outcomeUnder(alt.program, alt.flags || {});
    if (text !== null) candidates.push({ text, misc: alt.misc });
  }
  candidates.push(...extras);
  return {
    kind: "output", program, answer, candidates, result,
    verify: [{ type: "program", program, expect: expectation(result) }],
    ...rest,
  };
}

export function expectation(result) {
  if (result.compileError) return { compileError: true };
  return { out: result.out, exception: result.exception ? result.exception.name : null };
}

export const fmt = value => N.javaString(value);
export const showInt = v => String(v);
export const showDouble = v => N.javaDouble(v);

/** Doubles with short exact binary representations (k/4 or k/8), so printing is unambiguous. */
export function quarterValue(rng, lo, hi, denominators = [2, 4]) {
  const d = rng.pick(denominators);
  let v;
  do { v = rng.int(lo * d, hi * d) / d; } while (Number.isInteger(v));
  return v;
}
/** One-decimal doubles such as 7.3 (not exactly representable, but prints exactly). */
export function tenthValue(rng, lo, hi, avoidHalf = false) {
  let v;
  do { v = rng.int(lo * 10, hi * 10) / 10; } while (Number.isInteger(v) || (avoidHalf && Math.abs(v % 1) === 0.5));
  return Number(v.toFixed(1));
}

export const lines = (...parts) => parts.filter(Boolean).join("\n");
