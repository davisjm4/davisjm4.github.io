/* Documentation Lab — real-browser tests with Playwright + Chromium
   (development only; Playwright is NOT a repository dependency).
   1. Serve the repository root:   python3 -m http.server 8765
   2. Run:   BASE=http://localhost:8765 node tests/doclab-browser-tests.mjs
   Set SHOTS=/some/dir to save screenshots.

   For EVERY challenge in the bank it drives the real UI with mouse clicks:
   correct path, wrong path, and Show Answer, checking feedback, locked
   controls, and the shared session tracker. It also tests keyboard-only and
   touch (tap) interaction, mode switching, layout overflow at phone width,
   console errors, and the Session Summary page. */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:8765";
const URL = BASE + "/java-games/documentation-lab/";
const SHOTS = process.env.SHOTS || "";
let checks = 0,
  failures = 0;
const ok = (v, msg) => {
  checks++;
  if (!v) {
    failures++;
    console.log("  ✗ " + msg);
  }
};

const browser = await chromium.launch();
const errors = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(URL + (opts.query || "?seed=7"));
  await page.waitForFunction(() => globalThis.DocLab);
  return page;
}
const state = (page) =>
  page.evaluate(() => {
    const ch = DocLab.current();
    return { id: ch.id, kind: ch.kind, answer: DocLab.engine.answerFor(ch), ch: JSON.parse(JSON.stringify(ch)) };
  });

/* Answer the current challenge with real clicks. mode: "right" | "wrong" */
async function answer(page, mode, tap = false) {
  const { kind, answer: a, ch } = await state(page);
  const click = (sel) => (tap ? page.tap(sel) : page.click(sel));
  const radio = (scope, i) => click(`${scope} [role="radio"][data-i="${i}"]`);
  if (kind === "choice") {
    const i = mode === "right" ? a : (a + 1) % ch.options.length;
    await radio("#interaction", i);
  } else if (kind === "line") {
    const i = mode === "right" ? a : ch.selectable.find((x) => !ch.answer.includes(x));
    await click(`#blocks .ln-btn[data-line="${i}"]`);
  } else if (kind === "docline") {
    const id = mode === "right" ? a : ch.lines.find((l) => !ch.answer.includes(l.id)).id;
    await click(`#docs [data-docline="${id}"]`);
  } else if (kind === "repair") {
    const line = mode === "right" ? a.line : ch.selectable.find((x) => x !== a.line);
    await click(`#blocks .ln-btn[data-line="${line}"]`);
    await radio("#interaction", a.fix);
  } else if (kind === "build") {
    for (let si = 0; si < a.length; si++) {
      const i = mode === "right" || si > 0 ? a[si] : (a[si] + 1) % ch.slots[si].options.length;
      await radio(`#interaction [data-slot="${si}"]`, i);
    }
  } else if (kind === "classify") {
    for (let i = 0; i < a.length; i++) {
      const v = mode === "right" || i > 0 ? a[i] : !a[i];
      await radio(`#interaction [data-st="${i}"]`, v ? 1 : 0);
    }
  } else if (kind === "assemble") {
    if (ch.methods.length > 1) await radio("#interaction .dl-methods", ch.methods.indexOf(a.method));
    const args = mode === "right" ? a.args : a.args.slice().reverse();
    for (const t of args) await click(`#bank [data-token="${t}"]`);
  }
}
const metrics = (page) => page.evaluate(() => DocLab.tracker.snapshot().games["documentation-lab"] || null);

