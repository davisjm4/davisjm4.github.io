export const mathGame = {
  name: "Math Lab", icon: "÷",
  description: "Make sense of Java remainder, division, casts, and expression order.",
  concepts: "Remainder · Division · Casting · Precedence",
  modes: {
    modulus: "Modulus",
    division: "Integer and Double Division",
    casting: "Casting",
    expressions: "Mixed Expressions",
    reverse: "Reverse Challenges",
  },
};

// A deliberately limited Java numeric grammar. No eval, variables, calls,
// assignment, or implicit conversion based on a destination variable.
export function evaluate(expression) {
  const tokens = expression.match(/\d+\.\d+|\d+|int\b|double\b|[()+*/%\-]/g) || [];
  if (tokens.join("") !== expression.replace(/\s/g, "")) throw Error("Unsupported expression");
  let index = 0;
  const int = n => ({ value: n | 0, type: "int" });
  function unary() {
    const t = tokens[index++];
    if (t === "-" || t === "+") {
      const n = unary();
      const v = t === "-" ? -n.value : n.value;
      return n.type === "int" ? int(v) : { value: v, type: "double" };
    }
    if (t === "(") {
      if (["int", "double"].includes(tokens[index]) && tokens[index + 1] === ")") {
        const type = tokens[index]; index += 2;
        const n = unary();
        return type === "double" ? { value: n.value, type } : int(
          Number.isNaN(n.value) ? 0 : Math.max(-2147483648, Math.min(2147483647, Math.trunc(n.value))),
        );
      }
      const n = addition();
      if (tokens[index++] !== ")") throw Error("Unbalanced parentheses");
      return n;
    }
    if (!/^\d+(\.\d+)?$/.test(t || "")) throw Error("Expected numeric operand");
    return t.includes(".") ? { value: Number(t), type: "double" } : int(Number(t));
  }
  function operation(a, op, b) {
    const type = a.type === "double" || b.type === "double" ? "double" : "int";
    if (type === "int" && ["/", "%"].includes(op) && b.value === 0) throw Error("ArithmeticException");
    const value = op === "+" ? a.value + b.value : op === "-" ? a.value - b.value :
      op === "*" ? a.value * b.value : op === "/" ? a.value / b.value : a.value % b.value;
    return type === "int" ? int(Math.trunc(value)) : { value, type };
  }
  function product() {
    let n = unary();
    while (["*", "/", "%"].includes(tokens[index])) {
      const op = tokens[index++]; n = operation(n, op, unary());
    }
    return n;
  }
  function addition() {
    let n = product();
    while (["+", "-"].includes(tokens[index])) {
      const op = tokens[index++]; n = operation(n, op, product());
    }
    return n;
  }
  const n = addition();
  if (index !== tokens.length) throw Error("Unexpected token");
  return n;
}

export function store(expression, type) {
  const n = evaluate(expression);
  if (type === "int" && n.type !== "int") throw Error("Lossy conversion");
  if (!["int", "double"].includes(type)) throw Error("Unsupported storage type");
  return { value: n.value, type };
}
export function format(n, type = "int") {
  const value = typeof n === "object" ? n.value : n;
  type = typeof n === "object" ? n.type : type;
  if (!Number.isFinite(value)) throw Error("Non-finite ordinary result");
  if (type === "double" && Object.is(value, -0)) return "-0.0";
  return String(value) + (type === "double" && Number.isInteger(value) ? ".0" : "");
}
const choose = (a, rng) => a[Math.floor(rng() * a.length)];
const integer = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));
function shuffle(a, rng) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const numericKey = value => value === 0 ? "0" : String(value);

export const structures = {
  modulus: ["larger", "smaller", "divisible", "remainder", "negative-dividend", "negative-divisor", "both-negative"],
  division: ["integer", "widened", "double-right", "double-left", "both-double"],
  casting: ["after-division", "before-division", "denominator-cast", "positive-cast", "negative-cast", "cast-quotient"],
  expressions: ["add-division", "grouped-sum", "subtract-remainder", "remainder-product", "division-product", "product-remainder", "nested-group", "double-precedence"],
  reverse: ["decimal-quotient", "whole-quotient", "remainder-choice", "cast-choice", "precedence-choice"],
};

