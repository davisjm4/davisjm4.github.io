// Rendered-page regression tests for the Teacher Tools and Class Learning Pathway interface.
// Real Chromium, the real local service (startDev) and real pathway data; no mocked UI.
//   CHROME_BIN=<chromium> node --test cs-games/teacher/teacher-ui-browser-tests.mjs
// Requires `npm ci --prefix wpr-games/workplace-readiness` (puppeteer-core and axe-core).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';
import { createPathway, clone } from '../pathway/model.mjs';
import { generatePacing } from '../pathway/pacing.mjs';

const require = createRequire(new URL('../../wpr-games/workplace-readiness/package.json', import.meta.url));
const { launch } = require('./tests/browser/harness.js');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const graph = JSON.parse(readFileSync(new URL('../pathway/curriculum-graph.json', import.meta.url), 'utf8'));
const token = 'local-ui-test-secret-1234567890';
const WIDTHS = [[390, 844], [768, 1024], [1280, 900]];
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const RAW_ID = /node:[a-z]+:|checkpoint:|area:[a-z]+:|policy:provisional/i;

async function service(t) {
  const dev = await startDev({ teacherTokens: { teacher: token } });
  t.after(async () => { await new Promise(r => dev.server.close(r)); dev.db.close(); });
  const api = async (path, body, method) => {
    const r = await fetch(dev.url + '/api/wpr' + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { Authorization: 'Bearer ' + token, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await r.json();
    assert.ok(r.ok, path + ' ' + JSON.stringify(json));
    return json;
  };
  return { ...dev, api };
}
// A published class with one unpublished edit, through the real API.
async function seedClass(api, title = 'CS Games Test') {
  const klass = await api('/teacher/profiles', { title, courseId: 'advanced' });
  for (let i = 0; i < 3; i++) await api(`/teacher/profiles/${klass.id}/students`, {});
  let p = createPathway(graph, { title, courseId: 'advanced', classId: klass.id, calendar: { start: '2026-08-10', end: '2027-05-28', weekdays: [1, 2, 3, 4, 5], minutes: 80, rotation: ['A', 'B'], classRotations: [], rotationOffset: 0, overrides: [] } });
  p.examDate = '2027-05-21';
  p = generatePacing(p, graph);
  const upload = { ...clone(p), classId: klass.id, revision: 0, baseRevision: 0, checkpoints: p.checkpoints.map(c => ({ ...c, revision: 0 })) };
  await api('/pathways/teacher', upload);
  const preview = await api(`/pathways/teacher/${upload.id}/preview`, {});
  const published = await api(`/pathways/teacher/${upload.id}/publish`, { previewToken: preview.previewToken, draftVersion: preview.draftVersion, expectedRevision: preview.expectedRevision });
  const draft = clone(published.published);
  draft.checkpoints[0].minutes += 20;
  await api(`/pathways/teacher/${upload.id}/draft`, { pathway: draft, draftVersion: preview.draftVersion + 1 });
  return { classId: klass.id, pathwayId: upload.id, title };
}
const visibleText = (page, selector) => page.$eval(selector, e => e.innerText);
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
async function clickByText(page, scope, text) {
  const handle = await page.waitForFunction((scope, text) => [...document.querySelectorAll(scope + ' button, ' + scope + ' a')].find(b => b.textContent.trim() === text && b.offsetWidth && !b.disabled), { timeout: 10000 }, scope, text);
  await handle.asElement().click();
}
async function signInHub(page) {
  await page.waitForSelector('[name="teacher-key"]');
  await page.type('[name="teacher-key"]', token);
  await clickByText(page, '#teacher-account', 'Sign in to development service');
  await page.waitForSelector('#wpr-teacher-profiles:not([hidden]) .class-card', { timeout: 10000 });
}
async function signInEditor(page) {
  await page.type('input[aria-label="Development teacher token"]', token);
  await clickByText(page, '#auth', 'Sign in to development service');
  await page.waitForFunction(() => document.querySelector('#connection').textContent.startsWith('Signed in'), { timeout: 10000 });
}
async function axeViolations(page, selector) {
  await page.evaluate(axeSource);
  return page.evaluate(async s => (await axe.run(s, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => ({ id: v.id, nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(0, 2).join(' ')) })), selector);
}
const stage = (page, name) => page.evaluate(n => { location.hash = n; }, name).then(() => page.waitForFunction(n => !document.getElementById('stage-' + n).hidden, {}, name));

test('Teacher Tools: three views, readable class overview, no raw identifiers, student IDs kept', { timeout: 120000 }, async t => {
  const svc = await service(t);
  const seeded = await seedClass(svc.api);
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));

  for (const [w, h] of WIDTHS) {
    await page.setViewport({ width: w, height: h });
    await page.goto(svc.url + '/cs-games/teacher/', { waitUntil: 'load' });
    assert.equal(await overflow(page) <= 0, true, `hub overflows horizontally at ${w}px`);
    // The three sections are reachable and show one view at a time.
    const bar = await page.$$eval('#teacher-sections a', links => links.map(a => { const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), left: r.left, right: r.right, h: r.height }; }));
    assert.deepEqual(bar.map(b => b.text), ['My Classes', 'Practice & Assessments', 'Learning Pathways']);
    for (const b of bar) { assert.ok(b.left >= 0 && b.right <= w + 1, `${w}px: "${b.text}" is clipped`); assert.ok(b.h >= 44, `${w}px: "${b.text}" is not touch-sized`); }
    for (const [view, others] of [['classes', ['practice', 'pathways']], ['practice', ['classes', 'pathways']], ['pathways', ['classes', 'practice']]]) {
      await page.evaluate(v => { location.hash = v; }, view);
      await page.waitForFunction(v => !document.getElementById(v).hidden, {}, view);
      for (const o of others) assert.equal(await page.$eval('#' + o, e => e.hidden), true, `${o} should be hidden on ${view}`);
      assert.equal(await page.$eval('#teacher-sections a[aria-current]', a => a.textContent.trim()), { classes: 'My Classes', practice: 'Practice & Assessments', pathways: 'Learning Pathways' }[view]);
    }
    assert.equal(await overflow(page) <= 0, true, `hub (pathways) overflows at ${w}px`);
  }

  // Older deep links still land on the right view.
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(svc.url + '/cs-games/teacher/#wpr-online', { waitUntil: 'load' });
  assert.equal(await page.$eval('#practice', e => e.hidden), false);
  await page.goto(svc.url + '/cs-games/teacher/#wpr-teacher-profiles', { waitUntil: 'load' });
  assert.equal(await page.$eval('#classes', e => e.hidden), false);

  await page.goto(svc.url + '/cs-games/teacher/#classes', { waitUntil: 'load' });
  assert.equal(await page.$eval('#classes-signed-out', e => e.hidden), false, 'signed-out guidance is shown before sign-in');
  await signInHub(page);
  assert.equal(await page.$eval('#classes-signed-out', e => e.hidden), true);
  const card = await visibleText(page, '.class-card');
  assert.match(card, /CS Games Test/); assert.match(card, /Advanced Computer Science/); assert.match(card, /Pathway published/);
  assert.doesNotMatch(card, UUID);
  await page.click('.class-card');
  await page.waitForFunction(() => document.querySelector('#class-pathway-status')?.innerText.includes('Unpublished changes'), { timeout: 10000 });
  const overview = await visibleText(page, '#class-overview > .card');
  assert.match(overview, /CS Games Test/); assert.match(overview, /Advanced Computer Science/);
  assert.match(overview, /Unpublished changes/); assert.match(overview, /Last published/); assert.match(overview, /Open learning pathway/);
  assert.doesNotMatch(overview, UUID, 'class overview must not show a raw id'); assert.doesNotMatch(overview, RAW_ID);
  assert.doesNotMatch(overview, /\bfalse\b|undefined|\[object/i);
  // Real counts only: three profiles were issued.
  assert.equal(await page.$eval('#class-students .stat strong', e => e.textContent), '3');
  // Student profile IDs are an intentional feature and stay visible in student management.
  assert.match(await visibleText(page, '#class-students table'), UUID);
  // Troubleshooting details hold the technical id, collapsed by default.
  assert.equal(await page.$eval('#class-troubleshooting', e => e.closest('details').open), false);
  assert.match(await page.$eval('#class-troubleshooting', e => e.textContent), new RegExp(seeded.classId));
  // The pathway link opens that class.
  assert.match(await page.$eval('#class-overview a.btn.primary', a => a.getAttribute('href')), new RegExp('/pacing/\\?class=' + seeded.classId));

  // Pathways view lists classes by name with status.
  await page.evaluate(() => { location.hash = '#pathways'; });
  const list = await visibleText(page, '#pathway-class-list');
  assert.match(list, /CS Games Test/); assert.match(list, /Pathway published/); assert.doesNotMatch(list, UUID);

  // Archived classes no longer print the stray text "false".
  const archived = await svc.api('/teacher/profiles', { title: 'Old class', courseId: 'robotics' });
  await svc.api(`/teacher/profiles/${archived.id}/archive`, {});
  await page.evaluate(() => { location.hash = '#classes'; });
  await clickByText(page, '#wpr-teacher-profiles', 'Refresh classes');
  await page.waitForFunction(() => [...document.querySelectorAll('.class-card')].some(c => c.textContent.includes('Old class')));
  await page.evaluate(() => [...document.querySelectorAll('.class-card')].find(c => c.textContent.includes('Old class')).click());
  await page.waitForFunction(() => document.querySelector('#class-overview')?.innerText.includes('Archived'));
  assert.doesNotMatch(await visibleText(page, '#class-overview'), /\bfalse\b/);
  assert.deepEqual(errors, []);
});

