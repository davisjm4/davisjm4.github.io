import assert from 'node:assert/strict';
import {lit,array as A,allocate,read as R,variable as V,binary as B,length as L,declare as D,assign as S,branch as If,loop as For,alias,rowReference,referenceEqual,execute,canonical} from './ir.js';
import {analyzeDifficulty,validateCandidate} from './quality.js';
import {redundantArithmetic} from './minimum-path.js';
import {MODEL_NAMES,LEVELS,buildModel} from './models.js';
import {generateCompositionalArray,createArrayHistory} from './engine.js';

const program=(statements,output)=>({statements,output,objective:'value'});
const direct=program([A('a',[4,7,2])],R('a',1));
const irrelevant=program([A('a',[4,7,2]),A('b',[4,7,2]),S('b',36,1),D('padding',900)],R('a',1));
assert.equal(canonical(direct),canonical(irrelevant));
assert.equal(analyzeDifficulty(irrelevant).minimumBand,'Beginner');
const aliasUpdate=program([A('a',[4,7,2]),alias('b','a'),S('b',B('+',R('a',1),R('a',2)),1)],R('a',1));
assert.equal(execute(aliasUpdate).answer,9);assert.equal(analyzeDifficulty(aliasUpdate).minimumBand,'Intermediate');
const mislabeledAlias={...buildModel('create-references',3,0,'Beginner',123),semanticProgram:aliasUpdate,semanticFingerprint:canonical(aliasUpdate),expectedOutput:'9',answer:'9',choices:['9','8','7','6']};assert.ok(validateCandidate(mislabeledAlias).problems.some(p=>p.includes('reference relationships combined with mutation')),'the mandatory alias + arithmetic example cannot enter Beginner');
const reassigned=program([...aliasUpdate.statements,A('a',[6,3,8],false),S('b',B('+',R('b',0),R('a',1)),0)],B('+',R('b',0),R('a',1)));
assert.equal(execute(reassigned).answer,10);assert.equal(analyzeDifficulty(reassigned).minimumBand,'Advanced');
const rowAliases=[A('grid',[[1,2],[3,4]]),rowReference('left','grid',0),rowReference('right','grid',0)];assert.equal(execute(program(rowAliases,referenceEqual('left','right'))).answer,true,'two bindings of the same row share Java object identity');assert.equal(execute(program([...rowAliases,rowReference('other','grid',1)],referenceEqual('left','other'))).answer,false);assert.equal(execute(program([...rowAliases,S('left',9,1)],R('right',1))).answer,9);
const fake=buildModel('element',0,0,'Beginner',123);
assert.match(buildModel('create-references',6,1,'Beginner',123).explanation,/independent copy/,'a clone must never be described as the shared array');
assert.equal(validateCandidate({...fake,semanticFingerprint:fake.semanticFingerprint+'|difficulty:Advanced'}).valid,false,'appending a label must not bypass semantic history');
for(const difficulty of ['Intermediate','Advanced'])assert.equal(validateCandidate({...fake,difficulty}).valid,false,'a new label cannot promote direct indexing');
const hidden=buildModel('element',0,0,'Advanced',123);assert.equal(validateCandidate({...hidden,difficulty:'Beginner'}).valid,false);
const sum=values=>program([A('a',values),D('total',0),For('i',0,B('<',V('i'),L('a')),1,[S('total',B('+',V('total'),R('a',V('i'))))])],V('total'));
const small=sum([1,2,3]),large=sum(Array(12).fill(3));
assert.equal(canonical(small),canonical(large));assert.equal(analyzeDifficulty(small).minimumBand,analyzeDifficulty(large).minimumBand);
assert.equal(execute(small).structuralDepth,execute(large).structuralDepth,'repeated iterations are not extra dependent stages');
const conditional=values=>program([A('a',values),D('total',0),If(B('>',R('a',0),R('a',1)),[S('total',B('+',R('a',0),2))],[S('total',B('-',R('a',1),2))])],V('total'));
const triangular=program([A('grid',[[1,2,3],[4,5,6],[7,8,9]]),D('total',0),For('r',0,B('<',V('r'),L('grid')),1,[For('c',0,B('<=',V('c'),V('r')),1,[S('total',B('+',V('total'),R('grid',V('r'),V('c'))))])])],V('total'));assert.equal(analyzeDifficulty(triangular).features.dependentLoopLimits,true);assert.equal(analyzeDifficulty(triangular).minimumBand,'Intermediate');
for(let v=0;v<6;v++){assert.equal(analyzeDifficulty(buildModel('predict-update',5,v,'Beginner',123).semanticProgram).features.mutationsInteract,false,'foundational sequential updates remain independent');assert.equal(analyzeDifficulty(buildModel('in-place',8,v,'Beginner',123).semanticProgram).features.mutations,0,'foundational compaction asks about qualification without overwriting future inputs');}
assert.equal(canonical(conditional([8,2])),canonical(conditional([2,8])),'a different branch outcome from new numbers is not a new structure');
assert.notEqual(canonical(small),canonical({...small,statements:small.statements.map(s=>s.op==='loop'?{...s,step:2}:s)}),'stride changes the necessary traversal');
for(const expression of [B('%',B('%',V('x'),5),5),B('-',V('x'),B('-',V('x'),V('y'))),B('-',B('+',V('x'),V('y')),V('y')),B('+',B('-',V('x'),V('y')),V('y')),B('-',V('x'),V('x'))])assert.ok(redundantArithmetic(program([D('x',8),D('y',3)],expression)).length);
for(const expression of [B('+',V('x'),0),B('-',V('x'),0),B('*',V('x'),1),B('/',V('x'),1),B('-',B('+',V('x'),V('y')),V('x'))])assert.ok(redundantArithmetic(program([D('x',8),D('y',3)],expression)).length);
assert.equal(redundantArithmetic(program([D('text', {op:'literal',value:'A'},'String')],B('+',V('text'),0))).length,0,'String concatenation is not a numeric identity');
assert.ok(redundantArithmetic(program([D('x',8),D('y',B('%',V('x'),5))],B('%',V('y'),5))).length,'copying to a variable cannot conceal repeated arithmetic');
assert.equal(redundantArithmetic(program([D('x',3),D('y',3)],B('-',V('x'),V('y')))).length,0,'distinct input bindings are not algebraically identical');
assert.equal(redundantArithmetic(program([A('a',[4,7]),D('old',R('a',0)),S('a',9,0)],B('-',V('old'),R('a',0)))).length,0,'a mutation invalidates read equivalence');
assert.equal(execute(program([A('a',[1])],B('&&',false,B('>',R('a',9),0)))).answer,false,'Java && skips its right side when false');
assert.equal(execute(program([A('a',[1])],B('||',true,B('>',R('a',9),0)))).answer,true,'Java || skips its right side when true');
assert.equal(execute(program([A('a',[1])],B('*',0,R('a',9)))).answer,'ArrayIndexOutOfBoundsException','multiplication still evaluates the other operand');
assert.equal(execute(program([],B('/',3,0))).answer,'ArithmeticException');
const zeroShortcut=program([A('a',[1,2]),S('a',B('+',R('a',0),R('a',1)),0)],B('*',0,R('a',0)));assert.equal(analyzeDifficulty(zeroShortcut).features.mutations,0,'a zero product cannot inflate the minimum solution with an irrelevant mutation');
const certainBoundsError=program([...reassigned.statements],R('a',L('a')));assert.equal(execute(certainBoundsError).answer,'ArrayIndexOutOfBoundsException');assert.equal(analyzeDifficulty(certainBoundsError).features.mutations,0,'a literal invalid index cannot inherit irrelevant preceding mutations');assert.equal(analyzeDifficulty(certainBoundsError).minimumBand,'Beginner');
assert.equal(execute(program([allocate('a',-1)],L('a'))).answer,'NegativeArraySizeException');
assert.equal(execute(program([allocate('a',0,'int','uninitialized')],L('a'))).answer,'Compile-time error');
assert.equal(execute(program([allocate('a',0,'int','null')],L('a'))).answer,'NullPointerException');
for(const [type,answer]of [['int',0],['boolean',false],['String',null],['double','0.0']])assert.equal(execute(program([allocate('a',3,type)],R('a',1))).answer,answer);

