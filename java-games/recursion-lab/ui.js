import { modeNames, difficulties, createRecursionGenerator, assessRecursion } from "./engine.js?v=recursion-v4";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=java-v1";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function startRecursionLab() {
  const $ = id => document.getElementById(id), tracker = sessionTracker(), generator = createRecursionGenerator(Date.now());
  let question, instance, selected = null, closed = false;
  $("main").innerHTML = `<div class="eyebrow">Java · Recursion · Call Stack · Returns</div><h1>Recursion Lab</h1><p class="intro">Trace recursive methods, base cases, return values, output, arrays, and recursive search and sort algorithms.</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(modeNames).map(([id,n])=>`<option value="${id}">${n}</option>`).join("")}</select></label><label>Difficulty <select id="difficulty">${difficulties.map((d,i)=>`<option${i===0?" selected":""}>${d}</option>`).join("")}</select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><p id="stats" class="stats"></p>`;
  addSessionNavigation("../");
  const stats = () => $("stats").textContent = roundSummary("recursion-lab");
  function next() {
    if (instance && !closed) tracker.skip(instance);
    question = generator.next($("mode").value, $("difficulty").value);
    instance = tracker.begin(question.game, question.title, question.topic, question.topicTitle);
    tracker.annotate(instance, { mode: question.topicTitle, difficulty: question.difficulty, skill: question.skill, generatorFamily: question.family, seed: question.seed });
    selected = null; closed = false;
    $("stage").innerHTML = `<div class="challenge-meta">${esc(question.topicTitle)} · ${esc(question.difficulty)} · ${esc(question.family.replaceAll("-", " "))}</div><pre class="snippet recursion-code"><code>${esc(question.code)}</code></pre><h2>${esc(question.prompt)}</h2><div id="choices" class="choices" role="radiogroup" aria-label="Answer choices">${question.choices.map((c,i)=>`<button type="button" class="secondary choice" data-answer="${esc(c)}" aria-pressed="false"><span class="choice-letter">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`).join("")}</div><div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button></div><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div>`;
    for (const b of $("choices").querySelectorAll("button")) b.onclick = () => { if (closed) return; selected = b.dataset.answer; for (const x of $("choices").querySelectorAll("button")) { x.classList.toggle("selected", x === b); x.setAttribute("aria-pressed", String(x === b)); } $("check").disabled = false; };
    $("check").onclick = () => {
      if (closed || selected === null) return;
      const correct = assessRecursion(question, { answer: selected }), result = tracker.submit(instance, correct);
      if (!result.accepted) return;
      closed = true; if (!correct) tracker.reveal(instance);
      for (const b of $("stage").querySelectorAll("button")) if (b.id !== "next") b.disabled = true;
      for (const b of $("choices").querySelectorAll("button")) { b.classList.toggle("correct-answer", b.dataset.answer === question.answer); b.classList.toggle("incorrect-answer", b.dataset.answer === selected && selected !== question.answer); }
      const trace = question.trace?.length ? `<details class="trace"><summary>Show call-stack trace</summary><pre>${esc(question.trace.join("\n"))}</pre></details>` : "";
      const f = $("feedback"); f.hidden = false; f.className = `feedback ${correct ? "good" : "bad"}`; f.innerHTML = `<strong>${correct ? "Correct." : "Not quite."}</strong> Correct answer: ${esc(question.correctAnswer)}<br>${esc(question.explanation)}<br><small>Calls: ${question.callCount} · Maximum depth: ${question.callDepth}</small>${trace}`; f.focus(); stats();
    };
    $("next").onclick = next; stats();
  }
  $("mode").onchange = next; $("difficulty").onchange = next; $("new").onclick = next;
  window.addEventListener("pagehide", () => { if (instance && !closed) tracker.skip(instance); });
  next();
}
startRecursionLab();
