import {
  int,
  pick,
  shuffle,
} from "../csp-games/engine.js?v=platform-expansion-v2";
import { TYPES, scenarioFamilies } from "./variable-scenarios.js?v=variable-lab-v4";
import { generateTrace } from "./variable-lab/trace-engine.js?v=trace-v1";
export const games = {
  "variable-lab": {
    name: "Variable Lab",
    icon: "x",
    description:
      "Identify declaration components, values, and types with selectable Java pieces.",
    concepts: "Types · Declarations · Assignment · Conversions",
    modes: { identify: "Identification", assemble: "Assemble Declaration", trace: "Trace the Variable" },
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
// Assemble scenarios: every family offers one variable of each type, so the
// type is chosen first from a balanced queue and never skewed by the pool.
export const declarationScenarios = scenarioFamilies.flatMap(f => f.items.map(item => ({...item, family: f.id, context: f.context})));
export function generate(game, mode = "mixed", forced, options = {}) {
  const selected =
    mode === "mixed" ? pick(Object.keys(games[game].modes)) : mode;
  if (!games[game].modes[selected]) throw Error("Unknown mode");
  const q = generators[game](selected, forced, options);
  q.game = game;
  q.mode = selected;
  q.code = q.root ? source(q.root) : q.code;
  return q;
}
const hints = {
  "variable-lab": [
    "Separate the data type, variable name, assignment operator, and value.",
    "A declaration introduces a variable; initialization supplies its first value. Later assignment changes that value.",
    "Check how each value is written and whether it fits the data type. An int can widen to a double automatically; casting a double to int drops the fractional part.",
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
      (q.locations || [q.location]).includes(r.location) && (q.validFixes || [q.fix]).includes(r.fix)
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
  if (q.kind === "select") return (q.validIds || [q.answerId]).includes(r.id);
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
/* ---------- Variable Lab ---------- */
// Balanced type queue: each block of 25 holds exactly five of each type. Order
// is random (weighted by what remains), with no type three times in a row and
// no type absent for more than MAX_TYPE_GAP consecutive draws.
const MAX_TYPE_GAP = 9;
export function createTypeQueue(types = TYPES, perBlock = 5) {
  let remaining = {}, history = [], since = Object.fromEntries(types.map(t => [t, 0]));
  const refill = () => { remaining = Object.fromEntries(types.map(t => [t, perBlock])); };
  refill();
  return {
    next() {
      if (types.every(t => !remaining[t])) refill();
      const available = types.filter(t => remaining[t] > 0);
      const overdue = available.filter(t => since[t] >= MAX_TYPE_GAP).sort((x, y) => since[y] - since[x]);
      let pool = overdue.length ? [overdue[0]]
        : available.filter(t => !(history.at(-1) === t && history.at(-2) === t));
      if (!pool.length) pool = available;
      let r = Math.random() * pool.reduce((sum, t) => sum + remaining[t], 0), chosen = pool.at(-1);
      for (const t of pool) { r -= remaining[t]; if (r < 0) { chosen = t; break; } }
      remaining[chosen]--;
      history = [...history.slice(-1), chosen];
      for (const t of types) since[t] = t === chosen ? 0 : since[t] + 1;
      return chosen;
    },
  };
}
const assembleTypes = createTypeQueue(), identifyTypes = createTypeQueue();
let recentFamilies = [], recentItems = [], lastIdentifyVariant = null, lastTraceFamily = null;
export function resetVariableLabState() {
  Object.assign(assembleTypes, createTypeQueue());
  Object.assign(identifyTypes, createTypeQueue());
  recentFamilies = []; recentItems = []; lastIdentifyVariant = null; lastTraceFamily = null;
}
// Pick a scenario for a type chosen first. Recently used families and items are
// avoided so contexts rotate across all families.
function scenarioFor(type) {
  const candidates = scenarioFamilies.flatMap(f => f.items.filter(i => i.type === type).map(item => ({family: f, item})));
  let pool = candidates.filter(c => !recentFamilies.includes(c.family.id) && !recentItems.includes(c.item.name));
  if (!pool.length) pool = candidates.filter(c => !recentFamilies.includes(c.family.id));
  if (!pool.length) pool = candidates;
  const chosen = pick(pool);
  recentFamilies = [...recentFamilies, chosen.family.id].slice(-6);
  recentItems = [...recentItems, chosen.item.name].slice(-30);
  return chosen;
}
const withCommas = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
// Returns the Java literal, the plain-English form used in prompts, and plausible
// wrong literals that reflect common beginner mistakes.
export function scenarioValue(item) {
  if (item.type === "int") {
    const n = int(item.range[0], item.range[1]), spoken = n >= 1000 ? withCommas(n) : String(n);
    const sentence = item.say(spoken);
    return {literal: String(n), spoken, sentence, wrong: [`"${n}"`, `${n}.0`,
      sentence.includes(spoken + "%") ? `${n}%` : n >= 1000 ? withCommas(n) : n >= 10 ? `'${n}'` : words[n]]};
  }
  if (item.type === "double") {
    const [min, max, step] = item.range, places = item.money ? 2 : (String(step).split(".")[1] || "").length;
    let literal;
    do literal = (min + int(0, Math.round((max - min) / step)) * step).toFixed(places);
    while (Number(literal) % 1 === 0);
    return {literal, spoken: literal, sentence: item.say(literal), wrong: [`"${literal}"`, literal.replace(".", ","),
      item.money ? `$${literal}` : String(Math.trunc(Number(literal)))]};
  }
  if (item.type === "boolean") {
    const v = pick([true, false]), literal = String(v);
    return {literal, spoken: literal, sentence: item.say(v), wrong: [`"${literal}"`, v ? "True" : "False", String(!v)]};
  }
  if (item.type === "String") {
    const text = pick(item.texts);
    return {literal: `"${text}"`, spoken: text, sentence: item.say(text), wrong: [`'${text}'`, text,
      /[A-Z]/.test(text) ? `"${text.toLowerCase()}"` : `"${text}`]};
  }
  const [c, spoken] = pick(item.chars), word = spoken.match(/\((?:for )?([A-Za-z]+)\)/)?.[1];
  return {literal: `'${c}'`, spoken, sentence: item.say(spoken), wrong: [`"${c}"`, c,
    word ? `'${word}'` : /[A-Z]/.test(c) ? `'${c.toLowerCase()}'` : `'${spoken.replace(/^the | sign$/g, "")}'`]};
}
const typeReason = {
  int: "int stores whole numbers.", double: "double stores numbers with a decimal part.",
  boolean: "boolean stores true or false, written in lowercase without quotes.",
  char: "char stores exactly one character, written in single quotes.",
  String: "String stores text, written in double quotes.",
};
function assembleChallenge() {
  const type = assembleTypes.next(), {family, item} = scenarioFor(type), value = scenarioValue(item);
  const siblings = shuffle(family.items.filter(i => i.name !== item.name).map(i => i.name)).slice(0, 2);
  const malformed = pick([item.name.replace(/([A-Z])/g, " $1").toLowerCase(), item.name.replace(/([A-Z])/g, "-$1").toLowerCase()]);
  const q = {
    kind: "assemble",
    prompt: `${value.sentence} ${item.ask}`,
    convention: "Choose the most appropriate type: int for whole-number quantities, double for decimal quantities, boolean for true/false, char for one character, and String for text.",
    fields: [
      {id: "type", label: "Type", choices: shuffle([...TYPES])},
      {id: "name", label: "Variable name", choices: choices(item.name, [...siblings, malformed])},
      {id: "operator", label: "Operator", choices: shuffle(["=", "==", "!="])},
      {id: "value", label: "Value", choices: choices(value.literal, value.wrong)},
    ],
    answer: {type, name: item.name, operator: "=", value: value.literal},
    scenario: {family: family.id, context: family.context, name: item.name, type, spoken: value.spoken},
    code: "Build the declaration.",
    compilerSource: `public class Practice { public static void main(String[] args) { ${type} ${item.name} = ${value.literal}; } }`,
    explanation: `${type} ${item.name} = ${value.literal}; ${item.why}`,
    topic: "assemble-" + type,
  };
  return q;
}
// Identification uses a declaration from the scenario library and, as a decoy,
// a different-type variable from the same context.
function libraryDeclaration(type) {
  const {family, item} = scenarioFor(type), value = scenarioValue(item);
  const decoyItem = pick(family.items.filter(i => i.type !== type)), decoy = scenarioValue(decoyItem);
  return {type, name: item.name, literal: value.literal, decoy: {type: decoyItem.type, name: decoyItem.name, literal: decoy.literal}};
}
const declarationNode = (prefix, d) => region(prefix ? prefix + "declaration" : "declaration",
  leaf(prefix + "type", d.type), " ", leaf(prefix + "name", d.name), " ", leaf(prefix + "operator", "="), " ", leaf(prefix + "value", d.literal), ";");
export const identifyVariants = ["type", "name", "operator", "value", "declaration", "initialization", "assignment-operator", "assignment", "declaration-only", "stored", "conversion", "compatibility"];
function identifyChallenge(forced) {
  let variant = forced;
  if (!variant) {
    // declaration and initialization share one slot: same target, two phrasings.
    do variant = pick(["type", "name", "operator", "value", pick(["declaration", "initialization"]), "assignment-operator", "assignment", "declaration-only", "stored", "conversion", "compatibility"]);
    while (variant === lastIdentifyVariant);
  }
  lastIdentifyVariant = variant;
  const q = {kind: "select", topic: variant};
  if (["type", "name", "operator", "value", "declaration", "initialization"].includes(variant)) {
    const d = libraryDeclaration(identifyTypes.next()), {type, name, literal} = d;
    q.root = region("snippet", ...shuffle([declarationNode("", d), declarationNode("aux-", d.decoy)]).flatMap(n => [n, "\n"]));
    q.answerId = variant === "initialization" ? "declaration" : variant;
    const statement = `${type} ${name} = ${literal};`;
    Object.assign(q, {
      type: {prompt: `Select the data type of the variable initialized to ${literal}.`, explanation: `${type} is the data type. It tells Java what kind of value ${name} can store: ${typeReason[type]}`},
      name: {prompt: `Select the name of the variable initialized to ${literal}.`, explanation: `${name} is the variable name. It comes right after the data type.`},
      operator: {prompt: `Select the assignment operator in the declaration of ${name}.`, explanation: `= is the assignment operator. It stores the value on its right in the variable on its left.`},
      value: {prompt: `Select the value that ${name} is initialized to.`, explanation: `${literal} is the value ${name} is initialized to. It appears after the assignment operator. ${typeReason[type]}`},
      declaration: {prompt: `Select the declaration of ${name}, including the value it has been initialized to.`, explanation: `${statement} declares ${name} and initializes it in one statement, from the data type through the semicolon.`},
      initialization: {prompt: `Select the declaration and initialization of ${name}.`, explanation: `${statement} declares ${name} and initializes it in one statement, from the data type through the semicolon.`},
    }[variant]);
  } else if (variant === "declaration-only") {
    // Three statements: a declaration without a value, a declaration and
    // initialization, and a later assignment. The prompt names no variable, so
    // students must tell the three statement kinds apart.
    const d = libraryDeclaration(identifyTypes.next()), {type, name, literal, decoy} = d;
    const bare = region("declaration", leaf("type", type), " ", leaf("name", name), ";");
    const assignment = region("assignment", leaf("assigned-name", name), " ", leaf("assignment-operator", "="), " ", leaf("assigned-value", literal), ";");
    const order = pick([[declarationNode("aux-", decoy), bare, assignment], [bare, declarationNode("aux-", decoy), assignment], [bare, assignment, declarationNode("aux-", decoy)]]);
    q.root = region("snippet", ...order.flatMap((n, i) => i ? ["\n", n] : [n]));
    q.answerId = "declaration";
    q.prompt = "Select the declaration that does not initialize its variable.";
    q.explanation = `${type} ${name}; declares ${name} without giving it a value. The later statement ${name} = ${literal}; assigns its value, and ${decoy.type} ${decoy.name} = ${decoy.literal}; declares and initializes in one statement.`;
  } else if (["assignment-operator", "assignment"].includes(variant)) {
    const {type, name, literal} = libraryDeclaration(identifyTypes.next());
    q.root = region("snippet",
      region("declaration", leaf("type", type), " ", leaf("name", name), ";"), "\n",
      region("assignment", leaf("assigned-name", name), " ", leaf("assignment-operator", "="), " ", leaf("assigned-value", literal), ";"));
    q.answerId = variant;
    Object.assign(q, {
      "assignment-operator": {prompt: "Select the assignment operator.", explanation: `= is the assignment operator. In ${name} = ${literal}; it stores ${literal} in ${name}.`},
      assignment: {prompt: "Select the statement that assigns a value to the existing variable.", explanation: `${name} = ${literal}; assigns a value to ${name}, which was already declared on the line above. It does not repeat the data type.`},
    }[variant]);
  } else if (variant === "stored") {
    const item = pick(declarationScenarios.filter(i => i.type === "int" && i.range[1] < 1000));
    const first = int(item.range[0], item.range[1]);
    let next; do next = int(item.range[0], item.range[1]); while (next === first);
    q.root = region("snippet", region("declaration", `int ${item.name} = ${first};`), "\n", region("reassignment", `${item.name} = ${next};`));
    Object.assign(q, {kind: "value", answer: next, choices: choices(next, [first, first + next]),
      prompt: `Select the value stored in ${item.name} after the reassignment.`,
      explanation: `The reassignment replaces ${first} with ${next}. It does not add to the old value or create another variable.`,
      resultVariable: item.name});
  } else if (variant === "conversion") {
    const [from, to] = pick([["precise", "whole"], ["temperature", "wholeDegrees"], ["balance", "wholeDollars"], ["reading", "wholePart"]]);
    const v = pick([-1, 1]) * Number((int(2, 25) + pick([0.1, 0.25, 0.5, 0.6, 0.75, 0.9])).toFixed(2)), answer = Math.trunc(v);
    q.root = region("snippet", region("double-declaration", `double ${from} = ${v};`), "\n", region("cast", `int ${to} = (int) ${from};`));
    const wrong = [...new Set([v, Math.floor(v), Math.round(v), answer + 1, answer - 1].map(String))].filter(x => x !== String(answer));
    Object.assign(q, {kind: "value", answer, choices: choices(answer, wrong.slice(0, 3)),
      prompt: "Select the resulting value after the explicit conversion.",
      explanation: `Casting with (int) drops the fractional part, so ${v} becomes ${answer}. Java truncates toward zero; it does not round${v < 0 ? ", and for a negative number that means moving up toward zero" : ""}.`,
      resultVariable: to});
  } else {
    const conversion = pick(["widening", "narrowing", "same"]), n = int(2, 25);
    const code = conversion === "widening" ? `int points = ${n};\ndouble amount = points;`
      : conversion === "narrowing" ? `double price = ${n}.75;\nint amount = (int) price;`
      : `int points = ${n};\nint amount = points;`;
    q.root = region("snippet", region("conversion-code", code));
    const labels = {widening: "Widening conversion (automatic)", narrowing: "Explicit conversion (casting)", same: "No conversion"};
    Object.assign(q, {kind: "value", answer: labels[conversion], choices: shuffle(Object.values(labels)),
      prompt: "What kind of conversion happens when a value is assigned to amount?",
      explanation: conversion === "widening" ? "An int value can be stored in a double automatically. This widening conversion needs no cast."
        : conversion === "narrowing" ? "Storing a double in an int requires an explicit conversion, the (int) cast, which drops the fractional part."
        : "Both variables are int, so no conversion is needed."});
  }
  q.compilerSource = `public class Practice { public static void main(String[] args) { ${source(q.root)} } }`;
  return q;
}
function variable(mode, forced, options = {}) {
  if (mode === "trace") {
    let q = generateTrace(options);
    if (options.seed === undefined) {
      for (let tries = 0; tries < 5 && q.traceFamily === lastTraceFamily; tries++)
        q = generateTrace(options);
      lastTraceFamily = q.traceFamily;
    }
    return q;
  }
  return mode === "assemble" ? assembleChallenge() : identifyChallenge(forced);
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
    external = forced === "after" || pick([true, false]),
    useWhile = pick([true, false]),
    variable = pick(["i", "index", "counter"]);
  const init = `${external || useWhile ? "" : "int "}${variable} = ${start}`,
    condition = `${variable} ${op} ${bound}`,
    update = `${variable} ${step > 0 ? "+=" : "-="} ${Math.abs(step)}`;
  const scoreStart = int(20, 50), bonus = int(1, 4);
  const body = region("body", "\n    ", region("score-update", leaf("score-variable", "score"), " += ", leaf("bonus-variable", "bonus"), ";"), "\n    ", region("output", "System.out.println(", leaf("output-variable", variable), ");"),
    ...(useWhile ? ["\n    ", region("update", leaf("update-variable", variable), ` ${step > 0 ? "+=" : "-="} ${Math.abs(step)}`), ";"] : []), "\n");
  const conditionNode = region("condition", leaf("control-variable", variable), ` ${op} ${bound}`);
  const control = useWhile
    ? region("loop", "while (", conditionNode, ") {", body, "}")
    : region("loop", "for (", region("initialization", `${external || useWhile ? "" : "int "}`, leaf("initial-variable",variable), ` = ${start}`), "; ", conditionNode, "; ", region("update", leaf("update-variable", variable), ` ${step > 0 ? "+=" : "-="} ${Math.abs(step)}`), ") {", body, "}");
  const declarations = [region("score-declaration", "int ", leaf("score-name", "score"), ` = ${scoreStart};`), region("bonus-declaration", "int ", leaf("bonus-name", "bonus"), ` = ${bonus};`),
    ...(external || useWhile ? [region(useWhile ? "initialization" : "counter-declaration", "int ", leaf("counter-name", variable), ` = ${start};`)] : [])];
  const root = region("snippet", ...shuffle(declarations).flatMap(d=>[d,"\n"]),control);
  let score = scoreStart;
  const state={};
  const frames=[];
  for(const d of root.children.filter(d=>typeof d!=="string" && d.id!=="loop")) {
    if(d.id==="score-declaration") state.score=scoreStart;
    else if(d.id==="bonus-declaration") state.bonus=bonus;
    else state[variable]=start;
    frames.push({line:d.id,variables:{...state},output:"Initialize variable"});
  }
  if(!useWhile) frames.push({line:"initialization",variables:{...state,[variable]:start},output:"Initialize counter"});
  for (const v of trace.values) {
    frames.push(
      {
        line: "condition",
        variables: { [variable]: v, score, bonus },
        output: "Condition is true",
      },
      { line: "score-update", variables: { [variable]: v, score: (score += bonus), bonus }, output: "Update score" },
      { line: "output", variables: { [variable]: v, score, bonus }, output: "Print " + v },
      {
        line: "update",
        variables: { [variable]: v + step, score, bonus },
        output: "Update counter",
      },
    );
  }
  frames.push({
    line: "condition",
    variables: { [variable]: trace.after, score, bonus },
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
      forced || pick(["initialization", "condition", "update", "control-variable", "body", "loop"]);
    q.answerId = part;
    if(part === "control-variable") q.validIds=nodes(root).filter(n=>!n.children && n.text===variable).map(n=>n.id);
    q.topic = part;
    q.prompt = {
      initialization: "Select the initialization of the loop control variable.",
      condition: "Select the loop condition.",
      update: "Select the update statement.",
      body: "Select the entire loop body.",
      "control-variable": "Select the loop control variable.",
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
        "output",
        ...(external || useWhile ? ["after"] : []),
      ]);
    const answer = {
      start,
      step: Math.abs(step),
      last: trace.values.at(-1),
      count: trace.values.length,
      after: trace.after,
      output: trace.values.join(", "),
    }[ask];
    q.kind = "value";
    q.answer = answer;
    const distractors = {
      start: [start+step,start-step,trace.values.at(-1),trace.after],
      step: [Math.abs(step)+1,Math.max(0,Math.abs(step)-1),Math.abs(bound-start)],
      last: [start,trace.after,trace.values.at(-1)-step,bound],
      count: [trace.values.length-1,trace.values.length+1,size* Math.abs(step),start],
      after: [start,trace.values.at(-1),trace.after+step,trace.after-step],
      output: [trace.values.slice(0,-1).join(", "), trace.values.concat(trace.after).join(", "), trace.values.map(v=>v+step).join(", ")],
    };
    q.choices = choices(answer, distractors[ask]);
    q.topic = ask;
    q.prompt = {
      start: "Select the starting counter value.",
      step: "Select the amount the counter changes each time (magnitude).",
      last: "Select the last value printed by the loop.",
      count: "Select the number of body executions.",
      after: `What is the value of ${variable} after the loop finishes?`,
      output: "What values does the loop print, in order?",
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
        rows-1,
        rows+1,
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
      "Show the collection after the code runs.";
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
      q.prompt = "Show the working collection after traversal.";
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
      q.choices = kind === "search" ? choices(answer, shuffle([-1, ...start.map((_,i)=>i)]).filter(i=>i!==answer).slice(0,3))
        : kind === "count" ? choices(answer, [answer-1,answer+1,start.length,0].filter(v=>v>=0&&v<=start.length))
        : choices(answer, [answer-start[0], answer-start.at(-1), answer+start[0],start.length]);
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
      q.prompt = "What is the final value of result?";
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
          : pick([-1, -2, start.length, start.length+1]);
    q.choices =
      ask === "invalid"
        ? choices(q.answer, shuffle(start.map((_,i)=>i)).slice(0,3))
        : choices(q.answer, ask === "element" ? [start[(pos+1)%start.length],start[(pos+start.length-1)%start.length],pos,start.length,q.answer+1] : [start.length-1,start.length+1,0]);
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
      `public Student() { score = ${n}; }`,
      `public Practice() { score = ${n}; }`,
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
      "Print the quotient only for a nonzero divisor.",
      `if (divisor == 0) System.out.println(${n} / divisor);`,
      `if (divisor != 0) System.out.println(${n} / divisor);`,
      [],
      "zero",
    ],
  ],
  [
    "remainder-zero",
    "runtime",
    (n) => [
      "Print the remainder only for a nonzero divisor.",
      `if (divisor == 0) System.out.println(${n} % divisor);`,
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
      "Print the length only when text is present.",
      "if (text == null) System.out.println(text.length());",
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
      "int index = 0; for (int value : values) { value++; index++; }",
      "int index = 0; for (int value : values) { values[index]++; index++; }",
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
    if (variant === "constructor-name") prefix = ["    private int score;"];
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
  const neutral = {
    "missing-semicolon": "Print the value.", "missing-opening-brace": "Print the value.", "missing-closing-brace": "Print the value.",
    "extra-opening-brace": "Print the value.", "extra-closing-brace": "Print the value.", "missing-parenthesis": "Print the value.",
    "undeclared-variable": "Store the count.", "duplicate-declaration": "Update the existing value.", "scope": "Print the value assigned inside the block.",
    "invalid-cast": "Store the number shown in value.", "char-literal": "Store the letter A.", "boolean-literal": "Set ready to true.",
    "argument-count": "Print the sum of the displayed number and 2.", "argument-order": "Print Count followed by the displayed number.",
    "argument-type": "Print the sum of the displayed number and 2.", "missing-return": "getValue should return value.",
    "return-type": "getValue should return the displayed number.", "constructor-name": `Creating a Practice object should initialize its score to ${n}.`,
    "instance-static": "Print the value of the counter.", "constructor-semicolon": "Initialize name from studentName.",
    "method-semicolon": "greet should print the displayed number.", "string-comparison": "Print whether the strings contain the same text; the comparison must also handle different text.",
    "arraylist-remove-overload": "Remove the matching Integer 2 regardless of its position.", "substring-range": "Print the entire text.",
    "overflow": "Compute twice the large value exactly.", "lossy-conversion": "Preserve the measurement's fractional part.",
    "loop-array-bound": "Visit every array element exactly once.",
  };
  const spec = repairSpec(variant, n);
  // Locate the authored component within the known faulty line, never infer correctness from the rendered DOM.
  const lineIndex = typeof fault === "number" ? fault : lines.length - 1;
  const lineStart = lines.slice(0,lineIndex).reduce((sum,line)=>sum+line.length+1,0);
  let offset = spec.needle ? lines[lineIndex].indexOf(spec.needle) : lines[lineIndex].length;
  if (spec.last) offset = lines[lineIndex].lastIndexOf(spec.needle);
  if (offset < 0) throw Error(`Missing authored fault: ${variant}`);
  const start = lineStart + offset + (spec.offset || 0), end = start + spec.text.length;
  const repaired = code.slice(0,start) + spec.correct + code.slice(end);
  // The exact fixed source comes from the token repair (including any intentionally scoped block insertion).
  fixed = repaired;
  const targets = {
    "invalid-cast": "double", "argument-count": "", "argument-order": String(n),
    "array-index": "length", "arraylist-index": "size", "substring-range": "+",
    "precedence": "+", "floating-point": "==", "lossy-conversion": "int", "string-comparison": "==",
  };
  let targetStart = start, targetEnd = end;
  if (Object.hasOwn(targets,variant)) {
    const target=targets[variant];
    targetStart = variant === "argument-count" ? start+`add(${n}`.length : start+spec.text.indexOf(target);
    targetEnd = targetStart+target.length;
  }
  const tokens = debugTokens(code, {start:targetStart,end:targetEnd});
  const location = tokens.find(t=>t.start===targetStart && t.end===targetEnd).id;
  return {
    kind: "debug", code, tokens, brokenSource: code, fixedSource: fixed,
    location, locations: tokens.filter(t=>spec.equivalentBrace && t.text===spec.text && (variant === "extra-closing-brace" ? t.start >= lineStart : Math.abs(t.start-start)===1)).map(t=>t.id).concat(location),
    repair: {start,end},
    fix: spec.correct || "Remove", fixes: choices(spec.correct || "Remove", spec.wrong),
    topic: variant, variant, category,
    prompt: "Find and fix the error.", context: neutral[variant] || requirement,
    explanation: `This is a ${["tricky","syntax"].includes(category) ? "compile-time" : category} defect. ${spec.explanation} Corrected component: ${spec.correct || "removed"}.`,
    symptom: category === "logic" ? "The program compiles, but does not meet the requirement."
      : category === "runtime" ? "The shown input triggers a runtime exception." : "This program does not compile.",
  };

}
// One authored replacement and two misconception-based alternatives per defect.
function repairSpec(v,n) {
  const specs = {
    "arraylist-remove-overload": ["2", "Integer.valueOf(2)", ["0", "3"], "remove(int) uses an index; remove(Integer) removes a matching value."],
    "missing-semicolon": ["", ";", [",", ":"], "A declaration statement ends with a semicolon."],
    "missing-opening-brace": ["", " {", [";", "}"], "A concrete method's statements belong in a brace-delimited body."],
    "missing-closing-brace": ["", "\n}", [";", "\n{"], "Method and class bodies each need balanced braces."],
    "extra-opening-brace": ["{", "", ["}", "("], "The extra block opener leaves the class unclosed."],
    "extra-closing-brace": ["}", "", ["{", ")"], "A surplus closing brace ends the class before the final brace."],
    "missing-parenthesis": [";", ")", ["(", "]"], "A method call must close its argument parentheses."],
    "undeclared-variable": ["count", "int count", ["double", "count int"], "Introduce a local variable with its type and identifier."],
    "duplicate-declaration": ["int", "", ["double", "final int"], "Assign to an existing local instead of redeclaring it in the same scope."],
    "scope": ["value", String(n), ["count", "this.value"], "A block-local identifier is inaccessible after its block closes."],
    "string-to-int": [`"${n}"`, String(n), [`(int) "${n}"`, `'${n}'`], "An int cannot store a String. The requested numeric value must be represented numerically."],
    "double-to-int": ["int", "double", ["long", "float"], "Use a type compatible with the supplied fractional value without discarding it."],
    "invalid-cast": [`(double) "${n}"`, `${n}.0`, [`(int) "${n}"`, `"${n}.0"`], "A String cannot be cast to a primitive numeric type."],
    "char-literal": ['"A"', "'A'", ["A", '"A".toString()'], "A char value uses single quotes."],
    "boolean-literal": ["1", "true", ['"true"', "0"], "Java Boolean values are true and false, not numbers or Strings."],
    "argument-count": [`add(${n})`, `add(${n}, 2)`, [`add(${n}, 2, 0)`, `add(${n}, "2")`], "The call must supply the declared parameter count and compatible types."],
    "argument-order": [`show(${n}, "Count")`, `show("Count", ${n})`, [`show("Count", "${n}")`, `show(${n})`], "Arguments match the method's parameter types in order."],
    "argument-type": [`"${n}"`, String(n), [`(int) "${n}"`, `${n}.5`], "A String or a double is not an int argument."],
    "missing-return": ["}", "return value; }", ["return; }", "System.out.println(value); }"], "A non-void method must return a compatible value on its execution path."],
    "return-type": [`"${n}"`, String(n), [`${n}.5`, "true"], "The returned value must match the method's declared return type."],
    "constructor-name": ["Student", "Practice", ["void Practice", "static Practice"], "A constructor uses the class name and has no return type."],
    "instance-static": ["int", "static int", ["final int", "volatile int"], "A class method cannot use an instance field without an object; the required class field is static."],
    "constructor-semicolon": [";", "", ["{}", "return"], "A constructor header must connect to its body, without an intervening semicolon."],
    "method-semicolon": [";", "", ["{}", "return"], "A concrete method header must connect to its body."],
    "division-zero": ["==", "!=", [">=", "<="], "The calculation must be skipped when its integer divisor is zero."],
    "remainder-zero": ["==", "!=", [">=", "<="], "Integer remainder also requires a nonzero divisor."],
    "array-index": ["values.length", "values.length - 1", ["values.length + 1", "values.length * 2"], "The last valid array index is one less than its length."],
    "arraylist-index": ["values.size()", "values.size() - 1", ["values.size() + 1", "values.size() * 2"], "The last valid ArrayList index is one less than its size."],
    "substring-range": ["+", "- 0 *", ["*", "-"], "substring's ending index is exclusive and cannot exceed the String length."],
    "null-reference": ["==", "!=", ["=", ">"], "Do not invoke an instance method when its reference is null."],
    "numeric-division": ["2", "2.0", ["(int) 2.0", "2L"], "Integer division truncates before the result is widened. A floating operand changes the division."],
    "precedence": [`${n} + ${n+2}`, `(${n} + ${n+2})`, [`${n} - ${n+2}`, `${n} * ${n+2}`], "Group the numerator before division to compute an average."],
    "overflow": ["value", "(long) value", ["(long) (value * 2)", "(int) (long) value"], "Widen an operand before multiplication; widening an already overflowed result cannot repair it."],
    "floating-point": ["result == 0.3", "Math.abs(result - 0.3) < 0.000001", ["Math.abs(result - 0.3) > 0.000001", "result - 0.3 == 0"], "Approximate floating-point results should be compared with the stated tolerance."],
    "lossy-conversion": ["(int)", "", ["(long)", "(short)"], "Casting the measurement to an integer discards its fraction before storage."],
    "string-comparison": ["first == second", "first.equals(second)", ["first != second", "first.length() == second.length()"], "equals compares String contents; == compares references."],
    "off-by-one": ["<", "<=", [">=", "=="], "An inclusive upper endpoint must pass the loop condition."],
    "if-semicolon": [";", "", ["{}", ":"], "A semicolon can be an empty conditional body, leaving the following block unconditional."],
    "loop-semicolon": [";", "", ["{}", ":"], "An empty loop body leaves the following block outside the iterations."],
    "infinite-loop": ["}", "i++; }", ["i--; }", "i += 0; }"], "The control variable must progress toward the stopping boundary."],
    "loop-array-bound": ["<=", "<", [">=", "=="], "An index must remain strictly below array length."],
    "for-each-assignment": ["value", "values[index]", ["values[value]", "values[index + 1]"], "Changing a primitive loop copy does not change the array's stored element."],
  };
  const [text,correct,wrong,explanation] = specs[v];
  const spec={text,correct,wrong,explanation,needle:text};
  if(v === "missing-semicolon" || v === "missing-opening-brace" || v === "missing-closing-brace") spec.text="";
  if(v === "missing-return" || v === "infinite-loop") {spec.needle="}"; spec.text=""; spec.correct=correct.slice(0,-1); spec.wrong=wrong.map(x=>x.slice(0,-1));}
  if(v === "missing-parenthesis") spec.text="";
  if(v === "arraylist-remove-overload") spec.needle="2";
  if(v === "numeric-division") {spec.needle="/ 2";spec.offset=2;}
  if(v === "overflow") {spec.needle="= value";spec.offset=2;}
  if(v === "for-each-assignment") {spec.needle="value++";}
  if(["extra-opening-brace","extra-closing-brace"].includes(v)) {spec.last=true;spec.equivalentBrace=true;}
  if(["constructor-semicolon","method-semicolon","loop-semicolon","if-semicolon"].includes(v)) spec.last=true;
  if(v === "substring-range") {spec.text="+ 1";spec.needle="+ 1";spec.correct="";spec.wrong=["- 1","+ 2"];}
  return spec;
}
export function debugTokens(code, fault) {
  const parts=[], boundaries=new Set([fault.start,fault.end]);
  const pattern=/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|==|!=|<=|>=|\+\+|--|&&|\|\||\+=|-=|\S/g;
  for(const m of code.matchAll(pattern)) {boundaries.add(m.index);boundaries.add(m.index+m[0].length);}
  // Split source into consistently selectable lexical tokens, including a gap only where a missing component belongs.
  const points=[0,...boundaries,code.length].filter(x=>x<=fault.start || x>=fault.end).sort((a,b)=>a-b);
  for(let i=0;i<points.length-1;i++) {
    const start=points[i],end=points[i+1]; if(start===end) continue;
    if(start===fault.start&&fault.start===fault.end) parts.push({id:`token-${start}-gap`,start,end:start,text:"",gap:true});
    parts.push({id:`token-${start}`,start,end,text:code.slice(start,end), selectable:!/^[\s]+$/.test(code.slice(start,end))});
  }
  if(fault.start===fault.end && !parts.some(t=>t.gap)) parts.push({id:`token-${fault.start}-gap`,start:fault.start,end:fault.end,text:"",gap:true});
  return parts;
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
