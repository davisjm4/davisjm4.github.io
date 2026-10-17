/* Inheritance & Polymorphism Lab — hand-written items.
   Line markers (stripped before display) keep line numbers exact:
     //@bad            a faulty line (debug/fix items)
     //@id=name        a named line that a fix may edit
     //@row=TAG        a method to classify (override|overload|new|error)
     //@abstract       the class header that must become abstract
     //@slot           the header line the student builds (header items)
   Every compile error, output, and fix here is checked by javac/java in
   tests/iplab-jvm-tests.mjs (javac --release 17). */
export function prep(src) {
  const marks = { bad: [], rows: [], names: {}, abstract: [], slot: null };
  const lines = src.replace(/^\n/, "").replace(/\s+$/, "").split("\n").map((line, i) => {
    const m = line.match(/\s*\/\/@(.*)$/);
    if (!m) return line;
    for (const tag of m[1].trim().split(/\s+/)) {
      if (tag === "bad") marks.bad.push(i);
      else if (tag === "abstract") marks.abstract.push(i);
      else if (tag === "slot") marks.slot = i;
      else if (tag.startsWith("row=")) marks.rows.push({ line: i, tag: tag.slice(4) });
      else if (tag.startsWith("id=")) marks.names[tag.slice(3)] = i;
    }
    return line.slice(0, m.index);
  });
  return { code: lines.join("\n"), marks };
}
const ok = (text, why = "") => ({ text, ok: true, why });
const no = (text, why) => ({ text, ok: false, why });
const edit = (edits, isOk, why = "") => ({ edits, ok: isOk, why });

/* ============================ A — repair a hierarchy ===================== */
const hierarchy = [
  {
    id: "A-fix-multiple", family: "fix", kind: "debug", askOutcome: false,
    src: `
class Car {
    String drive() {
        return "driving";
    }
}

class Electric {  //@id=electric
    String charge() {
        return "charging";
    }
}

class Hybrid extends Car, Electric {  //@bad
}

public class Main {
    public static void main(String[] args) {
        Hybrid h = new Hybrid();
        System.out.println(h.drive() + " and " + h.charge());
    }
}`,
    question: "Hybrid should be able to drive() and charge(). Click the line Java rejects, then choose the repair.",
    error: "'{' expected",
    intended: "driving and charging",
    fixes: [
      edit({ electric: "class Electric extends Car {", bad: "class Hybrid extends Electric {" }, true),
      edit({ bad: "class Hybrid extends Car {" }, false, "Now Hybrid has drive() but not charge(), so h.charge() doesn't compile."),
      edit({ bad: "class Hybrid extends Car extends Electric {" }, false, "A class may have only one extends clause; this still doesn't compile."),
      edit({ bad: "class Hybrid extends Car implements Electric {" }, false, "implements is for interfaces. Electric is a class, so this doesn't compile."),
    ],
    explanation: "A Java class can extend only ONE class. To get both behaviors through inheritance, chain them: Electric extends Car, and Hybrid extends Electric. Hybrid then inherits drive() from Car and charge() from Electric.",
  },
  {
    id: "A-fix-cycle", family: "fix", kind: "debug", askOutcome: false,
    src: `
class Category extends Subcategory {  //@bad
    String label() {
        return "category";
    }
}

class Subcategory extends Category {
    String path() {
        return "home > " + label();
    }
}

public class Main {
    public static void main(String[] args) {
        Subcategory s = new Subcategory();
        System.out.println(s.path());
    }
}`,
    question: "Subcategory is meant to be a kind of Category. Click the line Java rejects, then choose the repair.",
    error: "cyclic inheritance",
    errorLine: 0,
    intended: "home > category",
    fixes: [
      ok("class Category {"),
      no("class Category extends Object, Subcategory {", "A class can name only one superclass, and this still creates a cycle."),
      no("abstract class Category extends Subcategory {", "Making it abstract doesn't break the cycle: each class still extends the other."),
    ],
    explanation: "Each class claimed to be the other's superclass, which makes a cycle. A hierarchy must be a tree: Category is the general class (implicitly extending Object), and Subcategory extends it.",
  },
  {
    id: "A-fix-wrongparent", family: "fix", kind: "debug", askOutcome: false,
    src: `
class Employee {
    String pay() {
        return "salary";
    }
}

class Intern extends Employee {
    @Override
    String pay() {
        return "stipend";
    }
}

class Manager extends Intern {  //@bad
    String approve() {
        return "approved";
    }
}

public class Main {
    public static void main(String[] args) {
        Manager m = new Manager();
        System.out.println(m.pay());
    }
}`,
    question: "This compiles, but it prints \"stipend\" — managers should be paid a salary. Click the line that causes it, then choose the repair.",
    actual: "stipend",
    intended: "salary",
    fixes: [
      ok("class Manager extends Employee {"),
      no("class Manager extends Intern, Employee {", "Java allows only one superclass, so this doesn't compile."),
      no("class Manager {", "Now Manager inherits nothing, so m.pay() doesn't compile."),
    ],
    explanation: "Manager extended Intern, so it inherited Intern's overriding pay(). A manager is an Employee, not an Intern; extending Employee directly gives it Employee's pay().",
  },
  {
    id: "A-fix-final", family: "fix", kind: "debug", askOutcome: false,
    src: `
final class Ticket {  //@bad
    String admit() {
        return "one person";
    }
}

class GroupTicket extends Ticket {
    @Override
    String admit() {
        return "up to six people";
    }
}

public class Main {
    public static void main(String[] args) {
        Ticket t = new GroupTicket();
        System.out.println(t.admit());
    }
}`,
    question: "GroupTicket should be a kind of Ticket. Click the line that prevents it, then choose the repair.",
    error: "cannot inherit from final",
    errorLine: 6,
    intended: "up to six people",
    fixes: [
      ok("class Ticket {"),
      no("abstract final class Ticket {", "A class can't be both abstract and final; this doesn't compile."),
      no("final class Ticket extends Object {", "Ticket is still final, so GroupTicket still can't extend it."),
    ],
    explanation: "A final class can't have subclasses. Removing final from Ticket allows GroupTicket to extend it and override admit().",
  },
];