test('Teacher Tools: accessible views, readable contrast, keyboard focus', { timeout: 120000 }, async t => {
  const svc = await service(t);
  await seedClass(svc.api);
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(svc.url + '/cs-games/teacher/#classes', { waitUntil: 'load' });
  await signInHub(page);
  await page.click('.class-card');
  await page.waitForSelector('#class-students table');
  for (const view of ['classes', 'practice', 'pathways']) {
    await page.evaluate(v => { location.hash = v; }, view);
    await page.waitForFunction(v => !document.getElementById(v).hidden, {}, view);
    assert.deepEqual(await axeViolations(page, '#' + view), [], `${view} view has accessibility or contrast violations`);
  }
  // The dark CS Games theme is applied (matches ../styles.css --bg).
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(12, 23, 34)');
  // Keyboard: skip link works, tab bar is reachable and shows a visible focus ring.
  // No #fragment: Chromium starts Tab navigation from a fragment's target, which would skip the skip link.
  await page.goto('about:blank');
  await page.goto(svc.url + '/cs-games/teacher/', { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  let ring = null;
  for (let i = 0; i < 12 && !ring; i++) {
    await page.keyboard.press('Tab');
    ring = await page.evaluate(() => { const a = document.activeElement; if (!a.closest('#teacher-sections') || a.tagName !== 'A') return null; const s = getComputedStyle(a); return { w: parseFloat(s.outlineWidth), style: s.outlineStyle, text: a.textContent.trim() }; });
  }
  assert.ok(ring, 'a section link received keyboard focus');
  assert.ok(ring.style !== 'none' && ring.w >= 2, `focus ring on "${ring.text}" is not visible`);
  await page.keyboard.press('Enter');
  assert.ok(await page.evaluate(() => location.hash.length > 1));
});

test('Pathway editor: dark theme, four stages, readable labels, responsive at 390/768/1280', { timeout: 150000 }, async t => {
  const svc = await service(t);
  const seeded = await seedClass(svc.api);
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const url = svc.url + '/cs-games/teacher/pacing/?class=' + seeded.classId;
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: 'load' });
  await signInEditor(page);
  await page.waitForFunction(() => document.querySelector('#page-title').textContent === 'CS Games Test', { timeout: 10000 });

  // Same dark theme as the rest of CS Games.
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(12, 23, 34)');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.card')).backgroundColor), 'rgb(21, 37, 54)');
  // Section bar matches Teacher Tools and marks Learning Pathways.
  assert.deepEqual(await page.$$eval('.tt-bar a', a => a.map(x => x.textContent.trim())), ['My Classes', 'Practice & Assessments', 'Learning Pathways']);
  assert.equal(await page.$eval('.tt-bar a[aria-current]', a => a.textContent.trim()), 'Learning Pathways');

  // Human-readable header and status; no ids.
  const head = await visibleText(page, '.page-head');
  assert.match(head, /CS Games Test/); assert.match(head, /Advanced Computer Science/); assert.doesNotMatch(head, UUID);
  const chips = await visibleText(page, '#revision-badge');
  assert.match(chips, /Unpublished changes/); assert.match(chips, /Draft saved/); assert.match(chips, /Last published/);
  assert.doesNotMatch(chips, UUID); assert.doesNotMatch(chips, /Class [0-9a-f]{8}/);

  // Four stages, one at a time, in order.
  assert.deepEqual(await page.$$eval('#stepper button strong', b => b.map(x => x.textContent)), ['Class & Calendar', 'Learning Goals', 'Pacing Guide', 'Review & Publish']);
  for (const name of ['calendar', 'goals', 'pacing', 'review']) {
    await page.click(`#stepper button[data-stage="${name}"]`);
    await page.waitForFunction(n => !document.getElementById('stage-' + n).hidden, {}, name);
    assert.equal(await page.$$eval('[data-stage-panel]:not([hidden])', s => s.length), 1);
    assert.equal(await page.$eval('#stepper [aria-current]', b => b.dataset.stage), name);
    const text = await page.$eval('#stage-' + name, e => e.innerText);
    assert.doesNotMatch(text, UUID, `${name}: raw id visible`); assert.doesNotMatch(text, RAW_ID, `${name}: raw node/checkpoint id visible`);
  }
  // Technical identifiers are available, but only inside the collapsed troubleshooting area.
  assert.equal(await page.$eval('#tools', d => d.open), false);
  assert.match(await page.$eval('#troubleshoot', e => e.textContent), new RegExp(seeded.classId));

  // Layout at the three required widths, every stage.
  for (const [w, h] of WIDTHS) {
    await page.setViewport({ width: w, height: h });
    for (const name of ['calendar', 'goals', 'pacing', 'review']) {
      await stage(page, name);
      assert.ok(await overflow(page) <= 0, `${name} stage overflows horizontally at ${w}px by ${await overflow(page)}px`);
      // Touch-friendly: every visible control is at least 40px tall (checkbox rows sit in 44px labels).
      const small = await page.evaluate(() => [...document.querySelectorAll('#main button, #main select, #main input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), #main a.btn')].filter(e => e.offsetWidth && e.offsetHeight && e.getBoundingClientRect().height < 40).map(e => (e.getAttribute('aria-label') || e.textContent || e.name).trim().slice(0, 40)));
      assert.deepEqual(small, [], `${name} at ${w}px has controls under 40px tall`);
    }
  }
  // Phones show table rows as labelled cards.
  await page.setViewport({ width: 390, height: 844 });
  await stage(page, 'goals');
  const mobile = await page.evaluate(() => { const td = document.querySelector('#node-table td:nth-child(2)'); return { display: getComputedStyle(td).display, label: td.dataset.label }; });
  assert.notEqual(mobile.display, 'table-cell'); assert.equal(mobile.label, 'Minutes');
  // Learning goals are grouped by area, so a phone is not handed 100+ cards at once.
  assert.ok(await page.$$eval('#node-table details', d => d.length) > 3);
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight) < 12000, 'goals stage is excessively long on a phone');
  assert.deepEqual(errors, []);
});

