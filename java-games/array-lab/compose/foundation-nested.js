import {array as A,read as R,length as L,variable as V,lit,binary as B,declare as D,assign as S,branch as If,loop as For,stop,gridResult} from './ir.js';
const add=(a,b)=>B('+',a,b),sub=(a,b)=>B('-',a,b);
function scan(name,size,v,body){const rev=v===1||v===3;return For(name,rev?sub(size,1):lit(v===4?1:0,v===4?'after-first':'first'),B(rev?'>=':'<',V(name),rev?lit(0,'first'):v===5?sub(size,1):size),rev?(v===3?-2:-1):v===2?2:1,body);}
export function foundationalNested(model,variant,grid){
  const v=variant%6;grid.splice(2);grid.forEach((row,r)=>row.splice(model===7||model===9?2+r:3));
  const ss=[A('grid',grid)],cell=R('grid',V('r'),V('c'));let output=V('result'),body=[];
  ss.push(D('result',model===0?lit(''):0,model===0?'String':'int'));
  if(model===0)body=[S('result',add(add(V('result'),cell),lit(' ')))];
  if(model===1)body=[S('result',cell)];
  if(model===2)body=[S('result',add(V('result'),1))];
  if(model===3)body=[If(B(['>','<','>=','<=','==','!='][v],cell,0),[S('result',add(V('result'),1))])];
  if(model===4)body=[S('result',add(V('result'),cell))];
  if(model===5){const conditions=[B('!=',V('r'),0),B('!=',V('c'),0),B('!=',V('r'),sub(L('grid'),1)),B('!=',V('c'),sub(L('grid',V('r')),1)),B('&&',B('!=',V('c'),0),B('!=',V('c'),sub(L('grid',V('r')),1))),B('!=',V('r'),V('c'))];body=[If(conditions[v],[S('result',add(V('result'),cell))])];}
  if(model===6)body=[If(B('<',cell,0),[stop]),S('result',add(V('result'),cell))];
  if(model===7){ss.push(scan('r',L('grid'),v,[S('result',add(V('result'),L('grid',V('r'))))]));}
  if(model===8){ss.pop();const updates=[add(cell,2),sub(cell,2),B('*',cell,2),B('/',cell,2),B('%',cell,3),sub(0,cell)];body=[S('grid',updates[v],V('r'),V('c'))];output=gridResult('grid');}
  if(model===9)body=[S('result',V('c'))];
  if(model!==7)ss.push(For('r',0,B('<',V('r'),L('grid')),1,[scan('c',L('grid',V('r')),[3,5,8].includes(model)?0:v,body)]));
  return {program:{statements:ss,output,objective:output.op==='grid-result'?'grid':'value'},kind:'choice',prompt:output.op==='grid-result'?'What are the complete contents of grid after the code executes?':'What does the final print statement display?',details:{},foundation:true};
}
