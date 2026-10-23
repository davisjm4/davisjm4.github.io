import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parseHTML} from 'linkedom';
import * as A from '../array-engine.js';import {createSessionTracker} from '../../session.js';
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};let clock=new Date(2026,9,23,10).getTime(),sequence=0;
function mount(search=''){
 const {document,window}=parseHTML(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return (this.querySelector('option[selected]')||this.querySelector('option'))?.getAttribute('value')||(this.querySelector('option[selected]')||this.querySelector('option'))?.textContent||'';},set(v){for(const o of this.querySelectorAll('option')){o.removeAttribute('selected');if((o.getAttribute('value')||o.textContent)===v)o.setAttribute('selected','');}}});
 Object.defineProperty(window,'location',{value:{search},configurable:true});const tracker=createSessionTracker({storage,now:()=>new Date(clock).toISOString()});let question;
 const context={document,window,console,URLSearchParams,localStorage:storage,...A,createArrayHistory:()=>A.createArrayHistory(storage),generateArray:(mode,variant,options)=>(question=A.generateArray(mode,variant,{...options,seed:options.seed??++sequence})),sessionTracker:()=>tracker,addSessionNavigation:()=>{},roundSummary:(game,mode)=>JSON.stringify(mode==='mixed'?tracker.snapshot().games[game]||{}:tracker.snapshot().games[game]?.modes?.[mode]||{})};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../array-ui.js',import.meta.url),'utf8').replace(/import[^;]+;/g,'').replace('export function','function'),context);
 const $=id=>document.getElementById(id);return {$,document,window,tracker,get question(){return question;}};
}
let app=mount('?mode=perform-update&difficulty=Advanced&seed=700');assert.equal(app.$('mode').value,'perform-update');assert.equal(app.$('difficulty').value,'Advanced');
const cells=()=>[...app.$('stage').querySelectorAll('[data-cell]')];const initial=cells().map(b=>b.textContent);const wrong=cells().find(b=>!app.question.correctCells.includes(b.dataset.cell));wrong.onclick();assert.deepEqual(cells().map(b=>b.textContent),initial,'wrong selection must not apply an update');app.$('reset-array').onclick();assert.deepEqual(cells().map(b=>b.textContent),initial);
for(const mode of Object.keys(A.formatNames))for(const difficulty of ['Beginner','Intermediate','Advanced']){
 app.$('mode').value=mode;app.$('difficulty').value=difficulty;app.$('mode').onchange();const q=app.question;
 assert.equal(q.difficulty,difficulty);assert.ok(!app.$('stage').querySelector('.challenge-meta').textContent.includes(q.family));
 const before=app.tracker.snapshot().totals;const starting=cells().map(b=>b.textContent);
 if(q.kind==='choice')[...app.$('choices').querySelectorAll('[data-answer]')].find(b=>b.dataset.answer===q.answer).onclick();
 else if(q.kind==='swap'){for(const cell of q.correctCells)app.$('stage').querySelector(`[data-cell="${cell}"]`).onclick();}
 else app.$('stage').querySelector(`[data-cell="${q.correctCell}"]`).onclick();
 if(q.kind!=='choice')assert.deepEqual(cells().map(b=>b.textContent),starting,'selection is a proposal, not execution');
 app.$('submit').onclick();assert.equal(app.tracker.snapshot().totals.firstTry,before.firstTry+1);assert.equal(app.tracker.snapshot().totals.submissions,before.submissions+1);app.$('submit').onclick();assert.equal(app.tracker.snapshot().totals.submissions,before.submissions+1);
 assert.match(app.$('feedback').textContent,/Correct\./);if(q.kind==='apply'||q.kind==='swap')assert.deepEqual(cells().map(b=>Number(b.textContent)),q.answerState);
 assert.match(app.$('stats').textContent,/attempted/);
}
const totals=app.tracker.snapshot().totals,history=JSON.parse(memory.get('javaArray.semanticHistory.v1')).entries;app=mount();assert.equal(app.tracker.snapshot().totals.firstTry,totals.firstTry);assert.equal(app.tracker.snapshot().totals.submissions,totals.submissions);assert.ok(!history.some(e=>e.key===app.question.repetitionKey));
const pref=app.$('difficulty').value;clock=new Date(2026,9,24,9).getTime();app=mount();assert.equal(app.$('difficulty').value,pref);assert.equal(app.tracker.snapshot().totals.attempted,0);assert.equal(app.tracker.snapshot().totals.submissions,0);
console.log('Compositional Array Lab UI: all 12 modes × 3 levels, selection-only updates/swaps, first-try locks, scoped statistics, links, same-day reload and daily reset passed.');
