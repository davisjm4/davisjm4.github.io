import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch}=require('./tests/browser/harness.js');
const axeSource=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const token='synthetic-pathway-browser-teacher';
const evidenceDir=process.env.PATHWAY_EVIDENCE_DIR;

async function clickText(page,scope,text){
  const handle=await page.waitForFunction((scope,text)=>[...document.querySelectorAll(scope+' button, '+scope+' a')]
    .find(node=>node.textContent.trim()===text&&node.offsetWidth&&!node.disabled),{timeout:8000},scope,text);
  await handle.asElement().click();
}
const wait=(page,selector)=>page.waitForSelector(selector,{visible:true,timeout:8000});
const see=(page,selector,text)=>page.waitForFunction((selector,text)=>document.querySelector(selector)?.innerText.includes(text),{timeout:8000},selector,text);
const textOf=(page,selector)=>page.$eval(selector,node=>node.innerText);
const checkOverflow=async(page,width)=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+'px layout overflows');

test('teacher creates a class, student enrolls and practices, teacher publishes optional customization and pacing', {timeout:120000},async t=>{
  const dev=await startDev({teacherTokens:{teacher:token}});
  const browser=await launch();
  t.after(async()=>{await browser.close();await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
  const teacher=await browser.newPage();
  const device=await browser.createBrowserContext();
  const student=await device.newPage();
  await teacher.setViewport({width:1280,height:900});
  await teacher.goto(dev.url+'/cs-games/teacher/');
  await wait(teacher,'[name=teacher-key]');
  await teacher.type('[name=teacher-key]',token);
  await clickText(teacher,'#teacher-account','Sign in to development service');
  await wait(teacher,'[name=class-title]');
  const began=Date.now();
  await teacher.type('[name=class-title]','Period 3 Advanced CS');
  await teacher.select('[name=class-course]','advanced');
  await clickText(teacher,'#wpr-teacher-profiles','Create class');
  const invite=await (await wait(teacher,'#class-overview a[href*="#enroll="]')).evaluate(node=>node.href);
  assert.ok(Date.now()-began<60000);
  t.diagnostic('Synthetic class creation reached the enrollment link in '+(Date.now()-began)+' ms.');
  assert.match(await textOf(teacher,'#class-overview'),/Enrollment link ready/);
  const classId=dev.db.prepare('SELECT id FROM profile_classes').get().id;
  const head=()=>dev.db.prepare('SELECT head FROM class_pathways WHERE class_id=?').get(classId).head;
  assert.equal(head(),1);
  await clickText(teacher,'#class-overview','Open student pathway');
  await wait(teacher,'#published-student-preview .pathway-area');
  assert.match(await textOf(teacher,'#published-student-preview'),/Advanced CS · Self-paced/);

  await student.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await student.goto(invite);
  await clickText(student,'#student-profile','Enroll in this class');
  const recovery=await (await wait(student,'.wpr-profile-secret')).evaluate(node=>node.textContent);
  await Promise.all([student.waitForNavigation(),clickText(student,'#student-profile','I saved my recovery credential')]);
  const pathway='#student-pathway';
  await wait(student,pathway+' .pathway-area');
  assert.match(await textOf(student,pathway),/Advanced CS · Self-paced/);
  assert.equal(await student.$$eval(pathway+' .pathway-checkpoints li',items=>items.length),123);
  assert.doesNotMatch(await textOf(student,pathway),/overdue|due date|Suggested target/i);
  assert.match(await textOf(student,pathway+' details:first-of-type summary'),/Variable Lab/i);
  assert.doesNotMatch(await textOf(student,pathway),/Trace variable state0|\bfalse\b/);

  const screens=[[390,844],[768,1024],[1280,900]];
  for(const [width,height] of screens){
    for(const page of [teacher,student])await page.setViewport({width,height});
    await checkOverflow(teacher,width);
    await checkOverflow(student,width);
    if(evidenceDir){
      mkdirSync(evidenceDir,{recursive:true});
      // Only the screenshots hide the synthetic enrollment credential and profile panel.
      const redaction=await teacher.addStyleTag({content:'#class-overview input[readonly]{color:transparent} #class-overview{scroll-margin-top:4rem}'});
      await teacher.$eval('#class-overview',node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      await teacher.screenshot({path:join(evidenceDir,'after-teacher-'+width+'.png')});
      await redaction.evaluate(node=>node.remove());
      await student.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      await student.screenshot({path:join(evidenceDir,'after-student-'+width+'.png')});
    }
  }
  await student.evaluate(axeSource);
  assert.deepEqual(await student.evaluate(async selector=>(await axe.run(selector,{runOnly:['wcag2a','wcag2aa']})).violations.map(item=>item.id),pathway),[]);
  await student.$eval(pathway+' a[href*="/loop-lab/"][href*="mode=looptype"]',link=>{link.closest('details').open=true;});
  await Promise.all([student.waitForNavigation(),student.click(pathway+' a[href*="/loop-lab/"][href*="mode=looptype"]')]);
  assert.equal(await student.$eval('#mode',node=>node.value),'looptype');
  await wait(student,'#choices button');
  await student.click('#choices button');
  await student.click('#check');
  await student.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
  await Promise.all([student.waitForNavigation(),student.click('a[data-profile-link]')]);
  await wait(student,pathway+' .pathway-area');
  const loop=pathway+' a[href*="/loop-lab/"][href*="mode=looptype"]';
  const loopText=()=>student.$eval(loop,node=>node.closest('li').textContent);
  assert.match(await loopText(),/out of 1 first attempts/);

  await Promise.all([teacher.waitForNavigation(),teacher.click('#class-overview a[href$="#goals"]')]);
  assert.equal(await teacher.$('[name=teacher-key]'),null);
  await wait(teacher,'#node-table input[type=checkbox]');
  const optional='#node-table input[type=checkbox]';
  await teacher.click(optional);
  await teacher.click('#save');
  await see(teacher,'#status','Draft saved');
  assert.equal(head(),1);
  assert.doesNotMatch(await textOf(student,pathway),/Optional skill/);
  const stage=async name=>{await teacher.focus('#stepper [data-stage='+name+']');await teacher.keyboard.press('Enter');await wait(teacher,'#stage-'+name);};
  const publish=async revision=>{
    await stage('review');
    await teacher.click('#preview');
    await see(teacher,'#status','Preview ready');
    await teacher.click('#publish');
    await see(teacher,'#status','Published.');
    assert.equal(head(),revision);
  };
  await publish(2);
  await student.reload();
  await see(student,pathway,'Optional skill');

  await stage('calendar');
  assert.equal(await teacher.$eval('#settings',form=>form.hidden),true);
  await teacher.click('#add-pacing');
  assert.deepEqual(await teacher.$eval('#settings',form=>[form.elements.start.value,form.elements.end.value,form.elements.exam.value]),['','','']);
  for(const [name,value] of [['start','2027-01-11'],['end','2027-06-04']]){
    await teacher.$eval('#settings [name='+name+']',(input,date)=>{input.value=date;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  }
  await teacher.click('#settings [name=shareTargets]');
  await teacher.click('#settings button[type=submit]');
  await see(teacher,'#status','Pacing updated');
  await publish(3);
  await student.reload();
  await see(student,pathway,'Suggested target');
  assert.doesNotMatch(await textOf(student,pathway),/overdue/i);

  await stage('calendar');
  await teacher.click('#remove-pacing');
  await see(teacher,'#status','Pacing removed');
  await publish(4);
  const restored=await (await browser.createBrowserContext()).newPage();
  await restored.goto(dev.url+'/cs-games/student/');
  const id=dev.db.prepare('SELECT id FROM student_profiles').get().id;
  await wait(restored,'#student-profile [name=id]');
  await restored.type('#student-profile [name=id]',id);
  await restored.type('#student-profile [name=recovery]',recovery);
  await Promise.all([restored.waitForNavigation(),clickText(restored,'#student-profile','Restore profile')]);
  await see(restored,pathway,'Self-paced');
  assert.doesNotMatch(await textOf(restored,pathway),/Suggested target|overdue/i);
  assert.match(await restored.$eval(loop,node=>node.closest('li').textContent),/out of 1 first attempts/);
});
