/* Inheritance & Polymorphism Lab — real-browser tests (Playwright + Chromium;
   development only, Playwright is NOT a repository dependency).
   1. Serve the repository root:   python3 -m http.server 8765
   2. Run:   BASE=http://localhost:8765 node tests/iplab-browser-tests.mjs
   Set SHOTS=/some/dir to save screenshots.

   Drives EVERY challenge through the real UI with clicks (correct path, wrong
   path, Show Answer), checks feedback, locking, and the shared session
   tracker; then keyboard-only play, touch taps at phone size, layout at
   320–1280px, the diagram's drawn arrows, and the Session Summary page. */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:8765";
const URL = BASE + "/java-games/inheritance-polymorphism-lab/";
const SHOTS = process.env.SHOTS || "";
let checks = 0,
  failures = 0;
const ok = (v, msg) => {
  checks++;
  if (!v) {
    failures++;
    if (failures < 60) console.log("  ✗ " + msg);
  }
};
const browser = await chromium.launch();
const errors = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(URL + "?seed=5");
  await page.waitForFunction(() => globalThis.IPLab);
  return page;
}
const state = (page) => page.evaluate(() => { const ch = IPLab.current(); return { ch: JSON.parse(JSON.stringify(ch)), a: IPLab.engine.answerFor(ch) }; });
const metrics = (page) => page.evaluate(() => IPLab.tracker.snapshot().games["inheritance-polymorphism-lab"] || null);

async function answer(page, mode, tap = false) {
  const { ch, a } = await state(page);
  const click = (sel) => (tap ? page.tap(sel) : page.click(sel));
  const radio = (scope, i) => click(`${scope} [role="radio"][data-i="${i}"]`);
  const W = mode === "wrong";
  switch (ch.kind) {
    case "choice":
      return radio("#interaction", W ? (a + 1) % ch.options.length : a);
    case "line":
      return click(`#blocks .ln-btn[data-line="${W ? ch.blocks[0].selectable.find((l) => !ch.answer.includes(l)) : a}"]`);
    case "box":
      return click(`#visual .cls-box[data-cls="${W ? ch.diagram.find((c) => c.name !== a).name : a}"]`);
    case "multi": {
      const pickSet = W ? [ch.options.find((o) => !a.includes(o))] : a;
      for (const o of pickSet) await click(`#interaction .ip-toggle[data-i="${ch.options.indexOf(o)}"]`);
      return;
    }
    case "connect":
      for (const [c, p] of Object.entries(a)) {
        const v = W && c === ch.classes[0] ? (p ? "" : ch.classes[1]) : p || "";
        await page.selectOption(`#visual select[data-ext="${c}"]`, v);
      }
      return;
    case "rows":
      for (let i = 0; i < a.length; i++) await radio(`#interaction [data-row="${i}"]`, W && i === 0 ? (a[0] + 1) % ch.rows[0].options.length : a[i]);
      return;
    case "sequence": {
      const order = W ? a.order.slice().reverse() : a.order;
      const seq = W && order.length === 1 ? [ch.chips.find((c) => c.id !== a.order[0]).id] : order;
      for (const id of seq) await click(`#bank [data-id="${id}"]`);
      if (a.output != null) await radio("#interaction .ip-outputs", a.output);
      return;
    }
    case "trace": {
      await radio("#interaction .ip-compiler", a.compiler);
      const impl = W ? ch.object.layers.flatMap((L) => L.methods).find((m) => m.id !== a.impl).id : a.impl;
      await click(`#visual [data-impl="${impl}"]`);
      return radio("#interaction .ip-outputs", a.output);
    }
    case "header": {
      const groups = ["access", "ret", "params"];
      for (let g = 0; g < 3; g++) {
        let v = a[groups[g]];
        if (W && g === 2) v = ch.segments.params.findIndex((p) => JSON.stringify(p.types) !== JSON.stringify(ch.required.types));
        const target = page.locator(`#interaction [role="radiogroup"]`).nth(g).locator(`[data-i="${v}"]`);
        await (tap ? target.tap() : target.click());
      }
      return;
    }
    case "debug":
      if (ch.askOutcome) await radio("#interaction .ip-outcome", a.outcome);
      await click(`#blocks .ln-btn[data-line="${a.line}"]`);
      return radio("#interaction .ip-fixes", W ? ch.fixes.findIndex((f) => !f.ok) : a.fix);
  }
}

