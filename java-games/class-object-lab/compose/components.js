/* Reusable semantic components. A class is assembled from independent parts
 * (fields, a constructor kind, method kinds, static members); families compose these parts with
 * operation sequences. Domains are purely cosmetic (names only) and are excluded from signatures. */
import { lit, str, nm, tf, fld, th, nw, call, bin, math, decl, asg, inc, ret, iff, field, param, ctor, method, cls, sfld } from "./ir.js";

const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const DOMAINS = [
  { c: "Counter", f: "value", f2: "resets", s: "label", add: "add", sub: "subtract", amt: "amount", vars: ["a", "b", "c", "d", "e"], st: "created", bool: "isPositive", noun: "counter" },
  { c: "Player", f: "score", f2: "lives", s: "name", add: "addPoints", sub: "losePoints", amt: "points", vars: ["p1", "p2", "p3", "p4", "p5"], st: "playerCount", bool: "isWinning", noun: "player" },
  { c: "Account", f: "balance", f2: "deposits", s: "owner", add: "deposit", sub: "withdraw", amt: "amount", vars: ["savings", "checking", "backup", "travel", "college"], st: "accountsOpened", bool: "isRich", noun: "account" },
  { c: "Plant", f: "height", f2: "leaves", s: "species", add: "grow", sub: "trim", amt: "cm", vars: ["fern", "ivy", "moss", "palm", "oak"], st: "planted", bool: "isTall", noun: "plant" },
  { c: "Robot", f: "steps", f2: "turns", s: "model", add: "move", sub: "back", amt: "n", vars: ["rover", "drone", "scout", "probe", "bot"], st: "built", bool: "isFar", noun: "robot" },
  { c: "Battery", f: "charge", f2: "cycles", s: "brand", add: "recharge", sub: "drain", amt: "units", vars: ["main", "spare", "left", "right", "extra"], st: "made", bool: "isFull", noun: "battery" },
  { c: "Tank", f: "level", f2: "refills", s: "liquid", add: "fill", sub: "drain", amt: "liters", vars: ["tankA", "tankB", "tankC", "tankD", "tankE"], st: "tanks", bool: "isHigh", noun: "tank" },
  { c: "Ticket", f: "price", f2: "sold", s: "event", add: "raise", sub: "discount", amt: "dollars", vars: ["t1", "t2", "t3", "t4", "t5"], st: "issued", bool: "isPricey", noun: "ticket" },
  { c: "Lamp", f: "brightness", f2: "switches", s: "room", add: "brighten", sub: "dim", amt: "level", vars: ["desk", "floor", "porch", "night", "hall"], st: "lamps", bool: "isBright", noun: "lamp" },
  { c: "Timer", f: "seconds", f2: "laps", s: "tag", add: "addTime", sub: "removeTime", amt: "s", vars: ["timer", "alarm", "clock", "oven", "watch"], st: "started", bool: "isLong", noun: "timer" },
  { c: "Car", f: "speed", f2: "trips", s: "color", add: "accelerate", sub: "brake", amt: "mph", vars: ["car", "van", "bus", "taxi", "truck"], st: "carsBuilt", bool: "isFast", noun: "car" },
  { c: "Book", f: "pagesRead", f2: "bookmarks", s: "title", add: "read", sub: "reread", amt: "pages", vars: ["novel", "guide", "atlas", "comic", "diary"], st: "printed", bool: "isFinished", noun: "book" },
  { c: "Student", f: "credits", f2: "absences", s: "name", add: "earn", sub: "drop", amt: "hours", vars: ["ana", "ben", "cara", "dev", "eli"], st: "enrolled", bool: "canGraduate", noun: "student" },
  { c: "Garden", f: "flowers", f2: "weeds", s: "plot", add: "plant", sub: "pick", amt: "count", vars: ["front", "back", "roof", "side", "patio"], st: "gardens", bool: "isFull", noun: "garden" },
];
export const STRINGS = ["Maya", "Kai", "Riley", "Noor", "Sam", "Ivy", "Leo", "Ada", "Zoe", "Omar", "red", "blue", "gold", "jazz", "chess"];

/* Names for one class built from a domain. */
export function names(D) {
  return {
    cls: D.c, f: D.f, f2: D.f2, s: D.s, st: D.st,
    get: "get" + cap(D.f), get2: "get" + cap(D.f2), getS: "get" + cap(D.s),
    set: "set" + cap(D.f), set2: "set" + cap(D.f2),
    add: D.add, sub: D.sub, inc: "increment" + cap(D.f), dbl: "double" + cap(D.f),
    amt: D.amt, bool: D.bool, vars: D.vars,
    total: "get" + cap(D.st), reset: "reset" + cap(D.f),
    bonus: "get" + cap(D.f) + "WithBonus",
  };
}

