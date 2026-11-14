import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require = createRequire(new URL('../../wpr-games/workplace-readiness/package.json', import.meta.url));
const { launch } = require('./tests/browser/harness.js');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const day = '/cs-games/student/session/?course=advanced';

async function testPage(t, options = {}) {
  const dev = await startDev(options);
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  return { dev, page: await browser.newPage() };
}

const metrics = page => page.$$eval('.session-metrics dd', nodes => nodes.map(node => node.textContent));

async function answerModulus(page, url) {
  await page.goto(url + '/java-games/math-lab/?mode=modulus&learner=guest');
  await page.waitForSelector('button.choice');
  await page.click('button.choice');
  await page.click('#check');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('javaGames.session.v1'))?.totals.attempted === 1);
}

test('My Session preserves first attempts, print-only identity, guest history and legacy counts', { timeout: 90000 }, async t => {
  const { dev, page } = await testPage(t);
  const writes = [];
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
  await page.goto(dev.url + '/cs-games/student/guest/?course=advanced');
  await page.waitForSelector('.map-app');
  await answerModulus(page, dev.url);
  await page.goto(dev.url + '/java-games/session-summary/');
  await page.waitForFunction(() => document.querySelector('#report')?.textContent.includes('Math Lab'));
  await page.goto(dev.url + '/java-games/math-lab/?mode=modulus&learner=guest');
  const sharedEntry = 'a[data-my-session]';
  await page.waitForSelector(sharedEntry);
  await Promise.all([page.waitForNavigation(), page.click(sharedEntry)]);
  assert.equal(new URL(page.url()).searchParams.get('learner'), 'guest');
  await page.waitForSelector('.session-metrics');
  const initial = await metrics(page);
  assert.equal(initial[0], '1');
  assert.match(await page.$eval('.session-table', table => table.textContent), /Math Lab/);
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('cs-games:guest:v1')).events.length >= 1));

  for (const width of [320, 390, 768, 1024, 1366]) {
    await page.setViewport({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'viewport ' + width);
  }
  await page.evaluate(axeSource);
  const violations = await page.evaluate(async () => (await axe.run('#session-main', {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  })).violations.map(({ id }) => id));
  assert.deepEqual(violations, []);
  await page.evaluate(() => {
    window.print = () => { window.printed = document.getElementById('print-identity').textContent; };
    Object.defineProperty(navigator, 'clipboard', { value: { async writeText(value) { window.copiedSummary = value; } } });
  });
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  await page.type('#print-name', 'Sample Student');
  await page.type('#print-period', '6');
  const click = label => page.evaluate(label => [...document.querySelectorAll('button')].find(b => b.textContent === label).click(), label);
  await click('Print / Save as PDF');
  assert.equal(await page.evaluate(() => window.printed), 'Sample Student · Period 6');
  await page.emulateMediaType('print');
  assert.ok(await page.$eval('#print-identity', node => node.getClientRects().length > 0));
  assert.ok(await page.$eval('#print-name', node => node.getClientRects().length === 0));
  if (process.env.CSG_SESSION_PDF) await writeFile(process.env.CSG_SESSION_PDF, await page.pdf({ format: 'letter' }));
  await page.emulateMediaType('screen');
  await click('Copy summary');
  await page.waitForFunction(() => typeof window.copiedSummary === 'string');
  const copied = await page.evaluate(() => window.copiedSummary);
  assert.match(copied, /Math Lab/);
  assert.ok(!copied.includes('Sample Student'));
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), before);
  const backup = await page.evaluate(async () => {
    const { createGuestStore } = await import('/cs-games/student/guest/store.mjs');
    return createGuestStore({ storage: localStorage }).exportBackup();
  });
  assert.ok(!backup.includes('Sample Student'));
  assert.deepEqual(writes, []);

  await page.reload();
  await page.waitForSelector('.session-metrics');
  assert.deepEqual(await metrics(page), initial);
  assert.equal(await page.$eval('#print-name', node => node.value), '');
  const history = await page.evaluate(() => localStorage.getItem('cs-games:guest:v1'));
  await click("Reset today's report");
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Cancel');
  await page.keyboard.press('Escape');
  assert.deepEqual(await metrics(page), initial);
  await click("Reset today's report");
  await click('Reset report');
  assert.equal((await metrics(page))[0], '0');
  assert.equal(await page.evaluate(() => localStorage.getItem('cs-games:guest:v1')), history);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'reset-session');
  await page.evaluate(async () => {
    const { createSessionTracker } = await import('/java-games/session.js?v=guest-map-v1');
    const prior = new Date(Date.now() - 86400000).toISOString();
    const tracker = createSessionTracker({ storage: localStorage, now: () => prior });
    tracker.submit(tracker.begin('old', 'Yesterday game', 'focus', 'Focus'), true);
  });
  await page.reload();
  await page.waitForSelector('.session-metrics');
  assert.equal((await metrics(page))[0], '0');
  assert.equal(await page.evaluate(() => localStorage.getItem('cs-games:guest:v1')), history);
});

