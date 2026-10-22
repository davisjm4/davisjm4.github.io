/* Method families: Passing an object to a method, Static versus instance fields,
 * toString() and object representation. */
import { lit, str, nm, tf, fld, nw, call, scall, sfld, bin, decl, asg, inc, ex, iff, ret, pr, field, param, ctor, method, cls, nul, clone } from "../ir.js";
import { M, K, STRINGS } from "../components.js";
import { P, lvl, distinct, mutDropCall, mutBoundary, mutSwapReceiver, refVarsOf } from "../kit.js";

/* ================= Passing an object to a method ================= */
const HELPERS = {
  mutate: (N, k) => ({ name: "award", m: method("award", "void", [param(N.cls, "item")], [ex(call("item", N.add, lit(k)))], { st: true }), args: "obj" }),
  reassign: (N, k) => ({ name: "replace", m: method("replace", "void", [param(N.cls, "item")], [asg("item", nw(N.cls, lit(k)))], { st: true }), args: "obj" }),
  reassignMutate: (N, k, j) => ({ name: "rebuild", m: method("rebuild", "void", [param(N.cls, "item")], [asg("item", nw(N.cls, lit(k))), ex(call("item", N.add, lit(j)))], { st: true }), args: "obj" }),
  mutateReassign: (N, k, j) => ({ name: "update", m: method("update", "void", [param(N.cls, "item")], [ex(call("item", N.add, lit(j))), asg("item", nw(N.cls, lit(k)))], { st: true }), args: "obj" }),
  condMutate: (N, k, j) => ({ name: "boost", m: method("boost", "void", [param(N.cls, "item")], [iff(bin("<", call("item", N.get), lit(k)), [ex(call("item", N.add, lit(j)))])], { st: true }), args: "obj" }),
  prim: (N, k) => ({ name: "bump", m: method("bump", "void", [param("int", "n")], [asg("n", lit(k), "+=")], { st: true }), args: "int" }),
  primReturn: (N, k) => ({ name: "plus", m: method("plus", "int", [param("int", "n")], [asg("n", lit(k), "+="), ret(nm("n"))], { st: true }), args: "int", returns: true }),
  returnParam: (N, k) => ({ name: "touch", m: method("touch", N.cls, [param(N.cls, "item")], [ex(call("item", N.add, lit(k))), ret(nm("item"))], { st: true }), args: "obj", returns: true }),
  returnNew: (N, k) => ({ name: "fresh", m: method("fresh", N.cls, [param(N.cls, "item")], [ret(nw(N.cls, bin("+", call("item", N.get), lit(k))))], { st: true }), args: "obj", returns: true }),
  swap: (N) => ({ name: "swap", m: method("swap", "void", [param(N.cls, "first"), param(N.cls, "second")], [decl(N.cls, "temp", nm("first")), asg("first", nm("second")), asg("second", nm("temp"))], { st: true }), args: "obj2" }),
  transfer: (N, k) => ({ name: "move", m: method("move", "void", [param(N.cls, "from"), param(N.cls, "to")], [ex(call("from", N.add, lit(-k))), ex(call("to", N.add, lit(k)))], { st: true }), args: "obj2" }),
  setParamField: (N, k) => ({ name: "reset", m: method("reset", "void", [param(N.cls, "item"), param("int", "value")], [ex(call("item", N.set, nm("value"))), asg("value", lit(k))], { st: true }), args: "obj+int" }),
};
const P_POOL = [["mutate", 0], ["reassign", 0], ["prim", 0], ["primReturn", 0], ["returnNew", 0], ["reassignMutate", 1], ["mutateReassign", 1], ["condMutate", 1], ["returnParam", 1], ["swap", 2], ["transfer", 2], ["setParamField", 2]];
function parametersHelpers({ rng, level, N, vars }) {
  const pool = P_POOL.filter(([, l]) => l <= level).map(([n]) => n);
  const nH = lvl(level, 1, rng.int(1, 2), 2);
  let kinds = rng.sample(pool, nH);
  if (level === 2 && !kinds.some((k) => ["swap", "transfer", "setParamField", "returnParam", "reassignMutate", "mutateReassign"].includes(k))) kinds[0] = rng.pick(["swap", "transfer", "setParamField", "returnParam"]);
  const helpers = kinds.map((kd) => HELPERS[kd](N, rng.int(2, 9), rng.int(1, 6)));
  const needs = new Set(kinds);
  const methods = [M.get(N), M.add(N)];
  if (needs.has("setParamField")) methods.push(M.set(N));
  const c = cls(N.cls, [field("int", N.f)], [K.param(N)], methods);
  const objVars = vars.slice(0, helpers.some((h) => h.args === "obj2") || level === 2 ? 2 : 1);
  const main = objVars.map((v) => decl(N.cls, v, nw(N.cls, lit(rng.int(1, 15)))));
  if (level === 0 && helpers[0].args === "obj" && rng.chance(0.5)) {
    // a second variable: either an independent object or an alias of the first
    const second = vars[1];
    main.push(decl(N.cls, second, rng.chance(0.5) ? nm(objVars[0]) : nw(N.cls, lit(rng.int(1, 15)))));
    objVars.push(second);
  }
  const prints = [];
  let intVar = null;
  for (const h of helpers) {
    const target = rng.pick(objVars);
    if (h.args === "int") {
      if (!intVar) { intVar = "count"; main.push(decl("int", intVar, rng.chance(0.5) ? lit(rng.int(1, 9)) : call(target, N.get))); }
      if (h.returns && rng.chance(0.6)) main.push(asg(intVar, call(null, h.name, nm(intVar))));
      else main.push(ex(call(null, h.name, nm(intVar))));
      prints.push(pr(nm(intVar)));
    } else if (h.args === "obj2") {
      const [a, b] = objVars.length >= 2 ? rng.shuffle(objVars.slice(0, 2)) : [objVars[0], objVars[0]];
      main.push(ex(call(null, h.name, nm(a), nm(b))));
    } else if (h.args === "obj+int") {
      intVar = intVar || "amount";
      if (!main.some((s) => s.k === "decl" && s.n === intVar)) main.push(decl("int", intVar, lit(rng.int(10, 30))));
      main.push(ex(call(null, h.name, nm(target), nm(intVar))));
      prints.push(pr(nm(intVar)));
    } else if (h.returns) {
      const taken = new Set(main.filter((st) => st.k === "decl").map((st) => st.n));
      const r = [...vars, "result", "other", "third"].find((n) => !taken.has(n) && !objVars.includes(n));
      main.push(decl(N.cls, r, call(null, h.name, nm(target))));
      main.push(ex(call(r, N.add, lit(rng.int(1, 4)))));
      prints.push(pr(bin("==", nm(r), nm(target))));
    } else {
      main.push(ex(call(null, h.name, nm(target))));
      if (level === 0 && rng.chance(0.5)) main.push(ex(call(null, h.name, nm(target))));
    }
  }
  if (level === 0 && rng.chance(0.7)) main.splice(rng.int(objVars.length, main.length), 0, ex(call(objVars[0], N.add, lit(rng.int(1, 6)))));
  for (const v of objVars) prints.push(pr(call(v, N.get)));
  const uniq = []; for (const p2 of prints) if (!uniq.some((u) => JSON.stringify(u) === JSON.stringify(p2))) uniq.push(p2);
  const outs = rng.shuffle(uniq).slice(0, lvl(level, 1, 2, 3));
  const prog = P([c], helpers.map((h) => h.m), [...main, ...outs]);
  return {
    fam: "parameters.helpers", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["paramDeepCopy", "paramByRef", "primByRef", "returnCopies", "onlyLastUpdate", "compoundAsReplace", "ctorOnce"],
    alts: [...mutDropCall(prog), ...mutSwapReceiver(prog, refVarsOf(prog))],
    focus: "Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference.",
  };
}