test('Pathway editor: accessibility and contrast for every stage', { timeout: 150000 }, async t => {
  const svc = await service(t);
  const seeded = await seedClass(svc.api);
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(svc.url + '/cs-games/teacher/pacing/?class=' + seeded.classId, { waitUntil: 'load' });
  await signInEditor(page);
  await page.waitForFunction(() => document.querySelector('#page-title').textContent === 'CS Games Test');
  // Open the secondary sections too, so hidden-by-default controls are checked.
  await page.evaluate(() => document.querySelectorAll('details.more').forEach(d => { d.open = true; }));
  for (const name of ['calendar', 'goals', 'pacing', 'review']) {
    await stage(page, name);
    assert.deepEqual(await axeViolations(page, '#main'), [], `${name} stage has accessibility or contrast violations`);
  }
  // Keyboard: the stepper is operable and shows a focus ring.
  await page.evaluate(() => { document.activeElement.blur(); document.querySelector('#stepper button').focus(); });
  await page.keyboard.press('Tab'); await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift'); // keyboard modality, so :focus-visible applies
  assert.equal(await page.evaluate(() => document.activeElement.closest('#stepper') !== null), true);
  const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { w: parseFloat(s.outlineWidth), style: s.outlineStyle }; });
  assert.ok(ring.style !== 'none' && ring.w >= 2, 'stepper focus ring is not visible');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#goals' || location.hash === '#pacing' || location.hash.length > 1);
});

