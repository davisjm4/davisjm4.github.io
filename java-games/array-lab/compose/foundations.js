import {lit,variable as V,binary as B,read as R,length as L,declare as D,array as A,assign as S,branch as If,loop as For,rowReference,rowResult,arrayResult,cellIndex,cellPair,stop} from './ir.js';

const add=(a,b)=>B('+',a,b),sub=(a,b)=>B('-',a,b),mul=(a,b)=>B('*',a,b),div=(a,b)=>B('/',a,b),rem=(a,b)=>B('%',a,b);
const comparisons=['>','<','>=','<=','==','!='];
const small=(basis,v)=>[
  basis,add(basis,1),sub(4,basis),mul(basis,2),div(add(basis,2),2),rem(basis,2),
][v];

// These recipes construct a valid small index rather than wrapping an arbitrary
// expression repeatedly in %. A recipe has at most two meaningful calculations.
function indexRecipe(profile,v,statements,values){
  const n=values.length;
  if(profile===0){
    return [lit(2),add(1,2),sub(4,1),mul(2,2),div(4,2),rem(5,3)][v];
  }
  if(profile===1){
    const inputs=[[1,2],[4,1],[2,2],[4,2],[4,3],[1,1]][v];
    statements.push(D('left',inputs[0]),D('right',inputs[1]));
    return [add(V('left'),V('right')),sub(V('left'),V('right')),mul(V('left'),V('right')),div(V('left'),V('right')),rem(V('left'),V('right')),add(V('left'),mul(V('right'),2))][v];
  }
  if(profile===2){
    if(v===5)statements.push(D('distance',2));
    return [sub(L('values'),1),div(L('values'),2),div(sub(L('values'),1),2),rem(L('values'),4),div(add(L('values'),1),2),sub(L('values'),V('distance'))][v];
  }
  if(profile===3){
    values[0]=1+Math.abs(values[0])%3;
    let offset;
    if(v===0)offset=lit(2);
    if(v===1){statements.push(D('distance',2));offset=V('distance');}
    if(v===2)offset=R('values',0);
    if(v===3){statements.push(A('positions',[2,1,3]));offset=R('positions',0);}
    if(v===4){statements.push(A('positions',[1,2,3]));offset=L('positions');}
    if(v===5){statements.push(D('distance',1));offset=add(V('distance'),1);}
    return sub(L('values'),offset);
  }
  if(profile===4){
    if(v===2){statements.push(D('index',L('values')),S('index',sub(V('index'),1)));return V('index');}
    const e=[lit(2),add(1,2),sub(L('values'),1),div(L('values'),2),rem(5,3),mul(2,2)][v];
    statements.push(D('index',e));return V('index');
  }
  if(profile===5){
    const initial=[1,4,2,4,5,2][v];statements.push(D('index',initial));
    const next=[add(V('index'),1),sub(V('index'),1),mul(V('index'),2),div(V('index'),2),rem(V('index'),3),sub(L('values'),V('index'))][v];
    statements.push(S('index',next));return V('index');
  }
  if(profile===6){
    statements.push(D('index',0),If(B(comparisons[v],R('values',0),R('values',1)),[S('index',2)],[S('index',4)]));return V('index');
  }
  if(profile===7){
    statements.push(A('positions',[1,2,3]));
    if(v===1)statements.push(D('slot',1));
    const selector=[lit(0),V('slot'),R('positions',0),add(-1,2),sub(L('positions'),1),sub(2,1)][v];
    return R('positions',selector);
  }
  if(profile===8){values[0]=1+Math.abs(values[0])%2;return small(R('values',0),v);}
  if(profile===9){
    if(v===2)statements.push(D('index',L('values')));
    if(v===3)statements.push(D('index',0),S('index',sub(V('index'),1)));
    return [L('values'),sub(0,1),V('index'),V('index'),add(L('values'),1),sub(0,L('values'))][v];
  }
  // A count from one straightforward loop becomes the selected index. Six
  // routes change the visited indices or stopping condition, not the data size.
  if(profile===10){
    statements.push(D('count',v===1||v===3?-1:v===5?L('values'):0));
    let start=lit(0,'first'),condition=B('<',V('i'),L('values')),step=1,body=[S('count',add(V('count'),1))];
    if(v===1){start=sub(L('values'),1);condition=B('>=',V('i'),lit(0,'first'));step=-1;}
    if(v===2)start=lit(1,'after-first');
    if(v===3)condition=B('<',V('i'),sub(L('values'),1));
    if(v===4)step=2;
    if(v===5){start=lit(1,'after-first');body=[S('count',sub(V('count'),1))];}
    statements.push(For('i',start,condition,step,body));return v===1||v===3||v===5?V('count'):sub(V('count'),1);
  }
  throw Error('Unknown foundational index recipe');
}

