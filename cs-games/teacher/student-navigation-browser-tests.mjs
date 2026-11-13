import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require = createRequire(new URL('../../wpr-games/workplace-readiness/package.json', import.meta.url));
const { launch } = require('./tests/browser/harness.js');

test('course cards open course maps and search survives practice return', { timeout: 90000 }, async t => {
  const dev = await startDev({});
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  for (const course of ['csp', 'robotics', 'workplace', 'advanced']) {
    await page.goto(dev.url + '/cs-games/');
    await Promise.all([page.waitForNavigation(), page.click('.course-card a[href*="course=' + course + '"]')]);
    await page.waitForSelector('.map-app');
    assert.equal(new URL(page.url()).searchParams.get('course'), course);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), course);
  }

  const menu = '.student-nav-menu';
  await page.waitForSelector(menu);
  await page.focus(menu + ' summary');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval(menu, node => node.open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval(menu, node => node.open), false);
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'SUMMARY');

  const search = '#map-skill-search';
  const result = '.map-search-results li:first-child';
  await page.type(search, 'indexOf()');
  await page.waitForSelector(result);
  assert.match(await page.$eval(result, row => row.textContent), /Find String indices/);
  await page.focus(result + ' button');
  await page.keyboard.press('Enter');
  const skill = '.skill-panel[data-node-id="node:advanced:string-lab:index"]';
  await page.waitForSelector(skill);
  await page.focus('[data-layout=list]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.map-app[data-layout=list] ' + skill);
  assert.equal(await page.$eval(search, input => input.value), 'indexOf()');

  const source = new URL(page.url());
  await page.focus(result + ' a');
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  assert.equal(new URL(page.url()).searchParams.get('learner'), 'guest');
  await page.waitForSelector('a[data-profile-link]');
  await page.focus('a[data-profile-link]');
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  await page.waitForSelector('.map-app[data-layout=list] ' + skill);
  assert.equal(new URL(page.url()).hash, source.hash);
  assert.equal(await page.$eval(search, input => input.value), 'indexOf()');
  await page.$eval(search, input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.type(search, 'nonexistent concept');
  assert.match(await page.$eval('.map-skill-search [role=status]', node => node.textContent), /No matching skills/);
  for (const [width, height] of [[320, 720], [768, 1024], [1024, 768], [1366, 900]]) {
    await page.setViewport({ width, height });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + 'px');
  }
  const replaceSearch = async text => {
    await page.focus(search);
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.type(text);
  };
  for (const layout of ['map', 'list']) {
    await page.focus('[data-layout="' + layout + '"]');
    await page.keyboard.press('Enter');
    for (const [concept, title] of [
      ['remainder', /Modulus/], ['find index', /Find String indices/], ['substring', /String expressions/],
      ['nested loops', /Nested.loop/], ['parameters', /parameter shadowing/], ['conditional statements', /Follow the Branch/],
    ]) {
      await replaceSearch(concept);
      assert.match(await page.$eval(result, node => node.textContent), title, concept + ' in ' + layout);
    }
  }
  await page.select('#guest-course-switch', 'csp');
  assert.equal(new URL(page.url()).searchParams.get('course'), 'csp');
  for (const layout of ['map', 'list']) {
    await page.focus('[data-layout="' + layout + '"]');
    await page.keyboard.press('Enter');
    await replaceSearch('binary representation');
    assert.match(await page.$eval(result, node => node.textContent), /binary/i);
    assert.match(await page.$eval(result, node => node.textContent), /AP CSP/);
  }
});

test('enrolled search launches class practice and syncs a first attempt', { timeout: 90000 }, async t => {
  const token = 'synthetic-student-navigation-teacher';
  const dev = await startDev({ teacherTokens: { teacher: token } });
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  const response = await fetch(dev.url + '/api/wpr/teacher/profiles', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Student navigation test class', courseId: 'advanced' }),
  });
  assert.equal(response.status, 200);
  const classroom = await response.json();
  const page = await browser.newPage();
  await page.goto(dev.url + '/cs-games/student/#enroll=' + classroom.invite);
  const activate = async label => {
    const element = await page.waitForFunction(text =>
      [...document.querySelectorAll('#student-profile button')].find(button => button.textContent === text), {}, label);
    await element.evaluate(button => button.focus());
    await page.keyboard.press('Enter');
  };
  await activate('Enroll in this class');
  await page.waitForSelector('.wpr-profile-secret', { visible: true });
  await Promise.all([page.waitForNavigation(), activate('I saved my recovery credential')]);
  await page.waitForSelector('#map-skill-search');
  assert.match(await page.$eval('[data-student-navigation]', header => header.textContent), /My Class/);
  await page.type('#map-skill-search', 'modulus');
  const link = '.map-search-results li:first-child a';
  await page.waitForSelector(link);
  await page.focus(link);
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  assert.equal(new URL(page.url()).searchParams.get('learner'), null);
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'modulus');
  await page.click('button.choice');
  await page.click('#check');
  await page.waitForFunction(() => !Object.keys(localStorage).some(key => key.includes('.outbox.')));
  await page.waitForSelector('a[data-profile-link]');
  await page.focus('a[data-profile-link]');
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  await page.waitForSelector('.skill-panel[data-node-id="node:advanced:math-lab:modulus"]');
  assert.equal(await page.$eval('#map-skill-search', input => input.value), 'modulus');
  assert.equal(dev.db.prepare('SELECT COUNT(*) AS count FROM performance_events').get().count, 1);
});
