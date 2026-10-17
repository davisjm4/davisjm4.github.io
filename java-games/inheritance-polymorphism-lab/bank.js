/* Inheritance & Polymorphism Lab — challenge bank.
   Model-driven items name a scenario (scenarios.js) and what to ask; the
   engine computes answers with java-model.js. Raw items (raw-items.js) carry
   hand-written code whose compile errors and outputs are verified by javac. */
import { cls, method as m, over as o, call as c, sup as s, par as p } from "./java-model.js?v=iplab-v1";
import { RAW } from "./raw-items.js?v=iplab-v1";

/* Extra hierarchies used by a single family. */
const orders = [
  cls("Order", null, [m("price", ["$10"]), m("total", [c("price"), " total"])]),
  cls("RushOrder", "Order", [o("total", [s("total"), " + rush"])]),
  cls("GiftOrder", "RushOrder", [o("total", ["gift wrap, ", s("total")]), o("price", ["$12"])]),
];
const tools = [
  cls("Tool", null, [m("brand", ["Generic"], { static: true }), m("use", ["turning"]), m("describe", [c("use"), " (", c("brand"), ")"])]),
  cls("Drill", "Tool", [m("brand", ["PowerMax"], { static: true }), o("use", ["drilling"])]),
];
const lampA = [cls("Lamp", null, [m("glow", ["dim"])]), cls("SmartLamp", "Lamp", [o("glow", ["bright"])])];
const lampB = [cls("Lamp", null, [m("glow", ["dim"])]), cls("SmartLamp", "Lamp", [m("glow", ["level ", p("level")], { params: [["int", "level"]] })])];
const timerA = [
  cls("Timer", null, [m("start", ["timer: ", p("seconds"), "s"], { params: [["int", "seconds"]] })]),
  cls("OvenTimer", "Timer", [o("start", ["oven: ", p("seconds"), "s"], { params: [["int", "seconds"]] })]),
];
const timerB = [
  cls("Timer", null, [m("start", ["timer: ", p("seconds"), "s"], { params: [["int", "seconds"]] })]),
  cls("OvenTimer", "Timer", [m("start", ["oven: ", p("seconds"), "s"], { params: [["double", "seconds"]] })]),
];
export const EXTRA = { orders, tools, lampA, lampB, timerA, timerB };

