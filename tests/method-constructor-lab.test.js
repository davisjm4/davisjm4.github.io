/* Method & Constructor Lab automated tests.
   Run from the repository root:   node tests/method-constructor-lab.test.js
   (or from java-games/:            npm run test:mcl)
   DOM tests use linkedom, the existing Java Games dev dependency
   (cd java-games && npm install). The javac/JVM verification is in
   tests/method-constructor-lab-jvm.test.js. */
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { createRequire } = require("node:module");

const ROOT = path.resolve(__dirname, "..");
const GAME_DIR = path.join(ROOT, "java-games", "method-constructor-lab");
const PER_MODE = Number(process.env.MCL_PER_MODE || 150);

let checks = 0;
const sections = [];
const ok = (v, msg) => {
  assert.ok(v, msg);
  checks++;
};
const eq = (a, b, msg) => {
  assert.deepEqual(a, b, msg);
  checks++;
};
async function section(name, fn) {
  const before = checks;
  await fn();
  sections.push([name, checks - before]);
  console.log(`  ✓ ${name} (${checks - before} checks)`);
}

(async () => {
  const E = await import(pathToFileURL(path.join(GAME_DIR, "engine.js")).href);
  console.log("Method & Constructor Lab tests");

  await section("Java argument compatibility (widening, no narrowing)", () => {
    ok(E.assignable("int", "double"), "int widens to double");
    ok(E.assignable("char", "int"), "char widens to int");
    ok(E.assignable("int", "long") && E.assignable("float", "double"));
    ok(!E.assignable("double", "int"), "double does not narrow to int");
    ok(!E.assignable("int", "char"), "int does not narrow to char in a method call");
    ok(!E.assignable("boolean", "int") && !E.assignable("int", "boolean"));
    ok(!E.assignable("int", "String") && !E.assignable("char", "String") && !E.assignable("String", "char"));
    ok(E.assignable("String", "String") && E.assignable("String", "Object"));
    const p = (...ts) => ts.map((type, i) => ({ type, name: "p" + i }));
    ok(E.applicable(["String", "int", "boolean"], p("String", "int", "boolean")));
    ok(E.applicable(["String", "int"], p("String", "double")), "int argument to double parameter");
    ok(!E.applicable(["int", "String"], p("String", "int")), "order matters");
    ok(!E.applicable(["String"], p("String", "int")), "count matters");
  });

  await section("overload resolution (most specific applicable method)", () => {
    const o = (...lists) => lists.map((ts) => ({ params: ts.map((type, i) => ({ type, name: "p" + i })) }));
    eq(E.resolveOverload(["int"], o(["int"], ["double"], ["String"])), 0, "exact int wins over double");
    eq(E.resolveOverload(["double"], o(["int"], ["double"], ["String"])), 1);
    eq(E.resolveOverload(["char"], o(["String"], ["int"])), 1, "char widens to int, never to String");
    eq(E.resolveOverload(["int", "int"], o(["double"], ["double", "double"])), 1, "ints widen to (double, double)");
    eq(E.resolveOverload(["int", "double"], o(["int", "int"], ["double", "double"])), 1);
    eq(E.resolveOverload(["String", "int"], o(["int", "int"], ["String", "String"])), -1, "no applicable method");
    eq(E.resolveOverload(["int", "int"], o(["int", "double"], ["double", "int"])), -2, "ambiguous call detected");
    eq(E.resolveOverload([], o([], ["String"])), 0, "no-argument version");
  });

  await section("token model, tap-to-expand selection, and roles", () => {
    const m = E.markedModel("⟦method ⟦access public⟧ ⟦returnType int⟧ ⟦methodName add⟧(⟦paramList ⟦param1 ⟦param1Type int⟧ ⟦param1Name a⟧⟧, ⟦param2 ⟦param2Type int⟧ ⟦param2Name b⟧⟧⟧) {\n    ⟦returnStmt return ⟦returnExpr a + b⟧;⟧\n}⟧");
    eq(m.code, "public int add(int a, int b) {\n    return a + b;\n}");
    const tok = (text, n = 0) => m.tokens.filter((t) => t.text === text)[n].i;
    eq(E.spanText(m, E.spanOf(m, "param2")), "int b");
    let sel = E.nextSelection(m, null, tok("b"));
    eq(E.spanText(m, sel), "b", "first tap selects the token");
    sel = E.nextSelection(m, sel, tok("b"));
    eq(E.spanText(m, sel), "int b", "second tap expands to the parameter");
    sel = E.nextSelection(m, sel, tok("b"));
    eq(E.spanText(m, sel), "int a, int b", "third tap expands to the parameter list");
    sel = E.nextSelection(m, null, tok("a", 1));
    sel = E.nextSelection(m, sel, tok("a", 1));
    eq(E.spanText(m, sel), "a + b", "expression");
    sel = E.nextSelection(m, sel, tok("a", 1));
    eq(E.spanText(m, sel), "return a + b;", "statement");
    eq(E.nextSelection(m, sel, tok("public")), [tok("public"), tok("public")], "tapping elsewhere starts a new selection");
    const punct = m.tokens.find((t) => t.text === "(").i;
    eq(E.nextSelection(m, null, punct), null, "punctuation is not selectable");
    eq(E.roleOf(m, [tok("int"), tok("int")]).text, "the method's return type");
    eq(E.roleOf(m, [tok("int", 1), tok("int", 1)]).text, "the data type of parameter 1");
    ok(E.markedModel("// note\nint x = ???;").tokens.some((t) => t.kind === "com") && E.markedModel("x = ???;").tokens.some((t) => t.kind === "blank"));
  });

  /* ---------------- Generated challenges ---------------- */
  const generated = {};
  await section(`generator validation (${PER_MODE} per mode, all 9 modes)`, () => {
    eq(Object.keys(E.MODES).length, 9);
    for (const mode of Object.keys(E.MODES)) {
      const rng = E.makeRng(500 + mode.length * 31);
      generated[mode] = [];
      for (let i = 0; i < PER_MODE; i++) {
        const ch = E.generate(mode, rng);
        eq(ch.mode, mode);
        const v = E.validateChallenge(ch);
        ok(v.ok, `${mode} ${ch.generator}: ${v.errors.join("; ")}`);
        ok(ch.javaChecks.length > 0, "every challenge carries Java compiler checks");
        for (const c of ch.javaChecks)
          for (const f of c.files) ok(new RegExp(`public class ${f.name.replace(".java", "")}\\b`).test(f.source), "file name matches its public class");
        generated[mode].push(ch);
      }
    }
  });

  await section("meaningful variety", () => {
    for (const mode of Object.keys(E.MODES)) {
      const list = generated[mode];
      const sigs = new Set(list.map(E.signature));
      ok(sigs.size >= Math.min(list.length * 0.45, 60), `${mode} unique ${sigs.size}/${list.length}`);
      const gens = new Set(list.map((c) => c.generator));
      ok(gens.size >= 3, `${mode} uses several structures: ${[...gens].join(", ")}`);
    }
    const mFamilies = new Set(generated["identify-method"].map((c) => c.generator));
    ok(mFamilies.size >= 9, `method families: ${[...mFamilies].join(", ")}`);
    const questions = new Set(generated["identify-method"].map((c) => c.question.replace(/ of \w+\./, ".").replace(/\b(first|second|third)\b/, "Nth")));
    ok(questions.size >= 9, `identify-method question types: ${questions.size}`);
    const cGens = new Set(generated["identify-constructor"].map((c) => c.generator));
    for (const g of ["constructor-plain", "constructor-this", "constructor-noArg", "constructor-trap", "constructor-getter"]) ok(cGens.has(g), g);
    const types = new Set(generated["identify-method"].map((c) => c.blocks[0].model.code.match(/(public|private) (int|double|boolean|char|String|void) (?!class)\w+\(/)?.[2]).filter(Boolean));
    eq([...types].sort(), ["String", "boolean", "char", "double", "int", "void"], "all return types appear");
    const counts = new Set(generated["identify-method"].map((c) => (c.blocks[0].model.code.match(/(?:public|private) \w+ (?!class)\w+\(([^)]*)\)/)?.[1] || "").split(",").filter((x) => x.trim()).length));
    ok([0, 1, 2, 3].every((n) => counts.has(n)), "zero to three parameters");
    ok(generated["identify-method"].some((c) => /^private /m.test(c.blocks[0].model.code.replace(/^\s+private \w+ \w+;$/gm, ""))), "private methods");
  });

  await section("click-the-code questions target the right component", () => {
    for (const mode of ["identify-method", "identify-constructor", "access"])
      for (const ch of generated[mode].filter((c) => c.kind === "select")) {
        const model = ch.blocks[0].model;
        const selectable = model.tokens.filter((t) => t.sel);
        ok(selectable.length >= 6, "many tokens are selectable, not just the answer");
        ok(selectable.every((t) => ["kw", "type", "name", "lit", "op"].includes(t.kind)));
        ok(E.assess(ch, ch.answers[0]), "the stored answer is accepted");
        const wrong = selectable.find((t) => !ch.answers.some((a) => t.i >= a.span[0] && t.i <= a.span[1]));
        ok(!E.assess(ch, { block: 0, span: [wrong.i, wrong.i] }), "another token is rejected");
        const text = ch.answerText;
        if (/return type/.test(ch.question)) ok(["int", "double", "boolean", "char", "String", "void"].includes(text));
        if (/return type/.test(ch.question) && /void/.test(ch.explanation)) eq(text, "void", "void is the declared return type");
        if (/access modifier/.test(ch.question)) ok(text === "public" || text === "private");
        if (/constructor's name/.test(ch.question)) {
          const s = ch.answers[0].span[0];
          const prev = model.tokens.slice(0, s).reverse().find((t) => t.kind !== "ws");
          eq(prev.text === "public" || prev.text === "private", true, "constructor name is preceded by an access modifier, never a return type");
          const cls = model.code.match(/class (\w+)/)[1];
          eq(text, cls, "constructor name equals class name");
          const trap = model.tokens.findIndex((t, i) => t.text === cls && model.tokens.slice(0, i).reverse().find((x) => x.kind !== "ws")?.text === "void");
          if (trap >= 0) ok(!E.assess(ch, { block: 0, span: [trap, trap] }), "a void method with the class name is not accepted as the constructor");
        }
        if (/argument passed/.test(ch.question)) ok(!/\b(int|double|String|boolean|char)\b/.test(text), "arguments are values, not declarations");
        if (/whole .* parameter/.test(ch.question)) ok(/^(int|double|boolean|char|String) \w+$/.test(text), "a whole parameter is a type and a name");
        if (/expression whose value is returned/.test(ch.question)) ok(!text.startsWith("return"));
        if (/whole return statement|ends this method early/.test(ch.question)) ok(text.startsWith("return") && text.endsWith(";"));
        if (/constructor body/.test(ch.question)) ok(text.startsWith("{") && text.endsWith("}"));
      }
  });

  await section("multiple-choice quality", () => {
    const pos = [0, 0, 0, 0];
    let n = 0;
    for (const mode of Object.keys(E.MODES))
      for (const ch of generated[mode].filter((c) => c.kind === "choice")) {
        eq(ch.choices.length, 4);
        eq(new Set(ch.choices.map((c) => c.text)).size, 4, "no duplicate choices");
        eq(ch.choices.filter((c) => c.correct).length, 1, "exactly one correct");
        ok(ch.choices.every((c) => c.correct || c.why.length > 20), "every distractor explains the mistake");
        ok(E.assess(ch, ch.answer) && !E.assess(ch, (ch.answer + 1) % 4));
        pos[ch.answer]++;
        n++;
      }
    for (const p of pos) ok(p / n > 0.18 && p / n < 0.32, `correct-answer positions ${pos.map((x) => (x / n).toFixed(2))}`);
  });

  await section("calls, overloads, and widening", () => {
    for (const ch of generated["match-call"]) {
      const correct = ch.choices[ch.answer].text;
      if (ch.generator === "call-match" || ch.generator === "call-widening") {
        const sig = ch.blocks[0].model.code.match(/\w+ (\w+)\(([^)]*)\)/);
        const params = sig[2].split(", ").map((s) => s.split(" ")[0]);
        const args = correct.slice(correct.indexOf("(") + 1, correct.lastIndexOf(")")).split(/, (?=(?:[^"]*"[^"]*")*[^"]*$)/);
        eq(args.length, params.length, "correct call passes one argument per parameter");
        ok(correct.startsWith(sig[1] + "("), "exact method name");
        const typeOf = (a) => (/^".*"$/.test(a) ? "String" : /^'.'$/.test(a) ? "char" : /^(true|false)$/.test(a) ? "boolean" : /\./.test(a) ? "double" : "int");
        ok(args.every((a, i) => E.assignable(typeOf(a), params[i])), `argument types fit: ${correct}`);
        if (ch.generator === "call-widening") ok(args.some((a, i) => typeOf(a) === "int" && params[i] === "double"), "widening example");
      }
    }
    const kinds = new Set(generated["match-call"].map((c) => c.generator));
    for (const k of ["call-match", "call-widening", "overload-resolution", "call-for-overload"]) ok(kinds.has(k), k);
    ok(generated["match-call"].some((c) => c.generator === "overload-resolution" && /does not compile/.test(c.choices[c.answer].text)), "some calls match no overload");
  });

  await section("argument ordering (tap-to-order)", () => {
    for (const ch of generated["order-args"]) {
      ok(E.assess(ch, ch.answerOrder), "full ordered call accepted");
      const rev = ch.answerOrder.slice().reverse();
      ok(!E.assess(ch, rev), "reversed order rejected");
      ok(!E.assess(ch, ch.answerOrder.slice(0, -1)), "incomplete call rejected");
      eq(E.orderedCall(ch, ch.answerOrder), ch.answerText);
      if (ch.decoy) {
        ok(!ch.answerOrder.includes(ch.decoy.id));
        const withDecoy = ch.answerOrder.slice(0, -1).concat(ch.decoy.id);
        ok(!E.assess(ch, withDecoy), "using the decoy is wrong");
      }
      ok(!ch.tokens.slice(0, ch.answerOrder.length).every((t, i) => t.id === ch.answerOrder[i]), "tokens are not shown already in order");
    }
    const same = generated["order-args"].filter((c) => c.generator === "order-same-type");
    ok(same.length > 30, "same-type parameter tasks appear");
    for (const ch of same) {
      const types = ch.goals.map((g) => g.param.split(" ")[0]);
      ok(new Set(types).size < types.length, "at least two parameters share a type");
    }
  });

  await section("return rules", () => {
    for (const ch of generated.return) {
      const c = ch.choices[ch.answer].text;
      if (ch.generator === "complete-non-void") ok(/^return .+;$/.test(c), "a non-void method completes with return value;");
      if (ch.generator.startsWith("void")) ok(/does not return a value|without sending back a value/.test(c));
      if (ch.generator.startsWith("all-paths")) ok(/return [^;]+;/.test(c) && !/return;/.test(c), "repair returns a value on the missing path");
      for (const x of ch.choices) if (x.correct) ok(!/every method must|must end with a return/i.test(x.text), "never teaches that every method needs a return");
    }
    const gens = new Set(generated.return.map((c) => c.generator));
    for (const g of ["complete-non-void", "boolean-requirement", "void-describe", "void-early-return"]) ok(gens.has(g), g);
    ok([...gens].some((g) => g.startsWith("all-paths")), "every-path returns");
  });

  await section("constructors and object creation", () => {
    for (const ch of generated.constructors) {
      const c = ch.choices[ch.answer].text;
      if (ch.generator === "create-object") {
        ok(/ = new [A-Z]\w*\(/.test(c), "created with new and the class name");
      }
      if (ch.generator === "is-constructor") {
        const cls = ch.question.match(/class (\w+)/)[1];
        ok(new RegExp(`^public ${cls}\\(`).test(c), "constructor: class name, no return type");
        ok(ch.choices.some((x) => /void/.test(x.text)), "includes a void look-alike");
      }
    }
    ok(generated.constructors.some((ch) => ch.generator === "create-object" && ch.choices.some((x) => !x.correct && /new \w+\(\);/.test(x.text) && /default no-argument constructor only when/.test(x.why))), "teaches no implicit default constructor");
    ok(generated.constructors.some((ch) => ch.generator === "which-constructor"), "overloaded constructors");
  });

  await section("returned values match the program that is run on the JVM", () => {
    for (const ch of generated["returned-values"]) {
      const run = ch.javaChecks.find((c) => c.output !== undefined);
      ok(run, "a runnable program backs every value question");
      if (ch.generator === "value-boolean-call") continue;
      const shown = ch.choices[ch.answer].text;
      const printed = run.output.trim().split("\n").pop();
      eq(shown.replace(/^"|"$/g, ""), printed, `${ch.generator}: displayed answer equals Java output`);
    }
    const gens = new Set(generated["returned-values"].map((c) => c.generator));
    for (const g of ["value-nested-call", "value-print-vs-return", "value-primitive-parameter", "value-assign-result", "value-int-division-double", "value-boolean-call"]) ok(gens.has(g), g);
    ok([...gens].some((g) => g.startsWith("value-string-concat")), "String results");
  });

  await section("fix-the-error cases and access modifiers", () => {
    const fixes = new Set(generated.fix.map((c) => c.generator));
    for (const g of ["fix-method-name", "fix-argument-order", "fix-return-type", "fix-constructor-void", "fix-constructor-name", "fix-argument-count", "fix-private-access", "fix-parameter-type"]) ok(fixes.has(g), g);
    ok(fixes.has("fix-missing-return") || fixes.has("fix-print-vs-return"));
    for (const ch of generated.fix) {
      ok(ch.javaChecks.filter((c) => c.expect === "ok").length === 1, "exactly one edit is expected to compile");
      ok(ch.javaChecks.filter((c) => c.expect === "error").length === 4, "the original and three edits are expected to fail");
    }
    for (const ch of generated.access.filter((c) => c.generator === "access-other-class")) {
      const name = ch.choices[ch.answer].text.match(/\.(\w+)\(/)[1];
      ok(new RegExp(`public void ${name}\\(`).test(ch.blocks[0].model.code), "the compiling call targets the public method");
      for (const x of ch.choices.filter((c) => !c.correct)) ok(new RegExp(`private void ${x.text.match(/\.(\w+)\(/)[1]}\\(`).test(ch.blocks[0].model.code));
    }
    for (const ch of generated.access.filter((c) => c.generator.startsWith("access-same-class"))) ok(/^Yes/.test(ch.choices[ch.answer].text), "private methods are callable inside their own class");
    ok(generated.access.some((c) => c.generator === "access-private-constructor"));
    ok(generated.access.some((c) => c.kind === "select"), "access is also assessed by clicking code");
    for (const mode of Object.keys(E.MODES)) for (const ch of generated[mode]) for (const c of ch.choices || []) if (c.correct) ok(!/cannot be called at all|can never be called/.test(c.text), "never teaches that private means uncallable");
  });

  /* ---------------- DOM + session ---------------- */
  let parseHTML;
  try {
    const req = createRequire(path.join(ROOT, "java-games", "package.json"));
    ({ parseHTML } = req(process.env.CSP_DOM_LIBRARY || "linkedom"));
  } catch {
    console.error("\nlinkedom is required for DOM tests. Run: cd java-games && npm install");
    process.exit(1);
  }
  const S = await import(pathToFileURL(path.join(ROOT, "java-games", "session.js")).href);
  function launch({ query = "", store = new Map() } = {}) {
    const { window, document } = parseHTML(fs.readFileSync(path.join(GAME_DIR, "index.html"), "utf8"));
    Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
      configurable: true,
      get() {
        return this.querySelector("option[selected]")?.getAttribute("value") || this.querySelector("option")?.getAttribute("value") || "";
      },
      set(v) {
        for (const o of this.querySelectorAll("option")) {
          o.removeAttribute("selected");
          if (o.getAttribute("value") === String(v)) o.setAttribute("selected", "");
        }
      },
    });
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
    const tracker = S.createSessionTracker({ storage });
    const ctx = { window, document, console, Math, JSON, Set, Map, Number, String, Object, Array, URLSearchParams, location: { search: query }, setTimeout, clearTimeout, E, sessionTracker: () => tracker, addSessionNavigation: () => {}, roundSummary: () => "" };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(GAME_DIR, "script.js"), "utf8").replace(/^import[^;]+;/gm, ""), ctx);
    const $ = (id) => document.getElementById(id);
    return {
      $,
      document,
      tracker,
      lab: ctx.MethodLab,
      m: () => tracker.snapshot().games[E.GAME_ID] || { attempted: 0, firstTry: 0, incorrect: 0, revealed: 0, skipped: 0, submissions: 0, topics: {} },
      mode(v) {
        $("mode").value = v;
        $("mode").onchange();
      },
    };
  }
  const tapTo = (app, ch, span) => {
    const tok = ch.blocks[0].model.tokens.slice(span[0], span[1] + 1).find((t) => t.sel);
    for (let k = 0; k < 8; k++) {
      app.document.querySelector(`.tok[data-b="0"][data-i="${tok.i}"]`).onclick();
      const s = app.lab.selection();
      if (s.span[0] === span[0] && s.span[1] === span[1]) return;
    }
    throw new Error("could not reach span");
  };

  await section("DOM: defaults, every mode renders, nothing revealed before answering", () => {
    const app = launch();
    eq(app.$("mode").value, "mixed", "Mixed Practice is the default");
    for (const mode of Object.keys(E.MODES)) {
      app.mode(mode);
      const ch = app.lab.current();
      eq(ch.mode, mode);
      ok(app.$("feedback").hidden, "no feedback before submitting");
      eq(app.document.querySelectorAll(".is-answer, .is-correct").length, 0, "answer not highlighted in advance");
      ok(app.$("submit").disabled, "submit waits for a decision");
      if (ch.kind === "select") ok(app.document.querySelectorAll(".tok").length >= 6, "many selectable tokens");
      if (ch.kind === "choice") eq(app.document.querySelectorAll("[data-choice]").length, 4);
      if (ch.kind === "order") eq(app.document.querySelectorAll("[data-token]").length, ch.tokens.length);
    }
    eq(app.m().skipped, 9, "changing modes skips the unanswered challenge");
  });

  await section("DOM: click-the-code scoring with expansion", () => {
    const app = launch({ query: "?mode=identify-method&seed=3" });
    let ch = app.lab.current();
    // wrong pick first
    const model = ch.blocks[0].model;
    const wrong = model.tokens.find((t) => t.sel && !(t.i >= ch.answers[0].span[0] && t.i <= ch.answers[0].span[1]));
    app.document.querySelector(`.tok[data-i="${wrong.i}"]`).onclick();
    ok(!app.$("submit").disabled);
    app.$("submit").onclick();
    let m = app.m();
    eq([m.attempted, m.firstTry, m.incorrect, m.revealed], [1, 0, 1, 1]);
    ok(/Correct answer/.test(app.$("feedback").textContent) && /You selected/.test(app.$("feedback").textContent));
    ok(app.document.querySelectorAll(".is-answer").length > 0, "correct component highlighted after submitting");
    app.document.querySelector(`.tok[data-i="${wrong.i}"]`).onclick();
    app.$("submit").onclick();
    eq(app.m().submissions, 1, "no second scored submission");
    // next: correct, reaching region answers by tapping again
    let solved = 0;
    for (let k = 0; k < 6; k++) {
      app.$("next").onclick();
      ch = app.lab.current();
      tapTo(app, ch, ch.answers[0].span);
      app.$("submit").onclick();
      ok(/Correct!/.test(app.$("feedback").textContent), ch.question);
      solved++;
    }
    m = app.m();
    eq([m.attempted, m.firstTry], [1 + solved, solved]);
    // Expand button and Clear
    app.$("next").onclick();
    ch = app.lab.current();
    const t0 = ch.blocks[0].model.tokens.find((t) => t.sel);
    app.document.querySelector(`.tok[data-i="${t0.i}"]`).onclick();
    app.$("clear").onclick();
    eq(app.lab.selection(), null);
    ok(app.$("submit").disabled);
  });

  await section("DOM: multiple choice and tap-to-order scoring", () => {
    const app = launch({ query: "?mode=match-call&seed=5" });
    let ch = app.lab.current();
    app.document.querySelector(`[data-choice="${ch.answer}"]`).onclick();
    app.$("submit").onclick();
    let m = app.m();
    eq([m.attempted, m.firstTry], [1, 1]);
    ok(app.document.querySelector(".is-correct"));
    app.$("next").onclick();
    ch = app.lab.current();
    app.document.querySelector(`[data-choice="${(ch.answer + 2) % 4}"]`).onclick();
    app.$("submit").onclick();
    m = app.m();
    eq([m.attempted, m.firstTry, m.incorrect, m.revealed], [2, 1, 1, 1]);
    ok(app.$("feedback").textContent.includes(ch.choices[(ch.answer + 2) % 4].why), "explains the chosen mistake");
    // ordering
    app.mode("order-args");
    ch = app.lab.current();
    const tokenBtn = (id) => app.document.querySelector(`[data-token="${id}"]`);
    tokenBtn(ch.answerOrder[1]).onclick();
    eq(JSON.parse(JSON.stringify(app.lab.order())), [ch.answerOrder[1]]);
    app.document.querySelector('[data-placed="0"]').onclick();
    eq(JSON.parse(JSON.stringify(app.lab.order())), [], "tapping a placed argument removes it");
    tokenBtn(ch.answerOrder[0]).onclick();
    app.$("reset-order").onclick();
    eq(JSON.parse(JSON.stringify(app.lab.order())), [], "reset");
    for (const id of ch.answerOrder) tokenBtn(id).onclick();
    ok(!app.$("submit").disabled);
    app.$("submit").onclick();
    ok(/Correct!/.test(app.$("feedback").textContent));
    app.$("next").onclick();
    ch = app.lab.current();
    for (const id of ch.answerOrder.slice().reverse()) tokenBtn(id).onclick();
    app.$("submit").onclick();
    ok(/Not quite/.test(app.$("feedback").textContent) && app.$("feedback").textContent.includes(ch.answerText));
    m = app.m();
    eq(m.topics["order-args"].attempted, 2);
    eq(m.topics["order-args"].firstTry, 1);
    app.$("next").onclick();
    const sk = app.m().skipped;
    app.$("skip").onclick();
    eq(app.m().skipped, sk + 1, "Skip is recorded");
  });

  await section("DOM: shared session schema and reset", () => {
    const store = new Map();
    const app = launch({ query: "?mode=access&seed=2", store });
    const ch = app.lab.current();
    if (ch.kind === "choice") app.document.querySelector(`[data-choice="${ch.answer}"]`).onclick();
    else tapTo(app, ch, ch.answers[0].span);
    app.$("submit").onclick();
    const saved = JSON.parse(store.get(S.SESSION_KEY));
    eq(S.SESSION_KEY, "javaGames.session.v1");
    eq(saved.schema, 1);
    eq(saved.games[E.GAME_ID].title, "Method & Constructor Lab");
    eq(saved.games[E.GAME_ID].topics.access.title, "Access Modifiers");
    const again = S.createSessionTracker({ storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } });
    eq(again.warning, "", "saved data stays valid for the shared tracker");
    eq(again.snapshot().games[E.GAME_ID].firstTry, 1);
    again.student("Test Student", "4");
    ok(!again.reset(false) && again.reset(true));
    eq(again.snapshot().games, {});
    eq(again.snapshot().student.name, "Test Student");
  });

  console.log(`\nMethod & Constructor Lab: ${checks} checks passed in ${sections.length} sections (${PER_MODE} generated challenges per mode).`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
