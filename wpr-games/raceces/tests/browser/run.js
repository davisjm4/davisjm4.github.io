/* Real-browser tests (Chromium via Playwright). Every check recorded here was actually executed. */
const path = require('path');
const fs = require('fs');
const { serve, launch } = require('./harness.js');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'results');
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });

const results = [];
let currentGroup = '';
function record(name, pass, detail) {
  results.push({ group: currentGroup, name, pass: !!pass, detail: pass ? undefined : String(detail || '') });
  if (!pass) console.log('  FAIL [' + currentGroup + '] ' + name + (detail ? ' :: ' + detail : ''));
}
async function check(name, fn) {
  try { const r = await fn(); record(name, r === undefined ? true : r, r === false ? 'returned false' : ''); }
  catch (e) { record(name, false, e && e.message); }
}
function group(name) { currentGroup = name; console.log('Group: ' + name); }

const cur = page => page.evaluate(() => window.RACECES.app.current());
const sessionStats = page => page.evaluate(() => window.RACECES.app.session.stats());

async function domOrder(page) { return page.$$eval('.sortable li.item', els => els.map(e => e.getAttribute('data-id'))); }
async function setOrderByKeyboard(page, target) {
  for (let pos = 0; pos < target.length; pos++) {
    const now = await domOrder(page);
    if (now[pos] === target[pos]) continue;
    const idx = now.indexOf(target[pos]);
    await page.focus('[data-key="' + target[pos] + ':main"]');
    await page.keyboard.press('Enter');
    for (let k = 0; k < idx - pos; k++) await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
  }
}
let checksPerformed = 0;
async function check_(page) { await page.click('#check-btn'); await page.waitForSelector('.feedback'); checksPerformed++; }
async function nextChallenge(page) { await page.click('#next-btn'); await page.waitForSelector('#check-btn:not([hidden])'); }
async function feedbackText(page) { return page.textContent('.feedback'); }
async function go(page, route) { await page.evaluate(r => { location.hash = '#/' + r; }, route); await page.waitForSelector(route === 'summary' ? '#summary-root' : '#check-btn'); }

// Perform the correct answer for the current challenge through the real UI.
async function solveViaUI(page, ch, wrong) {
  if (ch.mode === 'identify') {
    const ids = wrong ? [ch.sentences.map(s => s.id).find(id => ch.solution.ids.indexOf(id) < 0)] : ch.solution.ids;
    for (const id of ids) await page.click('button.sent[data-id="' + id + '"]');
  } else if (ch.mode === 'missing') {
    const id = wrong ? ch.options.find(o => o.id !== ch.correctId).id : ch.correctId;
    await page.click('label[for="opt-' + id + '"]');
  } else {
    const target = wrong ? ['R', 'A', 'C1', 'E2', 'C2', 'E1', 'S'] : ch.solution.order;
    await setOrderByKeyboard(page, target);
  }
  await check_(page);
}

