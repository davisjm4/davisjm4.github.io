import { int, pick, shuffle } from "../../csp-games/engine.js?v=platform-expansion-v2";
import { advancedFormatFamilies, generateAdvancedArray } from "./advanced-families.js?v=array-modes-v2";
import {generateCompositionalArray} from './compose/engine.js?v=array-catalog-20261024';
export {createArrayHistory} from './compose/engine.js?v=array-catalog-20261024';

export const formatNames = {
  element: "Select an Array Element",
  "predict-update": "Predict an Array Update",
  "perform-update": "Perform an Array Update",
  search: "Trace an Array Search",
  traversal: "Trace an Array Traversal",
  "access-2d": "Access a 2D Array",
  "update-2d": "Update a 2D Array",
  nested: "Nested Loops and 2D Traversal",
  reverse: "Choose the Java Statement",
  "create-references": "Create Arrays & Trace References",
  "in-place": "In-Place Array Algorithms",
  "trace-2d": "Trace 2D Array Algorithms",
};

const names = ["values", "scores", "numbers", "readings", "data"];
const uniqueValues = (length, min = 1, max = 30) => {
  const out = [];
  while (out.length < length) {
    const value = int(min, max);
    if (!out.includes(value)) out.push(value);
  }
  return out;
};
const arrayCode = (name, values) => `int[] ${name} = {${values.join(", ")}};`;
const gridCode = (grid) =>
  `int[][] grid = {\n${grid.map((row) => `    {${row.join(", ")}}`).join(",\n")}\n};`;
const choiceSet = (answer, wrong) => {
  const answerText = String(answer);
  let distractors = [...new Set(wrong.map(String))].filter((value) => value !== answerText);
  if (Number.isFinite(Number(answer))) {
    for (const offset of [1, -1, 2, -2, 3, -3, 10, -10]) {
      const value = String(Number(answer) + offset);
      if (!distractors.includes(value) && value !== answerText) distractors.push(value);
    }
    distractors = distractors
      .map((value, index) => ({value, index, gap: Math.abs(value.length - answerText.length)}))
      .sort((a, b) => a.gap - b.gap || a.index - b.index)
      .map((item) => item.value);
  }
  if (distractors.length < 3) throw Error("Challenge needs four unique choices");
  return shuffle([answerText, ...distractors.slice(0, 3)]);
};
const base = (format, variant, kind, code, prompt, explanation) => ({
  game: "array-lab",
  title: "Array Lab",
  format,
  formatName: formatNames[format],
  variant,
  topic: `${format}.${variant}`,
  topicTitle: `${formatNames[format]} · ${variant.replaceAll("-", " ")}`,
  kind,
  code,
  prompt,
  explanation,
});

function elementChallenge(forced) {
  const variant = forced || pick(["literal", "last", "from-end", "expression"]);
  const length = int(4, 7), values = uniqueValues(length, 5, 60), name = pick(names);
  let index, expression;
  if (variant === "literal") {
    index = int(0, length - 1);
    expression = String(index);
  } else if (variant === "last") {
    index = length - 1;
    expression = `${name}.length - 1`;
  } else if (variant === "from-end") {
    index = length - 2;
    expression = `${name}.length - 2`;
  } else {
    const left = int(0, length - 2), right = int(1, length - left - 1);
    index = left + right;
    expression = `${left} + ${right}`;
  }
  return {
    ...base(
      "element", variant, "cell", arrayCode(name, values),
      `Select the element accessed by ${name}[${expression}].`,
      `Java arrays use zero-based indexing, so index ${index} is cell ${index + 1} and contains ${values[index]}.`,
    ),
    values,
    correctCell: String(index),
    correctAnswer: `${name}[${index}] = ${values[index]}`,
    revealIndices: true,
  };
}

