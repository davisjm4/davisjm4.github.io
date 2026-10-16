// Test Case Builder: one decision, computed answers, balanced structure decks.
export const testModes = {
  bugs: "Find the Bug-Exposing Input",
  predict: "Predict the Result",
  boundary: "Boundary Testing",
  branches: "Branch Coverage",
  edge: "Edge Cases",
};
const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick = (a) => a[int(0, a.length - 1)],
  shuffle = (a) => {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
const V = (name) => ({ v: name }),
  X = (op, ...args) => ({ op, args }),
  set = (name, to) => ({ set: name, to }),
  ret = (value) => ({ return: value }),
  iff = (condition, yes, no = []) => ({ if: condition, then: yes, else: no }),
  each = (body) => ({ each: "item", list: V("values"), body }),
  repeat = (times, body) => ({ repeat: times, body });
const A = V("value"),
  L = V("values"),
  T = V("text"),
  N = V("n"),
  I = V("index"),
  item = V("item"),
  C = V("count"),
  S = V("total");
export const format = (v) =>
  v === "ERROR"
    ? "ERROR"
    : typeof v === "boolean"
      ? v
        ? "TRUE"
        : "FALSE"
      : JSON.stringify(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const unparen = (s) =>
  s.startsWith("(") && s.endsWith(")") ? s.slice(1, -1) : s;
function expr(e) {
  if (e?.v) return e.v;
  if (!e?.op) return format(e);
  const a = e.args.map(expr);
  if (e.op === "GET") return `${a[0]}[${a[1]}]`;
  if (e.op === "CALL")
    return `${e.args[0]}(${e.args.slice(1).map(expr).join(", ")})`;
  if (["LENGTH", "CONCAT", "SUBSTRING", "CHAR"].includes(e.op))
    return `${e.op}(${a.join(", ")})`;
  if (e.op === "NOT") return `NOT (${a[0]})`;
  return `(${a.join(" " + e.op + " ")})`;
}
export function codeFor(program, depth = 0) {
  const pad = "  ".repeat(depth);
  return program
    .map((s) => {
      if (s.set) return `${pad}${s.set} ← ${unparen(expr(s.to))}`;
      if ("return" in s) return `${pad}RETURN(${unparen(expr(s.return))})`;
      if ("display" in s) return `${pad}DISPLAY(${unparen(expr(s.display))})`;
      if (s.if) {
        const block = (nodes) => `{\n${codeFor(nodes, depth + 1)}\n${pad}}`;
        return `${pad}IF (${unparen(expr(s.if))}) ${block(s.then)}${s.else.length ? `\n${pad}ELSE ${s.else.length === 1 && s.else[0].if ? codeFor(s.else, depth).trimStart() : block(s.else)}` : ""}`;
      }
      const header = s.each
        ? `FOR EACH ${s.each} IN ${expr(s.list)}`
        : s.until
          ? `REPEAT UNTIL (${unparen(expr(s.until))})`
          : s.procedure
            ? `PROCEDURE ${s.procedure}(${s.params.join(", ")})`
            : `REPEAT ${expr(s.repeat)} TIMES`;
      return `${pad}${header} {\n${codeFor(s.body, depth + 1)}\n${pad}}`;
    })
    .join("\n");
}
export function execute(program, input = {}, limit = 400) {
  let steps = 0,
    iterations = 0;
  const decisions = [],
    functions = {};
  const env = { ...input };
  function value(e, scope) {
    if (++steps > limit) throw Error("limit");
    if (e?.v) return scope[e.v];
    if (!e?.op) return e;
    const a = e.args;
    if (e.op === "CALL") {
      const f = functions[a[0]],
        local = { ...scope };
      f.params.forEach((p, i) => (local[p] = value(a[i + 1], scope)));
      return block(f.body, local).result;
    }
    const v = a.map((x) => value(x, scope));
    switch (e.op) {
      case "+":
        return v[0] + v[1];
      case "-":
        return v[0] - v[1];
      case "*":
        return v[0] * v[1];
      case "MOD":
        return v[0] % v[1];
      case ">":
        return v[0] > v[1];
      case "≥":
        return v[0] >= v[1];
      case "<":
        return v[0] < v[1];
      case "≤":
        return v[0] <= v[1];
      case "=":
        return same(v[0], v[1]);
      case "≠":
        return !same(v[0], v[1]);
      case "AND":
        return v.every(Boolean);
      case "OR":
        return v.some(Boolean);
      case "NOT":
        return !v[0];
      case "LENGTH":
        return v[0].length;
      case "GET":
      case "CHAR":
        if (!Number.isInteger(v[1]) || v[1] < 1 || v[1] > v[0].length)
          throw Error("index");
        return v[0][v[1] - 1];
      case "CONCAT":
        return v[0] + v[1];
      case "SUBSTRING":
        if (v[1] < 1 || v[2] < 0 || v[1] + v[2] > v[0].length + 1)
          throw Error("substring");
        return v[0].slice(v[1] - 1, v[1] - 1 + v[2]);
      default:
        throw Error("expression");
    }
  }
  function block(nodes, scope) {
    for (const s of nodes) {
      if (++steps > limit) throw Error("limit");
      if (s.set) scope[s.set] = value(s.to, scope);
      else if ("return" in s)
        return { done: true, result: value(s.return, scope) };
      else if ("display" in s)
        return { done: true, result: value(s.display, scope) };
      else if (s.if) {
        const yes = Boolean(value(s.if, scope));
        decisions.push({ condition: expr(s.if), yes });
        const r = block(yes ? s.then : s.else, scope);
        if (r.done) return r;
      } else if (s.procedure) functions[s.procedure] = s;
      else {
        let visits = 0;
        const count = s.each
          ? value(s.list, scope).length
          : s.until
            ? Infinity
            : value(s.repeat, scope);
        if (count < 0 || (!Number.isInteger(count) && count !== Infinity))
          throw Error("repeat");
        while (visits < count && (!s.until || !value(s.until, scope))) {
          if (s.each) scope[s.each] = value(s.list, scope)[visits];
          visits++;
          iterations++;
          const r = block(s.body, scope);
          if (r.done) return r;
        }
      }
    }
    return { done: false, result: undefined };
  }
  try {
    return { ...block(program, env), iterations, decisions, env };
  } catch (error) {
    return {
      done: true,
      result: "ERROR",
      iterations,
      decisions,
      env,
      error: error.message,
    };
  }
}
// Templates own independent requirement functions as well as executable code.
// Choice acceptance always evaluates all four candidates; no positional keys.
const length = X("LENGTH", L),
  get = (i) => X("GET", L, i);
const count = (cond) => [
  set("count", 0),
  each([iff(cond, [set("count", X("+", C, 1))])]),
  ret(C),
];
const sum = (initial = 0) => [
  set("total", initial),
  each([set("total", X("+", S, item))]),
  ret(S),
];
export const structures = {
  bugs: [
    "lower-inclusive",
    "upper-exclusive",
    "equality",
    "inequality",
    "wrong-constant",
    "range-exclusive",
    "and-or",
    "missing-not",
    "grouping",
    "compound-inclusive",
    "even-count",
    "loop-end",
    "skip-first",
    "extra-iteration",
    "counter-update",
    "zero-iteration",
    "list-search",
  ],
  predict: [
    "condition",
    "nested",
    "sum",
    "count",
    "accumulator",
    "until",
    "procedure",
    "list-search",
    "char-first",
    "char-middle",
    "char-last",
    "char-invalid",
  ],
  boundary: [
    "lower-inclusive",
    "upper-inclusive",
    "lower-exclusive",
    "upper-exclusive",
    "lower-shift",
    "upper-shift",
    "range-branch",
    "loop-end",
    "zero-iteration",
    "list-end",
  ],
  branches: [
    "else",
    "second",
    "nested",
    "compound",
    "prior-condition",
    "missing-test",
  ],
  edge: [
    "empty-count",
    "singleton-count",
    "empty-sum",
    "search-missing",
    "first-guard",
    "last-element",
    "empty-access",
    "zero-repeat",
    "empty-string",
    "short-string",
    "precondition",
  ],
};
const compact = (code) =>
  code
    .split("\n")
    .flatMap((line) => {
      // Boolean continuations preserve parentheses and remain valid pseudocode.
      if (line.length > 38 && / (AND|OR) /.test(line)) {
        const indent = line.match(/^ */)[0] + "  ";
        return line
          .replace(/ (AND|OR) /g, (_, op) => `\n${indent}${op} `)
          .split("\n");
      }
      return [line];
    })
    .join("\n");
export function run(q, input, program = q.program) {
  return execute(program, { ...q.env, [q.variable]: input });
}
function build(mode, shape) {
  const k = int(3, 9),
    lo = int(2, 5),
    hi = lo + int(4, 7),
    step = int(2, 4);
  const q = {
    mode,
    structure: shape,
    variable: "value",
    env: {},
    program: [],
    domain: range(-3, 20),
    requirement: "",
    docs: "",
    prompt: "Which input reveals the bug?",
    params: { k, lo, hi, step },
  };
  const cmp = (op, n = k) => X(op, A, n);
  const pred = (e) => [ret(e)];
  const defect = (requirement, expected, program) => {
    q.requirement = requirement;
    q.expected = expected;
    q.program = program;
    q.task = "expose";
  };
  const output = (program, input, why) => {
    q.program = program;
    q.input = input;
    q.task = "output";
    q.prompt = "What does this code return?";
    q.why = why;
  };
  const search = [
    each([iff(X("=", item, V("target")), [ret(true)])]),
    ret(false),
  ];
  const scan = [
    set("index", 1),
    each([
      iff(X("=", item, V("target")), [ret(I)]),
      set("index", X("+", I, 1)),
    ]),
    ret(-1),
  ];
  if (mode === "bugs" || mode === "boundary") {
    switch (shape) {
      case "lower-inclusive":
        defect(
          `Return TRUE for values at least ${k}.`,
          (v) => v >= k,
          pred(cmp(">", k + int(0, 2))),
        );
        break;
      case "upper-inclusive":
        defect(
          `Return TRUE for values at most ${k}.`,
          (v) => v <= k,
          pred(cmp("<", k - int(0, 2))),
        );
        break;
      case "lower-exclusive":
        defect(
          `Return TRUE for values greater than ${k}.`,
          (v) => v > k,
          pred(cmp("≥", k + int(0, 2))),
        );
        break;
      case "upper-exclusive":
        defect(
          `Return TRUE for values below ${k}.`,
          (v) => v < k,
          pred(cmp("≤", k - int(0, 2))),
        );
        break;
      case "equality":
        defect(
          `Return TRUE exactly when value equals ${k}.`,
          (v) => v === k,
          pred(cmp("=", k + step)),
        );
        break;
      case "inequality":
        defect(
          `Return TRUE exactly when value differs from ${k}.`,
          (v) => v !== k,
          pred(cmp("≠", k - step)),
        );
        break;
      case "wrong-constant":
        defect(
          `Return TRUE for values at least ${k}.`,
          (v) => v >= k,
          pred(cmp("≥", k + step)),
        );
        break;
      case "range-exclusive":
        defect(
          `Return TRUE strictly between ${lo} and ${hi}.`,
          (v) => v > lo && v < hi,
          pred(X("AND", cmp("≥", lo + int(0, 2)), cmp("≤", hi - int(0, 2)))),
        );
        break;
      case "lower-shift":
        defect(
          `Accept values from ${lo} through ${hi}, inclusive.`,
          (v) => v >= lo && v <= hi,
          pred(X("AND", cmp("≥", lo + step), cmp("≤", hi))),
        );
        break;
      case "upper-shift":
        defect(
          `Accept values from ${lo} through ${hi}, inclusive.`,
          (v) => v >= lo && v <= hi,
          pred(X("AND", cmp("≥", lo), cmp("≤", hi - step))),
        );
        break;
      case "range-branch":
        defect(
          `Return "OK" from ${lo} through ${hi}, inclusive; otherwise "No".`,
          (v) => (v >= lo && v <= hi ? "OK" : "No"),
          [
            iff(cmp("<", lo), [ret("No")]),
            iff(cmp("<", hi), [ret("OK")], [ret("No")]),
          ],
        );
        break;
      case "and-or":
      case "missing-not":
      case "grouping":
      case "compound-inclusive": {
        q.variable = "values";
        q.domain = [];
        for (let a = 0; a <= 12; a++)
          for (let b = 0; b <= 12; b++) q.domain.push([a, b]);
        q.docs = "Each input is a two-element list; indexing starts at 1.";
        const a = X("GET", L, 1),
          b = X("GET", L, 2),
          left = X("<", a, lo),
          right = X(">", b, hi);
        if (shape === "and-or")
          defect(
            `Return TRUE if the first value is below ${lo} OR the second is above ${hi}.`,
            (v) => v[0] < lo || v[1] > hi,
            pred(X("AND", left, right)),
          );
        if (shape === "missing-not")
          defect(
            "Return TRUE if the first value is even AND the two values are NOT equal.",
            (v) => v[0] % 2 === 0 && v[0] !== v[1],
            pred(X("AND", X("=", X("MOD", a, 2), 0), X("=", a, b))),
          );
        if (shape === "grouping")
          defect(
            `Return TRUE if (the first value is below ${lo} OR the second is above ${hi}) AND the first value is even.`,
            (v) => (v[0] < lo || v[1] > hi) && v[0] % 2 === 0,
            pred(X("OR", left, X("AND", right, X("=", X("MOD", a, 2), 0)))),
          );
        if (shape === "compound-inclusive")
          defect(
            `Return TRUE if the first value is at least ${lo} AND the second is at most ${hi}.`,
            (v) => v[0] >= lo && v[1] <= hi,
            pred(X("AND", X(">", a, lo), X("≤", b, hi))),
          );
        break;
      }
      case "even-count": {
        q.variable = "n";
        q.domain = range(0, 12);
        defect(
          "For n ≥ 0, count even integers from 1 through n.",
          (n) => Math.floor(n / 2),
          [
            set("count", 0),
            set("i", 1),
            repeat(N, [
              iff(X("=", X("MOD", V("i"), 2), 1), [set("count", X("+", C, 1))]),
              set("i", X("+", V("i"), 1)),
            ]),
            ret(C),
          ],
        );
        break;
      }
      case "loop-end":
      case "skip-first":
      case "extra-iteration":
      case "counter-update":
      case "zero-iteration": {
        if (shape === "zero-iteration") {
          q.variable = "n";
          q.domain = range(-3, 8);
          defect(
            "Return 1 + 2 + … + n for n > 0; otherwise return 0.",
            (n) => (n > 0 ? (n * (n + 1)) / 2 : 0),
            [
              iff(X("=", N, 0), [ret(1)]),
              iff(X("<", N, 0), [ret(0)]),
              set("total", 0),
              set("i", 1),
              repeat(N, [
                set("total", X("+", S, V("i"))),
                set("i", X("+", V("i"), 1)),
              ]),
              ret(S),
            ],
          );
        } else {
          q.variable = "values";
          q.domain = [];
          if (shape === "skip-first") {
            for (let a = 1; a <= 7; a++)
              for (let b = 1; b <= 7; b++)
                for (let c = 1; c <= 3; c++) q.domain.push([a, b, c]);
            defect(
              "Count adjacent pairs where the later element is larger.",
              (v) => v.slice(1).filter((x, i) => x > v[i]).length,
              [
                set("count", 0),
                set("i", 2),
                repeat(X("-", length, 2), [
                  iff(X(">", get(X("+", V("i"), 1)), get(V("i"))), [
                    set("count", X("+", C, 1)),
                  ]),
                  set("i", X("+", V("i"), 1)),
                ]),
                ret(C),
              ],
            );
          } else {
            q.docs = "Each input is [n, divisor], with both values positive.";
            for (let n = 1; n <= 12; n++)
              for (let d = 2; d <= 5; d++) q.domain.push([n, d]);
            const end =
              shape === "loop-end"
                ? X("-", get(1), 1)
                : shape === "extra-iteration"
                  ? X("+", get(1), 1)
                  : get(1);
            const delta = shape === "counter-update" ? 2 : 1;
            defect(
              "Count multiples of divisor from 1 through n, inclusive.",
              (v) => Math.floor(v[0] / v[1]),
              [
                set("count", 0),
                set("i", 1),
                repeat(end, [
                  iff(X("=", X("MOD", V("i"), get(2)), 0), [
                    set("count", X("+", C, 1)),
                  ]),
                  set("i", X("+", V("i"), delta)),
                ]),
                ret(C),
              ],
            );
          }
        }
        break;
      }
      case "list-search": {
        q.variable = "values";
        q.env = { target: k };
        q.domain = Array.from({ length: 80 }, () =>
          Array.from({ length: 3 }, () => int(k - 2, k + 2)),
        );
        defect(
          "Return TRUE if target occurs anywhere in values.",
          (v) => v.includes(k),
          [ret(X("=", get(1), V("target")))],
        );
        break;
      }
      case "list-end": {
        q.variable = "values";
        q.domain = Array.from({ length: 120 }, () => [
          int(1, 8),
          int(1, 8),
          int(1, 8),
        ]);
        defect(
          "Return the largest element of a nonempty list.",
          (v) => Math.max(...v),
          [
            set("best", get(1)),
            set("index", 1),
            repeat(X("-", length, 1), [
              iff(X(">", get(I), V("best")), [set("best", get(I))]),
              set("index", X("+", I, 1)),
            ]),
            ret(V("best")),
          ],
        );
        break;
      }
    }
  }
  if (mode === "branches") {
    q.task = "branch";
    q.goal = "Target";
    const target = [ret("Target")],
      other = [ret("Other")];
    if (shape === "else") {
      q.program = [iff(cmp("≥"), other, target)];
      q.prompt = "Which input executes the ELSE branch?";
    }
    if (shape === "second" || shape === "missing-test") {
      q.program = [
        iff(
          cmp("<", lo),
          [ret("Low")],
          [iff(cmp("≤", hi), [ret("Middle")], [ret("High")])],
        ),
      ];
      q.goal = "Middle";
      q.prompt =
        shape === "second"
          ? "Which input executes the second branch?"
          : "Which input tests the branch not yet covered?";
      if (shape === "missing-test")
        q.requirement = `Existing tests: ${lo - 1} and ${hi + 1}.`;
    }
    if (shape === "nested") {
      q.program = [
        iff(
          cmp("≥", lo),
          [iff(X("=", X("MOD", A, 2), 0), target, other)],
          [ret("Small")],
        ),
      ];
      q.prompt = 'Which input returns "Target"?';
    }
    if (shape === "compound") {
      q.program = [iff(X("OR", cmp("<", lo), cmp(">", hi)), target, other)];
      q.prompt = "Which input executes the IF body?";
    }
    if (shape === "prior-condition") {
      q.program = [
        iff(cmp("<", lo), [ret("First")], [iff(cmp("<", hi), target, other)]),
      ];
      q.prompt = 'Which input returns "Target"?';
    }
    // ELSE and outside-range branches have an extreme-only scalar solution.
    // Add an independent second input used in the comparison, so size is no key.
    if (["else", "compound"].includes(shape)) {
      q.variable = "values";
      q.docs = "Each input is [left, right].";
      q.domain = [];
      for (let a = 0; a <= 10; a++)
        for (let b = 0; b <= 10; b++) q.domain.push([a, b]);
      const a = get(1),
        b = get(2);
      q.program = [
        iff(
          shape === "else" ? X("≥", a, b) : X("OR", X("<", a, b), X("=", a, b)),
          shape === "else" ? other : target,
          shape === "else" ? target : other,
        ),
      ];
    }
  }
  if (mode === "predict") {
    if (shape === "condition") {
      const v = int(k - 2, k + 2);
      output(
        [iff(cmp("≥"), [ret(X("+", A, step))], [ret(X("-", A, step))])],
        v,
        "Only the selected branch changes value.",
      );
      q.answers = [v + step, v - step, v, v * step];
    }
    if (shape === "nested") {
      const v = int(1, hi + 3);
      output(
        [
          iff(
            cmp("<", lo),
            [ret(X("+", A, 2))],
            [iff(cmp("≤", hi), [ret(X("*", A, 2))], [ret(X("-", A, 2))])],
          ),
        ],
        v,
        "The earlier condition is tested before the later one.",
      );
      q.answers = [v + 2, v * 2, v - 2, v];
    }
    if (["sum", "count", "list-search"].includes(shape)) {
      q.variable = "values";
      const list = Array.from({ length: int(2, 4) }, () => int(1, 7));
      if (shape === "sum") {
        output(sum(), list, "Every element is added once.");
        const t = list.reduce((a, b) => a + b, 0);
        q.answers = [t, t - list[0], list[0], list.length, t + list[0]];
      }
      if (shape === "count") {
        output(
          count(X(">", item, k)),
          list,
          `Only elements greater than ${k} increase count.`,
        );
        q.answers = [
          list.filter((x) => x > k).length,
          list.length,
          list.reduce((a, b) => a + b, 0),
          list[0],
          0,
          1,
          "ERROR",
        ];
      }
      if (shape === "list-search") {
        q.env = { target: pick([...list, k + 10]) };
        output(
          scan,
          list,
          "Search returns the first matching one-based position, or −1 when absent.",
        );
      }
    }
    if (shape === "accumulator") {
      q.variable = "n";
      const n = int(0, 4);
      output(
        [set("total", step), repeat(N, [set("total", X("+", S, k))]), ret(S)],
        n,
        `Start at ${step} and add ${k} once per repetition.`,
      );
      q.answers = [step + n * k, n * k, step + n, step + k, step + (n + 1) * k];
    }
    if (shape === "until") {
      q.variable = "value";
      const v = int(0, hi + 2);
      output(
        [
          set("count", 0),
          {
            until: cmp("≥", hi),
            body: [set("value", X("+", A, step)), set("count", X("+", C, 1))],
          },
          ret(C),
        ],
        v,
        `Each repetition increases value by ${step}; stop once value ≥ ${hi}.`,
      );
      const visits = Math.max(0, Math.ceil((hi - v) / step));
      q.answers = [
        visits,
        Math.max(0, visits - 1),
        visits + 1,
        Math.max(0, hi - v),
        0,
        1,
        step,
      ];
    }
    if (shape === "procedure") {
      const v = int(2, 9);
      output(
        [
          {
            procedure: "adjust",
            params: ["a", "b"],
            body: [ret(X("-", X("*", V("a"), 2), V("b")))],
          },
          ret(X("CALL", "adjust", A, step)),
        ],
        v,
        `The procedure doubles its first argument and subtracts ${step}.`,
      );
      q.answers = [
        2 * v - step,
        v - step,
        2 * (v - step),
        2 * v + step,
        v * step,
      ];
    }
    if (shape.startsWith("char-")) {
      q.variable = "text";
      const text = pick(["CAT", "DOG", "SUN", "MAP"]),
        pos =
          shape === "char-first"
            ? 1
            : shape === "char-middle"
              ? 2
              : shape === "char-last"
                ? 3
                : pick([0, 4]);
      q.env = { index: pos };
      q.docs =
        "CHAR(text, index) returns the one-based character; invalid positions cause ERROR.";
      output(
        [ret(X("CHAR", T, I))],
        text,
        `Position ${pos} ${pos >= 1 && pos <= 3 ? `contains ${JSON.stringify(text[pos - 1])}` : "is outside the text"}.`,
      );
      q.answers = [...text.split(""), "ERROR"];
    }
  }
  if (mode === "edge") {
    q.variable = "values";
    const x = int(3, 8),
      single = [x];
    if (shape === "empty-count" || shape === "singleton-count") {
      output(
        count(X(">", item, k)),
        shape === "empty-count" ? [] : single,
        shape === "empty-count"
          ? "The list is empty, so the loop makes no updates to count."
          : `Only values greater than ${k} increase count.`,
      );
      q.answers = [0, 1, shape === "empty-count" ? k : x, "ERROR"];
    }
    if (shape === "empty-sum") {
      output(
        sum(),
        [],
        "No elements are added, so the initial total is returned.",
      );
      q.answers = [0, 1, -1, "ERROR"];
    }
    if (shape === "search-missing") {
      q.env = { target: pick([x, x + 1, x + 2]) };
      output(
        scan,
        pick([[], single, [x, x + 2]]),
        "A match returns its first one-based position; with no match, RETURN(−1) runs.",
      );
      q.answers = [-1, 0, 1, 2, "ERROR"];
    }
    if (shape === "first-guard") {
      output(
        [iff(X("=", length, 0), [ret(-1)]), ret(get(1))],
        pick([[], single]),
        "An empty list returns −1 before any access; otherwise position 1 is read.",
      );
      q.answers = [-1, 0, 1, x, "ERROR"];
    }
    if (shape === "last-element") {
      output(
        [ret(get(length))],
        pick([single, [x, x + 1], []]),
        "The last valid position equals LENGTH(values); an empty list has no valid position.",
      );
      q.answers = [x, x + 1, 0, "ERROR"];
    }
    if (shape === "empty-access") {
      output(
        [ret(get(1))],
        pick([[], single]),
        "List positions start at 1, but an empty list has no first element.",
      );
      q.answers = [x, 0, 1, "ERROR"];
    }
    if (shape === "zero-repeat") {
      q.variable = "n";
      output(
        [set("total", k), repeat(N, [set("total", X("+", S, step))]), ret(S)],
        pick([0, 1]),
        `Start at ${k}; each repetition adds ${step}.`,
      );
      q.answers = [0, k, k + step, k - step];
    }
    if (shape === "empty-string") {
      q.variable = "text";
      q.docs = 'CONCAT(a, b) joins strings in order; "" is empty text.';
      output(
        [ret(X("CONCAT", T, "!"))],
        pick(["", "A"]),
        "Joining empty text adds no characters; the exclamation mark is still present.",
      );
      q.answers = ["!", "A!", "", "ERROR"];
    }
    if (shape === "short-string") {
      q.variable = "text";
      q.env = { index: pick([1, 2]) };
      q.docs =
        "CHAR(text, index) uses one-based positions; invalid positions cause ERROR.";
      output(
        [ret(X("CHAR", T, I))],
        pick(["A", "AB", ""]),
        "An access succeeds only when the position is between 1 and the text length.",
      );
      q.answers = ["A", "B", "", "ERROR"];
    }
    if (shape === "precondition") {
      q.variable = "values";
      q.docs =
        "Reading values[1] requires a nonempty list; otherwise it causes ERROR.";
      output(
        [ret(get(1))],
        pick([[], single]),
        "Position 1 is read only for nonempty input; empty input violates the stated precondition.",
      );
      q.answers = [x, 0, 1, -1, "ERROR"];
    }
  }
  if (!q.program.length) throw Error(`Missing template ${mode}/${shape}`);
  return q;
}
// Reject shortcuts in input-choice sets. All lists have equal lengths and all
// scalar keys have a non-exposing smaller AND larger option. The sign and length
// of an answer can never uniquely identify the exposing/branch-reaching input.
export function appearanceSafe(values, answer) {
  if (values.every((v) => typeof v === "number")) {
    if (answer === Math.min(...values) || answer === Math.max(...values))
      return false;
    if (values.filter((v) => v > 0).length === 1 && answer > 0) return false;
    if (values.filter((v) => v < 0).length === 1 && answer < 0) return false;
  }
  if (values.every(Array.isArray)) {
    if (new Set(values.map((v) => v.length)).size !== 1) return false;
    // Even a coordinate must not be uniquely extreme or uniquely signed.
    for (let i = 0; i < answer.length; i++) {
      const column = values.map((v) => v[i]);
      if (
        (answer[i] === Math.min(...column) ||
          answer[i] === Math.max(...column)) &&
        column.filter((v) => v === answer[i]).length === 1
      )
        return false;
      if (column.filter((v) => v > 0).length === 1 && answer[i] > 0)
        return false;
      if (column.filter((v) => v < 0).length === 1 && answer[i] < 0)
        return false;
    }
  }
  if (
    values.every((v) => typeof v === "string") &&
    new Set(values.map((v) => v.length)).size !== 1
  )
    return false;
  return true;
}
const unique = (a) => [
  ...new Map(a.map((v) => [JSON.stringify(v), v])).values(),
];
export function validateQuestion(q) {
  if (
    q.options.length !== 4 ||
    unique(q.options.map((o) => o.value)).length !== 4
  )
    return false;
  const yes = q.options.filter((o) => q.qualify(o.value));
  return (
    yes.length === 1 &&
    yes[0].id === q.correctId &&
    (q.task === "output" ||
      appearanceSafe(
        q.options.map((o) => o.value),
        yes[0].value,
      ))
  );
}
export function generateTestCase(mode = "mixed", forced) {
  if (mode === "mixed") mode = pick(Object.keys(testModes));
  if (!testModes[mode]) throw Error("Unknown mode");
  const shape = forced || pick(structures[mode]);
  if (!structures[mode].includes(shape)) throw Error("Unknown structure");
  for (let attempt = 0; attempt < 80; attempt++) {
    const q = build(mode, shape);
    let values;
    if (q.task === "output") {
      q.answer = run(q, q.input).result;
      q.qualify = (v) => same(v, q.answer);
      const candidates = unique(
        q.answers ||
          [
            q.answer,
            0,
            1,
            q.answer - 1,
            q.answer + 1,
            q.answer + 2,
            q.input,
            Array.isArray(q.input) ? q.input.length : 2,
            Array.isArray(q.input) ? q.input[0] : 3,
            "ERROR",
          ].filter((v) => typeof v === "number" || v === "ERROR"),
      );
      const wrong = candidates.filter((v) => !q.qualify(v));
      if (wrong.length < 3) continue;
      // Keep an ordinary numeric result from being the only positive option.
      for (let n = 0; n < 40; n++) {
        const trial = [q.answer, ...shuffle(wrong).slice(0, 3)];
        if (
          typeof q.answer === "number" &&
          q.answer > 0 &&
          trial.filter((v) => typeof v === "number" && v > 0).length === 1
        )
          continue;
        values = trial;
        break;
      }
      if (!values) continue;
      q.evidence = () => `The code returns ${format(q.answer)}. ${q.why}`;
    } else {
      q.qualify =
        q.task === "expose"
          ? (v) => !same(q.expected(v), run(q, v).result)
          : (v) => same(run(q, v).result, q.goal);
      const yes = unique(q.domain.filter(q.qualify)),
        no = unique(q.domain.filter((v) => !q.qualify(v)));
      if (!yes.length || no.length < 3) continue;
      for (let i = 0; i < 160; i++) {
        const answer = pick(yes),
          candidate = [answer, ...shuffle(no).slice(0, 3)];
        if (appearanceSafe(candidate, answer)) {
          values = candidate;
          q.answer = answer;
          break;
        }
      }
      if (!values) continue;
      q.evidence =
        q.task === "expose"
          ? (v) =>
              `For ${format(v)}, the requirement expects ${format(q.expected(v))}, but the code returns ${format(run(q, v).result)}.`
          : (v) =>
              `For ${format(v)}, ${run(q, v)
                .decisions.map(
                  (d) => `${unparen(d.condition)} is ${format(d.yes)}`,
                )
                .join("; ")}. Execution returns ${format(run(q, v).result)}.`;
    }
    q.options = shuffle(values).map((value, i) => ({
      id: `choice-${i}`,
      value,
      label: format(value),
    }));
    q.correctId = q.options.find((o) => q.qualify(o.value)).id;
    q.game = "test-case-builder";
    q.title = "Test Case Builder";
    q.topic = "quick." + mode;
    q.topicTitle = testModes[mode];
    q.kind = "test";
    q.fields = [];
    q.example = { choice: q.correctId };
    q.inputText =
      q.task === "output" ? `${q.variable} ← ${format(q.input)}` : "";
    q.code = compact(
      Object.entries(q.env)
        .map(([n, v]) => `${n} ← ${format(v)}`)
        .concat(codeFor(q.program))
        .join("\n"),
    );
    q.context = [q.requirement, q.docs, q.inputText, q.code]
      .filter(Boolean)
      .join("\n");
    q.explanation = q.evidence(q.answer);
    if (validateQuestion(q)) return q;
  }
  throw Error(`No defensible four-choice set: ${mode}/${shape}`);
}
export function evaluateTestCase(q, response) {
  const chosen = q.options.find((o) => o.id === response?.choice),
    correct = !!chosen && q.qualify(chosen.value);
  let details = q.explanation;
  if (chosen && !correct && q.task === "expose")
    details =
      `For your input ${chosen.label}, both return ${format(run(q, chosen.value).result)}. ` +
      q.explanation;
  return { correct, details };
}
export function reasonFamily(mode, shape) {
  const groups = [
    [
      "lower-inclusive",
      "upper-inclusive",
      "lower-exclusive",
      "upper-exclusive",
    ],
    ["equality", "inequality", "wrong-constant", "lower-shift", "upper-shift"],
    ["and-or", "missing-not", "grouping", "compound-inclusive"],
    ["even-count", "loop-end", "extra-iteration", "counter-update"],
    ["char-first", "char-middle", "char-last", "char-invalid"],
    ["empty-count", "empty-sum"],
    ["first-guard", "last-element", "empty-access", "precondition"],
  ];
  return mode + ":" + (groups.find((g) => g.includes(shape))?.[0] || shape);
}
export function displayFamily(mode, shape) {
  if (shape.startsWith("char-") || shape === "short-string")
    return "character-access";
  if (["empty-sum", "sum"].includes(shape)) return "sum";
  if (
    ["first-guard", "empty-access", "precondition", "last-element"].includes(
      shape,
    )
  )
    return "list-access";
  return reasonFamily(mode, shape);
}
export function createTestDeck() {
  const bags = new Map(),
    last = new Map();
  let modes = [],
    previous = "",
    previousMode = "";
  function arrange(mode, rest, prev) {
    if (!rest.length) return [];
    for (const shape of shuffle(rest)) {
      const family = reasonFamily(mode, shape);
      if (family === prev) continue;
      const tail = arrange(
        mode,
        rest.filter((s) => s !== shape),
        family,
      );
      if (tail) return [shape, ...tail];
    }
    return null;
  }
  return {
    next(mode = "mixed") {
      if (mode === "mixed") {
        if (!modes.length) modes = shuffle(Object.keys(testModes));
        if (modes.length > 1 && modes[0] === previousMode)
          [modes[0], modes[1]] = [modes[1], modes[0]];
        mode = modes.shift();
      }
      if (!bags.get(mode)?.length) bags.set(mode, [...structures[mode]]);
      const rest = bags.get(mode);
      const choices = shuffle(rest).filter(
        (shape) =>
          reasonFamily(mode, shape) !== last.get(mode) &&
          arrange(
            mode,
            rest.filter((s) => s !== shape),
            reasonFamily(mode, shape),
          ),
      );
      const shape =
        choices.find((s) => displayFamily(mode, s) !== previous) || choices[0];
      if (!shape) throw Error("No varied template order");
      bags.set(
        mode,
        rest.filter((s) => s !== shape),
      );
      last.set(mode, reasonFamily(mode, shape));
      previous = displayFamily(mode, shape);
      previousMode = mode;
      return generateTestCase(mode, shape);
    },
  };
}
