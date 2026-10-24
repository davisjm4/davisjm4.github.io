import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {STAGES,COMBINATIONS,choreography,validate,starter,structureError} from '../lessons.js';
let count=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);count++;},ok=(a,m)=>{assert.ok(a,m);count++;},bad=(fn,rx)=>{assert.throws(fn,rx);count++;};
const expected=[];
// Independent oracle spells out the required ordering and five anatomical pairs.
for(const part of ['FOOT','HAND','KNEE','ELBOW','HIP'])for(const side of ['RIGHT','LEFT']){
 expected.push({op:'moveIn',part,side},{op:'moveOut',part,side},{op:'moveIn',part,side},{op:'shake',part,side},{op:'turnAround'});
}
eq(choreography(),expected,'reference equals independent 50-movement oracle');eq(COMBINATIONS.length,10);eq(STAGES.length,5);
import {solution} from './fixtures.mjs';

for(let n=1;n<=10;n++){const p=solution(n);eq(E.observable(E.execute(p).trace),expected.slice(0,n*5));for(const c of E.execute(p).trace)ok(c.stack.length>0,'executed movements retain source call stack');}
for(let s=0;s<2;s++){const p=E.blank();p.body=expected.slice(0,(s+1)*5).map(c=>E.move(c.op,c.part,c.side));ok(validate(p,s).ok);}
ok(validate(solution(2),2).ok);ok(validate(solution(),3).ok);ok(validate(solution(),4,{expanded:50,separate:74,parameterized:29}).ok);ok(validate(solution(10,true),4,{expanded:50,separate:74,parameterized:29}).ok);ok(!validate(solution(10,true),3).ok,'combined procedure cannot skip helper progression');
let p=E.blank();p.body=expected.map(c=>E.move(c.op,c.part,c.side));eq(validate(p,3).kind,'structure','behavior alone insufficient');p.procedures=solution().procedures;eq(validate(p,3).kind,'structure','unused correct definitions cannot bypass calls');
p=solution();p.procedures[0].body[0].part='FOOT';ok(!validate(p,3).ok,'hard-coded part rejected even if parameter token exists elsewhere');
p=solution(2);p.body[2].args[1]='RIGHT';eq(validate(p,2).kind,'side');p=solution(2);p.body[2].args[0]='HAND';eq(validate(p,2).kind,'part');
for(let i=0;i<50;i++){
 const missing=expected.filter((_,j)=>j!==i);ok(E.traceDifference(missing,expected),'every missing beat detected');
 const extra=[...expected.slice(0,i),{op:'clap'},...expected.slice(i)];ok(E.traceDifference(extra,expected),'every extra beat detected');
 const changed=structuredClone(expected);changed[i].op='bow';ok(E.traceDifference(changed,expected),'every incorrect movement detected');
}
eq(E.traceDifference(expected.slice(0,-1),expected).kind,'missing');eq(E.traceDifference([...expected,{op:'clap'}],expected).kind,'extra');eq(E.traceDifference(expected,expected),null);
p=E.blank();const outer=E.repeat(2),inner=E.repeat(3);inner.body=[E.move('clap')];outer.body=[inner];p.body=[outer];eq(E.observable(E.execute(p).trace),Array.from({length:6},()=>({op:'clap'})));eq(E.execute(p).trace[0].stack,[outer.id,inner.id]);
p.body=[E.repeat(0)];eq(E.execute(p).trace,[]);p=solution();eq(E.execute(p).trace.length,50);eq(E.execute(p).trace.length,50,'execution has no retained mutable state');
p=E.blank();p.body=[E.call('dance')];bad(()=>E.execute(p),/Undefined procedure/);p.procedures=[E.procedure('dance',[])];bad(()=>E.execute(p),/needs 0 arguments/);
p=E.blank();p.body=[E.move('moveIn','$part','$side')];bad(()=>E.execute(p),/has no value/);
p=E.blank();p.body=[E.move('shake','ACTIVE','ACTIVE')];bad(()=>E.execute(p),/needs a body part first/);
p=E.blank();p.body=[E.move('moveIn','HEAD','LEFT')];bad(()=>E.execute(p),/HEAD uses CENTER/);p.body[0].side='CENTER';eq(E.execute(p).trace[0].part,'HEAD');
p=E.blank();p.body=[E.move('moveIn','FOOT','CENTER')];bad(()=>E.execute(p),/Invalid body-part combination/);
p=E.blank();p.body=[{id:E.id(),type:'move',op:'teleport'}];bad(()=>E.execute(p),/Unknown movement/);
p=E.blank();const recursive=E.procedure('dance',[]);recursive.body=[E.call('dance',[])];p.procedures=[recursive];p.body=[E.call('dance',[])];bad(()=>E.execute(p),/call depth/);
p=E.blank();const huge=E.repeat(32),more=E.repeat(32);more.body=[E.move('clap')];huge.body=[more];p.body=[huge];bad(()=>E.execute(p),/Movement limit/);
p=E.blank();const emptyLoop=E.repeat(32),middle=E.repeat(32),last=E.repeat(32);middle.body=[last];emptyLoop.body=[middle];p.body=[emptyLoop];bad(()=>E.execute(p),/Execution limit/);
p=E.blank();p.body=[E.repeat(33)];bad(()=>E.execute(p),/whole number/);p.body[0].count=-1;bad(()=>E.execute(p),/whole number/);p.body[0].count=1.5;bad(()=>E.execute(p),/whole number/);
p=E.blank();p.body=Array.from({length:401},()=>E.move('clap'));bad(()=>E.execute(p),/400-block/);
p=solution(2);p.body[1].id=p.body[0].id;bad(()=>E.execute(p),/unique/);
const lines=E.pseudocode(solution(1)).map(l=>l.text).join('\n');ok(lines.includes('PROCEDURE dance(part, side)\n{\n  moveIn(part, side)'));ok(lines.includes('dance(FOOT, RIGHT)'));ok(lines.includes('PROCEDURE hokey_pokey()'));ok(lines.includes('shake()'));
p=E.blank();p.body=[outer];ok(E.pseudocode(p).map(l=>l.text).join('\n').includes('REPEAT 2 TIMES\n{\n  REPEAT 3 TIMES'));
p=solution();eq(E.importProgram(E.exportProgram(p)),p);bad(()=>E.importProgram('invalid'),/valid.*JSON/);bad(()=>E.importProgram('x'.repeat(100001)),/too large/);bad(()=>E.importProgram('{"version":99}'),/Unsupported/);
eq(starter(0).body,[]);eq(starter(2).procedures.map(d=>d.body),[[],[]]);eq(starter(3,solution(2)).body,[]);
console.log(`Interpreter / authored lesson: ${count} assertions passed.`);
