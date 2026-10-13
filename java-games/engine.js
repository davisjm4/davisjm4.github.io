import {
  int,
  pick,
  shuffle,
} from "../csp-games/engine.js?v=platform-expansion-v2";
export const games = {
  "variable-lab": {
    name: "Variable Lab",
    icon: "x",
    description:
      "Identify declaration components, values, and types with selectable Java pieces.",
    concepts: "Types · Declarations · Assignment · Conversions",
    modes: { identify: "Identification", assemble: "Assemble Declaration" },
  },
  "debugger-lab": {
    name: "Debugger Lab",
    icon: "⌕",
    description:
      "Locate one defect and choose a repair. Check both decisions together.",
    concepts: "Syntax · Runtime · Logic · Tricky diagnostics",
    modes: {
      syntax: "Syntax Errors",
      runtime: "Runtime Errors",
      logic: "Logic Errors",
      tricky: "Tricky Errors",
    },
  },
  "loop-lab": {
    name: "Loop Lab",
    icon: "↻",
    description:
      "Inspect loop controls, count executions, and explore nested-loop output.",
    concepts: "for · while · Nested loops · Boundaries",
    modes: {
      structure: "Structure",
      execution: "Execution",
      nested: "Nested Loops",
    },
  },
  "array-lab": {
    name: "Array Lab",
    icon: "[ ]",
    description:
      "Drag values through Java arrays and ArrayLists, including traversal and 2D grids.",
    concepts: "Zero-based indices · Arrays · ArrayLists · Traversal",
    modes: {
      collections: "Manipulate Collections",
      traversal: "Traversal & Algorithms",
      grid: "2D Arrays",
      index: "Indices & Size",
    },
  },
};
export const leaf = (id, text) => ({ id, text: String(text) }),
  region = (id, ...children) => ({ id, children });
export function source(n) {
  return typeof n === "string"
    ? n
    : n.text !== undefined
      ? n.text
      : n.children.map(source).join("");
}
export function nodes(root) {
  const out = [];
  function walk(n, parent = null) {
    if (typeof n === "string") return;
    out.push({ ...n, parent, text: source(n) });
    for (const c of n.children || []) walk(c, n.id);
  }
  walk(root);
  return out;
}
const choices = (answer, wrong) =>
  shuffle([...new Set([answer, ...wrong].map(String))]);