test('Pathway editor: weekday checkboxes, A/B schedule and known-day anchor drive the existing calendar fields', { timeout: 120000 }, async t => {
  const svc = await service(t);
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(svc.url + '/cs-games/teacher/pacing/', { waitUntil: 'load' });
  const stored = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cs-games:teacher-pathways:v1')); return s.classes[s.selected].draft.calendar; });
  const meetings = () => page.$eval('#capacity .stat strong', e => Number(e.textContent));
  const apply = async () => { await page.click('#settings button[type=submit]'); await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Settings saved'), { timeout: 10000 }); };
  const startMeetings = await meetings();
  const initial = await stored();
  assert.deepEqual([initial.weekdays, initial.rotation, initial.classRotations], [[1, 2, 3, 4, 5], ['A', 'B'], []]);
  assert.equal(await page.$eval('input[name=scheduleMode]:checked', r => r.value), 'ab', 'an existing A/B class is recognised');

  // Saving without touching anything must not rewrite the stored calendar.
  await apply();
  assert.deepEqual(await stored(), initial);

  // Selected weekdays: uncheck Friday → stored weekdays [1,2,3,4].
  await page.click('input[name=scheduleMode][value=weekdays]');
  assert.equal(await page.$eval('#ab-panel', e => e.hidden), true);
  await page.click('#weekday-picker label:nth-child(5)');
  assert.match(await page.$eval('#schedule-summary', e => e.textContent), /Mon, Tue, Wed, Thu · 80 minutes/);
  await apply();
  const weekdays = await stored();
  assert.deepEqual([weekdays.weekdays, weekdays.rotation], [[1, 2, 3, 4], []]);
  const fourDay = await meetings();
  assert.ok(fourDay < startMeetings, 'dropping Friday reduces class meetings');

  // A/B block, class meets on A days only, with a known B-day anchor.
  await page.click('input[name=scheduleMode][value=ab]');
  await page.click('#weekday-picker label:nth-child(5)');
  await page.click('#ab-picker label:nth-child(2)');
  await page.$eval('input[name=anchorDate]', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, '2026-08-11');
  await page.select('select[name=anchorLabel]', 'B');
  assert.match(await page.$eval('#schedule-summary', e => e.textContent), /meets on A days/);
  await apply();
  const ab = await stored();
  assert.deepEqual([ab.rotation, ab.classRotations, ab.weekdays], [['A', 'B'], ['A'], [1, 2, 3, 4, 5]]);
  assert.equal(ab.rotationOffset, 0, 'with offset 0, Aug 11 (the second school day) is already a B day');
  assert.ok(await meetings() < startMeetings * 0.6 && await meetings() > startMeetings * 0.4, 'an A-day class meets about half the school days');

  // Moving the anchor: calling Aug 11 an A day shifts the rotation by one.
  await page.$eval('input[name=anchorDate]', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, '2026-08-11');
  await page.select('select[name=anchorLabel]', 'A');
  await apply();
  assert.equal((await stored()).rotationOffset, 1);
  // Advanced settings keep the raw offset available.
  assert.equal(await page.$eval('input[name=offset]', e => e.value), '1');
  assert.equal(await page.$eval('input[name=offset]', e => e.closest('details').open), false);

  // Impossible choices explain themselves instead of silently saving.
  await page.$eval('input[name=anchorDate]', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, '2026-08-15');
  await page.click('#settings button[type=submit]');
  await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('not a school day'), { timeout: 5000 });
  assert.equal(await page.$eval('#status', e => e.classList.contains('bad')), true);

  // Every school day clears the rotation completely.
  await page.click('input[name=scheduleMode][value=every]');
  await page.$eval('input[name=anchorDate]', e => { e.value = ''; });
  await apply();
  const every = await stored();
  assert.deepEqual([every.weekdays, every.rotation, every.classRotations, every.rotationOffset], [[1, 2, 3, 4, 5], [], [], 0]);
  assert.deepEqual(errors, []);
});

