/* Documentation Lab — generator, content-quality, and scoring tests.
   Run from java-games/documentation-lab/:   node tests/doclab-tests.mjs
   (No dependencies. The JVM checks are in doclab-jvm-tests.mjs; the DOM
   tests are in doclab-dom-tests.mjs.) */
import assert from "node:assert/strict";
import * as E from "../engine.js";
import { createSessionTracker } from "../../session.js";

let checks = 0;
const ok = (v, msg) => {
  assert.ok(v, msg);
  checks++;
};
const section = (name, fn) => {
  const before = checks;
  fn();
  console.log(`  ✓ ${name} (${checks - before} checks)`);
};
const all = Object.entries(E.ITEMS).flatMap(([mode, items]) => items.map((i) => ({ ...i, mode })));
const N = Number(process.env.DOCLAB_N || 2000);
console.log("Documentation Lab tests");

section("bank structure and variety", () => {
  ok(Object.keys(E.MODES).length === 5, "five modes");
  const ids = new Set();
  for (const it of all) {
    ok(!ids.has(it.id), "unique id " + it.id);
    ids.add(it.id);
    ok(it.explanation && it.explanation.length > 40, it.id + " has a real explanation");
    ok(E.FAMILIES[it.mode][it.family], it.id + " family has a title");
    for (const k of it.docs || []) ok(E.DOCS[k], `${it.id} doc ${k} exists`);
  }
  for (const [mode, items] of Object.entries(E.ITEMS)) {
    const fams = new Set(items.map((i) => i.family));
    ok(fams.size >= 5, `${mode} has ≥5 reasoning families (has ${fams.size})`);
    ok(items.length >= 12, `${mode} has ≥12 challenges`);
  }
  // Modes use different interaction kinds, not one multiple-choice template.
  const kinds = new Set(all.map((i) => i.kind));
  ok(["choice", "line", "repair", "build", "classify", "docline", "assemble"].every((k) => kinds.has(k)), "seven interaction kinds in use");
  ok(new Set(E.ITEMS.inspector.map((i) => i.kind)).size >= 2, "inspector uses ≥2 kinds");
  ok(new Set(E.ITEMS.docs.map((i) => i.kind)).size >= 3, "docs uses ≥3 kinds");
  ok(new Set(E.ITEMS.detective.map((i) => i.kind)).size >= 2, "detective uses ≥2 kinds");
});

section("choice items: one defensible answer, explained distractors", () => {
  for (const it of all.filter((i) => i.kind === "choice")) {
    ok(it.options.filter((o) => o.ok).length === 1, it.id + " exactly one correct");
    ok(new Set(it.options.map((o) => o.text.trim())).size === it.options.length, it.id + " no duplicate options");
    for (const o of it.options) if (!o.ok) ok(o.why && o.why.length > 15, `${it.id} distractor explained: ${o.text}`);
    ok(it.options.length >= 3, it.id + " ≥3 options");
    // the prompt/question never contains the keyed answer verbatim
    const key = it.options.find((o) => o.ok).text.replace(/^\/\/\s*/, "");
    if (key.length >= 6) ok(!(it.question + " " + (it.prompt || "")).includes(key), it.id + " question doesn't reveal answer");
  }
});

section("correct answers are not predictably the longest", () => {
  const choice = all.filter((i) => i.kind === "choice");
  const longest = choice.filter((it) => {
    const L = it.options.map((o) => o.text.length);
    const k = it.options.findIndex((o) => o.ok);
    return L[k] === Math.max(...L) && L.filter((x) => x === L[k]).length === 1;
  });
  const shortest = choice.filter((it) => {
    const L = it.options.map((o) => o.text.length);
    const k = it.options.findIndex((o) => o.ok);
    return L[k] === Math.min(...L);
  });
  const rate = longest.length / choice.length;
  console.log(`    correct answer is the unique longest in ${longest.length}/${choice.length} choice items (${Math.round(rate * 100)}%); shortest in ${shortest.length}`);
  ok(rate <= 0.4, "longest-answer rate ≤ 40%");
  ok(shortest.length >= 5, "the correct answer is sometimes the shortest");
  // repair & builder options too
  const slots = all.filter((i) => i.kind === "build").flatMap((i) => i.slots).filter((s) => !s.options.find((o) => o.ok).omit);
  const slotLongest = slots.filter((s) => {
    const L = s.options.filter((o) => !o.omit).map((o) => o.text.length);
    const k = s.options.find((o) => o.ok).text.length;
    return k === Math.max(...L) && L.filter((x) => x === k).length === 1;
  }).length;
  console.log(`    builder: correct text is the unique longest in ${slotLongest}/${slots.length} non-omit slots`);
  ok(slotLongest / slots.length <= 0.35, "builder longest-answer rate ≤ 35%");
  const choiceNoComment = E.ITEMS.inspector.filter((i) => i.kind === "choice" && i.options.some((o) => /^No new comment/.test(o.text)));
  const noCommentRight = choiceNoComment.filter((i) => i.options.find((o) => /^No new comment/.test(o.text)).ok);
  ok(noCommentRight.length >= 2 && noCommentRight.length < choiceNoComment.length, "“no comment needed” is sometimes right, sometimes a distractor");
});

