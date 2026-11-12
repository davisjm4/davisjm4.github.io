import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createLoopSession,DIFFICULTIES} from '../../../java-games/loop-lab/loop-engine.js';
import {startDev} from '../../../wpr-games/workplace-readiness/service/dev.mjs';

const require=createRequire(new URL('../../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch}=require('./tests/browser/harness.js');
const axeSource=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const token='synthetic-mastery-browser-teacher';
const stopButton='.stop-open[data-stop-id="area:advanced:loop-lab"]';
const skillButton='.skill-node[data-node-id="node:advanced:loop-lab:looptype"]';
const panel='.skill-panel[data-node-id="node:advanced:loop-lab:looptype"]';
const focusLink=panel+' a[data-action=practice]';
const wait=(page,selector)=>page.waitForSelector(selector,{visible:true,timeout:10000});
async function activate(page,selector){
  await wait(page,selector);
  await page.focus(selector);
  await page.keyboard.press('Enter');
}
async function byText(page,scope,text){
  const handle=await page.waitForFunction((scope,text)=>[...document.querySelectorAll(scope+' button, '+scope+' a')]
    .find(node=>node.textContent.trim()===text&&node.offsetWidth&&!node.disabled),{timeout:10000},scope,text);
  await handle.evaluate(node=>node.focus());
  await page.keyboard.press('Enter');
}
const see=(page,selector,text)=>page.waitForFunction((selector,text)=>document.querySelector(selector)?.innerText.includes(text),{timeout:10000},selector,text);

test('published requirements and real Loop Lab practice appear in the student map', {timeout:120000},async t=>{
  const dev=await startDev({teacherTokens:{teacher:token}});
  const browser=await launch();
  t.after(async()=>{await browser.close();await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
  const teacher=await browser.newPage();
  const student=await (await browser.createBrowserContext()).newPage();
  await teacher.setViewport({width:1280,height:900});
  await teacher.goto(dev.url+'/cs-games/teacher/');
  await wait(teacher,'[name=teacher-key]');
  await teacher.type('[name=teacher-key]',token);
  await byText(teacher,'#teacher-account','Sign in to development service');
  await wait(teacher,'[name=class-title]');
  await teacher.type('[name=class-title]','Period 5 Advanced CS');
  await teacher.select('[name=class-course]','advanced');
  await byText(teacher,'#wpr-teacher-profiles','Create class');
  const enrollment=await (await wait(teacher,'#class-overview a[href*="#enroll="]')).evaluate(node=>node.href);
  await student.goto(enrollment);
  await byText(student,'#student-profile','Enroll in this class');
  const recovery=await (await wait(student,'.wpr-profile-secret')).evaluate(node=>node.textContent);
  await Promise.all([student.waitForNavigation(),byText(student,'#student-profile','I saved my recovery credential')]);
  await see(student,'#student-pathway','Self-paced');
  assert.equal(await student.$('.practice-challenge'),null);

  await Promise.all([teacher.waitForNavigation(),activate(teacher,'#class-overview a[href*="/requirements/"]')]);
  await wait(teacher,'.mreq');
  assert.equal(await teacher.$('[name=teacher-key]'),null);
  await teacher.type('input[aria-label="Minimum questions"]','30');
  await teacher.type('input[aria-label="Required accuracy as a percentage"]','90');
  await byText(teacher,'.mreq','Save class defaults');
  await see(teacher,'.mreq-status','Class defaults saved to the draft.');
  const evidence=process.env.MASTERY_EVIDENCE_DIR;
  if(evidence)mkdirSync(evidence,{recursive:true});
  const widths=[[390,844],[768,1024],[1280,900]];
  async function checkLayouts(page,name,selector){
    for(const [width,height] of widths){
      await page.setViewport({width,height});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' overflows at '+width+'px');
      if(evidence){
        await page.$eval(selector,node=>node.scrollIntoView({block:'start',behavior:'instant'}));
        await page.screenshot({path:join(evidence,name+'-'+width+'.png')});
      }
    }
  }
  await checkLayouts(teacher,'teacher-class-requirements','.mreq-panel');
  await teacher.evaluate(axeSource);
  const violations=()=>teacher.evaluate(async ()=>(await axe.run('.mreq',{runOnly:['wcag2a','wcag2aa']})).violations.map(v=>[v.id,v.nodes.map(n=>n.target)]));
  assert.deepEqual(await violations(),[]);
  await activate(teacher,'[data-tab=review]');
  const acknowledgement=await teacher.$('.mreq-panel input[type=checkbox]');
  if(acknowledgement)await acknowledgement.click();
  await byText(teacher,'.mreq','Save draft');
  await see(teacher,'.mreq-status','Draft saved');
  await student.reload();
  await see(student,'#student-pathway','Self-paced');
  assert.equal(await student.$('.practice-challenge'),null);
  await byText(teacher,'.mreq','Publish requirements');
  await see(teacher,'.mreq-status','Published version 2');

  const showLoop=async()=>{
    await wait(student,'#student-pathway .map-app');
    if(await student.$(skillButton)===null)await activate(student,stopButton);
    if(await student.$(panel)===null)await activate(student,skillButton);
    await wait(student,panel+' .checks');
  };
  await student.reload();
  await showLoop();
  const card=()=>student.$eval(panel,node=>node.textContent);
  assert.match(await card(),/30 questions answered and 90% right on the first try/);

  async function answer(mode){
    await wait(student,'#choices button');
    assert.equal(await student.$eval('#mode',node=>node.value),mode);
    await student.click('#choices button');
    await activate(student,'#check');
    await student.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
  }
  await Promise.all([student.waitForNavigation(),activate(student,focusLink)]);
  await answer('looptype');
  await Promise.all([student.waitForNavigation(),activate(student,'a[data-profile-link]')]);
  await showLoop();
  assert.match(await card(),/1 of the 30 required questions/);

  const mixedLink=await student.$eval(panel+' a[data-action=mixed]',link=>link.href);
  // Fix only the generator seed. The real Mixed Practice engine still draws and scores the question.
  for(const assessed of ['looptype','components']){
    const seed=Array.from({length:200},(_,i)=>i+1).find(seed=>
      createLoopSession({seed}).next({mode:'mixed',difficulty:DIFFICULTIES[0]}).mode===assessed);
    assert.ok(seed);
    const seedHook=await student.evaluateOnNewDocument(seed=>{
      if(!location.pathname.startsWith('/java-games/loop-lab/'))return;
      const random=crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues=values=>{
        if(values instanceof Uint32Array&&values.length===1){values[0]=seed;return values;}
        return random(values);
      };
    },seed);
    const testLink=new URL(mixedLink);
    testLink.searchParams.set('test','1');
    await student.goto(testLink.href);
    await student.waitForFunction(()=>window.__loopLab?.q);
    await student.removeScriptToEvaluateOnNewDocument(seedHook.identifier);
    assert.equal(await student.evaluate(()=>window.__loopLab.q.mode),assessed);
    await answer('mixed');
    await Promise.all([student.waitForNavigation(),activate(student,'a[data-profile-link]')]);
    await showLoop();
  }
  assert.match(await card(),/2 of the 30 required questions/);
  const events=dev.db.prepare("SELECT data FROM performance_events WHERE activity='loop-lab' ORDER BY occurred").all().map(row=>JSON.parse(row.data));
  assert.deepEqual(events.map(row=>[row.mode,row.assessedMode]),[['looptype','looptype'],['mixed','looptype'],['mixed','components']]);
  assert.deepEqual(events.map(row=>row.dimensions.map(d=>d.id)),[
    ['node:advanced:loop-lab:looptype'],['node:advanced:loop-lab:looptype'],['node:advanced:loop-lab:components']
  ]);
  assert.match(await student.$eval('.skill-node[data-node-id="node:advanced:loop-lab:components"]',node=>node.textContent),/1 of 30/);

  await checkLayouts(student,'student-live-practice',panel);
  await student.evaluate(axeSource);
  assert.deepEqual(await student.evaluate(async ()=>(await axe.run('#student-pathway',{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']})).violations.map(v=>[v.id,v.nodes.map(n=>n.target)])),[]);
  await activate(student,panel+' [data-action=restart]');
  await activate(student,panel+' [data-action=restart-confirm]');
  await see(student,panel,'Current attempt (attempt 2): 0 answered');
  const recovered=await (await browser.createBrowserContext()).newPage();
  await recovered.goto(dev.url+'/cs-games/student/');
  await wait(recovered,'[name=id]');
  await recovered.type('[name=id]',dev.db.prepare('SELECT id FROM student_profiles').get().id);
  await recovered.type('[name=recovery]',recovery);
  await Promise.all([recovered.waitForNavigation(),byText(recovered,'#student-profile','Restore profile')]);
  await activate(recovered,stopButton);
  await activate(recovered,skillButton);
  await activate(recovered,panel+' .prev summary');
  assert.match(await recovered.$eval(panel,node=>node.innerText),/Attempt 1: You started a new attempt\s*2 answered, [0-2] correct/);
  assert.equal(dev.db.prepare("SELECT COUNT(*) n FROM performance_events WHERE kind='assessment'").get().n,0);
});