test('Pathway editor: searchable skill picker keeps the node-id data contract', { timeout: 120000 }, async t => {
  const svc = await service(t);
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(svc.url + '/cs-games/teacher/pacing/', { waitUntil: 'load' });
  await page.evaluate(() => document.querySelectorAll('#stage-calendar details.more').forEach(d => { d.open = true; }));
  await page.type('#assess-search', 'nested loop');
  const rows = await page.$$eval('#assess-list li label', l => l.map(x => x.innerText));
  assert.ok(rows.length >= 1 && rows.length < 10, 'search narrows the list');
  assert.ok(rows.every(r => /nested|loop/i.test(r)));
  assert.doesNotMatch(rows.join(' '), RAW_ID, 'the picker shows skill names, not ids');
  await page.click('#assess-list li label input');
  const id = await page.$eval('input[name=assessmentNodes]', e => e.value);
  assert.match(id, /^node:advanced:loop-lab:/, 'the stored value is still the existing node id');
  assert.equal(await page.$$eval('#assess-selected .chip', c => c.length), 1);
  await page.$eval('#day-edit [name=from]', e => { e.value = '2026-09-10'; });
  await page.$eval('#day-edit [name=to]', e => { e.value = '2026-09-10'; });
  await page.select('#day-edit [name=type]', 'Quiz / Testing');
  await page.click('#day-edit button[type=submit]');
  await page.waitForFunction(() => document.querySelector('#override-count').textContent.startsWith('1 special'), { timeout: 10000 });
  const override = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cs-games:teacher-pathways:v1')); return s.classes[s.selected].draft.calendar.overrides.find(o => o.date === '2026-09-10'); });
  assert.deepEqual(override.assessmentNodeIds, [id]);
  assert.equal(override.dayType, 'Quiz / Testing');
  assert.equal(await page.$$eval('#assess-selected .chip', c => c.length), 0, 'selection resets after applying');
  // The override table shows readable dates.
  assert.match(await page.$eval('#overrides', e => e.innerText), /Sep 10, 2026/);
});

