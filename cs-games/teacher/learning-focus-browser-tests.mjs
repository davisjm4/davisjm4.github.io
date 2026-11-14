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
  await student.goto(dev.url+'/cs-games/student/');
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
  await student.click(work+' [data-focus-id="'+catchup.id+'"] a');
  await student.waitForFunction(()=>location.pathname==='/java-games/loop-lab/'&&!document.querySelector('main').inert);
  assert.ok(new URL(student.url()).searchParams.get('classLaunch'));
  await student.waitForSelector('#choices button');
  await student.click('#choices button');
  await student.click('#check');
  await student.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
  await student.click('[data-profile-link]');
  await student.waitForFunction((id)=>document.querySelector('[data-focus-id="'+id+'"]')?.textContent.includes('Complete'),{},catchup.id);
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
