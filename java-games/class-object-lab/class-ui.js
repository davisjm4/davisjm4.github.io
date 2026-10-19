import {modeNames,createClassObjectGenerator,assessClassObject} from "./class-engine.js?v=class-object-v3";
import {formatJavaCode} from "./java-format.js?v=class-format-v1";
import {sessionTracker,addSessionNavigation,roundSummary} from "../session.js?v=java-v1";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const CBR_MODE="class-builder-rearrange";
const CBR_FILES=["rng.js","concepts.js","java-model.js","arrangement.js","validator.js","generator.js","feedback.js","session.js","ui.js"];
let cbrLoadPromise;
function loadCBR(){
  if(window.CBR?.ui?.mount)return Promise.resolve();
  if(cbrLoadPromise)return cbrLoadPromise;
  cbrLoadPromise=new Promise((resolve,reject)=>{
    const css="class-builder-rearrange/style.css";
    if(!document.querySelector('link[data-cbr-style]')){const l=document.createElement("link");l.rel="stylesheet";l.href=css;l.dataset.cbrStyle="true";document.head.appendChild(l);}
    let i=0;const next=()=>{if(i===CBR_FILES.length){resolve();return;}const s=document.createElement("script");s.src=`class-builder-rearrange/src/${CBR_FILES[i++]}`;s.onload=next;s.onerror=()=>reject(new Error("Could not load Class Builder components."));document.head.appendChild(s);};next();
  });
  return cbrLoadPromise;
}
export function startClassObjectLab(){
 const $=id=>document.getElementById(id),tracker=sessionTracker(),generator=createClassObjectGenerator(Date.now());
 let question,instance,selected=null,closed=false,cbrApp=null,cbrHost=null,viewToken=0;
 const modes=`<option value="mixed" selected>Mixed Practice</option>${Object.entries(modeNames).map(([id,n])=>`<option value="${id}">${n}</option>`).join("")}<option value="${CBR_MODE}">Class Builder — Rearrange</option>`;
 $("main").innerHTML=`<div class="eyebrow">Java · Objects · State · Encapsulation</div><h1>Class &amp; Object Lab</h1><p class="intro">Reason about object creation, state changes, references, and methods.</p><div class="toolbar"><label>Practice mode <select id="mode">${modes}</select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><p id="stats" class="stats"></p>`;
 addSessionNavigation("../");const stats=()=>$ ("stats").textContent=roundSummary("class-object-lab");
 function cards(reveal=false){if(!question.objects)return"";return `<div class="objects" aria-label="Object state diagram">${question.objects.map(o=>`<article class="object-card"><strong>${esc(o.name)}</strong>${Object.entries(o.fields).map(([k,v])=>`<div><span>${esc(k)}:</span> <code>${reveal?(v==="?"?question.answer:v):(!o.hidden?.includes(k)?v:"?")}</code></div>`).join("")}</article>`).join("")}</div>${reveal&&question.arrows?`<div class="arrows" aria-label="Reference relationships">${question.arrows.map(esc).join(" · ")}</div>`:""}`}
 function finishLegacy(){if(instance&&!closed)tracker.skip(instance);instance=null;closed=true;}
 function next(){finishLegacy();question=generator.next($("mode").value);instance=tracker.begin(question.game,question.title,question.topic,question.topicTitle);selected=null;closed=false;$("stage").innerHTML=`<div class="challenge-meta">${esc(question.topicTitle)}</div>${cards()}<pre class="snippet class-snippet"><code>${esc(formatJavaCode(question.code))}</code></pre><h2>${esc(question.prompt)}</h2><div id="choices" class="choices" role="radiogroup" aria-label="Answer choices">${question.choices.map((c,i)=>`<button class="secondary choice" data-answer="${esc(c)}" aria-pressed="false"><span class="choice-letter">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`).join("")}</div><div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button></div><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div>`;
 for(const b of $("choices").querySelectorAll("button"))b.onclick=()=>{if(closed)return;selected=b.dataset.answer;for(const x of $("choices").querySelectorAll("button")){x.classList.toggle("selected",x===b);x.setAttribute("aria-pressed",String(x===b))}$("check").disabled=false};
 $("check").onclick=()=>{if(closed||selected===null)return;const correct=assessClassObject(question,{answer:selected}),event=tracker.submit(instance,correct);if(!event.accepted)return;if(!correct)tracker.reveal(instance);closed=true;for(const b of $("stage").querySelectorAll("button"))if(b.id!=="next")b.disabled=true;for(const b of $("choices").querySelectorAll("button")){b.classList.toggle("correct-answer",b.dataset.answer===question.answer);b.classList.toggle("incorrect-answer",b.dataset.answer===selected&&selected!==question.answer)}const f=$("feedback");f.hidden=false;f.className=`feedback ${correct?"good":"bad"}`;f.innerHTML=`<strong>${correct?"Correct.":"Not quite."}</strong> Correct answer: ${esc(question.correctAnswer)}<br>${esc(question.explanation)}`+cards(true);f.focus();stats()};$("next").onclick=next;stats()}
 async function openCBR(){const token=++viewToken;finishLegacy();$("new").hidden=true;$("stats").hidden=true;$("stage").textContent="Loading Class Builder…";try{await loadCBR();if(token!==viewToken||$("mode").value!==CBR_MODE)return;$("stage").textContent="";cbrHost=document.createElement("div");$("stage").appendChild(cbrHost);const ids=new Map(),t=tracker;const topic=d=>`class-builder-rearrange/${d}`;const adapter={onChallengeBegin:x=>{const id=t.begin("class-object-lab","Class & Object Lab",topic(x.difficulty),`Class Builder — ${x.difficulty[0].toUpperCase()+x.difficulty.slice(1)}`);ids.set(x.id,id)},onCheck:x=>{const id=ids.get(x.id);if(id)t.submit(id,x.correct)},onHint:x=>{const id=ids.get(x.id);if(id)t.annotate(id,{classBuilderRearrange:{hints:x.hints}})},onReveal:x=>{const id=ids.get(x.id);if(id)t.reveal(id)},onSkip:x=>{const id=ids.get(x.id);if(id)t.skip(id)}};cbrApp=window.CBR.ui.mount(cbrHost,{adapter,difficulty:"beginner"});}catch(e){$("stage").textContent=`Class Builder could not load: ${e.message}`;$("new").hidden=false;$("stats").hidden=false}}
 function closeCBR(){if(cbrApp){cbrApp.tracker.recordSkip();cbrApp.destroy();cbrApp=null;}cbrHost=null;}
 async function switchMode(){if($("mode").value===CBR_MODE){await openCBR();return;}viewToken++;closeCBR();$("new").hidden=false;$("stats").hidden=false;next()}
 $("mode").addEventListener("change",switchMode);$("new").onclick=()=>{if($("mode").value===CBR_MODE)cbrApp?.newChallenge();else next()};
 window.addEventListener("pagehide",()=>{viewToken++;closeCBR();finishLegacy()});
 const initial=new URLSearchParams(location.search).get("mode");if(initial===CBR_MODE){$("mode").value=CBR_MODE;openCBR()}else next();
}
startClassObjectLab();
