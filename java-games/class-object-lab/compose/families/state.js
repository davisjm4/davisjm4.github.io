/* State families: Instance variables and initial state, Constructor initialization, Getters and
 * encapsulation, Setters and state updates, this and parameter shadowing. */
import { lit, dbl, str, nm, tf, fld, nw, call, scall, bin, decl, asg, inc, ex, iff, ret, pr, field, param, ctor, method, cls, nul, clone } from "../ir.js";
import { M, K, STRINGS } from "../components.js";
import { P, lvl, distinct, mutDropCall, mutBoundary, mutReorder, mutSwapReceiver, refVarsOf } from "../kit.js";

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const DOUBLE_NAMES = ["rating", "weight", "ratio", "average"];
const BOOL_NAMES = ["active", "locked", "visible", "ready"];

/* ================= Instance variables and initial state ================= */
function defaultsField({ rng, level, N, vars }) {
  // choose the field kinds present in the class
  const kinds = rng.shuffle(["int", "double", "boolean", "String"]);
  const nFields = lvl(level, rng.int(1, 2), rng.int(2, 3), 3);
  let chosen = kinds.slice(0, nFields);
  if (level >= 1 && !chosen.includes("int")) chosen = ["int", ...chosen.slice(1)]; // I/A always involve a constructor on the int field
  const fieldName = { int: N.f, double: rng.pick(DOUBLE_NAMES), boolean: rng.pick(BOOL_NAMES), String: N.s };
  const getterName = (t) => (t === "boolean" ? "is" + cap(fieldName[t]) : "get" + cap(fieldName[t]));
  const initVal = { int: lit(rng.int(1, 9)), double: dbl(rng.pick([1.5, 2.5, 0.5, 3.0])), boolean: { k: "lit", t: "boolean", v: true }, String: str(rng.pick(STRINGS)) };
  const fields = [], methods = [];
  const inits = {};
  for (const t of chosen) {
    const hasInit = rng.chance(lvl(level, 0.3, 0.35, 0.45));
    fields.push(field(t, fieldName[t], { init: hasInit ? initVal[t] : null }));
    inits[t] = hasInit;
    methods.push(method(getterName(t), t, [], [ret(nm(fieldName[t]))]));
  }
  // constructors: B none/empty; I one assigning ctor (maybe overload); A initializer-then-ctor interplay
  const ctors = [];
  const intField = chosen.includes("int");
  let ctorArgs = [];
  if (intField && (level >= 1 || rng.chance(0.35))) {
    const mode = level === 2 ? rng.pick(["useInit", "overload", "assign"]) : rng.pick(["assign", "overload"]);
    if (mode === "assign") { ctors.push(ctor([param("int", "start")], [asg(N.f, nm("start"))])); ctorArgs = [lit(rng.int(2, 15))]; }
    if (mode === "overload") {
      ctors.push(ctor([], []));
      ctors.push(ctor([param("int", "start")], [asg(N.f, nm("start"))]));
      ctorArgs = rng.chance(0.5) ? [] : [lit(rng.int(2, 15))];
    }
    if (mode === "useInit") {
      if (!inits.int) { fields.find((f) => f.n === N.f).init = initVal.int; inits.int = true; }
      ctors.push(ctor([param("int", "start")], [asg(N.f, bin(rng.pick(["+", "*"]), nm(N.f), nm("start")))]));
      ctorArgs = [lit(rng.int(2, 6))];
    }
  }
  const c = cls(N.cls, fields, ctors, methods);
  const x = vars[0];
  const main = [decl(N.cls, x, nw(N.cls, ...ctorArgs))];
  const shownTypes = rng.sample(chosen, Math.min(chosen.length, lvl(level, rng.int(1, 2), rng.int(1, 2), rng.int(2, 3))));
  for (const t of shownTypes) {
    const g = call(x, getterName(t));
    main.push(pr(t === "String" ? bin("+", str(cap(fieldName.String) + ": "), g) : g));
  }
  if (level === 2 && rng.chance(0.5)) {
    // reference field defaulting to null, compared with null
    const rf = field(N.cls, "partner");
    c.fields.push(rf);
    c.methods.push(method("getPartner", N.cls, [], [ret(nm("partner"))]));
    main.push(pr(bin("==", call(x, "getPartner"), nul())));
  }
  const p = P([c], [], main);
  const printedUninit = shownTypes.some((t) => !inits[t] && !(t === "int" && ctors.some((k) => k.body.length)));
  return {
    fam: "defaults.fields", program: p, q: { kind: "output" },
    prompt: "What is printed when this code runs?",
    mis: ["defaultsNull", "boolDefaultTrue", "stringDefaultEmpty", "doubleDefaultInt", "forgetCtor", "initializerAfterCtor"],
    extra: printedUninit ? [{ text: "The code does not compile", mis: "fieldNeedsInit", rank: 6 }] : [],
    skipRelevance: true,
    focus: "Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body.",
  };
}
function defaultsLocalCompile({ rng, level, N, vars }) {
  if (level === 0) return null;
  const x = vars[0];
  const c = cls(N.cls, [field("int", N.f), field("String", N.s)], [], [M.get(N), M.getS(N)]);
  const [bad, later] = rng.sample(["count", "total", "steps", "limit", "tally"].filter((n) => n !== x), 2); // equal-length names: no length cue
  const base = [decl(N.cls, x, nw(N.cls)), decl("int", bad), decl("int", later)];
  let laterAssign = asg(later, lit(rng.int(1, 9)));
  const advKind = level === 2 ? rng.pick(["bothPaths", "onePath", "both"]) : null;
  if (advKind === "bothPaths" || advKind === "both") {
    // assigned on every path through an if/else is still definitely assigned
    laterAssign = iff(bin(">=", call(x, N.get), lit(0)), [asg(later, lit(rng.int(1, 9)))], [asg(later, lit(0))]);
  }
  base.push(laterAssign);
  if (advKind === "onePath" || advKind === "both") base.push(iff(bin(">=", call(x, N.get), lit(0)), [asg(bad, lit(rng.int(1, 9)))])); // only one path assigns
  const badForms = [
    { text: `System.out.println(${bad});`, stmts: [pr(nm(bad))] },
    { text: `int copy = ${bad} + 1;`, stmts: [decl("int", "copy", bin("+", nm(bad), lit(1)))] },
    { text: `System.out.println(${x}.${N.get}() + ${bad});`, stmts: [pr(bin("+", call(x, N.get), nm(bad)))] },
  ];
  const badC = { ...rng.pick(badForms), invalid: "localDefaults", mis: null };
  const valid = [
    { text: `System.out.println(${later});`, stmts: [pr(nm(later))], mis: "assignedLater" },
    { text: `System.out.println(${x}.${N.get}());`, stmts: [pr(call(x, N.get))], mis: "fieldNeedsInit" },
    { text: `System.out.println(${x}.${N.getS}());`, stmts: [pr(call(x, N.getS))], mis: "nullPrintThrows" },
    { text: `System.out.println(${x}.${N.getS}().length());`, stmts: [pr(call(call(x, N.getS), "length"))], mis: "runtimeVsCompile", note: "compiles, but throws a NullPointerException when it runs (a runtime error, not a compile-time error)" },
    { text: `int copy = ${later} + ${x}.${N.get}();`, stmts: [decl("int", "copy", bin("+", nm(later), call(x, N.get)))], mis: "assignedLater" },
  ];
  const bare = valid[0];
  const cands = badC.text.startsWith("System.out.println(" + bad) ? [badC, bare, ...rng.sample(valid.slice(1), 2)] : [badC, ...rng.sample(valid, 3)];
  return {
    fam: "defaults.local", program: P([c], [], base),
    q: { kind: "select", want: "fails", cands: rng.shuffle(cands) },
    prompt: "Each choice would be added at the end of this code. Which one causes a compile-time error?",
    focus: "Fields get default values, but local variables do not. The compiler rejects reading a local variable unless it has been assigned on every path before that point. The compiler does not evaluate conditions, so an assignment inside an if without an else does not count, even when the condition would always be true when the program runs.",
  };
}

