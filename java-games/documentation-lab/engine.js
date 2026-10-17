/* Documentation Lab engine: challenge selection, instantiation, assessment.
   No DOM access — script.js renders. Content lives in bank.js and docs.js. */
import { MODE_ITEMS, FAMILY_TITLES } from "./bank.js?v=doclab-v1";
import { DOCS, docLines } from "./docs.js?v=doclab-v1";

export { DOCS, docLines };
export const GAME_ID = "documentation-lab";
export const MODES = {
  inspector: "Comment Quality Inspector",
  editor: "Comment Editor",
  builder: "Javadoc Builder",
  docs: "Read the Docs",
  detective: "API Detective",
};
export const MODE_INSTRUCTIONS = {
  inspector: "Decide what makes a comment worth keeping.",
  editor: "Click the comment line that's wrong, then choose its repair. The Java code is correct — fix only the comment.",
  builder: "Build the method's Javadoc: choose what each line says, or leave a tag out if it doesn't belong.",
  docs: "Answer using the documentation panel — it has everything you need.",
  detective: "Read the documentation cards and choose (or build) the call that meets the requirement.",
};
export const docLabGame = {
  name: "Documentation Lab",
  icon: "📘",
  concepts: "Comments · Javadoc · API documentation",
  description: "Judge and repair comments, build accurate Javadoc, and read real Java API documentation to choose the right method call.",
};
export const SLOT_MARK = "/*?*/";
export const FAMILIES = FAMILY_TITLES;
export const ITEMS = MODE_ITEMS;

/* ----------------------------- randomness ----------------------------- */
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pickOne = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ------------------------------ selection ----------------------------- */
/* A picker keeps per-session variety state:
   - Mixed Practice draws modes from a shuffled bag (each mode once per round)
     and never repeats the previous mode across bag boundaries.
   - Within a mode, the least-used family is preferred, never the family used
     last time in that mode; within a family, the least-used item that is not
     among the most recent challenges. */
export function createPicker(rng = Math.random) {
  const used = new Map();
  const lastFamily = {};
  const recent = [];
  let bag = [];
  let lastMode = null;
  const count = (k) => used.get(k) || 0;

  function nextMixedMode() {
    if (!bag.length) {
      bag = shuffle(Object.keys(MODES), rng);
      if (bag[0] === lastMode) bag.push(bag.shift());
    }
    return bag.shift();
  }
  function pick(mode) {
    const m = mode === "mixed" ? nextMixedMode() : mode;
    if (!MODES[m]) throw new Error("Unknown mode " + mode);
    const items = MODE_ITEMS[m];
    // Prefer families that still hold one of the least-used, non-recent items,
    // so a focused session sees every challenge before any repeats.
    const usable = items.filter((i) => !recent.includes(i.id));
    const pool0 = usable.length ? usable : items;
    const minUse = Math.min(...pool0.map((i) => count(i.id)));
    const freshOf = (f) => pool0.filter((i) => i.family === f && count(i.id) === minUse).length;
    const fams = [...new Set(pool0.filter((i) => count(i.id) === minUse).map((i) => i.family))];
    // Never the same family twice in a row unless it holds the only unseen
    // items (then a different item from it beats repeating a challenge).
    let candidates = fams.filter((f) => f !== lastFamily[m]);
    if (!candidates.length) candidates = fams;
    // Families with more unseen items go first, so they don't bunch up at the end.
    const maxFresh = Math.max(...candidates.map(freshOf));
    candidates = candidates.filter((f) => freshOf(f) === maxFresh);
    const minF = Math.min(...candidates.map((f) => count(m + "/" + f)));
    const family = pickOne(candidates.filter((f) => count(m + "/" + f) === minF), rng);
    const pool = items.filter((i) => i.family === family);
    let fresh = pool.filter((i) => !recent.includes(i.id));
    if (!fresh.length) fresh = pool;
    const minI = Math.min(...fresh.map((i) => count(i.id)));
    const item = pickOne(fresh.filter((i) => count(i.id) === minI), rng);
    used.set(m + "/" + family, count(m + "/" + family) + 1);
    used.set(item.id, count(item.id) + 1);
    lastFamily[m] = family;
    lastMode = m;
    recent.push(item.id);
    if (recent.length > 30) recent.shift();
    return item;
  }
  return { pick };
}

/* ------------------------------ code helpers -------------------------- */
const COMMENT_PATTERNS = [
  { re: /^(\s*\*\s+@param\s+\w+\s+)(.*)$/, kind: "param" },
  { re: /^(\s*\*\s+@return\s+)(.*)$/, kind: "return" },
  { re: /^(\s*\*\s+@throws\s+)(.*)$/, kind: "throws" },
  { re: /^(\s*\*\s+)(?!\/)(.*)$/, kind: "desc" },
  { re: /^(\s*\/\/\s?)(.*)$/, kind: "line" },
];
/* Split a comment line into a fixed prefix (indentation, "*", tag, name)
   and the editable text after it. Returns null for non-comment lines and
   for the "/**" and "*\/" delimiters. */
