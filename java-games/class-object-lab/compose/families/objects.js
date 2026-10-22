/* Object-identity families: Class versus object, Object references and aliases,
 * Reference equality, Multiple independent objects. */
import { nm, call, pr, bin, str, nul, lit, decl, nw } from "../ir.js";
import { expr } from "../emit.js";
import { planRefs, refClass } from "../planner.js";
import { P, lvl, refVarsOf, mutSwapReceiver, mutDropCall } from "../kit.js";
import { opKind } from "../signature.js";


/* ---------------- Class versus object ---------------- */
/* Counting models computed from the program text and the simulation, so the relevance check can
 * recompute them for a program with a statement removed. */
function structureModels(program, sim, what) {
  const ops = program.main.map(opKind);
  const copies = ops.filter((o) => o === "decl-alias" || o === "reassign-alias" || o === "decl-call-ret" && false).length
    + program.main.filter((s) => (s.k === "decl" || s.k === "asg") && s.e && s.e.k === "call" && (s.e.n === "self" || s.e.n === "same")).length;
  const inside = program.main.filter((s) => (s.k === "decl" || s.k === "asg") && s.e && s.e.k === "call" && (s.e.n === "copy" || s.e.n === "make")).length;
  const temps = ops.filter((o) => o === "temp-new" || o === "temp-call").length;
  const nullDecls = ops.filter((o) => o === "decl-null").length;
  const refVars = refVarsOf(program).length;
  const created = sim.created, reach = sim.reachable();
  const nonNull = Object.values(sim.vars).filter((v) => v.k === "r").length;
  const m = [];
  if (what === "created") {
    m.push({ value: refVars, mis: "variablesAreObjects" });
    if (copies) m.push({ value: created + copies, mis: "aliasCreates" });
    if (temps + inside) m.push({ value: created - temps - inside, mis: "ignoresTemporaries" });
    if (nullDecls) m.push({ value: created + nullDecls, mis: "nullIsObject" });
    m.push({ value: reach, mis: "createdVsReachable" });
  } else {
    m.push({ value: created, mis: "createdVsReachable" });
    m.push({ value: nonNull, mis: "variablesAreObjects" });
    if (copies) m.push({ value: reach + copies, mis: "aliasCreates" });
    if (nullDecls) m.push({ value: reach + nullDecls, mis: "nullIsObject" });
  }
  return m;
}
function structureCount({ rng, level, N, vars }) {
  const cfg = lvl(level,
    { ops: [["declNew", 3], ["declNull", 2], ["declUninit", 2], ["declAlias", 3], ["tempNew", 1]], len: [4, 5], maxObjects: 2, maxRefs: 4, require: ["declNew", ...rng.sample(["declNull", "declUninit", "declAlias"], 2)] },
    { ops: [["declNew", 3], ["declNull", 1], ["declUninit", 1], ["declAlias", 2], ["asgNew", 2], ["asgAlias", 2], ["asgNull", 1], ["tempNew", 1], ["declCopy", 1]], len: [4, 6], maxObjects: 3, maxRefs: 4, require: ["declNew", rng.pick(["asgNew", "asgAlias", "tempNew", "declCopy", "asgNull"])] },
    { ops: [["declNew", 2], ["declAlias", 2], ["asgNew", 2], ["asgAlias", 2], ["asgNull", 1], ["tempNew", 1], ["tempCall", 1], ["declCopy", 1], ["declMake", 1], ["declSame", 1], ["declSelf", 1], ["asgCopy", 1]], len: [5, 7], maxObjects: 4, maxRefs: 4, require: ["declNew", ...rng.sample(["declMake", "declSame", "declSelf", "declCopy", "tempCall", "asgCopy"], 2)] });
  const plan = planRefs(rng, N, vars, cfg);
  if (!plan) return null;
  const { classes, helpers } = refClass(N, plan.log, { noGetter: true });
  const what = level === 0 ? (rng.chance(0.25) ? "reachable" : "created") : rng.chance(lvl(level, 0, 0.45, 0.6)) ? "reachable" : "created";
  const ops = plan.log.map((l) => l.op);
  return {
    fam: "structure.count",
    program: P(classes, helpers, plan.main),
    q: { kind: "count", what, cls: N.cls },
    prompt: what === "created" ? `How many ${N.cls} objects are created when this code runs?` : `After this code runs, how many different ${N.cls} objects are still referred to by at least one variable?`,
    // for "created" the order of operations cannot change the count: canonicalise as a multiset
    canon: what === "created" ? "created:" + [...ops].sort().join(",") : null,
    countModels: (sim, program) => structureModels(program, sim, what),
    focus: what === "created" ? `Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing.` : `Count the distinct objects that some variable still refers to at the end. Reassigning a variable can leave an earlier object with no references.`,
  };
}

