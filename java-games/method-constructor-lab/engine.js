/* Method & Constructor Lab engine: challenge generators, a token model for
   click-the-code questions, Java type compatibility and overload resolution,
   and assessment. No DOM access and no dynamic code evaluation.
   Terms used consistently:
     parameter   - variable declared in a method or constructor signature
     argument    - value or expression supplied in a call
     return type - type declared before an ordinary method's name
     constructor - class member used with `new`; it has no return type */

export const MODES = {
  "identify-method": "Identify Method Parts",
  "identify-constructor": "Identify Constructor Parts",
  "match-call": "Match Calls to Signatures",
  "order-args": "Organize Arguments",
  return: "Return Types & Return Statements",
  constructors: "Constructors & Object Creation",
  "returned-values": "Method Calls & Returned Values",
  fix: "Fix the Method or Constructor",
  access: "Access Modifiers",
};
export const methodLabGame = {
  name: "Method & Constructor Lab",
  icon: "( )",
  description: "Pick out method and constructor parts, match arguments to parameters, and debug calls, returns, and access.",
  concepts: "Parameters · Arguments · Returns · Constructors · Overloading",
  modes: MODES,
};
export const GAME_ID = "method-constructor-lab";

/* ------------------------------------------------------------------ */
/* Randomness                                                          */
/* ------------------------------------------------------------------ */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function tools(rng) {
  const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const chance = (p) => rng() < p;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  return { rng, int, pick, chance, shuffle, sample };
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const ordinal = (n) => ["first", "second", "third", "fourth"][n];
const article = (w) => (/^[aeiou]/i.test(w) ? "an" : "a");

/* ------------------------------------------------------------------ */
/* Java types                                                          */
/* ------------------------------------------------------------------ */
export const PRIMITIVE_WIDENING = {
  // from -> types it can widen to (JLS 5.1.2), limited to the types used here
  char: ["int", "long", "float", "double"],
  int: ["long", "float", "double"],
  long: ["float", "double"],
  float: ["double"],
  double: [],
  boolean: [],
};
/* Method invocation conversion without boxing (JLS 15.12.2.2):
   identity or widening primitive; String only to String/Object. */
export function assignable(from, to) {
  if (from === to) return true;
  if (to === "Object") return from === "String";
  return (PRIMITIVE_WIDENING[from] || []).includes(to);
}
export function applicable(argTypes, params) {
  return argTypes.length === params.length && argTypes.every((t, i) => assignable(t, params[i].type));
}
/* Most specific applicable overload (JLS 15.12.2.5). Returns the index, or
   -1 for no applicable method, or -2 for an ambiguous call. */
export function resolveOverload(argTypes, overloads) {
  const app = overloads.map((o, i) => [o, i]).filter(([o]) => applicable(argTypes, o.params));
  if (!app.length) return -1;
  const moreSpecific = (a, b) => a.params.every((p, k) => assignable(p.type, b.params[k].type));
  const best = app.filter(([o]) => app.every(([q]) => q === o || moreSpecific(o, q)));
  return best.length === 1 ? best[0][1] : -2;
}

/* Values: JS representation plus Java source text */
const NAMES = ["Alex", "Maya", "Jordan", "Priya", "Sam", "Lena", "Omar", "Kai", "Rosa", "Theo"];
const WORDS = ["Portal", "Rover", "Nova", "Comet", "Pixel", "Atlas", "Echo", "Blaze"];
export function lit(type, v) {
  if (type === "String") return JSON.stringify(v);
  if (type === "char") return `'${v}'`;
  if (type === "double") return javaDouble(v);
  return String(v);
}
/* Java's Double.toString for the simple values used in this game */
export function javaDouble(x) {
  if (Number.isInteger(x)) return x.toFixed(1);
  const s = String(x);
  return s;
}
export function javaValue(type, v) {
  if (type === "double") return javaDouble(v);
  if (type === "boolean") return String(v);
  if (type === "String") return JSON.stringify(v);
  if (type === "char") return `'${v}'`;
  return String(v);
}
function randomValue(g, type) {
  switch (type) {
    case "int":
      return g.int(2, 40);
    case "double":
      return g.pick([1.5, 2.5, 3.75, 4.5, 9.5, 12.25, 0.5]);
    case "boolean":
      return g.chance(0.5);
    case "String":
      return g.pick([...NAMES, ...WORDS]);
    case "char":
      return g.pick(["A", "B", "C", "X", "Q"]);
  }
  throw new Error("type " + type);
}

/* Realistic values chosen by parameter name, falling back to the type */
const PARAM_VALUES = {
  name: NAMES, player: NAMES, to: NAMES, owner: NAMES,
  item: ["Pencil", "Backpack", "Notebook", "Headphones"], product: ["Pencil", "Backpack", "Notebook", "Headphones"], label: ["Pencil", "Backpack"],
  title: WORDS, model: ["Civic", "Corolla", "Model 3", "Mustang"], text: ["See you soon", "Game at 5", "Running late"],
  year: [2012, 2015, 2018, 2021, 2024], age: [12, 13, 14, 15, 16, 17], score: [45, 70, 88, 92, 100], quantity: [1, 3, 6, 12], count: [2, 5, 9, 14],
  price: [1.25, 4.99, 12.5, 19.99], seconds: [58.4, 61.25, 47.5], stars: [3.5, 4.5, 2.5], degrees: [68.5, 70.5, 72.5], lap: [1, 2, 3, 4, 5],
  minutes: [5, 10, 20, 45], level: [1, 4, 7, 12, 20], points: [60, 75, 85, 95], row: [0, 2, 3, 5, 7], column: [1, 4, 6, 8], mpg: [24.5, 31.5, 38.5],
  letter: ["A", "B", "C"], team: ["R", "B", "G"], symbol: ["X", "O"], width: [40, 60, 80, 120], height: [30, 50, 90, 100], min: [1, 5, 10], max: [20, 50, 100],
  amount: [25.0, 40.5, 100.0], grade: [9, 10, 11, 12], gpa: [2.9, 3.2, 3.8], players: [1, 2, 4], battery: [50, 80, 100], balance: [100.0, 250.5, 75.25],
  pin: [1234, 4321, 2468], species: ["cat", "dog", "rabbit"], id: ["R2", "K9", "B7"], age2: [1, 3, 7], x: [1.5, 2.5, 3.75], y: [0.5, 4.5, 6.25], hour: [8, 9, 10, 11], minute: [15, 30, 45],
};
function valueFor(g, type, name) {
  const pool = PARAM_VALUES[name];
  if (pool) {
    const v = g.pick(pool);
    if (type === "String" && typeof v === "string") return v;
    if ((type === "int" || type === "double") && typeof v === "number" && (type === "double" || Number.isInteger(v))) return v;
    if (type === "char" && typeof v === "string" && v.length === 1) return v;
  }
  return randomValue(g, type);
}

/* ------------------------------------------------------------------ */
/* Token model for click-the-code questions                            */
/* ------------------------------------------------------------------ */
const SELECTABLE = new Set(["kw", "type", "name", "lit", "op"]);
export function builder() {
  const tokens = [],
    nodes = [],
    stack = [];
  const lastReal = () => {
    for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].kind !== "ws") return i;
    return -1;
  };
  const b = {
    tokens,
    nodes,
    t(text, kind, ...tags) {
      const i = tokens.length;
      tokens.push({ i, text, kind, sel: SELECTABLE.has(kind) });
      for (const tag of tags) nodes.push({ tag, start: i, end: i });
      return b;
    },
    w(text = " ") {
      tokens.push({ i: tokens.length, text, kind: "ws", sel: false });
      return b;
    },
    nl(indent = 0) {
      return b.w("\n" + "    ".repeat(indent));
    },
    open(tag) {
      stack.push({ tag, start: tokens.length });
      return b;
    },
    close() {
      const n = stack.pop();
      n.end = lastReal();
      nodes.push(n);
      return b;
    },
    code() {
      return tokens.map((t) => t.text).join("");
    },
    done() {
      if (stack.length) throw new Error("unclosed node " + stack.map((s) => s.tag));
      return { tokens, nodes, code: b.code() };
    },
  };
  return b;
}
export function spanOf(model, tag) {
  const n = model.nodes.find((x) => x.tag === tag);
  if (!n) throw new Error("missing node " + tag);
  return [n.start, n.end];
}
export function spanText(model, [s, e]) {
  return model.tokens
    .slice(s, e + 1)
    .map((t) => t.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
/* Selection behaviour shared by UI and tests: tapping a token selects it;
   tapping inside the current selection expands to the next larger
   enclosing component (node) that contains the tapped token. */
/* Plain-language role of a selected span, used in feedback for wrong picks */
const ROLE = [
  [/^classAccess$/, "the class's access modifier"],
  [/^className$/, "the class name"],
  [/^fieldAccess$/, "an instance variable's access modifier"],
  [/^fieldName:(\w+)$/, "the instance variable $1"],
  [/^fieldDecl:(\w+)$/, "the declaration of the instance variable $1"],
  [/^access$/, "the method's access modifier"],
  [/^returnType$/, "the method's return type"],
  [/^methodName$/, "the method name"],
  [/^header$/, "the method header"],
  [/^method$/, "the whole method"],
  [/^paramList$/, "the parameter list"],
  [/^param(\d)Type$/, "the data type of parameter $1"],
  [/^param(\d)Name$/, "the name of parameter $1"],
  [/^param(\d)$/, "parameter $1"],
  [/^returnStmt$/, "the return statement"],
  [/^returnExpr$/, "the returned expression"],
  [/^arg(\d)$/, "argument $1 of a method call"],
  [/^callName$/, "the name of a method being called"],
  [/^printStmt$/, "the print statement"],
  [/^assign(?::(\w+))?$/, "an assignment statement"],
  [/^ctorAccess$/, "the constructor's access modifier"],
  [/^ctorName$/, "the constructor name"],
  [/^ctorHeader$/, "the constructor header"],
  [/^ctorBody$/, "the constructor body"],
  [/^ctor$/, "the whole constructor"],
  [/^otherAccess$/, "the method's access modifier"],
  [/^otherReturn$/, "the method's return type"],
  [/^otherName$/, "the name of an ordinary method"],
  [/^trapAccess$/, "the access modifier of a method"],
  [/^trapReturn$/, "the return type void of an ordinary method"],
  [/^trapName$/, "the name of an ordinary method (it has a return type, so it is not a constructor)"],
  [/^mod\d$/, "an access modifier"],
  [/^name\d$/, "a method name"],
];
export function roleOf(model, span) {
  const nodes = model.nodes.filter((n) => n.start <= span[0] && n.end >= span[1]).sort((a, b) => a.end - a.start - (b.end - b.start));
  const exact = nodes.filter((n) => n.start === span[0] && n.end === span[1]);
  for (const n of [...exact, ...nodes]) {
    for (const [re, text] of ROLE) if (re.test(n.tag)) return { text: n.tag.replace(re, text), exact: exact.includes(n) };
  }
  return null;
}
export function nextSelection(model, current, tokenIndex) {
  const tok = model.tokens[tokenIndex];
  if (!tok || !tok.sel) return current;
  const leaf = [tokenIndex, tokenIndex];
  if (!current || tokenIndex < current[0] || tokenIndex > current[1]) return leaf;
  const size = (s) => s[1] - s[0];
  const bigger = model.nodes
    .filter((n) => n.start <= current[0] && n.end >= current[1] && n.start <= tokenIndex && n.end >= tokenIndex)
    .map((n) => [n.start, n.end])
    .filter((s) => size(s) > size(current))
    .sort((a, b) => size(a) - size(b));
  return bigger[0] || leaf;
}

/* Marked Java source -> token model. Markers: "⟦tag " opens a node and
   "⟧" closes the most recent one. Example: "⟦ret return ⟦expr a + b⟧;⟧" */
const KEYWORDS = new Set(["public", "private", "return", "new", "class", "if", "else", "static", "this", "for", "while"]);
const PRIMS = new Set(["int", "double", "boolean", "char", "String", "void", "long"]);
export function markedModel(src, typeNames = []) {
  const types = new Set([...PRIMS, ...typeNames]);
  const b = builder();
  let i = 0;
  const re = {
    ws: /^\s+/,
    str: /^"(?:[^"\\]|\\.)*"/,
    chr: /^'(?:[^'\\]|\\.)'/,
    num: /^\d+(?:\.\d+)?/,
    id: /^[A-Za-z_]\w*/,
    op: /^(?:==|!=|<=|>=|&&|\|\||\+\+|--|[+\-*/%=<>!])/,
    punct: /^[(){};,.\[\]]/,
  };
  while (i < src.length) {
    const rest = src.slice(i);
    if (rest.startsWith("⟦")) {
      const sp = rest.indexOf(" ");
      b.open(rest.slice(1, sp));
      i += sp + 1;
      continue;
    }
    if (rest.startsWith("⟧")) {
      b.close();
      i += 1;
      continue;
    }
    let m;
    if ((m = rest.match(/^\/\/[^\n]*/))) b.t(m[0], "com");
    else if ((m = rest.match(/^\?\?\?/))) b.t(m[0], "blank");
    else if ((m = rest.match(re.ws))) b.w(m[0]);
    else if ((m = rest.match(re.str)) || (m = rest.match(re.chr)) || (m = rest.match(re.num))) b.t(m[0], "lit");
    else if ((m = rest.match(re.id))) {
      const w = m[0];
      b.t(w, w === "true" || w === "false" ? "lit" : KEYWORDS.has(w) ? "kw" : types.has(w) ? "type" : "name");
    } else if ((m = rest.match(re.op))) b.t(m[0], "op");
    else if ((m = rest.match(re.punct))) b.t(m[0], "punct");
    else throw new Error("cannot tokenize near " + rest.slice(0, 12));
    i += m[0].length;
  }
  return b.done();
}
export const stripMarks = (src) => src.replace(/⟦\S+ /g, "").replace(/⟧/g, "");

/* ------------------------------------------------------------------ */
/* Method structures (shared by several modes)                         */
/* ------------------------------------------------------------------ */
/* Each family returns a spec:
   { family, access, ret, name, params:[{type,name,meaning}], bodyMarked,
     classFields:[{type,name}], helpers:[marked source], className,
     returnExpr (text) or null, call: {name, args:[text]} or null } */
