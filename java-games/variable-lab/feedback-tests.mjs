import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import * as J from '../engine.js';
import {literalInfo, assignmentCompatible, identifierIssue, diagnoseAssembly} from './feedback.js';
let seed = 262026, checks = 0;
Math.random = () => (seed = (Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const ok = (value, message) => {assert.ok(value, message); checks++;};
const eq = (a,b) => {assert.deepEqual(a,b); checks++;};
export const classroomIdentification = {
  game:'variable-lab', mode:'identify', kind:'select', topic:'operator',
  prompt:'Select the assignment operator in the declaration of ovenPreheated.',
  root:J.region('snippet', J.region('aux-declaration',J.leaf('aux-type','int'),' ',J.leaf('aux-name','eggsNeeded'),' ',J.leaf('aux-operator','='),' ',J.leaf('aux-value','3'),';'),'\n',
    J.region('declaration',J.leaf('type','boolean'),' ',J.leaf('name','ovenPreheated'),' ',J.leaf('operator','='),' ',J.leaf('value','false'),';')),
  answerId:'operator', explanation:'= is the assignment operator. It initializes ovenPreheated with false, a Boolean literal. == compares values instead of assigning them.',
};
export const classroomAssembly = {
  game:'variable-lab', mode:'assemble', kind:'assemble', topic:'assemble-int',
  prompt:'The garden club planted 45 seeds. Store the number of seeds planted.',
  convention:'Choose the most appropriate type: int for whole-number quantities, double for decimal quantities, boolean for true/false, char for one character, and String for text.',
  answer:{type:'int',name:'seedsPlanted',operator:'=',value:'45'},
  fields:[
    {id:'type',label:'Type',choices:['int','char','double','boolean','String']},
    {id:'name',label:'Variable name',choices:['seedsPlanted','seeds-planted','plantCount','class']},
    {id:'operator',label:'Operator',choices:['=','==','!=']},
    {id:'value',label:'Value',choices:['45','45.0','"45"','45,0']},
  ],
  explanation:'int seedsPlanted = 45; int fits the whole-number count in this scenario.',
};
// Fixtures exported as JSON only when requested, keeping the production bank unchanged.
const evidence = {seed:262026, identification:{}, assembly:{}, java:[]};
for (const [id, category] of [['value','Boolean literal'],['type','primitive data type'],['name','variable name'],['declaration','declaration and initialization statement']]) {
  const text = J.hint(classroomIdentification,1,{id});
  ok(text.includes(category),text); ok(text.includes(J.nodes(classroomIdentification.root).find(n=>n.id===id).text));
  ok(!text.includes('= is the assignment')); evidence.identification[id]=text;
}
const h1=J.hint(classroomIdentification,1,{id:'value'}), h2=J.hint(classroomIdentification,2,{id:'value'},{id:'value'}), h3=J.hint(classroomIdentification,3,{id:'value'},{id:'value'});
ok(h2.includes('between the variable name and its value')); eq(new Set([h1,h2,h3]).size,3);
ok(J.hint(classroomIdentification,1,{id:'aux-operator'}).includes('different variable'));
ok(J.explanation(classroomIdentification,{}, {id:'value'},true).includes('false'));
ok(J.explanation(classroomIdentification,{}, {id:'value'},true).includes('= is the assignment'));
eq(J.assess(classroomIdentification,{id:'operator'}),true);
const categories=new Set(), variants={};
// Difficulty options are intentionally ignored by these modes: no new levels.
for (const difficulty of ['beginner','intermediate','advanced']) for (const variant of J.identifyVariants) for(let i=0;i<25;i++) {
  const q=J.generate('variable-lab','identify',variant,{difficulty});
  eq(J.assess(q,J.solution(q)),true); variants[variant]=(variants[variant]||0)+1;
  const wrongs=q.kind==='select' ? J.nodes(q.root).filter(n=>n.id!=='snippet' && n.id!==q.answerId).map(n=>({id:n.id})) : q.choices.filter(x=>x!==String(q.answer)).map(answer=>({answer}));
  for(const wrong of wrongs) {
    eq(J.assess(q,wrong),false);
    const first=J.hint(q,1,wrong), second=J.hint(q,2,wrong,wrong), third=J.hint(q,3,wrong,wrong);
    const actual=q.kind==='select' ? J.nodes(q.root).find(n=>n.id===wrong.id).text : wrong.answer;
    ok(first.includes(actual),first); ok(first.length>80); ok(!first.includes('Separate the data type'));
    ok(first!==second && second!==third);
    if(q.kind==='select') {
      ok(first.includes('The question asks for a'));
      categories.add(first.match(/That is an? (.*?)\. The question/)[1]);
      // Wrong feedback must not emit the worked answer or mark the target.
      ok(!first.includes(q.explanation));
    }
    const reveal=J.explanation(q,J.solution(q),wrong,true); ok(reveal.includes(q.explanation));
  }
}
evidence.identification.generated=variants; evidence.identification.categories=[...categories];
const bad={type:'char',name:'seeds-planted',operator:'==',value:'45.0'};
const issues=diagnoseAssembly(classroomAssembly,bad), text=J.hint(classroomAssembly,1,bad);
ok(issues.some(x=>x.id==='operator')); ok(issues.some(x=>x.id==='identifier')); ok(issues.some(x=>x.id==='compatibility'));
for(const token of Object.values(bad)) ok(text.includes(token));
ok(text.includes('double')); ok(text.includes('hyphen')); ok(!text.includes('int seedsPlanted = 45;'));
evidence.assembly.classroom=text;
const after={...bad,operator:'='};
const retry=J.hint(classroomAssembly,2,after,bad); ok(retry.includes('Progress: you corrected operator')); ok(!retry.includes('“=” compares'));
evidence.assembly.retry=retry;
const solved=classroomAssembly.answer;
eq(J.assess(classroomAssembly,solved),true);
ok(J.explanation(classroomAssembly,solved,bad).includes('int seedsPlanted = 45;'));
ok(J.explanation(classroomAssembly,{},bad,true).includes('char'));
const base={...classroomAssembly, convention:undefined};
for(const count of [1,2,3,4]) {
  const r={...solved};
  if(count>=1)r.operator='=='; if(count>=2)r.name='class';
  if(count>=3)r.type='boolean'; if(count>=4)r.value='45,0';
  const fixture=count===4 ? classroomAssembly : base;
  const d=diagnoseAssembly(fixture,r);
  eq(d.length,count); eq(J.assess(fixture,r),false);
  evidence.assembly['issues'+count]=J.hint(fixture,1,r);
}
eq(J.assess(classroomAssembly,{...solved,name:'plantCount'}),true);
eq(J.assess(classroomAssembly,{...solved,type:'double'}),false);
ok(J.hint(classroomAssembly,1,{...solved,type:'double'}).includes('can legally receive'));
eq(J.assess(base,{...solved,type:'double'}),true);
for(const name of ['class','true','false','null','_','4seeds','seeds-planted','seed count']) ok(identifierIssue(name));
for(const name of ['plantCount','_count','$count','var','count2','café','αριθμός']) eq(identifierIssue(name),null);
// Compiler oracle covers direct initialization, lexical errors and whole
// statements. Identity/widening and constant-int narrowing are distinct cases.
const cases=[
 ['int','45',true],['double','45',true],['double','45.0',true],['char','45.0',false],
 ['int','45.0',false],['float','45.0',false],['float','45.0f',true],['double','45.0f',true],
 ['long','45',true],['int','45L',false],['char','65',true],['char','65536',false],['char','-1',false],
 ['byte','127',true],['byte','128',false],['short','32767',true],['short','32768',false],
 ['int',"'7'",true],['double',"'7'",true],['char',"'7'",true],['char',"'!'",true],
 ['String','"A"',true],['char','"A"',false],['String',"'A'",false],['char',"'AB'",false],
 ['boolean','false',true],['boolean','"false"',false],['String','"false"',true],['boolean','False',false],
 ['int','"45"',false],['int','45,000',false],['int','$45',false],['double','45%',false],
 ['char',"'\\n'",true],['String','"hello\\nworld"',true],['int','2147483648',false],['long','2147483648L',true],
 ['int','-2147483648',true],['char',"''",false],['String','"unfinished',false],
];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'variable-feedback-'));
const manifest=[];
for(const [i,[type,value,valid]] of cases.entries()) {
  eq(assignmentCompatible(type,literalInfo(value)),valid);
  const file=path.join(dir,`literal-${i}.java`);
  fs.writeFileSync(file,`public class Practice {public static void main(String[] args){${type} sample = ${value};}}`);
  manifest.push(`${file}\t${valid}`); evidence.java.push({declaration:`${type} sample = ${value};`,valid});
}
for(const [i,r] of [bad,{...solved,operator:'!='},{...solved,name:'class'},{...solved,name:'_count'}].entries()) {
  const valid=i===3, file=path.join(dir,`whole-${i}.java`);
  fs.writeFileSync(file,`public class Practice {public static void main(String[] args){${r.type} ${r.name} ${r.operator} ${r.value};}}`);
  manifest.push(`${file}\t${valid}`);
}
for(let i=0;i<300;i++) {
  const q=J.generate('variable-lab','assemble'), a=q.answer;
  eq(J.assess(q,a),true);
  for(const field of q.fields) for(const choice of field.choices) {
    const r={...a,[field.id]:choice}, d=diagnoseAssembly(q,r);
    eq(J.assess(q,r),d.length===0);
    if(choice===a[field.id])eq(d,[]);
    else if(field.id==='name' && !identifierIssue(choice))eq(d,[]);
    else {ok(d.length>0); ok(J.hint(q,1,r).includes(choice));}
  }
}
fs.writeFileSync(path.join(dir,'manifest.tsv'),manifest.join('\n'));
const java=process.env.JAVA_BIN || '/usr/lib/jvm/java-17-openjdk-amd64/bin/java';
const compiler=execFileSync(java,[new URL('../compiler-harness.java',import.meta.url).pathname,path.join(dir,'manifest.tsv')],{encoding:'utf8',timeout:120000});
evidence.compiler=compiler.trim(); evidence.checks=checks;
if(process.env.VARIABLE_FEEDBACK_EVIDENCE) {
  fs.mkdirSync(process.env.VARIABLE_FEEDBACK_EVIDENCE,{recursive:true});
  fs.writeFileSync(path.join(process.env.VARIABLE_FEEDBACK_EVIDENCE,'feedback-results.json'),JSON.stringify(evidence,null,2));
  fs.writeFileSync(path.join(process.env.VARIABLE_FEEDBACK_EVIDENCE,'classroom-fixtures.json'),JSON.stringify({identify:classroomIdentification,assemble:classroomAssembly},null,2));
}
console.log(`${checks} feedback assertions passed; 900 Identification challenges (all 12 variants × 3 supplied difficulty options × 25), 300 Assemble challenges. ${compiler.trim()}`);
