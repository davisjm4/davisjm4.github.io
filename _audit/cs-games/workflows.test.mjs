import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { startAudit } from './launch.mjs';

const require = createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch} = require('./tests/browser/harness.js');
const wait = (page,selector) => page.waitForSelector(selector,{visible:true,timeout:12000});
const see = (page,selector,text) => page.waitForFunction((sel,value)=>document.querySelector(sel)?.innerText.includes(value),
  {timeout:12000},selector,text);
const click = async (page,selector) => (await wait(page,selector)).click();
async function named(page,scope,name) {
  const handle = await page.waitForFunction((sel,value)=>[...document.querySelectorAll(sel)]
    .find(el=>el.innerText.trim()===value && el.offsetWidth && !el.disabled),{timeout:12000},scope,name);
  await handle.evaluate(el=>el.focus());
  await page.keyboard.press('Enter');
}
const navigate = (page,action) => Promise.all([page.waitForNavigation({timeout:12000}),action()]);
async function launchTest(t) {
  const audit = await startAudit();
  t.after(audit.close);
  const browser = await launch();
  t.after(()=>browser.close());
  return {audit,browser};
}

async function restore(page,url,student) {
  await page.goto(url+'/cs-games/student/');
  await wait(page,'#student-profile [name=id]');
  await page.type('#student-profile [name=id]',student.id);
  await page.type('#student-profile [name=recovery]',student.recovery);
  await navigate(page,()=>named(page,'#student-profile button','Restore profile'));
  await wait(page,'#student-pathway .map-app');
}

async function openLoop(page,node) {
  await wait(page,'#student-pathway .map-app');
  const button = '.skill-node[data-node-id="'+node+'"]';
  if (!await page.$(button)) await click(page,'.stop-open[data-stop-id="area:advanced:loop-lab"]');
  if (!await page.$('.skill-panel[data-node-id="'+node+'"]')) await click(page,button);
  await wait(page,'.skill-panel');
}

