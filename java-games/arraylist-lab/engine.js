/* ArrayList Lab engine (Java Games · DevCat Studios).
   Pure module: no DOM access. Imported by ./script.js (browser UI), the hub
   (../app.js, for the home-page card), and tests/arraylist-lab.test.js.

   Every challenge is computed by a small model of java.util.ArrayList
   (JList below) that follows the real Java rules: zero-based indices,
   add(index, e) valid for 0..size(), get/set/remove(index) valid for
   0..size()-1, remove(int) vs remove(Object) overload selection, equals()
   semantics for search, and shifting after insertion/removal.
   Each challenge also carries `javaChecks`: complete Java programs whose
   real javac/JVM output must equal the engine's answer
   (tests/arraylist-lab-jvm.test.js). */

export const GAME_ID = "arraylist-lab";

export const MODES = {
  access: "Access & Update",
  "insert-remove": "Insert & Remove",
  "search-size": "Search & Size",
  traverse: "Traverse & Trace",
  compare: "Arrays vs. ArrayLists",
};

export const FAMILIES = {
  A: { title: "Declaration & Wrapper Types", mode: "access", weight: 4 },
  B: { title: "get() vs. set()", mode: "access", weight: 9 },
  K: { title: "Choose the ArrayList Operation", mode: "access", weight: 8 },
  C: { title: "Add to the End", mode: "insert-remove", weight: 7 },
  D: { title: "Insert at an Index", mode: "insert-remove", weight: 13 },
  E: { title: "Remove by Index", mode: "insert-remove", weight: 11 },
  F: { title: "Remove by Value vs. Index", mode: "insert-remove", weight: 10 },
  G: { title: "size() & Valid Indices", mode: "search-size", weight: 8 },
  H: { title: "contains() & indexOf()", mode: "search-size", weight: 8 },
  I: { title: "Traverse an ArrayList", mode: "traverse", weight: 8 },
  J: { title: "Remove During Traversal", mode: "traverse", weight: 7 },
  L: { title: "Arrays vs. ArrayLists", mode: "compare", weight: 7 },
};

export const arrayListGame = {
  name: "ArrayList Lab",
  icon: "[+]",
  description:
    "Insert, remove, search, and traverse Java ArrayLists — and see exactly how elements shift and size changes.",
  concepts: "add · get · set · remove · size · indexOf · Traversal",
  modes: MODES,
};

/* ------------------------------------------------------------------ */
/* Randomness                                                          */
/* ------------------------------------------------------------------ */
export function makeRng(seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class Retry extends Error {}
const retry = () => {
  throw new Retry("retry");
};
function helpers(rng) {
  const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const chance = (p) => rng() < p;
  const sample = (arr, k) => shuffle(arr).slice(0, k);
  const weighted = (pairs) => {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rng() * total;
    for (const [v, w] of pairs) if ((r -= w) < 0) return v;
    return pairs[pairs.length - 1][0];
  };
  return { rng, int, pick, shuffle, chance, sample, weighted };
}

/* ------------------------------------------------------------------ */
/* Java ArrayList model                                                */
/* ------------------------------------------------------------------ */
export class JavaException extends Error {
  constructor(javaName = "IndexOutOfBoundsException") {
    super(javaName);
    this.javaName = javaName;
  }
}
export const IOOBE = "IndexOutOfBoundsException";
let NEXT_ID = 0;
export class JList {
  constructor(type, values = []) {
    this.type = type;
    // Starting elements get position-based ids, so every list built from the
    // same starting values shares element identity (used by revealDiff).
    this.items = values.map((v, i) => ({ id: "s" + i, v }));
    this.replaced = new Map(); // new item id -> replaced item id (set)
  }
  clone() {
    const c = new JList(this.type);
    c.items = this.items.map((x) => ({ ...x }));
    c.replaced = new Map(this.replaced);
    return c;
  }
  get values() {
    return this.items.map((x) => x.v);
  }
  size() {
    return this.items.length;
  }
  isEmpty() {
    return this.items.length === 0;
  }
  #check(i, limit) {
    if (!Number.isInteger(i) || i < 0 || i >= limit) throw new JavaException(IOOBE);
  }
  get(i) {
    this.#check(i, this.size());
    return this.items[i].v;
  }
  set(i, v) {
    this.#check(i, this.size());
    const old = this.items[i];
    const item = { id: ++NEXT_ID, v };
    this.replaced.set(item.id, old.id);
    this.items[i] = item;
    return old.v; // set returns the element previously at that index
  }
  add(v) {
    this.items.push({ id: ++NEXT_ID, v });
    return true;
  }
  addAt(i, v) {
    this.#check(i, this.size() + 1); // index size() is a valid insertion point
    this.items.splice(i, 0, { id: ++NEXT_ID, v });
  }
  removeAt(i) {
    this.#check(i, this.size());
    return this.items.splice(i, 1)[0].v; // returns the removed element
  }
  removeObj(v) {
    const k = this.indexOf(v); // first match only, by equals()
    if (k < 0) return false;
    this.items.splice(k, 1);
    return true;
  }
  indexOf(v) {
    return this.items.findIndex((x) => x.v === v);
  }
  lastIndexOf(v) {
    for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i].v === v) return i;
    return -1;
  }
  contains(v) {
    return this.indexOf(v) >= 0;
  }
}

/* An operation is a plain object; renderOp() turns it into Java and
   applyOp() runs it on a JList.  m: add | addAt | set | removeAt |
   removeObj | get | size | indexOf | contains | isEmpty            */
export function applyOp(list, op) {
  switch (op.m) {
    case "add":
      return list.add(op.v);
    case "addAt":
      list.addAt(op.i, op.v);
      return undefined;
    case "set":
      return list.set(op.i, op.v);
    case "removeAt":
      return list.removeAt(op.i);
    case "removeObj":
      return list.removeObj(op.v);
    case "get":
      return list.get(op.i);
    case "size":
      return list.size();
    case "indexOf":
      return list.indexOf(op.v);
    case "contains":
      return list.contains(op.v);
    case "isEmpty":
      return list.isEmpty();
    default:
      throw Error("unknown op " + op.m);
  }
}
export const lit = (type, v) => (type === "String" ? `"${v}"` : String(v));
export const javaStr = (v) => (typeof v === "boolean" ? String(v) : String(v));
export const listStr = (values) => `[${values.join(", ")}]`;
const objArg = (type, op) =>
  type === "String"
    ? lit(type, op.v)
    : op.form === "cast"
      ? `(Integer) ${op.v}`
      : op.form === "var"
        ? op.varName
        : `Integer.valueOf(${op.v})`;
export function renderExpr(op, name, type) {
  const idx = op.iText ?? String(op.i);
  switch (op.m) {
    case "add":
      return `${name}.add(${lit(type, op.v)})`;
    case "addAt":
      return `${name}.add(${idx}, ${lit(type, op.v)})`;
    case "set":
      return `${name}.set(${idx}, ${lit(type, op.v)})`;
    case "removeAt":
      return `${name}.remove(${idx})`;
    case "removeObj":
      return `${name}.remove(${objArg(type, op)})`;
    case "get":
      return `${name}.get(${idx})`;
    case "size":
      return `${name}.size()`;
    case "indexOf":
      return `${name}.indexOf(${lit(type, op.v)})`;
    case "contains":
      return `${name}.contains(${lit(type, op.v)})`;
    case "isEmpty":
      return `${name}.isEmpty()`;
  }
  throw Error("unknown op " + op.m);
}
export const renderOp = (op, name, type) => renderExpr(op, name, type) + ";";

/* Run a sequence of ops; returns {list, results, error}. */
export function run(type, values, ops) {
  const list = values instanceof JList ? values.clone() : new JList(type, values);
  const results = [];
  try {
    for (const op of ops) results.push(applyOp(list, op));
  } catch (e) {
    if (e instanceof JavaException) return { list, results, error: e.javaName };
    throw e;
  }
  return { list, results, error: null };
}

/* Misconceptions: transform an op the way a student with that
   misconception would read it. null = this misconception does not apply. */
const MISCONCEPTIONS = {
  addAtAsSet: (op, L) => (op.m === "addAt" && op.i < L.size() ? { ...op, m: "set", iText: undefined } : op),
  setAsAddAt: (op) => (op.m === "set" ? { ...op, m: "addAt", iText: undefined } : op),
  addAtAfter: (op, L) => (op.m === "addAt" ? (op.i + 1 <= L.size() ? { ...op, i: op.i + 1, iText: undefined } : null) : op),
  oneBased: (op) => ("i" in op && ["addAt", "set", "removeAt", "get"].includes(op.m) ? (op.i - 1 >= 0 ? { ...op, i: op.i - 1, iText: undefined } : null) : op),
  indexPlusOne: (op) => ("i" in op && ["addAt", "set", "removeAt", "get"].includes(op.m) ? { ...op, i: op.i + 1, iText: undefined } : op),
  appendIgnoreIndex: (op) => (op.m === "addAt" ? { m: "add", v: op.v } : op),
  addToFront: (op) => (op.m === "add" ? { m: "addAt", i: 0, v: op.v } : op),
  removeObjAsIndex: (op, L) => (op.m === "removeObj" && L.type === "Integer" ? { m: "removeAt", i: op.v } : op),
  removeAtAsObj: (op, L) => (op.m === "removeAt" && L.type === "Integer" ? { m: "removeObj", v: op.i } : op),
  removeLastMatch: (op, L) => (op.m === "removeObj" ? (L.lastIndexOf(op.v) >= 0 ? { m: "removeAt", i: L.lastIndexOf(op.v) } : op) : op),
  ignoreRemoves: (op) => (op.m === "removeAt" || op.m === "removeObj" ? { m: "size" } : op),
  setGrows: (op) => op, // handled by counting in size questions
};
export function simulateMis(type, values, ops, kind) {
  const list = new JList(type, values);
  try {
    for (const op of ops) {
      if (kind === "removeAllMatches" && op.m === "removeObj") {
        while (list.removeObj(op.v));
        continue;
      }
      const t = MISCONCEPTIONS[kind] ? MISCONCEPTIONS[kind](op, list) : op;
      if (t === null) return null;
      applyOp(list, t);
    }
  } catch (e) {
    if (e instanceof JavaException) return null;
    throw e;
  }
  return list.values;
}

/* Reveal model: before/after cells with movement marks for the UI. */
export function revealDiff(start, end) {
  const startIdx = new Map(start.items.map((x, i) => [x.id, i]));
  const endIdx = new Map(end.items.map((x, i) => [x.id, i]));
  const replacedOld = new Map();
  for (const [n, o] of end.replaced) if (endIdx.has(n) && startIdx.has(o)) replacedOld.set(o, n);
  const before = start.items.map((x, i) => {
    let mark = "";
    if (replacedOld.has(x.id)) mark = "replaced";
    else if (!endIdx.has(x.id)) mark = "removed";
    else if (endIdx.get(x.id) !== i) mark = "moved";
    return { v: x.v, i, mark };
  });
  const after = end.items.map((x, i) => {
    let mark = "",
      was = null;
    const orig = startIdx.has(x.id) ? x.id : end.replaced.get(x.id);
    if (startIdx.has(x.id)) {
      if (startIdx.get(x.id) !== i) {
        mark = "moved";
        was = startIdx.get(x.id);
      }
    } else if (orig !== undefined && startIdx.has(orig)) {
      mark = "replaced";
      if (startIdx.get(orig) !== i) was = startIdx.get(orig);
    } else mark = "new";
    return { v: x.v, i, mark, was };
  });
  return { type: start.type, before, after, beforeSize: start.size(), afterSize: end.size() };
}

/* ------------------------------------------------------------------ */
/* Java program builders (used by the JVM verification test)           */
/* ------------------------------------------------------------------ */
export function setupLines(type, name, values) {
  return [`ArrayList<${type}> ${name} = new ArrayList<>();`, ...values.map((v) => `${name}.add(${lit(type, v)});`)];
}
export function program({ lists = [], pre = "", body = "", print = null, imports = "import java.util.ArrayList;" }) {
  const ind = (s, n) =>
    s
      .split("\n")
      .filter((l) => l.length)
      .map((l) => " ".repeat(n) + l)
      .join("\n");
  const setup = lists.map((l) => setupLines(l.type, l.name, l.values).join("\n")).join("\n");
  const inner = [body, print ? `System.out.println(${print});` : ""].filter(Boolean).join("\n");
  return `${imports}
public class Main {
    public static void main(String[] args) {
${ind([pre, setup].filter(Boolean).join("\n"), 8)}
        try {
${ind(inner, 12)}
        } catch (IndexOutOfBoundsException e) {
            System.out.println("${IOOBE}");
        }
    }
}
`;
}
const check = (label, source, output) => ({ label, source, expect: "ok", output });
const compiles = (label, source) => ({ label, source, expect: "ok" });
const fails = (label, source) => ({ label, source, expect: "error" });

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */
const INT_NAMES = ["nums", "scores", "values", "ages", "points", "totals", "counts", "temps"];
const STR_POOLS = {
  words: ["cat", "dog", "sun", "map", "pen", "cup", "hat", "box", "key", "jar", "owl", "fig"],
  names: ["Mia", "Leo", "Ava", "Sam", "Zoe", "Kai", "Eli", "Ivy", "Noah", "Ana", "Ben", "Jo"],
  colors: ["red", "blue", "green", "gold", "pink", "gray", "teal", "tan", "plum"],
  pets: ["cat", "dog", "fish", "bird", "frog", "mouse", "snake"],
  cities: ["Reno", "Austin", "Boise", "Denver", "Tulsa", "Fresno", "Tampa"],
  items: ["pen", "book", "lamp", "desk", "mug", "fork", "sock", "cup"],
};
function intValues(R, n, { min = 1, max = 30, unique = true, avoid = [] } = {}) {
  const out = [];
  let guard = 0;
  while (out.length < n) {
    if (guard++ > 500) retry();
    const v = R.int(min, max);
    if (avoid.includes(v)) continue;
    if (unique && out.includes(v)) continue;
    out.push(v);
  }
  return out;
}
function strValues(R, pool, n) {
  if (pool.length < n) retry();
  return R.sample(pool, n);
}
/* A typed list: {type, name, values, pool} */
function makeStart(R, { n, type = R.chance(0.6) ? "Integer" : "String", min = 1, max = 30 } = {}) {
  if (type === "Integer") return { type, name: R.pick(INT_NAMES), values: intValues(R, n, { min, max }) };
  const name = R.pick(Object.keys(STR_POOLS));
  return { type, name, values: strValues(R, STR_POOLS[name], n), pool: STR_POOLS[name] };
}
function freshValue(R, start, avoid = []) {
  const used = new Set([...start.values, ...avoid]);
  if (start.type === "Integer") {
    for (let g = 0; g < 200; g++) {
      const v = R.int(1, 40);
      if (!used.has(v)) return v;
    }
    retry();
  }
  const left = start.pool.filter((v) => !used.has(v));
  if (!left.length) retry();
  return R.pick(left);
}

/* ------------------------------------------------------------------ */
/* Choices                                                             */
/* ------------------------------------------------------------------ */
const keyOf = (c) => c.kind + ":" + JSON.stringify(c.value);
function buildChoices(R, correct, candidates, { count = 4 } = {}) {
  const seen = new Set([keyOf(correct)]);
  const picked = [];
  for (const c of candidates) {
    if (!c || c.value === null || c.value === undefined) continue;
    const k = keyOf(c);
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push(c);
    if (picked.length === count - 1) break;
  }
  if (picked.length < count - 1) retry();
  const all = R.shuffle([{ ...correct, correct: true }, ...picked]);
  return { choices: all.map(({ correct: _c, ...c }) => c), answer: all.findIndex((c) => c.correct) };
}
const V = (type, value, why) => ({ kind: "value", value: value === IOOBE || typeof value === "boolean" ? String(value) : lit(type, value), why });
const P = (type, value, why) => ({ kind: "value", value: javaStr(value), why }); // as println shows it
const RAW = (value, why) => ({ kind: "value", value: String(value), why });
const LST = (values, why) => (values ? { kind: "list", value: values.slice(), why } : null);
const CODE = (value, why) => ({ kind: "code", value, why });
const TEXT = (value, why) => ({ kind: "text", value, why });

/* ------------------------------------------------------------------ */
/* Explanations                                                        */
/* ------------------------------------------------------------------ */
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
export function describeOp(op, before, name) {
  const type = before.type;
  const n = before.size();
  const call = "`" + renderExpr(op, name, type) + "`";
  const vv = (v) => lit(type, v);
  switch (op.m) {
    case "add":
      return `${call} appends ${vv(op.v)} at index ${n} (the end). Size ${n} → ${n + 1}.`;
    case "addAt":
      return op.i === n
        ? `${call} inserts ${vv(op.v)} at index ${n}, which is size(), so it goes at the end. Size ${n} → ${n + 1}.`
        : `${call} inserts ${vv(op.v)} at index ${op.i}; ${n - op.i === 1 ? "the element" : `the ${n - op.i} elements`} from index ${op.i} on ${n - op.i === 1 ? "shifts" : "shift"} right. Size ${n} → ${n + 1}.`;
    case "set":
      return `${call} replaces ${vv(before.get(op.i))} at index ${op.i} with ${vv(op.v)}. Nothing shifts and the size stays ${n}.`;
    case "removeAt":
      return op.i === n - 1
        ? `${call} removes ${vv(before.get(op.i))}, the last element (index ${op.i}). Size ${n} → ${n - 1}.`
        : `${call} removes ${vv(before.get(op.i))} at index ${op.i}; ${n - 1 - op.i === 1 ? "the element" : `the ${n - 1 - op.i} elements`} after it ${n - 1 - op.i === 1 ? "shifts" : "shift"} left. Size ${n} → ${n - 1}.`;
    case "removeObj": {
      const k = before.indexOf(op.v);
      return k < 0
        ? `${call} finds no element equal to ${vv(op.v)}, so it returns false and nothing changes.`
        : `${call} uses remove(Object): it removes the first ${vv(op.v)} (index ${k}) and returns true. Size ${n} → ${n - 1}.`;
    }
    default:
      return call;
  }
}
function opsTrace(start, ops, name) {
  const L = new JList(start.type, start.values);
  const lines = [];
  for (const op of ops) {
    const before = L.clone();
    applyOp(L, op);
    lines.push(`${describeOp(op, before, name)} → ${listStr(L.values)}`);
  }
  return lines;
}

