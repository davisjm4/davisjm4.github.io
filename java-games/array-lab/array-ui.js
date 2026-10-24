import {
  formatNames,
  generateArray,
  assessArray,
  solutionArray,
  createArrayHistory,
} from "./array-engine.js?v=array-composition-20261024";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "../session.js?v=per-mode-daily-v1";

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export function startArrayLab() {
  const $ = (id) => document.getElementById(id);
  const tracker = sessionTracker();
  const preferenceKey='javaArray.preferences.v1';
  let preferenceStorage;try{preferenceStorage=globalThis.localStorage;}catch{}
  let preferences={};try{preferences=JSON.parse(preferenceStorage?.getItem(preferenceKey)||'{}');}catch{}
  const params=typeof URLSearchParams==='function'?new URLSearchParams(window.location?.search||''):null;
  let challengeNumber=0;
  let question, instanceId, selectedAnswer = null, selectedCell = null;
  let selectedCells = [], workingState = [], closed = false, expiredNotice = false;
  const recent = createArrayHistory(preferenceStorage||null);

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
      <label>Difficulty
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
  const requestedMode=params?.get('mode')||params?.get('format')||preferences.mode;
  const requestedDifficulty=params?.get('difficulty')||preferences.difficulty;
  if(requestedMode==='mixed'||Object.hasOwn(formatNames,requestedMode))$("mode").value=requestedMode;
  const level=['Beginner','Intermediate','Advanced'].find(d=>d.toLowerCase()===String(requestedDifficulty).toLowerCase());if(level)$("difficulty").value=level;
  const savePreferences=()=>{try{preferenceStorage?.setItem(preferenceKey,JSON.stringify({mode:$("mode").value,difficulty:$("difficulty").value}));}catch{}};
  const active = () => {if(closed)return false;if(tracker.status(instanceId)==='active')return true;expireChallenge();return false;};
  const stats = () => { $("stats").textContent = roundSummary("array-lab", $("mode").value); };
  function expireChallenge(){
    if(expiredNotice)return;expiredNotice=true;closed=true;
    for(const control of $("stage").querySelectorAll('button,select,input'))control.disabled=true;
    $("next").disabled=false;$("feedback").hidden=false;$("feedback").className='feedback';
    $("feedback").textContent='This challenge belongs to a previous session. Select New Challenge to practice in the current session.';stats();
  }
  const checkSession=()=>{if(instanceId&&tracker.status(instanceId)==='expired')expireChallenge();stats();};

  function renderOneDimensional() {
    const values = question.kind === "apply" || question.kind === "swap"
      ? workingState
      : question.values;
    return `<div class="array-visual" aria-label="Initial Java array"><p data-array-caption>Initial array values</p>
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
        ${question.grid.map((row, rowIndex) => `<div class="array-grid-row">${row.map((value, colIndex) => `
          <div class="array-cell-wrap">
            <small class="index-label" data-index-label hidden>[${rowIndex}][${colIndex}]</small>
            <button class="array-cell secondary" data-cell="${rowIndex},${colIndex}" aria-pressed="false" aria-label="Grid cell containing ${esc(value)}">${esc(value)}</button>
          </div>`).join("")}${Array.from({length:question.columns-row.length},()=>'<span aria-hidden="true"></span>').join('')}</div>`).join("")}
      </div>
    </div>`;
  }

  function renderInteraction() {
    if (question.kind === "choice")
      return `<div id="choices" class="array-choice-grid" role="group" aria-label="Answer choices">
        ${question.choices.map((choice, index) => `<button class="secondary array-choice" data-answer="${esc(choice)}" aria-pressed="false"><code>${esc(choice)}</code></button>`).join("")}
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
    } else if (question.kind === "swap") {
      if (selectedCells.length === 2 || selectedCells.includes(cell)) {
        selectedCells = [cell];
        workingState = [...question.values];
      } else {
        selectedCells.push(cell);
        if (selectedCells.length === 2) {
          // Cell selection is a proposal; Java's final state is revealed on submit.
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
    return {cell:selectedCell,cells:[...selectedCells],state: workingState};
  }

  function revealAnswer() {
    if(question.kind==='cell'&&question.answerState){for(const button of $("stage").querySelectorAll('[data-cell]')){const i=Number(button.dataset.cell);button.textContent=question.answerState[i];button.setAttribute('aria-label',`Final array cell containing ${question.answerState[i]}`);}}
    const caption=$("stage").querySelector('[data-array-caption]');if(caption&&question.answerState)caption.textContent='Final array values';
    if(question.kind==='cell-2d'&&question.format==='update-2d'&&question.answerState){for(const button of $("stage").querySelectorAll('[data-cell]')){const [r,c]=button.dataset.cell.split(',').map(Number);button.textContent=question.answerState[r][c];}}
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
      ...(params?.has('seed')?{seed:(Number(params.get('seed'))+challengeNumber++)>>>0}:{}),
    });
    instanceId = tracker.begin(question.game, question.title, question.topic, question.topicTitle, question.format, formatNames[question.format]);
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
    expiredNotice = false;
    $("feedback").hidden = true;
    $("stage").innerHTML = `
      <div class="challenge-meta">${esc(question.formatName)} · ${esc(question.difficulty || "All levels")}</div>
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

  $("mode").onchange = () => {savePreferences();next();};
  $("difficulty").onchange = () => {savePreferences();next();};
  $("new").onclick = next;
  window.addEventListener('keydown',event=>{
    const focused=document.activeElement;
    if(['INPUT','SELECT','TEXTAREA'].includes(focused?.tagName))return;
    const answerFocus=focused?.matches?.('[data-answer],[data-cell]');
    if(event.key==='Enter'&&!$("submit").disabled&&(!focused||focused.tagName==='BODY'||focused===$("submit")||answerFocus&&focused.getAttribute('aria-pressed')==='true')){event.preventDefault();$("submit").click();return;}
    const controls=[...$("stage").querySelectorAll(question.kind==='choice'?'[data-answer]':'[data-cell]')];
    if(/^[1-4]$/.test(event.key)&&question.kind==='choice'){const button=controls[Number(event.key)-1];button?.click();button?.focus();return;}
    if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)&&controls.length){event.preventDefault();const current=controls.indexOf(focused),direction=['ArrowRight','ArrowDown'].includes(event.key)?1:-1;controls[current<0?(direction>0?0:controls.length-1):(current+direction+controls.length)%controls.length].focus();}
  });
  window.addEventListener("pagehide", () => { if (instanceId) tracker.skip(instanceId); });
  window.addEventListener('focus',checkSession);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')checkSession();});
  next();
}

startArrayLab();
