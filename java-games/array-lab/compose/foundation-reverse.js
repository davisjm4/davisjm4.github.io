import {array as A,allocate,read as R,length as L,variable as V,lit,binary as B,declare as D,assign as S,branch as If} from './ir.js';
const add=(a,b)=>B('+',a,b),sub=(a,b)=>B('-',a,b);
const arithmetic=(a,b,v)=>[add(a,b),sub(a,b),B('*',a,b),B('/',a,b),B('%',a,b),B('/',add(a,b),2)][v];
function index(v,ss,values,name='values'){
  if(v===3){ss.push(D('index',2));return V('index');}
  if(v===4){ss.push(A('positions',[2,1,3]));return R('positions',0);}
  if(v===5){if(name==='grid')values[0][0]=2;else values[0]=2;return name==='grid'?R(name,0,0):R(name,0);}
  return [lit(2),sub(L(name,name==='grid'?0:undefined),1),B('/',L(name,name==='grid'?0:undefined),2)][v];
}
export function foundationalReverse(model,variant,values,grid){
  const v=variant%6;values.forEach((n,i)=>values[i]=1+Math.abs(n)%7);
  let ss=[A('values',values)],correct,output,suffix=[],candidates=[];
  if([0,1,3,4].includes(model)){
    const selected=index(v,ss,values);ss.push(D('target',selected));
    if(model===0){correct=S('values',add(R('values',0),2),V('target'));output=R('values',V('target'));}
    if(model===1){correct=S('values',R('values',sub(L('values'),1)),V('target'));output=R('values',V('target'));}
    if(model===3){correct=S('values',R('values',V('target')),1);output=R('values',1);}
    if(model===4){correct=D('temp',R('values',V('target')));suffix=[S('values',R('values',1),V('target')),S('values',V('temp'),1)];output=R('values',1);candidates=[D('temp',R('values',1)),D('temp',0),D('temp',add(R('values',V('target')),1)),D('temp',sub(R('values',V('target')),1)),D('temp',add(R('values',V('target')),2)),D('temp',sub(R('values',V('target')),2))];}
    if(model!==4)candidates=[S('values',0,model===3?1:V('target')),S('values',add(R('values',0),3),model===3?1:V('target')),S('values',sub(R('values',0),3),model===3?1:V('target')),S('values',add(R('values',1),4),model===3?1:V('target')),S('values',sub(R('values',1),4),model===3?1:V('target'))];
  }
  if(model===2||model===5||model===8){const at=model===2?sub(L('values'),1):lit(0),left=R('values',model===8?1:at),right=R('values',model===8?2:1);correct=S('values',arithmetic(left,right,v),at);output=R('values',at);candidates=[S('values',add(left,1),at),S('values',sub(left,1),at),S('values',add(left,3),at),S('values',sub(left,3),at),S('values',B('*',left,3),at),S('values',0,at)];}
  if(model===6){ss=[A('grid',grid)];const col=index(v,ss,grid,'grid');ss.push(D('column',col));correct=S('grid',add(R('grid',1,V('column')),2),1,V('column'));output=R('grid',1,V('column'));candidates=[S('grid',0,1,V('column')),S('grid',add(R('grid',1,V('column')),1),1,V('column')),S('grid',sub(R('grid',1,V('column')),1),1,V('column')),S('grid',sub(R('grid',1,V('column')),2),1,V('column')),S('grid',add(R('grid',1,V('column')),3),1,V('column'))];}
  if(model===7){ss=[];const sizes=[lit(4),add(2,3),sub(7,2),B('*',2,3),B('/',9,2),B('%',9,5)];correct=allocate('items',sizes[v]);output=L('items');candidates=[allocate('items',1),allocate('items',2),allocate('items',3),allocate('items',7),allocate('items',8)];}
  if(model===9){const condition=B(['>','<','>=','<=','==','!='][v],R('values',0),R('values',1)),yes=S('values',add(R('values',0),2),0),no=S('values',sub(R('values',0),2),0);correct=If(condition,[yes],[no]);output=R('values',0);candidates=[If(condition,[no],[yes]),S('values',0,0),S('values',add(R('values',0),1),0),S('values',sub(R('values',0),1),0),S('values',add(R('values',0),3),0)];}
  const prefix=ss.slice();return {program:{statements:[...ss,correct,...suffix],output,objective:'statement-selection'},kind:'choice',prompt:'Choose the Java statement.',details:{missing:correct,prefix,suffix,candidates},foundation:true};
}
