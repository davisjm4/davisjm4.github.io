import * as E from '../../csp-games/engine.js';
import * as practice from '../../csp-games/practice-engine.js';
import {item,source,nativeModes,rng,seeded,text,table} from './assessment-item.js?v=package-f-20261027';
const numeric=(answer,seed)=>{const n=Number(answer),out=[String(answer)];for(const v of [n+1,n-1,n+2,n*2,0,1])if(!out.includes(String(v))&&Number.isFinite(v))out.push(String(v));return out.slice(0,4)};
const finish=(id,name,mode,seed,points,prompt,context,code,choices,correct,explanation,raw,family=mode)=>item({id,name,mode,seed,points,prompt,context,code,choices,answerIndex:choices.indexOf(String(correct)),explanation,family,raw,responses:choices,grade:r=>r===String(correct)});
export const coreCspSources=[];
coreCspSources.push(source('boolean-gatekeeper','Boolean Gatekeeper — Evaluate',[{id:'evaluate',name:'Evaluate the Expression'}],(mode,level,seed,points)=>{
 const q=seeded(seed,()=>E.booleanChallenge()),answer=E.evaluate(q.e,q.values);
 return finish('boolean-gatekeeper','Boolean Gatekeeper',mode,seed,points,'What Boolean value does the expression produce?',`x = ${q.values.x}; y = ${q.values.y}`,E.formatExpression(q.e),['true','false'],answer,E.explainExpression(q.e,q.values),q);
}));
coreCspSources.push(source('binary-builder','Binary Builder — Representation',nativeModes({capacity:'Unsigned Capacity',overflow:'Overflow & Wrap',pixels:'Pixel Storage'}),(mode,level,seed,points)=>{
 const bits=[4,6,8,16][seed%4],q=seeded(seed,()=>E.binaryExtension(mode,bits));let prompt,context,answer,why;
 if(mode==='capacity'){prompt='How many distinct values can the unsigned identifier represent?';context=`The identifier contains ${bits} independent bits.`;answer=q.capacity;why=`There are 2^${bits} = ${answer} bit patterns; the maximum unsigned value is ${q.max}.`}
 if(mode==='overflow'){prompt='What value is stored after adding a and b under the stated wrap rule?';context=`Unsigned ${bits}-bit values: a = ${q.a}, b = ${q.b}. Values range from 0 through ${q.max}. Store the sum modulo ${q.capacity} (discard overflow beyond the ${bits} bits).`;answer=q.result;why=`The mathematical sum is ${q.a+q.b}; modulo ${q.capacity} gives ${answer}.`}
 if(mode==='pixels'){prompt='How many bits are needed to store all nine pixel codes, ignoring metadata?';context=`There are 9 pixels, each stored with exactly ${bits} bits.`;answer=q.size;why=`9 × ${bits} = ${answer} bits.`}
 return finish('binary-builder','Binary Builder',mode,seed,points,prompt,context,'',numeric(answer,seed),answer,why,q);
}));
coreCspSources.push(source('list-lab','List Lab — Operation Tracing',[{id:'trace',name:'Trace List Operations'}],(mode,level,seed,points)=>{
 const q=seeded(seed,()=>E.listChallenge()),answer=JSON.stringify(E.runOperations(q.start,q.ops)),wrong=[JSON.stringify(q.start),JSON.stringify([...q.target].reverse()),JSON.stringify(q.target.slice(1)),JSON.stringify([...q.target,0])];
 const choices=[answer,...wrong.filter((v,i,a)=>v!==answer&&a.indexOf(v)===i)].slice(0,4);
 return finish('list-lab','List Lab',mode,seed,points,'What is the final list?',`All indices start at 1. Initial numbers = ${JSON.stringify(q.start)}. INSERT places a value before the indexed element; APPEND adds at the end; REMOVE removes the indexed element.`,q.ops.map(E.operationText).join('\n'),choices,answer,`Apply the four operations in order to the current list. The final list is ${answer}.`,q);
}));
coreCspSources.push(source('binary-search-hunt','Binary Search Hunt — Trace',[{id:'trace',name:'Count Inspected Midpoints'}],(mode,level,seed,points)=>{
 const q=seeded(seed,()=>E.searchChallenge([7,15,31][seed%3])),trace=E.searchTrace(q.values,q.target),answer=trace.length;
 return finish('binary-search-hunt','Binary Search Hunt',mode,seed,points,'How many midpoints are inspected before the target is found or the search interval becomes empty?',`Sorted values = ${JSON.stringify(q.values)}; target = ${q.target}. Use zero-based low = 0 and high = length − 1, mid = floor((low + high)/2). Inspect one midpoint per step; stop on equality, otherwise discard that midpoint and the impossible half. Count inspections, including an unsuccessful last inspection.`,'',numeric(answer,seed),answer,`The source search trace inspects ${answer} midpoint${answer===1?'':'s'}.`,q);
}));
coreCspSources.push(source('algorithm-race','Algorithm Race — Work Comparison',nativeModes({search:'Search Comparison',duplicates:'Duplicate Detection',sum:'Running Total vs. Prefix Recalculation'}),(mode,level,seed,points)=>{
 const q=seeded(seed,()=>E.raceChallenge(mode)),answer=q.steps[0]===q.steps[1]?'Same number of steps':q.labels[q.steps[0]<q.steps[1]?0:1],choices=[...q.labels,'Same number of steps'];
 return finish('algorithm-race','Algorithm Race',mode,seed,points,'Which algorithm takes fewer steps in the stated model?',[q.kind==='search'?`Sorted values = ${JSON.stringify(q.values)}; target = ${q.target}.`: `Input size n = ${q.n}; all values are distinct when testing duplicates.`,q.explain].join('\n'),' ',choices,answer,`${q.labels[0]}: ${q.steps[0]} steps; ${q.labels[1]}: ${q.steps[1]} steps. ${q.explain}`,q);
}));
coreCspSources.push(source('compression-challenge','Compression Challenge — Run Length',nativeModes({text:'Text Runs',image:'Row-Major Pixel Runs'}),(mode,level,seed,points)=>{
 const q=seeded(seed,()=>E.compressionChallenge(mode)),values=q.image?E.flattenGrid(q.grid,'rows'):q.a,answer=E.runs(values).length;
 return finish('compression-challenge','Compression Challenge',mode,seed,points,'How many runs are produced by run-length encoding this input?',q.image?`Read the grid row by row, left to right, continuing runs across row boundaries.\n${q.grid.map(r=>r.join(' ')).join('\n')}`:`Text: ${q.a.join('')}. A run is a maximal consecutive group of the same symbol.`,'',numeric(answer,seed),answer,`The ordered input has ${answer} consecutive runs: ${E.rleText(values)}.`,q);
}));
coreCspSources.push(source('data-detective','Data Detective — Data Interpretation',[{id:'filter',name:'Filter the Dataset'}],(mode,level,seed,points)=>{
 const q=seeded(seed,()=>E.dataChallenge()),cut=60+seed%21,answer=q.filter(r=>r.score>=cut).length;
 return finish('data-detective','Data Detective',mode,seed,points,`How many teams have a score of at least ${cut}?`,table(['Team','Hours','Score','Group'],q.map(r=>[r.name,r.hours,r.score,r.group])),'',numeric(answer,seed),answer,`${answer} rows satisfy score ≥ ${cut}. Count teams, not the total of their scores.`,q);
}));
// Existing standalone one-field practice questions. Other response contracts are
// excluded rather than reduced to a partial key. Keep complete passage/reference.
for(const id of ['mixed-ap-practice','simulation-lab']){
 const game=practice.practiceGames[id];
 coreCspSources.push(source(id,game.title+' — Standalone Questions',nativeModes(id==='simulation-lab'?Object.fromEntries(Object.entries(game.modes).filter(([id])=>!['trials','limitations'].includes(id))):game.modes),(mode,level,seed,points)=>{
  const q=seeded(seed,()=>practice.generatePractice(id,mode,'full'));
  if(q.fields?.length!==1)return null;
  if(q.kind==='simulation'&&q.fields[0].type==='number'){const key=q.solution.answer;return finish(id,game.title,mode,seed,points,q.prompt,q.context,'',numeric(key,seed),key,`The reference answer is ${key}. ${q.explanation}`,q)}
  if(q.kind!=='fields'||q.fields[0].type!=='select')return null;
  const f=q.fields[0],choices=f.options.map(o=>o.label),responses=f.options.map(o=>({[f.id]:o.value}));
  const context=[q.context,q.passage&&JSON.stringify(q.passage),q.reference&&JSON.stringify(q.reference)].filter(Boolean).join('\n\n');
  return item({id,name:game.title,mode,seed,points,prompt:q.prompt,context,code:q.code||'',choices,answerIndex:f.options.findIndex(o=>o.value===f.correct),explanation:q.explanation,family:q.topic||mode,raw:q,responses,grade:r=>practice.validatePractice(q,r)});
 }));
}

