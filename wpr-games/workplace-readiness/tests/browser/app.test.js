'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { serve, launch } = require('./harness.js');
const AXE = fs.readFileSync(path.join(__dirname, '..', '..', 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

let srv, url, browser;
test.before(async () => { ({ srv, url } = await serve('/workplace-readiness-games')); browser = await launch(); });
test.after(async () => { await browser.close(); srv.close(); });

async function newPage(opts) {
  opts = opts || {};
  const ctx = browser.createBrowserContext ? await browser.createBrowserContext() : await browser.createIncognitoBrowserContext();
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('console', m => { if (m.type() === 'error') page.__errors.push(m.text()); });
  page.on('pageerror', e => page.__errors.push('PAGEERROR ' + e.message));
  await page.setViewport({ width: opts.w || 1024, height: opts.h || 800 });
  if (opts.blockStorage) await page.evaluateOnNewDocument(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto(url, { waitUntil: 'networkidle0' });
  page.__ctx = ctx;
  return page;
}
async function closePage(page) { await page.__ctx.close(); }
async function startWith(page, o) {
  o = o || {};
  await page.select('#opt-skill', o.skill || 'mixed'); await page.select('#opt-mode', o.mode || 'mixed');
  await page.select('#opt-difficulty', o.difficulty || 'mixed'); await page.select('#opt-context', o.context || '');
  await page.click('#btn-start'); await page.waitForSelector('#btn-check');
}
const current = page => page.evaluate(() => { const c = WRG.app.state().current; return { id: c.id, mode: c.mode, skill: c.skill, best: c.key.bestId, problem: c.key.problemId, example: c.key.example, options: c.options && c.options.map(o => o.id), segs: c.doc && c.doc.segments.map(s => s.id), steps: c.steps && c.steps.map(s => s.id) }; });
async function arrange(page, target) {
  for (let i = 0; i < target.length; i++) {
    for (;;) {
      const ids = await page.$$eval('.step', els => els.map(e => e.dataset.id));
      if (ids.indexOf(target[i]) <= i) break;
      await page.click('.step[data-id="' + target[i] + '"] .up');
    }
  }
}
async function answer(page, correct) {
  const c = await current(page);
  if (c.mode === 'decision' || c.mode === 'nextstep') {
    const id = correct ? c.best : c.options.find(x => x !== c.best); await page.click('.choice[data-id="' + id + '"]');
  } else if (c.mode === 'find') {
    const id = correct ? c.problem : c.segs.find(x => x !== c.problem); await page.click('.choice[data-id="' + id + '"]');
  } else if (correct) await arrange(page, c.example);
  await page.click('#btn-check'); await page.waitForSelector('.feedback');
  return c;
}
const next = async page => { await page.click('#btn-next'); await page.waitForSelector('#btn-check'); };
const stats = page => page.evaluate(() => JSON.parse(JSON.stringify(WRG.app.tracker.data)));
const T = { timeout: 120000 };

test('home: loads clean, Mixed practice is the default, Start practice is obvious', T, async () => {
  const p = await newPage();
  assert.deepEqual(p.__errors, []);
  assert.equal(await p.$eval('#generator-warning', e => e.hidden), true, 'compositional generator initialized');
  assert.equal(await p.$eval('#opt-skill', e => e.value), 'mixed');
  assert.equal(await p.$eval('#opt-mode', e => e.value), 'mixed');
  assert.equal(await p.$eval('#opt-difficulty', e => e.value), 'mixed');
  assert.equal(await p.$eval('#btn-start', e => e.textContent), 'Start practice');
  assert.equal(await p.$eval('#btn-continue', e => e.hidden), true);
  const skills = await p.$$eval('#opt-skill option', os => os.filter(o => o.value.startsWith('skill:')).length);
  assert.equal(skills, 22, 'all 22 skills selectable');
  assert.equal((await p.$$eval('#opt-context option', os => os.length)), 14, 'any setting + 13 career settings');
  assert.match(await p.$eval('.site-footer', e => e.textContent), /not an official CTECS product/);
  await closePage(p);
});

test('practice: every mode can be completed correctly and incorrectly through the UI', T, async () => {
  const p = await newPage();
  for (const mode of ['decision', 'nextstep', 'order', 'find']) {
    await p.goto(url + '#/', { waitUntil: 'load' });
    await startWith(p, { mode });
    for (const correct of [true, false]) {
      const c = await answer(p, correct);
      assert.equal(c.mode, mode);
      const headline = await p.$eval('#feedback-title', e => e.textContent);
      if (correct) assert.match(headline, /^Correct/); else assert.match(headline, /Not quite|Reasonable/);
      assert.ok((await p.$$eval('.feedback p', ps => ps.length)) >= 2, 'feedback has explanation + takeaway');
      assert.match(await p.$eval('.feedback .principle', e => e.textContent), /^Takeaway:/);
      assert.equal(await p.$eval('#btn-next', e => e.textContent), 'Next challenge');
      await next(p);
    }
  }
  const s = (await stats(p)).stats;
  assert.equal(s.completed, 8, 'two answers in each of four modes; statistics persist across streams');
  assert.deepEqual(p.__errors, []);
  await closePage(p);
});

test('scoring: one scored attempt per question; answers cannot be changed after checking', T, async () => {
  const p = await newPage();
  await startWith(p, { mode: 'decision' });
  const c = await current(p), wrong = c.options.find(x => x !== c.best);
  await p.click('.choice[data-id="' + wrong + '"]'); await p.click('#btn-check'); await p.waitForSelector('.feedback');
  assert.equal(await p.$$eval('.choice', bs => bs.every(b => b.disabled)), true, 'choices locked');
  assert.equal(await p.$('#btn-check'), null, 'check button removed');
  const s = (await stats(p)).stats;
  assert.equal(s.completed, 1); assert.equal(s.incorrect, 1); assert.equal(s.firstAttemptCorrect, 0);
  assert.equal(await p.$eval('.choice.is-best .tag', e => e.textContent), 'Best answer');
  assert.equal(await p.$eval('.choice.is-mine .tag', e => e.textContent), 'Your choice');
  await closePage(p);
});

test('ordering: buttons, keyboard and pointer-drag all reorder; valid alternates are accepted', T, async () => {
  const p = await newPage();
  await startWith(p, { skill: 'skill:workplace-safety', mode: 'order' });
  let c = await current(p);
  // keep going until we reach the 5-step hazard template with three valid orders
  // keep going until a 5-step challenge with more than one valid order (authored or composed)
  const altOf = () => p.evaluate(() => { const ch = WRG.app.state().current; const ids = ch.steps.map(s => s.id);
    const valid = WRG.order.enumerateValid(ids, ch.key.precedence); const ex = ch.key.example.join('|');
    const alt = valid.find(v => v.join('|') !== ex); return alt || null; });
  for (let i = 0; i < 80 && !(c.example.length === 5 && await altOf()); i++) { await p.click('#btn-check'); await p.waitForSelector('.feedback'); await next(p); c = await current(p); }
  assert.equal(c.example.length, 5);
  const ids = () => p.$$eval('.step', els => els.map(e => e.dataset.id));
  const before = await ids();
  await p.click('.step:nth-child(2) .down');                                  // tap-to-move button
  const afterBtn = await ids(); assert.deepEqual([afterBtn[1], afterBtn[2]], [before[2], before[1]]);
  await p.focus('.step:nth-child(3) .grip'); await p.keyboard.press('ArrowUp'); // keyboard
  const afterKey = await ids(); assert.deepEqual([afterKey[1], afterKey[2]], [afterBtn[2], afterBtn[1]]);
  const grip = await p.$('.step:nth-child(1) .grip'), box = await grip.boundingBox();    // pointer drag to the bottom
  const lastBox = await (await p.$('.step:nth-child(5)')).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
  await p.mouse.move(box.x + 5, lastBox.y + lastBox.height - 4, { steps: 12 }); await p.mouse.up();
  const afterDrag = await ids(); assert.equal(afterDrag[4], afterKey[0], 'dragged item moved to the end');
  // now build an alternate valid order: any solution with warn anywhere before resume
  const alt = await altOf(); // a valid order that differs from the key's example
  assert.ok(alt && alt.join('|') !== c.example.join('|'));
  await arrange(p, alt);
  await p.click('#btn-check'); await p.waitForSelector('.feedback');
  assert.match(await p.$eval('#feedback-title', e => e.textContent), /^Correct/);
  assert.match(await p.$eval('.feedback', e => e.textContent), /Other orders also work/);
  await closePage(p);
});

test('keyboard only: choose with arrow/number keys, check with Enter, continue with the keyboard', T, async () => {
  const p = await newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.select('#opt-mode', 'decision');
  await p.focus('#btn-start'); await p.keyboard.press('Enter'); await p.waitForSelector('#btn-check');
  assert.equal(await p.evaluate(() => document.activeElement.getAttribute('role')), 'radio', 'focus lands on the choices');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('3');
  assert.equal(await p.evaluate(() => document.activeElement.getAttribute('aria-checked')), 'true');
  assert.equal(await p.evaluate(() => document.activeElement.querySelector('.key').textContent), 'C');
  await p.keyboard.press('Enter'); await p.waitForSelector('.feedback');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'feedback-title', 'focus moves to the feedback');
  await p.keyboard.press('Tab');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'btn-next');
  await p.keyboard.press('Enter'); await p.waitForSelector('#btn-check');
  assert.equal((await stats(p)).stats.completed, 1);
  await closePage(p);
});

test('focus is always visible on interactive controls', T, async () => {
  const p = await newPage();
  await p.focus('#opt-skill');
  assert.notEqual(await p.$eval('#opt-skill', e => getComputedStyle(e).outlineStyle), 'none');
  await p.focus('#btn-start');
  const o = await p.$eval('#btn-start', e => { const s = getComputedStyle(e); return [s.outlineStyle, parseFloat(s.outlineWidth)]; });
  assert.notEqual(o[0], 'none'); assert.ok(o[1] >= 2);
  await closePage(p);
});

test('filters: skill, mode, difficulty and career setting are honoured in the browser', T, async () => {
  const p = await newPage();
  await startWith(p, { skill: 'skill:teamwork', mode: 'find', difficulty: 'beginner', context: 'culinary' });
  for (let i = 0; i < 4; i++) {
    const meta = await p.evaluate(() => { const c = WRG.app.state().current; return [c.skill, c.mode, c.difficulty, c.context]; });
    assert.deepEqual(meta, ['teamwork', 'find', 'beginner', 'culinary']);
    await answer(p, true); await next(p);
  }
  await closePage(p);
});
test('filters: Mathematics Advanced has generated content and preserves its selected filters', T, async () => {
  const p = await newPage();
  await p.select('#opt-skill', 'skill:mathematics'); await p.select('#opt-difficulty', 'advanced');
  assert.equal(await p.$eval('#btn-start', e => e.disabled), false);
  assert.match(await p.$eval('#options-note', e => e.textContent), /distinct reasoning problems/);
  await p.click('#btn-start'); await p.waitForSelector('#btn-check');
  const c = await p.evaluate(() => WRG.app.state().current);
  assert.equal(c.skill, 'mathematics');
  assert.equal(c.difficulty, 'advanced');
  await closePage(p);
});

test('session summary: totals, breakdowns, focus areas and few-answer wording', T, async () => {
  const p = await newPage();
  await p.goto(url + '#/summary', { waitUntil: 'load' });
  assert.match(await p.$eval('#summary-body', e => e.textContent), /No challenges completed yet/);
  await p.goto(url + '#/', { waitUntil: 'load' });
  await startWith(p, { skill: 'skill:integrity', mode: 'decision' });
  await answer(p, true); await next(p); await answer(p, false); await next(p); await answer(p, false);
  await p.click('#nav-summary'); await p.waitForSelector('.tiles');
  const tiles = await p.$$eval('.tile', ts => ts.map(t => [t.querySelector('b').textContent, t.querySelector('span').textContent]));
  assert.deepEqual(tiles.map(t => t[0]).slice(0, 4), ['3', '1', '2', '33%']);
  assert.match(await p.$eval('#summary-body', e => e.textContent), /Based on 3 challenges so far/);
  assert.match(await p.$eval('.focus', e => e.textContent), /Integrity \(1 of 3\)/);
  assert.match(await p.$eval('#summary-body', e => e.textContent), /21 of 22 skills not practiced yet/);
  assert.match(await p.$eval('#summary-body', e => e.textContent), /Best Next Step|Workplace Decisions/);
  assert.match(await p.$eval('#summary-body', e => e.textContent), /Personal Qualities and Abilities/);
  await closePage(p);
});

test('summary: Practice this skill starts a focused stream', T, async () => {
  const p = await newPage();
  await startWith(p, { skill: 'skill:integrity', mode: 'decision' });
  await answer(p, false); await next(p); await answer(p, false);
  await p.click('#nav-summary'); await p.waitForSelector('.focus button');
  await p.click('.focus button'); await p.waitForSelector('#btn-check');
  const c = await p.evaluate(() => WRG.app.state().current.skill);
  assert.equal(c, 'integrity');
  await closePage(p);
});

test('reset: needs confirmation, Cancel keeps results, confirming clears results and storage', T, async () => {
  const p = await newPage();
  await startWith(p, { mode: 'decision' }); await answer(p, true);
  await p.click('#nav-summary'); await p.waitForSelector('#sum-reset');
  await p.click('#sum-reset'); await p.waitForSelector('#reset-no');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'reset-no', 'safe option focused');
  await p.click('#reset-no');
  assert.equal((await stats(p)).stats.completed, 1, 'cancel keeps results');
  await p.click('#sum-reset'); await p.waitForSelector('#reset-yes'); await p.click('#reset-yes');
  await p.waitForSelector('#view-home:not([hidden])');
  const s = await stats(p);
  assert.equal(s.stats.completed, 0); assert.equal(s.activeMs, 0);
  assert.equal(await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('wrg.v1') || 'null'); return d ? d.stats.completed : 0; }), 0);
  assert.equal(await p.$eval('#btn-continue', e => e.hidden), true);
  await closePage(p);
});

