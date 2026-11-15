// Student-interface Chromium smoke. Set CHROME_BIN, or use the shared WPR browser environment.
// With --production this uses a fresh guest browser and the GitHub Pages route.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startDev } from "../../../../wpr-games/workplace-readiness/service/dev.mjs";
import { generate, makeRng, booleanGame, DIFFICULTIES } from "../../engine.js";

const production = process.argv.includes("--production");
const require = createRequire(new URL("../../../../wpr-games/workplace-readiness/package.json", import.meta.url));
const dev = production ? null : await startDev({});
const browser = await require("puppeteer-core").launch({
  executablePath: process.env.CHROME_BIN,
  headless: true,
  acceptInsecureCerts: production,
  args: ["--no-sandbox", ...(production && process.env.BROWSER_SMOKE_PROXY
    ? ["--ignore-certificate-errors", "--proxy-server=" + process.env.BROWSER_SMOKE_PROXY] : [])],
});
try {
  const page = await browser.newPage();
  const errors = [], assets = new Set();
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.ok()) assets.add(response.url()); });
  await page.evaluateOnNewDocument(() => {
    const random = Math.random;
    let state = 642073;
    Math.random = () => {
      if (!new Error().stack.includes("at seedSource")) return random();
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const value = state / 2 ** 32;
      globalThis.lastBooleanSeed = Math.floor(value * 0x7fffffff) + 1;
      return value;
    };
  });
  const base = production ? "https://davisjm4.github.io" : dev.url;
  const activity = base + "/java-games/boolean-conditional-lab/?learner=guest&smoke=" + Date.now();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(activity, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#mode");
  for (const module of ["boolean-ui.js", "engine.js", "generators/core.js", "generators/schema.js", "generators/misconceptions.js"]) {
    assert.ok(assets.has(base + "/java-games/boolean-conditional-lab/" + module + "?v=bool-v6"), module);
  }
  const getQuestion = async () => {
    const [mode, level, seed] = await page.evaluate(() => [
      document.querySelector("#mode").value,
      document.querySelector("#difficulty").value,
      globalThis.lastBooleanSeed,
    ]);
    assert.ok(seed, "browser supplied a seed");
    const q = generate(mode, makeRng(seed), level);
    assert.equal(await page.$eval("#stage h2", e => e.textContent), q.question);
    if (q.kind !== "select") assert.equal(await page.$eval(".bool-code", e => e.textContent), q.code);
    return q;
  };
  const totals = () => page.evaluate(() => JSON.parse(localStorage.getItem("javaGames.session.v1")).games["boolean-conditional-lab"]);
  let submissions = 0, correctCount = 0, notes = 0, tables = 0;
  const taught = new Set(), tags = new Set();
  async function answer(q, correct, preferredTag) {
    const buttons = q.kind === "select" ? "[data-token]" : "[data-choice]";
    const labels = q.kind === "select" ? q.tokens.map(token => token.text) : q.choices;
    assert.deepEqual(await page.$$eval(buttons, nodes => nodes.map(node => node.textContent)), labels);
    if (q.kind !== "select") assert.equal(new Set(labels).size, labels.length);
    const index = correct ? q.answer : labels.findIndex((_, i) =>
      i !== q.answer && q.choiceFeedback?.[i] && (!preferredTag || q.choiceTags[i] === preferredTag));
    const actualIndex = index < 0 ? labels.findIndex((_, i) => i !== q.answer) : index;
    assert.ok(await page.$eval("#feedback", e => e.hidden && e.textContent === ""));
    assert.ok(await page.$eval("#check", e => e.disabled));
    assert.equal(await page.$("#stage .answer"), null);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "layout fits viewport");
    if (q.table) {
      assert.equal(await page.$$eval(".truth-table tbody tr", rows => rows.length), q.table.length);
      tables++;
    }
    const selector = q.kind === "select" ? "[data-token]" : "[data-choice]";
    const attribute = q.kind === "select" ? "data-token" : "data-choice";
    await page.focus(selector + "[" + attribute + '="' + actualIndex + '"]');
    await page.keyboard.press("Space");
    assert.ok(await page.$eval("#feedback", e => e.hidden));
    await page.focus("#check");
    await page.keyboard.press("Enter");
    const feedback = await page.$eval("#feedback", e => e.innerText);
    assert.ok(feedback.includes(q.explanation));
    assert.equal(await page.$eval("#feedback", e => e.classList.contains("good")), correct);
    const note = !correct && q.choiceFeedback?.[actualIndex];
    assert.equal(feedback.includes("About your choice:"), !!note);
    if (note) {
      assert.ok(feedback.includes(note));
      notes++;
      taught.add(q.family);
      tags.add(q.choiceTags[actualIndex]);
    }
    assert.equal((await totals()).submissions, ++submissions);
    correctCount += Number(correct);
    assert.equal((await totals()).firstTry, correctCount);
    assert.ok(await page.$$eval(buttons, nodes => nodes.every(node => node.disabled)));
  }
  for (const level of DIFFICULTIES) {
    await page.select("#difficulty", level);
    for (const mode of Object.keys(booleanGame.modes)) {
      await page.select("#mode", mode);
      const q = await getQuestion();
      assert.equal(q.mode, mode);
      assert.equal(q.difficulty, level);
      await answer(q, submissions % 2 === 0);
    }
  }
  await page.setViewport({ width: 390, height: 820 });
  const target = {
    coverage: ["fix-boundary", "equivalent-chain"],
    switchIf: ["missing-break-fix"],
    short: ["short-counter"],
  };
  for (const [mode, families] of Object.entries(target)) {
    await page.select("#mode", mode);
    for (let attempts = 0; !families.every(f => taught.has(f)) && attempts < 100; attempts++) {
      const q = await getQuestion();
      if (families.includes(q.family) && !taught.has(q.family)) {
        await answer(q, false);
        await page.click("#next");
      } else await page.click("#skip");
    }
    assert.ok(families.every(f => taught.has(f)), mode + ": " + [...taught]);
  }
  await page.select("#mode", "short");
  await page.select("#difficulty", "Beginner");
  const shortTags = ["thinks-else-also-runs", "thinks-no-branch-matches"];
  for (let attempts = 0; !shortTags.every(tag => tags.has(tag)) && attempts < 60; attempts++) {
    const q = await getQuestion();
    const tag = shortTags.find(candidate => !tags.has(candidate) && q.choiceTags.includes(candidate));
    if (tag) {
      await answer(q, false, tag);
      await page.click("#next");
    } else await page.click("#skip");
  }
  assert.ok(shortTags.every(tag => tags.has(tag)), [...tags].join(", "));
  await page.select("#difficulty", "Advanced");
  await page.select("#mode", "mixed");
  const mixed = new Set();
  for (let i = 0; i < 24; i++) {
    const q = await getQuestion();
    mixed.add(q.mode);
    await answer(q, i % 2 === 0);
    await page.click("#next");
  }
  assert.ok(mixed.size >= 6, "Mixed Practice reaches distinct topics");
  await page.setOfflineMode(true);
  await page.select("#mode", "conditions");
  await answer(await getQuestion(), false);
  await page.setOfflineMode(false);
  await page.click("#next");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#mode");
  assert.equal((await totals()).submissions, submissions);
  assert.equal((await totals()).firstTry, correctCount);
  await page.click("#range-view");
  assert.ok(await page.$eval("#range-app", e => !e.hidden && e.childElementCount > 0));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ production, submissions, correctCount, notes, tables, trackedFamilies: [...taught], trackedTags: [...tags], mixedModes: [...mixed], phoneWidth: 390, offlineLoadedAssets: true, reloadPreservedTotals: true }));
} finally {
  await browser.close();
  if (dev) {
    await new Promise(resolve => dev.server.close(resolve));
    dev.db.close();
  }
}
