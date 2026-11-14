import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch}=require('./tests/browser/harness.js');
const axe=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const teacherKey='synthetic-learning-focus-browser';
const a='node:advanced:loop-lab:looptype';
const b='node:advanced:loop-lab:components';

async function press(page,scope,label){
  const button=await page.waitForFunction((scope,label)=>[...document.querySelectorAll(scope+' button, '+scope+' a')]
    .find(node=>node.textContent.trim()===label&&node.offsetWidth&&!node.disabled),{},scope,label);
  await button.evaluate(node=>node.focus());
  await page.keyboard.press('Enter');
}

test('teacher assigns catch-up and classwork, student practices, teacher releases the remaining grant', {timeout:90000},async t=>{
  const dev=await startDev({teacherTokens:{teacher:teacherKey},pathwayAdapters:{ENABLE_TEACHER_DIRECTED_LEARNING:'1'}});
  const browser=await launch();
  t.after(async()=>{await browser.close();await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
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
  const room=await call('/teacher/profiles',{title:'Synthetic assignment workshop',courseId:'advanced'});
  const learner=await call('/profile/enroll',{invite:room.invite},'');
  const roster=[learner];
  for(let i=1;i<24;i++)roster.push(await call('/profile/enroll',{invite:room.invite},''));
  const path='/teacher/learning-focus/'+room.id;
  const person='/teacher/profiles/'+room.id+'/students/'+learner.id;
  await call(person+'/evidence',{id:crypto.randomUUID(),nodeId:a,revision:1,score:4,award:true,demonstrationType:'project'});
  const before=(await call(person)).verifiedEvidence;

  const teacher=await browser.newPage();
  await teacher.setViewport({width:1366,height:768});
  await teacher.goto(dev.url+'/cs-games/teacher/?class='+room.id+'#classes');
  await teacher.waitForSelector('[name=teacher-key]',{timeout:5000});
  await teacher.type('[name=teacher-key]',teacherKey);
  await press(teacher,'#teacher-account','Sign in to development service');
  const form='#focus-form';
  await teacher.waitForSelector(form,{visible:true});
  const choose=(n,value)=>teacher.select(form+' label:nth-child('+n+') select',value);
  await choose(1,'individual');
  await choose(2,learner.id);
  await choose(4,a);
  await teacher.click(form+' [name=restricted]');
  await press(teacher,form,'Preview assignment');
  await teacher.waitForSelector('#focus-preview h4');
  assert.match(await teacher.$eval('#focus-preview',node=>node.textContent),/1 active profile.*Restricted navigation/);
  await press(teacher,form,'Publish assignment');
  await teacher.waitForFunction(()=>document.querySelector('#focus-restrictions')?.textContent.includes('1 restricted'));
  await choose(4,b);
  await press(teacher,form,'Preview assignment');
  await teacher.waitForSelector('#focus-preview h4');
  assert.match(await teacher.$eval('#focus-preview',node=>node.textContent),/24 active profile.*Advisory/);
  await press(teacher,form,'Publish assignment');
  await teacher.waitForFunction(()=>document.querySelectorAll('[data-assignment-id]').length===2);

  const student=await (await browser.createBrowserContext()).newPage();
  await student.evaluateOnNewDocument(profile=>{
    if(location.pathname==='/cs-games/student/')sessionStorage.setItem('synthetic-ready','1');
    localStorage.setItem('wrg.profile.active.v1',JSON.stringify(profile));
  },learner);
  await student.goto(dev.url+'/cs-games/student/#v=area&stop=area%3Aadvanced%3Aloop-lab&skill='+encodeURIComponent(b));
  student.setDefaultTimeout(10000);
  const work='#student-learning-focus';
  await student.waitForSelector(work+' article',{visible:true});
  assert.deepEqual(await student.$$eval(work+' h2',nodes=>nodes.map(n=>n.textContent)),["Today's Classwork",'Your Catch-Up Work']);
  for(const width of [320,390,768,1024,1366]){
    await student.setViewport({width,height:844});
    assert.ok(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),String(width));
  }
  await student.evaluate(axe);
  assert.deepEqual(await student.evaluate(async()=>(await window.axe.run('#student-learning-focus',{
    runOnly:['wcag2a','wcag2aa','wcag21aa'],
  })).violations.map(v=>v.id)),[]);
  const teacherView=await call(path);
  const catchup=teacherView.items.find(item=>item.scope==='individual');
  const classwork=teacherView.items.find(item=>item.scope==='class');
  await student.locator(work+' [data-focus-id="'+catchup.id+'"] a').click();
  await student.waitForFunction(()=>location.pathname==='/java-games/loop-lab/'&&!document.querySelector('main').inert);
  assert.ok(new URL(student.url()).searchParams.get('classLaunch'));
  await student.waitForSelector('#choices button');
  assert.equal(await student.$eval('#mode',node=>node.disabled),true);
  const catchUpUrl=student.url();
  const prompt=await student.$eval('#prompt',node=>node.textContent);
  await student.click('#choices button');
  const selected=await student.$eval('#choices [aria-checked=true]',node=>node.textContent);
  await student.click('#new');
  assert.equal(await student.$eval('#prompt',node=>node.textContent),prompt);
  await student.reload();
  await student.waitForSelector('#choices [aria-checked=true]');
  assert.equal(await student.$eval('#choices [aria-checked=true]',node=>node.textContent),selected);
  await student.click('[data-profile-link]');
  await student.waitForSelector(work+' [data-focus-id="'+classwork.id+'"] a');
  await student.locator(work+' [data-focus-id="'+classwork.id+'"] a').click();
  await student.waitForFunction(()=>document.querySelector('#mode')?.value==='components'&&document.querySelector('#choices button'));
  await student.click('[data-profile-link]');
  await student.waitForSelector(work+' [data-focus-id="'+catchup.id+'"] a');
  await student.locator(work+' [data-focus-id="'+catchup.id+'"] a').click();
  await student.waitForSelector('#choices [aria-checked=true]');
  assert.equal(await student.$eval('#prompt',node=>node.textContent),prompt);
  assert.equal(await student.$eval('#choices [aria-checked=true]',node=>node.textContent),selected);
  const alternate=await (await browser.createBrowserContext()).newPage();
  alternate.setDefaultTimeout(10000);
  await alternate.evaluateOnNewDocument(profile=>localStorage.setItem('wrg.profile.active.v1',JSON.stringify(profile)),learner);
  const legacy=new URL(catchUpUrl);
  legacy.searchParams.delete('classLaunch');
  await alternate.goto(legacy.href);
  await alternate.waitForFunction(()=>document.querySelector('main').inert&&document.body.textContent.includes('verify access'));
  const tampered=new URL(catchUpUrl);
  tampered.searchParams.set('mode','iterations');
  await alternate.goto(tampered.href);
  await alternate.waitForFunction(()=>document.querySelector('main').inert&&document.body.textContent.includes('does not match'));
  assert.equal(await alternate.$('#choices'),null);
  await alternate.goto(dev.url+'/java-games/loop-lab/?mode=iterations&learner=guest');
  await alternate.waitForSelector('#choices button');
  assert.equal(await alternate.$eval('#mode',node=>node.disabled),false);
  await alternate.close();
  await student.setOfflineMode(true);
  await student.click('#check');
  assert.ok(await student.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('.outbox.'))));
  const queued=await student.evaluate(()=>Object.keys(localStorage).find(key=>key.includes('.outbox.')));
  await student.evaluate(key=>{
    const original=JSON.parse(localStorage.getItem(key));
    const questionId=crypto.randomUUID();
    const legacy={...original,questionId,id:questionId+':1',occurred:Date.now()-86400000};
    delete legacy.classLaunchId;
    localStorage.setItem(key.slice(0,key.lastIndexOf('outbox.')+7)+legacy.id,JSON.stringify(legacy));
  },queued);
  await student.setOfflineMode(false);
  await student.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
  assert.equal(await student.evaluate(()=>Object.keys(localStorage).filter(key=>{
    if(!key.includes('.unverified.'))return false;
    return JSON.parse(localStorage.getItem(key)).code==='legacy-unverified';
  }).length),1);
  await student.click('[data-profile-link]');
  await student.waitForFunction((id)=>document.querySelector('[data-focus-id="'+id+'"]')?.textContent.includes('Complete'),{},catchup.id);
  await student.waitForFunction(()=>document.querySelector('#student-learning-focus')?.textContent.includes('Resume Previous Path'));
  const report=await call(person);
  assert.deepEqual(report.verifiedEvidence,before);
  assert.equal(report.measures.find(item=>item.id===a).n,1);
  await press(teacher,'#focus-restrictions','Review release for this grant');
  await press(teacher,'#focus-restrictions','Confirm release');
  await teacher.waitForFunction(()=>document.querySelector('#focus-restrictions')?.textContent.includes('0 restricted'));
  await student.reload();
  await student.waitForSelector(work+' article',{visible:true});
  assert.doesNotMatch(await student.$eval(work,node=>node.textContent),/Class practice follows your active assignments/);
});
