import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch}=require('./tests/browser/harness.js');
const token='synthetic-pathway-participation-teacher';
const wait=(page,selector)=>page.waitForSelector(selector,{visible:true,timeout:10000});
async function activate(page,selector){
  await wait(page,selector);
  await page.focus(selector);
  await page.keyboard.press('Enter');
}
const named=(page,text)=>page.waitForFunction(text=>[...document.querySelectorAll('button')]
  .find(button=>button.textContent.trim()===text&&button.offsetWidth&&!button.disabled),{timeout:10000},text);
async function pressNamed(page,text){
  const button=await named(page,text);
  await button.evaluate(node=>node.focus());
  await page.keyboard.press('Enter');
}
const hasText=(page,selector,text)=>page.waitForFunction((selector,text)=>document.querySelector(selector)?.innerText.includes(text),{timeout:10000},selector,text);

test('a teacher publishes participation settings and the student can leave and return to the assigned pathway',{timeout:120000},async t=>{
  const dev=await startDev({teacherTokens:{teacher:token}});
  t.after(async()=>{await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
  const browser=await launch();
  t.after(()=>browser.close());
  const teacher=await browser.newPage();
  const student=await (await browser.createBrowserContext()).newPage();
  await teacher.setViewport({width:1280,height:900});
  await teacher.goto(dev.url+'/cs-games/teacher/');
  await wait(teacher,'[name=teacher-key]');
  await teacher.type('[name=teacher-key]',token);
  await pressNamed(teacher,'Sign in to development service');
  await wait(teacher,'[name=class-title]');
  await teacher.type('[name=class-title]','Synthetic participation browser');
  await teacher.select('[name=class-course]','advanced');
  await activate(teacher,'.class-preset-setup summary');
  const complex='[data-tier="complex-reasoning"] input[name=minimumQuestions]';
  async function editComplex(value){
    await teacher.focus(complex);
    await teacher.keyboard.down('Control');
    await teacher.keyboard.press('a');
    await teacher.keyboard.up('Control');
    await teacher.type(complex,value);
  }
  await editComplex('25');
  await pressNamed(teacher,'Create class');
  await hasText(teacher,'#wpr-teacher-profiles','only 21 different questions exist');
  await editComplex('19');
  await pressNamed(teacher,'Create class');
  const enrollment=await (await wait(teacher,'#class-overview a[href*="#enroll="]')).evaluate(node=>node.href);
  const classId=new URL(teacher.url()).searchParams.get('class');
  await teacher.goto(dev.url+'/cs-games/teacher/pacing/?class='+classId+'#goals');
  await hasText(teacher,'#stage-goals','Learning Areas & Skills');
  const loop='details[data-area-id="area:advanced:loop-lab"]';
  const math='details[data-area-id="area:advanced:math-lab"]';
  const optional='[id="participation-node:advanced:math-lab:division"]';
  const excluded='[id="participation-node:advanced:math-lab:modulus"]';
  await activate(teacher,loop+' summary');
  await activate(teacher,loop+' button[aria-label^="Exclude"]');
  await hasText(teacher,loop+' summary','Not included');
  await activate(teacher,math+' summary');
  await teacher.select(optional,'optional');
  await teacher.select(excluded,'excluded');
  assert.equal(await teacher.$eval(optional,n=>n.value),'optional');
  await teacher.setViewport({width:390,height:844});
  assert.ok(await teacher.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await teacher.setViewport({width:1280,height:900});
  await activate(teacher,'[data-go="review"]');
  await activate(teacher,'#preview');
  await hasText(teacher,'#changes','Excluded learning areas');
  await activate(teacher,'#publish');
  await hasText(teacher,'#pub-summary','Published');

  await student.setViewport({width:390,height:844});
  await student.goto(enrollment);
  await pressNamed(student,'Enroll in this class');
  await wait(student,'.wpr-profile-secret');
  await Promise.all([student.waitForNavigation(),pressNamed(student,'I saved my recovery credential')]);
  await wait(student,'[data-layout=list]');
  await activate(student,'[data-layout=list]');
  await hasText(student,'.map-summary','required learning areas complete');
  await activate(student,'[data-unit-id="advanced-foundations"]');
  await Promise.all([student.waitForNavigation(),activate(student,'[data-stop-id="area:advanced:math-lab"] [data-action=open-stop]')]);
  await wait(student,'select[aria-label="Current skill"]');
  const ids=await student.$$eval('select[aria-label="Current skill"] option',options=>options.map(o=>o.value));
  assert.ok(!ids.includes('node:advanced:loop-lab:looptype'));
  assert.ok(!ids.includes('node:advanced:math-lab:modulus'));
  assert.ok(ids.includes('node:advanced:math-lab:division'));
  assert.ok(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await Promise.all([student.waitForNavigation(),activate(student,'a[data-profile-link]')]);
  await Promise.all([student.waitForNavigation(),activate(student,'a[href="./guest/?course=advanced"]')]);
  await wait(student,'[data-layout=list]');
  await activate(student,'[data-layout=list]');
  await wait(student,'[data-unit-id="advanced-control"]');
  await activate(student,'[data-unit-id="advanced-control"]');
  await Promise.all([student.waitForNavigation(),activate(student,'[data-stop-id="area:advanced:loop-lab"] [data-action=open-stop]')]);
  await wait(student,'select[aria-label="Current skill"]');
  assert.ok(await student.$('option[value="node:advanced:loop-lab:looptype"]'));
  await Promise.all([student.waitForNavigation(),activate(student,'a[data-profile-link]')]);
  assert.doesNotMatch(await student.$eval('.map-summary',node=>node.textContent),/required learning areas complete/);
  await activate(student,'.student-nav-menu summary');
  await Promise.all([student.waitForNavigation(),activate(student,'.student-nav-menu a[href="/cs-games/student/"]')]);
  await hasText(student,'.map-summary','required learning areas complete');
});
