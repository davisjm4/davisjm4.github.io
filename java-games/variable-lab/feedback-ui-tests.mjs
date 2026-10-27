// Integration of the real app with deterministic classroom fixtures. No test
// routes, overrides, or fixtures are installed in the published game.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as J from '../engine.js';
import * as S from '../session.js';
const require=createRequire(import.meta.url), {parseHTML}=require(process.env.CSP_DOM_LIBRARY || 'linkedom');
const fixtures=JSON.parse(fs.readFileSync(process.env.VARIABLE_FEEDBACK_FIXTURES || new URL('./reports/classroom-fixtures.json',import.meta.url),'utf8'));
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;}, ok=x=>{assert.ok(x);checks++;};
function launch(mode) {
  const {window,document}=parseHTML(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'));
  Object.defineProperty(window.HTMLSelectElement.prototype,'value',{
    configurable:true,
    get(){return this.querySelector('option[selected]')?.getAttribute('value') || this.querySelector('option')?.getAttribute('value') || '';},
    set(v){for(const o of this.querySelectorAll('option')){o.removeAttribute('selected');if(o.getAttribute('value')===v)o.setAttribute('selected','');}},
  });
  const memory=new Map(), storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const tracker=S.createSessionTracker({storage}), q=fixtures[mode];
  const context={window,document,console,Math,Set,setTimeout,clearTimeout,diagnostics:{},
    J:{...J,generate:()=>q},sessionTracker:()=>tracker,addSessionNavigation:()=>{},
    roundSummary:()=>JSON.stringify(tracker.snapshot().totals)};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/import[^;]+;/g,''),context);
  const $=id=>document.getElementById(id), click=id=>$(id).onclick();
  function fill(r){
    if(mode==='identify')$('java-code').querySelector(`[data-node="${r.id}"]`).onclick({stopPropagation(){}});
    else for(const f of q.fields){$('piece-'+f.id).value=r[f.id];$('piece-'+f.id).onchange();}
  }
  return {$,click,fill,q,tracker};
}
for(const mode of ['identify','assemble']) {
  const t=launch(mode), before=t.tracker.snapshot().totals;
  const wrong=mode==='identify'?{id:'value'}:{type:'char',name:'seeds-planted',operator:'==',value:'45.0'};
  t.fill(wrong);t.click('check');
  const first=t.$('feedback').textContent;
  ok(first.includes(mode==='identify'?'Boolean literal':'hyphen'));
  eq(t.tracker.snapshot().totals.submissions,before.submissions+1);
  eq(t.tracker.snapshot().totals.incorrect,before.incorrect+1);
  eq(t.tracker.snapshot().totals.revealed,before.revealed);
  ok(!t.$('check').disabled);
  t.click('check');ok(t.$('feedback').textContent!==first);
  if(mode==='identify') {
    t.click('expand');eq(t.$('selected-text').textContent,'Your selection: boolean ovenPreheated = false;');
    t.click('check');ok(t.$('feedback').textContent.includes('declaration and initialization statement'));
    const token=t.$('java-code').querySelector('[data-node="operator"]');
    token.onkeydown({key:'Enter',preventDefault(){},stopPropagation(){}});
  } else {
    t.fill({...wrong,operator:'='});t.click('check');ok(t.$('feedback').textContent.includes('Progress:'));
    t.fill({...t.q.answer,name:'plantCount'});
  }
  t.click('check');
  eq(t.tracker.snapshot().totals.afterRetry,before.afterRetry+1);
  eq(t.tracker.snapshot().totals.firstTry,before.firstTry);
  ok(t.$('check').disabled);ok(!t.$('next').disabled);
  ok(t.$('feedback').textContent.includes(mode==='identify'?'= is the assignment':'int plantCount = 45;'));
  const totals=t.tracker.snapshot().totals;t.click('check');eq(t.tracker.snapshot().totals,totals);
  t.click('new');t.fill(wrong);t.click('check');t.click('show');
  ok(t.$('feedback').textContent.includes('not independently solved'));
  ok(t.$('feedback').textContent.includes(mode==='identify'?'Boolean literal':'int seedsPlanted = 45;'));
  eq(t.tracker.snapshot().totals.revealed,totals.revealed+1);
  eq(t.tracker.snapshot().totals.afterRetry,totals.afterRetry);
  eq(t.tracker.snapshot().totals.firstTry,totals.firstTry);
  const revealed=t.tracker.snapshot().totals;t.click('check');eq(t.tracker.snapshot().totals,revealed);
  t.click('next');ok(t.$('feedback').hidden);ok(!t.$('check').disabled);
  t.fill(J.solution(t.q));t.click('check');eq(t.tracker.snapshot().totals.firstTry,totals.firstTry+1);
}
console.log(`${checks} classroom DOM integration checks passed: token taps, keyboard, expansion, progressive hints, multiple errors, alternative names, retries, reveal, reset on next, and scoring.`);
