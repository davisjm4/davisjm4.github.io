/* Inheritance & Polymorphism Lab — challenge generation and assessment.
   No DOM access: script.js renders. Answers for model-driven items are
   computed by java-model.js; raw items carry javac-verified keys. */
import * as J from "./java-model.js?v=iplab-v1";
import { SCENARIOS } from "./scenarios.js?v=iplab-v1";
import { ITEMS, MODES, FAMILY_TITLES } from "./bank.js?v=iplab-v1";
import { prep } from "./raw-items.js?v=iplab-v1";

export { J, SCENARIOS, ITEMS, MODES, FAMILY_TITLES };
export const GAME_ID = "inheritance-polymorphism-lab";
export const ipLabGame = {
  name: "Inheritance & Polymorphism Lab",
  icon: "🧬",
  concepts: "extends · overriding · super · polymorphism · abstract classes",
  description: "Build class hierarchies, trace which method really runs, implement abstract classes, and debug inheritance mistakes.",
};
export const MODE_INSTRUCTIONS = {
  hierarchy: "Work with the class diagram: who extends whom, what gets inherited, and whose code runs.",
  override: "Inspect superclass and subclass methods: inherited, overridden, overloaded, or invalid?",
  tracer: "Separate the reference type (what the compiler checks) from the object type (whose method runs).",
  abstract: "Decide what abstract classes require — and what they allow.",
  debug: "Each program has one inheritance mistake. Decide what kind of failure it is, find the line, and choose the fix.",
};

/* ------------------------------- random ---------------------------------- */
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
export function shuffle(a, rng) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pickOne = (a, rng) => a[Math.floor(rng() * a.length)];
const uniq = (a) => [...new Set(a)];

/* ------------------------------ selection -------------------------------- */
/* Mixed Practice draws each mode once per round of five (never the same mode
   twice in a row); within a mode it prefers families holding the least-used,
   non-recent items, so a focused session sees everything before repeats. */
export function createPicker(rng = Math.random) {
  const used = new Map();
  const lastFamily = {};
  const recent = [];
  let bag = [];
  let lastMode = null;
  const count = (k) => used.get(k) || 0;
  function pick(mode) {
    let m = mode;
    if (mode === "mixed") {
      if (!bag.length) {
        bag = shuffle(Object.keys(MODES), rng);
        if (bag[0] === lastMode) bag.push(bag.shift());
      }
      m = bag.shift();
    }
    const items = ITEMS.filter((i) => i.mode === m);
    if (!items.length) throw new Error("Unknown mode " + mode);
    const usable = items.filter((i) => !recent.includes(i.id));
    const pool = usable.length ? usable : items;
    const minUse = Math.min(...pool.map((i) => count(i.id)));
    const freshOf = (f) => pool.filter((i) => i.family === f && count(i.id) === minUse).length;
    let fams = uniq(pool.filter((i) => count(i.id) === minUse).map((i) => i.family));
    const notLast = fams.filter((f) => f !== lastFamily[m]);
    if (notLast.length) fams = notLast;
    const most = Math.max(...fams.map(freshOf));
    fams = fams.filter((f) => freshOf(f) === most);
    const minF = Math.min(...fams.map((f) => count(m + "/" + f)));
    const family = pickOne(fams.filter((f) => count(m + "/" + f) === minF), rng);
    const cands = pool.filter((i) => i.family === family && count(i.id) === minUse);
    const item = pickOne(cands.length ? cands : pool.filter((i) => i.family === family), rng);
    used.set(item.id, count(item.id) + 1);
    used.set(m + "/" + family, count(m + "/" + family) + 1);
    lastFamily[m] = family;
    lastMode = m;
    recent.push(item.id);
    if (recent.length > 40) recent.shift();
    return item;
  }
  return { pick };
}

/* ------------------------------ helpers ---------------------------------- */
export const classesOf = (item) => item.classes || SCENARIOS[item.scen];
const declLine = (d) => `${d.t} ${d.v} = new ${d.obj}();`;
const envOf = (decls) => Object.fromEntries(decls.map((d) => [d.v, { decl: d.t, obj: d.obj }]));
export const mainCode = (decls, stmts) => [...decls.map(declLine), ...stmts.map(J.statementText)].join("\n");
const COMPILE_ERROR = "Compile error";
const CCE = "Throws ClassCastException";
export function outcomeLabel(r) {
  if (!r.compiles) return COMPILE_ERROR;
  if (r.exception) return "Throws " + r.exception;
  return r.output;
}
function safe(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}
/* Outputs a student might predict for a call, from common misconceptions:
   using the declared type's method, or binding inner calls statically, or
   using another subclass's version. Correct output first. */