section("comment editor (repair) items", () => {
  for (const it of all.filter((i) => i.kind === "repair")) {
    const ch = E.instantiate(it, E.makeRng(7));
    ok(ch.selectable.length >= 3, `${it.id} has ≥3 clickable comment lines`);
    ok(ch.selectable.includes(ch.bad), `${it.id} faulty line is clickable`);
    ok(ch.fixes.filter((f) => f.ok).length === 1, `${it.id} one correct repair`);
    ok(new Set(ch.fixes.map(E.fixLabel)).size === ch.fixes.length, `${it.id} unique repairs`);
    for (const f of ch.fixes) if (!f.ok) ok(f.why, `${it.id} wrong repair explained`);
    // the repair must change the faulty line, not code
    const before = it.blocks[0].code.split("\n");
    const after = E.applyRepair(ch, ch.bad, ch.fixAnswer).split("\n");
    const codeOnly = (ls) => ls.filter((l) => !E.commentParts(l) && !/^\s*(\/\*\*|\*\/)\s*$/.test(l));
    ok(JSON.stringify(codeOnly(before)) === JSON.stringify(codeOnly(after)), `${it.id} repair changes only comments`);
    ok(!before.includes(after[ch.bad]) || ch.fixes[ch.fixAnswer].del, `${it.id} repair actually changes the line`);
  }
  const positions = all.filter((i) => i.kind === "repair").map((it) => {
    const ch = E.instantiate(it, E.makeRng(1));
    return ch.selectable.indexOf(ch.bad);
  });
  ok(positions.filter((p) => p === 0).length <= positions.length / 3, "the faulty line is usually not the first comment line");
  const cats = new Set(E.ITEMS.editor.map((i) => i.family));
  for (const c of ["compare", "bound", "param", "ret", "old", "red", "throws"]) ok(cats.has(c), "editor covers " + c);
  ok(E.ITEMS.editor.some((i) => i.fixes.some((f) => f.del && f.ok)), "some repairs are deletions");
});

