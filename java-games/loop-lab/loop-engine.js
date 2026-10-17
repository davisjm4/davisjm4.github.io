const pick = (items) => items[Math.floor(Math.random() * items.length)];
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

export const familyNames = {
  iterations: "Predict iteration count",
  final: "Predict the final value",
  choose: "Choose the correct loop",
  components: "Identify loop components",
  conditional: "Predict conditional behavior",
  while: "Trace a while loop",
  nested: "Nested-loop reasoning",
  debug: "Debug a loop",
};

const uniqueChoices = (answer, distractors) => {
  const values = [...new Set([String(answer), ...distractors.map(String)])];
  if (values.length !== 4) throw Error("Loop question needs four unique choices");
  return shuffle(values);
};
const base = (family, variant, concept, code, prompt, answer, explanation, extra = {}) => ({
  game: "loop-lab", title: "Loop Lab", family, familyName: familyNames[family], variant,
  topic: `${family}.${variant}`, topicTitle: `${familyNames[family]} · ${concept}`, concept,
  code, prompt, answer: String(answer), correctAnswer: String(answer),
  explanation, ...extra,
});
const choice = (data, distractors) => ({ ...data, kind: "choice", choices: uniqueChoices(data.answer, distractors) });

function iteration() {
  const rows = [
    ["inc-exclusive", "for (int i = 2; i < 13; i += 3) {\n    System.out.println(i);\n}", "How many times does the loop execute?", 4, "i takes 2, 5, 8, and 11; 14 fails i < 13.", "for"],
    ["dec-inclusive", "for (int i = 10; i >= 4; i -= 2) {\n    total += i;\n}", "How many times does the loop execute?", 4, "i takes 10, 8, 6, and 4; the inclusive condition includes 4.", "for"],
    ["zero-start", "for (int i = 7; i < 3; i++) {\n    count++;\n}", "How many times does the loop execute?", 0, "The initial value 7 already fails i < 3, so the body never runs.", "for"],
    ["while-decrement", "int n = 17;\nwhile (n > 2) {\n    n -= 5;\n}", "How many times does the while body execute?", 3, "n is 17, 12, and 7 at the starts of the three iterations; then it becomes 2.", "while"],
    ["one-step", "for (int i = 5; i <= 5; i += 4) {\n    System.out.println(i);\n}", "How many times does the loop execute?", 1, "The condition is true once for i = 5; the update changes it to 9.", "for"],
    ["skip-step", "for (int i = 1; i <= 14; i += 4) {\n    count++;\n}", "How many times does the loop execute?", 4, "i starts at 1 and visits 1, 5, 9, and 13.", "for"],
  ];
  const [variant, code, prompt, answer, explanation, kind] = pick(rows);
  return choice(base("iterations", variant, kind === "while" ? "while loops" : "for-loop boundaries", code, prompt, answer, explanation, {trace: explanation}), [answer - 1, answer + 1, answer + 2]);
}

function finalValue() {
  const rows = [
    ["sum-range", "int total = 3;\nfor (int i = 2; i <= 5; i++) {\n    total += i;\n}", "What is the final value of total?", 17, "total starts at 3 and adds 2, 3, 4, and 5.", "accumulator"],
    ["product", "int product = 1;\nfor (int i = 2; i <= 4; i++) {\n    product *= i;\n}", "What is the final value of product?", 24, "The running product is 1 × 2 × 3 × 4 = 24.", "accumulator"],
    ["overwrite", "int last = -1;\nfor (int value = 4; value <= 10; value += 3) {\n    last = value;\n}", "What is the final value of last?", 10, "The assignment replaces last each time; the final visited value is 10.", "assignment"],
    ["count-even", "int count = 0;\nfor (int i = 1; i <= 7; i++) {\n    if (i % 2 == 0) count++;\n}", "What is the final value of count?", 3, "Only 2, 4, and 6 satisfy the even-number condition.", "condition"],
    ["continue-sum", "int total = 0;\nfor (int i = 1; i <= 6; i++) {\n    if (i == 3) continue;\n    total += i;\n}", "What is the final value of total?", 18, "continue skips 3, so the total is 1 + 2 + 4 + 5 + 6.", "continue"],
    ["break-sum", "int total = 0;\nfor (int i = 2; i <= 9; i += 2) {\n    total += i;\n    if (total >= 10) break;\n}", "What is the final value of total?", 12, "The totals are 2, 6, and 12; break runs after the third iteration.", "break"],
  ];
  const [variant, code, prompt, answer, explanation, concept] = pick(rows);
  return choice(base("final", variant, concept, code, prompt, answer, explanation, {trace: explanation}), [answer - 2, answer + 2, answer + 4]);
}

