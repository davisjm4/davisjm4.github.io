import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdirSync,readFileSync} from 'node:fs';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';
const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));const {launch}=require('./tests/browser/harness.js');const axe=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
test('WPR unit → area → procedural question, responsive Map/List, parent and legacy objective routes',{timeout:90000},async t=>{
 const dev=await startDev({});let browser;t.after(async()=>{await browser?.close();await new Promise(r=>dev.server.close(r));dev.db.close();});browser=await launch();const page=await browser.newPage();
 const evidence=process.env.WPR_AREA_EVIDENCE_DIR;if(evidence)mkdirSync(evidence,{recursive:true});
 await page.goto(dev.url+'/cs-games/student/guest/?course=workplace');await page.waitForSelector('.unit-node');assert.equal((await page.$$('.unit-node')).length,5);
 await page.click('.unit-node');await page.waitForSelector('.stop-open');const unitURL=page.url();assert.equal(await page.$('.skill-node'),null);
 for(const [name,width,height] of [['desktop',1440,900],['chromebook',1366,768],['phone',390,844]]){await page.setViewport({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(evidence)await page.screenshot({path:evidence+'/'+name+'-areas.png'});}
 await Promise.all([page.waitForNavigation(),page.click('.stop-open')]);await page.waitForSelector('#ticket-slot .ticket');await page.waitForSelector('.area-progress');assert.equal(new URL(page.url()).searchParams.get('skills'),'creativity-and-innovation');
 assert.equal(await page.$eval('#view-practice>h1',e=>e.textContent),'Creativity and Innovation');assert.equal(await page.$eval('.area-progress details ul',e=>e.children.length),4);
 for(const [name,width,height] of [['desktop',1440,900],['chromebook',1366,768],['phone',390,844]]){await page.setViewport({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(evidence)await page.screenshot({path:evidence+'/'+name+'-activity.png'});}
 await page.evaluate(axe);assert.deepEqual(await page.evaluate(async()=> (await axe.run('.area-progress',{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>v.id)),[]);
 const roundUrl=new URL(page.url());roundUrl.searchParams.set('modes','decision');await page.goto(roundUrl.href);await page.waitForSelector('.area-progress');
 for(let i=0;i<8;i++){await page.waitForSelector('#btn-check');const best=await page.evaluate(()=>WRG.app.state().current.key.bestId);await page.click('.choice[data-id="'+best+'"]');await page.click('#btn-check');await page.waitForSelector('.feedback');await page.click('#btn-next');}
 await page.waitForSelector('#view-summary .area-progress');assert.match(await page.$eval('.area-progress',e=>e.innerText),/8 of 8 questions/);
 assert.match(await page.$eval('.area-progress',e=>e.innerText),/Mastery: reviewed evidence needed/);
 await page.click('.area-progress button');await page.waitForSelector('#view-practice .area-progress');assert.match(await page.$eval('.area-progress',e=>e.innerText),/0 of 8 questions/);
 await Promise.all([page.waitForNavigation(),page.click('.area-progress>a')]);await page.waitForSelector('.stop-open');assert.equal(page.url(),unitURL);
 await page.click('[data-layout=list]');assert.equal(await page.$('.skill-list'),null);assert.ok(await page.$('[data-action=open-stop]'));
 await page.goto(dev.url+'/cs-games/student/guest/?course=workplace#v=area&stop=area%3Aworkplace%3Acreativity-and-innovation&skill=node%3Aworkplace%3Acreativity-and-innovation%3Acontribute-ideas');
 await page.waitForFunction(()=>location.pathname.includes('workplace-readiness'));await page.waitForSelector('.area-progress');assert.equal(new URL(page.url()).searchParams.get('skills'),'creativity-and-innovation');
});
