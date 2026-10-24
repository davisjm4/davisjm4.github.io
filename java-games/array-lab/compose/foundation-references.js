import {array as A,allocate,read as R,length as L,variable as V,lit,binary as B,declare as D,assign as S,alias as F,call,rowReference,returnedReference,referenceEqual} from './ir.js';
import {allocationQuestion} from './allocation.js';
import {foundationQuestion} from './foundations.js';
const add=(a,b)=>B('+',a,b),sub=(a,b)=>B('-',a,b);
const arithmetic=(a,b,v)=>[add(a,b),sub(a,b),B('*',a,b),B('/',a,b),B('%',a,b),B('/',add(a,b),2)][v];
function index(v,ss,values,name='values'){
  if(v===3){ss.push(D('selected',2));return V('selected');}
  if(v===4){ss.push(A('positions',[2,1,3]));return R('positions',0);}
  if(v===5){if(values)values[0]=2;return R(name,0);}
  return [lit(2),sub(L(name),1),B('/',L(name),2)][v];
}
export function foundationalReferences(model,variant,values,grid){
  const v=variant%6;values.forEach((n,i)=>values[i]=1+Math.abs(n)%7);
  // The foundation of mutation-through-a-reference is identifying sharing.
  // Numeric mutation tracing belongs to Intermediate (the mandatory rubric's
  // alias + arithmetic example must never be relabeled Beginner).
  if(model===3){
    const sample=values.slice(0,3+variant%4),statements=[A('values',sample),F('other','values')],size=L('other');
    const output=[size,sub(size,1),B('/',size,2),B('%',size,2),B('/',sub(size,1),2),B('/',add(size,1),2)][v];
    return {program:{statements,output,objective:'value'},kind:'choice',prompt:'What does the final print statement display?',details:{primaryConcept:'length-through-an-alias'},foundation:true};
  }
  if(model===8&&variant>=6)return {...allocationQuestion(36+(variant-6)%36),foundation:true};
  if(model===9)return foundationQuestion('element',9,variant,values,grid);
  let ss=[A('values',values)],output=R('values',0);
  if(model===0){
    if(v===0)ss.push(A('other',values.slice()));
    if(v===1)ss.push(returnedReference('other','values',true));
    if(v===2){ss=[A('grid',grid),rowReference('left','grid',0),rowReference('right','grid',1)];output=referenceEqual('left','right');}
    if(v===3)ss.push(F('other','values'),A('other',values.slice(),false));
    if(v===4)ss.push(A('separate',values.slice()),returnedReference('other','separate',false));
    if(v===5)ss.push(A('separate',values.slice()),F('saved','separate'),F('separate','values',false));
    if(v!==2)output=referenceEqual('values',v===5?'saved':'other');
  }
  if(model===1){
    if(v===0)ss.push(F('other','values'));
    if(v===1)ss.push(A('other',values.slice()));
    if(v===2)ss.push(F('middle','values'),F('other','middle'));
    if(v===3)ss.push(F('other','values'),A('other',values.slice(),false));
    if(v===4||v===5)ss.push(returnedReference('other','values',v===5));
    output=referenceEqual('values','other');
  }
  if(model===2){const replacement=values.map(x=>x+2);if(v===5)replacement[0]=2;ss.push(A('other',replacement),F('values','other',false));const at=index(v,ss,replacement);output=R('values',at);}
  if(model===3)ss.push(F('other','values'),S('other',arithmetic(R('other',0),R('values',1),v),0));
  if(model===4){const body=[],at=index(v,body,values,'p');ss.push(call('inspect','values',body,R('p',at),'result'));output=V('result');}
  if(model===6){
    let source='values';if(v===2||v===3){ss.push(F('argument','values'));source='argument';}
    if(v>=4){ss=[A('grid',grid),rowReference('argument','grid',0)];source='argument';}
    ss.push(returnedReference('other',source,v%2===1));output=referenceEqual(v>=4?'argument':'values','other');
  }
  if(model===5){const replacement=values.map(x=>x+2);if(v===5)replacement[0]=2;const body=[A('p',replacement,false)],at=index(v,body,replacement,'p');ss.push(call('change','values',body,R('p',at),'result'));output=V('result');}
  if(model===7){
    ss.push(F('middle','values'),F('other','middle'));
    if(v===1)ss.push(A('middle',values.map(x=>x+1),false));
    if(v===2)ss.push(A('other',values.map(x=>x+1),false));
    if(v===3)ss.push(returnedReference('returned','other',true));
    if(v===4)ss.push(returnedReference('returned','other',false));
    if(v===5)ss.push(F('saved','other'),A('values',values.map(x=>x+1),false));
    output=referenceEqual(v===1?'middle':'values',v===3||v===4?'returned':v===5?'saved':'other');
  }
  if(model===8){ss=[allocate('values',6)];const at=index(v,ss,null);output=R('values',at);}
  if(model===10){ss=[A('grid',grid),rowReference('left','grid',0)];
    if(v<4)ss.push(rowReference('right','grid',v<2?1:0));
    if(v===4)ss.push(F('right','left'),A('left',[2,3,4],false));
    if(v===5)ss.push(returnedReference('right','left',true));
    output=referenceEqual('left','right',v===1||v===3);
  }
  return {program:{statements:ss,output,objective:'value'},kind:'choice',prompt:'What does the final print statement display?',details:{},foundation:true};
}
