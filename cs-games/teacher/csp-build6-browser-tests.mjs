import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';

const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));
const {launch}=require('./tests/browser/harness.js');
const teacher='synthetic-build6-credential';
const node='node:csp:boolean-gatekeeper:CSP-BOOLEAN';
const route='#'+new URLSearchParams({v:'area',stop:'area:csp:boolean-gatekeeper',skill:node});
const production=process.env.BUILD6_PRODUCTION_URL;

test('focused and Mixed Boolean progress reaches the guest and enrolled maps',{timeout:120000},async t=>{
  const dev=production?null:await startDev({teacherTokens:{teacher}});
  const base=production??dev.url;
  const browser=await launch();
  t.after(async()=>{await browser.close();if(dev){await new Promise(r=>dev.server.close(r));dev.db.close();}});
  for(const enrolled of dev?[false,true]:[false]){
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const writes=[];
    page.on('request',request=>{if(request.method()==='POST')writes.push(request.url());});
    const map=base+'/cs-games/student/'+(enrolled?'':'guest/?course=csp')+route;
    if(enrolled){
      const create=await fetch(base+'/api/wpr/teacher/profiles',{method:'POST',headers:{
        Authorization:'Bearer '+teacher,'Content-Type':'application/json'
      },body:JSON.stringify({title:'Synthetic Build 6',courseId:'csp'})});
      assert.equal(create.status,200);
      const {invite}=await create.json();
      await page.goto(base+'/cs-games/student/#enroll='+invite);
      const clickText=async text=>{
        const handle=await page.waitForFunction(text=>[...document.querySelectorAll('#student-profile button')]
          .find(button=>button.textContent.trim()===text),{},text);
        await handle.focus();
        await page.keyboard.press('Enter');
      };
      await clickText('Enroll in this class');
      await page.waitForSelector('.wpr-profile-secret');
      await Promise.all([page.waitForNavigation(),clickText('I saved my recovery credential')]);
    }
    await page.goto(map);
    await page.waitForSelector('.skill-panel [data-action=practice]',{visible:true});
    const practice=await page.$eval('.skill-panel [data-action=practice]',a=>a.href);
    assert.equal(new URL(practice).searchParams.get('mode'),'make');
    await page.goto(practice);
    await page.waitForSelector('#stage pre');
    async function answerMake(){
      const point=await page.$eval('#stage pre',pre=>{
        const expression=pre.textContent;
        if(!/^[xy0-9<>=≤≥≠() ANDORT]+$/.test(expression))throw Error('Unexpected expression syntax');
        const source=expression.replaceAll('AND','&&').replaceAll('OR','||').replaceAll('NOT','!')
          .replaceAll('=','===').replaceAll('≥','>=').replaceAll('≤','<=').replaceAll('≠','!==');
        const evaluate=new Function('x','y','return '+source);
        for(let x=0;x<=12;x++)for(let y=0;y<=12;y++)if(evaluate(x,y))return {x,y};
        throw Error('No valid inputs');
      });
      await page.$eval('#x',(el,x)=>{el.value=x;},point.x);
      await page.$eval('#y',(el,y)=>{el.value=y;},point.y);
      await page.click('#check');
      assert.match(await page.$eval('#feedback',el=>el.textContent),/gate opens/);
    }
    for(let i=0;i<9;i++){
      if(i===0)await page.click('#check'); // the game displays a deliberately false starting pair
      await answerMake();
      await page.click('#new');
    }
    if(enrolled)await page.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.includes('.outbox.')));
    await page.goto(map);
    await page.waitForSelector('[data-formative-level="3"]');
    assert.match(await page.$eval('.demonstration-details',e=>e.textContent),/Level 4 · Exceeding/);

    const mixed=new URL(practice);
    mixed.searchParams.set('mode','mixed');
    await page.goto(mixed.href);
    for(let i=0;i<30&&!await page.$('#x');i++)await page.click('#new');
    await page.waitForSelector('#x');
    await answerMake();
    if(enrolled){
      await page.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.includes('.outbox.')));
      const rows=dev.db.prepare("SELECT data FROM performance_events WHERE activity='boolean-gatekeeper'").all()
        .map(row=>JSON.parse(row.data));
      assert.equal(rows.filter(event=>event.attempt===1&&event.mode==='mixed'&&event.assessedMode==='make').length,1);
      assert.equal(rows.filter(event=>event.attempt>1&&event.dimensions.length>0).length,0);
      assert.ok(rows.some(event=>event.attempt===2&&event.correct));
    }else{
      const events=await page.evaluate(()=>JSON.parse(localStorage.getItem('cs-games:guest:v1')).events);
      assert.equal(events.length,10);
      assert.equal(events.filter(event=>event.correct).length,9);
      assert.equal(events.at(-1).mode,'mixed');
      assert.equal(events.at(-1).assessedMode,'make');
      assert.deepEqual(writes,[]);
    }
    await page.goto(map);
    await page.waitForSelector('[data-formative-level="3"]');
    await page.reload();
    await page.waitForSelector('[data-formative-level="3"]');
    assert.deepEqual(errors,[]);
    await context.close();
  }
});