// Results of reading one operator as another (/ as %, + as -, * as +, ...). Each is the
// real value of the displayed expression under a specific operator confusion.
function operatorConfusions(expression, type) {
  const out = [], ops = [...expression.matchAll(/(?<=[\d)]\s)[-+*/%](?=\s[\d(-])/g)];
  for (const m of ops) for (const alt of ["+", "-", "*", "/", "%"]) {
    if (alt === m[0]) continue;
    const swapped = expression.slice(0, m.index) + alt + expression.slice(m.index + 1);
    try {
      const v = evaluate(swapped).value;
      if (Number.isFinite(v) && Math.abs(v) < 10000 && (type === "double" ? String(v).replace(/^-?\d+\.?/, "").length <= 3 : Number.isInteger(v))) out.push(v);
    } catch { /* e.g. ArithmeticException: not a usable distractor */ }
  }
  // One integer operand misread by one (a slip while tracing): its result stays in the same
  // range as the true answer, so the key is not recognisable by its size alone.
  for (const m of expression.matchAll(/(?<![\d.])\d+(?![\d.])/g)) for (const d of [-1, 1]) {
    if (/^\s*\./.test(expression.slice(m.index + m[0].length))) continue;
    const swapped = expression.slice(0, m.index) + (Number(m[0]) + d) + expression.slice(m.index + m[0].length);
    try {
      const v = evaluate(swapped).value;
      if (Number.isFinite(v) && Math.abs(v) < 10000 && (type === "double" ? String(v).replace(/^-?\d+\.?/, "").length <= 3 : Number.isInteger(v))) out.push(v);
    } catch { /* ArithmeticException etc. */ }
  }
  return out;
}

function numericChoices(answer, type, misconceptions, rng, expression, choiceFeedback) {
  // Deduplicate by numerical value, not by spelling (3 and 3.0 are one value).
  const seen = new Set([numericKey(answer)]), pool = [], template = new Set(misconceptions.map(numericKey));
  for (const value of choiceFeedback ? misconceptions : [...misconceptions, ...operatorConfusions(expression, type)]) {
    if (!Number.isFinite(value) || seen.has(numericKey(value))) continue;
    seen.add(numericKey(value)); pool.push(value);
  }
  if (pool.length < 3) return null;
  // Choose WHICH three misconception values appear so that the key's rank by value is
  // not a function of the template (taking the first three always put, e.g., the
  // nested-group key smallest). Every subset shows real misconception results; the
  // target rank is uniform over the ranks the pool can produce.
  const subsets = [];
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) for (let k = j + 1; k < pool.length; k++) {
    const trio = [pool[i], pool[j], pool[k]];
    subsets.push({ trio, rank: trio.filter(v => v < answer).length, own: trio.filter(v => template.has(numericKey(v))).length });
  }
  // A nonintegral key must keep another nonintegral choice (never "the only decimal").
  if (!Number.isInteger(answer)) {
    const keep = subsets.filter(x => x.trio.some(v => !Number.isInteger(v)));
    if (!keep.length) return null;
    subsets.length = 0; subsets.push(...keep);
  }
  const ranks = [...new Set(subsets.map(x => x.rank))].sort();
  const rank = ranks[Math.floor(rng() * ranks.length)];
  // Prefer the sets with the most template misconceptions (the named, teachable mistakes);
  // operator-confusion / operand-slip results fill in only where the target rank needs them.
  const atRank = subsets.filter(x => x.rank === rank), most = Math.max(...atRank.map(x => x.own));
  const fits = atRank.filter(x => x.own >= most - 1);
  const wrong = fits[Math.floor(rng() * fits.length)].trio.map(v => format(v, type));
  return shuffle([format(answer, type), ...wrong], rng);
}

