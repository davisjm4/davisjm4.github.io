/* The only program model. Versions 1 and 2 share this interpreter and renderer. */
import {checkExpression,evaluate,expressionText,validName} from './expressions.js?v=usability-v3';
export {ref,list,input,operation} from './expressions.js?v=usability-v3';
export const PARTS=['FOOT','HAND','KNEE','ELBOW','HIP','SHOULDER','HEAD'];
export const TOUCH_PARTS=['HEAD','SHOULDERS','KNEES','TOES'];
export const SIDES=['RIGHT','LEFT','CENTER'];
export const MOVES=['moveIn','moveOut','shake','turnAround','clap','bow','nod','jump','hop','wait','touch','stomp','slide','turn','crissCross','chaCha','charlieBrown'];
export const LIMB_MOVES=['moveIn','moveOut','shake'];
export const NAMES=['dance','hokey_pokey','groove','intro','finale','pose'];
export const LIMITS=Object.freeze({nodes:400,depth:12,calls:16,steps:800,work:6000,importBytes:100000,maxBeats:1000});
export const DEFAULT_BEATS={slide:2,turn:2,turnAround:2,crissCross:2,chaCha:4,charlieBrown:4};
const instance=Math.random().toString(36).slice(2,8);
let serial=0;
export const id=()=>`b${instance}_${Date.now().toString(36)}_${++serial}`;
export const blank=(version=1)=>({version,procedures:[],body:[]});
export function move(op,part='FOOT',side='RIGHT'){return {id:id(),type:'move',op,...(LIMB_MOVES.includes(op)?{part,side}:op==='touch'?{part:arguments.length>1?part:'HEAD'}:['stomp','slide','turn','chaCha'].includes(op)?{side,...(op==='turn'?{quarterTurns:1}:{})}:{})};}
export const call=(name='dance',args=['FOOT','RIGHT'])=>({id:id(),type:'call',name,args});
export const repeat=(count=3)=>({id:id(),type:'repeat',count,body:[]});
export const procedure=(name='dance',params=['part','side'])=>({id:id(),name,params:[...params],body:[]});
export const assign=(name='count',value=3)=>({id:id(),type:'assign',name,value});
export const selection=(condition=true)=>({id:id(),type:'if',condition,body:[],elseBody:[]});
export const forEach=(item='part',list='$bodyParts')=>({id:id(),type:'foreach',item,list,body:[]});
export const note=(pitch='C4',beats=1)=>({id:id(),type:'note',pitch,beats});
export const rest=(beats=1)=>({id:id(),type:'rest',beats});
export const mutation=(op='append',name='bodyParts',value='HEAD',index=1)=>({id:id(),type:'list',op,name,value,index});
export const children=n=>n.type==='if'?[n.body,n.elseBody]:['repeat','foreach'].includes(n.type)?[n.body]:[];
export function walk(program,fn){const visit=body=>body.forEach(n=>{fn(n);children(n).forEach(visit);});program.procedures.forEach(p=>{fn(p);visit(p.body);});visit(program.body);for(const t of program.tracks||[])visit(t.body);}
export function assertProgram(p){
 const fail=m=>{throw Error(m);};if(!p||![1,2].includes(p.version)||!Array.isArray(p.body)||!Array.isArray(p.procedures)||p.procedures.length>16)fail('Unsupported program format. Use an Algorithm Dance Lab export.');
 let nodes=0;const ids=new Set(),names=new Set(),exprState={count:0};
 const unique=n=>{if(!n||typeof n.id!=='string'||!/^[-\w]{1,80}$/.test(n.id)||ids.has(n.id))fail('Every block needs a unique valid ID.');ids.add(n.id);if(++nodes>LIMITS.nodes)fail('Program exceeds the 400-block limit.');};
 const expr=x=>checkExpression(x,0,exprState),name=x=>{if(!validName(x))fail('Use a name starting with a letter, followed by letters, numbers or underscores (32 characters maximum).');};
 function visit(body,depth){if(depth>LIMITS.depth)fail('Blocks are nested too deeply (maximum 12).');if(!Array.isArray(body))fail('A block body must be a list.');for(const n of body){unique(n);
  if(n.type==='move'){if(!MOVES.includes(n.op))fail('Unknown movement command.');if(LIMB_MOVES.includes(n.op)){expr(n.part);expr(n.side);}if(n.op==='touch')expr(n.part);if(['stomp','slide','turn','chaCha'].includes(n.op))expr(n.side);if(n.op==='turn')expr(n.quarterTurns??1);if(n.beats!==undefined)expr(n.beats);}
  else if(n.type==='call'){name(n.name);if(!Array.isArray(n.args)||n.args.length>6)fail('A procedure call supports at most six arguments.');n.args.forEach(expr);}
  else if(n.type==='repeat'){expr(n.count);if(typeof n.count==='number'&&(!Number.isInteger(n.count)||n.count<0||n.count>32))fail('Repeat count must be a whole number from 0 to 32.');}
  else if(n.type==='if')expr(n.condition);
  else if(n.type==='foreach'){name(n.item);expr(n.list);}
  else if(n.type==='assign'){name(n.name);expr(n.value);}
  else if(n.type==='list'){name(n.name);if(!['append','insert','remove','set'].includes(n.op))fail('Unknown list operation.');if(n.op!=='remove')expr(n.value);if(n.op!=='append')expr(n.index);}
  else if(n.type==='note'){expr(n.pitch);expr(n.beats);}
  else if(n.type==='rest')expr(n.beats);
  else fail('Unknown programming block.');children(n).forEach(b=>visit(b,depth+1));
 }}
 for(const def of p.procedures){unique(def);name(def.name);if(names.has(def.name)||MOVES.includes(def.name)||['playNote','rest','readInput'].includes(def.name))fail('Procedure names must be unique and cannot replace library commands.');names.add(def.name);if(!Array.isArray(def.params)||def.params.length>6||new Set(def.params).size!==def.params.length)fail('Use up to six distinct parameter names.');def.params.forEach(name);visit(def.body,1);}
 visit(p.body,1);if(p.tracks!==undefined){if(!Array.isArray(p.tracks)||p.tracks.length>1)fail('One additional music track is supported.');for(const t of p.tracks){unique(t);if(t.name!=='Music')fail('The additional track must be named Music.');visit(t.body,1);}}return p;
}
export function execute(program,options={}){
 assertProgram(program);const cap={...LIMITS,...options},defs=new Map(program.procedures.map(p=>[p.name,p]));
 const inputs=structuredClone(options.inputs||{}),events=[],tracks=[];let work=0,steps=0;const traversed=new Map(),inputLists=new WeakSet();
 const mark=x=>{if(Array.isArray(x)){inputLists.add(x);x.forEach(mark);}};Object.values(inputs).forEach(mark);
 const tick=()=>{if(++work>cap.work)throw Error('Execution limit reached. Reduce nested loops or calls.');};
 const lookup=(scope,key)=>{for(let s=scope;s;s=s.parent)if(Object.hasOwn(s.values,key))return s.values[key];throw Error(`Variable or parameter ${key} has no value here. Define it before use.`);};
 const scope=(parent=null,values={})=>({parent,values:Object.assign(Object.create(null),values)});
 const capture=s=>{const out={};for(let q=s;q;q=q.parent)for(const k of Object.keys(q.values))if(!Object.hasOwn(out,k))out[k]=structuredClone(q.values[k]);return out;};
 const ev=(x,env)=>evaluate(x,{lookup:k=>lookup(env,k),inputs,tick});
 const contains=(value,target,depth=0)=>{tick();if(depth>12)throw Error('List nesting is too deep.');return Array.isArray(value)&&(value===target||value.some(v=>contains(v,target,depth+1)));};
 for(const trackDef of [{name:'Dance',body:program.body},...(program.tracks||[])]){
  const trace=[];let beat=0,active=null;const global=scope();
  function visit(body,env,stack,depth){if(depth>cap.calls)throw Error('Procedure call depth exceeded. Check for recursive calls.');for(const n of body){tick();events.push({id:n.id,type:n.type,stack:stack.map(x=>x.id),environment:capture(env),traceIndex:trace.length,track:trackDef.name,beat});
   if(n.type==='assign'){env.values[n.name]=ev(n.value,env);continue;}
   if(n.type==='if'){const condition=ev(n.condition,env);if(typeof condition!=='boolean')throw Error('IF condition must evaluate to true or false.');visit(condition?n.body:n.elseBody,env,[...stack,n],depth);continue;}
   if(n.type==='repeat'){const count=ev(n.count,env);if(!Number.isInteger(count)||count<0||count>32)throw Error('Repeat count must be a whole number from 0 to 32.');for(let i=0;i<count;i++){tick();visit(n.body,env,[...stack,n],depth);}continue;}
   if(n.type==='foreach'){const values=ev(n.list,env);if(!Array.isArray(values))throw Error('FOR EACH needs a list.');traversed.set(values,(traversed.get(values)||0)+1);try{for(const value of values){tick();env.values[n.item]=value;visit(n.body,env,[...stack,n],depth);}}finally{const count=traversed.get(values)-1;if(count)traversed.set(values,count);else traversed.delete(values);}continue;}
   if(n.type==='list'){const values=lookup(env,n.name);if(!Array.isArray(values))throw Error(`${n.name} is not a list.`);if(traversed.has(values))throw Error('Do not mutate a list while it is being traversed.');if(program.tracks?.length&&inputLists.has(values))throw Error('Shared input lists are read-only across parallel tracks. Build a track-local list first.');const index=n.op==='append'?values.length+1:ev(n.index,env);if(!Number.isInteger(index)||index<1||index>values.length+(n.op==='insert'||n.op==='append'?1:0))throw Error('List index is out of bounds. The first index is 1.');if(['append','insert'].includes(n.op)&&values.length>=128)throw Error('Lists contain at most 128 elements.');let v;if(n.op!=='remove'){v=ev(n.value,env);if(contains(v,values))throw Error('A list cannot contain itself.');}if(n.op==='remove')values.splice(index-1,1);else if(n.op==='set')values[index-1]=v;else values.splice(index-1,0,v);continue;}
   if(n.type==='call'){const def=defs.get(n.name);if(!def)throw Error(`Undefined procedure: ${n.name}. Add its definition.`);if(n.args.length!==def.params.length)throw Error(`${n.name} needs ${def.params.length} arguments; this call has ${n.args.length}.`);const values=n.args.map(v=>ev(v,env)),bound=scope(global,Object.fromEntries(def.params.map((k,i)=>[k,values[i]])));visit(def.body,bound,[...stack,n],depth+1);continue;}
   if(trackDef.name==='Music'&&n.type==='move'&&n.op!=='wait')throw Error('The Music track supports notes, rests and waits. Put robot movements in the Dance track.');
   let command={op:n.type==='note'?'playNote':n.type==='rest'?'rest':n.op};
   if(command.op==='hop')command.op='jump';
   if(LIMB_MOVES.includes(command.op)){let part,side;if(n.part==='ACTIVE'&&n.side==='ACTIVE'){if(!active)throw Error('shake() needs a body part first. Execute moveIn or moveOut before it.');({part,side}=active);}else{part=ev(n.part,env);side=ev(n.side,env);}if(!PARTS.includes(part)||!(part==='HEAD'?side==='CENTER':['LEFT','RIGHT'].includes(side)))throw Error(`Invalid body-part combination: ${part}, ${side}. HEAD uses CENTER; other parts use LEFT or RIGHT.`);Object.assign(command,{part,side});active={part,side};}
   if(command.op==='touch'){command.part=ev(n.part,env);if(!TOUCH_PARTS.includes(command.part))throw Error('touch needs HEAD, SHOULDERS, KNEES, or TOES.');}
   if(['stomp','slide','turn','chaCha'].includes(command.op)){command.side=ev(n.side,env);if(!['LEFT','RIGHT'].includes(command.side))throw Error(`${command.op} needs LEFT or RIGHT.`);}
   if(command.op==='turn'){command.quarterTurns=ev(n.quarterTurns??1,env);if(!Number.isInteger(command.quarterTurns)||command.quarterTurns<1||command.quarterTurns>4)throw Error('Quarter turns must be a whole number from 1 to 4.');}
   if(command.op==='playNote'){command.pitch=ev(n.pitch,env);if(typeof command.pitch!=='string'||!/^([A-G]#?[3-5]|C6)$/.test(command.pitch)||['E#','B#'].some(x=>command.pitch.startsWith(x)))throw Error('Choose a supported note from C3 through C6.');}
   const beats=n.beats===undefined?(DEFAULT_BEATS[command.op]||1)*(command.quarterTurns||1):ev(n.beats,env);if(typeof beats!=='number'||!Number.isFinite(beats)||beats<=0||beats>32||Math.round(beats*4)!==beats*4)throw Error('Duration must be a positive quarter-beat multiple, up to 32 beats.');
   if(++steps>cap.steps)throw Error('Movement limit reached (including audio events) (800). Shorten your routine.');
   command={...command,id:n.id,stack:stack.map(x=>x.id),environment:capture(env),track:trackDef.name,beat,beats};trace.push(command);beat+=beats;if(beat>cap.maxBeats)throw Error('Performance exceeds its beat limit.');
  }}
  visit(trackDef.body,global,[],0);tracks.push({name:trackDef.name,trace,beats:beat,variables:capture(global)});
 }
 const totalBeats=Math.max(0,...tracks.map(t=>t.beats));if(options.bpm!==undefined&&totalBeats*60/options.bpm>300+1e-8)throw Error('Performance exceeds five minutes. Shorten a routine or change tempo.');
 return {trace:tracks[0].trace,events,work,tracks,totalBeats};
}
export function observable(trace){return trace.map(({op,part,side,quarterTurns,pitch})=>({op,...(part?{part}:{}),...(side?{side}:{}),...(quarterTurns?{quarterTurns}:{}),...(pitch?{pitch}:{})}));}
export const timedObservable=trace=>trace.map(c=>({...observable([c])[0],beat:c.beat,beats:c.beats}));
export function describe(c){if(LIMB_MOVES.includes(c.op))return `${c.op==='moveIn'?'Move in':c.op==='moveOut'?'Move out':'Shake'} · ${c.side.toLowerCase()} ${c.part.toLowerCase()}`;
 if(c.op==='touch')return `Touch ${c.part.toLowerCase()}`;if(['stomp','slide','chaCha'].includes(c.op))return `${c.op==='chaCha'?'Cha-cha':c.op} ${c.side.toLowerCase()}`;if(c.op==='turn')return `Turn ${c.side.toLowerCase()} · ${c.quarterTurns} quarter turn(s)`;if(c.op==='playNote')return `Play ${c.pitch}`;return {turnAround:'Turn around · one full turn',clap:'Clap both hands',bow:'Bow from the waist',nod:'Nod the head',jump:'Hop / jump with both feet',wait:'Hold this pose',rest:'Musical rest',crissCross:'Criss-cross feet and reopen',charlieBrown:'Charlie Brown · forward/back rock'}[c.op]||c.op;}
const legacyValue=v=>typeof v==='string'&&!v.startsWith('$')&&[...PARTS,...SIDES,'ACTIVE'].includes(v)?v:expressionText(v);
export function instruction(n){
 if(n.type==='repeat')return `REPEAT ${expressionText(n.count)} TIMES`;if(n.type==='foreach')return `FOR EACH ${n.item} IN ${expressionText(n.list)}`;if(n.type==='if')return `IF (${expressionText(n.condition)})`;if(n.type==='assign')return `${n.name} ← ${expressionText(n.value)}`;
 if(n.type==='list'){const a=n.name,i=expressionText(n.index),v=expressionText(n.value);return n.op==='append'?`APPEND(${a}, ${v})`:n.op==='insert'?`INSERT(${a}, ${i}, ${v})`:n.op==='remove'?`REMOVE(${a}, ${i})`:`${a}[${i}] ← ${v}`;}
 if(n.type==='call')return `${n.name}(${n.args.map(legacyValue).join(', ')})`;
 if(n.type==='note')return `playNote(${expressionText(n.pitch)}, ${expressionText(n.beats)})`;if(n.type==='rest')return `rest(${expressionText(n.beats)})`;
 let args=LIMB_MOVES.includes(n.op)&&n.part!=='ACTIVE'?[legacyValue(n.part),legacyValue(n.side)]:n.op==='touch'?[legacyValue(n.part)]:['stomp','slide','turn','chaCha'].includes(n.op)?[legacyValue(n.side),...(n.op==='turn'?[expressionText(n.quarterTurns??1)]:[])]:[];
 if(n.op==='wait'&&n.beats!==undefined)args=[expressionText(n.beats)];const suffix=n.beats!==undefined&&n.op!=='wait'?`  [${expressionText(n.beats)} beats]`:'';return `${n.op}(${args.join(', ')})${suffix}`;
}
export function pseudocode(p){assertProgram(p);const lines=[],push=(text,id=null,indent=0)=>lines.push({text:'  '.repeat(indent)+text,id});
 const body=(nodes,indent)=>{for(const n of nodes){push(instruction(n),n.id,indent);if(children(n).length){push('{',n.id,indent);body(n.body,indent+1);push('}',n.id,indent);if(n.type==='if'&&n.elseBody.length){push('ELSE',n.id,indent);push('{',n.id,indent);body(n.elseBody,indent+1);push('}',n.id,indent);}}}};
 for(const pdef of p.procedures){push(`PROCEDURE ${pdef.name}(${pdef.params.join(', ')})`,pdef.id);push('{',pdef.id);body(pdef.body,1);push('}',pdef.id);push('');}body(p.body,0);for(const t of p.tracks||[]){push('');push('MUSIC TRACK (parallel)',t.id);body(t.body,0);}return lines;
}
export function exportProgram(p){assertProgram(p);return JSON.stringify(p,null,2);}
export function importProgram(text){if(typeof text!=='string'||text.length>LIMITS.importBytes)throw Error('Import is too large (100 KB maximum).');let p;try{p=JSON.parse(text);}catch{throw Error('Import must be a valid Algorithm Dance Lab JSON export.');}assertProgram(p);return structuredClone(p);}
export function traceDifference(actual,expected){for(let i=0;i<Math.max(actual.length,expected.length);i++){const a=actual[i],e=expected[i];if(!a)return {kind:'missing',index:i,message:`Missing movement at instruction ${i+1}. Your routine ends before the target.`};if(!e)return {kind:'extra',index:i,message:`Extra movement at instruction ${i+1}. The target has already finished.`};
 for(const [field,kind,word] of [['op','order','Movement order'],['part','part','Wrong body part'],['side','side','Wrong side/direction'],['quarterTurns','turn','Turn amount'],['beats','timing','Beat duration']])if(e[field]!==undefined&&a[field]!==e[field])return {kind,index:i,message:`${word} differs at instruction ${i+1}. Compare that moment with the target and check your arguments.`};}return null;}