/* Common pieces of a challenge */
function base(R, tpl, extra) {
  return {
    family: tpl.family,
    familyTitle: FAMILIES[tpl.family].title,
    template: tpl.id,
    mode: FAMILIES[tpl.family].mode,
    modeTitle: MODES[FAMILIES[tpl.family].mode],
    level: tpl.level,
    concept: tpl.concept,
    list: null,
    showIndices: false,
    code: null,
    trace: null,
    reveal: null,
    javaChecks: [],
    ...extra,
  };
}
const startView = (s) => ({ type: s.type, name: s.name, values: s.values.slice() });

/* ================================================================== */
/* A. Declaration and initialization                                   */
/* ================================================================== */
const ELEMENT_KINDS = [
  { what: "Strings", wrapper: "String", prim: null, bad: ["Str", "Text"], names: ["names", "words", "cities", "titles"] },
  { what: "whole numbers (int values)", wrapper: "Integer", prim: "int", bad: ["integer", "Int"], names: ["scores", "ages", "counts", "points"] },
  { what: "decimal numbers (double values)", wrapper: "Double", prim: "double", bad: ["Dbl", "Decimal"], names: ["prices", "temps", "heights", "grades"] },
  { what: "true/false values (boolean values)", wrapper: "Boolean", prim: "boolean", bad: ["Bool", "bool"], names: ["flags", "answers", "passed", "switches"] },
  { what: "single characters (char values)", wrapper: "Character", prim: "char", bad: ["Char", "character"], names: ["letters", "initials", "grades", "keys"] },
];
const declProgram = (stmt) => `import java.util.ArrayList;\npublic class Main {\n    public static void main(String[] args) {\n        ${stmt}\n        System.out.println(${stmt.match(/\b(\w+)\s*=/)?.[1] || "0"});\n    }\n}\n`;

const A = [
  {
    id: "A.declare",
    family: "A",
    level: 1,
    concept: "Declare & create",
    make(R, tpl) {
      const k = R.weighted([[ELEMENT_KINDS[0], 3], [ELEMENT_KINDS[1], 3], [ELEMENT_KINDS[2], 2], [ELEMENT_KINDS[3], 1], [ELEMENT_KINDS[4], 1]]);
      const T = k.wrapper,
        nm = R.pick(k.names);
      const diamond = R.chance(0.6);
      const correct = `ArrayList<${T}> ${nm} = new ArrayList<${diamond ? "" : T}>();`;
      const pool = [
        k.prim
          ? CODE(`ArrayList<${k.prim}> ${nm} = new ArrayList<>();`, `A type argument must be a class type. Primitive ${k.prim} is not allowed; use its wrapper ${T}.`)
          : CODE(`ArrayList<string> ${nm} = new ArrayList<>();`, "Java is case-sensitive: the class is String, not string."),
        CODE(`ArrayList<${T}> ${nm} = new ArrayList<${T}>;`, "Creating an object with new calls a constructor, so it needs parentheses: new ArrayList<>()."),
        CODE(`ArrayList<${k.bad[0]}> ${nm} = new ArrayList<>();`, `There is no class named ${k.bad[0]}; the element type is ${T}.`),
        CODE(`ArrayList<${T}> ${nm} = new ${T}[10];`, `new ${T}[10] creates an array, not an ArrayList. The two types are not interchangeable.`),
        CODE(`ArrayList ${nm}<${T}> = new ArrayList<>();`, "The type argument belongs right after ArrayList in the type, before the variable name."),
      ];
      const { choices, answer } = buildChoices(R, CODE(correct), R.shuffle(pool));
      const java = [compiles("correct", declProgram(correct)), ...choices.filter((c, i) => i !== answer).map((c) => fails("distractor", declProgram(c.value)))];
      return base(R, tpl, {
        kind: "choice",
        question: `Which statement correctly creates an empty ArrayList that stores ${k.what}?`,
        choices,
        answer,
        explanation: `\`${correct}\` declares a variable of type ArrayList<${T}> and creates the list with new and parentheses.${k.prim ? ` ArrayLists hold objects, so ${k.prim} values are stored as ${T} objects (autoboxing).` : ""}${diamond ? " The empty <> (diamond) lets Java infer the element type." : ""}`,
        javaChecks: java,
      });
    },
  },
  {
    id: "A.wrapper",
    family: "A",
    level: 1,
    concept: "Wrapper classes",
    make(R, tpl) {
      const k = R.pick(ELEMENT_KINDS.slice(1));
      const nm = R.pick(k.names);
      const correct = TEXT(k.wrapper);
      const pool = [TEXT(k.prim, `${k.prim} is a primitive type. Type arguments must be class types, so use the wrapper ${k.wrapper}.`), ...k.bad.map((b) => TEXT(b, `There is no standard Java class named ${b}.`))];
      const { choices, answer } = buildChoices(R, correct, pool);
      const prog = (t) => declProgram(`ArrayList<${t}> ${nm} = new ArrayList<>();`);
      return base(R, tpl, {
        kind: "choice",
        question: `Fill the blank so the list stores ${k.prim} values: \`ArrayList<____> ${nm} = new ArrayList<>();\``,
        choices,
        answer,
        explanation: `The wrapper class for ${k.prim} is ${k.wrapper}. Java automatically boxes a ${k.prim} into a ${k.wrapper} when you add it and unboxes it when you read it into a ${k.prim} variable.`,
        javaChecks: [compiles("correct", prog(k.wrapper)), fails("primitive", prog(k.prim)), ...k.bad.map((b) => fails("bad", prog(b)))],
      });
    },
  },
  {
    id: "A.import",
    family: "A",
    level: 1,
    concept: "import java.util.ArrayList",
    make(R, tpl) {
      const correct = CODE("import java.util.ArrayList;");
      const pool = [
        CODE("import java.lang.ArrayList;", "Only classes such as String and Math live in java.lang (imported automatically). ArrayList is in java.util."),
        CODE("import java.util.Arrays;", "Arrays is a different class (helper methods for arrays). It does not make ArrayList available."),
        CODE("import java.util.List;", "List is a related interface, but importing it does not import the ArrayList class."),
        CODE("import ArrayList;", "An import needs the full package name: java.util.ArrayList."),
      ];
      if (R.chance(0.4)) return importMissing(R, tpl);
      const { choices, answer } = buildChoices(R, correct, R.shuffle(pool));
      const prog = (imp) => `${imp}\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList<String> names = new ArrayList<>();\n        System.out.println(names.size());\n    }\n}\n`;
      return base(R, tpl, {
        kind: "choice",
        question: "A program uses `ArrayList<String> names = new ArrayList<>();`. Which line at the top of the file lets it compile?",
        choices,
        answer,
        explanation: "ArrayList belongs to the java.util package, so the file needs `import java.util.ArrayList;` (or `import java.util.*;`). Unlike String, it is not imported automatically.",
        javaChecks: choices.map((c, i) => (i === answer ? compiles("correct", prog(c.value)) : fails("distractor", prog(c.value)))),
      });
    },
  },
  {
    id: "A.new-size",
    family: "A",
    level: 1,
    concept: "A new list is empty",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(0, 3) });
      const lines = setupLines(s.type, s.name, s.values);
      const probe = R.pick(["size", "isEmpty"]);
      const n = s.values.length;
      let correct, pool, print;
      if (probe === "size") {
        print = `${s.name}.size()`;
        correct = RAW(n);
        pool = [RAW(10, "10 is the starting capacity of the internal storage, not the number of elements. size() counts elements actually added."), RAW(n - 1, "That is the last valid index, not the number of elements."), RAW(n + 1, "size() counts the elements; it does not add one."), RAW(IOOBE, "size() never throws; it returns 0 for an empty list.")];
      } else {
        print = `${s.name}.isEmpty() + " " + ${s.name}.size()`;
        correct = RAW(`${n === 0} ${n}`);
        pool = [RAW(`${n !== 0} ${n}`, "isEmpty() is true exactly when size() is 0."), RAW(`${n === 0} 10`, "10 is an internal starting capacity, not the size."), RAW(`${n !== 0} ${n + 1}`, "Count only the elements added."), RAW(`${n === 0} ${Math.max(0, n - 1)}`, "size() counts elements; it is not the last index.")];
      }
      const { choices, answer } = buildChoices(R, correct, pool);
      const code = lines.join("\n") + `\nSystem.out.println(${print});`;
      return base(R, tpl, {
        kind: "choice",
        question: "What is printed?",
        code,
        choices,
        answer,
        explanation: `\`new ArrayList<>()\` creates an empty list (size 0). Each add() increases the size by one, so the size is ${n}${probe === "isEmpty" ? ` and isEmpty() returns ${n === 0}` : ""}.`,
        javaChecks: [check("output", program({ lists: [s], print }), choices[answer].value)],
      });
    },
  },
];

function importMissing(R, tpl) {
  const k = R.pick(ELEMENT_KINDS.slice(0, 3));
  const nm = R.pick(k.names);
  const stmt = `ArrayList<${k.wrapper}> ${nm} = new ArrayList<>();`;
  const correct = TEXT("It does not compile: the compiler cannot find the class ArrayList.");
  const pool = [
    TEXT("It compiles, then throws an exception when the list is created.", "A missing import is caught by the compiler; the program never runs."),
    TEXT("It compiles and runs normally, because ArrayList is part of Java.", "Only java.lang classes (String, Math, Integer, …) are imported automatically. ArrayList is in java.util."),
    TEXT("It compiles, but the list can only hold Strings.", "The import does not change the element type; without it, ArrayList is simply unknown."),
    TEXT("It compiles, but size() always returns 0.", "Without the import, the code never compiles at all."),
  ];
  const { choices, answer } = buildChoices(R, correct, R.shuffle(pool));
  const src = `public class Main {\n    public static void main(String[] args) {\n        ${stmt}\n        System.out.println(${nm}.size());\n    }\n}\n`;
  return base(R, tpl, {
    kind: "choice",
    question: `A file has NO import statements. What happens with \`${stmt}\` inside main?`,
    choices,
    answer,
    explanation: "ArrayList lives in the java.util package. Without `import java.util.ArrayList;` (or `import java.util.*;`) the compiler reports \"cannot find symbol\". Classes in java.lang, such as String and Integer, need no import.",
    javaChecks: [fails("no import", src), compiles("with import", "import java.util.ArrayList;\n" + src)],
  });
}

/* ================================================================== */
/* B. get() versus set()                                               */
/* ================================================================== */
const B = [
  {
    id: "B.set-then-get",
    family: "B",
    level: 1,
    concept: "set replaces",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6) });
      const n = s.values.length;
      const i = R.int(0, n - 2);
      const v = freshValue(R, s);
      const j = R.chance(0.55) ? i + 1 : i;
      const op = { m: "set", i, v };
      const after = run(s.type, s.values, [op]).list;
      const ans = after.get(j);
      const t = s.type;
      const pool =
        j === i
          ? [V(t, s.values[i], "set changes the element; the old value is gone."), V(t, s.values[i + 1], "set does not shift anything; index " + i + " now holds the new value."), i > 0 ? V(t, s.values[i - 1], "Indices start at 0, not 1.") : null, RAW(i, "get returns the element, not the index.")]
          : [V(t, s.values[i], "That is what you would get if set inserted (like add(index, e)). set replaces, so nothing shifts."), V(t, v, `${lit(t, v)} is at index ${i}, not ${j}.`), j + 1 < n ? V(t, s.values[j + 1], "Nothing shifts left after set.") : null, RAW(j, "get returns the element, not the index.")];
      const { choices, answer } = buildChoices(R, V(t, ans), pool);
      const L0 = new JList(t, s.values);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code: renderOp(op, s.name, t),
        question: `What does \`${s.name}.get(${j})\` return afterward?`,
        choices,
        answer,
        explanation: `${describeOp(op, L0, s.name)} Index ${j} now holds ${lit(t, ans)}.`,
        reveal: revealDiff(L0, after),
        javaChecks: [check("get after set", program({ lists: [s], body: renderOp(op, s.name, t), print: `${s.name}.get(${j})` }), javaStr(ans))],
      });
    },
  },
  {
    id: "B.get-expression",
    family: "B",
    level: 2,
    concept: "get(index) expressions",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(4, 7) });
      const n = s.values.length,
        t = s.type,
        nm = s.name;
      const form = R.weighted([["last", 3], ["second-last", 2], ["size", 1.2], ["var", 2], ["half", 1]]);
      let expr, idx, pre = "";
      if (form === "last") (expr = `${nm}.size() - 1`), (idx = n - 1);
      else if (form === "second-last") (expr = `${nm}.size() - 2`), (idx = n - 2);
      else if (form === "size") (expr = `${nm}.size()`), (idx = n);
      else if (form === "half") (expr = `${nm}.size() / 2`), (idx = Math.floor(n / 2));
      else {
        const k = R.int(0, n - 2);
        pre = `int k = ${k};\n`;
        expr = "k + 1";
        idx = k + 1;
      }
      const code = `${pre}System.out.println(${nm}.get(${expr}));`;
      const ans = idx < n ? s.values[idx] : IOOBE;
      const pool =
        idx < n
          ? [idx > 0 ? P(t, s.values[idx - 1], "Count from index 0: that element is one position too early.") : null, idx + 1 < n ? P(t, s.values[idx + 1], "Count from index 0: that element is one position too far.") : RAW(IOOBE, `${expr} is ${idx}, a valid index (0 to ${n - 1}).`), RAW(idx, "get returns the element at that index, not the index itself."), idx + 1 < n ? RAW(IOOBE, `${expr} is ${idx}, a valid index (0 to ${n - 1}).`) : null, P(t, s.values[0], "Evaluate the index expression first.")]
          : [P(t, s.values[n - 1], `The last element is at index size() - 1 = ${n - 1}. Index ${n} does not exist.`), P(t, s.values[n - 2], "Index size() is past the end, so get throws."), RAW(n, "get returns an element, and here the index is invalid."), P(t, s.values[0], "Java does not wrap around to the start."), RAW("null", "get never returns null for a bad index; it throws an exception.")];
      const { choices, answer } = buildChoices(R, ans === IOOBE ? RAW(IOOBE) : P(t, ans), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation:
          idx < n
            ? `${expr} evaluates to ${idx}. With zero-based indexing, index ${idx} holds ${lit(t, ans)}.`
            : `${nm}.size() is ${n}, but the valid indices are 0 to ${n - 1}. get(${n}) throws an IndexOutOfBoundsException.`,
        javaChecks: [check("get expr", program({ lists: [s], body: code }), ans === IOOBE ? IOOBE : javaStr(ans))],
      });
    },
  },
  {
    id: "B.set-returns",
    family: "B",
    level: 3,
    concept: "set returns the old element",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6) });
      const n = s.values.length,
        t = s.type;
      const i = R.int(0, n - 1);
      const v = freshValue(R, s);
      const decl = t === "Integer" ? R.pick(["int", "Integer"]) : "String";
      const code = `${decl} old = ${s.name}.set(${i}, ${lit(t, v)});\nSystem.out.println(old);`;
      const pool = [P(t, v, "set returns the element that was replaced, not the new value."), RAW(i, "set returns an element, not the index."), i + 1 < n ? P(t, s.values[i + 1], "Nothing shifts; set returns the element that was at index " + i + ".") : P(t, s.values[i - 1], "Count from index 0."), RAW("true", "add returns true; set returns the old element."), i > 0 ? P(t, s.values[i - 1], "Count from index 0.") : null];
      const { choices, answer } = buildChoices(R, P(t, s.values[i]), pool);
      const L0 = new JList(t, s.values);
      const after = run(t, L0, [{ m: "set", i, v }]).list;
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: `set(${i}, ${lit(t, v)}) puts ${lit(t, v)} at index ${i} and returns the element it replaced, ${lit(t, s.values[i])}.`,
        reveal: revealDiff(L0, after),
        javaChecks: [check("set return", program({ lists: [s], body: code }), javaStr(s.values[i]))],
      });
    },
  },
  {
    id: "B.tap-get",
    family: "B",
    level: 1,
    concept: "Zero-based get",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(4, 7) });
      const n = s.values.length,
        nm = s.name;
      const form = R.weighted([["literal", 3], ["last", 2], ["minus", 2], ["var", 1]]);
      let expr, idx, pre = "";
      if (form === "literal") (idx = R.int(1, n - 1)), (expr = String(idx));
      else if (form === "last") (idx = n - 1), (expr = `${nm}.size() - 1`);
      else if (form === "minus") {
        const d = R.int(2, Math.min(3, n));
        idx = n - d;
        expr = `${nm}.size() - ${d}`;
      } else {
        const k = R.int(2, n - 1);
        pre = `int k = ${k};`;
        idx = k - 1;
        expr = "k - 1";
      }
      return base(R, tpl, {
        kind: "cell",
        list: startView(s),
        code: pre || null,
        question: `Tap the element that \`${nm}.get(${expr})\` returns.`,
        answer: idx,
        uniqueValues: true,
        explanation: `${expr === String(idx) ? `Index ${idx}` : `${expr} is ${idx}, and index ${idx}`} is the ${ordinal(idx + 1)} element because indices start at 0. It holds ${lit(s.type, s.values[idx])}.`,
        javaChecks: [check("tap get", program({ lists: [s], pre: "", body: pre, print: `${nm}.get(${expr})` }), javaStr(s.values[idx]))],
      });
    },
  },
  {
    id: "B.copy-element",
    family: "B",
    level: 2,
    concept: "set with get",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 5) });
      const n = s.values.length,
        nm = s.name,
        t = s.type;
      const [a, b] = R.sample([...Array(n).keys()], 2);
      const code = `${nm}.set(${a}, ${nm}.get(${b}));`;
      const L0 = new JList(t, s.values);
      const after = run(t, L0, [{ m: "set", i: a, v: s.values[b] }]).list;
      const swap = s.values.slice();
      [swap[a], swap[b]] = [swap[b], swap[a]];
      const reversed = s.values.slice();
      reversed[b] = s.values[a];
      const inserted = s.values.slice();
      inserted.splice(a, 0, s.values[b]);
      const pool = [LST(reversed, `That copies index ${a} into index ${b}. The first argument of set is the index to change.`), LST(swap, "set overwrites one position; it does not swap two elements."), LST(inserted, "set replaces; add(index, e) would insert and shift."), LST(s.values, "The list does change: index " + a + " is overwritten.")];
      const { choices, answer } = buildChoices(R, LST(after.values), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question: `What is \`${nm}\` after this statement?`,
        choices,
        answer,
        explanation: `${nm}.get(${b}) is ${lit(t, s.values[b])}. Then set(${a}, …) replaces ${lit(t, s.values[a])} at index ${a}. The size stays ${n}; the list now has two copies of ${lit(t, s.values[b])}.`,
        reveal: revealDiff(L0, after),
        javaChecks: [check("copy", program({ lists: [s], body: code, print: nm }), listStr(after.values))],
      });
    },
  },
];
const ordinal = (k) => k + (k % 10 === 1 && k !== 11 ? "st" : k % 10 === 2 && k !== 12 ? "nd" : k % 10 === 3 && k !== 13 ? "rd" : "th");

