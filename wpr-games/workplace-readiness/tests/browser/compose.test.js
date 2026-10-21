'use strict';
/* Real-browser tests of the integrated compositional generator (headless Chromium, served over HTTP). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { serve, launch } = require('./harness.js');
const AXE = fs.readFileSync(path.join(__dirname, '..', '..', 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
let srv, url, browser;
test.before(async () => { ({ srv, url } = await serve('/workplace-readiness-games')); browser = await launch(); });
test.after(async () => { await browser.close(); srv.close(); });
const T = { timeout: 180000 };
async function newPage(w, h) {
  const ctx = browser.createBrowserContext ? await browser.createBrowserContext() : await browser.createIncognitoBrowserContext();
  const page = await ctx.newPage(); page.__ctx = ctx; page.__errors = [];
  page.on('console', m => { if (m.type() === 'error') page.__errors.push(m.text()); });
  page.on('pageerror', e => page.__errors.push('PAGEERROR ' + e.message));
  await page.setViewport({ width: w || 1024, height: h || 800 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  return page;
}
const cur = p => p.evaluate(() => { const c = WRG.app.state().current; return { mode: c.mode, source: c.source, difficulty: c.difficulty, skill: c.skill, best: c.key.bestId, problem: c.key.problemId, example: c.key.example, options: c.options && c.options.map(o => o.id), segs: c.doc && c.doc.segments.map(s => s.id), reasoning: c.reasoning }; });
async function start(p, o) {
  await p.select('#opt-skill', o.skill || 'mixed'); await p.select('#opt-mode', o.mode || 'mixed');
  await p.select('#opt-difficulty', o.difficulty || 'mixed'); await p.select('#opt-context', o.context || '');
  await p.click('#btn-start'); await p.waitForSelector('#btn-check');
}
async function arrange(p, target) {
  for (let i = 0; i < target.length; i++) for (;;) {
    const ids = await p.$$eval('.step', els => els.map(e => e.dataset.id));
    if (ids.indexOf(target[i]) <= i) break;
    await p.click('.step[data-id="' + target[i] + '"] .up');
  }
}
async function answer(p, correct) {
  const c = await cur(p);
  if (c.mode === 'order') { if (correct) await arrange(p, c.example); }
  else { const key = c.mode === 'find' ? c.problem : c.best, all = c.mode === 'find' ? c.segs : c.options;
    await p.click('.choice[data-id="' + (correct ? key : all.find(x => x !== key)) + '"]'); }
  await p.click('#btn-check'); await p.waitForSelector('.feedback');
  return c;
}
const next = async p => { await p.click('#btn-next'); await p.waitForSelector('#btn-check'); };

test('loads the compositional generator with no console errors and shows capacity on the home screen', T, async () => {
  const p = await newPage();
  assert.deepEqual(p.__errors, []);
  assert.equal(await p.evaluate(() => !!WRG.app.hybrid && WRG.app.hybrid.catalog.units.length > 3000), true);
  assert.match(await p.$eval('#options-note', e => e.textContent), /distinct reasoning problems/);
  await p.select('#opt-skill', 'skill:integrity'); await p.select('#opt-difficulty', 'advanced');
  const n = +(await p.$eval('#options-note', e => e.textContent)).match(/^(\d+)/)[1];
  assert.ok(n >= 20, 'Integrity Advanced capacity ' + n);
  await p.__ctx.close();
});

for (const mode of ['decision', 'nextstep', 'order', 'find']) {
  test('play-through: ' + mode + ' (all difficulties) - composed challenges render, grade and give feedback', T, async () => {
    const p = await newPage();
    await start(p, { mode });
    let composed = 0, seenDiff = new Set();
    // play at least 18 challenges, and keep going (up to 40) until 6 composed ones have been exercised:
    // the authored/composed mix varies by seed (authored order templates are weighted up by design)
    let played = 0;
    for (let i = 0; i < 40 && (i < 18 || composed < 6); i++) {
      const correct = i % 3 !== 2; played++;
      const c = await answer(p, correct);
      assert.equal(c.mode, mode);
      if (c.source === 'composed') composed++;
      seenDiff.add(c.difficulty);
      const head = await p.$eval('#feedback-title', e => e.textContent);
      if (correct) assert.match(head, /^Correct/); else if (mode !== 'order') assert.match(head, /Not quite|Reasonable/);
      assert.ok((await p.$eval('.feedback', e => e.textContent)).includes('Takeaway'));
      await next(p);
    }
    assert.ok(composed >= 6, 'composed challenges shown: ' + composed + ' of ' + played);
    const st = await p.evaluate(() => WRG.app.tracker.data.stats);
    assert.equal(st.completed, played);
    assert.deepEqual(p.__errors, []);
    await p.__ctx.close();
  });
}

test('narrow filter: one skill + Advanced gives 20 challenges with no repeated reasoning in the browser', T, async () => {
  const p = await newPage();
  await start(p, { skill: 'skill:big-picture-thinking', difficulty: 'advanced' });
  const seen = new Set();
  for (let i = 0; i < 20; i++) { const c = await answer(p, true); seen.add(c.reasoning); await next(p); }
  assert.equal(seen.size, 20);
  await p.__ctx.close();
});

test('keyboard: a composed choice challenge can be answered with arrow keys and Enter', T, async () => {
  const p = await newPage();
  await start(p, { mode: 'nextstep', difficulty: 'advanced' });
  await p.focus('[role="radio"]');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
  await p.waitForSelector('.feedback');
  assert.ok(await p.$('#btn-next'));
  await p.__ctx.close();
});

test('accessibility: axe finds no violations on composed challenge and feedback screens (all four modes)', T, async () => {
  const p = await newPage();
  for (const mode of ['decision', 'nextstep', 'order', 'find']) {
    await p.goto(url, { waitUntil: 'networkidle0' });
    await start(p, { mode, difficulty: 'advanced' });
    for (let i = 0; i < 6 && (await cur(p)).source !== 'composed'; i++) { await answer(p, true); await next(p); }
    for (const stage of ['challenge', 'feedback']) {
      if (stage === 'feedback') await answer(p, false);
      await p.addScriptTag({ content: AXE });
      const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => ({ id: x.id, n: x.nodes.length })));
      assert.deepEqual(v, [], mode + ' ' + stage);
    }
  }
  await p.__ctx.close();
});

for (const [w, h] of [[360, 740], [390, 844], [1366, 768]]) {
  test('responsive: ' + w + 'x' + h + ' has no horizontal scrolling on composed challenges in every mode', T, async () => {
    const p = await newPage(w, h);
    for (const mode of ['decision', 'order', 'find']) {
      await p.goto(url, { waitUntil: 'networkidle0' });
      await start(p, { mode, difficulty: 'advanced' });
      for (let i = 0; i < 3; i++) {
        const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(over <= 1, mode + ' overflow ' + over + 'px');
        await answer(p, true);
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1);
        await next(p);
      }
    }
    await p.__ctx.close();
  });
}

test('fallback: without the compose scripts the game still runs on the authored generator', T, async () => {
  const ctx = browser.createBrowserContext ? await browser.createBrowserContext() : await browser.createIncognitoBrowserContext();
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.setRequestInterception(true);
  p.on('request', r => /compose/.test(r.url()) ? r.abort() : r.continue());
  await p.goto(url, { waitUntil: 'networkidle0' });
  assert.equal(await p.evaluate(() => WRG.app.hybrid), null);
  assert.match(await p.$eval('#generator-warning', e => e.textContent), /assets did not load/);
  await p.click('#btn-start'); await p.waitForSelector('#btn-check');
  assert.equal(await p.evaluate(() => WRG.app.state().current.cx), undefined);
  assert.deepEqual(errs, []);
  await ctx.close();
});
