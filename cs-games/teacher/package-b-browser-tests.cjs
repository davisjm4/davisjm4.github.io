// Focused Teacher Tools UI/export verification. No Canvas course is accessed.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),output=path.resolve(process.env.PACKAGE_B_BROWSER_DIR||'/tmp/package-b-browser');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');fs.readFile(p,(e,d)=>{res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.statusCode=e?404:200;res.end(e?'missing':d)});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.PACKAGE_B_BASE_URL||`http://127.0.0.1:${server.address().port}`;
 const proxyURL=process.env.PACKAGE_B_BASE_URL&&process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
 const proxy=proxyURL?{server:proxyURL.protocol+'//'+proxyURL.host,username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password),bypass:'127.0.0.1,localhost'}:undefined;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  const context=await browser.newContext({proxy,ignoreHTTPSErrors:!!proxy,acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)requests.push({url:r.url(),status:r.status()})});
  const response=await page.goto(base+'/cs-games/teacher/?package-b-verification=20261026');assert.equal(response.status(),200);await page.waitForFunction(()=>document.querySelector('#source').options.length===10);
  const sourceIds=await page.locator('#source option').evaluateAll(options=>options.map(o=>o.value));assert.equal(sourceIds.length,10);
  await page.evaluate(()=>localStorage.setItem('package-b-sentinel','unchanged'));
  const cases=[];
  async function generate(source,level='mixed',count=3,points=3,mode){
   await page.selectOption('#source',source);await page.selectOption('#difficulty',level);if(mode)await page.selectOption('#mode',`${source}::${mode}`);
   await page.fill('#question-count',String(count));await page.fill('#points',String(points));await page.fill('#seed','731');await page.click('#generate');
   const status=await page.locator('#status').textContent();assert.ok(status.startsWith('Quiz generated'),status);assert.equal(await page.locator('.quiz-item').count(),count);assert.equal(await page.locator('#download').isEnabled(),true);
   const notes=await page.locator('.source-note').allTextContents();if(['variable','loop','search-sort'].includes(source)&&level!=='mixed')assert.ok(notes.every(n=>n.toLowerCase().includes(level.toLowerCase())),notes.join('\n'));
   cases.push({source,level,count,points,notes,status});
  }
  async function download(name){
   const expected=await page.locator('.quiz-item').evaluateAll(items=>items.map(article=>({html:article.querySelector('.question-content').innerHTML,correctIndex:[...article.querySelectorAll('.choice-list li')].findIndex(li=>li.classList.contains('correct')),points:Number(article.querySelector('.source-note').textContent.match(/· (\d+(?:\.\d+)?) points?/)[1]),explanation:article.querySelector('.answer-note').textContent.replace(/^Explanation: /,'')})));
   const pending=page.waitForEvent('download');await page.click('#download');const file=await pending;assert.equal(await file.failure(),null);await file.saveAs(path.join(output,name+'.zip'));fs.writeFileSync(path.join(output,name+'.expected.json'),JSON.stringify(expected,null,2));
  }
  // Reproduce the live audit request exactly.
  await generate('loop','Advanced',3,3);await download('live-loop-advanced');
  for(const source of ['variable','loop','search-sort'])for(const level of ['Beginner','Intermediate','Advanced','mixed'])await generate(source,level);
  for(const source of sourceIds)await generate(source);
  await generate('search-sort','Beginner',3,1,'compare');assert.ok((await page.locator('.question-content').allTextContents()).every(t=>t.includes('[')));await download('live-search-context');
  const limited=await page.evaluate(async()=>{const {sourceById}=await import('./adapters.js?v=package-b-20261026');return sourceById.string.modes.find(m=>!m.difficulties.some(d=>d.toLowerCase()==='advanced')).id});
  await generate('string','Advanced',3,5,limited);assert.match(await page.locator('#status').textContent(),/nearest supported level/);
  for(const [skill,mode,level]of [['job-specific-tools-and-technologies','order','Beginner'],['mathematics','nextstep','Beginner'],['mathematics','order','Intermediate'],['professionalism','order','Beginner'],['reading-and-writing','order','Intermediate']]){
   await page.selectOption('#source','workplace-readiness');await page.selectOption('#mode',`workplace-readiness::${mode}`);await page.selectOption('#difficulty',level);await page.selectOption('#workplace-skills',skill);
   assert.match(await page.locator('#eligibility').textContent(),/no eligible content/);await page.click('#generate');assert.match(await page.locator('#status').textContent(),/no eligible content/);assert.equal(await page.locator('.quiz-item').count(),0);assert.equal(await page.locator('#download').isDisabled(),true);
  }
  await page.selectOption('#workplace-skills',[]);
  await generate(sourceIds,'mixed',50,5);assert.match(await page.locator('#quiz-summary').textContent(),/250/);await download('live-mixed-5-points');
  await page.locator('.regenerate-one').first().click();assert.match(await page.locator('#status').textContent(),/regenerated/);assert.equal(await page.locator('.quiz-item').count(),50);
  assert.equal(await page.evaluate(()=>localStorage.getItem('package-b-sentinel')),'unchanged');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  const result={base,cases,pageErrors:errors,failedRequests:requests,unsupportedCasesBlocked:5,mixedCount:50,mixedTotal:250,downloads:3,regeneration:'pass',studentStorage:'untouched',canvasImport:'not performed'};fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(result,null,2));console.log(`PASS ${cases.length} browser generation cases, five unsupported filter blocks, nearest-level notice, 50-item mixed quiz, regeneration and three real downloads at ${base}`);
  await context.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