/* Method-part library. Each returns an IR method. `p` carries the knobs a family chose. */
export const M = {
  get: (N) => method(N.get, "int", [], [ret(nm(N.f))]),
  get2: (N) => method(N.get2, "int", [], [ret(nm(N.f2))]),
  getS: (N) => method(N.getS, "String", [], [ret(nm(N.s))]),
  getThis: (N) => method(N.get, "int", [], [ret(tf(N.f))]),
  // setters
  set: (N) => method(N.set, "void", [param("int", N.amt)], [asg(N.f, nm(N.amt))]),
  setThis: (N) => method(N.set, "void", [param("int", N.f)], [asg(tf(N.f), nm(N.f))]),
  setShadowBug: (N) => method(N.set, "void", [param("int", N.f)], [asg(N.f, nm(N.f))]),
  setGuard: (N, p) => method(N.set, "void", [param("int", N.amt)], [iff(bin(p.op || ">=", nm(N.amt), lit(p.bound ?? 0)), [asg(N.f, nm(N.amt))])]),
  setGuardElse: (N, p) => method(N.set, "void", [param("int", N.amt)], [iff(bin(p.op || ">=", nm(N.amt), lit(p.bound ?? 0)), [asg(N.f, nm(N.amt))], [asg(N.f, lit(p.fallback ?? 0))])]),
  setIfHigher: (N) => method(N.set, "void", [param("int", N.amt)], [iff(bin(">", nm(N.amt), nm(N.f)), [asg(N.f, nm(N.amt))])]),
  setClamp: (N, p) => method(N.set, "void", [param("int", N.amt)], [asg(N.f, math(p.fn || "min", lit(p.cap ?? 10), nm(N.amt)))]),
  setCounted: (N, p) => method(N.set, "void", [param("int", N.amt)], [iff(bin(p.op || ">=", nm(N.amt), lit(p.bound ?? 0)), [asg(N.f, nm(N.amt)), inc(N.f2)])]),
  // mutators
  add: (N) => method(N.add, "void", [param("int", N.amt)], [asg(N.f, nm(N.amt), "+=")]),
  addThis: (N) => method(N.add, "void", [param("int", N.amt)], [asg(tf(N.f), nm(N.amt), "+=")]),
  addGuard: (N, p) => method(N.add, "void", [param("int", N.amt)], [iff(bin(p.op || ">", nm(N.amt), lit(p.bound ?? 0)), [asg(N.f, nm(N.amt), "+=")])]),
  addClamp: (N, p) => method(N.add, "void", [param("int", N.amt)], [asg(N.f, math("min", lit(p.cap ?? 10), bin("+", nm(N.f), nm(N.amt))))]),
  addCounted: (N) => method(N.add, "void", [param("int", N.amt)], [asg(N.f, nm(N.amt), "+="), inc(N.f2)]),
  sub: (N) => method(N.sub, "void", [param("int", N.amt)], [asg(N.f, nm(N.amt), "-=")]),
  subFloor: (N) => method(N.sub, "void", [param("int", N.amt)], [iff(bin("<=", nm(N.amt), nm(N.f)), [asg(N.f, nm(N.amt), "-=")])]),
  subMax: (N) => method(N.sub, "void", [param("int", N.amt)], [asg(N.f, math("max", lit(0), bin("-", nm(N.f), nm(N.amt))))]),
  inc: (N) => method(N.inc, "void", [], [inc(N.f)]),
  dbl: (N) => method(N.dbl, "void", [], [asg(N.f, lit(2), "*=")]),
  reset: (N, p) => method(N.reset, "void", [], [asg(N.f, lit(p.resetTo ?? 0))]),
  addLocalShadow: (N, p) => method(N.add, "void", [param("int", N.amt)], [decl("int", N.f, bin("+", nm(N.amt), lit(p.extra ?? 1))), asg(tf(N.f), nm(N.f), "+=")]),
  addLocalBug: (N, p) => method(N.add, "void", [param("int", N.amt)], [decl("int", N.f, lit(p.extra ?? 1)), asg(N.f, nm(N.amt), "+=")]),
  addReturnThis: (N) => method(N.add, N.cls, [param("int", N.amt)], [asg(N.f, nm(N.amt), "+="), ret(th())]),
  setReturnThis: (N) => method(N.set, N.cls, [param("int", N.f)], [asg(tf(N.f), nm(N.f)), ret(th())]),
  // computed accessors
  bonus: (N, p) => method(N.bonus, "int", [], [ret(bin(p.op || "+", nm(N.f), lit(p.k ?? 5)))], { meta: { computesFrom: N.f } }),
  boolGet: (N, p) => method(N.bool, "boolean", [], [ret(bin(p.op || ">=", nm(N.f), lit(p.t ?? 10)))]),
  sumGet: (N) => method("getTotal", "int", [], [ret(bin("+", nm(N.f), nm(N.f2)))]),
  // reference-returning
  self: (N) => method("self", N.cls, [], [ret(th())]),
  copy: (N) => method("copy", N.cls, [], [ret(nw(N.cls, nm(N.f)))]),
  // two-receiver methods
  copyFrom: (N) => method("copyFrom", "void", [param(N.cls, "other")], [asg(tf(N.f), fld("other", N.f))]),
  copyTo: (N) => method("copyTo", "void", [param(N.cls, "other")], [asg(fld("other", N.f), tf(N.f))]),
  giveTo: (N) => method("giveTo", "void", [param(N.cls, "other"), param("int", N.amt)], [asg(N.f, nm(N.amt), "-="), asg(fld("other", N.f), nm(N.amt), "+=")]),
  larger: (N) => method("larger", N.cls, [param(N.cls, "other")], [iff(bin(">=", nm(N.f), fld("other", N.f)), [ret(th())]), ret(nm("other"))]),
  // static members
  staticTotal: (N) => method(N.total, "int", [], [ret(nm(N.st))], { st: true }),
  toStringA: (N, p) => method("toString", "String", [], [ret(bin("+", str((p.prefix ?? N.cls) + ": "), nm(N.f)))]),
  toStringB: (N, p) => method("toString", "String", [], [ret(bin("+", bin("+", bin("+", str(N.cls + "["), nm(p.first ?? N.f)), str(p.sep ?? ", ")), bin("+", nm(p.second ?? N.f2), str("]"))))]),
  toStringCond: (N, p) => method("toString", "String", [], [ret(bin("+", bin("+", str(N.cls + " "), nm(N.f)), { k: "tern", c: bin(">=", nm(N.f), lit(p.t ?? 10)), a: str(" (high)"), b: str(" (low)") }))]),
  toStringS: (N) => method("toString", "String", [], [ret(bin("+", bin("+", nm(N.s), str(" (")), bin("+", nm(N.f), str(")"))))]),
};

