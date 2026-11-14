import { classLaunchId, classPracticeAccess } from '../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';
import { classQuestion, questionAccessMessage } from '../../cs-games/student/class-question.mjs';
import { mathGame, createDeck, assess } from "./engine.js?v=math-v1";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=guest-map-v1";
import { EXPANSION_MODES, DIFFICULTIES, DIFFICULTY_TITLES, createExpansionDeck, assessExpansion } from "./expansion/generator.js?v=math-exp-v1";
import { createMixedDeck, mathEvidence } from "./mixed.js?v=math-mixed-v1";

export function startMathLab(access = null) {
  const protectedQuestion = classQuestion(access, "math-lab");
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const tracker = sessionTracker(), deck = createDeck(), expansionDeck = createExpansionDeck(), mixedDeck = createMixedDeck({ deck, expansionDeck });
  const isExpansion = mode => Object.prototype.hasOwnProperty.call(EXPANSION_MODES, mode);
  let q, instance, selected = null, closed = true, opening = false;
  $("main").innerHTML = `<div class="eyebrow">Java · Numbers & expressions</div><h1>Math Lab</h1><div class="toolbar"><label for="mode">Practice mode</label><select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(mathGame.modes).map(([id, title]) => `<option value="${id}">${title}</option>`).join("")}<optgroup label="Java numeric reasoning">${Object.entries(EXPANSION_MODES).map(([id, title]) => `<option value="${id}">${esc(title)}</option>`).join("")}</optgroup></select><span id="difficulty-group" class="difficulty-group" hidden><label id="difficulty-label" for="difficulty">Difficulty</label><select id="difficulty">${DIFFICULTIES.map((d, i) => `<option value="${d}"${i === 0 ? " selected" : ""}>${DIFFICULTY_TITLES[d]}</option>`).join("")}</select></span></div><p id="difficulty-note" class="difficulty-note" hidden>Difficulty applies only to the Math Methods and Numeric Limits questions in Mixed Practice; the other question types have no difficulty levels.</p><p id="open-status" role="status"></p><section id="stage" class="panel"></section><p id="stats" class="stats"></p>`;
  addSessionNavigation("../");
  function active() { return !closed && tracker.status(instance) === "active"; }
  function stats() { $("stats").textContent = roundSummary("math-lab", $("mode").value); }
  async function next({ resume = false } = {}) {
    if (opening) return;
    const mode = protectedQuestion?.mode ?? $("mode").value;
    const mixed = mode === "mixed";
    if (protectedQuestion) {
      $("mode").value = mode;
      if (active()) {
        $("open-status").textContent = "Finish this question before opening another.";
        return;
      }
    }
    let saved = resume ? protectedQuestion?.read() : null;
    const draft = saved?.question ?? (mixed ? mixedDeck.next($("difficulty").value) :
      isExpansion(mode) ? expansionDeck.next(mode, $("difficulty").value) : deck.next(mode));
    if (protectedQuestion) {
      opening = true;
      try {
        if (!saved) {
          const { kind, mode, modeTitle, difficulty, family, shape, skill, seed, prompt, code, choices, answer,
            choiceDetails, explanation } = draft;
          saved = { ...await protectedQuestion.open(), question: {
            kind, mode, modeTitle, difficulty, family, shape, skill, seed, prompt, code, choices, answer,
            choiceDetails: choiceDetails?.map(({ why }) => ({ why })), explanation,
          } };
        }
        $("open-status").textContent = "";
      } catch (error) {
        $("open-status").textContent = questionAccessMessage(error);
        return;
      } finally { opening = false; }
    } else if (instance) tracker.skip(instance);
    // Mixed Practice rotates every mode; the difficulty control applies to the expansion-mode questions it draws. The question's own
    // mode (q.mode) decides the title, the scored mode and the recorded difficulty, so credit follows the question actually shown.
    $("difficulty-group").hidden = !(mixed || isExpansion(mode));
    $("difficulty-note").hidden = !mixed;
    $("difficulty-label").textContent = mixed ? "Methods & limits difficulty" : "Difficulty";
    q = draft;
    const expansion = isExpansion(q.mode);
    const title = expansion ? q.modeTitle : mathGame.modes[q.mode];
    instance = saved?.instance;
    if (!instance || tracker.status(instance) !== "active") instance = tracker.begin("math-lab", "Math Lab", q.mode, title, q.mode, title);
    const metadata = mathEvidence(q);
    const evidence = saved ? { ...metadata, practiceSetting:mode, classQuestionId:saved.questionId } : metadata;
    if (evidence) tracker.annotate(instance, evidence);
    selected = saved?.selected ?? null;
    closed = false;
    if (saved) protectedQuestion.save({ ...saved, instance });
    $("stage").innerHTML = `<div class="eyebrow">${esc(title)}${expansion ? " · " + esc(DIFFICULTY_TITLES[q.difficulty]) : ""}</div><h2 id="question">${esc(q.prompt)}</h2>${q.code ? `<pre id="math-code" class="snippet"><code>${esc(q.code)}</code></pre>` : ""}<div id="choices" role="group" aria-label="Answer choices">${q.choices.map((c, i) => `<button type="button" class="secondary choice${c.includes("\n") ? " multiline" : ""}" data-choice="${i}" aria-pressed="false"><code>${esc(c)}</code></button>`).join("")}</div><div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button></div><p id="feedback" class="feedback" role="status" tabindex="-1" hidden></p>`;
    const choices = [...$("choices").querySelectorAll("button")];
    for (const b of choices) b.onclick = () => {
      if (!active()) return;
      selected = Number(b.dataset.choice);
      if (saved) protectedQuestion.save({ ...saved, instance, selected });
      for (const c of $("choices").querySelectorAll("button")) {
        c.classList.toggle("selected", c === b);
        c.setAttribute("aria-pressed", String(c === b));
      }
      $("check").disabled = false;
    };
    if (selected !== null) choices[selected]?.click();
    $("check").onclick = () => {
      if (!active() || selected === null) return;
      const correct = q.kind === "expansion" ? assessExpansion(q, q.choices[selected]) : assess(q, q.choices[selected]);
      if (!tracker.submit(instance, correct).accepted) return;
      // The existing tracker closes wrong rounds as revealed once the answer
      // is shown, preserving its schema and excluding any subsequent retry.
      if (!correct) tracker.reveal(instance);
      closed = true;
      protectedQuestion?.save(null);
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
  const requestedMode = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('mode');
  if (requestedMode && [...$("mode").options].some(option => option.value === requestedMode)) $("mode").value = requestedMode;
  if (protectedQuestion) {
    $("mode").value = protectedQuestion.mode;
    $("mode").disabled = true;
    $("difficulty").disabled = true;
  }
  $("mode").onchange = next;
  $("difficulty").onchange = next;
  window.addEventListener("pagehide", () => { if (!protectedQuestion && instance) tracker.skip(instance); });
  // A page restored from the back/forward cache cannot retain an expired round.
  window.addEventListener("pageshow", event => { if (event.persisted && !protectedQuestion) void next(); });
  void next({ resume: true });
}
if (classLaunchId) void classPracticeAccess.then(access => { if (access) startMathLab(access); });
else startMathLab();