test('persistence: reload then Continue practice resumes the same challenge stream', T, async () => {
  const p = await newPage();
  await startWith(p, { mode: 'decision' });
  for (let i = 0; i < 3; i++) { await answer(p, i !== 1); await next(p); }
  const expected = await p.evaluate(() => { const d = WRG.app.tracker.data; const g = WRG.app.hybrid ? WRG.selector.createSession(WRG.app.hybrid, { seed: d.seed, filters: d.filters }) : WRG.generator.createSession(WRG.app.lib, { seed: d.seed, filters: d.filters }); let c; for (let i = 0; i <= d.index; i++) c = g.next(); return c.scenario + '|' + c.prompt; });
  const shown = await p.evaluate(() => { const c = WRG.app.state().current; return c.scenario + '|' + c.prompt; });
  assert.equal(shown, expected, 'the displayed challenge is the stream position after 3 answers');
  await p.reload({ waitUntil: 'networkidle0' });
  // the route is #/practice, so a reload resumes practice directly on the unanswered challenge
  await p.waitForSelector('#btn-check');
  assert.equal((await stats(p)).stats.completed, 3);
  const resumed = await p.evaluate(() => { const c = WRG.app.state().current; return c.scenario + '|' + c.prompt; });
  assert.equal(resumed, expected, 'reload resumed on exactly the same challenge');
  await p.click('#brand-link'); await p.waitForSelector('#view-home:not([hidden])');
  assert.equal(await p.$eval('#btn-continue', e => e.hidden), false, 'Continue practice offered on the home screen');
  await p.click('#btn-continue'); await p.waitForSelector('#btn-check');
  assert.equal(await p.evaluate(() => { const c = WRG.app.state().current; return c.scenario + '|' + c.prompt; }), expected, 'Continue practice resumes the same challenge');
  await closePage(p);
});

