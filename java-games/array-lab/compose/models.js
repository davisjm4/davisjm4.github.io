import {lit,variable as V,binary as B,read as R,length as L,declare as D,array as A,allocate,alias as F,assign as S,branch as If,loop as For,call as Call,rowReference,returnedReference,referenceEqual,arrayResult,gridResult,cellIndex,cellPair,stop,execute,canonical,javaStatements,javaExpression,javaMethods} from './ir.js';
import {foundationQuestion} from './foundations.js';
import {foundationalPrediction} from './foundation-predict.js';
import {foundationalTraversal} from './foundation-traversal.js';
import {foundational2D} from './foundation-2d.js';
import {foundationalNested} from './foundation-nested.js';
import {foundationalReverse} from './foundation-reverse.js';
import {foundationalReferences} from './foundation-references.js';

export const MODEL_NAMES={
 element:['literal-index','arithmetic-index','last-index','end-relative','stored-index','changed-index','conditional-index','chained-index','value-index','bounds-check'],
 'predict-update':['dependent-value','compound-update','increment-decrement','target-index','source-index','sequential-update','temporary-swap','conditional-update','loop-update','alias-update'],
 'perform-update':['computed-target','last-target','middle-target','copy-target','compound-target','increment-target','swap-targets','conditional-target','loop-target','dependent-target'],
 search:['first-match','last-match','existence','match-count','missing-target','early-stop','reverse-search','conditional-search','minimum-search','changing-search','maximum-search','all-match'],
 traversal:['full-sum','selected-sum','qualifying-count','extreme-value','forward-fold','reverse-fold','boundary-traversal','alternating-traversal','mutating-traversal','dependent-fold','weighted-sum'],
 'access-2d':['direct-cell','computed-row','computed-column','last-row','row-last-element','ragged-cell','row-selection','conditional-cell','value-selected-cell','invalid-cell'],
 'update-2d':['direct-update','computed-update','copy-cell','compound-cell','row-condition','column-condition','swap-cells','row-update','nested-update','ragged-update','row-alias-target'],
 nested:['full-grid','traversal-order','visited-count','conditional-count','grid-sum','skip-boundary','early-inner-stop','ragged-traversal','cell-mutation','loop-dependency'],
 reverse:['indexed-assignment','off-by-one','last-update','copy-element','swap-save','compound-statement','grid-statement','allocate-array','assignment-statement','conditional-statement'],
 'create-references':['independent-allocations','shared-reference','reference-reassignment','alias-mutation','method-mutation','parameter-reassignment','returned-reference','chained-references','default-state','reference-boundary','reference-equality'],
 'in-place':['shift-left','shift-right','rotate-left','rotate-right','reverse-all','reverse-section','swap-transform','conditional-transform','compact-values','staged-transform','adjacent-differences'],
 'trace-2d':['row-sum','column-sum','maximum-row','minimum-column','grid-search','conditional-total','diagonal-total','neighbor-total','row-transform','conditional-transform']
};
export const LEVELS=['Beginner','Intermediate','Advanced'];
export const rng=seed=>{let n=Number(seed)>>>0;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);};
const term=value=>typeof value==='object'?value:typeof value==='string'?V(value):lit(value),is=(value,n)=>term(value).op==='literal'&&term(value).value===n;
const plus=(a,b)=>is(a,0)?term(b):is(b,0)?term(a):B('+',a,b),minus=(a,b)=>is(b,0)?term(a):B('-',a,b),times=(a,b)=>is(a,1)?term(b):is(b,1)?term(a):B('*',a,b);
// Bound an index once. Reapplying the identical modulus adds no reasoning.
const mod=(a,b)=>{const left=term(a),right=term(b);if(left.op==='binary'&&left.operator==='%'&&JSON.stringify(left.right)===JSON.stringify(right))return left;if(right.op==='length'&&(is(left,0)||left.op==='binary'&&left.operator==='-'&&JSON.stringify(left.left)===JSON.stringify(right)&&is(left.right,1)))return left;return B('%',left,right);};
const add=(name,value,index,column)=>S(name,plus(index===undefined?V(name):R(name,index,column),value),index,column);
const idx=n=>lit(n);
const swap=(a,i,j)=>[D('temp',R(a,i)),S(a,R(a,j),i),S(a,V('temp'),j)];
const fold=(name,start,limit,body,step=1)=>For(name,start,B(step>0?'<':'>=',V(name),limit),step,body);