function build(mode, shape, rng) {
  let a = integer(3, 19, rng), b = integer(2, 6, rng), c = integer(2, 5, rng);
  let expression, type = "int", explanation, misconceptions;
  let choiceFeedback;
  function useMistakes(mistakes) {
    misconceptions = mistakes.map(([value]) => value);
    choiceFeedback = Object.fromEntries(mistakes.slice().reverse().map(([value, why]) => [numericKey(value), why]));
  }
  if (mode === "modulus") {
    if (shape === "smaller") a = integer(1, b - 1, rng);
    else if (shape === "divisible") {
      b = integer(3, 12, rng);
      const multiple = b * integer(2, 6, rng);
      a = rng() < 0.5 ? multiple : multiple + choose([-2, -1, 1, 2], rng);
    } else if (["negative-divisor", "both-negative"].includes(shape)) {
      b = integer(4, 13, rng);
      a = b * integer(0, 5, rng) + integer(1, b - 1, rng);
    }
    else { a = b * integer(1, 4, rng) + integer(1, b - 1, rng); }
    if (["negative-dividend", "both-negative"].includes(shape)) a = -a;
    if (["negative-divisor", "both-negative"].includes(shape)) b = -b;
    expression = `${a} % ${b}`;
    const quotient = Math.trunc(a / b), remainder = a - quotient * b;
    explanation = `${a} / ${b} truncates to ${quotient}; ${a} − (${quotient} × ${b}) leaves ${remainder}. A nonzero Java remainder has the dividend's sign.`;
    misconceptions = [quotient, a, b, -remainder, Math.abs(remainder), Math.abs(b) - Math.abs(remainder), quotient * b, remainder + Math.sign(a)];
    if (["divisible", "negative-divisor", "both-negative"].includes(shape)) useMistakes([
      [quotient, "This gives the integer quotient. The % operator gives what remains after removing the quotient times the divisor."],
      [Math.abs(quotient), "This gives the magnitude of the quotient. Use the signed quotient to remove completed groups, then report what remains."],
      [-Math.abs(quotient), "This gives a negative quotient. The remainder is the leftover after removing the completed groups."],
      [a - Math.floor(a / b) * b, "This rounds the quotient down. Java truncates toward zero before calculating the remainder."],
      [a - Math.round(a / b) * b, "This subtracts the nearest whole multiple. Java uses the quotient truncated toward zero."],
      [Math.sign(b) * Math.abs(remainder), "This gives the remainder the divisor's sign. A nonzero Java remainder takes the dividend's sign."],
      [Math.abs(remainder), "This drops the minus sign. A negative dividend produces a negative remainder when the remainder is nonzero."],
      [b % a, "This swaps the operands. Take the remainder of the left operand divided by the right operand."],
      [quotient * b, "This gives the multiple that is removed. Subtract the multiple from the dividend to get the remainder."],
      [a - quotient * Math.abs(b), "This discards the divisor's sign when multiplying back. The quotient times the original divisor is the multiple to subtract."],
      [a - (quotient + Math.sign(quotient)) * b, "This removes one group beyond the truncated quotient. Stop after the whole groups that fit in the dividend."],
      ...(shape === "divisible" ? [[0, "This treats a near multiple as an exact multiple. Check whether subtracting the last whole multiple leaves a nonzero remainder."]] : []),
    ]);
  } else if (mode === "division") {
    b = choose([2, 4], rng); a = b * integer(1, 5, rng) + choose([1, b - 1], rng);
    if (rng() < 0.35) a = -a;
    const left = ["double-left", "both-double"].includes(shape) ? `${a}.0` : a;
    const right = ["double-right", "both-double"].includes(shape) ? `${b}.0` : b;
    expression = `${left} / ${right}`;
    type = shape === "integer" ? "int" : "double";
    const decimal = a / b, whole = Math.trunc(decimal);
    explanation = ["integer", "widened"].includes(shape)
      ? `${expression} uses integer division and truncates toward zero to ${whole}. ${type === "double" ? `Assigning it to a double stores ${format(whole, "double")}.` : `The int stores ${whole}.`}`
      : `A double operand makes ${expression} floating-point division, producing ${format(decimal, "double")}. The double stores that value.`;
    misconceptions = ["integer", "widened"].includes(shape)
      ? [decimal, whole, Math.round(decimal), Math.floor(decimal), Math.ceil(decimal), a % b]
      : [whole, Math.round(decimal), decimal + Math.sign(decimal), Math.floor(decimal), Math.ceil(decimal), a % b];
  } else if (mode === "casting") {
    b = choose([2, 4], rng); a = b * integer(1, 4, rng) + 1;
    if (rng() < 0.4) a = -a;
    type = "double";
    const decimal = a / b, whole = Math.trunc(decimal);
    if (shape === "after-division") {
      expression = `(double) (${a} / ${b})`;
      explanation = `${a} / ${b} happens first using integer division, giving ${whole}. Casting afterward produces ${format(whole, "double")}; it cannot recover the discarded fraction.`;
    } else if (["before-division", "denominator-cast"].includes(shape)) {
      expression = shape === "before-division" ? `(double) ${a} / ${b}` : `${a} / (double) ${b}`;
      explanation = `The cast makes one operand a double before division. Floating-point division produces ${format(decimal, "double")}.`;
    } else if (shape === "cast-quotient") {
      expression = `(int) (${a}.0 / ${b})`; type = "int";
      explanation = `Floating-point division produces ${format(decimal, "double")}. The int cast then truncates toward zero to ${whole}.`;
    } else {
      a = integer(shape === "negative-cast" ? 0 : 2, 12, rng) + choose([0.6, 0.7, 0.8, 0.9], rng);
      a = Number(a.toFixed(1)); if (shape === "negative-cast") a = -a;
      expression = `(int) ${a}`; type = "int";
      explanation = `Casting ${a} to int discards its fractional part toward zero, producing ${Math.trunc(a) || 0}. It does not round to the nearest integer${a < 0 ? " or down toward negative infinity" : ""}.`;
    }
    misconceptions = ["positive-cast", "negative-cast"].includes(shape)
      ? [Math.round(a), Math.floor(a), Math.ceil(a), a, -Math.trunc(a), -a, Math.trunc(a) - Math.sign(a)]
      : ["before-division", "denominator-cast"].includes(shape)
        ? [Math.trunc(a / b), Math.round(a / b), a / b + Math.sign(a), Math.floor(a / b), a % b]
        : [a / b, Math.trunc(a / b), Math.round(a / b), Math.floor(a / b), Math.ceil(a / b), a % b, -Math.trunc(a / b)];
  } else if (mode === "expressions") {
    let d = integer(2, 4, rng);
    if (shape === "add-division") {
      expression = `${a} + ${b} / ${c}`;
      explanation = `Divide first: ${b} / ${c} is ${Math.trunc(b / c)} using integer division. Then add ${a}, giving ${evaluate(expression).value}.`;
      misconceptions = [Math.trunc((a + b) / c), a + Math.round(b / c), (a + b) * c, a + b % c, a + b];
    } else if (shape === "grouped-sum") {
      expression = `(${a} + ${b}) / ${c}`;
      explanation = `The parentheses produce ${a + b} first. Integer division by ${c} truncates toward zero to ${Math.trunc((a + b) / c)}.`;
      misconceptions = [a + Math.trunc(b / c), Math.round((a + b) / c), (a + b) % c, a + b, Math.trunc(a / c) + b];
    } else if (shape === "subtract-remainder") {
      expression = `${a} - ${b} % ${c}`;
      explanation = `Remainder comes before subtraction: ${b} % ${c} is ${b % c}. Subtracting it from ${a} gives ${a - b % c}.`;
      misconceptions = [(a - b) % c, a - Math.trunc(b / c), a - b, a + b % c, a % c];
    } else if (shape === "remainder-product") {
      expression = `${a} % ${b} * ${c}`;
      explanation = `% and * have equal precedence, so work left to right: ${a} % ${b} is ${a % b}, then multiply by ${c} to get ${(a % b) * c}.`;
      misconceptions = [a % (b * c), Math.trunc(a / b) * c, a % b, a * c, a - b * c];
    } else if (shape === "division-product") {
      expression = `${a} / ${b} * ${c}`;
      explanation = `/ and * have equal precedence, so divide left to right first: ${a} / ${b} is ${Math.trunc(a / b)}. Multiplying by ${c} gives ${Math.trunc(a / b) * c}.`;
      misconceptions = [Math.trunc(a / (b * c)), Math.trunc(a * c / b), a % b * c, Math.round(a / b) * c, Math.trunc(a / b)];
    } else if (shape === "product-remainder") {
      c = integer(4, 13, rng);
      if (rng() < 0.5) a = -a;
      const product = a * b;
      expression = `${a} * ${b} % ${c}`;
      explanation = `* and % have equal precedence and run left to right. Multiply to get ${a * b}, then ${a * b} % ${c} gives ${(a * b) % c}.`;
      useMistakes([
        [a * (b % c), "This groups the remainder on the right first. Multiplication and remainder have equal precedence, so the product is evaluated first."],
        [Math.trunc(product / c), "This is the integer quotient of the product. The % operator asks for the leftover after division."],
        [product, "This stops at the intermediate product. Apply % to the product before storing result."],
        [a % c, "This skips the second factor. Both factors contribute to the dividend before % is applied."],
        [b % c, "This takes the remainder of the second factor alone. First multiply both factors."],
        [(a + b) % c, "This adds the two factors before taking the remainder. The displayed * multiplies them."],
        [product - Math.floor(product / c) * c, "This rounds the quotient down. Java truncates toward zero, so a negative dividend can leave a negative remainder."],
        [product - Math.round(product / c) * c, "This subtracts the nearest multiple. Java takes the quotient toward zero before finding the leftover."],
        [c % product, "This uses the divisor as the dividend. The product is the left operand of %."],
      ]);
    } else if (shape === "nested-group") {
      if (rng() < 0.5) d = -d;
      if (b !== c && rng() < 0.5) c = -c;
      expression = `${a} - (${b} + ${c}) * ${d}`;
      explanation = `Add inside the parentheses to get ${b + c}, then multiply by ${d} to get ${(b + c) * d}. Subtract that from ${a} to get ${a - (b + c) * d}.`;
      useMistakes([
        [a - b + c * d, "This drops the parentheses. The addition inside them happens before the multiplication or subtraction."],
        [(a - (b + c)) * d, "This subtracts the grouped sum before multiplying. Multiply the grouped sum first."],
        [a - (b + c * d), "This multiplies only the second addend. The factor applies to the entire parenthesized sum."],
        [a - (b * d + c), "This multiplies only the first addend. Both addends are inside the parentheses."],
        [a + (b + c) * d, "This adds the product. The minus sign subtracts the entire product."],
        [a - (b + c), "This leaves out the multiplication. Multiply the grouped sum before subtracting."],
        [a - b * d + c * d, "This subtracts only the first distributed term. Subtracting the grouped product subtracts both terms."],
        [a - b * d - c * d - b - c, "This subtracts the sum twice, once scaled and once unscaled. Subtract the scaled sum once."],
      ]);
    } else {
      c = choose([2, 4], rng); b = c * integer(1, 3, rng) + 1;
      expression = `${a} - ${b} / ${c}.0`; type = "double";
      explanation = `Divide before subtracting: the double operand makes ${b} / ${c}.0 produce ${format(b / c, "double")}. Subtraction gives ${format(a - b / c, "double")}.`;
      misconceptions = [a - Math.trunc(b / c), a - b / c + 1, (a - b) / c, Math.round(a - b / c), Math.floor(a - b / c), a - b % c, a + b / c];
    }
  } else if (mode === "reverse") {
    b = choose([2, 4], rng); a = b * integer(2, 5, rng) + 1;
    if (rng() < 0.3) a = -a;
    let targetExpression, candidates, prompt;
    if (shape === "remainder-choice") {
      const divisor = integer(3, 7, rng), target = integer(1, divisor - 1, rng);
      a = divisor * integer(2, 5, rng) + target;
      targetExpression = `${a} % ${divisor}`;
      candidates = Array.from({ length: 13 }, (_, i) => `${a + i - 6} % ${divisor}`);
      prompt = `Which expression produces a remainder of ${target}?`;
    } else {
      targetExpression = shape === "decimal-quotient" ? `(double) ${a} / ${b}` :
        shape === "whole-quotient" ? `(double) (${a} / ${b})` :
        shape === "cast-choice" ? `(int) (${a}.0 / ${b})` : `${a} + ${b} / 2`;
      candidates = [
        `${a} / ${b}`, `(double) (${a} / ${b})`, `(double) ${a} / ${b}`,
        `(int) (${a}.0 / ${b})`, `${a} % ${b}`, `(${a} + ${b}) / 2.0`,
        `${a} / (${b} * 2.0)`, `(${a} + ${b}) / ${b}`, `${a} + ${b} / 2`,
        `(${a} + ${b}) / 2`, `${a} - ${b} / 2`,
      ];
      prompt = `Which expression produces ${format(evaluate(targetExpression))}?`;
    }
    const target = evaluate(targetExpression), seen = new Set([numericKey(target.value)]), wrong = [];
    for (const code of shuffle(candidates, rng)) {
      const v = evaluate(code).value;
      if (!Number.isFinite(v) || seen.has(numericKey(v))) continue;
      // Keep exact terminating decimal results for the introductory pool.
      if (String(v).replace(/^-?\d+\.?/, "").length > 3) continue;
      seen.add(numericKey(v)); wrong.push(code);
    }
    if (wrong.length < 3) return null;
    const choices = shuffle([targetExpression, ...wrong.slice(0, 3)], rng);
    return {
      mode, shape, prompt, code: "", kind: "reverse", answer: targetExpression,
      choices, target: target.value,
      explanation: `${targetExpression} evaluates to ${format(target)}. ${shape === "remainder-choice" ? `Integer division gives quotient ${Math.trunc(a / Number(targetExpression.split("%")[1]))}; subtract its product with the divisor to find the remainder.` : shape === "whole-quotient" ? "The integer division happens before the cast to double." : shape === "cast-choice" ? "Floating-point division happens inside the parentheses; the int cast then truncates toward zero." : shape === "precedence-choice" ? "Division comes before addition; integer division truncates toward zero." : "Casting an operand before division makes the division floating-point."}`,
      checks: choices.map(expression => ({ expression, expected: evaluate(expression) })),
    };
  } else throw Error("Unknown mode");
  const stored = store(expression, type);
  const answer = format(stored);
  const choices = numericChoices(stored.value, type, misconceptions, rng, expression, choiceFeedback);
  if (!choices) return null;
  return {
    mode, shape, kind: "value", expression, type, code: `${type} result = ${expression};`,
    ...(choiceFeedback ? { choiceFeedback: Object.fromEntries(choices.filter(choice => choice !== answer).map(choice => [choice, choiceFeedback[numericKey(Number(choice))]])) } : {}),
    prompt: "What is stored in result?", answer, choices, explanation,
    checks: [{ expression, storageType: type, expected: stored }],
  };
}