/* ============================ B — classify methods ======================= */
const TAGS = ["override", "overload", "new", "error"];
const override = [
  {
    id: "B-classify-lamp", family: "classify", kind: "tags",
    src: `
class Lamp {
    String glow() {
        return "dim";
    }

    public String color() {
        return "white";
    }
}

class SmartLamp extends Lamp {
    String glow() {  //@row=override
        return "bright";
    }

    String glow(String mood) {  //@row=overload
        return mood + " light";
    }

    String color() {  //@row=error
        return "blue";
    }

    String schedule() {  //@row=new
        return "on at 7:00";
    }
}`,
    why: {
      override: "Same name and parameter list as Lamp's glow(). It overrides — even without @Override.",
      overload: "Same name, different parameter list (String). It's a second glow method, not a replacement.",
      error: "color() matches Lamp's public color() but has package access. An override can't have weaker access.",
      new: "Lamp has no schedule() method, so this is simply a new method.",
    },
  },
  {
    id: "B-classify-ticket", family: "classify", kind: "tags",
    src: `
class Ticket {
    int price() {
        return 10;
    }

    String seat() {
        return "general";
    }
}

class VipTicket extends Ticket {
    @Override
    double price() {  //@row=error
        return 25.0;
    }

    @Override
    String seat() {  //@row=override
        return "front row";
    }

    String seat(int row) {  //@row=overload
        return "row " + row;
    }

    String perks() {  //@row=new
        return "lounge access";
    }
}`,
    why: {
      error: "Same signature as price() but a different return type (double vs. int). An override must return the same type (or a subclass type for objects).",
      override: "Same name and parameter list as Ticket's seat(), so it replaces it for VipTicket objects.",
      overload: "seat(int) has a different parameter list from seat(), so it overloads.",
      new: "Ticket has no perks() method.",
    },
  },
  {
    id: "B-classify-annotation", family: "classify", kind: "tags",
    src: `
class Sensor {
    String reading() {
        return "0";
    }

    String status() {
        return "ok";
    }
}

class GpsSensor extends Sensor {
    @Override
    String Reading() {  //@row=error
        return "36.1N";
    }

    String status() {  //@row=override
        return "locked";
    }

    @Override
    String status(int satellites) {  //@row=error
        return satellites + " satellites";
    }

    private String status(double accuracy) {  //@row=overload
        return "within " + accuracy;
    }
}`,
    why: {
      error: "@Override asks the compiler to confirm this replaces an inherited method. No inherited method has this exact name and parameter list, so it's a compile error.",
      override: "Same name and parameter list as Sensor's status(). @Override is optional — it overrides either way.",
      overload: "A different parameter list (double). Overloads may have any access, including private.",
    },
  },
  {
    id: "B-classify-private", family: "classify", kind: "tags",
    src: `
class Account {
    private String code() {
        return "A-100";
    }

    private String secret() {
        return "1234";
    }

    protected String owner() {
        return "Ana";
    }
}

class JointAccount extends Account {
    @Override
    String code() {  //@row=error
        return "J-200";
    }

    String secret() {  //@row=new
        return "5678";
    }

    @Override
    public String owner() {  //@row=override
        return "Ana and Ben";
    }

    String owner(String partner) {  //@row=overload
        return "Ana and " + partner;
    }
}`,
    why: {
      error: "Account's code() is private, so JointAccount doesn't inherit it and there is nothing to override. @Override makes that a compile error.",
      new: "Account's secret() is private and not inherited, so this is a brand-new method (not an override).",
      override: "Overrides owner(). Making access wider (protected → public) is allowed.",
      overload: "owner(String) has a different parameter list, so it overloads owner().",
    },
  },
].map((x) => ({ ...x, mode: "override", tags: TAGS }));

