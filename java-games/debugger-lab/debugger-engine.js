import { int, pick, shuffle } from "../../csp-games/engine.js?v=platform-expansion-v2";

export const formatNames = {
  correction: "Choose the Correction",
  statement: "Find the Faulty Statement",
  explanation: "Explain the Bug",
  test: "Choose a Bug-Exposing Test",
};

export const categoryNames = {
  compile: "Compile-time error",
  runtime: "Runtime error",
  logic: "Logic error",
};

const main = (body) => `public class Practice {\n    public static void main(String[] args) {\n${body.split("\n").map(line => `        ${line}`).join("\n")}\n    }\n}`;
const cls = (body) => `public class Practice {\n${body}\n}`;
const choices = (answer, distractors) => {
  const all = [...new Set([answer, ...distractors])];
  if (all.length !== 4) throw Error("A debugger challenge needs four unique choices");
  return shuffle(all);
};
const base = (format, id, concept, category, code, requirement, prompt, explanation) => ({
  game: "debugger-lab",
  title: "Debugger Lab",
  format,
  formatName: formatNames[format],
  variant: id,
  topic: `${format}.${id}`,
  topicTitle: `${formatNames[format]} · ${concept}`,
  concept,
  errorCategory: category,
  errorCategoryName: categoryNames[category],
  code,
  requirement,
  prompt,
  explanation,
});
const choiceQuestion = (data, answer, distractors) => ({
  ...data,
  kind: "choice",
  choices: choices(answer, distractors),
  answer,
  correctAnswer: answer,
});

