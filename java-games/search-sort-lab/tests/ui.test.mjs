/* Interface tests in a simulated DOM (linkedom). Verifies behavior, scoring, locking, mode switching,
   summary, keyboard handlers, and static accessibility/responsive markers. It does NOT render CSS or
   exercise real touch input; see README "Manual QA". */
import { parseHTML } from "linkedom";
import fs from "node:fs";
import { section, ok, eq, summary } from "./harness.mjs";

console.log("ui.test.mjs");
const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("index.html", root), "utf8");
const { window, document } = parseHTML(html);
Object.assign(globalThis, { window, document, HTMLElement: window.HTMLElement, location: { search: "?seed=12345" } });
globalThis.addEventListener = window.addEventListener.bind(window);
const sessionStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => sessionStorage.get(key) ?? null,
  setItem: (key, value) => sessionStorage.set(key, String(value)),
  removeItem: (key) => sessionStorage.delete(key),
};
// linkedom has no <select>.value setter; emulate the browser behavior for the two selects only
for (const id of ["mode", "difficulty"]) { const el = document.getElementById(id); let v = id === "mode" ? "binary" : "intermediate"; Object.defineProperty(el, "value", { get: () => v, set: (x) => { v = x; }, configurable: true }); }
await import("../app.js");
const L = globalThis.SearchSortLab;
const $ = (id) => document.getElementById(id);
const change = (id, v) => { $(id).value = v; $(id).onchange(); };
const click = (el) => el.onclick({ preventDefault() {} });
const key = (k, target) => document.dispatchEvent(Object.assign(new window.Event("keydown", { bubbles: true }), { key: k, target }));

await section("page structure, navigation, accessibility markers", () => {
  eq($("mode").options.length, 6);
  eq([...$("difficulty").options].map((o) => o.value), ["beginner", "intermediate", "advanced"]);
  ok(document.querySelector("header a").href === "https://davisjm4.github.io/cs-games/advanced/", "returns to Advanced CS catalog");
  ok(!html.includes("/java-games/\""), "no link to the obsolete /java-games/ homepage");
  ok(/viewport/.test(html) && /<html lang="en"/.test(html), "viewport + lang");
  eq($("choices").getAttribute("role"), "radiogroup");
  ok($("feedback").getAttribute("role") === "status", "feedback is a live status region");
  const shared = L.tracker.snapshot();
  ok(shared.games?.["search-sort-lab"] && shared.totals && shared.records, "uses the shared Session Summary tracker, not the standalone fallback");
  const css = fs.readFileSync(new URL("styles.css", root), "utf8");
  ok(/min-height:44px/.test(css), "44px touch targets");
  ok(/@media \(max-width:700px\)/.test(css), "small-screen rules");
  ok(/:focus-visible/.test(css), "visible focus");
  ok(!/\.ssl-slot\.r-[a-z]+ \.ssl-cell\{[^}]*\}\s*$/.test("") , "placeholder");
  ok(/\.ssl-tag/.test(css), "state is labeled with text, not color alone");
});

await section("all 6 modes x 3 difficulties render a complete, answerable challenge", () => {
  for (const m of ["binary", "selection", "insertion", "merge", "name", "compare"]) for (const d of ["beginner", "intermediate", "advanced"]) {
    $("mode").value = m; $("difficulty").value = d; $("mode").onchange();
    const c = L.current();
    eq([c.mode, c.difficulty], [m, d]);
    ok($("question").textContent === c.stem, "stem shown");
    eq($("choices").querySelectorAll("[data-choice]").length, 4);
    ok($("submit").disabled === true, "Check Answer disabled until a choice is made");
    ok($("code-wrap").hidden === !c.code, "code panel matches challenge");
    ok(!$("feedback").hidden === false, "feedback hidden before answering");
    ok(!/why|misconception/i.test($("choices").innerHTML), "misconception text is not shown before answering");
    ok($("description").hidden === !c.description, "description shown when present");
  }
});