/* ============================ D — abstract classes ======================= */
const abstract = [
  {
    id: "D-must-plan", family: "mustabstract", kind: "mustabstract",
    src: `
class Plan {  //@abstract
    abstract double monthlyCost();

    String label() {
        return "Plan";
    }
}

class Basic extends Plan {
    @Override
    double monthlyCost() {
        return 9.99;
    }
}

class Family extends Plan {
    @Override
    double monthlyCost() {
        return 19.99;
    }
}`,
    explanation: "Plan declares an abstract method (no body), so Plan itself must be declared abstract. Basic and Family implement monthlyCost(), so they can stay concrete.",
  },
  {
    id: "D-must-floor", family: "mustabstract", kind: "mustabstract",
    src: `
abstract class Tile {
    abstract String draw();
}

class Wall extends Tile {
    @Override
    String draw() {
        return "#";
    }
}

class Floor extends Tile {  //@abstract
    String color() {
        return "gray";
    }
}

class Carpet extends Floor {
    @Override
    String draw() {
        return "~";
    }
}`,
    explanation: "Floor inherits the abstract draw() and doesn't implement it, so Floor must be abstract (or implement draw()). Carpet then supplies draw(), so Carpet can be concrete.",
  },
  {
    id: "D-must-lab", family: "mustabstract", kind: "mustabstract",
    src: `
abstract class Lesson {
    abstract String topic();

    abstract int minutes();
}

class Lab extends Lesson {  //@abstract
    @Override
    String topic() {
        return "experiments";
    }
}

class ChemistryLab extends Lab {
    @Override
    int minutes() {
        return 90;
    }
}`,
    explanation: "Lab implements topic() but not minutes(), so it still has an abstract method and must be declared abstract. ChemistryLab finishes the job by implementing minutes().",
  },
  /* Build the implementing header. Each choice is checked against javac. */
  {
    id: "D-header-booking", family: "header", kind: "header",
    src: `
abstract class Booking {
    protected abstract double cost(int nights);
}

class HotelBooking extends Booking {
    @Override
    HEADER {  //@slot
        BODY
    }
}`,
    name: "cost",
    segments: {
      access: ["public", "protected", "", "private"],
      ret: ["double", "int", "Double", "void"],
      params: [
        { text: "(int nights)", types: ["int"], body: "return 89.0 * nights;" },
        { text: "(int stay)", types: ["int"], body: "return 89.0 * stay;" },
        { text: "(double nights)", types: ["double"], body: "return 89.0 * nights;" },
        { text: "()", types: [], body: "return 89.0;" },
      ],
    },
    required: { access: "protected", ret: "double", types: ["int"] },
    explanation: "An implementation must match the abstract method's name and parameter TYPES (parameter names may differ), return the same primitive type, and be at least as accessible: protected or public.",
  },
  {
    id: "D-header-formatter", family: "header", kind: "header",
    src: `
abstract class Formatter {
    abstract String format(String text, int width);
}

class Truncator extends Formatter {
    @Override
    HEADER {  //@slot
        BODY
    }
}`,
    name: "format",
    segments: {
      access: ["public", "protected", "", "private"],
      ret: ["String", "Object", "CharSequence", "void"],
      params: [
        { text: "(String text, int width)", types: ["String", "int"], body: "return text.substring(0, width);" },
        { text: "(String s, int n)", types: ["String", "int"], body: "return s.substring(0, n);" },
        { text: "(int width, String text)", types: ["int", "String"], body: "return text.substring(0, width);" },
        { text: "(String text)", types: ["String"], body: "return text;" },
      ],
    },
    required: { access: "", ret: "String", types: ["String", "int"] },
    explanation: "format has package access, so the implementation may use package access, protected, or public — anything but private. Parameter types must appear in the same order, and the return type must be String (a more general type like Object isn't allowed).",
  },
  {
    id: "D-header-limit", family: "header", kind: "header",
    src: `
abstract class SpendingRule {
    public abstract boolean accepts(double amount);
}

class DailyLimit extends SpendingRule {
    @Override
    HEADER {  //@slot
        BODY
    }
}`,
    name: "accepts",
    segments: {
      access: ["public", "protected", "", "private"],
      ret: ["boolean", "Boolean", "int", "void"],
      params: [
        { text: "(double amount)", types: ["double"], body: "return amount <= 200;" },
        { text: "(double value)", types: ["double"], body: "return value <= 200;" },
        { text: "(int amount)", types: ["int"], body: "return amount <= 200;" },
        { text: "(Double amount)", types: ["Double"], body: "return amount <= 200;" },
      ],
    },
    required: { access: "public", ret: "boolean", types: ["double"] },
    explanation: "A public abstract method must be implemented as public. The parameter type must be exactly double (int or Double makes a different signature — an overload), and boolean can't be swapped for Boolean.",
  },
  /* Which statements compile? (classes come from a scenario) */
  {
    id: "D-instantiate-accounts", family: "instantiate", kind: "rows", scen: "accounts",
    rows: [
      { stmt: "Account a = new Account();", ok: false, why: "Account is abstract, so new Account() is not allowed." },
      { stmt: "Account a = new Savings();", ok: true, why: "Savings is concrete, and a Savings is an Account." },
      { stmt: "Account[] all = new Account[3];", ok: true, why: "This creates an ARRAY that can hold Account references. No Account object is created." },
      { stmt: "Savings s = new Account();", ok: false, why: "Account is abstract — and an Account isn't necessarily a Savings anyway." },
      { stmt: "Checking c = new StudentChecking();", ok: true, why: "StudentChecking is concrete and is a Checking." },
    ],
    explanation: "An abstract class can be used as a variable type, an array element type, or a superclass — it just can't be created with new.",
  },
  {
    id: "D-instantiate-sensors", family: "instantiate", kind: "rows", scen: "sensors",
    rows: [
      { stmt: "Sensor s = new SmartSensor();", ok: false, why: "SmartSensor is abstract too, even though it's a subclass." },
      { stmt: "SmartSensor ss = new MotionSensor();", ok: true, why: "MotionSensor is concrete and is a SmartSensor." },
      { stmt: "Sensor[] grid = new Sensor[4];", ok: true, why: "An array of Sensor references is fine; it starts out holding null." },
      { stmt: "Thermometer t = new Sensor();", ok: false, why: "Sensor is abstract, so it can't be created." },
      { stmt: "Sensor s = new Thermometer();", ok: true, why: "Thermometer implements reading(), so it's concrete." },
    ],
    explanation: "Being abstract isn't inherited automatically, but it isn't removed automatically either: each class is abstract only if declared so, and only concrete classes can be created with new.",
  },
  /* Does it compile? (outcome + reason) */
  {
    id: "D-compiles-constructor", family: "compiles", kind: "choice",
    src: `
abstract class Course {
    private String name;

    Course(String name) {
        this.name = name;
    }

    String name() {
        return name;
    }

    abstract int credits();
}

class Algebra extends Course {
    Algebra() {
        super("Algebra");
    }

    @Override
    int credits() {
        return 5;
    }
}

public class Main {
    public static void main(String[] args) {
        Course c = new Algebra();
        System.out.println(c.name() + " " + c.credits());
    }
}`,
    question: "What happens when this program is compiled and run?",
    verify: { compiles: true, output: "Algebra 5" },
    options: [
      ok("It compiles and prints Algebra 5."),
      no("Compile error: an abstract class can't have a constructor.", "Abstract classes can have constructors. They run when a subclass object is created, through super(...)."),
      no("Compile error: super(\"Algebra\") tries to create a Course, which is abstract.", "super(...) doesn't create a separate Course object; it initializes the Course part of the Algebra object."),
      no("It compiles, but name() returns null because Course is never created.", "Course's constructor runs as part of new Algebra(), so name is set to \"Algebra\"."),
    ],
    explanation: "An abstract class's constructor initializes the superclass part of every subclass object. new Algebra() runs Course(\"Algebra\") first via super, then the rest of Algebra's constructor.",
  },
  {
    id: "D-compiles-noabstract", family: "compiles", kind: "choice",
    src: `
abstract class Badge {
    String text() {
        return "badge";
    }
}

class StarBadge extends Badge {
}

public class Main {
    public static void main(String[] args) {
        Badge b = new StarBadge();
        Badge c = new Badge();
        System.out.println(b.text() + c.text());
    }
}`,
    question: "What does javac report?",
    verify: { compiles: false, error: "is abstract; cannot be instantiated", errorLine: 12 },
    options: [
      ok("Only new Badge() is an error: abstract classes can't be instantiated."),
      no("An error at abstract class Badge: an abstract class must contain an abstract method.", "An abstract class may have zero abstract methods. Marking it abstract simply prevents new Badge()."),
      no("No error; it prints badgebadge.", "new Badge() is not allowed because Badge is declared abstract."),
      no("An error at class StarBadge: it must override text().", "text() has a body, so StarBadge inherits it; nothing is left to implement."),
    ],
    explanation: "abstract on a class means “don't create objects of exactly this class.” It doesn't require abstract methods.",
  },
  {
    id: "D-compiles-body", family: "compiles", kind: "choice",
    src: `
abstract class Scale {
    abstract String unit() {
        return "kg";
    }
}

class KitchenScale extends Scale {
    @Override
    String unit() {
        return "g";
    }
}`,
    question: "What does javac report?",
    verify: { compiles: false, error: "abstract methods cannot have a body", errorLine: 1 },
    options: [
      ok("An error at unit() in Scale: an abstract method can't have a body."),
      no("No error: KitchenScale overrides unit(), so the body in Scale is never used.", "The rule is checked on Scale itself, whatever subclasses do."),
      no("An error at class KitchenScale: it doesn't implement unit().", "KitchenScale does implement unit(). The problem is in Scale."),
      no("An error at abstract class Scale: abstract classes can't contain method bodies.", "Abstract classes can contain concrete methods; only methods marked abstract must omit the body."),
    ],
    explanation: "An abstract method is only a declaration ending in a semicolon. To give a default, remove the word abstract from the method and keep the body.",
  },
  {
    id: "D-compiles-reabstract", family: "compiles", kind: "choice",
    src: `
class Printer {
    String print() {
        return "plain";
    }
}

abstract class SecurePrinter extends Printer {
    @Override
    abstract String print();
}

class BadgePrinter extends SecurePrinter {
}`,
    question: "What does javac report?",
    verify: { compiles: false, error: "is not abstract and does not override abstract method", errorLine: 11 },
    options: [
      ok("An error at BadgePrinter: it must implement print(), which SecurePrinter made abstract."),
      no("No error: BadgePrinter inherits the concrete print() method from Printer, two levels up.", "SecurePrinter re-declared print() as abstract, which hides Printer's version from its subclasses."),
      no("An error in SecurePrinter: an abstract method can't override a concrete method.", "Java allows an abstract class to make an inherited method abstract again."),
      no("No error, but calling print() on a BadgePrinter throws an exception.", "Java catches this at compile time: a concrete class can't have an unimplemented method."),
    ],
    explanation: "The nearest declaration wins. Because SecurePrinter made print() abstract, every concrete subclass below it must provide its own print().",
  },
].map((x) => ({ ...x, mode: "abstract" }));

