import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { mountRangeExplorer, evaluateJavaExpression } from './range-explorer.js';

const {document}=parseHTML('<!doctype html><html><body><section id="range"></section></body></html>');
globalThis.document=document;globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const root=document.querySelector('#range');mountRangeExplorer(root);
const text=()=>root.textContent;
const setX=value=>{const slider=root.querySelector('.rx-slider');slider.value=String(value);slider.oninput();};
assert.match(text(),/Fixed Expression/);assert.match(root.querySelector('[data-primary-code]').textContent,/x >= 70 && x <= 90/);
let expression=root.querySelector('[data-primary-code]').textContent;
for(const [x,result] of [[69,'FALSE'],[70,'TRUE'],[71,'TRUE'],[89,'TRUE'],[90,'TRUE'],[91,'FALSE']]) {setX(x);assert.equal(root.querySelector('[data-primary-code]').textContent,expression);assert.match(root.querySelector('[data-status="primary"]').textContent,new RegExp(result));}
root.querySelector('[data-sense="outside"]').onclick();assert.equal(root.querySelector('[data-primary-code]').textContent,'x < 70 || x > 90');
for(const [x,result] of [[69,'TRUE'],[70,'FALSE'],[80,'FALSE'],[90,'FALSE'],[91,'TRUE']]) {setX(x);assert.match(root.querySelector('[data-status="primary"]').textContent,new RegExp(result));}
const lowerToggle=root.querySelector('[data-field="loInclusive"]');lowerToggle.checked=false;lowerToggle.onchange();const upperToggle=root.querySelector('[data-field="hiInclusive"]');upperToggle.checked=false;upperToggle.onchange();
assert.equal(root.querySelector('[data-primary-code]').textContent,'x <= 70 || x >= 90');
for(const [x,result] of [[70,'TRUE'],[71,'FALSE'],[89,'FALSE'],[90,'TRUE']]) {setX(x);assert.match(root.querySelector('[data-status="primary"]').textContent,new RegExp(result));}
root.querySelector('[data-mode="adaptive"]').onclick();root.querySelector('[data-target="true"]').onclick();
for(const x of [69,70,71,89,90,91]) {setX(x);const generated=root.querySelector('[data-primary-code]').textContent;assert.equal(evaluateJavaExpression(generated,x),true);assert.match(root.querySelector('[data-full-code]').textContent,/x > 70 && x < 90/);}
root.querySelector('[data-target="false"]').onclick();for(const x of [69,70,71,89,90,91]){setX(x);assert.equal(evaluateJavaExpression(root.querySelector('[data-primary-code]').textContent,x),false);}
root.querySelector('[data-action="add"]').onclick();assert.equal(root.querySelectorAll('[data-range]').length,2);
root.querySelector('[data-mode="fixed"]').onclick();root.querySelector('[data-sense="inside"]').onclick();
const preset=root.querySelector('[data-preset]');preset.querySelector('option[value="overlap"]').selected=true;preset.onchange({target:preset});assert.equal(root.querySelectorAll('[data-range]').length,2);
for(const [x,result] of [[45,'TRUE'],[60,'TRUE'],[75,'FALSE']]){setX(x);assert.equal(root.querySelector('[data-status="primary"] strong').textContent,result);}
assert.match(root.querySelector('.rx-line').getAttribute('aria-label'),/green shows values where the displayed expression is true/i);
const rangeInput=root.querySelector('[data-field="lo"]');rangeInput.value='80';rangeInput.onchange();assert.match(root.querySelector('[role="alert"]').textContent,/lower boundary must be less than the upper boundary/i);assert.equal(root.querySelector('[data-primary-code]'),null);
rangeInput.value='20';rangeInput.onchange();assert.ok(root.querySelector('[data-primary-code]'));
root.querySelector('[data-action="reset"]').onclick();assert.equal(root.querySelector('[data-primary-code]').textContent,'x >= 70 && x <= 90');assert.equal(root.querySelector('[data-value]').value,'80');
console.log('Range Explorer UI checks passed: default, fixed boundaries, outside complement, adaptive targets, multi-range overlap, validation, and reset.');
