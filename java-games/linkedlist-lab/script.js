import * as E from "./engine.js?v=linkedlist-v1";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=active-time-v1";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tracker=sessionTracker();
let rng=E.makeRng(new URLSearchParams(location.search).get("seed")||Date.now()), ch, instance, selected=null, links={}, head=null, closed=false;
const mapNodes=nodes=>Object.fromEntries(nodes.map(n=>[n.id,n]));
function preview(nodes,h,next){const m=mapNodes(nodes),seen=new Set(),out=[];let id=h;while(id&&!seen.has(id)&&out.length<=nodes.length){seen.add(id);const n=m[id];if(!n){out.push("missing");break;}out.push(n.value);id=next[id]??null;}if(id)out.push("cycle");return out;}
function mini(vals){return '<div class="ll-mini">'+vals.map((v,i)=>(i?'<span class="ll-arrow">→</span>':'')+'<span class="ll-node">'+esc(v)+'</span>').join('')+'<span class="ll-arrow">→</span><span class="ll-null">null</span></div>';}
function full(vals){return '<div class="ll-chain">'+vals.map((v,i)=>(i?'<span class="ll-arrow">→</span>':'')+'<span class="ll-node"><strong>'+esc(v)+'</strong><small>'+(i===0?'head':i===vals.length-1?'tail':'node')+'</small></span>').join('')+'<span class="ll-arrow">→</span><span class="ll-null">null</span></div>';}
function feedback(ok,text,reveal){const f=$("feedback");f.hidden=false;f.className="feedback "+(reveal?"":ok?"good":"bad");f.textContent=text;f.focus();}
function paint(){if(ch.kind==="links"){ $("preview").innerHTML=full(preview(ch.nodes,head,links)); } document.querySelectorAll("[data-choice]").forEach(b=>{const on=Number(b.dataset.choice)===selected;b.classList.toggle("selected",on);b.setAttribute("aria-pressed",on);});}
function render(){
 const s=$("stage");s.innerHTML='<div class="eyebrow">'+esc(E.MODES[ch.mode])+'</div><h2>'+esc(ch.prompt)+'</h2>';
 if(ch.kind==="links"){
  s.insertAdjacentHTML("beforeend",'<p>Change each <strong>next</strong> reference. The chain is evaluated from the selected head, not from screen position.</p><div id="head-control" class="ll-controls"></div><div id="link-table" class="ll-link-table"></div><div id="preview" class="ll-chain"></div>');
  $("head-control").innerHTML='<label>Head reference<select id="head-select">'+ch.nodes.map(n=>'<option value="'+n.id+'" '+(head===n.id?'selected':'')+'>'+n.value+'</option>').join('')+'</select></label>';
  $("head-select").onchange=()=>{head=$("head-select").value;paint();};
  $("link-table").innerHTML=ch.nodes.map(n=>'<div class="ll-link-row"><strong>'+n.value+'.next</strong><select data-node="'+n.id+'"><option value="">null</option>'+ch.nodes.filter(x=>x.id!==n.id).map(x=>'<option value="'+x.id+'" '+(links[n.id]===x.id?'selected':'')+'>'+x.value+'</option>').join('')+'</select></div>').join('');
  $("link-table").querySelectorAll("select[data-node]").forEach(x=>x.onchange=()=>{links[x.dataset.node]=x.value||null;paint();});paint();
 } else if(ch.kind==="structure"){
  s.insertAdjacentHTML("beforeend",'<p>Starting chain:</p>'+full(ch.nodes.map(n=>n.value))+'<p><strong>Operation:</strong> '+esc(ch.operation)+'</p><p>Choose the resulting linked structure.</p><div id="choices" class="ll-choice-grid"></div>');
  $("choices").innerHTML=ch.choices.map((x,i)=>'<button type="button" class="ll-choice" data-choice="'+i+'" aria-pressed="false">'+mini(x.values)+'</button>').join('');
 } else if(ch.kind==="trace"){
  s.insertAdjacentHTML("beforeend",full(ch.values)+'<pre class="ll-code">'+esc(ch.code)+'</pre><p><strong>'+esc(ch.label)+'</strong></p><div id="choices" class="ll-choice-grid"></div>');
  $("choices").innerHTML=ch.choices.map((x,i)=>'<button type="button" class="ll-choice" data-choice="'+i+'" aria-pressed="false"><strong>'+esc(x)+'</strong></button>').join('');
 } else {
  s.insertAdjacentHTML("beforeend",'<pre class="ll-code">'+esc(ch.code)+'</pre><p><strong>'+esc(ch.question)+'</strong></p><div id="choices" class="ll-choice-grid"></div>');
  $("choices").innerHTML=ch.choices.map((x,i)=>'<button type="button" class="ll-choice" data-choice="'+i+'" aria-pressed="false">'+esc(x)+'</button>').join('');
 }
 if(ch.kind!=="links")$("choices").querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{if(!closed){selected=Number(b.dataset.choice);paint();}});
 s.insertAdjacentHTML("beforeend",'<div class="actions"><button id="check">Check Answer</button><button id="show" class="secondary">Show Answer</button><button id="next" class="secondary" hidden>Next Challenge →</button></div>');
 $("check").onclick=submit;$("show").onclick=show;$("next").onclick=next;paint();
}
function complete(){return ch.kind==="links"?head&&ch.nodes.every(n=>Object.prototype.hasOwnProperty.call(links,n.id)):selected!==null;}
function answerNow(){if(ch.kind==="links"){head=ch.answer.head;links={...ch.answer.next};$("head-select").value=head;$("link-table").querySelectorAll("[data-node]").forEach(x=>x.value=links[x.dataset.node]||"");}else{selected=ch.answer;const b=$("[data-choice=\""+selected+"\"]");if(b)b.classList.add("correct");}paint();$("stage").querySelectorAll("button,select").forEach(x=>{if(x.id!=="next")x.disabled=true;});}
function finish(ok,text,reveal){closed=true;answerNow();$("check").hidden=true;$("show").hidden=true;$("next").hidden=false;feedback(ok,text,reveal);$("stats").textContent=roundSummary("linkedlist-lab");}
function submit(){if(closed)return;if(!complete()){feedback(false,"Make one complete selection before checking.",true);return;}const ok=E.assess(ch,ch.kind==="links"?{head,next:{...links}}:selected);const r=tracker.submit(instance,ok);if(!r.accepted)return;if(!ok){tracker.reveal(instance);finish(false,"✗ Not quite. "+(ch.explanation||"Review the references.")+" The correct result is shown.");}else finish(true,"✓ Correct! "+(ch.explanation||"The structure and Java behavior match the requirement."),false);}
function show(){if(closed)return;tracker.reveal(instance);finish(false,"Answer shown. "+(ch.explanation||"The displayed structure follows the linked references."),true);}
function next(){if(instance&&!closed)tracker.skip(instance);ch=E.generate($("mode").value,rng);instance=tracker.begin("linkedlist-lab",E.GAME.name,ch.mode,E.MODES[ch.mode]);selected=null;closed=false;if(ch.kind==="links"){head=ch.head;links={...ch.next};}$("feedback").hidden=true;render();$("stats").textContent=roundSummary("linkedlist-lab");}
document.addEventListener("DOMContentLoaded",()=>{$("main").innerHTML='<div class="eyebrow">Java · Nodes · references · LinkedList API</div><h1>LinkedList Lab</h1><p class="intro ll-intro">'+esc(E.GAME.description)+'</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option><option value="link">Link the Nodes</option><option value="mutate">Insert & Remove</option><option value="trace">Traversal Tracker</option><option value="collections">Java Collections & Decisions</option></select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel ll-stage"></section><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div><p id="stats" class="stats"></p>';addSessionNavigation("../");$("mode").onchange=next;$("new").onclick=next;next();});