/* ================= Static versus instance fields ================= */
function staticCounter({ rng, level, N, vars }) {
  const ctorKind = lvl(level, rng.pick(["counted", "countedEmpty"]), rng.pick(["counted", "countedIf", "addToStatic"]), rng.pick(["counted", "countedIf", "addToStatic"]));
  const pub = rng.chance(0.5);
  const fields = [field("int", N.f), field("int", N.st, { st: true, init: lit(lvl(level, 0, rng.pick([0, 0, 1]), rng.pick([0, 1, 5]))), acc: pub ? "public" : "private" })];
  const bound = rng.pick([3, 5, 10]);
  const ctors = [ctorKind === "countedEmpty" ? K.countedEmpty(N) : ctorKind === "countedIf" ? K.countedIf(N, { op: ">", bound }) : K[ctorKind](N)];
  const methods = [M.get(N), M.add(N)];
  if (!pub) methods.push(M.staticTotal(N));
  const both = level >= 1 && rng.chance(0.5);
  if (both) methods.push(method("record", "void", [param("int", N.amt)], [asg(N.f, nm(N.amt), "+="), asg(N.st, nm(N.amt), "+=")]));
  const hasReset = level === 2 && rng.chance(0.5);
  if (hasReset) methods.push(method("restart", "void", [], [asg(N.st, lit(0))], { st: true }));
  const hasCopy = level === 2 && rng.chance(0.4);
  if (hasCopy) methods.push(M.copy(N));
  const c = cls(N.cls, fields, ctors, methods);
  const nObj = lvl(level, rng.int(2, 3), rng.int(2, 3), rng.int(2, 3));
  const main = [];
  const argOf = () => (ctorKind === "countedIf" ? rng.pick([bound - 1, bound, bound + 1, bound + 4]) : rng.int(1, 9));
  for (let i = 0; i < nObj; i++) main.push(ctorKind === "countedEmpty" ? decl(N.cls, vars[i], nw(N.cls)) : decl(N.cls, vars[i], nw(N.cls, lit(argOf()))));
  if (ctorKind === "countedEmpty") { /* countedEmpty has no int parameter; give the field a value via add */ }
  const ops = lvl(level, rng.int(0, 1), rng.int(1, 2), rng.int(2, 3));
  for (let i = 0; i < ops; i++) {
    const v = vars[rng.int(0, nObj - 1)];
    const choice = rng.pick([both ? "record" : N.add, N.add, ...(hasReset && i > 0 ? ["restart"] : []), ...(hasCopy ? ["copy"] : [])]);
    if (choice === "restart") main.push(ex(scall(N.cls, "restart")));
    else if (choice === "copy") main.push(decl(N.cls, vars[nObj + i] || "extra" + i, call(v, "copy")));
    else main.push(ex(call(v, choice, lit(rng.int(1, 6)))));
  }
  let aliasAt = -1;
  if (level <= 1 && rng.chance(0.5) && vars[nObj]) { aliasAt = rng.int(1, main.length); main.splice(aliasAt, 0, decl(N.cls, vars[nObj], nm(vars[0]))); }
  const stRead = pub ? sfld(N.cls, N.st) : scall(N.cls, N.total);
  const outs = [pr(stRead)];
  if (level >= 1 || rng.chance(0.7)) outs.push(pr(call(vars[rng.int(0, nObj - 1)], N.get)));
  const prog = P([c], [], [...main, ...rng.shuffle(outs)]);
  const aliasAlt = [];
  if (aliasAt >= 0) { const q = clone(prog); const d = q.main[aliasAt]; d.e = ctorKind === "countedEmpty" ? nw(N.cls) : nw(N.cls, lit(1)); aliasAlt.push({ program: q, mis: "aliasCreates" }); }
  return {
    fam: "static.counter", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["staticAsInstance", "instanceAsStatic", "forgetCtor", "compoundAsReplace"],
    alts: [...mutDropCall(prog), ...mutBoundary(prog), ...aliasAlt],
    focus: "A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object.",
  };
}
function staticContext({ rng, level, N, vars }) {
  if (level === 0) return null;
  const x = vars[0];
  const c = cls(N.cls, [field("int", N.f), field("int", N.st, { st: true, init: lit(0) })], [K.counted(N)], [M.get(N), M.staticTotal(N)]);
  const okStatic = { text: `int v = ${N.cls}.${N.total}();`, stmts: [decl("int", "v", scall(N.cls, N.total))] };
  const okInst = { text: `int v = ${x}.${N.get}();`, stmts: [decl("int", "v", call(x, N.get))] };
  const bad = [
    { text: `int v = ${N.cls}.${N.get}();`, stmts: [decl("int", "v", scall(N.cls, N.get))], invalid: "staticContext", mis: "staticContext" },
    { text: `int v = ${N.cls}.${N.f};`, stmts: [decl("int", "v", sfld(N.cls, N.f))], invalid: "privateAccess", mis: "staticContext" },
    { text: `int v = ${N.total}();`, stmts: [decl("int", "v", call(null, N.total))], invalid: "undeclared", mis: "undeclared" },
    { text: `int v = ${x}.${N.st};`, stmts: [decl("int", "v", fld(x, N.st))], invalid: "privateAccess", mis: "privateAccess" },
  ];
  const correct = rng.pick([okStatic, okInst]);
  const cands = [correct, ...rng.sample(bad, 3)];
  return {
    fam: "static.context", program: P([c], [], [decl(N.cls, x, nw(N.cls, lit(rng.int(1, 9))))]),
    q: { kind: "select", want: "compiles", cands: rng.shuffle(cands) },
    prompt: "This code is in main, in a different class. Which statement compiles?",
    focus: "Static members are used through the class name; instance members need an object. Private members are not accessible from another class, and a method of another class must be called through its class or an object.",
  };
}
function staticTwoClasses({ rng, level, N, vars }) {
  if (level < 2) return null;
  // two independent counters in two classes: static state is per class, not shared between classes
  const N2 = { ...N, cls: N.cls + "Pro", st: N.st };
  const mk = (NN) => cls(NN.cls, [field("int", NN.f), field("int", NN.st, { st: true, init: lit(0), acc: "public" })], [K.counted(NN)], [M.get(NN), M.add(NN)]);
  const main = [];
  const plan = rng.shuffle(["A", "A", "B", rng.pick(["A", "B"])]);
  plan.forEach((w, i) => main.push(decl(w === "A" ? N.cls : N2.cls, vars[i] || "obj" + i, nw(w === "A" ? N.cls : N2.cls, lit(rng.int(1, 9))))));
  main.push(ex(call(vars[0], N.add, lit(rng.int(1, 5)))));
  const outs = rng.shuffle([pr(sfld(N.cls, N.st)), pr(sfld(N2.cls, N2.st)), pr(call(vars[rng.int(0, 3)], N.get))]).slice(0, 2);
  const prog = P([mk(N), mk(N2)], [], [...main, ...outs]);
  return {
    fam: "static.twoclasses", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["staticAsInstance", "instanceAsStatic", "forgetCtor"],
    alts: [...mutDropCall(prog)],
    extra: [],
    focus: "Each class has its own static fields. Objects of one class never change another class's static field, even when the field names match.",
  };
}