function chooseLoop() {
  const rows = [
    ["evens", "Print 2, 4, 6, and 8 in that order.", ["for (int i = 2; i <= 8; i += 2) { System.out.println(i); }", "for (int i = 0; i < 8; i += 2) { System.out.println(i); }", "for (int i = 2; i < 8; i += 2) { System.out.println(i); }", "for (int i = 2; i <= 8; i++) { System.out.println(i); }"], "for (int i = 2; i <= 8; i += 2) { System.out.println(i); }", "The loop starts at 2, includes 8, and advances by 2."],
    ["down", "Print 5, 4, 3, 2, and 1.", ["for (int i = 5; i >= 1; i--) { System.out.println(i); }", "for (int i = 5; i > 1; i--) { System.out.println(i); }", "for (int i = 1; i <= 5; i++) { System.out.println(i); }", "for (int i = 5; i >= 1; i++) { System.out.println(i); }"], "for (int i = 5; i >= 1; i--) { System.out.println(i); }", "The counter decreases and the inclusive condition prints 1."],
    ["multiples", "Print 3, 6, 9, and 12.", ["int i = 3; while (i <= 12) { System.out.println(i); i += 3; }", "int i = 0; while (i <= 12) { System.out.println(i); i += 3; }", "int i = 3; while (i < 12) { System.out.println(i); i += 3; }", "int i = 3; while (i <= 12) { System.out.println(i); i++; }"], "int i = 3; while (i <= 12) { System.out.println(i); i += 3; }", "The while loop starts at 3, includes 12, and advances by 3."],
  ];
  const [variant, prompt, choices, answer, explanation] = pick(rows);
  return base("choose", variant, "loop construction", choices.join("\n\n"), prompt, answer, explanation, {choices: shuffle(choices.map(String)), trace: explanation});
}

function components() {
  const rows = [
    ["for-update", "for (int i = 2; i < 12; i += 2) {\n    total += i;\n}", "Select the statement that updates the loop counter.", "i += 2", ["int i = 2", "i < 12", "total += i"]],
    ["for-condition", "for (int index = 1; index <= 9; index += 2) {\n    count++;\n}", "Select the condition that determines whether another iteration runs.", "index <= 9", ["int index = 1", "index += 2", "count++"]],
    ["while-init", "int steps = 0;\nwhile (steps < 4) {\n    steps++;\n}", "Select the initialization of the loop-control variable.", "int steps = 0;", ["steps < 4", "steps++", "while"]],
    ["body", "for (int i = 3; i <= 9; i += 3) {\n    total += i;\n}", "Select the statement in the loop body.", "total += i;", ["int i = 3", "i <= 9", "i += 3"]],
    ["while-condition", "int n = 18;\nwhile (n > 2) {\n    n /= 3;\n}", "Select the condition that controls the while loop.", "n > 2", ["int n = 18;", "n /= 3;", "while"]],
  ];
  const [variant, code, prompt, answer, distractors] = pick(rows);
  return base("components", variant, "initialization, condition, update, and body", code, prompt, answer, "The selected fragment is the requested part of the loop; the other fragments serve different roles.", {kind: "component", choices: shuffle([answer, ...distractors]), trace: "The header separates initialization, condition, and update; the statements between braces are the body."});
}