const variableNames = [
  "score",
  "itemPrice",
  "livesRemaining",
  "totalPoints",
  "isReady",
  "sectionCode",
  "studentLabel",
];
export function generate(game, mode = "mixed", forced) {
  const selected =
    mode === "mixed" ? pick(Object.keys(games[game].modes)) : mode;
  if (!games[game].modes[selected]) throw Error("Unknown mode");
  const q = generators[game](selected, forced);
  q.game = game;
  q.mode = selected;
  q.code = q.root ? source(q.root) : q.code;
  return q;
}
const hints = {
  "variable-lab": [
    "Separate the type, identifier, operator, and stored data.",
    "A declaration introduces a variable; initialization supplies its first value. Later assignment changes that value.",
    "Check literal syntax and type compatibility. A widening conversion can preserve an int in a double; casting a double to int discards its fractional part.",
  ],
  "debugger-lab": [
    "Compare the intended behavior with the code. A diagnostic can point to a consequence rather than the original mistake.",
    "Check punctuation, scope, types, and valid input ranges. Valid Java can still violate a requirement.",
    "Consider the earliest defect that explains the symptom. Test the proposed correction against the stated behavior, not just whether it compiles.",
  ],
  "loop-lab": [
    "Separate initialization, condition, update, and the repeated body.",
    "The condition is tested before each body execution. The final update may produce a value never used in the body.",
    "For nested loops, the inner loop restarts for each outer iteration. Count executions over all outer iterations; respect the scope of the counter.",
  ],
  "array-lab": [
    "Trace the operations in order; later indices refer to the updated collection.",
    "Java indices start at zero. An array keeps its length; an ArrayList can add, insert, and remove elements.",
    "Consider every visited index and whether an operation replaces, inserts, or removes an element. Check final length, order, and duplicate values.",
  ],
};
export function hint(q, attempt) {
  return hints[q.game][Math.min(2, attempt - 1)];
}
export function assess(q, r) {
  if (q.kind === "debug")
    return (
      (q.locations || [q.location]).includes(r.location) && r.fix === q.fix
    );
  if (q.kind === "collection")
    return JSON.stringify(r.values) === JSON.stringify(q.answer);
  if (q.kind === "multi")
    return (
      JSON.stringify([...new Set(r.ids || [])].sort()) ===
      JSON.stringify([...q.answerIds].sort())
    );
  if (q.kind === "assemble")
    return Object.entries(q.answer).every(([k, v]) => r[k] === v);
  if (q.kind === "select") return r.id === q.answerId;
  return String(r.answer) === String(q.answer);
}
export function solution(q) {
  if (q.kind === "debug") return { location: q.location, fix: q.fix };
  if (q.kind === "collection") return { values: q.answer };
  if (q.kind === "multi") return { ids: q.answerIds };
  if (q.kind === "assemble") return q.answer;
  if (q.kind === "select") return { id: q.answerId };
  return { answer: String(q.answer) };
}
function variable(mode, forced) {
  const type = pick(["int", "double", "boolean", "char", "String"]),
    name = pick(variableNames),
    n = int(2, 25),
    value =
      type === "int"
        ? String(n)
        : type === "double"
          ? (n + 0.25).toFixed(2)
          : type === "boolean"
            ? pick(["true", "false"])
            : type === "char"
              ? `'${pick(["A", "B", "C", "D"])}'`
              : `"${pick(["Alex", "Blair", "Blue", "Ready"])}"`;
  const declaration = region(
    "declaration",
    leaf("type", type),
    " ",
    leaf("name", name),
    " ",
    leaf("operator", "="),
    " ",
    leaf("value", value),
    ";",
  );
  const q = {
    kind: "select",
    root: region("snippet", declaration),
    topic: "declaration",
    explanation:
      "The type specifies what kind of data a variable can store. The identifier names it, = assigns a value, and the literal represents the supplied data.",
  };
  if (mode === "assemble") {
    q.kind = "assemble";
    q.prompt = `Use ${type} to declare a variable named ${name}, initialized to ${value}. Choose pieces; no typing is required.`;
    q.fields = [
      {
        id: "type",
        label: "Type",
        choices: shuffle(["int", "double", "boolean", "char", "String"]),
      },
      {
        id: "name",
        label: "Variable name",
        choices: choices(
          name,
          variableNames.filter((x) => x !== name).slice(0, 3),
        ),
      },
      {
        id: "operator",
        label: "Operator",
        choices: shuffle(["=", "==", "!="]),
      },
      {
        id: "value",
        label: "Literal",
        choices: choices(value, [String(n + 2), `"${n}"`, `'Z'`]),
      },
    ];
    q.answer = { type, name, operator: "=", value };
    q.code = "Choose pieces to represent the requested declaration.";
    delete q.root;
    q.topic = "assemble-" + type;
    return q;
  }
  const variant =
    forced ||
    pick([
      "type",
      "name",
      "operator",
      "value",
      "declaration",
      "initialization",
      "assignment",
      "stored",
      "conversion",
      "compatibility",
    ]);
  q.topic = variant;
  if (
    [
      "type",
      "name",
      "operator",
      "value",
      "declaration",
      "initialization",
    ].includes(variant)
  ) {
    q.answerId = variant === "initialization" ? "declaration" : variant;
    q.prompt = {
      type: "Select the data type.",
      name: "Select the variable name.",
      operator: "Select the assignment operator.",
      value: "Select the literal value.",
      declaration: "Select the entire declaration, including its initializer.",
      initialization:
        "Select the entire declaration that initializes the variable.",
    }[variant];
  }
  if (variant === "assignment") {
    q.root = region(
      "snippet",
      region("declaration", type + " " + name + ";"),
      "\n",
      region(
        "assignment",
        leaf("assigned-name", name),
        " ",
        leaf("assignment-operator", "="),
        " ",
        leaf("assigned-value", value),
        ";",
      ),
    );
    q.answerId = "assignment";
    q.prompt =
      "Select the later assignment statement, rather than the declaration.";
  }
  if (variant === "stored") {
    const next = n + int(1, 5);
    q.root = region(
      "snippet",
      region("declaration", `int ${name} = ${n};`),
      "\n",
      region("reassignment", `${name} = ${next};`),
    );
    q.kind = "value";
    q.answer = next;
    q.choices = choices(next, [n, next - 1, next + 1]);
    q.prompt = "Select the value stored after the reassignment.";
    q.explanation =
      "Reassignment replaces the previous value; it does not create another variable.";
  }
  if (variant === "conversion") {
    const v = pick([-1, 1]) * (n + 0.75),
      answer = Math.trunc(v);
    q.root = region(
      "snippet",
      region("double-declaration", `double precise = ${v};`),
      "\n",
      region("cast", `int whole = (int) precise;`),
    );
    q.kind = "value";
    q.answer = answer;
    q.choices = choices(answer, [v, Math.floor(v), answer + 1, answer - 1]);
    q.prompt =
      "Select the value stored in whole after the explicit conversion.";
    q.explanation =
      "An explicit double-to-int cast truncates toward zero. It is a narrowing conversion and can discard information.";
  }
  if (variant === "compatibility") {
    q.root = region(
      "snippet",
      region("widen", `int count = ${n};`),
      "\n",
      region("assignment", `double amount = count;`),
    );
    q.kind = "value";
    q.answer = "Valid widening conversion";
    q.choices = shuffle([
      "Valid widening conversion",
      "Compile-time type error",
      "Runtime exception",
    ]);
    q.prompt = "Classify the assignment to amount.";
    q.explanation =
      "An int can be widened to double without an explicit cast. The reverse direction generally requires an explicit narrowing conversion.";
  }
  if (variant === "stored") q.resultVariable = name;
  if (variant === "conversion") q.resultVariable = "whole";
  q.compilerSource = `public class Practice { public static void main(String[] args) { ${q.kind === "select" ? source(q.root) : q.code || source(q.root)} } }`;
  return q;
}
export function loopValues({ start, bound, step, op }) {
  const condition = (x) =>
    op === "<"
      ? x < bound
      : op === "<="
        ? x <= bound
        : op === ">"
          ? x > bound
          : op === ">="
            ? x >= bound
            : x !== bound;
  const values = [];
  let value = start;
  while (condition(value)) {
    if (values.length > 200) throw Error("Nonterminating generated loop");
    values.push(value);
    value += step;
  }
  return { values, after: value };
}
function loop(mode, forced) {
  const start = int(1, 4),
    size = int(2, 5),
    direction = pick([-1, 1]),
    step = direction * int(1, 3),
    op = pick(direction === 1 ? ["<", "<=", "!="] : [">", ">=", "!="]),
    bound = start + size * step;
  const trace = loopValues({ start, bound, step, op }),
    external = pick([true, false]),
    useWhile = pick([true, false]),
    variable = pick(["i", "index", "counter"]);
  const init = `${external || useWhile ? "" : "int "}${variable} = ${start}`,
    condition = `${variable} ${op} ${bound}`,
    update = `${variable} ${step > 0 ? "+=" : "-="} ${Math.abs(step)}`;
  const body = region("body", `System.out.println(${variable});`),
    control = useWhile
      ? region(
          "loop",
          "while (",
          leaf("condition", condition),
          ") {\n    ",
          body,
          "\n    ",
          leaf("update", update),
          ";\n}",
        )
      : region(
          "loop",
          "for (",
          leaf("initialization", init),
          "; ",
          leaf("condition", condition),
          "; ",
          leaf("update", update),
          ") {\n    ",
          body,
          "\n}",
        );
  let root = region(
    "snippet",
    ...(external || useWhile
      ? [
          region(
            useWhile ? "initialization" : "counter-declaration",
            `int ${variable} = ${start};`,
          ),
          "\n",
        ]
      : []),
    control,
  );
  const frames = [
    {
      line: "initialization",
      variables: { [variable]: start },
      output: "Initialize counter",
    },
  ];
  for (const v of trace.values) {
    frames.push(
      {
        line: "condition",
        variables: { [variable]: v },
        output: "Condition is true",
      },
      { line: "body", variables: { [variable]: v }, output: "Print " + v },
      {
        line: "update",
        variables: { [variable]: v + step },
        output: "Update counter",
      },
    );
  }
  frames.push({
    line: "condition",
    variables: { [variable]: trace.after },
    output: "Condition is false; loop stops",
  });
  const q = {
    kind: "select",
    root,
    topic: "loop-components",
    trace: frames,
    explanation:
      "Initialization sets the first value. The condition controls whether the body runs; the update changes the counter after an iteration. A variable declared in a for header is outside scope after that loop.",
  };
  if (mode === "structure") {
    const part =
      forced || pick(["initialization", "condition", "update", "body", "loop"]);
    q.answerId = part;
    q.topic = part;
    q.prompt = {
      initialization: useWhile
        ? "Select the initialization before the while loop."
        : "Select the initialization in the for header.",
      condition: "Select the loop condition.",
      update: "Select the update statement.",
      body: "Select the statement repeated in the body.",
      loop: "Select the entire loop.",
    }[part];
  }
  if (mode === "execution") {
    const ask =
      forced ||
      pick([
        "start",
        "step",
        "last",
        "count",
        ...(external || useWhile ? ["after"] : []),
      ]);
    const answer = {
      start,
      step: Math.abs(step),
      last: trace.values.at(-1),
      count: trace.values.length,
      after: trace.after,
    }[ask];
    q.kind = "value";
    q.answer = answer;
    q.choices = choices(answer, [
      start,
      trace.after,
      trace.values.length,
      answer + 1,
      answer - 1,
    ]);
    q.topic = ask;
    q.prompt = {
      start: "Select the starting counter value.",
      step: "Select the amount the counter changes each time (magnitude).",
      last: "Select the last value printed by the loop.",
      count: "Select the number of body executions.",
      after:
        "Select the counter value after termination. This counter was declared outside the loop and remains in scope.",
    }[ask];
    if (ask === "after" && !external && !useWhile)
      throw Error("Counter out of scope");
  }
  if (mode === "nested") {
    const rows = int(2, 4),
      columns = int(2, 4),
      triangular = pick([true, false]),
      rootLoop = region(
        "outer",
        "for (int row = 0; row < ",
        leaf("outer-bound", rows),
        "; row++) {\n    ",
        region(
          "inner",
          `for (int col = 0; col < ${triangular ? "row + 1" : columns}; col++) {\n        `,
          region("nested-body", 'System.out.println(row + "," + col);'),
          "\n    }",
        ),
        "\n}",
      );
    q.root = region("snippet", rootLoop);
    const pairs = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < (triangular ? r + 1 : columns); c++)
        pairs.push([r, c]);
    q.trace = [];
    for (let r = 0; r < rows; r++) {
      q.trace.push(
        {
          line: "outer",
          variables: { row: r },
          output: "Begin outer iteration",
        },
        {
          line: "inner",
          variables: { row: r, col: 0 },
          output: "Restart inner loop",
        },
      );
      for (const [row, col] of pairs.filter((p) => p[0] === r))
        q.trace.push(
          {
            line: "inner",
            variables: { row, col },
            output: "Inner condition is true",
          },
          {
            line: "nested-body",
            variables: { row, col },
            output: `Print ${row},${col}`,
          },
        );
      q.trace.push({
        line: "inner",
        variables: { row: r, col: triangular ? r + 1 : columns },
        output: "Inner loop terminates",
      });
    }
    q.trace.push({
      line: "outer",
      variables: { row: rows },
      output: "Outer loop terminates",
    });
    const ask =
      forced || pick(["outer", "inner", "total", "outer-count", "grid"]);
    q.topic = "nested-" + ask;
    if (ask === "outer" || ask === "inner") {
      q.kind = "select";
      q.answerId = ask;
      q.prompt = `Select the ${ask} loop, including its body.`;
    } else if (ask === "grid") {
      q.kind = "multi";
      q.cells = Array.from({ length: rows + 1 }, (_, r) =>
        Array.from({ length: Math.max(rows, columns) + 1 }, (_, c) => ({
          id: `${r},${c}`,
          label: `${r}, ${c}`,
        })),
      ).flat();
      q.answerIds = pairs.map(([r, c]) => `${r},${c}`);
      q.prompt =
        "Select every row,col pair printed. The grid includes candidate pairs that may not execute.";
    } else {
      q.kind = "value";
      q.answer = ask === "total" ? pairs.length : rows;
      q.choices = choices(q.answer, [
        rows,
        columns,
        rows * columns,
        pairs.length + 1,
        pairs.length - 1,
      ]);
      q.prompt =
        ask === "total"
          ? "Select the total number of inner-body executions."
          : "Select the number of outer-loop executions.";
    }
    q.explanation =
      "The inner loop restarts for each outer-loop value. Count the inner-body executions for every row; an inner bound depending on row need not give a rectangular pattern.";
  }
  q.compilerSource = `public class Practice { public static void main(String[] args) { ${source(q.root)} } }`;
  return q;
}
function array(mode, forced) {
  const start = Array.from({ length: int(3, 5) }, () => int(1, 9)),
    name = pick(["values", "scores", "numbers"]);
  let q = {
    kind: "collection",
    initial: start,
    bank: Array.from({ length: 21 }, (_, i) => i),
    fixed: false,
    topic: "arraylist",
    explanation:
      "Evaluate every operation in order. Java indices start at zero; set replaces, add inserts or appends, and remove shifts later ArrayList elements left.",
  };
  if (mode === "collections") {
    const type = forced || pick(["array", "arraylist"]);
    q.fixed = type === "array";
    q.topic = type;
    if (type === "array") {
      const index = int(0, start.length - 1),
        value = int(10, 20);
      q.answer = [...start];
      q.answer[index] = value;
      q.code = `int[] ${name} = {${start.join(", ")}};\n${name}[${index}] = ${value};`;
    } else {
      const ops = [],
        answer = [...start];
      for (let i = 0; i < 3; i++) {
        const type = pick(["add", "insert", "remove", "set"]),
          index = int(0, type === "insert" ? answer.length : answer.length - 1),
          value = int(1, 15);
        if (type === "add") {
          answer.push(value);
          ops.push(`${name}.add(${value});`);
        }
        if (type === "insert") {
          answer.splice(index, 0, value);
          ops.push(`${name}.add(${index}, ${value});`);
        }
        if (type === "remove") {
          answer.splice(index, 1);
          ops.push(`${name}.remove(${index});`);
        }
        if (type === "set") {
          answer[index] = value;
          ops.push(`${name}.set(${index}, ${value});`);
        }
      }
      q.answer = answer;
      q.code = `ArrayList<Integer> ${name} = new ArrayList<>(Arrays.asList(${start.join(", ")}));\n${ops.join("\n")}`;
    }
    q.prompt =
      "Manipulate the working collection to show the final state. Do not assume its final length.";
  }
  if (mode === "traversal") {
    const kind =
        forced ||
        pick([
          "replace",
          "visited",
          "count",
          "sum",
          "search",
          "minimum",
          "maximum",
        ]),
      threshold = int(3, 7),
      list = pick([true, false]);
    q.topic = (list ? "arraylist-" : "array-") + kind;
    const declaration = list
      ? `ArrayList<Integer> ${name} = new ArrayList<>(Arrays.asList(${start.join(", ")}));`
      : `int[] ${name} = {${start.join(", ")}};`;
    const length = list ? `${name}.size()` : `${name}.length`,
      access = (i) => (list ? `${name}.get(${i})` : `${name}[${i}]`);
    if (kind === "replace") {
      const step = pick([1, 2]);
      q.fixed = !list;
      q.answer = start.map((v, i) => (i % step === 0 ? v + 2 : v));
      q.code = `${declaration}\nfor (int i = 0; i < ${length}; i += ${step}) {\n    ${list ? `${name}.set(i, ${access("i")} + 2);` : `${name}[i] += 2;`}\n}`;
      q.prompt = "Manipulate the array to show its values after traversal.";
    }
    if (kind === "visited") {
      q.kind = "multi";
      const first = int(0, 1);
      q.cells = start.map((v, i) => ({
        id: String(i),
        label: `index ${i}: ${v}`,
      }));
      q.answerIds = start
        .map((_, i) => i)
        .filter((i) => i >= first && i % 2 === first)
        .map(String);
      q.code = `${declaration}\nfor (int i = ${first}; i < ${length}; i += 2) {\n    System.out.println(${access("i")});\n}`;
      q.prompt = "Select the elements visited by this loop.";
    }
    if (["count", "sum", "search"].includes(kind)) {
      const answer =
        kind === "count"
          ? start.filter((v) => v >= threshold).length
          : kind === "sum"
            ? start.reduce((s, v) => s + v, 0)
            : start.indexOf(threshold);
      q.kind = "value";
      q.answer = answer;
      q.choices = choices(answer, [
        0,
        start.length,
        start.length + 1,
        answer + 1,
        answer - 1,
      ]);
      q.code = `${declaration}\n${kind === "search" ? `int found = -1;\nfor (int i = 0; i < ${length}; i++) {\n    if (${access("i")} == ${threshold} && found == -1) found = i;\n}` : `int result = 0;\nfor (int value : ${name}) {\n    ${kind === "count" ? `if (value >= ${threshold}) result++;` : "result += value;"}\n}`}`;
      q.prompt =
        kind === "search"
          ? `Select the first index containing ${threshold}, or -1 if absent.`
          : kind === "count"
            ? `Select the number of elements at least ${threshold}.`
            : "Select the accumulated total.";
    }
    if (["minimum", "maximum"].includes(kind)) {
      q.kind = "value";
      q.answer = kind === "minimum" ? Math.min(...start) : Math.max(...start);
      q.choices = choices(q.answer, [
        0,
        q.answer + 1,
        q.answer - 1,
        start.reduce((a, b) => a + b, 0),
      ]);
      q.code = `${declaration}\nint result = ${access("0")};\nfor (int value : ${name}) {\n    if (value ${kind === "minimum" ? "<" : ">"} result) result = value;\n}`;
      q.prompt = `Select the ${kind} found by this traversal.`;
    }
  }
  if (mode === "grid") {
    const rows = int(2, 3),
      columns = int(2, 3),
      grid = Array.from({ length: rows }, () =>
        Array.from({ length: columns }, () => int(0, 8)),
      ),
      row = int(0, rows - 1),
      add = int(1, 3);
    q.initial = grid.flat();
    q.columns = columns;
    q.fixed = true;
    q.answer = grid
      .map((r, i) => r.map((v) => (i === row ? v + add : v)))
      .flat();
    q.code = `int[][] grid = {${grid.map((r) => "{" + r.join(", ") + "}").join(", ")}};\nfor (int col = 0; col < grid[${row}].length; col++) {\n    grid[${row}][col] += ${add};\n}`;
    q.prompt =
      "Replace values in the working grid to show the result. Row and column indices start at zero.";
    q.topic = "2d-row";
  }
  if (mode === "index") {
    const type = pick(["array", "arraylist"]),
      ask = pick(["element", "size", "invalid"]);
    q.kind = "value";
    q.topic = type + "-" + ask;
    const pos = int(0, start.length - 1);
    q.code =
      type === "array"
        ? `int[] ${name} = {${start.join(", ")}};`
        : `ArrayList<Integer> ${name} = new ArrayList<>(Arrays.asList(${start.join(", ")}));`;
    q.prompt =
      ask === "element"
        ? `Select the element at index ${pos}.`
        : ask === "size"
          ? `Select the value of ${name}.${type === "array" ? "length" : "size()"}.`
          : "Select the invalid index.";
    q.answer =
      ask === "element"
        ? start[pos]
        : ask === "size"
          ? start.length
          : start.length;
    q.choices =
      ask === "invalid"
        ? shuffle([String(start.length), "0", String(start.length - 1)])
        : choices(q.answer, [
            0,
            start.length - 1,
            start.length + 1,
            q.answer + 1,
          ]);
  }
  if (mode === "collections" && !forced && Math.random() < 0.3) {
    const names = shuffle(["Alex", "Blair", "Casey", "Drew", "Emery", "Finn"]),
      initial = names.slice(0, 3),
      inserted = names[3],
      position = int(0, 3),
      remove = int(0, 3);
    const answer = [...initial];
    answer.splice(position, 0, inserted);
    answer.splice(remove, 1);
    q.initial = initial;
    q.bank = ["Alex", "Blair", "Casey", "Drew", "Emery", "Finn"];
    q.fixed = false;
    q.answer = answer;
    q.topic = "arraylist-strings";
    q.code = `ArrayList<String> ${name} = new ArrayList<>(Arrays.asList(${initial.map((v) => JSON.stringify(v)).join(", ")}));\n${name}.add(${position}, "${inserted}");\n${name}.remove(${remove});`;
  }
  q.collectionName = name;
  if (!q.prompt) throw Error("Unknown array variant");
  q.compilerSource = `import java.util.*; public class Practice { public static void main(String[] args) { ${q.code}\n${q.kind === "collection" ? `System.out.println(${mode === "grid" ? "Arrays.deepToString(grid)" : q.fixed ? `Arrays.toString(${name})` : name});` : ""} } }`;
  return q;
}
// Defect templates carry their original fault location and corrected full source.
// Diagnostics are added only from the real development compiler verification file.
export const debugTemplates = [
  [
    "nested-if-else",
    "logic",
    (n) => [
      "Print Minor for anyone below 18; for adults, print Enter only with a ticket.",
      'if (age >= 18) if (hasTicket) System.out.println("Enter"); else System.out.println("Minor");',
      'if (age >= 18) { if (hasTicket) System.out.println("Enter"); } else System.out.println("Minor");',
      [],
      "nested-if",
    ],
  ],
  [
    "arraylist-remove-overload",
    "logic",
    (n) => [
      "Remove the Integer value 2, not the element at index 2.",
      "values.remove(2);",
      "values.remove(Integer.valueOf(2));",
      ["System.out.println(values);"],
      "overload",
    ],
  ],
  [
    "missing-semicolon",
    "syntax",
    (n) => [
      "Print the whole-number value.",
      `int value = ${n}`,
      `int value = ${n};`,
      ["System.out.println(value);"],
    ],
  ],
  [
    "missing-opening-brace",
    "syntax",
    (n) => [
      "Give the method a body.",
      "public static void main(String[] args)",
      "public static void main(String[] args) {",
      [`System.out.println(${n});`, "}"],
      "header",
    ],
  ],
  [
    "missing-closing-brace",
    "syntax",
    (n) => ["Close the class after the method.", "}", "}", [], "missing-close"],
  ],
  [
    "extra-opening-brace",
    "syntax",
    (n) => [
      "Keep one opening brace in the method header.",
      "public static void main(String[] args) {{",
      "public static void main(String[] args) {",
      [`System.out.println(${n});`, "}"],
      "header",
    ],
  ],
  [
    "extra-closing-brace",
    "syntax",
    (n) => [
      "Keep the final class brace. End the method with a single closing brace.",
      "}}",
      "}",
      [],
      "extra-close",
    ],
  ],
  [
    "missing-parenthesis",
    "syntax",
    (n) => [
      "Print a value using balanced call parentheses.",
      `System.out.println(${n};`,
      `System.out.println(${n});`,
      [],
    ],
  ],
  [
    "undeclared-variable",
    "syntax",
    (n) => [
      "Declare count before using it.",
      `count = ${n};`,
      `int count = ${n};`,
      [],
    ],
  ],
  [
    "duplicate-declaration",
    "syntax",
    (n) => [
      "Update the existing local value.",
      `int value = ${n};`,
      `value = ${n};`,
      ["System.out.println(value);"],
      "duplicate",
    ],
  ],
  [
    "scope",
    "syntax",
    (n) => [
      "Print a value that remains in scope.",
      `System.out.println(value);`,
      `System.out.println(${n});`,
      [],
      "scope",
    ],
  ],
  [
    "string-to-int",
    "syntax",
    (n) => [
      "Store a whole number in an int.",
      `int value = "${n}";`,
      `int value = ${n};`,
      [],
    ],
  ],
  [
    "double-to-int",
    "syntax",
    (n) => [
      "Preserve the fractional price.",
      `int price = ${n}.75;`,
      `double price = ${n}.75;`,
      [],
    ],
  ],
  [
    "invalid-cast",
    "syntax",
    (n) => [
      "Store a numeric literal as a double, not a cast from String.",
      `double value = (double) "${n}";`,
      `double value = ${n}.0;`,
      [],
    ],
  ],
  [
    "char-literal",
    "syntax",
    (n) => [
      "Store a single character in a char.",
      'char letter = "A";',
      "char letter = 'A';",
      [],
    ],
  ],
  [
    "boolean-literal",
    "syntax",
    (n) => [
      "Store a Boolean truth value.",
      "boolean ready = 1;",
      "boolean ready = true;",
      [],
    ],
  ],
  [
    "argument-count",
    "syntax",
    (n) => [
      "Call add with its two required inputs.",
      `System.out.println(add(${n}));`,
      `System.out.println(add(${n}, 2));`,
      [],
      "add-method",
    ],
  ],
  [
    "argument-order",
    "syntax",
    (n) => [
      "Supply a String label, then an int count.",
      `show(${n}, "Count");`,
      `show("Count", ${n});`,
      [],
      "show-method",
    ],
  ],
  [
    "argument-type",
    "syntax",
    (n) => [
      "Supply two int arguments to add.",
      `System.out.println(add("${n}", 2));`,
      `System.out.println(add(${n}, 2));`,
      [],
      "add-method",
    ],
  ],
  [
    "missing-return",
    "syntax",
    (n) => [
      "Return the computed int from getValue.",
      `public static int getValue() { int value = ${n}; }`,
      `public static int getValue() { int value = ${n}; return value; }`,
      [],
      "class-member",
    ],
  ],
  [
    "return-type",
    "syntax",
    (n) => [
      "Return an int from getValue.",
      `public static int getValue() { return "${n}"; }`,
      `public static int getValue() { return ${n}; }`,
      [],
      "class-member",
    ],
  ],
  [
    "constructor-name",
    "syntax",
    (n) => [
      "Define a constructor with the class name.",
      "public Student() { }",
      "public Practice() { }",
      [],
      "class-member",
    ],
  ],
  [
    "instance-static",
    "syntax",
    (n) => [
      "Use a shared class counter from static main.",
      "private int count = 1;",
      "private static int count = 1;",
      [],
      "static-field",
    ],
  ],
  [
    "constructor-semicolon",
    "tricky",
    (n) => [
      "Initialize name using the constructor argument.",
      "public Practice(String studentName);",
      "public Practice(String studentName)",
      [],
      "constructor",
    ],
  ],
  [
    "method-semicolon",
    "tricky",
    (n) => [
      "Give greet a method body.",
      "public static void greet();",
      "public static void greet()",
      [],
      "method",
    ],
  ],
  [
    "division-zero",
    "runtime",
    (n) => [
      "Avoid division by zero; skip the calculation for invalid input.",
      `System.out.println(${n} / divisor);`,
      `if (divisor != 0) System.out.println(${n} / divisor);`,
      [],
      "zero",
    ],
  ],
  [
    "remainder-zero",
    "runtime",
    (n) => [
      "Avoid remainder by zero; skip the calculation for invalid input.",
      `System.out.println(${n} % divisor);`,
      `if (divisor != 0) System.out.println(${n} % divisor);`,
      [],
      "zero",
    ],
  ],
  [
    "array-index",
    "runtime",
    (n) => [
      "Access the last array element.",
      "System.out.println(values[values.length]);",
      "System.out.println(values[values.length - 1]);",
      [],
      "array",
    ],
  ],
  [
    "arraylist-index",
    "runtime",
    (n) => [
      "Access the last ArrayList element.",
      "System.out.println(values.get(values.size()));",
      "System.out.println(values.get(values.size() - 1));",
      [],
      "arraylist",
    ],
  ],
  [
    "substring-range",
    "runtime",
    (n) => [
      "Extract the full String from start to its exclusive end.",
      "System.out.println(text.substring(0, text.length() + 1));",
      "System.out.println(text.substring(0, text.length()));",
      [],
      "text",
    ],
  ],
  [
    "null-reference",
    "runtime",
    (n) => [
      "Avoid calling methods on a null reference.",
      "System.out.println(text.length());",
      "if (text != null) System.out.println(text.length());",
      [],
      "null",
    ],
  ],
  [
    "numeric-division",
    "logic",
    (n) => [
      "Compute a fractional half without truncation.",
      `double result = ${2 * n + 1} / 2;`,
      `double result = ${2 * n + 1} / 2.0;`,
      ["System.out.println(result);"],
    ],
  ],
  [
    "precedence",
    "logic",
    (n) => [
      "Compute the average of the two values.",
      `double result = ${n} + ${n + 2} / 2.0;`,
      `double result = (${n} + ${n + 2}) / 2.0;`,
      ["System.out.println(result);"],
    ],
  ],
  [
    "overflow",
    "logic",
    (n) => [
      "Compute twice the large value exactly using long arithmetic.",
      "long doubled = value * 2;",
      "long doubled = (long) value * 2;",
      ["System.out.println(doubled);"],
      "overflow",
    ],
  ],
  [
    "floating-point",
    "logic",
    (n) => [
      "Check whether the floating result is within 0.000001 of the target.",
      "System.out.println(result == 0.3);",
      "System.out.println(Math.abs(result - 0.3) < 0.000001);",
      [],
      "floating",
    ],
  ],
  [
    "lossy-conversion",
    "logic",
    (n) => [
      "Keep the fractional measurement.",
      `double measurement = (int) ${n}.75;`,
      `double measurement = ${n}.75;`,
      ["System.out.println(measurement);"],
    ],
  ],
  [
    "string-comparison",
    "logic",
    (n) => [
      "Compare String contents, not object identity.",
      "System.out.println(first == second);",
      "System.out.println(first.equals(second));",
      [],
      "strings",
    ],
  ],
  [
    "off-by-one",
    "logic",
    (n) => [
      `Print every integer from 0 through ${n}, inclusive.`,
      `for (int i = 0; i < ${n}; i++) System.out.println(i);`,
      `for (int i = 0; i <= ${n}; i++) System.out.println(i);`,
      [],
    ],
  ],
  [
    "if-semicolon",
    "logic",
    (n) => [
      "Print Accepted only when score is positive.",
      "if (score > 0);",
      "if (score > 0)",
      ['{ System.out.println("Accepted"); }'],
      "score",
    ],
  ],
  [
    "loop-semicolon",
    "logic",
    (n) => [
      `Print the counter on each of ${n} iterations.`,
      `for (i = 0; i < ${n}; i++);`,
      `for (i = 0; i < ${n}; i++)`,
      ["{ System.out.println(i); }"],
      "counter",
    ],
  ],
  [
    "infinite-loop",
    "logic",
    (n) => [
      `Print values starting at 0 and stop before ${n}.`,
      `while (i < ${n}) { System.out.println(i); }`,
      `while (i < ${n}) { System.out.println(i); i++; }`,
      [],
      "counter",
    ],
  ],
  [
    "loop-array-bound",
    "runtime",
    (n) => [
      "Visit each array element without stepping past its end.",
      "for (int i = 0; i <= values.length; i++) System.out.println(values[i]);",
      "for (int i = 0; i < values.length; i++) System.out.println(values[i]);",
      [],
      "array",
    ],
  ],
  [
    "for-each-assignment",
    "logic",
    (n) => [
      "Increase every stored array element by one.",
      "for (int value : values) value++;",
      "for (int i = 0; i < values.length; i++) values[i]++;",
      ["System.out.println(Arrays.toString(values));"],
      "array",
    ],
  ],
];
export function debugQuestion(mode, forced, n = int(2, 9)) {
  const entry = forced
    ? debugTemplates.find((t) => t[0] === forced)
    : pick(
        debugTemplates.filter((t) =>
          mode === "tricky"
            ? [
                "constructor-semicolon",
                "method-semicolon",
                "extra-opening-brace",
                "extra-closing-brace",
                "instance-static",
              ].includes(t[0])
            : t[1] === mode || (mode === "syntax" && t[1] === "tricky"),
        ),
      );
  if (!entry) throw Error("Unknown defect");
  const [variant, category, make] = entry,
    [requirement, bad, good, after, context] = make(n);
  let lines = ["import java.util.*;", "public class Practice {"],
    prefix = [],
    suffix = [],
    fault;
  if (context === "header") {
    lines.push(bad, ...after, "}");
    fault = 2;
  } else if (context === "missing-close") {
    lines.push(
      "    public static void main(String[] args) {",
      `        System.out.println(${n});`,
      "    }",
    );
    fault = "after4";
  } else if (context === "extra-close") {
    lines.push(
      "    public static void main(String[] args) {",
      `        System.out.println(${n});`,
      "    }}",
      "}",
    );
    fault = 4;
  } else if (["constructor", "method", "class-member"].includes(context)) {
    if (context === "constructor") prefix = ["    private String name;"];
    suffix =
      context === "constructor"
        ? ["    {", "        name = studentName;", "    }"]
        : context === "method"
          ? ["    {", `        System.out.println(${n});`, "    }"]
          : [];
    lines.push(...prefix, "    " + bad, ...suffix, "}");
    fault = 2 + prefix.length;
  } else {
    if (context === "static-field") lines.push("    " + bad);
    if (context === "add-method")
      lines.push(
        "    public static int add(int first, int second) { return first + second; }",
      );
    if (context === "show-method")
      lines.push(
        "    public static void show(String label, int count) { System.out.println(label + count); }",
      );
    lines.push("    public static void main(String[] args) {");
    prefix =
      context === "nested-if"
        ? [`        int age = ${n + 14};`, "        boolean hasTicket = false;"]
        : context === "overload"
          ? [
              "        ArrayList<Integer> values = new ArrayList<>(Arrays.asList(4, 2, 7));",
            ]
          : context === "duplicate"
            ? [`        int value = ${n - 1};`]
            : context === "scope"
              ? [`        if (true) { int value = ${n}; }`]
              : context === "zero"
                ? ["        int divisor = 0;"]
                : context === "array"
                  ? [`        int[] values = {${n}, ${n + 1}, ${n + 2}};`]
                  : context === "arraylist"
                    ? [
                        `        ArrayList<Integer> values = new ArrayList<>(Arrays.asList(${n}, ${n + 1}));`,
                      ]
                    : context === "text"
                      ? ['        String text = "Hello";']
                      : context === "null"
                        ? ["        String text = null;"]
                        : context === "overflow"
                          ? ["        int value = 1500000000;"]
                          : context === "floating"
                            ? ["        double result = 0.1 + 0.2;"]
                            : context === "strings"
                              ? [
                                  '        String first = new String("Hi");',
                                  '        String second = new String("Hi");',
                                ]
                              : context === "score"
                                ? ["        int score = 0;"]
                                : context === "counter"
                                  ? ["        int i = 0;"]
                                  : [];
    lines.push(...prefix);
    if (context === "static-field") {
      fault = 2;
      lines.push("        System.out.println(count);");
    } else {
      fault = lines.length;
      lines.push("        " + bad, ...after.map((x) => "        " + x));
    }
    lines.push("    }", "}");
  }
  const code = lines.join("\n");
  let fixed;
  if (context === "missing-close") fixed = code + "\n}";
  else {
    const corrected = [...lines];
    corrected[typeof fault === "number" ? fault : 0] = corrected[
      typeof fault === "number" ? fault : 0
    ].replace(bad, good);
    if (context === "extra-close") corrected[4] = "    }";
    fixed = corrected.join("\n");
  }
  const location = typeof fault === "number" ? "line" + fault : fault;
  const plausible = {
    "double-to-int": [`int price = (int) ${n}.75;`, `int price = ${n};`],
    "string-to-int": [`int value = (int) "${n}";`, `String value = "${n}";`],
    "char-literal": ['char letter = "A";', "String letter = 'A';"],
    "constructor-semicolon": [
      "public void Practice(String studentName)",
      "public Practice();",
    ],
    "method-semicolon": [
      "public static void greet();",
      "public static greet()",
    ],
    "numeric-division": [
      `double result = (double) (${2 * n + 1} / 2);`,
      `int result = ${2 * n + 1} / 2;`,
    ],
    precedence: [
      `double result = ${n} + ${n + 2} / 2.0;`,
      `double result = (${n} + ${n + 2}) * 2.0;`,
    ],
    overflow: [
      "long doubled = (long) (value * 2);",
      "int doubled = value * 2;",
    ],
    "floating-point": [
      "System.out.println(result == 0.3);",
      "System.out.println(Math.abs(result - 0.3) > 0.000001);",
    ],
    "string-comparison": [
      "System.out.println(first == second);",
      "System.out.println(first.length() == second.length());",
    ],
    "array-index": [
      "System.out.println(values[values.length]);",
      "System.out.println(values[values.length + 1]);",
    ],
    "arraylist-index": [
      "System.out.println(values.get(values.size()));",
      "System.out.println(values.get(values.size() + 1));",
    ],
    "substring-range": [
      "System.out.println(text.substring(0, text.length() + 1));",
      "System.out.println(text.substring(1, text.length()));",
    ],
    "off-by-one": [
      `for (int i = 0; i < ${n}; i++) System.out.println(i);`,
      `for (int i = 0; i <= ${n + 1}; i++) System.out.println(i);`,
    ],
    "infinite-loop": [
      `while (i < ${n}) { System.out.println(i); i--; }`,
      `while (i < ${n}) { System.out.println(i); }`,
    ],
  };
  return {
    locations: [
      location,
      ...(["missing-opening-brace", "missing-semicolon"].includes(variant)
        ? ["after" + fault]
        : []),
    ],
    kind: "debug",
    code,
    brokenSource: code,
    fixedSource: fixed,
    location,
    fix: good,
    fixes: choices(
      good,
      plausible[variant] || [
        category === "logic"
          ? "Keep the code unchanged."
          : "Suppress the error without changing the program.",
        category === "syntax"
          ? "Change the output text instead of the faulty statement."
          : "Change an unrelated variable name.",
      ],
    ),
    topic: variant,
    variant,
    category,
    prompt:
      requirement +
      " Select the actual faulty line (or insertion boundary), then the repair. Submit both together.",
    explanation: `This is a ${["tricky", "syntax"].includes(category) ? "compile-time" : category} defect. ${requirement} The repair must address the original mistake and preserve the intended behavior.`,
    symptom:
      category === "logic"
        ? "Failing behavior under the stated requirement; this is valid Java, not a compiler error."
        : category === "runtime"
          ? "The shown input triggers a runtime exception."
          : "This program does not compile. A compiler location may be a consequence of an earlier syntax defect.",
  };
}
function debuggerGame(mode, forced) {
  return debugQuestion(mode, forced);
}
const generators = {
  "variable-lab": variable,
  "debugger-lab": debuggerGame,
  "loop-lab": loop,
  "array-lab": array,
};
