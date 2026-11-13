// Browser verification of the mastery requirements tool: the real demo page in headless Chromium, no network beyond a local static server.
// Covers the controls and flows, keyboard operation, accessible names, focus visibility, contrast, touch targets, and the desktop,
// Chromebook, mobile and light-theme layouts. Writes screenshots (2x) and results.json to REQ_BROWSER_DIR (default /tmp/req-browser).
//   node cs-games/teacher/requirements/requirements-browser-tests.cjs
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../..');
const out = path.resolve(process.env.REQ_BROWSER_DIR || '/tmp/req-browser');
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end('not found'); } res.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream'); res.end(d); });
});

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`ok   ${name}`); }
  catch (e) { results.push({ name, ok: false, error: String(e.message).split('\n').slice(0, 14).join(' | ') }); console.log(`FAIL ${name}\n     ${String(e.message).split('\n').slice(0, 14).join('\n     ')}`); }
}
const PAGE = '/cs-games/teacher/requirements/demo.html';
const BAD_TEXT = /node:|policy:|area:advanced|"schema"|[0-9a-f]{8}-[0-9a-f]{4}-|undefined|NaN|\[object|\bnull\b|\{"/;

// ---- helpers that run inside the page ----
const inPage = {
  names() { // every control in the tool must have an accessible name
    const bad = [];
    const nameOf = (el) => {
      const lab = el.getAttribute('aria-labelledby');
      if (lab) { const t = lab.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim(); if (t) return t; }
      const al = el.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
      if (el.labels?.length) { const t = [...el.labels].map((l) => l.textContent).join(' ').trim(); if (t) return t; }
      if (el.tagName === 'BUTTON' || el.tagName === 'SUMMARY' || el.getAttribute('role') === 'tab') return el.textContent.trim();
      return '';
    };
    for (const el of document.querySelectorAll('.mreq button, .mreq input, .mreq select, .mreq textarea, .mreq summary, .mreq [role=tab]')) {
      if (el.hidden || el.closest('[hidden]') || !(el.offsetWidth || el.offsetHeight)) continue;
      if (!nameOf(el)) bad.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${el.className}`);
    }
    return bad;
  },
  contrast() {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const parts = m[1].replace('/', ' ').split(/[\s,]+/).filter(Boolean).map(Number); return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
    const bgOf = (el) => { const stack = []; for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; if (!stack.length || stack[stack.length - 1].a < 1) { const body = parse(getComputedStyle(document.body).backgroundColor); if (body && body.a === 1) base = body; else base = { r: 11, g: 20, b: 30, a: 1 }; } for (const c of stack.reverse()) base = over(c, base); return base; };
    const fails = [];
    for (const el of document.querySelectorAll('.mreq *')) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      if (!own || el.closest('[hidden]') || el.disabled || !(el.offsetWidth || el.offsetHeight)) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const fg = parse(cs.color); if (!fg) continue;
      const bg = bgOf(el), eff = over(fg, bg), a = lum(eff), b = lum(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700, large = size >= 24 || (size >= 18.66 && bold);
      if (ratio < (large ? 3 : 4.5)) fails.push(`${ratio.toFixed(2)}:1 "${own.slice(0, 40)}" (${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)})`);
    }
    return fails;
  },
  targets(minSize) { // buttons, tabs, inputs and clickable rows
    const small = [];
    const visible = (el) => !el.closest('[hidden]') && (el.offsetWidth || el.offsetHeight);
    for (const el of document.querySelectorAll('.mreq button, .mreq [role=tab], .mreq select, .mreq input[type=text], .mreq input[type=search], .mreq summary')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < minSize - 0.5) small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    for (const el of document.querySelectorAll('.mreq input[type=checkbox], .mreq input[type=radio]')) {
      if (!visible(el)) continue;
      const own = el.getBoundingClientRect(), lab = (el.labels?.[0] ?? el.closest('label'))?.getBoundingClientRect() ?? own;
      const h = Math.max(own.height, lab.height);
      if (h < minSize - 0.5 || (own.width < 24 && own.height < 24)) small.push(`${el.type} "${(el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.id).trim().slice(0, 30)}" box ${Math.round(own.width)}x${Math.round(own.height)} label height ${Math.round(lab.height)}`);
    }
    return small;
  },
  overflow() { return { scroll: document.documentElement.scrollWidth, inner: window.innerWidth, wide: [...document.querySelectorAll('.mreq *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > window.innerWidth + 1 && !e.closest('.mreq-scroll') && !e.closest('.mreq-tabs'); }).slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)} right=${Math.round(e.getBoundingClientRect().right)}`) }; },
};

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const problems = { page: [], console: [], failedRequests: [], external: [] };
  async function open(viewport, { query = '', mobile = false } = {}) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', (e) => problems.page.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') problems.console.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) problems.failedRequests.push(`${r.status()} ${r.url()}`); });
    page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) problems.external.push(r.url()); });
    await page.goto(base + PAGE + query);
    await page.waitForSelector('.mreq');
    return { context, page };
  }
  const tab = (page, name) => page.getByRole('tab', { name });
  const text = (page, sel = '.mreq') => page.locator(sel).first().innerText();
  const shot = async (page, name, { full = false } = {}) => { await page.locator('.mreq').screenshot({ path: path.join(out, name + '.png') }); if (full) await page.screenshot({ path: path.join(out, name + '-page.png'), fullPage: true }); };
  const openAdvanced = async (page) => { if (!(await page.locator('details.mreq-adv').evaluate((d) => d.open))) await page.getByText('Advanced settings').click(); };
  const setClass = async (page, q, a) => { await page.getByRole('textbox', { name: 'Minimum questions' }).fill(String(q)); await page.getByRole('textbox', { name: 'Required accuracy as a percentage' }).fill(String(a)); };

  // =========================================================== desktop flows
  {
    const { context, page } = await open({ width: 1280, height: 800 });
    await check('the page loads with a heading, a tab list, and four named tabs', async () => {
      assert.equal(await page.locator('h1').innerText(), 'Mastery requirements');
      assert.deepEqual(await page.getByRole('tab').allInnerTexts(), ['Class defaults', 'Learning areas', 'Individual skills', 'Review & publish']);
      assert.equal(await tab(page, 'Class defaults').getAttribute('aria-selected'), 'true');
      assert.equal(await page.getByRole('tabpanel').count(), 1);
    });
    await check('nothing is set at first: Save is disabled and the prompt is neutral, with no red errors', async () => {
      assert.equal(await page.getByRole('button', { name: 'Apply class defaults' }).isDisabled(), true);
      assert.equal(await page.locator('.mreq-error:visible').count(), 0);
      assert.match(await text(page, '.mreq-explain'), /Choose a starting point, or type a minimum number of questions and a required accuracy/);
    });
    await check('typing 50 and 95 gives the exact sentences the teacher asked for, and selects Quick recognition', async () => {
      await setClass(page, 50, 95);
      const t = await text(page, '.mreq-explain');
      assert.match(t, /Students must answer at least 50 questions with at least 95% first-attempt accuracy\./);
      assert.match(t, /At 50 questions, students need at least 48 correct answers\./);
      assert.match(t, /That allows up to 2 mistakes in the first 50\./);
      assert.match(t, /Students may answer more than 50 questions to improve their accuracy\./);
      assert.equal(await page.getByRole('radio', { name: /Quick recognition/ }).isChecked(), true);
      assert.equal(await page.getByRole('button', { name: 'Apply class defaults' }).isDisabled(), false);
    });
    await check('choosing a preset fills the two numbers, which stay editable; changing one turns the preset into Custom', async () => {
      await page.getByRole('radio', { name: /Standard practice/ }).check();
      assert.equal(await page.getByRole('textbox', { name: 'Minimum questions' }).inputValue(), '30');
      assert.equal(await page.getByRole('textbox', { name: 'Required accuracy as a percentage' }).inputValue(), '90');
      assert.match(await text(page, '.mreq-explain'), /At 30 questions, students need at least 27 correct answers\./);
      await page.getByRole('textbox', { name: 'Minimum questions' }).fill('35');
      assert.equal(await page.getByRole('radio', { name: /Custom/ }).isChecked(), true);
      assert.match(await text(page, '.mreq-presets'), /not been calibrated/);
    });
    await check('0.90 is refused with a clear message, 30.5 questions is refused, and Save stays disabled until both are valid', async () => {
      await page.getByRole('textbox', { name: 'Required accuracy as a percentage' }).fill('0.90');
      assert.match(await text(page, '.mreq-error:visible'), /not a fraction like 0\.90/);
      assert.equal(await page.getByRole('button', { name: 'Apply class defaults' }).isDisabled(), true);
      assert.equal(await page.getByRole('textbox', { name: 'Required accuracy as a percentage' }).getAttribute('aria-invalid'), 'true');
      await page.getByRole('textbox', { name: 'Required accuracy as a percentage' }).fill('90');
      await page.getByRole('textbox', { name: 'Minimum questions' }).fill('30.5');
      assert.match(await text(page, '.mreq-error:visible'), /must be a whole number/);
      assert.equal(await page.getByRole('button', { name: 'Apply class defaults' }).isDisabled(), true);
      for (const bad of ['0', '-3', '1e2', 'abc', '']) { await page.getByRole('textbox', { name: 'Minimum questions' }).fill(bad); assert.equal(await page.getByRole('button', { name: 'Apply class defaults' }).isDisabled(), true, `"${bad}"`); }
      await page.getByRole('textbox', { name: 'Required accuracy as a percentage' }).fill('101');
      await page.getByRole('textbox', { name: 'Minimum questions' }).fill('30');
      assert.match(await text(page, '.mreq-error:visible'), /cannot be more than 100%/);
      await page.getByRole('textbox', { name: 'Required accuracy as a percentage' }).fill('90');
    });
    await check('the advanced section holds the optional settings; a minimum correct count says both requirements must be met', async () => {
      assert.equal(await page.locator('details.mreq-adv').evaluate((d) => d.open), false);
      await page.getByText('Advanced settings').click();
      await page.getByRole('button', { name: /Set a value: Minimum correct answers/ }).click();
      await page.getByRole('textbox', { name: 'Minimum correct answers' }).fill('28');
      assert.match(await text(page, '.mreq-explain'), /at least 28 correct answers in total, which is more than the accuracy rule alone asks for/);
      assert.match(await text(page, '.mreq-explain'), /Both requirements must be met/);
      await page.getByRole('button', { name: /Turn off: Minimum correct answers/ }).click();
      assert.doesNotMatch(await text(page, '.mreq-explain'), /Both requirements must be met/);
      await page.getByText('Advanced settings').click();
    });
    await check('the student preview comes from the real engine: 30 at 90% shows 27 of 30 as met and 26 of 30 as not', async () => {
      const sel = page.getByLabel('Example student');
      const options = await sel.locator('option').allInnerTexts();
      assert.equal(options.length, 4, options.join(' / '));
      await sel.selectOption({ index: 0 });
      assert.match(await text(page, '.mreq-sample'), /Not started/); assert.match(await text(page, '.mreq-sample'), /0 of 30 questions answered/);
      assert.doesNotMatch(await text(page, '.mreq-sample'), /accuracy No answers yet/);
      await sel.selectOption({ index: 2 });
      assert.match(await text(page, '.mreq-sample'), /30 of 30 questions answered · 26 correct · accuracy 86\.6%/);
      assert.match(await text(page, '.mreq-sample'), /In progress/);
      await sel.selectOption({ index: 3 });
      assert.match(await text(page, '.mreq-sample'), /Requirements met/); assert.match(await text(page, '.mreq-sample'), /30 of 30 questions answered · 27 correct · accuracy 90%/);
      assert.match(await text(page, '.mreq-sample'), /practice milestone/);
    });
    await shot(page, 'desktop-1-class-defaults');
    await check('saving class defaults reports how many skills changed and keeps the draft in the page', async () => {
      await page.getByRole('radio', { name: /Standard practice/ }).check();
      await page.getByRole('button', { name: 'Apply class defaults' }).click();
      assert.equal((await text(page, '.mreq-status')).trim(), 'Class defaults applied. 123 skills changed.');
      assert.match(await text(page, '.mreq-reach'), /123 skills use the class defaults\./);
      assert.equal(await page.evaluate(() => window.__editor.getPathway().checkpoints.length), 123);
    });

    await check('learning areas: select Math Lab, pick Quick recognition, save; the list shows it as having its own setting', async () => {
      await tab(page, 'Learning areas').click();
      assert.match(await text(page, '.mreq-empty'), /Choose one or more learning areas/);
      await page.getByRole('checkbox', { name: 'Select Math Lab' }).check();
      assert.match(await text(page, '.mreq-main h3'), /Settings for Math Lab/);
      assert.match(await text(page, '.mreq-main'), /Currently 30 questions\./); // inherited value and its source are shown
      assert.match(await text(page, '.mreq-main'), /Class defaults/);
      await page.getByRole('radio', { name: /Quick recognition/ }).check();
      await page.getByRole('button', { name: 'Apply to 1 learning area' }).click();
      assert.equal((await text(page, '.mreq-status')).trim(), 'Changes applied for 1 learning area. 7 skills changed.');
      const row = page.locator('.mreq-item', { hasText: 'Math Lab' });
      assert.match(await row.innerText(), /7 skills · 50 questions at 95%/); assert.match(await row.innerText(), /Own setting/);
    });
    await check('copying settings from another area applies them to the selected area', async () => {
      await page.getByRole('checkbox', { name: 'Select Math Lab' }).uncheck();
      await page.getByRole('checkbox', { name: 'Select Array Lab' }).check();
      await page.getByLabel('Copy settings from another area').selectOption({ label: 'Math Lab' });
      await page.getByRole('button', { name: 'Copy to 1 selected area' }).click();
      assert.equal((await text(page, '.mreq-status')).trim(), 'Settings copied. 12 skills changed.');
      assert.match(await page.locator('.mreq-item', { hasText: 'Array Lab' }).innerText(), /12 skills · 50 questions at 95%/);
    });
    await check('restoring an area to class defaults asks first, and cancel changes nothing', async () => {
      await page.getByRole('button', { name: 'Restore selected areas to class defaults' }).click();
      assert.equal(await page.getByRole('group', { name: 'Confirm' }).count(), 1);
      await page.getByRole('button', { name: 'Cancel' }).click();
      assert.match(await page.locator('.mreq-item', { hasText: 'Array Lab' }).innerText(), /50 questions at 95%/);
      await page.getByRole('button', { name: 'Restore selected areas to class defaults' }).click();
      await page.getByRole('button', { name: 'Yes, continue' }).click();
      assert.match(await text(page, '.mreq-status'), /Selected areas restored to the class defaults\. 12 skills changed\./);
      assert.match(await page.locator('.mreq-item', { hasText: 'Array Lab' }).innerText(), /class defaults/);
    });
    await shot(page, 'desktop-2-learning-areas');

    await check('individual skills: search, select one, override only the accuracy, and see where each value comes from', async () => {
      await tab(page, 'Individual skills').click();
      await page.getByLabel('Search skills').fill('modulus');
      assert.match(await text(page, '.mreq-side .mreq-hint[aria-live]'), /1 skill shown, 0 selected\./);
      await page.getByRole('checkbox', { name: 'Select Modulus' }).check();
      assert.match(await text(page, '.mreq-main h3'), /Settings for Modulus/);
      const field = page.locator('[data-field="accuracy"]');
      assert.match(await field.innerText(), /Set for the Math Lab area/); assert.match(await field.innerText(), /Currently 95%\./);
      await field.getByRole('button', { name: /Set a different value here/ }).click();
      await page.getByRole('textbox', { name: 'Required accuracy as a percentage' }).fill('80');
      assert.match(await text(page, '.mreq-explain'), /at least 80% first-attempt accuracy/);
      assert.match(await text(page, '.mreq-explain'), /at least 50 questions/, 'the question count is still inherited from the area');
      await page.getByRole('button', { name: 'Apply to 1 skill' }).click();
      assert.equal((await text(page, '.mreq-status')).trim(), 'Changes applied for 1 skill. 1 skill changed.');
      const row = page.locator('.mreq-item', { hasText: 'Modulus' });
      assert.match(await row.innerText(), /Math Lab · 50 questions at 80%/); assert.match(await row.innerText(), /Own setting/);
    });
    await shot(page, 'desktop-3-individual-skill');
    await check('restoring a skill to inherited asks first and returns it to its area\'s setting', async () => {
      await page.getByRole('button', { name: 'Restore selected skills to inherited' }).click();
      await page.getByRole('button', { name: 'Yes, continue' }).click();
      const row = page.locator('.mreq-item', { hasText: 'Modulus' });
      assert.match(await row.innerText(), /50 questions at 95%/); assert.match(await row.innerText(), /Area setting/);
    });
    await check('selecting many skills at once and applying one setting works, with the count in the button', async () => {
      await page.getByLabel('Search skills').fill('');
      await page.getByRole('button', { name: 'Clear selection' }).click();
      await page.getByLabel('Learning area', { exact: true }).selectOption({ label: 'Loop Lab' });
      assert.match(await text(page, '.mreq-side .mreq-hint[aria-live]'), /11 skills shown, 0 selected\./);
      await page.getByLabel('Learning area', { exact: true }).selectOption({ label: 'All areas' });
      await page.getByRole('checkbox', { name: 'Select Modulus' }).check();
      await page.getByLabel('Learning area', { exact: true }).selectOption({ label: 'Loop Lab' });
      assert.match(await text(page, '.mreq-side .mreq-hint[aria-live]'), /11 skills shown, 1 selected\. 1 selected skill is hidden by the filter and will be included\./, 'a selection hidden by a filter is not a surprise');
      await page.getByRole('button', { name: 'Clear selection' }).click();
      await page.getByRole('button', { name: /Select all 11 shown/ }).click();
      assert.match(await text(page, '.mreq-side .mreq-hint[aria-live]'), /11 skills shown, 11 selected\.$/);
      assert.equal(await page.getByRole('button', { name: 'Apply to 11 skills' }).count(), 1);
      await page.getByRole('button', { name: 'Clear selection' }).click();
    });

    await check('an impossible requirement is refused with a plain explanation and nothing is saved', async () => {
      await page.getByLabel('Learning area', { exact: true }).selectOption({ label: 'All areas' });
      await page.getByLabel('Search skills').fill('Integer and Double');
      await page.getByRole('checkbox', { name: 'Select Integer and Double Division' }).check();
      await openAdvanced(page);
      await page.getByRole('button', { name: /Set a different value here: Difficulty levels/ }).click();
      await page.getByRole('button', { name: 'Add a difficulty requirement' }).click();
      const before = await page.evaluate(() => JSON.stringify(window.__editor.getPathway()));
      await page.getByRole('button', { name: 'Apply to 1 skill' }).click();
      const alert = await text(page, '.mreq-alert');
      assert.match(alert, /These changes cannot be applied because the requirements cannot be met\./);
      assert.match(alert, /Integer and Double Division: its practice has no difficulty levels, so an Advanced requirement can't be met\./);
      assert.equal(await page.evaluate(() => JSON.stringify(window.__editor.getPathway())), before, 'nothing was changed');
      assert.equal(await page.getByRole('alert').count(), 1);
    });
    await shot(page, 'desktop-4-impossible-requirement');
    await check('a requirement that more content could satisfy is saved as a draft with a note, and cannot be published', async () => {
      await page.getByLabel('Search skills').fill('Trace 2D');
      await page.getByRole('button', { name: 'Clear selection' }).click();
      await page.getByRole('checkbox', { name: 'Select Trace 2D Array Algorithms' }).check();
      await openAdvanced(page);
      await page.getByRole('button', { name: /Set a different value here: Question variety/ }).click();
      await page.getByRole('textbox', { name: 'Different kinds of questions' }).fill('11');
      await page.getByRole('button', { name: 'Apply to 1 skill' }).click();
      assert.match(await text(page, '.mreq-status'), /Changes applied for 1 skill\./); assert.match(await text(page, '.mreq-status'), /1 note to read on the Review tab\./);
      await tab(page, 'Review & publish').click();
      const problem = page.locator('details.mreq-problem.sev-draft-only');
      assert.match(await problem.innerText(), /More kinds of questions are required than exist/); assert.match(await problem.innerText(), /only 10 kinds of questions exist but you asked for 11/); assert.match(await problem.innerText(), /verified limit/);
      assert.equal(await page.getByRole('button', { name: 'Publish requirements' }).isDisabled(), true);
      assert.match(await text(page, '.mreq-reasons'), /1 skill needs more questions or question kinds than exist/);
      assert.equal(await page.getByRole('button', { name: 'Save draft' }).isDisabled(), false, 'a draft can still be saved');
    });
    await shot(page, 'desktop-5-draft-only');
    await check('fixing the number makes it publishable, and publishing creates a version the page can show', async () => {
      await tab(page, 'Individual skills').click();
      await page.getByLabel('Search skills').fill('Trace 2D');
      await page.getByRole('checkbox', { name: 'Select Trace 2D Array Algorithms' }).check();
      await openAdvanced(page);
      await page.getByRole('textbox', { name: 'Different kinds of questions' }).fill('8');
      await page.getByRole('button', { name: 'Apply to 1 skill' }).click();
      await tab(page, 'Review & publish').click();
      assert.equal(await page.getByRole('button', { name: 'Publish requirements' }).isDisabled(), false);
      await page.getByRole('button', { name: 'Publish requirements' }).click();
      await page.waitForFunction(() => /Published version 1/.test(document.querySelector('.mreq-status').textContent));
      assert.equal(await page.evaluate(() => window.__demo.classes.p1.adapter.state.published.revision), 1);
      assert.equal(await page.evaluate(() => window.__demo.classes.p1.adapter.state.published.policies.filter((p) => p.requirementSource && p.effectiveFrom).length > 0), true);
      await page.locator('.mreq-details > summary', { hasText: 'Published versions' }).click();
      assert.match(await text(page, '.mreq-details:has(summary:text("Published versions"))'), /Version 1/);
    });
    await check('the review shows a readable table of defaults and overrides with no identifiers, and differences from the published version', async () => {
      const table = page.getByRole('table', { name: 'Defaults and overrides' });
      const rows = await table.getByRole('row').allInnerTexts();
      assert.ok(rows.length >= 4, rows.join(' || '));
      const all = rows.join('\n');
      assert.match(all, /Class defaults/); assert.match(all, /Math Lab/); assert.match(all, /30 questions at 90%/); assert.match(all, /50 questions at 95%/); assert.match(all, /Trace 2D Array Algorithms/);
      assert.match(await text(page, '.mreq-reach'), /\d+ skills in this class: \d+ use class defaults/);
      assert.match(await text(page, '.mreq-section'), /No changes from the published version\./);
      await tab(page, 'Class defaults').click();
      await setClass(page, 40, 90);
      await page.getByRole('button', { name: 'Apply class defaults' }).click();
      await tab(page, 'Review & publish').click();
      const body = await text(page, '.mreq-section');
      assert.match(body, /Class defaults: 30 questions at 90% changed to 40 questions at 90%\./);
      await page.locator('.mreq-details > summary', { hasText: 'Versions that will be created' }).click();
      assert.match(await text(page, '.mreq-details:has(summary:text("Versions that will be created"))'), /Earlier versions are kept/);
    });
    await shot(page, 'desktop-6-review-and-publish');
    await check('no identifier, JSON, undefined or NaN appears in any tab\'s text', async () => {
      for (const name of ['Class defaults', 'Learning areas', 'Individual skills', 'Review & publish']) {
        await tab(page, name).click();
        for (const d of await page.locator('.mreq details:not([open]) > summary').all()) await d.click().catch(() => {});
        const t = await text(page);
        assert.doesNotMatch(t, BAD_TEXT, `${name}: ${(t.match(BAD_TEXT) ?? [])[0]}`);
      }
    });
    await check('different classes keep different thresholds in the same page', async () => {
      await page.locator('#class').selectOption('p3');
      await page.waitForSelector('.mreq');
      assert.equal(await page.getByRole('textbox', { name: 'Minimum questions' }).inputValue(), '', 'Period 3 starts unconfigured');
      await setClass(page, 20, 95);
      await page.getByRole('button', { name: 'Apply class defaults' }).click();
      await page.locator('#class').selectOption('p1');
      await page.waitForSelector('.mreq');
      assert.equal(await page.getByRole('textbox', { name: 'Minimum questions' }).inputValue(), '40');
      assert.equal(await page.evaluate(() => window.__demo.classes.p3.draft.policies.find((p) => p.id === 'policy:req:class').minimumQuestions), 20);
      assert.equal(await page.evaluate(() => window.__demo.classes.p1.draft.policies.filter((p) => p.id === 'policy:req:class').at(-1).minimumQuestions), 40);
    });
    await check('the tool stores nothing in the browser and talks to no other server', async () => {
      assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
      assert.deepEqual(problems.external, []);
    });
    await context.close();
  }

  // =========================================================== keyboard, names, focus
  {
    const { context, page } = await open({ width: 1280, height: 800 });
    await check('keyboard: the tab list follows the arrow keys, Home and End, and only the selected tab is in the tab order', async () => {
      await tab(page, 'Class defaults').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await tab(page, 'Learning areas').getAttribute('aria-selected'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Learning areas');
      await page.keyboard.press('End');
      assert.equal(await tab(page, 'Review & publish').getAttribute('aria-selected'), 'true');
      await page.keyboard.press('ArrowRight');
      assert.equal(await tab(page, 'Class defaults').getAttribute('aria-selected'), 'true', 'wraps around');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await tab(page, 'Review & publish').getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Home');
      assert.equal(await tab(page, 'Class defaults').getAttribute('aria-selected'), 'true');
      assert.deepEqual(await page.getByRole('tab').evaluateAll((t) => t.map((x) => x.tabIndex)), [0, -1, -1, -1]);
    });
    await check('keyboard only: choose a preset, edit a number, save, and select an area, all without a pointer', async () => {
      await tab(page, 'Class defaults').focus();
      for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement.type === 'radio')) break; }
      assert.equal(await page.evaluate(() => document.activeElement.type), 'radio');
      await page.keyboard.press('ArrowRight'); // radios move with the arrow keys
      await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => document.activeElement.type), 'radio');
      const focused = await page.evaluate(() => document.activeElement.closest('label').innerText);
      assert.ok(/Standard practice|Quick recognition|Complex reasoning|Custom/.test(focused), focused);
      for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement.getAttribute('aria-label') === 'Minimum questions')) break; }
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Minimum questions');
      await page.keyboard.press('Control+A'); await page.keyboard.type('25');
      await page.keyboard.press('Tab'); await page.keyboard.press('Control+A'); await page.keyboard.type('92.5');
      assert.match(await text(page, '.mreq-explain'), /at least 25 questions with at least 92\.5% first-attempt accuracy/);
      await page.getByRole('button', { name: 'Apply class defaults' }).focus();
      await page.keyboard.press('Enter');
      assert.match(await text(page, '.mreq-status'), /Class defaults applied\. 123 skills changed\./);
      assert.equal(await page.evaluate(() => document.activeElement.className), 'mreq-status', 'focus moves to the status message so it is announced and the screen reader user keeps their place');
      await tab(page, 'Learning areas').focus(); await page.keyboard.press('Enter');
      await page.getByRole('checkbox', { name: 'Select Math Lab' }).focus(); await page.keyboard.press('Space');
      assert.equal(await page.getByRole('checkbox', { name: 'Select Math Lab' }).isChecked(), true);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Select Math Lab', 'focus stays on the checkbox after the panel redraws');
    });
    await check('every control in every tab has an accessible name, no positive tabindex, and a visible focus indicator', async () => {
      for (const name of ['Class defaults', 'Learning areas', 'Individual skills', 'Review & publish']) {
        await tab(page, name).click();
        for (const d of await page.locator('.mreq details > summary').all()) await d.click().catch(() => {});
        assert.deepEqual(await page.evaluate(inPage.names), [], `${name}: unnamed controls`);
        assert.equal(await page.locator('.mreq [tabindex]:not([tabindex="0"]):not([tabindex="-1"])').count(), 0, 'no positive tabindex');
      }
      await tab(page, 'Class defaults').click();
      await tab(page, 'Class defaults').focus();
      const missing = [];
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        const r = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body || !e.closest('.mreq')) return null; const s = getComputedStyle(e); const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow && s.boxShadow !== 'none'); return { ring: Boolean(ring), what: `${e.tagName.toLowerCase()} ${(e.getAttribute('aria-label') || e.textContent || e.id).trim().slice(0, 30)}` }; });
        if (r && !r.ring) missing.push(r.what);
      }
      assert.deepEqual(missing, [], 'focused controls without a visible indicator');
    });
    await check('live regions: the status message is polite and role=status, errors use role=alert, and the explanation is announced politely', async () => {
      assert.equal(await page.locator('.mreq-status').getAttribute('role'), 'status');
      assert.equal(await page.locator('.mreq-status').getAttribute('aria-live'), 'polite');
      assert.equal(await page.locator('.mreq-alert').getAttribute('role'), 'alert');
      assert.equal(await page.locator('.mreq-explain').first().getAttribute('aria-live'), 'polite');
      const accuracy = page.getByRole('textbox', { name: 'Required accuracy as a percentage' });
      assert.match(await accuracy.getAttribute('aria-describedby'), /hint/);
    });
    await context.close();
  }

  // =========================================================== layouts, targets, contrast
  const layouts = [
    ['desktop', { width: 1280, height: 800 }, false], ['chromebook', { width: 1366, height: 768 }, false], ['tablet', { width: 820, height: 1180 }, true],
    ['mobile', { width: 390, height: 844 }, true], ['narrow', { width: 320, height: 640 }, true],
  ];
  for (const [label, viewport, mobile] of layouts) {
    const { context, page } = await open(viewport, { mobile });
    await check(`${label} ${viewport.width}x${viewport.height}: every tab fits the screen without sideways scrolling`, async () => {
      for (const name of ['Class defaults', 'Learning areas', 'Individual skills', 'Review & publish']) {
        await tab(page, name).click();
        if (name === 'Class defaults') { await setClass(page, 30, 90); await page.getByRole('button', { name: 'Apply class defaults' }).click(); await tab(page, 'Class defaults').click(); }
        if (name === 'Learning areas') await page.getByRole('checkbox', { name: 'Select Math Lab' }).check();
        if (name === 'Individual skills') await page.getByRole('checkbox', { name: 'Select Modulus' }).check().catch(() => page.getByLabel('Search skills').fill('Modulus').then(() => page.getByRole('checkbox', { name: 'Select Modulus' }).check()));
        for (const d of await page.locator('.mreq details > summary').all()) await d.click().catch(() => {});
        const o = await page.evaluate(inPage.overflow);
        assert.ok(o.scroll <= o.inner + 1, `${name}: page is ${o.scroll}px wide on a ${o.inner}px screen (${o.wide.join('; ')})`);
        assert.deepEqual(o.wide, [], `${name}: content extends past the screen`);
      }
    });
    await check(`${label}: buttons, tabs, fields and rows are at least 44px tall${mobile ? '' : ' (checked at desktop sizes too)'}`, async () => {
      for (const name of ['Class defaults', 'Learning areas', 'Individual skills', 'Review & publish']) {
        await tab(page, name).click();
        for (const d of await page.locator('.mreq details > summary').all()) await d.click().catch(() => {});
        const small = await page.evaluate(inPage.targets, 44);
        assert.deepEqual(small, [], `${name}: small targets`);
      }
    });
    if (label === 'mobile') {
      await tab(page, 'Class defaults').click();
      await page.getByRole('radio', { name: /Quick recognition/ }).check();
      await shot(page, 'mobile-1-class-defaults');
      await tab(page, 'Learning areas').click(); await page.getByRole('checkbox', { name: 'Select Math Lab' }).check();
      await shot(page, 'mobile-2-learning-areas');
      await tab(page, 'Review & publish').click(); await shot(page, 'mobile-3-review');
      await check('mobile: the review table stacks into labeled rows instead of squeezing columns', async () => {
        const cell = page.getByRole('cell').first();
        assert.ok((await cell.boundingBox()).width > 250, 'cells use the full width');
        assert.ok(await page.locator('.mreq-table [data-label]').count() > 0);
      });
    }
    if (label === 'chromebook') {
      await tab(page, 'Class defaults').click(); await page.getByRole('radio', { name: /Complex reasoning/ }).check();
      await shot(page, 'chromebook-1-class-defaults');
      await tab(page, 'Individual skills').click(); await shot(page, 'chromebook-2-skills');
    }
    await context.close();
  }

  for (const theme of ['dark', 'light']) {
    const { context, page } = await open({ width: 1280, height: 800 }, { query: theme === 'light' ? '?theme=light' : '' });
    await check(`${theme} theme: text contrast is at least 4.5:1 (3:1 for large text) on every tab`, async () => {
      assert.equal(await page.locator('.mreq').getAttribute('data-theme'), theme === 'light' ? 'light' : null);
      await page.getByRole('radio', { name: /Quick recognition/ }).check();
      for (const name of ['Class defaults', 'Learning areas', 'Individual skills', 'Review & publish']) {
        await tab(page, name).click();
        if (name === 'Learning areas') await page.getByRole('checkbox', { name: 'Select Math Lab' }).check();
        for (const d of await page.locator('.mreq details > summary').all()) await d.click().catch(() => {});
        const fails = await page.evaluate(inPage.contrast);
        assert.deepEqual(fails, [], `${name}: low contrast`);
      }
    });
    if (theme === 'light') { await tab(page, 'Class defaults').click(); await page.getByRole('radio', { name: /Standard practice/ }).check(); await shot(page, 'desktop-7-light-theme'); }
    await context.close();
  }

  await check('the whole run had no script errors, no console errors and no failed requests', async () => {
    assert.deepEqual(problems.page, []); assert.deepEqual(problems.console, []); assert.deepEqual(problems.failedRequests, []); assert.deepEqual(problems.external, []);
  });

  await browser.close(); server.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  console.log(`\n${results.length - failed.length} of ${results.length} browser checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