export function validateQuestion(q) {
  if (!q || q.choices.length !== 4 || new Set(q.choices).size !== 4) return false;
  if (q.kind === "reverse") {
    const values = q.choices.map(c => evaluate(c).value);
    return new Set(values.map(numericKey)).size === 4 && values.filter(n => n === q.target).length === 1 && evaluate(q.answer).value === q.target;
  }
  const n = store(q.expression, q.type);
  return q.answer === format(n) && q.choices.filter(c => c === q.answer).length === 1 &&
    new Set(q.choices.map(c => numericKey(Number(c)))).size === 4 &&
    q.choices.every(c => Number.isFinite(Number(c))) && Math.abs(n.value) < 10000;
}

// A question whose key is just a number written in the code (a term evaluated to 0, e.g. 14 + 4 / 5)
// can be answered without evaluating. The "integer division gives 0" lesson is kept in a small share.
const keyIsWritten = q => q.kind === "value" && (q.expression.match(/\d+(\.\d+)?/g) || []).some(t => Number(t) === Number(q.answer));

export function generate(mode, shape, rng = Math.random) {
  if (!structures[mode] || !structures[mode].includes(shape)) throw Error("Unknown Math Lab structure");
  for (let i = 0; i < 100; i++) {
    const q = build(mode, shape, rng);
    if (q && validateQuestion(q)) {
      if (mode === "expressions" && keyIsWritten(q) && rng() > 0.1) continue;
      return { ...q, game: "math-lab", topic: mode };
    }
  }
  throw Error(`Cannot generate ${mode}/${shape}`);
}
export const assess = (q, choice) => q.choices.includes(choice) && choice === q.answer;

