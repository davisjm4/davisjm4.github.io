import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch}=require('./tests/browser/harness.js');
const teacher='synthetic-guest-integration';
const KEY='cs-games:guest:v1';
const LIVE=process.env.GUEST_PRODUCTION_URL;

test('public guest map, real practice, resume, device layouts and profile isolation',{timeout:120000},async t=>{
  const dev=LIVE?null:await startDev({teacherTokens:{teacher}});
  const base=LIVE??dev.url;
  const browser=await launch();
  t.after(async()=>{await browser.close();if(dev){await new Promise(resolve=>dev.server.close(resolve));dev.db.close();}});
  const context=await browser.createBrowserContext();
  const page=await context.newPage();
  await page.setViewport({width:1366,height:768});
  const writes=[],errors=[];
  page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  const guest=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  const go=async selector=>{
    const link=await page.waitForSelector(selector,{visible:true});
    await link.focus();
    await Promise.all([page.waitForNavigation(),page.keyboard.press('Enter')]);
  };
  const button=async selector=>{await page.waitForSelector(selector,{visible:true});await page.click(selector);};
  const openSkill=async (area,node)=>{
    await button(`[data-stop-id="${area}"]`);
    await button(`.skill-node[data-node-id="${node}"]`);
    await page.waitForSelector(`.skill-panel[data-node-id="${node}"]`);
  };
  const recorded=async (node,n)=>{
    await page.waitForFunction((id,min)=>document.querySelector('.skill-panel')?.dataset.nodeId===id&&
      document.querySelector('.guest-skill-controls')?.textContent.includes(`of ${min} correct`),{},node,n);
  };
  const binary='node:csp:binary-builder:CSP-CAPACITY';
  const modulus='node:advanced:math-lab:modulus';
  const area=id=>id.replace(/^node:/,'area:').split(':').slice(0,3).join(':');
  await page.goto(base+'/cs-games/');
  await go('.how a[href="./student/guest/"]');
  await page.waitForSelector('.guest-course');
  assert.equal(await guest(),null);
  assert.equal(await page.$$eval('.guest-course',els=>els.length),4);
  await button('[data-course=csp]');
  await openSkill(area(binary)+'~1',binary);
  assert.match(await page.$eval('.demonstration-details',e=>e.textContent),/Level 4 · Exceeding/);
  await go('.skill-panel [data-action=practice]');
  assert.equal(new URL(page.url()).searchParams.get('learner'),'guest');
  await page.waitForSelector('#capacity-answer',{visible:true});
  await page.type('#capacity-answer','16');
  await page.type('#maximum-answer','15');
  await button('#check');
  await page.goBack();
  await recorded(binary,1);
  await page.reload();
  await recorded(binary,1);
  await page.goto(base+'/cs-games/student/guest/?course=csp');
  await button('.guest-pickup-actions button');
  await recorded(binary,1);

  await page.select('#guest-course-switch','advanced');
  const variable='area:advanced:variable-lab';
  await button(`[data-stop-id="${variable}"]`);
  await button('.map-meta [data-mark=familiar]');
  assert.equal((await guest()).marks[variable].state,'familiar');
  await button('.map-head [data-action=back]');
  await openSkill(area(modulus),modulus);
  await button('.skill-panel [data-mark=needs-practice]');
  await go('.skill-panel [data-action=practice]');
  assert.match(page.url(),/mode=modulus/);
  for(let round=0;round<3;round++){
    await button('button.choice');
    await button('#check');
    if(round<2)await button('#next');
  }
  await page.goBack();
  await recorded(modulus,3);
  assert.equal((await guest()).marks[modulus].state,'needs-practice');

  await button(".panel-close");
  for(const [course,width,height] of [['robotics',390,844],['workplace',768,1024],['advanced',1366,768]]){
    await page.setViewport({width,height});
    await page.select('#guest-course-switch',course);
    await page.waitForSelector('.map-app[data-view=course]');
    assert.ok(await page.$eval('.map-title',e=>e.textContent.endsWith('journey')));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.focus('[data-layout=list]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.map-app[data-layout=list]');
    assert.ok(await page.$('[data-stop-id]'));
    await page.click('[data-layout=map]');
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(writes,[]);

  const blockedContext=await browser.createBrowserContext();
  const blocked=await blockedContext.newPage();
  await blocked.evaluateOnNewDocument(()=>{
    Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}});
  });
  await blocked.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await blocked.goto(base+'/cs-games/student/guest/?course=robotics');
  await blocked.waitForSelector('.map-app');
  assert.match(await blocked.$eval('#guest-storage-note',e=>e.textContent),/not allowing saved progress/i);
  assert.ok(await blocked.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
  await blockedContext.close();

  if(dev){
    const before=JSON.stringify(await guest());
    const response=await fetch(base+'/api/wpr/teacher/profiles',{method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+teacher},
      body:JSON.stringify({title:'Synthetic guest isolation',courseId:'advanced'})});
    assert.equal(response.status,200);
    const classroom=await response.json();
    await page.goto(base+'/cs-games/student/#enroll='+classroom.invite);
    const enroll=await page.waitForFunction(()=>[...document.querySelectorAll('#student-profile button')].find(b=>b.textContent==='Enroll in this class'));
    await enroll.evaluate(b=>b.click());
    const saved=await page.waitForFunction(()=>[...document.querySelectorAll('#student-profile button')].find(b=>b.textContent==='I saved my recovery credential'));
    await Promise.all([page.waitForNavigation(),saved.evaluate(b=>b.click())]);
    await page.waitForSelector('.map-app');
    assert.equal(JSON.stringify(await guest()),before);
    assert.equal(dev.db.prepare('SELECT COUNT(*) n FROM performance_events').get().n,0);

    await page.goto(base+'/cs-games/student/guest/?course=advanced');
    await openSkill(area(modulus),modulus);
    await go('.skill-panel [data-action=practice]');
    await button('button.choice');
    await button('#check');
    await page.goBack();
    await recorded(modulus,4);
    assert.equal(dev.db.prepare('SELECT COUNT(*) n FROM performance_events').get().n,0);
    const guestAfter=JSON.stringify(await guest());
    await page.goto(base+'/java-games/math-lab/?mode=modulus');
    await button('button.choice');
    await button('#check');
    await page.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.includes('.outbox.')));
    assert.equal(dev.db.prepare('SELECT COUNT(*) n FROM performance_events').get().n,1);
    assert.equal(JSON.stringify(await guest()),guestAfter);
  }
});