const correctionFactories = {
  "variable-initialization": () => {
    const end = int(3, 7), expected = end * (end + 1) / 2;
    const code = `int total = 1;\nfor (int i = 1; i <= ${end}; i++) {\n    total += i;\n}\nSystem.out.println(total);`;
    const answer = "Change int total = 1; to int total = 0;";
    return choiceQuestion(base("correction", "variable-initialization", "Variables", "logic", code,
      `Print the sum of the integers from 1 through ${end}.`, "Which change fixes the program?",
      `A sum accumulator must start at 0. Starting at 1 makes the program print ${expected + 1} instead of ${expected}.`), answer,
      ["Change int total = 1; to int total = -1;", "Change total += i to total = i", `Change i <= ${end} to i < ${end}`]);
  },
  "variable-assignment": () => {
    const code = `int lives = 3;\nlives == lives - 1;\nSystem.out.println(lives);`;
    const answer = "Change == to =";
    const q = choiceQuestion(base("correction", "variable-assignment", "Variables", "compile", code,
      "Decrease lives by 1 and print 2.", "Which change fixes the program?",
      "== compares two values and cannot stand alone as an assignment statement. = stores lives - 1 back in lives."), answer,
      ["Change == to !=", "Change == to <=", "Change == to >="]);
    return {...q, brokenSource: main(code), fixedSource: main(code.replace("==", "="))};
  },
  "type-char-string": () => {
    const code = `char grade = "A";\nSystem.out.println(grade);`, answer = `Change "A" to 'A'`;
    const q = choiceQuestion(base("correction", "type-char-string", "Data types", "compile", code,
      "Store the single character A in grade.", "Which change fixes the declaration?",
      "A char literal uses single quotes. Double quotes create a String, which cannot be assigned to a char."), answer,
      [`Change "A" to "'A'"`, "Change char to int", "Change grade to String"]);
    return {...q, brokenSource: main(code), fixedSource: main(code.replace('"A"', "'A'"))};
  },
  "type-division": () => {
    const a = int(5, 9), b = 2, code = `int earned = ${a};\nint possible = ${b};\ndouble average = earned / possible;`;
    const answer = "Change earned / possible to (double) earned / possible";
    return choiceQuestion(base("correction", "type-division", "Data types", "logic", code,
      "Store the quotient with its fractional part.", "Which change fixes the calculation?",
      "Casting an operand to double makes the division floating-point. Casting after integer division would be too late."), answer,
      ["Change average to int", "Change / to %", "Change earned / possible to (double) (earned / possible)"]);
  },
  "condition-boundary": () => {
    const cutoff = pick([60, 70, 80]), code = `int score = ${cutoff};\nif (score > ${cutoff}) {\n    System.out.println("Pass");\n}`;
    return choiceQuestion(base("correction", "condition-boundary", "Conditions", "logic", code,
      `Print "Pass" for scores of ${cutoff} or higher.`, "Which change fixes the condition?",
      `The boundary value ${cutoff} must pass, so the comparison must include equality.`), "Change > to >=",
      ["Change > to ==", "Change > to <", "Change > to !="]);
  },
  "condition-and-or": () => {
    const code = `boolean member = true;\nint age = 25;\nif (member && age >= 65) {\n    System.out.println("Discount");\n}`;
    return choiceQuestion(base("correction", "condition-and-or", "Conditions", "logic", code,
      "Print a discount for members or customers age 65 and older.", "Which change fixes the condition?",
      "The requirement accepts either qualification. || is true when member is true or the age condition is true."), "Change && to ||",
      ["Change && to !", "Change && to ==", "Change && to !="]);
  },
  "loop-bound": () => {
    const end = int(4, 8), code = `for (int i = 1; i < ${end}; i++) {\n    System.out.println(i);\n}`;
    return choiceQuestion(base("correction", "loop-bound", "Loops", "logic", code,
      `Print every integer from 1 through ${end}.`, "Which change fixes the loop?",
      `The condition i < ${end} stops before ${end}. Using <= includes the required final value.`), `Change i < ${end} to i <= ${end}`,
      [`Change i < ${end} to i > ${end}`, `Change i < ${end} to i == ${end}`, "Change i = 1 to i = 2"]);
  },
  "loop-accumulation": () => {
    const code = `int total = 0;\nfor (int i = 1; i <= 4; i++) {\n    total = i;\n}`;
    return choiceQuestion(base("correction", "loop-accumulation", "Loops", "logic", code,
      "Store 1 + 2 + 3 + 4 in total.", "Which change fixes the loop body?",
      "total = i replaces the prior result each time. total += i preserves the earlier sum and adds i."), "Change total = i; to total += i;",
      ["Change total = i; to total =+ i;", "Change total = i; to total++;", "Change total = i; to i += total;"]);
  },
  "array-length-index": () => {
    const code = `int[] values = {4, 9, 2, 7};\nSystem.out.println(values[values.length]);`;
    const answer = "Change values.length to values.length - 1";
    const q = choiceQuestion(base("correction", "array-length-index", "Arrays", "runtime", code,
      "Print the final array element.", "Which change prevents the failure and meets the requirement?",
      "An array of length 4 has indices 0 through 3. values.length is outside the array; length - 1 is the final index."), answer,
      ["Change values.length to values.length + 1", "Change values.length to values[0]", "Change values.length to 0"]);
    return {...q, brokenSource: main(code), fixedSource: main(code.replace("values.length]", "values.length - 1]"))};
  },
  "array-update": () => {
    const code = `int[] values = {3, 6, 9, 12};\nvalues[0] = 0;`;
    return choiceQuestion(base("correction", "array-update", "Arrays", "logic", code,
      "Replace the final element with 0.", "Which change fixes the update?",
      "Index 0 is the first element. The final element is at values.length - 1."), "Change values[0] to values[values.length - 1]",
      ["Change values[0] to values[values.length + 1]", "Change values[0] to values[1]", "Change = 0 to == 0"]);
  },
  "method-parameter": () => {
    const code = `static int square(int number) {\n    return number + number;\n}`;
    const q = choiceQuestion(base("correction", "method-parameter", "Methods", "logic", code,
      "Return number squared.", "Which change fixes the method?",
      "Squaring multiplies the parameter by itself; adding it to itself only doubles it."), "Change number + number to number * number",
      ["Change number + number to number - number", "Change return to System.out.println", "Change int number to double number"]);
    const broken = cls(`    static int square(int number) { return number + number; }`);
    return {...q, brokenSource: broken, fixedSource: broken.replace("number + number", "number * number")};
  },
  "method-call-type": () => {
    const code = `static int doubleValue(int value) {\n    return value * 2;\n}\n\nint result = doubleValue("6");`;
    const answer = `Change "6" to 6`;
    const q = choiceQuestion(base("correction", "method-call-type", "Methods", "compile", code,
      "Call doubleValue with the integer 6.", "Which change fixes the method call?",
      "The parameter type is int, so the argument must be an integer value rather than a String literal."), answer,
      [`Change "6" to '6'`, "Change result to boolean", "Change int value to char value"]);
    const broken = cls(`    static int doubleValue(int value) { return value * 2; }\n    public static void main(String[] args) { int result = doubleValue("6"); }`);
    return {...q, brokenSource: broken, fixedSource: broken.replace('doubleValue("6")', "doubleValue(6)")};
  },
};

