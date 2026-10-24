// Annotated, executable AP CSP subset. Source regions are emitted by the renderer,
// never inferred by searching for a keyword. AP REPEAT UNTIL tests before its body.
export const clone = x => JSON.parse(JSON.stringify(x));
export const V = (name,id) => ({k:'var',name,id});
export const L = (value,id) => ({k:'lit',value,id});
export const E = (op,a,b,id) => ({k:'op',op,args:b===undefined?[a]:[a,b],id});
export const List = (values,id) => ({k:'list',values:values.map(x=>typeof x==='object'?x:L(x)),id});
export const Call = (name,args=[],id) => ({k:'call',name,args,id});
export const A = (name,value,id) => ({k:'assign',name,value,id});
export const D = (value,id) => ({k:'display',value,id});
export const R = (value,id) => ({k:'return',value,id});
export const I = (condition,body,otherwise=[],id) => ({k:'if',condition,body,otherwise,id});
export const F = (name,list,body,id) => ({k:'each',name,list,body,id});
export const T = (count,body,id) => ({k:'repeat',count,body,id});
export const U = (condition,body,id) => ({k:'until',condition,body,id});
export const P = (name,params,body,id='procedure') => ({k:'procedure',name,params:params.map(x=>typeof x==='string'?V(x,'parameter-'+x):x),body,id});
export const S = (name,args,id) => ({k:'invoke',call:Call(name,args,id+'-call'),id});
export const Op = (op,args,id) => ({k:'builtin',op,args,id});
export const In = id => ({k:'input',id});
export const Event = (name,body,id) => ({k:'event',name,body,id});
export function walk(x,fn,parent=null,key=null) {
  if (!x || typeof x!=='object') return;
  if (Array.isArray(x)) {x.forEach((v,i)=>walk(v,fn,x,i));return;}
  fn(x,parent,key);
  for(const [k,v] of Object.entries(x)) if(v && typeof v==='object')walk(v,fn,x,k);
}
export function find(program,id) {let out;walk(program,n=>{if(n.id===id)out=n;});return out;}
export function patch(program,id,replacement) {
  let found=false;
  walk(program,(n,parent,key)=>{if(!found&&n.id===id){found=true;if(replacement===null&&Array.isArray(parent))parent.splice(key,1);else parent[key]=clone(replacement);}});
  if(!found)throw Error('Unknown mutation target '+id);
  return program;
}
export function execute(program,{inputs=[],events=[],limit=500}={}) {
  const env={},outputs=[],returns=[],reads=[],visits={}; let steps=0,inputIndex=0,error=null;
  const defs=Object.fromEntries(program.filter(n=>n.k==='procedure').map(n=>[n.name,n]));
  const tick=n=>{if(++steps>limit)throw Error('Execution limit (nontermination)');if(n?.id)visits[n.id]=(visits[n.id]||0)+1;};
  const value=(n,scope)=>{
    tick(n);
    if(n.k==='lit')return n.value;
    if(n.k==='var'){if(!(n.name in scope))throw Error('Undefined variable '+n.name);return scope[n.name];}
    if(n.k==='list')return n.values.map(x=>value(x,scope));
    if(n.k==='input'){if(inputIndex>=inputs.length)throw Error('Input unavailable');const out=inputs[inputIndex++];reads.push(out);return out;}
    if(n.k==='call'){
      const def=defs[n.name];if(!def)throw Error('Undefined procedure '+n.name);
      if(n.args.length!==def.params.length)throw Error('Argument count does not match parameter count');
      const args=n.args.map(x=>value(x,scope)), frame=Object.create(env);
      def.params.forEach((p,i)=>frame[p.name]=args[i]);const r=block(def.body,frame);returns.push(r?.value);return r?.value;
    }
    if(n.k!=='op')throw Error('Unsupported expression '+n.k);
    const a=value(n.args[0],scope);
    if(n.op==='NOT')return !a;
    if(n.op==='LENGTH'){if(!Array.isArray(a))throw Error('LENGTH requires a list');return a.length;}
    const b=value(n.args[1],scope);
    if(n.op==='INDEX'){if(!Array.isArray(a)||!Number.isInteger(b)||b<1||b>a.length)throw Error('List index out of range');return a[b-1];}
    switch(n.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':if(b===0)throw Error('Division by zero');return a/b;case '=':return a===b;case '≠':return a!==b;case '>':return a>b;case '<':return a<b;case '≥':return a>=b;case '≤':return a<=b;case 'AND':return a&&b;case 'OR':return a||b;default:throw Error('Unsupported operator '+n.op);}
  };
  const block=(nodes,scope)=>{
    for(const n of nodes){tick(n);
      if(n.k==='procedure')continue;
      if(n.k==='assign')scope[n.name]=value(n.value,scope);
      else if(n.k==='display')outputs.push(value(n.value,scope));
      else if(n.k==='return')return {value:value(n.value,scope)};
      else if(n.k==='invoke')value(n.call,scope);
      else if(n.k==='if'){const r=block(value(n.condition,scope)?n.body:n.otherwise,scope);if(r)return r;}
      else if(n.k==='each'){const list=value(n.list,scope);if(!Array.isArray(list))throw Error('FOR EACH requires a list');for(const item of [...list]){scope[n.name]=item;const r=block(n.body,scope);if(r)return r;}}
      else if(n.k==='repeat'){const count=value(n.count,scope);if(!Number.isInteger(count)||count<0)throw Error('Invalid repeat count');for(let i=0;i<count;i++){const r=block(n.body,scope);if(r)return r;}}
      else if(n.k==='until'){while(!value(n.condition,scope)){const r=block(n.body,scope);if(r)return r;tick(n);}}
      else if(n.k==='event'){for(const event of events.filter(e=>e===n.name)){reads.push(event);const r=block(n.body,scope);if(r)return r;}}
      else if(n.k==='builtin'){
        if(n.op==='APPEND'){const list=value(n.args[0],scope);list.push(value(n.args[1],scope));}
        else if(n.op==='REMOVE'){const list=value(n.args[0],scope),i=value(n.args[1],scope);if(i<1||i>list.length)throw Error('List index out of range');list.splice(i-1,1);}
        else if(n.op==='MOVE_FORWARD'||n.op==='ROTATE_LEFT')outputs.push({action:n.op});
        else throw Error('Unsupported instruction '+n.op);
      }else throw Error('Unsupported statement '+n.k);
    }
  };
  try{block(program,env);}catch(e){error=e.message;}
  return {outputs,env,returns,reads,visits,error,steps};
}
export function render(program) {
  let code='';const regions=[];
  const text=s=>{code+=s;};
  const region=(id,kind,write)=>{const start=code.length;write();if(id)regions.push({id,kind,start,end:code.length,text:code.slice(start)});};
  const expr=n=>region(n.id,n.k==='var'?'identifier':n.k==='lit'?'value':n.k==='call'?'call':'expression',()=>{
    if(n.k==='var')text(n.name);
    else if(n.k==='lit')text(typeof n.value==='string'?JSON.stringify(n.value):typeof n.value==='boolean'?String(n.value).toUpperCase():String(n.value));
    else if(n.k==='input')text('INPUT()');
    else if(n.k==='list'){text('[');n.values.forEach((v,i)=>{if(i)text(', ');expr(v);});text(']');}
    else if(n.k==='call'){text(n.name+'(');n.args.forEach((v,i)=>{if(i)text(', ');expr(v);});text(')');}
    else if(n.k==='op'){
      if(n.op==='LENGTH'){text('LENGTH(');expr(n.args[0]);text(')');}
      else if(n.op==='INDEX'){expr(n.args[0]);text('[');expr(n.args[1]);text(']');}
      else if(n.op==='NOT'){text('NOT (');expr(n.args[0]);text(')');}
      else{const paren=['AND','OR'].includes(n.op);if(paren)text('(');expr(n.args[0]);text(' '+n.op+' ');expr(n.args[1]);if(paren)text(')');}
    }
  });
  const block=(nodes,indent=0)=>nodes.forEach(n=>{
    const pad='  '.repeat(indent);text(pad);
    const complex=['procedure','if','each','repeat','until','event'].includes(n.k);
    region(n.id,complex?'block':'statement',()=>{
      if(n.k==='assign'){region(n.id&&n.id+'-destination','identifier',()=>text(n.name));text(' ← ');expr(n.value);}
      else if(n.k==='display'||n.k==='return'){text(n.k==='display'?'DISPLAY(':'RETURN(');expr(n.value);text(')');}
      else if(n.k==='invoke')expr(n.call);
      else if(n.k==='builtin'){text(n.op+'(');n.args.forEach((v,i)=>{if(i)text(', ');expr(v);});text(')');}
      else if(complex){
        region(n.id&&n.id+'-header','header',()=>{
          if(n.k==='procedure'){text('PROCEDURE ');region(n.id+'-name','identifier',()=>text(n.name));text('(');n.params.forEach((p,i)=>{if(i)text(', ');expr(p);});text(')');}
          else if(n.k==='if'){text('IF (');expr(n.condition);text(')');}
          else if(n.k==='each'){text('FOR EACH ');region(n.id+'-variable','identifier',()=>text(n.name));text(' IN ');expr(n.list);}
          else if(n.k==='repeat'){text('REPEAT ');expr(n.count);text(' TIMES');}
          else if(n.k==='until'){text('REPEAT UNTIL (');expr(n.condition);text(')');}
          else text('WHEN '+n.name); // Explicitly described event notation, not AP sheet syntax.
        });
        text('\n'+pad+'{\n');region(n.id&&n.id+'-body','body',()=>block(n.body,indent+1));text(pad+'}');
        if(n.otherwise?.length){text('\n'+pad+'ELSE\n'+pad+'{\n');region(n.id+'-else','body',()=>block(n.otherwise,indent+1));text(pad+'}');}
      }
    });text('\n');
  });block(program);
  return {code:code.trimEnd(),regions:regions.filter(r=>r.end>r.start)};
}
export function shape(program) {
  const simplify=x=>{
    if(Array.isArray(x))return x.map(simplify);
    if(!x||typeof x!=='object')return typeof x;
    return Object.fromEntries(Object.entries(x).filter(([k])=>!['id','name','value'].includes(k)||k==='value'&&x.k==='assign').map(([k,v])=>[k,k==='k'||k==='op'?v:k==='values'?['list']:simplify(v)]));
  };return JSON.stringify(simplify(program));
}