/* "Which object does x refer to?" -- order-sensitive reference tracing for Beginner/Intermediate */
function describeObj(sim, program, id) {
  const o = sim.heap.get(id);
  if (o.clone) return "a separate copy of " + describeObj(sim, program, o.src);
  const a = sim.trace.allocs.find((x) => x.id === id);
  const st = a && program.main[a.stmt];
  const e = st && (st.e?.k === "new" ? st.e : null);
  return e ? `the object created by ${expr(e)}` : "an object created inside a method";
}
function refersTo(sim, program, x) {
  const v = sim.vars[x];
  if (!v) return null;
  if (v.k === "n") return `no object (${x} is null)`;
  if (v.k !== "r") return null;
  return describeObj(sim, program, v.id);
}
function structureRefersTo({ rng, level, N, vars }) {
  if (level === 2) return null;
  const cfg = lvl(level,
    { ops: [["declNew", 2], ["declAlias", 3], ["declNull", 1], ["asgAlias", 1], ["asgNew", 1]], len: [3, 5], maxObjects: 2, maxRefs: 4, equalArgs: 0, require: ["declNew", "declAlias", rng.pick(["declNew", "declAlias", "asgAlias", "declNull"])] },
    { ops: [["declNew", 2], ["declAlias", 2], ["declNull", 1], ["asgAlias", 2], ["asgNew", 2], ["asgNull", 1]], len: [5, 6], maxObjects: 3, maxRefs: 4, equalArgs: 0, require: ["declNew", "declAlias", rng.pick(["asgAlias", "asgNew", "asgNull"]), rng.pick(["asgAlias", "asgNew"])] },
    null);
  const plan = planRefs(rng, N, vars, cfg);
  if (!plan) return null;
  const { classes, helpers } = refClass(N, plan.log, { noGetter: true });
  // ask about a variable whose value came from a copy (alias) when possible
  const aliasVars = plan.log.filter((l) => l.op === "declAlias" || l.op === "asgAlias").map((l) => l.v);
  const declared = refVarsOf({ main: plan.main }).filter((v) => plan.model.vars.get(v) !== "unassigned");
  const x = aliasVars.length && rng.chance(0.8) ? rng.pick(aliasVars) : rng.pick(declared);
  const program = P(classes, helpers, plan.main);
  return {
    fam: "structure.refersto", program,
    q: { kind: "value", what: "refersTo", v: x, measure: (s, p) => refersTo(s, p, x) },
    prompt: `After this code runs, which object does ${x} refer to?`,
    mis: ["aliasCopies", "reassignMutates", "nullPropagates"],
    models(sim, p) {
      const out = [];
      // "a variable refers to another variable": follow the source variable to its final object
      const src = new Map();
      for (const st of p.main) {
        if (st.k === "decl" || st.k === "asg") {
          const n = st.k === "decl" ? st.n : st.tg.n;
          if (st.e && st.e.k === "name") src.set(n, st.e.n); else src.delete(n);
        }
      }
      let cur = x, guard = 0; while (src.has(cur) && guard++ < 6) cur = src.get(cur);
      if (cur !== x) { const t = refersTo(sim, p, cur); if (t) out.push({ text: t, mis: "aliasFollowsVariable" }); }
      // "the most recently created object" / "the first object" (declaration-order guesses)
      const allocs = sim.trace.allocs.filter((a) => !sim.heap.get(a.id).clone);
      if (allocs.length) { out.push({ text: describeObj(sim, p, allocs[allocs.length - 1].id), mis: "latestObject" }); out.push({ text: describeObj(sim, p, allocs[0].id), mis: "firstObject" }); }
      if (sim.vars[x]?.k === "r") out.push({ text: `a new object created by the assignment`, mis: "aliasCreates" }); else out.push({ text: `an empty ${N.cls} object`, mis: "nullIsObject" });
      return out;
    },
    focus: "A reference variable holds a reference to an object (or null). Assigning one variable to another copies the reference at that moment; it does not link the two variables.",
  };
}

