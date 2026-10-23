import assert from "node:assert/strict";
import {
  ACTIVITIES,
  CATEGORIES,
  MODELS,
  MODEL_COUNTS,
  buildChallenge,
  chooseChallenge,
  configurationBank,
  evaluate,
  renderProgram,
  seededAudit,
} from "./engine.js";

const dataSets=[[],[2],[1,4,7]];
const numericInputs=[2,5,8];
const procedureInputs=[2,5,9];
const expectedOutputs=(c)=>{
  const id=c.modelId, x=c.category==="procedures"?procedureInputs[c.variant]:numericInputs[c.variant], values=dataSets[c.variant], p=c.programA;
  const output=values=>values;
  const count=(arr,predicate)=>arr.filter(predicate).length;
  const sum=arr=>arr.reduce((total,n)=>total+n,0);
  const steps=[0,1,3][c.variant];
  switch(id){
    case "sel-same-labels":
    case "sel-same-actions": return output(["Ready"]);
    case "sel-always-true": return output(["Valid"]);
    case "sel-always-false": return output(["Not negative"]);
    case "sel-threshold": return output([x>=5?"Meets target":"Below target"]);
    case "sel-flag": return output([[true,false,true][c.variant]?["Ready","Busy","Offline"][c.variant]:"Disabled"]);
    case "sel-debug": return output([true]);
    case "sel-guard": return output(["Positive"]);
    case "sel-inner": return output(["Nonnegative"]);
    case "sel-overwrite": return output(["Reviewed"]);
    case "sel-boundary": return output([x>5?"Meets target":"Below target"]);
    case "sel-list-empty": return output([values.length?values[0]:"Empty"]);
    case "sel-excluded": return output(["Not zero"]);
    case "sel-repeated-term": return output([c.variant===0]);
    case "sel-loop-control": return output([c.variant===0?0:(c.variant===1?1:3)]);
    case "sel-irrelevant-list": return output([values.length]);
    case "sel-nested-useful": return output([x<4?"Low":x<8?"Middle":"High"]);
    case "sel-redundant-or": return output([[-2,0,3][c.variant]>=0?"Nonnegative":"Negative"]);
    case "sel-after-update": return output([false]);
    case "sel-equivalent": return output([x>=4?"Target":"Other"]);
    case "iter-sum": return output([sum(values)]);
    case "iter-empty": return output([values.length]);
    case "iter-once": return output([1+x]);
    case "iter-repeat-meaningful": return output([10+2*c.variant]);
    case "iter-constant": return output(["Ready"]);
    case "iter-temp": return output(["Ready"]);
    case "iter-filter-sum": return output([sum(values.filter(n=>n>3))]);
    case "iter-filter-count": return output([count(values,n=>n===4)]);
    case "iter-until": return output([Math.max(1,[0,4,8][c.variant]/2)*2]);
    case "iter-until-one": return output([5]);
    case "iter-pairs": return output([values.reduce((n,a)=>n+values.filter(b=>a!==b).length,0)]);
    case "iter-overwrite": return output([values.length?values.at(-1):0]);
    case "iter-last": return output([[[2],[2,5],[1,4,7]][c.variant].at(-1)]);
    case "iter-output": return values.map(n=>n);
    case "iter-copy": return output([values.map(n=>2*n)]);
    case "iter-guarded": return output([3*[0,1,4][c.variant]]);
    case "iter-no-op-if": return output([0]);
    case "iter-twice": return output([sum(values)]);
    case "iter-limit": return output([values.length]);
    case "iter-equivalent": return output([2*x]);
    case "proc-parameter":
    case "proc-return-used": return output([2*x]);
    case "proc-ignored": return output([6]);
    case "proc-constant-bad": return output([5]);
    case "proc-constant-good": return output([4]);
    case "proc-return-ignored": return output([0]);
    case "proc-side-effect": return output([[...values,numericInputs[c.variant]]]);
    case "proc-reuse": return output([values.map(n=>2*n)]);
    case "proc-one-call": return output([["Ready","Queued","Done"][c.variant]]);
    case "proc-branch": return output([x>=5?"Meets":"Below"]);
    case "proc-list": return output([sum(values)]);
    case "proc-overwrite": return output([0]);
    case "proc-local": return output([3*x]);
    case "proc-ignored-branch": return output([Array([1,1,3][c.variant]).fill("Ready")]);
    case "proc-propagate": return output([x>=5?"Accepted":"Try again"]);
    case "proc-shared-list": return output([[...values,c.variant===1?20:10]]);
    case "proc-called-same": return output([[2*[2,4,6][c.variant],2*[2,4,6][c.variant]]]);
    case "proc-return-hidden": return output([0]);
    case "proc-inline": return output([values.map(n=>2*n+1)]);
    case "proc-context": return output([3]);
    case "alg-filter-count": return output([count([[-1,0,2],[0],[3,0,-2]][c.variant],n=>n>0)]);
    case "alg-sum": return output([sum(values)]);
    case "alg-decorative-if": return output([values.length]);
    case "alg-zero-loop": return output(["Ready"]);
    case "alg-efficiency": return output([2*sum(values)]);
    case "alg-sample-only": return output([count(values,n=>n>5)]);
    case "alg-boundary": return output([[[4,5],[5],[4,5,9]][c.variant].filter(n=>n>5).length]);
    case "alg-empty": {
      const items=values;
      if (!items.length) return {error:/out of range/};
      return output([items.reduce((a,b)=>a+b,0)]);
    }
    case "alg-nested": return output([values.reduce((n,a)=>n+values.filter(b=>a!==b).length,0)]);
    case "alg-search": return output([values.includes(4)]);
    case "alg-maximum": return output([Math.max(0,...[[-4],[-4,2],[1,4,7]][c.variant])]);
    case "alg-order": return output([c.variant===0?2:0]);
    case "alg-unused-loop": return output([sum(values)]);
    case "alg-redundant-nested": return output([count(values,n=>n>0)]);
    case "alg-separated-requirement": return output([sum(values)]);
    case "alg-inefficient-correct": return output([2*sum(values)]);
    case "alg-equivalent-one": return output([count([[7,8],[5,8],[4,6,9]][c.variant],n=>n>5)]);
    case "alg-short": return output([values.length]);
    case "alg-wrong-but-meaningful": return output([sum([[-2,3],[-5,-1],[1,-4,2]][c.variant].filter(n=>n>0))]);
    case "alg-all-three": return output([count(values,n=>n%2===0&&n>=4)]);
    default: throw new Error("Missing independent expected-output oracle for "+id);
  }
};