const impactGame=practice.practiceGames['computing-impact-lab'];
coreCspSources.push(source('computing-impact-lab','Computing Impact Lab — Individual Reasoning Steps',Object.entries(impactGame.modes).flatMap(([mode,title])=>['claim','evidence','reason'].map(field=>({id:mode+'/'+field,name:title+' · '+field}))),(mode,level,seed,points)=>{
 const [native,fieldId]=mode.split('/'),q=seeded(seed,()=>practice.generatePractice('computing-impact-lab',native,'full')),f=q.fields?.find(f=>f.id===fieldId);if(!f||f.type!=='select')return null;
 const defaults=practice.solutionPractice(q),responses=f.options.map(o=>({...defaults,[f.id]:o.value}));
 return item({id:'computing-impact-lab',name:'Computing Impact Lab',mode,seed,points,prompt:f.label+': choose the best-supported statement for this scenario.',context:q.context,choices:f.options.map(o=>o.label),answerIndex:f.options.findIndex(o=>o.value===f.correct),explanation:q.explanation,family:native+'/'+fieldId,raw:q,responses,grade:r=>practice.validatePractice(q,r)});
}));
coreCspSources.push(source('cybersecurity-defender','Cybersecurity Defender — Single-Signal Phishing',[{id:'phishing',name:'Identify One Phishing Warning'}],(mode,level,seed,points)=>{
 const q=seeded(seed,()=>E.phishingChallenge());if(q.bad.size!==1)return null;
 const labels={sender:'Sender address',link:'Link destination',request:'Requested information',attachment:'Attachment filename'},responses=Object.keys(labels),key=[...q.bad][0];
 return item({id:'cybersecurity-defender',name:'Cybersecurity Defender',mode,seed,points,prompt:'Which field contains the phishing warning in this message?',context:`Known legitimate organization: ${q.org}. Its usual domain is ${q.slug}.example.\nSender: ${q.sender}\nLink: ${q.link}\nRequest: ${q.request}\nAttachment: ${q.attachment}\nTiming: ${q.urgent}`,choices:responses.map(id=>labels[id]),answerIndex:responses.indexOf(key),explanation:`The warning is in ${labels[key].toLowerCase()}. Compare the sender and link with the known organization domain; passwords and one-time codes must not be shared, and .pdf.exe is executable rather than a PDF. Only one warning field is present in this assessment item.`,family:key,raw:q,responses,grade:r=>q.bad.has(r)});
}));
coreCspSources.push(source('parallel-processing-race','Parallel Processing Race — Minimum Completion Time',nativeModes({independent:'Independent Tasks',dependent:'Prerequisite Tasks'}),(mode,level,seed,points)=>{
 const q=seeded(seed,()=>({times:Array.from({length:6},()=>E.int(1,9)),processors:seed%2+2}));q.dependencies=q.times.map(()=>[]);if(mode==='dependent'){q.dependencies[2]=[0];q.dependencies[4]=[1,2];q.dependencies[5]=[3]}
 const solution=mode==='dependent'?E.optimalDependent(q.times,q.processors,q.dependencies):E.optimalSchedule(q.times,q.processors),key=solution.time;
 return finish('parallel-processing-race','Parallel Processing Race',mode,seed,points,'What is the minimum possible completion time for all six tasks?',`Processors: ${q.processors}. Each executes one whole task at a time, with no preemption or overhead. On each processor, tasks assigned to it execute in alphabetical order. Tasks wait until all prerequisites finish.\n`+table(['Task','Duration (seconds)','Prerequisites'],q.times.map((time,i)=>[String.fromCharCode(65+i),time,q.dependencies[i].map(j=>String.fromCharCode(65+j)).join(', ')||'none'])),'',numeric(key,seed),key,`The source scheduling model finds a minimum completion time of ${key} seconds. An optimal assignment of A through F to zero-based processors is ${JSON.stringify(solution.assignment)}.`,q);
}));
