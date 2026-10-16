// Isolated Test Case Builder redesign. Authored structure metadata drives both code and grading.
import { int, pick, shuffle } from "./engine.js?v=platform-expansion-v2";
export const testModes = {
  normal: "Normal Cases",
  boundary: "Boundary Values",
  branches: "Branch Coverage",
  lists: "Empty & Single-element Lists",
  strings: "Strings & Library Documentation",
  iteration: "Iteration",
  errors: "Logic Errors",
  invalid: "Error-producing Inputs",
  nonexposing: "Tests That Do Not Expose Errors",
};
export const field = (id, label, type = "text", extra = {}) => ({
  id,
  label,
  type,
  ...extra,
});
export const format = (v) =>
  v === undefined
    ? "ERROR"
    : typeof v === "boolean"
      ? v
        ? "TRUE"
        : "FALSE"
      : typeof v === "string"
        ? JSON.stringify(v)
        : JSON.stringify(v);
export function outputMatches(raw, value) {
  if (value === undefined) return String(raw).trim().toUpperCase() === "ERROR";
  if (typeof value === "boolean")
    return String(raw).trim().toUpperCase() === format(value);
  if (typeof value === "number")
    return (
      String(raw).trim() !== "" &&
      Number.isFinite(Number(raw)) &&
      Math.abs(Number(raw) - value) <= 1e-9 * Math.max(1, Math.abs(value))
    );
  try {
    return JSON.stringify(JSON.parse(raw)) === JSON.stringify(value);
  } catch {
    return false;
  }
}
const numeric = (x) =>
  String(x).trim() !== "" && Number.isSafeInteger(Number(x));