test('privacy: stored data holds only practice statistics', T, async () => {
  const p = await newPage();
  await startWith(p); await answer(p, true);
  const raw = await p.evaluate(() => localStorage.getItem('wrg.v1'));
  const d = JSON.parse(raw);
  assert.deepEqual(Object.keys(d).sort(), ['activeMs', 'filters', 'index', 'seed', 'startedAt', 'stats', 'updatedAt', 'version']);
  assert.equal(await p.evaluate(() => Object.keys(localStorage).length), 1, 'a single storage key');
  assert.equal(await p.evaluate(() => document.cookie), '', 'no cookies');
  await closePage(p);
});

test('resilience: works when localStorage is blocked (memory fallback)', T, async () => {
  const p = await newPage({ blockStorage: true });
  assert.deepEqual(p.__errors, []);
  await startWith(p, { mode: 'find' }); await answer(p, true);
  assert.equal((await stats(p)).stats.completed, 1);
  await p.click('#nav-summary'); await p.waitForSelector('.tiles');
  await closePage(p);
});

test('long session: 150 challenges through the real UI, mixed modes, stable DOM and consistent stats', { timeout: 300000 }, async () => {
  const p = await newPage();
  await startWith(p);
  const nodes = [];
  for (let i = 0; i < 150; i++) {
    await answer(p, i % 4 !== 0);
    if (i % 50 === 0) nodes.push(await p.evaluate(() => document.getElementsByTagName('*').length));
    await next(p);
  }
  nodes.push(await p.evaluate(() => document.getElementsByTagName('*').length));
  const s = (await stats(p)).stats;
  assert.equal(s.completed, 150); assert.equal(s.correct + s.incorrect, 150);
  assert.equal(s.incorrect, 38);   // i%4==0 -> 38 of 150 wrong, and a "wrong" order click is always invalid
  assert.ok(Math.max(...nodes) - Math.min(...nodes) < 60, 'no DOM growth: ' + nodes);
  assert.equal(await p.evaluate(() => document.querySelectorAll('.ticket').length), 1);
  assert.deepEqual(p.__errors, []);
  const modes = Object.keys(s.byMode); assert.equal(modes.length, 4, 'all four modes appeared');
  await closePage(p);
});