function independentComparisonOutputs(category,pairType,variant,modelId=""){
  if(modelId==="alg-equivalent-one"){
    const list=[[7,8],[5,8],[4,6,9]][variant];
    return [list.filter(item=>item>5).length,list.filter(item=>item>=5).length];
  }
  const number=[2,5,8][variant], list=[[],[2],[1,4,7]][variant];
  const sum=list.reduce((total,item)=>total+item,0);
  const positives=list.filter(item=>item>0).length;
  if(category==="selection"){
    if(pairType===0)return [[number>=5?"Meets target":"Below target"],["Meets target"]];
    if(pairType===1)return [[number>=5?"Meets target":"Below target"],[number>4?"Meets target":"Below target"]];
    return [["Meets target"],["Meets target"]];
  }
  if(category==="iteration"){
    if(pairType===0)return [[sum],[0]];
    if(pairType===1)return [[sum],[sum]];
    return [["Ready"],["Ready"]];
  }
  if(category==="procedures"){
    if(pairType===0)return [[number*2],[5]];
    if(pairType===1)return [[number*2],[number+number]];
    return [[5],[5]];
  }
  if(pairType===0)return [[positives],[0]];
  if(pairType===1)return [[positives],[positives]];
  return [[0],[0]];
}

assert.equal(MODELS.length,80);
assert.deepEqual(MODEL_COUNTS,{selection:20,iteration:20,procedures:20,algorithms:20});
assert.equal(new Set(MODELS.map(m=>m.id)).size,80);
for(const model of MODELS){
  assert.ok(["beginner","intermediate","advanced"].includes(model.difficulty),model.id+" difficulty");
  for(let variant=0;variant<3;variant++){
    const challenge=buildChallenge(model.id,variant);
    const expected=expectedOutputs(challenge);
    if(expected.error){
      assert.match(challenge.runA.error,expected.error,model.id+" expected execution error");
      assert.deepEqual(challenge.runA.outputs,[]);
    }else{
      assert.equal(challenge.runA.error,null,model.id+" unexpected runtime error");
      assert.deepEqual(challenge.runA.outputs,expected,model.id+" variant "+variant+" independent output oracle");
    }
    assert.equal(challenge.category,model.category);
    assert.equal(challenge.difficulty,model.difficulty);
    assert.ok(challenge.reviewFocus.length>5,model.id+" review focus");
    assert.ok(challenge.explanation.length>25,model.id+" explanation");
    assert.ok(challenge.comparison.codeA.length>0 && challenge.comparison.codeB.length>0);
    assert.ok(challenge.comparison.task.length>10);
  }
}

