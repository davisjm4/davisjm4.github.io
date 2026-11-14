import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require = createRequire(new URL('../../wpr-games/workplace-readiness/package.json', import.meta.url));
const { launch } = require('./tests/browser/harness.js');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const teacherToken = 'synthetic-class-evidence-teacher';

test('teacher compares a 24-profile class, reviews one skill, records an official score and returns', { timeout: 90000 }, async t => {
  const dev = await startDev({ teacherTokens: { teacher: teacherToken, other: 'synthetic-other-teacher-token' } });
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });

  async function request(path, body, token = teacherToken, expected = 200) {
    const response = await fetch(dev.url + '/api/wpr' + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    assert.equal(response.status, expected, JSON.stringify(data));
    return data;
  }
  const classroom = await request('/teacher/profiles', { title: 'Synthetic comparison class', courseId: 'advanced' });
  const secondClass = await request('/teacher/profiles', { title: 'Second synthetic class', courseId: 'advanced' });
  const roster = '/teacher/profiles/' + classroom.id;
  const profiles = [];
  for (let i = 0; i < 24; i++) profiles.push(await request('/profile/enroll', { invite: classroom.invite }));
  async function seed(profile, attempted, correct) {
    const events = Array.from({ length: attempted }, (_, index) => {
      const questionId = crypto.randomUUID();
      return { version: 1, format: 'game-attempt', kind: 'practice', id: questionId + ':1', questionId,
        sessionId: crypto.randomUUID(), courseId: 'advanced', activity: 'loop-lab', mode: 'mixed',
        assessedMode: 'looptype', familyId: 'count-with-header', difficulty: 'beginner', attempt: 1,
        correct: index < correct, occurred: Date.now() };
    });
    events.push({ ...events[0], id: events[0].questionId + ':2', attempt: 2, correct: true });
    for(let offset=0;offset<events.length;offset+=25){
      const batch=events.slice(offset,offset+25);
      const result=await request('/profile/sync',{events:batch},profile.token);
      assert.equal(result.accepted.length,batch.length);
    }
  }
  await seed(profiles[0], 36, 10);
  await seed(profiles[1], 45, 44);
  await seed(profiles[2], 1, 0);
  await request(roster + '/progress', undefined, 'synthetic-other-teacher-token', 404);

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto(dev.url + '/cs-games/teacher/?class=' + classroom.id + '#classes');
  await page.type('[name=teacher-key]', teacherToken);
  async function pressText(selector, label) {
    const handle = await page.waitForFunction((selector, label) =>
      Array.from(document.querySelectorAll(selector)).find(node => node.textContent.trim() === label && node.offsetWidth && !node.disabled),
      {}, selector, label);
    await handle.evaluate(node => node.focus());
    await page.keyboard.press('Enter');
  }
  await pressText('#teacher-account button', 'Sign in to development service');
  await pressText('#class-progress button', 'Load skill comparison');
  const section = '#class-progress';
  await page.waitForSelector(section + ' .evidence-matrix table', { visible: true });
  const choose = (nth, value) => page.select(section + ' label:nth-child(' + nth + ') select', value);
  await choose(1, 'area:advanced:loop-lab');
  const nodeId = 'node:advanced:loop-lab:looptype';
  assert.deepEqual(await choose(2, nodeId), [nodeId]);

  const rowCount = () => page.$$eval(section + ' .evidence-matrix tbody tr', nodes => nodes.length);
  assert.equal(await rowCount(), 24);
  const matrixText = () => page.$eval(section + ' .evidence-matrix tbody', node => node.textContent);
  assert.match(await matrixText(), /10\/36 first try/);
  assert.match(await matrixText(), /44\/45 first try/);
  assert.match(await matrixText(), /No evidence/);
  for (const [value, count] of [['review', 1], ['sparse', 1], ['strong', 1], ['no-evidence', 21]]) {
    await choose(3, value);
    assert.equal(await rowCount(), count, value);
  }
  const filter = section + ' label:nth-child(3) select';
  await page.focus(filter);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.$eval(filter, node => node.value), 'review');
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => {
      blob.text().then(contents => { window.exportedSkill = contents; });
      return create(blob);
    };
  });
  await pressText(section + ' button', 'Export selected skill CSV');
  await page.waitForFunction(() => Boolean(window.exportedSkill));
  assert.match(await page.evaluate(() => window.exportedSkill), /pathway_revision[\s\S]*36,10,/);
  for (const width of [320, 390, 768, 1024, 1366]) {
    await page.setViewport({ width, height: 844 });
    const visible = width <= 720 ? '.evidence-list' : '.evidence-matrix';
    await page.waitForSelector(section + ' ' + visible, { visible: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + 'px');
  }
  if (process.env.CSG_COMPARISON_SCREENSHOTS) await page.screenshot({ path: process.env.CSG_COMPARISON_SCREENSHOTS + '/class-comparison-desktop.png' });
  await page.setViewport({ width: 390, height: 844 });
  if (process.env.CSG_COMPARISON_SCREENSHOTS) {
    await page.$eval(section + ' .evidence-list', node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: process.env.CSG_COMPARISON_SCREENSHOTS + '/class-comparison-phone.png' });
  }
  await page.evaluate(axeSource);
  const violations = await page.evaluate(async () => (await axe.run('#class-progress', {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  })).violations.map(({ id }) => id));
  assert.deepEqual(violations, []);

  const opener = section + ' .evidence-list button';
  await page.focus(opener);
  await page.keyboard.press('Enter');
  const report = '#wpr-profile-report';
  const form = report + ' form';
  await page.waitForSelector(form + ' select', { visible: true });
  assert.equal(await page.$eval(form + ' select', node => node.value), nodeId);
  assert.match(await page.$eval(report + ' section', node => node.textContent), /No assessment recorded/);
  await page.type(form + ' input[type=number]', '4');
  await pressText(form + ' button', 'Record assessment');
  await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('Teacher-reviewed score · 4/4'), {}, report);
  assert.equal(await page.$eval(form + ' [role=status]', node => node.textContent), 'Assessment recorded.');
  const saved = await request(roster + '/students/' + profiles[0].id);
  assert.equal(saved.verifiedEvidence.filter(row => row.kind === 'assessment').length, 1);
  assert.match(await page.$eval(report + " section", node => node.textContent), /Assessment history for this skill/);
  const learner = await request('/pathways/student/' + classroom.id, undefined, profiles[0].token);
  assert.equal(learner.pathway.nodes.find(node => node.id === nodeId).checkpoint.score, 4);
  await pressText(report + ' button', 'Back to skill comparison');
  assert.ok(await page.$eval(opener, node => node === document.activeElement));
  await page.click('.class-card:nth-child(1)');
  await page.waitForFunction(() => document.querySelector('#class-overview h3')?.textContent === 'Second synthetic class');
  assert.equal(new URL(page.url()).searchParams.get('class'), secondClass.id);
  assert.ok(!await page.$(section + ' .evidence-matrix'));
});
