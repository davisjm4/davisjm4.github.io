import { sources, sourceById, generateAssessmentItem } from "./adapters.js?v=20261022-workplace2";
import { racecesCatalog } from "./raceces-adapter.js?v=20261021-raceces1";
import { workplaceCatalog } from "./workplace-adapter.js?v=20261022-workplace1";
import { distributePairs } from "./quiz-distribution.js?v=20261022-workplace1";
import { buildAssessmentXml, buildManifest, createZip, escapeHtml, formatChoiceHtml, formatQuestionHtml } from "./qti.js?v=20261022-workplace1";
const $ = id => document.getElementById(id);
const hash = text => { let h=2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h=Math.imul(h,16777619); } return (h>>>0).toString(36); };
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
function makeConfig(){
 const pairs=[...$("mode").selectedOptions].map(o=>{const [sourceId,modeId]=o.value.split("::");return{sourceId,modeId}});
 const raw=$("seed").value.trim(); return {title:$("quiz-title").value.trim()||"CS Games Practice Quiz",pairs,count:Math.max(1,Math.min(50,Number($("question-count").value)||5)),points:Math.max(1,Math.min(100,Number($("points").value)||1)),difficulty:$("difficulty").value,seed:raw===""?(Date.now()>>>0):(Number(raw)>>>0),racecesFilters:{subject:$("raceces-subject").value||"all",topics:[...$("raceces-topics").querySelectorAll("input:checked")].map(x=>x.value)},workplaceFilters:{skills:[...$("workplace-skills").selectedOptions].map(x=>x.value),contexts:[...$("workplace-contexts").selectedOptions].map(x=>x.value)}};
}
function attemptItem(pair,index,used,excluded=new Set()){
 const selected=sourceById[pair.sourceId].modes.find(m=>m.id===pair.modeId);
 let level="Mixed";
 if(selected.difficulties){
   if(config.difficulty==="mixed")level=selected.difficulties[(index+Math.floor(index/selected.difficulties.length))%selected.difficulties.length];
   else if(selected.difficulties.includes(config.difficulty))level=config.difficulty;
   else {const order=["Beginner","Intermediate","Advanced"],want=order.indexOf(config.difficulty);level=[...selected.difficulties].sort((a,b)=>Math.abs(order.indexOf(a)-want)-Math.abs(order.indexOf(b)-want))[0]}
 }
 for(let attempt=0;attempt<140;attempt++){
   const seed=(config.seed+index*1009+attempt*7919)>>>0;
   const filters=pair.sourceId==="raceces"?{...config.racecesFilters}:pair.sourceId==="workplace-readiness"?{workplace:config.workplaceFilters}:{};
   const item=generateAssessmentItem(pair.sourceId,pair.modeId,level,seed,config.points,filters);
   const uniqueSignature=item?.configurationSignature||item?.signature;
   const configKey=`config:${item?.sourceId}:${uniqueSignature}`;
   const reasoningKey=item?.reasoningSignature?`reasoning:${item.sourceId}:${item.reasoningSignature}`:"";
   if(!item||used.has(configKey)||(reasoningKey&&used.has(reasoningKey))||excluded.has(configKey)||(reasoningKey&&excluded.has(reasoningKey)))continue;
   item.id=`${item.sourceId}-${hash(`${item.signature}|${seed}|${index}`)}`;
   if(used.has(configKey)||(reasoningKey&&used.has(reasoningKey)))continue;
   used.add(configKey);if(reasoningKey)used.add(reasoningKey);return item;
 }
 return null;
}
function buildQuiz(c,count=c.count,excluded=new Set()){
 const used=new Set(excluded),items=[];if(!c.pairs.length)return{items,error:"Select at least one exportable practice mode."};
 const ordered=distributePairs(c.pairs,count,c.seed);
 for(let i=0;i<count;i++){
   const pair=ordered[i],item=attemptItem(pair,i,used);
   if(!item)return{items,error:`Could create ${items.length} of ${count} distinct validated questions. Reduce the count or choose more modes/sources; questions were not repeated.`};
   items.push(item);
 }
 return{items,error:""};
}
function indexOffset(seed){return seed>>>0}
function render(){
 $("regenerate-quiz").disabled=!quiz.length;$("download").disabled=!quiz.length;
 if(!quiz.length){$("quiz-summary").hidden=true;$("preview").innerHTML="";return}
 $("quiz-summary").hidden=false;const total=quiz.reduce((s,q)=>s+q.points,0),names=[...new Set(quiz.map(q=>q.source))];
 $("quiz-summary").innerHTML=`<h2>Quiz summary</h2><p class="quiz-total"><span><strong>${quiz.length}</strong> questions</span><span><strong>${total}</strong> total points</span><span>Sources: ${names.map(escapeHtml).join(", ")}</span></p>`;
 $("preview").innerHTML="<h2>Preview</h2>"+quiz.map((item,index)=>`<article class="quiz-item"><h3>Question ${index+1}</h3><div class="question-content">${formatQuestionHtml(item)}</div><p class="source-note">${escapeHtml(item.source)} · ${escapeHtml(item.mode)} · ${escapeHtml(item.difficulty)}${item.topic?` · ${escapeHtml(item.topic)}`:""}${item.contextId?` · ${escapeHtml(workplaceCatalog().contexts.find(c=>c.id===item.contextId)?.name||item.contextId)}`:""} · ${item.points} point${item.points===1?"":"s"}</p><ol class="choice-list">${item.choices.map((choice,i)=>`<li class="${i===item.correctIndex?"correct":""}">${formatChoiceHtml(choice)}${i===item.correctIndex?" — Correct answer":""}</li>`).join("")}</ol><p class="answer-note"><strong>Explanation:</strong> ${escapeHtml(item.explanation)}</p><button class="secondary regenerate-one" data-index="${index}">Regenerate Question</button></article>`).join("");
 document.querySelectorAll(".regenerate-one").forEach(b=>b.onclick=()=>regenerateOne(Number(b.dataset.index)));
}
function generateQuiz(){config=makeConfig();const result=buildQuiz(config);quiz=result.items;$("status").textContent=result.error||"Quiz generated. Review every answer before downloading.";render()}
function regenerateOne(index){
 if(!config||!quiz[index])return;const previous=quiz[index],excluded=new Set(quiz.filter((_,i)=>i!==index).flatMap(q=>[`config:${q.sourceId}:${q.configurationSignature||q.signature}`,...(q.reasoningSignature?[`reasoning:${q.sourceId}:${q.reasoningSignature}`]:[])]));
 const replacement=attemptItem({sourceId:previous.sourceId,modeId:previous.modeId},index+1,new Set(),excluded);
 if(!replacement){$("status").textContent="No distinct validated replacement was available for that source and mode. Other questions were kept.";return}
 replacement.points=previous.points;quiz[index]=replacement;$("status").textContent=`Question ${index+1} regenerated.`;render();
}
function downloadZip(){
 const xml=buildAssessmentXml(config,quiz),manifest=buildManifest(),metadata=JSON.stringify({title:config.title,sources:[...new Set(quiz.map(q=>q.source))],questions:quiz.length,points:quiz.reduce((s,q)=>s+q.points,0)},null,2);
 const blob=createZip([{name:"imsmanifest.xml",data:manifest},{name:"assessment.xml",data:xml},{name:"metadata.json",data:metadata}]);const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=(config.title.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"")||"cs-games-quiz")+".zip";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);$("status").textContent="QTI 1.2 ZIP downloaded. Import it through Canvas course settings and review the quiz before assigning it.";
}
$("source").onchange=()=>{updateModes();updateSourceFilters()};$("raceces-subject").onchange=updateRacecesTopics;$("generate").onclick=generateQuiz;$("regenerate-quiz").onclick=generateQuiz;$("download").onclick=downloadZip;fillSources();updateSourceFilters();