const audit=seededAudit();
assert.equal(audit.models,80);
assert.equal(audit.candidateVariants,240);
assert.ok(audit.configurations>=200);
assert.equal(audit.configurations,208);
assert.equal(audit.exactDuplicateConfigurations,0);
assert.equal(audit.excludedNearDuplicateVariants,32);
assert.ok(audit.modelsWithThreeDistinctBehaviorTraces>=50);
for(const category of Object.keys(CATEGORIES)){
  assert.ok(audit.configurationsByCategory[category]>0);
  assert.ok(audit.reasoningFamilies[category]>=10);
}
for(const difficulty of ["beginner","intermediate","advanced"]) assert.ok(audit.difficulty[difficulty]>0);

const bank=configurationBank();
assert.equal(bank.length,208);
assert.equal(new Set(bank.map(c=>c.id)).size,bank.length);
for(const activity of Object.keys(ACTIVITIES)){
  const generated=chooseChallenge({category:"mixed",activity,difficulty:"",seed:424242,recent:[]});
  assert.equal(generated.activity,activity);
}
const first=chooseChallenge({category:"selection",activity:"compare",seed:19,recent:[]});
const second=chooseChallenge({category:"selection",activity:"compare",seed:19,recent:[first.id,first.modelId,first.comparisonKey]});
assert.notEqual(second.comparisonKey,first.comparisonKey,"comparison repeat avoidance");
assert.equal(
  chooseChallenge({category:"mixed",activity:"explain",seed:2026,recent:[]}).id,
  chooseChallenge({category:"mixed",activity:"explain",seed:2026,recent:[]}).id,
  "seeded generator determinism",
);
const one=chooseChallenge({category:"mixed",activity:"all",seed:2026,recent:[]});
const two=chooseChallenge({category:"mixed",activity:"all",seed:2026,recent:[]});
assert.equal(one.id,two.id);
assert.equal(one.activity,two.activity);

const codeSamples=bank.flatMap(c=>[c.codeA,c.comparison.codeA,c.comparison.codeB]);
for(const code of codeSamples){
  assert.ok(code.includes("←"),"AP assignment arrow");
  for(const forbidden of ["System.out","int ","String ","==","!=",".length","++","while(","for(","function ","var ","let ","const "]){
    assert.ok(!code.includes(forbidden),"unsupported or Java-specific syntax: "+forbidden);
  }
  assert.ok(!code.includes(";"),"Java-style semicolon statements are excluded");
  const opens=(code.match(/{/g)||[]).length, closes=(code.match(/}/g)||[]).length;
  assert.equal(opens,closes,"balanced AP pseudocode blocks");
}
assert.match(buildChallenge("sel-list-empty",0).codeA,/LENGTH\(items\)/);
assert.match(buildChallenge("iter-sum",2).codeA,/FOR EACH item IN items/);
assert.match(buildChallenge("iter-until",1).codeA,/REPEAT UNTIL/);
assert.match(buildChallenge("proc-parameter",0).codeA,/PROCEDURE double\(n\)/);
assert.match(buildChallenge("proc-parameter",0).codeA,/RETURN\(n \* 2\)/,"displayed procedure includes its AP CSP return");
assert.match(buildChallenge("proc-constant-good",0).codeA,/PROCEDURE fixedFactor\(\)[\s\S]*RETURN\(4\)/);
assert.match(buildChallenge("proc-context",0).codeA,/PROCEDURE defaultLevel\(\)[\s\S]*RETURN\(3\)/);
assert.match(buildChallenge("alg-all-three",2).codeA,/MOD/);

const boundary=buildChallenge("sel-boundary",1);
assert.deepEqual(boundary.runA.outputs,["Below target"],"strict > excludes the inclusive boundary");
assert.deepEqual(buildChallenge("iter-once",1).runA.outputs,[6],"one iteration can be meaningful");
assert.deepEqual(buildChallenge("alg-empty",0).runA.outputs,[],"empty-list indexing terminates");
assert.match(buildChallenge("alg-empty",0).runA.error,/out of range/);
for(let variant=0;variant<3;variant++){
  const challenge=buildChallenge("alg-empty",variant);
  assert.match(challenge.assumptions,/list may be empty/);
  if(variant>0)assert.deepEqual(challenge.runA.outputs,[challenge.inputs.items.reduce((total,item)=>total+item,0)],"first item is not double-counted");
  assert.ok(challenge.codeA.includes("REPEAT LENGTH(items) - 1 TIMES"));
  const boundary=buildChallenge("alg-boundary",variant);
  assert.ok(boundary.inputs.items.includes(5),"each displayed boundary input contains 5");
}
for(const [variant,count] of [0,1,3].entries()){
  const challenge=buildChallenge("alg-zero-loop",variant);
  assert.equal(challenge.runA.environment.counter,count,"loop variant updates only the unused counter");
  assert.equal(challenge.runA.outputs[0],"Ready");
}
assert.match(buildChallenge("alg-nested",0).assumptions,/all values .* distinct/);
assert.match(buildChallenge("iter-limit",0).assumptions,/0 through 4/);
assert.deepEqual(buildChallenge("alg-zero-loop",0).runA.trace,["REPEAT 0 TIMES"]);