function predictUpdateChallenge(forced) {
  const variant = forced || pick(["assign", "increment", "decrement", "compound", "copy", "swap", "index-expression"]);
  const length = int(4, 6), values = uniqueValues(length, 1, 18), name = pick(names);
  let code = arrayCode(name, values), answer, wrong, prompt, explanation;
  if (variant === "assign") {
    const index = int(0, length - 1), value = int(20, 35);
    code += `\n${name}[${index}] = ${value};`;
    answer = value; wrong = [values[index], index, values[(index + 1) % length]];
    prompt = `What value is stored in ${name}[${index}] after the statement executes?`;
    explanation = `Assignment replaces the old value ${values[index]} with ${value}.`;
  } else if (variant === "increment" || variant === "decrement") {
    const index = int(0, length - 1), delta = variant === "increment" ? 1 : -1;
    code += `\n${name}[${index}]${delta > 0 ? "++" : "--"};`;
    answer = values[index] + delta; wrong = [values[index], values[index] - delta, index];
    prompt = `What value is stored in ${name}[${index}] afterward?`;
    explanation = `${delta > 0 ? "++ adds 1 to" : "-- subtracts 1 from"} the value already stored at index ${index}.`;
  } else if (variant === "compound") {
    const target = int(0, length - 1), source = (target + int(1, length - 1)) % length;
    code += `\n${name}[${target}] += ${name}[${source}];`;
    answer = values[target] + values[source];
    wrong = [values[target], values[source], values[target] - values[source]];
    prompt = `What value is stored in ${name}[${target}] afterward?`;
    explanation = `+= adds the source value ${values[source]} to the original target value ${values[target]}, producing ${answer}.`;
  } else if (variant === "copy") {
    const target = int(0, length - 1), source = (target + int(1, length - 1)) % length;
    code += `\n${name}[${target}] = ${name}[${source}];`;
    answer = values[source]; wrong = [values[target], target, source];
    prompt = `What value is stored in ${name}[${target}] afterward?`;
    explanation = `The value ${values[source]} is copied from index ${source} into index ${target}; it is not added to the old value.`;
  } else if (variant === "swap") {
    const a = int(0, length - 2), b = int(a + 1, length - 1);
    code += `\nint temp = ${name}[${a}];\n${name}[${a}] = ${name}[${b}];\n${name}[${b}] = temp;`;
    answer = values[b]; wrong = [values[a], a, b];
    prompt = `What value is stored in ${name}[${a}] after the swap?`;
    explanation = `The temporary variable preserves ${values[a]}, while index ${a} receives the original value ${values[b]} from index ${b}.`;
  } else {
    const offset = pick([1, 2]), index = length - offset;
    code += `\n${name}[${name}.length - ${offset}] *= 2;`;
    answer = values[index] * 2; wrong = [values[index], values.at(-1) * 2, index];
    prompt = `What value is stored in ${name}[${name}.length - ${offset}] afterward?`;
    explanation = `${name}.length - ${offset} evaluates to index ${index}; *= 2 doubles its original value ${values[index]}.`;
  }
  const question = base("predict-update", variant, "choice", code, prompt, explanation);
  return {...question, choices: choiceSet(answer, wrong), answer: String(answer), correctAnswer: String(answer)};
}

function performUpdateChallenge(forced) {
  const variant = forced || pick(["assign", "compound", "copy", "increment", "swap"]);
  const length = int(4, 7), values = uniqueValues(length, 1, 20), name = pick(names);
  let code = arrayCode(name, values), answerState = [...values], prompt, explanation, target, applyValue, correctCells;
  if (variant === "swap") {
    const a = int(0, length - 2), b = int(a + 1, length - 1);
    code += `\nint temp = ${name}[${a}];\n${name}[${a}] = ${name}[${b}];\n${name}[${b}] = temp;`;
    [answerState[a], answerState[b]] = [answerState[b], answerState[a]];
    correctCells = [String(a), String(b)];
    prompt = `Select indices ${a} and ${b} to perform the swap.`;
    explanation = `A swap exchanges the values ${values[a]} and ${values[b]} while every other cell stays unchanged.`;
  } else {
    target = variant === "increment" ? length - 1 : int(0, length - 1);
    if (variant === "assign") {
      applyValue = int(21, 35); code += `\n${name}[${target}] = ${applyValue};`;
      explanation = `Only index ${target} changes: ${values[target]} is replaced by ${applyValue}.`;
    } else if (variant === "compound") {
      const amount = int(2, 6); applyValue = values[target] + amount;
      code += `\n${name}[${target}] += ${amount};`;
      explanation = `Compound assignment adds ${amount} to the existing value ${values[target]}, producing ${applyValue}.`;
    } else if (variant === "copy") {
      const source = (target + int(1, length - 1)) % length; applyValue = values[source];
      code += `\n${name}[${target}] = ${name}[${source}];`;
      explanation = `Index ${target} receives a copy of ${values[source]} from index ${source}.`;
    } else {
      applyValue = values[target] + 1; code += `\n${name}[${name}.length - 1]++;`;
      explanation = `The final valid index is length - 1, or ${target}; ++ changes ${values[target]} to ${applyValue}.`;
    }
    answerState[target] = applyValue;
    correctCells = [String(target)];
    prompt = "Tap the cell changed by the statement to apply the update.";
  }
  return {
    ...base("perform-update", variant, variant === "swap" ? "swap" : "apply", code, prompt, explanation),
    values, answerState, target, applyValue, correctCells,
    correctAnswer: `{${answerState.join(", ")}}`, revealIndices: true,
  };
}

