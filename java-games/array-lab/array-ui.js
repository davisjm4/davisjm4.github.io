import {
  formatNames,
  generateArray,
  assessArray,
  solutionArray,
} from "./array-engine.js?v=array-modes-v2";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "../session.js?v=active-time-v1";

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export function startArrayLab() {
  const $ = (id) => document.getElementById(id);
  const tracker = sessionTracker();
  let question, instanceId, selectedAnswer = null, selectedCell = null;
  let selectedCells = [], workingState = [], closed = false;
  const recent = new Set();

  $("main").innerHTML = `
    <div class="eyebrow">Java · Arrays · Traversal · 2D Arrays</div>
    <h1>Array Lab</h1>
    <p class="intro">Make one meaningful array decision, then review the Java behavior behind it.</p>
    <div class="toolbar">
      <label>Practice mode
        <select id="mode">
          <option value="mixed" selected>Mixed Practice</option>
          ${Object.entries(formatNames).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
        </select>
      </label>
      <label>Difficulty for new modes
        <select id="difficulty" aria-label="Challenge difficulty">
          <option>Beginner</option><option selected>Intermediate</option><option>Advanced</option>
        </select>
      </label>
      <button id="new" class="secondary">New Challenge</button>
    </div>
    <section id="stage" class="panel"></section>
    <section id="feedback" class="feedback" role="status" tabindex="-1" hidden></section>
    <p id="stats" class="stats"></p>`;

  addSessionNavigation("../");
  const active = () => !closed && tracker.status(instanceId) === "active";
  const stats = () => { $("stats").textContent = roundSummary("array-lab"); };

  function renderOneDimensional() {
    const values = question.kind === "apply" || question.kind === "swap"
      ? workingState
      : question.values;
    return `<div class="array-visual" aria-label="Java array">
      <div class="array-strip">${values.map((value, index) => `
        <div class="array-cell-wrap">
          <small class="index-label" data-index-label hidden>index ${index}</small>
          <button class="array-cell secondary" data-cell="${index}" aria-pressed="false" aria-label="Array cell containing ${esc(value)}">${esc(value)}</button>
        </div>`).join("")}</div>
    </div>`;
  }

  function renderGrid() {
    return `<div class="array-visual grid-scroll" aria-label="Two-dimensional Java array">
      <div class="array-grid" style="--columns:${question.columns}">
        ${question.grid.flatMap((row, rowIndex) => row.map((value, colIndex) => `
          <div class="array-cell-wrap">
            <small class="index-label" data-index-label hidden>[${rowIndex}][${colIndex}]</small>
            <button class="array-cell secondary" data-cell="${rowIndex},${colIndex}" aria-pressed="false" aria-label="Grid cell containing ${esc(value)}">${esc(value)}</button>
          </div>`)).join("")}
      </div>
    </div>`;
  }

  function renderInteraction() {
    if (question.kind === "choice")
      return `<div id="choices" class="array-choice-grid" role="group" aria-label="Answer choices">
        ${question.choices.map((choice, index) => `<button class="secondary array-choice" data-answer="${esc(choice)}" aria-pressed="false"><span class="choice-letter">${String.fromCharCode(65 + index)}</span><code>${esc(choice)}</code></button>`).join("")}
      </div>`;
    if (question.kind === "cell") return renderOneDimensional();
    if (question.kind === "cell-2d") return renderGrid();
    return `${renderOneDimensional()}<button id="reset-array" class="secondary compact">Reset array</button>`;
  }

  function paint() {
    if (question.kind === "choice") {
      for (const button of $("choices").querySelectorAll("button")) {
        const chosen = button.dataset.answer === selectedAnswer;
        button.classList.toggle("selected", chosen);
        button.setAttribute("aria-pressed", String(chosen));
      }
      return;
    }
    for (const button of $("stage").querySelectorAll("[data-cell]")) {
      const chosen = question.kind === "swap"
        ? selectedCells.includes(button.dataset.cell)
        : selectedCell === button.dataset.cell;
      button.classList.toggle("selected", chosen);
      button.setAttribute("aria-pressed", String(chosen));
      if (question.kind === "apply" || question.kind === "swap") {
        const index = Number(button.dataset.cell);
        button.textContent = workingState[index];
        button.setAttribute("aria-label", `Array cell containing ${workingState[index]}`);
      }
    }
  }

  function selectCell(cell) {
    if (!active()) return;
    if (question.kind === "apply") {
      selectedCell = cell;
      workingState = [...question.values];
      workingState[Number(cell)] = question.applyValue;
    } else if (question.kind === "swap") {
      if (selectedCells.length === 2 || selectedCells.includes(cell)) {
        selectedCells = [cell];
        workingState = [...question.values];
      } else {
        selectedCells.push(cell);
        if (selectedCells.length === 2) {
          const [a, b] = selectedCells.map(Number);
          [workingState[a], workingState[b]] = [workingState[b], workingState[a]];
        }
      }
    } else selectedCell = cell;
    paint();
    $("feedback").hidden = true;
    $("submit").disabled = !complete();
  }

  function complete() {
    if (question.kind === "choice") return selectedAnswer !== null;
    if (question.kind === "cell" || question.kind === "cell-2d") return selectedCell !== null;
    if (question.kind === "apply") return selectedCell !== null;
    return selectedCells.length === 2;
  }

  function response() {
    if (question.kind === "choice") return {answer: selectedAnswer};
    if (question.kind === "cell" || question.kind === "cell-2d") return {cell: selectedCell};
    return {state: workingState};
  }

  function revealAnswer() {
    for (const label of $("stage").querySelectorAll("[data-index-label]")) label.hidden = false;
    if (question.kind === "choice") {
      for (const button of $("choices").querySelectorAll("button")) {
        button.classList.toggle("correct-answer", button.dataset.answer === question.answer);
        if (button.dataset.answer === selectedAnswer && selectedAnswer !== question.answer)
          button.classList.add("incorrect-answer");
      }
    } else {
      const solution = solutionArray(question);
      const correctCells = question.correctCells || [solution.cell];
      for (const button of $("stage").querySelectorAll("[data-cell]"))
        button.classList.toggle("correct-answer", correctCells.includes(button.dataset.cell));
      if (question.kind === "apply" || question.kind === "swap") {
        workingState = [...solution.state];
        paint();
      }
    }
  }

  function finish(correct) {
    closed = true;
    revealAnswer();
    for (const control of $("stage").querySelectorAll("button,select,input")) control.disabled = true;
    $("next").disabled = false;
    $("feedback").hidden = false;
    $("feedback").className = `feedback ${correct ? "good" : "bad"}`;
    const trace = Array.isArray(question.trace) && question.trace.length
      ? `\nState trace:\n${question.trace.map((step, index) => {
        const state = step.state ? `{${step.state.join(", ")}}` : step.grid ? step.grid.map((row) => `[${row.join(", ")}]`).join("  ") : "";
        return state ? `${index + 1}. ${state}` : "";
      }).filter(Boolean).join("\n")}`
      : "";
    $("feedback").textContent =
      `${correct ? "Correct." : "Not quite."}\nCorrect answer: ${question.correctAnswer}\n${question.explanation}${trace}`;
    $("feedback").focus();
    stats();
  }

  function next() {
    if (instanceId) tracker.skip(instanceId);
    question = generateArray($("mode").value, undefined, {
      difficulty: $("difficulty").value,
      history: recent,
    });
    while (recent.size > 240) recent.delete(recent.values().next().value);
    instanceId = tracker.begin(question.game, question.title, question.topic, question.topicTitle);
    tracker.annotate(instanceId, {
      mode: question.formatName,
      difficulty: question.difficulty || null,
      skill: question.skill || question.topic,
      family: question.family || question.variant,
      seed: question.seed ?? null,
    });
    selectedAnswer = null;
    selectedCell = null;
    selectedCells = [];
    workingState = question.values ? [...question.values] : [];
    closed = false;
    $("feedback").hidden = true;
    $("stage").innerHTML = `
      <div class="challenge-meta">${esc(question.formatName)} · ${esc(question.difficulty || "All levels")}${question.family ? ` · ${esc(question.family)}` : ""}</div>
      <h2>${esc(question.prompt)}</h2>
      <pre class="snippet array-code"><code>${esc(question.code)}</code></pre>
      ${renderInteraction()}
      <div class="actions">
        <button id="submit" disabled>Submit Answer</button>
        <button id="next" class="secondary">Next Challenge</button>
      </div>`;
    if (question.kind === "choice") {
      for (const button of $("choices").querySelectorAll("button"))
        button.onclick = () => {
          if (!active()) return;
          selectedAnswer = button.dataset.answer;
          paint();
          $("submit").disabled = false;
          $("feedback").hidden = true;
        };
    } else {
      for (const button of $("stage").querySelectorAll("[data-cell]"))
        button.onclick = () => selectCell(button.dataset.cell);
      if ($("reset-array")) $("reset-array").onclick = () => {
        if (!active()) return;
        selectedCell = null;
        selectedCells = [];
        workingState = [...question.values];
        paint();
        $("submit").disabled = true;
      };
    }
    $("submit").onclick = () => {
      if (!active() || !complete()) return;
      const correct = assessArray(question, response());
      const event = tracker.submit(instanceId, correct);
      if (!event.accepted) return;
      if (!correct) tracker.reveal(instanceId);
      finish(correct);
    };
    $("next").onclick = next;
    stats();
  }

  $("mode").onchange = next;
  $("difficulty").onchange = next;
  $("new").onclick = next;
  window.addEventListener("pagehide", () => { if (instanceId) tracker.skip(instanceId); });
  next();
}

startArrayLab();
