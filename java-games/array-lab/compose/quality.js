import {execute,canonical} from './ir.js';
import {MODEL_NAMES,LEVELS} from './models.js?v=array-feedback-20261024';
import {redundantArithmetic} from './minimum-path.js';

export function analyzeDifficulty(program){
 const run=execute(program),features={operations:run.relevantOperations,arithmetic:0,comparisons:0,loops:0,loopStages:0,nesting:0,conditions:0,mutations:0,references:0,reassignments:0,requiredDataObjects:new Set(run.slice.map(e=>e.key.match(/^#(\d+):/)?.[1]).filter(x=>x!==undefined)).size,indirection:0,feedback:false,indexFeedback:false,arrayDependency:false,mutationsInteract:false,dependentLoopLimits:false,twoDimensional:false};
 const mutationAncestors=new Map();for(const event of run.slice){const ancestors=new Set();for(const id of event.dependencies)for(const statement of mutationAncestors.get(id)||[])ancestors.add(statement);if(event.kind==='mutation'){features.arrayDependency ||= ancestors.has(event.statement);features.mutationsInteract ||= ancestors.size>0;ancestors.add(event.statement);}mutationAncestors.set(event.id,ancestors);}
 const needed=s=>run.relevantStatements.has(run.statementIds.get(s))||s.body?.some(needed)||s.yes?.some(needed)||s.no?.some(needed);
 const expression=(e,insideIndex=false)=>{if(!e||typeof e!=='object')return;if(e.op==='cell-index'){expression(e.index,true);expression(e.column,true);return;}if(e.op==='cell-pair'){expression(e.left,true);expression(e.right,true);return;}if(e.op==='binary'){if(['+','-','*','/','%'].includes(e.operator))features.arithmetic++;else features.comparisons++;expression(e.left,insideIndex);expression(e.right,insideIndex);}if(e.op==='read'){if(insideIndex)features.indirection++;expression(e.index,true);expression(e.column,true);}if(e.op==='length')expression(e.row,true);};
 const scalarWrites=(list,out=new Set())=>{for(const s of list){if(s.op==='assign'&&!s.index)out.add(s.name);if(s.body)scalarWrites(s.body,out);if(s.yes)scalarWrites(s.yes,out);if(s.no)scalarWrites(s.no,out);}return out;};
 const readsScalar=(e,names)=>e&&typeof e==='object'&&(e.op==='variable'&&names.has(e.name)||Object.values(e).some(value=>typeof value==='object'&&readsScalar(value,names)));
 const counterRead=(e,names)=>e&&typeof e==='object'&&e.op!=='length'&&(e.op==='variable'&&names.has(e.name)||Object.values(e).some(value=>typeof value==='object'&&counterRead(value,names)));
 function statements(list,nesting=0,feedbackNames=new Set(),outerCounters=new Set()){for(const s of list.filter(needed)){
   if(s.op==='array'&&Array.isArray(s.values[0]))features.twoDimensional=true;
   if(s.op==='loop'){features.loops++;if(nesting===0)features.loopStages++;features.nesting=Math.max(features.nesting,nesting+1);features.dependentLoopLimits ||= !!(counterRead(s.start,outerCounters)||counterRead(s.condition,outerCounters));expression(s.condition);expression(s.start);statements(s.body,nesting+1,new Set([...feedbackNames,...scalarWrites(s.body)]),new Set([...outerCounters,s.name]));}
   if(s.op==='if'){features.conditions++;expression(s.condition);statements(s.yes,nesting,feedbackNames,outerCounters);statements(s.no,nesting,feedbackNames,outerCounters);}
   if(s.op==='reference'||s.op==='row-reference'||s.op==='returned-reference')features.references++;
   if(s.op==='reference'&&!s.declare||s.op==='array'&&!s.declare)features.reassignments++;
   if(s.op==='assign'&&s.index){features.mutations++;if(nesting&&readsScalar(s.value,feedbackNames))features.feedback=true;if(nesting&&(readsScalar(s.index,feedbackNames)||readsScalar(s.column,feedbackNames)))features.indexFeedback=true;}
   if(s.value)expression(s.value);if(s.size)expression(s.size);if(s.index)expression(s.index,true);if(s.column)expression(s.column,true);
   if(s.op==='call'){features.references++;statements(s.body,nesting);if(s.output)expression(s.output);}
 }}statements(program.statements);expression(program.output);
 const advanced=(features.reassignments>0&&features.references>0&&features.mutations>0&&features.requiredDataObjects>=2)||(features.loopStages>=2&&features.mutations>=2)||((features.feedback||features.indexFeedback&&features.conditions>0)&&features.arrayDependency)||(features.twoDimensional&&features.mutations>=2&&features.conditions>0&&features.arithmetic>=4&&features.mutationsInteract);
 const intermediate=features.dependentLoopLimits||(features.arrayDependency&&features.arithmetic>0)||features.operations>=2&&(features.mutations>0||features.conditions>0||features.indirection>0||features.references>0||features.arithmetic>=3);
 return {features,minimumBand:advanced?'Advanced':intermediate?'Intermediate':'Beginner',run};
}
export function validateCandidate(q){
 const problems=[];if(!MODEL_NAMES[q.format]?.includes(q.reasoningModel))problems.push('unregistered model');if(!LEVELS.includes(q.difficulty))problems.push('invalid difficulty');
 const {run,features,minimumBand}=analyzeDifficulty(q.semanticProgram);
 if(String(run.answer)!==q.expectedOutput)problems.push('answer disagrees with semantic execution');
 if(run.error&&!['ArrayIndexOutOfBoundsException','NegativeArraySizeException','NullPointerException','ArithmeticException','Compile-time error'].includes(run.error))problems.push('unsupported Java outcome');
 if(q.kind==='choice'&&(q.choices.length!==4||new Set(q.choices).size!==4||q.choices.filter(x=>x===q.answer).length!==1))problems.push('choices must contain one correct answer and three distinct distractors');
 if(['cell','apply'].includes(q.kind)&&(!Number.isInteger(Number(q.correctCell))||Number(q.correctCell)<0||Number(q.correctCell)>=q.values.length))problems.push('invalid cell interaction');
 if(q.kind==='swap'&&(new Set(q.correctCells).size!==2||q.correctCells.some(i=>Number(i)<0||Number(i)>=q.values.length)))problems.push('invalid swap interaction');
 if(q.kind==='cell-2d'){const [r,c]=q.correctCell.split(',').map(Number);if(!Number.isInteger(r)||!Number.isInteger(c)||!q.grid[r]||c<0||c>=q.grid[r].length)problems.push('invalid grid interaction');}
 if(q.code.split('\n').some(line=>/^\s*(?:for|if|while)\s*\(/.test(line)&&!line.trimEnd().endsWith('{')))problems.push('unbraced control structure');
 if(q.semanticFingerprint!==canonical(q.semanticProgram))problems.push('incorrect semantic fingerprint');
 if(redundantArithmetic(q.semanticProgram).length)problems.push('shorter solution cancels or repeats generated arithmetic');
 // The rubric gate is deliberately independent of the declared difficulty metadata.
 if(q.difficulty==='Intermediate'&&minimumBand==='Beginner')problems.push('minimum solution is foundational');
 if(q.difficulty==='Intermediate'&&minimumBand==='Advanced')problems.push('intermediate question has interacting advanced dependencies');
 if(q.difficulty==='Advanced'&&minimumBand!=='Advanced')problems.push('advanced dependencies are not demonstrated');
 if(q.difficulty==='Beginner'&&q.format==='in-place'&&q.reasoningModel!=='compact-values'&&features.mutations===0)problems.push('foundational transformation must affect the requested value');
 if((q.difficulty==='Advanced'||q.difficulty==='Beginner'&&q.format==='in-place'&&q.reasoningModel!=='compact-values')&&features.mutations>0){const strip=list=>list.filter(s=>!(s.op==='assign'&&s.index)).map(s=>({...s,...(s.body?{body:strip(s.body)}:{}),...(s.yes?{yes:strip(s.yes),no:strip(s.no)}:{})}));if(String(execute({...q.semanticProgram,statements:strip(q.semanticProgram.statements)}).answer)===String(run.answer))problems.push('array updates do not affect the requested result for this sample');}
 // An output wrapper cannot supply the only dependency on the algorithm.
 if(q.difficulty==='Advanced'&&['search','traversal'].includes(q.format)){
   const strip=list=>list.filter(s=>!(s.op==='assign'&&s.index)).map(s=>({...s,...(s.body?{body:strip(s.body)}:{}),...(s.yes?{yes:strip(s.yes),no:strip(s.no)}:{})}));
   const core={...q.semanticProgram,output:q.coreObservation};
   if(String(execute(core).answer)===String(execute({...core,statements:strip(core.statements)}).answer))problems.push('the algorithm result must depend on the advanced transformation, independently of output arithmetic');
   if(q.format==='search'&&['existence','all-match'].includes(q.reasoningModel)){
     const decisive=run.events.find(e=>e.kind==='scalar'&&e.key==='result'&&e.value===(q.reasoningModel==='existence'));
     if(decisive){const seen=new Set(),counts=new Map();const walk=id=>{if(seen.has(id))return;seen.add(id);const e=run.events[id];if(!e)return;if(e.kind==='mutation')counts.set(e.statement,(counts.get(e.statement)||0)+1);e.dependencies.forEach(walk);};walk(decisive.id);
       if(![...counts.values()].some(n=>n>=2))problems.push('the first decisive Boolean result bypasses loop-carried reasoning');
     }
   }
 }
 if(q.difficulty==='Beginner'&&minimumBand==='Advanced')problems.push('foundational question has interacting advanced dependencies');
 if(q.difficulty==='Beginner'&&features.references>0&&features.mutations>0)problems.push('reference relationships combined with mutation require Intermediate or Advanced');
 if(q.difficulty==='Beginner'&&['element','perform-update','access-2d','update-2d'].includes(q.format)&&(features.arithmetic+features.indirection>2||features.conditions>0&&features.arithmetic>1))problems.push('foundational indexing exceeds one or two straightforward operations');
 return {valid:problems.length===0,problems,features,minimumBand};
}