const ACCESS = ["public", "public", "private"];
function paramsMarked(params) {
  return params
    .map((p, k) => `⟦param${k + 1} ⟦param${k + 1}Type ${p.type}⟧ ⟦param${k + 1}Name ${p.name}⟧⟧`)
    .join(", ");
}
export function methodMarked(spec, indent = "") {
  const head = `${indent}⟦header ⟦access ${spec.access}⟧ ⟦returnType ${spec.ret}⟧ ⟦methodName ${spec.name}⟧(${spec.params.length ? `⟦paramList ${paramsMarked(spec.params)}⟧` : ""})⟧ {`;
  const body = spec.bodyMarked.map((l) => `${indent}    ${l}`).join("\n");
  return `⟦method ${head}\n${body}\n${indent}}⟧`;
}
const CALC2 = [
  { name: "calculateTotal", a: "price", b: "tax", op: "+", types: ["int", "double"], meaning: ["price", "tax"] },
  { name: "addPoints", a: "score", b: "bonus", op: "+", types: ["int"], meaning: ["score", "bonus"] },
  { name: "computeArea", a: "width", b: "height", op: "*", types: ["int", "double"], meaning: ["width", "height"] },
  { name: "findDifference", a: "high", b: "low", op: "-", types: ["int", "double"], meaning: ["high value", "low value"] },
  { name: "scaleSpeed", a: "speed", b: "factor", op: "*", types: ["double"], meaning: ["speed", "factor"] },
  { name: "remainingFuel", a: "tank", b: "used", op: "-", types: ["int"], meaning: ["tank size", "fuel used"] },
];
function famCalc2(g) {
  const c = g.pick(CALC2);
  const t = g.pick(c.types);
  const mixed = t === "double" && g.chance(0.4);
  const params = [
    { type: t, name: c.a, meaning: c.meaning[0] },
    { type: mixed ? "int" : t, name: c.b, meaning: c.meaning[1] },
  ];
  const expr = `${c.a} ${c.op} ${c.b}`;
  return { family: "calculation", access: g.pick(ACCESS), ret: t, name: c.name, params, bodyMarked: [`⟦returnStmt return ⟦returnExpr ${expr}⟧;⟧`], returnExpr: expr, op: c.op };
}
const CALC3 = [
  { name: "totalCost", params: [["double", "price"], ["int", "quantity"], ["double", "shipping"]], expr: "price * quantity + shipping", ret: "double" },
  { name: "averageOfThree", params: [["int", "first"], ["int", "second"], ["int", "third"]], expr: "(first + second + third) / 3", ret: "int" },
  { name: "finalScore", params: [["int", "points"], ["int", "bonus"], ["int", "penalty"]], expr: "points + bonus - penalty", ret: "int" },
  { name: "tripTime", params: [["double", "distance"], ["double", "speed"], ["double", "stops"]], expr: "distance / speed + stops", ret: "double" },
];
function famCalc3(g) {
  const c = g.pick(CALC3);
  return { family: "three-parameter calculation", access: g.pick(ACCESS), ret: c.ret, name: c.name, params: c.params.map(([type, name]) => ({ type, name, meaning: name })), bodyMarked: [`⟦returnStmt return ⟦returnExpr ${c.expr}⟧;⟧`], returnExpr: c.expr };
}
const CLASS_FIELDS = [
  { cls: "Player", fields: [["String", "name"], ["int", "score"], ["boolean", "online"]] },
  { cls: "Product", fields: [["String", "label"], ["double", "price"], ["int", "stock"]] },
  { cls: "Car", fields: [["String", "model"], ["int", "year"], ["double", "mileage"]] },
  { cls: "Robot", fields: [["String", "id"], ["int", "battery"], ["boolean", "active"]] },
  { cls: "Account", fields: [["String", "owner"], ["double", "balance"], ["int", "pin"]] },
  { cls: "Student", fields: [["String", "name"], ["int", "grade"], ["double", "gpa"]] },
];
function famGetter(g) {
  const c = g.pick(CLASS_FIELDS);
  const [type, field] = g.pick(c.fields);
  const name = type === "boolean" ? `is${cap(field)}` : `get${cap(field)}`;
  return { family: "accessor (getter)", access: "public", ret: type, name, params: [], bodyMarked: [`⟦returnStmt return ⟦returnExpr ${field}⟧;⟧`], returnExpr: field, className: c.cls, classFields: c.fields };
}
function famSetter(g) {
  const c = g.pick(CLASS_FIELDS);
  const [type, field] = g.pick(c.fields);
  const pname = `new${cap(field)}`;
  return { family: "mutator (setter)", access: g.pick(["public", "public", "private"]), ret: "void", name: `set${cap(field)}`, params: [{ type, name: pname, meaning: field }], bodyMarked: [`⟦assign ${field} = ${pname};⟧`], returnExpr: null, className: c.cls, classFields: c.fields };
}
const PREDICATES = [
  { name: "isPassing", params: [["int", "score"]], expr: "score >= 70" },
  { name: "isChild", params: [["int", "age"]], expr: "age < 13" },
  { name: "canAfford", params: [["double", "price"], ["double", "budget"]], expr: "price <= budget" },
  { name: "isLongName", params: [["String", "name"]], expr: "name.length() > 5" },
  { name: "isTie", params: [["int", "homeScore"], ["int", "awayScore"]], expr: "homeScore == awayScore" },
  { name: "needsCharge", params: [["int", "battery"]], expr: "battery < 20" },
];
function famPredicate(g) {
  const c = g.pick(PREDICATES);
  return { family: "boolean predicate", access: g.pick(ACCESS), ret: "boolean", name: c.name, params: c.params.map(([type, name]) => ({ type, name, meaning: name })), bodyMarked: [`⟦returnStmt return ⟦returnExpr ${c.expr}⟧;⟧`], returnExpr: c.expr };
}
const ACTIONS = [
  { name: "printGreeting", params: [["String", "name"]], text: '"Hello, " + name' },
  { name: "showScore", params: [["String", "player"], ["int", "score"]], text: 'player + ": " + score' },
  { name: "announceLevel", params: [["int", "level"]], text: '"Level " + level' },
  { name: "displayPrice", params: [["String", "item"], ["double", "price"]], text: 'item + " costs " + price' },
];
function famAction(g) {
  const c = g.pick(ACTIONS);
  return { family: "printing (action) method", access: g.pick(ACCESS), ret: "void", name: c.name, params: c.params.map(([type, name]) => ({ type, name, meaning: name })), bodyMarked: [`⟦printStmt System.out.⟦callName println⟧(⟦arg1 ${c.text}⟧);⟧`], returnExpr: null, call: { name: "println", args: [c.text] } };
}
function famChar(g) {
  return { family: "char result", access: g.pick(ACCESS), ret: "char", name: g.pick(["letterAt", "pickLetter"]), params: [{ type: "String", name: "word", meaning: "word" }, { type: "int", name: "index", meaning: "position" }], bodyMarked: ["⟦returnStmt return ⟦returnExpr word.charAt(index)⟧;⟧"], returnExpr: "word.charAt(index)" };
}
function famString(g) {
  const c = g.pick([
    { name: "fullName", params: [["String", "first"], ["String", "last"]], expr: 'first + " " + last' },
    { name: "makeTag", params: [["String", "team"], ["int", "number"]], expr: 'team + "-" + number' },
    { name: "shout", params: [["String", "message"]], expr: 'message + "!"' },
  ]);
  return { family: "String result", access: g.pick(ACCESS), ret: "String", name: c.name, params: c.params.map(([type, name]) => ({ type, name, meaning: name })), bodyMarked: [`⟦returnStmt return ⟦returnExpr ${c.expr}⟧;⟧`], returnExpr: c.expr };
}
function famDelegate(g) {
  const c = g.pick([
    { name: "doubleScore", p: ["int", "score"], helper: "multiply", hp: [["int", "a"], ["int", "b"]], args: ["score", "2"], ret: "int", hexpr: "a * b" },
    { name: "addTax", p: ["double", "price"], helper: "percentOf", hp: [["double", "amount"], ["double", "rate"]], args: ["price", "0.08"], ret: "double", hexpr: "amount * rate" },
    { name: "isWinner", p: ["int", "points"], helper: "atLeast", hp: [["int", "value"], ["int", "goal"]], args: ["points", "100"], ret: "boolean", hexpr: "value >= goal" },
  ]);
  const argsMarked = c.args.map((a, k) => `⟦arg${k + 1} ${a}⟧`).join(", ");
  const expr = `${c.helper}(${c.args.join(", ")})`;
  const helper = { access: "private", ret: c.ret, name: c.helper, params: c.hp.map(([type, name]) => ({ type, name })), bodyMarked: [`return ${c.hexpr};`] };
  return { family: "method that calls another method", access: "public", ret: c.ret, name: c.name, params: [{ type: c.p[0], name: c.p[1], meaning: c.p[1] }], bodyMarked: [`⟦returnStmt return ⟦returnExpr ⟦callName ${c.helper}⟧(${argsMarked})⟧;⟧`], returnExpr: expr, call: { name: c.helper, args: c.args }, helper };
}
function famEarlyReturn(g) {
  const c = g.pick(CLASS_FIELDS.filter((x) => x.fields.some(([t]) => t === "int" || t === "double")));
  const [type, field] = c.fields.find(([t]) => t === "int" || t === "double");
  const p = g.pick(["amount", "change"]);
  return { family: "void method with an early return", access: "public", ret: "void", name: `add${cap(field)}`, params: [{ type, name: p, meaning: "amount to add" }], bodyMarked: [`if (${p} <= 0) {`, `    ⟦returnStmt return;⟧`, `}`, `⟦assign ${field} = ${field} + ${p};⟧`], returnExpr: null, className: c.cls, classFields: c.fields, earlyReturn: true };
}
export const METHOD_FAMILIES = [famCalc2, famCalc3, famGetter, famSetter, famPredicate, famAction, famChar, famString, famDelegate, famEarlyReturn];
/* Full class source (marked) for a method spec, used for display and javac */
function classMarked(spec) {
  const cls = spec.className || "Helper";
  const fields = (spec.classFields || []).map(([t, n]) => `    private ${t} ${n};`);
  const helper = spec.helper ? ["", stripMarks(methodMarked(spec.helper, "    "))] : [];
  return [`⟦classAccess public⟧ class ⟦className ${cls}⟧ {`, ...fields.map((f, i) => f.replace(/private (\S+) (\w+);/, "⟦fieldDecl:$2 ⟦fieldAccess private⟧ $1 ⟦fieldName:$2 $2⟧;⟧")), ...(fields.length ? [""] : []), methodMarked(spec, "    "), ...helper, "}"].join("\n");
}

/* ------------------------------------------------------------------ */
/* Challenge helpers                                                   */
/* ------------------------------------------------------------------ */
let serial = 0;
const newId = () => `mcl-${Date.now().toString(36)}-${(serial++).toString(36)}`;
function base(mode, generator, concept) {
  return { id: newId(), mode, modeTitle: MODES[mode], generator, concept };
}
const unit = (cls, source) => ({ name: `${cls}.java`, source });
/* A compile check the JVM test runs: expect "ok" or "error" */
const check = (files, expect, extra = {}) => ({ files, expect, ...extra });
const wrapMethod = (src, cls = "Helper") => `public class ${cls} {\n${src.split("\n").map((l) => "    " + l).join("\n")}\n}`;

/* ------------------------------------------------------------------ */
/* Mode A: Identify method parts (click the code)                      */
/* ------------------------------------------------------------------ */
function selectChallenge(mode, generator, concept, { blocks, answers, question, explanation, prompt = "", checks = [] }) {
  const ans = answers.map((a) => ({ block: a.block || 0, span: a.span }));
  return {
    ...base(mode, generator, concept),
    kind: "select",
    prompt,
    question,
    blocks,
    answers: ans,
    answerText: spanText(blocks[ans[0].block].model, ans[0].span),
    explanation,
    javaChecks: checks,
  };
}
function genIdentifyMethod(g) {
  const spec = g.pick(METHOD_FAMILIES)(g);
  const wrapped = !!(spec.className || spec.helper);
  const src = wrapped ? classMarked(spec) : methodMarked(spec);
  const model = markedModel(src, spec.className ? [spec.className] : []);
  const n = spec.params.length;
  const opts = [];
  const add = (w, f) => opts.push([w, f]);
  add(2, () => ({ tag: "access", q: "Click the access modifier of the method.", e: `${spec.access} is the access modifier. It ${spec.access === "public" ? "lets code in other classes call the method" : "means only code inside this class can call the method"}.` }));
  add(3, () => ({ tag: "returnType", q: `Click the return type of ${spec.name}.`, e: spec.ret === "void" ? `void is the declared return type: the method does not return a value. ${spec.name} is the method name.` : `${spec.ret} is the return type (the type of value the method sends back), while ${spec.name} is the method name.` }));
  add(2, () => ({ tag: "methodName", q: "Click the method name.", e: `${spec.name} is the method name; it comes right after the return type ${spec.ret} and right before the parameter list.` }));
  if (n) {
    const k = g.int(1, n);
    const p = spec.params[k - 1];
    add(3, () => ({ tag: `param${k}Type`, q: `Click the data type of the ${ordinal(k - 1)} parameter.`, e: `The ${ordinal(k - 1)} parameter is ${p.type} ${p.name}: ${p.type} is its data type and ${p.name} is its name.` }));
    add(3, () => ({ tag: `param${k}Name`, q: `Click the name of the ${ordinal(k - 1)} parameter.`, e: `${p.name} is the parameter name; ${p.type} in front of it is the parameter's data type.` }));
    add(2, () => ({ tag: `param${k}`, q: `Select the whole ${ordinal(k - 1)} parameter (its type and name).`, e: `A parameter declaration has a type and a name: ${p.type} ${p.name}. Parameters are declared inside the method's parentheses.` }));
    if (n >= 2) add(1, () => ({ tag: "paramList", q: "Select the entire parameter list (everything inside the parentheses of the method header).", e: `The parameter list is ${spec.params.map((x) => `${x.type} ${x.name}`).join(", ")}: each parameter has a type and a name, separated by commas.` }));
  }
  if (spec.returnExpr) {
    add(2, () => ({ tag: "returnStmt", q: "Select the whole return statement.", e: `The return statement is return ${spec.returnExpr}; — the keyword return, the value being returned, and the semicolon.` }));
    add(3, () => ({ tag: "returnExpr", q: "Select the expression whose value is returned.", e: `${spec.returnExpr} is the returned expression. Its value must be compatible with the return type ${spec.ret}.` }));
  }
  if (spec.earlyReturn) add(3, () => ({ tag: "returnStmt", q: "Select the statement that ends this method early.", e: "return; with no value exits a void method early. A void method may use return; but never return a value." }));
  if (spec.call) {
    const k = g.int(1, spec.call.args.length);
    add(3, () => ({ tag: `arg${k}`, q: `Select the ${ordinal(k - 1)} argument passed in the call to ${spec.call.name}.`, e: `${spec.call.args[k - 1]} is an argument: a value supplied in a method call. Parameters are declared in a method header; arguments are passed when calling it.` }));
  }
  const total = opts.reduce((s, o) => s + o[0], 0);
  let r = g.rng() * total,
    chosen = opts[0][1];
  for (const [w, f] of opts) if ((r -= w) < 0) {
      chosen = f;
      break;
    }
  const q = chosen();
  const methodSrc = stripMarks(methodMarked(spec));
  return selectChallenge("identify-method", `method-${spec.family}`, cap(spec.family), {
    blocks: [{ label: wrapped ? `${spec.className || "Helper"}.java` : "", model }],
    answers: [{ span: spanOf(model, q.tag) }],
    question: q.q,
    explanation: q.e,
    prompt: wrapped ? `Look at the method ${spec.name} inside this class.` : "",
    checks: [check([unit(spec.className || "Helper", wrapped ? stripMarks(src) : wrapMethod(methodSrc))], "ok")],
  });
}

/* ------------------------------------------------------------------ */
/* Mode B: Identify constructor parts                                  */
/* ------------------------------------------------------------------ */
const CTOR_CLASSES = [
  { cls: "Student", fields: [["String", "name", "name", "studentName"], ["int", "grade", "grade level", "studentGrade"], ["double", "gpa", "GPA", "startGpa"]] },
  { cls: "VideoGame", fields: [["String", "title", "title", "gameTitle"], ["int", "players", "number of players", "maxPlayers"], ["double", "price", "price", "listPrice"]] },
  { cls: "Robot", fields: [["String", "id", "ID", "robotId"], ["int", "battery", "battery level", "startBattery"], ["boolean", "active", "active status", "isActive"]] },
  { cls: "BankAccount", fields: [["String", "owner", "owner's name", "ownerName"], ["double", "balance", "balance", "startBalance"], ["int", "pin", "PIN", "accountPin"]] },
  { cls: "Car", fields: [["String", "model", "model", "carModel"], ["int", "year", "year", "modelYear"], ["double", "mpg", "miles per gallon", "milesPerGallon"]] },
  { cls: "Pet", fields: [["String", "name", "name", "petName"], ["int", "age", "age", "petAge"], ["String", "species", "species", "kind"]] },
];
const DEFAULTS = { String: '"Unknown"', int: "0", double: "0.0", boolean: "false", char: "'?'" };
export function constructorClass(g, { noArg = false, thisStyle = false, trap = false, getter = false, nFields } = {}) {
  const c = g.pick(CTOR_CLASSES);
  const fields = c.fields.slice(0, nFields || g.int(2, 3));
  const access = g.chance(0.85) ? "public" : "private";
  const params = noArg ? [] : fields.map(([type, field, meaning, pname]) => ({ type, name: thisStyle ? field : pname, field, meaning }));
  const lines = [`⟦classAccess public⟧ class ⟦className ${c.cls}⟧ {`];
  for (const [type, field] of fields) lines.push(`    ⟦fieldDecl:${field} ⟦fieldAccess private⟧ ${type} ⟦fieldName:${field} ${field}⟧;⟧`);
  lines.push("");
  const head = `⟦ctorHeader ⟦ctorAccess ${access}⟧ ⟦ctorName ${c.cls}⟧(${params.length ? `⟦paramList ${paramsMarked(params)}⟧` : ""})⟧`;
  const assigns = fields.map(([type, field], k) => (noArg ? `        ⟦assign:${field} ${field} = ${DEFAULTS[type]};⟧` : thisStyle ? `        ⟦assign:${field} this.${field} = ${params[k].name};⟧` : `        ⟦assign:${field} ${field} = ${params[k].name};⟧`));
  lines.push(`    ⟦ctor ${head} ⟦ctorBody {`, ...assigns, "    }⟧⟧");
  if (getter) {
    const [type, field] = fields[0];
    lines.push("", `    ⟦otherMethod ⟦otherAccess public⟧ ⟦otherReturn ${type}⟧ ⟦otherName get${cap(field)}⟧() {`, `        return ${field};`, "    }⟧");
  }
  if (trap) lines.push("", `    ⟦trapMethod ⟦trapAccess public⟧ ⟦trapReturn void⟧ ⟦trapName ${c.cls}⟧() {`, `        System.out.println("This is a method, not a constructor");`, "    }⟧");
  lines.push("}");
  const marked = lines.join("\n");
  return { cls: c.cls, fields, params, access, noArg, thisStyle, trap, getter, marked, model: markedModel(marked, [c.cls]), source: stripMarks(marked) };
}
function genIdentifyConstructor(g) {
  const variant = g.pick(["plain", "plain", "this", "noArg", "trap", "getter"]);
  const k = constructorClass(g, { noArg: variant === "noArg", thisStyle: variant === "this", trap: variant === "trap", getter: variant === "getter" || variant === "trap" });
  const opts = [];
  const add = (w, f) => opts.push([w, f]);
  const ctorRule = "A constructor has the same name as its class and no return type, not even void.";
  add(variant === "trap" ? 0 : 2, () => ({ tag: "className", q: "Click the class name.", e: `${k.cls} after the keyword class is the class name. The constructor uses the same name.` }));
  add(variant === "trap" ? 24 : 3, () => ({ tag: "ctorName", q: "Click the constructor's name.", e: variant === "trap" ? `The constructor is the ${k.cls}(...) member with no return type. public void ${k.cls}() declares a return type (void), so it is an ordinary method even though its name matches the class.` : `${k.cls} in the constructor header is the constructor name. ${ctorRule}` }));
  if (variant === "trap") opts.length = 0;
  add(variant === "trap" ? 1 : 0, () => ({ tag: "ctorName", q: "Click the constructor's name.", e: `The constructor is the ${k.cls}(...) member with no return type. public void ${k.cls}() declares a return type (void), so it is an ordinary method even though its name matches the class.` }));
  if (variant === "trap") {
    const q = opts[0][1]();
    return selectChallenge("identify-constructor", "constructor-trap", "Constructor vs. method with the class name", { blocks: [{ label: `${k.cls}.java`, model: k.model }], answers: [{ span: spanOf(k.model, q.tag) }], question: q.q, explanation: q.e, checks: [check([unit(k.cls, k.source)], "ok")] });
  }
  add(2, () => ({ tag: "ctorAccess", q: "Click the constructor's access modifier.", e: `${k.access} is the constructor's access modifier. ${k.access === "private" ? "A private constructor can only be used by code inside this class." : "public lets other classes create objects with new."}` }));
  add(variant === "getter" ? 4 : 0, () => ({ tag: "otherName", q: "This class has a constructor and a method. Click the name of the method.", e: `get${cap(k.fields[0][1])} is a method: it declares the return type ${k.fields[0][0]}. ${ctorRule}` }));
  if (k.params.length) {
    const i = g.int(1, k.params.length);
    const p = k.params[i - 1];
    add(2, () => ({ tag: `param${i}Type`, q: `Click the data type of the constructor's ${ordinal(i - 1)} parameter.`, e: `The ${ordinal(i - 1)} parameter is ${p.type} ${p.name}; ${p.type} is its data type.` }));
    add(2, () => ({ tag: `param${i}Name`, q: `Click the name of the constructor parameter that supplies the ${p.meaning}.`, e: `${p.name} is the parameter that receives the ${p.meaning}; the constructor copies it into the instance variable ${p.field}.` }));
    add(2, () => ({ tag: `param${i}`, q: `Select the whole ${ordinal(i - 1)} constructor parameter (type and name).`, e: `The ${ordinal(i - 1)} parameter declaration is ${p.type} ${p.name}.` }));
    add(3, () => ({ tag: `assign:${p.field}`, q: `Select the statement that stores the parameter ${p.name} in an instance variable.`, e: `${k.thisStyle ? `this.${p.field} = ${p.name};` : `${p.field} = ${p.name};`} assigns the parameter's value to the instance variable ${p.field}.${k.thisStyle ? " this. is needed because the parameter has the same name as the instance variable." : ""}` }));
  } else {
    const [type, field] = g.pick(k.fields);
    add(3, () => ({ tag: `assign:${field}`, q: `Select the statement that gives the instance variable ${field} its starting value.`, e: `${field} = ${DEFAULTS[type]}; sets the starting value. A no-argument constructor has an empty parameter list.` }));
  }
  const [ft, fname, fmeaning] = g.pick(k.fields);
  add(3, () => ({ tag: `fieldName:${fname}`, q: `In its declaration, click the name of the instance variable that stores the ${fmeaning}.`, e: `private ${ft} ${fname}; declares the instance variable ${fname}. Instance variables are declared in the class, outside any constructor or method.` }));
  add(2, () => ({ tag: "ctorBody", q: "Select the constructor body (from its { to its }).", e: "The constructor body is the block of statements in braces after the constructor header; it runs when an object is created with new." }));
  const total = opts.reduce((s, o) => s + o[0], 0);
  let r = g.rng() * total,
    chosen = null;
  for (const [w, f] of opts) if (w && (r -= w) < 0) {
      chosen = f;
      break;
    }
  chosen ||= opts.find((o) => o[0])[1];
  const q = chosen();
  return selectChallenge("identify-constructor", `constructor-${variant}`, variant === "trap" ? "Constructor vs. method with the class name" : variant === "noArg" ? "No-argument constructor" : "Constructor parts", {
    blocks: [{ label: `${k.cls}.java`, model: k.model }],
    answers: [{ span: spanOf(k.model, q.tag) }],
    question: q.q,
    explanation: q.e,
    checks: [check([unit(k.cls, k.source)], "ok")],
  });
}