/* ================================================================== */
/* Shared: "what is the list after these ops?"                         */
/* ================================================================== */
const MIS_WHY = {
  addAtAsSet: "add(index, e) inserts; it never overwrites. That result is what set would do.",
  setAsAddAt: "set replaces in place; it does not insert or shift.",
  addAtAfter: "add(index, e) puts the new element AT that index (before the current element there), not after it.",
  oneBased: "Java indices start at 0. That result counts positions starting from 1.",
  indexPlusOne: "Count positions from 0; that result is one position too far.",
  appendIgnoreIndex: "With two arguments, add(index, e) inserts at that index rather than at the end.",
  addToFront: "add(e) with one argument appends to the END of the list.",
  removeObjAsIndex: "Integer.valueOf(...) makes an Integer object, so Java calls remove(Object) and removes a matching value, not an index.",
  removeAtAsObj: "An int argument selects remove(int index): it removes by position, not by value.",
  removeAllMatches: "remove(Object) removes only the FIRST matching element.",
  removeLastMatch: "remove(Object) removes the first match, scanning from index 0.",
  ignoreRemoves: "remove changes the list; the later elements shift left.",
};
function listChoiceFromOps(R, s, ops, mis, extra = []) {
  const correct = run(s.type, s.values, ops);
  if (correct.error) retry();
  const pool = [...mis.map((k) => LST(simulateMis(s.type, s.values, ops, k), MIS_WHY[k])), ...extra];
  const len = correct.list.size();
  const c = buildChoices(R, LST(correct.list.values), pool);
  // avoid a visual outlier: at least one distractor with the same length
  if (!c.choices.some((ch, i) => i !== c.answer && ch.value.length === len)) retry();
  return { ...c, end: correct.list };
}

/* ================================================================== */
/* C. Add to the end                                                   */
/* ================================================================== */
const C = [
  {
    id: "C.append",
    family: "C",
    level: 1,
    concept: "add(element)",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(2, 5) });
      const v = freshValue(R, s);
      const op = { m: "add", v };
      const n = s.values.length;
      const replaceLast = s.values.slice(0, -1).concat([v]);
      const beforeLast = s.values.slice(0, -1).concat([v, s.values[n - 1]]);
      const { choices, answer, end } = listChoiceFromOps(R, s, [op], ["addToFront"], [LST(replaceLast, "add never replaces an element; the size grows by one."), LST(beforeLast, "add(e) places the new element after the current last element.")]);
      const L0 = new JList(s.type, s.values);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code: renderOp(op, s.name, s.type),
        question: `What is \`${s.name}\` after this statement?`,
        choices,
        answer,
        explanation: describeOp(op, L0, s.name),
        reveal: revealDiff(L0, end),
        javaChecks: [check("append", program({ lists: [s], body: renderOp(op, s.name, s.type), print: s.name }), listStr(end.values))],
      });
    },
  },
  {
    id: "C.build-sequence",
    family: "C",
    level: 2,
    concept: "Build a list with add",
    make(R, tpl) {
      const s = makeStart(R, { n: 0 });
      s.values = [];
      const k = R.int(3, 4);
      const pool = s.type === "Integer" ? intValues(R, k, { min: 1, max: 20 }) : strValues(R, STR_POOLS[s.name], k);
      const ops = [];
      const L = new JList(s.type, []);
      pool.forEach((v, idx) => {
        let op;
        if (idx < 2 || R.chance(0.4)) op = { m: "add", v };
        else op = { m: "addAt", i: R.int(0, L.size() - 1), v };
        applyOp(L, op);
        ops.push(op);
      });
      if (!ops.some((o) => o.m === "addAt")) {
        const last = ops[ops.length - 1];
        ops[ops.length - 1] = { m: "addAt", i: R.chance(0.5) ? 0 : 1, v: last.v };
      }
      const code = [...setupLines(s.type, s.name, []), ...ops.map((o) => renderOp(o, s.name, s.type))].join("\n");
      const rev = run(s.type, [], ops).list.values.slice().reverse();
      const { choices, answer, end } = listChoiceFromOps(R, s, ops, ["appendIgnoreIndex", "addToFront", "addAtAfter", "addAtAsSet"], [LST(rev, "Elements appended with add(e) keep their order; nothing reverses the list.")]);
      return base(R, tpl, {
        kind: "choice",
        list: null,
        code,
        question: `What does \`${s.name}\` contain after this code runs?`,
        choices,
        answer,
        explanation: "Start with an empty list. " + opsTrace(s, ops, s.name).join(" "),
        reveal: revealDiff(new JList(s.type, []), end),
        javaChecks: [check("build", program({ lists: [], pre: "", body: code, print: s.name }), listStr(end.values))],
      });
    },
  },
  {
    id: "C.appended-index",
    family: "C",
    level: 1,
    concept: "Index of the new last element",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(2, 6) });
      const n = s.values.length;
      const v = freshValue(R, s);
      const op = { m: "add", v };
      const ask = R.pick(["index", "size"]);
      const L0 = new JList(s.type, s.values);
      const end = run(s.type, L0, [op]).list;
      let question, correct, pool, print;
      if (ask === "index") {
        question = `After \`${renderOp(op, s.name, s.type)}\`, what does \`${s.name}.indexOf(${lit(s.type, v)})\` return?`;
        print = `${s.name}.indexOf(${lit(s.type, v)})`;
        correct = RAW(n);
        pool = [RAW(n + 1, "Indices start at 0, so the new element's index equals the old size."), RAW(n - 1, `${n - 1} was the old last index; the new element goes one past it.`), RAW(0, "add(e) appends to the end, not the front."), RAW(-1, "The value is in the list now, so indexOf finds it.")];
      } else {
        question = `After \`${renderOp(op, s.name, s.type)}\`, what does \`${s.name}.size() - 1\` evaluate to?`;
        print = `${s.name}.size() - 1`;
        correct = RAW(n);
        pool = [RAW(n + 1, "size() is now " + (n + 1) + "; subtract 1."), RAW(n - 1, "The size grew when the element was added."), RAW(n + 2, "Only one element was added.")];
        pool.push(RAW(0, "Evaluate size() after the add."));
      }
      const { choices, answer } = buildChoices(R, correct, pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        question,
        choices,
        answer,
        explanation: `${describeOp(op, L0, s.name)} The new last index is size() - 1 = ${n}.`,
        reveal: revealDiff(L0, end),
        javaChecks: [check("appended index", program({ lists: [s], body: renderOp(op, s.name, s.type), print }), String(n))],
      });
    },
  },
];

/* ================================================================== */
/* D. Insert at an index                                               */
/* ================================================================== */
function insertIndex(R, n) {
  return R.weighted([[0, 2], [n, 2], ["mid", 5]]) === "mid" ? R.int(1, n - 1) : R.pick([0, n]);
}
const D = [
  {
    id: "D.tap-gap",
    family: "D",
    level: 1,
    concept: "add(index, element) position",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6) });
      const n = s.values.length,
        nm = s.name;
      const v = freshValue(R, s);
      let i = insertIndex(R, n);
      let iText = String(i);
      const form = R.weighted([["literal", 5], ["size", 1], ["sizeMinus", 1.5]]);
      if (form === "size") (i = n), (iText = `${nm}.size()`);
      else if (form === "sizeMinus") (i = n - 1), (iText = `${nm}.size() - 1`);
      const op = { m: "addAt", i, v, iText };
      const L0 = new JList(s.type, s.values);
      const end = run(s.type, L0, [op]).list;
      return base(R, tpl, {
        kind: "gap",
        list: startView(s),
        question: `\`${renderOp(op, nm, s.type)}\` — tap the gap where ${lit(s.type, v)} is inserted.`,
        answer: i,
        explanation: `${iText !== String(i) ? `${iText} is ${i}. ` : ""}${describeOp(op, L0, nm)}${i === n ? " Inserting at index size() is legal; reading index size() with get is not." : ""}`,
        reveal: revealDiff(L0, end),
        javaChecks: [check("gap", program({ lists: [s], body: renderOp(op, nm, s.type), print: nm }), listStr(end.values))],
      });
    },
  },
  {
    id: "D.insert-result",
    family: "D",
    level: 1,
    concept: "Insertion shifts right",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 5) });
      const n = s.values.length;
      const v = freshValue(R, s);
      const i = R.weighted([[0, 1.5], [n, 1], ["mid", 5]]) === "mid" ? R.int(1, n - 1) : R.pick([0, n]);
      const op = { m: "addAt", i, v };
      const { choices, answer, end } = listChoiceFromOps(R, s, [op], R.shuffle(["addAtAsSet", "addAtAfter", "oneBased", "appendIgnoreIndex"]), [LST([v, ...s.values], "Only index 0 means the front.")]);
      const L0 = new JList(s.type, s.values);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code: renderOp(op, s.name, s.type),
        question: `What is \`${s.name}\` after this statement?`,
        choices,
        answer,
        explanation: describeOp(op, L0, s.name),
        reveal: revealDiff(L0, end),
        javaChecks: [check("insert", program({ lists: [s], body: renderOp(op, s.name, s.type), print: s.name }), listStr(end.values))],
      });
    },
  },
  {
    id: "D.get-after-insert",
    family: "D",
    level: 2,
    concept: "Indices after insertion",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6) });
      const n = s.values.length,
        t = s.type,
        nm = s.name;
      const v = freshValue(R, s);
      const i = R.int(0, n - 1);
      const j = R.pick([i + 1, Math.min(i + 2, n), n].filter((x) => x > i));
      const op = { m: "addAt", i, v };
      const L0 = new JList(t, s.values);
      const end = run(t, L0, [op]).list;
      const ans = end.get(j);
      const pool = [j < n ? P(t, s.values[j], `That was at index ${j} before the insert. Inserting at index ${i} shifted it to index ${j + 1}.`) : RAW(IOOBE, `After the insert the size is ${n + 1}, so index ${j} is valid.`), P(t, v, `${lit(t, v)} is at index ${i}.`), j + 1 <= n ? P(t, end.get(j + 1 <= n ? j + 1 : j), "Count from index 0.") : null, P(t, end.get(j - 1), "Count from index 0."), RAW(j, "get returns an element, not an index.")];
      const { choices, answer } = buildChoices(R, P(t, ans), pool);
      const code = `${renderOp(op, nm, t)}\nSystem.out.println(${nm}.get(${j}));`;
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: `${describeOp(op, L0, nm)} Now index ${j} holds ${lit(t, ans)}.`,
        reveal: revealDiff(L0, end),
        javaChecks: [check("get after insert", program({ lists: [s], body: code }), javaStr(ans))],
      });
    },
  },
  {
    id: "D.valid-insert",
    family: "D",
    level: 3,
    concept: "Valid insertion index",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 5) });
      const n = s.values.length,
        nm = s.name,
        t = s.type;
      const v = freshValue(R, s);
      const variant = R.pick(["which-runs", "which-throws"]);
      let options;
      if (variant === "which-runs")
        options = [
          { op: { m: "addAt", i: n, v }, ok: true },
          { op: { m: "get", i: n }, why: `Index ${n} is size(); get accepts only 0 to ${n - 1}.` },
          { op: { m: "set", i: n, v }, why: `set can only replace an existing element (0 to ${n - 1}).` },
          { op: { m: "removeAt", i: n }, why: `There is no element at index ${n} to remove.` },
          { op: { m: "addAt", i: n + 1, v }, why: `add(index, e) accepts 0 to size() (${n}); ${n + 1} is too far.` },
        ];
      else
        options = [
          { op: { m: "addAt", i: n + 1, v }, ok: true },
          { op: { m: "addAt", i: n, v }, why: `add at index size() (${n}) is legal: it appends.` },
          { op: { m: "addAt", i: 0, v }, why: "Index 0 is always a valid insertion point." },
          { op: { m: "get", i: n - 1 }, why: `Index ${n - 1} is the last valid index for get.` },
          { op: { m: "set", i: n - 1, v }, why: `Index ${n - 1} holds an element, so set can replace it.` },
        ];
      const [good, ...bad] = options;
      const { choices, answer } = buildChoices(R, CODE(renderOp(good.op, nm, t)), R.shuffle(bad).map((b) => CODE(renderOp(b.op, nm, t), b.why)));
      const all = options.map((o) => ({ ...o, text: renderOp(o.op, nm, t) }));
      const javaChecks = choices.map((c) => {
        const o = all.find((x) => x.text === c.value);
        const r = run(t, s.values, [o.op]);
        return check("validity", program({ lists: [s], body: c.value, print: nm }), r.error ? IOOBE : listStr(r.list.values));
      });
      // exactly one choice matches the question
      const throwsCount = javaChecks.filter((j) => j.output === IOOBE).length;
      if (variant === "which-runs" ? throwsCount !== choices.length - 1 : throwsCount !== 1) retry();
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        question: variant === "which-runs" ? `\`${nm}\` has size ${n}. Which statement runs WITHOUT throwing an exception?` : `\`${nm}\` has size ${n}. Which statement throws an IndexOutOfBoundsException?`,
        choices,
        answer,
        explanation: `For a list of size ${n}, get, set, and remove(index) accept indices 0 to ${n - 1}. add(index, e) also accepts index ${n} (= size()), which appends. Index ${n + 1} is never valid.`,
        javaChecks,
      });
    },
  },
  {
    id: "D.two-inserts",
    family: "D",
    level: 2,
    concept: "Consecutive insertions",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(2, 4) });
      const a = freshValue(R, s),
        b = freshValue(R, s, [a]);
      const n = s.values.length;
      const i1 = R.int(0, n);
      const i2 = R.int(0, n + 1);
      const ops = [{ m: "addAt", i: i1, v: a }, { m: "addAt", i: i2, v: b }];
      const noShift = (() => {
        // both indices read against the ORIGINAL list (forgets the first insert shifted things)
        const out = s.values.slice();
        const pairs = [[i1, a], [i2 > n ? n : i2, b]].sort((x, y) => y[0] - x[0]);
        for (const [i, v] of pairs) out.splice(i, 0, v);
        return out;
      })();
      const { choices, answer, end } = listChoiceFromOps(R, s, ops, R.shuffle(["addAtAsSet", "addAtAfter", "oneBased", "appendIgnoreIndex"]), [LST(noShift, "The second insert uses the list as it is AFTER the first insert, with elements already shifted.")]);
      const code = ops.map((o) => renderOp(o, s.name, s.type)).join("\n");
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: `What is \`${s.name}\` after both statements?`,
        choices,
        answer,
        explanation: opsTrace(s, ops, s.name).join(" "),
        reveal: revealDiff(new JList(s.type, s.values), end),
        javaChecks: [check("two inserts", program({ lists: [s], body: code, print: s.name }), listStr(end.values))],
      });
    },
  },
];

