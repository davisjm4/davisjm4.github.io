'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
['rng.js','words.js','java-ast.js','evaluator.js','difficulty.js','distractors.js','gen-helpers.js',
 'families-predict.js','families-trace.js','families-index.js','families-expression.js','families-practice.js',
 'generator.js','feedback.js','session.js'].forEach(f => require(path.join(root,'js',f)));
const G = globalThis.StringLab.Generator;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
assert.match(html, /name="mode" value="mixed" checked/);
assert.doesNotMatch(html, /name="mode" value="predict" checked/);
assert.match(uiSource, /validModes\.indexOf\(requestedMode\) >= 0 \? requestedMode : \(saved && validModes\.indexOf\(saved\.mode\) >= 0 \? saved\.mode : 'mixed'\)/);
assert.match(uiSource, /sessionStats/);
assert.doesNotMatch(uiSource, /class="key" aria-hidden="true"/);
const report = {};
let tested = 0;
let jvmPrograms = 0;

function validateChoiceShape(c) {
  assert.ok(c.choices.length >= 2 && c.choices.length <= 4, c.id);
  assert.equal(new Set(c.choices.map(x => x.text)).size, c.choices.length, c.id + ' duplicate choice');
  assert.equal(c.choices.filter(x => x.text === c.answer).length, 1, c.id + ' must have one answer');
  assert.equal(c.choices[c.correctIndex].text, c.answer, c.id + ' incorrect index');
}

// Original four modes remain seeded, difficulty-aware, and assembled through their existing evaluator.
for (const mode of ['predict','index','expr','trace']) for (const difficulty of G.LEVELS) {
  for (let seed=1; seed<=1000; seed++) {
    const c=G.generateChallenge({seed,mode,difficulty});
    assert.equal(c.mode,mode); assert.equal(c.difficulty,difficulty); validateChoiceShape(c); tested++;
  }
}

// At least 1,000 challenges in each new mode/difficulty cell (9,000 total).
for (const mode of ['algorithms','compare','loop']) for (const difficulty of G.LEVELS) {
  const exact=new Set(), shapes=new Set(), families=new Set(); let duplicates=0;
  for (let seed=1; seed<=1000; seed++) {
    const c=G.generateChallenge({seed,mode,difficulty});
    assert.equal(c.mode,mode); assert.equal(c.difficulty,difficulty); assert.ok(c.code.join('\n').trim());
    validateChoiceShape(c);
    const again=G.generateChallenge({seed,mode,difficulty});
    assert.equal(JSON.stringify(c),JSON.stringify(again),'same seed must reproduce identical challenge');
    if(exact.has(c.signature.exact))duplicates++;
    exact.add(c.signature.exact); shapes.add(c.signature.shape); families.add(c.family); tested++;
  }
  assert.ok(families.size >= (mode==='algorithms'?8:mode==='compare'?6:7), mode+'/'+difficulty+' family coverage');
  report[mode+'/'+difficulty]={tested:1000,exactDuplicates:duplicates,exactDuplicatePct:+(duplicates/10).toFixed(1),normalizedStructures:shapes.size,families:families.size};
}

// Advanced has additional code structures in every new mode.
assert.ok(G.familiesFor('algorithms','advanced').some(f=>f.id==='algo.multi.filter'));
assert.ok(G.familiesFor('compare','advanced').some(f=>f.id==='compare.alias.reassign'));
assert.ok(G.familiesFor('loop','advanced').some(f=>f.id==='loop.combined'));
assert.ok(!G.familiesFor('algorithms','beginner').some(f=>f.id==='algo.multi.filter'));
assert.ok(!G.familiesFor('compare','beginner').some(f=>f.id==='compare.alias.reassign'));
assert.ok(!G.familiesFor('loop','beginner').some(f=>f.id==='loop.combined'));

// Session-level anti-repeat and assessment accounting for all seven modes.
for (const mode of ['predict','index','expr','trace','algorithms','compare','loop']) {
  const s=G.createSession({seed:88001,mode,difficulty:'intermediate'}), seen=new Set();
  for(let i=0;i<50;i++){const c=s.next();assert.ok(!seen.has(c.signature.exact),mode+' repeated exact question in short session');seen.add(c.signature.exact);}
}
const tracker=globalThis.StringLab.Session.create({now:(()=>{let t=0;return()=>++t;})()});
for(const mode of G.MODES.map(m=>m.id)){
  const c=G.generateChallenge({seed:500+G.MODES.findIndex(m=>m.id===mode),mode,difficulty:'beginner'});
  tracker.present(c);tracker.answer(c.correctIndex);assert.equal(tracker.answer(c.correctIndex),null);
}
const summary=tracker.summary();
assert.equal(summary.completed,7); assert.equal(summary.firstAttemptCorrect,7);
assert.equal(Object.keys(summary.byMode).length,7);