test('Pathway editor: draft, unpublished-change, published and publication-error states stay distinct; publish behaviour is unchanged', { timeout: 150000 }, async t => {
  const svc = await service(t);
  const seeded = await seedClass(svc.api);
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(svc.url + '/cs-games/teacher/pacing/?class=' + seeded.classId, { waitUntil: 'load' });
  await signInEditor(page);
  await page.waitForFunction(() => document.querySelector('#revision-badge')?.innerText.includes('Unpublished changes'), { timeout: 10000 });
  const head = () => svc.db.prepare('SELECT head FROM class_pathways WHERE id=?').get(seeded.pathwayId).head;
  assert.equal(head(), 1);
  await stage(page, 'review');
  assert.match(await visibleText(page, '#pub-summary'), /Unpublished changes/);
  assert.match(await visibleText(page, '#pub-summary'), /Students still see the published pathway/);
  assert.equal(await page.$eval('#publish', b => b.disabled), true, 'publishing requires a preview first');
  assert.equal(await page.$eval('#publish-error', e => e.hidden), true);

  // A failed publication is reported as such, in the stage and the status chips, and changes nothing.
  await page.setRequestInterception(true);
  let failPublish = true;
  page.on('request', r => { if (failPublish && r.url().endsWith('/publish')) r.respond({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Another teacher session changed this class. Reload and try again.' }) }); else r.continue(); });
  await page.click('#preview');
  await page.waitForFunction(() => !document.getElementById('publish').disabled, { timeout: 15000 });
  assert.match(await visibleText(page, '#changes'), /Minutes/, 'the changes table uses plain labels');
  assert.doesNotMatch(await visibleText(page, '#changes'), RAW_ID);
  await page.click('#publish');
  await page.waitForFunction(() => !document.getElementById('publish-error').hidden, { timeout: 10000 });
  assert.match(await visibleText(page, '#publish-error'), /Publication error/);
  assert.match(await visibleText(page, '#publish-error'), /Another teacher session changed this class/);
  assert.match(await visibleText(page, '#revision-badge'), /Publication error/);
  assert.equal(await page.$eval('#status', e => e.getAttribute('role')), 'alert');
  assert.equal(head(), 1, 'a failed publish must not change the published revision');

  // Publishing succeeds once the failure clears.
  failPublish = false;
  await page.click('#publish');
  await page.waitForFunction(() => document.querySelector('#revision-badge').innerText.includes('Published'), { timeout: 15000 });
  assert.equal(head(), 2, 'publishing creates revision 2');
  assert.equal(await page.$eval('#publish-error', e => e.hidden), true, 'the error clears after success');
  assert.doesNotMatch(await visibleText(page, '#revision-badge'), /Publication error|Unpublished changes/);
  assert.match(await visibleText(page, '#pub-summary'), /Students see the published pathway\. Nothing is waiting to be published\./);
  assert.match(await visibleText(page, '#tracker'), /Students are up to date/);
  assert.equal(await page.$eval('#step-review-note', e => e.textContent), 'Published');

  // Editing after publishing flips back to unpublished changes and unsaved draft until saved.
  await stage(page, 'goals');
  await page.$eval('#node-table input[type=number]', e => { e.value = String(Number(e.value) + 5); e.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('#revision-badge').innerText.includes('Unpublished changes'), { timeout: 5000 });
  assert.match(await visibleText(page, '#revision-badge'), /Draft not saved yet/);
  await page.click('#save');
  await page.waitForFunction(() => document.querySelector('#revision-badge').innerText.includes('Draft saved'), { timeout: 10000 });
  assert.equal(head(), 2, 'saving a draft never publishes');

  // Rollback is still available (More tools) and still stages a draft instead of publishing.
  await page.evaluate(() => { document.querySelector('#tools').open = true; });
  await page.click('#history');
  await page.waitForFunction(() => document.querySelectorAll('#history-list button').length === 2, { timeout: 10000 });
  await page.evaluate(() => [...document.querySelectorAll('#history-list button')].find(b => b.textContent.includes('revision 1')).click());
  await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('restored as a draft'), { timeout: 10000 });
  assert.equal(head(), 2, 'rollback stages a draft; only a new publish moves the head');
  assert.deepEqual(errors.filter(e => !/409/.test(e)), []);
});

test('Pathway editor: exports, backup and copy remain available under More tools / Pacing Guide', { timeout: 120000 }, async t => {
  const svc = await service(t);
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(svc.url + '/cs-games/teacher/pacing/', { waitUntil: 'load' });
  for (const id of ['export-json', 'export-csv', 'export-ics', 'restore', 'copy', 'reload-shared', 'history', 'calendar-file', 'policy-form', 'add-node', 'area-up', 'area-down', 'optional-area', 'remove-area', 'local-publish', 'publish', 'preview']) {
    assert.ok(await page.$('#' + id), `#${id} still exists`);
  }
  // Unusual controls are tucked into collapsed sections rather than removed.
  for (const sel of ['#tools', '#policy-form', '#add-node', '#calendar-file', '#export-csv', 'input[name=timezone]']) {
    assert.equal(await page.$eval(sel, e => e.closest('details').open), false, `${sel} should be in a collapsed section`);
  }
  // Local-only mode: the local preview publish control is shown and the shared one is not.
  assert.equal(await page.$eval('#publish', e => e.hidden), true);
  assert.equal(await page.$eval('#local-publish', e => e.hidden), false);
  // Without sign-in the editor says so plainly and explains the separate sign-in.
  assert.match(await visibleText(page, '#connection'), /Sign in to save shared drafts/);
  assert.doesNotMatch(await visibleText(page, '#connection'), /sign in separately/);
});

test('teacher session survives class navigation, expires safely, and resumes unsaved calendar edits', {timeout: 90000}, async t=>{
  const svc=await service(t);
  const seeded=await seedClass(svc.api);
  const browser=await launch();t.after(()=>browser.close());
  const page=await browser.newPage();
  const hub=svc.url+'/cs-games/teacher/';
  await page.goto(hub);
  await signInHub(page);
  await page.click('.class-card');
  await page.waitForSelector('#class-students');
  const link=await page.$eval('#class-overview a.btn.primary',a=>a.href);
  await page.goto(link);
  await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.startsWith('Signed in'));
  assert.equal(await page.$('[name=teacher-key]'),null);
  assert.match(await visibleText(page,'#auth'),/Signed in as teacher/);
  await page.waitForSelector('#settings [name=minutes]',{visible:true});
  await page.$eval('#settings [name=minutes]',input=>{
    input.value='73';
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  svc.db.prepare('UPDATE teacher_sessions SET expires=?').run(Date.now()-1);
  await page.click('#save');
  await page.waitForSelector('#auth [name=teacher-key]',{visible:true});
  await signInEditor(page);
  assert.equal(await page.$eval('#settings [name=minutes]',input=>input.value),'73');
  await page.click('#save');
  await page.waitForFunction(()=>document.querySelector('#status').innerText.includes('Draft saved'));
  assert.equal(svc.db.prepare('SELECT head FROM class_pathways WHERE id=?').get(seeded.pathwayId).head,1);
  assert.equal(JSON.parse(svc.db.prepare('SELECT draft FROM class_pathways WHERE id=?').get(seeded.pathwayId).draft).calendar.minutes,73);
  await page.goto(hub+'?class='+seeded.classId+'#classes');
  await page.waitForSelector('#class-students',{visible:true});
  assert.equal(await page.$('[name=teacher-key]'),null);
  assert.equal(svc.db.prepare('SELECT COUNT(*) AS n FROM profile_classes').get().n,1);
  await clickByText(page,'#teacher-account','Sign out');
  await page.waitForSelector('#teacher-account [name=teacher-key]',{visible:true});
  assert.equal(await page.$eval('#wpr-teacher-profiles',root=>root.hidden),true);
});

test('integrated graph exposes new Advanced CS skills in the pathway assessment picker', {timeout: 30000}, async t=>{
  const svc=await service(t);
  const browser=await launch();t.after(()=>browser.close());
  const page=await browser.newPage();
  await page.goto(svc.url+'/cs-games/teacher/pacing/');
  await page.waitForSelector('#assess-search');
  await page.evaluate(()=>document.querySelectorAll('#stage-calendar details.more').forEach(d=>{d.open=true;}));
  for(const [label,id] of [
    ['Assemble a variable declaration','node:advanced:variable-lab:assemble'],
    ['Build a robot route program','node:advanced:robot-algorithms:build']
  ]){
    await page.$eval('#assess-search',input=>{input.value='';});
    await page.type('#assess-search',label);
    const control=await page.waitForSelector('#assess-list input',{visible:true});
    assert.match(await visibleText(page,'#assess-list'),new RegExp(label));
    assert.doesNotMatch(await visibleText(page,'#assess-list'),RAW_ID);
    await control.click();
    assert.ok((await page.$eval('input[name=assessmentNodes]',input=>input.value.split(','))).includes(id));
  }
});
