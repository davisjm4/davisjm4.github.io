import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import * as E from './engine.js';
const require=createRequire(new URL('../package.json',import.meta.url)),{parseHTML}=require('linkedom');
const {document,window}=parseHTML(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'));
const OriginalDate=Date;let now=new OriginalDate('2026-10-24T12:00:00Z').getTime();
globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
Object.assign(globalThis,{document,window,localStorage:storage,location:{href:'https://davisjm4.github.io/csp-games/analog-digital-lab/?seed=9'}});
window.localStorage=storage;globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
// linkedom does not implement writable HTMLSelectElement.value; emulate native selects.
const proto=Object.getPrototypeOf(document.querySelector('select'));
Object.defineProperty(proto,'value',{configurable:true,get(){return this._value??this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(v){this._value=String(v);}});
const app=await import('./app.js?ui'),$=id=>document.getElementById(id);let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=v=>{assert.ok(v);checks++;};
const pick=correct=>$(correct?app.state().current.answer.toLowerCase():(app.state().current.answer==='Analog'?'digital':'analog')).click();
eq($('topic').value,'mixed');eq(document.querySelectorAll('.choices button').length,2);eq([...document.querySelectorAll('.choices button')].map(b=>b.textContent),['Analog','Digital']);ok($('feedback').hidden);eq($('feedback').textContent,'');ok(!$('scene').textContent.includes(app.state().current.evidence));
for(const topic of ['mixed',...Object.keys(E.TOPICS)]){$('topic').value=topic;$('topic').onchange();const q=app.state().current;eq($('focus').textContent,q.focus);ok($('feedback').hidden);const before=app.state().tracker.snapshot().totals.attempted;pick(false);ok($('analog').disabled&&$('digital').disabled);ok($('feedback').textContent.startsWith('Incorrect — '+q.answer));ok($('feedback').textContent.includes(q.evidence));eq(app.state().tracker.snapshot().totals.attempted,before+1);const submissions=app.state().tracker.snapshot().totals.submissions;pick(true);eq(app.state().tracker.snapshot().totals.submissions,submissions);eq(app.state().tracker.status(app.state().recordId),'solved');$('next').click();ok(!$('analog').disabled&&!$('digital').disabled);ok($('feedback').hidden);pick(true);ok($('feedback').textContent.startsWith('Correct'));eq(app.state().tracker.snapshot().games['analog-digital-lab'].modes[topic].attempted,2);}
const data=app.state().tracker.snapshot();eq(data.games['analog-digital-lab'].attempted,26);eq(data.games['analog-digital-lab'].firstTry,13);for(const topic of Object.keys(E.TOPICS))ok(data.games['analog-digital-lab'].topics[topic].attempted>=2);
const before=data.totals.attempted;$('next').click();$('next').click();eq(app.state().tracker.snapshot().totals.attempted,before);ok($('stats').textContent.includes('50%'));ok($('topic-stats').textContent.includes('Sound and recordings'));
now+=86400000;pick(true);eq(app.state().tracker.snapshot().totals.attempted,0);ok($('notice').textContent.includes('new daily session'));ok(!app.state().answered);pick(true);eq(app.state().tracker.snapshot().totals.firstTry,1);app.state().tracker.reset(true);pick(true);eq(app.state().tracker.snapshot().totals.attempted,0);eq($('feedback').textContent,'');ok(!app.state().answered);
console.log(`Analog/Digital DOM: ${checks} assertions passed; all topics, one attempt, feedback timing, next/skip, summary buckets and daily reset.`);
