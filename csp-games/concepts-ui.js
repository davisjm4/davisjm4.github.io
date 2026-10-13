import {
  generateConcept,
  categoryLabels,
  components,
  assess,
  answerText,
  source,
} from "./concepts-engine.js";
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
    selected = new Set(),
    revealed = false,
    attempted = 0,
    correct = 0,
    streak = 0,
    counted = false,
    firstTry = true;
  $("controls").innerHTML =
    `<label>Practice mode <select id="concept-mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      categoryLabels,
    )
      .map(([v, label]) => `<option value="${v}">${escape(label)}</option>`)
      .join("")}</select></label>`;
  $("new").textContent = "Next Challenge";
  const stats = () =>
    ($("stats").textContent =
      `Challenges attempted: ${attempted} · First-check correct: ${correct} · First-check streak: ${streak}`);
  function renderNode(n) {
    if (typeof n === "string") return escape(n);
    if (n.id === "snippet") return n.children.map(renderNode).join("");
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
    revealed = false;
    counted = false;
    firstTry = true;
    $("feedback").hidden = true;
    let numeric = question.interaction === "count";
    $("stage").innerHTML =
      `<div class="eyebrow">${categoryLabels[question.category]}</div><h2 id="concept-prompt">${escape(question.prompt)}</h2><p class="muted">${numeric ? "Enter a count. No full execution trace is needed." : question.multiple ? "Tap each requested component, then check. Tap again to deselect." : "Tap a code component. Use Expand selection to include its surrounding expression, statement, or block."}</p><pre id="concept-code" class="concept-code" aria-label="AP CSP pseudocode">${numeric ? escape(question.code) : renderNode(question.root)}</pre>${numeric ? `<label>Loop count <input id="concept-count" type="number" min="0" step="1" inputmode="numeric"></label>${question.allowUnknown ? '<label class="concept-unknown"><input id="concept-unknown" type="checkbox"> Cannot be determined from the information provided</label>' : ""}` : `<div class="row"><button id="expand" class="secondary" disabled>Expand selection</button><button id="clear-selection" class="secondary">Clear selection</button></div><pre id="selection-summary" class="concept-summary">No code selected.</pre>`}<div class="actions"><button id="concept-check">Check</button><button id="concept-next" class="secondary">Next Challenge</button></div>`;
    if (!numeric) {
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
        selected.clear();
        revealed = false;
        $("feedback").hidden = true;
        paint();
      };
    } else {
      if ($("concept-unknown"))
        $("concept-unknown").onchange = () => {
          $("concept-count").disabled = $("concept-unknown").checked;
          $("feedback").hidden = true;
        };
      $("concept-count").oninput = () => {
        $("feedback").hidden = true;
      };
    }
    $("concept-next").onclick = next;
    $("concept-check").onclick = submit;
    stats();
  }
  function submit() {
    let numeric = question.interaction === "count",
      response = numeric
        ? $("concept-unknown")?.checked
          ? "unknown"
          : $("concept-count").value.trim() === ""
            ? null
            : Number($("concept-count").value)
        : [...selected];
    if (
      numeric
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
    let ok = assess(question, response);
    if (!counted) {
      attempted++;
      counted = true;
      if (ok) {
        correct++;
        streak++;
      } else {
        streak = 0;
        firstTry = false;
      }
    }
    revealed = true;
    if (!numeric) paint();
    let intro = ok
      ? firstTry
        ? "Correct."
        : "Correct on retry."
      : "Not quite.";
    const selectedNodes = components(question.root).filter((n) =>
        selected.has(n.id),
      ),
      confusion =
        !ok &&
        question.variant === "statement" &&
        question.category === "selection" &&
        selectedNodes.some((n) =>
          ["boolean-expression", "comparison"].includes(n.role),
        )
          ? "Your selection is a Boolean expression, which evaluates to TRUE or FALSE. The complete IF structure is the selection statement. "
          : !ok &&
              question.category === "procedures" &&
              question.variant.startsWith("parameter") &&
              selectedNodes.some((n) => n.role === "argument")
            ? "Those are arguments supplied by the call; parameters are input names in the definition. "
            : "";
    $("feedback").hidden = false;
    $("feedback").className = "feedback " + (ok ? "good" : "bad");
    $("feedback").textContent =
      `${ok ? "✓" : "↻"} ${intro}\n${confusion || question.explanation}\n${numeric ? "Correct answer: " + answerText(question) : answerText(question).includes("\n") ? "The correct code region is highlighted above." : "Highlighted answer: " + answerText(question)}${!ok ? "\nAdjust your response to retry, or continue to the next challenge." : ""}`;
    $("feedback").focus();
    stats();
  }
  $("concept-mode").addEventListener("change", next);
  $("new").onclick = next;
  next();
}
