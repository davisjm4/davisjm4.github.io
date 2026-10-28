import './test-runtime.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const {sources,baselineSourceIds,baselineModeIds,generateAssessmentItem}=await import('./adapters.js?v=package-f-20261027');
const {buildQuiz}=await import('./assessment-builder.js?v=package-f-20261027');
const {buildAssessmentXml,buildManifest,createZip,validateAssessment,formatQuestionHtml}=await import('./qti.js?v=package-f-20261027');
const {finiteContracts,adaptFinite,adaptCreate}=await import('./csp-adapters.js');
const create=await import('../../csp-games/create-task-lab/engine.js');
const {rng}=await import('./assessment-item.js');
const output=process.env.PACKAGE_F_EVIDENCE_DIR||'/tmp/package-f';fs.mkdirSync(path.join(output,'qti'),{recursive:true});
const stats=[],samples=new Map(),errors=[];let checked=0;
function verify(q,label){
 assert.ok(q,label);assert.deepEqual(validateAssessment([q]),[],label);assert.equal(q.choices[q.correctIndex],q.correctAnswer);assert.ok(q.topic);assert.ok(q.source);assert.ok(q.explanation);
 assert.ok(!/undefined|\[object Object\]/.test(q.stem+q.context+q.code),label+' malformed display');
 assert.ok(q._grade&&q._responses);assert.equal(q._responses.filter(q._grade).length,1);assert.ok(q._grade(q._responses[q.correctIndex]));
 const html=formatQuestionHtml(q);assert.ok(html);if(q.code)assert.ok(html.includes('<pre><code>'));
 assert.ok(validateAssessment([{...q,context:q.context+' changed'}]).length,'context mutation must be rejected');
 checked++;
}
for(const source of sources){
 const modes=source.modes.filter(m=>!baselineModeIds[source.id]?.includes(m.id));if(!modes.length)continue;
 const cells=modes.flatMap(m=>(m.difficulties||['Mixed']).map(level=>({mode:m,level}))),row={source:source.id,cells:cells.length,accepted:0,rejected:0,levels:{},modes:{},families:{},answerPositions:[0,0,0,0],seeds:[]};
 const count=Math.max(1000,cells.length*35);let next=0;
 for(let index=0;index<count;index++){
  const {mode,level}=cells[index%cells.length];let q,seed;
  for(let attempt=0;attempt<140&&!q;attempt++){
   seed=(731+next++*7919)>>>0;q=generateAssessmentItem(source.id,mode.id,level,seed,3);if(!q)row.rejected++;
  }
  assert.ok(q,`${source.id}/${mode.id}/${level} could not generate`);verify(q,`${source.id}/${mode.id}/${seed}`);
  assert.equal(q.difficulty.toLowerCase(),level.toLowerCase());
  const same=generateAssessmentItem(source.id,mode.id,level,seed,3);assert.deepEqual({...q},{...same},source.id+' deterministic');
  row.accepted++;row.levels[level]=(row.levels[level]||0)+1;row.modes[mode.id]=(row.modes[mode.id]||0)+1;row.families[q.family]=(row.families[q.family]||0)+1;row.answerPositions[q.correctIndex]++;
  if(row.seeds.length<20)row.seeds.push(seed);
  if(!samples.has(source.id))samples.set(source.id,[]);if(samples.get(source.id).length<12)samples.get(source.id).push(q);
 }
 for(const cell of cells)assert.ok(row.modes[cell.mode.id]);stats.push(row);console.log(`PASS ${source.id}: ${row.accepted} items, ${Object.keys(row.families).length} families, ${cells.length} mode/level cells`);
}
const finite=[];
for(const contract of finiteContracts){const [id,name,E]=contract;let count=0;const families=new Set();
 for(const [i,raw]of E.QUESTIONS.entries()){
  const mode=E.MODES?raw.mode:raw.topic,q=adaptFinite(contract,raw,mode,1901+i*1009,3);verify(q,`${id}/${raw.id}`);families.add(raw.family);count++;
  if(id==='analog-digital-lab')assert.equal(E.classification(raw.model),raw.answer);
  if(id==='lossless-lossy-lab')assert.equal(E.classify(raw.model),raw.answer);
  if(id==='tcp-udp-lab'){const family=E.FAMILIES.find(f=>f.id===raw.family);assert.equal(E.classify(family.facts).answer,raw.answer)}
  if(raw.scene)assert.ok(q.context.includes(raw.scene));if(raw.code)assert.equal(q.code,raw.code);
  if(raw.evidence?.headers){for(const header of raw.evidence.headers)assert.ok(q.context.includes(header));for(const row of raw.evidence.rows)for(const value of row)assert.ok(q.context.includes(String(value)));assert.ok(q.context.includes(raw.evidence.caption))}
  if(raw.diagram)assert.ok(q.context.includes(E.diagramDescription(raw)));
 }
 finite.push({source:id,instances:count,families:families.size,coverage:'exhaustive'});
}
const {responseExplorerBank,adaptResponseExplorer}=await import('./response-explorer-adapter.js');
for(const [i,q]of responseExplorerBank.entries())verify(adaptResponseExplorer(q,1901+i,3),q.id);
finite.push({source:'response-explorer',instances:responseExplorerBank.length,families:new Set(responseExplorerBank.map(q=>q.reasoningFamily)).size,coverage:'exhaustive'});
const {documentationEligible,inheritanceEligible}=await import('./java-expansion-adapters.js');
for(const [mode,bank]of Object.entries(documentationEligible))for(let i=0;i<bank.length;i++){
 const q=generateAssessmentItem('documentation',mode,'Mixed',i,3);verify(q,bank[i].id);assert.equal(q._sourceQuestion.id,bank[i].id);
}
for(const mode of new Set(inheritanceEligible.map(q=>q.mode))){const bank=inheritanceEligible.filter(q=>q.mode===mode);for(let i=0;i<bank.length;i++){const q=generateAssessmentItem('inheritance',mode,'Mixed',i,3);verify(q,bank[i].id);assert.equal(q._sourceQuestion.id,bank[i].id)}}
finite.push({source:'documentation',instances:Object.values(documentationEligible).reduce((n,b)=>n+b.length,0),coverage:'exhaustive eligible item IDs'});
finite.push({source:'inheritance',instances:inheritanceEligible.length,coverage:'exhaustive eligible item IDs'});
// Independent oracles for adapters over the shared CSP models.
for(const id of ['binary-builder','list-lab','binary-search-hunt','compression-challenge','algorithm-race','parallel-processing-race']){
 const source=sources.find(s=>s.id===id);for(let n=0;n<30;n++){
  const mode=source.modes[n%source.modes.length],q=generateAssessmentItem(id,mode.id,'Mixed',9533+n*1009,3),r=q._sourceQuestion;let expected;
  if(id==='binary-builder')expected=mode.id==='capacity'?2**r.bits:mode.id==='pixels'?9*r.bits:(r.a+r.b)%(2**r.bits);
  if(id==='list-lab'){let a=[...r.start];for(const op of r.ops){if(op.type==='APPEND')a.push(op.value);else if(op.type==='INSERT')a.splice(op.index-1,0,op.value);else a.splice(op.index-1,1)}expected=JSON.stringify(a)}
  if(id==='binary-search-hunt'){let lo=0,hi=r.values.length-1,count=0;while(lo<=hi){count++;const mid=Math.floor((lo+hi)/2);if(r.values[mid]===r.target)break;if(r.values[mid]<r.target)lo=mid+1;else hi=mid-1}expected=count}
  if(id==='compression-challenge'){const a=r.image?r.grid.flat():r.a;expected=a.filter((v,i)=>i===0||v!==a[i-1]).length}
  if(id==='algorithm-race'){let a,b;if(mode.id==='duplicates'){a=r.n*(r.n-1)/2;b=r.n}else if(mode.id==='sum'){a=r.n;b=r.n*(r.n+1)/2}else{a=r.values.indexOf(r.target)+1;let lo=0,hi=r.n-1;b=0;while(lo<=hi){b++;let m=Math.floor((lo+hi)/2);if(r.values[m]===r.target)break;if(r.values[m]<r.target)lo=m+1;else hi=m-1}}expected=a===b?'Same number of steps':r.labels[a<b?0:1]}
  if(id==='parallel-processing-race'){let best=Infinity;for(let code=0;code<r.processors**6;code++){let value=code,loads=Array(r.processors).fill(0),ends=[];for(let i=0;i<6;i++){const p=value%r.processors;value=Math.floor(value/r.processors);const start=Math.max(loads[p],0,...r.dependencies[i].map(j=>ends[j]));ends[i]=start+r.times[i];loads[p]=ends[i]}best=Math.min(best,Math.max(...ends))}expected=best}
  assert.equal(q.correctAnswer,String(expected),id+' independent key');
 }}
