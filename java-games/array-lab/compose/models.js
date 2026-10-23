import {lit,variable as V,binary as B,read as R,length as L,declare as D,array as A,alias as F,assign as S,branch as If,loop as For,call as Call,rowReference,returnedReference,referenceEqual,arrayResult,stop,execute,canonical,javaStatements,javaExpression,javaMethods} from './ir.js';

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
const plus=(a,b)=>B('+',a,b),minus=(a,b)=>B('-',a,b),times=(a,b)=>B('*',a,b),mod=(a,b)=>B('%',a,b);
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
 const inner=For('c',rev?minus(L('grid',V('r')),1):skip?1:0,B(rev?'>=':'<',V('c'),rev?0:L('grid',V('r'))),rev?-1:1,body);
 return For('r',0,B('<',V('r'),L('grid')),1,[inner]);
}
function arrayQuestion(mode,m,v,level,values,grid){
 const statements=[A('values',values)],n=values.length;let output=lit(0),prompt='What value does this code print?',kind='choice',details={};
 if(mode==='element'||mode==='perform-update'){
   const initial=[];let e=selectedIndex(m,v,initial);statements.push(...initial);
   // Avoid duplicate declarations when the model already introduced index.
   if(initial.some(s=>s.name==='index')){e=mod(e,L('values'));statements.push(D('selected',e));e=V('selected');}
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
   const isSearch=mode==='search',target=isSearch&&m===4?-99:values[2];if(isSearch&&[0,1,2,3,5,6,7].includes(m))values[4]=target;statements[0]=A('values',values);
   const extreme=(isSearch?[8,10].includes(m):m===3),count=isSearch?[3].includes(m):[2].includes(m),first=isSearch&&[0,4,6,7,9].includes(m),last=isSearch&&m===1,exists=isSearch&&m===2,all=isSearch&&m===11;
   statements.push(D('result',all?true:first||last?-1:exists?false:extreme?R('values',0):0,exists||all?'boolean':'int'));
   let condition=B('==',R('values',V('i')),target);
   if(!isSearch||[7,8].includes(m))condition=B(m%2?'>':'<',R('values',V('i')),R('values',0));
   if(extreme)condition=B(isSearch?(m===10?'>':'<'):v%2?'>':'<',R('values',V('i')),V('result'));
   if(all)condition=B('!=',R('values',V('i')),target);
   if(level)condition=B('&&',condition,B('!=',mod(V('i'),2),1));
   if(level===2){statements.push(D('previous',R('values',0)));condition=B('&&',condition,B('>=',R('values',V('i')),V('previous')));}
   let action=all?S('result',false):exists?S('result',true):first||last?S('result',V('i')):extreme?S('result',R('values',V('i'))):add('result',count?1:R('values',V('i')));
   if(!isSearch&&m===10)action=add('result',times(V('i'),R('values',V('i'))));
   if(!isSearch&&[4,5].includes(m))action=S('result',minus(R('values',V('i')),V('result')));
   let body=(isSearch||[1,2,3,8,9].includes(m))?[If(condition,[action,...(first?[stop]:[])])]:[action];
   if(isSearch&&m===5)body=[If(B('>',R('values',V('i')),R('values',0)),[stop]),add('result',R('values',V('i')))];
   if(isSearch&&m===9){statements.push(D('movingTarget',target));body=[If(B('==',R('values',V('i')),V('movingTarget')),[S('result',V('i'))]),S('movingTarget',plus(V('movingTarget'),mod(R('values',V('i')),2)))];}
   if(level===1)body.unshift(add('values',R('values',0),V('i')));
   if(level===2)body.unshift(S('values',plus(R('values',V('i')),V('previous')),V('i')),S('previous',minus(R('values',V('i')),V('previous'))));
   if(!isSearch&&m===8)body.unshift(S('values',plus(R('values',V('i')),R('values',0)),V('i')));
   if(!isSearch&&m===9)body.push(S('values',plus(R('values',V('i')),V('result')),V('i')));
   const scan=isSearch?(m===0||m===4?0:m===6?1:v):m===0||m===4?0:m===5?1:m===6?4+v%2:m===7?2+v%2:v;
   statements.push(traversalLoop(scan,body));output=V('result');
 }else if(mode==='create-references'){
   const i=v%3,j=(i+1)%n;let a='values';
   if(m===0){statements.push(A('other',values.map(x=>x+1)),add('values',R('other',j),i),add('other',R('values',i),j));output=plus(R('values',i),R('other',j));}
   if([3,7].includes(m)){statements.push(F('other','values'));if(m===7)statements.push(F('saved','other'));statements.push(add(m===7?'saved':'other',R('values',j),i));output=R('values',i);}
   if(m===1){statements.push(F('other','values'));if(level)statements.push(add('values',R('values',j),i),If(B('>',R('values',i),R('values',j)),[A('other',values.slice(),false)]));if(level===2)statements.push(F('saved','values'),A('values',values.map(x=>x+2),false),If(B('>',R('saved',i),R('values',i)),[F('other','values',false)],[F('other','saved',false)]));output=referenceEqual('values','other',v%2===1);}
   if(m===2){if(!level){statements.push(A('other',values.map(x=>x+2)),F('values','other',false));output=R('values',i);}else{statements.push(F('saved','values'),A('other',values.map(x=>x+2)),F('values','other',false),add('saved',R('values',j),i));output=plus(R('saved',i),R('values',j));}}
   if(m===5&&!level){statements.push(F('other','values'),Call('change','values',[A('p',values.map(x=>x+2),false)]));output=referenceEqual('values','other',v%2===1);}
   else if([4,5].includes(m)){const body=m===5?[F('saved','p'),A('p',values.map(x=>x+2),false),add('saved',R('p',j),i)]:[add('p',R('p',j),i)];statements.push(Call('change','values',body));output=R('values',i);}
   if(m===6){statements.push(returnedReference('other','values',v%2===1),add('other',R('values',j),i));output=plus(R('values',i),R('other',i));}
   if(m===8){statements[0]=A('values',Array(n).fill(0),true,true);statements.push(S('values',plus(L('values'),v%3),i));output=plus(R('values',i),R('values',j));}
   if(m===9){statements.push(D('index',minus(L('values'),v%2?1:0)));output=R('values',V('index'));}
   if(m===10){statements.push(F('other','values'));if(v%2)statements.push(A('other',values.slice(),false));if(level)statements.push(add('values',R('values',j),i),If(B('>',R('values',i),R('values',j)),[F('other','values',false)],[A('other',values.map(x=>x+1),false)]));if(level===2)statements.push(F('saved','values'),returnedReference('returned','other',v%3===0),A('values',values.map(x=>x+2),false),If(B('>',R('saved',i),R('values',i)),[F('other','returned',false)],[F('other','saved',false)]));output=referenceEqual('values','other',v%3===1);}
   if(v>=6&&![1,10].includes(m)&&!(m===5&&!level)){statements.push(F('last','values'),add('last',R('values',j),i));output=plus(output,R('last',i));}
   if(level&&![1,10].includes(m)){statements.push(F('probe','values'),add('probe',R('values',i),j));output=plus(output,R('probe',j));}
   if(level===2&&![1,10].includes(m)){statements.push(A('replacement',[1,3,2,4,5,6]),F('probe','replacement',false),Call('adjust','values',[add('p',R('p',j),i),If(B('>',R('p',i),R('p',j)),[add('p',R('p',i),j)])]));output=plus(output,plus(R('probe',i),R('values',j)));}
 }else if(mode==='in-place'){
   let body=[],start=0,end=L('values'),step=1;
   if(m===0||m===2){if(m===2)statements.push(D('saved',R('values',0)));body=[S('values',R('values',plus(V('i'),1)),V('i'))];end=minus(L('values'),1);}
   if(m===1||m===3){if(m===3)statements.push(D('saved',R('values',minus(L('values'),1))));start=minus(L('values'),1);end=lit(0);step=-1;body=[S('values',R('values',minus(V('i'),1)),V('i'))];}
   if(m===4||m===5){start=m===5?lit(1,'interior-start'):lit(0,'first');end=B('/',L('values'),2);body=swap('values',V('i'),minus(minus(L('values'),1),V('i')));}
   if(m===6){end=minus(L('values'),1);step=2;body=swap('values',V('i'),plus(V('i'),1));}
   if(m===7){body=[If(B('>',R('values',V('i')),R('values',0)),[S('values',minus(R('values',V('i')),R('values',0)),V('i'))])];}
   if(m===8){statements.push(D('write',0));body=[If(B('>',R('values',V('i')),0),[S('values',R('values',V('i')),V('write')),add('write',1)])];}
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
   if(form===4)body=[If(B('==',mod(R('values',V('i')),2),0),body)];
   if(form===5)body=[If(B('<',R('values',V('i')),R('values',0)),[stop]),...body];
   const transform=For('i',start,test,step,body);if(level===1)statements.push(add('values',R('values',1),0));statements.push(transform);
   if(m===2)statements.push(S('values',V('saved'),minus(L('values'),1)));if(m===3)statements.push(S('values',V('saved'),0));
   if(v>=6&&!(m===6&&v===6))statements.push(For('i',1,B('<',V('i'),L('values')),2,[add('values',R('values',minus(V('i'),1)),V('i'))]));
   if(level===2)statements.push(For('i',1,B('<',V('i'),L('values')),1,[If(B('>',R('values',V('i')),R('values',minus(V('i'),1))),[S('values',minus(R('values',V('i')),R('values',minus(V('i'),1))),V('i'))])]));
   if(level===2)statements.push(For('i',minus(L('values'),2),B('>=',V('i'),0),-1,[S('values',plus(R('values',V('i')),R('values',plus(V('i'),1))),V('i'))]));
   output=arrayResult('values');prompt='What are the complete contents of values after the code executes?';
 }else if(['access-2d','update-2d','nested','trace-2d'].includes(mode)){
   statements.splice(0,1,A('grid',grid));const r=v%grid.length,c=v%2;
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
     else{row=mod(row,L('grid'));col=mod(col,L('grid',row));statements.push(D('r',row),D('c',col));output=plus(times(V('r'),100),V('c'));kind='cell-2d';prompt=mode==='access-2d'?'Select the cell accessed by the final expression.':'Select the cell changed by the final assignment.';details.access=R('grid',V('r'),V('c'));
       if(mode==='update-2d')statements.push(add('grid',R('grid',V('r'),mod(plus(V('c'),1),L('grid',V('r')))),V('r'),V('c')));
     }
   }else if(mode==='update-2d'){
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
     else if(m===8){const scan=gridLoop(v,[S('grid',plus(R('grid',V('r'),V('c')),V('carry')),V('r'),V('c')),S('carry',R('grid',V('r'),V('c')))]);const rename=x=>{if(x&&typeof x==='object'){if(x.name==='r')x.name='row';if(x.name==='c')x.name='col';Object.values(x).forEach(rename);}};rename(scan);statements.push(D('carry',R('grid',0,0)),scan);output=V('carry');}
     else{statements.push(S('grid',rhs,V('r'),V('c')));output=plus(times(V('r'),100),V('c'));kind='cell-2d';prompt='Select the cell changed by the final assignment.';}
   }else{
     statements.push(D('result',0));let value=R('grid',V('r'),V('c')),body=[add('result',value)];
     if(m===0)body=[If(B('==',V('r'),r),body)];
     if(m===1)body=[If(B('==',V('c'),c),body)];
     if(m===2||m===3){body=[add('rowTotal',value)];if(m===3)body=[If(B('==',V('c'),c),body)];}
     if(m===4)body=[If(B('==',value,grid[1][1]),[S('result',plus(times(V('r'),100),V('c')))])];
     if(m===5)body=[If(B('>',value,0),[add('result',1)])];
     if(m===6)body=[If(B('==',V('r'),V('c')),[add('result',value)])];
     if(m===7)body=[If(B('>',V('c'),0),[add('result',minus(value,R('grid',V('r'),minus(V('c'),1))))])];
     if(m===8)body=[S('grid',plus(value,R('grid',V('r'),0)),V('r'),V('c')),add('result',value)];
     if(m===9)body=[If(B('>',value,R('grid',V('r'),0)),[S('grid',minus(value,R('grid',V('r'),0)),V('r'),V('c'))],[S('grid',plus(value,R('grid',V('r'),0)),V('r'),V('c'))]),add('result',value)];
     if(mode==='nested'){
       const tasks=[
         [S('result',plus(times(V('result'),3),mod(value,3)))],
         [S('result',value)],
         [add('result',1)],
         [If(B('>',value,0),[add('result',1)])],
         [add('result',value)],
         [If(B('&&',B('!=',V('r'),1),B('!=',V('c'),1)),[add('result',value)])],
         [If(B('<',value,0),[stop]),add('result',value)],
         [add('result',1)],
         [S('grid',plus(value,R('grid',V('r'),0)),V('r'),V('c')),add('result',value)],
         [add('result',plus(times(V('r'),L('grid',V('r'))),V('c')))]
       ];body=tasks[m];
     }
     if(level===1)body.unshift(S('grid',plus(value,V('r')),V('r'),V('c')));
     if(level===2)body.unshift(S('grid',plus(value,V('result')),V('r'),V('c')));
     if(v>=6)body=[If(B('!=',mod(V('c'),2),0),body)];
     if(mode==='nested'&&m===7){let term=add('result',L('grid',V('r')));if(level)term=If(B('>',L('grid',V('r')),L('grid',0)),[term]);statements.push(For('r',0,B('<',V('r'),L('grid')),1,[term]));if(level===2)statements.push(gridLoop(v,[S('grid',plus(value,V('result')),V('r'),V('c')),If(B('>',value,V('result')),[add('result',1)])]));}
     else if(mode==='nested'&&m===2&&level===2){statements.push(gridLoop(v,[S('grid',plus(value,V('result')),V('r'),V('c')),If(B('>',value,plus(V('result'),3)),[stop]),add('result',1)]));}
     else if(mode==='trace-2d'&&m===9&&!level){statements.push(D('r',r),D('c',c),...body);}
     else if(mode==='trace-2d'&&m===3){statements.push(D('best',100000));const cell=R('grid',V('r'),V('c')),terms=[add('total',cell)];if(level)terms.unshift(S('grid',plus(cell,V('c')),V('r'),V('c')));if(level===2)terms.push(S('grid',plus(cell,V('total')),V('r'),V('c')));statements.push(For('c',0,B('<',V('c'),L('grid',0)),1,[D('total',0),For('r',0,B('<',V('r'),L('grid')),1,terms),If(B(v%2?'<=':'<',V('total'),V('best')),[S('best',V('total')),S('result',V('c'))])]));}
     else if(mode==='trace-2d'&&m===8){const last=minus(L('grid'),1);statements.push(For('c',0,B('<',V('c'),L('grid',0)),1,[D('temp',R('grid',0,V('c'))),S('grid',R('grid',last,V('c')),0,V('c')),S('grid',V('temp'),last,V('c')),add('result',R('grid',0,V('c')))]));if(level)statements.push(S('grid',plus(R('grid',0,0),V('result')),0,0));if(level===2)statements.push(For('c',0,B('<',V('c'),L('grid',0)),1,[add('grid',R('grid',last,V('c')),0,V('c')),If(B('>',R('grid',0,V('c')),R('grid',0,0)),[add('result',R('grid',0,V('c')))])]));output=level?plus(R('grid',0,0),V('result')):V('result');}
     else if(mode==='trace-2d'&&m===2){statements.push(D('best',-100000));const outer=gridLoop(v,body);outer.body.unshift(D('rowTotal',0));outer.body.push(If(B(v%2?'>=':'>',V('rowTotal'),V('best')),[S('best',V('rowTotal')),S('result',V('r'))]));statements.push(outer);}
     else statements.push(gridLoop(v,body));if(!(mode==='trace-2d'&&m===8))output=V('result');
   }
 }else if(mode==='reverse'){
   const i=v%3,j=(i+1)%n,indexSteps=[];let index=selectedIndex(m,v,indexSteps);statements.push(...indexSteps,D('target',mod(index,L('values'))),D('source',j));if(level)statements.push(add('values',R('values',j),i),S('target',mod(R('values',i),L('values'))));if(level===2)statements.push(F('other','values'),add('other',R('values',V('target')),j),S('source',mod(R('other',j),L('values'))));
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
   if(m===7){correct=A('values',values.map(x=>x+1),false);output=plus(R('values',V('target')),L('values'));candidates=[A('values',values,false),A('values',values.map(x=>x-1),false),A('values',[0,0,0],false),A('values',values.map(x=>x+2),false)];}
   if(m===8)correct=S('values',minus(R('values',V('source')),R('values',V('target'))),V('target'));
   if(m===9){const test=B('>',R('values',V('target')),R('values',V('source'))),a=add('values',R('values',V('source')),V('target')),b=S('values',minus(R('values',V('source')),R('values',V('target'))),V('target'));correct=If(test,[a],[b]);candidates=[If(test,[b],[a]),a,b,add('values',1,V('target')),add('values',-1,V('target')),S('values',R('values',V('source')),V('target')),S('values',0,V('target'))];}
   details.missing=correct;details.prefix=statements.slice();details.suffix=suffix;details.candidates=candidates;statements.push(correct,...suffix);prompt='Choose the statement that produces the requested final value.';
 }
 return {program:{statements,output,objective:kind==='choice'?'value':kind==='cell-2d'?'coordinate':'cell'},kind,prompt,details};
}

