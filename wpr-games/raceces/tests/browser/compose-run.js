/* Real-browser tests (Chromium via Playwright) for compositional (generated) content in the
   integrated game. Every check here is executed through the real UI. */
const path = require('path');
const fs = require('fs');
const { serve, launch } = require('./harness.js');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'results');
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
const results = []; let group = '';
function rec(name, pass, detail) { results.push({ group, name, pass: !!pass, detail: pass ? undefined : String(detail || '') }); if (!pass) console.log('  FAIL [' + group + '] ' + name + (detail ? ' :: ' + detail : '')); }
async function check(name, fn) { try { const r = await fn(); rec(name, r === undefined ? true : r, r === false ? 'returned false' : ''); } catch (e) { rec(name, false, e && e.message); } }
const cur = p => p.evaluate(() => window.RACECES.app.current());
async function domOrder(p) { return p.$$eval('.sortable li.item', els => els.map(e => e.getAttribute('data-id'))); }
async function setOrderByKeyboard(p, target) {
  for (let pos = 0; pos < target.length; pos++) {
    const now = await domOrder(p); if (now[pos] === target[pos]) continue;
    const idx = now.indexOf(target[pos]);
    await p.focus('[data-key="' + target[pos] + ':main"]'); await p.keyboard.press('Enter');
    for (let k = 0; k < idx - pos; k++) await p.keyboard.press('ArrowUp');
    await p.keyboard.press('Escape');
  }
}
async function submit(p) { await p.click('#check-btn'); await p.waitForSelector('.feedback'); }
async function next(p) { await p.click('#next-btn'); await p.waitForSelector('#check-btn:not([hidden])'); }
async function solve(p, ch, wrong) {
  if (ch.mode === 'identify') {
    const ids = wrong ? [ch.sentences.map(s => s.id).find(id => ch.solution.ids.indexOf(id) < 0)] : ch.solution.ids;
    for (const id of ids) await p.click('button.sent[data-id="' + id + '"]');
  } else if (ch.mode === 'missing') {
    await p.click('label[for="opt-' + (wrong ? ch.options.find(o => o.id !== ch.correctId).id : ch.correctId) + '"]');
  } else {
    await setOrderByKeyboard(p, wrong ? ['R', 'A', 'C1', 'E2', 'C2', 'E1', 'S'] : ch.solution.order);
  }
  await submit(p);
}

