// Conservative symbolic checks for code that looks harder than its shortest
// solution. Input bindings remain distinct even when their numeric values match.
// This does not use the generator's difficulty labels or answer field.
export function redundantArithmetic(program){
  const findings=[];let serial=0,memory=0,references=0;
  const symbol=(name,type='int')=>({op:'input',name,id:serial++,type});
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const binary=(node,operator)=>node?.op==='binary'&&node.operator===operator;
  function simplify(node,statement){
    if(!node||typeof node!=='object')return node;
    if(node.op!=='binary')return node;
    const a=node.left,b=node.right;
    const is=(value,n)=>value?.op==='literal'&&value.value===n;
    const string=value=>value?.type==='String'||value?.op==='literal'&&typeof value.value==='string'||value?.op==='binary'&&value.operator==='+'&&(string(value.left)||string(value.right));
    let replacement;
    if(node.operator==='+'&&!string(a)&&!string(b)&&(is(a,0)||is(b,0)))replacement=is(a,0)?b:a;
    if(node.operator==='-'&&is(b,0))replacement=a;
    if(node.operator==='*'&&(is(a,1)||is(b,1)))replacement=is(a,1)?b:a;
    if(node.operator==='/'&&is(b,1))replacement=a;
    if(node.operator==='%'&&binary(a,'%')&&same(a.right,b))replacement=a;
    if(node.operator==='-'&&binary(b,'-')&&same(a,b.left))replacement=b.right;
    if(node.operator==='-'&&binary(a,'+')&&same(a.right,b))replacement=a.left;
    if(node.operator==='-'&&binary(a,'+')&&same(a.left,b))replacement=a.right;
    if(node.operator==='+'&&binary(a,'-')&&same(a.right,b))replacement=a.left;
    if(node.operator==='-'&&same(a,b))replacement={op:'literal',value:0};
    if(replacement){findings.push({statement,kind:'cancelling or repeated calculation'});return replacement;}
    return node;
  }
  function expand(e,env,statement){
    if(!e||typeof e!=='object')return e;
    if(e.op==='variable')return env.get(e.name)||{op:'unbound',name:e.name};
    if(e.op==='binary')return simplify({...e,left:expand(e.left,env,statement),right:expand(e.right,env,statement)},statement);
    if(e.op==='literal')return e;
    const out={...e};for(const key of ['index','column','row','left','right'])if(e[key]&&typeof e[key]==='object')out[key]=expand(e[key],env,statement);
    if(e.op==='read')out.memoryVersion=memory;
    if(['read','length','reference-equal'].includes(e.op))out.referenceVersion=references;
    return out;
  }
  function writes(list,names=new Set()){for(const s of list){if((s.op==='declare'||s.op==='assign')&&!s.index)names.add(s.name);for(const key of ['body','yes','no'])if(s[key])writes(s[key],names);}return names;}
  let statement=0;
  function visit(list,env){for(const s of list){const id=statement++;
    if(s.op==='declare'||s.op==='assign'){
      const value=expand(s.value,env,id);if(s.index){expand(s.index,env,id);if(s.column)expand(s.column,env,id);memory++;}
      else env.set(s.name,s.value.op==='literal'?symbol(s.name,s.type||'int'):value);
    }
    if(['array','allocate','reference','row-reference','returned-reference'].includes(s.op)){references++;if(s.row)expand(s.row,env,id);if(s.size)expand(s.size,env,id);}
    if(s.op==='if'){expand(s.condition,env,id);visit(s.yes,new Map(env));visit(s.no,new Map(env));for(const name of writes([...s.yes,...s.no]))env.set(name,symbol(name));}
    if(s.op==='loop'){expand(s.start,env,id);const local=new Map(env);local.set(s.name,symbol(s.name));expand(s.condition,local,id);visit(s.body,local);for(const name of writes(s.body))env.set(name,symbol(name));memory++;}
    if(s.op==='call'){visit(s.body,new Map(env));memory++;references++;}
  }}
  const env=new Map();visit(program.statements,env);expand(program.output,env,statement);
  return findings;
}
