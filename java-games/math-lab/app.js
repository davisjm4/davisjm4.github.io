import { mathGame, createDeck, assess } from "./engine.js?v=math-v1";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=active-time-v1";
import { EXPANSION_MODES, DIFFICULTIES, DIFFICULTY_TITLES, createExpansionDeck, assessExpansion } from "./expansion/generator.js?v=math-exp-v1";

export function startMathLab() {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const tracker = sessionTracker(), deck = createDeck(), expansionDeck = createExpansionDeck();
  const isExpansion = mode => Object.prototype.hasOwnProperty.call(EXPANSION_MODES, mode);
  let q, instance, selected = null, closed = true;
  $("main").innerHTML = `<div class="eyebrow">Java · Numbers & expressions</div><h1>Math Lab</h1><div class="toolbar"><label for="mode">Practice mode</label><select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(mathGame.modes).map(([id, title]) => `<option value="${id}">${title}</option>`).join("")}<optgroup label="Java numeric reasoning">${Object.entries(EXPANSION_MODES).map(([id, title]) => `<option value="${id}">${esc(title)}</option>`).join("")}</optgroup></select><span id="difficulty-group" class="difficulty-group" hidden><label for="difficulty">Difficulty</label><select id="difficulty">${DIFFICULTIES.map((d, i) => `<option value="${d}"${i === 0 ? " selected" : ""}>${DIFFICULTY_TITLES[d]}</option>`).join("")}</select></span></div><section id="stage" class="panel"></section><p id="stats" class="stats"></p>`;
  addSessionNavigation("../");
  function active() { return !closed && tracker.status(instance) === "active"; }
  function stats() { $("stats").textContent = roundSummary("math-lab"); }
  function next() {
    if (instance) tracker.skip(instance);
    const mode = $("mode").value, expansion = isExpansion(mode);
    $("difficulty-group").hidden = !expansion;
    q = expansion ? expansionDeck.next(mode, $("difficulty").value) : deck.next(mode);
    const title = expansion ? q.modeTitle : mathGame.modes[q.mode];
    instance = tracker.begin("math-lab", "Math Lab", q.mode, title);
    if (expansion) tracker.annotate(instance, { difficulty: q.difficulty, reasoningFamily: q.family, skill: q.skill, seed: q.seed });
    selected = null; closed = false;
    $("stage").innerHTML = `<div class="eyebrow">${esc(title)}${expansion ? " · " + esc(DIFFICULTY_TITLES[q.difficulty]) : ""}</div><h2 id="question">${esc(q.prompt)}</h2>${q.code ? `<pre id="math-code" class="snippet"><code>${esc(q.code)}</code></pre>` : ""}<div id="choices" role="group" aria-label="Answer choices">${q.choices.map((c, i) => `<button type="button" class="secondary choice${c.includes("\n") ? " multiline" : ""}" data-choice="${i}" aria-pressed="false"><code>${esc(c)}</code></button>`).join("")}</div><div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button></div><p id="feedback" class="feedback" role="status" tabindex="-1" hidden></p>`;
    for (const b of $("choices").querySelectorAll("button")) b.onclick = () => {
      if (!active()) return;
      selected = Number(b.dataset.choice);
      for (const c of $("choices").querySelectorAll("button")) {
        c.classList.toggle("selected", c === b);
        c.setAttribute("aria-pressed", String(c === b));
      }
      $("check").disabled = false;
    };
    $("check").onclick = () => {
      if (!active() || selected === null) return;
      const correct = q.kind === "expansion" ? assessExpansion(q, q.choices[selected]) : assess(q, q.choices[selected]);
      if (!tracker.submit(instance, correct).accepted) return;
      // The existing tracker closes wrong rounds as revealed once the answer
      // is shown, preserving its schema and excluding any subsequent retry.
      if (!correct) tracker.reveal(instance);
      closed = true;
      for (const b of $("choices").querySelectorAll("button")) {
        b.disabled = true;
        b.classList.toggle("answer", q.choices[Number(b.dataset.choice)] === q.answer);
        if (Number(b.dataset.choice) === selected && !correct) b.classList.add("wrong");
      }
      $("check").disabled = true;
      $("feedback").hidden = false;
      $("feedback").className = "feedback " + (correct ? "good" : "bad");
      const why = !correct && q.choiceDetails ? q.choiceDetails[selected].why : null;
      $("feedback").textContent = `${correct ? "Correct" : "Incorrect"} — correct answer: ${q.answer}\n${q.explanation}${why ? `\nYour choice matches a common mistake: ${why}.` : ""}`;
      $("feedback").focus(); stats();
    };
    $("next").onclick = next;
    stats();
  }
  $("mode").onchange = next;
  $("difficulty").onchange = next;
  window.addEventListener("pagehide", () => { if (instance) tracker.skip(instance); });
  // A page restored from the back/forward cache cannot retain an expired round.
  window.addEventListener("pageshow", event => { if (event.persisted) next(); });
  next();
}
startMathLab();