export function foundationQuestion(mode,model,variant,values,grid){
  const v=variant%6,representation=Math.floor(variant/6)%2;
  if(mode==='element'||mode==='perform-update'){
    const statements=[A('values',values)];
    const profiles=mode==='element'?[0,1,2,3,4,5,6,7,8,9]:[1,2,0,8,4,5,3,6,10,7];
    let index=indexRecipe(profiles[model],v,statements,values);
    // A stored index is a meaningful alternative to an inline index; it adds
    // one named state to track, without adding unrelated arithmetic.
    if(representation&&![0,2,4,5,6,9].includes(profiles[model])){statements.push(D('selected',index));index=V('selected');}
    if(mode==='element'&&model===9)return {program:{statements,output:R('values',index),objective:'value'},kind:'choice',prompt:'What happens when the final print statement executes?',details:{},foundation:true};
    if(mode==='element')return {program:{statements,output:cellIndex('values',index),objective:'cell'},kind:'cell',prompt:'Select the cell read by the final print statement.',details:{access:R('values',index)},foundation:true};
    if(model===6){
      statements.push(D('target',index),D('temp',R('values',V('target'))),S('values',R('values',0),V('target')),S('values',V('temp'),0));
      return {program:{statements,output:cellPair('values',V('target'),0),objective:'pair'},kind:'swap',prompt:'Select the two cells exchanged by the final three assignments.',details:{},foundation:true};
    }
    statements.push(D('target',index));
    const rhs=model===3?R('values',0):model===5?add(R('values',V('target')),1):add(R('values',V('target')),2);
    statements.push(S('values',rhs,V('target')));
    return {program:{statements,output:cellIndex('values',V('target')),objective:'cell'},kind:'apply',prompt:'Select the cell changed by the final assignment. Values are revealed after submission.',details:{},foundation:true};
  }

  const statements=[A('grid',grid)];let row=lit(1),col=lit(1);
  const source=()=>{grid[0][0]=1+Math.abs(grid[0][0])%2;return R('grid',0,0);};
  if(model===0)col=[lit(2),add(1,2),sub(3,1),mul(-1,-2),div(3,2),rem(3,2)][v];
  if(model===1){const e=[lit(1),add(-1,2),sub(3,1),mul(-1,-2),div(5,2),rem(5,3)][v];statements.push(D('row',e));row=V('row');}
  if(model===2){const e=[lit(1),add(1,1),sub(3,1),mul(-1,-2),div(3,2),rem(3,2)][v];statements.push(D('column',e));col=V('column');}
  if(model===3){if(v===5)statements.push(D('distance',1));row=[sub(L('grid'),1),div(L('grid'),2),div(sub(L('grid'),1),2),rem(L('grid'),2),div(add(L('grid'),1),2),sub(L('grid'),V('distance'))][v];}
  if(model===4){if(v===5)statements.push(D('distance',1));col=[sub(L('grid',row),1),div(L('grid',row),2),div(sub(L('grid',row),1),2),rem(L('grid',row),3),div(add(L('grid',row),1),2),sub(L('grid',row),V('distance'))][v];}
  if(model===5){row=lit(2);const size=L('grid',0);col=[size,add(size,1),sub(size,1),div(size,2),rem(size,2),div(add(size,L('grid',1)),2)][v];}
  if(model===6&&mode==='access-2d'||model===10){statements.push(rowReference('line','grid',row));const size=L('line');col=[sub(size,1),div(size,2),div(sub(size,1),2),rem(size,3),div(add(size,1),2),sub(size,2)][v];}
  if(model===7&&mode==='access-2d'){statements.push(D('row',0),If(B(comparisons[v],R('grid',0,0),R('grid',1,0)),[S('row',0)],[S('row',2)]));row=V('row');}
  if(model===8)col=small(source(),v);
  if(model===8&&v===3)grid[0][0]=Math.abs(grid[0][0])%2;
  if(model===9){
    const pairs=[[L('grid'),lit(0)],[sub(0,1),lit(0)],[lit(0),L('grid',0)],[lit(0),sub(0,1)],[add(L('grid'),1),lit(0)],[lit(0),add(L('grid',0),1)]];[row,col]=pairs[v];
    if(mode==='access-2d')return {program:{statements,output:R('grid',row,col),objective:'value'},kind:'choice',prompt:'What happens when the final print statement executes?',details:{},foundation:true};
    // Updating a ragged row uses that row's length, never another row's width.
    statements.push(D('lastRow',sub(L('grid'),1)));row=V('lastRow');
    if(v===3)statements.push(D('distance',2));
    col=[sub(L('grid',row),1),div(L('grid',row),2),rem(L('grid',row),3),sub(L('grid',row),V('distance')),sub(L('grid',row),L('grid',0)),rem(L('grid',row),L('grid',0))][v];
  }
  if(mode==='update-2d'&&model===4){statements.push(D('chosenRow',0),If(B(comparisons[v],R('grid',0,0),R('grid',1,0)),[S('chosenRow',0)],[S('chosenRow',2)]));row=V('chosenRow');col=lit(1);}
  if(mode==='update-2d'&&model===5){statements.push(D('chosenColumn',0),If(B(comparisons[v],R('grid',1,0),R('grid',1,1)),[S('chosenColumn',0)],[S('chosenColumn',2)]));row=lit(1);col=V('chosenColumn');}
  if(mode==='update-2d'&&model===6){
    col=[lit(2),add(1,1),sub(3,1),mul(-1,-2),div(3,2),rem(3,2)][v];statements.push(D('column',col),D('temp',R('grid',0,V('column'))),S('grid',R('grid',2,0),0,V('column')),S('grid',V('temp'),2,0));
    return {program:{statements,output:sub(R('grid',0,V('column')),R('grid',2,0)),objective:'value'},kind:'choice',prompt:'What value does the final print statement display?',details:{},foundation:true};
  }
  if(mode==='update-2d'&&model===7){
    const value=R('grid',1,V('c'));const update=[add(value,2),sub(value,2),mul(value,2),div(value,2),rem(value,3),sub(0,value)][v];statements.push(For('c',0,B('<',V('c'),L('grid',1)),1,[S('grid',update,1,V('c'))]));
    return {program:{statements,output:rowResult('grid',1),objective:'array'},kind:'choice',prompt:'What are the complete contents of grid[1] after the loop?',details:{initialArray:[...grid[1]]},foundation:true};
  }
  if(mode==='update-2d'&&model===8){
    const value=R('grid',V('r'),V('c')),update=[add(value,2),sub(value,2),mul(value,2),div(value,2),rem(value,3),sub(0,value)][v];statements.push(For('r',0,B('<',V('r'),L('grid')),1,[For('c',0,B('<',V('c'),L('grid',V('r'))),1,[S('grid',update,V('r'),V('c'))])]));
    return {program:{statements,output:R('grid',1,1),objective:'value'},kind:'choice',prompt:'What value does the final print statement display?',details:{},foundation:true};
  }
  if(representation&&![1,2,7].includes(model)){statements.push(D('row',row),D('column',col));row=V('row');col=V('column');}
  const details=mode==='access-2d'?{access:R('grid',row,col)}:{};
  if(mode==='update-2d')statements.push(S('grid',model===2?R('grid',2,0):add(R('grid',row,col),2),row,col));
  return {program:{statements,output:cellIndex('grid',row,col),objective:'coordinate'},kind:'cell-2d',prompt:mode==='access-2d'?'Select the cell read by the final print statement.':'Select the cell changed by the final assignment.',details,foundation:true};
}