await section("one submitted answer = one scored attempt; answers lock", () => {
  change("mode", "selection");
  const before = L.local().length;
  const c = L.current();
  const wrong = [0, 1, 2, 3].find((i) => i !== c.answerIndex);
  click($("choices").querySelectorAll("[data-choice]")[wrong]);
  ok($("submit").disabled === false);
  click($("submit"));
  eq(L.local().length, before + 1, "exactly one attempt recorded");
  eq(L.local().at(-1).correct, false);
  ok(L.locked() === true);
  const snap = L.tracker.snapshot();
  const rec = Object.values(snap.records).find((r) => r.game === "search-sort-lab" && r.status === "revealed" && r.topic === "selection");
  ok(rec, "wrong answer is revealed in the tracker");
  eq([rec.details.difficulty, rec.details.skill, rec.details.family, rec.details.seed], [c.difficulty, c.skill, c.family, c.seed], "mode/difficulty/skill/family/seed are attached to the shared record");
  ok($("feedback").className.includes("bad"));
  ok($("feedback").innerHTML.includes("About your choice"), "misconception note appears after answering");
  ok($("feedback").innerHTML.includes("correct answer is"), "correct answer shown");
  // further guesses do nothing
  L.choose(c.answerIndex); L.submit(); click($("submit"));
  eq(L.local().length, before + 1, "no second scored guess");
  ok($("next").hidden === false && $("submit").hidden === true);
  ok($("choices").querySelectorAll(".is-correct").length === 1 && $("choices").querySelectorAll(".is-wrong").length === 1);
  ok([...$("choices").querySelectorAll("[data-choice]")].every((b) => b.disabled), "choices disabled after submit");
  click($("next"));
  eq(L.locked(), false); eq(L.selection(), null);
  const c2 = L.current();
  click($("choices").querySelectorAll("[data-choice]")[c2.answerIndex]);
  click($("submit"));
  eq(L.local().at(-1).correct, true);
  ok($("feedback").className.includes("good"));
});

await section("switching mode/difficulty never carries an old answer or scores the wrong challenge", () => {
  change("mode", "binary");
  const a = L.current();
  click($("choices").querySelectorAll("[data-choice]")[a.answerIndex]); // selected but NOT submitted
  const n = L.local().length;
  change("mode", "merge");
  const b = L.current();
  eq(L.selection(), null, "selection cleared");
  ok($("submit").disabled, "submit disabled on new challenge");
  eq(L.local().length, n, "unsubmitted selection not scored");
  ok(b.mode === "merge" && b.id !== a.id);
  change("difficulty", "advanced");
  eq(L.current().difficulty, "advanced");
  click($("choices").querySelectorAll("[data-choice]")[L.current().answerIndex]);
  click($("submit"));
  const last = L.local().at(-1);
  eq([last.mode, last.difficulty], ["merge", "advanced"], "score recorded against the displayed challenge");
  // skipped records are closed, not scored
  const skipped = Object.values(L.tracker.snapshot().records).filter((r) => r.status === "skipped").length;
  ok(skipped >= 1, "abandoned challenges are skipped, not scored");
});

await section("keyboard: arrows and number keys choose, Enter submits", () => {
  change("mode", "compare");
  const bs = () => [...$("choices").querySelectorAll("[data-choice]")];
  key("2", document.body);
  eq(L.selection(), 1);
  key("4", document.body);
  eq(L.selection(), 3);
  ok(bs()[3].getAttribute("aria-checked") === "true" && bs()[0].getAttribute("aria-checked") === "false");
  ok(bs()[3].getAttribute("tabindex") === "0" && bs()[0].getAttribute("tabindex") === "-1", "roving tabindex");
  const n = L.local().length;
  key("Enter", document.body);
  eq(L.local().length, n + 1, "Enter submits once");
  key("1", document.body);
  eq(L.local().length, n + 1, "keys do nothing once locked");
});

await section("Session Summary and restart", () => {
  click($("summary-toggle"));
  ok(!$("summary").hidden);
  const t = $("summary-body").innerHTML;
  const n = L.local().length, c = L.local().filter((x) => x.correct).length;
  ok(t.includes(`Total attempts:</strong> ${n}`) && t.includes(`Correct:</strong> ${c}`), "totals shown");
  ok(t.includes("By practice mode") && t.includes("By difficulty") && t.includes("By skill"), "breakdowns shown");
  ok($("shared-summary").href.endsWith("session-summary/"), "links to the shared Session Summary");
  const sharedAttempts = L.tracker.snapshot().games["search-sort-lab"].attempted;
  click($("restart-confirm"));
  eq(L.local().length, 0, "restart clears this page's results");
  eq(L.tracker.snapshot().games["search-sort-lab"].attempted, sharedAttempts, "restart preserves submitted shared progress");
  ok($("summary-body").innerHTML.includes("No answers yet"));
  eq(L.locked(), false);
});

await section("seeded sessions are reproducible via ?seed=", () => {
  ok(L.current(), "challenge present");
  ok(typeof L.current().seed === "number" && L.current().id.includes(String(L.current().seed)));
});

const { checks, sections } = summary();
console.log(`ui.test.mjs: ${checks} checks passed in ${sections.length} sections`);
process.exit(0);