section("Javadoc builder items", () => {
  const tagOutcomes = { return: new Set(), throws: new Set() };
  const types = new Set();
  for (const it of all.filter((i) => i.kind === "build")) {
    const ch = E.instantiate(it, E.makeRng(3));
    ok(ch.slots[0].tag === "desc", it.id + " starts with a description");
    for (const s of ch.slots) {
      ok(s.options.filter((o) => o.ok).length === 1, `${it.id} ${s.label} one correct`);
      ok(new Set(s.options.map((o) => o.text)).size === s.options.length, `${it.id} ${s.label} unique options`);
      for (const o of s.options) if (!o.ok) ok(o.why, `${it.id} ${s.label} wrong option explained`);
      if (s.tag in tagOutcomes) tagOutcomes[s.tag].add(s.options[s.answer].omit ? "omit" : "include");
    }
    // @param rows: the description must not simply be the parameter name
    for (const s of ch.slots.filter((x) => x.tag === "param"))
      for (const o of s.options.filter((x) => x.ok && !x.omit)) ok(o.text.trim().toLowerCase() !== s.name.toLowerCase(), `${it.id} @param isn't just the name`);
    const sig = it.blocks[0].code.split("\n").find((l) => /\(.*\)\s*\{/.test(l) && !/class/.test(l));
    types.add(sig.match(/(?:static\s+)?(\w+)\s+\w+\(/)[1]);
    if (/\(\)/.test(sig)) types.add("no-params");
    if (/,/.test(sig)) types.add("multi-params");
    if (/throw new/.test(it.blocks[0].code)) types.add("throws");
    if ((it.blocks[0].code.match(/return /g) || []).length > 1) types.add("multi-return");
  }
  for (const t of ["void", "boolean", "int", "double", "String", "no-params", "multi-params", "throws", "multi-return"]) ok(types.has(t), "builder covers " + t);
  ok(tagOutcomes.return.size === 2, "@return is sometimes included, sometimes left out");
  ok(tagOutcomes.throws.size === 2, "@throws is sometimes included, sometimes left out");
});

section("Read the Docs & API Detective items", () => {
  const apis = new Set(all.flatMap((i) => i.docs || []).map((k) => k.split(".")[0]));
  for (const c of ["String", "Math", "ArrayList", "Character", "Integer", "Double"]) ok(apis.has(c), "docs include " + c);
  const keys = new Set(all.flatMap((i) => i.docs || []));
  for (const k of ["String.substring(int,int)", "String.indexOf(String)", "String.charAt", "String.equals", "Math.abs(int)", "Math.max(int,int)", "Math.min(int,int)", "Math.sqrt", "ArrayList.add(E)", "ArrayList.get", "ArrayList.set", "ArrayList.remove(int)", "ArrayList.size"])
    ok(keys.has(k), "required API used: " + k);
  for (const it of all.filter((i) => i.kind === "classify")) {
    ok(it.statements.some((s) => s.g) && it.statements.some((s) => !s.g), it.id + " mixes guaranteed and not");
    for (const s of it.statements) ok(s.why, it.id + " statement explained");
  }
  for (const it of all.filter((i) => i.kind === "docline")) {
    const ch = E.instantiate(it);
    ok(ch.lines.length >= 4, it.id + " has enough lines to choose from");
    ok(it.answer.length < ch.lines.length / 2, it.id + " answer isn't most of the panel");
  }
  for (const it of all.filter((i) => i.kind === "assemble")) {
    const ch = E.instantiate(it, E.makeRng(2));
    const sols = E.solveAssemble(ch);
    ok(sols.length === 1, `${it.id} exactly one valid call (found ${sols.length})`);
    const calls = E.allCalls(ch);
    const outcomes = new Set(calls.map((c) => { const r = E.evaluateCall(ch, c.method, c.args); return !r.compiles ? "compile" : r.throws ? "throws" : "runs"; }));
    ok(outcomes.has("runs") && outcomes.size >= 2, `${it.id} wrong calls fail in different ways`);
  }
  for (const it of all.filter((i) => i.mode === "detective" && i.kind === "choice")) ok(it.docs.length >= 1 && it.jv, it.id + " has docs and JVM checks");
  // docs panels never highlight the answer: no option text marked in docs
  for (const [k, d] of Object.entries(E.DOCS)) ok(!/<mark|\*\*/.test(JSON.stringify(d)), k + " has no emphasis markup");
});

section(`generation: ${N} challenges per mode + Mixed`, () => {
  for (const mode of [...Object.keys(E.MODES), "mixed"]) {
    const rng = E.makeRng(mode.length * 97);
    const picker = E.createPicker(rng);
    const seen = new Set();
    let prevFamily = null, prevMode = null, prevId = null, sameFamily = 0;
    const ans = new Map();
    for (let k = 0; k < N; k++) {
      const ch = E.generate(mode, picker, rng);
      seen.add(ch.id);
      ok(ch.id !== prevId, `${mode}: challenge not repeated back-to-back`);
      prevId = ch.id;
      if (mode !== "mixed") {
        if (ch.family === prevFamily) sameFamily++;
        prevFamily = ch.family;
      } else {
        ok(ch.mode !== prevMode, "mixed: mode not repeated back-to-back");
        prevMode = ch.mode;
      }
      const a = E.answerFor(ch);
      ok(E.assess(ch, a).correct, `${ch.id} keyed answer assesses correct`);
      // a wrong response assesses incorrect
      let wrong;
      if (ch.kind === "choice") wrong = (ch.answer + 1) % ch.options.length;
      else if (ch.kind === "line") wrong = ch.selectable.find((i) => !ch.answer.includes(i)) ?? -1;
      else if (ch.kind === "docline") wrong = ch.lines.find((l) => !ch.answer.includes(l.id)).id;
      else if (ch.kind === "repair") wrong = { line: ch.bad, fix: (ch.fixAnswer + 1) % ch.fixes.length };
      else if (ch.kind === "build") wrong = a.map((x, i) => (i === a.length - 1 ? (x + 1) % ch.slots[i].options.length : x));
      else if (ch.kind === "classify") wrong = a.map((x, i) => (i === 0 ? !x : x));
      else if (ch.kind === "assemble") wrong = { method: a.method, args: a.args.slice().reverse() };
      ok(!E.assess(ch, wrong).correct, `${ch.id} wrong response assesses incorrect`);
      if (ch.kind === "repair") ok(!E.assess(ch, { line: ch.selectable.find((l) => l !== ch.bad), fix: ch.fixAnswer }).correct, `${ch.id} right fix on wrong line is incorrect`);
      if (ch.kind === "choice") ans.set(ch.answer, (ans.get(ch.answer) || 0) + 1);
    }
    if (mode !== "mixed") {
      console.log(`    ${mode}: same family back-to-back in ${sameFamily}/${N} picks`);
      ok(sameFamily / N < 0.05, `${mode}: back-to-back families are rare`);
    }
    const total = mode === "mixed" ? all.length : E.ITEMS[mode].length;
    ok(seen.size === total, `${mode}: every challenge appears (${seen.size}/${total})`);
    if (ans.size) {
      const counts = [...ans.values()];
      ok(Math.min(...counts) / Math.max(...counts) > 0.6, `${mode}: correct option position is balanced ${JSON.stringify([...ans])}`);
    }
  }
});

section("short sessions see genuinely different reasoning", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = E.makeRng(seed);
    const picker = E.createPicker(rng);
    const run = Array.from({ length: 25 }, () => E.generate("mixed", picker, rng));
    ok(new Set(run.map((c) => c.id)).size === 25, `seed ${seed}: no repeated challenge in 25`);
    const fams = new Set(run.map((c) => c.mode + "/" + c.family));
    ok(fams.size >= 20, `seed ${seed}: ≥20 distinct families in 25 (${fams.size})`);
    const modes = run.map((c) => c.mode);
    for (let i = 0; i + 5 <= 25; i += 5) ok(new Set(modes.slice(i, i + 5)).size === 5, `seed ${seed}: each round of 5 covers every mode`);
    for (const m of Object.keys(E.MODES)) {
      const p2 = E.createPicker(rng);
      const pool = E.ITEMS[m].length;
      const focused = Array.from({ length: Math.min(pool, 12) }, () => E.generate(m, p2, rng).id);
      ok(new Set(focused).size === focused.length, `seed ${seed}: focused ${m} has no repeats in first ${focused.length}`);
    }
  }
});

