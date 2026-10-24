import {array as A,read as R,length as L,variable as V,lit,binary as B,declare as D,assign as S,branch as If,loop as For,alias,arrayResult} from './ir.js';
import {foundationalReferences} from './foundation-references.js';

const transform=(left,right,v)=>[B('+',left,right),B('-',left,right),B('*',left,right),B('/',left,right),B('%',left,right),B('+',left,L('values'))][v];
function index(v,ss,values){
  if(v===3){ss.push(D('selected',2));return V('selected');}
  if(v===4){ss.push(A('positions',[3,2,4]));return R('positions',1);}
  if(v===5){values[1]=1+Math.abs(values[1])%4;return R('values',1);}
  return [lit(2),B('-',L('values'),1),B('/',L('values'),2)][v];
}
export function foundationalPrediction(model,variant,values){
  if(model===9)return {...foundationalReferences(1,variant,values,[]),prompt:'Would changing other[0] also change values[0]?'};
  const v=variant%6;for(let i=0;i<values.length;i++)values[i]=1+Math.abs(values[i])%7;
  const ss=[A('values',values)];let output=R('values',0);
  if(model===0){const value=v===5?B('/',B('+',R('values',1),R('values',2)),2):transform(R('values',1),R('values',2),v);ss.push(S('values',value,0));}
  if(model===1)ss.push(S('values',transform(R('values',0),R('values',1),v),0));
  if(model===2){const at=index(v,ss,values);ss.push(D('target',at),S('values',B(v%2?'-':'+',R('values',V('target')),1),V('target')));output=arrayResult('values');}
  if(model===3){const at=index(v,ss,values);ss.push(S('values',B('+',R('values',0),2),at));output=arrayResult('values');}
  if(model===4){const at=index(v,ss,values);ss.push(S('values',B('+',R('values',at),2),0));}
  if(model===5){ss.push(S('values',B('+',R('values',0),R('values',1)),0),S('values',transform(R('values',2),lit(2),v),2));output=arrayResult('values');}
  if(model===6){const at=index(v,ss,values);ss.push(D('target',at),D('saved',R('values',0)),S('values',R('values',V('target')),0),S('values',V('saved'),V('target')));output=arrayResult('values');}
  if(model===7)ss.push(If(B(['>','<','>=','<=','==','!='][v],R('values',0),R('values',1)),[S('values',B('+',R('values',0),2),0)]));
  if(model===8){ss.push(For('i',0,B('<',V('i'),L('values')),1,[S('values',transform(R('values',V('i')),lit(2),v),V('i'))]));output=arrayResult('values');}
  if(model===9)ss.push(alias('other','values'),S('other',transform(R('other',0),R('values',1),v),0));
  return {program:{statements:ss,output,objective:output.op==='array-result'?'array':'value'},kind:'choice',prompt:output.op==='array-result'?'What are the complete contents of values after the code executes?':'What does the final print statement display?',details:{},foundation:true};
}