function searchChallenge(forced) {
  const variant = forced || pick(["first", "last", "count", "exists", "minimum", "maximum", "missing"]);
  const length = int(5, 7), values = uniqueValues(length, 1, 20), name = pick(names);
  let target, code, answer, wrong, explanation;
  if (["first", "last", "count", "exists"].includes(variant)) {
    const first = int(0, length - 3), last = int(first + 1, length - 1);
    target = int(21, 35); values[first] = target; values[last] = target;
  } else if (variant === "missing") target = 40 + int(1, 9);
  if (variant === "first" || variant === "missing") {
    answer = variant === "missing" ? -1 : values.indexOf(target);
    code = `int result = -1;\nfor (int i = 0; i < ${name}.length; i++) {\n    if (${name}[i] == ${target}) {\n        result = i;\n        break;\n    }\n}`;
    wrong = variant === "missing" ? [0, length - 1, target] : [values.lastIndexOf(target), target, answer + 1];
    explanation = answer === -1 ? `No element equals ${target}, so result remains -1.` : `break stops at the first match, index ${answer}; the later duplicate is not used.`;
  } else if (variant === "last") {
    answer = values.lastIndexOf(target);
    code = `int result = -1;\nfor (int i = 0; i < ${name}.length; i++) {\n    if (${name}[i] == ${target}) {\n        result = i;\n    }\n}`;
    wrong = [values.indexOf(target), target, answer + 1];
    explanation = `Without break, each match replaces result, so the last matching index ${answer} remains.`;
  } else if (variant === "count") {
    answer = values.filter((value) => value === target).length;
    code = `int result = 0;\nfor (int value : ${name}) {\n    if (value == ${target}) result++;\n}`;
    wrong = [values.indexOf(target), values.lastIndexOf(target), target];
    explanation = `result increases once for each match. The duplicated target appears ${answer} times.`;
  } else if (variant === "exists") {
    answer = "true";
    code = `boolean found = false;\nfor (int value : ${name}) {\n    if (value == ${target}) found = true;\n}`;
    wrong = ["false", String(values.indexOf(target)), String(target)];
    explanation = `At least one element equals ${target}, so found becomes true and is never reset.`;
  } else {
    answer = variant === "minimum" ? Math.min(...values) : Math.max(...values);
    code = `int result = ${name}[0];\nfor (int value : ${name}) {\n    if (value ${variant === "minimum" ? "<" : ">"} result) result = value;\n}`;
    wrong = variant === "minimum"
      ? [Math.max(...values), values[0], values.indexOf(answer)]
      : [Math.min(...values), values[0], values.indexOf(answer)];
    explanation = `result keeps the ${variant === "minimum" ? "smallest" : "largest"} value encountered, which is ${answer}.`;
  }
  const declaration = arrayCode(name, values);
  const resultName = variant === "exists" ? "found" : "result";
  const question = base("search", variant, "choice", `${declaration}\n${code}`, `What is the final value of ${resultName}?`, explanation);
  return {...question, values, choices: choiceSet(answer, wrong), answer: String(answer), correctAnswer: String(answer)};
}

