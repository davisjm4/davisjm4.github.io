// Browser acceptance uses visible prompts and normal UI interactions. Synthetic
// class responses exercise the real shared client; no production class writes.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT||'/tmp/map-browser/node_modules/playwright/index.mjs');
const root=path.resolve(new URL('../../../..',import.meta.url).pathname);
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
let server;
if(!process.env.BASE){server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end('Not found');}});await new Promise(resolve=>server.listen(8123,'127.0.0.1',resolve));}
const base=process.env.BASE||'http://127.0.0.1:8123';const shots=process.env.SHOTS||'cs-games/reports/activity-navigation/screenshots';fs.mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});const errors=[],results=[];
try{
for(const width of [320,390,768,1024,1366]){
 const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/cs-games/student/guest/?choose=1');await page.locator('[data-course=csp]').click();
 assert.match(await page.locator('[data-unit-id=csp-2]').innerText(),/7 activities/);
 await page.locator('[data-unit-id=csp-2]').click();
 assert.equal(await page.locator('.stop-open').count(),7);assert.equal(await page.locator('.stop-title').filter({hasText:/^Binary Builder$/}).count(),1);
 assert.match(await page.locator('#map-heading').innerText(),/Data/);
 const bounds=await page.locator('.map-viewport').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,overflow:getComputedStyle(el).overflowY,body:document.documentElement.scrollWidth,width:innerWidth}));
 assert.equal(bounds.overflow,'visible');assert.ok(bounds.body<=bounds.width+2,JSON.stringify(bounds));
 await page.screenshot({path:shots+`/${width}-data-map.png`,fullPage:true});
 if(width===1024)await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await page.locator('.stop-open[data-stop-id="area:csp:rgb-color-builder"]').click();
 await page.waitForSelector('#rgb-code-question:not([hidden])');await page.waitForSelector('.live-skill-progress:not([hidden])');
 if(width===390){await page.goBack();await page.waitForSelector('.stop-open');assert.equal(new URL(page.url()).hash,'#v=unit&unit=csp-2');await page.goForward();await page.waitForSelector('.live-skill-progress:not([hidden])');}
 assert.equal(new URL(page.url()).searchParams.get('practiceSkill'),'node:csp:rgb-color-builder:CSP-RGB');
 assert.equal(await page.locator('.live-skill-progress progress').count(),1);
 assert.ok(await page.getByRole('link',{name:'Back to Learning Map',exact:true}).isVisible());
 const here=new URL(page.url()),back=new URL(here.searchParams.get('returnTo'),base);assert.equal(back.hash,'#v=unit&unit=csp-2');
 await page.screenshot({path:shots+`/${width}-rgb-practice.png`,fullPage:true});
 if(width===390){
  for(let i=0;i<12;i++){
   const task=await page.locator('#code-task').innerText();let values,answers;
   if(task.startsWith('Start')){values=task.match(/RGB\((\d+), (\d+), (\d+)\)/).slice(1).map(Number);const channel=['red','green','blue'].findIndex(c=>task.includes('the '+c+' channel'));values[channel]+=task.includes('Increase')?32:-32;answers=values.map(String);}
   else{const source=task.split(' to ')[0].replace('Convert ','');values=source.startsWith('#')?source.slice(1).match(/../g).map(v=>parseInt(v,16)):source.includes(' / ')?source.split(' / ').map(v=>parseInt(v,2)):source.split(', ').map(Number);answers=task.includes('two hexadecimal')?values.map(v=>v.toString(16).padStart(2,'0')):task.includes('eight binary')?values.map(v=>v.toString(2).padStart(8,'0')):values.map(String);}
   for(const [j,color]of ['Red','Green','Blue'].entries())await page.getByLabel(color+' code answer',{exact:true}).fill(answers[j]);
   await page.getByRole('button',{name:'Check Code',exact:true}).click();assert.match(await page.locator('#code-feedback').innerText(),/^Correct/);
   if(i<11)await page.getByRole('button',{name:'Next Code Question',exact:true}).click();
  }
  await page.waitForFunction(()=>document.querySelector('.live-skill-progress progress').value===100);
  assert.ok(await page.getByRole('link',{name:/Continue to next activity/}).isVisible());
  await page.screenshot({path:shots+'/390-rgb-complete.png',fullPage:true});
 }
 await page.getByRole('link',{name:'Back to Learning Map',exact:true}).click();await page.waitForSelector('.stop-open');
 assert.equal(new URL(page.url()).hash,'#v=unit&unit=csp-2');
 if(width===1024)assert.equal(await page.locator('.map-viewport').getAttribute('data-zoom'),'1.25');
 if(width===390){assert.equal(await page.locator('[data-stop-id="area:csp:rgb-color-builder"] .stop-art').getAttribute('data-complete'),'true');await page.screenshot({path:shots+'/390-completed-node.png',fullPage:true});}
 await page.locator('.stop-open[data-stop-id="area:csp:ascii-binary-builder"]').click();await page.waitForSelector('main');assert.match(page.url(),/ascii-binary-builder/);
 await page.getByRole('link',{name:'Back to Learning Map',exact:true}).click();await page.locator('.stop-open[data-stop-id="area:csp:binary-builder"]').click();
 await page.waitForSelector('select[aria-label="Current skill"]');assert.equal(await page.locator('select[aria-label="Current skill"] option').count(),3);
 await page.locator('select[aria-label="Current skill"]').selectOption('node:csp:binary-builder:CSP-REPRESENTATION');await page.waitForURL(/practiceSkill=node%3Acsp%3Abinary-builder%3ACSP-REPRESENTATION/);assert.equal(new URL(page.url()).searchParams.get('mode'),'pixels');
 await ctx.close();results.push({width,journeys:'course → Data → RGB/ASCII/Binary, direct return, canonical counts, natural scroll, internal skills',passed:true});
}
for(const [course,unit,area,url]of [['advanced','advanced-foundations','variable-lab','/java-games/variable-lab/'],['robotics',null,'parts-sprint','/cs-games/robotics/parts-sprint/'],['workplace','workplace-foundations','creativity-and-innovation','/wpr-games/workplace-readiness/']]){
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/cs-games/student/guest/?course='+course);if(unit)await page.locator('[data-unit-id="'+unit+'"]').click();await page.locator('.stop-open[data-stop-id="area:'+course+':'+area+'"]').click();await page.waitForURL(u=>u.pathname===url);await page.waitForSelector('main');await page.screenshot({path:shots+'/'+course+'-direct-practice.png',fullPage:true});await page.close();results.push({course,passed:true});
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length,errors,results},null,2));
}finally{await browser.close();if(server)server.close();}
