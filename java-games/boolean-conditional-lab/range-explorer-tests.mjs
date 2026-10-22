import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { adaptiveExpression, buildRangeExpression, evaluateExpression, evaluateJavaExpression, getScale, getActiveTrueSegments, validateRanges } from './range-explorer.js';

const one=(lo=70,hi=90,loInclusive=true,hiInclusive=true)=>[{lo,hi,loInclusive,hiInclusive}];
const sampleValues=rs=>[...new Set(rs.flatMap(r=>[r.lo-1,r.lo,r.lo+1,(r.lo+r.hi)/2,r.hi-1,r.hi,r.hi+1]))];
let checks=0;
for(const li of [false,true]) for(const ui of [false,true]) {
  const rs=one(-2.5,3.25,li,ui);
  for(const sense of ['inside','outside']) for(const x of sampleValues(rs)) {
    const exp=buildRangeExpression(rs,sense), expected=evaluateExpression(rs,x,sense).result;
    assert.equal(evaluateJavaExpression(exp,x),expected,`${exp} at ${x}`); checks++;
    const expanded=buildRangeExpression(rs,sense,true);assert.equal(evaluateJavaExpression(expanded,x),expected);checks++;
  }
}
const groups=[
  [{lo:20,hi:40,loInclusive:true,hiInclusive:false},{lo:70,hi:90,loInclusive:true,hiInclusive:true}],
  [{lo:20,hi:50,loInclusive:true,hiInclusive:true},{lo:40,hi:70,loInclusive:true,hiInclusive:false}],
  [{lo:20,hi:40,loInclusive:true,hiInclusive:false},{lo:40,hi:60,loInclusive:false,hiInclusive:true}],
  [{lo:-20,hi:20,loInclusive:false,hiInclusive:true},{lo:-10,hi:10,loInclusive:true,hiInclusive:false}],
  Array.from({length:6},(_,i)=>({lo:i*20-50,hi:i*20-42,loInclusive:i%2===0,hiInclusive:i%3===0}))
];
for(const rs of groups) for(const sense of ['inside','outside']) for(const x of sampleValues(rs)) {
  const e=buildRangeExpression(rs,sense), expected=evaluateExpression(rs,x,sense).result;
  assert.equal(evaluateJavaExpression(e,x),expected,`${e} at ${x}`);assert.equal(evaluateJavaExpression(buildRangeExpression(rs,sense,true),x),expected);checks+=2;
}
for(const rs of groups) {
  const compact=buildRangeExpression(rs,'inside');const deMorgan=`!(${buildRangeExpression(rs,'outside',true)})`;
  assert.notEqual(compact,deMorgan);
  for(const x of sampleValues(rs)) {const expected=evaluateExpression(rs,x,'inside').result;assert.equal(evaluateJavaExpression(compact,x),expected);assert.equal(evaluateJavaExpression(deMorgan,x),expected);checks+=2;}
}
for(const rs of groups) {
  const boundaries=[...new Set(rs.flatMap(r=>[r.lo,r.hi]))].sort((a,b)=>a-b);
  const values=[...boundaries,...boundaries.slice(0,-1).map((v,i)=>(v+boundaries[i+1])/2),boundaries[0]-100,boundaries.at(-1)+100];
  for(const x of values) for(const target of [true,false]) {
    const a=adaptiveExpression(rs,x,target);assert.equal(evaluateJavaExpression(a.expression,x),target,`${a.expression} at ${x}`);assert.match(a.expression,/[<>]/);assert.doesNotMatch(a.expression,/\b(?:true|false)\b|==/);checks++;
  }
}
assert.deepEqual(validateRanges(one(90,70)),{valid:false,message:'Range 1: the lower boundary must be less than the upper boundary.'});
assert.equal(validateRanges(Array.from({length:7},(_,i)=>({lo:i,hi:i+1}))).valid,false);
assert.equal(validateRanges(one(-.00001,.00001)).valid,true);
assert.ok(getScale(one(-2.5,3.25)).min< -2.5);assert.ok(getScale(one(-2.5,3.25)).max>3.25);
assert.equal(evaluateJavaExpression('x >= -1.5 && x < 0 || x > 4',-1.5),true);
const inSegments=(segments,x)=>segments.some(s=>(s.loInclusive?x>=s.lo:x>s.lo)&&(s.hiInclusive?x<=s.hi:x<s.hi));
for(const rs of groups) for(const x of sampleValues(rs)) for(const sense of ['inside','outside']) {
  const segments=getActiveTrueSegments(rs,{mode:'fixed',sense,x});assert.equal(inSegments(segments,x),evaluateExpression(rs,x,sense).result);checks++;
}
for(const rs of groups) for(const x of sampleValues(rs)) for(const target of [true,false]) {
  const segments=getActiveTrueSegments(rs,{mode:'adaptive',x,target});assert.equal(inSegments(segments,x),target);checks++;
}

// Compile and run representative emitted Java with the installed JavaCompiler API.
const javaVersion=spawnSync('java',['--version'],{encoding:'utf8'});
if(javaVersion.error?.code==='ENOENT') console.log('Java runtime unavailable; Java syntax check skipped.');
else {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'range-explorer-java-'));
  try {
    const compiler=path.join(dir,'CompileRunner.java');
    fs.writeFileSync(compiler,`import javax.tools.ToolProvider; public class CompileRunner { public static void main(String[] a) { int r=ToolProvider.getSystemJavaCompiler().run(null,null,null,java.util.Arrays.copyOfRange(a,0,a.length)); if(r!=0) System.exit(r); } }`);
    const cases=[], sources=[compiler], expected=[];let index=0;
    const addCase=(expr,x,want)=>{const name=`Expr${index}`;sources.push(path.join(dir,name+'.java'));fs.writeFileSync(sources.at(-1),`class ${name} { static boolean test(double x) { return ${expr}; } }`);cases.push(`System.out.print(${name}.test(${Number(x)})?\"1\":\"0\");`);expected.push(want?'1':'0');index++;};
    for(const rs of [one(),one(70,90,false,false),...groups]) for(const sense of ['inside','outside']) for(const x of sampleValues(rs)) addCase(buildRangeExpression(rs,sense,true),x,evaluateExpression(rs,x,sense).result);
    for(const rs of [one(),one(70,90,false,false),...groups]) for(const target of [true,false]) for(const x of sampleValues(rs)) addCase(adaptiveExpression(rs,x,target).expression,x,target);
    const runner=path.join(dir,'GeneratedChecks.java');sources.push(runner);fs.writeFileSync(runner,`public class GeneratedChecks { public static void main(String[] a) { ${cases.join('')} } }`);
    const compile=spawnSync('java',[compiler,'-d',dir,...sources.slice(1)],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(compile.status,0,compile.stderr||compile.stdout||'JavaCompiler failed');
    const run=spawnSync('java',['-cp',dir,'GeneratedChecks'],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(run.status,0,run.stderr||run.stdout);assert.equal(run.stdout,expected.join(''));checks+=expected.length;
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
console.log(`Range Explorer correctness tests passed: ${checks.toLocaleString()} checks.`);
