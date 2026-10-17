import { familyNames, generateLoop, assessLoop } from "./loop-engine.js?v=loop-redesign-v1";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=java-v1";

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function startLoopLab() {
  const $ = id => document.getElementById(id), tracker = sessionTracker();
  let q, instance, selected = null, closed = false;
  $("main").innerHTML = `<div class="eyebrow">Java · Loops · Counters · Accumulators</div><h1>Loop Lab</h1><p class="intro">Predict what loops execute, how variables change, and why loops stop.</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(familyNames).map(([id,name])=>`<option value="${id}">${name}</option>`).join("")}</select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><p id="stats" class="stats"></p>`;
  addSessionNavigation("../");
  const stats = () => $("stats").textContent = roundSummary("loop-lab");
  function next() {
    if (instance) tracker.skip(instance); q = generateLoop($("mode").value); instance = tracker.begin(q.game,q.title,q.topic,q.topicTitle); selected=null; closed=false;
    $("stage").innerHTML = `<div class="challenge-meta">${esc(q.familyName)} · ${esc(q.concept)}</div><h2>${esc(q.prompt)}</h2><pre class="snippet loop-snippet"><code>${esc(q.code)}</code></pre><div id="choices" class="loop-choices" role="radiogroup" aria-label="Answer choices">${q.choices.map((c,i)=>`<button class="secondary loop-choice" data-answer="${esc(c)}" aria-pressed="false"><span class="choice-letter">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`).join("")}</div><div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button></div><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div>`;
    for (const b of $("choices").querySelectorAll("button")) b.onclick=()=>{if(closed)return;selected=b.dataset.answer;for(const x of $("choices").querySelectorAll("button")){x.classList.toggle("selected",x===b);x.setAttribute("aria-pressed",String(x===b));}$("check").disabled=false;};
    $("check").onclick=()=>{if(closed||selected===null)return;const correct=assessLoop(q,{answer:selected});const event=tracker.submit(instance,correct);if(!event.accepted)return;if(!correct)tracker.reveal(instance);closed=true;for(const b of $("stage").querySelectorAll("button")){if(b.id!=="next")b.disabled=true;}const answer=q.answer;for(const b of $("choices").querySelectorAll("button")){b.classList.toggle("correct-answer",b.dataset.answer===answer);b.classList.toggle("incorrect-answer",b.dataset.answer===selected&&selected!==answer);}const f=$("feedback");f.hidden=false;f.className=`feedback ${correct?"good":"bad"}`;f.textContent=`${correct?"Correct.":"Not quite."} Correct answer: ${q.correctAnswer}. ${q.explanation}`;f.focus();stats();};
    $("next").onclick=next; stats();
  }
  $("mode").onchange=next; $("new").onclick=next; window.addEventListener("pagehide",()=>{if(instance)tracker.skip(instance);}); next();
}
startLoopLab();
