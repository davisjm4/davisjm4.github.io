import * as classes from '../../java-games/class-object-lab/class-engine.js';
import * as lists from '../../java-games/arraylist-lab/engine.js';
import * as linked from '../../java-games/linkedlist-lab/engine.js';
import * as methods from '../../java-games/method-constructor-lab/engine.js';
import * as debug from '../../java-games/debugger-lab/debugger-engine.js';
import * as docs from '../../java-games/documentation-lab/engine.js';
import * as inheritance from '../../java-games/inheritance-polymorphism-lab/engine.js';
import * as bool from '../../java-games/boolean-conditional-lab/engine.js';
import * as variable from '../../java-games/engine.js';
import * as robot from '../../java-games/robot-algorithms/engine.js';
import * as math from '../../java-games/math-lab/expansion/generator.js';
import {item,source,nativeModes,rng,seeded,blockText,text,table,sourceSpans} from './assessment-item.js?v=package-f-20261027';
export const javaSources=[];
javaSources.push(source('class-object','Class & Object Lab',Object.entries(classes.modeNames).map(([id,name])=>({id,name,difficulties:classes.difficulties})),(mode,level,seed,points)=>{
 const q=classes.generateChallenge({mode,difficulty:level,seed});
 return item({id:'class-object',name:'Class & Object Lab',mode,difficulty:q.difficulty,seed,points,prompt:q.prompt,context:q.context,code:q.code,choices:q.choices,answerIndex:q.choices.indexOf(q.answer),explanation:q.explanation,family:q.family,raw:q,responses:q.choices,grade:r=>classes.assessClassObject(q,r)});
}));
javaSources.push(source('arraylist','ArrayList Lab',nativeModes(lists.MODES),(mode,level,seed,points)=>{
 const q=lists.generate(mode,lists.makeRng(seed));if(q.kind==='cells'||lists.validateChallenge(q).length)return null;
 let choices,responses,answerIndex;
 if(q.kind==='choice'){choices=q.choices.map(c=>c.kind==='list'?lists.listStr(c.value.map(v=>lists.lit(q.list?.type||'Integer',v))):String(c.value??c.text));responses=q.choices.map((_,i)=>i);answerIndex=q.answer}
 else{const max=q.kind==='gap'?q.list.values.length:q.list.values.length-1,indices=[q.answer,...Array.from({length:max+1},(_,i)=>i).filter(i=>i!==q.answer).slice(0,3)];choices=indices.map(i=>`Index ${i}`);responses=indices;answerIndex=0}
 const context=q.list?`ArrayList<${q.list.type}> ${q.list.name}, initially ${JSON.stringify(q.list.values)}. Indices start at 0. A gap index is the position before the current element, or size() for insertion at the end.`:'';
 return item({id:'arraylist',name:'ArrayList Lab',mode,seed,points,prompt:q.question.replace(/tap the element/ig,'choose the index of the element').replace(/Tap the element/ig,'Choose the index of the element'),context,code:q.code||'',choices,answerIndex,explanation:q.explanation,family:q.template,raw:q,responses,grade:r=>lists.assess(q,r)});
}));
javaSources.push(source('linkedlist','LinkedList Lab — Tracing & Collections',nativeModes({trace:linked.MODES.trace,collections:linked.MODES.collections}),(mode,level,seed,points)=>{
 const q=linked.generate(mode,linked.makeRng(seed));
 const context=q.values?`Singly linked nodes from head, in this order: ${JSON.stringify(q.values)}. Each node has int value and Node next; the last next is null. ${q.prompt||''}`:q.prompt||'';
 return item({id:'linkedlist',name:'LinkedList Lab',mode,seed,points,prompt:q.label||q.question||q.prompt,context,code:q.code||'',choices:q.choices,answerIndex:q.answer,explanation:q.explanation,family:q.family,raw:q,responses:q.choices.map((_,i)=>i),grade:r=>linked.assess(q,r)});
}));
javaSources.push(source('method-constructor','Method & Constructor Lab — Choice Modes',nativeModes(Object.fromEntries(Object.entries(methods.MODES).filter(([id])=>!['order-args'].includes(id)))),(mode,level,seed,points)=>{
 const q=methods.generate(mode,methods.makeRng(seed));if(!['choice','select'].includes(q.kind)||!methods.validateChallenge(q).ok)return null;
 let choices,responses,answerIndex;
 if(q.kind==='choice'){choices=q.choices.map(c=>c.text);responses=q.choices.map((_,i)=>i);answerIndex=q.answer}
 else{
  const target=q.answers[0],model=q.blocks[target.block].model,tokens=model.tokens,options=[target,...tokens.filter(t=>t.sel&&!methods.assess(q,{block:target.block,span:[t.i,t.i]})).slice(0,3).map(t=>({block:target.block,span:[t.i,t.i]}))];
  choices=options.map(r=>{const m=q.blocks[r.block].model,start=m.tokens.slice(0,r.span[0]).map(t=>t.text).join('').length,content=m.tokens.slice(r.span[0],r.span[1]+1).map(t=>t.text).join('');return `Block ${r.block+1}, characters ${start+1}–${start+content.length}: ${JSON.stringify(content)}`});responses=options;answerIndex=0;
 }
 return item({id:'method-constructor' ,name:'Method & Constructor Lab',mode,seed,points,prompt:q.question.replace(/^Select /,'Choose ')+(q.kind==='select'?' Choose the exact span; character positions start at 1 within the labeled code block, excluding its file-label comment.':''),context:q.prompt||'',code:blockText(q.blocks),choices,answerIndex,explanation:q.explanation,family:q.generator,raw:q,responses,grade:r=>methods.assess(q,r)});
}));
javaSources.push(source('debugger','Debugger Lab',Object.entries(debug.formatNames).map(([id,name])=>({id,name,difficulties:debug.DIFFICULTIES})),(mode,level,seed,points)=>{
 const q=debug.generateDebugger(mode,{seed,difficulty:level});let choices=q.choices,responses,answerIndex;
 if(q.kind==='line'){
  const rows=(q.lines||q.code.split('\n')).map((line,i)=>({line:i+1,text:typeof line==='string'?line:line.text||String(line)}));
  const target=rows.find(r=>r.line===Number(q.correctLine));if(!target)return null;
  const options=[target,...rows.filter(r=>r.line!==target.line).slice(0,3)];choices=options.map(r=>`Line ${r.line}: ${r.text}`);responses=options.map(r=>({line:r.line}));answerIndex=0;
 }else{responses=choices.map(answer=>({answer}));answerIndex=choices.indexOf(q.answer)}
 return item({id:'debugger',name:'Debugger Lab',mode,difficulty:q.difficulty,seed,points,prompt:q.prompt,context:q.requirement||'',code:q.source||q.code,choices,answerIndex,explanation:q.explanation,family:q.reasoningFamily,raw:q,responses,grade:r=>debug.assessDebugger(q,r)});
}));
export const documentationEligible=Object.fromEntries(Object.entries(docs.ITEMS).map(([mode,items])=>[mode,items.filter(i=>['choice','line','docline'].includes(i.kind))]).filter(([,items])=>items.length));
javaSources.push(source('documentation','Documentation Lab — Interpretation',nativeModes(Object.fromEntries(Object.keys(documentationEligible).map(id=>[id,docs.MODES[id]]))),(mode,level,seed,points)=>{
 const pool=documentationEligible[mode],q=docs.instantiate(pool[seed%pool.length],docs.makeRng(seed));let choices,responses,answerIndex;
 if(q.kind==='choice'){choices=q.options.map(o=>o.text);responses=q.options.map((_,i)=>i);answerIndex=q.answer}
 else{
  const rows=q.kind==='docline'?q.lines:q.blocks[0].code.split('\n'),selectable=q.selectable||rows.map((_,i)=>i),correct=q.answer[0];
  const ids=[correct,...selectable.filter(i=>!q.answer.includes(i)).slice(0,3)];
  choices=ids.map(i=>`Line ${i+1}: ${typeof rows[i]==='string'?rows[i]:rows[i]?.text||text(rows[i])}`);responses=ids;answerIndex=0;
 }
 const context=q.docs.map(d=>docs.docLines(d).map(l=>typeof l==='string'?l:l.text||text(l)).join('\n')).join('\n\n');
 return item({id:'documentation',name:'Documentation Lab',mode,seed,points,prompt:q.question.replace(/^Click /,'Choose '),context,code:blockText(q.blocks),choices,answerIndex,explanation:q.explanation,family:q.family,raw:q,responses,grade:r=>docs.assess(q,r).correct,sourceQuestionId:q.id});
}));
// Only native single-choice items; hierarchy multi-select/trace tuples remain excluded.
export const inheritanceEligible=inheritance.ITEMS.filter(i=>{try{return inheritance.instantiate(i,inheritance.makeRng(731)).kind==='choice'}catch{return false}});
const inheritanceModes=[...new Set(inheritanceEligible.map(i=>i.mode))];
javaSources.push(source('inheritance','Inheritance & Polymorphism — Choice Questions',nativeModes(Object.fromEntries(inheritanceModes.map(id=>[id,inheritance.MODES[id]]))),(mode,level,seed,points)=>{
 const pool=inheritanceEligible.filter(i=>i.mode===mode),q=inheritance.instantiate(pool[seed%pool.length],inheritance.makeRng(seed));
 const choices=q.options.map(o=>typeof o==='string'?o:o.text),context=[q.prompt,q.instructions,q.diagram&&JSON.stringify(q.diagram)].filter(Boolean).join('\n\n');
 return item({id:'inheritance',name:'Inheritance & Polymorphism Lab',mode,seed,points,prompt:q.question,context,code:blockText(q.blocks),choices,answerIndex:q.answer,explanation:q.explanation,family:q.family,raw:q,responses:choices.map((_,i)=>i),grade:r=>inheritance.assess(q,r).correct,sourceQuestionId:q.id});
}));
export const expandedBooleanModes=['evaluate','identify','truthTable','switchIf','coverage'].map(id=>({id,name:bool.booleanGame.modes[id],difficulties:bool.DIFFICULTIES}));
export function generateExpandedBoolean(mode,level,seed,points){
 const q=bool.generate(mode,bool.makeRng(seed),level);let choices=q.choices,responses,answerIndex=q.answer;
 if(q.kind==='select'){
  const target=q.tokens[q.answer],tokens=[target,...q.tokens.filter(t=>!t.correct&&t.text.trim()).slice(0,3)];
  choices=tokens.map(t=>`Token ${t.id+1}: ${t.text}`);responses=tokens.map(t=>t.id);answerIndex=0;
 }else responses=q.choices.map((_,i)=>i);
 const context=q.table?table(Object.keys(q.table[0]),q.table.map(row=>Object.values(row).map(v=>v===null?'?':String(v)))):'';
 return item({id:'boolean',name:bool.booleanGame.name,mode,difficulty:level,seed,points,prompt:q.question,context,code:q.code,choices,answerIndex,explanation:q.explanation,family:q.family,raw:q,responses,grade:r=>bool.assess(q,r)});
}
export const expandedVariableModes=variable.identifyVariants.map(id=>({id:'identify/'+id,name:'Identify · '+id}));
export function generateExpandedVariable(mode,level,seed,points){
 const q=seeded(seed,()=>{variable.resetVariableLabState();return variable.generate('variable-lab','identify',mode.split('/')[1])});
 let choices=q.choices?.map(String),responses=choices,answerIndex=choices?.indexOf(String(q.answer));
 if(q.kind==='select'){
  const nodes=variable.nodes(q.root),target=nodes.find(n=>n.id===q.answerId),pool=[target],spans=sourceSpans(q.root),seen=new Set([JSON.stringify(spans.get(target.id))]);for(const n of nodes){const key=JSON.stringify(spans.get(n.id));if(n.text.trim()&&!seen.has(key)){pool.push(n);seen.add(key)}if(pool.length===4)break;}
  choices=pool.map((n,i)=>`Characters ${sourceSpans(q.root).get(n.id).start+1}–${sourceSpans(q.root).get(n.id).end}: ${JSON.stringify(n.text)}`);responses=pool.map(n=>({id:n.id}));answerIndex=0;
 }else responses=choices.map(v=>({answer:v}));
 return item({id:'variable',name:'Variable Lab',mode,seed,points,prompt:q.prompt.replace(/^Select /,'Choose ')+(q.kind==='select'?' Choose the exact source span; character positions start at 1.':''),code:q.code,context:q.context||'',choices,answerIndex,explanation:q.explanation,family:q.topic,raw:q,responses,grade:r=>variable.assess(q,r)});
}
export const expandedMathModes=Object.entries(math.EXPANSION_MODES).map(([id,name])=>({id,name,difficulties:math.DIFFICULTIES}));
export function generateExpandedMath(mode,level,seed,points){
 const q=math.generateChallenge({mode,difficulty:level,seed});if(!q||!math.validate(q))return null;
 return item({id:'math',name:'Math Lab',mode,difficulty:q.difficulty,seed,points,prompt:q.prompt,code:q.code,choices:q.choices,answerIndex:q.correctIndex,explanation:q.explanation,family:q.family,raw:q,responses:q.choices,grade:r=>math.assessExpansion(q,r)});
}
export {classes,lists,methods,debug,docs,inheritance,bool,math};