test('teacher uses the seeded roster, previews and publishes requirements, reviews Level 4, and exports', {timeout:120000},async t=>{
  const {audit,browser}=await launchTest(t);
  const {url,classes}=audit;
  const course=classes.find(c=>c.courseId==='advanced');
  const person=course.students[2];
  const teacher=await browser.newPage();
  const externalWrites=[];
  await teacher.setRequestInterception(true);
  teacher.on('request',request=>{
    const target=request.url();
    if (target.startsWith(url+'/') || /^(data:|blob:)/.test(target)) return request.continue();
    if (request.method()!=='GET') externalWrites.push(request.method());
    return request.abort();
  });
  await teacher.goto(url+'/audit/');
  await named(teacher,'summary','Teacher sign-in credential for this run');
  const token=await teacher.$eval('#teacher-token',el=>el.textContent);
  await navigate(teacher,()=>named(teacher,'a','Test as Teacher'));
  await wait(teacher,'[name=teacher-key]');
  await teacher.type('[name=teacher-key]',token);
  await named(teacher,'#teacher-account button','Sign in to development service');
  await wait(teacher,'.class-grid button');
  assert.equal(await teacher.$$eval('.class-grid button',buttons=>buttons.length),4);
  await teacher.goto(url+'/cs-games/teacher/?class='+course.id+'#classes');
  await wait(teacher,'#class-students table tbody tr');
  assert.equal(await teacher.$$eval('#class-students table tbody tr',rows=>rows.length),24);
  const viewPerson=()=>teacher.waitForFunction(id=>[...document.querySelectorAll('#class-students table tbody tr')]
    .find(row=>row.innerText.includes(id))?.querySelector('button'),{timeout:12000},person.id);
  await (await viewPerson()).click();
  await see(teacher,'#wpr-profile-report','10/36');
  const history=await teacher.waitForFunction(()=>[...document.querySelectorAll('#wpr-profile-report summary')].find(el=>el.textContent==='Recent practice attempts'));
  await history.click();
  assert.ok(await teacher.$eval('#wpr-profile-report table',table=>table.rows.length));
  assert.ok(await teacher.$eval('#wpr-profile-report details:has(caption)',el=>el.textContent.includes('Family')));

  const student=await (await browser.createBrowserContext()).newPage();
  await restore(student,url,person);
  await openLoop(student,course.node);
  await see(student,'.skill-panel','36 answered, 10 right on the first try');
  await navigate(teacher,()=>click(teacher,'#class-overview a[href*="/requirements/"]'));
  await wait(teacher,'.mreq');
  await teacher.type('input[aria-label="Minimum questions"]','30');
  await teacher.type('input[aria-label="Required accuracy as a percentage"]','90');
  await named(teacher,'.mreq button','Save class defaults');
  await see(teacher,'.mreq-status','Class defaults saved');
  await click(teacher,'[data-tab=review]');
  await see(teacher,'.mreq-panel','30 questions at 90%');
  await see(teacher,'.mreq-panel','Effect on');
  const acknowledgement=await teacher.$('.mreq-panel input[type=checkbox]');
  if (acknowledgement) await acknowledgement.click();
  await named(teacher,'.mreq button','Save draft');
  await see(teacher,'.mreq-status','Draft saved');
  await student.reload();
  await openLoop(student,course.node);
  assert.doesNotMatch(await student.$eval('.skill-panel',el=>el.innerText),/30 questions answered and 90%/);
  await named(teacher,'.mreq button','Publish requirements');
  await see(teacher,'.mreq-status','Published version 3');
  await student.reload();
  await openLoop(student,course.node);
  await see(student,'.skill-panel','30 questions answered and 90% right on the first try');
  const answered = page => page.$eval('.skill-panel .stats',stats=>{
    const label=[...stats.querySelectorAll('dt')].find(term=>term.textContent==='Questions answered');
    return Number(label.nextElementSibling.textContent.split(' of ')[0]);
  });
  const beforePractice=await answered(student);

  await teacher.goto(url+'/cs-games/teacher/?class='+course.id+'#classes');
  await (await viewPerson()).click();
  const form='#wpr-profile-report form';
  await wait(teacher,form);
  await teacher.select(form+' select:first-of-type',course.node);
  await teacher.select(form+' select:has(option[value=project])','project');
  await teacher.type(form+' input[type=number]','4');
  await click(teacher,form+' input[type=checkbox]');
  await click(teacher,form+' button[type=submit]');
  await see(teacher,'#wpr-profile-report','4/4');
  await student.reload();
  await openLoop(student,course.node);
  await see(student,'.skill-panel','Teacher assessment score: 4 of 4 · Project or portfolio');
  await navigate(student,()=>click(student,'.skill-panel a[data-action=practice]'));
  if (await student.$eval('#mode',el=>el.value)!=='looptype') await student.select('#mode','looptype');
  await click(student,'#choices button');
  await click(student,'#check');
  await student.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
  await navigate(student,()=>click(student,'a[data-profile-link]'));
  await wait(student,'.skill-panel[data-node-id="'+course.node+'"]');

  const resumed=await (await browser.createBrowserContext()).newPage();
  await restore(resumed,url,person);
  await openLoop(resumed,course.node);
  await see(resumed,'.skill-panel','Teacher assessment score: 4 of 4');
  assert.equal(await answered(resumed),beforePractice+1);
  for (const [width,height] of [[1280,900],[768,1024],[390,844]]) {
    for (const page of [teacher,resumed]) {
      await page.setViewport({width,height});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' px overflow at '+new URL(page.url()).pathname);
    }
  }

  const downloadDir=await mkdtemp(join(tmpdir(),'csg-audit-'));
  t.after(()=>rm(downloadDir,{recursive:true,force:true}));
  const cdp=await teacher.createCDPSession();
  await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir});
  await named(teacher,'#class-students button','Export class progress CSV');
  const filename='cs-games-class-progress.csv';
  for (let i=0;i<60 && !(await readdir(downloadDir)).includes(filename);i++) await new Promise(resolve=>setTimeout(resolve,100));
  const csv=await readFile(join(downloadDir,filename),'utf8');
  assert.match(csv,/profile_id/);
  assert.ok(csv.includes(person.id));
  assert.ok(csv.includes('loop-lab'));
  await teacher.goto(url+'/cs-games/teacher/#practice');
  const diagnostic=await teacher.waitForFunction(()=>[...document.querySelectorAll('.row-card')]
    .find(row=>row.textContent.includes('Synthetic WPR diagnostic'))?.querySelector('button'));
  await diagnostic.click();
  await see(teacher,'#wpr-active-report','7 completed submissions');
  await see(teacher,'#wpr-active-report','Score distribution');
  assert.deepEqual(externalWrites,[]);
});

