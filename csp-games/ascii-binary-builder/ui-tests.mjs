import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import * as E from './engine.js';
const require=createRequire(new URL('../package.json',import.meta.url)),{parseHTML}=require('linkedom');
const {document,window}=parseHTML(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'));
const OriginalDate=Date;let now=new OriginalDate('2026-10-24T12:00:00Z').getTime();
globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
Object.assign(globalThis,{document,window,localStorage:storage,location:{href:'https://davisjm4.github.io/csp-games/ascii-binary-builder/?seed=9'}});
window.localStorage=storage;globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
// linkedom does not implement writable HTMLSelectElement.value; emulate native selects.
const proto=Object.getPrototypeOf(document.querySelector('select'));
Object.defineProperty(proto,'value',{configurable:true,get(){return this._value??this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(v){this._value=String(v);}});
const app=await import('./app.js?ui'),$=id=>document.getElementById(id);let checks=0;
const ok=(x,m)=>{assert.ok(x,m);checks++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const mode=m=>{$('mode').value=m;$('mode').onchange();},submitCustom=text=>{$('custom-text').value=text;$('custom-form').onsubmit({preventDefault(){}});};
const bit=i=>document.querySelector(`#bits button[data-bit="${i}"]`);
function setByte(v){const old=app.state().values[app.state().selected];for(let i=0;i<8;i++)if(!!(old&E.WEIGHTS[i])!==!!(v&E.WEIGHTS[i]))bit(i).click();}
function setText(text){for(let i=0;i<text.length;i++){document.querySelectorAll('#positions button')[i].click();setByte(text.charCodeAt(i));}}
eq(document.querySelectorAll('#bits button').length,8);eq(app.state().values,[0]);const initial=app.state().tracker.snapshot().totals.attempted;
for(let i=0;i<256;i++){setByte(i);eq($('decimal').textContent,String(i));eq($('binary').textContent,E.binary(i));ok($('character').textContent.includes(E.decode(i).label));ok($('decoded').textContent.includes(E.decode(i).display));}
eq(app.state().tracker.snapshot().totals.attempted,initial,'edits are free');$('reset').click();eq(app.state().values,[0]);
$('reference-toggle').click();ok(!$('reference').hidden);eq(document.querySelectorAll('#reference-rows tr').length,128);$('search').value='01000001';$('search').oninput();ok($('reference-rows').textContent.includes('65A01000001'));eq(app.state().tracker.snapshot().totals.attempted,initial);
for(const m of ['single','short','word']){mode(m);const target=app.state().current.text;setByte(3);const hold=[...app.state().values];$('check').click();ok($('feedback').textContent.includes('Not yet correct'));eq(app.state().values,hold);const first=app.state().tracker.snapshot().totals.firstTry,attempts=app.state().tracker.snapshot().totals.attempted;const submissions=app.state().tracker.snapshot().totals.submissions;$('check').click();eq(app.state().tracker.snapshot().totals.submissions,submissions);setText(target);$('check').click();ok(app.state().solved);eq(app.state().tracker.snapshot().totals.firstTry,first);eq(app.state().tracker.snapshot().totals.attempted,attempts);$('new').click();eq(app.state().values,Array(app.state().current.text.length).fill(0));setText(app.state().current.text);$('check').click();ok(app.state().solved);eq(app.state().tracker.snapshot().totals.firstTry,first+1);eq(app.state().tracker.snapshot().games['ascii-binary-builder'].modes[m].attempted,2);}
mode('custom');submitCustom('A z!');eq(app.state().values,[0,0,0,0]);setByte(65);$('next').click();setByte(32);$('prev').click();eq($('character').textContent,'A');eq(app.state().values,[65,32,0,0]);const customId=app.state().recordId;mode('word');mode('custom');eq(app.state().recordId,customId);eq(app.state().values,[65,32,0,0]);submitCustom('é');ok($('custom-error').textContent.includes('nothing was replaced'));eq(app.state().recordId,customId);setText('A z!');$('check').click();ok(app.state().solved);ok($('feedback').textContent.includes('SPACE = 32'));ok(!JSON.stringify(app.state().tracker.snapshot()).includes('A z!'),'custom text not in session report');
submitCustom('<>&"');setText('<>&"');eq(document.querySelectorAll('#target script').length,0);$('check').click();ok(app.state().solved);submitCustom('            ');setText('            ');$('check').click();ok(app.state().solved);eq(app.state().values.length,12);ok($('stats').textContent.includes('Custom:'));
mode('single');setByte(1);const record=app.state().recordId;now+=86400000;bit(1).click();eq(app.state().tracker.snapshot().totals.attempted,0);ok(app.state().recordId!==record);eq(app.state().values,[0]);ok($('notice').textContent.includes('new daily session'));app.state().tracker.reset(true);bit(0).click();eq(app.state().values,[0]);eq(app.state().tracker.snapshot().totals.attempted,0);
console.log(`ASCII DOM interactions: ${checks} assertions passed (live all-256 decoding, all settings, retries, privacy, state preservation, reference and daily reset).`);
