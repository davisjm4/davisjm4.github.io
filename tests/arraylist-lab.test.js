/* ArrayList Lab automated tests.
   Run from the repository root:   node tests/arraylist-lab.test.js
   (or from java-games/:            npm run test:arraylist)
   DOM tests use linkedom, the existing Java Games dev dependency
   (cd java-games && npm install). Real javac/JVM verification of generated
   challenges is in tests/arraylist-lab-jvm.test.js. */
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { createRequire } = require("node:module");

const ROOT = path.resolve(__dirname, "..");
const GAME_DIR = path.join(ROOT, "java-games", "arraylist-lab");
const PER_FAMILY = Number(process.env.ARRAYLIST_PER_FAMILY || 150);

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
const throwsIOOBE = (fn, msg) => {
  let name = null;
  try {
    fn();
  } catch (e) {
    name = e.javaName;
  }
  eq(name, "IndexOutOfBoundsException", msg);
};
async function section(name, fn) {
  const before = checks;
  await fn();
  sections.push([name, checks - before]);
  console.log(`  ✓ ${name} (${checks - before} checks)`);
}

/* ------------------------------------------------------------------ */
/* An independent mini-interpreter for the ArrayList statements shown   */
/* in challenges. It does NOT use the engine's JList/op model: it parses */
/* the displayed Java text and applies java.util.ArrayList rules to a    */
/* plain JS array, so it cross-checks the engine's answers.             */
/* ------------------------------------------------------------------ */
function independentRun(type, start, code) {
  const list = start.slice();
  const vars = {};
  const ints = {};
  const parseVal = (s) => {
    s = s.trim();
    if (/^".*"$/.test(s)) return s.slice(1, -1);
    if (/^-?\d+$/.test(s)) return Number(s);
    const g = s.match(/^(\w+)\.get\((.+)\)$/);
    if (g) {
      const i = intExpr(g[2], g[1]);
      if (i === null) throw Error("unsupported");
      if (i < 0 || i >= list.length) bad();
      return list[i];
    }
    throw Error("unsupported");
  };
  const intExpr = (s, name) => {
    s = s.trim();
    if (/^-?\d+$/.test(s)) return Number(s);
    if (s in ints) return ints[s];
    let m = s.match(new RegExp(`^${name}\\.size\\(\\)(?:\\s*([-+])\\s*(\\d+))?$`));
    if (m) return list.length + (m[1] ? (m[1] === "-" ? -1 : 1) * Number(m[2]) : 0);
    m = s.match(/^(\w+)\s*([-+])\s*(\d+)$/);
    if (m && m[1] in ints) return ints[m[1]] + (m[2] === "-" ? -1 : 1) * Number(m[3]);
    return null;
  };
  const bad = () => {
    const e = new Error("IOOBE");
    e.javaName = "IndexOutOfBoundsException";
    throw e;
  };
  const results = [];
  let removedAt = null;
  for (const raw of code.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    let m;
    if ((m = line.match(/^int (\w+) = (-?\d+);$/))) {
      ints[m[1]] = Number(m[2]);
      continue;
    }
    if ((m = line.match(/^Integer (\w+) = (-?\d+);$/))) {
      vars[m[1]] = Number(m[2]); // an Integer OBJECT
      continue;
    }
    m = line.match(/^(?:(?:int|Integer|String|boolean) \w+ = )?(\w+)\.(add|set|remove|get)\((.*)\);$/);
    if (!m) return { unsupported: line };
    const [, name, method, argText] = m;
    const args = splitArgs(argText);
    if (method === "add" && args.length === 1) {
      list.push(parseVal(args[0]));
      results.push(true);
    } else if (method === "add") {
      const i = intExpr(args[0], name);
      if (i === null) return { unsupported: line };
      if (i < 0 || i > list.length) bad(); // insertion may use index size()
      list.splice(i, 0, parseVal(args[1]));
    } else if (method === "set") {
      const i = intExpr(args[0], name);
      if (i === null) return { unsupported: line };
      if (i < 0 || i >= list.length) bad();
      results.push(list[i]);
      list[i] = parseVal(args[1]);
    } else if (method === "get") {
      const i = intExpr(args[0], name);
      if (i === null) return { unsupported: line };
      if (i < 0 || i >= list.length) bad();
      results.push(list[i]);
    } else {
      const a = args[0].trim();
      let obj = null;
      let mm;
      if ((mm = a.match(/^Integer\.valueOf\((-?\d+)\)$/)) || (mm = a.match(/^\(Integer\) (-?\d+)$/))) obj = { v: Number(mm[1]) };
      else if (/^".*"$/.test(a)) obj = { v: a.slice(1, -1) };
      else if (a in vars) obj = { v: vars[a] }; // Integer variable → remove(Object)
      if (obj) {
        // remove(Object): first element that equals()
        const k = list.findIndex((x) => x === obj.v);
        if (k >= 0) list.splice(k, 1);
        if (k >= 0) removedAt = k;
        results.push(k >= 0);
      } else {
        // int expression → remove(int index)
        const i = intExpr(a, name);
        if (i === null) return { unsupported: line };
        if (i < 0 || i >= list.length) bad();
        removedAt = i;
        results.push(list.splice(i, 1)[0]);
      }
    }
  }
  return { list, results, removedAt };
}
function splitArgs(s) {
  const out = [];
  let depth = 0,
    cur = "",
    q = false;
  for (const c of s) {
    if (c === '"') q = !q;
    if (!q && c === "(") depth++;
    if (!q && c === ")") depth--;
    if (!q && depth === 0 && c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

(async () => {
  const E = await import(pathToFileURL(path.join(GAME_DIR, "engine.js")).href);
  const S = await import(pathToFileURL(path.join(ROOT, "java-games", "session.js")).href);
  console.log("ArrayList Lab tests");

  /* ================================================================ */
  await section("creating ArrayLists: empty and single-element lists", () => {
    const L = new E.JList("String", []);
    eq(L.size(), 0);
    ok(L.isEmpty());
    throwsIOOBE(() => L.get(0), "get(0) on an empty list throws");
    throwsIOOBE(() => L.removeAt(0), "remove(0) on an empty list throws");
    eq(L.indexOf("x"), -1);
    ok(!L.contains("x"));
    eq(L.removeObj("x"), false);
    L.addAt(0, "only"); // index 0 == size() is legal on an empty list
    eq(L.values, ["only"]);
    ok(!L.isEmpty());
    eq(L.get(0), "only");
    throwsIOOBE(() => L.get(1));
    eq(L.removeAt(0), "only");
    ok(L.isEmpty());
    const one = new E.JList("Integer", [7]);
    eq(one.size(), 1);
    eq(one.set(0, 9), 7, "set returns the old element");
    eq(one.values, [9]);
    eq(one.size(), 1, "set does not change the size");
  });

  await section("add() and indexed insertion (shifting, index size() is valid)", () => {
    const L = new E.JList("Integer", [4, 8, 12]);
    eq(L.add(6), true);
    eq(L.values, [4, 8, 12, 6], "spec C: add(6) appends");
    const M = new E.JList("Integer", [4, 8, 12]);
    M.addAt(1, 6);
    eq(M.values, [4, 6, 8, 12], "spec D: add(1, 6) inserts and shifts right");
    M.addAt(0, 1);
    eq(M.values[0], 1, "insert at index 0");
    M.addAt(M.size(), 99);
    eq(M.values[M.size() - 1], 99, "insert at index size() appends");
    throwsIOOBE(() => M.addAt(M.size() + 1, 5), "insert past size() throws");
    throwsIOOBE(() => M.addAt(-1, 5), "negative insert index throws");
    throwsIOOBE(() => M.get(M.size()), "get(size()) throws — contrast with add(size(), e)");
  });

  await section("get() and set()", () => {
    const L = new E.JList("Integer", [4, 8, 12]);
    L.set(1, 6);
    eq(L.get(1), 6, "spec B: set(1, 6) then get(1) returns 6");
    eq(L.size(), 3);
    eq(L.get(L.size() - 1), 12, "size() - 1 is the last index");
    throwsIOOBE(() => L.set(3, 1), "set(size()) throws");
    throwsIOOBE(() => L.get(-1));
  });

  await section("both remove() overloads and their return values", () => {
    const L = new E.JList("Integer", [3, 7, 9, 2]);
    eq(L.removeAt(1), 7, "remove(int) returns the removed element");
    eq(L.values, [3, 9, 2], "spec E");
    const base = [5, 8, 5, 2];
    const byIndex = new E.JList("Integer", base);
    eq(byIndex.removeAt(1), 8);
    eq(byIndex.values, [5, 5, 2], "spec F: remove(1) removes index 1");
    const byValue = new E.JList("Integer", base);
    eq(byValue.removeObj(5), true, "remove(Object) returns a boolean");
    eq(byValue.values, [8, 5, 2], "spec F: remove(Integer.valueOf(5)) removes the FIRST 5");
    eq(byValue.removeObj(42), false, "missing value: false, unchanged");
    eq(byValue.values, [8, 5, 2]);
    // rendering selects the right overload in Java source
    eq(E.renderOp({ m: "removeObj", v: 5, form: "valueOf" }, "nums", "Integer"), "nums.remove(Integer.valueOf(5));");
    eq(E.renderOp({ m: "removeObj", v: 5, form: "cast" }, "nums", "Integer"), "nums.remove((Integer) 5);");
    eq(E.renderOp({ m: "removeAt", i: 1 }, "nums", "Integer"), "nums.remove(1);");
    eq(E.renderOp({ m: "removeObj", v: "cat" }, "words", "String"), 'nums.remove("cat");'.replace("nums", "words"));
    // misconception: treating the int literal as a value
    eq(E.simulateMis("Integer", [4, 8, 3, 11, 5, 9], [{ m: "removeAt", i: 4 }], "removeAtAsObj"), [8, 3, 11, 5, 9]);
    eq(E.simulateMis("Integer", [5, 8, 5, 2], [{ m: "removeObj", v: 5 }], "removeAllMatches"), [8, 2]);
  });

  await section("size(), contains(), indexOf(), duplicates, case-sensitive Strings", () => {
    const w = new E.JList("String", ["CAT", "DOG"]);
    w.removeAt(0);
    eq(w.size(), 1, "spec G: size() after remove(0) is 1");
    const n = new E.JList("String", ["Mia", "Leo", "Mia"]);
    eq(n.indexOf("Mia"), 0, "spec H: first occurrence");
    eq(n.lastIndexOf("Mia"), 2);
    eq(n.indexOf("mia"), -1, "equals() is case-sensitive");
    ok(n.contains("Leo") && !n.contains("leo"));
    eq(n.indexOf("Zed"), -1, "missing → -1");
  });

  await section("loop traversal and removal while iterating (shifting / skipping)", () => {
    // spec I
    const nums = [2, 5, 8];
    let total = 0;
    const L = new E.JList("Integer", nums);
    for (let i = 0; i < L.size(); i++) total += L.get(i);
    eq(total, 15);
    // spec J: forward removal skips the shifted element. Each case is checked
    // against the engine's loop simulator AND an independent re-implementation.
    const gt4 = (x) => x > 4;
    const both = (vals, form) => {
      const a = E.loopRemove("Integer", vals, gt4, form);
      const b = independentLoop(vals, gt4, form);
      eq([a.values, a.error], [b.values, b.error], `engine and independent loop agree (${form} ${vals})`);
      if (!a.error) eq(a.removed, b.removed);
      return a;
    };
    const fwd = both([2, 4, 6, 8], "forward");
    eq(fwd.values, [2, 4, 8], "spec J: 8 shifts into index 2 and is skipped");
    eq(fwd.removed, [2]);
    eq(both([2, 4, 6, 8], "backward").values, [2, 4], "backward traversal removes all");
    eq(both([2, 4, 6, 8], "forwardDec").values, [2, 4], "i-- after removal removes all");
    eq(both([6, 1, 8], "backwardGT0").values, [6, 1], "i > 0 never checks index 0");
    eq(both([1, 2, 3], "forwardLE").error, "IndexOutOfBoundsException", "i <= size() reaches get(size())");
    eq(both([9, 8, 7, 1], "forward").values, [8, 1], "three adjacent matches: every other one is skipped");
    // not every indexed removal loop skips: no adjacent matches → same as intended
    eq(both([6, 1, 7, 2], "forward").values, [1, 2]);
  });

  await section("reveal diff tracks inserted / removed / replaced / shifted elements", () => {
    const a = new E.JList("Integer", [4, 8, 12]);
    const r = E.run("Integer", a, [{ m: "addAt", i: 1, v: 6 }]);
    const d = E.revealDiff(a, r.list);
    eq(d.after.map((x) => x.mark), ["", "new", "moved", "moved"]);
    eq(d.after.map((x) => x.was), [null, null, 1, 2]);
    const b = E.run("Integer", a, [{ m: "set", i: 0, v: 1 }, { m: "removeAt", i: 1 }]);
    const d2 = E.revealDiff(a, b.list);
    eq(d2.before.map((x) => x.mark), ["replaced", "removed", "moved"]);
    eq(d2.after.map((x) => x.mark), ["replaced", "moved"]);
  });

  /* ================================================================ */
  const all = {};
  const distinctCounts = {};
  await section(`generate and validate ${PER_FAMILY} challenges per family (${Object.keys(E.FAMILIES).length} families, ${E.TEMPLATES.length} templates)`, () => {
    const rng = E.makeRng(7331);
    for (const fam of Object.keys(E.FAMILIES)) {
      const tpls = E.TEMPLATES_BY_FAMILY[fam];
      ok(tpls.length >= 3, `family ${fam} has multiple templates`);
      all[fam] = [];
      for (let i = 0; i < PER_FAMILY; i++) {
        const ch = E.generateFromTemplate(tpls[i % tpls.length], rng);
        all[fam].push(ch);
        eq(E.validateChallenge(ch), [], `${ch.template} valid`);
        eq(ch.family, fam);
        eq(ch.mode, E.FAMILIES[fam].mode);
        ok(ch.javaChecks.length > 0, "has Java verification programs");
      }
      const distinct = new Set(all[fam].map((c) => c.signature)).size;
      // A (declaration) is a small recognition family by design; all others must vary widely
      ok(distinct >= PER_FAMILY * (fam === "A" ? 0.6 : 0.85), `family ${fam}: ${distinct}/${PER_FAMILY} distinct challenges`);
      distinctCounts[fam] = distinct;
    }
  });

  console.log(`    distinct challenges per family: ${JSON.stringify(distinctCounts)}`);
  await section("correct answer validation and exactly one correct choice", () => {
    for (const list of Object.values(all))
      for (const ch of list) {
        if (ch.kind === "choice") {
          ok(E.assess(ch, ch.answer), "correct choice is accepted");
          let correct = 0;
          for (let i = 0; i < ch.choices.length; i++) if (E.assess(ch, i)) correct++;
          eq(correct, 1, `${ch.template}: exactly one choice is correct`);
          const keys = ch.choices.map((c) => c.kind + JSON.stringify(c.value));
          eq(new Set(keys).size, keys.length, `${ch.template}: distractors are unique`);
          ok(ch.choices.every((c, i) => i === ch.answer || (c.why && c.why.length > 10)), "every distractor names a misconception");
        } else if (ch.kind === "cells") {
          ok(E.assess(ch, ch.answer));
          ok(!E.assess(ch, ch.answer.slice(0, -1)) || ch.answer.length === 0, "missing one element is wrong");
          const extra = [...Array(ch.list.values.length).keys()].find((i) => !ch.answer.includes(i));
          if (extra !== undefined) ok(!E.assess(ch, [...ch.answer, extra]), "an extra element is wrong");
          ok(E.assess(ch, ch.answer.slice().reverse()), "order of taps does not matter");
        } else {
          ok(E.assess(ch, ch.answer));
          const n = ch.list.values.length + (ch.kind === "gap" ? 1 : 0);
          for (let k = 0; k < n; k++) if (k !== ch.answer) ok(!E.assess(ch, k), `${ch.template}: only one cell/gap is correct`);
          if (ch.uniqueValues) eq(new Set(ch.list.values).size, ch.list.values.length, "no ambiguous duplicate values");
        }
        ok(!E.assess(ch, null) && !E.assess(ch, undefined), "no response is never correct");
      }
  });

  await section("independent re-execution of displayed statements (not using the engine model)", () => {
    let verified = 0;
    for (const list of Object.values(all))
      for (const ch of list) {
        if (!ch.list || !ch.code) continue;
        const correct = ch.kind === "choice" ? ch.choices[ch.answer] : null;
        const listAnswer = correct && correct.kind === "list" && /after|contain/.test(ch.question);
        if (!(listAnswer || ch.kind === "cell" || ch.kind === "gap")) continue;
        if (/for \(|System\.out/.test(ch.code)) continue;
        let r;
        try {
          r = independentRun(ch.list.type, ch.list.values, ch.code);
        } catch (e) {
          if (!e.javaName) throw e;
          r = { error: e.javaName };
        }
        if (r.unsupported) continue;
        if (r.error) throw Error(`${ch.template}: shown code throws ${r.error}: ${ch.code}`);
        if (listAnswer) eq(r.list, correct.value, `${ch.template}: ${ch.code}`);
        verified++;
      }
    // gap questions: the question text carries the statement
    for (const ch of all.D.filter((c) => c.kind === "gap")) {
      const stmt = ch.question.match(/`([^`]+)`/)[1];
      const before = ch.list.values;
      const r = independentRun(ch.list.type, before, stmt);
      const inserted = r.list.findIndex((v, i) => v !== before[i]);
      eq(inserted === -1 ? before.length : inserted, ch.answer, stmt);
      verified++;
    }
    // remove-by-index tap questions
    for (const ch of all.E.filter((c) => c.kind === "cell")) {
      const stmt = ch.question.match(/`([^`]+)`/)[1];
      const r = independentRun(ch.list.type, ch.list.values, stmt);
      eq(r.results[0], ch.list.values[ch.answer], stmt);
      verified++;
    }
    // overload tap questions: which position does Java's overload choice remove?
    for (const ch of all.F.filter((c) => c.kind === "cell")) {
      const r = independentRun(ch.list.type, ch.list.values, ch.code);
      eq(r.removedAt, ch.answer, ch.code);
      verified++;
    }
    ok(verified > 300, `independently verified ${verified} challenges`);
    console.log(`    (independently re-executed ${verified} challenges)`);
  });

  await section("no answer revealed before submission", () => {
    for (const list of Object.values(all))
      for (const ch of list) {
        if (["cell", "gap", "cells"].includes(ch.kind)) eq(ch.showIndices, false, `${ch.template}: index labels hidden when an index/position is the target`);
        if (ch.kind === "choice" && ch.choices[ch.answer].kind === "list") {
          const ans = E.listStr(ch.choices[ch.answer].value);
          ok(!(ch.code || "").includes(ans) && !ch.question.includes(ans), `${ch.template}: final list not shown in the prompt`);
          if (ch.list && !ch.goal) ok(JSON.stringify(ch.list.values) !== JSON.stringify(ch.choices[ch.answer].value) || /remain/.test(ch.question), `${ch.template}: start state differs from the answer`);
        }
      }
  });

  await section("distractors represent misconceptions, not filler", () => {
    // insertion-result questions must include the add-as-replace or insert-after misconception
    const ins = all.D.filter((c) => c.template === "D.insert-result");
    ok(ins.every((c) => c.choices.some((x) => /set|AT that index|start at 0/.test(x.why || ""))));
    // overload questions include the "removed the value instead" distractor
    const lit = all.F.filter((c) => c.template === "F.int-literal-index");
    ok(lit.length > 0 && lit.every((c) => c.choices.some((x) => /remove\(int index\)/.test(x.why || ""))));
    // forward-removal loop questions include the 'intended' answer whenever skipping happens
    const fr = all.J.filter((c) => c.template === "J.forward-remove" && /remain/.test(c.question));
    ok(fr.some((c) => c.choices.some((x) => /i\+\+ moves past it/.test(x.why || ""))));
    // not every forward-removal question skips (avoid teaching a fixed outcome)
    ok(fr.some((c) => /never hides a match/.test(c.explanation)) && fr.some((c) => /skips it/.test(c.explanation)));
    // list choices: no length outlier
    for (const list of Object.values(all))
      for (const ch of list.filter((c) => c.kind === "choice" && c.choices[c.answer].kind === "list")) {
        const others = ch.choices.filter((_, i) => i !== ch.answer).map((c) => c.value.length);
        ok(!(others.every((l) => l === others[0]) && others[0] !== ch.choices[ch.answer].value.length), `${ch.template}: correct list is not a length outlier`);
      }
  });

  await section("no answer-position or longest-choice shortcut", () => {
    const pos = [0, 0, 0, 0];
    let longest = 0,
      total = 0;
    for (const list of Object.values(all))
      for (const ch of list.filter((c) => c.kind === "choice" && c.choices.length === 4)) {
        pos[ch.answer]++;
        const len = (c) => (c.kind === "list" ? c.value.length : String(c.value).length);
        const L = ch.choices.map(len);
        const max = Math.max(...L);
        if (L[ch.answer] === max && L.filter((x) => x === max).length === 1) longest++;
        total++;
      }
    const expected = total / 4;
    for (const p of pos) ok(Math.abs(p - expected) < expected * 0.2, `answer positions balanced ${JSON.stringify(pos)}`);
    ok(longest / total < 0.3, `correct answer uniquely longest in ${longest}/${total}`);
    console.log(`    answer positions ${JSON.stringify(pos)}; correct uniquely longest in ${longest}/${total} four-choice questions`);
  });

  await section("mixed practice: variety, balance, and recent-repeat suppression", () => {
    const rng = E.makeRng(99);
    const h = E.createHistory();
    const seq = [];
    for (let i = 0; i < 1200; i++) seq.push(E.generate("mixed", rng, h));
    const fam = {};
    seq.forEach((c) => (fam[c.family] = (fam[c.family] || 0) + 1));
    eq(Object.keys(fam).sort(), Object.keys(E.FAMILIES).sort(), "every family appears in Mixed Practice");
    for (let i = 1; i < seq.length; i++) ok(seq[i].family !== seq[i - 1].family, "no family twice in a row");
    for (let i = 1; i < seq.length; i++) ok(seq[i].signature !== seq[i - 1].signature, "no immediate repeat");
    for (let i = 4; i < seq.length; i++) ok(!seq.slice(i - 4, i).some((c) => c.template === seq[i].template), "same template not within 4 rounds");
    const insertRemove = seq.filter((c) => c.mode === "insert-remove").length / seq.length;
    ok(insertRemove > 0.3, `insert/remove is frequent (${(insertRemove * 100).toFixed(0)}%)`);
    const lv = { 1: 0, 2: 0, 3: 0 };
    seq.forEach((c) => lv[c.level]++);
    ok(lv[1] > 0.2 * seq.length && lv[2] > 0.25 * seq.length && lv[3] > 0.1 * seq.length, `levels balanced ${JSON.stringify(lv)}`);
    const tpls = new Set(seq.map((c) => c.template));
    eq(tpls.size, E.TEMPLATES.length, "every template is reachable in Mixed Practice");
    const kinds = new Set(seq.map((c) => c.kind));
    eq([...kinds].sort(), ["cell", "cells", "choice", "gap"], "direct list interactions appear, not only multiple choice");
    const recent = new Set(seq.slice(-40).map((c) => c.signature));
    ok(recent.size >= 39, "recent window has no repeated challenge");
    console.log(`    mixed distribution: ${JSON.stringify(fam)} levels ${JSON.stringify(lv)}`);
    // per-mode generation stays inside the mode
    for (const mode of Object.keys(E.MODES)) {
      const hh = E.createHistory();
      for (let i = 0; i < 80; i++) eq(E.generate(mode, rng, hh).mode, mode);
    }
  });

  await section("first-attempt scoring with the shared session tracker", () => {
    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
    const t = S.createSessionTracker({ storage });
    const a = t.begin(E.GAME_ID, "ArrayList Lab", "insert-remove", "Insert & Remove");
    eq(t.submit(a, true).firstTry, true);
    eq(t.submit(a, true).accepted, false, "a solved challenge cannot be resubmitted");
    const b = t.begin(E.GAME_ID, "ArrayList Lab", "traverse", "Traverse & Trace");
    t.submit(b, false);
    t.reveal(b); // the lab reveals immediately after a wrong first answer
    eq(t.submit(b, true).accepted, false, "no retry credit after the reveal");
    const c = t.begin(E.GAME_ID, "ArrayList Lab", "access", "Access & Update");
    t.skip(c);
    const m = t.snapshot().games[E.GAME_ID];
    eq([m.attempted, m.firstTry, m.incorrect, m.revealed, m.skipped, m.afterRetry], [2, 1, 1, 1, 1, 0]);
    eq(Object.keys(m.topics).sort(), ["access", "insert-remove", "traverse"]);
  });

  /* ================================================================ */
  /* DOM tests                                                        */
  /* ================================================================ */
  let parseHTML;
  try {
    const req = createRequire(path.join(ROOT, "java-games", "package.json"));
    ({ parseHTML } = req(process.env.CSP_DOM_LIBRARY || "linkedom"));
  } catch {
    console.error("\nlinkedom is required for DOM tests. Run: cd java-games && npm install");
    process.exit(1);
  }
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
    const lab = ctx.ArrayListLab;
    return {
      $,
      document,
      tracker,
      lab,
      m: () => tracker.snapshot().games[E.GAME_ID] || { attempted: 0, firstTry: 0, incorrect: 0, revealed: 0, skipped: 0, submissions: 0, generated: 0, topics: {} },
      mode(v) {
        $("mode").value = v;
        $("mode").onchange();
      },
      pick(correct = true) {
        const ch = lab.current();
        const q = (sel) => document.querySelector(sel);
        if (ch.kind === "choice") q(`[data-choice="${correct ? ch.answer : (ch.answer + 1) % ch.choices.length}"]`).onclick();
        else if (ch.kind === "cell") q(`[data-cell="${correct ? ch.answer : (ch.answer + 1) % ch.list.values.length}"]`).onclick();
        else if (ch.kind === "gap") q(`[data-gap="${correct ? ch.answer : (ch.answer + 1) % (ch.list.values.length + 1)}"]`).onclick();
        else {
          const ids = correct ? ch.answer : ch.answer.length > 1 ? ch.answer.slice(1) : [[...Array(ch.list.values.length).keys()].find((i) => !ch.answer.includes(i))];
          for (const i of ids) q(`[data-cell="${i}"]`).onclick();
        }
      },
    };
  }

  await section("page loads in Mixed Practice with an accessible, answer-free first challenge", () => {
    const t = launch({ query: "?seed=5" });
    eq(t.$("mode").value, "mixed");
    ok(t.$("question").textContent.length > 5);
    ok(t.$("submit").disabled, "Check Answer disabled before a selection");
    ok(t.$("feedback").hidden && t.$("reveal").hidden && t.$("next").hidden);
    eq(t.document.querySelectorAll(".is-correct,.is-answer").length, 0);
    eq(t.m().generated, 1);
    const opts = [...t.document.querySelectorAll("#mode option")].map((o) => o.getAttribute("value"));
    eq(opts, ["mixed", ...Object.keys(E.MODES)], "mode menu matches the engine modes");
  });

  await section("every mode: clickable interactions, correct feedback, first-try scoring", () => {
    const t = launch({ query: "?seed=11" });
    const seenKinds = new Set();
    for (const mode of ["mixed", ...Object.keys(E.MODES)]) {
      t.mode(mode);
      for (let n = 0; n < 30; n++) {
        const ch = t.lab.current();
        eq(mode === "mixed" ? true : ch.mode === mode, true);
        seenKinds.add(ch.kind);
        // no index labels before submitting on index-target questions
        if (["cell", "gap", "cells"].includes(ch.kind)) ok([...t.document.querySelectorAll("#start .al-idx")].every((s) => s.hasAttribute("hidden")), "indices hidden");
        const before = t.m();
        t.pick(true);
        ok(!t.$("submit").disabled, "selection enables Check Answer");
        t.$("submit").onclick();
        const after = t.m();
        eq(after.firstTry, before.firstTry + 1, `${ch.template}: first-try correct recorded`);
        ok(t.$("feedback").className.includes("good"));
        ok(t.$("feedback").innerHTML.includes("Correct!"));
        ok(!t.$("next").hidden && t.$("submit").hidden);
        if (["cell", "gap", "cells"].includes(ch.kind)) ok([...t.document.querySelectorAll("#start .al-idx")].every((s) => !s.hasAttribute("hidden")), "indices revealed after submission");
        if (ch.reveal) ok(!t.$("reveal").hidden && t.$("reveal").innerHTML.includes("Before"), "before/after shown");
        // double submission is ignored
        t.$("submit").onclick();
        eq(t.m().submissions, after.submissions);
        t.$("next").onclick();
      }
    }
    eq([...seenKinds].sort(), ["cell", "cells", "choice", "gap"]);
  });

  await section("incorrect answers: immediate correct answer, misconception note, recorded as revealed", () => {
    const t = launch({ query: "?seed=21" });
    for (let n = 0; n < 60; n++) {
      const ch = t.lab.current();
      const b = t.m();
      t.pick(false);
      t.$("submit").onclick();
      const a = t.m();
      eq([a.attempted, a.incorrect, a.revealed, a.firstTry], [b.attempted + 1, b.incorrect + 1, b.revealed + 1, b.firstTry], `${ch.template}`);
      ok(t.$("feedback").className.includes("bad"));
      ok(t.$("feedback").innerHTML.includes("Correct answer:"));
      if (ch.kind === "choice") {
        ok(t.document.querySelector(".al-choice.is-correct") && t.document.querySelector(".al-choice.is-wrong"));
        ok(t.$("feedback").innerHTML.includes("About your choice"));
      } else ok(t.document.querySelector("#start .is-answer"), "answer cell/gap highlighted");
      eq(t.document.querySelectorAll(".selected").length, 0, "selection styling cleared so marks are visible");
      // controls locked after the one scored submission
      ok([...t.document.querySelectorAll("[data-choice],[data-cell],[data-gap]")].every((el) => el.disabled));
      t.$("next").onclick();
    }
  });

  await section("Show Answer, Skip, and mode change are recorded correctly", () => {
    const t = launch({ query: "?seed=31" });
    let b = t.m();
    t.$("show").onclick();
    let a = t.m();
    eq([a.revealed, a.attempted], [b.revealed + 1, b.attempted], "Show Answer: revealed without an attempt");
    ok(t.$("feedback").innerHTML.includes("Answer shown"));
    t.$("next").onclick();
    b = t.m();
    t.$("skip").onclick();
    a = t.m();
    eq(a.skipped, b.skipped + 1, "Skip records a skipped challenge");
    eq(a.generated, b.generated + 1);
    b = t.m();
    t.mode("compare");
    a = t.m();
    eq(a.skipped, b.skipped + 1, "changing mode skips the unfinished challenge");
    eq(t.lab.current().mode, "compare");
    ok(a.topics.compare, "per-mode topic statistics");
    eq(a.topics.compare.title, "Arrays vs. ArrayLists");
  });

  await section("multi-select cells can be toggled before checking", () => {
    const t = launch({ query: "?seed=41&mode=traverse" });
    let guard = 0;
    while (t.lab.current().kind !== "cells" && guard++ < 200) t.$("new").onclick();
    const ch = t.lab.current();
    eq(ch.kind, "cells");
    const first = t.document.querySelector('[data-cell="0"]');
    first.onclick();
    first.onclick();
    eq(JSON.stringify(t.lab.selection()), "[]", "second tap unselects");
    ok(t.$("submit").disabled);
    t.pick(true);
    t.$("submit").onclick();
    ok(t.$("feedback").className.includes("good"));
  });

  await section("session persists in local storage across page loads", () => {
    const store = new Map();
    const t1 = launch({ store, query: "?seed=51" });
    t1.pick(true);
    t1.$("submit").onclick();
    const raw = store.get(S.SESSION_KEY);
    ok(raw && JSON.parse(raw).games[E.GAME_ID].firstTry === 1, "saved under javaGames.session.v1");
    const t2 = launch({ store, query: "?seed=52" });
    eq(t2.m().firstTry, 1, "a new page load sees the saved session");
    eq(t2.m().generated, 2);
  });

  await section("hub registration and shared navigation", () => {
    const app = fs.readFileSync(path.join(ROOT, "java-games", "app.js"), "utf8");
    ok(/import \{ arrayListGame \} from "\.\/arraylist-lab\/engine\.js/.test(app), "app.js imports arrayListGame (apply patches/java-games-integration.patch)");
    ok(app.includes('"arraylist-lab": arrayListGame'), "app.js lists the ArrayList Lab card");
    const html = fs.readFileSync(path.join(GAME_DIR, "index.html"), "utf8");
    ok(html.includes('href="/cs-games/advanced/"') && html.includes('data-game="arraylist-lab"'));
    ok(html.includes("../style.css") && html.includes("./script.js"), "relative paths for GitHub Pages");
    ok(!/https?:\/\//.test(fs.readFileSync(path.join(GAME_DIR, "script.js"), "utf8")), "no network requests");
    eq(E.arrayListGame.name, "ArrayList Lab");
  });

  console.log(`\nArrayList Lab: ${checks} checks passed in ${sections.length} sections.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

/* Independent re-implementation of the five removal-loop shapes on a plain
   array (cross-checks the engine's loopRemove). */
function independentLoop(values, pred, form) {
  const list = values.slice();
  const ids = values.map((_, i) => i);
  const removed = [];
  try {
    if (form.startsWith("forward")) {
      for (let i = 0; form === "forwardLE" ? i <= list.length : i < list.length; i++) {
        if (i >= list.length) throw Object.assign(new Error(), { javaName: "IndexOutOfBoundsException" });
        if (pred(list[i])) {
          removed.push(ids[i]);
          list.splice(i, 1);
          ids.splice(i, 1);
          if (form === "forwardDec") i--;
        }
      }
    } else {
      for (let i = list.length - 1; i >= (form === "backwardGT0" ? 1 : 0); i--)
        if (pred(list[i])) {
          removed.push(ids[i]);
          list.splice(i, 1);
          ids.splice(i, 1);
        }
    }
  } catch (e) {
    return { values: list, removed, error: e.javaName };
  }
  return { values: list, removed: removed.sort((a, b) => a - b), error: null };
}
