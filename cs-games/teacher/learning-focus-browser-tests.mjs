import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch}=require('./tests/browser/harness.js');
const axe=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const teacherKey='synthetic-learning-focus-browser';
const reverse='node:advanced:array-lab:reverse';
const loops='node:advanced:loop-lab:components';

async function press(page,scope,label){
  const button=await page.waitForFunction((scope,label)=>[...document.querySelectorAll(scope+' button, '+scope+' a')]
    .find(node=>node.textContent.trim()===label&&node.offsetWidth&&!node.disabled),{},scope,label);
  await button.evaluate(node=>node.focus());
  await page.keyboard.press('Enter');
}

test('advisory classwork and catch-up coexist through mode changes, offline practice and return', {timeout:90000},async t=>{
  const dev=await startDev({teacherTokens:{teacher:teacherKey},pathwayAdapters:{ENABLE_TEACHER_DIRECTED_LEARNING:'1'}});
  let browser;
  t.after(async()=>{await browser?.close();await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
  browser=await launch();
  async function call(path,body,token=teacherKey){
    const response=await fetch(dev.url+'/api/wpr'+path,{
      method:body===undefined?'GET':'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:body===undefined?undefined:JSON.stringify(body),
    });
    const data=await response.json();
    assert.equal(response.status,200,JSON.stringify(data));
    return data;
  }
  const room=await call('/teacher/profiles',{title:'Synthetic advisory workshop',courseId:'advanced'});
  const learner=await call('/profile/enroll',{invite:room.invite},'');
  for(let i=1;i<24;i++)await call('/profile/enroll',{invite:room.invite},'');
  const path='/teacher/learning-focus/'+room.id;
  const person='/teacher/profiles/'+room.id+'/students/'+learner.id;
  await call(person+'/evidence',{id:crypto.randomUUID(),nodeId:loops,revision:1,score:4,award:true,demonstrationType:'project'});
  const before=(await call(person)).verifiedEvidence;
  const teacher=await browser.newPage();
  await teacher.goto(dev.url+'/cs-games/teacher/?class='+room.id+'#classes');
  await press(teacher,'#teacher-account','Sign In');
  await teacher.waitForSelector('[name=teacher-key]',{timeout:5000});
  await teacher.type('[name=teacher-key]',teacherKey);
  await press(teacher,'#teacher-account','Sign in to development service');
  await teacher.evaluate(()=>{location.hash='#class-focus';});
  const form='#focus-form';
  await teacher.waitForSelector(form,{visible:true});
  const choose=(n,value)=>teacher.select(form+' label:nth-child('+n+') select',value);
  await choose(1,'individual');
  await choose(2,learner.id);
  await choose(4,reverse);
  await press(teacher,form,'Preview assignment');
  await teacher.waitForSelector('#focus-preview h4');
  assert.match(await teacher.$eval('#focus-preview',node=>node.textContent),/1 active profile.*Advisory/);
  await press(teacher,form,'Publish assignment');
  await teacher.waitForSelector('[data-assignment-id]');
  const catchup=(await call(path)).items.find(item=>item.scope==='individual');

  const student=await (await browser.createBrowserContext()).newPage();
  await student.evaluateOnNewDocument(profile=>localStorage.setItem('wrg.profile.active.v1',JSON.stringify(profile)),learner);
  student.setDefaultTimeout(10000);
  const pageErrors=[];
  student.on("pageerror",error=>pageErrors.push(error.message));
  const dashboard=dev.url+'/cs-games/student/#v=area&stop=area%3Aadvanced%3Aloop-lab&skill='+encodeURIComponent(loops);
  const work='#student-learning-focus';
  const card=id=>work+' [data-focus-id="'+id+'"]';
  const studentWork=()=>call('/profile/learning-focus',undefined,learner.token);
  await student.goto(dashboard);
  await student.waitForSelector(card(catchup.id)+' a',{visible:true});
  await press(student,card(catchup.id),'Start Assignment');
  await student.waitForSelector('#choices [data-answer]');
  const reverseUrl=student.url();
  const snapshot=()=>student.$eval('#stage',stage=>({
    prompt:stage.querySelector('h2').textContent, code:stage.querySelector('pre')?.textContent,
    selected:stage.querySelector('[aria-pressed=true]')?.textContent,
  }));
  await student.click('#choices [data-answer]');
  const unfinished=await snapshot();
  await student.reload();
  await student.waitForSelector('#choices [aria-pressed=true]');
  assert.deepEqual(await snapshot(),unfinished);
  await student.select('#mode','element');
  await student.waitForFunction(()=>document.querySelector('#mode').value==='element');
  await student.select('#mode','reverse');
  assert.deepEqual(await snapshot(),unfinished);

  await choose(4,loops);
  await press(teacher,form,'Preview assignment');
  await teacher.waitForSelector('#focus-preview h4');
  assert.match(await teacher.$eval('#focus-preview',node=>node.textContent),/24 active profile.*Advisory/);
  await press(teacher,form,'Publish assignment');
  await teacher.waitForFunction(()=>document.querySelectorAll('[data-assignment-id]').length===2);
  const classwork=(await call(path)).items.find(item=>item.scope==='class');
  assert.deepEqual(await snapshot(),unfinished);

  await student.goto(dev.url+'/java-games/loop-lab/?mode=components');
  const reminder='#assignment-practice-reminder';
  await student.waitForSelector(reminder);
  assert.match(await student.$eval(reminder,node=>node.textContent),/assigned work.*Array Lab.*Choose the Java Statement/i);
  assert.equal(await student.$eval('main',node=>node.inert),false);
  assert.equal(await student.$eval(reminder+' a',node=>node.hash),'#student-learning-focus');
  await student.evaluate(axe);
  assert.deepEqual(await student.evaluate(async id=>(await window.axe.run(id,{
    runOnly:['wcag2a','wcag2aa','wcag21aa'],
  })).violations.map(v=>v.id),reminder),[]);
  await press(student,reminder,'Continue Here');
  assert.equal(await student.$(reminder),null);
  assert.equal(await student.$eval('#mode',mode=>mode.disabled),false);
  await student.setOfflineMode(true);
  await student.select('#mode','iterations');
  assert.equal(await student.$eval('#mode',mode=>mode.value),'iterations');
  await student.select('#mode','components');
  for(let i=0;i<3;i++){
    await student.click('#choices button');
    await student.click('#check');
    await student.click('#next');
    await student.waitForSelector('#choices button');
  }
  assert.equal(await student.$(reminder),null);
  assert.equal(await student.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes('.outbox.')).length),3);
  await student.setOfflineMode(false);
  await student.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
  assert.equal((await studentWork()).classwork[0].progress,'available');
  assert.equal((await studentWork()).catchUp[0].progress,'started');

  await student.goto(dashboard);
  await student.waitForSelector(card(classwork.id)+' a',{visible:true});
  assert.deepEqual(await student.$$eval(work+' h2',nodes=>nodes.map(n=>n.textContent)),["Today's Classwork",'Your Catch-Up Work']);
  for(const width of [320,390,768,1024,1366]){
    await student.setViewport({width,height:844});
    assert.ok(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),String(width));
  }
  await press(student,card(classwork.id),'Start Assignment');
  await student.waitForSelector('#choices button');
  await student.waitForFunction(id=>Object.keys(sessionStorage).some(key=>key.endsWith(':'+id+':1')),{},classwork.id);
  await student.click('#choices button');
  await student.click('#check');
  await student.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
  assert.equal((await studentWork()).classwork[0].progress,'complete');

  await student.goto(dashboard);
  await student.waitForSelector(card(catchup.id)+' a',{visible:true});
  const previous=await student.$eval(work,node=>[...node.querySelectorAll('a')].find(a=>a.textContent==='Resume Previous Path').hash);
  assert.match(previous,/skill=node%3Aadvanced%3Aloop-lab%3Acomponents/);
  assert.match(await student.$eval(card(classwork.id),node=>[...node.querySelectorAll('a')].find(a=>a.textContent==='Continue From Here').hash),/skill=node%3Aadvanced%3Aloop-lab%3Acomponents/);
  await press(student,card(catchup.id),'Resume Assignment');
  await student.waitForSelector('#choices [aria-pressed=true]');
  assert.equal(new URL(student.url()).pathname,new URL(reverseUrl).pathname);
  assert.deepEqual(await snapshot(),unfinished);
  await student.click('#submit');
  await student.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
  assert.equal((await studentWork()).catchUp[0].progress,'complete');
  const report=await call(person);
  assert.deepEqual(report.verifiedEvidence,before);
  assert.equal(report.measures.find(item=>item.id===loops).n,4);

  const guest=await student.browserContext().newPage();
  await guest.goto(dev.url+'/java-games/loop-lab/?mode=components&learner=guest');
  await guest.waitForSelector('#choices button');
  assert.equal(await guest.$(reminder),null);
  await guest.click('#choices button');
  await guest.click('#check');
  assert.equal((await call(person)).measures.find(item=>item.id===loops).n,4);
  assert.deepEqual(pageErrors,[]);
});