/* ============================ E — debugger ============================== */
const debug = [
  {
    id: "E-signature-thermostat", family: "signature", outcome: "logic",
    src: `
class Thermostat {
    String setTemp(int degrees) {
        return "set to " + degrees;
    }
}

class SmartThermostat extends Thermostat {
    String setTemp(double degrees) {  //@bad
        return "smart set to " + degrees;
    }
}

public class Main {
    public static void main(String[] args) {
        Thermostat t = new SmartThermostat();
        System.out.println(t.setTemp(70));
    }
}`,
    actual: "set to 70",
    intended: "smart set to 70",
    fixes: [
      ok("    String setTemp(int degrees) {"),
      no("    String setTemp(Integer degrees) {", "Integer is a different parameter type from int, so this is still an overload; Thermostat's version still runs."),
      no("    @Override String setTemp(double degrees) {", "@Override would expose the mistake as a compile error, but it doesn't fix the parameter type."),
    ],
    explanation: "setTemp(double) has a different parameter list, so it overloads instead of overriding. Through a Thermostat reference, Java looks for setTemp(int) and runs Thermostat's version. Matching the parameter type makes it a real override.",
  },
  {
    id: "E-signature-typo", family: "signature", outcome: "compile",
    src: `
class Ticket {
    String summary() {
        return "Ticket";
    }
}

class VipTicket extends Ticket {
    @Override
    String Summary() {  //@bad
        return "VIP ticket";
    }
}

public class Main {
    public static void main(String[] args) {
        Ticket t = new VipTicket();
        System.out.println(t.summary());
    }
}`,
    error: "method does not override or implement a method from a supertype",
    errorLine: 7,
    intended: "VIP ticket",
    fixes: [
      ok("    String summary() {"),
      no("    String Summary(String name) {", "Still a different name (Java is case-sensitive), and @Override still fails."),
      no("    static String Summary() {", "Making it static doesn't make it override anything; @Override still fails."),
    ],
    explanation: "Java names are case-sensitive: Summary is not summary. @Override did its job by turning the silent mistake into a compile error.",
  },
  {
    id: "E-signature-return", family: "signature", outcome: "compile",
    src: `
class Quiz {
    int points() {
        return 10;
    }
}

class BonusQuiz extends Quiz {
    @Override
    double points() {  //@bad
        return 12.5;  //@id=body
    }
}

public class Main {
    public static void main(String[] args) {
        Quiz q = new BonusQuiz();
        System.out.println(q.points());
    }
}`,
    error: "return type double is not compatible with int",
    intended: "12",
    fixes: [
      edit({ bad: "    int points() {", body: "        return 12;" }, true),
      edit({ bad: "    long points() {", body: "        return 12;" }, false, "long is still a different return type from int."),
      edit({ bad: "    Integer points() {", body: "        return 12;" }, false, "Integer is a class type, not int, so the return types still don't match."),
    ],
    explanation: "An overriding method must keep the same return type for primitives. Code that calls q.points() through a Quiz reference expects an int.",
  },
  {
    id: "E-assign-truck", family: "assign", outcome: "compile",
    src: `
class Vehicle {
    String move() {
        return "rolling";
    }
}

class Truck extends Vehicle {
    String haul() {
        return "hauling 2 tons";
    }
}

public class Main {
    public static void main(String[] args) {
        Truck t = new Vehicle();  //@bad
        System.out.println(t.haul());
    }
}`,
    error: "incompatible types",
    intended: "hauling 2 tons",
    fixes: [
      ok("        Truck t = new Truck();"),
      no("        Truck t = (Truck) new Vehicle();", "This compiles, but the object really is a plain Vehicle, so the cast throws ClassCastException at run time."),
      no("        Vehicle t = new Truck();", "Now the object is a Truck, but through a Vehicle reference t.haul() doesn't compile."),
    ],
    explanation: "A subclass reference can't point to a superclass object: every Truck is a Vehicle, but not every Vehicle is a Truck. To call haul(), you need a Truck object and a reference type that has haul().",
  },
  {
    id: "E-assign-manager", family: "assign", outcome: "compile",
    src: `
class Employee {
    String role() {
        return "staff";
    }
}

class Manager extends Employee {
    String approve() {
        return "budget approved";
    }
}

public class Main {
    public static void main(String[] args) {
        Employee staff = new Manager();
        Manager boss = staff;  //@bad
        System.out.println(boss.approve());
    }
}`,
    error: "incompatible types",
    intended: "budget approved",
    fixes: [
      ok("        Manager boss = (Manager) staff;"),
      no("        Manager boss = new Employee();", "An Employee object isn't a Manager, so this doesn't compile either."),
      no("        Employee boss = staff;", "This compiles, but then boss.approve() doesn't, because Employee has no approve()."),
    ],
    explanation: "The compiler only knows staff's declared type, Employee, and an Employee might not be a Manager. A cast tells the compiler you know the object is a Manager; it's checked at run time (and succeeds here, because the object really is a Manager).",
  },
  {
    id: "E-abstract-new", family: "abstract", outcome: "compile",
    src: `
abstract class Notification {
    abstract String deliver();
}

class PushNotification extends Notification {
    @Override
    String deliver() {
        return "pushed to phone";
    }
}

public class Main {
    public static void main(String[] args) {
        Notification n = new Notification();  //@bad
        System.out.println(n.deliver());
    }
}`,
    error: "is abstract; cannot be instantiated",
    intended: "pushed to phone",
    fixes: [
      ok("        Notification n = new PushNotification();"),
      no("        PushNotification n = new Notification();", "Still tries to create an abstract Notification."),
      no("        Notification n = (PushNotification) new Notification();", "The cast doesn't matter: new Notification() itself is illegal."),
    ],
    explanation: "Abstract classes can be reference types, but objects must come from a concrete subclass. A Notification reference can point to a PushNotification object.",
  },
  {
    id: "E-abstract-typo", family: "abstract", outcome: "compile",
    src: `
abstract class Shipment {
    abstract String carrier();
}

class Overnight extends Shipment {
    String carriers() {  //@bad
        return "AirFast";
    }
}

public class Main {
    public static void main(String[] args) {
        Shipment s = new Overnight();
        System.out.println(s.carrier());
    }
}`,
    error: "is not abstract and does not override abstract method",
    errorLine: 4,
    intended: "AirFast",
    fixes: [
      ok("    String carrier() {"),
      no("    @Override String carriers() {", "@Override would flag the name, but the method still doesn't implement carrier()."),
      no("    abstract String carriers() {", "An abstract method can't have a body, and the misspelling remains."),
    ],
    explanation: "javac points at the class header because Overnight is concrete but carrier() is still unimplemented — the real defect is the misspelled method name. Adding @Override to every implementation catches this kind of typo right where it happens.",
  },
  {
    id: "E-subonly-drone", family: "subonly", outcome: "compile",
    src: `
class Courier {
    String deliver() {
        return "by road";
    }
}

class Drone extends Courier {
    String charge() {
        return "charging";
    }
}

public class Main {
    public static void main(String[] args) {
        Courier c = new Drone();
        System.out.println(c.charge());  //@bad
    }
}`,
    error: "cannot find symbol",
    intended: "charging",
    fixes: [
      ok("        System.out.println(((Drone) c).charge());"),
      no("        System.out.println(c.super.charge());", "super can only be used inside a class's own methods; this doesn't compile."),
      no("        System.out.println(((Courier) c).charge());", "Casting to Courier changes nothing — Courier has no charge()."),
    ],
    explanation: "The object is a Drone, but the compiler checks calls against the reference type, Courier, which has no charge(). A cast to Drone lets the call compile (and it succeeds at run time because the object is a Drone). Declaring the variable as Drone would also work.",
  },
  {
    id: "E-subonly-inside", family: "subonly", outcome: "compile",
    src: `
class Vehicle {
    String start() {
        return "engine on, " + autopilot();  //@bad
    }  //@id=close
}

class SelfDrivingCar extends Vehicle {
    String autopilot() {
        return "autopilot ready";
    }
}

public class Main {
    public static void main(String[] args) {
        Vehicle v = new SelfDrivingCar();
        System.out.println(v.start());
    }
}`,
    error: "cannot find symbol",
    intended: "engine on, autopilot ready",
    fixes: [
      edit({ close: "    }\n\n    String autopilot() {\n        return \"manual\";\n    }" }, true),
      edit({ bad: "        return \"engine on, \" + super.autopilot();" }, false, "Vehicle's superclass (Object) has no autopilot() either."),
      edit({ bad: "        return \"engine on, \" + this.autopilot();" }, false, "this has type Vehicle inside Vehicle's code, and Vehicle still has no autopilot(); this doesn't compile."),
    ],
    acceptFixLines: ["bad", "close"],
    explanation: "Code in Vehicle can only call methods Vehicle has. Giving Vehicle its own autopilot() (a default) lets SelfDrivingCar override it, so v.start() dispatches to the subclass version.",
  },
  {
    id: "E-super-noarg", family: "super", outcome: "compile",
    src: `
class Building {
    Building(String id) {
        System.out.print(id + " ");
    }
}

class School extends Building {
    School() {  //@bad
        System.out.print("school");
    }
}

public class Main {
    public static void main(String[] args) {
        new School();
        System.out.println();
    }
}`,
    error: "constructor Building in class Building cannot be applied to given types",
    intended: "S-1 school",
    fixes: [
      ok("    School() {\n        super(\"S-1\");"),
      no("    School(String id) {", "School(String) still calls super() implicitly, and Building has no no-argument constructor."),
      no("    School() {\n        super();", "Building has no constructor that takes no arguments."),
    ],
    explanation: "Constructors aren't inherited. If a constructor doesn't call super(...) first, Java inserts super() — but Building only has Building(String), so School must call super(\"...\") explicitly.",
  },
  {
    id: "E-super-order", family: "super", outcome: "compile",
    src: `
class Car {
    Car(String model) {
        System.out.print(model);
    }
}

class RaceCar extends Car {
    RaceCar(String model) {
        System.out.print("Building ");  //@id=first
        super(model);  //@bad
    }
}

public class Main {
    public static void main(String[] args) {
        new RaceCar("R1");
        System.out.println();
    }
}`,
    error: "call to super must be first statement",
    intended: "R1 ready",
    fixes: [
      edit({ first: "        super(model);", bad: "        System.out.print(\" ready\");" }, true),
      edit({ bad: "        this.super(model);" }, false, "There's no this.super(...) form in Java; this doesn't compile."),
      edit({ first: "        super(model);", bad: "        super(model);" }, false, "Calling the superclass constructor twice is not allowed."),
    ],
    explanation: "In Java 17, super(...) must be the very first statement in a constructor: the superclass part is always initialized before the subclass's own code runs.",
  },
  {
    id: "E-super-recursion", family: "super", outcome: "crash",
    src: `
class Order {
    String describe() {
        return "order #42";
    }
}

class ExpressOrder extends Order {
    @Override
    String describe() {
        return describe() + " (express)";  //@bad
    }
}

public class Main {
    public static void main(String[] args) {
        Order o = new ExpressOrder();
        System.out.println(o.describe());
    }
}`,
    exception: "StackOverflowError",
    intended: "order #42 (express)",
    fixes: [
      ok("        return super.describe() + \" (express)\";"),
      no("        return this.describe() + \" (express)\";", "this.describe() is the same call — ExpressOrder's describe() calls itself forever."),
      no("        return Order.describe() + \" (express)\";", "describe() is an instance method; it can't be called with the class name. This doesn't compile."),
    ],
    explanation: "Inside ExpressOrder, describe() means this.describe(), which dispatches back to ExpressOrder's own describe() — endless recursion. super.describe() runs Order's version.",
  },
  {
    id: "E-visibility-label", family: "visibility", outcome: "compile",
    src: `
class Product {
    public String label() {
        return "product";
    }
}

class Book extends Product {
    @Override
    String label() {  //@bad
        return "book";
    }
}

public class Main {
    public static void main(String[] args) {
        Product p = new Book();
        System.out.println(p.label());
    }
}`,
    error: "attempting to assign weaker access privileges",
    intended: "book",
    fixes: [
      ok("    public String label() {"),
      no("    protected String label() {", "protected is still weaker than public."),
      no("    private String label() {", "private is the weakest access of all."),
    ],
    explanation: "An override may keep or widen access, never narrow it: code that can call label() on a Product must be able to call it on any subclass object.",
  },
  {
    id: "E-visibility-rate", family: "visibility", outcome: "compile",
    src: `
class Loan {
    protected double rate() {
        return 0.05;
    }
}

class StudentLoan extends Loan {
    @Override
    double rate() {  //@bad
        return 0.03;
    }
}

public class Main {
    public static void main(String[] args) {
        Loan loan = new StudentLoan();
        System.out.println(loan.rate());
    }
}`,
    error: "attempting to assign weaker access privileges",
    intended: "0.03",
    fixes: [
      ok("    protected double rate() {"),
      ok("    public double rate() {"),
      no("    private double rate() {", "private is weaker than protected."),
    ],
    explanation: "rate() is protected in Loan, so an override must be protected or public. Package access (no modifier) is weaker than protected. Either correct choice is accepted.",
  },
  {
    id: "E-expect-field", family: "expectation", outcome: "logic",
    src: `
class Badge {
    String tier = "silver";

    String tier() {
        return tier;
    }
}

class GoldBadge extends Badge {
    String tier = "gold";

    @Override
    String tier() {
        return tier;
    }
}

public class Main {
    public static void main(String[] args) {
        Badge b = new GoldBadge();
        System.out.println(b.tier);  //@bad
    }
}`,
    actual: "silver",
    intended: "gold",
    fixes: [
      ok("        System.out.println(b.tier());"),
      no("        System.out.println(((Badge) b).tier);", "Still reads a field through a Badge type, so it's still Badge's field: \"silver\"."),
      no("        System.out.println(b.super.tier);", "super can't be used like this from Main; it doesn't compile."),
    ],
    explanation: "Only methods are dynamically dispatched. A field is chosen by the reference's declared type, so b.tier reads Badge's field. Calling the overridden method tier() uses the object's class.",
  },
  {
    id: "E-expect-static", family: "expectation", outcome: "logic",
    src: `
class Theme {
    static String name() {  //@bad
        return "light";
    }

    String show() {
        return "Theme: " + name();
    }
}

class DarkTheme extends Theme {
    static String name() {  //@bad id=child
        return "dark";
    }
}

public class Main {
    public static void main(String[] args) {
        Theme t = new DarkTheme();
        System.out.println(t.show());
    }
}`,
    actual: "Theme: light",
    intended: "Theme: dark",
    fixes: [
      edit({ bad: "    String name() {", child: "    String name() {" }, true),
      edit({ child: "    String name() {" }, false, "An instance method can't replace a static one; this doesn't compile."),
      edit({ bad: "    String name() {" }, false, "A static method can't hide an instance method; this doesn't compile."),
    ],
    explanation: "Static methods belong to the class, so they are hidden, not overridden: name() inside Theme always means Theme.name(). Making both instance methods lets DarkTheme override name(), and show() then dispatches to it.",
  },
  {
    id: "E-expect-private", family: "expectation", outcome: "logic",
    src: `
class Report {
    private String header() {  //@bad
        return "Report";
    }

    String render() {
        return "[" + header() + "]";
    }
}

class Invoice extends Report {
    String header() {
        return "Invoice";
    }
}

public class Main {
    public static void main(String[] args) {
        Report r = new Invoice();
        System.out.println(r.render());
    }
}`,
    actual: "[Report]",
    intended: "[Invoice]",
    fixes: [
      ok("    String header() {"),
      no("    private static String header() {", "Still private (and now static) — nothing can override it."),
      no("    private final String header() {", "Still private, so Invoice's header() remains a separate, new method."),
    ],
    explanation: "Private methods aren't inherited, so Invoice's header() can't override Report's — render() keeps calling Report's own private version. Removing private lets Invoice override it.",
  },
].map((x) => ({ ...x, mode: "debug", kind: "debug", askOutcome: true }));

