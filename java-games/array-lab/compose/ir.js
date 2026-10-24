// Controlled Java subset: executable syntax trees, never source-text evaluation.
import {staticSlice} from './static-slice.js';
export const lit = (value,role) => ({op:'literal',value,...(role?{role}:{})});
export const variable = name => ({op:'variable',name});
export const binary = (operator,left,right) => ({op:'binary',operator,left:expr(left),right:expr(right)});
export const read = (name,index,column) => ({op:'read',name,index:expr(index),...(column===undefined?{}:{column:expr(column)})});
export const length = (name,row) => ({op:'length',name,...(row===undefined?{}:{row:expr(row)})});
export const expr = value => typeof value==='object'?value:typeof value==='string'?variable(value):lit(value);
export const declare = (name,value,type='int') => ({op:'declare',name,type,value:expr(value)});
export const array = (name,values,declare=true,defaulted=false) => ({op:'array',name,values,declare,defaulted});
export const allocate = (name,size,type='int',state='allocated') => ({op:'allocate',name,size:expr(size),type,state});
export const alias = (name,source,declare=true) => ({op:'reference',name,source,declare});
export const assign = (name,value,index,column) => ({op:'assign',name,value:expr(value),...(index===undefined?{}:{index:expr(index)}),...(column===undefined?{}:{column:expr(column)})});
export const branch = (condition,yes,no=[]) => ({op:'if',condition:expr(condition),yes,no});
export const loop = (name,start,condition,step,body) => ({op:'loop',name,start:expr(start),condition:expr(condition),step,body});
export const stop = {op:'break'};
export const call = (name,source,body,output,resultName) => ({op:'call',name,source,body,...(output?{output,resultName}:{} )});
export const rowReference = (name,source,row) => ({op:'row-reference',name,source,row:expr(row)});
export const returnedReference = (name,source,copy=false) => ({op:'returned-reference',name,source,copy});
export const referenceEqual = (left,right,not=false) => ({op:'reference-equal',left,right,not});
export const arrayResult = name => ({op:'array-result',name});
export const gridResult = name => ({op:'grid-result',name});
export const rowResult = (name,row) => ({op:'row-result',name,row:expr(row)});
// Assessment projections are not extra arithmetic students must perform.
export const cellIndex = (name,index,column) => ({op:'cell-index',name,index:expr(index),...(column===undefined?{}:{column:expr(column)})});
export const cellPair = (name,left,right) => ({op:'cell-pair',name,left:expr(left),right:expr(right)});
export function javaExpression(e) {
  if(e.op==='cell-index')return e.column?`(${javaExpression(e.index)} * 100 + ${javaExpression(e.column)})`:javaExpression(e.index);
  if(e.op==='cell-pair')return `(${javaExpression(e.left)} * 100 + ${javaExpression(e.right)})`;
  if(e.op==='array-result')return `java.util.Arrays.toString(${e.name})`;
  if(e.op==='grid-result')return `java.util.Arrays.deepToString(${e.name})`;
  if(e.op==='row-result')return `java.util.Arrays.toString(${e.name}[${javaExpression(e.row)}])`;
  if(e.op==='reference-equal')return `(${e.left} ${e.not?'!=':'=='} ${e.right})`;
  if(e.op==='literal')return typeof e.value==='string'?JSON.stringify(e.value):String(e.value);
  if(e.op==='variable')return e.name;
  if(e.op==='length')return `${e.name}${e.row?`[${javaExpression(e.row)}]`:''}.length`;
  if(e.op==='read')return `${e.name}[${javaExpression(e.index)}]${e.column?`[${javaExpression(e.column)}]`:''}`;
  return `(${javaExpression(e.left)} ${e.operator} ${javaExpression(e.right)})`;
}
export function javaStatements(statements,indent=0) {
  const pad='    '.repeat(indent),lines=[];
  for(const s of statements){
    if(s.op==='allocate')lines.push(`${pad}${s.type}[] ${s.name}${s.state==='uninitialized'?'':` = ${s.state==='null'?'null':`new ${s.type}[${javaExpression(s.size)}]`}`};`);
    if(s.op==='array'){const grid=Array.isArray(s.values[0]);lines.push(`${pad}${s.declare?`int${grid?'[][]':'[]'} `:''}${s.name} = ${s.defaulted?`new int[${s.values.length}]`:s.declare?'':`new int${grid?'[][]':'[]'}`}${s.defaulted?'':grid?`{\n${s.values.map(r=>`${pad}    {${r.join(', ')}}`).join(',\n')}\n${pad}}`:`{${s.values.join(', ')}}`};`);}
    if(s.op==='declare')lines.push(`${pad}${s.type} ${s.name} = ${javaExpression(s.value)};`);
    if(s.op==='reference')lines.push(`${pad}${s.declare?'int[] ':''}${s.name} = ${s.source};`);
    if(s.op==='row-reference')lines.push(`${pad}int[] ${s.name} = ${s.source}[${javaExpression(s.row)}];`);
    if(s.op==='returned-reference')lines.push(`${pad}int[] ${s.name} = ${s.copy?'copyArray':'sameArray'}(${s.source});`);
    if(s.op==='assign')lines.push(`${pad}${s.name}${s.index?`[${javaExpression(s.index)}]`:''}${s.column?`[${javaExpression(s.column)}]`:''} = ${javaExpression(s.value)};`);
    if(s.op==='if'){lines.push(`${pad}if (${javaExpression(s.condition)}) {`,javaStatements(s.yes,indent+1),`${pad}}${s.no.length?' else {':''}`);if(s.no.length)lines.push(javaStatements(s.no,indent+1),`${pad}}`);}
    if(s.op==='loop')lines.push(`${pad}for (int ${s.name} = ${javaExpression(s.start)}; ${javaExpression(s.condition)}; ${s.name} ${s.step>0?'+=':'-='} ${Math.abs(s.step)}) {`,javaStatements(s.body,indent+1),`${pad}}`);
    if(s.op==='break')lines.push(`${pad}break;`);
    if(s.op==='call')lines.push(`${pad}${s.output?`int ${s.resultName} = `:''}${s.name}(${s.source});`);
  }return lines.join('\n');
}
export function javaMethods(statements){return [...new Set(statements.flatMap(s=>s.op==='call'?[`static ${s.output?'int':'void'} ${s.name}(int[] p) {\n${javaStatements(s.body,1)}${s.output?`\n    return ${javaExpression(s.output)};`:''}\n}`]:s.op==='returned-reference'?[`static int[] ${s.copy?'copyArray':'sameArray'}(int[] p) {\n    return ${s.copy?'p.clone()':'p'};\n}`]:s.op==='loop'?javaMethods(s.body):s.op==='if'?[...javaMethods(s.yes),...javaMethods(s.no)]:[]).filter(Boolean))].join('\n\n');}
// Concrete execution records dependency edges, including control dependencies.
export function execute(program){
  const env={},heap=new Map(),events=[],versions=new Map(),locations=new WeakMap(),types=new Map();let object=0,iterations=0;
  const statementIds=new WeakMap();let nextStatement=0,activeStatement=-1,lastBreak=-1;function register(list){for(const s of list){statementIds.set(s,nextStatement++);if(s.body)register(s.body);if(s.yes)register(s.yes);if(s.no)register(s.no);}}register(program.statements);
  const refs=new Map(),control=[];let continuationDependencies=[];
  const dependencies=(...parts)=>new Set([...control.flat(),...parts.flatMap(p=>p instanceof Set?[...p]:p)]);
  const fail=(message,deps)=>{const error=new Error(message);error.reasoningDependencies=[...deps];throw error;};
  const event=(kind,key,value,deps,concept)=>{const id=events.length;events.push({id,statement:activeStatement,kind,key,value:structuredClone(value),dependencies:[...dependencies(deps)],concept});versions.set(key,id);return id;};
  function evaluate(e){
    if(e.op==='cell-index'){const i=evaluate(e.index),c=e.column?evaluate(e.column):null;return {value:c?i.value*100+c.value:i.value,deps:dependencies(i.deps,c?.deps||[],[versions.get(e.name)])};}
    if(e.op==='cell-pair'){const a=evaluate(e.left),b=evaluate(e.right);return {value:a.value*100+b.value,deps:dependencies(a.deps,b.deps,[versions.get(e.name)])};}
    if(e.op==='array-result'){const a=heap.get(refs.get(e.name));return {value:`[${a.join(', ')}]`,deps:dependencies([versions.get(e.name)],a.map((_,i)=>versions.get(`${locations.get(a)}${i}`)))};}
    if(e.op==='grid-result'){const a=heap.get(refs.get(e.name));return {value:`[${a.map(row=>`[${row.join(', ')}]`).join(', ')}]`,deps:dependencies([versions.get(e.name)],a.flatMap((row,r)=>row.map((_,c)=>versions.get(`${locations.get(a)}${r},${c}`))))};}
    if(e.op==='row-result'){const row=evaluate(e.row),a=heap.get(refs.get(e.name));return {value:`[${a[row.value].join(', ')}]`,deps:dependencies(row.deps,[versions.get(e.name)],a[row.value].map((_,c)=>versions.get(`${locations.get(a)}${row.value},${c}`)))};}
    if(e.op==='reference-equal'){if([e.left,e.right].some(name=>!refs.has(name)||refs.get(name)==='uninitialized'))fail('Compile-time error',dependencies([versions.get(e.left),versions.get(e.right)]));const objectFor=name=>refs.get(name)===null?null:heap.get(refs.get(name)),same=objectFor(e.left)===objectFor(e.right);return {value:e.not?!same:same,deps:dependencies([versions.get(e.left),versions.get(e.right)])};}
    if(e.op==='literal')return {value:e.value,deps:new Set()};
    if(e.op==='variable'){return {value:env[e.name],deps:new Set(versions.has(e.name)?[versions.get(e.name)]:[])};}
    const ref=refs.get(e.name),refDep=versions.has(e.name)?[versions.get(e.name)]:[];
    if(['length','read'].includes(e.op)&&!heap.has(ref))fail(ref==='uninitialized'?'Compile-time error':'NullPointerException',dependencies(refDep));
    if(e.op==='length'){const row=e.row?evaluate(e.row):null;const a=heap.get(ref);if(row&&(!Number.isInteger(row.value)||row.value<0||row.value>=a.length))fail('ArrayIndexOutOfBoundsException',dependencies(refDep,row.deps));return {value:(row?a[row.value]:a).length,deps:dependencies(refDep,row?.deps||[]),safety:dependencies(refDep,row?.deps||[])};}
    if(e.op==='read'){const i=evaluate(e.index),c=e.column?evaluate(e.column):null,a=heap.get(ref);if(!Number.isInteger(i.value)||i.value<0||i.value>=a.length||(c&&(!Number.isInteger(c.value)||c.value<0||c.value>=a[i.value].length)))fail('ArrayIndexOutOfBoundsException',dependencies(refDep,i.deps,c?.deps||[]));const key=`${locations.get(a)}${i.value}${c?','+c.value:''}`;return {value:c?a[i.value][c.value]:a[i.value],javaType:types.get(ref),deps:dependencies(refDep,i.deps,c?.deps||[],versions.has(key)?[versions.get(key)]:[]),safety:dependencies(refDep,i.deps,c?.deps||[])};}
    const a=evaluate(e.left);
    if(e.operator==='&&'&&!a.value||e.operator==='||'&&a.value)return {value:a.value,deps:a.deps,safety:a.safety};
    const b=evaluate(e.right);if(['/','%'].includes(e.operator)&&b.value===0)fail('ArithmeticException',dependencies(b.deps,a.safety||[]));
    const operators={'+':()=>typeof a.value==='string'||typeof b.value==='string'?String(a.value)+String(b.value):(a.value+b.value)|0,'-':()=>(a.value-b.value)|0,'*':()=>Math.imul(a.value,b.value),'/':()=>Math.trunc(a.value/b.value)|0,'%':()=>a.value%b.value,'<':()=>a.value<b.value,'>':()=>a.value>b.value,'<=':()=>a.value<=b.value,'>=':()=>a.value>=b.value,'==':()=>a.value===b.value,'!=':()=>a.value!==b.value,'&&':()=>a.value&&b.value,'||':()=>a.value||b.value};
    const deps=e.operator==='*'&&a.value===0?dependencies(a.deps,b.safety||[]):e.operator==='*'&&b.value===0?dependencies(b.deps,a.safety||[]):dependencies(a.deps,b.deps);return {value:operators[e.operator](),deps,safety:dependencies(a.safety||[],b.safety||[])};
  }
  function scalarWrites(list,result=new Set()){for(const s of list){if(s.op==='assign'&&!s.index)result.add(s.name);if(s.body)scalarWrites(s.body,result);if(s.yes)scalarWrites(s.yes,result);if(s.no)scalarWrites(s.no,result);}return result;}
  const canBreak=list=>list.some(s=>s.op==='break'||s.op==='if'&&(canBreak(s.yes)||canBreak(s.no)));
  function run(statements){const scopeDepth=control.length;try{for(const s of statements){activeStatement=statementIds.get(s);
    if(s.op==='allocate'){
      if(s.state!=='allocated'){refs.set(s.name,s.state==='uninitialized'?'uninitialized':null);event('reference',s.name,refs.get(s.name),[],s.state==='uninitialized'?'definite assignment':'null reference');continue;}
      const size=evaluate(s.size);event('allocation-size',s.name,size.value,size.deps,'allocation size');
      if(size.value<0)fail('NegativeArraySizeException',dependencies(size.deps,[versions.get(s.name)]));if(size.value>100)fail('Allocation limit',size.deps);
      const id=object++,data=Array(size.value).fill(s.type==='boolean'?false:s.type==='String'?null:0);types.set(id,s.type);heap.set(id,data);locations.set(data,`#${id}:`);refs.set(s.name,id);const allocation=event('allocation',s.name,id,size.deps,'default values');data.forEach((x,i)=>event('initial',`#${id}:${i}`,x,[allocation],'default values'));
    }
    if(s.op==='array'){const id=object++,data=structuredClone(s.values);heap.set(id,data);locations.set(data,`#${id}:`);data.forEach((row,r)=>{if(Array.isArray(row))locations.set(row,`#${id}:${r},`);});refs.set(s.name,id);event('allocation',s.name,id,[],s.declare?'allocation':'reassignment');s.values.forEach((v,i)=>Array.isArray(v)?v.forEach((x,c)=>event('initial',`#${id}:${i},${c}`,x,[],'array')):event('initial',`#${id}:${i}`,v,[],'array'));}
    if(s.op==='reference'){const id=refs.get(s.source);refs.set(s.name,id);event('reference',s.name,id,[versions.get(s.source)],s.declare?'aliasing':'reassignment');}
    if(s.op==='row-reference'){const row=evaluate(s.row),data=heap.get(refs.get(s.source))[row.value],id=object++;heap.set(id,data);refs.set(s.name,id);event('reference',s.name,id,dependencies(row.deps,[versions.get(s.source)]),'row alias');}
    if(s.op==='returned-reference'){let id=refs.get(s.source);if(s.copy){const previous=heap.get(id),data=structuredClone(previous);id=object++;heap.set(id,data);locations.set(data,`#${id}:`);data.forEach((x,i)=>event('initial',`#${id}:${i}`,x,[versions.get(`${locations.get(previous)}${i}`)],'copy'));}refs.set(s.name,id);event('reference',s.name,id,[versions.get(s.source)],s.copy?'independent copy':'returned alias');}
    if(s.op==='declare'||s.op==='assign'){const v=evaluate(s.value);if(s.index){const i=evaluate(s.index),c=s.column?evaluate(s.column):null,id=refs.get(s.name),a=heap.get(id);if(i.value<0||i.value>=a.length||(c&&(c.value<0||c.value>=a[i.value].length)))throw new Error('ArrayIndexOutOfBoundsException');if(c)a[i.value][c.value]=v.value;else a[i.value]=v.value;event('mutation',`${locations.get(a)}${i.value}${c?','+c.value:''}`,v.value,dependencies(v.deps,i.deps,c?.deps||[],[versions.get(s.name)]),'mutation');}else{env[s.name]=v.value;event('scalar',s.name,v.value,v.deps,s.type==='boolean'?'condition':'arithmetic');}}
    if(s.op==='if'){const c=evaluate(s.condition),id=event('branch','?',c.value,c.deps,'selection');control.push([id]);const broke=run(c.value?s.yes:s.no),branchContinuations=continuationDependencies;control.pop();activeStatement=statementIds.get(s);const unwritten=new Set();function guarded(list){for(const action of list){if(action.op==='assign'&&!action.index&&Object.hasOwn(env,action.name))unwritten.add(action.name);if(action.yes)guarded(action.yes);if(action.no)guarded(action.no);}}guarded(c.value?s.no:s.yes);for(const name of unwritten)event('guarded-state',name,env[name],[id,versions.get(name)],'selection');function guardedArrays(list){for(const action of list){if(action.op==='assign'&&action.index){try{const index=evaluate(action.index),col=action.column?evaluate(action.column):null,data=heap.get(refs.get(action.name));if(data&&Number.isInteger(index.value)&&index.value>=0&&index.value<data.length&&(!col||col.value>=0&&col.value<data[index.value].length)){const key=locations.get(data)+index.value+(col?','+col.value:'');event('guarded-array',key,col?data[index.value][col.value]:data[index.value],[id,versions.get(key)],'selection');}}catch{}}if(action.yes)guardedArrays(action.yes);if(action.no)guardedArrays(action.no);}}guardedArrays(c.value?s.no:s.yes);if(broke)return true;if(canBreak(s.yes)||canBreak(s.no))control.push([id,...branchContinuations]);}
    if(s.op==='loop'){const init=evaluate(s.start);env[s.name]=init.value;event('loop-index',s.name,init.value,init.deps,'iteration');while(true){activeStatement=statementIds.get(s);if(++iterations>1000)throw new Error('Execution limit');const c=evaluate(s.condition);if(!c.value)break;const id=event('loop-test','?',true,c.deps,'iteration');control.push([id]);const broke=run(s.body),bodyContinuations=continuationDependencies;control.pop();if(broke){activeStatement=statementIds.get(s);for(const name of scalarWrites(s.body)){if(Object.hasOwn(env,name))event('termination-state',name,env[name],[lastBreak,versions.get(name)],'early termination');}break;}env[s.name]+=s.step;activeStatement=statementIds.get(s);event('loop-index',s.name,env[s.name],[versions.get(s.name),...bodyContinuations],'iteration');}}
    if(s.op==='break'){lastBreak=event('break','?',true,[],'early termination');return true;}
    if(s.op==='call'){const old=refs.get('p'),id=refs.get(s.source);refs.set('p',id);event('parameter','p',id,[versions.get(s.source)],'method parameter');run(s.body);activeStatement=statementIds.get(s);if(s.output){const value=evaluate(s.output);env[s.resultName]=value.value;event('scalar',s.resultName,value.value,value.deps,'method return');}event('parameter-return','return:'+s.source,id,[versions.get(s.source)],'pass by value');if(old===undefined)refs.delete('p');else refs.set('p',old);}
  }return false;}finally{continuationDependencies=control.slice(scopeDepth).flat();control.length=scopeDepth;}}
  let output,error;try{run(program.statements);activeStatement=-1;output=evaluate(program.output);if(output.javaType==='double'&&Number.isInteger(output.value))output.value=output.value.toFixed(1);}catch(e){error=e.message;output={value:error,deps:new Set(e.reasoningDependencies|| (events.length?[events.length-1]:[]))};}
  const relevant=new Set();function visit(id){if(id==null||relevant.has(id))return;relevant.add(id);events[id]?.dependencies.forEach(visit);}output.deps.forEach(visit);
  const slice=events.filter(e=>relevant.has(e.id)),depth=new Map(),stagePaths=new Map();
  for(const e of slice){
    depth.set(e.id,1+Math.max(0,...e.dependencies.map(d=>depth.get(d)||0)));
    const predecessors=e.dependencies.map(d=>stagePaths.get(d)||new Set()).sort((a,b)=>b.size-a.size);
    const path=new Set(predecessors[0]||[]);
    // A loop iteration repeats a reasoning stage; array length cannot promote
    // the level by increasing the number of concrete execution events.
    if(e.statement>=0&&!['initial','allocation'].includes(e.kind))path.add(e.statement);
    stagePaths.set(e.id,path);
  }
  const relevantStatements=new Set(slice.map(e=>e.statement));if(error)relevantStatements.add(activeStatement);
  return {answer:output.value,error,events,slice,statementIds,relevantStatements,depth:Math.max(0,...depth.values()),structuralDepth:Math.max(0,...[...stagePaths.values()].map(s=>s.size)),controlFlowStages:new Set(slice.filter(e=>['branch','loop-test'].includes(e.kind)).map(e=>e.statement)).size,states:Object.fromEntries([...refs].map(([name,id])=>[name,structuredClone(heap.get(id)??null)])),concepts:[...new Set(slice.map(e=>e.concept))],relevantOperations:new Set(slice.filter(e=>!['initial','allocation','loop-index','loop-test'].includes(e.kind)).map(e=>e.statement)).size};
}
// Literal data and names are normalized; model/difficulty labels never enter the key.
export function canonical(program){
  const names=new Map(),slots=new Map();const name=n=>{if(!names.has(n))names.set(n,`v${names.size}`);return names.get(n);};
  // Preserve equality between cell locations, without treating the literal
  // index itself as variety. Reading the mutated cell differs from reading an
  // independent source cell, even when both indices are literal numbers.
  const index=x=>{if(x.op!=='literal'||x.role)return e(x);if(!slots.has(x.value))slots.set(x.value,`slot${slots.size}`);return ['index',slots.get(x.value)];};
  function e(x){if(x.op==='cell-index')return ['cell-index',name(x.name),index(x.index),x.column?index(x.column):null];if(x.op==='cell-pair')return ['cell-pair',name(x.name),index(x.left),index(x.right)];if(['array-result','grid-result'].includes(x.op))return [x.op,name(x.name)];if(x.op==='row-result')return ['row-result',name(x.name),index(x.row)];if(x.op==='reference-equal')return [x.not?'reference-not-equal':'reference-equal',name(x.left),name(x.right)];if(x.op==='literal')return ['constant',typeof x.value,x.role||null];if(x.op==='variable')return ['var',name(x.name)];if(x.op==='binary')return [x.operator,e(x.left),e(x.right)];if(x.op==='read')return ['read',name(x.name),index(x.index),x.column?index(x.column):null];return ['length',name(x.name),x.row?index(x.row):null];}
  const selected=staticSlice(program),needed=s=>selected.has(s);
  function ss(list){return list.filter(needed).map(s=>s.op==='allocate'?['new-array',name(s.name),s.type,s.state,e(s.size)]:s.op==='array'?['allocate',name(s.name),Array.isArray(s.values[0])?'2d':'1d',s.declare,s.defaulted]:s.op==='row-reference'?['row-alias',name(s.name),name(s.source),index(s.row)]:s.op==='returned-reference'?['return-reference',name(s.name),name(s.source),s.copy]:s.op==='reference'?['reference',name(s.name),name(s.source),s.declare]:s.op==='declare'||s.op==='assign'?[s.op,name(s.name),s.index?index(s.index):null,s.column?index(s.column):null,e(s.value)]:s.op==='if'?['if',e(s.condition),ss(s.yes),ss(s.no)]:s.op==='loop'?['loop',name(s.name),e(s.start),e(s.condition),Math.sign(s.step),Math.abs(s.step)===1?'every':'stride',ss(s.body)]:s.op==='call'?['call',name(s.source),ss(s.body),s.output?e(s.output):null,s.resultName?name(s.resultName):null]:['break']);}
  return JSON.stringify([ss(program.statements),e(program.output),program.objective]);
}