/* ------------------------------------------------------------------ */
/* Multiple-choice helper                                              */
/* ------------------------------------------------------------------ */
function choiceChallenge(g, mode, generator, concept, { question, prompt = "", blocks = [], correct, distractors, explanation, checks = [], codeChoices = true }) {
  // correct: {text, check?}, distractors: [{text, why, check?}] (exactly 3)
  if (distractors.length !== 3) throw new Error("need 3 distractors");
  const all = g.shuffle([{ ...correct, correct: true, why: "" }, ...distractors.map((d) => ({ ...d, correct: false }))]);
  const texts = new Set(all.map((c) => c.text));
  if (texts.size !== 4) return null;
  const choiceChecks = all.filter((c) => c.check).map((c) => ({ ...c.check, choice: c.text }));
  return {
    ...base(mode, generator, concept),
    kind: "choice",
    prompt,
    question,
    blocks,
    choices: all.map(({ text, correct: ok, why }) => ({ text, correct: ok, why })),
    answer: all.findIndex((c) => c.correct),
    codeChoices,
    explanation,
    javaChecks: [...checks, ...choiceChecks],
  };
}
const codeBlock = (code, label = "", typeNames = []) => ({ label, model: markedModel(code, typeNames) });

/* ------------------------------------------------------------------ */
/* Mode C: Match method calls to signatures                            */
/* ------------------------------------------------------------------ */
const SIGNATURES = [
  { name: "setPlayer", params: [["String", "name"], ["int", "score"], ["boolean", "active"]] },
  { name: "addItem", params: [["String", "item"], ["int", "quantity"], ["double", "price"]] },
  { name: "logLap", params: [["int", "lap"], ["double", "seconds"]] },
  { name: "setGrade", params: [["char", "letter"], ["int", "points"]] },
  { name: "sendMessage", params: [["String", "to"], ["String", "text"], ["boolean", "urgent"]] },
  { name: "chargeBattery", params: [["int", "minutes"], ["boolean", "fastMode"]] },
  { name: "rateMovie", params: [["String", "title"], ["double", "stars"]] },
  { name: "placeTile", params: [["int", "row"], ["int", "column"], ["char", "symbol"]] },
  { name: "updateStock", params: [["String", "product"], ["int", "count"]] },
  { name: "setThermostat", params: [["double", "degrees"], ["boolean", "heating"]] },
];
const WRONG_LIT = {
  int: [["String", (v) => `"${v}"`], ["double", (v) => `${v}.5`], ["boolean", () => "true"]],
  double: [["String", (v) => `"${v}"`], ["boolean", () => "false"]],
  boolean: [["String", (v) => `"${v}"`], ["int", () => "1"]],
  String: [["int", () => "7"], ["char", () => "'A'"], ["boolean", () => "true"]],
  char: [["String", (v) => `"${v}"`], ["double", () => "2.5"]],
};
function sigText(name, params, access = "public", ret = "void") {
  return `${access} ${ret} ${name}(${params.map(([t, n]) => `${t} ${n}`).join(", ")})`;
}
/* Class + caller used for compile checks of a call statement */
function callUnit(methodsSrc, callStmt, cls = "Caller") {
  return unit(cls, `public class ${cls} {\n${methodsSrc}\n\n    public void test() {\n        ${callStmt}\n    }\n}`);
}
function methodStub([name, params, ret = "void"], idx = null) {
  const body = ret === "void" ? (idx === null ? "" : `System.out.println("${idx}");`) : `return ${DEFAULTS[ret]};`;
  return `    public ${ret} ${name}(${params.map(([t, n]) => `${t} ${n}`).join(", ")}) {\n        ${body}\n    }`;
}
function genMatchCall(g) {
  const s = g.pick(SIGNATURES);
  const params = s.params.map(([type, name]) => ({ type, name }));
  const vals = params.map((p) => valueFor(g, p.type, p.name));
  // Sometimes pass an int literal to a double parameter (valid widening)
  const argTypes = params.map((p) => p.type);
  const argText = params.map((p, i) => {
    if (p.type === "double" && g.chance(0.45)) {
      argTypes[i] = "int";
      return String(Math.round(vals[i]) || 3);
    }
    return lit(p.type, vals[i]);
  });
  const call = (name, args) => `${name}(${args.join(", ")});`;
  const correctText = call(s.name, argText);
  const cands = [];
  for (let i = 0; i + 1 < params.length; i++) {
    const t = argTypes.slice();
    [t[i], t[i + 1]] = [t[i + 1], t[i]];
    if (!applicable(t, params)) {
      const a = argText.slice();
      [a[i], a[i + 1]] = [a[i + 1], a[i]];
      const bad = [i, i + 1].filter((j) => !assignable(t[j], params[j].type));
      const okOne = [i, i + 1].find((j) => !bad.includes(j));
      const why = `The ${ordinal(i)} and ${ordinal(i + 1)} arguments are swapped. ${bad.map((j) => `${a[j]} (${t[j]}) cannot be passed to the ${ordinal(j)} parameter ${params[j].type} ${params[j].name}`).join(", and ")}.${okOne !== undefined ? ` (${a[okOne]} would fit the ${params[okOne].type} parameter by widening, but the other argument does not.)` : ""}${bad.some((j) => t[j] === "int" && params[j].type === "char") ? " Java never narrows an int to a char in a method call." : ""}`;
      cands.push({ text: call(s.name, a), why });
    }
  }
  cands.push({ text: call(s.name, argText.slice(0, -1)), why: `The method has ${params.length} parameters, so every call needs ${params.length} arguments; this call passes only ${params.length - 1}.` });
  const i = g.int(0, params.length - 1);
  const [wt, wf] = g.pick(WRONG_LIT[params[i].type]);
  if (!assignable(wt, params[i].type)) {
    const a = argText.slice();
    a[i] = wf(vals[i] === true || vals[i] === false ? vals[i] : typeof vals[i] === "number" ? Math.round(vals[i]) : vals[i]);
    cands.push({ text: call(s.name, a), why: `The ${ordinal(i)} parameter is ${params[i].type} ${params[i].name}, but ${a[i]} is ${article(wt)} ${wt} value${wt === "double" && params[i].type === "int" ? ", and Java will not narrow a double to an int automatically" : ""}.` });
  }
  cands.push({ text: call(s.name, [...argText, lit("int", g.int(1, 9))]), why: `This call passes ${params.length + 1} arguments, but the method declares only ${params.length} parameters.` });
  const wrongName = g.pick([cap(s.name), s.name + "s", s.name.toLowerCase()].filter((n) => n !== s.name));
  cands.push({ text: call(wrongName, argText), why: `Java names are case-sensitive and must match exactly: the method is ${s.name}, not ${wrongName}.` });
  const methodSrc = methodStub([s.name, s.params]);
  const pickD = g.shuffle(cands).filter((c, k, arr) => arr.findIndex((x) => x.text === c.text) === k && c.text !== correctText);
  // prefer one order error when available
  const order = pickD.filter((c) => /wrong order/.test(c.why));
  const rest = pickD.filter((c) => !/wrong order/.test(c.why));
  const distractors = [...order.slice(0, 1), ...rest].slice(0, 3).map((d) => ({ ...d, check: check([callUnit(methodSrc, d.text)], "error") }));
  if (distractors.length < 3) return null;
  const widened = argTypes.some((t, k) => t !== params[k].type);
  return choiceChallenge(g, "match-call", widened ? "call-widening" : "call-match", widened ? "Arguments and widening" : "Argument types, count, and order", {
    question: "Which method call uses the correct argument types and order?",
    blocks: [codeBlock(`${sigText(s.name, s.params)} {\n    // ...\n}`)],
    correct: { text: correctText, check: check([callUnit(methodSrc, correctText)], "ok") },
    distractors,
    explanation: `Arguments match parameters by position and type: ${params.map((p, k) => `${argText[k]} → ${p.type} ${p.name}`).join(", ")}.${widened ? " An int argument may be passed to a double parameter because Java widens int to double automatically." : ""}`,
  });
}
const OVERLOAD_SETS = [
  { name: "show", sigs: [[["int", "value"]], [["double", "value"]], [["String", "value"]]], calls: [["5", ["int"]], ["5.0", ["double"]], ['"5"', ["String"]], ["2.75", ["double"]]] },
  { name: "area", sigs: [[["double", "side"]], [["double", "width"], ["double", "height"]], [["double", "a"], ["double", "b"], ["double", "c"]]], calls: [["3", ["int"]], ["3, 4", ["int", "int"]], ["2.5, 4", ["double", "int"]], ["1, 2, 3", ["int", "int", "int"]]] },
  { name: "add", sigs: [[["int", "a"], ["int", "b"]], [["double", "a"], ["double", "b"]], [["String", "a"], ["String", "b"]]], calls: [["2, 3", ["int", "int"]], ["2, 3.5", ["int", "double"]], ['"2", "3"', ["String", "String"]], ["1.5, 2.5", ["double", "double"]], ['"2", 3', ["String", "int"]]] },
  { name: "describe", sigs: [[["String", "name"]], [["String", "name"], ["int", "age"]], [["int", "age"], ["String", "name"]]], calls: [['"Kai"', ["String"]], ['"Kai", 15', ["String", "int"]], ['15, "Kai"', ["int", "String"]], ['"Kai", "15"', ["String", "String"]]] },
  { name: "greet", sigs: [[], [["String", "name"]], [["String", "name"], ["boolean", "formal"]]], calls: [["", []], ['"Rosa"', ["String"]], ['"Rosa", true', ["String", "boolean"]], ["true", ["boolean"]]] },
  { name: "largest", sigs: [[["int", "a"], ["int", "b"]], [["double", "a"], ["double", "b"]], [["int", "a"], ["int", "b"], ["int", "c"]]], calls: [["4, 9", ["int", "int"]], ["4.5, 9", ["double", "int"]], ["4, 9, 2", ["int", "int", "int"]], ["4, 9.0", ["int", "double"]], ["4.5, 9, 2", ["double", "int", "int"]]] },
  { name: "setColor", sigs: [[["String", "name"]], [["int", "red"], ["int", "green"], ["int", "blue"]], [["String", "name"], ["double", "opacity"]]], calls: [['"teal"', ["String"]], ["0, 128, 255", ["int", "int", "int"]], ['"teal", 0.5', ["String", "double"]], ['"teal", 1', ["String", "int"]], ["0.5, 128, 255", ["double", "int", "int"]]] },
  { name: "log", sigs: [[["String", "message"]], [["String", "message"], ["int", "level"]], [["int", "code"]]], calls: [['"Saved"', ["String"]], ['"Saved", 2', ["String", "int"]], ["404", ["int"]], ["'E'", ["char"]], ['2, "Saved"', ["int", "String"]]] },
];
function overloadUnit(set, callArgs) {
  const methods = set.sigs.map((p, i) => methodStub([set.name, p], i)).join("\n\n");
  return unit("Overloads", `public class Overloads {\n${methods}\n\n    public static void main(String[] args) {\n        new Overloads().${set.name}(${callArgs});\n    }\n}`);
}
function genOverloadRuns(g) {
  const set = g.pick(OVERLOAD_SETS);
  const [args, types] = g.pick(set.calls);
  const overloads = set.sigs.map((p) => ({ params: p.map(([type, name]) => ({ type, name })) }));
  const r = resolveOverload(types, overloads);
  if (r === -2) return null;
  const headers = set.sigs.map((p) => sigText(set.name, p));
  const none = "None of them: the call does not compile";
  const correctText = r >= 0 ? headers[r] : none;
  const why = (i) => {
    const p = overloads[i].params;
    if (p.length !== types.length) return `This version has ${p.length} parameter${p.length === 1 ? "" : "s"}, but the call passes ${types.length} argument${types.length === 1 ? "" : "s"}.`;
    if (!applicable(types, p)) return `The argument${types.length === 1 ? "" : "s"} (${types.join(", ")}) cannot be converted to this version's parameter type${p.length === 1 ? "" : "s"} (${p.map((x) => x.type).join(", ")}).`;
    return `This version also accepts the arguments, but Java picks the most specific match: ${correctText}.`;
  };
  const distractors = headers.filter((h) => h !== correctText).map((h) => ({ text: h, why: why(headers.indexOf(h)) }));
  if (r >= 0) distractors.push({ text: none, why: `A matching version exists: ${headers[r]}.` });
  const all = distractors.slice(0, 3);
  const explanation = r >= 0
    ? `Java chooses the overload whose parameter list matches the arguments' number and types${types.includes("int") && overloads[r].params.some((p) => p.type === "double") ? " (an int argument can widen to a double parameter)" : ""}. For ${set.name}(${args}) that is ${headers[r]}.`
    : `No version of ${set.name} accepts (${types.join(", ")}) in that order, so the call does not compile.`;
  return choiceChallenge(g, "match-call", "overload-resolution", "Method overloading", {
    question: `These overloaded methods are in the same class. Which one runs for the call ${set.name}(${args});?`,
    blocks: [codeBlock(set.sigs.map((p) => `${sigText(set.name, p)} { ... }`).join("\n"))],
    correct: { text: correctText },
    distractors: all,
    explanation,
    checks: [check([overloadUnit(set, args)], r >= 0 ? "ok" : "error", r >= 0 ? { main: "Overloads", output: String(r) } : {})],
  });
}
function genCallForOverload(g) {
  const set = g.pick(OVERLOAD_SETS.filter((s) => s.name !== "show"));
  const overloads = set.sigs.map((p) => ({ params: p.map(([type, name]) => ({ type, name })) }));
  const target = g.int(0, overloads.length - 1);
  const resolved = set.calls.map(([a, t]) => [a, resolveOverload(t, overloads)]);
  const good = resolved.filter(([, r]) => r === target);
  if (!good.length) return null;
  const [args] = g.pick(good);
  const others = g.shuffle(resolved.filter(([, r]) => r !== target)).slice(0, 3);
  if (others.length < 3) return null;
  const header = sigText(set.name, set.sigs[target]);
  return choiceChallenge(g, "match-call", "call-for-overload", "Matching calls to overloaded signatures", {
    question: `Which call runs the version ${header}?`,
    blocks: [codeBlock(set.sigs.map((p) => `${sigText(set.name, p)} { ... }`).join("\n"))],
    correct: { text: `${set.name}(${args});`, check: check([overloadUnit(set, args)], "ok", { main: "Overloads", output: String(target) }) },
    distractors: others.map(([a, r]) => ({ text: `${set.name}(${a});`, why: r >= 0 ? `This call matches ${sigText(set.name, set.sigs[r])} instead.` : "No version accepts these arguments in this order, so this call does not compile.", check: check([overloadUnit(set, a)], r >= 0 ? "ok" : "error", r >= 0 ? { main: "Overloads", output: String(r) } : {}) })),
    explanation: `Overloaded methods share a name but differ in their parameter lists. ${set.name}(${args}) matches ${header} by number, type, and order of arguments.`,
  });
}

