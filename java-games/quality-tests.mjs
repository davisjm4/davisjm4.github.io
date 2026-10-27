// Variable Lab instructional-quality tests: type balance, scenario diversity,
// answer leakage, distractor quality, Identification wording/targets, and javac.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as J from './engine.js';
import {scenarioFamilies, TYPES} from './variable-scenarios.js';
import {identifierIssue} from './variable-lab/feedback.js';
let seed=91923; Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const JAVA=process.env.JAVA_BIN||['/usr/lib/jvm/java-17-openjdk-amd64/bin/java','/usr/lib/jvm/java-21-openjdk-amd64/bin/java'].find(p=>fs.existsSync(p))||'java';
const dir='/tmp/java-quality'; fs.mkdirSync(dir,{recursive:true});
const manifest=[]; const report=[];
const identifier=/^[a-z][A-Za-z0-9]*$/;
const keywords=new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null var'.split(' '));

// ---- Library integrity
assert.ok(scenarioFamilies.length>=20, 'at least 20 scenario families');
const allNames=new Set();
for(const f of scenarioFamilies){
  assert.deepEqual(f.items.map(i=>i.type).sort(),[...TYPES].sort(),`${f.id} offers every type once`);
  for(const i of f.items){
    assert.ok(identifier.test(i.name)&&!keywords.has(i.name),`valid variable name ${i.name}`);
    assert.ok(/[A-Z]/.test(i.name),`camelCase ${i.name}`);
    assert.ok(!allNames.has(i.name),`unique name ${i.name}`); allNames.add(i.name);
    assert.ok(!i.ask.includes(i.name)&&!/\b(int|double|boolean|char|String|whole number|decimal|true\/false)\b/.test(i.ask),`ask does not leak: ${i.ask}`);
  }
}

// ---- A. Data type distribution (1,000 Assemble challenges)
J.resetVariableLabState();
const counts=Object.fromEntries(TYPES.map(t=>[t,0])), gaps=Object.fromEntries(TYPES.map(t=>[t,0])), last=Object.fromEntries(TYPES.map(t=>[t,-1]));
const sequence=[], families={}, structures=new Set(), prompts=[];
let maxRun=1, run=1;
for(let i=0;i<1000;i++){
  const q=J.generate('variable-lab','assemble'), a=q.answer;
  sequence.push(a.type); counts[a.type]++;
  for(const t of TYPES){ if(t===a.type){gaps[t]=Math.max(gaps[t],i-last[t]-1); last[t]=i;} }
  if(i&&sequence[i-1]===a.type){run++;maxRun=Math.max(maxRun,run);} else run=1;
  families[q.scenario.family]=(families[q.scenario.family]||0)+1;
  structures.add(q.scenario.family+'/'+a.name); prompts.push(q.prompt);
  // leakage: no Java literal or name in the prompt
  assert.ok(!q.prompt.includes(a.name),`name leaked: ${q.prompt}`);
  if(a.type==='String') assert.ok(!q.prompt.includes(a.value),`String literal leaked: ${q.prompt}`);
  if(a.type==='char') assert.ok(!q.prompt.includes(a.value),`char literal leaked: ${q.prompt}`);
  if(a.type==='boolean') assert.ok(!/\b(true|false)\b/.test(q.prompt),`boolean literal leaked: ${q.prompt}`);
  assert.ok(!/\b(int|double|boolean|char|String)\b/.test(q.prompt),`type leaked: ${q.prompt}`);
  assert.ok(!q.prompt.includes('"')&&!/'[^s ]/.test(q.prompt.replace(/\w'\w/g,'')),`quote syntax in prompt: ${q.prompt}`);
  assert.ok(q.prompt.length<=150,`short prompt: ${q.prompt}`);
  // literal formats
  if(a.type==='int') assert.ok(/^\d+$/.test(a.value));
  if(a.type==='double') assert.ok(/^\d+\.\d+$/.test(a.value)&&Number(a.value)%1!==0);
  if(a.type==='boolean') assert.ok(['true','false'].includes(a.value));
  if(a.type==='char') assert.ok(/^'.'$/u.test(a.value));
  if(a.type==='String') assert.ok(/^"[^"]+"$/.test(a.value));
  // Unique choices; valid alternative names are allowed because the prompt
  // does not require a particular identifier. Other scenario requirements hold.
  assert.deepEqual(q.fields.map(f=>f.choices.length),[5,4,3,4]);
  for(const f of q.fields){
    assert.equal(f.choices.length,new Set(f.choices).size);
    assert.equal(f.choices.filter(x=>x===a[f.id]).length,1);
    for(const x of f.choices.filter(x=>x!==a[f.id])) assert.equal(J.assess(q,{...a,[f.id]:x}),f.id==='name' && !identifierIssue(x));
  }
  assert.ok(J.assess(q,a));
  if(i<400){const path=`${dir}/assemble-${i}.java`;fs.writeFileSync(path,q.compilerSource);manifest.push(path+'\ttrue');}
  // wrong value literals should be wrong Java (or a different value), checked by javac below
  if(i<150) for(const [k,wrong] of q.fields.find(f=>f.id==='value').choices.filter(x=>x!==a.value).entries()){
    const path=`${dir}/assemble-${i}-wrong-${k}.java`;
    fs.writeFileSync(path,`public class Practice { public static void main(String[] args) { ${a.type} ${a.name} = ${wrong}; } }`);
    manifest.push(path+'\tany');
  }
}
for(const t of TYPES) assert.ok(counts[t]>=190&&counts[t]<=210,`${t} near 20%: ${counts[t]}`);
for(let b=0;b<1000;b+=25){const block=sequence.slice(b,b+25);for(const t of TYPES) assert.equal(block.filter(x=>x===t).length,5,'five per 25');}
assert.ok(gaps.String<=12&&gaps.char<=12,`no prolonged absence ${JSON.stringify(gaps)}`);
assert.ok(maxRun<=2,'no type three times in a row');
// not a fixed rotation
const fives=new Set();for(let i=0;i+5<=1000;i+=5) fives.add(sequence.slice(i,i+5).join());
assert.ok(fives.size>100,'order is not a repeated cycle');
report.push(`A. 1,000 Assemble challenges: ${TYPES.map(t=>`${t} ${counts[t]} (${(counts[t]/10).toFixed(1)}%)`).join(', ')}. Every block of 25 has exactly 5 of each type. Longest absence: ${TYPES.map(t=>`${t} ${gaps[t]}`).join(', ')}. Longest same-type run: ${maxRun}. Distinct 5-question orderings: ${fives.size}/200.`);

