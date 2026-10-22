/* Reference-graph planner: composes a bounded sequence of main-method operations over reference
 * variables and objects, tracking a planning model (variable -> object | null | unassigned) so every
 * emitted statement is valid Java (no use of unassigned or null references, no undeclared names).
 * The planning model is only used to choose sensible operations; answers always come from sim.js. */
import { nm, nw, call, lit, nul, decl, asg, ex, method, param, ret, th, inc, field, ctor, cls, bin } from "./ir.js";
import { M } from "./components.js";

export const OPS = {
  declNew: { needs: "freeVar", makes: "obj" },
  declAlias: { needs: "freeVar+live" },
  declNull: { needs: "freeVar" },
  declUninit: { needs: "freeVar" },
  asgNew: { needs: "declared" },
  asgAlias: { needs: "declared+live" },
  asgNull: { needs: "live" },
  mutate: { needs: "live" },
  set: { needs: "live" },
  incr: { needs: "live" },
  declSelf: { needs: "freeVar+live" },
  declCopy: { needs: "freeVar+live" },
  declSame: { needs: "freeVar+live" },
  declMake: { needs: "freeVar" },
  asgSame: { needs: "declared+live" },
  asgCopy: { needs: "declared+live" },
  tempNew: { needs: "" },
  tempCall: { needs: "" },
  give: { needs: "2live" },
  copyFrom: { needs: "2live" },
};

export function planRefs(rng, N, vars, cfg) {
  // cfg: {ops:[[name,weight]...], len:[lo,hi], maxObjects, maxRefs, equalArgs:prob, require:[opNames], vals:[lo,hi]}
  const model = { vars: new Map(), objs: [] }; // var -> objIndex | null | "unassigned"
  const main = [], log = [];
  const usedVals = [];
  const len = rng.int(cfg.len[0], cfg.len[1]);
  const freeVar = () => vars.find((v) => !model.vars.has(v));
  const declared = () => [...model.vars.keys()].filter((v) => model.vars.get(v) !== "unassigned" || cfg.allowAssignUninit);
  const live = () => [...model.vars.keys()].filter((v) => typeof model.vars.get(v) === "number");
  const newVal = () => {
    if (usedVals.length && rng.chance(cfg.equalArgs ?? 0)) return rng.pick(usedVals);
    let v, g = 0; do { v = rng.int(cfg.vals?.[0] ?? 1, cfg.vals?.[1] ?? 20); } while (usedVals.includes(v) && g++ < 30);
    usedVals.push(v); return v;
  };
  const amt = () => rng.int(1, 9);
  const objCount = () => model.objs.length;
  const distinctLive = () => { const seen = new Set(), out = []; for (const v of live()) { const o = model.vars.get(v); if (!seen.has(o)) { seen.add(o); out.push(v); } } return out; };
  const refCount = () => model.vars.size;
  const can = (op) => {
    const fv = freeVar() && refCount() < cfg.maxRefs;
    const newOk = objCount() < cfg.maxObjects;
    switch (op) {
      case "declNew": return fv && newOk;
      case "declMake": return fv && newOk;
      case "declAlias": case "declSelf": case "declSame": return fv && live().length > 0;
      case "declCopy": return fv && live().length > 0 && newOk;
      case "declNull": case "declUninit": return fv;
      case "asgNew": return declared().length > 0 && newOk;
      case "asgAlias": case "asgSame": return declared().length > 1 && live().length > 0;
      case "asgCopy": return declared().length > 0 && live().length > 0 && newOk;
      case "asgNull": return live().length > 0;
      case "mutate": case "set": case "incr": return live().length > 0;
      case "tempNew": case "tempCall": return newOk;
      case "give": case "copyFrom": return distinctLive().length >= 2;
    }
    return false;
  };
  const apply = (op) => {
    const L = live();
    switch (op) {
      case "declNew": { const v = freeVar(), x = newVal(); main.push(decl(N.cls, v, nw(N.cls, lit(x)))); model.objs.push(x); model.vars.set(v, model.objs.length - 1); log.push({ op, v, x }); return; }
      case "declMake": { const v = freeVar(), x = newVal(); main.push(decl(N.cls, v, call(null, "make", lit(x)))); model.objs.push(x); model.vars.set(v, model.objs.length - 1); log.push({ op, v, x }); return; }
      case "declAlias": { const v = freeVar(), s = rng.pick(L); main.push(decl(N.cls, v, nm(s))); model.vars.set(v, model.vars.get(s)); log.push({ op, v, s }); return; }
      case "declSelf": { const v = freeVar(), s = rng.pick(L); main.push(decl(N.cls, v, call(s, "self"))); model.vars.set(v, model.vars.get(s)); log.push({ op, v, s }); return; }
      case "declSame": { const v = freeVar(), s = rng.pick(L); main.push(decl(N.cls, v, call(null, "same", nm(s)))); model.vars.set(v, model.vars.get(s)); log.push({ op, v, s }); return; }
      case "declCopy": { const v = freeVar(), s = rng.pick(L); main.push(decl(N.cls, v, call(s, "copy"))); model.objs.push(null); model.vars.set(v, model.objs.length - 1); log.push({ op, v, s }); return; }
      case "declNull": { const v = freeVar(); main.push(decl(N.cls, v, nul())); model.vars.set(v, null); log.push({ op, v }); return; }
      case "declUninit": { const v = freeVar(); main.push(decl(N.cls, v)); model.vars.set(v, "unassigned"); log.push({ op, v }); return; }
      case "asgNew": { const v = rng.pick(declared()), x = newVal(); main.push(asg(v, nw(N.cls, lit(x)))); model.objs.push(x); model.vars.set(v, model.objs.length - 1); log.push({ op, v, x }); return; }
      case "asgAlias": case "asgSame": {
        const s = rng.pick(L); const targets = declared().filter((t) => t !== s && model.vars.get(t) !== model.vars.get(s));
        if (!targets.length) return false;
        const v = rng.pick(targets); main.push(asg(v, op === "asgAlias" ? nm(s) : call(null, "same", nm(s)))); model.vars.set(v, model.vars.get(s)); log.push({ op, v, s }); return;
      }
      case "asgCopy": { const s = rng.pick(L); const v = rng.pick(declared()); main.push(asg(v, call(s, "copy"))); model.objs.push(null); model.vars.set(v, model.objs.length - 1); log.push({ op, v, s }); return; }
      case "asgNull": { const v = rng.pick(L); main.push(asg(v, nul())); model.vars.set(v, null); log.push({ op, v }); return; }
      case "mutate": { const v = rng.pick(L), a = amt(); main.push(ex(call(v, N.add, lit(a)))); log.push({ op, v, a }); return; }
      case "set": { const v = rng.pick(L), a = rng.int(10, 40); main.push(ex(call(v, N.set, lit(a)))); log.push({ op, v, a }); return; }
      case "incr": { const v = rng.pick(L); main.push(ex(call(v, N.inc))); log.push({ op, v }); return; }
      case "tempNew": { const x = newVal(); main.push(ex(nw(N.cls, lit(x)))); model.objs.push(x); log.push({ op, x }); return; }
      case "give": case "copyFrom": {
        const [a, b] = rng.sample(distinctLive(), 2);
        const v1 = rng.pick(L.filter((v) => model.vars.get(v) === model.vars.get(a))), v2 = rng.pick(L.filter((v) => model.vars.get(v) === model.vars.get(b)));
        main.push(ex(op === "give" ? call(v1, "giveTo", nm(v2), lit(amt())) : call(v1, "copyFrom", nm(v2)))); log.push({ op, v: v1, s: v2 }); return;
      }
      case "tempCall": { const x = newVal(); main.push(ex(call(nw(N.cls, lit(x)), N.add, lit(amt())))); model.objs.push(x); log.push({ op, x }); return; }
    }
  };
  // seed with required ops in a valid order, then fill
  const required = [...(cfg.require || [])];
  let guard = 0;
  while (main.length < len && guard++ < 200) {
    let op;
    const pendingReq = required.find((r) => can(r));
    const avail = cfg.ops.filter(([o]) => can(o));
    if (pendingReq && (rng.chance(0.5) || main.length + required.length >= len || !avail.length)) { op = pendingReq; required.splice(required.indexOf(pendingReq), 1); }
    else {
      if (!avail.length) break;
      op = rng.weighted(avail);
    }
    if (apply(op) === false) continue;
  }
  if (required.length) return null;
  return { main, log, model, live: live() };
}