test('all four courses enroll, submit real practice, and restore on a second device', {timeout:120000},async t=>{
  const {audit,browser}=await launchTest(t);
  const {url,classes,db}=audit;
  const activities={
    csp:{path:'/csp-games/binary-builder/?mode=capacity',activity:'binary-builder',async answer(page){
      await wait(page,'#capacity-answer');
      await page.type('#capacity-answer','16');
      await page.type('#maximum-answer','15');
      await click(page,'#check');
    }},
    advanced:{path:'/java-games/loop-lab/?mode=looptype',activity:'loop-lab',async answer(page){
      await click(page,'#choices button');
      await click(page,'#check');
    }},
    robotics:{path:'/cs-games/robotics/parts-sprint/?category=structure',activity:'parts-sprint',async answer(page){
      await click(page,'#start');
      await click(page,'#answers [data-option]');
    }},
    workplace:{path:'/wpr-games/workplace-readiness/',activity:'workplace-readiness-games',async answer(page){
      await page.waitForSelector('#opt-mode option[value=decision]');
      await page.select('#opt-mode','decision');
      await click(page,'#btn-start');
      await click(page,'.choice[data-id]');
      await click(page,'#btn-check');
    }}
  };
  for (const course of classes) {
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    await page.goto(url+'/cs-games/student/#enroll='+course.invite);
    await named(page,'#student-profile button','Enroll in this class');
    const recovery=await (await wait(page,'.wpr-profile-secret')).evaluate(el=>el.textContent);
    await navigate(page,()=>named(page,'#student-profile button','I saved my recovery credential'));
    await wait(page,'#student-pathway .map-app');
    assert.ok(await page.$('.stop-open'));
    const latest=db.prepare('SELECT id FROM student_profiles WHERE class_id=? ORDER BY created DESC LIMIT 1').get(course.id);
    const practice=activities[course.courseId];
    await page.goto(url+practice.path);
    const synced=page.waitForResponse(response=>response.url()===url+'/api/wpr/profile/sync'&&response.ok());
    await practice.answer(page);
    await synced;
    assert.equal(db.prepare('SELECT activity FROM performance_events WHERE profile=?').get(latest.id).activity,practice.activity);
    await context.close();
    const device=await browser.createBrowserContext();
    const restored=await device.newPage();
    await restore(restored,url,{id:latest.id,recovery});
    await click(restored,'#student-profile > details > summary');
    await named(restored,'#student-profile button','View synced progress');
    await see(restored,'#profile-progress',practice.activity);
    await device.close();
  }
});

test('String Lab duplicate summary uses the same answer but different scope and persistence', {timeout:120000},async t=>{
  const {audit,browser}=await launchTest(t);
  const {url,db}=audit;
  const before=db.prepare('SELECT count(*) n FROM performance_events').get().n;
  const page=await (await browser.createBrowserContext()).newPage();
  const writes=[];
  page.on('request',request=>{if (request.method()!=='GET') writes.push(request.url());});
  await page.goto(url+'/cs-games/student/guest/');
  await wait(page,'.guest-course');
  assert.equal(await page.$$eval('.guest-course',courses=>courses.length),4);
  await page.goto(url+'/java-games/loop-lab/?mode=looptype&difficulty=beginner');
  await click(page,'#choices button');
  await click(page,'#check');
  await page.goto(url+'/java-games/string-lab/?seed=1');
  await wait(page,'a[data-session-link]');
  assert.equal(await page.$$eval('a[data-session-link],#summaryBtn',nodes=>nodes.filter(n=>n.innerText.trim()==='Session Summary').length),2);
  await click(page,'#choices label');
  await click(page,'#checkBtn');
  await click(page,'#summaryBtn');
  await wait(page,'#summaryDlg[open] #copyBtn');
  assert.equal(await page.$('#summaryDlg #student-name'),null);
  assert.equal(await page.$eval('#summaryBody .stat:nth-child(2) b',n=>n.textContent==='1'||n.textContent==='0'),true);
  const counts=await page.$$eval('#summaryBody .stat b',nodes=>nodes.map(n=>n.textContent));
  assert.equal(counts[0],'1');
  await click(page,'#closeBtn');
  await page.reload();
  await click(page,'#summaryBtn');
  assert.equal(await page.$eval('#summaryBody .stat:first-child b',el=>el.textContent),'0');
  await click(page,'#closeBtn');
  await navigate(page,()=>click(page,'a[data-session-link]'));
  await see(page,'#report','String Lab');
  const rows=await page.$$eval('#report table:first-of-type tbody tr',rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)));
  assert.ok(rows.some(row=>row[0]==='String Lab' && row[1]==='1' && row[2]===counts[1]));
  assert.ok(rows.some(row=>row[0]==='Loop Lab' && row[1]==='1'));
  await page.reload();
  await see(page,'#report','String Lab');
  await page.evaluate(()=>{window.print=()=>{document.body.dataset.printInvoked='true';};});
  await page.type('#student-name','Synthetic Print Example');
  await click(page,'#print');
  await see(page,'#report','Synthetic Print Example');
  assert.equal(await page.$eval('body',el=>el.dataset.printInvoked),'true');
  const pdf=await page.pdf({printBackground:true});
  assert.equal(Buffer.from(pdf).subarray(0,4).toString(),'%PDF');
  await page.reload();
  assert.equal(await page.$eval('#student-name',el=>el.value),'Synthetic Print Example');
  for (const path of ['/csp-games/session-summary/','/cs-games/robotics/parts-sprint/']) {
    await page.goto(url+path);
    if (path.startsWith('/csp-games')) {
      await wait(page,'#student-name');
      await wait(page,'#print');
    } else {
      await wait(page,'#session-summary');
    }
  }
  assert.deepEqual(writes,[]);
  assert.equal(db.prepare('SELECT count(*) n FROM performance_events').get().n,before);
});
