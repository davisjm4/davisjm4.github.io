import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
// String Lab intentionally ships its public engine as ordered classic scripts.
const root=fileURLToPath(new URL("../../java-games/string-lab/js/",import.meta.url));
for(const file of ["rng.js","words.js","java-ast.js","evaluator.js","difficulty.js","distractors.js","gen-helpers.js","families-predict.js","families-trace.js","families-index.js","families-expression.js","families-practice.js","generator.js","feedback.js"])
  vm.runInThisContext(readFileSync(root+file,"utf8"),{filename:file});
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
        check(question.explanation.length>0&&question.stem.length>0,`${source.id}/${mode.id}: missing prompt/explanation`);
        check(question.points===2&&question.code.includes("\n")||question.points===2,`${source.id}/${mode.id}: point value`);
        check(!/^(A|B|C|D)\. \1\./.test(question.choices[question.correctIndex]),`${source.id}/${mode.id}: duplicated answer label`);
        actual.set(`${source.id}/${mode.id}`, (actual.get(`${source.id}/${mode.id}`)||0)+1);tested++;
      }
    }
  }
}
for(const sourceId of ["boolean","variable","math","string","loop","array","recursion","search-sort","class-object"])
  check(sources.some(s=>s.id===sourceId),`Missing requested source ${sourceId}`);
const {buildAssessmentXml,buildManifest,formatQuestionHtml}=await import(new URL("./qti.js",import.meta.url));
const chosen=[];const seen=new Set();
for(let i=0;i<24;i++){
  const source=sources[i%sources.length], mode=source.modes[(i*7)%source.modes.length], level=mode.difficulties?.[i%mode.difficulties.length]||"Mixed";
  for(let attempt=0;attempt<100;attempt++){
    const q=generateAssessmentItem(source.id,mode.id,level,981+i*103+attempt,3);
    if(q&&!seen.has(q.signature)){q.id=`test-${i}`;seen.add(q.signature);chosen.push(q);break;}
  }
}
check(chosen.length>=20,"Could not generate a distinct mixed-source sample");
check(new Set(chosen.map(q=>q.id)).size===chosen.length,"Question IDs must be unique");
const xml=buildAssessmentXml({title:"Adapter sample",seed:981},chosen),manifest=buildManifest();
check((xml.match(/<item ident=/g)||[]).length===chosen.length,"QTI item count");
check((xml.match(/<setvar action="Set" varname="SCORE">3<\/setvar>/g)||[]).length===chosen.length,"QTI points retained");
check(manifest.includes('href="assessment.xml"'),"Manifest must reference assessment.xml");
check(chosen.every(q=>xml.includes(`choice_${q.correctIndex}</varequal>`)),"QTI response mapping missing");
const sample=chosen.find(q=>q.code.includes("\n"));
if(sample){const html=formatQuestionHtml(sample);check(html.includes("<pre><code>"),"Java should use preformatted HTML");check(html.includes("\n"),"Code line breaks should survive");}
const distribution=Object.fromEntries(sources.map(s=>[s.id,chosen.filter(q=>q.sourceId===s.id).length]));
console.log(`Passed ${tested} validated adapter samples across ${actual.size} source/mode/difficulty combinations; mixed QTI sample contains ${chosen.length} items (${JSON.stringify(distribution)}).`);
