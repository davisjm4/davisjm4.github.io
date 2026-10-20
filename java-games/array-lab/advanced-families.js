/* Procedural allocation/reference, in-place, and 2D algorithm challenges.
   The simulator below is the answer source; generation remains DOM independent. */
const makeRng = (seed) => {
  let state = Number(seed) >>> 0;
  state = Math.imul(state ^ (state >>> 16), 0x45d9f3b) >>> 0;
  state = Math.imul(state ^ (state >>> 16), 0x45d9f3b) >>> 0;
  state = (state ^ (state >>> 16)) >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const rng = (seed) => {
  const random = makeRng(seed ?? ((Math.random() * 0xffffffff) >>> 0));
  return { seed: seed ?? 0, int: (a, b) => a + Math.floor(random() * (b - a + 1)), pick: (a) => a[Math.floor(random() * a.length)], shuffle(a) {
    const out = [...a]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out;
  }};
};
const families = {
  "create-references": ["primitive-default", "reference-default", "length-and-index", "alias-mutation", "reassign-reference", "method-mutation", "parameter-reassignment", "returned-reference", "separate-arrays", "negative-length", "uninitialized-local", "invalid-boundary-access", "reference-equality"],
  "in-place": ["shift-left", "shift-right", "reverse-step", "reverse-complete", "rotate-left", "rotate-right", "conditional-swap", "compact-filter", "reverse-section"],
  "trace-2d": ["grid-search", "grid-count", "minimum-coordinate", "maximum-row-sum", "minimum-column-sum", "traversal-order", "diagonal-sum", "neighbor-count", "swap-rows", "conditional-grid-update"],
};
const labels = {"create-references":"Create Arrays & Trace References", "in-place":"In-Place Array Algorithms", "trace-2d":"Trace 2D Array Algorithms"};
const clone = (x) => JSON.parse(JSON.stringify(x));
const codeGrid = (g) => `int[][] grid = {\n${g.map((r) => `    {${r.join(", ")}}`).join(",\n")}\n};`;
const codeArray = (name, a) => `int[] ${name} = {${a.join(", ")}};`;
function options(r, answer, wrong, challenge) {
  const correct = String(answer), unique = [...new Set(wrong.map(String))].filter((x) => x !== correct);
  if (typeof answer === "number") for (const v of [answer + 1, answer - 1, answer + 2, answer - 2, answer * 2, 0, -1]) if (String(v) !== correct && !unique.includes(String(v))) unique.push(String(v));
  const candidates = [];
  if (correct === "null") candidates.push("0", "false", '"null"', '""');
  const coordinate = correct.match(/^\((-?\d+), (-?\d+)\)$/);
  if (coordinate) {
    const [, row, col] = coordinate.map(Number);
    candidates.push(`(${row}, ${col + 1})`, `(${row + 1}, ${col})`, `(${col}, ${row})`, "(-1, -1)", `(0, 0)`);
  }
  if (challenge?.format === "in-place" && Array.isArray(challenge.values)) {
    const source = challenge.values, versions = [source.slice().reverse(), [...source.slice(1), source[0]], [...source.slice(-1), ...source.slice(0, -1)]];
    for (const next of versions) candidates.push(`{${next.join(", ")}}`);
    const changed = [...source]; changed[0] += 1; candidates.push(`{${changed.join(", ")}}`);
    if (challenge.variant === "compact-filter") {
      const write = Number(correct.match(/write=(\d+)/)?.[1] || 0);
      candidates.push(`{${source.slice(0, write).join(", ")}} (write=${source.length})`, `{${source.slice(0, Math.max(0, write - 1)).join(", ")}} (write=${Math.max(0, write - 1)})`);
    }
  }
  if (correct.includes(" ") && /^-?\d+(?: -?\d+)+$/.test(correct)) candidates.push(correct.split(" ").reverse().join(" "), `${correct} 0`, correct.split(" ").slice(1).concat(correct.split(" ")[0]).join(" "));
  if (Array.isArray(challenge?.grid)) {
    const g = challenge.grid;
    candidates.push(`(${Math.min(g.length - 1, 1)}, 0)`, `(0, ${Math.min(g[0].length - 1, 1)})`, `(${g.length - 1}, ${g[0].length - 1})`, "(-1, -1)");
  }
  if (correct === "true") candidates.push("false", "0", "null");
  if (correct === "false") candidates.push("true", "0", "null");
  candidates.push(`${correct} (incorrect boundary)`, `Not ${correct}`, "No matching value");
  for (const value of candidates.map(String)) if (value !== correct && !unique.includes(value)) unique.push(value);
  if (unique.length < 3) throw Error(`Could not create three distinct distractors for ${challenge?.format}/${challenge?.variant}: ${correct}`);
  return r.shuffle([correct, ...unique.slice(0, 3)]);
}
function build(format, variant, difficulty, seed) {
  const r = rng(seed), level = {Beginner: 0, Intermediate: 1, Advanced: 2}[difficulty] ?? 0;
  const len = r.int(3 + level * 2, 5 + level * 3), values = Array.from({length: len}, () => r.int(-4, 14));
  let code = "", prompt = "", answer, wrong = [], explanation = "", state = null, grid = null, rows, columns, trace = [];
  if (format === "create-references") {
    const valueType = r.pick(["int", "double", "boolean", "String"]);
    const defaults = {int: "0", double: "0.0", boolean: "false", String: "null"};
    let arrayData = null;
    if (variant === "primitive-default" || variant === "reference-default") {
      const type = variant === "primitive-default" ? r.pick(["int", "double", "boolean"]) : "String";
      const name = r.pick(["items", "data", "values", "scores", "records"]), size = r.int(3, 12), index = r.int(0, size - 1);
      code = `${type}[] ${name} = new ${type}[${size}];\nSystem.out.println(${name}[${index}]);`;
      arrayData = {type, length: size, elements: Array(size).fill(defaults[type])};
      answer = defaults[type]; wrong = type === "int" ? ["null", "1", String(size)] : type === "double" ? ["null", "0", "1.0"] : type === "boolean" ? ["null", "true", "0"] : ['"null"', '""', "0"];
      prompt = `What does this code print for ${name}[${index}]?`;
      explanation = `A new ${type}[] initializes every element to ${defaults[type]}; index ${index} exists because it is below length ${size}.`;
    } else if (variant === "length-and-index") {
      const size = r.int(0, 12), ask = r.pick(["length", "last", "empty"]), name = r.pick(["items", "data", "values", "scores", "numbers"]);
      code = `int[] ${name} = new int[${size}];`;
      arrayData = {type: "int", length: size, elements: Array(size).fill(0)};
      answer = ask === "length" ? size : ask === "last" ? (size ? size - 1 : "No valid index") : size === 0 ? "false" : "true";
      prompt = ask === "length" ? `What is ${name}.length?` : ask === "last" ? `What is the last valid index for ${name}?` : `Does ${name} have a valid index 0?`;
      if (ask === "empty") { answer = size > 0 ? "true" : "false"; wrong = [String(size === 0), "null", "0"]; }
      else wrong = [size - 1, size + 1, 0];
      explanation = size === 0 ? "The allocated array has length 0, so it has no valid element index." : `Length is ${size}; valid indexes range from 0 through ${size - 1}.`;
    } else if (variant === "negative-length") {
      const size = -r.int(1, 15), name = r.pick(["items", "data", "values", "scores", "records"]), type = r.pick(["int", "double", "boolean", "String"]);
      code = `int size = ${size};\n${type}[] ${name} = new ${type}[size];`;
      answer = "Runtime exception: NegativeArraySizeException"; wrong = ["Compile-time error", "An empty array with length 0", "ArrayIndexOutOfBoundsException"];
      prompt = "What happens when this allocation executes?"; explanation = "The syntax compiles, but array lengths cannot be negative; execution throws NegativeArraySizeException at the allocation.";
      arrayData = {type: "int", requestedLength: size, outcome: "NegativeArraySizeException"};
    } else if (variant === "uninitialized-local") {
      const type = r.pick(["int", "double", "boolean", "String"]), name = r.pick(["items", "data", "values", "records", "scores"]), pattern = r.int(0, 2);
      const create = `new ${type}[2]`;
      code = pattern === 0
        ? `${type}[] ${name};\nSystem.out.println(${name}.length);`
        : pattern === 1
          ? `boolean ready = ${r.pick(["true", "false"])};\n${type}[] ${name};\nif (ready) ${name} = ${create};\nSystem.out.println(${name}.length);`
          : `${type}[] ${name};\nfor (int i = 0; i < 1; i++) {\n    ${name} = ${create};\n}\nSystem.out.println(${name}.length);`;
      answer = `Compile-time error: ${name} might not have been initialized`; wrong = ["Prints 0", "Throws NullPointerException", "Creates an empty array"];
      prompt = "Does this snippet compile, and if not, why?"; explanation = `A local reference variable ${name} has no default value. Java rejects its use before assignment during compilation; it does not get an automatic null value.`;
      arrayData = {reference: name, initialized: false, outcome: "compile-time error"};
    } else if (variant === "invalid-boundary-access") {
      const type = r.pick(["int", "double", "boolean"]), size = r.int(0, 8), name = r.pick(["items", "data", "values", "scores"]), useLength = r.pick([true,false]);
      code = `${type}[] ${name} = new ${type}[${size}];\nSystem.out.println(${name}[${useLength ? `${name}.length` : size}]);`;
      answer = "Runtime exception: ArrayIndexOutOfBoundsException"; wrong = ["Prints 0", "Compile-time error", "Prints null"];
      prompt = "What happens when this code runs?"; explanation = size === 0 ? "The allocation is valid and creates length 0, but index 0 is not valid because the array has no elements. Access throws ArrayIndexOutOfBoundsException." : `The valid indexes stop at ${size - 1}. The attempted index ${useLength ? `${name}.length` : size} evaluates to ${size}, which is outside the array, so access throws ArrayIndexOutOfBoundsException.`;
      arrayData = {type, length: size, elements: Array(size).fill(defaults[type]), accessedIndex: size, outcome: "ArrayIndexOutOfBoundsException"};
    } else if (variant === "alias-mutation") {
      const a = Array.from({length: 3 + level * 2}, () => r.int(1, 29)), index = r.int(0, a.length - 1), val = r.int(31, 49);
      code = `int[] a = {${a.join(", ")}};\nint[] b = a;\nb[${index}] = ${val};\nSystem.out.println(a[${index}]);`;
      arrayData = {a: [...a], bAliases: "a", index, assignedValue: val};
      answer = val; wrong = [a[index], index, "false"]; prompt = `What value prints, and did a change?`;
      explanation = `b and a refer to the same array. Mutating b[${index}] also changes a[${index}] to ${val}.`;
    } else if (variant === "reassign-reference" || variant === "separate-arrays") {
      const a = Array.from({length: 3 + level * 2}, () => r.int(1, 29)), b = [...a], index = r.int(0, a.length - 1), val = r.int(31, 49);
      code = variant === "reassign-reference" ? `int[] a = {${a.join(", ")}};\nint[] b = a;\nb = new int[]{${b.join(", ")}};\nb[${index}] = ${val};\nSystem.out.println(a[${index}]);` : `int[] a = {${a.join(", ")}};\nint[] b = {${b.join(", ")}};\nb[${index}] = ${val};\nSystem.out.println(a[${index}]);`;
      arrayData = {a: [...a], b: [...b], index, assignedValue: val, initiallyAliased: variant === "reassign-reference"};
      answer = a[index]; wrong = [val, b[index], "null"]; prompt = "What value prints from a?";
      explanation = variant === "reassign-reference" ? `After b is reassigned to a new array, it no longer aliases a; the original a[${index}] remains ${a[index]}.` : `These are separate array objects with initially equal contents; changing b leaves a[${index}] at ${a[index]}.`;
    } else if (variant === "method-mutation" || variant === "parameter-reassignment") {
      const a = Array.from({length: 3 + level * 2}, () => r.int(1, 29)), index = r.int(0, a.length - 1), val = r.int(31, 49);
      code = variant === "method-mutation" ? `public static void change(int[] values) {\n    values[${index}] = ${val};\n}\nint[] data = {${a.join(", ")}};\nchange(data);\nSystem.out.println(data[${index}]);` : `public static void change(int[] values) {\n    values = new int[]{${val}, ${val + 1}};\n}\nint[] data = {${a.join(", ")}};\nchange(data);\nSystem.out.println(data[${index}]);`;
      arrayData = {data: [...a], index, assignedValue: val, parameterMutation: variant === "method-mutation"};
      answer = variant === "method-mutation" ? val : a[index]; wrong = [a[index], val, "null"]; prompt = `What value prints from data[${index}]?`;
      explanation = variant === "method-mutation" ? `The parameter receives a copy of the reference to the same array. Mutating that array is visible to the caller.` : `Reassigning the local parameter changes only its copied reference; data still refers to the original array.`;
    } else if (variant === "reference-equality") {
      const a = Array.from({length: 3 + level * 2}, () => r.int(0, 20));
      code = `int[] first = {${a.join(", ")}};\nint[] second = {${a.join(", ")}};\nint[] alias = first;\nSystem.out.print((first == second) + "," + (first == alias));`;
      answer = "false,true"; wrong = ["true,false", "true,true", "false,false"];
      prompt = "What pair prints: (first == second), then (first == alias)?";
      explanation = "first and second were created by separate array initializers, so their references differ even though their contents match. alias receives first's reference, so that comparison is true.";
      arrayData = {first: [...a], second: [...a], aliasOf: "first", referenceEquality: [false, true]};
    } else {
      const a = Array.from({length: 3 + level * 2}, () => r.int(2, 29)), index = r.int(0, a.length - 1), val = r.int(31, 49);
      code = `public static int[] change(int[] input) {\n    input[${index}] = ${val};\n    return input;\n}\nint[] first = {${a.join(", ")}};\nint[] second = change(first);\nSystem.out.println(first == second);`;
      arrayData = {first: [...a], index, assignedValue: val, returnedSameReference: true};
      answer = "true"; wrong = ["false", "null", String(val)]; prompt = "What does the reference comparison print?";
      explanation = "The method returns the same array object it received, so first and second refer to the identical array.";
    }
    return finish({format, variant, difficulty, seed: r.seed, code, prompt, answer, wrong, explanation, state, trace, data: {type: valueType}, arrayData} , r);
  }
  if (format === "in-place") {
    const a = values.slice(0, Math.max(3, len)); state = [...a]; let steps = 0;
    if (variant === "shift-left") {
      const start = r.int(0, a.length - 2); code = `${codeArray("values", a)}\nfor (int i = ${start}; i < values.length - 1; i++) {\n    values[i] = values[i + 1];\n}\nvalues[values.length - 1] = 0;`;
      for (let i = start; i < state.length - 1; i++) { state[i] = state[i + 1]; steps++; } state[state.length - 1] = 0;
      prompt = `What is the array after shifting left starting at index ${start}?`; explanation = `Each assignment copies the next cell left; the final cell is explicitly set to 0. Final state: {${state.join(", ")}}.`;
    } else if (variant === "shift-right") {
      const start = r.int(1, a.length - 1), value = r.int(25, 39); code = `${codeArray("values", a)}\nfor (int i = values.length - 1; i > ${start}; i--) {\n    values[i] = values[i - 1];\n}\nvalues[${start}] = ${value};`;
      for (let i = state.length - 1; i > start; i--) { state[i] = state[i - 1]; steps++; } state[start] = value;
      prompt = `What is the final array after inserting ${value} at index ${start} by shifting right?`; explanation = `The loop moves from right to left so each source value is read before it can be overwritten. Final state: {${state.join(", ")}}.`;
    } else if (variant === "reverse-step" || variant === "reverse-complete") {
      const left = variant === "reverse-step" ? 0 : r.int(0, 1), right = variant === "reverse-step" ? a.length - 1 : r.int(Math.max(left + 1, a.length - 2), a.length - 1);
      code = variant === "reverse-step"
        ? `${codeArray("values", a)}\nint left = ${left};\nint right = ${right};\nint temp = values[left];\nvalues[left] = values[right];\nvalues[right] = temp;`
        : `${codeArray("values", a)}\nint left = ${left}, right = ${right};\nwhile (left < right) {\n    int temp = values[left];\n    values[left] = values[right];\n    values[right] = temp;\n    left++;\n    right--;\n}`;
      if (variant === "reverse-step") [state[left], state[right]] = [state[right], state[left]];
      else for (let l = left, rr = right; l < rr; l++, rr--) [state[l], state[rr]] = [state[rr], state[l]];
      prompt = variant === "reverse-step" ? "What is the array immediately after this swap?" : `What is the array after reversing indexes ${left} through ${right}?`;
      explanation = `The temporary variable preserves the left value while the endpoints exchange. State: {${state.join(", ")}}.`;
    } else if (variant === "rotate-left" || variant === "rotate-right") {
      const requested = r.int(1, a.length * (level === 0 ? 1 : 2) + (level === 2 ? 3 : 0)), k = requested % a.length, left = variant === "rotate-left";
      state = left ? [...a.slice(k), ...a.slice(0, k)] : [...a.slice(-k), ...a.slice(0, -k)];
      if (level < 2) {
        code = `${codeArray("values", a)}\nint steps = ${requested};\nfor (int step = 0; step < steps; step++) {\n    ${left ? "int first = values[0];\n    for (int i = 0; i < values.length - 1; i++) values[i] = values[i + 1];\n    values[values.length - 1] = first;" : "int last = values[values.length - 1];\n    for (int i = values.length - 1; i > 0; i--) values[i] = values[i - 1];\n    values[0] = last;"}\n}`;
        explanation = `Each pass saves the value that wraps around before shifting the other values. ${requested} steps have an effective rotation of ${k} (mod ${a.length}); final state: {${state.join(", ")}}.`;
      } else {
        const reverse = (lo, hi) => `left = ${lo};\nright = ${hi};\nwhile (left < right) {\n    int temp = values[left];\n    values[left] = values[right];\n    values[right] = temp;\n    left++;\n    right--;\n}`;
        const steps = left ? [reverse(0, k - 1), reverse(k, a.length - 1), reverse(0, a.length - 1)] : [reverse(0, a.length - 1), reverse(0, k - 1), reverse(k, a.length - 1)];
        code = `${codeArray("values", a)}\nint steps = ${requested} % values.length;\nint left, right;\n${steps.join("\n")}`;
        explanation = `Three in-place reversals rotate the array without allocating a replacement. ${requested} steps reduce to ${k} (mod ${a.length}); result: {${state.join(", ")}}.`;
      }
      prompt = `What is the array after rotating ${left ? "left" : "right"} in place by ${requested} step(s)?`;
    } else if (variant === "conditional-swap") {
      const i = r.int(0, a.length - 2), j = i + 1; code = `${codeArray("values", a)}\nif (values[${i}] > values[${j}]) {\n    int temp = values[${i}];\n    values[${i}] = values[${j}];\n    values[${j}] = temp;\n}`;
      if (state[i] > state[j]) [state[i], state[j]] = [state[j], state[i]];
      prompt = `What is the array after the conditional adjacent swap?`; explanation = `The condition is ${a[i]} > ${a[j]} (${a[i] > a[j]}), so ${a[i] > a[j] ? "the values exchange" : "no values exchange"}. Result: {${state.join(", ")}}.`;
    } else if (variant === "compact-filter") {
      const threshold = r.int(4, 10), kept = a.filter((x) => x >= threshold); let write = 0;
      code = `${codeArray("values", a)}\nint write = 0;\nfor (int read = 0; read < values.length; read++) {\n    if (values[read] >= ${threshold}) {\n        values[write] = values[read];\n        write++;\n    }\n}`;
      for (const v of a) if (v >= threshold) state[write++] = v;
      answer = `{${state.slice(0, kept.length).join(", ")}} (write=${kept.length})`;
      prompt = `Which values are retained in order in values[0..write), and what is write?`;
      explanation = `Values at least ${threshold} are copied forward in their original order. Only the prefix of length ${kept.length} is meaningful: ${answer}. The remaining cells are not cleared.`;
      wrong = [`{${kept.slice().reverse().join(", ")}} (write=${kept.length})`, `{${a.filter((x) => x < threshold).join(", ")}} (write=${a.filter((x) => x < threshold).length})`, `{${kept.join(", ")}} (write=${a.length})`];
    } else {
      const left = 0, right = a.length - 1; state.reverse(); code = `${codeArray("values", a)}\nint left = 1;\nint right = values.length - 2;\nwhile (left < right) {\n    int temp = values[left];\n    values[left] = values[right];\n    values[right] = temp;\n    left++;\n    right--;\n}`;
      state = [...a]; for (let l=1, rr=a.length-2; l<rr; l++,rr--) [state[l],state[rr]]=[state[rr],state[l]];
      prompt = "What is the array after reversing only the interior section?"; explanation = `Indexes 1 through ${a.length - 2} reverse; the endpoints stay in place. Result: {${state.join(", ")}}.`;
    }
    if (variant !== "compact-filter") { answer = `{${state.join(", ")}}`; wrong = [`{${[...state].reverse().join(", ")}}`, `{${a.join(", ")}}`, `{${state.map((v, i) => i === 0 ? v : state[i - 1]).join(", ")}}`]; }
    trace = [{state: a}, {state}];
    return finish({format, variant, difficulty, seed: r.seed, code, prompt, answer, wrong, explanation, state, trace, values: a});
  }
  // Two-dimensional algorithms.
  rows = r.int(2 + (level === 2 ? 1 : 0), 3 + level), columns = r.int(2, 4 + level);
  grid = Array.from({length: rows}, () => Array.from({length: columns}, () => r.int(-6, 18)));
  const originalGrid = clone(grid);
  const flat = grid.flat();
  if (variant === "grid-search") {
    const target = r.pick(flat), matches = []; grid.forEach((row,ri)=>row.forEach((v,ci)=>{if(v===target)matches.push([ri,ci]);}));
    const last = r.pick([true, false]), found = last ? matches.at(-1) : matches[0];
    code = `${codeGrid(originalGrid)}\nint foundRow = -1, foundCol = -1;\nfor (int row = 0; row < grid.length${last ? "" : " && foundRow == -1"}; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        if (grid[row][col] == ${target}) {\n            foundRow = row; foundCol = col;\n            ${last ? "" : "break;"}\n        }\n    }\n}`;
    answer = `(${found[0]}, ${found[1]})`; wrong = [`(${matches[0][0]}, ${matches[0][1]})`, `(${found[1]}, ${found[0]})`, "(-1, -1)"];
    prompt = `What coordinate remains for the ${last ? "last" : "first"} ${target} in row-major traversal?`; explanation = `The loops visit row by row. ${last ? "Assignments continue through every match" : "The first match is kept"}, giving [${found[0]}][${found[1]}].`;
  } else if (variant === "grid-count") {
    const target = r.pick(flat); answer = flat.filter(v=>v===target).length;
    code = `${codeGrid(grid)}\nint count = 0;\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        if (grid[row][col] == ${target}) count++;\n    }\n}`;
    wrong = [answer-1, answer+1, rows*columns]; prompt = `How many cells equal ${target}?`; explanation = `Each cell is checked once in row-major order; ${answer} cells match.`;
  } else if (variant === "minimum-coordinate" || variant === "maximum-row-sum") {
    if (variant === "minimum-coordinate") {
      const value = Math.min(...flat), [row,col] = grid.flatMap((rr,ri)=>rr.map((v,ci)=>[v,ri,ci])).find(x=>x[0]===value).slice(1);
      answer=`(${row}, ${col})`; wrong=[`(${col}, ${row})`, `(0, 0)`, `(${rows-1}, ${columns-1})`]; prompt="What is the first row-major coordinate containing the minimum value?";
      code=`${codeGrid(grid)}\nint min = grid[0][0], minRow = 0, minCol = 0;\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        if (grid[row][col] < min) { min = grid[row][col]; minRow = row; minCol = col; }\n    }\n}`;
      explanation=`The scan updates only for a strictly smaller value, so the first row-major minimum is at [${row}][${col}].`;
    } else {
      const sums=grid.map(row=>row.reduce((x,y)=>x+y,0)), best=Math.max(...sums), row=sums.indexOf(best); answer=row; wrong=[sums.indexOf(Math.min(...sums)), row===0?1:0, columns];
      code=`${codeGrid(grid)}\nint bestRow = 0;\nfor (int row = 1; row < grid.length; row++) {\n    int sum = 0;\n    for (int col = 0; col < grid[row].length; col++) sum += grid[row][col];\n    int best = 0;\n    for (int col = 0; col < grid[bestRow].length; col++) best += grid[bestRow][col];\n    if (sum > best) bestRow = row;\n}`;
      prompt="Which row has the greatest sum?"; explanation=`Row sums are ${sums.join(", ")}; row ${row} has the greatest total (${best}).`;
    }
  } else if (variant === "minimum-column-sum") {
    const sums=Array.from({length:columns},(_,c)=>grid.reduce((s,row)=>s+row[c],0)), best=Math.min(...sums), col=sums.indexOf(best); answer=col; wrong=[sums.indexOf(Math.max(...sums)), (col+1)%columns, rows];
    code=`${codeGrid(grid)}\nint bestCol = 0;\nfor (int col = 1; col < grid[0].length; col++) {\n    int sum = 0;\n    for (int row = 0; row < grid.length; row++) sum += grid[row][col];\n    int best = 0;\n    for (int row = 0; row < grid.length; row++) best += grid[row][bestCol];\n    if (sum < best) bestCol = col;\n}`; prompt="Which column has the smallest sum?"; explanation=`Column sums are ${sums.join(", ")}; column ${col} has the smallest total (${best}).`;
  } else if (variant === "traversal-order") {
    const columnMajor=r.pick([true,false]), visit=columnMajor?grid[0].map((_,c)=>grid.map(row=>row[c])).flat():flat; answer=`${visit.join(" ")}`; wrong=[`${flat.slice().reverse().join(" ")}`, `${grid.map(row=>[...row].reverse()).flat().join(" ")}`, `${grid[0].map((_,c)=>grid.map(row=>row[c])).flat().reverse().join(" ")}`];
    code=columnMajor?`${codeGrid(grid)}\nfor (int col = 0; col < grid[0].length; col++) {\n    for (int row = 0; row < grid.length; row++) {\n        System.out.print(grid[row][col] + " ");\n    }\n}`:`${codeGrid(grid)}\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        System.out.print(grid[row][col] + " ");\n    }\n}`; prompt="What values are printed, in order?"; explanation=`The outer loop changes ${columnMajor?"column":"row"} first, so the traversal order is ${columnMajor?"column-major":"row-major"}.`;
  } else if (variant === "diagonal-sum") {
    const n=r.int(2,4); grid=Array.from({length:n},()=>Array.from({length:n},()=>r.int(-4,15))); rows=columns=n; const secondary=r.pick([true,false]); answer=grid.reduce((s,row,i)=>s+row[secondary?n-1-i:i],0); wrong=[grid.reduce((s,row,i)=>s+row[secondary?i:n-1-i],0),grid.flat().reduce((s,v)=>s+v,0),0];
    code=`${codeGrid(grid)}\nint sum = 0;\nfor (int i = 0; i < grid.length; i++) {\n    sum += grid[i][${secondary?"grid.length - 1 - i":"i"}];\n}`; prompt=`What is the ${secondary?"secondary":"main"} diagonal sum?`; explanation=`At each i, the algorithm adds grid[i][${secondary?"length - 1 - i":"i"}]. The total is ${answer}.`;
  } else if (variant === "neighbor-count") {
    const row=r.int(0,rows-1), col=r.int(0,columns-1), neighbors=[[row-1,col],[row+1,col],[row,col-1],[row,col+1]].filter(([rr,cc])=>rr>=0&&rr<rows&&cc>=0&&cc<columns), relation=r.pick([">","<","=="]), center=grid[row][col];
    answer=neighbors.filter(([rr,cc])=>relation==="=="?grid[rr][cc]===center:relation==="<"?grid[rr][cc]<center:grid[rr][cc]>center).length;
    code=`${codeGrid(grid)}\nint count = 0;\nint row = ${row}, col = ${col};\nint center = grid[row][col];\nif (row > 0 && grid[row - 1][col] ${relation} center) count++;\nif (row < grid.length - 1 && grid[row + 1][col] ${relation} center) count++;\nif (col > 0 && grid[row][col - 1] ${relation} center) count++;\nif (col < grid[row].length - 1 && grid[row][col + 1] ${relation} center) count++;`; wrong=[neighbors.length, Math.max(0,answer-1), Math.min(rows,columns)]; prompt=`How many orthogonal neighbors of grid[${row}][${col}] satisfy value ${relation} ${center}?`; explanation=`The && operator checks the boundary before indexing. Only the four orthogonal cells are considered; ${answer} valid neighbor(s) satisfy ${relation} ${center}.`;
  } else if (variant === "swap-rows") {
    const a=0,b=rows-1; [grid[a],grid[b]]=[grid[b],grid[a]]; answer=`row ${a} ↔ row ${b}`; wrong=[`column ${a} ↔ column ${b}`,`row ${a} copied into row ${b}`,"no change"];
      code=`${codeGrid(originalGrid)}\nint[] temp = grid[${a}];\ngrid[${a}] = grid[${b}];\ngrid[${b}] = temp;`; prompt="Which rows are exchanged?"; explanation=`The temporary reference preserves row ${a}, and the row references are exchanged.`;
  } else {
    const threshold=r.int(3,10); let changed=0; grid=grid.map(row=>row.map(v=>{if(v<threshold){changed++;return v+10;}return v;})); answer=changed;
    code=`${codeGrid(originalGrid)}\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        if (grid[row][col] < ${threshold}) grid[row][col] += 10;\n    }\n}`; wrong=[flat.filter(v=>v>=threshold).length,changed+1,rows*columns]; prompt=`How many cells are modified?`; explanation=`The condition is checked on each original cell; ${changed} value(s) are less than ${threshold}.`;
  }
  return finish({format,variant,difficulty,seed:r.seed,code,prompt,answer,wrong,explanation,state:grid,grid,initialGrid:originalGrid,rows,columns,trace:[{grid:originalGrid},{grid}]},r);
}
function finish(q, r = rng(q.seed)) {
  const choices = options(r, q.answer, q.wrong || [], q);
  const normalized = { ...q, game: "array-lab", title: "Array Lab", formatName: labels[q.format], topic: `${q.format}.${q.variant}`, topicTitle: `${labels[q.format]} · ${q.variant.replaceAll("-", " ")}`, skill: `${q.format}.${q.variant}`, family: q.variant, kind: "choice", choices, answer: String(q.answer), correctAnswer: String(q.answer), explanation: q.explanation, values: q.values || q.state, correctState: q.state };
  normalized.arrayData = q.arrayData ?? q.initialGrid ?? q.values ?? (q.grid ? clone(q.grid) : q.data ?? null);
  normalized.trace = q.trace || [];
  const arrayLengths = Array.isArray(normalized.arrayData)
    ? [normalized.arrayData.length]
    : normalized.arrayData && typeof normalized.arrayData === "object"
      ? Object.values(normalized.arrayData).filter(Array.isArray).map((value) => value.length)
      : [];
  normalized.complexity = {
    level: q.difficulty,
    arrayLength: Array.isArray(normalized.arrayData) && !Array.isArray(normalized.arrayData[0]) ? normalized.arrayData.length : undefined,
    elementCount: arrayLengths.length ? Math.max(...arrayLengths) : undefined,
    rows: q.rows, columns: q.columns,
    codeLines: q.code.split("\n").length,
  };
  return normalized;
}
export const advancedFormatFamilies = families;
export function generateAdvancedArray(format, difficulty="Beginner", seed, forcedVariant) {
  if (!Object.hasOwn({Beginner:1, Intermediate:1, Advanced:1}, difficulty)) throw Error(`Unknown difficulty: ${difficulty}`);
  const actualSeed = seed == null ? ((Math.random() * 0xffffffff) >>> 0) : Number(seed) >>> 0;
  const variant = forcedVariant || families[format]?.[Math.floor(makeRng(actualSeed)() * families[format].length)];
  if (!variant) throw Error(`Unknown advanced Array Lab mode: ${format}`);
  if (!families[format].includes(variant)) throw Error(`Unknown family ${variant} for ${format}`);
  return build(format, variant, difficulty, actualSeed);
}
export const simulateAdvancedQuestion = (question) => ({answer: question.answer, state: clone(question.correctState), trace: clone(question.trace)});