function selectedIndex(m,v,statements){
  const end=minus(L('values'),1), base=v%3;
  const options=[lit(base),plus(base,1),end,minus(L('values'),V('distance')),V('index'),V('index'),V('index'),R('lookup',R('lookup',0)),R('lookup',1),L('values')];
  if(m===3)statements.push(D('distance',plus(mod(R('values',0),2),1)));
  if(m===4)statements.push(D('index',plus(base,1)));
  if(m===5)statements.push(D('index',base),add('index',1));
  if(m===6)statements.push(D('index',base),If(B('>',R('values',0),R('values',1)),[S('index',2)],[S('index',3)]));
  if(m===7||m===8)statements.push(A('lookup',[1,2,3,0]));
  let e=options[m];
  // Each route changes a necessary index computation, not the displayed data.
  const route=Math.floor(v/3);
  if(route===1)e=mod(plus(e,R('values',0)),L('values'));
  if(route===2)e=minus(minus(L('values'),1),mod(e,L('values')));
  if(route===3){statements.push(D('offset',mod(R('values',1),2)));e=mod(plus(e,V('offset')),L('values'));}
  return e;
}
function indexStages(statements,e,level){
  if(!level)return e;
  statements.push(D('index',mod(e,L('values'))),D('source',mod(plus(V('index'),1),L('values'))),S('values',plus(R('values',V('index')),R('values',V('source'))),V('index')));
  if(level===1)return mod(R('values',V('index')),L('values'));
  statements.push(F('other','values'),A('replacement',[2,3,1,4,0,5]),F('values','replacement',false),add('other',R('values',V('source')),V('index')),D('next',mod(R('other',V('index')),L('values'))),If(B('>',R('other',V('source')),R('values',V('next'))),[add('next',1)]));
  return mod(V('next'),L('values'));
}
function traversalLoop(v,body,extra={}){
 const form=v%6,rev=form===1||form===3,step=form===2||form===3?2:1;
 const start=rev?minus(L('values'),1):form===4?lit(1,'after-first'):lit(0,'first'),limit=rev?lit(0,'first'):form===5?minus(L('values'),1):L('values');
 let content=body;if(v>=6)content=[If(B('!=',mod(R('values',V('i')),2),0),body)];
 return For('i',start,B(rev?'>=':'<',V('i'),limit),rev?-step:step,content);
}
function gridLoop(v,body,ragged=false){
 const rev=v%2===1,skip=v%3===2;
 const inner=For('c',rev?minus(L('grid',V('r')),1):skip?lit(1,'after-first'):lit(0,'first'),B(rev?'>=':'<',V('c'),rev?lit(0,'first'):L('grid',V('r'))),rev?-1:1,body);
 return For('r',0,B('<',V('r'),L('grid')),1,[inner]);
}
function arrayQuestion(mode,m,v,level,values,grid){
 const statements=[A('values',values)],n=values.length;let output=lit(0),prompt='What value does this code print?',kind='choice',details={};
 if(mode==='element'||mode==='perform-update'){
   const initial=[];let e=selectedIndex(m,v,initial);statements.push(...initial);
   // Avoid duplicate declarations when the model already introduced index.
   if(initial.some(s=>s.name==='index')){statements.push(D('selected',e));e=V('selected');}
   if(level){const stage=[];e=indexStages(stage,e,level);if(initial.some(s=>s.name==='index'))stage.forEach(s=>{if(s.name==='index'&&s.op==='declare'){s.name='stageIndex';} });
     // Rename consistently by using a separate stage scope only in the source model.
     if(initial.some(s=>s.name==='index')){const rename=x=>{if(x&&typeof x==='object'){if(x.name==='index')x.name='stageIndex';Object.values(x).forEach(rename);}};stage.forEach(rename);rename(e);}statements.push(...stage);}
   if(mode==='element'&&m===9&&!level&&v<3){output=R('values',e);kind='choice';}
   else{e=mod(e,L('values'));statements.push(D('target',e));output=V('target');kind=mode==='element'?'cell':'apply';prompt=mode==='element'?'Select the cell accessed by the final expression.':'Select the cell changed by the final assignment. The array stays unchanged until submission.';
     if(mode==='element')details.access=R('values',V('target'));
     else{
       if(m===7)statements.push(If(B('>',R('values',0),R('values',1)),[S('target',mod(plus(V('target'),1),L('values')))],[S('target',minus(minus(L('values'),1),V('target')))]));
       if(m===8)statements.push(D('probe',0),For('i',1,B('<',V('i'),L('values')),1,[If(B('>',R('values',V('i')),R('values',V('probe'))),[S('probe',V('i'))])]),S('target',mod(plus(V('target'),V('probe')),L('values'))));
       if(m===6){details.insertTargetAt=statements.length;statements.push(D('swapWith',mod(plus(V('target'),1),L('values'))),...swap('values',V('target'),V('swapWith')));kind='swap';output=plus(times(V('target'),100),V('swapWith'));prompt='Select the two cells exchanged by the final three assignments. Values are revealed after submission.';}
       else statements.push(S('values',m===3?R('values',mod(plus(V('target'),1),L('values'))):m===5?plus(R('values',V('target')),1):plus(R('values',V('target')),R('values',mod(plus(V('target'),1),L('values')))),V('target')));
     }
   }
 }else if(mode==='predict-update'){
   const i=v%3,j=(i+1)%n;statements.push(D('target',i),D('source',j));
   const operations=[()=>[add('values',R('values',j),i)],()=>[S('values',times(R('values',i),R('values',j)),i)],()=>[add('values',v%2?minus(0,R('values',j)):R('values',j),i)],()=>[S('values',plus(R('values',i),2),mod(R('values',j),L('values')))],()=>[add('values',R('values',mod(R('values',j),L('values'))),i)],()=>[add('values',R('values',j),i),add('values',R('values',i),j)],()=>swap('values',i,j),()=>[If(B('>',R('values',i),R('values',j)),[add('values',R('values',j),i)],[S('values',minus(R('values',j),R('values',i)),i)])],()=>[traversalLoop(v,[add('values',R('values',V('i')),i)])],()=>[F('other','values'),add('other',R('values',j),i)]];
   if(v>=6)statements.push(S('source',mod(plus(R('values',i),1),L('values'))),add('values',R('values',V('source')),j));
   statements.push(...operations[m]());if(level)statements.push(add('values',R('values',i),j),S('values',plus(R('values',j),R('values',i)),i));
   if(level===2)statements.push(F('saved','values'),A('replacement',[3,1,4,2,5,0]),F('values','replacement',false),add('saved',R('values',j),i),If(B('>',R('saved',i),R('saved',j)),[add('saved',R('values',i),j)],[add('saved',R('values',j),i)]));
   output=level===2?plus(R('saved',i),R('saved',j)):m===3?R('values',mod(R('values',j),L('values'))):m===5?R('values',j):R('values',i);
 }else if(mode==='search'||mode==='traversal'){
   const isSearch=mode==='search';let target=isSearch&&m===4&&!level?-99:values[2];if(isSearch&&m===4&&level===1){target=Math.min(...values);while(values.includes(target))target++;}if(isSearch&&[0,1,2,3,5,6,7].includes(m))values[4]=target;statements[0]=A('values',values);
   const extreme=(isSearch?[8,10].includes(m):m===3),count=isSearch?[3].includes(m):[2].includes(m),first=isSearch&&[0,4,6,7,9].includes(m),last=isSearch&&m===1,exists=isSearch&&m===2,all=isSearch&&m===11;
   statements.push(D('result',all?true:first||last?-1:exists?false:extreme?R('values',0):0,exists||all?'boolean':'int'));
   let condition=B('==',R('values',V('i')),target);
   if(!isSearch||[7,8].includes(m))condition=B(m%2?'>':'<',R('values',V('i')),R('values',0));
   if(extreme)condition=B(isSearch?(m===10?'>':'<'):v%2?'>':'<',R('values',V('i')),V('result'));
   if(all)condition=B('!=',R('values',V('i')),target);
   if(level)condition=B('&&',condition,B('!=',mod(V('i'),2),1));
   if(level===2){statements.push(D('previous',R('values',0)));condition=B('&&',condition,B('>=',R('values',V('i')),times(V('previous'),2)));}
   if(level===2&&all)condition=B('&&',B('<',R('values',V('i')),times(V('previous'),2)),B('!=',mod(V('i'),2),1));
   let action=all?S('result',false):exists?S('result',true):first||last?S('result',V('i')):extreme?S('result',R('values',V('i'))):add('result',count?1:R('values',V('i')));
   if(!isSearch&&m===10)action=add('result',times(V('i'),R('values',V('i'))));
   if(!isSearch&&[4,5].includes(m))action=S('result',minus(R('values',V('i')),V('result')));
   let body=(isSearch||[1,2,3,8,9].includes(m))?[If(condition,[action,...(first?[stop]:[])])]:[action];
   if(isSearch&&m===5)body=[If(B('>',R('values',V('i')),R('values',0)),[stop]),add('result',R('values',V('i')))];
   if(isSearch&&m===9){statements.push(D('movingTarget',level?target:R('values',0)));if(!level)statements.push(add('movingTarget',1));body=[If(B('==',R('values',V('i')),V('movingTarget')),[S('result',V('i'))]),...(level?[S('movingTarget',plus(V('movingTarget'),mod(R('values',V('i')),2)))]:[])];}
   if(level===1)body.unshift(add('values',R('values',0),V('i')));
   if(level===2){body.unshift(S('values',plus(R('values',V('i')),V('previous')),V('i')));body.push(S('previous',R('values',V('i'))));}
   if(!isSearch&&m===8)body.unshift(S('values',plus(R('values',V('i')),R('values',0)),V('i')));
   if(!isSearch&&m===9){if(level===1){statements.push(D('previous',R('values',0)));body=[If(B('>',R('values',V('i')),V('previous')),[add('result',R('values',V('i')))]),S('previous',R('values',V('i')))];}else body.push(S('values',plus(R('values',V('i')),V('result')),V('i')));}
   const scan=isSearch?(!level?v:m===0?0:m===6?1:v):m===0||m===4?0:m===5?1:m===6?4+v%2:m===7?2+v%2:v;
   if(isSearch&&m===6&&!level){const form=v%6,skipEnd=form===2||form===4,skipStart=form===3||form===5;statements.push(For('i',minus(L('values'),lit(skipEnd?2:1,skipEnd?'before-last':'last-offset')),B('>=',V('i'),lit(skipStart?1:0,skipStart?'after-first':'first')),form===1||form===4||form===5?-2:-1,body));}
   else statements.push(traversalLoop(scan,body));output=V('result');
   if(isSearch&&m===4&&level===2&&execute({statements,output}).answer!==-1)throw Error('Missing-target scenario must require proving no transformed match');
 }else if(mode==='create-references'){
   const i=v%3,j=(i+1)%n;let a='values';
   if(m===10&&level===2){
     // The mutation determines which object the branch selects. Both a new
     // alias and an independent copy are possible; identity alone is insufficient.
     values[j]=2+Math.abs(values[j])%5;
     const op=['>','<','>=','<=','==','!='][v%6],replacement=values.map(x=>x+2);
     replacement[i]=values[i]+(['==','!='].includes(op)?values[j]:Math.floor(values[j]/2));
     statements[0]=A('values',values);
     statements.push(F('saved','values'),Call('change','values',[add('p',R('p',j),i)]),A('values',replacement,false),returnedReference('current','values',false),returnedReference('copy','saved',true),allocate('other',0,'int','uninitialized'),If(B(op,R('saved',i),R('values',i)),[F('other','current',false)],[F('other','copy',false)]));
     return {program:{statements,output:referenceEqual('values','other',v>=6),objective:'value'},kind:'choice',prompt:'What does the final print statement display?',details:{}};
   }
   if(m===0){statements.push(A('other',values.map(x=>x+1)),add('values',R('other',j),i),add('other',R('values',i),j));output=plus(R('values',i),R('other',j));}
   if([3,7].includes(m)){statements.push(F('other','values'));if(m===7)statements.push(F('saved','other'));statements.push(add(m===7?'saved':'other',R('values',j),i));output=R('values',i);}
   if(m===1){statements.push(F('other','values'));if(level)statements.push(add('values',R('values',j),i),If(B('>',R('values',i),R('values',j)),[A('other',values.slice(),false)]));if(level===2)statements.push(F('saved','values'),A('values',values.map(x=>x+2),false),If(B('>',R('saved',i),R('values',i)),[F('other','values',false)],[F('other','saved',false)]));output=referenceEqual('values','other',v%2===1);}
   if(m===2){if(!level){statements.push(A('other',values.map(x=>x+2)),F('values','other',false));output=R('values',i);}else if(level===1){statements.push(A('other',values.map(x=>x+2)),F('values','other',false),D('selected',mod(R('values',0),L('values'))),add('values',R('values',1),V('selected')));output=R('values',V('selected'));}else{statements.push(F('saved','values'),A('other',values.map(x=>x+2)),F('values','other',false),add('saved',R('values',j),i));output=plus(R('saved',i),R('values',j));}}
   if(m===5&&!level){statements.push(F('other','values'),Call('change','values',[A('p',values.map(x=>x+2),false)]));output=referenceEqual('values','other',v%2===1);}
   else if([4,5].includes(m)){const body=m===5?(level===1?[add('p',R('p',j),i),A('p',values.map(x=>x+2),false)]:[F('saved','p'),A('p',values.map(x=>x+2),false),add('saved',R('p',j),i)]):[add('p',R('p',j),i)];statements.push(Call('change','values',body));output=R('values',i);}
   if(m===6){statements.push(returnedReference('other','values',v%2===1),add('other',R('values',j),i));output=plus(R('values',i),R('other',i));}
   if(m===8){statements[0]=A('values',Array(n).fill(0),true,true);statements.push(S('values',plus(L('values'),v%3),i));output=plus(R('values',i),R('values',j));}
   if(m===9){if(!level)statements.push(D('index',minus(L('values'),v%2?1:0)));output=R('values',V('index'));}
   if(m===10){statements.push(F('other','values'));if(v%2)statements.push(A('other',values.slice(),false));if(level)statements.push(add('values',R('values',j),i),If(B('>',R('values',i),R('values',j)),[F('other','values',false)],[A('other',values.map(x=>x+1),false)]));if(level===2)statements.push(F('saved','values'),returnedReference('returned','other',v%3===0),A('values',values.map(x=>x+2),false),If(B('>',R('saved',i),R('values',i)),[F('other','returned',false)],[F('other','saved',false)]));output=referenceEqual('values','other',v%3===1);}
   if(v>=6&&![1,10].includes(m)&&!(m===5&&!level)){statements.push(F('last','values'),add('last',R('values',j),i));output=plus(output,R('last',i));}
   if(level&&![1,10].includes(m)&&!(level===1&&[2,5].includes(m))){statements.push(F('probe','values'),add('probe',R('values',i),j));output=plus(output,R('probe',j));}
   if(level===2&&![1,10].includes(m)){statements.push(A('replacement',[1,3,2,4,5,6]),F('probe','replacement',false),Call('adjust','values',[add('p',R('p',j),i),If(B('>',R('p',i),R('p',j)),[add('p',R('p',i),j)])]));output=plus(output,plus(R('probe',i),R('values',j)));}
   if(m===9&&level)statements.push(D('index',mod(level===2?plus(R('values',i),R('probe',j)):R('values',i),plus(L('values'),1))));
 }else if(mode==='in-place'){
   let body=[],start=lit(0,'first'),end=L('values'),step=1;
   if(m===0||m===2){if(m===2)statements.push(D('saved',R('values',0)));body=[S('values',R('values',plus(V('i'),1)),V('i'))];end=minus(L('values'),1);}
   if(m===1||m===3){if(m===3)statements.push(D('saved',R('values',minus(L('values'),1))));start=minus(L('values'),1);end=lit(0);step=-1;body=[S('values',R('values',minus(V('i'),1)),V('i'))];}
   if(m===4||m===5){start=m===5?lit(1,'interior-start'):lit(0,'first');end=B('/',L('values'),2);body=swap('values',V('i'),minus(minus(L('values'),1),V('i')));}
   if(m===6){end=minus(L('values'),1);step=2;body=swap('values',V('i'),plus(V('i'),1));}
   if(m===7){body=[If(B('>',R('values',V('i')),R('values',0)),[S('values',minus(R('values',V('i')),R('values',0)),V('i'))])];}
   if(m===8){statements.push(D('write',0));body=[If(B('>',R('values',V('i')),0),[S('values',R('values',V('i')),V('write')),add('write',1)])];}
   if(m===8&&level===1){body=[If(B(['>','<','>=','<=','==','!='][v%6],R('values',V('i')),0),[S('values',R('values',V('i')),V('write')),add('write',1)])];statements.push(For('i',0,B('<',V('i'),L('values')),1,body));return {program:{statements,output:arrayResult('values'),objective:'array'},kind:'choice',prompt:'What are the complete contents of values after the code executes?',details:{}};}
   if(m===8&&!level){body=[If(B(['>','<','>=','<=','==','!='][v%6],R('values',V('i')),0),[add('write',1)])];statements.push(For('i',0,B('<',V('i'),L('values')),1,body));return {program:{statements,output:V('write'),objective:'value'},kind:'choice',prompt:'How many values meet the condition?',details:{},foundation:true};}
   if(m===9){body=[add('values',R('values',minus(V('i'),1)),V('i'))];start=1;}
   if(m===10){body=[S('values',minus(R('values',V('i')),R('values',minus(V('i'),1))),V('i'))];start=1;}
   if(m===6&&v===6)body=swap('values',V('i'),minus(minus(L('values'),1),V('i')));
   if(v%3===1&&m>=7)body=[If(B('!=',mod(V('i'),2),0),body)];
   if(v%3===2&&m>=7)body.push(If(B('>',R('values',V('i')),10),[stop]));
   const form=v%6;
   let test=B(step>0?'<':'>',V('i'),end);
   if(form===1){const oldStart=start;if(step>0){start=minus(end,1);test=B('>=',V('i'),oldStart);}else{start=plus(end,1);test=B('<=',V('i'),oldStart);}step=-step;}
   if(form===2)step*=2;
   if(form===3)start=step>0?plus(start,Math.abs(step)):minus(start,Math.abs(step));
   if(form===3&&m===7){start=lit(0,'first');const anchor=R('values',minus(L('values'),1));body=[If(B('>',R('values',V('i')),anchor),[S('values',minus(R('values',V('i')),anchor),V('i'))])];}
   if(form===4)body=[If(B('==',mod(R('values',V('i')),2),0),body)];
   if(form===5)body=[If(B('<',R('values',V('i')),level===2?R('values',0):lit(0)),[stop]),...body];
   const transform=For('i',start,test,step,body);if(level===1&&m>=4)statements.push(add('values',R('values',1),0));statements.push(transform);
   if(m===2)statements.push(S('values',V('saved'),minus(L('values'),1)));if(m===3)statements.push(S('values',V('saved'),0));
   if(level===1&&m===0)statements.push(add('values',R('values',0),minus(L('values'),1)));
   if(level===1&&m===1)statements.push(add('values',R('values',minus(L('values'),1)),0));
   if(v>=6&&!(m===6&&v===6))statements.push(For('i',1,B('<',V('i'),L('values')),2,[add('values',R('values',minus(V('i'),1)),V('i'))]));
   if(level===2)statements.push(For('i',1,B('<',V('i'),L('values')),1,[If(B('>',R('values',V('i')),R('values',minus(V('i'),1))),[S('values',minus(R('values',V('i')),R('values',minus(V('i'),1))),V('i'))])]));
   if(level===2)statements.push(For('i',minus(L('values'),2),B('>=',V('i'),0),-1,[S('values',plus(R('values',V('i')),R('values',plus(V('i'),1))),V('i'))]));
   output=arrayResult('values');prompt='What are the complete contents of values after the code executes?';
   // Foundation questions observe one transformation stage or the number of
   // retained values. Complete rotations, compaction states and dependent
   // transformations are assessed at the higher levels.
   if(!level&&[2,3,4,5,8,9,10].includes(m)){
     output=m===8?V('write'):R('values',m===3?minus(L('values'),1):[5,9,10].includes(m)?1:0);
     prompt='What value does the final print statement display?';
   }
 }else if(['access-2d','update-2d','nested','trace-2d'].includes(mode)){
   statements.splice(0,1,A('grid',grid));const r=mode==='trace-2d'&&m===0&&level===1?1+v%(grid.length-1):v%grid.length,c=v%2;
   if(mode==='nested'&&m===9&&level===1){
     const form=v%6,start=form===2?V('r'):form===3?plus(V('r'),1):form===5?minus(minus(L('grid'),1),V('r')):lit(0,'first');
     const condition=form===0?B('<=',V('c'),V('r')):form===1?B('<',V('c'),V('r')):form===4?B('<=',V('c'),minus(minus(L('grid'),1),V('r'))):B('<',V('c'),L('grid',V('r')));
     statements.push(D('result',0),For('r',0,B('<',V('r'),L('grid')),1,[For('c',start,condition,1,[add('result',R('grid',V('r'),V('c')))])]));
     return {program:{statements,output:V('result'),objective:'value'},kind:'choice',prompt:'What does the final print statement display?',details:{}};
   }
   if(mode==='access-2d'){
     let row=[lit(r),mod(plus(r,1),L('grid')),lit(r),minus(L('grid'),1),lit(r),lit(r),lit(r),V('row'),mod(R('grid',0,0),L('grid')),L('grid')][m];
     let col=m===4||m===5?minus(L('grid',row),1):lit(c);
     if(m===9&&!level){const accesses=[[L('grid'),lit(0)],[lit(0),L('grid',0)],[minus(0,1),lit(0)],[lit(0),minus(0,1)],[minus(L('grid'),1),L('grid',minus(L('grid'),1))],[plus(L('grid'),times(R('grid',0,0),R('grid',0,0))),lit(0)]];[row,col]=accesses[v%6];}
     if(m===7)statements.push(D('row',r),If(B('>',R('grid',0,0),R('grid',1,0)),[S('row',1)],[S('row',2)]));
     if(m===2)col=mod(plus(c,1),L('grid',row));
     if(m===5){row=mod(L('grid',0),L('grid'));col=minus(L('grid',row),1);}
     if(m===6){statements.push(rowReference('rowValues','grid',row));col=minus(L('rowValues'),1);}
     if(level){row=mod(row,L('grid'));statements.push(D('selectedRow',row),D('selectedCol',mod(plus(col,R('grid',V('selectedRow'),0)),L('grid',V('selectedRow')))));row=V('selectedRow');col=V('selectedCol');}
     if(level===2){statements.push(add('grid',R('grid',row,0),row,col),D('nextRow',mod(R('grid',row,col),L('grid'))),add('grid',R('grid',row,col),V('nextRow'),0),If(B('>',R('grid',V('nextRow'),0),R('grid',row,col)),[S('nextRow',mod(plus(V('nextRow'),1),L('grid')))]));row=V('nextRow');col=mod(col,L('grid',row));}
     if(m===9&&!level){output=R('grid',row,col);}
     else{if(!level){row=mod(row,L('grid'));col=mod(col,L('grid',row));}statements.push(D('r',row),D('c',col));output=plus(times(V('r'),100),V('c'));kind='cell-2d';prompt=mode==='access-2d'?'Select the cell accessed by the final expression.':'Select the cell changed by the final assignment.';details.access=R('grid',V('r'),V('c'));
       if(mode==='update-2d')statements.push(add('grid',R('grid',V('r'),mod(plus(V('c'),1),L('grid',V('r')))),V('r'),V('c')));
     }
   }else if(mode==='update-2d'){
     if(m===8&&level===1){
       const value=R('grid',V('r'),V('c')),form=v%6,last=minus(L('grid',V('r')),1),source=form<2?R('grid',V('r'),0):form<4?R('grid',V('r'),last):R('grid',V('r'),minus(V('c'),1));
       statements.push(add('grid',R('grid',0,0),0,minus(L('grid',0),1)),For('r',0,B('<',V('r'),L('grid')),1,[For('c',form>=4?lit(1,'after-first'):lit(0,'first'),B('<',V('c'),L('grid',V('r'))),1,[S('grid',B(form%2?'-':'+',value,source),V('r'),V('c'))])]));
       return {program:{statements,output:gridResult('grid'),objective:'grid'},kind:'choice',prompt:'What are the complete contents of grid after the code executes?',details:{}};
     }
     let row=lit(r),col=lit(c);
     if(m===2){row=mod(R('grid',0,1),L('grid'));col=mod(R('grid',1,0),L('grid',row));}
     if(m===3){statements.push(D('amount',plus(R('grid',r,c),R('grid',1,1))));row=mod(V('amount'),L('grid'));col=mod(B('/',V('amount'),L('grid')),L('grid',row));}
     if(m===1){row=mod(R('grid',0,0),L('grid'));col=mod(R('grid',row,0),L('grid',row));}
     if(m===4){statements.push(D('selectedRow',r),If(B('>',R('grid',0,0),R('grid',1,0)),[S('selectedRow',1)],[S('selectedRow',2)]));row=V('selectedRow');}
     if(m===5){statements.push(D('selectedCol',c),If(B('>',R('grid',r,0),R('grid',r,1)),[S('selectedCol',1)],[S('selectedCol',2)]));col=V('selectedCol');}
     if(m===9){row=minus(L('grid'),1);col=minus(L('grid',row),1);}
     if(m===10){statements.push(rowReference('selectedRowValues','grid',row));col=mod(R('selectedRowValues',0),L('selectedRowValues'));}
     statements.push(D('r',row),D('c',col));
     if(level)statements.push(S('c',mod(plus(V('c'),R('grid',V('r'),0)),L('grid',V('r')))),add('grid',R('grid',V('r'),0),V('r'),V('c')));
     if(level===2)statements.push(D('before',R('grid',V('r'),V('c'))),S('r',mod(R('grid',V('r'),V('c')),L('grid'))),S('c',mod(V('c'),L('grid',V('r')))),add('grid',V('before'),V('r'),V('c')),If(B('>',R('grid',V('r'),V('c')),V('before')),[S('c',mod(plus(V('c'),1),L('grid',V('r'))))]));
     let rhs=m===2?R('grid',1,1):m===3?times(R('grid',V('r'),V('c')),R('grid',1,1)):plus(R('grid',V('r'),V('c')),1);
     if(m===6){statements.push(D('temp',R('grid',V('r'),V('c'))),S('grid',R('grid',0,0),V('r'),V('c')),S('grid',V('temp'),0,0));output=plus(R('grid',V('r'),V('c')),R('grid',0,0));}
     else if(m===7){statements.push(For('col',0,B('<',V('col'),L('grid',V('r'))),1,[S('grid',plus(R('grid',V('r'),V('col')),R('grid',V('r'),V('c'))),V('r'),V('col'))]));output=R('grid',V('r'),minus(L('grid',V('r')),1));}
     else if(m===8){if(level===1){statements.push(gridLoop(v,[S('grid',plus(R('grid',V('r'),V('c')),R('grid',V('r'),0)),V('r'),V('c'))]));output=gridResult('grid');}else{const scan=gridLoop(v,[S('grid',plus(R('grid',V('r'),V('c')),V('carry')),V('r'),V('c')),S('carry',R('grid',V('r'),V('c')))]);const rename=x=>{if(x&&typeof x==='object'){if(x.name==='r')x.name='row';if(x.name==='c')x.name='col';Object.values(x).forEach(rename);}};rename(scan);statements.push(D('carry',R('grid',0,0)),scan);output=V('carry');}}
     else{statements.push(S('grid',rhs,V('r'),V('c')));output=plus(times(V('r'),100),V('c'));kind='cell-2d';prompt='Select the cell changed by the final assignment.';}
   }else{
     const printsTraversal=mode==='nested'&&m===0;
     statements.push(D('result',printsTraversal?lit(''):0,printsTraversal?'String':'int'));if(printsTraversal&&level===2)statements.push(D('carry',0));let value=R('grid',V('r'),V('c')),body=[add('result',value)];
     if(m===0)body=[If(B('==',V('r'),r),body)];
     if(m===1)body=[If(B('==',V('c'),c),body)];
     if(m===2||m===3){body=[add('rowTotal',value)];if(m===3)body=[If(B('==',V('c'),c),body)];}
     if(m===4)body=[If(B('==',value,grid[1][1]),[S('result',plus(times(V('r'),100),V('c')))])];
     if(m===5)body=[If(B('>',value,0),[add('result',1)])];
     if(m===6)body=[If(B('==',V('r'),V('c')),[add('result',value)])];
     if(m===7)body=[If(B('>',V('c'),0),[add('result',minus(value,R('grid',V('r'),minus(V('c'),1))))])];
     if(m===8)body=[S('grid',plus(value,R('grid',V('r'),0)),V('r'),V('c')),add('result',value)];
     if(m===9)body=[If(B('>',value,R('grid',V('r'),0)),[S('grid',minus(value,R('grid',V('r'),0)),V('r'),V('c'))],[S('grid',plus(value,R('grid',V('r'),0)),V('r'),V('c'))]),add('result',value)];
     if(mode==='trace-2d'&&m===9&&level===1)body=[If(B('>',value,0),[S('grid',plus(value,2),V('r'),V('c'))],[S('grid',minus(value,2),V('r'),V('c'))]),add('result',value)];
     if(mode==='nested'){
       const tasks=[
         [S('result',plus(plus(V('result'),value),lit(' ')))],
         [S('result',value)],
         [add('result',1)],
         [If(B('>',value,0),[add('result',1)])],
         [add('result',value)],
         [If(B('&&',B('!=',V('r'),1),B('!=',V('c'),1)),[add('result',value)])],
         [If(B('<',value,0),[stop]),add('result',value)],
         [add('result',1)],
         [S('grid',plus(value,R('grid',V('r'),0)),V('r'),V('c')),add('result',value)],
         [add('result',level===2?plus(value,plus(times(V('r'),L('grid',V('r'))),V('c'))):plus(times(V('r'),L('grid',V('r'))),V('c')))]
       ];body=tasks[m];
     }
     if(mode==='nested'&&m===2&&level===1)body=[If(B('==',mod(plus(V('r'),V('c')),2),0),[add('result',1)])];
     if(level===1&&!(mode==='trace-2d'&&m===9)&&!(mode==='nested'&&m===2))body.unshift(S('grid',plus(value,V('r')),V('r'),V('c')));
     if(level===2)body.unshift(S('grid',plus(value,V(printsTraversal?'carry':'result')),V('r'),V('c')),...(printsTraversal?[S('carry',value)]:[]));
     if(v>=6)body=[If(B('!=',mod(V('c'),2),0),body)];
     if(mode==='nested'&&m===7){let term=add('result',L('grid',V('r')));if(level)term=If(B('>',L('grid',V('r')),L('grid',0)),[term]);statements.push(For('r',0,B('<',V('r'),L('grid')),1,[term]));if(level===2)statements.push(gridLoop(v,[S('grid',plus(value,V('result')),V('r'),V('c')),If(B('>',value,times(V('result'),2)),[add('result',1)])]));}
     else if(mode==='nested'&&m===2&&level===2){statements.push(gridLoop(v,[S('grid',plus(value,V('result')),V('r'),V('c')),If(B('>',value,plus(times(V('result'),2),3)),[stop]),add('result',1)]));}
     else if(mode==='trace-2d'&&m===9&&!level){statements.push(D('r',r),D('c',c),...body);}
     else if(mode==='trace-2d'&&m===3){statements.push(D('best',100000));const cell=R('grid',V('r'),V('c')),terms=[add('total',cell)];if(level)terms.unshift(S('grid',plus(cell,V('c')),V('r'),V('c')));if(level===2)terms.push(If(B('<',plus(V('r'),1),L('grid')),[S('grid',plus(R('grid',plus(V('r'),1),V('c')),V('total')),plus(V('r'),1),V('c'))]));statements.push(For('c',0,B('<',V('c'),L('grid',0)),1,[D('total',0),For('r',0,B('<',V('r'),L('grid')),1,terms),If(B(v%2?'<=':'<',V('total'),V('best')),[S('best',V('total')),S('result',V('c'))])]));}
     else if(mode==='trace-2d'&&m===8){const last=minus(L('grid'),1);statements.push(For('c',0,B('<',V('c'),L('grid',0)),1,[D('temp',R('grid',0,V('c'))),S('grid',R('grid',last,V('c')),0,V('c')),S('grid',V('temp'),last,V('c')),add('result',R('grid',0,V('c')))]));if(level)statements.push(S('grid',plus(R('grid',0,0),V('result')),0,0));if(level===2)statements.push(For('c',0,B('<',V('c'),L('grid',0)),1,[add('grid',R('grid',last,V('c')),0,V('c')),If(B('>',R('grid',0,V('c')),R('grid',0,0)),[add('result',R('grid',0,V('c')))])]));output=level?plus(R('grid',0,0),V('result')):V('result');}
     else if(mode==='trace-2d'&&m===2){statements.push(D('best',-100000));const outer=gridLoop(v,body);outer.body.unshift(D('rowTotal',0));outer.body.push(If(B(v%2?'>=':'>',V('rowTotal'),V('best')),[S('best',V('rowTotal')),S('result',V('r'))]));statements.push(outer);}
     else statements.push(gridLoop(v,body));if(!(mode==='trace-2d'&&m===8))output=V('result');
   }
 }else if(mode==='reverse'){
   const i=v%3,j=(i+1)%n,indexSteps=[];let index=selectedIndex(m,v,indexSteps);statements.push(...indexSteps,D('target',mod(index,L('values'))),D('source',j));if(level){if(!(level===1&&m===6))statements.push(add('values',R('values',j),i));statements.push(S('target',mod(R('values',i),L('values'))));}if(level===2)statements.push(F('other','values'),add('other',R('values',V('target')),j),S('source',mod(R('other',j),L('values'))));
   if(level===2){statements.push(F('saved','values'),A('replacement',[4,2,6,1,3,5]),F('other','replacement',false),add('saved',plus(R('other',V('source')),R('saved',V('source'))),minus(L('values'),1)),S('source',mod(plus(V('source'),R('other',minus(L('other'),1))),L('values'))),S('target',mod(plus(V('target'),R('saved',minus(L('saved'),1))),L('values'))));}
   const shape=Math.floor(v/12)%6;
   if(shape===1)statements.push(S('target',minus(minus(L('values'),1),V('target'))));
   if(shape===2)statements.push(S('target',mod(R('values',V('target')),L('values'))));
   if(shape===3)statements.push(If(B('>',R('values',V('target')),R('values',V('source'))),[S('source',mod(plus(V('source'),1),L('values')))],[S('target',mod(plus(V('target'),1),L('values')))]));
   if(shape===4)statements.push(S('target',mod(plus(V('source'),L('values')),minus(L('values'),1))));
   if(shape===5)statements.push(D('pointer',mod(R('values',V('target')),L('values'))),S('target',mod(R('values',V('pointer')),L('values'))));
   let correct=S('values',plus(R('values',V('target')),R('values',V('source'))),V('target')),suffix=[],candidates=[];output=R('values',V('target'));
   if(m===1)correct=S('values',R('values',minus(L('values'),1)),V('target'));
   if(m===2){statements.push(S('target',minus(L('values'),1)));const value=R('values',V('target')),source=R('values',V('source'));correct=S('values',[plus(value,1),plus(value,source),minus(value,source),times(value,source),plus(source,R('values',0)),times(source,R('values',0))][shape],V('target'));}
   if(m===3)correct=S('values',R('values',V('source')),V('target'));
   if(m===4){correct=D('temp',R('values',V('target')));suffix=[S('values',R('values',V('source')),V('target')),S('values',V('temp'),V('source'))];output=R('values',V('source'));candidates=[D('temp',R('values',V('source'))),D('temp',0),D('temp',plus(R('values',V('target')),1)),D('temp',minus(R('values',V('target')),1))];}
   if(m===5)correct=S('values',times(R('values',V('target')),R('values',V('source'))),V('target'));
   if(m===6){statements.push(A('grid',grid),D('r',mod(V('target'),L('grid'))),D('c',mod(V('source'),L('grid',V('r')))));correct=add('grid',R('grid',1,1),V('r'),V('c'));output=R('grid',V('r'),V('c'));candidates=[S('grid',R('grid',1,1),V('r'),V('c')),add('grid',R('grid',V('r'),V('c')),1,1),add('grid',1,V('r'),V('c')),S('grid',minus(R('grid',V('r'),V('c')),R('grid',1,1)),V('r'),V('c')),S('grid',0,V('r'),V('c')),S('grid',minus(R('grid',V('r'),V('c')),1),V('r'),V('c'))];}
   if(m===7){correct=A('values',values.map(x=>x+1),false);output=plus(R('values',V('target')),L('values'));const replacement=values.map(x=>x+1);candidates=[...Array.from({length:replacement.length-1},(_,offset)=>{const k=offset+1;return A('values',replacement.slice(k).concat(replacement.slice(0,k)),false);}),A('values',replacement.slice().reverse(),false)];}
   if(m===8)correct=S('values',minus(R('values',V('source')),R('values',V('target'))),V('target'));
   if(m===9){const test=B('>',R('values',V('target')),R('values',V('source'))),a=add('values',R('values',V('source')),V('target')),b=S('values',minus(R('values',V('source')),R('values',V('target'))),V('target'));correct=If(test,[a],[b]);candidates=[If(test,[b],[a]),a,b,add('values',1,V('target')),add('values',-1,V('target')),S('values',R('values',V('source')),V('target')),S('values',0,V('target'))];}
   details.missing=correct;details.prefix=statements.slice();details.suffix=suffix;details.candidates=candidates;statements.push(correct,...suffix);prompt='Choose the statement that produces the requested final value.';
 }
 return {program:{statements,output,objective:kind==='choice'?'value':kind==='cell-2d'?'coordinate':'cell'},kind,prompt,details,foundation:mode==='search'&&!level};
}

