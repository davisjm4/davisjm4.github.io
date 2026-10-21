import * as E from "./engine.js?v=bool-v5";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=per-mode-daily-v1";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
const tracker = sessionTracker();
let q, instance, selected = null, closed = false;
// Bounded in-memory repeat avoidance (120 challenges). It is a safeguard only;
// the generators themselves provide the variety.
const practice = E.createPracticeSession({ historySize: 120 });

function stats() { $("stats").textContent = roundSummary("boolean-conditional-lab", $("mode").value); }
function codeHtml() {
  if (q.kind !== "select") return `<pre class="snippet bool-code"><code>${esc(q.code)}</code></pre>`;
  return `<pre class="snippet bool-code">${q.tokens.map((t, i) => `<button type="button" class="bool-token" data-token="${i}" aria-pressed="false">${esc(t.text)}</button>`).join(" ")}</pre>`;
}
function tableHtml() {
  if (!q.table) return "";
  const vars = Object.keys(q.table[0]).filter(k => k !== "result");
  return `<div class="truth-wrap"><table class="truth-table"><caption>Truth table for <code>${esc(q.expression || q.expressions?.join(" ≡ ") || "the expression")}</code></caption><thead><tr>${vars.map(v=>`<th scope="col">${esc(v)}</th>`).join("")}<th scope="col">Result</th></tr></thead><tbody>${q.table.map((row,i)=>`<tr${i===q.highlightedRow?' class="focus-row"':''}>${vars.map(v=>`<td>${row[v]?"True":"False"}</td>`).join("")}<td>${row.result===null?'? <span class="sr-only">(missing result)</span>':row.result?"True":"False"}</td></tr>`).join("")}</tbody></table></div>`;
}
function render() {
  const choiceHtml = q.kind === "select" ? `<p class="muted">Tap the complete operator or expression that answers the question.</p>` : `<div class="bool-choices" role="radiogroup" aria-label="Answer choices">${q.choices.map((c, i) => `<button type="button" class="secondary bool-choice" data-choice="${i}" role="radio" aria-checked="false"><code>${esc(c)}</code></button>`).join("")}</div>`;
  $("stage").innerHTML = `<div class="eyebrow">${esc(q.modeTitle)} · ${esc($("difficulty").value)}</div><h2>${esc(q.question)}</h2>${codeHtml()}${tableHtml()}${choiceHtml}<div class="actions"><button id="check" disabled>Check Answer</button><button id="skip" class="secondary">Skip</button><button id="next" class="secondary" hidden>Next Challenge →</button></div><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div>`;
  if (q.kind === "select") {
    for (const b of $("stage").querySelectorAll("[data-token]")) b.onclick = () => { if (closed) return; selected = Number(b.dataset.token); for (const x of $("stage").querySelectorAll("[data-token]")) { x.classList.toggle("selected", x === b); x.setAttribute("aria-pressed", String(x === b)); } $("check").disabled = false; };
  } else {
    for (const b of $("stage").querySelectorAll("[data-choice]")) b.onclick = () => { if (closed) return; selected = Number(b.dataset.choice); for (const x of $("stage").querySelectorAll("[data-choice]")) { const on = x === b; x.classList.toggle("selected", on); x.setAttribute("aria-checked", String(on)); } $("check").disabled = false; };
  }
  $("check").onclick = submit;
  $("skip").onclick = next;
  $("next").onclick = next;
  stats();
}
function next() {
  if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  q = practice.next($("mode").value, $("difficulty").value);
  instance = tracker.begin("boolean-conditional-lab", E.booleanGame.name, q.topic, E.booleanGame.modes[q.topic], q.mode, E.booleanGame.modes[q.mode]); closed = false; selected = null; render();
}
function submit() {
  if (closed || selected === null || tracker.status(instance) !== "active") return;
  const correct = E.assess(q, selected); const outcome = tracker.submit(instance, correct); if (!outcome.accepted) return; if (!correct) tracker.reveal(instance); closed = true;
  for (const b of $("stage").querySelectorAll("[data-choice],[data-token]")) { b.disabled = true; const i = Number(b.dataset.choice ?? b.dataset.token); if (i === q.answer) b.classList.add("answer"); if (i === selected && !correct) b.classList.add("wrong"); }
  $("check").disabled = true; $("skip").hidden = true; $("next").hidden = false; const fb = $("feedback"); fb.hidden = false; fb.className = `feedback ${correct ? "good" : "bad"}`; fb.innerHTML = `<strong>${correct ? "✓ Correct!" : "✗ Not quite."}</strong>${correct ? "" : `<br>Correct answer: <code>${esc(q.answerText)}</code>`}<br>${esc(q.explanation)}<br><span class="muted">${correct ? "First-try correct recorded." : "First attempt recorded."}</span>`; fb.focus(); stats();
}
function init() {
  $("main").innerHTML = `<div class="eyebrow">Java · Boolean logic · Conditions</div><h1>Boolean &amp; Conditional Lab</h1><p class="intro">Evaluate expressions, follow branches, and choose conditions that match Java requirements.</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(E.booleanGame.modes).map(([id, title]) => `<option value="${id}">${title}</option>`).join("")}</select></label><label>Difficulty <select id="difficulty"><option>Beginner</option><option selected>Intermediate</option><option>Advanced</option></select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><p id="stats" class="stats"></p>`;
  addSessionNavigation("../"); $("mode").onchange = next; $("difficulty").onchange = next; $("new").onclick = next; globalThis.addEventListener?.("pagehide", () => { if (instance && tracker.status(instance) === "active") tracker.skip(instance); }); next();
}
init();