/* ================================================================== */
/* E. Remove by index                                                  */
/* ================================================================== */
const E = [
  {
    id: "E.remove-result",
    family: "E",
    level: 1,
    concept: "remove(index) shifts left",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6) });
      const n = s.values.length;
      const i = R.int(0, n - 1);
      const op = { m: "removeAt", i };
      const removeLast = s.values.slice(0, -1);
      const { choices, answer, end } = listChoiceFromOps(R, s, [op], R.shuffle(["oneBased", "indexPlusOne", "removeAtAsObj"]), [i !== n - 1 ? LST(removeLast, "remove(index) removes the element at that index, not the last element.") : null, i !== 0 ? LST(s.values.slice(1), "Index 0 is the first element; this call uses index " + i + ".") : null]);
      const L0 = new JList(s.type, s.values);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code: renderOp(op, s.name, s.type),
        question: `What is \`${s.name}\` after this statement?`,
        choices,
        answer,
        explanation: describeOp(op, L0, s.name),
        reveal: revealDiff(L0, end),
        javaChecks: [check("remove", program({ lists: [s], body: renderOp(op, s.name, s.type), print: s.name }), listStr(end.values))],
      });
    },
  },
  {
    id: "E.tap-removed",
    family: "E",
    level: 1,
    concept: "Which element is removed",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(4, 7), type: R.chance(0.5) ? "String" : "Integer", min: 10, max: 40 });
      const n = s.values.length,
        nm = s.name;
      const form = R.weighted([["literal", 4], ["last", 1.5], ["minus", 1.5]]);
      let i, iText;
      if (form === "literal") (i = R.int(0, n - 1)), (iText = String(i));
      else if (form === "last") (i = n - 1), (iText = `${nm}.size() - 1`);
      else (i = n - 2), (iText = `${nm}.size() - 2`);
      const op = { m: "removeAt", i, iText };
      const L0 = new JList(s.type, s.values);
      const end = run(s.type, L0, [op]).list;
      return base(R, tpl, {
        kind: "cell",
        list: startView(s),
        question: `\`${renderOp(op, nm, s.type)}\` — tap the element that is removed.`,
        answer: i,
        uniqueValues: true,
        explanation: `${iText !== String(i) ? `${iText} is ${i}. ` : ""}${describeOp(op, L0, nm)}`,
        reveal: revealDiff(L0, end),
        javaChecks: [check("tap removed", program({ lists: [s], print: `${renderExpr(op, nm, s.type)} + " " + ${nm}` }), `${javaStr(s.values[i])} ${listStr(end.values)}`)],
      });
    },
  },
  {
    id: "E.remove-returns",
    family: "E",
    level: 2,
    concept: "remove(index) returns the element",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6) });
      const n = s.values.length,
        t = s.type,
        nm = s.name;
      const i = R.int(0, n - 1);
      const decl = t === "Integer" ? R.pick(["int", "Integer"]) : "String";
      const code = `${decl} gone = ${nm}.remove(${i});\nSystem.out.println(gone);`;
      const pool = [RAW(i, "remove(int index) returns the removed ELEMENT, not the index."), RAW("true", "Only remove(Object) returns a boolean. remove(int index) returns the removed element."), i + 1 < n ? P(t, s.values[i + 1], `That element shifts into index ${i} after the removal; the returned value is the one removed.`) : null, i > 0 ? P(t, s.values[i - 1], "Count from index 0.") : null, P(t, s.values[(i + 2) % n], "Count from index 0.")];
      const { choices, answer } = buildChoices(R, P(t, s.values[i]), pool);
      const L0 = new JList(t, s.values);
      const end = run(t, L0, [{ m: "removeAt", i }]).list;
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: `remove(${i}) takes out ${lit(t, s.values[i])} (index ${i}) and returns it. The elements after it shift left.`,
        reveal: revealDiff(L0, end),
        javaChecks: [check("remove return", program({ lists: [s], body: code }), javaStr(s.values[i]))],
      });
    },
  },
  {
    id: "E.get-after-remove",
    family: "E",
    level: 2,
    concept: "Indices after removal",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6) });
      const n = s.values.length,
        t = s.type,
        nm = s.name;
      const i = R.chance(0.2) ? n - 1 : R.int(0, n - 2);
      const code = `${nm}.remove(${i});\nSystem.out.println(${nm}.get(${i}));`;
      const L0 = new JList(t, s.values);
      const end = run(t, L0, [{ m: "removeAt", i }]).list;
      const ans = i < end.size() ? end.get(i) : IOOBE;
      const pool =
        ans === IOOBE
          ? [P(t, s.values[i], "That element was removed."), P(t, s.values[i - 1], `After the removal the size is ${n - 1}, so index ${i} no longer exists.`), RAW(i, "get returns an element, not an index."), RAW("null", "Java does not leave an empty slot; the list just gets shorter.")]
          : [P(t, s.values[i], `${lit(t, s.values[i])} was removed; the next element shifted into index ${i}.`), i + 2 < n ? P(t, s.values[i + 2], "Each later element shifts left by exactly one position.") : RAW(IOOBE, `The list still has ${n - 1} elements, so index ${i} is valid.`), RAW("null", "Java does not leave an empty slot; later elements shift left."), i > 0 ? P(t, s.values[i - 1], "Elements before the removed one do not move.") : RAW(i, "get returns an element, not an index.")];
      const { choices, answer } = buildChoices(R, ans === IOOBE ? RAW(IOOBE) : P(t, ans), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: `${describeOp({ m: "removeAt", i }, L0, nm)} ${ans === IOOBE ? `The valid indices are now 0 to ${n - 2}, so get(${i}) throws an IndexOutOfBoundsException.` : `Index ${i} now holds ${lit(t, ans)}.`}`,
        reveal: revealDiff(L0, end),
        javaChecks: [check("get after remove", program({ lists: [s], body: code }), ans === IOOBE ? IOOBE : javaStr(ans))],
      });
    },
  },
  {
    id: "E.two-removes",
    family: "E",
    level: 3,
    concept: "Consecutive removals",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(4, 6) });
      const n = s.values.length;
      const a = R.int(0, n - 2);
      const b = R.int(a, n - 2); // b >= a so forgetting the shift matters
      const ops = [{ m: "removeAt", i: a }, { m: "removeAt", i: b }];
      const original = s.values.filter((_, k) => k !== a && k !== b);
      const { choices, answer, end } = listChoiceFromOps(R, s, ops, ["oneBased", "removeAtAsObj"], [a !== b ? LST(original, `That removes the ORIGINAL indices ${a} and ${b}. After the first removal, everything after index ${a} shifted left.`) : LST(s.values.filter((_, k) => k !== a), `remove(${a}) runs twice; the second call removes the element that shifted into index ${a}.`), LST(s.values.filter((_, k) => k !== b + 1 && k !== b + 2), "Each removal shifts later elements left by one.")]);
      const code = ops.map((o) => renderOp(o, s.name, s.type)).join("\n");
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question: `What is \`${s.name}\` after both statements?`,
        choices,
        answer,
        explanation: opsTrace(s, ops, s.name).join(" "),
        reveal: revealDiff(new JList(s.type, s.values), end),
        javaChecks: [check("two removes", program({ lists: [s], body: code, print: s.name }), listStr(end.values))],
      });
    },
  },
];

/* ================================================================== */
/* F. Remove by value versus index                                     */
/* ================================================================== */
/* Integer list where some values are also valid indices of OTHER elements,
   so remove(int) and remove(Object) lead to different results. */
function overloadList(R, n, { dup = false } = {}) {
  for (let g = 0; g < 200; g++) {
    const vals = [];
    while (vals.length < n) {
      const v = R.chance(0.45) ? R.int(0, n - 1) : R.int(2, 15);
      if (!dup && vals.includes(v)) continue;
      if (dup && vals.filter((x) => x === v).length >= 2) continue;
      vals.push(v);
    }
    if (dup && new Set(vals).size === vals.length) continue;
    // need some value k that is a valid index and sits at a different index
    if (vals.some((v, i) => v < n && v !== i)) return vals;
  }
  retry();
}
const F = [
  {
    id: "F.remove-object-dup",
    family: "F",
    level: 2,
    concept: "remove(Object) removes the first match",
    make(R, tpl) {
      const asString = R.chance(0.3);
      let s;
      if (asString) {
        const name = R.pick(["words", "pets", "colors"]);
        const base3 = strValues(R, STR_POOLS[name], R.int(3, 4));
        const dupV = R.pick(base3.slice(0, -1));
        const vals = base3.slice();
        if (vals.indexOf(dupV) + 2 > vals.length) retry();
        vals.splice(R.int(vals.indexOf(dupV) + 2, vals.length), 0, dupV);
        s = { type: "String", name, values: vals, pool: STR_POOLS[name] };
      } else {
        const n = R.int(4, 6);
        const vals = overloadList(R, n, { dup: true });
        s = { type: "Integer", name: R.pick(INT_NAMES), values: vals };
      }
      const counts = {};
      s.values.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
      const dupVals = Object.keys(counts).filter((k) => counts[k] > 1).map((k) => (s.type === "Integer" ? Number(k) : k));
      if (!dupVals.length) retry();
      const v = R.pick(dupVals);
      const op = { m: "removeObj", v, form: R.chance(0.8) ? "valueOf" : "cast" };
      const { choices, answer, end } = listChoiceFromOps(R, s, [op], ["removeAllMatches", "removeLastMatch", "removeObjAsIndex"], [LST(s.values, "remove(Object) does change the list when a match exists.")]);
      const L0 = new JList(s.type, s.values);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code: renderOp(op, s.name, s.type),
        question: `What is \`${s.name}\` after this statement?`,
        choices,
        answer,
        explanation: describeOp(op, L0, s.name) + (s.type === "Integer" ? ` Wrapping the value in ${op.form === "cast" ? "(Integer)" : "Integer.valueOf"} makes Java choose remove(Object) instead of remove(int index).` : " A String argument can only match remove(Object)."),
        reveal: revealDiff(L0, end),
        javaChecks: [check("remove object", program({ lists: [s], body: renderOp(op, s.name, s.type), print: s.name }), listStr(end.values))],
      });
    },
  },
  {
    id: "F.int-literal-index",
    family: "F",
    level: 3,
    concept: "An int argument removes by index",
    make(R, tpl) {
      const n = R.int(4, 6);
      const vals = overloadList(R, n);
      const s = { type: "Integer", name: R.pick(INT_NAMES), values: vals };
      const ks = vals.filter((v, i) => v < n && v !== i);
      const k = R.pick(ks);
      const form = R.weighted([["literal", 3], ["intVar", 1]]);
      const op = { m: "removeAt", i: k, iText: form === "literal" ? String(k) : "pos" };
      const code = (form === "intVar" ? `int pos = ${k};\n` : "") + renderOp(op, s.name, s.type);
      const { choices, answer, end } = listChoiceFromOps(R, s, [op], ["removeAtAsObj", "oneBased", "indexPlusOne"]);
      const L0 = new JList(s.type, s.values);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: `What is \`${s.name}\` after ${form === "literal" ? "this statement" : "these statements"}?`,
        choices,
        answer,
        explanation: `${form === "literal" ? `${k} is an int literal` : "pos is an int variable"}, so Java chooses remove(int index), not remove(Object). ${describeOp({ m: "removeAt", i: k }, L0, s.name)} To remove the VALUE ${k}, write \`${s.name}.remove(Integer.valueOf(${k}))\`.`,
        reveal: revealDiff(L0, end),
        javaChecks: [check("int literal", program({ lists: [s], body: code, print: s.name }), listStr(end.values))],
      });
    },
  },
  {
    id: "F.tap-overload",
    family: "F",
    level: 3,
    concept: "remove(int) vs. remove(Object)",
    make(R, tpl) {
      const n = R.int(4, 6);
      const vals = overloadList(R, n, { dup: R.chance(0.4) });
      const s = { type: "Integer", name: R.pick(INT_NAMES), values: vals };
      const nm = s.name;
      const candidates = [...new Set(vals.filter((v, i) => v < n && vals.indexOf(v) !== v))];
      if (!candidates.length) retry();
      const k = R.pick(candidates);
      const form = R.pick(["valueOf", "literal", "intVar", "integerVar"]);
      let code, removed, explanation;
      if (form === "valueOf" || form === "integerVar") {
        code = form === "valueOf" ? `${nm}.remove(Integer.valueOf(${k}));` : `Integer target = ${k};\n${nm}.remove(target);`;
        removed = vals.indexOf(k);
        explanation = `${form === "valueOf" ? `Integer.valueOf(${k}) is an Integer object` : "target is declared as Integer (an object, not an int)"}, so Java calls remove(Object). It removes the first element equal to ${k}, at index ${removed}.`;
      } else {
        code = form === "literal" ? `${nm}.remove(${k});` : `int target = ${k};\n${nm}.remove(target);`;
        removed = k;
        explanation = `${form === "literal" ? `${k} is an int literal` : "target is declared as int"}, so Java calls remove(int index). It removes the element at index ${k}, which is ${vals[k]}.`;
      }
      const L0 = new JList(s.type, s.values);
      const end = run("Integer", L0, [form === "valueOf" || form === "integerVar" ? { m: "removeObj", v: k } : { m: "removeAt", i: k }]).list;
      return base(R, tpl, {
        kind: "cell",
        list: startView(s),
        code,
        question: "Tap the element that this code removes.",
        answer: removed,
        explanation: explanation + " The elements after it shift left.",
        reveal: revealDiff(L0, end),
        javaChecks: [check("overload", program({ lists: [s], body: code, print: nm }), listStr(end.values))],
      });
    },
  },
  {
    id: "F.return-types",
    family: "F",
    level: 2,
    concept: "What remove returns",
    make(R, tpl) {
      const n = R.int(4, 6);
      const vals = overloadList(R, n);
      const s = { type: "Integer", name: R.pick(INT_NAMES), values: vals };
      const nm = s.name;
      const variant = R.pick(["object", "object-missing", "index"]);
      let code, correct, pool, out;
      if (variant === "index") {
        const k = R.pick(vals.filter((v, i) => v < n && v !== i));
        code = `System.out.println(${nm}.remove(${k}));`;
        out = String(vals[k]);
        correct = RAW(out);
        pool = [RAW("true", "remove(int index) returns the removed element. Only remove(Object) returns a boolean."), RAW(k, `${k} is the index; the element at index ${k} is ${vals[k]}.`), RAW(vals.indexOf(k), "This call removes by index, not by searching for a value."), RAW("false", "remove(int index) returns the removed element.")];
      } else {
        const present = variant === "object";
        const v = present ? R.pick(vals) : freshValue(R, { type: "Integer", values: vals });
        code = `System.out.println(${nm}.remove(Integer.valueOf(${v})));`;
        out = String(present);
        correct = RAW(out);
        pool = [RAW(String(!present), present ? `${v} is in the list, so remove(Object) removes it and returns true.` : `No element equals ${v}, so nothing is removed and the method returns false.`), RAW(present ? vals.indexOf(v) : -1, "remove(Object) returns a boolean, not an index."), RAW(v, "remove(Object) returns true/false, not the value."), v < n ? RAW(vals[v], "Integer.valueOf makes Java search for a value; it does not use an index.") : RAW(IOOBE, "remove(Object) never throws for a missing value; it returns false.")];
      }
      const { choices, answer } = buildChoices(R, correct, pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: variant === "index" ? `The int argument selects remove(int index), which returns the removed element, ${out}.` : `Integer.valueOf(...) selects remove(Object), which returns a boolean: ${out === "true" ? "true because a matching element was found and removed" : "false because no element matched, so the list is unchanged"}.`,
        javaChecks: [check("return", program({ lists: [s], body: code }), out)],
      });
    },
  },
  {
    id: "F.string-remove",
    family: "F",
    level: 2,
    concept: "remove(Object) with Strings",
    make(R, tpl) {
      const name = R.pick(["names", "pets", "colors", "words"]);
      const vals = strValues(R, STR_POOLS[name], R.int(3, 5));
      const s = { type: "String", name, values: vals };
      const n = vals.length;
      const variant = R.weighted([["present", 2], ["case", 1.2], ["missing", 0.6], ["index", 1]]);
      let arg, removed, code;
      if (variant === "index") {
        const i = R.int(0, n - 1);
        arg = String(i);
        code = `System.out.println(${name}.remove(${i}) + " " + ${name}.size());`;
        removed = vals[i];
      } else {
        const target = R.pick(vals);
        const q = variant === "present" ? target : variant === "case" ? (target[0] === target[0].toUpperCase() ? target.toLowerCase() : target[0].toUpperCase() + target.slice(1)) : freshValue(R, { ...s, pool: STR_POOLS[name] });
        arg = `"${q}"`;
        code = `System.out.println(${name}.remove(${arg}) + " " + ${name}.size());`;
        removed = vals.includes(q) ? true : false;
      }
      const out = variant === "index" ? `${removed} ${n - 1}` : `${removed} ${removed ? n - 1 : n}`;
      const pool =
        variant === "index"
          ? [RAW(`true ${n - 1}`, "remove(int index) returns the removed element, not true."), RAW(`${removed} ${n}`, "The size decreases after a successful removal."), RAW(`${arg} ${n - 1}`, "It returns the element, not the index."), RAW(`${vals[(Number(arg) + 1) % n]} ${n - 1}`, "Count from index 0.")]
          : [RAW(`${!removed} ${removed ? n - 1 : n}`, removed ? "A matching String was found, so remove returns true." : "No element equals " + arg + ", so remove returns false."), RAW(`${removed} ${removed ? n : n - 1}`, removed ? "A successful removal makes the list one element shorter." : "Nothing was removed, so the size is unchanged."), RAW(`${!removed} ${removed ? n : n - 1}`, variant === "case" ? "String matching uses equals(), which is case-sensitive." : "Check whether a matching element exists."), RAW(`${vals.indexOf(arg.slice(1, -1))} ${n - 1}`, "remove(Object) returns a boolean, not an index.")];
      const { choices, answer } = buildChoices(R, RAW(out), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation:
          variant === "index"
            ? `An int argument selects remove(int index): it returns the removed String ${removed}, and the size becomes ${n - 1}.`
            : `A String argument selects remove(Object), which compares with equals()${variant === "case" ? " — and equals() is case-sensitive" : ""}. ${removed ? `It finds ${arg}, removes it, and returns true; the size becomes ${n - 1}.` : `No element equals ${arg}, so it returns false and the size stays ${n}.`} (Java evaluates the left operand first, so size() sees the list after the removal.)`,
        javaChecks: [check("string remove", program({ lists: [s], body: code }), out)],
      });
    },
  },
];