export function commentParts(line) {
  const t = line.trim();
  if (t === "/**" || t === "*/" || t.startsWith("/**") && t.endsWith("*/")) return null;
  for (const p of COMMENT_PATTERNS) {
    const m = line.match(p.re);
    if (m) return { prefix: m[1], body: m[2], kind: p.kind };
  }
  return null;
}
export function codeLines(code) {
  return code.split("\n");
}
/* Code with the comment-slot marker removed (what javac sees). */
export function compilableCode(code) {
  return codeLines(code)
    .filter((l) => l.trim() !== SLOT_MARK)
    .join("\n");
}

/* --------------------------- instantiation --------------------------- */
export function instantiate(item, rng = Math.random) {
  const ch = clone(item);
  ch.mode = Object.keys(MODE_ITEMS).find((m) => MODE_ITEMS[m].some((i) => i.id === item.id));
  ch.modeTitle = MODES[ch.mode];
  ch.familyTitle = FAMILY_TITLES[ch.mode][ch.family];
  ch.instructions = MODE_INSTRUCTIONS[ch.mode];
  ch.docs = ch.docs || [];
  ch.blocks = ch.blocks || [];
  if (ch.kind === "choice") {
    ch.options = shuffle(ch.options, rng);
    ch.answer = ch.options.findIndex((o) => o.ok);
  } else if (ch.kind === "repair") {
    const lines = codeLines(ch.blocks[0].code);
    ch.selectable = lines.map((l, i) => (commentParts(l) ? i : -1)).filter((i) => i >= 0);
    ch.fixes = shuffle(ch.fixes, rng);
    ch.fixAnswer = ch.fixes.findIndex((f) => f.ok);
    ch.question = ch.question || "Step 1: Click the comment line that is wrong or unnecessary. Step 2: Choose what should replace it.";
  } else if (ch.kind === "line") {
    const lines = codeLines(ch.blocks[0].code);
    ch.selectable = lines.map((l, i) => (commentParts(l) ? i : -1)).filter((i) => i >= 0);
  } else if (ch.kind === "docline") {
    ch.lines = docLines(ch.docs[0]);
  } else if (ch.kind === "build") {
    ch.question = ch.question || "Build the Javadoc for this method.";
    for (const s of ch.slots) {
      s.options = shuffle(s.options, rng);
      s.answer = s.options.findIndex((o) => o.ok);
      s.label = s.tag === "desc" ? "Description" : s.tag === "param" ? "@param " + s.name : "@" + s.tag;
    }
  } else if (ch.kind === "classify") {
    ch.statements = shuffle(ch.statements, rng);
  } else if (ch.kind === "assemble") {
    ch.tokens = shuffle(ch.tokens, rng);
  }
  return ch;
}

export function generate(mode, picker, rng = Math.random) {
  return instantiate(picker.pick(mode), rng);
}

/* ------------------------------ Javadoc ------------------------------- */
/* picks: array of chosen option indexes (or null) for each slot. */
export function buildJavadoc(ch, picks, indent = "") {
  const out = [indent + "/**"];
  ch.slots.forEach((s, i) => {
    const o = picks[i] == null ? null : s.options[picks[i]];
    if (o && o.omit) return;
    const text = o ? o.text : "…";
    if (s.tag === "desc") out.push(`${indent} * ${text}`);
    else if (s.tag === "param") out.push(`${indent} * @param ${s.name} ${text}`);
    else out.push(`${indent} * @${s.tag} ${text}`);
  });
  out.push(indent + " */");
  return out.join("\n");
}

/* Code after applying a repair: the chosen line's text after its prefix is
   replaced, or the line is deleted. */
export function applyRepair(ch, line, fixIndex) {
  const lines = codeLines(ch.blocks[0].code);
  const fix = ch.fixes[fixIndex];
  const parts = commentParts(lines[line]);
  if (!fix || !parts) return lines.join("\n");
  if (fix.del) lines.splice(line, 1);
  else lines[line] = parts.prefix + fix.text;
  return lines.join("\n");
}
/* Displayed text for a fix option. */
export function fixLabel(fix) {
  return fix.del ? "Delete this line" : fix.text;
}

/* --------------------------- assemble calls --------------------------- */
const SIGS = {
  String: {
    substring: [{ params: ["int", "int"], ret: "String" }],
    indexOf: [
      { params: ["String", "int"], ret: "int" },
      { params: ["int", "int"], ret: "int" },
    ],
  },
  ArrayList: {
    add: [{ params: ["int", "E"], ret: "void" }],
    set: [{ params: ["int", "E"], ret: "E" }],
  },
};
function elemType(t) {
  const m = t.match(/^ArrayList<(\w+)>$/);
  return m ? m[1] : null;
}
function assignable(argType, paramType, elem) {
  const p = paramType === "E" ? elem : paramType;
  if (argType === p) return true;
  if (argType === "int" && p === "Integer") return true;
  return false;
}
function templateTarget(ch) {
  const m = ch.template.match(/^(\w+)\s+\w+\s*=/);
  return m ? m[1] : null;
}
/* Evaluate a student-built call with Java semantics for the small set of
   supported methods. Verified against the JVM for every possible call in
   tests/documentation-lab-jvm.test.mjs. */