section("session tracker integration (javaGames.session.v1)", () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  const t = createSessionTracker({ storage });
  const g = E.GAME_ID, title = E.docLabGame.name;
  // correct first try
  let id = t.begin(g, title, "inspector", E.MODES.inspector);
  let r = t.submit(id, true);
  ok(r.accepted && r.firstTry, "first-try correct");
  ok(!t.submit(id, true).accepted, "second submission ignored");
  // wrong first try -> revealed (as script.js does)
  id = t.begin(g, title, "docs", E.MODES.docs);
  r = t.submit(id, false);
  ok(r.accepted && !r.firstTry, "wrong submission accepted");
  ok(t.reveal(id), "revealed after wrong");
  ok(!t.submit(id, true).accepted, "no credit after reveal");
  // show answer without submitting
  id = t.begin(g, title, "builder", E.MODES.builder);
  ok(t.reveal(id), "show answer");
  // skip
  id = t.begin(g, title, "detective", E.MODES.detective);
  ok(t.skip(id), "skip");
  const s = t.snapshot();
  const m = s.games[g];
  ok(m.title === "Documentation Lab", "game title");
  ok(m.generated === 4 && m.attempted === 2 && m.firstTry === 1 && m.incorrect === 1 && m.revealed === 2 && m.skipped === 1 && m.afterRetry === 0, "game totals " + JSON.stringify(m));
  ok(m.topics.inspector.firstTry === 1 && m.topics.docs.incorrect === 1 && m.topics.builder.revealed === 1 && m.topics.detective.skipped === 1, "per-mode topics");
  ok(m.topics.docs.title === "Read the Docs", "topic titles are mode names");
  // reload from storage: data validates under the shared schema
  const t2 = createSessionTracker({ storage });
  ok(t2.snapshot().games[g].generated === 4, "session persists and validates");
});

section("API Project Builder retry accounting", () => {
  const store = new Map(), storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  const t = createSessionTracker({ storage }), id = t.begin(E.GAME_ID, E.docLabGame.name, "api-builder", "API Project Builder");
  for (let i = 0; i < 4; i++) {
    const attempt = t.submit(id, false);
    ok(attempt.accepted && attempt.status === "active" && t.status(id) === "active", `incorrect check ${i + 1} keeps the same project open`);
  }
  const solved = t.submit(id, true), snapshot = t.snapshot(), totals = snapshot.games[E.GAME_ID];
  ok(solved.accepted && solved.status === "solved" && solved.submissions === 5, "fifth check can solve one project record");
  ok(totals.generated === 1 && totals.attempted === 1 && totals.incorrect === 4 && totals.afterRetry === 1 && totals.submissions === 5, "retry outcomes remain separated in session totals");
  ok(snapshot.records[id].submissions === 5 && snapshot.records[id].status === "solved", "per-project check count is retained");
  const reveal = t.begin(E.GAME_ID, E.docLabGame.name, "api-builder", "API Project Builder"); t.reveal(reveal);
  const skip = t.begin(E.GAME_ID, E.docLabGame.name, "api-builder", "API Project Builder"); t.skip(skip);
  const finalTotals = t.snapshot().games[E.GAME_ID];
  ok(finalTotals.revealed === 1 && finalTotals.skipped === 1 && finalTotals.afterRetry === 1, "reveal and skip do not count as independent solves");
  ok(createSessionTracker({ storage }).snapshot().games[E.GAME_ID].submissions === 5, "existing session schema remains readable after API retries");
});

console.log(`\n${checks} checks passed.`);