/* ================= toString() and object representation ================= */
function tostringPrint({ rng, level, N, vars }) {
  const tsKind = lvl(level, rng.pick(["A", "S"]), rng.pick(["A", "B", "S", "C"]), rng.pick(["B", "S", "A", "C", "C"]));
  const thr = rng.int(8, 16);
  const fields = [field("int", N.f)];
  const methods = [M.get(N), M.add(N)];
  const ctors = [];
  const sep = rng.pick([", ", "/", " | "]);
  if (tsKind === "B") { fields.push(field("int", N.f2)); ctors.push(K.two(N)); methods.push(M.toStringB(N, { sep })); }
  else if (tsKind === "S") { fields.push(field("String", N.s)); ctors.push(K.withString(N)); methods.push(M.toStringS(N)); }
  else if (tsKind === "C") { ctors.push(K.param(N)); methods.push(M.toStringCond(N, { t: thr })); }
  else { ctors.push(K.param(N)); methods.push(M.toStringA(N, { prefix: rng.pick([N.cls, N.f[0].toUpperCase() + N.f.slice(1)]) })); }
  const c = cls(N.cls, fields, ctors, methods);
  const args = () => (tsKind === "B" ? [lit(rng.int(1, 9)), lit(rng.int(1, 9))] : tsKind === "S" ? [str(rng.pick(STRINGS)), lit(rng.int(1, 9))] : tsKind === "C" ? [lit(thr - rng.int(0, 6))] : [lit(rng.int(1, 9))]);
  const nObj = lvl(level, rng.int(1, 2), rng.int(1, 2), 2);
  const main = [];
  for (let i = 0; i < nObj; i++) main.push(decl(N.cls, vars[i], nw(N.cls, ...args())));
  const forms = lvl(level, ["plain", "label", "twice", "explicit", "two"], ["plain", "label", "explicit", "numBefore", "twice"], ["label", "numBefore", "numAfter", "two", "twice", "null"]);
  const form = rng.pick(forms.filter((f) => nObj > 1 || f !== "two"));
  const x = vars[0], y = vars[1];
  const label = rng.pick(["Now: ", "Result: ", "Item ", "-> "]);
  const outs = [];
  const update = () => main.push(ex(call(x, N.add, lit(rng.int(1, 6)))));
  if (form !== "twice" && form !== "null" && (level >= 1 || rng.chance(0.6))) update();
  if (form === "two" && rng.chance(0.6)) main.push(ex(call(y, N.add, lit(rng.int(1, 6)))));
  let allowExc = false;
  const extra = [];
  switch (form) {
    case "plain": outs.push(pr(nm(x))); break;
    case "label": outs.push(pr(bin("+", str(label), nm(x)))); break;
    case "explicit": outs.push(pr(call(x, "toString"))); break;
    case "numBefore": outs.push(pr(bin("+", bin("+", bin("+", call(x, N.get), lit(rng.int(1, 5))), str(" ")), nm(x)))); break;
    case "numAfter": outs.push(pr(bin("+", bin("+", str(label), call(x, N.get)), lit(rng.int(1, 5))))); break;
    case "two": outs.push(pr(bin("+", bin("+", nm(x), str(" & ")), nm(y)))); break;
    case "twice": outs.push(pr(nm(x))); main.push(...outs.splice(0)); update(); outs.push(pr(nm(x))); break;
    case "null": {
      const z = vars[2];
      main.push(decl(N.cls, z, nul()));
      let target = z;
      if (rng.chance(0.6)) { main.push(asg(z, nm(x))); main.push(asg(x, nul())); outs.push(pr(nm(z))); target = x; }
      if (rng.chance(0.5)) { outs.push(pr(bin("+", str(label), nm(target)))); }
      else { outs.push(pr(call(target, "toString"))); allowExc = true; }
      break;
    }
  }
  const prog = P([c], [], [...main, ...outs]);
  // alternative readings
  const alts = [...mutDropCall(prog)];
  const varName = clone(prog); let vn = false;
  varName.main = varName.main.map((s) => { if (s.k !== "print") return s; vn = true; return { ...s, e: replaceObjByName(s.e, refVarsOf(prog)) }; });
  if (vn) alts.push({ program: varName, mis: "printsVarName" });
  const grouped = clone(prog); let gChanged = false;
  grouped.main.forEach((s) => { if (s.k === "print") { const r = regroup(s.e); if (r) { s.e = r; gChanged = true; } } });
  if (gChanged) alts.push({ program: grouped, mis: "concatGrouping" });
  extra.push({ text: `${N.cls}@ + a hash code (digits vary)`, mis: "noOverride", rank: 3 });
  const raw = clone(prog); let rc = false;
  raw.classes[0].methods.find((m2) => m2.n === "toString").body = [{ k: "ret", e: bin("+", str(""), nm(N.f)) }]; rc = true;
  if (rc) alts.push({ program: raw, mis: "fieldsOnly" });
  return {
    fam: "tostring.print", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["toStringAtCreation", "nullPrintThrows", "nullCallPrintsNull"],
    allowExc, allowExcDistractors: true, alts: [...alts, ...mutBoundary(prog)], extra,
    focus: "Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException.",
  };
}
/* replace object operands of String concatenation / println with the variable name as text */
function replaceObjByName(e, refs) {
  if (e.k === "name" && refs.includes(e.n)) return str(e.n);
  if (e.k === "bin") return { ...e, l: replaceObjByName(e.l, refs), r: replaceObjByName(e.r, refs) };
  if (e.k === "call" && e.n === "toString" && e.o?.k === "name") return str(e.o.n);
  return e;
}
/* (a + b) + "text" is evaluated left to right; the misconception groups the numbers differently:
 * "s" + a + b  is read as "s" + (a + b). */