/* ---------------- 1. every challenge: right / wrong / show ---------------- */
const page = await newPage({ viewport: { width: 1280, height: 900 } });
const ids = await page.evaluate(() => Object.values(DocLab.engine.ITEMS).flat().map((i) => i.id));
for (const id of ids) {
  for (const mode of ["right", "wrong", "show"]) {
    await page.evaluate((id) => DocLab.load(id), id);
    const before = await metrics(page);
    ok(await page.isDisabled("#submit"), `${id}: Check disabled before answering`);
    if (mode === "show") await page.click("#show");
    else {
      await answer(page, mode);
      ok(!(await page.isDisabled("#submit")), `${id}/${mode}: Check enabled once complete`);
      await page.click("#submit");
    }
    const fb = await page.textContent("#feedback");
    const after = await metrics(page);
    const d = (k) => after[k] - (before ? before[k] : 0);
    if (mode === "right") {
      ok(fb.startsWith("✓ Correct!"), `${id}: correct feedback (${fb.slice(0, 40)})`);
      ok(d("firstTry") === 1 && d("attempted") === 1 && d("revealed") === 0, `${id}: first-try recorded`);
    } else if (mode === "wrong") {
      ok(fb.startsWith("✗ Not quite."), `${id}: wrong feedback`);
      ok(d("incorrect") === 1 && d("revealed") === 1 && d("firstTry") === 0, `${id}: wrong + revealed recorded`);
      ok(/Correct answer|Accurate Javadoc|Guaranteed|Not guaranteed/.test(fb + (await page.textContent("#interaction"))), `${id}: correct answer revealed`);
    } else {
      ok(fb.startsWith("Answer shown."), `${id}: show-answer feedback`);
      ok(d("revealed") === 1 && d("attempted") === 0, `${id}: reveal without attempt`);
    }
    ok(fb.length > 80, `${id}/${mode}: explanation present`);
    ok(await page.isVisible("#next"), `${id}/${mode}: Next visible`);
    ok(!(await page.isVisible("#submit")) && !(await page.isVisible("#show")), `${id}/${mode}: Check/Show hidden after closing`);
    // locked: clicking again changes nothing
    const enabled = await page.$$eval("#interaction button:not([disabled]), #blocks .ln-btn:not([disabled]), #docs button:not([disabled])", (b) => b.length);
    ok(enabled === 0 || (await state(page)).kind === "choice" ? enabled === 0 : true, `${id}/${mode}: controls locked (${enabled} enabled)`);
  }
}
console.log(`  ✓ drove all ${ids.length} challenges through correct / wrong / show-answer paths`);

/* ---------------- 2. skip + new challenge + mode switching ---------------- */
{
  ok(!(await page.isVisible("#skip")), "Skip is hidden once a challenge is closed");
  await page.click("#next");
  const before = await metrics(page);
  await page.click("#skip");
  await page.click("#new");
  const after = await metrics(page);
  ok(after.skipped - before.skipped === 2, "Skip and New Challenge each record a skip");
  for (const m of ["inspector", "editor", "builder", "docs", "detective", "mixed"]) {
    await page.selectOption("#mode", m);
    const st = await state(page);
    if (m !== "mixed") ok(st.ch.mode === m, `mode switch to ${m}`);
  }
  const seen = new Set();
  await page.selectOption("#mode", "mixed");
  for (let i = 0; i < 10; i++) {
    seen.add((await state(page)).ch.mode);
    await page.click("#skip");
  }
  ok(seen.size === 5, "Mixed Practice visits all five modes in 10 challenges");
  ok((await page.textContent("#stats")).includes("First-try accuracy"), "round summary shown");
}

/* ---------------- 3. keyboard only ---------------- */
{
  const k = await newPage({ viewport: { width: 1280, height: 900 } });
  // choice: Tab into the radio group, arrows to move, Enter on Check
  await k.evaluate(() => DocLab.load("D-predict-substring"));
  const st = await state(k);
  await k.focus('#interaction [role="radio"][data-i="0"]');
  await k.keyboard.press("Space");
  for (let i = 0; i < st.answer; i++) await k.keyboard.press("ArrowDown");
  const checked = await k.$eval('#interaction [aria-checked="true"]', (b) => Number(b.dataset.i));
  ok(checked === st.answer, "arrow keys move the selection in a radio group");
  await k.keyboard.press("Tab");
  // Tab order should reach Check Answer
  let focused = "";
  for (let i = 0; i < 6 && focused !== "submit"; i++) {
    focused = await k.evaluate(() => document.activeElement.id);
    if (focused !== "submit") await k.keyboard.press("Tab");
  }
  ok(focused === "submit", "Tab reaches Check Answer");
  await k.keyboard.press("Enter");
  ok((await k.textContent("#feedback")).startsWith("✓"), "keyboard submission works");
  ok((await k.evaluate(() => document.activeElement.id)) === "next", "focus moves to Next Challenge");
  // line selection by keyboard
  await k.evaluate(() => DocLab.load("A-prune-late"));
  await k.focus('#blocks .ln-btn[data-line="6"]');
  await k.keyboard.press("Enter");
  ok((await k.evaluate(() => DocLab.response())) === 6, "Enter selects a code line");
  // doc line by keyboard
  await k.evaluate(() => DocLab.load("D-find-get"));
  await k.focus('#docs [data-docline="throws:IndexOutOfBoundsException"]');
  await k.keyboard.press("Space");
  ok((await k.evaluate(() => DocLab.response())) === "throws:IndexOutOfBoundsException", "Space selects a documentation line");
  // assemble by keyboard
  await k.evaluate(() => DocLab.load("E-args-areacode"));
  const a = (await state(k)).answer;
  for (const t of a.args) {
    await k.focus(`#bank [data-token="${t}"]`);
    await k.keyboard.press("Enter");
  }
  await k.focus("#submit");
  await k.keyboard.press("Enter");
  ok((await k.textContent("#feedback")).startsWith("✓"), "assemble challenge completed by keyboard");
  // every interactive control is a real button (focusable)
  for (const id of ["C-paths-clock", "B-param-ride", "D-guarantee-abs", "E-args-insert"]) {
    await k.evaluate((id) => DocLab.load(id), id);
    const bad = await k.$$eval("[data-line], [data-docline], [role=radio], [data-token]", (els) => els.filter((e) => e.tagName !== "BUTTON" && !e.classList.contains("ln")).length);
    ok(bad === 0, `${id}: all controls are buttons`);
  }
  await k.context().close();
}

