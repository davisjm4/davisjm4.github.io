import { assess } from "./concepts-engine.js";
// Hints are fixed conceptual text, independent of generated names, values, and answers.
const hints = {
  definition: [
    "A definition establishes reusable instructions.",
    "A procedure definition includes both its interface and its body.",
    "Distinguish the reusable instructions being defined from a later invocation of them.",
  ],
  name: [
    "A procedure has an identifier naming reusable instructions.",
    "Input names and supplied values serve different roles from a procedure identifier.",
    "The identifier names the reusable action; its inputs describe data for that action.",
  ],
  parameter: [
    "A parameter is a named input in a procedure definition.",
    "Parameters receive the values supplied by arguments when a procedure is called.",
    "Distinguish input placeholders in a definition from supplied values in a call.",
  ],
  argument: [
    "An argument supplies an input value when a procedure is called.",
    "Parameter names describe expected inputs; arguments supply those inputs.",
    "Separate the supplied inputs from the name of the procedure and the variable storing its result.",
  ],
  match: [
    "Arguments supply values to parameters.",
    "Each supplied input corresponds to an input placeholder by position.",
    "Match the order of input placeholders in the definition with the order of supplied inputs in the call.",
  ],
  call: [
    "A call invokes reusable instructions.",
    "A definition creates a procedure; a call asks that procedure to run.",
    "Distinguish an invocation and its supplied inputs from any assignment surrounding it.",
  ],
  returnValue: [
    "Returning a value passes data back to the caller.",
    "The returned data differs from the instruction that passes it back.",
    "Separate the data being sent back from the procedure name, input values, and output display.",
  ],
  returnInstruction: [
    "Passing a result back to a caller is different from showing output.",
    "The caller can use a returned result in its own expression or assignment.",
    "Choose the instruction that supplies data back to the calling code, rather than an instruction that only shows it.",
  ],
  sameProcedure: [
    "Procedure identity depends on the reusable action being named.",
    "Different supplied inputs do not necessarily mean different procedures.",
    "Compare identifiers of the invoked actions, rather than the supplied values or variables receiving results.",
  ],
  selection: [
    "Selection uses a condition to control which instructions execute.",
    "A Boolean expression produces a truth value; selection is the structure that uses it.",
    "A selection statement includes its controlling condition and the instructions it governs, including alternatives when present.",
  ],
  boolean: [
    "A Boolean expression evaluates to TRUE or FALSE.",
    "Comparisons and combinations of Boolean conditions produce Boolean results.",
    "Distinguish the complete expression producing a truth value from a single variable, a literal value, or the structure using that result.",
  ],
  trueBody: [
    "Selection can execute instructions depending on a condition.",
    "Consider the instructions associated with the condition being satisfied.",
    "Select the governed statement itself, rather than the condition or the entire selection structure.",
  ],
  falseBody: [
    "Selection can choose an alternative when a condition is not satisfied.",
    "An alternative branch handles the condition being false.",
    "Distinguish the alternative instructions from the Boolean condition and the entire selection structure.",
  ],
  iteration: [
    "Iteration repeats instructions.",
    "The repetition structure has a control rule and a body.",
    "Distinguish the whole repetition structure from only the repeated action or only its controlling condition.",
  ],
  repeated: [
    "The loop body contains the instructions repeated during iteration.",
    "Repetition control and repeated instructions serve different roles.",
    "Choose the governed action, rather than the repetition count, condition, or entire loop.",
  ],
  loopCount: [
    "A loop count is the number of body executions, not the number of code lines.",
    "A fixed repetition rule or a known list size can establish a count; other rules depend on changing data.",
    "Use only supplied information. Distinguish fixed repetitions or known list contents from repetitions dependent on future inputs.",
  ],
  stop: [
    "A stopping condition is a Boolean expression governing when repetition ends.",
    "For a loop that continues until a condition holds, think about what becoming true means.",
    "Distinguish the condition controlling termination from the instructions changing the data and the entire loop.",
  ],
  traversal: [
    "A traversal visits elements of a collection.",
    "The traversal item variable receives an element on each iteration.",
    "Separate the item variable from the list being traversed and from a position index.",
  ],
  variable: [
    "A variable is a named location storing a value.",
    "Assignment stores a value in a variable; a name and its stored data have different roles.",
    "Distinguish the receiving identifier from the supplied literal, operator, or whole statement.",
  ],
  value: [
    "A value is data that can be stored in a variable.",
    "An assignment has a receiving name and data being stored.",
    "Distinguish the actual data from the name that stores it and the operation performing the storage.",
  ],
  assignment: [
    "Assignment stores a value in a variable.",
    "Assignment changes stored data, while comparison asks whether a relationship holds.",
    "Consider the whole storage statement, rather than just its receiving name, value, or operator.",
  ],
  booleanValue: [
    "A Boolean value is one of the two possible truth values.",
    "A literal truth value differs from an expression that computes one.",
    "Distinguish a literal value from variable names, comparisons, and complete statements.",
  ],
  listName: [
    "A list name identifies a collection.",
    "The collection identifier differs from the individual elements it stores.",
    "Distinguish the receiving identifier from bracketed contents and later uses of that identifier.",
  ],
  list: [
    "A list value is an ordered collection of elements.",
    "Individual elements belong to the collection but are not the entire list.",
    "Distinguish the complete ordered collection from its name and from any one position or element.",
  ],
  index: [
    "An index describes a position in an ordered collection.",
    "A position and the data stored or inserted at that position have different roles.",
    "List positions start at one. Distinguish a location argument from a value argument or the list identifier.",
  ],
  element: [
    "An element is one item in an ordered collection.",
    "AP CSP list positions are counted starting at one.",
    "Use the specified position in the starting collection; distinguish the item there from the index number itself.",
  ],
  append: [
    "Some list operations add data to a collection.",
    "Adding at the end differs from adding at a specified position.",
    "Compare what each operation does, including whether it needs a position argument; select the complete operation.",
  ],
  insert: [
    "Some list operations add data at a chosen position.",
    "Adding at a position shifts later elements to make room.",
    "Distinguish adding at a chosen position from adding at the end or removing an element; select the complete operation.",
  ],
  remove: [
    "Removing an element changes the collection by taking an item out.",
    "Removal uses a position to decide which element is affected.",
    "Distinguish taking an element out from adding one or accessing one; select the complete operation.",
  ],
};
const families = {
  procedures: {
    definition: "definition",
    name: "name",
    parameter: "parameter",
    parameters: "parameter",
    call: "call",
    argument: "argument",
    arguments: "argument",
    match: "match",
    "return-value": "returnValue",
    "return-instruction": "returnInstruction",
    "same-procedure": "sameProcedure",
  },
  selection: {
    statement: "selection",
    condition: "boolean",
    "true-body": "trueBody",
    "false-body": "falseBody",
    compound: "boolean",
    "boolean-condition": "boolean",
  },
  iteration: {
    statement: "iteration",
    body: "repeated",
    "repeat-count": "loopCount",
    "until-condition": "stop",
    "until-unknown": "loopCount",
    item: "traversal",
    "traversal-count": "loopCount",
  },
  variables: {
    variable: "variable",
    value: "value",
    assignment: "assignment",
    comparison: "boolean",
    "boolean-expression": "boolean",
    "boolean-value": "booleanValue",
    "boolean-result": "boolean",
  },
  lists: {
    name: "listName",
    list: "list",
    index: "index",
    "insert-value": "value",
    element: "element",
    append: "append",
    insert: "insert",
    remove: "remove",
    location: "index",
  },
};
export function conceptHint(q, wrongAttempts) {
  const family = families[q.category]?.[q.variant];
  if (!family) throw Error("Missing concept hint");
  return hints[family][Math.min(2, Math.max(0, wrongAttempts - 1))];
}
export function createConceptSession() {
  const totals = {
    attempted: 0,
    firstTry: 0,
    retry: 0,
    revealed: 0,
    streak: 0,
  };
  let round;
  function begin(question) {
    round = {
      question,
      status: "active",
      submissions: 0,
      wrong: 0,
      counted: false,
    };
    return round;
  }
  function engage() {
    if (!round.counted) {
      totals.attempted++;
      round.counted = true;
    }
  }
  function submit(response) {
    if (round.status !== "active")
      return { status: round.status, scored: false };
    engage();
    round.submissions++;
    const correct = assess(round.question, response);
    if (correct) {
      round.status = "solved";
      if (round.submissions === 1) {
        totals.firstTry++;
        totals.streak++;
      } else totals.retry++;
      return {
        status: "solved",
        correct: true,
        firstTry: round.submissions === 1,
        scored: true,
      };
    }
    round.wrong++;
    totals.streak = 0;
    return {
      status: "active",
      correct: false,
      scored: true,
      hint: conceptHint(round.question, round.wrong),
    };
  }
  function reveal() {
    if (round.status !== "active") return false;
    engage();
    round.status = "revealed";
    totals.revealed++;
    totals.streak = 0;
    return true;
  }
  return {
    totals,
    begin,
    submit,
    reveal,
    get round() {
      return round;
    },
  };
}