/* ================================================================== */
/* G. size() and valid indices                                         */
/* ================================================================== */
function randomOps(R, s, count, kinds = ["add", "addAt", "set", "removeAt", "removeObj"]) {
  const L = new JList(s.type, s.values);
  const ops = [];
  const used = [...s.values];
  for (let k = 0; k < count; k++) {
    const options = kinds.filter((m) => (["set", "removeAt", "removeObj"].includes(m) ? L.size() > 0 : true));
    const m = R.pick(options);
    let op;
    if (m === "add" || m === "addAt" || m === "set") {
      const v = freshValue(R, { ...s, values: used });
      used.push(v);
      op = m === "add" ? { m, v } : m === "addAt" ? { m, i: R.int(0, L.size()), v } : { m, i: R.int(0, L.size() - 1), v };
    } else if (m === "removeAt") op = { m, i: R.int(0, L.size() - 1) };
    else op = { m, v: R.pick(L.values), form: "valueOf" };
    applyOp(L, op);
    ops.push(op);
  }
  return { ops, list: L };
}
const G = [
  {
    id: "G.size-after",
    family: "G",
    level: 1,
    concept: "size() changes",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(0, 3) });
      const { ops, list } = randomOps(R, s, R.int(3, 4));
      if (!ops.some((o) => o.m === "set") && R.chance(0.6)) retry();
      const size = list.size();
      const sets = ops.filter((o) => o.m === "set").length;
      const removes = ops.filter((o) => o.m.startsWith("remove")).length;
      const pool = [sets ? RAW(size + sets, "set replaces an element; it does not change the size.") : null, removes ? RAW(size + removes, "Each successful remove decreases the size by one.") : null, RAW(size - 1, "size() counts elements; the last index is size() - 1."), RAW(size + 1, "Count the elements after every statement runs."), RAW(ops.length + s.values.length, "Not every statement adds an element.")];
      const { choices, answer } = buildChoices(R, RAW(size), pool);
      const code = [...setupLines(s.type, s.name, s.values), ...ops.map((o) => renderOp(o, s.name, s.type))].join("\n");
      return base(R, tpl, {
        kind: "choice",
        code,
        question: `What does \`${s.name}.size()\` return after this code runs?`,
        choices,
        answer,
        explanation: `${s.values.length ? `The list starts with ${s.values.length} element${s.values.length === 1 ? "" : "s"}. ` : "The list starts empty. "}add and add(index, e) each add one, remove takes one away, and set leaves the size unchanged. ` + opsTrace(s, ops, s.name).join(" "),
        reveal: revealDiff(new JList(s.type, s.values), list),
        javaChecks: [check("size", program({ lists: [], body: code, print: `${s.name}.size()` }), String(size))],
      });
    },
  },
  {
    id: "G.last-index",
    family: "G",
    level: 2,
    concept: "Last valid index",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 5) });
      const { ops, list } = randomOps(R, s, R.int(2, 3));
      const size = list.size();
      if (size < 2) retry();
      const pool = [RAW(size, "size() is one past the last valid index."), RAW(s.values.length - 1, "That was the last index before these statements changed the size."), RAW(size - 2, "Indices run from 0 to size() - 1."), RAW(size + 1, "Indices run from 0 to size() - 1.")];
      const { choices, answer } = buildChoices(R, RAW(size - 1), pool);
      const code = ops.map((o) => renderOp(o, s.name, s.type)).join("\n");
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: `After this code, what is the largest index \`i\` for which \`${s.name}.get(i)\` works?`,
        choices,
        answer,
        explanation: `${opsTrace(s, ops, s.name).join(" ")} The size is ${size}, so the valid indices are 0 to ${size - 1}.`,
        reveal: revealDiff(new JList(s.type, s.values), list),
        javaChecks: [check("last index", program({ lists: [s], body: code, print: `${s.name}.size() - 1 + " " + ${s.name}.get(${s.name}.size() - 1)` }), `${size - 1} ${javaStr(list.get(size - 1))}`)],
      });
    },
  },
  {
    id: "G.which-throws",
    family: "G",
    level: 2,
    concept: "Index bounds for get/set/remove",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 5) });
      const n = s.values.length,
        nm = s.name,
        t = s.type;
      const v = freshValue(R, s);
      const bad = R.pick([
        { op: { m: "get", i: n, iText: `${nm}.size()` } },
        { op: { m: "set", i: n, v, iText: `${nm}.size()` } },
        { op: { m: "removeAt", i: n, iText: `${nm}.size()` } },
        { op: { m: "get", i: n } },
      ]);
      const goods = [
        { op: { m: "get", i: n - 1, iText: `${nm}.size() - 1` }, why: "size() - 1 is the last valid index." },
        { op: { m: "addAt", i: n, v, iText: `${nm}.size()` }, why: "Inserting at index size() is legal; it appends." },
        { op: { m: "set", i: 0, v }, why: "Index 0 exists in a non-empty list." },
        { op: { m: "removeAt", i: n - 1 }, why: `Index ${n - 1} is the last element, so it can be removed.` },
        { op: { m: "get", i: n - 2 }, why: `Index ${n - 2} exists.` },
      ];
      const { choices, answer } = buildChoices(R, CODE(renderOp(bad.op, nm, t)), R.shuffle(goods).map((g) => CODE(renderOp(g.op, nm, t), g.why)));
      const all = [bad, ...goods];
      const javaChecks = choices.map((c) => {
        const o = all.find((x) => renderOp(x.op, nm, t) === c.value);
        const r = run(t, s.values, [o.op]);
        return check("bounds", program({ lists: [s], body: c.value, print: nm }), r.error ? IOOBE : listStr(r.list.values));
      });
      if (javaChecks.filter((j) => j.output === IOOBE).length !== 1) retry();
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        question: `Which statement throws an IndexOutOfBoundsException?`,
        choices,
        answer,
        explanation: `The list has ${n} elements, so get, set, and remove(index) accept indices 0 to ${n - 1}. \`${choices[answer].value}\` uses index ${n}. Only add(index, e) may use index size().`,
        javaChecks,
      });
    },
  },
  {
    id: "G.empty-check",
    family: "G",
    level: 1,
    concept: "isEmpty() and size()",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(1, 3) });
      const ops = [];
      const L = new JList(s.type, s.values);
      const steps = R.int(1, 3);
      for (let k = 0; k < steps && L.size() > 0; k++) {
        const op = R.chance(0.7) ? { m: "removeAt", i: R.int(0, L.size() - 1) } : { m: "set", i: R.int(0, L.size() - 1), v: freshValue(R, { ...s, values: [...s.values, ...L.values] }) };
        applyOp(L, op);
        ops.push(op);
      }
      if (L.size() > 0 && R.chance(0.5)) {
        while (L.size() > 0) {
          const op = { m: "removeAt", i: 0 };
          applyOp(L, op);
          ops.push(op);
        }
      }
      const size = L.size(),
        empty = size === 0;
      const print = `${s.name}.size() + " " + ${s.name}.isEmpty()`;
      const code = [...setupLines(s.type, s.name, s.values), ...ops.map((o) => renderOp(o, s.name, s.type)), `System.out.println(${print});`].join("\n");
      const out = `${size} ${empty}`;
      const pool = [RAW(`${size} ${!empty}`, "isEmpty() is true exactly when size() is 0."), RAW(`${size + 1} ${empty}`, "Count the elements after each statement."), RAW(`${Math.max(size - 1, 0)} ${!empty}`, "isEmpty() is true exactly when size() is 0."), RAW(`${s.values.length} ${s.values.length === 0}`, "remove shrinks the list; the size is not fixed like an array's length."), RAW(`${size + ops.filter((o) => o.m === "set").length} ${empty}`, "set does not change the size.")];
      const { choices, answer } = buildChoices(R, RAW(out), pool);
      return base(R, tpl, {
        kind: "choice",
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: `${opsTrace(s, ops, s.name).join(" ")} size() is ${size}, so isEmpty() returns ${empty}.`,
        reveal: revealDiff(new JList(s.type, s.values), L),
        javaChecks: [check("empty", program({ lists: [], body: code }), out)],
      });
    },
  },
];

/* ================================================================== */
/* H. contains() and indexOf()                                         */
/* ================================================================== */
function dupList(R, type, n) {
  if (type === "Integer") {
    const vals = intValues(R, n - 1, { min: 1, max: 20 });
    const dv = R.pick(vals.slice(0, -1));
    vals.splice(R.int(vals.indexOf(dv) + 1, vals.length), 0, dv);
    return { type, name: R.pick(INT_NAMES), values: vals, dupValue: dv };
  }
  const name = R.pick(["names", "pets", "colors", "words"]);
  const vals = strValues(R, STR_POOLS[name], n - 1);
  const dv = R.pick(vals.slice(0, -1));
  vals.splice(R.int(vals.indexOf(dv) + 1, vals.length), 0, dv);
  return { type, name, values: vals, pool: STR_POOLS[name], dupValue: dv };
}
const H = [
  {
    id: "H.indexOf",
    family: "H",
    level: 1,
    concept: "indexOf returns the first match",
    make(R, tpl) {
      const type = R.chance(0.5) ? "String" : "Integer";
      const s = dupList(R, type, R.int(4, 6));
      const n = s.values.length,
        t = s.type;
      const variant = R.weighted([["dup", 5], ["single", 2], ["missing", 1.5]]);
      let q;
      if (variant === "dup") q = s.dupValue;
      else if (variant === "single") q = R.pick(s.values.filter((v) => v !== s.dupValue));
      else q = freshValue(R, s);
      const L = new JList(t, s.values);
      const ans = L.indexOf(q);
      const pool =
        ans >= 0
          ? [L.lastIndexOf(q) !== ans ? RAW(L.lastIndexOf(q), "indexOf returns the FIRST match. (lastIndexOf would find the last.)") : null, RAW(ans + 1, "Indices start at 0."), t === "Integer" ? RAW(q, "indexOf returns a position, not the value.") : RAW("true", "indexOf returns an int position; contains returns true/false."), RAW(-1, `${lit(t, q)} is in the list.`), RAW(ans - 1 >= 0 ? ans - 1 : n, "Count from index 0.")]
          : [RAW(0, "0 would mean the value is the first element."), RAW(n, "indexOf never returns size(); a missing value gives -1."), RAW(IOOBE, "indexOf does not throw for a missing value; it returns -1."), RAW("false", "indexOf returns an int; contains would return false.")];
      const { choices, answer } = buildChoices(R, RAW(ans), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        question: `What does \`${s.name}.indexOf(${lit(t, q)})\` return?`,
        choices,
        answer,
        explanation: ans >= 0 ? `indexOf searches from index 0 and returns the index of the first element equal to ${lit(t, q)}: ${ans}.${L.lastIndexOf(q) !== ans ? ` The later copy at index ${L.lastIndexOf(q)} is never reached.` : ""}` : `No element equals ${lit(t, q)}, so indexOf returns -1.`,
        javaChecks: [check("indexOf", program({ lists: [s], print: `${s.name}.indexOf(${lit(t, q)})` }), String(ans))],
      });
    },
  },
  {
    id: "H.tap-indexOf",
    family: "H",
    level: 1,
    concept: "First occurrence",
    make(R, tpl) {
      const type = R.chance(0.6) ? "String" : "Integer";
      const s = dupList(R, type, R.int(4, 7));
      const q = s.dupValue;
      const L = new JList(s.type, s.values);
      return base(R, tpl, {
        kind: "cell",
        list: startView(s),
        question: `Tap the element whose index \`${s.name}.indexOf(${lit(s.type, q)})\` returns.`,
        answer: L.indexOf(q),
        explanation: `indexOf scans from index 0 and stops at the first element equal to ${lit(s.type, q)}, so it returns ${L.indexOf(q)} (not ${L.lastIndexOf(q)}).`,
        javaChecks: [check("tap indexOf", program({ lists: [s], print: `${s.name}.indexOf(${lit(s.type, q)})` }), String(L.indexOf(q)))],
      });
    },
  },
  {
    id: "H.contains-indexOf",
    family: "H",
    level: 2,
    concept: "contains vs. indexOf · case-sensitive",
    make(R, tpl) {
      const name = R.pick(["names", "pets", "colors", "cities"]);
      const sraw = dupList(R, "String", R.int(4, 5));
      const vals = sraw.values.map((v) => v);
      const s = { type: "String", name, values: vals };
      if (name !== sraw.name) {
        const pool = STR_POOLS[name];
        const map = {};
        const used = new Set();
        for (const v of vals) if (!(v in map)) {
          const c = pool.find((p) => !used.has(p));
          if (!c) retry();
          map[v] = c;
          used.add(c);
        }
        s.values = vals.map((v) => map[v]);
      }
      const L = new JList("String", s.values);
      const pickV = R.pick(s.values);
      const flip = (w) => (w[0] === w[0].toUpperCase() ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1));
      const q1 = R.chance(0.5) ? flip(pickV) : R.pick(s.values);
      const q2 = R.chance(0.7) ? s.values.find((v, i) => s.values.indexOf(v) !== i) : R.pick(s.values);
      const c1 = L.contains(q1),
        i2 = L.indexOf(q2);
      const print = `${name}.contains("${q1}") + " " + ${name}.indexOf("${q2}")`;
      const out = `${c1} ${i2}`;
      const pool = [RAW(`${!c1} ${i2}`, q1 !== flip(q1) && !c1 ? "contains uses equals(), which is case-sensitive." : "Check contains again: it compares with equals()."), RAW(`${c1} ${L.lastIndexOf(q2)}`, "indexOf returns the first match, not the last."), RAW(`${c1} ${i2 + 1}`, "Indices start at 0."), RAW(`${!c1} ${L.lastIndexOf(q2)}`, "contains is case-sensitive, and indexOf returns the first match."), RAW(`${!c1} -1`, "Both methods compare Strings with equals().")];
      const { choices, answer } = buildChoices(R, RAW(out), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code: `System.out.println(${print});`,
        question: "What is printed?",
        choices,
        answer,
        explanation: `contains("${q1}") is ${c1}${!c1 && s.values.some((v) => v.toLowerCase() === q1.toLowerCase()) ? " — equals() is case-sensitive, so a different capitalization does not match" : ""}. indexOf("${q2}") returns the index of the first match: ${i2}.`,
        javaChecks: [check("contains", program({ lists: [s], print }), out)],
      });
    },
  },
  {
    id: "H.indexOf-after-change",
    family: "H",
    level: 2,
    concept: "indexOf after insert/remove",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(4, 6) });
      const n = s.values.length,
        t = s.type;
      const target = R.int(1, n - 1);
      const q = s.values[target];
      const opKind = R.pick(["addAt", "removeAt", "set"]);
      let op;
      if (opKind === "addAt") op = { m: "addAt", i: R.int(0, target), v: freshValue(R, s) };
      else if (opKind === "removeAt") op = { m: "removeAt", i: R.int(0, target - 1) };
      else op = { m: "set", i: R.pick([...Array(n).keys()].filter((k) => k !== target)), v: freshValue(R, s) };
      const L0 = new JList(t, s.values);
      const end = run(t, L0, [op]).list;
      const ans = end.indexOf(q);
      const code = `${renderOp(op, s.name, t)}\nSystem.out.println(${s.name}.indexOf(${lit(t, q)}));`;
      const pool = [RAW(target, `That was the index BEFORE the ${op.m === "set" ? "set (which does not move anything)" : "change; the element shifted"}.`), RAW(ans + 1, "Count from index 0."), RAW(ans - 1, "Count from index 0."), RAW(-1, `${lit(t, q)} is still in the list.`), RAW(target + (op.m === "addAt" ? -1 : 1), "Insertion shifts elements right; removal shifts them left.")];
      const { choices, answer } = buildChoices(R, RAW(ans), pool.filter((c) => Number(c.value) >= -1));
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: `${describeOp(op, L0, s.name)} ${lit(t, q)} is now at index ${ans}.`,
        reveal: revealDiff(L0, end),
        javaChecks: [check("indexOf after", program({ lists: [s], body: code }), String(ans))],
      });
    },
  },
];