let createCases=0;
for(const family of create.families)for(let variant=0;variant<3;variant++)for(const valid of family.mode==='missing'?[false,true]:[false]){
 const raw=create.buildChallenge(family.id,variant,9533,{valid}),q=adaptCreate(raw,family.mode,9533+variant,3);verify(q,raw.id);createCases++;
 assert.equal(q.code,raw.code);assert.ok(q.context.includes(raw.scenario));assert.equal(q.explanation,raw.explanation);
}
// Every actual source variant and explicit level must fill an assessment.
const quizCells=[];const packages=[];
for(const source of sources)for(const mode of source.modes){
 if(baselineModeIds[source.id]?.includes(mode.id))continue;
 for(const difficulty of mode.difficulties||['mixed']){
  const config={title:source.name,pairs:[{sourceId:source.id,modeId:mode.id}],difficulty,count:3,seed:1901,points:3};const result=buildQuiz(config);
  assert.equal(result.error,'',`${source.id}/${mode.id}/${difficulty}: ${result.error}`);assert.equal(result.items.length,3);assert.equal(new Set(result.items.map(q=>q.signature)).size,3);
  quizCells.push({source:source.id,mode:mode.id,difficulty,count:3});
 }
}
for(const sourceId of samples.keys())for(const points of [1,3,5]){
 const items=samples.get(sourceId).slice(0,6).map((q,i)=>({...q,id:`${sourceId}-${points}-${i}`,points}));packages.push({name:`${sourceId}-${points}`,items});
}
for(const difficulty of ['mixed','Beginner','Intermediate','Advanced']){
 const pairs=sources.filter(s=>s.id!=='create-task-lab'||['mixed','Beginner'].includes(difficulty)).map(s=>({sourceId:s.id,modeId:s.modes[0].id}));
 const config={title:'All-source mixed assessment',pairs,difficulty,count:50,seed:9533,points:5},result=buildQuiz(config);assert.equal(result.error,'',result.error);assert.equal(result.items.length,50);assert.equal(new Set(result.items.map(q=>q.signature)).size,50);packages.push({name:`all-sources-${difficulty}`,items:result.items});
}
for(const {name,items}of packages){
 const config={title:name,seed:731,count:items.length};const zip=createZip([{name:'imsmanifest.xml',data:buildManifest()},{name:'assessment.xml',data:buildAssessmentXml(config,items)},{name:'metadata.json',data:JSON.stringify({questions:items.length,points:items.reduce((n,q)=>n+q.points,0),items:items.map(q=>({id:q.id,correctIndex:q.correctIndex,points:q.points,explanation:q.explanation,sourceId:q.sourceId,source:q.source,topic:q.topic||q.family||q.modeId,mode:q.modeId||q.mode,difficulty:q.difficulty,html:formatQuestionHtml(q)}))})}]);fs.writeFileSync(path.join(output,'qti',name+'.zip'),Buffer.from(await zip.arrayBuffer()));
}
const summary={baselineSources:baselineSourceIds.length,baselineVariants:Object.values(baselineModeIds).reduce((n,m)=>n+m.length,0),finalSources:sources.length,finalVariants:sources.reduce((n,s)=>n+s.modes.length,0),sourcesWithNewCoverage:stats.length,checked,generated:stats.reduce((n,r)=>n+r.accepted,0),finite,createCases,quizCells:quizCells.length,packages:packages.length,canvasImport:'Not Verified'};
for(const [file,data]of Object.entries({'source-validation.json':stats,'finite-exhaustive.json':finite,'quiz-cells.json':quizCells,'validation-summary.json':summary}))fs.writeFileSync(path.join(output,file),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