// ---- B. Scenario diversity (first 200)
J.resetVariableLabState();
const fam200={}, struct200=new Set(); let repeatsInWindow=0; const recent=[];
for(let i=0;i<200;i++){
  const q=J.generate('variable-lab','assemble');
  fam200[q.scenario.family]=(fam200[q.scenario.family]||0)+1;
  const key=q.scenario.family+'/'+q.answer.name;
  if(recent.includes(q.scenario.family)) repeatsInWindow++;
  recent.push(q.scenario.family); if(recent.length>5) recent.shift();
  struct200.add(key);
}
const famCounts=Object.values(fam200);
assert.ok(Object.keys(fam200).length>=20,'200 challenges reach 20+ families');
assert.ok(Math.max(...famCounts)<=16,'no family dominates');
assert.equal(repeatsInWindow,0,'no family repeats within 5 consecutive challenges');
const original=['library','entertainment','video-games'].reduce((s,f)=>s+(fam200[f]||0),0);
assert.ok(original/200<0.2,'original contexts no longer dominate');
report.push(`B. 200 Assemble challenges: ${Object.keys(fam200).length} families (min ${Math.min(...famCounts)}, max ${Math.max(...famCounts)} each); ${struct200.size} distinct situation/variable pairs, ${200-struct200.size} repeats of an earlier pair; same family never within 5 consecutive challenges; original library/movie/video-game contexts ${(original/2).toFixed(1)}% of challenges. Distribution: ${Object.entries(fam200).sort((x,y)=>y[1]-x[1]).map(([k,v])=>k+' '+v).join(', ')}.`);
fs.writeFileSync(dir+'/assemble-prompts.txt',prompts.slice(0,200).join('\n'));