javaSources.push(source('robot-algorithms','Robot Algorithms — Prediction',nativeModes(Object.fromEntries(['predict','loops','conditionals','methods'].map(id=>[id,robot.MODES[id]]))),(mode,level,seed,points)=>{
 const q=robot.generate(mode,robot.makeRng(seed));if(q.kind!=='choice'||!q.choices||q.choices.length!==4)return null;
 const w=q.world,context=[q.prompt,q.note,`Grid: ${w.rows} rows × ${w.cols} columns. Row 0 is the top; column 0 is the left. Rows increase downward; columns increase rightward. Start: row ${w.start.r}, column ${w.start.c}, facing ${robot.DIRS[w.start.d]}. Walls: ${w.walls.length?w.walls.map(v=>'('+v+')').join('; '):'none'}. Goal: ${w.goal?'row '+w.goal.r+', column '+w.goal.c:'none'}. All other cells are open. A move advances one cell; turns are quarter-turns. canMove tests the next cell; atGoal tests the current cell.`,q.code.includes('void run(')?'Call run() to begin; other method declarations do not execute by themselves.':'Execute the shown statements in order.'].filter(Boolean).join('\n\n');
 const result=robot.runSource(q.code,w),key=robot.keyFor(q.ask,result);
 return item({id:'robot-algorithms',name:'Robot Algorithms',mode,seed,points,prompt:q.question.replace(' Move the robot to that cell.','').replace(' Move and turn the robot to match.','').replace(' Turn the robot to match.',''),context,code:q.code,choices:q.choices.map(c=>c.text),answerIndex:q.choices.findIndex(c=>c.key===key),explanation:q.explanation,family:q.family,raw:q,responses:q.choices.map(c=>c.key),grade:r=>r===key});
}));