for (const [w, h] of [[360, 640], [320, 568], [768, 1024], [1366, 768]]) {
  test('layout ' + w + 'x' + h + ': no horizontal scroll and comfortable tap targets on every screen state', T, async () => {
    const p = await newPage({ w, h });
    const noOverflow = async label => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(o <= 0, label + ' overflows by ' + o + 'px'); };
    const targets = async label => {
      const small = await p.evaluate(() => Array.from(document.querySelectorAll('main button:not([disabled]), main select, .top-nav a, .brand'))
        .filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return { id: e.id || e.className || e.tagName, h: Math.round(r.height), w: Math.round(r.width) }; })
        .filter(r => r.h < 44 || r.w < 44 && !/brand/.test(r.id)));
      assert.deepEqual(small.filter(s => s.h < 44), [], label + ' targets under 44px tall');
    };
    await noOverflow('home'); await targets('home');
    for (const mode of ['decision', 'order', 'find', 'nextstep']) {
      await p.goto(url + '#/', { waitUntil: 'load' }); await startWith(p, { mode });
      await noOverflow(mode); await targets(mode);
      await answer(p, false); await noOverflow(mode + ' feedback'); await targets(mode + ' feedback');
    }
    await p.click('#nav-summary'); await p.waitForSelector('.tiles'); await noOverflow('summary'); await targets('summary');
    await closePage(p);
  });
}

