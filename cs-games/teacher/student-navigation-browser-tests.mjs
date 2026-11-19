import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require = createRequire(new URL('../../wpr-games/workplace-readiness/package.json', import.meta.url));
const { launch } = require('./tests/browser/harness.js');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

test('course cards open course maps and search survives practice return', { timeout: 90000 }, async t => {
  const dev = await startDev({});
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (!request.url().endsWith('/curriculum-graph.json')) return void request.continue();
    void fetch(request.url()).then(response => response.json()).then(graph => {
      const node = graph.nodes.find(item => item.id === 'node:advanced:math-lab:modulus');
      node.practice = [];
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(graph) });
    });
  });
  for (const course of ['csp', 'robotics', 'workplace', 'advanced']) {
    await page.goto(dev.url + '/cs-games/');
    await Promise.all([page.waitForNavigation(), page.click('.course-card a[href*="course=' + course + '"]')]);
    await page.waitForSelector('.map-app');
    assert.equal(new URL(page.url()).searchParams.get('course'), course);
    if(course==='robotics'){
      assert.equal(await page.$('.unit-node'),null);
      assert.ok(await page.$('.stop-open'));
    }
    else {
      const choices=await page.$$('.map-app .unit-node');
      assert.ok(choices.length>=4,course+' should expose at least four curricular groups, saw '+choices.length);
      if(course==='csp')assert.equal(choices.length,5);
      await choices[1].evaluate(node=>node.click());
      await page.waitForSelector('.map-app[data-view=unit] .stop-open');
      const next=await page.$$eval('.map-app .stop',nodes=>nodes.length);
      assert.ok(next>0&&next<30,'Opening a unit exposes its collection of areas');
      await page.reload();
      await page.waitForSelector('.map-app[data-view=unit] .stop-open');
      await page.$eval('[data-action=back]',button=>button.click());
      await page.waitForSelector('.map-app[data-view=course] .unit-node');
    }
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

  assert.equal(await page.$('.guest-pickup'), null, 'new learners see the shared recommendation');
  const search = '#map-skill-search';
  const result = '.map-search-results li:first-child';
  await page.type(search, 'indexOf()');
  await page.waitForSelector(result);
  await page.evaluate(axeSource);
  const violations = await page.evaluate(async () => (await window.axe.run(
    { include: ['[data-student-navigation]', '.map-skill-search'] },
    { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  )).violations.map(({ id, nodes }) => ({ id, elements: nodes.map(node => node.target) })));
  assert.deepEqual(violations, []);
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
      if (concept === 'remainder') {
        assert.match(await page.$eval(result, node => node.textContent), /Practice activity unavailable/);
        assert.equal(await page.$(result + ' a'), null);
      }
    }
  }
  // Course switching now happens from the Courses destination, not above the Advanced CS map.
  assert.equal(await page.$('#guest-course-switch'), null);
  await page.goto(dev.url + '/cs-games/');
  await Promise.all([page.waitForNavigation(), page.click('.course-card a[href*="course=csp"]')]);
  await page.waitForSelector('.map-app');
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
  await page.waitForSelector('.live-skill-progress',{visible:true});
  await page.click('button.choice');
  await page.click('#check');
  await page.waitForFunction(()=>document.querySelector('.live-skill-progress')?.innerText.includes('1 of'));
  await page.waitForFunction(() => !Object.keys(localStorage).some(key => key.includes('.outbox.')));
  await page.waitForSelector('a[data-profile-link]');
  await page.focus('a[data-profile-link]');
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  await page.waitForSelector('.skill-panel[data-node-id="node:advanced:math-lab:modulus"]');
  assert.equal(await page.$eval('#map-skill-search', input => input.value), 'modulus');
  assert.equal(dev.db.prepare('SELECT COUNT(*) AS count FROM performance_events').get().count, 1);
});

