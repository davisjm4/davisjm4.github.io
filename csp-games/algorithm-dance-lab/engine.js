/* One bounded AST drives blocks, AP CSP pseudocode, and observable movement traces. */
export const PARTS = ['FOOT','HAND','KNEE','ELBOW','HIP','SHOULDER','HEAD'];
export const SIDES = ['RIGHT','LEFT','CENTER'];
export const MOVES = ['moveIn','moveOut','shake','turnAround','clap','bow','nod','jump','wait'];
export const LIMB_MOVES = ['moveIn','moveOut','shake'];
export const NAMES = ['dance','hokey_pokey','groove','intro','finale','pose'];
export const LIMITS = Object.freeze({nodes:400, depth:12, calls:16, steps:800, work:6000, importBytes:100000});
let serial=0;
export const id=()=>`b${Date.now().toString(36)}_${++serial}`;
export const blank=()=>({version:1,procedures:[],body:[]});
export const move=(op,part='FOOT',side='RIGHT')=>({id:id(),type:'move',op,...(LIMB_MOVES.includes(op)?{part,side}:{})});
export const call=(name='dance',args=['FOOT','RIGHT'])=>({id:id(),type:'call',name,args});
export const repeat=(count=3)=>({id:id(),type:'repeat',count,body:[]});
export const procedure=(name='dance',params=['part','side'])=>({id:id(),name,params:[...params],body:[]});
export function walk(program,fn){const visit=(body)=>body.forEach(n=>{fn(n);if(n.type==='repeat')visit(n.body);});program.procedures.forEach(p=>{fn(p);visit(p.body);});visit(program.body);}
export function assertProgram(p){
  const fail=m=>{throw Error(m);};
  if(!p||p.version!==1||!Array.isArray(p.body)||!Array.isArray(p.procedures)||p.procedures.length>6)fail('Unsupported program format. Use an Algorithm Dance Lab version 1 export.');
  let nodes=0;const ids=new Set(),names=new Set();
  const unique=n=>{if(!n||typeof n.id!=='string'||!/^[-\w]{1,80}$/.test(n.id)||ids.has(n.id))fail('Every block needs a unique valid ID.');ids.add(n.id);if(++nodes>LIMITS.nodes)fail('Program exceeds the 400-block limit.');};
  const expr=v=>typeof v==='string'&&[...PARTS,...SIDES,'$part','$side'].includes(v);
  const visit=(body,depth)=>{if(depth>LIMITS.depth)fail('Blocks are nested too deeply (maximum 12).');if(!Array.isArray(body))fail('A block body must be a list.');for(const n of body){unique(n);
    if(n.type==='move'){if(!MOVES.includes(n.op))fail('Unknown movement command.');if(LIMB_MOVES.includes(n.op)&&!(n.op==='shake'&&n.part==='ACTIVE'&&n.side==='ACTIVE')&&(!expr(n.part)||!expr(n.side)))fail('Invalid movement parameters.');}
    else if(n.type==='call'){if(!NAMES.includes(n.name)||!Array.isArray(n.args)||n.args.length>2||!n.args.every(expr))fail('Invalid procedure call.');}
    else if(n.type==='repeat'){if(!Number.isInteger(n.count)||n.count<0||n.count>32)fail('Repeat count must be a whole number from 0 to 32.');visit(n.body,depth+1);}
    else fail('Unknown programming block.');
  }};
  for(const def of p.procedures){unique(def);if(!NAMES.includes(def.name)||names.has(def.name))fail('Procedure names must be unique.');names.add(def.name);if(!Array.isArray(def.params)||!(def.params.length===0||JSON.stringify(def.params)==='["part","side"]'))fail('Supported definitions use no parameters or (part, side).');visit(def.body,1);}
  visit(p.body,1);return p;
}
export function execute(program,limits={}){
  assertProgram(program);const cap={...LIMITS,...limits},defs=new Map(program.procedures.map(p=>[p.name,p]));
  const trace=[],events=[];let work=0,active=null;
  const resolve=(v,env)=>v?.startsWith('$')?(Object.hasOwn(env,v.slice(1))?env[v.slice(1)]:(()=>{throw Error(`Parameter ${v.slice(1)} has no value here. Use it inside a matching procedure.`);})()):v;
  const emit=(node,stack,env)=>events.push({id:node.id,type:node.type,stack:stack.map(x=>x.id),environment:{...env},traceIndex:trace.length});
  const visit=(body,env,stack,depth)=>{if(depth>cap.calls)throw Error('Procedure call depth exceeded. Check for recursive calls.');for(const n of body){if(++work>cap.work)throw Error('Execution limit reached. Reduce nested loops or calls.');emit(n,stack,env);
    if(n.type==='repeat'){for(let i=0;i<n.count;i++){if(++work>cap.work)throw Error('Execution limit reached. Reduce nested loops or calls.');visit(n.body,env,[...stack,n],depth);}}
    else if(n.type==='call'){const def=defs.get(n.name);if(!def)throw Error(`Undefined procedure: ${n.name}. Add its definition.`);if(n.args.length!==def.params.length)throw Error(`${n.name} needs ${def.params.length} arguments; this call has ${n.args.length}.`);const vals=n.args.map(v=>resolve(v,env)),bound=Object.fromEntries(def.params.map((k,i)=>[k,vals[i]]));visit(def.body,bound,[...stack,n],depth+1);}
    else {let part,side;if(LIMB_MOVES.includes(n.op)){
      if(n.part==='ACTIVE'){if(!active)throw Error('shake() needs a body part first. Execute moveIn or moveOut before it.');({part,side}=active);}
      else {part=resolve(n.part,env);side=resolve(n.side,env);}
      if(!PARTS.includes(part)||!(part==='HEAD'?side==='CENTER':['LEFT','RIGHT'].includes(side)))throw Error(`Invalid body-part combination: ${part}, ${side}. HEAD uses CENTER; other parts use LEFT or RIGHT.`);
      active={part,side};
    }
    if(trace.length>=cap.steps)throw Error('Movement limit reached (800). Shorten your routine.');
    trace.push({op:n.op,...(part?{part,side}:{}),id:n.id,stack:stack.map(x=>x.id),environment:{...env}});
  }}};
  visit(program.body,{},[],0);return {trace,events,work};
}
export const observable=trace=>trace.map(({op,part,side})=>({op,...(part?{part,side}:{})}));
export function describe(c){return LIMB_MOVES.includes(c.op)?`${c.op==='moveIn'?'Move in':c.op==='moveOut'?'Move out':'Shake'} · ${c.side.toLowerCase()} ${c.part.toLowerCase()}`:({turnAround:'Turn around · one full turn',clap:'Clap both hands',bow:'Bow from the waist',nod:'Nod the head',jump:'Jump with both feet',wait:'Hold this pose'})[c.op];}
const value=v=>v?.startsWith('$')?v.slice(1):v;
export function instruction(n){if(n.type==='repeat')return `REPEAT ${n.count} TIMES`;if(n.type==='call')return `${n.name}(${n.args.map(value).join(', ')})`;return `${n.op}(${LIMB_MOVES.includes(n.op)&&n.part!=='ACTIVE'?[value(n.part),value(n.side)].join(', '):''})`;}
export function pseudocode(p){assertProgram(p);const lines=[];const push=(text,id=null,indent=0)=>lines.push({text:'  '.repeat(indent)+text,id});
  const body=(list,indent)=>{for(const n of list){push(instruction(n),n.id,indent);if(n.type==='repeat'){push('{',n.id,indent);body(n.body,indent+1);push('}',n.id,indent);}}};
  for(const def of p.procedures){push(`PROCEDURE ${def.name}(${def.params.join(', ')})`,def.id);push('{',def.id);body(def.body,1);push('}',def.id);push('');}body(p.body,0);return lines;
}
export function exportProgram(p){assertProgram(p);return JSON.stringify(p,null,2);}
export function importProgram(text){if(typeof text!=='string'||text.length>LIMITS.importBytes)throw Error('Import is too large (100 KB maximum).');let p;try{p=JSON.parse(text);}catch{throw Error('Import must be a valid Algorithm Dance Lab JSON export.');}assertProgram(p);return JSON.parse(JSON.stringify(p));}
export function traceDifference(actual,expected){for(let i=0;i<Math.max(actual.length,expected.length);i++){
 const a=actual[i],e=expected[i];if(!a)return {kind:'missing',index:i,message:`Missing movement at beat ${i+1}. Your routine ends before the target.`};if(!e)return {kind:'extra',index:i,message:`Extra movement at beat ${i+1}. The target has already finished.`};
 if(a.op!==e.op)return {kind:'order',index:i,message:`Movement order differs at beat ${i+1}. Watch that moment and compare the next command.`};
 if(a.part!==e.part)return {kind:'part',index:i,message:`Wrong body part at beat ${i+1}. Check the part argument or the procedure body.`};
 if(a.side!==e.side)return {kind:'side',index:i,message:`Wrong side at beat ${i+1}. Check the side argument.`};
 }return null;}