test('accessibility: axe-core finds no violations on home, every challenge mode, feedback and summary', { timeout: 240000 }, async () => {
  const p = await newPage({ w: 1024, h: 800 });
  const scan = async label => {
    await p.evaluate(AXE);
    const r = await p.evaluate(async () => { const x = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return x.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes[0].target.join(' '), summary: v.nodes[0].failureSummary.slice(0, 160) })); });
    assert.deepEqual(r, [], 'axe violations on ' + label);
  };
  await scan('home');
  for (const mode of ['decision', 'order', 'find', 'nextstep']) {
    await p.goto(url + '#/', { waitUntil: 'load' }); await startWith(p, { mode });
    await scan(mode + ' question'); await answer(p, false); await scan(mode + ' feedback');
  }
  await p.click('#nav-summary'); await p.waitForSelector('.tiles'); await scan('summary');
  await p.click('#sum-reset'); await p.waitForSelector('#reset-yes'); await scan('reset confirmation');
  await closePage(p);
});

test('accessibility: semantics (radiogroups are labelled, controls have names, ids are unique, headings in order)', T, async () => {
  const p = await newPage();
  await startWith(p, { mode: 'decision' });
  assert.equal(await p.$eval('[role=radiogroup]', e => !!document.getElementById(e.getAttribute('aria-labelledby'))), true);
  assert.equal(await p.$$eval('[role=radio]', rs => rs.filter(r => !r.getAttribute('aria-checked')).length), 0);
  assert.equal(await p.$$eval('[role=radio]', rs => rs.filter(r => r.tabIndex === 0).length), 1, 'roving tabindex: exactly one tab stop');
  assert.equal(await p.evaluate(() => document.documentElement.lang), 'en');
  const dup = await p.evaluate(() => { const ids = Array.from(document.querySelectorAll('[id]')).map(e => e.id); return ids.filter((x, i) => ids.indexOf(x) !== i); });
  assert.deepEqual(dup, []);
  const unnamed = await p.evaluate(() => Array.from(document.querySelectorAll('button, select, a')).filter(e => e.offsetParent !== null && !(e.getAttribute('aria-label') || e.textContent.trim() || (e.labels && e.labels.length))).length);
  assert.equal(unnamed, 0);
  assert.equal(await p.$eval('#sr-status', e => e.getAttribute('aria-live')), 'polite');
  await p.goto(url + '#/', { waitUntil: 'load' }); await startWith(p, { mode: 'order' });
  assert.ok((await p.$$eval('.step button', bs => bs.every(b => b.getAttribute('aria-label')))), 'ordering buttons are labelled with the step text');
  await closePage(p);
});