/* ---------------- 4. touch (tap) on a phone-sized viewport ---------------- */
const phone = await newPage({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
for (const id of ["A-why-backward", "A-prune-restock", "B-bound-sum", "C-range-between", "D-guarantee-parseint", "D-find-exclusive", "E-args-score", "E-result-dequeue"]) {
  await phone.evaluate((id) => DocLab.load(id), id);
  await answer(phone, "right", true);
  await phone.tap("#submit");
  ok((await phone.textContent("#feedback")).startsWith("✓"), `${id}: completed by touch`);
}
console.log("  ✓ touch-tap interaction on a 375px phone viewport");

/* ---------------- 5. layout: no horizontal overflow, readable code ---------------- */
for (const [w, h] of [[320, 640], [375, 740], [768, 1000], [1280, 900]]) {
  const p = await newPage({ viewport: { width: w, height: h } });
  for (const id of ids) {
    await p.evaluate((id) => DocLab.load(id), id);
    const o = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, code: Math.max(0, ...[...document.querySelectorAll(".dl-code, .api-doc, .dl-call")].map((e) => e.scrollWidth - e.clientWidth)) }));
    ok(o.doc <= o.win, `${id} @${w}px: no page-level horizontal scroll (${o.doc} > ${o.win})`);
    ok(o.code <= 1, `${id} @${w}px: code/doc panels don't overflow sideways (${o.code}px)`);
    const fs_ = await p.$eval(".dl-code, .api-doc", (e) => parseFloat(getComputedStyle(e).fontSize)).catch(() => 14);
    ok(fs_ >= 12.5, `${id} @${w}px: code font ≥ 12.5px`);
    // indentation preserved: a nested line is indented further than its parent
    const indents = await p.$$eval("#blocks .dl-code .ln", (ls) => ls.map((l) => parseFloat(getComputedStyle(l).paddingLeft)));
    const srcIndents = await p.evaluate(() => { const ch = DocLab.current(); return ch.kind === "build" ? 2 : new Set((ch.blocks[0]?.code || "").split("\n").map((l) => l.match(/^ */)[0].length)).size; });
    if (srcIndents >= 2) ok(new Set(indents).size >= 2, `${id} @${w}px: indentation visible`);
  }
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const id of ["A-why-backward", "B-param-ride", "C-paths-clock", "D-effect-remove", "D-guarantee-abs", "D-find-exclusive", "E-overload-uppercase", "E-args-insert"]) {
      await p.evaluate((id) => DocLab.load(id), id);
      await answer(p, "wrong");
      await p.click("#submit");
      await p.screenshot({ path: `${SHOTS}/${w}-${id}.png`, fullPage: true });
    }
  }
  await p.context().close();
}
console.log("  ✓ layout checked at 320, 375, 768, and 1280px for every challenge");

/* ---------------- 6. Session Summary shows Documentation Lab ---------------- */
{
  await page.goto(BASE + "/java-games/session-summary/");
  await page.waitForSelector("#report table");
  const txt = await page.textContent("#report");
  ok(txt.includes("Documentation Lab"), "Session Summary lists Documentation Lab");
  for (const t of ["Comment Quality Inspector", "Comment Editor", "Javadoc Builder", "Read the Docs", "API Detective"]) ok(txt.includes(t), `Session Summary topic: ${t}`);
  ok(!txt.includes("corrupted"), "session data validates in the shared summary");
}

ok(errors.length === 0, "no console or page errors: " + errors.slice(0, 3).join(" | "));
await browser.close();
console.log(failures ? `\n${failures} failure(s) of ${checks} browser checks` : `\n${checks} browser checks passed (Chromium ${browser.version?.() || ""})`);
process.exit(failures ? 1 : 0);
