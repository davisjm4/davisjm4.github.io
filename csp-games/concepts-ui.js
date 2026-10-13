import {
  sessionTracker,
  roundSummary,
} from "./session.js?v=platform-expansion-v2";
import { createConceptSession } from "./concepts-feedback.js?v=platform-expansion-v2";
import {
  generateConcept,
  categoryLabels,
  components,
  answerText,
  source,
} from "./concepts-expanded.js?v=platform-expansion-v2";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function startCodeConcepts() {
  const $ = (id) => document.getElementById(id);
  let question,
    chosenTerm,
    selected = new Set(),
    revealed = false,
    session = createConceptSession({ tracker: sessionTracker() });
  $("controls").innerHTML =
    `<label>Practice mode <select id="concept-mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      categoryLabels,
    )
      .map(([v, label]) => `<option value="${v}">${escape(label)}</option>`)
      .join("")}</select></label>`;
  $("new").textContent = "Next Challenge";
  const stats = () => ($("stats").textContent = roundSummary("code-concepts"));
  function renderNode(n) {
    if (typeof n === "string") return escape(n);
    if (n.id === "snippet") return n.children.map(renderNode).join("");
    if (question.interaction === "term")
      return `<span class="${question.highlightIds.includes(n.id) ? "concept-highlight" : ""}">${n.text !== undefined ? escape(n.text) : n.children.map(renderNode).join("")}</span>`;
    return `<span class="concept-component" data-component="${n.id}" role="button" tabindex="0" aria-pressed="false" aria-label="Select ${escape(source(n))}">${n.text !== undefined ? escape(n.text) : n.children.map(renderNode).join("")}</span>`;
  }
  function paint() {
    for (let element of $("concept-code").querySelectorAll(
      "[data-component]",
    )) {
      let id = element.dataset.component;
      element.classList.toggle("chosen", selected.has(id));
      element.classList.toggle(
        "answer",
        revealed && question.answerIds.includes(id),
      );
      element.setAttribute("aria-pressed", selected.has(id));
    }
    let nodes = components(question.root);
    $("selection-summary").textContent = selected.size
      ? "Your selection: " +
        nodes
          .filter((n) => selected.has(n.id))
          .map((n) => n.text)
          .join(" · ")
      : "No code selected.";
    let node = nodes.find((n) => selected.has(n.id));
    $("expand").disabled =
      question.multiple ||
      selected.size !== 1 ||
      !node?.parent ||
      node.parent === "snippet";
  }
  function choose(id) {
    if (session.round.status !== "active") return;
    revealed = false;
    $("feedback").hidden = true;
    if (question.multiple) {
      selected.has(id) ? selected.delete(id) : selected.add(id);
    } else selected = new Set([id]);
    paint();
  }
  function next() {
    question = generateConcept($("concept-mode").value);
    selected.clear();
    chosenTerm = null;
    revealed = false;
    session.begin(question);
    $("feedback").hidden = true;
    let numeric = question.interaction === "count",
      term = question.interaction === "term";
    $("stage").innerHTML =
      `<div class="eyebrow">${categoryLabels[question.category]}</div><h2 id="concept-prompt">${escape(question.prompt)}</h2><p class="muted">${term ? "Tap a terminology label for the highlighted region." : numeric ? "Enter a count. No full execution trace is needed." : question.multiple ? "Tap each requested component, then check. Tap again to deselect." : "Tap a code component. Use Expand selection to include its surrounding expression, statement, or block."}</p><pre id="concept-code" class="concept-code" aria-label="AP CSP pseudocode">${numeric ? escape(question.code) : renderNode(question.root)}</pre>${term ? `<div id="term-bank" class="row">${question.choices.map((choice, i) => `<button class="secondary" data-term="${i}" aria-pressed="false">${escape(choice)}</button>`).join("")}</div>` : numeric ? `<label>Loop count <input id="concept-count" type="number" min="0" step="1" inputmode="numeric"></label>${question.allowUnknown ? '<label class="concept-unknown"><input id="concept-unknown" type="checkbox"> Cannot be determined from the information provided</label>' : ""}` : `<div class="row"><button id="expand" class="secondary" disabled>Expand selection</button><button id="clear-selection" class="secondary">Clear selection</button></div><pre id="selection-summary" class="concept-summary">No code selected.</pre>`}<div class="actions"><button id="concept-check">Check</button><button id="concept-show" class="secondary">Show Answer</button><button id="concept-next" class="secondary">Next Challenge</button></div>`;
    if (term) {
      for (const el of $("term-bank").querySelectorAll("[data-term]"))
        el.onclick = () => {
          if (session.round.status !== "active") return;
          chosenTerm = question.choices[Number(el.dataset.term)];
          for (const b of $("term-bank").querySelectorAll("button")) {
            b.classList.toggle("selected", b === el);
            b.setAttribute("aria-pressed", b === el);
          }
          $("feedback").hidden = true;
        };
    } else if (!numeric) {
      for (let el of $("concept-code").querySelectorAll("[data-component]")) {
        el.onclick = (e) => {
          e.stopPropagation();
          choose(el.dataset.component);
        };
        el.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            choose(el.dataset.component);
          }
        };
      }
      $("expand").onclick = () => {
        let nodes = components(question.root),
          n = nodes.find((n) => selected.has(n.id));
        if (n?.parent && n.parent !== "snippet") choose(n.parent);
      };
      $("clear-selection").onclick = () => {
        if (session.round.status !== "active") return;
        selected.clear();
        revealed = false;
        $("feedback").hidden = true;
        paint();
      };
    } else {
      if ($("concept-unknown"))
        $("concept-unknown").onchange = () => {
          if (session.round.status !== "active") return;
          $("concept-count").disabled = $("concept-unknown").checked;
          $("feedback").hidden = true;
        };
      $("concept-count").oninput = () => {
        if (session.round.status !== "active") return;
        $("feedback").hidden = true;
      };
    }
    $("concept-next").onclick = next;
    $("concept-check").onclick = submit;
    $("concept-show").onclick = showAnswer;
    stats();
  }
  function submit() {
    if (session.round.status !== "active") return;
    let numeric = question.interaction === "count",
      term = question.interaction === "term",
      response = term
        ? chosenTerm
        : numeric
          ? $("concept-unknown")?.checked
            ? "unknown"
            : $("concept-count").value.trim() === ""
              ? null
              : Number($("concept-count").value)
          : [...selected];
    if (
      term
        ? !chosenTerm
        : numeric
          ? response === null ||
            (response !== "unknown" &&
              (!Number.isInteger(response) || response < 0))
          : selected.size === 0
    ) {
      $("feedback").hidden = false;
      $("feedback").className = "feedback";
      $("feedback").textContent = numeric
        ? "Enter a whole-number count or choose the available cannot-determine option."
        : "Select a code component before checking.";
      return;
    }
    const result = session.submit(response);
    if (!result.scored) {
      message(
        false,
        "This challenge is no longer active. Choose Next Challenge to continue.",
      );
      return;
    }
    if (!result.correct) {
      revealed = false;
      if (!numeric && !term) paint();
      message(
        false,
        "Not quite. Hint " +
          Math.min(3, session.round.wrong) +
          ": " +
          result.hint +
          "\nAdjust your response and try again, or choose Show Answer.",
      );
      return;
    }
    finishRound(
      false,
      result.firstTry
        ? "Correct on the first try."
        : "Correct independently after retry.",
    );
  }
  function message(good, text) {
    $("feedback").hidden = false;
    $("feedback").className = "feedback " + (good ? "good" : "bad");
    $("feedback").textContent = text;
    $("feedback").focus();
    stats();
  }
  function finishRound(shown, intro) {
    revealed = true;
    const numeric = question.interaction === "count";
    if (numeric) {
      $("concept-count").value =
        question.answer === "unknown" ? "" : question.answer;
      $("concept-count").classList.add("concept-answer-value");
      if ($("concept-unknown")) {
        $("concept-unknown").checked = question.answer === "unknown";
        $("concept-unknown").classList.add("concept-answer-value");
      }
      $("concept-count").disabled = true;
      if ($("concept-unknown")) $("concept-unknown").disabled = true;
    } else if (question.interaction === "term") {
      for (const el of $("term-bank").querySelectorAll("button")) {
        el.disabled = true;
        el.classList.toggle(
          "concept-answer-value",
          el.textContent === question.answer,
        );
      }
    } else {
      paint();
      $("expand").disabled = true;
      $("clear-selection").disabled = true;
      for (const element of $("concept-code").querySelectorAll(
        "[data-component]",
      )) {
        element.setAttribute("aria-disabled", "true");
        element.tabIndex = -1;
      }
    }
    $("concept-check").disabled = true;
    $("concept-show").disabled = true;
    const answer =
      numeric || question.interaction === "term"
        ? "Answer: " + answerText(question)
        : answerText(question).includes("\n")
          ? "The correct code region is highlighted above."
          : "Highlighted answer: " + answerText(question);
    message(
      !shown,
      intro +
        "\n" +
        question.explanation +
        "\n" +
        answer +
        (shown
          ? "\nThis challenge is revealed and cannot earn independent credit. Choose Next Challenge to continue."
          : ""),
    );
    if (shown) $("feedback").className = "feedback";
  }
  function showAnswer() {
    if (!session.reveal()) return;
    finishRound(true, "Answer revealed — not independently solved.");
  }
  for (const type of ["click", "change", "input"])
    $("stage").addEventListener(type, () => session.touch());
  $("concept-mode").addEventListener("change", next);
  $("new").onclick = next;
  next();
  window.addEventListener("pagehide", () => session.skip());
}