function traversalChallenge(forced) {
  const variant = forced || pick(["count", "sum-selected", "maximum", "minimum", "reverse-digits", "skip-first", "skip-last"]);
  const length = int(4, 6), values = uniqueValues(length, 1, 9), name = pick(names), threshold = int(3, 7);
  let code, answer, wrong, explanation;
  if (variant === "count") {
    answer = values.filter((value) => value > threshold).length;
    code = `int result = 0;\nfor (int value : ${name}) {\n    if (value > ${threshold}) result++;\n}`;
    wrong = [answer + 1, Math.max(0, answer - 1), values.length];
    explanation = `The counter increases only for values greater than ${threshold}; there are ${answer}.`;
  } else if (variant === "sum-selected") {
    answer = values.filter((value) => value % 2 === 0).reduce((sum, value) => sum + value, 0);
    code = `int result = 0;\nfor (int value : ${name}) {\n    if (value % 2 == 0) result += value;\n}`;
    wrong = [values.filter(v=>v%2===0).length, values.reduce((a,b)=>a+b,0), values.filter(v=>v%2).reduce((a,b)=>a+b,0)];
    explanation = `Only even values are added to result, giving a final sum of ${answer}.`;
  } else if (variant === "maximum" || variant === "minimum") {
    answer = variant === "maximum" ? Math.max(...values) : Math.min(...values);
    code = `int result = ${name}[0];\nfor (int i = 1; i < ${name}.length; i++) {\n    if (${name}[i] ${variant === "maximum" ? ">" : "<"} result) result = ${name}[i];\n}`;
    wrong = [variant === "maximum" ? Math.min(...values) : Math.max(...values), values[0], values.indexOf(answer)];
    explanation = `result begins with the first element and is replaced only by a ${variant === "maximum" ? "larger" : "smaller"} value.`;
  } else if (variant === "reverse-digits") {
    const short = values.slice(0, 4);
    answer = Number([...short].reverse().join(""));
    code = `${arrayCode(name, short)}\nint result = 0;\nfor (int i = ${name}.length - 1; i >= 0; i--) {\n    result = result * 10 + ${name}[i];\n}`;
    wrong = [Number(short.join("")), Number(short.slice(1).reverse().join("")), Number([...short].reverse().slice(1).join(""))];
    explanation = `The loop visits indices from last to first and appends each value as a digit, producing ${answer}.`;
    const question = base("traversal", variant, "choice", code, "What is the final value of result?", explanation);
    return {...question, values: short, choices: choiceSet(answer, wrong), answer: String(answer), correctAnswer: String(answer)};
  } else {
    const skipFirst = variant === "skip-first";
    answer = (skipFirst ? values.slice(1) : values.slice(0, -1)).reduce((a,b)=>a+b,0);
    code = `int result = 0;\nfor (int i = ${skipFirst ? 1 : 0}; i < ${name}.length${skipFirst ? "" : " - 1"}; i++) {\n    result += ${name}[i];\n}`;
    wrong = [values.reduce((a,b)=>a+b,0), answer + (skipFirst ? values[0] : values.at(-1)), values.length - 1];
    explanation = `The loop boundary skips the ${skipFirst ? "first" : "last"} element, so result is ${answer}.`;
  }
  const question = base("traversal", variant, "choice", `${arrayCode(name, values)}\n${code}`, "What is the final value of result?", explanation);
  return {...question, values, choices: choiceSet(answer, wrong), answer: String(answer), correctAnswer: String(answer)};
}

const makeGrid = () => {
  const rows = int(2, 4), columns = int(2, 5);
  const values = uniqueValues(rows * columns, 1, 40);
  return Array.from({length: rows}, (_, row) =>
    values.slice(row * columns, (row + 1) * columns),
  );
};

function access2dChallenge(forced) {
  const variant = forced || pick(["literal", "last-cell", "row-expression", "column-expression"]);
  const grid = makeGrid(), rows = grid.length, columns = grid[0].length;
  let row, col, expression;
  if (variant === "literal") {
    row = int(0, rows - 1); col = int(0, columns - 1); expression = `${row}][${col}`;
  } else if (variant === "last-cell") {
    row = rows - 1; col = columns - 1; expression = "grid.length - 1][grid[0].length - 1";
  } else if (variant === "row-expression") {
    row = rows - 1; col = int(0, columns - 1); expression = `grid.length - 1][${col}`;
  } else {
    row = int(0, rows - 1); col = columns - 2; expression = `${row}][grid[${row}].length - 2`;
  }
  return {
    ...base("access-2d", variant, "cell-2d", gridCode(grid), `Select the element accessed by grid[${expression}].`,
      `The first index selects row ${row}; the second selects column ${col}. That cell contains ${grid[row][col]}.`),
    grid, rows, columns, correctCell: `${row},${col}`, correctAnswer: `grid[${row}][${col}] = ${grid[row][col]}`, revealIndices: true,
  };
}