function candidateOutputs(classes, decl, obj, m, args = []) {
  const types = args.map((a) => (typeof a === "number" ? "int" : "String"));
  const found = J.lookup(classes, decl, m, types);
  if (!found) return [];
  const out = [];
  const run = (objType, opts) => safe(() => J.invoke(classes, objType, J.dispatch(classes, objType, found), args, [], opts).value);
  out.push(run(obj));
  out.push(safe(() => J.invoke(classes, decl, found.m.abstract ? J.dispatch(classes, decl, found) : found, args, [], { staticInner: true }).value));
  out.push(run(obj, { staticInner: true }));
  out.push(run(decl));
  for (const c of classes) if (!c.abstract && J.isSubtype(classes, c.name, decl)) out.push(run(c.name));
  // Too few? Add the same method's result for other classes in the hierarchy.
  if (uniq(out.filter((x) => x != null)).length < 3)
    for (const c of classes) if (!c.abstract) out.push(safe(() => { const f = J.lookup(classes, c.name, m, types); return f ? J.invoke(classes, c.name, J.dispatch(classes, c.name, f), args).value : null; }));
  return uniq(out.filter((x) => x != null));
}
function outputOptions(correct, cands, rng, n = 4) {
  const rest = shuffle(cands.filter((x) => x !== correct), rng).slice(0, n - 1);
  return shuffle(uniq([correct, ...rest]), rng);
}
const sigLabel = (c, m) => `${c}.${m.name}()`;

/* Diagram description for the UI. */
export function diagramOf(classes, { methods = true } = {}) {
  return classes.map((c) => ({
    name: c.name,
    ext: c.ext,
    abstract: c.abstract,
    methods: methods ? c.methods.map((m) => ({ sig: J.shortSig(m), id: J.methodId(c.name, m), abstract: m.abstract, private: m.vis === "private", static: m.static })) : [],
  }));
}

/* ------------------------------ builders --------------------------------- */
function base(item) {
  return {
    id: item.id,
    mode: item.mode,
    modeTitle: MODES[item.mode],
    family: item.family,
    familyTitle: FAMILY_TITLES[item.mode][item.family],
    instructions: MODE_INSTRUCTIONS[item.mode],
    explanation: item.explanation || "",
    blocks: [],
    prompt: item.prompt || "",
  };
}
const classesBlock = (classes, label = "Classes") => ({ label, code: J.renderClasses(classes).code });
const mainBlock = (code) => ({ label: "In main", code });

