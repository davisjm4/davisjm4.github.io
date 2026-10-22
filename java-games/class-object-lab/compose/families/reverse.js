/* Reverse reasoning: the student is given a target state and chooses the code fragment that
 * produces it. Every candidate is executed by the simulator (or is a deliberate compile error that
 * the JVM test confirms); the family keeps exactly one fragment that reaches the goal. */
import { lit, nm, fld, nw, call, scall, sfld, bin, decl, asg, ex, pr, field, cls, nul } from "../ir.js";
import { M, K } from "../components.js";
import { P, lvl, distinct } from "../kit.js";
import { simulate } from "../sim.js";
import { expr } from "../emit.js";

const stmtText = (s) => {
  switch (s.k) {
    case "decl": return `${s.t} ${s.n}${s.e ? " = " + expr(s.e) : ""};`;
    case "asg": return `${expr(s.tg)} ${s.op} ${expr(s.e)};`;
    case "ex": return `${expr(s.e)};`;
  }
  return "?";
};
const frag = (stmts, mis, extra = {}) => ({ text: stmts.map(stmtText).join(" "), stmts, mis, ...extra });
function truth(program, pre, cand, check) {
  if (cand.invalid) return false;
  try {
    const s = simulate({ ...program, main: [...program.main, ...pre, ...cand.stmts, pr(check)] });
    if (s.error || s.exc) return false;
    return s.out[s.out.length - 1] === "true";
  } catch { return false; }
}
/* keep exactly one true candidate and three false ones carrying misconceptions */
function assemble(rng, program, pre, pool, check) {
  const scored = pool.map((c) => ({ ...c, ok: truth(program, pre, c, check) }));
  const trues = scored.filter((c) => c.ok && !c.invalid);
  const falses = scored.filter((c) => !c.ok && c.mis);
  if (!trues.length || falses.length < 3) return null;
  const uniq = []; for (const f of rng.shuffle(falses)) if (!uniq.some((u) => u.text === f.text) && !trues.some((t) => t.text === f.text)) uniq.push(f);
  const byMis = []; const seen = new Set();
  for (const f of uniq) if (!seen.has(f.mis)) { seen.add(f.mis); byMis.push(f); }
  for (const f of uniq) if (byMis.length < 3 && !byMis.includes(f)) byMis.push(f);
  if (byMis.length < 3) return null;
  const answer = rng.pick(trues);
  let chosen = byMis.slice(0, 3);
  // length balance: avoid making the correct fragment the uniquely longest choice when avoidable
  if (!chosen.some((f) => f.text.length >= answer.text.length)) {
    const longer = uniq.filter((f) => !chosen.includes(f) && f.text.length >= answer.text.length);
    if (longer.length) chosen = [...chosen.slice(0, 2), longer.find((f) => !chosen.some((x) => x.mis === f.mis)) || longer[0]];
  }
  return rng.shuffle([answer, ...chosen]).map(({ ok, ...c }) => c);
}