/* ================================================================== */
/* I. Traversal                                                        */
/* ================================================================== */
const COND_INT = [
  { text: (e, t) => `${e} > ${t}`, f: (x, t) => x > t, neg: (x, t) => x <= t, ge: (x, t) => x >= t, label: (t) => `greater than ${t}` },
  { text: (e, t) => `${e} < ${t}`, f: (x, t) => x < t, neg: (x, t) => x >= t, ge: (x, t) => x <= t, label: (t) => `less than ${t}` },
  { text: (e) => `${e} % 2 == 0`, f: (x) => x % 2 === 0, neg: (x) => x % 2 !== 0, ge: null, label: () => "even" },
];
const I = [
  {
    id: "I.indexed-sum",
    family: "I",
    level: 2,
    concept: "Indexed for loop with get(i)",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6), type: "Integer", min: 1, max: 12 });
      const n = s.values.length,
        nm = s.name;
      const start = R.weighted([[0, 3], [1, 1]]);
      const endV = R.weighted([["size", 3], ["size-1", 1]]);
      const step = R.weighted([[1, 3], [2, 1]]);
      const limit = endV === "size" ? n : n - 1;
      const header = `for (int i = ${start}; i < ${nm}.size()${endV === "size-1" ? " - 1" : ""}; i${step === 1 ? "++" : " += 2"})`;
      const sumIdx = (a, lim, st) => {
        let tot = 0;
        const vis = [];
        for (let i = a; i < lim; i += st) (tot += s.values[i]), vis.push(i);
        return { tot, vis };
      };
      const { tot, vis } = sumIdx(start, limit, step);
      const all = s.values.reduce((x, y) => x + y, 0);
      const code = `int total = 0;\n${header} {\n    total += ${nm}.get(i);\n}\nSystem.out.println(total);`;
      const pool = [RAW(all, "Check the loop's start, condition, and update: not every element is visited."), RAW(vis.reduce((x, y) => x + y, 0), "get(i) returns the element at index i, not i itself."), RAW(sumIdx(start === 0 ? 1 : 0, limit, step).tot, `The loop starts at index ${start}.`), RAW(sumIdx(start, Math.min(n, limit + 1), step).tot, "The condition uses <, so the loop stops before reaching that index."), RAW(tot + 1, "Add only the visited elements.")];
      const { choices, answer } = buildChoices(R, RAW(tot), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: `The loop visits indices ${vis.join(", ")}, adding ${vis.map((i) => s.values[i]).join(" + ")} = ${tot}.`,
        trace: vis.map((i) => `i = ${i}: total += ${nm}.get(${i}) → ${s.values[i]}`),
        javaChecks: [check("sum", program({ lists: [s], body: code }), String(tot))],
      });
    },
  },
  {
    id: "I.conditional-count",
    family: "I",
    level: 2,
    concept: "Count with a condition",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(4, 7), type: "Integer", min: 1, max: 20 });
      const nm = s.name;
      const c = R.pick(COND_INT);
      const t = R.pick(s.values);
      const enhanced = R.chance(0.5);
      const cond = enhanced ? c.text("x", t) : c.text(`${nm}.get(i)`, t);
      const code = `int count = 0;\n${enhanced ? `for (int x : ${nm})` : `for (int i = 0; i < ${nm}.size(); i++)`} {\n    if (${cond}) {\n        count++;\n    }\n}\nSystem.out.println(count);`;
      const cnt = s.values.filter((x) => c.f(x, t)).length;
      const neg = s.values.filter((x) => c.neg(x, t)).length;
      const pool = [RAW(neg, "That counts the elements that do NOT meet the condition."), c.ge ? RAW(s.values.filter((x) => c.ge(x, t)).length, `${c.text("x", t)} is strict; ${t} itself does not count.`) : null, RAW(s.values.filter((x) => c.f(x, t)).reduce((a, b) => a + b, 0), "count++ adds 1 each time, not the element."), RAW(s.values.length, "Only matching elements are counted."), RAW(cnt + 1, "Recheck each element against the condition."), RAW(Math.max(0, cnt - 1), "Recheck each element against the condition.")];
      const { choices, answer } = buildChoices(R, RAW(cnt), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: `The loop checks every element. The ones that are ${c.label(t)}: ${s.values.filter((x) => c.f(x, t)).join(", ") || "none"}. count is ${cnt}.${enhanced ? " In the enhanced for loop, x is each element (auto-unboxed to int), not an index." : ""}`,
        trace: s.values.map((x, i) => `${enhanced ? `x = ${x}` : `i = ${i}: get(${i}) = ${x}`} → ${c.f(x, t) ? "count++" : "skip"}`),
        javaChecks: [check("count", program({ lists: [s], body: code }), String(cnt))],
      });
    },
  },
  {
    id: "I.string-loop",
    family: "I",
    level: 2,
    concept: "Enhanced for with Strings",
    make(R, tpl) {
      const name = R.pick(["words", "pets", "colors", "names", "cities"]);
      const s = { type: "String", name, values: strValues(R, STR_POOLS[name], R.int(3, 5)) };
      const kind = R.pick(["length", "initials", "equals"]);
      let code, ans, pool, expl;
      if (kind === "length") {
        const lens = [...new Set(s.values.map((w) => w.length))];
        const k = R.pick(lens);
        code = `int count = 0;\nfor (String w : ${name}) {\n    if (w.length() > ${k}) {\n        count++;\n    }\n}\nSystem.out.println(count);`;
        const cnt = s.values.filter((w) => w.length > k).length;
        ans = String(cnt);
        pool = [RAW(s.values.filter((w) => w.length >= k).length, `> ${k} is strict: words with exactly ${k} letters do not count.`), RAW(s.values.filter((w) => w.length <= k).length, "That counts the words that do NOT match."), RAW(s.values.length, "Only matching words are counted."), RAW(cnt + 1, "Recheck each word length.")];
        expl = `Words longer than ${k} letters: ${s.values.filter((w) => w.length > k).join(", ") || "none"}. count is ${cnt}.`;
      } else if (kind === "initials") {
        code = `String result = "";\nfor (String w : ${name}) {\n    result += w.substring(0, 1);\n}\nSystem.out.println(result);`;
        ans = s.values.map((w) => w[0]).join("");
        pool = [RAW(ans.split("").reverse().join(""), "The enhanced for loop visits elements from index 0 to the end."), RAW(s.values.map((w) => w.slice(-1)).join(""), "substring(0, 1) is the FIRST character."), RAW(s.values.map((w) => w.slice(0, 2)).join(""), "substring(0, 1) has length 1."), RAW(ans.slice(1), "Every element is visited, including the first.")];
        expl = `The loop visits ${s.values.join(", ")} in order and appends each first letter: ${ans}.`;
      } else {
        const target = R.pick(s.values);
        const cnt = 1;
        const flipCase = R.chance(0.4);
        const q = flipCase ? target.toUpperCase() : target;
        const real = s.values.filter((w) => w === q).length;
        code = `int found = 0;\nfor (String w : ${name}) {\n    if (w.equals("${q}")) {\n        found++;\n    }\n}\nSystem.out.println(found);`;
        ans = String(real);
        pool = [RAW(flipCase ? cnt : 0, flipCase ? "equals() is case-sensitive." : `"${q}" appears in the list.`), RAW(s.values.indexOf(target), "found counts matches; it is not an index."), RAW(s.values.length, "Only equal Strings are counted."), RAW(-1, "found starts at 0 and only goes up.")];
        expl = flipCase ? `equals() is case-sensitive, so "${q}" never matches "${target}". found stays 0.` : `Exactly one element equals "${q}", so found is 1.`;
      }
      const { choices, answer } = buildChoices(R, RAW(ans), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: expl,
        javaChecks: [check("string loop", program({ lists: [s], body: code }), ans)],
      });
    },
  },
  {
    id: "I.search",
    family: "I",
    level: 2,
    concept: "Search with an index loop",
    make(R, tpl) {
      const type = R.chance(0.6) ? "Integer" : "String";
      const s = dupList(R, type, R.int(4, 6));
      const nm = s.name,
        t = s.type;
      const q = R.chance(0.75) ? s.dupValue : R.pick(s.values);
      const brk = R.chance(0.5);
      const cmp = t === "Integer" ? `${nm}.get(i) == target` : `${nm}.get(i).equals(target)`;
      const code = `${t === "Integer" ? "int" : "String"} target = ${lit(t, q)};\nint pos = -1;\nfor (int i = 0; i < ${nm}.size(); i++) {\n    if (${cmp}) {\n        pos = i;${brk ? "\n        break;" : ""}\n    }\n}\nSystem.out.println(pos);`;
      const L = new JList(t, s.values);
      const first = L.indexOf(q),
        last = L.lastIndexOf(q);
      const ans = brk ? first : last;
      const pool = [first !== last ? RAW(brk ? last : first, brk ? "break stops the loop at the first match." : "Without break, later matches overwrite pos, so it ends at the LAST match.") : null, t === "Integer" ? RAW(q, "pos stores an index, not the value.") : RAW("true", "pos stores an index."), RAW(ans + 1, "Indices start at 0."), RAW(-1, "The target is in the list."), RAW(s.values.filter((v) => v === q).length, "pos is an index, not a count.")];
      const { choices, answer } = buildChoices(R, RAW(ans), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: brk ? `The loop stops (break) at the first index where the element equals ${lit(t, q)}: ${ans}.` : `pos is updated every time a match is found, so it ends with the last matching index: ${ans}.${t === "Integer" ? " (Comparing nums.get(i) == target works because target is an int, so the Integer is unboxed and compared by value.)" : " Strings are compared with equals()."}`,
        trace: s.values.map((v, i) => `i = ${i}: ${lit(t, v)}${v === q ? " matches → pos = " + i + (brk && i === first ? ", break" : "") : ""}`).slice(0, brk ? first + 1 : n_(s)),
        javaChecks: [check("search", program({ lists: [s], body: code }), String(ans))],
      });
    },
  },
  {
    id: "I.update-loop",
    family: "I",
    level: 2,
    concept: "Update elements with set(i, …)",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 5), type: "Integer", min: 1, max: 12 });
      const nm = s.name;
      const kind = R.pick(["double", "plusIndex", "condZero"]);
      let body, f, misA, misB, desc;
      if (kind === "double") {
        body = `${nm}.set(i, ${nm}.get(i) * 2);`;
        f = (x) => x * 2;
        misA = s.values.map((x, i) => i * 2);
        misB = s.values.map((x, i) => (i === 0 ? x * 2 : x));
        desc = "doubles every element";
      } else if (kind === "plusIndex") {
        body = `${nm}.set(i, ${nm}.get(i) + i);`;
        misA = s.values.map((x, i) => x + i + 1);
        misB = s.values.map((x) => x + 1);
        desc = "adds each element's index to it";
      } else {
        const t = R.pick(s.values);
        body = `if (${nm}.get(i) > ${t}) {\n        ${nm}.set(i, 0);\n    }`;
        f = (x) => (x > t ? 0 : x);
        misA = s.values.map((x) => (x <= t ? 0 : x));
        misB = s.values.filter((x) => !(x > t));
        desc = `replaces every element greater than ${t} with 0`;
      }
      const result = s.values.map((x, i) => (kind === "plusIndex" ? x + i : f(x)));
      if (JSON.stringify(result) === JSON.stringify(s.values)) retry();
      const code = `for (int i = 0; i < ${nm}.size(); i++) {\n    ${body}\n}`;
      const inserted = [];
      const pool = [LST(misA, kind === "plusIndex" ? "Index i starts at 0, so the first element gets + 0." : kind === "double" ? "get(i) is the element; the loop uses the element's value, not i." : "Only elements GREATER than the threshold change."), LST(misB, kind === "condZero" ? "set replaces the element with 0; it does not remove it. The size stays the same." : "The loop runs for every index, not just the first."), LST(s.values, "set changes the list in place."), LST(result.map((x, i) => (i === result.length - 1 ? s.values[i] : x)), "i < size() includes the last index.")];
      void inserted;
      const { choices, answer } = buildChoices(R, LST(result), pool);
      const L0 = new JList("Integer", s.values);
      const end = L0.clone();
      result.forEach((x, i) => {
        if (x !== s.values[i]) end.set(i, x);
      });
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question: `What is \`${nm}\` after the loop?`,
        choices,
        answer,
        explanation: `The loop ${desc}. set(i, …) replaces in place, so the size stays ${s.values.length}.`,
        trace: s.values.map((x, i) => `i = ${i}: ${x} → ${result[i]}`),
        reveal: revealDiff(L0, end),
        javaChecks: [check("update", program({ lists: [s], body: code, print: nm }), listStr(result))],
      });
    },
  },
  {
    id: "I.build-list",
    family: "I",
    level: 3,
    concept: "Build a new ArrayList in a loop",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(4, 6), type: "Integer", min: 1, max: 20 });
      const nm = s.name;
      const kind = R.pick(["filter", "front", "reverse"]);
      let code, result, pool, expl;
      if (kind === "filter") {
        const c = R.pick(COND_INT);
        const t = R.pick(s.values);
        code = `ArrayList<Integer> result = new ArrayList<>();\nfor (int x : ${nm}) {\n    if (${c.text("x", t)}) {\n        result.add(x);\n    }\n}\nSystem.out.println(result);`;
        result = s.values.filter((x) => c.f(x, t));
        pool = [LST(s.values.filter((x) => c.neg(x, t)), "That keeps the elements that do NOT match."), LST(result.slice().reverse(), "add(x) appends, so the original order is kept."), c.ge ? LST(s.values.filter((x) => c.ge(x, t)), "The comparison is strict.") : null, LST(s.values, "Only matching elements are added.")];
        expl = `Each element that is ${c.label(t)} is appended to result in order.`;
      } else if (kind === "front") {
        code = `ArrayList<Integer> result = new ArrayList<>();\nfor (int x : ${nm}) {\n    result.add(0, x);\n}\nSystem.out.println(result);`;
        result = s.values.slice().reverse();
        pool = [LST(s.values, "add(0, x) inserts at the FRONT, pushing earlier elements right."), LST([s.values[s.values.length - 1]], "add(0, x) inserts; it does not replace index 0."), LST([...s.values.slice(1), s.values[0]], "Each new element goes to index 0."), LST(s.values.slice().reverse().slice(1), "Every element is added.")];
        expl = "Each add(0, x) inserts at the front, so the elements come out in reverse order.";
      } else {
        code = `ArrayList<Integer> result = new ArrayList<>();\nfor (int i = ${nm}.size() - 1; i >= 0; i--) {\n    result.add(${nm}.get(i));\n}\nSystem.out.println(result);`;
        result = s.values.slice().reverse();
        pool = [LST(s.values, "The loop starts at the last index and moves toward 0."), LST(s.values.slice().reverse().slice(0, -1), "i >= 0 includes index 0."), LST(s.values.slice().reverse().slice(1), "The loop starts at size() - 1, the last element."), LST([...s.values.slice(1)].reverse(), "i >= 0 includes index 0.")];
        expl = "The loop walks from the last index down to 0 and appends each element, building the reverse.";
      }
      if (!result.length) retry();
      const { choices, answer } = buildChoices(R, LST(result), pool);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        code,
        question: "What is printed?",
        choices,
        answer,
        explanation: expl,
        javaChecks: [check("build", program({ lists: [s], body: code }), listStr(result))],
      });
    },
  },
];
const n_ = (s) => s.values.length;

/* ================================================================== */
/* J. Remove during traversal                                          */
/* ================================================================== */
/* Loop forms; each returns {values, removed:[original positions], trace, error} */
export function loopRemove(type, values, pred, form) {
  const L = new JList(type, values);
  const pos = new Map(L.items.map((x, i) => [x.id, i]));
  const removed = [],
    trace = [];
  const show = () => listStr(L.values);
  try {
    if (form === "forward" || form === "forwardDec" || form === "forwardLE") {
      for (let i = 0; form === "forwardLE" ? i <= L.size() : i < L.size(); i++) {
        if (trace.length > 60) break;
        const v = L.get(i);
        if (pred(v)) {
          removed.push(pos.get(L.items[i].id));
          L.removeAt(i);
          trace.push(`i = ${i}: ${lit(type, v)} matches → remove(${i}) → ${show()}${form === "forwardDec" ? "; i-- so the shifted element is checked next" : ""}`);
          if (form === "forwardDec") i--;
        } else trace.push(`i = ${i}: ${lit(type, v)} stays`);
      }
    } else {
      const stop = form === "backwardGT0" ? 1 : 0;
      for (let i = L.size() - 1; i >= stop; i--) {
        const v = L.get(i);
        if (pred(v)) {
          removed.push(pos.get(L.items[i].id));
          L.removeAt(i);
          trace.push(`i = ${i}: ${lit(type, v)} matches → remove(${i}) → ${show()}`);
        } else trace.push(`i = ${i}: ${lit(type, v)} stays`);
      }
    }
  } catch (e) {
    if (e instanceof JavaException) return { values: L.values, removed, trace, error: e.javaName, list: L };
    throw e;
  }
  trace.push(form.startsWith("forward") ? `i reaches ${L.size()} = size() → loop ends` : "i passes the stopping value → loop ends");
  return { values: L.values, removed: removed.sort((a, b) => a - b), trace, error: null, list: L };
}
function loopHeader(form, nm) {
  return {
    forward: `for (int i = 0; i < ${nm}.size(); i++)`,
    forwardDec: `for (int i = 0; i < ${nm}.size(); i++)`,
    forwardLE: `for (int i = 0; i <= ${nm}.size(); i++)`,
    backward: `for (int i = ${nm}.size() - 1; i >= 0; i--)`,
    backwardGT0: `for (int i = ${nm}.size() - 1; i > 0; i--)`,
  }[form];
}
function loopCode(form, nm, condText) {
  return `${loopHeader(form, nm)} {\n    if (${condText}) {\n        ${nm}.remove(i);${form === "forwardDec" ? "\n        i--;" : ""}\n    }\n}`;
}
/* A list + predicate for removal loops. wantAdjacent: two matches next to each other */
function removalSetup(R, { wantAdjacent, wantFirst = false }) {
  for (let g = 0; g < 300; g++) {
    const type = R.chance(0.7) ? "Integer" : "String";
    let s, condText, pred, label;
    if (type === "Integer") {
      s = makeStart(R, { n: R.int(4, 7), type, min: 1, max: 20 });
      s.values = intValues(R, s.values.length, { min: 1, max: 20, unique: R.chance(0.6) });
      const c = R.pick(COND_INT);
      const t = R.int(4, 15);
      condText = c.text(`${s.name}.get(i)`, t);
      pred = (x) => c.f(x, t);
      label = c.label(t);
    } else {
      const name = R.pick(["words", "pets", "colors", "names"]);
      s = { type, name, values: [] };
      const pool = STR_POOLS[name];
      const kind = R.pick(["equals", "length"]);
      if (kind === "equals") {
        const target = R.pick(pool);
        const others = pool.filter((p) => p !== target);
        const n = R.int(4, 6);
        for (let k = 0; k < n; k++) s.values.push(R.chance(0.45) ? target : R.pick(others));
        condText = `${name}.get(i).equals("${target}")`;
        pred = (w) => w === target;
        label = `equal to "${target}"`;
      } else {
        const k = R.int(3, 4);
        s.values = R.shuffle(pool).slice(0, R.int(4, 6));
        condText = `${name}.get(i).length() < ${k}`;
        pred = (w) => w.length < k;
        label = `shorter than ${k} letters`;
      }
    }
    const m = s.values.map(pred);
    const matches = m.filter(Boolean).length;
    if (matches === 0 || matches === s.values.length) continue;
    const adjacent = m.some((x, i) => x && m[i + 1]);
    if (wantAdjacent !== undefined && adjacent !== wantAdjacent) continue;
    if (wantFirst && !m[0]) continue;
    const every = label === "even" ? "every even element" : `every element ${label}`;
    return { s, condText, pred, label, every };
  }
  retry();
}
const J = [
  {
    id: "J.forward-remove",
    family: "J",
    level: 3,
    concept: "Skipped element after removal",
    make(R, tpl) {
      const { s, condText, pred, label, every } = removalSetup(R, { wantAdjacent: R.chance(0.72) });
      const nm = s.name;
      const res = loopRemove(s.type, s.values, pred, "forward");
      const intended = s.values.filter((x) => !pred(x));
      const firstOnly = (() => {
        const k = s.values.findIndex(pred);
        return s.values.filter((_, i) => i !== k);
      })();
      const ask = R.weighted([["list", 3], ["size", 1]]);
      const code = loopCode("forward", nm, condText);
      const L0 = new JList(s.type, s.values);
      let choices, answer, question, javaChecks;
      const skipped = JSON.stringify(res.values) !== JSON.stringify(intended);
      if (ask === "list") {
        ({ choices, answer } = buildChoices(R, LST(res.values), [skipped ? LST(intended, "After remove(i), the next element shifts into index i, but i++ moves past it, so that element is never checked.") : null, LST(firstOnly, "The loop keeps going after the first removal."), LST(s.values.filter((x) => pred(x)), "remove(i) deletes the matching elements; it does not keep them."), LST(s.values, "Matching elements are removed during the loop.")]));
        question = `Which elements remain in \`${nm}\` after the loop?`;
        javaChecks = [check("forward remove", program({ lists: [s], body: code, print: nm }), listStr(res.values))];
        if (!choices.some((c, i) => i !== answer && c.value.length === res.values.length) && choices.length) {
          /* lengths differ: acceptable when the shorter/longer lists are the misconceptions themselves */
        }
      } else {
        const sz = res.values.length;
        ({ choices, answer } = buildChoices(R, RAW(sz), [skipped ? RAW(intended.length, "One matching element shifts into the removed position and is skipped by i++.") : null, RAW(s.values.length, "Elements are removed, so the size shrinks."), RAW(s.values.length - 1, "More than one element can be removed."), RAW(sz - 1, "Trace each index carefully."), RAW(sz + 1, "Trace each index carefully.")]));
        question = `What does \`${nm}.size()\` return after the loop?`;
        javaChecks = [check("forward remove size", program({ lists: [s], body: code, print: `${nm}.size()` }), String(sz))];
      }
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question,
        choices,
        answer,
        explanation: skipped
          ? `The loop tries to remove ${every}, but each removal shifts the next element left into index i, and then i++ skips it. Result: ${listStr(res.values)}.`
          : `${every[0].toUpperCase() + every.slice(1)} is removed. No two matching elements are next to each other here, so the shift after each removal never hides a match. Result: ${listStr(res.values)}. (With adjacent matches, this same loop would skip one.)`,
        trace: res.trace,
        reveal: revealDiff(L0, res.list),
        javaChecks,
      });
    },
  },
  {
    id: "J.tap-removed",
    family: "J",
    level: 3,
    concept: "Which elements the loop removes",
    make(R, tpl) {
      const form = R.weighted([["forward", 3], ["backward", 1], ["forwardDec", 1]]);
      const { s, condText, pred, label, every } = removalSetup(R, { wantAdjacent: form === "forward" ? R.chance(0.8) : R.chance(0.6) });
      const nm = s.name;
      const res = loopRemove(s.type, s.values, pred, form);
      const code = loopCode(form, nm, condText);
      const L0 = new JList(s.type, s.values);
      return base(R, tpl, {
        kind: "cells",
        list: startView(s),
        showIndices: false,
        code,
        question: "Tap EVERY element that this loop removes.",
        answer: res.removed,
        explanation:
          form === "forward"
            ? `The loop removes ${every}${res.removed.length < s.values.filter(pred).length ? ", except any element that shifts into index i right after a removal: i++ skips it" : ""}. Removed: ${res.removed.map((i) => lit(s.type, s.values[i])).join(", ")}.`
            : `${form === "backward" ? "Going backward, a removal only shifts elements the loop has already checked" : "The i-- after each removal makes the loop check the element that shifted into index i"}, so ${every} is removed.`,
        trace: res.trace,
        reveal: revealDiff(L0, res.list),
        javaChecks: [check("tap loop removal", program({ lists: [s], body: code, print: nm }), listStr(res.values))],
      });
    },
  },
  {
    id: "J.correct-loop-result",
    family: "J",
    level: 3,
    concept: "Safe removal loops",
    make(R, tpl) {
      const form = R.pick(["backward", "forwardDec"]);
      const { s, condText, pred, label, every } = removalSetup(R, { wantAdjacent: true });
      const nm = s.name;
      const res = loopRemove(s.type, s.values, pred, form);
      const buggy = loopRemove(s.type, s.values, pred, "forward").values;
      const code = loopCode(form, nm, condText);
      const { choices, answer } = buildChoices(R, LST(res.values), [LST(buggy, form === "backward" ? "Going backward, removing index i only shifts elements that were already checked, so nothing is skipped." : "The i-- re-checks the element that shifted into index i, so nothing is skipped."), LST(s.values.filter(pred), "The matching elements are removed, not kept."), LST(s.values.filter((x, i) => i !== s.values.findIndex(pred)), "The loop removes every match, not just the first."), LST(s.values, "Matching elements are removed.")]);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        code,
        question: `Which elements remain in \`${nm}\` after the loop?`,
        choices,
        answer,
        explanation: `${form === "backward" ? "Traversing from the end means a removal only shifts elements the loop has already visited." : "After each removal, i-- cancels the i++, so the element that shifted into index i is checked."} ${every[0].toUpperCase() + every.slice(1)} is removed: ${listStr(res.values)}.`,
        trace: res.trace,
        reveal: revealDiff(new JList(s.type, s.values), res.list),
        javaChecks: [check("safe removal", program({ lists: [s], body: code, print: nm }), listStr(res.values))],
      });
    },
  },
  {
    id: "J.which-loop",
    family: "J",
    level: 3,
    concept: "Choose a correct removal loop",
    make(R, tpl) {
      const { s, condText, pred, label, every } = removalSetup(R, { wantAdjacent: true, wantFirst: true });
      const nm = s.name;
      const intended = s.values.filter((x) => !pred(x));
      const good = R.pick(["backward", "forwardDec"]);
      const forms = [good, "forward", "backwardGT0", "forwardLE"];
      const outs = forms.map((f) => loopRemove(s.type, s.values, pred, f));
      const ok = outs.map((o) => !o.error && JSON.stringify(o.values) === JSON.stringify(intended));
      if (!ok[0] || ok.slice(1).some(Boolean)) retry();
      const why = {
        forward: "Removing at i shifts the next element into i, and i++ skips it.",
        backwardGT0: "i > 0 stops before index 0, so the first element is never checked.",
        forwardLE: "i <= size() reaches i == size(), and get(size()) throws an IndexOutOfBoundsException.",
      };
      const { choices, answer } = buildChoices(
        R,
        CODE(loopCode(good, nm, condText)),
        forms.slice(1).map((f) => CODE(loopCode(f, nm, condText), why[f])),
      );
      const javaChecks = choices.map((c) => {
        const f = forms.find((ff) => loopCode(ff, nm, condText) === c.value);
        const o = loopRemove(s.type, s.values, pred, f);
        return check("which loop", program({ lists: [s], body: c.value, print: nm }), o.error ? IOOBE : listStr(o.values));
      });
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        question: `Which loop removes ${every.replace("every", "EVERY")} from \`${nm}\`?`,
        choices,
        answer,
        explanation: `${good === "backward" ? "Traversing backward is safe: removing index i only shifts elements that were already checked." : "Decrementing i after a removal re-checks the element that shifted into index i."} The result is ${listStr(intended)}.`,
        trace: outs[0].trace,
        javaChecks,
      });
    },
  },
];

