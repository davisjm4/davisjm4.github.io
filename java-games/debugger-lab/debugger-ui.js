import {
  formatNames,
  generateDebugger,
  assessDebugger,
  solutionDebugger,
  createDebuggerSession,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
} from "./debugger-engine.js?v=debugger-generator-v2";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "../session.js?v=active-time-v1";

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export function startDebuggerLab() {
  const $ = (id) => document.getElementById(id);
  const tracker = sessionTracker();
  const practice = createDebuggerSession({seed: (()=>{try{return crypto.getRandomValues(new Uint32Array(1))[0];}catch{return Date.now()>>>0;}})()});
  let question, instanceId, selected = null, closed = false;

  $("main").innerHTML = `
    <div class="eyebrow">Java · Diagnose · Explain · Correct</div>
    <h1>Debugger Lab</h1>
    <p class="intro">Find one genuine Java defect, make one decision, and learn why it fails.</p>
    <div class="toolbar">
      <label>Practice mode
        <select id="mode">
          <option value="mixed" selected>Mixed Practice</option>
          ${Object.entries(formatNames).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
        </select>
      </label>
      <label>Difficulty
        <select id="difficulty">${DIFFICULTIES.map(value=>`<option value="${value}">${DIFFICULTY_NAMES[value]}</option>`).join("")}</select>
      </label>
      <button id="new" class="secondary">New Challenge</button>
    </div>
    <section id="stage" class="panel"></section>
    <section id="feedback" class="feedback" role="status" tabindex="-1" hidden></section>
    <p id="stats" class="stats"></p>`;

  addSessionNavigation("../");
  const active = () => !closed && tracker.status(instanceId) === "active";
  const updateStats = () => { $("stats").textContent = roundSummary("debugger-lab"); };

  function interaction() {
    if (question.kind === "line") return `
      <div id="line-choices" class="line-choices" role="group" aria-label="Selectable code lines">
        ${question.lines.map((line, index) => `<button class="code-line" data-line="${index + 1}" aria-pressed="false"><span class="line-number">${index + 1}</span><code>${esc(line) || " "}</code></button>`).join("")}
      </div>`;
    return `<div id="choices" class="debug-choice-grid" role="group" aria-label="Answer choices">
      ${question.choices.map((choice, index) => `<button class="secondary debug-choice" data-answer="${esc(choice)}" aria-pressed="false"><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span>${esc(choice)}</span></button>`).join("")}
    </div>`;
  }

  function paintSelection() {
    const selector = question.kind === "line" ? "[data-line]" : "[data-answer]";
    for (const button of $("stage").querySelectorAll(selector)) {
      const value = question.kind === "line" ? button.dataset.line : button.dataset.answer;
      const chosen = value === selected;
      button.classList.toggle("selected", chosen);
      button.setAttribute("aria-pressed", String(chosen));
    }
  }

  function revealAnswer() {
    const solution = solutionDebugger(question);
    const selector = question.kind === "line" ? "[data-line]" : "[data-answer]";
    const correctValue = question.kind === "line" ? solution.line : solution.answer;
    for (const button of $("stage").querySelectorAll(selector)) {
      const value = question.kind === "line" ? button.dataset.line : button.dataset.answer;
      button.classList.toggle("correct-answer", value === correctValue);
      if (value === selected && value !== correctValue) button.classList.add("incorrect-answer");
    }
  }

  function finish(correct) {
    closed = true;
    revealAnswer();
    if (question.errorLine && question.errorLine > 0) {
      const snippet = $("stage").querySelector(".debug-snippet code");
      if (snippet) {
        const codeLines = question.code.split("\n");
        snippet.innerHTML = codeLines.map((line,index)=>`<span class="${index+1===question.errorLine?"error-line":""}">${esc(line)||" "}</span>`).join("\n");
        snippet.setAttribute("aria-label", `Java code. Line ${question.errorLine} is the first failing statement.`);
      }
    }
    for (const control of $("stage").querySelectorAll("button")) control.disabled = true;
    $("next").disabled = false;
    $("feedback").hidden = false;
    $("feedback").className = `feedback ${correct ? "good" : "bad"}`;
    $("feedback").textContent =
      `${correct ? "Correct." : "Not quite."}\nCorrect answer: ${question.correctAnswer}\n` +
      `${question.errorCategoryName}: ${question.explanation}${question.fix?`\nCorrection: ${question.fix}`:""}`;
    $("feedback").focus();
    updateStats();
  }

  function next() {
    if (instanceId) tracker.skip(instanceId);
    question = practice.next({mode:$("mode").value,difficulty:$("difficulty").value});
    instanceId = tracker.begin(question.game, question.title, question.topic, question.topicTitle);
    tracker.annotate(instanceId,{mode:question.format,difficulty:question.difficulty,skill:question.skill,generatorFamily:question.familyId,seed:question.seed,errorCategory:question.errorCategory});
    selected = null;
    closed = false;
    $("feedback").hidden = true;
    $("stage").innerHTML = `
      <div class="challenge-meta">${esc(question.formatName)} · ${esc(question.difficultyName)}</div>
      <p class="requirement"><strong>Requirement:</strong> ${esc(question.requirement)}</p>
      <h2>${esc(question.prompt)}</h2>
      ${question.kind === "line" ? "" : `<pre class="snippet debug-snippet"><code>${esc(question.code)}</code></pre>`}
      ${interaction()}
      <div class="actions">
        <button id="submit" disabled>Check Answer</button>
        <button id="next" class="secondary">Next Challenge</button>
      </div>`;

    const selector = question.kind === "line" ? "[data-line]" : "[data-answer]";
    for (const button of $("stage").querySelectorAll(selector)) button.onclick = () => {
      if (!active()) return;
      selected = question.kind === "line" ? button.dataset.line : button.dataset.answer;
      paintSelection();
      $("submit").disabled = false;
      $("feedback").hidden = true;
    };
    $("submit").onclick = () => {
      if (!active() || selected === null) return;
      const response = question.kind === "line" ? {line: selected} : {answer: selected};
      const correct = assessDebugger(question, response);
      const event = tracker.submit(instanceId, correct);
      if (!event.accepted) return;
      if (!correct) tracker.reveal(instanceId);
      finish(correct);
    };
    $("next").onclick = next;
    updateStats();
  }

  $("mode").onchange = next;
  $("difficulty").onchange = next;
  $("new").onclick = next;
  window.addEventListener("pagehide", () => { if (instanceId) tracker.skip(instanceId); });
  next();
}

startDebuggerLab();