/* -------- 1. every challenge: right / wrong / show -------- */
const page = await newPage({ viewport: { width: 1280, height: 900 } });
const ids = await page.evaluate(() => IPLab.engine.ITEMS.map((i) => i.id));
for (const id of ids)
  for (const mode of ["right", "wrong", "show"]) {
    await page.evaluate((id) => IPLab.load(id), id);
    const before = await metrics(page);
    ok(await page.isDisabled("#submit"), `${id}: Check disabled before answering`);
    if (mode === "show") await page.click("#show");
    else {
      await answer(page, mode);
      ok(!(await page.isDisabled("#submit")), `${id}/${mode}: Check enabled when complete`);
      await page.click("#submit");
    }
    const fb = (await page.textContent("#feedback")) || "";
    const after = await metrics(page);
    const d = (k) => after[k] - (before ? before[k] : 0);
    if (mode === "right") ok(fb.startsWith("✓ Correct!") && d("firstTry") === 1 && d("revealed") === 0, `${id}: correct path (${fb.slice(0, 50)})`);
    else if (mode === "wrong") ok(fb.startsWith("✗ Not quite.") && d("incorrect") === 1 && d("revealed") === 1 && d("firstTry") === 0, `${id}: wrong path recorded and revealed`);
    else ok(fb.startsWith("Answer shown.") && d("revealed") === 1 && d("attempted") === 0, `${id}: show answer recorded as revealed`);
    ok(fb.length > 80, `${id}/${mode}: explanation shown`);
    ok((await page.isVisible("#next")) && !(await page.isVisible("#submit")) && !(await page.isVisible("#skip")), `${id}/${mode}: only Next remains`);
    const live = await page.$$eval("#interaction button:not([disabled]):not(.ip-small), #blocks .ln-btn:not([disabled]), #visual button:not([disabled]), #visual select:not([disabled])", (b) => b.length);
    ok(live === 0, `${id}/${mode}: answer controls locked (${live} still enabled)`);
  }
console.log(`  ✓ drove all ${ids.length} challenges through correct / wrong / show-answer`);

/* -------- 2. skip, new, mode switching, Mixed balance -------- */
{
  await page.click("#next");
  const before = await metrics(page);
  await page.click("#skip");
  await page.click("#new");
  ok((await metrics(page)).skipped - before.skipped === 2, "Skip and New Challenge record skips");
  for (const m of ["hierarchy", "override", "tracer", "abstract", "debug"]) {
    await page.selectOption("#mode", m);
    ok((await state(page)).ch.mode === m, "mode switch " + m);
  }
  await page.selectOption("#mode", "mixed");
  const seen = [];
  for (let i = 0; i < 10; i++) {
    seen.push((await state(page)).ch.mode);
    await page.click("#skip");
  }
  ok(new Set(seen).size === 5 && seen.every((m, i) => i === 0 || m !== seen[i - 1]), "Mixed Practice: all five modes within 10 challenges, never the same mode twice in a row");
}

/* -------- 3. keyboard only -------- */
{
  const k = await newPage({ viewport: { width: 1280, height: 900 } });
  await k.evaluate(() => IPLab.load("C-identify-exit"));
  const { a } = await state(k);
  await k.focus('#interaction .ip-compiler [data-i="0"]');
  await k.keyboard.press("Space");
  for (let i = 0; i < a.compiler; i++) await k.keyboard.press("ArrowRight");
  await k.focus(`#visual [data-impl="${a.impl}"]`);
  await k.keyboard.press("Enter");
  await k.focus('#interaction .ip-outputs [data-i="0"]');
  await k.keyboard.press("Space");
  for (let i = 0; i < a.output; i++) await k.keyboard.press("ArrowRight");
  await k.focus("#submit");
  await k.keyboard.press("Enter");
  ok((await k.textContent("#feedback")).startsWith("✓"), "trace challenge completed by keyboard (arrows, Enter, Space)");
  ok((await k.evaluate(() => document.activeElement.id)) === "next", "focus moves to Next");
  await k.evaluate(() => IPLab.load("A-connect-messages"));
  const c = await state(k);
  for (const [cls, p] of Object.entries(c.a)) {
    await k.focus(`#visual select[data-ext="${cls}"]`);
    await k.selectOption(`#visual select[data-ext="${cls}"]`, p || "");
  }
  ok(!(await k.isDisabled("#submit")), "hierarchy builder usable with native selects");
  await k.evaluate(() => IPLab.load("A-supplier-devices"));
  const s = await state(k);
  await k.focus(`#visual .cls-box[data-cls="${s.a}"]`);
  await k.keyboard.press("Enter");
  ok((await k.evaluate(() => IPLab.response())) === s.a, "class boxes are keyboard-selectable");
  await k.evaluate(() => IPLab.load("B-super-director"));
  const q = await state(k);
  for (const id of q.a.order) {
    await k.focus(`#bank [data-id="${id}"]`);
    await k.keyboard.press("Enter");
  }
  ok(JSON.stringify((await k.evaluate(() => IPLab.response())).order) === JSON.stringify(q.a.order), "sequence built by keyboard");
  await k.context().close();
}

