import {execute,canonical} from './ir.js';
import {MODEL_NAMES,LEVELS} from './models.js';

export function analyzeDifficulty(program){
 const run=execute(program),features={operations:run.relevantOperations,arithmetic:0,comparisons:0,loops:0,loopStages:0,nesting:0,conditions:0,mutations:0,references:0,reassignments:0,indirection:0,feedback:false,twoDimensional:false};
 const needed=s=>run.relevantStatements.has(run.statementIds.get(s))||s.body?.some(needed)||s.yes?.some(needed)||s.no?.some(needed);
 const expression=(e,insideIndex=false)=>{if(!e||typeof e!=='object')return;if(e.op==='binary'){if(['+','-','*','/','%'].includes(e.operator))features.arithmetic++;else features.comparisons++;expression(e.left,insideIndex);expression(e.right,insideIndex);}if(e.op==='read'){if(insideIndex)features.indirection++;expression(e.index,true);expression(e.column,true);}if(e.op==='length')expression(e.row,true);};
 const scalarWrites=(list,out=new Set())=>{for(const s of list){if(s.op==='assign'&&!s.index)out.add(s.name);if(s.body)scalarWrites(s.body,out);if(s.yes)scalarWrites(s.yes,out);if(s.no)scalarWrites(s.no,out);}return out;};
 const readsScalar=(e,names)=>e&&typeof e==='object'&&(e.op==='variable'&&names.has(e.name)||Object.values(e).some(value=>typeof value==='object'&&readsScalar(value,names)));
 function statements(list,nesting=0,feedbackNames=new Set()){for(const s of list.filter(needed)){
   if(s.op==='array'&&Array.isArray(s.values[0]))features.twoDimensional=true;
   if(s.op==='loop'){features.loops++;if(nesting===0)features.loopStages++;features.nesting=Math.max(features.nesting,nesting+1);expression(s.condition);expression(s.start);statements(s.body,nesting+1,new Set([...feedbackNames,...scalarWrites(s.body)]));}
   if(s.op==='if'){features.conditions++;expression(s.condition);statements(s.yes,nesting,feedbackNames);statements(s.no,nesting,feedbackNames);}
   if(s.op==='reference'||s.op==='row-reference'||s.op==='returned-reference')features.references++;
   if(s.op==='reference'&&!s.declare||s.op==='array'&&!s.declare)features.reassignments++;
   if(s.op==='assign'&&s.index){features.mutations++;if(nesting&&readsScalar(s.value,feedbackNames))features.feedback=true;}
   if(s.value)expression(s.value);if(s.index)expression(s.index,true);if(s.column)expression(s.column,true);
   if(s.op==='call'){features.references++;statements(s.body,nesting);}
 }}statements(program.statements);expression(program.output);
 const advanced=(features.reassignments>0&&features.references>0&&features.mutations>0)||(features.loopStages>=2&&features.mutations>=2)||(features.feedback&&features.mutations>0)||(features.twoDimensional&&features.mutations>=2&&features.conditions>0&&features.arithmetic>=4);
 const intermediate=features.operations>=2&&(features.mutations>0||features.conditions>0||features.indirection>0||features.references>0||features.arithmetic>=3);
 return {features,minimumBand:advanced?'Advanced':intermediate?'Intermediate':'Beginner',run};
}
export function validateCandidate(q){
 const problems=[];if(!MODEL_NAMES[q.format]?.includes(q.reasoningModel))problems.push('unregistered model');if(!LEVELS.includes(q.difficulty))problems.push('invalid difficulty');
 const {run,features,minimumBand}=analyzeDifficulty(q.semanticProgram);
 if(String(run.answer)!==q.expectedOutput)problems.push('answer disagrees with semantic execution');
 if(q.kind==='choice'&&(q.choices.length!==4||new Set(q.choices).size!==4||q.choices.filter(x=>x===q.answer).length!==1))problems.push('choices must contain one correct answer and three distinct distractors');
 if(['cell','apply'].includes(q.kind)&&(!Number.isInteger(Number(q.correctCell))||Number(q.correctCell)<0||Number(q.correctCell)>=q.values.length))problems.push('invalid cell interaction');
 if(q.kind==='swap'&&(new Set(q.correctCells).size!==2||q.correctCells.some(i=>Number(i)<0||Number(i)>=q.values.length)))problems.push('invalid swap interaction');
 if(q.kind==='cell-2d'){const [r,c]=q.correctCell.split(',').map(Number);if(!Number.isInteger(r)||!Number.isInteger(c)||!q.grid[r]||c<0||c>=q.grid[r].length)problems.push('invalid grid interaction');}
 if(q.code.split('\n').some(line=>/^\s*(?:for|if|while)\s*\(/.test(line)&&!line.trimEnd().endsWith('{')))problems.push('unbraced control structure');
 if(!q.semanticFingerprint.startsWith(canonical(q.semanticProgram,run)))problems.push('incorrect semantic fingerprint');
 // The rubric gate is deliberately independent of the declared difficulty metadata.
 if(q.difficulty==='Intermediate'&&minimumBand==='Beginner')problems.push('minimum solution is foundational');
 if(q.difficulty==='Advanced'&&minimumBand!=='Advanced')problems.push('advanced dependencies are not demonstrated');
 if(q.difficulty==='Beginner'&&minimumBand==='Advanced')problems.push('foundational question has interacting advanced dependencies');
 if(q.difficulty==='Beginner'&&['element','perform-update','access-2d','update-2d'].includes(q.format)&&(features.arithmetic>2||features.indirection>0&&features.arithmetic>0||features.conditions>0&&features.arithmetic>1))problems.push('foundational indexing exceeds one or two straightforward operations');
 return {valid:problems.length===0,problems,features,minimumBand};
}