function update2dChallenge(forced) {
  const variant = forced || pick(["assign", "copy", "compound", "row-sum", "column-sum", "swap"]);
  const grid = makeGrid(), rows = grid.length, columns = grid[0].length;
  const r1 = int(0, rows - 1), c1 = int(0, columns - 1);
  let code = gridCode(grid), answer, wrong, explanation, prompt;
  if (variant === "assign") {
    do answer = int(31, 45); while (answer === grid[r1][c1]);
    code += `\ngrid[${r1}][${c1}] = ${answer};`;
    wrong = [grid[r1][c1], r1, c1]; explanation = `Direct assignment replaces the old cell value with ${answer}.`;
  } else if (variant === "copy" || variant === "compound") {
    const r2 = (r1 + int(1, rows - 1)) % rows, c2 = (c1 + int(1, columns - 1)) % columns;
    answer = variant === "copy" ? grid[r2][c2] : grid[r1][c1] + grid[r2][c2];
    code += `\ngrid[${r1}][${c1}] ${variant === "copy" ? "=" : "+="} grid[${r2}][${c2}];`;
    wrong = [grid[r1][c1], grid[r2][c2], grid[r1][c1] - grid[r2][c2]];
    explanation = variant === "copy"
      ? `The value ${grid[r2][c2]} is copied into row ${r1}, column ${c1}.`
      : `+= adds ${grid[r2][c2]} to the original ${grid[r1][c1]}, producing ${answer}.`;
  } else if (variant === "row-sum") {
    answer = grid[r1].reduce((a,b)=>a+b,0);
    code += `\nint result = 0;\nfor (int col = 0; col < grid[${r1}].length; col++) result += grid[${r1}][col];`;
    wrong = [grid[r1].length, grid[0].reduce((a,b)=>a+b,0), grid.flat().reduce((a,b)=>a+b,0)];
    prompt = "What is the final value of result?";
    explanation = `The loop keeps row ${r1} fixed and adds every column in that row, totaling ${answer}.`;
  } else if (variant === "column-sum") {
    answer = grid.reduce((sum,row)=>sum+row[c1],0);
    code += `\nint result = 0;\nfor (int row = 0; row < grid.length; row++) result += grid[row][${c1}];`;
    wrong = [rows, grid[r1].reduce((a,b)=>a+b,0), grid.flat().reduce((a,b)=>a+b,0)];
    prompt = "What is the final value of result?";
    explanation = `The loop changes row while column ${c1} stays fixed, so it totals that column: ${answer}.`;
  } else {
    const r2 = (r1 + int(1, rows - 1)) % rows, c2 = (c1 + int(1, columns - 1)) % columns;
    answer = grid[r2][c2];
    code += `\nint temp = grid[${r1}][${c1}];\ngrid[${r1}][${c1}] = grid[${r2}][${c2}];\ngrid[${r2}][${c2}] = temp;`;
    wrong = [grid[r1][c1], r2, c2];
    explanation = `After the swap, grid[${r1}][${c1}] contains the original value ${answer} from grid[${r2}][${c2}].`;
  }
  prompt ||= `What value is stored in grid[${r1}][${c1}] afterward?`;
  const question = base("update-2d", variant, "choice", code, prompt, explanation);
  return {...question, grid, rows, columns, choices: choiceSet(answer, wrong), answer: String(answer), correctAnswer: String(answer)};
}