test('security: scenario text is inserted as text, never as markup', T, async () => {
  const p = await newPage();
  await startWith(p, { mode: 'decision' });
  const out = await p.evaluate(() => {
    const slot = document.getElementById('ticket-slot');
    const c = JSON.parse(JSON.stringify(WRG.app.state().current));
    c.scenario = '<img src=x onerror="window.__xss=1"> <b>bold</b>'; c.options[0].text = '<script>window.__xss=2<\/script>';
    WRG.ui.renderTicket(slot, c, WRG.app.lib, { check() { return null; }, next() {} });
    return { xss: window.__xss || 0, imgs: slot.querySelectorAll('img, script, b').length, text: slot.querySelector('.scenario').textContent };
  });
  assert.equal(out.xss, 0); assert.equal(out.imgs, 0); assert.match(out.text, /<img src=x/);
  await closePage(p);
});

test('performance: first interactive within budget and bundle size reasonable', T, async () => {
  const p = await newPage();
  const t = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return Math.round(n.domContentLoadedEventEnd); });
  assert.ok(t < 2500, 'DOMContentLoaded ' + t + 'ms');
  const kb = fs.statSync(path.join(__dirname, '..', '..', 'js', 'data', 'content-bundle.js')).size / 1024;
  assert.ok(kb < 600, 'content bundle ' + Math.round(kb) + ' KB');
  await closePage(p);
});

test('hosting: works from a GitHub Pages subfolder, a host root and file:// with relative paths only', { timeout: 120000 }, async () => {
  const rootServer = await serve('');
  const targets = [['subfolder', url], ['root', rootServer.url], ['file', 'file://' + path.join(__dirname, '..', '..', 'index.html')]];
  for (const [label, target] of targets) {
    const ctx = browser.createBrowserContext ? await browser.createBrowserContext() : await browser.createIncognitoBrowserContext();
    const p = await ctx.newPage(); const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
    const external = []; p.on('request', r => { const u = r.url(); if (!/^(file:|data:|blob:)/.test(u) && !u.startsWith(new URL(target).origin)) external.push(u); });
    await p.goto(target, { waitUntil: 'networkidle0' });
    await p.click('#btn-start'); await p.waitForSelector('#btn-check');
    assert.deepEqual(errs, [], label + ' console errors');
    assert.deepEqual(external, [], label + ' made external requests');
    await ctx.close();
  }
  rootServer.srv.close();
});