/* ================================================================== */
/* K. Choose the correct ArrayList operation                           */
/* ================================================================== */
const K = [
  {
    id: "K.goal-statement",
    family: "K",
    level: 2,
    concept: "Pick the method for the goal",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 5), type: R.chance(0.55) ? "String" : "Integer" });
      if (s.type === "Integer") s.values = intValues(R, s.values.length, { min: 10, max: 40 });
      const n = s.values.length,
        nm = s.name,
        t = s.type;
      const v = freshValue(R, s);
      const goal = R.weighted([["insert", 3], ["front", 1], ["replace", 2], ["append", 1], ["removeAt", 2], ["removeValue", 1.5]]);
      const i = R.int(1, n - 1);
      let correct, cands, text;
      const op = (o) => ({ op: o, text: renderOp(o, nm, t) });
      if (goal === "insert") {
        text = `Insert ${lit(t, v)} before the element currently at index ${i}.`;
        correct = op({ m: "addAt", i, v });
        cands = [op({ m: "set", i, v }), op({ m: "add", v }), op({ m: "addAt", i: i + 1, v }), op({ m: "get", i })];
      } else if (goal === "front") {
        text = `Put ${lit(t, v)} at the front of the list, keeping every current element.`;
        correct = op({ m: "addAt", i: 0, v });
        cands = [op({ m: "set", i: 0, v }), op({ m: "add", v }), op({ m: "addAt", i: 1, v })];
      } else if (goal === "replace") {
        text = `Replace ${lit(t, s.values[i])} (index ${i}) with ${lit(t, v)}.`;
        correct = op({ m: "set", i, v });
        cands = [op({ m: "addAt", i, v }), op({ m: "set", i: i - 1, v }), op({ m: "add", v }), op({ m: "removeAt", i })];
      } else if (goal === "append") {
        text = `Add ${lit(t, v)} after the current last element.`;
        correct = op({ m: "add", v });
        cands = [op({ m: "addAt", i: n - 1, v }), op({ m: "set", i: n - 1, v }), op({ m: "addAt", i: 0, v })];
      } else if (goal === "removeAt") {
        text = `Remove the element at index ${i}.`;
        correct = op({ m: "removeAt", i });
        cands = [op({ m: "removeAt", i: i - 1 }), op({ m: "removeAt", i: i + 1 }), op({ m: "set", i, v }), op({ m: "get", i })];
      } else {
        const target = s.values[i];
        text = `Remove the value ${lit(t, target)} from the list.`;
        correct = op({ m: "removeObj", v: target, form: "valueOf" });
        cands = [op({ m: "removeAt", i: i - 1 }), op({ m: "get", i }), op({ m: "removeAt", i: n - 1 }), op({ m: "set", i, v })];
        if (t === "Integer" && target < n) cands.unshift(op({ m: "removeAt", i: target }));
      }
      const target = run(t, s.values, [correct.op]);
      if (target.error) retry();
      const why = (c) => {
        const r = run(t, s.values, [c.op]);
        if (r.error) return "That index is out of bounds for this list.";
        const m = c.op.m;
        return m === "set" ? "set replaces the element at that index; it never inserts or removes, so the size stays the same." : m === "addAt" ? (goal === "replace" ? "add(index, e) inserts and shifts; it does not replace." : "That inserts at a different position.") : m === "add" ? "add(e) appends to the end." : m === "get" ? "get only reads an element; the list does not change." : m === "removeAt" ? "That removes a different element (an int argument means an index)." : "That produces a different list.";
      };
      const pool = R.shuffle(cands).filter((c) => {
        const r = run(t, s.values, [c.op]);
        return r.error || JSON.stringify(r.list.values) !== JSON.stringify(target.list.values);
      });
      const { choices, answer } = buildChoices(R, CODE(correct.text), pool.map((c) => CODE(c.text, why(c))));
      const all = [correct, ...cands];
      const javaChecks = choices.map((c) => {
        const o = all.find((x) => x.text === c.value);
        const r = run(t, s.values, [o.op]);
        return check("goal op", program({ lists: [s], body: c.value, print: nm }), r.error ? IOOBE : listStr(r.list.values));
      });
      const L0 = new JList(t, s.values);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        showIndices: true,
        question: `Goal: ${text} Which statement does it?`,
        choices,
        answer,
        explanation: describeOp(correct.op, L0, nm),
        reveal: revealDiff(L0, target.list),
        javaChecks,
      });
    },
  },
  {
    id: "K.before-after",
    family: "K",
    level: 2,
    concept: "Which statement made this change",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 5) });
      const n = s.values.length,
        nm = s.name,
        t = s.type;
      const v = freshValue(R, s);
      const i = R.int(1, n - 1);
      const kinds = [
        { op: { m: "addAt", i, v }, alts: [{ m: "set", i, v }, { m: "addAt", i: i + 1, v }, { m: "addAt", i: i - 1, v }, { m: "add", v }] },
        { op: { m: "set", i, v }, alts: [{ m: "addAt", i, v }, { m: "set", i: i - 1, v }, { m: "set", i: Math.min(i + 1, n - 1), v }, { m: "add", v }] },
        { op: { m: "removeAt", i }, alts: [{ m: "removeAt", i: i - 1 }, { m: "removeAt", i: Math.min(i + 1, n - 1) }, { m: "set", i, v }, ...(t === "Integer" ? [{ m: "removeObj", v: i, form: "valueOf" }] : [])] },
      ];
      const k = R.pick(kinds);
      const after = run(t, s.values, [k.op]).list;
      const pool = R.shuffle(k.alts)
        .map((o) => ({ o, r: run(t, s.values, [o]) }))
        .filter(({ r }) => r.error || JSON.stringify(r.list.values) !== JSON.stringify(after.values))
        .map(({ o }) => CODE(renderOp(o, nm, t), o.m === k.op.m ? "Same method, different index — compare positions carefully (indices start at 0)." : o.m === "set" ? "set would replace an element and keep the size the same." : o.m === "addAt" ? "add(index, e) would insert and make the list longer." : o.m === "add" ? "add(e) would append at the end." : o.m === "removeObj" ? "Integer.valueOf searches for a value, which is not what happened here." : "remove(index) would make the list shorter."));
      const { choices, answer } = buildChoices(R, CODE(renderOp(k.op, nm, t)), pool);
      const javaChecks = choices.map((c) => {
        const o = [k.op, ...k.alts].find((x) => renderOp(x, nm, t) === c.value);
        const r = run(t, s.values, [o]);
        return check("before-after", program({ lists: [s], body: c.value, print: nm }), r.error ? IOOBE : listStr(r.list.values));
      });
      const L0 = new JList(t, s.values);
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        goal: { type: t, name: nm, values: after.values },
        question: `One statement changed \`${nm}\` from the starting list to the goal list. Which statement was it?`,
        choices,
        answer,
        explanation: describeOp(k.op, L0, nm),
        reveal: revealDiff(L0, after),
        javaChecks,
      });
    },
  },
  {
    id: "K.read-last",
    family: "K",
    level: 2,
    concept: "Read without changing",
    make(R, tpl) {
      const s = makeStart(R, { n: R.int(3, 6) });
      const nm = s.name,
        t = s.type,
        n = s.values.length;
      const which = R.pick(["last", "first"]);
      const correct = which === "last" ? `${nm}.get(${nm}.size() - 1)` : `${nm}.get(0)`;
      const pool =
        which === "last"
          ? [CODE(`${nm}.get(${nm}.size())`, "Index size() is one past the end; this throws an IndexOutOfBoundsException."), CODE(`${nm}.remove(${nm}.size() - 1)`, "remove returns the last element too, but it also removes it from the list."), CODE(`${nm}.size() - 1`, "That is the last INDEX, not the last element."), CODE(`${nm}.get(${nm}.size() + 1)`, "Past the end of the list.")]
          : [CODE(`${nm}.get(1)`, "Index 1 is the second element."), CODE(`${nm}.remove(0)`, "remove(0) returns the first element but removes it from the list."), CODE(`${nm}.indexOf(0)`, "indexOf searches for a value and returns an index."), CODE(`${nm}.set(0, ${lit(t, freshValue(R, s))})`, "set changes the list.")];
      const { choices, answer } = buildChoices(R, CODE(correct), pool.filter((c) => !(t === "String" && c.value.includes("indexOf(0)"))));
      const evalExpr = (expr) => {
        const L = new JList(t, s.values);
        try {
          let val;
          if (expr === `${nm}.get(${nm}.size() - 1)`) val = L.get(L.size() - 1);
          else if (expr === `${nm}.get(${nm}.size())`) val = L.get(L.size());
          else if (expr === `${nm}.get(${nm}.size() + 1)`) val = L.get(L.size() + 1);
          else if (expr === `${nm}.remove(${nm}.size() - 1)`) val = L.removeAt(L.size() - 1);
          else if (expr === `${nm}.size() - 1`) val = L.size() - 1;
          else if (expr === `${nm}.get(0)`) val = L.get(0);
          else if (expr === `${nm}.get(1)`) val = L.get(1);
          else if (expr === `${nm}.remove(0)`) val = L.removeAt(0);
          else if (expr === `${nm}.indexOf(0)`) val = L.indexOf(0);
          else if (expr.startsWith(`${nm}.set(0, `)) val = L.set(0, t === "String" ? expr.match(/"(.*)"/)[1] : Number(expr.match(/, (\d+)\)/)[1]));
          else throw Error("unknown expr " + expr);
          return `${javaStr(val)} ${listStr(L.values)}`;
        } catch (e) {
          if (e instanceof JavaException) return IOOBE;
          throw e;
        }
      };
      const javaChecks = choices.map((c) => check("read", program({ lists: [s], print: `${c.value} + " " + ${nm}` }), evalExpr(c.value)));
      const target = evalExpr(correct);
      if (choices.some((c, i) => i !== answer && evalExpr(c.value) === target)) retry();
      return base(R, tpl, {
        kind: "choice",
        list: startView(s),
        question: `Which expression gives the ${which} ELEMENT of \`${nm}\` without changing the list?`,
        choices,
        answer,
        explanation: which === "last" ? `The last index is size() - 1 = ${n - 1}, so ${correct} reads ${lit(t, s.values[n - 1])} and leaves the list unchanged.` : `Index 0 is the first element; get(0) reads ${lit(t, s.values[0])} and leaves the list unchanged.`,
        javaChecks,
      });
    },
  },
];