/* ---------------- Object references and aliases ---------------- */
function printsFor(rng, plan, n) {
  // prefer variables involved in aliasing / reassignment so the answer depends on the reference graph
  const involved = new Set(plan.log.filter((l) => ["declAlias", "asgAlias", "declSelf", "declSame", "asgSame", "asgNew", "asgNull", "declCopy", "asgCopy"].includes(l.op)).flatMap((l) => [l.v, l.s].filter(Boolean)));
  const live = plan.live;
  const pref = live.filter((v) => involved.has(v));
  const pool = rng.shuffle(pref.length >= n ? pref : [...pref, ...live.filter((v) => !pref.includes(v))]);
  return pool.slice(0, n);
}
function aliasTrace({ rng, level, N, vars }) {
  const cfg = lvl(level,
    { ops: [["mutate", 4], ["set", 1], ["incr", 1], ["declNew", 1], ["declAlias", 1]], len: [4, 5], maxObjects: 2, maxRefs: 3, require: ["declNew", "declAlias", "mutate", rng.pick(["mutate", "set", "incr"])] },
    { ops: [["mutate", 3], ["set", 1], ["incr", 1], ["asgNew", 2], ["asgAlias", 2], ["declAlias", 1], ["declNew", 1]], len: [5, 6], maxObjects: 3, maxRefs: 3, require: ["declNew", "declAlias", rng.pick(["asgNew", "asgAlias"]), "mutate"] },
    { ops: [["mutate", 3], ["set", 1], ["asgNew", 2], ["asgAlias", 1], ["asgNull", 1], ["declSelf", 1], ["declSame", 1], ["declCopy", 1], ["asgSame", 1], ["declAlias", 1], ["declNew", 1]], len: [6, 8], maxObjects: 3, maxRefs: 4, require: ["declNew", "declAlias", "mutate", ...rng.sample(["asgNull", "declSelf", "declSame", "declCopy", "asgNew", "asgSame"], 2)] });
  const plan = planRefs(rng, N, vars, cfg);
  if (!plan || !plan.live.length) return null;
  const { classes, helpers } = refClass(N, plan.log);
  const k = lvl(level, 1, rng.int(1, 2), 2);
  const shown = printsFor(rng, plan, k);
  if (!shown.length) return null;
  const main = [...plan.main, ...shown.map((v) => pr(call(v, N.get)))];
  const p = P(classes, helpers, main);
  return {
    fam: "aliases.trace", program: p, q: { kind: "output" },
    prompt: shown.length > 1 ? "What is printed when this code runs?" : `What does the last statement print?`,
    mis: ["aliasCopies", "reassignMutates", "nullPropagates", "returnCopies", "onlyLastUpdate"],
    alts: [...mutSwapReceiver(p, refVarsOf(p)), ...mutDropCall(p)],
    focus: "Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object.",
  };
}
function aliasSameCount({ rng, level, N, vars }) {
  if (level === 0) return null;
  const cfg = lvl(level, null,
    { ops: [["declAlias", 3], ["asgNull", 1], ["asgAlias", 2], ["asgNew", 2], ["declNew", 1]], len: [4, 6], maxObjects: 2, maxRefs: 4, require: ["declNew", "declAlias", rng.pick(["asgNew", "asgNull", "asgAlias"])] },
    { ops: [["declAlias", 2], ["asgNull", 1], ["asgAlias", 2], ["asgNew", 2], ["declSame", 1], ["declSelf", 1], ["declCopy", 1], ["asgSame", 1], ["declNew", 1]], len: [5, 7], maxObjects: 3, maxRefs: 5, require: ["declNew", "declAlias", ...rng.sample(["declSame", "declSelf", "declCopy", "asgNull", "asgNew"], 2)] });
  const plan = planRefs(rng, N, vars, cfg);
  if (!plan || !plan.live.length) return null;
  const { classes, helpers } = refClass(N, plan.log, { noGetter: true });
  const refs = refVarsOf({ main: plan.main });
  if (refs.length < 3) return null;
  const x = rng.pick(plan.live);
  const assignedFromX = plan.log.filter((l) => l.s === x && ["declAlias", "asgAlias", "declSelf", "declSame", "asgSame"].includes(l.op)).length;
  return {
    fam: "aliases.samecount", program: P(classes, helpers, plan.main),
    q: { kind: "count", what: "sameAs", v: x },
    prompt: `After this code runs, how many variables other than ${x} refer to the same object as ${x}?`,
    mis: ["aliasCopies", "reassignMutates", "nullPropagates", "returnCopies"],
    countModels(sim) {
      if (!sim.vars[x] || sim.exc) return [];
      const alt = [{ value: assignedFromX, mis: "lostUpdate" }];
      const same = Object.entries(sim.vars).filter(([k, v]) => k !== x && v.k === "r" && sim.vars[x].k === "r" && v.id === sim.vars[x].id).length;
      alt.push({ value: Object.values(sim.vars).filter((v) => v.k === "r").length - 1, mis: "allSameObject" });
      alt.push({ value: same + 1, mis: "countsSelf" });
      return alt;
    },
    focus: `Follow each assignment in order. A variable that is later reassigned (to null, to a new object, or to another reference) no longer refers to ${x}'s object.`,
  };
}