/* ---- reach a target field value ---- */
function reverseValue({ rng, level, N, vars }) {
  const setKind = lvl(level, rng.pick(["set", "setGuard"]), rng.pick(["set", "setGuard", "setClamp", "setIfHigher"]), rng.pick(["setGuard", "setClamp", "setIfHigher", "setGuardElse"]));
  const addKind = lvl(level, "add", rng.pick(["add", "addGuard"]), rng.pick(["addGuard", "addClamp", "add"]));
  const p0 = { bound: rng.pick([0, 1]), op: ">=", cap: rng.pick([20, 30]), fallback: 0 };
  const methods = [M.get(N), M[setKind](N, p0), M[addKind](N, p0)];
  const c = cls(N.cls, [field("int", N.f)], [K.param(N)], methods);
  const [x, y] = vars;
  const start = rng.int(2, 12);
  const main = [decl(N.cls, x, nw(N.cls, lit(start)))];
  if (level >= 1) main.push(decl(N.cls, y, nw(N.cls, lit(rng.int(2, 12)))));
  if (level === 2) main.push(ex(call(rng.pick([x, y]), M[addKind](N, p0).n, lit(rng.int(1, 6)))));
  const prog = P([c], [], main);
  const cur = simulate(prog).heap.get(1).f[N.f].v;
  const setN = M[setKind](N, p0).n, addN = M[addKind](N, p0).n;
  const T = rng.pick([cur + rng.int(2, 8), rng.int(Math.max(cur + 1, 5), 25), Math.max(1, cur - rng.int(1, 4))]);
  const pool = [
    frag([ex(call(x, setN, lit(T)))], "addVsSet"),
    frag([ex(call(x, addN, lit(T - cur)))], "addVsSet"),
    frag([ex(call(x, addN, lit(T)))], "addVsSet"),
    frag([ex(call(x, setN, lit(T - cur)))], "addVsSet"),
    frag([ex(call(x, addN, lit(T - start)))], "lostUpdate"),
    frag([asg(fld(x, N.f), lit(T))], "privateAccess", { invalid: "privateAccess" }),
    frag([ex(scall(N.cls, setN, lit(T)))], "staticContext", { invalid: "staticContext" }),
    frag([ex(call(x, setN, lit(-T)))], "rejectedValue"),
  ];
  if (level >= 1) pool.push(frag([ex(call(y, setN, lit(T)))], "wrongTarget"), frag([ex(call(y, addN, lit(T - cur)))], "wrongTarget"));
  const check = bin("==", call(x, N.get), lit(T));
  const cands = assemble(rng, prog, [], pool, check);
  if (!cands) return null;
  return {
    fam: "reverse.value", program: prog, q: { kind: "select", want: "goal", check, cands },
    prompt: `Which statement, added at the end, makes ${x}.${N.get}() return ${T}?`,
    focus: "Work out the current state first, then check what each method does with its argument (replace, add, reject, or limit). Private fields cannot be assigned from outside the class.",
  };
}

/* ---- reach a reference relationship ---- */
function reverseReference({ rng, level, N, vars }) {
  const [a, b, c] = vars;
  const methods = [M.get(N), M.add(N)];
  const useCopy = level >= 1;
  if (useCopy) methods.push(M.copy(N));
  const cl = cls(N.cls, [field("int", N.f)], [K.param(N)], methods);
  const v = distinct(rng, 3, 1, 20);
  const bAlias = level === 2 && rng.chance(0.5);
  const main = [decl(N.cls, a, nw(N.cls, lit(v[0]))), decl(N.cls, b, bAlias ? nm(a) : nw(N.cls, lit(rng.chance(0.4) ? v[0] : v[1]))), decl(N.cls, c, level === 0 || rng.chance(0.5) ? nul() : nw(N.cls, lit(v[2])))];
  if (level === 2 && rng.chance(0.5)) main.push(ex(call(rng.pick([a, b]), N.add, lit(rng.int(1, 5)))));
  const prog = P([cl], [], main);
  const goal = level === 0 ? "alias" : rng.pick(["alias", "copy"]);
  const pre = [decl(N.cls, "__orig", nm(a))];
  const check = goal === "alias" ? bin("==", nm(c), nm("__orig")) : bin("&&", bin("!=", nm(c), nm("__orig")), bin("==", call(c, N.get), call("__orig", N.get)));
  const pool = [
    frag([asg(c, nm(a))], goal === "alias" ? "aliasNotCopy" : "aliasNotCopy"),
    frag([asg(c, nw(N.cls, call(a, N.get)))], "copyNotAlias"),
    frag([asg(a, nm(c))], "aliasDirection"),
    frag([asg(c, nm(b))], "wrongTarget"),
    frag([decl(N.cls, ["d", "extra", "spare"].find((n) => ![a, b, c].includes(n)), nm(a))], "wrongTarget"),
  ];
  if (useCopy) pool.push(frag([asg(c, call(a, "copy"))], "copyNotAlias"));
  if (goal === "copy") pool.push(frag([asg(c, nw(N.cls, lit(v[0] === 0 ? 1 : 0)))], "wrongTarget"));
  const cands = assemble(rng, prog, pre, pool, check);
  if (!cands) return null;
  return {
    fam: "reverse.reference", program: prog, q: { kind: "select", want: "goal", check, pre, cands },
    prompt: goal === "alias" ? `Which statement, added at the end, makes ${c} refer to the same object that ${a} refers to now?` : `Which statement, added at the end, makes ${c} refer to a separate object that has the same ${N.f} as ${a}'s object?`,
    focus: "Assigning a reference (c = a) makes an alias; new (directly or in a method such as copy) makes a separate object. The variable on the left of = is the one that changes.",
  };
}