function lineQuestion(id, concept, category, lines, correctLine, requirement, explanation, sources = {}) {
  return {
    ...base("statement", id, concept, category, lines.join("\n"), requirement,
      "Select the statement responsible for the failure.", explanation),
    kind: "line",
    lines,
    correctLine: String(correctLine),
    correctAnswer: `Line ${correctLine}: ${lines[correctLine - 1].trim()}`,
    ...sources,
  };
}

const statementFactories = {
  "wrong-start-value": () => lineQuestion("wrong-start-value", "Variables", "logic",
    ["int product = 0;", "for (int value = 1; value <= 4; value++) {", "    product *= value;", "}", "System.out.println(product);"], 1,
    "Calculate 1 × 2 × 3 × 4 and print 24.", "Line 1 initializes a product to 0, so every multiplication remains 0. A product accumulator must start at 1."),
  "reused-variable": () => lineQuestion("reused-variable", "Variables", "logic",
    ["int width = 6;", "int height = 4;", "width = height;", "int area = width * height;", "System.out.println(area);"], 3,
    "Calculate the area using width 6 and height 4.", "Line 3 overwrites width with 4, so the program prints 16 instead of 24. The original width must remain 6."),
  "incompatible-assignment": () => {
    const lines = ["int count = 8;", "count = \"nine\";", "System.out.println(count);"];
    const broken = main(lines.join("\n"));
    return lineQuestion("incompatible-assignment", "Data types", "compile", lines, 2,
      "Store and print a whole-number count.", "Line 2 assigns a String to an int variable, which violates Java's type rules.",
      {brokenSource: broken, fixedSource: broken.replace('"nine"', "9")});
  },
  "late-cast": () => lineQuestion("late-cast", "Data types", "logic",
    ["int earned = 7;", "int possible = 2;", "double ratio = (double) (earned / possible);", "System.out.println(ratio);"], 3,
    "Print the quotient 3.5.", "Line 3 performs integer division before the cast, producing 3. Casting earned before division preserves 3.5."),
  "wrong-branch-order": () => lineQuestion("wrong-branch-order", "Conditions", "logic",
    ["int score = 95;", "if (score >= 70) {", "    System.out.println(\"Pass\");", "} else if (score >= 90) {", "    System.out.println(\"Excellent\");", "}"], 2,
    "Print \"Excellent\" for scores at least 90; otherwise print \"Pass\" for scores at least 70.",
    "Line 2 accepts 95 before the more specific branch is reached. The score >= 90 branch must be tested first."),
  "condition-negation": () => lineQuestion("condition-negation", "Conditions", "logic",
    ["boolean loggedIn = true;", "if (!loggedIn) {", "    System.out.println(\"Welcome\");", "}"], 2,
    "Print \"Welcome\" when the user is logged in.", "Line 2 negates loggedIn, so the branch runs only when the user is not logged in."),
  "loop-zero-iterations": () => lineQuestion("loop-zero-iterations", "Loops", "logic",
    ["int total = 0;", "for (int i = 1; i > 5; i++) {", "    total += i;", "}", "System.out.println(total);"], 2,
    "Add the integers 1 through 5.", "Line 2 begins with i equal to 1 but requires i > 5, so the body executes zero times."),
  "loop-wrong-counter": () => lineQuestion("loop-wrong-counter", "Loops", "logic",
    ["int count = 0;", "for (int i = 0; i < 4; i++) {", "    i++;", "    count++;", "}", "System.out.println(count);"], 3,
    "Count all four loop iterations.", "Line 3 increments i a second time inside the body, so indices 1 and 3 are skipped and count becomes 2."),
  "array-out-of-range": () => {
    const lines = ["int[] values = {5, 8, 2};", "int last = values[3];", "System.out.println(last);"];
    const broken = main(lines.join("\n"));
    return lineQuestion("array-out-of-range", "Arrays", "runtime", lines, 2,
      "Print the final element, 2.", "Line 2 accesses index 3, but a length-3 array has valid indices 0, 1, and 2, so execution throws ArrayIndexOutOfBoundsException.",
      {brokenSource: broken, fixedSource: broken.replace("values[3]", "values[2]")});
  },
  "array-first-last": () => lineQuestion("array-first-last", "Arrays", "logic",
    ["int[] values = {4, 7, 2, 7};", "int result = -1;", "for (int i = 0; i < values.length; i++) {", "    if (values[i] == 7) { result = i; break; }", "}", "System.out.println(result);"], 4,
    "Print the index of the last occurrence of 7.", "Line 4 breaks after the first match, so result is 1 instead of the last matching index, 3."),
  "method-return": () => lineQuestion("method-return", "Methods", "logic",
    ["static int larger(int a, int b) {", "    if (a > b) return b;", "    return a;", "}"], 2,
    "Return the larger parameter.", "Line 2 returns b when a is larger. That branch must return a."),
  "method-argument-order": () => lineQuestion("method-argument-order", "Methods", "logic",
    ["static int difference(int first, int second) {", "    return first - second;", "}", "int result = difference(3, 10);", "System.out.println(result);"], 4,
    "Subtract 3 from 10 and print 7.", "Line 4 passes 3 as first and 10 as second, so the method computes 3 - 10. The call must pass 10, 3."),
};