/* ---------------- Reference equality ---------------- */
function equalityWhich({ rng, level, N, vars }) {
  const cfg = lvl(level,
    { ops: [["declNew", 3], ["declAlias", 3], ["declNull", 1]], len: [3, 4], maxObjects: 2, maxRefs: 4, equalArgs: 0.6, require: ["declNew", "declNew", "declAlias"] },
    { ops: [["declNew", 2], ["declAlias", 2], ["asgNew", 2], ["asgAlias", 2], ["asgNull", 1], ["mutate", 1]], len: [4, 5], maxObjects: 3, maxRefs: 3, equalArgs: 0.5, require: ["declNew", "declAlias", rng.pick(["asgNew", "asgAlias", "asgNull"])] },
    { ops: [["declNew", 2], ["declAlias", 1], ["asgNew", 2], ["asgAlias", 1], ["asgNull", 1], ["declSame", 2], ["declSelf", 1], ["declCopy", 2], ["mutate", 1]], len: [5, 6], maxObjects: 3, maxRefs: 4, equalArgs: 0.5, require: ["declNew", ...rng.sample(["declSame", "declSelf", "declCopy", "asgNew", "asgNull"], 2)] });
  const plan = planRefs(rng, N, vars, cfg);
  if (!plan) return null;
  const { classes, helpers } = refClass(N, plan.log);
  const refs = refVarsOf({ main: plan.main });
  if (refs.length < 2) return null;
  const cands = [];
  for (let i = 0; i < refs.length; i++) for (let j = i + 1; j < refs.length; j++) {
    cands.push(bin("==", nm(refs[i]), nm(refs[j])));
    cands.push(bin("!=", nm(refs[i]), nm(refs[j])));
  }
  for (const r of refs) cands.push(bin(rng.chance(0.5) ? "==" : "!=", nm(r), nul()));
  if (level > 0) for (let i = 0; i < plan.live.length; i++) for (let j = i + 1; j < plan.live.length; j++) cands.push(bin("==", call(plan.live[i], N.get), call(plan.live[j], N.get)));
  const want = rng.chance(level === 0 ? 0.75 : 0.65);
  return {
    fam: "equality.which", program: P(classes, helpers, plan.main),
    q: { kind: "compare", cands, want },
    prompt: `After this code runs, which comparison is ${want ? "true" : "false"}?`,
    mis: ["identityAsContent", "aliasCopies", "reassignMutates", "nullPropagates", "equalArgsAlias", "returnCopies", "valuesAsIdentity"],
    focus: "For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers.",
  };
}
function equalityPrint({ rng, level, N, vars }) {
  if (level === 0) return null;
  const cfg = lvl(level, null,
    { ops: [["declNew", 2], ["declAlias", 2], ["asgNew", 1], ["asgAlias", 1], ["mutate", 2]], len: [4, 5], maxObjects: 2, maxRefs: 3, equalArgs: 0.6, require: ["declNew", rng.pick(["declAlias", "asgAlias"]), "declNew"] },
    { ops: [["declNew", 2], ["declAlias", 1], ["asgNew", 2], ["asgAlias", 1], ["declSame", 1], ["declCopy", 2], ["mutate", 2], ["set", 1]], len: [5, 7], maxObjects: 3, maxRefs: 3, equalArgs: 0.5, require: ["declNew", rng.pick(["declCopy", "declSame"]), "mutate"] });
  const plan = planRefs(rng, N, vars, cfg);
  if (!plan || plan.live.length < 2) return null;
  const { classes, helpers } = refClass(N, plan.log);
  const [x, y] = rng.sample(plan.live, 2);
  const lines = [pr(bin("==", nm(x), nm(y))), pr(bin("==", call(x, N.get), call(y, N.get)))];
  if (rng.chance(0.5)) lines.reverse();
  return {
    fam: "equality.print", program: P(classes, helpers, [...plan.main, ...lines]),
    q: { kind: "output" }, prompt: "What is printed when this code runs?",
    mis: ["identityAsContent", "aliasCopies", "reassignMutates", "returnCopies", "valuesAsIdentity", "equalArgsAlias", "onlyLastUpdate"],
    focus: "x == y compares references (same object?), while comparing two getter results compares int values.",
  };
}

