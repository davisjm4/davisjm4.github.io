/* Robot Algorithms automated tests.
   Run from the repository root:   node tests/robot-algorithms.test.js
   (or from java-games/:            npm run test:robot)
   DOM tests use linkedom, the existing Java Games dev dependency
   (cd java-games && npm install). Written as CommonJS + dynamic import so
   it runs without a package.json beside it. */
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { createRequire } = require("node:module");

const ROOT = path.resolve(__dirname, "..");
const GAME_DIR = path.join(ROOT, "java-games", "robot-algorithms");
const PER_MODE = Number(process.env.ROBOT_PER_MODE || 150);

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
function section(name, fn) {
  const before = checks;
  return Promise.resolve(fn()).then(() => {
    sections.push([name, checks - before]);
    console.log(`  ✓ ${name} (${checks - before} checks)`);
  });
}

(async () => {
  const E = await import(pathToFileURL(path.join(GAME_DIR, "engine.js")).href);
  const W = (over = {}) => ({ rows: 5, cols: 5, walls: [], start: { r: 2, c: 2, d: 0 }, goal: null, ...over });
  const at = (res) => [res.final.r, res.final.c, res.final.d];
  console.log("Robot Algorithms tests");

  await section("movement in every direction", () => {
    for (let d = 0; d < 4; d++) {
      const res = E.run("robot.move();", W({ start: { r: 2, c: 2, d } }));
      eq(res.error, null);
      eq([res.final.r, res.final.c], [2 + E.DR[d], 2 + E.DC[d]], `direction ${E.DIRS[d]}`);
    }
    eq(E.DIRS, ["Up", "Right", "Down", "Left"], "students see screen directions, not compass directions");
    // Up decreases the row (row 0 is the top); Right increases the column.
    eq(at(E.run("robot.move();", W())), [1, 2, 0]);
    eq(at(E.run("robot.turnRight(); robot.move();", W())), [2, 3, 1]);
  });

  await section("turns", () => {
    const seq = [];
    for (let k = 1; k <= 4; k++) seq.push(E.run("robot.turnRight();".repeat(k), W()).final.d);
    eq(seq, [1, 2, 3, 0]);
    const left = [];
    for (let k = 1; k <= 4; k++) left.push(E.run("robot.turnLeft();".repeat(k), W()).final.d);
    eq(left, [3, 2, 1, 0]);
    eq(E.run("robot.turnLeft(); robot.turnRight();", W({ start: { r: 2, c: 2, d: 2 } })).final.d, 2);
  });

  await section("obstacles and grid boundaries", () => {
    let res = E.run("robot.move();\nrobot.move();\nrobot.move();", W());
    eq(res.error.kind, "crash");
    eq(res.error.line, 3, "third move leaves the grid from row 0");
    eq([res.final.r, res.final.c], [0, 2], "robot stays in last valid cell");
    ok(/leave the grid/.test(res.error.message));
    res = E.run("robot.move();\nrobot.move();", W({ walls: ["0,2"] }));
    eq(res.error.kind, "crash");
    eq(res.error.line, 2);
    ok(/obstacle/.test(res.error.message));
    eq(res.trace.at(-2).kind, "crash");
    res = E.run("robot.move();\nrobot.turnLeft();", W({ walls: ["1,2"] }));
    eq(res.stats.turns, 0, "statements after a movement error never run");
    for (const [d, r, c] of [[1, 2, 4], [2, 4, 2], [3, 2, 0]]) {
      const x = E.run("while (robot.canMove()) { robot.move(); } robot.move();", W({ start: { r: 2, c: 2, d } }));
      eq(x.error.kind, "crash");
      eq([x.final.r, x.final.c], [r, c]);
    }
  });

  await section("canMove()", () => {
    const val = (src, w) => E.run(src, w).trace.find((t) => t.kind === "check").value;
    eq(val("robot.canMove();", W()), true);
    eq(val("robot.canMove();", W({ walls: ["1,2"] })), false, "obstacle ahead");
    eq(val("robot.canMove();", W({ start: { r: 0, c: 2, d: 0 } })), false, "edge ahead");
    eq(val("robot.canMove();", W({ start: { r: 0, c: 2, d: 2 } })), true, "edge behind is irrelevant");
    eq(E.run("if (robot.canMove()) { robot.move(); } else { robot.turnRight(); }", W({ walls: ["1,2"] })).final.d, 1);
  });

  await section("atGoal()", () => {
    const g = W({ goal: { r: 0, c: 2 } });
    let res = E.run("while (!robot.atGoal()) { robot.move(); }", g);
    eq([res.final.r, res.final.c], [0, 2]);
    ok(res.atGoal);
    res = E.run("if (robot.atGoal()) { robot.turnLeft(); }", W({ goal: { r: 2, c: 2 } }));
    eq(res.final.d, 3);
    res = E.run("if (robot.atGoal()) { robot.turnLeft(); }", W());
    eq(res.final.d, 0, "no goal means atGoal() is false");
  });

  await section("for loops", () => {
    const count = (h) => E.run(`for (${h}) { robot.turnLeft(); }`, W()).stats.turns;
    eq(count("int i = 0; i < 3; i++"), 3);
    eq(count("int i = 1; i <= 3; i++"), 3);
    eq(count("int i = 2; i < 6; i++"), 4);
    eq(count("int i = 5; i > 0; i--"), 5);
    eq(count("int i = 4; i >= 2; i--"), 3);
    eq(count("int i = 0; i < 7; i += 2"), 4);
    eq(count("int i = 9; i > 2; i -= 3"), 3);
    eq(count("int i = 3; i < 3; i++"), 0, "zero iterations");
    eq(count("int i = 3; i > 3; i--"), 0);
    eq(count("int i = 0; i != 4; i++"), 4);
    // % and / follow Java int rules
    eq(E.run("for (int i = 0; i < 6; i++) { if (i % 2 == 0) { robot.turnLeft(); } }", W()).stats.turns, 3);
    eq(E.run("int a = -7 % 3; if (a == -1) { robot.turnLeft(); }", W()).stats.turns, 1, "remainder keeps the dividend's sign");
    eq(E.run("int a = 7 / 2; if (a == 3) { robot.turnLeft(); }", W()).stats.turns, 1, "int division truncates");
    eq(E.run("int a = -7 / 2; if (a == -3) { robot.turnLeft(); }", W()).stats.turns, 1, "truncates toward zero");
    eq(E.runSource("int a = 5 % 0;", W()).error.kind, "runtime");
    const res = E.run("for (int i = 0; i < 2; i++) { robot.move(); robot.turnRight(); }", W());
    eq(at(res), [1, 3, 2]);
    eq(res.stats.loops[1], 2);
    // loop variable is scoped to the loop
    eq(E.runSource("for (int i = 0; i < 1; i++) { } robot.move(); int j = i;", W()).error.kind, "runtime");
  });

  await section("while loops", () => {
    let res = E.run("while (robot.canMove()) {\n    robot.move();\n}", W());
    eq([res.final.r, res.final.c], [0, 2]);
    eq(res.stats.moves, 2);
    res = E.run("int steps = 0;\nwhile (steps < 3) {\n    robot.turnRight();\n    steps++;\n}", W());
    eq(res.final.d, 3);
    res = E.run("int n = 6; while (n > 0) { robot.turnLeft(); n -= 2; }", W());
    eq(res.stats.turns, 3);
    res = E.run("while (robot.canMove() && !robot.atGoal()) { robot.move(); }", W({ goal: { r: 1, c: 2 } }));
    eq(res.final.r, 1);
    res = E.run("while (!robot.canMove()) { robot.move(); }", W());
    eq(res.stats.moves, 0, "false condition: zero iterations");
  });

  await section("conditional execution and Boolean operators", () => {
    const w = W({ walls: ["1,2"], goal: { r: 2, c: 2 } });
    const d = (cond) => E.run(`if (${cond}) { robot.turnLeft(); } else { robot.turnRight(); }`, w).final.d;
    eq(d("robot.canMove()"), 1);
    eq(d("!robot.canMove()"), 3);
    eq(d("robot.canMove() || robot.atGoal()"), 3);
    eq(d("robot.canMove() && robot.atGoal()"), 1);
    eq(d("!(robot.canMove() && robot.atGoal())"), 3);
    eq(d("!robot.canMove() && !robot.atGoal()"), 1);
    eq(d("true"), 3);
    eq(E.run("if (robot.canMove()) { robot.move(); }", w).final.r, 2, "if without else can skip");
    const r = E.run("if (robot.canMove()) { robot.move(); } else if (robot.atGoal()) { robot.turnLeft(); } else { robot.turnRight(); }", w);
    eq(r.final.d, 3, "else-if chains");
    // Short-circuit: && stops before evaluating the right side
    const sc = E.run("if (!robot.canMove() || robot.atGoal()) { }", w);
    eq(sc.trace.filter((t) => t.kind === "check").length, 1);
    // AP CSP operators are rejected
    for (const bad of ["if (robot.canMove() AND robot.atGoal()) { }", "if (NOT robot.canMove()) { }", "if (robot.canMove() & robot.atGoal()) { }"])
      eq(E.runSource(bad, w).error.kind, "syntax");
  });

  await section("nested execution", () => {
    let res = E.run("for (int i = 0; i < 3; i++) {\n  for (int j = 0; j < 2; j++) {\n    robot.turnLeft();\n  }\n}", W());
    eq(res.stats.turns, 6);
    res = E.run("for (int i = 0; i < 4; i++) { if (robot.canMove()) { robot.move(); } else { robot.turnRight(); } }", W({ start: { r: 1, c: 2, d: 0 } }));
    eq(at(res), [0, 4, 1]);
    eq(res.stats.branches[1], { then: 3, else: 1 });
    res = E.run("while (!robot.atGoal()) { if (robot.canMove()) { robot.move(); } else { robot.turnRight(); } }", W({ start: { r: 0, c: 0, d: 0 }, goal: { r: 0, c: 4 } }));
    eq([res.final.r, res.final.c], [0, 4]);
  });

  await section("method calls", () => {
    let res = E.run("void moveTwice() {\n  robot.move();\n  robot.move();\n}\nmoveTwice();\nrobot.turnRight();", W());
    eq(at(res), [0, 2, 1]);
    eq(res.stats.calls.moveTwice, 1);
    res = E.run("void turnAround() { robot.turnLeft(); robot.turnLeft(); }\nvoid backUp() { turnAround(); robot.move(); turnAround(); }\nbackUp(); backUp();", W());
    eq(at(res), [4, 2, 0]);
    eq(res.stats.calls.turnAround, 4);
    res = E.run("void advance(int n) { for (int i = 0; i < n; i++) { robot.move(); } }\nadvance(2); robot.turnRight(); advance(1);", W());
    eq(at(res), [0, 3, 1]);
    res = E.run("void hop() { robot.move(); }\nvoid run() {\n  hop();\n  robot.turnLeft();\n  hop();\n}", W());
    eq(at(res), [1, 1, 3], "run() is the entry method when there are no top-level statements");
    eq(E.run("void hop() { robot.move(); }\nvoid run() { hop(); hop(); }", W(), { methodOnce: true }).stats.moves, 1, "methodOnce misconception skips repeat calls, not run()");
    eq(E.run("void hop() { robot.move(); }\nvoid run() { robot.turnLeft(); }", W(), { defsExecute: true }).stats.moves, 1);
    res = E.run("void a() { robot.turnLeft(); }\n", W());
    eq(res.stats.turns, 0, "declaring a method does not run it");
    eq(E.runSource("jump();", W()).error.kind, "runtime");
    eq(E.runSource("void a() { }\nvoid a() { }", W()).error.kind, "syntax");
    eq(E.runSource("void a(int n) { }\na();", W()).error.kind, "runtime");
    eq(E.runSource("void f(int n) { int k = 0; } int k = 1; f(2); robot.move();", W()).error, null, "method locals are separate");
    // Methods cannot see caller's local variables (Java scoping)
    eq(E.runSource("void f() { robot.move(); int z = q; } int q = 1; f();", W()).error.kind, "runtime");
  });

  await section("infinite-loop and recursion safeguards", () => {
    let t = Date.now();
    let res = E.run("while (true) { robot.turnLeft(); }", W());
    eq(res.error.kind, "limit");
    ok(Date.now() - t < 1000, "limit stops quickly");
    res = E.run("while (robot.canMove()) { robot.turnLeft(); robot.turnLeft(); robot.turnLeft(); robot.turnLeft(); }", W());
    eq(res.error.kind, "limit");
    res = E.run("for (int i = 0; i < 5; i--) { robot.turnLeft(); }", W());
    eq(res.error.kind, "limit");
    res = E.run("void f() { f(); }\nf();", W());
    eq(res.error.kind, "limit");
    ok(/method/.test(res.error.message));
    res = E.run("robot.turnLeft();", W(), { limit: 0 });
    eq(res.error.kind, "limit");
  });

  await section("syntax handling and no eval", () => {
    for (const bad of ["robot.move()", "robot.fly();", "for (i = 0; i < 3; i++) { }", "if robot.canMove() { }", "robot.move(); }", "{ robot.move();", "System.exit(0);", "robot.move(); @"])
      eq(E.runSource(bad, W()).error?.kind, "syntax", bad);
    eq(E.runSource("// comment\n/* block\ncomment */ robot.move();", W()).final.r, 1);
    const src = fs.readFileSync(path.join(GAME_DIR, "engine.js"), "utf8") + fs.readFileSync(path.join(GAME_DIR, "script.js"), "utf8");
    ok(!/\beval\s*\(/.test(src) && !/new Function\s*\(/.test(src), "no eval/new Function");
    eq(E.parse("robot.move();").body[0].line, 1);
  });

  await section("countStatements and route evaluation", () => {
    eq(E.countStatements("for (int i = 0; i < 3; i++) {\n robot.move();\n}\nrobot.turnLeft();"), 3);
    eq(E.countStatements("while (robot.canMove()) { robot.move(); robot.turnLeft(); }"), 3);
    const world = { rows: 4, cols: 5, walls: ["1,1"], start: { r: 2, c: 0, d: 1 }, goal: { r: 0, c: 2 } };
    const ch = { worlds: [world], req: {} };
    const shortest = "robot.move();\nrobot.move();\nrobot.turnLeft();\nrobot.move();\nrobot.move();";
    ok(E.evaluateBuild(ch, shortest).pass, "shortest route accepted");
    ok(E.evaluateBuild(ch, "robot.turnLeft();\nrobot.turnRight();\n" + shortest + "\nrobot.turnLeft();\nrobot.turnRight();").pass, "extra commands are not penalized");
    ok(E.evaluateBuild(ch, "robot.turnLeft();\nrobot.move();\nrobot.move();\nrobot.turnRight();\nrobot.move();\nrobot.move();").pass, "a different valid route is accepted");
    let r = E.evaluateBuild(ch, "robot.turnLeft();\nrobot.move();\nrobot.turnRight();\nrobot.move();");
    ok(!r.pass && /movement error/i.test(r.reason), "obstacle crash fails");
    r = E.evaluateBuild(ch, "robot.move();");
    ok(!r.pass && /not on the goal/.test(r.reason));
    const facing = { worlds: [world], req: { facing: 0 } };
    ok(E.evaluateBuild(facing, shortest).pass);
    ok(!E.evaluateBuild(facing, shortest + "\nrobot.turnRight();").pass, "facing requirement enforced");
    const limited = { worlds: [world], req: { maxStatements: 4 } };
    ok(!E.evaluateBuild(limited, shortest).pass, "statement limit enforced when stated");
    ok(E.evaluateBuild(limited, "for (int i = 0; i < 2; i++) {\n robot.move();\n}\nrobot.turnLeft();\nfor (int i = 0; i < 2; i++) {\n robot.move();\n}").pass === false, "5 statements exceeds 4");
    const two = { worlds: [world, { ...world, start: { r: 3, c: 0, d: 1 }, walls: ["1,1", "3,3"], goal: { r: 0, c: 2 } }], req: {} };
    ok(!E.evaluateBuild(two, shortest).pass, "must work on both grids");
    ok(!E.evaluateBuild(ch, "robot.jump();").pass, "syntax errors fail cleanly");
  });

  /* ---------------- Generators ---------------- */
  const generated = {};
  await section(`generator validation (${PER_MODE} per mode)`, () => {
    for (const mode of Object.keys(E.MODES)) {
      const rng = E.makeRng(1000 + mode.length * 17);
      const list = [];
      for (let i = 0; i < PER_MODE; i++) {
        const ch = E.generate(mode, rng);
        eq(ch.mode, mode);
        const v = E.validateChallenge(ch);
        ok(v.ok, `${mode} ${ch.generator}: ${v.errors.join("; ")}`);
        list.push(ch);
      }
      generated[mode] = list;
    }
  });

  await section("answer choices are simulation-verified and well formed", () => {
    for (const mode of ["predict", "loops", "conditionals", "methods"])
      for (const ch of generated[mode]) {
        eq(ch.choices.length, 4);
        eq(new Set(ch.choices.map((c) => c.text)).size, 4, "no duplicate answers");
        const res = E.run(ch.code, ch.world);
        const key = E.keyFor(ch.ask, res);
        eq(ch.choices.filter((c) => c.key === key).length, 1, "exactly one choice matches the simulation");
        ok(ch.choices[ch.answer].key === key);
        for (const c of ch.choices) {
          if (!c.correct) ok(c.why && c.why.length > 20, "each distractor names a realistic mistake");
          eq(E.keyText(c.key), c.text);
        }
        // consistent formatting: every choice of a location/state/count question looks alike
        const kinds = new Set(ch.choices.map((c) => c.key[0]));
        ok(ch.ask.type === "outcome" ? kinds.size === 2 : kinds.size === 1, "no formatting giveaways");
        ok(!/\beval\b/.test(ch.code));
      }
  });

  await section("place-the-robot questions grade exactly the simulated end state", () => {
    let n = 0;
    const types = new Set();
    for (const mode of ["predict", "loops", "conditionals", "methods"])
      for (const ch of generated[mode]) {
        const placeType = E.PLACE_TYPES.includes(ch.ask.type);
        eq(ch.answerMode, placeType ? "place" : "choice");
        if (!placeType) continue;
        n++;
        types.add(ch.ask.type);
        const res = E.run(ch.code, ch.world);
        eq(E.placementKey(ch.ask, res.final), ch.choices[ch.answer].key, "placing the robot at the true end state is graded correct");
        // Not moving the robot is wrong for location/state questions
        if (ch.ask.type !== "direction") ok(E.placementKey(ch.ask, ch.world.start) !== ch.choices[ch.answer].key);
        for (const m of ch.misconceptions) ok(m.key !== ch.choices[ch.answer].key && m.why.length > 20);
        ok(ch.misconceptions.length >= 3);
        ok(!/North|East|South|West/.test(ch.explanation + ch.choices.map((c) => c.text + c.why).join(" ")), "no compass words");
      }
    ok(n > 300, `placement questions: ${n}`);
    eq([...types].sort(), ["direction", "location", "state"]);
  });

  await section("correct-answer position is not predictable", () => {
    const pos = [0, 0, 0, 0];
    let n = 0;
    for (const mode of ["predict", "loops", "conditionals", "debug", "methods"])
      for (const ch of generated[mode]) {
        pos[ch.answer]++;
        n++;
      }
    for (const p of pos) ok(p / n > 0.17 && p / n < 0.33, `position share ${pos.map((x) => (x / n).toFixed(2))}`);
  });

  await section("debugging corrections: exactly one fix works", () => {
    const families = new Set();
    for (const ch of generated.debug) {
      families.add(ch.generator);
      const passing = ch.choices.filter((c) => E.meetsRequirement(E.runSource(c.lines.join("\n"), ch.world), ch.world, ch.req));
      eq(passing.length, 1);
      ok(passing[0].correct);
      ok(!E.meetsRequirement(E.runSource(ch.code, ch.world), ch.world, ch.req), "original program fails");
      for (const c of ch.choices) {
        E.parse(c.lines.join("\n")); // every option is valid Java in the supported grammar
        eq(E.applyEditFromText(ch.lines, c.text), c.lines.join("\n"), "choice text matches tested program");
      }
    }
    ok(families.size >= 6, "multiple defect types: " + [...families].join(", "));
    // The correct option is not the only one of its edit type in most challenges
    const sameType = generated.debug.filter((ch) => ch.choices.filter((c) => c.text.split(" ")[0] === ch.choices[ch.answer].text.split(" ")[0]).length > 1).length;
    ok(sameType / generated.debug.length > 0.8, "correct choice usually shares its format with distractors");
  });

  await section("route-building challenges: solvable, verified, and graded", () => {
    const fams = new Set();
    for (const ch of generated.build) {
      fams.add(ch.generator.split("-").slice(0, 2).join("-"));
      ok(E.evaluateBuild(ch, ch.reference).pass, "reference passes");
      ok(!E.evaluateBuild(ch, "").pass, "empty fails");
      ok(!E.evaluateBuild(ch, "robot.turnLeft();").pass, "incorrect submission fails");
      if (ch.req.maxStatements) ok(E.countStatements(ch.reference) <= ch.req.maxStatements);
      if (ch.worlds.length === 2) {
        // A fixed sequence that solves Grid A must fail Grid B (generality needed)
        const a = ch.worlds[0];
        const offA = `${a.goal.r - a.start.r},${a.goal.c - a.start.c}`,
          b = ch.worlds[1];
        ok(offA !== `${b.goal.r - b.start.r},${b.goal.c - b.start.c}`);
      }
    }
    eq(fams.size, 3, [...fams].join());
  });

  await section("meaningful variation", () => {
    for (const mode of Object.keys(E.MODES)) {
      const sigs = new Set(generated[mode].map(E.signature));
      ok(sigs.size >= generated[mode].length * 0.9, `${mode} unique ${sigs.size}`);
      const fams = new Set(generated[mode].map((c) => c.family));
      ok(fams.size === E.GENERATORS[mode].length, `${mode} uses every generator family`);
      const starts = new Set(generated[mode].map((c) => JSON.stringify((c.worlds || [c.world])[0].start)));
      ok(starts.size > 30, `${mode} start positions vary`);
      const sizes = new Set(generated[mode].map((c) => `${c.world.rows}x${c.world.cols}`));
      ok(sizes.size >= 3 || mode === "build", `${mode} grid sizes vary`);
    }
    const headers = new Set();
    for (const ch of generated.loops) for (const l of (ch.code || "").split("\n")) if (/^\s*(for|while) \(/.test(l)) headers.add(l.trim().replace(/\d+/g, "#"));
    ok(headers.size >= 12, `loop header shapes vary (${headers.size})`);
    const askTypes = new Set(generated.loops.map((c) => c.ask.type));
    ok(askTypes.has("moves") && askTypes.has("location"));
    ok(generated.loops.some((c) => /--|-=/.test(c.code)) && generated.loops.some((c) => /\+=/.test(c.code)), "increment and decrement");
    ok(generated.conditionals.some((c) => /&&|\|\|/.test(c.code)), "compound Boolean expressions");
    const loopIf = generated.loops.filter((c) => /^\s+if \(/m.test(c.code));
    ok(loopIf.length / generated.loops.length > 0.25, `loops with if statements inside: ${loopIf.length}`);
    ok(loopIf.some((c) => /^for/.test(c.code)) && loopIf.some((c) => /^while/.test(c.code)), "if inside both for and while loops");
    ok(generated.loops.some((c) => /%/.test(c.code)), "loop-counter conditions such as i % 2 == 0");
    const methodIf = generated.methods.filter((c) => {
      const p = E.parse(c.code);
      const has = (list) => list.some((st) => st.t === "if" || (st.body && has(st.body.t === "block" ? st.body.body : [st.body])) || (st.t === "block" && has(st.body)));
      return Object.values(p.methods).some((m) => m.name !== "run" && has(m.body));
    });
    ok(methodIf.length / generated.methods.length > 0.15, `methods containing if statements: ${methodIf.length}`);
    ok(generated.methods.some((c) => /void \w+\(int /.test(c.code)), "int parameters");
    ok(generated.methods.some((c) => /void \w+\(\) \{\n(\s+\w+\(\);\n)/.test(c.code) || /^\s+(turnAround|moveTwice|stepRight)\(\);/m.test(c.code)), "methods calling methods");
    ok(generated.predict.some((c) => c.ask.type === "outcome" && c.choices[c.answer].key[0] === "E"), "movement-error outcomes");
  });

  await section("zero-iteration loops appear", () => {
    const rng = E.makeRng(77);
    let zero = 0;
    for (let i = 0; i < 300; i++) {
      const ch = E.generate("loops", rng);
      const p = E.parse(ch.code);
      const res = E.run(p, ch.world);
      if (Object.values(res.stats.loops).some((n) => n === 0)) zero++;
    }
    ok(zero > 3, `zero-iteration loops: ${zero}`);
  });

  /* ---------------- DOM + session scoring ---------------- */
  let parseHTML;
  try {
    const req = createRequire(path.join(ROOT, "java-games", "package.json"));
    ({ parseHTML } = req(process.env.CSP_DOM_LIBRARY || "linkedom"));
  } catch {
    console.error("\nlinkedom is required for DOM tests. Run: cd java-games && npm install");
    process.exit(1);
  }
  const S = await import(pathToFileURL(path.join(ROOT, "java-games", "session.js")).href);

  function launch({ query = "", storageMap = new Map() } = {}) {
    const html = fs.readFileSync(path.join(GAME_DIR, "index.html"), "utf8");
    const { window, document } = parseHTML(html);
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
    const storage = { getItem: (k) => storageMap.get(k) ?? null, setItem: (k, v) => storageMap.set(k, String(v)) };
    const tracker = S.createSessionTracker({ storage });
    const timers = [];
    const ctx = {
      window,
      document,
      console,
      Math,
      JSON,
      Set,
      Map,
      Number,
      String,
      Object,
      Array,
      URLSearchParams,
      location: { search: query },
      setTimeout: (fn) => (timers.push(fn), timers.length),
      clearTimeout: () => {},
      E,
      sessionTracker: () => tracker,
      addSessionNavigation: () => {},
      roundSummary: (game) => S.accuracy(tracker.snapshot().games[game] || { attempted: 0 }) + "",
    };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(GAME_DIR, "script.js"), "utf8").replace(/^import[^;]+;/gm, ""), ctx);
    const $ = (id) => document.getElementById(id);
    return {
      $,
      document,
      tracker,
      timers,
      game: ctx.RobotAlgorithms,
      metrics: () => tracker.snapshot().games["robot-algorithms"],
      mode(v) {
        $("mode").value = v;
        $("mode").onchange();
      },
      flush() {
        let n = 0;
        while (timers.length && n++ < 500) timers.shift()();
      },
    };
  }

  await section("DOM: default mode, rendering, no reveal before submit", () => {
    const app = launch();
    eq(app.$("mode").value, "mixed", "Mixed Practice is the default");
    const ch = app.game.current();
    ok(ch);
    const w = ch.worlds ? ch.worlds[0] : ch.world;
    eq(app.document.querySelectorAll(".ra-cell").length >= w.rows * w.cols, true);
    eq(app.document.querySelectorAll(".ra-robot").length, ch.worlds ? ch.worlds.length : 1);
    ok(app.$("playback").hidden, "no animation before submit");
    ok(app.$("feedback").hidden);
    eq(app.metrics().generated, 1);
    for (const m of Object.keys(E.MODES)) {
      app.mode(m);
      eq(app.game.current().mode, m);
      const c = app.game.current();
      if (c.kind !== "build") {
        eq(app.document.querySelectorAll("#code li").length, c.code.split("\n").length);
        if (c.answerMode === "place") {
          eq(app.document.querySelectorAll("[data-choice]").length, 0, "placement questions have no answer buttons");
          ok(app.document.querySelector(".ra-interactive"), "grid is clickable before submitting");
        } else {
          eq(app.document.querySelectorAll("[data-choice]").length, 4);
          ok(app.$("submit").disabled, "submit disabled until a choice is made");
        }
        const cell = `${c.world.start.r},${c.world.start.c}`;
        ok(app.document.querySelector(`[data-cell="${cell}"] .ra-robot`), "robot drawn at its start cell");
      } else ok(!app.$("builder").hidden);
    }
    eq(app.metrics().skipped, 6, "leaving unanswered challenges counts as skipped");
  });

  function until(app, pred, limit = 80) {
    for (let i = 0; i < limit && !pred(app.game.current()); i++) app.$("skip").onclick();
    ok(pred(app.game.current()), "found a matching challenge");
    return app.game.current();
  }
  const plain = (x) => JSON.parse(JSON.stringify(x));
  const cellEl = (app, r, c) => app.document.querySelector(`#grids [data-cell="${r},${c}"]`);
  function placeTo(app, r, c, d) {
    const p = app.game.placed();
    if (p.r !== r || p.c !== c) cellEl(app, r, c).onclick();
    for (let k = 0; k < 4 && app.game.placed().d !== d; k++) {
      const q = app.game.placed();
      cellEl(app, q.r, q.c).onclick(); // clicking the robot turns it right
    }
  }
  function decode(key, start) {
    const v = key.slice(2).split(",").map(Number);
    if (key[0] === "L") return { r: v[0], c: v[1], d: start.d };
    if (key[0] === "D") return { r: start.r, c: start.c, d: v[0] };
    return { r: v[0], c: v[1], d: v[2] };
  }

  await section("DOM: first-attempt scoring for multiple choice", () => {
    const app = launch({ query: "?mode=loops&seed=5" });
    let ch = until(app, (c) => c.answerMode === "choice");
    const base = app.metrics();
    const wrong = (ch.answer + 1) % 4;
    app.document.querySelector(`[data-choice="${wrong}"]`).onclick();
    ok(!app.$("submit").disabled);
    app.$("submit").onclick();
    const d = (m, k) => m[k] - base[k];
    let m = app.metrics();
    eq([d(m, "attempted"), d(m, "firstTry"), d(m, "incorrect"), d(m, "revealed"), d(m, "submissions")], [1, 0, 1, 1, 1]);
    ok(/Not quite/.test(app.$("feedback").textContent));
    ok(app.$("feedback").textContent.includes(ch.choices[ch.answer].text), "correct answer identified");
    ok(!app.$("playback").hidden, "animation appears after submit");
    ok(!app.$("next").hidden, "Next Challenge available immediately");
    // exploring afterwards cannot change the score
    app.document.querySelector(`[data-choice="${ch.answer}"]`).onclick();
    app.$("submit").onclick();
    app.$("skip-anim").onclick();
    app.$("replay").onclick();
    app.$("step-fwd").onclick();
    app.$("step-back").onclick();
    app.$("skip-anim").onclick();
    app.flush();
    m = app.metrics();
    eq([d(m, "attempted"), d(m, "firstTry"), d(m, "incorrect"), d(m, "revealed"), d(m, "submissions")], [1, 0, 1, 1, 1]);
    ok(/Finished|Stopped/.test(app.$("exec-status").textContent));
    app.$("next").onclick();
    ch = until(app, (c) => c.answerMode === "choice");
    const before = app.metrics();
    app.document.querySelector(`[data-choice="${ch.answer}"]`).onclick();
    app.$("submit").onclick();
    m = app.metrics();
    eq([m.attempted - before.attempted, m.firstTry - before.firstTry], [1, 1]);
    ok(/Correct!/.test(app.$("feedback").textContent));
    app.$("next").onclick();
    const s0 = app.metrics().skipped;
    app.$("skip").onclick();
    eq(app.metrics().skipped, s0 + 1, "skip without answering is recorded");
    eq(app.metrics().topics.loops.title, "Loop Navigator");
  });

  await section("DOM: place-the-robot answers (click cells to move, click robot to turn right)", () => {
    const app = launch({ query: "?mode=predict&seed=21" });
    let ch = until(app, (c) => c.answerMode === "place" && c.ask.type === "state" && c.world.walls.length > 0);
    const start = ch.world.start;
    eq(plain(app.game.placed()), { ...start }, "robot starts at the program's start");
    ok(app.$("playback").hidden, "no movement is revealed before submitting");
    ok(!app.$("submit").disabled);
    // click the robot: it turns right once
    cellEl(app, start.r, start.c).onclick();
    eq(app.game.placed().d, (start.d + 1) % 4);
    ok(app.document.querySelector(`#grids [data-cell="${start.r},${start.c}"] .ra-robot`));
    ok(/facing (Up|Right|Down|Left)/.test(app.$("place-status").textContent), "answers use Up/Right/Down/Left");
    // clicking the top / right / bottom / left side of the robot's cell faces that way in one click
    const box = () => ({ left: 0, top: 0, width: 100, height: 100 });
    for (const [x, y, dir] of [[50, 6, 0], [94, 50, 1], [50, 94, 2], [6, 50, 3], [60, 20, 0], [80, 60, 1]]) {
      const el = cellEl(app, start.r, start.c);
      el.getBoundingClientRect = box;
      el.onclick({ clientX: x, clientY: y });
      eq(app.game.placed().d, dir, `side click at (${x},${y})`);
    }
    {
      const el = cellEl(app, start.r, start.c);
      el.getBoundingClientRect = box;
      el.onclick({ clientX: 52, clientY: 49 });
      eq(app.game.placed().d, 2, "clicking the middle still turns right (Right -> Down)");
      const el2 = cellEl(app, start.r, start.c);
      el2.getBoundingClientRect = box;
      el2.onclick({ clientX: 94, clientY: 50 });
    }
    eq(app.document.querySelectorAll("#grids .ra-face").length, 4, "side hints shown on the robot's cell");
    ok(app.document.querySelector("#grids .ra-face-1.on"), "current facing highlighted");
    // arrow keys on the robot's cell do the same
    for (const [key, dir] of [["ArrowUp", 0], ["ArrowDown", 2], ["ArrowRight", 1], ["ArrowLeft", 3]]) {
      cellEl(app, start.r, start.c).onkeydown({ key, preventDefault() {} });
      eq(app.game.placed().d, dir, key);
    }
    // moving to another cell keeps the facing, wherever in that cell you click
    const facingBefore = app.game.placed().d;
    // obstacles cannot hold the robot
    const [wr, wc] = ch.world.walls[0].split(",").map(Number);
    cellEl(app, wr, wc).onclick();
    eq([app.game.placed().r, app.game.placed().c], [start.r, start.c]);
    ok(!app.$("place-warn").hidden);
    // keyboard activation works on cells
    const open = [];
    for (let r = 0; r < ch.world.rows; r++) for (let c = 0; c < ch.world.cols; c++) if (!ch.world.walls.includes(`${r},${c}`) && (r !== start.r || c !== start.c)) open.push([r, c]);
    const mv = cellEl(app, open[0][0], open[0][1]);
    mv.getBoundingClientRect = box;
    mv.onclick({ clientX: 50, clientY: 4 });
    eq([app.game.placed().r, app.game.placed().c, app.game.placed().d], [...open[0], facingBefore], "moving does not change the facing");
    app.$("reset-place").onclick();
    cellEl(app, open[0][0], open[0][1]).onkeydown({ key: "Enter", preventDefault() {} });
    eq([app.game.placed().r, app.game.placed().c], open[0]);
    app.$("turn-right").onclick();
    app.$("reset-place").onclick();
    eq(plain(app.game.placed()), { ...start }, "Reset to start");
    // trace freely, then place the correct answer
    const target = decode(ch.choices[ch.answer].key, start);
    placeTo(app, open[1][0], open[1][1], 2);
    placeTo(app, target.r, target.c, target.d);
    const base = app.metrics();
    app.$("submit").onclick();
    let m = app.metrics();
    eq([m.attempted - base.attempted, m.firstTry - base.firstTry, m.incorrect - base.incorrect], [1, 1, 0]);
    ok(/Correct!/.test(app.$("feedback").textContent));
    ok(!app.$("playback").hidden);
    ok(app.document.querySelector(".ra-pick.ok"), "your answer is marked on the grid");
    // grid is locked after submitting
    const locked = app.game.placed();
    cellEl(app, open[2][0], open[2][1]).onclick?.();
    eq(plain(app.game.placed()), plain(locked));
    app.flush();

    // A wrong placement that matches a simulated misconception names it
    app.$("next").onclick();
    ch = until(app, (c) => c.answerMode === "place" && c.misconceptions.length > 0);
    const mis = ch.misconceptions[0];
    const wrongPos = decode(mis.key, ch.world.start);
    placeTo(app, wrongPos.r, wrongPos.c, wrongPos.d);
    const b2 = app.metrics();
    app.$("submit").onclick();
    m = app.metrics();
    eq([m.attempted - b2.attempted, m.firstTry - b2.firstTry, m.incorrect - b2.incorrect, m.revealed - b2.revealed], [1, 0, 1, 1]);
    ok(app.$("feedback").textContent.includes(mis.why), "feedback explains the matching mistake");
    ok(app.$("feedback").textContent.includes(ch.choices[ch.answer].text), "correct answer shown");
    ok(app.$("turn-right").disabled && app.$("reset-place").disabled);
    app.$("submit").onclick();
    eq(app.metrics().submissions, m.submissions, "no second scored submission");
    // direction-only questions grade only the facing
    app.$("next").onclick();
    ch = until(app, (c) => c.answerMode === "place" && c.ask.type === "direction", 200);
    const want = Number(ch.choices[ch.answer].key.slice(2));
    const away = open.find(([r, c]) => !ch.world.walls.includes(`${r},${c}`) && (r !== ch.world.start.r || c !== ch.world.start.c)) || [ch.world.start.r, ch.world.start.c];
    placeTo(app, away[0], away[1], want);
    const b3 = app.metrics();
    app.$("submit").onclick();
    eq(app.metrics().firstTry - b3.firstTry, 1, "direction graded without the cell");
  });

  await section("DOM: debug inspection and per-mode tracking", () => {
    const app = launch({ query: "?mode=debug&seed=9" });
    const ch = app.game.current();
    eq(ch.answerMode, undefined, "debug questions keep the four-option format");
    app.document.querySelector(`[data-choice="${ch.answer}"]`).onclick();
    app.$("submit").onclick();
    ok(!app.$("inspect").hidden);
    const views = [...app.document.querySelectorAll("#inspect button")].map((b) => b.dataset.view);
    eq(views, ["original", "fix"]);
    app.document.querySelector('#inspect [data-view="original"]').onclick();
    eq(app.document.querySelectorAll("#code li").length, ch.lines.length);
    app.flush();
    eq(app.metrics().topics.debug.firstTry, 1);
  });

  await section("DOM: build mode first-run scoring, retries, and solution reveal", () => {
    const app = launch({ query: "?mode=build&seed=11" });
    let ch = app.game.current();
    ok(app.$("run").disabled, "cannot run an empty program");
    app.document.querySelector('[data-add="turnLeft"]').onclick();
    ok(!app.$("run").disabled);
    app.$("run").onclick();
    let m = app.metrics();
    eq([m.attempted, m.firstTry, m.incorrect], [1, 0, 1]);
    ok(!app.$("solution").hidden, "solution offered after a failed run");
    ok(app.$("next").hidden, "keep working or reveal; Skip remains available");
    // load the verified reference and run it: counts as solved after retry
    app.$("solution").onclick();
    m = app.metrics();
    eq(m.revealed, 1);
    eq(app.game.builderCode().trim(), ch.reference.trim(), "reference loaded into the editor");
    app.$("run").onclick();
    m = app.metrics();
    eq([m.attempted, m.firstTry, m.afterRetry, m.submissions], [1, 0, 0, 1], "runs after reveal are practice only");
    app.flush();
    // Next challenge: wrong first run then a correct run => afterRetry
    app.$("next").onclick();
    ch = app.game.current();
    app.document.querySelector('[data-add="turnRight"]').onclick();
    app.$("run").onclick();
    app.document.getElementById("clear").onclick();
    // Build the reference through the palette
    buildThroughUI(app, ch.reference);
    eq(app.game.builderCode().trim(), ch.reference.trim());
    app.$("run").onclick();
    m = app.metrics();
    eq([m.attempted, m.firstTry, m.afterRetry], [2, 0, 1]);
    ok(/It works/.test(app.$("feedback").textContent));
    // Correct first run
    app.$("next").onclick();
    ch = app.game.current();
    buildThroughUI(app, ch.reference);
    app.$("run").onclick();
    m = app.metrics();
    eq([m.attempted, m.firstTry], [3, 1]);
    ok(/first run/.test(app.$("feedback").textContent));
    // Undo/delete controls
    app.$("next").onclick();
    app.document.querySelector('[data-add="move"]').onclick();
    app.document.querySelector('[data-add="for"]').onclick();
    app.document.querySelector('[data-add="move"]').onclick();
    eq(app.game.builderCode(), "robot.move();\nfor (int i = 0; i < 3; i++) {\n    robot.move();\n}");
    app.document.querySelector('[data-inc="1"]').onclick();
    ok(app.game.builderCode().includes("i < 4"));
    app.document.querySelector('[data-del="1"]').onclick();
    eq(app.game.builderCode(), "robot.move();", "deleting a loop removes its block");
    app.document.getElementById("undo").onclick();
    ok(app.game.builderCode().includes("for (int i"));
  });

  function buildThroughUI(app, ref) {
    for (const raw of ref.split("\n")) {
      const t = raw.trim();
      if (t === "}") {
        const buttons = [...app.document.querySelectorAll("#builder [data-pos]")];
        const cur = app.document.querySelector("#builder .at-cursor");
        const startAt = cur ? buttons.indexOf(cur) + 1 : 0;
        const idx = buttons.findIndex((b, i) => i >= startAt && b.textContent.trim() === "}");
        buttons[idx].onclick();
      } else if (t.startsWith("for")) {
        app.document.querySelector('[data-add="for"]').onclick();
        const n = Number(t.match(/< (\d+);/)[1]);
        const pos = app.document.querySelector("#builder .at-cursor").dataset.pos;
        for (let k = 3; k !== n; k += n > 3 ? 1 : -1) app.document.querySelector(`[data-${n > 3 ? "inc" : "dec"}="${pos}"]`).onclick();
      } else if (t.startsWith("while (robot.canMove())")) app.document.querySelector('[data-add="whileCanMove"]').onclick();
      else if (t.startsWith("while (!robot.atGoal())")) app.document.querySelector('[data-add="whileNotGoal"]').onclick();
      else app.document.querySelector(`[data-add="${t.slice(6, t.indexOf("("))}"]`).onclick();
    }
  }

  await section("DOM: session data stays in the shared Java Games schema", () => {
    const store = new Map();
    const app = launch({ query: "?mode=loops&seed=2", storageMap: store });
    const ch = until(app, (c) => c.answerMode === "choice");
    app.document.querySelector(`[data-choice="${ch.answer}"]`).onclick();
    app.$("submit").onclick();
    const saved = JSON.parse(store.get(S.SESSION_KEY));
    eq(S.SESSION_KEY, "javaGames.session.v1");
    eq(saved.schema, 1);
    ok(saved.games["robot-algorithms"].topics.loops);
    eq(saved.games["robot-algorithms"].title, "Robot Algorithms");
    // Reloading with the same storage keeps the data valid (no reset warning)
    const again = S.createSessionTracker({ storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } });
    eq(again.warning, "");
    eq(again.snapshot().games["robot-algorithms"].firstTry, 1);
    eq(again.snapshot().games["robot-algorithms"].attempted, 1);
    // Reset behavior: confirmed reset clears results, keeps optional identity
    again.student("Test Student", "3");
    ok(!again.reset(false));
    ok(again.reset(true));
    const after = again.snapshot();
    eq(after.games, {});
    eq(after.totals.attempted, 0);
    eq(after.student.name, "Test Student");
  });

  console.log(`\nRobot Algorithms: ${checks} checks passed in ${sections.length} sections (${PER_MODE} generated challenges per mode).`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
