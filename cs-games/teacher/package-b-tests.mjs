import "./test-runtime.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const {sources,sourceById,generateAssessmentItem}=await import("./adapters.js?v=package-b-20261026");
const {buildQuiz,selectionEligibility}=await import("./assessment-builder.js");
const {difficultyId,resolveDifficulty}=await import("./difficulty.js");
const {searchQuestionContext}=await import("./search-context.js");
const {generate,exportQuestion,MODE_IDS,MODES,familiesFor}=await import("../../java-games/search-sort-lab/engine/generator.js");
const {formatQuestionHtml,buildAssessmentXml,buildManifest,createZip,validateAssessment}=await import("./qti.js?v=package-b-20261026");
const {workplaceCatalog}=await import("./workplace-adapter.js?v=package-b-20261026");
const {racecesCatalog}=await import("./raceces-adapter.js?v=package-b-20261026");
const output=process.env.PACKAGE_B_EVIDENCE_DIR;
if(output)fs.mkdirSync(path.join(output,"qti"),{recursive:true});
const write=(file,value)=>{if(output)fs.writeFileSync(path.join(output,file),JSON.stringify(value,null,2)+"\n")};
const config=(pairs,difficulty="Advanced",count=3,seed=731,points=3)=>({title:"Package B validation",pairs,difficulty,count,seed,points});
assert.equal(sources.length,10);assert.equal(sources.reduce((n,s)=>n+s.modes.length,0),136);
const matrix=[],samples=[],quizzes=[];let accepted=0,rejected=0;
for(const source of sources)for(const mode of source.modes)for(const level of mode.difficulties||["Mixed"]){
  const row={source:source.id,mode:mode.id,requested:level,accepted:0,rejected:0,actual:[],seeds:[]},actual=new Set();
  for(let i=0;i<20;i++){
    const seed=731+i*1009+matrix.length*271,q=generateAssessmentItem(source.id,mode.id,level,seed,3);
    if(!q){row.rejected++;rejected++;continue}
    assert.equal(difficultyId(q.difficulty),difficultyId(level),`${source.id}/${mode.id}/${level}`);
    assert.deepEqual(validateAssessment([q]),[]);
    assert.equal(q.choices[q.correctIndex],q.correctAnswer);assert.ok(q.explanation.trim());
    actual.add(q.difficulty);row.seeds.push(seed);row.accepted++;accepted++;
    if(row.accepted===1)samples.push({...q,_audit:undefined});
    if(source.id==="search-sort"){
      const original=generate(mode.id,difficultyId(level),seed),exp=exportQuestion(original);
      assert.equal(q.context,searchQuestionContext(original,exp));
      if(q.code)assert.ok(validateAssessment([{...q,code:""}]).length);
      assert.equal(q.stem,exp.stem);assert.equal(q.code,exp.code);assert.equal(q.explanation,exp.explanation);
      assert.deepEqual(q.choices,exp.choices.map(c=>c.text));assert.equal(q.correctIndex,exp.correctIndex);
      assert.equal(searchQuestionContext(original,{...exp,arrays:undefined}),null);
      if(exp.arrays.length)assert.equal(searchQuestionContext(original,{...exp,arrays:[]}),null);
      assert.equal(searchQuestionContext(original,{...exp,countingRule:undefined}),null);
    }
  }
  assert.ok(row.accepted,`Supported cell generated no items: ${JSON.stringify(row)}`);row.actual=[...actual];matrix.push(row);
}
// Exact three context-loss examples from the audit, including original keys.
const auditContext=[];
for(const [level,seed,family,key] of [["beginner",78237,"c-fit","Linear search only"],["intermediate",78508,"c-count-search","12"],["advanced",78779,"c-input-order","Sorted order"]]){
  const q=generateAssessmentItem("search-sort","compare",level,seed,3);
  assert.equal(q.family,family);assert.equal(q.correctAnswer,key);
  assert.ok(q.context.includes("["));
  assert.ok(formatQuestionHtml(q).includes(q.context.split("\n\n")[0].replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")));
  assert.ok(validateAssessment([{...q,context:""}]).length);
  assert.throws(()=>buildAssessmentXml({title:"Invalid",seed},[{...q,context:""}]),/context/);
  auditContext.push(q);
}
// Every currently exportable Search & Sort family/level: include rules,
// descriptions, code labels, all arrays/indices/markers, and split-tree rows.
let familyCells=0;
for(const mode of MODE_IDS)for(const level of ["beginner","intermediate","advanced"])for(const family of familiesFor(mode,level)){
  let ch;for(let seed=731;seed<751&&!ch;seed++)ch=generate(mode,level,seed,{family:family.id});
  assert.ok(ch,`${mode}/${level}/${family.id}`);
  const context=searchQuestionContext(ch,exportQuestion(ch));assert.notEqual(context,null);
  for(const value of [ch.rule,ch.description,ch.codeLabel].filter(Boolean))assert.ok(context.includes(value));
  for(const visual of ch.visuals){if(visual.type==="array")assert.ok(context.includes(`[${visual.values.join(", ")}]`));else for(const row of visual.rows)assert.ok(context.includes(row.join(" | ")))}
  familyCells++;
}
const difficultyMatrix=[];
for(const source of sources)for(const requested of ["Beginner","Intermediate","Advanced","mixed"]){
  for(const mode of source.modes){
    const c=config([{sourceId:source.id,modeId:mode.id}],requested);
    const result=buildQuiz(c);assert.equal(result.error,"",`${source.id}/${mode.id}/${requested}: ${result.error}`);
    for(const [i,q]of result.items.entries())assert.equal(difficultyId(q.difficulty),difficultyId(resolveDifficulty(mode,requested,i).level));
    if(["variable","loop","search-sort"].includes(source.id)&&requested!=="mixed")assert.ok(result.items.every(q=>difficultyId(q.difficulty)===difficultyId(requested)));
    difficultyMatrix.push({source:source.id,mode:mode.id,requested,actual:result.items.map(q=>q.difficulty),notices:result.notices});
  }
}
assert.equal(resolveDifficulty({name:"Case test",difficulties:["beginner","intermediate","advanced"]},"ADVANCED").level,"advanced");
assert.equal(resolveDifficulty({name:"Limited",difficulties:["beginner","intermediate"]},"Advanced").level,"intermediate");
assert.ok(resolveDifficulty({name:"Limited",difficulties:["Beginner"]},"Advanced").notice.includes("nearest"));
assert.ok(resolveDifficulty({name:"Invalid",difficulties:["beginner"]},"Expert").error);
const filterMatrix=[],unsupported=[];
for(const skill of workplaceCatalog().skills)for(const mode of sourceById["workplace-readiness"].modes)for(const level of ["Beginner","Intermediate","Advanced"]){
  const pair={sourceId:"workplace-readiness",modeId:mode.id},c={...config([pair],level,1),workplaceFilters:{skills:[skill.id]}};
  const eligibility=selectionEligibility(c,pair),result=buildQuiz(c);
  if(eligibility.error){assert.equal(result.items.length,0);assert.ok(result.error.includes("skills/career settings"));unsupported.push({skill:skill.id,mode:mode.id,level})}
  else {assert.equal(result.error,"");assert.equal(result.items[0].topicId,skill.id);assert.equal(difficultyId(result.items[0].difficulty),difficultyId(level))}
  filterMatrix.push({source:pair.sourceId,skill:skill.id,mode:mode.id,level,supported:!eligibility.error,error:result.error});
}
assert.deepEqual(unsupported,[
  {skill:"job-specific-tools-and-technologies",mode:"order",level:"Beginner"},
  {skill:"mathematics",mode:"nextstep",level:"Beginner"},
  {skill:"mathematics",mode:"order",level:"Intermediate"},
  {skill:"professionalism",mode:"order",level:"Beginner"},
  {skill:"reading-and-writing",mode:"order",level:"Intermediate"}
]);
for(const topic of racecesCatalog().topics)for(const mode of sourceById.raceces.modes)for(const level of ["Beginner","Intermediate","Advanced"]){
  const pair={sourceId:"raceces",modeId:mode.id},c={...config([pair],level,1),racecesFilters:{subject:topic.subject,topics:[topic.id]}};
  const result=buildQuiz(c);assert.equal(result.error,"");assert.equal(result.items[0].topicId,topic.id);assert.equal(result.items[0].difficulty,level);
  filterMatrix.push({source:"raceces",topic:topic.id,mode:mode.id,level,supported:true});
}
for(const setting of workplaceCatalog().contexts){
  const pair={sourceId:"workplace-readiness",modeId:"decision"},result=buildQuiz({...config([pair],"Beginner",1),workplaceFilters:{contexts:[setting.id]}});
  assert.equal(result.error,"");assert.equal(result.items[0].contextId,setting.id);
  filterMatrix.push({source:pair.sourceId,setting:setting.id,supported:true});
}
assert.ok(buildQuiz({...config([{sourceId:"raceces",modeId:"identify"}]),racecesFilters:{topics:["missing-topic"]}}).error.includes("subject/topics"));
// Full mixed assessment at all requested point values, plus every source.
for(const points of [1,3,5]){
  const c=config(sources.map(s=>({sourceId:s.id,modeId:s.modes[0].id})),"mixed",50,1901,points),result=buildQuiz(c);
  assert.equal(result.error,"");assert.equal(result.items.length,50);assert.equal(new Set(result.items.map(q=>q.sourceId)).size,10);
  assert.deepEqual(buildQuiz(c).items,result.items);quizzes.push({name:`mixed-${points}-points`,config:c,items:result.items});
  for(const source of sources){const pair={sourceId:source.id,modeId:source.modes[0].id},c=config([pair],"mixed",3,9533,points),result=buildQuiz(c);assert.equal(result.error,"");quizzes.push({name:`${source.id}-${points}-points`,config:c,items:result.items})}
}
const original=samples[0];
for(const source of sources){
  const all=samples.filter(q=>q.sourceId===source.id);
  for(let start=0;start<all.length;start+=50){
    const items=all.slice(start,start+50),c={...config([],"mixed",items.length),title:`All variants ${source.name}`};
    quizzes.push({name:`all-variants-${source.id}-${start/50+1}`,config:c,items});
  }
}
for(const patch of [{points:NaN},{points:0},{correctIndex:9},{explanation:""},{choices:["a","a","b","c"]},{stem:"",prompt:"",questionContext:"",passage:"",context:"",response:""}])assert.ok(validateAssessment([{...original,...patch}]).length);
assert.ok(validateAssessment([original,original]).length);assert.ok(validateAssessment([original],3).length);
if(output)for(const {name,config:c,items}of quizzes){
  const zip=createZip([{name:"imsmanifest.xml",data:buildManifest()},{name:"assessment.xml",data:buildAssessmentXml(c,items)},{name:"metadata.json",data:JSON.stringify({questions:items.length,points:items.reduce((n,q)=>n+q.points,0),items:items.map(q=>({id:q.id,correctIndex:q.correctIndex,points:q.points,explanation:q.explanation,html:formatQuestionHtml(q)}))})}]);
  fs.writeFileSync(path.join(output,"qti",name+".zip"),Buffer.from(await zip.arrayBuffer()));
}
write("adapter-matrix.json",matrix);write("difficulty-matrix.json",difficultyMatrix);write("filter-matrix.json",filterMatrix);write("audit-context-after.json",auditContext);write("source-inventory.json",sources.map(({generate,...s})=>s));
const summary={sources:sources.length,variants:136,supportedCells:matrix.length,accepted,rejected,searchFamilyCells:familyCells,difficultyFormCells:difficultyMatrix.length,filterCells:filterMatrix.length,unsupported,packages:quizzes.length,canvasImport:"Unverified; no approved nonproduction Canvas environment available"};
write("validation-summary.json",summary);console.log(JSON.stringify(summary,null,2));
