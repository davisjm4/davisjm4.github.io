import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {startDev} from '../../wpr-games/workplace-readiness/service/dev.mjs';
import {proceduralQuestion,chooseProceduralSource,issueProceduralPractice} from '../../wpr-games/workplace-readiness/service/procedural-practice.mjs';
import grader from '../../wpr-games/workplace-readiness/js/core/grader.js';
const require=createRequire(new URL('../../wpr-games/workplace-readiness/package.json',import.meta.url));const {launch}=require('./tests/browser/harness.js');
test('enrolled Find the Problem practice retains an offline response and reveals server feedback without a local key',{timeout:90000},async t=>{
 const owner='synthetic-procedural-browser',secret='synthetic-find-question-signing-secret-00001';const dev=await startDev({teacherTokens:{owner},submissionSecret:secret});let browser;t.after(async()=>{await browser?.close();await new Promise(r=>dev.server.close(r));dev.db.close();});
 const call=async(path,token,body)=>{const res=await fetch(dev.url+'/api/wpr'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await res.json();assert.equal(res.status,200,JSON.stringify(data));return data;};
 const c=await call('/teacher/profiles',owner,{title:'Procedural browser class',courseId:'workplace'}),profile=await call('/profile/enroll',null,{invite:c.invite});
 // Select a deterministic real signed Find fixture. Sync/scoring still use the real service;
 // only the first issuance response is fixed so every run exercises the key-free renderer.
 const seed=Array.from({length:1000},(_,i)=>'find-feedback-'+i).find(s=>proceduralQuestion(chooseProceduralSource('creativity-and-innovation',[],s),s)?.mode==='find'&&chooseProceduralSource('creativity-and-innovation',[],s).startsWith('compose:'));assert.ok(seed);
 const randomUUID=crypto.randomUUID.bind(crypto),values=[seed,randomUUID()];let fixture;
 try{crypto.randomUUID=()=>values.shift()??randomUUID();fixture=await issueProceduralPractice(secret,{id:profile.id,class_id:c.id,generation:0,course_id:'workplace'},'creativity-and-innovation');}finally{crypto.randomUUID=randomUUID;}
 assert.equal(fixture.question.mode,'find');assert.ok(JSON.parse(Buffer.from(fixture.permit.split('.')[0],'base64url').toString()).sourceId.startsWith('compose:'));
 browser=await launch();const page=await browser.newPage();let issued;
 let usedFixture=false;await page.setRequestInterception(true);page.on('request',request=>{if(!usedFixture&&request.url().endsWith('/profile/wpr-procedural')&&request.method()==='POST'){usedFixture=true;void request.respond({status:200,contentType:'application/json',body:JSON.stringify(fixture)});}else void request.continue();});
 page.on('response',async response=>{if(response.url().endsWith('/profile/wpr-procedural')&&response.request().method()==='POST'&&response.status()===200){issued=await response.json();await page.evaluate(id=>globalThis.__issuedTestId=id,issued.id);}});
 await page.goto(dev.url+'/cs-games/');await page.evaluate(profile=>{localStorage.setItem('wrg.profile.active.v1',JSON.stringify(profile));localStorage.setItem('cs-games:guest:v1','{"synthetic-isolation":"unchanged"}');},profile);
 const back='/cs-games/student/?class='+c.id+'&course=workplace#v=unit&unit=workplace-professional';
 await page.goto(dev.url+'/wpr-games/workplace-readiness/?practice=1&skills=creativity-and-innovation&area=area:workplace:creativity-and-innovation&count=8&returnTo='+encodeURIComponent(back));
 await page.waitForFunction(()=>document.body.innerText.includes('Server-checked practice. Mastery eligibility remains separate.'));
 await page.waitForFunction(()=>!!globalThis.__issuedTestId);assert.ok(issued);assert.equal(issued.question.key,undefined);
 const claim=JSON.parse(Buffer.from(issued.permit.split('.')[0],'base64url').toString()),q=proceduralQuestion(claim.sourceId,claim.seed),answer=grader.solve(q);
 if(answer.optionId)await page.click('.choice[data-id="'+answer.optionId+'"]');else if(answer.segmentId)await page.click('.choice[data-id="'+answer.segmentId+'"]');else for(let i=0;i<answer.order.length;i++){while(await page.$$eval('.step',(els,id)=>els.findIndex(e=>e.dataset.id===id),answer.order[i])>i)await page.click('.step[data-id="'+answer.order[i]+'"] .up');}
 await page.setOfflineMode(true);await page.click('#btn-check');await page.waitForFunction(()=>document.body.innerText.includes('Response saved on this device. Reconnect'));
 assert.equal(dev.db.prepare("SELECT COUNT(*) n FROM performance_events WHERE kind='practice'").get().n,0);
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('.outbox.')).length),1);
 await page.setOfflineMode(false);await page.evaluate(()=>dispatchEvent(new Event('online')));await page.waitForSelector('.feedback',{visible:true,timeout:15000}).catch(async error=>{throw new Error(error.message+' '+await page.$eval('#view-practice',e=>e.innerText)+' '+await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes('outbox')||k.includes('unverified'))))));});
 assert.equal(await page.$eval('.choice.is-best',e=>e.dataset.id),answer.segmentId);
 assert.equal(dev.db.prepare("SELECT COUNT(*) n FROM performance_events WHERE kind='practice'").get().n,1);
 const data=JSON.parse(dev.db.prepare("SELECT data FROM performance_events WHERE kind='practice'").get().data);assert.equal(data.correct,true);assert.ok(data.dimensions.every(d=>d.scope!=='node'));
 assert.match(await page.$eval('.area-progress',e=>e.innerText),/1 of 8 questions/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('cs-games:guest:v1')),'{"synthetic-isolation":"unchanged"}');
 const firstId=issued.id;await page.click('#btn-next');await page.waitForFunction(id=>globalThis.__issuedTestId!==id&&!!document.querySelector('#btn-check'),{},firstId);assert.notEqual(issued.id,firstId);
});
test('reviewed area Level 3 fills its check, suggests another area and survives new practice rounds',{timeout:90000},async t=>{
 const graph=(await import('../pathway/curriculum-graph.json',{with:{type:'json'}})).default;
 const owner='synthetic-area-reviewed-teacher-token';const dev=await startDev({teacherTokens:{owner}});let browser;t.after(async()=>{await browser?.close();await new Promise(r=>dev.server.close(r));dev.db.close();});
 const call=async(path,token,body)=>{const response=await fetch(dev.url+'/api/wpr'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
 const c=await call('/teacher/profiles',owner,{title:'Reviewed area class',courseId:'workplace'}),profile=await call('/profile/enroll',null,{invite:c.invite}),view=(await call('/pathways/student/'+c.id,profile.token)).pathway;
 for(const node of graph.nodes.filter(n=>n.areaId==='area:workplace:creativity-and-innovation'))await call('/teacher/profiles/'+c.id+'/students/'+profile.id+'/evidence',owner,{id:crypto.randomUUID(),nodeId:node.id,score:3,award:false,revision:view.revision});
 const before=dev.db.prepare("SELECT id,data FROM performance_events WHERE kind='assessment' ORDER BY id").all();
 browser=await launch();const page=await browser.newPage();await page.goto(dev.url+'/cs-games/');await page.evaluate(profile=>localStorage.setItem('wrg.profile.active.v1',JSON.stringify(profile)),profile);
 await page.goto(dev.url+'/cs-games/student/?class='+c.id+'&course=workplace');await page.waitForSelector('.unit-node');await page.$$eval('.unit-node',nodes=>nodes.find(n=>n.textContent.includes('Professional Foundations')).click());
 const stop='.stop[data-stop-id="area:workplace:creativity-and-innovation"]';await page.waitForSelector(stop+' .stop-art[data-complete=true]');
 assert.match(await page.$eval(stop,e=>e.innerText),/Level 3/);assert.equal(await page.$eval(stop,e=>e.dataset.suggested),'false');
 await Promise.all([page.waitForNavigation(),page.click(stop+' .stop-open')]);await page.waitForFunction(()=>document.querySelector('.area-progress')?.innerText.includes('Level 3 demonstrated'),{timeout:5000}).catch(async error=>{throw new Error(error.message+' '+await page.$eval('.area-progress',e=>e.innerText));});
 assert.match(await page.$eval('.area-progress',e=>e.innerText),/Level 4 is optional/);
 const next=await page.$eval('.area-progress>a:not([hidden])',e=>e.href);assert.ok(next);
 assert.ok(await page.$eval('.area-progress',e=>[...e.querySelectorAll('a')].some(a=>!a.hidden&&a.textContent.startsWith('Next area'))));
 const reissued=page.waitForResponse(r=>r.url().endsWith('/profile/wpr-procedural')&&r.request().method()==='POST'&&r.status()===200);
 await page.$$eval('.area-progress button',buttons=>buttons.find(b=>b.textContent==='Optional extension practice').click());await reissued;
 await page.waitForFunction(()=>document.body.innerText.includes('Server-checked practice. Mastery eligibility remains separate.'));
 assert.deepEqual(dev.db.prepare("SELECT id,data FROM performance_events WHERE kind='assessment' ORDER BY id").all(),before);
});
