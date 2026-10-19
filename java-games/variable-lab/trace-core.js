export const NAMES = {
  int:["score","points","count","total","level","value","steps","coins"],
  double:["price","distance","rating","temperature","balance","average"],
  boolean:["isReady","hasPass","isOpen","isComplete","canEnter"],
  String:["message","label","name","status","word"],
  char:["initial","grade","code","marker","letter"],
};
export function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const pick=(r,a)=>a[Math.floor(r()*a.length)], int=(r,a,b)=>a+Math.floor(r()*(b-a+1));
export function shuffle(r,a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
export const uniq=(a)=>[...new Set(a)], clone=(o)=>Object.fromEntries(Object.entries(o));
function javaIntDiv(a,b){if(!b)throw Error("division by zero");return Math.trunc(a/b);}
function javaIntRem(a,b){if(!b)throw Error("division by zero");return a-javaIntDiv(a,b)*b;}
export function display(v,type){if(type==="boolean")return String(v);if(type==="double")return Number.isInteger(Number(v))?Number(v).toFixed(1):String(Number(v));return String(v);}
export function literal(v,type){if(type==="String")return JSON.stringify(v);if(type==="char")return `'${v}'`;return display(v,type);}
export function lit(value,type){return{text:literal(value,type),type,reads:[],ops:0,eval:()=>value};}
export function variable(name,type){return{text:name,type,reads:[name],ops:0,eval:(s)=>s[name]};}
export function unaryNot(expr){return{text:`!${expr.text}`,type:"boolean",reads:[...expr.reads],ops:1,concepts:["boolean-negation"],eval:(s,m)=>m?.id==="boolean-ignore-negation"?expr.eval(s,m):!expr.eval(s,m)};}
function binary(op,left,right,type,opts={}){
  return {text:opts.text||`${left.text} ${op} ${right.text}`,type,reads:uniq([...left.reads,...right.reads]),ops:left.ops+right.ops+1,concepts:uniq([...(left.concepts||[]),...(right.concepts||[]),...(opts.concepts||[])]),
    eval:(s,m)=>{
      if(opts.alt?.[m?.id])return opts.alt[m.id](s,m);
      const a=left.eval(s,m),b=right.eval(s,m);
      if(op==="+")return type==="String"?String(a)+String(b):a+b;
      if(op==="-")return a-b;if(op==="*")return a*b;
      if(op==="/")return type==="int"?(m?.id==="int-division-round"?Math.round(a/b):javaIntDiv(a,b)):a/b;
      if(op==="%")return m?.id==="remainder-as-quotient"?javaIntDiv(a,b):javaIntRem(a,b);
      throw Error("unsupported operator "+op);
    }};
}
export function plus(a,b,type="int",opts={}){return binary("+",a,b,type,opts);} export function minus(a,b,type="int",opts={}){return binary("-",a,b,type,opts);} export function times(a,b,type="int",opts={}){return binary("*",a,b,type,opts);} export function divide(a,b,type="int",opts={}){return binary("/",a,b,type,{...opts,concepts:uniq([...(opts.concepts||[]),type==="int"?"integer-division":"double-arithmetic"]) });} export function rem(a,b,opts={}){return binary("%",a,b,"int",{...opts,concepts:uniq([...(opts.concepts||[]),"remainder"]) });}
export function concat(parts,opts={}){
  const text=parts.map(p=>p.text).join(" + "),reads=uniq(parts.flatMap(p=>p.reads)),ops=parts.reduce((n,p)=>n+p.ops,0)+parts.length-1;
  return {text,type:"String",reads,ops,concepts:["string-concatenation"],eval:(s,m)=>{
    if(m?.id==="string-numeric-addition"&&opts.numericPair){const [i,j]=opts.numericPair, before=parts.slice(0,i).map(p=>p.eval(s,m)).join(""), sum=Number(parts[i].eval(s,m))+Number(parts[j].eval(s,m)), after=parts.slice(j+1).map(p=>p.eval(s,m)).join("");return before+sum+after;}
    let out="";for(const p of parts)out+=String(p.eval(s,m));return out;
  }};
}
export function precedenceExpr(base,add,mult){
  const normal=plus(base,times(add,mult,"int"),"int",{concepts:["precedence"]});
  normal.text=`${base.text} + ${add.text} * ${mult.text}`;
  const standard=normal.eval;normal.eval=(s,m)=>m?.id==="precedence-add-first"?(base.eval(s,m)+add.eval(s,m))*mult.eval(s,m):m?.id==="precedence-ignore-base"?add.eval(s,m)*mult.eval(s,m):m?.id==="precedence-add-operands"?base.eval(s,m)+add.eval(s,m)+mult.eval(s,m):standard(s,m);return normal;
}
function statement({text,writes=[],reads=[],concepts=[],init=false,ops=1,execute,explain,copySource=null,kind="update"}){return{text,writes,reads,concepts,init,ops,execute,explain,copySource,kind};}
export function decl(type,name,expr){return statement({text:`${type} ${name} = ${expr.text};`,writes:[name],reads:expr.reads,concepts:expr.concepts||[],init:true,ops:Math.max(1,expr.ops),kind:"declaration",execute:(s,m)=>{s[name]=expr.eval(s,m);},explain:(before,after)=>`${name} starts at ${display(after[name],type)}.`});}
export function setVar(name,type,expr,concepts=["reassignment"],copySource=null){return statement({text:`${name} = ${expr.text};`,writes:[name],reads:expr.reads,concepts:uniq([...concepts,...(expr.concepts||[])]),ops:Math.max(1,expr.ops+1),copySource,execute:(s,m)=>{s[name]=expr.eval(s,m);},explain:(before,after)=>`${name} changes from ${display(before[name],type)} to ${display(after[name],type)}.`});}
export function compound(name,type,op,expr,concepts=[]){return statement({text:`${name} ${op}= ${expr.text};`,writes:[name],reads:uniq([name,...expr.reads]),concepts:uniq(["compound-assignment",...concepts,...(expr.concepts||[])]),ops:Math.max(2,expr.ops+2),kind:"compound",execute:(s,m)=>{const rhs=expr.eval(s,m);if(m?.id==="compound-as-assignment"){s[name]=rhs;return;}const a=s[name];s[name]=op==="+"?(type==="String"?String(a)+String(rhs):a+rhs):op==="-"?a-rhs:op==="*"?a*rhs:op==="/"?(type==="int"?(m?.id==="int-division-round"?Math.round(a/rhs):javaIntDiv(a,rhs)):a/rhs):javaIntRem(a,rhs);},explain:(before,after)=>`${name} ${op}= uses its current value ${display(before[name],type)} and becomes ${display(after[name],type)}.`});}
export function inc(name,delta){return statement({text:`${name}${delta>0?"++":"--"};`,writes:[name],reads:[name],concepts:["increment-decrement"],ops:1,kind:"increment",execute:(s,m)=>{if(m?.id==="increment-skipped")return;s[name]+=m?.id==="increment-twice"?2*delta:delta;},explain:(before,after)=>`${name}${delta>0?"++":"--"} changes ${name} from ${before[name]} to ${after[name]}.`});}
export function printStmt(expr){return statement({text:`System.out.println(${expr.text});`,reads:expr.reads,concepts:uniq([...(expr.concepts||[]),expr.ops?"output-expression":"output-value"]),ops:Math.max(1,expr.ops),kind:"print",execute:(s,m,ctx)=>{ctx.outputs.push({value:expr.eval(s,m),type:expr.type});},explain:(before,after,ctx)=>`Print ${display(ctx.outputs.at(-1).value,ctx.outputs.at(-1).type)}. Printing does not change stored variable values.`});}
export function program(types,statements,targets){return{types,statements,targets};}
export function simulate(p,model=null){const state={},aliases={},trace=[],outputs=[];for(let i=0;i<p.statements.length;i++){const st=p.statements[i],line=i+1,before=clone(state),ctx={outputs,aliases};if(model?.skipLine!==line)st.execute(state,model,ctx);if(model?.id==="primitive-linked"){
      if(st.copySource&&st.writes.length===1)aliases[st.writes[0]]=st.copySource;
      else for(const w of st.writes)delete aliases[w];
      let changed=true,guard=0;while(changed&&guard++<8){changed=false;for(const [target,source] of Object.entries(aliases))if(state[target]!==state[source]){state[target]=state[source];changed=true;}}
    }
    const after=clone(state), out=outputs.length&&st.kind==="print"?display(outputs.at(-1).value,outputs.at(-1).type):null;
    trace.push({line,statement:st.text,variables:after,output:out,explanation:model?.id==="skip-update"&&model.skipLine===line?`If line ${line} were skipped, the state would stay unchanged here.`:st.explain(before,after,{outputs})});}
  return{state,trace,outputs};}
