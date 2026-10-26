import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../package.json',import.meta.url)),{parseHTML}=require('linkedom');
const {document,window}=parseHTML(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'));
for(const select of document.querySelectorAll('select')){let v=select.querySelector('option').value;Object.defineProperty(select,'value',{configurable:true,get:()=>v,set:x=>{v=String(x);}});}
Date.now=()=>1792861200000;
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
Object.assign(globalThis,{document,window,localStorage:storage,location:{href:'https://davisjm4.github.io/csp-games/create-task-lab/'}});
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async s=>{globalThis.copied=s;}}},configurable:true});
window.localStorage=storage;window.confirm=()=>true;globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
const app=await import('./app.js?ui'),engine=await import('./engine.js?v=create-task-v1');const $=id=>document.getElementById(id);let checks=0;
const check=(x,m)=>{assert.ok(x,m);checks++;};
check($('mode').value==='mixed','Mixed default');check($('topic').value==='all','All Topics default');check(!document.querySelector('#difficulty'),'No difficulty selector');
check($('submit').disabled,'no empty submission');
const chooseCurrent=(correct=true)=>{const q=app.state().current;
  const list=q.mode==='missing'?Array.from($('choices').querySelectorAll('button')):Array.from($('code').querySelectorAll('button'));
  const button=list.find(b=>(q.mode==='missing'?b.dataset.answer:b.dataset.region)===q.correct===correct);
  check(!!button,'candidate available');button.click();check(!$('submit').disabled,'selection enables submit');$('submit').click();check(app.state().scored,'round scored');check($('submit').disabled,'one attempt locks');
};
chooseCurrent();let snapshot=app.state().tracker.snapshot();check(snapshot.games['create-task-lab'].attempted===1,'tracked answer');check(snapshot.games['create-task-lab'].firstTry===1,'tracked first try');
$('submit').click();check(app.state().tracker.snapshot().totals.submissions===1,'double submit ignored');
for(const mode of ['missing','identify','mixed'])for(const topic of ['all',...Object.keys(engine.TOPICS)]){
  $('mode').value=mode;$('topic').value=topic;app.next();let q=app.state().current;
  check(mode==='mixed'||q.mode===mode,'mode filter');check(topic==='all'||q.topic===topic,'topic filter');check($('feedback').hidden,'no answer feedback before submission');
  check(!$('code').querySelector('.answer'),'answer region not exposed');check(!$('choices').querySelector('.answer'),'choice not exposed');
  chooseCurrent(false);check($('feedback').textContent.includes('Not quite.'),'incorrect feedback');check(app.state().tracker.snapshot().totals.submissions>1,'stats persist');
  if(q.mode==='missing'&&!q.valid){check(!$('correction').hidden,'correction shown');check($('corrected-code').querySelector('.changed')||$('code').querySelector('.changed'),'changed or removed instruction highlighted');}
}
// Every authored selection target is actually rendered as an operable source button.
for(const f of engine.families.filter(f=>f.mode==='identify'))for(let v=0;v<3;v++){
  const q=engine.buildChallenge(f.id,v,29);app.renderCode($('code'),q.code,q.candidates);const buttons=Array.from($('code').querySelectorAll('button'));
  check(buttons.filter(b=>b.dataset.region===q.correct).length===1,'exact target button '+q.id);check(buttons.length>=2,'alternative source target '+q.id);
  check(buttons.every(b=>b.getAttribute('aria-label')?.startsWith('Select code')),'accessible target names');
}
$('mode').value='identify';$('topic').value='io';app.next();const original=app.state().current;
$('share').click();await Promise.resolve();check(globalThis.copied.includes(original.familyId),'reproducible share link');
const before=app.state().tracker.snapshot().totals.attempted;window.confirm=()=>false;$('reset').click();check(app.state().tracker.snapshot().totals.attempted===before,'reset cancel');window.confirm=()=>true;$('reset').click();check(app.state().tracker.snapshot().totals.attempted===0,'reset confirm');
check(document.querySelector('a[href="../session-summary/"]'),'summary link');check(document.querySelector('a[href="/cs-games/csp/"]'),'consolidated navigation');
console.log(`Create Task Lab UI: ${checks} checks passed (DOM simulation; browser results reported separately).`);