/* ================= Constructor initialization ================= */
function constructorTrace({ rng, level, N, vars }) {
  const pickK = lvl(level,
    () => rng.pick(["param", "thisParam", "computed", "cond", "ternary", "shadowBug", "overload", "initThenCtor", "defaultOnly"]),
    () => rng.pick(["two", "twoThis", "twoSwapped", "overload", "cond", "computed", "shadowBug"]),
    () => rng.weighted([["chainDefault", 2], ["chainThenAdd", 2], ["twoShadow", 2], ["overloadChain", 2], ["initThenCtor", 1], ["cond", 1], ["twoSwapped", 1]]));
  const kind = pickK();
  const fields = [field("int", N.f)];
  const methods = [M.get(N)];
  const ctors = [];
  const news = []; // arg lists for objects
  const p = {};
  const twoField = ["two", "twoThis", "twoSwapped", "twoShadow"].includes(kind);
  if (twoField) { fields.push(field("int", N.f2)); methods.push(M.get2(N)); }
  switch (kind) {
    case "param": ctors.push(K.param(N)); break;
    case "thisParam": ctors.push(K.thisParam(N)); break;
    case "shadowBug": ctors.push(K.shadowBug(N)); break;
    case "computed": p.op = rng.pick(["*", "+", "-"]); p.k = rng.int(2, 5); ctors.push(K.computed(N, p)); break;
    case "cond": p.op = rng.pick(["<", "<=", ">"]); p.bound = rng.pick([0, 5, 10]); p.fallback = rng.pick([0, 1, p.bound]); ctors.push(p.op === ">" ? K.ternary(N, { op: ">", bound: p.bound + 10, hi: p.bound + 10 }) : K.cond(N, p)); break;
    case "ternary": ctors.push(K.ternary(N, { op: ">", bound: 10, hi: 10 })); break;
    case "two": ctors.push(K.two(N)); break;
    case "twoThis": ctors.push(K.twoThis(N)); break;
    case "twoSwapped": ctors.push(K.twoSwapped(N)); break;
    case "twoShadow": ctors.push(ctor([param("int", N.f), param("int", N.f2)], rng.chance(0.5) ? [asg(tf(N.f), nm(N.f)), asg(N.f2, nm(N.f2))] : [asg(N.f, nm(N.f)), asg(tf(N.f2), nm(N.f2))])); break;
    case "overload": ctors.push(K.defaultValue(N, { v: rng.int(1, 9) })); ctors.push(K.param(N)); break;
    case "defaultOnly": fields[0].init = rng.chance(0.5) ? lit(rng.int(1, 9)) : null; ctors.push(K.defaultValue(N, { v: rng.int(2, 12) })); break;
    case "chainDefault": ctors.push(K.thisParam(N)); ctors.push(K.chainDefault(N, { v: rng.int(2, 9) })); break;
    case "chainThenAdd": ctors.push(K.thisParam(N)); ctors.push(K.chainThenAdd(N, { v: rng.int(2, 9), k: rng.int(2, 6) })); break;
    case "overloadChain": ctors.push(K.computed(N, { op: "*", k: rng.int(2, 3) })); ctors.push(K.chainDefault(N, { v: rng.int(2, 6) })); break;
    case "initThenCtor": fields[0].init = lit(rng.int(2, 9)); ctors.push(ctor([param("int", "start")], [asg(N.f, nm("start"), rng.pick(["+=", "*="]))])); break;
  }
  const arity = (k) => k.params.length;
  const nObj = lvl(level, 2, 2, rng.int(2, 3));
  for (let i = 0; i < nObj; i++) {
    const k = rng.pick(ctors);
    const args = Array.from({ length: arity(k) }, () => {
      if (kind === "cond" && rng.chance(0.5)) return lit(rng.pick([p.bound - 1, p.bound, p.bound + 1, -3]));
      return lit(rng.int(1, 15));
    });
    news.push(args);
  }
  // make overloaded families actually use both constructors
  if (ctors.length > 1 && news.every((a) => a.length === news[0].length)) news[news.length - 1] = news[0].length ? [] : [lit(rng.int(1, 15))];
  const main = news.map((args, i) => decl(N.cls, vars[i], nw(N.cls, ...args)));
  const forceUpdate = level === 2 && ["initThenCtor", "cond", "twoSwapped"].includes(kind);
  if (forceUpdate || rng.chance(level === 0 ? 0.4 : 0.35)) { methods.push(M.add(N)); main.push(ex(call(vars[rng.int(0, nObj - 1)], N.add, lit(rng.int(1, 6))))); }
  for (let i = 0; i < nObj; i++) {
    main.push(pr(twoField ? bin("+", bin("+", call(vars[i], N.get), str(" ")), call(vars[i], N.get2)) : call(vars[i], N.get)));
  }
  const prog = P([cls(N.cls, fields, ctors, methods)], [], main);
  const argOrder = [];
  if (twoField) {
    const q = clone(prog); let changed = false;
    q.main.forEach((s) => { if (s.k === "decl" && s.e?.k === "new" && s.e.args.length === 2) { s.e.args.reverse(); changed = true; } });
    if (changed) argOrder.push({ program: q, mis: "argOrder" });
  }
  return {
    fam: "constructors.trace", program: prog, q: { kind: "output" },
    prompt: nObj > 1 || twoField ? "What is printed when this code runs?" : `What does ${vars[0]}.${N.get}() return, as printed by this code?`,
    mis: ["forgetCtor", "shadowAssignsField", "skipChain", "chainAfterBody", "initializerAfterCtor", "instanceAsStatic", "defaultsNull", "ctorOnce", "compoundAsReplace"],
    alts: [...mutBoundary(prog), ...argOrder, ...mutDropCall(prog), ...ignoreComputation(prog)],
    extra: selfAssignExtra(prog),
    focus: "new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field.",
  };
}

