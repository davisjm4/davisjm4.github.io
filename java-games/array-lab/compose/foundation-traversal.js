import {array as A,read as R,length as L,variable as V,lit,binary as B,declare as D,assign as S,branch as If,loop as For,arrayResult} from './ir.js';
const plus=(a,b)=>B('+',a,b),minus=(a,b)=>B('-',a,b);
function scan(form,body,direction=0){
  let start=lit(0,'first'),end=L('values'),step=1;
  if(direction===0){if(form===1||form===3){start=minus(L('values'),1);end=lit(0,'first');step=form===3?-2:-1;}if(form===2)step=2;if(form===4)start=lit(1,'after-first');if(form===5)end=minus(L('values'),1);}
  if(direction===1){if([1,4,5].includes(form))start=lit(1,'after-first');if([2,5].includes(form))end=minus(L('values'),1);if([3,4].includes(form))step=2;}
  if(direction===-1){start=minus(L('values'),lit([1,4,5].includes(form)?2:1,[1,4,5].includes(form)?'before-last':'last-offset'));end=lit([2,5].includes(form)?1:0,[2,5].includes(form)?'after-first':'first');step=[3,4].includes(form)?-2:-1;}
  return For('i',start,B(step<0?'>=':'<',V('i'),end),step,body);
}
export function foundationalTraversal(model,variant,values){
  const v=variant%6,ss=[A('values',values)],cell=R('values',V('i'));let output=V('result'),body=[],loop;
  ss.push(D('result',model===3?R('values',0):0));
  if(model===0||model===6||model===7)body=[S('result',plus(V('result'),cell))];
  if(model===1||model===2)body=[If(B(model===1?'>':'<',cell,0),[S('result',plus(V('result'),model===2?1:cell))])];
  if(model===3)body=[If(B(v%2?'>':'<',cell,V('result')),[S('result',cell)])];
  if(model===4||model===5)body=[S('result',minus(cell,V('result')))];
  if(model===8){const update=[plus(cell,2),minus(cell,2),B('*',cell,2),B('/',cell,2),B('%',cell,3),minus(0,cell)][v];body=[S('values',update,V('i'))];output=arrayResult('values');ss.pop();loop=scan(0,body);}
  if(model===9){values[0]=2+Math.abs(values[0])%2;const a=R('values',0),b=R('values',1),update=[plus(b,a),minus(b,a),B('*',b,a),B('/',b,a),B('%',b,a),minus(a,b)][v];ss.pop();ss.push(S('values',update,1));output=arrayResult('values');}
  if(model===10)body=[S('result',plus(V('result'),B('*',V('i'),cell)))];
  if(model===6){const starts=[lit(1,'after-first'),lit(0,'first'),lit(1,'after-first'),lit(0,'first'),minus(L('values'),1),lit(1,'after-first')],ends=[L('values'),minus(L('values'),1),minus(L('values'),1),lit(1,'after-first'),L('values'),minus(L('values'),1)];loop=For('i',starts[v],B('<',V('i'),ends[v]),v===5?2:1,body);}
  if(model===7){const reverse=v===2||v===3||v===5,start=reverse?minus(L('values'),lit(v===3?2:1,v===3?'before-last':'last-offset')):lit(v===1||v===4?1:0,v===1||v===4?'after-first':'first'),end=reverse?lit(v===5?1:0,v===5?'after-first':'first'):v===4?minus(L('values'),1):L('values');loop=For('i',start,B(reverse?'>=':'<',V('i'),end),reverse?-2:2,body);}
  if(model!==9)ss.push(loop||scan(v,body,model===4?1:model===5?-1:0));
  return {program:{statements:ss,output,objective:output.op==='array-result'?'array':'value'},kind:'choice',prompt:output.op==='array-result'?'What are the complete contents of values after the code executes?':'What does the final print statement display?',details:{},foundation:true};
}
