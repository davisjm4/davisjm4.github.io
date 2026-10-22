import { modeNames, difficulties, createClassObjectGenerator, assessClassObject } from "./class-engine.js?v=class-object-compose-v1";
import { formatJavaCode } from "./java-format.js?v=class-format-v1";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=per-mode-daily-v1";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CBR_MODE = "class-builder-rearrange";
const CBR_FILES = ["rng.js", "concepts.js", "java-model.js", "arrangement.js", "validator.js", "generator.js", "feedback.js", "session.js", "ui.js"];
const DIFF_KEY = "classObjectLab.difficulty";
let cbrLoadPromise;
function loadCBR() {
  if (window.CBR?.ui?.mount) return Promise.resolve();
  if (cbrLoadPromise) return cbrLoadPromise;
  cbrLoadPromise = new Promise((resolve, reject) => {
    const css = "class-builder-rearrange/style.css";
    if (!document.querySelector("link[data-cbr-style]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = css; l.dataset.cbrStyle = "true"; document.head.appendChild(l); }
    let i = 0; const next = () => { if (i === CBR_FILES.length) { resolve(); return; } const s = document.createElement("script"); s.src = `class-builder-rearrange/src/${CBR_FILES[i++]}`; s.onload = next; s.onerror = () => reject(new Error("Could not load Class Builder components.")); document.head.appendChild(s); }; next();
  });
  return cbrLoadPromise;
}
function savedDifficulty(params) {
  const fromUrl = params.get("difficulty");
  const match = (d) => difficulties.find((x) => x.toLowerCase() === String(d || "").toLowerCase());
  if (match(fromUrl)) return match(fromUrl);
  try { return match(localStorage.getItem(DIFF_KEY)) || "Beginner"; } catch { return "Beginner"; }
}
/* Object-state diagram from the simulated final heap (rendered only after the scored submission). */
function diagramHtml(d) {
  if (!d || (!d.objects.length && !d.statics.length)) return "";
  const objs = d.objects.map((o) => `<article class="object-card${o.refs.length ? "" : " unreferenced"}"><strong>Object #${o.id} · ${esc(o.cls)}</strong>${Object.entries(o.fields).map(([k, v]) => `<div><span>${esc(k)}:</span> <code>${esc(v)}</code></div>`).join("")}<div class="refs">${o.refs.length ? "referenced by " + o.refs.map((r) => `<code>${esc(r)}</code>`).join(", ") : "no variable refers to it"}</div></article>`).join("");
  const st = d.statics.map((s) => `<article class="object-card static-card"><strong>static ${esc(s.cls)}.${esc(s.field)}</strong><div><code>${esc(s.value)}</code></div><div class="refs">one value shared by the class</div></article>`).join("");
  const extra = [...(d.nulls?.length ? [`<code>${d.nulls.map(esc).join("</code>, <code>")}</code> ${d.nulls.length > 1 ? "are" : "is"} null`] : []), ...(d.prims || []).map((p) => `<code>${esc(p.name)} = ${esc(p.value)}</code>`)];
  return `<h3 class="sub">Final object state</h3><div class="objects" role="img" aria-label="${esc(d.text)}">${objs}${st}</div>${extra.length ? `<p class="arrows">${extra.join(" · ")}</p>` : ""}`;
}
function stepsHtml(steps) {
  if (!steps?.length) return "";
  return `<details class="trace"><summary>Step-by-step trace</summary><ol>${steps.map((s) => `<li><code>${esc(s.code)}</code> — ${esc(s.effect)}</li>`).join("")}</ol></details>`;
}
export function startClassObjectLab() {
  const $ = (id) => document.getElementById(id), tracker = sessionTracker(), generator = createClassObjectGenerator(Date.now());
  const params = new URLSearchParams(location.search);
  let question, instance, selected = null, closed = false, cbrApp = null, cbrHost = null, viewToken = 0;
  const modes = `<option value="mixed" selected>Mixed Practice</option>${Object.entries(modeNames).map(([id, n]) => `<option value="${id}">${n}</option>`).join("")}<option value="${CBR_MODE}">Class Builder — Rearrange</option>`;
  const diffs = difficulties.map((d) => `<option value="${d}">${d}</option>`).join("");
  $("main").innerHTML = `<div class="eyebrow">Java · Objects · State · Encapsulation</div><h1>Class &amp; Object Lab</h1><p class="intro">Reason about object creation, state changes, references, and methods.</p><div class="toolbar"><label>Practice mode <select id="mode">${modes}</select></label><label id="difficulty-label">Difficulty <select id="difficulty">${diffs}</select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel" aria-live="polite"></section><p id="stats" class="stats"></p>`;
  $("difficulty").value = savedDifficulty(params);
  addSessionNavigation("../"); const stats = () => ($("stats").textContent = roundSummary("class-object-lab", $("mode").value));
  function finishLegacy() { if (instance && !closed) tracker.skip(instance); instance = null; closed = true; }
  function next() {
    finishLegacy();
    const difficulty = $("difficulty").value;
    question = generator.next($("mode").value, difficulty);
    instance = tracker.begin(question.game, question.title, question.topic, question.topicTitle, question.mode, question.topicTitle);
    tracker.annotate(instance, { difficulty: question.difficulty, family: question.family, reasoning: question.reasoningSignature });
    selected = null; closed = false;
    const code = question.preformatted ? question.code : formatJavaCode(question.code);
    $("stage").innerHTML = `<div class="challenge-meta">${esc(question.topicTitle)} · ${esc(question.difficulty)}${question.review ? ` <span class="review-tag" title="All distinct problems for this selection have been used; this one repeats an earlier reasoning pattern with new details.">Review</span>` : ""}</div><pre class="snippet class-snippet" tabindex="0" aria-label="Java code"><code>${esc(code)}</code></pre>${question.context ? `<p class="context-note">${esc(question.context)}</p>` : ""}<h2 id="prompt">${esc(question.prompt)}</h2><div id="choices" class="choices" role="radiogroup" aria-labelledby="prompt">${question.choices.map((c, i) => `<button class="secondary choice" role="radio" data-index="${i}" aria-checked="false"><span class="choice-text">${esc(c)}</span></button>`).join("")}</div><div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button></div><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div>`;
    const buttons = [...$("choices").querySelectorAll("button")];
    const choose = (b) => { if (closed) return; selected = question.choices[+b.dataset.index]; for (const x of buttons) { x.classList.toggle("selected", x === b); x.setAttribute("aria-checked", String(x === b)); } $("check").disabled = false; };
    buttons.forEach((b, i) => {
      b.onclick = () => choose(b);
      b.onkeydown = (e) => { const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); const t = buttons[(i + k + buttons.length) % buttons.length]; t.focus(); choose(t); } };
    });
    $("check").onclick = () => {
      if (closed || selected === null) return;
      const correct = assessClassObject(question, { answer: selected }), event = tracker.submit(instance, correct);
      if (!event.accepted) return;
      if (!correct) tracker.reveal(instance);
      closed = true;
      for (const b of $("stage").querySelectorAll("button")) if (b.id !== "next") b.disabled = true;
      for (const b of buttons) { const t = question.choices[+b.dataset.index]; b.classList.toggle("correct-answer", t === question.answer); b.classList.toggle("incorrect-answer", t === selected && selected !== question.answer); }
      const why = !correct && question.why?.[selected] ? `<p class="about-choice"><strong>About your choice:</strong> ${esc(question.why[selected].why)}</p>` : "";
      const f = $("feedback"); f.hidden = false; f.className = `feedback ${correct ? "good" : "bad"}`;
      f.innerHTML = `<strong>${correct ? "Correct." : "Not quite."}</strong> Correct answer: <code class="answer-text">${esc(question.correctAnswer)}</code>${why}<p>${esc(question.explanation)}</p>${stepsHtml(question.steps)}${diagramHtml(question.diagram)}`;
      f.focus(); stats();
    };
    $("next").onclick = next; stats();
  }
  async function openCBR() { const token = ++viewToken; finishLegacy(); $("new").hidden = true; $("stats").hidden = false; stats(); $("difficulty-label").hidden = true; $("stage").textContent = "Loading Class Builder…"; try { await loadCBR(); if (token !== viewToken || $("mode").value !== CBR_MODE) return; $("stage").textContent = ""; cbrHost = document.createElement("div"); $("stage").appendChild(cbrHost); const ids = new Map(), t = tracker; const topic = (d) => `class-builder-rearrange/${d}`; const adapter = { onChallengeBegin: (x) => { const id = t.begin("class-object-lab", "Class & Object Lab", topic(x.difficulty), `Class Builder — ${x.difficulty[0].toUpperCase() + x.difficulty.slice(1)}`, CBR_MODE, "Class Builder — Rearrange"); ids.set(x.id, id); stats(); }, onCheck: (x) => { const id = ids.get(x.id); if (id) { t.submit(id, x.correct); stats(); } }, onHint: (x) => { const id = ids.get(x.id); if (id) t.annotate(id, { classBuilderRearrange: { hints: x.hints } }); }, onReveal: (x) => { const id = ids.get(x.id); if (id) { t.reveal(id); stats(); } }, onSkip: (x) => { const id = ids.get(x.id); if (id) { t.skip(id); stats(); } } }; cbrApp = window.CBR.ui.mount(cbrHost, { adapter, difficulty: "beginner" }); } catch (e) { $("stage").textContent = `Class Builder could not load: ${e.message}`; $("new").hidden = false; $("stats").hidden = false; } }
  function closeCBR() { if (cbrApp) { cbrApp.tracker.recordSkip(); cbrApp.destroy(); cbrApp = null; } cbrHost = null; }
  async function switchMode() { if ($("mode").value === CBR_MODE) { await openCBR(); return; } viewToken++; closeCBR(); $("new").hidden = false; $("stats").hidden = false; $("difficulty-label").hidden = false; next(); }
  $("mode").addEventListener("change", switchMode);
  $("difficulty").addEventListener("change", () => { try { localStorage.setItem(DIFF_KEY, $("difficulty").value); } catch {} if ($("mode").value !== CBR_MODE) next(); });
  $("new").onclick = () => { if ($("mode").value === CBR_MODE) cbrApp?.newChallenge(); else next(); };
  window.addEventListener("pagehide", () => { viewToken++; closeCBR(); finishLegacy(); });
  const initial = params.get("mode");
  if (initial === CBR_MODE) { $("mode").value = CBR_MODE; openCBR(); }
  else { if (initial && modeNames[initial]) $("mode").value = initial; next(); }
}
startClassObjectLab();