/* ------------------------------------------------------------------ */
/* Mode D: Organize method arguments (tap to order)                    */
/* ------------------------------------------------------------------ */
const ORDER_TASKS = [
  { name: "register", params: [["String", "name", "Name"], ["int", "age", "Age"], ["boolean", "member", "Member"]], same: false },
  { name: "addProduct", params: [["String", "name", "Product name"], ["double", "price", "Price"], ["int", "quantity", "Quantity"]], same: false },
  { name: "createCar", params: [["String", "model", "Model"], ["int", "year", "Year"], ["double", "mpg", "Miles per gallon"]], same: false },
  { name: "setPlayer", params: [["String", "name", "Name"], ["int", "level", "Level"], ["char", "team", "Team"]], same: false },
  { name: "move", params: [["int", "row", "Row"], ["int", "column", "Column"]], same: true, goal: "move the robot to row {0}, column {1}" },
  { name: "setSize", params: [["int", "width", "Width"], ["int", "height", "Height"]], same: true, goal: "make the window {0} wide and {1} tall" },
  { name: "setRange", params: [["int", "min", "Minimum"], ["int", "max", "Maximum"]], same: true, goal: "allow values from {0} up to {1}" },
  { name: "transfer", params: [["String", "fromAccount", "From account"], ["String", "toAccount", "To account"], ["double", "amount", "Amount"]], same: true, goal: "move {2} from {0} to {1}" },
  { name: "schedule", params: [["String", "day", "Day"], ["int", "hour", "Hour"], ["int", "minute", "Minute"]], same: true, goal: "book {0} at {1}:{2}" },
  { name: "drawPoint", params: [["double", "x", "x"], ["double", "y", "y"]], same: true, goal: "draw a point at x = {0}, y = {1}" },
  { name: "rename", params: [["String", "oldName", "Old name"], ["String", "newName", "New name"]], same: true, goal: "change the file name {0} to {1}" },
];
function genOrderArgs(g) {
  const t = g.pick(ORDER_TASKS);
  const vals = [];
  for (const [type] of t.params) {
    let v, tries = 0;
    do {
      const pname = t.params[vals.length][1];
      v = type === "String" ? g.pick(t.name === "schedule" ? ["Monday", "Friday", "Tuesday"] : t.name === "transfer" ? ["savings", "checking", "college", "travel"] : t.name === "rename" ? ["notes.txt", "draft.txt", "final.txt", "plan.txt"] : PARAM_VALUES[pname] || NAMES) : valueFor(g, type, pname);
    } while (vals.some((x) => x === v) && ++tries < 20);
    vals.push(v);
  }
  if (new Set(vals.map(String)).size !== vals.length) return null;
  if (t.name === "setRange" && vals[0] >= vals[1]) [vals[0], vals[1]] = [vals[1], vals[0]];
  const texts = t.params.map(([type], i) => lit(type, vals[i]));
  const goalText = t.goal ? t.goal.replace(/\{(\d)\}/g, (m, k) => texts[k]) : null;
  const tokens = texts.map((text, i) => ({ id: `a${i}`, text }));
  let decoy = null;
  if (!t.same && g.chance(0.35)) {
    const i = g.int(0, t.params.length - 1);
    const type = t.params[i][0];
    const [wt, wf] = g.pick(WRONG_LIT[type]);
    const text = wf(typeof vals[i] === "number" ? Math.round(vals[i]) : vals[i]);
    if (!texts.includes(text) && !assignable(wt, type)) decoy = { id: "d0", text, why: `${text} is ${article(wt)} ${wt}, which does not match the parameter ${type} ${t.params[i][1]}.` };
  }
  const all = g.shuffle([...tokens, ...(decoy ? [decoy] : [])]);
  if (all.slice(0, texts.length).every((tk, i) => tk.text === texts[i])) return null; // already in order
  const methodSrc = methodStub([t.name, t.params.map(([a, b]) => [a, b])]);
  const answerCall = `${t.name}(${texts.join(", ")});`;
  return {
    ...base("order-args", t.same ? "order-same-type" : decoy ? "order-with-decoy" : "order-mixed-types", t.same ? "Parameters with the same type" : "Argument order"),
    kind: "order",
    prompt: goalText ? `Goal: ${goalText}.` : `Goal: call ${t.name} with ${t.params.map(([, , label], i) => `${label.toLowerCase()} ${texts[i]}`).join(", ")}.`,
    question: `Tap the arguments in the order they belong in the call to ${t.name}.${decoy ? " One token does not belong." : ""}`,
    blocks: [codeBlock(`${sigText(t.name, t.params)}`)],
    goals: t.params.map(([type, name, label], i) => ({ label, value: texts[i], param: `${type} ${name}` })),
    method: t.name,
    tokens: all,
    answerOrder: tokens.map((tk) => tk.id),
    answerText: answerCall,
    decoy,
    explanation: `Arguments are matched to parameters by position: ${t.params.map(([type, name], i) => `${texts[i]} → ${name}`).join(", ")}.${t.same ? ` Several parameters have the same type, so the types alone cannot tell you the order — use the parameter names.` : ""}`,
    javaChecks: [check([callUnit(methodSrc, answerCall)], "ok")],
  };
}

