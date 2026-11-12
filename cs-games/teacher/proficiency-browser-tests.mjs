import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch}=require('./tests/browser/harness.js');
const teacher='synthetic-proficiency-browser';

test('real Java and AP CSP answers reach the formative student map', {timeout:90000},async t=>{
  const dev=await startDev({teacherTokens:{teacher}});
  const browser=await launch();
  t.after(async()=>{await browser.close();await new Promise(resolve=>dev.server.close(resolve));dev.db.close();});
  const records=dev.db.prepare('SELECT data FROM performance_events WHERE pathway=? AND activity=? ORDER BY occurred');
  async function visit(courseId,activities){
    const response=await fetch(dev.url+'/api/wpr/teacher/profiles',{method:'POST',headers:{
      'Content-Type':'application/json',Authorization:'Bearer '+teacher
    },body:JSON.stringify({title:'Synthetic '+courseId,courseId})});
    assert.equal(response.status,200);
    const classroom=await response.json();
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    await page.goto(dev.url+'/cs-games/student/#enroll='+classroom.invite);
    async function press(text){
      const handle=await page.waitForFunction(text=>[...document.querySelectorAll('#student-profile button')]
        .find(button=>button.textContent.trim()===text&&button.offsetWidth&&!button.disabled),{timeout:10000},text);
      await handle.evaluate(button=>button.focus());
      await page.keyboard.press('Enter');
    }
    await press('Enroll in this class');
    await page.waitForSelector('.wpr-profile-secret',{visible:true,timeout:10000});
    await Promise.all([page.waitForNavigation(),press('I saved my recovery credential')]);
    await page.waitForSelector('.map-app');
    for(const activity of activities){
      await page.goto(dev.url+activity.path);
      if(activity.prepare)await activity.prepare(page);
      if(activity.answer){
        await page.waitForSelector(activity.answer,{visible:true});
        await page.click(activity.answer);
      }
      if(activity.submit)await page.click(activity.submit);
      await page.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.includes('.outbox.')));
      const row=records.all(courseId,activity.id).map(x=>JSON.parse(x.data)).at(-1);
      assert.ok(row,activity.id+' produced no profile event');
      assert.equal(row.attempt,1);
      assert.ok(row.familyId);
      assert.equal(row.assessedMode,activity.mode??row.topic.toLowerCase());
      assert.deepEqual(row.dimensions.map(x=>x.id),[activity.node]);
      if(activity.difficulty)assert.equal(row.difficulty,activity.difficulty);
      if(activity.requestedMode)assert.equal(row.mode,activity.requestedMode);
      if(activity.evidenceRevision)assert.equal(row.evidenceRevision,activity.evidenceRevision);
      const area=activity.node.split(':').slice(1,3).join(':');
      const hash=new URLSearchParams({v:'area',stop:'area:'+area,skill:activity.node});
      await page.goto(dev.url+'/cs-games/student/#'+hash);
      await page.waitForSelector('.proficiency-details');
      assert.match(await page.$eval('.proficiency-details',el=>el.textContent),/1 correct|1\/\d+ answers/);
      assert.doesNotMatch(await page.$eval('.proficiency-details',el=>el.textContent),/Level [234] ·/);
    }
    await context.close();
  }
  await visit('advanced',[{
    id:'variable-lab',path:'/java-games/variable-lab/?mode=trace&difficulty=intermediate',
    answer:'#value-bank [data-value]',submit:'#check',mode:'trace',difficulty:'intermediate',
    node:'node:advanced:variable-lab:trace'
  },{
    id:'array-lab',path:'/java-games/array-lab/?mode=mixed&difficulty=intermediate&seed=1',
    answer:'#stage [data-answer]',submit:'#submit',mode:'reverse',difficulty:'intermediate',requestedMode:'mixed',
    evidenceRevision:'array-compose-v1',node:'node:advanced:array-lab:reverse'
  }]);
  await visit('csp',[
    {id:'digital-divide-lab',path:'/csp-games/digital-divide-lab/?mode=solution&seed=1',
      answer:'#answers button',mode:'solution',node:'node:csp:digital-divide-lab:CSP-DIVIDE'},
    {id:'roundoff-overflow-lab',path:'/csp-games/roundoff-overflow-lab/?seed=1',
      answer:'#overflow',node:'node:csp:roundoff-overflow-lab:CSP-NUMERIC'},
    {id:'binary-builder',path:'/csp-games/binary-builder/?mode=capacity',submit:'#check',mode:'capacity',
      requestedMode:'capacity',node:'node:csp:binary-builder:CSP-CAPACITY',
      async prepare(page){
        await page.waitForSelector('#capacity-answer');
        assert.equal(await page.$eval('#mode',el=>el.value),'capacity');
        await page.type('#capacity-answer','16');
        await page.type('#maximum-answer','15');
      }}
  ]);
});