// Rotate structural templates as well as modes. Keep the before/after-cast
// pair apart rather than showing the counterpart as a hint on the next round.
export function family(mode, shape) {
  if (["after-division", "before-division", "denominator-cast"].includes(shape) ||
      ["decimal-quotient", "whole-quotient"].includes(shape)) return "division-cast";
  return mode + ":" + shape;
}
export function createDeck(rng = Math.random) {
  const bags = new Map(); let modeBag = [], history = [], recent = [];
  return { next(selected = "mixed") {
    if (selected !== "mixed" && !structures[selected]) throw Error("Unknown practice mode");
    if (!modeBag.length) modeBag = shuffle(Object.keys(structures), rng);
    let mode = selected;
    if (selected === "mixed") {
      if (modeBag[0] === history.at(-1)?.mode && modeBag.length > 1) [modeBag[0], modeBag[1]] = [modeBag[1], modeBag[0]];
      mode = modeBag.shift();
    }
    if (!bags.get(mode)?.length) bags.set(mode, shuffle(structures[mode], rng));
    const bag = bags.get(mode), lastFamilies = history.slice(-2).map(q => family(q.mode, q.shape));
    const shape = bag.find(s => !lastFamilies.includes(family(mode, s)));
    // Defer a nearly exhausted paired family by taking a different template
    // from the next cycle. The deferred template remains in its bag.
    const selectedShape = shape || choose(structures[mode].filter(s => !lastFamilies.includes(family(mode, s))), rng);
    const at = bag.indexOf(selectedShape); if (at >= 0) bag.splice(at, 1);
    let q;
    for (let i = 0; i < 40; i++) {
      q = generate(mode, selectedShape, rng);
      const fingerprint = q.code || q.prompt + q.choices.slice().sort().join("|");
      if (!recent.includes(fingerprint)) { recent.push(fingerprint); break; }
    }
    recent = recent.slice(-12); history.push(q); history = history.slice(-3);
    return q;
  } };
}
