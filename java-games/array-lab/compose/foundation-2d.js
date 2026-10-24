import {array as A,read as R,length as L,variable as V,lit,binary as B,declare as D,assign as S,branch as If,loop as For,stop} from './ir.js';
const add=(a,b)=>B('+',a,b),sub=(a,b)=>B('-',a,b);
function scan(name,size,v,body){const rev=v===1||v===3,start=rev?sub(size,1):lit(v===4?1:0,v===4?'after-first':'first'),end=rev?lit(0,'first'):v===5?sub(size,1):size;return For(name,start,B(rev?'>=':'<',V(name),end),rev?(v===3?-2:-1):v===2?2:1,body);}
export function foundational2D(model,variant,grid){
  const v=variant%6;
  if(model===2)for(const row of grid)row.splice(1);
  if(model===3)grid.splice(1);
  const ss=[A('grid',grid)];let output=V('result');
  if([0,1,4,5,6].includes(model)){
    ss.push(D('result',model===4?-1:0));const column=model===0||model===4||model===5,name=column?'c':'r',size=column?L('grid',0):L('grid'),cell=model===6?R('grid',V(name),V(name)):column?R('grid',0,V(name)):R('grid',V(name),0);
    let body=[S('result',add(V('result'),cell))];
    if(model===4)body=[If(B('==',cell,grid[0][1]),[S('result',V(name)),stop])];
    if(model===5)body=[If(B(['>','<','>=','<=','==','!='][v],cell,0),[S('result',add(V('result'),cell))])];
    ss.push(scan(name,size,model===5?0:v,body));
  }
  if(model===2||model===3){const rowMode=model===2,name=rowMode?'r':'c',size=rowMode?L('grid'):L('grid',0),reverse=v===2||v===3,sentinel=v>=4,first=reverse?sub(size,1):lit(0,'first'),cell=at=>rowMode?R('grid',at,0):R('grid',0,at),comparison=rowMode?(v%2?'>=':'>'):(v%2?'<=':'<');
    ss.push(D('best',sentinel?(rowMode?-999:999):cell(first)),D('result',sentinel?-1:first));
    const start=sentinel?lit(0,'first'):reverse?sub(size,2):lit(1,'after-first');ss.push(For(name,start,B(reverse?'>=':'<',V(name),reverse?lit(0,'first'):size),reverse?-1:1,[If(B(comparison,cell(V(name)),V('best')),[S('best',cell(V(name))),S('result',V(name))])]));
  }
  if(model===7){grid[0][1]=2+Math.abs(grid[0][1])%3;const left=R('grid',0,0),right=R('grid',0,1);output=[add(left,right),sub(left,right),B('*',left,right),B('/',left,right),B('%',left,right),B('/',add(left,right),2)][v];}
  if(model===8){let col=[lit(1),sub(L('grid',0),1),B('/',L('grid',0),2),V('column'),R('grid',0,0),B('%',R('grid',0,0),L('grid',0))][v];if(v===3)ss.push(D('column',2));if(v>=4)grid[0][0]=1+Math.abs(grid[0][0])%3;
    ss.push(D('target',col),D('saved',R('grid',0,V('target'))),S('grid',R('grid',2,0),0,V('target')),S('grid',V('saved'),2,0));output=R('grid',0,V('target'));
  }
  if(model===9){ss.push(If(B(['>','<','>=','<=','==','!='][v],R('grid',0,0),R('grid',0,1)),[S('grid',add(R('grid',0,0),2),0,0)],[S('grid',sub(R('grid',0,0),2),0,0)]));output=R('grid',0,0);}
  return {program:{statements:ss,output,objective:'value'},kind:'choice',prompt:'What does the final print statement display?',details:{},foundation:true};
}