// Compile and execute representative complete algorithms and comparison snippets with the installed JVM.
function unquote(s){return /^".*"$/.test(s)?s.slice(1,-1):s;}
function javaRun(code, expected, throwsExpected=false) {
  jvmPrograms++;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'string-lab-java-'));
  try {
    const source='public class Probe { public static void main(String[] args) {\n'+code+'\n} }';
    fs.writeFileSync(path.join(dir,'Probe.java'),source);
    const compile=spawnSync('java',['com.sun.tools.javac.Main','-d',dir,path.join(dir,'Probe.java')],{encoding:'utf8'});
    assert.equal(compile.status,0,'javac: '+compile.stderr+'\n'+code);
    const run=spawnSync('java',['-cp',dir,'Probe'],{encoding:'utf8'});
    if(throwsExpected){assert.notEqual(run.status,0,'expected Java boundary exception');assert.match(run.stderr,/StringIndexOutOfBoundsException/);}
    else {assert.equal(run.status,0,run.stderr+'\n'+code);assert.equal(run.stdout.trim(),expected,'runtime mismatch for '+code);}
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
for(const f of G.familiesFor('algorithms','advanced')){
  const c=G.generateChallenge({seed:931,family:f.id,mode:'algorithms',difficulty:'advanced'});
  if(c.family==='algo.reverse.build' && c.prompt.includes('after')){
    const word=(c.code.join('\n').match(/String word = "([^"]*)"/ )||[])[1], n=Number(c.prompt.match(/after (\d+) loop iterations/)[1]);
    assert.equal(c.answer,'"'+word.slice(-n).split('').reverse().join('')+'"'); continue;
  }
  if(c.family==='algo.transform.filter' && c.prompt.includes('after')){
    const code=c.code.join('\n'), word=(code.match(/String word = "([^"]*)"/ )||[])[1], target=(code.match(/String target = "([^"]*)"/ )||[])[1], end=Number(c.prompt.match(/index (\d+)/)[1]), keep=code.includes('letter.equals(target)');
    let result=''; for(let i=0;i<=end;i++){const match=word[i]===target;if(match===keep)result+=word[i];}
    assert.equal(c.answer,'"'+result+'"'); continue;
  }
  javaRun(c.code.join('\n'),unquote(c.answer));
}
for(const f of G.familiesFor('compare','advanced')){
  const c=G.generateChallenge({seed:932,family:f.id,mode:'compare',difficulty:'advanced'});
  if(c.family==='compare.choose.expression')continue;
  javaRun(c.code.join('\n'),unquote(c.answer).replaceAll(' / ','\n'));
}
for(const pattern of ['alias-same-object','separate-objects','same-literal']){
  let c; for(let seed=1;seed<1000;seed++){const candidate=G.generateChallenge({seed,family:'compare.identity.alias',mode:'compare',difficulty:'advanced'});if(candidate.meta.pattern===pattern){c=candidate;break;}}
  assert.ok(c,'missing reference scenario '+pattern);
  javaRun(c.code.join('\n'),unquote(c.answer).replaceAll(' / ','\n'));
}
// Compile every loop-completion family after inserting its correct option, and execute result/exception families.
for(const f of G.familiesFor('loop','advanced')){
  const c=G.generateChallenge({seed:933,family:f.id,mode:'loop',difficulty:'advanced'});
  let code=c.code.join('\n');
  if(code.includes('______'))code=code.replace(/_{3,}/g,c.answer);
  if(c.family==='loop.edge'){
    const w=(code.match(/String word = "([^"]*)"/ )||[])[1] || '';
    javaRun(code,c.answer.includes('StringIndexOutOfBoundsException')?'':w,c.answer.includes('StringIndexOutOfBoundsException'));
  }
  else if(c.family==='loop.bug'){
    const w=(code.match(/String word = "([^"]*)"/)||[])[1];
    if(c.answer.includes('StringIndexOutOfBoundsException'))javaRun(code,'',true);
    else javaRun(code,w.slice(0,-1));
  } else if(c.family==='loop.bound'){
    const w=(code.match(/String word = "([^"]*)"/ )||[])[1];
    javaRun(code,w.split('').join('\n'));
  } else javaRun(code,'');
}
for(const pattern of ['edge-0','edge-1','edge-2']){
  let c; for(let seed=1;seed<1000;seed++){const candidate=G.generateChallenge({seed,family:'loop.edge',mode:'loop',difficulty:'advanced'});if(candidate.meta.pattern===pattern){c=candidate;break;}}
  assert.ok(c,'missing boundary case '+pattern);
  const code=c.code.join('\n'), w=(code.match(/String word = "([^"]*)"/ )||[])[1]||'';
  javaRun(code,pattern==='edge-1'?w:'',pattern==='edge-2');
}
// Every blank in each loop family accepts its keyed completion and remains valid Java.
for(const f of G.familiesFor('loop','advanced')){
  const c=G.generateChallenge({seed:944,family:f.id,mode:'loop',difficulty:'advanced'});
  let code=c.code.join('\n'); if(code.includes('______'))code=code.replace(/_{3,}/g,c.answer);
  if(c.family==='loop.edge')continue; // execution and exception branches are compiled in the representative pass above.
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'string-lab-fill-'));
  try{
    fs.writeFileSync(path.join(dir,'Probe.java'),'public class Probe { public static void main(String[] args) {\n'+code+'\n} }');
    const compile=spawnSync('java',['com.sun.tools.javac.Main','-d',dir,path.join(dir,'Probe.java')],{encoding:'utf8'});
    assert.equal(compile.status,0,'correct loop completion must compile: '+compile.stderr+'\n'+code);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
// Confirm both overlap policies and Java substring boundary behavior against the JVM.
for(const pattern of ['overlap','nonoverlap']){
  let c;
  for(let seed=1;seed<500;seed++){const candidate=G.generateChallenge({seed,family:'algo.substring.count',mode:'algorithms',difficulty:'advanced'});if(candidate.meta.pattern===pattern){c=candidate;break;}}
  assert.ok(c,'did not produce '+pattern+' substring search');
  javaRun(c.code.join('\n'),c.answer);
}
javaRun('String word = "aaaa"; String target = "aa"; int count = 0; int start = 0; while (start <= word.length() - target.length()) { int relative = word.substring(start).indexOf(target); if (relative == -1) break; start += relative; count++; start += 1; } System.out.println(count);','3');

console.log(JSON.stringify({tested,modeDifficulty:report,jvmRepresentativePrograms:jvmPrograms,result:'PASS'},null,2));