export function buildModel(mode,model,variant,difficulty,seed){
 const random=rng(seed),level=LEVELS.indexOf(difficulty);if(level<0||!MODEL_NAMES[mode])throw Error('Invalid Array Lab mode/difficulty');
 const values=Array.from({length:mode==='in-place'&&model===5?8:6},()=>Math.floor(random()*14)-(['search','traversal','in-place'].includes(mode)?4:0));
 const grid=Array.from({length:3},(_,r)=>Array.from({length:model===5||model===7?3+r:4},()=>['access-2d','update-2d'].includes(mode)?1+Math.floor(random()*13):Math.floor(random()*15)-3));
 const built=arrayQuestion(mode,model,mode==='reverse'?variant:variant%12,level,values,grid);
 const route=Math.floor(variant/12)%6,ss=built.program.statements;
 // Independently composed observation routes change the actual required read or
 // the assessed target; the seed and numeric substitutions never enter the key.
 if(route&&built.kind==='cell-2d'){
   const transforms=[null,minus(minus(L('grid',V('r')),1),V('c')),mod(plus(V('c'),R('grid',V('r'),0)),L('grid',V('r'))),mod(times(plus(V('c'),1),2),L('grid',V('r'))),mod(plus(V('c'),L('grid')),L('grid',V('r'))),mod(minus(L('grid',V('r')),plus(V('c'),1)),L('grid',V('r')))];
   ss.splice(mode==='update-2d'?ss.length-1:ss.length,0,S('c',transforms[route]));
   if(variant>=72)ss.splice(mode==='update-2d'?ss.length-1:ss.length,0,S('r',mod(plus(V('r'),R('grid',0,0)),L('grid'))),S('c',mod(V('c'),L('grid',V('r')))));
 }else if(route&&['cell','apply','swap'].includes(built.kind)){
   const transforms=[null,mod(plus(V('target'),R('values',0)),L('values')),minus(minus(L('values'),1),V('target')),mod(times(plus(V('target'),1),2),L('values')),mod(R('values',V('target')),L('values')),mod(plus(V('target'),L('values')),minus(L('values'),1))];
   ss.splice(built.kind==='swap'?built.details.insertTargetAt:built.kind==='apply'?ss.length-1:ss.length,0,S('target',transforms[route]));
 }else if(route&&mode!=='reverse'&&!built.program.output.op.includes('error')){
   const e=built.program.output,name=['nested','trace-2d','access-2d','update-2d'].includes(mode)?'grid':'values',first=name==='grid'?R(name,0,0):R(name,0),last=name==='grid'?R(name,minus(L(name),1),0):R(name,minus(L(name),1));
   const original=execute(built.program).answer;
   if(typeof original==='number')built.program.output=[null,plus(e,first),minus(e,last),minus(first,e),times(e,2),plus(e,minus(first,last))][route];
   else if(typeof original==='boolean')built.program.output=[null,B('&&',e,B('>',first,last)),B('||',e,B('<',first,last)),B('==',e,B('>',first,last)),B('!=',e,B('<',first,last)),B('&&',e,B('!=',first,last))][route];
   if(mode==='in-place')built.prompt='What value does the final print statement display?';
 }
 // Remove unused literal bindings instead of displaying them as false complexity.
 if(mode!=='reverse'){const used=new Set();const collect=x=>{if(x&&typeof x==='object'){if(x.op==='variable')used.add(x.name);Object.values(x).forEach(collect);}};collect(built.program);built.program.statements=built.program.statements.filter(s=>!(s.op==='declare'&&s.value.op==='literal'&&!used.has(s.name)));}
 const run=execute(built.program);
 let fingerprint=canonical(built.program);const branches=run.slice.filter(e=>e.kind==='branch').map(e=>e.value?'T':'F');if(branches.length)fingerprint+='|path:'+branches.join('');
 let answer=String(run.answer),choices=[],code=javaStatements(built.program.statements),methods=javaMethods(built.program.statements);
 if(built.kind==='choice')code+=`\nSystem.out.println(${javaExpression(built.program.output)});`;
 if(built.details.access&&mode!=='update-2d')code+=`\nSystem.out.println(${javaExpression(built.details.access)});`;
 if(methods)code=`${methods}\n\n// In main:\n${code}`;
 const evidence={primaryConcept:MODEL_NAMES[mode][model],additionalConcepts:run.concepts,relevantOperationCount:run.relevantOperations,dependentReasoningStages:run.depth,trackedStateElements:new Set(run.slice.filter(e=>!['initial','allocation'].includes(e.kind)).map(e=>e.key)).size,controlFlowComplexity:run.slice.filter(e=>['branch','loop-test'].includes(e.kind)).length,edgeCaseComplexity:run.error?run.error:'none',minimumSolutionPath:run.slice.filter(e=>!['initial','allocation','loop-test','loop-index'].includes(e.kind)).map(e=>`${e.kind}: ${e.key} becomes ${JSON.stringify(e.value)}`).join('; '),assignedDifficulty:difficulty,difficultyJustification:level===0?'One array objective with a direct access, update, or simple traversal.':level===1?'Dependent index/value calculations or conditional state updates are needed.':'The result depends on mutations feeding later reads, reference relationships, or interacting traversal state.'};
 const numeric=Number(answer),wrong=answer==='true'||answer==='false'?[answer==='true'?'false':'true','Compile-time error','ArrayIndexOutOfBoundsException']:Number.isFinite(numeric)?[String(numeric+1),String(numeric-1),String(numeric+2),String(values[0]),String(values[1])]:['ArrayIndexOutOfBoundsException','NegativeArraySizeException','Compile-time error','0','No output'];
 if(mode==='in-place'){const display=a=>`[${a.join(', ')}]`,final=run.states.values;wrong.splice(0,wrong.length,...[values,values.slice().reverse(),values.slice(1).concat(values[0]),values.slice(-1).concat(values.slice(0,-1)),final.map((x,i)=>i===0?x+1:x),final.map((x,i)=>i===final.length-1?x-1:x)].map(display));}
 if(mode==='reverse'){
   const correct=javaStatements([built.details.missing]),wrongStatements=built.details.candidates.length?built.details.candidates:[S('values',R('values',V('source')),V('target')),S('values',R('values',V('target')),V('source')),S('values',minus(R('values',V('target')),R('values',V('source'))),V('target')),S('values',plus(R('values',V('target')),1),V('target')),S('values',plus(R('values',V('source')),2),V('target')),S('values',minus(R('values',V('source')),2),V('target'))];
   const valid=wrongStatements.map(s=>({text:javaStatements([s]),value:execute({...built.program,statements:[...built.details.prefix,s,...built.details.suffix]}).answer})).filter(s=>String(s.value)!==answer&&s.text!==correct);const distinct=[...new Set(valid.map(s=>s.text))];if(distinct.length<3)throw Error('Statement distractor collision');
   code=javaStatements(built.details.prefix)+'\n// Choose one statement here.\n'+javaStatements(built.details.suffix)+`\nSystem.out.println(${javaExpression(built.program.output)});`;built.prompt=`Choose the statement that makes the final print display ${answer}.`;answer=correct;choices=[correct,...distinct.slice(0,3)];
 }else if(built.kind==='choice')choices=[answer,...[...new Set(wrong)].filter(x=>x!==answer).slice(0,3)];
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 const q={game:'array-lab',title:'Array Lab',format:mode,difficulty,kind:built.kind,variant:MODEL_NAMES[mode][model],family:MODEL_NAMES[mode][model],reasoningModel:MODEL_NAMES[mode][model],structuralVariant:variant,semanticFingerprint:fingerprint,seed,skill:MODEL_NAMES[mode][model],topic:mode,topicTitle:mode,code,prompt:built.prompt,answer,expectedOutput:String(run.answer),choices,correctAnswer:answer,explanation:run.error?`Execution attempts an index outside the allocated array. Java throws ${run.error}.`:`Trace only the operations affecting the requested result. ${evidence.minimumSolutionPath}. The requested result is ${answer}.`,difficultyEvidence:evidence,semanticProgram:built.program,javaBody:javaStatements(built.program.statements),javaMethods:methods,javaOutput:javaExpression(built.program.output),trace:[],initialState:values,finalState:run.states.values,validation:{exception:run.error||null},generationVersion:1};
 if(built.kind==='cell'||built.kind==='apply'||built.kind==='swap'){q.values=values;q.correctCell=String(run.answer);q.correctCells=built.kind==='swap'?[String(Math.floor(run.answer/100)),String(run.answer%100)]:[q.correctCell];q.answerState=run.states.values;q.applyValue=q.answerState[Number(run.answer)];q.target=Number(run.answer);q.correctAnswer=built.kind==='swap'?`indices ${q.correctCells.join(' and ')}`:`index ${run.answer}${built.kind==='cell'?` = ${run.states.values[Number(run.answer)]}`:''}`;q.revealIndices=true;}
 if(built.kind==='cell-2d'){q.grid=grid;q.rows=grid.length;q.columns=Math.max(...grid.map(r=>r.length));q.correctCell=`${Math.floor(run.answer/100)},${run.answer%100}`;q.correctCells=[q.correctCell];q.answerState=run.states.grid;q.correctAnswer=`[${q.correctCell.replace(',','][')}]`;q.revealIndices=true;}
 const objectNames=new Map(run.events.filter(e=>e.kind==='allocation').map(e=>[e.value,e.key]));
 const describeKey=key=>key.startsWith('#')?key.replace(/^#(\d+):(.+)$/,(_,id,indices)=>`initial ${objectNames.get(Number(id))||'array'}[${indices.split(',').join('][')}]`):key;
 const steps=run.slice.filter(e=>['mutation','scalar','reference','parameter'].includes(e.kind)).slice(-6).map(e=>['reference','parameter'].includes(e.kind)?`${e.key} refers to the ${objectNames.get(e.value)||'shared'} array`:`${describeKey(e.key)} becomes ${JSON.stringify(e.value)}`);
 const rule=mode==='create-references'?'Assignment copies a reference value. Aliases share array elements; reassigning a method parameter changes that local reference.':mode==='in-place'?'The same array is read and written in order, so later reads can use earlier updates.':mode.includes('2d')||mode==='nested'?'Use each selected row’s own length and follow the nested conditions in execution order.':'Evaluate the indices and conditions before applying each dependent update.';
 q.explanation=run.error?`An attempted index is outside its array’s valid range, so Java throws ${run.error}.`:`${rule} ${steps.join('; ')}. ${mode==='reverse'?`The selected statement makes the final print display ${q.expectedOutput}.`:`The requested result is ${q.correctAnswer}.`}`;
 return q;
}