/* ---------------- Multiple independent objects ---------------- */
function independentTrace({ rng, level, N, vars }) {
  const cfg = lvl(level,
    { ops: [["mutate", 3], ["set", 1], ["incr", 1]], len: [3, 4], maxObjects: 2, maxRefs: 2, equalArgs: 0.4, require: ["declNew", "declNew"] },
    { ops: [["mutate", 3], ["set", 2], ["incr", 1], ["declNew", 1]], len: [5, 6], maxObjects: 3, maxRefs: 3, equalArgs: 0.4, require: ["declNew", "declNew", "mutate", "set"] },
    { ops: [["mutate", 3], ["set", 1], ["give", 2], ["copyFrom", 2], ["asgNew", 1], ["declNew", 1]], len: [6, 8], maxObjects: 3, maxRefs: 3, equalArgs: 0.4, require: ["declNew", "declNew", "declNew", rng.pick(["give", "copyFrom"]), "mutate"] });
  // only creation + updates; force the first ops to be constructions
  const plan = planRefs(rng, N, vars, { ...cfg, ops: [...cfg.ops] });
  if (!plan) return null;
  if (plan.log.filter((l) => l.op === "declNew").length < 2) return null;
  const { classes, helpers } = refClass(N, plan.log);
  const k = lvl(level, 1, 2, rng.int(2, 3));
  const shown = rng.sample(plan.live, Math.min(k, plan.live.length));
  let prints;
  if (shown.length > 1 && level === 2 && rng.chance(0.5)) prints = [pr(shown.slice(1).reduce((acc, v) => bin("+", bin("+", acc, str(" ")), call(v, N.get)), call(shown[0], N.get)))];
  else prints = shown.map((v) => pr(call(v, N.get)));
  const p = P(classes, helpers, [...plan.main, ...prints]);
  return {
    fam: "independent.trace", program: p, q: { kind: "output" },
    prompt: "What is printed when this code runs?",
    mis: ["instanceAsStatic", "equalArgsAlias", "onlyLastUpdate", "thisIsArgument"],
    alts: [...mutSwapReceiver(p, refVarsOf(p)), ...mutDropCall(p)],
    focus: "Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it).",
  };
}
function independentCompareState({ rng, level, N, vars }) {
  // "Which statement is true after the code runs?" about values of independent objects
  if (level === 0) return null;
  const cfg = lvl(level, null,
    { ops: [["mutate", 3], ["set", 2], ["incr", 1]], len: [4, 5], maxObjects: 2, maxRefs: 2, equalArgs: 0.6, require: ["declNew", "declNew", "mutate"] },
    { ops: [["mutate", 2], ["set", 1], ["give", 2], ["copyFrom", 2]], len: [5, 7], maxObjects: 3, maxRefs: 3, equalArgs: 0.5, require: ["declNew", "declNew", "declNew", rng.pick(["give", "copyFrom"])] });
  const plan = planRefs(rng, N, vars, cfg);
  if (!plan || plan.live.length < 2) return null;
  const { classes, helpers } = refClass(N, plan.log);
  const cands = [];
  const L = plan.live;
  for (let i = 0; i < L.length; i++) for (let j = 0; j < L.length; j++) if (i !== j) cands.push(bin(rng.chance(0.5) ? ">" : "==", call(L[i], N.get), call(L[j], N.get)));
  for (const v of L) cands.push(bin("==", call(v, N.get), lit(rng.int(1, 30))));
  return {
    fam: "independent.compare", program: P(classes, helpers, plan.main),
    q: { kind: "compare", cands, want: true },
    prompt: "After this code runs, which comparison is true?",
    mis: ["instanceAsStatic", "equalArgsAlias", "onlyLastUpdate", "thisIsArgument"],
    focus: "Trace each object's own field separately; updating one object never changes another unless a method explicitly writes to the other object.",
  };
}
void decl; void nw;

export default {
  structure: [structureCount, structureRefersTo],
  aliases: [aliasTrace, aliasSameCount],
  equality: [equalityWhich, equalityPrint],
  independent: [independentTrace, independentCompareState],
};