// Removing the numeric mutation must change each certified advanced identity
// result. Otherwise reference bookkeeping could be ignored by the learner.
const identityAnswers=new Set();
for(let v=0;v<12;v++){
  const q=buildModel('create-references',10,v,'Advanced',123);
  assert.equal(validateCandidate(q).valid,true);
  identityAnswers.add(q.expectedOutput);
  const changed=structuredClone(q.semanticProgram);changed.statements.find(s=>s.op==='call').body=[];
  assert.notEqual(execute(changed).answer,execute(q.semanticProgram).answer);
}
assert.deepEqual(identityAnswers,new Set(['true','false']));
const constantIdentity=program([A('a',[4,7,2]),alias('old','a'),S('old',B('+',R('old',0),R('old',1)),0),A('a',[6,3,8],false)],referenceEqual('a','old'));
const misleading={...buildModel('create-references',10,0,'Advanced',123),semanticProgram:constantIdentity,semanticFingerprint:canonical(constantIdentity),expectedOutput:'false',answer:'false',choices:['true','false','Compile-time error','NullPointerException']};
assert.equal(validateCandidate(misleading).valid,false,'new/old identity alone cannot be inflated by unrelated numeric mutations');

let trivialBooleanRejected=false,dependentBooleanAccepted=false;
for(let seed=0;seed<80;seed++){
 const q=buildModel('search',2,0,'Advanced',seed),check=validateCandidate(q);
 trivialBooleanRejected ||= check.problems.some(p=>p.includes('first decisive Boolean'));
 if(check.valid){dependentBooleanAccepted=true;assert.equal(validateCandidate({...q,coreObservation:lit(false)}).valid,false,'output arithmetic cannot certify an irrelevant algorithm');}
}
assert.ok(trivialBooleanRejected&&dependentBooleanAccepted,'Advanced existence searches must require loop-carried state, not a decisive first comparison');

let pairs=0;
for(const mode of Object.keys(MODEL_NAMES))for(const difficulty of LEVELS)for(let m=0;m<MODEL_NAMES[mode].length;m++)for(let v=0;v<12;v++){
  let a,b;try{a=buildModel(mode,m,v,difficulty,1);b=buildModel(mode,m,v,difficulty,44);}catch{continue;}
  assert.equal(a.semanticFingerprint,b.semanticFingerprint,`${mode}/${difficulty}/${m}/${v}: numerical data must not create another structure`);pairs++;
}
const h1=createArrayHistory(null),h2=createArrayHistory(null);for(let i=0;i<80;i++)assert.deepEqual(generateCompositionalArray('mixed',{difficulty:LEVELS[i%3],seed:i,history:h1}),generateCompositionalArray('mixed',{difficulty:LEVELS[i%3],seed:i,history:h2}));
console.log(`Array difficulty and minimum-path checks passed: ${pairs} cross-seed structural pairs, reference semantics, irrelevant code, iteration invariance, cancellation, allocation states and reproducibility.`);
