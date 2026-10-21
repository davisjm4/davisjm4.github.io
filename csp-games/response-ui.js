import {
  responseModes,
  supportNames,
  generateResponse,
  evaluateResponse,
} from "./response-engine.js?v=focused-rb-v5";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=per-mode-daily-v1";

export function startResponse() {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const tracker = sessionTracker();
  let question, instanceId, selectedId = null, closed = false;

  $("main").innerHTML = `
    <div class="eyebrow">One concept · one decision · one explanation</div>
    <h1>Response Builder</h1>
    <p class="intro">Read a short program or result, then choose the explanation best supported by the code.</p>
    <div class="toolbar">
      <label>Practice mode
        <select id="mode">
          <option value="mixed" selected>Mixed Practice</option>
          ${Object.entries(responseModes).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
        </select>
      </label>
      <label>Support
        <select id="support">
          ${Object.entries(supportNames).map(([value, label]) => `<option value="${value}" ${value === "full" ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <button id="new" class="secondary">New Challenge</button>
    </div>
    <p>Changing a setting starts a new challenge. The support level is recorded in Session Summary.</p>
    <section id="stage" class="panel"></section>
    <section id="feedback" class="feedback" role="status" tabindex="-1" hidden></section>
    <p id="stats"></p>`;

  addSessionNavigation("../");
  const active = () => !closed && tracker.status(instanceId) === "active";
  const updateStats = () => { $("stats").textContent = roundSummary("response-builder", $("mode").value); };

  function showFeedback(good, text) {
    $("feedback").hidden = false;
    $("feedback").className = `feedback ${good ? "good" : "bad"}`;
    $("feedback").textContent = text;
    $("feedback").focus();
    updateStats();
  }

  function select(choiceId) {
    if (!active()) return;
    selectedId = choiceId;
    for (const button of $("choices").querySelectorAll("button")) {
      const chosen = button.dataset.choice === choiceId;
      button.classList.toggle("selected", chosen);
      button.setAttribute("aria-pressed", String(chosen));
    }
    $("submit").disabled = false;
  }

  function freeze() {
    closed = true;
    for (const button of $("stage").querySelectorAll("button")) button.disabled = true;
    $("next").disabled = false;
    for (const button of $("choices").querySelectorAll("button")) {
      const choice = question.choices.find((item) => item.id === button.dataset.choice);
      button.classList.toggle("correct-choice", choice.correct);
      if (button.dataset.choice === selectedId && !choice.correct) button.classList.add("incorrect-choice");
    }
  }

  function next() {
    if (instanceId) tracker.skip(instanceId);
    question = generateResponse($("mode").value, $("support").value);
    instanceId = tracker.begin(question.game, question.title, question.topic, question.topicTitle, question.practiceMode || question.mode, question.modeName || question.topicTitle);
    selectedId = null;
    closed = false;
    $("feedback").hidden = true;
    $("stage").innerHTML = `
      <div class="challenge-meta">${esc(question.modeName)} · ${esc(question.supportName)}</div>
      ${question.reminder ? `<p class="support-reminder"><strong>Quick reminder:</strong> ${esc(question.reminder)}</p>` : ""}
      <pre class="snippet">${esc(question.code)}</pre>
      <h2>${esc(question.prompt)}</h2>
      <div id="choices" class="choice-grid" role="group" aria-label="Answer choices">
        ${question.choices.map((choice) => `<button class="secondary choice" data-choice="${choice.id}" aria-pressed="false">${esc(choice.text)}</button>`).join("")}
      </div>
      <div class="actions">
        <button id="submit" disabled>Submit Answer</button>
        <button id="next" class="secondary">Next Challenge</button>
      </div>`;
    for (const button of $("choices").querySelectorAll("button")) button.onclick = () => select(button.dataset.choice);
    $("submit").onclick = () => {
      if (!active()) return;
      const result = evaluateResponse(question, selectedId);
      if (!result.complete) {
        showFeedback(false, result.details);
        return;
      }
      const event = tracker.submit(instanceId, result.correct);
      if (!event.accepted) return;
      if (!result.correct) tracker.reveal(instanceId);
      freeze();
      showFeedback(result.correct, `${result.correct ? "Correct." : "Not quite."}\n${result.details}`);
    };
    $("next").onclick = next;
    updateStats();
  }

  $("mode").onchange = next;
  $("support").onchange = next;
  $("new").onclick = next;
  window.addEventListener("pagehide", () => { if (instanceId) tracker.skip(instanceId); });
  next();
}

startResponse();
