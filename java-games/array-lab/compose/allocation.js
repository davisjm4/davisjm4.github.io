import {allocate,declare as D,variable as V,binary as B,read as R,length as L,lit} from './ir.js';

// Foundation-only state questions retain the original allocation topics.
// They are never promoted to harder levels by adding unrelated execution.
export function allocationQuestion(variant){
  const group=Math.floor((variant-36)/6),v=variant%6,statements=[];
  const type=['boolean','String','double','int','int','int'][group];
  let size=[lit(4),B('+',2,3),B('-',7,2),B('*',2,3),B('/',9,2),B('%',9,5)][v];
  if(v===1||v===3){statements.push(D('size',size));size=V('size');}
  if(group===3)size=B('-',0,size);
  const state=group===4?'null':group===5?'uninitialized':'allocated';
  if(group>=4){statements.length=0;size=lit(0);}
  statements.push(allocate('items',size,type,state));
  const output=group>=3&&v%2===0?L('items'):R('items',v%2?1:0);
  return {program:{statements,output,objective:'allocation-state'},kind:'choice',prompt:group<3?'What does the final print statement display?':'What happens when this code is compiled and run?',details:{},special:true};
}