const BUILD = {
  connect(item, rng) {
    const classes = classesOf(item);
    const order = shuffle(classes, rng);
    const ch = base(item);
    ch.kind = "connect";
    ch.question = "Read the declarations, then set each class's superclass to build the class diagram.";
    ch.blocks = [classesBlock(order, "Declarations (in no particular order)")];
    ch.classes = order.map((c) => c.name);
    ch.answer = Object.fromEntries(classes.map((c) => [c.name, c.ext || null]));
    ch.diagram = diagramOf(order, { methods: true });
    ch.explanation = "Each class names exactly one superclass after extends (a class with no extends clause directly extends Object). Methods listed in a box are the ones that class declares; it also inherits everything above it.";
    return ch;
  },
  has(item, rng) {
    const classes = classesOf(item);
    const ch = base(item);
    ch.kind = "multi";
    const all = uniq(classes.flatMap((c) => c.methods.map((m) => J.shortSig(m))));
    const avail = J.availableMethods(classes, item.target).map((x) => J.shortSig(x.m));
    ch.question = `Code in Main has a ${item.target} reference to a ${item.target} object. Select EVERY method it can call.`;
    ch.diagram = diagramOf(classes);
    ch.options = shuffle(all, rng);
    ch.answer = avail.slice().sort();
    const chainNames = J.chain(classes, item.target);
    ch.explain = Object.fromEntries(
      all.map((sig) => {
        const decl = classes.filter((c) => c.methods.some((m) => J.shortSig(m) === sig));
        const inChain = decl.filter((c) => chainNames.includes(c.name));
        if (avail.includes(sig)) {
          const from = J.availableMethods(classes, item.target).find((x) => J.shortSig(x.m) === sig).cls;
          return [sig, from === item.target ? `${item.target} declares ${sig} itself.` : `Inherited from ${from}.`];
        }
        if (inChain.length && inChain.every((c) => c.methods.find((m) => J.shortSig(m) === sig).vis === "private")) return [sig, `${sig} is private in ${inChain[0].name}: private methods aren't inherited and can't be called from Main.`];
        return [sig, `${sig} is declared only in ${decl.map((c) => c.name).join(" and ")}, which ${decl.length > 1 ? "aren't" : "isn't"} ${item.target} or a superclass of it.`];
      }),
    );
    ch.explanation = `A ${item.target} has every non-private method declared in ${item.target} and in its superclasses (${chainNames.slice(1).join(", ") || "none"}). Methods declared in subclasses or sibling classes don't come with it.`;
    return ch;
  },
  supplier(item, rng) {
    const classes = classesOf(item);
    const [obj, m] = pickOne(item.pairs, rng);
    const found = J.lookup(classes, obj, m, []);
    const impl = J.dispatch(classes, obj, found);
    const ch = base(item);
    ch.kind = "box";
    ch.question = `A ${obj} object runs ${m}(). Tap the class whose ${m}() code runs.`;
    ch.diagram = diagramOf(classes);
    ch.answer = impl.cls;
    ch.pair = [obj, m];
    const ch0 = J.chain(classes, obj);
    ch.explanation =
      impl.cls === obj
        ? `${obj} declares its own ${m}(), which overrides the inherited version, so ${obj}'s code runs.`
        : `Java starts at the object's class, ${obj}, and walks up: ${ch0.slice(0, ch0.indexOf(impl.cls) + 1).join(" → ")}. The first class that declares ${m}() is ${impl.cls}, so its code runs${ch0.indexOf(impl.cls) > 0 ? " (inherited, not overridden below it)" : ""}.`;
    return ch;
  },
  isa(item, rng) {
    const classes = classesOf(item);
    const names = classes.map((c) => c.name);
    const concrete = classes.filter((c) => !c.abstract).map((c) => c.name);
    const pairs = [];
    for (const t of names) for (const c of concrete) if (t !== c) pairs.push({ t, c, ok: J.isSubtype(classes, c, t) });
    const valid = shuffle(pairs.filter((p) => p.ok), rng).sort((a, b) => J.depth(classes, b.c) - J.depth(classes, b.t) - (J.depth(classes, a.c) - J.depth(classes, a.t)));
    const down = shuffle(pairs.filter((p) => !p.ok && J.isSubtype(classes, p.t, p.c)), rng);
    const side = shuffle(pairs.filter((p) => !p.ok && !J.isSubtype(classes, p.t, p.c)), rng);
    const picked = [valid[0], shuffle(valid.slice(1), rng)[0], down[0], side[0] || down[1]].filter(Boolean);
    const ch = base(item);
    ch.kind = "rows";
    ch.question = "Using the class diagram, decide whether each declaration compiles.";
    ch.diagram = diagramOf(classes, { methods: false });
    ch.rows = shuffle(picked, rng).map((p) => {
      const v = p.t[0].toLowerCase() + p.t.slice(1);
      return {
        label: `${p.t} ${v} = new ${p.c}();`,
        code: true,
        options: ["Compiles", COMPILE_ERROR],
        answer: p.ok ? 0 : 1,
        why: p.ok
          ? `A ${p.c} is a ${p.t} (${J.chain(classes, p.c).slice(0, J.chain(classes, p.c).indexOf(p.t) + 1).join(" → ")}), so a ${p.t} reference can point to it.`
          : J.isSubtype(classes, p.t, p.c)
            ? `${p.t} is a subclass of ${p.c}. A ${p.c} object isn't necessarily a ${p.t}, so the reference can't point to it.`
            : `${p.c} and ${p.t} are on different branches: neither is a subclass of the other.`,
      };
    });
    ch.explanation = "A reference of type T can point to an object of class T or any subclass of T (an “is-a” relationship). It can never point to a superclass object or to an object from another branch.";
    return ch;
  },
  tags(item, rng) {
    const { code, marks } = prep(item.src);
    const lines = code.split("\n");
    const LABEL = { override: "Overrides", overload: "Overloads", new: "New method", error: "Compile error" };
    const ch = base(item);
    ch.kind = "rows";
    ch.question = "Classify each method declared in the subclass.";
    ch.blocks = [{ label: "Classes", code }];
    ch.rows = marks.rows.map((r) => ({
      label: lines[r.line].trim().replace(/\s*\{$/, ""),
      code: true,
      line: r.line,
      options: item.tags.map((t) => LABEL[t]),
      answer: item.tags.indexOf(r.tag),
      why: item.why[r.tag],
    }));
    ch.explanation = "Override: same name AND same parameter types as an inherited method. Overload: same name, different parameter types. A matching method that breaks the rules (weaker access, different return type) or a false @Override is a compile error. Private superclass methods aren't inherited, so they can't be overridden.";
    return ch;
  },
  runs(item) {
    const classes = classesOf(item);
    const env = envOf(item.decls);
    const r = J.runStatement(classes, env, item.stmt);
    const rendered = J.renderClasses(classes);
    const target = item.target || item.stmt.m;
    const step = item.target ? r.trace.find((t) => t.endsWith("." + target)) : `${r.impl.cls}.${r.impl.m.name}`;
    const [cn] = step.split(".");
    const implM = classes.find((c) => c.name === cn).methods.filter((m) => m.name === target);
    const impl = item.target ? implM[0] : r.impl.m;
    const ch = base(item);
    ch.kind = "line";
    ch.question = item.target
      ? `While ${J.statementText(item.stmt).replace("System.out.println(", "").replace(/\);$/, "")} runs, it calls ${target}(). Click the ${target}(…) declaration that actually executes.`
      : `Click the declaration that executes for ${J.statementText(item.stmt).replace("System.out.println(", "").replace(/\);$/, "")}.`;
    ch.blocks = [{ label: "Classes", code: rendered.code, selectable: Object.values(rendered.at.methods) }, mainBlock(mainCode(item.decls, [item.stmt]))];
    ch.answer = [rendered.at.methods[J.methodId(cn, impl)]];
    ch.output = r.output;
    ch.explanation = explainRun(classes, item, r, target, cn, impl);
    return ch;
  },
  sequence(item, rng) {
    const classes = classesOf(item);
    const r = J.runStatement(classes, envOf(item.decls), item.stmt);
    const names = uniq(r.trace.map((t) => t.split(".")[1]));
    const chips = [];
    for (const c of classes) for (const m of c.methods) if (names.includes(m.name) && !m.abstract && m.params.length === 0) chips.push(`${c.name}.${m.name}`);
    const ch = base(item);
    ch.kind = "sequence";
    ch.question = `Tap the method bodies in the order they START running for this call. Leave out any that don't run.${item.withOutput ? " Then choose the output." : ""}`;
    ch.blocks = [classesBlock(classes), mainBlock(mainCode(item.decls, [item.stmt]))];
    ch.chips = shuffle(uniq(chips), rng).map((id) => ({ id, label: id + "()" }));
    ch.answer = r.trace;
    if (item.withOutput) {
      const d = item.decls[0];
      ch.outputOptions = outputOptions(r.output, candidateOutputs(classes, d.t, d.obj, item.stmt.m), rng);
      ch.output = r.output;
    }
    ch.outputText = r.output;
    ch.explanation = explainTrace(classes, item, r);
    return ch;
  },
  ctor(item, rng) {
    const classes = classesOf(item);
    const order = J.constructionOrder(classes, item.target);
    const ch = base(item);
    ch.kind = "sequence";
    ch.question = `new ${item.target}() runs. Tap the constructors in the order their bodies FINISH. Leave out any that don't run. Then choose what is printed.`;
    ch.blocks = [classesBlock(classes), mainBlock(`new ${item.target}();`)];
    ch.chips = shuffle(classes.filter((c) => c.ctor).map((c) => ({ id: c.name, label: c.name + "(…)" })), rng);
    ch.answer = order;
    const out = J.constructionOutput(classes, item.target);
    const own = classes.find((c) => c.name === item.target).ctor.print;
    const rev = order.slice().reverse().map((n) => classes.find((c) => c.name === n).ctor.print).join("");
    ch.outputOptions = shuffle(uniq([out, rev, own, order.slice(1).map((n) => classes.find((c) => c.name === n).ctor.print).join("")]), rng);
    ch.output = out;
    ch.outputText = out;
    ch.explanation = `Constructors aren't inherited, but every constructor starts by calling a superclass constructor (explicitly with super(...) or implicitly). So new ${item.target}() first initializes ${order.slice(0, -1).join(", then ")} — each finishing before the next — and ${item.target}'s own body finishes last.`;
    return ch;
  },
  outputs(item, rng) {
    const classes = classesOf(item);
    const env = envOf(item.decls);
    const ch = base(item);
    ch.kind = "rows";
    ch.question = "Predict what each statement prints.";
    ch.blocks = [classesBlock(classes), mainBlock(mainCode(item.decls, item.rows))];
    const results = item.rows.map((s) => J.runStatement(classes, env, s));
    const pool = uniq(results.map((r) => r.output).concat(item.rows.flatMap((s) => candidateOutputs(classes, env[s.v].decl, env[s.v].obj, s.m))));
    ch.rows = item.rows.map((s, i) => {
      const opts = outputOptions(results[i].output, pool, rng);
      return { label: J.statementText(s), code: true, options: opts, answer: opts.indexOf(results[i].output), why: whyCall(classes, env, s, results[i]) };
    });
    ch.explanation = "Instance methods are chosen by the object's class at run time. Static methods are not overridden — they're hidden — so a static call is decided by the type the compiler sees, even inside an inherited method.";
    return ch;
  },
  versions(item, rng) {
    const ch = base(item);
    ch.kind = "rows";
    ch.question = "Two versions of the subclass differ in one line. Predict what the same main code prints with each version.";
    const [[, v1], [, v2]] = item.versions;
    ch.blocks = [
      classesBlock([v1[0]], "Superclass"),
      classesBlock([v1[1]], "Version 1 of the subclass"),
      classesBlock([v2[1]], "Version 2 of the subclass"),
      mainBlock(mainCode(item.decls, [item.stmt])),
    ];
    const res = item.versions.map(([, cl]) => J.runStatement(cl, envOf(item.decls), item.stmt));
    const subOut = item.versions.map(([, cl]) => safe(() => J.invoke(cl, cl[1].name, { cls: cl[1].name, m: cl[1].methods[0] }, item.stmt.args || []).value));
    const pool = uniq([...res.map(outcomeLabel), ...subOut.filter(Boolean), COMPILE_ERROR]);
    ch.rows = item.versions.map(([label], i) => {
      const opts = outputOptions(outcomeLabel(res[i]), pool, rng);
      const cl = item.versions[i][1];
      const overrides = cl[1].methods[0].override;
      return { label: `With ${label}`, options: opts, answer: opts.indexOf(outcomeLabel(res[i])), why: overrides ? `In ${label} the subclass method has the same parameter list, so it overrides; the object's version runs.` : `In ${label} the subclass method has a different parameter list, so it's an overload. The call matches only the superclass's method, which the subclass doesn't override.` };
    });
    ch.explanation = "Only a method with the same name and parameter types overrides. Changing the parameter list creates an overload, and a call through the superclass reference keeps using the superclass's method.";
    return ch;
  },
  trace(item, rng) {
    const classes = classesOf(item);
    const d = item.decls[0];
    const r = J.runStatement(classes, envOf(item.decls), item.stmt);
    const ch = base(item);
    ch.kind = "trace";
    ch.question = `Trace ${d.v}.${item.stmt.m}(): what the compiler checks, what runs, and what prints.`;
    ch.blocks = [classesBlock(classes), mainBlock(mainCode(item.decls, [item.stmt]))];
    ch.compilerOptions = shuffle(uniq([d.t, d.obj, ...J.chain(classes, d.obj).slice(0, 3)]), rng);
    ch.compilerAnswer = d.t;
    ch.object = { v: d.v, decl: d.t, obj: d.obj, layers: layersOf(classes, d.obj) };
    ch.implAnswer = J.methodId(r.impl.cls, r.impl.m);
    ch.outputOptions = outputOptions(r.output, candidateOutputs(classes, d.t, d.obj, item.stmt.m), rng);
    ch.output = r.output;
    ch.explanation = `Compile time: ${d.v} is declared as ${d.t}, so the compiler checks that ${d.t} has ${item.stmt.m}() — it does${J.lookup(classes, d.t, item.stmt.m, []).cls !== d.t ? ` (inherited from ${J.lookup(classes, d.t, item.stmt.m, []).cls})` : ""}. Run time: the object is a ${d.obj}, so Java uses the version nearest to ${d.obj}: ${r.impl.cls}.${item.stmt.m}(), which returns "${r.output}".`;
    return ch;
  },
  swap(item, rng) {
    const classes = classesOf(item);
    const ch = base(item);
    ch.kind = "rows";
    ch.swap = { v: item.v, declType: item.declType, m: item.m, objs: item.objs, layers: Object.fromEntries(item.objs.map((o) => [o, layersOf(classes, o)])) };
    ch.question = `Change which object ${item.v} refers to. For each object, predict what ${item.v}.${item.m}() prints.`;
    ch.blocks = [classesBlock(classes), mainBlock(`${item.declType} ${item.v} = new ${item.objs[0]}();\nSystem.out.println(${item.v}.${item.m}());`)];
    const outs = item.objs.map((o) => J.runStatement(classes, { [item.v]: { decl: item.declType, obj: o } }, { k: "call", v: item.v, m: item.m }));
    const pool = uniq(outs.map((r) => r.output).concat(item.objs.flatMap((o) => candidateOutputs(classes, item.declType, o, item.m))));
    ch.rows = item.objs.map((o, i) => {
      const opts = outputOptions(outs[i].output, pool, rng);
      return { label: `${item.declType} ${item.v} = new ${o}();`, code: true, obj: o, options: opts, answer: opts.indexOf(outs[i].output), why: `For a ${o}: ${outs[i].trace.map((t) => t + "()").join(" → ")}.` };
    });
    ch.explanation = `The declared type stays ${item.declType} in every row, so the same calls compile. What changes is the object: each call — including calls made inside other methods — runs the version nearest to the object's class.`;
    return ch;
  },
  compiles(item, rng) {
    const classes = classesOf(item);
    const env = envOf(item.decls);
    const ch = base(item);
    ch.kind = "rows";
    ch.question = "For each statement, decide what happens: a compile error, an exception at run time, or the printed output.";
    ch.blocks = [classesBlock(classes), mainBlock(mainCode(item.decls, []))];
    ch.rows = item.rows.map((s) => {
      const r = J.runStatement(classes, env, s);
      let opts;
      if (s.k === "assign" || s.k === "castAssign") opts = ["Compiles and runs", COMPILE_ERROR, CCE];
      else {
        const ref = env[s.v];
        const cands = candidateOutputs(classes, s.k === "cast" && J.lookup(classes, s.to, s.m, []) ? s.to : ref.decl, s.k === "cast" && !J.isSubtype(classes, ref.obj, s.to) ? s.to : ref.obj, s.m).concat(classes.filter((c) => !c.abstract).map((c) => safe(() => J.runStatement(classes, { x: { decl: c.name, obj: c.name } }, { k: "call", v: "x", m: s.m }).output)));
        const outs = uniq(cands.filter(Boolean));
        const correctOut = r.compiles && !r.exception ? r.output : null;
        const prints = correctOut ? [correctOut, ...shuffle(outs.filter((x) => x !== correctOut), rng).slice(0, 1)] : shuffle(outs, rng).slice(0, 2);
        opts = [COMPILE_ERROR, CCE, ...prints.map((p) => "Prints " + JSON.stringify(p))];
      }
      const key = !r.compiles ? COMPILE_ERROR : r.exception ? CCE : s.k === "assign" || s.k === "castAssign" ? "Compiles and runs" : "Prints " + JSON.stringify(r.output);
      return { label: J.statementText(s), code: true, options: opts, answer: opts.indexOf(key), why: whyCompiles(classes, env, s, r) };
    });
    ch.explanation = "The compiler only knows the reference's declared type: a call compiles only if that type has the method. A cast changes the type the compiler uses; at run time Java checks that the object really is that type, and throws ClassCastException if it isn't.";
    return ch;
  },
  implement(item, rng) {
    const classes = classesOf(item);
    const ch = base(item);
    ch.kind = "multi";
    const sigs = [];
    const need = [];
    const seen = new Set();
    for (const cn of J.chain(classes, item.ext))
      for (const m of classes.find((c) => c.name === cn).methods) {
        const k = J.shortSig(m);
        if (seen.has(k)) continue;
        seen.add(k);
        sigs.push(k);
        if (m.abstract) need.push(k);
      }
    const NONE = "Nothing — it can be concrete as is";
    ch.question = `A new concrete class is declared as  class ${item.newClass} extends ${item.ext} { … }. Which methods MUST ${item.newClass} implement for it to compile?`;
    ch.blocks = [classesBlock(classes)];
    ch.diagram = diagramOf(classes);
    ch.options = [...shuffle(uniq(classes.flatMap((c) => c.methods.map(J.shortSig))), rng), NONE];
    ch.exclusive = NONE;
    ch.answer = need.length ? need.slice().sort() : [NONE];
    ch.explain = Object.fromEntries(
      ch.options.map((sig) => {
        if (sig === NONE) return [sig, need.length ? `${item.ext} still has abstract methods that a concrete subclass must implement.` : `Every abstract method above ${item.newClass} already has a concrete implementation it inherits.`];
        if (need.includes(sig)) return [sig, `${sig} is abstract and nothing between ${item.ext} and ${item.newClass} implements it.`];
        if (sigs.includes(sig)) return [sig, `${item.newClass} inherits a concrete ${sig} (it may override it, but doesn't have to).`];
        return [sig, `${sig} belongs to a class that ${item.newClass} doesn't extend.`];
      }),
    );
    ch.explanation = `Walk up from ${item.ext}: for each method, the nearest declaration decides. If it's abstract, ${item.newClass} must implement it; if it's concrete, ${item.newClass} inherits it.`;
    return ch;
  },
  mustabstract(item) {
    const { code, marks } = prep(item.src);
    const lines = code.split("\n");
    const ch = base(item);
    ch.kind = "line";
    ch.question = "This doesn't compile. Click the class header that must be declared abstract.";
    ch.blocks = [{ label: "Classes", code, selectable: lines.map((l, i) => (/^(abstract )?class /.test(l) ? i : -1)).filter((i) => i >= 0) }];
    ch.answer = marks.abstract;
    return ch;
  },
  header(item) {
    const { code, marks } = prep(item.src);
    const ch = base(item);
    ch.kind = "header";
    ch.question = `Build a header for ${item.name} that correctly implements the abstract method. (Several correct headers may exist.)`;
    ch.blocks = [{ label: "Classes", code }];
    ch.slot = marks.slot;
    ch.name = item.name;
    ch.segments = item.segments;
    ch.required = item.required;
    return ch;
  },
  rowsRaw(item) {
    const classes = classesOf(item);
    const ch = base(item);
    ch.kind = "rows";
    ch.question = "Decide whether each statement in main compiles.";
    ch.blocks = [classesBlock(classes)];
    ch.rows = item.rows.map((r) => ({ label: r.stmt, code: true, options: ["Compiles", COMPILE_ERROR], answer: r.ok ? 0 : 1, why: r.why }));
    return ch;
  },
  choice(item, rng) {
    const { code } = prep(item.src);
    const ch = base(item);
    ch.kind = "choice";
    ch.question = item.question;
    ch.blocks = [{ label: /public class Main/.test(code) ? "Program" : "Classes", code }];
    ch.options = shuffle(item.options, rng);
    ch.answer = ch.options.findIndex((o) => o.ok);
    return ch;
  },
  fixset(item, rng) {
    const { code, marks } = prep(item.src);
    const lines = code.split("\n");
    const ch = base(item);
    ch.kind = "multi";
    ch.question = "This program doesn't compile. Select EVERY change that would make it compile and print the intended output. Judge each change on its own.";
    ch.prompt = `Intended output: ${item.intended}`;
    ch.blocks = [{ label: "Program", code }];
    const fixes = item.fixes.map((f) => ({ ...f, label: fixLabel(f, marks, lines), edits: fixEdits(f, marks) }));
    ch.fixData = fixes;
    ch.options = shuffle(fixes.map((f) => f.label), rng);
    ch.answer = fixes.filter((f) => f.ok).map((f) => f.label).sort();
    ch.explain = Object.fromEntries(fixes.map((f) => [f.label, f.why]));
    ch.codeOptions = true;
    return ch;
  },
  debug(item, rng) {
    const { code, marks } = prep(item.src);
    const lines = code.split("\n");
    const ch = base(item);
    ch.kind = "debug";
    ch.question = item.question || "Decide what kind of problem this program has, click the line that causes it, and choose the fix.";
    ch.prompt = item.question ? "" : `Intended output: ${item.intended}`;
    ch.blocks = [{ label: "Program", code, selectable: lines.map((l, i) => (/[A-Za-z]/.test(l) ? i : -1)).filter((i) => i >= 0) }];
    ch.askOutcome = item.askOutcome;
    ch.outcomeOptions = ["Doesn't compile", "Compiles, then crashes at run time", "Runs, but prints the wrong result"];
    ch.outcomeAnswer = { compile: 0, crash: 1, logic: 2 }[item.outcome || (item.error ? "compile" : "logic")];
    ch.badLines = marks.bad;
    ch.fixes = shuffle(
      item.fixes.map((f) => ({ ok: f.ok, why: f.why, label: fixLabel(f, marks, lines), edits: fixEdits(f, marks) })),
      rng,
    );
    ch.actual = item.actual;
    ch.intended = item.intended;
    return ch;
  },
};
function fixEdits(f, marks) {
  if (f.text !== undefined) return { [marks.bad[0]]: f.text };
  const out = {};
  for (const [k, v] of Object.entries(f.edits)) out[k === "bad" ? marks.bad[0] : marks.names[k]] = v;
  return out;
}
/* "In Theme: String name() {" — where each edit happens and what it says. */
function ownerOf(lines, i) {
  for (let k = i; k >= 0; k--) {
    const m = lines[k].match(/^(?:public\s+)?(?:abstract\s+|final\s+)*class\s+(\w+)/);
    if (m) return m[1] === "Main" ? "main" : m[1];
  }
  return "";
}
function fixLabel(f, marks, lines) {
  const e = fixEdits(f, marks);
  return Object.entries(e)
    .sort((a, b) => a[0] - b[0])
    .map(([i, v]) => {
      const text = v.split("\n").map((l) => l.trim()).filter(Boolean).join("  ⏎  ");
      return `In ${ownerOf(lines, Number(i))}: ${text || "(delete " + lines[Number(i)].trim() + ")"}`;
    })
    .join("   +   ");
}
export function applyEdits(code, edits) {
  const lines = code.split("\n");
  for (const [i, v] of Object.entries(edits)) lines[Number(i)] = v;
  return lines.join("\n");
}

/* Object view: layers from the object's own class up to the root. */
function layersOf(classes, obj) {
  return J.chain(classes, obj).map((cn) => {
    const c = classes.find((x) => x.name === cn);
    return { cls: cn, methods: c.methods.map((m) => ({ id: J.methodId(cn, m), sig: J.shortSig(m), abstract: m.abstract, private: m.vis === "private", static: m.static })) };
  });
}

/* ------------------------------ explanations ----------------------------- */
function explainRun(classes, item, r, target, cn, impl) {
  const d = item.decls[0];
  if (impl.vis === "private") return `${target}() is private in ${cn}. Private methods aren't inherited and can't be overridden, so when ${cn}'s code calls ${target}(), it always runs ${cn}'s own private version — even though the object is a ${d.obj}. (${d.obj}'s ${target}() is a separate, new method.)`;
  if (impl.params.length && item.stmt.args) return `The call passes ${item.stmt.args.map(J.javaLit).join(", ")}, so the compiler picks ${target}(${impl.params.map((p) => p[0]).join(", ")}) from ${d.t}. ${d.obj} doesn't override that signature, so ${cn}'s version runs.`;
  if (!item.target) return `The compiler accepts the call because ${d.t} has ${target}(). At run time the object is a ${d.obj}; the nearest ${target}() with that exact parameter list is in ${cn}. ${classes.some((c) => c.methods.some((m) => m.name === target && m.params.length)) ? "The other " + target + " methods have different parameter lists (overloads), so they aren't candidates." : ""}`;
  return `${target}() is called with this as the ${d.obj} object, so dynamic dispatch picks the version nearest to ${d.obj}: ${cn}.${target}().`;
}
function explainTrace(classes, item, r) {
  const steps = r.trace.map((t) => t + "()").join(" → ");
  return `Order: ${steps}. super.m() runs the version just above the current class and then returns. A plain call like m() inside a method means this.m(), so it dispatches on the object (${item.decls[0].obj}) — even when the calling code was inherited. Output: "${r.output}".`;
}
function whyCall(classes, env, s, r) {
  const ref = env[s.v];
  const found = J.lookup(classes, ref.decl, s.m, []);
  if (found.m.static) return `${s.m}() is static, so the declared type ${ref.decl} decides: ${found.cls}.${s.m}() runs, whatever the object is.`;
  return `${s.m}() is an instance method, so the object's class (${ref.obj}) decides: ${r.trace.map((t) => t + "()").join(" → ")}.`;
}
function whyCompiles(classes, env, s, r) {
  const ref = env[s.v || s.from];
  if (!r.compiles) {
    if (r.error === "no-method") return `The compiler checks ${s.k === "cast" ? s.to : ref.decl}, which has no ${s.m}() — the object's real class doesn't matter at compile time.`;
    if (r.error === "private") return `${s.m}() is private in ${s.k === "cast" ? s.to : ref.decl}, so code in Main can't call it.`;
    return `The variable's declared type is ${ref.decl}. A ${ref.decl} isn't guaranteed to be a ${s.t}, so assigning without a cast doesn't compile.`;
  }
  if (r.exception) return `This compiles (${ref.decl} and ${s.to || s.t} are related), but the object is actually a ${ref.obj}, not a ${s.to || s.t}, so the cast fails at run time.`;
  if (s.k === "castAssign") return `The cast compiles and succeeds at run time because the object really is a ${ref.obj}.`;
  if (s.k === "assign") return `Assigning to a superclass type is always allowed.`;
  return `It compiles because ${s.k === "cast" ? s.to : ref.decl} has ${s.m}(); at run time ${r.impl.cls}'s version runs.`;
}

/* ------------------------------ public API ------------------------------- */
const KIND_BUILDER = { connect: "connect", has: "has", supplier: "supplier", isa: "isa", tags: "tags", runs: "runs", sequence: "sequence", ctor: "ctor", outputs: "outputs", versions: "versions", trace: "trace", swap: "swap", compiles: "compiles", implement: "implement", mustabstract: "mustabstract", header: "header", rows: "rowsRaw", choice: "choice", debug: "debug", fixset: "fixset" };
export function instantiate(item, rng = Math.random) {
  const b = KIND_BUILDER[item.kind];
  if (!b) throw new Error("No builder for " + item.kind);
  const ch = BUILD[b](item, rng);
  ch.itemKind = item.kind;
  return ch;
}
export function generate(mode, picker, rng = Math.random) {
  return instantiate(picker.pick(mode), rng);
}

/* Header validity (D): same name, same parameter types in order, same return
   type, access at least as wide. Verified against javac for every combination. */
const ACCESS_RANK = { private: 0, "": 1, protected: 2, public: 3 };
export function headerValid(ch, r) {
  const p = ch.segments.params[r.params];
  const access = ch.segments.access[r.access];
  return access !== "private" && ACCESS_RANK[access] >= ACCESS_RANK[ch.required.access] && ch.segments.ret[r.ret] === ch.required.ret && JSON.stringify(p.types) === JSON.stringify(ch.required.types);
}
export function headerText(ch, r) {
  const access = ch.segments.access[r.access];
  return `${access ? access + " " : ""}${ch.segments.ret[r.ret]} ${ch.name}${ch.segments.params[r.params].text}`;
}
export function headerCode(ch, r) {
  const lines = ch.blocks[0].code.split("\n");
  const ind = lines[ch.slot].match(/^ */)[0];
  lines[ch.slot] = `${ind}${headerText(ch, r)} {`;
  const bi = lines.findIndex((l) => l.trim() === "BODY");
  lines[bi] = lines[bi].replace("BODY", ch.segments.params[r.params].body);
  return lines.join("\n");
}

export function assess(ch, r) {
  switch (ch.kind) {
    case "choice":
      return { correct: r === ch.answer };
    case "line":
      return { correct: ch.answer.includes(r) };
    case "box":
      return { correct: r === ch.answer };
    case "multi": {
      const got = (r || []).slice().sort();
      return { correct: JSON.stringify(got) === JSON.stringify(ch.answer) };
    }
    case "connect": {
      const each = Object.fromEntries(ch.classes.map((c) => [c, (r?.[c] ?? null) === ch.answer[c]]));
      return { correct: Object.values(each).every(Boolean), each };
    }
    case "rows": {
      const each = ch.rows.map((row, i) => r?.[i] === row.answer);
      return { correct: each.every(Boolean), each };
    }
    case "sequence": {
      const orderOk = JSON.stringify(r?.order || []) === JSON.stringify(ch.answer);
      const outOk = ch.outputOptions ? ch.outputOptions[r?.output] === ch.output : true;
      return { correct: orderOk && outOk, orderOk, outOk };
    }
    case "trace": {
      const compilerOk = ch.compilerOptions[r?.compiler] === ch.compilerAnswer;
      const implOk = r?.impl === ch.implAnswer;
      const outOk = ch.outputOptions[r?.output] === ch.output;
      return { correct: compilerOk && implOk && outOk, compilerOk, implOk, outOk };
    }
    case "header":
      return { correct: headerValid(ch, r) };
    case "debug": {
      const outcomeOk = !ch.askOutcome || r?.outcome === ch.outcomeAnswer;
      const lineOk = ch.badLines.includes(r?.line);
      const fixOk = !!ch.fixes[r?.fix]?.ok;
      return { correct: outcomeOk && lineOk && fixOk, outcomeOk, lineOk, fixOk };
    }
  }
  throw new Error("Unknown kind " + ch.kind);
}
export function answerFor(ch) {
  switch (ch.kind) {
    case "choice":
    case "box":
      return ch.answer;
    case "line":
      return ch.answer[0];
    case "multi":
      return ch.answer.slice();
    case "connect":
      return { ...ch.answer };
    case "rows":
      return ch.rows.map((r) => r.answer);
    case "sequence":
      return { order: ch.answer.slice(), output: ch.outputOptions ? ch.outputOptions.indexOf(ch.output) : null };
    case "trace":
      return { compiler: ch.compilerOptions.indexOf(ch.compilerAnswer), impl: ch.implAnswer, output: ch.outputOptions.indexOf(ch.output) };
    case "header": {
      for (let a = 0; a < ch.segments.access.length; a++)
        for (let t = 0; t < ch.segments.ret.length; t++)
          for (let p = 0; p < ch.segments.params.length; p++) if (headerValid(ch, { access: a, ret: t, params: p })) return { access: a, ret: t, params: p };
      return null;
    }
    case "debug":
      return { outcome: ch.askOutcome ? ch.outcomeAnswer : null, line: ch.badLines[0], fix: ch.fixes.findIndex((f) => f.ok) };
  }
}
