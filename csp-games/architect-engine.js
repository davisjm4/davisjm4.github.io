// Bounded AP CSP construction interpreter. No eval, arbitrary source execution, or backend.
import { int, pick, shuffle } from "./engine.js?v=platform-expansion-v2";
export const architectModes = {
  sequence: "Sequencing",
  selection: "Selection",
  iteration: "Iteration",
  nested: "Nested Loops",
  "nested-selection": "Nested Conditionals",
  counter: "Counters",
  accumulator: "Accumulators",
  search: "Searching",
  procedure: "Procedures & Parameters",
};
const V = (name) => ({ v: name }),
  X = (op, ...args) => ({ op, args }),
  A = (name, value) => ({ type: "assign", name, value }),
  R = (value) => ({ type: "return", value }),
  IF = (condition, body, otherwise) => ({
    type: "if",
    condition,
    body,
    otherwise,
  }),
  FOR = (name, list, body) => ({ type: "for", name, list, body }),
  UNTIL = (condition, body) => ({ type: "until", condition, body }),
  REPEAT = (count, body) => ({ type: "repeat", count, body }),
  CALL = (name, ...args) => ({ call: name, args });
export function expr(e) {
  if (e && e.v) return e.v;
  if (e && e.call) return `${e.call}(${e.args.map(expr).join(", ")})`;
  if (e && e.op) {
    if (e.op === "length") return `LENGTH(${expr(e.args[0])})`;
    if (e.op === "index") return `${expr(e.args[0])}[${expr(e.args[1])}]`;
    if (e.op === "list") return `[${e.args.map(expr).join(", ")}]`;
    if (e.op === "NOT") return `NOT (${expr(e.args[0])})`;
    return `(${e.args.map(expr).join(" " + e.op + " ")})`;
  }
  return typeof e === "boolean"
    ? e
      ? "TRUE"
      : "FALSE"
    : typeof e === "string"
      ? JSON.stringify(e)
      : String(e);
}
export function nodeText(s) {
  return s.type === "assign"
    ? `${s.name} ← ${expr(s.value)}`
    : s.type === "return"
      ? `RETURN(${expr(s.value)})`
      : s.type === "display"
        ? `DISPLAY(${expr(s.value)})`
        : s.type === "if"
          ? `IF (${expr(s.condition)})\n{`
          : s.type === "for"
            ? `FOR EACH ${s.name} IN ${expr(s.list)}\n{`
            : s.type === "until"
              ? `REPEAT UNTIL (${expr(s.condition)})\n{`
              : s.type === "repeat"
                ? `REPEAT ${expr(s.count)} TIMES\n{`
                : s.type === "else"
                  ? "ELSE\n{"
                  : "}";
}
function flatten(program) {
  return program.flatMap((s) =>
    s.body
      ? [
          { ...s, body: undefined, otherwise: undefined },
          ...flatten(s.body),
          { type: "end" },
          ...(s.otherwise
            ? [{ type: "else" }, ...flatten(s.otherwise), { type: "end" }]
            : []),
        ]
      : [s],
  );
}
function parse(tokens) {
  let pos = 0;
  function body(nested) {
    const result = [];
    while (pos < tokens.length) {
      const s = tokens[pos++];
      if (s.type === "end") {
        if (!nested)
          throw Error("A closing brace has no matching open structure.");
        return result;
      }
      if (s.type === "else")
        throw Error("ELSE must follow a completed IF body.");
      if (["if", "for", "until", "repeat"].includes(s.type)) {
        const node = { ...s, body: body(true) };
        if (s.type === "if" && tokens[pos]?.type === "else") {
          pos++;
          node.otherwise = body(true);
        }
        result.push(node);
      } else result.push(s);
    }
    if (nested) throw Error("A structure is missing its closing brace.");
    return result;
  }
  return body(false);
}
export function closeEnough(a, b) {
  if (typeof a === "number" && typeof b === "number")
    return (
      Number.isFinite(a) &&
      Number.isFinite(b) &&
      Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
    );
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => closeEnough(v, b[i]));
  return a === b;
}
export function executeProgram(program, input, library = {}) {
  const trace = [],
    budget = { left: 2500 };
  function run(body, env, depth = 0) {
    if (depth > 12) throw Error("Procedure call limit reached.");
    let returned = false,
      value;
    const record = (text) => {
      trace.push(text);
      if (trace.length > 24) trace.shift();
    };
    const evaluate = (e) => {
      if (e && e.v) {
        if (!Object.hasOwn(env, e.v))
          throw Error(`${e.v} is used before it has a value.`);
        return env[e.v];
      }
      if (e && e.call) {
        const def = library[e.call];
        if (!def || def.params.length !== e.args.length)
          throw Error("Unknown procedure or wrong argument count.");
        const next = Object.fromEntries(
          def.params.map((p, i) => [p, evaluate(e.args[i])]),
        );
        const call = run(def.body, next, depth + 1);
        if (!call.returned)
          throw Error(
            `${e.call} displays or finishes without returning a value.`,
          );
        return call.value;
      }
      if (!e || !e.op) return e;
      const v = e.args.map(evaluate);
      switch (e.op) {
        case "+":
          return v[0] + v[1];
        case "−":
          return v[0] - v[1];
        case "×":
          return v[0] * v[1];
        case "/":
          if (v[1] === 0) throw Error("Division by zero.");
          return v[0] / v[1];
        case "MOD":
          return v[0] % v[1];
        case "=":
          return v[0] === v[1];
        case "≠":
          return v[0] !== v[1];
        case "<":
          return v[0] < v[1];
        case "≤":
          return v[0] <= v[1];
        case ">":
          return v[0] > v[1];
        case "≥":
          return v[0] >= v[1];
        case "AND":
          return v.every(Boolean);
        case "OR":
          return v.some(Boolean);
        case "NOT":
          return !v[0];
        case "length":
          return v[0].length;
        case "list":
          return v;
        case "index":
          if (
            !Array.isArray(v[0]) ||
            !Number.isInteger(v[1]) ||
            v[1] < 1 ||
            v[1] > v[0].length
          )
            throw Error(`Index ${v[1]} is outside this list.`);
          return v[0][v[1] - 1];
        default:
          throw Error("Unknown expression.");
      }
    };
    const step = (statements) => {
      for (const s of statements) {
        if (returned) break;
        if (--budget.left < 0)
          throw Error("Execution limit reached; check loop progress.");
        if (s.type === "assign") {
          env[s.name] = evaluate(s.value);
          record(`${s.name} ← ${JSON.stringify(env[s.name])}`);
        } else if (s.type === "return") {
          value = evaluate(s.value);
          returned = true;
          record("RETURN " + JSON.stringify(value));
        } else if (s.type === "display") {
          record("DISPLAY " + JSON.stringify(evaluate(s.value)));
        } else if (s.type === "if") {
          const c = Boolean(evaluate(s.condition));
          record(`IF ${expr(s.condition)} → ${c ? "TRUE" : "FALSE"}`);
          step(c ? s.body : s.otherwise || []);
        } else if (s.type === "for") {
          const list = evaluate(s.list);
          if (!Array.isArray(list)) throw Error("FOR EACH needs a list.");
          for (const item of list) {
            if (returned) break;
            env[s.name] = item;
            step(s.body);
          }
        } else if (s.type === "repeat") {
          const count = evaluate(s.count);
          if (!Number.isInteger(count) || count < 0 || count > 100)
            throw Error("Invalid repetition count.");
          for (let i = 0; i < count && !returned; i++) step(s.body);
        } else if (s.type === "until") {
          while (!evaluate(s.condition) && !returned) {
            if (--budget.left < 0)
              throw Error(
                "Execution limit reached; update must move toward termination.",
              );
            step(s.body);
          }
        }
      }
    };
    step(body);
    return { returned, value };
  }
  try {
    return { ...run(program, { ...input }), trace };
  } catch (e) {
    return { returned: false, error: e.message, trace };
  }
}
const listDomain = () => {
  const a = [[]];
  for (let n = 1; n <= 3; n++) {
    const fill = (v) => {
      if (v.length === n) {
        a.push(v);
        return;
      }
      for (let x = -3; x <= 5; x++) fill([...v, x]);
    };
    fill([]);
  }
  return a;
};
const lists = listDomain(),
  numbers = Array.from({ length: 9 }, (_, i) => i - 3),
  counts = Array.from({ length: 6 }, (_, i) => i);