function regroup(e) {
  if (e.k !== "bin" || e.op !== "+") return null;
  const l = e.l;
  if (l.k === "bin" && l.op === "+" && isStrLit(l.l) && isNumeric(l.r) && isNumeric(e.r)) return bin("+", l.l, { k: "bin", op: "+", l: l.r, r: e.r, paren: true });
  if (l.k === "bin" && l.op === "+" && isNumeric(l.l) && isNumeric(l.r)) {
    // a + b + " " + obj   misread as text from the start: "" + a + b
    return bin("+", bin("+", bin("+", str(""), l.l), l.r), e.r);
  }
  const inner = regroup(l);
  return inner ? { ...e, l: inner } : null;
}
const isStrLit = (e) => e.k === "lit" && e.t === "String";
const isNumeric = (e) => (e.k === "lit" && e.t === "int") || (e.k === "call" && /^get/.test(e.n));
function tostringNoOverride({ rng, level, N, vars }) {
  if (level === 2) return null;
  const x = vars[0];
  const withS = rng.chance(0.5);
  const fields = [field("int", N.f)];
  if (withS) fields.push(field("String", N.s, { init: str(rng.pick(STRINGS)) }));
  const c = cls(N.cls, fields, [K.param(N)], [M.get(N)]);
  const v = rng.int(1, 20);
  const form = rng.pick(level === 0 ? ["plain", "label"] : ["plain", "label", "explicit"]);
  const label = rng.pick(["Item: ", "Value: "]);
  const e = form === "plain" ? nm(x) : form === "label" ? bin("+", str(label), nm(x)) : call(x, "toString");
  const pre = form === "label" ? label : "";
  const main = [decl(N.cls, x, nw(N.cls, lit(v)))];
  if (level === 1) main.push(pr(call(x, N.get)));
  const prog = P([c], [], [...main, pr(e)]);
  return {
    fam: "tostring.default", program: prog, q: { kind: "value", what: "defaultToString", measure: () => `${pre}${N.cls}@ + a hash code (digits vary)` },
    prompt: level === 1 ? "What can you say for certain about the LAST line printed?" : "What can you say for certain about what is printed?",
    models: () => [
      { text: `${pre}${v} — the value stored in its field`, mis: "hashIsField" },
      { text: `${pre}${N.cls}: ${v} — class name and field value`, mis: "hashIsField" },
      { text: `${pre}${x} — the name of the variable`, mis: "printsVarName" },
      { text: `${pre}null — Object has no text for it`, mis: "nullIsObject" },
      ...(withS ? [{ text: `${pre}${fields[1].init.v} — the text in its String field`, mis: "hashIsField" }] : []),
    ],
    skipRelevance: true,
    focus: `${N.cls} does not override toString, so the version inherited from Object is used: the class name, @, and a hexadecimal hash code. The hash code is not predictable, so no exact text can be promised.`,
  };
}
void tf; void fld; void inc; void distinct; void mutSwapReceiver; void ctor;

export default {
  parameters: [parametersHelpers],
  static: [staticCounter, staticContext, staticTwoClasses],
  tostring: [tostringPrint, tostringNoOverride],
};
