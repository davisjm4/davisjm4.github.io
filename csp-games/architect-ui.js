import {
  architectModes,
  generateArchitect,
  evaluateArchitect,
  evaluateMissing,
} from "./architect-engine.js?v=focused-aa-v1";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=per-mode-daily-v1";
export function startArchitect() {
  const $ = (id) => document.getElementById(id),
    esc = (v) =>
      String(v).replace(
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
    tracker = sessionTracker();
  let q,
    id,
    order = [],
    selectedChoice = null,
    closed = false,
    attempts = 0;
  $("main").innerHTML =
    `<div class="eyebrow">Big Idea 3 · Construct algorithms</div><h1>Algorithm Architect</h1><p class="intro">Make one focused algorithm decision. Most challenges ask you to choose a missing component; arrange blocks when their order is the concept.</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      architectModes,
    )
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join(
        "",
      )}</select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><section id="feedback" class="feedback" role="status" tabindex="-1" hidden></section><p id="stats"></p>`;
  addSessionNavigation("../");
  const stats = () =>
      ($("stats").textContent = roundSummary("algorithm-architect", $("mode").value)),
    active = () => !closed && tracker.status(id) === "active";
  function message(good, text) {
    $("feedback").hidden = false;
    $("feedback").className = "feedback " + (good ? "good" : "bad");
    $("feedback").textContent = text;
    $("feedback").focus();
    stats();
  }
  function paint() {
    $("bank").innerHTML = q.bank
      .filter((b) => !order.includes(b.id))
      .map(
        (b) =>
          `<button type="button" class="secondary block" data-add="${b.id}"><pre>${esc(b.text)}</pre></button>`,
      )
      .join("");
    let depth = 0;
    $("construction").innerHTML = order
      .map((id, i) => {
        const b = q.bank.find((b) => b.id === id);
        if (b.node.type === "end") depth = Math.max(0, depth - 1);
        const level = depth;
        if (["if", "for", "repeat", "until", "else"].includes(b.node.type))
          depth++;
        return `<li><pre style="padding-left:${Math.min(level, 5)}rem">${esc(b.text)}</pre><div class="row"><button class="secondary" data-up="${i}" aria-label="Move block ${i + 1} up" ${i === 0 ? "disabled" : ""}>↑</button><button class="secondary" data-down="${i}" aria-label="Move block ${i + 1} down" ${i === order.length - 1 ? "disabled" : ""}>↓</button><button class="secondary" data-remove="${i}">Remove</button></div></li>`;
      })
      .join("");
    for (const b of $("bank").querySelectorAll("button"))
      b.onclick = () => {
        if (active()) {
          order.push(b.dataset.add);
          paint();
          $("feedback").hidden = true;
        }
      };
    for (const b of $("construction").querySelectorAll("button"))
      b.onclick = () => {
        if (!active()) return;
        const i = Number(b.dataset.up ?? b.dataset.down ?? b.dataset.remove);
        if (b.hasAttribute("data-remove")) order.splice(i, 1);
        else {
          const j = i + (b.hasAttribute("data-up") ? -1 : 1);
          [order[i], order[j]] = [order[j], order[i]];
        }
        paint();
        $("feedback").hidden = true;
      };
    if (closed)
      for (const b of $("stage").querySelectorAll("button")) b.disabled = true;
  }
  function finish() {
    closed = true;
    for (const b of $("stage").querySelectorAll("button")) b.disabled = true;
    $("next").disabled = false;
  }
  function next() {
    if (id) tracker.skip(id);
    q = generateArchitect($("mode").value);
    id = tracker.begin(q.game, q.title, q.topic, q.topicTitle, q.mode, q.modeName || q.topicTitle);
    order = [];
    selectedChoice = null;
    closed = false;
    attempts = 0;
    $("feedback").hidden = true;
    if (q.format === "missing") {
      $("stage").innerHTML = `<p class="eyebrow">Choose the missing component · ${esc(q.topicTitle)}</p><h2>${esc(q.goal)}</h2><pre class="snippet missing-snippet">${esc(q.missingText)}</pre><fieldset class="choice-set"><legend>Choose one replacement</legend><div class="choice-grid">${q.options.map((option) => `<button type="button" class="secondary choice" data-choice="${option.id}" aria-pressed="false"><code>${esc(option.text)}</code></button>`).join("")}</div></fieldset><div class="actions"><button id="check" disabled>Check Answer</button><button id="next" class="secondary">Next Challenge</button></div>`;
      for (const button of $("stage").querySelectorAll("[data-choice]")) button.onclick = () => {
        if (!active()) return;
        selectedChoice = button.dataset.choice;
        for (const option of $("stage").querySelectorAll("[data-choice]")) {
          option.setAttribute("aria-pressed", String(option === button));
          option.classList.toggle("selected", option === button);
        }
        $("check").disabled = false;
      };
      $("check").onclick = () => {
        if (!active() || !selectedChoice) return;
        const result = evaluateMissing(q, selectedChoice), event = tracker.submit(id, result.correct);
        if (!event.accepted) return;
        finish();
        message(result.correct, result.details);
      };
      $("next").onclick = next;
      stats();
      return;
    }
    const marker = q.context.indexOf("\n\n");
    $("stage").innerHTML =
      `<p class="eyebrow">Arrange the algorithm · ${esc(q.topicTitle)}</p><h2>${esc(q.goal)}</h2><p class="context-doc">${esc(q.context.slice(q.context.indexOf("\n") + 1, marker))}</p><pre class="snippet">${esc(q.context.slice(marker + 2))}</pre><p>Arrange the short statements where their order or nesting changes the result. Add, move, or remove blocks, then test and revise.</p><h3>Available components</h3><div id="bank" class="block-bank"></div><h3>Your procedure body</h3><ol id="construction" class="construction"></ol><div class="actions"><button id="check">Check Answer</button><button id="show" class="secondary">Show Answer</button><button id="next" class="secondary">Next Challenge</button></div>`;
    paint();
    $("check").onclick = () => {
      if (!active()) return;
      if (!order.length) {
        message(
          false,
          "Add code components before checking. No submission counted.",
        );
        return;
      }
      const result = evaluateArchitect(q, order),
        event = tracker.submit(id, result.correct);
      if (!event.accepted) return;
      attempts++;
      if (result.correct) {
        finish();
        message(
          true,
          (attempts === 1
            ? "Correct independently on the first submission."
            : "Correct independently after revision; first-try accuracy is unchanged.") +
            "\n" +
            result.details,
        );
      } else
        message(
          false,
          result.details +
            "\nRevise and retest. Your first independent submission has been recorded.",
        );
    };
    $("show").onclick = () => {
      if (!active() || !tracker.reveal(id)) return;
      order = [...q.solution];
      paint();
      finish();
      message(
        false,
        "Model construction revealed — not independently solved.\n" +
          evaluateArchitect(q, order).details,
      );
    };
    $("next").onclick = next;
    stats();
  }
  $("mode").onchange = next;
  $("new").onclick = next;
  window.addEventListener("pagehide", () => {
    if (id) tracker.skip(id);
  });
  next();
}
startArchitect();