function nestedChallenge(forced) {
  const variant = forced || pick(["count", "sum-all", "row-sum", "column-sum", "execution-count", "conditional-update"]);
  const grid = makeGrid(), rows = grid.length, columns = grid[0].length, threshold = int(8, 18);
  let code = gridCode(grid), answer, wrong, explanation;
  if (variant === "count") {
    answer = grid.flat().filter(v=>v>threshold).length;
    code += `\nint result = 0;\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        if (grid[row][col] > ${threshold}) result++;\n    }\n}`;
    wrong = [answer+1, Math.max(0,answer-1), rows*columns];
    explanation = `Both loops visit every cell; exactly ${answer} values are greater than ${threshold}.`;
  } else if (variant === "sum-all") {
    answer = grid.flat().reduce((a,b)=>a+b,0);
    code += `\nint result = 0;\nfor (int[] row : grid) {\n    for (int value : row) result += value;\n}`;
    wrong = [grid[0].reduce((a,b)=>a+b,0), rows*columns, answer-grid.at(-1).at(-1)];
    explanation = `The enhanced loops add every value in every row, producing ${answer}.`;
  } else if (variant === "row-sum") {
    const selected = int(0, rows - 1); answer = grid[selected].reduce((a,b)=>a+b,0);
    code += `\nint result = 0;\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        if (row == ${selected}) result += grid[row][col];\n    }\n}`;
    wrong = [grid[0].reduce((a,b)=>a+b,0), grid.flat().reduce((a,b)=>a+b,0), columns];
    explanation = `Only cells with row == ${selected} are added, so result is that row's sum, ${answer}.`;
  } else if (variant === "column-sum") {
    const selected = int(0, columns - 1); answer = grid.reduce((s,row)=>s+row[selected],0);
    code += `\nint result = 0;\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        if (col == ${selected}) result += grid[row][col];\n    }\n}`;
    wrong = [grid[0].reduce((a,b)=>a+b,0), grid.flat().reduce((a,b)=>a+b,0), rows];
    explanation = `Only column ${selected} contributes, one value per row, totaling ${answer}.`;
  } else if (variant === "execution-count") {
    answer = rows * columns;
    code += `\nint result = 0;\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) result++;\n}`;
    wrong = [rows+columns, rows, columns];
    explanation = `The inner body runs ${columns} times for each of ${rows} rows: ${rows} × ${columns} = ${answer}.`;
  } else {
    answer = grid.flat().filter(v=>v%2===0).length;
    code += `\nint result = 0;\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        if (grid[row][col] % 2 == 0) {\n            grid[row][col]++;\n            result++;\n        }\n    }\n}`;
    wrong = [grid.flat().filter(v=>v%2).length, rows*columns, answer+1];
    explanation = `Each even cell is incremented once and also increments result; there are ${answer} even starting values.`;
  }
  const question = base("nested", variant, "choice", code, "What is the final value of result?", explanation);
  return {...question, grid, rows, columns, choices: choiceSet(answer, wrong), answer: String(answer), correctAnswer: String(answer)};
}

function reverseChallenge(forced) {
  const variant = forced || pick(["last-zero", "first-copy", "increment-last", "valid-last", "grid-cell", "swap"]);
  let prompt, answer, wrong, explanation, code;
  if (variant === "last-zero") {
    prompt = "Goal: Replace the final array element with 0.";
    answer = "values[values.length - 1] = 0;";
    wrong = ["values[values.length] = 0;", "values[0] = 0;", "values[values.length - 1] == 0;"];
    explanation = "The final valid index is length - 1, and = performs assignment; length itself is outside the array.";
    code = "int[] values = {4, 8, 2, 7};";
  } else if (variant === "first-copy") {
    prompt = "Goal: Copy the final element into the first element.";
    answer = "values[0] = values[values.length - 1];";
    wrong = ["values[1] = values[values.length];", "values[values.length - 1] = values[0];", "values[0] == values[values.length - 1];"];
    explanation = "Index 0 is the first cell, length - 1 is the final cell, and assignment copies right to left.";
    code = "int[] values = {5, 9, 3, 6};";
  } else if (variant === "increment-last") {
    prompt = "Goal: Increase the final element by 1.";
    answer = "values[values.length - 1]++;";
    wrong = ["values[values.length]++;", "values[values.length - 1] += 0;", "values[0]++;"];
    explanation = "length - 1 selects the last cell, and ++ increases its stored value by one.";
    code = "int[] values = {2, 4, 6};";
  } else if (variant === "valid-last") {
    prompt = "Goal: Store the last valid array index in lastIndex.";
    answer = "int lastIndex = values.length - 1;";
    wrong = ["int lastIndex = values.length;", "int lastIndex = values[values.length];", "int lastIndex = values.length + 1;"];
    explanation = "An array of length n has valid indices 0 through n - 1.";
    code = "int[] values = {7, 1, 8, 3, 5};";
  } else if (variant === "grid-cell") {
    prompt = "Goal: Replace the value in row 1, column 2 with 9.";
    answer = "grid[1][2] = 9;";
    wrong = ["grid[2][1] = 9;", "grid[1, 2] = 9;", "grid[1][2] == 9;"];
    explanation = "A 2D array uses grid[row][column], and = assigns the new value.";
    code = "int[][] grid = {{1, 2, 3}, {4, 5, 6}};";
  } else {
    prompt = "Goal: Save values[1] in temp before overwriting that cell during a swap.";
    answer = "int temp = values[1];";
    wrong = ["int temp = values[3];", "values[1] = values[3];", "int temp == values[1];"];
    explanation = "The original value at index 1 must be saved before that cell is overwritten.";
    code = "int[] values = {3, 6, 9, 12};";
  }
  const question = base("reverse", variant, "choice", code, prompt, explanation);
  return {...question, choices: shuffle([answer, ...wrong]), answer, correctAnswer: answer};
}

