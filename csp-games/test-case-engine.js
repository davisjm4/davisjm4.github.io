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
        const block = (nodes) =>
          nodes.length === 1 && "return" in nodes[0]
            ? `{ RETURN(${unparen(expr(nodes[0].return))}) }`
            : `{\n${codeFor(nodes, depth + 1)}\n${pad}}`;
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
const length = X("LENGTH", L),
  get = (index) => X("GET", L, index),
  sumProgram = (update = item, initial = 0) => [
    set("total", initial),
    each([set("total", X("+", S, update))]),
    ret(S),
  ];
const countProgram = (condition) => [
  set("count", 0),
  each([iff(condition, [set("count", X("+", C, 1))])]),
  ret(C),
];
function predicateProgram(condition) {
  return [ret(condition)];
}
const definitions = {
  bugs: [
    "inclusive",
    "direction",
    "threshold",
    "and-or",
    "negation",
    "range-end",
    "loop-count",
    "loop-update",
    "sum-initial",
    "minimum-zero",
    "omit-last",
    "search-value",
  ],
  predict: [
    "conditional",
    "nested",
    "sum",
    "conditional-count",
    "product",
    "repeat-sum",
    "until",
    "first-match",
    "procedure",
    "concat",
    "substring",
    "list-access",
  ],
  boundary: [
    "above-exclusive",
    "below-exclusive",
    "upper-range",
    "lower-range",
    "compound-transition",
    "upper-index",
    "first-index",
    "repeat-transition",
    "zero-one",
    "string-end",
  ],
  branches: [
    "else",
    "middle",
    "nested-true",
    "nested-false",
    "compound",
    "negated",
    "missing-test",
    "fall-through",
  ],
  edge: [
    "empty-sum",
    "empty-product",
    "guard-first",
    "singleton",
    "missing-search",
    "last-access",
    "zero-loop",
    "empty-text",
    "short-text",
    "precondition",
  ],
};
export const structures = definitions;
function build(mode, shape) {
  const k = int(3, 12),
    step = int(2, 4),
    low = int(1, 5),
    high = low + int(3, 7),
    target = int(2, 4);
  let q = {
    mode,
    structure: shape,
    variable: "value",
    domain: range(-5, 22),
    env: {},
    program: [],
    prompt: "",
    requirement: "",
    docs: "",
    why: "",
  };
  const P = (p) => (q.program = p),
    cmp = (op, b = k) => X(op, A, b);
  const bool = (op) => predicateProgram(cmp(op));
  if (mode === "bugs") {
    q.prompt = "Which input exposes the bug?";
    if (shape === "inclusive") {
      q.requirement = `Return TRUE when value is ${k} or greater.`;
      q.intended = bool("≥");
      P(bool(">"));
      q.why = "The strict comparison leaves out equality.";
    }
    if (shape === "direction") {
      q.requirement = `Return TRUE from ${low} through ${high}, inclusive.`;
      q.intended = predicateProgram(X("AND", cmp("≥", low), cmp("≤", high)));
      P(predicateProgram(X("AND", cmp("≥", low), cmp("≥", high))));
      q.why = "The upper-limit comparison points in the wrong direction.";
    }
    if (shape === "threshold") {
      q.requirement = `Return TRUE when value is at least ${k}.`;
      q.intended = bool("≥");
      P(predicateProgram(cmp("≥", k + step)));
      q.why = "The code uses a higher cutoff than required.";
    }
    if (shape === "and-or") {
      q.requirement = `Return TRUE when value is below ${low} or above ${high}.`;
      q.intended = predicateProgram(X("OR", cmp("<", low), cmp(">", high)));
      P(predicateProgram(X("AND", cmp("<", low), cmp(">", high))));
      q.why =
        "A value cannot be both below the lower limit and above the upper limit.";
    }
    if (shape === "negation") {
      q.requirement = `Return TRUE when value is not between ${low} and ${high}, inclusive.`;
      const c = X("AND", cmp("≥", low), cmp("≤", high));
      q.intended = predicateProgram(X("NOT", c));
      P(predicateProgram(X("AND", X("NOT", cmp("≥", low)), cmp("≤", high))));
      q.why =
        "NOT must negate the whole range test, not only its lower-limit check.";
    }
    if (shape === "range-end") {
      q.requirement = `Return TRUE from ${low} through ${high}, including both endpoints.`;
      q.intended = predicateProgram(X("AND", cmp("≥", low), cmp("≤", high)));
      P(predicateProgram(X("AND", cmp("≥", low), cmp("<", high))));
      q.why = "The upper endpoint is excluded by the code.";
    }
    if (shape === "loop-count") {
      q.variable = "n";
      q.domain = range(0, 8);
      q.requirement = "Return n copies of 3 added together.";
      q.intended = [
        set("total", 0),
        repeat(N, [set("total", X("+", S, 3))]),
        ret(S),
      ];
      P([
        ...q.intended.slice(0, -1),
        iff(X(">", N, 2), [set("total", X("+", S, 3))]),
        ret(S),
      ]);
      q.why = "For n above 2, the extra update adds one value too many.";
    }
    if (shape === "loop-update") {
      q.variable = "n";
      q.domain = range(-2, 8);
      q.requirement = "For n ≤ 0 return 0; otherwise return 1 + 2 + … + n.";
      const sequence = (step) => [
        iff(X("≤", N, 0), [ret(0)]),
        set("total", 0),
        set("index", 1),
        repeat(N, [set("total", X("+", S, I)), set("index", X("+", I, step))]),
        ret(S),
      ];
      q.intended = sequence(1);
      P(sequence(2));
      q.why = "Advancing by 2 skips numbers that the sum must include.";
    }
    if (shape === "sum-initial") {
      q.variable = "values";
      q.domain = [[], [0], [1], [-1], [0, 0], [2, 3], [1, -1]];
      q.requirement = "Return the sum; an empty list must return 0.";
      q.intended = sumProgram();
      P([
        set("total", 0),
        iff(X(">", length, 1), [set("total", 1)]),
        each([set("total", X("+", S, item))]),
        ret(S),
      ]);
      q.why =
        "Lists longer than one element receive an extra 1 before traversal.";
    }
    if (shape === "minimum-zero") {
      q.variable = "values";
      q.domain = [
        [1],
        [2, 3],
        [3, 1],
        [4, 2, 5],
        [-1],
        [-3, 2],
        [-2, 0],
        [0, 3],
        [-4, -2],
      ];
      q.requirement = "For a nonempty list, return its smallest value.";
      q.intended = [
        set("best", get(1)),
        each([iff(X("<", item, V("best")), [set("best", item)])]),
        ret(V("best")),
      ];
      P([
        set("best", 0),
        each([iff(X("<", item, V("best")), [set("best", item)])]),
        ret(V("best")),
      ]);
      q.why = "Starting at 0 cannot find a positive minimum.";
    }
    if (shape === "omit-last") {
      q.variable = "values";
      q.domain = [[1], [2, 3], [3, 0], [4, 0], [0], [2, 1, 0], [0, 1], [2, 2]];
      q.requirement = "For a nonempty list, return the sum of every element.";
      q.intended = sumProgram();
      P([
        set("total", 0),
        set("index", 1),
        repeat(X("-", length, 1), [
          set("total", X("+", S, get(I))),
          set("index", X("+", I, 1)),
        ]),
        ret(S),
      ]);
      q.why = "The loop stops before adding the last element.";
    }
    if (shape === "search-value") {
      q.variable = "values";
      q.env = { target };
      q.domain = [
        [],
        [1],
        [target],
        [target, 1],
        [1, target],
        [target + 1],
        [target + 2, 1],
        [0, 0, target],
      ];
      q.requirement = `Return the first position of ${target}, or -1 if absent.`;
      const search = (result) => [
        set("index", 1),
        repeat(length, [
          iff(X("=", get(I), V("target")), [ret(result)]),
          set("index", X("+", I, 1)),
        ]),
        ret(-1),
      ];
      q.intended = search(I);
      P(search(get(I)));
      q.why = "A matching value is returned instead of its one-based position.";
    }
    q.qualify = (input) =>
      !same(run(q, input).result, run(q, input, q.intended).result);
    q.evidence = (input) =>
      `For ${format(input)}, the requirement expects ${format(run(q, input, q.intended).result)}, but the code returns ${format(run(q, input).result)}. ${q.why}`;
  }
  if (mode === "predict") {
    q.prompt = "What does this code return?";
    if (shape === "conditional") P([iff(cmp("≥"), [ret(k + 2)], [ret(k - 2)])]);
    if (shape === "nested")
      P([
        iff(cmp(">", high), [ret(3)], [iff(cmp("≥", low), [ret(2)], [ret(1)])]),
      ]);
    if (shape === "sum") {
      q.variable = "values";
      P(sumProgram());
    }
    if (shape === "conditional-count") {
      q.variable = "values";
      q.env = { limit: low };
      P(countProgram(X(">", item, V("limit"))));
    }
    if (shape === "product") {
      q.variable = "values";
      P([set("total", 1), each([set("total", X("*", S, item))]), ret(S)]);
    }
    if (shape === "repeat-sum") {
      q.variable = "n";
      P([
        set("total", low),
        repeat(N, [set("total", X("+", S, step))]),
        ret(S),
      ]);
    }
    if (shape === "until") {
      q.variable = "value";
      P([
        set("count", 0),
        {
          until: X("≥", A, k),
          body: [set("value", X("+", A, step)), set("count", X("+", C, 1))],
        },
        ret(C),
      ]);
    }
    if (shape === "first-match") {
      q.variable = "values";
      q.env = { target };
      P([
        set("index", 1),
        repeat(length, [
          iff(X("=", get(I), V("target")), [ret(I)]),
          set("index", X("+", I, 1)),
        ]),
        ret(-1),
      ]);
    }
    if (shape === "procedure") {
      q.variable = "value";
      P([
        {
          procedure: "adjust",
          params: ["amount", "bonus"],
          body: [ret(X("+", X("*", V("amount"), 2), V("bonus")))],
        },
        { display: X("CALL", "adjust", A, low) },
      ]);
      q.prompt = "What does the code display?";
    }
    if (shape === "concat") {
      q.variable = "text";
      q.docs = "CONCAT(a, b) joins the text a followed by b.";
      P([ret(X("CONCAT", X("CONCAT", "[", T), "]"))]);
    }
    if (shape === "substring") {
      q.variable = "text";
      q.docs =
        "SUBSTRING(text, start, count) returns count characters, starting at one-based start.";
      P([ret(X("SUBSTRING", T, 2, 2))]);
    }
    if (shape === "list-access") {
      q.variable = "index";
      q.env = { values: [int(2, 5), int(6, 8), int(9, 12)] };
      P([ret(get(I))]);
    }
    q.input =
      q.variable === "values"
        ? pick([[low, 0, low + 2], [target, 1, target], [2, 3], [0, 2], []])
        : q.variable === "text"
          ? pick(["CODE", "TEAM", "LOOP"])
          : q.variable === "n"
            ? int(0, 4)
            : q.variable === "index"
              ? pick([0, 1, 2, 3, 4])
              : shape === "until"
                ? int(k - 5, k + 2)
                : int(low - 1, high + 2);
    const result = run(q, q.input).result;
    q.answer = result;
    q.answers =
      typeof result === "number"
        ? [result, result + 1, result - 1, result + step]
        : typeof result === "string"
          ? result === "ERROR"
            ? [
                "ERROR",
                q.env.values[0],
                q.env.values.at(-1),
                q.env.values.length,
              ]
            : shape === "concat"
              ? [result, q.input, q.input + q.input, "]" + q.input + "["]
              : [result, q.input, q.input.slice(0, 2), q.input.slice(2)]
          : [true, false];
    if (shape === "conditional") q.answers = [k + 2, k - 2, k, k + 1];
    if (shape === "nested") q.answers = [1, 2, 3, 0];
    if (shape === "product")
      q.answers = unique([
        result,
        q.input.reduce((a, b) => a + b, 0),
        q.input.length,
        result + 1,
      ]);
    if (shape === "first-match")
      q.answers = unique([result, target, 0, result + 1]);
    q.answers = [
      ...new Map(q.answers.map((v) => [JSON.stringify(v), v])).values(),
    ];
    const r = run(q, q.input);
    q.evidence = () =>
      r.result === "ERROR"
        ? `Index ${q.input} is outside 1 through ${q.env.values.length}; this access produces ERROR.`
        : shape === "procedure"
          ? `The arguments supply amount = ${q.input} and bonus = ${low}, so ${q.input} * 2 + ${low} = ${result}.`
          : shape === "concat" || shape === "substring"
            ? `The documented operation on ${format(q.input)} returns ${format(result)}.`
            : r.decisions.length
              ? `${r.decisions.map((d) => `${d.condition} is ${format(d.yes)}`).join("; ")}; the result is ${format(result)}.`
              : r.iterations
                ? `The loop runs ${r.iterations} time${r.iterations === 1 ? "" : "s"}; its updates leave the returned value at ${format(result)}.`
                : shape === "until"
                  ? `The stopping condition is already TRUE, so count stays 0.`
                  : q.variable === "values"
                    ? `There are no loop visits, so the initial value ${format(result)} is returned.`
                    : `The one-based access selects ${format(result)}.`;
  }
  if (mode === "boundary") {
    if (shape === "above-exclusive") {
      q.prompt = "Which integer is just inside the valid region?";
      q.requirement = `Valid inputs are greater than ${k}.`;
      P(bool(">"));
      q.qualify = (x) => x === k + 1;
      q.why = `The first valid integer above ${k} is ${k + 1}.`;
    }
    if (shape === "below-exclusive") {
      q.prompt = "Which integer is just outside the valid region?";
      q.requirement = `Valid inputs are less than ${k}.`;
      P(bool("<"));
      q.qualify = (x) => x === k;
      q.why = `${k - 1} is valid, but ${k} is the first excluded integer.`;
    }
    if (shape === "upper-range") {
      q.prompt = "Which integer is just above the valid range?";
      q.requirement = `Valid inputs are from ${low} through ${high}, inclusive.`;
      P(predicateProgram(X("AND", cmp("≥", low), cmp("≤", high))));
      q.qualify = (x) => x === high + 1;
      q.why = `${high} is included; ${high + 1} is the first integer beyond the upper limit.`;
    }
    if (shape === "lower-range") {
      q.prompt = "Which integer is just below the valid range?";
      q.requirement = `Valid inputs are from ${low} through ${high}, inclusive.`;
      P(predicateProgram(X("AND", cmp("≥", low), cmp("≤", high))));
      q.qualify = (x) => x === low - 1;
      q.why = `${low} is included; ${low - 1} is the adjacent excluded integer.`;
    }
    if (shape === "compound-transition") {
      q.prompt = "Which input is the first integer reaching ELSE?";
      P([
        iff(
          X("OR", cmp("<", low), cmp(">", high)),
          [ret("outside")],
          [ret("inside")],
        ),
      ]);
      q.qualify = (x) => x === low;
      q.why = `At ${low}, both outside-range comparisons are FALSE, so ELSE starts the inside region.`;
    }
    if (shape === "upper-index" || shape === "first-index") {
      q.variable = "index";
      q.env = { values: [2, 4, 6, 8, 10].slice(0, int(3, 5)) };
      q.domain = range(-2, 8);
      q.prompt =
        shape === "upper-index"
          ? "Which index is just beyond the last valid position?"
          : "Which index is just before the first valid position?";
      P([ret(get(I))]);
      const answer = shape === "upper-index" ? q.env.values.length + 1 : 0;
      q.qualify = (x) => x === answer;
      q.why = `A ${q.env.values.length}-element list uses indices 1 through ${q.env.values.length}; ${answer} is the adjacent invalid position.`;
    }
    if (shape === "repeat-transition") {
      q.variable = "n";
      q.domain = range(0, 8);
      q.prompt = "Which n is the first to make the loop run twice?";
      P([
        set("count", 0),
        { until: X("≥", C, N), body: [set("count", X("+", C, step))] },
        ret(C),
      ]);
      q.qualify = (n) => n === step + 1;
      q.why = `One update reaches ${step}; n = ${step + 1} requires a second update.`;
    }
    if (shape === "zero-one") {
      q.variable = "n";
      q.domain = range(0, 8);
      q.prompt = "Which n makes the loop run exactly once?";
      P([
        set("total", low),
        repeat(N, [set("total", X("+", S, step))]),
        ret(S),
      ]);
      q.qualify = (n) => n === 1;
      q.why = `REPEAT n TIMES executes its update once when n is 1, changing ${low} to ${low + step}.`;
    }
    if (shape === "string-end") {
      q.variable = "index";
      q.env = { text: pick(["CAT", "LOOP", "HELLO"]) };
      q.domain = range(0, 9);
      q.docs =
        "CHAR(text, index) uses one-based positions; an out-of-range position produces ERROR.";
      q.prompt = "Which index is just after the last character?";
      P([ret(X("CHAR", T, I))]);
      q.qualify = (x) => x === q.env.text.length + 1;
      q.why = `The last position is ${q.env.text.length}, so ${q.env.text.length + 1} is the first position beyond the text.`;
    }
    q.evidence = () => q.why;
  }
  if (mode === "branches") {
    q.prompt = "Which input executes ELSE?";
    let condition = cmp("≥"),
      wanted;
    if (shape === "else") {
      P([iff(condition, [ret("Pass")], [ret("Retry")])]);
      wanted = (r) => r.result === "Retry";
    }
    if (shape === "middle" || shape === "missing-test") {
      P([
        iff(
          cmp("<", low),
          [ret("low")],
          [iff(cmp("≤", high), [ret("middle")], [ret("high")])],
        ),
      ]);
      q.prompt =
        shape === "middle"
          ? "Which input takes FALSE, then TRUE?"
          : `Tests ${low - 1} and ${high + 1} cover two paths. Which input covers the missing path?`;
      wanted = (r) => r.result === "middle";
    }
    if (shape === "nested-true" || shape === "nested-false") {
      P([
        iff(
          cmp("≥", low),
          [iff(X("=", X("MOD", A, 2), 0), [ret("even")], [ret("odd")])],
          [ret("small")],
        ),
      ]);
      q.prompt =
        shape === "nested-true"
          ? "Which input takes TRUE at both conditions?"
          : "Which input takes TRUE, then FALSE?";
      wanted = (r) => r.result === (shape === "nested-true" ? "even" : "odd");
    }
    if (shape === "compound") {
      condition = X("AND", cmp("≥", low), cmp("≤", high));
      P([iff(condition, [ret("inside")], [ret("outside")])]);
      wanted = (r) => r.result === "outside";
    }
    if (shape === "negated") {
      condition = X("NOT", cmp("=", k));
      P([iff(condition, [ret("different")], [ret("same")])]);
      wanted = (r) => r.result === "same";
    }
    if (shape === "fall-through") {
      P([
        iff(cmp("<", low), [ret("low")]),
        iff(cmp(">", high), [ret("high")]),
        ret("middle"),
      ]);
      q.prompt = "Which input reaches the final RETURN?";
      wanted = (r) => r.result === "middle";
    }
    q.qualify = (x) => wanted(run(q, x));
    q.evidence = (input) => {
      const r = run(q, input);
      return `For ${input}, ${r.decisions.map((d) => `${d.condition} is ${format(d.yes)}`).join(" and ")}; execution returns ${format(r.result)}.`;
    };
  }
  if (mode === "edge") {
    q.variable = "values";
    q.domain = [
      [],
      [0],
      [target],
      [1, 2],
      [target, 1],
      [1, target],
      [2, 3, 4],
      [target, target],
      [1, 1, 1],
    ];
    if (shape === "empty-sum") {
      P(sumProgram());
      q.prompt =
        "Which test checks returning the initial total without adding an element?";
      q.qualify = (v) => v.length === 0;
      q.why =
        "An empty list causes zero loop visits, so the initialized total 0 is returned.";
    }
    if (shape === "empty-product") {
      P([set("total", 1), each([set("total", X("*", S, item))]), ret(S)]);
      q.prompt =
        "Which test checks the product when multiplication never runs?";
      q.qualify = (v) => v.length === 0;
      q.why =
        "The empty list causes zero multiplications, leaving the product identity 1.";
    }
    if (shape === "guard-first") {
      P([iff(X("=", length, 0), [ret("none")]), ret(get(1))]);
      q.prompt = "Which test checks that the guard prevents an invalid access?";
      q.qualify = (v) => v.length === 0;
      q.why =
        "The empty list triggers the early return before values[1] can be accessed.";
    }
    if (shape === "singleton") {
      P([
        set("total", 0),
        set("index", 1),
        repeat(X("-", length, 1), [
          set("total", X("+", S, X("-", get(X("+", I, 1)), get(I)))),
          set("index", X("+", I, 1)),
        ]),
        ret(S),
      ]);
      q.requirement = "Input list must be nonempty.";
      q.domain = q.domain.filter((v) => v.length);
      q.prompt = "Which valid test has an element but no neighboring pair?";
      q.qualify = (v) => v.length === 1;
      q.why =
        "A single-element list is valid but has no adjacent pair, so the loop runs zero times.";
    }
    if (shape === "missing-search") {
      q.env = { target };
      P([
        set("count", 0),
        each([iff(X("=", item, V("target")), [ret(true)])]),
        ret(false),
      ]);
      q.prompt = "Which nonempty test checks the no-match result?";
      q.qualify = (v) => v.length > 0 && !v.includes(target);
      q.domain = [
        [],
        [target],
        [target, 1],
        [1, target],
        [1, 1],
        [target, target],
        [0],
        [-1, 0],
      ];
      q.why = `A nonempty list without ${target} reaches the final FALSE instead of returning at a match.`;
    }
    if (shape === "last-access") {
      P([ret(get(length))]);
      q.prompt = "Which test makes the same element both first and last?";
      q.qualify = (v) => v.length === 1;
      q.domain = q.domain.filter((v) => v.length);
      q.why =
        "With one element, the last position LENGTH(values) is also position 1.";
    }
    if (shape === "zero-loop") {
      q.variable = "n";
      q.domain = range(0, 8);
      P([set("total", 5), repeat(N, [set("total", X("+", S, step))]), ret(S)]);
      q.prompt =
        "Which test checks whether the starting value survives with no updates?";
      q.qualify = (n) => n === 0;
      q.why =
        "With n = 0, the loop body does not execute and the initial 5 is returned.";
    }
    if (shape === "empty-text") {
      q.variable = "text";
      q.domain = ["", "A", "AB", "CAT", "LOOP"];
      q.docs =
        "LENGTH(text) counts characters; CONCAT(a, b) joins text in that order.";
      P([
        iff(X("=", X("LENGTH", T), 0), [ret("none")]),
        ret(X("CONCAT", "Hi ", T)),
      ]);
      q.prompt =
        "Which test checks the special case instead of adding a greeting?";
      q.qualify = (t) => t.length === 0;
      q.why =
        'Empty text satisfies the guard and returns "none" before CONCAT runs.';
    }
    if (shape === "short-text") {
      q.variable = "text";
      q.domain = ["A", "B", "AB", "CAT", "LOOP", "TEAM"];
      q.docs =
        "CHAR(text, index) uses one-based positions; invalid positions produce ERROR.";
      P([ret(X("CHAR", T, 2))]);
      q.prompt = "Which nonempty test exposes an invalid character access?";
      q.qualify = (t) => t.length === 1;
      q.why =
        "A one-character input has no second position, so CHAR(text, 2) produces ERROR.";
    }
    if (shape === "precondition") {
      q.variable = "index";
      q.env = { values: [3, 6, 9] };
      q.domain = range(-1, 6);
      P([ret(get(I))]);
      q.requirement = "Valid tests require 1 ≤ index ≤ LENGTH(values).";
      q.prompt = "Which test violates the stated precondition?";
      q.qualify = (i) => i < 1 || i > q.env.values.length;
      q.why =
        "The stated precondition permits only one-based positions 1 through 3.";
    }
    q.evidence = (input) => `Test ${format(input)} checks this case. ${q.why}`;
  }
  return q;
}
export function run(q, input, program = q.program) {
  return execute(program, { ...q.env, [q.variable]: input });
}
function unique(values) {
  return [...new Map(values.map((v) => [JSON.stringify(v), v])).values()];
}
export function generateTestCase(mode = "mixed", forced) {
  if (mode === "mixed") mode = pick(Object.keys(testModes));
  if (!testModes[mode]) throw Error("Unknown testing mode");
  const structure = forced || pick(definitions[mode]);
  if (!definitions[mode].includes(structure)) throw Error("Unknown structure");
  const q = build(mode, structure);
  let values;
  if (mode === "predict") {
    values = q.answers;
    q.qualify = (v) => same(v, q.answer);
  } else {
    const yes = q.domain.filter(q.qualify),
      no = q.domain.filter((v) => !q.qualify(v));
    if (!yes.length || unique(no).length < 3)
      throw Error(
        `Invalid choice pool ${mode}/${structure}: ${yes.length} correct, ${no.length} distractors`,
      );
    const anchors = [...q.requirement.matchAll(/-?\d+/g)].map((m) =>
      Number(m[0]),
    );
    // Boolean/list keys still use the whole valid domain; favor nearby numeric tests
    // so distractors practice endpoints instead of relying on remote outliers.
    if (typeof yes[0] === "number" && anchors.length) {
      const nearby = yes.filter((v) =>
        anchors.some((a) => Math.abs(v - a) <= 2),
      );
      q.answer = pick(nearby.length ? nearby : yes);
    } else q.answer = pick(yes);
    const wrong = unique(no);
    if (typeof q.answer === "number")
      wrong.sort((a, b) => Math.abs(a - q.answer) - Math.abs(b - q.answer));
    const pool =
      typeof q.answer === "number"
        ? wrong.slice(0, Math.min(6, wrong.length))
        : wrong;
    values = [q.answer, ...shuffle(pool).slice(0, 3)];
  }
  const ids = shuffle(["choice-a", "choice-b", "choice-c", "choice-d"]);
  q.options = shuffle(unique(values)).map((value, i) => ({
    id: ids[i],
    value,
    label: format(value),
  }));
  q.correctId = q.options.find((o) => same(o.value, q.answer)).id;
  q.game = "test-case-builder";
  q.title = "Test Case Builder";
  q.topic = "quick." + mode;
  q.topicTitle = testModes[mode];
  q.kind = "test";
  q.fields = [];
  q.example = { choice: q.correctId };
  q.inputText = mode === "predict" ? `${q.variable} ← ${format(q.input)}` : "";
  q.code = Object.entries(q.env)
    .map(([name, value]) => `${name} ← ${format(value)}`)
    .concat(codeFor(q.program))
    .join("\n");
  q.context = [q.requirement, q.docs, q.inputText, q.code]
    .filter(Boolean)
    .join("\n");
  q.explanation = q.evidence(q.answer);
  return q;
}
export function evaluateTestCase(q, response) {
  const choice = q.options.find((o) => o.id === response?.choice),
    correct = choice?.id === q.correctId;
  let detail = q.evidence(q.answer);
  if (choice && !correct) {
    if (q.mode === "bugs") {
      const expected = run(q, choice.value, q.intended).result,
        actual = run(q, choice.value).result;
      detail =
        `Your input ${choice.label} returns ${format(actual)}, matching the required ${format(expected)}; it does not expose the bug. ` +
        q.evidence(q.answer);
    } else if (q.mode === "predict")
      detail =
        `You chose ${choice.label}; the code produces ${format(q.answer)}. ` +
        q.evidence(q.answer);
    else
      detail =
        `${choice.label} does not meet the requested test goal. ` + detail;
  }
  return { correct, details: detail };
}
export function createTestDeck() {
  const bags = new Map();
  let lastMode = "",
    lastStructure = "";
  const draw = (key, all) => {
    if (!bags.get(key)?.length) {
      let list = shuffle(all);
      if (
        list.at(-1) === (key === "mixed" ? lastMode : lastStructure) &&
        list.length > 1
      )
        [list[0], list[list.length - 1]] = [list.at(-1), list[0]];
      bags.set(key, list);
    }
    return bags.get(key).pop();
  };
  return {
    next(mode = "mixed") {
      const selected =
        mode === "mixed" ? draw("mixed", Object.keys(testModes)) : mode;
      const shape = draw(selected, definitions[selected]);
      lastMode = selected;
      lastStructure = shape;
      return generateTestCase(selected, shape);
    },
  };
}
