import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { buildAssessmentXml, buildManifest, createZip, formatQuestionHtml } from "./qti.js";

const require = createRequire(import.meta.url), race = "../../wpr-games/raceces/js/";
globalThis.RACECES = {};
for (const [key, path] of Object.entries({
  RNG:"engine/rng.js", Structure:"engine/structure.js", CONTENT:"data/content-bundle.js",
  Model:"engine/model.js", Feedback:"engine/feedback.js", Identify:"engine/identify.js",
  Rearrange:"engine/rearrange.js", Missing:"engine/missing.js", COMPOSE_LIBRARY:"data/compose-bundle.js",
  Compose:"compose/compose.js", Generator:"engine/generator.js", Validator:"engine/validator.js"
})) globalThis.RACECES[key] = require(race + path);

const R = globalThis.RACECES;
const { sources, generateAssessmentItem } = await import("./adapters.js?raceces-test");
const { racecesCatalog } = await import("./raceces-adapter.js?raceces-test");
const raceSource = sources.find(source => source.id === "raceces");
assert.ok(raceSource, "R-A-C-E-C-E-S source registered");
const modes = ["identify", "missing", "rearrange"];
const levels = ["Beginner", "Intermediate", "Advanced"];
const topics = racecesCatalog().topics;
const expectedIds = ['honeybees','solar-panels','water-cycle','arch-bridges','public-libraries','moon-phases','cactus','levers','bicycle-gears','rust','mars-rovers','printing-press','coral-reefs','lightning','binary-numbers','math-algebraic-expressions','math-coordinate-transformations','math-equations-inequalities','math-functions','math-geometry','math-measurement','math-statistics-probability','math-triangles-polygons'];
const expectedMathIds = expectedIds.slice(15);
assert.equal(topics.length, 23, "all current topic IDs are exposed");
assert.equal(new Set(topics.map(t=>t.id)).size,23,'topic IDs are unique');
assert.deepEqual(topics.map(t=>t.id).sort(),[...expectedIds].sort(),'matches independently recorded topic IDs');
assert.deepEqual(topics.map(({id,subject,title})=>({id,subject,title})),R.CONTENT.topics.map(({id,subject,title})=>({id,subject,title})),'adapter catalog matches source metadata');
assert.deepEqual(topics.filter(t=>t.subject==='Mathematics').map(t=>t.id).sort(),[...expectedMathIds].sort(),'all eight mathematics topics have the correct subject');
const stats = {};
function assertXmlWellFormed(xml) {
  const tokens=xml.match(/<\?[^>]*\?>|<[^>]+>|[^<]+/g)||[],stack=[];
  for(const token of tokens){
    if(token.startsWith("<?"))continue;
    if(token.startsWith("</")){assert.equal(stack.pop(),token.slice(2,-1).trim());continue;}
    if(token.startsWith("<")){const name=token.slice(1).match(/^([^\s/>]+)/)?.[1];assert.ok(name);if(!token.endsWith("/>"))stack.push(name);continue;}
    assert.ok(!/(^|[^&])&(?!#\d+;|#x[\da-f]+;|amp;|lt;|gt;|quot;|apos;)/i.test(token),`unescaped XML entity in ${token}`);
  }
  assert.deepEqual(stack,[]);
}

function verify(item, mode) {
  const ch = item._audit.challenge;
  assert.equal(item.choices.length, 4);
  assert.equal(new Set(item.choices).size, 4);
  assert.equal(item.choices[item.correctIndex], item.correctAnswer);
  assert.ok(item.passage.length > 0 && item.questionContext.endsWith("?"));
  assert.ok(item.prompt.length > 0 && item.explanation.length > 15);
  assert.equal(item.points, 2);
  assert.equal(R.Validator.validateChallenge(ch).length, 0);
  if (mode === "identify") {
    const id = ch.solution.ids[0];
    assert.equal(ch.multi, false);
    assert.equal(ch.solution.ids.length, 1);
    assert.equal(R.Identify.grade(ch, { selected: [id] }).correct, true);
    assert.equal(item._audit.choiceIds.filter(id => R.Identify.grade(ch, { selected: [id] }).correct).length, 1);
  } else if (mode === "missing") {
    assert.equal(ch.options.find(o => o.id === ch.correctId).text, item.correctAnswer);
    assert.equal(R.Missing.grade(ch, { optionId: ch.correctId }).correct, true);
    assert.equal(ch.options.filter(o => R.Missing.grade(ch, { optionId: o.id }).correct).length, 1);
    assert.equal(ch.shown.filter(line => line.gap).length, 1);
  } else {
    const valid = item._audit.candidateOrders.filter(order => R.Rearrange.analyze(order, ch.info, ch.dependency || null).valid);
    assert.equal(valid.length, 1, "only one displayed sequence is valid");
    const expectedValid = ch.dependency ? 1 : 2;
    assert.equal([ch.solution.order, ch.solution.alternate].filter(Boolean).filter(order => R.Rearrange.analyze(order, ch.info).valid).length, expectedValid);
    if (ch.dependency) assert.ok(!R.Rearrange.analyze(ch.solution.alternate || [], ch.info, ch.dependency).valid);
  }
}

// Each mathematics topic must be usable with each mode and level. Rejection of
// an individual seed is allowed, but every returned item still passes the
// existing independent grading and answer-uniqueness checks.
const mathematicsCoverage=[];
for (const topic of topics.filter(t=>t.subject==='Mathematics')) for (const mode of modes) for (const level of levels) {
  let item=null, usedSeed=null;
  for(let attempt=0;attempt<100 && !item;attempt++) {
    usedSeed=0xc00000+expectedMathIds.indexOf(topic.id)*10000+modes.indexOf(mode)*1000+levels.indexOf(level)*100+attempt;
    item=generateAssessmentItem('raceces',mode,level,usedSeed,2,{subject:'Mathematics',topics:[topic.id]});
  }
  assert.ok(item,`mathematics topic ${topic.id}/${mode}/${level} must generate an assessable item`);
  assert.equal(item.topic,topic.title);
  assert.equal(item._audit.challenge.topicId,topic.id);
  verify(item,mode);
  const same=generateAssessmentItem('raceces',mode,level,usedSeed,2,{subject:'Mathematics',topics:[topic.id]});
  assert.deepEqual(item,same,'filtered mathematics generation is deterministic');
  mathematicsCoverage.push({topic:topic.id,mode,level,seed:usedSeed});
}
assert.equal(mathematicsCoverage.length,72);

let total=0, accepted=0, rejected=0, authored=0, compositional=0, failures=0;
const acceptedByModeLevel={};
// 1,000 independently graded candidate builds for each mode/difficulty cell.
for (const mode of modes) for (const level of levels) {
  let ok=0;
  for (let i=0;i<1000;i++) {
    const seed=0x51a7 + i*7919 + modes.indexOf(mode)*1000003 + levels.indexOf(level)*900001;
    const item=generateAssessmentItem("raceces",mode,level,seed,2,{subject:"all",topics:[]});
    total++;
    if (!item) { rejected++; continue; }
    try { verify(item,mode); ok++; accepted++; if(item._audit.challenge.generated)compositional++;else authored++; }
    catch(error) { failures++; throw new Error(`${mode}/${level}/seed=${seed}: ${error.message}`); }
  }
  assert.ok(ok>0,`at least one valid ${mode}/${level} question was generated`);
  acceptedByModeLevel[`${mode}/${level}`]=ok;
}
assert.equal(failures,0);
assert.ok(authored>0 && compositional>0, "both authored and compositional models are represented");

// Determinism and source-specific filters.
for (const mode of modes) {
  const a=generateAssessmentItem("raceces",mode,"Intermediate",123456,3,{subject:"Biology",topics:["honeybees"]});
  const b=generateAssessmentItem("raceces",mode,"Intermediate",123456,3,{subject:"Biology",topics:["honeybees"]});
  assert.deepEqual(a,b,`${mode} must be deterministic for fixed settings and seed`);
  assert.equal(a.topic,"Honeybees and pollen");
  const other=generateAssessmentItem("raceces",mode,"Intermediate",123456,3,{subject:"Physics",topics:["honeybees"]});
  assert.equal(other,null,"topic and subject filters intersect");
}
for (const topic of topics) {
  const item=generateAssessmentItem("raceces","missing","Beginner",0x6000+topics.indexOf(topic),2,{subject:topic.subject,topics:[topic.id]});
  assert.ok(item,`single-topic filter supports ${topic.id}`);
  assert.equal(item.topic,topic.title);
  verify(item,"missing");
}

// Repeated quiz-size batches exercise semantic/configuration uniqueness and QTI.
function batch(count, seed, modeset=modes) {
  const items=[],used=new Set(); let attempts=0;
  while(items.length<count&&attempts<30000) {
    const index=items.length,mode=modeset[index%modeset.length],level=levels[(index+Math.floor(index/3)+attempts)%levels.length];
    const item=generateAssessmentItem("raceces",mode,level,seed+attempts*104729+index*577,2,{subject:"all",topics:[]});
    attempts++;
    const uniqueness=item?.configurationSignature||item?.signature;
    if(!item||used.has(uniqueness))continue;
    verify(item,mode);used.add(uniqueness);item.id=`raceces-${seed}-${index}`;items.push(item);
  }
  return {items,attempts};
}
const repeatStats=[];
for(const count of [10,20,50])for(const seed of [17,839,12091]) {
  const {items,attempts}=batch(count,seed);
  assert.equal(items.length,count,`generate ${count} unique writing questions`);
  assert.equal(new Set(items.map(x=>x.id)).size,count);
  const exactUnique=new Set(items.map(x=>x.signature)).size,configUnique=new Set(items.map(x=>x.configurationSignature)).size,reasoningUnique=new Set(items.map(x=>x.reasoningSignature)).size;
  assert.equal(exactUnique,count);
  assert.equal(configUnique,count);
  const xml=buildAssessmentXml({title:`Writing ${count}`,seed},items),manifest=buildManifest();
  assertXmlWellFormed(xml);assertXmlWellFormed(manifest);
  assert.equal((xml.match(/<item ident=/g)||[]).length,count);
  // Package B uses percentage response weights and stores points separately.
  // Check each item's metadata, correct key, and all three zero-weight choices.
  const itemXmls=xml.match(/<item ident=[\s\S]*?<\/item>/g)||[];
  assert.equal(itemXmls.length,count);
  for(const [i,part] of itemXmls.entries()) {
    assert.ok(part.includes('<fieldlabel>points_possible</fieldlabel><fieldentry>2</fieldentry>'));
    assert.ok(part.includes('<decvar maxvalue="100" minvalue="0" defaultval="0" varname="SCORE" vartype="Decimal"/>'));
    assert.ok(part.includes(`<varequal respident="response_1">choice_${items[i].correctIndex}</varequal></conditionvar><setvar action="Set" varname="SCORE">100</setvar>`));
    assert.equal((part.match(/<setvar action="Set" varname="SCORE">0<\/setvar>/g)||[]).length,3);
    assert.equal((part.match(/<setvar action="Set" varname="SCORE">100<\/setvar>/g)||[]).length,1);
  }
  assert.ok(xml.includes(`<fieldlabel>points_possible</fieldlabel><fieldentry>${count*2}</fieldentry>`),'assessment point total is preserved');
  assert.equal(items.reduce((sum,q)=>sum+q.points,0),count*2);
  assert.equal(items.every(q=>xml.includes(`choice_${q.correctIndex}</varequal>`)),true);
  assert.equal(manifest.includes('href="assessment.xml"'),true);
  assert.ok(xml.includes("Source passage")&&xml.includes("Writing question")&&xml.includes("Student response"));
  assert.ok(!xml.includes("<script")&&!xml.includes("onerror="));
  const html=formatQuestionHtml(items[0]); assert.ok(html.includes("<p><strong>Source passage</strong></p>"));
  assert.ok(html.includes("<p><strong>Student response</strong></p>"));
  assert.ok(!html.includes("<script"));
  repeatStats.push({count,seed,unique:items.length,attempts,exactRepeats:count-exactUnique,configurationRepeats:count-configUnique,underlyingReasoningRepeats:count-reasoningUnique});
  const zip=createZip([{name:"imsmanifest.xml",data:manifest},{name:"assessment.xml",data:xml},{name:"metadata.json",data:JSON.stringify({questions:count})}]);
  const data=new Uint8Array(await zip.arrayBuffer()),view=new DataView(data.buffer),decoder=new TextDecoder();
  assert.equal(view.getUint32(0,true),0x04034b50);
  let position=0;const files=new Map();
  while(view.getUint32(position,true)===0x04034b50){
    const size=view.getUint32(position+18,true),nameLength=view.getUint16(position+26,true),extraLength=view.getUint16(position+28,true);
    const name=decoder.decode(data.slice(position+30,position+30+nameLength)),start=position+30+nameLength+extraLength;
    files.set(name,decoder.decode(data.slice(start,start+size)));position=start+size;
  }
  assert.equal(view.getUint32(position,true),0x02014b50);
  assert.deepEqual([...files.keys()],["imsmanifest.xml","assessment.xml","metadata.json"]);
  assert.equal(files.get("assessment.xml"),xml);assert.equal(JSON.parse(files.get("metadata.json")).questions,count);
}

// Combined Java + writing QTI preserves the existing Java code renderer and keyed answers.
const java=generateAssessmentItem("boolean","branch","Intermediate",778899,4);
const writing=generateAssessmentItem("raceces","missing","Beginner",778900,4,{subject:"all",topics:[]});
assert.ok(java&&writing);
java.id="mixed-java";writing.id="mixed-writing";
const mixedXml=buildAssessmentXml({title:"Java and writing",seed:71},[java,writing]);
assertXmlWellFormed(mixedXml);assert.equal((mixedXml.match(/<item ident=/g)||[]).length,2);
assert.ok(mixedXml.includes("&lt;pre&gt;&lt;code&gt;"),"Java question remains in preformatted code block");
assert.ok(mixedXml.includes("Source passage")&&mixedXml.includes("Student response"));
for(const q of [java,writing])assert.ok(mixedXml.includes(`choice_${q.correctIndex}</varequal>`));

// Both valid independent evidence-pair orders must never become answer distractors.
let independent=0,dependent=0;
for(let i=0;i<5000;i++) {
  const item=generateAssessmentItem("raceces","rearrange","Advanced",0x700000+i,2,{subject:"all",topics:[]});
  if(!item)continue;const ch=item._audit.challenge;
  if(ch.dependency)dependent++;else independent++;
  if(!ch.dependency)assert.ok(!item._audit.candidateOrders.some((order,index)=>index!==item.correctIndex&&order.join("|")===ch.solution.alternate.join("|")),"alternate valid order excluded from distractors");
}
assert.ok(independent>0);

console.log(JSON.stringify({totalCandidates:total,accepted,rejected,answerFailures:failures,authored,compositional,acceptedByModeLevel,mathematicsCoverage,repeatStats,independent,dependent,mixedJavaAndWriting:true},null,2));
