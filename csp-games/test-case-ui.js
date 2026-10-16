import {
  createTestDeck,
  testModes,
  evaluateTestCase,
} from "./test-case-engine.js?v=fast-tcb-v2";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=platform-expansion-v2";
export function startTestCase() {
  const $ = (id) => document.getElementById(id),
    esc = (value) =>
      String(value).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      ),
    tracker = sessionTracker(),
    deck = createTestDeck();
  let q,
    id,
    selected = null,
    closed = false;
  $("main").innerHTML =
    `<h1>Test Case Builder</h1><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      testModes,
    )
      .map(([v, t]) => `<option value="${v}">${t}</option>`)
      .join(
        "",
      )}</select></label></div><section id="stage" class="panel"></section><p id="stats" class="muted"></p>`;
  addSessionNavigation("../");
  const stats = () =>
      ($("stats").textContent = roundSummary("test-case-builder")),
    active = () => !closed && tracker.status(id) === "active";
  function finish(correct, details, revealed = false) {
    closed = true;
    for (const b of $("choices").querySelectorAll("button")) {
      b.disabled = true;
      b.classList.toggle("answer", b.dataset.choice === q.correctId);
      if (b.dataset.choice === selected && !correct) b.classList.add("wrong");
    }
    $("check").disabled = true;
    $("show").disabled = true;
    $("feedback").hidden = false;
    $("feedback").className = "feedback " + (correct ? "good" : "bad");
    $("feedback").textContent =
      (revealed ? "Answer revealed" : correct ? "Correct" : "Incorrect") +
      ` — correct answer: ${q.options.find((o) => o.id === q.correctId).label}\n` +
      details;
    $("feedback").focus();
    stats();
  }
  function next() {
    if (id) tracker.skip(id);
    q = deck.next($("mode").value);
    id = tracker.begin(q.game, q.title, q.topic, q.topicTitle);
    selected = null;
    closed = false;
    $("stage").innerHTML =
      `<div class="eyebrow">${esc(testModes[q.mode])}</div><h2>${esc(q.prompt)}</h2>${q.requirement ? `<p class="requirement">${esc(q.requirement)}</p>` : ""}${q.docs ? `<p class="documentation">${esc(q.docs)}</p>` : ""}${q.inputText ? `<p class="test-input"><code>${esc(q.inputText)}</code></p>` : ""}<pre id="code" class="snippet">${esc(q.code)}</pre><div id="choices" role="group" aria-label="Answer choices">${q.options.map((o) => `<button type="button" class="secondary choice" data-choice="${o.id}" aria-pressed="false">${esc(o.label)}</button>`).join("")}</div><div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button><button id="show" class="secondary reveal">Show Answer</button></div><p id="feedback" class="feedback" role="status" tabindex="-1" hidden></p>`;
    for (const b of $("choices").querySelectorAll("button"))
      b.onclick = () => {
        if (!active()) return;
        selected = b.dataset.choice;
        for (const c of $("choices").querySelectorAll("button")) {
          c.setAttribute("aria-pressed", String(c === b));
          c.classList.toggle("selected", c === b);
        }
        $("check").disabled = false;
      };
    $("check").onclick = () => {
      if (!active() || !selected) return;
      const result = evaluateTestCase(q, { choice: selected }),
        event = tracker.submit(id, result.correct);
      if (!event.accepted) return;
      if (!result.correct) tracker.reveal(id);
      finish(result.correct, result.details);
    };
    $("show").onclick = () => {
      if (!active() || !tracker.reveal(id)) return;
      finish(false, q.explanation, true);
    };
    $("next").onclick = next;
    stats();
  }
  $("mode").onchange = next;
  window.addEventListener("pagehide", () => {
    if (id) tracker.skip(id);
  });
  next();
}
startTestCase();