const atom = (op, a) => ({ op, a });
export function predicate(node, x) {
  if (node.op === "AND") return node.args.every((n) => predicate(n, x));
  if (node.op === "OR") return node.args.some((n) => predicate(n, x));
  if (node.op === "NOT") return !predicate(node.args[0], x);
  return {
    ">": x > node.a,
    "≥": x >= node.a,
    "<": x < node.a,
    "≤": x <= node.a,
    "=": x === node.a,
    "≠": x !== node.a,
  }[node.op];
}
export function expression(n) {
  if (n.op === "NOT") return `NOT (${expression(n.args[0])})`;
  if (n.args) return `(${n.args.map(expression).join(" " + n.op + " ")})`;
  return `value ${n.op} ${n.a}`;
}
const binary = (op, ...args) => ({ op, args });
const predicateNames = [
  "greater",
  "at-least",
  "less",
  "at-most",
  "equal",
  "not-equal",
  "inside",
  "outside",
  "and",
  "or",
  "not",
  "branch-order",
];
function predicateProblem(mode, forced) {
  const a = int(-5, 15),
    b = a + int(4, 9),
    shape = forced || pick(predicateNames),
    op = {
      greater: ">",
      "at-least": "≥",
      less: "<",
      "at-most": "≤",
      equal: "=",
      "not-equal": "≠",
    }[shape];
  let spec = op
    ? atom(op, a)
    : shape === "inside"
      ? binary("AND", atom("≥", a), atom("≤", b))
      : shape === "outside"
        ? binary("OR", atom("<", a), atom(">", b))
        : shape === "and"
          ? binary("AND", atom(">", a), atom("≠", b))
          : shape === "or"
            ? binary("OR", atom("=", a), atom("≥", b))
            : shape === "not"
              ? binary("NOT", binary("AND", atom(">", a), atom("<", b)))
              : binary("AND", atom("≥", a), atom("≠", b));
  const description = op
    ? `Return TRUE exactly when value is ${{ ">": "greater than", "≥": "at least", "<": "less than", "≤": "at most", "=": "equal to", "≠": "different from" }[op]} ${a}.`
    : shape === "inside"
      ? `Return TRUE for values in the inclusive range ${a} through ${b}.`
      : shape === "outside"
        ? `Return TRUE for values outside the inclusive range ${a} through ${b}.`
        : shape === "and"
          ? `Return TRUE when value is greater than ${a} and is not ${b}.`
          : shape === "or"
            ? `Return TRUE when value equals ${a} or is at least ${b}.`
            : shape === "not"
              ? `Return TRUE unless value lies strictly between ${a} and ${b}.`
              : `Return TRUE when value is at least ${a}, except ${b} must return FALSE.`;
  const candidates = [];
  const copy = () => JSON.parse(JSON.stringify(spec));
  const add = (node, mechanism) => {
    const wrong = [];
    for (let x = -20; x <= 40; x++)
      if (predicate(spec, x) !== predicate(node, x)) wrong.push(x);
    if (wrong.length && (wrong.length < 61 || mode === "errors"))
      candidates.push({ node, mechanism, wrong });
  };
  if (op) {
    for (const next of [">", "≥", "<", "≤", "=", "≠"])
      if (next !== op)
        add(
          atom(next, a),
          ([">", "≥"].includes(op) && [">", "≥"].includes(next)) ||
            (["<", "≤"].includes(op) && ["<", "≤"].includes(next))
            ? "equality-boundary"
            : "comparison-direction",
        );
    add(atom(op, a + 2), "wrong-threshold");
  } else {
    let c = copy();
    if (c.op === "NOT") {
      add(c.args[0], "missing-NOT");
      c = binary("AND", binary("NOT", c.args[0].args[0]), c.args[0].args[1]);
      add(c, "misplaced-NOT");
    } else {
      c.op = c.op === "AND" ? "OR" : "AND";
      add(c, "AND-OR");
      c = copy();
      c.args[1].a += 2;
      add(c, "range-endpoint");
      c = copy();
      c.args[0].op =
        c.args[0].op === "≥"
          ? ">"
          : c.args[0].op === ">"
            ? "≥"
            : c.args[0].op === "<"
              ? "≤"
              : "≠";
      add(c, "equality-boundary");
    }
  }
  const defect = pick(candidates),
    buggy = ["errors", "nonexposing"].includes(mode),
    implementation = buggy ? defect.node : spec;
  const evaluate = (x) => predicate(implementation, x),
    required = (x) => predicate(spec, x),
    domain = Array.from({ length: 61 }, (_, i) => i - 20),
    boundaries = domain.filter(
      (x) => x < 40 && required(x) !== required(x + 1),
    );
  let q = {
    structure: shape,
    mechanism: buggy ? defect.mechanism : "none",
    spec,
    implementation,
    fields: [
      field("input", "Input value (integer −20 to 40)", "number"),
      field("expected", "Required result"),
    ],
    context: `Requirement: ${description}\nValid inputs: integers −20 through 40.\n\nPROCEDURE evaluate(value)\n{\n    RETURN(${expression(implementation)})\n}`,
    prompt:
      mode === "normal"
        ? "Choose a typical input. Do not use a comparison constant or an integer immediately beside one. Predict the required result."
        : mode === "boundary"
          ? "Choose two adjacent inputs with different required results. Predict both results."
          : mode === "errors"
            ? "Construct a test exposing an error. Predict the required result and the actual result."
            : "Construct a test that does not expose the error. Predict the required and actual results.",
  };
  if (shape === "branch-order" && buggy) {
    q.context = `Requirement: ${description}\nValid inputs: integers −20 through 40.\n\nPROCEDURE evaluate(value)\n{\n    IF (value ≥ ${a}) { RETURN(TRUE) }\n    IF (value = ${b}) { RETURN(FALSE) }\n    RETURN(FALSE)\n}`;
    q.mechanism = "branch-order";
    q.implementation = atom("≥", a);
  }
  const actual = (x) => predicate(q.implementation, x);
  if (mode === "boundary")
    q.fields.push(
      field("other", "Adjacent input value", "number"),
      field("otherExpected", "Required result for the adjacent input"),
    );
  if (buggy)
    q.fields.push(field("actual", "Actual result of the supplied program"));
  const collectConstants = (n) =>
    n.args ? n.args.flatMap(collectConstants) : [n.a];
  const constants = collectConstants(spec);
  const valid = (x) => domain.includes(x);
  const goal = (x, y) =>
    mode === "normal"
      ? constants.every((t) => Math.abs(x - t) > 1)
      : mode === "boundary"
        ? valid(y) && Math.abs(x - y) === 1 && required(x) !== required(y)
        : mode === "errors"
          ? required(x) !== actual(x)
          : required(x) === actual(x);
  const witness = domain.find((x) =>
    goal(x, mode === "boundary" ? x + 1 : undefined),
  );
  if (witness === undefined) throw Error("No valid predicate test");
  q.example = {
    input: String(witness),
    expected: format(required(witness)),
    ...(buggy ? { actual: format(actual(witness)) } : {}),
    ...(mode === "boundary"
      ? {
          other: String(witness + 1),
          otherExpected: format(required(witness + 1)),
        }
      : {}),
  };
  q.evaluate = (r) => {
    const x = Number(r.input),
      y = Number(r.other),
      legal = numeric(r.input) && valid(x);
    const expected = required(x),
      produced = actual(x);
    const good =
      legal &&
      goal(x, y) &&
      outputMatches(r.expected, expected) &&
      (!buggy || outputMatches(r.actual, produced)) &&
      (mode !== "boundary" ||
        (numeric(r.other) && outputMatches(r.otherExpected, required(y))));
    return {
      correct: good,
      details: `Input ${r.input}: the requirement predicts ${format(expected)}; the supplied program returns ${format(produced)}. ${expected === produced ? "These agree, so this input does not expose an error." : "They differ, so this input exposes an error."}${mode === "boundary" ? ` Adjacent input ${r.other}: required ${format(required(y))}, actual ${format(actual(y))}. Both inputs must be adjacent and switch required truth values.` : ""} ${!legal ? "The input is outside the stated integer domain." : !goal(x, y) ? "This input does not meet the requested test goal." : ""} Requirement evaluates ${expression(spec)}; implementation evaluates ${expression(q.implementation)}${q.mechanism === "branch-order" ? "; its first RETURN ends execution before the exception can be checked" : ""}.`,
    };
  };
  return q;
}
function branchProblem(forced) {
  const a = int(-4, 6),
    b = a + int(3, 7),
    shape = forced || pick(["if", "if-else", "chain", "compound", "nested"]);
  let labels, body, path, result;
  if (shape === "if") {
    labels = ["IF body runs", "IF body is skipped"];
    body = `result ← 0\nIF (value > ${a}) { result ← 1 }\nRETURN(result)`;
    path = (x) => (x > a ? 0 : 1);
    result = (x) => (x > a ? 1 : 0);
  }
  if (shape === "if-else") {
    labels = ["IF branch", "ELSE branch"];
    body = `IF (value < ${a}) { RETURN("low") }\nELSE { RETURN("other") }`;
    path = (x) => (x < a ? 0 : 1);
    result = (x) => (x < a ? "low" : "other");
  }
  if (shape === "chain") {
    labels = ["first IF branch", "second IF branch", "final ELSE branch"];
    body = `IF (value < ${a}) { RETURN("low") }\nELSE\n{\n    IF (value ≤ ${b}) { RETURN("middle") }\n    ELSE { RETURN("high") }\n}`;
    path = (x) => (x < a ? 0 : x <= b ? 1 : 2);
    result = (x) => ["low", "middle", "high"][path(x)];
  }
  if (shape === "compound") {
    labels = ["IF branch", "ELSE branch"];
    body = `IF ((value ≥ ${a}) AND (value ≤ ${b})) { RETURN(TRUE) }\nELSE { RETURN(FALSE) }`;
    path = (x) => (x >= a && x <= b ? 0 : 1);
    result = (x) => path(x) === 0;
  }
  if (shape === "nested") {
    labels = ["outer IF, inner IF", "outer IF, inner ELSE", "outer ELSE"];
    body = `IF (value ≥ ${a})\n{\n    IF (value = ${b}) { RETURN(2) }\n    ELSE { RETURN(1) }\n}\nELSE { RETURN(0) }`;
    path = (x) => (x < a ? 2 : x === b ? 0 : 1);
    result = (x) => [2, 1, 0][path(x)];
  }
  const domain = Array.from({ length: 61 }, (_, i) => i - 20),
    example = {},
    fields = [];
  labels.forEach((label, i) => {
    fields.push(
      field("input" + i, `Input for ${label} (actual program)`, "number"),
      field("expected" + i, `Actual returned result for ${label}`),
    );
    const x = domain.find((n) => path(n) === i);
    example["input" + i] = String(x);
    example["expected" + i] = format(result(x));
  });
  return {
    structure: shape,
    prompt:
      "Construct one test for each requested execution path in the actual program.",
    context: `Valid inputs: integers −20 through 40. Evaluate the program as written.\n\nPROCEDURE classify(value)\n{\n${body
      .split("\n")
      .map((l) => "    " + l)
      .join("\n")}\n}`,
    fields,
    example,
    evaluate: (r) => {
      let correct = true;
      const rows = labels.map((label, i) => {
        const x = Number(r["input" + i]),
          legal = numeric(r["input" + i]) && domain.includes(x),
          hit = legal && path(x) === i,
          good = hit && outputMatches(r["expected" + i], result(x));
        correct &&= good;
        return {
          label,
          input: r["input" + i],
          path: legal ? labels[path(x)] : "invalid input",
          result: legal ? format(result(x)) : "outside domain",
          covered: hit,
        };
      });
      return {
        correct,
        rows,
        details: rows
          .map(
            (row) =>
              `For ${row.label}, input ${row.input} takes ${row.path} and returns ${row.result}. ${row.covered ? "Requested path covered." : "Requested path not covered."}`,
          )
          .join("\n"),
      };
    },
  };
}
function listProblem(forced) {
  const shape =
      forced ||
      pick([
        "count",
        "sum",
        "product",
        "minimum",
        "maximum",
        "search",
        "first",
        "last",
        "all",
        "skip-first",
        "unsafe-min",
      ]),
    limit = int(-2, 5),
    target = int(-2, 5),
    single = ["first", "last"].includes(shape) || pick([true, false]);
  let body, run;
  const fold = (init, update, fn) => {
    body = `result ← ${init}\nFOR EACH value IN values\n{\n    ${update}\n}\nRETURN(result)`;
    run = (a) => a.reduce(fn, init === "TRUE" ? true : Number(init));
  };
  if (shape === "count") {
    fold(
      "0",
      `IF (value > ${limit}) { result ← result + 1 }`,
      (s, v) => s + Number(v > limit),
    );
  }
  if (shape === "sum") fold("0", "result ← result + value", (s, v) => s + v);
  if (shape === "product")
    fold("1", "result ← result × value", (s, v) => s * v);
  if (["minimum", "maximum", "unsafe-min"].includes(shape)) {
    const min = shape !== "maximum";
    body = `${shape !== "unsafe-min" ? 'IF (LENGTH(values) = 0) { RETURN("NONE") }\n' : ""}result ← values[1]\nFOR EACH value IN values\n{\n    IF (value ${min ? "<" : ">"} result) { result ← value }\n}\nRETURN(result)`;
    run = (a) =>
      a.length
        ? min
          ? Math.min(...a)
          : Math.max(...a)
        : shape === "unsafe-min"
          ? undefined
          : "NONE";
  }
  if (shape === "search") {
    body = `FOR EACH value IN values\n{\n    IF (value = ${target}) { RETURN(TRUE) }\n}\nRETURN(FALSE)`;
    run = (a) => a.includes(target);
  }
  if (shape === "first" || shape === "last") {
    body = `RETURN(values[${shape === "first" ? "1" : "LENGTH(values)"}])`;
    run = (a) => (shape === "first" ? a[0] : a.at(-1));
  }
  if (shape === "all") {
    body = `FOR EACH value IN values\n{\n    IF (value ≤ ${limit}) { RETURN(FALSE) }\n}\nRETURN(TRUE)`;
    run = (a) => a.every((v) => v > limit);
  }
  if (shape === "skip-first") {
    body = `result ← 0\nindex ← 2\nREPEAT UNTIL (index > LENGTH(values))\n{\n    result ← result + 1\n    index ← index + 1\n}\nRETURN(result)`;
    run = (a) => Math.max(0, a.length - 1);
  }
  const requirementText = {
    count: `Count elements greater than ${limit}.`,
    sum: "Return the sum of the list values.",
    product:
      "Return the product of all list values, starting from the multiplicative identity.",
    minimum: 'Return the smallest value, or "NONE" for an empty list.',
    maximum: 'Return the largest value, or "NONE" for an empty list.',
    search: `Return TRUE if the list contains ${target}; otherwise return FALSE.`,
    first: "Return the first element.",
    last: "Return the last element.",
    all: `Return TRUE if every element is greater than ${limit}; return FALSE if any element fails that condition.`,
    "skip-first": "Count elements after the first position.",
    "unsafe-min": 'Return the smallest value, or "NONE" for an empty list.',
  }[shape];
  const requirement = `Requirement: ${requirementText}\nPrecondition: ${shape === "first" || shape === "last" ? "at least one element" : "empty lists and all integer-valued lists are valid"}.`;
  const expected = (a) =>
      shape === "unsafe-min" ? (a.length ? Math.min(...a) : "NONE") : run(a),
    a = single ? [int(-5, 9)] : [];
  return {
    structure: shape,
    prompt: `Construct ${single ? "a single-element" : "an empty"} list test. Predict the required and actual results.`,
    context: `${requirement}\nAP CSP list indices start at 1.\n\nPROCEDURE inspect(values)\n{\n${body
      .split("\n")
      .map((l) => "    " + l)
      .join("\n")}\n}`,
    fields: [
      field("input", "List input (comma-separated integers; empty means [])"),
      field("expected", "Required result"),
      field("actual", "Actual program result"),
    ],
    example: {
      input: a.join(","),
      expected: format(expected(a)),
      actual: format(run(a)),
    },
    evaluate: (r) => {
      const text = String(r.input).trim(),
        a =
          text === ""
            ? []
            : text.split(",").every(numeric)
              ? text.split(",").map(Number)
              : null;
      const legal =
        a !== null &&
        a.length === (single ? 1 : 0) &&
        a.every((x) => Math.abs(x) <= 1000);
      if (!legal)
        return {
          correct: false,
          details: `Input ${r.input} does not construct the requested ${single ? "one-element" : "empty"} integer list.`,
        };
      const e = expected(a),
        v = run(a);
      return {
        correct: outputMatches(r.expected, e) && outputMatches(r.actual, v),
        details: `Input ${format(a)}: requirement → ${format(e)}; program → ${format(v)}. ${a.length ? "The traversal has one element; evaluate its condition or indexed access." : "A traversal visits zero elements. Initializations and statements outside the traversal still run."} ${shape === "unsafe-min" && !a.length ? 'The code accesses values[1] before checking length, so it raises an index error instead of returning "NONE".' : shape === "all" && !a.length ? "No element fails the condition, so the final RETURN(TRUE) runs." : shape === "product" ? "Multiplication starts from 1, not 0." : shape === "skip-first" ? "The initial index is 2, so an empty or single-element list never enters this loop." : ""}`,
      };
    },
  };
}
const documentation = {
  JOIN: "JOIN(a,b) concatenates in argument order.",
  SIZE: "SIZE(text) counts characters, including spaces.",
  CHAR: "CHAR(text,i) returns character i (one-based); invalid i raises ERROR.",
  PART: 'PART(text,first,count) returns count characters starting at first. Preconditions: 1 ≤ first ≤ SIZE(text)+1, count ≥ 0, first+count−1 ≤ SIZE(text); otherwise ERROR. A zero count returns "".',
};
function stringProblem(forced) {
  const shape =
      forced ||
      pick([
        "prefix",
        "suffix",
        "length",
        "part",
        "character",
        "nested",
        "conditional",
        "empty-guard",
        "argument-order",
      ]),
    n = int(1, 3),
    word = pick(["Go", "Sky", "Red"]);
  let call,
    run,
    min = 0,
    needsOther = false;
  const length = (t) => Array.from(t).length;
  const part = (t, f, c) =>
    f < 1 || c < 0 || f + c - 1 > length(t)
      ? undefined
      : Array.from(t)
          .slice(f - 1, f - 1 + c)
          .join("");
  if (shape === "prefix") {
    call = `JOIN("${word}", text)`;
    run = (t) => word + t;
  }
  if (shape === "suffix") {
    call = `JOIN(text, "${word}")`;
    run = (t) => t + word;
  }
  if (shape === "length") {
    call = "SIZE(text)";
    run = (t) => length(t);
  }
  if (shape === "part") {
    call = `PART(text, ${n}, ${n})`;
    run = (t) => part(t, n, n);
    min = 2 * n - 1;
  }
  if (shape === "character") {
    call = `CHAR(text, ${n})`;
    run = (t) => (length(t) >= n ? Array.from(t)[n - 1] : undefined);
    min = n;
  }
  if (shape === "nested") {
    call = `SIZE(JOIN(text, PART("${word}", 1, 1)))`;
    run = (t) => length(t) + 1;
  }
  if (shape === "conditional") {
    call = `IF (SIZE(text) > ${n}) { RETURN(PART(text, 1, ${n})) }\n    RETURN(JOIN(text, "!"))`;
    run = (t) => (length(t) > n ? part(t, 1, n) : t + "!");
  }
  if (shape === "empty-guard") {
    call =
      'IF (SIZE(text) = 0) { RETURN("EMPTY") }\n    RETURN(CHAR(text, SIZE(text)))';
    run = (t) => (length(t) ? Array.from(t).at(-1) : "EMPTY");
  }
  if (shape === "argument-order") {
    call = "JOIN(other, text)";
    run = (t, u) => u + t;
    needsOther = true;
  }
  const testGoal = pick(["empty", "short", "long"]),
    sampleLength =
      min || (testGoal === "empty" ? 0 : testGoal === "short" ? 1 : 4),
    sample = "BlueSky".slice(0, sampleLength);
  const domain = min
    ? `Use a text argument of ${min}–12 characters.`
    : testGoal === "empty"
      ? "Use an empty text argument."
      : testGoal === "short"
        ? "Use a text argument of 1–2 characters."
        : "Use a text argument of 4–12 characters.";
  const fields = [
    field("input", "text argument (no quotation marks; spaces count)"),
  ];
  if (needsOther)
    fields.push(
      field("other", "other argument (1–12 characters; must differ from text)"),
    );
  fields.push(
    field("expected", "Required result"),
    field("actual", "Actual program result"),
  );
  const body = call.startsWith("IF") ? call : `RETURN(${call})`;
  const required = (t, u) => run(t, u);
  return {
    structure: shape,
    prompt: `Build a test using the library documentation. ${domain}`,
    context: `Documented library:\n${Object.entries(documentation)
      .filter(([name]) => call.includes(name + "("))
      .map(([, text]) => text)
      .join(
        "\n",
      )}\n\nRequirement: return the result of the shown library operations.\n\nPROCEDURE transform(text${needsOther ? ", other" : ""})\n{\n    ${body}\n}`,
    fields,
    example: {
      input: sample,
      ...(needsOther ? { other: "Q" } : {}),
      expected: format(run(sample, "Q")),
      actual: format(run(sample, "Q")),
    },
    evaluate: (r) => {
      const t = String(r.input),
        u = String(r.other || ""),
        legal =
          length(t) <= 12 &&
          (min
            ? length(t) >= min
            : testGoal === "empty"
              ? length(t) === 0
              : testGoal === "short"
                ? length(t) >= 1 && length(t) <= 2
                : length(t) >= 4) &&
          (!needsOther || (length(u) >= 1 && length(u) <= 12 && u !== t)),
        v = required(t, u);
      return {
        correct:
          legal && outputMatches(r.expected, v) && outputMatches(r.actual, v),
        details: `text = ${format(t)}${needsOther ? ", other = " + format(u) : ""}. Applying ${call} gives ${format(v)} under both the requirement and implementation. SIZE(text) = ${length(t)}; one-based character/substring positions count spaces. ${!legal ? "The supplied argument does not meet the requested length or distinct-argument constraint." : ""}`,
      };
    },
  };
}
function iterationProblem(forced) {
  const shape =
      forced ||
      pick([
        "sum",
        "product",
        "count-even",
        "countdown",
        "until",
        "off-by-one",
      ]),
    step = int(2, 5),
    bound = int(step + 1, step + 10),
    goal = pick(["zero", "one", "multiple"]);
  let code, run, required, iterations;
  const sum = (n) => (n * (n + 1)) / 2;
  if (shape === "sum" || shape === "off-by-one") {
    code = `total ← 0\nREPEAT ${shape === "off-by-one" ? "MAXIMUM(0, n − 1)" : "n"} TIMES\n{\n    total ← total + ${step}\n}\nRETURN(total)`;
    run = (n) => (shape === "off-by-one" ? Math.max(0, n - 1) : n) * step;
    required = (n) => n * step;
    iterations = (n) => n;
  }
  if (shape === "product") {
    code = `result ← 1\nREPEAT n TIMES { result ← result × ${step} }\nRETURN(result)`;
    run = required = (n) => step ** n;
    iterations = (n) => n;
  }
  if (shape === "count-even") {
    code =
      "count ← 0\nindex ← 1\nREPEAT n TIMES\n{\n    IF (index MOD 2 = 0) { count ← count + 1 }\n    index ← index + 1\n}\nRETURN(count)";
    run = required = (n) => Math.floor(n / 2);
    iterations = (n) => n;
  }
  if (shape === "countdown") {
    code =
      "total ← 0\nREPEAT UNTIL (n = 0)\n{\n    total ← total + n\n    n ← n − 1\n}\nRETURN(total)";
    run = required = (n) => sum(n);
    iterations = (n) => n;
  }
  if (shape === "until") {
    code = `count ← 0\nREPEAT UNTIL (n ≥ ${bound})\n{\n    n ← n + ${step}\n    count ← count + 1\n}\nRETURN(count)`;
    run = required = (n) => Math.max(0, Math.ceil((bound - n) / step));
    iterations = run;
  }
  const domain = Array.from({ length: 21 }, (_, i) => i),
    valid = (n) =>
      goal === "zero"
        ? iterations(n) === 0
        : goal === "one"
          ? iterations(n) === 1
          : iterations(n) > 1,
    example = domain.find(valid);
  const description = {
    sum: `Return ${step} times the original n.`,
    product: `Return ${step} multiplied by itself n times; n = 0 returns 1.`,
    "count-even": "Count the even integers from 1 through n.",
    countdown: "Return the sum of integers 1 through the original n.",
    until: `Count increments of ${step} needed to reach or exceed ${bound}, starting at n.`,
    "off-by-one": `Return ${step} times the original n.`,
  }[shape];
  return {
    structure: shape,
    prompt: `Construct a test for ${goal === "multiple" ? "two or more" : goal === "zero" ? "zero" : "exactly one"} intended loop iterations. Predict required and actual results.`,
    context: `Requirement: ${description}\nInput n: integer 0–20. MAXIMUM(a,b) returns the larger value.\n\nPROCEDURE calculate(n)\n{\n${code
      .split("\n")
      .map((l) => "    " + l)
      .join("\n")}\n}`,
    fields: [
      field("input", "Input n (0–20)", "number"),
      field("expected", "Required result"),
      field("actual", "Actual program result"),
    ],
    example: {
      input: String(example),
      expected: format(required(example)),
      actual: format(run(example)),
    },
    evaluate: (r) => {
      const n = Number(r.input),
        legal = numeric(r.input) && domain.includes(n),
        e = required(n),
        a = run(n);
      return {
        correct:
          legal &&
          valid(n) &&
          outputMatches(r.expected, e) &&
          outputMatches(r.actual, a),
        details: `Original n = ${r.input}: the requirement predicts ${format(e)} over ${iterations(n)} intended iterations; the code returns ${format(a)}. ${shape === "off-by-one" ? `The supplied REPEAT count is MAXIMUM(0, n − 1) = ${Math.max(0, n - 1)}, which omits one update for positive n.` : shape === "until" ? `Each update adds ${step}; the first value at or above ${bound} stops repetition.` : shape === "countdown" ? "The total includes each value before it is decremented." : shape === "product" ? "The product starts at 1, so zero repetitions return the multiplicative identity." : shape === "count-even" ? "Only even index values increment count." : `Each repetition adds ${step}.`} ${!legal || !valid(n) ? "This input does not meet the requested iteration case." : ""}`,
      };
    },
  };
}
function invalidProblem(forced) {
  const shape =
      forced || pick(["next", "previous", "double", "reverse", "shifted"]),
    values = Array.from({ length: int(2, 6) }, () => int(-9, 15)),
    len = values.length;
  const positions = (n) =>
    shape === "next"
      ? [n, n + 1]
      : shape === "previous"
        ? [n, n - 1]
        : shape === "double"
          ? [n, 2 * n]
          : shape === "reverse"
            ? [n, len - n]
            : [n + 1, n - 1];
  const [first, second] = {
    next: ["index", "index + 1"],
    previous: ["index", "index − 1"],
    double: ["index", "2 × index"],
    reverse: ["index", "LENGTH(values) − index"],
    shifted: ["index + 1", "index − 1"],
  }[shape];
  const legal = (i) => i >= 1 && i <= len;
  const witnesses = Array.from({ length: len + 4 }, (_, i) => i - 1).filter(
      (n) => legal(positions(n)[0]) && !legal(positions(n)[1]),
    ),
    n = pick(witnesses),
    example = {
      input: String(n),
      expected: String(values[positions(n)[0] - 1]),
    };
  return {
    structure: shape,
    prompt:
      "Choose an index that makes the first access succeed and the second access fail. Predict the value displayed before the error.",
    context: `AP CSP uses one-based indexing. Inputs index: integers −1 through ${len + 2}.\nvalues ← [${values.join(", ")}]\nDISPLAY(values[${first}])\nDISPLAY(values[${second}])`,
    fields: [
      field("input", "Index input", "number"),
      field("expected", "Value displayed before the error"),
    ],
    example,
    evaluate: (r) => {
      const x = Number(r.input),
        [a, b] = positions(x),
        domain = numeric(r.input) && x >= -1 && x <= len + 2,
        firstOK = legal(a),
        secondOK = legal(b);
      return {
        correct:
          domain &&
          firstOK &&
          !secondOK &&
          outputMatches(r.expected, values[a - 1]),
        details: `index = ${r.input}; collection length = ${len}. First calculated position ${a} ${firstOK ? "displays " + format(values[a - 1]) : "causes ERROR before any value is displayed"}. ${firstOK ? `Second calculated position ${b} ${secondOK ? "is valid and displays " + format(values[b - 1]) : "is outside 1 through " + len + " and causes ERROR"}.` : ""} A useful test here must reach the second access before failing.`,
      };
    },
  };
}
export function generateTestCase(mode = "mixed", forced) {
  const selected = mode === "mixed" ? pick(Object.keys(testModes)) : mode;
  if (!testModes[selected]) throw Error("Unknown mode");
  const q =
    selected === "branches"
      ? branchProblem(forced)
      : selected === "lists"
        ? listProblem(forced)
        : selected === "strings"
          ? stringProblem(forced)
          : selected === "iteration"
            ? iterationProblem(forced)
            : selected === "invalid"
              ? invalidProblem(forced)
              : predicateProblem(selected, forced);
  return {
    ...q,
    game: "test-case-builder",
    mode: selected,
    topic: selected,
    kind: "test",
    policy: "single",
    title: "Test Case Builder",
    topicTitle: testModes[selected],
  };
}
export function evaluateTestCase(q, r) {
  try {
    return q.evaluate(r);
  } catch (e) {
    return {
      correct: false,
      details:
        "The supplied input violates the documented domain or preconditions. " +
        e.message,
    };
  }
}
