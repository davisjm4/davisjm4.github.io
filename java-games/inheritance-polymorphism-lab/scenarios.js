/* Inheritance & Polymorphism Lab — class hierarchies used by model-driven
   challenges. Each hierarchy has a different SHAPE and a different reason to
   exist (template methods, private helpers, static methods, overloads,
   abstract middles, constructor chains), so challenges built on them need
   different reasoning — not just different names. All are compiled and run
   on a real JVM by the tests. */
import { cls, method as m, over as o, abstractMethod as abs, call as c, sup as s, par as p } from "./java-model.js?v=iplab-v1";

export const SCENARIOS = {
  /* Depth 3, two branches. report() is a template method that calls two
     overridable methods; DoorCam inherits name() from Camera. */
  devices: [
    cls("Device", null, [m("status", ["idle"]), m("name", ["Device"]), m("report", [c("name"), ": ", c("status")])]),
    cls("Thermostat", "Device", [o("status", ["heating"])]),
    cls("Camera", "Device", [o("name", ["Camera"]), m("record", ["recording"])]),
    cls("DoorCam", "Camera", [o("status", ["watching the porch"])]),
  ],

  /* Fan-out of three siblings; one subclass-only method (charge). */
  couriers: [
    cls("Courier", null, [m("deliver", ["by road"]), m("eta", ["2 days"]), m("track", ["Tracking: ", c("deliver")])]),
    cls("Drone", "Courier", [o("deliver", ["by air"]), m("charge", ["charging"])]),
    cls("Bike", "Courier", [o("eta", ["same day"])]),
    cls("Van", "Courier", []),
  ],

  /* Chain of four with super calls stacking up. */
  payroll: [
    cls("Employee", null, [m("title", ["Staff"]), m("pay", ["salary"]), m("describe", [c("title"), " paid by ", c("pay")])]),
    cls("Manager", "Employee", [o("title", ["Manager"]), o("describe", [s("describe"), " + bonus"])]),
    cls("Director", "Manager", [o("title", ["Director"]), o("describe", [s("describe"), " + stock"])]),
    cls("Intern", "Employee", [o("pay", ["stipend"])]),
  ],

  /* send() is overridden in the middle; body() is overridden at two levels. */
  messages: [
    cls("Message", null, [m("body", ["message"]), m("send", ["Sending ", c("body")])]),
    cls("Email", "Message", [o("body", ["email"])]),
    cls("Text", "Message", [o("send", ["Texting ", c("body")])]),
    cls("Alert", "Text", [o("body", ["ALERT"])]),
  ],

  /* Game tiles: Exit changes behavior by overriding only a helper. */
  tiles: [
    cls("Tile", null, [m("symbol", ["."]), m("enter", ["nothing happens"])]),
    cls("Trap", "Tile", [o("symbol", ["^"]), o("enter", ["you fall in"])]),
    cls("Portal", "Tile", [o("symbol", ["@"]), o("enter", ["teleport to ", c("destination")]), m("destination", ["the start"])]),
    cls("Exit", "Portal", [o("destination", ["the next level"])]),
  ],

  /* Static methods are hidden, not overridden. */
  passes: [
    cls("Pass", null, [m("policy", ["standard rules"], { static: true }), m("label", ["Pass"])]),
    cls("YouthPass", "Pass", [m("policy", ["youth rules"], { static: true }), o("label", ["Youth pass"])]),
  ],

  /* Overloads next to an override: only same-signature methods override. */
  library: [
    cls("Item", null, [m("checkout", ["2 weeks"]), m("checkout", [p("days"), " days"], { params: [["int", "days"]] })]),
    cls("Book", "Item", [o("checkout", ["3 weeks"]), m("checkout", ["held for ", p("name")], { params: [["String", "name"]] })]),
  ],

  /* A private helper is never overridden — Invoice's header() is a new method. */
  reports: [
    cls("Report", null, [m("header", ["Report"], { vis: "private" }), m("render", ["[", c("header"), "] ", c("footer")]), m("footer", ["page 1"])]),
    cls("Invoice", "Report", [m("header", ["Invoice"]), o("footer", ["due in 30 days"])]),
  ],

  /* Abstract root with an abstract middle class. */
  sensors: [
    cls("Sensor", null, [abs("reading"), m("unit", ["units"]), m("display", [c("reading"), " ", c("unit")])], { abstract: true }),
    cls("Thermometer", "Sensor", [o("reading", ["72"]), o("unit", ["degrees"])]),
    cls("SmartSensor", "Sensor", [abs("network"), m("sync", ["synced over ", c("network")])], { abstract: true }),
    cls("MotionSensor", "SmartSensor", [o("reading", ["motion"]), o("network", ["wifi"])]),
  ],

  /* Abstract class whose concrete subclasses override different things. */
  accounts: [
    cls("Account", null, [abs("monthlyFee"), m("type", ["account"]), m("summary", [c("type"), " fee: ", c("monthlyFee")])], { abstract: true }),
    cls("Savings", "Account", [o("monthlyFee", ["$0"])]),
    cls("Checking", "Account", [o("monthlyFee", ["$5"]), o("type", ["checking"])]),
    cls("StudentChecking", "Checking", [o("monthlyFee", ["$1"])]),
  ],

  /* Abstract payment types; Card's fee is inherited by GiftCard. */
  payments: [
    cls("Payment", null, [abs("fee"), m("method", ["cash"]), m("receipt", ["Paid by ", c("method"), ", fee ", c("fee")])], { abstract: true }),
    cls("Card", "Payment", [o("fee", ["2%"]), o("method", ["card"])]),
    cls("GiftCard", "Card", [o("method", ["gift card"])]),
    cls("Cash", "Payment", [o("fee", ["none"])]),
  ],

  /* Constructor chains (superclass constructors finish first). */
  vehicles: [
    cls("Vehicle", null, [m("wheels", ["4"])], { ctor: { print: "Vehicle " } }),
    cls("Car", "Vehicle", [], { ctor: { print: "Car " } }),
    cls("SportsCar", "Car", [o("wheels", ["4 wide"])], { ctor: { print: "SportsCar " } }),
    cls("Truck", "Vehicle", [o("wheels", ["18"])], { ctor: { print: "Truck " } }),
  ],
  buildings: [
    cls("Building", null, [m("floors", ["1"])], { ctor: { params: [["String", "id"]], print: "Building " } }),
    cls("School", "Building", [o("floors", ["2"])], { ctor: { params: [["String", "id"]], superArgs: ["id"], print: "School " } }),
    cls("HighSchool", "School", [], { ctor: { params: [], superArgs: ['"HS-1"'], print: "HighSchool " } }),
    cls("Library", "Building", [], { ctor: { params: [], superArgs: ['"LIB"'], print: "Library " } }),
  ],

  /* Plants: one subclass-only method, one private method. */
  plants: [
    cls("Plant", null, [m("water", ["weekly"]), m("light", ["bright"]), m("soil", ["potting mix"], { vis: "private" })]),
    cls("Cactus", "Plant", [o("water", ["monthly"])]),
    cls("Fern", "Plant", [o("light", ["shade"]), m("mist", ["mist daily"])]),
  ],

  /* Two-level chain with a sibling, used for "which class runs" questions. */
  instruments: [
    cls("Instrument", null, [m("play", ["a note"]), m("tune", ["tuned by ear"]), m("perform", [c("tune"), ", then ", c("play")])]),
    cls("Guitar", "Instrument", [o("play", ["a chord"])]),
    cls("ElectricGuitar", "Guitar", [o("tune", ["tuned with a pedal"])]),
    cls("Drum", "Instrument", [o("play", ["a beat"]), o("tune", ["tightened"])]),
  ],
};