/* -------- 4. touch on a phone -------- */
const phone = await newPage({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
for (const id of ["A-supplier-instruments", "A-has-fern", "B-runs-private", "B-super-gift", "C-swap-tiles", "C-identify-bike", "C-ctor-highschool", "D-header-formatter", "D-implement-crypto", "E-expect-static", "E-fixes-school"]) {
  await phone.evaluate((id) => IPLab.load(id), id);
  await answer(phone, "right", true);
  await phone.tap("#submit");
  ok((await phone.textContent("#feedback")).startsWith("✓"), `${id}: completed by touch`);
}
console.log("  ✓ touch interaction on a 375px phone");

/* -------- 5. layout + diagrams -------- */
for (const [w, h] of [[320, 640], [375, 740], [768, 1000], [1280, 900]]) {
  const p = await newPage({ viewport: { width: w, height: h } });
  for (const id of ids) {
    await p.evaluate((id) => IPLab.load(id), id);
    await p.waitForTimeout(20);
    const o = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, over: Math.max(0, ...[...document.querySelectorAll(".ip-code, .diagram, .objview, .ip-rows, .ip-radios")].map((e) => e.scrollWidth - e.clientWidth)) }));
    ok(o.doc <= o.win, `${id} @${w}px: no page-level sideways scroll (${o.doc} > ${o.win})`);
    ok(o.over <= 1, `${id} @${w}px: panels don't overflow (${o.over}px)`);
    const fsz = await p.$eval(".ip-code", (e) => parseFloat(getComputedStyle(e).fontSize)).catch(() => 14);
    ok(fsz >= 12.5, `${id} @${w}px: code font ≥ 12.5px`);
    const ch = (await state(p)).ch;
    if (ch.diagram && ch.kind !== "connect") {
      await p.waitForTimeout(60);
      const edges = await p.$$eval("#visual .diagram svg > path", (x) => x.length);
      const want = ch.diagram.filter((c) => c.ext).length;
      ok(edges === want, `${id} @${w}px: diagram draws one arrow per extends (${edges}/${want})`);
      const lap = await p.$$eval("#visual .cls-box", (bs) => { const r = bs.map((b) => b.getBoundingClientRect()); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (r[i].left < r[j].right - 1 && r[j].left < r[i].right - 1 && r[i].top < r[j].bottom - 1 && r[j].top < r[i].bottom - 1) return true; return false; });
      ok(!lap, `${id} @${w}px: class boxes don't overlap`);
    }
  }
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const id of ["A-connect-payroll", "A-supplier-devices", "A-isa-payroll", "B-classify-lamp", "B-super-director", "C-identify-exit", "C-swap-devices", "C-compiles-doorcam", "D-header-booking", "D-implement-crypto", "E-signature-thermostat", "E-fixes-drone"]) {
      await p.evaluate((id) => IPLab.load(id), id);
      await answer(p, "wrong");
      await p.click("#submit");
      await p.waitForTimeout(80);
      await p.screenshot({ path: `${SHOTS}/${w}-${id}.png`, fullPage: true });
    }
  }
  await p.context().close();
}
console.log("  ✓ layout checked at 320, 375, 768, 1280px for every challenge");

/* -------- 6. Session Summary -------- */
{
  await page.goto(BASE + "/java-games/session-summary/");
  await page.waitForSelector("#report table");
  const txt = await page.textContent("#report");
  ok(txt.includes("Inheritance & Polymorphism Lab"), "Session Summary lists the game");
  for (const t of ["Class Hierarchy Builder", "Method Override Inspector", "Polymorphism Tracer", "Abstract Class Workshop", "Inheritance Debugger"]) ok(txt.includes(t), "Summary topic " + t);
  ok(!/corrupted/i.test(txt), "session data validates in the shared summary");
}
ok(errors.length === 0, "no console/page errors: " + errors.slice(0, 3).join(" | "));
await browser.close();
console.log(failures ? `\n${failures} failure(s) of ${checks} browser checks` : `\n${checks} browser checks passed`);
process.exit(failures ? 1 : 0);
