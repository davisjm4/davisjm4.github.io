import { int, pick, shuffle } from "./engine.js";
export const categories = [
  "procedures",
  "selection",
  "iteration",
  "variables",
  "lists",
];
export const categoryLabels = {
  procedures: "Procedures",
  selection: "Selection",
  iteration: "Iteration",
  variables: "Variables & Expressions",
  lists: "Lists",
};
// A reusable annotated syntax tree: IDs identify source components, never parsed guesses.
// Each leaf or region has a role; question metadata references explicit node IDs.
const leaf = (id, text, role) => ({ id, text: String(text), role });
const region = (id, role, ...children) => ({ id, role, children });
const number = (id, n) => leaf(id, n, "value");
const variable = (id, v) => leaf(id, v, "variable");
const statement = (id, ...parts) => region(id, "statement", ...parts);
export function source(node) {
  return typeof node === "string"
    ? node
    : node.text !== undefined
      ? node.text
      : node.children.map(source).join("");
}
export function components(root) {
  let result = [];
  function walk(n, parent = null) {
    if (typeof n === "string") return;
    result.push({ ...n, parent, text: source(n) });
    for (let c of n.children || []) walk(c, n.id);
  }
  walk(root);
  return result;
}
export function assess(q, response) {
  if (q.interaction === "count") return response === q.answer;
  let actual = [...new Set(response)].sort(),
    expected = [...q.answerIds].sort();
  return (
    actual.length === expected.length &&
    actual.every((id, i) => id === expected[i])
  );
}
function finish(category, variant, root, prompt, ids, explanation, extra = {}) {
  return {
    version: 1,
    category,
    variant,
    root,
    code: source(root),
    prompt,
    interaction: "select",
    multiple: ids.length > 1,
    answerIds: ids,
    explanation,
    ...extra,
  };
}
const procedureVariants = [
  "definition",
  "name",
  "parameter",
  "parameters",
  "call",
  "argument",
  "arguments",
  "match",
  "return-value",
  "return-instruction",
  "same-procedure",
];
const selectionVariants = [
  "statement",
  "condition",
  "true-body",
  "false-body",
  "compound",
  "boolean-condition",
];
const iterationVariants = [
  "statement",
  "body",
  "repeat-count",
  "until-condition",
  "until-unknown",
  "item",
  "traversal-count",
];
const variableVariants = [
  "variable",
  "value",
  "assignment",
  "comparison",
  "boolean-expression",
  "boolean-value",
  "boolean-result",
];
const listVariants = [
  "name",
  "list",
  "index",
  "insert-value",
  "element",
  "append",
  "insert",
  "remove",
  "location",
];
export const variants = {
  procedures: procedureVariants,
  selection: selectionVariants,
  iteration: iterationVariants,
  variables: variableVariants,
  lists: listVariants,
};
function procedures(kind) {
  let name = pick([
      "calculateScore",
      "combinePoints",
      "addBonus",
      "totalPoints",
    ]),
    params = shuffle(["points", "bonus", "extra", "credits"]).slice(0, 2),
    a = int(1, 15),
    b = int(16, 30),
    returned = int(1, 50),
    constant = kind === "return-value",
    body = constant
      ? number("returned", returned)
      : region(
          "sum",
          "arithmetic-expression",
          variable("use1", params[0]),
          " + ",
          variable("use2", params[1]),
        );
  const def = region(
    "definition",
    "procedure-definition",
    leaf("procedure-keyword", "PROCEDURE", "keyword"),
    " ",
    leaf("name", name, "procedure-name"),
    "(",
    leaf("p1", params[0], "parameter"),
    ", ",
    leaf("p2", params[1], "parameter"),
    ")\n{\n    ",
    statement(
      "return-statement",
      leaf("return", "RETURN", "return-instruction"),
      "(",
      body,
      ")",
    ),
    "\n}",
  );
  const call = region(
    "call",
    "procedure-call",
    leaf("call-name", name, "procedure-name"),
    "(",
    leaf("a1", a, "argument"),
    ", ",
    leaf("a2", b, "argument"),
    ")",
  );
  let root = region(
    "snippet",
    "snippet",
    def,
    "\n",
    statement("assignment", variable("result", "result"), " ← ", call),
    "\n",
    statement(
      "display",
      leaf("display-keyword", "DISPLAY", "display-instruction"),
      "(",
      variable("result-use", "result"),
      ")",
    ),
  );
  let map = {
    definition: [
      "Select the entire procedure definition.",
      ["definition"],
      "A procedure definition names a reusable group of instructions. Its header and body belong to the definition.",
    ],
    name: [
      "Select the procedure name in the definition header.",
      ["name"],
      `${name} names the procedure; the names inside its header parentheses are parameters.`,
    ],
    parameter: [
      `Select the parameter named ${params[0]} in the definition header.`,
      ["p1"],
      "A parameter is a named input in a procedure definition. It receives a value when the procedure is called.",
    ],
    parameters: [
      "Select both parameter names in the definition header.",
      ["p1", "p2"],
      "Parameters are the input names in the definition, not the values supplied by a call.",
    ],
    call: [
      "Select the complete procedure call that supplies input values.",
      ["call"],
      "A procedure call invokes the defined procedure and supplies arguments. The assignment around the call stores its result.",
    ],
    argument: [
      "Select the first argument in the procedure call.",
      ["a1"],
      `${a} is an argument: a value supplied in the call, received by parameter ${params[0]}.`,
    ],
    arguments: [
      "Select both arguments in the procedure call.",
      ["a1", "a2"],
      "Arguments are the values supplied by the call. Their positions match the parameters in the definition.",
    ],
    match: [
      `Select the argument whose value is passed to parameter ${params[1]}.`,
      ["a2"],
      `The second argument, ${b}, supplies the second parameter, ${params[1]}. Matching uses position, not the names of the values.`,
    ],
    "return-value": [
      "Select the literal value returned by this procedure.",
      ["returned"],
      `RETURN(${returned}) sends the value ${returned} back to the calling code. DISPLAY shows output rather than returning it.`,
    ],
    "return-instruction": [
      "Select the instruction keyword that sends a value back to the caller.",
      ["return"],
      "RETURN sends a value back to the caller. DISPLAY produces visible output; it does not return a value to the caller.",
    ],
  };
  if (kind === "same-procedure") {
    root = region(
      "snippet",
      "snippet",
      statement(
        "first",
        variable("first-var", "first"),
        " ← ",
        region(
          "call1",
          "procedure-call",
          leaf("name1", name, "procedure-name"),
          "(",
          leaf("first-arg", a, "argument"),
          ", ",
          leaf("second-arg", b, "argument"),
          ")",
        ),
      ),
      "\n",
      statement(
        "second",
        variable("second-var", "second"),
        " ← ",
        region(
          "call2",
          "procedure-call",
          leaf("name2", name, "procedure-name"),
          "(",
          leaf("third-arg", b + 1, "argument"),
          ", ",
          leaf("fourth-arg", a + 1, "argument"),
          ")",
        ),
      ),
      "\n",
      statement("show", "DISPLAY(", variable("first-use", "first"), ")"),
    );
    return finish(
      "procedures",
      kind,
      root,
      "Select the procedure names that show both calls invoke the same procedure.",
      ["name1", "name2"],
      `Both calls name ${name}. The arguments differ; the procedure being invoked is the same.`,
    );
  }
  let [prompt, ids, explanation] = map[kind];
  return finish("procedures", kind, root, prompt, ids, explanation, {
    facts: {
      name,
      parameters: params,
      arguments: [a, b],
      returned: constant ? returned : null,
    },
  });
}
function selection(kind) {
  let v = pick(["score", "points", "credits"]),
    limit = int(50, 90),
    op = pick(["≥", ">", "≤", "<"]),
    hasElse = kind === "false-body" || Math.random() < 0.5,
    compound = kind === "compound" || Math.random() < 0.45;
  let compare = region(
    compound ? "comparison" : "condition",
    compound ? "comparison" : "boolean-expression",
    variable("condition-variable", v),
    " ",
    leaf("operator", op, "comparison-operator"),
    " ",
    number("limit", limit),
  );
  let bool = pick(["submitted", "hasPermit", "ready"]),
    logic = pick(["AND", "OR", "NOT"]);
  let condition = compound
    ? logic === "NOT"
      ? region(
          "condition",
          "boolean-expression",
          leaf("not", "NOT", "boolean-operator"),
          " (",
          compare,
          ")",
        )
      : region(
          "condition",
          "boolean-expression",
          "(",
          compare,
          ") ",
          leaf("logic", logic, "boolean-operator"),
          " ",
          variable("boolean-variable", bool),
        )
    : compare;
  let truth = statement(
      "true-body",
      "DISPLAY(",
      leaf("true-value", '"Complete"', "value"),
      ")",
    ),
    falsehood = statement(
      "false-body",
      "DISPLAY(",
      leaf("false-value", '"Try again"', "value"),
      ")",
    );
  let structure = region(
    "selection",
    "selection-statement",
    leaf("if", "IF", "keyword"),
    " (",
    condition,
    ")\n{\n    ",
    truth,
    "\n}",
    ...(hasElse
      ? [" ", leaf("else", "ELSE", "keyword"), "\n{\n    ", falsehood, "\n}"]
      : []),
  );
  let root = region("snippet", "snippet", structure);
  let map = {
    statement: [
      "Select the entire selection (conditional) statement.",
      ["selection"],
      "The entire IF structure is the selection statement. Its Boolean condition alone is an expression, not the whole statement.",
    ],
    condition: [
      "Select the entire Boolean expression used as the condition.",
      ["condition"],
      "The condition evaluates to TRUE or FALSE. The surrounding IF structure uses that result to choose whether a body executes.",
    ],
    "true-body": [
      "Select the statement executed when the condition is TRUE.",
      ["true-body"],
      "The body immediately after IF runs when its condition is TRUE.",
    ],
    "false-body": [
      "Select the statement executed when the condition is FALSE.",
      ["false-body"],
      "The ELSE body runs when the IF condition is FALSE.",
    ],
    compound: [
      "Select the complete compound Boolean expression.",
      ["condition"],
      `${logic} combines or negates Boolean expressions. The whole condition produces one Boolean value.`,
    ],
    "boolean-condition": [
      "Select the portion that must evaluate to TRUE or FALSE.",
      ["condition"],
      "The Boolean condition supplies a TRUE/FALSE value to IF; the entire IF structure represents selection.",
    ],
  };
  let [prompt, ids, explanation] = map[kind];
  return finish("selection", kind, root, prompt, ids, explanation, {
    facts: { hasElse, compound, operator: logic },
  });
}
function iteration(kind) {
  let n = int(2, 12),
    name = pick(["items", "scores", "readings"]),
    item = pick(["item", "score", "reading"]),
    values = Array.from({ length: int(3, 6) }, () => int(1, 30)),
    body = statement("body", "DISPLAY(", variable("shown", item), ")"),
    structure,
    root,
    extra = {},
    prompt,
    ids,
    explanation;
  if (["item", "traversal-count"].includes(kind)) {
    structure = region(
      "iteration",
      "iteration-statement",
      leaf("for-each", "FOR EACH", "keyword"),
      " ",
      leaf("item", item, "traversal-item"),
      " IN ",
      leaf("list-use", name, "list-name"),
      "\n{\n    ",
      body,
      "\n}",
    );
    root = region(
      "snippet",
      "snippet",
      statement(
        "list-setup",
        leaf("list-name", name, "list-name"),
        " ← [",
        values.map(String).join(", "),
        "]",
      ),
      "\n",
      structure,
    );
    if (kind === "item") {
      prompt = "Select the traversal item variable in the FOR EACH header.";
      ids = ["item"];
      explanation = `${item} is assigned each list element in turn. It is the item variable, not an index.`;
    } else {
      prompt = "How many times does this FOR EACH body execute?";
      ids = [];
      extra = {
        interaction: "count",
        answer: values.length,
        facts: { values },
      };
      explanation = `FOR EACH executes once per element. This list has ${values.length} elements.`;
    }
  } else if (["until-condition", "until-unknown"].includes(kind)) {
    let stop = region(
      "condition",
      "boolean-expression",
      variable("input-use", "response"),
      " = ",
      leaf("stop-value", '"stop"', "value"),
    );
    body = statement(
      "body",
      variable("input", "response"),
      " ← ",
      region("input-call", "procedure-call", "INPUT()"),
    );
    structure = region(
      "iteration",
      "iteration-statement",
      leaf("repeat", "REPEAT UNTIL", "keyword"),
      " (",
      stop,
      ")\n{\n    ",
      body,
      "\n}",
    );
    root = region(
      "snippet",
      "snippet",
      statement("initial", 'response ← ""'),
      "\n",
      structure,
    );
    if (kind === "until-condition") {
      prompt = "Select the stopping condition.";
      ids = ["condition"];
      explanation =
        "REPEAT UNTIL stops when this condition becomes TRUE. It continues while the condition is FALSE.";
    } else {
      prompt = "How many times will this loop execute?";
      ids = [];
      extra = {
        interaction: "count",
        answer: "unknown",
        allowUnknown: true,
        facts: { inputDependent: true },
      };
      explanation =
        'The user may enter "stop" on the first input or after many inputs. The exact count cannot be determined from this snippet; it may also never stop.';
    }
  } else {
    body = statement("body", "DISPLAY(", number("output", int(1, 20)), ")");
    structure = region(
      "iteration",
      "iteration-statement",
      leaf("repeat", "REPEAT", "keyword"),
      " ",
      leaf("count", n, "loop-count"),
      " ",
      leaf("times", "TIMES", "keyword"),
      "\n{\n    ",
      body,
      "\n}",
    );
    root = region("snippet", "snippet", structure);
    if (kind === "repeat-count") {
      prompt = "How many times does this loop body execute?";
      ids = [];
      extra = { interaction: "count", answer: n, facts: { repeatCount: n } };
      explanation = `REPEAT ${n} TIMES executes its body exactly ${n} times.`;
    } else if (kind === "body") {
      prompt = "Select the statement being repeated.";
      ids = ["body"];
      explanation =
        "The statement inside the loop body is repeated. The loop header controls repetition.";
    } else {
      prompt = "Select the entire iteration statement.";
      ids = ["iteration"];
      explanation =
        "The loop header and its body together form an iteration statement: instructions that repeat.";
    }
  }
  return finish("iteration", kind, root, prompt, ids, explanation, extra);
}
function variables(kind) {
  let name = pick(["score", "points", "count", "credits"]),
    value = int(2, 20),
    threshold = int(1, 25),
    op = pick(["=", "≠", ">", "<", "≥", "≤"]),
    bool = pick(["TRUE", "FALSE"]);
  let assignment = region(
    "assignment",
    "assignment-statement",
    variable("variable", name),
    " ",
    leaf("assign", "←", "assignment-operator"),
    " ",
    number("value", value),
  );
  let comparison = region(
    "comparison",
    "boolean-expression",
    variable("compare-variable", name),
    " ",
    leaf("compare", op, "comparison-operator"),
    " ",
    number("threshold", threshold),
  );
  let boolAssign = statement(
    "bool-assignment",
    variable("boolean-name", "ready"),
    " ← ",
    leaf("boolean-value", bool, "boolean-value"),
  );
  let root = region(
    "snippet",
    "snippet",
    assignment,
    "\n",
    boolAssign,
    "\n",
    statement(
      "compare-assignment",
      variable("output-variable", "eligible"),
      " ← ",
      comparison,
    ),
  );
  let map = {
    variable: [
      "Select the variable receiving a numeric value on the first line.",
      ["variable"],
      `${name} is the variable name. ${value} is the value assigned to it.`,
    ],
    value: [
      "Select the numeric value assigned on the first line.",
      ["value"],
      `${value} is a value. The name ${name} identifies the variable storing it.`,
    ],
    assignment: [
      "Select the entire numeric assignment statement on the first line.",
      ["assignment"],
      "An assignment statement uses ← to store a value in a variable. It does not compare the two sides.",
    ],
    comparison: [
      "Select the complete comparison expression.",
      ["comparison"],
      `${op} compares values and produces TRUE or FALSE. The arrow ← performs assignment instead.`,
    ],
    "boolean-expression": [
      "Select the expression that compares two numeric values.",
      ["comparison"],
      "A comparison is a Boolean expression. It produces a Boolean value, even though its inputs are numbers.",
    ],
    "boolean-value": [
      "Select the literal Boolean value.",
      ["boolean-value"],
      `${bool} is a Boolean value. A Boolean expression is evaluated to produce a Boolean value.`,
    ],
    "boolean-result": [
      "Select the expression whose result is a Boolean value, rather than a numeric value.",
      ["comparison"],
      "This comparison evaluates to TRUE or FALSE, not to a number.",
    ],
  };
  let [prompt, ids, explanation] = map[kind];
  return finish("variables", kind, root, prompt, ids, explanation, {
    facts: { name, value, threshold, op },
  });
}
function lists(kind) {
  let name = pick(["scores", "items", "readings", "numbers"]),
    values = shuffle(Array.from({ length: 20 }, (_, i) => i + 1)).slice(
      0,
      int(4, 6),
    ),
    index = int(1, values.length),
    value = int(31, 50);
  let listValue = region(
    "list",
    "list-value",
    "[",
    ...values.flatMap((v, i) => [
      ...(i ? [", "] : []),
      leaf("element" + (i + 1), v, "element"),
    ]),
    "]",
  );
  let declaration = statement(
      "declaration",
      leaf("list-name", name, "list-name"),
      " ← ",
      listValue,
    ),
    operation =
      kind === "remove" ? "REMOVE" : kind === "append" ? "APPEND" : "INSERT";
  let call = region(
    "operation",
    "list-operation",
    leaf("operation-name", operation, "operation-name"),
    "(",
    leaf("operation-list", name, "list-name"),
    ", ",
    ...(operation === "APPEND"
      ? [leaf("inserted", value, "value")]
      : [
          leaf("index", index, "index"),
          ...(operation === "INSERT"
            ? [", ", leaf("inserted", value, "value")]
            : []),
        ]),
    ")",
  );
  let root = region(
    "snippet",
    "snippet",
    declaration,
    "\n",
    call,
    "\n",
    statement(
      "display",
      "DISPLAY(",
      leaf("display-name", name, "list-name"),
      ")",
    ),
  );
  let map = {
    name: [
      "Select the list name on the first line.",
      ["list-name"],
      `${name} names the list. The bracketed values are its elements.`,
    ],
    list: [
      "Select the entire list value on the first line.",
      ["list"],
      "A list groups ordered elements in one value. Its name is separate from the bracketed list value.",
    ],
    index: [
      "Select the index argument in the list operation.",
      ["index"],
      `The index ${index} specifies a position. AP CSP indices start at 1.`,
    ],
    "insert-value": [
      "Select the value argument being inserted.",
      ["inserted"],
      `${value} is the value being inserted. The index ${index} gives its location.`,
    ],
    element: [
      `Select the element at index ${index} in the starting list.`,
      ["element" + index],
      `Index ${index} refers to the ${index === 1 ? "first" : "position-" + index} element, ${values[index - 1]}. Counting starts at 1.`,
    ],
    append: [
      "Select the complete operation that adds an element at the end.",
      ["operation"],
      "APPEND adds the supplied value to the end of the list.",
    ],
    insert: [
      "Select the complete operation that adds an element at a specified position.",
      ["operation"],
      "INSERT adds a value at an index and shifts later elements right.",
    ],
    remove: [
      "Select the complete operation that removes an element.",
      ["operation"],
      "REMOVE uses an index to choose which element is removed.",
    ],
    location: [
      "Select the argument that determines the location of this operation.",
      ["index"],
      `The index ${index} is the position, not the value inserted. AP CSP list indexing starts at 1.`,
    ],
  };
  let [prompt, ids, explanation] = map[kind];
  return finish("lists", kind, root, prompt, ids, explanation, {
    facts: { values, index, value, operation },
  });
}
const generators = { procedures, selection, iteration, variables, lists };
export function generateConcept(mode = "mixed", forcedVariant) {
  let category = mode === "mixed" ? pick(categories) : mode;
  if (!generators[category]) throw Error("Unknown concept category");
  let variant = forcedVariant || pick(variants[category]);
  if (!variants[category].includes(variant))
    throw Error("Unknown challenge variant");
  return generators[category](variant);
}
export function answerText(q) {
  return q.interaction === "count"
    ? q.answer === "unknown"
      ? "Cannot be determined from the information provided"
      : String(q.answer)
    : components(q.root)
        .filter((n) => q.answerIds.includes(n.id))
        .map((n) => n.text)
        .join(" · ");
}
