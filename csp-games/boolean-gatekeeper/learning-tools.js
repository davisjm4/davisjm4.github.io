// Small, unscored AP CSP learning tools. No session or storage side effects.
const variable = name => ({op:'value',name});
const p=variable('p'),q=variable('q');
const and=(a,b)=>({op:'AND',a,b}),or=(a,b)=>({op:'OR',a,b}),not=a=>({op:'NOT',a});
export const TABLES = [
  {id:'and',node:and(p,q),why:'AND is TRUE only when both inputs are TRUE.'},
  {id:'or',node:or(p,q),why:'OR is TRUE when at least one input is TRUE, including when both are TRUE.'},
  {id:'not',node:not(p),why:'NOT reverses p. The value of q does not change this expression.'},
  {id:'and-not',node:and(p,not(q)),why:'First reverse q, then require p and NOT q to both be TRUE.'},
  {id:'not-group',node:not(and(p,q)),why:'Evaluate the parenthesized AND first, then reverse its whole result.'}
];
export const ROWS = [{p:false,q:false},{p:false,q:true},{p:true,q:false},{p:true,q:true}];
export function truth(node,values){
  if(node.op==='value')return !!values[node.name];
  if(node.op==='NOT')return !truth(node.a,values);
  if(node.op==='AND')return truth(node.a,values)&&truth(node.b,values);
  if(node.op==='OR')return truth(node.a,values)||truth(node.b,values);
  throw Error('Unknown Boolean operator.');
}
export function booleanText(node){
  if(node.op==='value')return node.name;
  if(node.op==='NOT')return `NOT (${booleanText(node.a)})`;
  return `(${booleanText(node.a)}) ${node.op} (${booleanText(node.b)})`;
}
// Five distinct truth functions; row changes are practice, not new reasoning families.
export function tableQuestion(index=0){const n=((index%20)+20)%20,table=TABLES[n%5],row=Math.floor(n/5);return {table,row,answer:truth(table.node,ROWS[row]),expression:booleanText(table.node)};}
export const DEFAULT_RANGE = {a:{lo:2,hi:6,loInclusive:true,hiInclusive:true},b:{lo:4,hi:8,loInclusive:true,hiInclusive:false},two:false,combine:'OR',negate:false,x:3};
export const copyDefault=()=>JSON.parse(JSON.stringify(DEFAULT_RANGE));
export function validateRangeState(s){
  if(!s||!['AND','OR'].includes(s.combine)||typeof s.two!=='boolean'||typeof s.negate!=='boolean'||!Number.isInteger(s.x)||s.x< -10||s.x>10)throw Error('Use whole numbers from −10 through 10.');
  for(const r of [s.a,s.b])if(!r||![r.lo,r.hi].every(n=>Number.isInteger(n)&&n>=-10&&n<=10)||typeof r.loInclusive!=='boolean'||typeof r.hiInclusive!=='boolean')throw Error('Use whole-number boundaries from −10 through 10.');
  return s;
}
export function contains(r,x){return (r.loInclusive?x>=r.lo:x>r.lo)&&(r.hiInclusive?x<=r.hi:x<r.hi);}
export function rangeResult(s,x=s.x){const a=contains(s.a,x),b=contains(s.b,x),base=s.two?(s.combine==='AND'?a&&b:a||b):a;return {a,b,base,result:s.negate?!base:base};}
const rangeText=r=>`(x ${r.loInclusive?'≥':'>'} ${r.lo}) AND (x ${r.hiInclusive?'≤':'<'} ${r.hi})`;
export function rangeExpression(s){validateRangeState(s);const a=rangeText(s.a),base=s.two?`(${a}) ${s.combine} (${rangeText(s.b)})`:a;return s.negate?`NOT (${base})`:base;}
// Exact continuous TRUE segments, including isolated included endpoints.
// The display is bounded to [-10,10]; the Boolean expression itself is not.
export function trueSegments(s){
  validateRangeState(s);const cuts=[...new Set([-10,10,s.a.lo,s.a.hi,...(s.two?[s.b.lo,s.b.hi]:[])])].sort((a,b)=>a-b),parts=[];
  for(let i=0;i<cuts.length-1;i++){const lo=cuts[i],hi=cuts[i+1];if(rangeResult(s,(lo+hi)/2).result)parts.push({lo,hi,loInclusive:rangeResult(s,lo).result,hiInclusive:rangeResult(s,hi).result});}
  for(const n of cuts)if(rangeResult(s,n).result&&!parts.some(r=>contains(r,n)))parts.push({lo:n,hi:n,loInclusive:true,hiInclusive:true});
  const merged=[];for(const r of parts.sort((a,b)=>a.lo-b.lo||a.hi-b.hi)){const last=merged.at(-1);if(last&&last.hi===r.lo&&(last.hiInclusive||r.loInclusive)){last.hi=r.hi;last.hiInclusive=r.hiInclusive;}else merged.push({...r});}return merged;
}
export function rangeDescription(r){if(r.lo>r.hi||r.lo===r.hi&&!(r.loInclusive&&r.hiInclusive))return 'Empty range: no value satisfies both bounds.';if(r.lo===r.hi)return `Only ${r.lo} is included.`;return `${r.lo} ${r.loInclusive?'included':'excluded'} through ${r.hi} ${r.hiInclusive?'included':'excluded'}.`;}
