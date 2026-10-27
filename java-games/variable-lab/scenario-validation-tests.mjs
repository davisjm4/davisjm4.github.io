import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import * as J from '../engine.js';
import {scenarioFamilies} from '../variable-scenarios.js';
import {diagnoseAssembly, identifierIssue} from './feedback.js';
import {launch} from './feedback-ui-tests.mjs';
let seed=20261026, checks=0;
Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;}, ok=(v,message)=>{assert.ok(v,message);checks++;};
const evidence={seed,scenarios:[],fixtures:{},generated:{},browserFixtures:{}};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'variable-scenarios-')), manifest=[];
function compilerSample(q,r,valid,id) {
  const file=path.join(dir,id+'.java');
  fs.writeFileSync(file,`public class Practice { public static void main(String[] args) { ${r.type} ${r.name} ${r.operator} ${r.value}; } }`);
  manifest.push(`${file}\t${valid}`);
}
function build(family,item,literal) {
  const value=J.scenarioValue(item);
  if(literal!==undefined) {
    value.literal=literal;
    const spoken=item.type==='String'?literal.slice(1,-1):item.type==='boolean'?literal==='true':item.type==='char'?item.chars.find(([c])=>`'${c}'`===literal)[1]:literal;
    value.sentence=item.say(spoken); value.spoken=spoken;
  }
  return {...J.buildAssembleChallenge(family,item,value),game:'variable-lab',mode:'assemble'};
}
const allItems=scenarioFamilies.flatMap(f=>f.items);
// Every authored scenario, all text/char/Boolean alternatives and numeric
// endpoints. Human semantic review is recorded alongside mechanical coverage.
for(const family of scenarioFamilies) for(const item of family.items) {
  const values=item.texts?.map(t=>`"${t}"`) || item.chars?.map(([c])=>`'${c}'`) ||
    (item.type==='boolean'?['true','false']:item.range.slice(0,2).map(n=>item.type==='int'?String(n):n.toFixed(item.money?2:(String(item.range[2]).split('.')[1]||'').length)));
  const row={family:family.id,type:item.type,name:item.name,request:item.ask,acceptedNames:[item.name,...(item.acceptedNames||[])],examples:[],potentialNameDistractors:family.items.filter(i=>i!==item).map(i=>({name:i.name,meaning:i.ask})),ambiguity:'None among existing dropdown options: each sibling describes a different requested property.'};
  for(const literal of values) {
    const q=build(family,item,literal), c=q.contract;
    eq(c.scenarioText,q.prompt);eq(c.storedInformation,item.ask);eq(c.expectedType,item.type);
    eq(c.expectedOperator,'=');eq(c.acceptedValues,[literal]);eq(c.acceptedNames,row.acceptedNames);
    eq(c.typeConvention,q.convention);ok(q.fields.find(f=>f.id==='name').choices.includes(item.name));
    eq(J.assess(q,q.answer),true);eq(diagnoseAssembly(q,q.answer),[]);
    // Check every catalog name, not just the two randomly chosen sibling names.
    for(const other of allItems.filter(i=>!c.acceptedNames.includes(i.name))) {
      const wrong={...q.answer,name:other.name};
      eq(identifierIssue(wrong.name),null);eq(J.assess(q,wrong),false);
      const issues=diagnoseAssembly(q,wrong);eq(issues.map(i=>i.id),['scenario-name']);eq(issues[0].fields,['name']);
      const first=J.hint(q,1,wrong),second=J.hint(q,2,wrong,wrong);
      ok(first.includes(wrong.name));ok(first.includes(item.ask));ok(first.includes('valid Java'));
      ok(first.includes('Your data type, assignment operator, value are correct.'));
      ok(!first.includes(q.answer.name));ok(first!==second);
    }
    for(const name of q.fields.find(f=>f.id==='name').choices)eq(J.assess(q,{...q.answer,name}),c.acceptedNames.includes(name));
    row.examples.push({prompt:q.prompt,answer:q.answer});
  }
  const representative=build(family,item,values[0]), sibling=family.items.find(i=>i!==item);
  compilerSample(representative,representative.answer,true,item.name+'-correct');
  compilerSample(representative,{...representative.answer,name:sibling.name},true,item.name+'-wrong-meaning');
  evidence.scenarios.push(row);
}
eq(evidence.scenarios.length,105);eq(scenarioFamilies.length,21);
const restaurant=scenarioFamilies.find(f=>f.id==='restaurant'), entertainment=scenarioFamilies.find(f=>f.id==='entertainment');
const table=build(restaurant,restaurant.items.find(i=>i.name==='tableNumber'),'11');
const ocean=build(entertainment,entertainment.items.find(i=>i.name==='movieTitle'),'"Ocean Quest"');
eq(table.prompt,'The host seats your group at table 11. Store the table number.');
eq(ocean.prompt,'Tonight\'s movie is Ocean Quest. Store the movie title.');
for(const [label,q,name] of [['table',table,'customerName'],['ocean',ocean,'seatRow']]) {
  // Both classroom distractors really are possible dropdown options in source.
  q.fields.find(f=>f.id==='name').choices=[q.answer.name,name,'incorrect-name',q.answer.name+'Other'];
  const wrong={...q.answer,name};
  eq(J.assess(q,wrong),false);eq(J.assess(q,q.answer),true);
  const first=J.hint(q,1,wrong),second=J.hint(q,2,wrong,wrong),reveal=J.explanation(q,J.solution(q),wrong,true);
  ok(!first.includes(q.answer.name));ok(second.includes(q.contract.nameMeanings[name]));
  ok(reveal.includes(q.answer.name));ok(reveal.includes(q.contract.storedInformation));
  for(const [field,value] of [['name','invalid-name'],['type',q.answer.type==='int'?'char':'boolean'],['operator','=='],['value',q.answer.type==='int'?'12':'"Wrong Title"']]) {
    const r={...q.answer,[field]:value};eq(J.assess(q,r),false);ok(diagnoseAssembly(q,r).some(i=>i.fields.includes(field)));
  }
  const multiple={...wrong,operator:'==',type:q.answer.type==='int'?'char':'boolean'};
  ok(diagnoseAssembly(q,multiple).some(i=>i.id==='scenario-name'));
  ok(diagnoseAssembly(q,multiple).some(i=>i.id==='operator'));
  // Actual app retry, first-try accuracy, reveal and completion locks.
  const t=launch('assemble',q);
  t.fill(wrong);t.click('check');eq(t.tracker.snapshot().totals.attempted,1);eq(t.tracker.snapshot().totals.firstTry,0);
  eq(t.tracker.snapshot().totals.submissions,1);ok(!t.$('check').disabled);ok(t.$('feedback').textContent.includes('scenario'));
  t.fill(q.answer);t.click('check');eq(t.tracker.snapshot().totals.afterRetry,1);eq(t.tracker.snapshot().totals.firstTry,0);
  eq(t.tracker.snapshot().totals.submissions,2);ok(t.$('check').disabled);
  t.click('new');t.fill(wrong);t.click('check');t.click('show');
  eq(t.tracker.snapshot().totals.revealed,1);eq(t.tracker.snapshot().totals.afterRetry,1);eq(t.tracker.snapshot().totals.firstTry,0);
  ok(t.$('feedback').textContent.includes(q.answer.name));ok(t.$('feedback').textContent.includes(q.contract.storedInformation));
  t.click('next');t.fill(q.answer);t.click('check');eq(t.tracker.snapshot().totals.firstTry,1);
  evidence.fixtures[label]={prompt:q.prompt,wrong,correct:q.answer,first,second,reveal};
  evidence.browserFixtures[label]=q;
  compilerSample(q,wrong,true,label+'-classroom-valid-java');
}
// Accepted alternatives require explicit authored metadata and a dropdown
// option. There are no such alternate aliases in the current 105-item catalog.
const item={...restaurant.items.find(i=>i.name==='tableNumber'),acceptedNames:['diningTableNumber']};
const alternative=build(restaurant,item,'11');
ok(alternative.fields.find(f=>f.id==='name').choices.includes('diningTableNumber'));
eq(J.assess(alternative,{...alternative.answer,name:'diningTableNumber'}),true);
eq(J.assess(alternative,{...alternative.answer,name:'customerName'}),false);
eq(J.assess(table,{...table.answer,name:'diningTableNumber'}),false);
// Existing numeric-equivalence and type-convention behavior is preserved.
eq(J.assess(table,{...table.answer,value:'11L'}),false);
eq(J.assess(table,{...table.answer,type:'double'}),false);
for(const difficulty of ['beginner','intermediate','advanced']) {
  const names=new Set();
  for(let i=0;i<1000;i++) {
    const q=J.generate('variable-lab','assemble',undefined,{difficulty});
    eq(J.assess(q,J.solution(q)),true);names.add(q.answer.name);
    eq(q.contract.scenarioText,q.prompt);
    for(const name of q.fields.find(f=>f.id==='name').choices)eq(J.assess(q,{...q.answer,name}),q.contract.acceptedNames.includes(name));
  }
  eq(names.size,105);evidence.generated[difficulty]={challenges:1000,scenarios:names.size};
}
fs.writeFileSync(path.join(dir,'manifest.tsv'),manifest.join('\n'));
evidence.compiler=execFileSync(process.env.JAVA_BIN||'/usr/lib/jvm/java-17-openjdk-amd64/bin/java',[new URL('../compiler-harness.java',import.meta.url).pathname,path.join(dir,'manifest.tsv')],{encoding:'utf8',timeout:120000}).trim();
evidence.checks=checks;
if(process.env.VARIABLE_SCENARIO_EVIDENCE) {
  const out=process.env.VARIABLE_SCENARIO_EVIDENCE;fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'scenario-validation.json'),JSON.stringify(evidence,null,2));
  fs.writeFileSync(path.join(out,'classroom-scenario-fixtures.json'),JSON.stringify(evidence.browserFixtures,null,2));
}
console.log(`${checks} scenario assertions passed: 105 authored scenarios, 21 families, all stored text/char/Boolean alternatives and numeric endpoints, 3,000 generated challenges. ${evidence.compiler}`);
