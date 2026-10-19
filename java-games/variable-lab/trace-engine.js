const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
export const TRACE_DIFFICULTIES = Object.freeze({beginner:"Beginner", intermediate:"Intermediate", advanced:"Advanced"});
export const TRACE_FAMILIES = Object.freeze({
  reassignment:"Reassignment",
  selfReference:"Reassignment",
  compound:"Compound Assignment",
  increment:"Increment and Decrement",
  multiple:"Multiple Variables",
  precedence:"Arithmetic and Precedence",
  intDivision:"Integer Division and Remainder",
  doubleArithmetic:"Arithmetic and Precedence",
  boolean:"Boolean Tracing",
  string:"String and Character Tracing",
  char:"String and Character Tracing",
  outputExpression:"Output Expressions",
});
const NAMES = {
  int:["score","points","count","total","level","value","steps","coins"],
  double:["price","distance","rating","temperature","balance","average"],
  boolean:["isReady","hasPass","isOpen","isComplete","canEnter"],
  String:["message","label","name","status","word"],
  char:["initial","grade","code","marker","letter"],
};
function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const pick=(r,a)=>a[Math.floor(r()*a.length)], int=(r,a,b)=>a+Math.floor(r()*(b-a+1));
function shuffle(r,a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
const clone=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v]));
function javaIntDiv(a,b){if(!b)throw Error("division by zero");return Math.trunc(a/b);}
function javaIntRem(a,b){if(!b)throw Error("division by zero");return a-javaIntDiv(a,b)*b;}
function display(v,type){if(type==="boolean")return String(v);if(type==="double")return Number.isInteger(Number(v))?Number(v).toFixed(1):String(Number(v));return String(v);}
function literal(v,type){if(type==="String")return JSON.stringify(v);if(type==="char")return `'${v}'`;return display(v,type);}
function addLine(p,text,mutate,why,output=null){if(mutate)mutate(p.state);const line=p.lines.length+1;p.lines.push(text);p.trace.push({line,statement:text,variables:clone(p.state),output,explanation:why});if(output!==null)p.outputs.push({line,value:String(output)});}
function initProgram(){return{lines:[],trace:[],state:{},types:{},outputs:[]};}
function declare(p,type,name,value){p.types[name]=type;addLine(p,`${type} ${name} = ${literal(value,type)};`,s=>s[name]=value,`${name} starts at ${display(value,type)}.`);}
function assign(p,name,text,value,why){addLine(p,`${name} = ${text};`,s=>s[name]=value,why);}
function output(p,expr,value,why){const shown=p.types[expr]?display(value,p.types[expr]):String(value);addLine(p,`System.out.println(${expr});`,null,why,shown);}
function familyPool(difficulty){
  if(difficulty==="beginner")return ["reassignment","reassignment","selfReference","selfReference","doubleArithmetic","boolean","string","char","outputExpression"];
  if(difficulty==="intermediate")return ["selfReference","compound","compound","increment","multiple","multiple","intDivision","doubleArithmetic","boolean","string","char","outputExpression"];
  return ["compound","multiple","multiple","precedence","precedence","intDivision","intDivision","doubleArithmetic","boolean","string","char","outputExpression"];
}
function buildFamily(family,r,difficulty){
  const p=initProgram();
  if(family==="reassignment"){
    const type=pick(r,difficulty==="beginner"?["int","int","double","boolean","String","char"]:["int","double"]), name=pick(r,NAMES[type]);
    let a,b;
    if(type==="int"){a=int(r,2,18);do b=int(r,1,20);while(b===a);}
    else if(type==="double"){a=pick(r,[2.5,4.25,6.5,8.75,10.5]);do b=pick(r,[1.25,3.5,5.75,7.25,11.5]);while(b===a);}
    else if(type==="boolean"){a=pick(r,[true,false]);b=!a;}
    else if(type==="String"){a=pick(r,["Ready","Start","Hello","Level"]);b=pick(r,["Done","Go","Hi","Complete"]);if(a===b)b="Updated";}
    else {a=pick(r,["A","B","C","M"]);b=pick(r,["D","K","R","Z"]);}
    declare(p,type,name,a);assign(p,name,literal(b,type),b,`The reassignment replaces the old value. ${name} becomes ${display(b,type)}.`);
    if(r()<0.55)output(p,name,b,`Print the current value of ${name}: ${display(b,type)}.`);
  }
  if(family==="selfReference"){
    const type=pick(r,difficulty==="beginner"?["int","int","double"]:["int","double"]),name=pick(r,NAMES[type]);
    const start=type==="int"?int(r,3,15):pick(r,[3.5,5.25,7.5,9.75]);const add=type==="int"?int(r,2,7):pick(r,[0.5,1.25,2.5]);
    declare(p,type,name,start);const next=start+add;assign(p,name,`${name} + ${literal(add,type)}`,next,`Use ${name}'s previous value (${display(start,type)}) and add ${display(add,type)}. ${name} becomes ${display(next,type)}.`);
    if(difficulty!=="beginner"&&r()<0.5){const mult=type==="int"?int(r,2,3):2;const after=next*mult;assign(p,name,`${name} * ${mult}`,after,`Multiply the current value ${display(next,type)} by ${mult}. ${name} becomes ${display(after,type)}.`);}
    if(r()<0.65)output(p,name,p.state[name],`Print ${name}'s current value: ${display(p.state[name],type)}.`);
  }
  if(family==="compound"){
    const type=pick(r,["int","int","double"]),name=pick(r,NAMES[type]);const start=type==="int"?int(r,4,15):pick(r,[4.5,6.25,8.5,10.75]);declare(p,type,name,start);
    const ops=type==="int"?["+=","-=","*=","/=","%="]:["+=","-=","*="];const count=difficulty==="advanced"?int(r,2,3):int(r,1,2);
    for(let i=0;i<count;i++){const op=pick(r,ops);let n=type==="int"?int(r,2,5):pick(r,[0.5,1.25,2]);if((op==="/="||op==="%=")&&n===0)n=2;const before=p.state[name];let after;
      if(op==="+=")after=before+n; if(op==="-=")after=before-n;if(op==="*=")after=before*n;if(op==="/=")after=javaIntDiv(before,n);if(op==="%=")after=javaIntRem(before,n);
      addLine(p,`${name} ${op} ${literal(n,type)};`,s=>s[name]=after,`${op} updates ${name} using its current value ${display(before,type)}; it becomes ${display(after,type)}.`);
    }
    output(p,name,p.state[name],`Print the final value of ${name}: ${display(p.state[name],type)}.`);
  }
  if(family==="increment"){
    const name=pick(r,["count","points","level","steps"]),start=int(r,2,9);declare(p,"int",name,start);const ops=shuffle(r,["++","++","--"]).slice(0,difficulty==="advanced"?3:2);
    for(const op of ops){const before=p.state[name],after=before+(op==="++"?1:-1);addLine(p,`${name}${op};`,s=>s[name]=after,`${op} changes ${name} by ${op==="++"?"+1":"-1"}, from ${before} to ${after}.`);}if(r()<0.6)output(p,name,p.state[name],`Print ${name}: ${p.state[name]}.`);
  }
  if(family==="multiple"){
    const [a,b]=shuffle(r,["a","b","first","second","x","y"]).slice(0,2), av=int(r,3,12),bv=int(r,4,14);declare(p,"int",a,av);declare(p,"int",b,bv);
    const style=pick(r,["copy-change","reuse","exchange"]);
    if(style==="copy-change"){assign(p,a,b,p.state[b],`${a} receives a copy of ${b}'s current primitive value (${p.state[b]}).`);const delta=int(r,2,5);assign(p,b,`${a} + ${delta}`,p.state[a]+delta,`${b} changes using ${a}; ${a} stays ${p.state[a]} because primitive values are copied, not linked.`);}
    if(style==="reuse"){const beforeA=p.state[a];assign(p,b,a,p.state[a],`${b} receives a copy of ${a}'s current value (${beforeA}).`);const nv=int(r,8,18);assign(p,a,String(nv),nv,`${a} is reassigned to ${nv}; ${b} keeps its copied value.`);}
    if(style==="exchange"){const oldA=p.state[a],oldB=p.state[b];assign(p,a,b,oldB,`${a} becomes the current value of ${b} (${oldB}).`);assign(p,b,`${a} + ${oldA}`,p.state[a]+oldA,`${b} uses ${a}'s new value plus ${oldA}; assignment happens sequentially.`);}
    output(p,`${a} + ${b}`,p.state[a]+p.state[b],`Add the current values only for printing: ${p.state[a]} + ${p.state[b]} = ${p.state[a]+p.state[b]}. Printing does not change either variable.`);
  }
  if(family==="precedence"){
    const name=pick(r,["result","score","value","total"]),start=int(r,2,9),a=int(r,2,5),b=int(r,2,4);declare(p,"int",name,start);const parens=r()<0.5;const expr=parens?`(${name} + ${a}) * ${b}`:`${name} + ${a} * ${b}`;const after=parens?(start+a)*b:start+a*b;assign(p,name,expr,after,parens?`Parentheses happen first: ${start} + ${a} = ${start+a}, then multiply by ${b} to get ${after}.`:`Multiplication happens before addition: ${a} * ${b} = ${a*b}, then add ${start} to get ${after}.`);output(p,name,after,`Print ${after}.`);
  }
  if(family==="intDivision"){
    const name=pick(r,["value","result","total","pieces"]), divisor=int(r,2,6),negative=difficulty==="advanced"&&r()<0.35,start=(negative?-1:1)*int(r,8,29);declare(p,"int",name,start);const op=pick(r,["/","%"]),after=op==="/"?javaIntDiv(start,divisor):javaIntRem(start,divisor);assign(p,name,`${name} ${op} ${divisor}`,after,op==="/"?`Java int division truncates toward zero: ${start} / ${divisor} becomes ${after}.`:`Java remainder keeps what is left after truncating the quotient toward zero: ${start} % ${divisor} is ${after}.`);output(p,name,after,`Print ${after}.`);
  }
  if(family==="doubleArithmetic"){
    const name=pick(r,NAMES.double),start=pick(r,[2.5,4.25,6.5,8.75,10.5,12.25]),add=pick(r,[0.5,1.25,2.5,3.75]);declare(p,"double",name,start);const after=Number((start+add).toFixed(2));assign(p,name,`${name} + ${add}`,after,`Add ${add} to ${start}; ${name} becomes ${after}.`);if(difficulty!=="beginner"&&r()<0.4){const f=2,after2=Number((after*f).toFixed(2));addLine(p,`${name} *= ${f};`,s=>s[name]=after2,`Multiply the current double ${after} by ${f}; ${name} becomes ${after2}.`);}output(p,name,p.state[name],`Print ${display(p.state[name],"double")}.`);
  }
  if(family==="boolean"){
    const name=pick(r,NAMES.boolean),start=pick(r,[true,false]);declare(p,"boolean",name,start);if(r()<0.6){const after=!start;assign(p,name,`!${name}`,after,`! flips ${start} to ${after}.`);}else{const after=!start;assign(p,name,String(after),after,`${name} is reassigned from ${start} to ${after}.`);}output(p,name,p.state[name],`Print ${p.state[name]}.`);
  }
  if(family==="string"){
    const name=pick(r,NAMES.String),start=pick(r,["Hello","Go","Level","Score"]);declare(p,"String",name,start);const suffix=pick(r,["!"," ready"," up"," complete"]),after=start+suffix;assign(p,name,`${name} + ${JSON.stringify(suffix)}`,after,`String + concatenates text, so ${JSON.stringify(start)} becomes ${JSON.stringify(after)}.`);if(difficulty==="advanced"&&r()<0.55){const a=int(r,1,4),b=int(r,2,5);declare(p,"int","a",a);declare(p,"int","b",b);const parens=r()<0.5,val=parens?`Result: ${a+b}`:`Result: ${a}${b}`;output(p,parens?'"Result: " + (a + b)':'"Result: " + a + b',val,parens?`Parentheses add the numbers first (${a+b}), then concatenate: ${val}.`:`After a String appears, + continues left to right as concatenation: ${val}.`);}else output(p,name,after,`Print the String contents without adding quotation marks: ${after}.`);
  }
  if(family==="char"){
    const name=pick(r,NAMES.char),a=pick(r,["A","B","C","M"]),b=pick(r,["D","K","R","Z"]);declare(p,"char",name,a);assign(p,name,`'${b}'`,b,`${name} is reassigned from '${a}' to '${b}'.`);output(p,name,b,`Print the character ${b} without quote marks.`);
  }
  if(family==="outputExpression"){
    const name=pick(r,["count","score","points","value"]),start=int(r,3,12),delta=int(r,2,6);declare(p,"int",name,start);output(p,`${name} + ${delta}`,start+delta,`The expression is evaluated for printing: ${start} + ${delta} = ${start+delta}. ${name} itself stays ${start}.`);if(difficulty!=="beginner"&&r()<0.45){assign(p,name,`${name} + 1`,start+1,`Only this assignment changes ${name}; it becomes ${start+1}.`);}
  }
  return p;
}
function answerAt(p,format,r){
  const vars=Object.keys(p.types), outputLine=p.outputs.at(-1);
  if(format==="print"&&outputLine)return{format:"print",prompt:"What does this code print?",answer:outputLine.value,resultType:"output",checkpointLine:outputLine.line};
  if(format==="checkpoint"){
    const eligible=p.trace.filter((t,i)=>i>0&&i<p.trace.length-1&&Object.keys(t.variables).length);if(eligible.length){const step=pick(r,eligible),names=Object.keys(step.variables),name=pick(r,names);return{format:"checkpoint",prompt:`What is the value of ${name} immediately after line ${step.line}?`,answer:display(step.variables[name],p.types[name]),resultType:p.types[name],checkpointLine:step.line,resultVariable:name};}
  }
  const name=pick(r,vars),value=p.state[name];return{format:"final",prompt:`What is the final value of ${name}?`,answer:display(value,p.types[name]),resultType:p.types[name],checkpointLine:p.lines.length,resultVariable:name};
}
function misconceptionValues(p,a){
  const out=[], correct=String(a.answer), name=a.resultVariable;
  if(name){const values=p.trace.map(t=>t.variables[name]).filter(v=>v!==undefined).map(v=>display(v,p.types[name]));out.push(...values.slice(0,-1).reverse());}
  if(a.resultType==="int"||(/^[-]?\d+$/.test(correct)&&a.resultType!=="String"&&a.resultType!=="char")){const n=Number(correct);out.push(String(n+1),String(n-1),String(n+2));}
  if(a.resultType==="double"){const n=Number(correct);out.push(String(n+1),String(n-1),n.toFixed(2));}
  if(a.resultType==="boolean")out.push(correct==="true"?"false":"true");
  if(a.resultType==="String"||a.resultType==="char"||a.resultType==="output"){for(const t of p.trace){for(const v of Object.values(t.variables))out.push(String(v));}if(correct.startsWith("Result: ")){const digits=correct.match(/-?\d+/g)||[];if(digits.length)out.push("Result: "+digits.join(""));}}
  return [...new Set(out.map(String))].filter(v=>v!==correct);
}
function choicesFor(p,a,r){if(a.resultType==="boolean")return shuffle(r,["true","false"]);let wrong=misconceptionValues(p,a);let guard=0;while(wrong.length<3&&guard++<20){if(/^[-]?\d+(\.\d+)?$/.test(a.answer)){const n=Number(a.answer),v=String(n+int(r,-4,4));if(v!==a.answer&&!wrong.includes(v))wrong.push(v);}else{const v=pick(r,["unchanged","0","1","false","true","Result: 5","Hello"]);if(v!==a.answer&&!wrong.includes(v))wrong.push(v);}}return shuffle(r,[String(a.answer),...wrong.slice(0,3)]);}
export function generateTrace({difficulty="beginner",seed,family,format}={}){
  if(!DIFFICULTIES.includes(difficulty))throw Error("Unknown trace difficulty");const actualSeed=seed===undefined?Math.floor(Math.random()*0x100000000)>>>0:seed>>>0,r=mulberry32(actualSeed);const chosenFamily=family||pick(r,familyPool(difficulty));const p=buildFamily(chosenFamily,r,difficulty);
  const formats=p.outputs.length?["print","final","checkpoint"]:["final","checkpoint"], chosenFormat=format||pick(r,formats), a=answerAt(p,chosenFormat,r), code=p.lines.map((line,i)=>chosenFormat==="checkpoint"?`${i+1}. ${line}`:line).join("\n");
  const q={kind:"value",topic:TRACE_FAMILIES[chosenFamily],traceFamily:chosenFamily,difficulty,seed:actualSeed,format:a.format,prompt:a.prompt,answer:String(a.answer),choices:choicesFor(p,a,r),code,rawCode:p.lines.join("\n"),traceRows:p.trace,types:p.types,resultType:a.resultType,resultVariable:a.resultVariable||null,checkpointLine:a.checkpointLine,explanation:p.trace.map(t=>`Line ${t.line}: ${t.explanation}`).join("\n"),compilerSource:`public class Practice { public static void main(String[] args) {\n${p.lines.map(x=>'    '+x).join('\n')}\n} }`};
  if(q.choices.filter(x=>x===q.answer).length!==1)throw Error("answer choice mismatch");if(new Set(q.choices).size!==q.choices.length)throw Error("duplicate choices");return q;
}