export function buildModel(mode,model,variant,difficulty,seed){
 const random=rng(seed),level=LEVELS.indexOf(difficulty);if(level<0||!MODEL_NAMES[mode])throw Error('Invalid Array Lab mode/difficulty');
 const values=Array.from({length:mode==='in-place'&&model===5?8:6},()=>Math.floor(random()*14)-(['search','traversal','in-place'].includes(mode)?4:0));
 const grid=Array.from({length:3},(_,r)=>Array.from({length:model===5||model===7?3+r:4},()=>['access-2d','update-2d'].includes(mode)?1+Math.floor(random()*13):Math.floor(random()*15)-3));
 // Close totals and deliberate ties require actual summation and tie-breaking,
 // rather than identifying a row whose entries visibly dwarf all other rows.
 if(mode==='trace-2d'&&model===2)grid.forEach((row,r)=>{row[row.length-1]=8+(r%2)-row.slice(0,-1).reduce((a,b)=>a+b,0);});
 if(mode==='trace-2d'&&model===3)grid[2]=grid[2].map((_,c)=>4+c%2-grid[0][c]-grid[1][c]);
 if(mode==='trace-2d'&&model===9&&level===2){grid.splice(2);grid.forEach(row=>row.splice(3));}
 if(mode==='nested'&&level===2){grid.splice(2);grid.forEach((row,r)=>row.splice(model===7?2+r:3));}
 const built=mode==='create-references'&&level===0?foundationalReferences(model,variant,values,grid):mode==='reverse'&&level===0?foundationalReverse(model,variant,values,grid):mode==='nested'&&level===0?foundationalNested(model,variant,grid):mode==='trace-2d'&&level===0?foundational2D(model,variant,grid):mode==='traversal'&&level===0?foundationalTraversal(model,variant,values):mode==='predict-update'&&level===0?foundationalPrediction(model,variant,values):level===0&&['element','perform-update','access-2d','update-2d'].includes(mode)?foundationQuestion(mode,model,variant,values,grid):arrayQuestion(mode,model,mode==='reverse'?variant:mode==='search'&&!level?variant%6:variant%12,level,values,grid);
 const coreObservation=built.program.output,route=Math.floor(variant/12)%6,ss=built.program.statements;
 // Independently composed observation routes change the actual required read or
 // the assessed target; the seed and numeric substitutions never enter the key.
 if(!built.foundation&&!built.special&&route&&built.kind==='cell-2d'){
   const transforms=[null,minus(minus(L('grid',V('r')),1),V('c')),mod(plus(V('c'),R('grid',V('r'),0)),L('grid',V('r'))),mod(times(plus(V('c'),1),2),L('grid',V('r'))),mod(plus(V('c'),L('grid')),L('grid',V('r'))),mod(minus(L('grid',V('r')),plus(V('c'),1)),L('grid',V('r')))];
   ss.splice(mode==='update-2d'?ss.length-1:ss.length,0,S('c',transforms[route]));
   if(variant>=72)ss.splice(mode==='update-2d'?ss.length-1:ss.length,0,S('r',mod(plus(V('r'),R('grid',0,0)),L('grid'))),S('c',mod(V('c'),L('grid',V('r')))));
 }else if(!built.foundation&&!built.special&&route&&['cell','apply','swap'].includes(built.kind)){
   const transforms=[null,mod(plus(V('target'),R('values',0)),L('values')),minus(minus(L('values'),1),V('target')),mod(times(plus(V('target'),1),2),L('values')),mod(R('values',V('target')),L('values')),mod(plus(V('target'),L('values')),minus(L('values'),1))];
   ss.splice(built.kind==='swap'?built.details.insertTargetAt:built.kind==='apply'?ss.length-1:ss.length,0,S('target',transforms[route]));
 }else if(!built.foundation&&!built.special&&route&&mode!=='reverse'&&!built.program.output.op.includes('error')){
   const e=built.program.output,name=['nested','trace-2d','access-2d','update-2d'].includes(mode)?'grid':'values',first=name==='grid'?R(name,0,0):R(name,0),last=name==='grid'?R(name,minus(L(name),1),0):R(name,minus(L(name),1));
   const original=execute(built.program).answer;
   if(typeof original==='number')built.program.output=[null,plus(e,first),minus(e,last),minus(first,e),times(e,2),plus(e,minus(first,last))][route];
   else if(typeof original==='boolean')built.program.output=[null,B('==',e,B('>',first,last)),B('!=',e,B('<',first,last)),B('==',e,B('==',first,last)),B('!=',e,B('!=',first,last)),B('==',e,B('>=',first,last))][route];
   if(mode==='in-place')built.prompt='What value does the final print statement display?';
 }
 // Remove unused literal bindings instead of displaying them as false complexity.
 if(mode!=='reverse'){const used=new Set();const collect=x=>{if(x&&typeof x==='object'){if(x.op==='variable')used.add(x.name);Object.values(x).forEach(collect);}};collect(built.program);built.program.statements=built.program.statements.filter(s=>!(s.op==='declare'&&s.value.op==='literal'&&!used.has(s.name)));}
 if(!built.foundation&&['cell','apply'].includes(built.kind))built.program.output=cellIndex('values',built.program.output);
 if(!built.foundation&&built.kind==='cell-2d')built.program.output=cellIndex('grid',V('r'),V('c'));
 if(!built.foundation&&built.kind==='swap')built.program.output=cellPair('values',V('target'),V('swapWith'));
 const run=execute(built.program);
 const fingerprint=canonical(built.program);
 let answer=String(run.answer),choices=[],code=javaStatements(built.program.statements),methods=javaMethods(built.program.statements);
 if(built.kind==='choice')code+=`\nSystem.out.println(${javaExpression(built.program.output)});`;
 if(built.details.access&&mode!=='update-2d')code+=`\nSystem.out.println(${javaExpression(built.details.access)});`;
 if(methods)code=`${methods}\n\n// In main:\n${code}`;
 const observationDepth=e=>!e||['literal','variable'].includes(e.op)?0:1+Math.max(0,...['left','right','index','column','row'].filter(k=>e[k]&&typeof e[k]==='object').map(k=>observationDepth(e[k])));
 const evidence={primaryConcept:built.details.primaryConcept||MODEL_NAMES[mode][model],additionalConcepts:run.concepts,relevantOperationCount:Math.max(1,run.relevantOperations+observationDepth(built.program.output)),dependentReasoningStages:Math.max(1,run.structuralDepth+observationDepth(built.program.output)),trackedStateElements:new Set(run.slice.filter(e=>!['initial','allocation'].includes(e.kind)).map(e=>e.key)).size,controlFlowComplexity:run.controlFlowStages,edgeCaseComplexity:run.error?run.error:'none',minimumSolutionPath:run.slice.filter(e=>!['initial','allocation','loop-test','loop-index'].includes(e.kind)).map(e=>`${e.kind}: ${e.key} becomes ${JSON.stringify(e.value)}`).join('; '),assignedDifficulty:difficulty,difficultyJustification:level===0?'One focused array observation, straightforward traversal, or foundational reference relationship.':level===1?'Dependent index/value calculations or conditional state updates must be connected to the requested observation.':'The observation depends on interacting object states, mutations feeding later reads, or dependent algorithm stages.'};
 const numeric=Number(answer),wrong=answer==='true'||answer==='false'?[answer==='true'?'false':'true','Compile-time error','ArrayIndexOutOfBoundsException']:Number.isFinite(numeric)?[String(numeric+1),String(numeric-1),String(numeric+2),String(values[0]),String(values[1])]:['ArrayIndexOutOfBoundsException','NegativeArraySizeException','Compile-time error','0','No output'];
 if(answer==='null')wrong.splice(0,wrong.length,'0','false','"null"','""');
 if(answer==='0.0')wrong.splice(0,wrong.length,'0','null','false','1.0');
 if(mode==='nested'&&model===0){const parts=answer.trim().split(' '),display=a=>a.join(' ')+' ';wrong.splice(0,wrong.length,display(parts.slice().reverse()),display(parts.slice(1)),display([parts[1],parts[0],...parts.slice(2)]),display(parts.concat(parts[0])),display([String(Number(parts[0])+1),...parts.slice(1)]));}
 if(built.program.output.op==='grid-result'){const final=run.states.grid,display=a=>`[${a.map(row=>`[${row.join(', ')}]`).join(', ')}]`;wrong.splice(0,wrong.length,...[grid,final.slice().reverse(),final.map(row=>row.slice().reverse()),...[1,-1,2].map(offset=>final.map((row,r)=>row.map((x,c)=>r===0&&c===0?x+offset:x)))].map(display));}
 if(['array-result','row-result'].includes(built.program.output.op)){const display=a=>`[${a.join(', ')}]`,final=built.program.output.op==='row-result'?run.states.grid[built.program.output.row.value]:run.states[built.program.output.name],initial=built.details.initialArray||values;wrong.splice(0,wrong.length,...[initial,final.slice().reverse(),final.slice(1).concat(final[0]),final.slice(-1).concat(final.slice(0,-1)),initial.slice().reverse(),final.map((x,i)=>i===0?x+1:x),final.map((x,i)=>i===final.length-1?x-1:x),final.map((x,i)=>i===0?x-1:x)].map(display));}
 if(mode==='reverse'){
   const correct=javaStatements([built.details.missing]),wrongStatements=built.details.candidates.length?built.details.candidates:[S('values',R('values',V('source')),V('target')),S('values',R('values',V('target')),V('source')),S('values',minus(R('values',V('target')),R('values',V('source'))),V('target')),S('values',plus(R('values',V('target')),1),V('target')),S('values',plus(R('values',V('source')),2),V('target')),S('values',minus(R('values',V('source')),2),V('target'))];
   const valid=wrongStatements.map(s=>({text:javaStatements([s]),value:execute({...built.program,statements:[...built.details.prefix,s,...built.details.suffix]}).answer})).filter(s=>String(s.value)!==answer&&s.text!==correct);const distinct=[...new Set(valid.map(s=>s.text))];if(distinct.length<3)throw Error('Statement distractor collision');
   code=javaStatements(built.details.prefix)+'\n// Choose one statement here.\n'+javaStatements(built.details.suffix)+`\nSystem.out.println(${javaExpression(built.program.output)});`;built.prompt=`Choose the statement that makes the final print display ${answer}.`;answer=correct;choices=[correct,...distinct.slice(0,3)];
 }else if(built.kind==='choice')choices=[answer,...[...new Set(wrong)].filter(x=>x!==answer).slice(0,3)];
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 const q={game:'array-lab',title:'Array Lab',format:mode,difficulty,kind:built.kind,variant:MODEL_NAMES[mode][model],family:MODEL_NAMES[mode][model],reasoningModel:MODEL_NAMES[mode][model],structuralVariant:variant,semanticFingerprint:fingerprint,seed,skill:MODEL_NAMES[mode][model],topic:mode,topicTitle:mode,code,prompt:built.prompt,answer,expectedOutput:String(run.answer),choices,correctAnswer:answer,explanation:run.error?`Execution attempts an index outside the allocated array. Java throws ${run.error}.`:`Trace only the operations affecting the requested result. ${evidence.minimumSolutionPath}. The requested result is ${answer}.`,difficultyEvidence:evidence,semanticProgram:built.program,coreObservation,javaBody:javaStatements(built.program.statements),javaMethods:methods,javaOutput:javaExpression(built.program.output),trace:[],initialState:values,finalState:run.states.values,validation:{exception:run.error||null},generationVersion:1};
 if(run.error&&mode!=='reverse')q.prompt='What happens when this code is compiled and run?';
 if(built.kind==='cell'||built.kind==='apply'||built.kind==='swap'){q.values=values;q.correctCell=String(run.answer);q.correctCells=built.kind==='swap'?[String(Math.floor(run.answer/100)),String(run.answer%100)]:[q.correctCell];q.answerState=run.states.values;q.applyValue=q.answerState[Number(run.answer)];q.target=Number(run.answer);q.correctAnswer=built.kind==='swap'?`indices ${q.correctCells.join(' and ')}`:`index ${run.answer}${built.kind==='cell'?` = ${run.states.values[Number(run.answer)]}`:''}`;q.revealIndices=true;}
 if(built.kind==='cell-2d'){q.grid=grid;q.rows=grid.length;q.columns=Math.max(...grid.map(r=>r.length));q.correctCell=`${Math.floor(run.answer/100)},${run.answer%100}`;q.correctCells=[q.correctCell];q.answerState=run.states.grid;q.correctAnswer=`[${q.correctCell.replace(',','][')}]`;q.revealIndices=true;}
 const objectNames=new Map(run.events.filter(e=>e.kind==='allocation').map(e=>[e.value,e.key]));
 const describeKey=key=>key.startsWith('#')?key.replace(/^#(\d+):(.+)$/,(_,id,indices)=>`initial ${objectNames.get(Number(id))||'array'}[${indices.split(',').join('][')}]`):key;
 const statementById=new Map();function remember(list){for(const statement of list){statementById.set(run.statementIds.get(statement),statement);if(statement.body)remember(statement.body);if(statement.yes)remember(statement.yes);if(statement.no)remember(statement.no);}}remember(built.program.statements);
 const steps=run.slice.filter(e=>['mutation','scalar','reference','parameter','branch'].includes(e.kind)).slice(-6).map(e=>e.kind==='branch'?`${javaExpression(statementById.get(e.statement).condition)} evaluates to ${e.value}`:e.concept==='independent copy'?`${e.key} refers to a new independent copy`:e.kind==='parameter'?`${e.key} receives a copy of the caller's reference`:e.concept==='row alias'?`${e.key} refers to the selected row object`:e.kind==='reference'?`${e.key} refers to ${objectNames.has(e.value)?`the ${objectNames.get(e.value)} array`:'an array object'}`:`${describeKey(e.key)} becomes ${JSON.stringify(e.value)}`);
 // Inline observations can have no state-change events. Explain the actual
 // index/comparison instead of leaving an empty trace after a generic rule.
 const lengthFacts=new Set();function lengths(node){if(!node||typeof node!=='object')return;if(node.op==='length'){const data=run.states[node.name],row=node.row?.op==='literal'?node.row.value:undefined,value=!node.row?data?.length:row!==undefined?data?.[row]?.length:undefined;if(value!==undefined)lengthFacts.add(`${node.name}${node.row?`[${row}]`:''}.length is ${value}`);}Object.values(node).forEach(lengths);}lengths(built.program.output);
 const observation=built.program.output,inlineObservation=observation.op==='cell-index'?(observation.column?`Row ${javaExpression(observation.index)} and column ${javaExpression(observation.column)} select [${q.correctCell.replace(',','][')}]`:`${javaExpression(observation.index)} selects index ${q.correctCell}`):observation.op==='cell-pair'?`The exchanged indices are ${q.correctCells.join(' and ')}`:`${q.javaOutput} evaluates to ${q.expectedOutput}`;
 const explanationSteps=steps.length?steps.join('; '):[...lengthFacts,inlineObservation].join('; ');
 const rule=run.concepts.includes('independent copy')?'clone() creates a separate array object with copied element values.':run.concepts.includes('row alias')?'An int[][] contains references to row arrays. References to the same row share one array object.':run.concepts.includes('method parameter')?'Java passes a copy of an array reference. Element mutations affect the shared array; reassigning the local parameter does not reassign the caller’s variable.':built.program.statements.some(s=>s.op==='array'&&s.defaulted||s.op==='allocate'&&s.state==='allocated')?'New int array elements start at 0. Follow later assignments in order.':mode==='create-references'||run.concepts.includes('aliasing')?'Array assignment copies a reference. Aliases share one array; a new allocation creates a separate object.':mode==='in-place'?'The same array is read and written in order, so later reads can use earlier updates.':mode.includes('2d')||mode==='nested'?'Use each selected row’s own length and follow the nested conditions in execution order.':'Evaluate the indices and conditions before applying each dependent update.';
 const errorExplanations={'ArrayIndexOutOfBoundsException':'An attempted index is outside its array’s valid range, so Java throws ArrayIndexOutOfBoundsException.','NegativeArraySizeException':'Java evaluates the length expression before allocation. A negative length throws NegativeArraySizeException; it does not create an empty array.','NullPointerException':'The reference is null, so there is no array whose length or element can be read. Java throws NullPointerException.','Compile-time error':'A local reference has no automatic default value. Java rejects its use before assignment at compile time.'};
 q.explanation=run.error?errorExplanations[run.error]||run.error:built.special?`A newly allocated ${built.program.statements.find(s=>s.op==='allocate').type} array initializes every element to ${answer}. The array reference itself points to the allocated array.`:`${rule} ${explanationSteps}. ${mode==='reverse'?`The selected statement makes the final print display ${q.expectedOutput}.`:`The requested result is ${q.correctAnswer}.`}`;
 return q;
}
