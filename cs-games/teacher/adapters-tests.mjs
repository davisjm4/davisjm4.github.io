import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createRequire } from "node:module";
// String Lab intentionally ships its public engine as ordered classic scripts.
const root=fileURLToPath(new URL("../../java-games/string-lab/js/",import.meta.url));
for(const file of ["rng.js","words.js","java-ast.js","evaluator.js","difficulty.js","distractors.js","gen-helpers.js","families-predict.js","families-trace.js","families-index.js","families-expression.js","families-practice.js","generator.js","feedback.js"])
  vm.runInThisContext(readFileSync(root+file,"utf8"),{filename:file});
const require=createRequire(import.meta.url),race="../../wpr-games/raceces/js/";
globalThis.RACECES={};
for(const [key,path] of Object.entries({RNG:"engine/rng.js",Structure:"engine/structure.js",CONTENT:"data/content-bundle.js",Model:"engine/model.js",Feedback:"engine/feedback.js",Identify:"engine/identify.js",Rearrange:"engine/rearrange.js",Missing:"engine/missing.js",COMPOSE_LIBRARY:"data/compose-bundle.js",Compose:"compose/compose.js",Generator:"engine/generator.js",Validator:"engine/validator.js"}))globalThis.RACECES[key]=require(race+path);
const {sources,generateAssessmentItem}=await import(new URL("./adapters.js?adapter-test",import.meta.url));
const passed=[];
function check(ok,message){assert.ok(ok,message)}
const actual=new Map();let tested=0;
for(const source of sources){
  for(const mode of source.modes){
    const levels=mode.difficulties||["Mixed"];
    for(const level of levels){
      for(let sample=0;sample<3;sample++){
        const question=generateAssessmentItem(source.id,mode.id,level,1700+sample*271+tested*31,2);
        if(!question)continue;
        check(question.choices.length===4,`${source.id}/${mode.id}: expected 4 choices`);
        check(new Set(question.choices).size===4,`${source.id}/${mode.id}: choices must be unique`);
        check(question.choices[question.correctIndex]===question.correctAnswer,`${source.id}/${mode.id}: keyed answer mismatch`);
        check(question.explanation.length>0&&(question.stem||question.prompt||question.questionContext)?.length>0,`${source.id}/${mode.id}: missing prompt/explanation`);
        check(question.points===2,`${source.id}/${mode.id}: point value`);
        check(!/^(A|B|C|D)\. \1\./.test(question.choices[question.correctIndex]),`${source.id}/${mode.id}: duplicated answer label`);
        actual.set(`${source.id}/${mode.id}`, (actual.get(`${source.id}/${mode.id}`)||0)+1);tested++;
      }
    }
  }
}
for(const sourceId of ["boolean","variable","math","string","loop","array","recursion","search-sort"])
  check(sources.some(s=>s.id===sourceId),`Missing requested source ${sourceId}`);
const {buildAssessmentXml,buildManifest,formatQuestionHtml}=await import(new URL("./qti.js",import.meta.url));
const chosen=[];const seen=new Set();
for(let i=0;i<24;i++){
  const source=sources[i%sources.length], mode=source.modes[(i*7)%source.modes.length], level=mode.difficulties?.[i%mode.difficulties.length]||"Mixed";
  for(let attempt=0;attempt<100;attempt++){
    const q=generateAssessmentItem(source.id,mode.id,level,981+i*103+attempt,3);
    const uniqueSignature=q?.configurationSignature||q?.signature;
    if(q&&!seen.has(uniqueSignature)){q.id=`test-${i}`;seen.add(uniqueSignature);chosen.push(q);break;}
  }
}
check(chosen.length>=20,"Could not generate a distinct mixed-source sample");
check(new Set(chosen.map(q=>q.id)).size===chosen.length,"Question IDs must be unique");
const xml=buildAssessmentXml({title:"Adapter sample",seed:981},chosen),manifest=buildManifest();
check((xml.match(/<item ident=/g)||[]).length===chosen.length,"QTI item count");
check((xml.match(/<setvar action="Set" varname="SCORE">3<\/setvar>/g)||[]).length===chosen.length,"QTI points retained");
check(manifest.includes('href="assessment.xml"'),"Manifest must reference assessment.xml");
check(chosen.every(q=>xml.includes(`choice_${q.correctIndex}</varequal>`)),"QTI response mapping missing");
const sample=chosen.find(q=>q.code?.includes("\n"));
if(sample){const html=formatQuestionHtml(sample);check(html.includes("<pre><code>"),"Java should use preformatted HTML");check(html.includes("\n"),"Code line breaks should survive");}
const distribution=Object.fromEntries(sources.map(s=>[s.id,chosen.filter(q=>q.sourceId===s.id).length]));
const large=[],largeSeen=new Set(),pairs=sources.map(s=>[s,s.modes[0]]);
for(let i=0;i<50;i++){
  const [source,mode]=pairs[i%pairs.length],levels=mode.difficulties||["Mixed"],level=levels[i%levels.length];let found=null;
  for(let attempt=0;attempt<140&&!found;attempt++){const q=generateAssessmentItem(source.id,mode.id,level,900001+i*1009+attempt*7919,2);const uniqueSignature=q?.configurationSignature||q?.signature;if(q&&!largeSeen.has(uniqueSignature)){largeSeen.add(uniqueSignature);q.id=`large-${i+1}`;found=q}}
  check(!!found,`Could not generate 50 distinct mixed-source questions (stopped at ${i})`);large.push(found);
}
const largeXml=buildAssessmentXml({title:"Large adapter assessment",seed:900001},large);
check((largeXml.match(/<item ident=/g)||[]).length===50,"50-question QTI item count");
check(large.reduce((sum,q)=>sum+q.points,0)===100,"Large assessment point total");
console.log(`Passed ${tested} validated adapter samples across ${actual.size} source/mode/difficulty combinations; balanced 24-item sample ${JSON.stringify(distribution)}; 50 distinct items export correctly.`);