const D = (t, v, obj) => ({ t, v, obj });
export const ITEMS = [
  /* =================== MODE A — Class Hierarchy Builder =================== */
  { id: "A-connect-messages", mode: "hierarchy", family: "connect", kind: "connect", scen: "messages" },
  { id: "A-connect-payroll", mode: "hierarchy", family: "connect", kind: "connect", scen: "payroll" },
  { id: "A-connect-tiles", mode: "hierarchy", family: "connect", kind: "connect", scen: "tiles" },

  { id: "A-has-thermostat", mode: "hierarchy", family: "has", kind: "has", scen: "devices", target: "Thermostat" },
  { id: "A-has-fern", mode: "hierarchy", family: "has", kind: "has", scen: "plants", target: "Fern" },
  { id: "A-has-van", mode: "hierarchy", family: "has", kind: "has", scen: "couriers", target: "Van" },
  { id: "A-has-report", mode: "hierarchy", family: "has", kind: "has", scen: "reports", target: "Report" },
  { id: "A-has-thermometer", mode: "hierarchy", family: "has", kind: "has", scen: "sensors", target: "Thermometer" },

  { id: "A-supplier-devices", mode: "hierarchy", family: "supplier", kind: "supplier", scen: "devices", pairs: [["DoorCam", "name"], ["DoorCam", "report"], ["Thermostat", "name"], ["Camera", "status"]] },
  { id: "A-supplier-instruments", mode: "hierarchy", family: "supplier", kind: "supplier", scen: "instruments", pairs: [["ElectricGuitar", "play"], ["ElectricGuitar", "perform"], ["Guitar", "tune"], ["Drum", "tune"]] },
  { id: "A-supplier-payroll", mode: "hierarchy", family: "supplier", kind: "supplier", scen: "payroll", pairs: [["Director", "pay"], ["Intern", "title"], ["Director", "describe"], ["Manager", "pay"]] },
  { id: "A-supplier-messages", mode: "hierarchy", family: "supplier", kind: "supplier", scen: "messages", pairs: [["Alert", "send"], ["Email", "send"], ["Alert", "body"]] },

  { id: "A-isa-devices", mode: "hierarchy", family: "isa", kind: "isa", scen: "devices" },
  { id: "A-isa-payroll", mode: "hierarchy", family: "isa", kind: "isa", scen: "payroll" },
  { id: "A-isa-tiles", mode: "hierarchy", family: "isa", kind: "isa", scen: "tiles" },
  { id: "A-isa-instruments", mode: "hierarchy", family: "isa", kind: "isa", scen: "instruments" },

  ...RAW.hierarchy,

  /* =================== MODE B — Method Override Inspector ================= */
  ...RAW.override,

  { id: "B-runs-book", mode: "override", family: "runs", kind: "runs", scen: "library", decls: [D("Item", "item", "Book")], stmt: { k: "call", v: "item", m: "checkout" } },
  { id: "B-runs-book-int", mode: "override", family: "runs", kind: "runs", scen: "library", decls: [D("Item", "item", "Book")], stmt: { k: "call", v: "item", m: "checkout", args: [7] } },
  { id: "B-runs-private", mode: "override", family: "runs", kind: "runs", scen: "reports", decls: [D("Report", "r", "Invoice")], stmt: { k: "call", v: "r", m: "render" }, target: "header" },
  { id: "B-runs-footer", mode: "override", family: "runs", kind: "runs", scen: "reports", decls: [D("Report", "r", "Invoice")], stmt: { k: "call", v: "r", m: "render" }, target: "footer" },
  { id: "B-runs-alert", mode: "override", family: "runs", kind: "runs", scen: "messages", decls: [D("Message", "msg", "Alert")], stmt: { k: "call", v: "msg", m: "send" }, target: "body" },

  { id: "B-super-director", mode: "override", family: "super", kind: "sequence", scen: "payroll", decls: [D("Employee", "e", "Director")], stmt: { k: "call", v: "e", m: "describe" } },
  { id: "B-super-manager", mode: "override", family: "super", kind: "sequence", scen: "payroll", decls: [D("Employee", "e", "Manager")], stmt: { k: "call", v: "e", m: "describe" } },
  { id: "B-super-gift", mode: "override", family: "super", kind: "sequence", classes: orders, decls: [D("Order", "order", "GiftOrder")], stmt: { k: "call", v: "order", m: "total" } },

  { id: "B-static-passes", mode: "override", family: "static", kind: "outputs", scen: "passes", decls: [D("Pass", "p", "YouthPass"), D("YouthPass", "y", "YouthPass")], rows: [{ k: "call", v: "p", m: "label" }, { k: "call", v: "p", m: "policy" }, { k: "call", v: "y", m: "policy" }] },
  { id: "B-static-tools", mode: "override", family: "static", kind: "outputs", classes: tools, decls: [D("Tool", "t", "Drill"), D("Drill", "d", "Drill")], rows: [{ k: "call", v: "t", m: "use" }, { k: "call", v: "t", m: "brand" }, { k: "call", v: "d", m: "brand" }, { k: "call", v: "d", m: "describe" }] },

  { id: "B-compare-lamp", mode: "override", family: "compare", kind: "versions", versions: [["Version 1", lampA], ["Version 2", lampB]], decls: [D("Lamp", "lamp", "SmartLamp")], stmt: { k: "call", v: "lamp", m: "glow" } },
  { id: "B-compare-timer", mode: "override", family: "compare", kind: "versions", versions: [["Version 1", timerA], ["Version 2", timerB]], decls: [D("Timer", "timer", "OvenTimer")], stmt: { k: "call", v: "timer", m: "start", args: [5] } },

  /* =================== MODE C — Polymorphism Tracer ======================= */
  { id: "C-identify-thermostat", mode: "tracer", family: "identify", kind: "trace", scen: "devices", decls: [D("Device", "d", "Thermostat")], stmt: { k: "call", v: "d", m: "status" } },
  { id: "C-identify-bike", mode: "tracer", family: "identify", kind: "trace", scen: "couriers", decls: [D("Courier", "c", "Bike")], stmt: { k: "call", v: "c", m: "deliver" } },
  { id: "C-identify-exit", mode: "tracer", family: "identify", kind: "trace", scen: "tiles", decls: [D("Tile", "tile", "Exit")], stmt: { k: "call", v: "tile", m: "symbol" } },
  { id: "C-identify-electric", mode: "tracer", family: "identify", kind: "trace", scen: "instruments", decls: [D("Instrument", "inst", "ElectricGuitar")], stmt: { k: "call", v: "inst", m: "play" } },
  { id: "C-identify-alert", mode: "tracer", family: "identify", kind: "trace", scen: "messages", decls: [D("Text", "t", "Alert")], stmt: { k: "call", v: "t", m: "body" } },

  { id: "C-swap-devices", mode: "tracer", family: "swap", kind: "swap", scen: "devices", declType: "Device", v: "d", m: "report", objs: ["Device", "Thermostat", "Camera", "DoorCam"] },
  { id: "C-swap-tiles", mode: "tracer", family: "swap", kind: "swap", scen: "tiles", declType: "Tile", v: "tile", m: "enter", objs: ["Tile", "Trap", "Portal", "Exit"] },
  { id: "C-swap-payments", mode: "tracer", family: "swap", kind: "swap", scen: "payments", declType: "Payment", v: "pay", m: "receipt", objs: ["Card", "GiftCard", "Cash"] },
  { id: "C-swap-instruments", mode: "tracer", family: "swap", kind: "swap", scen: "instruments", declType: "Instrument", v: "inst", m: "perform", objs: ["Instrument", "Guitar", "ElectricGuitar", "Drum"] },

  { id: "C-template-exit", mode: "tracer", family: "template", kind: "sequence", scen: "tiles", decls: [D("Tile", "tile", "Exit")], stmt: { k: "call", v: "tile", m: "enter" }, withOutput: true },
  { id: "C-template-giftcard", mode: "tracer", family: "template", kind: "sequence", scen: "payments", decls: [D("Payment", "pay", "GiftCard")], stmt: { k: "call", v: "pay", m: "receipt" }, withOutput: true },
  { id: "C-template-sensor", mode: "tracer", family: "template", kind: "sequence", scen: "sensors", decls: [D("Sensor", "sensor", "Thermometer")], stmt: { k: "call", v: "sensor", m: "display" }, withOutput: true },
  { id: "C-template-student", mode: "tracer", family: "template", kind: "sequence", scen: "accounts", decls: [D("Account", "acct", "StudentChecking")], stmt: { k: "call", v: "acct", m: "summary" }, withOutput: true },

  { id: "C-compiles-drone", mode: "tracer", family: "compiles", kind: "compiles", scen: "couriers", decls: [D("Courier", "c", "Drone")],
    rows: [{ k: "call", v: "c", m: "deliver" }, { k: "call", v: "c", m: "charge" }, { k: "cast", v: "c", to: "Drone", m: "charge" }, { k: "cast", v: "c", to: "Bike", m: "eta" }] },
  { id: "C-compiles-fern", mode: "tracer", family: "compiles", kind: "compiles", scen: "plants", decls: [D("Plant", "plant", "Fern")],
    rows: [{ k: "call", v: "plant", m: "mist" }, { k: "call", v: "plant", m: "light" }, { k: "cast", v: "plant", to: "Fern", m: "mist" }, { k: "cast", v: "plant", to: "Cactus", m: "water" }] },
  { id: "C-compiles-doorcam", mode: "tracer", family: "compiles", kind: "compiles", scen: "devices", decls: [D("Device", "d", "DoorCam")],
    rows: [{ k: "call", v: "d", m: "record" }, { k: "cast", v: "d", to: "Camera", m: "record" }, { k: "call", v: "d", m: "name" }, { k: "assign", t: "Camera", name: "cam", from: "d" }] },
  { id: "C-compiles-text", mode: "tracer", family: "compiles", kind: "compiles", scen: "messages", decls: [D("Message", "msg", "Text")],
    rows: [{ k: "call", v: "msg", m: "send" }, { k: "assign", t: "Text", name: "t", from: "msg" }, { k: "castAssign", t: "Text", name: "t", from: "msg" }, { k: "castAssign", t: "Alert", name: "a", from: "msg" }] },

  { id: "C-ctor-sportscar", mode: "tracer", family: "ctor", kind: "ctor", scen: "vehicles", target: "SportsCar" },
  { id: "C-ctor-truck", mode: "tracer", family: "ctor", kind: "ctor", scen: "vehicles", target: "Truck" },
  { id: "C-ctor-highschool", mode: "tracer", family: "ctor", kind: "ctor", scen: "buildings", target: "HighSchool" },
  { id: "C-ctor-library", mode: "tracer", family: "ctor", kind: "ctor", scen: "buildings", target: "Library" },

  /* =================== MODE D — Abstract Class Workshop =================== */
  { id: "D-implement-motion", mode: "abstract", family: "implement", kind: "implement", scen: "sensors", newClass: "DoorSensor", ext: "SmartSensor" },
  { id: "D-implement-crypto", mode: "abstract", family: "implement", kind: "implement", scen: "payments", newClass: "Crypto", ext: "Payment" },
  { id: "D-implement-giftcard", mode: "abstract", family: "implement", kind: "implement", scen: "payments", newClass: "StoreCard", ext: "Card" },
  { id: "D-implement-business", mode: "abstract", family: "implement", kind: "implement", scen: "accounts", newClass: "Business", ext: "Account" },
  { id: "D-implement-humidity", mode: "abstract", family: "implement", kind: "implement", scen: "sensors", newClass: "Hygrometer", ext: "Sensor" },
  ...RAW.abstract,

  /* =================== MODE E — Inheritance Debugger ====================== */
  ...RAW.debug,
];

export const MODES = {
  hierarchy: "Class Hierarchy Builder",
  override: "Method Override Inspector",
  tracer: "Polymorphism Tracer",
  abstract: "Abstract Class Workshop",
  debug: "Inheritance Debugger",
};
export const FAMILY_TITLES = {
  hierarchy: { connect: "Build the hierarchy", has: "What does an object inherit?", supplier: "Whose code runs?", isa: "Is-a assignments", fix: "Repair an invalid hierarchy" },
  override: { classify: "Override, overload, or error?", runs: "Which declaration runs?", super: "Calls through super", static: "Static methods are hidden", compare: "Override vs. overload outcome" },
  tracer: { identify: "Reference vs. object", swap: "Swap the object", template: "Methods that call other methods", compiles: "Compile time vs. run time", ctor: "Constructor chaining" },
  abstract: { mustabstract: "Which class must be abstract?", implement: "What must be implemented?", header: "Write the implementing header", instantiate: "Creating objects", compiles: "Does it compile?" },
  debug: { signature: "Override that isn't", assign: "Invalid assignment", abstract: "Abstract rules", subonly: "Subclass-only method", super: "super and constructors", visibility: "Weaker access", expectation: "Wrong assumption about what runs" },
};