const explanationFactories = {
  "uninitialized-local": () => {
    const code = `int points;\nSystem.out.println(points);`, answer = "A local variable must be initialized before it is read.";
    const q = choiceQuestion(base("explanation", "uninitialized-local", "Variables", "compile", code,
      "Print the value stored in points.", "Why does this program fail?",
      "Java does not assign a default value to a local variable. points must receive a value before println reads it."), answer,
      ["A local int receives its value only after println displays it.", "The variable name points is reserved.", "println accepts only String values."]);
    return {...q, brokenSource: main(code), fixedSource: main(code.replace("int points;", "int points = 0;"))};
  },
  "assignment-direction": () => choiceQuestion(base("explanation", "assignment-direction", "Variables", "logic",
    `int original = 8;\nint copy = 3;\noriginal = copy;`, "Copy original into copy while keeping original equal to 8.",
    "Why does the code fail to meet the requirement?", "Assignment copies the value on the right into the variable on the left. This statement overwrites original with 3."),
    "Assignment stores the right-side value in the left-side variable.",
    ["Assignment automatically exchanges the values stored in both variables.", "Java assignments run from left to right.", "Two int variables cannot store equal values."]),
  "integer-division": () => choiceQuestion(base("explanation", "integer-division", "Data types", "logic",
    `int a = 7;\nint b = 2;\ndouble average = (a + b) / 2;`, "Calculate the average while preserving the decimal part.",
    "Why can this produce the wrong average?", "Both operands of / are integers, so Java computes 9 / 2 as 4 before storing 4.0 in average."),
    "Integer division discards the fractional part.",
    ["Assigning an integer expression to double always rounds the result down.", "Addition occurs after division.", "A double cannot store a whole number."]),
  "narrowing-conversion": () => {
    const code = `double price = 4.75;\nint dollars = price;`, answer = "Java does not implicitly narrow a double to an int.";
    const q = choiceQuestion(base("explanation", "narrowing-conversion", "Data types", "compile", code,
      "Store only the whole-dollar portion in dollars.", "Why does this declaration fail to compile?",
      "Converting double to int may lose data, so Java requires an explicit cast such as (int) price."), answer,
      ["A double variable cannot be read while declaring an int variable.", "A double cannot be stored in a variable.", "The value 4.75 is outside the int range."]);
    return {...q, brokenSource: main(code), fixedSource: main(code.replace("int dollars = price;", "int dollars = (int) price;"))};
  },
  "condition-or-range": () => choiceQuestion(base("explanation", "condition-or-range", "Conditions", "logic",
    `int age = 30;\nif (age >= 13 || age <= 19) {\n    System.out.println("Teen");\n}`, "Print \"Teen\" only for ages from 13 through 19.",
    "Why does this condition accept age 30?", "For 30, age >= 13 is already true. A bounded range requires both comparisons to be true, using &&."),
    "Using || makes either boundary test sufficient.",
    ["The comparisons are evaluated in reverse order.", "The value 30 is treated as a String.", "An if statement cannot contain two comparisons."]),
  "condition-equals-string": () => {
    const code = `String command = new String("start");\nif (command == "start") {\n    System.out.println("Running");\n}`;
    return choiceQuestion(base("explanation", "condition-equals-string", "Conditions", "logic", code,
      "Print \"Running\" when command contains the text start.", "Why may the branch be skipped?",
      "For objects, == compares references. command.equals(\"start\") compares the String contents."),
      "== compares String references rather than their characters.",
      ["String values cannot be used in conditions.", "Complete String words must use single quotes when they are compared.", "new String always produces an empty value."]);
  },
  "loop-extra-iteration": () => choiceQuestion(base("explanation", "loop-extra-iteration", "Loops", "logic",
    `for (int i = 0; i <= 4; i++) {\n    System.out.println(i);\n}`, "Print exactly four values: 0, 1, 2, and 3.",
    "Why does the loop print one extra value?", "The <= condition also permits i == 4, creating a fifth iteration."),
    "The inclusive boundary allows i to reach 4.",
    ["The counter begins at zero instead of one.", "i++ increases the counter before the body.", "println repeats its argument automatically."]),
  "loop-reset-total": () => choiceQuestion(base("explanation", "loop-reset-total", "Loops", "logic",
    `int total = 0;\nfor (int value = 1; value <= 3; value++) {\n    total = 0;\n    total += value;\n}`, "Store 1 + 2 + 3 in total.", "Why is total only 3 after the loop?",
    "total is reset to 0 during every iteration, so previous additions are erased before the current value is added."),
    "The accumulator is reset inside the loop.",
    ["The loop executes only once.", "The += operator subtracts earlier values.", "The counter must start at zero for addition."]),
  "array-negative-index": () => {
    const code = `int[] values = {6, 2, 9};\nint previous = values[0 - 1];`, answer = "Java arrays do not allow negative indices.";
    const q = choiceQuestion(base("explanation", "array-negative-index", "Arrays", "runtime", code,
      "Read an element without causing the program to fail.", "Why does execution fail?",
      "The expression 0 - 1 produces index -1. Valid indices for this array are 0 through 2."), answer,
      ["Array values must be stored in increasing order.", "Subtraction cannot appear inside brackets.", "Index zero refers to the final element."]);
    return {...q, brokenSource: main(code), fixedSource: main(code.replace("values[0 - 1]", "values[0]"))};
  },
  "array-copy-direction": () => choiceQuestion(base("explanation", "array-copy-direction", "Arrays", "logic",
    `int[] values = {4, 8, 2};\nvalues[2] = values[0];`, "Copy the final element into the first cell.",
    "Why does this update the wrong cell?", "Assignment writes into the array position on the left. This code copies the first value into the final cell, the reverse of the requirement."),
    "The destination and source indices are reversed.",
    ["Arrays can be copied only with a loop.", "Index 2 refers to the second element.", "Assignment changes the values stored in both indexed cells."]),
  "method-missing-return": () => {
    const code = `static int absolute(int value) {\n    if (value < 0) {\n        return -value;\n    }\n}`;
    const answer = "A non-void method does not return a value on every path.";
    const broken = cls(`    ${code}\n    public static void main(String[] args) { System.out.println(absolute(3)); }`);
    const q = choiceQuestion(base("explanation", "method-missing-return", "Methods", "compile", code,
      "Return the absolute value for negative and nonnegative inputs.", "Why does this method fail to compile?",
      "When value is nonnegative, the if body is skipped and execution reaches the end without returning an int."), answer,
      ["A return statement cannot appear inside a conditional if block.", "The parameter must have type double.", "Unary minus cannot be used with an int."]);
    const fixed = cls(`    static int absolute(int value) {\n        if (value < 0) return -value;\n        return value;\n    }\n    public static void main(String[] args) { System.out.println(absolute(3)); }`);
    return {...q, brokenSource: broken, fixedSource: fixed};
  },
  "method-local-scope": () => {
    const code = `static int calculate(int value) {\n    if (value > 0) {\n        int result = value * 2;\n    }\n    return result;\n}`;
    const answer = "result exists only inside the if block where it is declared.";
    const q = choiceQuestion(base("explanation", "method-local-scope", "Methods", "compile", code,
      "Return twice a positive value.", "Why does result cause a compile-time error?",
      "A local variable declared inside braces is out of scope after those braces close."), answer,
      ["A method cannot declare a local int.", "A local variable cannot be declared inside a conditional block in Java.", "A parameter cannot be used in multiplication."]);
    return {...q, brokenSource: cls(`    ${code}`), fixedSource: cls(`    static int calculate(int value) {\n        int result = 0;\n        if (value > 0) result = value * 2;\n        return result;\n    }`)};
  },
};