/* Alternative reading: the constructor stores its argument unchanged (ignores the computation or condition). */
function ignoreComputation(prog) {
  const q = clone(prog); let changed = false;
  for (const c of q.classes) for (const k of c.ctors) {
    if (k.params.length !== 1 || k.params[0].t !== "int") continue;
    const pn = k.params[0].n;
    const body = k.body;
    if (body.length === 1 && body[0].k === "if") { const tgt = body[0].el?.[0]?.tg || body[0].th[0].tg; k.body = [asg(tgt, nm(pn))]; changed = true; continue; }
    for (const st of body) if (st.k === "asg" && st.op === "=" && st.e.k !== "name") { st.e = nm(pn); changed = true; }
  }
  return changed ? [{ program: q, mis: "ignoresComputation" }] : [];
}
/* "x = x;" compiles (it has no effect); students often believe it is a compile-time error */
function selfAssignExtra(prog) {
  const bug = prog.classes.some((c) => [...c.ctors, ...c.methods].some((k) => k.body.some((st) => st.k === "asg" && st.tg.k === "name" && st.e.k === "name" && st.tg.n === st.e.n)));
  return bug ? [{ text: "The code does not compile", mis: "selfAssignError", rank: 1 }] : [];
}

/* ================= Getters and encapsulation ================= */
function gettersComputed({ rng, level, N, vars }) {
  const pk = { k: rng.int(2, 6), op: rng.pick(["+", "*"]) };
  const pb = { op: rng.pick([">=", ">"]), t: rng.int(8, 20) };
  const kinds = lvl(level, [rng.pick(["bonus", "bool"])], rng.sample(["bonus", "bool", "sum"], 2), rng.sample(["bonus", "bool", "sum"], rng.int(2, 3)));
  const fields = [field("int", N.f)];
  const methods = [M.get(N)];
  if (kinds.includes("sum")) { fields.push(field("int", N.f2)); }
  if (kinds.includes("bonus")) methods.push(M.bonus(N, pk));
  if (kinds.includes("bool")) methods.push(M.boolGet(N, pb));
  if (kinds.includes("sum")) methods.push(M.sumGet(N));
  const ctors = [kinds.includes("sum") ? K.two(N) : K.param(N)];
  const nObj = lvl(level, 1, rng.int(1, 2), 2);
  const main = [];
  for (let i = 0; i < nObj; i++) {
    const v = rng.chance(0.5) && kinds.includes("bool") ? pb.t + rng.pick([-1, 0, 1]) : rng.int(2, 18);
    main.push(decl(N.cls, vars[i], nw(N.cls, ...(kinds.includes("sum") ? [lit(v), lit(rng.int(1, 9))] : [lit(v)]))));
  }
  if (level >= 1) {
    methods.push(M.add(N));
    const nm2 = lvl(level, 0, 1, rng.int(1, 2));
    for (let i = 0; i < nm2; i++) main.push(ex(call(vars[rng.int(0, nObj - 1)], N.add, lit(rng.int(1, 5)))));
  }
  const accName = { bonus: N.bonus, bool: N.bool, sum: "getTotal" };
  const prints = [];
  const order = rng.shuffle(kinds);
  for (const kd of order.slice(0, lvl(level, 1, 2, 2))) prints.push(pr(call(rng.pick(vars.slice(0, nObj)), accName[kd])));
  // reading the plain getter after a computed accessor exposes the "accessor stores" misconception
  if (kinds.includes("bonus") && rng.chance(level === 0 ? 0.5 : 0.7)) { const v = vars[0]; prints.splice(0, 0, pr(call(v, N.bonus))); prints.push(pr(call(v, N.get))); }
  const prog = P([cls(N.cls, fields, ctors, methods)], [], [...main, ...prints.slice(0, lvl(level, 2, 3, 3))]);
  return {
    fam: "getters.computed", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["accessorStores", "onlyLastUpdate", "compoundAsReplace", "instanceAsStatic", "forgetCtor"],
    alts: [...mutBoundary(prog), ...mutDropCall(prog), ...mutSwapReceiver(prog, refVarsOf(prog)), ...rawAccessor(prog, N)],
    focus: "An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field.",
  };
}
function gettersAccess({ rng, level, N, vars }) {
  const x = vars[0];
  const pubName = rng.pick(["level", "id", "rank", "tier"].filter((n) => n !== N.f && n !== N.f2 && n !== N.s));
  const fields = [field("int", N.f)];
  const methods = [M.get(N)];
  const hasPub = level >= 1 && rng.chance(0.6);
  if (hasPub) fields.push(field("int", pubName, { acc: "public" }));
  const hasPrivHelper = level === 2 && rng.chance(0.6);
  if (hasPrivHelper) methods.push(method("adjust", "int", [], [ret(bin("+", nm(N.f), lit(1)))], { acc: "private" }));
  const hasStatic = level === 2 && rng.chance(0.5);
  if (hasStatic) { fields.push(field("int", "made", { st: true, init: lit(0) })); methods.push(method("getMade", "int", [], [ret(nm("made"))], { st: true })); }
  const c = cls(N.cls, fields, [K.param(N)], methods);
  const all = [
    { text: `int v = ${x}.${N.get}();`, stmts: [decl("int", "v", call(x, N.get))], ok: true },
    { text: `int v = ${x}.${N.f};`, stmts: [decl("int", "v", fld(x, N.f))], invalid: "privateAccess", mis: "privateAccess" },
    { text: `int v = ${N.cls}.${N.get}();`, stmts: null, invalid: "staticContext", mis: "staticContext" },
    { text: `int v = ${x}.${N.get};`, stmts: null, invalid: "missingParens", mis: "missingParens" },
    { text: `int v = ${N.get}(${x});`, stmts: null, invalid: "wrongCallForm", mis: "wrongCallForm" },
  ];
  if (hasPub) all.push({ text: `int v = ${x}.${pubName};`, stmts: [decl("int", "v", fld(x, pubName))], ok: true });
  if (hasPrivHelper) all.push({ text: `int v = ${x}.adjust();`, stmts: null, invalid: "privateAccess", mis: "privateAccess" });
  if (hasStatic) all.push({ text: `int v = ${N.cls}.getMade();`, stmts: [decl("int", "v", scall(N.cls, "getMade"))], ok: true });
  const valid = all.filter((a) => !a.invalid), invalid = all.filter((a) => a.invalid);
  const want = "compiles";
  const cands = [rng.pick(valid), ...rng.sample(invalid, 3)];
  return {
    fam: "getters.access", program: P([c], [], [decl(N.cls, x, nw(N.cls, lit(rng.int(1, 20))))]),
    q: { kind: "select", want, cands: rng.shuffle(cands).map((c2) => ({ ...c2, stmts: c2.stmts || invalidStmts(c2.invalid, N, x) })) },
    prompt: want === "compiles" ? "This code is in main, in a different class. Which statement compiles?" : "This code is in main, in a different class. Which statement does NOT compile?",
    focus: "From outside the class you can use only its public members: call public methods on an object with dot notation and parentheses; private fields and methods are hidden; static members are used through the class name.",
  };
}
/* Alternative reading: the computed accessor just returns the stored field (or the opposite truth value). */
function rawAccessor(prog, N) {
  const out = [];
  const q = clone(prog);
  const m1 = q.classes[0].methods.find((m) => m.n === N.bonus);
  if (m1) { m1.body = [ret(nm(N.f))]; out.push({ program: q, mis: "ignoresComputation" }); }
  const q2 = clone(prog);
  const m2 = q2.classes[0].methods.find((m) => m.n === N.bool);
  if (m2) { const e = m2.body[0].e; m2.body = [ret({ k: "un", op: "!", e })]; out.push({ program: q2, mis: "invertedCondition" }); }
  return out;
}
/* IR for deliberately invalid statements (used only by the JVM test to confirm the compile error) */
function invalidStmts(kind, N, x) {
  switch (kind) {
    case "staticContext": return [decl("int", "v", scall(N.cls, N.get))];
    case "missingParens": return [decl("int", "v", fld(x, N.get))];
    case "wrongCallForm": return [decl("int", "v", call(null, N.get, nm(x)))];
    case "privateAccess": return [decl("int", "v", call(x, "adjust"))];
  }
  return null;
}
function gettersLocalCopy({ rng, level, N, vars }) {
  const x = vars[0];
  const methods = [M.get(N), M.add(N), M.set(N)];
  const c = cls(N.cls, [field("int", N.f)], [K.param(N)], methods);
  const start = rng.int(3, 15), k = rng.int(2, 9);
  const op = rng.pick(["+=", "*=", "="]);
  const main = [decl(N.cls, x, nw(N.cls, lit(start))), decl("int", "copy", call(x, N.get)), asg("copy", lit(op === "*=" ? rng.int(2, 3) : k), op)];
  if (level >= 1) main.splice(rng.pick([2, 3]), 0, ex(call(x, N.add, lit(rng.int(1, 6)))));
  if (level === 2) main.push(ex(call(x, N.set, nm("copy"))));
  const showBoth = rng.chance(0.6);
  main.push(pr(call(x, N.get)));
  if (showBoth) main.push(pr(nm("copy")));
  const prog = P([c], [], main);
  // alternative reading: the local is linked to the field (changes flow both ways)
  const linked = clone(prog);
  linked.main = linked.main.map((s) => {
    if (s.k === "asg" && s.tg.k === "name" && s.tg.n === "copy") {
      return s.op === "=" ? ex(call(x, N.set, s.e)) : ex(call(x, N.set, { k: "bin", op: s.op[0], l: call(x, N.get), r: s.e }));
    }
    if (s.k === "print" && s.e.k === "name" && s.e.n === "copy") return pr(call(x, N.get));
    if (s.k === "ex" && s.e.k === "call" && s.e.n === N.set && s.e.args[0]?.k === "name") return ex(call(x, N.set, call(x, N.get)));
    return s;
  });
  return {
    fam: "getters.localcopy", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["compoundAsReplace", "onlyLastUpdate", "setAdds"],
    alts: [{ program: linked, mis: "localCopyLinked" }, ...mutDropCall(prog)],
    focus: "A getter returns a copy of an int value. Changing the local variable afterward does not change the field, and changing the field does not change the local copy.",
  };
}