test('My Session reads legacy formats and isolates profile and independent reports in one browser', { timeout: 90000 }, async t => {
  const { dev, page } = await testPage(t);
  await page.goto(dev.url + '/cs-games/');
  await page.evaluate(async () => {
    const { createSessionTracker } = await import('/java-games/session.js?v=guest-map-v1');
    const guest = createSessionTracker({ storage: localStorage });
    guest.submit(guest.begin('guest-game', 'Independent game', 'focus', 'Focus'), true);
    const profile = { id: crypto.randomUUID(), token: 'a'.repeat(64), expires: Date.now() + 3600000, courseId: 'advanced' };
    const storage = {
      getItem: key => localStorage.getItem('wrg.profile.' + profile.id + '.' + key),
      setItem: (key, value) => localStorage.setItem('wrg.profile.' + profile.id + '.' + key, value),
    };
    const enrolled = createSessionTracker({ storage });
    enrolled.submit(enrolled.begin('class-game', 'Class game', 'focus', 'Focus'), false);
    localStorage.setItem('wrg.profile.active.v1', JSON.stringify(profile));
    localStorage.setItem('wrg.v1', JSON.stringify({
      version: 1, startedAt: Date.now() - 86400000, activeMs: 95000,
      stats: { completed: 4, firstAttemptCorrect: 3, byMode: { decision: { n: 4, c: 3 } } },
    }));
    localStorage.setItem('raceces-writing-games:v1:session', JSON.stringify({
      version: 1, started: Date.now(), activeMs: 70000,
      totals: { done: 2, correct: 1 }, byMode: { identify: { n: 2, ok: 1 } },
    }));
  });
  await page.goto(dev.url + day);
  await page.waitForSelector('.session-table');
  assert.match(await page.$eval('.session-table', table => table.textContent), /Class game/);
  assert.equal(await page.$('#print-name'), null);
  await page.click('a[href*="learner=guest"]');
  await page.waitForFunction(() => document.querySelector('.session-table')?.textContent.includes('Independent game'));
  assert.ok(await page.$('#print-name'));
  assert.equal(await page.$$eval('a[href="../#student-profile"]', links => links.length), 1);
  await page.goto(dev.url + '/cs-games/student/session/?course=workplace&learner=guest');
  await page.waitForSelector('.session-table');
  assert.deepEqual((await metrics(page)).slice(0, 3), ['4', '3', '75%']);
  assert.match(await page.$eval('#daily-report', node => node.textContent), /current activity session/);
  await page.goto(dev.url + '/cs-games/student/session/?course=raceces');
  await page.waitForSelector('.session-table');
  assert.deepEqual((await metrics(page)).slice(0, 3), ['2', '1', '50%']);
  assert.equal(await page.$('#reset-session'), null);
});

