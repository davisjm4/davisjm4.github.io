import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import * as E from './engine.js';
const require=createRequire(new URL('../package.json',import.meta.url)),{parseHTML}=require('linkedom');
const {document,window}=parseHTML(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'));
const OriginalDate=Date;let now=new OriginalDate('2026-10-24T12:00:00Z').getTime();
globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
Object.assign(globalThis,{document,window,localStorage:storage,location:{href:'https://davisjm4.github.io/csp-games/rgb-color-builder/?seed=9'}});
window.localStorage=storage;globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
// linkedom does not implement writable HTMLSelectElement.value; emulate native selects.
const proto=Object.getPrototypeOf(document.querySelector('select'));
Object.defineProperty(proto,'value',{configurable:true,get(){return this._value??this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(v){this._value=String(v);}});
const app=await import('./app.js?ui'),$=id=>document.getElementById(id);let checks=0;
const ok=(x,m)=>{assert.ok(x,m);checks++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const changeMode=m=>{$('mode').value=m;$('mode').onchange();},event=(el,type)=>el.dispatchEvent(new window.Event(type,{bubbles:true}));
function setColor(rgb){const s=app.state();if(s.current.mode==='binary'){
 for(const b of document.querySelectorAll('#editor button')){const c=+b.dataset.c,i=+b.dataset.bit;if(Boolean(rgb[c]&E.WEIGHTS[i])!==Boolean(app.state().student[c]&E.WEIGHTS[i]))b.click();}
}else{for(const select of document.querySelectorAll('#editor select')){select.value=E.hexByte(rgb[+select.dataset.c])[+select.dataset.digit];event(select,'change');}}}
ok($('mode').value==='mixed','Mixed is default');ok(!document.querySelector('#difficulty'),'no difficulty');ok(document.querySelector('a[href="../session-summary/"]'),'shared summary');ok(document.querySelector('a[href="../../cs-games/csp/"]'),'consolidated nav');
for(const mode of ['binary','hex']){
 changeMode(mode);eq(app.state().current.mode,mode);eq(app.state().student,[0,0,0]);ok($('target-caption').textContent.includes('hidden'),'target hidden');
 eq(document.querySelectorAll('#editor button').length,mode==='binary'?24:0);eq(document.querySelectorAll('#editor select').length,mode==='hex'?6:0);
 const before=app.state().tracker.snapshot().totals.attempted;
 if(mode==='binary')for(const b of document.querySelectorAll('#editor button')){b.click();const c=+b.dataset.c,i=+b.dataset.bit;eq(app.state().student[c],E.WEIGHTS[i]);eq(b.getAttribute('aria-pressed'),'true');ok($('student-swatch').getAttribute('style').includes(E.css(app.state().student)));b.click();eq(app.state().student[c],0);}
 else for(const s of document.querySelectorAll('#editor select')){eq(s.querySelectorAll('option').length,16);for(const d of E.DIGITS){s.value=d;event(s,'change');eq(E.hexByte(app.state().student[+s.dataset.c])[+s.dataset.digit],d);ok($('student-swatch').getAttribute('style').includes(E.css(app.state().student)));}s.value='0';event(s,'change');}
 eq(app.state().tracker.snapshot().totals.attempted,before,'edits are free');
 const target=app.state().current.rgb;setColor([1,2,3]);eq($('hex-code').textContent.split('\n')[0],'#010203');eq($('binary-code').textContent.split('\n'),[1,2,3].map(E.binary));
 $('reset').click();eq(app.state().student,[0,0,0]);eq(app.state().tracker.snapshot().totals.attempted,before);
 $('hint').click();ok(!$('hint-text').hidden);ok(!$('hint-text').textContent.includes(E.hex(target)));ok($('target-caption').textContent.includes('hidden'));
 // First deliberately incorrect check, then exact correction, duplicate click ignored.
 setColor(target[0]+target[1]+target[2]>383?[0,0,0]:[255,255,255]);$('check').click();ok($('feedback').textContent.includes('Not Yet Correct'));ok($('feedback').textContent.includes(E.hex(target)));
 eq(app.state().tracker.snapshot().totals.attempted,before+1);const firstTry=app.state().tracker.snapshot().totals.firstTry,submissions=app.state().tracker.snapshot().totals.submissions;
 $('check').click();eq(app.state().tracker.snapshot().totals.submissions,submissions,'same color cannot repeatedly submit');
 setColor(target);$('check').click();ok(app.state().solved);ok($('feedback').textContent.includes('Correct — close enough'));eq(app.state().tracker.snapshot().totals.firstTry,firstTry,'retry preserves first check');ok($('check').disabled);
 $('new').click();ok(!app.state().submitted);ok($('target-caption').textContent.includes('hidden'));setColor(app.state().current.rgb);$('check').click();eq(app.state().tracker.snapshot().totals.firstTry,firstTry+1);
}
changeMode('mixed');let prior=[];for(let i=0;i<60;i++){const q=app.state().current;ok(!prior.includes(E.hex(q.rgb)),'50 round history across modes');prior.push(E.hex(q.rgb));if(prior.length>50)prior.shift();$('new').click();}
ok($('stats').textContent.includes('Overall / Mixed'));ok($('stats').textContent.includes('Binary:'));ok($('stats').textContent.includes('Hex:'));
now+=86400000;$('reset').click();eq(app.state().tracker.snapshot().totals.attempted,0,'daily rollover');eq(app.state().student,[0,0,0]);ok($('action-status').textContent.includes('new daily session'));
setColor(app.state().current.rgb);$('check').click();eq(app.state().tracker.snapshot().totals.firstTry,1,'first try works in new day');
const id=app.state().recordId;app.state().tracker.reset(true);$('check').click();ok(app.state().recordId!==id,'explicit session reset expires old round');eq(app.state().tracker.snapshot().totals.attempted,0);
console.log(`RGB DOM interactions: ${checks} assertions passed. Real browser/layout checks are reported separately.`);