/* ================= Setters and state updates ================= */
const SETTER_POOL = [
  ["set", 0], ["add", 0], ["setGuard", 0], ["addGuard", 0], ["inc", 0], ["sub", 0],
  ["setClamp", 1], ["addClamp", 1], ["setIfHigher", 1], ["subFloor", 1], ["setGuardElse", 1], ["dbl", 1], ["reset", 1],
  ["setCounted", 2], ["addCounted", 2], ["subMax", 2],
];
function settersSequence({ rng, level, N, vars }) {
  const pool = SETTER_POOL.filter(([, l]) => l <= level).map(([n]) => n);
  const nKinds = lvl(level, rng.int(1, 2), rng.int(2, 3), rng.int(2, 3));
  let kinds = rng.sample(pool, nKinds);
  // a class has one "set" method: keep at most one setter variant and at most one add variant
  const setVariants = ["set", "setGuard", "setClamp", "setIfHigher", "setGuardElse", "setCounted"];
  const addVariants = ["add", "addGuard", "addClamp", "addCounted"];
  const subVariants = ["sub", "subFloor", "subMax"];
  for (const group of [setVariants, addVariants, subVariants]) { const g = kinds.filter((k) => group.includes(k)); if (g.length > 1) kinds = kinds.filter((k) => !g.slice(1).includes(k)); }
  const pr0 = { bound: rng.pick([0, 1, 5, 10]), op: rng.pick([">=", ">"]), cap: rng.pick([10, 20, 50]), fallback: rng.pick([0, 1]), resetTo: rng.pick([0, 1]) };
  const methods = [M.get(N), ...kinds.map((kd) => M[kd](N, pr0))];
  const counted = kinds.includes("setCounted") || kinds.includes("addCounted");
  const fields = [field("int", N.f)];
  if (counted) { fields.push(field("int", N.f2)); methods.push(M.get2(N)); }
  const c = cls(N.cls, fields, [K.param(N)], methods);
  const nObj = level === 2 && rng.chance(0.4) ? 2 : 1;
  const main = [];
  for (let i = 0; i < nObj; i++) main.push(decl(N.cls, vars[i], nw(N.cls, lit(rng.int(1, 12)))));
  const nCalls = lvl(level, rng.int(1, 2), 3, rng.int(4, 5));
  const nameOf = (kd) => M[kd](N, pr0).n;
  const argFor = (kd) => {
    if (/Guard|Counted/.test(kd)) return rng.pick([pr0.bound, pr0.bound - 1, pr0.bound + rng.int(1, 9), -rng.int(1, 5)]);
    if (/Clamp/.test(kd)) return rng.pick([pr0.cap - rng.int(1, 4), pr0.cap + rng.int(1, 9), rng.int(1, 9)]);
    if (kd === "setIfHigher") return rng.int(1, 20);
    if (kd === "subFloor") return rng.int(1, 15);
    return rng.int(1, 12);
  };
  for (let i = 0; i < nCalls; i++) {
    const kd = rng.pick(kinds);
    const recv = vars[rng.int(0, nObj - 1)];
    const noArg = kd === "inc" || kd === "dbl" || kd === "reset";
    main.push(ex(noArg ? call(recv, nameOf(kd)) : call(recv, nameOf(kd), lit(argFor(kd)))));
  }
  const printVars = nObj === 2 ? vars.slice(0, 2) : [vars[0]];
  for (const v of printVars) main.push(pr(counted && v === vars[0] ? bin("+", bin("+", call(v, N.get), str(" ")), call(v, N.get2)) : call(v, N.get)));
  const prog = P([c], [], main);
  return {
    fam: "setters.sequence", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["ignoreGuards", "compoundAsReplace", "setAdds", "ignoreClamp", "onlyLastUpdate"],
    alts: [...mutDropCall(prog), ...mutReorder(prog), ...mutBoundary(prog), ...mutSwapReceiver(prog, refVarsOf(prog))],
    focus: "Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update.",
  };
}