function testQuestion(id, concept, code, requirement, tests, explanation) {
  const exposing = tests.filter(test => String(test.expected) !== String(test.actual));
  if (exposing.length !== 1) throw Error(`${id} must have exactly one bug-exposing test`);
  const answer = exposing[0].label;
  return {
    ...choiceQuestion(base("test", id, concept, "logic", code, requirement,
      "Which test case exposes the bug?", explanation), answer, tests.filter(test => test !== exposing[0]).map(test => test.label)),
    tests,
  };
}

const testFactories = {
  "boundary-inclusive": () => {
    const cutoff = pick([60, 70, 80]);
    return testQuestion("boundary-inclusive", "Conditions", `return score > ${cutoff};`, `Return true when score >= ${cutoff}.`,
      [cutoff - 1, cutoff, cutoff + 1, cutoff + 10].map(value => ({label: `score = ${value}`, input: value, expected: value >= cutoff, actual: value > cutoff})),
      `At score ${cutoff}, the requirement is true but the implementation's > comparison returns false.`);
  },
  "and-instead-of-or": () => testQuestion("and-instead-of-or", "Conditions", "return member && age >= 65;",
    "Return true for a member or for someone age 65 or older.", [
      {label:"member = false, age = 30",expected:false,actual:false},
      {label:"member = true, age = 30",expected:true,actual:false},
      {label:"member = true, age = 70",expected:true,actual:true},
      {label:"member = false, age = 40",expected:false,actual:false},
    ],
    "The member-only input should qualify through the first condition, but && also requires the age condition."),
  "negated-flag": () => testQuestion("negated-flag", "Conditions", "return !active || accessLevel >= 2;", "Return true when active is true or accessLevel is at least 2.", [
    {label:"active = false, accessLevel = 2",expected:true,actual:true},
    {label:"active = true, accessLevel = 2",expected:true,actual:true},
    {label:"active = false, accessLevel = 1",expected:false,actual:true},
    {label:"active = true, accessLevel = 3",expected:true,actual:true},
  ], "When active is false and the level is below 2, !active incorrectly makes the implementation return true."),
  "integer-division-test": () => testQuestion("integer-division-test", "Data types", "return earned / possible;",
    "Return a double quotient without discarding a fractional part.", [
      {label:"earned = 8, possible = 2",expected:4.0,actual:4.0},
      {label:"earned = 7, possible = 2",expected:3.5,actual:3.0},
      {label:"earned = 0, possible = 5",expected:0.0,actual:0.0},
      {label:"earned = 9, possible = 3",expected:3.0,actual:3.0},
    ], "7 / 2 has a fractional result, so integer division produces 3 instead of 3.5."),
  "wrong-initial-value": () => testQuestion("wrong-initial-value", "Variables", `int largest = 0;\nfor (int value : values) {\n    if (value > largest) largest = value;\n}\nreturn largest;`,
    "Return the largest array value.", [
      {label:"values = {-4, -2}",expected:-2,actual:0},
      {label:"values = {0, -2}",expected:0,actual:0},
      {label:"values = {-2, 15}",expected:15,actual:15},
      {label:"values = {3, 1}",expected:3,actual:3},
    ], "An all-negative array exposes the incorrect starting value 0; largest should begin with an array element."),
  "assignment-instead-add": () => testQuestion("assignment-instead-add", "Variables", `int total = 0;\nfor (int value : values) total = value;\nreturn total;`,
    "Return the sum of every array value.", [
      {label:"values = {5}",expected:5,actual:5},
      {label:"values = {0, 5}",expected:5,actual:5},
      {label:"values = {2, 5}",expected:7,actual:5},
      {label:"values = {-2, 2, 0}",expected:0,actual:0},
    ],
    "With {2, 5}, replacing total on each iteration returns 5 instead of accumulating 7."),
  "skip-final-element": () => testQuestion("skip-final-element", "Loops", `int total = 0;\nfor (int i = 0; i < values.length - 1; i++) total += values[i];\nreturn total;`,
    "Return the sum of every array element.", [
      {label:"values = {4, 0}",expected:4,actual:4},
      {label:"values = {4, 3}",expected:7,actual:4},
      {label:"values = {0, 0, 0}",expected:0,actual:0},
      {label:"values = {-2, 2, 0}",expected:0,actual:0},
    ], "The final element is nonzero only in {4, 3}, so skipping it produces 4 instead of 7."),
  "loop-start-one": () => testQuestion("loop-start-one", "Loops", `int count = 0;\nfor (int i = 1; i < values.length; i++) {\n    if (values[i] < 0) count++;\n}\nreturn count;`,
    "Count every negative array value.", [
      {label:"values = {-3, 2, 4}",expected:1,actual:0},
      {label:"values = {3, -2, 4}",expected:1,actual:1},
      {label:"values = {3, 2, -4}",expected:1,actual:1},
      {label:"values = {3, 2, 4}",expected:0,actual:0},
    ], "Only the first test stores a negative value at index 0, which the loop skips by starting at index 1."),
  "first-versus-last": () => testQuestion("first-versus-last", "Arrays", `int result = -1;\nfor (int i = 0; i < values.length; i++) {\n    if (values[i] == target) { result = i; break; }\n}\nreturn result;`,
    "Return the index of the last target, or -1 when absent.", [
      {label:"values = {2, 5, 7}, target = 5",expected:1,actual:1},
      {label:"values = {5, 2, 5}, target = 5",expected:2,actual:0},
      {label:"values = {2, 7, 5}, target = 5",expected:2,actual:2},
      {label:"values = {2, 7, 9}, target = 5",expected:-1,actual:-1},
    ], "Duplicate targets reveal the break: the implementation returns the first index 0 instead of the last index 2."),
  "wrong-array-cell": () => testQuestion("wrong-array-cell", "Arrays", `values[0] = replacement;\nreturn values;`,
    "Replace the final array element.", [
      {label:"values = {4}, replacement = 9",expected:"{9}",actual:"{9}"},
      {label:"values = {4, 9}, replacement = 9",expected:"{4, 9}",actual:"{9, 9}"},
      {label:"values = {9, 9}, replacement = 9",expected:"{9, 9}",actual:"{9, 9}"},
      {label:"values = {4, 4}, replacement = 4",expected:"{4, 4}",actual:"{4, 4}"},
    ], "A two-element array with a different first value reveals that index 0 is updated instead of the final index."),
  "reversed-arguments": () => testQuestion("reversed-arguments", "Methods", `static int subtract(int a, int b) { return a - b; }\nreturn subtract(smaller, larger);`,
    "Subtract smaller from larger.", [
      {label:"smaller = 3, larger = 8",expected:5,actual:-5},
      {label:"smaller = 4, larger = 4",expected:0,actual:0},
      {label:"smaller = 0, larger = 0",expected:0,actual:0},
      {label:"smaller = -2, larger = -2",expected:0,actual:0},
    ], "Unequal arguments expose the reversed call: subtract(3, 8) returns -5 instead of 5."),
  "ignored-parameter": () => testQuestion("ignored-parameter", "Methods", `static int addBonus(int score, int bonus) {\n    return score + 5;\n}`,
    "Return score plus the bonus parameter.", [
      {label:"score = 10, bonus = 5",expected:15,actual:15},
      {label:"score = 10, bonus = 3",expected:13,actual:15},
      {label:"score = 0, bonus = 5",expected:5,actual:5},
      {label:"score = -5, bonus = 5",expected:0,actual:0},
    ], "A bonus other than 5 exposes that the method ignores its bonus parameter and always adds 5."),
};

export const challengeFamilies = {
  correction: Object.keys(correctionFactories),
  statement: Object.keys(statementFactories),
  explanation: Object.keys(explanationFactories),
  test: Object.keys(testFactories),
};
const factories = {correction: correctionFactories, statement: statementFactories, explanation: explanationFactories, test: testFactories};

export function generateDebugger(format = "mixed", forcedVariant) {
  const selected = format === "mixed" ? pick(Object.keys(formatNames)) : format;
  const family = factories[selected];
  if (!family) throw Error("Unknown Debugger Lab format");
  const variant = forcedVariant || pick(Object.keys(family));
  if (!family[variant]) throw Error("Unknown Debugger Lab variant");
  const question = family[variant]();
  if (!question.brokenSource && !question.code.includes("static ") && !question.code.includes("return "))
    question.brokenSource = main(question.code);
  if (!question.fixedSource && question.errorCategory !== "compile") question.fixedSource = question.brokenSource;
  return question;
}

export function assessDebugger(question, response) {
  return question.kind === "line"
    ? response.line === question.correctLine
    : response.answer === question.answer;
}

export function solutionDebugger(question) {
  return question.kind === "line" ? {line: question.correctLine} : {answer: question.answer};
}