(async () => {
  const { server, url } = await serve(ROOT);
  const { browser } = await launch();
  const errors = [], hosts = new Set();
  async function newPage(opts) {
    const ctx = await browser.newContext(opts); const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('request', r => { try { hosts.add(new URL(r.url()).host); } catch (e) { /* ignore */ } });
    return { ctx, page };
  }

  group = 'Library and topic capacity';
  const { page } = await newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(url + '?seed=compose-browser'); await page.waitForSelector('.task');
  await check('compositional library loaded in the page', async () => page.evaluate(() => window.RACECES.app.generator.catalog.length > 1400));
  await check('status line reports authored and generated problems honestly', async () => /234 authored writing models and \d+ generated writing problems/.test(await page.textContent('#focus-status')));
  await check('all topics show their available problems at every level', async () => {
    const counts = await page.$$eval('#topic-options .topic-count', els => els.map(e => e.textContent));
    return counts.length === 23 && counts.every((t, i) => t.match(/\d+/g).map(Number).every(n => n >= (i >= 15 ? 6 : 20)));
  });

  group = 'Topic-specific generated practice through the UI';
  const { page: tp } = await newPage({ viewport: { width: 1366, height: 768 } });
  await tp.goto(url + '?subject=Computer%20technology&topics=binary-numbers&level=intermediate&seed=bin#/mixed'); await tp.waitForSelector('.task');
  const seenModels = new Set(), seenModes = {}; let generatedSeen = 0, allOnTopic = true, gradedOk = true, wrongOk = true, poolNew = true;
  for (let i = 0; i < 24; i++) {
    const ch = await cur(tp);
    if (ch.topicId !== 'binary-numbers' || ch.level !== 'intermediate') allOnTopic = false;
    if (ch.generated) generatedSeen++;
    seenModels.add(ch.modelId); seenModes[ch.mode] = (seenModes[ch.mode] || 0) + 1;
    if (!/New writing problem/.test(await tp.textContent('.pool-note'))) poolNew = false;
    const wrong = i % 4 === 3;
    await solve(tp, ch, wrong);
    const ok = (await tp.getAttribute('.feedback', 'class')).includes(wrong ? 'no' : 'ok');
    if (wrong) wrongOk = wrongOk && ok; else gradedOk = gradedOk && ok;
    if (i === 5) await tp.screenshot({ path: path.join(OUT, 'screenshots', 'compose-binary-1366.png'), fullPage: true });
    await next(tp);
  }
  await check('24 challenges all stay on the selected topic and level', async () => allOnTopic);
  await check('generated problems are served (' + generatedSeen + ' of 24)', async () => generatedSeen >= 18);
  await check('no underlying problem repeats in 24 topic-specific challenges', async () => seenModels.size === 24);
  await check('every challenge is labeled as a new writing problem (no premature review)', async () => poolNew);
  await check('correct answers graded correct through the UI', async () => gradedOk);
  await check('wrong answers graded wrong through the UI', async () => wrongOk);
  await check('mixed practice rotates all three modes on generated content', async () => Object.keys(seenModes).length === 3 && Object.values(seenModes).every(n => n >= 6));
  await check('session summary counts all 24 attempts', async () => (await tp.evaluate(() => window.RACECES.app.session.stats().done)) === 24);

  group = 'Order-dependent evidence in the drag/keyboard UI';
  const { page: dp } = await newPage({ viewport: { width: 1366, height: 768 } });
  let depFound = null;
  for (let s = 0; s < 40 && !depFound; s++) {
    await dp.goto(url + '?subject=Earth%20science&topics=water-cycle&level=advanced&seed=dep' + s + '#/rearrange'); await dp.waitForSelector('.task');
    for (let i = 0; i < 12; i++) { const ch = await cur(dp); if (ch.dependency) { depFound = ch; break; } await setOrderByKeyboard(dp, ch.solution.order); await submit(dp); await next(dp); }
  }
  await check('a causal-chain (order-dependent) problem appears in Rearrange', async () => !!depFound);
  if (depFound) {
    await setOrderByKeyboard(dp, ['R', 'A', 'C2', 'E2', 'C1', 'E1', 'S']); await submit(dp);
    await check('swapped pair order is rejected with "builds on" feedback', async () => (await dp.getAttribute('.feedback', 'class')).includes('no') && /builds on/.test(await dp.textContent('.feedback')));
    await next(dp);
    let ch = await cur(dp), tries = 0;
    while (!ch.dependency && tries++ < 40) { await setOrderByKeyboard(dp, ch.solution.order); await submit(dp); await next(dp); ch = await cur(dp); }
    if (ch.dependency) { await setOrderByKeyboard(dp, ch.solution.order); await submit(dp);
      await check('dependent order is accepted', async () => (await dp.getAttribute('.feedback', 'class')).includes('ok')); }
    await dp.screenshot({ path: path.join(OUT, 'screenshots', 'compose-dependency-1366.png'), fullPage: true });
  }

  group = 'Shared links and mobile layout';
  const { page: mp } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mp.goto(url + '?subject=all&topics=coral-reefs,lightning&level=beginner&seed=mob#/missing'); await mp.waitForSelector('.task');
  await check('shared link applies topics and level to generated content', async () => { const c = await cur(mp); return ['coral-reefs', 'lightning'].includes(c.topicId) && c.level === 'beginner'; });
  let noScroll = true;
  for (let i = 0; i < 8; i++) {
    const w = await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); noScroll = noScroll && w;
    const ch = await cur(mp); await solve(mp, ch, false); if (i === 2) await mp.screenshot({ path: path.join(OUT, 'screenshots', 'compose-missing-390.png'), fullPage: true }); await next(mp);
  }
  await check('no horizontal scrolling on a 390px phone across 8 generated challenges', async () => noScroll);
  const { page: cp } = await newPage({ viewport: { width: 360, height: 740 } });
  await cp.goto(url + '?subject=Space%20exploration&topics=mars-rovers&level=advanced&seed=cb#/rearrange'); await cp.waitForSelector('.task');
  await check('advanced generated passage readable at 360px without horizontal scroll', async () => cp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await cp.screenshot({ path: path.join(OUT, 'screenshots', 'compose-rearrange-360.png'), fullPage: true });

  group = 'Privacy and errors';
  await check('no console or page errors during the whole run', async () => errors.length === 0 || (console.log(errors.slice(0, 5)), false));
  await check('no network requests to other hosts', async () => [...hosts].every(h => h.startsWith('127.0.0.1')));

  await browser.close(); server.close();
  const passed = results.filter(r => r.pass).length;
  fs.writeFileSync(path.join(OUT, 'compose-browser-results.json'), JSON.stringify({ ranAt: new Date().toISOString(), passed, total: results.length, results }, null, 2));
  console.log('Compositional browser checks: ' + passed + '/' + results.length + ' passed');
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