/* ---- choose the constructor call that produces a target state ---- */
function reverseConstruct({ rng, level, N, vars }) {
  const kind = lvl(level, rng.pick(["param", "computed"]), rng.pick(["computed", "cond", "overload"]), rng.pick(["cond", "chainThenAdd", "computed2", "overload"]));
  const fields = [field("int", N.f)];
  const ctors = [];
  let solve; // arg -> value
  const k = rng.int(2, 4), bound = rng.pick([0, 5, 10]), off = rng.int(2, 6);
  switch (kind) {
    case "param": ctors.push(K.param(N)); solve = (x) => x; break;
    case "computed": { const op = rng.pick(["*", "+"]); ctors.push(K.computed(N, { op, k })); solve = (x) => (op === "*" ? x * k : x + k); break; }
    case "computed2": ctors.push({ params: [{ t: "int", n: "start" }], body: [asg(N.f, bin("-", bin("*", nm("start"), lit(k)), lit(off)))], acc: "public", chain: null }); solve = (x) => x * k - off; break;
    case "cond": ctors.push(K.cond(N, { op: "<", bound, fallback: bound })); solve = (x) => (x < bound ? bound : x); break;
    case "overload": ctors.push(K.defaultValue(N, { v: off })); ctors.push(K.computed(N, { op: "*", k })); solve = (x) => (x == null ? off : x * k); break;
    case "chainThenAdd": ctors.push(K.thisParam(N)); ctors.push(K.chainThenAdd(N, { v: off, k })); solve = (x) => (x == null ? off + k : x); break;
  }
  const cl = cls(N.cls, fields, ctors, [M.get(N)]);
  const prog = P([cl], [], []);
  const z = vars[0];
  // pick a target reachable by exactly one argument shape
  let argOk = rng.int(bound + 1, bound + 9);
  if (kind === "overload" || kind === "chainThenAdd") argOk = rng.chance(0.5) ? null : argOk;
  const T = solve(argOk);
  const mk = (arg) => [decl(N.cls, z, arg == null ? nw(N.cls) : nw(N.cls, lit(arg)))];
  const pool = [
    frag(mk(argOk), "none"),
    frag(mk(T), "forgetCtor"),
    ...(kind === "computed" || kind === "computed2" || kind === "overload" ? [frag(mk(T * k), "inverseWrong"), frag(mk(T + k), "inverseWrong"), frag(mk(Math.max(1, T - k)), "inverseWrong")] : []),
    ...(kind === "cond" ? [frag(mk(bound - rng.int(1, 3)), "rejectedValue"), frag(mk(T + 1), "boundary"), frag(mk(-T), "rejectedValue")] : []),
    ...(kind === "overload" || kind === "chainThenAdd" ? [frag(mk(argOk == null ? off : null), "skipChain"), frag(mk(argOk == null ? T - k : T), "chainAfterBody")] : []),
    frag([decl(N.cls, z, nw(N.cls, lit(T), lit(0)))], "wrongArity", { invalid: "wrongArity" }),
  ];
  const check = bin("==", call(z, N.get), lit(T));
  const cands = assemble(rng, prog, [], pool.filter((f) => f.mis !== "none" || true).map((f) => (f.mis === "none" ? { ...f, mis: null } : f)), check);
  if (!cands) return null;
  return {
    fam: "reverse.construct", program: prog, q: { kind: "select", want: "goal", check, cands },
    prompt: `Which statement creates a ${N.cls} whose ${N.get}() returns ${T}?`,
    focus: "Run the matching constructor for each choice: compute the field from the argument (including any condition or this(...) call) and compare it with the target.",
  };
}

