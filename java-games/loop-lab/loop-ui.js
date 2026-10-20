import { originalModeNames, newModeNames, DIFFICULTIES, DIFFICULTY_NAMES, createLoopSession, assessLoop, distractorFor } from "./loop-engine.js?v=loop-expansion-v2";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=java-v1";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function traceHtml(trace) {
  if (!trace || !trace.rows.length) return "";
  const head = `<tr><th scope="col">Check</th>${trace.columns.map((c) => `<th scope="col"><code>${esc(c)}</code></th>`).join("")}<th scope="col">Condition</th></tr>`;
  const rows = trace.rows.map((r) => (r === null ? `<tr><td colspan="${trace.columns.length + 2}">…</td></tr>` : `<tr><td>${r.check}</td>${r.values.map((v) => `<td><code>${esc(v)}</code></td>`).join("")}<td>${r.result ? "true" : "false — loop ends"}</td></tr>`)).join("");
  return `<details class="loop-trace" open><summary>Trace of <code>${esc(trace.loop)}</code> (${trace.totalChecks} condition check${trace.totalChecks === 1 ? "" : "s"}${trace.capped ? ", first 600 shown" : ""})</summary><div class="trace-scroll"><table>${head}${rows}</table></div></details>`;
}
function studentTraceHtml(st) {
  if (!st) return "";
  return `<div class="trace-scroll"><table class="student-trace" aria-label="Student trace"><tr><th scope="col">Row</th>${st.columns.map((c) => `<th scope="col"><code>${esc(c)}</code></th>`).join("")}</tr>${st.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th>${r.values.map((v) => `<td><code>${esc(v)}</code></td>`).join("")}</tr>`).join("")}</table></div>`;
}

export function startLoopLab() {
  const $ = (id) => document.getElementById(id), tracker = sessionTracker();
  let seed;
  try { const a = new Uint32Array(1); crypto.getRandomValues(a); seed = a[0]; } catch { seed = Date.now() >>> 0; }
  const practice = createLoopSession({ seed });
  let q, instance, selected = null, closed = false;
  const opts = (names) => Object.entries(names).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join("");
  $("main").innerHTML = `<div class="eyebrow">Java · Loops · Algorithms · Execution counts</div><h1>Loop Lab</h1><p class="intro">Predict what loops execute, how variables change, why loops stop, and how much work they do.</p>
<div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option><optgroup label="Loop fundamentals">${opts(originalModeNames)}</optgroup><optgroup label="Algorithms and execution counts">${opts(newModeNames)}</optgroup></select></label>
<label>Difficulty <select id="difficulty">${DIFFICULTIES.map((d) => `<option value="${d}">${DIFFICULTY_NAMES[d]}</option>`).join("")}</select></label>
<button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><p id="stats" class="stats"></p>`;
  addSessionNavigation("../");
  const stats = () => ($("stats").textContent = roundSummary("loop-lab"));
  const setSelected = (btn) => {
    for (const x of $("choices").querySelectorAll("[role=radio]")) { const on = x === btn; x.classList.toggle("selected", on); x.setAttribute("aria-checked", String(on)); x.tabIndex = on ? 0 : -1; }
  };
  function next() {
    const advancing = Boolean(instance);
    if (instance) tracker.skip(instance);
    q = practice.next({ mode: $("mode").value, difficulty: $("difficulty").value });
    instance = tracker.begin(q.game, q.title, q.topic, q.topicTitle); selected = null; closed = false;
    tracker.annotate(instance, { mode: q.mode, difficulty: q.difficulty, skill: q.concept, generatorFamily: q.reasoningFamily, seed: q.seed });
    const blockChoices = q.choiceFormat === "code" || q.choiceFormat === "block";
    $("stage").innerHTML = `<div class="challenge-meta">${esc(q.modeName)} · ${esc(q.variantName)} · ${esc(q.difficultyName)}</div><h2 id="prompt" tabindex="-1">${esc(q.prompt)}</h2>
<pre class="snippet loop-snippet" tabindex="0" aria-label="Java code"><code>${esc(q.code)}</code></pre>${studentTraceHtml(q.studentTrace)}
<div id="choices" class="loop-choices${blockChoices ? " block-choices" : ""}" role="radiogroup" aria-labelledby="prompt">${q.choices.map((c, i) => `<button type="button" class="secondary loop-choice${q.choiceFormat === "code" ? " code-choice" : ""}" role="radio" aria-checked="false" tabindex="${i === 0 ? 0 : -1}" data-index="${i}"><span class="choice-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span class="choice-text">${esc(c)}</span></button>`).join("")}</div>
<div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button></div><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div>`;
    const buttons = [...$("choices").querySelectorAll("[role=radio]")];
    buttons.forEach((b, i) => {
      b.onclick = () => { if (closed) return; selected = q.choices[i]; setSelected(b); $("check").disabled = false; };
      b.onkeydown = (e) => {
        const k = e.key; let j = null;
        if (k === "ArrowDown" || k === "ArrowRight") j = (i + 1) % buttons.length;
        if (k === "ArrowUp" || k === "ArrowLeft") j = (i - 1 + buttons.length) % buttons.length;
        if (j !== null) { e.preventDefault(); buttons[j].focus(); if (!closed) buttons[j].click(); }
      };
    });
    $("check").onclick = () => {
      if (closed || selected === null) return;
      const correct = assessLoop(q, { answer: selected });
      const event = tracker.submit(instance, correct); if (!event.accepted) return;
      if (!correct) tracker.reveal(instance);
      closed = true;
      for (const b of $("stage").querySelectorAll("button")) if (b.id !== "next") b.disabled = true;
      buttons.forEach((b, i) => { b.classList.toggle("correct-answer", q.choices[i] === q.answer); b.classList.toggle("incorrect-answer", q.choices[i] === selected && selected !== q.answer); });
      const wrong = !correct ? distractorFor(q, selected) : null;
      const f = $("feedback"); f.hidden = false; f.className = `feedback ${correct ? "good" : "bad"}`;
      f.innerHTML = `<p><strong>${correct ? "Correct." : "Not quite."}</strong> Correct answer: <code class="answer-text">${esc(q.correctAnswer)}</code></p>${wrong?.note ? `<p class="misconception">${esc(wrong.note)}</p>` : ""}<p>${esc(q.explanation)}</p>${traceHtml(q.trace)}`;
      f.focus(); stats();
    };
    $("next").onclick = next;
    if (advancing) $("prompt").focus();
    stats();
  }
  // Test hook (only with ?test=1): lets the browser test read the current challenge.
  try { if (new URLSearchParams(location.search).has("test")) window.__loopLab = { get q() { return q; } }; } catch {}
  $("mode").onchange = next; $("difficulty").onchange = next; $("new").onclick = next;
  window.addEventListener("pagehide", () => { if (instance) tracker.skip(instance); });
  next();
}
startLoopLab();