/* ------------------------------------------------------------------ */
/* Mode E: Return types and return statements                          */
/* ------------------------------------------------------------------ */
const COMPLETE = [
  { ret: "int", name: "square", params: [["int", "number"]], good: "return number * number;", bad: [["System.out.println(number * number);", "Printing shows the value on the screen but does not return it; an int method must return an int."], ['return "number";', '"number" is a String, but the return type is int.'], ["number * number;", "An expression by itself is not a statement, and nothing is returned."], ["return;", "return; with no value is only allowed in void methods; this method must return an int."], ["return number * 2.0;", "number * 2.0 is a double; Java will not narrow a double to the int return type automatically."]] },
  { ret: "double", name: "average", params: [["double", "a"], ["double", "b"]], good: "return (a + b) / 2;", bad: [["System.out.println((a + b) / 2);", "Printing is not returning; a double method must return a double value."], ['return "average";', "A String cannot be returned from a method whose return type is double."], ["(a + b) / 2;", "This expression is not a statement, and nothing is returned."], ["return;", "A non-void method must return a value."], ["return a + b > 0;", "a + b > 0 is a boolean, which is not compatible with the double return type."]] },
  { ret: "String", name: "greeting", params: [["String", "name"]], good: 'return "Hi, " + name;', bad: [['System.out.println("Hi, " + name);', "This prints the greeting but returns nothing; a String method must return a String."], ["return name.length();", "name.length() is an int, not a String."], ['"Hi, " + name;', "An expression alone is not a statement and returns nothing."], ["return;", "A non-void method must return a value."]] },
  { ret: "char", name: "firstLetter", params: [["String", "word"]], good: "return word.charAt(0);", bad: [["return word.substring(0, 1);", "substring returns a String, not a char."], ["System.out.println(word.charAt(0));", "Printing the letter does not return it."], ["return;", "A char method must return a char value."], ['return "word";', "A String cannot be returned where a char is expected."]] },
  { ret: "boolean", name: "isEven", params: [["int", "n"]], good: "return n % 2 == 0;", bad: [["return n % 2;", "n % 2 is an int (0 or 1); a boolean method must return true or false."], ['return "true";', '"true" in quotes is a String, not a boolean.'], ["System.out.println(n % 2 == 0);", "Printing true or false is not returning it."], ["return;", "A boolean method must return a boolean value."]] },
  { ret: "int", name: "lastIndex", params: [["String", "text"]], good: "return text.length() - 1;", bad: [["return text.length() - 1.0;", "Subtracting 1.0 makes a double, which cannot be returned as an int without a cast."], ["System.out.println(text.length() - 1);", "Printing is not returning; an int must be returned."], ["text.length() - 1;", "An expression alone is not a statement."], ["return text;", "text is a String, not an int."]] },
];
function methodWith(spec, bodyLine) {
  return `public ${spec.ret} ${spec.name}(${spec.params.map(([t, n]) => `${t} ${n}`).join(", ")}) {\n    ${bodyLine}\n}`;
}
/* Complete a method generated from the shared method families */
const WRONG_RETURN = {
  int: (e) => [`return "${e}";`, `"${e}" in quotes is a String, not an int.`],
  double: (e) => [`return "${e}";`, `"${e}" in quotes is a String, not a double.`],
  boolean: (e) => [`return "${e}";`, `"${e}" in quotes is a String, not a boolean.`],
  String: (e, spec) => [`return ${spec.params.length ? spec.params.find((p) => p.type === "String") ? spec.params.find((p) => p.type === "String").name + ".length()" : "0" : "0"};`, "That value is an int, not a String."],
  char: () => ['return "A";', '"A" is a String; a char literal uses single quotes.'],
};
function genCompleteFamily(g) {
  const fams = [famCalc2, famCalc3, famPredicate, famChar, famString, famGetter, famDelegate];
  const spec = g.pick(fams)(g);
  const e = spec.returnExpr;
  const good = `return ${e};`;
  const withBody = (line) => {
    const sp = { ...spec, bodyMarked: [line.replace(/\n/g, "\n    ")] };
    const src = stripMarks(spec.className || spec.helper ? classMarked(sp) : methodMarked(sp));
    return spec.className || spec.helper ? src : wrapMethod(src);
  };
  const cls = spec.className || "Helper";
  const cands = [
    [`System.out.println(${e});`, `Printing ${e} shows it on the screen but does not return it; ${article(spec.ret)} ${spec.ret} method must return a value.`],
    ["return;", `return; with no value is allowed only in void methods; this method must return ${article(spec.ret)} ${spec.ret}.`],
    WRONG_RETURN[spec.ret](e, spec),
  ];
  if (spec.ret === "int") cands.push([`return ${e} * 1.0;`, "Multiplying by 1.0 makes a double, and Java will not narrow a double to the int return type automatically."]);
  if (!/\(/.test(e) || /[+\-*\/<>=]/.test(e)) cands.push([`${e};`, "An expression like this cannot stand alone as a Java statement (only assignments, ++/--, method calls, and new can), and nothing is returned."]);
  const bad = g.sample(cands.filter(([t]) => t !== good), 3);
  if (bad.length < 3) return null;
  const shown = spec.className || spec.helper ? classMarked({ ...spec, bodyMarked: ["???"] }) : methodMarked({ ...spec, bodyMarked: ["???"] });
  return choiceChallenge(g, "return", `complete-${spec.family.replace(/[^a-z]+/gi, "-").replace(/-+$/, "").toLowerCase()}`, "Non-void methods must return a compatible value", {
    question: `Which statement correctly completes ${spec.name}?`,
    blocks: [codeBlock(stripMarks(shown), spec.className ? `${cls}.java` : "", spec.className ? [cls] : [])],
    correct: { text: good, check: check([unit(cls, withBody(good))], "ok") },
    distractors: bad.map(([text, why]) => ({ text, why, check: check([unit(cls, withBody(text))], "error") })),
    explanation: `The return type is ${spec.ret}, so the method must return a ${spec.ret} value: ${good} Printing a value is not the same as returning it.`,
  });
}
function genCompleteReturn(g) {
  if (g.chance(0.6)) return genCompleteFamily(g);
  const s = g.pick(COMPLETE);
  const bad = g.sample(s.bad, 3);
  return choiceChallenge(g, "return", "complete-non-void", "Non-void methods must return a compatible value", {
    question: "Which statement correctly completes the method?",
    blocks: [codeBlock(methodWith(s, "???"))],
    correct: { text: s.good, check: check([unit("Helper", wrapMethod(methodWith(s, s.good)))], "ok") },
    distractors: bad.map(([text, why]) => ({ text, why, check: check([unit("Helper", wrapMethod(methodWith(s, text)))], "error") })),
    explanation: `${cap(article(s.ret))} ${s.ret} method must use return with a value compatible with ${s.ret}. ${s.good} does that; printing a value is not the same as returning it.`,
  });
}
const REQUIREMENTS = [
  { name: "isPassing", p: ["int", "score"], req: "returns true exactly when score is at least 70", good: "return score >= 70;", logic: [["return score > 70;", "score > 70 returns false when score is exactly 70, but 70 counts as passing."], ["return score <= 70;", "This is true for low scores, the opposite of the requirement."]], tests: [69, 70, 71, 100], f: (x) => x >= 70 },
  { name: "isChild", p: ["int", "age"], req: "returns true exactly when age is under 13", good: "return age < 13;", logic: [["return age <= 13;", "age <= 13 is also true for 13, which is not under 13."], ["return age > 13;", "This is true for ages above 13, the opposite of the requirement."]], tests: [12, 13, 14, 5], f: (x) => x < 13 },
  { name: "isZero", p: ["int", "count"], req: "returns true exactly when count is 0", good: "return count == 0;", logic: [["return count != 0;", "!= means not equal, the opposite of the requirement."], ["return count >= 0;", "count >= 0 is also true for 1, 2, 3, …"]], tests: [0, 1, -1, 5], f: (x) => x === 0 },
  { name: "inRange", p: ["int", "level"], req: "returns true exactly when level is from 1 to 10, inclusive", good: "return level >= 1 && level <= 10;", logic: [["return level >= 1 || level <= 10;", "|| makes this true for every level, because every number is at least 1 or at most 10."], ["return level > 1 && level < 10;", "This leaves out 1 and 10, which are inclusive."]], tests: [0, 1, 5, 10, 11], f: (x) => x >= 1 && x <= 10 },
];
function boolMethod(r, line) {
  return `public boolean ${r.name}(${r.p[0]} ${r.p[1]}) {\n    ${line}\n}`;
}
function boolRunner(r, line) {
  return unit("Checker", `public class Checker {\n${boolMethod(r, line).split("\n").map((l) => "    " + l).join("\n")}\n\n    public static void main(String[] args) {\n        Checker c = new Checker();\n        ${r.tests.map((t) => `System.out.print(c.${r.name}(${t}) + " ");`).join("\n        ")}\n    }\n}`);
}
const REQ_CONTEXTS = [
  { name: "isPassing", p: "score", kinds: ["atLeast"], range: [60, 80] },
  { name: "isChild", p: "age", kinds: ["under"], range: [10, 14] },
  { name: "needsCharge", p: "battery", kinds: ["under"], range: [15, 30] },
  { name: "isSpeeding", p: "speed", kinds: ["over"], range: [45, 70] },
  { name: "canRide", p: "height", kinds: ["atLeast"], range: [42, 54] },
  { name: "isEmpty", p: "count", kinds: ["equals"], range: [0, 0] },
  { name: "isValidLevel", p: "level", kinds: ["between"], range: [1, 10] },
  { name: "isTeen", p: "age", kinds: ["between"], range: [13, 19] },
];
function requirementFor(g) {
  const c = g.pick(REQ_CONTEXTS);
  const kind = g.pick(c.kinds);
  const k = g.int(c.range[0], c.range[1]);
  const p = c.p;
  if (kind === "atLeast") return { name: c.name, p: ["int", p], req: `returns true exactly when ${p} is at least ${k}`, good: `return ${p} >= ${k};`, logic: [[`return ${p} > ${k};`, `${p} > ${k} returns false when ${p} is exactly ${k}, but ${k} counts.`], [`return ${p} <= ${k};`, `This is true for small values, the opposite of the requirement.`]], tests: [k - 1, k, k + 1], f: (x) => x >= k };
  if (kind === "under") return { name: c.name, p: ["int", p], req: `returns true exactly when ${p} is less than ${k}`, good: `return ${p} < ${k};`, logic: [[`return ${p} <= ${k};`, `${p} <= ${k} is also true when ${p} is ${k}, which is not less than ${k}.`], [`return ${p} > ${k};`, `This is true for large values, the opposite of the requirement.`]], tests: [k - 1, k, k + 1], f: (x) => x < k };
  if (kind === "over") return { name: c.name, p: ["int", p], req: `returns true exactly when ${p} is greater than ${k}`, good: `return ${p} > ${k};`, logic: [[`return ${p} >= ${k};`, `${p} >= ${k} is also true when ${p} is exactly ${k}.`], [`return ${p} < ${k};`, `This is the opposite of the requirement.`]], tests: [k - 1, k, k + 1], f: (x) => x > k };
  if (kind === "equals") return { name: c.name, p: ["int", p], req: `returns true exactly when ${p} is 0`, good: `return ${p} == 0;`, logic: [[`return ${p} != 0;`, "!= means not equal, the opposite of the requirement."], [`return ${p} >= 0;`, `${p} >= 0 is also true for 1, 2, 3, …`]], tests: [0, 1, -1], f: (x) => x === 0 };
  const lo = c.range[0], hi = c.range[1];
  return { name: c.name, p: ["int", p], req: `returns true exactly when ${p} is from ${lo} to ${hi}, inclusive`, good: `return ${p} >= ${lo} && ${p} <= ${hi};`, logic: [[`return ${p} >= ${lo} || ${p} <= ${hi};`, `|| makes this true for every ${p}: every number is at least ${lo} or at most ${hi}.`], [`return ${p} > ${lo} && ${p} < ${hi};`, `This leaves out ${lo} and ${hi}, which are included.`]], tests: [lo - 1, lo, hi, hi + 1], f: (x) => x >= lo && x <= hi };
}
function genBooleanRequirement(g) {
  const r = g.chance(0.7) ? requirementFor(g) : g.pick(REQUIREMENTS);
  const expected = r.tests.map((t) => String(r.f(t)) + " ").join("");
  const compileBad = g.pick([
    [`if (${r.good.slice(7, -1)}) {\n        return true;\n    }`, "If the condition is false, the method reaches its end without returning a value, so it does not compile."],
    [`return "${r.good.slice(7, -1)}";`, "Quotes make this a String, not a boolean."],
  ]);
  const logic = g.pick(r.logic);
  const distractors = [
    { text: logic[0], why: logic[1], check: check([boolRunner(r, logic[0])], "ok", { main: "Checker", outputNot: expected }) },
    { text: compileBad[0], why: compileBad[1], check: check([boolRunner(r, compileBad[0])], "error") },
    { text: `System.out.println(${r.good.slice(7, -1)});`, why: "Printing true or false is not returning it; the boolean method still returns nothing.", check: check([boolRunner(r, `System.out.println(${r.good.slice(7, -1)});`)], "error") },
  ];
  return choiceChallenge(g, "return", "boolean-requirement", "Boolean return expressions", {
    question: `Which statement completes the method so it ${r.req}?`,
    blocks: [codeBlock(boolMethod(r, "???"))],
    correct: { text: r.good, check: check([boolRunner(r, r.good)], "ok", { main: "Checker", output: expected }) },
    distractors,
    explanation: `A boolean method can return the value of a comparison directly: ${r.good.slice(7, -1)} is true exactly when the requirement holds.`,
  });
}
const VOID_METHODS = [
  { code: "public void displayScore(int score) {\n    System.out.println(score);\n}", act: "prints the score" },
  { code: "public void setName(String newName) {\n    name = newName;\n}", act: "stores a new name in the instance variable name", field: "private String name;" },
  { code: "public void beep(int times) {\n    for (int i = 0; i < times; i++) {\n        System.out.println(\"Beep\");\n    }\n}", act: 'prints "Beep" the given number of times' },
];
function genVoidMeaning(g) {
  const variant = g.pick(["describe", "describe", "earlyReturn"]);
  if (variant === "earlyReturn") {
    const [mname, field, p, msg] = g.pick([["withdraw", "balance", "amount", "Not enough money"], ["useFuel", "fuel", "liters", "Tank too low"], ["spendPoints", "points", "cost", "Not enough points"], ["removeStock", "stock", "count", "Not enough items"]]);
    const type = field === "balance" || field === "fuel" ? "double" : "int";
    const code = `public void ${mname}(${type} ${p}) {\n    if (${p} > ${field}) {\n        System.out.println("${msg}");\n        return;\n    }\n    ${field} = ${field} - ${p};\n}`;
    return choiceChallenge(g, "return", "void-early-return", "return; in a void method", {
      question: "What does return; do in this void method?",
      blocks: [codeBlock(code)],
      codeChoices: false,
      correct: { text: `It ends the method right away without sending back a value, so ${field} is not changed.` },
      distractors: [
        { text: "It returns 0 to the caller.", why: "A void method never returns a value; return; just exits." },
        { text: "It causes a compile error because void methods cannot use return.", why: "return; without a value is allowed in a void method; return with a value is not." },
        { text: "It is required: every method must end with a return statement.", why: "Void methods do not need a return statement; this one uses return; only to exit early." },
      ],
      explanation: "In a void method, return; ends the method immediately. It is optional at the end of a void method and must not include a value.",
      checks: [check([unit("Account", `public class Account {\n    private ${type} ${field};\n\n${code.split("\n").map((l) => "    " + l).join("\n")}\n}`)], "ok")],
    });
  }
  let v = g.pick(VOID_METHODS);
  if (g.chance(0.6)) {
    const spec = g.pick([famSetter, famAction, famEarlyReturn])(g);
    const field = spec.classFields ? spec.classFields.map(([t, n]) => `private ${t} ${n};`).join("\n    ") : null;
    const act =
      spec.family.startsWith("mutator") ? `stores ${spec.params[0].name} in the instance variable ${spec.params[0].meaning}`
      : spec.earlyReturn ? `adds ${spec.params[0].name} to ${spec.bodyMarked[3].match(/⟦assign (\w+)/)[1]} when ${spec.params[0].name} is positive`
      : "prints a message built from its parameters";
    v = { code: stripMarks(methodMarked({ ...spec, access: "public" })), act, field, early: !!spec.earlyReturn };
  }
  const cls = `public class Example {\n${v.field ? "    " + v.field + "\n\n" : ""}${v.code.split("\n").map((l) => "    " + l).join("\n")}\n}`;
  const shownCode = v.field ? `// Instance variable${v.field.includes("\n") ? "s" : ""} in the class:\n${v.field.replace(/\n\s*/g, "\n")}\n\n${v.code}` : v.code;
  return choiceChallenge(g, "return", "void-describe", "void methods", {
    question: "Which statement accurately describes this method?",
    blocks: [codeBlock(shownCode)],
    codeChoices: false,
    correct: { text: `It ${v.act} and does not return a value.` },
    distractors: [
      { text: `It ${v.act} and returns the result to the caller.`, why: "void means the method returns no value to the caller." },
      v.early
        ? { text: "It does not compile because return; has no value.", why: "return; without a value is exactly what a void method may use to exit early." }
        : { text: "It does not compile because it has no return statement.", why: "A void method does not need a return statement." },
      { text: "void means the method cannot have parameters.", why: "void describes the return type only; void methods can have any parameters." },
    ],
    explanation: `void is the declared return type: the method performs an action and returns nothing.${v.early ? " return; may be used to exit a void method early." : " A return statement is not required at the end of a void method."}`,
    checks: [check([unit("Example", cls)], "ok")],
  });
}
const PATHS = [
  {
    gen: "classify",
    code: "public int classify(int value) {\n    if (value > 0) {\n        return 1;\n    }\n}",
    good: ["Add return 0; after the if statement.", "public int classify(int value) {\n    if (value > 0) {\n        return 1;\n    }\n    return 0;\n}"],
    bad: [
      ["Add return; after the if statement.", "public int classify(int value) {\n    if (value > 0) {\n        return 1;\n    }\n    return;\n}", "return; has no value, which is not allowed in an int method."],
      ["Change the return type from int to void.", "public void classify(int value) {\n    if (value > 0) {\n        return 1;\n    }\n}", "A void method cannot return 1."],
      ['Add else { System.out.println(0); } after the if.', "public int classify(int value) {\n    if (value > 0) {\n        return 1;\n    } else {\n        System.out.println(0);\n    }\n}", "The else path prints but still returns nothing."],
      ["Change return 1; to return value;.", "public int classify(int value) {\n    if (value > 0) {\n        return value;\n    }\n}", "The path where value is not positive still has no return."],
    ],
    why: "When value is 0 or negative the if is skipped and the method would end without returning an int.",
  },
  {
    gen: "else-if",
    code: 'public String letter(int score) {\n    if (score >= 90) {\n        return "A";\n    } else if (score >= 80) {\n        return "B";\n    }\n}',
    good: ['Add return "C"; after the if/else-if.', 'public String letter(int score) {\n    if (score >= 90) {\n        return "A";\n    } else if (score >= 80) {\n        return "B";\n    }\n    return "C";\n}'],
    bad: [
      ["Add else { return 'C'; } at the end.", "public String letter(int score) {\n    if (score >= 90) {\n        return \"A\";\n    } else if (score >= 80) {\n        return \"B\";\n    } else {\n        return 'C';\n    }\n}", "'C' is a char, not a String."],
      ["Add return; at the end.", 'public String letter(int score) {\n    if (score >= 90) {\n        return "A";\n    } else if (score >= 80) {\n        return "B";\n    }\n    return;\n}', "A String method must return a String value."],
      ["Change String to void.", 'public void letter(int score) {\n    if (score >= 90) {\n        return "A";\n    } else if (score >= 80) {\n        return "B";\n    }\n}', "A void method cannot return \"A\" or \"B\"."],
      ['Add System.out.println("C"); at the end.', 'public String letter(int score) {\n    if (score >= 90) {\n        return "A";\n    } else if (score >= 80) {\n        return "B";\n    }\n    System.out.println("C");\n}', "Printing does not return a value; a score below 80 still has no return."],
    ],
    why: "A score below 80 skips both branches, so the method needs a String returned on that path too.",
  },
  {
    gen: "loop",
    code: "public int findFirstNegative(int[] values) {\n    for (int i = 0; i < values.length; i++) {\n        if (values[i] < 0) {\n            return i;\n        }\n    }\n}",
    good: ["Add return -1; after the loop.", "public int findFirstNegative(int[] values) {\n    for (int i = 0; i < values.length; i++) {\n        if (values[i] < 0) {\n            return i;\n        }\n    }\n    return -1;\n}"],
    bad: [
      ["Add return i; after the loop.", "public int findFirstNegative(int[] values) {\n    for (int i = 0; i < values.length; i++) {\n        if (values[i] < 0) {\n            return i;\n        }\n    }\n    return i;\n}", "i only exists inside the for loop, so it cannot be used after the loop."],
      ["Add return; after the loop.", "public int findFirstNegative(int[] values) {\n    for (int i = 0; i < values.length; i++) {\n        if (values[i] < 0) {\n            return i;\n        }\n    }\n    return;\n}", "An int method must return an int value."],
      ['Add System.out.println("none"); after the loop.', "public int findFirstNegative(int[] values) {\n    for (int i = 0; i < values.length; i++) {\n        if (values[i] < 0) {\n            return i;\n        }\n    }\n    System.out.println(\"none\");\n}", "Printing does not return an int; the path with no negatives still returns nothing."],
    ],
    why: "If no value is negative, the loop finishes and the method reaches its end without returning an int.",
  },
];
/* Parameterized variants of the PATHS shapes (names, thresholds, values) */
function pathCase(g) {
  const shape = g.pick(["classify", "else-if", "loop"]);
  if (shape === "classify") {
    const [name, v, cmp] = g.pick([["classify", "value", "> 0"], ["checkTemp", "degrees", `> ${g.pick([32, 50, 90])}`], ["rateSpeed", "speed", `>= ${g.pick([25, 55, 65])}`], ["scoreBonus", "points", `>= ${g.pick([50, 100])}`]]);
    const r1 = g.pick([1, 10, 5]), r0 = g.pick([0, -1]);
    const head = `public int ${name}(int ${v}) {`;
    const iff = (inner) => `    if (${v} ${cmp}) {
        ${inner}
    }`;
    const base = `${head}
${iff(`return ${r1};`)}`;
    return {
      gen: "classify",
      code: `${base}
}`,
      good: [`Add return ${r0}; after the if statement.`, `${base}
    return ${r0};
}`],
      bad: [
        ["Add return; after the if statement.", `${base}
    return;
}`, "return; has no value, which is not allowed in an int method."],
        ["Change the return type from int to void.", `${head.replace("int " + name, "void " + name)}
${iff(`return ${r1};`)}
}`, `A void method cannot return ${r1}.`],
        [`Add else { System.out.println(${r0}); } after the if.`, `${head}
${iff(`return ${r1};`)} else {
        System.out.println(${r0});
    }
}`, "The else path prints but still returns nothing."],
        [`Change return ${r1}; to return ${v};.`, `${head}
${iff(`return ${v};`)}
}`, "The path where the condition is false still has no return."],
      ],
      why: `When ${v} ${cmp} is false the if is skipped and the method would end without returning an int.`,
    };
  }
  if (shape === "else-if") {
    const a = g.pick([90, 85, 92]),
      b = a - 10;
    const [name, v] = g.pick([["letter", "score"], ["rank", "points"], ["tier", "xp"]]);
    const head = `public String ${name}(int ${v}) {`;
    const body = `    if (${v} >= ${a}) {
        return "A";
    } else if (${v} >= ${b}) {
        return "B";
    }`;
    return {
      gen: "else-if",
      code: `${head}
${body}
}`,
      good: ['Add return "C"; after the if/else-if.', `${head}
${body}
    return "C";
}`],
      bad: [
        ["Add else { return 'C'; } at the end.", `${head}
${body.slice(0, -1)}} else {
        return 'C';
    }
}`, "'C' is a char, not a String."],
        ["Add return; at the end.", `${head}
${body}
    return;
}`, "A String method must return a String value."],
        ["Change String to void.", `${head.replace("String " + name, "void " + name)}
${body}
}`, 'A void method cannot return "A" or "B".'],
        ['Add System.out.println("C"); at the end.', `${head}
${body}
    System.out.println("C");
}`, `Printing does not return a value; a ${v} below ${b} still has no return.`],
      ],
      why: `A ${v} below ${b} skips both branches, so the method needs a String returned on that path too.`,
    };
  }
  const [name, cond, extra] = g.pick([["findFirstNegative", "values[i] < 0", ""], ["findFirstEven", "values[i] % 2 == 0", ""], ["indexOf", "values[i] == target", ", int target"]]);
  const head = `public int ${name}(int[] values${extra}) {`;
  const loop = `    for (int i = 0; i < values.length; i++) {
        if (${cond}) {
            return i;
        }
    }`;
  return {
    gen: "loop",
    code: `${head}
${loop}
}`,
    good: ["Add return -1; after the loop.", `${head}
${loop}
    return -1;
}`],
    bad: [
      ["Add return i; after the loop.", `${head}
${loop}
    return i;
}`, "i only exists inside the for loop, so it cannot be used after the loop."],
      ["Add return; after the loop.", `${head}
${loop}
    return;
}`, "An int method must return an int value."],
      ['Add System.out.println("none"); after the loop.', `${head}
${loop}
    System.out.println("none");
}`, "Printing does not return an int; the path where nothing matches still returns nothing."],
    ],
    why: "If no element matches, the loop finishes and the method reaches its end without returning an int.",
  };
}
function genReturnPaths(g) {
  const p = g.chance(0.75) ? pathCase(g) : g.pick(PATHS);
  const bad = g.sample(p.bad, 3);
  return choiceChallenge(g, "return", `all-paths-${p.gen}`, "Return on every path", {
    question: "This method does not compile. Which change fixes it?",
    blocks: [codeBlock(p.code)],
    codeChoices: false,
    correct: { text: p.good[0], check: check([unit("Helper", wrapMethod(p.good[1]))], "ok") },
    distractors: bad.map(([text, src, why]) => ({ text, why, check: check([unit("Helper", wrapMethod(src))], "error") })),
    explanation: `${p.why} A non-void method must return a compatible value on every path that can reach the end of the method; it does not need a return on its last line if every path already returns.`,
    checks: [check([unit("Helper", wrapMethod(p.code))], "error")],
  });
}

/* ------------------------------------------------------------------ */
/* Mode F: Constructors and object creation                            */
/* ------------------------------------------------------------------ */
const varName = (cls) => cls[0].toLowerCase() + cls.slice(1).replace(/[A-Z].*/, "") || "obj";
function mainUnit(body) {
  return unit("Main", `public class Main {\n    public static void main(String[] args) {\n        ${body}\n    }\n}`);
}
function genCreateObject(g) {
  let k = constructorClass(g, { nFields: g.int(2, 3) });
  if (k.access !== "public") k = constructorClass(g, { nFields: 2 });
  if (k.access !== "public") return null;
  const vals = k.params.map((p) => valueFor(g, p.type, p.field));
  const args = k.params.map((p, i) => lit(p.type, vals[i]));
  const v = varName(k.cls);
  const stmt = (a, { newKw = true, cls = k.cls } = {}) => `${k.cls} ${v} = ${newKw ? "new " : ""}${cls}(${a.join(", ")});`;
  const desc = k.params.map((p, i) => `${p.meaning} ${args[i]}`).join(" and ");
  const cands = [];
  for (let i = 0; i + 1 < k.params.length; i++)
    if (!assignable(k.params[i + 1].type, k.params[i].type) || !assignable(k.params[i].type, k.params[i + 1].type)) {
      const a = args.slice();
      [a[i], a[i + 1]] = [a[i + 1], a[i]];
      cands.push({ text: stmt(a), why: `The arguments must follow the constructor's parameter order: ${k.params.map((p) => `${p.type} ${p.name}`).join(", ")}.` });
      break;
    }
  cands.push({ text: stmt(args, { newKw: false }), why: "Creating an object requires the keyword new before the constructor call." });
  cands.push({ text: stmt(args.slice(0, -1)), why: `The only constructor needs ${k.params.length} arguments, so a call with ${k.params.length - 1} does not match.` });
  cands.push({ text: stmt([]), why: `Java supplies a default no-argument constructor only when a class declares no constructors. ${k.cls} declares one with parameters, so new ${k.cls}() does not compile.` });
  cands.push({ text: stmt(args, { cls: k.cls.toLowerCase() }), why: `The constructor name must match the class name exactly, including capitalization: ${k.cls}.` });
  const d = g.shuffle(cands.slice(1));
  const distractors = [...cands.slice(0, 1).filter((c) => /order/.test(c.why)), ...d].slice(0, 3);
  return choiceChallenge(g, "constructors", "create-object", "Constructor calls with new", {
    question: `Which statement creates ${article(k.cls)} ${k.cls} with ${desc}?`,
    blocks: [{ label: `${k.cls}.java`, model: k.model }],
    correct: { text: stmt(args), check: check([unit(k.cls, k.source), mainUnit(stmt(args))], "ok") },
    distractors: distractors.map((c) => ({ ...c, check: check([unit(k.cls, k.source), mainUnit(c.text)], "error") })),
    explanation: `Use new, the class name, and arguments in the same order and types as the constructor's parameters: new ${k.cls}(${args.join(", ")}).`,
  });
}
const CTOR_SETS = [
  { cls: "Car", sigs: [[], [["String", "model"]], [["String", "model"], ["int", "year"]]], calls: [["", []], ['"Civic"', ["String"]], ['"Civic", 2021', ["String", "int"]], ["2021", ["int"]], ['2021, "Civic"', ["int", "String"]]] },
  { cls: "Pizza", sigs: [[["String", "size"]], [["String", "size"], ["int", "toppings"]], [["int", "slices"]]], calls: [['"large"', ["String"]], ['"large", 3', ["String", "int"]], ["8", ["int"]], ["", []]] },
  { cls: "Timer", sigs: [[], [["int", "seconds"]], [["int", "minutes"], ["int", "seconds"]]], calls: [["", []], ["30", ["int"]], ["2, 30", ["int", "int"]], ["1.5", ["double"]]] },
  { cls: "Badge", sigs: [[["String", "name"]], [["String", "name"], ["char", "level"]], [["String", "name"], ["double", "points"]]], calls: [['"Lena"', ["String"]], ["\"Lena\", 'B'", ["String", "char"]], ['"Lena", 9.5', ["String", "double"]], ['"Lena", 7', ["String", "int"]]] },
];
function ctorSetSource(set) {
  const ctors = set.sigs.map((p, i) => `    public ${set.cls}(${p.map(([t, n]) => `${t} ${n}`).join(", ")}) {\n        System.out.println("${i}");\n    }`).join("\n\n");
  return `public class ${set.cls} {\n${ctors}\n}`;
}
function genWhichConstructor(g) {
  const set = g.pick(CTOR_SETS);
  const [args, types] = g.pick(set.calls);
  const overloads = set.sigs.map((p) => ({ params: p.map(([type, name]) => ({ type, name })) }));
  const r = resolveOverload(types, overloads);
  if (r === -2) return null;
  const headers = set.sigs.map((p) => `public ${set.cls}(${p.map(([t, n]) => `${t} ${n}`).join(", ")})`);
  const none = "None of them: the statement does not compile";
  const correctText = r >= 0 ? headers[r] : none;
  const why = (i) => {
    const p = overloads[i].params;
    if (p.length !== types.length) return `This constructor has ${p.length} parameter${p.length === 1 ? "" : "s"}, but the call passes ${types.length} argument${types.length === 1 ? "" : "s"}.`;
    if (!applicable(types, p)) return `The argument types (${types.join(", ")}) do not match this constructor's parameters (${p.map((x) => x.type).join(", ")}).`;
    return `This constructor also accepts the arguments, but Java chooses the most specific one: ${correctText}.`;
  };
  const distractors = headers.filter((h) => h !== correctText).map((h) => ({ text: h, why: why(headers.indexOf(h)) }));
  if (r >= 0) distractors.push({ text: none, why: `${headers[r]} matches the arguments, so the statement compiles.` });
  const stmt = `${set.cls} item = new ${set.cls}(${args});`;
  return choiceChallenge(g, "constructors", "which-constructor", "Constructor overloading", {
    question: `Which constructor runs for ${stmt}`,
    blocks: [codeBlock(headers.map((h) => `${h} { ... }`).join("\n"), `${set.cls}.java`)],
    correct: { text: correctText },
    distractors: distractors.slice(0, 3),
    explanation: r >= 0 ? `Constructors can be overloaded like methods. Java runs the constructor whose parameters match the arguments (${args || "none"}) in number, type, and order: ${headers[r]}.` : `No ${set.cls} constructor accepts (${types.join(", ")}), so the statement does not compile.`,
    checks: [check([unit(set.cls, ctorSetSource(set)), mainUnit(stmt)], r >= 0 ? "ok" : "error", r >= 0 ? { main: "Main", output: String(r) } : {})],
  });
}
function genIsConstructor(g) {
  const c = g.pick(CTOR_CLASSES);
  const [type, field, , pname] = g.pick(c.fields);
  const good = `public ${c.cls}(${type} ${pname})`;
  const cands = [
    { text: `public void ${c.cls}(${type} ${pname})`, why: "This declares a return type (void), so it is an ordinary method that happens to share the class name." },
    { text: `public ${c.cls.toLowerCase()}(${type} ${pname})`, why: `A constructor's name must match the class name exactly; ${c.cls.toLowerCase()} is not ${c.cls}.` },
    { text: `public ${type} ${c.cls}()`, why: `This declares the return type ${type}, so it is a method, not a constructor.` },
    { text: `public ${c.cls} create${c.cls}(${type} ${pname})`, why: `This is a method named create${c.cls} that returns ${article(c.cls)} ${c.cls}; constructors have no return type and use the class name.` },
  ];
  const body = (h) => (h.includes(`${type} ${c.cls}()`) ? `return ${DEFAULTS[type]};` : h.includes("create") ? "return null;" : "");
  const classWith = (h) => unit(c.cls, `public class ${c.cls} {\n    private ${type} ${field};\n\n    ${h} {\n        ${body(h)}\n    }\n\n    public static void main(String[] args) {\n        ${c.cls} x = new ${c.cls}(${lit(type, randomValue(g, type))});\n    }\n}`);
  return choiceChallenge(g, "constructors", "is-constructor", "Constructor vs. method", {
    question: `Which header declares a constructor for the class ${c.cls}?`,
    correct: { text: good, check: check([classWith(good)], "ok") },
    distractors: [cands[0], ...g.sample(cands.slice(1), 2)].map((d) => ({ ...d, check: check([classWith(d.text)], "error") })),
    explanation: `A constructor uses the class's exact name and has no return type, not even void: ${good}.`,
  });
}

/* ------------------------------------------------------------------ */
/* Mode G: Method calls and returned values                            */
/* ------------------------------------------------------------------ */
const jint = (x) => Math.trunc(x);
function valueChallenge(g, generator, concept, { code, question, correct, wrong, explanation, mainBody, classBody, classFiles }) {
  // correct: {text, raw} ; wrong: [{text, why}] (>=3 candidates, distinct)
  const seen = new Set([correct.text]);
  const ds = [];
  for (const w of wrong) if (!seen.has(w.text)) {
      seen.add(w.text);
      ds.push(w);
    }
  if (ds.length < 3) return null;
  const files = classFiles || [unit("Demo", `public class Demo {\n${classBody}\n\n    public static void main(String[] args) {\n        Demo d = new Demo();\n        ${mainBody}\n    }\n}`)];
  return choiceChallenge(g, "returned-values", generator, concept, {
    question,
    blocks: [codeBlock(code)],
    correct: { text: correct.text },
    distractors: g.shuffle(ds.slice(0, 4)).slice(0, 3),
    explanation,
    checks: [check(files, "ok", { main: files[files.length - 1].name.replace(".java", ""), output: correct.raw })],
  });
}
const indent4 = (src) => src.split("\n").map((l) => "    " + l).join("\n");
const ARITH = [
  { name: "addBonus", params: ["score"], expr: (a) => `${a[0]} + 5`, f: (a) => a[0] + 5, alt: [(a) => [a[0], "The method returns score + 5, not the argument unchanged."], (a) => [a[0] * 5, "The method adds 5; it does not multiply by 5."], () => [5, "score receives the argument value, so the bonus is added to it."]] },
  { name: "subtract", params: ["a", "b"], expr: () => "a - b", f: (a) => a[0] - a[1], alt: [(a) => [a[1] - a[0], "The first argument goes into a and the second into b, so the result is a - b, not b - a."], (a) => [a[0] + a[1], "The method subtracts; it does not add."], (a) => [a[0], "Both parameters are used: a - b."]] },
  { name: "average", params: ["x", "y"], expr: () => "(x + y) / 2", f: (a) => jint((a[0] + a[1]) / 2), alt: [(a) => [(a[0] + a[1]) / 2, "x, y, and 2 are all ints, so / does integer division and drops the remainder.", true], (a) => [a[0] + jint(a[1] / 2), "Parentheses make x + y happen first, before dividing by 2."], (a) => [a[0] + a[1], "The sum is divided by 2 before it is returned."]] },
  { name: "area", params: ["width", "height"], expr: () => "width * height", f: (a) => a[0] * a[1], alt: [(a) => [2 * (a[0] + a[1]), "That is the perimeter; the method multiplies width by height."], (a) => [a[0] + a[1], "The method multiplies; it does not add."], (a) => [a[0] * a[0], "height receives the second argument, so the result is width * height."]] },
  { name: "leftover", params: ["items", "groupSize"], expr: () => "items % groupSize", f: (a) => a[0] % a[1], alt: [(a) => [jint(a[0] / a[1]), "% gives the remainder after division, not the quotient."], (a) => [a[0] - a[1], "% is the remainder operator, not subtraction."], (a) => [a[1], "The remainder of items divided by groupSize is computed, not groupSize itself."]] },
  { name: "scoreFor", params: ["hits", "misses"], expr: () => "hits * 10 - misses", f: (a) => a[0] * 10 - a[1], alt: [(a) => [a[0] * (10 - a[1]), "Multiplication happens before subtraction: hits * 10 is computed first."], (a) => [a[1] * 10 - a[0], "hits receives the first argument and misses the second."], (a) => [a[0] * 10, "misses is subtracted after multiplying."]] },
];
function genArith(g) {
  const t = g.pick(ARITH);
  let a = t.params.map(() => g.int(2, 15));
  if (t.name === "leftover") a = [g.int(10, 30), g.int(3, 7)];
  if (t.name === "average" && (a[0] + a[1]) % 2 === 0) a[1]++;
  if (t.name === "subtract" && a[0] === a[1]) a[0] += 3;
  const res = t.f(a);
  const header = `public int ${t.name}(${t.params.map((p) => `int ${p}`).join(", ")})`;
  const method = `${header} {\n    return ${t.expr(t.params)};\n}`;
  const call = `${t.name}(${a.join(", ")})`;
  const wrong = t.alt.map((f) => {
    const [v, why, dbl] = f(a);
    return { text: dbl ? javaDouble(v) : String(v), why };
  });
  wrong.push({ text: String(res + 1), why: "This is one more than the result; substitute each argument for its parameter and recompute." });
  return valueChallenge(g, `value-${t.name}`, t.name === "average" ? "Integer division in a returned value" : "Arguments become parameter values", {
    code: method,
    question: `What value is returned by ${call}?`,
    correct: { text: String(res), raw: String(res) },
    wrong,
    explanation: `In the call ${call}, ${t.params.map((p, i) => `${p} = ${a[i]}`).join(" and ")}, so the method returns ${t.expr(t.params).replace(/\b[a-z]\w*\b/gi, (w) => (t.params.includes(w) ? String(a[t.params.indexOf(w)]) : w))} = ${res}.`,
    classBody: indent4(method),
    mainBody: `System.out.println(d.${call});`,
  });
}
function genHalf(g) {
  const n = g.int(3, 19) | 1;
  const method = "public double half(int n) {\n    return n / 2;\n}";
  const res = javaDouble(jint(n / 2));
  return valueChallenge(g, "value-int-division-double", "Return type vs. expression type", {
    code: method,
    question: `What value is returned by half(${n})?`,
    correct: { text: res, raw: res },
    wrong: [
      { text: javaDouble(n / 2), why: "n and 2 are both ints, so n / 2 is integer division. The int result is then widened to a double." },
      { text: String(jint(n / 2)), why: "The return type is double, so the int result is widened and returned as a double value." },
      { text: javaDouble(jint(n / 2) + 1), why: "Integer division truncates toward zero; it does not round up." },
    ],
    explanation: `n / 2 uses integer division (${n} / 2 = ${jint(n / 2)}), and only then is the result converted to the double return type: ${res}.`,
    classBody: indent4(method),
    mainBody: `System.out.println(d.half(${n}));`,
  });
}
function genConcat(g) {
  const a = g.int(2, 9),
    b = g.int(2, 9);
  const variant = g.pick(["labelFirst", "numbersFirst"]);
  if (variant === "labelFirst") {
    const label = g.pick(["Score: ", "Total: ", "Lap "]);
    const method = "public String report(String label, int a, int b) {\n    return label + a + b;\n}";
    const res = `${label}${a}${b}`;
    return valueChallenge(g, "value-string-concat", "String results", {
      code: method,
      question: `What value is returned by report("${label}", ${a}, ${b})?`,
      correct: { text: JSON.stringify(res), raw: res },
      wrong: [
        { text: JSON.stringify(`${label}${a + b}`), why: `Evaluation goes left to right: label + a is a String, so + b joins another digit instead of adding.` },
        { text: JSON.stringify(`${a}${b}`), why: "The label is part of the returned String." },
        { text: JSON.stringify(`${label}${a} ${b}`), why: "+ joins the values with no extra space." },
      ],
      explanation: `${JSON.stringify(label)} + ${a} gives ${JSON.stringify(label + a)}, and adding ${b} to a String joins it: ${JSON.stringify(res)}.`,
      classBody: indent4(method),
      mainBody: `System.out.println(d.report("${label}", ${a}, ${b}));`,
    });
  }
  const unitTxt = g.pick(["pts", " points", "kg"]);
  const method = "public String withUnits(int a, int b, String units) {\n    return a + b + units;\n}";
  const res = `${a + b}${unitTxt}`;
  return valueChallenge(g, "value-string-concat-numbers-first", "String results", {
    code: method,
    question: `What value is returned by withUnits(${a}, ${b}, "${unitTxt}")?`,
    correct: { text: JSON.stringify(res), raw: res },
    wrong: [
      { text: JSON.stringify(`${a}${b}${unitTxt}`), why: "a + b is computed first, and both are ints, so it is addition; only then is the String joined." },
      { text: String(a + b), why: "The return type is String and units is joined to the sum." },
      { text: JSON.stringify(`${unitTxt}${a + b}`), why: "The sum comes first in a + b + units." },
    ],
    explanation: `Left to right: ${a} + ${b} = ${a + b} (int addition), then ${a + b} + ${JSON.stringify(unitTxt)} joins into ${JSON.stringify(res)}.`,
    classBody: indent4(method),
    mainBody: `System.out.println(d.withUnits(${a}, ${b}, "${unitTxt}"));`,
  });
}
function genNestedCall(g) {
  const k = g.int(2, 4),
    c = g.int(1, 6),
    n = g.int(2, 9);
  const helper = { 2: "twice", 3: "triple", 4: "quadruple" }[k];
  const code = `public int ${helper}(int n) {\n    return n * ${k};\n}\n\npublic int bonus(int n) {\n    return ${helper}(n) + ${c};\n}`;
  const res = n * k + c;
  return valueChallenge(g, "value-nested-call", "Methods that call other methods", {
    code,
    question: `What value is returned by bonus(${n})?`,
    correct: { text: String(res), raw: String(res) },
    wrong: [
      { text: String(n * k), why: `bonus adds ${c} to the value returned by ${helper}(n).` },
      { text: String((n + c) * k), why: `${helper}(n) is called first with n = ${n}; ${c} is added to its returned value afterward.` },
      { text: String(n + c), why: `bonus uses the value returned by ${helper}(n), which is n * ${k}.` },
      { text: String(n * k * c), why: `The returned value of ${helper}(n) is added to ${c}, not multiplied.` },
    ],
    explanation: `${helper}(${n}) returns ${n * k}; bonus then returns ${n * k} + ${c} = ${res}.`,
    classBody: indent4(code),
    mainBody: `System.out.println(d.bonus(${n}));`,
  });
}
function genAssignUse(g) {
  const x = g.int(3, 20),
    add = g.int(2, 9),
    m = g.int(2, 3);
  const method = `public int addBonus(int score) {\n    return score + ${add};\n}`;
  const op = g.pick(["*", "-", "+"]);
  const apply = (v) => (op === "*" ? v * m : op === "-" ? v - m : v + m);
  const snippet = `int total = addBonus(${x});\ntotal = total ${op} ${m};`;
  const res = apply(x + add);
  return valueChallenge(g, "value-assign-result", "Using a returned value", {
    code: `${method}\n\n// In another method of the same class:\n${snippet}`,
    question: "What is the value of total after these two statements run?",
    correct: { text: String(res), raw: String(res) },
    wrong: [
      { text: String(x + add), why: "The second statement changes total after it receives the returned value." },
      { text: String(apply(x) + add), why: `addBonus(${x}) runs first and returns ${x + add}; the second statement then uses that value.` },
      { text: String(apply(x)), why: "total starts as the value returned by addBonus, not the argument." },
      { text: String(apply(add)), why: `total holds the returned value ${x + add}, not just the bonus.` },
    ],
    explanation: `addBonus(${x}) returns ${x + add}, which is stored in total; then total ${op} ${m} = ${res}.`,
    classBody: indent4(method),
    mainBody: `int total = d.addBonus(${x});\n        total = total ${op} ${m};\n        System.out.println(total);`,
  });
}
function genPrintVsReturn(g) {
  const n = g.int(2, 12);
  const method = "public int show(int n) {\n    System.out.println(n * 2);\n    return n + 1;\n}";
  return valueChallenge(g, "value-print-vs-return", "Return versus print", {
    code: `${method}\n\n// In another method of the same class:\nint result = show(${n});`,
    question: "What value is stored in result?",
    correct: { text: String(n + 1), raw: `${n * 2}\n${n + 1}` },
    wrong: [
      { text: String(n * 2), why: `${n * 2} is printed, not returned. Only the value after return is stored in result.` },
      { text: String(n), why: "The method returns n + 1, not the argument itself." },
      { text: String(n * 2 + 1), why: "The printed value and the returned value are computed separately from n." },
    ],
    explanation: `show prints ${n * 2} but returns n + 1 = ${n + 1}; only the returned value is assigned to result.`,
    classBody: indent4(method),
    mainBody: `int result = d.show(${n});\n        System.out.println(result);`,
  });
}
function genPrimitiveParam(g) {
  const s = g.int(2, 20),
    add = g.pick([5, 10, 3]);
  const method = `public void addPoints(int value) {\n    value = value + ${add};\n}`;
  return valueChallenge(g, "value-primitive-parameter", "Parameters receive copies of primitive arguments", {
    code: `${method}\n\n// In another method of the same class:\nint score = ${s};\naddPoints(score);\nSystem.out.println(score);`,
    question: "What is printed?",
    correct: { text: String(s), raw: String(s) },
    wrong: [
      { text: String(s + add), why: "The parameter value is a copy of score. Changing value inside the method does not change the caller's score." },
      { text: String(add), why: "score keeps its own value; the method changes only its parameter." },
      { text: "0", why: "Calling a void method does not reset the caller's variable." },
    ],
    explanation: `An int argument is copied into the parameter value. value becomes ${s + add} inside addPoints, but score in the caller is still ${s}.`,
    classBody: indent4(method),
    mainBody: `int score = ${s};\n        d.addPoints(score);\n        System.out.println(score);`,
  });
}
function genBooleanCalls(g) {
  const t = g.pick([
    { name: "isTeen", p: "age", expr: "age >= 13 && age <= 19", f: (x) => x >= 13 && x <= 19, vals: [12, 13, 19, 20, 9, 25] },
    { name: "canVote", p: "age", expr: "age >= 18", f: (x) => x >= 18, vals: [16, 17, 18, 12] },
    { name: "isCold", p: "degrees", expr: "degrees < 50", f: (x) => x < 50, vals: [49, 50, 51, 70] },
  ]);
  const yes = t.vals.filter(t.f),
    no = t.vals.filter((v) => !t.f(v));
  const want = g.chance(0.5);
  const goodPool = want ? yes : no,
    badPool = want ? no : yes;
  if (!goodPool.length || badPool.length < 3) return null;
  const good = g.pick(goodPool);
  const method = `public boolean ${t.name}(int ${t.p}) {\n    return ${t.expr};\n}`;
  return choiceChallenge(g, "returned-values", "value-boolean-call", "Boolean returns", {
    question: `Which call returns ${want}?`,
    blocks: [codeBlock(method)],
    correct: { text: `${t.name}(${good})` },
    distractors: g.sample(badPool, 3).map((v) => ({ text: `${t.name}(${v})`, why: `With ${t.p} = ${v}, ${t.expr} is ${!want}.` })),
    explanation: `Substitute the argument for ${t.p}: ${t.expr.replace(new RegExp(`\\b${t.p}\\b`, "g"), good)} is ${want}.`,
    checks: [check([unit("Demo", `public class Demo {\n${indent4(method)}\n\n    public static void main(String[] args) {\n        Demo d = new Demo();\n        System.out.print(d.${t.name}(${good}));\n    }\n}`)], "ok", { main: "Demo", output: String(want) })],
  });
}

/* ------------------------------------------------------------------ */
/* Mode H: Fix the method or constructor                               */
/* Each case lists the buggy files and four edits; each edit produces   */
/* complete files so the JVM test can confirm exactly one compiles.     */
/* ------------------------------------------------------------------ */
function fixChallenge(g, generator, concept, { files, shown, question, good, bad, explanation }) {
  // files: {name: source} buggy; good/bad: {text, files:{name: source}, why}
  const toUnits = (fs) => Object.entries(fs).map(([n, s]) => unit(n, s));
  return choiceChallenge(g, "fix", generator, concept, {
    question: question || "Which change fixes the error?",
    blocks: shown.map(([label, code, types = []]) => codeBlock(code, label, types)),
    codeChoices: false,
    correct: { text: good.text, check: check(toUnits(good.files), "ok") },
    distractors: g.sample(bad, 3).map((b) => ({ text: b.text, why: b.why, check: check(toUnits(b.files), "error") })),
    explanation,
    checks: [check(toUnits(files), "error")],
  });
}
const pick2 = (g, arr) => g.pick(arr);
function fixCases(g) {
  const cases = [];
  // 1. Wrong method name in a call (case-sensitive)
  cases.push(() => {
    const [cls, field, type, val] = pick2(g, [["Player", "score", "int", "0"], ["Robot", "battery", "int", "100"], ["Product", "price", "double", "9.99"], ["Song", "title", "String", '"Echo"'], ["Team", "wins", "int", "3"], ["Thermostat", "target", "double", "70.5"], ["Pet", "name", "String", '"Rex"']]);
    const getter = `get${cap(field)}`;
    const wrong = g.pick([getter.toLowerCase(), field, `Get${cap(field)}`, `${getter}s`]);
    const C = (m) => `public class ${cls} {\n    private ${type} ${field} = ${val};\n\n    public ${type} ${getter}() {\n        return ${field};\n    }\n}`;
    const M = (call) => `public class Main {\n    public static void main(String[] args) {\n        ${cls} item = new ${cls}();\n        ${type} value = ${call};\n    }\n}`;
    const bugM = M(`item.${wrong}()`);
    return fixChallenge(g, "fix-method-name", "Wrong method name", {
      files: { [cls]: C(), Main: bugM },
      shown: [[`${cls}.java`, C(), [cls]], ["Main.java", bugM, [cls]]],
      good: { text: `In Main, change ${wrong} to ${getter}.`, files: { [cls]: C(), Main: M(`item.${getter}()`) } },
      bad: [
        { text: `Change ${getter}'s return type to void.`, files: { [cls]: C().replace(`public ${type} ${getter}`, `public void ${getter}`), Main: bugM }, why: "The call still uses the wrong name, and a void method cannot return a value." },
        { text: `Make ${getter} private.`, files: { [cls]: C().replace(`public ${type} ${getter}`, `private ${type} ${getter}`), Main: bugM }, why: "Making it private would also block Main; the real problem is the misspelled name." },
        { text: `In Main, add an argument: item.${wrong}(0).`, files: { [cls]: C(), Main: M(`item.${wrong}(0)`) }, why: `There is still no method named ${wrong}, and ${getter} takes no arguments.` },
        { text: `In Main, write ${cls}.${wrong}() instead.`, files: { [cls]: C(), Main: M(`${cls}.${wrong}()`) }, why: "The name is still misspelled, and an instance method is called on an object." },
      ],
      explanation: `A call must use the declared method name exactly (Java names are case-sensitive). The method is ${getter}, not ${wrong}.`,
    });
  });
  // 2. Argument order in a call
  cases.push(() => {
    const [name, p1, p2, v1, v2] = pick2(g, [["setPlayer", ["String", "name"], ["int", "score"], `"${g.pick(NAMES)}"`, String(g.int(5, 99))], ["addItem", ["String", "item"], ["double", "price"], `"${g.pick(["Pen", "Ruler", "Glue"])}"`, g.pick(["1.5", "2.25", "0.99"])], ["setGrade", ["char", "letter"], ["int", "points"], `'${g.pick(["A", "B", "C"])}'`, String(g.int(70, 99))], ["logTime", ["String", "event"], ["double", "seconds"], `"${g.pick(["lap", "sprint", "relay"])}"`, g.pick(["12.5", "9.75"])], ["setAlarm", ["boolean", "enabled"], ["int", "hour"], g.pick(["true", "false"]), String(g.int(5, 9))], ["rename", ["String", "newName"], ["int", "version"], `"${g.pick(WORDS)}"`, String(g.int(2, 9))]]);
    const C = `public class Game {\n    public void ${name}(${p1.join(" ")}, ${p2.join(" ")}) {\n        System.out.println(${p1[1]} + " " + ${p2[1]});\n    }\n}`;
    const M = (call) => `public class Main {\n    public static void main(String[] args) {\n        Game game = new Game();\n        game.${name}(${call});\n    }\n}`;
    const unq = (s) => (s.startsWith('"') ? s.slice(1, -1) : s);
    return fixChallenge(g, "fix-argument-order", "Incorrect argument order", {
      files: { Game: C, Main: M(`${v2}, ${v1}`) },
      shown: [["Game.java", C, ["Game"]], ["Main.java", M(`${v2}, ${v1}`), ["Game"]]],
      good: { text: `Swap the arguments: game.${name}(${v1}, ${v2});`, files: { Game: C, Main: M(`${v1}, ${v2}`) } },
      bad: [
        { text: `Change the parameter ${p2.join(" ")} to ${p1[0]} ${p2[1]}.`, files: { Game: C.replace(`${p2.join(" ")}`, `${p1[0]} ${p2[1]}`), Main: M(`${v2}, ${v1}`) }, why: `The first argument ${v2} still does not match the first parameter ${p1.join(" ")}.` },
        { text: `Put quotes around ${v2}.`, files: { Game: C, Main: M(`"${v2}", ${v1}`) }, why: `The second argument ${v1} still goes to the ${p2[0]} parameter.` },
        { text: `Rename the method to ${name}2.`, files: { Game: C.replace(`void ${name}(`, `void ${name}2(`), Main: M(`${v2}, ${v1}`) }, why: "The name is not the problem, and the call would no longer match any method." },
        { text: `Remove the first argument.`, files: { Game: C, Main: M(`${v1}`) }, why: "The method needs two arguments." },
      ].filter((b) => !(b.text.startsWith("Put quotes") && v2.startsWith("'"))),
      explanation: `The first parameter is ${p1.join(" ")} and the second is ${p2.join(" ")}, so the arguments must be passed in that order: ${v1}, ${v2}.`,
    });
  });
  // 3. Missing return / printing instead of returning
  cases.push(() => {
    const printVersion = g.chance(0.5);
    const [mname, op, vname] = g.pick([["add", "+", "sum"], ["multiply", "*", "product"], ["subtract", "-", "difference"], ["combine", "+", "total"]]);
    const x = g.int(2, 9), y = g.int(2, 9);
    const expr = `a ${op} b`;
    const body = printVersion ? `System.out.println(${expr});` : `int ${vname} = ${expr};`;
    const C = (b, ret = "int") => `public class Calculator {\n    public ${ret} ${mname}(int a, int b) {\n        ${b}\n    }\n\n    public static void main(String[] args) {\n        int result = new Calculator().${mname}(${x}, ${y});\n    }\n}`;
    return fixChallenge(g, printVersion ? "fix-print-vs-return" : "fix-missing-return", printVersion ? "Printing is not returning" : "Missing required return", {
      files: { Calculator: C(body) },
      shown: [["Calculator.java", C(body), ["Calculator"]]],
      good: printVersion ? { text: `Replace System.out.println(${expr}); with return ${expr};`, files: { Calculator: C(`return ${expr};`) } } : { text: `Add return ${vname}; after int ${vname} = ${expr};`, files: { Calculator: C(`int ${vname} = ${expr};\n        return ${vname};`) } },
      bad: [
        { text: `Add return; at the end of ${mname}.`, files: { Calculator: C(body + "\n        return;") }, why: "An int method must return an int value; return; has no value." },
        { text: `Change the return type of ${mname} to void.`, files: { Calculator: C(body, "void") }, why: `main stores the result of ${mname} in result, so ${mname} must return an int.` },
        { text: `Change the return type of ${mname} to String.`, files: { Calculator: C(body, "String") }, why: "Still nothing is returned, and a String would not fit in int result." },
        ...(printVersion ? [{ text: "Change println to print.", files: { Calculator: C(`System.out.print(${expr});`) }, why: "Printing in any form is not the same as returning a value." }] : [{ text: `Add System.out.println(${vname}); at the end.`, files: { Calculator: C(`int ${vname} = ${expr};\n        System.out.println(${vname});`) }, why: `Printing ${vname} does not return it.` }]),
      ],
      explanation: "A non-void method must return a value of its return type. Printing displays a value; return sends it back to the caller.",
    });
  });
  // 4. Wrong return type
  cases.push(() => {
    const [cls, field, type, init, wrongT] = pick2(g, [["Pet", "name", "String", '"Rex"', "int"], ["Book", "title", "String", '"Dune"', "boolean"], ["Sensor", "reading", "double", "2.5", "int"], ["Player", "online", "boolean", "true", "String"], ["Course", "code", "String", '"CS101"', "double"], ["Battery", "level", "double", "87.5", "boolean"], ["Movie", "rating", "double", "4.5", "String"]]);
    const C = (rt, ret = field) => `public class ${cls} {\n    private ${type} ${field} = ${init};\n\n    public ${rt} get${cap(field)}() {\n        return ${ret};\n    }\n}`;
    return fixChallenge(g, "fix-return-type", "Wrong return type", {
      files: { [cls]: C(wrongT) },
      shown: [[`${cls}.java`, C(wrongT), [cls]]],
      good: { text: `Change the return type from ${wrongT} to ${type}.`, files: { [cls]: C(type) } },
      bad: [
        { text: `Change return ${field}; to return;.`, files: { [cls]: C(wrongT, "") }, why: `A ${wrongT} method must return a value.` },
        { text: `Change the return type from ${wrongT} to void.`, files: { [cls]: C("void") }, why: "A void method cannot return a value." },
        ...(wrongT === "String" ? [{ text: `Change the return type from ${wrongT} to int.`, files: { [cls]: C("int") }, why: `${field} is ${article(type)} ${type}, which cannot be returned as an int.` }] : [{ text: `Put quotes around the returned name: return "${field}";`, files: { [cls]: C(wrongT, `"${field}"`) }, why: `"${field}" is a String, which still does not match the return type ${wrongT}.` }]),
      ],
      explanation: `The method returns ${field}, which is ${article(type)} ${type}, so the declared return type must be ${type}.`,
    });
  });
  // 5. Constructor declared with a return type
  cases.push(() => {
    const [cls, field, type, arg] = pick2(g, [["Book", "title", "String", `"${g.pick(["Dune", "Holes", "Wonder"])}"`], ["Robot", "battery", "int", String(g.int(20, 100))], ["Team", "name", "String", `"${g.pick(["Comets", "Hawks", "Owls"])}"`], ["Lamp", "brightness", "double", g.pick(["0.5", "0.75"])], ["Locker", "number", "int", String(g.int(100, 400))], ["Planet", "moons", "int", String(g.int(0, 9))]]);
    const C = (head) => `public class ${cls} {\n    private ${type} ${field};\n\n    ${head}(${type} value) {\n        ${field} = value;\n    }\n}`;
    const M = `public class Main {\n    public static void main(String[] args) {\n        ${cls} item = new ${cls}(${arg});\n    }\n}`;
    return fixChallenge(g, "fix-constructor-void", "Constructor with a return type", {
      files: { [cls]: C(`public void ${cls}`), Main: M },
      shown: [[`${cls}.java`, C(`public void ${cls}`), [cls]], ["Main.java", M, [cls]]],
      good: { text: `Remove void from public void ${cls}(...).`, files: { [cls]: C(`public ${cls}`), Main: M } },
      bad: [
        { text: `Change void to ${cls}.`, files: { [cls]: C(`public ${cls} ${cls}`), Main: M }, why: `That is still a method (returning ${article(cls)} ${cls}), and it does not return anything.` },
        { text: `Add return; at the end of ${cls}(...).`, files: { [cls]: C(`public void ${cls}`).replace(`${field} = value;`, `${field} = value;\n        return;`), Main: M }, why: "It is still a void method, so Java still has no constructor that takes an argument." },
        { text: `In Main, remove new: ${cls} item = ${cls}(${arg});`, files: { [cls]: C(`public void ${cls}`), Main: M.replace(`new ${cls}(`, `${cls}(`) }, why: "Objects are created with new, and calling a method without an object does not create one." },
        { text: `Change public to private.`, files: { [cls]: C(`private void ${cls}`), Main: M }, why: "The access modifier is not the problem; the void return type makes it a method." },
      ],
      explanation: `Constructors have no return type, not even void. With void, public void ${cls}(${type} value) is an ordinary method, so new ${cls}(${arg}) finds no matching constructor.`,
    });
  });
  // 6. Incorrect constructor name
  cases.push(() => {
    const [cls, field, type, arg] = pick2(g, [["Book", "title", "String", '"Dune"'], ["Planet", "moons", "int", String(g.int(0, 9))], ["Course", "code", "String", '"CS101"'], ["Bicycle", "gears", "int", String(g.int(3, 21))], ["Recipe", "servings", "int", String(g.int(2, 8))], ["Drone", "altitude", "double", g.pick(["12.5", "30.0"])]]);
    const wrong = g.pick([cls.toLowerCase(), cls + "s", cls.slice(0, -1)]);
    const C = (head) => `public class ${cls} {\n    private ${type} ${field};\n\n    public ${head}(${type} value) {\n        ${field} = value;\n    }\n}`;
    const M = `public class Main {\n    public static void main(String[] args) {\n        ${cls} item = new ${cls}(${arg});\n    }\n}`;
    return fixChallenge(g, "fix-constructor-name", "Incorrect constructor name", {
      files: { [cls]: C(wrong), Main: M },
      shown: [[`${cls}.java`, C(wrong), [cls]], ["Main.java", M, [cls]]],
      good: { text: `Rename the constructor from ${wrong} to ${cls}.`, files: { [cls]: C(cls), Main: M } },
      bad: [
        { text: `Add void before ${wrong}.`, files: { [cls]: C(`void ${wrong}`), Main: M }, why: `That makes ${wrong} an ordinary method, so there is still no ${cls} constructor that takes an argument.` },
        { text: `In Main, write new ${wrong}(${arg}).`, files: { [cls]: C(wrong), Main: M.replace(`new ${cls}(`, `new ${wrong}(`) }, why: `The constructor name must match the class name ${cls}; there is no class named ${wrong}.` },
        { text: "Remove the parameter from the constructor.", files: { [cls]: C(wrong).replace(`(${type} value)`, "()").replace(`${field} = value;`, ""), Main: M }, why: "The name still does not match the class, and Main passes an argument." },
      ],
      explanation: `A constructor's name must be exactly the class name, including capitalization: ${cls}, not ${wrong}. Without a return type and with a different name, Java treats ${wrong}(...) as an invalid method declaration.`,
    });
  });
  // 7. Wrong argument count in a constructor call
  cases.push(() => {
    const [Car, p1, p2, f1, f2, vals1, lo, hi] = g.pick([["Car", "m", "y", "model", "year", ['"Civic"', '"Model 3"', '"Corolla"'], 2015, 2024], ["Phone", "brand", "storage", "maker", "gigabytes", ['"Pixel"', '"Galaxy"'], 64, 512], ["Song", "title", "length", "name", "seconds", ['"Echo"', '"Nova"'], 120, 300], ["Course", "subject", "seats", "name", "capacity", ['"Biology"', '"Art"'], 12, 35]]);
    const C = `public class Car {\n    private String ${f1};\n    private int ${f2};\n\n    public Car(String ${p1}, int ${p2}) {\n        ${f1} = ${p1};\n        ${f2} = ${p2};\n    }\n}`.replace(/\bCar\b/g, Car);
    const M = (s) => `public class Main {\n    public static void main(String[] args) {\n        ${s.replace(/\bCar\b/g, Car).replace(/\bcar\b/g, Car.toLowerCase())}\n    }\n}`;
    const model = g.pick(vals1),
      year = g.int(lo, hi);
    return fixChallenge(g, "fix-argument-count", "Incorrect argument count", {
      files: { [Car]: C, Main: M(`Car car = new Car(${model});`) },
      shown: [[`${Car}.java`, C, [Car]], ["Main.java", M(`Car car = new Car(${model});`), [Car]]],
      good: { text: `Also pass an int argument for ${p2}: new ${Car}(${model}, ${year})`, files: { [Car]: C, Main: M(`Car car = new Car(${model}, ${year});`) } },
      bad: [
        { text: `Pass only an argument for ${p2}: new ${Car}(${year})`, files: { [Car]: C, Main: M(`Car car = new Car(${year});`) }, why: "The constructor needs two arguments: a String and then an int." },
        { text: `Remove the argument: new ${Car}()`, files: { [Car]: C, Main: M("Car car = new Car();") }, why: `${Car} declares a constructor, so Java does not provide a no-argument one.` },
        { text: `Swap to new ${Car}(${year}, ${model})`, files: { [Car]: C, Main: M(`Car car = new Car(${year}, ${model});`) }, why: `The parameters are (String ${p1}, int ${p2}), so the String argument comes first, then the int.` },
        { text: `Drop new: ${Car} ${Car.toLowerCase()} = ${Car}(${model}, ${year});`, files: { [Car]: C, Main: M(`Car car = Car(${model}, ${year});`) }, why: "A constructor is called with new." },
      ],
      explanation: `The ${Car} constructor has two parameters (String ${p1}, int ${p2}), so the call must supply two arguments in that order.`,
    });
  });
  // 8. Calling a private method from another class
  cases.push(() => {
    const [cls, priv, pub] = pick2(g, [["Game", "resetScore", "start"], ["Robot", "calibrate", "powerOn"], ["Account", "applyFee", "monthEnd"], ["Printer", "warmUp", "printPage"], ["Oven", "preheat", "bake"], ["Camera", "focusLens", "takePhoto"], ["Elevator", "checkDoors", "goToFloor"]]);
    const C = (mod) => `public class ${cls} {\n    ${mod} void ${priv}() {\n        System.out.println("${priv}");\n    }\n\n    public void ${pub}() {\n        ${priv}();\n    }\n}`;
    const M = (s = `item.${priv}();`) => `public class Main {\n    public static void main(String[] args) {\n        ${cls} item = new ${cls}();\n        ${s}\n    }\n}`;
    const usePublic = g.chance(0.5);
    const common = [
      { text: `Remove the call ${priv}(); from inside ${pub}.`, files: { [cls]: C("private").replace(`        ${priv}();\n`, ""), Main: M() }, why: `Calling ${priv} inside ${cls} was already allowed; the error is in Main.` },
      { text: `In Main, call ${cls}.${priv}(); instead.`, files: { [cls]: C("private"), Main: M(`${cls}.${priv}();`) }, why: `${priv} is still private, and an instance method cannot be called through the class name.` },
      { text: `Change ${priv}'s return type to int.`, files: { [cls]: C("private int").replace(`private int void`, "private int"), Main: M() }, why: "The return type does not affect access, and the method would also need to return an int." },
    ];
    return fixChallenge(g, usePublic ? "fix-private-use-public-method" : "fix-private-access", "Calling a private method from another class", {
      files: { [cls]: C("private"), Main: M() },
      shown: [[`${cls}.java`, C("private"), [cls]], ["Main.java", M(), [cls]]],
      question: usePublic ? `Main should run ${priv} without changing ${cls}. Which change fixes the error?` : undefined,
      good: usePublic ? { text: `In Main, call item.${pub}(); which runs ${priv}() from inside ${cls}.`, files: { [cls]: C("private"), Main: M(`item.${pub}();`) } } : { text: `Change ${priv} from private to public.`, files: { [cls]: C("public"), Main: M() } },
      bad: common,
      explanation: usePublic ? `${priv} is private, so Main cannot call it directly, but the public method ${pub}() is inside ${cls} and may call ${priv}(). Private methods are often helpers used by a class's public methods.` : `A private method can be called only by code inside its own class. ${pub}() may call ${priv}(), but Main, a different class, cannot, unless ${priv} is made public.`,
    });
  });
  // 9. Incorrect parameter type
  cases.push(() => {
    const [Th, fld, setter, pn, vals] = g.pick([["Thermostat", "target", "setTarget", "degrees", ["68.5", "72.5", "70.5"]], ["Scale", "weight", "setWeight", "pounds", ["12.5", "150.25"]], ["Recipe", "cups", "setCups", "amount", ["1.5", "2.75"]], ["Runner", "pace", "setPace", "minutes", ["7.5", "9.25"]]]);
    const C = (t) => `public class Thermostat {\n    private double target;\n\n    public void setTarget(${t} degrees) {\n        target = degrees;\n    }\n}`.replace(/Thermostat/g, Th).replace(/target/g, fld).replace(/setTarget/g, setter).replace(/set${cap(fld)}/g, setter).replace(/degrees/g, pn);
    const M = (a) => `public class Main {\n    public static void main(String[] args) {\n        ${Th} t = new ${Th}();\n        t.${setter}(${a});\n    }\n}`;
    const v = g.pick(vals);
    return fixChallenge(g, "fix-parameter-type", "Incorrect parameter type", {
      question: "Which single change fixes the errors?",
      files: { [Th]: C("String"), Main: M(v) },
      shown: [[`${Th}.java`, C("String"), [Th]], ["Main.java", M(v), [Th]]],
      good: { text: "Change the parameter type from String to double.", files: { [Th]: C("double"), Main: M(v) } },
      bad: [
        { text: "Change the parameter type from String to int.", files: { [Th]: C("int"), Main: M(v) }, why: `${v} is a double, and Java will not narrow a double argument to an int parameter.` },
        { text: `Put quotes around the argument: t.${setter}("${v}");`, files: { [Th]: C("String"), Main: M(`"${v}"`) }, why: `The call would match, but a String still cannot be stored in the double ${fld}.` },
        { text: `Change ${setter}'s return type to double.`, files: { [Th]: C("String").replace("public void", "public double"), Main: M(v) }, why: "The return type is not the problem, and the method would then need a return statement." },
      ],
      explanation: `The parameter should be a double: the argument ${v} is a double and the value is stored in the double instance variable ${fld}.`,
    });
  });
  return cases;
}
function genFix(g) {
  const cases = fixCases(g);
  return g.pick(cases)();
}

/* ------------------------------------------------------------------ */
/* Mode I: Access modifiers                                            */
/* ------------------------------------------------------------------ */
const ACCESS_CLASSES = [
  { cls: "Game", methods: ["startGame", "resetScore", "saveProgress", "updateTimer", "showMenu"] },
  { cls: "Robot", methods: ["powerOn", "calibrate", "checkSensors", "logError", "moveForward"] },
  { cls: "Account", methods: ["deposit", "applyFee", "auditLog", "recalculate", "printStatement"] },
  { cls: "MusicPlayer", methods: ["play", "loadBuffer", "decodeTrack", "skipTrack", "cleanCache"] },
];
function accessClass(c, mods) {
  const body = c.methods.slice(0, mods.length).map((m, i) => `    ${mods[i]} void ${m}() {\n        System.out.println("${m}");\n    }`).join("\n\n");
  return `public class ${c.cls} {\n${body}\n}`;
}
function genAccessCallable(g) {
  const c = g.pick(ACCESS_CLASSES);
  const n = 4;
  const pubIndex = g.int(0, n - 1);
  const mods = Array.from({ length: n }, (_, i) => (i === pubIndex ? "public" : "private"));
  const src = accessClass(c, mods);
  const v = c.cls[0].toLowerCase() + c.cls.slice(1);
  const M = (call) => `public class Main {\n    public static void main(String[] args) {\n        ${c.cls} ${v} = new ${c.cls}();\n        ${call}\n    }\n}`;
  const calls = c.methods.slice(0, n).map((m) => `${v}.${m}();`);
  return choiceChallenge(g, "access", "access-other-class", "public vs. private from another class", {
    question: `Main is a different class that has ${article(c.cls)} ${c.cls} object named ${v}. Which call compiles in Main?`,
    blocks: [codeBlock(src, `${c.cls}.java`, [c.cls])],
    correct: { text: calls[pubIndex], check: check([unit(c.cls, src), unit("Main", M(calls[pubIndex]))], "ok") },
    distractors: calls.filter((_, i) => i !== pubIndex).map((call, j) => ({ text: call, why: `${call.split(".")[1].replace("();", "")} is private, so only code inside ${c.cls} can call it.`, check: check([unit(c.cls, src), unit("Main", M(call))], "error") })),
    explanation: `Only public methods can be called from a different class. ${c.methods[pubIndex]} is public; the private methods can be called only by code inside ${c.cls}.`,
  });
}
function genAccessSameClass(g) {
  const c = g.pick(ACCESS_CLASSES);
  const [pub, priv] = g.sample(c.methods, 2);
  const variant = g.pick(["void-helper", "value-helper", "two-callers"]);
  let src, callText;
  if (variant === "value-helper") {
    src = `public class ${c.cls} {\n    private int ${priv}(int amount) {\n        return amount * 2;\n    }\n\n    public void ${pub}(int amount) {\n        int result = ${priv}(amount);\n        System.out.println(result);\n    }\n}`;
    callText = `${priv}(amount)`;
  } else if (variant === "two-callers") {
    const other = c.methods.find((m) => m !== pub && m !== priv);
    src = `public class ${c.cls} {\n    private void ${priv}() {\n        System.out.println("${priv}");\n    }\n\n    public void ${pub}() {\n        ${priv}();\n    }\n\n    private void ${other}() {\n        ${priv}();\n        ${pub}();\n    }\n}`;
    callText = `${priv}()`;
  } else {
    src = `public class ${c.cls} {\n    private void ${priv}() {\n        System.out.println("${priv}");\n    }\n\n    public void ${pub}() {\n        ${priv}();\n        System.out.println("${pub}");\n    }\n}`;
    callText = `${priv}()`;
  }
  return choiceChallenge(g, "access", `access-same-class-${variant}`, "Private methods inside their own class", {
    question: variant === "two-callers" ? `${priv} is private. Is it legal for the other methods of ${c.cls} to call ${priv}()?` : `Does the call ${callText} inside ${pub} compile?`,
    blocks: [codeBlock(src, `${c.cls}.java`, [c.cls])],
    codeChoices: false,
    correct: { text: `Yes. A private method can be called by code inside the same class.`, check: check([unit(c.cls, src)], "ok") },
    distractors: [
      { text: "No. A private method can never be called.", why: "private limits who can call a method, not whether it can be called: code in the same class can call it." },
      { text: `No. ${priv} must be made public first.`, why: `public is only needed for calls from other classes; these calls are inside ${c.cls}.` },
      { text: `Only if the call is written as ${c.cls}.${callText};`, why: `${c.cls}.${callText} would not compile: ${priv} is an instance (non-static) method, so it cannot be called through the class name. Inside ${c.cls} it is called directly as ${callText}.` },
    ],
    explanation: `private means "usable only inside this class." The calls to ${priv} are inside ${c.cls}, so they compile; code in a different class could not call ${priv}.`,
  });
}
function genAccessPrivateConstructor(g) {
  const cls = g.pick(["Settings", "Scoreboard", "Logger"]);
  const src = `public class ${cls} {\n    private ${cls}() {\n        System.out.println("created");\n    }\n\n    public static ${cls} create() {\n        return new ${cls}();\n    }\n}`;
  const M = (s) => `public class Main {\n    public static void main(String[] args) {\n        ${s}\n    }\n}`;
  const v = cls.toLowerCase();
  const good = `${cls} ${v} = ${cls}.create();`;
  const bad = [
    { text: `${cls} ${v} = new ${cls}();`, why: `The constructor is private, so only code inside ${cls} (such as create) can use new ${cls}().` },
    { text: `${cls} ${v} = ${cls}();`, why: "Objects are not created by calling the class name like a method; and the constructor is private." },
    { text: `${cls} ${v} = new ${cls}.create();`, why: "create is a method, not a class; it is called as " + cls + ".create()." },
  ];
  return choiceChallenge(g, "access", "access-private-constructor", "Private constructors", {
    question: `Main is a different class. Which statement compiles in Main?`,
    blocks: [codeBlock(src, `${cls}.java`, [cls])],
    correct: { text: good, check: check([unit(cls, src), unit("Main", M(good))], "ok") },
    distractors: bad.map((b) => ({ ...b, check: check([unit(cls, src), unit("Main", M(b.text))], "error") })),
    explanation: `A private constructor can still be used inside its own class: create() calls new ${cls}() and returns the object, so Main calls the public create() method.`,
  });
}
function genAccessClick(g) {
  const c = g.pick(ACCESS_CLASSES);
  const mods = g.shuffle(["public", "private", "private"]);
  const ms = c.methods.slice(0, 3);
  const marked = `⟦classAccess public⟧ class ⟦className ${c.cls}⟧ {\n${ms.map((m, i) => `    ⟦m${i} ⟦mod${i} ${mods[i]}⟧ void ⟦name${i} ${m}⟧() {\n        System.out.println("${m}");\n    }⟧`).join("\n\n")}\n}`;
  const model = markedModel(marked, [c.cls]);
  const target = g.chance(0.5) ? "public" : "private";
  const idx = mods.map((m, i) => (m === target ? i : -1)).filter((i) => i >= 0);
  const answers = idx.map((i) => ({ span: spanOf(model, `name${i}`) }));
  return selectChallenge("access", `access-click-${target}`, "Which methods are visible", {
    blocks: [{ label: `${c.cls}.java`, model }],
    answers,
    question: target === "public" ? `Click the name of the method that code in a different class can call.` : `Click the name of a method that can be called only from inside ${c.cls}.`,
    explanation: target === "public" ? `${ms[idx[0]]} is public, so other classes can call it. The private methods are usable only inside ${c.cls}.` : `A private method (${idx.map((i) => ms[i]).join(" or ")}) can be called only by code inside ${c.cls}.`,
    checks: [check([unit(c.cls, stripMarks(marked))], "ok")],
  });
}

/* ------------------------------------------------------------------ */
/* Registry, generation, assessment, validation                        */
/* ------------------------------------------------------------------ */
export const GENERATORS = {
  "identify-method": [["method-parts", genIdentifyMethod, 1]],
  "identify-constructor": [["constructor-parts", genIdentifyConstructor, 1]],
  "match-call": [["call-match", genMatchCall, 3], ["overload-runs", genOverloadRuns, 2], ["call-for-overload", genCallForOverload, 2]],
  "order-args": [["order", genOrderArgs, 1]],
  return: [["complete", genCompleteReturn, 3], ["boolean", genBooleanRequirement, 2], ["void", genVoidMeaning, 2], ["paths", genReturnPaths, 2]],
  constructors: [["create", genCreateObject, 3], ["which", genWhichConstructor, 2], ["is-constructor", genIsConstructor, 2]],
  "returned-values": [["arith", genArith, 3], ["half", genHalf, 1], ["concat", genConcat, 2], ["nested", genNestedCall, 2], ["assign", genAssignUse, 1], ["print", genPrintVsReturn, 1], ["primitive", genPrimitiveParam, 1], ["boolean", genBooleanCalls, 1]],
  fix: [["fix", genFix, 1]],
  access: [["other-class", genAccessCallable, 3], ["same-class", genAccessSameClass, 2], ["private-ctor", genAccessPrivateConstructor, 1], ["click", genAccessClick, 2]],
};
export function signature(ch) {
  const extra = ch.kind === "choice" ? ch.choices[ch.answer].text : ch.kind === "order" ? ch.answerText : "";
  return `${ch.generator}|${ch.question}|${ch.blocks.map((b) => b.model.code).join("|")}|${extra}`;
}
export function generate(mode = "mixed", rng = Math.random, { exclude = [], avoid = new Set(), lastGenerator = null } = {}) {
  const g = tools(rng);
  let m = mode;
  if (m === "mixed") {
    const options = Object.keys(MODES).filter((x) => !exclude.includes(x));
    m = g.pick(options.length ? options : Object.keys(MODES));
  }
  const list = GENERATORS[m];
  if (!list) throw new Error(`Unknown mode ${mode}`);
  const total = list.reduce((s, x) => s + x[2], 0);
  for (let round = 0; round < 20; round++) {
    let r = g.rng() * total,
      gen = list[list.length - 1];
    for (const x of list) if ((r -= x[2]) < 0) {
        gen = x;
        break;
      }
    for (let attempt = 0; attempt < 60; attempt++) {
      const ch = gen[1](g);
      if (!ch) continue;
      if (avoid.has(signature(ch))) continue;
      if (lastGenerator && ch.generator === lastGenerator && attempt < 10) continue;
      const v = validateChallenge(ch);
      if (!v.ok) continue;
      return ch;
    }
  }
  throw new Error(`Could not generate a valid ${m} challenge`);
}
/* response: select -> {block, span:[s,e]}; choice -> index; order -> [token ids] */
export function assess(ch, response) {
  if (ch.kind === "select") {
    if (!response || !response.span) return false;
    return ch.answers.some((a) => a.block === (response.block || 0) && a.span[0] === response.span[0] && a.span[1] === response.span[1]);
  }
  if (ch.kind === "choice") return ch.choices[response]?.correct === true;
  if (ch.kind === "order") {
    if (!Array.isArray(response) || response.length !== ch.answerOrder.length) return false;
    const text = (id) => ch.tokens.find((t) => t.id === id)?.text;
    return response.every((id, i) => text(id) === text(ch.answerOrder[i]));
  }
  return false;
}
export function orderedCall(ch, ids) {
  const text = (id) => ch.tokens.find((t) => t.id === id)?.text;
  return `${ch.method}(${ids.map(text).join(", ")});`;
}
export function validateChallenge(ch) {
  const errors = [];
  const fail = (m) => errors.push(m);
  try {
    if (!MODES[ch.mode]) fail("unknown mode");
    if (!ch.question || !ch.explanation) fail("missing text");
    if (ch.kind === "select") {
      const b = ch.blocks;
      for (const a of ch.answers) {
        const model = b[a.block].model;
        const [s, e] = a.span;
        if (!(s <= e && model.tokens[s] && model.tokens[e])) fail("bad span");
        // The answer must be reachable by tapping: either a single selectable
        // token or a node that contains a selectable token.
        const tokensIn = model.tokens.slice(s, e + 1).filter((t) => t.sel);
        if (!tokensIn.length) fail("answer has no selectable token");
        const reachable = tokensIn.some((t) => {
          let cur = null;
          for (let k = 0; k < 8; k++) {
            cur = nextSelection(model, cur, t.i);
            if (cur[0] === s && cur[1] === e) return true;
          }
          return false;
        });
        if (!reachable) fail("answer span cannot be selected by tapping");
      }
      const selectable = b.reduce((n, x) => n + x.model.tokens.filter((t) => t.sel).length, 0);
      if (selectable < 6) fail("too few selectable tokens");
    } else if (ch.kind === "choice") {
      if (ch.choices.length !== 4) fail("needs 4 choices");
      if (new Set(ch.choices.map((c) => c.text)).size !== 4) fail("duplicate choices");
      if (ch.choices.filter((c) => c.correct).length !== 1) fail("exactly one correct");
      if (!ch.choices[ch.answer]?.correct) fail("answer index");
      if (ch.choices.some((c) => !c.correct && !c.why)) fail("distractor without explanation");
    } else if (ch.kind === "order") {
      if (!ch.tokens.length || ch.answerOrder.length < 2) fail("order tokens");
      if (new Set(ch.tokens.map((t) => t.text)).size !== ch.tokens.length) fail("duplicate tokens");
      if (!assess(ch, ch.answerOrder)) fail("answer order not accepted");
    } else fail("unknown kind");
  } catch (e) {
    fail("exception " + e.message);
  }
  return { ok: !errors.length, errors };
}