const domains = {
  value: numbers,
  a: numbers,
  b: numbers,
  n: counts,
  m: counts,
  target: numbers,
  values: lists,
  rows: (() => {
    const rows = [
      [],
      [-1],
      [0],
      [1],
      ...[-1, 0, 1].flatMap((a) => [-1, 0, 1].map((b) => [a, b])),
    ];
    return [
      [],
      ...rows.map((r) => [r]),
      ...rows.flatMap((a) => rows.map((b) => [a, b])),
    ];
  })(),
  flag: [false, true],
};
function inputs(params) {
  let out = [{}];
  for (const p of params)
    out = out.flatMap((o) => domains[p].map((v) => ({ ...o, [p]: v })));
  return out;
}
const plus = (a, b) => X("+", a, b),
  minus = (a, b) => X("−", a, b),
  mul = (a, b) => X("×", a, b),
  len = (a) => X("length", a),
  at = (a, i) => X("index", a, i),
  cmp = (op, a, b) => X(op, a, b);
export function generateArchitect(mode = "mixed", forced) {
  const selected = mode === "mixed" ? pick(Object.keys(architectModes)) : mode,
    variant = forced ?? int(0, 4),
    k = int(2, 4),
    t = int(-1, 2),
    values = V("values"),
    item = V("item"),
    result = V("result"),
    i = V("index"),
    n = V("n"),
    a = V("a"),
    b = V("b"),
    value = V("value");
  let program,
    expected,
    goal,
    params = ["values"],
    library = {},
    alternatives = [];
  const each = (body) => FOR("item", values, body),
    add = (e) => A("result", plus(result, e)),
    ret = () => R(result),
    init = (v) => A("result", v),
    walk = (start, condition, body) => [
      A("index", start),
      UNTIL(condition, [...body, A("index", plus(i, 1))]),
    ];
  if (selected === "sequence") {
    params = variant === 1 || variant === 2 ? ["a", "b"] : ["value"];
    if (variant === 0) {
      goal = `Return ${k} × value + ${t}.`;
      program = [init(value), A("result", mul(result, k)), add(t), ret()];
      expected = (x) => k * x.value + t;
      alternatives = [add(X("/", t, k))];
    }
    if (variant === 1) {
      goal = "Return [original b, original a] by exchanging the two values.";
      program = [
        A("saved", a),
        A("a", b),
        A("b", V("saved")),
        R(X("list", a, b)),
      ];
      expected = (x) => [x.b, x.a];
    }
    if (variant === 2) {
      goal =
        "Add b to a, then replace b by the updated a minus the original b. Return [a,b].";
      program = [A("a", plus(a, b)), A("b", minus(a, b)), R(X("list", a, b))];
      expected = (x) => [x.a + x.b, x.a];
    }
    if (variant === 3) {
      goal = `Return the difference between ${k} × (value + 1) and (value + 1).`;
      program = [
        A("first", plus(value, 1)),
        A("second", mul(V("first"), k)),
        R(minus(V("second"), V("first"))),
      ];
      expected = (x) => (k - 1) * (x.value + 1);
    }
    if (variant === 4) {
      goal = `Return (value + ${k}) / ${k}.`;
      program = [init(value), add(k), A("result", X("/", result, k)), ret()];
      expected = (x) => (x.value + k) / k;
    }
  }
  if (selected === "selection") {
    params = variant === 1 ? ["a", "b"] : ["value"];
    if (variant === 0) {
      goal = "Return the absolute value of value.";
      program = [IF(cmp("<", value, 0), [R(minus(0, value))], [R(value)])];
      expected = (x) => Math.abs(x.value);
    }
    if (variant === 1) {
      goal = "Return the larger of a and b.";
      program = [IF(cmp(">", a, b), [R(a)], [R(b)])];
      expected = (x) => Math.max(x.a, x.b);
    }
    if (variant === 2) {
      goal = `Clamp value to the range 0 through ${k}: values below 0 become 0, values above ${k} become ${k}.`;
      program = [
        IF(cmp("<", value, 0), [R(0)]),
        IF(cmp(">", value, k), [R(k)]),
        R(value),
      ];
      expected = (x) => Math.max(0, Math.min(k, x.value));
    }
    if (variant === 3) {
      goal =
        "Return −1 for a negative value, 0 for zero, and 1 for a positive value.";
      program = [
        IF(
          cmp("<", value, 0),
          [R(-1)],
          [IF(cmp("=", value, 0), [R(0)], [R(1)])],
        ),
      ];
      expected = (x) => Math.sign(x.value);
    }
    if (variant === 4) {
      goal = `Return TRUE exactly when value is strictly between −1 and ${k}.`;
      program = [
        IF(
          X("AND", cmp(">", value, -1), cmp("<", value, k)),
          [R(true)],
          [R(false)],
        ),
      ];
      expected = (x) => x.value > -1 && x.value < k;
    }
  }
  if (selected === "iteration") {
    params = ["n"];
    if (variant === 0) {
      goal = "Return the sum 1 + 2 + … + n; return 0 for n = 0.";
      program = [init(0), ...walk(1, cmp(">", i, n), [add(i)]), ret()];
      expected = (x) => (x.n * (x.n + 1)) / 2;
    }
    if (variant === 1) {
      goal = "Return n factorial, including 0 factorial = 1.";
      program = [
        init(1),
        UNTIL(cmp("=", n, 0), [
          A("result", mul(result, n)),
          A("n", minus(n, 1)),
        ]),
        ret(),
      ];
      expected = (x) => {
        let p = 1;
        for (let j = 1; j <= x.n; j++) p *= j;
        return p;
      };
    }
    if (variant === 2) {
      goal = `Return ${k} raised to the power n (n = 0 returns 1).`;
      program = [init(1), REPEAT(n, [A("result", mul(result, k))]), ret()];
      expected = (x) => k ** x.n;
    }
    if (variant === 3) {
      goal = `Starting at n, count additions of ${k} needed to reach or pass 9.`;
      program = [
        init(0),
        UNTIL(cmp("≥", n, 9), [A("n", plus(n, k)), add(1)]),
        ret(),
      ];
      expected = (x) => Math.max(0, Math.ceil((9 - x.n) / k));
    }
    if (variant === 4) {
      goal = "Return the sum of even integers from 0 through n.";
      program = [
        init(0),
        ...walk(0, cmp(">", i, n), [IF(cmp("=", X("MOD", i, 2), 0), [add(i)])]),
        ret(),
      ];
      expected = (x) => {
        let s = 0;
        for (let j = 0; j <= x.n; j += 2) s += j;
        return s;
      };
    }
  }
  if (selected === "nested") {
    if (variant === 0) {
      goal =
        "For every ordered pair (x,y) of list elements, add x+y. Repeated positions and self-pairs are included.";
      program = [
        init(0),
        FOR("x", values, [FOR("y", values, [add(plus(V("x"), V("y")))])]),
        ret(),
      ];
      expected = (x) =>
        x.values.reduce((s, v) => s + v, 0) * 2 * x.values.length;
    }
    if (variant === 1) {
      goal =
        "Count ordered pairs of list positions whose first value is less than the second value.";
      program = [
        init(0),
        FOR("x", values, [
          FOR("y", values, [IF(cmp("<", V("x"), V("y")), [add(1)])]),
        ]),
        ret(),
      ];
      expected = (x) =>
        x.values.reduce((s, v) => s + x.values.filter((w) => v < w).length, 0);
    }
    if (variant === 2) {
      params = ["n", "m"];
      goal = "Return the number of cells in n rows with m columns.";
      program = [init(0), REPEAT(n, [REPEAT(V("m"), [add(1)])]), ret()];
      expected = (x) => x.n * x.m;
    }
    if (variant === 3) {
      params = ["n"];
      goal = "Count the cells in rows of lengths 1,2,…,n.";
      program = [
        init(0),
        A("row", 1),
        REPEAT(n, [REPEAT(V("row"), [add(1)]), A("row", plus(V("row"), 1))]),
        ret(),
      ];
      expected = (x) => (x.n * (x.n + 1)) / 2;
    }
    if (variant === 4) {
      params = ["rows"];
      goal =
        "Return the sum of all values in the list of rows; rows may be empty and have different lengths.";
      program = [
        init(0),
        FOR("row", V("rows"), [FOR("item", V("row"), [add(item)])]),
        ret(),
      ];
      expected = (x) => x.rows.flat().reduce((s, v) => s + v, 0);
    }
  }
  if (selected === "nested-selection") {
    if (variant === 0) {
      goal = `Count values inside the inclusive interval −1 through ${k}.`;
      program = [
        init(0),
        each([IF(cmp("≥", item, -1), [IF(cmp("≤", item, k), [add(1)])])]),
        ret(),
      ];
      expected = (x) => x.values.filter((v) => v >= -1 && v <= k).length;
    }
    if (variant === 1) {
      goal = "Sum positive even values, excluding all others.";
      program = [
        init(0),
        each([
          IF(cmp(">", item, 0), [
            IF(cmp("=", X("MOD", item, 2), 0), [add(item)]),
          ]),
        ]),
        ret(),
      ];
      expected = (x) =>
        x.values.filter((v) => v > 0 && v % 2 === 0).reduce((s, v) => s + v, 0);
    }
    if (variant === 2) {
      params = ["value"];
      goal =
        'Return "negative" for negative values, "zero" for zero, and "positive" otherwise.';
      program = [
        IF(
          cmp("≥", value, 0),
          [IF(cmp("=", value, 0), [R("zero")], [R("positive")])],
          [R("negative")],
        ),
      ];
      expected = (x) =>
        x.value < 0 ? "negative" : x.value === 0 ? "zero" : "positive";
    }
    if (variant === 3) {
      params = ["value", "flag"];
      goal =
        "When flag is TRUE, return 2 for positive values and 1 otherwise; when flag is FALSE, return 0.";
      program = [
        IF(V("flag"), [IF(cmp(">", value, 0), [R(2)], [R(1)])], [R(0)]),
      ];
      expected = (x) => (x.flag ? (x.value > 0 ? 2 : 1) : 0);
    }
    if (variant === 4) {
      goal =
        "Count negative values as 2 each, zero values as 1 each, and positive values as 0.";
      program = [
        init(0),
        each([
          IF(cmp("<", item, 0), [add(2)], [IF(cmp("=", item, 0), [add(1)])]),
        ]),
        ret(),
      ];
      expected = (x) =>
        x.values.reduce((s, v) => s + (v < 0 ? 2 : v === 0 ? 1 : 0), 0);
    }
  }
  if (selected === "counter") {
    if (variant === 0) {
      goal =
        "Count every list element without using LENGTH in the returned expression.";
      program = [init(0), each([add(1)]), ret()];
      expected = (x) => x.values.length;
    }
    if (variant === 1) {
      goal =
        "Count even list values (including zero and negative even values).";
      program = [
        init(0),
        each([IF(cmp("=", X("MOD", item, 2), 0), [add(1)])]),
        ret(),
      ];
      expected = (x) => x.values.filter((v) => v % 2 === 0).length;
    }
    if (variant === 2) {
      goal = "Count adjacent positions whose values differ.";
      program = [
        init(0),
        ...walk(2, cmp(">", i, len(values)), [
          IF(cmp("≠", at(values, i), at(values, minus(i, 1))), [add(1)]),
        ]),
        ret(),
      ];
      expected = (x) =>
        x.values.slice(1).filter((v, j) => v !== x.values[j]).length;
    }
    if (variant === 3) {
      goal =
        "Count consecutive runs of equal values. Empty list returns 0; [1,1,2] has two runs.";
      program = [
        IF(cmp("=", len(values), 0), [R(0)]),
        init(1),
        ...walk(2, cmp(">", i, len(values)), [
          IF(cmp("≠", at(values, i), at(values, minus(i, 1))), [add(1)]),
        ]),
        ret(),
      ];
      expected = (x) =>
        x.values.length
          ? 1 + x.values.slice(1).filter((v, j) => v !== x.values[j]).length
          : 0;
    }
    if (variant === 4) {
      goal =
        "Count values before the first zero; if no zero occurs, count all values.";
      program = [
        init(0),
        each([IF(cmp("=", item, 0), [ret()]), add(1)]),
        ret(),
      ];
      expected = (x) =>
        x.values.includes(0) ? x.values.indexOf(0) : x.values.length;
    }
  }
  if (selected === "accumulator") {
    if (variant === 0) {
      goal = "Return the sum of all list values.";
      program = [init(0), each([add(item)]), ret()];
      expected = (x) => x.values.reduce((s, v) => s + v, 0);
    }
    if (variant === 1) {
      goal = "Return the product of all values; empty list returns 1.";
      program = [init(1), each([A("result", mul(result, item))]), ret()];
      expected = (x) => x.values.reduce((s, v) => s * v, 1);
    }
    if (variant === 2) {
      goal = 'Return the largest value, or "NONE" for an empty list.';
      program = [
        IF(cmp("=", len(values), 0), [R("NONE")]),
        init(at(values, 1)),
        each([IF(cmp(">", item, result), [init(item)])]),
        ret(),
      ];
      expected = (x) => (x.values.length ? Math.max(...x.values) : "NONE");
    }
    if (variant === 3) {
      goal = 'Return the mean, or "NONE" for an empty list.';
      program = [
        IF(cmp("=", len(values), 0), [R("NONE")]),
        init(0),
        each([add(item)]),
        R(X("/", result, len(values))),
      ];
      expected = (x) =>
        x.values.length
          ? x.values.reduce((s, v) => s + v, 0) / x.values.length
          : "NONE";
    }
    if (variant === 4) {
      goal =
        "Multiply each value by its one-based position, then sum these weighted values.";
      program = [
        init(0),
        ...walk(1, cmp(">", i, len(values)), [add(mul(i, at(values, i)))]),
        ret(),
      ];
      expected = (x) => x.values.reduce((s, v, j) => s + (j + 1) * v, 0);
    }
  }
  if (selected === "search") {
    params = variant <= 2 ? ["values", "target"] : ["values"];
    if (variant === 0) {
      goal =
        "Return the first one-based position equal to target; return −1 if absent.";
      program = [
        ...walk(1, cmp(">", i, len(values)), [
          IF(cmp("=", at(values, i), V("target")), [R(i)]),
        ]),
        R(-1),
      ];
      expected = (x) =>
        x.values.includes(x.target) ? x.values.indexOf(x.target) + 1 : -1;
    }
    if (variant === 1) {
      goal =
        "Return the last one-based position equal to target; return −1 if absent.";
      program = [
        init(-1),
        ...walk(1, cmp(">", i, len(values)), [
          IF(cmp("=", at(values, i), V("target")), [init(i)]),
        ]),
        ret(),
      ];
      expected = (x) =>
        x.values.includes(x.target) ? x.values.lastIndexOf(x.target) + 1 : -1;
    }
    if (variant === 2) {
      goal = "Return TRUE if target appears; return FALSE otherwise.";
      program = [each([IF(cmp("=", item, V("target")), [R(true)])]), R(false)];
      expected = (x) => x.values.includes(x.target);
    }
    if (variant === 3) {
      goal =
        "Return the first one-based position containing a positive value, or −1 if none.";
      program = [
        ...walk(1, cmp(">", i, len(values)), [
          IF(cmp(">", at(values, i), 0), [R(i)]),
        ]),
        R(-1),
      ];
      expected = (x) =>
        x.values.some((v) => v > 0) ? x.values.findIndex((v) => v > 0) + 1 : -1;
    }
    if (variant === 4) {
      goal =
        "Find the first adjacent equal pair and return its second position; return −1 if no pair exists.";
      program = [
        ...walk(2, cmp(">", i, len(values)), [
          IF(cmp("=", at(values, i), at(values, minus(i, 1))), [R(i)]),
        ]),
        R(-1),
      ];
      expected = (x) => {
        const j = x.values.slice(1).findIndex((v, j) => v === x.values[j]);
        return j < 0 ? -1 : j + 2;
      };
    }
  }
  if (selected === "procedure") {
    params = ["a", "b"];
    if (variant === 0) {
      goal = "Return the result of difference(a,b), preserving argument order.";
      library.difference = {
        params: ["first", "second"],
        body: [R(minus(V("first"), V("second")))],
      };
      program = [init(CALL("difference", a, b)), ret()];
      expected = (x) => x.a - x.b;
      alternatives = [
        init(CALL("difference", b, a)),
        { type: "display", value: result },
      ];
    }
    if (variant === 1) {
      goal = `Return the result of weighted(a,b): ${k} times a plus b.`;
      library.weighted = {
        params: ["base", "bonus"],
        body: [R(plus(mul(V("base"), k), V("bonus")))],
      };
      program = [init(CALL("weighted", a, b)), ret()];
      expected = (x) => k * x.a + x.b;
      alternatives = [init(CALL("weighted", b, a))];
    }
    if (variant === 2) {
      goal = "Use add and doubleIt to return twice the sum of a and b.";
      library.add = { params: ["x", "y"], body: [R(plus(V("x"), V("y")))] };
      library.doubleIt = { params: ["x"], body: [R(mul(V("x"), 2))] };
      program = [
        A("subtotal", CALL("add", a, b)),
        init(CALL("doubleIt", V("subtotal"))),
        ret(),
      ];
      expected = (x) => 2 * (x.a + x.b);
      alternatives = [
        init(CALL("add", CALL("doubleIt", a), CALL("doubleIt", b))),
      ];
    }
    if (variant === 3) {
      goal =
        "Return TRUE exactly when a meets the threshold b, using the meets procedure.";
      library.meets = {
        params: ["value", "limit"],
        body: [R(cmp("≥", value, V("limit")))],
      };
      program = [init(CALL("meets", a, b)), ret()];
      expected = (x) => x.a >= x.b;
      alternatives = [init(CALL("meets", b, a))];
    }
    if (variant === 4) {
      goal = "Use square to return the square of the difference of a and b.";
      library.square = { params: ["x"], body: [R(mul(V("x"), V("x")))] };
      program = [
        A("difference", minus(a, b)),
        init(CALL("square", V("difference"))),
        ret(),
      ];
      expected = (x) => (x.a - x.b) ** 2;
      alternatives = [init(minus(CALL("square", a), CALL("square", b)))];
    }
  }
  if (!program || !expected) throw Error("Unknown algorithm mode or structure");
  const tokens = flatten(program),
    canonical = tokens.map((node, j) => ({
      id: "step-" + j,
      text: nodeText(node),
      node,
    }));
  // Candidate alternatives apply to the shown state; they are not labelled as correct/incorrect.
  const wrongInit = A("result", variant % 2 ? 0 : 1),
    wrongReturn = R(
      params.includes("values")
        ? at(values, 1)
        : params.includes("value")
          ? value
          : params.includes("a")
            ? a
            : 0,
    );
  const distractors = [wrongInit, wrongReturn, ...alternatives];
  const header = tokens.find(
    (s) => s.condition?.op && ["if", "until"].includes(s.type),
  );
  if (header) {
    const condition = JSON.parse(JSON.stringify(header.condition));
    condition.op =
      {
        "≥": ">",
        ">": "≥",
        "≤": "<",
        "<": "≤",
        "=": "≠",
        "≠": "=",
        AND: "OR",
        OR: "AND",
        NOT: "NOT",
      }[condition.op] || condition.op;
    distractors.push({ ...header, condition });
  }
  const update = tokens.find(
    (s) => s.type === "assign" && s.name === "result" && s.value?.op,
  );
  if (update) {
    const value = JSON.parse(JSON.stringify(update.value));
    value.op = value.op === "+" ? "×" : "+";
    distractors.push({ ...update, value });
  }
  const existing = new Set(canonical.map((x) => x.text));
  const extra = distractors
    .filter((s) => {
      const text = nodeText(s);
      if (existing.has(text)) return false;
      existing.add(text);
      return true;
    })
    .map((node, j) => ({ id: "option-" + j, text: nodeText(node), node }));
  const bank = shuffle([...canonical, ...extra]);
  const tests = inputs(params);
  const q = {
    game: "algorithm-architect",
    title: "Algorithm Architect",
    mode: selected,
    topic: selected,
    topicTitle: architectModes[selected],
    structure: selected + "-" + variant,
    params,
    goal,
    library,
    bank,
    solution: canonical.map((b) => b.id),
    program,
    expected,
    tests,
    policy: "construction",
  };
  q.context = `Goal: ${goal}\nAllowed inputs: ${params.map((p) => (p === "values" ? "values is a list of 0–3 integers, each −3 through 5" : p === "rows" ? "rows has 0–2 rows, each containing 0–2 integers from −1 through 1" : p === "flag" ? "flag is TRUE or FALSE" : p === "n" || p === "m" ? p + " is an integer 0–5" : p + " is an integer −3 through 5")).join("; ")}.\nAll positions are one-based. Return a value; displaying a value alone is not a return.\n\n${Object.entries(
    library,
  )
    .map(
      ([name, d]) =>
        `PROCEDURE ${name}(${d.params.join(", ")})\n{\n${flatten(d.body)
          .map((n) => "    " + nodeText(n))
          .join("\n")}\n}`,
    )
    .join(
      "\n\n",
    )}${Object.keys(library).length ? "\n\n" : ""}Build the body of PROCEDURE solve(${params.join(", ")}).`;
  return q;
}
export function evaluateArchitect(q, order) {
  if (!Array.isArray(order) || new Set(order).size !== order.length)
    return {
      correct: false,
      details: "Each offered block may be used at most once.",
    };
  let program;
  try {
    program = parse(
      order.map((id) => {
        const block = q.bank.find((b) => b.id === id);
        if (!block) throw Error("Unknown block.");
        return block.node;
      }),
    );
  } catch (e) {
    return {
      correct: false,
      details: `Failing input: ${JSON.stringify(q.tests[0])}\nExpected returned value: ${JSON.stringify(q.expected(q.tests[0]))}\nYour algorithm cannot execute: ${e.message} Check how each IF or loop body is opened and closed.`,
    };
  }
  for (const input of q.tests) {
    const actual = executeProgram(program, input, q.library),
      expected = q.expected(input);
    if (
      actual.error ||
      !actual.returned ||
      !closeEnough(actual.value, expected)
    )
      return {
        correct: false,
        input,
        expected,
        actual: actual.returned ? actual.value : undefined,
        details: `Failing input: ${JSON.stringify(input)}\nExpected returned value: ${JSON.stringify(expected)}\nYour algorithm: ${actual.error || (!actual.returned ? "finished without RETURN" : JSON.stringify(actual.value))}\nExecution evidence:\n${actual.trace.join("\n")}\n${actual.trace.some((s) => s.startsWith("IF")) ? "Review the recorded condition results and the updates they permit." : "Review the order of assignments and the value supplied to RETURN."}`,
      };
  }
  return {
    correct: true,
    details: `Your algorithm returns the required result for all ${q.tests.length} allowed test inputs in this challenge, including edge cases. Alternative constructions are accepted by behavior.`,
    tests: q.tests.length,
  };
}
export function runConstruction(q, order, input) {
  try {
    return executeProgram(
      parse(
        order.map((id) => {
          const b = q.bank.find((b) => b.id === id);
          if (!b) throw Error("Unknown block.");
          return b.node;
        }),
      ),
      input,
      q.library,
    );
  } catch (e) {
    return { returned: false, error: e.message, trace: [] };
  }
}