/* ================================================================== */
/* L. Arrays versus ArrayLists                                         */
/* ================================================================== */
function compareProgram(arr, list, body, print) {
  return program({ pre: `int[] arr = {${arr.join(", ")}};`, lists: [{ type: "Integer", name: "list", values: list }], body, print });
}
const L_ = [
  {
    id: "L.length-size",
    family: "L",
    level: 1,
    concept: "length vs. size()",
    make(R, tpl) {
      const arr = intValues(R, R.int(3, 5), { min: 1, max: 20 });
      const list = intValues(R, R.int(2, 6), { min: 1, max: 20 });
      if (arr.length === list.length) list.push(R.int(21, 30));
      const variant = R.pick(["count", "last"]);
      let correct, pool, out;
      if (variant === "count") {
        correct = "int a = arr.length;\nint b = list.size();";
        pool = [CODE("int a = arr.length();\nint b = list.size();", "length is a field of an array, written without parentheses."), CODE("int a = arr.length;\nint b = list.length;", "ArrayLists have no length field; use size()."), CODE("int a = arr.size();\nint b = list.size();", "Arrays have no size() method; use length."), CODE("int a = arr.length;\nint b = list.length();", "ArrayLists use size(), not length().")];
        out = `${arr.length} ${list.length}`;
      } else {
        correct = "int a = arr[arr.length - 1];\nint b = list.get(list.size() - 1);";
        pool = [CODE("int a = arr[arr.length - 1];\nint b = list[list.size() - 1];", "Square brackets work only on arrays; use list.get(...)."), CODE("int a = arr.get(arr.length - 1);\nint b = list.get(list.size() - 1);", "Arrays use [ ], not get."), CODE("int a = arr[arr.length - 1];\nint b = list.get(list.length - 1);", "ArrayLists use size(), not length."), CODE("int a = arr[arr.length];\nint b = list.get(list.size());", "Both compile, but index length/size() is one past the end and throws at run time.")];
        out = `${arr[arr.length - 1]} ${list[list.length - 1]}`;
      }
      const { choices, answer } = buildChoices(R, CODE(correct), R.shuffle(pool));
      const javaChecks = choices.map((c, i) => {
        const src = compareProgram(arr, list, c.value, `a + " " + b`);
        if (i === answer) return check("length-size", src, out);
        return c.value.includes("arr[arr.length];") ? check("runtime", src, IOOBE) : fails("length-size", src);
      });
      return base(R, tpl, {
        kind: "choice",
        code: `int[] arr = {${arr.join(", ")}};\n// list is an ArrayList<Integer> containing ${listStr(list)}`,
        question: variant === "count" ? "Which code correctly stores the number of elements of each collection?" : "Which code correctly stores the LAST element of each collection?",
        choices,
        answer,
        explanation: variant === "count" ? `Arrays have a length field (arr.length, no parentheses). ArrayLists have a size() method. Here a is ${arr.length} and b is ${list.length}.` : `For arrays: arr[arr.length - 1]. For ArrayLists: list.get(list.size() - 1). Here a is ${arr[arr.length - 1]} and b is ${list[list.length - 1]}.`,
        javaChecks,
      });
    },
  },
  {
    id: "L.translate",
    family: "L",
    level: 2,
    concept: "Array syntax → ArrayList methods",
    make(R, tpl) {
      const list = intValues(R, R.int(3, 5), { min: 1, max: 20 });
      const arr = list.slice();
      const i = R.int(0, list.length - 1);
      const v = R.int(21, 40);
      const variant = R.pick(["assign", "read", "loop"]);
      let arrayStmt, correct, pool, print, outCorrect, compilingWrong = [];
      if (variant === "assign") {
        arrayStmt = `arr[${i}] = ${v};`;
        correct = `list.set(${i}, ${v});`;
        pool = [CODE(`list.add(${i}, ${v});`, "add inserts a new element and shifts the rest; the array statement replaces."), CODE(`list[${i}] = ${v};`, "Brackets cannot be used with an ArrayList."), CODE(`list.get(${i}) = ${v};`, "You cannot assign to a method call; use set.")];
        print = "list";
        const after = list.slice();
        after[i] = v;
        outCorrect = listStr(after);
        compilingWrong = [`list.add(${i}, ${v});`];
      } else if (variant === "read") {
        arrayStmt = `int x = arr[${i}];`;
        correct = `int x = list.get(${i});`;
        pool = [CODE(`int x = list[${i}];`, "Brackets cannot be used with an ArrayList."), CODE(`int x = list.get[${i}];`, "get is a method: call it with parentheses."), CODE(`int x = list.indexOf(${i});`, "indexOf searches for the VALUE " + i + " and returns its index (or -1).")];
        print = "x";
        outCorrect = String(list[i]);
        compilingWrong = [`int x = list.indexOf(${i});`];
        if (list.indexOf(i) === list[i]) retry();
      } else {
        arrayStmt = "for (int k = 0; k < arr.length; k++) {\n    sum += arr[k];\n}";
        correct = "for (int k = 0; k < list.size(); k++) {\n    sum += list.get(k);\n}";
        pool = [CODE("for (int k = 0; k < list.length; k++) {\n    sum += list.get(k);\n}", "ArrayLists use size(), not length."), CODE("for (int k = 0; k < list.size(); k++) {\n    sum += list[k];\n}", "Brackets cannot be used with an ArrayList; use get(k)."), CODE("for (int k = 0; k <= list.size(); k++) {\n    sum += list.get(k);\n}", "k <= size() reaches index size(), which throws an IndexOutOfBoundsException.")];
        print = "sum";
        outCorrect = String(list.reduce((a, b) => a + b, 0));
        compilingWrong = ["for (int k = 0; k <= list.size(); k++) {\n    sum += list.get(k);\n}"];
      }
      const { choices, answer } = buildChoices(R, CODE(correct), pool);
      const pre = variant === "loop" ? "int sum = 0;" : "";
      const javaChecks = choices.map((c, idx) => {
        const src = compareProgram(arr, list, [pre, c.value].filter(Boolean).join("\n"), print);
        if (idx === answer) return check("translate", src, outCorrect);
        if (compilingWrong.includes(c.value)) {
          // compiles but behaves differently
          let out;
          if (c.value.startsWith("list.add(")) {
            const a = list.slice();
            a.splice(i, 0, v);
            out = listStr(a);
          } else if (c.value.includes("indexOf")) out = String(list.indexOf(i));
          else out = IOOBE;
          return check("translate-wrong", src, out);
        }
        return fails("translate", src);
      });
      return base(R, tpl, {
        kind: "choice",
        code: `int[] arr = {${arr.join(", ")}};\n// list is an ArrayList<Integer> holding the same values: ${listStr(list)}\n${variant === "loop" ? "int sum = 0;\n" : ""}\n// array version:\n${arrayStmt}`,
        question: "Which ArrayList code does the same thing as the array version?",
        choices,
        answer,
        explanation: variant === "assign" ? `arr[${i}] = ${v} replaces an element, so the ArrayList equivalent is set(${i}, ${v}). add(${i}, ${v}) would insert and grow the list.` : variant === "read" ? `arr[${i}] reads an element; the ArrayList equivalent is list.get(${i}), which returns ${list[i]}.` : "Replace arr.length with list.size() and arr[k] with list.get(k).",
        javaChecks,
      });
    },
  },
  {
    id: "L.fixed-dynamic",
    family: "L",
    level: 2,
    concept: "Fixed length vs. dynamic size",
    make(R, tpl) {
      const cap = R.int(3, 6);
      const k = R.int(1, cap - 1);
      const vals = intValues(R, k + 1, { min: 1, max: 20 });
      const removeOne = R.chance(0.5);
      const lines = [`int[] arr = new int[${cap}];`, `arr[0] = ${vals[0]};`, "ArrayList<Integer> list = new ArrayList<>();", ...vals.slice(0, k).map((x) => `list.add(${x});`), ...(removeOne ? ["list.remove(0);"] : [`list.add(${vals[k]});`]), 'System.out.println(arr.length + " " + list.size());'];
      const size = removeOne ? k - 1 : k + 1;
      const out = `${cap} ${size}`;
      const pool = [RAW(`1 ${size}`, `arr.length is the fixed length chosen with new int[${cap}], no matter how many slots were assigned.`), RAW(`${cap} ${cap}`, "An ArrayList's size counts its actual elements; it has no fixed length."), RAW(`${cap} ${removeOne ? k : k}`, removeOne ? "remove(0) makes the list one element shorter." : "Every add increases the size."), RAW(`${cap - 1} ${size}`, `new int[${cap}] has length ${cap}; indices go 0 to ${cap - 1}.`), RAW(`${size} ${size}`, "Arrays do not grow or shrink.")];
      const { choices, answer } = buildChoices(R, RAW(out), pool);
      return base(R, tpl, {
        kind: "choice",
        code: lines.join("\n"),
        question: "What is printed?",
        choices,
        answer,
        explanation: `An array's length is fixed when it is created (new int[${cap}] → length ${cap}, unused slots hold 0). An ArrayList's size() is the number of elements currently in it: ${size}.`,
        javaChecks: [check("fixed-dynamic", program({ body: lines.join("\n") }), out)],
      });
    },
  },
  {
    id: "L.autobox",
    family: "L",
    level: 3,
    concept: "Autoboxing and wrapper types",
    make(R, tpl) {
      const kind = R.pick(["Integer", "Double", "String"]);
      const sets = {
        Integer: { name: "nums", init: "7", ok: [["nums.add(5);", "5 is autoboxed to an Integer."], ["int n = nums.get(0);", "The Integer is unboxed to int."], ["double d = nums.get(0);", "The Integer is unboxed to int, then widened to double."], ["nums.set(0, nums.get(0) + 1);", "get(0) + 1 is an int, autoboxed back to Integer."], ["Integer k = nums.get(0);", "get returns an Integer."]], bad: [['nums.add("5");', 'A String cannot be added to an ArrayList<Integer>.'], ["nums.add(5.0);", "5.0 is a double; it cannot become an Integer."], ["String s = nums.get(0);", "get returns an Integer, not a String."], ["boolean b = nums.get(0);", "An Integer cannot be stored in a boolean."]] },
        Double: { name: "prices", init: "2.5", ok: [["prices.add(5.0);", "5.0 is a double, autoboxed to Double."], ["double d = prices.get(0);", "The Double is unboxed to double."], ["prices.set(0, 1.25);", "1.25 is autoboxed to Double."], ["Double x = prices.get(0);", "get returns a Double."]], bad: [["prices.add(5);", "5 is an int. Java will not box an int into a Double, so this does not compile — write 5.0."], ["int n = prices.get(0);", "A Double unboxes to double, which cannot be narrowed to int without a cast."], ['prices.add("5.0");', "A String is not a Double."]] },
        String: { name: "words", init: '"hi"', ok: [['words.add("5");', '"5" is a String.'], ["String s = words.get(0);", "get returns a String."], ['words.add(0, "x");', "Inserting a String at index 0 is fine."], ["int len = words.get(0).length();", "get returns a String, which has length()."]], bad: [["words.add(5);", "5 is an int; it is not a String."], ["char c = words.get(0);", "get returns a String, not a char."], ["int n = words.get(0);", "A String is not a number."]] },
      }[kind];
      const askBad = R.chance(0.6);
      const correctPair = R.pick(askBad ? sets.bad : sets.ok);
      const others = R.sample(askBad ? sets.ok : sets.bad.filter((b) => b !== correctPair), 3);
      if (others.length < 3) retry();
      const { choices, answer } = buildChoices(R, CODE(correctPair[0], correctPair[1]), others.map(([c, w]) => CODE(c, (askBad ? "This compiles: " : "This does not compile: ") + w)));
      const prog = (stmt) => `import java.util.ArrayList;\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList<${kind}> ${sets.name} = new ArrayList<>();\n        ${sets.name}.add(${sets.init});\n        ${stmt}\n        System.out.println(${sets.name});\n    }\n}\n`;
      const isBad = (c) => sets.bad.some((b) => b[0] === c);
      const javaChecks = choices.map((c) => (isBad(c.value) ? fails("autobox", prog(c.value)) : compiles("autobox", prog(c.value))));
      return base(R, tpl, {
        kind: "choice",
        code: `ArrayList<${kind}> ${sets.name} = new ArrayList<>();\n${sets.name}.add(${sets.init});`,
        question: askBad ? "Which statement does NOT compile?" : "Which statement compiles?",
        choices,
        answer,
        explanation: `${correctPair[1]} ${kind === "String" ? "" : `Java autoboxes ${kind === "Integer" ? "int" : "double"} values into ${kind} objects and unboxes them when a primitive is needed, but it never boxes into a different wrapper type.`}`,
        javaChecks,
      });
    },
  },
  {
    id: "L.choose-structure",
    family: "L",
    level: 1,
    concept: "Primitive arrays vs. typed lists",
    make(R, tpl) {
      const variant = R.pick(["grow", "fixed"]);
      const k = R.pick([{ p: "int", w: "Integer", nm: "scores", what: "test scores" }, { p: "double", w: "Double", nm: "prices", what: "prices" }, { p: "int", w: "Integer", nm: "steps", what: "daily step counts" }, { p: "double", w: "Double", nm: "times", what: "race times" }]);
      const cap = R.int(12, 40);
      const correct = variant === "grow" ? `ArrayList<${k.w}> ${k.nm} = new ArrayList<>();` : `${k.p}[] ${k.nm} = new ${k.p}[${cap}];`;
      const pool =
        variant === "grow"
          ? [CODE(`${k.p}[] ${k.nm} = new ${k.p}[${cap}];`, `An array's length is fixed at ${cap}; it cannot grow.`), CODE(`ArrayList<${k.p}> ${k.nm} = new ArrayList<>();`, `ArrayList cannot use a primitive type argument; use ${k.w}.`), CODE(`${k.w}[] ${k.nm} = new ${k.w}[${cap}];`, `This is still a fixed-length array (of ${k.w} objects).`)]
          : [CODE(`ArrayList<${k.w}> ${k.nm} = new ArrayList<>(${cap});`, `This compiles, but new ArrayList<>(${cap}) is an EMPTY list (size 0); ${cap} is only a starting capacity.`), CODE(`ArrayList<${k.p}> ${k.nm} = new ArrayList<>();`, "ArrayList cannot use a primitive type argument."), CODE(`${k.p} ${k.nm} = new ${k.p}[${cap}];`, `new ${k.p}[${cap}] is an array, so the variable type must be ${k.p}[].`)];
      const { choices, answer } = buildChoices(R, CODE(correct), pool);
      const prog = (stmt) => `import java.util.ArrayList;\npublic class Main {\n    public static void main(String[] args) {\n        ${stmt}\n        System.out.println("ok");\n    }\n}\n`;
      const bad = (c) => c.includes(`ArrayList<${k.p}>`) || c.startsWith(`${k.p} ${k.nm}`);
      return base(R, tpl, {
        kind: "choice",
        question: variant === "grow" ? `A program must store ${k.what} (${k.p} values), and how many there will be is unknown — the collection keeps growing. Which declaration fits best?` : `A program needs exactly ${cap} ${k.p} slots for ${k.what}, each starting at 0 and set by index right away. Which declaration fits best?`,
        choices,
        answer,
        explanation: variant === "grow" ? `An ArrayList<${k.w}> grows with add(). Arrays have a fixed length, and ArrayLists need a wrapper type such as ${k.w}.` : `new ${k.p}[${cap}] creates ${cap} slots (all 0) that can be used immediately with ${k.nm}[i]. An ArrayList created with new ArrayList<>(${cap}) starts with size 0, so get(i) would throw until elements are added.`,
        javaChecks: choices.map((c) => (bad(c.value) ? fails("structure", prog(c.value)) : compiles("structure", prog(c.value)))),
      });
    },
  },
];

/* ------------------------------------------------------------------ */
/* Registry and generation                                             */
/* ------------------------------------------------------------------ */
export const TEMPLATES = [...A, ...B, ...C, ...D, ...E, ...F, ...G, ...H, ...I, ...J, ...K, ...L_];
export const TEMPLATES_BY_FAMILY = Object.fromEntries(Object.keys(FAMILIES).map((f) => [f, TEMPLATES.filter((t) => t.family === f)]));

export function signature(ch) {
  const opts = ch.choices ? ch.choices.map((c) => JSON.stringify(c.value)).sort().join(",") : "";
  return [ch.template, ch.list ? JSON.stringify(ch.list.values) : "", ch.code || "", ch.question, opts].join("|");
}
export function createHistory() {
  return { sigs: [], templates: [], families: [] };
}
function familiesFor(mode) {
  return Object.keys(FAMILIES).filter((f) => mode === "mixed" || FAMILIES[f].mode === mode);
}
export function generateFromTemplate(tpl, rng = Math.random) {
  const R = helpers(rng);
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const ch = tpl.make(R, tpl);
      ch.signature = signature(ch);
      const problems = validateChallenge(ch);
      if (problems.length) throw new Retry(problems.join("; "));
      return ch;
    } catch (e) {
      if (!(e instanceof Retry)) throw e;
    }
  }
  throw Error(`Template ${tpl.id} could not produce a valid challenge`);
}
export function generate(mode = "mixed", rng = Math.random, history = null) {
  if (mode !== "mixed" && !MODES[mode]) mode = "mixed";
  const R = helpers(rng);
  const h = history || createHistory();
  const fams = familiesFor(mode);
  let ch;
  for (let attempt = 0; attempt < 25; attempt++) {
    let pool = fams;
    if (fams.length > 1 && h.families.length) pool = fams.filter((f) => f !== h.families[h.families.length - 1]);
    const fam = R.weighted(pool.map((f) => [f, FAMILIES[f].weight]));
    const recentT = h.templates.slice(-4);
    let tpls = TEMPLATES_BY_FAMILY[fam].filter((t) => !recentT.includes(t.id));
    if (!tpls.length) tpls = TEMPLATES_BY_FAMILY[fam];
    const tpl = R.pick(tpls);
    ch = generateFromTemplate(tpl, rng);
    if (!h.sigs.includes(ch.signature)) break;
  }
  h.sigs.push(ch.signature);
  h.templates.push(ch.template);
  h.families.push(ch.family);
  for (const k of ["sigs", "templates", "families"]) if (h[k].length > 60) h[k].splice(0, h[k].length - 60);
  return ch;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */
/* response: choice → index; cell → index; gap → gap index; cells → array */
export function assess(ch, response) {
  if (response === null || response === undefined) return false;
  if (ch.kind === "cells") {
    const a = [...new Set(response)].sort((x, y) => x - y);
    return JSON.stringify(a) === JSON.stringify([...ch.answer].sort((x, y) => x - y));
  }
  return Number(response) === ch.answer;
}
export function answerText(ch) {
  if (ch.kind === "choice") {
    const c = ch.choices[ch.answer];
    return c.kind === "list" ? listStr(c.value.map((v) => lit(ch.list?.type || (typeof v === "number" ? "Integer" : "String"), v))) : c.value;
  }
  if (ch.kind === "cell") return `${lit(ch.list.type, ch.list.values[ch.answer])} (index ${ch.answer})`;
  if (ch.kind === "gap") return `index ${ch.answer}${ch.answer === 0 ? " (the front)" : ch.answer === ch.list.values.length ? " (the end)" : ` — between ${lit(ch.list.type, ch.list.values[ch.answer - 1])} and ${lit(ch.list.type, ch.list.values[ch.answer])}`}`;
  if (ch.kind === "cells") return ch.answer.map((i) => `${lit(ch.list.type, ch.list.values[i])} (index ${i})`).join(", ");
  return "";
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */
export function validateChallenge(ch) {
  const p = [];
  if (!ch.question) p.push("missing question");
  if (!ch.explanation) p.push("missing explanation");
  if (!Array.isArray(ch.javaChecks) || !ch.javaChecks.length) p.push("no Java checks");
  if (!["choice", "cell", "gap", "cells"].includes(ch.kind)) p.push("bad kind");
  if (ch.kind === "choice") {
    if (!Array.isArray(ch.choices) || ch.choices.length < 2 || ch.choices.length > 4) p.push("choice count");
    else {
      const keys = ch.choices.map(keyOf);
      if (new Set(keys).size !== keys.length) p.push("duplicate choices");
      if (!(Number.isInteger(ch.answer) && ch.answer >= 0 && ch.answer < ch.choices.length)) p.push("answer index");
      ch.choices.forEach((c, i) => {
        if (i !== ch.answer && !c.why) p.push("distractor without misconception note");
        if (c.kind === "list" && !Array.isArray(c.value)) p.push("list choice value");
      });
      const correct = ch.choices[ch.answer];
      if (correct) {
        const others = ch.choices.filter((_, i) => i !== ch.answer);
        // visual / length outliers
        if (correct.kind === "list" && others.length >= 2 && others.every((o) => o.value.length === others[0].value.length) && others[0].value.length !== correct.value.length) p.push("list length outlier");
        if (correct.kind === "value" && others.length >= 3) {
          const L = (x) => String(x.value).length;
          if (others.every((o) => L(o) === L(others[0])) && Math.abs(L(correct) - L(others[0])) > 2) p.push("value length outlier");
          const word = (x) => /^[A-Za-z]/.test(String(x.value)) && !/^(true|false|null)$/.test(String(x.value)) && !String(x.value).startsWith('"');
          if (word(correct) && !others.some(word) && others.every((o) => !/^(true|false|null)/.test(String(o.value)))) p.push("only non-numeric answer");
        }
        if (correct.kind === "code") {
          const semi = (x) => x.value.trim().endsWith(";");
          if (others.some((o) => semi(o) !== semi(correct)) && !correct.value.includes("\n")) p.push("syntax giveaway (semicolon)");
        }
        // final state must not be revealed in the prompt
        if (correct.kind === "list" && ch.list && ch.code && ch.code.includes(listStr(correct.value))) p.push("answer revealed in code");
      }
    }
  } else {
    if (!ch.list) p.push("interactive question without list");
    if (ch.showIndices) p.push("indices shown on an index-target question");
    const n = ch.list ? ch.list.values.length : 0;
    if (ch.kind === "cell" && !(Number.isInteger(ch.answer) && ch.answer >= 0 && ch.answer < n)) p.push("cell answer range");
    if (ch.kind === "gap" && !(Number.isInteger(ch.answer) && ch.answer >= 0 && ch.answer <= n)) p.push("gap answer range");
    if (ch.kind === "cells" && !(Array.isArray(ch.answer) && ch.answer.length >= 1 && ch.answer.every((i) => Number.isInteger(i) && i >= 0 && i < n) && new Set(ch.answer).size === ch.answer.length)) p.push("cells answer");
    if (ch.uniqueValues && ch.list && new Set(ch.list.values).size !== n) p.push("duplicate values make the tap ambiguous");
  }
  return p;
}