// ---- D. Identification accuracy
J.resetVariableLabState();
const expected={
  type:/^Select the data type of the variable initialized to .+\.$/, name:/^Select the name of the variable initialized to .+\.$/,
  operator:/^Select the assignment operator in the declaration of \w+\.$/, value:/^Select the value that \w+ is initialized to\.$/,
  declaration:/^Select the declaration of \w+, including the value it has been initialized to\.$/,
  initialization:/^Select the declaration and initialization of \w+\.$/, 'assignment-operator':/^Select the assignment operator\.$/,
  assignment:/^Select the statement that assigns a value to the existing variable\.$/, 'declaration-only':/^Select the declaration that does not initialize its variable\.$/,
  stored:/^Select the value stored in \w+ after the reassignment\.$/, conversion:/^Select the resulting value after the explicit conversion\.$/,
  compatibility:/^What kind of conversion happens when a value is assigned to amount\?$/,
};
const idSamples={};
for(const variant of J.identifyVariants) for(let i=0;i<150;i++){
  const q=J.generate('variable-lab','identify',variant);
  assert.match(q.prompt,expected[variant]);
  assert.ok(!/identifier|initializer|gives an existing/i.test(q.prompt+q.explanation),`retired wording: ${q.prompt}`);
  assert.ok(J.assess(q,J.solution(q)));
  if(q.kind==='select'){
    const ns=J.nodes(q.root), target=ns.find(n=>n.id===q.answerId);
    assert.equal(ns.filter(n=>n.id===q.answerId).length,1);
    const text=target.text;
    if(variant==='type') assert.ok(TYPES.includes(text));
    if(variant==='name') assert.ok(identifier.test(text));
    if(variant==='operator'||variant==='assignment-operator') assert.equal(text,'=');
    if(['declaration','initialization'].includes(variant)) assert.match(text,/^(int|double|boolean|char|String) \w+ = .+;$/);
    if(variant==='declaration-only'){assert.match(text,/^(int|double|boolean|char|String) \w+;$/);
      const stmts=ns.filter(n=>n.parent==='snippet').map(n=>n.text);assert.equal(stmts.length,3);
      assert.equal(stmts.filter(t=>/^(int|double|boolean|char|String) \w+;$/.test(t)).length,1,'one uninitialized declaration');
      assert.ok(stmts.some(t=>/^(int|double|boolean|char|String) \w+ = .+;$/.test(t))&&stmts.some(t=>/^\w+ = .+;$/.test(t)),'has initialized declaration and assignment decoys');
      assert.ok(stmts.indexOf(text)<stmts.findIndex(t=>/^\w+ = .+;$/.test(t)),'declared before assigned');
      assert.ok(!/\b(int|double|boolean|char|String)\b/.test(q.prompt)&&!stmts.some(t=>q.prompt.includes(t.split(' ')[1]?.replace(';',''))),'prompt names no variable or type');}
    if(variant==='assignment') assert.match(text,/^\w+ = .+;$/);
    // the prompt identifies exactly one candidate: no other node has the same text when the prompt refers by value/name
    if(['type','name'].includes(variant)){const lit=q.prompt.match(/initialized to (.+)\.$/)[1];assert.equal(ns.filter(n=>/value$/.test(n.id)&&n.text===lit).length,1,'value identifies one declaration');}
    if(['operator','value','declaration','initialization'].includes(variant)){const nm=q.prompt.match(/of (\w+)|that (\w+) is|of (\w+),/);assert.ok(nm);assert.equal(ns.filter(n=>/name$/.test(n.id)&&n.text===(nm[1]||nm[2]||nm[3])).length,1);}
    if(variant==='assignment-operator') assert.equal(ns.filter(n=>!n.children&&n.text==='=').length,1,'only one = in code');
    // prompt does not contain the selection itself (for structural targets)
    if(['declaration','initialization','assignment','declaration-only'].includes(variant)) assert.ok(!q.prompt.includes(text));
    // selectable: the target is reachable by tapping a leaf and expanding
    if(target.children){const leafChild=ns.find(n=>n.parent===target.id); assert.ok(leafChild||target.children.some(c=>typeof c==='string'),'expandable');}
  } else {
    assert.equal(q.choices.length,new Set(q.choices).size);
    assert.equal(q.choices.filter(x=>x===String(q.answer)).length,1);
    assert.ok(q.choices.length>=3);
    if(variant==='conversion'){const v=Number(q.code.match(/= (-?[\d.]+);/)[1]);assert.equal(q.answer,Math.trunc(v));assert.ok(!q.prompt.includes(String(q.answer)));}
  }
  if(i<40){const path=`${dir}/identify-${variant}-${i}.java`;fs.writeFileSync(path,q.compilerSource);manifest.push(path+'\ttrue');}
  if(!idSamples[variant]) idSamples[variant]={prompt:q.prompt,code:q.code,answer:q.kind==='select'?J.nodes(q.root).find(n=>n.id===q.answerId).text:q.answer};
}
// explicit-conversion truncation toward zero, including negatives
const negatives=new Set();for(let i=0;i<300;i++){const q=J.generate('variable-lab','identify','conversion');const v=Number(q.code.match(/= (-?[\d.]+);/)[1]);if(v<0){negatives.add(v);assert.ok(q.answer>v&&q.answer===Math.ceil(v));}}
assert.ok(negatives.size>10);
const conversionAnswers=new Set();for(let i=0;i<120;i++) conversionAnswers.add(J.generate('variable-lab','identify','compatibility').answer);
assert.equal(conversionAnswers.size,3);
const positions=new Set();for(let i=0;i<60;i++){const q=J.generate('variable-lab','identify','declaration');positions.add(q.root.children.filter(x=>typeof x!=='string').findIndex(x=>x.id==='declaration'));}
assert.equal(positions.size,2);
// unforced identification never repeats the same variant twice in a row and covers all variants
let prev=null;const seenV=new Set();for(let i=0;i<500;i++){const q=J.generate('variable-lab','identify');assert.notEqual(q.topic,prev);prev=q.topic;seenV.add(q.topic);}
assert.equal(seenV.size,J.identifyVariants.length);
const modes=new Set(Array.from({length:100},()=>J.generate('variable-lab').mode));assert.deepEqual([...modes].sort(),['assemble','identify','trace']);
// Mixed Practice shows all five types in Assemble challenges
const mixedTypes={};for(let i=0;i<400;i++){const q=J.generate('variable-lab');if(q.kind==='assemble') mixedTypes[q.answer.type]=(mixedTypes[q.answer.type]||0)+1;}
assert.deepEqual(Object.keys(mixedTypes).sort(),[...TYPES].sort());
report.push(`D. Identification: ${J.identifyVariants.length} categories × 150 samples; revised wording, single correct target, matching target kind, and no retired terms verified. Mixed Practice Assemble types in 400 challenges: ${JSON.stringify(mixedTypes)}.`);