function conditional() {
  const rows = [
    ["odd-count", "int count = 0;\nfor (int i = 2; i <= 10; i++) {\n    if (i % 2 == 1) count++;\n}", "What is the final value of count?", 0, "No values from 2 through 10 are odd.", "odd values"],
    ["greater-sum", "int total = 0;\nfor (int i = 1; i <= 6; i++) {\n    if (i > 3) total += i;\n}", "What is the final value of total?", 15, "The condition selects 4, 5, and 6, whose sum is 15.", "selected values"],
    ["continue-even", "int count = 0;\nfor (int i = 1; i <= 8; i++) {\n    if (i % 2 != 0) continue;\n    count++;\n}", "What is the final value of count?", 4, "continue skips odd values; four even values reach count++.", "continue"],
    ["break-target", "int found = -1;\nfor (int i = 0; i < 6; i++) {\n    if (i == 3) { found = i; break; }\n}", "What is the final value of found?", 3, "When i reaches 3, found is set to 3 and break ends the loop.", "break"],
  ];
  const [variant, code, prompt, answer, explanation, concept] = pick(rows);
  return choice(base("conditional", variant, concept, code, prompt, answer, explanation, {trace: explanation}), [answer - 1, answer + 1, answer + 2]);
}

function whileTrace() {
  const rows = [
    ["integer-half", "int n = 20;\nwhile (n > 3) {\n    n /= 2;\n}", "What is the final value of n?", 2, "n changes 20 → 10 → 5 → 2; then 2 > 3 is false.", "integer division"],
    ["increment-sentinel", "int x = 1;\nwhile (x < 10) {\n    x += 3;\n}", "What is the final value of x?", 10, "x changes 1 → 4 → 7 → 10, then the condition fails.", "sentinel"],
    ["zero-while", "int attempts = 4;\nwhile (attempts < 0) {\n    attempts--;\n}", "What is the final value of attempts?", 4, "The condition is false initially, so the body does not execute.", "zero iterations"],
    ["decrement", "int level = 11;\nwhile (level >= 5) {\n    level -= 2;\n}", "What is the final value of level?", 3, "The values at the starts are 11, 9, 7, and 5; the update then produces 3.", "decreasing counter"],
  ];
  const [variant, code, prompt, answer, explanation, concept] = pick(rows);
  return choice(base("while", variant, concept, code, prompt, answer, explanation, {trace: explanation}), [answer - 1, answer + 1, answer + 2]);
}

function nested() {
  const rows = [
    ["rectangle", "int count = 0;\nfor (int row = 0; row < 3; row++) {\n    for (int col = 0; col < 2; col++) {\n        count++;\n    }\n}", "What is the final value of count?", 6, "The inner loop runs 2 times for each of 3 rows: 3 × 2 = 6.", "independent bounds"],
    ["diagonal", "int count = 0;\nfor (int row = 0; row < 3; row++) {\n    for (int col = 0; col < 2; col++) {\n        if (row == col) count++;\n    }\n}", "What is the final value of count?", 2, "The matching pairs are (0,0) and (1,1); row 2 has no col 2.", "nested condition"],
    ["triangular", "int count = 0;\nfor (int row = 1; row <= 4; row++) {\n    for (int col = 0; col < row; col++) count++;\n}", "How many times does count++ execute?", 10, "The inner counts are 1 + 2 + 3 + 4 = 10, not 4 × 4.", "dependent bounds"],
    ["inner-step", "int total = 0;\nfor (int row = 0; row < 2; row++) {\n    for (int col = 1; col <= 5; col += 2) total += col;\n}", "What is the final value of total?", 18, "Each row adds 1 + 3 + 5 = 9, and there are two rows.", "nested accumulator"],
    ["break-inner", "int count = 0;\nfor (int row = 0; row < 3; row++) {\n    for (int col = 0; col < 4; col++) {\n        count++;\n        if (col == 1) break;\n    }\n}", "What is the final value of count?", 6, "Each row counts col 0 and col 1, then break ends only the inner loop.", "inner break"],
  ];
  const [variant, code, prompt, answer, explanation, concept] = pick(rows);
  return choice(base("nested", variant, concept, code, prompt, answer, explanation, {trace: explanation}), [answer - 2, answer + 2, answer + 4]);
}