/* Constructor-part library */
export const K = {
  param: (N) => ctor([param("int", "start")], [asg(N.f, nm("start"))]),
  thisParam: (N) => ctor([param("int", N.f)], [asg(tf(N.f), nm(N.f))]),
  shadowBug: (N) => ctor([param("int", N.f)], [asg(N.f, nm(N.f))]),
  computed: (N, p) => ctor([param("int", "start")], [asg(N.f, bin(p.op || "*", nm("start"), lit(p.k ?? 2)))]),
  cond: (N, p) => ctor([param("int", "start")], [iff(bin(p.op || "<", nm("start"), lit(p.bound ?? 0)), [asg(N.f, lit(p.fallback ?? 0))], [asg(N.f, nm("start"))])]),
  ternary: (N, p) => ctor([param("int", "start")], [asg(N.f, { k: "tern", c: bin(p.op || ">", nm("start"), lit(p.bound ?? 10)), a: lit(p.hi ?? 10), b: nm("start") })]),
  two: (N) => ctor([param("int", "a"), param("int", "b")], [asg(N.f, nm("a")), asg(N.f2, nm("b"))]),
  twoSwapped: (N) => ctor([param("int", N.f2), param("int", N.f)], [asg(tf(N.f), nm(N.f)), asg(tf(N.f2), nm(N.f2))]),
  twoThis: (N) => ctor([param("int", N.f), param("int", N.f2)], [asg(tf(N.f), nm(N.f)), asg(tf(N.f2), nm(N.f2))]),
  none: () => null,
  empty: () => ctor([], []),
  defaultValue: (N, p) => ctor([], [asg(N.f, lit(p.v ?? 1))]),
  chainDefault: (N, p) => ctor([], [], { chain: { args: [lit(p.v ?? 5)] } }),
  chainThenAdd: (N, p) => ctor([], [asg(N.f, lit(p.k ?? 2), "+=")], { chain: { args: [lit(p.v ?? 5)] } }),
  counted: (N) => ctor([param("int", "start")], [asg(N.f, nm("start")), inc(N.st)]),
  countedEmpty: (N) => ctor([], [inc(N.st)]),
  countedIf: (N, p) => ctor([param("int", "start")], [asg(N.f, nm("start")), iff(bin(p.op || ">", nm("start"), lit(p.bound ?? 5)), [inc(N.st)])]),
  withString: (N) => ctor([param("String", N.s), param("int", "start")], [asg(tf(N.s), nm(N.s)), asg(N.f, nm("start"))]),
  addToStatic: (N) => ctor([param("int", "start")], [asg(N.f, nm("start")), asg(N.st, nm("start"), "+=")]),
};

/* Build a class from parts. parts = {fields:[...ir fields], ctors:[ctor IR...], methods:[method IR...]} */
export function build(N, fields, ctors, methods) {
  return cls(N.cls, fields, ctors.filter(Boolean), methods.filter(Boolean));
}
export const F = {
  f: (N, init) => field("int", N.f, { init: init == null ? null : lit(init) }),
  f2: (N, init) => field("int", N.f2, { init: init == null ? null : lit(init) }),
  s: (N, init) => field("String", N.s, { init: init == null ? null : str(init) }),
  st: (N, init = 0, acc = "private") => field("int", N.st, { st: true, init: init == null ? null : lit(init), acc }),
  pubF: (N, init) => field("int", N.f, { acc: "public", init: init == null ? null : lit(init) }),
};
export { nm, nw, call, lit, sfld };