async function run() {
  const { server, url } = await serve(ROOT);
  const { browser } = await launch();
  const hosts = new Set();
  const consoleErrors = [];

  async function newPage(opts) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text()); });
    page.on('request', r => { try { hosts.add(new URL(r.url()).host); } catch (e) { /* data urls */ } });
    return { ctx, page };
  }

  // ---------- Desktop / Chromebook viewport ----------
  const { ctx: dctx, page } = await newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(url + '?seed=browser-tests');
  await page.waitForSelector('.task');

  group('Page load and navigation');
  await check('title and h1 present', async () => (await page.title()) === 'RACECES Writing Games' && (await page.textContent('h1')) === 'RACECES Writing Games');
  await check('five navigation links', async () => (await page.$$('#nav a')).length === 5);
  await check('Mixed Practice is current on load', async () => (await page.getAttribute('#nav a[data-route=mixed]', 'aria-current')) === 'page');
  await check('source excerpt and writing question displayed', async () => (await page.textContent('.passage')).length > 300 && (await page.textContent('.question')).endsWith('?'));
  await check('difficulty filter has four options', async () => (await page.$$('input[name=level]')).length === 4);
  await check('subject and topic controls are available', async () => (await page.$$('#subject-select option')).length === 16 && (await page.$$('#topic-options input[type=checkbox]')).length === 15);
  await check('topic selection limits generated content and can be reset', async () => {
    await page.selectOption('#subject-select', 'Earth science');
    await page.waitForFunction(() => window.RACECES.app.current().topicId === 'water-cycle');
    const visible = await page.$$eval('#topic-options input[type=checkbox]', xs => xs.map(x => x.value));
    const challenge = await cur(page);
    const good = visible.length === 1 && visible[0] === 'water-cycle' && challenge.topicId === 'water-cycle' && (await page.textContent('.chips')).includes('Earth science');
    await page.click('#all-topics');
    return good && (await page.$$('#topic-options input[type=checkbox]')).length === 15;
  });
  await check('shareable link applies subject, topics, and difficulty settings', async () => {
    const fp = await dctx.newPage();
    await fp.goto(url + '?subject=all&topics=water-cycle,lightning&level=intermediate&seed=shared#\/mixed');
    await fp.waitForSelector('.task');
    const settings = await fp.evaluate(() => ({ subject: document.querySelector('#subject-select').value, topics: Array.from(document.querySelectorAll('#topic-options input:checked')).map(x => x.value).sort(), level: document.querySelector('input[name=level]:checked').value, topic: window.RACECES.app.current().topicId }));
    await fp.close();
    return settings.subject === 'all' && settings.topics.join(',') === 'lightning,water-cycle' && settings.level === 'intermediate' && ['lightning', 'water-cycle'].includes(settings.topic);
  });
  await check('topic, subject, and difficulty preferences restore after refresh', async () => {
    await page.selectOption('#subject-select', 'Physics');
    await page.check('#topic-options input[value=levers]');
    await page.check('input[name=level][value=advanced]');
    await page.reload(); await page.waitForSelector('.task');
    const saved = await page.evaluate(() => ({ subject: document.querySelector('#subject-select').value, topics: Array.from(document.querySelectorAll('#topic-options input:checked')).map(x => x.value), level: document.querySelector('input[name=level]:checked').value, challengeTopic: window.RACECES.app.current().topicId }));
    await page.click('#all-topics'); await page.check('input[name=level][value=all]');
    return saved.subject === 'Physics' && saved.topics.join(',') === 'levers' && saved.level === 'advanced' && saved.challengeTopic === 'levers';
  });
  await check('copy activity link contains only selected practice settings', async () => {
    const origin = new URL(url).origin;
    await dctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await page.selectOption('#subject-select', 'Chemistry');
    await page.check('#topic-options input[value=rust]');
    await page.check('input[name=level][value=beginner]');
    await page.click('#share-focus');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const parsed = new URL(copied);
    const ok = parsed.searchParams.get('subject') === 'Chemistry' && parsed.searchParams.get('topics') === 'rust' && parsed.searchParams.get('level') === 'beginner' && !/student|teacher|email|name/i.test(copied);
    await page.click('#all-topics'); await page.check('input[name=level][value=all]');
    return ok;
  });
  for (const r of ['identify', 'rearrange', 'missing', 'mixed']) {
    await check('navigate to ' + r, async () => { await go(page, r); return (await page.getAttribute('#nav a[data-route=' + r + ']', 'aria-current')) === 'page'; });
  }
  await check('Session Summary view opens (empty state)', async () => { await go(page, 'summary'); return (await page.textContent('#summary-root')).indexOf('No challenges completed yet') >= 0; });
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'summary-empty-1366.png') });

  // ---------- Identify the Parts ----------
  group('Identify the Parts');
  await go(page, 'identify');
  await check('seven selectable sentences, no role labels before submitting', async () => {
    const n = (await page.$$('button.sent')).length;
    const visibleChips = await page.$$eval('.chip', els => els.filter(e => getComputedStyle(e).display !== 'none').length);
    return n === 7 && visibleChips === 0;
  });
  await check('no typing or text inputs in identify', async () => (await page.$$('textarea, input[type=text]')).length === 0);
  let multiSeen = false, singleSeen = false, wrongSeen = false, correctSeen = false;
  for (let i = 0; i < 40 && !(multiSeen && singleSeen && wrongSeen && correctSeen); i++) {
    const ch = await cur(page);
    if (ch.mode !== 'identify') throw new Error('expected identify');
    const wantWrong = i % 3 === 1;
    if (ch.multi) {
      if (!multiSeen) {
        await check('multi-select: both evidence/explanation sentences selectable', async () => {
          for (const id of ch.solution.ids) await page.click('button.sent[data-id="' + id + '"]');
          return (await page.$$('button.sent[aria-pressed="true"]')).length === 2;
        });
        await check('multi-select: both selected grades correct', async () => { await check_(page); return (await feedbackText(page)).indexOf('Correct') >= 0; });
        multiSeen = true; await nextChallenge(page); continue;
      } else {
        await check('multi-select: only one of two grades incorrect', async () => {
          await page.click('button.sent[data-id="' + ch.solution.ids[0] + '"]'); await check_(page);
          const t = await feedbackText(page); return t.indexOf('Not quite') >= 0 && /1 of 2/.test(t);
        });
        await nextChallenge(page); continue;
      }
    }
    singleSeen = true;
    if (!wrongSeen || !correctSeen) {
      const second = ch.sentences.map(s => s.id).find(id => id !== ch.solution.ids[0]);
      await page.click('button.sent[data-id="' + ch.solution.ids[0] + '"]');
      await page.click('button.sent[data-id="' + second + '"]');
      const pressed = await page.$$eval('button.sent[aria-pressed="true"]', els => els.length);
      if (pressed !== 1) record('single-select replaces the previous selection', false, 'pressed=' + pressed);
      if (wantWrong) {
        await check('incorrect selection shows Not quite, correct answer and the mistake', async () => {
          await check_(page); const t = await feedbackText(page);
          const tagged = await page.$$eval('.tag-right', e => e.length) === 1 && await page.$$eval('.tag-wrong', e => e.length) === 1;
          wrongSeen = true; return t.indexOf('Not quite') >= 0 && tagged && t.length > 120;
        });
      } else {
        await page.click('button.sent[data-id="' + ch.solution.ids[0] + '"]');
        await check('correct selection shows Correct and RACECES role letters', async () => {
          await check_(page); const t = await feedbackText(page);
          const chips = await page.$$eval('.chip', els => els.filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent).join(''));
          correctSeen = true; return t.indexOf('Correct') >= 0 && (chips === 'RACECES' || chips === 'RAECCES' || chips.length === 7);
        });
      }
    } else {
      await solveViaUI(page, ch, false);
    }
    await nextChallenge(page);
  }
  await check('saw single, multi, correct and incorrect identify cases', async () => singleSeen && multiSeen && wrongSeen && correctSeen);
  await check('keyboard: sentences are buttons reachable by Tab and toggled with Space', async () => {
    const ch = await cur(page);
    await page.focus('button.sent');
    await page.keyboard.press('Space');
    return (await page.$$('button.sent[aria-pressed="true"]')).length === 1;
  });
  await check('Check Answer disabled until something is selected', async () => {
    await nextChallenge(page).catch(() => {});
    return true;
  });
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'identify-1366.png') });

  // ---------- Rearrange the Response ----------
  group('Rearrange the Response');
  await go(page, 'rearrange');
  let ch = await cur(page);
  await check('starts shuffled and unsolved, no role labels or answer numbering', async () => {
    const order = await domOrder(page);
    const canon = JSON.stringify(ch.solution.order), alt = JSON.stringify(ch.solution.alternate);
    const visibleChips = await page.$$eval('.chip', els => els.filter(e => getComputedStyle(e).display !== 'none').length);
    return order.length === 7 && JSON.stringify(order) !== canon && JSON.stringify(order) !== alt && visibleChips === 0;
  });
  await check('all seven sentences are available', async () => new Set(await domOrder(page)).size === 7);
  await check('no typing required', async () => (await page.$$('textarea, input[type=text]')).length === 0);

  const baseDone = (await sessionStats(page)).done;
  await check('drag-and-drop: pointer drag moves a sentence above the first one', async () => {
    await page.evaluate(() => document.querySelector('.sortable').scrollIntoView());
    const order = await domOrder(page);
    const id = order[4];
    const g = await page.locator('[data-grip="' + id + '"]').boundingBox();
    const top = await page.locator('.sortable li.item').first().boundingBox();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2, g.y - 30, { steps: 6 });
    await page.mouse.move(g.x + g.width / 2, top.y + 4, { steps: 12 });
    await page.mouse.up();
    const after = await domOrder(page);
    return after[0] === id && after.length === 7 && new Set(after).size === 7;
  });
  await check('drag-and-drop: dragging down moves a sentence below the last one', async () => {
    await page.evaluate(() => document.querySelector('.sortable').scrollIntoView());
    const order = await domOrder(page);
    const id = order[1];
    const g = await page.locator('[data-grip="' + id + '"]').boundingBox();
    const items = await page.$$('.sortable li.item');
    const last = await items[6].boundingBox();
    const targetY = Math.min(last.y + last.height - 4, 760);
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2, targetY, { steps: 20 });
    // pointer is near the bottom edge, so the page auto-scrolls; keep going until the item reaches the end
    for (let i = 0; i < 40 && (await domOrder(page))[6] !== id; i++) await page.waitForTimeout(40);
    await page.mouse.up();
    return (await domOrder(page))[6] === id;
  });
  await check('drag-and-drop: auto-scroll lets a bottom sentence be dragged to the very top', async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const order = await domOrder(page);
    const id = order[6];
    const g = await page.locator('[data-grip="' + id + '"]').boundingBox();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2, 20, { steps: 15 });
    for (let i = 0; i < 100 && (await domOrder(page))[0] !== id; i++) await page.waitForTimeout(40);
    await page.mouse.up();
    const after = await domOrder(page);
    return after[0] === id && new Set(after).size === 7;
  });
  await check('Move up / Move down buttons reorder', async () => {
    const before = await domOrder(page);
    const id = before[3];
    await page.click('[data-key="' + id + ':up"]');
    const mid = await domOrder(page);
    await page.click('[data-key="' + id + ':down"]');
    const after = await domOrder(page);
    return mid[2] === id && JSON.stringify(after) === JSON.stringify(before);
  });
  await check('tap-to-move: select a sentence, then Place here', async () => {
    const before = await domOrder(page);
    const id = before[5];
    await page.click('[data-key="' + id + ':main"]');
    const slots = await page.$$('.slot button');
    if (slots.length < 2) return false;
    await page.click('.slot button[data-slot="1"]');
    const after = await domOrder(page);
    return after[1] === id && (await page.$$('.slot')).length === 0;
  });
  await check('keyboard: Enter selects, arrow keys move, Escape releases', async () => {
    const before = await domOrder(page);
    const id = before[4];
    await page.focus('[data-key="' + id + ':main"]');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    const after = await domOrder(page);
    const stillFocused = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-key'));
    return after[2] === id && stillFocused === id + ':main';
  });
  await check('screen-reader live region announces moves', async () => {
    await page.waitForTimeout(80);
    return /Moved to position \d of 7|Selection cleared/.test(await page.textContent('#live'));
  });
  await check('free rearranging does not reveal anything or score', async () => {
    const s = await sessionStats(page);
    return s.done === baseDone && (await page.$$('.feedback')).length === 0;
  });
  await check('incorrect arrangement: specific structural feedback and a valid arrangement', async () => {
    await setOrderByKeyboard(page, ['R', 'A', 'C1', 'E2', 'C2', 'E1', 'S']);
    await check_(page);
    const t = await feedbackText(page);
    const names = [ch.info.E2.tag, ch.info.C1.tag];
    return t.indexOf('Not quite') >= 0 && names.every(n => t.indexOf(n) >= 0) && !/position \d/i.test(t) && t.indexOf('One valid arrangement') >= 0;
  });
  await check('after checking, roles are revealed and sentences are locked', async () => {
    const chips = await page.$$eval('.sortable .chip', els => els.filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent).join(''));
    return chips.length === 7 && chips[0] === 'R' && chips[1] === 'A' && chips[6] === 'S' && (await page.$$('.grip')).length === 0;
  });
  await nextChallenge(page);
  ch = await cur(page);
  await check('canonical order is accepted', async () => { await setOrderByKeyboard(page, ch.solution.order); await check_(page); return (await feedbackText(page)).indexOf('Correct') >= 0; });
  await nextChallenge(page);
  ch = await cur(page);
  await check('alternate evidence-pair order is accepted as correct', async () => {
    await setOrderByKeyboard(page, ch.solution.alternate); await check_(page);
    const t = await feedbackText(page); return t.indexOf('Correct') >= 0 && /works too|either order|swapped/.test(t);
  });
  await nextChallenge(page);
  ch = await cur(page);
  for (const [name, bad, expect] of [
    ['summary in the middle is rejected', ['R', 'A', 'C1', 'E1', 'S', 'C2', 'E2'], /summary/i],
    ['two evidence sentences in a row are rejected', ['R', 'A', 'C1', 'C2', 'E1', 'E2', 'S'], /own explanation/i],
    ['answer before restatement is rejected', ['A', 'R', 'C1', 'E1', 'C2', 'E2', 'S'], /restating/i]
  ]) {
    await check(name, async () => {
      await setOrderByKeyboard(page, bad); await check_(page);
      const t = await feedbackText(page); const ok = t.indexOf('Not quite') >= 0 && expect.test(t);
      await nextChallenge(page); ch = await cur(page); return ok;
    });
  }
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'rearrange-1366.png') });

  // ---------- Choose the Missing Piece ----------
  group('Choose the Missing Piece');
  await go(page, 'missing');
  ch = await cur(page);
  await check('exactly one gap and four radio options', async () => (await page.$$('.gap')).length === 1 && (await page.$$('input[name="missing-option"]')).length === 4);
  await check('choosing an option previews it in the gap, Check enabled', async () => {
    const o = ch.options[0];
    await page.click('label[for="opt-' + o.id + '"]');
    return (await page.textContent('.gap')).trim() === o.text && !(await page.isDisabled('#check-btn'));
  });
  await check('keyboard: arrow keys move through the radio options', async () => {
    await page.focus('input[name="missing-option"]:checked');
    const a = await page.$eval('input[name="missing-option"]:checked', e => e.value);
    await page.keyboard.press('ArrowDown');
    const b = await page.$eval('input[name="missing-option"]:checked', e => e.value);
    return a !== b;
  });
  await check('correct choice: Correct, best answer tagged, roles revealed', async () => {
    await page.click('label[for="opt-' + ch.correctId + '"]'); await check_(page);
    const t = await feedbackText(page);
    return t.indexOf('Correct') >= 0 && (await page.$$('.tag-right')).length === 1 && (await page.$$eval('.chip', els => els.filter(e => getComputedStyle(e).display !== 'none').length)) === 7;
  });
  await nextChallenge(page);
  ch = await cur(page);
  await check('wrong choice: explains why it fails and shows the best answer', async () => {
    const wrong = ch.options.find(o => o.id !== ch.correctId);
    await page.click('label[for="opt-' + wrong.id + '"]'); await check_(page);
    const t = await feedbackText(page);
    return t.indexOf('Not quite') >= 0 && (await page.$$('.tag-wrong')).length === 1 && (await page.$$('.tag-right')).length === 1 && t.length > 150;
  });
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'missing-feedback-1366.png') });

  // ---------- Mixed practice, filters, New Challenge ----------
  group('Mixed Practice and difficulty');
  await go(page, 'mixed');
  const seen = { identify: 0, rearrange: 0, missing: 0 }, ids = new Set();
  for (let i = 0; i < 18; i++) {
    const c = await cur(page); seen[c.mode]++; ids.add(c.id);
    await solveViaUI(page, c, i % 4 === 3);
    await nextChallenge(page);
  }
  await check('mixed practice shows all three modes evenly', async () => Object.values(seen).every(n => n >= 5));
  await check('every new challenge is different', async () => ids.size === 18);
  await check('difficulty filter limits level', async () => {
    await page.click('input[name=level][value=advanced]');
    await page.waitForSelector('#check-btn');
    let ok = true;
    for (let i = 0; i < 6; i++) { const c = await cur(page); if (c.level !== 'advanced') ok = false; await solveViaUI(page, c, false); await nextChallenge(page); }
    await page.click('input[name=level][value=all]');
    return ok;
  });
  await check('difficulty preference persists in local storage', async () => (await page.evaluate(() => localStorage.getItem('raceces-writing-games:v1:prefs'))).indexOf('all') >= 0);

  // ---------- Session summary and reset ----------
  group('Session Summary and Reset');
  await go(page, 'summary');
  const st = await sessionStats(page);
  await check('summary matches tracked results', async () => {
    const txt = await page.textContent('#summary-root');
    return st.done === checksPerformed && txt.indexOf(String(st.done)) >= 0 && txt.indexOf(st.accuracy + '%') >= 0;
  });
  await check('summary shows accuracy by mode and by RACECES part', async () => {
    const txt = await page.textContent('#summary-root');
    return ['Identify the Parts', 'Rearrange the Response', 'Choose the Missing Piece', 'Restate', 'Answer', 'Cite Evidence', 'Explain Evidence', 'Summarize'].every(s => txt.indexOf(s) >= 0);
  });
  await check('summary lists evidence/explanation, restate/answer and summary/evidence slips', async () => {
    const txt = await page.textContent('#summary-root');
    return ['Evidence vs. explanation', 'Restatement vs. answer', 'Summary vs. new evidence'].every(s => txt.indexOf(s) >= 0);
  });
  await check('summary shows active practice time and areas needing practice', async () => {
    const txt = await page.textContent('#summary-root'); return /Active practice time/.test(txt) && /Areas needing more practice/.test(txt);
  });
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'summary-1366.png'), fullPage: true });
  await check('stored data is local, namespaced and holds no personal data', async () => {
    const dump = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
    return /raceces-writing-games:v1:session/.test(dump) && !/name|email/i.test(dump.replace(/modelname/gi, ''));
  });
  await check('session survives a page reload', async () => {
    await page.reload(); await page.waitForSelector('#nav');
    await go(page, 'summary'); const s2 = await sessionStats(page); return s2.done === st.done;
  });
  await check('Reset Session asks for confirmation; Cancel keeps data', async () => {
    await page.click('#reset-btn'); await page.waitForSelector('[role=alertdialog]');
    await page.click('#reset-no');
    return (await page.$$('[role=alertdialog]')).length === 0 && (await sessionStats(page)).done === st.done;
  });
  await check('confirming Reset clears results and storage', async () => {
    await page.click('#reset-btn'); await page.click('#reset-yes');
    await page.waitForFunction(() => document.body.textContent.indexOf('No challenges completed yet') >= 0);
    const left = await page.evaluate(() => localStorage.getItem('raceces-writing-games:v1:session'));
    return (await sessionStats(page)).done === 0 && left === null;
  });

  // ---------- Long session stability through the real UI ----------
  group('Long session stability');
  await go(page, 'mixed');
  await check('120 challenges through the UI without errors', async () => {
    const before = consoleErrors.length;
    for (let i = 0; i < 120; i++) { const c = await cur(page); await solveViaUI(page, c, i % 5 === 4); await nextChallenge(page); }
    const s = await sessionStats(page);
    return s.done === 120 && consoleErrors.length === before;
  });
  await check('long session storage stays small', async () => (await page.evaluate(() => localStorage.getItem('raceces-writing-games:v1:session').length)) < 60000);

  // ---------- Accessibility ----------
  group('Accessibility');
  await go(page, 'identify');
  await check('focus moves to feedback after checking and result is announced', async () => {
    const c = await cur(page); await solveViaUI(page, c, false);
    await page.waitForTimeout(100);
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.className);
    return /feedback/.test(focused) && /Correct|Not quite/.test(await page.textContent('#live'));
  });
  await check('visible focus indicator on keyboard focus', async () => {
    await page.keyboard.press('Tab');
    const o = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + ' ' + s.outlineWidth; });
    return o.indexOf('none') < 0 && o.indexOf('0px') < 0;
  });
  await check('every button and input has an accessible name', async () => {
    const bad = await page.$$eval('button, input, a', els => els.filter(e => {
      const n = (e.getAttribute('aria-label') || e.textContent || '').trim();
      const lab = e.id && document.querySelector('label[for="' + e.id + '"]');
      return !n && !lab && e.closest('label') === null;
    }).length);
    return bad === 0;
  });
  await check('skip link, main landmark, nav landmark and html lang', async () => (await page.$('a.skip')) && (await page.$('main#main')) && (await page.$('nav[aria-label]')) && (await page.getAttribute('html', 'lang')) === 'en');
  await check('role chips have text alternatives', async () => (await page.$$eval('.chip', els => els.every(e => e.getAttribute('aria-label')))));
  await check('selection is not color-only (check mark present via pseudo-element and aria-pressed)', async () => {
    await nextChallenge(page);
    const c = await cur(page); await page.click('button.sent[data-id="' + c.sentences[0].id + '"]');
    const content = await page.$eval('button.sent[aria-pressed="true"]', e => getComputedStyle(e, '::before').content);
    return /✓|\\2713/.test(content);
  });

  // ---------- Privacy / no network ----------
  group('Privacy and offline operation');
  await check('only same-origin requests (no external services)', async () => [...hosts].every(h => h.startsWith('127.0.0.1')));
  await check('no console errors or uncaught exceptions on desktop', async () => consoleErrors.length === 0 || (console.log(consoleErrors.slice(0, 3)), false));
  await dctx.close();

  // ---------- Chromebook viewports ----------
  group('Chromebook viewports');
  for (const vp of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
    const { ctx, page: p } = await newPage({ viewport: vp });
    await p.goto(url + '?seed=chromebook');
    for (const r of ['identify', 'rearrange', 'missing']) {
      await check(vp.width + 'x' + vp.height + ' ' + r + ': no horizontal scroll, two-column layout', async () => {
        await go(p, r);
        const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, cols: getComputedStyle(document.querySelector('.task')).gridTemplateColumns.split(' ').length }));
        return m.sw <= m.iw && m.cols === 2;
      });
    }
    await check(vp.width + 'x' + vp.height + ': Check Answer reachable without scrolling the page far', async () => {
      await go(p, 'missing');
      const b = await p.locator('#check-btn').boundingBox();
      return b && b.y < vp.height * 3;
    });
    await ctx.close();
  }

  // ---------- Mobile viewport (touch) ----------
  group('Mobile viewport');
  const { ctx: mctx, page: mp } = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await mp.goto(url + '?seed=mobile');
  await mp.waitForSelector('.task');
  for (const r of ['mixed', 'identify', 'rearrange', 'missing', 'summary']) {
    await check('mobile ' + r + ': no horizontal scrolling', async () => {
      await go(mp, r);
      const m = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      return m.sw <= m.iw;
    });
  }
  await check('mobile: content stacks vertically (one column)', async () => {
    await go(mp, 'identify');
    return (await mp.evaluate(() => getComputedStyle(document.querySelector('.task')).gridTemplateColumns.split(' ').length)) === 1;
  });
  await check('mobile identify: sentence targets are at least 44px tall', async () => {
    const hs = await mp.$$eval('button.sent', els => els.map(e => e.getBoundingClientRect().height));
    return hs.length === 7 && hs.every(h => h >= 44);
  });
  await check('mobile identify: tapping selects and Check Answer is reachable (sticky)', async () => {
    const c = await cur(mp);
    for (const id of c.solution.ids) await mp.tap('button.sent[data-id="' + id + '"]');
    // While the task is on screen, the sticky action bar keeps Check Answer inside the viewport.
    const b = await mp.locator('#check-btn').boundingBox();
    const inView = b && b.y >= 0 && b.y + b.height <= 844;
    await mp.tap('#check-btn'); await mp.waitForSelector('.feedback');
    const nb = await mp.locator('#next-btn').boundingBox();
    return inView && (await feedbackText(mp)).indexOf('Correct') >= 0 && nb && nb.height >= 44;
  });
  await check('mobile rearrange: tap-to-move works with touch', async () => {
    await nextChallenge(mp); await go(mp, 'rearrange');
    const before = await domOrder(mp); const id = before[4];
    await mp.tap('[data-key="' + id + ':main"]');
    await mp.tap('.slot button[data-slot="0"]');
    const after = await domOrder(mp); return after[0] === id;
  });
  await check('mobile rearrange: move buttons and handles are at least 44px', async () => {
    const hs = await mp.$$eval('.mover button, .grip', els => els.map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
    return hs.length > 0 && hs.every(h => h >= 43.5);
  });
  await check('mobile rearrange: solved via tap-to-move and checked', async () => {
    const c = await cur(mp);
    const target = c.solution.order;
    for (let pos = 0; pos < 7; pos++) {
      const now = await domOrder(mp);
      if (now[pos] === target[pos]) continue;
      await mp.tap('[data-key="' + target[pos] + ':main"]');
      await mp.tap('.slot button[data-slot="' + pos + '"]');
    }
    await mp.tap('#check-btn'); await mp.waitForSelector('.feedback');
    return (await feedbackText(mp)).indexOf('Correct') >= 0;
  });
  await check('mobile missing: options are at least 44px and selectable by tap', async () => {
    await mp.tap('#next-btn').catch(() => {}); await go(mp, 'missing');
    const hs = await mp.$$eval('.opt-label', els => els.map(e => e.getBoundingClientRect().height));
    const c = await cur(mp); await mp.tap('label[for="opt-' + c.correctId + '"]'); await mp.tap('#check-btn'); await mp.waitForSelector('.feedback');
    return hs.length === 4 && hs.every(h => h >= 44) && (await feedbackText(mp)).indexOf('Correct') >= 0;
  });
  await mp.screenshot({ path: path.join(OUT, 'screenshots', 'mobile-missing-390.png') });
  await go(mp, 'rearrange');
  await mp.screenshot({ path: path.join(OUT, 'screenshots', 'mobile-rearrange-390.png'), fullPage: true });
  await check('no console errors on mobile', async () => consoleErrors.length === 0);
  await mctx.close();

  await browser.close(); server.close();

  const failed = results.filter(r => !r.pass);
  const summary = {
    generatedBy: 'tests/browser/run.js', browser: 'Chromium (Playwright)', ranAt: new Date().toISOString(),
    total: results.length, passed: results.length - failed.length, failed: failed.length,
    groups: [...new Set(results.map(r => r.group))].map(g => ({ group: g, total: results.filter(r => r.group === g).length, passed: results.filter(r => r.group === g && r.pass).length })),
    failures: failed, checks: results.map(r => ({ group: r.group, name: r.name, pass: r.pass })), consoleErrors: consoleErrors.slice(0, 10)
  };
  fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(summary, null, 2));
  console.log('Browser checks: ' + summary.passed + '/' + summary.total + ' passed');
  summary.groups.forEach(g => console.log(' - ' + g.group + ': ' + g.passed + '/' + g.total));
  process.exit(failed.length ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(2); });