/* ================= this and parameter shadowing ================= */
function thisShadow({ rng, level, N, vars }) {
  const ctorKind = lvl(level, rng.pick(["thisParam", "shadowBug", "param"]), rng.pick(["thisParam", "shadowBug"]), rng.pick(["thisParam", "shadowBug", "twoShadow"]));
  const methodKinds = lvl(level, rng.chance(0.75) ? [rng.pick(["setThis", "setShadowBug", "addThis", "addLocalBug", "addLocalShadow"])] : [], rng.sample(["setThis", "setShadowBug", "addLocalShadow", "addLocalBug", "addThis"], 1), [rng.pick(["setThis", "setShadowBug"]), rng.pick(["addLocalShadow", "addLocalBug"])]);
  const extra = rng.int(1, 4);
  const fields = [field("int", N.f)];
  const methods = [M.get(N)];
  let ctors;
  if (ctorKind === "twoShadow") {
    fields.push(field("int", N.f2)); methods.push(M.get2(N));
    ctors = [ctor([param("int", N.f), param("int", N.f2)], rng.chance(0.5) ? [asg(tf(N.f), nm(N.f)), asg(N.f2, nm(N.f2))] : [asg(N.f, nm(N.f)), asg(tf(N.f2), nm(N.f2))])];
  } else ctors = [K[ctorKind](N)];
  for (const mk of methodKinds) methods.push(M[mk](N, { extra }));
  const c = cls(N.cls, fields, ctors, methods);
  const nObj = level === 0 ? 2 : level === 2 && rng.chance(0.4) ? 2 : rng.int(1, 2);
  const main = [];
  for (let i = 0; i < nObj; i++) main.push(decl(N.cls, vars[i], nw(N.cls, ...(ctorKind === "twoShadow" ? [lit(rng.int(2, 12)), lit(rng.int(2, 12))] : [lit(rng.int(2, 15))]))));
  for (const mk of methodKinds) {
    const name = M[mk](N, { extra }).n;
    main.push(ex(call(vars[rng.int(0, nObj - 1)], name, lit(rng.int(3, 20)))));
  }
  for (let i = 0; i < nObj; i++) main.push(pr(ctorKind === "twoShadow" ? bin("+", bin("+", call(vars[i], N.get), str(" ")), call(vars[i], N.get2)) : call(vars[i], N.get)));
  const prog = P([c], [], main);
  return {
    fam: "this.shadow", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["shadowAssignsField", "thisMeansParam", "forgetCtor", "compoundAsReplace", "instanceAsStatic", "defaultsNull"],
    alts: [...mutDropCall(prog), ...mutSwapReceiver(prog, refVarsOf(prog))],
    extra: selfAssignExtra(prog),
    focus: "Inside a constructor or method, a parameter or local variable with the same name as a field hides (shadows) the field. Only this.name refers to the field; a plain name refers to the parameter or local.",
  };
}
function thisReceiver({ rng, level, N, vars }) {
  const kinds = rng.sample(level === 0 ? ["copyFrom", "copyTo", "giveTo"] : ["copyFrom", "copyTo", "giveTo", "larger"], lvl(level, 1, 1, 2));
  const methods = [M.get(N), M.add(N), ...kinds.map((kd) => M[kd](N))];
  const c = cls(N.cls, [field("int", N.f)], [K.thisParam(N)], methods);
  const [a, b] = vars;
  const vals = distinct(rng, 2, 2, 20);
  const main = [decl(N.cls, a, nw(N.cls, lit(vals[0]))), decl(N.cls, b, nw(N.cls, lit(vals[1])))];
  for (const kd of kinds) {
    const [r, o] = rng.shuffle([a, b]);
    if (kd === "giveTo") main.push(ex(call(r, "giveTo", nm(o), lit(rng.int(1, 5)))));
    else if (kd === "larger") { main.push(decl(N.cls, vars[2], call(r, "larger", nm(o)))); main.push(ex(call(vars[2], N.add, lit(rng.int(1, 6))))); }
    else main.push(ex(call(r, kd, nm(o))));
  }
  if (level > 0 && rng.chance(0.4)) main.push(ex(call(rng.pick([a, b]), N.add, lit(rng.int(1, 6)))));
  main.push(pr(call(a, N.get)), pr(call(b, N.get)));
  const prog = P([c], [], main);
  return {
    fam: "this.receiver", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["thisIsArgument", "returnCopies", "returnThisCopies", "onlyLastUpdate", "aliasCopies", "instanceAsStatic", "compoundAsReplace", "forgetCtor"],
    alts: [...mutSwapReceiver(prog, [a, b]), ...mutDropCall(prog)],
    focus: "this is the object before the dot in the call; the parameter is the other object. A method can read and write both, and returning this returns the receiver itself.",
  };
}
function thisReturnThis({ rng, level, N, vars }) {
  if (level === 0) return null;
  const c = cls(N.cls, [field("int", N.f)], [K.thisParam(N)], [M.get(N), M.addReturnThis(N), M.setReturnThis(N)]);
  const [a, b] = vars;
  const chainLen = lvl(level, 0, 2, rng.int(2, 3));
  let e = nm(a);
  for (let i = 0; i < chainLen; i++) e = rng.chance(0.7) ? call(e, N.add, lit(rng.int(1, 6))) : call(e, N.set, lit(rng.int(5, 20)));
  const main = [decl(N.cls, a, nw(N.cls, lit(rng.int(1, 10)))), decl(N.cls, b, e)];
  main.push(ex(call(rng.pick([a, b]), N.add, lit(rng.int(1, 6)))));
  if (level === 2 && rng.chance(0.5)) main.push(ex(call(rng.pick([a, b]), N.set, lit(rng.int(10, 30)))));
  const outs = rng.shuffle([pr(call(a, N.get)), pr(bin("==", nm(a), nm(b)))]);
  if (level === 2) outs.push(pr(call(b, N.get)));
  const prog = P([c], [], [...main, ...outs]);
  return {
    fam: "this.returnthis", program: prog, q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["returnThisCopies", "aliasCopies", "onlyLastUpdate", "compoundAsReplace"],
    alts: [...mutDropCall(prog)],
    focus: "A method that ends with return this returns a reference to the same object, so chained calls all act on one object and the variable that stores the result is an alias.",
  };
}
void inc; void iff; void scall;

export default {
  defaults: [defaultsField, defaultsLocalCompile],
  constructors: [constructorTrace],
  getters: [gettersComputed, gettersAccess, gettersLocalCopy],
  setters: [settersSequence],
  this: [thisShadow, thisReceiver, thisReturnThis],
};