test('independent learner follows the unit trail and sees eligible practice, completion, and the next skill', {timeout:90000}, async t => {
  const {generateTrace} = await import('../../java-games/variable-lab/trace-adapter.js');
  const {guestEventFromAttempt} = await import('../student/guest/evidence.mjs');
  const {mkdirSync} = await import('node:fs');
  const dev = await startDev({});
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve=>dev.server.close(resolve)); dev.db.close(); });
  const page = await browser.newPage();
  const evidence = process.env.STUDENT_MAP_EVIDENCE;
  if (evidence) mkdirSync(evidence,{recursive:true});
  const wait = selector => page.waitForSelector(selector,{visible:true,timeout:10000});
  const activate = async (selector, label) => {
    const control = await page.waitForFunction((selector,label)=>[...document.querySelectorAll(selector)]
      .find(node=>node.innerText.includes(label) && node.offsetWidth),{timeout:10000},selector,label);
    await control.evaluate(node=>node.focus());
    await page.keyboard.press('Enter');
  };
  const map = dev.url+'/cs-games/student/guest/?course=advanced';
  const trace = '[data-node-id="node:advanced:variable-lab:trace"]';
  const parent = '[data-action=back]';
  await page.setViewport({width:390,height:844});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.goto(map);
  await wait('.unit-node');
  assert.equal(await page.$('.stop-open'),null);
  for (const [device,width,height] of [['desktop',1440,900],['chromebook',1366,768],['mobile',390,844]]) {
    await page.setViewport({width,height});
    await page.waitForFunction(() => {
      const viewport = document.querySelector('.map-viewport');
      const stage = viewport?.querySelector('.stage');
      return viewport && Math.abs(stage?.offsetWidth - viewport.clientWidth) <= 12 &&
        document.documentElement.scrollWidth <= innerWidth + 1;
    }, {timeout:5000});
    if(evidence)await page.screenshot({path:evidence+'/'+device+'-course.png'});
  }
  await activate('.unit-node','Foundations & Logic');
  await wait('.map-app[data-view=unit]');
  assert.match(new URL(page.url()).hash,/unit=advanced-foundations/);
  if(evidence)await page.screenshot({path:evidence+'/mobile-unit.png'});
  await activate('.stop-open','Variable Lab');
  await wait('.skill-node'+trace);
  if(evidence)await page.screenshot({path:evidence+'/mobile-area.png'});
  assert.equal(await page.evaluate(()=>document.activeElement.id),'map-heading');
  await activate('.skill-node','Trace variable state');
  await wait('.skill-panel'+trace);
  const skillUrl = page.url();
  await page.goBack();
  await wait('.skill-node'+trace);
  assert.equal(await page.$('.skill-panel'+trace),null);
  await page.goForward();
  await wait('.skill-panel'+trace);
  const timestamps = Date.now()-10000;
  const events = Array.from({length:10},(_,index)=>{
    const question = generateTrace({difficulty:'intermediate',seed:index+1});
    return guestEventFromAttempt('advanced',{
      id:'synthetic-trace-'+index,game:'variable-lab',mode:'mixed',submissions:1,topic:question.topic,
      details:{difficulty:question.difficulty,practiceMode:'trace',family:question.traceFamily}
    },index!==0,new Date(timestamps+index).toISOString());
  });
  async function setFixture(rows) {
    await page.evaluate(rows=>{
      const key = 'cs-games:guest:v1';
      const state = JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key,JSON.stringify({...state,events:rows}));
    },rows);
    if (page.url()===skillUrl) await page.reload(); else await page.goto(skillUrl);
    await wait('.skill-panel'+trace);
  }
  await setFixture(events.slice(0,5));
  assert.match(await page.$eval('.skill-panel .skill-target',node=>node.innerText),/5 of 8 qualifying answers/);
  const practice = '.skill-panel a[data-action=practice]';
  await wait(practice);
  await Promise.all([page.waitForNavigation(),activate(practice,'Continue practicing')]);
  await wait('.live-skill-progress progress');
  assert.ok(await page.$eval('.live-skill-progress',node=>Boolean(node.compareDocumentPosition(document.querySelector('#stage'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  assert.match(await page.$eval('.live-skill-progress',node=>node.innerText),/4 right on the first try/);
  await page.click('#value-bank [data-value]');
  await page.click('#check');
  await page.waitForFunction(()=>document.querySelector('.live-skill-progress')?.innerText.includes('6 of 8 qualifying answers'));
  if(evidence)await page.screenshot({path:evidence+'/mobile-practice.png'});
  await page.evaluate(axeSource);
  assert.deepEqual(await page.evaluate(async ()=>(await axe.run('.live-skill-progress',{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>v.id)),[]);
  await setFixture(events);
  assert.equal(await page.$eval('.skill-node'+trace,node=>node.dataset.state),'requirements-met');
  await wait('[data-action=next-learning]');
  assert.equal(await page.$eval('.skill-node[data-suggested=true]',node=>node.dataset.nodeId),'node:advanced:variable-lab:identify/type');
  assert.match(await page.$eval(practice,node=>node.innerText),/Optional Level 4/);
  await activate('.proficiency-details summary','How the proficiency levels');
  assert.match(await page.$eval('.proficiency-details',node=>node.innerText),/Level 2 · 0\/5 answers/);
  if(evidence)await page.screenshot({path:evidence+'/mobile-completed.png'});
  if(evidence){
    await page.setViewport({width:1440,height:900});
    await page.screenshot({path:evidence+'/desktop-completed.png'});
    await page.setViewport({width:390,height:844});
  }
  await page.evaluate(axeSource);
  assert.deepEqual(await page.evaluate(async ()=>(await axe.run('.map-app',{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>[v.id,v.nodes.map(n=>n.target)])),[]);
  await activate('[data-action=next-learning]','Next skill');
  assert.notEqual(await page.$eval('.skill-panel',node=>node.dataset.nodeId),'node:advanced:variable-lab:trace');
  await activate('.panel-close','Back to skills');
  await activate(parent,'Back to Foundations & Logic');
  await wait('.map-app[data-view=unit]');
  await activate('[data-layout=list]','List');
  await activate('.stop-item button','Open');
  await wait('.skill-row'+trace);
  await page.reload();
  await wait('.map-app[data-layout=list] .skill-row'+trace);
});

test('Array Lab uses Beginner for a fresh launch and honors explicit and saved difficulty', {timeout:60000}, async t => {
  const dev = await startDev({});
  const browser = await launch();
  t.after(async () => { await browser.close(); await new Promise(resolve=>dev.server.close(resolve)); dev.db.close(); });
  const page = await browser.newPage();
  const lab = dev.url+'/java-games/array-lab/';
  const read = async () => {
    await page.waitForSelector('#stage .challenge-meta');
    return page.$eval('#difficulty',node=>node.value);
  };
  await page.goto(lab+'?learner=guest');
  assert.equal(await read(),'Beginner');
  await page.select('#difficulty','Advanced');
  await page.reload();
  assert.equal(await read(),'Advanced');
  await page.goto(lab+'?difficulty=Intermediate&learner=guest');
  assert.equal(await read(),'Intermediate');
  await page.goto(lab+'?learner=guest');
  assert.equal(await read(),'Advanced');
});