/* ---- choose a two-step sequence (Advanced) ---- */
function reverseSequence({ rng, level, N, vars }) {
  if (level < 2) return null;
  const p0 = { bound: rng.pick([0, 5]), op: ">=", cap: rng.pick([20, 25]) };
  const sk = rng.pick(["setGuard", "setIfHigher", "setClamp"]), ak = rng.pick(["add", "addClamp", "addGuard"]);
  const cl = cls(N.cls, [field("int", N.f)], [K.param(N)], [M.get(N), M[sk](N, p0), M[ak](N, p0)]);
  const x = vars[0];
  const start = rng.int(3, 10);
  const prog = P([cl], [], [decl(N.cls, x, nw(N.cls, lit(start)))]);
  const sN = M[sk](N, p0).n, aN = M[ak](N, p0).n;
  const a1 = rng.int(2, 8), s1 = rng.int(6, 18);
  const seqs = [
    [ex(call(x, aN, lit(a1))), ex(call(x, sN, lit(s1)))],
    [ex(call(x, sN, lit(s1))), ex(call(x, aN, lit(a1)))],
    [ex(call(x, aN, lit(a1))), ex(call(x, aN, lit(s1)))],
    [ex(call(x, sN, lit(a1))), ex(call(x, sN, lit(s1)))],
    [ex(call(x, sN, lit(-s1))), ex(call(x, aN, lit(a1)))],
  ];
  const target = rng.pick(seqs.slice(0, 2));
  const T = simulate({ ...prog, main: [...prog.main, ...target] }).heap.get(1).f[N.f].v;
  const mis = ["orderSwap", "orderSwap", "addVsSet", "addVsSet", "rejectedValue"];
  const pool = seqs.map((s, i) => frag(s, mis[i]));
  const check = bin("==", call(x, N.get), lit(T));
  const cands = assemble(rng, prog, [], pool, check);
  if (!cands) return null;
  return {
    fam: "reverse.sequence", program: prog, q: { kind: "select", want: "goal", check, cands },
    prompt: `Which pair of statements, added at the end, leaves ${x}.${N.get}() returning ${T}?`,
    focus: "Trace each pair in order from the current state; conditions and limits inside the methods depend on the value at the moment of each call.",
  };
}

/* ---- reach a static count (Intermediate / Advanced) ---- */
function reverseStatic({ rng, level, N, vars }) {
  if (level === 0) return null;
  const fields = [field("int", N.f), field("int", N.st, { st: true, init: lit(0), acc: "public" })];
  const methods = [M.get(N), M.add(N)];
  if (level === 2) methods.push(M.copy(N));
  const cl = cls(N.cls, fields, [K.counted(N)], methods);
  const [a, b] = vars;
  const n0 = rng.int(1, 2);
  const main = [decl(N.cls, a, nw(N.cls, lit(rng.int(1, 9))))];
  if (n0 === 2) main.push(decl(N.cls, vars[2], nw(N.cls, lit(rng.int(1, 9)))));
  const prog = P([cl], [], main);
  const T = n0 + 1;
  const pool = [
    frag([decl(N.cls, b, nw(N.cls, lit(rng.int(1, 9))))], null),
    frag([decl(N.cls, b, nm(a))], "aliasCreates"),
    frag([ex(call(a, N.add, lit(1)))], "staticAsInstance"),
    frag([decl(N.cls, b, nul())], "nullIsObject"),
    frag([asg(sfld(N.cls, N.st), lit(T), "+=")], "compoundAsReplace"),
  ];
  if (level === 2) pool.push(frag([decl(N.cls, b, call(a, "copy"))], null));
  const check = bin("==", sfld(N.cls, N.st), lit(T));
  const cands = assemble(rng, prog, [], pool, check);
  if (!cands) return null;
  return {
    fam: "reverse.static", program: prog, q: { kind: "select", want: "goal", check, cands },
    prompt: `Which statement, added at the end, makes ${N.cls}.${N.st} equal ${T}?`,
    focus: `${N.cls}.${N.st} is a static counter incremented by the constructor, so it changes only when a new ${N.cls} is constructed (directly or inside a method).`,
  };
}

export default { reverse: [reverseValue, reverseReference, reverseConstruct, reverseSequence, reverseStatic] };