/* "Select every fix that works": each candidate is judged on its own. */
const fixsets = [
  {
    id: "E-fixes-drone", family: "subonly",
    src: `
class Courier {
    String deliver() {
        return "by road";
    }
}

class Drone extends Courier {
    String charge() {
        return "charging";
    }
}

public class Main {
    public static void main(String[] args) {
        Courier c = new Drone();  //@id=decl
        System.out.println(c.charge());  //@bad
    }
}`,
    error: "cannot find symbol",
    intended: "charging",
    fixes: [
      edit({ decl: "        Drone c = new Drone();" }, true, "Works: with a Drone reference, the compiler finds charge()."),
      edit({ bad: "        System.out.println(((Drone) c).charge());" }, true, "Works: the cast makes the compiler check Drone, and the object really is a Drone."),
      edit({ decl: "        Courier c = new Courier();" }, false, "Still a Courier reference, so c.charge() still doesn't compile."),
      edit({ bad: "        System.out.println(((Courier) c).charge());" }, false, "Casting to Courier changes nothing; Courier has no charge()."),
      edit({ bad: "        System.out.println(c.deliver());" }, false, "Compiles, but prints \"by road\"... — not the charging status that was intended."),
    ],
    explanation: "The compiler checks the declared type of the expression. Either declare the variable as Drone or cast the expression to Drone; both make charge() visible to the compiler.",
  },
  {
    id: "E-fixes-rate", family: "visibility",
    src: `
class Loan {
    protected double rate() {
        return 0.05;
    }
}

class StudentLoan extends Loan {
    @Override  //@id=ann
    double rate() {  //@bad
        return 0.03;
    }
}

public class Main {
    public static void main(String[] args) {
        Loan loan = new StudentLoan();
        System.out.println(loan.rate());
    }
}`,
    error: "attempting to assign weaker access privileges",
    intended: "0.03",
    fixes: [
      edit({ bad: "    protected double rate() {" }, true, "Works: same access as the inherited method."),
      edit({ bad: "    public double rate() {" }, true, "Works: an override may widen access."),
      edit({ ann: "" }, false, "Removing @Override doesn't help: it's still an override with weaker access, which is a compile error with or without the annotation."),
      edit({ bad: "    private double rate() {" }, false, "private is even weaker access."),
      edit({ bad: "    double rate(int years) {" }, false, "That compiles, but it's now an overload (and @Override fails). Even without @Override, loan.rate() would print 0.05."),
    ],
    explanation: "Access rules apply to every override, annotated or not. The overriding method must be at least as accessible as the one it replaces: protected or public here.",
  },
  {
    id: "E-fixes-school", family: "super",
    src: `
class Building {
    private String id;

    Building(String id) {  //@id=ctor
        this.id = id;
    }

    String id() {
        return id;
    }
}

class School extends Building {
    School() {  //@bad
        System.out.print("new school: ");
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new School().id());
    }
}`,
    error: "constructor Building in class Building cannot be applied to given types",
    intended: "new school: S-1",
    fixes: [
      edit({ bad: "    School() {\n        super(\"S-1\");" }, true, "Works: School explicitly initializes its Building part with an id."),
      edit({ ctor: "    Building() {\n        this.id = \"S-1\";\n    }\n\n    Building(String id) {" }, true, "Works: now the implicit super() has a no-argument Building constructor to call, and it sets the id."),
      edit({ bad: "    School() {\n        super();" }, false, "Building still has no no-argument constructor."),
      edit({ ctor: "    Building() {\n    }\n\n    Building(String id) {" }, false, "Compiles, but the id is never set, so it prints \"new school: null\"."),
      edit({ bad: "    School(String id) {" }, false, "School(String) still calls super() implicitly, and main calls new School() with no arguments."),
    ],
    explanation: "Every constructor begins by calling a superclass constructor. If you don't write super(...), Java inserts super() — which only works if the superclass has a no-argument constructor. Either call super(\"S-1\") or give Building a suitable no-argument constructor.",
  },
].map((x) => ({ ...x, mode: "debug", kind: "fixset" }));

export const RAW = {
  hierarchy: hierarchy.map((x) => ({ ...x, mode: "hierarchy" })),
  override,
  abstract,
  debug: [...debug, ...fixsets],
};