export const formatFamilies = {
  element: ["literal", "last", "from-end", "expression"],
  "predict-update": ["assign", "increment", "decrement", "compound", "copy", "swap", "index-expression"],
  "perform-update": ["assign", "compound", "copy", "increment", "swap"],
  search: ["first", "last", "count", "exists", "minimum", "maximum", "missing"],
  traversal: ["count", "sum-selected", "maximum", "minimum", "reverse-digits", "skip-first", "skip-last"],
  "access-2d": ["literal", "last-cell", "row-expression", "column-expression"],
  "update-2d": ["assign", "copy", "compound", "row-sum", "column-sum", "swap"],
  nested: ["count", "sum-all", "row-sum", "column-sum", "execution-count", "conditional-update"],
  reverse: ["last-zero", "first-copy", "increment-last", "valid-last", "grid-cell", "swap"],
  ...advancedFormatFamilies,
};
const generators = {
  element: elementChallenge,
  "predict-update": predictUpdateChallenge,
  "perform-update": performUpdateChallenge,
  search: searchChallenge,
  traversal: traversalChallenge,
  "access-2d": access2dChallenge,
  "update-2d": update2dChallenge,
  nested: nestedChallenge,
  reverse: reverseChallenge,
};

export function generateArray(format = "mixed", forcedVariant, options = {}) {
  if(!forcedVariant && options.difficulty && !options.legacy){
    const q=generateCompositionalArray(format,options);q.formatName=formatNames[q.format];q.topicTitle=q.formatName;return q;
  }
  const selected = format === "mixed" ? pick(Object.keys(formatNames)) : format;
  if (!generators[selected] && !advancedFormatFamilies[selected]) throw Error("Unknown Array Lab format");
  if (advancedFormatFamilies[selected]) {
    const difficulty = options.difficulty || "Beginner";
    let question;
    for (let attempt = 0; attempt < 24; attempt++) {
      const seed = options.seed == null ? undefined : (Number(options.seed) + attempt) >>> 0;
      question = generateAdvancedArray(selected, difficulty, seed, forcedVariant);
      const signature = `${question.prompt}\n${question.code}`;
      if (!options.history || !options.history.has(signature)) {
        if (options.history) options.history.add(signature);
        return question;
      }
    }
    return question;
  }
  const question = generators[selected](forcedVariant);
  if (!formatFamilies[selected].includes(question.variant)) throw Error("Unknown Array Lab variant");
  return question;
}

// Historical family fixtures remain testable without constraining the new registry.
export function generateLegacyArray(format,forcedVariant,options={}) { return generateArray(format,forcedVariant,{...options,legacy:true}); }

export function assessArray(question, response) {
  if (question.kind === "choice") return response.answer === question.answer;
  if (question.kind === "cell" || question.kind === "cell-2d") return response.cell === question.correctCell;
  if (question.kind === "apply" && response.cell!=null) return question.correctCells.includes(response.cell);
  if (question.kind === "swap" && response.cells) return response.cells.length===2&&new Set(response.cells).size===2&&response.cells.every(c=>question.correctCells.includes(c));
  if (question.kind === "apply" || question.kind === "swap")
    return JSON.stringify(response.state) === JSON.stringify(question.answerState);
  return false;
}

export function solutionArray(question) {
  if (question.kind === "choice") return {answer: question.answer};
  if (question.kind === "cell" || question.kind === "cell-2d") return {cell: question.correctCell};
  return {state: question.answerState};
}

export function exportArrayQuestion(question) {
  return {
    game: question.game,
    mode: question.format,
    difficulty: question.difficulty || null,
    skill: question.skill || question.topic,
    family: question.family || question.variant,
    reasoningModel: question.reasoningModel || question.family || question.variant,
    structuralVariant: question.structuralVariant ?? null,
    semanticFingerprint: question.repetitionKey || null,
    seed: question.seed ?? null,
    question: question.prompt,
    code: question.code,
    arrayData: question.arrayData ?? question.values ?? question.grid ?? null,
    answerChoices: [...(question.choices || [])],
    correctAnswer: question.answer ?? question.correctAnswer,
    correctIndex: question.choices?.indexOf(question.answer) ?? null,
    explanation: question.explanation,
    trace: question.trace || [],
  };
}