function debug() {
  const rows = [
    ["inclusive", "for (int i = 1; i < 5; i++) {\n    System.out.println(i);\n}", "Print every integer from 1 through 5.", "Change i < 5 to i <= 5", ["Change i < 5 to i < 4", "Change i = 1 to i = 0", "Change i++ to i--"], "The current loop stops before 5; including the boundary makes the final required value execute."],
    ["counter-update", "int total = 0;\nfor (int i = 1; i <= 4; i++) {\n    total += i;\n    i++;\n}", "Add 1 + 2 + 3 + 4 and store 10 in total.", "Remove the line i++;", ["Change i++ to i += 2;", "Change total += i; to total = i;", "Change i <= 4 to i < 4"], "The extra i++ skips values 2 and 4; the for-header update should be the only counter update."],
    ["accumulate", "int total = 0;\nfor (int i = 1; i <= 4; i++) {\n    total = i;\n}", "Store 10 in total.", "Change total = i; to total += i;", ["Change total = i; to total++;", "Change total = i; to i += total;", "Change i <= 4 to i < 4"], "Assignment replaces the prior total; += preserves the running sum."],
    ["while-progress", "int n = 8;\nwhile (n > 0) {\n    System.out.println(n);\n}", "Print 8, 7, 6, 5, 4, 3, 2, 1 and stop.", "Add n--; inside the loop", ["Add n++; inside the loop", "Change n > 0 to n < 0", "Remove System.out.println(n);"], "The condition stays true unless n moves toward 0; decrementing prevents an infinite loop."],
    ["array-bound", "int[] values = {4, 8, 2};\nfor (int i = 0; i <= values.length; i++) {\n    System.out.println(values[i]);\n}", "Print every array element exactly once.", "Change i <= values.length to i < values.length", ["Change i <= values.length to i < values.length - 1", "Change i = 0 to i = 1", "Change i++ to i += 2"], "The valid indices are 0 through length - 1, so the loop condition must be strictly less than length."],
  ];
  const [variant, code, prompt, answer, distractors, explanation] = pick(rows);
  return base("debug", variant, "loop correction", code, prompt, answer, explanation, {choices: shuffle([answer, ...distractors]), trace: explanation});
}

const factories = {iterations: iteration, final: finalValue, choose: chooseLoop, components, conditional, while: whileTrace, nested, debug};
export const challengeFamilies = Object.fromEntries(Object.entries({
  iterations: ["inc-exclusive", "dec-inclusive", "zero-start", "while-decrement", "one-step", "skip-step"],
  final: ["sum-range", "product", "overwrite", "count-even", "continue-sum", "break-sum"],
  choose: ["evens", "down", "multiples"], components: ["for-update", "for-condition", "while-init", "body", "while-condition"],
  conditional: ["odd-count", "greater-sum", "continue-even", "break-target"], while: ["integer-half", "increment-sentinel", "zero-while", "decrement"],
  nested: ["rectangle", "diagonal", "triangular", "inner-step", "break-inner"], debug: ["inclusive", "counter-update", "accumulate", "while-progress", "array-bound"],
}).map(([family, variants]) => [family, variants]));

export function generateLoop(family = "mixed", forcedVariant = null) {
  if (family === "mixed") family = pick(Object.keys(factories));
  const q = factories[family]();
  if (forcedVariant && challengeFamilies[family]?.includes(forcedVariant)) {
    let guard = 0; while (q.variant !== forcedVariant && guard++ < 100) { Object.assign(q, factories[family]()); }
  }
  return q;
}
export function assessLoop(question, response) {
  return String(response.answer) === String(question.answer);
}
