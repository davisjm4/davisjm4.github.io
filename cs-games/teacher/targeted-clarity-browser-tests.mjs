import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require = createRequire(new URL('../../wpr-games/workplace-readiness/package.json', import.meta.url));
const { launch } = require('./tests/browser/harness.js');
const teacherToken = 'synthetic-targeted-clarity-teacher';
const practice = '/java-games/variable-lab/?mode=trace&difficulty=advanced';
const guestMap = '/cs-games/student/guest/?course=advanced';
const screenshots = process.env.TARGETED_CLARITY_SCREENSHOTS;
if (screenshots) mkdirSync(screenshots, { recursive: true });

async function press(page, selector) {
  await page.waitForSelector(selector, { visible: true });
  await page.focus(selector);
  await page.keyboard.press('Enter');
}

async function pressText(page, selector, text) {
  const handle = await page.waitForFunction((sel, label) =>
    Array.from(document.querySelectorAll(sel)).find(element => element.textContent.trim() === label && element.offsetWidth && !element.disabled),
  {}, selector, text);
  await handle.evaluate(element => element.focus());
  await page.keyboard.press('Enter');
}

const sees = (page, selector, pattern) => page.waitForFunction((sel, source) =>
  new RegExp(source).test(document.querySelector(sel)?.textContent ?? ''), {}, selector, pattern.source);

async function screenshot(page, name) {
  if (screenshots) await page.screenshot({ path: join(screenshots, name + '.png') });
}

test('CSG-PKG-01 practice verdict, report counts, and safe return', { timeout: 90000 }, async t => {
  const dev = await startDev({});
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  const page = await browser.newPage();
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1024, 768], [1366, 768]]) {
    await page.setViewport({ width, height, isMobile: width <= 390, hasTouch: width <= 768 });
    await page.goto(dev.url + practice);
    await press(page, '#value-bank button');
    await press(page, '#check');
    const placement = await page.$eval('#feedback', verdict => {
      const check = document.querySelector('#check');
      const trace = document.querySelector('#execution');
      const rect = verdict.getBoundingClientRect();
      return {
        focused: document.activeElement === verdict,
        announced: verdict.getAttribute('role') === 'status',
        hasVerdict: /^(Correct|Incorrect)\b/.test(verdict.textContent),
        hasNext: verdict.textContent.includes('Next Challenge'),
        visible: rect.top >= -1 && rect.bottom <= innerHeight + 1,
        adjacent: verdict.previousElementSibling === check && rect.top - check.getBoundingClientRect().bottom < 120,
        precedesTrace: Boolean(verdict.compareDocumentPosition(trace) & Node.DOCUMENT_POSITION_FOLLOWING),
        hasTrace: !trace.hidden && trace.querySelectorAll('tbody tr').length > 0,
        fits: document.documentElement.scrollWidth <= innerWidth + 1,
      };
    });
    assert.ok(Object.values(placement).every(Boolean), width + 'px: ' + JSON.stringify(placement));
    await screenshot(page, 'variable-' + width);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'challenge-prompt');
    assert.equal(await page.$eval('#feedback', element => element.hidden), true);
  }

  await page.goto(dev.url + '/java-games/string-lab/');
  await press(page, '#summaryBtn');
  assert.ok(await page.$eval('#summaryBody', node =>
    !node.textContent.includes('undefined') &&
    [...node.querySelectorAll('table')][1].querySelector('tbody tr').cells[2].textContent === '0'));
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'summaryBtn');
  await page.waitForSelector('a[data-session-link]');
  assert.equal(await page.$eval('a[data-session-link]', link => new URL(link.href).pathname), '/java-games/session-summary/');

  await page.goto(dev.url + guestMap);
  await press(page, '[data-layout=list]');
  await press(page, '[data-stop-id="area:advanced:variable-lab"] button');
  await press(page, '.skill-row-open');
  const practiceLink = '.skill-panel a[data-action=practice]';
  const origin = new URL(page.url());
  await Promise.all([page.waitForNavigation(), press(page, practiceLink)]);
  assert.equal(new URL(page.url()).searchParams.get('learner'), 'guest');
  await page.waitForSelector('a[data-profile-link]');
  assert.equal(await page.$eval('a[data-profile-link]', link => link.textContent), 'Back to Course Map');
  await Promise.all([page.waitForNavigation(), press(page, 'a[data-profile-link]')]);
  assert.equal(new URL(page.url()).search, origin.search);
  assert.equal(new URL(page.url()).hash, origin.hash);
  await page.waitForSelector('.map-app[data-layout=list] .skill-panel');
  await page.reload();
  await page.waitForSelector('.map-app[data-layout=list] .skill-panel');

  const tampered = new URL(dev.url + practice);
  tampered.searchParams.set('learner', 'guest');
  tampered.searchParams.set('returnTo', '//example.org/cs-games/student/');
  await page.goto(tampered);
  await sees(page, 'a[data-profile-link]', /^Back to Course$/);
  assert.equal(await page.$eval('a[data-profile-link]', link => link.pathname), '/cs-games/advanced/');
  await sees(page, 'header + p', /original map link is unavailable/);
});