function pairExample(category,pairType,variant=1,modelId=""){
  const model=modelId?MODELS.find(m=>m.id===modelId):MODELS.find(m=>m.category===category&&m.ordinal%3===pairType);
  return buildChallenge(model.id,variant).comparison;
}
for(const category of Object.keys(CATEGORIES)){
  for(const pairType of [0,1,2]) for(let variant=0;variant<3;variant++) {
    const model=MODELS.find(m=>m.category===category&&m.ordinal%3===pairType);
    const pair=pairExample(category,pairType,variant,model.id);
    const [expectedA,expectedB]=independentComparisonOutputs(category,pairType,variant,model.id);
    assert.deepEqual(pair.runA.outputs,expectedA,category+" comparison A independent output oracle");
    assert.deepEqual(pair.runB.outputs,expectedB,category+" comparison B independent output oracle");
    assert.equal(pair.meaningfulA,pairType!==2,category+" comparison A classification");
    assert.equal(pair.meaningfulB,pairType===1,category+" comparison B classification");
    assert.equal(pair.equivalentShown,JSON.stringify(expectedA)===JSON.stringify(expectedB),category+" shown-result equivalence");
  }
}
const integerPair=pairExample("selection",1,1);
for(let value=-20;value<=20;value++){
  const a=evaluate({...integerPair.programA,initial:{...integerPair.programA.initial,score:value}});
  const b=evaluate({...integerPair.programB,initial:{...integerPair.programB.initial,score:value}});
  assert.equal(a.signature,b.signature,"integer threshold transformations are equivalent");
}
const parameterPair=pairExample("procedures",1,1);
for(let value=-20;value<=20;value++){
  const a=evaluate({...parameterPair.programA,initial:{...parameterPair.programA.initial,argument:value}});
  const b=evaluate({...parameterPair.programB,initial:{...parameterPair.programB.initial,argument:value}});
  assert.equal(a.signature,b.signature,"n*2 and n+n are equivalent");
}
const iterationPair=pairExample("iteration",1,1);
const algorithmPair=pairExample("algorithms",1,1);
const boundaryComparison=pairExample("algorithms",1,1,"alg-equivalent-one");
const lists=[[],[-1],[0],[2],[1,-2,3],[4,0,-1],[1,2,3,4]];
for(const items of lists){
  for(const pair of [iterationPair,algorithmPair]){
    const a=evaluate({...pair.programA,initial:{...pair.programA.initial,items}});
    const b=evaluate({...pair.programB,initial:{...pair.programB.initial,items}});
    assert.equal(a.signature,b.signature,"equivalent list traversals");
  }
}

for(const items of [[],[5],[4,6],[5,8],[4,6,9]]){
  const a=evaluate({...boundaryComparison.programA,initial:{...boundaryComparison.programA.initial,items}});
  const b=evaluate({...boundaryComparison.programB,initial:{...boundaryComparison.programB.initial,items}});
  assert.equal(a.signature===b.signature,items.every(item=>item!==5),"strict/inclusive algorithm boundary across representative lists");
}
const sideEffect=buildChallenge("proc-side-effect",2);
assert.deepEqual(sideEffect.runA.outputs,[[1,4,7,8]]);
assert.deepEqual(sideEffect.inputs.items,[1,4,7],"reference evaluator does not mutate authored input data");
const untilZero=buildChallenge("iter-until",0);
assert.match(untilZero.runA.trace.at(-1),/1 pass/,"REPEAT UNTIL executes at least once");
const callReset=buildChallenge("proc-overwrite",2);
assert.deepEqual(callReset.runA.outputs,[0],"caller overwrites returned value");

console.log("PASS: "+audit.models+" models; "+audit.configurations+" behavior-distinct validated configurations from "+audit.candidateVariants+" bounded candidates; 80 independent output oracles; AP pseudocode subset, comparison, determinism, and repeat-avoidance checks.");
