/* Loop Lab — Chromium browser test (puppeteer-core).
 * Serves a temporary site root containing ../style.css and ../session.js from the repo's java-games folder.
 * Usage: JAVA_GAMES_DIR=/path/to/repo/java-games CHROME_PATH=/path/to/chrome node tests/browser.test.mjs
 *        (PUPPETEER_CORE_PATH may point at a puppeteer-core install if it is not resolvable.)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";

const here = path.dirname(new URL(import.meta.url).pathname), lab = path.resolve(here, "..");
const gamesDir = process.env.JAVA_GAMES_DIR || path.resolve(lab, "..");
const require = createRequire(import.meta.url);
let puppeteer; try { puppeteer = require(process.env.PUPPETEER_CORE_PATH || "puppeteer-core"); } catch { console.log("SKIPPED: puppeteer-core not found (npm install puppeteer-core, or set PUPPETEER_CORE_PATH)."); process.exit(0); }
const cacheDirs = [path.join(os.homedir(), ".cache/puppeteer/chrome"), "/home/claude/.cache/puppeteer/chrome"].filter((d) => fs.existsSync(d));
const chromeCandidates = [process.env.CHROME_PATH, "/usr/bin/chromium", "/usr/bin/google-chrome", ...cacheDirs.flatMap((dir) => fs.readdirSync(dir).map((n) => path.join(dir, n, "chrome-linux64/chrome")))].filter(Boolean);
const chrome = chromeCandidates.find((c) => { try { return fs.existsSync(c); } catch { return false; } });
if (!chrome) { console.log("SKIPPED: no Chrome/Chromium found (set CHROME_PATH)."); process.exit(0); }
for (const f of ["style.css", "session.js"]) if (!fs.existsSync(path.join(gamesDir, f))) { console.log(`SKIPPED: ${f} not found in ${gamesDir} (set JAVA_GAMES_DIR to the repo's java-games folder).`); process.exit(0); }

// temp site: /java-games/{style.css,session.js,loop-lab/...}
const root = fs.mkdtempSync(path.join(os.tmpdir(), "loop-site-")), jg = path.join(root, "java-games");
fs.mkdirSync(jg, { recursive: true });
for (const f of ["style.css", "session.js"]) fs.copyFileSync(path.join(gamesDir, f), path.join(jg, f));
// java-games/style.css imports the site-wide /csp-games/style.css; copy it when the repo has it
const siteCss = path.join(gamesDir, "..", "csp-games", "style.css");
if (fs.existsSync(siteCss)) { fs.mkdirSync(path.join(root, "csp-games"), { recursive: true }); fs.copyFileSync(siteCss, path.join(root, "csp-games", "style.css")); }
fs.cpSync(lab, path.join(jg, "loop-lab"), { recursive: true, filter: (src) => !/node_modules|\/reports|\/legacy/.test(src) });
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname); let f = path.join(root, u); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html"); if (!fs.existsSync(f)) { res.writeHead(404); return res.end("nf"); } res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/java-games/loop-lab/`;
let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; };
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });
const errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400 && !/favicon|session-summary/.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  const press = async (sel, how = "click") => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await page.$eval(sel, (e) => e.scrollIntoView({ block: "center" })); return await (how === "tap" ? page.tap(sel) : page.click(sel)); }
      catch (e) { if (attempt === 2 || !/not clickable|not an Element|detached/i.test(String(e.message))) throw e; await new Promise((r) => setTimeout(r, 100)); }
    }
  };
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(base + "?test=1", { waitUntil: "networkidle0" });
  await page.waitForSelector("#choices [role=radio]");
  ok((await page.$eval("h1", (e) => e.textContent)) === "Loop Lab", "heading");
  const modeOpts = await page.$$eval("#mode option", (os) => os.map((o) => o.value));
  ok(modeOpts.length === 11 && modeOpts.includes("algorithms") && modeOpts.includes("executions") && modeOpts[0] === "mixed", "mode selector: Mixed + 8 original + 2 new");
  ok((await page.$$eval("#difficulty option", (os) => os.length)) === 3, "three difficulty options");
  ok(await page.$("a[data-session-link]"), "Session Summary link present");
  const sessionSubs = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem("javaGames.session.v1") || "null"); return s?.games?.["loop-lab"] || null; });
  const q = () => page.evaluate(() => { const c = window.__loopLab.q; return { prompt: c.prompt, answer: c.answer, choices: c.choices, mode: c.mode, difficulty: c.difficulty, code: c.code, choiceFormat: c.choiceFormat }; });
  // every mode × difficulty renders correctly
  for (const mode of modeOpts) for (const d of ["beginner", "intermediate", "advanced"]) {
    await page.select("#difficulty", d); await page.select("#mode", mode);
    const cur = await q();
    if (mode !== "mixed") ok(cur.mode === mode, `${mode}: rendered challenge belongs to mode`);
    ok(cur.difficulty === d || !["algorithms", "executions"].includes(mode), "difficulty honored");
    const shown = await page.$eval(".loop-snippet code", (e) => e.textContent);
    ok(shown === cur.code, "code shown verbatim (escaped correctly)");
    ok(shown.includes("\n") || shown.startsWith("// Goal"), "code keeps line breaks");
    const radios = await page.$$eval("#choices [role=radio]", (bs) => bs.map((b) => ({ checked: b.getAttribute("aria-checked"), pressed: b.hasAttribute("aria-pressed"), text: b.querySelector(".choice-text").textContent })));
    ok(radios.length === 4 && radios.every((r) => r.checked === "false" && !r.pressed), "four radios, valid ARIA");
    ok(JSON.stringify(radios.map((r) => r.text)) === JSON.stringify(cur.choices), "choice text matches");
    ok(await page.$eval("#check", (b) => b.disabled), "Check disabled before selection");
  }
  // wrong answer: one scored attempt, lock, misconception note, trace
  await page.select("#mode", "executions"); await page.select("#difficulty", "beginner");
  for (let i = 0; i < 30 && !(await page.evaluate(() => !!window.__loopLab.q.trace)); i++) await press("#new");
  ok(await page.evaluate(() => !!window.__loopLab.q.trace), "found a challenge with a trace");
  const before = (await sessionSubs())?.submissions || 0;
  let cur = await q(); let wrongIdx = cur.choices.findIndex((c) => c !== cur.answer);
  await press(`#choices [data-index="${wrongIdx}"]`);
  ok((await page.$eval(`#choices [data-index="${wrongIdx}"]`, (b) => b.getAttribute("aria-checked"))) === "true", "selection sets aria-checked");
  await press("#check"); await press("#check").catch(() => {});
  const after = await sessionSubs();
  ok(after.submissions === before + 1, "exactly one scored submission per challenge");
  ok(after.revealed >= 1, "wrong answer recorded as revealed");
  ok(await page.$eval("#feedback", (f) => !f.hidden && f.classList.contains("bad")), "feedback shown");
  ok(await page.$(".misconception"), "misconception note shown for the chosen distractor");
  ok(await page.$(".loop-trace table"), "trace table shown after submission");
  ok(await page.$$eval("#choices [role=radio]", (bs) => bs.every((b) => b.disabled)), "choices locked after submission");
  ok(await page.$eval(".correct-answer .choice-text", (e) => e.textContent) === cur.answer, "correct choice highlighted");
  // correct answer path
  await press("#next"); cur = await q();
  await press(`#choices [data-index="${cur.choices.indexOf(cur.answer)}"]`); await press("#check");
  ok(await page.$eval("#feedback", (f) => f.classList.contains("good")), "correct answer graded correct");
  ok((await sessionSubs()).firstTry >= 1, "first-try success recorded");
  // skip: moving on without answering counts as skipped
  await press("#next"); const skippedBefore = (await sessionSubs()).skipped; await press("#next");
  ok((await sessionSubs()).skipped === skippedBefore + 1, "unanswered challenge recorded as skipped");
  // keyboard: arrow keys move selection; Enter on Check submits
  cur = await q();
  await page.focus('#choices [data-index="0"]'); await page.keyboard.press("ArrowDown");
  ok((await page.$eval('#choices [data-index="1"]', (b) => b.getAttribute("aria-checked"))) === "true", "ArrowDown selects next choice");
  ok((await page.evaluate(() => document.activeElement.dataset.index)) === "1", "focus follows selection");
  await page.focus("#check"); await page.keyboard.press("Enter");
  ok(await page.$eval("#feedback", (f) => !f.hidden), "keyboard submission works");
  // mobile: no horizontal page overflow across many challenges, incl. code-choice and nested output
  await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
  for (const [mode, d] of [["choose", "advanced"], ["executions", "advanced"], ["algorithms", "advanced"], ["nested", "intermediate"], ["debug", "advanced"], ["components", "advanced"]]) {
    await page.select("#difficulty", d); await page.select("#mode", mode);
    for (let i = 0; i < 8; i++) {
      const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      ok(w.sw <= w.iw + 1, `${mode}/${d}: no horizontal page overflow on a phone (${w.sw} > ${w.iw})`);
      const c = await q(); await press(`#choices [data-index="${c.choices.indexOf(c.answer)}"]`, "tap"); await press("#check", "tap");
      const w2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      ok(w2.sw <= w2.iw + 1, `${mode}/${d}: feedback and trace fit on a phone`);
      await press("#next", "tap");
    }
  }
  // persistence: reload keeps the session totals
  const totals = await sessionSubs(); await page.reload({ waitUntil: "networkidle0" });
  const reloaded = await sessionSubs();
  ok(reloaded.submissions === totals.submissions && reloaded.firstTry === totals.firstTry, "session totals persist across reload");
  ok(errors.length === 0, "no page errors, console errors, or failed requests: " + errors.join(" | "));
} finally { await browser.close(); server.close(); fs.rmSync(root, { recursive: true, force: true }); }
const v = (await import("node:child_process")).execFileSync(chrome, ["--version"], { encoding: "utf8" }).trim();
fs.mkdirSync(path.join(lab, "reports"), { recursive: true });
fs.writeFileSync(path.join(lab, "reports/browser-results.json"), JSON.stringify({ browser: v, checks }, null, 1));
console.log(`Loop Lab browser (${v}): ${checks} checks passed — all modes × difficulties render, one-attempt scoring, misconception feedback, trace, skip/reveal tracking, keyboard selection, phone layout, persistence, no console errors.`);