test('CSG-PKG-01 inline assessment handles an unsuccessful write and records a single verified result', { timeout: 90000 }, async t => {
  const dev = await startDev({ teacherTokens: { teacher: teacherToken } });
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  const page = await browser.newPage();
  const req = async (path, body) => {
    const response = await fetch(dev.url + '/api/wpr/teacher/profiles' + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + teacherToken, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.ok(response.ok, String(response.status));
    return response.json();
  };

  const classroom = await req('', { title: 'Synthetic clarity class', courseId: 'advanced' });
  const profile = await req('/' + classroom.id + '/students', {});
  const profilePath = '/' + classroom.id + '/students/' + profile.id;
  await page.goto(dev.url + '/cs-games/teacher/?class=' + classroom.id + '#classes');
  await page.type('[name=teacher-key]', teacherToken);
  await pressText(page, '#teacher-account button', 'Sign in to development service');
  await sees(page, '#class-pathway-status', /Students have access to the default pathway/);
  await pressText(page, '#class-students button', 'View progress');
  const form = '#wpr-profile-report form';
  const score = form + ' input[type=number]';
  const submit = form + ' button[type=submit]';
  await page.waitForSelector(score, { visible: true });
  await page.type(score, '4');
  await page.setRequestInterception(true);
  let fail = true;
  page.on('request', request => {
    if (fail && request.method() === 'POST' && request.url().endsWith('/evidence')) {
      fail = false;
      void request.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Try recording again.' }) });
    } else void request.continue();
  });
  await press(page, submit);
  await sees(page, form + ' [role=alert]', /Try recording again/);
  assert.equal(await page.$eval(score, input => input.value), '4');
  assert.equal((await req(profilePath)).verifiedEvidence.length, 0);

  for (const [width, height] of [[390, 844], [768, 1024], [1024, 768], [1366, 768]]) {
    await page.setViewport({ width, height });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'teacher layout at ' + width);
  }
  await page.setViewport({ width: 390, height: 844 });
  await press(page, submit);
  await sees(page, form + ' [role=status]', /Assessment recorded/);
  await sees(page, '#wpr-profile-report', /4\/4/);
  const placement = await page.$eval(form + ' [role=status]', status => {
    const button = status.previousElementSibling;
    const rect = status.getBoundingClientRect();
    return { button: button?.type, top: rect.top, bottom: rect.bottom, height: innerHeight };
  });
  assert.ok(placement.button === 'submit' && placement.top >= -1 && placement.bottom <= placement.height + 1, JSON.stringify(placement));
  assert.equal((await req(profilePath)).verifiedEvidence.filter(row => row.kind === 'assessment' && row.score === 4).length, 1);
  await screenshot(page, 'teacher-assessment-390');
});
