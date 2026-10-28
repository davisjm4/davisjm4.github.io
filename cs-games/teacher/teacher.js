import { sources, sourceById } from "./adapters.js?v=package-f-20261027";
import { racecesCatalog } from "./raceces-adapter.js?v=package-b-20261026";
import { workplaceCatalog } from "./workplace-adapter.js?v=package-b-20261026";
import { buildQuiz, attemptAssessmentItem, selectionEligibility } from "./assessment-builder.js?v=package-f-20261027";
import { buildAssessmentXml, buildManifest, createZip, escapeHtml, formatChoiceHtml, formatQuestionHtml, validateAssessment } from "./qti.js?v=package-f-20261027";
const $ = id => document.getElementById(id);
let quiz=[], config=null;
let previousSources=[];
function fillSources(){
  $("source").innerHTML=sources.map(s=>`<option value="${s.id}" ${s.id==="boolean"?"selected":""}>${escapeHtml(s.name)}</option>`).join("");
  fillRacecesFilters();
  fillWorkplaceFilters();
  updateModes();
}
function fillWorkplaceFilters(){
 const catalog=workplaceCatalog();
 $("workplace-skills").innerHTML=catalog.skills.map(s=>`<option value="${escapeHtml(s.id)}">${s.number}. ${escapeHtml(s.name)}</option>`).join("");
 $("workplace-contexts").innerHTML=catalog.contexts.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
}
function fillRacecesFilters(){
 const catalog=racecesCatalog();
 $("raceces-subject").innerHTML='<option value="all">All Topics (all subjects)</option>'+catalog.subjects.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
 updateRacecesTopics();
}
function updateRacecesTopics(){
 const catalog=racecesCatalog(),subject=$("raceces-subject").value||"all",picked=new Set([...$("raceces-topics").querySelectorAll("input:checked")].map(x=>x.value));
 const topics=catalog.topics.filter(t=>subject==="all"||t.subject===subject);
 $("raceces-topics").innerHTML=topics.map(t=>`<label class="topic-option"><input type="checkbox" value="${escapeHtml(t.id)}" ${picked.has(t.id)?"checked":""}><span>${escapeHtml(t.title)} <small>(${escapeHtml(t.subject)})</small></span></label>`).join("");
}
function updateSourceFilters(){
 const selected=selectedSources();
 $("raceces-filters").hidden=!selected.includes("raceces");
 $("workplace-filters").hidden=!selected.includes("workplace-readiness");
}
function selectedSources(){return [...$("source").selectedOptions].map(o=>o.value)}
function updateModes(){
  const selected=new Set([...$("mode").selectedOptions].map(o=>o.value));
  const currentSources=selectedSources();
  for(const id of currentSources){if(!previousSources.includes(id))for(const m of sourceById[id].modes)selected.add(`${id}::${m.id}`)}
  $("mode").innerHTML=selectedSources().flatMap(id=>{const s=sourceById[id];return s.modes.map(m=>`<option value="${id}::${m.id}">${escapeHtml(s.name)} — ${escapeHtml(m.name)}${m.difficulties?"":" (mixed level)"}</option>`)}).join("");
  [...$("mode").options].forEach(o=>{if(selected.has(o.value))o.selected=true});
  if(!$("mode").selectedOptions.length) [...$("mode").options].forEach(o=>o.selected=true);
  previousSources=currentSources;
}
function updateDifficultyOptions(){
 const selected=[...$("mode").selectedOptions].map(o=>{const [id,mode]=o.value.split('::');return sourceById[id].modes.find(m=>m.id===mode)}),strict=selected.filter(m=>m.difficultyPolicy==='strict');
 for(const option of $("difficulty").options){const allowed=option.value==='mixed'||selected.some(m=>m.difficulties)&&strict.every(m=>m.difficulties.some(d=>d.toLowerCase()===option.value.toLowerCase()));option.hidden=!allowed;option.disabled=!allowed;}
 if($("difficulty").selectedOptions[0]?.disabled)$("difficulty").value='mixed';
}
function makeConfig(){
 const pairs=[...$("mode").selectedOptions].map(o=>{const [sourceId,modeId]=o.value.split("::");return{sourceId,modeId}});
 const raw=$("seed").value.trim(); return {title:$("quiz-title").value.trim()||"CS Games Practice Quiz",pairs,count:Math.max(1,Math.min(50,Math.trunc(Number($("question-count").value))||5)),points:Math.max(1,Math.min(100,Number($("points").value)||1)),difficulty:$("difficulty").value,seed:raw===""?(Date.now()>>>0):(Number(raw)>>>0),racecesFilters:{subject:$("raceces-subject").value||"all",topics:[...$("raceces-topics").querySelectorAll("input:checked")].map(x=>x.value)},workplaceFilters:{skills:[...$("workplace-skills").selectedOptions].map(x=>x.value),contexts:[...$("workplace-contexts").selectedOptions].map(x=>x.value)}};
}
function render(){
 $("regenerate-quiz").disabled=!quiz.length;$("download").disabled=!quiz.length||!!validateAssessment(quiz,config?.count).length;
 if(!quiz.length){$("quiz-summary").hidden=true;$("preview").innerHTML="";return}
 $("quiz-summary").hidden=false;const total=quiz.reduce((s,q)=>s+q.points,0),names=[...new Set(quiz.map(q=>q.source))];
 $("quiz-summary").innerHTML=`<h2>Quiz summary</h2><p class="quiz-total"><span><strong>${quiz.length}</strong> questions</span><span><strong>${total}</strong> total points</span><span>Sources: ${names.map(escapeHtml).join(", ")}</span></p>`;
 $("preview").innerHTML="<h2>Preview</h2>"+quiz.map((item,index)=>`<article class="quiz-item"><h3>Question ${index+1}</h3><div class="question-content">${formatQuestionHtml(item)}</div><p class="source-note">${escapeHtml(item.source)} · ${escapeHtml(item.mode)} · ${escapeHtml(item.difficulty)}${item.topic?` · ${escapeHtml(item.topic)}`:""}${item.contextId?` · ${escapeHtml(workplaceCatalog().contexts.find(c=>c.id===item.contextId)?.name||item.contextId)}`:""} · ${item.points} point${item.points===1?"":"s"}${item.eligibilityNotice?` · ${escapeHtml(item.eligibilityNotice)}`:""}</p><ol class="choice-list">${item.choices.map((choice,i)=>`<li class="${i===item.correctIndex?"correct":""}">${formatChoiceHtml(choice)}${i===item.correctIndex?" — Correct answer":""}</li>`).join("")}</ol><p class="answer-note"><strong>Explanation:</strong> ${escapeHtml(item.explanation)}</p><button class="secondary regenerate-one" data-index="${index}">Regenerate Question</button></article>`).join("");
 document.querySelectorAll(".regenerate-one").forEach(b=>b.onclick=()=>regenerateOne(Number(b.dataset.index)));
}
function generateQuiz(){config=makeConfig();const result=buildQuiz(config);quiz=result.items;$("status").textContent=result.error||["Quiz generated. Review every answer before downloading.",...result.notices].join(" ");render()}
function regenerateOne(index){
 if(!config||!quiz[index])return;const previous=quiz[index],excluded=new Set(quiz.filter((_,i)=>i!==index).flatMap(q=>[`config:${q.sourceId}:${q.configurationSignature||q.signature}`,...(q.reasoningSignature?[`reasoning:${q.sourceId}:${q.reasoningSignature}`]:[])]));
 const result=attemptAssessmentItem(config,{sourceId:previous.sourceId,modeId:previous.modeId},index,new Set(),excluded),replacement=result.item;
 if(!replacement){$("status").textContent=result.error+" Other questions were kept.";return}
 replacement.points=previous.points;quiz[index]=replacement;$("status").textContent=`Question ${index+1} regenerated.`;render();
}
function downloadZip(){
 const errors=validateAssessment(quiz,config?.count);if(errors.length){$("status").textContent="Export blocked: "+errors.join(" ");$("download").disabled=true;return}
 const xml=buildAssessmentXml(config,quiz),manifest=buildManifest(),metadata=JSON.stringify({title:config.title,sources:[...new Set(quiz.map(q=>q.source))],questions:quiz.length,points:quiz.reduce((s,q)=>s+q.points,0)},null,2);
 const blob=createZip([{name:"imsmanifest.xml",data:manifest},{name:"assessment.xml",data:xml},{name:"metadata.json",data:metadata}]);const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=(config.title.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"")||"cs-games-quiz")+".zip";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);$("status").textContent="Validated QTI 1.2 ZIP downloaded. Canvas import scoring and feedback display have not been verified in a sandbox. Review imported points and explanations before assigning.";
}
function showEligibility(){
 updateDifficultyOptions();
 const c=makeConfig(),messages=new Set();
 for(const pair of c.pairs){
  const mode=sourceById[pair.sourceId].modes.find(m=>m.id===pair.modeId);
  const levels=c.difficulty.toLowerCase()==="mixed"?mode.difficulties||["Mixed"]:[c.difficulty];
  for(const difficulty of levels){const result=selectionEligibility({...c,difficulty},pair);if(result.error||result.notice)messages.add(`${sourceById[pair.sourceId].name}: ${result.error||result.notice}`)}
 }
 $("eligibility").textContent=[...messages].join(" ")||"Selected modes support the requested levels. Questions must also pass validation before export.";
}
$("source").onchange=()=>{updateModes();updateSourceFilters();showEligibility()};$("raceces-subject").onchange=()=>{updateRacecesTopics();showEligibility()};for(const id of ["mode","difficulty","raceces-topics","workplace-skills","workplace-contexts"])$(id).addEventListener("change",showEligibility);$("generate").onclick=generateQuiz;$("regenerate-quiz").onclick=generateQuiz;$("download").onclick=downloadZip;fillSources();updateSourceFilters();showEligibility();