export function evaluateCall(ch, method, argIdx) {
  const args = argIdx.map((i) => ch.tokens[i]);
  const rcv = ch.receiver;
  const kind = rcv.type === "String" ? "String" : "ArrayList";
  const elem = elemType(rcv.type);
  const callText = `${rcv.name}.${method}(${args.map((a) => a.text).join(", ")})`;
  const sigs = (SIGS[kind][method] || []).filter(
    (s) => s.params.length === args.length && s.params.every((p, i) => assignable(args[i].type, p, elem)),
  );
  const types = args.map((a) => a.type).join(", ");
  if (!sigs.length) return { callText, compiles: false, message: `does not compile: ${rcv.type} has no ${method} method that accepts (${types}).` };
  const sig = sigs[0];
  const ret = sig.ret === "E" ? elem : sig.ret;
  const target = templateTarget(ch);
  if (target && ret !== target && !(target === "int" && ret === "Integer")) {
    return { callText, compiles: false, message: `does not compile: ${method} returns ${ret}, which can't be stored in a ${target} variable.` };
  }
  const v = args.map((a) => a.value);
  const list = Array.isArray(rcv.value) ? rcv.value.slice() : null;
  let result;
  if (kind === "String") {
    const s = rcv.value;
    if (method === "substring") {
      if (v[0] < 0 || v[1] > s.length || v[0] > v[1]) return { callText, compiles: true, throws: "StringIndexOutOfBoundsException", message: "compiles, but throws StringIndexOutOfBoundsException at run time." };
      result = s.substring(v[0], v[1]);
    } else if (method === "indexOf") {
      const needle = sig.params[0] === "int" ? String.fromCharCode(v[0]) : v[0];
      const from = Math.max(0, v[1]);
      result = from > s.length ? -1 : s.indexOf(needle, from);
    }
  } else {
    const [i, e] = v;
    if (method === "add") {
      if (i < 0 || i > list.length) return { callText, compiles: true, throws: "IndexOutOfBoundsException", message: "compiles, but throws IndexOutOfBoundsException at run time." };
      list.splice(i, 0, e);
      result = undefined;
    } else if (method === "set") {
      if (i < 0 || i >= list.length) return { callText, compiles: true, throws: "IndexOutOfBoundsException", message: "compiles, but throws IndexOutOfBoundsException at run time." };
      result = list[i];
      list[i] = e;
    }
  }
  const show = (x) => (typeof x === "string" ? JSON.stringify(x) : String(x));
  const listText = list ? "[" + list.join(", ") + "]" : null;
  const message =
    ch.want.type === "list"
      ? `runs; ${rcv.name} becomes ${listText}.`
      : `returns ${show(result)}.`;
  return { callText, compiles: true, result, list, listText, message };
}
function assembleCorrect(ch, out) {
  if (!out.compiles || out.throws) return false;
  if (ch.want.type === "list") return JSON.stringify(out.list) === JSON.stringify(ch.want.value);
  return out.result === ch.want.value;
}

/* ------------------------------ assessment ---------------------------- */
export function assess(ch, r) {
  switch (ch.kind) {
    case "choice":
      return { correct: r === ch.answer };
    case "line":
      return { correct: ch.answer.includes(r) };
    case "docline":
      return { correct: ch.answer.includes(r) };
    case "repair": {
      const lineOk = r && r.line === ch.bad;
      const fixOk = r && r.fix === ch.fixAnswer;
      return { correct: !!(lineOk && fixOk), lineOk: !!lineOk, fixOk: !!fixOk };
    }
    case "build": {
      const slots = ch.slots.map((s, i) => r && r[i] === s.answer);
      return { correct: slots.every(Boolean), slots };
    }
    case "classify": {
      const each = ch.statements.map((s, i) => r && r[i] === s.g);
      return { correct: each.every(Boolean), each };
    }
    case "assemble": {
      const out = evaluateCall(ch, r.method, r.args);
      return { correct: assembleCorrect(ch, out), out };
    }
  }
  throw new Error("Unknown kind " + ch.kind);
}

/* The accepted response, used for revealing answers. */
export function answerFor(ch) {
  switch (ch.kind) {
    case "choice":
      return ch.answer;
    case "line":
    case "docline":
      return ch.answer[0];
    case "repair":
      return { line: ch.bad, fix: ch.fixAnswer };
    case "build":
      return ch.slots.map((s) => s.answer);
    case "classify":
      return ch.statements.map((s) => s.g);
    case "assemble":
      return solveAssemble(ch)[0];
  }
}
/* Every method/argument combination that satisfies an assemble challenge. */
export function allCalls(ch) {
  const out = [];
  const n = ch.tokens.length;
  const perm = (prefix) => {
    if (prefix.length === ch.slots) {
      for (const m of ch.methods) out.push({ method: m, args: prefix.slice() });
      return;
    }
    for (let i = 0; i < n; i++) if (!prefix.includes(i)) perm([...prefix, i]);
  };
  perm([]);
  return out;
}
export function solveAssemble(ch) {
  return allCalls(ch).filter((c) => assembleCorrect(ch, evaluateCall(ch, c.method, c.args)));
}