test('real AP CSP, Robotics, Workplace Readiness and RACECES practice reaches My Session', { timeout: 90000 }, async t => {
  const { dev, page } = await testPage(t);
  const route = '/cs-games/student/session/?course=';
  const activityLink = 'a[data-my-session]';
  const openReport = async (course, title) => {
    await page.waitForSelector(activityLink, { visible: true });
    await Promise.all([page.waitForNavigation(), page.click(activityLink)]);
    assert.equal(new URL(page.url()).pathname, '/cs-games/student/session/');
    assert.equal(new URL(page.url()).searchParams.get('course'), course);
    await page.waitForSelector('.session-table');
    assert.equal((await metrics(page))[0], '1');
    assert.match(await page.$eval('.session-table', table => table.textContent), title);
  };
  await page.goto(dev.url + '/csp-games/binary-builder/?mode=capacity&learner=guest');
  await page.waitForSelector('#capacity-answer', { visible: true });
  await page.type('#capacity-answer', '16');
  await page.type('#maximum-answer', '15');
  await page.click('#check');
  await openReport('csp', /Binary Builder/);

  await page.goto(dev.url + '/cs-games/robotics/parts-sprint/?learner=guest');
  await page.waitForFunction(() => document.getElementById('category').options.length > 1);
  await page.click('#start');
  await page.waitForSelector('#answers button', { visible: true });
  await page.click('#answers button');
  await openReport('robotics', /Parts Sprint/);

  await page.goto(dev.url + '/wpr-games/workplace-readiness/?learner=guest');
  await page.waitForSelector('#opt-mode', { visible: true });
  await page.select('#opt-mode', 'decision');
  await page.click('#btn-start');
  await page.waitForSelector('.choice', { visible: true });
  await page.click('.choice');
  await page.click('#btn-check');
  await openReport('workplace', /Workplace Readiness/);

  await page.goto(dev.url + '/wpr-games/raceces/?learner=guest#/identify');
  await page.waitForSelector('button.sent', { visible: true });
  await page.click('button.sent');
  await page.click('#check-btn');
  await openReport('raceces', /RACECES/);
  await page.goto(dev.url + route + 'csp&learner=guest');
  await page.waitForSelector('.session-table');
  assert.equal((await metrics(page))[0], '1');
});

test('activity reports retain the original String Lab copy and Search & Sort restart', { timeout: 90000 }, async t => {
  const { dev, page } = await testPage(t);
  await page.goto(dev.url + '/java-games/string-lab/?learner=guest');
  await page.waitForSelector('#choice0', { visible: true });
  await page.click('#choice0');
  await page.click('#checkBtn');
  await page.click('#summaryBtn');
  await page.waitForSelector('#summaryDlg[open]', { visible: true });
  const summary = await page.$eval('#summaryBody', node => node.textContent);
  assert.match(summary, /By difficulty/);
  assert.match(summary, /By skill/);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { async writeText(value) { window.copiedLegacy = value; } } });
  });
  await page.click('#copyBtn');
  await page.waitForFunction(() => Boolean(window.copiedLegacy));
  const copy = await page.evaluate(() => JSON.parse(window.copiedLegacy));
  assert.equal(copy.attempted, 1);
  assert.ok(copy.byDifficulty);

  await page.goto(dev.url + '/java-games/search-sort-lab/?learner=guest');
  await page.waitForSelector('#choices button', { visible: true });
  await page.click('#choices button');
  await page.click('#submit');
  await page.click('#summary-toggle');
  await page.waitForSelector('#summary:not([hidden])');
  assert.match(await page.$eval('#summary-body', node => node.textContent), /By difficulty/);
  await page.click('#restart');
  await page.waitForSelector('#restart-dialog[open]');
  await page.click('#restart-confirm');
  assert.match(await page.$eval('#summary-body', node => node.textContent), /No answers yet/);
  await page.goto(dev.url + day);
  await page.waitForSelector('.session-table');
  assert.match(await page.$eval('.session-table', table => table.textContent), /Search & Sort Lab/);
  assert.equal((await metrics(page))[0], '2');
});
