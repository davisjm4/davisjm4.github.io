import assert from 'node:assert/strict';import {buildModel} from './models.js';import {execute,javaExpression} from './ir.js';
const inline=buildModel('element',3,4,'Beginner',123);
assert.match(inline.explanation,/values\.length is 6/);assert.match(inline.explanation,/positions\.length is 3/);assert.match(inline.explanation,/selects index 3/);assert.ok(!inline.explanation.includes('. .'));
const identity=buildModel('create-references',0,0,'Beginner',123);assert.match(identity.explanation,/\(values == other\) evaluates to false/);assert.ok(!identity.explanation.includes('. .'));
const grid=buildModel('access-2d',0,0,'Beginner',123);assert.match(grid.explanation,/Row 1 and column 2 select \[1\]\[2\]/);
let trueSeen=false,falseSeen=false;for(let seed=1;seed<=30;seed++){
 const q=buildModel('predict-update',7,0,'Beginner',seed),run=execute(q.semanticProgram),condition=q.semanticProgram.statements.find(s=>s.op==='if').condition,event=run.events.find(e=>e.kind==='branch');
 assert.ok(q.explanation.includes(`${javaExpression(condition)} evaluates to ${event.value}`));trueSeen ||= event.value;falseSeen ||= !event.value;
}
assert.ok(trueSeen&&falseSeen);console.log('Array explanation checks passed: inline indices/lengths, 2D coordinates, reference identity, and both conditional outcomes.');