/* Class used by reference families: one int field, constructor, getter, add, setter, increment,
 * plus self()/copy() when the plan uses them. Helpers same()/make() when used. */
export function refClass(N, log, extra = {}) {
  const ops = new Set(log.map((l) => l.op));
  const methods = extra.noGetter ? [] : [M.get(N)];
  if (ops.has("mutate") || ops.has("tempCall") || extra.add) methods.push(M.add(N));
  if (ops.has("set") || extra.set) methods.push(M.set(N));
  if (ops.has("incr")) methods.push(M.inc(N));
  if (ops.has("declSelf")) methods.push(M.self(N));
  if (ops.has("give")) methods.push(M.giveTo(N));
  if (ops.has("copyFrom")) methods.push(M.copyFrom(N));
  if (ops.has("declCopy") || ops.has("asgCopy")) methods.push(M.copy(N));
  const c = cls(N.cls, [field("int", N.f)], [ctor([param("int", "start")], [asg(N.f, nm("start"))])], methods);
  const helpers = [];
  if (ops.has("declSame") || ops.has("asgSame")) helpers.push(method("same", N.cls, [param(N.cls, "x")], [ret(nm("x"))], { st: true }));
  if (ops.has("declMake")) helpers.push(method("make", N.cls, [param("int", "start")], [ret(nw(N.cls, nm("start")))], { st: true }));
  return { classes: [c], helpers };
}