// ---- C. Java correctness with javac
fs.writeFileSync(dir+'/manifest.tsv',manifest.join('\n'));
const javac=execFileSync(JAVA,[new URL("./compiler-harness.java",import.meta.url).pathname,dir+'/manifest.tsv'],{encoding:'utf8',timeout:240000});
// Every wrong value literal must either fail to compile or be a different value.
let wrongCompile=0,wrongTotal=0;
for(const line of manifest.filter(l=>l.includes('-wrong-'))){wrongTotal++;const r=fs.readFileSync(line.split('\t')[0]+'.diagnostic','utf8');if(r==='OK')wrongCompile++;}
report.push(`C. ${javac.trim()} (400 Assemble answers + ${J.identifyVariants.length*40} Identification snippets must compile; ${wrongTotal} distractor declarations: ${wrongTotal-wrongCompile} rejected by javac, ${wrongCompile} compile but store a different value).`);

// ---- JVM check: reassignment and explicit-conversion answers match real Java output
const behavior=[];
for(const variant of ['stored','conversion']) for(let i=0;i<30;i++){
  const q=J.generate('variable-lab','identify',variant), path=`${dir}/run-${variant}-${i}.java`;
  fs.writeFileSync(path,`public class Practice {public static void main(String[] args){${q.code}\nSystem.out.println(${q.resultVariable});}}`);
  behavior.push({path,expected:String(q.answer)});
}
fs.writeFileSync(dir+'/behavior.tsv',behavior.map(b=>b.path+'\ttrue').join('\n'));
execFileSync(JAVA,[new URL("./compiler-harness.java",import.meta.url).pathname,dir+'/behavior.tsv'],{encoding:'utf8',timeout:240000});
for(const b of behavior) assert.equal(execFileSync(JAVA,['-cp',b.path+'-classes','Practice'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(),b.expected);
report.push(`JVM: ${behavior.length} reassignment and casting programs printed exactly the expected answer (including negative truncation toward zero).`);
fs.writeFileSync(dir+'/variable-samples.json',JSON.stringify(idSamples,null,2));
fs.writeFileSync(dir+'/variable-report.txt',report.join('\n'));
console.log(report.join('\n'));
console.log('Variable quality tests passed.');
